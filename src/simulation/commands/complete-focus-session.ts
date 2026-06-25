// complete_focus_session command handler.
//
// Implements the foundation loop: starter state -> focus completion -> Bloom -> Output
// route to Core -> default Core allocation -> validation. Produces a stable, exactly
// replayable SimulationResult with economy events, visual events, and one sync-ready
// operation whose ID is supplied by the command.
//
// Validation (per Plan 01-03 Task 1 action): cellId exists, positive durationSeconds,
// endedAt >= startedAt, starter modules present on the Cell, Core allocation totals
// 100. Any failure returns a rejected result with structured ValidationIssues and
// unchanged state (D-07: commands do not throw for normal domain invalidity).

import type {
  CellRecord,
  CompleteFocusSessionCommand,
  CoreRecord,
  EconomyEvent,
  FlowgridSnapshot,
  SessionRecord,
  SimulationEnv,
  SimulationResult,
  ValidationIssue,
  VisualEvent,
} from '../../domain/index.js';

import { ECONOMY_EVENT_NAMES } from '../../domain/index.js';
import {
  bloomFiredEvent,
  cellActivatedEvent,
  cellXpGainedEvent,
  coreChargeStoredEvent,
  coreCurrentConvertedEvent,
  currentGeneratedEvent,
  currentRoutedToCoreEvent,
  focusSessionCompletedEvent,
  stateValidatedEvent,
} from '../economy-events.js';
import {
  bloomBurstVisual,
  cellActivationVisual,
  coreChargeStoreVisual,
  coreConvertVisual,
  currentFlowVisual,
  focusSessionStartedVisual,
} from '../visual-events.js';

import { applyBloom } from '../systems/bloom.js';
import { applyCoreAllocation } from '../systems/core-allocation.js';
import { generateCurrent, generateXp } from '../systems/current.js';
import { findModuleInstanceForCell, hasStarterModulesForCell } from '../systems/modules.js';
import { findRoutesFromCellToCore, routeCurrentThroughRoutes } from '../systems/routes.js';
import { isCoreAllocationValid } from '../systems/core-allocation.js';
import { operationFromCommand } from '../operation-events.js';
import { activationBonusPercent, moduleLevelBonus } from '../../content/index.js';

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

function validateCommand(
  state: FlowgridSnapshot,
  command: CompleteFocusSessionCommand,
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const cell = state.cells.get(command.cellId);
  if (!cell) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `complete_focus_session: cellId does not exist.`,
      path: 'command.cellId',
    });
  } else if (!hasStarterModulesForCell(state, command.cellId)) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: command.cellId,
      message: `complete_focus_session: cell is missing one or more starter modules.`,
      path: 'command.cellId',
    });
  }

  if (!Number.isInteger(command.durationSeconds) || command.durationSeconds <= 0) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'session',
      entityId: command.operationId,
      message: `complete_focus_session: durationSeconds must be a positive integer.`,
      path: 'command.durationSeconds',
    });
  }

  if (command.endedAt < command.startedAt) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'session',
      entityId: command.operationId,
      message: `complete_focus_session: endedAt must not precede startedAt.`,
      path: 'command.startedAt,command.endedAt',
    });
  }

  if (
    !isCoreAllocationValid(
      state.core.convertAllocationPercent,
      state.core.storeAllocationPercent,
    )
  ) {
    issues.push({
      code: 'invalid_core_allocation_total',
      severity: 'error',
      entityType: 'core',
      entityId: state.core.id,
      message: `complete_focus_session: Core convert + store allocation must total 100.`,
      path: 'state.core.convertAllocationPercent,state.core.storeAllocationPercent',
    });
  }

  return issues;
}

