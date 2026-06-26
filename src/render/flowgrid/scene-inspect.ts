// Scene-graph aggregate probe (RESEARCH §"Scene-graph probe" lines 545-560,
// Open Question Q1 option (a); D-16 / VER-06 structural assertion).
//
// summarizeScene returns ONLY aggregate counts { cells, core, routes }. It does not
// leak internal Pixi references (Containers, Graphics, Particle) — the safest
// gating per RESEARCH Open Question Q1 option (a). Always safe to expose.
//
// Per the render-layer ESLint block (eslint.config.js:131-176): this file imports
// Pixi + domain types ONLY. No React/Dexie/Zustand/DOM.

import type { Application } from 'pixi.js';

import { FLOWGRID_SCENE_LABEL } from './scene.js';

export interface SceneSummary {
  readonly cells: number;
  readonly core: boolean;
  readonly routes: number;
}

const CORE_TAG = 'flowgrid-core';
const CELL_TAG = 'flowgrid-cell';
const ROUTE_TAG = 'flowgrid-route';

// Count Flowgrid-owned children of the scene container by tag. Returns zero counts
// if the scene container is absent (canvas not yet mounted, or WebGL init failed —
// graceful: the VER-06 probe asserts cells > 0 only when WebGL is available).
export function summarizeScene(app: Application): SceneSummary {
  const sceneRoot = app.stage.children.find((c) => c.label === FLOWGRID_SCENE_LABEL);
  if (sceneRoot === undefined) {
    return { cells: 0, core: false, routes: 0 };
  }
  let cells = 0;
  let core = false;
  let routes = 0;
  for (const child of sceneRoot.children) {
    if (child.label === CELL_TAG) cells += 1;
    else if (child.label === CORE_TAG) core = true;
    else if (child.label === ROUTE_TAG) routes += 1;
  }
  return { cells, core, routes };
}

// Exported tag setters used by scene.ts to label children so this probe can count
// them without reaching into Pixi internals. Keeping them in this module makes the
// count/tag contract explicit and discoverable.
export const SCENE_TAGS = {
  core: CORE_TAG,
  cell: CELL_TAG,
  route: ROUTE_TAG,
} as const;
