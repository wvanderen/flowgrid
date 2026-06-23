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

import type { FlowgridSnapshot, IsoDateTimeString, VisualEvent } from '../../domain/index.js';
import type { PersistenceError } from '../../persistence/errors.js';

export interface ActiveSessionMarker {
  readonly cellId: string;
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
  // Drives FlowgridHome's loading/ready/error rendering. 'loading' on cold boot before
  // loadSnapshot resolves; 'ready' once a snapshot exists; 'error' if a typed
  // PersistenceError surfaces and FlowgridHome must render ErrorBanner instead.
  readonly status: FlowgridStatus;
  readonly lastError: PersistenceError | null;
}

export const flowgridStore = createStore<FlowgridState>(() => ({
  snapshot: null,
  activeSession: null,
  pendingVisualEvents: [],
  status: 'loading',
  lastError: null,
}));

export type { FlowgridState as FlowgridStoreState };
