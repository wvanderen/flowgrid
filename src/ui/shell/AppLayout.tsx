// AppLayout — the pathless React Router v7 layout-route element (Phase 6.1 D-01).
//
// Lifts FlowgridCanvas + the persistent home chrome out of the / route swap into
// a layout slot that survives navigation across /, /cells/:id, /core (the core
// gameplay routes). The active child route renders via <Outlet/>. Takeover routes
// (/settings, /forge) declare `handle: { takeover: true }`; AppLayout reads it via
// useMatches to (a) hide the persistent chrome while a takeover covers the canvas
// and (b) push the takeoverActive flag into the store so the canvas pauses its
// ticker + particle emission (D-02, RESEARCH Pattern 3).
//
// View-state mirror (D-agent's discretion #6): selectedCellId + takeoverActive are
// derived from useMatches and pushed into flowgridStore via a useEffect calling
// flowgridStore.setState. Per D-01 the URL is the single source of truth; the
// store is a derived mirror for non-React consumers (the canvas adapter). This
// projection NEVER flows through dispatch.ts — selection is view-state, not
// durable (RESEARCH Anti-Pattern: routing selection through dispatch).
//
// Build-once invariant (Phase 6 D-05 / RESEARCH Pitfall 1): the pathless layout
// route is the PARENT of every child route; the layout instance (and thus the
// FlowgridCanvas it mounts) persists across all child navigation including
// /cells/A ↔ /cells/B param-only changes. The empty-deps mount effect in
// FlowgridCanvas therefore runs once per app session.
//
// React dev double-mount landmine (RESEARCH Pitfall 2): main.tsx:32 stays
// StrictMode-free so the build-once Pixi effect does not cycle setup→cleanup→
// setup. Do NOT add <StrictMode> here or anywhere above this route — the mount
// effect must first be made idempotent before StrictMode is safe.

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, Outlet, useMatches, useNavigate } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-menu';
import { LayoutGrid } from 'lucide-react';

import type { CellId } from '../../domain/index.js';
import { flowgridStore } from '../../app/store/flowgrid-store.js';
import { useFlowgridStore } from '../../app/store/dispatch.js';

import { CreateCellForm } from '../cell-board/CreateCellForm.js';
import { ResumeSessionPrompt } from '../cell-board/ResumeSessionPrompt.js';
import { RejuvenationResumePrompt } from '../core-panel/RejuvenationResumePrompt.js';
import { ErrorBanner } from '../shared/ErrorBanner.js';
import { FlowgridCanvas } from '../flowgrid-home/FlowgridCanvas.js';
import { ReturnCues } from '../flowgrid-home/ReturnCues.js';
import { ZLiftDock } from './ZLiftDock.js';

interface RouteHandle {
  readonly takeover?: boolean;
}

interface MatchWithParams {
  readonly params: Readonly<Record<string, string | undefined>>;
  readonly handle: unknown;
}

