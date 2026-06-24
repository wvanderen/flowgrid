# Phase 4: Core Alternation and Rejuvenation Economy - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase completes Flowgrid's activity/rest alternation loop on top of the Phase 3 playable Flowgrid. The Core economy scaffolding (Current→Energy/Core Charge split, `set_core_allocation`, the `log_rejuvenation` stub, `CoreRecord` fields, monotonic Integration/Module-Token invariants) is **already in place** from Phases 1–3. This phase delivers the **delta**: the real `log_rejuvenation` handler (duration-gated — see SPEC amendment below), the Integration→Module-Token geometric-threshold system, a new Energy-spend command (3-level Activation-bonus upgrade), a Core-facing UI panel, a post-rejuvenation summary, contextual return cues on FlowgridHome, and a new append-only `RejuvenationRecord` collection + Dexie v2→v3 migration.

It does **not** deliver: Module Forge / `run_forge` / `install_module` (Phase 5); full PixiJS animation of Core/rejuvenation events (Phase 6 — the Phase 3 D-02 "drop visual events freely" contract continues to hold); Settings UI (Phase 6); offline idle production (explicitly out — resources come from real effort + recovery); cloud sync transport (v2 — sync-ready operation rows still emitted); any Energy sink beyond the single Activation-bonus upgrade; editing the Core upgrade beyond that one boost.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**9 requirements are locked.** See `04-SPEC.md` for full requirements, boundaries, acceptance criteria, edge coverage (20/20), and prohibitions (6/6).

