---
phase: 01-deterministic-foundation-slice
plan: 03
subsystem: simulation
tags: [typescript, simulation, deterministic, engine, invariants, property-tests, fast-check]

requires:
  - phase: 01-01
    provides: Strict TypeScript scaffold, boundary scanner, red foundation-loop test.
  - phase: 01-02
    provides: Typed domain records, command/result contracts, starter content, state factory.
provides:
  - Real runSimulationCommand dispatcher
  - complete_focus_session foundation-loop handler
  - set_core_allocation handler with 100-total enforcement
  - Typed not_implemented handlers for log_rejuvenation, run_forge, install_module
  - Five simulation systems (current, modules, bloom, routes, core-allocation)
  - Read-only selectors over FlowgridSnapshot
  - Eight invariant validators and the validateFlowgridSnapshot composition
  - Four fast-check property test families (deterministic replay, economy safety, allocation, ownership)
affects: [02-durable-local-first-spine, 03-playable-generator-flowgrid]

tech-stack:
  added: []
  patterns:
  - Pure simulation dispatcher with exhaustive discriminated-union switch
  - Validate-then-mutate-then-validate command shape
  - Integer-only economy math with floor-once allocation split and reported leftover
  - Validators never silently repair state; they only report structured issues

key-files:
  created:
    - src/simulation/engine.ts
    - src/simulation/selectors.ts
    - src/simulation/commands/complete-focus-session.ts
    - src/simulation/commands/set-core-allocation.ts
    - src/simulation/commands/not-implemented.ts
    - src/simulation/systems/current.ts
    - src/simulation/systems/modules.ts
    - src/simulation/systems/bloom.ts
    - src/simulation/systems/routes.ts
    - src/simulation/systems/core-allocation.ts
    - tests/properties/deterministic-replay.property.test.ts
    - tests/properties/economy-safety.property.test.ts
    - tests/properties/allocation.property.test.ts
    - tests/properties/ownership.property.test.ts
  modified:
    - src/domain/invariants.ts
    - src/simulation/index.ts
    - tests/simulation/foundation-loop.test.ts
    - tests/simulation/validation.test.ts
    - tests/helpers/fixtures.ts
    - tests/helpers/expect-valid-state.ts

key-decisions:
  - Session IDs are 1:1 with operation IDs in Phase 1 (deterministic, replayable); decoupling lands when sessions outlive operations.
  - Foundation loop is atomic: focus -> current -> route -> core allocation happen in one command; no intermediate Cell.current accumulation.
  - Lifetime Energy regression emits negative_resource (no dedicated energy_regression code); forge and token regressions use their dedicated codes.

patterns-established:
  - 'validateFlowgridSnapshot composes all state-shape validators; monotonic counters need a previous/next pair.'
  - 'Rejected commands preserve deep-equal previousState/nextState and emit no economy events, visual events, or operations.'
  - 'not_implemented commands return unchanged state with a typed warning issue and the reason in the message.'

requirements-completed:
  - FND-02
  - FND-04
  - FND-05
  - SIM-08
  - VER-01
  - VER-02

duration: in-progress
completed: 2026-06-23
status: complete
---

# Plan 01-03: Executable Foundation Loop, Invariant Validators, Property Tests Summary

**Real dispatcher, foundation-loop handler, full invariant validator suite, and four bounded property test families — Phase 1 verification gate is green.**

## Performance

- **Tasks:** 3
- **Files created:** 14
- **Files modified:** 6
- **Tests:** 36 (8 files: 4 unit suites, boundary scanner, 4 property suites)

## Accomplishments

- `runSimulationCommand(previousState, command, env)` dispatcher with an exhaustive switch over the SimulationCommand discriminated union (compile-time guarantee that a new command type without a handler fails to build).
- `complete_focus_session` handler implementing the full foundation loop: validate input -> generate Current and XP -> advance daily milestone -> fire Bloom once per local date on milestone completion -> increment Activation -> route starter Output Current to the Core -> apply Core convert/store allocation with integer floor-once split -> append SessionRecord -> emit economy events (focus_session_completed, current_generated, cell_xp_gained, bloom_fired, cell_ired_activated, current_routed_to_core, core_current_converted, core_charge_stored, state_validated) and visual counterparts -> emit one sync-ready SyncOperation using the command-supplied operation ID.
- `set_core_allocation` handler that enforces convert + store === 100 with each side an integer in [0, 100]; rejects all other inputs unchanged.
- Typed `not_implemented` handlers for log_rejuvenation, run_forge, and install_module that return unchanged state with a typed warning issue carrying the deferral reason (Phase 4 / Phase 5).
- Five pure simulation systems: `current` (focus → Current/XP), `modules` (starter module lookup), `bloom` (once-per-local-date Bloom + Activation), `routes` (Output route lookup + integer multi-route routing), `core-allocation` (Core convert/store split with leftover report).
- Read-only selectors: getCellById, getCore, getSettings, getStarterModuleInstanceForCell, getRecentSessions, countSessions.
- Eight invariant validator bodies replacing the Plan 01-02 stubs: validateNoNegativeResources, validateReferences, validateNoDuplicateInstalls, validateRouteAllocations, validateCoreAllocation, validateMonotonicCounters, validateOperationShape, and the validateFlowgridSnapshot composition.
- Four bounded fast-check property test families (numRuns: 100): deterministic-replay (deep-equal results for identical inputs), economy-safety (no negative resources + clean snapshot validation after valid focus), allocation (accept/reject boundary for set_core_allocation), ownership (duplicate install reporting + moduleTokens/forgeCount monotonicity across snapshot pairs).
- Foundation-loop test from Plan 01-01 now passes end-to-end; helper `expectValidState` now wires to `validateFlowgridSnapshot` and asserts zero issues on applied results.

