// Flowgrid Home route component (RESEARCH Pattern 1, PATTERNS FlowgridHome line 92).
//
// The shell around the Pixi canvas: reads the store's status / snapshot / lastError
// via the bound `useFlowgridStore` selector hook and renders one of four states:
//   - loading: a status message while the initial loadSnapshot is in flight
//   - error:   the typed PersistenceError rendered by ErrorBanner
//   - empty:   a "create a Cell" hint (the create form lands in Plan 03-03)
//   - ready:   the Flowgrid canvas + an active-cell count summary
//
// Cell taps navigate to `/cells/:cellId` via React Router (D-03). The accessibility
// heading <h1>Flowgrid</h1> is always present so screen readers can orient even
// while the canvas is still loading.

import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { useFlowgridStore } from '../../app/store/dispatch.js';

import { ErrorBanner } from '../shared/ErrorBanner.js';
import { FlowgridCanvas } from './FlowgridCanvas.js';

export function FlowgridHome() {
  const navigate = useNavigate();
  const status = useFlowgridStore((s) => s.status);
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const lastError = useFlowgridStore((s) => s.lastError);

  // D-03: tap a Cell hex → React Router navigation to the Cell Board route. The
  // callback identity changes when `navigate` changes (stable per RouterProvider
  // mount); FlowgridCanvas captures it via ref so no scene rebuild is triggered.
  const handleCellTap = useCallback(
    (cellId: string) => {
      navigate(`/cells/${cellId}`);
    },
    [navigate],
  );

  // The error state takes precedence over ready/loading when a typed
  // PersistenceError is present so the user sees why their action failed.
  if (status === 'error' || lastError !== null) {
    return (
      <section aria-label="Flowgrid home">
        <h1>Flowgrid</h1>
        <ErrorBanner error={lastError} />
      </section>
    );
  }

  if (status === 'loading' || snapshot === null) {
    return (
      <section aria-label="Flowgrid home">
        <h1>Flowgrid</h1>
        <p role="status">Loading Flowgrid…</p>
      </section>
    );
  }

  const activeCells = [...snapshot.cells.values()].filter((c) => c.archivedAt === null);
  const activeCellCount = activeCells.length;

  return (
    <section aria-label="Flowgrid home">
      <h1>Flowgrid</h1>
      {activeCellCount === 0 ? (
        <p role="status">No active Cells yet. Create one to start playing.</p>
      ) : (
        <>
          <p aria-live="polite">
            {activeCellCount} active Cell{activeCellCount === 1 ? '' : 's'}.
          </p>
          <FlowgridCanvas snapshot={snapshot} onCellTap={handleCellTap} />
        </>
      )}
    </section>
  );
}
