// Phase 3 create_cell command tests (CELL-05, D-09).
//
// Asserts create_cell:
//   - produces status 'applied', one CellRecord with correct identity fields
//   - instantiates four starter ModuleInstances (Generator, Charge Core, Output, Bloom)
//   - builds one Output route to the Core at allocationPercent 100
//   - emits exactly one SyncOperation
//   - rejects empty name, non-hex color, non-positive dailyTargetSeconds, duplicate cellId
//   - is exactly replayable (D-08)

import { test, expect } from 'vitest';

import type { CreateCellCommand } from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';
import { expectValidState } from '../helpers/expect-valid-state.js';
import { expectReplayEqual } from '../helpers/replay.js';

const NOW = '2026-01-02T09:00:00.000Z';
const LOCAL_DATE = '2026-01-02';
const NEW_CELL_ID = 'create-cell-test:new-cell';

function baseCommand(overrides: Partial<CreateCellCommand> = {}): CreateCellCommand {
  return {
    type: 'create_cell',
    operationId: 'create-cell-test:op:create-1',
    cellId: NEW_CELL_ID,
    name: 'Music',
    color: '#3b82f6',
    icon: 'music',
    dailyTargetSeconds: 1800,
    ...overrides,
  };
}

test('create_cell: valid input produces applied result with one cell, four starter modules, one Output route at 100%, one operation', () => {
  const { ids, state } = buildStarterSnapshot('create-cell-valid');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'create-cell' });
  const command = baseCommand();

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('applied');
  expect(result.previousState).toBe(state);
  expect(result.nextState).not.toBe(state);

  // One new Cell with the requested identity fields and D-10 defaults.
  const newCell = result.nextState.cells.get(NEW_CELL_ID);
  expect(newCell).toBeDefined();
  expect(newCell?.name).toBe('Music');
  expect(newCell?.color).toBe('#3b82f6');
  expect(newCell?.icon).toBe('music');
  expect(newCell?.archivedAt).toBeNull();
  expect(newCell?.activeSessionStartedAt).toBeNull();
  expect(newCell?.dailyMilestoneTargetSeconds).toBe(1800);
  expect(newCell?.xp).toBe(0);
  expect(newCell?.momentum).toBe(0);
  expect(newCell?.activation).toBe(0);

  // Four starter ModuleInstances attached to the new Cell (one per definition).
  const newModules = [...result.nextState.moduleInstances.values()].filter(
    (m) => m.ownerCellId === NEW_CELL_ID,
  );
  expect(newModules).toHaveLength(4);
  const newModuleDefinitionIds = new Set(newModules.map((m) => m.definitionId));
  expect(newModuleDefinitionIds.has('flowgrid:module-definition:generator')).toBe(true);
  expect(newModuleDefinitionIds.has('flowgrid:module-definition:charge-core')).toBe(true);
  expect(newModuleDefinitionIds.has('flowgrid:module-definition:output')).toBe(true);
  expect(newModuleDefinitionIds.has('flowgrid:module-definition:bloom')).toBe(true);

  // One Output route from the new Cell to the existing Core at allocationPercent 100.
  const newRoutes = [...result.nextState.routes.values()].filter(
    (r) => r.sourceCellId === NEW_CELL_ID,
  );
  expect(newRoutes).toHaveLength(1);
  expect(newRoutes[0]?.targetCoreId).toBe(ids.coreId);
  expect(newRoutes[0]?.allocationPercent).toBe(100);

  // Exactly one operation, command-supplied ID, entityType 'cell'.
  expect(result.operations).toHaveLength(1);
  expect(result.operations[0]?.commandType).toBe('create_cell');
  expect(result.operations[0]?.id).toBe(command.operationId);
  expect(result.operations[0]?.entityType).toBe('cell');

  // The starter cell still exists (create is additive).
  expect(result.nextState.cells.get(ids.cellId)).toBeDefined();

  expectValidState(result.nextState);
});

test('create_cell: empty name is rejected with unchanged state', () => {
  const { state } = buildStarterSnapshot('create-cell-empty-name');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'create-cell' });
  const command = baseCommand({ name: '   ' });

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(state);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
  expect(result.nextState.cells.has(NEW_CELL_ID)).toBe(false);
});

test('create_cell: non-hex color is rejected with unchanged state', () => {
  const { state } = buildStarterSnapshot('create-cell-bad-color');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'create-cell' });
  const command = baseCommand({ color: 'blue' });

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(state);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('create_cell: non-positive dailyTargetSeconds is rejected', () => {
  const { state } = buildStarterSnapshot('create-cell-zero-target');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'create-cell' });

  const result = runSimulationCommand(state, baseCommand({ dailyTargetSeconds: 0 }), env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(state);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('create_cell: duplicate cellId is rejected with unchanged state', () => {
  const { ids, state } = buildStarterSnapshot('create-cell-duplicate');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'create-cell' });
  const command = baseCommand({ cellId: ids.cellId });

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(state);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('create_cell: is exactly replayable (same inputs produce identical result)', () => {
  const { state } = buildStarterSnapshot('create-cell-replay');
  const envA = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'create-cell' });
  const envB = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'create-cell' });
  const command = baseCommand();

  const a = runSimulationCommand(state, command, envA);
  const b = runSimulationCommand(state, command, envB);

  expectReplayEqual(a, b);
});
