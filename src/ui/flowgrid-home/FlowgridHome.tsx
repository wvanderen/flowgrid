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

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';

import { useFlowgridStore } from '../../app/store/dispatch.js';

import { CreateCellForm } from '../cell-board/CreateCellForm.js';
import { ResumeSessionPrompt } from '../cell-board/ResumeSessionPrompt.js';
import { ErrorBanner } from '../shared/ErrorBanner.js';
import { ArchivedCellsFilter } from './ArchivedCellsFilter.js';
import { FlowgridCanvas } from './FlowgridCanvas.js';

export function FlowgridHome() {
  const navigate = useNavigate();
  const status = useFlowgridStore((s) => s.status);
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const lastError = useFlowgridStore((s) => s.lastError);
  const [createOpen, setCreateOpen] = useState(false);

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

  // D-05: scan for a Cell with an interrupted (non-null) activeSessionStartedAt so
  // the resume-or-discard banner surfaces after a reload. The one-active-session
  // invariant means at most one such Cell exists.
  const interruptedCell = [...snapshot.cells.values()].find(
    (c) => c.activeSessionStartedAt !== null,
  );

  return (
    <section aria-label="Flowgrid home">
      <h1>Flowgrid</h1>

      {/* D-05: interrupted-session recovery banner (mounted, not just defined). */}
      {interruptedCell !== undefined && interruptedCell.activeSessionStartedAt !== null ? (
        <ResumeSessionPrompt
          cellId={interruptedCell.id}
          cellName={interruptedCell.name}
          startedAt={interruptedCell.activeSessionStartedAt}
        />
      ) : null}

      {/* CELL-01 reachability: the New Cell button is always present so the user
          can create a Cell even before any exist. CreateCellForm lives inside the
          Radix Dialog; its own navigate handles routing after a successful create,
          onCreated closes the dialog. */}
      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Trigger asChild>
          <button type="button">New Cell</button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content aria-label="Create a new Cell">
            <Dialog.Title>Create a Cell</Dialog.Title>
            <CreateCellForm onCreated={() => setCreateOpen(false)} />
            <Dialog.Close asChild>
              <button type="button" aria-label="Close create dialog">
                Close
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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

      {/* D-12: archived-Cells management surface (hidden from canvas, reachable here). */}
      <ArchivedCellsFilter />
    </section>
  );
}
