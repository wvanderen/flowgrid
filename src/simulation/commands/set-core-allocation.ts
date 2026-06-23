// set_core_allocation command handler.

import type {
  FlowgridSnapshot,
  IntPercent,
  SetCoreAllocationCommand,
  SimulationEnv,
  SimulationResult,
  ValidationIssue,
} from '../../domain/index.js';

import { isCoreAllocationValid } from '../systems/core-allocation.js';
import { operationFromCommand } from '../operation-events.js';

export function setCoreAllocation(
  previousState: FlowgridSnapshot,
  command: SetCoreAllocationCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];

  if (!isCoreAllocationValid(command.convertAllocationPercent, command.storeAllocationPercent)) {
    issues.push({
      code: 'invalid_core_allocation_total',
      severity: 'error',
      entityType: 'core',
      entityId: previousState.core.id,
      message:
        'Core allocation convert + store must total exactly 100 with each side an integer between 0 and 100.',
      path: 'command.convertAllocationPercent,command.storeAllocationPercent',
    });
  }

  if (issues.length > 0) {
    return {
      status: 'rejected',
      previousState,
      nextState: previousState,
      economyEvents: [],
      visualEvents: [],
      operations: [],
      validationIssues: issues,
    };
  }

  const convertPercent: IntPercent = command.convertAllocationPercent;
  const storePercent: IntPercent = command.storeAllocationPercent;
  const newCore = {
    ...previousState.core,
    convertAllocationPercent: convertPercent,
    storeAllocationPercent: storePercent,
    updatedAt: env.now,
  };
  const operation = operationFromCommand(command, env.now, {
    entityId: previousState.core.id,
    payload: { convertAllocationPercent: convertPercent, storeAllocationPercent: storePercent },
  });

  return {
    status: 'applied',
    previousState,
    nextState: {
      ...previousState,
      core: newCore,
      client: { ...previousState.client, updatedAt: env.now },
      operations: [...previousState.operations, operation],
    },
    economyEvents: [],
    visualEvents: [],
    operations: [operation],
    validationIssues: [],
  };
}
