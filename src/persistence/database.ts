// Flowgrid Dexie database — the persistence root and sole Dexie gateway.
//
// Declares the v1 schema with nine normalized object stores (one per durable
// entity type, D-05). ModuleDefinitions are NOT persisted (D-06: definitions stay
// as versioned code content), so no `moduleDefinitions` store exists. First-run
// seeding happens in `on('populate')` (RESEARCH §1.6) and writes only the three
// singletons. `on('blocked')` constructs a PersistenceError via the typed contract;
// Phase 3 UI subscribes and renders it.
//
// Four independent version axes (D-08) — each bumps for a different reason:
//   1. Dexie schema version (below): store-shape changes only. Currently v3.
//   2. ContentVersion (ClientRecord.contentVersion): starter content shape.
//   3. SyncOperation.payloadVersion: operation payload shape (future sync transform).
//   4. archiveVersion (JsonArchive, Phase 2 plan 02-02): archive envelope shape.
// These are NEVER unified under a single app schema version.

import Dexie, { type Table } from 'dexie';

import type {
  CellId,
  CellRecord,
  ClientId,
  ClientRecord,
  ForgeHistoryId,
  ForgeHistoryRecord,
  ModuleInstanceId,
  ModuleInstance,
  RejuvenationId,
  RejuvenationRecord,
  RouteId,
  RouteRecord,
  SessionId,
  SessionRecord,
  SettingsId,
  SettingsRecord,
  SyncOperation,
  OperationId,
} from '../domain/index.js';

import { type PersistenceError } from './errors.js';
import { seedStarterState } from './seeding.js';

// D-10: default values the v1→v2 migration writes for existing CellRecords that
// predate the identity/UI fields. Exported for the migration test harness so the
// upgrade transform can be exercised in isolation (PATTERNS C8).
export const CELL_V2_DEFAULTS = {
  color: '#6b7280',
  icon: null,
  archivedAt: null,
  activeSessionStartedAt: null,
} as const;

// D-10: the extracted v1→v2 cell upgrade transform. Pure: mutates the record in
// place (Dexie's `collection.modify` contract) and returns it. Exported so the
// migration-harness can run it against a fixture without a live IndexedDB.
export function upgradeCellsV1ToV2(
  cell: Record<string, unknown>,
): Record<string, unknown> {
  if (cell.color === undefined) cell.color = CELL_V2_DEFAULTS.color;
  if (cell.icon === undefined) cell.icon = CELL_V2_DEFAULTS.icon;
  if (cell.archivedAt === undefined) cell.archivedAt = CELL_V2_DEFAULTS.archivedAt;
  if (cell.activeSessionStartedAt === undefined) {
    cell.activeSessionStartedAt = CELL_V2_DEFAULTS.activeSessionStartedAt;
  }
  return cell;
}

// Phase 4 / CORE-06 + REJ-01: defaults the v2→v3 migration writes for existing
// CoreRecords that predate activationBoostLevel / activeRejuvenationStartedAt.
// Exported for the migration test harness so the upgrade transform can be exercised
// in isolation (PATTERNS C8). Level 0 = no Activation bonus (byte-identical to
// Phase 3 economy output — Pitfall 6 backward-compat); null marker = no active
// rejuvenation session.
export const CORE_V3_DEFAULTS = {
  activationBoostLevel: 0,
  activeRejuvenationStartedAt: null,
} as const;

// Phase 4: the extracted v2→v3 core upgrade transform. Pure: mutates the record in
// place (Dexie's `collection.modify` contract) and returns it. Exported so the
// migration-harness can run it against a fixture without a live IndexedDB. Only
// fills fields that are absent — a CoreRecord that already carries the fields
// (e.g. re-seeded after a partial upgrade) is left untouched.
export function upgradeCoresV2ToV3(
  core: Record<string, unknown>,
): Record<string, unknown> {
  if (core.activationBoostLevel === undefined) {
    core.activationBoostLevel = CORE_V3_DEFAULTS.activationBoostLevel;
  }
  if (core.activeRejuvenationStartedAt === undefined) {
    core.activeRejuvenationStartedAt = CORE_V3_DEFAULTS.activeRejuvenationStartedAt;
  }
  return core;
}

