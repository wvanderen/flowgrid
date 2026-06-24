---
phase: 03-playable-generator-flowgrid
plan: 04
subsystem: ui
tags: [tailwind, dark-theme, styling, accessibility, react, radix-dialog, design-tokens, gap-closure]

# Dependency graph
requires:
  - phase: 03-playable-generator-flowgrid
    provides: Plan 03-02 Tailwind v4 setup (@import 'tailwindcss', @theme palette tokens, FlowgridHome/FlowgridCanvas/ErrorBanner skeletons, Radix Dialog installed)
  - phase: 03-playable-generator-flowgrid
    provides: Plan 03-03 Cell Board + session UI components (12 unstyled but functionally-correct components: CellBoard, CellInspector, ModuleTile, GeneratorTile, SessionTimer, CreateCellForm, EditCellForm, CellActions, ResumeSessionPrompt, SessionSummary, ArchivedCellsFilter)
provides:
  - Cohesive first-pass dark-theme styling on all 14 Phase 3 UI files plus the style.css base layer — every component consumes Tailwind v4 utility classes built from the @theme tokens
  - Dark-theme body layer in @layer base so the whole viewport is dark from first paint (the central fix for UAT test 2's "pure html with no styling at all")
  - Visible gold Core accents, surface cards, a responsive 4-up module grid, centered Radix Dialogs with backdrop overlays, and styled form fields with a core focus ring
  - Closure of UAT test 2's root cause — Tailwind v4 now emits utility classes (CSS bundle grows from Preflight-only to 19.04kB in the production build)
affects:
  - 03-UAT (test 2 "Open App — Flowgrid Home Renders" is unblocked from issue → ready for pass once the human visual smoke confirms; tests 3-15 depend on this styling surface)
  - 04-core-alternation-rejuvenation (extends GeneratorTile and SessionSummary for Rejuvenation/Core-alternation; the card/button vocabulary established here is the styling template)
  - 06-hardening-accessibility-trust (audits the dark-theme surfaces, Radix Dialog semantics, and semantic-markup integrity established here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single dark-theme body layer in @layer base consuming the flowgrid-bg token centrally (every route section inherits the dark background without repeating it)"
    - "Conditional className via inline ternary for state-driven text color (CellInspector Activation dd: activatedToday ? text-cell-activated : text-slate-100) — presentational class choice only, no logic or text change"
    - "@theme tokens flow automatically to Tailwind v4 color utilities (bg-flowgrid-bg, bg-flowgrid-surface, text-core, bg-core, text-error, text-cell-activated) — no config mapping or tailwind.config.js needed"
    - "Shared class vocabulary: page container / card / card-with-core-accent / heading-h1 / button-primary / button-secondary / button-danger / text-input / label / field-error / dialog-overlay / dialog-content / dialog-title / stat-cell / stat-dt / stat-dd — consistent surfaces across all 14 components"

key-files:
  created: []
  modified:
    - src/style.css
    - src/ui/flowgrid-home/FlowgridHome.tsx
    - src/ui/flowgrid-home/FlowgridCanvas.tsx
    - src/ui/flowgrid-home/ArchivedCellsFilter.tsx
    - src/ui/cell-board/CellBoard.tsx
    - src/ui/cell-board/CellInspector.tsx
    - src/ui/cell-board/GeneratorTile.tsx
    - src/ui/cell-board/ModuleTile.tsx
    - src/ui/cell-board/CreateCellForm.tsx
    - src/ui/cell-board/EditCellForm.tsx
    - src/ui/cell-board/CellActions.tsx
    - src/ui/cell-board/SessionTimer.tsx
    - src/ui/cell-board/ResumeSessionPrompt.tsx
    - src/ui/session-summary/SessionSummary.tsx
    - src/ui/shared/ErrorBanner.tsx

key-decisions:
  - "Single body layer in @layer base (rather than per-route bg-flowgrid-bg) — every route section inherits the dark background; only style.css needs the token centrally, and #root gets min-height: 100vh so route sections fill the viewport"
  - "Conditional Activation dd className via inline ternary (activatedToday ? text-cell-activated : text-slate-100) — the one narrow className-logic exception the plan allows, presentational state only, no behavior/text change"
  - "Did NOT update 03-UAT.md test 2 from issue → pass: the plan's <output> block defers that flip until the human visual smoke (npm run dev) confirms the styling renders; the autonomous agent marks the build green and verifies the closure of the root cause (CSS bundle grows to 19.04kB), but the visual pass belongs to UAT-resume"

patterns-established:
  - "Dark-theme body layer: @layer base { body { @apply bg-flowgrid-bg text-slate-300; min-height: 100vh; ... } #root { min-height: 100vh } } — one central place to consume flowgrid-bg"
  - "Page-container vocabulary: mx-auto max-w-5xl px-4 py-6 space-y-6 — single source of truth applied to all 5 route section variants (3 in FlowgridHome + 3 in CellBoard)"
  - "Card vocabulary: rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3 (plain) or border-core/50 (Core-accented) — consistent surfaces for inspector, module tiles, generator tile, session summary, resume prompt, archived filter, error banner"
  - "Dialog chrome vocabulary: fixed inset-0 z-40 bg-black/60 overlay + fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-700 bg-flowgrid-surface p-6 shadow-2xl content — applied identically to Create Cell (FlowgridHome) and Edit Cell (CellActions) Dialogs"
  - "Button vocabulary: primary (bg-core gold + text-flowgrid-bg), secondary (border-slate-600 + text-slate-200), danger (border-error/60 + text-error) — consistent across every button in the 14 components"
  - "Form vocabulary: block label (text-sm font-medium text-slate-300) wraps label text + input; input is mt-1 block w-full rounded-md border border-slate-600 bg-slate-900/50 with focus:border-core focus-visible:ring-core; field errors are role=alert + mt-1 text-sm text-error"
  - "Stat grid vocabulary: dl is grid grid-cols-2 ... sm:grid-cols-N; each dt/dd pair is wrapped in a rounded-md bg-slate-900/40 p-2 cell — applied to CellInspector (5-up) and SessionSummary (8-up)"

requirements-completed:
  - UI-01
  - UI-05

# Metrics
duration: 12min
completed: 2026-06-24
status: complete
---

# Phase 3 Plan 4: UI Styling Gap Closure Summary

**First-pass dark-theme styling applied to all 14 Phase 3 UI components + the style.css base layer, consuming every @theme token (flowgrid-bg, flowgrid-surface, core, error, cell-activated) so the app reads as a cohesive dark-themed product — closing UAT test 2's "pure html with no styling at all" root cause (Tailwind v4 now emits utility classes, not just Preflight).**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-24T02:00:05Z
- **Completed:** 2026-06-24T02:12:03Z
- **Tasks:** 3 (all autonomous `auto`)
- **Files modified:** 15 (12 previously-unstyled components + FlowgridCanvas container + FlowgridHome + style.css base layer)

## Accomplishments
- Established a single dark-theme foundation in src/style.css via `@layer base { body { @apply bg-flowgrid-bg text-slate-300; min-height: 100vh; ... } #root { min-height: 100vh } }`. This single rule consumes the flowgrid-bg token centrally so every route section inherits the dark background — the central fix for UAT test 2's root cause ("NO component applies className utilities — only Preflight (base reset) is emitted").
- Styled the FlowgridHome route's three return branches (error / loading / ready) with the page-container layout, a gold (text-core) h1, and distinct treatments for loading/empty/active-count states; the Create Cell Radix Dialog now has a black/60 backdrop overlay and a centered surface panel with a styled title, primary "New Cell" trigger, and secondary Close button.
- Sized the FlowgridCanvas container with explicit viewport heights (`relative h-[60vh] ... sm:h-[70vh]`) so the Pixi scene is actually visible — the previous `w-full h-full` had no effect because no ancestor had a concrete height.
- Styled the Cell Board route (`/cells/:cellId`) as a page-container with a responsive 4-up module grid; the CellInspector renders a 5-up stat grid with a conditional Activation dd (`text-cell-activated` when activatedToday, `text-slate-100` otherwise — the one narrow presentational-class exception allowed by the plan).
- Rendered the protected GeneratorTile as a gold Core-accented card on both branches (idle Start / active Finish+Cancel); Start and Finish are primary gold buttons, Cancel is secondary slate, the sub-short hint is `text-sm text-error`. ModuleTile cards show a gold Core icon (`h-8 w-8 text-core`). SessionSummary is a gold-accented reward panel with an 8-up stat grid and a gold next-action hint. SessionTimer renders in a gold monospace face.
- Styled the two identity forms (CreateCellForm and EditCellForm) with block labels, slate inputs that take a core focus ring, red field-error alerts (CreateCellForm only — EditCellForm has no inline errors by existing design), and full-width gold submit buttons. CellActions is a horizontal flex row with the Edit Radix Dialog (overlay backdrop + centered surface panel, identical chrome to Create) and an Archive (danger-tinted) / Unarchive (secondary) action.
- Closed the styling gap on the ambient home surfaces too: ErrorBanner is an error-tinted alert card (role=alert preserved), ResumeSessionPrompt is a Core-accented alertdialog with primary Resume + danger Discard, ArchivedCellsFilter is a surface card with a secondary toggle and a divided archived list.
- Verified end-to-end: `npx tsc --noEmit` clean, `npx eslint .` clean (zero new violations — no imports changed), `npx vitest run` 170/170 pass (zero regressions — every test that asserts on text/role/aria-label/data-testid still passes), `npm run build` succeeds with the Tailwind v4 pipeline now emitting utility classes (CSS bundle grows from Preflight-only to 19.04 kB / 4.32 kB gz — the root-cause closure).
- Consumed every required @theme token: flowgrid-bg (style.css body layer + 5 components), flowgrid-surface (9 components), core/bg-core (9 components), error/text-error/border-error (5 components), cell-activated (CellInspector conditional Activation dd).

## Task Commits

Each task was committed atomically (all `style` type — pure presentational className additions, no behavior change):

1. **Task 1: dark-theme foundation + Flowgrid Home surface (closes UAT test 2, part 1/3)** — `1a421c6` (style)
2. **Task 2: Cell Board read surfaces — inspector, tiles, generator, summary (part 2/3)** — `dd795f5` (style)
3. **Task 3: cell management forms + Edit Dialog chrome (part 3/3)** — `31639a0` (style)

**Plan metadata:** _(pending final commit below)_

## Files Created/Modified

**Modified — base layer**
- `src/style.css` — appended `@layer base { body { @apply bg-flowgrid-bg text-slate-300; min-height: 100vh; font-family: ui-sans-serif, system-ui, ... } #root { min-height: 100vh } }` after the existing @theme block. Single central consumer of flowgrid-bg.

**Modified — Flowgrid Home route (src/ui/flowgrid-home)**
- `FlowgridHome.tsx` — page container on all 3 section variants; h1 is gold; loading/empty/count ps get distinct classes; Create Cell Dialog chrome (overlay + content + title + primary trigger + secondary close).
- `FlowgridCanvas.tsx` — container div className replaced from `w-full h-full` to `relative h-[60vh] w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900/40 sm:h-[70vh]` (ref / aria-label / role preserved).
- `ArchivedCellsFilter.tsx` — section is a surface card; toggle is a secondary button; empty state is muted; ul is divide-y; each li is flex justify-between; Unarchive buttons are secondary.

**Modified — Cell Board route (src/ui/cell-board)**
- `CellBoard.tsx` — page container on all 3 section variants; not-found h1 is text-2xl; happy-path h1 is text-3xl; not-found copy is muted; Return links are gold; Modules section is the responsive 4-up grid.
- `CellInspector.tsx` — surface card; 5-up stat dl grid; each dt/dd pair is a stat cell; dt is uppercase label, dd is text-lg; Activation dd uses the conditional ternary (`activatedToday ? text-cell-activated : text-slate-100`); recent sessions ol is muted; empty-state p is muted.
- `ModuleTile.tsx` — surface card group; tile h2 is text-base; lucide icon is `h-8 w-8 text-core`; description is muted.
- `GeneratorTile.tsx` — both branches use the core-accented card; h2 is text-core; idle/active ps are body text; Start/Finish are primary; Cancel is secondary; sub-short status is `text-sm text-error`.
- `SessionTimer.tsx` — time element gets `font-mono text-lg font-semibold text-core` (aria-live, dateTime, data-testid preserved).
- `CreateCellForm.tsx` — form is space-y-4; all 4 labels are block; all 4 inputs are slate with core focus ring; 3 field-error ps are `mt-1 text-sm text-error`; submit is full-width primary.
- `EditCellForm.tsx` — identical form styling (no field-error paragraphs by existing design — silent no-op preserved); submit is full-width primary.
- `CellActions.tsx` — section is flex flex-wrap gap-2; Edit trigger is secondary; Edit Dialog overlay + centered content + title; Close is secondary; Archive is danger-tinted; Unarchive is secondary.
- `ResumeSessionPrompt.tsx` — alertdialog is the core-accented card; explanatory p is text-slate-200; Resume is primary; Discard is danger-tinted (border-error/60).

**Modified — Session Summary (src/ui/session-summary)**
- `SessionSummary.tsx` — status/aria-live section is the core-accented card; h2 is text-core; 8-up stat dl grid; each dt/dd pair is a stat cell; dd is text-base (8 metrics fit better than inspector's text-lg); Phase-4-routing note is muted; next-action p is `rounded-md bg-slate-900/40 px-3 py-2 text-sm text-core` (aria-label preserved).

**Modified — Shared (src/ui/shared)**
- `ErrorBanner.tsx` — alert div is `rounded-lg border border-error/50 bg-error/10 p-4 space-y-1` (role + data-kind preserved); strong is `block font-semibold text-error`; both message and recoverable ps are `text-sm text-slate-300`.

## Decisions Made
- **Single body layer in @layer base, not per-route bg-flowgrid-bg** — every route section inherits the dark background; only style.css needs the token centrally. Simpler than repeating bg-flowgrid-bg on every section, and #root gets min-height: 100vh so the body's dark background always fills the viewport even before React mounts.
- **Did not flip 03-UAT.md test 2 from `issue` to `pass`** — the plan's `<output>` block explicitly defers that flip until the human visual smoke (`npm run dev`) confirms the styling renders. The autonomous agent marks the build green and verifies the root-cause closure (CSS bundle grows to 19.04 kB), but the visual pass belongs to UAT-resume. The 03-UAT.md file is untouched by this plan.
- **All other styling decisions are mechanical applications of the `<style_vocabulary>` block** — no judgment calls. Every class string in every component is verbatim from the plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Every edit was an additive `className` addition or the one allowed conditional-class ternary on the Activation dd; the 170 vitest tests (which assert on text/roles/aria-labels/data-testid, not className) passed unchanged at every task boundary. No package installs, no new files, no architectural decisions, no auth gates, no checkpoints triggered.

## User Setup Required
None — no external services, no env vars, no manual configuration. The styling is purely presentational and ships in the existing production bundle.

## Threat Mitigations Applied
The plan's threat register accepted all six threats (T-03-04-01 through T-03-04-06) because this plan adds NO new trust boundary — only presentational className strings to already-validated, already-accessible components. No mitigation code was needed; verified by inspection:
- **T-03-04-01 (Tampering via className):** every className value is a static author-controlled string literal (or the one narrow inline ternary on the Activation dd). No user/external input flows into any className.
- **T-03-04-02 (EoP via form className):** the D-11 identity-only constraint on EditCellForm is enforced structurally in the edit_cell command object, which is byte-for-byte unchanged by this plan (className additions cannot alter dispatched command payloads).
- **T-03-04-04 (Info Disclosure via ErrorBanner/SessionSummary):** these components already render their content; styling does not expose new data. The dark theme improves legibility, not disclosure.
- **T-03-04-05 (DoS):** no new loops, intervals, or effects. The existing SessionTimer setInterval is byte-for-byte unchanged.

## Next Phase Readiness
- The protected `open app → tap Cell → start session` loop is now visually usable: Flowgrid Home renders as a dark-themed page with a gold "Flowgrid" heading, a visible "New Cell" button, and (when a Cell exists) a sized canvas; the Cell Board renders as a page with an inspector card, four module tiles in a responsive grid, a gold Generator card with a visible Start button, and an actions row. This unblocks UAT tests 2–15.
- The card / button / dialog / form / stat-grid vocabulary established here is the styling template for Phase 4 (Core alternation, Rejuvenation — extends GeneratorTile and SessionSummary) and Phase 5 (Module Forge). Future UI work should reuse these exact class strings.
- The single dark-theme body layer in style.css means future route sections automatically inherit the dark background without re-styling.
- Manual verification outstanding (belongs to UAT-resume, not this plan): a real-browser pass of `npm run dev` confirming the dark theme renders, the Create Cell Dialog opens centered over a dark backdrop with styled form fields, and the Cell Board tiles/grid/inspector render as designed. happy-dom cannot exercise the visual styling layer.
- The Phase 4 routing/Rejuvenation and Phase 5 Forge surfaces will extend these patterns; no styling rework anticipated.

## Self-Check: PASSED

Modified files (verified on disk, all 15 from plan frontmatter present in git diff):
- FOUND: src/style.css
- FOUND: src/ui/flowgrid-home/FlowgridHome.tsx
- FOUND: src/ui/flowgrid-home/FlowgridCanvas.tsx
- FOUND: src/ui/flowgrid-home/ArchivedCellsFilter.tsx
- FOUND: src/ui/cell-board/CellBoard.tsx
- FOUND: src/ui/cell-board/CellInspector.tsx
- FOUND: src/ui/cell-board/GeneratorTile.tsx
- FOUND: src/ui/cell-board/ModuleTile.tsx
- FOUND: src/ui/cell-board/CreateCellForm.tsx
- FOUND: src/ui/cell-board/EditCellForm.tsx
- FOUND: src/ui/cell-board/CellActions.tsx
- FOUND: src/ui/cell-board/SessionTimer.tsx
- FOUND: src/ui/cell-board/ResumeSessionPrompt.tsx
- FOUND: src/ui/session-summary/SessionSummary.tsx
- FOUND: src/ui/shared/ErrorBanner.tsx

Task commits (verified in git log):
- FOUND: 1a421c6 (style 03-04 Task 1)
- FOUND: dd795f5 (style 03-04 Task 2)
- FOUND: 31639a0 (style 03-04 Task 3)

Token consumption verified via ripgrep across src/ui + src/style.css:
- flowgrid-bg: style.css (body layer) + 5 components
- flowgrid-surface: 9 components
- core (bg-core / text-core): 9 components
- error (text-error / border-error / bg-error): 5 components
- cell-activated: CellInspector (conditional Activation dd)

Plan-level verification (full gate green):
- PASS: `npx tsc --noEmit` (zero errors; className is a string, JSX parses cleanly)
- PASS: `npx eslint .` (zero problems; no imports changed so layer-boundary rules unaffected)
- PASS: `npx vitest run` — 170/170 tests pass across node + happy-dom projects (zero regressions; every text/role/aria-label/data-testid assertion still holds)
- PASS: `npm run build` — Vite production build succeeds (805 modules, 281 ms); Tailwind v4 now emits utility classes (CSS bundle 19.04 kB / 4.32 kB gz, up from Preflight-only — the root-cause closure)
- DEFERRED: real-browser visual smoke — belongs to UAT-resume (the autonomous agent cannot exercise the visual styling layer; happy-dom has no rendering pipeline)

---
*Phase: 03-playable-generator-flowgrid*
*Completed: 2026-06-24*
