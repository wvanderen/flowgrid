// Phase 1 Plan 01-03 Task 2: invariant validator behavior tests.
//
// Each test mutates a valid starter snapshot to introduce exactly one defect and
// asserts that the corresponding validator emits the expected ValidationIssueCode.
// Validators must never silently repair invalid state — they only report.

import { test, expect } from 'vitest';

import {
  validateCoreAllocation,
  validateFlowgridSnapshot,
  validateMonotonicCounters,
  validateNoDuplicateInstalls,
  validateNoNegativeResources,
  validateOperationShape,
  validateReferences,
  validateRouteAllocations,
} from '../../src/domain/index.js';
import type {
  FlowgridSnapshot,
  ModuleInstance,
  RouteRecord,
  SyncOperation,
} from '../../src/domain/index.js';

import { createStarterFlowgridState } from '../../src/content/index.js';
import { createTestIds } from '../helpers/fixtures.js';

const NOW = '2026-01-01T00:00:00.000Z';
const LOCAL_DATE = '2026-01-01';

function buildStarter(): FlowgridSnapshot {
  const ids = createTestIds('validators');
  return createStarterFlowgridState({
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
}

test('starter snapshot validates clean', () => {
  const snapshot = buildStarter();
  const issues = validateFlowgridSnapshot(snapshot);
  expect(issues, issues.map((i) => `${i.code}: ${i.message}`).join('\n')).toEqual([]);
});

test('validateNoNegativeResources emits negative_resource for negative Cell xp', () => {
  const snapshot = buildStarter();
  const cell = [...snapshot.cells.values()][0]!;
  const badCell = { ...cell, xp: -1 };
  const mutated: FlowgridSnapshot = {
    ...snapshot,
    cells: new Map(snapshot.cells).set(cell.id, badCell),
  };
  const issues = validateNoNegativeResources(mutated);
  expect(issues.length).toBeGreaterThan(0);
  expect(issues.every((i) => i.code === 'negative_resource')).toBe(true);
});

test('validateNoNegativeResources emits negative_resource for non-integer Core energy', () => {
  const snapshot = buildStarter();
  const mutated: FlowgridSnapshot = {
    ...snapshot,
    core: { ...snapshot.core, energy: 1.5 },
  };
  const issues = validateNoNegativeResources(mutated);
  expect(issues.length).toBeGreaterThan(0);
  expect(issues.some((i) => i.code === 'negative_resource' && i.path === 'core.energy')).toBe(true);
});

test('validateReferences emits invalid_reference for route targeting unknown Core', () => {
  const snapshot = buildStarter();
  const route = [...snapshot.routes.values()][0]!;
  const badRoute: RouteRecord = { ...route, targetCoreId: 'no-such-core' };
  const mutated: FlowgridSnapshot = {
    ...snapshot,
    routes: new Map(snapshot.routes).set(route.id, badRoute),
  };
  const issues = validateReferences(mutated);
  expect(issues.length).toBeGreaterThan(0);
  expect(issues.some((i) => i.code === 'invalid_reference' && i.entityType === 'route')).toBe(true);
});

test('validateReferences emits invalid_reference for session referencing unknown Cell', () => {
  const snapshot = buildStarter();
  const mutated: FlowgridSnapshot = {
    ...snapshot,
    sessions: [
      ...snapshot.sessions,
      {
        id: 'bad-session',
        cellId: 'no-such-cell',
        startedAt: NOW,
        endedAt: NOW,
        durationSeconds: 60,
        xpGained: 1,
        currentGenerated: 60,
        bloomFired: false,
        activationGranted: false,
        energyGained: 30,
        coreChargeGained: 30,
        createdAt: NOW,
      },
    ],
  };
  const issues = validateReferences(mutated);
  expect(issues.some((i) => i.code === 'invalid_reference' && i.entityType === 'session')).toBe(true);
});

test('validateNoDuplicateInstalls emits duplicate_module_install for repeated slot', () => {
  const snapshot = buildStarter();
  const original = [...snapshot.moduleInstances.values()][0]!;
  const duplicate: ModuleInstance = {
    ...original,
    id: `${original.id}:duplicate`,
  };
  const mutated: FlowgridSnapshot = {
    ...snapshot,
    moduleInstances: new Map(snapshot.moduleInstances).set(duplicate.id, duplicate),
  };
  const issues = validateNoDuplicateInstalls(mutated);
  expect(issues.length).toBeGreaterThan(0);
  expect(issues.every((i) => i.code === 'duplicate_module_install')).toBe(true);
});

test('validateNoDuplicateInstalls emits duplicate_module_install for repeated starter definition', () => {
  const snapshot = buildStarter();
  const original = [...snapshot.moduleInstances.values()][0]!;
  const duplicate: ModuleInstance = {
    ...original,
    id: `${original.id}:dup`,
    installedSlotId: `${original.ownerCellId}:slot:extra`,
  };
  const mutated: FlowgridSnapshot = {
    ...snapshot,
    moduleInstances: new Map(snapshot.moduleInstances).set(duplicate.id, duplicate),
  };
  const issues = validateNoDuplicateInstalls(mutated);
  expect(issues.some((i) => i.code === 'duplicate_module_install')).toBe(true);
});

test('validateRouteAllocations emits invalid_route_allocation for percent > 100', () => {
  const snapshot = buildStarter();
  const route = [...snapshot.routes.values()][0]!;
  const badRoute: RouteRecord = { ...route, allocationPercent: 150 };
  const mutated: FlowgridSnapshot = {
    ...snapshot,
    routes: new Map(snapshot.routes).set(route.id, badRoute),
  };
  const issues = validateRouteAllocations(mutated);
  expect(issues.length).toBeGreaterThan(0);
  expect(issues.every((i) => i.code === 'invalid_route_allocation')).toBe(true);
});

test('validateCoreAllocation emits invalid_core_allocation_total when sum != 100', () => {
  const snapshot = buildStarter();
  const mutated: FlowgridSnapshot = {
    ...snapshot,
    core: { ...snapshot.core, convertAllocationPercent: 40, storeAllocationPercent: 40 },
  };
  const issues = validateCoreAllocation(mutated);
  expect(issues.length).toBeGreaterThan(0);
  expect(issues.every((i) => i.code === 'invalid_core_allocation_total')).toBe(true);
});

test('validateMonotonicCounters emits token_regression when moduleTokens decrease', () => {
  const basePrevious = buildStarter();
  const baseNext = buildStarter();
  const previous: FlowgridSnapshot = {
    ...basePrevious,
    core: { ...basePrevious.core, moduleTokens: 10 },
  };
  const next: FlowgridSnapshot = {
    ...baseNext,
    core: { ...baseNext.core, moduleTokens: 5 },
  };
  const issues = validateMonotonicCounters(previous, next);
  expect(issues.some((i) => i.code === 'token_regression')).toBe(true);
});

test('validateMonotonicCounters emits forge_count_regression when forgeCount decreases', () => {
  const basePrevious = buildStarter();
  const baseNext = buildStarter();
  const previous: FlowgridSnapshot = {
    ...basePrevious,
    core: { ...basePrevious.core, forgeCount: 3 },
  };
  const next: FlowgridSnapshot = {
    ...baseNext,
    core: { ...baseNext.core, forgeCount: 0 },
  };
  const issues = validateMonotonicCounters(previous, next);
  expect(issues.some((i) => i.code === 'forge_count_regression')).toBe(true);
});

test('validateMonotonicCounters emits negative_resource when lifetimeEnergy regresses', () => {
  const basePrevious = buildStarter();
  const baseNext = buildStarter();
  const previous: FlowgridSnapshot = {
    ...basePrevious,
    core: { ...basePrevious.core, lifetimeEnergy: 100 },
  };
  const next: FlowgridSnapshot = {
    ...baseNext,
    core: { ...baseNext.core, lifetimeEnergy: 0 },
  };
  const issues = validateMonotonicCounters(previous, next);
  expect(issues.some((i) => i.code === 'negative_resource' && i.path === 'core.lifetimeEnergy')).toBe(true);
});

test('validateOperationShape emits invalid_operation_shape for operation missing id', () => {
  const badOp: SyncOperation = {
    id: '',
    commandType: 'complete_focus_session',
    entityType: 'session',
    entityId: 'session-1',
    payloadVersion: 1,
    createdAt: NOW,
    updatedAt: NOW,
    status: 'applied',
    payload: null,
  };
  const issues = validateOperationShape([badOp]);
  expect(issues.length).toBeGreaterThan(0);
  expect(issues.every((i) => i.code === 'invalid_operation_shape')).toBe(true);
});

test('validateOperationShape emits invalid_operation_shape for invalid status', () => {
  const badOp: SyncOperation = {
    id: 'op-1',
    commandType: 'complete_focus_session',
    entityType: 'session',
    entityId: 'session-1',
    payloadVersion: 1,
    createdAt: NOW,
    updatedAt: NOW,
    status: 'bogus' as SyncOperation['status'],
    payload: null,
  };
  const issues = validateOperationShape([badOp]);
  expect(issues.some((i) => i.code === 'invalid_operation_shape')).toBe(true);
});

test('validateFlowgridSnapshot composes all validators', () => {
  const snapshot = buildStarter();
  // Introduce multiple defects; the composition must surface at least one issue
  // from each affected validator.
  const cell = [...snapshot.cells.values()][0]!;
  const badCell = { ...cell, xp: -5 };
  const mutated: FlowgridSnapshot = {
    ...snapshot,
    cells: new Map(snapshot.cells).set(cell.id, badCell),
    core: { ...snapshot.core, convertAllocationPercent: 30, storeAllocationPercent: 30 },
  };
  const issues = validateFlowgridSnapshot(mutated);
  const codes = new Set(issues.map((i) => i.code));
  expect(codes.has('negative_resource')).toBe(true);
  expect(codes.has('invalid_core_allocation_total')).toBe(true);
});
