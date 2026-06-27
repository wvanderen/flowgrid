// Plan 06-03 Task 2: keyboard + semantic a11y component test for the Cell list (D-06 / UI-02).
//
// Phase 6.1 D-01/D-03: the Cell-list <nav aria-label="Cells"> moved from
// FlowgridHome into AppLayout (the pathless layout route). These tests mount the
// layout route + children so they assert the D-06 contract against the new
// ownership. happy-dom has no WebGL, so FlowgridCanvas is mocked to a placeholder
// (mirrors tests/ui/flowgrid-home.test.tsx); the canvas's own render path is
// covered by the Phase 6 Playwright E2E.

import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';

// Mock FlowgridCanvas — happy-dom has no WebGL. The mock keeps the prop shape so
// AppLayout still receives onCellTap + snapshot via FlowgridCanvas.
vi.mock('../../src/ui/flowgrid-home/FlowgridCanvas.js', () => ({
  FlowgridCanvas: (_props: { onCellTap: (cellId: string) => void; snapshot: unknown }): ReactNode => (
    <div data-testid="flowgrid-canvas-mock" />
  ),
}));

// Stub CreateCellForm / ResumeSessionPrompt / RejuvenationResumePrompt /
// ArchivedCellsFilter so the layout chrome mounts without their internals.
vi.mock('../../src/ui/cell-board/CreateCellForm.js', () => ({
  CreateCellForm: (): ReactNode => (
    <div data-testid="create-cell-form-stub">CreateCellForm</div>
  ),
}));
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

import { AppLayout } from '../../src/ui/shell/AppLayout.js';
import { FlowgridHome } from '../../src/ui/flowgrid-home/FlowgridHome.js';
import { flowgridStore } from '../../src/app/store/flowgrid-store.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';
import type { CellRecord, FlowgridSnapshot } from '../../src/domain/index.js';

// Seed the store with a snapshot containing `names.length` additional active Cells
// beyond the starter Cell, each with a distinct id + human name. Returns the
// { id, name } pairs in insertion order so assertions can map over them without
// hardcoding the starter Cell's default name.
function seedActiveCells(prefix: string, names: string[]): { id: string; name: string }[] {
  const { state } = buildStarterSnapshot(prefix);
  const starterCell = [...state.cells.values()][0];
  if (starterCell === undefined) {
    throw new Error('seedActiveCells: starter snapshot has no cell');
  }
  const cells = new Map(state.cells);
  const seeded: { id: string; name: string }[] = [
    { id: starterCell.id, name: starterCell.name },
  ];
  for (const name of names) {
    const id = `${prefix}:cell:${seeded.length + 1}`;
    const next: CellRecord = { ...starterCell, id, name };
    cells.set(id, next);
    seeded.push({ id, name });
  }
  const seededState: FlowgridSnapshot = { ...state, cells };
  flowgridStore.setState({ snapshot: seededState, status: 'ready' });
  return seeded;
}

// Render the layout route + index child so useNavigate + useMatches have the
// context they need (mirrors tests/ui/flowgrid-home.test.tsx). The Cell-list
// <nav aria-label="Cells"> is now owned by AppLayout (the layout route element),
// so the test must mount the layout to exercise D-06.
function renderHome(): ReturnType<typeof render> {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [{ index: true, element: <FlowgridHome /> }],
      },
    ],
    { initialEntries: ['/'] },
  );
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
    selectedCellId: null,
    takeoverActive: false,
  });
});

test('Cell list: renders a navigation landmark with accessible name "Cells" (D-06 semantics)', () => {
  seedActiveCells('a11y-nav', ['Music', 'Fitness']);

  renderHome();

  const nav = screen.getByRole('navigation', { name: 'Cells' });
  expect(nav).toBeInTheDocument();
});

test('Cell list: one link per active Cell, each href resolves to /cells/:cellId', () => {
  const seeded = seedActiveCells('a11y-links', ['Music', 'Fitness', 'Writing']);

  renderHome();

  const nav = screen.getByRole('navigation', { name: 'Cells' });
  const links = within(nav).getAllByRole('link');
  expect(links).toHaveLength(seeded.length);
  seeded.forEach((expected, i) => {
    const link = links[i];
    if (link === undefined) {
      throw new Error(`Cell link ${i} missing`);
    }
    expect(link.getAttribute('href')).toBe(`/cells/${expected.id}`);
    expect(link).toHaveTextContent(expected.name);
  });
});

test('Cell list: Tab reaches a Cell link (keyboard-focusable — UI-02)', async () => {
  seedActiveCells('a11y-tab', ['Music', 'Fitness']);

  const user = userEvent.setup();
  renderHome();

  const nav = screen.getByRole('navigation', { name: 'Cells' });
  const cellLinks = within(nav).getAllByRole('link');

  // Tab through focusable elements until a Cell link is focused. FlowgridHome
  // renders a few focusable controls before the list (Core/Settings links, New
  // Cell button); the bound fails fast instead of looping indefinitely.
  let reachedCellLink = false;
  for (let i = 0; i < 12 && !reachedCellLink; i++) {
    await user.tab();
    const active = document.activeElement;
    if (active !== null && cellLinks.includes(active as HTMLElement)) {
      reachedCellLink = true;
    }
  }
  expect(reachedCellLink).toBe(true);
});

test('Cell list: present unconditionally alongside the canvas (not gated on WebGL — D-06 peer)', () => {
  seedActiveCells('a11y-peer', ['Music']);

  renderHome();

  // The nav is FlowgridHome-level markup, independent of FlowgridCanvas's
  // internal webglFailed state (canvas is mocked here). Both render together so
  // the list is the always-present accessible peer to the canvas tap.
  expect(screen.getByRole('navigation', { name: 'Cells' })).toBeInTheDocument();
  expect(screen.getByTestId('flowgrid-canvas-mock')).toBeInTheDocument();
});

test('Cell list: gracefully omitted with the empty-state message when there are zero active Cells', () => {
  // Seed a snapshot with zero active Cells by archiving the starter cell.
  const { state } = buildStarterSnapshot('a11y-empty');
  const starterId = [...state.cells.keys()][0];
  if (starterId === undefined) {
    throw new Error('starter snapshot has no cell');
  }
  const starter = state.cells.get(starterId);
  if (starter === undefined) {
    throw new Error(`starter cell ${starterId} not found`);
  }
  const cells = new Map(state.cells);
  cells.set(starterId, { ...starter, archivedAt: '2026-01-01T00:00:00.000Z' });
  flowgridStore.setState({ snapshot: { ...state, cells }, status: 'ready' });

  renderHome();

  expect(screen.getByText(/no active cells yet/i)).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Cells' })).toBeNull();
});
