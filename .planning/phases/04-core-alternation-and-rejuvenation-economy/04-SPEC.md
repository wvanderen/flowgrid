# Phase 4: Core Alternation and Rejuvenation Economy — Specification

**Created:** 2026-06-24
**Ambiguity score:** 0.13 (gate: ≤ 0.20)
**Requirements:** 9 locked

## Goal

User can route Cell effort into the Core (already-working Current→Energy/Core Charge split), see and adjust that economy in a Core panel, spend Energy on an Activation-bonus upgrade, and process prior activity through rejuvenation that consumes stored Core Charge into Integration and grants Module Tokens at geometric thresholds — with a Core panel, rejuvenation summary, and contextual return cues completing the activity/rest alternation loop.

## Background

The simulation scaffolding for this phase is largely already in place from Phases 1–3:

- `CoreRecord` already carries every field Phase 4 needs: `energy`, `coreCharge`, `lifetimeEnergy`, `integration`, `moduleTokens`, `convertAllocationPercent`, `storeAllocationPercent`, `forgeCount` (`src/domain/records.ts:54`).
- `applyCoreAllocation` + `splitCoreCurrent` already split incoming Current into Energy + Core Charge with integer floor-once discipline (`src/simulation/systems/core-allocation.ts`, `src/content/formulas.ts:59`).
- `set_core_allocation` is fully implemented and enforces the `convert + store === 100` invariant (`src/simulation/commands/set-core-allocation.ts`).
- `complete_focus_session` already routes Cell Current → Core via the Output route and applies the allocation split — Energy and Core Charge already increment on focus completion (`src/simulation/commands/complete-focus-session.ts:188-192`).
- `LogRejuvenationCommand` is typed `{ type, operationId, durationSeconds }` but returns `not_implemented` (`src/simulation/engine.ts:49-50`).
- Invariants already guard `integration` / `moduleTokens` non-negativity and `token_regression` (monotonic Module Tokens) (`src/domain/invariants.ts:68-69,219`).
- UI exists only for `FlowgridHome` + `CellBoard`; there is no Core panel, no rejuvenation UI, and no return-cue surface.

**What does NOT exist (the Phase 4 delta):** the `log_rejuvenation` handler, the Integration→Module-Token threshold system, the Energy-spend upgrade command, a Core UI panel, a rejuvenation summary, and contextual return cues on FlowgridHome.

## Requirements

1. **Current routing to Core (CORE-01, CORE-03, CORE-04)**: Focus session completion routes Cell Current to the Core through the starter Output route and applies the convert/store allocation split, incrementing Energy and Core Charge deterministically.
   - Current: `complete_focus_session` already routes Current and applies `splitCoreCurrent`; Energy/Core Charge increment. It works but is not yet surfaced in any Core-facing UI.
   - Target: routing/split behavior is unchanged AND the resulting Energy/Core Charge outcomes are visible in the new Core panel (Requirement 7).
   - Acceptance: completing a focus session increments `core.energy` and/or `core.coreCharge` by the floored split for a known allocation; the new values are readable from the Core panel.

2. **Core allocation control (CORE-02)**: User can set the Core convert/store allocation from the Core panel while the invariant `convertAllocationPercent + storeAllocationPercent === 100` is always enforced.
   - Current: `set_core_allocation` command works and validates the total; no UI control surfaces it.
   - Target: allocation is editable from the Core panel; invalid totals are rejected and the rejection is surfaced to the user.
   - Acceptance: setting 50/50 applies; 30/70 applies; 30/50 (sum 80) is rejected with `invalid_core_allocation_total` and state is unchanged; the rejection message is shown in the UI.

3. **Rejuvenation command — consume Charge into Integration (REJ-01, REJ-02, REJ-03)**: `log_rejuvenation` consumes stored Core Charge into Integration at a 2:1 ratio (2 Core Charge → 1 Integration), decrements Core Charge by the consumed (even) amount, retains any odd remainder, and applies as a no-op rest (still appends a record with zero gains) when Core Charge is zero so rest is honored without being rewarded.
   - Current: `log_rejuvenation` returns `not_implemented`; no Charge is ever consumed; no Integration is ever produced.
   - Target: `log_rejuvenation` is implemented, deterministic, returns a full `SimulationResult`, decrements Core Charge by `2 × floor(C/2)`, adds `floor(C/2)` Integration, and appends a `RejuvenationRecord`. At C=0 it applies and appends a record with `chargeConsumed=0`, `integrationGained=0`, `tokensGranted=0`.
   - Acceptance: with 100 Core Charge, one rejuvenation yields 50 Integration and leaves 0 Core Charge; with 101 Core Charge, yields 50 Integration and leaves 1 Core Charge (retained remainder); with 0 Core Charge, applies and appends a record with all-zero gains and Integration/Module Tokens unchanged.

