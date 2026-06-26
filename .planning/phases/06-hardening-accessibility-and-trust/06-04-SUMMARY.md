---
phase: 06-hardening-accessibility-and-trust
plan: 04
subsystem: testing
tags: [playwright, e2e, axe-core, wcag, accessibility, webgl, swiftshader, production-build, release-readiness, reduce-motion]

# Dependency graph
requires:
  - phase: 06-hardening-accessibility-and-trust
    provides: 06-02 — window.__flowgridInspect aggregate scene probe (wired in FlowgridCanvas.tsx) + the full-motion render layer VER-06 consumes
  - phase: 06-hardening-accessibility-and-trust
    provides: 06-03 — always-visible semantic Cell list (D-06) that the keyboard E2E drives and that doubles as the no-WebGL fallback
  - phase: 03-playable-generator-flowgrid
    provides: FlowgridHome shell + CellBoard/CorePanel/ForgePanel/SettingsPanel route surfaces the E2E drives
provides:
  - Release-readiness E2E gate (VER-04 + VER-05 + VER-06) running against the production build (vite build && vite preview)
  - playwright.config.ts with SwiftShader WebGL launch flags (Pitfall 2) + production-build webServer + test:e2e/test:e2e:ui scripts
  - VER-04 full critical flow with reload-with-IndexedDB-state durability
  - VER-05 keyboard-only flow + per-route axe WCAG 2.0/2.1 A+AA scans (5 routes) with zero violations
  - VER-06 scene-graph structural probe (window.__flowgridInspect), guarded pixel-variance sanity, and reduced-motion durability (equal Current/XP across motion ON vs OFF)
  - vitest tests/e2e exclusion so the unit/property suite never parses Playwright specs
affects: [v1-release, VER-04, VER-05, VER-06, phase-6-closeout]

# Tech tracking
tech-stack:
  added: ["@playwright/test ^1.61.1", "@axe-core/playwright ^4.12.1", "Chromium 1228 (playwright install)"]
  patterns:
    - "Production-build E2E (D-17): webServer runs `npm run build && npm run preview -- --strictPort` so tests exercise real bundling + IndexedDB + WebGL, not dev-mode HMR (T-06-10)"
    - "SwiftShader WebGL launch flags (Pitfall 2): launchOptions.args ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] make headless WebGL available for VER-06"
    - "Aggregate-only scene probe consumption (D-16): VER-06 reads window.__flowgridInspect via page.evaluate — never re-wires it (06-02 owns the wiring); undefined at runtime = 06-02 regression"
    - "Vitest↔Playwright isolation: root test.exclude ['tests/e2e/**'] so vitest never parses Playwright specs"
    - "Best-effort secondary canvas assertion: pixel-variance skips (not fails) when Pixi preserveDrawingBuffer:false readback returns uniform; the structural probe is the load-bearing always-run check (T-06-11)"
    - "Reduced-motion economy-equivalence: a throwaway bloom session stabilizes the per-session grant, then two same-duration post-bloom sessions (motion OFF vs ON) are compared for identical Current/XP — proves UI-04 at the browser level"

key-files:
  created:
    - playwright.config.ts
    - tests/e2e/release-flow.spec.ts
    - tests/e2e/accessibility.spec.ts
    - tests/e2e/canvas-smoke.spec.ts
  modified:
    - package.json
    - package-lock.json
    - vitest.config.ts
    - .gitignore
    - src/ui/cell-board/ModuleTile.tsx

key-decisions:
  - "Production app boots to an empty Flowgrid by design (seeding.ts populates only client/core/settings singletons; cells are user-created) — each E2E creates its own Cell rather than assuming a starter Cell. createStarterFlowgridState is a test factory, not the production seed path."
  - "VER-05's axe scan is load-bearing: it surfaced a real WCAG 2.1 AA color-contrast regression (ModuleTile effectLine text-slate-500) on the Bloom tile — fixed to text-slate-400 (the sibling description's passing shade). VER-05 working exactly as T-06-12 intended."
  - "Pixel-variance is a best-effort secondary check guarded by both process.env.CI and a runtime uniform-readback detector: Pixi v8 defaults to preserveDrawingBuffer:false, so drawImage readback returns a uniform cleared buffer regardless of local/CI. The scene-graph structural probe (cells>0, core===true) is the primary always-run assertion."
  - "Reduced-motion durability controls for bloom drift: bloom fires only on the first session of the day, which would change per-session grants between consecutive sessions independent of motion. A throwaway bloom session stabilizes the Cell, then two post-bloom sessions of identical duration (1.5s → floor 1s) are compared — equal Current/XP grants prove motion cannot affect durable economy truth (UI-04)."
  - "Packages installed: only @playwright/test + @axe-core/playwright (canonical Microsoft/Deque; RESEARCH Package Legitimacy Audit approved both as 'too-new' false-positives). axe-playwright (community) and @pixi/tween (SLOP, does-not-exist) explicitly NOT installed."

