# Phase 5: Module Forge and Starter Customization - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers Flowgrid's first real Module Forge loop on top of the Phase 4 economy. A user can: spend a Module Token OR Energy on a Forge roll that reveals three curated upgrade choices drawn from across all their Cells, choose one, and have it applied as a `+1 level` upgrade to an existing starter module — persisted atomically with full forge history. It also makes module levels mechanically meaningful (all four starter modules gain per-level effects read by their simulation systems) and delivers module inspection (MOD-02) by deepening the existing Cell Board tiles.

The forge infrastructure is **already scaffolded** from Phase 1: `run_forge` and `install_module` command types exist but return `not_implemented`; `ForgeHistoryRecord` and the `forgeHistory` Dexie store already exist (v3) with export/import/diff/repository wiring; `moduleTokens` and `forgeCount` on `CoreRecord` are guarded by monotonic invariants (`token_regression`, `forge_count_regression`); the seeded `Rng` interface is in place. This phase replaces the stubs with real handlers and extends the thin `ForgeHistoryRecord`.

It does **not** deliver: variant module definitions / module swaps (the `install_module` command stays a forge-specific `not_implemented` stub for a future variant-swap phase); fusion, rarity pools, or larger reward pools (v2+, ADV-03); the full patch editor or advanced module graph effects (v2+, ADV-01/02); Core modules beyond the v1 Integration behavior (ADV-04); prestige/Memory (LONG-01); full PixiJS animation of forge events (Phase 6 — Phase 3 D-02 "drop visual events freely" continues to hold); Settings UI (Phase 6); cloud sync transport (v2 — sync-ready operation rows still emitted).

</domain>

<decisions>
## Implementation Decisions

### Forge Cost Model
- **D-01:** **Two forge paths, one reward pool.** Both a Token roll and an Energy roll are available from day 1, drawing from the SAME curated pool of upgrade rewards. This resolves the MOD-03 ("spend a Module Token") vs PROJECT.md active-requirement ("Energy can be spent on forge rolls") tension by honoring both. The gameplay-spine §9 dual model applies: Token = discrete agency, Energy = scalable grindable path. One reward pool keeps content, history, and tuning unified.
- **D-02:** **Token roll = fixed cost (1 Module Token); Energy roll = lifetime-escalating cost.** Energy cost = `FORGE_ENERGY_BASE + forgeCount × FORGE_ENERGY_STEP` (content constants in `src/content`, e.g. base 50 / step 25). The curve is driven by the EXISTING monotonic `CoreRecord.forgeCount` — no new counter, no new state, no per-day reset. `forgeCount` never resets (PROJECT.md prestige rule), so Energy intentionally prices out over a lifetime, keeping Token rolls relevant forever as the "guaranteed agency" path. Exact base/step numbers are content-tunable.

### v1 Forge Reward Types
- **D-03:** **Upgrade-only rewards.** Each forge grants `+1 level` to ONE of a Cell's existing starter modules (Generator, Charge Core, Output, or Bloom). The 3 revealed choices are which-module-to-upgrade picks. This makes the currently-dead `ModuleInstance.level` field (always `0` since Phase 1) mechanically meaningful, needs NO new `ModuleDefinition` records in `src/content`, and makes MOD-07 duplicate-install validation trivial (you upgrade an existing singleton that already occupies its slot — you never install a second instance). **IMPORTANT:** this `ModuleInstance.level` is a DIFFERENT level from `CoreRecord.activationBoostLevel` (the Phase 4 Energy-sink upgrade) — they live on different records and must not be conflated.
- **D-04:** **All four starter modules get per-level effects.** A `MODULE_LEVEL_BONUS` content table in `src/content` (keyed by `ModuleDefinitionKind`) defines each module's per-level effect: Generator `+X% Current`, Charge Core `+Charge capacity`, Output `+route throughput %`, Bloom `+Activation/milestone bonus` (exact numbers content-tunable). Each of the four simulation systems reads its owning module's `level`: `complete_focus_session` (Generator), charge storage (Charge Core), output routing (Output), Bloom/Activation (Bloom). The phase touches all four systems but each is a small read.
- **D-05:** **Per-module level cap with filtered reveal.** Each module caps at a small level (content constant, e.g. 3 — `MODULE_MAX_LEVEL`). The forge reveal FILTERS OUT maxed modules so the 3 choices are always useful (gameplay-spine §9 "agency, not gambling"). Installing/applying to a maxed module is the MOD-07 "invalid slot state" rejection. If ALL of a Cell's modules are maxed, that Cell contributes no choices to the cross-Cell reveal; if every module across every Cell is maxed, forge is blocked entirely (both roll controls disabled with an explanatory message).