4. **Integration → Module Tokens — geometric thresholds (REJ-04)**: Integration progresses toward a geometric threshold curve starting at 50 and multiplying by 1.5 each subsequent token, with each threshold `Math.floor`-ed (50, 75, 112, 168, 252 …). Each crossed threshold grants exactly one Module Token and advances the next threshold; a single rejuvenation that crosses multiple thresholds grants all crossed tokens.
   - Current: `integration` and `moduleTokens` fields exist but are never incremented; no threshold logic exists.
   - Target: crossing a threshold grants one Module Token and advances `nextThreshold`; multiple crossings in one command grant multiple tokens (loop while `integration ≥ nextThreshold`).
   - Acceptance: from 0 Integration, a rejuvenation that brings Integration to ≥50 grants exactly 1 Module Token; a rejuvenation that brings Integration from 0 to ≥125 (crossing 50 and 75) grants exactly 2 Module Tokens; Integration and Module Tokens never decrease; the threshold sequence is `50, 75, 112, 168, 252` for the first five tokens.

5. **Energy upgrade — Activation bonus boost (CORE-06)**: User can spend Energy on a Core Activation-bonus upgrade with a cap of 3 levels, scaling Energy costs per level (50, 100, 200), where each purchased level adds +5 to the Activation Current bonus. The effective Activation bonus is derived as `ACTIVATION_CURRENT_BONUS_PERCENT (10) + level × 5`.
   - Current: Energy only accumulates (from the convert split); there is no command that spends it; `ACTIVATION_CURRENT_BONUS_PERCENT` is a fixed content constant of 10.
   - Target: a new command spends Energy to increment a persisted Core upgrade level; the activation bonus used by `complete_focus_session` becomes `10 + level × 5`; buying at cap (level 3) is rejected; buying when `energy < cost` is rejected.
   - Acceptance: at level 0 with ≥50 Energy, purchasing succeeds, Energy decreases by 50, level becomes 1, and the next activated focus session earns `+15%` Current (not `+10%`); purchasing a 4th level is rejected; purchasing with Energy below the next cost is rejected.

6. **Rejuvenation history — append-only records (REJ-01 append-only)**: Completed rejuvenation sessions are stored as append-only `RejuvenationRecord` rows with `id, startedAt, endedAt, durationSeconds, chargeConsumed, integrationGained, tokensGranted, createdAt`, persisted across reloads and exportable alongside session history. Record id is 1:1 with the command `operationId` so replays are idempotent.
   - Current: No `RejuvenationRecord` shape or history collection exists; `FlowgridSnapshot` has no rejuvenation array.
   - Target: A new append-only collection on `FlowgridSnapshot` (parallel to `sessions`), a Dexie store + migration, and inclusion in JSON export/restore validation.
   - Acceptance: after a rejuvenation, a `RejuvenationRecord` exists with correct fields and is present after reload; running the same command again (same `operationId`) does not create a duplicate; the record survives JSON export → restore.

7. **Core panel UI (CORE-05)**: Core-oriented UI surfaces Energy, Core Charge, convert/store allocation settings, Integration progress toward the next threshold, Module Token count, and a useful next action, using semantic non-canvas controls to change allocation and trigger rejuvenation.
   - Current: No Core-facing UI exists; Core state is only readable through simulation internals.
   - Target: A Core panel/route renders all six pieces from the live snapshot with semantic controls; allocation changes and rejuvenation dispatch through the normal command path.
   - Acceptance: the Core panel renders Energy, Core Charge, the two allocation values, Integration progress (current / next threshold), and Module Token count from real snapshot data; the allocation control dispatches `set_core_allocation`; a rejuvenation control dispatches `log_rejuvenation`; all controls are semantic non-canvas elements (buttons/inputs, not canvas hits).

8. **Rejuvenation summary (REJ-05)**: After a rejuvenation session the user sees how much Core Charge was processed and how close Integration is to the next Module Token threshold.
   - Current: No rejuvenation feedback exists (command is `not_implemented`).
   - Target: A post-rejuvenation summary shows `chargeConsumed`, `integrationGained`, `tokensGranted` (if any), and the remaining Integration distance to the next threshold.
   - Acceptance: after a rejuvenation that consumes 100 Charge, the summary reports 100 Charge processed, 50 Integration gained, the token grant (0 or more), and the distance to the next threshold from the new Integration total.

