# Phase 1: Deterministic Foundation Slice - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-23
**Phase:** 1-Deterministic Foundation Slice
**Areas discussed:** First Command Surface, Invariant Test Bar

---

## First Command Surface

### Executable Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Foundation loop | Implement enough to create starter state, complete a focus session, fire Bloom, route starter Output to Core, and validate results. | yes |
| Session only | Keep Phase 1 very narrow: create starter state and complete/cancel focus sessions, with later phases adding Bloom/Core behavior. | |
| Full v1 shapes | Define command shapes for session, Bloom, Core, rejuvenation, and forge now, but only implement a subset. | |

**User's choice:** Foundation loop.
**Notes:** Phase 1 should prove a meaningful starter simulation loop, not only session math.

### Later-Phase Commands

| Option | Description | Selected |
|--------|-------------|----------|
| Types only | Define stable command/result/event shapes for later systems, but executable handlers can return not implemented yet. | yes |
| No later commands | Only include commands that Phase 1 executes; later phases add their own contracts. | |
| Thin executable stubs | Add minimal working rejuvenation/forge behavior now so tests can exercise the whole v1 loop early. | |

**User's choice:** Types only.
**Notes:** Rejuvenation and forge should be shaped for future phases without becoming Phase 1 implementation work.

### Focus Completion Input

| Option | Description | Selected |
|--------|-------------|----------|
| Elapsed duration input | Command receives `cellId`, `startedAt`, `endedAt` or `durationMs`, and deterministic `now`; tests can complete sessions without real timers. | yes |
| Session lifecycle pair | Separate `startSession` and `finishSession` commands, even in pure tests, to mirror app behavior from day one. | |
| Both contracts | Support lifecycle commands plus a test-friendly pure completion helper. | |

**User's choice:** Elapsed duration input.
**Notes:** The pure simulation command should be deterministic and test-friendly.

### Core Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Apply default allocation | Route Current to Core and split it by a default convert/store allocation, producing Energy and Core Charge in integer units. | yes |
| Record routed Current only | Prove Current can reach the Core, but do not convert/store until Phase 4. | |
| Validate shape only | Emit an event saying Output would route to Core, with no Core resource mutation. | |

**User's choice:** Apply default allocation.
**Notes:** Phase 1 should mutate Core Energy/Core Charge according to the default allocation.

---

## Invariant Test Bar

### Required Tier

| Option | Description | Selected |
|--------|-------------|----------|
| Safety core | Require tests for no negative resources, valid references, no duplicate installs, Core allocation totals, token/forge monotonicity, and deterministic replay for the foundation loop. | yes |
| Minimal bootstrap | Require only no negative resources, valid references, and deterministic replay; leave duplicate install/token/forge checks until module and forge phases. | |
| Maximum net | Require safety core plus property-based tests for every typed later-phase command shape, even if handlers are not implemented yet. | |

**User's choice:** Safety core.
**Notes:** The foundation should already guard the main economy failure modes.

### Property-Based Tests

| Option | Description | Selected |
|--------|-------------|----------|
| Core properties now | Add property tests for resource non-negativity, allocation normalization, deterministic replay, duplicate prevention, and monotonic counters where the state shape exists. | yes |
| Example tests first | Use table-driven/unit examples in Phase 1, add property-based tests after more commands exist. | |
| Property tests everywhere | Every command type, including not-implemented later commands, gets property coverage now. | |

**User's choice:** Core properties now.
**Notes:** Property coverage should start with the high-leverage safety rules.

### Invalid Input Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Return validation issues | Commands never throw for domain-invalid input; they return unchanged state plus typed validation issues. Programmer/config errors may still throw in tests. | yes |
| Throw domain errors | Invalid domain input throws typed errors, and callers/tests catch them. | |
| Mixed by severity | Minor validation issues return; serious invariant violations throw. | |

**User's choice:** Return validation issues.
**Notes:** Domain invalidity should be inspectable and non-destructive.

### Replay Strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Exact replay | Same initial state, command, injected `now`, and RNG seed must produce identical next state, economy events, visual events, operation records, and validation issues. | yes |
| State-only replay | Same inputs must produce identical state, but event/order/operation metadata can vary for now. | |
| Replay for RNG only | Determinism applies to randomized outcomes later; non-random session commands only need normal assertions. | |

**User's choice:** Exact replay.
**Notes:** Replay applies to the entire command result, not just state.

## the agent's Discretion

None.

## Deferred Ideas

None.
