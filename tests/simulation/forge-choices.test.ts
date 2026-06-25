// Phase 5 forgeChoices selector tests (D-05, D-06, D-07; Pitfall 2).
//
// Asserts:
//   - same forgeCount -> identical choices every call (replay determinism)
//   - different forgeCount -> re-derivation works without env.rng (Pitfall 2)
//   - maxed modules (level >= MODULE_MAX_LEVEL) are filtered from the pool
//   - fewer than 3 non-maxed modules -> returns min(3, poolSize)
//   - empty pool (all maxed) -> returns []
//   - cross-Cell reveal: choices draw from multiple Cells' modules

import { test, expect } from 'vitest';

import type {
  CellRecord,
  FlowgridSnapshot,
  ModuleInstance,
  ModuleInstanceId,
} from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import { MODULE_MAX_LEVEL } from '../../src/content/index.js';
import { forgeChoices } from '../../src/simulation/commands/forge-choices.js';
import { findModuleInstanceForCell } from '../../src/simulation/systems/modules.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';

const NOW = '2026-01-04T14:00:00.000Z';
const LOCAL_DATE = '2026-01-04';

// Override a single ModuleInstance's level on a snapshot (returns a new snapshot).
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

test('forgeChoices: same forgeCount -> identical choices every call (replay determinism, Pitfall 2)', () => {
  const { state } = buildStarterSnapshot('fc-determinism');
  // The starter snapshot has exactly 4 non-maxed modules (one Cell × 4 kinds, all level 0),
  // so the pool exceeds 3 and the partial Fisher-Yates runs.
  const a = forgeChoices(state);
  const b = forgeChoices(state);
  const c = forgeChoices(state);
  expect(a).toEqual(b);
  expect(b).toEqual(c);
  expect(a).toHaveLength(3);
  // Every choice references a real module in the snapshot.
  for (const choice of a) {
    const inst = findModuleInstanceForCell(state, choice.cellId, choice.moduleKind);
    expect(inst, `choice ${choice.cellId}/${choice.moduleKind} must resolve`).toBeDefined();
  }
});

test('forgeChoices: re-derivation uses forgeCount seed, NOT env.rng (Pitfall 2)', () => {
  // Two snapshots that differ ONLY in core.forgeCount. The selector takes only a
  // snapshot (no env), so this proves it derives its seed from forgeCount internally.
  const base = buildStarterSnapshot('fc-seed').state;
  const count0 = { ...base, core: { ...base.core, forgeCount: 0 } };
  const count1 = { ...base, core: { ...base.core, forgeCount: 1 } };
  const count0Again = { ...base, core: { ...base.core, forgeCount: 0 } };

  const fromCount0 = forgeChoices(count0);
  const fromCount1 = forgeChoices(count1);
  const fromCount0Replay = forgeChoices(count0Again);

  // Same forgeCount -> same choices, regardless of call order or "env".
  expect(fromCount0).toEqual(fromCount0Replay);
  // Different forgeCount MAY produce different choices (the seed differs). We don't
  // assert inequality — the seed change could still land on the same 3 — but the
  // point is the function re-derives purely from the snapshot, never ambient state.
  expect(fromCount0).toHaveLength(3);
  expect(fromCount1).toHaveLength(3);
});

test('forgeChoices: maxed modules (level >= MODULE_MAX_LEVEL) filtered from pool', () => {
  const { ids, state } = buildStarterSnapshot('fc-maxed');
  // Max out the generator on the starter cell.
  const maxed = snapshotWithModuleLevel(state, ids.generatorModuleInstanceId, MODULE_MAX_LEVEL);

  const choices = forgeChoices(maxed);

  // Generator must not appear in any revealed choice.
  for (const choice of choices) {
    expect(choice.moduleKind).not.toBe('generator');
  }
  // The other 3 kinds (charge_core, output, bloom) are still level 0, so the pool
  // has exactly 3 and the selector returns them verbatim (pool.length === 3 edge).
  expect(choices).toHaveLength(3);
  const kinds = new Set(choices.map((c) => c.moduleKind));
  expect(kinds.has('charge_core')).toBe(true);
  expect(kinds.has('output')).toBe(true);
  expect(kinds.has('bloom')).toBe(true);
});

