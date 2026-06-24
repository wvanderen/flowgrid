---
phase: 04-core-alternation-and-rejuvenation-economy
plan: 02
subsystem: database
tags: [persistence, dexie, migration, indexeddb, rejuvenation, zod, archive, append-only, idempotent]

# Dependency graph
requires:
  - phase: 04-core-alternation-and-rejuvenation-economy
    provides: "04-01 simulation truth: RejuvenationRecord shape, id-1:1-with-operationId contract, CoreRecord.activationBoostLevel + activeRejuvenationStartedAt fields, and the compile shims in repository/import-validation/validation-schemas that this plan replaces with real store/archive reads"
provides:
  - "Dexie version(3) migration: rejuvenations store + upgradeCoresV2ToV3 extracted transform (defaults activationBoostLevel=0 / activeRejuvenationStartedAt=null)"
  - "FlowgridDatabase.rejuvenations typed Table property"
  - "FlowgridWritePlan.appendRejuvenations diff arm (interface, EMPTY_PLAN, diff body, return, isEmpty)"
  - "FlowgridRepository rejuvenations idempotent append (write_failure kind) + loadSnapshot read; 'rejuvenations' in ALL_STORE_NAMES (ten stores)"
  - "JsonArchive.rejuvenations; ARCHIVE_VERSION = 2; archiveVersion 1 | 2 union"
  - "rejuvenationSchema Zod schema + drift guard; coreSchema activationBoostLevel + activeRejuvenationStartedAt (with .default for v1 backward-compat)"
  - "archiveSchema accepts version 1 | 2 with optional rejuvenations (v1 archives default to [])"
  - "ImportStats.rejuvenations; replace clear+bulkPut + merge idempotent upsert for rejuvenations"
  - "v1 archive backward-compat: optional rejuvenations field + core field defaults (Pitfall 6)"
