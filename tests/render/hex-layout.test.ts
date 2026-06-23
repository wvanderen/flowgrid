// Plan 03-02 Task 2 RED: custom hex math tests (RESEARCH Pattern 3 lines 386-444).
//
// Pure-TS assertions over the axial/cube projection the renderer uses for Flowgrid
// layout, ring arrangement, and tap hit-detection. These tests run under happy-dom
// (per vitest.config.ts: tests/render/** → dom project) but exercise pure math —
// happy-dom provides a superset of node's globals, so node-style code keeps working.

import { expect, test } from 'vitest';
import fc from 'fast-check';

import {
  axialToPixel,
  axialRound,
  pixelToAxial,
  ringCells,
  type AxialCoord,
} from '../../src/render/flowgrid/hex-layout.js';

const SIZE = 48;

test('axialToPixel: origin maps to (0, 0) — the Core sits at the canvas centre', () => {
  expect(axialToPixel({ q: 0, r: 0 }, SIZE)).toEqual({ x: 0, y: 0 });
});

test('axialToPixel: ({q:1, r:0}, size) lands strictly to the right of origin (pointy-top east)', () => {
  const p = axialToPixel({ q: 1, r: 0 }, SIZE);
  expect(p.x).toBeGreaterThan(0);
  expect(Math.abs(p.y)).toBeLessThan(1e-9);
});

test('pixelToAxial is the inverse of axialToPixel for integer axial coordinates (cube rounding)', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: -20, max: 20 }),
      fc.integer({ min: -20, max: 20 }),
      fc.integer({ min: 8, max: 200 }),
      (q, r, size) => {
        const origin: AxialCoord = { q, r };
        const { x, y } = axialToPixel(origin, size);
        const back = pixelToAxial(x, y, size);
        return back.q === q && back.r === r;
      },
    ),
    { numRuns: 200 },
  );
});

test('ringCells(0) returns exactly one coordinate at the origin', () => {
  const ring = ringCells(0);
  expect(ring).toHaveLength(1);
  expect(ring[0]).toEqual({ q: 0, r: 0 });
});

test('ringCells(1) returns exactly six coordinates forming a hex ring at cube distance 1', () => {
  const ring = ringCells(1);
  expect(ring).toHaveLength(6);
  // All distinct.
  const seen = new Set(ring.map((c) => `${c.q},${c.r}`));
  expect(seen.size).toBe(6);
  // All at cube distance 1 from origin.
  for (const c of ring) {
    const cubeDist = (Math.abs(c.q) + Math.abs(c.r) + Math.abs(-c.q - c.r)) / 2;
    expect(cubeDist).toBe(1);
  }
});

test('ringCells(2) returns exactly twelve coordinates forming a hex ring at cube distance 2', () => {
  const ring = ringCells(2);
  expect(ring).toHaveLength(12);
  const seen = new Set(ring.map((c) => `${c.q},${c.r}`));
  expect(seen.size).toBe(12);
  for (const c of ring) {
    const cubeDist = (Math.abs(c.q) + Math.abs(c.r) + Math.abs(-c.q - c.r)) / 2;
    expect(cubeDist).toBe(2);
  }
});

test('axialRound: {0.49, 0} rounds to {0, 0} (closer to origin)', () => {
  expect(axialRound({ q: 0.49, r: 0 })).toEqual({ q: 0, r: 0 });
});

test('axialRound: {0.51, 0} rounds to {1, 0} (closer to east neighbor)', () => {
  expect(axialRound({ q: 0.51, r: 0 })).toEqual({ q: 1, r: 0 });
});

test('axialRound: always produces integer q/r satisfying the cube constraint (s = -q-r is also integer)', () => {
  fc.assert(
    fc.property(
      fc.float({ min: -10, max: 10, noNaN: true }),
      fc.float({ min: -10, max: 10, noNaN: true }),
      (qf, rf) => {
        const out = axialRound({ q: qf, r: rf });
        return (
          Number.isInteger(out.q) &&
          Number.isInteger(out.r) &&
          Number.isInteger(-out.q - out.r)
        );
      },
    ),
    { numRuns: 200 },
  );
});
