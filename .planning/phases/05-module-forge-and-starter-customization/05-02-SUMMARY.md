---
phase: 05-module-forge-and-starter-customization
plan: 02
subsystem: persistence
tags: [dexie, schema-migration, zod, drift-guard, local-first, idempotent-import]

# Dependency graph
requires:
  - phase: 05-module-forge-and-starter-customization
    provides: Plan 05-01 widened ForgeHistoryRecord (7-field D-09 shape), extended RunForgeCommand, and the validation-schemas.ts forgeHistorySchema pre-staged as Deviation #1
  - phase: 02-durable-local-first-spine
    provides: migration-harness pattern (PATTERNS C8 / D-07), idempotentMergeUpsert, diffAppend append-only dedup, Zod import-boundary validation
  - phase: 04-core-alternation-and-rejuvenation-economy
    provides: upgradeCoresV2ToV3 extracted-transform template + version(3) full-store-set repetition pattern
provides:
  - Dexie schema version(4) with full 10-store set + .upgrade() callback on the (pre-Phase-5 empty) forgeHistory store
  - Exported pure transform upgradeForgeHistoryV3ToV4 + FORGE_HISTORY_V4_DEFAULTS sentinel defaults (exercised by migration harness without IndexedDB)
  - Confirmed Zod forgeHistorySchema mirroring the widened ForgeHistoryRecord field-for-field with the satisfies drift guard closing Pitfall 6
  - Confirmed export/import envelope picks up the widened shape automatically (JsonArchive.forgeHistory references the domain ForgeHistoryRecord[] directly; idempotentMergeUpsert dedups by id=operationId)
