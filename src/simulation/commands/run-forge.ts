// run_forge command handler (Phase 5 / D-01..D-09, MOD-03..MOD-07).
//
// Atomic forge roll: validate payment -> RE-DERIVE forgeChoices(previousState) from
// the snapshot's forgeCount (TOCTOU defense, Pitfall 3) -> validate chosenReward ∈
// revealed -> resolve target ModuleInstance -> cap check -> apply (+1 level,
// decrement payment, forgeCount+1) -> append ONE ForgeHistoryRecord (id=operationId,
// idempotent) -> emit SyncOperation + forgeCompleted + moduleUpgraded economy events.
//
// Single command, single operation, single history row (D-06). Rejected results
// write nothing durable (Phase 2 D-02). Deterministic replay (Phase 1 D-08) holds
// because the reveal derives from snapshot.core.forgeCount, not ambient RNG.
//
// Integer discipline (Pitfall 4): all economy math is integer add/subtract.
// forgeEnergyCost(forgeCount) = BASE + forgeCount*STEP is integer-safe; paymentAmount
// is 1 for token or energyCost for energy — never a float, never Math.round.

import type {
  CoreRecord,
  EconomyEvent,
  FlowgridSnapshot,
  ForgeHistoryRecord,
  ModuleInstance,
  RunForgeCommand,
  SimulationEnv,
  SimulationResult,
  ValidationIssue,
  VisualEvent,
} from '../../domain/index.js';

import { operationFromCommand } from '../operation-events.js';
import { forgeCompletedEvent, moduleUpgradedEvent } from '../economy-events.js';
import { forgeRollVisual, moduleUpgradeVisual } from '../visual-events.js';
import { forgeEnergyCost, MODULE_MAX_LEVEL } from '../../content/index.js';
import { forgeChoices } from './forge-choices.js';
import { findModuleInstanceForCell } from '../systems/modules.js';

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

