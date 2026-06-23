---
phase: 02-durable-local-first-spine
plan: 02
subsystem: database
tags: [json-export, csv-export, rfc4180, data-portability, local-first, vitest]

# Dependency graph
requires:
  - phase: 02-durable-local-first-spine (plan 01)
    provides: Dexie repository read path (FlowgridRepository.loadSnapshot), FlowgridDatabase gateway, nine-store schema, seeded singletons, persistence barrel, Dexie core-member-collision workaround (db.table()).
provides:
  - JsonArchive readonly envelope (archiveVersion 1, exportedAt, nine collections) — the round-trip target for plan 02-03 import
  - ARCHIVE_VERSION = 1 constant (fourth version axis — archive envelope shape)
  - exportJson(db) producing a complete portable archive including the operation log (D-09: log never stripped)
  - exportSessionCsv(db) producing the exact ten D-10 columns with joined cell names
  - csvEscape(field) RFC-4180 inline escaper (no dependency)
  - VER-03 export tier (4 new tests)
affects: [02-durable-local-first-spine (plan 03 import round-trips JsonArchive), 03-playable-generator-flowgrid (UI export buttons)]

# Tech tracking
tech-stack:
  added: []  # no new deps; reuse 02-01's dexie via FlowgridDatabase
  patterns:
    - Exporters take FlowgridDatabase directly (mirror repository constructor; read-only Promise.all of stores)
    - archiveVersion is a FOURTH independent version axis (envelope shape), distinct from Dexie schema / ContentVersion / payloadVersion (D-08)
    - Persistence-only ambient-time exception: exportJson calls new Date().toISOString() for exportedAt (same exception as seeding.ts; simulation still never uses ambient time)
    - RFC-4180 escaping is an inline helper (csvEscape) — no CSV dependency for 10 columns
    - core store accessed via db.table<CoreRecord,CoreId>('core') in exporters too (Dexie core:DBCore collision from 02-01 carries forward)

key-files:
  created:
    - src/persistence/export-json.ts
    - src/persistence/export-csv.ts
    - tests/persistence/export-json.test.ts
    - tests/persistence/export-csv.test.ts
  modified:
    - src/persistence/index.ts  # barrel re-exports export-json + export-csv

key-decisions:
  - "ARCHIVE_VERSION = 1 is exported as a literal const and as the JsonArchive.archiveVersion field type — it is the fourth independent version axis (envelope shape), never unified with Dexie schema version, ContentVersion, or SyncOperation.payloadVersion (D-08)."
  - "exportJson reads all nine stores with Promise.all and surfaces a missing singleton as a thrown error (mirrors loadSnapshot's corrupt-state contract); operations and sessions are NEVER stripped or redacted (D-09)."
  - "durationMinutes uses Math.floor(durationSeconds / 60) for consistency with focusToXp in content/formulas.ts (the plan explicitly chose floor over round)."
  - "CSV rows are joined with CRLF and the string is terminated with a trailing CRLF (RFC 4180); csvEscape wraps fields containing comma, double-quote, CR, or LF and doubles internal quotes."
  - "cellName is always joined from the cells store — a raw cellId is never emitted; a missing cell maps to '(unknown)' (D-10: cellId alone is opaque)."
  - "Map-derived collections (cells/moduleInstances/routes) are compared order-independently in tests because IndexedDB returns by primary-key (lexical) order while Map.values() yields insertion order."

patterns-established:
  - "Exporters are standalone persistence functions taking FlowgridDatabase; they never invoke simulation rules or import zod (zod is the 02-03 import-only boundary)."
  - "Header comment block on every persistence module cites the governing decision (D-08/D-09/D-10) and the four-version-axes invariant."

requirements-completed:
  - DATA-04
  - DATA-05
  - VER-03

# Metrics
duration: 6min
completed: 2026-06-23
status: complete
---

# Phase 2 Plan 02: Ownership-Out Export Summary

**JSON full-state archive (all nine collections plus the operation log, archiveVersion 1) and RFC-4180 CSV session export with cell-name join, floored minutes, and escaping — built on the 02-01 repository read path.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-23T20:33:30Z
- **Completed:** 2026-06-23T20:39:31Z
- **Tasks:** 3
- **Files modified/created:** 5 (2 source, 1 barrel, 2 test)
- **Tests:** 62 total pass (58 from 02-01 + 4 new export tests across 2 files)

## Accomplishments

