// start_focus_session command handler (SESS-01, D-05).
//
// Sets activeSessionStartedAt on the Cell to env.now. The marker is stored ON the
// Cell (D-05 field-on-Cell choice). One active session at a time across the whole
// Flowgrid: if any Cell already has a non-null activeSessionStartedAt, the command
// rejects. Emits exactly one SyncOperation.

import type {
  CellId,
  CellRecord,
  FlowgridSnapshot,
  SimulationEnv,
  SimulationResult,
  StartFocusSessionCommand,
  VisualEvent,
  ValidationIssue,
} from '../../domain/index.js';
import { operationFromCommand } from '../operation-events.js';
import { focusSessionStartedVisual } from '../visual-events.js';

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

export function startFocusSession(
  previousState: FlowgridSnapshot,
  command: StartFocusSessionCommand,
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
      message: `start_focus_session: cellId does not exist.`,
      path: 'command.cellId',
    });
  } else if (previousCell.archivedAt !== null) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `start_focus_session: cannot start a session on an archived cell.`,
      path: 'command.cellId',
    });
  }

  // D-05: one active session at a time across the Flowgrid. Scan every Cell for a
  // non-null activeSessionStartedAt (including the target Cell itself — re-starting
  // the same cell counts as a conflict).
  if (issues.length === 0) {
    for (const [id, cell] of previousState.cells) {
      if (cell.activeSessionStartedAt !== null) {
        issues.push({
          code: 'invalid_reference',
          severity: 'error',
          entityType: 'cell',
          entityId: id,
          message: `start_focus_session: another cell (${id}) already has an active focus session.`,
          path: 'state.cells.activeSessionStartedAt',
        });
      }
    }
  }

  // Phase 4 Pitfall 2 (cross-type mutual exclusion): a focus session also cannot
  // start while a rejuvenation session is in progress. Rest XOR focus, app-wide.
  if (issues.length === 0 && previousState.core.activeRejuvenationStartedAt !== null) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'core',
      entityId: previousState.core.id,
      message: `start_focus_session: a rejuvenation session is already in progress.`,
      path: 'state.core.activeRejuvenationStartedAt',
    });
  }

  if (issues.length > 0) {
    return rejectWith(previousState, issues);
  }

  const updatedCell: CellRecord = {
    ...(previousCell as CellRecord),
    activeSessionStartedAt: env.now,
    updatedAt: env.now,
  };

  const cells = new Map<CellId, CellRecord>(previousState.cells);
  cells.set(command.cellId, updatedCell);

  const operation = operationFromCommand(command, env.now, {
    entityId: command.cellId,
    payload: { activeSessionStartedAt: env.now },
  });
  const visualEvents: VisualEvent[] = [
    focusSessionStartedVisual(env.now, command.cellId),
  ];

  return {
    status: 'applied',
    previousState,
    nextState: {
      ...previousState,
      cells,
      operations: [...previousState.operations, operation],
      client: { ...previousState.client, updatedAt: env.now },
    },
    economyEvents: [],
    visualEvents,
    operations: [operation],
    validationIssues: [],
  };
}
