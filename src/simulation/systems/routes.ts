// Route lookup system.
//
// Finds Output routes from a Cell to the Core. Phase 1 starter state has exactly one
// such route per Cell; later phases may have multiple routes with split allocations.

import type { CellId, CoreId, FlowgridSnapshot, RouteRecord } from '../../domain/index.js';
import { MODULE_LEVEL_BONUS } from '../../content/index.js';

export function findRoutesFromCellToCore(
  state: FlowgridSnapshot,
  cellId: CellId,
  coreId: CoreId,
): readonly RouteRecord[] {
  const out: RouteRecord[] = [];
  for (const route of state.routes.values()) {
    if (route.sourceCellId === cellId && route.targetCoreId === coreId) {
      out.push(route);
    }
  }
  return out;
}

// Integer multi-source routing: each route carries an integer allocationPercent
// (0-100). The sum of allocations across routes from a Cell may be less than 100;
// the leftover Current stays on the Cell. Phase 1 starter route is 100%, so all
// Current routes out.
//
// Phase 5 / D-04 A2: the Output module's level boosts the per-route routed amount
// via an integer multiply-then-floor by (100 + outputLevel * MODULE_LEVEL_BONUS.output)
// / 100. outputLevel=0 is byte-identical to Phase 1-4 behavior (Pitfall 6 backward-
// compat). CRITICAL: this does NOT raise the 100-sum allocation cap
// (validateRouteAllocations still caps the sum at 100) — RESEARCH Pitfall 1 A2. The
// level multiplies the routed THROUGHPUT per route, not the allocation percent.
export function routeCurrentThroughRoutes(
  current: number,
  routes: readonly RouteRecord[],
  outputLevel = 0,
): { readonly routed: number; readonly leftover: number } {
  if (current <= 0 || routes.length === 0) {
    return { routed: 0, leftover: current };
  }
  const outputBoostMultiplier = 100 + outputLevel * MODULE_LEVEL_BONUS.output;
  let routed = 0;
  for (const route of routes) {
    const perRoute = Math.floor((current * route.allocationPercent) / 100);
    routed += Math.floor((perRoute * outputBoostMultiplier) / 100);
  }
  const leftover = current - routed;
  return { routed, leftover: Math.max(0, leftover) };
}
