// cancel_rejuvenation command handler (D-07 / Pitfall 6).
//
// Clears core.activeRejuvenationStartedAt. Returns status 'applied' (it DOES clear the
// marker — it is a real action). But writes NOTHING durable beyond that one diff:
//   - operations array is EMPTY (no SyncOperation row)
//   - economyEvents array is EMPTY
//   - visualEvents array is EMPTY
//   - no RejuvenationRecord is appended
//
// The repository's applyResult diffs nextState vs previousState and writes only the
// changed Core singleton. Cancel is `applied` (the marker moves) but emits no
// operation / record row — mirrors cancel-focus-session exactly.

import type {
  CoreRecord,
  CancelRejuvenationCommand,
  FlowgridSnapshot,
  SimulationEnv,
  SimulationResult,
  ValidationIssue,
} from '../../domain/index.js';

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

export function cancelRejuvenation(
  previousState: FlowgridSnapshot,
  command: CancelRejuvenationCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];

  if (previousState.core.activeRejuvenationStartedAt === null) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'core',
      entityId: previousState.core.id,
      message: `cancel_rejuvenation: there is no active rejuvenation session to cancel.`,
      path: 'state.core.activeRejuvenationStartedAt',
    });
  }

  if (issues.length > 0) {
    return rejectWith(previousState, issues);
  }

  const newCore: CoreRecord = {
    ...previousState.core,
    activeRejuvenationStartedAt: null,
    updatedAt: env.now,
  };

  const nextState: FlowgridSnapshot = {
    ...previousState,
    core: newCore,
    client: { ...previousState.client, updatedAt: env.now },
  };

  // D-07 / Pitfall 6: NO operation, NO economy event, NO visual event, NO record.
  return {
    status: 'applied',
    previousState,
    nextState,
    economyEvents: [],
    visualEvents: [],
    operations: [],
    validationIssues: [],
  };
}
