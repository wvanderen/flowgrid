// cancel_focus_session command handler (SESS-03, D-07, Pitfall 6).
//
// Clears activeSessionStartedAt on the Cell. Returns status 'applied' (it DOES
// clear the marker — it is a real action). But writes NOTHING durable beyond that
// one diff:
//   - operations array is EMPTY (no SyncOperation row)
//   - economyEvents array is EMPTY
//   - visualEvents array is EMPTY
//   - no SessionRecord is appended
//
// The repository's applyResult diffs nextState vs previousState and writes only the
// changed Cell. This mirrors the Phase 2 D-02 contract: rejected / no-op commands
// write nothing beyond what diff detects. Cancel is `applied` (the marker moves)
// but emits no operation/session row.

import type {
  CellId,
  CellRecord,
  CancelFocusSessionCommand,
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

export function cancelFocusSession(
  previousState: FlowgridSnapshot,
  command: CancelFocusSessionCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];

  const previousCell = previousState.cells.get(command.cellId);
  if (!previousCell) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `cancel_focus_session: cellId does not exist.`,
      path: 'command.cellId',
    });
  } else if (previousCell.activeSessionStartedAt === null) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `cancel_focus_session: cell has no active focus session.`,
      path: 'command.cellId',
    });
  }

  if (issues.length > 0) {
    return rejectWith(previousState, issues);
  }

  const updatedCell: CellRecord = {
    ...(previousCell as CellRecord),
    activeSessionStartedAt: null,
    updatedAt: env.now,
  };

  const cells = new Map<CellId, CellRecord>(previousState.cells);
  cells.set(command.cellId, updatedCell);

  const nextState: FlowgridSnapshot = {
    ...previousState,
    cells,
    client: { ...previousState.client, updatedAt: env.now },
  };

  // D-07 / Pitfall 6: NO operation, NO economy event, NO visual event, NO session.
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
