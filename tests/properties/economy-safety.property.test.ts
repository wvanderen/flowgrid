// Property: economy safety.
//
// Any valid focus completion must produce non-negative integer resources across
// Cell XP/Current/Charge/Momentum/Activation and Core Energy/Core Charge/lifetime
// Energy/Integration/Module Tokens/forge count.

import fc from 'fast-check';
import { expect, test } from 'vitest';

import type { CompleteFocusSessionCommand } from '../../src/domain/index.js';
import { validateNoNegativeResources, validateFlowgridSnapshot } from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';

const STARTED_AT = '2026-01-01T10:00:00.000Z';
const ENDED_AT = '2026-01-01T11:00:00.000Z';
const LOCAL_DATE = '2026-01-01';

const durationArb = fc.integer({ min: 1, max: 7200 });

test('complete_focus_session preserves non-negative resource invariants', () => {
  fc.assert(
    fc.property(durationArb, (durationSeconds) => {
      const { state, ids } = buildStarterSnapshot('safety');
      const command: CompleteFocusSessionCommand = {
        type: 'complete_focus_session',
        operationId: `${ids.clientId}:op:focus-${durationSeconds}`,
        cellId: ids.cellId,
        startedAt: STARTED_AT,
        endedAt: ENDED_AT,
        durationSeconds,
      };
      const env = createTestSimulationEnv({ now: STARTED_AT, localDate: LOCAL_DATE, seed: 'safety' });

      const result = runSimulationCommand(state, command, env);

      expect(result.status).toBe('applied');
      expect(result.nextState.core.energy).toBeGreaterThanOrEqual(0);
      expect(result.nextState.core.coreCharge).toBeGreaterThanOrEqual(0);
      expect(result.nextState.core.lifetimeEnergy).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result.nextState.core.energy)).toBe(true);
      expect(Number.isInteger(result.nextState.core.coreCharge)).toBe(true);
      expect(Number.isInteger(result.nextState.core.lifetimeEnergy)).toBe(true);

      const negativeIssues = validateNoNegativeResources(result.nextState);
      expect(negativeIssues, negativeIssues.map((i) => i.message).join('\n')).toEqual([]);

      const allIssues = validateFlowgridSnapshot(result.nextState);
      expect(allIssues, allIssues.map((i) => i.message).join('\n')).toEqual([]);
    }),
    { numRuns: 100 },
  );
});
