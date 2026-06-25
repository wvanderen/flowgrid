// VER-03 P0: repository write path durability.
// Drives a real applied complete_focus_session SimulationResult through applyResult,
// reopens the SAME database name in a fresh repository instance, and asserts the
// reloaded FlowgridSnapshot deep-equals result.nextState. Also asserts rejected and
// not_implemented results write nothing.

import { beforeEach, expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

import type { CompleteFocusSessionCommand, FlowgridSnapshot, LogRejuvenationCommand, SimulationResult } from '../../src/domain/index.js';
import { createStarterFlowgridState } from '../../src/content/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import { FlowgridDatabase, FlowgridRepository } from '../../src/persistence/index.js';
import {
  buildStarterSnapshot,
  createTestIds,
  createTestSimulationEnv,
} from '../helpers/fixtures.js';
import { expectStateReplayEqual } from '../helpers/replay.js';

const NOW = '2026-01-01T10:00:00.000Z';
const LOCAL_DATE = '2026-01-01';

beforeEach(() => {
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = new IDBFactory();
});

// The DB auto-seeds its own singletons on first open (fixed core/settings ids +
// generated client id). To test reload durability with a real focus-session
// result, previousState must be the SEEDED state (so singleton ids match and
// applyResult updates singletons in place rather than creating duplicates). We
// attach a starter cell/modules/routes wired to the seeded core id — mirroring
// what Phase 3 will do when it creates the starter cell on top of the seed.
function attachStarterCellToSeeded(
  seeded: FlowgridSnapshot,
  prefix: string,
  now: string,
  localDate: string,
): FlowgridSnapshot {
  const ids = createTestIds(prefix);
  const starter = createStarterFlowgridState({
    now,
    localDate,
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
  return {
    ...starter,
    client: seeded.client,
    core: seeded.core,
    settings: seeded.settings,
  };
}

async function writeStarterCellModulesRoutes(db: FlowgridDatabase, state: FlowgridSnapshot): Promise<void> {
  for (const cell of state.cells.values()) await db.cells.put(cell);
  for (const moduleInstance of state.moduleInstances.values()) await db.moduleInstances.put(moduleInstance);
  for (const route of state.routes.values()) await db.routes.put(route);
}

function buildAppliedFocusResultFromSeeded(prefix: string, seeded: FlowgridSnapshot): SimulationResult {
  const previousState = attachStarterCellToSeeded(seeded, prefix, NOW, LOCAL_DATE);
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: prefix });
  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: `${prefix}:op:focus-1`,
    cellId: previousState.cells.keys().next().value as string,
    startedAt: NOW,
    endedAt: '2026-01-01T10:25:00.000Z',
    durationSeconds: 1500,
  };
  const result = runSimulationCommand(previousState, command, env);
  if (result.status !== 'applied') {
    throw new Error(`fixture setup: expected applied result, got ${result.status}`);
  }
  return result;
}

test('applyResult on an applied complete_focus_session persists state that reloads identically', async () => {
  const dbName = 'repo-reload';

  const writeDb = new FlowgridDatabase(dbName);
  const writeRepo = new FlowgridRepository(writeDb);
  await writeRepo.open();

  const seeded = await writeRepo.loadSnapshot();
  const result = buildAppliedFocusResultFromSeeded('reload', seeded);
  await writeStarterCellModulesRoutes(writeDb, result.previousState);

  const applied = await writeRepo.applyResult(result);
  expect(applied.ok, 'applyResult on applied result must succeed').toBe(true);
  writeRepo.close();

  // Reopen the SAME database name in a fresh instance to simulate a reload.
  const reloadDb = new FlowgridDatabase(dbName);
  const reloadRepo = new FlowgridRepository(reloadDb);
  await reloadRepo.open();
  const loaded = await reloadRepo.loadSnapshot();
  reloadRepo.close();

  expectStateReplayEqual(loaded, result.nextState);
});

test('applyResult on a rejected result writes nothing', async () => {
  const { ids, state } = buildStarterSnapshot('repo-rejected');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'repo-rejected' });
  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: `${ids.clientId}:op:bad`,
    cellId: ids.cellId,
    startedAt: NOW,
    endedAt: NOW,
    durationSeconds: 0,
  };
  const rejected = runSimulationCommand(state, command, env);
  expect(rejected.status).toBe('rejected');

  const db = new FlowgridDatabase('repo-rejected-db');
  const repo = new FlowgridRepository(db);
  await repo.open();

  const seededSnapshot = await repo.loadSnapshot();
  const seededSessionCount = seededSnapshot.sessions.length;
  const seededOperationCount = seededSnapshot.operations.length;

  const applied = await repo.applyResult(rejected);
  expect(applied.ok).toBe(true);

  const after = await repo.loadSnapshot();
  expect(after.sessions).toHaveLength(seededSessionCount);
  expect(after.operations).toHaveLength(seededOperationCount);
  repo.close();
});

