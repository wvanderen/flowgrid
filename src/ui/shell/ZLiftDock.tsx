// ZLiftDock (Phase 6.1 / D-04, D-08; Plan 06.1-02 Task 2).
//
// Semantic HTML control dock beside the canvas. Renders OUTSIDE the canvas (D-08:
// canvas keeps role="img"; this dock is the semantic control surface). Reads
// selectedCellId + snapshot + activeSession from the store and surfaces the armed
// session controls (Start / Finish / Cancel) + the Cell name + key stats. On the
// /core route it ALSO renders the Core allocation controls so allocation is
// inline alongside the canvas.
//
// Two paths, one truth (D-08): the dock's Start/Finish/Cancel buttons construct
// the EXACT command shapes GeneratorTile uses (start_focus_session /
// complete_focus_session / cancel_focus_session) and call the same `dispatch`
// path — no economy rule is computed in the UI (architecture boundary). The
// canvas hex tap dispatches via the same path through CellBoard; the dock adds a
// second semantic affordance, never a second mutation path.
//
// Responsive reflow (D-04): at lg:+ render as a side dock in the right negative
// space beside the lifted module; below md: collapse to a compact bottom strip
// that stays visible alongside the canvas (NEVER a sheet/overlay that covers
// the canvas). The lg:/md: breakpoint choice follows the RESEARCH Mobile Strategy
// recommendation (A2: side dock at lg:, bottom strip below md:).
//
// v1 simplification (RESEARCH Open Question 1 + Assumption A3): ships the
// heuristic side dock WITHOUT precise per-cell screen-anchor tracking. Precise
// anchor tracking (selectedCellScreenAnchor projection) is a deferred polish —
// acceptable per the D-agent's discretion #3.

import { useState } from 'react';
import { useMatches } from 'react-router';
import { Check, Play, X } from 'lucide-react';

import type {
  CancelFocusSessionCommand,
  CompleteFocusSessionCommand,
  SetCoreAllocationCommand,
  StartFocusSessionCommand,
} from '../../domain/index.js';
import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';
import { getCellById } from '../../simulation/selectors.js';

const SESSION_SEED = 'flowgrid-z-lift-dock-seed';

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.floor(value)));
}

export function ZLiftDock() {
  const selectedCellId = useFlowgridStore((s) => s.selectedCellId);
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const activeSession = useFlowgridStore((s) => s.activeSession);
  const matches = useMatches();
  // Detect a /core match so allocation can render inline alongside the canvas.
  // useMatches returns the full chain; a match whose pathname starts with /core
  // is the CorePanel child.
  const onCoreRoute = matches.some(
    (m) => 'pathname' in m && String((m as { pathname: unknown }).pathname).startsWith('/core'),
  );

  // Idle home view: no Cell selected. Render nothing (the dock is purely a
  // selection-driven affordance per sketch-001 winner B).
  if (selectedCellId === null || snapshot === null) return null;

  const cell = getCellById(snapshot, selectedCellId);
  if (cell === undefined) return null;

  const isThisCellActive = activeSession?.cellId === selectedCellId;
  const anotherCellActive = activeSession !== null && activeSession.cellId !== selectedCellId;

  const buildEnv = () =>
    makeEnv(
      new Date().toISOString(),
      { localDayBoundary: snapshot.settings.localDayBoundary },
      SESSION_SEED,
    );

  const handleStart = () => {
    const command: StartFocusSessionCommand = {
      type: 'start_focus_session',
      operationId: crypto.randomUUID(),
      cellId: selectedCellId,
    };
    void dispatch(command, buildEnv(), repository);
  };

  const handleFinish = () => {
    if (activeSession === null) return;
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.floor(
        (new Date(endedAt).getTime() - new Date(activeSession.startedAt).getTime()) / 1000,
      ),
    );
    // D-08: sub-second finishes route through cancel — never record a zero session
    // (mirrors GeneratorTile exactly; one shared semantic, two affordances).
    if (durationSeconds <= 0) {
      const cancelCommand: CancelFocusSessionCommand = {
        type: 'cancel_focus_session',
        operationId: crypto.randomUUID(),
        cellId: selectedCellId,
      };
      void dispatch(cancelCommand, buildEnv(), repository);
      return;
    }
    const command: CompleteFocusSessionCommand = {
      type: 'complete_focus_session',
      operationId: crypto.randomUUID(),
      cellId: selectedCellId,
      startedAt: activeSession.startedAt,
      endedAt,
      durationSeconds,
    };
    void dispatch(command, buildEnv(), repository);
  };

  const handleCancel = () => {
    const command: CancelFocusSessionCommand = {
      type: 'cancel_focus_session',
      operationId: crypto.randomUUID(),
      cellId: selectedCellId,
    };
    void dispatch(command, buildEnv(), repository);
  };

  return (
    <DockCluster
      cellName={cell.name}
      charge={cell.charge}
      xp={cell.xp}
      isThisCellActive={isThisCellActive}
      anotherCellActive={anotherCellActive}
      onCoreRoute={onCoreRoute}
      snapshot={snapshot}
      handleStart={handleStart}
      handleFinish={handleFinish}
      handleCancel={handleCancel}
    />
  );
}

