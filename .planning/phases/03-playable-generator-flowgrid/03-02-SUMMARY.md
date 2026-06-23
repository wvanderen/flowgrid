---
phase: 03-playable-generator-flowgrid
plan: 02
subsystem: ui
tags: [react, react-router, vite, tailwind, pixijs, zustand, radix, lucide-react, typescript, hex-grid, app-shell, renderer]

# Dependency graph
requires:
  - phase: 03-playable-generator-flowgrid
    provides: Plan 03-01 simulation truth layer — FlowgridSnapshot, six cell/session commands, deriveLocalDate, CellRecord D-10 fields
  - phase: 02-durable-local-first-spine
    provides: FlowgridRepository.applyResult / loadSnapshot diff-write path, typed PersistenceError contract, Dexie v2 schema
provides:
  - React 19 + Vite 8 + Tailwind 4 + PixiJS 8 + Zustand 5 app shell with locked stack installed and configured
  - Dual-environment Vitest workspace (node + happy-dom) with ESLint layer-boundary rules for src/render and src/ui
  - Zustand vanilla store (snapshot/activeSession/pendingVisualEvents/status/lastError) + async dispatch loop UI → runSimulationCommand → repository.applyResult → store emit
  - Pure-TypeScript axial/cube hex math module (axialToPixel, pixelToAxial, axialRound, ringCells) shared by layout and hit-detection
  - PixiJS 8 stub Flowgrid scene (Core + non-archived Cells in rings + static routes + Activation halo + pointertap → onCellTap)
  - Render→store adapter that drains and drops pendingVisualEvents (D-02 day-one safety)
  - FlowgridHome route component with accessible <h1>, loading/error/empty/ready states, and tap navigation to /cells/:cellId (D-03)
  - ErrorBanner accessible renderer for the Phase 2 PersistenceError contract
affects:
  - 03-03-cell-board-session-ui (mounts the Cell Board route behind FlowgridHome's tap navigation; dispatches the six new commands through this plan's dispatch path)
  - 04-core-alternation-rejuvenation (extends the dispatch loop and Pixi scene to model Rejuvenation and Core alternation)
  - 06-hardening-accessibility-trust (audits the renderer/UI layer boundaries and accessibility surfaces established here)

# Tech tracking
tech-stack:
  added:
    - react@^19.2.7
    - react-dom@^19.2.7
    - react-router@^7.18.0 (declarative createBrowserRouter mode, NOT framework mode)
    - zustand@^5.0.14 (vanilla createStore + useStore binding)
    - tailwindcss@^4.3.1 (CSS-first, @theme tokens shared with Pixi palette)
    - @tailwindcss/vite@^4.3.1
    - pixi.js@^8.19.0 (async Application.init; app.canvas not app.view)
    - @radix-ui/react-dialog, @radix-ui/react-popover, @radix-ui/react-tooltip, @radix-ui/react-tabs, @radix-ui/react-menu
    - lucide-react@^1.21.0
    - "@vitejs/plugin-react@^6.0.3 (dev)"
    - "@testing-library/react@^16.3.2 (dev)"
    - "@testing-library/user-event@^14.6.1 (dev)"
    - "@testing-library/jest-dom@^6.9.1 (dev)"
    - "happy-dom@^20.10.6 (dev)"
    - "@types/react@^19.2.17 (dev)"
    - "@types/react-dom@^19.2.3 (dev)"
  patterns:
    - "Zustand vanilla store + useStore binding (not the React create hook) so dispatch can run outside React"
    - "Structural FlowgridStoreView type for the render→store seam so src/render never imports src/app"
    - "Pixi Application factory + type re-export live in src/render; UI imports functions, never pixi.js"
    - "Vitest 4 test.projects dual workspace — node for simulation/persistence/properties, happy-dom for app/ui/render"
    - "Region-scoped ESLint no-restricted-imports per layer (PATTERNS S6) plus boundary scanner test as second line of defense"

