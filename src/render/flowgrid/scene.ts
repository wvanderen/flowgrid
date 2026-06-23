// PixiJS 8 stub Flowgrid scene builder (RESEARCH Pattern 2 lines 343-384, Pattern 3
// hex math). Pure scene-construction code: receives an initialized `Application`
// (FlowgridCanvas owns the async init lifecycle), draws the Core + non-archived
// Cells + static routes, wires pointertap → onCellTap (D-03), and exits.
//
// Per D-02: this is a STATIC scene with no animation, no tweening, no Current-flow
// particles. Visual events emitted by the simulation are dropped by the adapter —
// here we just render the durable snapshot.
//
// Per AGENTS.md architecture rule and the render-layer ESLint block: this file may
// import PixiJS and domain types/selectors only. No React, Dexie, Zustand, or DOM.

import { Application, Container, Graphics } from 'pixi.js';

import type { CellId, CellRecord, FlowgridSnapshot, LocalDateString } from '../../domain/index.js';

import { axialToPixel, ringCells } from './hex-layout.js';

// Re-exported so callers (UI layer) can type their Application reference without
// importing pixi.js directly. The UI layer rule (eslint.config.js) bans pixi.js
// imports from src/ui; the FlowgridCanvas → scene.ts seam is the boundary.
export type FlowgridApplication = Application;

// Tunable hex circumradius. Matches the value the layout tests assert against.
export const HEX_SIZE = 48;

// Color tokens mirroring src/style.css @theme variables so React and Pixi share
// the same palette without a build-time token bridge (Phase 3 is small enough to
// hard-code; Phase 6 may move to CSS-variable reads).
const CORE_COLOR = 0xfbbf24;          // --color-core
const ACTIVATED_COLOR = 0xf59e0b;     // --color-cell-activated
const CELL_BORDER_COLOR = 0x1e293b;   // --color-flowgrid-surface
const ROUTE_COLOR = 0x475569;         // --color-cell-route
const CELL_FALLBACK_COLOR = 0x6b7280; // --color-cell-default

// Tag attached to the Flowgrid-owned scene container so destroyFlowgridScene can
// remove only Flowgrid children and leave any other stage content alone.
const FLOWGRID_SCENE_LABEL = 'flowgrid-scene';

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
// deterministic across renders (same snapshot → same layout).
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

export function buildFlowgridScene(
  app: Application,
  snapshot: FlowgridSnapshot,
  onCellTap: (cellId: CellId) => void,
  localDate: LocalDateString,
): void {
  // A tagged Container holds every Flowgrid-owned child. destroyFlowgridScene finds
  // it by label and tears the whole subtree down in one call.
  const container = new Container();
  container.label = FLOWGRID_SCENE_LABEL;

  const corePos = axialToPixel({ q: 0, r: 0 }, HEX_SIZE);
  const activeCells = pickActiveCells(snapshot);
  const ringSlots = buildRingSlots(activeCells.length);

  // Static route lines first (D-02: no animation), so cell hexes render on top.
  // Routes connect each ring slot back to the Core; the cell record itself is not
  // needed for routing — only the slot's pixel position.
  for (const slot of ringSlots) {
    const cellPos = axialToPixel(slot, HEX_SIZE);
    const route = new Graphics();
    route.moveTo(corePos.x, corePos.y);
    route.lineTo(cellPos.x, cellPos.y);
    route.stroke({ width: 2, color: ROUTE_COLOR });
    container.addChild(route);
  }

  // Core hex at origin.
  const coreHex = new Graphics();
  coreHex.poly(hexPolygonVertices(corePos.x, corePos.y, HEX_SIZE));
  coreHex.fill({ color: CORE_COLOR });
  coreHex.stroke({ width: 2, color: CORE_COLOR });
  container.addChild(coreHex);

  // Each active cell as a hex with fill from cell.color and a Pixi pointertap
  // handler that resolves the cellId and forwards to onCellTap (D-03). The scene
  // has no env access — `localDate` is computed by FlowgridCanvas via
  // deriveLocalDate and passed in for the D-02 Activation halo comparison.
  for (let i = 0; i < activeCells.length; i++) {
    const cell = activeCells[i]!;
    const slot = ringSlots[i]!;
    const cellPos = axialToPixel(slot, HEX_SIZE);
    const cellHex = new Graphics();
    cellHex.poly(hexPolygonVertices(cellPos.x, cellPos.y, HEX_SIZE));
    cellHex.fill({ color: parseColor(cell.color) });

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
  }

  app.stage.addChild(container);
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
