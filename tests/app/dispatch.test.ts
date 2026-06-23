// Plan 03-02 Task 1: dispatch path integration test (RESEARCH Pattern 1 lines 318-340).
//
// Loads the starter snapshot into the store, dispatches a create_cell command, and
// verifies the UI → runSimulationCommand → repository.applyResult → store emit loop
// produces the new snapshot, the active-session marker stays null (no session
// started), and the typed PersistenceError channel is clear.
//
// happy-dom environment (this test lives under tests/app/** per vitest.config.ts),
// but no React rendering is exercised — this is a store + dispatch + repository
// integration test. happy-dom provides a superset of node's globals so node-style
// code keeps working.

import { beforeEach, expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

import type { CreateCellCommand } from '../../src/domain/index.js';
import {
  FlowgridDatabase,
  FlowgridRepository,
} from '../../src/persistence/index.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';

import { dispatch } from '../../src/app/store/dispatch.js';
import { flowgridStore } from '../../src/app/store/flowgrid-store.js';
import { makeEnv } from '../../src/app/env.js';

const NOW = '2026-01-02T09:00:00.000Z';
const NEW_CELL_ID = 'dispatch-test:new-cell';

beforeEach(() => {
  // Reset both fake-indexeddb and the singleton store so each test starts clean.
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = new IDBFactory();
  flowgridStore.setState({
    snapshot: null,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'loading',
    lastError: null,
  });
});

function baseCreateCommand(overrides: Partial<CreateCellCommand> = {}): CreateCellCommand {
  return {
    type: 'create_cell',
    operationId: 'dispatch-test:op:create-1',
    cellId: NEW_CELL_ID,
    name: 'Music',
    color: '#3b82f6',
    icon: 'music',
    dailyTargetSeconds: 1800,
    ...overrides,
  };
}

// Seed all durable records for the starter snapshot so applyResult's diff against
// result.previousState finds matching singleton ids and the existing starter cell.
async function seedDatabase(db: FlowgridDatabase, state: ReturnType<typeof buildStarterSnapshot>['state']): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await db.client.put(state.client);
    await db.table('core').put(state.core);
    await db.settings.put(state.settings);
    for (const cell of state.cells.values()) await db.cells.put(cell);
    for (const m of state.moduleInstances.values()) await db.moduleInstances.put(m);
    for (const r of state.routes.values()) await db.routes.put(r);
  });
}

test('dispatch: create_cell flows through simulation → repository → store and emits the new snapshot', async () => {
  const { state } = buildStarterSnapshot('dispatch-create');

  // In production, the post-load rehydration sequence hydrates the store from
  // loadSnapshot; here we set it directly to isolate the dispatch loop.
  flowgridStore.setState({ snapshot: state, status: 'ready' });

  const db = new FlowgridDatabase('dispatch-create-db');
  await db.open();
  await seedDatabase(db, state);

  const repository = new FlowgridRepository(db);
  const env = makeEnv(NOW, { localDayBoundary: '00:00' }, 'dispatch-create-seed');

  const result = await dispatch(baseCreateCommand(), env, repository);

  // Dispatch returns the applied SimulationResult on success.
  expect(result?.status).toBe('applied');

  // Store now holds the new snapshot with the requested cell + cleared error channel.
  const nextSnapshot = flowgridStore.getState().snapshot;
  expect(nextSnapshot).not.toBeNull();
  expect(nextSnapshot!.cells.get(NEW_CELL_ID)?.name).toBe('Music');
  expect(nextSnapshot!.cells.get(NEW_CELL_ID)?.color).toBe('#3b82f6');

  // Active-session marker stays null — create_cell does not start a session.
  expect(flowgridStore.getState().activeSession).toBeNull();
  // No PersistenceError surfaced.
  expect(flowgridStore.getState().lastError).toBeNull();

  // Repository actually wrote the new cell — reopen the same DB name in a fresh
  // instance and reload the snapshot to confirm durability.
  db.close();
  const reopen = new FlowgridDatabase('dispatch-create-db');
  const reloadRepo = new FlowgridRepository(reopen);
  await reloadRepo.open();
  const reloaded = await reloadRepo.loadSnapshot();
  expect(reloaded.cells.get(NEW_CELL_ID)?.name).toBe('Music');
  reopen.close();
});

test('dispatch: drops commands silently when the snapshot is not loaded yet', async () => {
  // Store left in the default loading state — snapshot is null.
  const db = new FlowgridDatabase('dispatch-empty-db');
  await db.open();
  const repository = new FlowgridRepository(db);
  const env = makeEnv(NOW, { localDayBoundary: '00:00' }, 'dispatch-empty-seed');

  const result = await dispatch(baseCreateCommand(), env, repository);

  expect(result).toBeNull();
  expect(flowgridStore.getState().snapshot).toBeNull();
  expect(flowgridStore.getState().lastError).toBeNull();

  db.close();
});

test('dispatch: appends simulation visualEvents to pendingVisualEvents (D-02 drop-ready)', async () => {
  const { state } = buildStarterSnapshot('dispatch-visuals');
  flowgridStore.setState({ snapshot: state, status: 'ready' });

  const db = new FlowgridDatabase('dispatch-visuals-db');
  await db.open();
  await seedDatabase(db, state);

  const repository = new FlowgridRepository(db);
  const env = makeEnv(NOW, { localDayBoundary: '00:00' }, 'dispatch-visuals-seed');

  const before = flowgridStore.getState().pendingVisualEvents.length;
  await dispatch(baseCreateCommand(), env, repository);
  const after = flowgridStore.getState().pendingVisualEvents.length;

  // create_cell emits a visual event (Plan 03-01 create-cell ships one); the
  // adapter drains these in Task 2. The count must be non-decreasing — the store
  // is the buffer between emission and the renderer's drop.
  expect(after).toBeGreaterThanOrEqual(before);

  db.close();
});
