// Plan 06-03 Task 2: keyboard + semantic a11y component test for the Cell list (D-06 / UI-02).
//
// FlowgridHome mounts an always-visible <nav aria-label="Cells"> alongside the
// canvas so keyboard and screen-reader users can open any existing Cell without
// touching the canvas. These tests assert the nav semantics, the per-Cell link
// count + hrefs, Tab-focusability, and that the list renders unconditionally as
// the accessible peer to the canvas (D-06). happy-dom has no WebGL, so
// FlowgridCanvas is mocked to a placeholder (mirrors tests/ui/flowgrid-home.test.tsx);
// the canvas's own render path is covered by the Phase 6 Playwright E2E.

import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';

// Mock FlowgridCanvas — happy-dom has no WebGL. The mock keeps the prop shape so
// FlowgridHome still receives onCellTap + snapshot.
vi.mock('../../src/ui/flowgrid-home/FlowgridCanvas.js', () => ({
  FlowgridCanvas: (_props: { onCellTap: (cellId: string) => void; snapshot: unknown }): ReactNode => (
    <div data-testid="flowgrid-canvas-mock" />
  ),
}));

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

// Render FlowgridHome inside a memory-router-backed RouterProvider so useNavigate
// has the context it needs (mirrors tests/ui/flowgrid-home.test.tsx).
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
