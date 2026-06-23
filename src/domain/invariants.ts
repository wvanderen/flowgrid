// Invariant validators.
//
// Each validator is a pure function that inspects a FlowgridSnapshot (or a pair of
// snapshots for monotonic checks) and returns structured ValidationIssues. They
// NEVER repair state — they only report. The engine composes them via
// `validateFlowgridSnapshot` and runs the composition after each applied command.
//
// Validation issue codes are the eight enumerated in `src/domain/validation.ts`:
// negative_resource, invalid_reference, duplicate_module_install,
// invalid_route_allocation, invalid_core_allocation_total, token_regression,
// forge_count_regression, invalid_operation_shape.

import type { FlowgridSnapshot } from './records.js';
import type { SyncOperation } from './operation-records.js';
import type { EntityType, ModuleInstanceId } from './ids.js';
import type { ValidationIssue } from './validation.js';

function issue(
  code: ValidationIssue['code'],
  severity: ValidationIssue['severity'],
  entityType: EntityType,
  entityId: string,
  message: string,
  path?: string,
): ValidationIssue {
  const base = { code, severity, entityType, entityId, message };
  return path === undefined ? base : { ...base, path };
}

function isNonNegativeInt(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

// --- validateNoNegativeResources ---

export function validateNoNegativeResources(snapshot: FlowgridSnapshot): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const cell of snapshot.cells.values()) {
    if (!isNonNegativeInt(cell.xp)) {
      issues.push(issue('negative_resource', 'error', 'cell', cell.id, `Cell xp must be a non-negative integer.`, 'cell.xp'));
    }
    if (!isNonNegativeInt(cell.current)) {
      issues.push(issue('negative_resource', 'error', 'cell', cell.id, `Cell current must be a non-negative integer.`, 'cell.current'));
    }
    if (!isNonNegativeInt(cell.charge)) {
      issues.push(issue('negative_resource', 'error', 'cell', cell.id, `Cell charge must be a non-negative integer.`, 'cell.charge'));
    }
    if (!isNonNegativeInt(cell.momentum)) {
      issues.push(issue('negative_resource', 'error', 'cell', cell.id, `Cell momentum must be a non-negative integer.`, 'cell.momentum'));
    }
    if (!isNonNegativeInt(cell.activation)) {
      issues.push(issue('negative_resource', 'error', 'cell', cell.id, `Cell activation must be a non-negative integer.`, 'cell.activation'));
    }
    if (!isNonNegativeInt(cell.dailyMilestoneProgressSeconds)) {
      issues.push(issue('negative_resource', 'error', 'cell', cell.id, `Cell daily milestone progress must be a non-negative integer.`, 'cell.dailyMilestoneProgressSeconds'));
    }
    if (!isNonNegativeInt(cell.dailyMilestoneTargetSeconds)) {
      issues.push(issue('negative_resource', 'error', 'cell', cell.id, `Cell daily milestone target must be a non-negative integer.`, 'cell.dailyMilestoneTargetSeconds'));
    }
  }

  const core = snapshot.core;
  const coreNumericChecks: ReadonlyArray<readonly [number, string]> = [
    [core.energy, 'core.energy'],
    [core.coreCharge, 'core.coreCharge'],
    [core.lifetimeEnergy, 'core.lifetimeEnergy'],
    [core.integration, 'core.integration'],
    [core.moduleTokens, 'core.moduleTokens'],
    [core.forgeCount, 'core.forgeCount'],
  ];
  for (const [value, path] of coreNumericChecks) {
    if (!isNonNegativeInt(value)) {
      issues.push(issue('negative_resource', 'error', 'core', core.id, `Core field must be a non-negative integer.`, path));
    }
  }

  return issues;
}

// --- validateReferences ---

