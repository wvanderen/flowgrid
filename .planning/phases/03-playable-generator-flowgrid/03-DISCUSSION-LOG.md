# Phase 3: Playable Generator Flowgrid - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-23
**Phase:** 3-Playable Generator Flowgrid
**Areas discussed:** Flowgrid Home rendering, Active session lifecycle, Cell CRUD & archive, Daily rollover & Momentum

---

## Flowgrid Home rendering

### Render tech

| Option | Description | Selected |
|--------|-------------|----------|
| PixiJS 8 stub scene | Install PixiJS 8 now, build a real FlowgridScene adapter (hex Cells, Core, selection state, tap-to-select) but defer Current trails / Bloom bursts / route flow animation to Phase 6. Phase 3 emits visual events (Phase 1 already produces them) but the adapter can coalesce/drop them safely — proving the safety contract early. Best long-term fit, more upfront work. | ✓ |
| DOM/SVG hex now, Pixi later | Ship a CSS/SVG hex layout for Phase 3 (Core-centered grid, Cells, selection). Defer PixiJS entirely to Phase 6 where it replaces the DOM renderer. Faster to first playable, but means writing Flowgrid visual code twice and a real migration later. | |
| Full Pixi now | Ship full PixiJS scene with Current trails, Bloom bursts, and route animation now (pull UI-03 into Phase 3). Maximum visual impact, but expands phase scope and risks eating Phase 6's work. | |

**User's choice:** PixiJS 8 stub scene
**Notes:** Proves the simulation/renderer safety contract early without committing to particle systems this phase.

### Visual scope

| Option | Description | Selected |
|--------|-------------|----------|
| Static state only | Pixi scene draws Core, hex Cells, selection ring, and Activation/Bloom-ready state on Cells (e.g., a halo or filled hex once Bloom has fired today). Routes drawn as static lines. Visual events emitted by the simulation are received but only logged/dropped — no Current trail animation yet. Phase 6 adds trails, bursts, ripples. | ✓ |
| Static + one-shot pulses | Above + simple one-shot pulses on key events (Bloom fires -> Cell flashes; session completed -> Cell pulses; Core convert -> Core glows briefly). No continuous Current flow animation. Keeps Phase 3 honest about the visual event channel without committing to route-packet animation. | |
| Geometry only | Defer all Bloom/Activation/Core visual feedback to Phase 6; Phase 3 Pixi scene shows only geometry + selection + a small Current counter per Cell. Everything else comes through as text in side panels. | |

**User's choice:** Static state only
**Notes:** Exercises UI-04's eventual "drop visual events freely" property from day one.

### Cell tap interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Tap = select; React panel | Tap a Cell -> it becomes selected; a side panel (Cell inspector / Cell Board entry) appears with the Generator 'Start session' button as a normal React/Radix control. Tap again or tap empty space to deselect. Pixi handles hit-detection only; all action surfaces are React UI. Satisfies 'protected core interaction' and the a11y constraint. | |
| Tap = open Cell Board | Tap a Cell -> opens into a Cell Board route (/cells/:id) showing the four starter modules as hex tiles with the Generator as the primary action. Core stays visible in a corner or breadcrumb. Closer to the gameplay-spine draft's 'Cell opens into its module layout'. | ✓ |
| Tap = quick menu | Tap a Cell -> selects and shows a quick action menu (Start, Inspect, Edit, Archive). Double-tap or explicit 'Open' action goes to Cell Board. More actions surfaced but more clicks to the sacred Start session. | |

**User's choice:** Tap = open Cell Board
**Notes:** Cell Board is the inspector surface for UI-05; Pixi handles hit-detection, React Router owns navigation.

### Camera behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed framing | Fixed framing: Core centered, Cells arranged in rings around it, entire Flowgrid fits the viewport. If many Cells exist later, we re-tune then. Simplest, safest first slice (matches STACK.md's 'simple custom camera may be safer for the first slice'). | ✓ |
| Custom pan/zoom | Custom pan/zoom with browser wheel/pinch over the Pixi canvas (no pixi-viewport dependency). Coarse: see all Cells; fine: zoom into a Cell cluster. More interaction polish now. | |
| pixi-viewport | Adopt pixi-viewport now. Most features (snap, clamp, pinch) for free, but STACK.md flags its Pixi v8 compatibility as LOW confidence — first task would be a compatibility spike. | |

**User's choice:** Fixed framing
**Notes:** Avoids the pixi-Viewport v8-compatibility spike flagged in STACK.md.

---

## Active session lifecycle

### Active state location