affects: [04-03 (UI: CorePanel + RejuvenationSummary + ReturnCues read persisted state), future sync spike (operation queue + append-only conflict rules)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extracted migration transform (upgradeCoresV2ToV3) exercised by the migration-harness without a live IndexedDB (PATTERNS C8)"
    - "Verbatim store repetition in version(N).stores() — Dexie requires the full store set when replacing the prior declaration context"
    - "archiveVersion as a fourth independent version axis (D-08): union literal 1 | 2 lets v1 archives parse; optional rejuvenations defaults to []"
    - "Append-only write path with idempotent append: same id + identical payload = silent no-op; same id + different payload = typed write_failure conflict (prohibition 5 / T-04-10)"
    - "v1 archive normalization at the import boundary: double cast mirrors the operations boundary bridge (runtime optional vs type-required)"

key-files:
  created: []
  modified:
    - src/persistence/database.ts
    - src/persistence/diff.ts
    - src/persistence/repository.ts
    - src/persistence/export-json.ts
    - src/persistence/import.ts
    - src/persistence/import-validation.ts
    - src/persistence/validation-schemas.ts
    - tests/persistence/migration-harness.test.ts
    - tests/persistence/repository.test.ts
    - tests/persistence/schema.test.ts
    - tests/persistence/export-json.test.ts
    - tests/persistence/import-replace.test.ts
    - tests/persistence/import-merge.test.ts
    - tests/persistence/import-validation.test.ts

key-decisions:
  - "Kept the .default(0) / .default(null) on coreSchema activation fields (added by 04-01 deviation #2) rather than the plan's bare z.number()/z.nullable() — the defaults are the archive-import equivalent of the Dexie v2->v3 migration's field defaults and are required for v1 archives whose core predates Phase 4 (Pitfall 6). The plan's acceptance criterion only requires the fields to be present in coreSchema, which they are."
  - "Normalized v1 archive rejuvenations at the import.ts boundary via a double cast (validated as unknown as {rejuvenations?: ...}).rejuvenations ?? [] rather than threading optionality through JsonArchive — JsonArchive.rejuvenations stays required (matching what exportJson produces) while the import path honestly bridges the v1 optional-field runtime reality. Mirrors the existing operations entityType cast in import-validation.ts."
  - "Reused 'write_failure' conflict kind for rejuvenations payload-mismatch (mirrors forgeHistory) — no dedicated rejuvenation_conflict in the 8-member PersistenceErrorKind union; documented and consistent."

patterns-established:
  - "v2->v3 migration mirrors v1->v2: extracted pure transform + CORE_V3_DEFAULTS + verbatim store repetition + .upgrade(collection.modify)"
  - "Archive version bump pattern: union literal in archiveSchema + optional new collection + import-boundary normalization to []"

requirements-completed: [REJ-01]

# Metrics
duration: 10min
completed: 2026-06-24
status: complete
---

# Phase 4 Plan 2: Core Alternation and Rejuvenation Economy (Persistence) Summary

**Durable rejuvenations spine: Dexie v2->v3 migration (rejuvenations store + extracted core-field transform), repository append/reload with idempotent replay, ARCHIVE_VERSION=2 envelope with v1 backward-compat, and Zod schemas — the persistence slice of Phase 4**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-24T17:06:22Z
- **Completed:** 2026-06-24T17:16:41Z
- **Tasks:** 2
- **Files modified:** 14 (7 source, 7 test)

## Accomplishments
- Replaced the two 04-01 compile shims (`rejuvenations: []` in repository.loadSnapshot and import-validation) with real Dexie store / archive reads, closing the durability loop: a RejuvenationRecord now survives reload, export, and restore.
- Added the Dexie v2->v3 migration with an extracted `upgradeCoresV2ToV3` transform (defaults activationBoostLevel=0 / activeRejuvenationStartedAt=null on every existing CoreRecord — byte-identical Phase 3 economy output, Pitfall 6) and the new `rejuvenations` store indexed by id + createdAt.
- Bumped ARCHIVE_VERSION to 2 and made archiveSchema accept version 1 | 2 with optional rejuvenations, so a v1 archive (exported before Phase 4) imports cleanly with rejuvenations defaulted to empty.
- Wired the full append-only write path: diff arm (appendRejuvenations), repository idempotent append (write_failure conflict kind, mirrors forgeHistory), export Promise.all, and replace/merge import handling — with no update/delete path for rejuvenations (history is sacred, prohibition 5).
- Added `rejuvenationSchema` (mirroring RejuvenationRecord field-for-field) with a drift-guard `satisfies` line so future record-shape changes surface at the import boundary.
- 205/205 vitest tests green (10 new persistence cases), tsc + eslint + npm run build all clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: v3 migration + diff/repository + export/import + Zod schemas (durable wiring)** — `77d2b4b` (feat)
2. **Task 2: Persistence tests — migration fixture, repository append, schema, export/import round-trip** — `5aba208` (test)

## Files Created/Modified
- `src/persistence/database.ts` - CORE_V3_DEFAULTS + upgradeCoresV2ToV3 extracted transform; version(3) with rejuvenations store + core upgrade; FlowgridDatabase.rejuvenations table property
- `src/persistence/diff.ts` - FlowgridWritePlan.appendRejuvenations (interface, EMPTY_PLAN, diff body, return, isEmpty)
- `src/persistence/repository.ts` - 'rejuvenations' in ALL_STORE_NAMES (10 stores); idempotent append loop; loadSnapshot reads db.rejuvenations (replaces 04-01 shim)
- `src/persistence/export-json.ts` - ARCHIVE_VERSION=2; JsonArchive.rejuvenations; round-trip via Promise.all
- `src/persistence/import.ts` - rejuvenations in stores/stats/replace-clear+bulkPut/merge-upsert; v1 archive normalized to [] via optional schema field
- `src/persistence/import-validation.ts` - archive.rejuvenations ?? [] (replaces 04-01 shim)
- `src/persistence/validation-schemas.ts` - rejuvenationSchema + drift guard; archiveVersion 1|2 union; optional rejuvenations for v1 backward-compat
- `tests/persistence/migration-harness.test.ts` - v2->v3 core migration fixture (defaults both fields, preserves economy values)
- `tests/persistence/repository.test.ts` - rejuvenation persists + reloads byte-identical; idempotent replay (no duplication)
- `tests/persistence/schema.test.ts` - ten-store declaration incl. rejuvenations; seeded core level 0 / null marker; rejuvenations empty on first run
- `tests/persistence/export-json.test.ts` - archiveVersion === 2; RejuvenationRecord round-trips through the envelope
- `tests/persistence/import-replace.test.ts` - rejuvenation round-trips export->replace-import byte-identical
- `tests/persistence/import-merge.test.ts` - rejuvenation round-trips merge + re-merge idempotent (no duplication)
- `tests/persistence/import-validation.test.ts` - v1 archive (archiveVersion 1, no rejuvenations) parses + imports with stats.rejuvenations === 0; malformed v2 rejuvenation rejected

## Decisions Made
- **Kept coreSchema .default() on Phase 4 fields:** the plan's action text showed the core fields without `.default()`, but 04-01 deviation #2 already added them with `.default(0)` / `.default(null)` for Pitfall 6 backward-compat. Removing the defaults would break v1 archive import (a v1 core lacks these fields). The defaults are the archive-import equivalent of the Dexie migration's field defaults. The plan's acceptance criterion only requires the fields present in coreSchema — satisfied either way.
- **v1 archive rejuvenations normalization at import boundary:** archiveSchema makes rejuvenations optional (v1 compat), but JsonArchive.rejuvenations is required (matching exportJson output). Bridged via a double cast at the import write path (`validated as unknown as {rejuvenations?: ...}`).rejuvenations ?? []`, mirroring the existing operations entityType boundary cast. Keeps JsonArchive honest while handling the v1 runtime reality.
- **write_failure conflict kind for rejuvenations:** the 8-member PersistenceErrorKind union has no dedicated rejuvenation_conflict; reused write_failure (mirrors forgeHistory). Documented in code comments.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Normalized v1 archive rejuvenations at the import.ts boundary**
- **Found during:** Task 1
- **Issue:** The plan's import.ts instructions reference `validated.rejuvenations` directly in replace (bulkPut) and merge (loop) paths and in statsFor. But archiveSchema makes rejuvenations optional so a v1 archive parses without it — at runtime `validated.rejuvenations` is `undefined` for a v1 archive, which would crash `bulkPut(undefined)` / `.length`. The cast `archive as unknown as JsonArchive` lies about optionality at the type level.
- **Fix:** Introduced a `rejuvs` const computed via `(validated as unknown as {rejuvenations?: readonly RejuvenationRecord[]}).rejuvenations ?? []` and threaded it through replace bulkPut, merge loop, and statsFor. Mirrors the existing operations boundary cast in import-validation.ts.
- **Files modified:** src/persistence/import.ts
- **Verification:** import-validation v1 archive test passes (stats.rejuvenations === 0, no crash); replace + merge round-trip tests green.
- **Committed in:** 77d2b4b (Task 1 commit)

**2. [Rule 1 - Bug] Kept coreSchema .default() on Phase 4 fields rather than the plan's bare validators**
- **Found during:** Task 1
- **Issue:** The plan's action said to add `activationBoostLevel: z.number().int().nonnegative()` and `activeRejuvenationStartedAt: z.string().datetime().nullable()` to coreSchema. But 04-01 deviation #2 already added them WITH `.default(0)` / `.default(null)` for Pitfall 6 backward-compat. Removing the defaults would reject v1 archives whose core predates Phase 4 (the archiveSchema v1 union + optional rejuvenations compat story requires the core fields to also tolerate absence).
- **Fix:** Left the existing `.default()` validators in place. The plan's acceptance criterion (`rg "activationBoostLevel|activeRejuvenationStartedAt" src/persistence/validation-schemas.ts` matches both) is satisfied either way; the defaults are the correct choice for v1 backward-compat and are consistent with the Dexie migration's field-defaulting strategy.
- **Files modified:** none (kept 04-01's implementation)
- **Verification:** v1 archive import test green (core parses without the fields, defaults applied).
- **Committed in:** 77d2b4b (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking, 1 Rule 1 bug)
**Impact on plan:** Both deviations are necessary for the plan's own v1 backward-compat acceptance criterion (a v1 archive imports with zero issues). The normalization prevents a runtime crash on v1 import; keeping the defaults prevents a Zod rejection of v1 cores. No scope creep — both are direct consequences of the archiveSchema version-union + optional-rejuvenations compat story the plan mandates.

## TDD Gate Compliance

Task 2 is marked `tdd="true"` but the plan's task ordering places the implementation (Task 1) before the test task (Task 2). Since `workflow.tdd_mode` is not enabled in config, the RED/GREEN gate is not enforced. Consequently the TDD RED phase collapses: Task 1's wiring ships first, and Task 2's tests pass on first run (test-after rather than test-first). This is a plan-structure observation, not a gate violation — all 10 new test cases verify Task 1's behavior and pass green. A `test(04-02)` commit precedes no `feat(04-02)` commit within Task 2's own boundary (the feat commit is Task 1's `77d2b4b`).

## Issues Encountered
None beyond the deviations above. No authentication gates, no external-service dependencies, no new packages installed.

## User Setup Required
None - no external service configuration required. This is a pure persistence slice; UI (04-03) is the next plan.

## Next Phase Readiness
- **Ready for 04-03 (UI):** the full RejuvenationRecord lifecycle is now durable. CorePanel can read persisted Energy/Core Charge/Integration/Module Tokens/activationBoostLevel; RejuvenationSummary can read the last persisted RejuvenationRecord from `loadSnapshot().rejuvenations`; ReturnCues can read Core economy state. All accessible via `FlowgridRepository.loadSnapshot()`.
- **v2->v3 migration verified:** the extracted `upgradeCoresV2ToV3` transform is covered by the migration-harness fixture; a real IndexedDB (or fake-indexeddb) upgrades cleanly from v2 to v3 with the rejuvenations store added and core fields defaulted.
- **No blockers.** Phase 3 regression suites remain green; the 04-01 simulation truth and the 04-02 persistence spine are mutually consistent (whatever the simulation produces, the persistence layer stores).

## Self-Check: PASSED

- All 7 modified source files exist on disk: FOUND.
- All 7 modified test files exist on disk: FOUND.
- Both task commit hashes present in git log (77d2b4b, 5aba208): FOUND.
- Plan-level verification: `npx tsc --noEmit` (0), `npx eslint .` (0), `npx vitest run tests/persistence/` (55/55), `npm run build` (success), full `npx vitest run` (205/205): PASS.

---
*Phase: 04-core-alternation-and-rejuvenation-economy*
*Completed: 2026-06-24*
