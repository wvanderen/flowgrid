# Phase 2 Pattern Mapping — Durable Local-First Spine

**Mapped:** 2026-06-23
**Sources:** `02-CONTEXT.md`, `02-RESEARCH.md`, Phase 1 code under `src/`
**Conventions verified below (apply to every file):**
- ESM imports use explicit `.js` extensions despite `.ts` source (Bundler `moduleResolution`). See `tsconfig.json:6`.
- Type-only imports use `import type { ... } from '...';`. `verbatimModuleSyntax: false` (`tsconfig.json:20`) allows mixing but the codebase separates type-only imports from value imports consistently (see `engine.ts:7-15`).
- Consumers import from layer barrels (`../domain/index.js`, `../../src/domain/index.js`), never from internal files (`domain/index.ts:1-5` documents this).
- Header comment block on every module explaining role + constraints (see `records.ts:1-4`, `operation-records.ts:1-5`, `validation.ts:1-5`).
- Records are `readonly` interfaces with `readonly` fields; economy fields use branded aliases from `primitives.ts` (integer intent) — never raw `number` for economy truth.
- IDs are plain `string` aliases, not branded (`ids.ts:1-9` rationale).
- Domain logic returns typed results / `ValidationIssue[]`, never throws for normal invalidity (`validation.ts:1-5`).
- `exactOptionalPropertyTypes: true` and `noUncheckedIndexedAccess: true` are ON (`tsconfig.json:9-10`) — optional fields need `| undefined` care; indexed access returns `T | undefined`.
- No comments in code unless a header rationale block (AGENTS.md rule). Phase 2 must NOT add inline comments beyond header blocks.

---

## A. Persistence source modules (`src/persistence/`)

### A1. `src/persistence/errors.ts` (NEW)
- **Role:** Typed `PersistenceError` contract + `DOMException`→kind mapping. DATA-07 surface consumed by future UI; no rendering here.
- **Data flow:** Pure data/type module. No I/O. Imported by `repository.ts`, `import.ts`, and re-exported from `index.ts`.
- **Closest analog:** `src/domain/validation.ts` (typed issue contract with discriminated code union + optional fields).
- **Excerpt (validation.ts:9-27):**
```ts
export type ValidationIssueCode =
  | 'negative_resource'
  | 'invalid_reference'
  | 'duplicate_module_install'
  | 'invalid_operation_shape';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  readonly code: ValidationIssueCode;
  readonly severity: ValidationSeverity;
  readonly entityType?: EntityType;
  readonly entityId?: string;
  readonly path?: string;
  readonly message: string;
}
```
- **Pattern notes:** Mirror this shape exactly: a `PersistenceErrorKind` string union (the 8 kinds in RESEARCH §6.1) + a `readonly` `PersistenceError` interface with `kind`, `message`, `recoverable: boolean`, and `cause?: unknown`. Under `exactOptionalPropertyTypes`, `cause?: unknown` is fine (no `| undefined`). Add a pure `mapDomException(e: unknown): PersistenceError` function (follows `validateFlowgridSnapshot` composition style in `invariants.ts:275`). Header comment cites DATA-07 + "Phase 3 renders; Phase 2 ships contract only."

