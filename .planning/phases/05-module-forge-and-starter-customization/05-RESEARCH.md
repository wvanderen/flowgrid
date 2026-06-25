# Phase 5: Module Forge and Starter Customization - Research

**Researched:** 2026-06-25
**Domain:** Incremental-game economy command handler + atomic forge loop + Dexie schema bump + React route/summary (pure continuation of Phase 1–4 patterns)
**Confidence:** HIGH (code-contract verification; no new external dependencies)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Forge Cost Model**
- **D-01:** Two forge paths, one reward pool. Both a Token roll and an Energy roll are available from day 1, drawing from the SAME curated pool of upgrade rewards. Token = discrete agency, Energy = scalable grindable path.
- **D-02:** Token roll = fixed cost (1 Module Token); Energy roll = lifetime-escalating cost `FORGE_ENERGY_BASE + forgeCount × FORGE_ENERGY_STEP`. Curve driven by the EXISTING monotonic `CoreRecord.forgeCount` — no new counter, no new state, no per-day reset. `forgeCount` never resets (prestige rule).

**v1 Forge Reward Types**
- **D-03:** Upgrade-only rewards. Each forge grants `+1 level` to ONE of a Cell's existing starter modules (Generator, Charge Core, Output, or Bloom). Makes the currently-dead `ModuleInstance.level` field mechanically meaningful; needs NO new `ModuleDefinition` records; makes MOD-07 duplicate-install trivial. **IMPORTANT:** `ModuleInstance.level` is a DIFFERENT level from `CoreRecord.activationBoostLevel` (Phase 4 Energy-sink upgrade) — different records, must not be conflated.
- **D-04:** All four starter modules get per-level effects. A `MODULE_LEVEL_BONUS` content table in `src/content` (keyed by `ModuleDefinitionKind`) defines each module's per-level effect: Generator `+X% Current`, Charge Core `+Charge capacity`, Output `+route throughput %`, Bloom `+Activation/milestone bonus`. Each of the four simulation systems reads its owning module's `level`.
- **D-05:** Per-module level cap with filtered reveal. Each module caps at a small level (content constant, e.g. 3 — `MODULE_MAX_LEVEL`). The forge reveal FILTERS OUT maxed modules so the 3 choices are always useful. Installing/applying to a maxed module is the MOD-07 "invalid slot state" rejection. If ALL modules across ALL Cells are maxed, forge is blocked entirely (both roll controls disabled).

**Forge Flow Architecture**
- **D-06:** Single atomic `run_forge` command + a pure selector reveal. The reveal is a pure deterministic SELECTOR `forgeChoices(snapshot, cellIdScope?)` that computes 3 filtered non-maxed upgrade options using a seeded `Rng` derived from `forgeCount` (NO state change). Then ONE atomic `run_forge` command carries `{ paymentType, chosenReward: { cellId, moduleKind } }` and does ALL of: validate payment → re-derive the same 3 choices from `forgeCount` → validate `chosenReward ∈ revealedChoices` → apply `+1 level` → decrement payment → increment `forgeCount` → append ONE `ForgeHistoryRecord` → emit economy events. Single command, single operation, single history row. Deterministic replay holds because choices derive from the snapshot's `forgeCount`, not ambient RNG.
- **D-07:** Cross-Cell global reveal. The 3 revealed choices are drawn from across ALL the user's non-maxed modules. `chosenReward.cellId` identifies which Cell's module is upgraded. Global surface → gets its own route (D-09).
- **D-08:** `install_module` stays a forge-specific `not_implemented` stub. `run_forge` applies the upgrade atomically; `install_module` remains in the union/dispatcher as a stub reserved for a future variant-swap phase. NOT removed, NOT split off.
- **D-09:** `ForgeHistoryRecord` becomes a full row; Dexie v3→v4 schema bump. Each successful `run_forge` appends ONE row: `id` (= `operationId`, idempotent), `forgeCount`, `paymentType`, `paymentAmount`, `offeredChoices` (all 3), `chosenReward` (`{ cellId, moduleKind, fromLevel, toLevel }`), `createdAt`. Store is EMPTY pre-Phase-5 so migration is low-risk, but schema version must still bump. Export/import + Zod schemas must widen. `forgeHistory` remains append-only.

**Forge UI Surface**
- **D-10:** Dedicated `/forge` route. Peer to `/`, `/cells/:cellId`, `/core`. Shows current Tokens, current Energy + next Energy cost, "Roll with Token" + "Roll with Energy" controls (disabled when unaffordable), the 3 revealed choices (Cell + module kind + level change + per-level effect), pick-one, then inline `ForgeSummary`. Reveal persists until picked (re-rolling re-derives the same 3 from `forgeCount`).
- **D-11:** Inline `ForgeSummary`, mirroring SessionSummary / RejuvenationSummary. On success a `lastCompletedForge` store field captures the result. NOT a modal, NOT a toast. Persists until the next dispatch clears it.
- **D-12:** Home `ReturnCues` gains a tappable "Forge" chip. Accent-colored, navigates to `/forge`, shown whenever `core.moduleTokens > 0` OR `core.energy >= next forge cost`. Protected `open app → tap Cell → start session` flow stays unobstructed.

**Module Inspection (MOD-02)**
- **D-13:** Extend the existing Cell Board module tiles. The four starter module tiles show: a level badge ("Generator · Lv 2"), the module's `phase1Behavior` in plain text, and the active per-level effect derived from `MODULE_LEVEL_BONUS`. Uses normal semantic controls. Reuses the same `MODULE_LEVEL_BONUS` content table the simulation reads.

### the agent's Discretion

- **Exact content-tunable numbers** — `FORGE_ENERGY_BASE`, `FORGE_ENERGY_STEP`, `MODULE_MAX_LEVEL`, and the per-kind entries of `MODULE_LEVEL_BONUS`. Mechanics locked (D-02/D-04/D-05); planner picks starter values that feel fair alongside Phase 3/4 economy. All live as named constants in `src/content/formulas.ts` or a new `src/content/forge.ts`.
- **The 3-choice derivation / seeded RNG** — how `forgeChoices(snapshot)` deterministically picks 3 distinct non-maxed `{cellId, moduleKind}` options from `forgeCount`. Must be deterministic & replayable; must filter maxed modules (D-05); must handle the "fewer than 3 non-maxed options exist" edge. Command's `chosen ∈ revealed` validation uses the SAME derivation.
- **Validation issue codes for forge** — existing `ValidationIssue` code union. New forge rejections map to existing codes where they fit; add the minimum new codes (hand-maintained union). Mirrors Phase 4's reuse of `write_failure`.
- **`run_forge` command field shape** — exact naming/structure of `paymentType` and `chosenReward`. Command is EXTENDED in place (no durable data depends on the old stub shape); mirrors `LogRejuvenationCommand` extension in Phase 4.
- **Economy/visual events for forge** — new `ECONOMY_EVENT_NAMES` entries (e.g. `forgeCompleted`, `moduleUpgraded`) and optionally visual events. Visual events dropped/logged per Phase 3 D-02 (Phase 6 owns animation). Planner adds the minimum economy events.
- **`ForgeSummary` exact contents + store wiring** — mirrors `captureCompletedSession` / `captureCompletedRejuvenation` in `src/app/store/dispatch.ts`; planner adds `lastCompletedForge`.
- **Property tests (VER-02 extension)** — extend the Phase 1 invariant suite for forge: `forgeCount` monotonic, `moduleTokens` non-negative after token payment, `energy` non-negative after energy payment, `chosenReward ∈ revealedChoices`, module level never exceeds `MODULE_MAX_LEVEL`, idempotent replay by `operationId`.