Downstream agents MUST read `04-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Implement the `log_rejuvenation` command handler — **as AMENDED below (duration-gated), NOT as literally written in SPEC R3**.
- New `RejuvenationRecord` append-only history collection + Dexie store + v2→v3 migration + export/restore coverage.
- New Energy-spend command for the 3-level Activation-bonus upgrade with persisted Core level.
- Core panel UI (CORE-05): Energy, Core Charge, allocation, Integration progress, Module Tokens, next action, with allocation + rejuvenation controls.
- Rejuvenation summary UI (REJ-05).
- Contextual return cues on FlowgridHome (UI-07).
- Wire already-working Current routing / convert / store / set-allocation into the new Core UI (formalize CORE-01..04 end-to-end visibility).

**Out of scope (from SPEC.md):**
- Module Forge (`run_forge`, `install_module`) — Phase 5; Energy only buys the Activation upgrade here.
- Installing/applying Forge rewards — Phase 5.
- Settings UI — Phase 6.
- Full PixiJS animation of Core/rejuvenation events (Phase 6); visual events may be emitted but Phase 3 D-02 drop/log contract holds.
- Offline idle production / passive Charge generation — explicitly out.
- Cloud sync reconciliation — v1 local-first; operation rows still emitted.
- Editing the Core upgrade beyond the single Activation-bonus boost.

### ⚠ SPEC R3 AMENDMENT (supersedes SPEC R3 + Interview Log Round 1)

**The user re-opened SPEC R3 during discussion.** The SPEC as written makes rejuvenation payout `f(available Core Charge)` with duration as a history-only artifact. **This is superseded:** payout is now **duration-gated**. Planner and researcher MUST plan/research to the amended mechanic, and the SPEC R3 acceptance criteria must be read as amended.

- **Mechanic:** `chargeProcessed = min(core.coreCharge, floor(durationMinutes × REJUVENATION_CHARGE_PER_MINUTE))` where `REJUVENATION_CHARGE_PER_MINUTE = 10` (new content constant in `src/content`, tunable).
- `integrationGained = floor(chargeProcessed / 2)` (the 2:1 ratio is RETAINED).
- Core Charge is decremented by `chargeProcessed`; any odd Charge remainder below the 2:1 step is retained (NOT the floor(C/2) formulation in SPEC R3 — see corrected acceptance below).
- **0 Charge → no-op rest:** still applies and appends a `RejuvenationRecord` with `chargeConsumed=0, integrationGained=0, tokensGranted=0` (rest honored, not rewarded). **REJ-03 / rest-farming guard PRESERVED** — no prior activity means no meaningful reward regardless of duration.
- **RETAINED unchanged:** 2:1 ratio; geometric threshold base 50, ×1.5, `Math.floor`-ed (50, 75, 112, 168, 252 …); multi-threshold grant loop; Module Tokens + Integration monotonic; append-only records; integer discipline.
- **Corrected R3 acceptance criteria (read SPEC R3 acceptance as):**
  - 100 Core Charge + ≥10 min rest → 50 Integration, 0 Core Charge remaining (full processing).
  - 100 Core Charge + 5 min rest → 25 Integration (50 Charge processed), 50 Core Charge remaining (partial, capped by duration).
  - 101 Core Charge + ≥11 min rest → 50 Integration, 1 Core Charge retained (odd remainder).
  - 0 Core Charge + any duration → applies, appends zero-gain record, Integration/Module Tokens unchanged.
  - Integration threshold/token/monotonicity acceptance criteria are UNCHANGED.

</spec_lock>

<decisions>
## Implementation Decisions

### Rejuvenation Interaction Model
- **D-01:** Rejuvenation is a **live timed session**, mirroring focus sessions: start → timer runs → finish. It reuses the Phase 3 active-session marker pattern (D-05 from Phase 3). Rest is treated as an active, first-class session parallel to focus — not a retrospective log entry. Rationale: the user wants rest to feel substantive and parallel to focus; this also makes the duration-gated payout (D-03) coherent (resting longer processes more Charge, up to the cap).
- **D-02:** **One active session, app-wide.** Rest and focus are mutually exclusive — starting one blocks the other. This extends Phase 3's existing one-active-session rule to cover both session types and matches the emotional model (you're either resting OR focusing). The planner generalizes the active-session marker: Phase 3's `CellRecord.activeSessionStartedAt` tracks Cell-scoped focus; a Core-scoped rejuvenation marker is needed (e.g. a nullable `activeRejuvenationStartedAt` on `CoreRecord`, or a generalized app-wide marker — see Agent's Discretion). The one-active-session invariant must hold across both: at most one non-null marker (focus OR rejuvenation) at any time. A reload must surface a resume-or-discard prompt for an interrupted rejuvenation, paralleling the focus resume prompt (Phase 3 D-05).
- **D-03:** **Rejuvenation payout is duration-gated (SPEC R3 AMENDMENT — see spec_lock).** `chargeProcessed = min(coreCharge, floor(durationMinutes × 10))`; `integrationGained = floor(chargeProcessed / 2)`; odd Charge remainder retained; 0 Charge = no-op rest. The 2:1 ratio, threshold curve, and rest-farming guard are retained. The processing rate (`REJUVENATION_CHARGE_PER_MINUTE = 10`) is a content constant in `src/content`.
- **D-04:** **Diff for truth, tick for UI** carries over from Phase 3 D-06. The simulation `log_rejuvenation` receives `startedAt` + `endedAt` + derives `durationSeconds = floor((endedAt - startedAt)/1000)` and `durationMinutes = floor(durationSeconds / 60)`; payout is computed deterministically at finish (no live ticking of economy state). The React-side rejuvenation timer is cosmetic `setInterval`, decoupled from durable truth. Exact deterministic replay (Phase 1 D-08) must hold.

### Return Cues Presentation (UI-07)
- **D-05:** **Persistent stat-chip rail** on FlowgridHome. A compact row of glanceable chips (Energy · Charge · Tokens · Near-Bloom, in absolute values like "Charge 80", "Tokens 2") rendered above the canvas **whenever actionable economy state exists** (Core Charge > 0, OR Energy > 0, OR token progress > 0, OR a Cell is near Bloom, OR recent history exists). When no actionable state exists, the rail renders nothing. Reuses the existing `text-sm text-slate-400` chip idiom already on FlowgridHome (`src/ui/flowgrid-home/FlowgridHome.tsx`). NOT dismissible — it is live state, not a notification.
- **D-06:** **Near-Bloom chip is highlighted + tappable.** The near-Bloom chip uses an accent color and navigates straight to that Cell's Board (`/cells/:id`) on tap, so the user can start the session that completes Bloom. The other chips (Energy/Charge/Tokens) stay flat and informational. Near-Bloom earns emphasis because it names a specific Cell and is the most directly actionable cue.
- **D-07:** **Absolute values per chip** — concrete numbers only ("Charge 80", "Energy 40", "Tokens 2", "Music: 1 session from Bloom"). No progress-to-next detail in the rail (Integration-to-next-threshold lives in the Core panel, not the home rail). Matches the SessionSummary numeric display style.
- **D-08:** **No shame/punitive language** (SPEC prohibition retained). Neutral, forgiving framing only ("you broke your streak" / "you failed" style strings are prohibited). The rail must not obstruct the protected `open app → tap Cell → start session` flow — it sits above the canvas, below the resume-session banner.

### Rejuvenation Summary Surface (REJ-05)
- **D-09:** **Inline panel on the Core panel**, mirroring the Phase 3 `SessionSummary` pattern exactly. A new `lastCompletedRejuvenation` store field captures the finished rejuvenation (analogous to `lastCompletedSession` in `src/app/store/dispatch.ts`), and the Core panel renders the summary from it. NOT a modal (consistent with Phase 3's deliberate "inline not modal — modal blocks the Generator" decision) and NOT a toast (too ephemeral for a token-grant moment).
- **D-10:** **Persists until the next action.** The summary stays visible until a new dispatch clears `lastCompletedRejuvenation` (mirrors `SessionSummary`). No auto-dismiss timer — the user reviews Charge processed, Integration gained, tokens granted, and distance to the next threshold at their own pace.

### the agent's Discretion

The following were not user-selected gray areas (Core panel placement) or are mechanical details the user delegated. The agent should pick standard, well-tested approaches consistent with prior-phase patterns and document them in the plan:

- **Core panel placement** — Dedicated `/core` route (peer to Flowgrid Home `/` and Cell Board `/cells/:id`) vs. an embedded section/dialog on FlowgridHome. `docs/gameplay-spine-draft.md` §19 lists "Core View" as one of the four major UI surfaces (alongside Flowgrid Home, Cell Board, Module Forge), which suggests a dedicated route. The planner picks; the protected tap-Cell→start flow on Home must stay unobstructed either way. The rejuvenation summary (D-09) lives wherever the Core panel lives.
- **Active-rejuvenation marker storage** — where the live-rejuvenation `startedAt` marker lives given rejuvenation is Core-scoped and mutually exclusive with focus (D-02). Options: a nullable `activeRejuvenationStartedAt` on `CoreRecord` (parallel to `CellRecord.activeSessionStartedAt`), or a generalized app-wide active-session record. Either works; the planner picks and migrates accordingly (v2→v3). The one-active-session invariant must be enforced (at most one marker non-null).
- **Energy-upgrade command shape & naming** — the new spend-Energy command (3-level Activation-bonus boost, costs 50/100/200, +5/level, cap 3, derived bonus `ACTIVATION_CURRENT_BONUS_PERCENT (10) + level × 5`). Naming, exact input shape, and how `complete_focus_session` reads the level follow the existing command pattern (`src/simulation/commands/set-core-allocation.ts` is the template). The persisted upgrade level most naturally lives as a new field on `CoreRecord` (e.g. `activationBoostLevel`) since the SPEC R5 target says "a persisted Core upgrade level" and `complete_focus_session` already reads `CoreRecord`.
- **Dexie v2→v3 migration shape** — add the `rejuvenations` store (append-only `RejuvenationRecord` rows) + the new `CoreRecord` field(s) (`activationBoostLevel`, and possibly `activeRejuvenationStartedAt`). Reuse the Phase 2 D-07 synthetic-fixture migration harness and the extracted-transform pattern (`upgradeCellsV1ToV2` in `src/persistence/database.ts` is the template). Stores must be repeated verbatim from v2 in the v3 declaration (Dexie requires the full store set). Export/restore (Phase 2 D-09/D-12) must include the new collection.
- **Rejuvenation timer UI** — cosmetic live timer during an active rejuvenation session, paralleling `SessionTimer` (`src/ui/cell-board/SessionTimer.tsx`). Where the start-rejuvenation control lives is coupled to Core panel placement (above).
- **Short-rest no-op** — whether a sub-minute rejuvenation finish is routed through a zero-gain/no-record path (paralleling Phase 3 D-08 "sub-second finish is treated as a cancel") is the planner's call. Note D-03's 0-Charge rule already appends a zero-gain record; a consistent sub-minute rule should be decided alongside it.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` — Defines Flowgrid's core value, protected core interaction (`open app → tap Cell → start session` — must stay easy), architecture layer rule, economy-safety constraints (no negative resources, no token duplication, no forge-count reset, no offline production exploits), **recovery design constraint ("Rejuvenation must matter mechanically, but rest farming should require Core Charge created by prior activity" — D-03 preserves this)**, append-only history rule, and accessibility rule. Directly governs this phase.
- `.planning/REQUIREMENTS.md` — Defines Phase 4 requirements `CORE-01..06`, `REJ-01..05`, `UI-07`. Note CORE-01/03/04 (routing/convert/store) are already implemented from Phase 1 and only need UI surfacing this phase.
- `.planning/ROADMAP.md` — Defines Phase 4 goal, 5 success criteria, Phase 3 dependency, and v1 phase boundary. "UI hint: yes".
- `.planning/STATE.md` — Records Phase 3 completion (2026-06-24, all 15 UAT pass after 03-05 gap-closure) and carrying decisions (plain-string IDs, SessionId↔OperationId 1:1, repository diff-writes, the `complete_focus_session` activeSessionStartedAt fix from 03-05).

