// Route lookup system.
//
// Finds Output routes from a Cell to the Core. Phase 1 starter state has exactly one
// such route per Cell; later phases may have multiple routes with split allocations.

import type { CellId, CoreId, FlowgridSnapshot, RouteRecord } from '../../domain/index.js';

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
export function routeCurrentThroughRoutes(
  current: number,
  routes: readonly RouteRecord[],
): { readonly routed: number; readonly leftover: number } {
  if (current <= 0 || routes.length === 0) {
    return { routed: 0, leftover: current };
  }
  let routed = 0;
  for (const route of routes) {
    routed += Math.floor((current * route.allocationPercent) / 100);
  }
  const leftover = current - routed;
  return { routed, leftover: Math.max(0, leftover) };
}
