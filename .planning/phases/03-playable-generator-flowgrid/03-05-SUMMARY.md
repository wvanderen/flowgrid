---
phase: 03-playable-generator-flowgrid
plan: 05
subsystem: simulation
tags: [gap-closure, simulation, uat, react, pixi, zustand, accessibility, regression-test]

# Dependency graph
requires:
  - phase: 03-playable-generator-flowgrid
    provides: Plan 03-01 complete-focus-session command + economy/visual event pipeline
  - phase: 03-playable-generator-flowgrid
    provides: Plan 03-02 dispatch path, flowgrid-store, and Pixi scene builder
  - phase: 03-playable-generator-flowgrid
    provides: Plan 03-03 CellBoard + GeneratorTile UI and cell-board.test.tsx harness
  - phase: 03-playable-generator-flowgrid
    provides: Plan 03-04 dark-theme styling vocabulary used by GeneratorTile and CellBoard
provides:
  - complete_focus_session now clears cell.activeSessionStartedAt so the session visually ends after Finish (closes UAT test 15 root cause 3a)
  - Rejected dispatches populate a new lastRejection store field; GeneratorTile disables Start with an explanatory message when another Cell holds the active session (closes UAT test 5)
  - Cell Board happy path now has a visible in-app "Return to Flowgrid" navigation affordance (closes UAT test 15 root cause 3b)
  - Pixi Flowgrid scene container is centered in the canvas viewport so the Core sits at canvas center and ring hexes do not clip (closes UAT test 2 and UAT test 15 root cause 3c)
  - A new regression test ('complete_focus_session: clears activeSessionStartedAt so the session visually ends') covering the case the original session-lifecycle suite missed