export function AppLayout(): ReactNode {
  const navigate = useNavigate();
  const status = useFlowgridStore((s) => s.status);
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const lastError = useFlowgridStore((s) => s.lastError);
  const activeSession = useFlowgridStore((s) => s.activeSession);
  const activeRejuvenation = useFlowgridStore((s) => s.activeRejuvenation);
  const [createOpen, setCreateOpen] = useState(false);
  // Phase 6.1 D-04 (Plan 06.1-02 Task 2): Cell-switcher open state. Radix Menu
  // (the standalone primitive) has no Trigger; the button toggles this manually.
  const [cellSwitcherOpen, setCellSwitcherOpen] = useState(false);

  // D-02: derive takeoverActive from the match chain's route handle metadata.
  // AppLayout uses useMatches (NOT useParams — RESEARCH Pitfall 6: the layout
  // route has no params). The settings + forge routes declare
  // handle: { takeover: true } in routes.tsx.
  const matches = useMatches();
  const takeoverActive = matches.some(
    (m) => (m.handle as RouteHandle | null | undefined)?.takeover === true,
  );
  // D-01 / D-agent's-discretion #6: derive selectedCellId from the match whose
  // params contain cellId (the /cells/:cellId child). Null on /, /core, and the
  // takeover routes.
  const cellMatch = matches.find((m) => {
    const params = (m as MatchWithParams).params;
    return params !== undefined && 'cellId' in params;
  }) as MatchWithParams | undefined;
  const selectedCellId: CellId | null = cellMatch?.params.cellId ?? null;
  const selectedCore = matches.some(
    (m) => 'pathname' in m && String((m as { pathname: unknown }).pathname) === '/core',
  );

  // D-01 view-state mirror: push the URL-derived fields into the store for
  // non-React consumers (the canvas adapter reads them via FlowgridStoreView).
  // This is a derived mirror — the URL remains the single source of truth.
  useEffect(() => {
    flowgridStore.setState({ selectedCellId, selectedCore, takeoverActive });
  }, [selectedCellId, selectedCore, takeoverActive]);

  // D-03: tap a Cell hex → React Router navigation to the Cell route. The
  // callback identity changes when `navigate` changes (stable per RouterProvider
  // mount); FlowgridCanvas captures it via ref so no scene rebuild is triggered.
  // Identical to the FlowgridHome pattern this layout absorbed.
  const handleCellTap = useCallback(
    (cellId: CellId) => {
      navigate(`/cells/${cellId}`);
    },
    [navigate],
  );
  const handleCoreTap = useCallback(() => {
    navigate('/core');
  }, [navigate]);

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
    // D-09: the canvas zone keeps its className/size on WebGL-fail (FlowgridCanvas
    // returns the same h-[60vh]/sm:h-[70vh] wrapper for both branches); the layout
    // is identical whether WebGL works or not.
    <section aria-label="Flowgrid home" className="flowgrid-sigil-shell relative flex min-h-screen flex-col overflow-x-hidden px-4 py-4 text-slate-300 sm:px-6 lg:px-8 xl:h-screen xl:overflow-hidden">
      <header className="relative z-20 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-core">
          <Link to="/" className="transition hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core">
            Flowgrid
          </Link>
        </h1>
        <nav aria-label="Primary" className="flex items-center gap-3">
          <Link
            to="/core"
            aria-current={selectedCore ? 'page' : undefined}
            className={selectedCore
              ? 'rounded-md px-2 py-1 text-sm font-semibold text-core focus:outline-none focus-visible:ring-2 focus-visible:ring-core'
              : 'rounded-md px-2 py-1 text-sm text-slate-400 underline transition hover:text-core focus:outline-none focus-visible:ring-2 focus-visible:ring-core'}
          >
            Core
          </Link>
          <Link to="/settings" className="rounded-md px-2 py-1 text-sm text-slate-400 underline transition hover:text-core focus:outline-none focus-visible:ring-2 focus-visible:ring-core">Settings</Link>
        </nav>
      </header>

      {!takeoverActive && (
        <div className="flowgrid-floating-surface relative z-20 mx-auto mt-4 flex w-fit max-w-full flex-wrap items-center gap-3 rounded-lg px-3 py-2">
          {/* D-05: interrupted-session recovery banner. */}
          {activeSession === null && interruptedCell !== undefined && interruptedCell.activeSessionStartedAt !== null ? (
            <ResumeSessionPrompt
              cellId={interruptedCell.id}
              cellName={interruptedCell.name}
              startedAt={interruptedCell.activeSessionStartedAt}
            />
          ) : null}

          {/* D-02: interrupted-rejuvenation recovery banner. D-02 mutual exclusion means at
              most ONE of (focus resume prompt, rejuvenation resume prompt) is mounted at a
              time — only one marker can be non-null app-wide. */}
          {activeRejuvenation !== null ? (
            <RejuvenationResumePrompt startedAt={activeRejuvenation.startedAt} />
          ) : null}

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

          <ReturnCues />

          {activeCellCount === 0 ? (
            <p role="status" className="text-sm text-slate-400">No active Cells yet.</p>
          ) : (
            <>
              {/* Phase 6.1 D-04 (Plan 06.1-02 Task 2) chrome collapse: the
                  Cell-list `<nav aria-label="Cells">` is the bulkiest persistent
                  chrome. It stays always-visible at md:+ (D-06 a11y peer) but
                  collapses into a Radix Menu Cell-switcher below md: (Mobile
                  Strategy §1). The Radix Menu preserves the semantic nav landmark
                  + keyboard accessibility (arrow-key navigable, focus-trapped);
                  only the visual affordance collapses. The Cell-switcher reuses
                  the SAME activeCells projection the always-visible list uses —
                  no second data source. Activating an item navigates to
                  /cells/:id via the same handleCellTap path the canvas hex tap
                  uses (one selection path, two visual affordances — RESEARCH
                  Pattern 6). ReturnCues / New Cell / resume prompts stay visible
                  at all sizes per Mobile Strategy ordering. */}
              <nav aria-label="Cells" className="hidden md:block">
                <h2 className="sr-only">Cells</h2>
                <ul className="flex flex-wrap items-center gap-2">
                  {activeCells.map((cell) => (
                    <li key={cell.id}>
                      <Link
                        to={`/cells/${cell.id}`}
                        aria-current={selectedCellId === cell.id ? 'page' : undefined}
                        className={selectedCellId === cell.id
                          ? 'rounded-md border border-core/50 bg-core/10 px-2 py-1 text-sm font-semibold text-core focus:outline-none focus-visible:ring-2 focus-visible:ring-core'
                          : 'rounded-md px-2 py-1 text-sm text-slate-300 underline transition hover:text-core focus:outline-none focus-visible:ring-2 focus-visible:ring-core'}
                      >
                        {cell.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Cell-switcher — Radix Menu, visible only below md:. aria-label
                  keeps the trigger accessible even when only the icon shows.

                  Note: @radix-ui/react-menu (the standalone Menu primitive) does
                  NOT export a Trigger (it's designed for context-menu use). We
                  control the open state manually and use Menu.Anchor for popper
                  positioning. The arrow-key navigation + focus-trap come from
                  Radix's RovingFocusGroup; the manual button click is the only
                  deviation from a DropdownMenu primitive (which is not installed). */}
              <div className="md:hidden">
                <Menu.Root open={cellSwitcherOpen} onOpenChange={setCellSwitcherOpen}>
                  <Menu.Anchor asChild>
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={cellSwitcherOpen}
                      aria-label="Cells"
                      onClick={() => setCellSwitcherOpen((v) => !v)}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-core"
                    >
                      <LayoutGrid aria-hidden="true" className="h-4 w-4" />
                      Cells
                    </button>
                  </Menu.Anchor>
                  <Menu.Portal>
                    <Menu.Content
                      aria-label="Cells"
                      className="z-50 max-h-80 w-56 overflow-auto rounded-md border border-slate-700 bg-flowgrid-surface p-1 shadow-xl"
                    >
                      {activeCells.map((cell) => (
                        <Menu.Item
                          key={cell.id}
                          onSelect={() => {
                            setCellSwitcherOpen(false);
                            handleCellTap(cell.id);
                          }}
                          className="flex cursor-pointer items-center px-3 py-2 text-sm text-slate-200 outline-none data-[highlighted]:bg-slate-700 data-[highlighted]:text-core"
                        >
                          {cell.name}
                        </Menu.Item>
                      ))}
                    </Menu.Content>
                  </Menu.Portal>
                </Menu.Root>
              </div>
            </>
          )}
        </div>
      )}

      <div className="relative z-10 mx-auto mt-3 w-full max-w-[92rem] flex-1">
        <FlowgridCanvas
          snapshot={snapshot}
          onCellTap={handleCellTap}
          onCoreTap={handleCoreTap}
        />
        {!takeoverActive ? (
          <div className="relative z-20 mt-4 xl:pointer-events-none xl:absolute xl:right-3 xl:top-3 xl:mt-0 xl:w-[24rem]">
            <div className="pointer-events-auto">
              <ZLiftDock />
            </div>
          </div>
        ) : null}
      </div>

      {/* Child route renders here: HomeDock (/) | CellBoard (/cells/:id) |
          CorePanel (/core) | SettingsTakeover (/settings) | ForgeTakeover (/forge).
          Non-takeover children are visually retired into the semantic inspector
          above, while takeover overlays remain visible fixed layers. */}
      <div hidden={!takeoverActive}>
        <Outlet />
      </div>
    </section>
  );
}
