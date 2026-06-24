---
phase: 04-core-alternation-and-rejuvenation-economy
plan: 01
subsystem: simulation
tags: [rejuvenation, integration, module-tokens, activation-boost, fast-check, deterministic-simulation, integer-economy]

# Dependency graph
requires:
  - phase: 03-playable-generator-flowgrid
    provides: complete_focus_session Current routing + Activation bonus + session-lifecycle mutual-exclusion pattern + set_core_allocation template
provides:
  - "log_rejuvenation handler (duration-gated Charge -> Integration, odd-remainder retention, derived-threshold grant loop, append-only RejuvenationRecord)"
  - "start_rejuvenation / cancel_rejuvenation handlers (live-timed marker trio, D-07 writes-nothing-durable cancel)"
  - "purchase_activation_boost handler (Energy-spend upgrade, cap 3, scaling cost 50/100/200)"
  - "CoreRecord.activationBoostLevel + activeRejuvenationStartedAt fields"
  - "RejuvenationRecord interface + FlowgridSnapshot.rejuvenations array"
  - "Cross-type focus XOR rejuvenation mutual exclusion (both directions)"
  - "Derived activation bonus (activationBonusPercent(level)) wired into complete_focus_session"
  - "Pure content functions: nextIntegrationThreshold, activationBoostCost, activationBonusPercent + REJUVENATION_CHARGE_PER_MINUTE constant"
  - "integration_regression + activation_boost_regression invariant codes + guards"
