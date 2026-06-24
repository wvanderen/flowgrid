// nextUsefulAction — pure selectors/content helper (SESS-05, CONTEXT Agent's
// Discretion line 50).
//
// Returns a small, deterministic "next useful action" string for a Cell given its
// current per-day state and the effective local date. This is NOT an AI suggestion
// — it is a pure value-in/value-out function so it is unit-testable without React
// and exactly replayable. The string is shown at the bottom of SessionSummary.
//
// Priority:
//   1. Bloomed today (Activated)        → bonus-Current hint + day-reset boundary
//   2. Milestone incomplete, not bloomed → "N more minutes to bloom today"
//   3. Milestone complete, not bloomed   → "Bloom is ready"
//
// The day-reset boundary is folded into the Activated message so the user knows
// when the per-day state rolls over (D-16 localDayBoundary).

import type { CellRecord, SettingsRecord } from '../../domain/index.js';
import { ACTIVATION_CURRENT_BONUS_PERCENT } from '../../content/index.js';

export function nextUsefulAction(
  cell: CellRecord,
  settings: SettingsRecord,
  localDate: string,
): string {
  const bloomedToday = cell.lastBloomLocalDate === localDate;
  const milestoneComplete =
    cell.dailyMilestoneProgressSeconds >= cell.dailyMilestoneTargetSeconds;

  if (bloomedToday) {
    return `Activated — +${ACTIVATION_CURRENT_BONUS_PERCENT}% Current until the day resets at ${settings.localDayBoundary}`;
  }

  if (!milestoneComplete) {
    const remainingSeconds = Math.max(
      0,
      cell.dailyMilestoneTargetSeconds - cell.dailyMilestoneProgressSeconds,
    );
    // Round up so a partial minute still reads as "1 more minute".
    const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
    return `${remainingMinutes} more minutes to bloom today`;
  }

  // Milestone complete but Bloom has not fired today — ready to Bloom.
  return 'Bloom is ready';
}
