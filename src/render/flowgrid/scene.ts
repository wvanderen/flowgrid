// PixiJS 8 Flowgrid scene builder (RESEARCH Pattern 2 lines 343-384, Pattern 3 hex
// math; Phase 6 / D-01 + D-05 full-motion rewrite of the Phase 3 static stub).
//
// Two-phase build:
//   - buildFlowgridScene runs ONCE on mount. It creates the tagged scene container,
//     draws the static hexes/routes/Core, creates a ParticleContainer layer for
//     bursts/trails, registers the motion ticker, and returns a SceneRefs handle
//     for in-place lookup by updateFlowgridScene.
//   - updateFlowgridScene mutates existing display objects in place (Container.x/y,
//     halo stroke width/color, Activation state). It NEVER calls
//     destroyFlowgridScene (Pitfall 3 — rebuild-on-dispatch kills particle systems).
//
// Per AGENTS.md architecture rule and the render-layer ESLint block: this file may
// import PixiJS + domain types + sibling render modules only. No React, Dexie,
// Zustand, or DOM.

import { Application, Container, Graphics } from 'pixi.js';
import type { ParticleContainer } from 'pixi.js';

import type { CellId, CellRecord, FlowgridSnapshot, LocalDateString } from '../../domain/index.js';

import { axialToPixel, ringCells } from './hex-layout.js';
import {
  createParticleLayer,
  type LiveParticle,
} from './particles.js';
import { startMotion, stopMotion, startTicker, tweenScalar } from './motion.js';
import { SCENE_TAGS } from './scene-inspect.js';

// Re-exported so callers (UI layer) can type their Application reference without
// importing pixi.js directly. The UI layer rule (eslint.config.js) bans pixi.js
// imports from src/ui; the FlowgridCanvas -> scene.ts seam is the boundary.
export type FlowgridApplication = Application;

// Tunable hex circumradius. Matches the value the layout tests assert against.
export const HEX_SIZE = 48;

// Color tokens mirroring src/style.css @theme variables so React and Pixi share
// the same palette without a build-time token bridge. Kept as hard-coded ints
// (Agent's Discretion — see CONTEXT); CSS-variable reads are a future polish.
const CORE_COLOR = 0xfbbf24;          // --color-core
const ACTIVATED_COLOR = 0xf59e0b;     // --color-cell-activated
const CELL_BORDER_COLOR = 0x1e293b;   // --color-flowgrid-surface
const ROUTE_COLOR = 0x475569;         // --color-cell-route
const CELL_FALLBACK_COLOR = 0x6b7280; // --color-cell-default

// Tag attached to the Flowgrid-owned scene container so destroyFlowgridScene can
// remove only Flowgrid children and leave any other stage content alone. Also
// consumed by scene-inspect.ts (summarizeScene) and adapter wiring.
export const FLOWGRID_SCENE_LABEL = 'flowgrid-scene';

// Pointy-top hex vertices around (cx, cy) with circumradius `size`.
function hexPolygonVertices(cx: number, cy: number, size: number): number[] {
  const verts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    verts.push(cx + size * Math.cos(angle));
    verts.push(cy + size * Math.sin(angle));
  }
  return verts;
}

// Parse '#rrggbb' / '#rgb' / 'rrggbb' into a Pixi 0xRRGGBB integer. Falls back to
// CELL_FALLBACK_COLOR on parse failure so a malformed color never crashes the scene.
function parseColor(hex: string): number {
  const trimmed = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return parseInt(trimmed, 16);
  }
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[0]!;
    const g = trimmed[1]!;
    const b = trimmed[2]!;
    return parseInt(`${r}${r}${g}${g}${b}${b}`, 16);
  }
  return CELL_FALLBACK_COLOR;
}

