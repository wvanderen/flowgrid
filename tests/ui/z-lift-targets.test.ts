// Plan 06.1-02 Task 1 RED: failing tests for the pure Z-Lift target helper.
//
// The helper (src/render/flowgrid/z-lift-targets.ts) lives under the RENDER layer
// (scene.ts imports it as a sibling), but it is a PURE function: no runtime
// pixi.js dependency. It mirrors the particle-anchors.ts discipline — SceneRefs/
// CellView are imported as TYPES ONLY so the module loads under happy-dom without
// WebGL. This test imports the helper directly and asserts pure numeric output.
//
// The behavior under test (RESEARCH Pattern 4 lines 333-374):
//   - null selection: scale=1, alpha=1 for every cell (no lift, no dim)
//   - selected id:    scale=LIFT_SCALE (1.3) for selected, 1 for others;
//                     alpha=DIM_ALPHA (0.4) for non-selected, 1 for selected
//   - the helper exports LIFT_SCALE + DIM_ALPHA constants (sketch-001 winner B)
//   - the helper file uses TYPE-ONLY imports for SceneRefs/CellView (no runtime Pixi)

import { expect, test } from 'vitest';

import {
  computeZLiftTargets,
  DIM_ALPHA,
  LIFT_SCALE,
} from '../../src/render/flowgrid/z-lift-targets.js';
import type { CellView } from '../../src/render/flowgrid/scene.js';

// Build a minimal CellView-shaped stub. CellView carries runtime pixi.js types
// (hex: Graphics) unavailable under happy-dom; cast through unknown so this
// test never imports pixi.js (mirrors particle-anchors.test.ts).
function cellViewStub(cellId: string): CellView {
  return {
    cellId,
    hex: null,
    x: 0,
    y: 0,
    color: 0x6b7280,
    activatedToday: false,
  } as unknown as CellView;
}

function cellsWith3Entries(): Map<string, CellView> {
  return new Map<string, CellView>([
    ['flowgrid:cell:a', cellViewStub('flowgrid:cell:a')],
    ['flowgrid:cell:b', cellViewStub('flowgrid:cell:b')],
    ['flowgrid:cell:c', cellViewStub('flowgrid:cell:c')],
  ]);
}

test('z-lift-targets: exports LIFT_SCALE=1.3 and DIM_ALPHA=0.4 (sketch-001 winner B tuning)', () => {
  expect(LIFT_SCALE).toBe(1.3);
  expect(DIM_ALPHA).toBe(0.4);
});

test('z-lift-targets: null selection → every cell scale=1, alpha=1 (no lift, no dim)', () => {
  const cells = cellsWith3Entries();
  const targets = computeZLiftTargets(null, cells);

  expect(targets.size).toBe(3);
  for (const target of targets.values()) {
    expect(target.scale).toBe(1);
    expect(target.alpha).toBe(1);
  }
});

test('z-lift-targets: selection → selected gets LIFT_SCALE + alpha 1; others get scale 1 + DIM_ALPHA', () => {
  const cells = cellsWith3Entries();
  const targets = computeZLiftTargets('flowgrid:cell:b', cells);

  expect(targets.get('flowgrid:cell:a')).toEqual({ scale: 1, alpha: DIM_ALPHA });
  expect(targets.get('flowgrid:cell:b')).toEqual({ scale: LIFT_SCALE, alpha: 1 });
  expect(targets.get('flowgrid:cell:c')).toEqual({ scale: 1, alpha: DIM_ALPHA });
});

test('z-lift-targets: helper file uses TYPE-ONLY SceneRefs/CellView imports (no runtime pixi.js in UI test bundle)', async () => {
  // Read the helper's source text and assert it uses `import type`. The module's
  // own contents are what make it safe to import under happy-dom; verifying the
  // text protects against a future regression that pulls runtime pixi into the
  // pure helper (which would break this test's environment).
  const fs = await import('node:fs');
  const path = await import('node:path');
  const helperPath = path.resolve(
    process.cwd(),
    'src/render/flowgrid/z-lift-targets.ts',
  );
  const source = fs.readFileSync(helperPath, 'utf8');

  // Every `import ... from` line in the helper must be `import type`.
  const importLines = source.match(/^import[^\n]*from[^\n]*$/gm) ?? [];
  expect(importLines.length).toBeGreaterThan(0);
  for (const line of importLines) {
    expect(line.startsWith('import type')).toBe(true);
  }
  // And the helper must not pull the pixi.js package at all.
  expect(source.includes('pixi.js')).toBe(false);
});