export function completeFocusSession(
  previousState: FlowgridSnapshot,
  command: CompleteFocusSessionCommand,
  env: SimulationEnv,
): SimulationResult {
  const inputIssues = validateCommand(previousState, command);
  if (inputIssues.length > 0) {
    return rejectWith(previousState, inputIssues);
  }

  const previousCell = previousState.cells.get(command.cellId);
  if (!previousCell) {
    // Unreachable thanks to validation, but kept for type narrowing.
    return rejectWith(previousState, inputIssues);
  }

  // D-15 / SIM-07: Activation +% Current bonus. When the Cell already bloomed today
  // (lastBloomLocalDate === env.localDate) it is "Activated" and earns extra Current.
  // XP is NOT bonused. The bonus uses integer multiply-then-floor discipline (S7).
  // CORE-06 (Phase 4): the bonus PERCENT is now derived from the persisted
  // activationBoostLevel so the purchased upgrade takes effect here. Level 0 yields
  // the Phase-3 baseline of 10% (Pitfall 6 backward-compat — existing tests stay green).
  //
  // Phase 5 / D-04 (Generator): the owning Generator module's level grants an
  // ADDITIVE +% Current bonus SEPARATE from and INDEPENDENT of the Activation bonus
  // above. generatorLevel is a DIFFERENT axis from activationBoostLevel (D-03
  // conflation warning — RESEARCH Pitfall 1). Both bonuses apply via integer
  // multiply-then-floor; they stack additively on top of baseCurrent. generatorLevel=0
  // yields a 0 bonus (Pitfall 6 backward-compat — Phase 1-4 tests stay byte-identical).
  const generatorInstance = findModuleInstanceForCell(previousState, command.cellId, 'generator');
  const generatorLevel = generatorInstance?.level ?? 0;
  const generatorBonusPct = moduleLevelBonus('generator', generatorLevel);

  const baseCurrent = generateCurrent(command.durationSeconds);
  const isActivatedToday = previousCell.lastBloomLocalDate === env.localDate;
  const activationBonusPct = activationBonusPercent(previousState.core.activationBoostLevel);
  const activationBonus = isActivatedToday
    ? Math.floor((baseCurrent * activationBonusPct) / 100)
    : 0;
  const generatorBonus = Math.floor((baseCurrent * generatorBonusPct) / 100);
  const currentGenerated = baseCurrent + activationBonus + generatorBonus;
  const xpGained = generateXp(command.durationSeconds);

  // Advance daily milestone BEFORE bloom check so the check sees the new total.
  const advancedCell: CellRecord = {
    ...previousCell,
    xp: previousCell.xp + xpGained,
    dailyMilestoneProgressSeconds:
      previousCell.dailyMilestoneProgressSeconds + command.durationSeconds,
    updatedAt: env.now,
  };

  // Phase 5 / D-04 (Bloom): resolve the owning Bloom module's level and thread it
  // through applyBloom so each Bloom grants +1 + bloomLevel activation/momentum.
  const bloomInstance = findModuleInstanceForCell(previousState, command.cellId, 'bloom');
  const bloomLevel = bloomInstance?.level ?? 0;
  const bloom = applyBloom(advancedCell, env.localDate, bloomLevel);

  const cellAfterFocus: CellRecord = {
    ...bloom.cell,
    // Current is added then immediately routed to the Core below; net change is 0
    // for Phase 1 starter (no Cell-side Charge storage in the foundation loop).
    current: previousCell.current,
    // The session is over: clear the active marker so deriveActiveSession() stops
    // projecting it and the GeneratorTile returns to the idle Start state.
    activeSessionStartedAt: null,
    updatedAt: env.now,
  };

  // Route Current from Cell Output to the Core.
  // Phase 5 / D-04 (Output): resolve the owning Output module's level and thread it
  // through routeCurrentThroughRoutes so the per-route routed amount is boosted.
  const outputInstance = findModuleInstanceForCell(previousState, command.cellId, 'output');
  const outputLevel = outputInstance?.level ?? 0;
  const routes = findRoutesFromCellToCore(previousState, command.cellId, previousState.core.id);
  const { routed } = routeCurrentThroughRoutes(currentGenerated, routes, outputLevel);

  // Phase 5 / D-04 (Charge Core): resolve the owning Charge Core module's level and
  // thread it through applyCoreAllocation so the store-side Charge is boosted. The
  // Charge Core lives on the Core's Cell context — for the Phase 1-4 single-Cell
  // starter layout every Cell routes to the same Core, so we resolve the Charge Core
  // instance on the SAME cell the focus session ran on. (A multi-Core future would
  // need a Core->owning-Cell lookup; v1 has one Core and one starter Cell.)
  const chargeCoreInstance = findModuleInstanceForCell(previousState, command.cellId, 'charge_core');
  const chargeCoreLevel = chargeCoreInstance?.level ?? 0;
  const coreAllocation = applyCoreAllocation(previousState.core, routed, chargeCoreLevel);
  const newCore: CoreRecord = { ...coreAllocation.newCore, updatedAt: env.now };

  // Session record. sessionId is 1:1 with operationId in Phase 1 (stable, replayable).
  const sessionId = command.operationId;
  const session: SessionRecord = {
    id: sessionId,
    cellId: command.cellId,
    startedAt: command.startedAt,
    endedAt: command.endedAt,
    durationSeconds: command.durationSeconds,
    xpGained,
    currentGenerated,
    bloomFired: bloom.fired,
    activationGranted: bloom.fired,
    energyGained: coreAllocation.energyGained,
    coreChargeGained: coreAllocation.coreChargeGained,
    createdAt: env.now,
  };

  const operation = operationFromCommand(command, env.now, {
    entityId: sessionId,
    payload: {
      cellId: command.cellId,
      durationSeconds: command.durationSeconds,
      startedAt: command.startedAt,
      endedAt: command.endedAt,
      xpGained,
      currentGenerated,
      routedToCore: routed,
      energyGained: coreAllocation.energyGained,
      coreChargeGained: coreAllocation.coreChargeGained,
      bloomFired: bloom.fired,
    },
  });

  const cells = new Map(previousState.cells);
  cells.set(command.cellId, cellAfterFocus);

  const nextState: FlowgridSnapshot = {
    ...previousState,
    cells,
    core: newCore,
    sessions: [...previousState.sessions, session],
    operations: [...previousState.operations, operation],
    client: { ...previousState.client, updatedAt: env.now },
  };

  const economyEvents: EconomyEvent[] = [
    focusSessionCompletedEvent(env.now, sessionId, command.cellId, command.durationSeconds),
    currentGeneratedEvent(env.now, command.cellId, currentGenerated),
    cellXpGainedEvent(env.now, command.cellId, xpGained),
  ];
  if (bloom.fired) {
    economyEvents.push(bloomFiredEvent(env.now, command.cellId, env.localDate));
    economyEvents.push(cellActivatedEvent(env.now, command.cellId, cellAfterFocus.activation));
  }
  if (routed > 0) {
    for (const route of routes) {
      economyEvents.push(
        currentRoutedToCoreEvent(
          env.now,
          route.id,
          command.cellId,
          previousState.core.id,
          Math.floor((currentGenerated * route.allocationPercent) / 100),
        ),
      );
    }
    if (coreAllocation.energyGained > 0) {
      economyEvents.push(
        coreCurrentConvertedEvent(env.now, newCore.id, routed, coreAllocation.energyGained),
      );
    }
    if (coreAllocation.coreChargeGained > 0) {
      economyEvents.push(
        coreChargeStoredEvent(env.now, newCore.id, routed, coreAllocation.coreChargeGained),
      );
    }
  }
  economyEvents.push(stateValidatedEvent(env.now, nextState.client.id, 0));

  const visualEvents: VisualEvent[] = [
    focusSessionStartedVisual(env.now, command.cellId),
    currentFlowVisual(env.now, routes[0]?.id ?? 'route:unknown', routed),
  ];
  if (bloom.fired) {
    visualEvents.push(bloomBurstVisual(env.now, command.cellId));
    visualEvents.push(cellActivationVisual(env.now, command.cellId));
  }
  if (coreAllocation.energyGained > 0) {
    visualEvents.push(coreConvertVisual(env.now, newCore.id, coreAllocation.energyGained));
  }
  if (coreAllocation.coreChargeGained > 0) {
    visualEvents.push(coreChargeStoreVisual(env.now, newCore.id, coreAllocation.coreChargeGained));
  }

  void ECONOMY_EVENT_NAMES;

  return {
    status: 'applied',
    previousState,
    nextState,
    economyEvents,
    visualEvents,
    operations: [operation],
    validationIssues: [],
  };
}
