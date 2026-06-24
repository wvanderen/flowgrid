// VER-03 P0: Dexie schema creation, store existence, and first-run seeding.
// Opens a fresh FlowgridDatabase against a reset IDBFactory and asserts the nine
// stores exist, the three singletons are seeded with starter values, and the
// remaining six stores are empty.

import { beforeEach, expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

import {
  DEFAULT_CONVERT_ALLOCATION_PERCENT,
  DEFAULT_SESSION_LENGTH_SECONDS,
  DEFAULT_STORE_ALLOCATION_PERCENT,
  STARTER_CONTENT_VERSION,
} from '../../src/content/index.js';
import { FlowgridDatabase, FlowgridRepository } from '../../src/persistence/index.js';

beforeEach(() => {
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = new IDBFactory();
});

test('a fresh FlowgridDatabase declares the ten expected stores (v3 adds rejuvenations) and no moduleDefinitions', async () => {
  const db = new FlowgridDatabase('schema-stores');
  await db.open();
  const storeNames = db.tables.map((t) => t.name).sort();
  expect(storeNames).toEqual(
    [
      'cells',
      'client',
      'core',
      'forgeHistory',
      'moduleInstances',
      'operations',
      'rejuvenations',
      'routes',
      'sessions',
      'settings',
    ].sort(),
  );
  expect(storeNames, 'moduleDefinitions store must NOT exist (D-06)').not.toContain('moduleDefinitions');
  // Phase 4 / version(3): the rejuvenations store is declared and accessible as a
  // typed table on the FlowgridDatabase instance.
  expect(db.rejuvenations).toBeDefined();
  expect(db.rejuvenations.name).toBe('rejuvenations');
  db.close();
});

test('first-run seeding populates the three singletons with starter values and leaves the other seven stores empty', async () => {
  const db = new FlowgridDatabase('schema-seed');
  const repo = new FlowgridRepository(db);
  await repo.open();

  const snapshot = await repo.loadSnapshot();

  expect(snapshot.client.contentVersion).toBe(STARTER_CONTENT_VERSION);
  expect(snapshot.core.convertAllocationPercent).toBe(DEFAULT_CONVERT_ALLOCATION_PERCENT);
  expect(snapshot.core.storeAllocationPercent).toBe(DEFAULT_STORE_ALLOCATION_PERCENT);
  expect(snapshot.core.energy).toBe(0);
  expect(snapshot.core.coreCharge).toBe(0);
  expect(snapshot.core.moduleTokens).toBe(0);
  expect(snapshot.core.forgeCount).toBe(0);
  // Phase 4 defaults: the seeded core starts at activationBoostLevel 0 with no
  // active rejuvenation marker (Pitfall 6 — byte-identical Phase 3 economy output).
  expect(snapshot.core.activationBoostLevel).toBe(0);
  expect(snapshot.core.activeRejuvenationStartedAt).toBeNull();
  expect(snapshot.settings.defaultSessionLengthSeconds).toBe(DEFAULT_SESSION_LENGTH_SECONDS);

  expect(snapshot.cells.size).toBe(0);
  expect(snapshot.moduleInstances.size).toBe(0);
  expect(snapshot.routes.size).toBe(0);
  expect(snapshot.sessions).toHaveLength(0);
  expect(snapshot.operations).toHaveLength(0);
  expect(snapshot.forgeHistory).toHaveLength(0);
  expect(snapshot.rejuvenations).toHaveLength(0);

  repo.close();
});
