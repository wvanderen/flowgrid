// Phase 4 Activation-bonus upgrade tests (SPEC R5, CORE-06).
//
// Asserts:
//   - level 0 + Energy >= 50 -> purchase succeeds, Energy -= 50, level becomes 1
//   - after a level-1 purchase, the next activated focus session earns +15% Current
//     (derived activationBonusPercent(1) = 10 + 1*5 = 15)
//   - at cap (level 3): purchase rejected with unchanged state
//   - Energy below the next level's cost: rejected with unchanged state
//   - the threshold sequence is exactly 50, 75, 112, 168, 252 (documents the floored curve)
//   - activationBonusPercent(0..3) equals 10, 15, 20, 25
//   - the upgrade result is exactly replayable

import { test, expect } from 'vitest';

import type {
  CellRecord,
  CompleteFocusSessionCommand,
  CoreRecord,
  FlowgridSnapshot,
  PurchaseActivationBoostCommand,
} from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import {
  activationBonusPercent,
  activationBoostCost,
  nextIntegrationThreshold,
} from '../../src/content/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';
import { expectValidState } from '../helpers/expect-valid-state.js';
import { expectReplayEqual } from '../helpers/replay.js';

const NOW = '2026-01-01T10:00:00.000Z';
const LOCAL_DATE = '2026-01-01';
const DURATION = 1500; // 25 minutes — crosses the default daily milestone so Bloom fires.

function snapshotWithCore(
  state: FlowgridSnapshot,
  overrides: Partial<CoreRecord>,
): FlowgridSnapshot {
  return { ...state, core: { ...state.core, ...overrides } };
}

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

test('purchase_activation_boost: level 0 + Energy 50 -> Energy 0, level 1, one operation', () => {
  const { ids, state } = buildStarterSnapshot('boost-purchase');
  const seeded = snapshotWithCore(state, { energy: 50, activationBoostLevel: 0 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'boost' });

  const command: PurchaseActivationBoostCommand = {
    type: 'purchase_activation_boost',
    operationId: `${ids.clientId}:op:boost-1`,
  };

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('applied');
  expect(result.nextState.core.energy).toBe(0);
  expect(result.nextState.core.activationBoostLevel).toBe(1);
  expect(result.operations).toHaveLength(1);
  expect(result.operations[0]?.commandType).toBe('purchase_activation_boost');
  expectValidState(result.nextState);
});

test('purchase_activation_boost: is exactly replayable', () => {
  const { ids, state } = buildStarterSnapshot('boost-replay');
  const seeded = snapshotWithCore(state, { energy: 50, activationBoostLevel: 0 });
  const envA = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'boost-replay' });
  const envB = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'boost-replay' });

  const command: PurchaseActivationBoostCommand = {
    type: 'purchase_activation_boost',
    operationId: `${ids.clientId}:op:boost-replay`,
  };

  const a = runSimulationCommand(seeded, command, envA);
  const b = runSimulationCommand(seeded, command, envB);
  expectReplayEqual(a, b);
});

test('after a level-1 boost, an activated focus session earns +15% Current (not +10%)', () => {
  // Two parallel runs: one with level 0 (baseline Phase 3 bonus +10%), one with level 1
  // (CORE-06 bonus +15%). Both on an Activated cell so the bonus applies. The level-1
  // session must generate more Current than the level-0 session by exactly the delta
  // between a 10% and a 15% bonus.
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'boost-effect' });

  const level0Base = buildStarterSnapshot('boost-effect-l0');
  const level0State = snapshotWithCore(
    snapshotWithCell(level0Base.state, {
      lastBloomLocalDate: LOCAL_DATE,
      momentum: 1,
      activation: 1,
      dailyMilestoneProgressSeconds: 0,
    }),
    { energy: 0, activationBoostLevel: 0 },
  );

  const level1Base = buildStarterSnapshot('boost-effect-l1');
  const level1State = snapshotWithCore(
    snapshotWithCell(level1Base.state, {
      lastBloomLocalDate: LOCAL_DATE,
      momentum: 1,
      activation: 1,
      dailyMilestoneProgressSeconds: 0,
    }),
    { energy: 0, activationBoostLevel: 1 },
  );

  const level0Result = runSimulationCommand(level0State, buildFocusCommand(level0Base.ids, 'l0-focus'), env);
  const level1Result = runSimulationCommand(level1State, buildFocusCommand(level1Base.ids, 'l1-focus'), env);

  expect(level0Result.status).toBe('applied');
  expect(level1Result.status).toBe('applied');

  const level0Current = level0Result.nextState.sessions[0]?.currentGenerated;
  const level1Current = level1Result.nextState.sessions[0]?.currentGenerated;

  // baseCurrent = DURATION = 1500. Level 0 bonus = floor(1500 * 10 / 100) = 150 -> 1650.
  // Level 1 bonus = floor(1500 * 15 / 100) = 225 -> 1725. Delta = 75.
  expect(level0Current).toBe(1650);
  expect(level1Current).toBe(1725);
  expect((level1Current as number) - (level0Current as number)).toBe(75);
});

test('purchase_activation_boost: at cap (level 3) rejected with unchanged state', () => {
  const { ids, state } = buildStarterSnapshot('boost-cap');
  const atCap = snapshotWithCore(state, { energy: 1000, activationBoostLevel: 3 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'boost-cap' });

  const command: PurchaseActivationBoostCommand = {
    type: 'purchase_activation_boost',
    operationId: `${ids.clientId}:op:boost-cap`,
  };

  const result = runSimulationCommand(atCap, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(atCap);
  expect(result.operations).toEqual([]);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('purchase_activation_boost: Energy below cost rejected with unchanged state', () => {
  const { ids, state } = buildStarterSnapshot('boost-poor');
  // Level 0 -> cost is 50. Energy 49 is below.
  const poor = snapshotWithCore(state, { energy: 49, activationBoostLevel: 0 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'boost-poor' });

  const command: PurchaseActivationBoostCommand = {
    type: 'purchase_activation_boost',
    operationId: `${ids.clientId}:op:boost-poor`,
  };

  const result = runSimulationCommand(poor, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(poor);
  expect(result.operations).toEqual([]);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('the first five Integration thresholds are exactly 50, 75, 112, 168, 252 (floored curve)', () => {
  expect(nextIntegrationThreshold(0)).toBe(50);
  expect(nextIntegrationThreshold(1)).toBe(75);
  expect(nextIntegrationThreshold(2)).toBe(112);
  expect(nextIntegrationThreshold(3)).toBe(168);
  expect(nextIntegrationThreshold(4)).toBe(252);
});

test('activationBonusPercent(0..3) equals 10, 15, 20, 25', () => {
  expect(activationBonusPercent(0)).toBe(10);
  expect(activationBonusPercent(1)).toBe(15);
  expect(activationBonusPercent(2)).toBe(20);
  expect(activationBonusPercent(3)).toBe(25);
});

test('activationBoostCost returns the level costs and null at cap', () => {
  expect(activationBoostCost(0)).toBe(50);
  expect(activationBoostCost(1)).toBe(100);
  expect(activationBoostCost(2)).toBe(200);
  expect(activationBoostCost(3)).toBeNull();
});
