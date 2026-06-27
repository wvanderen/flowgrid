# Requirements: Flowgrid

**Defined:** 2026-06-23
**Core Value:** Tap a Cell, do a real thing, and feel that effort become visible, useful signal in a modular system that makes returning feel powerful and forgiving.

## v1 Requirements

### Foundation

- [ ] **FND-01**: Developer can run a strict TypeScript project with separated `domain`, `content`, `simulation`, `app`, `persistence`, `render`, `ui`, and `tests` areas.
- [ ] **FND-02**: Simulation code can run without importing DOM, React, PixiJS, IndexedDB, browser timer, or persistence APIs.
- [ ] **FND-03**: Durable entities use stable IDs and typed record shapes for Cells, modules, routes, sessions, Core, forge history, settings, and sync-ready operations.
- [ ] **FND-04**: Commands return changed state, economy events, visual events, sync-ready operations, and validation issues.
- [ ] **FND-05**: Validation detects negative resources, invalid references, duplicate installs, invalid route allocations, invalid Core allocation totals, and token/forge count regressions.

### Cells

- [ ] **CELL-01**: User can create a Cell with name, color, optional icon, daily target, and starter defaults.
- [ ] **CELL-02**: User can inspect a Cell's XP, level, Momentum, Charge, daily milestone progress, Activation state, installed modules, and recent sessions.
- [ ] **CELL-03**: User can edit Cell identity and daily target without losing history.
- [ ] **CELL-04**: User can archive a Cell so it is hidden from normal active use while preserving completed sessions and history.
- [ ] **CELL-05**: New Cells include starter modules: Generator, Charge Core, Output, and Bloom.

### Sessions

- [ ] **SESS-01**: User can start a focus session from a selected Cell with one primary Generator action.
- [ ] **SESS-02**: User can finish a focus session and receive proportional rewards based on completed duration.
- [ ] **SESS-03**: User can cancel or discard an active session without creating accidental rewards.
- [x] **SESS-04**: Completed sessions are stored as append-only history records with Cell, start time, end time, duration, XP, Current, Energy/Core outcome, and Bloom/Activation effects.
- [ ] **SESS-05**: User can view a completion summary showing duration, Current, XP, milestone progress, Energy/Core Charge outcome, and the next useful action.

### Simulation

- [ ] **SIM-01**: Focus time deterministically generates Current, Cell XP, Momentum, milestone progress, and visual events.
- [ ] **SIM-02**: Cell XP grows local identity or capacity without gating global module-family access.
- [ ] **SIM-03**: Momentum changes are forgiving and support return after missed days rather than hard streak failure.
- [ ] **SIM-04**: Daily milestone progress accumulates from partial sessions and resets according to local day rules.
- [ ] **SIM-05**: When a Cell's daily milestone completes, Bloom fires once for that Cell/day.
- [ ] **SIM-06**: Bloom creates signal, increases Momentum, emits visual events, and activates the Cell until local day reset.
- [ ] **SIM-07**: Activated Cells expose a visible state and a simple module-aware benefit without making Activation mandatory for useful play.
- [ ] **SIM-08**: Simulation uses injected time and RNG for deterministic tests and replayable forge outcomes.

### Core

- [x] **CORE-01**: Current from Cells can route to the Core through starter Output behavior.
- [x] **CORE-02**: User can set the Core convert/store allocation while the invariant `convertAllocationPercent + storeAllocationPercent = 100` is always enforced.
- [x] **CORE-03**: The Core can convert incoming Current into spendable Energy.
- [x] **CORE-04**: The Core can store incoming Current as Core Charge.
- [x] **CORE-05**: User can see Energy, Core Charge, allocation settings, Integration progress, Module Tokens, and useful next actions in Core-oriented UI.
- [x] **CORE-06**: User can spend Energy on a small set of early upgrades or forge-related actions.

### Rejuvenation

- [x] **REJ-01**: User can log or complete a rejuvenation session.
- [x] **REJ-02**: Rejuvenation processes existing Core Charge into Integration progress.
- [x] **REJ-03**: Rejuvenation cannot create meaningful Module Token progress without prior Core Charge from activity.
- [x] **REJ-04**: Integration thresholds grant Module Tokens and advance the next threshold.
- [x] **REJ-05**: User can see how much Core Charge was processed and how close Integration is to the next Module Token.

### Modules and Forge