### Deferred Ideas (OUT OF SCOPE)

- Variant `ModuleDefinition`s and module swaps (`install_module` real path) — v2+ (ADV-03).
- Forge rarity pools / improved-odds Token tiers — v2+ (ADV-03).
- Fusion material / duplicate modules — out of scope (ADV-03); upgrade-only sidesteps it.
- Port upgrades, patch types, special sockets, rare Core modules, prestige fragments — each its own future phase (ADV-01/02/04, LONG-01).
- Full PixiJS animation of forge — Phase 6 (UI-03); visual events may be emitted but are dropped/logged.
- Energy sinks beyond Activation boost + forge rolls — each its own future phase.
- Forge reroll — not needed in the single-atomic-command model.
- Forge history / analytics view — Phase 6 (UI-02) or later.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOD-02 | User can inspect starter modules and understand their current behavior through normal UI controls. | D-13 extends existing `ModuleTile` (`src/ui/cell-board/ModuleTile.tsx`) with level badge + `MODULE_LEVEL_BONUS`-derived effect. The `STARTER_TILES` spec in `CellBoard.tsx:29-50` is the edit site. `MODULE_LEVEL_BONUS` content table (D-04) is the shared source of truth for UI + simulation. |
| MOD-03 | User can spend a Module Token on a simple Module Forge roll that reveals three curated choices. | D-01/D-06: pure `forgeChoices(snapshot)` selector returns 3 non-maxed `{cellId, moduleKind}` options seeded from `forgeCount`. The Token roll control on `/forge` (D-10) calls the selector (no dispatch) to show the reveal. |
| MOD-04 | User can choose one Forge reward and persist it as an owned ModuleInstance, upgrade, or starter-slot enhancement. | D-03/D-06: the atomic `run_forge` command applies `+1 level` to the chosen `ModuleInstance` (the "upgrade" form — the only v1 form). `level` is the persistence target (`ModuleInstance.level`, `records.ts:95`). |
| MOD-05 | Forge history records payment, offered choices, chosen reward, timestamp, and monotonic forge count. | D-09 widens `ForgeHistoryRecord` (`records.ts:147-151`) to `{ id, forgeCount, paymentType, paymentAmount, offeredChoices, chosenReward, createdAt }` + Dexie v4 bump. `id` = `operationId` (idempotent). |
| MOD-06 | User can install or apply a v1 Forge reward into a curated starter slot without using a full patch editor. | D-03/D-06/D-08: the `+1 level` lands directly on the existing slot-occupying singleton (resolved via `slotId(cellId, kind)` convention, `starter-state.ts:50`). `install_module` stays a stub — `run_forge` IS the apply path. |
| MOD-07 | Duplicate module install, invalid owner Cell, and invalid slot states are rejected by validation. | D-03 (upgrade existing singleton → duplicate-install structurally impossible) + D-05 (maxed-target → "invalid slot state") + D-06 (chosen ∉ revealed → rejected). In-command validation returns structured `ValidationIssue[]`; existing `token_regression`/`forge_count_regression` invariants (`invariants.ts:221-225`) backstop the counters. VER-02 property tests extend. |
</phase_requirements>

## Summary

Phase 5 is a **pure continuation of established Phase 1–4 patterns** — it adds zero new external dependencies and introduces no new architectural concepts. The forge infrastructure is already scaffolded: `run_forge` and `install_module` command types exist as `not_implemented` stubs (`src/simulation/engine.ts:60-63, 67-88`); `ForgeHistoryRecord` and the `forgeHistory` Dexie store already exist (v1/v2/v3) with full diff/repository/export/import wiring; `moduleTokens`, `forgeCount`, and `energy` on `CoreRecord` are already guarded by monotonic invariants; the seeded `Rng` interface is in place. This phase replaces the `run_forge` stub with a real handler, widens the thin `ForgeHistoryRecord`, bumps the Dexie schema v3→v4, threads `ModuleInstance.level` (dead at `0` since Phase 1) into the four simulation systems, and adds a `/forge` route + `ForgeSummary` + a ReturnCues Forge chip + extended Cell Board tiles.

The new `run_forge` handler is a near-clone of `log_rejuvenation` (`src/simulation/commands/log-rejuvenation.ts`) — the same validate → derive-from-monotonic-counter → apply → emit-operation-and-economy-events → append-history-record → return shape, including the `rejectWith` helper and bounded derived-counter discipline. The migration is a near-clone of the v2→v3 `upgradeCoresV2ToV3` pattern (`database.ts:84-94, 155-168`) — extracted transform + full-store-set repetition + `.upgrade()` even on a (here empty) store. The UI is a near-clone of the `/core` route + `RejuvenationSummary` + `ReturnCues` chip pattern from Phase 4. Every downstream consumer (diff, repository idempotent-append, export/import, Zod schemas, store dispatch) picks up the widened record shape automatically with no logic change.

**Primary recommendation:** Implement `run_forge` as a single atomic command mirroring `log_rejuvenation`; implement `forgeChoices` as a pure selector seeded from `forgeCount` (NOT `env.rng`) so deterministic replay holds; bump Dexie to v4 repeating the full store set with a no-op-on-empty-store `.upgrade()`; and **resolve the D-04 per-level-effect ambiguity for Charge Core / Output / Bloom with the user before implementation** — only Generator's `+X% Current` maps cleanly onto existing systems; the other three reference concepts (capacity, throughput, activation bonus) that are not knobs in the current simulation and admit multiple valid interpretations.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Forge cost computation (`FORGE_ENERGY_BASE + forgeCount × STEP`) | Content (`src/content`) | — | Pure integer formula, content-tunable. Mirrors `nextIntegrationThreshold`/`activationBoostCost` — derived, never persisted. |
| Forge reveal (3 curated choices) | Simulation selector (pure read) | — | `forgeChoices(snapshot)` is a pure function over the snapshot; NO state change, NO `env.rng` (seed derived from `forgeCount` inside). UI calls it; command re-derives identically. |
| Forge payment + level application + history append | Simulation command (`run_forge`) | — | Atomic command owns all durable mutation. Mirrors `log_rejuvenation`. |
| Module-level effect reads (Generator/Charge Core/Output/Bloom) | Simulation systems + `complete_focus_session` | Content (`MODULE_LEVEL_BONUS`) | Each system reads owning module `level` and consults the shared content table. |
| Forge counter invariants (monotonicity, non-negativity, cap) | Domain invariants (`src/domain/invariants.ts`) | — | Already guards `forgeCount`/`moduleTokens`; phase adds the level-cap invariant. |
| Durable forge history persistence | Persistence (`forgeHistory` Dexie store, diff, repository) | — | Append-only; `id` = `operationId` idempotent. Schema v4 bump. |
| Forge route + reveal UI + summary | UI (`/forge` route, `ForgeSummary`) | App store (`lastCompletedForge`) | UI dispatches `run_forge`, reads selectors, never computes economy rules. |
| Forge-readiness surfacing | UI (`ReturnCues` Forge chip) | — | Read-only projection of `moduleTokens`/`energy` vs next cost; navigates to `/forge`. |
| Module inspection (level badge + effect) | UI (`ModuleTile` extension) | Content (`MODULE_LEVEL_BONUS`) | Read-only display reusing the same content table the simulation reads (UI ↔ sim agreement). |

## Standard Stack

This phase installs **no new packages**. It uses the already-locked Phase 1–4 stack exclusively. Verification of each tool's presence in the codebase: `[VERIFIED: codebase]`.

