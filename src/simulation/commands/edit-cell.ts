// edit_cell command handler (CELL-03, D-11).
//
// Changes identity fields only (name, color, icon, dailyTargetSeconds). Economy
// fields (xp, current, charge, momentum, activation, dailyMilestoneProgressSeconds,
// lastBloomLocalDate) are structurally impossible to set via the command interface
// — D-11: the spread overrides only identity fields, so the economy values are
// preserved verbatim from the existing Cell.

import type {
  CellRecord,
  EditCellCommand,
  FlowgridSnapshot,
  SimulationEnv,
  SimulationResult,
  ValidationIssue,
} from '../../domain/index.js';
import { operationFromCommand } from '../operation-events.js';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

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

export function editCell(
  previousState: FlowgridSnapshot,
  command: EditCellCommand,
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
      message: `edit_cell: cellId does not exist.`,
      path: 'command.cellId',
    });
  }

  if (!command.name.trim()) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `edit_cell: name must be non-empty.`,
      path: 'command.name',
    });
  }

  if (!HEX_COLOR_RE.test(command.color)) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `edit_cell: color must be a #rrggbb hex string.`,
      path: 'command.color',
    });
  }

  if (!Number.isInteger(command.dailyTargetSeconds) || command.dailyTargetSeconds <= 0) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `edit_cell: dailyTargetSeconds must be a positive integer.`,
      path: 'command.dailyTargetSeconds',
    });
  }

  if (issues.length > 0) {
    return rejectWith(previousState, issues);
  }

  // D-11: override ONLY identity fields. Economy fields flow through unchanged
  // via the spread.
  const updatedCell: CellRecord = {
    ...previousCell as CellRecord,
    name: command.name.trim(),
    color: command.color,
    icon: command.icon,
    dailyMilestoneTargetSeconds: command.dailyTargetSeconds,
    updatedAt: env.now,
  };

  const cells = new Map(previousState.cells);
  cells.set(command.cellId, updatedCell);

  const operation = operationFromCommand(command, env.now, {
    entityId: command.cellId,
    payload: {
      name: updatedCell.name,
      color: updatedCell.color,
      icon: updatedCell.icon,
      dailyTargetSeconds: updatedCell.dailyMilestoneTargetSeconds,
    },
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
