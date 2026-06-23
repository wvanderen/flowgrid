---
phase: 03-playable-generator-flowgrid
plan: 01
subsystem: simulation
tags: [typescript, dexie, zod, deterministic-simulation, incremental-game, cell-crud, session-lifecycle]

# Dependency graph
requires:
  - phase: 02-durable-local-first-spine
    provides: Dexie v1 schema, Zod import boundary, repository diff-write path
provides:
  - CellRecord extended with color/icon/archivedAt/activeSessionStartedAt (D-10)
  - Dexie v1->v2 migration with extracted upgradeCellsV1ToV2 transform
  - Six new SimulationCommand variants + exhaustive engine/operation-events dispatch
  - create_cell instantiates four starter modules + Output route at 100% (CELL-05)
  - edit/archive/unarchive identity-only mutations (CELL-03/CELL-04, D-11/D-12)
  - start/cancel focus session lifecycle (SESS-01/SESS-03, D-05/D-07)
  - day-rollover reconciliation (D-13/D-14/D-16) with Momentum decay + activation-monotonic preservation
  - Bloom Momentum +1 (SIM-06, D-14)
  - Activation +% Current bonus in complete_focus_session (SIM-07, D-15)
affects:
  - 03-02-app-shell-renderer (consumes new command types + CellRecord fields)
  - 03-03-cell-board-session-ui (dispatches the six new commands; reads activeSessionStartedAt)
  - 04-core-alternation-rejuvenation (extends Momentum / Activation economy)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extracted upgrade transform (upgradeCellsV1ToV2) testable without a live IndexedDB"
    - "Identity-only command spread: economy fields structurally impossible to set via edit_cell"
    - "cancel_focus_session: applied status with empty operations/sessions/economyEvents (D-07)"
    - "Pure deriveLocalDate(now, boundary) + reconcileDayRollover(snapshot, env) — no side effects"

key-files:
  created:
    - src/simulation/systems/day-rollover.ts
    - src/simulation/commands/create-cell.ts
    - src/simulation/commands/edit-cell.ts
    - src/simulation/commands/archive-cell.ts
    - src/simulation/commands/unarchive-cell.ts
    - src/simulation/commands/start-focus-session.ts
    - src/simulation/commands/cancel-focus-session.ts
    - tests/simulation/day-rollover.test.ts
    - tests/simulation/activation-bonus.test.ts
    - tests/simulation/create-cell.test.ts
    - tests/simulation/cell-crud.test.ts
    - tests/simulation/session-lifecycle.test.ts
  modified:
    - src/domain/records.ts
    - src/domain/result.ts
    - src/content/formulas.ts
    - src/content/index.ts
    - src/content/starter-state.ts
    - src/persistence/database.ts
    - src/persistence/validation-schemas.ts
    - src/simulation/engine.ts
    - src/simulation/operation-events.ts
    - src/simulation/commands/complete-focus-session.ts
    - src/simulation/systems/bloom.ts
    - tests/persistence/export-csv.test.ts
    - tests/persistence/migration-harness.test.ts

key-decisions:
  - "Stored activeSessionStartedAt on the Cell record (D-05 field-on-Cell choice) rather than a separate ActiveSession singleton; simplifies one-active-session invariant to a single scan over cells"
  - "Generated starter module/route IDs inside create_cell using the existing `${cellId}:module-instance:${kind}` / `${cellId}:slot:${kind}` / `${cellId}:route:output-to-core` convention so downstream UI can predict IDs without an extra allocation step"
  - "Extracted upgradeCellsV1ToV2 as a named pure export from database.ts so the migration harness can exercise it without spinning up IndexedDB"
  - "Implemented the start_focus_session one-active invariant as a scan over ALL cells (not just the target) so re-targeting the same cell also rejects"

