# Phase 4: Core Alternation and Rejuvenation Economy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-24
**Phase:** 04-core-alternation-and-rejuvenation-economy
**Areas discussed:** Rejuvenation interaction model, Return cues presentation, Rejuvenation summary surface

**Note:** A `04-SPEC.md` (ambiguity 0.13, 9 requirements locked) existed before this discussion. The discussion focused on HOW-to-implement decisions. One area (Rejuvenation interaction model) resulted in a **SPEC R3 amendment** — see CONTEXT.md `<spec_lock>`.

---

## Rejuvenation interaction model

### Q1 — How should a user perform rejuvenation?

| Option | Description | Selected |
|--------|-------------|----------|
| Retrospective quick-log | Enter/estimate duration ('I rested 20 min'), submit. `startedAt = now − duration`. Mirrors `log_` verb. | |
| Live timed session | Mirrors focus: start → timer → finish. Reuses Phase 3 D-05 active-session marker. | ✓ |
| Hybrid | Quick-log default + optional live timer toggle. | |
| You decide | Agent picks within SPEC constraints. | |

**User's choice:** Live timed session
**Notes:** User wants rest to feel substantive and parallel to focus. This also makes the later duration-gated payout decision (Q3) coherent.

### Q2 — Can focus + rejuvenation be active simultaneously?

| Option | Description | Selected |
|--------|-------------|----------|
| One active session, app-wide | Rest OR focus, mutually exclusive. Extends Phase 3's one-active-session rule. | ✓ |
| Allow both simultaneously | Rest while a long focus session runs. Breaks the one-active-session invariant. | |

**User's choice:** One active session, app-wide
**Notes:** Matches the emotional model (resting OR focusing, never both).

### Q3 — Duration vs Charge tension (SPEC makes payout f(Charge) not f(duration))

| Option | Description | Selected |
|--------|-------------|----------|
| Duration = history only, payout = Charge | Keep SPEC as written. Live timer's duration is decorative. | |
| Tie payout to duration (re-spec) | Re-open SPEC so resting longer processes more Charge. | ✓ |

**User's choice:** Tie payout to duration (RE-OPEN THE SPEC)
**Notes:** Flagged tension: with SPEC-as-written, a live timer's duration had zero economic effect (finishing immediately processed all Charge). User chose to re-open so the timer matters. Economy-safety guard (rest farming requires prior Core Charge) preserved in Q4.

### Q4 — Confirm the re-spec shape

| Option | Description | Selected |
|--------|-------------|----------|
| Duration-gated, capped by Charge | `chargeProcessed = min(Charge, floor(minutes × RATE))`; `integration = floor(processed/2)`; retain odd remainder; 0 Charge = no-op rest; 2:1 + threshold base 50 retained. | ✓ |
| Duration threshold, then process all | Rest ≥ N min → process everything; under N → nothing. Punishing for short rests. | |

**User's choice:** Duration-gated, capped by Charge
**Notes:** REJ-03 / rest-farming guard preserved (0 Charge → no-op rest, rest honored not rewarded). Deterministic, computed-at-finish like focus (Phase 3 D-06).

### Q5 — Starting processing rate (Charge/min)

| Option | Description | Selected |
|--------|-------------|----------|
| 10 Charge/min | First token (100 Charge) ≈ 10 min rest. Meaningful without grinding. | ✓ |
| 5 Charge/min | ≈ 20 min rest per first token. More substantial/committal. | |
| 20 Charge/min | ≈ 5 min rest per first token. Snappier but risks cheapening tokens. | |
| You decide the rate | Lock only the shape; rate is a content constant. | |

**User's choice:** 10 Charge/min
**Notes:** Content-tunable. Threshold base 50 + 2:1 ratio retained, so first token still = 100 Charge processed.

---

## Return cues presentation (UI-07)

### Q1 — How should the UI-07 cues appear on FlowgridHome?

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent stat-chip rail | Compact chips (Energy · Charge · Tokens · Near-Bloom) above canvas when actionable state exists. Persistent, no dismiss. Reuses existing chip idiom. | ✓ |
| Single dismissible summary card | One narrative 'welcome back' card, dismissible. More vertical space. | |
| Per-signal dismissible cards | One card per signal, independently dismissible. Most clutter. | |

