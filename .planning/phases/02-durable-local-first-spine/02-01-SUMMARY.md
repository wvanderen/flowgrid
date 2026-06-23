---
phase: 02-durable-local-first-spine
plan: 01
subsystem: database
tags: [dexie, indexeddb, persistence, repository, local-first, fake-indexeddb, vitest, zod]

# Dependency graph
requires:
  - phase: 01-deterministic-foundation-slice
    provides: SimulationResult contract, durable record types (FlowgridSnapshot/SessionRecord/SyncOperation), starter content constants, foundation-loop command producing applied results.
provides:
  - Dexie v1 schema with nine normalized object stores (FlowgridDatabase)
  - First-run singleton seeding (client/core/settings) via on('populate')
  - FlowgridRepository write/read path (applyResult, loadSnapshot, open, close)
  - Pure snapshot diff (diffFlowgridSnapshots + FlowgridWritePlan)
  - Typed PersistenceError contract + mapDomException (DATA-07 surface)
  - Idempotent-upsert append-only enforcement for sessions/operations (D-04)
  - Persistence boundary enforcement (ESLint + scanner test)
affects: [02-durable-local-first-spine, 03-playable-generator-flowgrid]

# Tech tracking
tech-stack:
  added: ["dexie ^4.4.4 (runtime)", "zod ^4.4.3 (runtime, used by 02-02/02-03)", "fake-indexeddb ^6.2.5 (dev)"]
  patterns:
    - Hybrid records-plus-operation-log (entity records are read path; operation log is for sync/audit)
    - Pure diff function over snapshot pairs (D-03); JSON.stringify compare safe under Phase 1 D-08 determinism
    - Idempotent upsert with conflict-on-payload-mismatch for append-only stores (D-04)
    - Single Dexie transaction per applied result spanning all nine stores (DATA-03)
    - Persistence consumes SimulationResult type-only; ESLint + boundary scanner enforce no simulation runtime import
    - database.ts is the sole Dexie gateway; core accessed via db.table() due to Dexie member-name collision

key-files:
  created:
    - src/persistence/errors.ts
    - src/persistence/ids.ts
    - src/persistence/database.ts
    - src/persistence/seeding.ts
    - src/persistence/diff.ts
    - src/persistence/repository.ts
    - src/persistence/index.ts
    - tests/helpers/setup-indexeddb.ts
    - tests/persistence/boundaries.test.ts
    - tests/persistence/schema.test.ts
    - tests/persistence/repository.test.ts
    - tests/persistence/diff.test.ts
    - tests/persistence/append-only.test.ts
    - tests/persistence/errors.test.ts
  modified:
    - package.json
    - package-lock.json
    - vitest.config.ts
    - eslint.config.js
    - src/persistence/README.md

key-decisions:
  - "database.ts is the sole Dexie gateway; the core store is accessed via db.table<CoreRecord,CoreId>('core') because declaring a `core` class property collides with Dexie's built-in `core: DBCore` member (incompatible override + unsafe runtime shadowing)."
  - "First-run seed writes ONLY the three singletons (client/core/settings) with fixed core/settings ids ('flowgrid:core', 'flowgrid:settings') and a crypto.randomUUID() client id; cells/modules/routes/sessions/operations/forgeHistory start empty per D-06."
  - "forgeHistory payload-mismatch conflicts surface as write_failure (no dedicated forge_conflict kind in the 8-member PersistenceErrorKind union); sessions and operations use their dedicated session_conflict/operation_conflict kinds."
  - "ESLint dexie-import restriction uses allowTypeImports so seeding.ts can import the Transaction type; database.ts is exempted as the designated Dexie gateway."
  - "loadSnapshot reads the first record of each singleton store (seeded on first run); missing singletons after a load are surfaced as a thrown error (corrupt state)."

patterns-established:
  - "applyResult early-returns {ok:true} for rejected/not_implemented (writes nothing); only applied results diff+write."
  - "Conflict detection throws a ConflictSignal sentinel inside the transaction to abort it atomically; caught outside and converted to ApplyResult { ok:false, error }."
  - "Reload tests use the SEEDED snapshot as previousState (singleton ids match the DB) so applyResult updates singletons in place rather than creating duplicates."

