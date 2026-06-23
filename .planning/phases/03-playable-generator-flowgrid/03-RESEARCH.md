# Phase 3: Playable Generator Flowgrid - Research

**Researched:** 2026-06-23
**Domain:** App-shell wiring (React 19 + Vite 8 + Router v7 + Tailwind 4 + Zustand 5), PixiJS 8 stub scene, custom hex math, Dexie v1→v2 migration, new simulation commands, daily-rollover reconciliation, Cell Board UI
**Confidence:** HIGH

> **Config note:** `.planning/config.json` has `workflow.nyquist_validation: false` → the **Validation Architecture** section is intentionally omitted. `mode: yolo`, `parallelization: false`, `commit_docs: true`.

<user_constraints>
## User Constraints (from CONTEXT.md — verbatim)

### Locked Decisions (research THESE, not alternatives)

**Flowgrid Home Rendering**
- **D-01:** Ship a PixiJS 8 stub scene for Flowgrid Home in Phase 3. Current trails, Bloom bursts, route flow packets, Core ripples, and continuous animation stay deferred to Phase 6 (UI-03).
- **D-02:** The Phase 3 stub renders **static state only**: Core at center, hex Cells in rings, selection ring, Activation/Bloom-ready state (e.g. a halo/filled hex when `cell.lastBloomLocalDate === env.localDate`), routes drawn as static lines. `VisualEvent`s emitted by the simulation are received by the adapter but only logged/dropped — Phase 6 implements the animation consumers. Honors UI-04's eventual safety contract by exercising "drop visual events freely" from day one.
- **D-03:** Tapping a Cell opens the Cell Board route (`/cells/:id`). Pixi hit-detection resolves the cellId; React Router owns the navigation. No global selection state in Phase 3.
- **D-04:** Fixed camera framing — Core centered, Cells arranged in rings, entire Flowgrid fits the viewport. No pan/zoom, no `pixi-Viewport`.

**Active Session Lifecycle**
- **D-05:** Start-markered hybrid. Transient Zustand store carries `{ cellId, startedAt }` for the live timer; on `start_focus_session`, a lightweight `activeSessionStartedAt` field is written on `CellRecord` (or a small `ActiveSessionRecord`) so reload surfaces a "resume or discard?" prompt. Accumulated duration is NOT checkpointed — resume recomputes `elapsed = now - startedAt`.
- **D-06:** Diff for truth, tick for UI. `complete_focus_session` receives `startedAt + endedAt + durationSeconds` derived from injected wall-clock `now` (`floor((endedAt - startedAt) / 1000)`). React display timer uses `setInterval` cosmetically, decoupled from durable truth.
- **D-07:** Cancel writes nothing durable. No `SessionRecord`, no `SyncOperation`, no audit row. Only effect is clearing the active-session marker.
- **D-08:** Sub-second finish is treated as a cancel. If `floor((endedAt - startedAt) / 1000) <= 0`, route through cancel path.

**Cell CRUD & Archive**
- **D-09:** Add a `create_cell` simulation command. Input: `name`, `color`, optional `icon`, `dailyTargetSeconds`, command-supplied `operationId`, command-generated `cellId` + starter module/route IDs. Instantiates the four starter ModuleInstances, wires Output route to existing Core at `allocationPercent: 100`. UI-built records rejected (simulation owns truth).
- **D-10:** Extend `CellRecord` with `color: string` (hex), `icon: string | null` (lucide name or emoji), `archivedAt: IsoDateTimeString | null`. Bump Dexie schema **v1 → v2** with a transform that defaults existing Cells to `'#6b7280'`, `icon: null`, `archivedAt: null`. (Possibly also `activeSessionStartedAt` per D-05 — planner picks one.)
- **D-11:** `edit_cell` edits identity + target only: `name`, `color`, `icon`, `dailyTargetSeconds`. Economy/progress fields are NEVER UI-editable.
- **D-12:** Archive now, delete deferred. `archive_cell` / `unarchive_cell` flip `archivedAt` to `now`/`null`. Archived Cells hidden from Flowgrid Home and Cell picker but visible behind a History/Archived filter. No deletion path.

**Daily Rollover & Momentum**
- **D-13:** Belt-and-suspenders day rollover. Run deterministic `reconcileDayRollover(snapshot, env)` pass on app open (after repository load, before UI renders). Each Cell-touching command also checks `lastBloomLocalDate` vs `env.localDate` inline and resets stale per-day state. Display-only state resets at app open; durable truth resets at the next command — neither path drifts.
- **D-14:** Mild Momentum decay on miss. Momentum `+1` when Bloom fires (SIM-06). On app-open day-rollover, if yesterday had no completed session for a Cell, Momentum `-1` (floor `0`). Initial value `0`. Streak-with-grace and monotonic-up-only both rejected.
- **D-15:** Activation bonus = +% Current from Generator. While Activated (`lastBloomLocalDate === env.localDate`), `complete_focus_session` applies a flat bonus to generated Current (e.g. `+10%`, matching `docs/gameplay-spine-draft.md` §14 — exact value content-tunable). Visible in Cell inspector and on the hex (Activation halo via D-02).
- **D-16:** Local day is derived from `SettingsRecord.localDayBoundary` (default `'00:00'`). Injected `env.localDate` is the resolved local-date string computed as `floor(now - boundary offset)` — already respecting the user's chosen day boundary.

### the agent's Discretion (research options, recommend)
- **App shell & state coordination** — Zustand vanilla store (or small bound React hook) holds latest `FlowgridSnapshot`, selected cellId, active-session marker, pending visual events, command dispatch status. STACK.md locks the stack; planner picks exact wiring.
- **Stack installation cadence** — one cohesive install preferred over staged; Pixi v8 async-init pattern must be respected.
- **Active-session marker storage** — field on `CellRecord` vs. small singleton `ActiveSessionRecord` keyed by cellId. Field-on-Cell is simpler; only supports one active session (correct for Phase 3).
- **Session completion summary surface** — modal/drawer/panel/route. SESS-05 lists content. "Next useful action" is a small selectors function, not AI.
- **Testing strategy** — Vitest with jsdom or happy-dom for React/RTL; `fake-indexeddb` for persistence; Pixi rendering NOT unit-tested (Phase 6 owns canvas smoke tests, VER-06). fast-check extends Phase 1 invariant suite.
- **Routes** — `/` (Home), `/cells/:cellId` (Cell Board), plus surfaces for completion summary and archived-Cell filter.
- **CSS / design tokens** — Tailwind 4 + small CSS-variable layer for Flowgrid colors (Pixi and React share values).
- **Day-boundary computation helper** — pure function in `src/simulation` or `src/content` taking `now + localDayBoundary → LocalDateString`.

