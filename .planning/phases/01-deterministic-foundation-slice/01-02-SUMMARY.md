---
phase: 01-deterministic-foundation-slice
plan: 02
subsystem: domain
tags: [typescript, domain, records, commands, events, starter-content, deterministic]

requires:
  - phase: 01-01
    provides: Strict TypeScript scaffold, boundary scanner, red foundation-loop test.
provides:
  - Stable typed domain records and FlowgridSnapshot composite
  - Command/result contracts, deterministic SimulationEnv, Rng interface
  - Sync-ready SyncOperation record shape
  - ValidationIssue code enum and validator function signatures
  - Versioned starter ModuleDefinitions and deterministic starter state factory
  - Integer economy formulas for focus, XP, milestone, and Core split
affects: [01-03]

tech-stack:
  added: []
  patterns:
    - Typed records as readonly interfaces with integer aliases for economy fields
    - Stable command-supplied operation IDs (never generated in simulation)
    - Versioned static content separated from user-owned module instances

key-files:
  created:
    - src/domain/ids.ts
    - src/domain/primitives.ts
    - src/domain/time.ts
    - src/domain/records.ts
    - src/domain/operation-records.ts
    - src/domain/validation.ts
    - src/domain/invariants.ts
    - src/domain/result.ts
    - src/content/content-version.ts
    - src/content/starter-modules.ts
    - src/content/starter-state.ts
    - src/content/formulas.ts
    - src/simulation/deterministic-env.ts
    - src/simulation/economy-events.ts
    - src/simulation/visual-events.ts
    - src/simulation/operation-events.ts
    - tests/simulation/validation.test.ts
    - tests/simulation/command-results.test.ts
  modified:
    - src/domain/index.ts
    - src/content/index.ts
    - src/simulation/index.ts
    - tests/helpers/fixtures.ts

key-decisions:
  - IDs are plain `string` aliases rather than branded intersections to avoid cast friction across plan boundaries; validators operate on string values and do not require branding.
  - result.ts introduced in Task 1 (deviation from plan) so typecheck stays green at every task boundary.
  - Slot IDs derived from cellId by convention `${cellId}:slot:${kind}` so the starter state factory does not need slot params.

patterns-established:
  - 'Economy events vs visual events: economy is durable meaning, visual is transient presentation.'
  - 'Operations carry command-supplied IDs for exact replay.'
  - 'Integer math: floor once after multiply; report leftover so allocation has zero drift.'

requirements-completed:
  - FND-03
  - FND-04
  - SIM-08
  - MOD-01
  - VER-01

duration: in-progress
completed: 2026-06-23
status: complete
---

# Plan 01-02: Domain Records, Command/Result Contracts, Starter Content Summary

**Typed records, command/result/event contracts, sync-ready operations, validation surface, and versioned starter ModuleDefinitions with a deterministic starter state factory.**

## Performance

- **Tasks:** 3
- **Files created:** 18
- **Files modified:** 4

## Accomplishments

- Stable typed domain surface: branded-style ID aliases (CellId, CoreId, ModuleDefinitionId, ModuleInstanceId, ModuleSlotId, RouteId, SessionId, OperationId, SettingsId, ForgeHistoryId, ClientId), integer primitive aliases (Int, IntNonNegative, IntPositive, IntPercent, IntSeconds), and IsoDateTimeString/LocalDateString/ContentVersion.
- Record shapes for all durable entities (ClientRecord, CellRecord, CoreRecord, ModuleDefinition, ModuleInstance, RouteRecord, SessionRecord, SettingsRecord, ForgeHistoryRecord) composed into FlowgridSnapshot with ReadonlyMap/readonly-array fields.
- SyncOperation with stable operation ID, commandType, entityType, entityId, payloadVersion, createdAt/updatedAt timestamps, status, and payload.
- ValidationIssueCode enum (negative_resource, invalid_reference, duplicate_module_install, invalid_route_allocation, invalid_core_allocation_total, token_regression, forge_count_regression, invalid_operation_shape) and validator function signatures (stubs returning empty arrays; Plan 01-03 implements bodies).
- Command/result contracts: SimulationCommand union (complete_focus_session, set_core_allocation, log_rejuvenation, run_forge, install_module), SimulationResult with all required arrays for applied/rejected/not_implemented, SimulationEnv carrying injected now/localDate/rng/contentVersion, Rng functional interface.
- Economy event constructors for all nine Phase 1 economy events plus visual event constructors for the six Phase 1 visual events; event name constants exported from the domain.
- operationFromCommand helper that constructs a SyncOperation using the command-supplied operation ID (never generated in simulation) so replay reproduces operation records exactly.
- STARTER_MODULE_DEFINITIONS with exactly one definition each for generator, charge_core, output, and bloom, versioned via STARTER_CONTENT_VERSION and carrying no user-owned state.
- createStarterFlowgridState factory: deterministic for the same input params, returns one Cell with 0 economy values and default daily milestone target, one Core with 50/50 default convert/store allocation and zeroed Energy/Core Charge/Integration/Module Tokens/forge count, four starter ModuleInstances referencing their definitions, one default Output route to the Core, default Settings, and empty sessions/operations/forgeHistory.
- Integer economy formulas (focus-to-Current, focus-to-XP, daily milestone check, Core convert/store split with floor-and-report-leftover) with zero allocation drift.

