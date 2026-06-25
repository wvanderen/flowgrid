// Production RNG factory — re-exported from src/simulation/rng.ts.
//
// The canonical implementation lives in src/simulation/rng.ts so simulation handlers
// (forge reveal, future randomized rewards) can import it without crossing into the
// app layer (tests/simulation/boundaries.test.ts enforces the one-way boundary).
// This file preserves the historical src/app/rng.ts import surface for src/app/env.ts;
// new consumers should import directly from src/simulation/rng.js.

export { createRng } from '../simulation/rng.js';