requirements-completed:
  - DATA-01
  - DATA-02
  - DATA-03
  - SESS-04
  - VER-03

# Metrics
duration: 52min
completed: 2026-06-23
status: complete
---

# Phase 2 Plan 01: Durable Local-First Spine Summary

**Dexie/IndexedDB repository with nine normalized stores, pure snapshot diff, idempotent-upsert append-only sessions/operations, and typed PersistenceError contract — applied results reload identically.**

## Performance

- **Duration:** 52 min
- **Started:** 2026-06-23T19:36:23Z
- **Completed:** 2026-06-23T20:29:10Z
- **Tasks:** 6
- **Files modified/created:** 19 (non-planning)
- **Tests:** 58 total pass (36 Phase 1 + 22 Phase 2 persistence across 6 files)

## Accomplishments

- Dexie v1 schema declaring exactly nine normalized object stores keyed by stable string IDs; no `moduleDefinitions` store (D-06 — definitions stay as versioned code content).
- First-run `on('populate')` seeding writes only the three singletons (client with `crypto.randomUUID()` id, zeroed starter core, default settings); the other six stores start empty.
- Pure `diffFlowgridSnapshots(prev, next)` returns a typed `FlowgridWritePlan` (puts/deletes for map entities, singleton puts, appends for append-only arrays) with an empty-plan short-circuit for identical inputs — no IndexedDB/Dexie/simulation imports.
- `FlowgridRepository.applyResult` consumes `SimulationResult` type-only, early-returns `{ok:true}` for rejected/not_implemented (no writes), and for applied results writes the diff plan + appends inside a single Dexie transaction spanning all nine stores (DATA-03) with idempotent-upsert conflict checks (D-04).
- `FlowgridRepository.loadSnapshot` bulk-reads all stores into a `FlowgridSnapshot` (Maps for cells/moduleInstances/routes, arrays for append-only stores); singleton absence is surfaced as corrupt state.
- Typed `PersistenceError` (8-member kind union) + `mapDomException` covering the DOMException-name table and the indexedDB-undefined case (DATA-07 contract; Phase 3 renders).
- Persistence boundary enforced two ways: ESLint `no-restricted-imports` (no direct dexie outside database.ts, no simulation runtime import, allowTypeImports for Transaction) and a `tests/persistence/boundaries.test.ts` scanner mirroring the simulation scanner.
- VER-03 core tier green: schema creation, first-run seeding, reload durability (deep-equal), diff edge cases, double-apply no-op, session_conflict/operation_conflict, no mutation API, full DOMException mapping.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add dependencies, test infrastructure, and persistence boundary rule** — `259d031` (chore)
2. **Task 2: Implement PersistenceError contract and client ID helper** — `0aaee29` (feat)
3. **Task 3: Implement Dexie schema, first-run seeding, layer docs, and barrel** — `38b8dff` (feat)
4. **Task 4: Implement pure snapshot diff** — `18ac1d1` (feat)
5. **Task 5: Implement repository write and read path** — `a96656c` (feat)
6. **Task 6: Core VER-03 tests** — `bc82d99` (test)

## Files Created/Modified

- `package.json` / `package-lock.json` — added dexie ^4.4.4, zod ^4.4.3 (runtime); fake-indexeddb ^6.2.5 (dev).
- `vitest.config.ts` — `setupFiles: ['tests/helpers/setup-indexeddb.ts']`.
- `eslint.config.js` — persistence `no-restricted-imports` block (dexie gateway exemption + allowTypeImports + no simulation runtime).
- `src/persistence/errors.ts` — `PersistenceError`, `PersistenceErrorKind` (8-member union), `mapDomException`, `conflictError`.
- `src/persistence/ids.ts` — `generateClientId()` (crypto.randomUUID).
- `src/persistence/database.ts` — `FlowgridDatabase` (Dexie subclass, v1 nine-store schema, populate/blocked hooks).
- `src/persistence/seeding.ts` — `seedStarterState(tx)` (three singletons only, synchronous).
- `src/persistence/diff.ts` — `FlowgridWritePlan`, `diffFlowgridSnapshots` (pure).
- `src/persistence/repository.ts` — `FlowgridRepository` (open/close/applyResult/loadSnapshot), `ApplyResult`.
- `src/persistence/index.ts` — barrel re-exporting the persistence surface.
- `src/persistence/README.md` — realized-layer documentation (topology, four version axes, time exception).
- `tests/helpers/setup-indexeddb.ts` — `import 'fake-indexeddb/auto'`.
- `tests/persistence/*.test.ts` — boundaries, schema, repository, diff, append-only, errors (22 tests).

