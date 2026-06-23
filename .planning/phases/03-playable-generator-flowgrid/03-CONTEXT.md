# Phase 3: Playable Generator Flowgrid - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the first **visible, playable loop** on top of Phase 1's pure simulation and Phase 2's durable persistence. A user can: open the app, see a Core-centered hex Flowgrid of their Cells, create/edit/archive Cells, tap a Cell to open its Cell Board, start a focus session from the Generator with minimal friction, finish for proportional rewards or cancel without accidental rewards, and see a completion summary plus the next useful action. It also lands the forgiving daily-loop mechanics (Momentum, daily milestone reset on local-day rollover, once-per-day Bloom, visible Activation with a simple module-aware benefit) on the simulation side.

It delivers: React 19 + Vite 8 + Router v7 + Tailwind 4 + Zustand + Radix + lucide-react app shell; PixiJS 8 **stub scene** for the Flowgrid Home (geometry + selection + Activation/Bloom-ready state only — no Current trails or particle animation); new simulation commands (`create_cell`, `edit_cell`, `archive_cell`, `unarchive_cell`, `start_focus_session`, `cancel_focus_session`) plus refinement of `complete_focus_session` to honor Activation; a Cell Board route (`/cells/:id`) with the four starter modules rendered as hex tiles; a session completion summary surface; a daily-rollover reconciliation pass; rendering of the typed `PersistenceError` contract shipped in Phase 2.

It does **not** deliver: UI-02 (semantic non-canvas controls for **every** critical action — Phase 6); UI-03 (full PixiJS Current trails, Bloom bursts, route packets, Core ripples — Phase 6); UI-04 (visual-event safety contract verification — Phase 6); UI-06 (Settings UI — Phase 6); UI-07 (return-cue surfaces — Phase 4); Core routing/convert/store allocation UI, rejuvenation, Integration, Module Tokens (Phase 4); Module Forge, install reward, starter-slot customization (Phase 5); sync transport (v2); hard-delete of Cells (deferred); prestige/Memory (v2+); full patch editor (v2+).

</domain>

<decisions>
## Implementation Decisions

### Flowgrid Home Rendering
- **D-01:** Ship a **PixiJS 8 stub scene** for the Flowgrid Home in Phase 3. Pixi 8 is installed and a real `render/flowgrid` scene adapter is built; Current trails, Bloom bursts, route flow packets, Core ripples, and continuous animation stay deferred to Phase 6 (UI-03). This proves the renderer/simulation boundary, the visual-event channel, and the Pixi v8 async-init path early without committing to particle systems this phase.
- **D-02:** The Phase 3 stub renders **static state only**: Core at center, hex Cells in rings, selection ring, Activation/Bloom-ready state on Cells (e.g., a halo or filled hex when `cell.lastBloomLocalDate === env.localDate`), and routes drawn as static lines. `VisualEvent`s emitted by the simulation are received by the adapter but only logged/dropped — Phase 6 implements the actual animation consumers. This honors UI-04's eventual safety contract by exercising the "drop visual events freely" property from day one.
- **D-03:** **Tapping a Cell opens the Cell Board route** (`/cells/:id`). Pixi hit-detection resolves the cellId; React Router owns the navigation. No global selection state in Phase 3 — the Cell Board is the inspector. The protected `open app → tap Cell → start session` interaction lives inside the Cell Board via the Generator tile.
- **D-04:** **Fixed camera framing** in Phase 3 — Core centered, Cells arranged in rings around it, the entire Flowgrid fits the viewport. No pan/zoom, no `pixi-Viewport` dependency (STACK.md flags its Pixi v8 compatibility as LOW confidence). A custom camera may be revisited in a later phase when Cell counts grow.

