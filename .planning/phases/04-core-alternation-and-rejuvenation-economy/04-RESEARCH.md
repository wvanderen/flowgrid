# Phase 4: Core Alternation and Rejuvenation Economy - Research

**Researched:** 2026-06-24
**Domain:** Local-first incremental-game economy (Core routing, rejuvenation, Module-Token thresholds, Energy-spend upgrade) built on the Phase 1–3 deterministic simulation + Dexie spine
**Confidence:** HIGH

## Summary

Phase 4 is a **pure codebase-extension phase**. It adds **no new external packages** (React 19, Vite 8, Router v7, Tailwind 4, Radix, Zustand 5, Dexie 4, Zod 4, Vitest 4, fast-check are all already installed and proven in Phases 1–3) and **no new external services** (local-first, offline, no network). The work is: extend `CoreRecord` with two fields, add a new `RejuvenationRecord` + Dexie store + v2→v3 migration, replace the `log_rejuvenation` stub with a real handler, add three new commands (the rejuvenation start/cancel pair + the Energy-spend upgrade), modify `complete_focus_session` to read the new upgrade level, and add four UI components (CorePanel, RejuvenationSummary, RejuvenationTimer, ReturnCues) plus a `/core` route.

The most important planning insight — not obvious from a surface read of SPEC.md — is that **D-01/D-02's "live-timed rejuvenation session mirroring focus" requires a command TRIO, not just the existing `log_rejuvenation` finish command.** A durable `activeRejuvenationStartedAt` marker (for reload-resume + mutual exclusion with focus) can only be set by a command that writes to IndexedDB, so `start_rejuvenation` (and, for symmetry with `cancel_focus_session`, `cancel_rejuvenation`) must be added alongside the `log_rejuvenation` finish handler. The SPEC lists only `log_rejuvenation` because it was authored before the live-timed-session decision; CONTEXT D-01/D-02 supersedes that. The planner MUST add the trio or D-02's "reload surfaces a resume-or-discard prompt for an interrupted rejuvenation" cannot be satisfied.

The second insight: the **geometric Integration→Module-Token threshold should be DERIVED from the monotonic `moduleTokens` counter** (`threshold(n) = floor(50 × 1.5ⁿ)`) rather than persisted as a `nextThreshold` field. Deriving needs no migration field, cannot drift from the count, and is naturally monotonic — a textbook "derive, don't store" case. The threshold base (50) and ratio (1.5) are locked content constants in `src/content`.

**Primary recommendation:** Plan as 3 waves mirroring Phase 3's proven structure — Wave 1 (simulation truth: records/commands/systems/migration/invariants/tests), Wave 2 blocked-on-1 (app store/dispatch/selectors + CorePanel/RejuvenationSummary/ReturnCues UI + `/core` route), Wave 3 (UAT gap-closure). All mechanics and numbers are locked in `04-SPEC.md` (ambiguity 0.13) and `04-CONTEXT.md` decisions D-01..D-10; the planner's job is mechanical reconciliation, not design exploration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 .. D-10 — verbatim summary; see 04-CONTEXT.md for full text)

