// unarchive_cell command handler (CELL-04, D-12).
//
// Flips archivedAt from non-null to null. Nothing else on the Cell changes. Rejects
// a Cell that is not currently archived. Emits exactly one SyncOperation.

import type {
  CellRecord,
  FlowgridSnapshot,
  SimulationEnv,
  SimulationResult,
  UnarchiveCellCommand,
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

export function unarchiveCell(
  previousState: FlowgridSnapshot,
  command: UnarchiveCellCommand,
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
      message: `unarchive_cell: cellId does not exist.`,
      path: 'command.cellId',
    });
  } else if (previousCell.archivedAt === null) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `unarchive_cell: cell is not archived.`,
      path: 'command.cellId',
    });
  }

  if (issues.length > 0) {
    return rejectWith(previousState, issues);
  }

  const updatedCell: CellRecord = {
    ...(previousCell as CellRecord),
    archivedAt: null,
    updatedAt: env.now,
  };

  const cells = new Map(previousState.cells);
  cells.set(command.cellId, updatedCell);

  const operation = operationFromCommand(command, env.now, {
    entityId: command.cellId,
    payload: { archivedAt: null },
  });

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
    visualEvents: [],
    operations: [operation],
    validationIssues: [],
  };
}
