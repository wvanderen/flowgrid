// Vitest setup: install a global in-memory IndexedDB for persistence tests.
//
// `fake-indexeddb/auto` sets `globalThis.indexedDB` and `globalThis.IDBKeyRange`
// once per test process. Persistence tests that need a fresh factory still reset
// `globalThis.indexedDB = new IDBFactory()` in their own `beforeEach`.

import 'fake-indexeddb/auto';
