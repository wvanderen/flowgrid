// Custom hex math module (RESEARCH Pattern 3 lines 386-444, PATTERNS hex-layout).
//
// Pure TypeScript with zero runtime dependencies. STACK.md mandates owning this
// code so simulation, layout, hit-detection, and tests all agree on the same axial
// projection. The module imports nothing — it is value-in / value-out math.
//
// Convention: pointy-top axial coordinates with the q-axis pointing east and the
// r-axis pointing south-east (Red Blob "Hexagonal Grids"). The Core sits at (0,0).

export interface AxialCoord {
  readonly q: number;
  readonly r: number;
}

export interface PixelPoint {
  readonly x: number;
  readonly y: number;
}

// Pointy-top pixel projection. Centre of hex (q, r) lands at (x, y) relative to the
// origin. `size` is the circumradius (centre → vertex) of each hex.
export function axialToPixel(coord: AxialCoord, size: number): PixelPoint {
  const { q, r } = coord;
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x, y };
}

// Inverse projection: pixel → fractional axial, then snapped to the nearest integer
// axial coordinate via cube rounding. Eliminates floating-point tap misses (T-03-06).
export function pixelToAxial(x: number, y: number, size: number): AxialCoord {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
  const r = (2 / 3 * y) / size;
  return axialRound({ q, r });
}

// Cube rounding: round q, r, and s = -q-r independently, then drop the component
// whose rounding diff was largest so the cube constraint q + r + s = 0 holds.
export function axialRound(coord: { q: number; r: number }): AxialCoord {
  const s = -coord.q - coord.r;
  let rq = Math.round(coord.q);
  let rr = Math.round(coord.r);
  const rs = Math.round(s);
  const qDiff = Math.abs(rq - coord.q);
  const rDiff = Math.abs(rr - coord.r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
  else if (rDiff > sDiff) rr = -rq - rs;
  return { q: rq, r: rr };
}

// All coordinates on hex ring `radius` around the origin. ringCells(0) returns just
// the origin; ringCells(N) walks six edges of N steps each. Used for laying Cells
// out around the Core (ring 1 holds the first six cells, ring 2 the next twelve,
// etc.).
export function ringCells(radius: number): readonly AxialCoord[] {
  if (radius <= 0) return [{ q: 0, r: 0 }];
  const out: AxialCoord[] = [];
  // Pointy-top: start one step in the -q/+r direction from origin, walk the six
  // canonical axial edges. Directions follow Red Blob's pointy-top permutation.
  let coord: AxialCoord = { q: -radius, r: radius };
  const directions: readonly AxialCoord[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];
  for (let i = 0; i < 6; i++) {
    const dir = directions[i]!;
    for (let j = 0; j < radius; j++) {
      out.push(coord);
      coord = { q: coord.q + dir.q, r: coord.r + dir.r };
    }
  }
  return out;
}
