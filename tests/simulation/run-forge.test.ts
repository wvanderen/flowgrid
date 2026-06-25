// Phase 5 run_forge handler acceptance tests (D-01..D-09, MOD-03..MOD-07, VER-01).
//
// Asserts:
//   - token roll success: moduleTokens -=1, forgeCount +=1, +1 level, one record
//   - energy roll success: energy -= forgeEnergyCost(forgeCount), forgeCount +=1, +1 level
//   - insufficient tokens -> rejected, state unchanged
//   - insufficient energy -> rejected, state unchanged
//   - chosenReward ∉ revealed -> rejected (TOCTOU defense, Pitfall 3)
//   - target at MODULE_MAX_LEVEL -> rejected (slot_at_capacity)
//   - forgeCount monotonic increment; resources non-negative after payment
//   - idempotent replay (same operationId -> byte-identical result via expectReplayEqual)
//   - cross-Cell reveal (multi-cell snapshot chosenReward resolves)

import { test, expect } from 'vitest';

import type {
  CoreRecord,
  FlowgridSnapshot,
  ModuleInstance,
  ModuleInstanceId,
  RunForgeCommand,
} from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import { validateFlowgridSnapshot } from '../../src/domain/index.js';
import { forgeEnergyCost, MODULE_MAX_LEVEL } from '../../src/content/index.js';
import { forgeChoices } from '../../src/simulation/commands/forge-choices.js';
import { findModuleInstanceForCell } from '../../src/simulation/systems/modules.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';
import { expectValidState } from '../helpers/expect-valid-state.js';
import { expectReplayEqual } from '../helpers/replay.js';

const NOW = '2026-01-04T14:00:00.000Z';
const LOCAL_DATE = '2026-01-04';

function snapshotWithCore(
  state: FlowgridSnapshot,
  overrides: Partial<CoreRecord>,
): FlowgridSnapshot {
  return { ...state, core: { ...state.core, ...overrides } };
}

function snapshotWithModuleLevel(
  state: FlowgridSnapshot,
  instanceId: ModuleInstanceId,
  level: number,
): FlowgridSnapshot {
  const original = state.moduleInstances.get(instanceId);
  if (!original) throw new Error(`unknown module instance: ${instanceId}`);
  const updated: ModuleInstance = { ...original, level, updatedAt: NOW };
  const moduleInstances = new Map(state.moduleInstances);
  moduleInstances.set(instanceId, updated);
  return { ...state, moduleInstances };
}

// Pick the first revealed choice for a given snapshot — mirrors what the UI would
// show after calling the pure selector. The handler re-derives this same set inside.
function firstRevealedChoice(state: FlowgridSnapshot) {
  const revealed = forgeChoices(state);
  expect(revealed.length, 'precondition: at least one revealed choice').toBeGreaterThan(0);
  return revealed[0]!;
}