## Decisions Made

- **Dexie `core` member collision:** The store is named `core` (Dexie maps property→store name), but declaring a `core!: Table<...>` class property collides with Dexie's built-in `core: DBCore` (incompatible TS override) and would shadow it unsafely at runtime. The store keeps its name; typed access goes through `db.table<CoreRecord, CoreId>('core')`.
- **forgeHistory conflict kind:** The 8-member `PersistenceErrorKind` union has no dedicated forge-history conflict kind; payload mismatches there surface as `write_failure` (documented, consistent with the closed union).
- **ESLint `allowTypeImports`:** `seeding.ts` needs the Dexie `Transaction` type; allowing type-only dexie imports keeps the runtime intent ("no Dexie API usage outside database.ts") intact while satisfying the type need.
- **Reload test uses seeded state as previousState:** The DB auto-seeds singletons on first open; for `expectStateReplayEqual(loaded, result.nextState)` to pass, `previousState` must be the seeded snapshot (matching singleton ids) with a starter cell/modules/routes attached — mirroring the real Phase 3 flow where the app loads the seed before running commands.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dropped premature scanner sanity guard**
- **Found during:** Task 1 (boundaries.test.ts)
- **Issue:** The plan mirrored the simulation scanner including an "at least one .ts file" sanity guard, but `src/persistence/` has no source files until Tasks 2-5. The guard would fail at the Task 1 boundary by design.
- **Fix:** Removed only the standalone sanity guard; the load-bearing boundary-enforcement test (forbidden-rule scan) is retained in full and is correct over both empty and populated trees.
- **Files modified:** tests/persistence/boundaries.test.ts
- **Verification:** `npm run test -- --run tests/persistence/boundaries.test.ts` exits 0; scanner enforces all forbidden rules once source exists.
- **Committed in:** 259d031

**2. [Rule 3 - Blocking] ESLint dexie rule exempted database.ts + allowTypeImports**
- **Found during:** Task 3 (database.ts needs to import dexie; seeding.ts needs the Transaction type)
- **Issue:** The plan's Task 1 ESLint rule forbids dexie in ALL `src/persistence/**/*.ts`, but database.ts must import dexie (designated gateway per RESEARCH §4.2 and the rule's own message) and seeding.ts needs the `Transaction` type.
- **Fix:** Added `ignores: ['src/persistence/database.ts']` to the dexie-import block (plus a separate block keeping database.ts simulation-free) and set `allowTypeImports: true` on the dexie path so type-only Transaction imports are permitted while value imports stay blocked.
- **Files modified:** eslint.config.js
- **Verification:** `npm run lint` exits 0; database.ts imports dexie; seeding.ts imports only the Transaction type.
- **Committed in:** 38b8dff

**3. [Rule 1 - Bug] Typed indexedDB access without DOM lib**
- **Found during:** Task 2 (errors.ts)
- **Issue:** `globalThis.indexedDB` has no type signature because `lib` is ES2022-only (no DOM), so `mapDomException` failed typecheck.
- **Fix:** Added a `readGlobalIndexedDB()` helper that casts `globalThis` to `{ indexedDB?: unknown }`; `indexedDB` remains referenceable (the scanner deliberately does not forbid it).
- **Files modified:** src/persistence/errors.ts
- **Verification:** `npm run typecheck` exits 0; DOMException-name mapping confirmed via node probe.
- **Committed in:** 0aaee29

