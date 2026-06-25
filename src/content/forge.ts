// Phase 5 Module Forge constants and pure helpers (D-02, D-04, D-05, A4, A5).
//
// All values are content-tunable (SPEC Constraints / Tunability) and live here, not
// hardcoded inside command handlers or systems. Integer discipline (Pitfall 4): every
// durable economy value is integer-safe — multiply-then-floor only, NEVER floats,
// NEVER Math.round. The Energy cost curve and per-level bonus table are derived from
// persisted monotonic counters / levels so they can never diverge from truth.
//
// D-02: Token roll = fixed 1 Module Token; Energy roll = lifetime-escalating cost
//   FORGE_ENERGY_BASE + forgeCount × FORGE_ENERGY_STEP, driven by the EXISTING monotonic
//   CoreRecord.forgeCount (no new counter, no per-day reset, no prestige reset).
// D-04: All four starter modules gain a per-level effect read by their owning system.
//   MODULE_LEVEL_BONUS is keyed by ModuleDefinitionKind. Generator/Charge Core/Output
//   carry percent magnitudes (applied via integer (100 + level*bonus)/100 multiply-
//   then-floor); Bloom carries a flat +1-per-level magnitude (added directly to the
//   Bloom activation/momentum increment).
// D-05: MODULE_MAX_LEVEL caps each module instance. The forge reveal filters out maxed
//   modules so the 3 choices are always useful.

import type { ModuleDefinitionKind } from '../domain/index.js';

// D-02 Energy cost curve. Base 50, step 25 → first roll costs 50, then 75, 100, ...
// forgeCount never resets (PROJECT.md prestige rule), so Energy intentionally prices
// out over a lifetime, keeping Token rolls relevant as the "guaranteed agency" path.
export const FORGE_ENERGY_BASE = 50;
export const FORGE_ENERGY_STEP = 25;

// D-05 per-module level cap. The forge reveal filters modules whose level >= this.
// run_forge rejects with 'slot_at_capacity' if the target is already at the cap.
export const MODULE_MAX_LEVEL = 3;

// D-04 / A5 per-level magnitudes by module kind.
//   generator / charge_core / output → percent magnitudes (multiply-then-floor by
//     (100 + level * MAGNITUDE) / 100 in their owning system)
//   bloom → flat magnitude (added directly as +MAGNITUDE per level to the Bloom
//     activation/momentum increment — NOT a percent, NOT feeding activationBonusPercent)
// A1/A2/A3 (RESEARCH Open Question #1) are resolved as the least-invasive
// interpretations: Charge Core boosts store-side rate, Output boosts routed amount,
// Bloom grants more activation/momentum — none add new model fields or break the
// 100-sum allocation cap. See system files for the exact wiring comments.
export const MODULE_LEVEL_BONUS: Readonly<Record<ModuleDefinitionKind, number>> = {
  generator: 10,
  charge_core: 10,
  output: 10,
  bloom: 1,
};

// D-02: pure integer Energy cost for the next forge roll given the current lifetime
// forgeCount. Integer-safe (BASE + forgeCount * STEP). Never persists a "next cost"
// field — callers always derive from the persisted counter (Don't-Hand-Roll).
export function forgeEnergyCost(forgeCount: number): number {
  return FORGE_ENERGY_BASE + forgeCount * FORGE_ENERGY_STEP;
}

// D-04: effective per-level bonus magnitude for a given module kind and level.
// Returns level * MODULE_LEVEL_BONUS[kind]. For generator/charge_core/output this is
// the percent boost (e.g. generator level 2 → 20 → multiply base by 120/100); for
// bloom it is the flat extra activation/momentum per level (level 2 → 2). Level 0
// always returns 0 (Pitfall 6 backward-compat — Phase 1-4 tests stay byte-identical).
export function moduleLevelBonus(kind: ModuleDefinitionKind, level: number): number {
  return level * MODULE_LEVEL_BONUS[kind];
}
