// VER-03 P1: changed-record detection edge cases for diffFlowgridSnapshots.
// Pure — no IndexedDB, no Dexie. The repository's atomic write path is covered
// by repository.test.ts and append-only.test.ts.

import { expect, test } from 'vitest';

import { diffFlowgridSnapshots } from '../../src/persistence/index.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';

test('identical snapshots produce an empty plan', () => {
  const { state } = buildStarterSnapshot('diff-identical');
  const plan = diffFlowgridSnapshots(state, state);

  expect(plan.cellPuts).toEqual([]);
  expect(plan.moduleInstancePuts).toEqual([]);
  expect(plan.routePuts).toEqual([]);
  expect(plan.cellDeletes).toEqual([]);
  expect(plan.moduleInstanceDeletes).toEqual([]);
  expect(plan.routeDeletes).toEqual([]);
  expect(plan.clientPut).toBeNull();
  expect(plan.corePut).toBeNull();
  expect(plan.settingsPut).toBeNull();
  expect(plan.appendSessions).toEqual([]);
  expect(plan.appendOperations).toEqual([]);
  expect(plan.appendForgeHistory).toEqual([]);
});

test('a single changed cell produces exactly one cellPut and nothing else', () => {
  const { state } = buildStarterSnapshot('diff-one-cell');
  const [cellId, originalCell] = [...state.cells.entries()][0]!;
  const changedCell = { ...originalCell, xp: originalCell.xp + 10 };
  const next = {
    ...state,
    cells: new Map(state.cells).set(cellId, changedCell),
  };

  const plan = diffFlowgridSnapshots(state, next);

  expect(plan.cellPuts).toEqual([changedCell]);
  expect(plan.moduleInstancePuts).toEqual([]);
  expect(plan.routePuts).toEqual([]);
  expect(plan.cellDeletes).toEqual([]);
  expect(plan.clientPut).toBeNull();
  expect(plan.corePut).toBeNull();
  expect(plan.settingsPut).toBeNull();
  expect(plan.appendSessions).toEqual([]);
  expect(plan.appendOperations).toEqual([]);
});

test('a deleted cell produces exactly one cellDelete', () => {
  const { state } = buildStarterSnapshot('diff-delete-cell');
  const [cellId] = [...state.cells.entries()][0]!;
  const next = {
    ...state,
    cells: new Map(),
  };

  const plan = diffFlowgridSnapshots(state, next);

  expect(plan.cellDeletes).toEqual([cellId]);
  expect(plan.cellPuts).toEqual([]);
});

test('a changed client singleton produces a clientPut only', () => {
  const { state } = buildStarterSnapshot('diff-client');
  const next = {
    ...state,
    client: { ...state.client, updatedAt: '2026-02-02T00:00:00.000Z' },
  };

  const plan = diffFlowgridSnapshots(state, next);

  expect(plan.clientPut).toEqual(next.client);
  expect(plan.corePut).toBeNull();
  expect(plan.settingsPut).toBeNull();
  expect(plan.cellPuts).toEqual([]);
});

test('appended sessions/operations are detected by id', () => {
  const { state } = buildStarterSnapshot('diff-append');
  const appendedSession = {
    ...state,
    sessions: [
      ...state.sessions,
      {
        id: 'sess-1',
        cellId: [...state.cells.keys()][0]!,
        startedAt: '2026-01-01T10:00:00.000Z',
        endedAt: '2026-01-01T10:25:00.000Z',
        durationSeconds: 1500,
        xpGained: 25,
        currentGenerated: 1500,
        bloomFired: true,
        activationGranted: true,
        energyGained: 750,
        coreChargeGained: 750,
        createdAt: '2026-01-01T10:25:00.000Z',
      },
    ],
  };

  const plan = diffFlowgridSnapshots(state, appendedSession);

  expect(plan.appendSessions).toHaveLength(1);
  expect(plan.appendSessions[0]?.id).toBe('sess-1');
  expect(plan.appendOperations).toEqual([]);
});
