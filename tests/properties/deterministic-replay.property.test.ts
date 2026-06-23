// Property: deterministic replay (D-08).
//
// The same starter state, command, injected `now`, `localDate`, RNG seed, and
// operation ID must produce deep-equal nextState, economyEvents, visualEvents,
// operations, and validationIssues.

import fc from 'fast-check';
import { expect, test } from 'vitest';

import type { CompleteFocusSessionCommand } from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';
import { expectReplayEqual } from '../helpers/replay.js';

const STARTED_AT = '2026-01-01T10:00:00.000Z';
const ENDED_AT = '2026-01-01T11:00:00.000Z';
const LOCAL_DATE = '2026-01-01';

const durationArb = fc.integer({ min: 1, max: 7200 });
const operationIdArb = fc
  .string({ minLength: 1, maxLength: 32 })
  .filter((s) => /^[a-zA-Z0-9-_]+$/.test(s))
  .map((s) => `client-1:op:${s}`);
const seedArb = fc.string({ minLength: 1, maxLength: 16 });

test('complete_focus_session replay is exact for identical inputs', () => {
  fc.assert(
    fc.property(durationArb, operationIdArb, seedArb, (durationSeconds, operationId, seed) => {
      const { state } = buildStarterSnapshot('replay');
      const cellId = [...state.cells.keys()][0]!;
      const command: CompleteFocusSessionCommand = {
        type: 'complete_focus_session',
        operationId,
        cellId,
        startedAt: STARTED_AT,
        endedAt: ENDED_AT,
        durationSeconds,
      };
      const envA = createTestSimulationEnv({ now: STARTED_AT, localDate: LOCAL_DATE, seed });
      const envB = createTestSimulationEnv({ now: STARTED_AT, localDate: LOCAL_DATE, seed });

      const a = runSimulationCommand(state, command, envA);
      const b = runSimulationCommand(state, command, envB);

      expectReplayEqual(a, b);
      expect(a.operations[0]?.id).toBe(operationId);
    }),
    { numRuns: 100 },
  );
});