affects:
  - 03-UAT (tests 2, 5, 15 are now closure-ready for the human re-smoke to flip issue → pass)
  - 04-core-alternation-rejuvenation (will extend GeneratorTile and complete-focus-session; the activeSessionStartedAt clear and lastRejection field are now part of the contract)
  - 06-hardening-accessibility-trust (audits the disabled-button semantics, aria-live regions, and semantic-markup integrity preserved here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derived session-state clear: complete_focus_session sets activeSessionStartedAt: null on the post-focus Cell (mirroring cancel-focus-session.ts:75); the operation payload intentionally excludes the marker — the clear is a deterministic side effect of the command and reproduces on replay"
    - "User-facing rejection channel: lastRejection (string | null) on FlowgridState, parallel to lastError (persistence failures) — dispatch() writes the first validationIssue.message on rejection, clears on every successful dispatch + in hydrateStoreForTests + initApp"
    - "Affordance over silent rejection: when the one-active-session invariant would reject Start, GeneratorTile renders the HTML disabled attribute on the button (announced AND unclickable) plus an aria-live 'Another focus session is active' message, rather than an enabled button that silently no-ops"
    - "Container-level viewport centering: setting container.x/y to app.screen.width/2 and app.screen.height/2 right after the scene container is labeled — Core stays at container origin (axialToPixel {0,0} → {0,0}) and ring hexes translate as a group; no resize listener needed (scene rebuilds on snapshot change)"

key-files:
  created: []
  modified:
    - src/simulation/commands/complete-focus-session.ts
    - src/app/store/flowgrid-store.ts
    - src/app/store/dispatch.ts
    - src/ui/cell-board/GeneratorTile.tsx
    - src/ui/cell-board/CellBoard.tsx
    - src/render/flowgrid/scene.ts
    - tests/simulation/session-lifecycle.test.ts

key-decisions:
  - "Fixed Gap A in the simulation layer (not the UI): complete_focus_session clears activeSessionStartedAt directly so deriveActiveSession() naturally returns null after Finish — preserves the architecture rule that the simulation owns truth and deterministic replay stays byte-identical for a given command+env"
  - "Used the HTML disabled attribute (not a no-op onClick) on the GeneratorTile Start button when another Cell is active — correctly announced AND unclickable, satisfying the plan's accessibility-semantics rule"
  - "lastRejection is a separate channel from lastError: rejection messages come from the simulation's validationIssues (expected user-facing flow); lastError stays reserved for typed PersistenceErrors (infrastructure failures)"
  - "Did NOT update 03-UAT.md result fields: matching Plan 03-04's deferral convention, the human re-smoke owns the issue → pass flip; this SUMMARY records closure-ready status instead"
  - "Task 4 centering uses container translation only — no scale, no resize listener, no changes to axialToPixel/buildRingSlots/route drawing. The scene rebuilds on snapshot change (adapter contract) and resizeTo handles element resizing"

patterns-established:
  - "Derived session-state clear idiom: every command that ends a focus session (cancel OR complete) MUST set activeSessionStartedAt: null on the target Cell — cancel-focus-session.ts:75 and complete-focus-session.ts:181 are now symmetric"
  - "Rejection surfacing contract: dispatch() NEVER silently returns null on a rejected result — it writes a user-facing message to lastRejection first; persistence failures continue to go to lastError"
  - "Disabled-affordance contract: when the simulation would reject an action because of an invariant (one-active-session, etc.), the UI disables the control with an aria-live explanation instead of presenting an enabled control that silently fails"
  - "Scene container centering: buildFlowgridScene always positions the Flowgrid-owned container at app.screen center; child coordinates remain container-relative (Core at origin), so the cluster is translation-invariant"

requirements-completed:
  - SESS-02
  - SESS-03
  - UI-01
  - UI-05

# Metrics
duration: 10min
completed: 2026-06-24
status: complete
---

# Phase 3 Plan 5: UAT Gap-Closure (Session-Clear, Rejection UX, Home Nav, Scene Centering) Summary

**Four targeted root-cause fixes that close the three diagnosed UAT gaps protecting the first loop: Finish now visually ends the session, Start disables itself on non-active Cells, Cell Board has an in-app Home link, and the Flowgrid scene is centered in the canvas.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-23T22:15:32Z (baseline vitest 170/170)
- **Completed:** 2026-06-23T22:22:05Z (Task 4 commit)
- **Tasks:** 4/4
- **Files modified:** 7 (6 source + 1 test)

## Accomplishments

- **Gap A (simulation, MAJOR):** `complete_focus_session` now clears `activeSessionStartedAt` on the post-focus Cell. `deriveActiveSession()` therefore stops projecting the session after Finish, and the GeneratorTile returns to the idle Start state instead of staying stuck in the in-progress UI.
- **Gap B (UI/store, MINOR):** Added `lastRejection` store field. `dispatch()` writes a user-facing message on rejection (was a silent `return null`) and clears it on every successful dispatch. GeneratorTile renders Start with the HTML `disabled` attribute + an `aria-live` "Another focus session is active" message when another Cell holds the session — no more silent-rejection UX.
- **Gap C (UI, MAJOR):** Cell Board happy path now has a `<Link to="/">Return to Flowgrid</Link>` as the first child of its section, replicating the affordance the not-found branches already had. Users no longer need browser-back/URL edits to leave a Cell Board.
- **Gap D (render, COSMETIC):** The Flowgrid scene container is translated to canvas center (`app.screen.width/2`, `app.screen.height/2`). The Core sits at viewport center and ring hexes radiate symmetrically around it — no more top-left clipping.
- **Regression coverage:** Added `'complete_focus_session: clears activeSessionStartedAt so the session visually ends'` to `tests/simulation/session-lifecycle.test.ts` — the case the original lifecycle suite missed (it covered start-sets-marker and cancel-clears-marker but never complete-clears-marker).

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix the simulation — complete_focus_session clears activeSessionStartedAt (Gap A)** — `c76ac27` (fix, includes the regression test in the same commit)
2. **Task 2: Surface rejected dispatches + disable Start when another session is active (Gap B)** — `0d8207b` (feat)
3. **Task 3: Add Home navigation to the Cell Board happy path (Gap C)** — `b51bf54` (feat)
4. **Task 4: Center the Flowgrid scene in the canvas viewport (Gap D)** — `dbbea8c` (fix)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified

- `src/simulation/commands/complete-focus-session.ts` — Added `activeSessionStartedAt: null` to the `cellAfterFocus` construction (the one-line state fix; economy math, operation payload, economy/visual events, bloom, activation, and routing untouched)
- `tests/simulation/session-lifecycle.test.ts` — Added `CompleteFocusSessionCommand` to the type import and a new regression test asserting `result.status === 'applied'`, `cell.activeSessionStartedAt === null`, sessions grew by 1, and one operation was recorded (uses `durationSeconds=3600`, `endedAt=NOW`, `startedAt='2026-01-04T13:00:00.000Z'` mirroring the cancel test setup)
- `src/app/store/flowgrid-store.ts` — Added `readonly lastRejection: string | null` to `FlowgridState` and initialized it to `null` in the `createStore` initializer
- `src/app/store/dispatch.ts` — Rejection branch now writes `lastRejection` (was a bare `return null`); success path, `hydrateStoreForTests`, and `initApp` all clear `lastRejection: null` so the field is never undefined
- `src/ui/cell-board/GeneratorTile.tsx` — Added `anotherCellActive` branch that renders Start with the HTML `disabled` attribute + `aria-describedby` + an `aria-live="polite"` "Another focus session is active" message; optionally surfaces `lastRejection` inline near Start; preserved all existing styling and ARIA semantics
- `src/ui/cell-board/CellBoard.tsx` — Inserted `<Link to="/">Return to Flowgrid</Link>` as the first child of the happy-path section (before the `<h1>`); identical className + text to the not-found branches; `Link` was already imported
- `src/render/flowgrid/scene.ts` — Added `container.x = app.screen.width / 2; container.y = app.screen.height / 2;` right after `container.label = FLOWGRID_SCENE_LABEL`; no other changes (axialToPixel, buildRingSlots, hex polygon, route drawing, Core hex, pointertap handlers, resize listener all untouched)

## Decisions Made

- **Fixed Gap A in the simulation, not the UI.** The plan's `<scope_rules>` mandated fixing the root cause. Patching `complete-focus-session.ts` keeps the architecture rule intact (simulation owns truth) and preserves deterministic replay byte-for-byte — the marker clear is a deterministic side effect of the command and reproduces on replay.
- **Used HTML `disabled` (not a no-op `onClick`) on the Start button.** Per the plan's accessibility rule, `disabled` is both announced to assistive tech AND unclickable. Paired with `aria-describedby` + an `aria-live="polite"` message for full perceivability.
- **Kept `lastRejection` separate from `lastError`.** The plan specified this: rejection messages are expected user-facing flow (simulation validationIssues); `lastError` stays reserved for typed PersistenceErrors (infrastructure failures). They clear independently.
- **Deferred the UAT result flips to the human re-smoke.** Matching Plan 03-04's convention, `03-UAT.md` result fields are NOT edited by the autonomous executor. Tests 2, 5, and 15 are closure-ready and noted here; the human re-smoke owns `issue → pass`.
- **No jsdom scene test for Task 4.** Per the plan's testing note, mocking Pixi internals for a `buildFlowgridScene` unit test is impractical. Verified via `tests/render/hex-layout.test.ts` (pure math unchanged) + successful `npm run build`; final visual confirmation deferred to the human visual smoke (UAT test 2).

## Deviations from Plan

None - plan executed exactly as written. All four tasks landed exactly as their `<action>` blocks specified, with no Rule 1-4 deviations triggered.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## UAT Closure-Ready Status

The three diagnosed UAT gaps move from `issue` → closure-ready. The human re-smoke owns the actual `issue → pass` flip in `03-UAT.md` (per Plan 03-04's deferral convention):

| UAT Test | Severity | Root Cause(s) | Fix Lands In | Closure-Ready? |
| -------- | -------- | -------------- | ------------ | -------------- |
| Test 2 (Open App — Flowgrid Home Renders) | cosmetic | Scene drawn at stage origin (0,0), hexes clip | Task 4 (`dbbea8c`) | YES — Core now at canvas center, ring hexes radiate symmetrically |
| Test 5 (Start Generator Session) | minor | Rejection swallowed; Start enabled on non-active Cells | Task 2 (`0d8207b`) | YES — Start now disabled with "Another focus session is active" message; lastRejection surfaces any race-condition rejection |
| Test 15 (Protected First Loop End-to-End) | major | (a) marker not cleared, (b) no Home link, (c) grid clipping | Tasks 1, 3, 4 (`c76ac27`, `b51bf54`, `dbbea8c`) | YES — Finish clears the marker (regression-tested), Home link visible at top of Cell Board, scene centered |

## Verification Gates (all green)

| Gate | Command | Result |
| ---- | ------- | ------ |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| ESLint | `npx eslint .` | exit 0 |
| Unit/Integration Tests | `npx vitest run` | 171/171 passed (170 baseline + 1 new Task 1 regression test) |
| Production Build | `npm run build` | exit 0 (chunk-size warning only, pre-existing, unrelated) |

The full vitest breakdown: `session-lifecycle.test.ts` now has 10 tests (was 9); `activation-bonus.test.ts`, `dispatch.test.ts`, `cell-board.test.tsx`, and `hex-layout.test.ts` all stay green at their prior counts.

## Next Phase Readiness

- The protected `open app → tap Cell → start session → finish → see rewards → return Home` loop is now mechanically complete; only the human visual smoke stands between Phase 3 and UAT pass.
- The `lastRejection` channel and the disabled-Start affordance are now part of the contract — Phase 4 (Core alternation / Rejuvenation) and Phase 6 (hardening) can rely on them.
- The scene-centering pattern (container translation, no resize listener) is the template for any future render-layer layout work.

## Self-Check: PASSED

- All 7 modified files exist on disk (6 source + 1 test).
- SUMMARY.md exists at `.planning/phases/03-playable-generator-flowgrid/03-05-SUMMARY.md`.
- All 4 task commits found in git log: `c76ac27`, `0d8207b`, `b51bf54`, `dbbea8c`.
- rg invariants confirmed:
  - `src/simulation/commands/complete-focus-session.ts` contains `activeSessionStartedAt: null,`
  - `src/app/store/flowgrid-store.ts` and `src/app/store/dispatch.ts` both reference `lastRejection`
  - `src/ui/cell-board/GeneratorTile.tsx` contains "Another focus session is active"
  - `src/ui/cell-board/CellBoard.tsx` contains three `<Link to="/">Return to Flowgrid</Link>` (two not-found + new happy-path)
  - `src/render/flowgrid/scene.ts` contains `container.x = app.screen.width / 2;`
- All four gates green at HEAD: tsc 0, eslint 0, vitest 171/171, build 0.

---
*Phase: 03-playable-generator-flowgrid*
*Completed: 2026-06-24*
