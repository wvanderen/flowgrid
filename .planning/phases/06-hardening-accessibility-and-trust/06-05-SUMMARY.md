---
phase: 06-hardening-accessibility-and-trust
plan: 05
subsystem: ui
tags: [pixijs, react, react-router, particles, reduce-motion, information-architecture]

# Dependency graph
requires:
  - phase: 06-02
    provides: animated Flowgrid particle pipeline (emitParticles, ParticleContainer, motion ticker) this plan patched
  - phase: 06-01
    provides: SettingsRecord.reduceMotion + SettingsPanel mount effect this plan revised
provides:
  - "Pure, pixi.js-free buildParticleAnchors module emitting container-local particle anchors"
  - "SettingsPanel session-only OS-preference pre-fill (no durable reduceMotion auto-persist)"
  - "Two regression tests (particle-anchors container-local; settings no mount-time update_settings)"
  - "DIAGNOSIS: canvas is structurally orphaned from event routes — particle visibility gap needs a layout pivot, not just coordinate math"
affects: [canvas-always-visible-layout-pivot, UI-03, VER-06, future-phase-planning]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure helper extraction with TYPE-ONLY pixi imports (loads under happy-dom without WebGL)"
    - "Session-only OS-preference suggestion (visual pre-fill) vs durable write"

key-files:
  created:
    - "src/ui/flowgrid-home/particle-anchors.ts"
    - "tests/ui/particle-anchors.test.ts"
    - "tests/ui/settings-reduce-motion.test.tsx"
  modified:
    - "src/ui/flowgrid-home/FlowgridCanvas.tsx"
    - "src/ui/settings/SettingsPanel.tsx"

key-decisions:
  - "Particle anchors are container-local (core {0,0}; cells/routes at hex-local positions) because ParticleContainer is a child of the centered scene container — adding the stage offset double-applies the centering transform"
  - "D-09 revised: OS prefers-reduced-motion now pre-fills the checkbox as a session-only suggestion; durable reduceMotion requires an explicit Save (the prior auto-persist trapped users who did not intend to durably commit)"
  - "BLOCKING CHECKPOINT FAILED: human visual smoke could not confirm animations because the canvas is not visible during the events that emit particles (sessions run on /cells/:id; Core on /core; Forge on /forge — each unmounts the canvas at /)"

patterns-established:
  - "Pure-function extraction for render math: keep pixi.js behind TYPE-ONLY imports so the logic is unit-testable in happy-dom"

requirements-completed: []  # UI-03, VER-06 NOT met — visibility gap still open (see status)

# Metrics
duration: ~25min (Tasks 1 & 2 only; Task 3 checkpoint failed)
completed: 2026-06-26
status: partial  # code fixes landed; UAT Test 1 gap NOT closed — layout pivot required
---

# Phase 06 Plan 05: Gap Closure (Particle Coordinate-Space) Summary

**Two correct latent-bug fixes landed (container-local particle anchors + session-only reduceMotion), but the UAT visibility gap is NOT closed — a deeper information-architecture blocker was discovered: the canvas is only mounted at `/`, so it is unmounted during every event that emits particles.**

## Performance

- **Duration:** ~25 min (Task 1 + Task 2; Task 3 human smoke attempted, failed)
- **Started:** 2026-06-26T21:51Z (3eb5d03)
- **Completed:** 2026-06-26T22:15Z (checkpoint failed; partial closeout)
- **Tasks:** 2 of 3 (Task 3 blocking checkpoint FAILED verification)
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- **Task 1 — Coordinate-space fix (correct, committed):** Extracted `buildParticleAnchors` to `src/ui/flowgrid-home/particle-anchors.ts` as a pure module with TYPE-ONLY pixi imports. Anchors are now container-local (core `{0,0}`; cells at `view.x/view.y`; routes at line endpoints). The prior inline impl added `refs.container.x/y`, producing stage coordinates that Pixi double-transformed into the bottom-right off-canvas corner. Regression test asserts the exact container-local values (not the stage-offset values).
- **Task 2 — ReduceMotion auto-persist fix (correct, committed):** Removed the durable `update_settings` dispatch from SettingsPanel's ref-guarded mount effect. The OS preference now only pre-fills the checkbox as a session-only suggestion (`setReduceMotion(true)`); durable `reduceMotion` requires an explicit Save. Did NOT modify `reduce-motion.ts`.
- **Verification green:** `npx vitest run` → 44 files / 246 tests pass (+4 new regression tests). `npx tsc --noEmit` → exit 0. No deviations; both TDD RED→GREEN cycles succeeded first try.

## Task Commits

Each task committed atomically (TDD: RED then GREEN):

1. **Task 1 RED — failing anchor test** — `3eb5d03` (test)
2. **Task 1 GREEN — container-local anchors + FlowgridCanvas rewire** — `174e6eb` (feat)
3. **Task 2 RED — failing settings mount-effect test** — `04209a7` (test)
4. **Task 2 GREEN — remove durable auto-persist** — `d59062d` (fix)

**Task 3 (human visual smoke) — NOT committed.** Blocking checkpoint returned FAILED.

