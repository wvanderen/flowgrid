// Property: rejuvenation economy safety (Pitfalls 3, 4 + cross-type Pitfall 2).
//
// Asserts over random (coreCharge, durationMinutes) inputs that every log_rejuvenation
// result satisfies:
//   - status 'applied'
//   - non-negative resources + full invariant composition clean
//   - integration / moduleTokens monotonic vs previous
//   - chargeConsumed === integrationGained * 2 (Pitfall 3 odd-remainder identity)
//   - chargeConsumed <= coreChargeBefore
//   - tokensGranted >= 0
//
// And a cross-type one-active-session property (Pitfall 2): after each step of a small
// command sequence, AT MOST ONE of (any cell.activeSessionStartedAt,
// core.activeRejuvenationStartedAt) is non-null app-wide.

import fc from 'fast-check';
import { expect, test } from 'vitest';

import type {
  LogRejuvenationCommand,
  StartFocusSessionCommand,
  StartRejuvenationCommand,
} from '../../src/domain/index.js';
import {
  validateNoNegativeResources,
  validateFlowgridSnapshot,
} from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';

const NOW = '2026-01-01T10:00:00.000Z';
const LOCAL_DATE = '2026-01-01';

const chargeArb = fc.integer({ min: 0, max: 10000 });
const minutesArb = fc.integer({ min: 0, max: 600 });

test('log_rejuvenation preserves economy invariants and the Pitfall 3 odd-remainder identity', () => {
  fc.assert(
    fc.property(chargeArb, minutesArb, (coreCharge, durationMinutes) => {
      const { state, ids } = buildStarterSnapshot(`rejuv-safety-${coreCharge}-${durationMinutes}`);
      const seeded = { ...state, core: { ...state.core, coreCharge } };
      const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'rejuv-safety' });

      // Derive a startedAt that gives exactly durationMinutes minutes before NOW.
      const startedAt = new Date(new Date(NOW).getTime() - durationMinutes * 60_000).toISOString();
      const command: LogRejuvenationCommand = {
        type: 'log_rejuvenation',
        operationId: `${ids.clientId}:op:rej-${coreCharge}-${durationMinutes}`,
        startedAt,
        endedAt: NOW,
      };

      const result = runSimulationCommand(seeded, command, env);

      expect(result.status).toBe('applied');

      const negativeIssues = validateNoNegativeResources(result.nextState);
      expect(negativeIssues, negativeIssues.map((i) => i.message).join('\n')).toEqual([]);

      const allIssues = validateFlowgridSnapshot(result.nextState);
      expect(allIssues, allIssues.map((i) => i.message).join('\n')).toEqual([]);

      // Monotonic: integration and moduleTokens never decrease.
      expect(result.nextState.core.integration).toBeGreaterThanOrEqual(seeded.core.integration);
      expect(result.nextState.core.moduleTokens).toBeGreaterThanOrEqual(seeded.core.moduleTokens);

      // Pitfall 3 identity: chargeConsumed === integrationGained * 2.
      const record = result.nextState.rejuvenations[result.nextState.rejuvenations.length - 1]!;
      expect(record.chargeConsumed).toBe(record.integrationGained * 2);
      // Never consume more Charge than existed before.
      expect(record.chargeConsumed).toBeLessThanOrEqual(coreCharge);
      expect(record.tokensGranted).toBeGreaterThanOrEqual(0);
      // Core charge never goes negative.
      expect(result.nextState.core.coreCharge).toBeGreaterThanOrEqual(0);
    }),
    { numRuns: 100 },
  );
});

test('cross-type one-active-session: at most one of (cell focus marker, core rejuvenation marker) is non-null app-wide', () => {
  const { state, ids } = buildStarterSnapshot('rejuv-mutex-prop');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'rejuv-mutex' });

  // A small fixed sequence exercising both session types and their mutual exclusion.
  // Each command either sets a marker (applied) or is rejected; in either case the
  // post-state must satisfy the at-most-one-active-session invariant.
  const startFocus: StartFocusSessionCommand = {
    type: 'start_focus_session',
    operationId: `${ids.clientId}:op:focus-start`,
    cellId: ids.cellId,
  };
  const startRej: StartRejuvenationCommand = {
    type: 'start_rejuvenation',
    operationId: `${ids.clientId}:op:rej-start`,
  };

  // Run start_focus, then try start_rejuvenation (must be rejected because focus is active).
  let current = state;
  const focusResult = runSimulationCommand(current, startFocus, env);
  expect(focusResult.status).toBe('applied');
  current = focusResult.nextState;

  // Invariant check helper.
  const assertAtMostOneActive = (s: typeof state): void => {
    const focusActive = Array.from(s.cells.values()).some((c) => c.activeSessionStartedAt !== null);
    const rejActive = s.core.activeRejuvenationStartedAt !== null;
    // XOR-ish: at most one is true (both false is fine — no active session).
    expect(focusActive && rejActive, 'focus and rejuvenation must not both be active').toBe(false);
  };

  assertAtMostOneActive(current);

  // start_rejuvenation while focus is active -> rejected.
  const rejDuringFocus = runSimulationCommand(current, startRej, env);
  expect(rejDuringFocus.status).toBe('rejected');
  expect(rejDuringFocus.nextState).toEqual(current);
  assertAtMostOneActive(rejDuringFocus.nextState);

  // Symmetric: a fresh state where rejuvenation is active rejects start_focus.
  const { state: freshState } = buildStarterSnapshot('rejuv-mutex-prop-2');
  const startRej2: StartRejuvenationCommand = {
    type: 'start_rejuvenation',
    operationId: `${ids.clientId}:op:rej-start-2`,
  };
  const rejStarted = runSimulationCommand(freshState, startRej2, env);
  expect(rejStarted.status).toBe('applied');
  assertAtMostOneActive(rejStarted.nextState);

  const startFocus2: StartFocusSessionCommand = {
    type: 'start_focus_session',
    operationId: `${ids.clientId}:op:focus-start-2`,
    cellId: ids.cellId,
  };
  const focusDuringRej = runSimulationCommand(rejStarted.nextState, startFocus2, env);
  expect(focusDuringRej.status).toBe('rejected');
  expect(focusDuringRej.nextState).toEqual(rejStarted.nextState);
  assertAtMostOneActive(focusDuringRej.nextState);
});
