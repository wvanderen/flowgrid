---
phase: 05-module-forge-and-starter-customization
plan: 01
subsystem: simulation
tags: [forge, incremental-game, deterministic-replay, fast-check, typescript, vitest]

# Dependency graph
requires:
  - phase: 04-core-alternation-and-rejuvenation-economy
    provides: log_rejuvenation atomic-command template, activationBoostCost/content-helper discipline, ForgeHistoryRecord scaffold + forgeHistory Dexie store, monotonic forgeCount/moduleTokens invariants
provides:
  - Atomic run_forge command handler (validate → re-derive reveal → apply → append → emit)
  - Pure deterministic forgeChoices selector seeded from forgeCount (NEVER env.rng)
  - Widened ForgeHistoryRecord (paymentType, paymentAmount, offeredChoices, chosenReward)
  - Extended RunForgeCommand (paymentType + chosenReward)
  - MODULE_LEVEL_BONUS content table + forgeEnergyCost/moduleLevelBonus pure helpers
  - MODULE_MAX_LEVEL=3 cap + validateModuleLevelCap invariant backstop
  - Per-level effects for all four starter modules (Generator/Charge Core/Output/Bloom)
  - 'slot_at_capacity' ValidationIssueCode + forgeCompleted/moduleUpgraded economy events
  - createRng canonical home moved to src/simulation/rng.ts (architecture boundary fix)