9. **Return cues on FlowgridHome (UI-07)**: Opening Flowgrid surfaces contextual return cues on FlowgridHome showing stored Core Charge, available Energy, token progress, Cells near Bloom, and recent history, using neutral framing without shame language. Cues appear whenever actionable economy state exists (unspent Charge > 0, OR Energy > 0, OR token progress > 0, OR a Cell is near Bloom, OR recent history exists).
   - Current: FlowgridHome shows active Cells, an interrupted-session resume prompt, and a Create-Cell affordance; it surfaces no Core economy state or return context.
   - Target: FlowgridHome renders a contextual cue area (no new route) surfacing the listed economy signals with neutral, non-punitive framing.
   - Acceptance: with stored Core Charge > 0 the cue is visible and names the amount; with a Cell within one session of its daily milestone (near Bloom) the cue names that Cell; with no actionable state the cue area renders nothing; no cue string contains shame/punitive phrasing (e.g. "you broke your streak", "you failed").

## Boundaries

**In scope:**
- Implement the `log_rejuvenation` command handler (consume Charge → Integration, geometric thresholds, token grants, no-op rest at 0 Charge).
- New `RejuvenationRecord` append-only history collection + Dexie store + migration + export/restore coverage.
- New Energy-spend command for the 3-level Activation-bonus upgrade with persisted Core level.
- Core panel UI (CORE-05): Energy, Core Charge, allocation, Integration progress, Module Tokens, next action, with allocation + rejuvenation controls.
- Rejuvenation summary UI (REJ-05).
- Contextual return cues on FlowgridHome (UI-07).
- Wire already-working Current routing / convert / store / set-allocation into the new Core UI (formalize CORE-01..04 end-to-end visibility).

**Out of scope:**
- Module Forge (`run_forge`, `install_module`) — that is Phase 5; Energy only buys the Activation upgrade here, not Forge rolls.
- Installing/applying Forge rewards into starter slots — Phase 5.
- Settings UI (default session length, day boundary, reduced motion, export) — Phase 6.
- Full PixiJS animation of Core convert/charge/rejuvenation events (visual events may be emitted but animation is Phase 6); the Phase 3 D-02 "drop/log visual events" contract continues to hold.
- Offline idle production / passive Charge generation — explicitly out (resources come from real effort + recovery).
- Cloud sync reconciliation — v1 is local-first; sync-ready operation rows are still emitted but not transported.
- Editing the Core upgrade beyond the single Activation-bonus boost (no other Energy sinks this phase).

## Constraints

- **Integer economy discipline**: all Charge consumption, Integration, Module Token, Energy, and cost math uses integer multiply-then-floor; no floating-point durable values (PROJECT.md economy safety). The 2:1 ratio consumes `2 × floor(C/2)` and retains the odd remainder; thresholds are `Math.floor`-ed.
- **Deterministic & replayable**: `log_rejuvenation` and the upgrade command must be exactly replayable (same inputs → same `SimulationResult`), matching the Phase 1 replay contract. Rejuvenation record ids are 1:1 with `operationId`.
- **Economy safety (PROJECT.md)**: no negative resources (guarded by existing `invariants.ts` + Zod nonnegative schemas); no token duplication; Module Tokens and Integration are monotonic (never decrease); the threshold sequence only advances; no free upgrade levels.
- **History is sacred**: `RejuvenationRecord` rows are append-only; never mutated or deleted after creation (parallels `SessionRecord`).
- **Boundary rules**: domain/simulation must not import DOM/React/Pixi/Dexie (enforced by the existing boundary scanner test); UI dispatches commands and reads selectors, never computes economy rules; Pixi is not imported from UI panels.
- **Protected core interaction**: `open app → tap Cell → start session` must stay easy; the new Core panel and return cues must not obstruct the Generator flow on FlowgridHome.
- **Tunability**: the 2:1 ratio, threshold base (50) and ratio (1.5), upgrade costs (50/100/200), per-level bonus (+5), and cap (3) are content constants (in `src/content`), not hardcoded in command handlers.

## Acceptance Criteria