## Task Commits

1. **Task 1: Implement complete focus session and command dispatcher** - `89fde5f` (feat)
2. **Task 2: Implement invariant validators and validation tests** - `bfbd53c` (feat)
3. **Task 3: Add property tests for replay, safety, allocation, and ownership** - `d943d6b` (test)

## Files Created/Modified

- `src/simulation/engine.ts` - runSimulationCommand dispatcher with exhaustive switch.
- `src/simulation/selectors.ts` - read-only selectors.
- `src/simulation/commands/complete-focus-session.ts` - foundation loop handler.
- `src/simulation/commands/set-core-allocation.ts` - allocation handler.
- `src/simulation/commands/not-implemented.ts` - typed not_implemented result helper.
- `src/simulation/systems/current.ts` - generateCurrent, generateXp.
- `src/simulation/systems/modules.ts` - starter module lookup helpers.
- `src/simulation/systems/bloom.ts` - shouldFireBloom, applyBloom.
- `src/simulation/systems/routes.ts` - findRoutesFromCellToCore, routeCurrentThroughRoutes.
- `src/simulation/systems/core-allocation.ts` - applyCoreAllocation, isCoreAllocationValid.
- `src/domain/invariants.ts` - real validator bodies.
- `src/simulation/index.ts` - re-exports engine instead of stub.
- `tests/simulation/foundation-loop.test.ts` - rewritten as the executable contract.
- `tests/simulation/validation.test.ts` - rewritten with per-code coverage.
- `tests/helpers/fixtures.ts` - buildStarterSnapshot helper.
- `tests/helpers/expect-valid-state.ts` - wired to validateFlowgridSnapshot.
- `tests/properties/deterministic-replay.property.test.ts` - D-08 exact replay.
- `tests/properties/economy-safety.property.test.ts` - non-negative resource invariants.
- `tests/properties/allocation.property.test.ts` - Core allocation accept/reject boundary.
- `tests/properties/ownership.property.test.ts` - duplicate install + monotonic counters.

## Decisions Made

- **Session ID 1:1 with operation ID in Phase 1**: `sessionId = command.operationId`. Deterministic and replayable. Decoupling (sessions outliving operations) lands when Phase 4+ introduces multi-operation sessions or session edits.
- **Foundation loop is atomic**: focus, Current generation, routing, and Core allocation happen in one command. Phase 1 has no intermediate Cell.current accumulation across commands; Cell.current stays at 0 for the starter.
- **Lifetime Energy regression code**: emits `negative_resource` because Phase 1's ValidationIssueCode enum has no dedicated energy_regression code. Token and forge regressions use their dedicated codes.
- **Command input validation code**: `invalid_reference` is used for unknown cellId, non-positive duration, reversed time range, and missing starter modules. These stretch the literal meaning of "reference" but match the Phase 1 code set; future phases may add a dedicated `invalid_command_input` code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Used `invalid_reference` for command input validation**
- **Found during:** Task 1 (complete_focus_session validation)
- **Issue:** The Phase 1 ValidationIssueCode enum has no dedicated code for command input errors (unknown cell, non-positive duration, reversed time range). Plan 01-02 Task 1 behavior text asked for "branded" codes but the enumeration in `src/domain/validation.ts` is the eight listed.
- **Fix:** Used `invalid_reference` (stretched but valid: the command references a cell/time/module that does not satisfy the contract). Documented in the handler comment.
- **Files modified:** `src/simulation/commands/complete-focus-session.ts`
- **Verification:** Foundation-loop test asserts the rejected path produces an `invalid_reference` issue.
- **Committed in:** `89fde5f`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Keeps the Phase 1 validation code set closed. Future phases can add `invalid_command_input` if product needs clearer UX-facing issue categorization.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Foundation loop is executable and exactly replayable.
- Phase 1 verification gate is green: `npm run typecheck`, `npm run lint`, `npm run test -- --run` all pass (36 tests across 8 files).
- Phase 2 (Durable Local-First Spine) can consume FlowgridSnapshot, SessionRecord, and SyncOperation records directly via repository code; the simulation result shape is stable.
- Phase 3 (Playable Generator Flowgrid) can consume economyEvents and visualEvents from the renderer; the command surface is stable for UI dispatch.

---
*Phase: 01-deterministic-foundation-slice*
*Completed: 2026-06-23*
