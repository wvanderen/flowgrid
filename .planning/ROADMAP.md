# Roadmap: Flowgrid

## Overview

Flowgrid v1 is a vertical MVP that proves the first loop before expanding into advanced systems: deterministic simulation truth, durable local-first records, a playable Generator Flowgrid, Core activity/rest alternation, curated Forge customization, and final trust hardening. Advanced patch editing, prestige, cloud sync, multi-device conflict handling, and platform integrations stay deferred until the starter loop is validated.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions

- [ ] **Phase 1: Deterministic Foundation Slice** - Establish strict TypeScript boundaries, pure command contracts, starter content, invariants, and simulation tests.
- [ ] **Phase 2: Durable Local-First Spine** - Persist normalized records, migrations, append-only history, exports, restore validation, and sync-ready operations.
- [ ] **Phase 3: Playable Generator Flowgrid** - Deliver the first visible loop: create a Cell, start/finish focus, see Current/Bloom/Activation, and inspect the starter board.
- [ ] **Phase 4: Core Alternation and Rejuvenation Economy** - Route effort through the Core, split Current into Energy/Core Charge, process rejuvenation, and earn Module Tokens.
- [ ] **Phase 5: Module Forge and Starter Customization** - Let users spend Module Tokens on curated Forge choices and apply rewards into starter slots.
- [ ] **Phase 6: Hardening, Accessibility, and Trust** - Verify the full browser flow, accessible semantic controls, renderer safety, settings, recovery UX, and release-readiness checks.

## Phase Details

### Phase 1: Deterministic Foundation Slice

**Goal**: Developer can run a strict, pure TypeScript Flowgrid simulation foundation that proves command contracts, starter content, deterministic inputs, and economy invariants without UI, rendering, or persistence dependencies.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, SIM-08, MOD-01, VER-01, VER-02
**Success Criteria** (what must be TRUE):

  1. Developer can run the strict TypeScript project with separated domain, content, simulation, app, persistence, render, ui, and tests areas.
  2. Developer can execute pure simulation commands in tests without DOM, React, PixiJS, IndexedDB, browser timer, or persistence imports.
  3. Command outputs consistently include changed state, economy events, visual events, sync-ready operations, and validation issues.
  4. Validation and property-based tests catch negative resources, invalid references, duplicate installs, allocation errors, token regressions, and forge count regressions.
  5. Starter ModuleDefinitions are versioned separately from user-owned ModuleInstances and can be used by deterministic tests with injected time and RNG.

**Plans:** 3 plans
Plans:

- [x] 01-01-PLAN.md — Tooling, package verification checkpoint, strict source layout, and walking skeleton tests.
- [x] 01-02-PLAN.md — Domain records, command/result contracts, deterministic env, and versioned starter content.
- [x] 01-03-PLAN.md — Executable foundation loop, invariant validators, and unit/property safety tests.

### Phase 2: Durable Local-First Spine

**Goal**: User-owned Flowgrid data is durable, reloadable, exportable, migration-aware, and stored as normalized local-first records with append-only history and sync-ready operation rows.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, SESS-04, VER-03
**Success Criteria** (what must be TRUE):

  1. User can reload Flowgrid and keep Cells, sessions, Core state, modules, forge history, operations, and settings intact in IndexedDB.
  2. Completed sessions are preserved as append-only records with Cell, time, duration, XP, Current, Energy/Core outcome, and Bloom/Activation effects.
  3. User can export full local state as JSON and completed sessions as CSV.
  4. Import or restore rejects invalid schemas, missing required records, broken references, or invalid resource totals before changing local data.
  5. Storage persistence, quota, migration, repository write, export, and restore behavior are covered by persistence tests.

**Plans**: 2/3 plans executed

- [x] 02-01-PLAN.md
- [x] 02-02-PLAN.md
- [ ] 02-03-PLAN.md

### Phase 3: Playable Generator Flowgrid