### Core (existing — phase consumes, does not add)
| Library | Version | Purpose in Phase 5 | Why Standard |
|---------|---------|--------------------|--------------|
| TypeScript | 5.x (strict) | All new code (`run_forge`, `forgeChoices`, `ForgeSummary`, etc.) | `[VERIFIED: codebase]` `tsconfig` strict; exhaustive dispatcher switch guarantees compile-time safety when extending `RunForgeCommand`. |
| React | 19.x | `/forge` route, `ForgeSummary`, `ReturnCues` chip, `ModuleTile` extension | `[VERIFIED: codebase]` `src/app/routes.tsx` uses `react-router` createBrowserRouter. |
| Zustand | 5.x | `lastCompletedForge` store field + pending-reveal projection | `[VERIFIED: codebase]` `src/app/store/flowgrid-store.ts` + `dispatch.ts`. |
| Dexie | 4.x | `version(4)` schema bump for widened `forgeHistory` | `[VERIFIED: codebase]` `src/persistence/database.ts:155-168` (v3 declaration). |
| Zod | 4.x | Widen `forgeHistorySchema` for import boundary | `[VERIFIED: codebase]` `src/persistence/validation-schemas.ts:112-116` + drift guard pattern. |
| fast-check | current | Extend VER-02 property suite for forge invariants | `[VERIFIED: codebase]` `tests/properties/economy-safety.property.test.ts`. |
| Radix UI / lucide-react / Tailwind 4 | current | `ForgeSummary` layout, Forge chip icon, accessible controls | `[VERIFIED: codebase]` used throughout `src/ui/`. |

### Installation
```bash
# No new packages. Existing node_modules covers everything.
```

**Version verification:** Not applicable — no new packages. All referenced libraries confirmed present in the existing `package.json` and imported throughout `src/`. `[VERIFIED: codebase]`

## Package Legitimacy Audit

> **N/A — this phase installs zero external packages.** Phase 5 is a pure-internal continuation: new code lives entirely in `src/simulation/commands/`, `src/content/`, `src/domain/`, `src/persistence/`, `src/ui/`, and `tests/`. The Package Legitimacy Gate protocol (Steps 1–3) is skipped because there are no packages to audit. No `npm install` of any new dependency is required or recommended.

## Architecture Patterns

### System Architecture Diagram

The forge loop traces a single primary use case from input to output:

```
User on /forge
   │
   ▼
[1] /forge route reads snapshot: core.moduleTokens, core.energy, core.forgeCount
   │
   ▼
[2] forgeChoices(snapshot)  ◄── PURE SELECTOR (read-only, no dispatch)
   │  seed = createRng(`forge:${snapshot.core.forgeCount}`)   ◄── derived from snapshot, NOT env.rng
   │  collect non-maxed {cellId, moduleKind} across ALL active Cells
   │  pick 3 distinct (or fewer if pool < 3) via seeded partial Fisher-Yates
   │  return readonly ForgeChoice[]   ◄── NO state change
   ▼
[3] UI renders 3 choices (Cell + kind + fromLevel→toLevel + MODULE_LEVEL_BONUS effect)
   │
   │  User taps "Roll with Token" or "Roll with Energy", then picks one choice
   ▼
[4] dispatch(run_forge { operationId, paymentType, chosenReward: {cellId, moduleKind} })
   │
   ▼
[5] run_forge handler (src/simulation/commands/run-forge.ts):
   │   a. validate payment affordability (token≥1 OR energy≥nextCost) → reject with negative_resource if not
   │   b. RE-DERIVE forgeChoices(snapshot) from snapshot.core.forgeCount  ◄── TOCTOU defense
   │   c. validate chosenReward ∈ re-derived choices → reject with invalid_reference if not
   │   d. resolve target ModuleInstance via slotId(cellId, kind) convention
   │   e. validate target.level < MODULE_MAX_LEVEL → reject with slot_at_capacity if maxed
   │   f. apply: ModuleInstance.level += 1; decrement payment; forgeCount += 1
   │   g. append ONE ForgeHistoryRecord (id = operationId)
   │   h. emit SyncOperation + economy events (forgeCompleted, moduleUpgraded)
   │   i. return SimulationResult{ status:'applied', ... }
   ▼
[6] dispatch → repository.applyResult → diffFlowgridSnapshots detects:
   │     corePut (changed CoreRecord), moduleInstancePuts (changed level), appendForgeHistory, appendOperations
   │   → idempotent upsert/append in ONE Dexie transaction
   ▼
[7] store.setState: snapshot=nextState, lastCompletedForge=appended record, lastError/lastRejection=null
   │
   ▼
[8] /forge renders ForgeSummary from lastCompletedForge (persists until next dispatch)
```

Decision points: `[2]` is a pure read (no branching of durable state); `[5a/c/e]` are the three rejection branches (payment / chosen-not-in-revealed / slot-at-capacity); `[5]` is atomic — all of b–i succeed or none do.

### Recommended Project Structure

New/modified files (no new top-level directories):

```
src/
├── content/
│   ├── formulas.ts          # MODIFY: add FORGE_ENERGY_BASE, FORGE_ENERGY_STEP, MODULE_MAX_LEVEL
│   └── forge.ts             # NEW (recommended): MODULE_LEVEL_BONUS table + forgeEnergyCost(level) + moduleLevelBonus(kind, level)
├── domain/
│   ├── records.ts           # MODIFY: widen ForgeHistoryRecord (D-09)
│   ├── result.ts            # MODIFY: extend RunForgeCommand (D-06); add forge ECONOMY_EVENT_NAMES
│   ├── ids.ts               # MODIFY: add ForgeChoice helper type if desired (no new EntityType)
│   └── validation.ts        # MODIFY: add 'slot_at_capacity' code (recommended minimum)
├── simulation/
│   ├── engine.ts            # MODIFY: route run_forge to real handler; keep install_module stub
│   ├── commands/
│   │   ├── run-forge.ts     # NEW: the atomic handler (mirror log-rejuvenation.ts)
│   │   └── forge-choices.ts # NEW (recommended): pure forgeChoices(snapshot) selector
│   ├── systems/
│   │   ├── core-allocation.ts  # MODIFY (D-04 Charge Core) — see Open Questions
│   │   ├── routes.ts           # MODIFY (D-04 Output) — see Open Questions
│   │   └── bloom.ts            # MODIFY (D-04 Bloom) — see Open Questions
│   ├── commands/complete-focus-session.ts  # MODIFY (D-04 Generator — clear: thread level like activationBonusPercent)
│   ├── economy-events.ts    # MODIFY: add forgeCompletedEvent, moduleUpgradedEvent
│   └── selectors.ts         # MODIFY or keep forge-choices separate
├── persistence/
│   ├── database.ts          # MODIFY: version(4) repeating full store set + .upgrade()
│   ├── validation-schemas.ts# MODIFY: widen forgeHistorySchema + drift guard
│   ├── export-json.ts       # MODIFY: widen archive envelope if needed (forgeHistory already in archive)
│   └── import.ts            # MODIFY: ensure widened shape merges (idempotentMergeUpsert already handles)
├── app/
│   ├── store/
│   │   ├── flowgrid-store.ts# MODIFY: add lastCompletedForge field
│   │   └── dispatch.ts      # MODIFY: add captureCompletedForge
│   └── routes.tsx           # MODIFY: add /forge route
└── ui/
    ├── forge-panel/         # NEW directory: ForgePanel.tsx (route) + ForgeSummary.tsx + ForgeChoiceList.tsx
    ├── flowgrid-home/ReturnCues.tsx  # MODIFY: add Forge chip (D-12)
    └── cell-board/
        ├── CellBoard.tsx    # MODIFY: pass level + effect to ModuleTile (D-13)
        └── ModuleTile.tsx   # MODIFY: add level badge + per-level effect display

tests/
├── simulation/commands/run-forge.test.ts          # NEW: handler unit tests
├── simulation/commands/forge-choices.test.ts      # NEW: selector determinism + filtering
├── properties/forge-safety.property.test.ts       # NEW (recommended): VER-02 forge invariants
└── persistence/database.migration.test.ts         # MODIFY: add v3→v4 fixture
```

