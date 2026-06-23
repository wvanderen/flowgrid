// Production RNG factory — the xmur3 + mulberry32 implementation extracted from
// tests/helpers/fixtures.ts (Plan 03-02 Task 1, PATTERNS F1).
//
// The implementation is pure TypeScript with no test-only dependencies, so lifting
// it to `src/app/rng.ts` lets the production env factory produce a deterministic
// SimulationEnv.rng without depending on a test helper. Phase 1's exact-replay
// invariant (D-08) relies on RNG being injected through SimulationEnv; this factory
// is the single source of the seed → nextInt stream.
//
// The implementation is byte-for-byte identical to `tests/helpers/fixtures.ts`
// lines 61-107. The two intentionally share the same algorithm so a test that
// reproduces a failure can swap this factory for the test one without behaviour
// changes. If the algorithm ever diverges, the test fixture must move to import
// this module instead of carrying its own copy.

import type { Rng } from '../domain/index.js';

function xmur3Hash(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const seedHash = xmur3Hash(seed);
  const generator = mulberry32(seedHash());
  const buffer: number[] = [];
  const ensure = (count: number): void => {
    while (buffer.length < count) buffer.push(generator());
  };
  const make = (consumed: number): Rng => ({
    seed,
    nextInt(minInclusive: number, maxInclusive: number) {
      const nextConsumed = consumed + 1;
      ensure(nextConsumed);
      const u = buffer[consumed];
      if (u === undefined) {
        throw new Error('createRng: buffer was not populated');
      }
      const range = maxInclusive - minInclusive + 1;
      const value = minInclusive + Math.floor(u * range);
      return [value, make(nextConsumed)] as const;
    },
  });
  return make(0);
}