**User's choice:** Persistent stat-chip rail
**Notes:** Low-friction, glanceable, fits above the canvas without obstructing the protected tap-Cell→start flow.

### Q2 — Should chips be tappable / is near-Bloom specially emphasized?

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight + tap near-Bloom | Near-Bloom chip accent-colored + tappable → navigates to that Cell's Board. Others flat. | ✓ |
| All chips flat/informational | Report state only, no navigation. Maximum simplicity. | |
| All chips tappable | Every chip navigates (Energy→Core, Tokens→Core, etc.). Couples rail to routes. | |

**User's choice:** Highlight + tap near-Bloom
**Notes:** Near-Bloom names a specific Cell and is the most directly actionable cue.

### Q3 — How much detail per chip?

| Option | Description | Selected |
|--------|-------------|----------|
| Absolute values | "Charge 80", "Energy 40", "Tokens 2", "Music: 1 session from Bloom". | ✓ |
| Values + progress-to-next | Also show "18/50 to next". Richer but denser; pulls Integration into the home rail. | |

**User's choice:** Absolute values
**Notes:** Integration-to-next-threshold lives in the Core panel, not the home rail.

---

## Rejuvenation summary surface (REJ-05)

### Q1 — Where/how should the summary appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline panel on Core panel | Mirrors Phase 3 SessionSummary; `lastCompletedRejuvenation` store field. Consistent. | ✓ |
| Modal dialog | Radix Dialog pop on completion. More 'celebration' but diverges from SessionSummary pattern. | |
| Toast notification | Auto-dismissing toast. Too ephemeral for token-grant moment; no toast system exists. | |

**User's choice:** Inline panel on Core panel
**Notes:** Deliberately mirrors SessionSummary so the two completion-feedback surfaces feel like one pattern. Modal rejected for consistency with Phase 3's 'modal blocks the Generator' reasoning.

### Q2 — Persist or auto-dismiss?

| Option | Description | Selected |
|--------|-------------|----------|
| Persists until next action | Stays until a new dispatch clears it (mirrors SessionSummary). | ✓ |
| Auto-dismiss after a few seconds | Less clutter but loses token-grant detail if user looks away. | |

**User's choice:** Persists until next action
**Notes:** Token-grant is a meaningful, reviewable moment; no auto-dismiss timer.

---

## the agent's Discretion

- **Core panel placement** — was offered as a 4th gray area but NOT user-selected. Falls to agent's discretion. `docs/gameplay-spine-draft.md` §19 lists "Core View" as a major surface (suggests a dedicated `/core` route, peer to Flowgrid Home + Cell Board). Planner decides; protected tap-Cell→start flow on Home must stay unobstructed.
- **Active-rejuvenation marker storage** — where the live-rejuvenation startedAt lives (CoreRecord field vs generalized marker). Planner picks; one-active-session invariant must hold.
- **Energy-upgrade command shape & naming** — template is `set-core-allocation.ts`; upgrade level most naturally a new CoreRecord field.
- **Dexie v2→v3 migration shape** — add `rejuvenations` store + Core field(s); reuse Phase 2 D-07 harness.
- **Rejuvenation timer UI** — cosmetic timer paralleling `SessionTimer`.
- **Short-rest no-op** — whether sub-minute finish is a zero-gain/no-record path (parallels Phase 3 D-08).

## Deferred Ideas

- Multiple simultaneous session types (focus + rejuvenation concurrently) — revisit if users want to rest during long focus.
- Per-signal dismissible return-cue cards — revisit if the rail feels too terse.
- Progress-to-next detail in home rail chips — revisit if rail feels sparse.
- Full PixiJS animation of Core/rejuvenation events — Phase 6 (UI-03).
- Additional Energy sinks beyond the Activation-bonus upgrade — Phase 5 (Forge rolls).
</content>
