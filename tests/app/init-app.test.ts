// Plan 03-03 Task 2 RED: initApp app-open sequence test (D-13, BLOCKER fix).
//
// Drives the real FlowgridDatabase + FlowgridRepository against fake-indexeddb,
// calls initApp, and asserts the store transitions loading→ready with a non-null
// reconciled snapshot. Also asserts reconcileDayRollover ran (stale per-day state
// reset) and the failure path sets status 'error' with a non-null lastError.

import { beforeEach, expect, test, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

import type { CellRecord } from '../../src/domain/index.js';
import {
  FlowgridDatabase,
  FlowgridRepository,
} from '../../src/persistence/index.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';

import { flowgridStore } from '../../src/app/store/flowgrid-store.js';
import { initApp } from '../../src/app/store/dispatch.js';

const NOW = '2026-06-23T10:00:00.000Z';
const YESTERDAY_DATE = '2026-06-22';

function resetStore(): void {
  flowgridStore.setState({
    snapshot: null,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'loading',
    lastError: null,
  });
}

async function seedFullState(
  db: FlowgridDatabase,
  state: ReturnType<typeof buildStarterSnapshot>['state'],
): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await db.client.put(state.client);
    await db.table('core').put(state.core);
    await db.settings.put(state.settings);
    for (const cell of state.cells.values()) await db.cells.put(cell);
    for (const m of state.moduleInstances.values()) await db.moduleInstances.put(m);
    for (const r of state.routes.values()) await db.routes.put(r);
  });
}

beforeEach(() => {
  // Fresh in-memory IndexedDB + reset singleton store per test.
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = new IDBFactory();
  resetStore();
});

test('initApp: transitions store loading→ready with a non-null snapshot and null lastError on success', async () => {
  const { state } = buildStarterSnapshot('init-success');
  const db = new FlowgridDatabase('init-success-db');
  await db.open();
  await seedFullState(db, state);
  db.close();

  const repo = new FlowgridRepository(new FlowgridDatabase('init-success-db'));

  await initApp(repo);

  expect(flowgridStore.getState().status).toBe('ready');
  expect(flowgridStore.getState().snapshot).not.toBeNull();
  expect(flowgridStore.getState().lastError).toBeNull();

  await repo.close();
});

test('initApp: runs reconcileDayRollover so a stale cell has dailyMilestoneProgressSeconds reset to 0 (D-13)', async () => {
  const { ids, state } = buildStarterSnapshot('init-rollover');
  // Plant a cell whose lastBloomLocalDate is yesterday with non-zero daily progress.
  const staleCell: CellRecord = {
    ...state.cells.get(ids.cellId)!,
    dailyMilestoneProgressSeconds: 900,
    lastBloomLocalDate: YESTERDAY_DATE,
  };
  const cells = new Map(state.cells);
  cells.set(ids.cellId, staleCell);
  const seeded = { ...state, cells };

  const db = new FlowgridDatabase('init-rollover-db');
  await db.open();
  await seedFullState(db, seeded);
  db.close();

  const repo = new FlowgridRepository(new FlowgridDatabase('init-rollover-db'));
  await initApp(repo);

  const snapshot = flowgridStore.getState().snapshot;
  expect(snapshot).not.toBeNull();
  // reconcileDayRollover reset the stale daily progress to 0.
  expect(snapshot!.cells.get(ids.cellId)?.dailyMilestoneProgressSeconds).toBe(0);

  await repo.close();
});

test('initApp: sets status "error" and a non-null lastError when loadSnapshot throws', async () => {
  const db = new FlowgridDatabase('init-fail-db');
  await db.open();
  db.close();

  const repo = new FlowgridRepository(new FlowgridDatabase('init-fail-db'));
  // Force loadSnapshot to reject so initApp's failure path runs.
  vi.spyOn(repo, 'loadSnapshot').mockRejectedValueOnce(
    new Error('simulated load failure'),
  );

  await initApp(repo);

  expect(flowgridStore.getState().status).toBe('error');
  expect(flowgridStore.getState().lastError).not.toBeNull();

  vi.restoreAllMocks();
  await repo.close();
});