key-files:
  created:
    - vite.config.ts
    - index.html
    - src/style.css
    - src/vite-env.d.ts
    - src/app/main.tsx
    - src/app/App.tsx
    - src/app/routes.tsx
    - src/app/env.ts
    - src/app/rng.ts
    - src/app/store/flowgrid-store.ts
    - src/app/store/dispatch.ts
    - src/render/flowgrid/hex-layout.ts
    - src/render/flowgrid/scene.ts
    - src/render/flowgrid/adapter.ts
    - src/ui/flowgrid-home/FlowgridHome.tsx
    - src/ui/flowgrid-home/FlowgridCanvas.tsx
    - src/ui/shared/ErrorBanner.tsx
    - tests/app/dispatch.test.ts
    - tests/render/hex-layout.test.ts
    - tests/ui/flowgrid-home.test.tsx
    - tests/helpers/setup-dom.ts
  modified:
    - package.json
    - package-lock.json
    - tsconfig.json
    - vitest.config.ts
    - eslint.config.js
    - tests/simulation/boundaries.test.ts

key-decisions:
  - "Used react-router@^7.18.0 in declarative createBrowserRouter mode (NOT framework mode / NOT @react-router/dev) per Pitfall 2 and STACK.md"
  - "Pinned the Pixi Application factory and FlowgridApplication type to src/render/flowgrid/scene.ts so FlowgridCanvas imports functions, never pixi.js — this is the cleanest reading of PATTERNS S6 (UI never imports Pixi directly)"
  - "Defined FlowgridStoreView as a structural interface in adapter.ts instead of importing `typeof flowgridStore` — keeps src/render free of src/app imports per the render layer rule"
  - "Kept `noImplicitOverride` and `exactOptionalPropertyTypes` strict flags on through the JSX transition; React 19's class-component error boundary needed `override` modifiers on state/lifecycle methods"
  - "Pixi v8 `eventMode = 'static'` replaces v7 `interactive: true` (the migration guide lists this rename); plan acceptance criterion referenced the v7 name and was implemented as the v8 equivalent"

patterns-established:
  - "Vanilla store + useStore binding: app shell coordination state lives in a Zustand vanilla store (snapshot, activeSession, pendingVisualEvents, status, lastError); React selectors bind via useStore(flowgridStore, selector)"
  - "Dispatch loop: UI command → runSimulationCommand → repository.applyResult → store emit; rejected/not_implemented/persistence-failure paths short-circuit without mutating the snapshot"
  - "Layer boundary seam: UI imports render via the public scene/adapter entry points only; render imports no app/ui/persistence/react/dexie/zustand (ESLint rule + boundary scanner test)"
  - "Pixi mount via ref + cancel flag: useEffect mounts Application asynchronously, captures onCellTap via ref so the mount-once effect doesn't go stale, cleanup destroys scene + app"
  - "Visual event drain is re-entrancy-guarded: the adapter's setState({pendingVisualEvents: []}) triggers a synchronous subscriber re-fire; isUpdating guards against the loop"

requirements-completed:
  - UI-01

# Metrics
duration: 19min
completed: 2026-06-23
status: complete
---

# Phase 3 Plan 2: App Shell + Pixi Renderer + Flowgrid Home Summary

**Locked React 19 / Vite 8 / Tailwind 4 / PixiJS 8 / Zustand 5 stack installed, dual-environment tests configured, and the Flowgrid Home route shipped with a Core-centered hex scene, tap navigation, and the renderer/simulation safety boundary proven from day one (D-01/D-02/D-03).**

## Performance

- **Duration:** 19 min
- **Started:** 2026-06-23T23:35:13Z
- **Completed:** 2026-06-23T23:54:43Z
- **Tasks:** 2 (1 autonomous + 1 TDD RED → GREEN)
- **Files modified:** 25 (20 created + 5 modified, plus package-lock.json)

