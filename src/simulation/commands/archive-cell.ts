// archive_cell command handler (CELL-04, D-12).
//
// Flips archivedAt from null to env.now. Nothing else on the Cell changes. Rejects
// an already-archived Cell. Emits exactly one SyncOperation.

import type {
  ArchiveCellCommand,
  CellRecord,
  FlowgridSnapshot,
  SimulationEnv,
  SimulationResult,
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

export function archiveCell(
  previousState: FlowgridSnapshot,
  command: ArchiveCellCommand,
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
      message: `archive_cell: cellId does not exist.`,
      path: 'command.cellId',
    });
  } else if (previousCell.archivedAt !== null) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `archive_cell: cell is already archived.`,
      path: 'command.cellId',
    });
  }

  if (issues.length > 0) {
    return rejectWith(previousState, issues);
  }

  const updatedCell: CellRecord = {
    ...(previousCell as CellRecord),
    archivedAt: env.now,
    updatedAt: env.now,
  };

  const cells = new Map(previousState.cells);
  cells.set(command.cellId, updatedCell);

  const operation = operationFromCommand(command, env.now, {
    entityId: command.cellId,
    payload: { archivedAt: env.now },
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
