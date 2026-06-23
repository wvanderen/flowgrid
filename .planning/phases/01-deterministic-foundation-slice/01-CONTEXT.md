# Phase 1: Deterministic Foundation Slice - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers Flowgrid's pure TypeScript simulation foundation: strict source boundaries, starter domain/content shapes, executable foundation-loop commands, deterministic inputs, typed command results, validation issues, and invariant tests. It does not deliver UI, rendering, IndexedDB persistence, app shell behavior, browser timers, full rejuvenation mechanics, or executable forge behavior.

</domain>

<decisions>
## Implementation Decisions

### First Command Surface
- **D-01:** Phase 1 should execute a foundation loop, not only isolated session math. The executable slice should create starter state, complete a focus session, fire Bloom, route starter Output to the Core, apply default Core allocation, and validate results.
- **D-02:** Later-phase systems such as rejuvenation and forge should have stable command/result/event types in Phase 1, but their executable handlers may return a clear typed not-implemented result until their roadmap phases.
- **D-03:** Focus completion should use elapsed-duration input with deterministic timing. The pure command receives `cellId`, timing or duration input, and injected `now`; tests must not depend on real timers.
- **D-04:** When starter Output routes Current to the Core, Phase 1 should apply default convert/store allocation and produce integer Energy and Core Charge, rather than merely emitting a placeholder event.

### Invariant Test Bar
- **D-05:** Phase 1 completion requires the safety-core invariant tier: no negative resources, valid references, no duplicate installs, valid Core allocation totals, token/forge monotonicity where represented, and deterministic replay for the foundation loop.
- **D-06:** Property-based tests should be included now for resource non-negativity, allocation normalization, deterministic replay, duplicate prevention, and monotonic counters where the Phase 1 state shape exists.
- **D-07:** Domain-invalid command input and invariant violations should return typed validation issues with unchanged state. Commands should not throw for normal domain invalidity; programmer/config errors may still throw in tests.
- **D-08:** Deterministic replay should be exact. The same initial state, command, injected `now`, and RNG seed must produce identical next state, economy events, visual events, operation records, and validation issues.

### the agent's Discretion
No user decisions were delegated to the agent. Downstream agents may choose implementation details that satisfy the decisions above and the project architecture constraints.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` — Defines Flowgrid's core value, daily/strategic loops, terminology, architecture constraints, economy safety rules, and out-of-scope boundaries.
- `.planning/REQUIREMENTS.md` — Defines Phase 1 requirements `FND-01` through `FND-05`, `SIM-08`, `MOD-01`, `VER-01`, and `VER-02`, plus cross-phase constraints this foundation must prepare for.
- `.planning/ROADMAP.md` — Defines Phase 1 goal, success criteria, dependencies, and v1 phase boundary.
- `.planning/STATE.md` — Confirms current focus is Phase 1 and records roadmap decisions affecting this work.

### Design Drafts
- `docs/technical-vision-draft.md` — Defines the layer boundary rule: simulation owns truth; renderer shows motion; persistence stores durable records; sync moves operations; UI configures and inspects state.
- `docs/gameplay-spine-draft.md` — Defines Cells, Modules, Core, Current, Charge, Energy, Module Tokens, Momentum, Bloom, Activation, and the daily/strategic loops the foundation command surface must support.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No implementation code exists yet. The reusable assets are the planning artifacts and design drafts listed in canonical references.

### Established Patterns
- Source boundaries are already established at the architecture level: `domain`, `content`, `simulation`, `app`, `persistence`, `render`, `ui`, and `tests` should remain separate.
- Simulation must stay pure TypeScript and must not import DOM, React, PixiJS, IndexedDB, browser timer APIs, or persistence APIs.
- Durable economy values should use integer units and allocation totals should avoid drift.

### Integration Points
- Phase 1 should create the first source layout and test structure that later phases can extend.
- Command result contracts should already expose economy events, visual events, sync-ready operation records, and validation issues so renderer, persistence, and sync phases can consume them later without changing the simulation contract.

</code_context>

<specifics>
## Specific Ideas

- The first executable simulation slice should be a small but meaningful loop: starter state -> focus completion -> Bloom -> Output-to-Core -> default Core allocation -> validation.
- Later systems should be visible in type contracts but not over-implemented before their phases.
- Exact replay matters for all returned artifacts, not just next state.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Deterministic Foundation Slice*
*Context gathered: 2026-06-23*
