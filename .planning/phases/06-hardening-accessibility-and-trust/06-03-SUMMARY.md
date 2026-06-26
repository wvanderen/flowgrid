---
phase: 06-hardening-accessibility-and-trust
plan: 03
subsystem: ui
tags: [accessibility, a11y, semantic-html, keyboard-navigation, react-router, testing-library, user-event, happy-dom, ui-02, d-06]

# Dependency graph
requires:
  - phase: 06-hardening-accessibility-and-trust
    provides: 06-01 — Settings header link on FlowgridHome (the only shared-file dependency; both plans edit FlowgridHome.tsx)
  - phase: 03-playable-generator-flowgrid
    provides: FlowgridHome shell + activeCells derivation (line 66) + the existing flowgrid-home.test.tsx idiom this plan's test mirrors
provides:
  - Always-visible semantic Cell list on FlowgridHome (D-06) — <nav aria-label="Cells"> + sr-only <h2> + <ul> of React Router <Link to="/cells/:id"> mounted unconditionally alongside <FlowgridCanvas>
  - Keyboard + semantic a11y component test (tests/ui/cell-list-a11y.test.tsx) proving UI-02's keyboard/screen-reader path
  - UI-02 closure — every existing Cell is now openable from Home via keyboard only (Tab + Enter)
affects: [06-04-e2e-verification, VER-05-keyboard-a11y, D-07-webgl-fallback]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Always-visible semantic nav peer (D-06): <nav aria-label=\"Cells\"> renders ALONGSIDE (not instead of) <FlowgridCanvas>; the protected canvas tap stays primary, the list is the accessible peer and doubles as the no-WebGL fallback for D-07"
    - "Component a11y test idiom: mock only FlowgridCanvas (happy-dom has no WebGL), seed a multi-Cell snapshot by extending buildStarterSnapshot's cells Map, scope role queries with within(nav), assert userEvent.tab() focusability"

key-files:
  created:
    - tests/ui/cell-list-a11y.test.tsx
  modified:
    - src/ui/flowgrid-home/FlowgridHome.tsx

key-decisions:
  - "D-06 list is unconditional: mounted whenever activeCellCount > 0, never gated on WebGL failure — it is the accessible peer to the canvas tap and the no-WebGL fallback (D-07) in one surface"
  - "List reuses the existing activeCells derivation (FlowgridHome.tsx line 66) — no re-derivation; mounted inside the ready-state fragment beside <FlowgridCanvas> so both render side by side"
  - "Component test mocks only FlowgridCanvas (the sole happy-dom-incompatible child); ArchivedCellsFilter/CreateCellForm/ResumeSessionPrompt/RejuvenationResumePrompt are left unmocked because they render no links or are conditionally absent in the clean seeded snapshots"
  - "Five-test coverage shape: nav semantics, link count + hrefs, Tab-focusability, unconditional presence (D-06 peer), and graceful empty-state omission"

patterns-established:
  - "Semantic-list-as-accessible-peer: when a canvas/host interaction is pointer-only, add a React semantic list (<nav><ul><li><Link>) mounted unconditionally as the keyboard/screen-reader peer; never gate it on the renderer"
  - "Extending buildStarterSnapshot for N-cell UI tests: clone the starter CellRecord with new ids/names into the cells Map rather than a bespoke fixture (keeps the single starter factory canonical)"

requirements-completed: [UI-02]

# Metrics
duration: 6min
completed: 2026-06-26
status: complete
---

# Phase 6 Plan 3: Accessible Cell Navigation Summary

**Always-visible semantic Cell list on FlowgridHome (D-06) closing UI-02 — every existing Cell is now openable from Home via keyboard (Tab + Enter) — plus a keyboard + semantic a11y component test**

## Performance

