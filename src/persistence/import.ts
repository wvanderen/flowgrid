// Replace/merge archive import execution (D-11, D-12).
//
// `importArchive` validates the ENTIRE archive before touching local data; any
// ValidationIssue returns `{ ok: false, issues }` with no write. Replace mode wipes
// all nine stores then writes the archive in a single Dexie transaction. Merge mode
// upserts each archive record by ID (no wipe), applying the same D-04
// payload-mismatch conflict check as the repository. Errors surface as typed
// PersistenceError via mapDomException (recoverable vs non-recoverable DATA-07).
//
// Header comment cites D-11 (replace default, merge opt-in) and D-12 (all-or-nothing
// validation before any write). The validate-before-write gate is non-negotiable:
// `validateArchive` is called BEFORE `db.transaction`. No `../simulation` import.

import type {
  CoreId,
  CoreRecord,
  RejuvenationRecord,
  ValidationIssue,
} from '../domain/index.js';

import { FlowgridDatabase } from './database.js';
import { validateArchive } from './import-validation.js';
import {
  conflictError,
  mapDomException,
  type PersistenceError,
} from './errors.js';
import type { JsonArchive } from './export-json.js';

export type ImportMode = 'replace' | 'merge';

export interface ImportStats {
  readonly client: number;
  readonly cells: number;
  readonly core: number;
  readonly moduleInstances: number;
  readonly routes: number;
  readonly sessions: number;
  readonly operations: number;
  readonly settings: number;
  readonly forgeHistory: number;
  readonly rejuvenations: number;
}

export type ImportResult =
  | { readonly ok: true; readonly stats: ImportStats }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] }
  | { readonly ok: false; readonly error: PersistenceError };

const ALL_STORE_NAMES = [
  'client',
  'cells',
  'core',
  'moduleInstances',
  'routes',
  'sessions',
  'operations',
  'settings',
  'forgeHistory',
  'rejuvenations',
] as const;

// Sentinel thrown inside a merge transaction to abort it on a D-04 payload-mismatch
// conflict. Caught by importArchive and converted into { ok: false, error }.
// Throwing (not returning) is what rolls the transaction back atomically.
class ConflictSignal extends Error {
  constructor(readonly conflictError: PersistenceError) {
    super(conflictError.message);
    this.name = 'ConflictSignal';
  }
}

async function idempotentMergeUpsert<T extends { readonly id: string }>(
  table: { get(id: string): Promise<T | undefined>; put(record: T): Promise<unknown> },
  record: T,
  kind: 'session_conflict' | 'operation_conflict' | 'write_failure',
  label: string,
): Promise<void> {
  const existing = await table.get(record.id);
  if (existing !== undefined) {
    if (JSON.stringify(existing) === JSON.stringify(record)) return;
    throw new ConflictSignal(
      conflictError(kind, `${label} ${record.id} already exists with a different payload.`, record),
    );
  }
  await table.put(record);
}

function statsFor(archive: JsonArchive, rejuvenations: readonly RejuvenationRecord[]): ImportStats {
  return {
    client: 1,
    cells: archive.cells.length,
    core: 1,
    moduleInstances: archive.moduleInstances.length,
    routes: archive.routes.length,
    sessions: archive.sessions.length,
    operations: archive.operations.length,
    settings: 1,
    forgeHistory: archive.forgeHistory.length,
    rejuvenations: rejuvenations.length,
  };
}

export async function importArchive(
  db: FlowgridDatabase,
  archive: unknown,
  mode: ImportMode = 'replace',
): Promise<ImportResult> {
  // D-12 validate-before-write gate: NO db.transaction call happens before this
  // returns zero issues. Local data stays byte-identical on any failure.
  const issues = validateArchive(archive);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  // The validator has confirmed the archive matches archiveSchema (archiveVersion
  // 1 or 2, every record shape). Cast to JsonArchive for the write path.
  const validated = archive as unknown as JsonArchive;
  // archiveSchema accepts v1 archives that omit the rejuvenations field entirely
  // (optional in the schema); normalize to an empty array so the replace/merge
  // write paths and stats treat v1 as "no rejuvenation history". The double cast
  // mirrors the operations boundary bridge in import-validation.ts — honest about
  // the v1 envelope lacking the field at runtime even though JsonArchive requires
  // it at the type level.
  const rejuvs: readonly RejuvenationRecord[] =
    (validated as unknown as { rejuvenations?: readonly RejuvenationRecord[] }).rejuvenations ?? [];

  try {
    if (mode === 'replace') {
      await db.transaction('rw', ALL_STORE_NAMES, async () => {
        await Promise.all([
          db.client.clear(),
          db.cells.clear(),
          db.table<CoreRecord, CoreId>('core').clear(),
          db.moduleInstances.clear(),
          db.routes.clear(),
          db.sessions.clear(),
          db.operations.clear(),
          db.settings.clear(),
          db.forgeHistory.clear(),
          db.rejuvenations.clear(),
        ]);
        await db.client.put(validated.client);
        await db.cells.bulkPut(validated.cells);
        await db.table<CoreRecord, CoreId>('core').put(validated.core);
        await db.moduleInstances.bulkPut(validated.moduleInstances);
        await db.routes.bulkPut(validated.routes);
        await db.sessions.bulkPut(validated.sessions);
        await db.operations.bulkPut(validated.operations);
        await db.settings.put(validated.settings);
        await db.forgeHistory.bulkPut(validated.forgeHistory);
        await db.rejuvenations.bulkPut(rejuvs);
      });
    } else {
      // merge: upsert every archive record by ID without wiping. D-04
      // payload-mismatch applies per-record: identical existing payload = no-op;
      // different payload = typed conflict that aborts the transaction.
      await db.transaction('rw', ALL_STORE_NAMES, async () => {
        await idempotentMergeUpsert(db.client, validated.client, 'write_failure', 'Client');
        await idempotentMergeUpsert(
          db.table<CoreRecord, CoreId>('core'),
          validated.core,
          'write_failure',
          'Core',
        );
        await idempotentMergeUpsert(db.settings, validated.settings, 'write_failure', 'Settings');
        for (const cell of validated.cells) {
          await idempotentMergeUpsert(db.cells, cell, 'write_failure', 'Cell');
        }
        for (const moduleInstance of validated.moduleInstances) {
          await idempotentMergeUpsert(db.moduleInstances, moduleInstance, 'write_failure', 'ModuleInstance');
        }
        for (const route of validated.routes) {
          await idempotentMergeUpsert(db.routes, route, 'write_failure', 'Route');
        }
        for (const session of validated.sessions) {
          await idempotentMergeUpsert(db.sessions, session, 'session_conflict', 'Session');
        }
        for (const operation of validated.operations) {
          await idempotentMergeUpsert(db.operations, operation, 'operation_conflict', 'Operation');
        }
        for (const forge of validated.forgeHistory) {
          await idempotentMergeUpsert(db.forgeHistory, forge, 'write_failure', 'ForgeHistory');
        }
        for (const rejuv of rejuvs) {
          await idempotentMergeUpsert(db.rejuvenations, rejuv, 'write_failure', 'Rejuvenation');
        }
      });
    }
    return { ok: true, stats: statsFor(validated, rejuvs) };
  } catch (e) {
    if (e instanceof ConflictSignal) {
      return { ok: false, error: e.conflictError };
    }
    return { ok: false, error: mapDomException(e) };
  }
}