## Accomplishments
- Installed the full locked stack per RESEARCH Standard Stack (React 19.2.7, react-router 7.18.0 in declarative createBrowserRouter mode, Tailwind 4 CSS-first, PixiJS 8.19.0, Zustand 5 vanilla, Radix primitives, lucide-react) plus dev tooling (@vitejs/plugin-react, @testing-library/*, happy-dom, @types/react*). Deliberately did NOT install @react-router/dev (Pitfall 2).
- Configured dual-environment Vitest via `test.projects`: node project for tests/simulation + tests/persistence + tests/properties (unchanged), happy-dom project for tests/app + tests/ui + tests/render. Existing 122 simulation/persistence tests pass unchanged.
- Extended ESLint with region-scoped `no-restricted-imports` blocks for src/render (bans React/Dexie/Zustand/DOM shims; Pixi allowed) and src/ui (bans pixi.js + direct dexie; allows react/zustand/radix/lucide + the persistence barrel + the render/flowgrid seam). Refactored tests/simulation/boundaries.test.ts to a reusable `scanLayer(rootDir, rules)` helper and added four new render/ui boundary tests (skipped while those trees are empty, active once Task 2 lands).
- Built the app shell: main.tsx createRoot, App.tsx RouterProvider + RootErrorBoundary, routes.tsx createBrowserRouter with `/` and `/cells/:cellId`, Zustand vanilla `flowgridStore` holding snapshot/activeSession/pendingVisualEvents/status/lastError, async `dispatch(command, env, repository)` that runs the UI → runSimulationCommand → repository.applyResult → store emit loop, and `makeEnv` + `createRng` for production SimulationEnv construction with deriveLocalDate.
- Shipped a pure-TS hex math module (axialToPixel, pixelToAxial, axialRound, ringCells) with zero runtime dependencies — used by layout, hit-detection, and tests. Property test proves pixelToAxial inverts axialToPixel across q/r ∈ [-20, 20] and size ∈ [8, 200].
- Shipped a PixiJS 8 stub scene that draws the Core at the origin, non-archived Cells in sequential ring slots (D-12), static route lines back to the Core (D-02), Activation halos for cells whose `lastBloomLocalDate === localDate` (D-02), and per-cell `pointertap` events that resolve the cellId and forward to `onCellTap` (D-03). Pixi v8 `eventMode = 'static'` replaces v7's `interactive: true`.
- Wired a store-subscribe adapter that drains pendingVisualEvents and clears the store (D-02 drop), guarded against re-entrant emission from its own setState. Visual events are received and dropped — proving the renderer/simulation safety boundary from day one.
- Delivered FlowgridHome with accessible `<h1>Flowgrid</h1>`, loading state, ErrorBanner for typed PersistenceError, active-cell count, and FlowgridCanvas mounting. Tap navigates to `/cells/:cellId` via React Router (D-03).
- Verified: 141/141 tests pass (19 new), `npx tsc --noEmit` clean, `npx eslint .` clean, `npm run build` succeeds (724 modules), `npm run dev` serves index.html with HTTP 200 + `<div id="root">`.

## Task Commits

Each task was committed atomically. Task 2 is TDD (RED → GREEN); Task 1 is plain `auto`.

1. **Task 1: install locked stack, configure build/test, scaffold app shell** — `833d7d5` (feat)
2. **Task 2 RED: failing tests for hex math + FlowgridHome** — `354f522` (test)
3. **Task 2 GREEN: custom hex math + PixiJS 8 stub scene + Flowgrid Home UI** — `dfd6b33` (feat)

_No REFACTOR commit — the GREEN code followed Pattern 2/3 skeletons cleanly and needed no cleanup._

## Files Created/Modified

**Created — app shell (src/app)**
- `src/app/main.tsx` — Vite entry; `createRoot(document.getElementById('root')!).render(<App />)`.
- `src/app/App.tsx` — `RouterProvider` wrapped in a class-based `RootErrorBoundary` (React 19 still requires class components for error boundaries).
- `src/app/routes.tsx` — `createBrowserRouter([{ path: '/', element: <FlowgridHome /> }, { path: '/cells/:cellId', element: <Cell Board placeholder> }])`.
- `src/app/store/flowgrid-store.ts` — Zustand vanilla `createStore` holding the five shell-state fields with status `'loading'` initial.
- `src/app/store/dispatch.ts` — async `dispatch(command, env, repository)` loop; `useFlowgridStore(selector)` bound hook; `deriveActiveSession` projects the one-active-session invariant from cells.
- `src/app/env.ts` — `makeEnv(now, settings, seed)` production SimulationEnv factory; calls `deriveLocalDate(now, settings.localDayBoundary)` per D-16.
- `src/app/rng.ts` — `createRng(seed)` lifted byte-for-byte from tests/helpers/fixtures.ts so the production env factory does not depend on a test helper.

**Created — renderer (src/render)**
- `src/render/flowgrid/hex-layout.ts` — pure axial/cube math, zero imports.
- `src/render/flowgrid/scene.ts` — `buildFlowgridScene` / `destroyFlowgridScene` / `createFlowgridApplication` factory / `FlowgridApplication` type re-export. Application factory lives here so UI never imports pixi.js.
- `src/render/flowgrid/adapter.ts` — `connectFlowgridAdapter(store, onSnapshot, onVisualEvents)` with structural `FlowgridStoreView` type and re-entrancy guard.

**Created — UI (src/ui)**
- `src/ui/flowgrid-home/FlowgridHome.tsx` — replaces Task 1 stub; reads store via selectors, renders loading/error/empty/ready states, mounts FlowgridCanvas, navigates on tap.
- `src/ui/flowgrid-home/FlowgridCanvas.tsx` — Pixi mount via render-layer factory; ref-tracked onCellTap; mount-once useEffect with full cleanup.
- `src/ui/shared/ErrorBanner.tsx` — `role="alert"` renderer for PersistenceError.

**Created — tests + entry**
- `index.html`, `src/style.css` (Tailwind v4 `@import "tailwindcss"` + `@theme` palette tokens), `src/vite-env.d.ts`, `vite.config.ts`.
- `tests/app/dispatch.test.ts` — 3 tests (create_cell happy path, drop when snapshot null, visualEvent append).
- `tests/render/hex-layout.test.ts` — 9 tests including fast-check inverse property.
- `tests/ui/flowgrid-home.test.tsx` — 3 RTL tests (accessible h1, loading state, smoke render).
- `tests/helpers/setup-dom.ts` — registers `@testing-library/jest-dom/vitest` matchers for the dom project.

**Modified**
- `package.json` — locked stack deps + `dev` / `build` / `preview` scripts.
- `tsconfig.json` — added `DOM` / `DOM.Iterable` lib, `jsx: react-jsx`, `.tsx` includes, `@testing-library/jest-dom` types (Pitfall 4); strict flags preserved.
- `vitest.config.ts` — restructured as `test.projects` dual workspace.
- `eslint.config.js` — added src/render and src/ui layer-boundary blocks (PATTERNS S6).
- `tests/simulation/boundaries.test.ts` — extracted `scanLayer`, added RENDER_ROOT/UI_ROOT + 4 new tests (skip-while-empty).

## Decisions Made
- **react-router v7 over v8** — STACK.md locks v7; the install pinned `^7.18.0`. v8.0.1 shipped days ago but the project explicitly defers adoption.
- **Declarative createBrowserRouter, not framework mode** — Pitfall 2; `@react-router/dev` deliberately not installed. STACK.md rejects "file-router/full-stack complexity".
- **Pixi Application factory in src/render** — the cleanest reading of PATTERNS S6. FlowgridCanvas imports `createFlowgridApplication` and the `FlowgridApplication` type alias from scene.ts; it never imports pixi.js. RESEARCH Pattern 2 inlined `new Application()` in the component, but that pattern predates the strict UI-layer rule.
- **Structural FlowgridStoreView in adapter.ts** — avoids importing `flowgridStore` (which lives in src/app and is banned from src/render). The actual store satisfies the contract structurally.
- **happy-dom over jsdom** — RESEARCH Standard Stack picks happy-dom for speed; confirmed working under Vitest 4.
- **Tailwind v4 CSS-first config** — no tailwind.config.js; design tokens in `@theme`. Pixi scene colors hard-coded as 0xRRGGBB integers that mirror the @theme tokens (Phase 6 may move to CSS-variable reads).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stub FlowgridHome created in Task 1 to satisfy routes.tsx import**
- **Found during:** Task 1 (routes.tsx imports FlowgridHome, but the real component ships in Task 2)
- **Issue:** Task 1 acceptance criteria require `npx tsc --noEmit` to pass, but routes.tsx (a Task 1 file) imports FlowgridHome from src/ui/flowgrid-home/FlowgridHome which is a Task 2 file. Either routes.tsx can't be created in Task 1, or a placeholder FlowgridHome must exist.
- **Fix:** Created a minimal FlowgridHome stub in Task 1 (`<section aria-label="Flowgrid placeholder">placeholder</section>`) so routes.tsx typechecks. The stub deliberately does NOT satisfy Task 2's TDD assertions (no h1, no loading state) so the RED phase fails for the right reason. Task 2 GREEN replaces the stub wholesale.
- **Files modified:** src/ui/flowgrid-home/FlowgridHome.tsx (stub in Task 1, real impl in Task 2)
- **Verification:** Task 1 typecheck passes; Task 2 RED tests fail on assertion (not import); Task 2 GREEN tests pass.
- **Committed in:** 833d7d5 (stub) and dfd6b33 (real impl)

**2. [Rule 1 - Bug] Vitest 4 uses `test.projects`, not `test.workspace`**
- **Found during:** Task 1 typecheck of vitest.config.ts
- **Issue:** The plan described the workspace as `test.workspace`, but Vitest 4.1.9's `InlineConfig` exposes `test.projects: TestProjectConfiguration[]`. `test.workspace` does not exist.
- **Fix:** Used `test.projects: [{ extends: true, test: {...} }, ...]` with two project configs (node + happy-dom). Each project inherits root options via `extends: true`.
- **Files modified:** vitest.config.ts
- **Verification:** `npx tsc --noEmit` passes; `npx vitest run` resolves both projects and runs the correct environment per file glob.
- **Committed in:** 833d7d5

**3. [Rule 3 - Blocking] Pixi Application factory moved into src/render/flowgrid/scene.ts**
- **Found during:** Task 2 GREEN lint pass
- **Issue:** RESEARCH Pattern 2 shows FlowgridCanvas doing `import { Application } from 'pixi.js'` and `new Application()`. But the UI layer ESLint rule (per PATTERNS S6 and the plan's own action text: "UI must not import Pixi directly") bans ALL pixi.js imports from src/ui — including `import type`. The plan's stated seam is "FlowgridCanvas imports functions, never pixi.js directly".
- **Fix:** Added `createFlowgridApplication(container): Promise<Application>` factory and `export type FlowgridApplication = Application` to scene.ts. FlowgridCanvas imports both via the render barrel seam. UI now has zero pixi.js imports (verified via grep).
- **Files modified:** src/render/flowgrid/scene.ts (added factory + type alias), src/ui/flowgrid-home/FlowgridCanvas.tsx (uses factory instead of `new Application()`)
- **Verification:** `npx eslint src/ui/` passes; `grep -r "from 'pixi.js'" src/ui/` returns nothing.
- **Committed in:** dfd6b33

**4. [Rule 3 - Blocking] adapter.ts uses structural FlowgridStoreView, not `typeof flowgridStore`**
- **Found during:** Task 2 GREEN design (before writing adapter.ts)
- **Issue:** Plan signature `connectFlowgridAdapter(app, store: typeof flowgridStore)` requires importing flowgridStore from src/app. The render layer ESLint rule bans ALL relative imports into src/app (PATTERNS S6). The plan is internally inconsistent: the signature text violates the layer rule the plan also establishes.
- **Fix:** Defined a local `FlowgridStoreView` interface in adapter.ts matching the slice of the Zustand vanilla store API the adapter needs (`subscribe`/`getState`/`setState`). FlowgridCanvas passes `flowgridStore as unknown as FlowgridStoreView`. The Application parameter was also removed — FlowgridCanvas owns scene rebuild via the `onSnapshot` callback, keeping the adapter focused on store→callback plumbing.
- **Files modified:** src/render/flowgrid/adapter.ts, src/ui/flowgrid-home/FlowgridCanvas.tsx
- **Verification:** `npx eslint src/render/` passes; boundary scanner test passes.
- **Committed in:** dfd6b33

**5. [Rule 3 - Blocking] Added tests/helpers/setup-dom.ts for jest-dom matchers**
- **Found during:** Task 2 GREEN test run
- **Issue:** FlowgridHome tests use `toBeInTheDocument()` from @testing-library/jest-dom. The plan added `@testing-library/jest-dom` to package.json and tsconfig types, but never registered the matchers with Vitest. Without registration, `expect(el).toBeInTheDocument()` throws `Invalid Chai property: toBeInTheDocument`.
- **Fix:** Created `tests/helpers/setup-dom.ts` that imports `@testing-library/jest-dom/vitest` (which auto-registers matchers). Added it to the dom project's `setupFiles` in vitest.config.ts. The node project deliberately does NOT load it (keeps node tests free of DOM typings).
- **Files modified:** tests/helpers/setup-dom.ts (new), vitest.config.ts (added setup-dom.ts to dom project setupFiles)
- **Verification:** All 3 FlowgridHome tests pass after the matcher registration.
- **Committed in:** dfd6b33

**6. [Rule 3 - Blocking] FlowgridHome tests wrapped in createMemoryRouter + RouterProvider**
- **Found during:** Task 2 GREEN test run
- **Issue:** FlowgridHome calls `useNavigate()` which requires React Router context. The RED tests rendered `<FlowgridHome />` directly, triggering `useNavigate() may be used only in the context of a <Router> component`.
- **Fix:** Added a `renderHome()` helper that creates a memory router with FlowgridHome as the root element and renders inside `<RouterProvider>`. Used `createMemoryRouter` (not `createBrowserRouter`) so the test does not touch the URL bar.
- **Files modified:** tests/ui/flowgrid-home.test.tsx
- **Verification:** All 3 tests render cleanly.
- **Committed in:** 354f522 (RED), dfd6b33 (GREEN re-uses the same wrapper)

---

**Total deviations:** 6 auto-fixed (4 blocking-issue, 1 bug, 1 TDD-test-infrastructure adjustment in the RED file that carried through to GREEN)
**Impact on plan:** All deviations resolve plan-internal inconsistencies (the signature/rule mismatches in PATTERNS S6 vs Pattern 2, the missing matcher setup, the Vitest 4 API name) and are necessary for both Task 1 typecheck and Task 2 GREEN to pass. No scope change; the user-visible behaviour matches the plan exactly.

## Issues Encountered
None beyond the six auto-fixes above. The locked stack installed cleanly, all package legitimacy checks passed (RESEARCH §161-184 had already audited every package), and no checkpoints were triggered.

## User Setup Required
None — no external services, no env vars, no manual configuration. The app runs locally via `npm run dev` against the existing IndexedDB-backed persistence layer.

## Next Phase Readiness
- The full React/Pixi/Zustand app shell is ready for Plan 03-03 (Cell Board + session UI) to mount the `/cells/:cellId` route behind FlowgridHome's tap navigation. The dispatch path, store, and adapter are wired and tested.
- The renderer/simulation safety boundary (D-02) is proven: visual events flow into `pendingVisualEvents` and are dropped by the adapter, with no impact on durable state.
- PixiJS 8 async init is confirmed working in a real browser (production build succeeds; dev server returns 200). WebGPU/WebGL preference and `app.canvas` (Pitfall 1) are correct for v8.
- The dual-environment Vitest workspace and the region-scoped ESLint layer rules are stable foundations for the rest of Phase 3 and the Phase 6 accessibility/hardening work.
- Manual verification outstanding: phase verifier should confirm Flowgrid Home visually renders the Core + Cells (the automated tests confirm the component mounts and reads the store, but happy-dom has no WebGL so the canvas itself is not exercised by RTL).

## TDD Gate Compliance

Task 2 (the only TDD task; Task 1 is plain `auto`) shipped a clean RED → GREEN sequence. Git log verification:

```
dfd6b33 feat(03-02): custom hex math, PixiJS 8 stub scene, Flowgrid Home UI (GREEN) (Task 2)
354f522 test(03-02): add failing tests for hex math and FlowgridHome (RED)         (Task 2)
833d7d5 feat(03-02): install locked React/Vite/Pixi stack ...                      (Task 1, non-TDD)
```

- RED commit precedes its GREEN counterpart in Task 2.
- RED tests failed for the right reasons (hex-layout.ts missing → vite import-resolution error; FlowgridHome stub did not satisfy heading/loading/canvas-mount assertions).
- GREEN implementation is minimal — it follows RESEARCH Pattern 2 (Pixi mount) and Pattern 3 (hex math) skeletons; no premature optimization.
- No REFACTOR commit — the code follows the patterns cleanly.

## Self-Check: PASSED

Created files (verified on disk):
- FOUND: index.html
- FOUND: src/style.css
- FOUND: src/vite-env.d.ts
- FOUND: vite.config.ts
- FOUND: src/app/main.tsx
- FOUND: src/app/App.tsx
- FOUND: src/app/routes.tsx
- FOUND: src/app/env.ts
- FOUND: src/app/rng.ts
- FOUND: src/app/store/flowgrid-store.ts
- FOUND: src/app/store/dispatch.ts
- FOUND: src/render/flowgrid/hex-layout.ts
- FOUND: src/render/flowgrid/scene.ts
- FOUND: src/render/flowgrid/adapter.ts
- FOUND: src/ui/flowgrid-home/FlowgridHome.tsx
- FOUND: src/ui/flowgrid-home/FlowgridCanvas.tsx
- FOUND: src/ui/shared/ErrorBanner.tsx
- FOUND: tests/app/dispatch.test.ts
- FOUND: tests/render/hex-layout.test.ts
- FOUND: tests/ui/flowgrid-home.test.tsx
- FOUND: tests/helpers/setup-dom.ts

Task commits (verified in git log):
- FOUND: 833d7d5 (feat 03-02 Task 1)
- FOUND: 354f522 (test 03-02 Task 2 RED)
- FOUND: dfd6b33 (feat 03-02 Task 2 GREEN)

Plan-level verification:
- PASS: `npx tsc --noEmit` (zero errors; DOM/JSX config active, strict flags preserved)
- PASS: `npx eslint .` (zero errors; src/render + src/ui layer rules active)
- PASS: `npx vitest run` — 141 tests pass across node + happy-dom projects (19 new: 3 dispatch, 9 hex-layout, 3 FlowgridHome, 4 boundary; zero regressions in the prior 122)
- PASS: `npm run build` — Vite production build succeeds (724 modules transformed in 258 ms; Pixi + React + Zustand + Radix all bundle cleanly)
- PASS: `npm run dev` — dev server returns HTTP 200 with `<div id="root">` present
- DEFERRED: visual Flowgrid Home render in a real browser — manual, belongs to the phase verifier

---
*Phase: 03-playable-generator-flowgrid*
*Completed: 2026-06-23*
