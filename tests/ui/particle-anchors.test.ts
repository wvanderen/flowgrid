// Plan 06-05 Task 1 RED: regression test asserting buildParticleAnchors returns
// CONTAINER-LOCAL particle anchors (not stage/canvas coordinates).
//
// Root cause (confirmed in .planning/debug/no-canvas-animation.md): the inline
// buildParticleAnchors in FlowgridCanvas.tsx added refs.container.x/y to every
// hex-local position, producing stage-space coordinates. But the ParticleContainer
// (sceneRefs.particleLayer) is a CHILD of the centered scene container
// (scene.ts: container.addChild(particleLayer)), so Pixi applies the container's
// centering transform a SECOND time to every particle. The result: every emitted
// particle landed at roughly (2 × canvasCenterX, 2 × canvasCenterY) — the
// bottom-right off-canvas corner — making all animation invisible.
//
// This test guards the fix: anchors must stay in the same container-local space
// the hexes use (axialToPixel output). It is a pure-function test (no JSX, no
// WebGL) — buildParticleAnchors uses TYPE-ONLY imports for SceneRefs/ParticleAnchors
// so the module loads under happy-dom without pixi.js.

import { expect, test } from 'vitest';

import { buildParticleAnchors } from '../../src/ui/flowgrid-home/particle-anchors.js';
import type { SceneRefs } from '../../src/render/flowgrid/scene.js';

// Build a minimal SceneRefs stub whose only meaningful fields are the ones
// buildParticleAnchors reads: container.x/y, cells (cellId/x/y), and routes
// (routeId/fromX/fromY/toX/toY). The remaining SceneRefs fields (coreHex,
// particleLayer, liveParticles, stopMotionTick, app) carry runtime pixi.js
// types unavailable under happy-dom; they are stubbed as null/undefined and
// cast through unknown so this test never imports pixi.js.
function buildSceneRefsStub(): SceneRefs {
  return {
    // A typical canvas-center offset on an 800x600 canvas.
    container: { x: 400, y: 300, label: 'flowgrid-scene' },
    coreHex: null,
    cells: new Map([
      [
        'flowgrid:cell:test',
        {
          cellId: 'flowgrid:cell:test',
          // Container-local hex position (axialToPixel output for a ring-1 slot).
          x: 83,
          y: 48,
          color: 0x6b7280,
          activatedToday: false,
        },
      ],
    ]),
    routes: new Map([
      [
        'flowgrid:route:0',
        {
          routeId: 'flowgrid:route:0',
          fromX: 0,
          fromY: 0,
          toX: 83,
          toY: 48,
        },
      ],
    ]),
    particleLayer: null,
    liveParticles: [],
    stopMotionTick: () => {},
    app: null,
  } as unknown as SceneRefs;
}

test('buildParticleAnchors: core is container-local origin {0,0}, NOT the stage offset', () => {
  const anchors = buildParticleAnchors(buildSceneRefsStub());
  // If the bug were present this would be { x: 400, y: 300 } (the container offset).
  expect(anchors.core).toEqual({ x: 0, y: 0 });
});

test('buildParticleAnchors: cell anchors stay at their hex-local positions (no stage offset added)', () => {
  const anchors = buildParticleAnchors(buildSceneRefsStub());
  // If the bug were present this would be { x: 483, y: 348 } (83+400, 48+300).
  expect(anchors.cells.get('flowgrid:cell:test')).toEqual({ x: 83, y: 48 });
});

test('buildParticleAnchors: route endpoints stay at their container-local line coords', () => {
  const anchors = buildParticleAnchors(buildSceneRefsStub());
  const route = anchors.routes.get('flowgrid:route:0');
  expect(route).toBeDefined();
  // If the bug were present: from { x: 400, y: 300 }, to { x: 483, y: 348 }.
  expect(route!.from).toEqual({ x: 0, y: 0 });
  expect(route!.to).toEqual({ x: 83, y: 48 });
});