| Option | Description | Selected |
|--------|-------------|----------|
| Transient (memory only) | Active session lives only in client memory (Zustand store): { cellId, startedAt, accumulatedElapsedMs }. Reload drops it — user must restart. Completion calls a single `complete_focus_session` command using the accumulated duration. Simplest; matches Phase 1's atomic contract; loses in-progress sessions on reload/crash. | |
| Durable (persisted) | Active session is a durable record: write a pending SessionRecord on start, update accumulated time periodically (or on visibility change), finalize on finish, mark discarded on cancel. Survives reload. Adds a new durable entity/store and write amplification. | |
| Start-markered (resume prompt) | Transient in memory + a lightweight `activeSessionStartedAt` field on CellRecord (or a small ActiveSessionRecord) so reload shows 'You had a session in progress — resume or discard?' but doesn't checkpoint accumulated duration. Middle ground: one extra write on start, nothing during the session. | ✓ |

**User's choice:** Start-markered (resume prompt)
**Notes:** Middle path — survives reload via resume prompt without write-amplification during the session.

### Duration computation

| Option | Description | Selected |
|--------|-------------|----------|
| Wall-clock diff, injected | Compute durationSeconds at finish as `floor((finishedAt - startedAt) / 1000)` using injected `now` (from a clock abstraction the app provides). Real wall-clock drives the display timer in React, but the simulation command receives a deterministic IsoDateTime pair. Matches Phase 1 D-03/D-08. | |
| Client-side tick accumulator | Tick a stopwatch in the Zustand store every second using setInterval; pass accumulated seconds to `complete_focus_session`. UI timer is exact, but setInterval drift on backgrounded tabs could undercount. Recovery on resume = stored accumulated value. | |
| Diff for truth, tick for UI | Wall-clock diff for the durable command + a client-side tick only for UI display (decoupled). The simulation gets the precise diff; the UI timer is cosmetic. Resume on reload recomputes display from startedAt. | ✓ |

**User's choice:** Diff for truth, tick for UI
**Notes:** Durable truth stays deterministic; UI timer is cosmetic and can't drift durable state.

### Cancel audit

| Option | Description | Selected |
|--------|-------------|----------|
| Cancel writes nothing | Cancel writes nothing durable — no SessionRecord, no operation, no audit row. Only effect is clearing the active-session marker. Strictest reading of SESS-03 ('without creating accidental rewards'). Phase 2 CONTEXT D-02 already chose 'rejected and not_implemented commands write nothing' — cancel aligns with that. | ✓ |
| Cancel = audit operation only | Cancel appends an operation row with `status: 'failed'` (or a new 'cancelled' status) for audit/sync, but no SessionRecord and no economy effects. Useful for 'I started this but bailed' analytics later. Adds enum value + repository write. | |
| Cancel = zero-reward session | Cancel writes a full SessionRecord with `durationSeconds: 0` and zero rewards, so the session history is complete and append-only. Matches 'completed sessions are append-only history' but pollutes history with non-effort. | |

**User's choice:** Cancel writes nothing
**Notes:** Aligns with Phase 2 D-02; strictest reading of SESS-03.

### Sub-second finish edge case

| Option | Description | Selected |
|--------|-------------|----------|
| Zero-reward session | Floor to 0 — a session finished in <1 second produces zero rewards and writes a SessionRecord with durationSeconds:0 and all gains at 0. Lets the history reflect the attempt. focusToCurrent already returns 0 for durationSeconds<=0. | |
| Treat as cancel | Treat finish-with-zero-duration as a cancel: no SessionRecord, no operation. Prevents empty sessions from cluttering history. Requires either a minimum-duration threshold or a 'no elapsed time' check. | ✓ |
| Reject sub-second finish | Reject finish with a validation issue if durationSeconds is 0; UI shows a 'Session too short to record' hint and forces a cancel. Consistent with Phase 1's reject-don't-throw pattern, but adds friction at the edge. | |

**User's choice:** Treat as cancel
**Notes:** Keeps append-only history clean of non-effort entries.

---

## Cell CRUD & archive

### Create flow

| Option | Description | Selected |
|--------|-------------|----------|
| create_cell command | New `create_cell` simulation command. Takes name, color, optional icon, dailyTargetSeconds; command generates the cellId, instantiates the four starter ModuleInstances + Output route to Core, and returns nextState with the new Cell. Output follows Phase 1 D-04 (default convert/store allocation). Keeps truth in simulation; repository diff-writes as usual. | ✓ |
| UI-built records | App shell builds the Cell record client-side (new cellId, starter modules, route) and writes it via a generic repository put. Faster path but violates 'simulation owns truth' and bypasses invariant validation. | |
| Command + factory helper | create_cell command + a deterministic starter-state factory variant that takes a cellId/name/dailyTarget and returns the four starter module instances + route to wire into an existing FlowgridSnapshot. Mirrors src/content/starter-state.ts but additive. | |

