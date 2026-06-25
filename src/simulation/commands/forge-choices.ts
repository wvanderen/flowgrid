// Phase 5 pure forge reveal selector (D-05, D-06, D-07; Pitfall 2).
//
// forgeChoices(snapshot) returns a readonly ForgeChoice[] of length min(3, poolSize)
// deterministically derived from snapshot.core.forgeCount. It is a PURE READ: same
// snapshot -> same choices every call, NEVER a state change, NEVER env.rng. The
// run_forge handler calls this to RE-DERIVE the revealed set inside the command and
// validates chosenReward ∈ that set (TOCTOU defense — Pitfall 3).
//
// Determinism contract (Phase 1 D-08 / Phase 5 D-06): the seed is derived from the
// snapshot's monotonic forgeCount, not from ambient RNG. createRng is constructed
// INSIDE this function via createRng(`forge:${forgeCount}`) so replay reproduces the
// exact reveal regardless of call order. Pitfall 2: NEVER read env.rng here.
//
// Pool construction (D-05 filtered reveal): iterate every non-archived Cell, and for
// each of the four ModuleDefinitionKinds, include {cellId, moduleKind} in the pool
// when the owning ModuleInstance exists AND its level < MODULE_MAX_LEVEL. Maxed
// modules are filtered out so every revealed choice is useful ("agency not gambling").
//
// Selection (D-07 cross-Cell global reveal): when the pool has <= 3 entries, return
// it as-is (handles the empty pool, 1, 2, and 3-entry edges). Otherwise run a partial
// Fisher-Yates for 3 iterations using the immutable Rng threaded through a `let`.

import type { FlowgridSnapshot } from '../../domain/index.js';
import type { ForgeChoice } from '../../domain/index.js';
import type { ModuleDefinitionKind } from '../../domain/index.js';
import type { Rng } from '../../domain/index.js';

import { createRng } from '../rng.js';
import { MODULE_MAX_LEVEL } from '../../content/index.js';
import { findModuleInstanceForCell } from '../systems/modules.js';

// The four starter module kinds in a stable iteration order. Same order every call
// keeps the pool construction deterministic (the seeded Fisher-Yates then selects
// from this stable pool).
const MODULE_KINDS: readonly ModuleDefinitionKind[] = ['generator', 'charge_core', 'output', 'bloom'];

export function forgeChoices(snapshot: FlowgridSnapshot): readonly ForgeChoice[] {
  // Collect non-maxed {cellId, moduleKind} across ALL active (non-archived) Cells.
  const pool: ForgeChoice[] = [];
  for (const cell of snapshot.cells.values()) {
    if (cell.archivedAt !== null) continue;
    for (const kind of MODULE_KINDS) {
      const instance = findModuleInstanceForCell(snapshot, cell.id, kind);
      if (instance !== undefined && instance.level < MODULE_MAX_LEVEL) {
        pool.push({ cellId: cell.id, moduleKind: kind });
      }
    }
  }

  // D-05 edges: fewer than 3 non-maxed options exist. Return the pool as-is —
  // length 0 (all maxed) returns []; length 1-3 returns the pool verbatim.
  if (pool.length <= 3) {
    return pool;
  }

  // Deterministic partial Fisher-Yates seeded from the snapshot's forgeCount.
  // Pitfall 2: createRng is constructed INSIDE; NEVER env.rng. The Rng is immutable
  // (nextInt returns [value, nextRng]), so thread `next` through the loop via `let`.
  let rng: Rng = createRng(`forge:${snapshot.core.forgeCount}`);
  const indices = pool.map((_, i) => i);
  for (let n = 0; n < 3; n++) {
    const [pick, next] = rng.nextInt(n, indices.length - 1);
    const tmp = indices[n]!;
    indices[n] = indices[pick]!;
    indices[pick] = tmp;
    rng = next;
  }
  return indices.slice(0, 3).map((i) => pool[i]!);
}
