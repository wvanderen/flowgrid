# Phase 6: Hardening, Accessibility, and Trust - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-26
**Phase:** 06-Hardening, Accessibility, and Trust
**Areas discussed:** Visual layer scope (UI-03), Non-canvas access & WebGL failure (UI-02 + trust), Settings & export surface (UI-06), Verification strategy (VER-04/05/06)

---

## Gray areas selected

| Area | Selected |
|------|----------|
| Visual layer scope (UI-03) | ✓ |
| Non-canvas access & WebGL failure (UI-02 + trust) | ✓ |
| Settings & export surface (UI-06) | ✓ |
| Verification strategy (VER-04/05/06) | ✓ |

All four areas were selected for discussion.

---

## Visual layer scope (UI-03)

### Q1 — How far should Phase 6 animation go beyond the static stub?

| Option | Description | Selected |
|--------|-------------|----------|
| Full motion | Particle Current trails Cell→Core, Bloom bursts, Core convert/charge ripples, Activation pulse. Consumes all 6 visual events. Most game-feel; most effort. | ✓ |
| Essential motion | Bloom bursts + Core convert/charge feedback + Activation pulse. Skip flowing Current trails. | |
| Minimal motion | Near-static: gentle idle pulses + one-shot Bloom flash. Leaves Current trails to future polish. | |

**User's choice:** Full motion
**Notes:** Flowgrid's identity is "effort becomes visible signal" — a static board undersells that at v1 release.

### Q2 — Live ambient Current trail while a focus session is ACTIVE, or completion burst only?

| Option | Description | Selected |
|--------|-------------|----------|
| Live ambient trail | Continuous Current particle stream Cell→Core while a session runs; canvas feels alive during focus. Needs a ticker tied to the active-session marker. | ✓ |
| Completion burst only | Static during session; one-shot Current burst on Finish (existing currentFlow event). | |

**User's choice:** Live ambient trail

### Q3 — When reduced motion is ON (or WebGL unavailable), what should the renderer show?