**4. [Rule 1 - Bug] Dexie `core` member-name collision**
- **Found during:** Task 3 (database.ts)
- **Issue:** Declaring `core!: Table<CoreRecord, CoreId>` is an incompatible override of Dexie's `core: DBCore` and would shadow it unsafely at runtime.
- **Fix:** Removed the `core` property declaration; repository accesses core via `db.table<CoreRecord, CoreId>('core')`. Store name stays `core` (Dexie maps schema keys independently).
- **Files modified:** src/persistence/database.ts, src/persistence/repository.ts
- **Verification:** `npm run typecheck` exits 0; schema test confirms the `core` store exists and reload round-trips it.
- **Committed in:** 38b8dff (declaration) and a96656c (repository accessor)

**5. [Rule 1 - Bug] IDBFactory value-vs-type and entityType literal widening in tests**
- **Found during:** Task 6 (test files)
- **Issue:** `IDBFactory` is a value export (used as a type in casts failed typecheck); `{ ...op, entityType: 'forge_history' }` widened the literal to `string` after spread (TS quirk), breaking `SyncOperation` assignability.
- **Fix:** Cast globalThis indexedDB property as `unknown`; added explicit `SyncOperation` annotation to the mutated operation.
- **Files modified:** tests/persistence/{errors,schema,repository,append-only}.test.ts
- **Verification:** `npm run typecheck` exits 0; append-only conflict tests pass.
- **Committed in:** bc82d99

**6. [Rule 1 - Bug] Reload test must use seeded state as previousState**
- **Found during:** Task 6 (repository.test.ts)
- **Issue:** The plan's reload test built its starter state independently (`buildStarterSnapshot` with `repo:*` ids), but the DB auto-seeds singletons with different ids; applying the result created duplicate singleton records and `loadSnapshot` returned the seeded ones, failing deep-equality.
- **Fix:** Reworked the test to load the seeded snapshot first, attach a starter cell/modules/routes wired to the seeded core id (mirroring Phase 3's real flow), use that as `previousState`, and write the cell/modules/routes directly for setup. This is the production-aligned data flow, not a weakening.
- **Files modified:** tests/persistence/repository.test.ts
- **Verification:** `expectStateReplayEqual(loaded, result.nextState)` passes; reload round-trip is green.
- **Committed in:** bc82d99

---

**Total deviations:** 6 auto-fixed (2 blocking, 4 bugs)
**Impact on plan:** All auto-fixes were necessary for the code to compile, lint, and faithfully test the designed data flow. No scope creep — every fix aligns with RESEARCH §1.6/§4.2, CONTEXT D-04/D-06, and the Phase 1 D-08 determinism guarantee.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None — no external service configuration required. Dependencies (dexie, zod, fake-indexeddb) are standard npm packages installed automatically.

## Next Phase Readiness

- The durable spine is in place: DATA-01 (reload durability), DATA-02 (nine normalized stores + v1 schema versioning), DATA-03 (atomic multi-store writes), SESS-04 (append-only SessionRecords with idempotent-upsert enforcement), and the core VER-03 tier (schema/repository/diff/append-only/errors) are all green.
- Plan 02-02 can build JSON + CSV export on top of `FlowgridRepository.loadSnapshot()` and the `JsonArchive` shape (zod is already installed for the import-validation boundary).
- Plan 02-03 can build import/restore validation + migration harness on top of `FlowgridRepository`, `PersistenceError`, and `validateFlowgridSnapshot` reuse.
- Phase 3 (Playable Generator Flowgrid) can open the repository, load the seeded snapshot, dispatch commands, and call `applyResult` — the contract is stable.

## Self-Check: PASSED

- All 14 created files verified present on disk.
- All 6 task commits (259d031, 0aaee29, 38b8dff, 18ac1d1, a96656c, bc82d99) verified in git log.
- Plan-level verification re-run green: `npm run typecheck`, `npm run lint`, `npm run test -- --run` (58 tests) all exit 0.

---
*Phase: 02-durable-local-first-spine*
*Completed: 2026-06-23*