### Active Session Lifecycle
- **D-05:** Use a **start-markered hybrid** for active sessions. Transient in-memory state in the Zustand store carries `{ cellId, startedAt }` for the live timer; on `start_focus_session`, a lightweight `activeSessionStartedAt` field is written on `CellRecord` (or a small `ActiveSessionRecord`) so that reload surfaces a "You had a session in progress — resume or discard?" prompt. The accumulated duration is **not** checkpointed: resume recomputes elapsed from `now - startedAt`. This avoids both "lose everything on reload" and the write-amplification of durable active-session records.
- **D-06:** **Diff for truth, tick for UI.** The simulation `complete_focus_session` command receives `startedAt` + `endedAt` + `durationSeconds` derived from injected wall-clock `now` (`floor((endedAt - startedAt) / 1000)`). The React-side display timer uses `setInterval` cosmetically and is decoupled from durable truth. This honors Phase 1 D-03 (elapsed-duration input with deterministic timing) and Phase 1 D-08 (exact replay).
- **D-07:** **Cancel writes nothing durable.** No `SessionRecord`, no `SyncOperation`, no audit row. Only effect is clearing the active-session marker. Aligns with Phase 2 CONTEXT D-02 ("rejected and not_implemented commands write nothing — no audit row") and is the strictest reading of SESS-03 ("cancel without accidental rewards").
- **D-08:** **Sub-second finish is treated as a cancel.** If `floor((endedAt - startedAt) / 1000) <= 0` the finish is silently routed through the cancel path (no session record, no rewards). Prevents empty sessions from polluting append-only history. The UI may show a gentle "Session too short to record" hint.

### Cell CRUD & Archive
- **D-09:** Add a **`create_cell` simulation command**. Input: `name`, `color`, optional `icon`, `dailyTargetSeconds`, plus command-supplied `operationId` and command-generated `cellId` (and starter module/route IDs). The command instantiates the four starter ModuleInstances (Generator, Charge Core, Output, Bloom), wires the Output route to the existing Core at `allocationPercent: 100`, and returns `nextState` with the new Cell. Truth stays in simulation; the repository diff-writes as usual. UI-built records are rejected (would violate "simulation owns truth" and bypass invariant validation).
- **D-10:** **Extend `CellRecord` with `color: string` (hex), `icon: string | null` (lucide name or emoji), and `archivedAt: IsoDateTimeString | null`.** Bump Dexie schema **v1 → v2** with a transform that defaults existing Cells to a starter color (e.g., `'#6b7280'`), `icon: null`, `archivedAt: null`. This honors Phase 2 CONTEXT D-07/D-08 (synthetic migration-fixture harness + Dexie schema version bumps for store-shape changes). Splitting customization into a separate record is rejected (doubles render-time joins).
- **D-11:** `edit_cell` command edits **identity + target only**: `name`, `color`, `icon`, `dailyTargetSeconds`. The economy/progress fields (`xp`, `current`, `charge`, `momentum`, `activation`, `dailyMilestoneProgressSeconds`, `lastBloomLocalDate`) are **never** editable from the UI — only by simulation. This preserves history integrity (Phase 2 D-09 / append-only session rule) and Phase 1's invariant guarantees.
- **D-12:** **Archive now, delete deferred.** Phase 3 ships `archive_cell` and `unarchive_cell` commands that flip `archivedAt` to `now` (archive) or `null` (unarchive). Archived Cells are hidden from the Flowgrid Home and the Cell picker but visible behind a History/Archived filter. Sessions, modules, and routes for an archived Cell are preserved as-is — no deletion path. Hard-delete (with session-history preservation via a `cellNameAtDeletion` snapshot) is captured as a deferred idea for v2.

