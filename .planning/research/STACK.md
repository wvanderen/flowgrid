# Technology Stack

**Project:** Flowgrid  
**Researched:** 2026-06-23  
**Scope:** Stack dimension for a greenfield local-first TypeScript focus game / systems app  
**Overall confidence:** MEDIUM

## Recommendation

Build Flowgrid as a browser-first TypeScript app with a strict split between app UI, renderer, simulation, persistence, and future sync:

```txt
React + Vite app shell
PixiJS v8 renderer for Flowgrid/module-board visuals
Pure TypeScript deterministic simulation package
Dexie-backed IndexedDB records and migrations
Zustand vanilla/app store for UI coordination only
Vitest + fast-check + fake-indexeddb for simulation/persistence tests
Playwright for end-to-end, accessibility, canvas smoke, and screenshot tests
Sync-ready operation queue, but no sync framework in v1
```

This is the most conservative production stack for Flowgrid because it matches the product constraints: normal accessible UI for controls and inspectors, high-performance animated hex visuals, pure testable game logic, local durable records, safe migrations, and a path to future multi-device sync without committing to a sync vendor before conflict semantics are known.

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TypeScript | Current stable 5.x | Language for app, domain, simulation, persistence, and tests | Flowgrid needs typed domain contracts, deterministic command inputs/outputs, migration types, and test fixtures. Keep `strict` on from day one. | HIGH |
| React | 19.x docs current | App shell, panels, forms, inspectors, settings, history, forge choices | React is the safest ecosystem choice for a production local-first tool/game hybrid. The renderer can stay imperative while React owns accessible UI surfaces. | MEDIUM |
| Vite | 8.x docs current | Dev server, bundling, static app build | Vite is the standard lightweight build tool for custom React SPAs. It keeps Flowgrid client-first instead of forcing server framework assumptions into an offline app. | MEDIUM |
| React Router | v7 | App-level routes and view boundaries | Use boring route primitives for Home, Cell Board, Core, Forge, History, and Settings. Avoid file-router/full-stack complexity until the app actually needs server routes. | MEDIUM |
| Zustand | 5.x/current | UI/app coordination store | Use `zustand/vanilla` or a small bound store for selected cell/module, panels, pending visual events, camera state, and command dispatch status. Do not persist domain state through Zustand. | MEDIUM |

### Rendering

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PixiJS | 8.x | WebGL/WebGPU-capable 2D renderer for hex lattice, routes, particles, Bloom, Current trails, Core ripples | PixiJS v8 officially supports WebGL and optional WebGPU renderers, a scene graph, interactions, filters, text, and high-performance 2D visuals. It fits Flowgrid's animated hex grid better than DOM/SVG. | MEDIUM |
| Custom hex math module | Internal | Axial/cube coordinates, rings, neighbors, layout projection | Hex coordinates are domain-critical. Own this code in pure TypeScript so simulation, layout, tests, persistence, and sync all agree. Use Red Blob-style axial/cube algorithms as the conceptual model, not as a runtime dependency. | HIGH |
| Custom Pixi scene adapter | Internal | Bridge simulation snapshots/visual events to Pixi display objects | The renderer must visualize emitted events without owning economy truth. Wrap Pixi in `render/flowgrid` and `render/module-board` adapters; never import Pixi from simulation. | HIGH |
| pixi-viewport | Verify before phase use | Optional pan/zoom camera helper | Consider only if PixiJS v8 compatibility and maintenance are verified during renderer phase planning. A simple custom camera may be safer for the first slice. | LOW |

### Domain and Simulation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Pure TypeScript modules | Internal | Deterministic simulation engine | Core logic should be functions over durable state, commands, elapsed time, and injected randomness. This keeps the game testable and portable. | HIGH |
| Zod | 4.x/current | Runtime validation at app boundaries | Use for imported backups, migration outputs, sync operation payloads, and dev-only invariant checks. Do not put Zod in hot simulation loops. | MEDIUM |
| Seeded RNG wrapper | Internal, backed by `pure-rand` or equivalent | Deterministic forge rolls and randomized reward tests | Randomness must be injected and replayable. Hide the library behind an `Rng` interface so tests can replay failures. Verify package choice during the forge phase. | MEDIUM |
| Integer resource units | Internal convention | Current, Charge, Energy, XP, tokens, allocations | Store economy values as integers and allocation basis points where possible. Avoid floats for durable economy truth; add a number-scaling abstraction before long-tail exponential values arrive. | HIGH |

### Database and Persistence

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| IndexedDB | Browser platform | Durable local-first storage | Required for large local history, records, indexes, and offline operation. Avoid `localStorage` except maybe tiny noncritical UI preferences. | HIGH |
| Dexie | 4.x/current | IndexedDB wrapper, schema versions, upgrades, transactions | Dexie gives a mature TypeScript-friendly IndexedDB layer with versioned schemas and upgrade functions. It is more ergonomic than raw IndexedDB/idb for a multi-store app with migrations. | MEDIUM |
| Repository layer | Internal | Persistence boundary | Repositories should load/save records and enqueue sync operations, but never run simulation rules. This keeps migrations, backup/export, and future sync contained. | HIGH |
| fake-indexeddb | Current | Persistence unit tests | Lets Vitest exercise Dexie repositories and migrations without a browser. Pair with real-browser Playwright migration smoke tests later. | MEDIUM |

