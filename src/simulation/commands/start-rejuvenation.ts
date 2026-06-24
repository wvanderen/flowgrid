// start_rejuvenation command handler (D-01/D-02, Pitfall 2 cross-type mutual exclusion).
//
// Sets the live-timed rejuvenation marker on the Core (core.activeRejuvenationStartedAt
// = env.now). One active session app-wide: rejects when ANY cell has a non-null
// activeSessionStartedAt OR when the Core already has a non-null
// activeRejuvenationStartedAt. The symmetric check lives in start_focus_session (also
// modified in this plan) so the two session types are mutually exclusive regardless of
// which command runs first.

import type {
  CoreRecord,
  FlowgridSnapshot,
  SimulationEnv,
  SimulationResult,
  StartRejuvenationCommand,
  ValidationIssue,
} from '../../domain/index.js';

import { operationFromCommand } from '../operation-events.js';

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

export function startRejuvenation(
  previousState: FlowgridSnapshot,
  command: StartRejuvenationCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];

  // Pitfall 2 (cross-type): scan every Cell for an active focus session. If any
  // Cell has a non-null marker, a rejuvenation cannot start (rest XOR focus).
  for (const [id, cell] of previousState.cells) {
    if (cell.activeSessionStartedAt !== null) {
      issues.push({
        code: 'invalid_reference',
        severity: 'error',
        entityType: 'cell',
        entityId: id,
        message: `start_rejuvenation: a focus session is already active on cell ${id}.`,
        path: 'state.cells.activeSessionStartedAt',
      });
    }
  }

  // Also reject if a rejuvenation is already in progress (idempotent marker guard).
  if (previousState.core.activeRejuvenationStartedAt !== null) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'core',
      entityId: previousState.core.id,
      message: `start_rejuvenation: a rejuvenation session is already in progress.`,
      path: 'state.core.activeRejuvenationStartedAt',
    });
  }

  if (issues.length > 0) {
    return rejectWith(previousState, issues);
  }

  const newCore: CoreRecord = {
    ...previousState.core,
    activeRejuvenationStartedAt: env.now,
    updatedAt: env.now,
  };

  const operation = operationFromCommand(command, env.now, {
    entityId: previousState.core.id,
    payload: { activeRejuvenationStartedAt: env.now },
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
    economyEvents: [],
    visualEvents: [],
    operations: [operation],
    validationIssues: [],
  };
}
