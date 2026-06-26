// VER-03 / D-07: synthetic migration-fixture harness tests.
//
// Registers synthetic fixtures proving the harness exercises field-transform
// upgrades, PLUS the real v1->v2 cell migration (D-10). The harness itself
// (migration-harness.ts) stays unchanged.

import { describe } from 'vitest';

import { runMigrationFixture } from './migration-harness.js';
import {
  upgradeCellsV1ToV2,
  upgradeCoresV2ToV3,
  upgradeForgeHistoryV3ToV4,
  upgradeSettingsV4ToV5,
} from '../../src/persistence/database.js';

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

// --- Real Phase 4 v2 -> v3 core fixtures (upgradeCoresV2ToV3) -----------------
// The real upgrade transform (upgradeCoresV2ToV3) is extracted from database.ts
// so the harness can exercise it without a live IndexedDB connection. A v2 core
// carries none of activationBoostLevel / activeRejuvenationStartedAt; the upgrade
// must default both. Existing economy fields must be untouched (Pitfall 6 — level
// 0 produces byte-identical Phase 3 economy output).
describe('v2 -> v3 core migration (upgradeCoresV2ToV3)', () => {
  interface V2Core {
    readonly id: string;
    readonly energy: number;
    readonly coreCharge: number;
    readonly lifetimeEnergy: number;
    readonly integration: number;
    readonly moduleTokens: number;
    readonly convertAllocationPercent: number;
    readonly storeAllocationPercent: number;
    readonly forgeCount: number;
    readonly updatedAt: string;
  }

  const v2Core: V2Core = {
    id: 'real-migration:core',
    energy: 500,
    coreCharge: 120,
    lifetimeEnergy: 1000,
    integration: 48,
    moduleTokens: 2,
    convertAllocationPercent: 60,
    storeAllocationPercent: 40,
    forgeCount: 1,
    updatedAt: '2026-01-01T10:00:00.000Z',
  };

  runMigrationFixture<V2Core, Record<string, unknown>>({
    description: 'defaults activationBoostLevel=0 and activeRejuvenationStartedAt=null on a v2 core',
    input: v2Core,
    upgrade: (old) => upgradeCoresV2ToV3({ ...old }),
    expected: {
      ...v2Core,
      activationBoostLevel: 0,
      activeRejuvenationStartedAt: null,
    },
  });

  runMigrationFixture<V2Core, Record<string, unknown>>({
    description: 'preserves existing economy fields (energy, coreCharge, integration) unchanged',
    input: v2Core,
    upgrade: (old) => upgradeCoresV2ToV3({ ...old }),
    expected: {
      id: 'real-migration:core',
      energy: 500,
      coreCharge: 120,
      lifetimeEnergy: 1000,
      integration: 48,
      moduleTokens: 2,
      convertAllocationPercent: 60,
      storeAllocationPercent: 40,
      forgeCount: 1,
      updatedAt: '2026-01-01T10:00:00.000Z',
      activationBoostLevel: 0,
      activeRejuvenationStartedAt: null,
    },
  });
});

// --- Real Phase 5 v3 -> v4 forgeHistory fixtures (upgradeForgeHistoryV3ToV4) ---
// The real upgrade transform (upgradeForgeHistoryV3ToV4) is extracted from
// database.ts so the harness can exercise it without a live IndexedDB connection.
// The forgeHistory store is EMPTY pre-Phase-5 (the Phase 1 run_forge stub never
// wrote rows), but the schema version still bumps and the transform must still
// exist — the harness proves the sentinel-default behavior on a synthetic v3 row
// (D-09, RESEARCH Pitfall 5).
describe('v3 -> v4 forgeHistory migration (upgradeForgeHistoryV3ToV4)', () => {
  interface V3ForgeHistory {
    readonly id: string;
    readonly forgeCount: number;
    readonly createdAt: string;
  }

  runMigrationFixture<V3ForgeHistory, Record<string, unknown>>({
    description: 'v3 → v4 forgeHistory: fills absent Phase 5 fields with sentinel defaults',
    input: { id: 'test:forge:1', forgeCount: 0, createdAt: '2026-01-01T00:00:00.000Z' },
    upgrade: (old) => upgradeForgeHistoryV3ToV4({ ...old }),
    expected: {
      id: 'test:forge:1',
      forgeCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      paymentType: 'token',
      paymentAmount: 0,
      offeredChoices: [],
      chosenReward: null,
    },
  });
});

// --- Real Phase 6 v4 -> v5 settings fixtures (upgradeSettingsV4ToV5) ---------
// The real upgrade transform (upgradeSettingsV4ToV5) is extracted from database.ts
// so the harness can exercise it without a live IndexedDB. A v4 settings row
// carries none of reduceMotion; the upgrade must default it to false (D-08
// backward-compat — false = animation on, matching the Phase 3 stub behavior). The
// settings store holds a singleton, so one fixture suffices.
describe('v4 -> v5 settings migration (upgradeSettingsV4ToV5)', () => {
  interface V4Settings {
    readonly id: string;
    readonly defaultSessionLengthSeconds: number;
    readonly dailyTargetSeconds: number;
    readonly localDayBoundary: string;
    readonly updatedAt: string;
  }

  const v4Settings: V4Settings = {
    id: 'real-migration:settings',
    defaultSessionLengthSeconds: 1500,
    dailyTargetSeconds: 1800,
    localDayBoundary: '04:00',
    updatedAt: '2026-01-01T10:00:00.000Z',
  };

  runMigrationFixture<V4Settings, Record<string, unknown>>({
    description: 'v4 → v5 settings: defaults reduceMotion=false on a v4 settings row',
    input: v4Settings,
    upgrade: (old) => upgradeSettingsV4ToV5({ ...old }),
    expected: {
      ...v4Settings,
      reduceMotion: false,
    },
  });

  runMigrationFixture<V4Settings, Record<string, unknown>>({
    description: 'v4 → v5 settings: preserves existing fields (defaults, boundary) unchanged',
    input: v4Settings,
    upgrade: (old) => upgradeSettingsV4ToV5({ ...old }),
    expected: {
      id: 'real-migration:settings',
      defaultSessionLengthSeconds: 1500,
      dailyTargetSeconds: 1800,
      localDayBoundary: '04:00',
      updatedAt: '2026-01-01T10:00:00.000Z',
      reduceMotion: false,
    },
  });
});
