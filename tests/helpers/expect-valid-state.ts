// State validity helper for Phase 1.
// Plan 01-03 Task 2 wires this to validateFlowgridSnapshot once the validator exists;
// until then, it asserts only the structural basics needed by the foundation-loop test.

import { expect } from 'vitest';

import type { FlowgridSnapshot } from '../../src/domain/index.js';
import { validateFlowgridSnapshot } from '../../src/domain/index.js';

export function expectValidState(state: FlowgridSnapshot): void {
  expect(state, 'FlowgridSnapshot must be defined').toBeDefined();
  expect(state.core, 'FlowgridSnapshot.core must be defined').toBeDefined();
  expect(state.cells, 'FlowgridSnapshot.cells must be defined').toBeInstanceOf(Map);
  expect(state.moduleInstances, 'FlowgridSnapshot.moduleInstances must be defined').toBeInstanceOf(Map);
  expect(state.routes, 'FlowgridSnapshot.routes must be defined').toBeInstanceOf(Map);
  expect(state.core.energy, 'core.energy must be a non-negative integer')
    .toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(state.core.energy)).toBe(true);
  expect(state.core.coreCharge, 'core.coreCharge must be a non-negative integer')
    .toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(state.core.coreCharge)).toBe(true);

  // Plan 01-03: snapshot validators are now implemented, so a clean snapshot must
  // produce zero issues.
  const issues = validateFlowgridSnapshot(state);
  expect(issues, issues.map((i) => `${i.code}: ${i.message}`).join('\n')).toEqual([]);
}
