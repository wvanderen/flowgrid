// Phase 1 economy formulas as integer constants and pure functions.
//
// Per AGENTS.md: durable economy values are integers. Allocation splits use integer
// percent and integer multiplication before floor division so the same inputs always
// produce the same outputs (D-08 exact replay).

import type { IntNonNegative, IntPercent, IntSeconds } from '../domain/index.js';

export const CURRENT_PER_SECOND = 1;
export const XP_PER_MINUTE = 1;
export const SECONDS_PER_MINUTE = 60;

export const DEFAULT_SESSION_LENGTH_SECONDS: IntSeconds = 1500;
export const DEFAULT_DAILY_TARGET_SECONDS: IntSeconds = 1800;
export const DEFAULT_DAILY_MILESTONE_TARGET_SECONDS: IntSeconds = 1500;
export const DEFAULT_LOCAL_DAY_BOUNDARY = '00:00';

export const DEFAULT_CONVERT_ALLOCATION_PERCENT: IntPercent = 50;
export const DEFAULT_STORE_ALLOCATION_PERCENT: IntPercent = 50;
export const ALLOCATION_TOTAL_PERCENT: IntPercent = 100;

// D-15 / SIM-07: when a Cell is Activated today (lastBloomLocalDate === env.localDate),
// complete_focus_session generates extra Current equal to
//   Math.floor(baseCurrent * ACTIVATION_CURRENT_BONUS_PERCENT / 100).
// XP is NOT bonused. Content-tunable (CONTEXT.md).
export const ACTIVATION_CURRENT_BONUS_PERCENT: IntPercent = 10;

export const CORE_CONVERT_RATE = 1;
export const CORE_STORE_RATE = 1;

export const STARTER_CELL_NAME = 'Starter Cell';

export function focusToCurrent(durationSeconds: IntSeconds): IntNonNegative {
  if (durationSeconds <= 0) return 0;
  return Math.floor(durationSeconds * CURRENT_PER_SECOND);
}

export function focusToXp(durationSeconds: IntSeconds): IntNonNegative {
  if (durationSeconds <= 0) return 0;
  return Math.floor(durationSeconds / SECONDS_PER_MINUTE) * XP_PER_MINUTE;
}

export function isDailyMilestoneComplete(
  progressSeconds: IntSeconds,
  targetSeconds: IntSeconds,
): boolean {
  return progressSeconds >= targetSeconds;
}

export type CoreCurrentSplit = {
  readonly energy: IntNonNegative;
  readonly coreCharge: IntNonNegative;
  readonly leftover: IntNonNegative;
};

// Integer split with no drift: multiply first, floor once. Any remainder that does
// not divide evenly into either side is reported as `leftover` and discarded from
// the durable split (Phase 1 has no partial-Current storage).
export function splitCoreCurrent(
  current: IntNonNegative,
  convertPercent: IntPercent,
  storePercent: IntPercent,
): CoreCurrentSplit {
  if (current <= 0) return { energy: 0, coreCharge: 0, leftover: 0 };
  const energy = Math.floor((current * convertPercent * CORE_CONVERT_RATE) / ALLOCATION_TOTAL_PERCENT);
  const coreCharge = Math.floor((current * storePercent * CORE_STORE_RATE) / ALLOCATION_TOTAL_PERCENT);
  const leftover = current - energy - coreCharge;
  return { energy, coreCharge, leftover: Math.max(0, leftover) };
}