patterns-established:
  - "Identity-only command spread: edit/archive/unarchive override only identity fields; economy fields flow through the spread unchanged (D-11 defense-in-depth)"
  - "Applied-with-no-operations result shape: cancel_focus_session returns status 'applied' with empty operations/sessions/economyEvents arrays (D-07 / Phase 2 D-02 diff-write contract)"
  - "Pure rollover helpers: deriveLocalDate and reconcileDayRollover take value-in / value-out with no ambient time or randomness (D-16 + Phase 1 D-08 replay safety)"
  - "Activation-monotonic preservation: day-rollover explicitly skips cell.activation; tests assert the invariant (Pitfall 7)"

requirements-completed:
  - CELL-05
  - SIM-01
  - SIM-02
  - SIM-03
  - SIM-04
  - SIM-05
  - SIM-06
  - SIM-07
  - SESS-02
  - SESS-03

# Metrics
duration: 13min
completed: 2026-06-23
status: complete
---

# Phase 3 Plan 1: Playable Generator Flowgrid — Simulation Truth Layer Summary

**Pure-TypeScript game logic for Cell CRUD, focus-session lifecycle, daily rollover, Bloom Momentum, and Activation bonus — the simulation truth layer that Plans 03-02 and 03-03 render and dispatch.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-06-23T18:17Z (baseline verification)
- **Completed:** 2026-06-23T18:30Z
- **Tasks:** 2
- **Files modified:** 26 (18 source + 5 tests + 3 test extensions)

## Accomplishments
- Extended `CellRecord` with four D-10 fields (`color`, `icon`, `archivedAt`, `activeSessionStartedAt`) and shipped a real Dexie v1→v2 migration that defaults them on existing data, plus a matching Zod cellSchema update at the import boundary.
- Added six new `SimulationCommand` variants with exhaustive engine and operation-events dispatch (no `default` clause — the discriminated union is the compile-time safety net, Pitfall 5).
- `create_cell` instantiates a Cell plus the four starter ModuleInstances and an Output route to the Core at 100%, with name/color/dailyTargetSeconds validation (CELL-05, D-09).
- `edit_cell` mutates identity fields only — economy fields are structurally impossible to inject (D-11); `archive_cell` / `unarchive_cell` flip `archivedAt` with correct state guards (D-12).
- `start_focus_session` sets the active-session marker with a one-active-session-across-the-Flowgrid invariant (D-05); `cancel_focus_session` returns `applied` while writing NOTHING durable (operations / sessions / economyEvents all empty — D-07 / Pitfall 6).
- `reconcileDayRollover` resets stale daily milestone progress and applies mild Momentum decay with an explicit floor at 0 and explicit preservation of the monotonic `activation` counter (Pitfall 7).
- `deriveLocalDate(now, localDayBoundary)` computes the effective local date from a boundary offset (D-16); `applyBloom` now increments `momentum` alongside `activation` (D-14 / SIM-06); `complete_focus_session` applies the Activation +% Current bonus via `Math.floor` integer discipline while leaving XP untouched (D-15 / SIM-07).
- 49 new tests covering every command and system; the full suite (122 tests) passes with zero regressions and `npx tsc --noEmit` is clean.

## Task Commits

Each task was committed atomically following TDD RED → GREEN discipline:

1. **Task 1 RED: failing tests for day-rollover + activation bonus** — `4af9f9f` (test)
2. **Task 1 GREEN: CellRecord D-10, Dexie v2 migration, day-rollover, Bloom Momentum, Activation bonus** — `1e4d67a` (feat)
3. **Task 2 RED: failing tests for cell CRUD + session lifecycle** — `a27d126` (test)
4. **Task 2 GREEN: six cell/session commands with exhaustive dispatch** — `bdf6911` (feat)

_TDD note: both tasks completed RED → GREEN with zero cycles of REFACTOR — the code follows the existing `set-core-allocation.ts` / `complete-focus-session.ts` skeletons cleanly and needed no cleanup._

## Files Created/Modified

