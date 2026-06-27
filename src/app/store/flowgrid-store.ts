// Zustand v5 vanilla store — the app-shell coordination point (RESEARCH Pattern 1
// lines 293-340). Holds view/session coordination state ONLY: durable truth lives in
// IndexedDB via FlowgridRepository diff-writes and is rehydrated into `snapshot`
// after loadSnapshot. Per AGENTS.md: the store is NEVER persisted; `setState` is the
// single mutation path.
//
// Vanilla `createStore` (not the React `create` hook) so the dispatch path can run
// outside React (e.g. the post-load rehydration sequence in initApp). React binds to
// the same instance via `useStore(flowgridStore, selector)` in dispatch.ts.

import { createStore } from 'zustand/vanilla';

import type {
  CellId,
  FlowgridSnapshot,
  ForgeHistoryRecord,
  IsoDateTimeString,
  RejuvenationRecord,
  SessionRecord,
  VisualEvent,
} from '../../domain/index.js';
import type { PersistenceError } from '../../persistence/errors.js';

export interface ActiveSessionMarker {
  readonly cellId: string;
  readonly startedAt: IsoDateTimeString;
}

// D-01/D-02: Core-scoped active-rejuvenation marker (parallels ActiveSessionMarker).
// Rejuvenation is app-wide (no cellId) and mutually exclusive with any focus session
// (at most one of activeSession / activeRejuvenation is non-null app-wide — D-02).
export interface ActiveRejuvenationMarker {
  readonly startedAt: IsoDateTimeString;
}

export type FlowgridStatus = 'loading' | 'ready' | 'error';

export interface FlowgridState {
  // Null while the initial loadSnapshot is in flight; non-null once dispatch can run.
  readonly snapshot: FlowgridSnapshot | null;
  // Derived from the snapshot's active-cell marker (cell.activeSessionStartedAt !== null).
  // Mirrored at the store level so React selectors can read it without scanning cells.
  readonly activeSession: ActiveSessionMarker | null;
  // Visual events emitted by the simulation. The render adapter (src/render/flowgrid/
  // adapter.ts) subscribes and drains these. D-02: in the Phase 3 stub they are
  // received and dropped (no animation), which proves the renderer/simulation safety
  // boundary from day one.
  readonly pendingVisualEvents: readonly VisualEvent[];
  // The most recently completed focus session. Set by dispatch after a successful
  // complete_focus_session so CellBoard can render SessionSummary (SESS-05). Null
  // initially; stays set but is only shown when its cellId matches the viewed Cell.
  readonly lastCompletedSession: SessionRecord | null;
  // D-09: the most recently completed rejuvenation. Set by dispatch after a successful
  // log_rejuvenation so CorePanel can render RejuvenationSummary (REJ-05). Persists
  // until the next dispatch clears it (no auto-dismiss — D-10). Null initially.
  readonly lastCompletedRejuvenation: RejuvenationRecord | null;
  // Phase 5 / D-11: the most recently completed forge. Set by dispatch after a
  // successful run_forge so ForgePanel can render ForgeSummary (MOD-03, D-10).
  // The lastCompletedForge field persists until the next dispatch clears it (no
  // auto-dismiss — mirrors lastCompletedRejuvenation exactly). Null initially.
  readonly lastCompletedForge: ForgeHistoryRecord | null;
  // D-01/D-02: derived from the Core's active-rejuvenation marker
  // (core.activeRejuvenationStartedAt !== null). Mirrored at the store level so the
  // CorePanel / RejuvenationResumePrompt can read it without touching the snapshot.
  readonly activeRejuvenation: ActiveRejuvenationMarker | null;
  // Drives FlowgridHome's loading/ready/error rendering. 'loading' on cold boot before
  // loadSnapshot resolves; 'ready' once a snapshot exists; 'error' if a typed
  // PersistenceError surfaces and FlowgridHome must render ErrorBanner instead.
  readonly status: FlowgridStatus;
  readonly lastError: PersistenceError | null;
  // A user-facing message produced when a dispatched command is rejected by the
  // simulation (e.g. starting a second focus session while one is already active).
  // Distinct from lastError (persistence failures). Cleared on the next applied dispatch.
  readonly lastRejection: string | null;
  // D-01 view-state mirror: the currently-selected Cell, mirrored from the URL by
  // AppLayout via useMatches. Null on / and /core; non-null when a /cells/:id route
  // is the active child. This is the single source the canvas adapter + HTML dock
  // both read for the Z-Lift selection. NEVER durable — not part of dispatch.ts;
  // written via flowgridStore.setState from AppLayout's useEffect (per D-01
  // agent's-discretion #6: selection is view-state mirrored from the URL, the URL
  // is the single source of truth, the store is a derived mirror for non-React
  // consumers like the render adapter).
  readonly selectedCellId: CellId | null;
  // D-02 view-state mirror: true when a takeover overlay (/settings or /forge) is
  // covering the canvas. Set by AppLayout from route handle metadata via
  // useMatches. Gates the Pixi ticker pause (stopMotion/startTicker) and the
  // particle emit gate so no work is wasted behind a hidden overlay (T-6.1-02).
  readonly takeoverActive: boolean;
}

export const flowgridStore = createStore<FlowgridState>(() => ({
  snapshot: null,
  activeSession: null,
  pendingVisualEvents: [],
  lastCompletedSession: null,
  lastCompletedRejuvenation: null,
  lastCompletedForge: null,
  activeRejuvenation: null,
  status: 'loading',
  lastError: null,
  lastRejection: null,
  selectedCellId: null,
  takeoverActive: false,
}));

export type { FlowgridState as FlowgridStoreState };
