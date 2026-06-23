// Deterministic environment for simulation.
//
// Phase 1 has no production RNG requirement (forge is not executable yet), so this
// module only re-exports the env types from the domain. Tests construct envs via
// `tests/helpers/fixtures.ts::createTestSimulationEnv`. A production RNG + env
// factory lands when the app shell needs it (Phase 3+).

export type { Rng, SimulationEnv } from '../domain/index.js';
