// Phase 1 Plan 01-02 Task 2: command/result contract smoke tests.
//
// Asserts that the SimulationResult shape is complete for applied, rejected, and
// not_implemented outcomes, and that the event/operation helpers produce typed
// records. Plan 01-03 Task 1 rewrites this file to assert behavioral outcomes from
// the real dispatcher.

import { test, expect } from 'vitest';

import type {
  CompleteFocusSessionCommand,
  EconomyEvent,
  IsoDateTimeString,
  SimulationResult,
  VisualEvent,
} from '../../src/domain/index.js';

import {
  ECONOMY_EVENT_NAMES,
  VISUAL_EVENT_NAMES,
  cellActivatedEvent,
  cellXpGainedEvent,
  bloomFiredEvent,
  coreChargeStoredEvent,
  coreCurrentConvertedEvent,
  currentGeneratedEvent,
  currentRoutedToCoreEvent,
  focusSessionCompletedEvent,
  stateValidatedEvent,
  focusSessionStartedVisual,
  currentFlowVisual,
  bloomBurstVisual,
  cellActivationVisual,
  coreConvertVisual,
  coreChargeStoreVisual,
} from '../../src/simulation/index.js';

import { operationFromCommand } from '../../src/simulation/index.js';

import { createStarterFlowgridState } from '../../src/content/index.js';
import { createTestIds } from '../helpers/fixtures.js';

const NOW: IsoDateTimeString = '2026-01-01T00:00:00.000Z';

// Plan 01-02 Task 2 tests the SimulationResult shape and event/operation constructors
// without depending on createStarterFlowgridState (Task 3). A cast placeholder stands
// in for FlowgridSnapshot; shape tests do not read state fields.
const placeholderState = {} as import('../../src/domain/index.js').FlowgridSnapshot;

test('SimulationResult shape: applied result carries all required arrays', () => {
  const result: SimulationResult = {
    status: 'applied',
    previousState: placeholderState,
    nextState: placeholderState,
    economyEvents: [],
    visualEvents: [],
    operations: [],
    validationIssues: [],
  };

  expect(result.status).toBe('applied');
  expect(Array.isArray(result.economyEvents)).toBe(true);
  expect(Array.isArray(result.visualEvents)).toBe(true);
  expect(Array.isArray(result.operations)).toBe(true);
  expect(Array.isArray(result.validationIssues)).toBe(true);
});

test('SimulationResult shape: rejected result preserves state and emits no events', () => {
  const result: SimulationResult = {
    status: 'rejected',
    previousState: placeholderState,
    nextState: placeholderState,
    economyEvents: [],
    visualEvents: [],
    operations: [],
    validationIssues: [
      { code: 'negative_resource', severity: 'error', message: 'shape-only' },
    ],
  };

  expect(result.status).toBe('rejected');
  expect(result.nextState).toBe(placeholderState);
  expect(result.economyEvents).toEqual([]);
  expect(result.operations).toEqual([]);
  expect(result.validationIssues.length).toBe(1);
});

test('SimulationResult shape: not_implemented result preserves state with empty arrays', () => {
  const result: SimulationResult = {
    status: 'not_implemented',
    previousState: placeholderState,
    nextState: placeholderState,
    economyEvents: [],
    visualEvents: [],
    operations: [],
    validationIssues: [],
  };

  expect(result.status).toBe('not_implemented');
  expect(result.nextState).toBe(placeholderState);
  expect(result.economyEvents).toEqual([]);
  expect(result.visualEvents).toEqual([]);
  expect(result.operations).toEqual([]);
  expect(result.validationIssues).toEqual([]);
});

