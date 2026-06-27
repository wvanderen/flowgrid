// FlowgridHome (HomeDock) — the `/` index route child (Phase 6.1 D-01).
//
// Slimmed from the prior / route owner into the idle Home Dock: the slim view
// shown when no Cell is selected (selectedCellId === null) and no takeover is
// active. The canvas + chrome + status/error/loading gating + handleCellTap have
// all lifted up to AppLayout (src/ui/shell/AppLayout.tsx); this component MUST
// NOT re-import FlowgridCanvas (would double-mount and break the Phase 6 D-05
// build-once invariant).
//
// HomeDock renders alongside the still-mounted canvas in the Outlet zone: an
// empty-state hint or the active-cell count line. The h1 "Flowgrid" heading is
// owned by AppLayout now; this dock just shows the idle status text.

import { useFlowgridStore } from '../../app/store/dispatch.js';

export function FlowgridHome() {
  const snapshot = useFlowgridStore((s) => s.snapshot);

  // AppLayout owns the loading/error/ready gating; HomeDock is only reached
  // after the snapshot is ready. Defensively return null if the snapshot is not
  // present yet (the layout's loading state hides this dock in that window).
  if (snapshot === null) return null;

  const activeCells = [...snapshot.cells.values()].filter((c) => c.archivedAt === null);
  const activeCellCount = activeCells.length;

  if (activeCellCount === 0) {
    return (
      <p role="status" className="text-sm text-slate-400">
        Tap a Cell on the grid to start a focus session, or use the New Cell button above.
      </p>
    );
  }

  return (
    <p aria-live="polite" className="text-sm text-slate-400">
      {activeCellCount} active Cell{activeCellCount === 1 ? '' : 's'} — tap one on the grid or in the list above.
    </p>
  );
}
