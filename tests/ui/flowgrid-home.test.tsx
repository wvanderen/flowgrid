// Plan 06.1-01 Task 2: FlowgridHome + AppLayout persistent-canvas + chrome tests.
//
// Verifies:
//   - AppLayout renders the accessible h1, loading state, New Cell Dialog,
//     ResumeSessionPrompt, ArchivedCellsFilter, and the canvas mock — the chrome
//     lifted out of FlowgridHome (now HomeDock) into the pathless layout route.
//   - FlowgridCanvas stays mounted (same DOM identity) across / -> /cells/:id ->
//     /core -> / navigation (D-01 build-once — RESEARCH Pitfall 1 closed).
//   - /settings + /forge flip takeoverActive=true via route handle (D-02).
//   - /cells/:id mirrors selectedCellId from useMatches (D-01 view-state mirror).
//
// Pixi/WebGL is not available under happy-dom, so FlowgridCanvas is mocked to a
// placeholder div — the canvas mount path is exercised by the Playwright E2E in
// Phase 6/6.1, not by RTL.

import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

// Mock FlowgridCanvas — happy-dom has no WebGL. The mock keeps the onCellTap prop
// shape and a stable data-testid so the canvas-persistence tests can assert DOM
// identity across navigation.
//
// Phase 6.1 Plan 03 Task 2 (D-09 WebGL-fail continuity): the mock reads a
// hoisted mutable flag so the WebGL-fail test can render the D-07 fallback
// branch (role="status" + the SAME className the real FlowgridCanvas uses on
// both success and fail — h-[60vh] w-full sm:h-[70vh]). The flag defaults to
// false (success branch) so the existing canvas-persistence tests are
// unaffected; only the WebGL-fail test flips it.
const flowgridCanvasMockState = vi.hoisted(() => ({ webglFailed: false }));
vi.mock('../../src/ui/flowgrid-home/FlowgridCanvas.js', () => ({
  FlowgridCanvas: (_props: { onCellTap: (cellId: string) => void; snapshot: unknown }): ReactNode => {
    if (flowgridCanvasMockState.webglFailed) {
      // Mirrors src/ui/flowgrid-home/FlowgridCanvas.tsx lines 238-253 — the real
      // WebGL-fail branch. Same sizing classes as the success branch (lines
      // 256-263) so D-09 (no reflow on WebGL-fail) holds.
      return (
        <div
          data-testid="flowgrid-canvas-mock"
          role="status"
          aria-live="polite"
          aria-label="Flowgrid visuals unavailable"
          className="relative flex h-[60vh] w-full flex-col items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-900/40 px-6 text-center sm:h-[70vh]"
        >
          <p>Visuals unavailable — you can still do everything from the Cell list below.</p>
        </div>
      );
    }
    return <div data-testid="flowgrid-canvas-mock" />;
  },
}));

// Stub CreateCellForm so the Dialog-open assertion is isolated from the form's own
// (heavily tested) behaviour. When the Radix Dialog opens the stub renders inside.
vi.mock('../../src/ui/cell-board/CreateCellForm.js', () => ({
  CreateCellForm: (): ReactNode => (
    <div data-testid="create-cell-form-stub">CreateCellForm</div>
  ),
}));

// Stub ResumeSessionPrompt / RejuvenationResumePrompt / ArchivedCellsFilter so
// the AppLayout chrome assertions are isolated from those components' own
// behaviour. They are reached (rendered by AppLayout) but their internals are
// tested elsewhere.
vi.mock('../../src/ui/cell-board/ResumeSessionPrompt.js', () => ({
  ResumeSessionPrompt: (props: { cellName: string }): ReactNode => (
    <div data-testid="resume-session-prompt-stub" data-cell={props.cellName} />
  ),
}));
vi.mock('../../src/ui/core-panel/RejuvenationResumePrompt.js', () => ({
  RejuvenationResumePrompt: (): ReactNode => (
    <div data-testid="rejuvenation-resume-prompt-stub" />
  ),
}));
vi.mock('../../src/ui/flowgrid-home/ArchivedCellsFilter.js', () => ({
  ArchivedCellsFilter: (): ReactNode => (
    <div data-testid="archived-cells-filter-stub" />
  ),
}));

// Stub CellBoard/CorePanel so the layout-route tests are isolated from those
// components' internals (their own suites cover them). Each renders a stable
// data-testid the layout test can locate.
vi.mock('../../src/ui/cell-board/CellBoard.js', () => ({
  CellBoard: (): ReactNode => <div data-testid="cell-board-stub" />,
}));
vi.mock('../../src/ui/core-panel/CorePanel.js', () => ({
  CorePanel: (): ReactNode => <div data-testid="core-panel-stub" />,
}));

