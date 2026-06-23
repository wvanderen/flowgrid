// VER-03 / D-07: synthetic migration-fixture harness tests.
//
// Registers synthetic fixtures proving the harness exercises field-transform
// upgrades, PLUS the real v1->v2 cell migration (D-10). The harness itself
// (migration-harness.ts) stays unchanged.

import { describe } from 'vitest';

import { runMigrationFixture } from './migration-harness.js';
import { upgradeCellsV1ToV2 } from '../../src/persistence/database.js';

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

// --- Real D-10 v1 -> v2 cell fixtures (Phase 3) -------------------------------
// The real upgrade transform (upgradeCellsV1ToV2) is extracted from database.ts
// so the harness can exercise it without a live IndexedDB connection. A v1 cell
// carries none of color/icon/archivedAt/activeSessionStartedAt; the upgrade must
// default all four. Existing fields (including economy fields) must be untouched.
describe('D-10 v1 -> v2 cell migration (upgradeCellsV1ToV2)', () => {
  interface V1Cell {
    readonly id: string;
    readonly name: string;
    readonly xp: number;
    readonly current: number;
    readonly charge: number;
    readonly momentum: number;
    readonly activation: number;
    readonly dailyMilestoneProgressSeconds: number;
    readonly dailyMilestoneTargetSeconds: number;
    readonly lastBloomLocalDate: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
  }

  const v1Cell: V1Cell = {
    id: 'real-migration:cell',
    name: 'Old Cell',
    xp: 250,
    current: 0,
    charge: 0,
    momentum: 3,
    activation: 7,
    dailyMilestoneProgressSeconds: 900,
    dailyMilestoneTargetSeconds: 1500,
    lastBloomLocalDate: '2026-01-01',
    createdAt: '2025-12-31T00:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
  };

  runMigrationFixture<V1Cell, Record<string, unknown>>({
    description: 'defaults color/icon/archivedAt/activeSessionStartedAt on a v1 cell',
    input: v1Cell,
    upgrade: (old) => upgradeCellsV1ToV2({ ...old }),
    expected: {
      ...v1Cell,
      color: '#6b7280',
      icon: null,
      archivedAt: null,
      activeSessionStartedAt: null,
    },
  });

  runMigrationFixture<V1Cell, Record<string, unknown>>({
    description: 'preserves existing economy fields (momentum, activation, xp) unchanged',
    input: v1Cell,
    upgrade: (old) => upgradeCellsV1ToV2({ ...old }),
    expected: {
      id: 'real-migration:cell',
      name: 'Old Cell',
      xp: 250,
      current: 0,
      charge: 0,
      momentum: 3,
      activation: 7,
      dailyMilestoneProgressSeconds: 900,
      dailyMilestoneTargetSeconds: 1500,
      lastBloomLocalDate: '2026-01-01',
      createdAt: '2025-12-31T00:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      color: '#6b7280',
      icon: null,
      archivedAt: null,
      activeSessionStartedAt: null,
    },
  });
});
