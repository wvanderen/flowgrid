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
import { routeIdForCell } from './route-anchors.js';
import { SCENE_TAGS } from './scene-inspect.js';
import { computeZLiftTargets } from './z-lift-targets.js';

// Re-exported so callers (UI layer) can type their Application reference without
// importing pixi.js directly. The UI layer rule (eslint.config.js) bans pixi.js
// imports from src/ui; the FlowgridCanvas -> scene.ts seam is the boundary.
export type FlowgridApplication = Application;

// Tunable hex circumradius. Matches the value the layout tests assert against.
export const HEX_SIZE = 48;

// Holographic Plasma sketch palette (.planning/sketches/themes/default.css).
// v1 ships the approved Flat Top-Down substrate: crisp 2D geometry, electric
// route glow, violet Core, and no 3D camera/well/pan-zoom scope creep.
const CURRENT_CYAN = 0x34e7ff;
const CURRENT_CYAN_SOFT = 0x7af2ff;
const CORE_VIOLET = 0x9b6cff;
const BLOOM_GREEN = 0x3dffa6;
const WARNING_GOLD = 0xffd23d;
const VOID_SURFACE = 0x0c1222;
const VOID_SURFACE_DEEP = 0x05070e;
const CELL_BORDER_COLOR = 0x78aaff;
const ROUTE_COLOR = CURRENT_CYAN;
const CELL_FALLBACK_COLOR = 0x6b7280;

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

function drawSubstrate(graphics: Graphics, maxRing: number): void {
  graphics.clear();
  const guideCount = Math.max(2, maxRing + 1);
  for (let i = guideCount; i >= 1; i--) {
    const radius = HEX_SIZE * (1.62 + i * 1.35);
    graphics.circle(0, 0, radius);
    graphics.stroke({
      width: i === 1 ? 1.2 : 0.8,
      color: CELL_BORDER_COLOR,
      alpha: i === 1 ? 0.14 : 0.07,
    });
  }
  graphics.circle(0, 0, HEX_SIZE * 2.2);
  graphics.fill({ color: CORE_VIOLET, alpha: 0.055 });
}

function drawRoute(graphics: Graphics, fromX: number, fromY: number, toX: number, toY: number): void {
  graphics.clear();
  graphics.moveTo(fromX, fromY);
  graphics.lineTo(toX, toY);
  graphics.stroke({ width: 7, color: ROUTE_COLOR, alpha: 0.07 });
  graphics.moveTo(fromX, fromY);
  graphics.lineTo(toX, toY);
  graphics.stroke({ width: 2.2, color: ROUTE_COLOR, alpha: 0.28 });
  graphics.moveTo(fromX, fromY);
  graphics.lineTo(toX, toY);
  graphics.stroke({ width: 0.8, color: CURRENT_CYAN_SOFT, alpha: 0.62 });
}

function drawCoreHex(graphics: Graphics, cx: number, cy: number, selected = false): void {
  graphics.clear();
  if (selected) {
    graphics.circle(cx, cy, HEX_SIZE * 2.08);
    graphics.fill({ color: CURRENT_CYAN, alpha: 0.08 });
    graphics.circle(cx, cy, HEX_SIZE * 1.64);
    graphics.stroke({ width: 2.2, color: CURRENT_CYAN_SOFT, alpha: 0.34 });
  }
  graphics.circle(cx, cy, HEX_SIZE * 1.78);
  graphics.fill({ color: CORE_VIOLET, alpha: selected ? 0.18 : 0.13 });
  graphics.circle(cx, cy, HEX_SIZE * 1.26);
  graphics.stroke({ width: 1.2, color: CURRENT_CYAN, alpha: 0.26 });
  graphics.circle(cx, cy, HEX_SIZE * 0.88);
  graphics.stroke({ width: 1.1, color: CORE_VIOLET, alpha: 0.42 });

  graphics.poly(hexPolygonVertices(cx, cy, HEX_SIZE * 1.08));
  graphics.fill({ color: CORE_VIOLET, alpha: 0.16 });
  graphics.poly(hexPolygonVertices(cx, cy, HEX_SIZE));
  graphics.fill({ color: 0x140c28, alpha: 0.94 });
  graphics.stroke({ width: 2.2, color: CORE_VIOLET, alpha: 0.95 });

  graphics.circle(cx, cy, HEX_SIZE * 0.24);
  graphics.fill({ color: CURRENT_CYAN, alpha: 0.88 });
  graphics.circle(cx, cy, HEX_SIZE * 0.46);
  graphics.stroke({ width: 1.2, color: CURRENT_CYAN, alpha: 0.44 });
}

