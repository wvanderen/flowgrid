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
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
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

// Phase 6.1 Plan 03 Task 2 (CellBoard renders alongside the canvas mock):
// mock FlowgridCanvas so the layout route can mount AppLayout without WebGL
// (happy-dom has none). The mock keeps the same data-testid the layout-route
// canvas-persistence tests in flowgrid-home.test.tsx use. Stub ZLiftDock too —
// it renders Start/Finish/Cancel buttons with the SAME accessible names as
// GeneratorTile (two-paths-one-truth — D-08), so leaving it real would create
// strict-mode ambiguity in the existing CellBoard button tests. ZLiftDock's own
// parity is covered by tests/ui/z-lift-dock.test.tsx.
vi.mock('../../src/ui/flowgrid-home/FlowgridCanvas.js', () => ({
  FlowgridCanvas: (_props: { onCellTap: (cellId: string) => void; snapshot: unknown }): ReactNode => (
    <div data-testid="flowgrid-canvas-mock" />
  ),
}));
vi.mock('../../src/ui/shell/ZLiftDock.js', () => ({
  ZLiftDock: (): ReactNode => null,
}));

import { dispatch } from '../../src/app/store/dispatch.js';
import { flowgridStore } from '../../src/app/store/flowgrid-store.js';
import { deriveLocalDate } from '../../src/simulation/systems/day-rollover.js';
import type { CellRecord, FlowgridSnapshot } from '../../src/domain/index.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';

import { CellBoard } from '../../src/ui/cell-board/CellBoard.js';
import { EditCellForm } from '../../src/ui/cell-board/EditCellForm.js';
import { SessionTimer } from '../../src/ui/cell-board/SessionTimer.js';
import { AppLayout } from '../../src/ui/shell/AppLayout.js';
import { FlowgridHome } from '../../src/ui/flowgrid-home/FlowgridHome.js';
import { CorePanel } from '../../src/ui/core-panel/CorePanel.js';
import type { SessionRecord } from '../../src/domain/index.js';

const PREFIX = 'cb';
const NOW_ISO = '2026-01-02T09:00:00.000Z';
const BOUNDARY = '00:00';

const mockedDispatch = dispatch as unknown as ReturnType<typeof vi.fn>;

// dispatch(command, env, repository) is called with 3 args; assert on the command
// (first arg) directly via toMatchObject for a clean partial-deep check.
function expectSentCommand(partial: Record<string, unknown>): void {
  expect(mockedDispatch).toHaveBeenCalled();
  const lastCall = mockedDispatch.mock.calls.at(-1);
  expect(lastCall).toBeDefined();
  const sentCommand = lastCall![0] as Record<string, unknown>;
  expect(sentCommand).toMatchObject(partial);
}

function resetStore(): void {
  flowgridStore.setState({
    snapshot: null,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'loading',
    lastError: null,
    // Phase 6.1 Plan 01 added these view-state mirrors; reset them so tests
    // do not leak selectedCellId/takeoverActive between cases.
    selectedCellId: null,
    takeoverActive: false,
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
  // Term labels present (exact match — "Charge" the <dt>, not "Charge Core" the <h2>).
  expect(screen.getByText('XP')).toBeInTheDocument();
  expect(screen.getByText('Momentum')).toBeInTheDocument();
  expect(screen.getByText('Charge')).toBeInTheDocument();
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
  expectSentCommand({
    type: 'start_focus_session',
    cellId: ids.cellId,
  });
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

  expectSentCommand({
    type: 'cancel_focus_session',
    cellId: ids.cellId,
  });
});

test('GeneratorTile: Finish dispatches complete_focus_session with positive integer durationSeconds (SESS-02)', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  // startedAt is months before "now" so duration is large and positive (not sub-second).
  seedActive(state, ids.cellId, NOW_ISO);
  renderCellBoardAt(ids.cellId);

  fireEvent.click(screen.getByRole('button', { name: /^finish$/i }));

  expectSentCommand({
    type: 'complete_focus_session',
    cellId: ids.cellId,
    startedAt: NOW_ISO,
  });
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

  expectSentCommand({
    type: 'archive_cell',
    cellId: ids.cellId,
  });
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

  expectSentCommand({
    type: 'edit_cell',
    cellId: ids.cellId,
    name: 'Music',
  });
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

    // Vitest 4 fake-timer API: advanceTimersByTime takes ms (no BySeconds alias).
    // The interval's setElapsed must be flushed inside act() so React re-renders.
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByText('00:05')).toBeInTheDocument();

    unmount();
    // Advancing after unmount must not throw — interval cleared (T-03-12).
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
  } finally {
    vi.useRealTimers();
  }
});