### Pattern 1: Atomic command with derived-from-monotonic-counter reveal
**What:** One command does all validation + mutation + history + events; a separate pure selector computes the "what could happen" preview from a monotonic counter already in the snapshot.
**When to use:** Anytime a user picks from a deterministically-derived set (forge rolls, threshold grants). Avoids pending-state records and reload-mid-flow data loss.
**Example:** `[VERIFIED: codebase — src/simulation/commands/log-rejuvenation.ts:104-113`] (threshold-grant loop derives from monotonic `moduleTokens`; `nextIntegrationThreshold` is the pure derivation). Phase 5 mirrors this: `forgeChoices` derives from monotonic `forgeCount`.

```typescript
// Source: [VERIFIED: codebase pattern] src/simulation/commands/log-rejuvenation.ts + src/content/formulas.ts:61
// The pure derivation (content layer — never persists a "next" value):
export function nextIntegrationThreshold(moduleTokens: number): number {
  let threshold = INTEGRATION_THRESHOLD_BASE;
  for (let i = 0; i < moduleTokens; i++) {
    threshold = Math.floor(threshold * INTEGRATION_THRESHOLD_RATIO);
  }
  return threshold;
}
// The handler RE-DERIVES inside the command (no trust of caller-supplied "threshold"):
while (newIntegration >= nextIntegrationThreshold(moduleTokens)) {
  moduleTokens += 1;
}
```

### Pattern 2: Dexie additive schema bump with extracted transform
**What:** `version(N).stores({...full set...}).upgrade(async (tx) => { await tx.table('x').toCollection().modify(transform); })`. The full store set is repeated verbatim (Dexie requirement). The transform is extracted/exported so the migration harness can exercise it without a live IndexedDB.
**When to use:** Any record-shape change. Even when the store is empty, the version must bump and the full store set must repeat.
**Example:** `[VERIFIED: codebase — src/persistence/database.ts:84-94, 155-168`]

### Pattern 3: Inline summary via store field (not modal, not toast)
**What:** On a successful command, `captureCompletedX(command, result)` extracts the appended record into a `lastCompletedX` store field; the route renders `XSummary` from it while the field is non-null; the next dispatch clears it.
**When to use:** Any "moment of completion" the user should dwell on. Modals are rejected because they obstruct the protected Generator flow.
**Example:** `[VERIFIED: codebase — src/app/store/dispatch.ts:106-117, 139-148`] + `src/ui/core-panel/RejuvenationSummary.tsx`.

### Pattern 4: ReturnCues contextual stat-chip rail
**What:** Read-only projection of economy state into tappable navigation chips; renders nothing when no actionable state; neutral, forgiving framing.
**When to use:** Surfacing "you can do something now" without nagging.
**Example:** `[VERIFIED: codebase — src/ui/flowgrid-home/ReturnCues.tsx:32-48`] (the near-Bloom chip navigates; D-12's Forge chip follows identically).

### Anti-Patterns to Avoid
- **Conflating `ModuleInstance.level` with `CoreRecord.activationBoostLevel`.** `[CITED: 05-CONTEXT.md D-03]` D-03 explicitly warns these are different records. Generator/Bloom per-level bonuses must NOT touch `activationBoostLevel`, and Bloom's bonus must NOT feed back into `activationBonusPercent` (which is `activationBoostLevel`-derived, `formulas.ts:79-81`).
- **Using `env.rng` for the forge reveal.** `[CITED: 05-CONTEXT.md D-06]` Deterministic replay (Phase 1 D-08) requires the seed be a pure function of the snapshot (`forgeCount`), never the ambient injected RNG. The `Rng` for the derivation must be constructed INSIDE `forgeChoices` via `createRng(\`forge:${forgeCount}\`)`.
- **Trusting the UI's claim about what was revealed.** `[CITED: 05-CONTEXT.md D-06]` The `run_forge` handler MUST re-derive `forgeChoices(snapshot)` and validate `chosenReward ∈` that set — TOCTOU: another forge may have landed between reveal and commit, changing `forgeCount` and thus the derived set.
- **Pending-state records / two-phase forge.** `[CITED: 05-CONTEXT.md D-06]` Rejected specifically to avoid reload-mid-forge data loss and an extra migration.
- **Persisting a "next forge cost" or "next revealed choices" field.** `[VERIFIED: codebase pattern — formulas.ts:52-67`] Derive always from the monotonic counter; never persist a derivable value (it can drift).
- **A modal ForgeSummary.** `[CITED: 05-CONTEXT.md D-11]` Obstructs the Generator. Use the inline-panel pattern.
- **Confusing `ModuleDefinitionKind` (underscore) with slot suffix (hyphen).** `[VERIFIED: codebase]` Kind is `'charge_core'` (`starter-modules.ts:28`); slot suffix is `'charge-core'` (`starter-state.ts:71`). `chosenReward.moduleKind` uses the kind (underscore) for `MODULE_LEVEL_BONUS` lookup; instance resolution uses `getStarterModuleDefinitionByKind(kind).id` then `findModuleInstanceForCell`.
- **Adding a typed `core!` Table property in Dexie.** `[VERIFIED: codebase — database.ts:99-102`] `core` collides with Dexie's built-in `DBCore`; access via `db.table<CoreRecord>('core')`. (Phase 5 does not change this, but the planner must not "fix" it.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Forge-cost derivation | A persisted `nextForgeCost` field | `forgeEnergyCost(forgeCount)` pure function in `src/content` | `[VERIFIED: codebase pattern]` Mirrors `activationBoostCost`/`nextIntegrationThreshold`. Derivable values must not persist (drift risk). |
| Forge-choice randomness | `Math.random()` or `env.rng` | `createRng(\`forge:${forgeCount}\`)` inside `forgeChoices` | `[CITED: 05-CONTEXT.md D-06]` + `[VERIFIED: codebase — app/rng.ts]` Deterministic replay; `Math.random()` breaks replay tests. |
| Changed-record detection in persistence | A manifest of "what the forge changed" | `diffFlowgridSnapshots(prev, next)` (existing) | `[VERIFIED: codebase — persistence/diff.ts:90-139`] The diff already detects corePut/moduleInstancePuts/appendForgeHistory automatically once the record shape widens. |
| Append-only forge-row idempotency | Custom dedup logic | `idempotentAppend` + `diffAppend` (existing) + `id = operationId` | `[VERIFIED: codebase — diff.ts:100`] Replays are idempotent by construction. |
| Forge-history import validation | Hand-rolled shape checks | Widen `forgeHistorySchema` (Zod) + drift guard | `[VERIFIED: codebase — validation-schemas.ts:112-116, 174-183`] Zod is the single import-boundary validator; the `satisfies` drift guard surfaces shape divergence at compile time. |
| Migration transform testability | Inline upgrade function | Extract `upgradeForgeHistoryV3ToV4` (exported, pure) | `[VERIFIED: codebase pattern — database.ts:56-66, 84-94`] Lets the migration harness run against a fixture without IndexedDB. |
| Inline completion UI | A modal / toast / portal | `ForgeSummary` inline panel + `lastCompletedForge` store field | `[CITED: 05-CONTEXT.md D-11]` + `[VERIFIED: codebase — RejuvenationSummary.tsx`] Modal obstructs the Generator. |
| Accessible forge controls | Custom div-based buttons | Radix primitives + semantic `<button>` + `aria-live` | `[VERIFIED: codebase — ReturnCues.tsx:56, RejuvenationSummary.tsx:36-39`] Existing accessibility pattern. |

