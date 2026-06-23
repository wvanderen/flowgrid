// Property: Core allocation normalization.
//
// set_core_allocation only accepts integer convert + store pairs that total exactly
// 100 with each side in [0, 100]. Any other input must reject with unchanged state.
// Accepted results always have convert + store === 100 in the next state.

import fc from 'fast-check';
import { expect, test } from 'vitest';

import { runSimulationCommand } from '../../src/simulation/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';

const percentArb = fc.integer({ min: -20, max: 120 });

function isValidAllocation(convert: number, store: number): boolean {
  return (
    Number.isInteger(convert) &&
    Number.isInteger(store) &&
    convert >= 0 &&
    convert <= 100 &&
    store >= 0 &&
    store <= 100 &&
    convert + store === 100
  );
}

test('set_core_allocation accepts only integer totals of exactly 100', () => {
  fc.assert(
    fc.property(percentArb, percentArb, (convert, store) => {
      const { state, ids } = buildStarterSnapshot('alloc');
      const env = createTestSimulationEnv({ seed: 'alloc' });

      const result = runSimulationCommand(
        state,
        {
          type: 'set_core_allocation',
          operationId: `${ids.clientId}:op:alloc-${convert}-${store}`,
          convertAllocationPercent: convert,
          storeAllocationPercent: store,
        },
        env,
      );

      if (isValidAllocation(convert, store)) {
        expect(result.status).toBe('applied');
        expect(result.nextState.core.convertAllocationPercent).toBe(convert);
        expect(result.nextState.core.storeAllocationPercent).toBe(store);
        expect(
          result.nextState.core.convertAllocationPercent + result.nextState.core.storeAllocationPercent,
        ).toBe(100);
      } else {
        expect(result.status).toBe('rejected');
        expect(result.nextState).toEqual(state);
        expect(result.validationIssues.some((i) => i.code === 'invalid_core_allocation_total')).toBe(true);
      }
    }),
    { numRuns: 100 },
  );
});
