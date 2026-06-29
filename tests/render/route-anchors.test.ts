import { expect, test } from 'vitest';

import { activeFocusTrail, routeIdForCell } from '../../src/render/flowgrid/route-anchors.js';
import type { ParticleAnchors } from '../../src/render/flowgrid/particles.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';

test('routeIdForCell returns the durable route id emitted by simulation visual events', () => {
  const { ids, state } = buildStarterSnapshot('route-anchor');

  expect(routeIdForCell(state, ids.cellId, 0)).toBe(ids.outputRouteId);
});

test('activeFocusTrail resolves the active Cell route as Cell -> Core', () => {
  const { ids, state } = buildStarterSnapshot('active-trail');
  const cell = state.cells.get(ids.cellId)!;
  const active = {
    ...state,
    cells: new Map(state.cells).set(ids.cellId, {
      ...cell,
      activeSessionStartedAt: '2026-01-01T00:00:00.000Z',
    }),
  };
  const anchors: ParticleAnchors = {
    core: { x: 0, y: 0 },
    cells: new Map([[ids.cellId, { x: 83, y: 48 }]]),
    routes: new Map([
      [
        ids.outputRouteId,
        {
          from: { x: 0, y: 0 },
          to: { x: 83, y: 48 },
        },
      ],
    ]),
  };

  expect(activeFocusTrail(active, anchors)).toEqual({
    from: { x: 83, y: 48 },
    to: { x: 0, y: 0 },
  });
});
