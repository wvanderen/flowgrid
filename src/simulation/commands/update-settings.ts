// update_settings command handler.
//
// Mirrors set-core-allocation.ts: a singleton-targeting validate → apply → emit
// operation → return command. Validation accumulates typed ValidationIssue[] and
// rejects with invalid_operation_shape (no throw) for non-positive lengths or a
// malformed 'HH:MM' localDayBoundary. Settings has no visual event, so visualEvents
// is always empty. D-12: this writes only SettingsRecord — existing Cells' captured
// dailyMilestoneTargetSeconds are untouched (defaults affect new Cells only).

import type {
  FlowgridSnapshot,
  IntSeconds,
  SimulationEnv,
  SimulationResult,
  UpdateSettingsCommand,
  ValidationIssue,
} from '../../domain/index.js';

import { operationFromCommand } from '../operation-events.js';

const HH_MM_SHAPE = /^\d{2}:\d{2}$/;

export function updateSettings(
  previousState: FlowgridSnapshot,
  command: UpdateSettingsCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];

  const sessionLength: IntSeconds = command.defaultSessionLengthSeconds;
  const dailyTarget: IntSeconds = command.dailyTargetSeconds;

  if (!Number.isInteger(sessionLength) || sessionLength <= 0) {
    issues.push({
      code: 'invalid_operation_shape',
      severity: 'error',
      entityType: 'settings',
      entityId: previousState.settings.id,
      message: 'Default session length must be a positive integer number of seconds.',
      path: 'command.defaultSessionLengthSeconds',
    });
  }

  if (!Number.isInteger(dailyTarget) || dailyTarget <= 0) {
    issues.push({
      code: 'invalid_operation_shape',
      severity: 'error',
      entityType: 'settings',
      entityId: previousState.settings.id,
      message: 'Daily target must be a positive integer number of seconds.',
      path: 'command.dailyTargetSeconds',
    });
  }

  if (!HH_MM_SHAPE.test(command.localDayBoundary)) {
    issues.push({
      code: 'invalid_operation_shape',
      severity: 'error',
      entityType: 'settings',
      entityId: previousState.settings.id,
      message: 'Local day boundary must be a HH:MM string.',
      path: 'command.localDayBoundary',
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

  const newSettings = {
    ...previousState.settings,
    defaultSessionLengthSeconds: sessionLength,
    dailyTargetSeconds: dailyTarget,
    localDayBoundary: command.localDayBoundary,
    reduceMotion: command.reduceMotion,
    updatedAt: env.now,
  };
  const operation = operationFromCommand(command, env.now, {
    entityId: previousState.settings.id,
    payload: {
      defaultSessionLengthSeconds: sessionLength,
      dailyTargetSeconds: dailyTarget,
      localDayBoundary: command.localDayBoundary,
      reduceMotion: command.reduceMotion,
    },
  });

  return {
    status: 'applied',
    previousState,
    nextState: {
      ...previousState,
      settings: newSettings,
      client: { ...previousState.client, updatedAt: env.now },
      operations: [...previousState.operations, operation],
    },
    economyEvents: [],
    visualEvents: [],
    operations: [operation],
    validationIssues: [],
  };
}