export class FlowgridDatabase extends Dexie {
  client!: Table<ClientRecord, ClientId>;
  cells!: Table<CellRecord, CellId>;
  // `core` is intentionally NOT declared as a class property: it collides with
  // Dexie's built-in `core: DBCore` member (incompatible override) and shadowing
  // it could break Dexie's middleware at runtime. The store is still named `core`
  // in the schema below; typed access goes through `db.table<CoreRecord, CoreId>('core')`.
  moduleInstances!: Table<ModuleInstance, ModuleInstanceId>;
  routes!: Table<RouteRecord, RouteId>;
  sessions!: Table<SessionRecord, SessionId>;
  operations!: Table<SyncOperation, OperationId>;
  settings!: Table<SettingsRecord, SettingsId>;
  forgeHistory!: Table<ForgeHistoryRecord, ForgeHistoryId>;
  // Phase 4 / REJ-01: append-only rejuvenation history store. No collision with a
  // Dexie built-in (unlike `core`), so it is declared as a typed Table property.
  rejuvenations!: Table<RejuvenationRecord, RejuvenationId>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      client: 'id',
      cells: 'id',
      core: 'id',
      moduleInstances: 'id, ownerCellId',
      routes: 'id, sourceCellId',
      sessions: 'id, cellId, startedAt',
      operations: 'id, status, createdAt',
      settings: 'id',
      forgeHistory: 'id, createdAt',
    });

    // D-10: v2 adds four non-indexed fields to CellRecord (color, icon, archivedAt,
    // activeSessionStartedAt). Indexes are unchanged — only the stored cell shape
    // changes. The upgrade defaults existing v1 cells via upgradeCellsV1ToV2.
    // Stores are repeated verbatim from v1 (Dexie requires the full store set when
    // version(N).stores() replaces the prior declaration context).
    this.version(2).stores({
      client: 'id',
      cells: 'id',
      core: 'id',
      moduleInstances: 'id, ownerCellId',
      routes: 'id, sourceCellId',
      sessions: 'id, cellId, startedAt',
      operations: 'id, status, createdAt',
      settings: 'id',
      forgeHistory: 'id, createdAt',
    }).upgrade(async (tx) => {
      await tx.table('cells').toCollection().modify(upgradeCellsV1ToV2);
    });

    // Phase 4 (REJ-01 / CORE-06): v3 adds the append-only `rejuvenations` store and
    // two non-indexed CoreRecord fields (activationBoostLevel,
    // activeRejuvenationStartedAt). Indexes on prior stores are unchanged — only
    // the stored core shape changes plus the new store. The upgrade defaults
    // existing v2 cores via upgradeCoresV2ToV3 (level 0 / null marker → byte-
    // identical Phase 3 economy output, Pitfall 6). Stores are repeated verbatim
    // from v2 (Dexie requires the full store set when version(N).stores() replaces
    // the prior declaration context); rejuvenations is indexed by createdAt for
    // recency queries (mirrors sessions/forgeHistory).
    this.version(3).stores({
      client: 'id',
      cells: 'id',
      core: 'id',
      moduleInstances: 'id, ownerCellId',
      routes: 'id, sourceCellId',
      sessions: 'id, cellId, startedAt',
      operations: 'id, status, createdAt',
      settings: 'id',
      forgeHistory: 'id, createdAt',
      rejuvenations: 'id, createdAt',
    }).upgrade(async (tx) => {
      await tx.table('core').toCollection().modify(upgradeCoresV2ToV3);
    });

    // First-run seed: writes the three singletons inside the populate transaction.
    // Synchronous, constants only (RESEARCH §1.6). The `tx` parameter is required;
    // using the db instance here would auto-commit the upgrade transaction.
    this.on('populate', (tx) => {
      seedStarterState(tx);
    });

    // Blocked upgrade (DATA-07): another tab holds an open connection. The upgrade
    // has not failed — it resumes when the blocker releases the database. Build the
    // typed PersistenceError; Phase 3 UI subscribes to surface "close other tabs".
    // No throw: this is an event handler. The contract is what Phase 2 ships.
    this.on('blocked', () => {
      const _blockedError: PersistenceError = {
        kind: 'blocked_upgrade',
        message: 'IndexedDB upgrade is blocked, likely by another open tab.',
        recoverable: true,
      };
      // Phase 3 will route _blockedError to the UI error channel.
      void _blockedError;
    });
  }
}
