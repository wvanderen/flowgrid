// Plan 06.1-02 Task 2 RED: failing tests for ZLiftDock + Cell-list chrome collapse.
//
// Verifies (RESEARCH Pattern 5 render→UI handoff, Mobile Strategy + D-04 chrome
// collapse, D-08 semantic HTML beside the canvas):
//   - ZLiftDock renders null when no Cell is selected (idle home view).
//   - ZLiftDock renders Start Focus Session when a Cell is selected + no session;
//     clicking dispatches start_focus_session with the selected cellId (two-paths-
//     one-truth with GeneratorTile — D-08).
//   - ZLiftDock renders Finish + Cancel when activeSession.cellId === selectedCellId;
//     clicking Finish dispatches complete_focus_session (mirrors GeneratorTile);
//     clicking Cancel dispatches cancel_focus_session.
//   - Every interactive control has an accessible name (aria-label or associated
//     <label>) — axe-clean semantic HTML per D-08.
//   - AppLayout collapses the always-visible Cell-list `<nav aria-label="Cells">`
//     into a Radix Menu Cell-switcher below md: (D-04 chrome collapse). At md:+
//     the always-visible nav renders and the Cell-switcher is collapsed.
//
// happy-dom has no WebGL, no computed CSS for Tailwind responsive classes. We
// therefore mock FlowgridCanvas + the route children and assert DOM presence of
// the structural elements (the visual collapse is exercised by the human smoke
// in Plan 03). The dispatch mock + importActual pattern mirrors cell-board.test.tsx.

import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

// Stub the repository singleton so importing AppLayout (transitively, via
// dispatch/GeneratorTile/CreateCellForm/etc.) constructs no Dexie database.
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

// Mock FlowgridCanvas — happy-dom has no WebGL.
vi.mock('../../src/ui/flowgrid-home/FlowgridCanvas.js', () => ({
  FlowgridCanvas: (): ReactNode => <div data-testid="flowgrid-canvas-mock" />,
}));

// Stub sibling route children so the layout assertions are isolated.
vi.mock('../../src/ui/cell-board/CellBoard.js', () => ({
  CellBoard: (): ReactNode => <div data-testid="cell-board-stub" />,
}));
vi.mock('../../src/ui/core-panel/CorePanel.js', () => ({
  CorePanel: (): ReactNode => <div data-testid="core-panel-stub" />,
}));
// Stub CreateCellForm (AppLayout mounts a New Cell Dialog around it).
vi.mock('../../src/ui/cell-board/CreateCellForm.js', () => ({
  CreateCellForm: (): ReactNode => <div data-testid="create-cell-form-stub" />,
}));
// Stub the chrome peers whose own behavior is covered by their own suites.
vi.mock('../../src/ui/cell-board/ResumeSessionPrompt.js', () => ({
  ResumeSessionPrompt: (): ReactNode => null,
}));
vi.mock('../../src/ui/core-panel/RejuvenationResumePrompt.js', () => ({
  RejuvenationResumePrompt: (): ReactNode => null,
}));
vi.mock('../../src/ui/flowgrid-home/ArchivedCellsFilter.js', () => ({
  ArchivedCellsFilter: (): ReactNode => null,
}));
vi.mock('../../src/ui/flowgrid-home/ReturnCues.js', () => ({
  ReturnCues: (): ReactNode => null,
}));

import { dispatch } from '../../src/app/store/dispatch.js';
import { flowgridStore } from '../../src/app/store/flowgrid-store.js';
import { AppLayout } from '../../src/ui/shell/AppLayout.js';
import { FlowgridHome } from '../../src/ui/flowgrid-home/FlowgridHome.js';
import { CellBoard } from '../../src/ui/cell-board/CellBoard.js';
import { CellActions } from '../../src/ui/cell-board/CellActions.js';
import { CorePanel } from '../../src/ui/core-panel/CorePanel.js';
import { SettingsTakeover } from '../../src/ui/settings/SettingsTakeover.js';
import { ForgeTakeover } from '../../src/ui/forge-panel/ForgeTakeover.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';

const mockedDispatch = dispatch as unknown as ReturnType<typeof vi.fn>;

