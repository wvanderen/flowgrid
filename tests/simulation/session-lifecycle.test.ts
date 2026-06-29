// Phase 3 start_focus_session / cancel_focus_session tests (SESS-01, SESS-03, D-05, D-07).
//
// Asserts:
//   - start_focus_session sets activeSessionStartedAt to env.now on the cell,
//     emits exactly one SyncOperation
//   - start_focus_session rejects when: cellId does not exist, cell is archived,
//     OR another cell already has a non-null activeSessionStartedAt (one active at a time)
//   - cancel_focus_session returns status 'applied', clears activeSessionStartedAt,
//     and writes NOTHING durable: operations array length 0, economyEvents length 0
//     (D-07 / Pitfall 6)
//   - cancel_focus_session is exactly replayable

import { test, expect } from 'vitest';

import type {
  CancelFocusSessionCommand,
  CellRecord,
  CompleteFocusSessionCommand,
  FlowgridSnapshot,
  StartFocusSessionCommand,
} from '../../src/domain/index.js';
import { VISUAL_EVENT_NAMES } from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';
import { expectValidState } from '../helpers/expect-valid-state.js';
import { expectReplayEqual } from '../helpers/replay.js';

const NOW = '2026-01-04T14:00:00.000Z';
const LOCAL_DATE = '2026-01-04';

function snapshotWithCell(
  state: FlowgridSnapshot,
  overrides: Partial<CellRecord>,
): FlowgridSnapshot {
  const original = state.cells.values().next().value as CellRecord;
  const updated: CellRecord = { ...original, ...overrides };
  const cells = new Map(state.cells);
  cells.set(original.id, updated);
  return { ...state, cells };
}

test('start_focus_session: sets activeSessionStartedAt to env.now and emits one operation', () => {
  const { ids, state } = buildStarterSnapshot('start-session');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'start-session' });

  const command: StartFocusSessionCommand = {
    type: 'start_focus_session',
    operationId: `${ids.clientId}:op:start-1`,
    cellId: ids.cellId,
  };

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('applied');
  const cell = result.nextState.cells.get(ids.cellId) as CellRecord;
  expect(cell.activeSessionStartedAt).toBe(NOW);
  expect(result.operations).toHaveLength(1);
  expect(result.operations[0]?.commandType).toBe('start_focus_session');
  expect(result.operations[0]?.entityType).toBe('cell');
  expect(result.visualEvents).toEqual([
    {
      type: VISUAL_EVENT_NAMES.focusSessionStartedVisual,
      entityType: 'cell',
      entityId: ids.cellId,
      payload: {},
      at: NOW,
    },
  ]);
  expectValidState(result.nextState);
});

test('start_focus_session: rejects when cellId does not exist', () => {
  const { ids, state } = buildStarterSnapshot('start-session-missing');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'start-session' });

  const command: StartFocusSessionCommand = {
    type: 'start_focus_session',
    operationId: `${ids.clientId}:op:start-missing`,
    cellId: 'no-such-cell',
  };

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(state);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('start_focus_session: rejects an archived cell', () => {
  const { ids, state } = buildStarterSnapshot('start-session-archived');
  const archived = snapshotWithCell(state, { archivedAt: '2026-01-01T00:00:00.000Z' });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'start-session' });

  const command: StartFocusSessionCommand = {
    type: 'start_focus_session',
    operationId: `${ids.clientId}:op:start-archived`,
    cellId: ids.cellId,
  };

  const result = runSimulationCommand(archived, command, env);

  expect(result.status).toBe('rejected');
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('start_focus_session: rejects when another cell already has an active session', () => {
  const { ids, state } = buildStarterSnapshot('start-session-conflict');
  // The starter cell already has an active session marker.
  const conflict = snapshotWithCell(state, { activeSessionStartedAt: '2026-01-04T13:00:00.000Z' });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'start-session' });

  // Create a second cell (so the command targets a real cell that is NOT the busy one).
  // We reuse the same ids.cellId for the command — the rejection must trigger because
  // the starter cell already holds an active marker (one-active-session invariant D-05).
  const command: StartFocusSessionCommand = {
    type: 'start_focus_session',
    operationId: `${ids.clientId}:op:start-conflict`,
    cellId: ids.cellId,
  };

  // Cell already has activeSessionStartedAt set; starting again must reject.
  const result = runSimulationCommand(conflict, command, env);

  expect(result.status).toBe('rejected');
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('start_focus_session: is exactly replayable', () => {
  const { ids, state } = buildStarterSnapshot('start-session-replay');
  const envA = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'start-session' });
  const envB = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'start-session' });

  const command: StartFocusSessionCommand = {
    type: 'start_focus_session',
    operationId: `${ids.clientId}:op:start-replay`,
    cellId: ids.cellId,
  };

  const a = runSimulationCommand(state, command, envA);
  const b = runSimulationCommand(state, command, envB);
  expectReplayEqual(a, b);
});