### Deferred Ideas (OUT OF SCOPE — ignore completely)
- Hard-delete of Cells (v2); Current trail/Bloom burst/Core ripple/route packet animation (Phase 6 UI-03); pan/zoom camera (later phase); quick-action menu on Cell tap (rejected for Phase 3); durable active-session records with periodic checkpointing (revisit if data loss reported); Momentum streak-with-grace-window (revisit if Momentum unlocks capacity); daily target editability moving to Settings-managed default (revisit if noisy).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CELL-01 | Create a Cell with name, color, optional icon, daily target, starter defaults | New `create_cell` command (D-09); reuses `createStarterFlowgridState` pattern; CellRecord D-10 extension |
| CELL-02 | Inspect Cell XP, level, Momentum, Charge, milestone progress, Activation, modules, recent sessions | Cell Board route (`/cells/:cellId`) + selectors (`getCellById`, `getStarterModuleInstanceForCell`, `getRecentSessions`) |
| CELL-03 | Edit Cell identity + daily target without losing history | New `edit_cell` command (D-11) — identity fields only, never economy |
| CELL-04 | Archive a Cell hidden from active use, preserving sessions/history | New `archive_cell`/`unarchive_cell` commands (D-12) flipping `archivedAt`; Home + picker filter |
| CELL-05 | New Cells include starter modules: Generator, Charge Core, Output, Bloom | `create_cell` reuses `STARTER_MODULE_DEFINITIONS` + Output route to Core at 100% |
| SESS-01 | Start focus session from selected Cell with one primary Generator action | New `start_focus_session` command (D-05); Generator tile on Cell Board is the primary action |
| SESS-02 | Finish session, proportional rewards based on duration | Existing `complete_focus_session` (Phase 1) + D-15 Activation bonus |
| SESS-03 | Cancel/discard active session without accidental rewards | New `cancel_focus_session` command (D-07): writes nothing durable; D-08 sub-second = cancel |
| SESS-05 | View completion summary: duration, Current, XP, milestone, Energy/Core outcome, Bloom/Activation, next action | Completion summary surface (Agent's Discretion shape); SessionRecord already carries all fields from Phase 2 |
| SIM-01 | Focus time deterministically generates Current, XP, Momentum, milestone, visual events | Existing `complete-focus-session.ts` (deterministic); D-15 adds Activation +% Current |
| SIM-02 | Cell XP grows local identity/capacity without gating global families | Existing `generateXp`; `xp` already a Cell field; no global gating in scope |
| SIM-03 | Momentum forgiving, supports return after missed days | D-14 Momentum decay: `-1` on missed day, floor 0, recovers in one Bloom |
| SIM-04 | Daily milestone accumulates from partial sessions, resets per local day rules | `reconcileDayRollover` (D-13) resets `dailyMilestoneProgressSeconds` on stale `lastBloomLocalDate` |
| SIM-05 | Daily milestone complete → Bloom fires once per Cell/day | Existing `applyBloom`/`shouldFireBloom` already enforces once-per-localDate |
| SIM-06 | Bloom creates signal, increases Momentum, emits visuals, activates Cell until local day reset | D-14: add Momentum `+1` inside/alongside `applyBloom`; existing `bloomBurstVisual`/`cellActivationVisual` emitted |
| SIM-07 | Activated Cells expose visible state + simple module-aware benefit, not mandatory | D-15 Activation +% Current (visible halo via D-02; Current still generates without Activation) |
| UI-01 | Core-centered hex Flowgrid Home with compact Cells and selection state | PixiJS 8 stub scene (D-01/D-02/D-04); custom hex math module; Pixi hit-detection → Router nav (D-03) |
| UI-05 | Open Cell Board/inspector showing starter modules, ports/slots, Cell Charge, Bloom progress, installed rewards | `/cells/:cellId` route; React components for four starter module tiles + inspector fields |
</phase_requirements>

## Summary

Phase 3 is the **first visible, playable loop**. It consumes Phase 1's pure simulation + Phase 2's durable persistence and adds the React/Vite/Pixi app shell, six new simulation commands, a Cell Board UI, a PixiJS 8 stub scene that proves the renderer/simulation safety boundary, and the forgiving daily-loop mechanics (Momentum, day rollover, once-per-day Bloom, visible Activation). Every locked decision in CONTEXT.md (D-01 through D-16) maps cleanly onto existing Phase 1/2 contracts: the `SimulationResult` shape is unchanged, the engine dispatcher's exhaustive switch catches missing handlers at compile time, and the repository's diff-write path picks up new Cell writes automatically.

The locked stack (AGENTS.md "Technology Stack") is fully verified against the npm registry with current publish dates. **One critical version-skew finding:** `react-router@8.0.1` shipped 2026-06-18 (peer `react>=19.2.7`); STACK.md/AGENTS.md lock v7. The latest v7 is **7.18.0** — install `react-router@^7.18.0` to honor the locked decision, and use its **declarative/data mode** (`createBrowserRouter` + `<RouterProvider>`), NOT framework mode (`@react-router/dev` + `react-router.config.ts` with `ssr:false`) which is the "file-router/full-stack complexity" STACK.md explicitly rejects. All other locked versions are current and compatible.

Three Wave 0 config gaps must be addressed before any UI code lands: (1) `tsconfig.json` has `lib: ["ES2022"]` with no DOM lib, no `jsx` setting, and `include` covering only `.ts` not `.tsx`; (2) `vitest.config.ts` has `environment: 'node'` but React/RTL tests need `jsdom` or `happy-dom`; (3) no `index.html` exists at the project root (Vite requires one). These are mechanical setup tasks, not design decisions.

**Primary recommendation:** Install the full locked stack in one cohesive commit (React 19.2.7, react-dom 19.2.7, react-router 7.18.0, @vitejs/plugin-react 6.0.3, tailwindcss 4.3.1 + @tailwindcss/vite 4.3.1, pixi.js 8.19.0, zustand 5.0.14, individual @radix-ui/react-* primitives, lucide-react 1.21.0, @testing-library/react 16.3.2 + user-event 14.6.1 + jest-dom 6.9.1, happy-dom 20.10.6). Add a separate `vitest.config.ts` workspace entry (or `// @vitest-environment happy-dom` per-file) for React tests so the existing node-environment simulation/persistence suites are untouched. Extend `CellRecord` with the four new fields and ship the Dexie v2 migration using the verified `.upgrade(tx => tx.table('cells').toCollection().modify(...))` pattern, registered in `tests/persistence/migration-harness.test.ts` alongside the synthetic fixtures.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cell CRUD logic (create/edit/archive) | API / Backend (simulation) | Persistence (write-only) | Simulation owns truth (STACK.md layer rule); repository diff-writes, never runs rules |
| Active-session marker (start/resume/cancel) | API / Backend (simulation command) + Persistence (durable field) | Browser (Zustand transient timer) | D-05 hybrid: durable marker survives reload; transient timer is cosmetic only |
| Focus session lifecycle (start→finish→rewards) | API / Backend (simulation) | Persistence (append session+operation) | `complete_focus_session` already exists; D-15 adds Activation bonus |
| Daily rollover reconciliation | API / Backend (pure simulation fn) | Frontend Server / App shell (invokes on open) | Pure `reconcileDayRollover(snapshot, env)` called after repo load before render (D-13) |
| Flowgrid Home rendering (hex lattice, Core, routes) | Browser (PixiJS 8 canvas) | API (reads selectors, subscribes visual events) | D-01 stub scene; render/flowgrid consumes snapshots + drops visual events |
| Hex tap → Cell Board navigation | Browser (Pixi hit-detection) | Frontend Server (React Router) | D-03: Pixi resolves cellId, Router navigates to `/cells/:id` |
| Cell Board UI (modules, inspector, Generator action) | Frontend Server (React + Radix) | — | UI-05; dispatches commands, reads selectors, never calculates economy |
| Session display timer (live duration) | Browser (React setInterval) | — | D-06: cosmetic only, decoupled from durable `durationSeconds` |
| Local-day derivation (boundary → localDate) | API / Backend (pure helper in simulation/content) | App shell (env factory) | D-16: pure fn, injected into `SimulationEnv.localDate` |
| PersistenceError rendering | Frontend Server (React) | Persistence (emits typed errors) | Phase 2 shipped the typed contract; Phase 3 subscribes and renders |

## Standard Stack

> All versions **VERIFIED** against the npm registry on 2026-06-23 via `npm view <pkg> version`. Node v22.22.3 on the dev machine satisfies every engine/peer requirement.

### Core (locked by AGENTS.md — verified current)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.7 | App shell, panels, forms, inspectors | LOCKED [VERIFIED: npm registry] |
| react-dom | 19.2.7 | React DOM renderer | LOCKED [VERIFIED: npm registry] |
| react-router | ^7.18.0 | App routes (Home, Cell Board, etc.) | LOCKED v7 line [VERIFIED: npm registry]. ⚠️ v8.0.1 exists; see Open Questions Q1. Use declarative `createBrowserRouter` mode, NOT framework mode. |
| @vitejs/plugin-react | 6.0.3 | Vite React Fast Refresh + JSX transform | LOCKED [VERIFIED: npm registry]; peer `vite ^8.0.0` ✓. Optional peers `babel-plugin-react-compiler`, `@rolldown/plugin-babel` NOT required. |
| vite | 8.1.0 | Dev server + bundler | Already in devDependencies [VERIFIED: npm registry] |
| zustand | 5.0.14 | UI/app coordination store (vanilla + bound hook) | LOCKED [VERIFIED: npm registry]; peer `react>=18` ✓ |
| tailwindcss | 4.3.1 | Utility styling | LOCKED [VERIFIED: npm registry]; v4 = CSS-first config |
| @tailwindcss/vite | 4.3.1 | Tailwind v4 Vite plugin | LOCKED [VERIFIED: npm registry]; peer `vite ^5.2‖^6‖^7‖^8` ✓ |
| pixi.js | 8.19.0 | WebGL/WebGPU renderer for Flowgrid hex lattice | LOCKED [VERIFIED: npm registry]; v8 async `Application.init()` |
| dexie | 4.4.4 | IndexedDB wrapper + migrations | Already installed [VERIFIED: npm registry] |
| zod | 4.4.3 | Runtime validation at boundaries | Already installed [VERIFIED: npm registry] |
| vitest | 4.1.9 | Unit/integration/property tests | Already installed [VERIFIED: npm registry] |
| fast-check | 4.8.0 | Property-based invariant tests | Already installed [VERIFIED: npm registry] |

### Supporting (locked — verify-on-install)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | 1.1.17 | Accessible modal/dialog | Completion summary surface (Agent's Discretion) [VERIFIED: npm registry] |
| @radix-ui/react-popover | 1.1.17 | Accessible popover | Cell quick-info, tooltips on hover [VERIFIED: npm registry] |
| @radix-ui/react-tooltip | 1.2.10 | Accessible tooltip | Icon/field hints [VERIFIED: npm registry] |
| @radix-ui/react-switch | 1.3.1 | Accessible toggle | Future settings; Phase 3 minimal use [VERIFIED: npm registry] |
| @radix-ui/react-tabs | 1.1.15 | Accessible tabs | Cell Board section switching [VERIFIED: npm registry] |
| @radix-ui/react-menu | 2.1.18 | Accessible menu | Cell context actions (archive/edit) [VERIFIED: npm registry] |
| lucide-react | 1.21.0 | Icon set | App-shell buttons, Cell icons (`icon` field) [VERIFIED: npm registry]; peer `react ^16.5‖^17‖^18‖^19` ✓ |
| @testing-library/react | 16.3.2 | React component tests | RTL component + accessibility tests [VERIFIED: npm registry] |
| @testing-library/user-event | 14.6.1 | User interaction simulation | RTL keyboard/click flows [VERIFIED: npm registry] |
| @testing-library/jest-dom | 6.9.1 | DOM matchers | `toBeInTheDocument()` etc. [VERIFIED: npm registry] |
| happy-dom | 20.10.6 | DOM shim for Vitest | React/RTL test environment [VERIFIED: npm registry]; engine `node>=20` ✓. Preferred over jsdom for speed; jsdom 29.1.1 also viable. |
| @types/react | 19.2.17 | React types | TypeScript React types [VERIFIED: npm registry] |
| @types/react-dom | 19.2.3 | React DOM types | TypeScript react-dom types [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `createBrowserRouter` (declarative) | React Router framework mode (`@react-router/dev` + `ssr:false`) | Framework mode gives build-time index.html + file-router; STACK.md explicitly rejects "file-router/full-stack complexity" — use declarative mode |
| happy-dom | jsdom 29.1.1 | happy-dom is faster and lighter; jsdom is more complete. Either works; pick one and set it in vitest config. |
| Field-on-CellRecord for activeSessionStartedAt | Singleton `ActiveSessionRecord` | Field-on-Cell simpler (D-05 discretion); singleton cleaner if multi-active-session ever needed. Phase 3 = one active session → field-on-Cell. |
| Individual `@radix-ui/react-*` primitives | `radix-ui` meta-package (1.6.0) | Meta-package is heavier and bundles everything; STACK.md says "primitives" → install only what UI-05/UI-01 need |

**Installation (single cohesive commit per CONTEXT.md Agent's Discretion):**
```bash
npm install react@^19.2.7 react-dom@^19.2.7 react-router@^7.18.0 \
  zustand@^5.0.14 tailwindcss@^4.3.1 @tailwindcss/vite@^4.3.1 pixi.js@^8.19.0 \
  @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-tooltip \
  @radix-ui/react-tabs @radix-ui/react-menu lucide-react@^1.21.0

npm install -D @vitejs/plugin-react@^6.0.3 \
  @testing-library/react@^16.3.2 @testing-library/user-event@^14.6.1 \
  @testing-library/jest-dom@^6.9.1 happy-dom@^20.10.6 \
  @types/react@^19.2.17 @types/react-dom@^19.2.3
```

## Package Legitimacy Audit

> The `gsd-tools query package-legitimacy check` gate flagged every package `SUS` with reason `too-new`. **This is a false-positive recency heuristic** — today is 2026-06-23 and all major frameworks republished within the last ~3 weeks. The authoritative signals are unambiguously healthy: official GitHub repos, tens of millions of weekly downloads, no `postinstall` scripts, not deprecated. All packages below are well-established; the SUS flag is documented here for transparency but does not indicate risk.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| react | npm | ~5 yr (19.2.7 published 2026-06-01) | 151M/wk | github.com/facebook/react | OK (SUS=recency false-positive) | Approved |
| react-dom | npm | ~5 yr | 142M/wk | github.com/facebook/react | OK | Approved |
| react-router@7 | npm | ~9 mo (7.18.0) | 49M/wk | github.com/remix-run/react-router | OK | Approved (pin ^7.18.0) |
| @vitejs/plugin-react | npm | ongoing (6.0.3) | 65M/wk | github.com/vitejs/vite-plugin-react | OK | Approved |
| vite | npm | ongoing (8.1.0) | 143M/wk | github.com/vitejs/vite | OK | Already installed |
| zustand | npm | ~6 yr (5.0.14) | 43M/wk | github.com/pmndrs/zustand | OK | Approved |
| tailwindcss | npm | ~9 yr (4.3.1) | 123M/wk | github.com/tailwindlabs/tailwindcss | OK | Approved |
| @tailwindcss/vite | npm | ~1.5 yr (4.3.1) | 38M/wk | github.com/tailwindlabs/tailwindcss | OK | Approved |
| pixi.js | npm | ~12 yr (8.19.0) | high | github.com/pixijs/pixijs | OK | Approved |
| @radix-ui/react-* | npm | ~5 yr (1.x) | high | github.com/radix-ui/primitives | OK | Approved (install per-need) |
| lucide-react | npm | ~4 yr (1.21.0) | high | github.com/lucide-icons/lucide | OK | Approved |
| @testing-library/react | npm | ~6 yr (16.3.2) | high | github.com/testing-library/react-testing-library | OK | Approved |
| happy-dom | npm | ~5 yr (20.10.6) | high | github.com/capricorn86/happy-dom | OK | Approved |
| jsdom | npm | ~12 yr (29.1.1) | high | github.com/jsdom/jsdom | OK | Viable alternative to happy-dom |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none requiring human-verify (the SUS recency flag is a documented false-positive on every package above; all have official repos and >38M weekly downloads)

## Architecture Patterns

### System Architecture Diagram

```
                                  ┌─────────────────────────────────────┐
                                  │           Browser (DOM)             │
                                  │                                     │
   user tap ─────────────────────►│  React 19 App Shell (src/app)       │
                                  │   ├─ RouterProvider (react-router)  │
                                  │   │   ├─ /        FlowgridHome      │
                                  │   │   └─ /cells/:id  CellBoard      │
                                  │   ├─ Zustand vanilla store          │
                                  │   │   (snapshot, activeSession,     │
                                  │   │    visualEvents, status)        │
                                  │   └─ React UI (src/ui)              │
                                  │       (Radix panels, lucide icons)  │
                                  │                                     │
                                  │  PixiJS 8 Canvas (src/render)       │
                                  │   ├─ Application.init() async       │
                                  │   ├─ hex scene (static, D-02)       │
                                  │   └─ hit-test → cellId → navigate   │
                                  └──────────┬──────────┬───────────────┘
                          selectors read   │          │ command dispatch
                       ◄───────────────────┘          │
          visual events (drop per D-02) ◄─────────────┤
                                                       ▼
                                  ┌─────────────────────────────────────┐
                                  │   Simulation (src/simulation)       │
                                  │   PURE TS — no DOM/Pixi/React/Dexie │
                                  │                                     │
                                  │   runSimulationCommand              │
                                  │     (prev, command, env)            │
                                  │        exhaustive switch            │
                                  │   ├─ create_cell (NEW)              │
                                  │   ├─ edit_cell (NEW)                │
                                  │   ├─ archive_cell (NEW)             │
                                  │   ├─ unarchive_cell (NEW)           │
                                  │   ├─ start_focus_session (NEW)      │
                                  │   ├─ cancel_focus_session (NEW)     │
                                  │   ├─ complete_focus_session (+D-15) │
                                  │   └─ reconcileDayRollover (NEW,     │
                                  │       called at app open)           │
                                  │           │                          │
                                  │           ▼ FlowgridSnapshot (D-10)  │
                                  │   SimulationResult {                │
                                  │     nextState, economyEvents,       │
                                  │     visualEvents, operations,       │
                                  │     validationIssues                │
                                  │   }                                 │
                                  └──────────┬──────────────────────────┘
                                             │ SimulationResult
                                             ▼
                                  ┌─────────────────────────────────────┐
                                  │  Persistence (src/persistence)      │
                                  │  Dexie 4 — IndexedDB gateway        │
                                  │   ├─ v1 → v2 migration (D-10)       │
                                  │   ├─ FlowgridRepository.applyResult │
                                  │   │   (diff-write, atomic tx)       │
                                  │   ├─ loadSnapshot (bulk read)       │
                                  │   └─ PersistenceError (typed)       │
                                  └─────────────────────────────────────┘
```

**Trace the primary use case (start session):** User taps Cell tile on Cell Board → React UI constructs `start_focus_session` command with new operationId → `runSimulationCommand(prev, cmd, env)` → command writes `activeSessionStartedAt` on CellRecord → `SimulationResult.nextState` → `repository.applyResult` diff-writes changed Cell → Zustand store emits new snapshot → React UI shows active timer (cosmetic setInterval) and Generator tile switches to "Finish/Cancel".

### Recommended Project Structure
```
src/
├── app/                    # React app shell (Phase 3 populates)
│   ├── main.tsx            # Vite entry — ReactDOM.createRoot
│   ├── App.tsx             # RouterProvider + global providers
│   ├── routes.tsx          # createBrowserRouter route table
│   ├── store/
│   │   ├── flowgrid-store.ts   # Zustand vanilla store (snapshot, session, status)
│   │   └── dispatch.ts         # UI → command → runSimulationCommand → repo.applyResult
│   └── env.ts             # SimulationEnv factory (now, localDate from settings)
├── ui/                     # React components (Phase 3 populates)
│   ├── flowgrid-home/     # Home route React shell around Pixi canvas
│   ├── cell-board/        # /cells/:cellId — module tiles, inspector, Generator
│   ├── session-summary/   # Completion summary surface (SESS-05)
│   └── shared/            # Buttons, error boundary (PersistenceError render)
├── render/                 # PixiJS adapter (Phase 3 populates)
│   └── flowgrid/
│       ├── scene.ts       # Application.init() + scene build + destroy
│       ├── hex-layout.ts  # axial→pixel projection, rings, hit-test
│       └── adapter.ts     # subscribes store + visual-event channel
├── simulation/            # Phase 1/2 — EXTEND, do not break
│   ├── commands/          # +create-cell, edit-cell, archive-cell, ...
│   ├── systems/           # +day-rollover, Activation bonus in current.ts/bloom.ts
│   └── engine.ts          # +6 cases in exhaustive switch
├── domain/                # Phase 1/2 — EXTEND CellRecord (D-10)
├── content/               # Phase 1/2 — REUSE starter-modules, formulas
└── persistence/           # Phase 2 — ADD v2 migration in database.ts
index.html                 # Vite entry (Phase 3 creates)
src/style.css              # @import "tailwindcss" + @theme tokens
vite.config.ts             # Phase 3 creates (plugin-react + tailwindcss)
```

### Pattern 1: Command Dispatch Loop (extends Phase 1)
**What:** UI → command constructor → `runSimulationCommand` → `repository.applyResult` → Zustand emits.
**When to use:** Every user action that changes durable state.
**Example:**
```typescript
// Source: src/simulation/commands/complete-focus-session.ts (existing Phase 1 pattern)
// + src/persistence/repository.ts applyResult (existing Phase 2 pattern)
// + Zustand vanilla store wiring (verified: github.com/pmndrs/zustand README)

// src/app/store/flowgrid-store.ts
import { createStore } from 'zustand/vanilla';
import type { FlowgridSnapshot, VisualEvent } from '../../domain/index.js';

interface FlowgridState {
  snapshot: FlowgridSnapshot | null;     // null while loading
  activeSession: { cellId: string; startedAt: string } | null;
  pendingVisualEvents: readonly VisualEvent[];  // drained by renderer
  status: 'loading' | 'ready' | 'error';
  lastError: import('../../persistence/errors.js').PersistenceError | null;
}

export const flowgridStore = createStore<FlowgridState>((set) => ({
  snapshot: null,
  activeSession: null,
  pendingVisualEvents: [],
  status: 'loading',
  lastError: null,
}));

// src/app/store/dispatch.ts — bound hook for React
import { useStore } from 'zustand';
export const useFlowgridStore = <T>(selector: (s: FlowgridState) => T) =>
  useStore(flowgridStore, selector);

// src/app/store/dispatch.ts — dispatch path (non-React-safe)
export async function dispatch(
  command: SimulationCommand,
  env: SimulationEnv,
  repository: FlowgridRepository,
): Promise<void> {
  const prev = flowgridStore.getState().snapshot;
  if (!prev) return;
  const result = runSimulationCommand(prev, command, env);
  if (result.status === 'applied') {
    const apply = await repository.applyResult(result);
    if (!apply.ok) {
      flowgridStore.setState({ lastError: apply.error });
      return;
    }
    // D-02: visual events are received but the Phase 3 stub drops them.
    // They are pushed onto pendingVisualEvents so render/flowgrid can log/drop.
    flowgridStore.setState((s) => ({
      snapshot: result.nextState,
      pendingVisualEvents: [...s.pendingVisualEvents, ...result.visualEvents],
    }));
  }
}
```

### Pattern 2: PixiJS v8 Async Init in React
**What:** Mount Pixi canvas inside React with lifecycle + cleanup.
**When to use:** FlowgridHome route mounts the Flowgrid scene.
**Example:**
```typescript
// Source: pixijs.com/8.x/guides/components/application (verified 2026-06-23)
import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';

export function FlowgridCanvas({ onCellTap }: { onCellTap: (cellId: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let app: Application | null = null;
    let cancelled = false;

    (async () => {
      app = new Application();
      // v8: init() is async; app.canvas (NOT app.view — v7→v8 breaking change)
      await app.init({
        background: 0x0f172a,
        resizeTo: containerRef.current ?? undefined,
        preference: 'webgl',          // WebGL is stable; WebGPU optional
        antialias: true,
      });
      if (cancelled || !containerRef.current) {
        app.destroy(true);
        return;
      }
      containerRef.current.appendChild(app.canvas);
      // buildScene(app, snapshot, onCellTap);  // render/flowgrid/scene.ts
    })();

    return () => {
      cancelled = true;
      app?.destroy(true);   // destroy children + renderer
    };
  }, [onCellTap]);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

### Pattern 3: Custom Hex Math Module (pure TypeScript)
**What:** Axial/cube coordinates, pixel projection, hit detection — domain-critical, owned by Flowgrid.
**When to use:** Flowgrid layout, ring arrangement, tap resolution.
**Why custom (not a library):** STACK.md says "Own this code in pure TypeScript so simulation, layout, tests, persistence, and sync all agree." Hex math is ~150 lines; a dependency adds a coupling point with no payoff.
**Example (pointy-top axial, Red Blob convention):**
```typescript
// Source: Red Blob Games "Hexagonal Grids" reference (canonical algorithm source, [CITED: redblobgames.com/grids/hexagons])
// Pure TS, no dependencies. Lives in src/render/flowgrid/hex-layout.ts (or src/simulation/hex.ts
// if simulation ever needs layout-derived invariants — keep it out of domain for now).

export interface AxialCoord { readonly q: number; readonly r: number; }

// pointy-top pixel projection
export function axialToPixel(coord: AxialCoord, size: number): { x: number; y: number } {
  const { q, r } = coord;
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x, y };
}

// inverse for hit detection (fractional axial → rounded axial)
export function pixelToAxial(x: number, y: number, size: number): AxialCoord {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
  const r = (2 / 3 * y) / size;
  return axialRound({ q, r });
}

// cube rounding — eliminates floating-point tap misses
function axialRound(coord: AxialCoord): AxialCoord {
  const s = -coord.q - coord.r;
  let rq = Math.round(coord.q);
  let rr = Math.round(coord.r);
  const rs = Math.round(s);
  const qDiff = Math.abs(rq - coord.q);
  const rDiff = Math.abs(rr - coord.r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
  else if (rDiff > sDiff) rr = -rq - rs;
  return { q: rq, r: rr };
}

// ring N around origin — for laying Cells out around the Core
export function ringCells(radius: number): readonly AxialCoord[] {
  if (radius === 0) return [{ q: 0, r: 0 }];   // Core
  const out: AxialCoord[] = [];
  // start at radius steps in the +r direction, walk the 6 edges
  let coord: AxialCoord = { q: -radius, r: radius };  // adjust for pointy-top
  const directions: AxialCoord[] = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
  ];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      out.push(coord);
      coord = { q: coord.q + directions[i]!.q, r: coord.r + directions[i]!.r };
    }
  }
  return out;
}
```

### Pattern 4: Dexie v1 → v2 Migration (D-10)
**What:** Add `color`, `icon`, `archivedAt` (+ optionally `activeSessionStartedAt`) to existing CellRecords.
**When to use:** First Phase 3 schema change.
**Example:**
```typescript
// Source: dexie.org/docs/Tutorial/Design (verified 2026-06-23)
// Extend src/persistence/database.ts constructor:

constructor(name: string) {
  super(name);
  this.version(1).stores({
    client: 'id', cells: 'id', core: 'id',
    moduleInstances: 'id, ownerCellId',
    routes: 'id, sourceCellId',
    sessions: 'id, cellId, startedAt',
    operations: 'id, status, createdAt',
    settings: 'id',
    forgeHistory: 'id, createdAt',
  });
  this.on('populate', (tx) => { seedStarterState(tx); });
  this.on('blocked', () => { /* typed PersistenceError — unchanged */ });

  // D-10: v2 adds non-indexed fields to cells. Indexes unchanged.
  this.version(2).stores({
    // Same store definitions as v1; new non-indexed fields need NO index entries.
    // Only specify changed stores — but Dexie requires the full set when version(2)
    // declares a stores() that replaces v1's declaration context. Safest: repeat all.
    client: 'id', cells: 'id', core: 'id',
    moduleInstances: 'id, ownerCellId',
    routes: 'id, sourceCellId',
    sessions: 'id, cellId, startedAt',
    operations: 'id, status, createdAt',
    settings: 'id',
    forgeHistory: 'id, createdAt',
  }).upgrade(async (tx) => {
    await tx.table('cells').toCollection().modify((cell: Record<string, unknown>) => {
      if (cell.color === undefined) cell.color = '#6b7280';
      if (cell.icon === undefined) cell.icon = null;
      if (cell.archivedAt === undefined) cell.archivedAt = null;
      // D-05 discretion (if field-on-Cell is chosen):
      // if (cell.activeSessionStartedAt === undefined) cell.activeSessionStartedAt = null;
    });
  });
}
```

**Migration test (D-07/VER-03):** Register real fixtures in `tests/persistence/migration-harness.test.ts` alongside the synthetic ones — the harness (`runMigrationFixture`) is unchanged. Build a v1-shape cell (no new fields), run the upgrade transform, assert the v2 shape with defaults.

### Pattern 5: Day-Rollover Reconciliation (D-13, D-14, D-16)
**What:** Pure function called at app open; resets stale per-day state.
**When to use:** After `repository.loadSnapshot()`, before first UI render.
**Example:**
```typescript
// Source: pure reasoning from D-13/D-14/D-16 + existing bloom.ts/systems pattern
// Lives in src/simulation/systems/day-rollover.ts (or commands/day-rollover.ts)