test('applyResult on a not_implemented result writes nothing', async () => {
  const { ids, state } = buildStarterSnapshot('repo-notimpl');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'repo-notimpl' });
  // install_module remains a not_implemented stub (Phase 5 D-08 reserves it for a
  // future variant-swap phase; run_forge became real in Phase 5 Task 2). The
  // assertion is identical: a not_implemented result writes nothing durable.
  const result = runSimulationCommand(
    state,
    {
      type: 'install_module',
      operationId: `${ids.clientId}:op:install`,
      definitionId: 'flowgrid:module-definition:generator',
      ownerCellId: ids.cellId,
      installedSlotId: `${ids.cellId}:slot:generator`,
    },
    env,
  );
  expect(result.status).toBe('not_implemented');

  const db = new FlowgridDatabase('repo-notimpl-db');
  const repo = new FlowgridRepository(db);
  await repo.open();

  const seeded = await repo.loadSnapshot();
  const beforeCounts = {
    sessions: seeded.sessions.length,
    operations: seeded.operations.length,
    cells: seeded.cells.size,
  };

  const applied = await repo.applyResult(result);
  expect(applied.ok).toBe(true);

  const after = await repo.loadSnapshot();
  expect(after.sessions).toHaveLength(beforeCounts.sessions);
  expect(after.operations).toHaveLength(beforeCounts.operations);
  expect(after.cells.size).toBe(beforeCounts.cells);
  repo.close();
});

// --- Phase 4 (plan 04-02): rejuvenation persistence, reload, and idempotency ----
// Builds an applied log_rejuvenation result (coreCharge pre-seeded so the payout
// derivation processes real Charge), drives it through applyResult, and asserts
// the RejuvenationRecord survives reload, replays do not duplicate, and the record
// fields match what the simulation produced.

function buildRejuvenationResult(prefix: string, seeded: FlowgridSnapshot): SimulationResult {
  // Inject coreCharge so log_rejuvenation's payout derivation processes real Charge
  // (a starter core has coreCharge=0, which would yield a 0-payout rest record —
  // still valid, but we want a non-trivial record to assert field round-tripping).
  const previousState: FlowgridSnapshot = {
    ...attachStarterCellToSeeded(seeded, prefix, NOW, LOCAL_DATE),
    core: { ...seeded.core, coreCharge: 100, updatedAt: NOW },
  };
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: prefix });
  const command: LogRejuvenationCommand = {
    type: 'log_rejuvenation',
    operationId: `${prefix}:op:rejuv-1`,
    startedAt: NOW,
    endedAt: '2026-01-01T10:10:00.000Z', // 10 minutes -> processes 100 Charge at 10/min
  };
  const result = runSimulationCommand(previousState, command, env);
  if (result.status !== 'applied') {
    throw new Error(
      `fixture setup: expected applied rejuvenation, got ${result.status}: ${JSON.stringify(result.validationIssues)}`,
    );
  }
  return result;
}

test('applyResult on an applied log_rejuvenation persists the RejuvenationRecord and it survives reload', async () => {
  const dbName = 'repo-rejuv-reload';
  const db = new FlowgridDatabase(dbName);
  const repo = new FlowgridRepository(db);
  await repo.open();

  const seeded = await repo.loadSnapshot();
  const result = buildRejuvenationResult('rejuv-reload', seeded);
  await writeStarterCellModulesRoutes(db, result.previousState);

  const seededBefore = await repo.loadSnapshot();
  expect(seededBefore.rejuvenations).toHaveLength(0);

  const applied = await repo.applyResult(result);
  expect(applied.ok, 'applyResult on applied rejuvenation must succeed').toBe(true);
  repo.close();

  // Reopen the SAME database name to simulate a reload.
  const reloadDb = new FlowgridDatabase(dbName);
  const reloadRepo = new FlowgridRepository(reloadDb);
  await reloadRepo.open();
  const loaded = await reloadRepo.loadSnapshot();
  reloadRepo.close();

  // The record survived reload and is byte-identical to what the simulation produced.
  expect(loaded.rejuvenations).toHaveLength(1);
  expect(loaded.rejuvenations[0]).toEqual(result.nextState.rejuvenations[0]);
  // Spot-check the record's derived fields match the simulation output.
  const record = loaded.rejuvenations[0]!;
  expect(record.chargeConsumed).toBe(result.nextState.rejuvenations[0]!.chargeConsumed);
  expect(record.integrationGained).toBe(result.nextState.rejuvenations[0]!.integrationGained);
  expect(record.tokensGranted).toBe(result.nextState.rejuvenations[0]!.tokensGranted);
  expect(record.durationSeconds).toBe(result.nextState.rejuvenations[0]!.durationSeconds);
});

test('replaying the same log_rejuvenation operationId does not duplicate the record (idempotent append)', async () => {
  const dbName = 'repo-rejuv-idempotent';
  const db = new FlowgridDatabase(dbName);
  const repo = new FlowgridRepository(db);
  await repo.open();

  const seeded = await repo.loadSnapshot();
  const result = buildRejuvenationResult('rejuv-idem', seeded);
  await writeStarterCellModulesRoutes(db, result.previousState);

  const first = await repo.applyResult(result);
  expect(first.ok).toBe(true);

  const afterFirst = await repo.loadSnapshot();
  expect(afterFirst.rejuvenations).toHaveLength(1);

  // Replay the SAME result (same operationId -> same record id). idempotentAppend
  // finds the identical payload and silently no-ops; no duplication, no conflict.
  const second = await repo.applyResult(result);
  expect(second.ok, 'replaying an identical result must be an idempotent no-op').toBe(true);

  const afterSecond = await repo.loadSnapshot();
  expect(afterSecond.rejuvenations).toHaveLength(1);
  expect(afterSecond.rejuvenations[0]).toEqual(afterFirst.rejuvenations[0]);
  repo.close();
});