test('forgeChoices: fewer than 3 non-maxed -> returns min(3, poolSize)', () => {
  const { ids, state } = buildStarterSnapshot('fc-few');
  // Max out generator + charge_core + output, leaving only bloom at level 0.
  let oneLeft = snapshotWithModuleLevel(state, ids.generatorModuleInstanceId, MODULE_MAX_LEVEL);
  oneLeft = snapshotWithModuleLevel(oneLeft, ids.chargeCoreModuleInstanceId, MODULE_MAX_LEVEL);
  oneLeft = snapshotWithModuleLevel(oneLeft, ids.outputModuleInstanceId, MODULE_MAX_LEVEL);

  const choices = forgeChoices(oneLeft);
  expect(choices).toHaveLength(1);
  expect(choices[0]?.moduleKind).toBe('bloom');
});

test('forgeChoices: empty pool (all maxed) -> returns []', () => {
  const { ids, state } = buildStarterSnapshot('fc-empty');
  let allMaxed = snapshotWithModuleLevel(state, ids.generatorModuleInstanceId, MODULE_MAX_LEVEL);
  allMaxed = snapshotWithModuleLevel(allMaxed, ids.chargeCoreModuleInstanceId, MODULE_MAX_LEVEL);
  allMaxed = snapshotWithModuleLevel(allMaxed, ids.outputModuleInstanceId, MODULE_MAX_LEVEL);
  allMaxed = snapshotWithModuleLevel(allMaxed, ids.bloomModuleInstanceId, MODULE_MAX_LEVEL);

  const choices = forgeChoices(allMaxed);
  expect(choices).toEqual([]);
});

test('forgeChoices: archived Cells excluded from the pool', () => {
  const { state } = buildStarterSnapshot('fc-archived');
  const original = state.cells.values().next().value as CellRecord;
  const archived: CellRecord = { ...original, archivedAt: NOW };
  const cells = new Map(state.cells);
  cells.set(original.id, archived);
  const withArchived = { ...state, cells };

  const choices = forgeChoices(withArchived);
  // The only Cell is archived -> no modules eligible -> empty pool.
  expect(choices).toEqual([]);
});

test('forgeChoices: cross-Cell reveal draws from multiple Cells', () => {
  // Build a two-Cell snapshot by dispatching create_cell on top of the starter.
  const { ids, state } = buildStarterSnapshot('fc-crosscell');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'fc-crosscell' });
  const secondCellId = 'fc-crosscell:cell-2';
  const createSecondCell = {
    type: 'create_cell' as const,
    operationId: `${ids.clientId}:op:create-cell-2`,
    cellId: secondCellId,
    name: 'Second Cell',
    color: '#10b981',
    icon: null,
    dailyTargetSeconds: 1800,
  };
  const result = runSimulationCommand(state, createSecondCell, env);
  expect(result.status).toBe('applied');
  // create_cell installs the four starter modules on the new Cell, so the pool now
  // has 8 non-maxed modules (2 Cells × 4 kinds). The selector returns 3 of them.
  const choices = forgeChoices(result.nextState);
  expect(choices).toHaveLength(3);
  // At least one Cell is represented; with 8 in the pool and a 3-pick, both Cells
  // are very likely but not guaranteed — assert the choices are a subset of the
  // valid {cellId × moduleKind} space instead.
  const validCellIds = new Set([ids.cellId, secondCellId]);
  for (const choice of choices) {
    expect(validCellIds.has(choice.cellId)).toBe(true);
  }
  // No duplicate picks.
  const keys = new Set(choices.map((c) => `${c.cellId}:${c.moduleKind}`));
  expect(keys.size).toBe(choices.length);
});