### Daily Rollover & Momentum
- **D-13:** **Belt-and-suspenders day rollover.** Run a deterministic `reconcileDayRollover(snapshot, env)` pass on app open (after repository load, before UI renders) so the Flowgrid Home is correct immediately. Each Cell-touching command also checks `lastBloomLocalDate` vs `env.localDate` inline and resets stale per-day state. Display-only state resets at app open; durable truth resets at the next command — neither path can drift.
- **D-14:** **Mild Momentum decay on miss.** Momentum `+1` when Bloom fires (per SIM-06). On app-open day-rollover, if yesterday had no completed session for a given Cell, Momentum `-1` (floor `0`). A missed day produces gentle pressure but recovers fully in one Bloom — satisfies SIM-03 ("forgiving and support return after missed days rather than hard streak failure"). Initial value stays `0`. Streak-with-grace-window systems and monotonic-up-only systems are both rejected for Phase 3.
- **D-15:** **Activation bonus = +% Current from Generator.** While a Cell is Activated (`lastBloomLocalDate === env.localDate`), `complete_focus_session` applies a flat bonus to generated Current (e.g., `+10%`, matching `docs/gameplay-spine-draft.md` §14 example — exact value is content-tunable). The bonus is visible in the Cell inspector and on the hex (Activation halo via D-02). Honors SIM-07 ("simple module-aware benefit without making Activation mandatory") — Current still generates normally without Activation.
- **D-16:** **Local day is derived from `SettingsRecord.localDayBoundary`** (default `'00:00'`). The injected `env.localDate` the simulation receives is the resolved local-date string computed as `floor(now - boundary offset)` — already respecting the user's chosen day boundary. Day-rollover checks compare this value. Honors existing Phase 1 starter settings and lets users on odd schedules (e.g., `'04:00'` boundary) define "today" their way.

### Agent's Discretion
The following were not user-selected gray areas and fall to the agent's discretion within the constraints above and the project architecture rules (STACK.md, PROJECT.md, AGENTS.md). The agent should pick standard, well-tested approaches and document them in the plan:

