import type { CellId, FlowgridSnapshot } from '../../domain/index.js';
import type { ParticleAnchors } from './particles.js';

export function routeIdForCell(
  snapshot: FlowgridSnapshot,
  cellId: CellId,
  fallbackIndex: number,
): string {
  const routes = [...snapshot.routes.values()]
    .filter((route) => route.sourceCellId === cellId && route.targetCoreId === snapshot.core.id)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return routes[0]?.id ?? `flowgrid:route:${fallbackIndex}`;
}

export function activeFocusCellId(snapshot: FlowgridSnapshot): CellId | null {
  for (const cell of snapshot.cells.values()) {
    if (cell.archivedAt === null && cell.activeSessionStartedAt !== null) {
      return cell.id;
    }
  }
  return null;
}

export function activeFocusTrail(
  snapshot: FlowgridSnapshot,
  anchors: ParticleAnchors,
): { readonly from: { x: number; y: number }; readonly to: { x: number; y: number } } | null {
  const cellId = activeFocusCellId(snapshot);
  if (cellId === null) return null;

  const routeId = routeIdForCell(snapshot, cellId, -1);
  const route = anchors.routes.get(routeId);
  if (route === undefined) return null;

  // Scene route lines are drawn Core -> Cell. Current reads as Cell -> Core.
  return { from: route.to, to: route.from };
}
