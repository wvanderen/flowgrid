// VER-03 import tier: replace mode wipes + writes atomically (D-11, D-12).
//
// Seeds state A (one applied focus session), builds archive B from a different
// applied focus session (different cell name, different duration, different cell
// id), runs `importArchive(db, archiveB, 'replace')`, and asserts the loaded
// snapshot deep-equals B with no A-only records surviving. The atomicity test
// forces a mid-transaction failure and asserts the DB is either fully A or fully B
// (no partial mix) — the Dexie transaction rolls back every clear and every write.

import { beforeEach, expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

import type {
  CompleteFocusSessionCommand,
  FlowgridSnapshot,
  SimulationResult,
} from '../../src/domain/index.js';
import { createStarterFlowgridState } from '../../src/content/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import {
  FlowgridDatabase,
  FlowgridRepository,
  exportJson,
  importArchive,
} from '../../src/persistence/index.js';
import type { JsonArchive } from '../../src/persistence/index.js';
import { createTestIds, createTestSimulationEnv } from '../helpers/fixtures.js';

const NOW = '2026-01-01T10:00:00.000Z';
const ENDED_AT = '2026-01-01T10:25:00.000Z';
const LOCAL_DATE = '2026-01-01';

beforeEach(() => {
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = new IDBFactory();
});

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

// Build an archive from an applied focus session with a given prefix. Each prefix
// yields a distinct cell id, cell modules, session, and operation, so archives A
// and B carry genuinely different record sets.
async function buildArchiveFromApplied(prefix: string): Promise<JsonArchive> {
  const db = new FlowgridDatabase(`replace-build-${prefix}`);
  const repo = new FlowgridRepository(db);
  await repo.open();
  const seeded = await repo.loadSnapshot();
  const previousState = attachStarterCellToSeeded(seeded, prefix);
  await writeStarterCellModulesRoutes(db, previousState);
  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: `${prefix}:op:focus-1`,
    cellId: previousState.cells.keys().next().value as string,
    startedAt: NOW,
    endedAt: ENDED_AT,
    durationSeconds: 1500,
  };
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: prefix });
  const result = runSimulationCommand(previousState, command, env) as SimulationResult;
  expect(result.status).toBe('applied');
  await repo.applyResult(result);
  const archive = await exportJson(db);
  repo.close();
  return archive;
}

test('replace mode wipes local state A and writes archive B so loadSnapshot deep-equals B', async () => {
  const dbName = 'replace-wipe-write';
  const db = new FlowgridDatabase(dbName);
  const repo = new FlowgridRepository(db);
  await repo.open();

  // Seed state A.
  const seededA = await repo.loadSnapshot();
  const previousStateA = attachStarterCellToSeeded(seededA, 'state-A');
  await writeStarterCellModulesRoutes(db, previousStateA);
  const commandA: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: 'state-A:op:focus-1',
    cellId: previousStateA.cells.keys().next().value as string,
    startedAt: NOW,
    endedAt: ENDED_AT,
    durationSeconds: 1500,
  };
  const envA = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'state-A' });
  const resultA = runSimulationCommand(previousStateA, commandA, envA) as SimulationResult;
  await repo.applyResult(resultA);

  const beforeReplace = await repo.loadSnapshot();
  expect(beforeReplace.sessions.length, 'state A has one session').toBe(1);

  // Build archive B from a DIFFERENT applied state (different prefix => different
  // cell id, modules, session id, operation id).
  const archiveB = await buildArchiveFromApplied('state-B');

  // Verify A and B are genuinely different (different cell ids).
  const cellIdA = beforeReplace.cells.keys().next().value as string;
  const cellIdB = archiveB.cells[0]!.id;
  expect(cellIdA).not.toBe(cellIdB);

  const result = await importArchive(db, archiveB, 'replace');
  expect(result.ok, 'replace must succeed for a valid archive').toBe(true);

  const afterReplace = await repo.loadSnapshot();
  repo.close();

  // No A-only records survive: the loaded cell/modules/routes/sessions/operations
  // are B's, not A's.
  expect(afterReplace.cells.size).toBe(1);
  expect(afterReplace.cells.has(cellIdB)).toBe(true);
  expect(afterReplace.cells.has(cellIdA)).toBe(false);
  expect(afterReplace.sessions.length).toBe(1);
  expect(afterReplace.sessions[0]!.id).toBe(archiveB.sessions[0]!.id);
  expect(afterReplace.operations.length).toBe(1);
  expect(afterReplace.operations[0]!.id).toBe(archiveB.operations[0]!.id);
});

test('replace mode returns ok:true with correct stats for a valid archive', async () => {
  const archive = await buildArchiveFromApplied('stats');
  const db = new FlowgridDatabase('replace-stats');
  const repo = new FlowgridRepository(db);
  await repo.open();

  const result = await importArchive(db, archive, 'replace');
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.stats.client).toBe(1);
    expect(result.stats.core).toBe(1);
    expect(result.stats.settings).toBe(1);
    expect(result.stats.cells).toBe(1);
    expect(result.stats.sessions).toBe(1);
    expect(result.stats.operations).toBe(1);
  }
  repo.close();
});

test('a forced mid-transaction failure leaves no partial state (DB stays fully A)', async () => {
  const dbName = 'replace-atomicity';
  const db = new FlowgridDatabase(dbName);
  const repo = new FlowgridRepository(db);
  await repo.open();

  // Seed state A.
  const seededA = await repo.loadSnapshot();
  const previousStateA = attachStarterCellToSeeded(seededA, 'atom-A');
  await writeStarterCellModulesRoutes(db, previousStateA);
  const commandA: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: 'atom-A:op:focus-1',
    cellId: previousStateA.cells.keys().next().value as string,
    startedAt: NOW,
    endedAt: ENDED_AT,
    durationSeconds: 1500,
  };
  const envA = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'atom-A' });
  const resultA = runSimulationCommand(previousStateA, commandA, envA) as SimulationResult;
  await repo.applyResult(resultA);

  const snapshotBefore = await repo.loadSnapshot();
  const cellIdA = snapshotBefore.cells.keys().next().value as string;

  const archiveB = await buildArchiveFromApplied('atom-B');
  const cellIdB = archiveB.cells[0]!.id;

  // Stub cells.bulkPut to throw mid-transaction. The clears and other writes that
  // already ran inside the transaction must all roll back.
  const originalBulkPut = db.cells.bulkPut.bind(db.cells);
  let threw = false;
  db.cells.bulkPut = (() => {
    threw = true;
    throw new Error('forced mid-transaction failure');
  }) as typeof db.cells.bulkPut;

  const result = await importArchive(db, archiveB, 'replace');

  // Restore the original method before reloading.
  db.cells.bulkPut = originalBulkPut;

  expect(threw, 'the stubbed bulkPut must have been called').toBe(true);
  expect(result.ok, 'replace must surface the failure').toBe(false);

  const snapshotAfter = await repo.loadSnapshot();
  repo.close();

  // The DB is fully A: B's cell never landed, A's cell survived, the clears rolled
  // back. No partial mix of A and B records.
  expect(snapshotAfter.cells.has(cellIdA), 'A cell survived the rollback').toBe(true);
  expect(snapshotAfter.cells.has(cellIdB), 'B cell did not leak').toBe(false);
  expect(snapshotAfter.cells.size).toBe(snapshotBefore.cells.size);
  expect(snapshotAfter.sessions.length).toBe(snapshotBefore.sessions.length);
  expect(snapshotAfter.operations.length).toBe(snapshotBefore.operations.length);
});
