# Phase 5: Module Forge and Starter Customization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-25
**Phase:** 5-Module Forge and Starter Customization
**Areas discussed:** Forge cost model, v1 Forge reward types, Forge flow architecture, Forge UI surface

---

## Forge cost model

### Q1 — What does a v1 forge roll cost?

| Option | Description | Selected |
|--------|-------------|----------|
| Token-only | 1 Module Token per roll. Matches MOD-03 literally; tokens stay the scarce milestone reward. Simplest. Energy's only v1 sink remains the Phase 4 Activation boost. | |
| Token + Energy | Token gates the roll AND Energy is also consumed. Adds a second Energy sink but complicates command + history (two payment fields). | |
| Both paths (Token OR Energy) | Two separate forge paths: a Token roll (free choose-one-of-three) and an Energy roll (escalating cost, scalable). Most flexible but doubles command surface. | ✓ |

**User's choice:** Both paths (Token OR Energy)
**Notes:** The user chose the option flagged as heaviest despite complexity concerns — it's a legitimate reading of MOD-03 + PROJECT.md and matches the gameplay-spine §9 dual model. Follow-up Q2 scoped it to keep v1 simple.

### Q2 — How do the Token and Energy paths differ in v1?

| Option | Description | Selected |
|--------|-------------|----------|
| Same pool, diff cost | Same 3-choice curated pool. Token = fixed 1-token cost; Energy = escalating cost per forge. One reward pool, two cost models — unified content + history. | ✓ |
| Diff pools (Token=better) | Token rolls draw from a better/curated pool; Energy from baseline. Tokens buy rarity/quality. Needs two pool definitions. | |
| Energy roll + Token as modifier | Energy is the default path; Token is a reroll/boost currency, not a separate roll. Fewer code paths but differs from MOD-03's "spend a token on a forge roll". | |

**User's choice:** Same pool, diff cost
**Notes:** Keeps content + history unified. Token = fixed, Energy = escalating.

### Q3 — What drives the escalating Energy cost?

| Option | Description | Selected |
|--------|-------------|----------|
| Lifetime forgeCount curve | `base + forgeCount × step` (e.g. 50 + forgeCount×25). Permanently escalates with the never-resetting forgeCount. Tokens stay relevant forever. No new counter. | ✓ |
| Per-day resetting curve | Escalates within a session/day then resets. Avoids pricing out but needs a separate "rolls today" counter + reset rule. | |
| Flat Energy cost | Fixed cost per roll, no escalation. Simplest but removes the spine's "escalating cost" pressure. | |

**User's choice:** Lifetime forgeCount curve
**Notes:** Reuses the existing monotonic forgeCount (no new state/migration). "Energy prices out over a lifetime" is the intended pressure keeping Token rolls relevant.

---

## v1 Forge reward types

### Q1 — What are the v1 forge reward mechanics?

| Option | Description | Selected |
|--------|-------------|----------|
| Upgrade-only | Each forge grants +1 level to one of a Cell's starter modules. Makes dead ModuleInstance.level meaningful, needs NO new definitions, MOD-07 duplicate-install trivial. | ✓ |
| Upgrade + variant swaps | Upgrade-to-existing OR a small curated set of new variant ModuleDefinitions that swap into a slot. Richer but needs new content + replace/swap semantic. | |
| Slot enhancement | Forge enhances the slot itself (capacity/multiplier), not the module instance. Needs a new slot-state concept + migration. | |

**User's choice:** Upgrade-only
**Notes:** `ModuleInstance.level` becomes meaningful; no new definitions; MOD-07 trivial. Variant swaps deferred to the future `install_module` path.

### Q2 — Which modules get per-level effects, and how are they shaped?

| Option | Description | Selected |
|--------|-------------|----------|
| All 4 modules | Per-level effect per kind via a MODULE_LEVEL_BONUS content table. Each of the 4 simulation systems reads owning module level. Most complete. | ✓ |
| Generator + Bloom only | Only 2 modules get effects; Charge Core/Output stay level-0. Smaller blast radius but some rewards are duds. | |
| Uniform +pct for all | One formula regardless of kind. Simplest content but bland. | |

**User's choice:** All 4 modules
**Notes:** So no forge reward is ever a dud — reinforces "agency not gambling."

### Q3 — Is there a per-module level cap, and how do maxed modules interact with the reveal?

| Option | Description | Selected |
|--------|-------------|----------|
| Cap + filtered reveal | Per-module cap (e.g. 3). Reveal filters out maxed modules so choices are always useful. Installing-to-maxed = MOD-07 invalid slot state. | ✓ |
| Cap, but dead choices allowed | Reveal can still offer a maxed module as a dead choice. Simpler reveal but violates "agency not gambling." | |
| No cap | Unbounded levels; forgeCount Energy curve is the only brake. Simplest validation but numbers get extreme. | |

**User's choice:** Cap + filtered reveal
**Notes:** Choices always useful; clean MOD-07 "invalid slot state" rejection; fully-maxed Cell blocks forge for that Cell.

---

## Forge flow architecture

### Q1 — How should roll→reveal→choose be modeled as commands?

| Option | Description | Selected |
|--------|-------------|----------|
| Single atomic cmd + pure reveal | Reveal is a pure deterministic selector; ONE atomic run_forge command does pay + re-derive + validate chosen∈revealed + apply +level + increment forgeCount + append ONE history row. No pending state, no reload-mid-forge loss. | ✓ |
| Two-phase split (pending state) | run_forge pays+rolls+reveals into durable pending state; choose_forge_reward applies. Mirrors start/complete session but needs pending storage + migration + resume prompt. | |
| run_forge + install_module | run_forge rolls+reveals; reuse install_module for apply. But install_module installs a definitionId into a slot — doesn't fit upgrade-level semantics. | |

