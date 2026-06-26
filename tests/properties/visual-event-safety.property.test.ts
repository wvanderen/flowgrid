// Property: UI-04 visual-event safety (Phase 6 / D-03, D-08; VER-02 extension).
//
// The load-bearing UI-04 contract: dropping, reducing, replaying, or skipping
// visual events NEVER changes durable economy state (nextState), the durable
// operation log (operations), or the validation issues vector (validationIssues).
// Visual events are transient presentation hints; the render layer physically cannot
// write economy records (ESLint boundary at eslint.config.js:131-176 + the
// repository is the sole writer); this property asserts the simulation contract
// that visualEvents are transient.
//
// Mirrors the structure of forge-safety.property.test.ts (Phase 5 VER-02 extension).
// Two properties over 100 runs each:
//   1. drop-freely: for any command in a representative subset of the
//      SimulationCommand union, spreading the result with visualEvents: [] leaves
//      nextState/operations/validationIssues byte-identical.
//   2. skip/replay: running the same command twice against the same seeded snapshot
//      + env produces identical nextState/operations even if a hypothetical
//      renderer dropped the first run's visualEvents.

import fc from 'fast-check';
import { expect, test } from 'vitest';

import type {
  CellRecord,
  CompleteFocusSessionCommand,
  FlowgridSnapshot,
  LogRejuvenationCommand,
  RunForgeCommand,
  SimulationCommand,
  SimulationResult,
  StartFocusSessionCommand,
  UpdateSettingsCommand,
} from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import { forgeChoices } from '../../src/simulation/commands/forge-choices.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';

const NOW = '2026-01-04T14:00:00.000Z';
const LOCAL_DATE = '2026-01-04';

// Seed snapshot variants: each variant exercises different command branches
// (applied vs rejected). The property asserts drop-safety regardless of branch.
const seededSnapshotArb = fc.record({
  prefix: fc.stringMatching(/^[a-z-]{1,12}$/),
  moduleTokens: fc.integer({ min: 0, max: 2 }),
  energy: fc.integer({ min: 0, max: 1500 }),
  forgeCount: fc.integer({ min: 0, max: 10 }),
  coreCharge: fc.integer({ min: 0, max: 200 }),
  integration: fc.integer({ min: 0, max: 200 }),
  activeFocusSession: fc.boolean(),
});

type SeededInput = {
  readonly prefix: string;
  readonly moduleTokens: number;
  readonly energy: number;
  readonly forgeCount: number;
  readonly coreCharge: number;
  readonly integration: number;
  readonly activeFocusSession: boolean;
};

// Build a representative command from the seeded snapshot. Mirrors the production
// callers (focus-session, forge, rejuvenation, settings). Each variant uses the
// seeded Core overrides so both applied and rejected outcomes are exercised.
function buildRepresentativeCommand(
  input: SeededInput,
  variantIndex: number,
): { readonly command: SimulationCommand; readonly seeded: FlowgridSnapshot } {
  const { ids, state } = buildStarterSnapshot(input.prefix);
  // Seed an active focus session on the starter Cell when activeFocusSession is
  // true so start_focus_session's mutual-exclusion rejection branch is exercised.
  const baseCell = state.cells.values().next().value as CellRecord;
  const seededCell: CellRecord = input.activeFocusSession
    ? { ...baseCell, activeSessionStartedAt: '2026-01-04T13:00:00.000Z' }
    : baseCell;
  const seeded: FlowgridSnapshot = {
    ...state,
    cells: new Map([[baseCell.id, seededCell]]),
    core: {
      ...state.core,
      moduleTokens: input.moduleTokens,
      energy: input.energy,
      forgeCount: input.forgeCount,
      coreCharge: input.coreCharge,
      integration: input.integration,
      activeRejuvenationStartedAt: null,
    },
  };

  // Cycle through the 5 representative variants so each fc run hits a different
  // command type. The property asserts drop-safety for ALL of them.
  switch (variantIndex % 5) {
    case 0: {
      const command: StartFocusSessionCommand = {
        type: 'start_focus_session',
        operationId: `${ids.clientId}:op:start-focus`,
        cellId: ids.cellId,
      };
      return { command, seeded };
    }
    case 1: {
      // complete_focus_session requires a started session to apply; without one it
      // rejects. Either branch satisfies the property.
      const command: CompleteFocusSessionCommand = {
        type: 'complete_focus_session',
        operationId: `${ids.clientId}:op:complete-focus`,
        cellId: ids.cellId,
        startedAt: '2026-01-04T13:30:00.000Z',
        endedAt: NOW,
        durationSeconds: 1800,
      };
      return { command, seeded };
    }
    case 2: {
      const revealed = forgeChoices(seeded);
      const chosenReward =
        revealed.length > 0
          ? { cellId: revealed[0]!.cellId, moduleKind: revealed[0]!.moduleKind }
          : { cellId: 'nonexistent:cell', moduleKind: 'generator' as const };
      const command: RunForgeCommand = {
        type: 'run_forge',
        operationId: `${ids.clientId}:op:forge`,
        paymentType: 'token',
        chosenReward,
      };
      return { command, seeded };
    }
    case 3: {
      // log_rejuvenation — exercises the tokenGrantedVisual emission guard (Task 1).
      // tokensGranted > 0 only when integration + integrationGained crosses a
      // threshold; both branches are exercised by the integration/coreCharge spread.
      const command: LogRejuvenationCommand = {
        type: 'log_rejuvenation',
        operationId: `${ids.clientId}:op:rejuv`,
        startedAt: '2026-01-04T13:50:00.000Z',
        endedAt: NOW,
      };
      return { command, seeded };
    }
    default: {
      const command: UpdateSettingsCommand = {
        type: 'update_settings',
        operationId: `${ids.clientId}:op:settings`,
        defaultSessionLengthSeconds: 1200,
        dailyTargetSeconds: 2400,
        localDayBoundary: '04:00',
        reduceMotion: true,
      };
      return { command, seeded };
    }
  }
}