import type { FlowgridSnapshot, IsoDateTimeString, LocalDateString } from '../../domain/index.js';

// D-16: pure local-date derivation. Lives in src/content or src/simulation.
// boundary is 'HH:MM'; subtract the offset from now to get the effective local date.
export function deriveLocalDate(
  now: IsoDateTimeString,
  localDayBoundary: string,
): LocalDateString {
  const [hh, mm] = localDayBoundary.split(':').map(Number);
  const offsetMs = ((hh ?? 0) * 60 + (mm ?? 0)) * 60 * 1000;
  const adjusted = new Date(new Date(now).getTime() - offsetMs);
  return adjusted.toISOString().slice(0, 10);   // YYYY-MM-DD
}

// D-13: belt-and-suspenders. Resets display state at app open. Durable truth
// is also re-checked inline by each Cell-touching command.
export function reconcileDayRollover(
  snapshot: FlowgridSnapshot,
  env: { readonly now: IsoDateTimeString; readonly localDate: LocalDateString },
): FlowgridSnapshot {
  const cells = new Map(snapshot.cells);
  for (const [id, cell] of cells) {
    // Activation / Bloom reset when lastBloomLocalDate is from a PRIOR day.
    const stale = cell.lastBloomLocalDate !== null && cell.lastBloomLocalDate !== env.localDate;
    if (!stale) continue;

    // D-14: Momentum decay if the prior day had no completed session.
    const hadSessionYesterday = snapshot.sessions.some(
      (s) => s.cellId === id && s.startedAt.slice(0, 10) === cell.lastBloomLocalDate,
    );
    const momentum = hadSessionYesterday ? cell.momentum : Math.max(0, cell.momentum - 1);

    cells.set(id, {
      ...cell,
      dailyMilestoneProgressSeconds: 0,
      // NOTE: activation counter is monotonic lifetime count — do NOT reset to 0.
      // Visibility is derived: lastBloomLocalDate === env.localDate ⇒ Activated today.
      momentum,
      updatedAt: env.now,
    });
  }
  return { ...snapshot, cells };
}
```

**⚠️ Pitfall:** `CellRecord.activation` is a **monotonic lifetime counter** (incremented each Bloom). It is NOT a per-day flag. "Activated today" is *derived* by comparing `cell.lastBloomLocalDate === env.localDate` — see D-02 ("filled hex when `cell.lastBloomLocalDate === env.localDate`"). Do not reset `activation` to 0 in rollover.

### Pattern 6: New Simulation Command Shape
**What:** How to add `create_cell`/`edit_cell`/`archive_cell`/`unarchive_cell`/`start_focus_session`/`cancel_focus_session`.
**When to use:** Extending the `SimulationCommand` union.
**Example (create_cell):**
```typescript
// Source: pattern from src/simulation/commands/complete-focus-session.ts (Phase 1)
// + src/content/starter-state.ts createStarterFlowgridState (reuse for module/route instantiation)

