// Phase 1 foundation-loop test: the executable contract for the deterministic
// foundation slice.
//
// Asserts the full loop end-to-end: starter state -> focus completion -> Bloom ->
// Output route to Core -> default Core allocation -> validation. Also covers the
// invalid-duration rejection path and exact replay (decisions D-01, D-03, D-05,
// D-07, D-08 from `01-CONTEXT.md`).

import { test, expect } from 'vitest';

import { createStarterFlowgridState } from '../../src/content/index.js';
import type { CompleteFocusSessionCommand } from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';

import { expectValidState } from '../helpers/expect-valid-state.js';
import { expectReplayEqual } from '../helpers/replay.js';
import { createTestIds, createTestSimulationEnv } from '../helpers/fixtures.js';

const NOW = '2026-01-01T10:00:00.000Z';
const LOCAL_DATE = '2026-01-01';

function buildStarterState(prefix: string) {
  const ids = createTestIds(prefix);
  const state = createStarterFlowgridState({
    now: NOW,
    localDate: LOCAL_DATE,
    clientId: ids.clientId,
    cellId: ids.cellId,
    coreId: ids.coreId,
    generatorModuleInstanceId: ids.generatorModuleInstanceId,
    chargeCoreModuleInstanceId: ids.chargeCoreModuleInstanceId,
    outputModuleInstanceId: ids.outputModuleInstanceId,
    bloomModuleInstanceId: ids.bloomModuleInstanceId,
    outputRouteId: ids.outputRouteId,
    settingsId: ids.settingsId,
    forgeHistoryId: ids.forgeHistoryId,
  });
  return { ids, state };
}

test('complete_focus_session: starter state through focus, Bloom, Output route, Core allocation, validation', () => {
  const { ids, state } = buildStarterState('foundation-loop');
  const focusDurationSeconds = 1500; // 25 minutes == default daily milestone target
  const endedAt = '2026-01-01T10:25:00.000Z';

  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'foundation-loop' });

  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: `${ids.clientId}:op:focus-1`,
    cellId: ids.cellId,
    startedAt: NOW,
    endedAt,
    durationSeconds: focusDurationSeconds,
  };

  const result = runSimulationCommand(state, command, env);

  // Status: applied (D-01).
  expect(result.status, 'valid foundation command must apply').toBe('applied');
  expect(result.previousState, 'result carries previous state').toBe(state);
  expect(result.nextState, 'applied result produces a new state').not.toBe(state);

  // Result shape complete (FND-04).
  expect(Array.isArray(result.economyEvents)).toBe(true);
  expect(Array.isArray(result.visualEvents)).toBe(true);
  expect(Array.isArray(result.operations)).toBe(true);
  expect(Array.isArray(result.validationIssues)).toBe(true);

  // Economy signal: focus, current, xp, bloom, activation, route, convert, store, validated.
  expect(result.economyEvents.length, 'applied command emits economy events').toBeGreaterThan(0);
  const eventTypes = result.economyEvents.map((e) => e.type);
  expect(eventTypes).toContain('focus_session_completed');
  expect(eventTypes).toContain('current_generated');
  expect(eventTypes).toContain('cell_xp_gained');
  expect(eventTypes).toContain('bloom_fired');
  expect(eventTypes).toContain('cell_activated');
  expect(eventTypes).toContain('current_routed_to_core');
  expect(eventTypes).toContain('core_current_converted');
  expect(eventTypes).toContain('core_charge_stored');
  expect(eventTypes).toContain('state_validated');

  // Operation: one, with command-supplied ID (D-02).
  expect(result.operations).toHaveLength(1);
  expect(result.operations[0]?.commandType).toBe('complete_focus_session');
  expect(result.operations[0]?.id).toBe(command.operationId);

  // Validation clean (D-05).
  expect(result.validationIssues, 'applied result has no validation issues').toEqual([]);

  // Integer economy values.
  const core = result.nextState.core;
  expect(Number.isInteger(core.energy)).toBe(true);
  expect(core.energy).toBeGreaterThan(0);
  expect(Number.isInteger(core.coreCharge)).toBe(true);
  expect(core.coreCharge).toBeGreaterThan(0);
  expect(Number.isInteger(core.lifetimeEnergy)).toBe(true);
  expect(core.lifetimeEnergy).toBe(core.energy);

  // Session appended with deterministic ID (1:1 with operation in Phase 1).
  expect(result.nextState.sessions).toHaveLength(1);
  expect(result.nextState.sessions[0]?.id).toBe(command.operationId);
  expect(result.nextState.sessions[0]?.xpGained).toBe(25);
  expect(result.nextState.sessions[0]?.currentGenerated).toBe(1500);
  expect(result.nextState.sessions[0]?.bloomFired).toBe(true);

  // Cell state advanced: XP, milestone complete, Bloom fired today, Activation +1.
  const cell = result.nextState.cells.get(ids.cellId);
  expect(cell).toBeDefined();
  expect(cell?.xp).toBe(25);
  expect(cell?.dailyMilestoneProgressSeconds).toBe(1500);
  expect(cell?.lastBloomLocalDate).toBe(LOCAL_DATE);
  expect(cell?.activation).toBe(1);

  // State validity (D-05).
  expectValidState(result.nextState);

  // Exact replay: same inputs produce identical result (D-08).
  const replayEnv = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'foundation-loop' });
  const replay = runSimulationCommand(state, command, replayEnv);
  expectReplayEqual(result, replay);
});

