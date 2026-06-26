---
phase: 06-hardening-accessibility-and-trust
verified: 2026-06-26T20:25:00Z
status: human_needed
score: 5/5 success-criteria verified on structural + behavioral grounds
behavior_unverified: 2
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: N/A
  gaps_closed: []
  gaps_remaining: []
  regressions: []
behavior_unverified_items:
  - truth: "PixiJS/Canvas/WebGL visuals render Current movement, Bloom bursts, Core convert/charge ripples, forge/token feedback as visible animation (SC2 visual-fidelity half)"
    test: "Open the production build in a real browser with WebGL, start a focus session, run it to completion, log a rejuvenation, and run a forge roll; observe the canvas."
    expected: "Particle Current trails visibly flow from Cell hexes toward the Core while a focus session is active; Bloom burst radiates on completion; Core convert ripple and store ripple animate on allocation/rejuvenation; forge-roll and token-granted flashes animate on /forge and /core. Reduced-motion ON yields static hexes/halos with no animation."
    why_human: "Automation proves structure (VER-06 scene-graph probe: cells>0, core===true, routes>=0), wiring (emitBurst/emitTrail/emitParticles consume visual events), and economy neutrality (VER-06 reduced-motion durability), but cannot confirm the animations read visually as 'current flowing' or 'bloom bursting' — that requires human eyes on a real GPU."
  - truth: "User can trust Flowgrid as a daily local-first app because the complete browser flow feels release-ready (Phase Goal qualitative half)"
    test: "Manual full-flow walkthrough against the production build (`npm run build && npm run preview`): create Cell, focus, complete, inspect, set allocation, log rejuvenation, forge, reload, export — across keyboard and pointer."
    expected: "Every step completes without friction; reload preserves all state; keyboard navigation reaches every critical action; canvas animations enhance rather than obscure the experience."
    why_human: "The qualitative 'feels release-ready' bar is downstream of every SC and cannot be fully captured by per-feature automation."
human_verification:
  - test: "Visual animation fidelity inspection on a real GPU (not SwiftShader headless)"
    expected: "Current trails, Bloom bursts, Core convert/store ripples, forge/token flashes visibly animate during their respective events; reduceMotion=true stops all animation while leaving the static scene visible; the WebGL-fail path shows the friendly inline note with a Settings link."
    why_human: "VER-06 pixel-variance is intentionally skipped (Pixi v8 preserveDrawingBuffer:false defeats readback) — the structural probe is the always-run check, but it cannot see whether particles actually move or whether the motion reads as 'Current flowing'. A human must watch the canvas during real interaction."
  - test: "Axe + keyboard spot-check in a real browser session"
    expected: "No contrast, focus-order, or ARIA regressions surface when navigating live (VER-05 runs axe in headless Chromium, but a final human a11y pass on the production build is the release-readiness gate the Phase Goal names)."
    why_human: "Headless axe is necessary but not sufficient for the 'feels trustworthy as a daily app' bar."
---

# Phase 6: Hardening, Accessibility, and Trust — Verification Report

**Phase Goal:** User can trust Flowgrid as a daily local-first app because the complete browser flow, semantic controls, visual rendering contract, settings, recovery states, and release checks are verified.
**Verified:** 2026-06-26T20:25:00Z
**Status:** human_needed — all automated checks pass; 2 human-verification items remain (visual animation fidelity + qualitative release-readiness on a real GPU)
**Re-verification:** No — initial verification

## Summary

Phase 6 is structurally complete. All five Success Criteria are satisfied by the codebase and the automated gates confirm the load-bearing invariants. Every Phase 6 requirement (UI-02, UI-03, UI-04, UI-06, VER-04, VER-05, VER-06) is implemented in code. Two human-verification items remain — both concern the qualitative visual/release-readiness half of the Phase Goal that automation cannot fully capture (the structural probe is always-run, but Pixi v8 `preserveDrawingBuffer:false` defeats pixel readback, so the pixel-variance check is intentionally skipped).

A separate **traceability drift WARNING** is documented below: REQUIREMENTS.md still marks UI-03 and UI-04 as `[ ]` / "Pending" in both the requirement list (lines 74-75) and the Traceability table (lines 188-189), even though the code fully implements both (verified in this report). This is a stale-documentation issue for the orchestrator to resolve, not a code gap.

## Automated Gates (all green)

