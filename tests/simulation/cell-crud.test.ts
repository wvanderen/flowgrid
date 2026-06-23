// Phase 3 edit/archive/unarchive cell tests (CELL-03, CELL-04, D-11, D-12).
//
// Asserts:
//   - edit_cell changes identity fields only (name, color, icon, dailyTargetSeconds)
//     and NEVER touches economy fields (xp/current/charge/momentum/activation)
//   - edit_cell rejects when cellId does not exist
//   - archive_cell sets archivedAt to env.now; rejects an already-archived cell
//   - unarchive_cell clears archivedAt to null; rejects a non-archived cell
//   - all three are exactly replayable

import { test, expect } from 'vitest';

import type {
  ArchiveCellCommand,
  CellRecord,
  EditCellCommand,
  FlowgridSnapshot,
  UnarchiveCellCommand,
} from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';
import { expectValidState } from '../helpers/expect-valid-state.js';
import { expectReplayEqual } from '../helpers/replay.js';

const NOW = '2026-01-03T11:00:00.000Z';
const LOCAL_DATE = '2026-01-03';

function snapshotWithCell(
  state: FlowgridSnapshot,
  overrides: Partial<CellRecord>,
): FlowgridSnapshot {
  const original = state.cells.values().next().value as CellRecord;
  const updated: CellRecord = { ...original, ...overrides };
  const cells = new Map(state.cells);
  cells.set(original.id, updated);
  return { ...state, cells };
}

test('edit_cell: changes identity fields and preserves all economy fields (D-11)', () => {
  const { ids, state } = buildStarterSnapshot('edit-cell-preserve');
  // Seed economy fields so we can assert they are untouched.
  const seeded = snapshotWithCell(state, {
    xp: 120,
    current: 40,
    charge: 15,
    momentum: 3,
    activation: 2,
    dailyMilestoneProgressSeconds: 600,
  });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'edit-cell' });

  const command: EditCellCommand = {
    type: 'edit_cell',
    operationId: `${ids.clientId}:op:edit-1`,
    cellId: ids.cellId,
    name: 'Writing',
    color: '#10b981',
    icon: 'pen',
    dailyTargetSeconds: 2400,
  };

  const result = runSimulationCommand(seeded, command, env);

  expect(result.status).toBe('applied');
  const cell = result.nextState.cells.get(ids.cellId) as CellRecord;
  expect(cell.name).toBe('Writing');
  expect(cell.color).toBe('#10b981');
  expect(cell.icon).toBe('pen');
  expect(cell.dailyMilestoneTargetSeconds).toBe(2400);
  expect(cell.updatedAt).toBe(NOW);

  // Economy fields UNCHANGED.
  expect(cell.xp).toBe(120);
  expect(cell.current).toBe(40);
  expect(cell.charge).toBe(15);
  expect(cell.momentum).toBe(3);
  expect(cell.activation).toBe(2);
  expect(cell.dailyMilestoneProgressSeconds).toBe(600);

  expect(result.operations).toHaveLength(1);
  expect(result.operations[0]?.commandType).toBe('edit_cell');
  expectValidState(result.nextState);
});

test('edit_cell: rejects when cellId does not exist', () => {
  const { ids, state } = buildStarterSnapshot('edit-cell-missing');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'edit-cell' });

  const command: EditCellCommand = {
    type: 'edit_cell',
    operationId: `${ids.clientId}:op:edit-missing`,
    cellId: 'no-such-cell',
    name: 'X',
    color: '#000000',
    icon: null,
    dailyTargetSeconds: 1500,
  };

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('rejected');
  expect(result.nextState).toEqual(state);
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('edit_cell: rejects invalid color / empty name / non-positive target', () => {
  const { ids, state } = buildStarterSnapshot('edit-cell-invalid');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'edit-cell' });

  const baseEdit = (overrides: Partial<EditCellCommand>): EditCellCommand => ({
    type: 'edit_cell',
    operationId: `${ids.clientId}:op:edit`,
    cellId: ids.cellId,
    name: 'X',
    color: '#000000',
    icon: null,
    dailyTargetSeconds: 1500,
    ...overrides,
  });

  const badName = runSimulationCommand(state, baseEdit({ name: '' }), env);
  expect(badName.status).toBe('rejected');

  const badColor = runSimulationCommand(state, baseEdit({ color: 'purple' }), env);
  expect(badColor.status).toBe('rejected');

  const badTarget = runSimulationCommand(state, baseEdit({ dailyTargetSeconds: -5 }), env);
  expect(badTarget.status).toBe('rejected');
});