test('complete_focus_session: invalid duration is rejected with unchanged state and structured issues', () => {
  const { ids, state } = buildStarterState('foundation-loop-invalid');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'foundation-loop-invalid' });

  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: `${ids.clientId}:op:focus-bad`,
    cellId: ids.cellId,
    startedAt: NOW,
    endedAt: NOW,
    durationSeconds: 0,
  };

  const result = runSimulationCommand(state, command, env);

  expect(result.status, 'non-positive duration must reject').toBe('rejected');
  expect(result.nextState, 'rejected command preserves state').toEqual(state);
  expect(result.economyEvents, 'rejected command emits no economy events').toEqual([]);
  expect(result.visualEvents, 'rejected command emits no visual events').toEqual([]);
  expect(result.operations, 'rejected command emits no operations').toEqual([]);
  expect(result.validationIssues.length, 'rejected command reports structured issues').toBeGreaterThan(0);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('complete_focus_session: unknown cellId is rejected with invalid_reference', () => {
  const { ids, state } = buildStarterState('foundation-loop-unknown-cell');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'unknown-cell' });

  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: `${ids.clientId}:op:focus-unknown`,
    cellId: 'no-such-cell',
    startedAt: NOW,
    endedAt: '2026-01-01T10:25:00.000Z',
    durationSeconds: 1500,
  };

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(state);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('set_core_allocation: valid 100-total split applies; invalid totals reject unchanged', () => {
  const { ids, state } = buildStarterState('foundation-loop-allocation');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'allocation' });

  const valid = {
    type: 'set_core_allocation' as const,
    operationId: `${ids.clientId}:op:alloc-1`,
    convertAllocationPercent: 70,
    storeAllocationPercent: 30,
  };
  const applied = runSimulationCommand(state, valid, env);
  expect(applied.status).toBe('applied');
  expect(applied.nextState.core.convertAllocationPercent).toBe(70);
  expect(applied.nextState.core.storeAllocationPercent).toBe(30);

  const invalid = {
    type: 'set_core_allocation' as const,
    operationId: `${ids.clientId}:op:alloc-bad`,
    convertAllocationPercent: 60,
    storeAllocationPercent: 30,
  };
  const rejected = runSimulationCommand(state, invalid, env);
  expect(rejected.status).toBe('rejected');
  expect(rejected.nextState).toEqual(state);
  expect(rejected.validationIssues.some((i) => i.code === 'invalid_core_allocation_total')).toBe(true);
});

test('run_forge and install_module return not_implemented; log_rejuvenation is now a real handler', () => {
  const { ids, state } = buildStarterState('foundation-loop-not-impl');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'not-impl' });

  // log_rejuvenation was a not_implemented stub through Phase 3; Phase 4 (plan 04-01)
  // replaces it with a real handler. The starter snapshot has 0 Core Charge, so a
  // rejuvenation applies as a no-op rest (REJ-03): a zero-gain RejuvenationRecord is
  // appended, Integration/Module Tokens unchanged, one operation emitted.
  const rej = runSimulationCommand(
    state,
    {
      type: 'log_rejuvenation',
      operationId: `${ids.clientId}:op:rej-1`,
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:10:00.000Z',
    },
    env,
  );
  expect(rej.status).toBe('applied');
  expect(rej.nextState).not.toBe(state);
  expect(rej.nextState.core.integration).toBe(0);
  expect(rej.nextState.core.moduleTokens).toBe(0);
  expect(rej.nextState.rejuvenations).toHaveLength(1);
  expect(rej.nextState.rejuvenations[0]?.chargeConsumed).toBe(0);
  expect(rej.operations).toHaveLength(1);

  // Phase 5 (plan 05-01 Task 2) replaced the run_forge not_implemented stub with a
  // real handler, so this test no longer asserts the run_forge stub here. The
  // install_module stub below remains (D-08 reserves it for a future variant-swap
  // phase) and continues to exercise the not_implemented result path.
  const install = runSimulationCommand(
    state,
    {
      type: 'install_module',
      operationId: `${ids.clientId}:op:install-1`,
      definitionId: 'flowgrid:module-definition:generator',
      ownerCellId: ids.cellId,
      installedSlotId: `${ids.cellId}:slot:generator`,
    },
    env,
  );
  expect(install.status).toBe('not_implemented');
  expect(install.nextState).toBe(state);
});
