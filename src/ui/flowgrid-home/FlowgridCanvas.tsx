// Pixi canvas mount component (RESEARCH Pattern 2 lines 343-384, PATTERNS scene).
//
// Owns the Pixi v8 Application lifecycle via the render-layer factory
// `createFlowgridApplication` (so this file imports no pixi.js symbol directly —
// UI layer boundary rule). The factory returns an initialized Application; this
// component appends `app.canvas` (NOT `app.view` — Pitfall 1) into a div container,
// builds the Flowgrid scene, and subscribes the adapter. Cleanup tears down the
// scene and destroys the app.
//
// The component takes the snapshot at mount time as a prop for the initial scene
// build; subsequent snapshot updates arrive via the adapter subscription
// (src/render/flowgrid/adapter.ts) and trigger a tear-down + rebuild of the scene
// with no tweening (D-02). `onCellTap` is tracked via ref so the long-lived mount
// effect always invokes the latest handler identity.

import { useEffect, useRef } from 'react';

import type { CellId, FlowgridSnapshot, LocalDateString } from '../../domain/index.js';
import { deriveLocalDate } from '../../simulation/systems/day-rollover.js';

import { flowgridStore } from '../../app/store/flowgrid-store.js';
import { connectFlowgridAdapter, type FlowgridStoreView } from '../../render/flowgrid/adapter.js';
import {
  buildFlowgridScene,
  createFlowgridApplication,
  destroyFlowgridScene,
  type FlowgridApplication,
} from '../../render/flowgrid/scene.js';

interface FlowgridCanvasProps {
  readonly onCellTap: (cellId: CellId) => void;
  readonly snapshot: FlowgridSnapshot;
}

export function FlowgridCanvas({ onCellTap, snapshot }: FlowgridCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the latest onCellTap without re-running the mount effect. handleCellTap in
  // FlowgridHome is recreated every render with a fresh useNavigate identity; if the
  // mount closure captured the prop directly it would go stale after the first
  // navigation. The ref is updated on every render (intentional).
  const onCellTapRef = useRef(onCellTap);
  onCellTapRef.current = onCellTap;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;

    let app: FlowgridApplication | null = null;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    // D-16 / D-02: compute the effective local date at mount so the scene's
    // Activation halo (cell.lastBloomLocalDate === localDate) is correct for the
    // moment the user opened the Flowgrid.
    const localDate: LocalDateString = deriveLocalDate(
      new Date().toISOString(),
      snapshot.settings.localDayBoundary,
    );

    void (async () => {
      try {
        app = await createFlowgridApplication(container);
      } catch (e) {
        // WebGL unavailable (old browser, headless context). Fail soft: log and
        // leave the container empty. Phase 6 hardening owns resilience (T-03-08).
        console.error('FlowgridCanvas: Pixi Application.init failed', e);
        app = null;
        return;
      }
      if (cancelled || app === null) {
        return;
      }

      // app.canvas is the v8 name (v7 was app.view — Pitfall 1).
      container.appendChild(app.canvas);

      // Initial scene build. Subsequent updates flow through the adapter.
      buildFlowgridScene(app, snapshot, (cellId) => onCellTapRef.current(cellId), localDate);

      // The vanilla store is structurally compatible with FlowgridStoreView.
      // Cast keeps the boundary clean: render imports no `flowgridStore` symbol,
      // and UI owns the wiring of "which store feeds the adapter".
      const storeView = flowgridStore as unknown as FlowgridStoreView;
      unsubscribe = connectFlowgridAdapter(
        storeView,
        (nextSnapshot) => {
          if (app === null) return;
          destroyFlowgridScene(app);
          buildFlowgridScene(app, nextSnapshot, (cellId) => onCellTapRef.current(cellId), localDate);
        },
        (_events) => {
          // D-02: visual events are received and dropped. Phase 3 has no animation.
        },
      );
    })();

    return () => {
      cancelled = true;
      if (unsubscribe !== null) {
        unsubscribe();
        unsubscribe = null;
      }
      if (app !== null) {
        destroyFlowgridScene(app);
        app.destroy(true);
        app = null;
      }
    };
    // Mount once. `snapshot.settings.localDayBoundary` is captured at mount time;
    // if the user changes the boundary they reload. `onCellTap` is tracked via ref
    // so it does not need to be a dep. Dependencies are intentionally [].
  }, []);
  // The empty dep array above is deliberate: this effect mounts the canvas once
  // and tears it down on unmount only. Omitting react-hooks/exhaustive-deps lint
  // (plugin not installed in this project) — the intent is documented inline.

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      aria-label="Flowgrid canvas"
      role="img"
    />
  );
}