| Gate | Command | Result | Status |
| ---- | ------- | ------ | ------ |
| Type-check | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint (render layer + FlowgridCanvas) | `npx eslint src/render/flowgrid/ src/ui/flowgrid-home/FlowgridCanvas.tsx` | exit 0 — layer boundary respected (no React/Dexie/Zustand/DOM imports in render) | ✓ PASS |
| Unit + property suite | `npx vitest run` | exit 0 — 42 files / 242 tests pass (e2e excluded) | ✓ PASS |
| E2E suite (production build) | `npx playwright test` | exit 0 — 9 passed, 1 skipped (pixel-variance, intentionally skipped in CI / on uniform readback) | ✓ PASS |

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | User can complete every critical action through semantic non-canvas controls (create Cell, start/finish session, inspect Cell, set Core allocation, log rejuvenation, forge, install reward, view history, export) | ✓ VERIFIED | `FlowgridHome.tsx:139-150` mounts always-visible `<nav aria-label="Cells">` with `<ul>` of `<Link to="/cells/{id}">` entries — the last UI-02 gap (open existing Cell) is now closed. All other critical actions already had semantic controls from Phases 3-5. `tests/ui/cell-list-a11y.test.tsx` (5 tests) proves nav semantics, link count, hrefs, Tab-focusability, unconditional presence. VER-05 E2E (`accessibility.spec.ts:66-87`) drives Cell list → Start → Finish via `page.keyboard` only (no pointer clicks). |
| 2 | PixiJS/Canvas/WebGL visuals render nonblank Cells, Core, routes, Current movement, Bloom bursts, and Core conversion/storage feedback from simulation-emitted visual events | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED (structure + wiring verified; visual fidelity needs human — see Human Verification) | Structure: `scene-inspect.ts:summarizeScene` returns aggregate `{cells, core, routes}`; VER-06 E2E asserts `cells > 0 && core === true && routes >= 0` (passes). Wiring: D-04 events `forgeRollVisual`/`moduleUpgradeVisual`/`tokenGrantedVisual` emitted in `run-forge.ts:230-236` + `log-rejuvenation.ts:161`; `particles.ts:EVENT_EMIT_PARAMS` covers all 8 visual events (bloom/activation/coreConvert/coreChargeStore/currentFlow/forgeRoll/moduleUpgrade/tokenGranted) and `emitParticles` dispatches burst/trail by entityType. Build-once pattern: `updateFlowgridScene` (scene.ts:267) mutates in place and never calls `destroyFlowgridScene` (verified). Gap: VER-06 pixel-variance is intentionally skipped (Pixi v8 `preserveDrawingBuffer:false`), so automation cannot confirm animations visually read as Current/Bloom/Core. |
| 3 | Dropping, reducing, replaying, or skipping visual events never changes durable economy state | ✓ VERIFIED | (a) ESLint boundary at `eslint.config.js:131-176` physically forbids render layer from importing Dexie/app/persistence — renderer has no write path. (b) UI-04 property test `tests/properties/visual-event-safety.property.test.ts` — 2 properties × 100 runs each across 5 representative commands asserting `{...result, visualEvents: []}` leaves `nextState`/`operations`/`validationIssues` byte-identical. (c) VER-06 E2E reduced-motion durability (`canvas-smoke.spec.ts:111-139`) proves motion ON vs OFF yields identical Current/XP grants — behavioral proof of the invariant in a real browser. |
| 4 | User can configure default session length, daily target defaults, local day boundary, reduced motion, and export from minimal settings | ✓ VERIFIED | `SettingsPanel.tsx:194-273` renders all four editable controls (defaults + reduced-motion checkbox) with form validation; `handleExportJson`/`handleExportCsv`/`handleImportConfirm` wire D-11/D-13 export/import through the persistence barrel. `/settings` route registered at `routes.tsx:30-31`. D-12 property test (`update-settings.property.test.ts`) confirms existing Cells' `dailyMilestoneTargetSeconds` unchanged after defaults edit. Dexie v4→v5 migration (`database.ts:266-279` + `upgradeSettingsV4ToV5:150`) defaults `reduceMotion=false` on existing rows. |
| 5 | Browser, accessibility, and canvas smoke checks cover create Cell through Forge, reload with state preserved, keyboard access, semantic UI paths, and reduced/disabled motion | ✓ VERIFIED | `playwright.config.ts` runs `npm run build && npm run preview -- --strictPort` (production build) with SwiftShader WebGL flags. `release-flow.spec.ts` (VER-04) drives full flow + `page.reload()` (line 77) with post-reload durability assertions. `accessibility.spec.ts` (VER-05) drives keyboard-only flow + `AxeBuilder` from `@axe-core/playwright` (official package) on 5 routes asserting `violations === []`. `canvas-smoke.spec.ts` (VER-06) consumes `window.__flowgridInspect` + asserts reduced-motion economy equivalence. All 9 active specs pass; 1 skipped (pixel-variance, intentionally). |

