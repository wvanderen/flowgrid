# Phase 6: Hardening, Accessibility, and Trust - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This is the **v1 release-readiness / hardening pass** — not a new feature phase. It turns the Phase 3 *static* PixiJS stub into a real animated renderer, formalizes the visual-event safety contract, closes the last semantic-control gap, adds the Settings + export/import surface, and lands the browser/a11y/canvas smoke tests that gate release. It proves the complete browser flow is usable, accessible, visually alive, recoverable, and verifiable.

**In scope (7 requirements):**
- **UI-02** — every critical action reachable through semantic non-canvas controls (the one remaining gap: opening an *existing* Cell from Home is canvas-only).
- **UI-03** — full-motion PixiJS/Canvas/WebGL visuals: Current movement, Bloom bursts, Core convert/store feedback (replacing the Phase 3 static stub).
- **UI-04** — dropping/reducing/replaying/skipping visual events never changes durable economy state (formalized and verified).
- **UI-06** — minimal Settings surface: default session length, daily target defaults, local day boundary, reduced motion, export (+ import, per D-13).
- **VER-04** — browser E2E of the full flow: create Cell → focus → Current/Bloom/Core → rejuvenation → Module Token → forge → reload with state preserved.
- **VER-05** — keyboard + semantic a11y paths for all critical canvas-backed actions.
- **VER-06** — canvas/WebGL smoke: nonblank Cells/Core/routes, reducible/disable-able without breaking economy state.

**It absorbs the deferred Phase 5 Task-4 human visual smoke** (SUMMARY `checkpoint:human-verify`) into automated VER-04/05/06 here.

**Out of scope:**
- New game *capabilities* (advanced modules, patch editor, prestige/Memory, sync transport, native notifications/widgets, analytics) — v2+, see REQUIREMENTS.md "Deferred After V1."
- Pan/zoom camera, `pixi-viewport` (Phase 3 D-04 kept fixed framing; revisited only if Cell counts grow — still deferred).
- Hard-delete of Cells (Phase 3 deferred idea — v2).
- Sound/audio (no audio infrastructure; out of v1).
- Exposing merge-mode import in the UI (D-13 ships replace-local only; merge stays at the persistence API).
- Full visual-regression screenshot baselines (D-17 chose scene-graph probe + pixel sanity over brittle baselines).
- Cloud sync / multi-device (v2 — sync-ready operation rows still emitted).

</domain>

<decisions>
## Implementation Decisions