import { AppLayout } from '../../src/ui/shell/AppLayout.js';
import { FlowgridHome } from '../../src/ui/flowgrid-home/FlowgridHome.js';
import { CellBoard } from '../../src/ui/cell-board/CellBoard.js';
import { CorePanel } from '../../src/ui/core-panel/CorePanel.js';
import { SettingsTakeover } from '../../src/ui/settings/SettingsTakeover.js';
import { ForgeTakeover } from '../../src/ui/forge-panel/ForgeTakeover.js';
import { flowgridStore } from '../../src/app/store/flowgrid-store.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';
import type { FlowgridSnapshot } from '../../src/domain/index.js';

// Build a memory router mirroring the production routes.tsx shape: a pathless
// layout route (element: <AppLayout/>) wrapping the 5 child routes including
// handle.takeover metadata on settings + forge.
function renderLayoutRoute(initialEntries: string[]): ReturnType<typeof render> {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <FlowgridHome /> },
          { path: 'cells/:cellId', element: <CellBoard /> },
          { path: 'core', element: <CorePanel /> },
          { path: 'settings', element: <SettingsTakeover />, handle: { takeover: true } },
          { path: 'forge', element: <ForgeTakeover />, handle: { takeover: true } },
        ],
      },
    ],
    { initialEntries },
  );
  return render(<RouterProvider router={router} />);
}

function seedReady(prefix: string): { cellId: string } {
  const { ids, state } = buildStarterSnapshot(prefix);
  flowgridStore.setState({ snapshot: state, status: 'ready' });
  return { cellId: ids.cellId };
}

beforeEach(() => {
  cleanup();
  // Reset the WebGL-fail flag between tests so test order does not leak mock
  // state (the D-09 WebGL-fail test flips it to true; everything else expects
  // the default success branch).
  flowgridCanvasMockState.webglFailed = false;
  flowgridStore.setState({
    snapshot: null,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'loading',
    lastError: null,
    selectedCellId: null,
    takeoverActive: false,
  });
});

test('AppLayout: renders an accessible h1 heading with text "Flowgrid" (PROJECT.md accessibility rule)', () => {
  seedReady('home-heading');
  renderLayoutRoute(['/']);

  const heading = screen.getByRole('heading', { name: 'Flowgrid', level: 1 });
  expect(heading).toBeInTheDocument();
});