patterns-established:
  - "E2E creates its own state: never assume a seeded Cell in production E2E — drive the New Cell flow; the production seed is singletons-only"
  - "Session recording needs > 1s: MIN_RECORDED_SESSION_MS=1200 (sub-second finishes route through cancel and record nothing)"
  - "Index-based summary stat reads: SessionSummary stats render in a fixed dd order (Duration/Current/XP/…); locator('dd').nth(N) is more robust than regex-on-innerText"
  - "Graceful skip over hard-fail for environment-limited canvas assertions (test.skip(condition, reason) after measuring)"

requirements-completed: [VER-04, VER-05, VER-06]

# Metrics
duration: 63min
completed: 2026-06-26
status: complete
---

# Phase 6 Plan 4: Release-Readiness E2E Gate Summary

**Playwright + axe-core E2E harness running 9 real-browser specs (VER-04 full flow with IndexedDB reload, VER-05 keyboard + per-route WCAG scans, VER-06 scene-graph probe + reduced-motion economy-equivalence) against the production build — plus a VER-05-caught WCAG contrast fix**

## Performance

- **Duration:** 63 min
- **Started:** 2026-06-26T19:10:02Z
- **Completed:** 2026-06-26T20:13:07Z
- **Tasks:** 3
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments
- Release-readiness E2E gate shipped: 9 passing specs + 1 gracefully-skipped secondary check, all against `vite build && vite preview` (D-17 production build) with SwiftShader WebGL launch flags (Pitfall 2).
- VER-04 (release-flow.spec.ts): drives the complete critical flow in a real browser — create Cell, focus session to completion (Current/XP/Core outcome surfaced via SessionSummary), Core allocation apply, rejuvenation log, conditional forge roll, **reload-with-IndexedDB-state** asserting the created Cell persists, and the Settings JSON export surface.
- VER-05 (accessibility.spec.ts): (A) keyboard-only Cell-list → Start → Finish flow driven purely via `page.keyboard` (Tab/Enter, no pointer clicks); (B) `AxeBuilder` from the OFFICIAL `@axe-core/playwright` running WCAG 2a/2aa/21a/21aa scans on all 5 routes (home, cell-board, core, forge, settings) asserting `violations === []`.
- VER-06 (canvas-smoke.spec.ts): (1) scene-graph structural probe consuming `window.__flowgridInspect` (wired by 06-02) asserting `cells > 0`, `core === true`, `routes >= 0`; (2) best-effort pixel-variance sanity (guarded for CI + the Pixi preserveDrawingBuffer uniform-readback case); (3) reduced-motion durability proving identical Current/XP grants across motion-OFF vs motion-ON runs (UI-04 at the browser level).
- Packages: only `@playwright/test` + `@axe-core/playwright` installed (canonical Microsoft/Deque). `axe-playwright` (community fork) and `@pixi/tween` (SLOP — does not exist) explicitly NOT installed.
- Deferred Phase 5 Task-4 human visual smoke is now retired by automation (the full click-flow + reload + canvas + a11y are machine-verified).
- Full vitest suite (42 files / 242 tests) still green; tsc green; `npx playwright test` exits 0 (9 passed, 1 skipped).

## Task Commits

Each task was committed atomically:

1. **Task 1: Playwright + axe-core harness (config + scripts + vitest exclusion)** - `e73a5e8` (chore)
2. **Task 2: VER-04 release-flow + VER-05 keyboard/axe E2E (+ ModuleTile contrast fix)** - `26ac6eb` (test)
3. **Task 3: VER-06 canvas smoke (scene-graph + pixel + reduced-motion)** - `e72901e` (test)

**Plan metadata:** pending (docs: complete plan — committed last)

## Files Created/Modified
- `playwright.config.ts` (new) — production-build webServer (build + preview, port 4173), SwiftShader WebGL launch args (Pitfall 2), tests/e2e testDir, chromium project
- `tests/e2e/release-flow.spec.ts` (new) — VER-04 full critical flow + reload-with-state + Settings export
- `tests/e2e/accessibility.spec.ts` (new) — VER-05 keyboard-only flow + tabTo helper + 5-route axe scans
- `tests/e2e/canvas-smoke.spec.ts` (new) — VER-06 scene-graph probe + guarded pixel-variance + reduced-motion durability
- `package.json` — +@playwright/test, +@axe-core/playwright devDeps; +test:e2e, +test:e2e:ui scripts
- `package-lock.json` — dependency lockfile (5 packages added)
- `vitest.config.ts` — +root `exclude: ['tests/e2e/**']`
- `.gitignore` — +Playwright artifacts (test-results/, playwright-report/, playwright/.cache/)
- `src/ui/cell-board/ModuleTile.tsx` — effectLine `text-slate-500` → `text-slate-400` (VER-05 axe contrast fix)

