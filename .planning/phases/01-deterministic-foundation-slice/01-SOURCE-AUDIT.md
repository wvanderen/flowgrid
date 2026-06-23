# Phase 1 Source Audit

SOURCE | ID | Feature / Requirement | Plan | Status | Notes
--- | --- | --- | --- | --- | ---
GOAL | - | Strict pure TypeScript simulation foundation proving command contracts, starter content, deterministic inputs, and economy invariants without UI/rendering/persistence dependencies | 01-01, 01-02, 01-03 | COVERED | Goal is split into tooling, contracts, and executable loop.
REQ | FND-01 | Strict TypeScript project with separated `domain`, `content`, `simulation`, `app`, `persistence`, `render`, `ui`, and `tests` areas | 01-01 | COVERED | Tooling and source folders.
REQ | FND-02 | Simulation runs without DOM, React, PixiJS, IndexedDB, browser timer, or persistence APIs | 01-01, 01-03 | COVERED | Lint restrictions and boundary scanner.
REQ | FND-03 | Stable IDs and typed record shapes for Cells, modules, routes, sessions, Core, forge history, settings, and sync-ready operations | 01-02 | COVERED | Domain record plan.
REQ | FND-04 | Commands return changed state, economy events, visual events, sync-ready operations, and validation issues | 01-02, 01-03 | COVERED | Result contracts and handlers.
REQ | FND-05 | Validation detects negative resources, invalid references, duplicate installs, allocations, and counter regressions | 01-03 | COVERED | Invariant validators and tests.
REQ | SIM-08 | Injected time and RNG for deterministic tests and replayable forge outcomes | 01-02, 01-03 | COVERED | SimulationEnv/Rng and replay tests.
REQ | MOD-01 | Static ModuleDefinitions are versioned content separate from user-owned ModuleInstances | 01-02 | COVERED | Starter content plan.
REQ | VER-01 | Unit tests cover pure simulation commands and validation failures, with later mechanics typed as not implemented | 01-01, 01-02, 01-03 | COVERED | Unit test harness and command-result tests.
REQ | VER-02 | Property tests cover non-negativity, allocation, idempotent operation IDs, duplicate prevention, forge count, and token safety | 01-01, 01-03 | COVERED | Property tests in final plan.
RESEARCH | - | Source layout with domain/content/simulation/app/persistence/render/ui/tests | 01-01 | COVERED | Matches research tree.
RESEARCH | - | Boundary tests scan simulation for forbidden imports/globals/timers | 01-01, 01-03 | COVERED | Boundary scanner required before and after implementation.
RESEARCH | - | Command contract includes SimulationCommand, SimulationEnv, SimulationResult, events, operations, and validation issues | 01-02 | COVERED | Contract plan.
RESEARCH | - | Starter definitions include Generator, Charge Core, Output, and Bloom, separate from ModuleInstances | 01-02 | COVERED | Content plan.
RESEARCH | - | Validation functions cover negative resources, references, duplicate installs, allocation totals, monotonic counters, and operation shape | 01-03 | COVERED | Invariant plan.
RESEARCH | - | Package legitimacy checkpoint for too-new vitest/eslint/prettier versions | 01-01 | COVERED | Blocking human checkpoint.
CONTEXT | D-01 | Foundation loop creates starter state, completes focus, fires Bloom, routes Output to Core, applies allocation, validates | 01-01, 01-03 | COVERED | Red test then implementation.
CONTEXT | D-02 | Later rejuvenation/forge/install types return typed not-implemented results | 01-02, 01-03 | COVERED | Command union and handlers.
CONTEXT | D-03 | Focus completion uses elapsed duration and injected time, not real timers | 01-01, 01-03 | COVERED | Tests and handler requirements.
CONTEXT | D-04 | Starter Output to Core applies default allocation and produces integer Energy/Core Charge | 01-02, 01-03 | COVERED | Starter defaults and command behavior.
CONTEXT | D-05 | Safety-core invariant tier required | 01-01, 01-03 | COVERED | Test bar and validators.
CONTEXT | D-06 | Property-based tests included for replay, resources, allocation, duplicates, counters | 01-03 | COVERED | Property test plan.
CONTEXT | D-07 | Domain invalidity returns typed validation issues with unchanged state | 01-02, 01-03 | COVERED | Contracts and rejection behavior.
CONTEXT | D-08 | Deterministic replay exact for state, events, operations, and issues | 01-01, 01-03 | COVERED | Red test and property tests.

No deferred ideas were listed in the Phase 1 context, and UI, rendering, IndexedDB/Dexie, browser timers, full rejuvenation, executable Forge, install-module mechanics, cloud sync, and prestige are explicitly out of scope for this phase.
