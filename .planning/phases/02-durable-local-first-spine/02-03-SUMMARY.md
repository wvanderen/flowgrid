---
phase: 02-durable-local-first-spine
plan: 03
subsystem: database
tags: [zod, import-validation, restore, replace, merge, migration-harness, dexie, vitest, local-first]

# Dependency graph
requires:
  - phase: 02-durable-local-first-spine (plan 01)
    provides: FlowgridDatabase (nine-store Dexie v1 schema), FlowgridRepository, PersistenceError/mapDomException (DATA-07 surface), idempotent-upsert conflict pattern (D-04), validateFlowgridSnapshot reuse path.
  - phase: 02-durable-local-first-spine (plan 02)
    provides: JsonArchive shape with archiveVersion=1, ARCHIVE_VERSION const, exportJson read path.
provides:
  - Zod boundary schemas (archiveSchema + per-record schemas) mirroring every durable record shape
  - validateArchive(unknown) -> readonly ValidationIssue[] — all-or-nothing pre-flight composing Zod shape parsing with Phase 1 validateFlowgridSnapshot
  - importArchive(db, archive, 'replace'|'merge') -> ImportResult with validate-before-write gate
  - ImportMode / ImportResult / ImportStats typed contracts
  - MigrationFixture<Old,New> interface + runMigrationFixture generic runner (reusable by real v1->v2)
  - VER-03 import/restore/migration test tier (17 new tests across 4 files)
affects: [03-playable-generator-flowgrid (UI import/restore buttons, error rendering), future v1->v2 migration (reuses migration harness)]