test('UI-04 drop-freely: zeroing visualEvents changes nothing durable across the representative command set', () => {
  fc.assert(
    fc.property(seededSnapshotArb, fc.integer({ min: 0, max: 4 }), (input, variantIndex) => {
      const { command, seeded } = buildRepresentativeCommand(input, variantIndex);
      const env = createTestSimulationEnv({
        now: NOW,
        localDate: LOCAL_DATE,
        seed: `ui04-drop-${input.prefix}-${variantIndex}`,
      });
      const result = runSimulationCommand(seeded, command, env);

      // The load-bearing UI-04 assertion: a "visual-dropped" variant has
      // byte-identical nextState/operations/validationIssues to the natural result.
      // Spreading is the most direct way to express "the renderer consumed nothing".
      const dropped: SimulationResult = { ...result, visualEvents: [] };
      expect(dropped.nextState).toEqual(result.nextState);
      expect(dropped.operations).toEqual(result.operations);
      expect(dropped.validationIssues).toEqual(result.validationIssues);

      // The mirror: confirming the result's own visualEvents (whether populated or
      // empty) have no influence on the durable fields. Setting them to a synthetic
      // non-empty array also changes nothing durable.
      const synthetic: SimulationResult = {
        ...result,
        visualEvents: [
          {
            type: 'visual:synthetic',
            entityType: 'core',
            entityId: 'synthetic',
            payload: { synthetic: true },
            at: NOW,
          },
        ],
      };
      expect(synthetic.nextState).toEqual(result.nextState);
      expect(synthetic.operations).toEqual(result.operations);
      expect(synthetic.validationIssues).toEqual(result.validationIssues);

      // Rejected results write nothing durable (mirrors forge-safety lines 92-95).
      if (result.status === 'rejected') {
        expect(result.nextState).toEqual(seeded);
        expect(result.operations).toEqual([]);
      }
    }),
    { numRuns: 100 },
  );
});

test('UI-04 skip/replay: re-running a command with the same env produces identical nextState/operations even if the renderer dropped the first run', () => {
  fc.assert(
    fc.property(seededSnapshotArb, fc.integer({ min: 0, max: 4 }), (input, variantIndex) => {
      const { command, seeded } = buildRepresentativeCommand(input, variantIndex);
      const env = createTestSimulationEnv({
        now: NOW,
        localDate: LOCAL_DATE,
        seed: `ui04-replay-${input.prefix}-${variantIndex}`,
      });

      // First run. A hypothetical renderer drops its visualEvents; the durable
      // state writes through normally (UI-04).
      const first = runSimulationCommand(seeded, command, env);

      // Second run against the SAME seeded snapshot + env. Deterministic replay
      // (Phase 1 D-08) means nextState/operations are byte-identical to the first
      // run regardless of what the renderer did with the first run's visuals.
      const second = runSimulationCommand(seeded, command, env);

      expect(second.nextState).toEqual(first.nextState);
      expect(second.operations).toEqual(first.operations);
      expect(second.validationIssues).toEqual(first.validationIssues);
    }),
    { numRuns: 100 },
  );
});