export function validateReferences(snapshot: FlowgridSnapshot): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const cellIds = new Set(snapshot.cells.keys());
  const moduleInstanceIds = new Set<ModuleInstanceId>(snapshot.moduleInstances.keys());
  const coreId = snapshot.core.id;

  for (const instance of snapshot.moduleInstances.values()) {
    if (!instance.definitionId) {
      issues.push(issue('invalid_reference', 'error', 'module_instance', instance.id, `ModuleInstance has empty definitionId.`, 'moduleInstance.definitionId'));
    }
    if (!cellIds.has(instance.ownerCellId)) {
      issues.push(issue('invalid_reference', 'error', 'module_instance', instance.id, `ModuleInstance ownerCellId does not reference an existing Cell.`, 'moduleInstance.ownerCellId'));
    }
    if (!instance.installedSlotId) {
      issues.push(issue('invalid_reference', 'error', 'module_instance', instance.id, `ModuleInstance has empty installedSlotId.`, 'moduleInstance.installedSlotId'));
    }
  }

  for (const route of snapshot.routes.values()) {
    if (!cellIds.has(route.sourceCellId)) {
      issues.push(issue('invalid_reference', 'error', 'route', route.id, `Route sourceCellId does not reference an existing Cell.`, 'route.sourceCellId'));
    }
    if (!moduleInstanceIds.has(route.sourceModuleInstanceId)) {
      issues.push(issue('invalid_reference', 'error', 'route', route.id, `Route sourceModuleInstanceId does not reference an existing ModuleInstance.`, 'route.sourceModuleInstanceId'));
    }
    if (route.targetCoreId !== coreId) {
      issues.push(issue('invalid_reference', 'error', 'route', route.id, `Route targetCoreId does not reference the existing Core.`, 'route.targetCoreId'));
    }
  }

  for (const session of snapshot.sessions) {
    if (!cellIds.has(session.cellId)) {
      issues.push(issue('invalid_reference', 'error', 'session', session.id, `Session cellId does not reference an existing Cell.`, 'session.cellId'));
    }
  }

  return issues;
}

// --- validateNoDuplicateInstalls ---

export function validateNoDuplicateInstalls(snapshot: FlowgridSnapshot): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const seenInstanceIds = new Set<string>();
  const seenSlotsPerCell = new Map<string, Set<string>>();
  const seenDefinitionsPerCell = new Map<string, Set<string>>();

  for (const instance of snapshot.moduleInstances.values()) {
    if (seenInstanceIds.has(instance.id)) {
      issues.push(issue('duplicate_module_install', 'error', 'module_instance', instance.id, `Duplicate ModuleInstance id.`, 'moduleInstance.id'));
    } else {
      seenInstanceIds.add(instance.id);
    }

    let slots = seenSlotsPerCell.get(instance.ownerCellId);
    if (!slots) {
      slots = new Set<string>();
      seenSlotsPerCell.set(instance.ownerCellId, slots);
    }
    if (slots.has(instance.installedSlotId)) {
      issues.push(issue('duplicate_module_install', 'error', 'module_instance', instance.id, `Duplicate installedSlotId within Cell.`, 'moduleInstance.installedSlotId'));
    } else {
      slots.add(instance.installedSlotId);
    }

    // Phase 1 starter modules are singletons per cell. Future non-singleton
    // definitions will need to consult definition.singletonPerCell.
    let defs = seenDefinitionsPerCell.get(instance.ownerCellId);
    if (!defs) {
      defs = new Set<string>();
      seenDefinitionsPerCell.set(instance.ownerCellId, defs);
    }
    if (defs.has(instance.definitionId)) {
      issues.push(issue('duplicate_module_install', 'error', 'module_instance', instance.id, `Duplicate starter singleton definition within Cell.`, 'moduleInstance.definitionId'));
    } else {
      defs.add(instance.definitionId);
    }
  }

  return issues;
}

// --- validateRouteAllocations ---

export function validateRouteAllocations(snapshot: FlowgridSnapshot): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const route of snapshot.routes.values()) {
    if (!Number.isInteger(route.allocationPercent) || route.allocationPercent < 0 || route.allocationPercent > 100) {
      issues.push(issue('invalid_route_allocation', 'error', 'route', route.id, `Route allocationPercent must be an integer between 0 and 100.`, 'route.allocationPercent'));
    }
  }

  // Sum of allocations from each Cell's output routes must not exceed 100.
  const sumByCell = new Map<string, number>();
  for (const route of snapshot.routes.values()) {
    sumByCell.set(route.sourceCellId, (sumByCell.get(route.sourceCellId) ?? 0) + route.allocationPercent);
  }
  for (const [cellId, sum] of sumByCell) {
    if (sum > 100) {
      issues.push(issue('invalid_route_allocation', 'error', 'cell', cellId, `Sum of route allocations from Cell exceeds 100 (got ${sum}).`, 'routes[].allocationPercent'));
    }
  }

  return issues;
}