### Phase SPEC (MUST read — and read the R3 amendment in this file's spec_lock)
- `.planning/phases/04-core-alternation-and-rejuvenation-economy/04-SPEC.md` — 9 locked requirements, boundaries, 15 acceptance criteria, 20/20 edge coverage, 6/6 prohibitions, ambiguity 0.13. **WARNING: R3 and Interview Log Round 1 are SUPERSEDED by the duration-gated amendment in this CONTEXT.md's `<spec_lock>`.** All other requirements, acceptance criteria, edges, and prohibitions stand.

### Prior Phase Context (decisions that constrain Phase 4)
- `.planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md` — D-02 (`log_rejuvenation` typed stub returning `not_implemented` until Phase 4 — this phase replaces it), D-07 (typed validation issues, no throwing for domain invalidity), D-08 (exact deterministic replay across state/events/operations/issues — D-03/D-04 must preserve this).
- `.planning/phases/02-durable-local-first-spine/02-CONTEXT.md` — D-02 (rejected/not_implemented commands write nothing), D-04 (idempotent upsert by operationId — `RejuvenationRecord` id is 1:1 with `operationId`), D-07/D-08 (synthetic migration-fixture harness + the four independent version axes — Dexie schema version is store-shape-only; v2→v3 reuses the harness; ARCHIVE_VERSION is a fourth axis), D-09 (full JSON export never strips the operation log — must include the new rejuvenations collection).
- `.planning/phases/03-playable-generator-flowgrid/03-CONTEXT.md` — D-02 (visual events dropped freely — renderer safety holds this phase), D-05 (start-markered active sessions — D-01/D-02 mirror this for rejuvenation), D-06 (diff for truth, tick for UI — D-04 carries this over), D-13 (belt-and-suspenders day rollover), D-15 (Activation +% Current bonus — the upgrade command raises this base via `10 + level × 5`).

