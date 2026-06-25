// Bloom system.
//
// Determines whether Bloom should fire for a Cell on a given local date and applies
// the Bloom effect (Activation increment + lastBloomLocalDate update). Bloom fires
// at most once per local date per Cell, and only when the daily milestone is
// complete.

import type { CellRecord, LocalDateString } from '../../domain/index.js';
import { isDailyMilestoneComplete } from '../../content/index.js';

export function shouldFireBloom(
  cell: CellRecord,
  localDate: LocalDateString,
): boolean {
  if (cell.lastBloomLocalDate === localDate) return false;
  return isDailyMilestoneComplete(
    cell.dailyMilestoneProgressSeconds,
    cell.dailyMilestoneTargetSeconds,
  );
}

export type BloomResult = {
  readonly cell: CellRecord;
  readonly fired: boolean;
};

export function applyBloom(cell: CellRecord, localDate: LocalDateString, bloomLevel = 0): BloomResult {
  if (!shouldFireBloom(cell, localDate)) {
    return { cell, fired: false };
  }
  // Phase 5 / D-04 A3: Bloom level grants more activation/momentum per Bloom
  // (+1 + bloomLevel instead of +1). bloomLevel=0 is byte-identical to Phase 1-4
  // behavior (Pitfall 6 backward-compat). CRITICAL: this is a DIFFERENT axis from
  // CoreRecord.activationBoostLevel (Phase 4 Energy-sink upgrade) — do NOT feed this
  // into activationBonusPercent (that would conflate two levels, violating D-03 /
  // RESEARCH Pitfall 1 A3). The bonus is applied directly here, not routed through
  // the Activation Current bonus path.
  const bloomBonus = bloomLevel;
  return {
    cell: {
      ...cell,
      activation: cell.activation + 1 + bloomBonus,
      // D-14 / SIM-06: Momentum increments by 1 alongside Activation when Bloom fires.
      // The Momentum-decay half of D-14 lives in day-rollover.ts (reconcileDayRollover).
      momentum: cell.momentum + 1 + bloomBonus,
      lastBloomLocalDate: localDate,
    },
    fired: true,
  };
}