// src/domain/result.ts — extend the union
export interface CreateCellCommand {
  readonly type: 'create_cell';
  readonly operationId: OperationId;
  readonly cellId: CellId;            // command-generated (plain string)
  readonly name: string;
  readonly color: string;             // hex
  readonly icon: string | null;       // lucide name | emoji | null
  readonly dailyTargetSeconds: IntSeconds;
  // command also generates starter module/route IDs internally (not in input)
}
// Add to SimulationCommand union. Engine exhaustive switch gets a new case —
// TypeScript guarantees the handler exists at compile time.

// src/simulation/commands/create-cell.ts
export function createCell(prev, command, env): SimulationResult {
  const issues = validateCreateCell(prev, command);  // name non-empty, color hex, target > 0
  if (issues.length > 0) return rejectWith(prev, issues);

  // Reuse the starter-state pattern for the four modules + Output route to Core.
  const cell: CellRecord = { id: command.cellId, name: command.name, color: command.color,
    icon: command.icon, archivedAt: null,
    xp: 0, current: 0, charge: 0, momentum: 0, activation: 0,
    dailyMilestoneProgressSeconds: 0,
    dailyMilestoneTargetSeconds: command.dailyTargetSeconds,  // D-09 override allowed
    lastBloomLocalDate: null,
    createdAt: env.now, updatedAt: env.now };
  // ... four ModuleInstances + Output route at allocationPercent: 100 to prev.core.id
  // ... one SyncOperation via operationFromCommand(command, env.now, { entityId: cell.id, ... })
  // ... emit cellCreated economy event; no visual events required (or one optional)
  return { status: 'applied', previousState: prev, nextState, /* ... */ };
}
```

**Cancel writes nothing durable (D-07):** `cancel_focus_session` returns a result with `status: 'applied'`, `nextState` = prev with `activeSessionStartedAt` cleared on the Cell, **empty** `operations`/`sessions` arrays, **empty** `economyEvents`. The repository's `applyResult` writes the changed Cell (clearing the marker) but no append-only records — aligns with Phase 2 D-02 ("rejected/not_implemented commands write nothing"). Cancel is `applied` (it does clear the marker) but writes no operation/session row.

### Anti-Patterns to Avoid
- **Persisting the Zustand store** — STACK.md explicitly bans this. Zustand holds view/session coordination only; durable truth lives in Dexie via repository diff-writes. [CITED: AGENTS.md "What Not To Use"]
- **`pixi-Viewport`** — D-04 fixed camera; STACK.md flags its Pixi v8 compatibility as LOW confidence. Hand-roll a simple framing transform if camera work is ever needed. [CITED: STACK.md]
- **UI-built CellRecord values** — D-09 bans this; would violate "simulation owns truth" and bypass invariant validation. All Cell creation flows through `create_cell`.
- **Resetting `activation` counter on day rollover** — it is a monotonic lifetime count; "Activated today" is *derived* from `lastBloomLocalDate === env.localDate`.
- **React Router framework mode** — STACK.md rejects "file-router/full-stack complexity." Use `createBrowserRouter` declarative mode.
- **Hand-rolled DOM/SVG renderer for Flowgrid** — STACK.md says DOM/SVG will strain under Current trails/particles/large graphs. Phase 3 ships the PixiJS adapter deliberately (D-01) to prove the boundary early.
- **`Math.random()` in simulation** — Phase 1 D-08 exact-replay. RNG is injected via `SimulationEnv`. D-14/D-15 must not introduce ambient randomness.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hex grid math | A from-scratch coordinate system guessing at neighbors/rings | Custom axial/cube module using Red Blob algorithms | ~150 lines; domain-critical; a library adds a coupling point with zero payoff (STACK.md: "Own this code") |
| IndexedDB migrations | Custom version-tracking + transform runner | Dexie `version(N).stores().upgrade()` | Handles version diff, rollback on error, populate-vs-upgrade distinction atomically |
| Accessible dialogs/menus/tabs | Custom focus-trap + ARIA wiring | `@radix-ui/react-*` primitives | Unmanaged focus + ARIA is a long-tail accessibility bug factory (UI-02/VER-05 in Phase 6) |
| Command-result-event plumbing | A new event emitter framework | Existing `SimulationResult` shape + `operationFromCommand` | Phase 1/2 already establish the contract; reuse verbatim |
| Display timer accuracy | A high-precision ticker in durable state | Cosmetic `setInterval` in React (D-06) | Durable duration is `floor((endedAt - startedAt)/1000)`; UI timer is display-only |
| Local-date computation | Custom timezone logic | `deriveLocalDate(now, boundary)` pure helper (D-16) | Boundary is just an offset; `Date.getTime() - offsetMs` is exact |

**Key insight:** Phase 3's riskiest new code is the **day-rollover reconciliation** and the **Activation bonus wiring** — both must preserve Phase 1's exact-replay property (D-08). Everything else composes existing systems.

## Common Pitfalls

### Pitfall 1: Pixi v8 `app.view` vs `app.canvas`
**What goes wrong:** Code written from v7 examples uses `app.view` to append the canvas; v8 renamed it to `app.canvas` and the property does not exist.
**Why it happens:** Most Pixi tutorials and Stack Overflow answers predate v8.
**How to avoid:** Use `app.canvas` everywhere. The v8 migration guide (`pixijs.com/8.x/guides/migrations/v8`) lists every rename.
**Warning signs:** `Cannot read property 'appendChild' of undefined` or TypeScript error on `app.view`.

### Pitfall 2: React Router v7 mode confusion
**What goes wrong:** Installing `@react-router/dev` and writing `react-router.config.ts` pulls in framework mode (SSR, file-router, build-time data loading) — the exact "full-stack complexity" STACK.md rejects.
**Why it happens:** v7 docs lead with framework mode; the declarative `createBrowserRouter` API is described as "data mode" and is less prominent.
**How to avoid:** Install only `react-router` (the unified package). Use `createBrowserRouter([{ path, element }])` + `<RouterProvider router={router} />`. Do NOT install `@react-router/dev`, `@react-router/node`, or `@react-router/serve`.
**Warning signs:** A `react-router.config.ts` file appears; `react-router build` is in scripts.

### Pitfall 3: React test environment mismatch
**What goes wrong:** Adding `import { render } from '@testing-library/react'` to a test under the current `vitest.config.ts` fails with `document is not defined` because the environment is `node`.
**Why it happens:** Phase 1/2 tests are pure Node; the vitest config sets `environment: 'node'` globally.
**How to avoid:** Either (a) set up a Vitest workspace with two configs — node-env for `tests/simulation/**` and `tests/persistence/**`, happy-dom-env for `tests/ui/**` and `tests/app/**`; or (b) use `// @vitest-environment happy-dom` per-file docblock comments on React tests. Option (a) is cleaner.
**Warning signs:** `ReferenceError: document is not defined` in any test that imports React.

### Pitfall 4: tsconfig missing DOM lib + JSX
**What goes wrong:** `npm run typecheck` fails on every `.tsx` file with "Cannot find name 'document'" / "Cannot use JSX unless the '--jsx' flag is provided."
**Why it happens:** Current `tsconfig.json` has `lib: ["ES2022"]` (no DOM), no `jsx` setting, and `include: ["src/**/*.ts"]` (not `.tsx`). Phase 1/2 deliberately excluded DOM.
**How to avoid:** Add a `tsconfig.app.json` (or extend the root) with `lib: ["ES2022", "DOM", "DOM.Iterable"]`, `jsx: "react-jsx"`, and `include: ["src/**/*.ts", "src/**/*.tsx"]`. Keep the strict flags. Simulation tests still enforce purity via the boundary scanner (`tests/simulation/boundaries.test.ts`) and ESLint `no-restricted-imports`.
**Warning signs:** TypeScript errors on the first `.tsx` file.