**Source (created)**
- `src/simulation/systems/day-rollover.ts` — `deriveLocalDate` + `reconcileDayRollover` pure functions (D-13/D-14/D-16, Pitfall 7).
- `src/simulation/commands/create-cell.ts` — Cell + 4 starter modules + Output route at 100% (CELL-05, D-09).
- `src/simulation/commands/edit-cell.ts` — identity-only mutation (D-11).
- `src/simulation/commands/archive-cell.ts` — flips `archivedAt` to `env.now` (D-12).
- `src/simulation/commands/unarchive-cell.ts` — clears `archivedAt` to null (D-12).
- `src/simulation/commands/start-focus-session.ts` — sets `activeSessionStartedAt`, one-active invariant (D-05).
- `src/simulation/commands/cancel-focus-session.ts` — clears marker, writes nothing durable (D-07).

**Source (modified)**
- `src/domain/records.ts` — CellRecord extended with four readonly fields.
- `src/domain/result.ts` — six new command interfaces + extended `SimulationCommand` union.
- `src/content/formulas.ts` — `ACTIVATION_CURRENT_BONUS_PERCENT = 10`.
- `src/content/index.ts` — re-export the new constant.
- `src/content/starter-state.ts` — starter cell carries the four D-10 defaults.
- `src/persistence/database.ts` — `this.version(2)` migration + extracted `upgradeCellsV1ToV2`.
- `src/persistence/validation-schemas.ts` — `cellSchema` accepts the four new fields.
- `src/simulation/engine.ts` — six new exhaustive cases, still no `default`.
- `src/simulation/operation-events.ts` — six new cases in both entityType / entityId switches.
- `src/simulation/commands/complete-focus-session.ts` — Activation +% Current bonus (D-15).
- `src/simulation/systems/bloom.ts` — Momentum +1 on Bloom fire (D-14/SIM-06).

**Tests (created)**
- `tests/simulation/day-rollover.test.ts` — 12 tests (D-16 boundary math, stale reset, Momentum decay + floor, activation preservation).
- `tests/simulation/activation-bonus.test.ts` — 5 tests (D-15 Current bonus, XP untouched, integer discipline, Bloom Momentum, replay).
- `tests/simulation/create-cell.test.ts` — 6 tests (happy path + four rejection cases + replay).
- `tests/simulation/cell-crud.test.ts` — 9 tests (edit identity-only + economy preservation, archive/unarchive + state guards, replay).
- `tests/simulation/session-lifecycle.test.ts` — 9 tests (start invariants, cancel writes-nothing-durable, replay).

**Tests (modified)**
- `tests/persistence/export-csv.test.ts` — cell fixture gained the four D-10 fields.
- `tests/persistence/migration-harness.test.ts` — registered two real v1→v2 cell fixtures against `upgradeCellsV1ToV2`.

## Decisions Made
- **D-05 storage choice** — stored `activeSessionStartedAt` directly on the Cell record (the field-on-Cell option flagged in RESEARCH A6 / PATTERNS C1). This makes the one-active-session invariant a single scan over `state.cells` rather than a separate ActiveSession singleton lookup.
- **ID generation inside create_cell** — reused the `${cellId}:module-instance:${kind}` / `${cellId}:slot:${kind}` / `${cellId}:route:output-to-core` convention from `starter-state.ts` so the IDs are predictable for downstream UI without a separate allocation step. The command interface only carries the user-supplied identity fields.
- **Extracted migration transform** — lifted the v2 `modify` callback out as `upgradeCellsV1ToV2(state)` + a `CELL_V2_DEFAULTS` const so the migration harness can exercise it without a live IndexedDB connection (PATTERNS C8).
- **One-active-session scan** — `start_focus_session` scans ALL cells (not just the target) for a non-null `activeSessionStartedAt`, so re-targeting the already-active cell also rejects. Keeps the invariant airtight.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration harness `expect.objectContaining` at module top level**
- **Found during:** Task 1 GREEN (migration-harness test run)
- **Issue:** First draft of the second migration fixture used `expected: expect.objectContaining({...})` at the module top level. The test file only imports `describe` from vitest, so `expect` is not defined at module-evaluation time, and vitest threw `ReferenceError: expect is not defined` while collecting the file.
- **Fix:** Replaced `expect.objectContaining` with a fully-spelled-out literal expected object that the harness's `toEqual` can deep-compare against.
- **Files modified:** `tests/persistence/migration-harness.test.ts`
- **Verification:** `npx vitest run tests/persistence/migration-harness.test.ts` — 4 tests pass.
- **Committed in:** `1e4d67a` (part of Task 1 GREEN commit).

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial test-shape fix, no scope change, no behavior change. Plan executed otherwise exactly as written.