- [ ] Completing a focus session increments `core.energy` and/or `core.coreCharge` per the floored allocation split, visible in the Core panel.
- [ ] Core panel allocation control applies valid splits (e.g. 50/50, 30/70) and rejects invalid totals (e.g. 30/50) with a surfaced message and unchanged state.
- [ ] `log_rejuvenation` with 100 Core Charge yields 50 Integration, 0 remaining Core Charge.
- [ ] `log_rejuvenation` with 101 Core Charge yields 50 Integration, 1 retained Core Charge (odd remainder not lost).
- [ ] `log_rejuvenation` with 0 Core Charge applies and appends a `RejuvenationRecord` with `chargeConsumed=0`, `integrationGained=0`, `tokensGranted=0` (rest honored, not rewarded).
- [ ] Integration crossing the first threshold (≥50) grants exactly 1 Module Token; crossing from 0 to ≥125 grants exactly 2 tokens (multi-threshold grant).
- [ ] Integration and Module Tokens never decrease across any sequence of commands; the threshold sequence is `50, 75, 112, 168, 252`.
- [ ] Energy upgrade: at level 0 with ≥50 Energy, purchase succeeds (Energy −50, level 1); the next activated focus session earns `+15%` Current.
- [ ] Energy upgrade: purchasing a 4th level (at cap 3) is rejected; purchasing with Energy below the next level's cost is rejected with unchanged state.
- [ ] A `RejuvenationRecord` with correct fields is appended and survives reload; replaying the same `operationId` does not duplicate it; it survives JSON export → restore.
- [ ] Core panel renders Energy, Core Charge, both allocation values, Integration progress (current / next threshold), and Module Token count from live snapshot data, with semantic non-canvas controls.
- [ ] Post-rejuvenation summary reports Charge processed, Integration gained, token grant, and remaining distance to the next threshold.
- [ ] Return cues on FlowgridHome surface stored Charge / Energy / token progress / near-Bloom Cells / recent history when actionable state exists, and render nothing when there is none.
- [ ] No return-cue string contains punitive or shame-based phrasing.
- [ ] `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, and `npm run build` all pass; the domain/simulation boundary scanner test stays green.

## Edge Coverage

**Coverage:** 20/20 applicable edges resolved · 0 unresolved

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| boundary | R1 | ✅ covered | 0 Charge → no-op rest (zero-gain record); one step either side of a threshold handled by the grant loop |
| precision | R1 | ✅ covered | Integration = `floor(C/2)`; consume `2×floor(C/2)`; odd remainder retained |
| boundary | R2 | ✅ covered | Single rejuvenation crossing N thresholds grants N tokens (loop while integration ≥ nextThreshold) |
| adjacency | R2 | ✅ covered | `integration === nextThreshold` grants the token (≥ comparison) |
| empty | R2 | ✅ covered | 0 Integration → 0 tokens granted |
| ordering | R2 | ⛔ dismissed | No ordering semantics — Integration/Module Tokens are monotonic counters, not ordered collections |
| precision | R2 | ✅ covered | Thresholds `Math.floor`-ed each step: 50, 75, 112, 168, 252 |
| boundary | R3 | ✅ covered | Cap 3: 4th purchase rejected; `energy ≥ cost` succeeds and decrements |
| adjacency | R3 | ⛔ dismissed | Discrete integer levels — no adjacency/touching semantics |
| empty | R3 | ✅ covered | 0 Energy → cannot afford level 1, rejected |
| ordering | R3 | ⛔ dismissed | No ordering semantics — single Core upgrade-level counter |
| precision | R3 | ✅ covered | All integer math (costs, level, derived bonus `10 + level×5`) |
| unclassified | R4 | ✅ covered | Record id 1:1 with `operationId` → idempotent replay, no duplication (manual review of unclassified cue) |
| boundary | R5 | ✅ covered | Allocation already constrained to integer 0–100 with sum 100 (existing `set_core_allocation`) |
| precision | R5 | ✅ covered | Integer percent allocation (existing) |
| idempotency | R5 | ⛔ dismissed | `set_core_allocation` already idempotent (Phase 3); same input → same result |
| concurrency | R5 | ⛔ dismissed | Single atomic dispatch path (UI → engine → repository → store); no parallel mutation |
| boundary | R6 | ✅ covered | 0 progress and exactly-at-threshold proximity displayed correctly |
| precision | R6 | ✅ covered | Integer display values |
| unclassified | R7 | ✅ covered | Contextual trigger: cues appear whenever actionable economy state exists (manual review of unclassified cue) |

[Generated by the edge-completeness probe (Step 5.5). `covered` rows correspond to Acceptance Criteria above; `backstop` rows must be carried into plan-phase `must_haves`. `⚠ UNRESOLVED` rows are flagged: planner must treat as assumption. None unresolved.]

## Prohibitions (must-NOT)

**Coverage:** 6/6 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| MUST NOT grant Integration or Module Tokens from a rejuvenation when Core Charge is 0 (rest-farming exploit guard, REJ-03) | R1 | resolved | verification: test — assert 0-Charge rejuvenation yields `integrationGained=0`, `tokensGranted=0` |
| MUST NOT grant a Module Token for the same Integration threshold more than once (no token duplication) | R2 | resolved | verification: test — assert each threshold crossing grants at most one token and cannot re-grant |
| MUST NOT reset Integration progress or the threshold sequence (parallels the forge-count-no-reset prestige rule) | R2 | resolved | verification: test — assert Integration/nextThreshold are monotonic across commands |
| MUST NOT grant an upgrade level without deducting its full Energy cost (no free levels) | R3 | resolved | verification: test — assert level increment ⇒ Energy decremented by exact cost |
| MUST NOT mutate or delete RejuvenationRecord rows after creation (history is sacred / append-only) | R4 | resolved | verification: test — assert records unchanged across subsequent commands and replay |
| MUST NOT use punitive, shame-based, or guilt-framing language in return cues (forgiving framing required) | R7 | resolved | verification: judgment — neutral framing review; no shame/streak-failure phrasing |

[Generated by the prohibition probe (Step 5.6). `resolved` prohibitions become NEGATIVE acceptance criteria; `resolved`/`test` rows are checkable negatives the verifier iterates over, `resolved`/`judgment` rows route to judgment review. Canon referrals dropped: negative Charge/Energy protection → owned by `invariants.ts` + Zod nonnegative schemas; UI↔truth divergence → owned by code review + boundary rules.]

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                       |
|--------------------|-------|------|--------|-------------------------------------------------------------|
| Goal Clarity       | 0.90  | 0.75 | ✓      | All mechanics + numbers locked                              |
| Boundary Clarity   | 0.85  | 0.70 | ✓      | Explicit in/out-of-scope; Forge = Phase 5, Settings = Phase 6 |
| Constraint Clarity | 0.88  | 0.65 | ✓      | Integer discipline, 2:1 ratio, floored thresholds, costs pinned |
| Acceptance Criteria| 0.85  | 0.70 | ✓      | 15 pass/fail criteria with concrete numbers                  |
| **Ambiguity**      | 0.13  | ≤0.20| ✓      |                                                             |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

## Interview Log

| Round | Perspective      | Question summary                                                        | Decision locked                                                                                  |
|-------|------------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| 1     | Researcher       | What does rejuvenation consume/transform?                               | Consumes stored Core Charge → Integration (Charge-based rate; duration logged for history only)  |
| 1     | Researcher       | What does Energy buy in Phase 4 (Forge is Phase 5)?                     | A single early upgrade (later specified as Activation bonus boost)                               |
| 1     | Researcher       | Integration threshold curve shape?                                      | Geometric (increasing): each token costs more than the last                                      |
| 2     | Simplifier       | Concretely, what is the upgrade (cost/effect/repeat)?                   | Activation bonus boost, multi-level cap 3, scaling cost, stacks on base constant                 |
| 2     | Researcher       | Does rejuvenation create a history record or just mutate Core?          | Append-only `RejuvenationRecord` (history is sacred, parallels sessions)                         |
| 2     | Boundary Keeper  | Where do UI-07 return cues live?                                        | Extend FlowgridHome inline (no new route)                                                        |
| 3     | Boundary Keeper  | Concrete rejuvenation numbers (rate + threshold)?                       | 2 Core Charge → 1 Integration; first token at 50, ×1.5 each                                      |
| 3     | Boundary Keeper  | Upgrade: one-time or multi-level; stack or replace?                     | 3 levels, scaling Energy cost (50/100/200), each +5, derived bonus = base + level×5              |
| 3     | Boundary Keeper  | Rejuvenation with 0 Core Charge?                                        | Applies as no-op rest (appends zero-gain record); rest honored, not rewarded                     |
| Edge  | Failure Analyst  | Leftover odd Charge + threshold rounding?                               | Retain odd remainder; `Math.floor` each threshold (50, 75, 112, 168, 252)                        |
| Edge  | Failure Analyst  | Multi-threshold crossing in one rest?                                   | Grant ALL crossed tokens (loop while integration ≥ nextThreshold)                                |
| Edge  | Failure Analyst  | What triggers UI-07 return cues ("a gap")?                              | Contextual — appear whenever actionable economy state exists (not time-gated)                    |
| Proh  | Failure Analyst  | Six must-NOT candidates (rest-farming, dup tokens, reset, free levels, append-only, shame language)? | All six minted as negative acceptance criteria (5 test-tier, 1 judgment-tier)                  |

---

*Phase: 04-core-alternation-and-rejuvenation-economy*
*Spec created: 2026-06-24*
*Next step: /gsd-discuss-phase 4 — implementation decisions (Dexie migration shape, command/result extensions, Core panel route vs. section, upgrade command naming, etc.)*