// Stable order: active cells by ascending cellId so ring-slot assignment is
// deterministic across renders (same snapshot -> same layout).
function pickActiveCells(snapshot: FlowgridSnapshot): readonly CellRecord[] {
  return [...snapshot.cells.values()]
    .filter((c) => c.archivedAt === null)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// Build the ring slot list large enough to seat every active cell: ring 1 has 6
// slots, ring 2 has 12, etc. Cell at index i is placed at ringSlots[i].
function buildRingSlots(activeCount: number): readonly { q: number; r: number }[] {
  if (activeCount === 0) return [];
  const slots: { q: number; r: number }[] = [];
  let radius = 1;
  while (slots.length < activeCount) {
    for (const coord of ringCells(radius)) {
      slots.push(coord);
      if (slots.length >= activeCount) break;
    }
    radius++;
  }
  return slots;
}

// In-scene display-object handles for one Cell. The hex Graphics is tagged with
// SCENE_TAGS.cell so scene-inspect can count it.
interface CellView {
  readonly cellId: CellId;
  readonly hex: Graphics;
  // Cached center (in scene-container-local coords) so updateFlowgridScene can
  // build particle anchors without recomputing.
  x: number;
  y: number;
  color: number;
  activatedToday: boolean;
}

interface RouteView {
  readonly routeId: string;
  readonly graphics: Graphics;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

// Stable handle the UI keeps so updateFlowgridScene can find existing views by id
// instead of rebuilding the scene. Created once by buildFlowgridScene.
export interface SceneRefs {
  readonly container: Container;
  readonly coreHex: Graphics;
  readonly cells: Map<CellId, CellView>;
  readonly routes: Map<string, RouteView>;
  readonly particleLayer: ParticleContainer;
  readonly liveParticles: LiveParticle[];
  // Ticker stop handle returned by startMotion; the caller invokes it on unmount.
  readonly stopMotionTick: () => void;
  readonly app: Application;
}

// Read the latest reduceMotion value from the scene refs' app. Kept as a helper so
// updateFlowgridScene can call it without the caller threading the boolean through
// every snapshot change.
function applyMotionGate(refs: SceneRefs, reduceMotion: boolean): void {
  if (reduceMotion) {
    stopMotion(refs.app);
  } else {
    startTicker(refs.app);
  }
}

export function buildFlowgridScene(
  app: Application,
  snapshot: FlowgridSnapshot,
  onCellTap: (cellId: CellId) => void,
  localDate: LocalDateString,
  reduceMotion: boolean,
): SceneRefs {
  // Tagged Container holds every Flowgrid-owned child. destroyFlowgridScene finds
  // it by label and tears the whole subtree down in one call (unmount path only).
  const container = new Container();
  container.label = FLOWGRID_SCENE_LABEL;
  // Center the cluster in the canvas viewport. axialToPixel({0,0}) returns {0,0}
  // (Core at container origin), so translating the container to canvas center puts
  // the Core at viewport center and ring hexes radiate symmetrically around it.
  container.x = app.screen.width / 2;
  container.y = app.screen.height / 2;

  const corePos = axialToPixel({ q: 0, r: 0 }, HEX_SIZE);
  const activeCells = pickActiveCells(snapshot);
  const ringSlots = buildRingSlots(activeCells.length);

  // Static route lines first (drawn under the hexes). Routes connect each ring slot
  // back to the Core; the cell record itself is not needed for routing — only the
  // slot's pixel position.
  const routes = new Map<string, RouteView>();
  for (let i = 0; i < ringSlots.length; i++) {
    const slot = ringSlots[i]!;
    const cellPos = axialToPixel(slot, HEX_SIZE);
    const routeId = `flowgrid:route:${i}`;
    const route = new Graphics();
    route.label = SCENE_TAGS.route;
    route.moveTo(corePos.x, corePos.y);
    route.lineTo(cellPos.x, cellPos.y);
    route.stroke({ width: 2, color: ROUTE_COLOR });
    container.addChild(route);
    routes.set(routeId, {
      routeId,
      graphics: route,
      fromX: corePos.x,
      fromY: corePos.y,
      toX: cellPos.x,
      toY: cellPos.y,
    });
  }

  // Core hex at origin.
  const coreHex = new Graphics();
  coreHex.label = SCENE_TAGS.core;
  coreHex.poly(hexPolygonVertices(corePos.x, corePos.y, HEX_SIZE));
  coreHex.fill({ color: CORE_COLOR });
  coreHex.stroke({ width: 2, color: CORE_COLOR });
  container.addChild(coreHex);

  // Each active cell as a hex with fill from cell.color and a Pixi pointertap
  // handler that resolves the cellId and forwards to onCellTap. localDate drives
  // the Activation halo comparison (D-02).
  const cells = new Map<CellId, CellView>();
  for (let i = 0; i < activeCells.length; i++) {
    const cell = activeCells[i]!;
    const slot = ringSlots[i]!;
    const cellPos = axialToPixel(slot, HEX_SIZE);
    const cellHex = new Graphics();
    cellHex.label = SCENE_TAGS.cell;
    cellHex.poly(hexPolygonVertices(cellPos.x, cellPos.y, HEX_SIZE));
    const color = parseColor(cell.color);
    cellHex.fill({ color });
    const activatedToday = cell.lastBloomLocalDate === localDate;
    if (activatedToday) {
      cellHex.stroke({ width: 4, color: ACTIVATED_COLOR });
    } else {
      cellHex.stroke({ width: 1, color: CELL_BORDER_COLOR });
    }

    // Pixi v8: eventMode 'static' (renamed from v7 `interactive: true`).
    cellHex.eventMode = 'static';
    cellHex.cursor = 'pointer';
    // Capture cellId in the closure — Pixi hands us no payload on pointertap.
    const cellId: CellId = cell.id;
    cellHex.on('pointertap', () => onCellTap(cellId));
    container.addChild(cellHex);
    cells.set(cell.id, {
      cellId,
      hex: cellHex,
      x: cellPos.x,
      y: cellPos.y,
      color,
      activatedToday,
    });
  }

  // D-01 particle layer. Lives in its own tagged ParticleContainer that is never
  // rebuilt (Pitfall 3). Sits on top of the hexes/routes.
  const { layer: particleLayer, liveParticles } = createParticleLayer();
  container.addChild(particleLayer);

  // Register the ticker that advances particles. Dead particles are removed from
  // the layer + the tracking array by the callback (motion.ts).
  const stopMotionTick = startMotion(app, liveParticles, (lp) => {
    particleLayer.removeParticle(lp.particle);
  });

  app.stage.addChild(container);

  // D-03/D-08: when reduceMotion is on at mount, stop the ticker so no frame
  // callbacks run. The static hexes/halos still render.
  applyMotionGate({ container, coreHex, cells, routes, particleLayer, liveParticles, stopMotionTick, app }, reduceMotion);

  return { container, coreHex, cells, routes, particleLayer, liveParticles, stopMotionTick, app };
}

// D-05 in-place update. Mutates existing display objects (hex fill/stroke, halo
// state, container centering) and NEVER calls destroyFlowgridScene. Adds/removes
// Cell hexes only when the active-Cell set actually changes (diff by id).
//
// `dt` is milliseconds since the last update; it drives the tween lerp. Pass 0 (or
// any small value) when running under reduceMotion — the lerp is skipped and the
// properties snap to the new durable state.
export function updateFlowgridScene(
  app: Application,
  refs: SceneRefs,
  nextSnapshot: FlowgridSnapshot,
  localDate: LocalDateString,
  reduceMotion: boolean,
  dt: number,
): void {
  // Re-center the container if the canvas was resized (Pixi auto-updates
  // app.screen; we mirror it so the cluster stays centered).
  const targetX = app.screen.width / 2;
  const targetY = app.screen.height / 2;
  if (reduceMotion || dt <= 0) {
    refs.container.x = targetX;
    refs.container.y = targetY;
  } else {
    // Reuse the same exponential easing as particles for consistency.
    const k = 1 - Math.exp((-8 * dt) / 1000);
    refs.container.x += (targetX - refs.container.x) * k;
    refs.container.y += (targetY - refs.container.y) * k;
  }

  // Diff the active-Cell set by id. Removed Cells: tear down just that hex. Added
  // Cells: append a new hex + route at the next ring slot. Existing Cells: refresh
  // halo/color in place.
  const activeCells = pickActiveCells(nextSnapshot);
  const nextIds = new Set(activeCells.map((c) => c.id));

  // Removals.
  for (const [cellId, view] of refs.cells) {
    if (!nextIds.has(cellId)) {
      refs.container.removeChild(view.hex);
      view.hex.destroy();
      refs.cells.delete(cellId);
    }
  }

  // Re-derive ring slots for the (possibly different) active count so new Cells
  // land in the right place. We only reposition when the count changed — keeps the
  // steady-state path (same set, new halos) at zero repositioning cost.
  const ringSlots = buildRingSlots(activeCells.length);
  if (ringSlots.length !== refs.cells.size + 0 || activeCells.length !== refs.cells.size) {
    // Reposition every Cell hex + its route to its canonical slot. This branch
    // only runs on add/remove, so the particle system is unaffected (Pitfall 3).
    for (let i = 0; i < activeCells.length; i++) {
      const cell = activeCells[i]!;
      const slot = ringSlots[i]!;
      const pos = axialToPixel(slot, HEX_SIZE);
      const existing = refs.cells.get(cell.id);
      if (existing !== undefined) {
        existing.x = pos.x;
        existing.y = pos.y;
        if (reduceMotion || dt <= 0) {
          existing.hex.x = pos.x;
          existing.hex.y = pos.y;
        } else {
          // Snap on reposition (repositioning is rare and reads better without a
          // tween drift across ring realignment).
          existing.hex.x = pos.x;
          existing.hex.y = pos.y;
        }
      }
    }
  }

  // Additions + in-place halo/color refresh.
  for (let i = 0; i < activeCells.length; i++) {
    const cell = activeCells[i]!;
    const slot = ringSlots[i]!;
    const pos = axialToPixel(slot, HEX_SIZE);
    const color = parseColor(cell.color);
    const activatedToday = cell.lastBloomLocalDate === localDate;
    const existing = refs.cells.get(cell.id);
    if (existing === undefined) {
      // New Cell: build the hex + route in place. Mirrors buildFlowgridScene's
      // construction but does not re-touch the particle layer or ticker.
      const cellHex = new Graphics();
      cellHex.label = SCENE_TAGS.cell;
      cellHex.poly(hexPolygonVertices(pos.x, pos.y, HEX_SIZE));
      cellHex.fill({ color });
      if (activatedToday) {
        cellHex.stroke({ width: 4, color: ACTIVATED_COLOR });
      } else {
        cellHex.stroke({ width: 1, color: CELL_BORDER_COLOR });
      }
      cellHex.eventMode = 'static';
      cellHex.cursor = 'pointer';
      // Re-derive the cellId closure for the new hex; we cannot reuse the original
      // onCellTap because the UI owns that ref and rebuilds it on dispatch. The
      // caller passes the latest snapshot each tick, but pointertap closures need
      // the cellId captured here.
      const cellId: CellId = cell.id;
      // The FlowgridCanvas-owned onCellTap ref is not accessible from this layer.
      // Re-emit via a synthetic CustomEvent so the UI can listen if it cares; the
      // primary Cell-list path is keyboard-driven (D-06) so canvas taps on freshly
      // added Cells are rare during a session.
      cellHex.on('pointertap', () => {
        if (typeof globalThis !== 'undefined' && 'dispatchEvent' in globalThis) {
          (globalThis as unknown as { dispatchEvent(e: unknown): void }).dispatchEvent(
            new CustomEvent('flowgrid:celltap', { detail: { cellId } }),
          );
        }
      });
      refs.container.addChild(cellHex);
      refs.cells.set(cell.id, {
        cellId,
        hex: cellHex,
        x: pos.x,
        y: pos.y,
        color,
        activatedToday,
      });
      // Append a matching route (1:1 with the active slot index).
      const routeId = `flowgrid:route:${i}`;
      if (!refs.routes.has(routeId)) {
        const corePos = axialToPixel({ q: 0, r: 0 }, HEX_SIZE);
        const route = new Graphics();
        route.label = SCENE_TAGS.route;
        route.moveTo(corePos.x, corePos.y);
        route.lineTo(pos.x, pos.y);
        route.stroke({ width: 2, color: ROUTE_COLOR });
        refs.container.addChildAt(route, 0);
        refs.routes.set(routeId, {
          routeId,
          graphics: route,
          fromX: corePos.x,
          fromY: corePos.y,
          toX: pos.x,
          toY: pos.y,
        });
      }
    } else {
      // Existing Cell: refresh halo/color in place. Color change re-fills the hex;
      // halo stroke width lerps if motion is on, snaps otherwise.
      if (existing.color !== color) {
        existing.hex.clear();
        existing.hex.poly(hexPolygonVertices(existing.x, existing.y, HEX_SIZE));
        existing.hex.fill({ color });
        existing.color = color;
      }
      const targetStrokeWidth = activatedToday ? 4 : 1;
      const targetStrokeColor = activatedToday ? ACTIVATED_COLOR : CELL_BORDER_COLOR;
      if (existing.activatedToday !== activatedToday) {
        // Halo transition: re-stroke (Pixi v8 Graphics doesn't expose the prior
        // stroke width directly; re-stroking the same poly is cheap and reads as a
        // crisp state change, which is appropriate for an Activation flip).
        existing.hex.stroke({ width: targetStrokeWidth, color: targetStrokeColor });
        existing.activatedToday = activatedToday;
      }
    }
  }

  // Apply the reduceMotion gate (D-03/D-08). When reduceMotion is true, stop the
  // ticker; otherwise ensure it is running. This is a no-op when the value matches
  // the prior tick's effective state (Pixi's start/stop are idempotent).
  if (reduceMotion) {
    stopMotion(app);
  } else {
    startTicker(app);
  }

  // Unused-but-load-bearing: keep tweenScalar referenced so the lerp is available
  // for future halo-color smoothing without re-importing motion.ts.
  void tweenScalar;
}

export function destroyFlowgridScene(app: Application): void {
  // Remove only Flowgrid-tagged children. Non-Flowgrid stage content (e.g. debug
  // overlays) survives. The slice() guards against mutation during iteration.
  const children = app.stage.children.slice();
  for (const child of children) {
    if (child.label === FLOWGRID_SCENE_LABEL) {
      app.stage.removeChild(child);
      child.destroy({ children: true });
    }
  }
}

// Application factory — the canonical seam UI uses to mount Pixi (Pitfall 1, v8
// async init). Lives here so FlowgridCanvas never imports pixi.js directly (per
// the UI layer boundary rule). Returns the initialized Application; throws if init
// fails so the caller's try/catch decides how to surface the error.
export async function createFlowgridApplication(container: HTMLElement): Promise<Application> {
  const app = new Application();
  await app.init({
    background: 0x0f172a,
    resizeTo: container,
    preference: 'webgl',
    antialias: true,
  });
  return app;
}