## Issues Encountered
None beyond the single auto-fix above.

## User Setup Required
None — no external services, no env vars, no manual configuration. This plan is pure TypeScript simulation + a schema migration; the runtime DB upgrade fires automatically on next open.

## Next Phase Readiness
- All game logic that Plans 03-02 (app shell + renderer) and 03-03 (Cell Board + session UI) consume now exists, is typed, and is tested.
- Every new command is exactly replayable (D-08) — verified via `expectReplayEqual` in every test file — so the app shell can dispatch commands from React with no determinism surprises.
- The Dexie v2 migration means an existing v1 install will transparently gain the four new Cell fields on next open; `upgradeCellsV1ToV2` is covered by the migration harness.
- `deriveLocalDate` + `reconcileDayRollover` are ready for the app shell to call after `repository.loadSnapshot()` and before first UI render (Plan 03-02 env.ts wiring).

## TDD Gate Compliance

Both tasks shipped a clean RED → GREEN commit sequence. Git log verification:

```
bdf6911 feat(03-01): ... six cell/session commands ...   (GREEN, Task 2)
a27d126 test(03-01): ... cell CRUD + session lifecycle   (RED,   Task 2)
1e4d67a feat(03-01): ... CellRecord + Dexie v2 + ...     (GREEN, Task 1)
4af9f9f test(03-01): ... day-rollover + activation       (RED,   Task 1)
```

- RED commits precede their GREEN counterparts in both tasks.
- RED tests failed for the intended reasons (missing module / missing implementation / unmet assertion), not for import or syntax errors.
- GREEN implementations are minimal — they reuse the existing `set-core-allocation.ts` / `complete-focus-session.ts` skeletons; no premature optimization.
- No REFACTOR commits — the code followed existing patterns cleanly and needed no cleanup.

## Self-Check: PASSED

Created files (verified on disk):
- FOUND: src/simulation/systems/day-rollover.ts
- FOUND: src/simulation/commands/create-cell.ts
- FOUND: src/simulation/commands/edit-cell.ts
- FOUND: src/simulation/commands/archive-cell.ts
- FOUND: src/simulation/commands/unarchive-cell.ts
- FOUND: src/simulation/commands/start-focus-session.ts
- FOUND: src/simulation/commands/cancel-focus-session.ts
- FOUND: tests/simulation/day-rollover.test.ts
- FOUND: tests/simulation/activation-bonus.test.ts
- FOUND: tests/simulation/create-cell.test.ts
- FOUND: tests/simulation/cell-crud.test.ts
- FOUND: tests/simulation/session-lifecycle.test.ts

Task commits (verified in git log):
- FOUND: 4af9f9f (test 03-01 RED Task 1)
- FOUND: 1e4d67a (feat 03-01 GREEN Task 1)
- FOUND: a27d126 (test 03-01 RED Task 2)
- FOUND: bdf6911 (feat 03-01 GREEN Task 2)

Plan-level verification:
- PASS: `npx tsc --noEmit` (zero errors, exhaustive switch guarantees all command cases handled)
- PASS: `npx vitest run` — 122 tests pass across `tests/simulation/` and `tests/persistence/` (49 new + 73 existing, zero regressions)
- PASS: every new command has a replay assertion (`expectReplayEqual`)
- PASS: every applied result has an invariant assertion (`expectValidState`)

---
*Phase: 03-playable-generator-flowgrid*
*Completed: 2026-06-23*