**Key insight:** The only genuinely new logic in this phase is (a) the `forgeChoices` selection algorithm, (b) the per-level-effect reads in the four systems, and (c) the `MODULE_LEVEL_BONUS` content numbers. Everything else — atomic command shape, migration, persistence diff, summary wiring, route, chip — is a near-clone of an existing Phase 1–4 artifact. Resist the urge to invent new patterns.

## Common Pitfalls

### Pitfall 1: D-04 per-level effects for Charge Core / Output / Bloom don't map onto existing system knobs
**What goes wrong:** D-04 specifies "Charge Core `+Charge capacity`", "Output `+route throughput %`", "Bloom `+Activation/milestone bonus`" — but the current simulation systems have NO capacity field (Cell.charge and Core.coreCharge are unbounded `IntNonNegative` accumulators), NO throughput concept beyond `allocationPercent` (which is capped at a 100 sum), and Bloom's Activation bonus is ALREADY owned by `CoreRecord.activationBoostLevel` via `activationBonusPercent()` (`formulas.ts:79-81`). Only Generator's `+X% Current` maps cleanly (mirror `activationBonusPercent` in `complete-focus-session.ts:163-166`).
**Why it happens:** D-04 locks the MECHANIC ("each module gets a per-level effect read by its system") but the EXACT interpretation of three of the four effects is genuinely underspecified relative to the current model. `[CITED: 05-CONTEXT.md D-04]` + `[VERIFIED: codebase — systems/core-allocation.ts, routes.ts, bloom.ts]`
**How to avoid:** **Resolve with the user (or pick + document) before implementation.** Recommended least-invasive interpretations that add NO new model fields and NO new invariants:
- Charge Core level → boosts the **store-side effective rate** in `applyCoreAllocation`/`splitCoreCurrent` (more Charge per routed Current), NOT a hard cap. `[ASSUMED]`
- Output level → boosts the **routed amount** in `routeCurrentThroughRoutes` (multiply routed by `(100 + level×bonus)/100`), NOT raising the allocation cap above 100. `[ASSUMED]`
- Bloom level → grants **more activation/momentum per Bloom** in `applyBloom` (e.g. `+1 + level` instead of `+1`), NOT feeding back into `activationBonusPercent` (that would conflate with `activationBoostLevel`, violating D-03). `[ASSUMED]`
**Warning signs:** A plan that introduces a `chargeCapacity` field, raises the route-allocation cap, or modifies `activationBonusPercent` to take Bloom level — each violates an existing invariant or conflates two levels.

### Pitfall 2: Forge reveal non-determinism (using `env.rng` or ambient state)
**What goes wrong:** The reveal shows different choices on re-entry, or the command's re-derivation disagrees with what the UI showed, or replay tests fail.
**Why it happens:** `env.rng` is consumed-and-advanced across dispatches; its stream depends on call order. `[VERIFIED: codebase — app/rng.ts (buffered, consumed)]`
**How to avoid:** `forgeChoices` constructs its OWN `Rng` via `createRng(\`forge:${snapshot.core.forgeCount}\`)` and uses that exclusively. Never read `env.rng` in the selector or derive the seed from anything but the snapshot. The command re-derives identically from `snapshot.core.forgeCount`. `[CITED: 05-CONTEXT.md D-06]`
**Warning signs:** `forgeChoices` taking `env` as a parameter; `run_forge` reading `env.rng`.

### Pitfall 3: TOCTOU — trusting the UI's "revealed choices" claim
**What goes wrong:** A user reveals choices, then another forge (or a day-rollover, or a second tab) lands, changing `forgeCount`/module levels; the user's stale "pick" references a choice no longer in the derived set.
**Why it happens:** The reveal is a pure read with no durable reservation. `[CITED: 05-CONTEXT.md D-06]`
**How to avoid:** The handler re-derives `forgeChoices(snapshot)` from the CURRENT snapshot and validates `chosenReward ∈` that set; reject with `invalid_reference` if not. The `forgeCount` increment happens inside the same atomic command, so concurrent forges serialize through the dispatch single-mutation path. `[VERIFIED: codebase — dispatch.ts:67-120 single mutation path]`
**Warning signs:** The handler comparing `chosenReward` to a `revealedChoices` field passed IN the command (that would let a crafted command pick anything).

### Pitfall 4: Integer-discipline slip on the Energy cost curve or level bonus
**What goes wrong:** Floats leak into durable economy values; replay drift; negative resources.
**Why it happens:** `forgeCount × FORGE_ENERGY_STEP` is integer-safe, but a percentage bonus like `+10%/level` invites `(base * 1.1)` float math.
**How to avoid:** All bonuses use **multiply-then-floor**: `base + Math.floor((base * level * BONUS_PERCENT) / 100)` — exactly the `activationBonusPercent` discipline (`complete-focus-session.ts:164-166`). `[VERIFIED: codebase pattern]`
**Warning signs:** Any `* 1.x` float multiplier; any `Math.round` (use `Math.floor`).

### Pitfall 5: Forgetting the Dexie full-store-set repetition + `.upgrade()` on the v4 bump
**What goes wrong:** Dexie throws "Version declaration missing stores" or the upgrade silently no-ops incorrectly.
**Why it happens:** Dexie requires `version(N).stores({...})` to repeat the FULL store set, not a delta. `[VERIFIED: codebase — database.ts:130-131, 152-153 comments]`
**How to avoid:** Copy the entire v3 store object verbatim into `version(4).stores({...})`; include `.upgrade(async (tx) => { ... })` even though the store is empty pre-Phase-5 (mirrors v2/v3 always including `.upgrade`). The transform (`upgradeForgeHistoryV3ToV4`) is a no-op on absent fields but MUST exist for the harness. `[CITED: 05-CONTEXT.md D-09]`
**Warning signs:** A `version(4)` declaration with only `forgeHistory` in the store map.

### Pitfall 6: ForgeHistory drift between Zod schema and domain record
**What goes wrong:** Import silently accepts (or rejects) the wrong shape; the `satisfies` drift guard fails to compile.
**Why it happens:** The domain `ForgeHistoryRecord` widens (D-09) but the Zod `forgeHistorySchema` isn't updated in lockstep.
**How to avoid:** Update `forgeHistorySchema` (`validation-schemas.ts:112-116`) field-for-field with the new domain shape AND add/extend the `satisfies` drift guard at the bottom of the file (the existing guard covers session/rejuvenation/operation; add forge). `[VERIFIED: codebase — validation-schemas.ts:174-183]`
**Warning signs:** A widening of `records.ts` ForgeHistoryRecord with no corresponding `validation-schemas.ts` edit.

### Pitfall 7: Blocking the protected core interaction with the Forge chip
**What goes wrong:** The `open app → tap Cell → start session` flow is impeded.
**Why it happens:** The Forge chip is too prominent or mounts inline in the Cell-start path.
**How to avoid:** The chip lives in the `ReturnCues` rail (sits ABOVE the canvas, `ReturnCues.tsx:56`) and renders only when forge-readiness is true. It navigates to `/forge`; it does not intercept the Cell tap. `[CITED: 05-CONTEXT.md D-12]` + `[VERIFIED: codebase — ReturnCues.tsx placement]`
**Warning signs:** The chip rendering inside the CellBoard or the GeneratorTile.