### Visual Layer Scope (UI-03)
- **D-01:** **Full-motion renderer.** Phase 6 replaces the Phase 3 static PixiJS stub (`src/render/flowgrid/scene.ts` renders static hexes/routes/halos; `adapter.ts` drops visual events) with a full-motion scene: particle Current trails (Cell→Core), Bloom bursts, Core convert/charge ripples, Activation pulse. It consumes the existing 6 visual events and the new ones from D-04. UI-03's named items (Current movement, Bloom bursts, Core conversion/storage feedback) are the priority deliverables.
- **D-02:** **Live ambient Current trail while a focus session is ACTIVE.** While a focus session runs, a gentle continuous Current particle stream flows from the focused Cell toward the Core — the canvas feels alive *during* focus, not only on Finish. Requires a Pixi ticker/animation loop tied to the active-session marker (`CellRecord.activeSessionStartedAt`). The completion `currentFlowVisual` still fires a burst on Finish.
- **D-04:** **Add Forge + Module Token visual events.** The existing `VISUAL_EVENT_NAMES` (`src/domain/result.ts:222`) has 6 entries; none cover Forge, rejuvenation, or token grants. Phase 6 ADDS visual event types for the forge roll/upgrade (`visual:forge_roll` / `visual:module_upgrade`) and the Module Token grant (`visual:token_granted`), extending `VISUAL_EVENT_NAMES` + `src/simulation/visual-events.ts` constructors. The `/forge` and `/core` surfaces get visual feedback through the same animation system. (UI-03's named items remain the priority; rejuvenation/activation-boost-purchase stay text+state-only unless trivially covered by an existing event.)
- **D-05:** **Tween in place — replace the tear-down-rebuild adapter.** The current adapter (`src/render/flowgrid/adapter.ts`) calls `destroyFlowgridScene` + `buildFlowgridScene` on every snapshot reference change, which would kill running particle systems under full motion. Phase 6 switches to building the scene **once** and tweening/updating existing display objects in place (position/color/halo) on snapshot changes, so the live Current trail and bursts survive dispatches (e.g. Start session no longer restarts the particle system).

### Reduced-Motion & Renderer-Failure Contract (UI-04 / UI-06)
- **D-03:** **Static scene fallback when reduced motion is ON or WebGL is unavailable.** When reduced motion is enabled OR Pixi `Application.init` fails, the renderer shows NO particles/tweens — it renders the durable snapshot as static hexes/halos (today's stub behavior). Core/Cell/Activation state stays visible via color + halo. The durable economy is never affected (this IS the UI-04 safety contract, exercised from Phase 3 onward).
- **D-08:** **A single "Reduce motion" setting satisfies both "reduced" and "disabled."** VER-06 requires visuals be "reduced OR disabled." One `reduceMotion` flag is enough: ON = static scene with the animation ticker/particle systems fully off (only durable hexes/halos remain). No separate "disable canvas entirely" mode — the animation system being fully off already satisfies "disabled" while still showing durable state.
- **D-09:** **Reduced-motion auto-detects the OS preference with a manual override.** The `reduceMotion` setting defaults from `window.matchMedia('(prefers-reduced-motion: reduce)')` on first run, but the user can override it in Settings. Honors the OS preference without trapping users who want motion on a reduced-motion OS.

### Non-Canvas Access & WebGL-Failure Recovery (UI-02 + trust)
- **D-06:** **Always-visible semantic Cell list on Home.** A semantic list of Cell links/buttons renders alongside the canvas on `FlowgridHome` (always present), giving keyboard/screen-reader users a path to open an existing Cell (Tab + Enter). This closes the one UI-02 gap (canvas `role="img"` is not keyboard-focusable) and doubles as the no-WebGL fallback. Slight visual redundancy with the hex grid is accepted (the protected `open app → tap Cell → start session` canvas flow stays primary; the list is the accessible peer).
- **D-07:** **Friendly message when WebGL/Canvas init fails.** Replace today's silent fail-soft (`FlowgridCanvas.tsx:65` logs + leaves the container empty, flagged "Phase 6 owns resilience T-03-08") with a short note in the container: "Visuals unavailable — you can still do everything from the Cell list below" + a link to Settings. The economy stays fully usable via the semantic Cell list + panels. No broken/blank frame, no dismissible error-state banner.

### Settings, Export & Import Surface (UI-06)
- **D-10:** **Dedicated `/settings` route.** A new route peer to `/`, `/cells/:id`, `/core`, `/forge` (`src/app/routes.tsx`). Matches the inline-not-modal anti-pattern (Phase 3/4/5 — modal blocks the Generator) and the established route pattern. Add a Settings link to the Home header next to the existing "Core" link.
- **D-11:** **Export = download buttons.** Settings ships two buttons — "Export full state (JSON)" and "Export sessions (CSV)" — each triggering a browser file download. Matches DATA-04/DATA-05 literally (offline, no server). They call the existing `exportJson` (`src/persistence/export-json.ts`) + the sessions-CSV function.
- **D-12:** **Default changes affect new Cells only.** Changing "daily target" / "default session length" defaults in Settings affects ONLY Cells created after the change. Existing Cells keep the targets captured at their creation (`create_cell` reads the defaults once). Predictable; never silently reshapes in-progress Cells.
- **D-13:** **Import/restore button added in v1 — confirm + replace-local.** An import-JSON button ships alongside export in Settings (a deliberate, user-chosen expansion of UI-06's literal "export" — it fits the phase's trust/recovery theme and round-trips the Phase 2 DATA-06 validation). Flow: file pick → confirmation dialog warning local state will be replaced → import in **restore (replace) mode**. Merge mode stays available at the persistence API (`src/persistence/import.ts`) but is not exposed in the UI.

### Verification Strategy (VER-04 / VER-05 / VER-06)
- **D-14:** **Install Playwright.** Add `@playwright/test` + browsers per STACK.md. VER-04/05/06 run as real-browser E2E — the only honest way to cover full click flow, reload-with-IndexedDB-state, keyboard, and a real WebGL canvas (jsdom/happy-dom cannot). A new `playwright.config.ts` + an `e2e/` (or `tests/e2e/`) directory; the existing vitest dual-environment suite (`vitest.config.ts`) stays for unit/integration.
- **D-15:** **Keyboard flow + axe scan for VER-05.** Playwright drives the full critical flow via keyboard only (Tab/Enter through the semantic Cell list, Start/Finish, allocation, rejuvenation, forge, install, export) AND runs an axe-core pass (`axe-playwright`) on each route for automated WCAG issues. Catches both interaction gaps and markup/contrast/ARIA violations.
- **D-16:** **Scene-graph probe + pixel sanity for VER-06 canvas.** Primary assertion: the Pixi stage has the expected Flowgrid-scene children (Cells/Core/routes present) via a test hook exposed from the render layer. Secondary: a coarse pixel check that the canvas is not a single uniform color (non-zero variance). Robust without brittle full-screenshot baselines. Also verifies reduced-motion (D-03/D-08) leaves economy state intact by dispatching actions with motion off and asserting durable records unchanged.
- **D-17:** **E2E runs against the production build (`vite build && vite preview`).** More honest for a release-readiness gate (real bundling, no HMR/dev-only code) than `vite dev`. The deferred Phase 5 Task-4 human visual smoke is replaced by these automated VER-04/05/06 checks.

### Agent's Discretion

The following are mechanical details the user delegated. The agent picks standard, well-tested approaches consistent with prior-phase patterns and documents them in the plan:

- **`update_settings` command shape + the new `SettingsRecord.reduceMotion` field** — there is NO settings-edit command today (settings are seeded once in Phase 2 and read-only since). Phase 6 adds a `update_settings` (or `set_settings`) command variant to the `SimulationCommand` union (`src/domain/result.ts`) + an engine case (`src/simulation/engine.ts`), mirroring how `set_core_allocation` / `log_rejuvenation` were added. The command carries the editable subset (default session length, daily target, local day boundary, reduceMotion) and writes a changed `SettingsRecord` via the existing diff/repository path. The `reduceMotion` boolean is a NEW field on `SettingsRecord` (`src/domain/records.ts:143`) requiring a **Dexie v4→v5 migration** (`src/persistence/database.ts`, currently v4 from Phase 5) — reuse the Phase 2 D-07 synthetic-fixture migration harness + extracted-transform pattern (`upgradeCellsV1ToV2` template); the `settings` store is a singleton so the migration defaults `reduceMotion` from the legacy absence (false). Export/import (`export-json.ts`, `import.ts`, `validation-schemas.ts`) must include the new field; `ARCHIVE_VERSION` bumps if the archive envelope shape changes (Phase 2's fourth version axis).
- **Particle system / ticker implementation** — how the live Current trail (D-02) and bursts are built in Pixi v8 (ParticleContainer, custom tickers, easing libs). Must respect the layer boundary (render imports no React/Dexie/Zustand; UI owns wiring) and the `FlowgridStoreView` structural contract (`adapter.ts`). The planner picks; performance stays content-tunable (particle counts, emission rate).
- **Tween library / approach for D-05** — native Pixi v8 tweening, `@pixi/tween` (verify v8 compat), or a small custom interpolator. The adapter's snapshot-change handler switches from rebuild to property-update.
- **Forge/token visual event names + constructors** — exact `VISUAL_EVENT_NAMES` keys/payloads for D-04 (follow the existing `visual-events.ts` constructor pattern). Where in the simulation they're emitted (the `run_forge` handler for forge events; the rejuvenation threshold-grant loop for token grant). Keep visual events transient (D-02 drop-freely contract).
- **Scene-graph test hook for VER-06** — how Playwright inspects the Pixi stage (a `data-testid`/aria hook on the canvas + a render-layer test export, or a `window.__flowgrid` debug probe gated to test builds). Must not leak into production or violate the layer boundary.
- **CSS-variable color sharing** — `scene.ts:29` hard-codes Pixi color ints mirroring `src/style.css` `@theme` vars; Phase 6 "may move to CSS-variable reads." The planner decides whether to keep hard-coded ints or read computed CSS vars (the latter keeps React + Pixi palette in sync automatically).
- **Settings form validation feedback** — inline hints for invalid session-length/day-boundary inputs, mirroring the existing form patterns (`CreateCellForm`, `EditCellForm`, the Core allocation inline-sum hint).
- **localDayBoundary live-reload** — `FlowgridCanvas.tsx` captures `localDayBoundary` at mount ("if the user changes the boundary they reload"). With a Settings UI, decide whether changing it takes effect immediately (re-derive `localDate`, re-render halos) or still requires a reload. Either is acceptable; reload is simpler.
- **Property-test extension (VER-02)** — extend the Phase 1 fast-check invariant suite for `update_settings` (settings record stays well-formed; reduceMotion is boolean; defaults unchanged for existing Cells per D-12) and the visual-event safety property (dropping/skipping events → nextState/operations/issues identical to consuming them — UI-04).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` — Defines Flowgrid's core value, the protected core interaction (`open app → tap Cell → start session` — D-06's Cell list is the accessible peer, NOT a replacement for the canvas tap), architecture layer rule, economy-safety constraints, **accessibility rule ("canvas visuals must be paired with normal UI controls, semantic labels, and accessible panels")**, append-only history rule, and recovery/prestige constraints. Directly governs this phase.
- `.planning/REQUIREMENTS.md` — Defines Phase 6 requirements `UI-02`, `UI-03`, `UI-04`, `UI-06`, `VER-04`, `VER-05`, `VER-06`. Also touches VER-01/VER-02 (extend unit/property suites for `update_settings` + visual-event safety) and DATA-04/DATA-05/DATA-06 (export/import surfaced in UI this phase).
- `.planning/ROADMAP.md` — Defines Phase 6 goal ("trust Flowgrid as a daily local-first app"), 5 success criteria, Phase 5 dependency, and v1 phase boundary. "UI hint: yes."
- `.planning/STATE.md` — Records Phase 5 completion (2026-06-26) and the deferred Phase 5 Task-4 human visual smoke (`checkpoint:human-verify`) that this phase absorbs into VER-04/05/06.

### Prior Phase Context (decisions that constrain Phase 6)
- `.planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md` — D-07 (typed validation issues, no throwing — `update_settings` rejections follow), D-08 (exact deterministic replay — the new command + animation must preserve this).
- `.planning/phases/02-durable-local-first-spine/02-CONTEXT.md` — D-02 (rejected commands write nothing), D-04 (idempotent upsert), D-07/D-08 (migration harness + four independent version axes — the v4→v5 settings migration reuses the harness; Dexie schema version is store-shape-only), D-09 (full JSON export never strips the operation log — D-11/D-13 must keep export/import complete with the new settings field), D-12 (restore validation — D-13's import round-trips this).
- `.planning/phases/03-playable-generator-flowgrid/03-CONTEXT.md` — D-01/D-02 (the PixiJS 8 stub this phase replaces/augments; "visual events dropped freely" — D-03/D-08 formalize UI-04), D-04 (fixed camera framing — still deferred), D-05/D-06 (active-session marker + diff-for-truth-tick-for-UI — D-02's live trail reads the marker; the cosmetic tick stays decoupled from durable truth), D-16 (localDayBoundary-driven date derivation — Settings edits this).
- `.planning/phases/04-core-alternation-and-rejuvenation-economy/04-CONTEXT.md` — D-09/D-10 (inline-summary-persists-until-next-action pattern), the `/core` route peer pattern (D-10's `/settings` mirrors it), ReturnCues stat-chip rail (Phase 6 keeps it above the canvas).
- `.planning/phases/05-module-forge-and-starter-customization/05-CONTEXT.md` — D-04 (per-level module effects read by simulation), D-09 (ForgeHistoryRecord shape + Dexie v3→v4 migration template — the v4→v5 settings migration follows the same extracted-transform pattern), D-10/D-11 (`/forge` route + `ForgeSummary` inline-summary pattern — `/settings` + any settings feedback mirror these).

### Phase 1–5 Code Contracts (the inputs Phase 6 consumes — MUST read)
- `src/render/flowgrid/scene.ts` — The Phase 3 static stub this phase augments: `buildFlowgridScene` / `destroyFlowgridScene` / `createFlowgridApplication` (async init, `preference: 'webgl'`), hard-coded color ints (line 29 flags CSS-var read as a Phase 6 option), pointertap→onCellTap. D-05 switches from destroy+rebuild to in-place tweening.
- `src/render/flowgrid/adapter.ts` — The store→scene adapter; `connectFlowgridAdapter` drains `pendingVisualEvents` (D-02: currently dropped). D-05 changes its snapshot-change handler from rebuild to update-in-place; D-01/D-02/D-04 make it actually CONSUME visual events.
- `src/render/flowgrid/hex-layout.ts` — `axialToPixel` / `ringCells` (pure hex math, reused unchanged).
- `src/ui/flowgrid-home/FlowgridCanvas.tsx` — Canvas mount + lifecycle; `createFlowgridApplication` fail-soft at line 65 (D-07 replaces the silent empty container); captures `localDayBoundary` at mount (Agent's Discretion: live-reload vs reload).
- `src/ui/flowgrid-home/FlowgridHome.tsx` — Where D-06's semantic Cell list mounts (alongside `<FlowgridCanvas>`); the "New Cell" button + Radix Dialog + ReturnCues + resume prompts already live here.
- `src/ui/flowgrid-home/ReturnCues.tsx` — The stat-chip rail (stays above the canvas, unobstructed).
- `src/domain/records.ts` — `SettingsRecord` (lines 143–149: defaultSessionLengthSeconds, dailyTargetSeconds, localDayBoundary — NO reduceMotion yet; D-08/D-11 add it). `FlowgridSnapshot.settings` singleton.
- `src/domain/result.ts` — `VISUAL_EVENT_NAMES` (line 222, 6 entries — D-04 extends); `SimulationCommand` union (needs the new `update_settings` variant); `SimulationResult` shape (unchanged).
- `src/simulation/engine.ts` — Dispatcher switch; add the `update_settings` case (exhaustive switch guarantees compile-time safety).
- `src/simulation/visual-events.ts` — Visual-event constructors (D-04 adds forge/token-grant constructors here); `src/simulation/systems/day-rollover.ts` — `deriveLocalDate` (Settings' localDayBoundary drives it).
- `src/simulation/commands/set-core-allocation.ts` — Template for the new `update_settings` command (validate → apply → emit operation → return `SimulationResult`).
- `src/persistence/database.ts` — Dexie gateway, currently **v4** (line 222). D-11/D-13 add `version(5)` repeating the full store set + a settings-field transform; `upgradeCellsV1ToV2` (line 54) is the extracted-transform template; the `core` store-name collision note applies.
- `src/persistence/export-json.ts` (`exportJson`, `ARCHIVE_VERSION`) + `src/persistence/import.ts` + `src/persistence/validation-schemas.ts` — D-11's export buttons call `exportJson`; D-13's import calls the restore path. Must include the new settings field; bump `ARCHIVE_VERSION` if the envelope changes.
- `src/app/routes.tsx` — Route table (`/`, `/cells/:id`, `/core`, `/forge`); D-10 adds `/settings`.
- `src/app/store/dispatch.ts` — Single mutation path; `captureCompletedSession`/`captureCompletedRejuvenation`/`captureCompletedForge` pattern — an `update_settings` dispatch follows the same apply path (no new "capture" needed; settings is part of the snapshot).
- `src/app/App.tsx` + `src/ui/shared/ErrorBanner.tsx` — Root error boundary + typed `PersistenceError` renderer (D-07's WebGL-failure message is a distinct, non-error-state surface).
- `src/content/formulas.ts` — `DEFAULT_SESSION_LENGTH_SECONDS` (1500), `DEFAULT_DAILY_TARGET_SECONDS` (1800), `DEFAULT_LOCAL_DAY_BOUNDARY` ('00:00') — the Settings defaults.
- `src/style.css` — `@theme` color tokens (`--color-core`, `--color-cell-activated`, etc.) the Pixi scene mirrors; reduced-motion media-query hook point.
- `vitest.config.ts` — Dual-environment (node + happy-dom) suite; Playwright config (D-14) is separate.

### Stack References (already locked — read for exact wiring)
- `AGENTS.md` "Technology Stack" section — **Playwright** (VER-04/05/06, now installed per D-14), Vitest 4, fast-check, Testing Library + user-event, React 19, Vite 8, Router v7, Tailwind 4, PixiJS 8, Radix UI, lucide-react, Zustand 5, Dexie 4, Zod 4. Architecture rules: domain imports no app/browser/Pixi/React/Dexie/Zustand; render consumes immutable snapshots + transient visual events; UI dispatches commands + reads selectors, never computes economy rules.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/render/flowgrid/{scene,adapter,hex-layout}.ts`** — The stub to augment. `buildFlowgridScene` already resolves active Cells/routes/Core/halos; `connectFlowgridAdapter` already drains `pendingVisualEvents` (just drops them today). D-01/D-05 build on both.
- **`createFlowgridApplication`** (`scene.ts:178`) — Canonical Pixi v8 async-init seam (UI never imports pixi.js directly). D-07 wraps its failure path with a message.
- **`FlowgridHome` + Radix Dialog patterns** — The Cell-list (D-06), Settings link, and any dialogs reuse the existing New-Cell Dialog + ReturnCues + resume-prompt mounting idioms.
- **`/core` and `/forge` route peers** — `CorePanel` / `ForgePanel` are the templates for `/settings` (D-10): a route component reading the store, dispatching commands, rendering inline feedback.
- **`set_core_allocation` command** — The template for `update_settings` (validate → apply → emit operation → return). `set-core-allocation.ts` shows the reject-with-issues pattern for invalid input.
- **`exportJson` + sessions-CSV + `import.ts` restore** — D-11/D-13 call these directly; the Phase 2 validation (DATA-06) already gates restore.
- **`upgradeCellsV1ToV2` + migration harness** (`database.ts:54`, Phase 2 D-07) — Extracted-transform + synthetic-fixture pattern for the v4→v5 settings migration.
- **Vitest dual-environment suite** (`vitest.config.ts`) — Stays for unit/integration; Playwright (D-14) is additive.
- **`ErrorBanner` + typed `PersistenceError`** — Reference for accessible status/alert surfaces (D-07's message is non-error graceful degradation, not a `PersistenceError`).

### Established Patterns
- **Strict layer boundaries** (ESLint-enforced): render imports no React/Dexie/Zustand; UI imports no pixi.js; simulation imports no UI/Pixi/React/Dexie/browser. Phase 6's tweening, test hooks, and Settings UI must respect these.
- **Visual events are transient** (Phase 3 D-02, carried 4/5) — the renderer may drop/reduce/replay/skip them freely; **UI-04 formalizes that this never changes durable economy state.** D-01/D-04 consume them for animation but the safety property is asserted (VER-06/D-16).
- **Inline-not-modal** (Phase 3/4/5) — Settings (D-10) is a route, not a modal; WebGL-failure (D-07) is an inline note, not a blocking dialog.
- **Diff for truth, tick for UI** (Phase 3 D-06 / Phase 4 D-04) — D-02's live trail is a cosmetic tick decoupled from durable truth; `update_settings` writes durable truth via diff.
- **Integer economy units; plain string IDs; typed results no throwing; deterministic replay; hybrid records+operation-log; idempotent upsert.** The new `update_settings` command and migration follow all of these.
- **Four independent version axes** (Phase 2 D-08) — Dexie schema version, ContentVersion, payloadVersion, ARCHIVE_VERSION. The settings-field change bumps Dexie (v4→v5) and possibly ARCHIVE_VERSION.

### Integration Points
- **Render adapter ↔ animation:** `connectFlowgridAdapter` switches from rebuild-on-snapshot to update-in-place; the visual-event drain handler (currently a no-op) becomes the animation feed (D-01/D-02/D-04).
- **`FlowgridHome` ↔ Cell list + canvas failure:** D-06's list and D-07's failure message mount alongside/inside `<FlowgridCanvas>` / `FlowgridHome`.
- **`/settings` ↔ dispatch:** reads `snapshot.settings`, dispatches `update_settings`; export/import buttons call persistence functions and trigger downloads / file pick + confirm.
- **`reduceMotion` ↔ renderer:** the adapter/scene reads the effective reduce-motion value (setting OR media-query default per D-09) to gate the animation ticker (D-03/D-08).
- **Repository ↔ Dexie v5:** `version(5)` repeats the store set with the settings-field transform; export/restore include the new field.
- **Playwright ↔ production build:** `vite build && vite preview` serves the app; E2E drives the full flow + reload + keyboard + canvas probe (D-14/D-15/D-16/D-17).

</code_context>

<specifics>
## Specific Ideas

- **Full motion over minimal/essential** (D-01) was chosen because Flowgrid's identity is "effort becomes visible, useful signal in a modular system" — a static board undersells that promise at v1 release. The user wants the visual layer to *feel* like the game.
- **Live ambient Current trail during active focus** (D-02) was chosen specifically so an in-progress session looks distinct from idle — the canvas should reward the act of focusing in real time, not only flash on completion.
- **Static-scene fallback** (D-03) rather than "no canvas" was chosen so reduced-motion/WebGL-off users still see the durable Flowgrid identity (hexes/halos/colors) — losing the canvas entirely (D-08's rejected option) would strip the app's character for those users.
- **Always-visible Cell list** (D-06) over fallback-only was chosen because accessibility (UI-02/VER-05) should not be conditional on the renderer failing — the semantic path is a first-class peer, and it cleanly doubles as the no-WebGL fallback.
- **Import button added now** (D-13) was a deliberate user override of the "defer" recommendation: the user wants the v1 trust surface to include restore-from-backup, accepting the small scope expansion because it round-trips already-built Phase 2 validation and fits "trust" as the phase theme.
- **Scene-graph probe + pixel sanity** (D-16) over screenshot regression was chosen to avoid brittle baseline maintenance — Flowgrid's canvas is procedural (hex math), so structural assertions are more stable than pixel diffs across OS/GPU/anti-aliasing.
- **Production-build E2E** (D-17) was chosen because release-readiness should test what users actually ship, not dev-only behavior — and it retires the Phase 5 human-smoke debt with automation.

</specifics>

<deferred>
## Deferred Ideas

- **Pan/zoom camera (`pixi-Viewport` or custom)** — Phase 3 D-04 kept fixed framing; stays deferred until Cell counts grow enough to need navigation.
- **Sound / audio feedback** — no audio infrastructure in v1; out of scope.
- **Visual-regression screenshot baselines** — D-16 chose structural + pixel-sanity over brittle full-screenshot diffs; could return if visual regressions slip past the structural probes.
- **Merge-mode import in the UI** — D-13 ships replace-local only; merge stays at the persistence API. Could be exposed if users need partial/additive restore.
- **Per-Cell reduced-motion granularity / motion-intensity slider** — D-08 ships a single on/off toggle; a granularity slider is a future polish.
- **Live localDayBoundary reload** — whether changing the day boundary takes effect without a reload (Agent's Discretion this phase); a hot-reload could be a later polish.
- **Rejuvenation / activation-boost-purchase / Energy-sink particle events** — D-04 adds forge + token-grant only; rejuvenation and boost-purchase stay text+state unless trivially covered. A fuller "every economy event animates" pass is future.
- **Native notifications / widgets / platform integrations** — v2 (PLAT-01).
- **Cloud sync / multi-device** — v2 (SYNC-01/02/03); sync-ready operation rows continue to be emitted.

</deferred>

---

*Phase: 6-Hardening, Accessibility, and Trust*
*Context gathered: 2026-06-26*