# Tech tracking
tech-stack:
  added: []  # zod ^4.4.3 was added in 02-01; this plan consumes it at the import boundary
  patterns:
    - Two-layer archive validation: Zod safeParse (shape/structure) -> Phase 1 validateFlowgridSnapshot (references/resources/allocations/operations). Single source of truth for economy safety.
    - Validate-before-write gate is non-negotiable: validateArchive runs BEFORE any db.transaction call; any ValidationIssue returns { ok: false, issues } with zero writes
    - Replace mode: clear all nine stores then bulkPut in one Dexie transaction (atomic wipe+write)
    - Merge mode: per-record idempotent upsert with D-04 payload-mismatch check (reuses repository's ConflictSignal pattern); no wipe
    - Zod is import-boundary-only: never in repository write path, reload read path, or export (STACK.md)
    - satisfies drift guards catch schema/type drift at compile time (entityType deliberately loose at untrusted boundary)
    - Migration harness is a generic fixture runner — real v1->v2 plugs in by adding fixtures, not by modifying the runner
    - No forward-looking v2 stub Dexie schema shipped (grep-verified: database.ts declares only version(1))

key-files:
  created:
    - src/persistence/validation-schemas.ts
    - src/persistence/import-validation.ts
    - src/persistence/import.ts
    - tests/persistence/migration-harness.ts
    - tests/persistence/migration-harness.test.ts
    - tests/persistence/import-validation.test.ts
    - tests/persistence/import-replace.test.ts
    - tests/persistence/import-merge.test.ts
  modified:
    - src/persistence/index.ts

key-decisions:
  - "Zod schema's .nonnegative() on integer economy fields catches negative values at the shape boundary (invalid_operation_shape) BEFORE Phase 1's validateNoNegativeResources runs. negative_resource is defense-in-depth at the import boundary — reachable only if the schema ever loosens. The rejection outcome is what matters; the code depends on which layer intercepts first."
  - "operationSchema uses entityType: z.string() (not z.enum of EntityType values) so untrusted archives are not rejected for an entityType the simulation's lenient validateOperationShape would also accept. The drift guard scopes to Omit<...,'entityType'> to catch structural drift in every other field."
  - "Merge mode conflicts on shared-id singletons (core id 'flowgrid:core') when merging divergent full archives — this is correct D-04 behavior. The intended merge use is adding new records to existing state (singletons match identically -> no-op; new ids -> insert)."
  - "satisfies in type-alias position is invalid TS syntax; the drift guards use expression-position satisfies (const _x = null as unknown as T satisfies U)."

patterns-established:
  - "Every persistence module carries a header comment citing the governing decision (D-08/D-09/D-10/D-11/D-12) and the layer-boundary invariant."
  - "Import validation returns readonly ValidationIssue[] (Phase 1 contract) — no parallel error type invented at the import boundary."
  - "Cell/module/route payload mismatches in merge mode surface as write_failure (no dedicated cell_conflict/module_conflict kinds in the 8-member PersistenceErrorKind union); sessions and operations use their dedicated session_conflict/operation_conflict kinds."

requirements-completed:
  - DATA-06
  - DATA-07
  - VER-03

# Metrics
duration: 19min
completed: 2026-06-23
status: complete
---

# Phase 2 Plan 03: Restore-Safety Slice Summary

**All-or-nothing archive import validation (Zod shape + Phase 1 invariants), atomic replace/merge execution with typed PersistenceError surfacing, and a reusable synthetic migration-fixture harness — no v2 stub schema shipped.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-06-23T20:44:58Z
- **Completed:** 2026-06-23T21:04:04Z
- **Tasks:** 5
- **Files modified/created:** 9 (3 source, 1 barrel, 5 test)
- **Tests:** 79 total pass (62 from 02-01/02-02 + 17 new across 4 files: 8 validation + 3 replace + 4 merge + 2 migration harness)

## Accomplishments

- `validation-schemas.ts` defines one `z.object` per durable record mirroring `src/domain/records.ts` + `SyncOperation`, composing into `archiveSchema` with `archiveVersion: z.literal(1)`. Integer economy fields use `z.number().int().nonnegative()`; ISO timestamps use `z.string().datetime()`; `operationSchema` uses `payload: z.unknown()` and `status: z.enum(['pending','applied','failed'])`. `satisfies` drift guards catch schema/type drift at compile time.
- `import-validation.ts` exports `validateArchive(input: unknown): readonly ValidationIssue[]` — a pure function performing NO writes. Pipeline: Zod `safeParse` (maps failures to `invalid_operation_shape` with path) → assemble `FlowgridSnapshot` (Maps for cells/moduleInstances/routes) → reuse Phase 1 `validateFlowgridSnapshot` (references/resources/allocations/operations). Zero issues means the caller may proceed to write.
- `import.ts` exports `importArchive(db, archive, mode='replace'): Promise<ImportResult>`. The validate-before-write gate calls `validateArchive` BEFORE any `db.transaction`; any issue returns `{ ok: false, issues }` with no write. Replace mode clears all nine stores then `bulkPut`s the archive in one transaction. Merge mode upserts each record by ID with the D-04 payload-mismatch conflict check (sessions→`session_conflict`, operations→`operation_conflict`, others→`write_failure`). Errors surface as typed `PersistenceError` via `mapDomException`.
- `migration-harness.ts` exports a generic `MigrationFixture<OldShape, NewShape>` interface and `runMigrationFixture` runner wrapping a Vitest `it`. The test file registers two synthetic fixtures (a field rename and a defaulted-field addition). Designed for direct reuse by the real v1→v2 migration — no v2 stub Dexie schema is shipped (grep-verified: `database.ts` declares only `version(1)`).
- VER-03 import/restore/migration tier green: all D-12 rejection modes covered (malformed shape, missing field, negative resource, broken reference, route sum > 100, core allocation ≠ 100), replace atomicity (forced mid-transaction failure leaves DB fully in state A), merge upsert/conflict behavior, and validation writes nothing.
- Boundary honored: import modules import record types type-only from `../domain/index.js`, `validateFlowgridSnapshot` (pure runtime, not simulation-rule execution), `FlowgridDatabase`, and the new boundary modules — no direct `dexie`, no `../simulation` runtime import (ESLint boundary rule passes).

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod archive boundary schemas** — `ac5f61c` (feat)
2. **Task 2: All-or-nothing archive validator** — `3651656` (feat)
3. **Task 3: Replace/merge import execution** — `c39140e` (feat)
4. **Task 4: Reusable synthetic migration-fixture harness** — `deee617` (test)
5. **Task 5: VER-03 import/restore suite** — `2ecf146` (test)

## Files Created/Modified

- `src/persistence/validation-schemas.ts` — `archiveSchema` + nine per-record `z.object` schemas + `satisfies` drift guards. The only Phase 2 module (alongside `import-validation.ts`) importing `zod` at runtime.
- `src/persistence/import-validation.ts` — `validateArchive(unknown) → readonly ValidationIssue[]`. Composes Zod `safeParse` with Phase 1 `validateFlowgridSnapshot`. No writes, no dexie, no `../simulation`.
- `src/persistence/import.ts` — `importArchive`, `ImportMode`, `ImportResult`, `ImportStats`. Validate-before-write gate; replace (clear+bulkPut) and merge (per-record idempotent upsert) modes; typed `PersistenceError` surfacing.
- `src/persistence/index.ts` — barrel now re-exports `./validation-schemas.js`, `./import-validation.js`, `./import.js` (additive; 02-01/02-02 exports untouched and un-reordered).
- `tests/persistence/migration-harness.ts` — generic `MigrationFixture<Old,New>` + `runMigrationFixture` runner.
- `tests/persistence/migration-harness.test.ts` — two synthetic fixtures (field rename, defaulted-field addition).
- `tests/persistence/import-validation.test.ts` — all-clear + 5 D-12 rejection modes + no-writes proof.
- `tests/persistence/import-replace.test.ts` — B replaces A, stats, forced mid-transaction atomicity.
- `tests/persistence/import-merge.test.ts` — new cell upsert, identical no-op, cell/session payload-mismatch conflicts.

## Decisions Made

- **`negative_resource` unreachable via `validateArchive` by design:** The Zod schema's `.nonnegative()` on every integer economy field catches negatives at the shape boundary, returning `invalid_operation_shape` before Phase 1's `validateNoNegativeResources` runs. The `negative_resource` code is defense-in-depth — it would fire only if the schema ever loosened. The test asserts the actual correct behavior (rejection via `invalid_operation_shape`) and documents the layering. The rejection OUTCOME is what DATA-06 requires; the specific code is an implementation detail of the two-layer pipeline.
- **`entityType: z.string()` (not `z.enum`):** Untrusted archives may carry entity types the simulation's lenient `validateOperationShape` would also accept (it checks non-emptiness, not enum membership). The schema matches that leniency. The drift guard uses `Omit<..., 'entityType'>` to catch structural drift in every other field without coupling the schema to the EntityType union.
- **Merge conflicts on shared-id singletons:** Merging two divergent full archives conflicts on `core` (shared id `'flowgrid:core'`, different post-session payloads). This is correct D-04 behavior. The merge use case is adding new records to existing state (identical singletons → no-op; new ids → insert), not reconciling divergent histories.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `satisfies` drift guard pseudocode was invalid TypeScript**
- **Found during:** Task 1 (validation-schemas.ts)
- **Issue:** The plan's pseudocode `type _SessionCheck = z.infer<typeof sessionSchema> satisfies SessionRecord;` is invalid — `satisfies` only works in expression position, not type-alias declarations. Additionally, `z.infer<typeof operationSchema> satisfies SyncOperation` fails because `entityType: z.string()` infers `string` while `SyncOperation.entityType` is the narrower `EntityType` union.
- **Fix:** Rewrote the drift guards as expression-position `satisfies` (`const _x = null as unknown as T satisfies U`). Scoped the operation guard to `Omit<..., 'entityType'>` with a documented rationale (entityType is deliberately loose at the untrusted boundary).
- **Files modified:** src/persistence/validation-schemas.ts
- **Verification:** `npm run typecheck` exits 0; both drift guards compile and would catch field-level drift.
- **Committed in:** ac5f61c

**2. [Rule 1 - Bug] Zod v4 `$ZodIssue.path` is `PropertyKey[]` (includes symbol)**
- **Found during:** Task 2 (import-validation.ts)
- **Issue:** Zod 4.x issue paths are typed `PropertyKey[]` (may contain `symbol`), not `(string | number)[]` as the plan's pseudocode assumed. The `mapZodIssues` helper failed typecheck.
- **Fix:** Widened `joinPath` and `mapZodIssues` signatures to `readonly PropertyKey[]`; `joinPath` stringifies non-number segments via `String(segment)`.
- **Files modified:** src/persistence/import-validation.ts
- **Verification:** `npm run typecheck` exits 0; Zod issues map to `invalid_operation_shape` with a joined path.
- **Committed in:** 3651656

**3. [Rule 1 - Bug] `negative_resource` code unreachable via `validateArchive`**
- **Found during:** Task 5 (import-validation.test.ts)
- **Issue:** The plan expected setting a cell's `xp` to -1 to surface `negative_resource`. The Zod schema's `.nonnegative()` catches -1 at the shape boundary first, returning `invalid_operation_shape`. This is correct two-layer behavior (schema is a stricter first gate), but it makes the Phase 1 `negative_resource` check a redundant defense-in-depth layer at the import boundary.
- **Fix:** Adjusted the test to assert the actual correct behavior: a negative `xp` IS rejected (via `invalid_operation_shape` from the schema layer). Documented in the test comment that `negative_resource` is defense-in-depth reachable only if the schema loosens. The rejection OUTCOME — which is what DATA-06 requires — is fully verified.
- **Files modified:** tests/persistence/import-validation.test.ts
- **Verification:** `npm run test -- --run tests/persistence/import-validation.test.ts` exits 0 (8 tests pass).
- **Committed in:** 2ecf146

**4. [Rule 1 - Bug] Merge "new cell" test conflicted on shared-id singletons**
- **Found during:** Task 5 (import-merge.test.ts)
- **Issue:** The plan's merge test built a full archive B from a different applied state and merged it into A. Both archives share singleton ids (`core: 'flowgrid:core'`, `settings: 'flowgrid:settings'`) but have different post-session payloads, so the merge correctly surfaced a `write_failure` conflict on the core singleton — the test expected success.
- **Fix:** Redesigned the test to match the intended merge use case: export A's OWN archive (singletons match exactly → idempotent no-op), append a genuinely new cell harvested from a separate applied state (new id → insert), and merge. This correctly tests "upsert new records without wiping existing state" without triggering singleton conflicts.
- **Files modified:** tests/persistence/import-merge.test.ts
- **Verification:** `npm run test -- --run tests/persistence/import-merge.test.ts` exits 0 (4 tests pass).
- **Committed in:** 2ecf146

---

**Total deviations:** 4 auto-fixed (4 bugs)
**Impact on plan:** All auto-fixes were necessary for the code to compile, typecheck, and faithfully test the designed two-layer validation pipeline and merge semantics. No scope creep — every fix aligns with RESEARCH §5.3 (Zod boundary + Phase 1 invariant reuse), CONTEXT D-04/D-11/D-12, and the Phase 1 D-08 determinism guarantee. The `negative_resource` adjustment is a faithful reflection of the schema-first architecture, not a weakening.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None — no external service configuration required. The Zod dependency was already installed in plan 02-01; this plan consumes it at the import boundary.

## Next Phase Readiness

- DATA-06 (import/restore validates schema version, required records, references, and resource invariants all-or-nothing before changing local data) is complete: every D-12 rejection mode is covered by a test, and validation provably writes nothing.
- DATA-07 (typed PersistenceError contract distinguishing recoverable from non-recoverable states) is complete: `importArchive` surfaces typed errors via `mapDomException`, with `quota_exceeded`/`persistence_denied`/`blocked_upgrade` (recoverable) and `indexeddb_unavailable` (non-recoverable) — the contract shipped in 02-01, surfaced by import here.
- VER-03 import/restore/migration tier is green (validation rejection modes, replace atomicity, merge conflict behavior, migration-fixture harness).
- Phase 3 (Playable Generator Flowgrid) can wire "Import JSON" / "Restore from backup" buttons directly to `importArchive(db, file, 'replace')` and render typed `PersistenceError` / `ValidationIssue[]` results in recovery UX.
- The migration harness is ready for the real v1→v2 migration: add `db.version(2).stores({...}).upgrade(...)` to `database.ts` and register real fixtures alongside the synthetic ones — the runner stays unchanged.
- Phase 2 (Durable Local-First Spine) is now complete: all three plans executed, all nine requirements (DATA-01 through DATA-07, SESS-04, VER-03) satisfied.

## Self-Check: PASSED

- All 8 created files verified present on disk.
- All 5 task commits (ac5f61c, 3651656, c39140e, deee617, 2ecf146) verified in git log.
- Plan-level verification re-run green: `npm run typecheck`, `npm run lint`, and `npm run test -- --run` (79 tests across 20 files) all exit 0.
- No `db.version(2)` stub shipped (grep-verified across `src/`).

---
*Phase: 02-durable-local-first-spine*
*Completed: 2026-06-23*