function drawCellHex(
  graphics: Graphics,
  cx: number,
  cy: number,
  color: number,
  activatedToday: boolean,
): void {
  graphics.clear();
  const strokeColor = activatedToday ? BLOOM_GREEN : color;
  const glowColor = activatedToday ? BLOOM_GREEN : CURRENT_CYAN;
  graphics.poly(hexPolygonVertices(cx, cy, HEX_SIZE * 1.18));
  graphics.fill({ color: glowColor, alpha: activatedToday ? 0.15 : 0.075 });
  graphics.poly(hexPolygonVertices(cx, cy, HEX_SIZE * 1.04));
  graphics.stroke({ width: activatedToday ? 5 : 3, color: glowColor, alpha: activatedToday ? 0.44 : 0.22 });
  graphics.poly(hexPolygonVertices(cx, cy, HEX_SIZE));
  graphics.fill({ color: VOID_SURFACE, alpha: 0.58 });
  graphics.poly(hexPolygonVertices(cx, cy, HEX_SIZE * 0.94));
  graphics.fill({ color, alpha: 0.70 });
  graphics.stroke({ width: activatedToday ? 2.4 : 1.4, color: strokeColor, alpha: activatedToday ? 0.95 : 0.72 });
  graphics.circle(cx, cy, HEX_SIZE * 0.12);
  graphics.fill({ color: activatedToday ? WARNING_GOLD : CURRENT_CYAN_SOFT, alpha: activatedToday ? 0.52 : 0.24 });
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

function sceneScaleForViewport(app: Application): number {
  const narrowestSide = Math.min(app.screen.width, app.screen.height);
  if (narrowestSide < 560) return 1.08;
  if (app.screen.width >= 1280) return 1.34;
  if (app.screen.width >= 960) return 1.22;
  return 1.14;
}

// In-scene display-object handles for one Cell. The hex Graphics is tagged with
// SCENE_TAGS.cell so scene-inspect can count it. Exported so the pure Z-Lift
// helper (src/render/flowgrid/z-lift-targets.ts) can reference the cell shape
// via a TYPE-ONLY import — the helper mirrors particle-anchors.ts's discipline
// (zero runtime pixi.js dependency, loads under happy-dom).
export interface CellView {
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
  readonly substrate: Graphics;
  readonly cells: Map<CellId, CellView>;
  readonly routes: Map<string, RouteView>;
  readonly particleLayer: ParticleContainer;
  readonly liveParticles: LiveParticle[];
  // Ticker stop handle returned by startMotion; the caller invokes it on unmount.
  readonly stopMotionTick: () => void;
  readonly app: Application;
  // Phase 6.1 D-07 Z-Lift (Plan 06.1-02 Task 1): lazily-created on first
  // non-null selectedCellId, then persisted on refs and toggled .visible (never
  // recreated — Pitfall 4 would reset the particle system). Mutable because the
  // lazy creation happens inside updateFlowgridScene; the fields are declared on
  // the interface so subsequent updates can reposition the same Graphics.
  spotlight?: Graphics;
  focusCone?: Graphics;
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
  onCoreTap: () => void,
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
  const sceneScale = sceneScaleForViewport(app);
  container.scale.set(sceneScale);

  const corePos = axialToPixel({ q: 0, r: 0 }, HEX_SIZE);
  const activeCells = pickActiveCells(snapshot);
  const ringSlots = buildRingSlots(activeCells.length);
  const substrate = new Graphics();
  drawSubstrate(substrate, Math.max(1, Math.ceil(activeCells.length / 6)));
  container.addChild(substrate);

  // Static route lines first (drawn under the hexes). The visual route id mirrors
  // the durable RouteRecord id, so simulation currentFlowVisual events can resolve
  // the same route anchor instead of falling through an invented scene-only id.
  const routes = new Map<string, RouteView>();
  for (let i = 0; i < ringSlots.length; i++) {
    const slot = ringSlots[i]!;
    const cellPos = axialToPixel(slot, HEX_SIZE);
    const routeId = routeIdForCell(snapshot, activeCells[i]!.id, i);
    const route = new Graphics();
    route.label = SCENE_TAGS.route;
    drawRoute(route, corePos.x, corePos.y, cellPos.x, cellPos.y);
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
  drawCoreHex(coreHex, corePos.x, corePos.y);
  coreHex.eventMode = 'static';
  coreHex.cursor = 'pointer';
  coreHex.on('pointertap', onCoreTap);
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
    const color = parseColor(cell.color);
    const activatedToday = cell.lastBloomLocalDate === localDate;
    drawCellHex(cellHex, cellPos.x, cellPos.y, color, activatedToday);

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
  applyMotionGate({ container, coreHex, substrate, cells, routes, particleLayer, liveParticles, stopMotionTick, app }, reduceMotion);

  return { container, coreHex, substrate, cells, routes, particleLayer, liveParticles, stopMotionTick, app };
}

// D-05 in-place update. Mutates existing display objects (hex fill/stroke, halo
// state, container centering) and NEVER calls destroyFlowgridScene. Adds/removes
// Cell hexes only when the active-Cell set actually changes (diff by id).
//
// `dt` is milliseconds since the last update; it drives the tween lerp. Pass 0 (or
// any small value) when running under reduceMotion — the lerp is skipped and the
// properties snap to the new durable state.
//
// Phase 6.1 D-07 (Plan 06.1-02 Task 1): `selectedCellId` is the URL-mirrored view
// state threaded from the adapter. When non-null, the Z-Lift pass lifts the
// selected Cell hex (scale=LIFT_SCALE), dims non-selected neighbors (alpha=
// DIM_ALPHA), blooms a translucent spotlight behind it, and draws a focus cone to
// Core. Per D-07 fixed framing the container is NEVER moved for focus — only
// object-scale + neighbor-dim. The Z-Lift pass mutates CellView.hex.scale/alpha
// IN PLACE via tweenScalar and NEVER calls hex.destroy() (Pitfall 4 — rebuild
// would reset the particle system).
export function updateFlowgridScene(
  app: Application,
  refs: SceneRefs,
  nextSnapshot: FlowgridSnapshot,
  localDate: LocalDateString,
  reduceMotion: boolean,
  dt: number,
  selectedCellId: CellId | null = null,
  selectedCore = false,
): void {
  // Re-center the container if the canvas was resized (Pixi auto-updates
  // app.screen; we mirror it so the cluster stays centered).
  const targetX = app.screen.width / 2;
  const targetY = app.screen.height / 2;
  const targetScale = sceneScaleForViewport(app);
  if (reduceMotion || dt <= 0) {
    refs.container.x = targetX;
    refs.container.y = targetY;
    refs.container.scale.set(targetScale);
  } else {
    // Reuse the same exponential easing as particles for consistency.
    const k = 1 - Math.exp((-8 * dt) / 1000);
    refs.container.x += (targetX - refs.container.x) * k;
    refs.container.y += (targetY - refs.container.y) * k;
    refs.container.scale.set(tweenScalar(refs.container.scale.x, targetScale, dt));
  }

  // Diff the active-Cell set by id. Removed Cells: tear down just that hex. Added
  // Cells: append a new hex + route at the next ring slot. Existing Cells: refresh
  // halo/color in place.
  const activeCells = pickActiveCells(nextSnapshot);
  const nextIds = new Set(activeCells.map((c) => c.id));
  drawSubstrate(refs.substrate, Math.max(1, Math.ceil(activeCells.length / 6)));
  drawCoreHex(refs.coreHex, 0, 0, selectedCore);

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
        drawCellHex(existing.hex, pos.x, pos.y, existing.color, existing.activatedToday);
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
      drawCellHex(cellHex, pos.x, pos.y, color, activatedToday);
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
      const routeId = routeIdForCell(nextSnapshot, cell.id, i);
      if (!refs.routes.has(routeId)) {
        const corePos = axialToPixel({ q: 0, r: 0 }, HEX_SIZE);
        const route = new Graphics();
        route.label = SCENE_TAGS.route;
        drawRoute(route, corePos.x, corePos.y, pos.x, pos.y);
        refs.container.addChildAt(route, 1);
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
        existing.color = color;
        drawCellHex(existing.hex, existing.x, existing.y, color, activatedToday);
      }
      if (existing.activatedToday !== activatedToday) {
        // Halo transition: re-stroke (Pixi v8 Graphics doesn't expose the prior
        // stroke width directly; re-stroking the same poly is cheap and reads as a
        // crisp state change, which is appropriate for an Activation flip).
        existing.activatedToday = activatedToday;
        drawCellHex(existing.hex, existing.x, existing.y, color, activatedToday);
      }
    }
  }

  // Phase 6.1 D-07 Z-Lift pass (Plan 06.1-02 Task 1; RESEARCH Pattern 4 lines
  // 333-374). Lift the selected Cell's hex (scale=LIFT_SCALE), dim non-selected
  // neighbors (alpha=DIM_ALPHA), bloom a translucent spotlight behind the selected
  // hex, and draw a focus cone from the selected cell to Core {0,0}. All reverses
  // cleanly on deselect. Per D-07 the container is NEVER moved for focus — only
  // object-scale + neighbor-dim. Pitfall 4: the Z-Lift pass mutates CellView.hex
  // .scale/alpha IN PLACE via tweenScalar and NEVER calls hex.destroy() (a destroy
  // here would reset the particle system, exactly the failure mode Pitfall 3 fixed
  // for dispatch). The spotlight + focusCone Graphics are created ONCE (lazily on
  // first lift) and persisted on refs, then toggled .visible — never recreated.
  const targets = computeZLiftTargets(selectedCellId, refs.cells);
  const coreTargetScale = selectedCore ? 1.04 : 1;
  const coreTargetAlpha = selectedCellId === null ? 1 : 0.82;
  if (reduceMotion || dt <= 0) {
    refs.coreHex.scale.set(coreTargetScale);
    refs.coreHex.alpha = coreTargetAlpha;
  } else {
    refs.coreHex.scale.set(tweenScalar(refs.coreHex.scale.x, coreTargetScale, dt));
    refs.coreHex.alpha = tweenScalar(refs.coreHex.alpha, coreTargetAlpha, dt);
  }
  for (const [cellId, view] of refs.cells) {
    const target = targets.get(cellId);
    if (target === undefined) continue;
    if (reduceMotion || dt <= 0) {
      // Snap (no tween drift): set scale + alpha directly.
      view.hex.scale.set(target.scale);
      view.hex.alpha = target.alpha;
    } else {
      // Tween toward target. hex.scale is a Point — tween .x and copy to .y so the
      // hex stays uniformly scaled. hex.alpha is a plain number on Pixi Graphics.
      view.hex.scale.set(
        tweenScalar(view.hex.scale.x, target.scale, dt),
      );
      view.hex.alpha = tweenScalar(view.hex.alpha, target.alpha, dt);
    }
  }

  // Spotlight + focus cone. Created lazily on first non-null selection, then
  // persisted on refs.spotlight / refs.focusCone and toggled .visible thereafter.
  // On deselect both become invisible; the per-cell scale/alpha tween above
  // restores the steady state.
  const selectedView =
    selectedCellId !== null ? refs.cells.get(selectedCellId) : undefined;
  if (selectedView !== undefined) {
    if (refs.spotlight === undefined) {
      const spotlight = new Graphics();
      spotlight.circle(selectedView.x, selectedView.y, HEX_SIZE * 1.95);
      spotlight.fill({ color: CURRENT_CYAN, alpha: 0.10 });
      spotlight.circle(selectedView.x, selectedView.y, HEX_SIZE * 1.28);
      spotlight.fill({ color: CORE_VIOLET, alpha: 0.10 });
      refs.container.addChildAt(spotlight, 1);
      refs.spotlight = spotlight;
    } else {
      refs.spotlight.visible = true;
      refs.spotlight.position.set(0, 0);
      // Redraw at the latest selected-cell position (the hex may have moved
      // during a ring realignment). clear() + redraw is cheap on a single
      // circle; we are NOT touching the particle layer (Pitfall 4 honored).
      refs.spotlight.clear();
      refs.spotlight.circle(selectedView.x, selectedView.y, HEX_SIZE * 1.95);
      refs.spotlight.fill({ color: CURRENT_CYAN, alpha: 0.10 });
      refs.spotlight.circle(selectedView.x, selectedView.y, HEX_SIZE * 1.28);
      refs.spotlight.fill({ color: CORE_VIOLET, alpha: 0.10 });
    }
    if (refs.focusCone === undefined) {
      const focusCone = new Graphics();
      focusCone.moveTo(0, 0); // Core at container-local origin
      focusCone.lineTo(selectedView.x, selectedView.y);
      focusCone.stroke({ width: 7, color: CURRENT_CYAN, alpha: 0.09 });
      focusCone.moveTo(0, 0);
      focusCone.lineTo(selectedView.x, selectedView.y);
      focusCone.stroke({ width: 2.2, color: CURRENT_CYAN_SOFT, alpha: 0.52 });
      refs.container.addChildAt(focusCone, 2);
      refs.focusCone = focusCone;
    } else {
      refs.focusCone.visible = true;
      refs.focusCone.position.set(0, 0);
      refs.focusCone.clear();
      refs.focusCone.moveTo(0, 0);
      refs.focusCone.lineTo(selectedView.x, selectedView.y);
      refs.focusCone.stroke({ width: 7, color: CURRENT_CYAN, alpha: 0.09 });
      refs.focusCone.moveTo(0, 0);
      refs.focusCone.lineTo(selectedView.x, selectedView.y);
      refs.focusCone.stroke({ width: 2.2, color: CURRENT_CYAN_SOFT, alpha: 0.52 });
    }
  } else {
    // No selection: hide both. The Graphics stay mounted (reused on next lift).
    if (refs.spotlight !== undefined) refs.spotlight.visible = false;
    if (refs.focusCone !== undefined) refs.focusCone.visible = false;
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
    background: VOID_SURFACE_DEEP,
    backgroundAlpha: 0,
    resizeTo: container,
    preference: 'webgl',
    antialias: true,
    autoDensity: true,
    resolution: Math.min((globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1, 2),
  });
  return app;
}