- [ ] **MOD-01**: Static ModuleDefinitions are versioned content separate from user-owned ModuleInstances.
- [x] **MOD-02**: User can inspect starter modules and understand their current behavior through normal UI controls.
- [x] **MOD-03**: User can spend a Module Token on a simple Forge roll that reveals three curated choices.
- [x] **MOD-04**: User can choose one Forge reward and persist it as an owned ModuleInstance, upgrade, or starter-slot enhancement.
- [x] **MOD-05**: Forge history records payment, offered choices, chosen reward, timestamp, and monotonic forge count.
- [x] **MOD-06**: User can install or apply a v1 Forge reward into a curated starter slot without using a full patch editor.
- [x] **MOD-07**: Duplicate module install, invalid owner Cell, and invalid slot states are rejected by validation.

### Rendering and UI

- [x] **UI-01**: User can see a Core-centered hex Flowgrid Home with compact Cells and selection state.
- [x] **UI-02**: User can use semantic non-canvas controls for every critical action: create Cell, start/finish session, inspect Cell, set Core allocation, log rejuvenation, forge, install reward, view history, and export.
- [x] **UI-03**: PixiJS or Canvas/WebGL visuals render Cells, Core, routes, Current movement, Bloom bursts, and Core conversion/storage feedback from simulation-emitted visual events.
- [x] **UI-04**: Dropping, reducing, replaying, or skipping visual events never changes durable economy state.
- [x] **UI-05**: User can open a Cell Board or inspector that shows starter modules, ports/slots, Cell Charge, Bloom progress, and installed rewards.
- [x] **UI-06**: User can access minimal settings for default session length, daily target defaults, local day boundary, reduced motion, and export.
- [x] **UI-07**: Opening Flowgrid after a gap surfaces useful return cues such as stored Core Charge, available Energy, token progress, Cells near Bloom, and recent history without shame language.
- [x] **UI-08**: The Flowgrid canvas stays mounted and visible during all core signal-producing interactions (active sessions, session finish, Core convert/store, rejuvenation token grants) so effort is perceivable as it happens; only Settings, History, and Forge build-choice flows may take over the full screen as explicit returnable exceptions.

### Persistence and Ownership

- [x] **DATA-01**: IndexedDB persistence preserves Cells, sessions, Core, modules, forge history, operations, and settings across reloads.
- [x] **DATA-02**: Persistence uses normalized entity stores with schema versioning and migrations rather than one giant app-state blob.
- [x] **DATA-03**: Command persistence writes changed records and sync-ready operations atomically where IndexedDB transaction boundaries allow it.
- [x] **DATA-04**: User can export full local state as JSON.
- [x] **DATA-05**: User can export completed sessions as CSV.
- [x] **DATA-06**: Import or restore validates schema version, required records, references, and resource invariants before replacing or merging local data.
- [x] **DATA-07**: App handles storage persistence/quota errors with recoverable user-facing states.

### Verification

- [x] **VER-01**: Unit tests cover pure simulation commands for focus completion, Bloom, Activation, Core allocation, rejuvenation, Integration, Module Token grants, Forge, and validation failures.
- [x] **VER-02**: Property-based tests cover resource non-negativity, allocation normalization, idempotent operation IDs, duplicate prevention, monotonic forge count, and token non-duplication.
- [x] **VER-03**: Persistence tests cover Dexie schema creation, migration fixtures, repository writes, append-only sessions, export, and restore validation.
- [x] **VER-04**: Browser tests cover the core user flow: create Cell, start/finish focus session, see Current/Bloom/Core effects, log rejuvenation, gain Module Token, run Forge, and reload with state preserved.
- [x] **VER-05**: Accessibility checks verify keyboard and semantic UI paths for all critical canvas-backed actions.
- [x] **VER-06**: Canvas/WebGL smoke checks verify that Flowgrid visuals render nonblank Cells/Core/routes and can be reduced or disabled without breaking economy state.

## v2 Requirements

### Advanced Modules

- **ADV-01**: User can edit internal patches between modules in a full patch editor.
- **ADV-02**: User can use advanced module graph effects such as splitters, gates, delays, echoes, sequencers, and resonance.
- **ADV-03**: User can manage duplicate modules, fusion material, larger rarity pools, and advanced reward pools.
- **ADV-04**: User can install Core modules beyond the v1 Integration Core behavior.

### Long-Tail Progression

- **LONG-01**: User can unlock prestige and Memory systems after the Core loop is mature.
- **LONG-02**: User can preserve Cells, real history, module inventory, forge count, and selected inheritance through prestige.
- **LONG-03**: User can access deeper Cell paths such as Spark, Echo, and Archive.

### Sync and Platform

