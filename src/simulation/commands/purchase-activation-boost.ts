// purchase_activation_boost command handler (CORE-06).
//
// Energy-spend upgrade: validates the next level is not capped and Energy meets the
// cost, then decrements Energy by the exact cost and increments activationBoostLevel.
// The effective Activation Current bonus is DERIVED from the persisted level via
// activationBonusPercent (complete-focus-session consumes it). Mirrors the
// set-core-allocation minimal validate -> apply -> emit -> return template.

import type {
  CoreRecord,
  FlowgridSnapshot,
  PurchaseActivationBoostCommand,
  SimulationEnv,
  SimulationResult,
  ValidationIssue,
} from '../../domain/index.js';

import { operationFromCommand } from '../operation-events.js';
import { activationBoostPurchasedEvent } from '../economy-events.js';
import { activationBoostCost } from '../../content/index.js';

function rejectWith(
  state: FlowgridSnapshot,
  issues: readonly ValidationIssue[],
): SimulationResult {
  return {
    status: 'rejected',
    previousState: state,
    nextState: state,
    economyEvents: [],
    visualEvents: [],
    operations: [],
    validationIssues: issues,
  };
}

export function purchaseActivationBoost(
  previousState: FlowgridSnapshot,
  command: PurchaseActivationBoostCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];

  const level = previousState.core.activationBoostLevel;
  const cost = activationBoostCost(level);

  // cost === null means level is at the cap (ACTIVATION_BOOST_MAX_LEVEL = 3).
  if (cost === null) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'core',
      entityId: previousState.core.id,
      message: `purchase_activation_boost: Core is already at the maximum boost level (3).`,
      path: 'state.core.activationBoostLevel',
    });
  } else if (previousState.core.energy < cost) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'core',
      entityId: previousState.core.id,
      message: `purchase_activation_boost: energy ${previousState.core.energy} is below the cost ${cost} for level ${level + 1}.`,
      path: 'state.core.energy',
    });
  }

  if (issues.length > 0) {
    return rejectWith(previousState, issues);
  }

  // Non-null assertion safe — issues.length === 0 implies cost !== null.
  const energyCost = cost as number;
  const newLevel = level + 1;

  const newCore: CoreRecord = {
    ...previousState.core,
    energy: previousState.core.energy - energyCost,
    activationBoostLevel: newLevel,
    updatedAt: env.now,
  };

  const operation = operationFromCommand(command, env.now, {
    entityId: previousState.core.id,
    payload: { energyCost, newLevel },
  });

  return {
    status: 'applied',
    previousState,
    nextState: {
      ...previousState,
      core: newCore,
      operations: [...previousState.operations, operation],
      client: { ...previousState.client, updatedAt: env.now },
    },
    economyEvents: [activationBoostPurchasedEvent(env.now, previousState.core.id, energyCost, newLevel)],
    visualEvents: [],
    operations: [operation],
    validationIssues: [],
  };
}
