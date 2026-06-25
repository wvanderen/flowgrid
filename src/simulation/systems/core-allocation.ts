// Core allocation system.
//
// Applies the Core convert/store split to incoming Current. Uses integer math with
// floor-once semantics (no drift). The returned CoreRecord has updated Energy,
// Core Charge, and lifetime Energy. Phase 1 does not decrement Module Tokens or
// forge count here; those are owned by their respective commands.

import type { CoreRecord, IntNonNegative, IntPercent } from '../../domain/index.js';
import { MODULE_LEVEL_BONUS, splitCoreCurrent } from '../../content/index.js';

export type CoreAllocationOutcome = {
  readonly newCore: CoreRecord;
  readonly energyGained: IntNonNegative;
  readonly coreChargeGained: IntNonNegative;
  readonly leftover: IntNonNegative;
};

// Phase 5 / D-04 A1: the Charge Core module's level boosts the store-side effective
// rate via an integer multiply-then-floor by (100 + chargeCoreLevel *
// MODULE_LEVEL_BONUS.charge_core) / 100 applied to split.coreCharge. chargeCoreLevel=0
// is byte-identical to Phase 1-4 behavior (Pitfall 6 backward-compat). CRITICAL: this
// does NOT add a chargeCapacity field or hard cap — Core.coreCharge remains an
// uncapped accumulator (RESEARCH Pitfall 1 A1). The level multiplies how much Charge
// is STORED per unit of routed Current, not a ceiling.
export function applyCoreAllocation(
  core: CoreRecord,
  incomingCurrent: IntNonNegative,
  chargeCoreLevel = 0,
): CoreAllocationOutcome {
  const split = splitCoreCurrent(
    incomingCurrent,
    core.convertAllocationPercent,
    core.storeAllocationPercent,
  );
  const chargeCoreBoostMultiplier = 100 + chargeCoreLevel * MODULE_LEVEL_BONUS.charge_core;
  const boostedCharge = Math.floor((split.coreCharge * chargeCoreBoostMultiplier) / 100);
  return {
    newCore: {
      ...core,
      energy: core.energy + split.energy,
      coreCharge: core.coreCharge + boostedCharge,
      lifetimeEnergy: core.lifetimeEnergy + split.energy,
      updatedAt: core.updatedAt,
    },
    energyGained: split.energy,
    coreChargeGained: boostedCharge,
    leftover: split.leftover,
  };
}

export function isCoreAllocationValid(
  convertPercent: IntPercent,
  storePercent: IntPercent,
): boolean {
  if (!Number.isInteger(convertPercent) || !Number.isInteger(storePercent)) {
    return false;
  }
  if (convertPercent < 0 || convertPercent > 100) return false;
  if (storePercent < 0 || storePercent > 100) return false;
  return convertPercent + storePercent === 100;
}