// Keep ReactNode import meaningful for future JSX-typed helpers exports.
export type _UiNode = ReactNode;

// --- Task 2: SessionSummary mount (SESS-05 reachability) ---

function makeCompletedSession(cellId: string): SessionRecord {
  return {
    id: 'flowgrid:session:completed-1',
    cellId,
    startedAt: NOW_ISO,
    endedAt: '2026-06-23T10:00:00.000Z',
    durationSeconds: 1500,
    xpGained: 25,
    currentGenerated: 1500,
    bloomFired: true,
    activationGranted: true,
    energyGained: 0,
    coreChargeGained: 0,
    createdAt: '2026-06-23T10:00:00.000Z',
  };
}

test('CellBoard: renders SessionSummary when lastCompletedSession is non-null AND its cellId matches (SESS-05)', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  flowgridStore.setState({
    snapshot: state,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'ready',
    lastError: null,
    lastCompletedSession: makeCompletedSession(ids.cellId),
  });
  renderCellBoardAt(ids.cellId);

  expect(screen.getByText(/session complete/i)).toBeInTheDocument();
});

test('CellBoard: does NOT render SessionSummary when lastCompletedSession belongs to a different cell', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  flowgridStore.setState({
    snapshot: state,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'ready',
    lastError: null,
    lastCompletedSession: makeCompletedSession('flowgrid:cell:other'),
  });
  renderCellBoardAt(ids.cellId);

  expect(screen.queryByText(/session complete/i)).toBeNull();
});

// --- Phase 6.1 Plan 03 Task 2 (Test 3): CellBoard renders alongside the canvas
// mock via the persistent layout route; "Return to Flowgrid" keeps the canvas
// mounted. ---

// Mount CellBoard as a child of the pathless AppLayout layout route so the
// canvas mock (rendered by AppLayout) is present alongside CellBoard. Mirrors
// the renderLayoutRoute helper in tests/ui/flowgrid-home.test.tsx but starts
// at /cells/:cellId. Returns the in-router navigate API so tests can exercise
// REAL SPA navigation (the layout route persists across child swaps).
function renderCellBoardViaLayout(cellId: string): ReturnType<typeof createMemoryRouter> {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <FlowgridHome /> },
          { path: 'cells/:cellId', element: <CellBoard /> },
          { path: 'core', element: <CorePanel /> },
        ],
      },
    ],
    { initialEntries: [`/cells/${cellId}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

test('Cell route via layout: mirrors selectedCellId while the canvas mock stays mounted', () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  seedReady(state);

  renderCellBoardViaLayout(ids.cellId);

  // The canvas mock is mounted alongside CellBoard (the layout route's
  // persistent canvas slot — the 06-05 Task 3 root-cause fix).
  expect(screen.getByTestId('flowgrid-canvas-mock')).toBeInTheDocument();
  // The URL-mirrored selectedCellId was pushed into the store by AppLayout's
  // useEffect (D-01 view-state mirror — non-React consumers read this).
  expect(flowgridStore.getState().selectedCellId).toBe(ids.cellId);
});

test('Cell route via layout: Flowgrid heading link navigates to / WITHOUT unmounting the canvas mock', async () => {
  const { ids, state } = buildStarterSnapshot(PREFIX);
  seedReady(state);

  const router = renderCellBoardViaLayout(ids.cellId);

  // Capture the canvas mock element identity before navigation.
  const canvasBefore = screen.getByTestId('flowgrid-canvas-mock');
  expect(canvasBefore).toBeInTheDocument();

  // Click the app heading link to /. This is an in-app SPA navigation via React
  // Router, so AppLayout stays mounted and the canvas must NOT unmount.
  fireEvent.click(screen.getByRole('link', { name: /^flowgrid$/i }));

  // Wait for the index child to take over the Outlet.
  await screen.findByTestId('flowgrid-canvas-mock');

  // The same canvas DOM node is STILL attached — strict reference equality.
  expect(canvasBefore).toBe(screen.getByTestId('flowgrid-canvas-mock'));
  // selectedCellId mirror cleared (no /cells/:id match on /).
  expect(flowgridStore.getState().selectedCellId).toBeNull();
  expect(flowgridStore.getState().takeoverActive).toBe(false);

  // Sanity: router landed at /.
  expect(router.state.location.pathname).toBe('/');
});
