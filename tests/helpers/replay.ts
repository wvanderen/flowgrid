// Replay equality helper for Phase 1 deterministic-replay property tests.
// Plan 01-03 wires this into deterministic-replay.property.test.ts.

import { expect } from 'vitest';

import type { SimulationResult } from '../../src/domain/index.js';

export function expectReplayEqual(a: SimulationResult, b: SimulationResult): void {
  expect(a).toEqual(b);
}

export function expectStateReplayEqual<T>(a: T, b: T): void {
  expect(a).toEqual(b);
}
