---
phase: 05-module-forge-and-starter-customization
plan: 03
subsystem: ui
tags: [react, react-router, forge, accessible-ui, inline-summary, zustand, lucide-react, tailwind]

# Dependency graph
requires:
  - phase: 05-module-forge-and-starter-customization
    provides: Plan 05-01 atomic run_forge handler + pure forgeChoices selector + MODULE_LEVEL_BONUS content table + widened ForgeHistoryRecord + RunForgeCommand extension
  - phase: 05-module-forge-and-starter-customization
    provides: Plan 05-02 Dexie v4 migration + Zod forgeHistorySchema drift guard (durable widened ForgeHistoryRecord round-trips)
  - phase: 04-core-alternation-and-rejuvenation-economy
    provides: CorePanel + RejuvenationSummary + captureCompletedRejuvenation + lastCompletedRejuvenation + ReturnCues chip rail + /core route peer pattern
provides:
  - lastCompletedForge store field on FlowgridState (mirrors lastCompletedRejuvenation)
  - captureCompletedForge(command, result) helper wired into dispatch setState + hydrate/init resets
  - /forge route entry peer to /core
  - ForgePanel route component (Tokens/Energy/next-cost readout + Token/Energy roll controls + reveal + inline ForgeSummary mount + rejection surface)
  - ForgeSummary inline panel (role=status aria-live=polite — NOT a modal, mirrors RejuvenationSummary)
  - ForgeChoiceList presentational component (3 revealed rows with kind icon + Cell name + per-level effect + Pick button)
  - ReturnCues Forge chip (canForge boolean + "Forge ready" tappable navigate('/forge') — lives in the rail above the canvas, never intercepts the Cell tap)
  - CellBoard level/effect resolution (findModuleInstanceForCell + moduleLevelBonus) threaded into ModuleTile
  - ModuleTile level badge ("Generator · Lv N") + per-level effect line reading MODULE_LEVEL_BONUS (UI ↔ sim agreement, D-13)
