// Pure snapshot diff: detects changed/deleted/append records from a snapshot pair.
//
// D-03: changed-record detection lives in the persistence layer, not in simulation.
// This function is pure — no IndexedDB, no Dexie, no simulation runtime imports.
// The repository executes the returned write plan inside a single Dexie transaction.
//
// JSON-compare is safe here because Phase 1's deterministic-replay guarantee
// (Phase 1 D-08) means the same command produces byte-identical records, so
// `JSON.stringify(a) === JSON.stringify(b)` is exact for both diff and the
// repository's idempotent-upsert conflict check (D-04).

import type {
  CellId,
  CellRecord,
  ClientRecord,
  CoreRecord,
  FlowgridSnapshot,
  ForgeHistoryRecord,
  ModuleInstanceId,
  ModuleInstance,
  RouteId,
  RouteRecord,
  SessionRecord,
  SettingsRecord,
  SyncOperation,
} from '../domain/index.js';

export interface FlowgridWritePlan {
  readonly cellPuts: readonly CellRecord[];
  readonly moduleInstancePuts: readonly ModuleInstance[];
  readonly routePuts: readonly RouteRecord[];
  readonly cellDeletes: readonly CellId[];
  readonly moduleInstanceDeletes: readonly ModuleInstanceId[];
  readonly routeDeletes: readonly RouteId[];
  readonly clientPut: ClientRecord | null;
  readonly corePut: CoreRecord | null;
  readonly settingsPut: SettingsRecord | null;
  readonly appendSessions: readonly SessionRecord[];
  readonly appendOperations: readonly SyncOperation[];
  readonly appendForgeHistory: readonly ForgeHistoryRecord[];
}

const EMPTY_PLAN: FlowgridWritePlan = {
  cellPuts: [],
  moduleInstancePuts: [],
  routePuts: [],
  cellDeletes: [],
  moduleInstanceDeletes: [],
  routeDeletes: [],
  clientPut: null,
  corePut: null,
  settingsPut: null,
  appendSessions: [],
  appendOperations: [],
  appendForgeHistory: [],
};

function diffMap<K, V>(
  previous: ReadonlyMap<K, V>,
  next: ReadonlyMap<K, V>,
): { readonly puts: readonly V[]; readonly deletes: readonly K[] } {
  const puts: V[] = [];
  const deletes: K[] = [];
  for (const [key, nextValue] of next) {
    const prevValue = previous.get(key);
    if (prevValue === undefined || JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
      puts.push(nextValue);
    }
  }
  for (const key of previous.keys()) {
    if (!next.has(key)) {
      deletes.push(key);
    }
  }
  return { puts, deletes };
}

function diffSingleton<T>(previous: T, next: T): T | null {
  return JSON.stringify(previous) !== JSON.stringify(next) ? next : null;
}

function diffAppend<T>(previous: readonly T[], next: readonly T[], idOf: (record: T) => string): readonly T[] {
  const previousIds = new Set(previous.map(idOf));
  return next.filter((record) => !previousIds.has(idOf(record)));
}

export function diffFlowgridSnapshots(
  previous: FlowgridSnapshot,
  next: FlowgridSnapshot,
): FlowgridWritePlan {
  const cells = diffMap(previous.cells, next.cells);
  const moduleInstances = diffMap(previous.moduleInstances, next.moduleInstances);
  const routes = diffMap(previous.routes, next.routes);

  const appendSessions = diffAppend(previous.sessions, next.sessions, (s) => s.id);
  const appendOperations = diffAppend(previous.operations, next.operations, (o) => o.id);
  const appendForgeHistory = diffAppend(previous.forgeHistory, next.forgeHistory, (f) => f.id);

  const clientPut = diffSingleton(previous.client, next.client);
  const corePut = diffSingleton(previous.core, next.core);
  const settingsPut = diffSingleton(previous.settings, next.settings);

  const isEmpty =
    cells.puts.length === 0 &&
    cells.deletes.length === 0 &&
    moduleInstances.puts.length === 0 &&
    moduleInstances.deletes.length === 0 &&
    routes.puts.length === 0 &&
    routes.deletes.length === 0 &&
    appendSessions.length === 0 &&
    appendOperations.length === 0 &&
    appendForgeHistory.length === 0 &&
    clientPut === null &&
    corePut === null &&
    settingsPut === null;

  if (isEmpty) return EMPTY_PLAN;

  return {
    cellPuts: cells.puts,
    moduleInstancePuts: moduleInstances.puts,
    routePuts: routes.puts,
    cellDeletes: cells.deletes,
    moduleInstanceDeletes: moduleInstances.deletes,
    routeDeletes: routes.deletes,
    clientPut,
    corePut,
    settingsPut,
    appendSessions,
    appendOperations,
    appendForgeHistory,
  };
}