Recommended initial stores:

```txt
metadata
cells
moduleDefinitions
moduleInstances
patches
routes
sessions
tasks
core
forgeHistory
events
syncQueue
settings
migrationIssues
```

### Sync Readiness

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Internal operation queue | Internal | Future sync contract | Every durable command should produce a sync-ready operation record with stable IDs, entity type, payload version, createdAt, updatedAt, status, and retry metadata. | HIGH |
| UUID v7 or `crypto.randomUUID()` | Current | Stable entity and operation IDs | Prefer UUID v7 for sortable operation IDs if a well-maintained package is selected; otherwise `crypto.randomUUID()` is enough for v1. Verify package during persistence phase. | MEDIUM |
| No sync framework in v1 | Decision | Keep MVP local-first | Flowgrid has game-economy counters, append-only sessions, mutable layouts, and future prestige. These need entity-specific conflict rules. Prematurely adopting Electric, Replicache, RxDB, PouchDB, Yjs, or Automerge would force semantics before product behavior is known. | HIGH |

Future sync candidates:

| Candidate | Best Fit | Why Not Now | Confidence |
|-----------|----------|-------------|------------|
| Replicache | Optimistic client/server sync with custom mutators | Closest to command/operation semantics, but requires backend protocol and conflict policy decisions. | MEDIUM |
| Electric | Postgres read-path sync and shapes | Strong if Flowgrid later chooses Postgres-backed cloud sync, but it is read-path oriented and writes still need API patterns. | MEDIUM |
| RxDB | All-in local database plus replication | Powerful but heavier and more opinionated than needed for a single-device MVP. Could obscure simulation/persistence boundaries. | MEDIUM |
| TinyBase | Small reactive local store with merge/sync primitives | Interesting for simple tabular data, but Flowgrid already needs explicit simulation commands and Dexie records. | LOW |
| PouchDB/CouchDB | Multi-master document replication | Mature sync model, but revision trees and document-shape constraints are a poor default for deterministic economy operations. | MEDIUM |
| Yjs/Automerge | CRDT collaborative documents/layouts | Good for future collaborative notes or shared layout editing; not a default for Energy, Core Charge, tokens, or forge counts. | MEDIUM |

### Testing and Quality

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | 4.x docs current | Unit and integration tests | Aligns with Vite, supports TS well, and is fast enough for simulation-heavy test suites. | MEDIUM |
| fast-check | Current docs updated 2026-04-28 | Property-based simulation tests | Use for invariants: no negative resources, allocation sums, no duplicate installs, forge count monotonicity, route normalization, migration round-trips. | MEDIUM |
| Playwright | Current | E2E, browser, accessibility, screenshot/canvas smoke tests | Needed because Flowgrid has real browser storage, Canvas/WebGL visuals, keyboard/mouse/touch flows, and screenshots. | MEDIUM |
| Testing Library + user-event | Current | React component and accessibility-oriented UI tests | Use for app shell controls, forms, dialogs, inspectors, and keyboard behavior. Keep Pixi renderer tests in Playwright/smoke tests instead. | MEDIUM |
| ESLint + Prettier | Current | Static quality and formatting | Boring defaults are enough. Add import-boundary rules so simulation cannot import UI/Pixi/IndexedDB. | HIGH |

### Styling and UI Primitives

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x/current | Utility styling and design tokens | Good for fast production UI if paired with CSS variables and a restrained component layer. Do not let it become the domain model. | MEDIUM |
| Radix UI primitives | Current | Accessible dialogs, menus, popovers, tabs, tooltips, switches | Flowgrid needs normal accessible UI around Canvas. Radix gives behavior primitives without forcing a visual theme. | MEDIUM |
| lucide-react | Current | App-shell icons | Small, standard icon set for buttons/toolbars/settings. Use icons for common actions rather than text-heavy controls. | MEDIUM |

## Installation Baseline

Verify exact latest versions during implementation. The baseline package shape should be:

```bash
# Core app
pnpm create vite flowgrid --template react-ts
pnpm add react react-dom react-router zustand pixi.js dexie zod

# UI
pnpm add @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-switch lucide-react
pnpm add -D tailwindcss @tailwindcss/vite

# Testing
pnpm add -D vitest fast-check fake-indexeddb @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test

# Quality
pnpm add -D eslint prettier typescript
```

Optional packages to evaluate later, not baseline:

```bash
# Renderer phase only, after compatibility check
pnpm add pixi-viewport

# Future sync spike only
pnpm add replicache
pnpm add @electric-sql/client
pnpm add rxdb
pnpm add yjs
pnpm add @automerge/automerge
```

## Architecture Rules Implied by Stack

```txt
ui -> app -> simulation -> domain
render -> simulation selectors / visual events
persistence -> domain
app -> persistence
sync -> persistence/domain
```

Hard rules:

