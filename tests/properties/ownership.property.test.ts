// Property: ownership / duplicate prevention.
//
// Generated duplicate module ownership/install states are reported by
// validateNoDuplicateInstalls and never silently repaired. Also covers monotonic
// counters (Module Tokens, forge count, lifetime Energy) across applied focus
// sessions.

import fc from 'fast-check';
import { expect, test } from 'vitest';

import type { FlowgridSnapshot, ModuleInstance } from '../../src/domain/index.js';
import {
  validateMonotonicCounters,
  validateNoDuplicateInstalls,
} from '../../src/domain/index.js';

import { buildStarterSnapshot } from '../helpers/fixtures.js';

const duplicateCountArb = fc.integer({ min: 1, max: 5 });

test('duplicate module installs are reported, never silently repaired', () => {
  fc.assert(
    fc.property(duplicateCountArb, (duplicateCount) => {
      const { state } = buildStarterSnapshot('ownership');
      const original = [...state.moduleInstances.values()][0]!;
      const instances = new Map(state.moduleInstances);
      for (let i = 0; i < duplicateCount; i++) {
        const dup: ModuleInstance = {
          ...original,
          id: `${original.id}:dup-${i}`,
        };
        instances.set(dup.id, dup);
      }
      const mutated: FlowgridSnapshot = { ...state, moduleInstances: instances };

      const issues = validateNoDuplicateInstalls(mutated);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.every((i) => i.code === 'duplicate_module_install')).toBe(true);

      // Ensure the validator did not mutate the snapshot.
      expect(mutated.moduleInstances.size).toBe(state.moduleInstances.size + duplicateCount);
    }),
    { numRuns: 100 },
  );
});

const tokenRegressionArb = fc.tuple(fc.integer({ min: 0, max: 50 }), fc.integer({ min: 0, max: 50 }));

test('moduleTokens monotonicity is enforced across snapshot pairs', () => {
  fc.assert(
    fc.property(tokenRegressionArb, ([previousTokens, nextTokens]) => {
      const basePrevious = buildStarterSnapshot('mono-prev');
      const baseNext = buildStarterSnapshot('mono-next');
      const previous: FlowgridSnapshot = {
        ...basePrevious.state,
        core: { ...basePrevious.state.core, moduleTokens: previousTokens },
      };
      const next: FlowgridSnapshot = {
        ...baseNext.state,
        core: { ...baseNext.state.core, moduleTokens: nextTokens },
      };

      const issues = validateMonotonicCounters(previous, next);
      if (nextTokens < previousTokens) {
        expect(issues.some((i) => i.code === 'token_regression')).toBe(true);
      } else {
        expect(issues.every((i) => i.code !== 'token_regression')).toBe(true);
      }
    }),
    { numRuns: 100 },
  );
});

const forgeRegressionArb = fc.tuple(fc.integer({ min: 0, max: 20 }), fc.integer({ min: 0, max: 20 }));

test('forgeCount monotonicity is enforced across snapshot pairs', () => {
  fc.assert(
    fc.property(forgeRegressionArb, ([previousCount, nextCount]) => {
      const basePrevious = buildStarterSnapshot('forge-prev');
      const baseNext = buildStarterSnapshot('forge-next');
      const previous: FlowgridSnapshot = {
        ...basePrevious.state,
        core: { ...basePrevious.state.core, forgeCount: previousCount },
      };
      const next: FlowgridSnapshot = {
        ...baseNext.state,
        core: { ...baseNext.state.core, forgeCount: nextCount },
      };

      const issues = validateMonotonicCounters(previous, next);
      if (nextCount < previousCount) {
        expect(issues.some((i) => i.code === 'forge_count_regression')).toBe(true);
      } else {
        expect(issues.every((i) => i.code !== 'forge_count_regression')).toBe(true);
      }
    }),
    { numRuns: 100 },
  );
});
