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
  - Added typescript-eslint/@eslint/js/vite/@types/node as standard companions required for ESLint 10 flat-config TypeScript parsing and Vitest runtime.

patterns-established:
  - 'Simulation purity enforced twice: ESLint no-restricted-imports (static) + boundary scanner test (source text + globals + timers).'

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

## Performance

- **Tasks:** 3
- **Files created:** 16

## Accomplishments

(Filled in after Task 2 + Task 3 verification.)

## Task Commits

(Filled in after atomic commits.)
