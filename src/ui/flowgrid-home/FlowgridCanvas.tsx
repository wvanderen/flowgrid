// Pixi canvas mount component (RESEARCH Pattern 2 lines 343-384, PATTERNS scene;
// Phase 6 / D-05 build-once + D-01 particles + D-07 WebGL-fail + D-09 reduceMotion
// + D-16 scene-inspect probe).
//
// Owns the Pixi v8 Application lifecycle via the render-layer factory
// `createFlowgridApplication` (so this file imports no pixi.js symbol directly —
// UI layer boundary rule). The factory returns an initialized Application; this
// component appends `app.canvas` (NOT `app.view` — Pitfall 1) into a div container,
// builds the Flowgrid scene ONCE (D-05), and subscribes the adapter. Subsequent
// snapshot updates call updateFlowgridScene (in-place) — never destroy+rebuild
// (Pitfall 3: rebuild-on-dispatch kills the particle system). On unmount, the
// cleanup path tears down the scene and destroys the app.
//
// D-07: WebGL init failure renders an inline `role="status"` note (NOT role="alert"
// — this is graceful degradation, not an error) pointing the user at the Cell list
// below and the Settings route. The economy stays fully usable.
//
// D-09: reduceMotion is computed in the UI layer (Pitfall 6 — never read matchMedia
// from the render layer) via effectiveReduceMotion(snapshot.settings.reduceMotion)
// and threaded into buildFlowgridScene/updateFlowgridScene/the emit gate.
//
// D-16: window.__flowgridInspect exposes aggregate scene counts { cells, core,
// routes } for VER-06 structural assertions. It returns ONLY aggregate counts (no
// internal Pixi refs — RESEARCH Open Question Q1 option (a), the safest gating),
// so it is safe to expose unconditionally (not gated on import.meta.env.MODE —
// Playwright runs the production build per D-17 / Pitfall 5).

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import type { CellId, FlowgridSnapshot, LocalDateString } from '../../domain/index.js';
import { deriveLocalDate } from '../../simulation/systems/day-rollover.js';
import { effectiveReduceMotion } from '../settings/reduce-motion.js';

import { flowgridStore } from '../../app/store/flowgrid-store.js';
import { connectFlowgridAdapter, type FlowgridStoreView } from '../../render/flowgrid/adapter.js';
import { startAmbientCurrent } from '../../render/flowgrid/ambient-current.js';
import {
  buildFlowgridScene,
  createFlowgridApplication,
  destroyFlowgridScene,
  updateFlowgridScene,
  type FlowgridApplication,
  type SceneRefs,
} from '../../render/flowgrid/scene.js';
import { emitParticles } from '../../render/flowgrid/particles.js';
import { startTicker, stopMotion } from '../../render/flowgrid/motion.js';
import { summarizeScene } from '../../render/flowgrid/scene-inspect.js';
import { buildParticleAnchors } from './particle-anchors.js';

interface FlowgridCanvasProps {
  readonly onCellTap: (cellId: CellId) => void;
  readonly onCoreTap: () => void;
  readonly snapshot: FlowgridSnapshot;
}