affects: [06-hardening visual/canvas smoke + accessibility audit, future variant-swap install_module phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline-summary-not-modal (D-11, Pitfall 7): ForgeSummary is <section role=status aria-live=polite> rendered by ForgePanel while lastCompletedForge !== null — modals obstruct the protected open app → tap Cell → start session flow"
    - "Pure-selector-called-as-read at the UI/sim boundary: ForgePanel imports forgeChoices + forgeEnergyCost and calls them as pure projections over the snapshot; never mutates economy, never imports the run_forge handler (T-05-11)"
    - "Two-step roll UX (Agent's Discretion per plan): user taps 'Roll with Token'/'Roll with Energy' to set a local-state pendingPaymentType, then taps a choice's 'Pick' button to commit the RunForgeCommand — keeps the dispatch atomic while surfacing the payment choice clearly"
    - "Protected Generator flow (prohibition 1, Pitfall 7): Forge chip lives in the ReturnCues rail above the canvas and navigates to /forge; it never mounts inside CellBoard or GeneratorTile (rg returns 0 matches in src/ui/cell-board/)"

key-files:
  created:
    - src/ui/forge-panel/ForgePanel.tsx
    - src/ui/forge-panel/ForgeSummary.tsx
    - src/ui/forge-panel/ForgeChoiceList.tsx
  modified:
    - src/app/store/flowgrid-store.ts
    - src/app/store/dispatch.ts
    - src/app/routes.tsx
    - src/ui/flowgrid-home/ReturnCues.tsx
    - src/ui/cell-board/CellBoard.tsx
    - src/ui/cell-board/ModuleTile.tsx

key-decisions:
  - "Two-step roll UX: user picks a payment (Token/Energy) via local-state pendingPaymentType, then picks a revealed choice. This keeps the dispatch atomic (single RunForgeCommand carrying paymentType + chosenReward) while making the payment choice explicit in the UI. The Pick button is disabled until a payment is selected."
  - "KIND_LABELS map lives in ForgeChoiceList.tsx and is exported for ForgeSummary to reuse — avoids a parallel label table and keeps the human-readable kind strings DRY across the three forge-panel components."
  - "ForgeSummary takes a cellNameById: ReadonlyMap<string, string> prop (threaded from ForgePanel's snapshot.cells) rather than reaching into the store — keeps ForgeSummary pure and testable, mirrors the record+core-only boundary rule from RejuvenationSummary."
  - "Bloom's per-level effect line uses a flat magnitude ('+X per level · current bonus +Y'), not a percent — matches Plan 05-01 A5 (Bloom grants +1+level activation/momentum, not a percentage). The other three kinds render '+X% per level · current bonus +Y%'."

patterns-established:
  - "Pattern: route-peer component mirrors CorePanel exactly — local env builder (FORGE_SEED + buildForgeEnv), loading guard, store selectors (snapshot + lastCompletedX + lastRejection), affordability-gated buttons, inline summary mount, rejection surface. ForgePanel is a near-clone of CorePanel with the forge-specific dispatch."
  - "Pattern: captureCompletedX → lastCompletedX mirrors captureCompletedSession/captureCompletedRejuvenation line-for-line (undefined-guard spread so the field only updates when this dispatch was the matching command type; persists until the next dispatch supersedes it — D-10/D-11 no auto-dismiss)."
  - "Pattern: UI reads the SAME MODULE_LEVEL_BONUS content table the simulation reads — ModuleTile's effect line and ForgeChoiceList's effect text both derive from it, so the UI and simulation can never disagree on what a level does (UI ↔ sim agreement, D-13)."

requirements-completed: [MOD-02, MOD-03, MOD-06]

# Metrics
duration: 20min
completed: 2026-06-26
status: complete
---

# Phase 5 Plan 03: Forge UI Surface + Module Inspection Summary

**`/forge` route with ForgePanel + ForgeSummary + ForgeChoiceList (pure forgeChoices selector called as a read), lastCompletedForge store field mirroring lastCompletedRejuvenation, ReturnCues "Forge ready" chip in the rail above the canvas, and CellBoard ModuleTile level badges + per-level effects reading the shared MODULE_LEVEL_BONUS table — the full Forge loop is now drivable through normal accessible UI**

## Performance

- **Duration:** ~20 min (3 task commits spanned 2026-06-25T23:27:33Z → 23:33:24Z; verification + summary added ~15 min)
- **Started:** 2026-06-25T23:27:33Z
- **Completed:** 2026-06-26T03:50:00Z
- **Tasks:** 3 autonomous tasks complete; Task 4 (human visual smoke) pending human verification
- **Files modified:** 9 (3 created + 6 modified)

## Accomplishments
- Shipped the `/forge` route peer to `/core` with the full ForgePanel: Tokens/Energy/next-cost readout, Token + Energy roll controls gated on affordability + reveal availability, the 3 revealed choices rendered by ForgeChoiceList (kind icon + Cell name + per-level effect + Pick button), and an inline ForgeSummary mount on success
- Wired `lastCompletedForge` into the store + dispatch: `captureCompletedForge(command, result)` mirrors `captureCompletedRejuvenation` line-for-line; the undefined-guard setState spread means the field only updates on a successful `run_forge` and persists until the next dispatch (D-11 no auto-dismiss); hydrate/init both reset it to null
- Surfaced Forge readiness on Home via the ReturnCues rail: a `canForge` boolean (moduleTokens > 0 OR energy >= forgeEnergyCost(forgeCount)) drives a tappable "Forge ready" chip that navigates to `/forge`. The chip lives in the rail above the canvas and NEVER intercepts the protected Cell tap (Pitfall 7 — rg returns 0 matches in src/ui/cell-board/)
- Extended the Cell Board module tiles (MOD-02, D-13): CellBoard resolves each starter module's level via `findModuleInstanceForCell` + per-level effect via `moduleLevelBonus` and passes both to ModuleTile, which now renders a "Label · Lv N" badge and a per-level effect line reading MODULE_LEVEL_BONUS (the same content table the simulation reads — UI ↔ sim agreement)
- Kept the protected `open app → tap Cell → start session` flow unobstructed: ForgeSummary is an inline `<section role=status aria-live=polite>` (NOT a modal, NOT a toast — D-11), and the Forge chip is a ReturnCues rail element (NOT a CellBoard/GeneratorTile element)

## Task Commits

Each task was committed atomically:

1. **Task 1: lastCompletedForge store field + captureCompletedForge dispatch wiring** - `92cd66c` (feat)
2. **Task 2: /forge route + ForgePanel + ForgeSummary + ForgeChoiceList** - `60607d5` (feat)
3. **Task 3: ReturnCues Forge chip + CellBoard/ModuleTile level badge** - `4493f1b` (feat)
4. **Task 4: Human visual smoke of the Forge loop** - *(pending human verification — see Checkpoints section)*

**Plan metadata:** *(pending final commit)*

## Files Created/Modified
- `src/app/store/flowgrid-store.ts` - Added ForgeHistoryRecord to the type import; added `lastCompletedForge: ForgeHistoryRecord | null` field to FlowgridState (with Phase 5/D-11 comment paralleling lastCompletedRejuvenation); added `lastCompletedForge: null` to the createStore initial state
- `src/app/store/dispatch.ts` - Added ForgeHistoryRecord to the type import; added `captureCompletedForge(command, result)` helper (mirrors captureCompletedRejuvenation — run_forge guard + id match + last-entry fallback); wired it into the dispatch setState spread with the undefined-guard; reset to null in hydrateStoreForTests + initApp
- `src/app/routes.tsx` - Imported ForgePanel; added `{ path: '/forge', element: <ForgePanel /> }` peer to /core
- `src/ui/forge-panel/ForgePanel.tsx` (NEW) - The /forge route component: Tokens/Energy/next-cost readout, Token + Energy roll controls (local-state pendingPaymentType), ForgeChoiceList mount, inline ForgeSummary mount, rejection surface, loading guard
- `src/ui/forge-panel/ForgeSummary.tsx` (NEW) - Inline completion panel mirroring RejuvenationSummary: `<section role=status aria-live=polite>` with Payment / Forge Count / Module Upgraded / Level cells + offered-choices list; reads forgeEnergyCost(core.forgeCount) as the only derived display value (PURE content fn)
- `src/ui/forge-panel/ForgeChoiceList.tsx` (NEW) - Presentational list of the 3 revealed ForgeChoice rows: kind-keyed lucide icon + Cell name + kind label + per-level effect magnitude (MODULE_LEVEL_BONUS) + semantic Pick button; exports KIND_LABELS for ForgeSummary reuse
- `src/ui/flowgrid-home/ReturnCues.tsx` - Added `nextForgeEnergyCost` + `canForge` booleans; extended the render-nothing guard to include `&& !canForge`; added the tappable "Forge ready" chip (navigate('/forge')) in the rail after the near-Bloom chip
- `src/ui/cell-board/CellBoard.tsx` - Imported findModuleInstanceForCell + moduleLevelBonus; in the STARTER_TILES render loop, resolve each tile's level + per-level effect and pass them as new props to ModuleTile
- `src/ui/cell-board/ModuleTile.tsx` - Extended ModuleTileProps with `level` + `levelEffect`; render "Label · Lv N" badge in the h2; render a per-level effect line below the description (bloom uses flat magnitude, others use percent) reading MODULE_LEVEL_BONUS

## Decisions Made
- **Two-step roll UX (Agent's Discretion per plan):** The plan offered Agent's Discretion on the exact UX flow with the constraint that the chosen dispatch carries the correct paymentType. Implemented as: user taps "Roll with Token" or "Roll with Energy" to set a local-state `pendingPaymentType`, then taps a choice's "Pick" button to commit. The Pick buttons are disabled until a payment is selected. This keeps the dispatch atomic (single RunForgeCommand carrying paymentType + chosenReward) while making the payment choice explicit and auditable in the UI.
- **KIND_LABELS map location:** Lives in ForgeChoiceList.tsx and is exported for ForgeSummary to reuse. The starter module definitions (content/starter-modules.ts) carry `kind` + `phase1Behavior` but no display label, so the UI owns this small map. Centralizing it in ForgeChoiceList avoids a parallel label table and keeps the human-readable kind strings DRY across the three forge-panel components.
- **ForgeSummary takes a cellNameById prop** (threaded from ForgePanel's snapshot.cells) rather than reaching into the store directly. This keeps ForgeSummary pure and testable, and mirrors the record+core-only boundary rule from RejuvenationSummary (all economy numbers come from the passed record + CoreRecord; the only derived display value uses the PURE forgeEnergyCost content fn).
- **Bloom per-level effect phrasing:** ModuleTile and ForgeChoiceList render Bloom's effect as a flat magnitude ("+X per level · current bonus +Y") rather than a percent, matching Plan 05-01 A5 (Bloom grants +1+level activation/momentum, not a percentage). The other three kinds render "+X% per level · current bonus +Y%".

## Deviations from Plan

None - plan executed exactly as written. All three autonomous tasks (1, 2, 3) were implemented per spec; all acceptance-criteria grep counts met or exceeded the required thresholds; `npx tsc --noEmit`, `npm run lint`, `npm test` (225/225), and `npm run build` are all green. Task 4 is a documented `checkpoint:human-verify` (see Checkpoints section) — not a deviation.

## Checkpoints

### Task 4: Human visual smoke of the Forge loop — PENDING HUMAN VERIFICATION

**Type:** `checkpoint:human-verify` (gate: blocking)
**Status:** Deferred — autonomous agent cannot run a real-browser visual smoke.

The plan is `autonomous: false` and Task 4 is a documented `checkpoint:human-verify` requiring a human to run `npm run dev`, open the dev URL in a real browser, and walk a 10-step click flow (confirm Forge chip on Home, navigate to /forge, verify Tokens/Energy/next-cost render, roll + pick, confirm inline ForgeSummary appears, navigate to the upgraded Cell's Board to confirm the level badge, reload to confirm persistence + summary clearing, exercise the disabled/unaffordable + all-maxed edge cases).

**What the autonomous agent has already verified:**
- `npm run build` is green (UI compiles, 822 modules transformed, no TypeScript errors)
- `npm test` is green (225/225 tests pass — including the 18 forge simulation tests from Plans 05-01)
- `npm run lint` is clean
- `npx tsc --noEmit` passes
- The dispatch wiring is correct (`captureCompletedForge` mirrors `captureCompletedRejuvenation`; the undefined-guard setState spread is in place)
- The route is registered (`path: '/forge'` peer to `/core`)
- The Forge chip lives in the ReturnCues rail (rg returns 0 matches for canForge/Forge ready/navigate('/forge') in src/ui/cell-board/)
- ForgeSummary is an inline `<section role=status aria-live=polite>` (rg returns 0 matches for modal/Dialog/toast in src/ui/forge-panel/)
- All Task 1/2/3 acceptance-criteria grep counts meet or exceed thresholds

**What the autonomous agent CANNOT verify:** that the visual render and the end-to-end click flow feel right in a real browser.

**Steps for the human (from the plan):**
1. `npm run dev` and open the dev URL in a browser.
2. If you have no Module Tokens / Energy: complete a focus session or two from a Cell Board to generate Current, then visit /core to route it through Output → Core → Energy (allocate 100% convert), then visit /core and log a rejuvenation to convert Core Charge → Integration → Module Tokens. Alternatively, use the browser DevTools to skip the economy.
3. From Home, confirm the ReturnCues rail shows a "Forge ready" chip when moduleTokens > 0 OR energy >= 50.
4. Click "Forge ready" → navigates to /forge.
5. On /forge, confirm: current Module Tokens, current Energy, next Energy cost (50 + forgeCount*25 — initially 50), the 3 revealed choices each naming a Cell + module kind + level transition + per-level effect.
6. Tap "Roll with Token" (or "Roll with Energy" if ≥50 energy) → paymentType is set. Tap "Pick" on one of the 3 choices.
7. Confirm the inline ForgeSummary appears (NOT a modal): shows payment spent, the 3 offered choices, the chosen reward + level change, the new forgeCount.
8. Navigate to a Cell Board for the Cell whose module you upgraded. Confirm the module tile shows the level badge and per-level effect line.
9. Reload. Confirm ForgeSummary is gone (initApp resets it) but the module level badge persists (Plan 05-02 v4 migration) and the Forge chip still shows if affordable.
10. Try rolling when unaffordable: confirm roll buttons disabled. Max a module (forge up to MODULE_MAX_LEVEL=3) and confirm it drops from the reveal; if ALL modules across ALL cells are maxed, confirm both roll buttons disabled with the "All starter modules are at max level" message.

**Resume signal:** Human types "approved" or describes what's broken/missing. Until then, Phase 5 should be considered code-complete but not visually-confirmed; Phase 6 (Hardening, Accessibility, and Trust) owns the formal browser/canvas/accessibility smoke checks (VER-04/VER-05/VER-06) that will re-exercise this flow.

## Issues Encountered
None. The three autonomous tasks compiled, linted, tested, and built green on the first verification pass — no deviation rules were triggered.

## User Setup Required
None - no external service configuration required. This plan is pure UI-layer TypeScript/React with no new dependencies, no environment variables, and no runtime configuration.

## Next Phase Readiness
- **Phase 5 code-complete:** All three plans (05-01 simulation truth, 05-02 persistence migration, 05-03 UI surface) are shipped. The full Forge loop is drivable through normal accessible UI: Home Forge chip → /forge → roll + pick → inline ForgeSummary → Cell Board level badge. MOD-02/MOD-03/MOD-04/MOD-05/MOD-06/MOD-07 are all delivered at the code layer.
- **Deferred verification:** The Task 4 human visual smoke is the only outstanding Phase 5 item. Phase 6's VER-04/VER-05/VER-06 (browser, accessibility, canvas smoke checks covering create Cell through Forge) will re-exercise this flow as part of the hardening phase, so the deferral is low-risk.
- **Phase 6 (Hardening, Accessibility, and Trust):** Ready to plan. The Forge UI follows the existing CorePanel accessibility pattern (semantic `<button>`, aria-describedby, aria-live regions); Phase 6's accessibility audit will cover it alongside the rest of the app.
- **No blockers.** The autonomous portion of Phase 5 is fully complete and green.

---
*Phase: 05-module-forge-and-starter-customization*
*Completed: 2026-06-26*

## Self-Check: PASSED

All 9 created/modified files exist on disk (3 created in src/ui/forge-panel/ + 6 modified across app/store, app/routes, flowgrid-home, cell-board). All 3 task commits (92cd66c, 60607d5, 4493f1b) present in git log. `npx tsc --noEmit` green. `npm test -- --run` green (225/225 tests pass). `npm run lint` clean. `npm run build` succeeds (822 modules transformed, dist/ emitted). All Task 1/2/3 acceptance-criteria grep counts met or exceeded thresholds. Task 4 (human visual smoke) is the only deferred item — documented in the Checkpoints section, not a self-check failure (it requires a real browser).