| Option | Description | Selected |
|--------|-------------|----------|
| Static scene fallback | No particles/tweens — durable snapshot as static hexes/halos (today's stub). Economy unaffected (UI-04). | ✓ |
| Reduced motion only | Drop live trail + bursts, keep instant one-shot state changes (Bloom flash, halo, Core color shift). | |
| No canvas at all | Hide canvas; rely on semantic Cell list/panels. Most conservative; loses visual identity. | |

**User's choice:** Static scene fallback

### Q4 — Only 6 visual events exist; none for Forge/rejuvenation/tokens. Add new ones?

| Option | Description | Selected |
|--------|-------------|----------|
| Add Forge + token events | New visual events for forge roll/upgrade + Module Token grant. /forge + /core get visual feedback. | ✓ |
| Stick to the existing 6 | Animate only UI-03's literal named items; forge/rejuvenation stay text+state only. | |
| Add all (forge + rejuvenation + token) | Every economy event gets a visual counterpart. Most coverage; most work. | |

**User's choice:** Add Forge + token events

### Q5 — Today the adapter tears down + rebuilds the whole scene on every snapshot change. With live trail + bursts that kills running animations. Switch to tweening?

| Option | Description | Selected |
|--------|-------------|----------|
| Tween in place | Scene built once; snapshot changes update existing objects via tweens, particle systems keep running. | ✓ |
| Keep tear-down-rebuild | Simpler, matches today's code, but every dispatch interrupts the live trail. Janky under full motion. | |
| Hybrid (tween state, rebuild particles) | Tween durable objects; rebuild only the transient particle layer per event. | |

**User's choice:** Tween in place

---

## Non-canvas access & WebGL failure (UI-02 + trust)

### Q1 — How should a user open an existing Cell without the canvas?

| Option | Description | Selected |
|--------|-------------|----------|
| Always-visible Cell list | Semantic Cell links/buttons alongside the canvas on Home, always present. Keyboard Tab+Enter. Doubles as no-WebGL fallback. | ✓ |
| Fallback list only when canvas unavailable | Show list ONLY when WebGL fails / no-canvas mode. Clean Home but conditional path. | |
| Cell-picker menu | "Open Cell" button → Radix Menu/Combobox. Compact, always keyboard-reachable. | |

**User's choice:** Always-visible Cell list

### Q2 — When WebGL/Canvas init fails, what should the canvas container show?

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly message + rely on Cell list | Note ("Visuals unavailable — use the Cell list below") + Settings link. No broken frame. | ✓ |
| Silent empty container (today) | Log to console, leave empty. Cell list already covers usability. | |
| Canvas-less mode banner | Dismissible banner + retry button. More prominent; risks feeling like an error state. | |

**User's choice:** Friendly message + rely on Cell list

### Q3 — VER-06 says visuals must be "reduced OR disabled". Reduced-motion→static (Q3 above) enough, or add a separate fully-disabled mode?

| Option | Description | Selected |
|--------|-------------|----------|
| Reduced-motion (static) is enough | One toggle. ON = static, animation fully off (satisfies both reduced and disabled). One code path. | ✓ |
| Separate "Disable visuals" option | Two settings: reduce (static) AND disable (canvas hidden, Cell list is Home). Two renderer states. | |

**User's choice:** Reduced-motion (static) is enough

### Q4 — Should reduced-motion auto-detect from `prefers-reduced-motion`, or be purely manual?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect + manual override | Default from matchMedia on first run; user can override in Settings. | ✓ |
| Purely manual | Defaults OFF; user must discover/enable it. | |
| Auto-detect only (no override) | Always follow media query; no toggle. Violates UI-06 listing reduced motion as configurable. | |

**User's choice:** Auto-detect + manual override

---

## Settings & export surface (UI-06)

### Q1 — Where should Settings live?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /settings route | New route peer to /, /cells/:id, /core, /forge. Matches inline-not-modal; add Settings link by "Core". | ✓ |
| Modal/drawer from Home | Radix Dialog/Drawer from a Settings button. Conflicts with "modal blocks the Generator". | |
| Split: reduced-motion inline, rest in route | Quick toggle visible + /settings route for the rest. Two places to maintain. | |

**User's choice:** Dedicated /settings route

### Q2 — How should export work from Settings?

| Option | Description | Selected |
|--------|-------------|----------|
| Download buttons | "Export full state (JSON)" + "Export sessions (CSV)" → browser file downloads. Matches DATA-04/05. | ✓ |
| Download + copy-to-clipboard | Buttons that download AND offer copy-JSON. Redundant. | |
| Inline preview then download | Show JSON/CSV in a text area before download. Heavier for rare action. | |

**User's choice:** Download buttons

### Q3 — When defaults (daily target / session length) change, should existing Cells update or only new ones?

| Option | Description | Selected |
|--------|-------------|----------|
| New Cells only | Defaults affect only future Cells; existing keep captured targets. Predictable. | ✓ |
| Apply to all existing Cells | Bulk-update every Cell. Risky retroactive edits. | |
| Per-Cell override prompt | Ask on change. Most flexible; adds a confirmation step. | |

**User's choice:** New Cells only

### Q4 — UI-06 names "export" but not import. Add an import-JSON button in Settings for v1, or defer?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer import UI to a later phase | UI-06 lists export only; import is a new capability (file pick, merge/replace, confirm). | |
| Add import button now | Ship import-JSON alongside export; round-trips Phase 2 DATA-06 validation. Fits trust/recovery theme. | ✓ |

**User's choice:** Add import button now (deliberate user override of the defer recommendation)

### Q5 — Import/restore can merge or replace. What should the flow do?

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm + replace-local | Confirmation dialog warns state will be replaced, then imports (restore mode). Simplest mental model. | ✓ |
| Offer merge vs replace choice | Dialog lets user pick merge or replace. Exposes Phase 2 complexity; needs clear copy. | |
| Merge by default | Add new records without touching existing. Non-destructive but "restore" usually means replace. | |

**User's choice:** Confirm + replace-local

---

## Verification strategy (VER-04/05/06)

### Q1 — STACK.md names Playwright. Install it now?

| Option | Description | Selected |
|--------|-------------|----------|
| Install Playwright | Add @playwright/test + browsers. Real-browser E2E for full flow, reload, keyboard, WebGL canvas. | ✓ |
| Extend vitest browser mode | Use vitest 4 browser mode. Less tooling; weaker a11y/Canvas than Playwright. | |
| Keep jsdom/happy-dom only | Cover what's possible in happy-dom; can't honestly verify reload/canvas. | |

**User's choice:** Install Playwright

### Q2 — How should VER-06 assert the canvas is "nonblank"?

| Option | Description | Selected |
|--------|-------------|----------|
| Scene-graph probe + pixel sanity | Assert Pixi stage has expected children + coarse non-uniform-color pixel check. Robust, no brittle baselines. | ✓ |
| Screenshot/visual regression | Diff against reference screenshot (toHaveScreenshot). Precise but brittle to OS/GPU/AA. | |
| WebGL readback only | gl.readPixels sample. Lower-level, GPU-dependent. | |

**User's choice:** Scene-graph probe + pixel sanity

### Q3 — How thorough should VER-05 accessibility verification be?

| Option | Description | Selected |
|--------|-------------|----------|
| Keyboard flow + axe scan | Playwright keyboard traversal of full flow AND axe-core pass per route. Catches interaction + markup issues. | ✓ |
| Keyboard flow only | Keyboard + role/label assertions, no axe. Lighter; misses contrast/ARIA. | |
| axe scan only | axe-core per route, no scripted keyboard flow. Misses whether keyboard completes actions. | |

**User's choice:** Keyboard flow + axe scan

### Q4 — Run E2E against production build or dev server? (Absorbs deferred Phase 5 smoke.)

| Option | Description | Selected |
|--------|-------------|----------|
| Production build (vite preview) | `vite build && vite preview`. Honest release gate; replaces Phase 5 human smoke with automation. | ✓ |
| Dev server (vite dev) | Faster feedback; tests dev-only behavior, can mask prod issues. | |
| Both | Dev for feedback + preview for gating. Double CI time/complexity. | |

**User's choice:** Production build (vite preview)

---

## Agent's Discretion

Areas delegated to the agent (documented in CONTEXT.md `<decisions>` → "Agent's Discretion"):
- `update_settings` command shape + new `SettingsRecord.reduceMotion` field + Dexie v4→v5 migration.
- Particle system / ticker implementation (D-02) and tween library/approach (D-05).
- Forge/token visual event names + constructors + emission sites (D-04).
- Scene-graph test hook for VER-06 (D-16).
- CSS-variable color sharing vs hard-coded Pixi ints (scene.ts:29).
- Settings form validation feedback; localDayBoundary live-reload vs reload.
- Property-test extension for `update_settings` + the UI-04 visual-event safety property.

## Deferred Ideas

(See CONTEXT.md `<deferred>` for the full list — pan/zoom camera, sound/audio, screenshot regression baselines, merge-mode import UI, per-Cell motion granularity, live localDayBoundary reload, rejuvenation/boost particle events, native notifications/widgets, cloud sync.)
