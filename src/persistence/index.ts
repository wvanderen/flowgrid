// src/persistence public barrel.
//
// Re-exports the persistence surface. Future app/UI (Phase 3+) imports from here;
// it SHOULD NOT reach into individual files. Dexie internals stay behind
// database.ts — consumers go through FlowgridRepository.

export * from './errors.js';
export { generateClientId } from './ids.js';
export { FlowgridDatabase } from './database.js';
export { seedStarterState } from './seeding.js';
export { diffFlowgridSnapshots } from './diff.js';
export type { FlowgridWritePlan } from './diff.js';
export { FlowgridRepository } from './repository.js';
export type { ApplyResult } from './repository.js';