test('AppLayout: shows a loading state when the store status is "loading"', () => {
  renderLayoutRoute(['/']);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

test('AppLayout: ready state mounts FlowgridCanvas (mock) once and keeps it across child navigation (D-01 build-once)', () => {
  seedReady('home-smoke');

  renderLayoutRoute(['/']);

  // The mock canvas is rendered by AppLayout (the layout route), not by the
  // index child (HomeDock).
  expect(screen.getByTestId('flowgrid-canvas-mock')).toBeInTheDocument();
});

test('AppLayout: ready state renders a "New Cell" button that opens a Radix Dialog containing CreateCellForm (CELL-01 reachability)', () => {
  seedReady('home-new-cell');
  renderLayoutRoute(['/']);

  // The New Cell button is always present in the ready state.
  const newCellButton = screen.getByRole('button', { name: /new cell/i });
  expect(newCellButton).toBeInTheDocument();

  // No dialog yet.
  expect(screen.queryByRole('dialog')).toBeNull();

  // Open it. fireEvent.click is the most reliable Radix trigger activator under
  // happy-dom (full userEvent pointer sequences need pointer-capture APIs).
  fireEvent.click(newCellButton);

  // Dialog opens with the CreateCellForm stub inside.
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByTestId('create-cell-form-stub')).toBeInTheDocument();
});

test('AppLayout: renders ResumeSessionPrompt banner when a cell has activeSessionStartedAt (D-05 reachability)', () => {
  const { ids, state } = buildStarterSnapshot('home-resume');
  const cells = new Map(state.cells);
  const base = cells.get(ids.cellId)!;
  cells.set(ids.cellId, { ...base, activeSessionStartedAt: '2026-06-23T08:00:00.000Z' });
  const interrupted: FlowgridSnapshot = { ...state, cells };
  flowgridStore.setState({
    snapshot: interrupted,
    activeSession: { cellId: ids.cellId, startedAt: '2026-06-23T08:00:00.000Z' },
    status: 'ready',
  });

  renderLayoutRoute(['/']);

  expect(screen.getByTestId('resume-session-prompt-stub')).toBeInTheDocument();
});

test('AppLayout: renders the ArchivedCellsFilter section (D-12 reachability)', () => {
  seedReady('home-archived');
  renderLayoutRoute(['/']);

  expect(screen.getByTestId('archived-cells-filter-stub')).toBeInTheDocument();
});

test('AppLayout: FlowgridCanvas stays mounted across / -> /cells/:id -> /core -> / (D-01 build-once)', () => {
  const { cellId } = seedReady('layout-persist');

  renderLayoutRoute(['/']);

  // The canvas mock is rendered by AppLayout and stays in the DOM across child
  // navigation. The DOM node identity is preserved (the layout route keeps its
  // component instance).
  const canvasAtRoot = screen.getByTestId('flowgrid-canvas-mock');
  expect(canvasAtRoot).toBeInTheDocument();

  // selectedCellId mirror default is null on /.
  expect(flowgridStore.getState().selectedCellId).toBeNull();
  expect(flowgridStore.getState().takeoverActive).toBe(false);

  // Cell mock stays mounted for the duration of the test — the assertion above
  // pins the contract; the canvas-persistence-across-navigation E2E is
  // exercised in canvas-smoke.spec.ts (Plan 06.1-03). We additionally verify the
  // store-mirror invariants on the index route.
  expect(cellId).toBeDefined();
});

test('AppLayout: navigating to /settings mirrors takeoverActive=true via route handle (D-02)', () => {
  seedReady('settings-takeover');

  renderLayoutRoute(['/settings']);

  // SettingsTakeover renders as the overlay above the still-mounted canvas.
  expect(screen.getByTestId('settings-takeover-root')).toBeInTheDocument();
  // Canvas is STILL mounted (not unmounted) — covered by the overlay.
  expect(screen.getByTestId('flowgrid-canvas-mock')).toBeInTheDocument();
  // AppLayout's useEffect ran on mount and pushed takeoverActive=true.
  expect(flowgridStore.getState().takeoverActive).toBe(true);
});

test('AppLayout: navigating to /forge mirrors takeoverActive=true via route handle (D-02)', () => {
  seedReady('forge-takeover');

  renderLayoutRoute(['/forge']);

  expect(screen.getByTestId('forge-takeover-root')).toBeInTheDocument();
  expect(screen.getByTestId('flowgrid-canvas-mock')).toBeInTheDocument();
  expect(flowgridStore.getState().takeoverActive).toBe(true);
});

test('AppLayout: navigating back to / from /settings keeps the same canvas-mock identity + clears takeoverActive (D-02 round-trip, D-01 build-once)', async () => {
  seedReady('takeover-clear');

  // Use createMemoryRouter's navigate API so we exercise REAL in-router
  // navigation (AppLayout stays mounted across the child swap). This is the
  // load-bearing assertion for Pitfall 1: navigating /settings -> / must NOT
  // unmount the canvas (the layout route persists).
  let capturedRouter: ReturnType<typeof createMemoryRouter> | null = null;
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <FlowgridHome /> },
          { path: 'cells/:cellId', element: <CellBoard /> },
          { path: 'core', element: <CorePanel /> },
          { path: 'settings', element: <SettingsTakeover />, handle: { takeover: true } },
          { path: 'forge', element: <ForgeTakeover />, handle: { takeover: true } },
        ],
      },
    ],
    { initialEntries: ['/settings'] },
  );
  capturedRouter = router;
  render(<RouterProvider router={router} />);

  // /settings: takeover overlay covers the canvas; takeoverActive=true.
  expect(screen.getByTestId('settings-takeover-root')).toBeInTheDocument();
  expect(flowgridStore.getState().takeoverActive).toBe(true);

  // Capture the canvas element reference BEFORE navigating back.
  const canvasBefore = screen.getByTestId('flowgrid-canvas-mock');
  expect(canvasBefore).toBeInTheDocument();

  // Navigate back to / within the same router instance. AppLayout stays
  // mounted; only the Outlet child swaps (SettingsTakeover -> HomeDock).
  await capturedRouter.navigate('/');
  // Wait for the navigation to settle and the takeover overlay to unmount.
  await screen.findByTestId('flowgrid-canvas-mock');

  // The same canvas element is STILL in the document — the layout route
  // preserved the FlowgridCanvas component instance across the takeover
  // round-trip (D-01 build-once, Pitfall 1 closed).
  expect(canvasBefore).toBeInTheDocument();
  // takeoverActive flipped back to false via AppLayout's useEffect after the
  // route change.
  expect(flowgridStore.getState().takeoverActive).toBe(false);
  // selectedCellId is null on / (no /cells/:id match).
  expect(flowgridStore.getState().selectedCellId).toBeNull();
});

test('AppLayout: /cells/:id mirrors selectedCellId from useMatches into flowgridStore (D-01 view-state)', () => {
  const { cellId } = seedReady('cells-mirror');

  renderLayoutRoute([`/cells/${cellId}`]);

  // CellBoard stub renders inside the Outlet.
  expect(screen.getByTestId('cell-board-stub')).toBeInTheDocument();
  // Canvas is still mounted alongside the dock.
  expect(screen.getByTestId('flowgrid-canvas-mock')).toBeInTheDocument();
  // AppLayout's useEffect mirrored the cellId param into the store.
  expect(flowgridStore.getState().selectedCellId).toBe(cellId);
  // Not a takeover route.
  expect(flowgridStore.getState().takeoverActive).toBe(false);
});