**Goal**: User can complete the protected first loop from a Core-centered hex Flowgrid: create a Cell, start a Generator session with minimal friction, finish or cancel it safely, and see Cell progress, Current, Bloom, Activation, and starter modules.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: CELL-01, CELL-02, CELL-03, CELL-04, CELL-05, SESS-01, SESS-02, SESS-03, SESS-05, SIM-01, SIM-02, SIM-03, SIM-04, SIM-05, SIM-06, SIM-07, UI-01, UI-05
**Success Criteria** (what must be TRUE):

  1. User can create, edit, inspect, and archive Cells while preserving completed session history.
  2. A new Cell appears on a Core-centered hex Flowgrid with Generator, Charge Core, Output, and Bloom starter modules ready to use.
  3. User can start a focus session from a selected Cell with one primary Generator action, then finish for proportional rewards or cancel without accidental rewards.
  4. User can see completion feedback for duration, Current, XP, milestone progress, Energy/Core outcome, Bloom/Activation effects, and the next useful action.
  5. Cell XP, forgiving Momentum, daily milestone reset, once-per-day Bloom, visible Activation, and starter module benefits behave consistently from partial sessions.

**Plans**: TBD
**UI hint**: yes

### Phase 4: Core Alternation and Rejuvenation Economy

**Goal**: User can route Cell effort to the Core, choose immediate Energy versus stored Core Charge, spend early Energy, and process prior activity through rejuvenation into Integration and Module Tokens.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, REJ-01, REJ-02, REJ-03, REJ-04, REJ-05, UI-07
**Success Criteria** (what must be TRUE):

  1. User can route Current from Cells to the Core through starter Output behavior and see Energy/Core Charge outcomes.
  2. User can set Core convert/store allocation while the total is always enforced at 100%.
  3. User can spend Energy on a small set of early upgrades or forge-related actions.
  4. User can log rejuvenation that processes existing Core Charge into Integration progress and cannot meaningfully progress without prior activity.
  5. Opening Flowgrid after a gap surfaces useful return cues such as stored Core Charge, available Energy, token progress, Cells near Bloom, and recent history without shame language.

**Plans**: TBD
**UI hint**: yes

### Phase 5: Module Forge and Starter Customization

**Goal**: User can turn earned Module Tokens into curated build choices, persist Forge history, and apply v1 rewards to starter slots without needing the full patch editor.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: MOD-02, MOD-03, MOD-04, MOD-05, MOD-06, MOD-07
**Success Criteria** (what must be TRUE):

  1. User can inspect starter modules and understand current behavior through normal UI controls.
  2. User can spend a Module Token on a simple Forge roll that reveals three curated choices.
  3. User can choose one Forge reward and persist it as an owned ModuleInstance, upgrade, or starter-slot enhancement.
  4. Forge history records payment, offered choices, chosen reward, timestamp, and monotonic forge count.
  5. Installing or applying a reward rejects duplicate installs, invalid owner Cells, and invalid slot states.

**Plans**: TBD
**UI hint**: yes

### Phase 6: Hardening, Accessibility, and Trust

**Goal**: User can trust Flowgrid as a daily local-first app because the complete browser flow, semantic controls, visual rendering contract, settings, recovery states, and release checks are verified.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: UI-02, UI-03, UI-04, UI-06, VER-04, VER-05, VER-06
**Success Criteria** (what must be TRUE):

  1. User can complete every critical action through semantic non-canvas controls: create Cell, start/finish session, inspect Cell, set Core allocation, log rejuvenation, forge, install reward, view history, and export.
  2. PixiJS or Canvas/WebGL visuals render nonblank Cells, Core, routes, Current movement, Bloom bursts, and Core conversion/storage feedback from simulation-emitted visual events.
  3. Dropping, reducing, replaying, or skipping visual events never changes durable economy state.
  4. User can configure default session length, daily target defaults, local day boundary, reduced motion, and export from minimal settings.
  5. Browser, accessibility, and canvas smoke checks cover create Cell through Forge, reload with state preserved, keyboard access, semantic UI paths, and reduced/disabled motion.

**Plans**: TBD
**UI hint**: yes

## Deferred After V1

Advanced module graphs, the full patch editor, prestige/Memory, complex rarity pools, cloud sync, multi-device active sessions, native notifications/widgets, AI planning, advanced analytics, and platform integrations stay deferred until v1 validates the first loop. Future spikes should start from the v1 operation log, stable IDs, append-only session history, and entity-specific conflict semantics rather than replacing the local-first foundation.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Deterministic Foundation Slice | 3/3 | Complete | 2026-06-23 |
| 2. Durable Local-First Spine | 2/3 | In Progress|  |
| 3. Playable Generator Flowgrid | 0/TBD | Not started | - |
| 4. Core Alternation and Rejuvenation Economy | 0/TBD | Not started | - |
| 5. Module Forge and Starter Customization | 0/TBD | Not started | - |
| 6. Hardening, Accessibility, and Trust | 0/TBD | Not started | - |
