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

export function applyBloom(cell: CellRecord, localDate: LocalDateString): BloomResult {
  if (!shouldFireBloom(cell, localDate)) {
    return { cell, fired: false };
  }
  return {
    cell: {
      ...cell,
      activation: cell.activation + 1,
      lastBloomLocalDate: localDate,
    },
    fired: true,
  };
}