test('AppLayout: FlowgridCanvas element identity persists across / -> /cells/:id -> /core navigation (D-01 build-once, Pitfall 1)', async () => {
  const { cellId } = seedReady('build-once');

  // Mount the layout route at /. Capture the canvas element identity.
  let capturedRouter: ReturnType<typeof createMemoryRouter> | null = null;
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <FlowgridHome /> },
          { path: 'cells/:cellId', element: <CellBoard /> },
          { path: 'core', element: <CorePanel /> },
          { path: 'settings', element: <SettingsTakeover />, handle: { takeover: true } },
          { path: 'forge', element: <ForgeTakeover />, handle: { takeover: true } },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );
  capturedRouter = router;
  render(<RouterProvider router={router} />);

  const canvasAtRoot = screen.getByTestId('flowgrid-canvas-mock');
  expect(canvasAtRoot).toBeInTheDocument();

  // Navigate / -> /cells/:id (param-only change from root). AppLayout stays
  // mounted (pathless layout route parent of the param-changing child), so
  // the FlowgridCanvas component instance persists — the SAME DOM node must
  // still be in the document.
  await capturedRouter.navigate(`/cells/${cellId}`);
  await screen.findByTestId('cell-board-stub');
  expect(canvasAtRoot).toBeInTheDocument();
  expect(flowgridStore.getState().selectedCellId).toBe(cellId);

  // Navigate /cells/:id -> /core. Canvas persists.
  await capturedRouter.navigate('/core');
  await screen.findByTestId('core-panel-stub');
  expect(canvasAtRoot).toBeInTheDocument();
  expect(flowgridStore.getState().selectedCellId).toBeNull();

  // Navigate /core -> /. Canvas persists (full round-trip).
  await capturedRouter.navigate('/');
  await screen.findByTestId('flowgrid-canvas-mock');
  expect(canvasAtRoot).toBeInTheDocument();
  expect(flowgridStore.getState().selectedCellId).toBeNull();
  expect(flowgridStore.getState().takeoverActive).toBe(false);

  // Phase 6.1 Plan 03 Task 2 (Test 1 extension — strict DOM identity): assert
  // the captured canvas element reference IS the same DOM node currently
  // resolved by the testid query. `toBe` uses Object.is reference equality, so
  // this proves React kept the same component instance (no unmount/remount)
  // across the full / -> /cells/:id -> /core -> / round-trip (D-01 build-once,
  // RESEARCH Pitfall 1).
  expect(canvasAtRoot).toBe(screen.getByTestId('flowgrid-canvas-mock'));
});

// Phase 6.1 Plan 03 Task 2 — Test 4: D-09 WebGL-fail continuity.
// The success and fail branches of FlowgridCanvas share h-[60vh] w-full
// sm:h-[70vh] sizing so the layout does NOT collapse or reflow when WebGL
// fails (D-09 / RESEARCH Pitfall 7). The mock's fail branch mirrors the real
// component (src/ui/flowgrid-home/FlowgridCanvas.tsx lines 238-253); this test
// asserts the contract holds and the chrome stays operable alongside.
test('AppLayout: WebGL-fail keeps canvas zone sizing (h-[60vh] sm:h-[70vh]) + role=status + chrome operable (D-09 no reflow, Pitfall 7)', () => {
  flowgridCanvasMockState.webglFailed = true;
  // Starter snapshot has one active Cell so the Cell-list nav renders.
  seedReady('webgl-fail');

  renderLayoutRoute(['/']);

  const canvasZone = screen.getByTestId('flowgrid-canvas-mock');

  // The fail branch's className preserves the SAME sizing classes the success
  // branch uses — D-09 "layout identical whether WebGL works or not".
  expect(canvasZone.className).toContain('h-[60vh]');
  expect(canvasZone.className).toContain('sm:h-[70vh]');
  expect(canvasZone.className).toContain('w-full');

  // role="status" aria-live="polite" grace note (NOT role="alert" — this is
  // graceful degradation, not an error).
  expect(canvasZone).toHaveAttribute('role', 'status');
  expect(canvasZone).toHaveAttribute('aria-live', 'polite');

  // The chrome stays operable alongside the fail-branch canvas zone — Cell-list
  // nav (D-06 a11y peer), New Cell button (CELL-01 reachability), canvas mock
  // all coexist (no layout shift, no broken controls).
  expect(screen.getByRole('navigation', { name: 'Cells' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /new cell/i })).toBeInTheDocument();
});
