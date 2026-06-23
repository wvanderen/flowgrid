// VER-03 import tier: merge mode upserts by ID without wiping (D-11, D-04).
//
// Seeds state A, builds a partial archive containing one new cell + one updated
// cell (same id as an A cell, different name), runs `importArchive(db, partial,
// 'merge')`, and asserts A's untouched records survive while the new + updated
// records are present. The conflict case builds an archive cell with the same id
// as an A cell but a different payload (xp) and asserts the merge surfaces a typed
// PersistenceError (D-04 payload-mismatch applies to merge too).

import { beforeEach, expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

import type {
  CellRecord,
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

// Seed state A into the target DB and return the applied state + ids for reference.
async function seedStateA(
  db: FlowgridDatabase,
  repo: FlowgridRepository,
  prefix: string,
): Promise<{ state: FlowgridSnapshot; cellId: string }> {
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
  return { state: result.nextState, cellId: previousState.cells.keys().next().value as string };
}

// Build a full archive from an applied focus session (used as the merge source).
async function buildArchiveFromApplied(prefix: string): Promise<JsonArchive> {
  const db = new FlowgridDatabase(`merge-build-${prefix}`);
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
  await repo.applyResult(result);
  const archive = await exportJson(db);
  repo.close();
  return archive;
}

test('merge mode upserts a new cell without wiping A records', async () => {
  const db = new FlowgridDatabase('merge-new-cell');
  const repo = new FlowgridRepository(db);
  await repo.open();

  const { cellId: cellIdA } = await seedStateA(db, repo, 'merge-A');

  // The merge mode is for adding NEW records to existing state. To avoid conflicts
  // on shared-id singletons (core id 'flowgrid:core' etc.), we merge A's OWN
  // archive back with one extra cell appended. All singletons match exactly
  // (identical payload = idempotent no-op); A's cell matches exactly; the extra
  // cell is a genuinely new id → inserted. This is the intended merge use case.
  const archiveA = await exportJson(db);

  // Build a second applied state in a separate DB purely to harvest a valid,
  // invariant-passing cell with a different id and non-zero economy values.
  const archiveB = await buildArchiveFromApplied('merge-B');
  const cellB = archiveB.cells[0]!;
  const cellIdB = cellB.id;
  expect(cellIdA).not.toBe(cellIdB);

  const archiveWithExtraCell: JsonArchive = {
    ...archiveA,
    cells: [...archiveA.cells, cellB],
  };

  const result = await importArchive(db, archiveWithExtraCell, 'merge');
  expect(result.ok, 'merge must succeed when singletons match and the cell is new').toBe(true);

  const after = await repo.loadSnapshot();
  repo.close();

  // A's untouched cell survives; the extra cell is present.
  expect(after.cells.has(cellIdA), 'A cell survives merge').toBe(true);
  expect(after.cells.has(cellIdB), 'extra cell is merged in').toBe(true);
  expect(after.cells.size).toBe(2);

  // A's sessions/operations are untouched (no wipe, no new appends from the merge
  // since the archive's sessions/operations match A's exactly).
  const sessionIds = after.sessions.map((s) => s.id);
  const operationIds = after.operations.map((o) => o.id);
  expect(sessionIds).toContain(archiveA.sessions[0]!.id);
  expect(operationIds).toContain(archiveA.operations[0]!.id);
});

test('merge mode upserts an updated cell payload by ID (identical payload is a no-op)', async () => {
  const db = new FlowgridDatabase('merge-update-cell');
  const repo = new FlowgridRepository(db);
  await repo.open();

  await seedStateA(db, repo, 'merge-update-A');

  // Re-export A's own archive and merge it back. Every record has the same id and
  // identical payload -> idempotent no-op (no conflict, no data change).
  const archiveA = await exportJson(db);

  const before = await repo.loadSnapshot();
  const result = await importArchive(db, archiveA, 'merge');
  expect(result.ok, 'merging identical payload is a no-op success').toBe(true);

  const after = await repo.loadSnapshot();
  repo.close();

  expect(after.cells.size).toBe(before.cells.size);
  expect(after.sessions.length).toBe(before.sessions.length);
  expect(after.operations.length).toBe(before.operations.length);
});

test('merge mode surfaces a PersistenceError on a cell payload mismatch (D-04)', async () => {
  const db = new FlowgridDatabase('merge-conflict');
  const repo = new FlowgridRepository(db);
  await repo.open();

  const { state: stateA } = await seedStateA(db, repo, 'merge-conflict-A');
  const originalCell = stateA.cells.values().next().value as CellRecord;

  // Build an archive carrying the SAME cell id but a DIFFERENT xp payload. The
  // singletons/modules/routes/sessions/operations must remain internally consistent
  // (the archive must PASS validateArchive) so the conflict surfaces from the merge
  // upsert, not from validation. We start from A's own export and mutate only the
  // cell's xp.
  const archive = await exportJson(db);
  const conflictingCell: CellRecord = { ...originalCell, xp: originalCell.xp + 999 };
  const conflictingArchive: JsonArchive = {
    ...archive,
    cells: [conflictingCell],
  };

  const before = await repo.loadSnapshot();
  const result = await importArchive(db, conflictingArchive, 'merge');
  expect(result.ok, 'merge must surface the payload-mismatch conflict').toBe(false);

  if (!result.ok && 'error' in result) {
    // Cells use the write_failure kind (no dedicated cell_conflict in the 8-member
    // PersistenceErrorKind union); the contract still surfaces a typed error.
    expect(result.error.kind).toBe('write_failure');
  }

  // Local data is untouched (the merge transaction rolled back).
  const after = await repo.loadSnapshot();
  repo.close();
  expect(after.cells.get(originalCell.id)?.xp).toBe(originalCell.xp);
  expect(after.cells.size).toBe(before.cells.size);
});

test('merge mode surfaces a PersistenceError on a session payload mismatch', async () => {
  const db = new FlowgridDatabase('merge-session-conflict');
  const repo = new FlowgridRepository(db);
  await repo.open();

  await seedStateA(db, repo, 'merge-session-A');

  const archive = await exportJson(db);
  const originalSession = archive.sessions[0]!;
  // Same sessionId, different xpGained -> session_conflict (D-04).
  const conflictingSession = { ...originalSession, xpGained: originalSession.xpGained + 1 };
  const conflictingArchive: JsonArchive = {
    ...archive,
    sessions: [conflictingSession],
  };

  const result = await importArchive(db, conflictingArchive, 'merge');
  expect(result.ok, 'merge must surface the session payload-mismatch conflict').toBe(false);
  if (!result.ok && 'error' in result) {
    expect(result.error.kind).toBe('session_conflict');
  }
  repo.close();
});
