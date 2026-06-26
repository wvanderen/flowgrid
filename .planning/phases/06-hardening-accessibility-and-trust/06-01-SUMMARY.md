---
phase: 06-hardening-accessibility-and-trust
plan: 01
subsystem: ui
tags: [settings, dexie-migration, reduce-motion, export-import, simulation-command, zod]

# Dependency graph
requires:
  - phase: 02-durable-local-first-spine
    provides: Dexie migration harness + export/import + Zod boundary schemas + SettingsRecord singleton
  - phase: 04-core-alternation-and-rejuvenation-economy
    provides: coreSchema `.default()` backward-compat precedent + set_core_allocation command template
provides:
  - update_settings simulation command (validate → apply → emit operation → return)
  - SettingsRecord.reduceMotion durable field + Dexie v4→v5 migration
  - /settings route + SettingsPanel (defaults editing, reduced-motion toggle, export JSON/CSV, import-replace)
  - effectiveReduceMotion / prefersReducedMotion UI helpers (consumed by Plan 06-02 renderer)
affects: [06-02-animated-renderer, 06-03-semantic-cell-list, 06-04-e2e-verification, UI-04-safety]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton-targeting validate→apply→emit→return command mirroring set_core_allocation"
    - "Field-additive Dexie migration via .default(false) — NO ARCHIVE_VERSION bump (Phase 4 coreSchema precedent)"
    - "Route-peer component shell (/settings mirrors /core, /forge)"
    - "One-time OS-preference honoring via guarded mount effect (D-09)"

key-files:
  created:
    - src/simulation/commands/update-settings.ts
    - src/ui/settings/SettingsPanel.tsx
    - src/ui/settings/reduce-motion.ts
    - src/ui/shared/download.ts
    - tests/simulation/update-settings.test.ts
    - tests/properties/update-settings.property.test.ts
  modified:
    - src/domain/records.ts
    - src/domain/result.ts
    - src/simulation/engine.ts
    - src/simulation/operation-events.ts
    - src/persistence/database.ts
    - src/persistence/validation-schemas.ts
    - src/persistence/export-json.ts
    - src/persistence/seeding.ts
    - src/content/starter-state.ts
    - src/app/routes.tsx
    - src/ui/flowgrid-home/FlowgridHome.tsx
    - tests/persistence/migration-harness.test.ts
    - tests/ui/session-summary.test.tsx

key-decisions:
  - "reduceMotion is field-additive via settingsSchema `.default(false)`, so ARCHIVE_VERSION stays at 2 (Pitfall 4 / Q2 — follows Phase 4 coreSchema precedent); documented in export-json.ts"
  - "localDayBoundary validation reuses the HH:MM shape (regex ^\\d{2}:\\d{2}$) that deriveLocalDate already parses; rejects malformed input with invalid_operation_shape"
  - "D-09 OS-preference honoring runs as a one-time ref-guarded mount effect in SettingsPanel (not persistence) so seeding stays DOM-free and testable"

patterns-established:
  - "update_settings command: the singleton-edit template for durable app preferences (mirrors set_core_allocation)"
  - "triggerDownload helper: centralized Blob+anchor file download shared by JSON+CSV export"
  - "Dexie v4→v5 settings transform: extracted upgradeSettingsV4ToV5 pure function + SETTINGS_V5_DEFAULTS, exercised by the migration harness"

requirements-completed: [UI-06]

# Metrics
duration: 87min
completed: 2026-06-26
status: complete
---

# Phase 6 Plan 1: Settings Summary

**`update_settings` simulation command + `SettingsRecord.reduceMotion` with a Dexie v4→v5 migration, `/settings` route + SettingsPanel (defaults editing, reduced-motion toggle, JSON/CSV export, import-replace), and unit/property/migration-harness coverage**

## Performance

- **Duration:** 87 min
- **Started:** 2026-06-26T17:04:42Z
- **Completed:** 2026-06-26T18:32:26Z
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments
- `update_settings` command handler mirrors `set_core_allocation` exactly (typed ValidationIssue[], no throw) and writes the durable SettingsRecord through the normal dispatch/repository path
- Dexie `version(5)` migration defaults `reduceMotion` to false on the existing settings singleton, with the extracted `upgradeSettingsV4ToV5` pure transform exercised by the migration harness
- `/settings` route renders a full SettingsPanel: editable defaults, reduced-motion checkbox, JSON + CSV export downloads, and import-replace-with-confirm — all reading the snapshot and dispatching through the single mutation path
- D-12 holds and is property-tested: changing defaults never back-fills existing Cells' `dailyMilestoneTargetSeconds`
- D-09 first-run OS-preference honoring ships as a one-time, ref-guarded mount effect

## Task Commits

Each task was committed atomically:

1. **Task 1: update_settings command + SettingsRecord.reduceMotion + Dexie v5 migration + schemas** - `6645210` (feat)
2. **Task 2: /settings route + SettingsPanel + export/import UI + Settings header link** - `e327463` (feat)
3. **Task 3: update_settings unit + property tests + v4→v5 migration harness fixture** - `f73f394` (test)

**Plan metadata:** pending (docs: complete plan — committed last)