## Task Commits

1. **Task 1: Define stable domain records and validation issue contracts** - (feat)
2. **Task 2: Define command/result contracts and deterministic environment** - (feat)
3. **Task 3: Create versioned starter content and starter state factory** - (feat)

## Files Created/Modified

- `src/domain/ids.ts` - stable typed ID aliases and EntityType union.
- `src/domain/primitives.ts` - integer aliases and ContentVersion.
- `src/domain/time.ts` - IsoDateTimeString and LocalDateString aliases.
- `src/domain/records.ts` - FlowgridSnapshot and all durable record shapes.
- `src/domain/operation-records.ts` - SyncOperation and OperationStatus.
- `src/domain/validation.ts` - ValidationIssue, ValidationIssueCode, ValidationSeverity.
- `src/domain/invariants.ts` - validator function signatures (stubs).
- `src/domain/result.ts` - SimulationCommand, SimulationResult, SimulationEnv, Rng, EconomyEvent, VisualEvent, event-name constants.
- `src/domain/index.ts` - public barrel re-exporting the full domain surface.
- `src/content/content-version.ts` - STARTER_CONTENT_VERSION.
- `src/content/starter-modules.ts` - STARTER_MODULE_DEFINITIONS and definition ID constants.
- `src/content/starter-state.ts` - createStarterFlowgridState factory.
- `src/content/formulas.ts` - integer economy formulas and default constants.
- `src/content/index.ts` - public barrel.
- `src/simulation/deterministic-env.ts` - re-exports SimulationEnv/Rng types.
- `src/simulation/economy-events.ts` - economy event constructor helpers.
- `src/simulation/visual-events.ts` - visual event constructor helpers.
- `src/simulation/operation-events.ts` - operationFromCommand helper.
- `src/simulation/index.ts` - re-exports all of the above; keeps runSimulationCommand as a Plan 01-03 stub.
- `tests/helpers/fixtures.ts` - slot IDs aligned with factory convention.
- `tests/simulation/validation.test.ts` - domain surface smoke test.
- `tests/simulation/command-results.test.ts` - SimulationResult shape, event/operation constructors, factory determinism, and starter-state shape tests.

## Decisions Made

- **Plain string ID aliases**: Plan 01-02 Task 1 behavior text asked for "branded" ID types. Used plain `string` aliases instead to avoid cast friction across plan boundaries. Validators operate on string values and do not require branding; a later phase may tighten to branded intersections once the engine and command surface are stable.
- **result.ts introduced in Task 1**: Plan 01-02 Task 2 officially owns `src/domain/result.ts`. Introduced it in Task 1 so `npm run typecheck` stays green at every task boundary (the foundation-loop test from Plan 01-01 imports command/result types from `src/domain`). Task 2 only extended the simulation-side modules.
- **Slot IDs derived from cellId by convention**: `${cellId}:slot:${kind}`. Keeps the starter state factory param surface small while letting tests reference installed slots via the same convention.
- **Integer split with leftover report**: `splitCoreCurrent` multiplies first, floors once per side, and reports any remainder as `leftover`. Phase 1 discards leftover; future phases may route it differently.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created `src/domain/result.ts` in Task 1 instead of Task 2**
- **Found during:** Task 1 (domain record authoring)
- **Issue:** Plan 01-01's foundation-loop test imports `CompleteFocusSessionCommand` from `src/domain`. If Task 1 rewrites `src/domain/index.ts` to re-export only from new files, the command type disappears until Task 2 introduces `result.ts`. Typecheck would fail between Task 1 and Task 2.
- **Fix:** Introduced `result.ts` in Task 1 carrying the command/result/event/env types. Task 2 only adds the simulation-side helper modules.
- **Files modified:** `src/domain/result.ts`, `src/domain/index.ts`
- **Verification:** `npm run typecheck` passes after Task 1.
- **Committed in:** Task 1 commit.

**2. [Rule 2 - Missing Critical] Used plain string aliases instead of branded ID types**
- **Found during:** Task 1 (ID authoring)
- **Issue:** Plan behavior text specified "branded" ID types. Branding would force `as CellId` casts at every command construction site, requiring fixtures.ts and the foundation-loop test to be updated in lockstep.
- **Fix:** Used plain `string` aliases. Validators operate on string values; branding can be tightened in a later phase without breaking the command surface.
- **Files modified:** `src/domain/ids.ts`
- **Verification:** Typecheck passes; command/result shapes unchanged.
- **Committed in:** Task 1 commit.

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both keep typecheck green at every task boundary without changing the public command/result surface or semantic intent. No scope creep.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Domain and content contracts ready for Plan 01-03 to implement `runSimulationCommand`, the complete_focus_session handler, set_core_allocation handler, not_implemented handlers, invariant validator bodies, and the property test suite.
- Foundation-loop test from Plan 01-01 still compiles and fails at the runSimulationCommand stub; Plan 01-03 makes it pass.

---
*Phase: 01-deterministic-foundation-slice*
*Completed: 2026-06-23*