affects: [05-03 UI forge route + chip + tile, 06-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dexie additive schema bump with extracted transform + full-store-set repetition + .upgrade() even on empty store (RESEARCH Pitfall 5 — mirrors v2/v3 pattern)"
    - "Zod/domain satisfies drift guard surfaces schema drift at compile time (Pitfall 6) — moduleKind uses z.enum (stricter than plan's z.string) to mirror ModuleDefinitionKind exactly and catch tampered imports at the enum boundary"

key-files:
  created: []
  modified:
    - src/persistence/database.ts
    - tests/persistence/migration-harness.test.ts

key-decisions:
  - "Task 2 (Zod widening + drift guard + export/import) was fully pre-staged by Plan 05-01 Deviation #1 (commit 98fc4d2) — the 05-01 SUMMARY explicitly notes 'the validation-schemas.ts edit is the minimum required for Task 1's tsc --noEmit to pass and pre-stages the wider Plan 05-02 work.' No empty commit was made; all 6 Task 2 acceptance criteria verified green."
  - "moduleKind uses z.enum(['generator','charge_core','output','bloom']) in forgeChoiceSchema/forgeChosenRewardSchema rather than the plan's z.string() — tighter validation that mirrors the ModuleDefinitionKind union exactly and closes threat T-05-07 at the enum boundary (stricter than plan spec; pre-staged in 05-01)."

patterns-established:
  - "Pattern: version(N).stores({...full set verbatim...}).upgrade(transform) — even when the target store is empty pre-phase, the version MUST bump, the full store set MUST repeat, and .upgrade() MUST exist so the harness can exercise the transform (RESEARCH Pitfall 5)"

requirements-completed: [MOD-05]

# Metrics
duration: 3min
completed: 2026-06-25
status: complete
---

# Phase 5 Plan 02: Forge History Persistence Migration Summary

**Dexie v3→v4 schema bump with extracted upgradeForgeHistoryV3ToV4 transform + full 10-store-set repetition + .upgrade() on the empty store, plus confirmed Zod/domain alignment via the satisfies drift guard — RESEARCH Pitfalls 5 and 6 both closed**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-25T23:18:00Z
- **Completed:** 2026-06-25T23:21:03Z
- **Tasks:** 2
- **Files modified:** 2 (Task 1) + 0 (Task 2 pre-staged)

## Accomplishments
- Shipped the Dexie v3→v4 schema bump: `version(4).stores({...full 10-store set verbatim from v3...}).upgrade(async (tx) => { await tx.table('forgeHistory').toCollection().modify(upgradeForgeHistoryV3ToV4); })` — RESEARCH Pitfall 5 closed (full-store-set repetition + .upgrade() even on the empty pre-Phase-5 store)
- Extracted `upgradeForgeHistoryV3ToV4` as an exported pure transform + `FORGE_HISTORY_V4_DEFAULTS` sentinel-default constant, mirroring the `upgradeCoresV2ToV3` / `CORE_V3_DEFAULTS` Phase 4 template — the migration harness exercises it without a live IndexedDB
- Added a migration-harness fixture proving a synthetic v3 forgeHistory row upgrades to a v4 row carrying the four sentinel default fields (paymentType='token', paymentAmount=0, offeredChoices=[], chosenReward=null)
- Verified the Zod `forgeHistorySchema` mirrors the widened `ForgeHistoryRecord` field-for-field (pre-staged by 05-01 Deviation #1) and the `_forgeHistorySchemaCheck satisfies ForgeHistoryRecord` drift guard closes Pitfall 6 at compile time
- Confirmed export/import pick up the widened shape automatically: `JsonArchive.forgeHistory: readonly ForgeHistoryRecord[]` references the domain type directly (no parallel type to widen); `import.ts` uses `idempotentMergeUpsert` keyed on `id=operationId` so append-only dedup flows through unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Dexie v3→v4 migration with extracted transform** - `7011cd5` (feat)
2. **Task 2: Zod widening + drift guard + export/import envelope** - pre-staged by Plan 05-01 Deviation #1 (commit `98fc4d2`); all 6 acceptance criteria verified green, no empty commit made

**Plan metadata:** _(pending final commit)_

## Files Created/Modified
- `src/persistence/database.ts` - Added FORGE_HISTORY_V4_DEFAULTS constant + upgradeForgeHistoryV3ToV4 exported pure transform + version(4) declaration (full 10-store set + .upgrade() callback); updated file-header comment to "Currently v4"
- `tests/persistence/migration-harness.test.ts` - Added upgradeForgeHistoryV3ToV4 to the database.ts import; added v3→v4 forgeHistory fixture block proving sentinel-default behavior on a synthetic v3 row

## Decisions Made
- **Task 2 pre-staged handling:** Plan 05-01 Deviation #1 already widened `forgeHistorySchema` field-for-field (paymentType z.enum, paymentAmount nonnegative, offeredChoices z.array, chosenReward with fromLevel/toLevel), added the `_forgeHistorySchemaCheck satisfies ForgeHistoryRecord` drift guard, imported `ForgeHistoryRecord` into validation-schemas.ts, and added the Phase 5/D-09/Pitfall 6 comment block. The 05-01 SUMMARY explicitly states this "pre-stages the wider Plan 05-02 work." Since `git status` showed no uncommitted changes for Task 2's files (validation-schemas.ts, export-json.ts, import.ts) and all 6 Task 2 acceptance criteria verified green, no empty commit was made — that would misrepresent the work. The Zod widening, drift guard, and envelope flow-through are all durable in git history at commit `98fc4d2`.
- **moduleKind enum vs string:** The shipped `forgeChoiceSchema` / `forgeChosenRewardSchema` use `z.enum(['generator', 'charge_core', 'output', 'bloom'])` for `moduleKind` rather than the plan's `z.string()`. This is stricter and aligns with threat T-05-07 (catches tampered imports at the enum boundary); the satisfies drift guard stays tight because the enum mirrors `ModuleDefinitionKind` exactly. Pre-staged in 05-01.
- **export/import need no change:** `JsonArchive.forgeHistory: readonly ForgeHistoryRecord[]` references the domain type directly — the Plan 05-01 widening flows through automatically. `import.ts` line 182-184 uses `idempotentMergeUpsert(db.forgeHistory, forge, 'write_failure', 'ForgeHistory')` keyed on `id=operationId`, so append-only dedup is unchanged. `ARCHIVE_VERSION` stays at 2 (the envelope SHAPE didn't change — only the record shape WITHIN it, handled by the Zod schema).

## Deviations from Plan

### Auto-fixed Issues

None - plan executed as written. Task 1 was implemented exactly per spec; Task 2 was pre-staged by Plan 05-01 Deviation #1 and verified complete (all acceptance criteria green, no code change needed).

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** None. The pre-staging of Task 2's validation-schemas.ts work was already documented in the 05-01 SUMMARY as an intentional forward-deploy. RESEARCH Pitfalls 5 (full-store-set repetition + .upgrade() on empty store) and 6 (Zod/domain drift) are both closed. D-09 is fully shipped across Plans 05-01 + 05-02.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. This plan is pure persistence-layer TypeScript with no new dependencies, no environment variables, and no runtime configuration.

## Next Phase Readiness
- **Plan 05-03 (UI forge route + chip + tile):** The persistence layer is complete — the widened `ForgeHistoryRecord` round-trips through the v4 schema and export/import with the full shape intact. The `/forge` route, `ForgeSummary`, ReturnCues Forge chip, and extended Cell Board tiles can now read/write the durable forge history without any further persistence work.
- **D-09 fully shipped:** Plan 05-01 widened the domain record + command + per-level effects; Plan 05-02 shipped the Dexie v4 bump + extracted transform + confirmed Zod/domain alignment. The durable half of MOD-05 is complete.
- **No blockers.** The forge loop is fully drivable and persists across reloads.

---
*Phase: 05-module-forge-and-starter-customization*
*Completed: 2026-06-25*

## Self-Check: PASSED

All modified files exist on disk (src/persistence/database.ts, tests/persistence/migration-harness.test.ts). Task 1 commit (7011cd5) and pre-staged Task 2 commit (98fc4d2) both present in git log. `this.version(4)` count = 1. `satisfies ForgeHistoryRecord` count = 1. `npx tsc --noEmit` green. `npm test` green (225/225 tests pass). `npm run lint` clean.
