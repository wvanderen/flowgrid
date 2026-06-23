// VER-03 P0: append-only session/operation integrity and idempotent upsert (D-04).
//   1. Applying the same applied result twice is a no-op on the second write.
//   2. A session/operation with an existing id but a mutated payload produces a
//      session_conflict / operation_conflict PersistenceError.
//   3. No mutation API (updateSession/deleteSession/deleteOperation) exists on
//      FlowgridRepository.

import { beforeEach, expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

import type { SimulationResult, SyncOperation } from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import { FlowgridDatabase, FlowgridRepository } from '../../src/persistence/index.js';
import {
  buildStarterSnapshot,
  createTestSimulationEnv,
} from '../helpers/fixtures.js';

const NOW = '2026-01-01T10:00:00.000Z';
const LOCAL_DATE = '2026-01-01';

beforeEach(() => {
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = new IDBFactory();
});

function buildAppliedFocusResult(prefix: string): SimulationResult {
  const { ids, state } = buildStarterSnapshot(prefix);
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: prefix });
  const result = runSimulationCommand(
    state,
    {
      type: 'complete_focus_session',
      operationId: `${ids.clientId}:op:focus-1`,
      cellId: ids.cellId,
      startedAt: NOW,
      endedAt: '2026-01-01T10:25:00.000Z',
      durationSeconds: 1500,
    },
    env,
  );
  if (result.status !== 'applied') {
    throw new Error(`fixture setup: expected applied result, got ${result.status}`);
  }
  return result;
}

test('applying the same applied result twice is a no-op on the second write', async () => {
  const result = buildAppliedFocusResult('append-noop');

  const db = new FlowgridDatabase('append-noop-db');
  const repo = new FlowgridRepository(db);
  await repo.open();

  const first = await repo.applyResult(result);
  expect(first.ok).toBe(true);

  const afterFirst = await repo.loadSnapshot();
  const countsAfterFirst = {
    sessions: afterFirst.sessions.length,
    operations: afterFirst.operations.length,
    cells: afterFirst.cells.size,
  };

  const second = await repo.applyResult(result);
  expect(second.ok, 'second apply of identical result is an idempotent no-op').toBe(true);

  const afterSecond = await repo.loadSnapshot();
  expect(afterSecond.sessions).toHaveLength(countsAfterFirst.sessions);
  expect(afterSecond.operations).toHaveLength(countsAfterFirst.operations);
  expect(afterSecond.cells.size).toBe(countsAfterFirst.cells);
  repo.close();
});

test('a session with an existing id but a mutated payload produces session_conflict', async () => {
  const result = buildAppliedFocusResult('append-session-conflict');

  const db = new FlowgridDatabase('append-session-conflict-db');
  const repo = new FlowgridRepository(db);
  await repo.open();

  const first = await repo.applyResult(result);
  expect(first.ok).toBe(true);

  // Build a result whose diff appends a session with the SAME id as the one now in
  // the DB, but a mutated payload. previousState has no sessions so the diff treats
  // the mutated session as a new append; the DB already holds the original session
  // under that id -> idempotent-upsert payload-mismatch -> session_conflict.
  const originalSession = result.nextState.sessions[0]!;
  const mutatedSession = { ...originalSession, xpGained: originalSession.xpGained + 999 };
  const conflictResult: SimulationResult = {
    ...result,
    status: 'applied',
    previousState: result.previousState,
    nextState: { ...result.previousState, sessions: [mutatedSession] },
  };

  const conflict = await repo.applyResult(conflictResult);
  expect(conflict.ok).toBe(false);
  if (!conflict.ok) {
    expect(conflict.error.kind).toBe('session_conflict');
  }
  repo.close();
});

test('an operation with an existing id but a mutated payload produces operation_conflict', async () => {
  const result = buildAppliedFocusResult('append-op-conflict');

  const db = new FlowgridDatabase('append-op-conflict-db');
  const repo = new FlowgridRepository(db);
  await repo.open();

  const first = await repo.applyResult(result);
  expect(first.ok).toBe(true);

  const originalOp = result.nextState.operations[0]!;
  const mutatedOp: SyncOperation = { ...originalOp, entityType: 'forge_history' };
  const conflictResult: SimulationResult = {
    ...result,
    status: 'applied',
    previousState: result.previousState,
    nextState: { ...result.previousState, operations: [mutatedOp] },
  };

  const conflict = await repo.applyResult(conflictResult);
  expect(conflict.ok).toBe(false);
  if (!conflict.ok) {
    expect(conflict.error.kind).toBe('operation_conflict');
  }
  repo.close();
});

test('FlowgridRepository exposes no update/delete API for sessions or operations', () => {
  const repo = new FlowgridRepository({} as unknown as FlowgridDatabase);
  const prototype = Object.getPrototypeOf(repo);
  expect(prototype.updateSession).toBeUndefined();
  expect(prototype.deleteSession).toBeUndefined();
  expect(prototype.deleteOperation).toBeUndefined();
  expect(prototype.updateOperation).toBeUndefined();
});
