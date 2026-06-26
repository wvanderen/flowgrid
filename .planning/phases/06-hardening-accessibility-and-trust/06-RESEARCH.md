# Phase 6: Hardening, Accessibility, and Trust - Research

**Researched:** 2026-06-26
**Domain:** PixiJS v8 animated renderer + visual-event safety contract, semantic accessibility, Settings/SettingsRecord/Dexie migration, Playwright E2E against production build, axe-core a11y, WebGL canvas smoke
**Confidence:** HIGH

## Summary

Phase 6 is the v1 release-readiness pass that converts the Phase 3 *static* PixiJS v8 stub into a full-motion animated renderer, formalizes the "visual events never affect durable economy" safety contract (UI-04), closes the last semantic-control gap (UI-02 — an always-visible React Cell list on Home), adds a `/settings` route with export/import + a new `reduceMotion` field requiring a Dexie v4→v5 migration, and lands the first real-browser Playwright E2E + axe-core a11y + WebGL canvas smoke suite (VER-04/05/06) that replaces the deferred Phase 5 Task-4 human visual smoke. Everything hangs off the **same pure-simulation core** shipped in Phases 1–5: the renderer merely *consumes* transient visual events, it never writes economy truth, and `update_settings` follows the exact `set_core_allocation` command template.

The technical risk concentrates in three places. (1) **Pixi v8 ecosystem landmines** — both `@pixi/tween` and `@pixi/particle-emitter` are UNUSABLE on v8 (the former does not exist on npm; the latter's peerDependencies cap at `< 8.0.0`), so D-01/D-02 particles must use Pixi v8's built-in `ParticleContainer`/`Particle` and D-05 tweening must use a small custom interpolator driven by the `Ticker`. (2) **Headless WebGL in Playwright** — Chromium needs SwiftShader software-rendering flags for VER-06 canvas assertions to pass in CI; this is the single most likely source of E2E flake and must be pinned in `launchOptions`. (3) **The D-05 build-once/tween-in-place refactor** of the adapter — the current `destroyFlowgridScene`+`buildFlowgridScene`-on-every-snapshot path would kill running particle systems; the fix is structural (tag and re-use display objects, never rebuild the scene subtree on dispatch).

**Primary recommendation:** Implement in three dependency-ordered waves mirroring prior phases — (1) simulation truth: `update_settings` command + `SettingsRecord.reduceMotion` + Dexie v4→v5 migration + D-04 forge/token visual-event constructors; (2) render layer: full-motion scene with `ParticleContainer`+`Ticker`, build-once/in-place-tween adapter, static-scene fallback, scene-graph test hook; (3) app+UI+E2E: semantic Cell list, `/settings` route, WebGL-failure message, then Playwright+axe-core+canvas smoke against `vite build && vite preview`. The existing layer-boundary ESLint rules already forbid the dangerous cross-imports; every new module inherits them.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `update_settings` command + `reduceMotion` validation | Simulation (`src/simulation`) | Domain (`src/domain`) | Pure TS over durable state — mirrors `set_core_allocation`. Domain owns the `SettingsRecord` shape + `SimulationCommand` union. |
| Dexie v4→v5 settings migration | Persistence (`src/persistence`) | — | `database.ts` is the sole Dexie gateway; `version(5).stores({...}).upgrade(...)` + extracted `upgradeSettingsV4ToV5` transform. |
| Full-motion rendering (particles, bursts, ripples) | Render (`src/render`) | — | Pixi v8 lives here; consumes immutable snapshots + transient `VisualEvent[]`. Writes NOTHING durable. |
| Animation ticker / reduced-motion gating | Render (`src/render`) | UI (wiring) | `app.ticker` owned by render; UI passes the effective `reduceMotion` in. Ticker.stop() = D-08 "fully off". |
| Live ambient Current trail (D-02) | Render (`src/render`) | Simulation (marker) | Reads `cell.activeSessionStartedAt` from snapshot to know a session is live; the trail is a cosmetic tick decoupled from durable truth (Phase 3 D-06). |
| Semantic Cell list (D-06) + `/settings` route + export/import UI | UI (`src/ui`) + App (`src/app`) | — | React/Radix; dispatches commands, reads selectors, never computes economy. `/settings` is a route peer to `/core`/`/forge`. |
| WebGL-failure graceful message (D-07) | UI (`src/ui`) | Render (detection) | `isWebGLSupported()` detects; UI renders the inline note. Not an error state. |
| Playwright E2E + axe + canvas smoke (VER-04/05/06) | Tests (`tests/e2e`) | — | Real browser against `vite preview`; the only honest way to cover IndexedDB-reload + WebGL + keyboard. |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
These are copied verbatim from `06-CONTEXT.md ## decisions`. Research investigates the HOW for each; it does NOT re-open the WHAT.

**Visual Layer Scope (UI-03)**
- **D-01:** Full-motion renderer. Phase 6 replaces the Phase 3 static PixiJS stub (`src/render/flowgrid/scene.ts` renders static hexes/routes/halos; `adapter.ts` drops visual events) with a full-motion scene: particle Current trails (Cell→Core), Bloom bursts, Core convert/charge ripples, Activation pulse. It consumes the existing 6 visual events and the new ones from D-04. UI-03's named items (Current movement, Bloom bursts, Core conversion/storage feedback) are the priority deliverables.
- **D-02:** Live ambient Current trail while a focus session is ACTIVE. While a focus session runs, a gentle continuous Current particle stream flows from the focused Cell toward the Core — the canvas feels alive *during* focus, not only on Finish. Requires a Pixi ticker/animation loop tied to the active-session marker (`CellRecord.activeSessionStartedAt`). The completion `currentFlowVisual` still fires a burst on Finish.
- **D-04:** Add Forge + Module Token visual events. The existing `VISUAL_EVENT_NAMES` (`src/domain/result.ts:222`) has 6 entries; none cover Forge, rejuvenation, or token grants. Phase 6 ADDS visual event types for the forge roll/upgrade (`visual:forge_roll` / `visual:module_upgrade`) and the Module Token grant (`visual:token_granted`), extending `VISUAL_EVENT_NAMES` + `src/simulation/visual-events.ts` constructors. The `/forge` and `/core` surfaces get visual feedback through the same animation system. (UI-03's named items remain the priority; rejuvenation/activation-boost-purchase stay text+state-only unless trivially covered by an existing event.)
- **D-05:** Tween in place — replace the tear-down-rebuild adapter. The current adapter (`src/render/flowgrid/adapter.ts`) calls `destroyFlowgridScene` + `buildFlowgridScene` on every snapshot reference change, which would kill running particle systems under full motion. Phase 6 switches to building the scene **once** and tweening/updating existing display objects in place (position/color/halo) on snapshot changes, so the live Current trail and bursts survive dispatches (e.g. Start session no longer restarts the particle system).

**Reduced-Motion & Renderer-Failure Contract (UI-04 / UI-06)**
- **D-03:** Static scene fallback when reduced motion is ON or WebGL is unavailable. When reduced motion is enabled OR Pixi `Application.init` fails, the renderer shows NO particles/tweens — it renders the durable snapshot as static hexes/halos (today's stub behavior). Core/Cell/Activation state stays visible via color + halo. The durable economy is never affected (this IS the UI-04 safety contract, exercised from Phase 3 onward).
- **D-08:** A single "Reduce motion" setting satisfies both "reduced" and "disabled." VER-06 requires visuals be "reduced OR disabled." One `reduceMotion` flag is enough: ON = static scene with the animation ticker/particle systems fully off (only durable hexes/halos remain). No separate "disable canvas entirely" mode — the animation system being fully off already satisfies "disabled" while still showing durable state.
- **D-09:** Reduced-motion auto-detects the OS preference with a manual override. The `reduceMotion` setting defaults from `window.matchMedia('(prefers-reduced-motion: reduce)')` on first run, but the user can override it in Settings. Honors the OS preference without trapping users who want motion on a reduced-motion OS.

**Non-Canvas Access & WebGL-Failure Recovery (UI-02 + trust)**
- **D-06:** Always-visible semantic Cell list on Home. A semantic list of Cell links/buttons renders alongside the canvas on `FlowgridHome` (always present), giving keyboard/screen-reader users a path to open an existing Cell (Tab + Enter). This closes the one UI-02 gap (canvas `role="img"` is not keyboard-focusable) and doubles as the no-WebGL fallback. Slight visual redundancy with the hex grid is accepted (the protected `open app → tap Cell → start session` canvas flow stays primary; the list is the accessible peer).
- **D-07:** Friendly message when WebGL/Canvas init fails. Replace today's silent fail-soft (`FlowgridCanvas.tsx:65` logs + leaves the container empty, flagged "Phase 6 owns resilience T-03-08") with a short note in the container: "Visuals unavailable — you can still do everything from the Cell list below" + a link to Settings. The economy stays fully usable via the semantic Cell list + panels. No broken/blank frame, no dismissible error-state banner.

**Settings, Export & Import Surface (UI-06)**
- **D-10:** Dedicated `/settings` route. A new route peer to `/`, `/cells/:id`, `/core`, `/forge` (`src/app/routes.tsx`). Matches the inline-not-modal anti-pattern (Phase 3/4/5 — modal blocks the Generator) and the established route pattern. Add a Settings link to the Home header next to the existing "Core" link.
- **D-11:** Export = download buttons. Settings ships two buttons — "Export full state (JSON)" and "Export sessions (CSV)" — each triggering a browser file download. Matches DATA-04/DATA-05 literally (offline, no server). They call the existing `exportJson` (`src/persistence/export-json.ts`) + the sessions-CSV function.
- **D-12:** Default changes affect new Cells only. Changing "daily target" / "default session length" defaults in Settings affects ONLY Cells created after the change. Existing Cells keep the targets captured at their creation (`create_cell` reads the defaults once). Predictable; never silently reshapes in-progress Cells.
- **D-13:** Import/restore button added in v1 — confirm + replace-local. An import-JSON button ships alongside export in Settings (a deliberate, user-chosen expansion of UI-06's literal "export" — it fits the phase's trust/recovery theme and round-trips the Phase 2 DATA-06 validation). Flow: file pick → confirmation dialog warning local state will be replaced → import in **restore (replace) mode**. Merge mode stays available at the persistence API (`src/persistence/import.ts`) but is not exposed in the UI.

**Verification Strategy (VER-04 / VER-05 / VER-06)**
- **D-14:** Install Playwright. Add `@playwright/test` + browsers per STACK.md. VER-04/05/06 run as real-browser E2E — the only honest way to cover full click flow, reload-with-IndexedDB-state, keyboard, and a real WebGL canvas (jsdom/happy-dom cannot). A new `playwright.config.ts` + an `e2e/` (or `tests/e2e/`) directory; the existing vitest dual-environment suite (`vitest.config.ts`) stays for unit/integration.
- **D-15:** Keyboard flow + axe scan for VER-05. Playwright drives the full critical flow via keyboard only (Tab/Enter through the semantic Cell list, Start/Finish, allocation, rejuvenation, forge, install, export) AND runs an axe-core pass (`axe-playwright`) on each route for automated WCAG issues. Catches both interaction gaps and markup/contrast/ARIA violations.
- **D-16:** Scene-graph probe + pixel sanity for VER-06 canvas. Primary assertion: the Pixi stage has the expected Flowgrid-scene children (Cells/Core/routes present) via a test hook exposed from the render layer. Secondary: a coarse pixel check that the canvas is not a single uniform color (non-zero variance). Robust without brittle full-screenshot baselines. Also verifies reduced-motion (D-03/D-08) leaves economy state intact by dispatching actions with motion off and asserting durable records unchanged.
- **D-17:** E2E runs against the production build (`vite build && vite preview`). More honest for a release-readiness gate (real bundling, no HMR/dev-only code) than `vite dev`. The deferred Phase 5 Task-4 human visual smoke is replaced by these automated VER-04/05/06 checks.

### the agent's Discretion
(Mechanical details the user delegated; research resolves the HOW and prescribes a standard approach in the body below.)

- **`update_settings` command shape + new `SettingsRecord.reduceMotion` field + Dexie v4→v5 migration** — no settings-edit command exists today; add a `update_settings` variant to the `SimulationCommand` union + engine case, mirroring `set_core_allocation`. New `reduceMotion` boolean on `SettingsRecord` requires Dexie v4→v5 migration; reuse Phase 2 D-07 synthetic-fixture migration harness + extracted-transform pattern (`upgradeCellsV1ToV2` template); settings store is a singleton so migration defaults `reduceMotion` from legacy absence = false. Export/import must include the new field; `ARCHIVE_VERSION` bumps if the envelope shape changes.
- **Particle system / ticker implementation** in Pixi v8 (ParticleContainer vs custom Graphics, ticker lifecycle, easing). Must respect render-layer boundary.
- **Tween approach for D-05** — native Pixi v8 tweening, `@pixi/tween` v8 compat verification, or custom interpolator.
- **Scene-graph test hook for VER-06** — `data-testid`/aria hook + render-layer test export, or `window.__flowgrid` debug probe gated to test builds; must not leak into production.
- **CSS-variable color sharing** — read computed CSS vars vs hard-coded Pixi color ints.
- **Settings form validation feedback** — inline hints mirroring existing form patterns.
- **localDayBoundary live-reload** — immediate effect vs reload; either acceptable.
- **Property-test extension (VER-02)** — extend fast-check invariants for `update_settings` + visual-event safety property (UI-04).

### Deferred Ideas (OUT OF SCOPE)
- Pan/zoom camera (`pixi-Viewport` or custom) — fixed framing stays.
- Sound / audio feedback — no audio infra in v1.
- Visual-regression screenshot baselines — D-16 chose structural + pixel-sanity.
- Merge-mode import in the UI — D-13 ships replace-local only.
- Per-Cell reduced-motion granularity / motion-intensity slider — single on/off toggle.
- Live localDayBoundary reload (this phase); hot-reload is later polish.
- Rejuvenation / activation-boost-purchase / Energy-sink particle events — D-04 adds forge + token-grant only.
- Native notifications / widgets / platform integrations — v2 (PLAT-01).
- Cloud sync / multi-device — v2 (SYNC-01/02/03); sync-ready operation rows continue to be emitted.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **UI-02** | Semantic non-canvas controls for every critical action (create Cell, start/finish session, inspect Cell, set Core allocation, log rejuvenation, forge, install reward, view history, export). The one open gap: opening an *existing* Cell from Home is canvas-only. | D-06 always-visible React Cell list on `FlowgridHome` (§Architecture Patterns: "Always-visible semantic Cell list"). Closes the gap; canvas stays `role="img"` (§Accessibility). Every other action already has a semantic control from Phases 3–5. |
| **UI-03** | PixiJS/Canvas/WebGL visuals render Cells, Core, routes, Current movement, Bloom bursts, Core conversion/storage feedback from simulation-emitted visual events. | D-01 full-motion renderer using Pixi v8 `ParticleContainer`+`Ticker` (§Code Examples: ParticleContainer, Ticker). D-02 live ambient trail reads `activeSessionStartedAt`. D-05 build-once/in-place-tween so particle systems survive dispatches. D-04 adds forge/token visual events. |
| **UI-04** | Dropping/reducing/replaying/skipping visual events never changes durable economy state. | This is the load-bearing safety property. D-03/D-08 formalize it; verified by a fast-check property (§VER-02 extension) + VER-06 D-16 reduced-motion-durability assertion. The render layer physically cannot write economy records (ESLint boundary + repository is the only writer). |
| **UI-06** | Minimal settings: default session length, daily target defaults, local day boundary, reduced motion, export (+ import per D-13). | D-10 `/settings` route peer (§Pattern: route-peer). New `update_settings` command + `SettingsRecord.reduceMotion` + Dexie v4→v5 migration (§Code Examples: migration). D-11 export buttons call `exportJson`/CSV; D-13 import = file pick → confirm → restore mode. |
| **VER-04** | Browser E2E: create Cell → focus → Current/Bloom/Core → rejuvenation → Module Token → forge → reload with state preserved. | Playwright `webServer` against `vite preview` (§Code Examples: playwright.config). Reload-with-IndexedDB works for free because Dexie persists across `page.reload()`. |
| **VER-05** | Accessibility: keyboard + semantic UI paths for all critical canvas-backed actions. | Playwright keyboard-only drive (`page.keyboard.press('Tab'/'Enter')`) + `@axe-core/playwright` `AxeBuilder` per route (§Code Examples: axe). |
| **VER-06** | Canvas/WebGL smoke: nonblank Cells/Core/routes, reducible/disable-able without breaking economy state. | Scene-graph probe via render-layer test hook (§Scene-graph test hook) + coarse pixel-variance via canvas `getImageData`. Headless WebGL needs SwiftShader launchOptions flags (§Pitfall: Headless WebGL). Reduced-motion durability assertion via D-16. |
</phase_requirements>

## Project Constraints (from AGENTS.md)

These directives carry the same authority as locked decisions. The plan-checker verifies compliance.

- **Layer boundaries (ESLint-enforced, `eslint.config.js`):** `src/simulation/**` imports no React/PixiJS/Dexie/Zustand/DOM/app-persistence-render-ui. `src/render/**` (the renderer) imports Pixi + domain types/selectors + visual-event types ONLY — NO React, Dexie, Zustand, or DOM shims (Pixi IS allowed). `src/ui/**` imports no `pixi.js` directly (canvas concerns live behind `FlowgridCanvas`→`scene.ts` seam) and no Dexie directly (goes through persistence barrel). D-05 tweening, the scene-graph test hook, and the Settings UI MUST respect these.
- **Domain logic purity:** Simulation owns truth; renderer shows motion; persistence stores durable records; sync moves operations; UI configures and inspects state. `update_settings` writes durable truth via the dispatch/repository diff path, exactly like `set_core_allocation`.
- **Protected core interaction:** `open app → tap Cell → start session` stays sacred and easy. D-06's Cell list is the accessible *peer*, never a replacement for the canvas tap.
- **Visual events are transient** (Phase 3 D-02): the renderer may drop/reduce/replay/skip them freely. **UI-04 formalizes that this never changes durable economy state** — the renderer physically has no write path to economy records.
- **Persistence:** IndexedDB records with migrations, not a giant localStorage blob. The v4→v5 settings migration follows the established Dexie `version(N).stores({...}).upgrade()` pattern.
- **Economy safety:** integer units; no negative resources; no duplicate installs; forge count monotonic; route/Core allocation sums enforced. `update_settings` carries no economy math, but its validation follows the typed-issues-no-throwing rule (Phase 1 D-07).
- **Accessibility:** "canvas visuals must be paired with normal UI controls, semantic labels, and accessible panels." D-06's React list is the literal fulfillment of this constraint.
- **Inline-not-modal (Phase 3/4/5):** `/settings` is a route (D-10), not a modal; the WebGL-failure message (D-07) is an inline note, not a blocking dialog.
- **History is append-only:** sessions/rejuvenations/forgeHistory are never mutated casually. Settings is NOT append-only (it's a singleton upserted by `update_settings`).

## Standard Stack

All versions verified via `npm view` against the npm registry on 2026-06-26. The stack is locked by AGENTS.md; research confirms exact v8/v4 wiring, not stack choice.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pixi.js | 8.19.0 (verified; `package.json` pins `^8.19.0`) | WebGL/WebGPU 2D renderer for the animated Flowgrid scene | `[VERIFIED: npm registry + pixijs.download/release/docs]` The v8 built-in `ParticleContainer`/`Particle` replace the v7-era `@pixi/particle-emitter`. `Application.init` is async (already wired in `createFlowgridScene`). |
| @playwright/test | 1.61.1 (verified) | Real-browser E2E for VER-04/05/06 | `[VERIFIED: npm registry + playwright.dev]` Microsoft's canonical test runner. New this phase (D-14). |
| @axe-core/playwright | 4.12.1 (verified) | Automated WCAG scan per route for VER-05 | `[VERIFIED: npm registry]` **Canonical** Deque axe-core Playwright binding (repo `dequelabs/axe-core-npm`, ~5M weekly downloads). NOTE: CONTEXT.md/STACK reference it as "axe-playwright" — see Package Legitimacy Audit. |
| dexie | 4.4.4 (`package.json` `^4.4.4`) | IndexedDB wrapper; v4→v5 schema migration | `[VERIFIED: codebase]` Already the persistence gateway. |
| zod | 4.4.3 (`package.json` `^4.4.3`) | Runtime validation at import boundary | `[VERIFIED: codebase]` `settingsSchema` widens for `reduceMotion`; drift guard stays tight. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react / react-dom | 19.2.x (`package.json`) | `/settings` route + semantic Cell list + WebGL-failure message | `[VERIFIED: codebase]` Existing shell. |
| react-router | 7.18.x (`package.json`) | `/settings` route peer | `[VERIFIED: codebase]` `createBrowserRouter` declarative mode. |
| @radix-ui/react-dialog | 1.1.x (`package.json`) | Import confirmation dialog (D-13) | `[VERIFIED: codebase]` Already used for New-Cell dialog. |
| vitest / fast-check | 4.1.x / 4.8.x (`package.json`) | Unit/property suites; VER-02 extension | `[VERIFIED: codebase]` Stays for simulation/persistence; Playwright is additive. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pixi v8 `ParticleContainer` (built-in) | `@pixi/particle-emitter` | **DO NOT USE** — its peerDependencies cap at `@pixi/* < 8.0.0`; incompatible with Pixi v8. `[VERIFIED: npm view peerDependencies]` |
| Custom Ticker-driven interpolator (D-05) | `@pixi/tween` | **DOES NOT EXIST** on npm (`npm view @pixi/tween` → not found). SLOP if named. A 20-line lerp in the ticker callback is the standard v8 approach. `[VERIFIED: npm registry]` |
| D-06 React semantic list | Pixi `AccessibilitySystem` (`pixi.js/accessibility`) | Rejected — Pixi's a11y is a DOM-overlay of invisible divs over the canvas; it would duplicate the React list AND couple the render layer to DOM. Flowgrid uses the React list + canvas `role="img"`. `[CITED: pixijs.download/release/docs/accessibility.html.md]` |
| `@axe-core/playwright` (official) | `axe-playwright` (community) | Both exist; `@axe-core/playwright` is Deque's official package (5M/wk, dequelabs repo). Use the official one. `[VERIFIED: npm registry]` |

**Installation:**
```bash
npm install -D @playwright/test @axe-core/playwright
npx playwright install chromium   # browser binary; --with-deps on Linux CI
```
No new runtime dependency is required — pixi.js 8.19.0, dexie, zod, react, react-router, radix are already installed.

## Package Legitimacy Audit

Run via `gsd-tools query package-legitimacy check --ecosystem npm` on 2026-06-26.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@playwright/test` | npm | recent publish (2026-06-23) | ~41.9M/wk | github.com/microsoft/playwright | SUS (heuristic "too-new") → **effectively OK** | Approved — heuristic false-positive; 41M weekly downloads + Microsoft repo confirm canonical |
| `@axe-core/playwright` | npm | recent publish (2026-06-23) | ~5.0M/wk | github.com/dequelabs/axe-core-npm | SUS (heuristic "too-new") → **effectively OK** | Approved — heuristic false-positive; 5M weekly downloads + Deque repo confirm canonical |
| `axe-playwright` | npm | ~9 mo (2025-09-12) | ~668K/wk | github.com/abhinaba-ghosh/axe-playwright | OK | **Not recommended** — community wrapper; prefer official `@axe-core/playwright` above |
| `@pixi/tween` | npm | — | — | none | **SLOP** (does-not-exist) | **REMOVED** — package does not exist on npm; never install |
| `@pixi/particle-emitter` | npm | recent (2026-01-08) | ~14.5K/wk | github.com/pixijs/particle-emitter | OK (registry) but **INCOMPATIBLE** | **REMOVED from consideration** — peerDependencies require `@pixi/* < 8.0.0`; breaks on Pixi v8 |

**Packages removed due to SLOP verdict:** `@pixi/tween` (does not exist — use a custom ticker-driven interpolator).
**Packages removed due to version incompatibility:** `@pixi/particle-emitter` (peerDeps `< 8.0.0` — use Pixi v8 built-in `ParticleContainer`).
**Packages flagged as suspicious [SUS] but approved:** `@playwright/test`, `@axe-core/playwright` — the seam's "too-new" reason is a false-positive triggered by the recent publish date; the weekly-download counts (41M / 5M) and official source repos (`microsoft/playwright`, `dequelabs/axe-core-npm`) unambiguously confirm these are the canonical, legitimate packages. No `checkpoint:human-verify` task needed.

*The "too-new" heuristic reasons reflect only the publish-date signal; they do not indicate slopsquatting. The planner installs both packages directly.*

## Architecture Patterns

### System Architecture Diagram

```
                    USER (keyboard / pointer / screen reader)
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
     ┌───────────────────┐          ┌────────────────────┐
     │ React UI shell    │          │ Pixi canvas        │
     │ (src/ui, src/app) │          │ (role="img")       │
     │                   │          │                    │
     │ • FlowgridHome    │  D-06    │ • hexes/halos      │
     │   + Cell LIST ────┼─peer─────│ • ParticleContainer│
     │ • /settings route │          │   (Current trails, │
     │ • /core /forge    │          │    Bloom bursts,   │
     │ • WebGL-fail note │          │    Core ripples)   │
     └────────┬──────────┘          └─────────┬──────────┘
              │ dispatch(cmd)                 │ consume snapshot
              │                               │ + drain VisualEvent[]
              ▼                               ▼
     ┌──────────────────────────────────────────────────┐
     │  flowgridStore (Zustand vanilla, src/app/store)  │
     │  snapshot · pendingVisualEvents · reduceMotion   │
     └────────┬──────────────────────┬──────────────────┘
              │ runSimulationCommand │ repository.applyResult
              ▼                      ▼
     ┌────────────────────┐  ┌──────────────────────┐
     │ SIMULATION (pure)  │  │ PERSISTENCE (Dexie)  │
     │ src/simulation     │  │ src/persistence      │
     │ • update_settings  │  │ • v5 schema +        │
     │ • emits VisualEvent│  │   upgradeSettingsV4  │
     │   [] (transient)   │  │   ToV5               │
     │ • emits SyncOp[]   │  │ • exportJson/CSV     │
     │   (durable)        │  │ • import (restore)   │
     └────────────────────┘  └──────────────────────┘
              ▲                               
              │ UI-04 SAFETY: VisualEvent[] may be      
              │ dropped/reduced/replayed/skipped        
              │ by the renderer with ZERO effect on     
              │ the durable snapshot or SyncOp log.     
              │ (renderer has no write path to Dexie)   
```
A reader can trace the primary use case: user taps a Cell (canvas) OR activates the Cell-list link (keyboard) → `dispatch(start_focus_session)` → simulation returns `nextState` + `visualEvents` → repository writes durable records → store emits new snapshot → renderer tweens the scene in place (D-05) and the live ambient trail (D-02) keeps running because the scene was built once.

### Recommended Project Structure (additions only)
```
src/
├── domain/
│   ├── records.ts          # + reduceMotion on SettingsRecord (D-08)
│   └── result.ts           # + update_settings in SimulationCommand union;
│                           #   + 3 keys in VISUAL_EVENT_NAMES (D-04)
├── simulation/
│   ├── engine.ts           # + case 'update_settings'
│   ├── commands/
│   │   └── update-settings.ts   # NEW — mirrors set-core-allocation.ts
│   └── visual-events.ts    # + forgeRollVisual / moduleUpgradeVisual / tokenGrantedVisual
├── persistence/
│   ├── database.ts         # + version(5) + upgradeSettingsV4ToV5 export
│   ├── export-json.ts      # ARCHIVE_VERSION bump if envelope changes (D-09 axis 4)
│   ├── import.ts           # unchanged API; restore mode used by D-13
│   └── validation-schemas.ts # + reduceMotion on settingsSchema + drift guard
├── render/flowgrid/
│   ├── scene.ts            # REWRITE: build-once + in-place tween (D-05);
│   │                       #   ParticleContainer layer (D-01); test hook (D-16)
│   ├── adapter.ts          # update-in-place on snapshot change; CONSUME visual events
│   ├── particles.ts        # NEW (suggested): Particle pool + emission for trails/bursts
│   ├── motion.ts           # NEW (suggested): reduceMotion gate + Ticker lifecycle
│   └── scene-inspect.ts    # NEW (suggested): test-only stage summary export (D-16)
├── ui/
│   ├── flowgrid-home/
│   │   ├── FlowgridHome.tsx    # + semantic Cell list (D-06) + Settings header link
│   │   └── FlowgridCanvas.tsx  # WebGL-fail inline note (D-07); pass reduceMotion
│   └── settings-panel/         # NEW (suggested): SettingsPanel + forms + export/import
└── app/
    └── routes.tsx          # + { path: '/settings', element: <SettingsPanel /> }

tests/
├── simulation/ ...         # + update-settings.test.ts + visual-event-safety property
├── persistence/ ...        # + migration-harness entry for v4→v5 settings
└── e2e/                    # NEW (D-14/15/16/17): Playwright specs + axe
playwright.config.ts        # NEW (D-14/17): webServer → vite preview
```

### Pattern 1: Always-visible semantic Cell list (D-06) — closes UI-02
**What:** A `<nav>`/`<ul>` of Cell links renders unconditionally on `FlowgridHome`, beside `<FlowgridCanvas>`. Each entry is a React Router `<Link to={'/cells/'+cellId}>` — Tab-focusable, Enter-activatable, screen-reader-announced.
**When to use:** Always. It is the accessible peer to the canvas tap and the no-WebGL fallback.
**Example:**
```tsx
// Source: derived from FlowgridHome.tsx existing pattern + AGENTS.md a11y rule
<nav aria-label="Cells" className="...">
  <h2 className="sr-only">Cells</h2>
  <ul>
    {activeCells.map((cell) => (
      <li key={cell.id}>
        <Link to={`/cells/${cell.id}`} className="...">
          {cell.name}
        </Link>
      </li>
    ))}
  </ul>
</nav>
```
**Why not Pixi `AccessibilitySystem`:** Pixi's built-in a11y is a DOM-overlay of invisible `<div>`s positioned over the canvas (`accessibleTitle`, `tabIndex`). It would (a) duplicate the React list, (b) couple the render layer to DOM concerns, (c) be fragile under D-05 in-place tweening (overlay positions must track moving sprites). The React list is simpler, more robust, and the project's established pattern. `[CITED: pixijs.download/release/docs/accessibility.html.md]`

### Pattern 2: Build-once scene + in-place tween (D-05)
**What:** `buildFlowgridScene` runs ONCE on mount. On each snapshot change, the adapter updates existing display objects' properties (position via Container.x/y, halo stroke, color) and never calls `destroyFlowgridScene`. Particle systems live in a separate `ParticleContainer` that is likewise created once and reused.
**When to use:** Always under full motion (D-01). The Phase 3 rebuild-on-every-snapshot path is removed.
**Why:** `destroy`+`build` on every dispatch tears down the ticker subscriptions and particle pool, so the D-02 live ambient trail would restart on every Start/Finish. In-place updates let the trail survive.
**Example (adapter switch):**
```ts
// Source: adapter.ts current signature, rewritten handler
connectFlowgridAdapter(
  storeView,
  (nextSnapshot) => {
    // D-05: was destroyFlowgridScene(app) + buildFlowgridScene(app, ...).
    // Now: update existing scene graph in place.
    updateFlowgridScene(app, sceneRefs, nextSnapshot, localDate, reduceMotion);
  },
  (events) => {
    // D-01/D-04: was a no-op drop. Now: feed the particle system.
    if (!reduceMotion) emitParticles(particleLayer, events);
  },
);
```

### Pattern 3: Reduced-motion gate via Ticker lifecycle (D-03/D-08)
**What:** One `reduceMotion` boolean. When true (OR WebGL unavailable), the scene builds static hexes/halos only and `app.ticker.stop()` keeps the animation loop fully off — satisfying both "reduced" and "disabled."
**When to use:** Default from `window.matchMedia('(prefers-reduced-motion: reduce)').matches` on first run (D-09); user override persists to `SettingsRecord.reduceMotion`.
**Example:**
```ts
// Source: MDN prefers-reduced-motion + pixijs.download/release/docs/ticker.html.md
export function deriveReduceMotion(setting: boolean | undefined): boolean {
  // setting === undefined means "not yet seeded" (first run) → honor OS preference
  if (setting !== undefined) return setting;
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
// In the canvas mount effect:
if (reduceMotion) app.ticker.stop();      // D-08: animation fully off
else app.ticker.start();
```

### Pattern 4: Route-peer component (D-10) — `/settings` mirrors `/core`/`/forge`
**What:** `SettingsPanel` is a route component reading `snapshot.settings`, dispatching `update_settings`, rendering inline feedback. Export/import buttons call persistence fns and trigger downloads / file pick + confirm.
**When to use:** Exactly the CorePanel/ForgePanel idiom — `useFlowgridStore` selector + `dispatch(command, env, repository)` + `role="status" aria-live="polite"` rejection surface.

### Pattern 5: Scene-graph test hook (D-16) — production-safe
**What:** The render layer exports a pure `summarizeScene(app): { cells: number; core: boolean; routes: number }` function. The UI mounts the canvas with a `data-testid="flowgrid-canvas"` on the container and, **only when `import.meta.env.MODE === 'test'`**, attaches `summarizeScene(app)` to `window.__flowgridInspect`. Playwright reads it via `page.evaluate(() => (window as any).__flowgridInspect?.())`.
**When to use:** VER-06 structural assertion that Cells/Core/routes rendered.
**Why this shape:** It does NOT leak into production (gated on `MODE === 'test'`, tree-shaken by Vite in `production` build... — see Open Questions Q1 for the exact gating mechanism, since `import.meta.env.MODE` is not automatically dead-code-eliminated).
**Alternative considered:** A `data-*` attribute on each Pixi object is not directly DOM-inspectable (canvas pixels aren't DOM). The window-probe is the cleanest structural assertion path.

### Anti-Patterns to Avoid
- **`@pixi/tween` / `@pixi/particle-emitter`:** do not exist for v8 / incompatible. See Package Legitimacy Audit.
- **Rebuild-on-dispatch under full motion (D-05's whole point):** kills particle systems; the live trail restarts every action.
- **Persisting `reduceMotion` through Zustand or localStorage:** goes through `SettingsRecord`/Dexie like every other durable value (AGENTS.md "Persistence" constraint).
- **Pixi `AccessibilitySystem` as the a11y path:** DOM-overlay duplicates D-06 and couples render to DOM. Use the React list.
- **Importing `pixi.js` from `src/ui`:** banned by ESLint; the seam is `FlowgridCanvas`→`scene.ts`.
- **Default-change retroactively reshaping existing Cells (D-12):** `create_cell` reads settings defaults ONCE at creation; `update_settings` never back-fills existing Cells.
- **Treating visual events as durable:** they are transient; the simulation MUST be able to emit them freely and the renderer MUST be able to drop them with zero economy effect (UI-04).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Particle rendering | Custom WebGL buffers / DOM sprites for particles | Pixi v8 `ParticleContainer` + `Particle` | GPU-batched, handles 100k+ particles; experimental-but-stable API documented in v8. `[CITED: pixijs.download/release/docs/scene-16.html.md]` |
| Frame loop / delta timing | `requestAnimationFrame` + manual delta math | `app.ticker.add((ticker) => … ticker.deltaTime)` | Handles FPS clamping, priority, pause/resume; `Ticker.shared` is what `Application` uses. `[CITED: pixijs.download/release/docs/ticker.html.md]` |
| Tweening / interpolation | A tween library (`@pixi/tween` does NOT exist) | Custom lerp in the ticker callback: `obj.x += (target - obj.x) * 0.1 * ticker.deltaTime` | 20 lines; no dependency; the standard v8 approach given no first-party tween lib. |
| Reduced-motion detection | Sniffing user agent / custom heuristics | `window.matchMedia('(prefers-reduced-motion: reduce)')` | The platform-standard signal; honored by OS + browser. `[CITED: developer.mozilla.org prefers-reduced-motion]` |
| WebGL availability check | try/catch a canvas getContext('webgl') | Pixi `isWebGLSupported()` util, OR catch `Application.init` rejection | Pixi already ships the cached check; D-07 already catches init failure. `[CITED: pixijs.download/release/docs/utils.isWebGLSupported.html.md]` |
| File download (export) | Manual Blob+anchor wiring per call | One small `triggerDownload(filename, mime, content)` helper | Trivial but centralize so both JSON+CSV buttons share it. |
| IndexedDB schema migration | Ad-hoc per-version upgrade scripts | Dexie `version(N).stores({...}).upgrade(cb)` + extracted pure transform + migration-harness fixture | The Phase 2/4/5 pattern (`upgradeCellsV1ToV2` etc.) is proven; reuse it verbatim. |
| a11y audit | Manual checklist / custom rule engine | `@axe-core/playwright` `AxeBuilder.analyze(page)` | Deque's WCAG ruleset; the industry standard for VER-05. |

**Key insight:** The renderer's job is narrow — consume snapshots + transient events, animate, never write. Every "clever" thing (economy math, persistence, routing) already lives in a layer the renderer cannot import. Phase 6 adds motion *within* that boundary, not new responsibilities.

## Common Pitfalls

### Pitfall 1 (CRITICAL — version landmine): `@pixi/particle-emitter` and `@pixi/tween` are NOT Pixi v8 options
**What goes wrong:** Installing `@pixi/particle-emitter` produces peer-dependency warnings and runtime breakage on Pixi v8; `@pixi/tween` is not on the registry at all.
**Why it happens:** Both are v6/v7-era packages. `npm view @pixi/particle-emitter peerDependencies` returns `@pixi/* >=6.0.4 <8.0.0`. `npm view @pixi/tween` → "not found". Training data and old tutorials reference them freely.
**How to avoid:** Use Pixi v8's built-in `ParticleContainer`/`Particle` (docs: `scene-16.html.md`) and a custom ticker-driven lerp for tweening. Never `npm install` either package.
**Warning signs:** peerDep warnings on install; "is not a function" / context-loss WebGL errors at runtime.

### Pitfall 2 (CRITICAL — E2E flake): Headless Chromium WebGL needs SwiftShader flags
**What goes wrong:** `app.init({ preference: 'webgl' })` throws in headless Chromium → the canvas never initializes → VER-06 scene-graph probe and pixel-variance both fail, AND the D-02 live trail never renders.
**Why it happens:** Headless Chromium does not always expose a hardware GPU. WebGL in the new headless mode requires the ANGLE/SwiftShader software renderer, and since Chrome ~124 the `--enable-unsafe-swiftshader` flag is required to allow WebGL on SwiftShader.
**How to avoid:** Pin Chromium launch args in `playwright.config.ts` `launchOptions.args`:
```ts
use: {
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
}
```
Also: D-07's graceful WebGL-failure path means even if WebGL is unavailable, the E2E can still assert the Cell-list flow works (VER-04/05 do not strictly require the canvas). VER-06 specifically requires WebGL — keep it isolated so a SwiftShader regression fails only the canvas spec, not the whole suite. `[ASSUMED — exact flag set should be confirmed against the installed Chromium version during Wave 3]`
**Warning signs:** `Application.init failed` in console logs during E2E; blank/uniform canvas; VER-06 passing locally (headed) but failing in CI.

### Pitfall 3: Rebuild-on-dispatch destroys the D-02 live trail
**What goes wrong:** After D-01/D-02 ship, the live ambient Current trail flickers off and restarts on every Start/Finish/allocation dispatch.
**Why it happens:** The current adapter calls `destroyFlowgridScene` + `buildFlowgridScene` on every snapshot reference change. Under static rendering this is invisible; under full motion it tears down the running ticker/particle state.
**How to avoid:** D-05 is mandatory and must ship in the SAME wave as D-01/D-02. Build the scene once; mutate `Container.x/y`, stroke width/color, and particle emission in place. Keep particle systems in a separately-tagged layer that is never rebuilt.
**Warning signs:** Particle bursts visibly reset mid-animation when the user taps Start.

### Pitfall 4: `ARCHIVE_VERSION` / `settingsSchema` drift after adding `reduceMotion`
**What goes wrong:** Old exports (pre-Phase-6) lack `reduceMotion`; import rejects them, OR the field silently defaults inconsistently between the Dexie migration and the Zod schema.
**Why it happens:** Four independent version axes (Phase 2 D-08). Adding a settings field touches (a) `SettingsRecord`, (b) `settingsSchema` + its drift-guard `satisfies`, (c) the Dexie v4→v5 transform, (d) possibly `ARCHIVE_VERSION`.
**How to avoid:** Mirror the Phase 4 `coreSchema` `.default(...)` pattern: `settingsSchema` gets `reduceMotion: z.boolean().default(false)` so a v2 archive (no field) parses and defaults. The Dexie `upgradeSettingsV4ToV5` transform sets `reduceMotion = false` on the singleton when absent. Bump `ARCHIVE_VERSION` to 3 + add `z.literal(3)` to the `archiveVersion` union ONLY if the envelope shape actually changes (adding a field to an existing record does NOT require an envelope bump if the record schema stays backward-compatible via `.default()` — see Open Questions Q2).

### Pitfall 5: Scene-graph test hook leaking into production
**What goes wrong:** `window.__flowgridInspect` ships in the production bundle, exposing internal scene structure.
**Why it happens:** `import.meta.env.MODE === 'test'` is NOT automatically dead-code-eliminated by Vite unless wrapped in `import.meta.env.DEV`-style statically-analyzable guards, and Playwright runs against the *production* build (D-17) where `MODE === 'production'`.
**How to avoid:** Gate the probe on a build-time constant Playwright can set. Cleanest: inject via a `data-testid` on the canvas container + have Playwright call a function the app exposes only when a query param (e.g. `?inspect=1`) is present, OR expose the inspector unconditionally but returning only aggregate counts (no internal refs). Decide explicitly in the plan; do not rely on MODE alone. See Open Questions Q1.
**Warning signs:** The probe is undefined when E2E runs against `vite preview`.

### Pitfall 6: `prefers-reduced-motion` + manual override desync
**What goes wrong:** User toggles reduceMotion OFF in Settings, but the renderer still shows static because it read the media query instead of the persisted setting (or vice-versa).
**Why it happens:** D-09 specifies "default from media query, then user override." The effective value is `setting === undefined ? mediaQuery : setting`.
**How to avoid:** Compute the effective `reduceMotion` in ONE place (the UI/store), pass it INTO the render layer; the renderer never reads `matchMedia` directly (it's a DOM API the render layer shouldn't touch per the boundary rule). Re-derive on settings change.

### Pitfall 7: Settings default-change retroactively mutating existing Cells (D-12 violation)
**What goes wrong:** Changing the default daily target in Settings reshapes in-progress Cells.
**Why it happens:** Reading `snapshot.settings.dailyTargetSeconds` live inside the Cell's daily-milestone math instead of the value captured at `create_cell`.
**How to avoid:** `create_cell` already captures `dailyTargetSeconds` onto the Cell record (Phase 3). Verify `update_settings` only mutates `SettingsRecord`, and that no selector reads settings defaults for an *existing* Cell's milestone target.

## Code Examples

### Pixi v8 ParticleContainer (D-01 particles)
```ts
// Source: pixijs.download/release/docs/scene-16.html.md (verified v8 API)
import { ParticleContainer, Particle, Texture } from 'pixi.js';

const particleLayer = new ParticleContainer({
  dynamicProperties: {
    position: true,   // trails move every frame
    rotation: false,
    vertex: false,
    color: false,     // tint set at emit time
  },
});
app.stage.addChild(particleLayer);

// Emit a burst (Bloom / Core convert). Reuse a small white-circle Texture.
function emitBurst(texture: Texture, x: number, y: number, count: number, tint: number) {
  for (let i = 0; i < count; i++) {
    const p = new Particle({
      texture,
      x, y,
      tint,
      alpha: 1,
      scaleX: 0.5, scaleY: 0.5,
    });
    particleLayer.addParticle(p);
    // track p in an array; the ticker updates x/y/alpha and removeParticle() when dead
  }
}
// NOTE: ParticleContainer uses addParticle/removeParticle, NOT addChild/removeChild.
// If you change a static property or the list, call particleLayer.update().
```

### Pixi v8 Ticker (D-02 live trail + D-03/D-08 gate)
```ts
// Source: pixijs.download/release/docs/ticker.html.md (verified v8 API)
app.ticker.add((ticker) => {
  // deltaMS is real elapsed ms (unaffected by ticker.speed); deltaTime is frame-normalized.
  for (const p of liveParticles) {
    p.x += p.vx * ticker.deltaMS / 1000;
    p.y += p.vy * ticker.deltaMS / 1000;
    p.life -= ticker.deltaMS;
    // ...remove dead via particleLayer.removeParticle(p)
  }
});

// D-08 reduced/disabled motion = ticker fully off:
if (reduceMotion) app.ticker.stop();   // no frame callbacks; particles frozen/absent
else app.ticker.start();
```

### Custom in-place tween (D-05 — no tween library exists for v8)
```ts
// Source: standard lerp pattern; @pixi/tween does not exist on npm.
function tweenTowards(obj: { x: number; y: number }, tx: number, ty: number, dt: number) {
  // exponential easing toward target; framerate-independent via deltaMS
  const k = 1 - Math.exp(-8 * dt / 1000); // ~converges in ~250ms
  obj.x += (tx - obj.x) * k;
  obj.y += (ty - obj.y) * k;
}
// Called inside the ticker for halo/color transitions on snapshot change.
```

### Dexie v4→v5 settings migration (reuses the proven extracted-transform pattern)
```ts
// Source: database.ts existing v3/v4 pattern + Phase 2 D-07 harness.
// 1. Defaults + extracted pure transform (mirrors upgradeForgeHistoryV3ToV4)
export const SETTINGS_V5_DEFAULTS = { reduceMotion: false } as const;
export function upgradeSettingsV4ToV5(
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (row.reduceMotion === undefined) row.reduceMotion = SETTINGS_V5_DEFAULTS.reduceMotion;
  return row;
}

// 2. In FlowgridDatabase constructor: repeat the FULL store set verbatim (Dexie requires it).
this.version(5).stores({
  client: 'id',
  cells: 'id',
  core: 'id',
  moduleInstances: 'id, ownerCellId',
  routes: 'id, sourceCellId',
  sessions: 'id, cellId, startedAt',
  operations: 'id, status, createdAt',
  settings: 'id',
  forgeHistory: 'id, createdAt',
  rejuvenations: 'id, createdAt',
}).upgrade(async (tx) => {
  await tx.table('settings').toCollection().modify(upgradeSettingsV4ToV5);
});
// Indexes are unchanged (settings is a singleton 'id'); only the stored shape widens.
```

### Playwright config (D-14/D-17 — production build, SwiftShader WebGL)
```ts
// Source: playwright.dev/docs/api/class-testconfig (webServer verified) + Pitfall 2.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',   // vite preview default port
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --strictPort',  // D-17 production build
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
// Add a package.json script: "test:e2e": "playwright test", "test:e2e:ui": "playwright test --ui"
```

### axe-core scan per route (D-15 — VER-05)
```ts
// Source: @axe-core/playwright canonical usage (dequelabs/axe-core-npm).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home has no WCAG violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
// Run on '/', '/cells/:id', '/core', '/forge', '/settings'.
```

### Reduced-motion auto-detect + override (D-09)
```ts
// Source: developer.mozilla.org prefers-reduced-motion + SettingsRecord seeding.
function effectiveReduceMotion(setting: boolean | undefined): boolean {
  if (setting !== undefined) return setting;            // user override wins
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
// Seed the SettingsRecord on first run (seeding.ts) using this; thereafter update_settings owns it.
```

### Scene-graph probe (D-16 — structural VER-06 assertion)
```ts
// Source: render-layer export pattern; see Pitfall 5 + Open Questions Q1 for gating.
// In render/flowgrid/scene-inspect.ts (pure, no DOM):
export function summarizeScene(app: Application): {
  cells: number; core: boolean; routes: number;
} {
  const scene = app.stage.children.find((c) => c.label === FLOWGRID_SCENE_LABEL);
  // count tagged hex/route children; return aggregates only (no internal refs leak)
  return { /* ... */ };
}
// Playwright reads it via the window probe (gated — see Q1) or a query-param-activated wiring.
const summary = await page.evaluate(() => (window as any).__flowgridInspect?.());
expect(summary.cells).toBeGreaterThan(0);
expect(summary.core).toBe(true);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@pixi/particle-emitter` for particles | Pixi v8 built-in `ParticleContainer`/`Particle` | Pixi v8 (2024) | The old lib's peerDeps cap `< 8.0.0`; use the built-in. |
| `app.view` (Pixi v7) | `app.canvas` (Pixi v8) | v8 | Already correct in `FlowgridCanvas.tsx:75` — keep it. |
| `interactive: true` (v7) | `eventMode = 'static'` (v8) | v8 | Already correct in `scene.ts:151`. |
| Pixi `AccessibilitySystem` as primary a11y | React semantic list + canvas `role="img"` | Flowgrid decision (D-06) | DOM-overlay avoided; simpler + robust. |
| `axe-playwright` (community) | `@axe-core/playwright` (official Deque) | ongoing | Use the official scoped package. |
| Vitest-only verification | Vitest (unit/property) + Playwright (E2E/a11y/canvas) | This phase (D-14) | First real-browser coverage; retires Phase 5 human-smoke debt. |

**Deprecated/outdated to avoid:**
- `@pixi/tween` — never published for v8 (does not exist on npm).
- `@pixi/particle-emitter` — incompatible with Pixi v8.
- `app.view`, `interactive: true`, `beginFill/endFill` — v7 APIs (codebase already uses v8 forms).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Headless Chromium needs `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` for WebGL in Playwright | Pitfall 2 / Playwright config | VER-06 fails in CI; mitigate by running VER-06 in headed mode locally or isolating it so only the canvas spec fails. Confirm exact flags against installed Chromium during Wave 3. |
| A2 | Vite `preview` default port is 4173 | Playwright config | baseURL mismatch; trivially fixed (`--port` flag or config). Low risk. |
| A3 | Adding `reduceMotion` to `SettingsRecord` does NOT require an `ARCHIVE_VERSION` bump if `settingsSchema.reduceMotion` uses `.default(false)` | Pitfall 4 | Over- or under-bumping the archive version; needs explicit decision (Open Questions Q2). |
| A4 | `ParticleContainer` is stable enough for v1 despite the "experimental" docs note | Standard Stack / Code Examples | API churn in a future patch; mitigated by small surface use (bursts/trails only) and the static fallback. |
| A5 | Pixi `Application.init({ preference: 'webgl' })` throws (rather than silently rendering nothing) on WebGL unavailable | D-07 / scene.ts | D-07's try/catch already wraps it; if it does NOT throw, the catch never fires and the fallback message won't show. Verify during Wave 2. |
| A6 | `prefers-reduced-motion` media query is the correct platform signal | D-09 / Code Examples | Standard MDN-documented API; very low risk. |

## Open Questions

1. **Scene-graph probe gating (D-16 / Pitfall 5).** `import.meta.env.MODE === 'test'` is not dead-code-eliminated and Playwright runs the *production* build (D-17). Options: (a) expose the inspector always but return only aggregate counts (no internal Pixi refs) — safest, minimal info leak; (b) activate wiring via a `?inspect=1` query param Playwright appends; (c) a separate `VITE_E2E_PROBE` build-time flag Playwright's webServer command sets. **Recommendation:** (a) — return only `{ cells, core, routes }` counts, no scene object references. Decide in the plan.
   - What we know: structural assertion needs Pixi stage access; canvas pixels aren't DOM-inspectable.
   - What's unclear: the cleanest production-safe gating.
   - Recommendation: option (a); aggregate counts only.

2. **`ARCHIVE_VERSION` bump decision (D-09 axis 4 / Pitfall 4).** Does adding `reduceMotion` to `settingsSchema` (with `.default(false)`) require bumping `ARCHIVE_VERSION` 2→3 and adding `z.literal(3)` to the `archiveVersion` union?
   - What we know: Phase 4 added core fields WITHOUT an envelope bump by using `.default(...)` (the v1→v2 archive backward-compat path, Pitfall 6 in CONTEXT).
   - What's unclear: whether the team treats "any record shape change" as an envelope bump for future-importer clarity.
   - Recommendation: follow the Phase 4 precedent — `.default(false)` + NO envelope bump — unless the planner finds a reason to signal the change. Document the decision either way.

3. **localDayBoundary live-reload (Agent's Discretion).** Does changing it in Settings take effect immediately or require reload?
   - What we know: `FlowgridCanvas` captures it at mount; `deriveLocalDate` uses it for the Activation halo.
   - Recommendation: reload-only is simpler and matches current behavior; the daily-milestone reset already runs on app open via `reconcileDayRollover`. Defer hot-reload (already in Deferred Ideas).

4. **Forge/token visual-event emission sites (D-04).** Exactly where do `visual:forge_roll` / `visual:module_upgrade` / `visual:token_granted` fire?
   - What we know: `run_forge.ts` is the forge handler (currently emits `forgeCompleted`/`moduleUpgraded` economy events, `visualEvents: []`); token grants happen in the rejuvenation threshold loop (`log_rejuvenation`).
   - Recommendation: emit `visual:forge_roll` + `visual:module_upgrade` in `run-forge.ts` alongside the economy events; emit `visual:token_granted` wherever `tokenGranted` economy event fires (rejuvenation threshold loop). They are transient (UI-04) so placement only affects timing.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/test/e2e | ✓ (project runs) | — (Vite 8 needs ≥20) | — |
| Chromium (Playwright browser) | VER-04/05/06 | ✗ until `npx playwright install chromium` | — | None for VER-06 (needs WebGL); VER-04/05 partially runnable via Cell-list |
| WebGL (SwiftShader in headless) | VER-06 canvas | ✗ until launchOptions flags set | — | D-07 graceful path + scene-graph structural probe still asserts; pixel-variance needs WebGL |
| IndexedDB (real browser) | reload-with-state (VER-04) | ✓ in real browser | — | — (fake-indexeddb is for vitest only) |

**Missing dependencies with no fallback:** Chromium browser binary must be installed via `npx playwright install chromium` (one-time, ~150MB). The plan's Wave 0 includes this install step.
**Missing dependencies with fallback:** If headless WebGL cannot be made stable in CI, VER-06's pixel-variance check can be marked `test.skip` in CI while the scene-graph structural probe + reduced-motion durability assertion still run (they don't strictly need a rendered frame).

## Security Domain

`security_enforcement` is not explicitly set in `.planning/config.json`, but this is a local-first single-user app with **no authentication backend, no network calls, no server-side session** — there is no auth/session/access-control surface in v1. The relevant categories are narrow:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local-first, no auth in v1 |
| V3 Session Management | no | No server sessions |
| V4 Access Control | no | Single-user local data |
| V5 Input Validation | yes | `update_settings` validates via typed `ValidationIssue[]` (no throw — Phase 1 D-07); Zod `settingsSchema` gates import boundary (integer/string invariants). Import (D-13) round-trips Phase 2 DATA-06 validation (schema + references + resource invariants) before replacing local state. |
| V6 Cryptography | no | No secrets handled this phase |
| V7 Error Handling | yes | WebGL failure = graceful inline note (D-07), not a crash; rejected `update_settings` surfaces via `lastRejection` (existing pattern). |
| V9 Communications | no | Offline; sync deferred to v2 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious archive import (D-13) | Tampering / Elevation | Phase 2 DATA-06 restore validation: Zod schema → reference checks → resource invariants BEFORE any local write. Replace mode only in UI (no merge exposure). |
| UI-04 economy corruption via renderer | Tampering | The render layer has NO write path to Dexie (ESLint-enforced boundary); repository is the sole writer. Property test asserts visual-event drop/skip leaves `nextState`/`operations`/`issues` identical. |
| DOM-based settings injection | Tampering | Settings form uses controlled React inputs; values clamped/validated client-side before dispatch; simulation re-validates. |

## Sources

### Primary (HIGH confidence)
- **Codebase** — `src/render/flowgrid/{scene,adapter,hex-layout}.ts`, `src/persistence/database.ts`, `src/domain/{records,result}.ts`, `src/simulation/{engine,visual-events,commands/*}.ts`, `src/ui/{flowgrid-home,core-panel}/*`, `src/app/{routes,store/dispatch}.ts`, `src/persistence/{export-json,validation-schemas}.ts`, `eslint.config.js`, `package.json`, `vitest.config.ts` — read in full this session.
- **npm registry** (`npm view`) — verified versions + peerDependencies for `pixi.js@8.19.0`, `@playwright/test@1.61.1`, `@axe-core/playwright@4.12.1`, `axe-playwright@2.2.2`, `@pixi/particle-emitter@5.0.10` (peerDeps `< 8.0.0`), `@pixi/tween` (not found).
- **PixiJS v8 release docs** (`pixijs.download/release/docs/`) — `scene-16.html.md` (ParticleContainer/Particle), `ticker.html.md` (Ticker), `accessibility.html.md` (AccessibilitySystem DOM-overlay — rejected for D-06), `utils.isWebGLSupported.html.md`, `llms.txt` (full v8 API index).
- **Playwright docs** (`playwright.dev/docs/api/class-testconfig`) — `webServer` config verified for `vite preview`.

### Secondary (MEDIUM confidence)
- MDN — `prefers-reduced-motion` media query (well-established platform API).
- `@axe-core/playwright` canonical usage (Deque repo, `dequelabs/axe-core-npm`).

### Tertiary (LOW confidence — flagged for verification)
- Headless Chromium SwiftShader WebGL flags (A1) — standard knowledge but exact flag set should be confirmed against the installed Chromium version during Wave 3 execution.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all versions verified via `npm view`; v8 APIs verified via official release docs.
- Architecture: **HIGH** — every pattern maps to an existing codebase idiom (route-peer, command template, migration harness, adapter).
- Pitfalls: **HIGH** for the version landmines (SLOP/incompatible packages verified on the registry); **MEDIUM** for headless WebGL flags (assumed, to confirm).
- Migration: **HIGH** — the v4→v5 pattern is byte-for-byte the proven v3→v4 / v2→v3 / v1→v2 pattern already in `database.ts`.

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (stable libs; Pixi v8 + Playwright move slowly. Re-verify SwiftShader flags + axe/playwright patch versions if execution slips past 30 days.)

## RESEARCH COMPLETE