export function FlowgridCanvas({ onCellTap, onCoreTap, snapshot }: FlowgridCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  // Keep the latest onCellTap without re-running the mount effect. handleCellTap in
  // FlowgridHome is recreated every render with a fresh useNavigate identity; if the
  // mount closure captured the prop directly it would go stale after the first
  // navigation. The ref is updated on every render (intentional).
  const onCellTapRef = useRef(onCellTap);
  onCellTapRef.current = onCellTap;
  const onCoreTapRef = useRef(onCoreTap);
  onCoreTapRef.current = onCoreTap;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;

    let app: FlowgridApplication | null = null;
    let sceneRefs: SceneRefs | null = null;
    let unsubscribe: (() => void) | null = null;
    let stopAmbientTick: (() => void) | null = null;
    // D-02: separate unsubscribe for the takeover ticker-pause listener. Lives
    // alongside the adapter unsubscribe so the cleanup path tears both down.
    let takeoverUnsubscribe: (() => void) | null = null;
    let lastTickTime = 0;
    let latestSnapshot: FlowgridSnapshot = snapshot;
    let cancelled = false;

    // D-16 / D-02: compute the effective local date at mount so the scene's
    // Activation halo (cell.lastBloomLocalDate === localDate) is correct for the
    // moment the user opened the Flowgrid.
    const localDate: LocalDateString = deriveLocalDate(
      new Date().toISOString(),
      snapshot.settings.localDayBoundary,
    );
    // D-09: compute effective reduceMotion in the UI layer (Pitfall 6 — never read
    // matchMedia from render). Captured at mount; updated via updateFlowgridScene's
    // argument on each snapshot change.
    const reduceMotion = effectiveReduceMotion(snapshot.settings.reduceMotion);

    void (async () => {
      try {
        app = await createFlowgridApplication(container);
      } catch (e) {
        // D-07: WebGL unavailable (old browser, headless context). Render an inline
        // role="status" note via React state (NOT role="alert" — this is graceful
        // degradation, not an error). The economy stays fully usable via the
        // semantic Cell list (Plan 06-03) + panels.
        console.error('FlowgridCanvas: Pixi Application.init failed', e);
        app = null;
        setWebglFailed(true);
        return;
      }
      if (cancelled || app === null) {
        return;
      }

      // app.canvas is the v8 name (v7 was app.view — Pitfall 1).
      container.appendChild(app.canvas);

      // D-05 build-once: buildFlowgridScene creates the tagged container, hexes,
      // routes, Core, ParticleContainer, and registers the motion ticker. It returns
      // SceneRefs for in-place lookup. The scene is NEVER rebuilt on snapshot
      // changes (Pitfall 3 — rebuild-on-dispatch kills particle systems).
      sceneRefs = buildFlowgridScene(
        app,
        snapshot,
        (cellId) => onCellTapRef.current(cellId),
        () => onCoreTapRef.current(),
        localDate,
        reduceMotion,
      );
      lastTickTime = performance.now();
      // The vanilla store is structurally compatible with FlowgridStoreView.
      // Cast keeps the boundary clean: render imports no `flowgridStore` symbol,
      // and UI owns the wiring of "which store feeds the adapter".
      const storeView = flowgridStore as unknown as FlowgridStoreView;
      stopAmbientTick = startAmbientCurrent(app, sceneRefs.particleLayer, sceneRefs.liveParticles, {
        getSnapshot: () => latestSnapshot,
        getAnchors: () => {
          if (sceneRefs === null) {
            return { core: { x: 0, y: 0 }, cells: new Map(), routes: new Map() };
          }
          return buildParticleAnchors(sceneRefs);
        },
        isEnabled: () => {
          const state = storeView.getState();
          const currentSnapshot = state.snapshot ?? latestSnapshot;
          return !state.takeoverActive && !effectiveReduceMotion(currentSnapshot.settings.reduceMotion);
        },
      });

      // D-16 scene-inspect probe: expose aggregate counts unconditionally. The
      // function returns ONLY { cells, core, routes } (no internal Pixi refs —
      // RESEARCH Open Question Q1 option (a), safest gating). Playwright reads it
      // via `await page.evaluate(() => (window as any).__flowgridInspect?.())`.
      (
        window as unknown as {
          __flowgridInspect?: () => { cells: number; core: boolean; routes: number };
        }
      ).__flowgridInspect = () => {
        if (app === null) return { cells: 0, core: false, routes: 0 };
        return summarizeScene(app);
      };

      unsubscribe = connectFlowgridAdapter(
        storeView,
        (nextSnapshot) => {
          if (app === null || sceneRefs === null) return;
          latestSnapshot = nextSnapshot;
          // D-05 in-place update. Mutates existing display objects; never destroys
          // + rebuilds. The next reduceMotion is re-derived from the fresh
          // snapshot so a Settings toggle takes effect on the next dispatch.
          const now = performance.now();
          const dt = now - lastTickTime;
          lastTickTime = now;
          const nextReduceMotion = effectiveReduceMotion(nextSnapshot.settings.reduceMotion);
          // Phase 6.1 D-07 (Plan 06.1-02 Task 1): thread the URL-mirrored
          // selectedCellId into updateFlowgridScene so the Z-Lift visual follows
          // navigation. This is a view-state projection, NOT a dispatch — the
          // adapter fires this callback on selectedCellId change too.
          const nextSelectedCellId = storeView.getState().selectedCellId;
          const nextSelectedCore = storeView.getState().selectedCore;
          updateFlowgridScene(
            app,
            sceneRefs,
            nextSnapshot,
            localDate,
            nextReduceMotion,
            dt,
            nextSelectedCellId,
            nextSelectedCore,
          );
        },
        (events) => {
          // D-01/D-04 particle emission. Gated on reduceMotion: when reduced, the
          // ticker is stopped and we do NOT emit (D-08: animation fully off).
          if (app === null || sceneRefs === null) return;
          // D-02: do not emit particles into a canvas hidden behind a takeover
          // overlay. The events are transient (UI-04) so dropping them is
          // byte-safe; this is the explicit flag from the URL via AppLayout
          // (visibilityState alone does not fire for in-DOM overlays — RESEARCH
          // Pitfall 3).
          if (storeView.getState().takeoverActive) return;
          const currentReduceMotion = effectiveReduceMotion(
            storeView.getState().snapshot?.settings.reduceMotion ?? false,
          );
          if (currentReduceMotion) return;
          const anchors = buildParticleAnchors(sceneRefs);
          emitParticles(sceneRefs.particleLayer, sceneRefs.liveParticles, events, anchors);
        },
      );

      // D-02 takeover ticker-pause: subscribe to the same store so takeoverActive
      // flips pause/resume the Pixi ticker. stopMotion/startTicker are idempotent
      // (Pixi v8 confirmed — scene.ts:419-426 already calls them on every
      // reduceMotion flip), so firing on every store change is safe. The scene is
      // NEVER destroyed (D-05); only the frame loop halts behind an overlay.
      takeoverUnsubscribe = storeView.subscribe(() => {
        if (app === null) return;
        const state = storeView.getState();
        const currentSnapshot = state.snapshot ?? latestSnapshot;
        if (state.takeoverActive || effectiveReduceMotion(currentSnapshot.settings.reduceMotion)) {
          stopMotion(app);
        } else {
          startTicker(app);
        }
      });
    })();

    return () => {
      cancelled = true;
      // Remove the D-16 probe so a hot-unmount doesn't leave a dangling closure.
      delete (
        window as unknown as { __flowgridInspect?: () => unknown }
      ).__flowgridInspect;
      if (unsubscribe !== null) {
        unsubscribe();
        unsubscribe = null;
      }
      if (takeoverUnsubscribe !== null) {
        takeoverUnsubscribe();
        takeoverUnsubscribe = null;
      }
      if (stopAmbientTick !== null) {
        stopAmbientTick();
        stopAmbientTick = null;
      }
      if (app !== null) {
        if (sceneRefs !== null) {
          // Stop the motion ticker before tearing down the scene so the callback
          // cannot fire on a destroyed layer.
          sceneRefs.stopMotionTick();
        }
        destroyFlowgridScene(app);
        app.destroy(true);
        app = null;
      }
    };
    // Mount once. `snapshot.settings.localDayBoundary` is captured at mount time;
    // if the user changes the boundary they reload (RESEARCH Open Question Q3 —
    // reload-only is the simpler choice). `onCellTap` is tracked via ref so it does
    // not need to be a dep. Dependencies are intentionally [].
  }, []);
  // The empty dep array above is deliberate: this effect mounts the canvas once
  // and tears it down on unmount only. Omitting react-hooks/exhaustive-deps lint
  // (plugin not installed in this project) — the intent is documented inline.

  if (webglFailed) {
    // D-07 graceful-degradation note. role="status" (NOT role="alert"): this is
    // NOT an error; the economy stays fully usable via the semantic Cell list
    // (Plan 06-03) below and the route panels.
    return (
      <div
        ref={containerRef}
        className="flowgrid-canvas-stage relative flex w-full flex-col items-center justify-center gap-3 px-6 text-center"
        role="status"
        aria-live="polite"
        aria-label="Flowgrid visuals unavailable"
      >
        <p className="text-sm text-slate-300">
          Visuals unavailable — you can still do everything from the Cell list below.
        </p>
        <Link to="/settings" className="text-sm text-core underline">
          Settings
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flowgrid-canvas-stage relative w-full overflow-hidden"
      aria-label="Flowgrid canvas"
      role="img"
    />
  );
}
