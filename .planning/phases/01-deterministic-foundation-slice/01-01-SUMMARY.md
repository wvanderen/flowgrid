---
phase: 01-deterministic-foundation-slice
plan: 01
subsystem: infra
tags: [typescript, vitest, eslint, fast-check, strict, tooling]

requires: []
provides:
  - Strict TypeScript project scaffold with separated source layers
  - Boundary-enforcing ESLint and recursive boundary scanner test
  - Red foundation-loop test encoding the Phase 1 executable contract
affects: [01-02, 01-03]

tech-stack:
  added:
    - typescript@6.0.3
    - vitest@4.1.9
    - fast-check@4.8.0
    - eslint@10.5.0
    - typescript-eslint@8.62.0
    - '@eslint/js@10.0.1'
    - vite@8.1.0
    - '@types/node@^22.10.0'
    - globals@17.7.0
  patterns:
    - Flat ESLint config with no-restricted-imports for the simulation layer
    - Recursive source-text boundary scanner as a second line of defense

key-files:
  created:
    - package.json
    - tsconfig.json
    - vitest.config.ts
    - eslint.config.js
    - src/domain/index.ts
    - src/content/index.ts
    - src/simulation/index.ts
    - src/app/README.md
    - src/persistence/README.md
    - src/render/README.md
    - src/ui/README.md
    - tests/helpers/fixtures.ts
    - tests/helpers/replay.ts
    - tests/helpers/expect-valid-state.ts
    - tests/simulation/foundation-loop.test.ts
    - tests/simulation/boundaries.test.ts

key-decisions:
  - 'User approved latest versions for all dev deps; prettier skipped (not required for Phase 1 correctness).'
  - Added typescript-eslint/@eslint/js/vite/@types/node/globals as standard companions required for ESLint 10 flat-config TypeScript parsing and Vitest runtime.

patterns-established:
  - 'Simulation purity enforced twice: ESLint no-restricted-imports (static) + boundary scanner test (source text + globals + timers).'
  - 'Stub functions in src/content and src/simulation barrels throw at runtime with explicit Plan references, so the red foundation-loop test compiles cleanly against typed stubs.'

requirements-completed:
  - FND-01
  - FND-02
  - VER-01
  - VER-02

duration: in-progress
completed: 2026-06-23
status: complete
---

# Plan 01-01: Phase 1 Developer Walking Skeleton Harness Summary

**Strict TypeScript scaffold with boundary-enforcing ESLint, recursive boundary scanner, and a red foundation-loop test encoding the Phase 1 executable contract.**

## Task 1 Checkpoint: Approved Dev Dependency Versions

User approved **latest-for-all, skip prettier** on 2026-06-23.

| Package | Version | Research verdict | Source |
|---|---|---|---|
| `typescript` | `6.0.3` | OK | npm registry |
| `vitest` | `4.1.9` | SUS (recency only) | npm registry |
| `fast-check` | `4.8.0` | OK | npm registry |
| `eslint` | `10.5.0` | SUS (recency only) | npm registry |
| `prettier` | — (skipped) | SUS (recency only) | Not required for Phase 1 |

Companion packages added to satisfy ESLint 10 flat-config TypeScript parsing and Vitest runtime peers (not part of the SUS-flagged set):

| Package | Version | Reason |
|---|---|---|
| `typescript-eslint` | `8.62.0` | TS parser + recommended rules for ESLint 10 flat config |
| `@eslint/js` | `10.0.1` | Recommended JS rules companion |
| `vite` | `8.1.0` | Required peer of `vitest@4.1.9` |
| `@types/node` | `^22.10.0` | Node 22 runtime types for the boundary scanner |
| `globals` | `17.7.0` | Required by `eslint.config.js` for `globals.node` |

## Performance

- **Tasks:** 3
- **Files created:** 17

## Accomplishments

