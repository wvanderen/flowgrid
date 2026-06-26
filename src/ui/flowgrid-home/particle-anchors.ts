// Pure particle-anchor derivation (Phase 6 / D-01, gap-closure 06-05).
//
// Coordinate-space contract (root-cause evidence:
// .planning/debug/no-canvas-animation.md):
//
// The ParticleContainer (sceneRefs.particleLayer) is parented as a CHILD of the
// Flowgrid scene `container` (scene.ts: `container.addChild(particleLayer)`),
// and that container is itself positioned at
// (app.screen.width/2, app.screen.height/2) so the hex cluster centers in the
// canvas. Because the ParticleContainer INHERITS the container's centering
// transform, particle positions must be expressed in the SAME container-local
// space the hexes use (axialToPixel output: Core at {0,0}, ring cells at small
// offsets like {83, 48}).
//
// The prior inline implementation (FlowgridCanvas.tsx) ADDED refs.container.x/y
// to every hex-local position, producing stage/canvas coordinates. Pixi then
// applied the container centering transform a SECOND time to every particle, so
// all of them landed at roughly (2 × canvasCenterX, 2 × canvasCenterY) — the
// bottom-right off-canvas corner — making every animation type invisible.
//
// This module emits NO container offset: anchors stay container-local, matching
// the coordinate space the hexes themselves occupy.
//
// Zero runtime pixi.js dependency: SceneRefs and ParticleAnchors are imported
// as TYPES ONLY (import type) so this module loads under happy-dom test
// environments without WebGL.

import type { SceneRefs } from '../../render/flowgrid/scene.js';
import type { ParticleAnchors } from '../../render/flowgrid/particles.js';

// Build the ParticleAnchors payload from the current SceneRefs. Called per
// drained visual-event batch right before emitParticles. Lives in the UI layer
// so the render-layer particles.ts stays decoupled from scene.ts internals.
//
// IMPORTANT: do NOT offset any anchor by refs.container.x/y — the
// ParticleContainer inherits the scene container's centering transform, so
// adding the stage offset would double-apply it (the bug this module fixes).
export function buildParticleAnchors(refs: SceneRefs): ParticleAnchors {
  const cells = new Map<string, { x: number; y: number }>();
  for (const view of refs.cells.values()) {
    // view.x/view.y are already container-local (axialToPixel output, cached
    // on the CellView by scene.ts). Pass them through unchanged.
    cells.set(view.cellId, { x: view.x, y: view.y });
  }
  const routes = new Map<
    string,
    { from: { x: number; y: number }; to: { x: number; y: number } }
  >();
  for (const route of refs.routes.values()) {
    routes.set(route.routeId, {
      from: { x: route.fromX, y: route.fromY },
      to: { x: route.toX, y: route.toY },
    });
  }
  return {
    // Core hex is drawn at container-local origin (axialToPixel({0,0}) === {0,0}).
    core: { x: 0, y: 0 },
    cells,
    routes,
  };
}
