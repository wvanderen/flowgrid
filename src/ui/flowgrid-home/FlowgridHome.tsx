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
// heading <h1 className="text-3xl font-bold text-core">Flowgrid</h1> is always present so screen readers can orient even
// while the canvas is still loading.

import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';

import { useFlowgridStore } from '../../app/store/dispatch.js';

import { CreateCellForm } from '../cell-board/CreateCellForm.js';
import { ResumeSessionPrompt } from '../cell-board/ResumeSessionPrompt.js';
import { RejuvenationResumePrompt } from '../core-panel/RejuvenationResumePrompt.js';
import { ErrorBanner } from '../shared/ErrorBanner.js';
import { ArchivedCellsFilter } from './ArchivedCellsFilter.js';
import { FlowgridCanvas } from './FlowgridCanvas.js';
import { ReturnCues } from './ReturnCues.js';

export function FlowgridHome() {
  const navigate = useNavigate();
  const status = useFlowgridStore((s) => s.status);
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const lastError = useFlowgridStore((s) => s.lastError);
  const activeRejuvenation = useFlowgridStore((s) => s.activeRejuvenation);
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
      <section aria-label="Flowgrid home" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <h1 className="text-3xl font-bold text-core">Flowgrid</h1>
        <ErrorBanner error={lastError} />
      </section>
    );
  }

  if (status === 'loading' || snapshot === null) {
    return (
      <section aria-label="Flowgrid home" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <h1 className="text-3xl font-bold text-core">Flowgrid</h1>
        <p role="status" className="text-sm text-slate-400">Loading Flowgrid…</p>
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
    <section aria-label="Flowgrid home" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-core">Flowgrid</h1>
        {/* Reachable /core and /settings navigation (peer to / and /cells/:id). */}
        <div className="flex items-center gap-3">
          <Link to="/core" className="text-sm text-slate-400 underline">Core</Link>
          <Link to="/settings" className="text-sm text-slate-400 underline">Settings</Link>
        </div>
      </div>

      {/* D-05: interrupted-session recovery banner (mounted, not just defined). */}
      {interruptedCell !== undefined && interruptedCell.activeSessionStartedAt !== null ? (
        <ResumeSessionPrompt
          cellId={interruptedCell.id}
          cellName={interruptedCell.name}
          startedAt={interruptedCell.activeSessionStartedAt}
        />
      ) : null}

      {/* D-02: interrupted-rejuvenation recovery banner. D-02 mutual exclusion means at
          most ONE of (focus resume prompt, rejuvenation resume prompt) is mounted at a
          time — only one marker can be non-null app-wide. Placed alongside the focus
          resume prompt so interrupted-session recovery surfaces first. */}
      {activeRejuvenation !== null ? (
        <RejuvenationResumePrompt startedAt={activeRejuvenation.startedAt} />
      ) : null}

      {/* UI-07 return-cue rail: above the canvas, below the resume banners. Must not
          obstruct the New Cell button or the canvas tap-Cell flow (D-08 protected
          interaction). Renders nothing when there is no actionable state. */}
      <ReturnCues />

      {/* CELL-01 reachability: the New Cell button is always present so the user
          can create a Cell even before any exist. CreateCellForm lives inside the
          Radix Dialog; its own navigate handles routing after a successful create,
          onCreated closes the dialog. */}
      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className="inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core">New Cell</button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
          <Dialog.Content aria-label="Create a new Cell" className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-700 bg-flowgrid-surface p-6 shadow-2xl space-y-4">
            <Dialog.Title className="text-lg font-semibold text-slate-100">Create a Cell</Dialog.Title>
            <CreateCellForm onCreated={() => setCreateOpen(false)} />
            <Dialog.Close asChild>
              <button type="button" aria-label="Close create dialog" className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                Close
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {activeCellCount === 0 ? (
        <p role="status" className="rounded-lg border border-dashed border-slate-600 bg-flowgrid-surface p-6 text-center text-slate-400">No active Cells yet. Create one to start playing.</p>
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-slate-400">
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