### Pitfall 5: Forgetting the engine exhaustiveness check
**What goes wrong:** A new command variant is added to `SimulationCommand` but no case is added to `runSimulationCommand`'s switch. The dispatcher silently returns `undefined`, breaking the invariant that every command produces a `SimulationResult`.
**Why it happens:** Manual oversight.
**How to avoid:** The existing `switch (command.type)` in `src/simulation/engine.ts` has no default case — TypeScript's exhaustiveness checking makes a missing case a **compile error**. Keep it that way. Do NOT add a `default:` clause.
**Warning signs:** `ts(2365)` or a "not all code paths return" error after extending the union.

### Pitfall 6: Operation/session table for cancel
**What goes wrong:** Implementing `cancel_focus_session` as an `applied` result that emits a `SyncOperation` and a placeholder `SessionRecord` "for auditability" — polluting append-only history.
**Why it happens:** Natural instinct to record every action.
**How to avoid:** D-07 is explicit: cancel writes **nothing durable** beyond clearing the active-session marker. No operation row, no session row, no economy events. Aligns with Phase 2 D-02.
**Warning signs:** `result.operations.length > 0` for a cancel command in tests.

### Pitfall 7: Resetting the wrong field on day rollover
**What goes wrong:** `reconcileDayRollover` sets `activation: 0` on stale Cells, destroying the lifetime Bloom counter and breaking the monotonic invariant.
**Why it happens:** "Activation" sounds like a per-day flag.
**How to avoid:** `activation` is monotonic lifetime; "Activated today" is derived from `lastBloomLocalDate === env.localDate`. Rollover resets `dailyMilestoneProgressSeconds` and applies Momentum decay (D-14) — nothing else on the economy fields.
**Warning signs:** `validateMonotonicCounters` regression or `cell.activation` decreasing across a day boundary.