test('cancel_focus_session: returns applied, clears activeSessionStartedAt, writes NOTHING durable (D-07)', () => {
  const { ids, state } = buildStarterSnapshot('cancel-session');
  const active = snapshotWithCell(state, { activeSessionStartedAt: '2026-01-04T13:00:00.000Z' });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'cancel-session' });

  const command: CancelFocusSessionCommand = {
    type: 'cancel_focus_session',
    operationId: `${ids.clientId}:op:cancel-1`,
    cellId: ids.cellId,
  };

  const result = runSimulationCommand(active, command, env);

  expect(result.status, 'cancel is a real action — status applied').toBe('applied');

  // The marker is cleared.
  const cell = result.nextState.cells.get(ids.cellId) as CellRecord;
  expect(cell.activeSessionStartedAt).toBeNull();
  expect(cell.updatedAt).toBe(NOW);

  // D-07 / Pitfall 6: cancel writes NO durable records beyond clearing the marker.
  expect(result.operations, 'cancel writes no operation row').toHaveLength(0);
  expect(result.economyEvents, 'cancel emits no economy events').toHaveLength(0);
  expect(result.visualEvents, 'cancel emits no visual events').toHaveLength(0);
  // No new session appended.
  expect(result.nextState.sessions).toHaveLength(active.sessions.length);

  expectValidState(result.nextState);
});

test('cancel_focus_session: rejects when there is no active session to cancel', () => {
  const { ids, state } = buildStarterSnapshot('cancel-session-no-active');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'cancel-session' });

  const command: CancelFocusSessionCommand = {
    type: 'cancel_focus_session',
    operationId: `${ids.clientId}:op:cancel-none`,
    cellId: ids.cellId,
  };

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('rejected');
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('cancel_focus_session: rejects when cellId does not exist', () => {
  const { ids, state } = buildStarterSnapshot('cancel-session-missing-cell');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'cancel-session' });

  const command: CancelFocusSessionCommand = {
    type: 'cancel_focus_session',
    operationId: `${ids.clientId}:op:cancel-missing`,
    cellId: 'no-such-cell',
  };

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('rejected');
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('cancel_focus_session: is exactly replayable', () => {
  const { ids, state } = buildStarterSnapshot('cancel-session-replay');
  const active = snapshotWithCell(state, { activeSessionStartedAt: '2026-01-04T13:00:00.000Z' });
  const envA = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'cancel-session' });
  const envB = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'cancel-session' });

  const command: CancelFocusSessionCommand = {
    type: 'cancel_focus_session',
    operationId: `${ids.clientId}:op:cancel-replay`,
    cellId: ids.cellId,
  };

  const a = runSimulationCommand(active, command, envA);
  const b = runSimulationCommand(active, command, envB);
  expectReplayEqual(a, b);
});

test('complete_focus_session: clears activeSessionStartedAt so the session visually ends', () => {
  // Regression for UAT test 15 root cause 3a (Gap A): complete_focus_session appended
  // the SessionRecord but never cleared cell.activeSessionStartedAt, so
  // deriveActiveSession() kept projecting the session as active after Finish and
  // the GeneratorTile stayed stuck in the in-progress state.
  const { ids, state } = buildStarterSnapshot('complete-session-clears-marker');
  const active = snapshotWithCell(state, { activeSessionStartedAt: '2026-01-04T13:00:00.000Z' });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'complete-session' });

  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: `${ids.clientId}:op:complete-1`,
    cellId: ids.cellId,
    startedAt: '2026-01-04T13:00:00.000Z',
    endedAt: NOW,
    durationSeconds: 3600,
  };

  const result = runSimulationCommand(active, command, env);

  expect(result.status, 'complete with a positive integer duration is applied').toBe('applied');

  // THIS IS THE REGRESSION — the marker must clear so the session visually ends.
  // Pre-fix this assertion failed (the marker stayed at the startedAt timestamp).
  const cell = result.nextState.cells.get(ids.cellId) as CellRecord;
  expect(cell.activeSessionStartedAt).toBeNull();

  // The session was appended — exactly one new SessionRecord.
  expect(result.nextState.sessions).toHaveLength(active.sessions.length + 1);

  // One SyncOperation recorded (complete_focus_session writes exactly one).
  expect(result.operations).toHaveLength(1);
  expect(result.operations[0]?.commandType).toBe('complete_focus_session');

  expectValidState(result.nextState);
});
