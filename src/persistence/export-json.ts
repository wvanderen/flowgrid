// JSON full-state archive export (D-09).
//
// Produces a complete, serializable envelope of every durable record plus the full
// operation log and session history. Maps flatten to readonly arrays (JSON has no
// Map). The operation log is NOT stripped or redacted on export — it travels with
// the archive so a future import (plan 02-03) rebuilds identical state including the
// audit/sync trail and the operation queue. No simulation involvement; Zod is the
// import-only boundary (delivered in 02-03), never reached here.
//
// `archiveVersion` is a FOURTH version axis, distinct from the other three:
//   1. Dexie schema version (database.ts): store-shape changes only.
//   2. ContentVersion (ClientRecord.contentVersion): starter content shape.
//   3. SyncOperation.payloadVersion: operation payload shape (future sync transform).
//   4. archiveVersion (this module): archive envelope shape. Future importers detect
//      and transform old envelope formats via this literal.
// These four are NEVER unified under a single app schema version (D-08).
//
// Persistence MAY call ambient time for export timestamps (the layer rule forbids
// ambient time in simulation, not persistence — same one-place exception as
// seeding.ts). All other timestamps in the archive come from stored records.

import type {
  CellRecord,
  ClientRecord,
  CoreId,
  CoreRecord,
  ForgeHistoryRecord,
  IsoDateTimeString,
  ModuleInstance,
  RouteRecord,
  SessionRecord,
  SettingsRecord,
  SyncOperation,
} from '../domain/index.js';

import { FlowgridDatabase } from './database.js';

export const ARCHIVE_VERSION = 1;

export interface JsonArchive {
  readonly archiveVersion: 1;
  readonly exportedAt: IsoDateTimeString;
  readonly client: ClientRecord;
  readonly cells: readonly CellRecord[];
  readonly core: CoreRecord;
  readonly moduleInstances: readonly ModuleInstance[];
  readonly routes: readonly RouteRecord[];
  readonly sessions: readonly SessionRecord[];
  readonly operations: readonly SyncOperation[];
  readonly settings: SettingsRecord;
  readonly forgeHistory: readonly ForgeHistoryRecord[];
}

export async function exportJson(db: FlowgridDatabase): Promise<JsonArchive> {
  const [client, cells, core, moduleInstances, routes, sessions, operations, settings, forgeHistory] =
    await Promise.all([
      db.client.toArray(),
      db.cells.toArray(),
      db.table<CoreRecord, CoreId>('core').toArray(),
      db.moduleInstances.toArray(),
      db.routes.toArray(),
      db.sessions.toArray(),
      db.operations.toArray(),
      db.settings.toArray(),
      db.forgeHistory.toArray(),
    ]);

  const clientRecord = client[0];
  const coreRecord = core[0];
  const settingsRecord = settings[0];

  if (clientRecord === undefined || coreRecord === undefined || settingsRecord === undefined) {
    throw new Error(
      'exportJson: singleton store missing its seeded record (expected client/core/settings).',
    );
  }

  return {
    archiveVersion: ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    client: clientRecord,
    cells,
    core: coreRecord,
    moduleInstances,
    routes,
    sessions,
    operations,
    settings: settingsRecord,
    forgeHistory,
  };
}