### Pitfall 8: "Fewer than 3 non-maxed choices" edge mishandled
**What goes wrong:** The reveal returns undefined/throws, or the UI shows a broken 3rd slot, or a roll is allowed when no valid choices exist.
**Why it happens:** Late-game, many modules are maxed; the pool can be 0, 1, or 2.
**How to avoid:** `forgeChoices` returns `min(3, poolSize)` choices; if `poolSize === 0`, the `/forge` route disables BOTH roll controls with an explanatory message (D-05). The handler's "chosen ∈ revealed" validation naturally rejects any pick when the pool is empty. `[CITED: 05-CONTEXT.md D-05]`
**Warning signs:** The selector asserting exactly 3 outputs; the UI not handling a 0-choice state.

## Code Examples

### The `run_forge` handler skeleton (mirrors `log_rejuvenation`)
`[VERIFIED: codebase pattern — src/simulation/commands/log-rejuvenation.ts]`

```typescript
// Source: [VERIFIED: codebase pattern] log-rejuvenation.ts + D-06/D-09 contract
// Plausible shape — planner finalizes exact field names (Agent's Discretion).
export function runForge(
  previousState: FlowgridSnapshot,
  command: RunForgeCommand,        // { type, operationId, paymentType, chosenReward }
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];
  const prevCore = previousState.core;

  // (a) Payment affordability
  const energyCost = forgeEnergyCost(prevCore.forgeCount); // pure: BASE + forgeCount*STEP
  if (command.paymentType === 'token' && prevCore.moduleTokens < 1) {
    issues.push({ code: 'negative_resource', severity: 'error', entityType: 'core',
      entityId: prevCore.id, message: 'run_forge: insufficient Module Tokens.', path: 'core.moduleTokens' });
  }
  if (command.paymentType === 'energy' && prevCore.energy < energyCost) {
    issues.push({ code: 'negative_resource', severity: 'error', entityType: 'core',
      entityId: prevCore.id, message: `run_forge: requires ${energyCost} Energy.`, path: 'core.energy' });
  }

  // (b) RE-DERIVE choices from snapshot.forgeCount (TOCTOU defense — NOT env.rng)
  const revealed = forgeChoices(previousState);

  // (c) chosen ∈ revealed
  const chosen = revealed.find(r => r.cellId === command.chosenReward.cellId
                                  && r.moduleKind === command.chosenReward.moduleKind);
  if (chosen === undefined) {
    issues.push({ code: 'invalid_reference', severity: 'error', entityType: 'forge_history',
      entityId: command.operationId, message: 'run_forge: chosen reward not in revealed set.', path: 'command.chosenReward' });
  }
  if (issues.length > 0) return rejectWith(previousState, issues);

  // (d)(e) Resolve target instance + cap check (chosen is defined here)
  const target = findModuleInstanceForCell(previousState, chosen!.cellId, chosen!.moduleKind)!;
  if (target.level >= MODULE_MAX_LEVEL) {
    return rejectWith(previousState, [{ code: 'slot_at_capacity', severity: 'error',
      entityType: 'module_instance', entityId: target.id,
      message: `run_forge: ${chosen!.moduleKind} already at max level.`, path: 'moduleInstance.level' }]);
  }

  // (f) Apply: level + 1, decrement payment, forgeCount + 1
  const updatedInstance: ModuleInstance = { ...target, level: target.level + 1, updatedAt: env.now };
  const moduleInstances = new Map(previousState.moduleInstances);
  moduleInstances.set(updatedInstance.id, updatedInstance);
  const newCore: CoreRecord = {
    ...prevCore,
    moduleTokens: command.paymentType === 'token' ? prevCore.moduleTokens - 1 : prevCore.moduleTokens,
    energy: command.paymentType === 'energy' ? prevCore.energy - energyCost : prevCore.energy,
    forgeCount: prevCore.forgeCount + 1,
    updatedAt: env.now,
  };

  // (g) Append ONE history row (id = operationId → idempotent)
  const record: ForgeHistoryRecord = {
    id: command.operationId,
    forgeCount: newCore.forgeCount,
    paymentType: command.paymentType,
    paymentAmount: command.paymentType === 'token' ? 1 : energyCost,
    offeredChoices: revealed,
    chosenReward: { cellId: chosen!.cellId, moduleKind: chosen!.moduleKind,
                    fromLevel: target.level, toLevel: target.level + 1 },
    createdAt: env.now,
  };

  // (h) Operation + economy events (forgeCompleted, moduleUpgraded)
  const operation = operationFromCommand(command, env.now, { entityId: prevCore.id, payload: { ... } });

  const nextState: FlowgridSnapshot = {
    ...previousState, core: newCore, moduleInstances,
    forgeHistory: [...previousState.forgeHistory, record],
    operations: [...previousState.operations, operation],
    client: { ...previousState.client, updatedAt: env.now },
  };
  return { status: 'applied', previousState, nextState,
    economyEvents: [forgeCompletedEvent(...), moduleUpgradedEvent(...)],
    visualEvents: [], operations: [operation], validationIssues: [] };
}
```

### The pure `forgeChoices` selector
`[CITED: 05-CONTEXT.md D-06/D-07]` + `[VERIFIED: codebase — app/rng.ts createRng]`

```typescript
// Source: [CITED: 05-CONTEXT.md D-06/D-07] + [VERIFIED: codebase app/rng.ts]
// Pure: same snapshot → same choices. Seed derived from forgeCount, NOT env.
export function forgeChoices(snapshot: FlowgridSnapshot): readonly ForgeChoice[] {
  // Collect non-maxed {cellId, moduleKind} across ALL active (non-archived) Cells.
  const pool: ForgeChoice[] = [];
  for (const cell of snapshot.cells.values()) {
    if (cell.archivedAt !== null) continue;
    for (const kind of MODULE_KINDS) {
      const inst = findModuleInstanceForCell(snapshot, cell.id, kind);
      if (inst && inst.level < MODULE_MAX_LEVEL) {
        pool.push({ cellId: cell.id, moduleKind: kind });
      }
    }
  }
  if (pool.length <= 3) return pool; // D-05 edge: fewer than 3 available
  // Deterministic partial Fisher-Yates seeded from forgeCount.
  const rng = createRng(`forge:${snapshot.core.forgeCount}`);
  const indices = pool.map((_, i) => i);
  for (let n = 0; n < 3; n++) {
    const [pick, next] = rng.nextInt(n, indices.length - 1);
    [indices[n], indices[pick]] = [indices[pick], indices[n]];
    // (advance rng for next iteration — nextInt returns [value, nextRng])
    rng = next; // NOTE: createRng returns an immutable Rng; reassign in a let
  }
  return indices.slice(0, 3).map((i) => pool[i]);
}
```
**Note for planner:** `createRng` returns an immutable `Rng` whose `nextInt` returns `[value, nextRng]` (`app/rng.ts:49-61`). The selector must thread `next` through the loop (use a `let rng`). This keeps the derivation pure and replayable.

### The Dexie v3→v4 migration
`[VERIFIED: codebase pattern — database.ts:84-94, 155-168]`