**Score:** 5/5 success-criteria verified on structural + behavioral grounds (2 with behavior-unverified visual-fidelity pieces detailed in Human Verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/simulation/commands/update-settings.ts` | update_settings command handler | ✓ VERIFIED | 110 lines, full validate→apply→emit→return, HH:MM regex, no throw |
| `src/ui/settings/SettingsPanel.tsx` | /settings route component | ✓ VERIFIED | 375 lines, all 4 controls + export/import + D-09 OS-preference mount effect |
| `src/ui/settings/reduce-motion.ts` | effectiveReduceMotion + prefersReducedMotion | ✓ VERIFIED | 22 lines, both exports present |
| `src/ui/shared/download.ts` | triggerDownload helper | ✓ VERIFIED | referenced by SettingsPanel export handlers |
| `src/persistence/database.ts` | Dexie version(5) + upgradeSettingsV4ToV5 + SETTINGS_V5_DEFAULTS | ✓ VERIFIED | lines 142, 150-157, 266-279; full 10-store set repeated verbatim |
| `src/persistence/export-json.ts` | ARCHIVE_VERSION stays 2 (no bump) | ✓ VERIFIED | line 48 `ARCHIVE_VERSION = 2` with documenting comment (lines 43-47) |
| `src/render/flowgrid/scene.ts` | updateFlowgridScene (in-place, never rebuild) | ✓ VERIFIED | `updateFlowgridScene` at line 267; grep confirms no `destroyFlowgridScene`/`buildFlowgridScene` calls inside |
| `src/render/flowgrid/particles.ts` | ParticleContainer pool + emitBurst/emitTrail/emitParticles | ✓ VERIFIED | 213 lines, all 3 exports + 8-event emit table, no `@pixi/particle-emitter` import |
| `src/render/flowgrid/motion.ts` | Ticker + custom lerp + reduceMotion gate | ✓ VERIFIED | 91 lines, `app.ticker.add`, `stopMotion`/`startTicker`, `tweenTowards` custom exp lerp, no `@pixi/tween` import |
| `src/render/flowgrid/scene-inspect.ts` | summarizeScene aggregate probe | ✓ VERIFIED | 51 lines, returns only `{cells, core, routes}` — no Pixi refs leak |
| `src/ui/flowgrid-home/FlowgridCanvas.tsx` | build-once + particle emit + WebGL-fail note + reduceMotion gate + scene-inspect probe | ✓ VERIFIED | 249 lines, all 5 sub-features present (D-05/D-01/D-09/D-07/D-16) |
| `src/ui/flowgrid-home/FlowgridHome.tsx` | semantic Cell list nav alongside canvas | ✓ VERIFIED | lines 139-150: `<nav aria-label="Cells">` + sr-only `<h2>` + `<ul>` of `<Link>` |
| `playwright.config.ts` | production-build webServer + SwiftShader flags | ✓ VERIFIED | 25 lines, all 3 flags present, port 4173 |
| `tests/e2e/release-flow.spec.ts` | VER-04 full flow + reload | ✓ VERIFIED | 84 lines, `page.reload()` at line 77, full critical-flow coverage |
| `tests/e2e/accessibility.spec.ts` | VER-05 keyboard + axe per route | ✓ VERIFIED | 121 lines, `AxeBuilder` from `@axe-core/playwright`, 5 routes, keyboard-only flow |
| `tests/e2e/canvas-smoke.spec.ts` | VER-06 scene probe + pixel + reduced-motion | ✓ VERIFIED | 140 lines, consumes `__flowgridInspect`, pixel-variance guarded, reduced-motion economy equivalence |
| `tests/ui/cell-list-a11y.test.tsx` | keyboard + semantic a11y test | ✓ VERIFIED | 156 lines, 5 tests covering nav semantics, link count, Tab-focus, unconditional presence, empty-state |
| `tests/properties/visual-event-safety.property.test.ts` | UI-04 property | ✓ VERIFIED | 229 lines, 2 properties × 100 runs each across 5 commands |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `src/app/routes.tsx` | `src/ui/settings/SettingsPanel.tsx` | `path: '/settings'` entry | ✓ WIRED | routes.tsx:30-31 |
| `SettingsPanel.tsx` | `commands/update-settings.ts` | `dispatch({ type: 'update_settings', ... })` | ✓ WIRED | SettingsPanel.tsx:125-132 + engine.ts:41 dispatcher case |
| `SettingsPanel.tsx` | `export-json.ts` / `export-csv.ts` / `import.ts` | persistence barrel (`exportJson`/`exportSessionCsv`/`importArchive`) | ✓ WIRED | SettingsPanel.tsx:24-27 imports, lines 139/153/171 calls |
| `engine.ts` | `update-settings.ts` | `case 'update_settings'` dispatcher | ✓ WIRED | engine.ts:41 |
| `operation-events.ts` | settings entityType routing | `case 'update_settings': return 'settings'` | ✓ WIRED | operation-events.ts:23 + 58 |
| `FlowgridCanvas.tsx` | `scene.ts` | `updateFlowgridScene` (no destroy+rebuild) | ✓ WIRED | FlowgridCanvas.tsx:146 onSnapshot callback |
| `FlowgridCanvas.tsx` | `particles.ts` | `emitParticles` gated on reduceMotion | ✓ WIRED | FlowgridCanvas.tsx:148-158 onVisualEvents callback |
| `FlowgridCanvas.tsx` | `scene-inspect.ts` | `window.__flowgridInspect = () => summarizeScene(app)` | ✓ WIRED | FlowgridCanvas.tsx:122-129, exposed unconditionally |
| `FlowgridHome.tsx` | CellBoard route | `<Link to={\`/cells/${cell.id}\`}>` | ✓ WIRED | FlowgridHome.tsx:144 |
| `run-forge.ts` | `visual-events.ts` | `forgeRollVisual` + `moduleUpgradeVisual` | ✓ WIRED | run-forge.ts:32 import, lines 230+236 emissions |
| `log-rejuvenation.ts` | `visual-events.ts` | `tokenGrantedVisual` inside `if (tokensGranted > 0)` guard | ✓ WIRED | log-rejuvenation.ts:40 import, line 161 emission |
| `canvas-smoke.spec.ts` | `window.__flowgridInspect` | `page.evaluate(() => ...__flowgridInspect())` | ✓ WIRED | canvas-smoke.spec.ts:32-34 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| SettingsPanel | `sessionLength`/`dailyTarget`/`localDayBoundary`/`reduceMotion` | `useFlowgridStore(s => s.snapshot)` | ✓ snapshot seeded from Dexie singleton | ✓ FLOWING |
| FlowgridHome Cell list | `activeCells` | existing derivation (line 66) over `state.cells` | ✓ seeded from real Cell records | ✓ FLOWING |
| FlowgridCanvas | `sceneRefs` | `buildFlowgridScene(app, snapshot, ...)` | ✓ built from `pickActiveCells(snapshot)` | ✓ FLOWING |
| VER-06 reduced-motion comparison | `off.current`/`on.current` | real session completion via `page.getByRole('status', { name: 'Session summary' })` | ✓ production-build SessionSummary | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Dexie v4→v5 migration transforms v4 row | (covered by `tests/persistence/migration-harness.test.ts` "v4 -> v5 settings migration" describe) | 2 fixtures pass — defaults `reduceMotion=false` on absent field | ✓ PASS |
| UI-04 visual-event safety property | `npx vitest run tests/properties/visual-event-safety.property.test.ts` | 2 tests / 200 assertions pass (100 runs × 2 properties) | ✓ PASS |
| VER-04 reload-with-state | `npx playwright test tests/e2e/release-flow.spec.ts` | 1 spec passes — Cell persists across `page.reload()` | ✓ PASS |
| VER-05 keyboard-only flow + axe | `npx playwright test tests/e2e/accessibility.spec.ts` | 6 specs pass (1 keyboard + 5 axe-per-route, `violations === []`) | ✓ PASS |
| VER-06 scene-graph structural probe | `npx playwright test tests/e2e/canvas-smoke.spec.ts` | 2 specs pass + 1 skip (scene-graph + reduced-motion durability pass; pixel-variance intentionally skipped) | ✓ PASS |
| Cell-list a11y component test | `npx vitest run tests/ui/cell-list-a11y.test.tsx` | 5 tests pass (nav semantics, link count, Tab-focus, peer, empty-state) | ✓ PASS |
| ESLint render-layer boundary enforcement | `npx eslint src/render/flowgrid/` | exit 0 — boundary rules at eslint.config.js:131-176 active | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| UI-02 | 06-03 | Semantic non-canvas controls for every critical action (incl. open existing Cell) | ✓ SATISFIED | `FlowgridHome.tsx:139-150` semantic Cell list + 5 a11y tests + VER-05 keyboard E2E |
| UI-03 | 06-02 | PixiJS/Canvas/WebGL visuals render Cells, Core, routes, Current movement, Bloom bursts, Core conversion/storage feedback from simulation-emitted visual events | ✓ SATISFIED (code) — ⚠️ traceability drift (REQUIREMENTS.md lines 75 + 188 still show "Pending") | Full-motion renderer: scene/particles/motion/scene-inspect all substantive; D-04 visual events wired; VER-06 scene-graph probe passes. Visual-fidelity piece routed to human verification. **Traceability drift: REQUIREMENTS.md marks UI-03 `[ ]` / "Pending" — code is implemented, docs are stale.** |
| UI-04 | 06-02 | Dropping/reducing/replaying/skipping visual events never changes durable economy state | ✓ SATISFIED (code) — ⚠️ traceability drift (REQUIREMENTS.md lines 75 + 189 still show "Pending") | ESLint boundary + property test (100 runs × 2 properties) + VER-06 reduced-motion E2E (behavioral proof). **Traceability drift: REQUIREMENTS.md marks UI-04 `[ ]` / "Pending" — code is implemented, docs are stale.** |
| UI-06 | 06-01 | Minimal settings for default session length, daily target, local day boundary, reduced motion, export | ✓ SATISFIED | SettingsPanel.tsx (375 lines) + update_settings command + Dexie v5 migration; REQUIREMENTS.md correctly marks Complete |
| VER-04 | 06-04 | Browser tests cover core user flow + reload-with-state | ✓ SATISFIED | `release-flow.spec.ts` (84 lines) drives full flow + `page.reload()`; passes against production build |
| VER-05 | 06-04 | Accessibility checks verify keyboard + semantic UI paths | ✓ SATISFIED | `accessibility.spec.ts` (121 lines) keyboard-only flow + axe-per-route on 5 routes (0 violations); VER-05 caught + fixed a real WCAG contrast regression (ModuleTile `text-slate-500`→`text-slate-400`) |
| VER-06 | 06-04 | Canvas/WebGL smoke checks verify nonblank rendering + reduce/disable motion | ✓ SATISFIED | `canvas-smoke.spec.ts` (140 lines) — structural probe always-runs + reduced-motion durability; pixel-variance intentionally skipped (Pixi v8 limitation) |

**Orphaned requirements:** None. All 7 IDs (UI-02, UI-03, UI-04, UI-06, VER-04, VER-05, VER-06) are claimed by Phase 6 plans and verified implemented.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none in Phase 6 modified files) | — | — | — | No TBD/FIXME/XXX/placeholder/stub patterns in any Phase 6 file. The two grep hits (`accessibility.spec.ts:111` "loading placeholder" comment, `cell-list-a11y.test.tsx:8` "mocked to a placeholder" comment) are descriptive comments about test scaffolding, not debt markers. |

### Deferred Items

None. Phase 6 is the final phase of the v1 milestone; no later phases exist to defer to. The 1 skipped Playwright spec (VER-06 pixel-variance) is intentionally skipped per design (Pixi v8 `preserveDrawingBuffer:false` defeats readback) — the structural probe is the load-bearing always-run check. This is a known limitation, not deferred work.

### Gaps Summary

**No code gaps.** All five Success Criteria are satisfied by the codebase; all four automated gates pass; all 7 requirements are implemented.

**Documentation gap (WARNING — not a blocker):** REQUIREMENTS.md traceability is stale for UI-03 and UI-04. Both are claimed complete in `06-02-SUMMARY.md:61` (`requirements-completed: [UI-03, UI-04]`) and verified implemented in this report, but REQUIREMENTS.md:
- Lines 74-75: checkbox `[ ]` instead of `[x]`
- Lines 188-189: Status "Pending" instead of "Complete"

The other 5 Phase 6 requirements (UI-02, UI-06, VER-04, VER-05, VER-06) are correctly marked Complete. The orchestrator should update REQUIREMENTS.md to mark UI-03 and UI-04 Complete (mirroring what 06-04-SUMMARY.md claims was already done at line 168: "VER-04/05/06 marked complete in REQUIREMENTS.md" — but the UI-03/UI-04 update was missed).

**Human verification items (2):** Visual animation fidelity on a real GPU, and a qualitative release-readiness pass. Both are downstream of the automated gates — automation proves structure, wiring, invariants, and economy neutrality, but cannot fully capture "the canvas feels alive and trustworthy."

---

_Verified: 2026-06-26T20:25:00Z_
_Verifier: the agent (gsd-verifier)_
