// Property: forge safety (VER-02 extension for Phase 5 run_forge).
//
// Property-based invariant checks for run_forge across generated payment types and
// forgeCount values. Asserts after every applied OR rejected run_forge:
//   - forgeCount is monotonic (applied -> +1; rejected -> unchanged)
//   - moduleTokens and energy stay non-negative
//   - every ModuleInstance.level <= MODULE_MAX_LEVEL (validateModuleLevelCap)
//   - the full snapshot validates via validateFlowgridSnapshot
//   - when applied, command.chosenReward ∈ forgeChoices(prev) (re-derived in-test)
// Mirrors the structure of economy-safety.property.test.ts (Phase 1).

import fc from 'fast-check';
import { expect, test } from 'vitest';

import type { FlowgridSnapshot, RunForgeCommand } from '../../src/domain/index.js';
import { validateFlowgridSnapshot, validateNoNegativeResources } from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import { forgeChoices } from '../../src/simulation/commands/forge-choices.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';

const NOW = '2026-01-04T14:00:00.000Z';
const LOCAL_DATE = '2026-01-04';

// Generator: a payment type plus starting resources sufficient to sometimes afford
// the roll and sometimes not. forgeCount drives the energy cost curve; tokens are
// 0 or 1 so the token path is exercisable.
const commandInputArb = fc.record({
  paymentType: fc.constantFrom<'token' | 'energy'>('token', 'energy'),
  forgeCount: fc.integer({ min: 0, max: 50 }),
  moduleTokens: fc.integer({ min: 0, max: 1 }),
  // Energy spans below-cost, exactly-cost, and above-cost for forgeCount in range.
  // Max energy cost at forgeCount=50 is 50 + 50*25 = 1300, so cap at 1500.
  energy: fc.integer({ min: 0, max: 1500 }),
});

test('run_forge preserves forge-safety invariants across payment types and forgeCount', () => {
  fc.assert(
    fc.property(commandInputArb, (input) => {
      const { ids, state } = buildStarterSnapshot('forge-prop');
      const seeded: FlowgridSnapshot = {
        ...state,
        core: {
          ...state.core,
          moduleTokens: input.moduleTokens,
          energy: input.energy,
          forgeCount: input.forgeCount,
        },
      };
      const env = createTestSimulationEnv({
        now: NOW,
        localDate: LOCAL_DATE,
        seed: `forge-prop-${input.paymentType}-${input.forgeCount}`,
      });

      // Pick a chosen reward from the derived reveal (the same set the handler
      // re-derives). If the reveal is empty (all maxed — not possible with a fresh
      // starter snapshot, but guard anyway) skip by targeting a nonexistent cell,
      // which the handler rejects via invalid_reference.
      const revealed = forgeChoices(seeded);
      const chosenReward =
        revealed.length > 0
          ? { cellId: revealed[0]!.cellId, moduleKind: revealed[0]!.moduleKind }
          : { cellId: 'nonexistent:cell', moduleKind: 'generator' as const };

      const command: RunForgeCommand = {
        type: 'run_forge',
        operationId: `${ids.clientId}:op:prop-${input.paymentType}-${input.forgeCount}`,
        paymentType: input.paymentType,
        chosenReward,
      };

      const result = runSimulationCommand(seeded, command, env);

      // Status is either applied (affordable + valid choice) or rejected.
      expect(result.status === 'applied' || result.status === 'rejected').toBe(true);

      if (result.status === 'applied') {
        // forgeCount monotonic: exactly +1.
        expect(result.nextState.core.forgeCount).toBe(input.forgeCount + 1);
        // The chosen reward MUST have been in the re-derived reveal (TOCTOU holds).
        const wasInReveal = revealed.some(
          (r) => r.cellId === chosenReward.cellId && r.moduleKind === chosenReward.moduleKind,
        );
        expect(wasInReveal).toBe(true);
        // Exactly one forge history row appended, id 1:1 with operationId.
        expect(result.nextState.forgeHistory).toHaveLength(seeded.forgeHistory.length + 1);
        expect(result.nextState.forgeHistory[result.nextState.forgeHistory.length - 1]?.id).toBe(
          command.operationId,
        );
      } else {
        // Rejected -> state byte-identical, nothing durable written.
        expect(result.nextState).toEqual(seeded);
        expect(result.operations).toEqual([]);
        expect(result.nextState.forgeHistory).toHaveLength(seeded.forgeHistory.length);
      }

      // Resource non-negativity holds regardless of applied/rejected.
      expect(result.nextState.core.moduleTokens).toBeGreaterThanOrEqual(0);
      expect(result.nextState.core.energy).toBeGreaterThanOrEqual(0);
      expect(result.nextState.core.forgeCount).toBeGreaterThanOrEqual(input.forgeCount);

      // No negative-resource issues from the dedicated validator.
      const negativeIssues = validateNoNegativeResources(result.nextState);
      expect(negativeIssues, negativeIssues.map((i) => i.message).join('\n')).toEqual([]);

      // Full snapshot validation (includes the new validateModuleLevelCap backstop
      // asserting every ModuleInstance.level <= MODULE_MAX_LEVEL).
      const allIssues = validateFlowgridSnapshot(result.nextState);
      expect(allIssues, allIssues.map((i) => i.message).join('\n')).toEqual([]);
    }),
    { numRuns: 100 },
  );
});