### Phase 1–3 Code Contracts (the inputs Phase 4 consumes — MUST read)
- `src/domain/records.ts` — `CoreRecord` already carries `energy, coreCharge, lifetimeEnergy, integration, moduleTokens, convertAllocationPercent, storeAllocationPercent, forgeCount` (lines 54–65). Phase 4 adds the upgrade level (and possibly `activeRejuvenationStartedAt`) to `CoreRecord`, and adds a new `RejuvenationRecord` interface + a `rejuvenations` array on `FlowgridSnapshot` (parallel to `sessions`).
- `src/domain/result.ts` — `LogRejuvenationCommand` is typed `{ type, operationId, durationSeconds }`; the `SimulationCommand` union and dispatcher. Phase 4 adds the new Energy-upgrade command variant to the union and implements the `log_rejuvenation` handler. **Note:** D-04 derives `durationSeconds` from `startedAt`/`endedAt`; the command input shape may need `startedAt`+`endedAt` (mirroring `CompleteFocusSessionCommand`) rather than just `durationSeconds` — planner reconciles with the existing stub.
- `src/simulation/engine.ts` — Dispatcher switch (lines 49–50 route `log_rejuvenation` to the `not_implemented` stub). Phase 4 replaces `logRejuvenationNotImplemented` with the real handler and adds a case for the upgrade command. Exhaustive switch guarantees compile-time safety.
- `src/simulation/commands/set-core-allocation.ts` — Template for the new Energy-upgrade command (validate → apply → emit operation → return `SimulationResult`; reject-with-issues pattern).
- `src/simulation/commands/complete-focus-session.ts` — Already routes Cell Current → Core and applies `splitCoreCurrent`; Energy/Core Charge already increment (lines ~188–192). Phase 4 modifies it to derive the Activation bonus as `ACTIVATION_CURRENT_BONUS_PERCENT + level × 5` from the new Core upgrade level.
- `src/simulation/systems/core-allocation.ts` + `src/content/formulas.ts` — `splitCoreCurrent` and the integer floor-once discipline (lines 59–69). New rejuvenation/threshold constants live in `src/content` (REJUVENATION_CHARGE_PER_MINUTE, threshold base 50, ratio 1.5, upgrade costs 50/100/200, +5/level, cap 3).
- `src/domain/invariants.ts` — Already guards `integration`/`moduleTokens` non-negativity and `token_regression` (monotonic). Phase 4 adds the threshold-advance + upgrade-level invariants.
- `src/persistence/database.ts` — Dexie gateway, currently v2 (lines 82–111). Phase 4 adds `version(3)` with the `rejuvenations` store + Core field migration. `upgradeCellsV1ToV2` (lines 54–64) is the extracted-transform template. The `core` store name collision note (lines 69–72) applies.
- `src/app/store/dispatch.ts` — The single mutation path; `captureCompletedSession` (lines 109–118) is the template for `captureCompletedRejuvenation` → `lastCompletedRejuvenation` store field (D-09).
- `src/ui/session-summary/SessionSummary.tsx` + `nextAction.ts` — The inline-panel pattern D-09 mirrors; the `RejuvenationSummary` component parallels this.
- `src/ui/flowgrid-home/FlowgridHome.tsx` — Where the return-cue stat-chip rail (D-05/D-06/D-07) mounts (above the canvas, below the resume-session banner). Existing chip idiom (`text-sm text-slate-400`) and Radix Dialog patterns to reuse.
- `src/app/routes.tsx` — Route table (`/` and `/cells/:cellId`); Core panel placement (Agent's Discretion) adds a route here if a `/core` route is chosen.

### Design Drafts
- `docs/gameplay-spine-draft.md` §19 — "UI implications" lists Flowgrid Home, Cell Board, Core View, Module Forge as the four major surfaces (Core View = this phase; suggests a dedicated Core panel/route). §14 — Activation examples inform the upgrade-derived bonus.

### Stack References (already locked — read for exact wiring)
- `AGENTS.md` "Technology Stack" section — React 19, Vite 8, Router v7, Tailwind 4, PixiJS 8, Radix UI, lucide-react, Zustand 5, Dexie 4, Zod 4, Vitest 4, fast-check. Architecture rules: domain imports no app/browser/Pixi/React/Dexie/Zustand; ui dispatches commands and displays selectors, never calculates economy rules; Pixi is not imported from UI panels.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`CoreRecord`** (`src/domain/records.ts:54`) — already carries every economy field Phase 4 reads/writes except the upgrade level. Add the level (and possibly the active-rejuvenation marker) in place.
- **`splitCoreCurrent` + `applyCoreAllocation`** (`src/content/formulas.ts:59`, `src/simulation/systems/core-allocation.ts`) — the convert/store split is done; Phase 4 only surfaces its results in UI.
- **`set_core_allocation` command** (`src/simulation/commands/set-core-allocation.ts`) — works and validates; template for the new upgrade command's validate→apply→emit→return shape.
- **`complete_focus_session`** (`src/simulation/commands/complete-focus-session.ts`) — already routes Current→Core and increments Energy/Core Charge; Phase 4 only changes the Activation bonus derivation to `10 + level × 5`.
- **`dispatch` + `captureCompletedSession`** (`src/app/store/dispatch.ts`) — the single mutation path and the `lastCompletedSession` store-field pattern; mirror for `lastCompletedRejuvenation`.
- **`SessionSummary` + `nextAction.ts`** (`src/ui/session-summary/`) — inline-panel template for `RejuvenationSummary`.
- **`FlowgridHome`** (`src/ui/flowgrid-home/FlowgridHome.tsx`) — mount point for the return-cue rail; existing chip idiom + Radix Dialog patterns.
- **`upgradeCellsV1ToV2` + migration harness** (`src/persistence/database.ts:54`, Phase 2 D-07) — extracted-transform + synthetic-fixture pattern for the v2→v3 migration.

### Established Patterns
- **Strict layer boundaries** (ESLint-enforced): simulation imports no UI/Pixi/React/Dexie/browser; persistence runs no simulation rules; UI dispatches commands and reads selectors, never computes economy rules. Phase 4's new simulation command, Core panel, and rejuvenation summary must respect these.
- **Integer economy units** everywhere (`IntNonNegative`, `IntPercent`, `IntSeconds`); multiply-then-floor; no floats. D-03's duration-gating and the threshold `Math.floor`-ing follow this.
- **Plain string IDs** (not branded); `RejuvenationRecord.id` is 1:1 with `operationId` (idempotent replay).
- **Typed results, no throwing for domain invalidity** (Phase 1 D-07) — the upgrade command and `log_rejuvenation` return `rejected` results with structured `ValidationIssue[]` (e.g. energy-below-cost, level-at-cap).
- **Deterministic replay** (Phase 1 D-08) — same inputs → identical `nextState`/events/operations/issues. D-03/D-04 must preserve this (no `Math.random` in the loop).
- **Hybrid records-plus-operation-log** (Phase 2 D-01) — each applied command writes changed records + operation (+ rejuvenation record); rejected commands write nothing.
- **Diff-write in persistence** (Phase 2 D-03) — repository detects changed records by diffing; new Core-field writes and new rejuvenation records are picked up automatically.
- **Visual events are transient** (Phase 3 D-02) — renderer may drop them freely; Phase 4 may emit Core/rejuvenation visual events but animation is Phase 6.

### Integration Points
- **App shell ↔ Repository:** the existing `initApp`/`dispatch` path (`src/app/store/dispatch.ts`) consumes the new command results unchanged in shape; the store gains `lastCompletedRejuvenation` and the active-rejuvenation marker projection (parallels `deriveActiveSession`).
- **Core panel ↔ selectors:** the Core panel reads `core` (Energy, Charge, allocation, Integration, nextThreshold, Module Tokens, upgrade level) and recent rejuvenations via selectors; dispatches `set_core_allocation`, `log_rejuvenation`, and the new upgrade command through `dispatch`.
- **FlowgridHome ↔ return cues:** a new `ReturnCues` component reads the snapshot, derives actionable-state booleans, and renders the stat-chip rail; the near-Bloom chip calls `navigate('/cells/:id')`.
- **Repository ↔ Dexie v3:** `version(3)` adds the `rejuvenations` store + Core field upgrade transform; export/restore (`src/persistence/`) includes the new collection.

</code_context>

<specifics>
## Specific Ideas

- The **live-timed rejuvenation session** (D-01) was chosen specifically because the user wants rest to feel like a substantive, first-class parallel to focus — and because the duration-gated payout (D-03) makes "rest longer → process more Charge" coherent and motivating. A retrospective quick-log was rejected as too passive; a hybrid was rejected as two code paths for one feature.
- The **SPEC R3 re-spec** (D-03) was a deliberate user override: the SPEC's "payout = f(Charge), duration = history-only" made a live timer's duration decorative (waiting longer earned nothing extra; finishing immediately still processed everything). The user chose to tie payout to duration so the timer matters, while preserving the rest-farming guard (0 Charge → no-op) and all other locked mechanics.
- **10 Charge/min** (D-03) was chosen so the first Module Token (50 Integration = 100 Charge processed) takes ~10 minutes of rest — meaningful for a rest session without being a grind. It is explicitly content-tunable.
- The **near-Bloom highlighted+tappable chip** (D-06) was chosen because near-Bloom is the only cue that names a specific Cell and directly enables the protected tap-Cell→start flow; the other chips are glance-only state.
- The **inline rejuvenation summary that persists** (D-09/D-10) deliberately mirrors `SessionSummary` so the two completion-feedback surfaces feel like one consistent pattern; a modal was rejected to stay consistent with Phase 3's "modal blocks the Generator" reasoning.

</specifics>

<deferred>
## Deferred Ideas

- **Multiple simultaneous session types** (focus + rejuvenation concurrently) — rejected for v1 (D-02 locks one-active-session app-wide). Revisit if users report wanting to rest while a long focus session runs; would require reworking the active-session invariant and marker model.
- **Per-signal dismissible return-cue cards** — an option under D-05, rejected in favor of the persistent stat-chip rail. Could return if the rail proves too terse for power users wanting per-signal detail/navigation.
- **Progress-to-next detail in the home rail chips** (e.g. "Tokens 2 · 18/50 to next") — rejected (D-07) in favor of absolute values; Integration-to-next-threshold lives in the Core panel. Revisit if the home rail feels too sparse.
- **Full PixiJS animation of Core convert/charge/rejuvenation events** — Phase 6 (UI-03); visual events may be emitted this phase but are dropped/logged per Phase 3 D-02.
- **Additional Energy sinks beyond the Activation-bonus upgrade** — explicitly out of scope this phase (SPEC boundaries); Module Forge rolls are the Phase 5 Energy sink.

</deferred>

---

*Phase: 4-Core Alternation and Rejuvenation Economy*
*Context gathered: 2026-06-24*
</content>
</invoke>