export function runForge(
  previousState: FlowgridSnapshot,
  command: RunForgeCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];
  const prevCore = previousState.core;

  // (a) Payment affordability. Token roll costs 1 Module Token; Energy roll costs
  // forgeEnergyCost(forgeCount) = BASE + forgeCount*STEP. Insufficient payment on
  // either path reuses the existing 'negative_resource' code (RESEARCH A6).
  const energyCost = forgeEnergyCost(prevCore.forgeCount);
  if (command.paymentType === 'token' && prevCore.moduleTokens < 1) {
    issues.push({
      code: 'negative_resource',
      severity: 'error',
      entityType: 'core',
      entityId: prevCore.id,
      message: `run_forge: insufficient Module Tokens (have ${prevCore.moduleTokens}, need 1).`,
      path: 'core.moduleTokens',
    });
  }
  if (command.paymentType === 'energy' && prevCore.energy < energyCost) {
    issues.push({
      code: 'negative_resource',
      severity: 'error',
      entityType: 'core',
      entityId: prevCore.id,
      message: `run_forge: requires ${energyCost} Energy (have ${prevCore.energy}).`,
      path: 'core.energy',
    });
  }

  // (b)+(c) RE-DERIVE the reveal from the CURRENT snapshot.forgeCount and validate
  // chosenReward ∈ that set. This is the TOCTOU defense (Pitfall 3): the handler
  // never trusts a caller-supplied "revealedChoices" field — it re-derives from truth
  // so a stale or crafted pick is rejected. chosen-not-in-revealed reuses
  // 'invalid_reference' (RESEARCH A6).
  const revealed = forgeChoices(previousState);
  const chosen = revealed.find(
    (r) =>
      r.cellId === command.chosenReward.cellId && r.moduleKind === command.chosenReward.moduleKind,
  );
  if (chosen === undefined) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'forge_history',
      entityId: command.operationId,
      message: `run_forge: chosen reward not in revealed set.`,
      path: 'command.chosenReward',
    });
  }

  if (issues.length > 0) {
    return rejectWith(previousState, issues);
  }

  // (d) Resolve the target ModuleInstance. `chosen` is defined here because the
  // invalid_reference branch above returned. It came from `revealed`, which only
  // includes modules with level < MODULE_MAX_LEVEL, but a concurrent mutation could
  // in principle have changed things between reveal derivation and here — so we
  // re-check the cap below as defense-in-depth (MOD-07).
  const target = findModuleInstanceForCell(previousState, chosen!.cellId, chosen!.moduleKind);
  if (target === undefined) {
    // Unreachable: `chosen` came from `revealed` which resolves via the same lookup,
    // but guard anyway rather than crashing.
    return rejectWith(previousState, [
      {
        code: 'invalid_reference',
        severity: 'error',
        entityType: 'module_instance',
        entityId: command.operationId,
        message: `run_forge: target module instance not found.`,
        path: 'command.chosenReward',
      },
    ]);
  }

  // (e) Cap check (D-05 / MOD-07). The reveal filters maxed modules, but the handler
  // re-checks so a crafted payload or replay drift cannot push a module past the cap.
  if (target.level >= MODULE_MAX_LEVEL) {
    return rejectWith(previousState, [
      {
        code: 'slot_at_capacity',
        severity: 'error',
        entityType: 'module_instance',
        entityId: target.id,
        message: `run_forge: ${chosen!.moduleKind} already at max level ${MODULE_MAX_LEVEL}.`,
        path: 'moduleInstance.level',
      },
    ]);
  }

  // (f) Apply: +1 level on the target ModuleInstance, decrement payment per type,
  // forgeCount += 1. Integer add/subtract only.
  const updatedInstance: ModuleInstance = {
    ...target,
    level: target.level + 1,
    updatedAt: env.now,
  };
  const moduleInstances = new Map(previousState.moduleInstances);
  moduleInstances.set(updatedInstance.id, updatedInstance);

  const newCore: CoreRecord = {
    ...prevCore,
    moduleTokens: command.paymentType === 'token' ? prevCore.moduleTokens - 1 : prevCore.moduleTokens,
    energy: command.paymentType === 'energy' ? prevCore.energy - energyCost : prevCore.energy,
    forgeCount: prevCore.forgeCount + 1,
    updatedAt: env.now,
  };

  // (g) Append ONE ForgeHistoryRecord. id = operationId (1:1, idempotent replay —
  // Phase 2 D-04; repository's idempotentAppend dedups by id). offeredChoices carries
  // the full derived reveal so MOD-05's "offered choices" (plural) is satisfied
  // literally; chosenReward captures the level transition.
  const record: ForgeHistoryRecord = {
    id: command.operationId,
    forgeCount: newCore.forgeCount,
    paymentType: command.paymentType,
    paymentAmount: command.paymentType === 'token' ? 1 : energyCost,
    offeredChoices: revealed,
    chosenReward: {
      cellId: chosen!.cellId,
      moduleKind: chosen!.moduleKind,
      fromLevel: target.level,
      toLevel: target.level + 1,
    },
    createdAt: env.now,
  };

  // (h) Operation + economy events. operationFromCommand already routes run_forge
  // to entityType 'forge_history'; the payload captures the forge id + payment so
  // the sync queue and history views have what they need.
  const operation = operationFromCommand(command, env.now, {
    entityId: prevCore.id,
    payload: {
      forgeId: record.id,
      paymentType: record.paymentType,
      paymentAmount: record.paymentAmount,
      cellId: chosen!.cellId,
      moduleKind: chosen!.moduleKind,
      fromLevel: target.level,
      toLevel: target.level + 1,
    },
  });

  const nextState: FlowgridSnapshot = {
    ...previousState,
    core: newCore,
    moduleInstances,
    forgeHistory: [...previousState.forgeHistory, record],
    operations: [...previousState.operations, operation],
    client: { ...previousState.client, updatedAt: env.now },
  };

  const economyEvents: EconomyEvent[] = [
    forgeCompletedEvent(
      env.now,
      prevCore.id,
      record.id,
      record.paymentType,
      record.paymentAmount,
      newCore.forgeCount,
    ),
    moduleUpgradedEvent(
      env.now,
      target.id,
      chosen!.cellId,
      chosen!.moduleKind,
      target.level,
      target.level + 1,
    ),
  ];

  // D-04: transient visual events emitted alongside the economy events. UI-04 —
  // dropping these never changes durable state; placement only affects animation.
  const visualEvents: VisualEvent[] = [
    forgeRollVisual(env.now, prevCore.id, {
      forgeId: record.id,
      paymentType: record.paymentType,
      paymentAmount: record.paymentAmount,
      forgeCountAfter: newCore.forgeCount,
    }),
    moduleUpgradeVisual(env.now, target.id, {
      cellId: chosen!.cellId,
      moduleKind: chosen!.moduleKind,
      fromLevel: target.level,
      toLevel: target.level + 1,
    }),
  ];

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
