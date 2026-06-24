// Production repository singleton — the single FlowgridRepository instance used by
// `initApp` (app-open sequence) and every UI dispatch caller.
//
// Module-level instantiation is safe: the Dexie constructor only registers schema
// versions and performs NO I/O. The database is opened lazily inside
// `FlowgridRepository.open()` (called from initApp on app entry). Both `database`
// and `repository` are exported so tests and initApp can reach the same instance.
//
// NOTE: tests should NOT import this singleton — they construct isolated
// FlowgridDatabase/FlowgridRepository instances against fake-indexeddb for
// per-test isolation. UI tests stub this module via vi.mock.

import { FlowgridDatabase } from '../persistence/database.js';
import { FlowgridRepository } from '../persistence/repository.js';

// Stable production database name. Dexie stores it under this name in IndexedDB.
export const database = new FlowgridDatabase('flowgrid');
export const repository = new FlowgridRepository(database);
