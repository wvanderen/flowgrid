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
//   1. Dexie schema version (below): store-shape changes only. Currently v1.
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