function expectSentCommand(partial: Record<string, unknown>): void {
  expect(mockedDispatch).toHaveBeenCalled();
  const lastCall = mockedDispatch.mock.calls.at(-1);
  expect(lastCall).toBeDefined();
  const sentCommand = lastCall![0] as Record<string, unknown>;
  expect(sentCommand).toMatchObject(partial);
}

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
  flowgridStore.setState({
    snapshot: state,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'ready',
    lastError: null,
    selectedCellId: null,
    takeoverActive: false,
  });
  return { cellId: ids.cellId };
}

function seedActiveSession(cellId: string, startedAt: string): void {
  flowgridStore.setState({
    activeSession: { cellId, startedAt },
  });
}

beforeEach(() => {
  cleanup();
  flowgridStore.setState({
    snapshot: null,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'loading',
    lastError: null,
    selectedCellId: null,
    takeoverActive: false,
  });
  mockedDispatch.mockClear();
});

afterEach(() => {
  cleanup();
});

// --- Test 1: ZLiftDock renders nothing when no Cell is selected ---

test('ZLiftDock: renders nothing (no dock cluster) when selectedCellId is null', () => {
  seedReady('dock-idle');
  renderLayoutRoute(['/']);

  // No "Start Focus Session" button should be present (the dock only renders it
  // when a Cell is selected). AppLayout is on / so selectedCellId is null.
  expect(screen.queryByRole('button', { name: /start focus session/i })).toBeNull();
});

// --- Test 2: Start Focus Session dispatches start_focus_session ---

test('ZLiftDock: Start Focus Session dispatches start_focus_session with the selected cellId (D-08 two-paths-one-truth)', () => {
  const { cellId } = seedReady('dock-start');
  renderLayoutRoute([`/cells/${cellId}`]);

  // selectedCellId is mirrored from the URL by AppLayout's useEffect; the dock
  // reads it from the store. Wait for the dock to render the Start button.
  const startButton = screen.getByRole('button', { name: /start focus session/i });
  fireEvent.click(startButton);

  expectSentCommand({
    type: 'start_focus_session',
    cellId,
  });
});

// --- Test 3: Finish + Cancel render when activeSession.cellId === selectedCellId ---

test('ZLiftDock: Finish dispatches complete_focus_session; Cancel dispatches cancel_focus_session when activeSession.cellId === selectedCellId', () => {
  const NOW = '2025-01-01T00:00:00.000Z';
  const { cellId } = seedReady('dock-active');
  seedActiveSession(cellId, NOW);
  renderLayoutRoute([`/cells/${cellId}`]);

  // Finish + Cancel should be reachable in the dock. (GeneratorTile in CellBoard
  // is mocked; only the dock surfaces them here.)
  const finishButton = screen.getByRole('button', { name: /^finish$/i });
  fireEvent.click(finishButton);
  expectSentCommand({
    type: 'complete_focus_session',
    cellId,
    startedAt: NOW,
  });

  mockedDispatch.mockClear();
  const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
  fireEvent.click(cancelButton);
  expectSentCommand({
    type: 'cancel_focus_session',
    cellId,
  });
});

// --- Test 4: every interactive control has an accessible name ---

test('ZLiftDock: every interactive control has an accessible name (D-08 axe-clean semantic HTML)', () => {
  const { cellId } = seedReady('dock-a11y');
  renderLayoutRoute([`/cells/${cellId}`]);

  const buttons = screen.getAllByRole('button');
  expect(buttons.length).toBeGreaterThan(0);
  for (const button of buttons) {
    // Every button must have a non-empty accessible name. We use
    // getRole('button', { name: <regex matching non-empty> }) indirectly by
    // asserting the element's own accessible-name computation.
    const name = button.getAttribute('aria-label') ?? button.textContent ?? '';
    expect(name.trim().length).toBeGreaterThan(0);
  }
});

// --- Test 5 (D-04 chrome collapse): Cell-list collapses to Radix Menu below md: ---

