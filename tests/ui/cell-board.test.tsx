// Plan 03-03 Task 1 RED: Cell Board UI tests.
//
// Covers CellBoard (route), ModuleTile, CellInspector, GeneratorTile (Start /
// Finish / Cancel), SessionTimer (cosmetic interval), CellActions (archive), and
// EditCellForm (identity-only edit_cell). CreateCellForm has its own test file.
//
// happy-dom environment. dispatch is mocked so tests assert on command shapes
// without touching IndexedDB; the repository singleton is stubbed so no Dexie DB
// is constructed. useFlowgridStore stays real (reads the singleton store seeded
// directly via flowgridStore.setState).

import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

// Stub the repository singleton so importing src/app/repository.js (transitively,
// via GeneratorTile/CreateCellForm/etc.) constructs no Dexie database. dispatch is
// mocked separately below and ignores the repository argument anyway.
vi.mock('../../src/app/repository.js', () => ({
  repository: {
    open: vi.fn(),
    loadSnapshot: vi.fn(),
    applyResult: vi.fn(),
  },
  database: {},
}));

// Mock dispatch but keep useFlowgridStore real (it reads the singleton store).
vi.mock('../../src/app/store/dispatch.js', async (importActual) => {
  const actual =
    await importActual<typeof import('../../src/app/store/dispatch.js')>();
  return { ...actual, dispatch: vi.fn() };
});

import { dispatch } from '../../src/app/store/dispatch.js';
import { flowgridStore } from '../../src/app/store/flowgrid-store.js';
import { deriveLocalDate } from '../../src/simulation/systems/day-rollover.js';
import type { CellRecord, FlowgridSnapshot } from '../../src/domain/index.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';

import { CellBoard } from '../../src/ui/cell-board/CellBoard.js';
import { EditCellForm } from '../../src/ui/cell-board/EditCellForm.js';
import { SessionTimer } from '../../src/ui/cell-board/SessionTimer.js';

const PREFIX = 'cb';
const NOW_ISO = '2026-01-02T09:00:00.000Z';
const BOUNDARY = '00:00';

const mockedDispatch = dispatch as unknown as ReturnType<typeof vi.fn>;

function resetStore(): void {
  flowgridStore.setState({
    snapshot: null,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'loading',
    lastError: null,
  });
}

function seedReady(snapshot: FlowgridSnapshot): void {
  flowgridStore.setState({
    snapshot,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'ready',
    lastError: null,
  });
}

function seedActive(snapshot: FlowgridSnapshot, cellId: string, startedAt: string): FlowgridSnapshot {
  const cells = new Map(snapshot.cells);
  const prev = cells.get(cellId);
  if (prev === undefined) throw new Error('seedActive: cell missing');
  cells.set(cellId, { ...prev, activeSessionStartedAt: startedAt });
  const next = { ...snapshot, cells };
  flowgridStore.setState({
    snapshot: next,
    activeSession: { cellId, startedAt },
    pendingVisualEvents: [],
    status: 'ready',
    lastError: null,
  });
  return next;
}

function renderCellBoardAt(cellId: string): ReturnType<typeof render> {
  const router = createMemoryRouter(
    [{ path: '/cells/:cellId', element: <CellBoard /> }],
    { initialEntries: [`/cells/${cellId}`] },
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  cleanup();
  resetStore();
  mockedDispatch.mockClear();
});

afterEach(() => {
  cleanup();
});

test('CellBoard: renders the cell name from getCellById when a valid cellId is in the URL', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  seedReady(state);
  renderCellBoardAt(ids.cellId);

  const cell = state.cells.get(ids.cellId)!;
  expect(
    screen.getByRole('heading', { level: 1, name: cell.name }),
  ).toBeInTheDocument();
});

test('CellBoard: renders a "Cell not found" message when the cellId does not exist', () => {
  const { state } = buildStarterSnapshot(PREFIX);
  seedReady(state);
  renderCellBoardAt('flowgrid:cell:does-not-exist');

  expect(screen.getByText(/not found/i)).toBeInTheDocument();
});

test('CellBoard: renders four ModuleTile components labeled Generator, Charge Core, Output, Bloom (UI-05)', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  seedReady(state);
  renderCellBoardAt(ids.cellId);

  expect(screen.getByRole('group', { name: /generator/i })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: /charge core/i })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: /output/i })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: /bloom/i })).toBeInTheDocument();
});

test('CellInspector: displays XP, Momentum, Charge, milestone progress, and Activation state (CELL-02)', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  // Force a known-economy cell so the assertions are deterministic.
  const cells = new Map(state.cells);
  const base = cells.get(ids.cellId)!;
  const cell: CellRecord = {
    ...base,
    xp: 42,
    momentum: 3,
    charge: 7,
    dailyMilestoneProgressSeconds: 600,
    dailyMilestoneTargetSeconds: 1800,
    lastBloomLocalDate: null,
  };
  cells.set(ids.cellId, cell);
  seedReady({ ...state, cells });

  renderCellBoardAt(ids.cellId);

  // Activation is derived from lastBloomLocalDate === today's local date. Starter
  // cell has lastBloomLocalDate null → "Not activated".
  expect(screen.getByText(/not activated/i)).toBeInTheDocument();
  // Milestone progress surfaced as "Xm / Ym".
  expect(screen.getByText(/10m\s*\/\s*30m/i)).toBeInTheDocument();
  // Term labels present.
  expect(screen.getByText(/xp/i)).toBeInTheDocument();
  expect(screen.getByText(/momentum/i)).toBeInTheDocument();
  expect(screen.getByText(/charge/i)).toBeInTheDocument();
});

