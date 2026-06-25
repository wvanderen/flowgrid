// Deterministic RNG factory — the xmur3 + mulberry32 implementation.
//
// Canonical home: simulation owns deterministic RNG because that is the layer whose
// handlers (forge reveal, future randomized rewards) need a seeded, replayable stream
// derived from snapshot state rather than ambient injection. The Rng interface itself
// lives in src/domain/result.ts; this factory is its concrete construction.
//
// Phase 1's exact-replay invariant (D-08) relies on RNG being a pure function of its
// seed; this factory is the single source of the seed -> nextInt stream for production
// (src/app/env.ts) and for simulation-internal derivation (forge-choices.ts).
//
// The implementation is byte-for-byte identical to `tests/helpers/fixtures.ts`
// lines 61-107. The two intentionally share the same algorithm so a test that
// reproduces a failure can swap this factory for the test one without behaviour
// changes. If the algorithm ever diverges, the test fixture must move to import this
// module instead of carrying its own copy.
//
// Architecture: this file lives in src/simulation so simulation handlers can import it
// without crossing into the app layer (tests/simulation/boundaries.test.ts enforces
// the one-way boundary). src/app/rng.ts re-exports createRng from here for backward
// compatibility with src/app/env.ts.

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
