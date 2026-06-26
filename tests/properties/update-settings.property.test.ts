// Property: update_settings invariants (VER-02 extension for Phase 6).
//
// Property-based invariant checks across generated settings inputs. Asserts after
// every applied OR rejected update_settings:
//   - well-formed inputs always apply with a SettingsRecord matching the command
//   - D-12 durability: existing Cells' dailyMilestoneTargetSeconds never change
//   - rejection cleanliness: invalid inputs leave nextState === previousState and
//     operations empty
// Mirrors the structure of forge-safety.property.test.ts (Phase 5).

import fc from 'fast-check';
import { expect, test } from 'vitest';

import type { FlowgridSnapshot, UpdateSettingsCommand } from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';

const NOW = '2026-01-04T14:00:00.000Z';
const LOCAL_DATE = '2026-01-04';

// Well-formed settings: positive integers + HH:MM boundary + boolean reduceMotion.
const wellFormedArb = fc.record({
  defaultSessionLengthSeconds: fc.integer({ min: 1, max: 7200 }),
  dailyTargetSeconds: fc.integer({ min: 1, max: 14400 }),
  localDayBoundary: fc
    .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
    .map(([hh, mm]) => `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`),
  reduceMotion: fc.boolean(),
});

// Invalid settings: non-positive / non-integer lengths OR malformed boundary.
const invalidArb = fc.oneof(
  fc.record({
    defaultSessionLengthSeconds: fc.integer({ min: -1000, max: 0 }),
    dailyTargetSeconds: fc.integer({ min: 1, max: 14400 }),
    localDayBoundary: fc.constant('00:00'),
    reduceMotion: fc.boolean(),
  }),
  fc.record({
    defaultSessionLengthSeconds: fc.nat({ max: 7200 }).map((n) => n + 0.5),
    dailyTargetSeconds: fc.integer({ min: 1, max: 14400 }),
    localDayBoundary: fc.constant('00:00'),
    reduceMotion: fc.boolean(),
  }),
  fc.record({
    defaultSessionLengthSeconds: fc.integer({ min: 1, max: 7200 }),
    dailyTargetSeconds: fc.integer({ min: 1, max: 14400 }),
    localDayBoundary: fc.string({ minLength: 1 }).filter((s) => !/^\d{2}:\d{2}$/.test(s)),
    reduceMotion: fc.boolean(),
  }),
);

test('update_settings with well-formed input always applies with matching settings', () => {
  fc.assert(
    fc.property(wellFormedArb, (input) => {
      const { ids, state } = buildStarterSnapshot('settings-prop-well');
      const seeded: FlowgridSnapshot = { ...state };
      const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'settings-prop-well' });
      const command: UpdateSettingsCommand = {
        type: 'update_settings',
        operationId: `${ids.clientId}:op:prop-well`,
        ...input,
      };

      const result = runSimulationCommand(seeded, command, env);

      expect(result.status).toBe('applied');
      expect(result.nextState.settings.defaultSessionLengthSeconds).toBe(input.defaultSessionLengthSeconds);
      expect(result.nextState.settings.dailyTargetSeconds).toBe(input.dailyTargetSeconds);
      expect(result.nextState.settings.localDayBoundary).toBe(input.localDayBoundary);
      expect(result.nextState.settings.reduceMotion).toBe(input.reduceMotion);
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]?.entityType).toBe('settings');
    }),
    { numRuns: 100 },
  );
});

test('update_settings never back-fills existing Cells dailyMilestoneTargetSeconds (D-12 durability)', () => {
  fc.assert(
    fc.property(wellFormedArb, (input) => {
      const { ids, state } = buildStarterSnapshot('settings-prop-d12');
      const seeded: FlowgridSnapshot = { ...state };
      const before = [...seeded.cells.values()].map((c) => [c.id, c.dailyMilestoneTargetSeconds] as const);
      const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'settings-prop-d12' });
      const command: UpdateSettingsCommand = {
        type: 'update_settings',
        operationId: `${ids.clientId}:op:prop-d12`,
        ...input,
      };

      const result = runSimulationCommand(seeded, command, env);

      expect(result.status).toBe('applied');
      for (const [cellId, target] of before) {
        expect(result.nextState.cells.get(cellId)?.dailyMilestoneTargetSeconds).toBe(target);
      }
    }),
    { numRuns: 100 },
  );
});

test('update_settings with invalid input is rejected cleanly (state unchanged, no operations)', () => {
  fc.assert(
    fc.property(invalidArb, (input) => {
      const { ids, state } = buildStarterSnapshot('settings-prop-invalid');
      const seeded: FlowgridSnapshot = { ...state };
      const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'settings-prop-invalid' });
      const command: UpdateSettingsCommand = {
        type: 'update_settings',
        operationId: `${ids.clientId}:op:prop-invalid`,
        ...input,
      };

      const result = runSimulationCommand(seeded, command, env);

      expect(result.status).toBe('rejected');
      expect(result.nextState).toEqual(seeded);
      expect(result.operations).toEqual([]);
      expect(result.validationIssues.some((i) => i.code === 'invalid_operation_shape')).toBe(true);
    }),
    { numRuns: 100 },
  );
});
