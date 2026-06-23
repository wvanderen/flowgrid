// Current generation system.
//
// Pure functions that turn focus duration into integer Current and XP using the
// content-side formulas. No mutation, no side effects.

import { focusToCurrent, focusToXp } from '../../content/index.js';
import type { IntNonNegative, IntSeconds } from '../../domain/index.js';

export function generateCurrent(durationSeconds: IntSeconds): IntNonNegative {
  return focusToCurrent(durationSeconds);
}

export function generateXp(durationSeconds: IntSeconds): IntNonNegative {
  return focusToXp(durationSeconds);
}