```typescript
// Source: [VERIFIED: codebase pattern] database.ts v2→v3 + [CITED: 05-CONTEXT.md D-09]
// Phase 5 / D-09: v4 widens ForgeHistoryRecord. Store is empty pre-Phase-5 (the
// run_forge stub never wrote rows), so the transform is field-additive on absent
// fields — but the version MUST bump and the full store set MUST repeat.
export function upgradeForgeHistoryV3ToV4(
  row: Record<string, unknown>,
): Record<string, unknown> {
  // No-op on empty store; future-proof for any partial row.
  if (row.paymentType === undefined) row.paymentType = 'token';      // sentinel default
  if (row.paymentAmount === undefined) row.paymentAmount = 0;
  if (row.offeredChoices === undefined) row.offeredChoices = [];
  if (row.chosenReward === undefined) row.chosenReward = null;
  return row;
}
// ...in constructor:
this.version(4).stores({
  client: 'id', cells: 'id', core: 'id',
  moduleInstances: 'id, ownerCellId',
  routes: 'id, sourceCellId',
  sessions: 'id, cellId, startedAt',
  operations: 'id, status, createdAt',
  settings: 'id',
  forgeHistory: 'id, createdAt',   // indexes unchanged (D-09 adds fields, not indexes)
  rejuvenations: 'id, createdAt',
}).upgrade(async (tx) => {
  await tx.table('forgeHistory').toCollection().modify(upgradeForgeHistoryV3ToV4);
});
```
**Index note:** `[VERIFIED: codebase — database.ts:124 forgeHistory: 'id, createdAt'`] No new index is required for Phase 5 queries (the `/forge` route reads the whole `core` + iterates `moduleInstances`; history is append-only and not queried by anything new in v1). Keep indexes identical to avoid a more invasive upgrade.

### The `captureCompletedForge` store wiring
`[VERIFIED: codebase — dispatch.ts:106-117, 139-148]`

