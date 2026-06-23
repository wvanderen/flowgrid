// Core allocation system.
//
// Applies the Core convert/store split to incoming Current. Uses integer math with
// floor-once semantics (no drift). The returned CoreRecord has updated Energy,
// Core Charge, and lifetime Energy. Phase 1 does not decrement Module Tokens or
// forge count here; those are owned by their respective commands.

import type { CoreRecord, IntNonNegative, IntPercent } from '../../domain/index.js';
import { splitCoreCurrent } from '../../content/index.js';

export type CoreAllocationOutcome = {
  readonly newCore: CoreRecord;
  readonly energyGained: IntNonNegative;
  readonly coreChargeGained: IntNonNegative;
  readonly leftover: IntNonNegative;
};

export function applyCoreAllocation(
  core: CoreRecord,
  incomingCurrent: IntNonNegative,
): CoreAllocationOutcome {
  const split = splitCoreCurrent(
    incomingCurrent,
    core.convertAllocationPercent,
    core.storeAllocationPercent,
  );
  return {
    newCore: {
      ...core,
      energy: core.energy + split.energy,
      coreCharge: core.coreCharge + split.coreCharge,
      lifetimeEnergy: core.lifetimeEnergy + split.energy,
      updatedAt: core.updatedAt,
    },
    energyGained: split.energy,
    coreChargeGained: split.coreCharge,
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