test('EconomyEvent constructors produce events with stable types', () => {
  const events: readonly EconomyEvent[] = [
    focusSessionCompletedEvent(NOW, 'session-1', 'cell-1', 1500),
    currentGeneratedEvent(NOW, 'cell-1', 50),
    cellXpGainedEvent(NOW, 'cell-1', 25),
    bloomFiredEvent(NOW, 'cell-1', '2026-01-01'),
    cellActivatedEvent(NOW, 'cell-1', 1),
    currentRoutedToCoreEvent(NOW, 'route-1', 'cell-1', 'core-1', 50),
    coreCurrentConvertedEvent(NOW, 'core-1', 30, 30),
    coreChargeStoredEvent(NOW, 'core-1', 20, 20),
    stateValidatedEvent(NOW, 'client-1', 0),
  ];

  const expectedTypes = [
    ECONOMY_EVENT_NAMES.focusSessionCompleted,
    ECONOMY_EVENT_NAMES.currentGenerated,
    ECONOMY_EVENT_NAMES.cellXpGained,
    ECONOMY_EVENT_NAMES.bloomFired,
    ECONOMY_EVENT_NAMES.cellActivated,
    ECONOMY_EVENT_NAMES.currentRoutedToCore,
    ECONOMY_EVENT_NAMES.coreCurrentConverted,
    ECONOMY_EVENT_NAMES.coreChargeStored,
    ECONOMY_EVENT_NAMES.stateValidated,
  ];

  expect(events.map((e) => e.type)).toEqual(expectedTypes);
  for (const event of events) {
    expect(typeof event.at).toBe('string');
    expect(typeof event.entityId).toBe('string');
  }
});

test('VisualEvent constructors produce events with stable types', () => {
  const events: readonly VisualEvent[] = [
    focusSessionStartedVisual(NOW, 'cell-1'),
    currentFlowVisual(NOW, 'route-1', 50),
    bloomBurstVisual(NOW, 'cell-1'),
    cellActivationVisual(NOW, 'cell-1'),
    coreConvertVisual(NOW, 'core-1', 30),
    coreChargeStoreVisual(NOW, 'core-1', 20),
  ];

  const expectedTypes = [
    VISUAL_EVENT_NAMES.focusSessionStartedVisual,
    VISUAL_EVENT_NAMES.currentFlowVisual,
    VISUAL_EVENT_NAMES.bloomBurstVisual,
    VISUAL_EVENT_NAMES.cellActivationVisual,
    VISUAL_EVENT_NAMES.coreConvertVisual,
    VISUAL_EVENT_NAMES.coreChargeStoreVisual,
  ];

  expect(events.map((e) => e.type)).toEqual(expectedTypes);
});

test('operationFromCommand carries stable command-supplied operation ID', () => {
  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: 'client-1:op:focus-1',
    cellId: 'cell-1',
    startedAt: NOW,
    endedAt: NOW,
    durationSeconds: 1500,
  };

  const op = operationFromCommand(command, NOW, { entityId: 'session-1', payload: { foo: 1 } });

  expect(op.id).toBe(command.operationId);
  expect(op.commandType).toBe('complete_focus_session');
  expect(op.entityType).toBe('session');
  expect(op.entityId).toBe('session-1');
  expect(op.payloadVersion).toBe(1);
  expect(op.createdAt).toBe(NOW);
  expect(op.updatedAt).toBe(NOW);
  expect(op.status).toBe('applied');
  expect(op.payload).toEqual({ foo: 1 });
});

test('createStarterFlowgridState: deterministic for identical input params', () => {
  const ids = createTestIds('determinism');
  const params = {
    now: NOW,
    localDate: '2026-01-01',
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
  };

  const a = createStarterFlowgridState(params);
  const b = createStarterFlowgridState(params);

  expect(a).toEqual(b);
});

test('createStarterFlowgridState: produces one Cell, one Core, four starter module instances, and a default route', () => {
  const ids = createTestIds('starter-shape');
  const state = createStarterFlowgridState({
    now: NOW,
    localDate: '2026-01-01',
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

  expect(state.cells.size).toBe(1);
  expect(state.cells.get(ids.cellId)?.name).toBe('Starter Cell');
  expect(state.core.id).toBe(ids.coreId);
  expect(state.core.convertAllocationPercent + state.core.storeAllocationPercent).toBe(100);
  expect(state.moduleInstances.size).toBe(4);
  expect([...state.moduleInstances.values()].map((m) => m.definitionId).sort()).toEqual([
    'flowgrid:module-definition:bloom',
    'flowgrid:module-definition:charge-core',
    'flowgrid:module-definition:generator',
    'flowgrid:module-definition:output',
  ]);
  expect(state.routes.size).toBe(1);
  expect(state.sessions).toEqual([]);
  expect(state.operations).toEqual([]);
  expect(state.forgeHistory).toEqual([]);
});
