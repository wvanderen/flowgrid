# Phase 1 Research: Deterministic Foundation Slice

**Researched:** 2026-06-23  
**Domain:** Pure TypeScript simulation foundation, deterministic command contracts, invariant testing  
**Confidence:** HIGH for project boundaries and phase scope; MEDIUM for current external tooling because registry versions are verified but several latest releases are flagged as too new by the GSD legitimacy seam.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | Strict TypeScript project with separated `domain`, `content`, `simulation`, `app`, `persistence`, `render`, `ui`, and `tests` areas. | Source layout, TypeScript config, and ESLint boundary guidance below. |
| FND-02 | Simulation code runs without DOM, React, PixiJS, IndexedDB, browser timer, or persistence APIs. | Boundary imports, pure env contract, and anti-import tests below. |
| FND-03 | Durable entities use stable IDs and typed record shapes for Cells, modules, routes, sessions, Core, forge history, settings, and sync-ready operations. | Domain record contracts and ownership model below. |
| FND-04 | Commands return changed state, economy events, visual events, sync-ready operations, and validation issues. | `SimulationResult` shape below. |
| FND-05 | Validation detects negative resources, invalid references, duplicate installs, invalid route allocations, invalid Core allocation totals, and token/forge count regressions. | Validation/invariant checklist below. |
| SIM-08 | Simulation uses injected time and RNG for deterministic tests and replayable forge outcomes. | Determinism strategy below. |
| MOD-01 | Static `ModuleDefinition`s are versioned content separate from user-owned `ModuleInstance`s. | Starter content and ownership model below. |
| VER-01 | Unit tests cover pure simulation commands for focus completion, Bloom, Activation, Core allocation, rejuvenation, Integration, Module Token grants, Forge, and validation failures. | Phase 1 test matrix below, with later commands typed as not implemented. |
| VER-02 | Property-based tests cover resource non-negativity, allocation normalization, idempotent operation IDs, duplicate prevention, monotonic forge count, and token non-duplication. | fast-check property families below. |
</phase_requirements>

## Executive Summary

Phase 1 should create a strict TypeScript-only simulation foundation, not a UI slice. The executable proof should run a deterministic foundation loop: create starter state, finish a focus session for a Cell, produce integer Current/XP, fire Bloom when the starter milestone completes, route starter Output to the Core, apply default convert/store allocation, emit economy and visual events, emit sync-ready operation records, and validate the resulting state. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]

The strongest architectural constraint is that simulation owns truth while renderer, persistence, sync, and UI stay outside the domain engine. Simulation must not import DOM, React, PixiJS, IndexedDB, browser timers, or persistence APIs. [VERIFIED: AGENTS.md] The planner should require import-boundary enforcement and tests that execute simulation in the Vitest Node environment with no browser test environment installed for Phase 1. [CITED: https://vitest.dev/guide/]

Primary recommendation: build the first commit around `src/domain`, `src/content`, `src/simulation`, `tests/simulation`, `tests/properties`, strict `tsconfig.json`, ESLint `no-restricted-imports`, and command contracts that future UI, persistence, renderer, and sync phases can consume without changing the simulation result shape. [VERIFIED: docs/technical-vision-draft.md]

## Scope Boundaries

In scope:
- Strict TypeScript package setup, scripts, and configs for typecheck, lint, and test. [VERIFIED: .planning/ROADMAP.md]
- Source folders for all layers, with Phase 1 implementation concentrated in `domain`, `content`, `simulation`, and tests. [VERIFIED: .planning/REQUIREMENTS.md]
- Branded ID/string types and normalized record shapes for Cells, ModuleDefinitions, ModuleInstances, routes, sessions, Core, forge history, settings, and operation records. [VERIFIED: docs/technical-vision-draft.md]
- Pure command contracts and executable foundation-loop command handler. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
- Stable not-implemented command results for rejuvenation, integration, forge, and install-module handlers that are not executable in this phase. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
- Validation issues for normal domain invalidity with unchanged state. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
- Unit and property-based tests for deterministic replay, integer safety, duplicate prevention, allocation normalization, and monotonic counters represented in Phase 1. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]

Out of scope:
- React, UI views, PixiJS, Canvas/WebGL, DOM interactions, IndexedDB/Dexie, browser timers, persistence repositories, cloud sync, full rejuvenation mechanics, executable Forge behavior, and full module graph/patch editor behavior. [VERIFIED: user prompt]
- Real active-session timer state. Phase 1 should accept `durationSeconds`, `startedAt`, `endedAt` or injected `now` as command data; it should not call `Date.now()`, `setInterval`, `performance.now()`, or browser APIs. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]