- `JsonArchive` readonly envelope with `archiveVersion: 1` literal, `exportedAt` ISO timestamp, and all nine entity collections as readonly arrays (Maps flattened for JSON serialization). `ARCHIVE_VERSION = 1` is exported as the fourth version axis (D-08).
- `exportJson(db)` reads all nine stores in parallel via `Promise.all`, accesses the `core` store through `db.table<CoreRecord,CoreId>('core')` (Dexie member collision carries forward from 02-01), and never strips or redacts the operation log or session history (D-09).
- `exportSessionCsv(db)` emits the exact ten D-10 columns, sorts sessions by `startedAt` ascending, joins `cellName` from the cells store (missing → `'(unknown)'`, never a raw cellId), floors `durationSeconds / 60` to minutes, slices dates to `YYYY-MM-DD`, renders booleans as `'true'`/`'false'`, joins rows with `\r\n`, and terminates with a trailing `\r\n`.
- `csvEscape(field)` is a dependency-free RFC-4180 escaper: wraps fields containing comma, double-quote, CR, or LF in double quotes and doubles internal quotes.
- Persistence barrel re-exports both exporter modules without disturbing the 02-01 surface (cleanly additive — 02-03 can extend further).
- VER-03 export tier green: JSON archive shape (archiveVersion 1, ISO exportedAt, every collection deep-equal to an applied focus session's nextState, `operations.length === 1`, `sessions.length === 1`) and CSV mapping (exact header, `durationMinutes === 25`, quoted `"Starter, Cell"`, YYYY-MM-DD dates, booleans, missing-cell → `(unknown)`, csvEscape for comma/quote/newline/CR/plain).
- Boundary honored: export modules import record types type-only from `../domain/index.js` and `FlowgridDatabase` from `./database.js` — no `zod`, no `../simulation` runtime import (eslint boundary rule passes).

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement JSON full-state archive export** — `6840407` (feat)
2. **Task 2: Implement CSV session export with cell-name join and escaping** — `9f328da` (feat)
3. **Task 3: Export VER-03 tests — JSON archive shape, CSV mapping, and round-trip** — `e840c1e` (test)

## Files Created/Modified

- `src/persistence/export-json.ts` — `ARCHIVE_VERSION = 1`, `JsonArchive` interface (11 fields), `exportJson(db)` (parallel read of all nine stores, operation log preserved).
- `src/persistence/export-csv.ts` — `csvEscape(field)` (RFC-4180), `exportSessionCsv(db)` (ten D-10 columns, cellName join, floored minutes, CRLF).
- `src/persistence/index.ts` — barrel now re-exports `./export-json.js` and `./export-csv.js` (additive; 02-01 exports untouched).
- `tests/persistence/export-json.test.ts` — drives an applied `complete_focus_session` through `applyResult`, exports, asserts envelope + per-collection deep-equality + non-stripped operation log.
- `tests/persistence/export-csv.test.ts` — comma-named cell + 1500s session, asserts header/minutes/quoted-name/dates/booleans, plus missing-cell join and direct `csvEscape` unit assertions; includes a minimal RFC-4180 row parser for wire-format assertions.

## Decisions Made

- **`ARCHIVE_VERSION` exported (not module-local like `PAYLOAD_VERSION`):** export needs the literal discoverable so importers/tests can assert the envelope version explicitly; still a `const` in the style of `operation-events.ts:15`, just exported.
- **Parallel store reads:** `exportJson` and `exportSessionCsv` read their stores via `Promise.all` (export is a read-only bulk fetch; no transaction needed — Dexie allows concurrent reads). `exportSessionCsv` reads only sessions + cells (the plan's minimum); `exportJson` reads all nine.
- **Floor over round for minutes:** the plan and RESEARCH §5.2 pick `Math.floor(durationSeconds / 60)` to match `focusToXp` in `formulas.ts`; a 1500s session yields exactly 25 minutes (verified by test).
- **Test comparison is order-independent for map-derived collections:** IndexedDB `toArray()` returns by primary-key (lexical) order; `Map.values()` yields insertion order. Both sides are sorted by `id` before `toEqual` so the assertion tests record-set equality, not DB retrieval order.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion was order-fragile for map-derived collections**
- **Found during:** Task 3 (export-json.test.ts)
- **Issue:** The plan's suggested comparison `expect(archive.moduleInstances).toEqual([...result.nextState.moduleInstances.values()])` is order-sensitive. IndexedDB returns records by primary-key (lexical) order (`bloom`, `charge-core`, `generator`, `output`) while `Map.values()` yields insertion order from `createStarterFlowgridState` (`generator`, `charge-core`, `output`, `bloom`). The archive contains the correct records; only the iteration order differs.
- **Fix:** Added a `sortedById<T extends { readonly id: string }>()` helper and compare `sortedById(archive.cells/moduleInstances/routes)` against `sortedById([...nextState.X.values()])`. Singletons and append-only arrays (sessions/operations/forgeHistory) preserve insertion order on both sides and are compared directly.
- **Files modified:** tests/persistence/export-json.test.ts
- **Verification:** `npm run test -- --run tests/persistence/export-json.test.ts` exits 0; deep-equality passes for all nine collections; the assertion now tests the actual invariant (same record set) rather than DB retrieval order.
- **Committed in:** e840c1e (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix strengthens the test (it now asserts record-set equivalence regardless of IndexedDB retrieval order) without weakening any acceptance criterion. No scope creep; the production code is unchanged.

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

None — no external service configuration required. Exporters reuse the existing Dexie dependency from plan 02-01.

## Next Phase Readiness

- DATA-04 (full local state as JSON archive with `archiveVersion === 1`, including the operation log) and DATA-05 (sessions as a human-readable CSV with the exact ten D-10 columns, joined cell names, minute durations, RFC-4180 escaping) are complete.
- VER-03 export tier is green (JSON archive shape, CSV mapping/escaping, csvEscape unit coverage, missing-cell join).
- Plan 02-03 can build import/restore validation + the migration harness on top of the `JsonArchive` shape and the 02-01 repository; a `validateArchive` (Zod + Phase 1 invariants) and `importArchive(archive, 'replace'|'merge')` will round-trip what `exportJson` produces.
- Phase 3 (Playable Generator Flowgrid) can wire "Export JSON" and "Export CSV" buttons directly to `exportJson(db)` / `exportSessionCsv(db)`.

## Self-Check: PASSED

- All 4 created files verified present on disk.
- All 3 task commits (6840407, 9f328da, e840c1e) verified in git log.
- Plan-level verification re-run green: `npm run typecheck`, `npm run lint`, and `npm run test -- --run` (62 tests across 16 files) all exit 0.

---
*Phase: 02-durable-local-first-spine*
*Completed: 2026-06-23*