### Pitfall 8: Sub-second finish creating empty session records
**What goes wrong:** A user taps Finish almost immediately; `floor((endedAt - startedAt)/1000) <= 0` produces a zero-duration session record with zero rewards that pollutes append-only history.
**Why it happens:** Default code path treats all finishes uniformly.
**How to avoid:** D-08: route sub-second finishes through the cancel path. UI may show "Session too short to record."
**Warning signs:** `SessionRecord` rows with `durationSeconds: 0` in tests.

## Code Examples

### Existing command → result → events wiring (Phase 1 template)
See `src/simulation/commands/complete-focus-session.ts` lines 138–288 — the canonical "validate → apply systems → build records → emit economy + visual events → return `SimulationResult`" template every new command follows. The new commands (`create_cell`, `edit_cell`, `archive_cell`, `unarchive_cell`, `start_focus_session`, `cancel_focus_session`) each replicate this skeleton with their own validation and record construction.

### Activation bonus in complete-focus-session (D-15)
```typescript
// Source: existing src/simulation/commands/complete-focus-session.ts + D-15
// Modify the currentGenerated line:
import { ACTIVATION_CURRENT_BONUS_PERCENT } from '../../content/formulas.js';  // new constant, e.g. 10

const baseCurrent = generateCurrent(command.durationSeconds);
const cell = previousState.cells.get(command.cellId)!;
const isActivatedToday = cell.lastBloomLocalDate === env.localDate;
const currentGenerated = isActivatedToday
  ? baseCurrent + Math.floor((baseCurrent * ACTIVATION_CURRENT_BONUS_PERCENT) / 100)
  : baseCurrent;
// xpGained is NOT bonused (D-15 explicitly leaves XP path untouched).
```

### Bloom Momentum increment (D-14, SIM-06)
```typescript
// Source: existing src/simulation/systems/bloom.ts applyBloom + D-14
// Inside applyBloom, when firing:
return {
  cell: {
    ...cell,
    activation: cell.activation + 1,
    momentum: cell.momentum + 1,         // D-14: +1 on Bloom
    lastBloomLocalDate: localDate,
  },
  fired: true,
};
```