- **D-01:** Rejuvenation is a **live timed session** mirroring focus (start → timer → finish). Reuses Phase 3 D-05 active-session marker pattern. NOT a retrospective log.
- **D-02:** **One active session, app-wide.** Rest and focus are mutually exclusive — starting one blocks the other. A Core-scoped rejuvenation marker is needed (Agent's Discretion on exact storage). A reload must surface a resume-or-discard prompt for an interrupted rejuvenation, paralleling the focus resume prompt.
- **D-03:** **Rejuvenation payout is duration-gated (SPEC R3 AMENDMENT).** `chargeProcessed = min(coreCharge, floor(durationMinutes × 10))`; `integrationGained = floor(chargeProcessed / 2)`; `chargeConsumed = integrationGained × 2`; odd Charge remainder retained; 0 Charge = no-op rest (appends zero-gain record). `REJUVENATION_CHARGE_PER_MINUTE = 10` is a content constant.
- **D-04:** **Diff for truth, tick for UI** (carries over Phase 3 D-06). `log_rejuvenation` receives `startedAt`+`endedAt`, derives `durationSeconds`/`durationMinutes`; payout computed deterministically at finish. React-side timer is cosmetic `setInterval`. Exact deterministic replay (Phase 1 D-08) holds.
- **D-05:** **Persistent stat-chip rail** on FlowgridHome (Energy · Charge · Tokens · Near-Bloom) above the canvas whenever actionable economy state exists; renders nothing otherwise. NOT dismissible.
- **D-06:** **Near-Bloom chip highlighted + tappable** → navigates to that Cell's Board (`/cells/:id`). Other chips flat/informational.
- **D-07:** **Absolute values per chip** ("Charge 80", "Tokens 2"). No progress-to-next detail in the rail.
- **D-08:** **No shame/punitive language.** Rail sits above canvas, below resume-session banner; must not obstruct the protected `open app → tap Cell → start session` flow.
- **D-09:** **Inline RejuvenationSummary on the Core panel** mirroring Phase 3 `SessionSummary`. A new `lastCompletedRejuvenation` store field. NOT a modal, NOT a toast.
- **D-10:** **Persists until next action.** Summary stays until a new dispatch clears `lastCompletedRejuvenation`. No auto-dismiss.

### the agent's Discretion (planner picks standard approaches, documents in plan)

- **Core panel placement** — dedicated `/core` route vs embedded section. `docs/gameplay-spine-draft.md` §3 "Core View" lists it as one of four major surfaces → **recommend dedicated `/core` route** (peer to `/` and `/cells/:id`).
- **Active-rejuvenation marker storage** — nullable `activeRejuvenationStartedAt` on `CoreRecord` (parallel to `CellRecord.activeSessionStartedAt`) vs generalized app-wide marker. **Recommend the CoreRecord field** (parallel structure, minimal migration, one-active-session invariant is a simple cross-check).
- **Energy-upgrade command shape & naming** — template is `set-core-allocation.ts`. **Recommend `purchase_activation_boost`**; persisted level as new `CoreRecord.activationBoostLevel`.
- **Dexie v2→v3 migration shape** — add `rejuvenations` store + Core field upgrade transform. Reuse Phase 2 D-07 harness + `upgradeCellsV1ToV2` extracted-transform template. Stores repeated verbatim. Export/restore includes the new collection.
- **Rejuvenation timer UI** — cosmetic, paralleling `SessionTimer` (`src/ui/cell-board/SessionTimer.tsx`).
- **Short-rest no-op** — whether sub-minute finish routes through a zero-gain/no-record path (parallels Phase 3 D-08 sub-second-cancel). **Recommend: sub-minute rejuvenation finish with 0 Charge appends the zero-gain record (D-03 rule); sub-minute finish WITH Charge processes 0 Charge (floor(0 min×10)=0) → also zero-gain record.** Consistent — every finished rejuvenation appends a record; cancels append nothing.

### Deferred Ideas (OUT OF SCOPE — ignore completely)

- Multiple simultaneous session types (focus + rejuvenation concurrently) — D-02 locks one-active-session app-wide.
- Per-signal dismissible return-cue cards.
- Progress-to-next detail in the home rail chips.
- Full PixiJS animation of Core/rejuvenation events — Phase 6 (UI-03); visual events may be emitted but are dropped/logged per Phase 3 D-02.
- Additional Energy sinks beyond the Activation-bonus upgrade — Phase 5 (Forge rolls).
- Module Forge (`run_forge`/`install_module`) — Phase 5.
- Settings UI — Phase 6.
- Offline idle production — explicitly out.
- Cloud sync transport — v2; operation rows still emitted.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CORE-01 | Current from Cells routes to Core via starter Output | **Already implemented** (`complete-focus-session.ts:188-192` routes Current via `findRoutesFromCellToCore` + `applyCoreAllocation`). Phase 4 only surfaces outcomes in CorePanel. |
| CORE-02 | User sets Core convert/store allocation, sum always 100 | **Already implemented** (`set-core-allocation.ts`, invariant in `isCoreAllocationValid`). Phase 4 adds the CorePanel allocation control. |
| CORE-03 | Core converts incoming Current into Energy | **Already implemented** (`splitCoreCurrent` in `formulas.ts:59`, `applyCoreAllocation`). Phase 4 surfaces Energy in CorePanel. |
| CORE-04 | Core stores incoming Current as Core Charge | **Already implemented** (same split). Phase 4 surfaces Core Charge in CorePanel + ReturnCues. |
| CORE-05 | Core UI shows Energy, Charge, allocation, Integration, Tokens, next action | **NEW** — CorePanel component at `/core` route. Reads `core` snapshot + dispatches `set_core_allocation`/`start_rejuvenation`/`purchase_activation_boost`. |
| CORE-06 | User spends Energy on early upgrades/forge-related actions | **NEW** — `purchase_activation_boost` command (3 levels, costs 50/100/200, +5/level, cap 3). Modifies `complete_focus_session` bonus derivation to `10 + level×5`. |
| REJ-01 | User logs/completes a rejuvenation session | **NEW** — `start_rejuvenation` + `log_rejuvenation` (finish) + `cancel_rejuvenation` command trio (D-01/D-02). `log_rejuvenation` replaces the `not_implemented` stub. |
| REJ-02 | Rejuvenation processes Core Charge into Integration | **NEW** — duration-gated handler (D-03): `chargeProcessed=min(coreCharge, floor(min×10))`, `integrationGained=floor(processed/2)`. |
| REJ-03 | No meaningful progress without prior Core Charge | **NEW** — 0 Charge → no-op rest (zero-gain record appended); enforced in handler + invariant test. Rest-farming guard. |
| REJ-04 | Integration thresholds grant Module Tokens, advance threshold | **NEW** — geometric `floor(50×1.5ⁿ)` derived threshold; loop while `integration ≥ nextThreshold(moduleTokens)` grants tokens. |
| REJ-05 | User sees Charge processed + distance to next threshold | **NEW** — RejuvenationSummary (mirrors SessionSummary) reading `lastCompletedRejuvenation` store field. |
| UI-07 | Opening Flowgrid surfaces return cues (Charge/Energy/tokens/near-Bloom/history), no shame language | **NEW** — ReturnCues stat-chip rail on FlowgridHome (D-05/D-06/D-07/D-08). |
</phase_requirements>

## Project Constraints (from AGENTS.md)

Directives with the same authority as locked decisions — research does not recommend approaches that contradict them:

- **Protected core interaction:** `open app → tap Cell → start session` must stay easy. The CorePanel and ReturnCues rail MUST NOT obstruct the Generator flow on FlowgridHome (D-08 places the rail above canvas, below the resume banner; the Start button stays the obvious primary action).
- **Architecture boundaries (ESLint + boundary-scanner enforced):** `domain`/`simulation` import no DOM/React/Pixi/Dexie/Zustand/browser-timers; `persistence` runs no simulation rules; `ui` dispatches commands + reads selectors, never computes economy rules; Pixi is not imported from UI panels. The boundary scanner (`tests/simulation/boundaries.test.ts` + `tests/persistence/boundaries.test.ts`) + ESLint `no-restricted-paths` enforce this — all new files must comply.
- **Economy safety:** no negative resources, no token duplication, no forge-count reset, no offline production exploits, no route-allocation drift, no same-tick infinite loops. Integer units everywhere (`IntNonNegative`/`IntPercent`/`IntSeconds`); multiply-then-floor.
- **Recovery design:** Rejuvenation must matter mechanically but rest farming requires Core Charge created by prior activity (D-03 preserves this: 0 Charge → no-op).
- **Prestige rule:** Forge count must not reset (Phase 5 concern, but Module-Token earning in Phase 4 must be monotonic-safe — `validateMonotonicCounters` already guards this).
- **History is sacred:** `RejuvenationRecord` rows are append-only (parallels `SessionRecord`); never mutated/deleted.
- **Testing:** Pure simulation tests are highest leverage; every command validates invariants after execution.
- **Stack (locked):** React 19, Vite 8, Router v7, Tailwind 4, PixiJS 8, Radix UI, lucide-react, Zustand 5, Dexie 4, Zod 4, Vitest 4, fast-check. **No new packages this phase.**

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Duration-gated Charge→Integration math | **API/Simulation** (`src/simulation`) | — | Pure deterministic command handler; economy truth lives here, never in UI. Mirrors `complete-focus-session.ts`. |
| Geometric threshold → Module Token grants | **API/Simulation** (`src/simulation`) + **Content** (`src/content`) | — | Threshold curve is a content constant; the grant loop is simulation logic. Derived from monotonic `moduleTokens` (no persisted nextThreshold). |
| Energy-spend upgrade (Activation boost) | **API/Simulation** (`src/simulation`) | — | New command validates cost/cap, decrements Energy, increments `activationBoostLevel`. |
| Activation bonus derivation in focus | **API/Simulation** (`src/simulation`) | — | `complete_focus_session` reads `core.activationBoostLevel`; UI never computes the bonus. |
| Active-session marker (focus XOR rejuvenation) | **Database/Storage** (durable field) + **API/Simulation** (enforces invariant) | **App store** (projects marker) | Durable so reload detects interrupted sessions; simulation rejects cross-starts; store mirrors for React selectors. |
| Rejuvenation append-only history | **Database/Storage** (`src/persistence`) | — | `RejuvenationRecord` rows in Dexie `rejuvenations` store; diff-write + idempotent upsert. |
| Dexie v2→v3 schema migration | **Database/Storage** (`src/persistence/database.ts`) | — | Adds store + Core field transform; runs once on upgrade. |
| Export/restore of rejuvenations | **Database/Storage** (`src/persistence/export-json` + `import`) | — | JsonArchive gains `rejuvenations`; Zod schema + replace/merge import cover it. |
| CorePanel (allocation, boost, start/finish rest) | **Browser/Client UI** (`src/ui`) | — | React + Radix; dispatches commands via `dispatch`, reads selectors. Never computes economy. |
| RejuvenationSummary (completion feedback) | **Browser/Client UI** (`src/ui`) | — | Inline panel reading `lastCompletedRejuvenation` store field (mirrors `SessionSummary`). |
| Cosmetic rejuvenation timer | **Browser/Client UI** (`src/ui`) | — | `setInterval` display only; decoupled from durable truth (D-04/D-06 carry-over). |
| ReturnCues stat-chip rail | **Browser/Client UI** (`src/ui/flowgrid-home`) | — | Reads snapshot, derives actionable-state booleans, renders chips; near-Bloom chip navigates. |
| `/core` route | **Browser/Client UI** (`src/app/routes.tsx`) | — | Peer to `/` and `/cells/:id`. |
| Core/rejuvenation visual events | **CDN/Render** (`src/render` — Phase 6) | **API/Simulation** (emits) | Phase 4 MAY emit visual events but they are dropped/logged per Phase 3 D-02; animation is Phase 6. |

## Standard Stack

> **No new packages this phase.** Every dependency below is already installed (see `package.json`) and proven in Phases 1–3. Versions verified against the lockfile. The Package Legitimacy Audit is therefore "no new external packages — N/A."

### Core (all already in `package.json` — `[VERIFIED: lockfile]`)

| Library | Version (locked) | Purpose in Phase 4 | Why Standard |
|---------|------------------|--------------------|--------------|
| TypeScript | `^6.0.3` | All new records/commands/UI types; exhaustive switch gives compile-time safety for the new command union members | Project language since Phase 1; `strict` on |
| React | `^19.2.7` | CorePanel, RejuvenationSummary, ReturnCues, RejuvenationTimer | Phase 3 shell proven |
| react-router | `^7.18.0` | New `/core` route | Phase 3 routing proven |
| Zustand | `^5.0.14` | `lastCompletedRejuvenation` + `activeRejuvenation` store fields | `flowgrid-store.ts` vanilla store extends in place |
| Dexie | `^4.4.4` | v2→v3 migration + `rejuvenations` store | Phase 2 spine proven |
| Zod | `^4.4.3` | `rejuvenationSchema` + `coreSchema` field additions (import boundary only) | Phase 2 boundary proven |
| `@radix-ui/react-*` | `^1.x`/`^2.x` | CorePanel allocation control (slider/dialog as needed) | Phase 3 dialogs proven |
| lucide-react | `^1.21.0` | CorePanel / ReturnCues icons | Phase 3 icons proven |
| Tailwind CSS | `^4.3.1` | CorePanel + ReturnCues styling (reuse `text-sm text-slate-400` chip idiom) | Phase 3 styling proven |

### Supporting (test-only — already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `^4.1.9` | New command handlers, migration fixtures, invariant/property tests | Every simulation change; `npx vitest run` |
| fast-check | `^4.8.0` | Property tests: allocation sum, monotonic tokens/integration, no-negative-resources, rejuvenation-requires-charge | `tests/properties/` — extend existing property suite |
| fake-indexeddb | `^6.2.5` | v2→v3 migration + repository diff-write tests for rejuvenations | `tests/persistence/` — extends migration-harness + repository suites |
| happy-dom | `^20.10.6` | CorePanel/ReturnCues component tests if added | `tests/ui/` (new dir if component tests are written) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Deriving `nextThreshold` from `moduleTokens` | Persisting a `nextThreshold` field | Derive: no migration field, can't drift, naturally monotonic. **Derive wins** (see Don't Hand-Roll). |
| CoreRecord `activeRejuvenationStartedAt` field | Generalized app-wide active-session record | Field: parallel to `CellRecord.activeSessionStartedAt`, minimal migration, simple cross-check. **Field wins** (Agent's Discretion recommendation). |
| Command trio (start/log/cancel rejuvenation) | Single `log_rejuvenation` that manages everything | Trio: mirrors focus exactly, durable marker for reload-resume (D-02 mandatory). **Trio wins** (single command can't satisfy reload-resume). |
| Dedicated `/core` route | Embedded Core section on FlowgridHome | Route: matches `docs/gameplay-spine-draft.md` §3 "Core View" as a major surface; keeps Home uncluttered. **Route wins** (Agent's Discretion recommendation). |

**Installation:**
```bash
# NONE — no new packages. All dependencies already in package.json from Phases 1–3.
```

## Package Legitimacy Audit

> **No new external packages are installed this phase.** Every library consumed is already in `package.json` (verified against the lockfile) and was vetted in Phases 1–3. The legitimacy gate is therefore **N/A — skipped (no new packages)**.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| *(none new)* | — | — | — | — | — | N/A — all deps pre-existing |

**Packages removed due to [SLOP] verdict:** none (none proposed).
**Packages flagged as suspicious [SUS]:** none.

*No packages discovered via WebSearch or training data this phase — this is a pure codebase-extension phase using the locked Phase 1–3 stack.*

## Architecture Patterns

### System Architecture Diagram

```
                                  FLOWGRID PHASE 4 — ACTIVITY/REST ALTERNATION LOOP
                                  ════════════════════════════════════════════════

  USER ACTION                  UI (src/ui)                  APP STORE              SIMULATION              PERSISTENCE
  ────────────                 ──────────                    ──────────              ──────────              ────────────
                                                                                    (pure, deterministic)   (Dexie, diff-write)
  tap Cell → Start    ┌─GeneratorTile─┐                                                          │
  focus session       │ start_focus_   │                                                          │
                     └►session────────┼─► dispatch ──► runSimulationCommand ──► completeFocus  │
                                          │           (src/app/store/            Session        │
                                          │            dispatch.ts)              │              │
                                          │                                  routes Current    │
                                          │                                  →Core, splits    │
                                          │                                  Energy/Charge    │
                                          │                                  bonus = 10+lvl×5 │
                                          │                                          │      │
                                          │                              Repository.applyResult
                                          │                              (diff prev vs next)│
                                          │                                          │      │
                                          │                              ┌─────────▼──────────▼┐
                                          │                              │ Dexie v3 stores:    │
                                          │                              │ cells, core(+2fld), │
                                          │                              │ sessions, ops,      │
                                          │                              │ REJUVENATIONS (new) │
                                          │                              └─────────▲──────────┘
                                          │                                        │
  open /core,        ┌─CorePanel──────┐  │                                        │ loadSnapshot
  set allocation     │ set_core_      ├──┤                                        │ (rehydrate)
  purchase boost     │  allocation    │  │                                        │
  start/finish rest  │ purchase_      │  │                                        │
                     │  activation_   │  │                                        │
                     │  boost         │  │                                        │
                     │ start_rejuv    │  │                                        │
                     │ log_rejuv      │  │                                        │
                     │ cancel_rejuv   │  │                                        │
                     └────────────────┘  │
                              │          │
              ┌───────────────▼──────┐   │     ┌─log_rejuvenation handler────────┐
              │ lastCompleted        │   │     │ durationMin=floor((end-start)   │
              │  Rejuvenation──────► │   │     │  /60000)                        │
              │ RejuvenationSummary  │   ├────►│ chargeProc=min(charge, min×10)  │
              │ (inline, persists    │   │     │ integration+=floor(proc/2)      │
              │  until next action)  │   │     │ charge-=integration×2           │
              └──────────────────────┘   │     │ loop: while integ≥threshold(tokens)│
                                         │     │   tokens++; (threshold derived) │
  open Flowgrid   ┌─ReturnCues─────┐    │     │ append RejuvenationRecord       │
  (after a gap)   │ stat-chip rail │    │     │   (id 1:1 w/ operationId)        │
                  │ Charge│Energy│  │    │     └──────────────────────────────────┘
                  │ Tokens│Near-   │    │
                  │ Bloom(tappable)│    │      One-active-session invariant (D-02):
                  └────────┬───────┘    │      start_focus rejects if core.activeRejuvenation-
                           │            │       StartedAt≠null; start_rejuv rejects if any cell
                           ▼            │       .activeSessionStartedAt≠null OR core marker set
                  navigate('/cells/:id')        ── at most ONE non-null marker app-wide ──
```

**Tracing the primary use case (rest → token):** User opens `/core` → taps Start Rejuvenation → `start_rejuvenation` sets `core.activeRejuvenationStartedAt` (durable) → cosmetic `RejuvenationTimer` ticks → user taps Finish → `log_rejuvenation` derives `durationMinutes` → computes `chargeProcessed = min(coreCharge, minutes×10)` → `integrationGained = floor(processed/2)` → decrements Charge → loops threshold grants → appends `RejuvenationRecord` → repository diff-writes core + appends record → store sets `lastCompletedRejuvenation` → `RejuvenationSummary` renders Charge processed / Integration gained / tokens granted / distance to next threshold.

### Recommended Project Structure (Phase 4 additions/changes)

```
src/
├── domain/
│   ├── records.ts          # MODIFY: +activationBoostLevel, +activeRejuvenationStartedAt on CoreRecord;
│   │                       #         +RejuvenationRecord interface; +rejuvenations on FlowgridSnapshot
│   ├── result.ts           # MODIFY: +StartRejuvenationCommand, +CancelRejuvenationCommand,
│   │                       #         +PurchaseActivationBoostCommand; REFACTOR LogRejuvenationCommand (startedAt/endedAt)
│   ├── ids.ts              # MODIFY: +RejuvenationId; +'rejuvenation' EntityType
│   └── invariants.ts       # MODIFY: +integration regression check; +activationBoostLevel regression check
├── content/
│   └── formulas.ts         # MODIFY: +REJUVENATION_CHARGE_PER_MINUTE, +INTEGRATION_THRESHOLD_BASE/RATIO,
│   │                       #         +ACTIVATION_BOOST_* constants; +nextIntegrationThreshold/activationBonusPercent fns
│   ├── starter-state.ts    # MODIFY: seed CoreRecord with the 2 new fields (activationBoostLevel=0, activeRejuvenationStartedAt=null)
│   └── index.ts            # MODIFY: export new constants/functions
├── simulation/
│   ├── engine.ts           # MODIFY: +start_rejuvenation/cancel_rejuvenation/purchase_activation_boost cases;
│   │                       #         replace logRejuvenationNotImplemented with real handler
│   ├── commands/
│   │   ├── log-rejuvenation.ts        # NEW (replaces not_implemented stub) — the finish handler
│   │   ├── start-rejuvenation.ts      # NEW — sets marker, enforces mutual exclusion
│   │   ├── cancel-rejuvenation.ts     # NEW — clears marker, no payout
│   │   ├── purchase-activation-boost.ts # NEW — Energy-spend upgrade
│   │   └── complete-focus-session.ts  # MODIFY: bonus = ACTIVATION_CURRENT_BONUS_PERCENT + level×5
│   ├── systems/
│   │   └── rejuvenation.ts            # NEW — pure threshold-grant + payout fns (or fold into formulas.ts)
│   ├── economy-events.ts   # MODIFY: +rejuvenationCompleted/tokenGranted/activationBoostPurchased helpers
│   ├── visual-events.ts    # MODIFY (optional): +coreRejuvenationVisual/coreBoostVisual (dropped per D-02)
│   └── operation-events.ts # MODIFY: +entityType/entityId for the 4 new command types
├── persistence/
│   ├── database.ts         # MODIFY: +version(3) with rejuvenations store + upgradeCoresV2ToV3 transform
│   ├── diff.ts             # MODIFY: +appendRejuvenations in FlowgridWritePlan
│   ├── repository.ts       # MODIFY: +rejuvenations in ALL_STORE_NAMES + appendRejuvenations write + loadSnapshot read
│   ├── export-json.ts      # MODIFY: +rejuvenations in JsonArchive; bump ARCHIVE_VERSION→2
│   ├── import.ts           # MODIFY: +rejuvenations in ALL_STORE_NAMES + replace/merge handling
│   └── validation-schemas.ts # MODIFY: +rejuvenationSchema; +coreSchema fields; archiveSchema v1/v2 handling
├── app/
│   ├── store/
│   │   ├── flowgrid-store.ts # MODIFY: +lastCompletedRejuvenation, +activeRejuvenation projection
│   │   └── dispatch.ts       # MODIFY: +captureCompletedRejuvenation; +deriveActiveRejuvenation; generalize capture
│   └── routes.tsx            # MODIFY: +/core route
└── ui/
    ├── core-panel/
    │   ├── CorePanel.tsx             # NEW — the six-piece Core surface (CORE-05)
    │   ├── RejuvenationSummary.tsx   # NEW — inline completion panel (REJ-05, mirrors SessionSummary)
    │   ├── RejuvenationTimer.tsx     # NEW — cosmetic timer (mirrors SessionTimer)
    │   └── nextCoreAction.ts         # NEW — pure next-action selector (mirrors nextAction.ts)
    └── flowgrid-home/
        └── ReturnCues.tsx            # NEW — stat-chip rail (UI-07, D-05/D-06/D-07/D-08)

tests/
├── simulation/
│   ├── rejuvenation.test.ts          # NEW — handler: duration-gating, thresholds, no-op rest, multi-grant, replay
│   ├── activation-boost.test.ts      # NEW (or extend activation-bonus.test.ts) — upgrade cost/cap/bonus derivation
│   └── foundation-loop.test.ts       # VERIFY still green (complete_focus_session signature unchanged externally)
├── properties/
│   └── rejuvenation-safety.property.test.ts # NEW — monotonic integration/tokens, no-negative, rest-farming guard
└── persistence/
    ├── migration-harness.test.ts     # EXTEND — +upgradeCoresV2ToV3 fixture
    ├── repository.test.ts            # EXTEND — rejuvenations diff-write + idempotent append
    ├── schema.test.ts                # EXTEND — v3 store declaration
    └── export-json.test.ts / import-*.test.ts # EXTEND — rejuvenations round-trip
```

### Pattern 1: Command handler (validate → apply → emit → return)
**What:** Every simulation command follows the identical shape proven in `set-core-allocation.ts` and `start-focus-session.ts`.
**When to use:** All 4 new command handlers (`log-rejuvenation`, `start-rejuvenation`, `cancel-rejuvenation`, `purchase-activation-boost`).
**Example:**
```typescript
// Source: src/simulation/commands/set-core-allocation.ts (the canonical template)
export function purchaseActivationBoost(prev, command, env): SimulationResult {
  const issues: ValidationIssue[] = [];
  const level = prev.core.activationBoostLevel;
  const cost = activationBoostCost(level);          // null if at cap
  if (cost === null) {
    issues.push({ code: 'invalid_reference', /* "already at cap (3)" */ });
  } else if (prev.core.energy < cost) {
    issues.push({ code: 'invalid_reference', /* "energy below cost" */ });
  }
  if (issues.length > 0) return rejectWith(prev, issues);  // state unchanged

  const newCore = { ...prev.core, energy: prev.core.energy - cost,
                    activationBoostLevel: level + 1, updatedAt: env.now };
  const operation = operationFromCommand(command, env.now, { entityId: prev.core.id, payload: { level: level+1, cost } });
  return { status: 'applied', previousState: prev,
           nextState: { ...prev, core: newCore, operations: [...prev.operations, operation],
                        client: { ...prev.client, updatedAt: env.now } },
           economyEvents: [/* activationBoostPurchasedEvent */], visualEvents: [],
           operations: [operation], validationIssues: [] };
}
```
**Key:** rejected results write NOTHING durable (Phase 2 D-02); the dispatcher surfaces `validationIssues[0].message` via `lastRejection` (already wired in `dispatch.ts:77-79`).

### Pattern 2: Active-session marker + mutual exclusion (D-05/D-02)
**What:** Phase 3 stores `CellRecord.activeSessionStartedAt`; `start_focus_session` scans all cells and rejects if any is non-null. Phase 4 generalizes this across focus XOR rejuvenation.
**When to use:** `start_focus_session` (MODIFY) and `start_rejuvenation` (NEW).
**Example:**
```typescript
// Source pattern: src/simulation/commands/start-focus-session.ts:65-78
// start_rejuvenation must reject if ANY cell has activeSessionStartedAt OR core already has activeRejuvenationStartedAt:
function hasActiveFocus(state): boolean {
  for (const cell of state.cells.values()) if (cell.activeSessionStartedAt !== null) return true;
  return false;
}
// start_focus_session gains a parallel check:
if (state.core.activeRejuvenationStartedAt !== null) { issues.push({/* "rejuvenation in progress" */}); }
```

### Pattern 3: Inline completion panel mirroring SessionSummary (D-09)
**What:** A store field `lastCompletedRejuvenation` captures the finished rejuvenation; the panel renders from it; it persists until the next dispatch clears it (D-10).
**When to use:** `RejuvenationSummary`.
**Example:**
```typescript
// Source: src/app/store/dispatch.ts:93-101 (captureCompletedSession) + :109-118
function captureCompletedRejuvenation(command, result): RejuvenationRecord | undefined {
  if (command.type !== 'log_rejuvenation') return undefined;
  const rejuvs = result.nextState.rejuvenations;
  return rejuvs.find((r) => r.id === command.operationId) ?? rejuvs[rejuvs.length - 1];
}
// store setState spreads ...{ lastCompletedRejuvenation } when defined; initApp sets it null.
```

### Pattern 4: Dexie versioned migration (extracted transform)
**What:** `version(N).stores({...full set...}).upgrade(async tx => { await tx.table('core').toCollection().modify(upgradeCoresV2ToV3); })`. The transform is a pure exported function testable without IndexedDB.
**When to use:** v2→v3 migration.
**Example:**
```typescript
// Source: src/persistence/database.ts:54-64 (upgradeCellsV1ToV2) + :99-111 (version(2))
export const CORE_V3_DEFAULTS = { activationBoostLevel: 0, activeRejuvenationStartedAt: null } as const;
export function upgradeCoresV2ToV3(core: Record<string, unknown>): Record<string, unknown> {
  if (core.activationBoostLevel === undefined) core.activationBoostLevel = CORE_V3_DEFAULTS.activationBoostLevel;
  if (core.activeRejuvenationStartedAt === undefined) core.activeRejuvenationStartedAt = CORE_V3_DEFAULTS.activeRejuvenationStartedAt;
  return core;
}
// version(3).stores({ /* ALL 10 stores verbatim, +rejuvenations: 'id, createdAt' */ }).upgrade(async tx => {
//   await tx.table('core').toCollection().modify(upgradeCoresV2ToV3);
// });
```

### Anti-Patterns to Avoid
- **Hand-computing the Activation bonus in the UI.** UI must read `core.activationBoostLevel` and display; the bonus math (`10 + level×5`) lives in `complete-focus-session.ts`. Violates the "UI never computes economy rules" boundary.
- **Persisting `nextThreshold` separately.** It drifts from `moduleTokens`; derive it. (See Don't Hand-Roll.)
- **Single `log_rejuvenation` command that also starts.** Breaks reload-resume (D-02) — no durable marker survives reload. Must be a trio.
- **Mutating `RejuvenationRecord` after creation.** History is sacred (append-only); no update/delete path. (Mirrors `SessionRecord`.)
- **Using `Math.random()` in the rejuvenation handler.** Breaks deterministic replay (Phase 1 D-08). The handler is fully deterministic from inputs.
- **Floats in durable economy values.** The `1.5` threshold ratio is a multiplier inside `Math.floor(50 × Math.pow(1.5, n))` — the result is always floored to an integer before storage; the float never persists.
- **Forgetting to repeat ALL stores verbatim in `version(3).stores({...})`.** Dexie requires the full store set when a version replaces the prior declaration context (documented Phase 2 gotcha).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geometric threshold "next" value | A persisted `nextThreshold` field + manual advance logic | **Derive:** `nextIntegrationThreshold(moduleTokens) = Math.floor(50 × Math.pow(1.5, moduleTokens))` | A persisted field drifts from the count and needs migration; deriving from the monotonic `moduleTokens` counter is simpler, naturally monotonic, and recoverable. |
| Activation bonus percent | A separate `activationBonusPercent` Core field | **Derive:** `ACTIVATION_CURRENT_BONUS_PERCENT + activationBoostLevel × ACTIVATION_BOOST_PER_LEVEL` at read time in `complete_focus_session` | Only the level is durable; the derived percent follows from the locked constants. Persisting the percent duplicates state. |
| Rejuvenation duration tracking | Live-ticking economy state during the rest | **Diff for truth:** compute `durationSeconds = floor((endedAt−startedAt)/1000)` at finish only; cosmetic `setInterval` for the timer display | Phase 3 D-06 carry-over (D-04). Live-ticking durable state breaks deterministic replay and risks same-tick loops. |
| Rejuvenation append-only integrity | Custom update/delete guards | **Reuse** the existing `idempotentAppend` + `diffAppend` + replace/merge import machinery | Phase 2 D-04 already provides byte-identical idempotent upsert; just add `appendRejuvenations` to the write plan. |
| Allocation sum invariant | A new validator | **Reuse** `validateCoreAllocation` + `isCoreAllocationValid` | Already enforces `convert + store === 100` with integer 0–100 bounds. |
| Rejection feedback to UI | A new error channel | **Reuse** `lastRejection` store field + `dispatch.ts:77-79` | Already surfaces `validationIssues[0].message`; the new commands' rejections (at-cap, energy-below-cost) flow through unchanged. |
| Migration testability | A live-IndexedDB-only migration | **Reuse** the extracted-transform + `runMigrationFixture` harness pattern (`upgradeCellsV1ToV2` + `migration-harness.test.ts`) | Phase 2 D-07 harness exercises the transform without a browser; `upgradeCoresV2ToV3` plugs straight in. |

**Key insight:** Phase 4's highest-risk hand-roll temptation is the threshold system. The math `floor(50 × 1.5ⁿ)` is deceptively simple but a persisted-counter approach invites drift bugs (what if a token is granted but `nextThreshold` isn't advanced? what if constants are retuned?). Deriving eliminates the entire class — the threshold is always exactly correct for the current token count.

## Common Pitfalls

### Pitfall 1: Missing `start_rejuvenation`/`cancel_rejuvenation` commands (SPEC/CONTEXT reconciliation gap)
**What goes wrong:** The planner reads SPEC.md which lists only `log_rejuvenation`, implements just the finish handler, and D-02's "reload surfaces a resume-or-discard prompt for an interrupted rejuvenation" silently cannot work (no durable marker was ever set).
**Why it happens:** SPEC R3 was authored before CONTEXT D-01/D-02 reframed rejuvenation as a live-timed session. The SPEC text still says "log_rejuvenation is a live timed session" but the *command* named is only the finish.
**How to avoid:** Implement the command TRIO: `start_rejuvenation` (sets `core.activeRejuvenationStartedAt`, enforces mutual exclusion) + `log_rejuvenation` (finish, clears marker, computes payout) + `cancel_rejuvenation` (clears marker, no payout — the "discard" half of resume-or-discard). Mirror `start/complete/cancel_focus_session` exactly.
**Warning signs:** No `activeRejuvenationStartedAt` field gets written; the reload path can't detect an interrupted rest.

### Pitfall 2: Forgetting the cross-type one-active-session invariant
**What goes wrong:** `start_focus_session` is modified to set its marker but not updated to check `core.activeRejuvenationStartedAt` (or vice versa). A user starts rest, then navigates to a Cell and starts focus — two sessions run "simultaneously", violating D-02.
**Why it happens:** Phase 3's check only scanned cells; the new Core marker is easy to miss.
**How to avoid:** BOTH start commands must check BOTH markers: `start_focus_session` rejects if `core.activeRejuvenationStartedAt !== null`; `start_rejuvenation` rejects if any `cell.activeSessionStartedAt !== null`. Add a property test: at most one non-null marker across the whole snapshot after any command sequence.
**Warning signs:** An invariant test "only one active session app-wide" fails.

### Pitfall 3: Odd-Charge remainder lost (precision regression)
**What goes wrong:** Implementing `chargeConsumed = chargeProcessed` (consuming the raw floored amount) instead of `chargeConsumed = integrationGained × 2`. With 101 Charge + ≥11 min rest, `chargeProcessedRaw = min(101, 110) = 101`; `integrationGained = floor(101/2) = 50`; correct `chargeConsumed = 50×2 = 100`, retaining 1. A naive `chargeConsumed = 101` loses the odd unit (101→0 instead of 101→1).
**Why it happens:** The SPEC R3 amendment formula has THREE steps (`chargeProcessedRaw`, `integrationGained`, `chargeConsumed`); collapsing them into two loses the remainder-retention property.
**How to avoid:** Implement the formula verbatim from SPEC R3 / CONTEXT D-03: compute `integrationGained = floor(chargeProcessedRaw / 2)`, THEN `chargeConsumed = integrationGained × 2`. Test the 101-Charge case explicitly (acceptance criterion).
**Warning signs:** The "101 Charge → 1 retained" acceptance test fails.

### Pitfall 4: Multi-threshold grant loop becomes infinite
**What goes wrong:** A `while (integration >= nextThreshold)` loop that advances `nextThreshold` from a *persisted* field but also grants tokens — if the threshold doesn't advance (off-by-one, or deriving from the pre-grant token count), the loop never terminates.
**Why it happens:** Mixing persisted-threshold and derived-threshold logic, or computing `nextThreshold` from `moduleTokens` before incrementing it in the loop.
**How to avoid:** Derive `nextThreshold(moduleTokens)` and increment `moduleTokens` inside the loop so the derived value advances each iteration. The loop is bounded because each grant raises the token count, raising the threshold (50→75→112…), and Integration only decreases never (it's fixed for this command). Add a property test: rejuvenation terminates and grants ≥0 tokens.
**Warning signs:** Test timeout / stack overflow on a large-Integration rejuvenation.

### Pitfall 5: ARCHIVE_VERSION bump forgotten (export/restore breaks)
**What goes wrong:** `rejuvenations` is added to `JsonArchive` + `archiveSchema` as a required field, but `archiveVersion` stays `z.literal(1)`. An old v1 archive (without `rejuvenations`) now fails import validation silently, OR a new export claims version 1 but has a field old importers don't expect.
**Why it happens:** The four-version-axes note is easy to overlook; adding a collection is an envelope-shape change (archiveVersion axis), distinct from the Dexie store-shape change (schema version axis).
**How to avoid:** Bump `ARCHIVE_VERSION` to 2 and accept both `1` and `2` in `archiveSchema` (v1 transform: inject `rejuvenations: []`). Since no real archives ship in dev, this is low-risk but documents the shape change correctly.
**Warning signs:** An import-restore test using a hand-built v1 fixture fails.

### Pitfall 6: `complete_focus_session` bonus change breaks existing tests
**What goes wrong:** Changing the bonus line in `complete-focus-session.ts:160-162` from `ACTIVATION_CURRENT_BONUS_PERCENT` (10) to `ACTIVATION_CURRENT_BONUS_PERCENT + level×5` without ensuring `level` defaults to 0 on old data — the activation-bonus test expects +10% but gets NaN/undefined×5.
**Why it happens:** The new `activationBoostLevel` field isn't defaulted in the migration or the starter state.
**How to avoid:** The v2→v3 migration MUST default `activationBoostLevel = 0` on existing cores (Pattern 4). Starter state seeds it 0. Then level-0 behavior is byte-identical to Phase 3 (10%). The existing `activation-bonus.test.ts` stays green; a new test covers level>0.
**Warning signs:** `activation-bonus.test.ts` regresses; or `bonusPercent` computes to NaN.

### Pitfall 7: Boundary-scanner failure from a stray import
**What goes wrong:** A new `src/simulation/commands/*.ts` file imports React, Dexie, `Date.now`, or relatively into `../app`/`../ui`/`../persistence`. The boundary scanner test (`tests/simulation/boundaries.test.ts`) fails the build.
**Why it happens:** Copy-pasting from a UI file, or using `new Date()` instead of `env.now`.
**How to avoid:** All new simulation code uses ONLY `env.now` (injected) for time, imports nothing outside `src/domain` + `src/content` + `src/simulation`. The scanner runs on every `npx vitest run`.
**Warning signs:** `tests/simulation/boundaries.test.ts` fails with a violation list.

## Code Examples

Verified patterns drawn directly from the Phase 1–3 codebase (the authoritative source for this phase — no external research needed since all mechanics are locked in SPEC.md and the patterns are already proven in-tree).

### The duration-gated rejuvenation payout (SPEC R3 / CONTEXT D-03)
```typescript
// Source: 04-SPEC.md R3 (amended) + 04-CONTEXT.md D-03 — to be implemented in
// src/simulation/commands/log-rejuvenation.ts
import { REJUVENATION_CHARGE_PER_MINUTE, INTEGRATION_THRESHOLD_BASE,
         INTEGRATION_THRESHOLD_RATIO, nextIntegrationThreshold } from '../../content/index.js';

// durationSeconds derived from command.startedAt/endedAt (mirrors CompleteFocusSessionCommand):
const durationSeconds = Math.floor(
  (new Date(command.endedAt).getTime() - new Date(command.startedAt).getTime()) / 1000,
);
const durationMinutes = Math.floor(durationSeconds / 60);

// Step 1: duration-gated processing, capped by available Charge.
const chargeProcessedRaw = Math.min(
  prev.core.coreCharge,
  Math.floor(durationMinutes * REJUVENATION_CHARGE_PER_MINUTE),  // min×10
);
// Step 2: 2:1 conversion (odd remainder retained by snapping consumption to the even grid).
const integrationGained = Math.floor(chargeProcessedRaw / 2);
const chargeConsumed = integrationGained * 2;   // NOT chargeProcessedRaw — retains odd remainder
// Step 3: apply to core.
const coreAfterCharge = {
  ...prev.core,
  coreCharge: prev.core.coreCharge - chargeConsumed,
  integration: prev.core.integration + integrationGained,
  updatedAt: env.now,
};
// Step 4: threshold-grant loop (derive threshold from token count — advances as tokens++).
let moduleTokens = coreAfterCharge.moduleTokens;
while (coreAfterCharge.integration >= nextIntegrationThreshold(moduleTokens)) {
  moduleTokens += 1;
}
const newCore = { ...coreAfterCharge, moduleTokens, updatedAt: env.now };
const tokensGranted = moduleTokens - prev.core.moduleTokens;
// 0 Charge → chargeProcessedRaw=0 → integrationGained=0 → tokensGranted=0 (no-op rest, REJ-03).
// ALWAYS append a RejuvenationRecord (id 1:1 with operationId).
```

### The derived threshold function (Don't Hand-Roll)
```typescript
// Source: 04-SPEC.md R4 — to be added to src/content/formulas.ts
export const INTEGRATION_THRESHOLD_BASE = 50;
export const INTEGRATION_THRESHOLD_RATIO = 1.5;  // multiplier only; result always Math.floor-ed
// threshold(n) for n tokens already granted = floor(50 × 1.5^n)
// Sequence: n=0→50, n=1→75, n=2→112, n=3→168, n=4→252  ✓ matches SPEC acceptance
export function nextIntegrationThreshold(moduleTokens: number): number {
  return Math.floor(INTEGRATION_THRESHOLD_BASE * Math.pow(INTEGRATION_THRESHOLD_RATIO, moduleTokens));
}
```

### The Activation-bonus derivation change (CORE-06 wiring into focus)
```typescript
// Source: src/simulation/commands/complete-focus-session.ts:155-162 (MODIFY) +
//         04-CONTEXT.md Phase 1–3 Code Contracts + D-15 carry-over
import { ACTIVATION_CURRENT_BONUS_PERCENT, activationBonusPercent } from '../../content/index.js';
// formulas.ts additions:
export const ACTIVATION_BOOST_PER_LEVEL = 5;
export const ACTIVATION_BOOST_MAX_LEVEL = 3;
export const ACTIVATION_BOOST_COSTS = [50, 100, 200] as const;  // cost for level 1, 2, 3
export function activationBoostCost(currentLevel: number): number | null {
  return currentLevel < ACTIVATION_BOOST_COSTS.length ? ACTIVATION_BOOST_COSTS[currentLevel] : null;
}
export function activationBonusPercent(level: number): number {
  return ACTIVATION_CURRENT_BONUS_PERCENT + level * ACTIVATION_BOOST_PER_LEVEL;  // 10, 15, 20, 25
}
// complete-focus-session.ts change (line ~160):
const bonusPercent = activationBonusPercent(prev.core.activationBoostLevel);  // 10 at level 0
const currentGenerated = isActivatedToday
  ? baseCurrent + Math.floor((baseCurrent * bonusPercent) / 100)
  : baseCurrent;
```

### The new CoreRecord + RejuvenationRecord shapes
```typescript
// Source: src/domain/records.ts:54-65 (MODIFY) + 04-CONTEXT.md Phase 1–3 Code Contracts
export interface CoreRecord {
  readonly id: CoreId;
  readonly energy: IntNonNegative;
  readonly coreCharge: IntNonNegative;
  readonly lifetimeEnergy: IntNonNegative;
  readonly integration: IntNonNegative;
  readonly moduleTokens: IntNonNegative;
  readonly convertAllocationPercent: IntPercent;
  readonly storeAllocationPercent: IntPercent;
  readonly forgeCount: IntNonNegative;
  readonly activationBoostLevel: IntNonNegative;                      // NEW (Phase 4 / CORE-06)
  readonly activeRejuvenationStartedAt: IsoDateTimeString | null;     // NEW (Phase 4 / D-02)
  readonly updatedAt: IsoDateTimeString;
}
export interface RejuvenationRecord {  // NEW — append-only, id 1:1 with operationId
  readonly id: RejuvenationId;
  readonly startedAt: IsoDateTimeString;
  readonly endedAt: IsoDateTimeString;
  readonly durationSeconds: IntSeconds;
  readonly chargeConsumed: IntNonNegative;
  readonly integrationGained: IntNonNegative;
  readonly tokensGranted: IntNonNegative;
  readonly createdAt: IsoDateTimeString;
}
// FlowgridSnapshot gains: readonly rejuvenations: readonly RejuvenationRecord[];
```

### The v2→v3 migration (Pattern 4 applied)
```typescript
// Source: src/persistence/database.ts:82-111 (EXTEND with version(3))
this.version(3).stores({
  client: 'id',
  cells: 'id',
  core: 'id',
  moduleInstances: 'id, ownerCellId',
  routes: 'id, sourceCellId',
  sessions: 'id, cellId, startedAt',
  operations: 'id, status, createdAt',
  settings: 'id',
  forgeHistory: 'id, createdAt',
  rejuvenations: 'id, createdAt',   // NEW store — append-only, indexed by createdAt for recency
}).upgrade(async (tx) => {
  await tx.table('core').toCollection().modify(upgradeCoresV2ToV3);  // adds the 2 new fields
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rejuvenation as retrospective quick-log (`log_rejuvenation` takes `durationSeconds`) | **Live-timed session** (start→timer→finish) per CONTEXT D-01 | Phase 4 discussion (2026-06-24) | Requires a command trio + durable marker; `LogRejuvenationCommand` refactored to `startedAt`+`endedAt` |
| Rejuvenation payout = `f(available Charge)` (duration history-only) | **Duration-gated** payout per CONTEXT D-03 / SPEC R3 amendment | Phase 4 discussion (2026-06-24) | Resting longer processes more Charge (up to the cap); timer is meaningful, not decorative |
| Activation bonus = fixed `ACTIVATION_CURRENT_BONUS_PERCENT` (10) | Derived `10 + activationBoostLevel × 5` (CORE-06) | Phase 4 | Energy now has a spend sink; `complete_focus_session` reads the new Core field |
| Threshold as implicit/absent | Explicit geometric `floor(50×1.5ⁿ)` derived curve | Phase 4 | Module Tokens earned via rejuvenation; monotonic; content-tunable |

**Deprecated/outdated:**
- The `logRejuvenationNotImplemented` stub in `src/simulation/engine.ts:49-50,58-68` — **replaced** by the real handler this phase.
- The `LogRejuvenationCommand` shape `{ type, operationId, durationSeconds }` in `src/domain/result.ts:51-55` — **refactored** to `{ type, operationId, startedAt, endedAt }` (mirrors `CompleteFocusSessionCommand`). Safe to change: it currently returns `not_implemented`, so no real data depends on the old shape.

## Assumptions Log

> Claims tagged `[ASSUMED]` that need user/planner confirmation. Most are mechanical Agent's-Discretion items with a clear recommended default.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A `/core` dedicated route (peer to `/` and `/cells/:id`) is the right Core-panel placement (Agent's Discretion; `docs/gameplay-spine-draft.md` §3 supports it) | Architecture Patterns | Low — an embedded section on Home is the fallback; either keeps the Generator unobstructed. |
| A2 | `activeRejuvenationStartedAt` lives on `CoreRecord` (not a generalized app-wide session record) | Don't Hand-Roll, Patterns | Low — the generalized record is more code for no Phase-4 benefit; the field is the parallel-to-focus choice. |
| A3 | The command set is a TRIO: `start_rejuvenation` + `log_rejuvenation`(finish) + `cancel_rejuvenation` (SPEC lists only `log_rejuvenation`, but D-01/D-02 require start/cancel) | Summary, Pitfalls, Patterns | **Medium** — if the user actually wants a single retrospective `log_rejuvenation` after all, the trio is over-built. But D-01/D-02 are explicit locked decisions ("live timed session mirroring focus", "reload surfaces resume-or-discard"), so the trio is the faithful reading. |
| A4 | `nextThreshold` is DERIVED (`floor(50×1.5ⁿ)`) not persisted | Don't Hand-Roll, Patterns | Low — persisting is a valid alternative needing one migration field; deriving is simpler and recommended. |
| A5 | Upgrade-command rejections (at-cap, energy-below-cost) reuse the existing `invalid_reference` ValidationIssueCode (no new code added) | Pitfalls, Patterns | Low — Phase 1 STATE.md established `invalid_reference` as the input-error fallback code; consistent with `set_core_allocation`. |
| A6 | `ARCHIVE_VERSION` bumps to 2 with a v1→v2 transform injecting `rejuvenations: []` | Pitfalls, Patterns | Low — keeping it 1 and just requiring the field also works since no shipped archives exist; bumping is the documented-clean path. |
| A7 | `cancel_rejuvenation` appends NO record (mirrors `cancel_focus_session`); every *finished* `log_rejuvenation` appends a record (including 0-Charge no-op rest) | Patterns, SPEC R3 | Low — D-03's 0-Charge rule explicitly appends a zero-gain record; cancels are the natural no-record path. |
| A8 | Phase 4 MAY emit Core/rejuvenation visual events but they are dropped/logged (Phase 3 D-02 contract holds; animation is Phase 6) | Architectural Map | None — explicitly locked in CONTEXT.md out-of-scope. |

**If this table were empty:** all claims would be verified/cited. The 8 items above are Agent's-Discretion or reconciliation calls with clear recommended defaults — none block planning.

## Open Questions

1. **Does the user want the `/core` route to be reachable from FlowgridHome nav, or only via direct URL / the return-cue chips?**
   - What we know: D-05/D-06 put a stat-chip rail on Home; near-Bloom navigates to `/cells/:id`. The Core route needs an entry point.
   - What's unclear: whether Energy/Charge/Tokens chips are also tappable → `/core` (CONTEXT Q2 rejected "all chips tappable" — they stay flat). So `/core` needs a separate nav link.
   - Recommendation: Add a "Core" nav link on FlowgridHome (and a Return-to-Home link on CorePanel, mirroring CellBoard's `Link to="/"`). Minimal, keeps Home uncluttered. Planner decides exact placement.

2. **Should a sub-minute rejuvenation finish be treated as a no-op rest (zero-gain record) or routed through cancel?**
   - What we know: D-03's 0-Charge rule appends a zero-gain record. Phase 3 D-08 routes sub-second focus finish through cancel.
   - What's unclear: the rejuvenation parallel — a 30-second rest that the user "finished".
   - Recommendation (Agent's Discretion in CONTEXT): a finished rejuvenation ALWAYS appends a record (even zero-gain); only explicit Cancel appends nothing. This is consistent with D-03 ("rest honored, not rewarded") and avoids a confusing "your finish was secretly a cancel" path. Document in plan.

3. **Should the geometric threshold ratio (`1.5`) ever produce a non-integer before `Math.floor`?**
   - What we know: `Math.pow(1.5, n)` is a float; `Math.floor` snaps it. The float never persists.
   - What's unclear: nothing operationally — the floor guarantees integer thresholds. This is documented to preempt a "no floats in durable values" review concern.
   - Recommendation: add a code comment + a test asserting the first 5 thresholds are exactly `[50, 75, 112, 168, 252]`.

## Environment Availability

> Phase 4 depends only on the Phase 1–3 toolchain already installed and verified. No external services, databases, or CLIs are introduced.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite/Vitest/esbuild build + test | ✓ (Phase 1–3 green) | per `.nvmrc`/lockfile | — |
| IndexedDB (via fake-indexeddb in tests; real in browser) | Dexie v3 migration + repository tests | ✓ | fake-indexeddb `^6.2.5` | — |
| Vitest | All new command/migration/property tests | ✓ | `^4.1.9` | — |
| fast-check | New rejuvenation-safety property tests | ✓ | `^4.8.0` | — |
| Browser (Playwright/happy-dom) | CorePanel/ReturnCues component tests (optional this phase) | ✓ happy-dom `^20.10.6` | — | Property + unit tests cover the economy; component tests are optional |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

## Security Domain

> `security_enforcement` is absent in `.planning/config.json` → treated as enabled. This phase introduces **no new threat surface**: no auth, no network, no secrets, no user-generated text input beyond Phase 3's Cell names, no new external packages. The relevant "security" domain is **economy-safety / data-integrity**, which the existing invariant + Zod + boundary machinery already covers.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local-first offline app; no auth (Phase 6 may revisit) |
| V3 Session Management | no | No server sessions; "session" = a focus/rejuvenation record, not an auth session |
| V4 Access Control | no | Single-user local app; no authorization boundaries |
| V5 Input Validation | **yes** | Zod `rejuvenationSchema` + `coreSchema` field additions at the import boundary; `validateFlowgridSnapshot` after every command; integer `nonnegative()` schemas |
| V6 Cryptography | no | No secrets, no crypto this phase |
| V7 Error Handling & Logging | **yes** | Rejected commands return structured `ValidationIssue[]` (no throws); `lastRejection` surfaces user-facing messages; PersistenceError typed contract |
| V8 Data Protection | **yes** | Append-only `RejuvenationRecord` (history sacred); diff-write in a single Dexie transaction; idempotent upsert prevents duplication |

### Known Threat Patterns for the Local-First Economy Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Rest-farming exploit (progress without prior activity) | Tampering | REJ-03: 0 Core Charge → no-op rest (zero-gain record); enforced in handler + property test |
| Token duplication (replay grants twice) | Tampering | `RejuvenationRecord.id` 1:1 with `operationId`; `idempotentAppend` byte-identical check (Phase 2 D-04) |
| Threshold re-grant (same Integration crosses a threshold twice) | Tampering | Derive threshold from monotonic `moduleTokens`; each grant increments the count, advancing the threshold |
| Free upgrade level (Energy not decremented) | Tampering | `purchase_activation_boost` decrements Energy by exact cost before incrementing level; invariant + test |
| Negative Energy/Charge (underflow) | Tampering | `validateNoNegativeResources` (existing) + Zod `.nonnegative()` schemas; `IntNonNegative` type |
| History mutation (editing a RejuvenationRecord) | Repudiation | No update/delete path in repository; only replace-mode restore clears stores (Phase 2) |
| Cross-layer economy computation (UI computes bonus) | Tampering | ESLint `no-restricted-paths` + boundary scanner; UI dispatches commands only |
| Same-tick infinite loop (threshold grant never terminates) | Denial of Service | Derived threshold advances with each grant (bounded loop); property test asserts termination |

## Sources

### Primary (HIGH confidence — codebase archaeology, the authoritative source for this phase)
- `src/domain/records.ts` — `CoreRecord` (lines 54–65), `FlowgridSnapshot` (132–142): the exact fields Phase 4 extends.
- `src/domain/result.ts` — `LogRejuvenationCommand` (51–55, to be refactored), `SimulationCommand` union (116–127), `ECONOMY_EVENT_NAMES`/`VISUAL_EVENT_NAMES` (155–176): command + event contracts.
- `src/domain/validation.ts` — `ValidationIssueCode` enum (9–17): confirms only 8 codes; new rejections reuse `invalid_reference`.
- `src/domain/invariants.ts` — `validateMonotonicCounters` (213–229): the template for the new integration/level regression checks.
- `src/simulation/engine.ts` — exhaustive switch (32–55) + `logRejuvenationNotImplemented` stub (58–68): the dispatch surface Phase 4 extends.
- `src/simulation/commands/set-core-allocation.ts` — the canonical validate→apply→emit→return template for the new upgrade command.
- `src/simulation/commands/start-focus-session.ts` — the active-session-marker + mutual-exclusion template (65–78).
- `src/simulation/commands/complete-focus-session.ts` — Current routing (188–192) + Activation bonus (155–162, to be modified).
- `src/content/formulas.ts` — `splitCoreCurrent` (59–69), `ACTIVATION_CURRENT_BONUS_PERCENT` (26): where new constants/functions land.
- `src/content/starter-state.ts` — CoreRecord seed (107–118): add the 2 new fields here.
- `src/persistence/database.ts` — v1/v2 declarations (82–111) + `upgradeCellsV1ToV2` (54–64): the migration template.
- `src/persistence/diff.ts` — `FlowgridWritePlan` (28–41) + `diffFlowgridSnapshots` (87–133): add `appendRejuvenations`.
- `src/persistence/repository.ts` — `ALL_STORE_NAMES` (42–52) + `applyResult` (91–130) + `loadSnapshot` (132–171): add `rejuvenations`.
- `src/persistence/export-json.ts` — `JsonArchive` (40–52) + `ARCHIVE_VERSION` (38): add `rejuvenations`, bump version.
- `src/persistence/validation-schemas.ts` — `coreSchema` (51–62) + `archiveSchema` (125–137): add fields + `rejuvenationSchema`.
- `src/app/store/dispatch.ts` — `captureCompletedSession` (109–118) + `deriveActiveSession` (44–52): templates for the rejuvenation parallels.
- `src/app/store/flowgrid-store.ts` — `FlowgridState` (28–52): add `lastCompletedRejuvenation` + `activeRejuvenation`.
- `src/ui/session-summary/SessionSummary.tsx` + `nextAction.ts` — the inline-panel + pure-selector template for `RejuvenationSummary`.
- `src/ui/cell-board/GeneratorTile.tsx` — the start/finish/cancel lifecycle UI template for the rejuvenation timer UI.
- `src/ui/flowgrid-home/FlowgridHome.tsx` — the mount point + chip idiom for `ReturnCues`.
- `tests/persistence/migration-harness.test.ts` + `tests/simulation/boundaries.test.ts` — the migration-fixture + boundary-scanner patterns to extend.
- `package.json` — confirms all dependencies already installed; no new packages needed.

### Secondary (MEDIUM confidence — phase artifacts)
- `.planning/phases/04-.../04-SPEC.md` — 9 locked requirements, 15 acceptance criteria, 20/20 edges, 6/6 prohibitions, ambiguity 0.13 (R3 amended to duration-gated).
- `.planning/phases/04-.../04-CONTEXT.md` — decisions D-01..D-10, Agent's Discretion, Deferred Ideas, Phase 1–3 Code Contracts.
- `.planning/phases/01..03/*-CONTEXT.md` — D-07 (no throwing), D-08 (deterministic replay), D-02/D-05 (active-session markers), D-06 (diff for truth), D-07 (migration harness).
- `docs/gameplay-spine-draft.md` §3 "Core View" (line 1042) — confirms Core as a major UI surface (supports `/core` route).

### Tertiary (LOW confidence — none needed)
- This phase required no WebSearch, Context7, or training-data package claims. All mechanics are locked in SPEC.md; all patterns are proven in-tree. No external research was performed or needed.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all packages pre-existing and proven in Phases 1–3; `package.json` verified.
- Architecture: **HIGH** — every integration point read from source; exact file paths, field names, and line references documented.
- Pitfalls: **HIGH** — derived from the SPEC/CONTEXT reconciliation gaps + Phase 1–3 documented gotchas (Dexie store repetition, boundary scanner, deterministic replay).
- Migration: **HIGH** — `upgradeCellsV1ToV2` + `migration-harness.test.ts` templates read verbatim; the v2→v3 transform plugs straight in.
- Rejuvenation command trio (A3): **MEDIUM** — the faithful reading of D-01/D-02, but flagged as an assumption because SPEC.md literally names only `log_rejuvenation`. The planner should confirm the trio in the plan's design notes.

**Research date:** 2026-06-24
**Valid until:** 2026-07-24 (30 days — stable internal codebase; no external dependency drift possible since no new packages)

## RESEARCH COMPLETE

**Phase:** 4 - Core Alternation and Rejuvenation Economy
**Confidence:** HIGH

### Key Findings
- **Command trio required (Pitfall 1):** D-01/D-02's live-timed-session model mandates `start_rejuvenation` + `log_rejuvenation`(finish) + `cancel_rejuvenation`, NOT just the SPEC-named `log_rejuvenation`. A durable `activeRejuvenationStartedAt` marker (for reload-resume + mutual exclusion) can only be set by a command that writes to IndexedDB.
- **Derive the threshold, don't persist it (Don't Hand-Roll):** `nextIntegrationThreshold(n) = floor(50 × 1.5ⁿ)` derived from the monotonic `moduleTokens` counter. No migration field, no drift, naturally monotonic.
- **Two CoreRecord fields + one new store + v2→v3 migration:** `activationBoostLevel` (default 0) + `activeRejuvenationStartedAt` (default null) + `rejuvenations` Dexie store. Reuse `upgradeCellsV1ToV2` extracted-transform template.
- **No new packages, no external research needed:** every dependency is already in `package.json`; all mechanics locked in SPEC.md (ambiguity 0.13); all patterns proven in-tree. This is pure codebase extension.
- **Cross-type one-active-session invariant (Pitfall 2):** both `start_focus_session` and `start_rejuvenation` must check BOTH markers; add a property test that at most one marker is non-null app-wide after any command sequence.
- **`complete_focus_session` modification is backward-compatible:** with `activationBoostLevel` defaulting to 0 (migration), the bonus stays `10 + 0×5 = 10%` — existing activation-bonus tests stay green.

### File Created
`.planning/phases/04-core-alternation-and-rejuvenation-economy/04-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All packages pre-existing; `package.json` verified; no new deps. |
| Architecture | HIGH | Every integration point read from source with file:line references. |
| Migration | HIGH | `upgradeCellsV1ToV2` + harness templates read verbatim. |
| Pitfalls | HIGH | SPEC/CONTEXT reconciliation gaps + documented Phase 1–3 gotchas. |
| Command trio (A3) | MEDIUM | Faithful reading of D-01/D-02; flagged because SPEC names only `log_rejuvenation`. |

### Open Questions
- `/core` route entry point on FlowgridHome (recommend a "Core" nav link).
- Sub-minute rejuvenation finish handling (recommend: always append zero-gain record on finish; only Cancel appends nothing).
- Threshold float-before-floor documentation (recommend: comment + test asserting `[50,75,112,168,252]`).

### Ready for Planning
Research complete. The planner can translate the Architecture Patterns (project structure + 4 patterns), Code Examples (exact field/command/migration shapes), and Pitfalls (7 named risks with mitigations) directly into a 3-wave PLAN.md mirroring Phase 3's proven structure.
