// FlowgridRepository — the persistence write/read boundary.
//
// Consumes Phase 1 SimulationResult outputs (type-only import; never imports
// simulation runtime) and reloads durable state into a FlowgridSnapshot. Mirrors
// the consume-and-branch shape of simulation/engine.ts but branches on result
// status instead of command type.
//
// Write path: applyResult diffs previousState vs nextState (diff.ts) and writes the
// plan + appends inside a SINGLE Dexie transaction spanning all nine stores (DATA-03).
// Sessions, operations, and forgeHistory use idempotent upsert (D-04): same id +
// identical payload = silent no-op; same id + different payload = typed conflict
// that aborts the transaction. Rejected/not_implemented results write nothing (D-02).
//
// Read path: loadSnapshot bulk-reads all stores into a FlowgridSnapshot (Maps for
// cells/moduleInstances/routes, arrays for the append-only stores). The three
// singletons are seeded on first run, so their absence after a load is corrupt
// state and is surfaced as a PersistenceError.
//
// Append-only integrity: there is NO updateSession/deleteSession/deleteOperation
// method. The only path that clears append-only stores is replace-mode restore
// (plan 02-03).

import type {
  CellId,
  CellRecord,
  CoreId,
  CoreRecord,
  FlowgridSnapshot,
  ModuleInstance,
  ModuleInstanceId,
  RouteRecord,
  RouteId,
  SimulationResult,
} from '../domain/index.js';

import { FlowgridDatabase } from './database.js';
import { diffFlowgridSnapshots } from './diff.js';
import { conflictError, mapDomException, type PersistenceError } from './errors.js';

export type ApplyResult = { readonly ok: true } | { readonly ok: false; readonly error: PersistenceError };

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
] as const;

// Sentinel thrown inside a transaction to abort it on a D-04 payload-mismatch
// conflict. Caught by applyResult and converted into ApplyResult { ok: false }.
// Throwing (not returning) is what rolls the transaction back atomically.
class ConflictSignal extends Error {
  constructor(readonly conflictError: PersistenceError) {
    super(conflictError.message);
    this.name = 'ConflictSignal';
  }
}

async function idempotentAppend<T extends { readonly id: string }>(
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

export class FlowgridRepository {
  constructor(private readonly db: FlowgridDatabase) {}

  async open(): Promise<void> {
    await this.db.open();
  }

  async close(): Promise<void> {
    this.db.close();
  }

  async applyResult(result: SimulationResult): Promise<ApplyResult> {
    if (result.status !== 'applied') {
      return { ok: true };
    }

    const plan = diffFlowgridSnapshots(result.previousState, result.nextState);

    try {
      await this.db.transaction('rw', ALL_STORE_NAMES, async () => {
        for (const cell of plan.cellPuts) await this.db.cells.put(cell);
        for (const moduleInstance of plan.moduleInstancePuts) await this.db.moduleInstances.put(moduleInstance);
        for (const route of plan.routePuts) await this.db.routes.put(route);
        for (const cellId of plan.cellDeletes) await this.db.cells.delete(cellId);
        for (const moduleInstanceId of plan.moduleInstanceDeletes) await this.db.moduleInstances.delete(moduleInstanceId);
        for (const routeId of plan.routeDeletes) await this.db.routes.delete(routeId);

        if (plan.clientPut !== null) await this.db.client.put(plan.clientPut);
        if (plan.corePut !== null) await this.db.table<CoreRecord, CoreId>('core').put(plan.corePut);
        if (plan.settingsPut !== null) await this.db.settings.put(plan.settingsPut);

        for (const session of plan.appendSessions) {
          await idempotentAppend(this.db.sessions, session, 'session_conflict', 'Session');
        }
        for (const operation of plan.appendOperations) {
          await idempotentAppend(this.db.operations, operation, 'operation_conflict', 'Operation');
        }
        // forgeHistory has no dedicated conflict kind in the 8-member union; reuse
        // write_failure for payload-mismatch (documented, consistent with the union).
        for (const forge of plan.appendForgeHistory) {
          await idempotentAppend(this.db.forgeHistory, forge, 'write_failure', 'ForgeHistory');
        }
      });
      return { ok: true };
    } catch (e) {
      if (e instanceof ConflictSignal) {
        return { ok: false, error: e.conflictError };
      }
      return { ok: false, error: mapDomException(e) };
    }
  }

  async loadSnapshot(): Promise<FlowgridSnapshot> {
    const clientRecords = await this.db.client.toArray();
    const coreRecords = await this.db.table<CoreRecord, CoreId>('core').toArray();
    const settingsRecords = await this.db.settings.toArray();

    const client = clientRecords[0];
    const core = coreRecords[0];
    const settings = settingsRecords[0];

    if (client === undefined || core === undefined || settings === undefined) {
      throw new Error(
        'FlowgridRepository.loadSnapshot: singleton store missing its seeded record (expected client/core/settings).',
      );
    }

    const cellsArray = await this.db.cells.toArray();
    const moduleInstancesArray = await this.db.moduleInstances.toArray();
    const routesArray = await this.db.routes.toArray();
    const sessions = await this.db.sessions.toArray();
    const operations = await this.db.operations.toArray();
    const forgeHistory = await this.db.forgeHistory.toArray();

    const cells = new Map<CellId, CellRecord>(cellsArray.map((c) => [c.id, c] as const));
    const moduleInstances = new Map<ModuleInstanceId, ModuleInstance>(
      moduleInstancesArray.map((m) => [m.id, m] as const),
    );
    const routes = new Map<RouteId, RouteRecord>(routesArray.map((r) => [r.id, r] as const));

    return {
      client,
      cells,
      core,
      moduleInstances,
      routes,
      sessions,
      operations,
      settings,
      forgeHistory,
    };
  }
}