// Extracted as a child component so the test (and a future Storybook slice) can
// render the cluster in isolation once the store plumbing is wired.
interface DockClusterProps {
  readonly cellName: string;
  readonly charge: number;
  readonly xp: number;
  readonly isThisCellActive: boolean;
  readonly anotherCellActive: boolean;
  readonly onCoreRoute: boolean;
  readonly snapshot: {
    readonly core: {
      readonly convertAllocationPercent: number;
      readonly storeAllocationPercent: number;
    };
    readonly settings: { readonly localDayBoundary: string };
  };
  readonly handleStart: () => void;
  readonly handleFinish: () => void;
  readonly handleCancel: () => void;
}

function DockCluster({
  cellName,
  charge,
  xp,
  isThisCellActive,
  anotherCellActive,
  onCoreRoute,
  snapshot,
  handleStart,
  handleFinish,
  handleCancel,
}: DockClusterProps) {
  // Local allocation state, seeded from the snapshot's core (only used on /core).
  const [convertPct, setConvertPct] = useState<number>(
    snapshot.core.convertAllocationPercent,
  );
  const [storePct, setStorePct] = useState<number>(
    snapshot.core.storeAllocationPercent,
  );
  const allocationSum = convertPct + storePct;
  const allocationValid = allocationSum === 100;

  const handleApplyAllocation = () => {
    const env = makeEnv(
      new Date().toISOString(),
      { localDayBoundary: snapshot.settings.localDayBoundary },
      SESSION_SEED,
    );
    const command: SetCoreAllocationCommand = {
      type: 'set_core_allocation',
      operationId: crypto.randomUUID(),
      convertAllocationPercent: convertPct,
      storeAllocationPercent: storePct,
    };
    void dispatch(command, env, repository);
  };

  return (
    <aside
      aria-label={`Controls for ${cellName}`}
      // D-04 responsive reflow. lg: side dock (right negative space, full height
      // column beside the canvas); md: side dock narrower; below md: bottom strip
      // pinned under the canvas (always visible alongside it — NEVER a sheet).
      className="
        pointer-events-auto rounded-lg border border-slate-700 bg-flowgrid-surface/95 p-3 shadow-xl
        flex flex-row items-center gap-2
        fixed inset-x-2 bottom-2 z-30
        md:static md:inset-auto md:z-auto md:w-64 md:flex-col md:items-stretch md:gap-3
        lg:w-72
      "
    >
      <header className="flex shrink-0 flex-col">
        <h2 className="text-sm font-semibold text-slate-100">{cellName}</h2>
        <p className="text-xs text-slate-400">
          Charge {charge} · XP {xp}
        </p>
      </header>

      {!isThisCellActive ? (
        <button
          type="button"
          onClick={handleStart}
          disabled={anotherCellActive}
          aria-label="Start Focus Session"
          aria-describedby={anotherCellActive ? 'dock-another-active' : undefined}
          className="inline-flex items-center justify-center gap-1 rounded-md bg-core px-3 py-2 text-sm font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play aria-hidden="true" className="h-4 w-4" />
          Start Focus Session
        </button>
      ) : (
        <div className="flex items-center gap-2 md:flex-col md:items-stretch">
          <button
            type="button"
            onClick={handleFinish}
            aria-label="Finish"
            className="inline-flex items-center justify-center gap-1 rounded-md bg-core px-3 py-2 text-sm font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core"
          >
            <Check aria-hidden="true" className="h-4 w-4" />
            Finish
          </button>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancel"
            className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X aria-hidden="true" className="h-4 w-4" />
            Cancel
          </button>
        </div>
      )}
      {anotherCellActive ? (
        <p
          id="dock-another-active"
          role="status"
          aria-live="polite"
          className="text-xs text-slate-400"
        >
          Another focus session is active
        </p>
      ) : null}

      {onCoreRoute ? (
        <section aria-label="Core allocation" className="border-t border-slate-700 pt-2">
          <h3 className="text-xs font-semibold text-slate-300">Allocation</h3>
          <div className="mt-1 flex flex-col gap-1 text-xs text-slate-300">
            <label className="flex items-center justify-between gap-2">
              <span>Convert %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={convertPct}
                onChange={(e) => setConvertPct(clampPercent(e.target.valueAsNumber))}
                aria-label="Convert percent"
                className="w-16 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span>Store %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={storePct}
                onChange={(e) => setStorePct(clampPercent(e.target.valueAsNumber))}
                aria-label="Store percent"
                className="w-16 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
              />
            </label>
            <button
              type="button"
              onClick={handleApplyAllocation}
              disabled={!allocationValid}
              aria-label="Apply allocation"
              className="mt-1 inline-flex items-center justify-center rounded-md bg-core px-2 py-1 text-xs font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply Allocation
            </button>
            {!allocationValid ? (
              <p role="status" aria-live="polite" className="text-xs text-error">
                Convert + Store must total 100 (currently {allocationSum}).
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
