// Pure Z-Lift target derivation (Phase 6.1 / D-07, Plan 06.1-02 Task 1).
//
// Given the currently-selected Cell id + the live CellView map, compute the
// per-cell target `scale` + `alpha` the Z-Lift pass should tween toward:
//   - selected cell: scale=LIFT_SCALE (1.3), alpha=1 (lifted + crisp)
//   - non-selected when a selection exists: scale=1, alpha=DIM_ALPHA (0.4)
//   - no selection: everything scale=1, alpha=1 (steady state)
//
// Tuning constants come from sketch-001 winner B ("Z-Lift Spotlight"). They are
// exported so the render layer (scene.ts) can re-derive them by name and so a
// future polish phase can tune them in exactly one place.
//
// Zero runtime pixi.js dependency: SceneRefs + CellView are imported as TYPES
// ONLY (`import type`) so this module loads under happy-dom test environments
// without WebGL — the same discipline `particle-anchors.ts` uses. scene.ts
// consumes this helper as a sibling render module (render→render import; the
// ESLint render-layer block does not apply to sibling imports).

import type { CellId } from '../../domain/index.js';
import type { CellView } from './scene.js';

// sketch-001 winner B: the selected hex scales up 1.3× and the rest dim to 0.4.
export const LIFT_SCALE = 1.3;
export const DIM_ALPHA = 0.4;

export interface ZLiftTarget {
  readonly scale: number;
  readonly alpha: number;
}

// Compute a per-cell-id target map. scene.ts applies the values in place via
// tweenScalar on hex.scale.x and direct assignment on hex.alpha (RESEARCH
// Pattern 4 lines 333-374; Pitfall 4 — never destroy+rebuild during Z-Lift).
export function computeZLiftTargets(
  selectedCellId: CellId | null,
  cells: ReadonlyMap<CellId, CellView>,
): Map<CellId, ZLiftTarget> {
  const targets = new Map<CellId, ZLiftTarget>();
  const hasSelection = selectedCellId !== null;
  for (const [cellId] of cells) {
    const isLifted = cellId === selectedCellId;
    targets.set(cellId, {
      scale: isLifted ? LIFT_SCALE : 1,
      alpha: hasSelection && !isLifted ? DIM_ALPHA : 1,
    });
  }
  return targets;
}
