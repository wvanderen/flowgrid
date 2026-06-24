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

// --- Phase 4: Rejuvenation + Integration threshold + Activation boost constants ---
// All values are content-tunable (SPEC Constraints / Tunability) and live here, not
// hardcoded inside command handlers. Integer discipline: the 1.5 ratio is a multiplier
// inside Math.floor only — the float never persists.

// REJ-01 (amended): duration-gated Charge processing rate.
export const REJUVENATION_CHARGE_PER_MINUTE = 10;

// REJ-04: geometric Integration -> Module-Token threshold curve. Each threshold is
// Math.floor(BASE * RATIO^n). Sequence: 50, 75, 112, 168, 252, ...
export const INTEGRATION_THRESHOLD_BASE = 50;
export const INTEGRATION_THRESHOLD_RATIO = 1.5;

// CORE-06: Activation-bonus upgrade (cap 3, scaling Energy cost, +5% per level).
export const ACTIVATION_BOOST_PER_LEVEL = 5;
export const ACTIVATION_BOOST_MAX_LEVEL = 3;
// Energy cost to purchase level 1, 2, 3 (index = current level).
export const ACTIVATION_BOOST_COSTS = [50, 100, 200] as const;

// REJ-04: derive the next Integration threshold from the monotonic moduleTokens
// counter (Don't-Hand-Roll — never persist a nextThreshold field, it cannot drift).
// Bounded because each grant increments moduleTokens, which advances the threshold.
//
// The curve is the iterative geometric sequence floor(prev * RATIO): 50, 75, 112, 168,
// 252, ... Each step floors BEFORE multiplying the next, so the .5 fractional loss
// compounds — this is what yields the documented 252 (not 253) at the 5th threshold.
// The naive closed form floor(BASE * RATIO^n) would give 253 because it preserves the
// fraction across exponents; the iterative floor matches the SPEC-mandated sequence.
export function nextIntegrationThreshold(moduleTokens: number): number {
  let threshold = INTEGRATION_THRESHOLD_BASE;
  for (let i = 0; i < moduleTokens; i++) {
    threshold = Math.floor(threshold * INTEGRATION_THRESHOLD_RATIO);
  }
  return threshold;
}

// CORE-06: Energy cost to advance from `currentLevel` to the next, or null when at
// cap (level >= ACTIVATION_BOOST_MAX_LEVEL).
export function activationBoostCost(currentLevel: number): number | null {
  return currentLevel < ACTIVATION_BOOST_COSTS.length
    ? ACTIVATION_BOOST_COSTS[currentLevel]!
    : null;
}

// CORE-06: effective Activation Current bonus percent for a level. Derived from the
// persisted level so it can never diverge from truth. 10/15/20/25 for levels 0/1/2/3.
export function activationBonusPercent(level: number): number {
  return ACTIVATION_CURRENT_BONUS_PERCENT + level * ACTIVATION_BOOST_PER_LEVEL;
}

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