test('run_forge token roll: moduleTokens -=1, forgeCount +=1, +1 level, one record', () => {
  const { ids, state } = buildStarterSnapshot('forge-token');
  const seeded = snapshotWithCore(state, { moduleTokens: 1 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-token' });
  const choice = firstRevealedChoice(seeded);
  const command: RunForgeCommand = {
    type: 'run_forge',
    operationId: `${ids.clientId}:op:forge-token`,
    paymentType: 'token',
    chosenReward: { cellId: choice.cellId, moduleKind: choice.moduleKind },
  };

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('applied');
  expect(result.nextState.core.moduleTokens).toBe(0);
  expect(result.nextState.core.forgeCount).toBe(1);
  expect(result.nextState.core.energy).toBe(0); // token roll does not touch energy
  expect(result.nextState.forgeHistory).toHaveLength(1);
  const record = result.nextState.forgeHistory[0]!;
  expect(record.id).toBe(command.operationId);
  expect(record.paymentType).toBe('token');
  expect(record.paymentAmount).toBe(1);
  expect(record.forgeCount).toBe(1);
  expect(record.chosenReward.fromLevel).toBe(0);
  expect(record.chosenReward.toLevel).toBe(1);
  expect(record.offeredChoices.length).toBe(3); // starter pool > 3 -> 3 revealed
  expectValidState(result.nextState);

  // The chosen module instance leveled up.
  const upgraded = findModuleInstanceForCell(
    result.nextState,
    choice.cellId,
    choice.moduleKind,
  );
  expect(upgraded?.level).toBe(1);
});

test('run_forge energy roll: energy -= forgeEnergyCost(forgeCount), forgeCount +=1, +1 level', () => {
  const { ids, state } = buildStarterSnapshot('forge-energy');
  const cost = forgeEnergyCost(0); // BASE + 0*STEP = 50
  const seeded = snapshotWithCore(state, { energy: cost });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-energy' });
  const choice = firstRevealedChoice(seeded);
  const command: RunForgeCommand = {
    type: 'run_forge',
    operationId: `${ids.clientId}:op:forge-energy`,
    paymentType: 'energy',
    chosenReward: { cellId: choice.cellId, moduleKind: choice.moduleKind },
  };

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('applied');
  expect(result.nextState.core.energy).toBe(0);
  expect(result.nextState.core.moduleTokens).toBe(0); // energy roll does not touch tokens
  expect(result.nextState.core.forgeCount).toBe(1);
  expect(result.nextState.forgeHistory[0]?.paymentType).toBe('energy');
  expect(result.nextState.forgeHistory[0]?.paymentAmount).toBe(cost);
  expectValidState(result.nextState);
});

test('run_forge energy cost escalates with forgeCount (D-02 lifetime curve)', () => {
  const { ids, state } = buildStarterSnapshot('forge-escalation');
  // forgeCount=2 -> cost = 50 + 2*25 = 100.
  const seeded = snapshotWithCore(state, { energy: 100, forgeCount: 2 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-esc' });
  const choice = firstRevealedChoice(seeded);
  const command: RunForgeCommand = {
    type: 'run_forge',
    operationId: `${ids.clientId}:op:forge-esc`,
    paymentType: 'energy',
    chosenReward: { cellId: choice.cellId, moduleKind: choice.moduleKind },
  };

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('applied');
  expect(result.nextState.core.energy).toBe(0);
  expect(result.nextState.core.forgeCount).toBe(3);
  expect(result.nextState.forgeHistory[0]?.paymentAmount).toBe(100);
});

test('run_forge insufficient tokens -> rejected, state unchanged', () => {
  const { ids, state } = buildStarterSnapshot('forge-no-tokens');
  const seeded = snapshotWithCore(state, { moduleTokens: 0 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-no-tok' });
  const choice = firstRevealedChoice(seeded);
  const command: RunForgeCommand = {
    type: 'run_forge',
    operationId: `${ids.clientId}:op:forge-no-tok`,
    paymentType: 'token',
    chosenReward: { cellId: choice.cellId, moduleKind: choice.moduleKind },
  };

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(seeded);
  expect(result.operations).toEqual([]);
  expect(result.validationIssues.some((i) => i.code === 'negative_resource')).toBe(true);
});

test('run_forge insufficient energy -> rejected, state unchanged', () => {
  const { ids, state } = buildStarterSnapshot('forge-no-energy');
  const cost = forgeEnergyCost(0); // 50
  const seeded = snapshotWithCore(state, { energy: cost - 1 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-no-eng' });
  const choice = firstRevealedChoice(seeded);
  const command: RunForgeCommand = {
    type: 'run_forge',
    operationId: `${ids.clientId}:op:forge-no-eng`,
    paymentType: 'energy',
    chosenReward: { cellId: choice.cellId, moduleKind: choice.moduleKind },
  };

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(seeded);
  expect(result.operations).toEqual([]);
  expect(result.validationIssues.some((i) => i.code === 'negative_resource')).toBe(true);
});

test('run_forge chosenReward ∉ revealed -> rejected (TOCTOU defense, Pitfall 3)', () => {
  const { ids, state } = buildStarterSnapshot('forge-toctou');
  const seeded = snapshotWithCore(state, { moduleTokens: 1 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-toctou' });
  // Build a chosenReward that does NOT exist in the snapshot — a fake cellId +
  // moduleKind that no ModuleInstance owns. The handler must re-derive the reveal
  // and reject because this choice is not in it.
  const command: RunForgeCommand = {
    type: 'run_forge',
    operationId: `${ids.clientId}:op:forge-toctou`,
    paymentType: 'token',
    chosenReward: { cellId: 'nonexistent:cell', moduleKind: 'generator' },
  };

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(seeded);
  expect(result.operations).toEqual([]);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('run_forge target at MODULE_MAX_LEVEL -> rejected; invariant backstop flags overflow (D-05/MOD-07)', () => {
  const { ids, state } = buildStarterSnapshot('forge-cap');
  // The reveal filter excludes maxed modules, so a maxed target can never be IN the
  // revealed set — a command targeting a maxed module is rejected via invalid_reference
  // (chosen ∉ revealed). This is the primary MOD-07 guard. Verify it:
  const maxed = snapshotWithModuleLevel(state, ids.generatorModuleInstanceId, MODULE_MAX_LEVEL);
  const seededMaxed = snapshotWithCore(maxed, { moduleTokens: 1 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-cap' });
  const command: RunForgeCommand = {
    type: 'run_forge',
    operationId: `${ids.clientId}:op:forge-cap`,
    paymentType: 'token',
    chosenReward: { cellId: ids.cellId, moduleKind: 'generator' },
  };
  const result = runSimulationCommand(seededMaxed, command, env);
  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(seededMaxed);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);

  // The handler's slot_at_capacity check is defense-in-depth for a case that cannot
  // arise via normal dispatch (the reveal filter catches maxed modules first). The
  // validateModuleLevelCap invariant backstop is the independent guard that flags
  // any module already OVER cap — proving the 'slot_at_capacity' code is wired into
  // the snapshot validator composition.
  const overCap = snapshotWithModuleLevel(state, ids.generatorModuleInstanceId, MODULE_MAX_LEVEL + 1);
  const issues = validateFlowgridSnapshot(overCap);
  expect(issues.some((i) => i.code === 'slot_at_capacity')).toBe(true);
});

test('run_forge: is exactly replayable (identical result for identical inputs, D-08)', () => {
  const { ids, state } = buildStarterSnapshot('forge-replay');
  const seeded = snapshotWithCore(state, { moduleTokens: 1 });
  const envA = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-replay' });
  const envB = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-replay' });
  const choice = firstRevealedChoice(seeded);
  const command: RunForgeCommand = {
    type: 'run_forge',
    operationId: `${ids.clientId}:op:forge-replay`,
    paymentType: 'token',
    chosenReward: { cellId: choice.cellId, moduleKind: choice.moduleKind },
  };

  const a = runSimulationCommand(seeded, command, envA);
  const b = runSimulationCommand(seeded, command, envB);
  expectReplayEqual(a, b);
});

test('ForgeHistoryRecord id is 1:1 with operationId (idempotent replay linchpin)', () => {
  const { ids, state } = buildStarterSnapshot('forge-idempotent-id');
  const seeded = snapshotWithCore(state, { moduleTokens: 1 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-idem' });
  const opId = `${ids.clientId}:op:forge-idem`;
  const choice = firstRevealedChoice(seeded);
  const command: RunForgeCommand = {
    type: 'run_forge',
    operationId: opId,
    paymentType: 'token',
    chosenReward: { cellId: choice.cellId, moduleKind: choice.moduleKind },
  };
  const result = runSimulationCommand(seeded, command, env);
  expect(result.status).toBe('applied');
  expect(result.nextState.forgeHistory[0]?.id).toBe(opId);
});

test('run_forge: economy events emitted (forgeCompleted + moduleUpgraded)', () => {
  const { ids, state } = buildStarterSnapshot('forge-events');
  const seeded = snapshotWithCore(state, { moduleTokens: 1 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-ev' });
  const choice = firstRevealedChoice(seeded);
  const command: RunForgeCommand = {
    type: 'run_forge',
    operationId: `${ids.clientId}:op:forge-ev`,
    paymentType: 'token',
    chosenReward: { cellId: choice.cellId, moduleKind: choice.moduleKind },
  };

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('applied');
  const types = result.economyEvents.map((e) => e.type);
  expect(types).toContain('forge_completed');
  expect(types).toContain('module_upgraded');
});

test('run_forge: prior forge history is append-only (prohibition 5)', () => {
  const { ids, state } = buildStarterSnapshot('forge-append');
  // Two token rolls: seed with 2 tokens so both succeed. Use a single Cell — the
  // reveal will offer the same 3 module kinds each time, and we pick the first.
  let seeded = snapshotWithCore(state, { moduleTokens: 2 });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'forge-app' });

  const choice1 = firstRevealedChoice(seeded);
  const first = runSimulationCommand(
    seeded,
    {
      type: 'run_forge',
      operationId: `${ids.clientId}:op:forge-app-1`,
      paymentType: 'token',
      chosenReward: { cellId: choice1.cellId, moduleKind: choice1.moduleKind },
    },
    env,
  );
  expect(first.status).toBe('applied');
  expect(first.nextState.forgeHistory).toHaveLength(1);
  const firstRecordSnapshot = JSON.stringify(first.nextState.forgeHistory[0]);

  // Second roll on top of the first result.
  seeded = first.nextState;
  const choice2 = firstRevealedChoice(seeded);
  const second = runSimulationCommand(
    seeded,
    {
      type: 'run_forge',
      operationId: `${ids.clientId}:op:forge-app-2`,
      paymentType: 'token',
      chosenReward: { cellId: choice2.cellId, moduleKind: choice2.moduleKind },
    },
    env,
  );
  expect(second.status).toBe('applied');
  expect(second.nextState.forgeHistory).toHaveLength(2);
  // The first record is byte-identical to what it was after the first command.
  expect(JSON.stringify(second.nextState.forgeHistory[0])).toBe(firstRecordSnapshot);
  expectValidState(second.nextState);
});