## Recommended Source Layout

Use this initial tree. Empty placeholder folders can exist, but only `domain`, `content`, `simulation`, and tests need real implementation in Phase 1. [VERIFIED: docs/technical-vision-draft.md]

```txt
src/
  domain/
    ids.ts
    primitives.ts
    records.ts
    operation-records.ts
    time.ts
    validation.ts
    invariants.ts
    result.ts
  content/
    content-version.ts
    starter-modules.ts
    starter-state.ts
    formulas.ts
  simulation/
    commands/
      complete-focus-session.ts
      set-core-allocation.ts
      not-implemented.ts
    systems/
      bloom.ts
      core-allocation.ts
      current.ts
      modules.ts
      routes.ts
    deterministic-env.ts
    economy-events.ts
    visual-events.ts
    operation-events.ts
    engine.ts
    selectors.ts
  app/
    README.md
  persistence/
    README.md
  render/
    README.md
  ui/
    README.md
tests/
  helpers/
    fixtures.ts
    replay.ts
    expect-valid-state.ts
  simulation/
    foundation-loop.test.ts
    validation.test.ts
    command-results.test.ts
    boundaries.test.ts
  properties/
    deterministic-replay.property.test.ts
    economy-safety.property.test.ts
    allocation.property.test.ts
    ownership.property.test.ts
```

Recommended public exports:
- `src/domain/index.ts`: IDs, record shapes, validation issues, `FlowgridSnapshot`, `SyncOperation`, branded primitives. [ASSUMED]
- `src/content/index.ts`: `CONTENT_VERSION`, `STARTER_MODULE_DEFINITIONS`, `createStarterFlowgridState`. [ASSUMED]
- `src/simulation/index.ts`: `runSimulationCommand`, specific command creators, `SimulationEnv`, `SimulationResult`, event types. [ASSUMED]

The planner should require a boundary test that recursively scans `src/simulation/**/*.ts` and fails if files import from `react`, `react-dom`, `pixi.js`, `dexie`, `zustand`, `@/ui`, `@/render`, `@/persistence`, `window`, `document`, `localStorage`, `indexedDB`, `Date.now`, `setTimeout`, or `setInterval`. ESLint should enforce the import subset, while the test should enforce browser global/timer usage that import rules do not catch. [CITED: https://eslint.org/docs/latest/rules/no-restricted-imports]

## Simulation Contract Shape

The core command should be a discriminated union with deterministic metadata. [VERIFIED: docs/technical-vision-draft.md]

```ts
export type SimulationCommand =
  | CompleteFocusSessionCommand
  | SetCoreAllocationCommand
  | LogRejuvenationCommand
  | RunForgeCommand
  | InstallModuleCommand;

export type SimulationEnv = {
  now: IsoDateTimeString;
  localDate: LocalDateString;
  rng: Rng;
  contentVersion: ContentVersion;
};

export type SimulationResult = {
  status: 'applied' | 'rejected' | 'not_implemented';
  previousState: FlowgridSnapshot;
  nextState: FlowgridSnapshot;
  economyEvents: EconomyEvent[];
  visualEvents: VisualEvent[];
  operations: SyncOperation[];
  validationIssues: ValidationIssue[];
};
```

Acceptance signal: rejected normal domain-invalid commands return `status: 'rejected'`, preserve referential equality or deep equality of `previousState` and `nextState`, emit no economy events, no visual events, and no operations except optional validation telemetry if the planner explicitly allows it. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]

Recommended foundation command:

```ts
export type CompleteFocusSessionCommand = {
  type: 'complete_focus_session';
  operationId: OperationId;
  cellId: CellId;
  startedAt: IsoDateTimeString;
  endedAt: IsoDateTimeString;
  durationSeconds: IntSeconds;
};
```

Recommended foundation result events:
- `focus_session_completed`
- `current_generated`
- `cell_xp_gained`
- `bloom_fired`
- `cell_activated`
- `current_routed_to_core`
- `core_current_converted`
- `core_charge_stored`
- `state_validated`

These event names are recommendations; the planner may rename them, but the event family separation must remain: economy events are durable meaning, visual events are transient presentation requests, and operations are sync-ready mutation records. [VERIFIED: AGENTS.md]