### Local-date derivation factory (D-16)
```typescript
// Source: D-16 + Pattern 5 deriveLocalDate
// src/app/env.ts — constructs SimulationEnv for dispatch
import type { SimulationEnv } from '../domain/index.js';
import { createRng } from './rng.js';   // or reuse tests/helpers/fixtures.ts xmur3+mulberry32
import { deriveLocalDate } from '../simulation/systems/day-rollover.js';

export function makeEnv(
  now: string,
  settings: { localDayBoundary: string },
  seed: string,
): SimulationEnv {
  return {
    now,
    localDate: deriveLocalDate(now, settings.localDayBoundary),
    rng: createRng(seed),
    contentVersion: 'flowgrid:starter:v1',
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pixi v7 `new Application(opts)` synchronous constructor | Pixi v8 `new Application()` + `await app.init(opts)` | Pixi 8.0 (2024) | Must be async; WebGPU selection happens at init; `app.canvas` not `app.view` |
| `tailwind.config.js` + PostCSS plugin | Tailwind v4 CSS-first: `@import "tailwindcss"` + `@theme` + `@tailwindcss/vite` plugin | Tailwind 4.0 (2025) | No JS config needed; design tokens in CSS; smaller bundle |
| React Router v6 `react-router-dom` separate packages | v7 unified `react-router` package (Remix merge); v8 now latest | v7 (2024), v8 (2026-06) | Install `react-router` not `react-router-dom`; choose declarative vs framework mode |
| `react-router` v7 only | `react-router@8.0.1` shipped (peer react>=19.2.7) | 2026-06-18 | STACK.md locks v7; pin `^7.18.0` unless adopting v8 |
| Zustand v4 implicit hooks | Zustand v5 vanilla `createStore` + `useStore` binding; curried TS generics `create<T>()(...)` | v5 (2024) | Vanilla store pattern enables non-React dispatch path |

**Deprecated/outdated:**
- `app.view` (Pixi v7) → use `app.canvas` (Pixi v8)
- `tailwind.config.js` (Tailwind v3) → CSS-first config in v4 (still supported but not default)
- `react-router-dom` as the install target → install `react-router` (v7+ unified); `react-router-dom` re-exports remain for compatibility but are not the primary package

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PixiJS v8 is the correct major to install (STACK.md says "8.x") | Standard Stack | LOW — STACK.md is explicit; verified 8.19.0 latest |
| A2 | React Router declarative `createBrowserRouter` mode (not framework mode) is what STACK.md means by "boring route primitives" | Architecture Patterns / Pitfall 2 | MEDIUM — STACK.md does not name the API; planner should confirm. Framework mode is clearly rejected by "avoid file-router/full-stack complexity" |
| A3 | Pin `react-router@^7.18.0` rather than adopt v8.0.1 | Standard Stack | MEDIUM — STACK.md/AGENTS.md lock v7; v8 is brand new. If the team wants v8, the install line changes to `react-router@^8.0.1` and peer React 19.2.7 is already satisfied. See Open Questions Q1. |
| A4 | `CellRecord.activation` is a monotonic lifetime counter (not a per-day flag) | Pattern 5 / Pitfall 7 | HIGH — if wrong, day-rollover must reset it. Evidence: Phase 1 `applyBloom` increments it each Bloom; invariants treat it as non-negative (not monotonic, but the increment pattern + D-02's "lastBloomLocalDate === localDate ⇒ Activated" framing both support lifetime-counter interpretation). |
| A5 | happy-dom preferred over jsdom for Vitest React environment | Standard Stack / Pitfall 3 | LOW — both work; happy-dom is faster. Planner can swap. |
| A6 | Field-on-CellRecord for `activeSessionStartedAt` (not singleton ActiveSessionRecord) | User Constraints D-05 discretion | LOW — D-05 explicitly allows either; field-on-Cell is simpler and Phase 3 has one active session |
| A7 | Red Blob Games axial/cube algorithms are the right hex math reference | Pattern 3 | LOW — canonical industry source; STACK.md names "Red Blob-style axial/cube algorithms" |
| A8 | The D-15 Activation bonus is exactly +10% (content-tunable) | Code Examples | LOW — CONTEXT.md says "e.g. +10%, exact value content-tunable"; expose as a `formulas.ts` constant |
| A9 | Momentum decay checks sessions whose `startedAt.slice(0,10) === lastBloomLocalDate` | Pattern 5 | MEDIUM — "yesterday had no completed session" is the natural reading of D-14, but the comparison key (startedAt date vs localDate vs lastBloomLocalDate) needs confirmation. Planner should verify against the local-day-boundary semantics in D-16. |

## Open Questions

1. **React Router v7 vs v8 — confirm pin**
   - What we know: STACK.md/AGENTS.md lock "React Router v7." v8.0.1 shipped 2026-06-18 (peer react>=19.2.7, which is satisfied). Latest v7 is 7.18.0.
   - What's unclear: Whether "v7" is a hard lock or "v7+" shorthand. v8 is the new major.
   - Recommendation: Default to `react-router@^7.18.0` (honor the explicit lock, avoid brand-new-major risk). If the user wants v8, swap to `react-router@^8.0.1` — no other code changes since declarative `createBrowserRouter` API is stable across both. Surface as an `checkpoint:human-verify` before install if planner wants belt-and-suspenders.

2. **Momentum decay comparison key**
   - What we know: D-14 says "if yesterday had no completed session for a given Cell, Momentum -1."
   - What's unclear: "Yesterday" relative to what — `env.localDate`, or the Cell's `lastBloomLocalDate`? With a non-midnight `localDayBoundary`, these can differ.
   - Recommendation: Compare session `startedAt.slice(0,10)` (the UTC calendar date, NOT local) against `cell.lastBloomLocalDate` (the local date the Cell last bloomed). This is the most consistent reading but the planner should confirm against D-16's boundary semantics. Mark as a verification step in the day-rollover task.

3. **Completion summary surface shape**
   - What we know: SESS-05 lists content (duration, Current, XP, milestone, Energy/Core outcome, Bloom/Activation, next useful action). CONTEXT.md Agent's Discretion says modal/drawer/panel/route.
   - What's unclear: Which shape fits the protected-interaction constraint best (modal blocks the board; inline panel does not).
   - Recommendation: Inline panel on the Cell Board (does not block, keeps the Generator reachable). Defer to planner; this is a UX call, not a technical blocker.

## Environment Availability

> Phase 3 depends on Node (build/test), a browser (Pixi/Vite dev server), and IndexedDB (already exercised by Phase 2 via fake-indexeddb in tests, real IndexedDB in dev).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite, Vitest, build | ✓ | v22.22.3 | — (satisfies all engine reqs: jsdom 29 needs ≥20.19, vite 8 needs ^20.19‖≥22.12) |
| Browser (Chrome/Firefox/Safari) | Pixi dev server, manual E2E | ✓ | dev machine | — |
| IndexedDB (real) | App runtime persistence | ✓ | browser-native | — |
| fake-indexeddb | Persistence tests | ✓ | 6.2.5 (installed) | — |
| WebGPU | Pixi optional preference | unknown | — | WebGL fallback (`preference: 'webgl'`) — set explicitly |
| react-router v7 ecosystem docs | SPA routing | ✓ | — | Declarative `createBrowserRouter` is stable across v7 and v8 |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** WebGPU — set `preference: 'webgl'` in `Application.init()`; WebGL2 is universally available. Pixi v8 auto-detects but explicit WebGL preference avoids any WebGPU-init edge cases in Phase 3's stub scene.

## Security Domain

> Flowgrid is a local-first single-user app. No authentication, no network calls, no server-side session management. The threat surface is local-only: IndexedDB corruption, malformed import payloads, and storage-quota failures.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local-first single-user; no auth |
| V3 Session Management | no | No server sessions; Zustand session marker is local-only |
| V4 Access Control | no | Single user; no privilege boundaries |
| V5 Input Validation | yes | Zod 4 schemas at import boundary (Phase 2 already ships); new Cell fields (`color` hex regex, `icon` string, `name` non-empty, `dailyTargetSeconds` positive integer) reuse `ValidationIssue` contract [CITED: src/domain/validation.ts] |
| V6 Cryptography | no | No secrets, no encryption in Phase 3 |
| V7 Error Handling | yes | Typed `PersistenceError` (Phase 2) rendered in app shell; commands return `rejected` not throw (Phase 1 D-07) |
| V8 Data Protection | yes | IndexedDB local-first; export/restore validation already shipped (Phase 2 DATA-04/06) |

### Known Threat Patterns for the local-first TS stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed JSON import corrupts local state | Tampering | Phase 2 import-validation pipeline (schema-version check, required-record check, reference check, resource-invariant check before replace/merge) [VERIFIED: tests/persistence/import-validation.test.ts] |
| Negative economy values from import | Tampering | Zod `.nonnegative()` at schema boundary + Phase 1 `negative_resource` invariant defense-in-depth [CITED: STATE.md Phase 02 02-03 decision] |
| Storage quota exceeded mid-write | Denial of Service | `PersistenceError.kind: 'quota_exceeded'` (recoverable); repository transaction rolls back atomically [VERIFIED: src/persistence/errors.ts] |
| Blocked IndexedDB upgrade (other tab) | Denial of Service | `PersistenceError.kind: 'blocked_upgrade'` (recoverable); Phase 3 UI renders "close other tabs" [VERIFIED: src/persistence/database.ts] |
| Visual event drop changes economy | Tampering / Elevation | UI-04 contract: visual events are transient; renderer drops are safe. Phase 3 stub exercises this from day one (D-02) [CITED: src/simulation/visual-events.ts header] |
| XSS via Cell name/icon field | Tampering | React escapes by default; `icon` is a lucide name or emoji (not arbitrary HTML); render as text |
| Same-tick infinite loop in simulation | Denial of Service | Phase 1 economy-safety invariants; Bloom fires once per localDate per Cell (`shouldFireBloom`) [VERIFIED: src/simulation/systems/bloom.ts] |

## Sources

### Primary (HIGH confidence — verified via tool + authoritative source)
- **npm registry** (`npm view <pkg> version`, 2026-06-23) — React 19.2.7, react-dom 19.2.7, react-router 7.18.0 / 8.0.1, @vitejs/plugin-react 6.0.3, vite 8.1.0, zustand 5.0.14, tailwindcss 4.3.1, @tailwindcss/vite 4.3.1, pixi.js 8.19.0, dexie 4.4.4, zod 4.4.3, @radix-ui/react-* 1.x, lucide-react 1.21.0, @testing-library/react 16.3.2, happy-dom 20.10.6, jsdom 29.1.1, @types/react 19.2.17
- **npm registry peer/engine metadata** — verified compatibility (Node 22.22.3 satisfies all; React 19 satisfies react-router/zustand/plugin-react peers)
- **`gsd-tools query package-legitimacy check`** — confirmed all packages exist, have official GitHub repos, no postinstall scripts, not deprecated
- **pixijs.com/8.x/guides/components/application** — v8 async `Application.init()` pattern, `app.canvas` (not `app.view`), resizeTo, preference webgl/webgpu
- **dexie.org/docs/Tutorial/Design** — `version(N).stores().upgrade(tx => ...)` migration API, populate-vs-upgrade distinction, atomic rollback on upgrade error
- **tailwindcss.com/docs/installation/using-vite** — v4 CSS-first setup (`@import "tailwindcss"` + `@tailwindcss/vite` plugin)
- **github.com/pmndrs/zustand README** — v5 vanilla `createStore` + `useStore` binding pattern, `getState/setState/subscribe` non-React API
- **reactrouter.com/how-to/spa** — v7 framework-mode SPA (`ssr:false`); declarative `createBrowserRouter` is the alternative the planner should use
- **Existing Phase 1/2 codebase** — read every file in `src/domain`, `src/simulation`, `src/persistence`, `src/content`, `tests/helpers`, `tests/persistence/migration-harness.ts` to ground all command/result/event/migration patterns

### Secondary (MEDIUM confidence — official docs, not all version-pinned)
- **Red Blob Games "Hexagonal Grids"** (redblobgames.com/grids/hexagons) — canonical axial/cube algorithms [CITED]
- **docs/technical-vision-draft.md** + **docs/gameplay-spine-draft.md** — layer rule, hex model, Activation examples (§14), UI surfaces (§19)

### Tertiary (LOW confidence — training knowledge)
- None material; every claim is verified or cited above

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version verified against npm registry with current publish dates; engine/peer compatibility cross-checked
- Architecture: HIGH — every pattern grounded in existing Phase 1/2 code or verified official docs
- Pitfalls: HIGH — 6 of 8 pitfalls are verified config/API gotchas (Pixi view→canvas, RR mode confusion, vitest env, tsconfig JSX, engine exhaustiveness, cancel audit); 2 are domain-specific inferences (activation counter, sub-second finish) grounded in CONTEXT.md decisions
- Hex math: HIGH — Red Blob is the canonical industry reference; STACK.md names it explicitly

**Research date:** 2026-06-23
**Valid until:** 2026-07-23 (30 days — stable stack; react-router v7/v8 decision is the main thing to recheck if planning slips)