## Files Created/Modified

- `src/ui/flowgrid-home/particle-anchors.ts` (new) — pure `buildParticleAnchors(refs)` returning container-local anchors; TYPE-ONLY SceneRefs/ParticleAnchors imports (zero runtime pixi dependency)
- `src/ui/flowgrid-home/FlowgridCanvas.tsx` (modified) — imports `buildParticleAnchors` from new module; inline function removed; unused `ParticleAnchors` type dropped from particles import
- `tests/ui/particle-anchors.test.ts` (new) — 3 tests asserting core `{0,0}`, cell `{83,48}`, route `from{0,0}/to{83,48}` (explicitly NOT the `{400,300}`/`{483,348}` stage-offset values)
- `src/ui/settings/SettingsPanel.tsx` (modified) — mount effect no longer dispatches `update_settings`; keeps session-only `setReduceMotion(true)` pre-fill
- `tests/ui/settings-reduce-motion.test.tsx` (new) — asserts zero `update_settings` dispatches on mount when OS pref is true and durable setting is false

## Decisions Made

- **Container-local coordinate contract** documented in `particle-anchors.ts` header with a reference to `.planning/debug/no-canvas-animation.md`. The ParticleContainer inherits the scene container's centering transform (`container.addChild(particleLayer)` in `scene.ts`), so anchors MUST stay in the same space the hexes use (`axialToPixel` output).
- **D-09 revised** to session-only OS-preference suggestion (see plan's Task 2 `<action>` GAP-CLOSURE REVISION OF D-09). The durable auto-persist was the original implementation but trapped users.

## Deviations from Plan

None for Tasks 1 & 2 — executed exactly as written.

## Issues Encountered

### CRITICAL — Task 3 blocking checkpoint FAILED; root cause re-framed

The plan's hypothesis was that the particle coordinate-space bug (Task 1) plus the reduceMotion auto-persist (Task 2) were the complete root cause of "particles invisible" (UAT Test 1, severity major). Both fixes landed and are correct latent-bug fixes, **but the human visual smoke still showed only static hexagons — identical to earlier phases.**

**Investigation during the checkpoint revealed the deeper, dominant blocker:**

The canvas (`FlowgridCanvas`) is mounted **only** on the `/` route (`FlowgridHome`). Per `src/app/routes.tsx`, every event that emits particles happens on a different route that **unmounts the canvas**:

| Event (visual) | Emits on route | Canvas state |
|----------------|----------------|--------------|
| Current trails (during active session) | session runs on `/cells/:cellId` (CellBoard) | unmounted |
| Bloom burst + Activation pulse + Core convert ripple (session finish) | routed away from `/` at finish | unmounted |
| Core convert/store ripple | `/core` (CorePanel) | unmounted |
| token-granted flash (rejuvenation) | `/core` | unmounted |
| forge-roll / module-upgrade flash | `/forge` (ForgePanel) | unmounted |

So the particle system — the app's visual centerpiece — is **structurally disconnected from every event source that feeds it.** No amount of coordinate math or reduce-motion gating can make particles visible when the canvas is not on screen. The plan's scope (a coordinate bug + a settings pin) was necessary but nowhere near sufficient.

**Reduce-motion factor is now moot/untestable:** the user could not confirm whether a stale durable `reduceMotion=true` (pinned pre-Task-2) is ALSO suppressing emission, because the canvas is unmounted during sessions regardless. That question can only be answered once the canvas is visible during events. (Note for the future fix: Task 2 stops FUTURE auto-pinning but does NOT clear an already-pinned value in existing IndexedDBs — a stale-pin-clearing migration may still be needed.)

### User's design instinct (captured for exploration)

The user observed: *"I would think canvas should always be shown but zoomed into a specific part depending on where we are? Or could use for navigation. Seems like we might need some sort of pivot on how the app is laid out."* This is a legitimate information-architecture redesign direction and the real path to closing UI-03/VER-06. Captured as a seed at `.planning/exploration/canvas-always-visible-layout-pivot.md` for `/gsd-explore`.

## User Setup Required

None.

## Next Phase Readiness

- **Code fixes from Tasks 1 & 2 stay** — they are correct and will be needed again after any layout pivot (the coordinate contract and the session-only reduceMotion behavior are independent of where the canvas is mounted).
- **UAT Test 1 remains OPEN.** UI-03 and VER-06 are NOT met. Phase 6 is NOT fully complete.
- **Required follow-up:** a layout-pivot design exploration (persistent canvas as app spine; context-driven camera/zoom; canvas-as-navigation; panels as overlays/destinations rather than canvas-replacing routes). This is phase-sized work and needs `/gsd-explore` → discuss → plan → execute; it is out of scope for this gap-closure plan.
- **Secondary follow-up (defer until canvas is visible during events):** confirm/clear any stale durable `reduceMotion=true` pinned in existing user DBs from pre-Task-02 /settings visits.

---
*Phase: 06-hardening-accessibility-and-trust*
*Plan: 05 (gap-closure)*
*Status: PARTIAL — code landed, visibility gap open*
*Completed: 2026-06-26*
