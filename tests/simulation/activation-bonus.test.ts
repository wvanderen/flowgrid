// Phase 3 Activation bonus tests (D-15, SIM-07) and Bloom Momentum tests (D-14, SIM-06).
//
// Asserts that complete_focus_session:
//   - generates more Current when the Cell is Activated today (lastBloomLocalDate === env.localDate)
//   - does NOT bonus XP (D-15 leaves the XP path untouched)
//   - Bloom still fires normally and increments Momentum by 1 (D-14, SIM-06)
//   - the bonus uses Math.floor (integer discipline)

import { test, expect } from 'vitest';

import type {
  CellRecord,
  CompleteFocusSessionCommand,
  FlowgridSnapshot,
} from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';
import { expectValidState } from '../helpers/expect-valid-state.js';
import { expectReplayEqual } from '../helpers/replay.js';

const NOW = '2026-01-01T10:00:00.000Z';
const LOCAL_DATE = '2026-01-01';
const DURATION = 1500; // 25 minutes, hits the default daily milestone target.

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

function buildFocusCommand(
  ids: ReturnType<typeof buildStarterSnapshot>['ids'],
  suffix: string,
): CompleteFocusSessionCommand {
  return {
    type: 'complete_focus_session',
    operationId: `${ids.clientId}:op:${suffix}`,
    cellId: ids.cellId,
    startedAt: NOW,
    endedAt: '2026-01-01T10:25:00.000Z',
    durationSeconds: DURATION,
  };
}

test('complete_focus_session: an Activated Cell generates more Current than a non-Activated Cell (D-15)', () => {
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'activation' });

  // Non-activated: fresh starter snapshot (lastBloomLocalDate null). But we must
  // still cross the daily milestone so Bloom fires and activation is comparable.
  // For the bonus comparison we use a snapshot whose cell already bloomed today.
  const activatedBase = buildStarterSnapshot('activation-on');
  const activatedState = snapshotWithCell(activatedBase.state, {
    lastBloomLocalDate: LOCAL_DATE,
    momentum: 1,
    activation: 1,
    dailyMilestoneProgressSeconds: 0, // reset so the new session re-crosses the milestone
  });

  // For the non-activated baseline, use the plain starter snapshot (lastBloomLocalDate null).
  const plainBase = buildStarterSnapshot('activation-off');

  const activatedCommand = buildFocusCommand(activatedBase.ids, 'focus-on');
  const plainCommand: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: `${plainBase.ids.clientId}:op:focus-off`,
    cellId: plainBase.ids.cellId,
    startedAt: NOW,
    endedAt: '2026-01-01T10:25:00.000Z',
    durationSeconds: DURATION,
  };

  const activatedResult = runSimulationCommand(activatedState, activatedCommand, env);
  const plainResult = runSimulationCommand(plainBase.state, plainCommand, env);

  expect(activatedResult.status).toBe('applied');
  expect(plainResult.status).toBe('applied');

  const activatedCurrent = activatedResult.nextState.sessions[0]?.currentGenerated;
  const plainCurrent = plainResult.nextState.sessions[0]?.currentGenerated;

  expect(activatedCurrent, 'activated session must record Current').toBeDefined();
  expect(plainCurrent, 'plain session must record Current').toBeDefined();
  expect(activatedCurrent as number).toBeGreaterThan(plainCurrent as number);
});

test('complete_focus_session: XP is NOT affected by Activation (D-15 leaves XP untouched)', () => {
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'activation-xp' });

  const activatedBase = buildStarterSnapshot('activation-xp-on');
  const activatedState = snapshotWithCell(activatedBase.state, {
    lastBloomLocalDate: LOCAL_DATE,
    momentum: 1,
    activation: 1,
    dailyMilestoneProgressSeconds: 0,
  });
  const plainBase = buildStarterSnapshot('activation-xp-off');

  const activatedResult = runSimulationCommand(
    activatedState,
    buildFocusCommand(activatedBase.ids, 'xp-on'),
    env,
  );
  const plainResult = runSimulationCommand(plainBase.state, {
    type: 'complete_focus_session',
    operationId: `${plainBase.ids.clientId}:op:xp-off`,
    cellId: plainBase.ids.cellId,
    startedAt: NOW,
    endedAt: '2026-01-01T10:25:00.000Z',
    durationSeconds: DURATION,
  }, env);

  const activatedXp = activatedResult.nextState.sessions[0]?.xpGained;
  const plainXp = plainResult.nextState.sessions[0]?.xpGained;

  expect(activatedXp).toBe(plainXp);
});

test('complete_focus_session: the Activation bonus uses Math.floor (integer discipline)', () => {
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'activation-floor' });

  // baseCurrent = DURATION = 1500. Bonus percent = 10 → bonus = floor(1500 * 10 / 100) = 150.
  // Expected activated currentGenerated = 1500 + 150 = 1650.
  const activatedBase = buildStarterSnapshot('activation-floor');
  const activatedState = snapshotWithCell(activatedBase.state, {
    lastBloomLocalDate: LOCAL_DATE,
    momentum: 1,
    activation: 1,
    dailyMilestoneProgressSeconds: 0,
  });

  const result = runSimulationCommand(
    activatedState,
    buildFocusCommand(activatedBase.ids, 'floor'),
    env,
  );

  expect(result.status).toBe('applied');
  expect(result.nextState.sessions[0]?.currentGenerated).toBe(1650);
  expect(Number.isInteger(result.nextState.sessions[0]?.currentGenerated)).toBe(true);
});

test('complete_focus_session: Bloom still fires normally on an Activated Cell and increments Momentum (D-14, SIM-06)', () => {
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'activation-bloom' });

  // Use a cell that is NOT yet activated today (lastBloomLocalDate null), so completing
  // a milestone-crossing session triggers Bloom for the first time today.
  const { ids, state } = buildStarterSnapshot('activation-bloom');
  const starter = snapshotWithCell(state, {
    momentum: 0,
    activation: 0,
    dailyMilestoneProgressSeconds: 0,
  });

  const result = runSimulationCommand(starter, buildFocusCommand(ids, 'bloom'), env);

  expect(result.status).toBe('applied');
  const cell = result.nextState.cells.get(ids.cellId);
  expect(cell).toBeDefined();
  expect(result.nextState.sessions[0]?.bloomFired).toBe(true);
  expect(cell?.lastBloomLocalDate).toBe(LOCAL_DATE);
  expect(cell?.activation, 'activation increments by 1 on Bloom').toBe(1);
  expect(cell?.momentum, 'momentum increments by 1 on Bloom (D-14, SIM-06)').toBe(1);

  expectValidState(result.nextState);
});

test('complete_focus_session: Activation bonus result is exactly replayable (D-08)', () => {
  const env1 = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'activation-replay' });
  const env2 = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'activation-replay' });

  const base = buildStarterSnapshot('activation-replay');
  const activatedState = snapshotWithCell(base.state, {
    lastBloomLocalDate: LOCAL_DATE,
    momentum: 1,
    activation: 1,
    dailyMilestoneProgressSeconds: 0,
  });

  const command = buildFocusCommand(base.ids, 'replay');

  const a = runSimulationCommand(activatedState, command, env1);
  const b = runSimulationCommand(activatedState, command, env2);

  expectReplayEqual(a, b);
});
