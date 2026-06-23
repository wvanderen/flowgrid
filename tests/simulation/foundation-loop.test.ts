// Phase 1 Plan 01-01: red foundation-loop test encoding the executable contract.
//
// This test deliberately fails until Plan 01-02 implements `createStarterFlowgridState`
// and Plan 01-03 implements `runSimulationCommand`. Plan 01-03 will rewrite the body
// to assert concrete integer outcomes for the foundation loop.
//
// The assertions below encode decisions D-01, D-03, D-05, and D-08 from
// `.planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md`:
//   D-01: foundation loop creates starter state, completes focus, fires Bloom,
//         routes starter Output to Core, applies default allocation, validates.
//   D-03: focus completion uses elapsed-duration input with injected timing.
//   D-05: safety-core invariant tier is enforced.
//   D-08: replay is exact for state, economy events, visual events, operations,
//         and validation issues.

import { test, expect } from 'vitest';

import { createStarterFlowgridState } from '../../src/content/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import type { CompleteFocusSessionCommand } from '../../src/domain/index.js';

import { expectValidState } from '../helpers/expect-valid-state.js';
import { expectReplayEqual } from '../helpers/replay.js';
import { createTestIds, createTestSimulationEnv } from '../helpers/fixtures.js';

test('complete_focus_session: starter state through focus, Bloom, Output route, Core allocation, validation', () => {
  const ids = createTestIds('foundation-loop');
  const now = '2026-01-01T10:00:00.000Z';
  const localDate = '2026-01-01';
  const focusDurationSeconds = 1500;
  const endedAt = '2026-01-01T10:25:00.000Z';

  const previousState = createStarterFlowgridState({
    now,
    localDate,
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

  const env = createTestSimulationEnv({ now, localDate, seed: 'foundation-loop' });

  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: `${ids.clientId}:op:focus-1`,
    cellId: ids.cellId,
    startedAt: now,
    endedAt,
    durationSeconds: focusDurationSeconds,
  };

  const result = runSimulationCommand(previousState, command, env);

  // Status: applied (D-01).
  expect(result.status, 'valid foundation command must apply').toBe('applied');
  expect(result.previousState, 'result carries previous state').toBe(previousState);

  // Result shape is complete even on applied results (FND-04).
  expect(Array.isArray(result.economyEvents)).toBe(true);
  expect(Array.isArray(result.visualEvents)).toBe(true);
  expect(Array.isArray(result.operations)).toBe(true);
  expect(Array.isArray(result.validationIssues)).toBe(true);

  // Economy signal flows: focus completion produces Current, XP, route, Core events.
  expect(result.economyEvents.length, 'applied command emits economy events').toBeGreaterThan(0);
  expect(result.operations.length, 'applied command emits a sync-ready operation').toBe(1);
  expect(result.operations[0]?.commandType).toBe('complete_focus_session');
  expect(result.operations[0]?.id).toBe(command.operationId);

  // Validation: applied results must be clean (D-05).
  expect(result.validationIssues, 'applied result has no validation issues').toEqual([]);

  // Integer economy values (no floats drift) — enforced for Energy and Core Charge.
  expect(Number.isInteger(result.nextState.core.energy)).toBe(true);
  expect(result.nextState.core.energy).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(result.nextState.core.coreCharge)).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(result.nextState.core.lifetimeEnergy)).toBe(true);
  expect(result.nextState.core.lifetimeEnergy).toBeGreaterThanOrEqual(0);

  // State validity (D-05).
  expectValidState(result.nextState);

  // Replay: same inputs produce identical result (D-08).
  const replayEnv = createTestSimulationEnv({ now, localDate, seed: 'foundation-loop' });
  const replay = runSimulationCommand(previousState, command, replayEnv);
  expectReplayEqual(result, replay);
});

test('complete_focus_session: invalid duration is rejected with unchanged state and structured issues', () => {
  const ids = createTestIds('foundation-loop-invalid');
  const now = '2026-01-01T10:00:00.000Z';
  const localDate = '2026-01-01';

  const previousState = createStarterFlowgridState({
    now,
    localDate,
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

  const env = createTestSimulationEnv({ now, localDate, seed: 'foundation-loop-invalid' });

  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: `${ids.clientId}:op:focus-bad`,
    cellId: ids.cellId,
    startedAt: now,
    endedAt: now,
    durationSeconds: 0,
  };

  const result = runSimulationCommand(previousState, command, env);

  expect(result.status, 'non-positive duration must reject').toBe('rejected');
  expect(result.nextState, 'rejected command preserves state').toEqual(previousState);
  expect(result.economyEvents, 'rejected command emits no economy events').toEqual([]);
  expect(result.operations, 'rejected command emits no operations').toEqual([]);
  expect(result.validationIssues.length, 'rejected command reports structured issues').toBeGreaterThan(0);
});