affects: [05-02 persistence migration + Zod, 05-03 UI forge route + chip + tile, 06-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic command + pure selector split (D-06): run_forge owns all durable mutation; forgeChoices is a pure read that constructs its own Rng inside via createRng(`forge:${forgeCount}`) for deterministic replay"
    - "TOCTOU defense (Pitfall 3): handler re-derives forgeChoices(previousState) and validates chosenReward ∈ revealed; never trusts a caller-supplied reveal"
    - "Level-0 backward-compat via default params (Pitfall 6): all extended system signatures default to level 0, preserving byte-identical Phase 1-4 behavior"
    - "Integer multiply-then-floor discipline (Pitfall 4): all per-level bonuses use Math.floor((base * pct) / 100); no floats, no Math.round"

key-files:
  created:
    - src/content/forge.ts
    - src/simulation/commands/forge-choices.ts
    - src/simulation/commands/run-forge.ts
    - src/simulation/rng.ts
    - tests/simulation/forge-choices.test.ts
    - tests/simulation/run-forge.test.ts
    - tests/properties/forge-safety.property.test.ts
  modified:
    - src/domain/records.ts
    - src/domain/result.ts
    - src/domain/validation.ts
    - src/domain/invariants.ts
    - src/content/index.ts
    - src/simulation/engine.ts
    - src/simulation/economy-events.ts
    - src/simulation/commands/complete-focus-session.ts
    - src/simulation/systems/bloom.ts
    - src/simulation/systems/routes.ts
    - src/simulation/systems/core-allocation.ts
    - src/app/rng.ts
    - src/persistence/validation-schemas.ts

key-decisions:
  - "D-04 A1/A2/A3 interpretations resolved as least-invasive: Charge Core boosts store-side rate, Output boosts routed amount, Bloom grants +1+level activation/momentum. None add new model fields or break the 100-sum allocation cap (RESEARCH Open Question #1 closed)."
  - "createRng moved to src/simulation/rng.ts (canonical home) with src/app/rng.ts re-exporting — the prior simulation→app import violated the one-way boundary enforced by tests/simulation/boundaries.test.ts."
  - "slot_at_capacity handler check is defense-in-depth: the reveal filter makes it unreachable via normal dispatch (maxed modules are filtered before the handler sees them); the validateModuleLevelCap invariant backstop is the independent guard."
  - "Insufficient-payment reuses 'negative_resource'; chosen-not-in-revealed reuses 'invalid_reference' (RESEARCH A6 — minimum new ValidationIssueCode surface)."

patterns-established:
  - "Pattern: pure selector constructs its own Rng inside via createRng(`namespace:${monotonicCounter}`) — deterministic replay holds without ambient RNG (extends the nextIntegrationThreshold derive-from-monotonic-counter pattern)"
  - "Pattern: extended system signatures default new params to 0 for backward-compat (Pitfall 6) — every per-level effect is a no-op at level 0"
  - "Pattern: handler re-derives the pure selector's output inside the command to defend against TOCTOU (never trusts caller-supplied reveal)"

requirements-completed: [MOD-03, MOD-04, MOD-05, MOD-07, VER-01, VER-02]

# Metrics
duration: 71min
completed: 2026-06-25
status: complete
---

# Phase 5 Plan 01: Module Forge Simulation Truth Summary

**Atomic run_forge handler + pure forgeChoices selector + MODULE_LEVEL_BONUS content table + per-level system reads, proven by 19 new forge tests (unit + property) — the full Forge loop is now drivable through runSimulationCommand with deterministic replay and VER-02 invariants holding**

## Performance

- **Duration:** 71 min
- **Started:** 2026-06-25T22:00:15Z
- **Completed:** 2026-06-25T23:11:21Z
- **Tasks:** 3
- **Files modified:** 19 (7 created + 12 modified)

## Accomplishments
- Built the atomic `run_forge` command handler mirroring `log_rejuvenation`: validate payment → re-derive forgeChoices (TOCTOU defense) → cap check → apply +1 level + decrement payment + forgeCount+1 → append ONE ForgeHistoryRecord (id=operationId, idempotent) → emit forgeCompleted + moduleUpgraded events
- Built the pure `forgeChoices` reveal selector: returns min(3, poolSize) deterministic choices seeded from `createRng(\`forge:${forgeCount}\`)` INSIDE (NEVER env.rng), filtering archived Cells and maxed modules
- Made all four starter modules mechanically meaningful via MODULE_LEVEL_BONUS + per-level reads in their owning systems (Generator via complete-focus-session, Charge Core/Output/Bloom via their systems), with level-0 backward-compat preserving byte-identical Phase 1-4 behavior
- Widened ForgeHistoryRecord to the 7-field D-09 shape (paymentType, paymentAmount, offeredChoices, chosenReward, forgeCount, id, createdAt) and extended RunForgeCommand in place (mirrors Phase 4 LogRejuvenationCommand refactor)
- Added validateModuleLevelCap invariant backstop wired into validateFlowgridSnapshot (D-05/MOD-07 defense-in-depth)
- Proved VER-01 (11 handler unit tests + 7 selector tests) and VER-02 (100-run fast-check property suite asserting forgeCount monotonicity, non-negative resources, level cap, chosen ∈ revealed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Domain types + forge content + level-cap invariant** - `98fc4d2` (feat)
2. **Task 2: forgeChoices selector + run_forge handler + engine routing + events** - `b70b929` (feat)
3. **Task 3: Per-level system reads (D-04) + test suites** - `d3c7e67` (feat)

## Files Created/Modified
- `src/content/forge.ts` (NEW) - FORGE_ENERGY_BASE=50, FORGE_ENERGY_STEP=25, MODULE_MAX_LEVEL=3, MODULE_LEVEL_BONUS table, forgeEnergyCost + moduleLevelBonus pure integer helpers
- `src/simulation/commands/forge-choices.ts` (NEW) - pure deterministic reveal selector with internal createRng seeded from forgeCount
- `src/simulation/commands/run-forge.ts` (NEW) - atomic handler (validate → re-derive → cap check → apply → append → emit)
- `src/simulation/rng.ts` (NEW) - canonical createRng home (moved from app to satisfy the one-way boundary)
- `src/domain/records.ts` - widened ForgeHistoryRecord to 7-field D-09 shape
- `src/domain/result.ts` - ForgeChoice interface, extended RunForgeCommand, forgeCompleted/moduleUpgraded event names
- `src/domain/validation.ts` - 'slot_at_capacity' ValidationIssueCode
- `src/domain/invariants.ts` - validateModuleLevelCap wired into validateFlowgridSnapshot
- `src/content/index.ts` - re-exports forge.ts symbols
- `src/simulation/engine.ts` - routes run_forge to runForge; deleted runForgeNotImplemented; preserved installModuleNotImplemented (D-08)
- `src/simulation/economy-events.ts` - forgeCompletedEvent + moduleUpgradedEvent constructors
- `src/simulation/commands/complete-focus-session.ts` - Generator per-level bonus + threads bloom/output/charge_core levels
- `src/simulation/systems/bloom.ts` - applyBloom(cell, localDate, bloomLevel=0): +1+bloomLevel to activation AND momentum (A3)
- `src/simulation/systems/routes.ts` - routeCurrentThroughRoutes(current, routes, outputLevel=0): multiply-then-floor output boost (A2)
- `src/simulation/systems/core-allocation.ts` - applyCoreAllocation(core, incomingCurrent, chargeCoreLevel=0): multiply-then-floor charge boost (A1)
- `src/app/rng.ts` - re-exports createRng from src/simulation/rng.js (preserves app/env.ts import surface)
- `src/persistence/validation-schemas.ts` - widened forgeHistorySchema + drift guard (Pitfall 6)
- `tests/simulation/forge-choices.test.ts` (NEW) - 7 selector tests
- `tests/simulation/run-forge.test.ts` (NEW) - 11 handler unit tests
- `tests/properties/forge-safety.property.test.ts` (NEW) - 100-run fast-check VER-02 property suite

## Decisions Made
- **D-04 A1/A2/A3 interpretations (RESEARCH Open Question #1)**: Resolved as the least-invasive interpretations that add NO new model fields and break NO existing invariants — Charge Core boosts the store-side effective rate, Output boosts the routed amount, Bloom grants more activation/momentum per Bloom. Each is documented in code comments at its application site warning against the conflation/overflow anti-patterns.
- **createRng canonical home**: Moved from `src/app/rng.ts` to `src/simulation/rng.ts` because simulation handlers need deterministic RNG without crossing the one-way architecture boundary. `src/app/rng.ts` now re-exports for backward compatibility.
- **slot_at_capacity handler check positioning**: Acknowledged as defense-in-depth — the reveal filter makes it unreachable via normal dispatch (a maxed target is filtered before the handler sees it, so a maxed-target command rejects via invalid_reference). The validateModuleLevelCap invariant backstop is the independent guard. The test suite covers both the reveal-filter rejection path and the invariant backstop.
- **Insufficient-payment and chosen-not-in-revealed code reuse**: Per RESEARCH A6, insufficient payment reuses `negative_resource` and chosen-not-in-revealed reuses `invalid_reference`, adding only `slot_at_capacity` as the new ValidationIssueCode (minimum surface).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Widened forgeHistorySchema to match the new ForgeHistoryRecord (Pitfall 6)**
- **Found during:** Task 1 (tsc --noEmit after widening records.ts)
- **Issue:** Widening ForgeHistoryRecord in src/domain/records.ts broke src/persistence/import-validation.ts:90 — the archive's forgeHistory (typed by the old Zod schema) no longer matched the widened domain record. The plan listed validation-schemas.ts under Plan 05-02, but Task 1's acceptance criterion requires `tsc --noEmit` to pass, and the type extension breaks compilation without the matching schema.
- **Fix:** Widened forgeHistorySchema field-for-field (paymentType, paymentAmount, offeredChoices, chosenReward with z.enum moduleKind) and added the `_forgeHistorySchemaCheck` drift guard mirror.
- **Files modified:** src/persistence/validation-schemas.ts
- **Verification:** npx tsc --noEmit green; existing migration-harness + import tests still pass.
- **Committed in:** 98fc4d2 (Task 1 commit)

**2. [Rule 3 - Blocking] Switched repository 'not_implemented writes nothing' test from run_forge to install_module**
- **Found during:** Task 1 (tsc --noEmit)
- **Issue:** tests/persistence/repository.test.ts:152 constructed the old stub RunForgeCommand shape `{ type, operationId }` which no longer compiles after the in-place type extension. The test's purpose is "applyResult on a not_implemented result writes nothing" — once run_forge becomes real in Task 2, the run_forge path no longer exercises not_implemented.
- **Fix:** Switched the test to use install_module (which D-08 guarantees stays a stub) so the test is forward-compatible.
- **Files modified:** tests/persistence/repository.test.ts
- **Verification:** npm test green (205 tests at Task 1 boundary).
- **Committed in:** 98fc4d2 (Task 1 commit)

**3. [Rule 3 - Blocking] Removed stale run_forge not_implemented block from foundation-loop.test.ts**
- **Found during:** Task 1 (tsc --noEmit)
- **Issue:** tests/simulation/foundation-loop.test.ts:223 constructed the old stub RunForgeCommand shape and asserted `forge.status === 'not_implemented'`. Both break after Task 2 makes run_forge real. The install_module block immediately after already covers the not_implemented stub assertion.
- **Fix:** Removed the run_forge block (5 lines); left the install_module block intact. Added a comment noting run_forge became real in Phase 5 Task 2.
- **Files modified:** tests/simulation/foundation-loop.test.ts
- **Verification:** npm test green.
- **Committed in:** 98fc4d2 (Task 1 commit)

**4. [Rule 3 - Blocking] Moved createRng from src/app/rng.ts to src/simulation/rng.ts**
- **Found during:** Task 2 (npm test — boundaries.test.ts failed)
- **Issue:** forge-choices.ts imported createRng from `../../app/rng.js`, violating the one-way architecture boundary (simulation must not import from app). tests/simulation/boundaries.test.ts enforces this via a regex scanner. RESEARCH.md and PATTERNS.md both cited the app/rng.ts path, but it violates the boundary.
- **Fix:** Created src/simulation/rng.ts as the canonical home (simulation owns deterministic RNG — the layer that needs it). Updated src/app/rng.ts to re-export from simulation (preserves app/env.ts import surface). forge-choices.ts imports from the simulation-local sibling.
- **Files modified:** src/simulation/rng.ts (NEW), src/app/rng.ts (now re-export), src/simulation/commands/forge-choices.ts (import path)
- **Verification:** npm test green (boundaries.test.ts passes; full suite 205 tests at Task 2 boundary).
- **Committed in:** b70b929 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (4 blocking — Rule 3)
**Impact on plan:** All auto-fixes necessary for compilation/architecture-boundary correctness. No scope creep. Three were forced by the in-place type extension the plan explicitly directs (downstream consumers had to be updated to compile); one was an architecture-boundary violation in the plan's own cited path. Plan 05-02's full persistence migration (Dexie v3→v4 + repository wiring + export/import envelope) is untouched — the validation-schemas.ts edit is the minimum required for Task 1's `tsc --noEmit` to pass and pre-stages the wider Plan 05-02 work.

## Issues Encounted
None beyond the four Rule 3 auto-fixes above.

## User Setup Required
None - no external service configuration required. This plan is pure simulation-layer TypeScript with no new dependencies, no environment variables, and no runtime configuration.

## Next Phase Readiness
- **Plan 05-02 (persistence migration)**: The validation-schemas.ts forgeHistorySchema is already widened with the drift guard in place; Plan 05-02 needs to add the Dexie v3→v4 schema bump (extracted upgradeForgeHistoryV3ToV4 transform + full store set repetition) and verify export/import round-trip the widened shape.
- **Plan 05-03 (UI forge route + chip + tile)**: The simulation truth is complete and independently verifiable — `run_forge` dispatches cleanly through runSimulationCommand, `forgeChoices` is a pure read the UI can call, and ForgeHistoryRecord carries everything ForgeSummary needs. MODULE_LEVEL_BONUS is the shared content table the Cell Board tiles will read for the level-effect display (D-13).
- **No blockers.** The full Forge loop is drivable in tests today.

---
*Phase: 05-module-forge-and-starter-customization*
*Completed: 2026-06-25*

## Self-Check: PASSED

All 7 created files exist on disk. All 3 task commits (98fc4d2, b70b929, d3c7e67) present in git log. `npx tsc --noEmit` green. `npm test -- --run` green (224/224 tests pass). `npm run lint` clean. The 'run_forge is not implemented until Phase 5' stub string is gone from src/; 'install_module is not implemented' preserved (D-08).