- **SYNC-01**: User can sync durable records across devices after local operation semantics and conflict rules are validated.
- **SYNC-02**: App can reconcile multi-device conflicts for sessions, Cells, module layouts, patches, routes, Core counters, and forge history.
- **SYNC-03**: User can safely handle multi-device active sessions.
- **PLAT-01**: User can opt into native notifications, widgets, or platform integrations.

### Expanded Productivity

- **PROD-01**: User can use richer task/checklist/count modules for domain-specific work.
- **PROD-02**: User can view advanced analytics, trends, and long-term history insights.
- **PROD-03**: User can integrate calendar or scheduling data if it supports the game loop without turning Flowgrid into a generic planner.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full patch editor | Too much graph complexity before starter modules and Core economy prove the loop. |
| Prestige and Memory | Long-tail progression should wait until Core, Forge, and history foundations are validated. |
| Cloud sync and accounts | v1 is local-first; sync needs dedicated conflict semantics after operation records exist. |
| Social rooms and leaderboards | Flowgrid's first proof is personal attention becoming structure, not social competition. |
| App/site blocking | Platform scope creep that distracts from the focus game loop. |
| Complex task/project management | Would turn Flowgrid into a generic productivity suite and bury the Generator. |
| Large gacha-style reward pools | Shifts motivation away from meaningful build choices and complicates economy tuning. |
| Offline idle production as a primary reward | Flowgrid resources should come from real effort and recovery, not passive farming. |
| Punitive streak loss | Violates the emotional promise that partial effort counts and return is powerful. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Pending |
| FND-02 | Phase 1 | Pending |
| FND-03 | Phase 1 | Pending |
| FND-04 | Phase 1 | Pending |
| FND-05 | Phase 1 | Pending |
| CELL-01 | Phase 3 | Pending |
| CELL-02 | Phase 3 | Pending |
| CELL-03 | Phase 3 | Pending |
| CELL-04 | Phase 3 | Pending |
| CELL-05 | Phase 3 | Pending |
| SESS-01 | Phase 3 | Pending |
| SESS-02 | Phase 3 | Pending |
| SESS-03 | Phase 3 | Pending |
| SESS-04 | Phase 2 | Complete |
| SESS-05 | Phase 3 | Pending |
| SIM-01 | Phase 3 | Pending |
| SIM-02 | Phase 3 | Pending |
| SIM-03 | Phase 3 | Pending |
| SIM-04 | Phase 3 | Pending |
| SIM-05 | Phase 3 | Pending |
| SIM-06 | Phase 3 | Pending |
| SIM-07 | Phase 3 | Pending |
| SIM-08 | Phase 1 | Pending |
| CORE-01 | Phase 4 | Complete |
| CORE-02 | Phase 4 | Complete |
| CORE-03 | Phase 4 | Complete |
| CORE-04 | Phase 4 | Complete |
| CORE-05 | Phase 4 | Complete |
| CORE-06 | Phase 4 | Complete |
| REJ-01 | Phase 4 | Complete |
| REJ-02 | Phase 4 | Complete |
| REJ-03 | Phase 4 | Complete |
| REJ-04 | Phase 4 | Complete |
| REJ-05 | Phase 4 | Complete |
| MOD-01 | Phase 1 | Pending |
| MOD-02 | Phase 5 | Complete |
| MOD-03 | Phase 5 | Complete |
| MOD-04 | Phase 5 | Complete |
| MOD-05 | Phase 5 | Complete |
| MOD-06 | Phase 5 | Complete |
| MOD-07 | Phase 5 | Complete |
| UI-01 | Phase 3 | Complete |
| UI-02 | Phase 6 | Complete |
| UI-03 | Phase 6 | Complete |
| UI-04 | Phase 6 | Complete |
| UI-05 | Phase 3 | Complete |
| UI-06 | Phase 6 | Complete |
| UI-07 | Phase 4 | Complete |
| UI-08 | Phase 6.1 | Complete |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 2 | Complete |
| DATA-05 | Phase 2 | Complete |
| DATA-06 | Phase 2 | Complete |
| DATA-07 | Phase 2 | Complete |
| VER-01 | Phase 1 | Complete |
| VER-02 | Phase 1 | Complete |
| VER-03 | Phase 2 | Complete |
| VER-04 | Phase 6 | Complete |
| VER-05 | Phase 6 | Complete |
| VER-06 | Phase 6 | Complete |

**Coverage:**

- v1 requirements: 62 total
- Mapped to phases: 62
- Unmapped: 0

---
*Requirements defined: 2026-06-23*
*Last updated: 2026-06-23 after roadmap creation*
