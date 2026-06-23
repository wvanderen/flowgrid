// Plan 03-02 Task 2 RED: FlowgridHome component tests.
//
// Verifies the React shell that wraps the Pixi canvas renders an accessible
// heading, a loading state before the snapshot arrives, and survives the happy-dom
// RTL smoke path. Pixi/WebGL is not available under happy-dom, so FlowgridCanvas
// is mocked to a placeholder div — the canvas mount path is exercised by the
// Playwright E2E in Phase 6, not by RTL.

import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock FlowgridCanvas — happy-dom has no WebGL and FlowgridHome only needs to
// know the canvas container renders when status === 'ready'. The mock keeps the
// onCellTap prop shape so future integration tests can extend it.
vi.mock('../../src/ui/flowgrid-home/FlowgridCanvas.js', () => ({
  FlowgridCanvas: (_props: { onCellTap: (cellId: string) => void }): ReactNode => (
    <div data-testid="flowgrid-canvas-mock" />
  ),
}));

import { FlowgridHome } from '../../src/ui/flowgrid-home/FlowgridHome.js';
import { flowgridStore } from '../../src/app/store/flowgrid-store.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';

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

  render(<FlowgridHome />);

  const heading = screen.getByRole('heading', { name: 'Flowgrid', level: 1 });
  expect(heading).toBeInTheDocument();
});

test('FlowgridHome: shows a loading state when the store status is "loading"', () => {
  render(<FlowgridHome />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

test('FlowgridHome: renders without crashing in happy-dom (RTL smoke test)', () => {
  const { state } = buildStarterSnapshot('home-smoke');
  flowgridStore.setState({ snapshot: state, status: 'ready' });

  const { container } = render(<FlowgridHome />);

  expect(container).toBeDefined();
  // Even in ready state, the mock canvas should mount via FlowgridHome.
  expect(screen.getByTestId('flowgrid-canvas-mock')).toBeInTheDocument();
});
