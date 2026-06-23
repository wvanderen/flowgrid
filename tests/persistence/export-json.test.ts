// VER-03 export tier: JSON archive shape completeness (D-09).
//
// Drives a real applied complete_focus_session through applyResult so the
// sessions/operations stores are non-empty, exports via exportJson, and asserts the
// archive envelope (archiveVersion 1, exportedAt ISO) plus deep-equality of every
// collection against the applied result's nextState. The operation log is NOT
// stripped (D-09: operations.length === 1, sessions.length === 1).

import { beforeEach, expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

import type { CompleteFocusSessionCommand, FlowgridSnapshot, SimulationResult } from '../../src/domain/index.js';
import { createStarterFlowgridState } from '../../src/content/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import { FlowgridDatabase, FlowgridRepository, exportJson } from '../../src/persistence/index.js';
import { createTestIds, createTestSimulationEnv } from '../helpers/fixtures.js';

const NOW = '2026-01-01T10:00:00.000Z';
const ENDED_AT = '2026-01-01T10:25:00.000Z';
const LOCAL_DATE = '2026-01-01';

beforeEach(() => {
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = new IDBFactory();
});

// Mirrors repository.test.ts: the DB auto-seeds singletons on first open, so the
// focus-session previousState must attach a starter cell/modules/routes to the
// SEEDED singletons (matching ids) rather than building a parallel state.
function attachStarterCellToSeeded(seeded: FlowgridSnapshot, prefix: string): FlowgridSnapshot {
  const ids = createTestIds(prefix);
  const starter = createStarterFlowgridState({
    now: NOW,
    localDate: LOCAL_DATE,
    clientId: seeded.client.id,
    cellId: ids.cellId,
    coreId: seeded.core.id,
    generatorModuleInstanceId: ids.generatorModuleInstanceId,
    chargeCoreModuleInstanceId: ids.chargeCoreModuleInstanceId,
    outputModuleInstanceId: ids.outputModuleInstanceId,
    bloomModuleInstanceId: ids.bloomModuleInstanceId,
    outputRouteId: ids.outputRouteId,
    settingsId: seeded.settings.id,
    forgeHistoryId: ids.forgeHistoryId,
  });
  return { ...starter, client: seeded.client, core: seeded.core, settings: seeded.settings };
}

async function writeStarterCellModulesRoutes(db: FlowgridDatabase, state: FlowgridSnapshot): Promise<void> {
  for (const cell of state.cells.values()) await db.cells.put(cell);
  for (const moduleInstance of state.moduleInstances.values()) await db.moduleInstances.put(moduleInstance);
  for (const route of state.routes.values()) await db.routes.put(route);
}

// Order-independent comparison helper for map-derived collections: IndexedDB returns
// records by primary-key (lexical) order while Map.values() yields insertion order,
// so both sides are normalized by id before deep-equality.
function sortedById<T extends { readonly id: string }>(arr: readonly T[]): T[] {
  return [...arr].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

test('exportJson emits an archive with archiveVersion 1 and every collection deep-equal to the applied state', async () => {
  const dbName = 'export-json-shape';
  const db = new FlowgridDatabase(dbName);
  const repo = new FlowgridRepository(db);
  await repo.open();

  const seeded = await repo.loadSnapshot();
  const previousState = attachStarterCellToSeeded(seeded, 'export-json');
  await writeStarterCellModulesRoutes(db, previousState);

  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: 'export-json:op:focus-1',
    cellId: previousState.cells.keys().next().value as string,
    startedAt: NOW,
    endedAt: ENDED_AT,
    durationSeconds: 1500,
  };
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'export-json' });
  const result = runSimulationCommand(previousState, command, env) as SimulationResult;
  expect(result.status, 'fixture focus command must apply').toBe('applied');

  const applied = await repo.applyResult(result);
  expect(applied.ok, 'applyResult must succeed').toBe(true);

  const archive = await exportJson(db);
  repo.close();

  // Envelope (D-09, fourth version axis).
  expect(archive.archiveVersion).toBe(1);
  expect(archive.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

  // Every collection deep-equals the applied result's nextState. Maps flatten to
  // arrays in the archive; IndexedDB returns by primary-key order while Map.values()
  // yields insertion order, so the map-derived collections are compared
  // order-independently (sorted by id). Singleton and append-only collections
  // (sessions/operations/forgeHistory) preserve insertion order on both sides.
  expect(archive.client).toEqual(result.nextState.client);
  expect(archive.core).toEqual(result.nextState.core);
  expect(archive.settings).toEqual(result.nextState.settings);
  expect(sortedById(archive.cells)).toEqual(sortedById([...result.nextState.cells.values()]));
  expect(sortedById(archive.moduleInstances)).toEqual(
    sortedById([...result.nextState.moduleInstances.values()]),
  );
  expect(sortedById(archive.routes)).toEqual(sortedById([...result.nextState.routes.values()]));
  expect(archive.sessions).toEqual(result.nextState.sessions);
  expect(archive.operations).toEqual(result.nextState.operations);
  expect(archive.forgeHistory).toEqual(result.nextState.forgeHistory);

  // The operation log is NOT stripped (D-09).
  expect(archive.operations.length).toBe(1);
  expect(archive.sessions.length).toBe(1);
  expect(archive.forgeHistory.length).toBe(0);
});
