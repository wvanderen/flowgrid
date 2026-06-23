// src/domain public barrel.
//
// Re-exports the full domain surface. UI, render, persistence, app, and tests should
// import from here; they SHOULD NOT reach into individual files (lets us reorganize
// the internals without breaking consumers).

export * from './ids.js';
export * from './primitives.js';
export * from './time.js';
export * from './records.js';
export * from './operation-records.js';
export * from './validation.js';
export * from './invariants.js';
export * from './result.js';