### Forge Flow Architecture
- **D-06:** **Single atomic `run_forge` command + a pure selector reveal.** The reveal is a pure deterministic SELECTOR function `forgeChoices(snapshot, cellIdScope?)` that computes 3 filtered non-maxed upgrade options using a seeded `Rng` derived from `forgeCount` (NO state change — a read the UI calls to show the 3 choices). Then ONE atomic `run_forge` command carries `{ paymentType: 'token'|'energy', chosenReward: { cellId, moduleKind } }` and does ALL of: validate payment affordability → re-derive the same 3 choices from `forgeCount` → validate `chosenReward ∈ revealedChoices` → apply `+1 level` to the target `ModuleInstance` → decrement payment (token or energy) → increment `forgeCount` → append ONE `ForgeHistoryRecord` → emit economy events. Single command, single operation, single history row. No pending state, no reload-mid-forge data loss, no extra migration for pending state. Matches the atomic-command philosophy of every prior phase. Deterministic replay (Phase 1 D-08) holds because choices derive from the snapshot's `forgeCount`, not ambient RNG.
- **D-07:** **Cross-Cell global reveal.** The 3 revealed choices are drawn from across ALL the user's non-maxed modules (e.g. could offer "upgrade Music Generator" alongside "upgrade Fitness Bloom"). The `run_forge` command's `chosenReward.cellId` identifies which Cell's module is being upgraded. This makes the Forge a truly global surface (not per-Cell), which is why it gets its own route (D-09). The reveal selector filters to non-maxed modules across the whole snapshot.
- **D-08:** **`install_module` stays a forge-specific `not_implemented` stub.** Because `run_forge` applies the upgrade atomically (the `+level` goes directly into the existing slot-occupying module — that IS the MOD-06 "apply into a curated starter slot"), the `install_module` command has no v1 job. It remains in the `SimulationCommand` union and dispatcher as a `not_implemented` stub (forge-specific reason) reserved for a future phase that introduces variant `ModuleDefinition`s requiring a real install-into-slot / swap path. It is NOT removed (preserves the type hook) and NOT split off (that would re-introduce the pending-state problems D-06 avoids).
- **D-09:** **`ForgeHistoryRecord` becomes a full row; Dexie v3→v4 schema bump.** Each successful `run_forge` appends ONE row capturing MOD-05 literally: `id` (= `operationId`, idempotent — Phase 2 D-04), `forgeCount`, `paymentType` (`'token'|'energy'`), `paymentAmount` (1 for token, the Energy spent for energy), `offeredChoices` (all 3 derived `{ cellId, moduleKind }` options), `chosenReward` (`{ cellId, moduleKind, fromLevel, toLevel }`), `createdAt`. The `forgeHistory` store already exists (Phase 2); this is a record-shape change requiring a Dexie `version(4)` declaration repeating the full store set + a transform. The store is EMPTY pre-Phase-5 (the stub never wrote rows), so the migration is low-risk and has no real rows to transform — but the schema version must still bump. Export/import (`src/persistence/export-json.ts`, `import.ts`) and Zod schemas (`validation-schemas.ts`) must include the widened record shape. `forgeHistory` remains append-only (Phase 2 D-02; history is sacred).