affects: [04-02 (persistence: rejuvenations store + migration + export/restore), 04-03 (UI: CorePanel + RejuvenationSummary + ReturnCues)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Duration-gated payout with odd-remainder retention (chargeConsumed = integrationGained * 2, NOT chargeProcessedRaw)"
    - "Derived threshold grant loop (nextIntegrationThreshold derives from monotonic moduleTokens — bounded, self-advancing, no persisted nextThreshold field)"
    - "Iterative-floor geometric threshold sequence (floor(prev*1.5) each step) — produces 252 not 253 at the 5th threshold"
    - "Cross-type mutual exclusion via marker scan in BOTH start_focus_session and start_rejuvenation (symmetric)"
    - "Cancel writes nothing durable (D-07 / Pitfall 6 — operations/economyEvents/records all empty)"
    - "Append-only RejuvenationRecord with id 1:1 with operationId (idempotent replay)"

key-files:
  created:
    - src/simulation/commands/log-rejuvenation.ts
    - src/simulation/commands/start-rejuvenation.ts
    - src/simulation/commands/cancel-rejuvenation.ts
    - src/simulation/commands/purchase-activation-boost.ts
    - tests/simulation/rejuvenation.test.ts
    - tests/simulation/activation-boost.test.ts
    - tests/properties/rejuvenation-safety.property.test.ts
  modified:
    - src/domain/records.ts
    - src/domain/ids.ts
    - src/domain/result.ts
    - src/domain/validation.ts
    - src/domain/invariants.ts
    - src/content/formulas.ts
    - src/content/starter-state.ts
    - src/content/index.ts
    - src/persistence/repository.ts
    - src/persistence/import-validation.ts
    - src/persistence/seeding.ts
    - src/persistence/validation-schemas.ts
    - src/simulation/engine.ts
    - src/simulation/operation-events.ts
    - src/simulation/economy-events.ts
    - src/simulation/commands/start-focus-session.ts
    - src/simulation/commands/complete-focus-session.ts
    - tests/simulation/foundation-loop.test.ts
    - tests/persistence/repository.test.ts

key-decisions:
  - "Folded the rejuvenation payout derivation inline into log-rejuvenation.ts (per plan Design note) rather than a separate src/simulation/systems/rejuvenation.ts module"
  - "Used iterative-floor threshold formula (floor(prev*1.5) each step) over the plan's closed-form floor(50*1.5^n) — the closed-form produced 253 at the 5th threshold, contradicting the SPEC-mandated sequence 50,75,112,168,252"
  - "Multi-threshold grant tested at Integration 75 (crosses 50 and 75 -> exactly 2 tokens); the SPEC's '>=125 grants 2 tokens' wording is mathematically inconsistent with its own threshold sequence (112 < 125) and was honored via the threshold-sequence contract instead"

patterns-established:
  - "Cross-type marker mutual exclusion: both start commands scan BOTH marker types and reject on any conflict"
  - "Duration-gated payout ordering: chargeProcessedRaw -> integrationGained -> chargeConsumed = integrationGained * 2 (collapse to the even 2:1 grid, retain odd remainder)"
  - "Derived-from-monotonic-counter threshold: never persist a nextThreshold field; compute from moduleTokens so it cannot drift"

requirements-completed: [CORE-06, REJ-01, REJ-02, REJ-03, REJ-04]

# Metrics
duration: 16min
completed: 2026-06-24
status: complete
---

# Phase 4 Plan 1: Core Alternation and Rejuvenation Economy (Simulation Truth) Summary

**Duration-gated rejuvenation (Charge -> Integration -> Module Tokens), Energy-spend Activation boost, and cross-type focus/rejuvenation mutual exclusion — the pure deterministic simulation slice of Phase 4**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-24T16:41:56Z
- **Completed:** 2026-06-24T16:57:59Z
- **Tasks:** 3
- **Files modified:** 19 (7 created, 12 modified)

## Accomplishments
- Implemented the full rejuvenation command trio (start / log / cancel) with duration-gated Core Charge processing, 2:1 Integration conversion with odd-remainder retention (Pitfall 3), and a derived geometric threshold-grant loop that advances with each Module Token (Pitfall 4) — every SPEC R3 amended acceptance number reproduced exactly.
- Added the Energy-spend Activation-bonus upgrade (cap 3, costs 50/100/200) and wired the derived `activationBonusPercent(level)` into `complete_focus_session` so a level-1 Core earns +15% Current on an Activated cell — while level 0 stays byte-identical to Phase 3 (Pitfall 6 backward-compat, all activation-bonus tests green).
- Established cross-type focus XOR rejuvenation mutual exclusion in BOTH `start_focus_session` and `start_rejuvenation`, with a property test asserting at most one active session app-wide.
- Replaced the `log_rejuvenation` not_implemented stub with a real handler; the foundation-loop and repository tests were updated to the new reality.
- 195/195 vitest tests green, tsc + eslint + boundaries + npm run build all clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Domain records + content foundation (compile-green type layer)** — `bc9f3fe` (feat)
2. **Task 2: Rejuvenation trio + Activation boost + engine/event wiring** — `c6f5f4b` (feat)
3. **Task 3: Simulation acceptance + property tests** — `157a6f1` (test)

## Files Created/Modified
- `src/simulation/commands/log-rejuvenation.ts` - Duration-gated rejuvenation finish handler (Charge -> Integration -> threshold grants -> append record)
- `src/simulation/commands/start-rejuvenation.ts` - Sets core.activeRejuvenationStartedAt, cross-type mutual exclusion with focus
- `src/simulation/commands/cancel-rejuvenation.ts` - Clears marker, writes nothing durable (D-07)
- `src/simulation/commands/purchase-activation-boost.ts` - Validates cost/cap, decrements Energy, increments level
- `src/domain/records.ts` - CoreRecord +activationBoostLevel +activeRejuvenationStartedAt; RejuvenationRecord; FlowgridSnapshot.rejuvenations
- `src/domain/ids.ts` - RejuvenationId + 'rejuvenation' EntityType
- `src/domain/result.ts` - Refactored LogRejuvenationCommand (startedAt/endedAt); 3 new commands; 3 new event names
- `src/domain/validation.ts` - integration_regression + activation_boost_regression issue codes
- `src/domain/invariants.ts` - Monotonic Integration + activationBoostLevel guards; activationBoostLevel non-negative check
- `src/content/formulas.ts` - REJUVENATION_CHARGE_PER_MINUTE, threshold curve constants, nextIntegrationThreshold (iterative-floor), activationBoostCost, activationBonusPercent
- `src/content/starter-state.ts` + `src/persistence/seeding.ts` - Seed the 2 new CoreRecord fields (level 0 / null marker)
- `src/persistence/{repository,import-validation,validation-schemas}.ts` - Compile shims for the new snapshot/core fields (04-02 swaps for real store/archive reads)
- `src/simulation/{engine,operation-events,economy-events}.ts` - Dispatch wiring + 3 new event constructors + exhaustive switch cases
- `src/simulation/commands/{start-focus-session,complete-focus-session}.ts` - Symmetric mutual-exclusion check + derived activation bonus
- `tests/simulation/{rejuvenation,activation-boost}.test.ts` + `tests/properties/rejuvenation-safety.property.test.ts` - Full SPEC acceptance + 100-run property suite
- `tests/simulation/foundation-loop.test.ts` + `tests/persistence/repository.test.ts` - Updated for the real log_rejuvenation handler

## Decisions Made
- **Fold vs. separate module:** per the plan's Design note, the payout derivation lives inline in `log-rejuvenation.ts` (mirroring the `splitCoreCurrent` precedent) rather than a new `src/simulation/systems/rejuvenation.ts`. The plan offered both; the inline choice keeps the mutation close to the economy-state write.
- **Iterative-floor threshold formula:** the plan's `Math.floor(50 * 1.5^n)` produces 253 at the 5th threshold; the SPEC (R4, Acceptance Criteria) and plan truth #3 all mandate 252. Switched to `floor(prev * 1.5)` iterated per step, which matches the documented sequence. See Deviations #3.
- **Multi-threshold grant test value:** tested "exactly 2 tokens" at Integration 75 (the actual 2nd threshold) rather than the SPEC's prose value of 125, because 125 > 112 (the 3rd threshold) and would grant 3 tokens. The threshold-sequence contract is the authoritative one (stated 3x). See Deviations #4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added integration_regression + activation_boost_regression validation codes**
- **Found during:** Task 1
- **Issue:** The plan's Task 1 instruction for `invariants.ts` required new monotonic-counter checks using codes `integration_regression` and `activation_boost_regression`, but those codes did not exist in the `ValidationIssueCode` enum (`src/domain/validation.ts`). `validation.ts` was not in Task 1's `read_first` or `files` list.
- **Fix:** Extended `ValidationIssueCode` in `src/domain/validation.ts` with the two new codes so the invariants compile and the monotonic guards produce structured issues.
- **Files modified:** src/domain/validation.ts
- **Verification:** tsc green; invariants emit the new codes on regression.
- **Committed in:** bc9f3fe (Task 1 commit)

**2. [Rule 3 - Blocking] Extended coreSchema + seeding.ts + engine.ts + operation-events.ts to keep tsc green at the Task 1 boundary**
- **Found during:** Task 1
- **Issue:** The plan's Task 1 acceptance criterion required `npx tsc --noEmit` to exit 0, but four unlisted ripple sites broke compilation: (a) `src/persistence/seeding.ts` constructs a fresh CoreRecord missing the 2 new fields; (b) `src/persistence/validation-schemas.ts` coreSchema parses `archive.core` without the 2 new fields, so the assignment to CoreRecord in import-validation fails; (c) `src/simulation/engine.ts` exhaustive switch is non-exhaustive after adding 3 new union members; (d) `src/simulation/operation-events.ts` two exhaustive switches likewise. Two test files (`tests/persistence/repository.test.ts`, `tests/simulation/foundation-loop.test.ts`) also constructed `LogRejuvenationCommand` with the removed `durationSeconds` field.
- **Fix:** Seeded the 2 new fields in `seeding.ts`; added the 2 fields to `coreSchema` with `.default(...)` so old v1 archives still parse (Pitfall 6 backward-compat); added not_implemented stub cases for the 3 new commands in `engine.ts` (Task 2 replaced them with real handlers); added the final correct cases to both `operation-events.ts` switches; updated the 2 test command literals to the new `startedAt`/`endedAt` shape.
- **Files modified:** src/persistence/seeding.ts, src/persistence/validation-schemas.ts, src/simulation/engine.ts, src/simulation/operation-events.ts, tests/persistence/repository.test.ts, tests/simulation/foundation-loop.test.ts
- **Verification:** `npx tsc --noEmit` exits 0 after Task 1.
- **Committed in:** bc9f3fe (Task 1 commit)

**3. [Rule 1 - Bug] Fixed nextIntegrationThreshold to produce the documented 252 (was 253)**
- **Found during:** Task 3
- **Issue:** The plan's formula `Math.floor(INTEGRATION_THRESHOLD_BASE * Math.pow(INTEGRATION_THRESHOLD_RATIO, moduleTokens))` produces the sequence 50, 75, 112, 168, **253** — but the SPEC (R4 + Acceptance Criteria), the plan's own truth #3, and the Task 3 test action all mandate the sequence 50, 75, 112, 168, **252**. The closed-form preserves the 1.5 fractional component across exponents; the documented sequence requires flooring at each step.
- **Fix:** Changed `nextIntegrationThreshold` to the iterative form `let t = BASE; for (i in 0..n) t = Math.floor(t * RATIO); return t;`, which yields exactly 50, 75, 112, 168, 252, 378, ...
- **Files modified:** src/content/formulas.ts
- **Verification:** `nextIntegrationThreshold(0..4)` === [50, 75, 112, 168, 252]; activation-boost threshold-sequence test green.
- **Committed in:** 157a6f1 (Task 3 commit)

**4. [Rule 1 - Bug] Tested multi-threshold grant at Integration 75 instead of the SPEC's prose value 125**
- **Found during:** Task 3
- **Issue:** The SPEC R4 and plan behavior both say "a rejuvenation that brings Integration from 0 to >=125 grants exactly 2 tokens", but with the documented threshold sequence (50, 75, 112, 168, 252) any Integration >= 112 crosses THREE thresholds (50, 75, 112) and grants 3 tokens. The SPEC's ">=125 grants 2" is mathematically inconsistent with its own threshold sequence. The threshold-sequence contract is stated authoritatively three times; the ">=125" prose is stated twice and appears to be an authoring error (likely meant >=75, the actual 2nd threshold).
- **Fix:** Honored the threshold sequence (the more fundamental, multiply-stated contract) and tested the multi-threshold grant at Integration 75, which legitimately crosses exactly 2 thresholds (50 and 75). The test still proves the loop grants multiple tokens in one command (the core R4 behavior).
- **Files modified:** tests/simulation/rejuvenation.test.ts
- **Verification:** rejuvenation.test.ts "multi-threshold" test green; 75 Integration -> 2 tokens; threshold sequence asserted as [50,75,112,168,252].
- **Committed in:** 157a6f1 (Task 3 commit)

**5. [Rule 3 - Blocking] Updated repository.test.ts to drive the not_implemented path via run_forge**
- **Found during:** Task 3 (plan-level verification)
- **Issue:** `tests/persistence/repository.test.ts` "applyResult on a not_implemented result writes nothing" used `log_rejuvenation` to produce a not_implemented result. Phase 4 replaced that stub with a real handler, so the test broke the plan-level `vitest run` gate. The plan's Task 3 did not list this file (persistence is plan 04-02 territory), but the plan-level verification requires all suites green.
- **Fix:** Switched the test to use `run_forge` (still a Phase 5 not_implemented stub) to drive the not_implemented persistence path. The assertion is identical — a not_implemented result writes nothing durable.
- **Files modified:** tests/persistence/repository.test.ts
- **Verification:** full `npx vitest run` green (195/195).
- **Committed in:** 157a6f1 (Task 3 commit)

---

**Total deviations:** 5 auto-fixed (2 Rule 1 bugs, 2 Rule 3 blocking, 1 Rule 2 missing critical)
**Impact on plan:** All auto-fixes were necessary to satisfy the plan's own acceptance criteria (tsc green, vitest green, threshold sequence 252). No scope creep — every fix is a direct consequence of the plan's type-layer changes rippling through compile/exhaustiveness paths the plan did not enumerate, plus correcting two mathematical inconsistencies between the plan's formula/prose and its mandated acceptance numbers. The simulation-truth contract is fully honored.

## Issues Encountered
None beyond the deviations above. No authentication gates, no external-service dependencies, no new packages installed.

## User Setup Required
None - no external service configuration required. This is a pure simulation-truth slice; persistence (04-02) and UI (04-03) are the next plans.

## Next Phase Readiness
- **Ready for 04-02 (persistence):** the `rejuvenations` array lives in the in-memory snapshot with a `[]` shim in `loadSnapshot` and `validateArchive`. The Dexie `rejuvenations` store + `version(3)` migration + archive field + the two `coreSchema`/`seeding`/`repository` shim swaps are the 04-02 delta. The `RejuvenationRecord` shape and id-1:1-with-operationId contract are already fixed here.
- **Ready for 04-03 (UI):** the simulation surface (CorePanel reads Energy/Core Charge/Integration/Module Tokens/Allocation; RejuvenationSummary reads the last RejuvenationRecord; ReturnCues read Core economy state) is fully exercisable via `runSimulationCommand`.
- **No blockers.** Phase 3 regression suites (activation-bonus, session-lifecycle, foundation-loop, economy-safety property) remain green.

## Self-Check: PASSED

- All 7 created files exist on disk (4 handlers + 3 test files): FOUND.
- All 3 task commit hashes present in git log (bc9f3fe, c6f5f4b, 157a6f1): FOUND.
- All Task 1/2/3 acceptance criteria re-verified via the grep checks above: PASS.
- Plan-level verification: `npx tsc --noEmit` (0), `npx eslint .` (0), `npx vitest run` (195/195), `npm run build` (success): PASS.

---
*Phase: 04-core-alternation-and-rejuvenation-economy*
*Completed: 2026-06-24*
