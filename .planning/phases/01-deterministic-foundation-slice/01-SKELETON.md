# Walking Skeleton - Flowgrid

**Phase:** 1
**Generated:** 2026-06-23

## Capability Proven End-to-End

A developer can run strict TypeScript checks and pure simulation tests that execute the Flowgrid starter foundation loop from starter state through focus completion, Bloom, Output routing, Core allocation, and invariant validation.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | No UI framework touched in Phase 1; React + Vite remain planned for app shell phases | Phase 1 proves the developer-facing pure simulation slice without inventing UI work outside the roadmap boundary. |
| Data layer | No IndexedDB/Dexie implementation in Phase 1; domain records and sync-ready operation shapes are created now | Persistence is Phase 2, but stable IDs and operation-shaped results must exist before durable records are stored. |
| Auth | None | Flowgrid v1 is local-first and Phase 1 has no accounts, server, or remote sync surface. |
| Deployment target | Local developer commands: `npm run typecheck`, `npm run lint`, `npm run test -- --run` | The walking skeleton is a deterministic developer slice rather than a browser product slice. |
| Directory layout | `src/domain`, `src/content`, `src/simulation`, `src/app`, `src/persistence`, `src/render`, `src/ui`, `tests/helpers`, `tests/simulation`, `tests/properties` | Mirrors the architecture boundary: simulation owns truth; renderer shows motion; persistence stores durable records; sync moves operations; UI configures and inspects state. |

## Stack Touched in Phase 1

- [ ] Project scaffold: TypeScript config, Vitest config, ESLint boundary config, npm scripts for typecheck/lint/test.
- [ ] Routing: not touched; UI and routes are out of scope for this phase.
- [ ] Database: not touched; Phase 1 creates record and operation contracts only.
- [ ] UI: not touched; normal component UI starts in a later user-visible slice.
- [ ] Deployment: local full-stack developer run command is `npm run typecheck && npm run lint && npm run test -- --run`.

## Out of Scope

- React app shell, routes, panels, inspectors, and browser interaction.
- PixiJS, Canvas/WebGL, renderer adapters, visual playback, and screenshots.
- IndexedDB, Dexie, migrations, repositories, import/export, backup, and storage quota behavior.
- Browser timers, DOM APIs, localStorage, IndexedDB APIs, `Date.now()`, `setTimeout`, and `setInterval` in simulation.
- Executable rejuvenation, Integration token grants, Forge rolls, reward installation, active session timers, and full patch editing mechanics.
- Cloud sync, accounts, remote transport, conflict resolution, native notifications, widgets, social features, and prestige.

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without renegotiating the architectural boundary:

- Phase 2: Durable local-first records, migrations, append-only history, exports, restore validation, and sync-ready operation rows.
- Phase 3: Playable Generator Flowgrid with Cell creation, focus completion, Current/Bloom/Core feedback, history, semantic controls, and renderer smoke.
- Phase 4: Core allocation, Energy/Core Charge balance, rejuvenation processing, Integration, Module Tokens, and return cues.
- Phase 5: Curated Module Forge choices, starter customization, forge history, and install validation.
- Phase 6: Browser UAT, accessibility, rendering safety, settings, recovery UX, and release-readiness checks.