### A2. `src/persistence/ids.ts` (NEW)
- **Role:** `generateClientId()` → `crypto.randomUUID()`. The single persistence-generated ID (Agent's Discretion).
- **Data flow:** Pure helper. Called by `seeding.ts`.
- **Closest analog:** `src/domain/ids.ts` (plain string ID aliases) + `src/simulation/operation-events.ts:15` (module-local `const PAYLOAD_VERSION = 1;`).
- **Excerpt (operation-events.ts:15, 47-67):**
```ts
const PAYLOAD_VERSION = 1;
// ...
export function operationFromCommand(command, at, options = {}): SyncOperation {
  // ...
  return { id: command.operationId, /* ... */ payloadVersion: PAYLOAD_VERSION, /* ... */ };
}
```
- **Pattern notes:** Export `export function generateClientId(): string { return crypto.randomUUID(); }`. Thin wrapper keeps the platform call swappable in tests. Re-export the `ClientId` alias from `../domain/index.js` if needed by callers. Do NOT generate operation/session IDs here — those are command-supplied (CONTEXT D-02, `operation-records.ts:4-5`).

### A3. `src/persistence/database.ts` (NEW)
- **Role:** Dexie subclass declaration: `db.version(1).stores({...})` with 9-store topology (D-05), `on('populate')` seeding hook, `on('blocked')` error surfacing.
- **Data flow:** The persistence root. Imported (type and value) by `repository.ts`, `import.ts`, `export-json.ts`. Declares the typed `Table` handles the repository reads/writes through.
- **Closest analog (structure):** `src/content/starter-state.ts` (factory that assembles records from constants) + `src/simulation/operation-events.ts` (module-local constants + exported factory). For the Dexie-specific schema syntax, RESEARCH §1.1 is authoritative.
- **Excerpt (starter-state.ts:54-75 — the seeding factory pattern):**
```ts
export function createStarterFlowgridState(
  params: CreateStarterFlowgridStateParams,
): FlowgridSnapshot {
  const { now, clientId, cellId, coreId, /* ... */ } = params;
  return {
    client: { id: clientId, contentVersion: 'flowgrid:starter:v1', createdAt: now, updatedAt: now },
    cells: new Map([[cellId, { /* ... */ }]]),
    core: { id: coreId, /* ... */ updatedAt: now },
    // ...
  };
}
```
- **Excerpt (RESEARCH §1.1 — the schema to declare, verbatim):**
```ts
db.version(1).stores({
  client:         'id',
  cells:          'id',
  core:           'id',
  moduleInstances:'id, ownerCellId',
  routes:         'id, sourceCellId',
  sessions:       'id, cellId, startedAt',
  operations:     'id, status, createdAt',
  settings:       'id',
  forgeHistory:   'id, createdAt',
});
```
- **Pattern notes:**
  - Subclass `Dexie` and declare typed table handles mirroring the record types: `client!: Table<ClientRecord, ClientId>;` etc. (key type = the record's `id` alias from `ids.ts`).
  - Constants for default settings come from `src/content/formulas.ts` (`DEFAULT_CONVERT_ALLOCATION_PERCENT`, `DEFAULT_SESSION_LENGTH_SECONDS`, etc.) — import from `../content/index.js` (runtime import is fine; content is not simulation).
  - Starter `CoreRecord` shape = the `core` literal in `starter-state.ts:101-112`.
  - `on('populate', tx => ...)` must use the `tx` parameter, not `db`, and must stay synchronous (constants only) — RESEARCH §1.6 constraint. Delegates record construction to `seeding.ts`.
  - `on('blocked')` maps to `PersistenceError` via `errors.ts` (A1).
  - `now` for seeding: persistence MAY call `new Date().toISOString()` here (the layer rule forbids ambient time in simulation, not persistence — RESEARCH §1.6). This is the ONE place persistence creates timestamps.

### A4. `src/persistence/seeding.ts` (NEW)
- **Role:** `seedStarterState(tx)` — inserts singleton `ClientRecord` (with `generateClientId()`), `SettingsRecord`, and starter `CoreRecord` into the populate transaction. D-06 + Agent's Discretion.
- **Data flow:** Pure function called inside `database.ts` `on('populate')`. No ambient I/O; takes the Dexie `tx`.
- **Closest analog:** `src/content/starter-state.ts` (full starter factory) — but Phase 2 seeds ONLY singletons, not cells/modules/routes (those are created by future user actions, RESEARCH §1.6).
- **Excerpt (starter-state.ts:101-112, 179-185 — the singleton shapes to seed):**
```ts
core: {
  id: coreId,
  energy: 0,
  coreCharge: 0,
  lifetimeEnergy: 0,
  integration: 0,
  moduleTokens: 0,
  convertAllocationPercent: DEFAULT_CONVERT_ALLOCATION_PERCENT,
  storeAllocationPercent: DEFAULT_STORE_ALLOCATION_PERCENT,
  forgeCount: 0,
  updatedAt: now,
},
// ...
settings: {
  id: settingsId,
  defaultSessionLengthSeconds: DEFAULT_SESSION_LENGTH_SECONDS,
  dailyTargetSeconds: DEFAULT_DAILY_TARGET_SECONDS,
  localDayBoundary: DEFAULT_LOCAL_DAY_BOUNDARY,
  updatedAt: now,
},
```
- **Pattern notes:** Reuse the exact record literals from `starter-state.ts` for core/settings/client (same constants, same zeroed counters). Do NOT reuse `createStarterFlowgridState` directly — it builds cells/modules/routes/sessions/operations arrays which Phase 2 intentionally leaves empty on first run (RESEARCH §1.6). Import constants from `../content/index.js`; import `generateClientId` from `./ids.js`; import `STARTER_CONTENT_VERSION` from `../content/index.js` for `ClientRecord.contentVersion` (matches `starter-state.ts:79`).

### A5. `src/persistence/diff.ts` (NEW)
- **Role:** Pure `diffFlowgridSnapshots(prev, next)` → write plan (inserts/updates/deletes/appends). D-03. Unit-testable WITHOUT IndexedDB.
- **Data flow:** Pure function over `FlowgridSnapshot`. Consumed by `repository.ts` inside the transaction. No I/O.
- **Closest analog:** `src/domain/invariants.ts` (pure snapshot inspectors returning structured output; the model for "pure function over snapshot pairs").
- **Excerpt (invariants.ts:213-229 — the prev/next pair inspection pattern):**
```ts
export function validateMonotonicCounters(
  previous: FlowgridSnapshot,
  next: FlowgridSnapshot,
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (next.core.moduleTokens < previous.core.moduleTokens) {
    issues.push(issue('token_regression', 'error', 'core', next.core.id, `...`, 'core.moduleTokens'));
  }
  if (next.core.forgeCount < previous.core.forgeCount) {
    issues.push(issue('forge_count_regression', 'error', 'core', next.core.id, `...`, 'core.forgeCount'));
  }
  return issues;
}
```
- **Pattern notes:**
  - Return a typed `FlowgridWritePlan` (readonly arrays of `{ kind: 'put'|'delete', store, record }` + `appendSessions: readonly SessionRecord[]` + `appendOperations: readonly SyncOperation[]` + `appendForgeHistory`). Define the plan type inline in this module.
  - For map entities (`cells`, `moduleInstances`, `routes`): iterate `next.<map>.keys()`; new or `JSON.stringify`-differing keys → put; keys in prev but not next → delete. Compare via `JSON.stringify(a) === JSON.stringify(b)` — safe under Phase 1 determinism (RESEARCH §2.2).
  - For singletons (`client`, `core`, `settings`): `JSON.stringify(prev.X) !== JSON.stringify(next.X)` → put.
  - For arrays (`sessions`, `operations`, `forgeHistory`): tail-diff by id — elements in next not in prev (by id) are appends.
  - Header comment cites D-03 (changed-record detection lives in persistence, not simulation).

### A6. `src/persistence/repository.ts` (NEW)
- **Role:** `FlowgridRepository` — `applyResult(SimulationResult)`, `loadSnapshot()`, `open()`, `close()`. The core boundary consumer. Wraps each write in a Dexie transaction (DATA-03).
- **Data flow:** Consumes `SimulationResult` (type-only import from `../domain/index.js`), executes `diff.ts` plan + idempotent-upsert checks inside `db.transaction('rw', ...allTables, ...)`, returns `ApplyResult`. `loadSnapshot()` bulk-reads all 9 stores into `FlowgridSnapshot`.
- **Closest analog (contract consumption):** `src/simulation/engine.ts` (dispatcher consuming the `SimulationCommand` discriminated union) — repository mirrors this "consume the domain contract, branch on status" shape.
- **Excerpt (engine.ts:21-38 — the consume-and-branch pattern):**
```ts
export function runSimulationCommand(
  previousState: FlowgridSnapshot,
  command: SimulationCommand,
  env: SimulationEnv,
): SimulationResult {
  switch (command.type) {
    case 'complete_focus_session':
      return completeFocusSession(previousState, command, env);
    // ...
  }
}
```
- **Closest analog (nextState assembly / what gets diffed):** `src/simulation/commands/complete-focus-session.ts:216-226` — the cascade the repository must detect and persist atomically.
```ts
const cells = new Map(previousState.cells);
cells.set(command.cellId, cellAfterFocus);

const nextState: FlowgridSnapshot = {
  ...previousState,
  cells,
  core: newCore,
  sessions: [...previousState.sessions, session],
  operations: [...previousState.operations, operation],
  client: { ...previousState.client, updatedAt: env.now },
};
```
- **Pattern notes:**
  - `applyResult` early-returns on `result.status !== 'applied'` (D-02: rejected/not_implemented write nothing). Mirror the `rejectWith` early-return in `complete-focus-session.ts:143-146`.
  - Type-only import: `import type { SimulationResult, FlowgridSnapshot, SessionRecord, SyncOperation } from '../domain/index.js';` — the ESLint boundary rule (H28) blocks runtime simulation imports; type-only is allowed.
  - Idempotent upsert (D-04): `table.get(id)` → if exists, `JSON.stringify(existing) === JSON.stringify(incoming)` skip, else throw/return `PersistenceError { kind: 'session_conflict'|'operation_conflict' }`. Cite Phase 1 D-08 determinism in header.
  - Transaction includes ALL 9 tables (RESEARCH §4.5 / key decision 8).
  - `loadSnapshot()` builds `new Map(...)` for cells/moduleInstances/routes and `[...array]` for sessions/operations/forgeHistory — exactly the shapes in `FlowgridSnapshot` (`records.ts:122-132`). Empty-store → empty Map/[].

### A7. `src/persistence/export-json.ts` (NEW)
- **Role:** `JsonArchive` type + `exportJson()` — reads all stores, returns complete portable archive (D-09).
- **Data flow:** Reads via repository/db; produces a plain serializable object. No simulation involvement.
- **Closest analog (the type to mirror):** `src/domain/records.ts:122-132` (`FlowgridSnapshot`) — `JsonArchive` is the array-form serialization of the same entity set.
- **Excerpt (records.ts:122-132):**
```ts
export interface FlowgridSnapshot {
  readonly client: ClientRecord;
  readonly cells: ReadonlyMap<CellId, CellRecord>;
  readonly core: CoreRecord;
  readonly moduleInstances: ReadonlyMap<ModuleInstanceId, ModuleInstance>;
  readonly routes: ReadonlyMap<RouteId, RouteRecord>;
  readonly sessions: readonly SessionRecord[];
  readonly operations: readonly SyncOperation[];
  readonly settings: SettingsRecord;
  readonly forgeHistory: readonly ForgeHistoryRecord[];
}
```
- **Pattern notes:** `JsonArchive` (RESEARCH §5.1) swaps `ReadonlyMap` → readonly arrays (JSON has no Map) and adds `archiveVersion: 1` + `exportedAt`. Keep all `readonly` fields and the same record types (`CellRecord[]`, not a redefinition). `exportedAt: new Date().toISOString()` is allowed in persistence (same exception as seeding). Define `ARCHIVE_VERSION = 1` as a module-local const (style of `PAYLOAD_VERSION` in `operation-events.ts:15`).

### A8. `src/persistence/export-csv.ts` (NEW)
- **Role:** `exportSessionCsv()` + `csvEscape()` — human-readable CSV with cellName join, minutes normalization (D-10).
- **Data flow:** Reads sessions + cells; produces a CSV string. No simulation.
- **Closest analog (integer/normalization style):** `src/content/formulas.ts:27-35` (`focusToCurrent`/`focusToXp` — `Math.floor` integer conversions).
- **Excerpt (formulas.ts:32-35):**
```ts
export function focusToXp(durationSeconds: IntSeconds): IntNonNegative {
  if (durationSeconds <= 0) return 0;
  return Math.floor(durationSeconds / SECONDS_PER_MINUTE) * XP_PER_MINUTE;
}
```
- **Pattern notes:**
  - `durationMinutes = Math.floor(session.durationSeconds / 60)` (RESEARCH §5.2 picks floor for consistency with `focusToXp`).
  - Date extraction: `session.startedAt.slice(0, 10)` for `YYYY-MM-DD` (RESEARCH §5.2).
  - cellName join: build `Map<string, CellRecord>` from cells store; missing cell → `'(unknown)'` (RESEARCH §5.2).
  - `csvEscape(field)`: RFC 4180 — wrap in `"`, double internal quotes. Small inline helper, no dependency.
  - Sort sessions by `startedAt` ascending (RESEARCH §5.2).
  - Header row = the 10 D-10 column names.

### A9. `src/persistence/validation-schemas.ts` (NEW)
- **Role:** Zod 4.x schemas for `JsonArchive` + each record type. Boundary validation only (STACK.md: "Do not put Zod in hot simulation loops").
- **Data flow:** Imported only by `import-validation.ts`. Tree-shakeable if import is lazy-loaded in Phase 3.
- **Closest analog (the shapes to mirror at runtime):** `src/domain/records.ts` (every interface becomes a `z.object()`).
- **Excerpt (records.ts:93-106 — SessionRecord as the canonical example):**
```ts
export interface SessionRecord {
  readonly id: SessionId;
  readonly cellId: CellId;
  readonly startedAt: IsoDateTimeString;
  readonly endedAt: IsoDateTimeString;
  readonly durationSeconds: IntSeconds;
  readonly xpGained: IntNonNegative;
  readonly currentGenerated: IntNonNegative;
  readonly bloomFired: boolean;
  readonly activationGranted: boolean;
  readonly energyGained: IntNonNegative;
  readonly coreChargeGained: IntNonNegative;
  readonly createdAt: IsoDateTimeString;
}
```
- **Pattern notes:**
  - Map each field: ids → `z.string()`, integer economy → `z.number().int().nonnegative()`, ISO time → `z.string().datetime()` (verify against `IsoDateTimeString` usage — note `startedAt` values like `'2026-01-01T10:00:00.000Z'` are valid `z.string().datetime()`), flags → `z.boolean()`.
  - `SyncOperation.payload: z.unknown()` (RESEARCH §5.3 — payload is command-specific, validated by simulation not persistence).
  - Compose into `archiveSchema = z.object({ archiveVersion: z.literal(1), exportedAt: z.string(), ... })`.
  - Add a type-level coupling assertion: `type _ = z.infer<typeof sessionSchema> satisfies SessionRecord;` to catch schema/type drift (RESEARCH Risk §Zod schema drift).
  - This is the ONE Phase 2 module that imports `zod` as a runtime dependency.

### A10. `src/persistence/import-validation.ts` (NEW)
- **Role:** `validateArchive(unknown)` → `ValidationIssue[]`. Composes Zod (shape) + Phase 1 `validateFlowgridSnapshot` (invariants). All-or-nothing (D-12).
- **Data flow:** Pure function. Called by `import.ts` BEFORE any local write. Returns issues; local data stays untouched on any failure.
- **Closest analog:** `src/domain/invariants.ts:275-284` (`validateFlowgridSnapshot` — the composition root to REUSE).
- **Excerpt (invariants.ts:275-284 — the composition to extend):**
```ts
export function validateFlowgridSnapshot(snapshot: FlowgridSnapshot): readonly ValidationIssue[] {
  return [
    ...validateNoNegativeResources(snapshot),
    ...validateReferences(snapshot),
    ...validateNoDuplicateInstalls(snapshot),
    ...validateRouteAllocations(snapshot),
    ...validateCoreAllocation(snapshot),
    ...validateOperationShape(snapshot.operations),
  ];
}
```
- **Pattern notes:**
  - Pipeline (RESEARCH §5.3): (1) `archiveSchema.safeParse(input)` → on fail, map `error.issues` to `ValidationIssue { code: 'invalid_operation_shape', path, message }` (RESEARCH §5.3); (2) assemble parsed arrays into a `FlowgridSnapshot` (`new Map()` for cells/moduleInstances/routes); (3) call `validateFlowgridSnapshot(snapshot)` from `../domain/index.js`; (4) return concatenation. Zero issues → caller proceeds to write.
  - Reuse the EXACT `ValidationIssue` type from `../domain/index.js` — do not invent a parallel error type (CONTEXT D-12).
  - This is the elegant single-source-of-truth: archives pass the same validators simulation enforces post-command (RESEARCH §5.3).

### A11. `src/persistence/import.ts` (NEW)
- **Role:** `importArchive(archive, mode)` — replace (default) / merge (opt-in). Calls `import-validation.ts` first; only writes if zero issues (D-11, D-12).
- **Data flow:** Calls `validateArchive`; on success executes replace (clear all + bulkPut) or merge (per-record upsert with D-04 conflict check) inside a transaction.
- **Closest analog (transaction/atomicity intent):** the cascade-write model in `complete-focus-session.ts:216-226` (multiple stores changed atomically) — but repository wraps in a Dexie transaction rather than building a nextState object.
- **Excerpt (RESEARCH §4.5 — the transaction wrapper to use):**
```ts
await db.transaction('rw', db.client, db.cells, db.core, db.moduleInstances, db.routes,
  db.sessions, db.operations, db.settings, db.forgeHistory, async () => {
    // 1. Diff and write changed entity records
    // 2. Append new sessions (with idempotent-upsert check)
    // 3. Append new operations (with idempotent-upsert check)
  });
```
- **Pattern notes:**
  - Return type `ImportResult = { ok: true; stats: ImportStats } | { ok: false; issues: readonly ValidationIssue[] }` — discriminated union like `SimulationStatus` (`result.ts:33`).
  - Replace mode: `await Promise.all(allTables.map(t => t.clear()))` then `bulkPut` each store from the archive. All in one transaction (RESEARCH §5.3 step 6).
  - Merge mode: per-record upsert; reuse the D-04 conflict check from `repository.ts` (extract a shared `idempotentUpsert(table, record)` helper, or inline consistently).
  - Import `validateArchive` from `./import-validation.js`; import `PersistenceError` from `./errors.js` for conflict mapping.

### A12. `src/persistence/index.ts` (NEW)
- **Role:** Public barrel re-exporting the persistence surface.
- **Data flow:** Consumed by future `src/app/` (Phase 3+). Mirrors domain/content/simulation barrels.
- **Closest analog:** `src/domain/index.ts` (canonical barrel).
- **Excerpt (domain/index.ts:1-14):**
```ts
// src/domain public barrel.
//
// Re-exports the full domain surface. UI, render, persistence, app, and tests should
// import from here; they SHOULD NOT reach into individual files (lets us reorganize
// the internals without breaking consumers).

export * from './ids.js';
export * from './primitives.js';
// ...
export * from './result.js';
```
- **Pattern notes:** `export * from './errors.js';` etc. Use `.js` extensions. Export the `FlowgridRepository` class and `JsonArchive` type. Do NOT re-export Dexie internals — keep the Dexie dependency behind `database.ts` (RESEARCH §4.2: "Import Dexie through the database module, not directly in repositories").

### A13. `src/persistence/README.md` (MODIFY — replace placeholder)
- **Role:** Document the now-realized layer (was a Phase 1 placeholder).
- **Data flow:** N/A (docs).
- **Current content (the 5 lines to replace):**
```md
# `src/persistence` — Durable Storage (Phase 1 boundary)

Phase 1 defers persistence. This folder is a placeholder for the future Dexie/IndexedDB
repository layer described in `.planning/REQUIREMENTS.md` (DATA-01..DATA-07) and Phase 2
of the roadmap.

Phase 1 simulation must not import from this layer. Persistence will consume
`FlowgridSnapshot`, `SessionRecord`, and `SyncOperation` records produced by the
simulation; it will never run simulation rules.
```
- **Pattern notes:** Keep the layer-boundary sentence (it is still true and enforced by ESLint). Update to reflect Phase 2 deliverables: 9-store topology, repository API, export/import, the four version axes (RESEARCH §5.1). Reference `database.ts`, `repository.ts`. Do NOT document internal helpers.

---

## B. Test files (`tests/persistence/` + `tests/helpers/`)

All Phase 2 tests follow the existing test conventions verified below.

**Test conventions (from `tests/simulation/foundation-loop.test.ts`):**
- Import `test, expect` from `'vitest'` (`foundation-loop.test.ts:9`). `globals: false` (`vitest.config.ts:7`) — explicit imports required.
- Type-only imports from `../../src/domain/index.js`; runtime imports from `../../src/simulation/index.js` / `../../src/content/index.js`.
- Deterministic fixtures via `createTestIds(prefix)` + `buildStarterSnapshot(prefix)` from `tests/helpers/fixtures.ts`.
- `NOW = '2026-01-01T10:00:00.000Z'` / `LOCAL_DATE = '2026-01-01'` style constants.
- `environment: 'node'` (`vitest.config.ts:5`).

**Boundary test analog (for a persistence boundary scanner):** `tests/simulation/boundaries.test.ts` — the exact pattern (recursive `listTsFiles`, `FORBIDDEN_RULES` regex table, aggregate violations) to mirror for `src/persistence/**` asserting no simulation runtime imports.

### B1. `tests/helpers/setup-indexeddb.ts` (NEW)
- **Role:** Vitest setup file: `import 'fake-indexeddb/auto';` (RESEARCH §9.1).
- **Data flow:** Imported by `vitest.config.ts` `setupFiles`.
- **Closest analog:** none (new infrastructure). Pattern: single side-effecting import.
- **Pattern notes:** One line: `import 'fake-indexeddb/auto';`. Optionally export a `resetIndexedDB()` helper using `new IDBFactory()` (RESEARCH §9.1) for `beforeEach` isolation.

### B2. `tests/persistence/schema.test.ts` (NEW)
- **Role:** VER-03 P0: schema creation, store existence, first-run seeding.
- **Closest analog:** `tests/simulation/foundation-loop.test.ts` (end-to-end contract test).
- **Excerpt (foundation-loop.test.ts:41-62):**
```ts
test('complete_focus_session: starter state through focus, ...', () => {
  const { ids, state } = buildStarterState('foundation-loop');
  const focusDurationSeconds = 1500;
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'foundation-loop' });
  const command: CompleteFocusSessionCommand = { /* ... */ };
  const result = runSimulationCommand(state, command, env);
  expect(result.status, 'valid foundation command must apply').toBe('applied');
  expect(result.previousState, 'result carries previous state').toBe(state);
});
```
- **Pattern notes:** Open DB → assert 9 stores exist → call `loadSnapshot()` on fresh DB → assert client/settings/core seeded (match `starter-state.ts` literals) → assert cells/moduleInstances/routes/sessions/operations/forgeHistory empty. Use `beforeEach` with `new IDBFactory()` reset (RESEARCH §9.1) + unique DB name per test.

### B3. `tests/persistence/repository.test.ts` (NEW)
- **Role:** VER-03 P0: `applyResult` writes on applied, no-op on rejected/not_implemented; reload durability; diff correctness (P1).
- **Closest analog:** `tests/simulation/foundation-loop.test.ts` (drive a real `SimulationResult` then assert state) + `tests/helpers/replay.ts` (`expectStateReplayEqual`).
- **Excerpt (replay.ts:12-14):**
```ts
export function expectStateReplayEqual<T>(a: T, b: T): void {
  expect(a).toEqual(b);
}
```
- **Pattern notes:** Build starter state via `buildStarterSnapshot('repo')`; run `completeFocusSession` to get an applied `SimulationResult`; `await repo.applyResult(result)`; `await repo.loadSnapshot()` on a fresh repo instance; `expectStateReplayEqual(loaded, result.nextState)`. For rejected/not_implemented: use `notImplementedResult`/invalid command, assert store counts unchanged. Import `runSimulationCommand` from `../../src/simulation/index.js` (runtime OK in tests).

### B4. `tests/persistence/diff.test.ts` (NEW)
- **Role:** VER-03 P1: changed-record detection edge cases (pure, no IndexedDB).
- **Closest analog:** `tests/simulation/validation.test.ts` (pure validator assertions over snapshots).
- **Pattern notes:** Import `diffFlowgridSnapshots` from `../../src/persistence/index.js`; feed prev/next snapshots built via `buildStarterSnapshot` + a hand-applied cell change; assert the plan contains exactly one cell put and no other writes. No DB needed — this is the pure-function test RESEARCH §4 key decision 4 calls out.

### B5. `tests/persistence/append-only.test.ts` (NEW)
- **Role:** VER-03 P0: idempotent upsert (D-04) + append-only session/operation enforcement.
- **Closest analog:** `tests/properties/economy-safety.property.test.ts` (invariant enforcement) + `foundation-loop.test.ts` (drive real results).
- **Pattern notes:** (1) `applyResult(r)` twice → second is no-op (assert store counts unchanged, no error). (2) Manually construct a `SessionRecord` with an existing id but a mutated `xpGained`; attempt direct session put via repository → expect `PersistenceError { kind: 'session_conflict' }`. Same for operations (`operation_conflict`). (3) Assert no `updateSession`/`deleteOperation` API exists on the repository type (compile-time + behavioral).

### B6. `tests/persistence/export-json.test.ts` (NEW)
- **Role:** VER-03 P0: JSON archive shape completeness.
- **Closest analog:** `foundation-loop.test.ts` (build state, assert shape).
- **Pattern notes:** Seed known state → `exportJson()` → assert `archiveVersion === 1`, `exportedAt` present, all 9 entity collections non-empty/empty as expected, and each record deep-equals the input. Round-trip: `importArchive(exportJson(), 'replace')` then `loadSnapshot()` reproduces state (RESEARCH §9.4 property).

### B7. `tests/persistence/export-csv.test.ts` (NEW)
- **Role:** VER-03 P0: CSV columns, cellName join, escaping, minute normalization.
- **Closest analog:** `tests/simulation/validation.test.ts` (field-level assertions).
- **Pattern notes:** Seed a cell named `"Starter, Cell"` (comma) + a session of 1500s → assert header row matches the 10 D-10 columns, `durationMinutes === 25`, `cellName === "Starter, Cell"` (quoted), dates are `YYYY-MM-DD`. Test `csvEscape` directly for quote/newline/comma cases.

### B8. `tests/persistence/import-validation.test.ts` (NEW)
- **Role:** VER-03 P0: all D-12 rejection modes.
- **Closest analog:** `tests/simulation/validation.test.ts` (assert each `ValidationIssueCode` surfaces).
- **Pattern notes:** Cases: valid archive → `issues.length === 0`; negative resource (mutate `cell.xp = -1`) → `negative_resource`; broken reference (`session.cellId` not in cells) → `invalid_reference`; route sum > 100 → `invalid_route_allocation`; core allocation ≠ 100 → `invalid_core_allocation_total`; malformed JSON shape → Zod-mapped `invalid_operation_shape` with path. Assert each returns issues and DOES NOT write (read back pre-import state).

### B9. `tests/persistence/import-replace.test.ts` (NEW)
- **Role:** VER-03 P0: replace mode wipes + writes atomically.
- **Pattern notes:** Seed state A; build archive from state B; `importArchive(archiveB, 'replace')`; `loadSnapshot()` deep-equals B; no records from A survive. Atomism: force a mid-write failure (stub a table method to throw) → assert NO partial writes (all stores either fully A or fully B).

### B10. `tests/persistence/import-merge.test.ts` (NEW)
- **Role:** VER-03 P1: merge upserts by ID without wiping.
- **Pattern notes:** Seed state A; archive contains a subset (one new cell, one updated cell); `importArchive(archive, 'merge')`; assert A's untouched records survive and archived records upserted. Conflict case: archive cell with same id but different `xp` than local → `PersistenceError` (D-04 applies to merge too).

### B11. `tests/persistence/migration-harness.test.ts` (NEW)
- **Role:** VER-03 P1 / D-07: synthetic fixture-based migration harness, reusable by real v2.
- **Closest analog:** `tests/helpers/fixtures.ts` (deterministic factory pattern) — the harness is a fixture-runner.
- **Excerpt (RESEARCH §9.3 — the harness contract to implement):**
```ts
interface MigrationFixture<OldShape, NewShape> {
  readonly description: string;
  readonly input: OldShape;
  readonly upgrade: (record: OldShape) => NewShape;
  readonly expected: NewShape;
}
function runMigrationFixture<T, U>(fixture: MigrationFixture<T, U>): void {
  it(fixture.description, () => {
    const result = fixture.upgrade(fixture.input);
    expect(result).toEqual(fixture.expected);
  });
}
```
- **Pattern notes:** Define synthetic fixture (e.g., a v0 `CellRecord` using `milestoneProgress` seconds → upgrade renames to `dailyMilestoneProgressSeconds`). Also test schema-level upgrade via fake-indexeddb: create DB at synthetic old version, open at v1, assert upgrade fn ran. Header comment must state "designed for reuse by real v1→v2 migration" (CONTEXT D-07).

### B12. `tests/persistence/errors.test.ts` (NEW)
- **Role:** VER-03 P1: `PersistenceError` mapping for known `DOMException.name` values.
- **Closest analog:** `tests/simulation/validation.test.ts` (assert mapping outputs).
- **Pattern notes:** Construct `new DOMException('msg', 'QuotaExceededError')` → `mapDomException` → assert `{ kind: 'quota_exceeded', recoverable: true }`. Cover the table in RESEARCH §6.2. `indexedDB === undefined` case → `{ kind: 'indexeddb_unavailable', recoverable: false }` (mock the global).

---

## C. Config modifications

### C1. `package.json` (MODIFY)
- **Role:** Add runtime dep `dexie`, dev dep `fake-indexeddb`, runtime dep `zod`.
- **Current relevant section (package.json:12-22):**
```json
"devDependencies": {
  "@eslint/js": "^10.0.1",
  "@types/node": "^22.10.0",
  "eslint": "^10.5.0",
  "fast-check": "^4.8.0",
  "globals": "^17.7.0",
  "typescript": "^6.0.3",
  "typescript-eslint": "^8.62.0",
  "vite": "^8.1.0",
  "vitest": "^4.1.9"
}
```
- **Pattern notes:** Add `"dependencies": { "dexie": "^4.4.4", "zod": "^4.4.3" }` (both runtime; zod tree-shakeable to import path — RESEARCH §Dependencies). Add `"fake-indexeddb": "^6.2.5"` to `devDependencies`. No uuid package (RESEARCH §7). Versions verified 2026-06-23 (RESEARCH §Executive Summary).

### C2. `vitest.config.ts` (MODIFY)
- **Role:** Add `setupFiles: ['tests/helpers/setup-indexeddb.ts']`.
- **Current content (vitest.config.ts:1-9):**
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
```
- **Pattern notes:** Add `setupFiles: ['tests/helpers/setup-indexeddb.ts']` to the `test` block. Keep `environment: 'node'` (fake-indexeddb is pure JS, no browser env needed — RESEARCH §9.1). Global setup chosen over per-test injection for simplicity (RESEARCH §9.1).

### C3. `eslint.config.js` (MODIFY)
- **Role:** Add the reverse boundary: `src/persistence/**` must not import `src/simulation/**` at runtime (type-only allowed). RESEARCH §4.2.
- **Closest analog (the block to mirror):** the existing `src/simulation/**` block at `eslint.config.js:31-67`.
- **Excerpt (eslint.config.js:31-67 — the simulation boundary to mirror for persistence):**
```js
{
  files: ['src/simulation/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { name: 'dexie', message: 'Simulation must not import Dexie.' },
        // ...
      ],
      patterns: [
        { group: ['@/app/*', /* ... */ '@/persistence/*'],
          message: 'Simulation must not import app/persistence/render/ui layers.' },
        // ../ and ../../ variants
      ],
    }],
  },
},
```
- **Pattern notes:** Add a new config object with `files: ['src/persistence/**/*.ts']`. `paths`: block direct `dexie` imports except via the database module (RESEARCH §4.2 recommends "Import Dexie through the database module"). `patterns`: block `@/simulation/*`, `../simulation/*`, `../../simulation/*` with message "Persistence must not import simulation. Consume SimulationResult types only." Type-only imports remain allowed (`verbatimModuleSyntax: false`, `tsconfig.json:20`). Also consider adding a companion `tests/persistence/boundaries.test.ts` mirroring `tests/simulation/boundaries.test.ts:1-92` (recursive scanner) as a second line of defense.

---

## D. Reused Phase 1 contracts (NOT modified — consumed)

These are the analogs Phase 2 reads but does not change. Listed for planner reference:

| Phase 1 file | Phase 2 consumer | What it provides |
|---|---|---|
| `src/domain/records.ts` | `database.ts`, `export-json.ts`, `validation-schemas.ts`, `diff.ts`, `repository.ts` | All record interfaces + `FlowgridSnapshot` |
| `src/domain/operation-records.ts` | `database.ts`, `repository.ts` | `SyncOperation`, `OperationStatus` |
| `src/domain/result.ts` | `repository.ts` | `SimulationResult`, `SimulationStatus` |
| `src/domain/validation.ts` | `import-validation.ts`, `errors.ts` | `ValidationIssue`, `ValidationIssueCode` |
| `src/domain/invariants.ts` | `import-validation.ts` | `validateFlowgridSnapshot` (reused, not reimplemented) |
| `src/domain/ids.ts` | `database.ts` (table key types) | Plain string ID aliases + `EntityType` |
| `src/domain/index.ts` | all persistence modules | Barrel import path |
| `src/content/formulas.ts` | `seeding.ts` | Default settings/allocation constants |
| `src/content/content-version.ts` | `seeding.ts` | `STARTER_CONTENT_VERSION` |
| `src/content/starter-state.ts` | `seeding.ts` (literal shapes only) | Singleton record shapes to copy |
| `tests/helpers/fixtures.ts` | all persistence tests | `buildStarterSnapshot`, `createTestIds`, `createTestSimulationEnv` |
| `tests/helpers/replay.ts` | `repository.test.ts` | `expectStateReplayEqual` |

---

## Key cross-cutting pattern reminders

1. **Layer boundary is the #1 invariant.** Persistence consumes `SimulationResult` (type-only) and produces `FlowgridSnapshot`. It never imports simulation runtime. Enforce via ESLint (C3) + optionally a boundary test mirroring `tests/simulation/boundaries.test.ts`.
2. **Determinism makes JSON-compare safe.** Phase 1 D-08 guarantees identical inputs → byte-identical records, so `JSON.stringify(a) === JSON.stringify(b)` is correct for both diff (A5) and idempotent-upsert conflict checks (D-04). Cite Phase 1 D-08 in headers.
3. **Four version axes, never unified** (RESEARCH §5.1): `archiveVersion` (JsonArchive), Dexie schema version (database.ts), `ContentVersion` (ClientRecord), `payloadVersion` (SyncOperation). Document all four in `database.ts` header.
4. **Zod is import-boundary-only.** Never in repository write path, reload read path, or export. Isolated to `validation-schemas.ts` + `import-validation.ts` (STACK.md).
5. **No ambient time in simulation; persistence MAY use `new Date()`** only for seeding (`seeding.ts`) and export timestamps (`export-json.ts`). All other timestamps come from `SimulationResult` records. Document this exception.
6. **Append-only stores** (`sessions`, `operations`, `forgeHistory`) have no update/delete API on the repository. Only replace-mode restore clears them (RESEARCH §2.3, §8.3).
