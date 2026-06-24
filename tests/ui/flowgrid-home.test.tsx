// Plan 03-02 Task 2 RED: FlowgridHome component tests.
//
// Verifies the React shell that wraps the Pixi canvas renders an accessible
// heading, a loading state before the snapshot arrives, and survives the happy-dom
// RTL smoke path. Pixi/WebGL is not available under happy-dom, so FlowgridCanvas
// is mocked to a placeholder div — the canvas mount path is exercised by the
// Playwright E2E in Phase 6, not by RTL.

import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

// Mock FlowgridCanvas — happy-dom has no WebGL and FlowgridHome only needs to
// know the canvas container renders when status === 'ready'. The mock keeps the
// onCellTap prop shape so future integration tests can extend it.
vi.mock('../../src/ui/flowgrid-home/FlowgridCanvas.js', () => ({
  FlowgridCanvas: (_props: { onCellTap: (cellId: string) => void; snapshot: unknown }): ReactNode => (
    <div data-testid="flowgrid-canvas-mock" />
  ),
}));

// Stub CreateCellForm so the Dialog-open assertion is isolated from the form's own
// (heavily tested) behaviour. When the Radix Dialog opens the stub renders inside.
vi.mock('../../src/ui/cell-board/CreateCellForm.js', () => ({
  CreateCellForm: (): ReactNode => (
    <div data-testid="create-cell-form-stub">CreateCellForm</div>
  ),
}));

// Stub ResumeSessionPrompt and ArchivedCellsFilter so the FlowgridHome mounting
// assertions are isolated from those components' own behaviour. They are reached
// (rendered by FlowgridHome) but their internals are tested elsewhere.
vi.mock('../../src/ui/cell-board/ResumeSessionPrompt.js', () => ({
  ResumeSessionPrompt: (props: { cellName: string }): ReactNode => (
    <div data-testid="resume-session-prompt-stub" data-cell={props.cellName} />
  ),
}));
vi.mock('../../src/ui/flowgrid-home/ArchivedCellsFilter.js', () => ({
  ArchivedCellsFilter: (): ReactNode => (
    <div data-testid="archived-cells-filter-stub" />
  ),
}));

import { FlowgridHome } from '../../src/ui/flowgrid-home/FlowgridHome.js';
import { flowgridStore } from '../../src/app/store/flowgrid-store.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';
import type { FlowgridSnapshot } from '../../src/domain/index.js';

// Render FlowgridHome inside a memory-router-backed RouterProvider so `useNavigate`
// has the context it needs. Tests that need to assert navigation would extend
// this with `initialEntries` and inspect the resulting location.
function renderHome(): ReturnType<typeof render> {
  const router = createMemoryRouter([{ path: '/', element: <FlowgridHome /> }], {
    initialEntries: ['/'],
  });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  cleanup();
  flowgridStore.setState({
    snapshot: null,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'loading',
    lastError: null,
  });
});

test('FlowgridHome: renders an accessible h1 heading with text "Flowgrid" (PROJECT.md accessibility rule)', () => {
  const { state } = buildStarterSnapshot('home-heading');
  flowgridStore.setState({ snapshot: state, status: 'ready' });

  renderHome();

  const heading = screen.getByRole('heading', { name: 'Flowgrid', level: 1 });
  expect(heading).toBeInTheDocument();
});

test('FlowgridHome: shows a loading state when the store status is "loading"', () => {
  renderHome();

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

test('FlowgridHome: renders without crashing in happy-dom (RTL smoke test)', () => {
  const { state } = buildStarterSnapshot('home-smoke');
  flowgridStore.setState({ snapshot: state, status: 'ready' });

  const { container } = renderHome();

  expect(container).toBeDefined();
  // Even in ready state, the mock canvas should mount via FlowgridHome.
  expect(screen.getByTestId('flowgrid-canvas-mock')).toBeInTheDocument();
});

test('FlowgridHome: ready state renders a "New Cell" button that opens a Radix Dialog containing CreateCellForm (CELL-01 reachability)', () => {
  const { state } = buildStarterSnapshot('home-new-cell');
  flowgridStore.setState({ snapshot: state, status: 'ready' });

  renderHome();

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

test('FlowgridHome: renders ResumeSessionPrompt banner when a cell has activeSessionStartedAt (D-05 reachability)', () => {
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

  renderHome();

  expect(screen.getByTestId('resume-session-prompt-stub')).toBeInTheDocument();
});

test('FlowgridHome: renders the ArchivedCellsFilter section (D-12 reachability)', () => {
  const { state } = buildStarterSnapshot('home-archived');
  flowgridStore.setState({ snapshot: state, status: 'ready' });

  renderHome();

  expect(screen.getByTestId('archived-cells-filter-stub')).toBeInTheDocument();
});