```typescript
// Source: [VERIFIED: codebase pattern] captureCompletedRejuvenation
function captureCompletedForge(
  command: SimulationCommand,
  result: SimulationResult,
): ForgeHistoryRecord | undefined {
  if (command.type !== 'run_forge') return undefined;
  const rows = result.nextState.forgeHistory;
  const matched = rows.find((r) => r.id === command.operationId);
  if (matched !== undefined) return matched;
  return rows[rows.length - 1];
}
// ...in dispatch(): add alongside lastCompletedSession/lastCompletedRejuvenation
const lastCompletedForge = captureCompletedForge(command, result);
// ...spread into setState with the same undefined-guard pattern.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 1 `run_forge`/`install_module` typed stubs returning `not_implemented` | Real `run_forge` handler; `install_module` remains a stub | Phase 5 | The exhaustive dispatcher switch (`engine.ts:35-64`) routes `run_forge` to the new handler with no union change beyond the in-place `RunForgeCommand` extension. `[VERIFIED: codebase — engine.ts:60-63]` |
| Phase 1 thin `ForgeHistoryRecord { id, forgeCount, createdAt }` | Full row with payment/offered/chosen (D-09) | Phase 5 | Satisfies MOD-05 literally ("offered choices" plural); enables future history view (deferred). `[VERIFIED: codebase — records.ts:147-151]` |
| `ModuleInstance.level` dead at `0` since Phase 1 | Mechanically meaningful (forge target; read by 4 systems) | Phase 5 | No new model field; the existing `level` becomes the upgrade axis. `[VERIFIED: codebase — records.ts:95, starter-state.ts:131/143/155/167]` |
| Phase 4 `lastCompletedRejuvenation` store field | Phase 5 adds `lastCompletedForge` (parallel) | Phase 5 | Same inline-summary pattern; no new store concept. `[VERIFIED: codebase — dispatch.ts:107, 139-148]` |

**Deprecated/outdated this phase:**
- `runForgeNotImplemented` helper (`engine.ts:67-77`) — replaced by the real handler import.
- The Phase 1 `run_forge is not implemented until Phase 5` message string.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Charge Core per-level effect = boost store-side effective rate (NOT a hard capacity cap) | D-04 / Pitfall 1 | A `chargeCapacity` model change would be far more invasive (new field, new invariant, backward-compat migration) and would conflict with the "uncapped accumulator" model used since Phase 1. **Must confirm with user.** |
| A2 | Output per-level effect = boost routed amount beyond allocation (NOT raising the 100-sum cap) | D-04 / Pitfall 1 | Raising the cap would break `validateRouteAllocations` (`invariants.ts:185-189`) and the allocation-normalization invariant. **Must confirm with user.** |
| A3 | Bloom per-level effect = more activation/momentum per Bloom (NOT feeding `activationBonusPercent`) | D-04 / Pitfall 1 | Feeding `activationBonusPercent` from Bloom level would conflate with `activationBoostLevel` — explicitly forbidden by D-03. **Must confirm with user.** |
| A4 | `FORGE_ENERGY_BASE = 50`, `FORGE_ENERGY_STEP = 25`, `MODULE_MAX_LEVEL = 3` | Discretion | Content-tunable; wrong values only affect game balance, not correctness. Planner picks; user can adjust. |
| A5 | Per-level magnitudes: Generator +10%/level, Charge Core +10% store rate/level, Output +10% throughput/level, Bloom +1 activation/level | Discretion | Content-tunable; aligns with Phase 4's +5%/level boost and D-15's 10% base. |
| A6 | New validation code `slot_at_capacity` is the minimum addition; insufficient-payment reuses `negative_resource`; chosen-not-in-revealed reuses `invalid_reference` | Discretion | If the user prefers dedicated codes (`insufficient_payment`, `no_forge_choices_available`), the union just grows — cheap. |
| A7 | `forgeHistory` indexes stay `'id, createdAt'` (no new index) | Architecture | If a future query needs `paymentType` indexing, a later schema bump adds it; v1 queries don't need it. |
| A8 | `forgeChoices` lives in `src/simulation/commands/forge-choices.ts` (or `selectors.ts`), NOT in `src/content` | Architecture | It reads `snapshot` (a domain type), so it belongs in simulation, not content (which is pure constants). Content-purity boundary (`AGENTS.md`) enforces this. |

## Open Questions

1. **D-04 per-level-effect interpretations for Charge Core / Output / Bloom** `[CRITICAL — blocks confident implementation]`
   - What we know: D-04 locks the mechanic ("each module gets a per-level effect"); Generator `+X% Current` is unambiguous (mirror `activationBonusPercent`).
   - What's unclear: The current simulation systems have no capacity/throughput/activation-bonus knobs for the other three. "Charge capacity", "route throughput %", and "Activation/milestone bonus" each admit multiple interpretations (see Pitfall 1, A1–A3).
   - Recommendation: **The planner should resolve this in a brief user check before implementation** (or pick the least-invasive interpretations A1–A3, document them as deviations, and proceed — they are all content-tunable later). Do NOT introduce new model fields (capacity) or break existing invariants (allocation cap).

2. **Should `forgeChoices` re-seed per-call or cache?**
   - What we know: It must be pure and derive from `forgeCount`. `[CITED: 05-CONTEXT.md D-06]`
   - What's unclear: Performance — the selector iterates all cells × 4 kinds each render. For v1 (few cells) this is trivial; no caching needed.
   - Recommendation: No caching in v1. Re-derive on each `/forge` render. If perf matters later, memoize in the UI (Zustand selector), not in the simulation.

3. **Should the Forge chip on Home show the next Energy cost, or just "Forge ready"?**
   - What we know: D-12 says shown when `moduleTokens > 0` OR `energy >= nextCost`. `[CITED: 05-CONTEXT.md D-12]`
   - What's unclear: The chip's exact label (D-12 doesn't specify text).
   - Recommendation: Mirror the existing chip terseness — "Forge ready" (or "Forge" with a token/energy indicator). Planner picks; not a correctness risk.

## Environment Availability

**Step 2.6: SKIPPED (no external dependencies identified).** Phase 5 is pure code/config changes within the existing Flowgrid codebase. It adds no external tools, services, CLIs, runtimes, databases, or package managers beyond what Phase 1–4 already established (Node, npm, Vitest, Dexie/IndexedDB via fake-indexeddb in tests, Playwright for browser smoke — all already present). `[VERIFIED: codebase — package.json + existing test infrastructure]`

## Security Domain

This is a **local-first incremental game** with no authentication, no network calls, no secrets, no user-generated content beyond cell names, and no multi-user surface. The ASVS web-app security categories (V2 Authentication, V3 Session Management, V4 Access Control, V6 Cryptography) are **largely N/A**. The relevant "security" surface for this phase is **economy safety** — already covered by the existing invariant suite.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local-first; no auth. N/A. |
| V3 Session Management | no | No server sessions. N/A. |
| V4 Access Control | no | Single-user local app. N/A. |
| V5 Input Validation | yes | `run_forge` returns structured `ValidationIssue[]` for payment/chosen/slot rejections (D-06); Zod `forgeHistorySchema` validates import boundary (D-09). `[VERIFIED: codebase — validation.ts, validation-schemas.ts]` |
| V6 Cryptography | no | No crypto this phase. N/A. |
| Economy integrity (Flowgrid-specific) | yes | Monotonic `forgeCount`/`moduleTokens` invariants (`invariants.ts:221-225`); new level-cap check; VER-02 property tests extend. `[CITED: 05-CONTEXT.md MOD-07 + VER-02 discretion]` |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Crafted `run_forge` with `chosenReward` ∉ revealed set | Tampering | Handler re-derives `forgeChoices(snapshot)` and validates `chosen ∈ revealed`; reject with `invalid_reference` (Pitfall 3). |
| Forge-payment underflow (negative tokens/energy) | Tampering | Affordability check before decrement + existing `negative_resource`/`token_regression`/`forge_count_regression` invariants backstop. |
| Forge replay double-applying | Repudiation | `ForgeHistoryRecord.id = operationId` + `idempotentAppend`/`diffAppend` (Phase 2 D-04). `[VERIFIED: codebase — diff.ts:100]` |
| Level overflow past cap | Tampering | `target.level < MODULE_MAX_LEVEL` check + new level-cap invariant in `invariants.ts`. |
| Malformed forge history on import | Tampering | Widened Zod `forgeHistorySchema` + `satisfies` drift guard (Pitfall 6). |

## Sources

### Primary (HIGH confidence)
- **Codebase verification (this session)** — Every CONTEXT.md `canonical_refs` / `code_context` claim was read against source and confirmed exact:
  - `src/domain/records.ts` (CoreRecord:55-72, ModuleInstance.level:95, ForgeHistoryRecord:147-151, FlowgridSnapshot:153-165)
  - `src/domain/result.ts` (RunForgeCommand:82-85, InstallModuleCommand:87-93, Rng:21-24, SimulationEnv:26-31, ECONOMY_EVENT_NAMES:183-197, SimulationCommand union:141-155, NotImplementedReason:210-213)
  - `src/simulation/engine.ts` (dispatcher:30-65, runForgeNotImplemented:67-77, installModuleNotImplemented:79-88)
  - `src/simulation/commands/log-rejuvenation.ts` (full template: rejectWith:44-57, threshold-grant loop:104-113, append record:128-137)
  - `src/simulation/commands/complete-focus-session.ts` (activationBonusPercent threading:163-166 — the Generator-level template)
  - `src/simulation/systems/{bloom,current,core-allocation,routes,modules}.ts` (the four D-04 read sites + module lookup)
  - `src/simulation/economy-events.ts` (event-constructor pattern)
  - `src/domain/invariants.ts` (token_regression:221-223, forge_count_regression:224-226, validateNoDuplicateInstalls:127-167)
  - `src/domain/validation.ts` (ValidationIssueCode union:9-20) + `src/domain/ids.ts` (ForgeHistoryId:21, EntityType:24-36)
  - `src/content/starter-modules.ts` (4 definitions, kind union, getStarterModuleDefinitionByKind)
  - `src/content/starter-state.ts` (slotId convention:50, all modules level:0)
  - `src/content/formulas.ts` (nextIntegrationThreshold:61-67, activationBoostCost:71-75, activationBonusPercent:79-81, ACTIVATION_BOOST constants:46-50)
  - `src/content/index.ts` (public barrel — the export surface to extend)
  - `src/persistence/database.ts` (v1/v2/v3 stores, upgradeCellsV1ToV2:56-66, upgradeCoresV2ToV3:84-94, core collision note:99-102, v3 declaration:155-168)
  - `src/persistence/diff.ts` (FlowgridWritePlan, appendForgeHistory:100, diffAppend:85-88)
  - `src/persistence/validation-schemas.ts` (forgeHistorySchema:112-116, drift guards:174-183, coreSchema Phase 4 .default pattern:64-65)
  - `src/app/store/dispatch.ts` (dispatch loop:67-120, captureCompletedSession:125-134, captureCompletedRejuvenation:139-148, hydrateStoreForTests:151-164)
  - `src/app/env.ts` + `src/app/rng.ts` (createRng xmur3+mulberry32, immutable Rng.nextInt:49-61)
  - `src/app/routes.tsx` (route table — `/forge` insertion site)
  - `src/ui/flowgrid-home/ReturnCues.tsx` (chip rail:32-48, near-Bloom nav pattern:66-74)
  - `src/ui/cell-board/CellBoard.tsx` (STARTER_TILES:29-50, ModuleTile render:103-112) + `src/ui/cell-board/ModuleTile.tsx` (presentational tile)
  - `src/ui/core-panel/RejuvenationSummary.tsx` (inline-summary template)
  - `tests/properties/economy-safety.property.test.ts` (VER-02 property-test template)
- **`05-CONTEXT.md`** — Locked decisions D-01 through D-13, Agent's Discretion list, Deferred Ideas, canonical references. `[CITED: .planning/phases/05-module-forge-and-starter-customization/05-CONTEXT.md]`
- **`AGENTS.md`** — Stack, architecture rules (simulation imports no UI/Pixi/React/Dexie/browser; integer economy units; seeded RNG; append-only history; economy-safety constraints). `[CITED: AGENTS.md]`

### Secondary (MEDIUM confidence)
- None — no external documentation was consulted. The stack is fully locked by Phase 1–4 and `AGENTS.md`; no new libraries were researched. (Search providers brave/firecrawl/exa are disabled in `.planning/config.json`; graphify disabled. External web research was not available via the seam and would have been low-value for this pure-internal continuation.)

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — no new packages; existing stack verified in codebase.
- Architecture (atomic command + pure selector + migration + UI): **HIGH** — every pattern verified against an existing Phase 1–4 artifact; near-clone implementations.
- D-04 per-level effects (Charge Core/Output/Bloom): **MEDIUM** — mechanic locked, but three of four interpretations are `[ASSUMED]` (A1–A3) and need user confirmation. Generator effect + overall structure: HIGH.
- Pitfalls: **HIGH** — derived from direct code reading + locked decisions.

**Research date:** 2026-06-25
**Valid until:** 2026-07-25 (stable — no external dependencies; bound only by codebase evolution, which is captured in CONTEXT.md canonical references)