### Forge UI Surface
- **D-10:** **Dedicated `/forge` route.** A new route peer to `/` (Flowgrid Home), `/cells/:cellId` (Cell Board), and `/core` (Core Panel) — matching gameplay-spine §19's four-major-surfaces model. The route shows: current Module Tokens, current Energy + the next Energy cost (`FORGE_ENERGY_BASE + forgeCount × FORGE_ENERGY_STEP`), a "Roll with Token" control (disabled when `moduleTokens < 1`) and a "Roll with Energy" control (disabled when `energy < nextCost`), the 3 revealed choices (each naming the Cell + module kind + current level → next level + the per-level effect from `MODULE_LEVEL_BONUS`), pick-one, then an inline `ForgeSummary`. The reveal persists until the user picks (or navigates away — re-rolling re-derives the same 3 from `forgeCount`, so nothing is lost).
- **D-11:** **Inline `ForgeSummary`, mirroring the SessionSummary / RejuvenationSummary pattern.** On a successful forge, a `lastCompletedForge` store field (paralleling `lastCompletedSession` / `lastCompletedRejuvenation` in `src/app/store/dispatch.ts`) captures the result and the `/forge` route renders the summary from it: payment spent, the 3 offered choices, the chosen reward + level change, new forgeCount. NOT a modal (consistent with Phase 3/4 "modal blocks the Generator") and NOT a toast (too ephemeral for a build-choice moment). Persists until the next dispatch clears it (mirrors the existing summaries).
- **D-12:** **Home `ReturnCues` gains a tappable "Forge" chip.** The existing stat-chip rail (`src/ui/flowgrid-home/ReturnCues.tsx`) gains a Forge chip — accent-colored and tappable (navigates to `/forge`) — shown whenever `core.moduleTokens > 0` OR `core.energy >= FORGE_ENERGY_BASE + core.forgeCount × FORGE_ENERGY_STEP`. This surfaces forge-readiness alongside the existing Energy/Charge/Tokens/Near-Bloom chips (Phase 4 D-05/D-06). The protected `open app → tap Cell → start session` flow on Home stays unobstructed (the rail sits above the canvas).

### Module Inspection (MOD-02)
- **D-13:** **Extend the existing Cell Board module tiles.** The four starter module tiles already rendered in `src/ui/cell-board/CellBoard.tsx` are deepened to show: a level badge ("Generator · Lv 2"), the module's `phase1Behavior` in plain text ("Generates Current from focus time"), and the active per-level effect derived from `MODULE_LEVEL_BONUS` ("+10% Current per level · current bonus +20%"). Uses normal semantic controls (already accessible). Reuses the same `MODULE_LEVEL_BONUS` content table the simulation reads, so the UI and simulation agree. No new inspection surface (rejects the separate-panel/modal option to stay consistent with the "modal blocks the Generator" anti-pattern).

### Agent's Discretion

The following were not user-selected gray areas or are mechanical details the user delegated. The agent should pick standard, well-tested approaches consistent with prior-phase patterns and document them in the plan:

- **Exact content-tunable numbers** — `FORGE_ENERGY_BASE`, `FORGE_ENERGY_STEP`, `MODULE_MAX_LEVEL`, and the per-kind entries of `MODULE_LEVEL_BONUS` (Generator/Charge Core/Output/Bloom per-level magnitudes). The mechanics are locked (D-02/D-04/D-05); the planner picks starter values that feel fair alongside the Phase 3/4 economy (e.g. D-15 Activation bonus `+10%` base, Phase 4 upgrade `+5%/level`). All live as named constants in `src/content/formulas.ts` or a new `src/content/forge.ts`.
- **The 3-choice derivation / seeded RNG** — how `forgeChoices(snapshot)` deterministically picks 3 distinct non-maxed `{cellId, moduleKind}` options from `forgeCount`. Options: a seeded `Rng` constructed from `${forgeCount}` (uses the existing `Rng` interface), or a pure hash/cycle over the curated option list. Must be deterministic & replayable (Phase 1 D-08); must filter maxed modules (D-05); must handle the "fewer than 3 non-maxed options exist" edge (reveal fewer, or block the roll). Planner picks; the command's `chosen ∈ revealed` validation (D-06) uses the SAME derivation.
- **Validation issue codes for forge** — the existing `ValidationIssue` code union (`src/domain/validation.ts`) covers `token_regression`, `forge_count_regression`, `duplicate_install`, `invalid_reference`, `negative_resource`, etc. New forge rejections map to: insufficient token/energy → existing `negative_resource`-family or a dedicated `insufficient_payment`; chosen-not-in-revealed → `invalid_reference` or `invalid_operation_shape`; target module maxed → `duplicate_install`-family or a dedicated `invalid_slot_state` / `slot_at_capacity`; no valid choices → a dedicated `no_forge_choices_available`. The planner reuses existing codes where they fit and adds the minimum new codes (the union is hand-maintained). Mirrors Phase 4's reuse of `write_failure`.
- **`run_forge` command field shape** — exact naming/structure of `paymentType` and `chosenReward` on the `RunForgeCommand` (currently `{ type, operationId }` in `src/domain/result.ts`). The command is EXTENDED in place (no durable data depends on the old shape — it was a stub); mirrors how `LogRejuvenationCommand` was extended in Phase 4. Whether `chosenReward` carries `moduleKind` vs `moduleInstanceId` vs `definitionId` is the planner's call (`{cellId, moduleKind}` resolves to the instance via the slot convention `${cellId}:slot:${kind}`).
- **Economy/visual events for forge** — new `ECONOMY_EVENT_NAMES` entries (e.g. `forgeCompleted`, `moduleUpgraded`) and optionally a `visual:forge_roll` / `visual:module_upgrade` visual event. Visual events are dropped/logged per Phase 3 D-02 (Phase 6 owns animation). Planner adds the minimum economy events needed for the summary + history.
- **ForgeSummary exact contents + store wiring** — mirrors `captureCompletedSession` / `captureCompletedRejuvenation` in `src/app/store/dispatch.ts`; the planner adds `lastCompletedForge` following the identical pattern.
- **Property tests (VER-02 extension)** — extend the Phase 1 invariant suite for forge: `forgeCount` monotonic, `moduleTokens` non-negative after token payment, `energy` non-negative after energy payment, `chosenReward ∈ revealedChoices`, module level never exceeds `MODULE_MAX_LEVEL`, idempotent replay by `operationId`. Planner adds these to the existing fast-check suite.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` — Defines Flowgrid's core value, the protected core interaction (`open app → tap Cell → start session` — must stay easy; D-10/D-12 must not obstruct it), architecture layer rule, economy-safety constraints (no negative resources, **no token duplication**, **no forge-count reset — D-02/D-09 preserve this via the monotonic `forgeCount` curve and append-only history**), append-only history rule, and accessibility rule. Directly governs this phase.
- `.planning/REQUIREMENTS.md` — Defines Phase 5 requirements `MOD-02`, `MOD-03`, `MOD-04`, `MOD-05`, `MOD-06`, `MOD-07`. Note MOD-01 (`ModuleDefinition` versioning, Phase 1) is already satisfied and MOD-02 extends the Cell Board this phase. VER-01/VER-02 (forge invariant + property tests) are also touched.
- `.planning/ROADMAP.md` — Defines Phase 5 goal, 5 success criteria, Phase 4 dependency, and v1 phase boundary. "UI hint: yes".
- `.planning/STATE.md` — Records Phase 4 completion (2026-06-24) and the carrying decisions (plain-string IDs, repository diff-writes, inline-summary pattern, the `lastCompletedRejuvenation` store field template for D-11's `lastCompletedForge`).

### Prior Phase Context (decisions that constrain Phase 5)
- `.planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md` — D-02 (`run_forge`/`install_module` typed stubs returning `not_implemented` — this phase replaces `run_forge`; D-08 leaves `install_module` a stub), D-07 (typed validation issues, no throwing — forge rejections follow), D-08 (exact deterministic replay — D-06's `forgeCount`-derived choices preserve this).
- `.planning/phases/02-durable-local-first-spine/02-CONTEXT.md` — D-02 (rejected/not-implemented commands write nothing), D-04 (idempotent upsert with conflict-on-payload-mismatch — `ForgeHistoryRecord.id` is 1:1 with `operationId`), D-06 (`ModuleDefinition`s are code content, not persisted — D-03 adds no new definitions), D-07/D-08 (migration harness + four independent version axes — D-09's v3→v4 bump reuses the harness; Dexie schema version is store-shape-only), D-09 (full JSON export never strips the operation log — must include the widened forgeHistory shape).
- `.planning/phases/03-playable-generator-flowgrid/03-CONTEXT.md` — D-02 (visual events dropped freely — Phase 5 may emit forge visual events but Phase 6 owns animation), D-09 (`create_cell` instantiates the 4 starter modules into `${cellId}:slot:${kind}` slots — template for D-03/D-07's slot resolution), D-15 (Activation `+% Current` bonus — D-03 explicitly distinguishes `ModuleInstance.level` from this).
- `.planning/phases/04-core-alternation-and-rejuvenation-economy/04-CONTEXT.md` — D-09/D-10 (inline-panel summary that persists until next action — D-11 mirrors this for `ForgeSummary`), the `/core` route + `CorePanel` peer pattern (D-10 adds `/forge` the same way), D-05/D-06 (ReturnCues stat-chip rail + highlighted/tappable chip — D-12 extends this), the `lastCompletedRejuvenation` store-field pattern (D-11's `lastCompletedForge` template).

### Phase 1–4 Code Contracts (the inputs Phase 5 consumes — MUST read)
- `src/domain/records.ts` — `CoreRecord` already carries `moduleTokens`, `forgeCount`, `energy` (lines 55–72); `ModuleInstance` already carries `level` (dead at `0` — D-03/D-04 make it meaningful); `ModuleDefinition` + `ModuleDefinitionKind` ('generator'|'charge_core'|'output'|'bloom') and `singletonPerCell` (lines 74–88); `ForgeHistoryRecord` is THIN `{ id, forgeCount, createdAt }` (lines 147–151) — **D-09 widens it**; `FlowgridSnapshot.forgeHistory` (line 164).
- `src/domain/result.ts` — `RunForgeCommand` is currently `{ type, operationId }` (lines 82–85) — **D-06 extends it in place** with `paymentType` + `chosenReward`; `InstallModuleCommand` (lines 87–93) — **stays not_implemented (D-08)**; `Rng` interface (lines 21–24) with `nextInt(min,max)` — used by the D-06 reveal derivation; `SimulationEnv.rng` (line 29); `ECONOMY_EVENT_NAMES` (lines 183–197) — Phase 5 adds `forgeCompleted`/`moduleUpgraded`; `SimulationCommand` union (lines 141–155).
- `src/simulation/engine.ts` — Dispatcher switch routes `run_forge` (line 60) and `install_module` (line 62) to the not-implemented stubs (lines 67–88). Phase 5 replaces `runForgeNotImplemented` with the real handler; KEEPS `installModuleNotImplemented`. Exhaustive switch guarantees compile-time safety.
- `src/simulation/commands/log-rejuvenation.ts` — Template for the new `run_forge` handler (validate → derive → apply → emit operation + economy events → append history record → return `SimulationResult`); the threshold-grant loop (lines 104–113) is the pattern for bounded derived-counter loops; `rejectWith` helper (lines 44–57) is reused.
- `src/simulation/commands/not-implemented.ts` — The stub helper; `install_module` continues to use it (D-08).
- `src/content/starter-modules.ts` — The four `STARTER_MODULE_DEFINITIONS` (Generator, Charge Core, Output, Bloom) with their `kind` and `phase1Behavior`; `getStarterModuleDefinitionByKind` resolver. D-04 keys `MODULE_LEVEL_BONUS` by `kind`.
- `src/content/starter-state.ts` — The slot convention `slotId(cellId, kind) = ${cellId}:slot:${kind}` (lines 48–52) — D-06/D-07 resolve `chosenReward` to a `ModuleInstance` via this convention; `createStarterFlowgridState` (all modules start `level: 0`).
- `src/content/formulas.ts` — `nextIntegrationThreshold(moduleTokens)` (lines 61–65) — the geometric-threshold pattern D-06's `forgeCount`-derived choices echo; existing content constants. D-02's `FORGE_ENERGY_BASE`/`FORGE_ENERGY_STEP` and D-04's `MODULE_LEVEL_BONUS`/`MODULE_MAX_LEVEL` are added here (or a new `src/content/forge.ts`).
- `src/domain/invariants.ts` — Already guards `moduleTokens`/`forgeCount` non-negativity + `token_regression`/`forge_count_regression` (lines 70–71, 221–225). Phase 5 adds: module-level cap invariant (`level <= MODULE_MAX_LEVEL`), and the `chosen ∈ revealed` consistency is validated in-command (D-06).
- `src/domain/validation.ts` + `src/domain/ids.ts` — `ValidationIssue` code union (lines 16–17 show `forge_count_regression`); `ForgeHistoryId` (ids.ts:21); `EntityType` includes `'forge_history'` (ids.ts:36). New forge rejection codes added here (Agent's Discretion).
- `src/persistence/database.ts` — Dexie gateway, currently v3 (the `forgeHistory: 'id, createdAt'` store is declared at v1/v2/v3 — lines 124/141/164). **D-09 adds `version(4)`** repeating the full store set; `upgradeCellsV1ToV2` (lines 54–64) is the extracted-transform template. The `core` store-name collision note applies.
- `src/persistence/export-json.ts` + `src/persistence/import.ts` + `src/persistence/validation-schemas.ts` — `forgeHistorySchema` (validation-schemas.ts:112) and the archive envelope (export-json.ts:55, import.ts:41/59/99/151/182) must widen to the new `ForgeHistoryRecord` shape (D-09). `forgeHistory` stays append-only (import.ts:182 uses `idempotentMergeUpsert`).
- `src/persistence/diff.ts` + `src/persistence/repository.ts` — `appendForgeHistory` diff path (diff.ts:41/57/100/136) and `idempotentAppend` (repository.ts:118–121) already handle append-only forge rows — picked up automatically by D-09's widened shape (no diff logic change needed).
- `src/app/store/dispatch.ts` — The single mutation path; `captureCompletedSession`/`captureCompletedRejuvenation` (lines ~109–118) is the template for D-11's `captureCompletedForge` → `lastCompletedForge` store field.
- `src/app/routes.tsx` — Route table (`/`, `/cells/:cellId`, `/core`); **D-10 adds `/forge`** here.
- `src/ui/session-summary/SessionSummary.tsx` + `src/ui/core-panel/RejuvenationSummary.tsx` — The inline-summary template D-11 mirrors for `ForgeSummary`.
- `src/ui/flowgrid-home/ReturnCues.tsx` — Where D-12's tappable Forge chip mounts (lines 35/64 show the existing `hasTokens`/`core.moduleTokens` chip pattern); accent-chip + `navigate('/forge')` pattern from Phase 4 D-06.
- `src/ui/cell-board/CellBoard.tsx` — Where D-13's extended module tiles live (the four starter module tiles already render here).
- `src/simulation/commands/complete-focus-session.ts` + `src/simulation/systems/{bloom,current,core-allocation,routes}.ts` — The four systems D-04 modifies to read owning module `level` (Generator via complete-focus-session, Charge Core/Output/Bloom via their systems).

### Design Drafts
- `docs/gameplay-spine-draft.md` §9 "Module Forge" (lines 459–513) — The forge vision: "Spend Energy or Module Token → reveal 3 Modules → choose 1"; the Token-vs-Energy dual model; "Tokens should increase agency, not just gambling intensity" (D-05's filtered-reveal rationale). §19 "UI implications" lists Module Forge as one of the four major surfaces (D-10's dedicated route). §14 Activation examples inform D-04's per-level magnitudes.

### Stack References (already locked — read for exact wiring)
- `AGENTS.md` "Technology Stack" section — React 19, Vite 8, Router v7, Tailwind 4, Radix UI, lucide-react, Zustand 5, Dexie 4, Zod 4, Vitest 4, fast-check. Architecture rules: domain imports no app/browser/Pixi/React/Dexie/Zustand; ui dispatches commands and displays selectors, never calculates economy rules; persistence stores records + migrations, never runs simulation rules.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`ForgeHistoryRecord` + `forgeHistory` store** (`src/domain/records.ts:147`, `src/persistence/database.ts:108`) — Already exist and flow through diff/repository/export/import. D-09 only widens the record shape + bumps the schema version; the append-only diff path needs no logic change.
- **`run_forge` / `install_module` command types** (`src/domain/result.ts:82,87`) — Already in the `SimulationCommand` union and dispatcher. D-06 extends `RunForgeCommand` in place (mirrors Phase 4's `LogRejuvenationCommand` extension); D-08 leaves `InstallModuleCommand` as-is.
- **`moduleTokens` / `forgeCount` / `energy` on `CoreRecord`** (`src/domain/records.ts:57-64`) — All payment/counter fields Phase 5 reads/writes already exist with monotonic invariants guarding the regression cases.
- **`ModuleInstance.level`** (`src/domain/records.ts:95`) — Dead at `0` since Phase 1; D-03/D-04 make it the forge upgrade target.
- **`Rng` interface + `SimulationEnv.rng`** (`src/domain/result.ts:21,29`) — Seeded deterministic RNG already injected; D-06's reveal derivation uses it (seeded from `forgeCount` for replayability).
- **`log_rejuvenation` handler** (`src/simulation/commands/log-rejuvenation.ts`) — Full template for the new `run_forge` handler (validate → derive from monotonic counter → apply → emit → append history → return), including `rejectWith` and the bounded derived-counter loop.
- **`captureCompletedSession` / `captureCompletedRejuvenation`** (`src/app/store/dispatch.ts`) — Template for D-11's `captureCompletedForge` → `lastCompletedForge`.
- **`SessionSummary` / `RejuvenationSummary`** (`src/ui/session-summary/`, `src/ui/core-panel/`) — Inline-summary template for `ForgeSummary`.
- **`ReturnCues`** (`src/ui/flowgrid-home/ReturnCues.tsx`) — D-12 extends the existing chip rail with the Forge chip.
- **`upgradeCellsV1ToV2` + migration harness** (`src/persistence/database.ts:54`) — Extracted-transform + synthetic-fixture pattern for D-09's v3→v4 migration.
- **`slotId(cellId, kind)` convention** (`src/content/starter-state.ts:50`) — D-06/D-07 resolve `chosenReward.{cellId, moduleKind}` to the target `ModuleInstance` via this convention.

### Established Patterns
- **Strict layer boundaries** (ESLint-enforced): simulation imports no UI/Pixi/React/Dexie/browser; persistence runs no simulation rules; UI dispatches commands and reads selectors, never computes economy rules. Phase 5's new `run_forge` handler, `/forge` route, `ForgeSummary`, and `MODULE_LEVEL_BONUS` content must respect these.
- **Integer economy units** everywhere (`IntNonNegative`, `IntPercent`, `IntSeconds`); multiply-then-floor; no floats. D-02's Energy cost curve and D-04's per-level bonuses follow this.
- **Plain string IDs** (not branded); `ForgeHistoryRecord.id` is 1:1 with `operationId` (idempotent replay — Phase 2 D-04).
- **Typed results, no throwing for domain invalidity** (Phase 1 D-07) — `run_forge` returns `rejected` results with structured `ValidationIssue[]` (insufficient payment, chosen-not-in-revealed, slot-at-capacity, no-choices-available).
- **Deterministic replay** (Phase 1 D-08) — same inputs → identical `nextState`/events/operations/issues. D-06's `forgeCount`-derived choices preserve this (no ambient RNG; the seed is a function of the snapshot).
- **Hybrid records-plus-operation-log** (Phase 2 D-01) — each applied `run_forge` writes the changed `CoreRecord` + changed `ModuleInstance` + the new `ForgeHistoryRecord` + the `SyncOperation`; rejected forges write nothing.
- **Diff-write in persistence** (Phase 2 D-03) — repository detects the changed Core/ModuleInstance records and the appended forge row by diffing; no manifest needed.
- **Visual events are transient** (Phase 3 D-02) — renderer may drop them freely; Phase 5 may emit forge visual events but Phase 6 owns animation.
- **Inline summary, not modal** (Phase 3/4) — `ForgeSummary` mirrors the existing summaries; modals are rejected because they obstruct the Generator.

### Integration Points
- **App shell ↔ Repository:** the existing `dispatch`/`apply` path consumes `run_forge` results unchanged in shape; the store gains `lastCompletedForge` and a "pending reveal" projection (the 3 derived choices shown until picked).
- **`/forge` route ↔ selectors:** the route reads `core` (tokens, energy, forgeCount → next Energy cost), calls the `forgeChoices` selector for the reveal, and dispatches `run_forge` through `dispatch`.
- **`ReturnCues` ↔ forge readiness:** a new Forge chip reads the forge-affordability booleans and navigates to `/forge` on tap.
- **Cell Board ↔ module levels:** the extended tiles read each module's `level` and the `MODULE_LEVEL_BONUS` effect for display.
- **Simulation systems ↔ module levels:** `complete_focus_session` (Generator), charge storage (Charge Core), routing (Output), Bloom (Bloom) each read the owning module's `level` to apply D-04's per-level effect.
- **Repository ↔ Dexie v4:** `version(4)` repeats the store set with the widened `forgeHistory` shape; export/restore include the new fields.

</code_context>

<specifics>
## Specific Ideas

- **Both forge paths (Token + Energy), same pool** (D-01) was chosen deliberately over token-only: the user wants Energy to remain a meaningful currency beyond the Phase 4 Activation boost, and the gameplay-spine §9 dual model (Token = agency, Energy = scalable grind) is the intended long-term shape — so v1 establishes both rather than retrofitting Energy rolls later. Same pool keeps it v1-simple (one reward definition, one history shape).
- **Lifetime `forgeCount` Energy curve** (D-02) was chosen over per-day-resetting because `forgeCount` is already a monotonic never-resetting counter (PROJECT.md prestige rule), so it gives a free, sync-safe cost driver with no new state — and "Energy prices out over a lifetime" is the intended pressure that keeps Token rolls (the scarce milestone reward) relevant forever.
- **Upgrade-only rewards** (D-03) was chosen because `ModuleInstance.level` is already on the record but dead, the 4 starter modules already occupy all slots (so "install a new module" has nowhere to go without a swap semantic), and MOD-07 duplicate-install is trivially satisfied by upgrading an existing singleton. Variant swaps are explicitly the future `install_module` path (D-08).
- **All 4 modules get effects** (D-04) was chosen over a subset so no forge reward is ever a "dud" — every revealed upgrade does something tangible, reinforcing "agency not gambling."
- **Filtered reveal at the cap** (D-05) was chosen so a token/energy roll can never be wasted on a maxed module — the reveal only ever offers useful upgrades.
- **Single atomic command + pure reveal** (D-06) was chosen over a two-phase pending-state split specifically to avoid the reload-mid-forge data-loss problem and the extra migration a pending-forge record would require — and because every prior Flowgrid command is atomic, so forge fits the established philosophy cleanly.
- **Cross-Cell global reveal** (D-07) was chosen so the Forge feels like a single global build-decision surface (matching §19's "Module Forge" major surface) rather than N per-Cell forges.
- **Dedicated `/forge` route** (D-10) follows directly from D-07 (a global forge wants its own surface) and §19's four-surfaces model.
- **Full forge history row** (D-09) was chosen to satisfy MOD-05 literally ("offered choices" plural) and to enable a future "what could have been" history view.

</specifics>

<deferred>
## Deferred Ideas

- **Variant `ModuleDefinition`s and module swaps** — the `install_module` command (D-08 stub) is reserved for a future phase that introduces curated variant modules (e.g. "Surge Generator") requiring a real install-into-slot / replace-starter semantic. That phase would also need MOD-07 duplicate-handling for swapped-out modules and a "module inventory" concept. v2+ (ADV-03).
- **Forge rarity pools / improved-odds Token tiers** — the gameplay-spine §9 "2 Tokens = choose-one-of-four or improved rarity odds" / "3 Tokens = boosted rarity" model. Deferred until the v1 upgrade-only forge loop is validated; needs a rarity concept that v1 intentionally avoids. v2+ (ADV-03).
- **Fusion material / duplicate modules** — the spine's "duplicate / fusion material" reward type. Out of scope (ADV-03); upgrade-only (D-03) sidesteps it entirely.
- **Port upgrades, patch types, special sockets, rare Core modules, prestige fragments** — the rest of the spine §9 reward list. Each is a distinct capability belonging to its own future phase (ADV-01/02/04, LONG-01).
- **Full PixiJS animation of forge rolls/choices/upgrades** — Phase 6 (UI-03); visual events may be emitted this phase but are dropped/logged per Phase 3 D-02.
- **Energy sinks beyond Activation boost + forge rolls** — Cell expansion, routes, Core Power placeholders (PROJECT.md active requirement) — each is its own future phase; this phase ships only the forge Energy sink (D-01).
- **Forge reroll** — spending a second payment to re-roll the 3 choices before picking. Not needed in the single-atomic-command model (D-06): navigating away and re-entering /forge re-derives the same 3 from `forgeCount` (nothing spent yet), and after a roll the choice is committed. Could return if users want paid rerolls within one reveal.
- **Forge history / analytics view** — a UI surface browsing past forge rows ("you could have picked…"). D-09 records the data; a dedicated history view is Phase 6 (UI-02 covers history/export surfaces) or later.

</deferred>

---

*Phase: 5-Module Forge and Starter Customization*
*Context gathered: 2026-06-25*