test('edit_cell: is exactly replayable', () => {
  const { ids, state } = buildStarterSnapshot('edit-cell-replay');
  const envA = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'edit-cell' });
  const envB = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'edit-cell' });

  const command: EditCellCommand = {
    type: 'edit_cell',
    operationId: `${ids.clientId}:op:edit-replay`,
    cellId: ids.cellId,
    name: 'Replay',
    color: '#abcdef',
    icon: 'star',
    dailyTargetSeconds: 2000,
  };

  const a = runSimulationCommand(state, command, envA);
  const b = runSimulationCommand(state, command, envB);
  expectReplayEqual(a, b);
});

test('archive_cell: sets archivedAt to env.now and emits one operation', () => {
  const { ids, state } = buildStarterSnapshot('archive-cell');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'archive-cell' });

  const command: ArchiveCellCommand = {
    type: 'archive_cell',
    operationId: `${ids.clientId}:op:archive-1`,
    cellId: ids.cellId,
  };

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('applied');
  const cell = result.nextState.cells.get(ids.cellId) as CellRecord;
  expect(cell.archivedAt).toBe(NOW);
  // No economy field changed.
  expect(cell.xp).toBe(state.cells.get(ids.cellId)?.xp);
  expect(result.operations).toHaveLength(1);
  expect(result.operations[0]?.commandType).toBe('archive_cell');
  expectValidState(result.nextState);
});

test('archive_cell: rejects an already-archived cell', () => {
  const { ids, state } = buildStarterSnapshot('archive-cell-already');
  const archived = snapshotWithCell(state, { archivedAt: '2026-01-01T00:00:00.000Z' });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'archive-cell' });

  const command: ArchiveCellCommand = {
    type: 'archive_cell',
    operationId: `${ids.clientId}:op:archive-dup`,
    cellId: ids.cellId,
  };

  const result = runSimulationCommand(archived, command, env);

  expect(result.status).toBe('rejected');
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});

test('archive_cell: rejects when cellId does not exist', () => {
  const { ids, state } = buildStarterSnapshot('archive-cell-missing');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'archive-cell' });

  const command: ArchiveCellCommand = {
    type: 'archive_cell',
    operationId: `${ids.clientId}:op:archive-missing`,
    cellId: 'no-such-cell',
  };

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('rejected');
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
  void ids;
});

test('unarchive_cell: clears archivedAt to null', () => {
  const { ids, state } = buildStarterSnapshot('unarchive-cell');
  const archived = snapshotWithCell(state, { archivedAt: '2026-01-01T00:00:00.000Z' });
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'unarchive-cell' });

  const command: UnarchiveCellCommand = {
    type: 'unarchive_cell',
    operationId: `${ids.clientId}:op:unarchive-1`,
    cellId: ids.cellId,
  };

  const result = runSimulationCommand(archived, command, env);

  expect(result.status).toBe('applied');
  const cell = result.nextState.cells.get(ids.cellId) as CellRecord;
  expect(cell.archivedAt).toBeNull();
  expect(result.operations).toHaveLength(1);
  expect(result.operations[0]?.commandType).toBe('unarchive_cell');
  expectValidState(result.nextState);
});

test('unarchive_cell: rejects a non-archived cell', () => {
  const { ids, state } = buildStarterSnapshot('unarchive-cell-not-archived');
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'unarchive-cell' });

  const command: UnarchiveCellCommand = {
    type: 'unarchive_cell',
    operationId: `${ids.clientId}:op:unarchive-dup`,
    cellId: ids.cellId,
  };

  const result = runSimulationCommand(state, command, env);

  expect(result.status).toBe('rejected');
  expect(result.validationIssues.some((i) => i.code === 'invalid_reference')).toBe(true);
});