// --- validateCoreAllocation ---

export function validateCoreAllocation(snapshot: FlowgridSnapshot): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const core = snapshot.core;
  if (
    !Number.isInteger(core.convertAllocationPercent) ||
    !Number.isInteger(core.storeAllocationPercent) ||
    core.convertAllocationPercent < 0 ||
    core.convertAllocationPercent > 100 ||
    core.storeAllocationPercent < 0 ||
    core.storeAllocationPercent > 100 ||
    core.convertAllocationPercent + core.storeAllocationPercent !== 100
  ) {
    issues.push(issue('invalid_core_allocation_total', 'error', 'core', core.id, `Core convert + store allocation must total exactly 100 with each side an integer between 0 and 100.`, 'core.convertAllocationPercent,core.storeAllocationPercent'));
  }
  return issues;
}

// --- validateMonotonicCounters ---

export function validateMonotonicCounters(
  previous: FlowgridSnapshot,
  next: FlowgridSnapshot,
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (next.core.moduleTokens < previous.core.moduleTokens) {
    issues.push(issue('token_regression', 'error', 'core', next.core.id, `Core moduleTokens regressed from ${previous.core.moduleTokens} to ${next.core.moduleTokens}.`, 'core.moduleTokens'));
  }
  if (next.core.forgeCount < previous.core.forgeCount) {
    issues.push(issue('forge_count_regression', 'error', 'core', next.core.id, `Core forgeCount regressed from ${previous.core.forgeCount} to ${next.core.forgeCount}.`, 'core.forgeCount'));
  }
  if (next.core.lifetimeEnergy < previous.core.lifetimeEnergy) {
    issues.push(issue('negative_resource', 'error', 'core', next.core.id, `Core lifetimeEnergy regressed from ${previous.core.lifetimeEnergy} to ${next.core.lifetimeEnergy}.`, 'core.lifetimeEnergy'));
  }
  return issues;
}

// --- validateOperationShape ---

const VALID_OPERATION_STATUSES: ReadonlySet<SyncOperation['status']> = new Set([
  'pending',
  'applied',
  'failed',
]);

export function validateOperationShape(
  operations: readonly SyncOperation[],
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const op of operations) {
    if (!op.id) {
      issues.push(issue('invalid_operation_shape', 'error', 'operation', 'unknown', `Operation has empty id.`, 'operation.id'));
    }
    if (!op.commandType) {
      issues.push(issue('invalid_operation_shape', 'error', 'operation', op.id, `Operation has empty commandType.`, 'operation.commandType'));
    }
    if (!op.entityType) {
      issues.push(issue('invalid_operation_shape', 'error', 'operation', op.id, `Operation has empty entityType.`, 'operation.entityType'));
    }
    if (!op.entityId) {
      issues.push(issue('invalid_operation_shape', 'error', 'operation', op.id, `Operation has empty entityId.`, 'operation.entityId'));
    }
    if (!Number.isInteger(op.payloadVersion) || op.payloadVersion <= 0) {
      issues.push(issue('invalid_operation_shape', 'error', 'operation', op.id, `Operation payloadVersion must be a positive integer.`, 'operation.payloadVersion'));
    }
    if (!op.createdAt) {
      issues.push(issue('invalid_operation_shape', 'error', 'operation', op.id, `Operation has empty createdAt.`, 'operation.createdAt'));
    }
    if (!op.updatedAt) {
      issues.push(issue('invalid_operation_shape', 'error', 'operation', op.id, `Operation has empty updatedAt.`, 'operation.updatedAt'));
    }
    if (!VALID_OPERATION_STATUSES.has(op.status)) {
      issues.push(issue('invalid_operation_shape', 'error', 'operation', op.id, `Operation status must be pending, applied, or failed.`, 'operation.status'));
    }
  }
  return issues;
}

// --- validateFlowgridSnapshot (composition) ---

export function validateFlowgridSnapshot(snapshot: FlowgridSnapshot): readonly ValidationIssue[] {
  return [
    ...validateNoNegativeResources(snapshot),
    ...validateReferences(snapshot),
    ...validateNoDuplicateInstalls(snapshot),
    ...validateRouteAllocations(snapshot),
    ...validateCoreAllocation(snapshot),
    ...validateOperationShape(snapshot.operations),
  ];
}