**User's choice:** create_cell command
**Notes:** Truth stays in simulation; invariant validation runs in the command.

### Record shape

| Option | Description | Selected |
|--------|-------------|----------|
| Add fields + Dexie v2 | Extend CellRecord with `color: string` (hex), `icon: string | null` (optional lucide name or emoji), and `archivedAt: IsoDateTimeString | null`. Migration bumps Dexie schema v1 -> v2 with a transform that defaults existing Cells to a starter color (e.g. '#6b7280'), icon: null, archivedAt: null. Aligns with Phase 2 D-08 (Dexie schema version bumps for shape changes). | ✓ |
| Split customization record | Add a separate `CellCustomizationRecord` keyed by cellId (color, icon) and `archivedAt` on CellRecord. Avoids coupling presentation to the gameplay record, but doubles the join cost on every Cell render. | |
| Archive in settings | Add color/icon to CellRecord but store archive as a separate `archivedCellIds` collection on a settings-like record. Awkward for sync and selection state. | |

**User's choice:** Add fields + Dexie v2
**Notes:** Single v1→v2 migration covers all new Cell fields.

### Edit scope

| Option | Description | Selected |
|--------|-------------|----------|
| Identity + target only | Allow editing name, color, icon, and dailyTargetSeconds via an `edit_cell` command. xp, momentum, current, charge, activation, milestone progress, lastBloomLocalDate are NEVER editable from the UI — only by simulation. Preserves history integrity (Phase 2 D-09 / append-only session rule). | ✓ |
| Above + manual milestone reset | Above + allow manual reset of daily milestone progress (so a user can 'restart today'). Adds friction to the milestone promise and risks the Bloom-once-per-day rule (lastBloomLocalDate must still gate). | |
| All non-economy fields | Allow editing all 'identity' fields freely. Strict but less safe — typos on the form could rewrite economy values. Reject. | |

**User's choice:** Identity + target only
**Notes:** Economy/progress fields are simulation-only.

### Archive / delete posture

| Option | Description | Selected |
|--------|-------------|----------|
| Reversible archive only | Archive is fully reversible: `archive_cell` and `unarchive_cell` commands flip `archivedAt` to now (archive) or null (unarchive). Archived Cells hidden from the Flowgrid Home and Cell picker but visible in a History / Archived filter. Sessions, modules, routes preserved as-is. No deletion path. | |
| Archive + hard-delete (history-only) | Archive is reversible AND there is a separate hard-delete (gated, requires confirm) that wipes the Cell, its modules, its routes — but preserves SessionRecord rows (rewritten with a `cellNameAtDeletion` snapshot so history stays readable). More surface area, more edge cases. | |
| Archive now, delete deferred | Archive is reversible; deletion is a deferred-to-v2 feature (captured as deferred idea). Aligns with PROJECT.md ('Completed sessions are append-only real history') and keeps Phase 3 scope tight. | ✓ |

**User's choice:** Archive now, delete deferred
**Notes:** Hard-delete captured as deferred idea for v2.

---

## Daily rollover & Momentum

### Rollover timing