## Determinism Strategy

Do not use real time in simulation. Every command should receive time from `SimulationEnv.now`, `SimulationEnv.localDate`, and explicit command inputs. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]

Use an internal RNG interface even before executable forge behavior exists:

```ts
export type Rng = {
  seed: string;
  nextInt(minInclusive: number, maxInclusive: number): [value: number, next: Rng];
};
```

Phase 1 can implement a tiny deterministic test RNG in `tests/helpers/fixtures.ts` and a simple production placeholder in `src/simulation/deterministic-env.ts`; it should not select a forge RNG package until the forge phase unless the planner explicitly wants one now. [ASSUMED]

Exact replay means `runSimulationCommand(initialState, command, env)` returns deep-equal `nextState`, `economyEvents`, `visualEvents`, `operations`, and `validationIssues` for identical input. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md] Property tests should serialize results with stable key order or compare plain objects directly to avoid false negatives from object identity. [ASSUMED]

Operation IDs must be command inputs, not generated inside simulation, so replay can reproduce operation records exactly. [VERIFIED: .planning/REQUIREMENTS.md]

## Starter Content and Ownership Model

Static content:
- `ModuleDefinition` belongs in `src/content/starter-modules.ts` and is versioned with `CONTENT_VERSION`. [VERIFIED: .planning/REQUIREMENTS.md]
- Starter definitions should include `generator`, `charge_core`, `output`, and `bloom`. [VERIFIED: docs/gameplay-spine-draft.md]
- Definitions describe type, ports/triggers/effects, install slot kind, content version, and tags; they never store user-specific owner, level, runtime counters, or installation state. [VERIFIED: docs/technical-vision-draft.md]

User-owned state:
- `ModuleInstance` belongs in `FlowgridSnapshot.moduleInstances` and references `definitionId`. [VERIFIED: docs/technical-vision-draft.md]
- A starter Cell owns four starter instances, each with stable IDs, `ownerCellId`, `installedSlotId`, `createdAt`, and `updatedAt`. [VERIFIED: docs/technical-vision-draft.md]
- Duplicate prevention should validate that one instance cannot be installed into two slots and that a Cell cannot contain duplicate singleton starter definitions unless a later phase explicitly introduces duplicates/fusion. [VERIFIED: .planning/research/PITFALLS.md]

Recommended starter model:

```ts
export type ModuleDefinition = {
  id: ModuleDefinitionId;
  version: ContentVersion;
  kind: 'generator' | 'charge_core' | 'output' | 'bloom';
  singletonPerCell: boolean;
  phase1Behavior: 'complete_focus_session' | 'store_cell_charge' | 'route_to_core' | 'daily_bloom';
};

export type ModuleInstance = {
  id: ModuleInstanceId;
  definitionId: ModuleDefinitionId;
  ownerCellId: CellId;
  installedSlotId: ModuleSlotId;
  level: IntNonNegative;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
};
```

## Validation and Invariants

Validation should return structured issues, not plain strings. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]

```ts
export type ValidationIssue = {
  code: ValidationIssueCode;
  severity: 'error' | 'warning';
  entityType?: EntityType;
  entityId?: string;
  path?: string;
  message: string;
};
```

Required Phase 1 invariant functions:
- `validateNoNegativeResources(snapshot)` checks Cell charge, XP, Momentum if non-negative, Core Energy, Core Charge, Integration, Module Tokens, and forge count. [VERIFIED: .planning/REQUIREMENTS.md]
- `validateReferences(snapshot)` checks modules reference existing definitions and owner Cells, installed slots belong to the owner Cell, routes reference existing endpoints, and sessions reference existing Cells where represented. [VERIFIED: .planning/REQUIREMENTS.md]
- `validateNoDuplicateInstalls(snapshot)` checks unique module instance IDs, unique installed slot IDs per Cell, and starter singleton definitions per Cell. [VERIFIED: .planning/REQUIREMENTS.md]
- `validateCoreAllocation(snapshot)` checks `convertAllocationPercent + storeAllocationPercent === 100` and each side is an integer between 0 and 100. [VERIFIED: .planning/REQUIREMENTS.md]
- `validateMonotonicCounters(previous, next)` checks Module Tokens never decrease unless a command explicitly spends them, forge count never decreases, and lifetime Energy does not regress. [VERIFIED: AGENTS.md]
- `validateOperationShape(result)` checks every applied command emits a sync-ready operation with stable ID, command type, entity type, payload version, createdAt/updatedAt or equivalent timestamps, and deterministic payload. [VERIFIED: AGENTS.md]