- Strict TypeScript project with separated `domain`, `content`, `simulation`, `app`, `persistence`, `render`, `ui` layers and `npm run typecheck`/`lint`/`test` scripts that all pass against the initial scaffold.
- ESLint 10 flat config with `no-restricted-imports` denying `react`, `react-dom`, `pixi.js`, `dexie`, `zustand`, `idb`, `jsdom`, `happy-dom`, `fake-indexeddb`, and relative paths into `app`/`persistence`/`render`/`ui` from `src/simulation`.
- Recursive boundary scanner (`tests/simulation/boundaries.test.ts`) as a second line of defense that scans `src/simulation/**/*.ts` source text for forbidden imports, browser globals (`window`, `document`, `localStorage`, `sessionStorage`, `indexedDB`, `navigator`), ambient time (`Date.now`, `performance.now`, `setTimeout`, `setInterval`, `requestAnimationFrame`), and relative imports into other layers.
- Red foundation-loop test encoding decisions D-01, D-03, D-05, D-08 from `01-CONTEXT.md`: starter state -> focus completion -> Bloom -> Output route -> Core allocation -> validation, plus the invalid-duration rejection path and exact replay.
- Test helpers (`createTestIds`, `createTestSimulationEnv`, deterministic RNG, `expectReplayEqual`, `expectValidState`) ready for Plans 01-02 and 01-03.
- Typed stubs in `src/content/index.ts` (`createStarterFlowgridState`) and `src/simulation/index.ts` (`runSimulationCommand`) that throw at runtime and are replaced by later plans.

## Task Commits

Each task was committed atomically:

1. **Task 1: Confirm dev dependency versions before package files are written** - `3810679` (docs)
2. **Task 2: Create strict tooling and layer folders** - `25e8c57` (feat)
3. **Task 3: Add walking skeleton tests and boundary scanner** - `b75aa4d` (test)

## Files Created/Modified

- `package.json` - npm scripts and dev dependency declarations (type: module; scripts: typecheck, lint, test).
- `tsconfig.json` - strict TypeScript settings including `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noEmit`.
- `vitest.config.ts` - Vitest node-environment config including `tests/**/*.test.ts`.
- `eslint.config.js` - flat ESLint 10 config with `no-restricted-imports` for `src/simulation`.
- `src/domain/index.ts` - placeholder typed barrel (Plan 01-02 replaces with re-exports of full records).
- `src/content/index.ts` - placeholder barrel exporting typed stub `createStarterFlowgridState` that throws.
- `src/simulation/index.ts` - placeholder barrel exporting typed stub `runSimulationCommand` that throws.
- `src/app/README.md`, `src/persistence/README.md`, `src/render/README.md`, `src/ui/README.md` - Phase 1 boundary markers for deferred layers.
- `tests/helpers/fixtures.ts` - `createTestIds`, `createTestSimulationEnv`, tiny deterministic RNG.
- `tests/helpers/replay.ts` - `expectReplayEqual` deep-equality helper for replay tests.
- `tests/helpers/expect-valid-state.ts` - `expectValidState` placeholder (Plan 01-03 wires to `validateFlowgridSnapshot`).
- `tests/simulation/foundation-loop.test.ts` - red test encoding the foundation loop contract.
- `tests/simulation/boundaries.test.ts` - recursive source scanner for forbidden imports/globals/timers.

## Decisions Made

- **Skip prettier**: user choice; formatting is not required for Phase 1 correctness.
- **Typed stubs that throw**: barrels export functions with explicit signatures and `never`/throw bodies so the foundation-loop test compiles against real types and fails only at runtime when the stub throws. Plan 01-02/01-03 replace the bodies with real implementations without changing the call signatures the test exercises.
- **Minimal typed domain barrel**: `src/domain/index.ts` carries minimal record shapes (plain `string` ID aliases, no branding) so tests and stubs compile. Plan 01-02 replaces this barrel with re-exports from `records.ts`, `operation-records.ts`, etc., tightening IDs with branded strings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `globals` dev dependency**
- **Found during:** Task 2 (ESLint config authoring)
- **Issue:** `eslint.config.js` imports `globals` for `globals.node`, but `globals` is not bundled with ESLint 10 (it became a separate package). Without it, `npm run lint` failed with `ERR_MODULE_NOT_FOUND: Cannot find package 'globals'`.
- **Fix:** Added `globals@17.7.0` as a dev dependency.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm run lint` passes clean.
- **Committed in:** `25e8c57` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Standard companion dependency required by ESLint 10 flat-config convention. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tooling scaffold ready for Plan 01-02 to add full domain records, command/result contracts, and starter content.
- Boundary scanner and red foundation-loop test ready to validate Plan 01-02 and Plan 01-03 output.
- Plans 01-02 and 01-03 will replace the placeholder barrels in `src/domain/index.ts`, `src/content/index.ts`, and `src/simulation/index.ts` with real implementations.

---
*Phase: 01-deterministic-foundation-slice*
*Completed: 2026-06-23*