- `domain` imports no app, browser, Pixi, React, Dexie, or Zustand code.
- `simulation` is pure TypeScript and accepts injected `now`, elapsed time, and RNG.
- `render` consumes immutable snapshots/selectors plus transient visual events.
- `ui` dispatches commands and displays selectors; it does not calculate economy rules.
- `persistence` stores records, migrations, backups, and sync queue; it does not run game commands.
- `syncQueue` records are created in v1 even though cloud sync is deferred.
- Completed sessions and forge history are append-only unless a future explicit adjustment record exists.

## What Not To Use

| Avoid | Why | Use Instead | Confidence |
|-------|-----|-------------|------------|
| Next.js / Remix / full-stack framework for v1 | Flowgrid is local-first, canvas-heavy, offline-first, and does not need server rendering or server actions for the first production slice. | React + Vite SPA; revisit if a server product surface appears. | MEDIUM |
| Building the whole app in Canvas/WebGL | Accessibility, forms, text, settings, history, and keyboard flows become harder and more fragile. | React/Radix for UI, PixiJS for visual board surfaces. | HIGH |
| DOM/SVG-only renderer as the long-term visual layer | It may be fine for prototypes, but Current trails, particles, Glow/Bloom, pan/zoom boards, and large animated graphs will strain DOM/SVG. | PixiJS v8 adapter with explicit scene objects. | MEDIUM |
| Persisting the Zustand store | It encourages one giant UI-shaped blob and bypasses schema migrations. | Dexie records through repositories; Zustand stores view/session coordination only. | HIGH |
| One giant `AppState` IndexedDB blob | Migrations, partial sync, history, backups, and conflict rules become painful. | Entity stores and append-friendly event/session/operation records. | HIGH |
| Raw CRDTs for economy counters | Energy, Charge, Module Tokens, forge counts, and prestige require domain-specific monotonicity and anti-duplication rules. | Server-applied operations, event replay, or explicit per-entity merge rules. | MEDIUM |
| RxDB/PouchDB as v1 default | They solve broad offline sync/database problems but bring storage and conflict models before Flowgrid has validated its own command semantics. | Dexie now; sync framework spike later. | MEDIUM |
| Floating-point durable economy values | Route allocation drift and fractional resource bugs are likely. | Integer units, basis points, normalization, and invariant tests. | HIGH |
| Randomness via `Math.random()` | Forge results cannot be replayed or tested deterministically. | Injected seeded RNG wrapper. | HIGH |

## Phase Planning Verification Flags

Before implementation phases, verify official/current docs for:

| Phase | Verify | Reason |
|-------|--------|--------|
| App foundation | React 19, Vite 8, React Router v7, Tailwind 4 setup | Tooling versions change quickly; pin exact templates and Node requirements. |
| Renderer | PixiJS v8 async init, WebGPU/WebGL preference, accessibility extension, React integration status, `pixi-viewport` compatibility | Pixi v8 ecosystem packages may lag the core renderer. |
| Persistence | Dexie current migration guidance, blocked upgrade handling, fake-indexeddb compatibility | Migration mistakes are expensive once real user history exists. |
| Testing | Vitest browser mode vs jsdom/happy-dom, Playwright browser install requirements | Canvas/WebGL and IndexedDB tests need real browser coverage. |
| Sync spike | Replicache, Electric, RxDB, Yjs, Automerge current licensing, hosting, and API state | Sync choices are product-shaping and should wait for concrete multi-device requirements. |

## Source Notes

The GSD research seam was run through `/Users/eggfam/.config/opencode/gsd-core/bin/gsd-tools.cjs`. The Codex-local GSD bundle failed because `/Users/eggfam/.codex/gsd-core/bin/gsd-tools.cjs` could not resolve its expected `package.json`; the OpenCode bundle produced the research plan and confidence classifier results. Verified web/doc findings are classified MEDIUM by the local GSD confidence seam.

## Sources

- React docs, "Creating a React App" and framework guidance: https://react.dev/learn/creating-a-react-app
- Vite docs, v8.0.16 guide and Node/browser baseline notes: https://vite.dev/guide/
- PixiJS v8 introduction and renderer features: https://pixijs.com/8.x/guides/getting-started/intro
- PixiJS v8 Application docs and async initialization: https://pixijs.com/8.x/guides/components/application
- PixiJS v8 migration guide: https://pixijs.com/8.x/guides/migrations/v8
- Dexie design/versioning/migration docs: https://dexie.org/docs/Tutorial/Design
- Zustand README and vanilla/transient subscription notes: https://github.com/pmndrs/zustand
- Vitest v4.1.7 guide: https://vitest.dev/guide/
- Playwright installation/current system requirements: https://playwright.dev/docs/intro
- fast-check introduction, updated 2026-04-28: https://fast-check.dev/docs/introduction/
- Electric Sync docs: https://electric.ax/docs/sync/
- Replicache docs: https://doc.replicache.dev/
- RxDB docs/home: https://rxdb.info/
- PouchDB replication guide: https://pouchdb.com/guides/replication.html
- Yjs docs: https://docs.yjs.dev/
- Automerge overview: https://automerge.org/
- TinyBase synchronization guide: https://tinybase.org/guides/synchronization/