Normal invalidity examples that should reject without throwing:
- Unknown `cellId`.
- Non-positive `durationSeconds`.
- `endedAt` earlier than `startedAt`.
- Missing starter modules for the requested foundation loop.
- Core allocation totals not equal to 100.
- Duplicate module install state.
- Negative resource value in input state.

Programmer/config errors may still throw in tests when content definitions are malformed or the command union is not exhaustively handled. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]

## Testing Strategy

Use Vitest for unit tests because it supports TypeScript and Node-based tests, and its docs specify `.test.`/`.spec.` discovery plus `vitest run` for one-shot execution. [CITED: https://vitest.dev/guide/] Use fast-check for property tests because it generates inputs, runs assertions over many cases, and shrinks failing cases. [CITED: https://fast-check.dev/docs/introduction/]

Required unit test families:
- `foundation-loop.test.ts`: starter state -> complete session -> Bloom -> Output route -> Core allocation -> validation issues empty. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
- `command-results.test.ts`: every command path returns `nextState`, `economyEvents`, `visualEvents`, `operations`, and `validationIssues`; later-phase commands return typed `not_implemented`. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
- `validation.test.ts`: invalid references, negative resources, duplicate installs, bad allocations, token regression, and forge count regression produce issues. [VERIFIED: .planning/REQUIREMENTS.md]
- `boundaries.test.ts`: simulation imports and source text do not reference forbidden layers or browser timer globals. [VERIFIED: AGENTS.md]

Required property test families:
- Deterministic replay: generated valid durations, allocations, seeds, and fixed starter states produce exact result equality on repeated runs. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
- Resource non-negativity: any generated valid focus completion cannot produce negative Current, XP, Energy, Core Charge, Integration, Tokens, Cell Charge, or lifetime totals. [VERIFIED: .planning/REQUIREMENTS.md]
- Allocation normalization: generated convert/store inputs are either normalized by the setter or rejected; accepted state always totals 100. [VERIFIED: .planning/REQUIREMENTS.md]
- Duplicate prevention: generated duplicate module ownership/install states are rejected and never silently repaired by command handlers. [VERIFIED: .planning/REQUIREMENTS.md]
- Monotonic counters: generated foundation command sequences never reduce represented forge count, lifetime Energy, or tokens except through typed spend commands; Phase 1 may have no executable token spend. [VERIFIED: AGENTS.md]

Acceptance commands:

```bash
npm run typecheck
npm run lint
npm run test -- --run
```

The planner should keep property tests bounded and fast for Phase 1, for example `fc.assert(property, { numRuns: 100 })`, then increase later only if runtime is acceptable. [ASSUMED]

## Dependency and Tooling Notes

Environment observed on 2026-06-23: Node `v22.22.3` and npm `10.9.8` are available. [VERIFIED: local command]

Recommended Phase 1 dev dependencies:

| Package | Verified version | Published/modified | Registry verdict | Recommendation |
|---------|------------------|--------------------|------------------|----------------|
| `typescript` | 6.0.3 | npm modified 2026-06-18 | OK | Use for strict compile and no-emission typecheck. [VERIFIED: npm registry] |
| `vitest` | 4.1.9 | npm modified 2026-06-15 | SUS: too-new | Use only after a planner checkpoint confirms the current latest is acceptable or pins a stable patch. [WARNING: flagged as suspicious by GSD package gate — verify before installing.] |
| `fast-check` | 4.8.0 | npm modified 2026-05-11 | OK | Use for property tests. [VERIFIED: npm registry] |
| `eslint` | 10.5.0 | npm modified 2026-06-12 | SUS: too-new | Use for import-boundary lint only after a planner checkpoint confirms the current latest is acceptable; otherwise implement boundary tests first. [WARNING: flagged as suspicious by GSD package gate — verify before installing.] |
| `prettier` | 3.8.4 | npm modified 2026-06-09 | SUS: too-new | Optional in Phase 1; defer or install only after a planner checkpoint because formatting is not required for simulation correctness. [WARNING: flagged as suspicious by GSD package gate — verify before installing.] |

Package legitimacy audit: `typescript` and `fast-check` returned OK; `vitest`, `eslint`, and `prettier` returned SUS only because latest releases are recent, not because of missing repository, deprecation, or postinstall risk. All checked packages had source repositories, licenses, and no `scripts.postinstall` metadata returned by `npm view`. [VERIFIED: GSD package-legitimacy seam] [VERIFIED: npm registry]

TypeScript config recommendations:
- Set `"strict": true`; TypeScript documents `strict` as enabling stricter type checking and notes future TypeScript versions may add stricter checks under this flag. [CITED: https://www.typescriptlang.org/tsconfig/#strict]
- Add `"exactOptionalPropertyTypes": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"noFallthroughCasesInSwitch": true`, and `"noImplicitReturns": true` for domain-model safety. [ASSUMED]
- Use `"noEmit": true` for `npm run typecheck` until a build/bundle phase exists. [ASSUMED]

ESLint boundary approach:
- Use `no-restricted-imports` for package-level bans in simulation. ESLint documents this rule as disallowing specified modules loaded by `import`. [CITED: https://eslint.org/docs/latest/rules/no-restricted-imports]
- For path-layer rules, configure restricted patterns such as `../ui/*`, `../render/*`, `../persistence/*`, `@/ui/*`, `@/render/*`, `@/persistence/*`, and package names `react`, `react-dom`, `pixi.js`, `dexie`, `zustand`. [ASSUMED]

No Phase 1 runtime dependency is required for Zod, Dexie, React, PixiJS, or a UUID package. Define types and inject IDs from command inputs for now. [VERIFIED: user prompt]

## Risks and Pitfalls

- Animation-owned truth: if visual events mutate resources later, replay/skipped animation can duplicate or lose economy results; Phase 1 must separate `economyEvents` from `visualEvents`. [VERIFIED: .planning/research/PITFALLS.md]
- Browser-time leakage: `Date.now()` or timers inside simulation make replay non-exact; Phase 1 must inject `now`, `localDate`, and command durations. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
- Definition/instance confusion: mutating `ModuleDefinition` during install/ownership will break Forge and duplicate rules; Phase 1 must separate versioned static content from user-owned instances. [VERIFIED: .planning/research/PITFALLS.md]
- Float drift: durable economy values and allocation percentages should be integers; use integer units and integer percent/basis-point allocation now. [VERIFIED: AGENTS.md]
- Overbuilding later phases: typed `not_implemented` results are enough for rejuvenation/forge handlers; implementing their economy now would violate Phase 1 scope. [VERIFIED: user prompt]
- Silent invalidity: commands that throw or partially mutate on normal domain errors will be hard to persist safely; invalid domain input must produce issues with unchanged state. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
- Latest package churn: Vitest, ESLint, and Prettier latest versions were flagged as too-new by the GSD package gate; planner should include a checkpoint before locking exact versions. [VERIFIED: GSD package-legitimacy seam]

## Planner Guidance

Recommended plan slices:

1. Tooling foundation: create `package.json`, `tsconfig.json`, `vitest.config.ts`, optional `eslint.config.js`, and scripts for `typecheck`, `lint`, and `test`. [VERIFIED: .planning/ROADMAP.md]
2. Domain contracts: implement branded IDs/primitives, record shapes, validation issue types, event types, operation shape, and `FlowgridSnapshot`. [VERIFIED: .planning/REQUIREMENTS.md]
3. Starter content: implement content version, starter module definitions, and starter state factory with one Cell, Core defaults, four starter module instances, and default route to Core. [VERIFIED: docs/gameplay-spine-draft.md]
4. Pure simulation engine: implement `runSimulationCommand`, complete-focus-session foundation loop, set-core-allocation, and typed not-implemented handlers. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
5. Validation: implement full invariant validators and run them after every applied command. [VERIFIED: .planning/REQUIREMENTS.md]
6. Tests: implement deterministic unit tests, property tests, and import/global boundary tests before considering Phase 1 done. [VERIFIED: .planning/REQUIREMENTS.md]

Definition of done:
- `npm run typecheck`, `npm run lint`, and `npm run test -- --run` pass. [ASSUMED]
- Foundation loop result includes non-empty economy events, visual events, operations, and empty validation issues for valid starter input. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
- Invalid command tests prove unchanged state and structured issues. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
- Replay test proves identical state/events/operations/issues for same state, command, `now`, and RNG seed. [VERIFIED: .planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md]
- Boundary test proves `src/simulation` has no forbidden imports or browser timer/global references. [VERIFIED: AGENTS.md]

## Validation Architecture

Although `.planning/config.json` has `workflow.nyquist_validation` set to `false`, this phase has concrete validation artifacts the planner should still require because verification is part of Phase 1 scope. [VERIFIED: .planning/config.json] [VERIFIED: .planning/ROADMAP.md]

| Artifact | Purpose | Acceptance Signal |
|----------|---------|-------------------|
| `tests/simulation/foundation-loop.test.ts` | Proves starter state through session completion, Bloom, route to Core, default allocation, and validation. | Valid command returns `status: 'applied'`, changed state, non-empty event arrays, operation records, and no validation issues. |
| `tests/simulation/validation.test.ts` | Proves invalid states/commands return structured issues. | Negative resources, invalid references, duplicates, bad allocations, and regressions are detected. |
| `tests/simulation/command-results.test.ts` | Proves all command handlers obey result shape. | Executable commands apply/reject; deferred commands return `not_implemented` with unchanged state. |
| `tests/simulation/boundaries.test.ts` | Proves simulation is headless and pure relative to forbidden layers. | Forbidden imports/globals fail the test. |
| `tests/properties/deterministic-replay.property.test.ts` | Proves exact replay. | Same generated valid input returns deep-equal result. |
| `tests/properties/economy-safety.property.test.ts` | Proves no negative resources after valid commands. | Generated valid durations and starter states preserve non-negative resource invariants. |
| `tests/properties/allocation.property.test.ts` | Proves Core allocation invariant. | Accepted allocations total 100; invalid allocations reject unchanged. |
| `tests/properties/ownership.property.test.ts` | Proves definition/instance and duplicate install rules. | Generated duplicate installs are rejected or reported by validation. |

Quick validation command: `npm run test -- --run tests/simulation/foundation-loop.test.ts tests/simulation/validation.test.ts` [ASSUMED]  
Full Phase 1 validation command: `npm run typecheck && npm run lint && npm run test -- --run` [ASSUMED]

## Sources

Primary project sources:
- `AGENTS.md` - project constraints, architecture boundaries, economy safety, testing priority.
- `.planning/PROJECT.md` - product identity, requirements, loops, terminology, constraints.
- `.planning/REQUIREMENTS.md` - Phase 1 requirement IDs and invariant/test obligations.
- `.planning/ROADMAP.md` - Phase 1 goal, requirements, and success criteria.
- `.planning/STATE.md` - confirms current focus is Phase 1.
- `.planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md` - locked Phase 1 decisions.
- `.planning/research/STACK.md`, `ARCHITECTURE.md`, `FEATURES.md`, `PITFALLS.md`, `SUMMARY.md` - prior project research.
- `docs/technical-vision-draft.md` - architecture and command model.
- `docs/gameplay-spine-draft.md` - starter module and economy terminology.

External sources:
- TypeScript TSConfig reference: https://www.typescriptlang.org/tsconfig/#strict
- Vitest guide: https://vitest.dev/guide/
- Vitest features: https://vitest.dev/guide/features.html
- fast-check introduction: https://fast-check.dev/docs/introduction/
- fast-check first property tutorial: https://fast-check.dev/docs/tutorials/quick-start/our-first-property-based-test/
- ESLint `no-restricted-imports`: https://eslint.org/docs/latest/rules/no-restricted-imports
- npm registry metadata checked with `npm view` on 2026-06-23.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Public barrel exports should exist at `src/domain/index.ts`, `src/content/index.ts`, and `src/simulation/index.ts`. | Recommended Source Layout | Minor refactor if the codebase chooses direct imports only. |
| A2 | A simple test RNG placeholder is enough for Phase 1, and forge RNG package selection can wait. | Determinism Strategy | Planner might need to add a small RNG package now if operation replay requires realistic random traces earlier. |
| A3 | Property tests should start around 100 runs for speed. | Testing Strategy | Could miss rare counterexamples until run count increases. |
| A4 | Extra strict TypeScript flags beyond `strict` are appropriate. | Dependency and Tooling Notes | Could slow early implementation if TypeScript 6 behavior is noisier than expected. |
| A5 | Full validation command should include typecheck, lint, and Vitest. | Planner Guidance / Validation Architecture | If ESLint is deferred due to SUS flag, lint command may need a Wave 0 checkpoint or temporary boundary-test substitute. |