test('AppLayout: Cell-list collapses to a Radix Menu Cell-switcher (aria-haspopup="menu"); always-visible nav + switcher trigger coexist in the DOM (D-04 chrome collapse)', () => {
  seedReady('chrome-collapse');
  renderLayoutRoute(['/']);

  // The always-visible Cell-list `<nav aria-label="Cells">` exists in the DOM.
  // Its `hidden md:block` Tailwind class only hides it below md: when CSS is
  // applied; happy-dom does not compute CSS, so presence is the load-bearing
  // structural assertion (visual collapse is verified by Plan 03 human-smoke).
  const alwaysVisibleNav = screen.queryByRole('navigation', { name: 'Cells' });
  expect(alwaysVisibleNav).not.toBeNull();

  // The Radix Menu Cell-switcher trigger is a button with aria-haspopup="menu".
  // Use queryAllByRole because Radix may render the trigger as a button without
  // an accessible name beyond "Cells"; match by aria-haspopup.
  const switcherTriggers = screen.getAllByRole('button').filter(
    (b) => b.getAttribute('aria-haspopup') === 'menu',
  );
  expect(switcherTriggers.length).toBeGreaterThanOrEqual(1);
});

// --- Task 3: EditCellDialog — Radix Dialog for Cell edit (D-06) ---
//
// The existing CellActions renders an Edit button that opens a Radix Dialog with
// the EditCellForm pre-filled. Task 3 extracts that into a dedicated
// EditCellDialog component (mirrors the Cell-create Dialog pattern from
// AppLayout). These tests assert the post-refactor behavior is preserved:
//   - Edit button opens a Radix Dialog (role="dialog") with pre-filled fields.
//   - Submitting dispatches edit_cell with the new values.
//   - The Dialog uses Dialog.Portal (escapes the layout stacking context).
//   - Close/Cancel dismisses without dispatching.

// Helper: render CellActions inside a minimal memory router (CellActions calls
// useNavigate for the Archive flow). Render into a captured container so we can
// assert Portal-escapes-local-root behaviour below.
function renderCellActions(cellId: string): ReturnType<typeof render> {
  const router = createMemoryRouter(
    [{ path: '/cells/:cellId', element: <CellActions cellId={cellId} /> }],
    { initialEntries: [`/cells/${cellId}`] },
  );
  return render(<RouterProvider router={router} />);
}

test('EditCellDialog: CellActions Edit button opens a Radix Dialog (role="dialog") with the Cell-edit form pre-filled (D-06)', () => {
  const { cellId } = seedReady('edit-open');
  renderCellActions(cellId);

  const editButton = screen.getByRole('button', { name: /^edit$/i });
  fireEvent.click(editButton);

  // After click, a Radix Dialog with role="dialog" should be in the document
  // (Radix Portal mounts at document.body).
  const dialog = screen.getByRole('dialog');
  expect(dialog).toBeInTheDocument();

  // The Cell-edit form's Name field should be pre-filled with the existing
  // Cell's name (the starter snapshot's cell name is non-empty).
  const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
  expect(nameInput.value.length).toBeGreaterThan(0);
});

test('EditCellDialog: submitting the form dispatches edit_cell with the edited fields (CELL-03, D-11)', () => {
  const { cellId } = seedReady('edit-submit');
  renderCellActions(cellId);

  fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
  screen.getByRole('dialog');

  const nameInput = screen.getByLabelText(/name/i);
  fireEvent.change(nameInput, { target: { value: 'Renamed Cell' } });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  expectSentCommand({
    type: 'edit_cell',
    cellId,
    name: 'Renamed Cell',
  });
});

test('EditCellDialog: uses Dialog.Portal (the dialog renders at document.body, escaping the layout stacking context — Pitfall 5)', () => {
  const { cellId } = seedReady('edit-portal');
  const { container: appRoot } = renderCellActions(cellId);

  fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
  const dialog = screen.getByRole('dialog');

  // Radix Portal mounts the dialog at document.body, NOT inside the local app
  // root the component was rendered into. This is the load-bearing assertion
  // for Pitfall 5 (escape the canvas's stacking context).
  expect(document.body.contains(dialog)).toBe(true);
  expect(appRoot.contains(dialog)).toBe(false);
});

test('EditCellDialog: Cancel/Close dismisses the dialog without dispatching', () => {
  const { cellId } = seedReady('edit-cancel');
  renderCellActions(cellId);

  fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
  screen.getByRole('dialog');

  // Radix Dialog.Close renders the "Close" button. Click it.
  const closeButton = screen.getByRole('button', { name: /close edit dialog/i });
  fireEvent.click(closeButton);

  // No dispatch should have occurred from the close interaction.
  expect(mockedDispatch).not.toHaveBeenCalled();
});