test('CellInspector: shows "Activated today" when cell.lastBloomLocalDate === derived local date', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  const today = deriveLocalDate(new Date().toISOString(), BOUNDARY);
  const cells = new Map(state.cells);
  cells.set(ids.cellId, { ...cells.get(ids.cellId)!, lastBloomLocalDate: today });
  seedReady({ ...state, cells });

  renderCellBoardAt(ids.cellId);

  expect(screen.getByText(/activated today/i)).toBeInTheDocument();
});

test('GeneratorTile: shows a Start button when no session is active and dispatches start_focus_session on click (SESS-01)', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  seedReady(state);
  renderCellBoardAt(ids.cellId);

  const startButton = screen.getByRole('button', { name: /start focus session/i });
  fireEvent.click(startButton);

  expect(mockedDispatch).toHaveBeenCalledTimes(1);
  expect(mockedDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'start_focus_session',
      cellId: ids.cellId,
    }),
  );
});

test('GeneratorTile: shows Finish and Cancel buttons when a session is active on this cell (SESS-02/SESS-03)', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  seedActive(state, ids.cellId, NOW_ISO);
  renderCellBoardAt(ids.cellId);

  expect(screen.getByRole('button', { name: /^finish$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
});

test('GeneratorTile: Cancel dispatches cancel_focus_session (writes nothing durable per D-07)', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  seedActive(state, ids.cellId, NOW_ISO);
  renderCellBoardAt(ids.cellId);

  fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

  expect(mockedDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'cancel_focus_session',
      cellId: ids.cellId,
    }),
  );
});

test('GeneratorTile: Finish dispatches complete_focus_session with positive integer durationSeconds (SESS-02)', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  // startedAt is months before "now" so duration is large and positive (not sub-second).
  seedActive(state, ids.cellId, NOW_ISO);
  renderCellBoardAt(ids.cellId);

  fireEvent.click(screen.getByRole('button', { name: /^finish$/i }));

  expect(mockedDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'complete_focus_session',
      cellId: ids.cellId,
      startedAt: NOW_ISO,
    }),
  );
  const sentCommand = mockedDispatch.mock.calls[0]![0] as {
    durationSeconds: number;
    endedAt: string;
  };
  expect(Number.isInteger(sentCommand.durationSeconds)).toBe(true);
  expect(sentCommand.durationSeconds).toBeGreaterThan(0);
});

test('CellActions: archive button dispatches archive_cell (CELL-04, D-12)', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  seedReady(state);
  renderCellBoardAt(ids.cellId);

  fireEvent.click(screen.getByRole('button', { name: /archive/i }));

  expect(mockedDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'archive_cell',
      cellId: ids.cellId,
    }),
  );
});

test('EditCellForm: dispatches edit_cell with identity fields only — never economy fields (CELL-03, D-11)', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  const cell = state.cells.get(ids.cellId)!;
  seedReady(state);

  render(<EditCellForm cell={cell} onDone={vi.fn()} />);

  // Pre-filled name; overwrite it.
  const nameInput = screen.getByLabelText(/name/i);
  fireEvent.change(nameInput, { target: { value: 'Music' } });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  expect(mockedDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'edit_cell',
      cellId: ids.cellId,
      name: 'Music',
    }),
  );
  const sentCommand = mockedDispatch.mock.calls[0]![0] as Record<string, unknown>;
  // Economy fields are structurally impossible to send via the form (D-11).
  expect(sentCommand).not.toHaveProperty('xp');
  expect(sentCommand).not.toHaveProperty('current');
  expect(sentCommand).not.toHaveProperty('charge');
  expect(sentCommand).not.toHaveProperty('momentum');
});

test('SessionTimer: displays elapsed time and updates via cosmetic setInterval (D-06)', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW_ISO));
  try {
    const { unmount } = render(<SessionTimer startedAt={NOW_ISO} />);

    // Elapsed 0 at t0 → "00:00".
    expect(screen.getByText('00:00')).toBeInTheDocument();

    vi.advanceTimersBySeconds(5);
    expect(screen.getByText('00:05')).toBeInTheDocument();

    unmount();
    // Advancing after unmount must not throw — interval cleared (T-03-12).
    vi.advanceTimersBySeconds(10);
  } finally {
    vi.useRealTimers();
  }
});

// Keep ReactNode import meaningful for future JSX-typed helpers exports.
export type _UiNode = ReactNode;