**User's choice:** Single atomic cmd + pure reveal
**Notes:** Avoids the reload-mid-forge data-loss problem and the extra migration; matches the atomic-command philosophy of all prior phases.

### Q2 — Is a forge roll scoped to one Cell, or can it span all Cells?

| Option | Description | Selected |
|--------|-------------|----------|
| Cell-scoped | Forge targets a specific Cell; reveal shows 3 options from THAT Cell's non-maxed modules. Coherent with upgrade-only + Cell Board. | |
| Cell-agnostic (cross-Cell) | Reveal draws 3 upgrade options from across ALL the user's Cells. More flexible; feels like a global forge. | ✓ |

**User's choice:** Cell-agnostic (cross-Cell)
**Notes:** A global forge — naturally points to a dedicated surface (bridges to UI surface area). `run_forge` carries `chosenReward: {cellId, moduleKind}`.

### Q3 — What does each ForgeHistoryRecord capture?

| Option | Description | Selected |
|--------|-------------|----------|
| Full row: all 3 offered + chosen | id, forgeCount, paymentType, paymentAmount, offeredChoices[3], chosenReward{cellId, moduleKind, fromLevel, toLevel}, createdAt. Satisfies MOD-05 literally. Dexie v3→v4 bump. | ✓ |
| Minimal row: chosen only | Omit the 2 unchosen options. Narrower record but doesn't satisfy MOD-05's "offered choices" literally. | |

**User's choice:** Full row: all 3 offered + chosen
**Notes:** Satisfies MOD-05 literally; enables future "what could have been" history view. Store is empty pre-Phase-5 so migration is low-risk.

### Q4 — What role does install_module play in v1?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove install_module | run_forge owns pay+reveal+apply. install_module removed from union/dispatcher/stub. Cleanest — no unused command. | |
| Keep as not_implemented stub | install_module stays in the union as a forge-specific not_implemented stub for a future variant-swap phase. run_forge owns v1 apply. | ✓ |
| Split: run_forge rolls, install_module applies | Two-step flow. Contradicts the single-atomic-command decision; re-introduces pending-state problems. | |

**User's choice:** Keep as not_implemented stub
**Notes:** Preserves the type hook for future variant swaps without leaving a v1 job half-done.

---

## Forge UI surface

### Q1 — Where does the Forge UI live?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /forge route | Peer to /, /cells/:id, /core. Matches gameplay-spine §19's 4-surfaces model. Room for the global cross-Cell reveal. | ✓ |
| Embedded in CorePanel | Forge inside /core since tokens/Energy/forgeCount are Core-scoped. Avoids a route but crams the global reveal in. | |
| Embedded in CellBoard | Forge entry per Cell. But contradicts the cross-Cell global reveal decision. | |

**User's choice:** Dedicated /forge route
**Notes:** Matches §19; suits the cross-Cell global forge. Home ReturnCues gains a tappable Forge chip.

### Q2 — How deep does module inspection (MOD-02) go, and where?

| Option | Description | Selected |
|--------|-------------|----------|
| Extend CellBoard tiles | Level badge + phase1Behavior text + active per-level effect. Reuses MODULE_LEVEL_BONUS. No new surface. | ✓ |
| Separate inspection panel | Tap tile → full panel/modal. Richer but risks the "modal blocks the Generator" anti-pattern. | |
| Level badge only | Just a badge. Lightest but doesn't satisfy MOD-02's "understand current behavior." | |

**User's choice:** Extend CellBoard tiles
**Notes:** Deepens existing surface; UI and simulation agree via the shared MODULE_LEVEL_BONUS table.

---

## Agent's Discretion

The following were not user-selected gray areas or were delegated:
- Exact content-tunable numbers (FORGE_ENERGY_BASE, FORGE_ENERGY_STEP, MODULE_MAX_LEVEL, MODULE_LEVEL_BONUS magnitudes) — mechanics locked, planner picks starter values.
- The 3-choice derivation / seeded RNG (deterministic from forgeCount; must filter maxed; handle <3-options edge).
- Validation issue codes for forge (reuse existing where they fit; add minimum new codes).
- `run_forge` command field shape (extended in place; chosenReward identifier choice).
- Economy/visual events for forge (minimum economy events for summary + history; visual events dropped per Phase 3 D-02).
- ForgeSummary contents + store wiring (mirrors lastCompletedSession/lastCompletedRejuvenation).
- Property tests (VER-02 extension for forge invariants).

## Deferred Ideas

- Variant ModuleDefinitions and module swaps (install_module future path; v2+ ADV-03).
- Forge rarity pools / improved-odds Token tiers (spine §9 "2/3 Tokens = better"; v2+ ADV-03).
- Fusion material / duplicate modules (ADV-03; upgrade-only sidesteps).
- Port upgrades, patch types, special sockets, rare Core modules, prestige fragments (rest of spine §9; ADV-01/02/04, LONG-01).
- Full PixiJS animation of forge events (Phase 6 UI-03).
- Energy sinks beyond Activation boost + forge rolls (Cell expansion, routes, Core Power — each its own phase).
- Forge reroll within one reveal (not needed in single-atomic model; could return for paid rerolls).
- Forge history/analytics view (D-09 records data; UI surface is Phase 6 UI-02 or later).