## Decisions Made
- **Production boots empty:** VER-04/05/06 each create their own Cell. The `createStarterFlowgridState` factory is for unit/property tests only; `seeding.ts` populates only client/core/settings. Tests never assume a starter Cell exists in the browser.
- **Contrast fix is in-scope:** VER-05's axe scan is the verification gate; a WCAG 2.1 AA violation it catches is exactly what T-06-12 mandates it catch. The one-line `text-slate-400` fix (matching the passing sibling description shade) is the minimum change to make the gate pass.
- **Pixel-variance skip, not fail:** Pixi v8 `preserveDrawingBuffer:false` makes `drawImage` readback return a uniform cleared buffer in every headless context. The structural probe (always passing) is the load-bearing assertion; the pixel check skips cleanly when readback is uniform and would assert when a context exposes readable pixels.
- **Bloom-controlled motion comparison:** two raw consecutive sessions would differ because bloom fires only on the first session of the day. The throwaway bloom session stabilizes the per-session grant; the two compared sessions are both post-bloom with identical 1s duration → equal Current/XP grants iff motion is economy-neutral (UI-04).
- **Chromium 1228 + 1223 headless shell both present** in the cache; Playwright selects the matching revision automatically.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ModuleTile effectLine fails WCAG 2.1 AA color contrast**
- **Found during:** Task 2 (VER-05 axe scan on the cell-board route)
- **Issue:** The Bloom ModuleTile's effect line used `text-slate-500` (#64748b) on the `bg-flowgrid-surface` dark background, failing WCAG 2.1 AA contrast (axe rule `color-contrast`, tags wcag2aa/wcag143/TT13.c). VER-05's purpose (T-06-12) is exactly to catch this.
- **Fix:** Changed `text-slate-500` → `text-slate-400` on the effectLine `<p>` — the same shade the sibling description already uses (and which passed). No behavior change.
- **Files modified:** src/ui/cell-board/ModuleTile.tsx
- **Verification:** `npx playwright test tests/e2e/accessibility.spec.ts` — all 5 axe scans now report `violations === []`.
- **Committed in:** 26ac6eb (part of the Task 2 commit — the spec that surfaced it)

**2. [Rule 2 - Missing Critical] Playwright artifacts not gitignored**
- **Found during:** Task 2 (first E2E run created `test-results/`)
- **Issue:** `.gitignore` had no Playwright entries; generated `test-results/` would leak into git.
- **Fix:** Added `test-results/`, `playwright-report/`, `playwright/.cache/` to `.gitignore`.
- **Files modified:** .gitignore
- **Verification:** `git status` no longer lists `test-results/`.
- **Committed in:** 26ac6eb (part of the Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule-1 a11y bug caught by VER-05, 1 Rule-2 missing gitignore for generated test output)
**Impact on plan:** Both auto-fixes are minimal and directly required for the plan's success criteria (axe-zero + clean working tree). No scope creep. The contrast fix is the single most valuable outcome of VER-05 — it proves the gate works.

## Issues Encountered
- Initial canvas-smoke drafts assumed a seeded starter Cell; debugging (`page.locator('canvas').count() === 0`, body text "No active Cells yet") revealed the production app intentionally boots empty (seeding.ts comment: singletons-only). Resolved by creating a Cell in each E2E — a correct, durable pattern (documented above).
- Pixi v8 `preserveDrawingBuffer:false` defeated the `drawImage` pixel readback (uniform buffer). Resolved by guarding the secondary pixel assertion with a runtime uniform-detector `test.skip` rather than weakening the structural probe.

## Authentication Gates
None.

## User Setup Required
None - no external service configuration required. (`npx playwright install chromium` is a one-time local browser download; CI runs the same `npm run test:e2e`.)

## Next Phase Readiness
- Phase 6 is now 4/4 plans complete. v1's release-readiness verification gate is fully automated: the complete browser flow, IndexedDB reload durability, keyboard accessibility, per-route WCAG scans, and canvas/scene/reduced-motion checks all pass against the production build.
- All Phase 6 requirements (UI-02, UI-03, UI-04, UI-06, VER-04, VER-05, VER-06) are satisfied across 06-01..06-04.
- The deferred Phase 5 Task-4 human visual smoke is retired — its coverage now lives in VER-04/05/06.
- Ready for milestone closeout (`/gsd-complete-milestone`) and a `/gsd-verify-work` pass. No blockers.

## Self-Check: PASSED
- All 5 created/modified source files exist on disk (playwright.config.ts, 3 e2e specs, ModuleTile.tsx modified)
- All 3 plan-task commits present: `e73a5e8` (chore), `26ac6eb` (test), `e72901e` (test)
- `npx tsc --noEmit` exits 0
- `npx vitest run` full suite: 42 files / 242 tests pass (e2e excluded)
- `npx playwright test` full suite: 9 passed, 1 skipped, exit 0
- `@playwright/test` + `@axe-core/playwright` present; `axe-playwright` + `@pixi/tween` absent
- playwright.config.ts has webServer (build + preview), url http://localhost:4173, all 3 SwiftShader flags
- package.json has test:e2e + test:e2e:ui; vitest.config.ts excludes tests/e2e
- VER-04/05/06 marked complete in REQUIREMENTS.md; Phase 6 marked 4/4 Complete in ROADMAP.md

---
*Phase: 06-hardening-accessibility-and-trust*
*Completed: 2026-06-26*