- **Duration:** 6 min (335s)
- **Started:** 2026-06-26T18:57:25Z
- **Completed:** 2026-06-26T19:03:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments
- D-06 always-visible semantic Cell list shipped: `<nav aria-label="Cells">` with an `sr-only` `<h2>` (screen-reader-announced heading) + a `<ul>` mapping the existing `activeCells` derivation to `<li key={cell.id}><Link to="/cells/{id}">{name}</Link></li>`. Mounted unconditionally alongside `<FlowgridCanvas>` inside the ready-state fragment (both render side by side), never gated on WebGL failure.
- UI-02 closed: opening an existing Cell was the last canvas-only critical action (the canvas is `role="img"`, not keyboard-focusable). The semantic list is the accessible peer; the protected `open app → tap Cell → start session` canvas flow stays primary. Every critical action is now reachable via semantic non-canvas controls.
- Keyboard + semantic a11y component test (tests/ui/cell-list-a11y.test.tsx): 5 tests asserting the navigation landmark + accessible name "Cells", one focusable link per active Cell with correct `/cells/:id` hrefs, `userEvent.tab()` reaching a Cell link, unconditional presence alongside the canvas (D-06 peer), and graceful empty-state omission.
- The list doubles as the no-WebGL fallback for D-07 (Plan 06-02's `role="status"` note already references "the Cell list below").
- Full vitest suite green: 42 files / 242 tests (was 41 / 237 in 06-02; +5 from the new file). tsc + eslint green on both touched files.

## Task Commits

Each task was committed atomically:

1. **Task 1: Always-visible semantic Cell list on FlowgridHome (D-06)** - `d625408` (feat)
2. **Task 2: Keyboard + semantic a11y component test for the Cell list** - `02bcb83` (test)

**Plan metadata:** pending (docs: complete plan — committed last)

## Files Created/Modified
- `src/ui/flowgrid-home/FlowgridHome.tsx` - Added `<nav aria-label="Cells">` with sr-only `<h2>` + `<ul>` of React Router `<Link to="/cells/:id">` entries inside the ready-state fragment alongside `<FlowgridCanvas>` (closes UI-02 / D-06)
- `tests/ui/cell-list-a11y.test.tsx` (new) - 5 a11y tests: nav semantics, link count + hrefs, Tab-focusability, unconditional presence, empty-state omission

## Decisions Made
- **List placement:** mounted inside the existing `<>` ready-state fragment between the active-cell-count `<p>` and `<FlowgridCanvas>` so both render side by side. The plan allowed mounting "after the existing activeCellCount block, around line 135" — inside the fragment satisfies "alongside (not instead of)" literally and keeps the count summary + canvas + list grouped.
- **Styling:** `text-sm text-slate-300 underline transition hover:text-core focus-visible:ring-core` on the links, consistent with the header link styling (`text-slate-400 underline`) plus a focus ring for keyboard users. `sr-only` on the `<h2>` (Tailwind built-in) hides it visually while screen readers announce it.
- **No comments added:** the plan_summary constraint "No comments in code unless the plan explicitly requires one" was honored; the nav block is self-documenting via `aria-label` + `sr-only` heading.
- **Test mock scope:** only `FlowgridCanvas` is mocked (the sole happy-dom-incompatible child). `ArchivedCellsFilter` renders only a collapsed toggle button (no links) in the zero-archived-cell seeded snapshots, so it does not interfere with the scoped `within(nav)` role queries.
- **Multi-Cell seeding:** the starter snapshot factory produces exactly one Cell, so the test helper clones the starter `CellRecord` with new ids/names into the `cells` Map (pattern established: extend `buildStarterSnapshot` rather than a bespoke fixture).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] noUncheckedIndexedAccess type errors in the a11y test**
- **Found during:** Task 2 (plan-level `npx tsc --noEmit` gate after the per-task `vitest run` passed)
- **Issue:** The test helper and assertions indexed arrays (`[...state.cells.values()][0]`, `names[i]`, `links[i]`, `seeded[i]`, `[...state.cells.keys()][0]`) without guarding the `T | undefined` results that `noUncheckedIndexedAccess` produces. `vitest`/esbuild does not strict-typecheck so the suite passed, but `tsc` flagged 9 errors (TS18048/TS2322/TS2345) — same latent-type-error pattern as the 06-02 Rule-1 deviation.
- **Fix:** Replaced the index loop with a guarded `[0]` access (throw with a clear message if absent), switched the names loop to `for...of`, switched the assertion loop to `seeded.forEach` with an explicit `link === undefined` guard, and guarded the empty-state test's starter-id/starter lookups. Behavior unchanged; the guards are defensive (the starter snapshot always has exactly one cell).
- **Files modified:** tests/ui/cell-list-a11y.test.tsx
- **Verification:** `npx tsc --noEmit` exits 0; `npx eslint tests/ui/cell-list-a11y.test.tsx` exits 0; `npx vitest run tests/ui/cell-list-a11y.test.tsx` passes (5 tests); full suite 42 files / 242 tests green.
- **Committed in:** 02bcb83 (part of the Task 2 commit — the test file's first commit includes the guards)

---

**Total deviations:** 1 auto-fixed (1 Rule-1 bug — latent `noUncheckedIndexedAccess` type errors in the new test, surfaced by the plan-level tsc gate)
**Impact on plan:** Inline type-safety guards only; no scope creep, no behavior change. Reinforces the lesson from 06-02: the plan-level `tsc` gate is load-bearing because vitest/esbuild does not strict-typecheck.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UI-02 is closed: every existing Cell is openable from Home via keyboard only. The full critical-action set is reachable through semantic non-canvas controls.
- Plan 06-04 (E2E verification) can drive the semantic Cell list via Playwright `page.keyboard.press('Tab'/'Enter')` for VER-04 (full flow) and VER-05 (keyboard a11y path); the D-07 WebGL-fail note (Plan 06-02) already references "the Cell list below" which now exists.
- The component test does NOT exercise the real canvas (FlowgridCanvas is mocked under happy-dom); VER-05's axe-core scan + keyboard flow against the production build (Plan 06-04) is the browser-level confirmation.
- No blockers.

## Self-Check: PASSED
- tests/ui/cell-list-a11y.test.tsx exists on disk
- src/ui/flowgrid-home/FlowgridHome.tsx modified (nav + ul + Link block present)
- Both plan-task commits present: `d625408` (feat), `02bcb83` (test)
- `npx tsc --noEmit` exits 0
- `npx eslint src/ui/flowgrid-home/FlowgridHome.tsx tests/ui/cell-list-a11y.test.tsx` exits 0
- `npx vitest run` full suite: 42 files / 242 tests pass, exit 0
- All 4 Task 1 + 3 Task 2 acceptance criteria verified green
- nav aria-label="Cells" present (1 match); Link to `/cells/` pattern present (1 match); a11y test asserts Tab focusability (5 matches for user.tab()/reachedCellLink)

---
*Phase: 06-hardening-accessibility-and-trust*
*Completed: 2026-06-26*