- **App shell & state coordination** — Zustand vanilla store (or a small bound React hook) holds the latest `FlowgridSnapshot`, selected cellId, active-session marker, pending visual events, and command dispatch status. UI subscribes via selectors. Command dispatch flows: UI → command constructor → `runSimulationCommand` → repository `apply(SimulationResult)` → store emits new snapshot. STACK.md already locks the stack (React 19, Vite 8, Router v7, Tailwind 4, Zustand 5, Radix, lucide-react); the planner picks exact wiring.
- **Stack installation cadence** — one cohesive install (React + Vite + Router + Tailwind + Pixi 8 + Zustand + Radix + lucide-react + Testing Library) is preferred over staged installs, but the planner may split if it yields a cleaner commit-by-commit verification path. Pixi v8 async-init pattern (per STACK.md source note) must be respected.
- **Active-session marker storage** — whether `activeSessionStartedAt` lives as a new nullable field on `CellRecord` (D-10's migration becomes `color + icon + archivedAt + activeSessionStartedAt`) or as a small singleton `ActiveSessionRecord` keyed by `cellId`. Either works; the planner picks one and migrates accordingly. Field-on-Cell is simpler but only supports one active session at a time, which is correct for Phase 3.
- **Session completion summary surface** — modal, drawer, panel, or route. SESS-05 lists the content (duration, Current, XP, milestone progress, Energy/Core Charge outcome, Bloom/Activation effects, next useful action). "Next useful action" is a small content/selectors function, not an AI suggestion (e.g., "Bloom ready in N more minutes" / "Activated — start another session" / "Day resets at HH:MM").
- **Testing strategy** — Vitest with jsdom or happy-dom for React/RTL component tests; Persistence tests stay on `fake-indexeddb`. Pixi rendering correctness is **not** asserted in unit tests — Phase 6 owns canvas smoke tests (VER-06). Phase 3 unit tests cover: new simulation commands, day-rollover reconciliation, Momentum decay, Activation bonus, Cell CRUD invariants. Property-based tests (fast-check) extend Phase 1's invariant suite for the new commands.
- **Routes** — Flowgrid Home (`/`), Cell Board (`/cells/:cellId`), plus whatever surfaces the completion summary and archived-Cell filter need. The exact route table is the planner's call.
- **CSS / design tokens** — Tailwind 4 + a small CSS-variable layer for Flowgrid colors (so Pixi and React share the same Cell color values). Minimal aesthetic; no design-system phase.
- **Day-boundary computation helper** — pure function in `src/simulation` or `src/content` that takes `now: IsoDateTimeString` + `localDayBoundary: string` and returns `LocalDateString`. Used by the env factory and by the app-open reconciliation pass.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` — Defines Flowgrid's core value ("tap a Cell, do a real thing…"), the protected core interaction (`open app → tap Cell → start session`), the layer rule, economy-safety constraints (no negative resources, no duplicate installs, no token duplication, no route-allocation drift, no offline production exploits), append-only history rule, accessibility rule ("canvas visuals must be paired with normal UI controls, semantic labels, and accessible panels"), and out-of-scope boundaries. Directly governs this phase.
- `.planning/REQUIREMENTS.md` — Defines Phase 3 requirements: `CELL-01..05`, `SESS-01/02/03/05`, `SIM-01..07`, `UI-01`, `UI-05`. Note `SESS-04` and `DATA-01..07`/`VER-03` were satisfied in Phase 2 (the session-record contract and persistence spine this phase consumes). Phase 3 must not regress them.
- `.planning/ROADMAP.md` — Defines Phase 3 goal, success criteria (5 items), Phase 2 dependency, and the v1 phase boundary. "UI hint: yes" — UI-01 and UI-05 are the UI-requirements in scope.
- `.planning/STATE.md` — Records Phase 2 completion (2026-06-23) and the carrying decisions (esp. plain-string IDs, SessionId↔OperationId 1:1 in Phase 1, repository diff-writes changed records + operation + session atomically).
- `.planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md` — Phase 1 decisions that constrain Phase 3: D-02 (rejuvenation/forge/install stay `not_implemented`), D-03 (elapsed-duration input, deterministic timing), D-04 (starter Output routes Current to Core with default allocation), D-07 (typed validation issues, no throwing for domain invalidity), D-08 (exact deterministic replay).
- `.planning/phases/02-durable-local-first-spine/02-CONTEXT.md` — Phase 2 decisions that constrain Phase 3: D-02 (rejected/not-implemented commands write nothing — informs cancel-audit decision D-07), D-04 (idempotent upserts with conflict-on-payload-mismatch — informs start-marker writes), D-06 (ModuleDefinitions are code content, not persisted), D-07/D-08 (migration harness + Dexie schema version axes — informs D-10's v1→v2 migration), D-09 (full JSON export — Phase 3 must keep export complete with new Cell fields).

### Phase 1 / Phase 2 Code Contracts (the inputs Phase 3 consumes — MUST read)
- `src/domain/records.ts` — `CellRecord`, `CoreRecord`, `ModuleInstance`, `RouteRecord`, `SessionRecord`, `SettingsRecord`, `FlowgridSnapshot`. **D-10 extends `CellRecord`** with `color`, `icon`, `archivedAt` (and possibly `activeSessionStartedAt`). The aggregate `FlowgridSnapshot` shape stays stable.
- `src/domain/result.ts` — `CompleteFocusSessionCommand`, `SetCoreAllocationCommand`, the discriminated `SimulationCommand` union, `SimulationResult`, `EconomyEvent`, `VisualEvent`, `SimulationEnv`, `Rng`, `VISUAL_EVENT_NAMES`, `ECONOMY_EVENT_NAMES`. **Phase 3 adds new command variants** (`create_cell`, `edit_cell`, `archive_cell`, `unarchive_cell`, `start_focus_session`, `cancel_focus_session`) to the union; the engine dispatcher (`src/simulation/engine.ts`) must handle them exhaustively.
- `src/domain/operation-records.ts` — `SyncOperation` shape and `OperationStatus`. New Phase 3 commands produce operations with stable IDs (Phase 2 D-04 idempotent-upsert contract).
- `src/domain/validation.ts` + `src/domain/invariants.ts` — `ValidationIssue` contract and codes. New commands reuse these (Phase 1 D-07 reject-don't-throw pattern). New invariants for `create_cell` (e.g., color hex format, name non-empty, dailyTargetSeconds positive) follow the existing pattern.
- `src/domain/ids.ts` — Plain string ID aliases (not branded) — simplifies the new command ID generation. `EntityType` union may need no new entries (`cell`, `session`, `operation` already exist).
- `src/domain/primitives.ts` — `IntNonNegative`, `IntPercent`, `IntSeconds`, `ContentVersion`. New Cell fields stay on these primitives.
- `src/simulation/commands/complete-focus-session.ts` — The Phase 1 foundation loop. **D-15 modifies this command** to apply the Activation +% Current bonus when `cell.lastBloomLocalDate === env.localDate`.
- `src/simulation/systems/bloom.ts` — Existing Bloom system (`shouldFireBloom`, `applyBloom`). D-14 adds Momentum `+1` inside `applyBloom` (or alongside it in the command).
- `src/simulation/systems/current.ts` + `src/content/formulas.ts` — `generateCurrent`, `generateXp`, `focusToCurrent`, `focusToXp`, `splitCoreCurrent`. The Activation bonus multiplies `generateCurrent` output; the helper stays pure.
- `src/simulation/engine.ts` — Dispatcher switch. New commands each get a case; TypeScript exhaustiveness guarantees compile-time safety.
- `src/simulation/selectors.ts` — Existing selectors (`getCellById`, `getCore`, `getRecentSessions`, etc.). UI reads via selectors, never by reaching into the snapshot.
- `src/simulation/visual-events.ts` + `src/simulation/economy-events.ts` — Event constructors the new commands emit. Bloom already emits `bloomBurstVisual` and `cellActivationVisual` (Phase 3 Pixi stub drops them per D-02).
- `src/content/starter-modules.ts` + `src/content/starter-state.ts` — `STARTER_MODULE_DEFINITIONS` and `createStarterFlowgridState`. **D-09 reuses these** to instantiate the four starter modules + Output route for each new Cell. The starter-state factory pattern is the template for the `create_cell` command's body.
- `src/content/formulas.ts` — `DEFAULT_SESSION_LENGTH_SECONDS`, `DEFAULT_DAILY_TARGET_SECONDS`, `DEFAULT_DAILY_MILESTONE_TARGET_SECONDS`, `DEFAULT_LOCAL_DAY_BOUNDARY`, `DEFAULT_CONVERT_ALLOCATION_PERCENT`, `DEFAULT_STORE_ALLOCATION_PERCENT`. New Cells inherit these unless the create command overrides `dailyTargetSeconds`.
- `src/persistence/index.ts` + `src/persistence/database.ts` + `src/persistence/repository.ts` + `src/persistence/seeding.ts` — Phase 2 repository barrel, Dexie gateway, write path, first-run seed. **D-10's v1→v2 migration** lives in `database.ts`. The app shell (Phase 3) loads snapshot via `FlowgridRepository` and dispatches commands through `apply(SimulationResult)`.
- `src/persistence/errors.ts` — Typed `PersistenceError` contract shipped in Phase 2 (Agent's Discretion item there). **Phase 3 renders these** in the app shell.
- `src/persistence/diff.ts` — `diffFlowgridSnapshots` + `FlowgridWritePlan`. New Cell writes flow through this unchanged (the repository already handles added/changed cells).
- `tests/helpers/fixtures.ts` + `tests/helpers/replay.ts` + `tests/helpers/setup-indexeddb.ts` — Phase 1/2 test helpers. New Phase 3 simulation tests extend these patterns; persistence tests of the v1→v2 migration use the migration-fixture harness (Phase 2 D-07).
- `src/app/README.md`, `src/ui/README.md`, `src/render/README.md` — Phase 1 placeholders naming Phase 3+ as the consumer. These folders get populated this phase.

### Design Drafts
- `docs/technical-vision-draft.md` — Layer rule ("simulation owns truth; renderer shows motion; persistence stores durable records; sync moves operations; UI configures and inspects state") and the recommended source layout (`src/app`, `src/domain`, `src/simulation`, `src/persistence`, `src/render`, `src/ui`). Phase 3 populates `src/app`, `src/ui`, `src/render`.
- `docs/gameplay-spine-draft.md` §6–§7 — Starter Cell wiring (`[Generator] → [Charge Core] → [Output]`, `[Bloom]`) and "modules as UI" framing. The Cell Board (UI-05) is the inspector for this layout. §14 — Activation examples (e.g., "+10% Current from focus time") inform D-15. §19 — "UI implications" lists Flowgrid Home, Cell Board, Core View, Module Forge as the four major surfaces; Phase 3 delivers the first two, Core View is Phase 4, Module Forge is Phase 5.

### Stack References (already locked — read for exact wiring)
- `AGENTS.md` "Technology Stack" section — React 19, Vite 8, Router v7, Tailwind 4, PixiJS 8, Radix UI, lucide-react, Zustand 5, Dexie 4, Zod 4, Vitest 4, fast-check, Playwright, Testing Library + user-event. Includes installation baseline and architecture rules implied by the stack (esp. "domain imports no app/browser/Pixi/React/Dexie/Zustand"; "render consumes immutable snapshots/selectors plus transient visual events"; "ui dispatches commands and displays selectors; it does not calculate economy rules").

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/domain/records.ts`** — Complete durable-record surface. D-10 extends `CellRecord` with three (or four) new fields; the rest of the aggregate (`FlowgridSnapshot`) stays stable.
- **`src/domain/result.ts`** — `SimulationResult` contract is unchanged. New commands produce the same shape; the engine dispatcher's exhaustive switch catches missing handlers at compile time.
- **`src/simulation/commands/complete-focus-session.ts`** — The Phase 1 foundation loop is the template for new command files (validate → apply systems → build records → emit economy + visual events → return `SimulationResult`). D-15 modifies it in place for the Activation bonus.
- **`src/content/starter-state.ts`** — `createStarterFlowgridState` is the template for the `create_cell` command's body (instantiate four starter modules, wire Output route to Core at 100%, default settings).
- **`src/simulation/systems/{bloom,current,core-allocation,routes,modules}.ts`** — Existing pure systems the new commands compose.
- **`src/persistence/{repository,diff,seeding,database,errors}.ts`** — Repository write path, diff detection, first-run seed, Dexie gateway, typed error contract. All reused as-is; D-10 adds one migration.
- **`tests/helpers/{fixtures,replay,setup-indexeddb,expect-valid-state}.ts`** — Test fixtures, deterministic-replay helper, fake-indexeddb setup, state-invariant assertions. New tests extend these.

### Established Patterns
- **Strict layer boundaries** enforced by ESLint (Phase 1): simulation imports no UI/Pixi/React/Dexie/browser; persistence runs no simulation rules; UI dispatches commands and reads selectors, never calculates economy rules. Phase 3's new `src/app`, `src/ui`, `src/render` folders must respect these import-boundary rules.
- **Integer economy units** everywhere (`IntNonNegative`, `IntPercent`, `IntSeconds`). D-10's new `color`/`icon`/`archivedAt` are the first non-economy fields on `CellRecord`; the typed primitives still gate everything economy-related.
- **Plain string IDs** (not branded) — new command IDs stay plain strings (Phase 1 decision).
- **Typed results, no throwing for domain invalidity** (Phase 1 D-07) — new commands return `rejected` results with structured `ValidationIssue[]`.
- **Deterministic replay** (Phase 1 D-08) — the same inputs produce identical `nextState`/events/operations/issues. D-14's Momentum decay and D-15's Activation bonus must preserve this property (no `Math.random` in the loop; RNG only used where Phase 1 already injects it).
- **Hybrid records-plus-operation-log** (Phase 2 D-01) — each applied command writes changed records + operation + session; rejected commands write nothing (D-07 reinforces this for cancel).
- **Diff-write in persistence layer** (Phase 2 D-03) — repository detects changed records by diffing `previousState` vs `nextState`; new Cell writes are picked up automatically.
- **Idempotent upsert** (Phase 2 D-04) — operation/session writes are safe to retry; cancel writing nothing (D-07) keeps retries trivially safe.
- **Visual events are transient** — the renderer may drop them freely. D-02 leans on this property from day one.

### Integration Points
- **App shell ↔ Repository:** `src/app` constructs a `FlowgridRepository`, calls `load()` on open to get the snapshot, runs `reconcileDayRollover` (D-13) before rendering, and dispatches commands via `apply(runSimulationCommand(prevState, command, env))`. The store emits the new snapshot to React.
- **App shell ↔ Day rollover:** A pure helper (signature: `(snapshot, env) => FlowgridSnapshot` or `(snapshot, env) => { nextState, writePlan }`) runs at app open. It resets stale `dailyMilestoneProgressSeconds`, clears stale Activation, applies Momentum decay (D-14). Whether it produces a durable write or is display-only-then-command-time-corrected is the planner's call (D-13 specifies both paths exist).
- **Renderer ↔ Snapshot/Visual Events:** `src/render/flowgrid` reads the latest snapshot via selectors and subscribes to the visual-event channel. Pixi scene built once; state updates tween the existing display objects (no full re-render per frame).
- **UI ↔ Router:** `/` → Flowgrid Home (Pixi canvas + minimal React shell around it); `/cells/:cellId` → Cell Board (React components for the four starter module tiles + inspector fields). Additional routes per Agent's Discretion.
- **UI ↔ Settings:** `SettingsRecord.localDayBoundary` drives env-localDate computation (D-16). Settings UI itself is Phase 6 — Phase 3 reads the value via selector.

</code_context>

<specifics>
## Specific Ideas

- The "PixiJS 8 stub scene" decision (D-01) is specifically chosen to **prove the simulation/renderer safety contract early** — Phase 3 emits visual events that the renderer drops, exercising UI-04's eventual "dropping/reducing/replaying visual events never changes durable economy state" guarantee before Phase 6 formalizes it.
- The **start-markered active session** (D-05) is the middle path specifically because Phase 2 CONTEXT D-02 already established that "rejected/not-implemented commands write nothing" — cancel fits cleanly into that pattern (D-07) and the start marker is the only durable artifact of a session that didn't complete.
- **Mild Momentum decay** (D-14) was chosen over monotonic-up-only because the user wants "gentle pressure but full recovery in one Bloom" — streak-with-grace systems were rejected as too much state for Phase 3, monotonic-up was rejected as too soft.
- **+% Current from Generator** (D-15) was chosen specifically because it matches the `docs/gameplay-spine-draft.md` §14 example verbatim and is the most direct expression of "Activated Generator produces more signal" — it leaves the milestone/XP/Energy paths untouched, minimizing cross-system coupling.
- The `localDayBoundary`-driven date derivation (D-16) was chosen specifically to keep the existing `SettingsRecord.localDayBoundary` field meaningful from Phase 3 onward rather than leaving it as dead config until a later phase.

</specifics>

<deferred>
## Deferred Ideas

- **Hard-delete of Cells** — a destructive operation that wipes a Cell, its modules, and its routes while preserving `SessionRecord` rows via a `cellNameAtDeletion` snapshot column so history stays readable. Deferred to v2. Phase 3 ships only reversible archive (D-12).
- **Current trail / Bloom burst / Core ripple / route packet animation** — full PixiJS visual layer per UI-03. Deferred to Phase 6 (Hardening, Accessibility, and Trust), which also formalizes the visual-event safety contract (UI-04).
- **Pan/zoom camera** — custom or `pixi-Viewport`. Deferred until Cell counts grow; Phase 3 uses fixed framing (D-04).
- **Quick-action menu on Cell tap** — tap-to-select + radial/quick menu was an option under D-03 but rejected for Phase 3 in favor of tap-opens-Cell-Board. Could return if Cell Board entry proves too heavy for power users.
- **Durable active-session records with periodic duration checkpointing** — the "Durable (persisted)" option under D-05. Revisit if users report real data loss from accidental reloads during long sessions.
- **Momentum streak-with-grace-window system** — the more elaborate streak system described in gameplay-spine-draft.md §8/§16. Revisit in a later phase if Momentum needs to unlock local capacity.
- **Daily target editability from Cell edit** — currently editable (D-11 includes `dailyTargetSeconds`). If this proves too noisy, a future phase could move it to a Settings-managed default + per-Cell override.

</deferred>

---

*Phase: 3-Playable Generator Flowgrid*
*Context gathered: 2026-06-23*
