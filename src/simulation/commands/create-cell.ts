// create_cell command handler (CELL-05, D-09).
//
// Instantiates a new Cell with the four starter ModuleInstances (Generator,
// Charge Core, Output, Bloom) and one Output route to the Core at allocationPercent
// 100. Identity fields (name, color, icon, dailyTargetSeconds) come from the
// command; economy fields default to zero. Starter module/route IDs are generated
// internally using the same `${cellId}:...` convention as createStarterFlowgridState.
//
// Validation (D-09): name non-empty, color hex format, dailyTargetSeconds positive
// integer, cellId not already present, Core exists. Failures return a rejected
// SimulationResult with unchanged state (Phase 1 D-07: never throw).

import type {
  CellId,
  CellRecord,
  CreateCellCommand,
  FlowgridSnapshot,
  ModuleInstance,
  ModuleInstanceId,
  ModuleSlotId,
  RouteRecord,
  RouteId,
  SimulationEnv,
  SimulationResult,
  ValidationIssue,
} from '../../domain/index.js';
import {
  BLOOM_MODULE_DEFINITION_ID,
  CHARGE_CORE_MODULE_DEFINITION_ID,
  DEFAULT_DAILY_MILESTONE_TARGET_SECONDS,
  GENERATOR_MODULE_DEFINITION_ID,
  OUTPUT_MODULE_DEFINITION_ID,
} from '../../content/index.js';
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

function slotId(cellId: CellId, kind: string): ModuleSlotId {
  return `${cellId}:slot:${kind}`;
}

export function createCell(
  previousState: FlowgridSnapshot,
  command: CreateCellCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];

  const trimmedName = command.name.trim();
  if (!trimmedName) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `create_cell: name must be non-empty.`,
      path: 'command.name',
    });
  }

  if (!HEX_COLOR_RE.test(command.color)) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `create_cell: color must be a #rrggbb hex string.`,
      path: 'command.color',
    });
  }

  if (!Number.isInteger(command.dailyTargetSeconds) || command.dailyTargetSeconds <= 0) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `create_cell: dailyTargetSeconds must be a positive integer.`,
      path: 'command.dailyTargetSeconds',
    });
  }

  if (previousState.cells.has(command.cellId)) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `create_cell: cellId already exists.`,
      path: 'command.cellId',
    });
  }

  if (issues.length > 0) {
    return rejectWith(previousState, issues);
  }

  const coreId = previousState.core.id;

  // D-09: a new Cell gets economy fields at zero defaults and the D-10 identity
  // fields from the command. dailyMilestoneTargetSeconds honors the command override
  // (CELL-05); dailyMilestoneProgressSeconds starts at 0.
  const cell: CellRecord = {
    id: command.cellId,
    name: trimmedName,
    color: command.color,
    icon: command.icon,
    archivedAt: null,
    activeSessionStartedAt: null,
    xp: 0,
    current: 0,
    charge: 0,
    momentum: 0,
    activation: 0,
    dailyMilestoneProgressSeconds: 0,
    dailyMilestoneTargetSeconds: command.dailyTargetSeconds,
    lastBloomLocalDate: null,
    createdAt: env.now,
    updatedAt: env.now,
  };

  // Reuse the starter-state module-construction convention (starter-state.ts
  // lines 50, 113-162): `${cellId}:module-instance:${kind}` and
  // `${cellId}:slot:${kind}`. Four starter singletons per Cell.
  const generatorId: ModuleInstanceId = `${command.cellId}:module-instance:generator`;
  const chargeCoreId: ModuleInstanceId = `${command.cellId}:module-instance:charge-core`;
  const outputId: ModuleInstanceId = `${command.cellId}:module-instance:output`;
  const bloomId: ModuleInstanceId = `${command.cellId}:module-instance:bloom`;

  const newModules: ModuleInstance[] = [
    {
      id: generatorId,
      definitionId: GENERATOR_MODULE_DEFINITION_ID,
      ownerCellId: command.cellId,
      installedSlotId: slotId(command.cellId, 'generator'),
      level: 0,
      createdAt: env.now,
      updatedAt: env.now,
    },
    {
      id: chargeCoreId,
      definitionId: CHARGE_CORE_MODULE_DEFINITION_ID,
      ownerCellId: command.cellId,
      installedSlotId: slotId(command.cellId, 'charge-core'),
      level: 0,
      createdAt: env.now,
      updatedAt: env.now,
    },
    {
      id: outputId,
      definitionId: OUTPUT_MODULE_DEFINITION_ID,
      ownerCellId: command.cellId,
      installedSlotId: slotId(command.cellId, 'output'),
      level: 0,
      createdAt: env.now,
      updatedAt: env.now,
    },
    {
      id: bloomId,
      definitionId: BLOOM_MODULE_DEFINITION_ID,
      ownerCellId: command.cellId,
      installedSlotId: slotId(command.cellId, 'bloom'),
      level: 0,
      createdAt: env.now,
      updatedAt: env.now,
    },
  ];

  // One Output route to the Core at 100% (starter-state.ts lines 163-176 pattern).
  const routeId: RouteId = `${command.cellId}:route:output-to-core`;
  const newRoute: RouteRecord = {
    id: routeId,
    sourceCellId: command.cellId,
    sourceModuleInstanceId: outputId,
    targetCoreId: coreId,
    allocationPercent: 100,
    createdAt: env.now,
    updatedAt: env.now,
  };

  const cells = new Map(previousState.cells);
  cells.set(command.cellId, cell);

  const moduleInstances = new Map(previousState.moduleInstances);
  for (const m of newModules) {
    moduleInstances.set(m.id, m);
  }

  const routes = new Map(previousState.routes);
  routes.set(newRoute.id, newRoute);

  const operation = operationFromCommand(command, env.now, {
    entityId: command.cellId,
    payload: {
      name: cell.name,
      color: cell.color,
      icon: cell.icon,
      dailyTargetSeconds: cell.dailyMilestoneTargetSeconds,
    },
  });

  const nextState: FlowgridSnapshot = {
    ...previousState,
    cells,
    moduleInstances,
    routes,
    operations: [...previousState.operations, operation],
    client: { ...previousState.client, updatedAt: env.now },
  };

  void DEFAULT_DAILY_MILESTONE_TARGET_SECONDS;

  return {
    status: 'applied',
    previousState,
    nextState,
    economyEvents: [],
    visualEvents: [],
    operations: [operation],
    validationIssues: [],
  };
}