| Option | Description | Selected |
|--------|-------------|----------|
| App-open reconciliation | On app open (repository load -> snapshot), run a deterministic `reconcileDayRollover(snapshot, env)` pass before UI renders: for each Cell where lastBloomLocalDate < env.localDate, reset dailyMilestoneProgressSeconds to 0 and clear per-day Activation. Cells that didn't open the app yesterday simply look 'fresh today' (no penalty). Subsequent commands trust env.localDate as the current day. | |
| Lazy reset on next command | No app-open pass. Each command that touches a Cell (create/edit/start/finish) checks lastBloomLocalDate vs env.localDate; if stale, it resets milestone + activation inline. Simpler write path but the Flowgrid Home could briefly show yesterday's progress until a Cell is interacted with. | |
| Both | App-open pass for display-only state (so Home is correct on load) + invariant in each Cell-touching command (so simulation truth can't drift). Belt-and-suspenders. Most code, safest. | ✓ |

**User's choice:** Both
**Notes:** Display state correct on load; simulation truth can't drift.

### Momentum rule

| Option | Description | Selected |
|--------|-------------|----------|
| Monotonic up, no decay | Momentum only goes UP in Phase 3: +1 when Bloom fires (SIM-06), and freeze (no decay) otherwise. A missed day doesn't reduce Momentum — it just delays the next increment. Strictest reading of 'forgiving' and 'support return after missed days'. Initial value stays 0. | |
| Mild decay on miss | +1 on Bloom (SIM-06), and on app-open day-rollover if yesterday had no completed session for that Cell, Momentum decays by 1 (floor 0). Mild pressure, still recovers in one Bloom. Adds 'did-this-Cell-complete-yesterday' tracking. | ✓ |
| Streak with grace window | +1 on Bloom, +1 capped at e.g. 5 for each consecutive Bloom day; reset to 0 only after N consecutive missed days (grace window). Closer to a streak system but with grace. More state (lastActiveLocalDate, graceRemaining). | |

**User's choice:** Mild decay on miss
**Notes:** User wants "gentle pressure but full recovery in one Bloom" — neither too soft nor too punishing.

### Activation benefit

| Option | Description | Selected |
|--------|-------------|----------|
| +% Current from Generator | While a Cell is Activated (Bloom fired today, lastBloomLocalDate == env.localDate), the Generator module produces +X% Current from focus time (e.g., +10%, matching gameplay-spine draft §14 example). The complete_focus_session command checks cell.activation > 0 and applies the bonus. Visible in the Cell inspector and on the hex (halo). | ✓ |
| Lower next milestone target | Activation reduces the daily milestone target for the next Bloom (e.g., -20% target while Activated), making it easier to chain days. Different feel — less Current, more 'keep the chain going'. | |
| +XP per minute | Activation boosts XP per minute instead of Current. Keeps Current/Charge/Energy identical to Phase 1 but accelerates local Cell identity growth. Less economy impact, more progression feel. | |

**User's choice:** +% Current from Generator
**Notes:** Matches `docs/gameplay-spine-draft.md` §14 verbatim; minimizes cross-system coupling.

### Day-boundary derivation

| Option | Description | Selected |
|--------|-------------|----------|
| Settings.localDayBoundary | Use the existing `SettingsRecord.localDayBoundary` (default '00:00') and compute `localDate` from `now - boundary offset`. The injected `env.localDate` the simulation receives is already the resolved local date string. Day rollover checks compare this value. Lets users on odd schedules (e.g., '04:00' boundary) define 'today' their way. | ✓ |
| System local date only | Ignore localDayBoundary for Phase 3 and use the system local calendar date (toISOString().slice(0,10)). Simpler, but the existing Settings field becomes dead config until later. | |
| Boundary + once-per-day guard | Compute localDate from localDayBoundary AND expose a `todayVersusYesterday` helper that returns 'first-open-today' so the app-open reconciliation pass runs exactly once per real day even across rapid reloads. | |

**User's choice:** Settings.localDayBoundary
**Notes:** Keeps the existing Settings field meaningful from Phase 3 onward.

---

## Agent's Discretion

The following were not user-selected gray areas and fall to the agent's discretion:

- **App shell & state coordination** — Zustand vanilla store wiring, snapshot subscription, command dispatch pipeline, visual event channel.
- **Stack installation cadence** — cohesive install vs staged (STACK.md locks the actual versions).
- **Active-session marker storage shape** — nullable field on CellRecord vs small singleton ActiveSessionRecord (planner's pick).
- **Session completion summary surface** — modal, drawer, panel, or route; "next useful action" is a small content/selectors function (not AI).
- **Testing strategy** — Vitest jsdom vs happy-dom for React/RTL; Pixi rendering correctness stays in Phase 6 smoke tests.
- **Route table** — exact routes beyond Home and Cell Board.
- **CSS / design tokens** — Tailwind 4 + shared Cell-color variables between Pixi and React.
- **Day-boundary computation helper** — pure function in `src/simulation` or `src/content`.

## Deferred Ideas

- **Hard-delete of Cells** with session-history preservation via `cellNameAtDeletion` snapshot — v2.
- **Current trail / Bloom burst / Core ripple / route packet animation** (UI-03) — Phase 6.
- **Pan/zoom camera** (custom or pixi-Viewport) — later phase when Cell counts grow.
- **Quick-action menu on Cell tap** — could return if Cell Board entry proves too heavy for power users.
- **Durable active-session records with periodic duration checkpointing** — revisit if users report real data loss from accidental reloads.
- **Momentum streak-with-grace-window system** — revisit if Momentum needs to unlock local capacity.
