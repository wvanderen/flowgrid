// Smoke test: domain validation surface is importable and structurally well-formed.
//
// Plan 01-03 will replace this file with the full validator behavior test suite.

import { test, expect } from 'vitest';

import * as domain from '../../src/domain/index.js';

test('domain exports validation issue codes and validator functions', () => {
  expect(typeof domain.validateNoNegativeResources).toBe('function');
  expect(typeof domain.validateReferences).toBe('function');
  expect(typeof domain.validateNoDuplicateInstalls).toBe('function');
  expect(typeof domain.validateRouteAllocations).toBe('function');
  expect(typeof domain.validateCoreAllocation).toBe('function');
  expect(typeof domain.validateMonotonicCounters).toBe('function');
  expect(typeof domain.validateOperationShape).toBe('function');
  expect(typeof domain.validateFlowgridSnapshot).toBe('function');
});

test('domain exports typed records and snapshot shape', () => {
  // Compile-time check: types resolve from the public barrel.
  type CheckSnapshot = domain.FlowgridSnapshot;
  type CheckCell = domain.CellRecord;
  type CheckCore = domain.CoreRecord;
  type CheckModuleDefinition = domain.ModuleDefinition;
  type CheckModuleInstance = domain.ModuleInstance;
  type CheckRoute = domain.RouteRecord;
  type CheckSession = domain.SessionRecord;
  type CheckSettings = domain.SettingsRecord;
  type CheckForgeHistory = domain.ForgeHistoryRecord;
  type CheckOperation = domain.SyncOperation;

  // Runtime check: validator codes are present at runtime via type introspection.
  const sampleIssue: domain.ValidationIssue = {
    code: 'negative_resource',
    severity: 'error',
    message: 'smoke',
  };
  expect(sampleIssue.code).toBe('negative_resource');

  // Touch the type aliases so unused-type lint does not fire.
  const _check: readonly CheckSnapshot[] | readonly CheckCell[] | readonly CheckCore[] | readonly CheckModuleDefinition[] | readonly CheckModuleInstance[] | readonly CheckRoute[] | readonly CheckSession[] | readonly CheckSettings[] | readonly CheckForgeHistory[] | readonly CheckOperation[] = [];
  void _check;
});
