// Phase 6 update_settings handler acceptance tests (D-08, D-10..D-13, VER-01).
//
// Mirrors run-forge.test.ts structure: snapshot-with-overrides helpers, one test()
// per behavior bullet. Asserts:
//   - valid update_settings applies: all four fields set, one operation (entityType settings)
//   - non-positive session length -> rejected (invalid_operation_shape), state unchanged
//   - malformed localDayBoundary -> rejected (invalid_operation_shape), state unchanged
//   - D-12: existing Cells' dailyMilestoneTargetSeconds unchanged
//   - deterministic replay (expectReplayEqual)

import { test, expect } from 'vitest';

import type {
  FlowgridSnapshot,
  SettingsRecord,
  UpdateSettingsCommand,
} from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';
import { expectValidState } from '../helpers/expect-valid-state.js';
import { expectReplayEqual } from '../helpers/replay.js';

const NOW = '2026-01-04T14:00:00.000Z';
const LOCAL_DATE = '2026-01-04';

function snapshotWithSettings(
  state: FlowgridSnapshot,
  overrides: Partial<SettingsRecord>,
): FlowgridSnapshot {
  return { ...state, settings: { ...state.settings, ...overrides } };
}

function validCommand(settingsId: string, overrides: Partial<UpdateSettingsCommand> = {}): UpdateSettingsCommand {
  return {
    type: 'update_settings',
    operationId: `${settingsId}:op:update`,
    defaultSessionLengthSeconds: 1200,
    dailyTargetSeconds: 2400,
    localDayBoundary: '04:00',
    reduceMotion: true,
    ...overrides,
  };
}

test('update_settings applies: all four fields set, one operation appended with entityType settings', () => {
  const { ids, state } = buildStarterSnapshot('settings-apply');
  const seeded = snapshotWithSettings(state, { reduceMotion: false });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'settings-apply' });
  const command = validCommand(ids.settingsId);

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('applied');
  expect(result.nextState.settings.defaultSessionLengthSeconds).toBe(1200);
  expect(result.nextState.settings.dailyTargetSeconds).toBe(2400);
  expect(result.nextState.settings.localDayBoundary).toBe('04:00');
  expect(result.nextState.settings.reduceMotion).toBe(true);
  expect(result.nextState.settings.updatedAt).toBe(NOW);
  expect(result.operations).toHaveLength(1);
  expect(result.operations[0]?.entityType).toBe('settings');
  expect(result.operations[0]?.id).toBe(command.operationId);
  expect(result.operations[0]?.entityId).toBe(ids.settingsId);
  expect(result.visualEvents).toEqual([]);
  expectValidState(result.nextState);
});

test('update_settings non-positive session length -> rejected (invalid_operation_shape), state unchanged', () => {
  const { ids, state } = buildStarterSnapshot('settings-bad-len');
  const seeded = snapshotWithSettings(state, { reduceMotion: false });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'settings-bad-len' });
  const command = validCommand(ids.settingsId, { defaultSessionLengthSeconds: 0 });

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(seeded);
  expect(result.operations).toEqual([]);
  expect(result.validationIssues.some((i) => i.code === 'invalid_operation_shape')).toBe(true);
});

test('update_settings malformed localDayBoundary -> rejected (invalid_operation_shape), state unchanged', () => {
  const { ids, state } = buildStarterSnapshot('settings-bad-boundary');
  const seeded = snapshotWithSettings(state, { reduceMotion: false });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'settings-bad-boundary' });
  const command = validCommand(ids.settingsId, { localDayBoundary: '4am' });

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(seeded);
  expect(result.operations).toEqual([]);
  expect(result.validationIssues.some((i) => i.code === 'invalid_operation_shape')).toBe(true);
});

test('update_settings leaves existing Cells dailyMilestoneTargetSeconds unchanged (D-12)', () => {
  const { ids, state } = buildStarterSnapshot('settings-d12');
  const seeded = snapshotWithSettings(state, { reduceMotion: false });
  // Capture every existing Cell's dailyMilestoneTargetSeconds before the update.
  const before = [...seeded.cells.values()].map((c) => [c.id, c.dailyMilestoneTargetSeconds] as const);
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'settings-d12' });
  const command = validCommand(ids.settingsId, { dailyTargetSeconds: 99999 });

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('applied');
  // The settings default changed, but every Cell's captured target is identical.
  expect(result.nextState.settings.dailyTargetSeconds).toBe(99999);
  for (const [cellId, target] of before) {
    expect(result.nextState.cells.get(cellId)?.dailyMilestoneTargetSeconds).toBe(target);
  }
});

test('update_settings is exactly replayable (identical result for identical inputs, D-08)', () => {
  const { ids, state } = buildStarterSnapshot('settings-replay');
  const seeded = snapshotWithSettings(state, { reduceMotion: false });
  const envA = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'settings-replay' });
  const envB = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'settings-replay' });
  const command = validCommand(ids.settingsId);

  const a = runSimulationCommand(seeded, command, envA);
  const b = runSimulationCommand(seeded, command, envB);
  expectReplayEqual(a, b);
});
