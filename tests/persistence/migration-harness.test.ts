// VER-03 / D-07: synthetic migration-fixture harness tests.
//
// Registers synthetic fixtures proving the harness exercises field-transform
// upgrades. This file is designed for reuse by the real v1->v2 migration: when a
// real migration arrives, add real fixtures (constructed from actual v1 records and
// the real upgrade function) alongside these synthetic ones. The harness itself
// (migration-harness.ts) stays unchanged.
//
// Phase 2 ships NO forward-looking v2 stub Dexie schema (grep-verified: src/
// declares only version(1)).

import { describe } from 'vitest';

import { runMigrationFixture } from './migration-harness.js';

describe('migration-fixture harness', () => {
  // Fixture 1: field rename. Synthetic "v0" CellRecord used `milestoneProgress`
  // (seconds); the upgrade renames it to `dailyMilestoneProgressSeconds`. This is
  // the canonical field-transform pattern a real v1->v2 migration would apply.
  interface V0CellMilestone {
    readonly id: string;
    readonly milestoneProgress: number;
  }
  interface V1CellMilestone {
    readonly id: string;
    readonly dailyMilestoneProgressSeconds: number;
  }
  runMigrationFixture<V0CellMilestone, V1CellMilestone>({
    description: 'renames milestoneProgress -> dailyMilestoneProgressSeconds',
    input: { id: 'cell:1', milestoneProgress: 900 },
    upgrade: (old) => ({
      id: old.id,
      dailyMilestoneProgressSeconds: old.milestoneProgress,
    }),
    expected: { id: 'cell:1', dailyMilestoneProgressSeconds: 900 },
  });

  // Fixture 2: defaulted-field addition. A real v2 often adds a new field that did
  // not exist in v1; the upgrade fills a default value. This proves the harness
  // exercises that transform too.
  interface V0Settings {
    readonly id: string;
    readonly defaultSessionLengthSeconds: number;
  }
  interface V1Settings {
    readonly id: string;
    readonly defaultSessionLengthSeconds: number;
    readonly dailyTargetSeconds: number;
  }
  runMigrationFixture<V0Settings, V1Settings>({
    description: 'adds dailyTargetSeconds with a default value when missing',
    input: { id: 'settings:1', defaultSessionLengthSeconds: 1500 },
    upgrade: (old) => ({
      id: old.id,
      defaultSessionLengthSeconds: old.defaultSessionLengthSeconds,
      dailyTargetSeconds: 3600,
    }),
    expected: { id: 'settings:1', defaultSessionLengthSeconds: 1500, dailyTargetSeconds: 3600 },
  });
});
