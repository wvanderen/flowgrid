// Flowgrid store → scene adapter (RESEARCH Pattern 1 lines 318-340, D-02).
//
// Subscribes to a Zustand-vanilla-shaped store and forwards snapshot updates and
// drained visual events to caller-supplied callbacks. Per D-02, the Phase 3 stub
// drops visual events (no animation) — this adapter is the place that "drop"
// happens, proving the renderer/simulation safety boundary from day one.
//
// The store is passed as a structural `FlowgridStoreView` so this file does not
// import `flowgridStore` from src/app (banned by the render-layer boundary rule,
// PATTERNS S6). The actual `flowgridStore` from `src/app/store/flowgrid-store.ts`
// structurally satisfies this contract — Zustand's vanilla StoreApi exposes
// `subscribe`, `getState`, and `setState`.

import type { CellId, FlowgridSnapshot, VisualEvent } from '../../domain/index.js';

export interface FlowgridStoreView {
  subscribe(listener: () => void): () => void;
  getState(): {
    readonly snapshot: FlowgridSnapshot | null;
    readonly pendingVisualEvents: readonly VisualEvent[];
    // D-01 view-state mirror: read by the canvas for the Z-Lift selection. The
    // state is mirrored from the URL by AppLayout via useMatches; the render
    // layer reads it through this structural contract (no flowgridStore import).
    readonly selectedCellId: CellId | null;
    // D-02 view-state mirror: read by the canvas to gate particle emission +
    // pause the ticker while a takeover overlay covers the canvas.
    readonly takeoverActive: boolean;
  };
  // The setState patch type stays limited to pendingVisualEvents: selection and
  // takeover are written directly to flowgridStore by AppLayout's useEffect, NOT
  // through this adapter (the adapter is the render→store subscriber, not the
  // store→durable-state writer). Keeping the patch narrow preserves the
  // render-layer boundary (no setState surface for view-state in render).
  setState(patch: { readonly pendingVisualEvents: readonly VisualEvent[] }): void;
}

export type SceneRebuildHandler = (snapshot: FlowgridSnapshot) => void;
export type VisualEventDrainHandler = (events: readonly VisualEvent[]) => void;

// Wire the adapter. Returns an unsubscribe function the caller MUST invoke on
// unmount to stop the subscription and avoid leaking the rebuild callback closure.
//
// The subscription handler is re-entrancy-guarded: when the drain path calls
// `store.setState({ pendingVisualEvents: [] })` the subscriber fires again
// synchronously, but `isUpdating` is still true so the re-entrant emission is
// ignored. Without this guard the clear would re-trigger the handler and the
// snapshot path would run again pointlessly.
export function connectFlowgridAdapter(
  store: FlowgridStoreView,
  onSnapshot: SceneRebuildHandler,
  onVisualEvents: VisualEventDrainHandler,
): () => void {
  let lastSnapshot: FlowgridSnapshot | null = null;
  let isUpdating = false;

  const unsubscribe = store.subscribe(() => {
    if (isUpdating) return;
    isUpdating = true;
    try {
      const { snapshot, pendingVisualEvents } = store.getState();

      // Rebuild the scene only when the snapshot reference changes. The dispatch
      // path always produces a fresh `result.nextState`, so reference-equality is
      // the right signal (and avoids unnecessary Pixi rebuilds).
      if (snapshot !== null && snapshot !== lastSnapshot) {
        lastSnapshot = snapshot;
        onSnapshot(snapshot);
      }

      // D-02: visual events are received but dropped (Phase 3 has no animation).
      // Surface them to the caller for logging/telemetry, then clear the buffer.
      if (pendingVisualEvents.length > 0) {
        onVisualEvents(pendingVisualEvents);
        store.setState({ pendingVisualEvents: [] });
      }
    } finally {
      isUpdating = false;
    }
  });

  return unsubscribe;
}