## Files Created/Modified
- `src/simulation/commands/update-settings.ts` - update_settings handler (validate → apply → emit operation → return)
- `src/domain/records.ts` - SettingsRecord gains `reduceMotion: boolean` (before updatedAt)
- `src/domain/result.ts` - UpdateSettingsCommand interface + SimulationCommand union variant
- `src/simulation/engine.ts` - `case 'update_settings'` dispatcher
- `src/simulation/operation-events.ts` - entityType 'settings' + fallback entityId routing
- `src/persistence/database.ts` - `version(5)` block + `upgradeSettingsV4ToV5` + `SETTINGS_V5_DEFAULTS`
- `src/persistence/validation-schemas.ts` - `reduceMotion: z.boolean().default(false)` + `_settingsSchemaCheck` drift guard
- `src/persistence/export-json.ts` - documenting comment; ARCHIVE_VERSION stays 2
- `src/persistence/seeding.ts` - seeded settings carries reduceMotion: false
- `src/content/starter-state.ts` - starter settings literal carries reduceMotion: false
- `src/app/routes.tsx` - `/settings` route peer
- `src/ui/settings/SettingsPanel.tsx` - route component (defaults, toggle, export/import)
- `src/ui/settings/reduce-motion.ts` - effectiveReduceMotion + prefersReducedMotion
- `src/ui/shared/download.ts` - triggerDownload helper (Blob + anchor)
- `src/ui/flowgrid-home/FlowgridHome.tsx` - Settings header link next to Core
- `tests/simulation/update-settings.test.ts` - 5 unit cases (applied/rejected-shape/rejected-boundary/D-12/replay)
- `tests/properties/update-settings.property.test.ts` - 3 properties (well-formed, D-12 durability, rejection cleanliness) over 100 runs
- `tests/persistence/migration-harness.test.ts` - v4→v5 settings describe block
- `tests/ui/session-summary.test.tsx` - test fixture carries reduceMotion

## Decisions Made
- **No ARCHIVE_VERSION bump.** Adding `reduceMotion` is field-additive; `settingsSchema.reduceMotion: z.boolean().default(false)` lets a v2 archive lacking the field parse and default, so the envelope shape stays backward-compatible. Follows the Phase 4 `coreSchema` `.default(...)` precedent. Documented in a code comment in `export-json.ts`.
- **HH:MM boundary validation.** Reuses the exact shape `deriveLocalDate` already parses (`^\d{2}:\d{2}$`); malformed input rejects with `invalid_operation_shape`, `entityType: 'settings'`, `entityId: previousState.settings.id`.
- **D-09 honoring placement.** The OS-preference check lives in the SettingsPanel mount effect (UI layer), not persistence, so seeding stays DOM-free and testable per the architecture boundary. Guarded by a ref so it fires at most once.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `reduceMotion: false` to `createStarterFlowgridState` settings literal**
- **Found during:** Task 1 (tsc gate)
- **Issue:** `SettingsRecord` now requires `reduceMotion`, and the test fixtures' `buildStarterSnapshot` constructs settings via `src/content/starter-state.ts`. Without the field, `npx tsc --noEmit` fails with TS2322.
- **Fix:** One-line field addition mirroring `seeding.ts`.
- **Files modified:** src/content/starter-state.ts
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 6645210 (Task 1 commit)

**2. [Rule 3 - Blocking] Added `reduceMotion: false` to `tests/ui/session-summary.test.tsx` makeSettings fixture**
- **Found during:** Task 1 (tsc gate)
- **Issue:** Same root cause — a `SettingsRecord` literal in a test helper lacked the now-required field.
- **Fix:** One-line field addition to the `makeSettings` factory.
- **Files modified:** tests/ui/session-summary.test.tsx
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 6645210 (Task 1 commit)

**3. [Plan-permitted] Added `src/ui/shared/download.ts`**
- **Found during:** Task 2 (export UI)
- **Issue:** The export buttons need a Blob+anchor download helper; the plan explicitly permitted creating it "inline or in src/ui/shared/download.ts".
- **Fix:** Created the small `triggerDownload(filename, mime, content)` helper so both JSON and CSV buttons share it.
- **Files modified:** src/ui/shared/download.ts (new)
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** e327463 (Task 2 commit)

---

**Total deviations:** 3 (2 Rule-3 blocking auto-fixes caused by the new required field, 1 plan-permitted helper)
**Impact on plan:** All auto-fixes are one-line additions necessary for the build to pass and directly caused by Task 1's type change. No scope creep — they keep the existing starter-state/test fixtures compiling against the widened record.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `update_settings` + `SettingsRecord.reduceMotion` + Dexie v5 are in place — Plan 06-02 (animated renderer) can read `effectiveReduceMotion(snapshot.settings.reduceMotion)` to gate its ticker/particle systems.
- The `/settings` route + Settings link in the Home header are ready for Plan 06-03 (semantic Cell list) and Plan 06-04 (VER-04/05/06 E2E, which will exercise the full click flow including settings persistence + reload).
- No blockers.

## Self-Check: PASSED
- All 6 created files exist on disk (update-settings.ts, SettingsPanel.tsx, reduce-motion.ts, download.ts, update-settings.test.ts, update-settings.property.test.ts)
- All 4 commits present (6645210 feat, e327463 feat, f73f394 test, cf0d8b0 docs)
- `npx tsc --noEmit` exits 0
- `npx vitest run` full suite: 40 files / 235 tests pass, exit 0
- SettingsRecord.reduceMotion placed before updatedAt; version(5) present; ARCHIVE_VERSION stays 2; v4→v5 migration describe block present

---
*Phase: 06-hardening-accessibility-and-trust*
*Completed: 2026-06-26*
