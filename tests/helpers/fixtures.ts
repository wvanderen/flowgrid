// Test fixtures for Phase 1.
// Plan 01-02/01-03 may extend these with richer factories; the public names and
// deterministic-by-construction contract stay stable.

import type { Rng, SimulationEnv } from '../../src/domain/index.js';
import type { FlowgridSnapshot } from '../../src/domain/index.js';
import { createStarterFlowgridState } from '../../src/content/index.js';

export type TestIds = {
  readonly clientId: string;
  readonly cellId: string;
  readonly coreId: string;
  readonly generatorModuleDefinitionId: string;
  readonly chargeCoreModuleDefinitionId: string;
  readonly outputModuleDefinitionId: string;
  readonly bloomModuleDefinitionId: string;
  readonly generatorModuleInstanceId: string;
  readonly chargeCoreModuleInstanceId: string;
  readonly outputModuleInstanceId: string;
  readonly bloomModuleInstanceId: string;
  readonly generatorSlotId: string;
  readonly chargeCoreSlotId: string;
  readonly outputSlotId: string;
  readonly bloomSlotId: string;
  readonly outputRouteId: string;
  readonly settingsId: string;
  readonly forgeHistoryId: string;
};

export function createTestIds(prefix: string): TestIds {
  const clientId = `${prefix}:client`;
  const cellId = `${prefix}:cell`;
  // Slot IDs follow the factory convention `${cellId}:slot:${kind}` so tests can
  // reference installed slots without the factory having to accept them as params.
  return {
    clientId,
    cellId,
    coreId: `${prefix}:core`,
    generatorModuleDefinitionId: 'flowgrid:module-definition:generator',
    chargeCoreModuleDefinitionId: 'flowgrid:module-definition:charge-core',
    outputModuleDefinitionId: 'flowgrid:module-definition:output',
    bloomModuleDefinitionId: 'flowgrid:module-definition:bloom',
    generatorModuleInstanceId: `${prefix}:module-instance:generator`,
    chargeCoreModuleInstanceId: `${prefix}:module-instance:charge-core`,
    outputModuleInstanceId: `${prefix}:module-instance:output`,
    bloomModuleInstanceId: `${prefix}:module-instance:bloom`,
    generatorSlotId: `${cellId}:slot:generator`,
    chargeCoreSlotId: `${cellId}:slot:charge-core`,
    outputSlotId: `${cellId}:slot:output`,
    bloomSlotId: `${cellId}:slot:bloom`,
    outputRouteId: `${prefix}:route:output-to-core`,
    settingsId: `${prefix}:settings`,
    forgeHistoryId: `${prefix}:forge-history`,
  };
}

// Tiny deterministic RNG for Phase 1 tests.
// Phase 1 has no executable forge behavior; this RNG only needs to be stable and
// reproducible. Plan 01-03 may keep this implementation or swap to a shared utility.

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

export type CreateTestSimulationEnvParams = {
  readonly now?: string;
  readonly localDate?: string;
  readonly seed?: string;
  readonly contentVersion?: string;
};

export function createTestSimulationEnv(
  params: CreateTestSimulationEnvParams = {},
): SimulationEnv {
  return {
    now: params.now ?? '2026-01-01T00:00:00.000Z',
    localDate: params.localDate ?? '2026-01-01',
    rng: createRng(params.seed ?? 'flowgrid-test-seed'),
    contentVersion: params.contentVersion ?? 'phase-1-starter-v1',
  };
}

// Convenience: build a starter FlowgridSnapshot with deterministic IDs prefixed by
// `prefix`. Used by unit and property tests to avoid repeating the long param list.
export function buildStarterSnapshot(prefix: string): {
  readonly ids: TestIds;
  readonly state: FlowgridSnapshot;
} {
  const ids = createTestIds(prefix);
  const state = createStarterFlowgridState({
    now: '2026-01-01T00:00:00.000Z',
    localDate: '2026-01-01',
    clientId: ids.clientId,
    cellId: ids.cellId,
    coreId: ids.coreId,
    generatorModuleInstanceId: ids.generatorModuleInstanceId,
    chargeCoreModuleInstanceId: ids.chargeCoreModuleInstanceId,
    outputModuleInstanceId: ids.outputModuleInstanceId,
    bloomModuleInstanceId: ids.bloomModuleInstanceId,
    outputRouteId: ids.outputRouteId,
    settingsId: ids.settingsId,
    forgeHistoryId: ids.forgeHistoryId,
  });
  return { ids, state };
}
