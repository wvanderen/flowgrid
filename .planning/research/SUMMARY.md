# Project Research Summary

**Project:** Flowgrid
**Domain:** Local-first modular focus game / incremental systems app
**Researched:** 2026-06-23
**Confidence:** MEDIUM-HIGH

## Key Findings

Flowgrid should be built as a local-first TypeScript systems app where real effort becomes visible signal in a compact hex lattice. The core product is not a productivity suite, task manager, cloud habit tracker, or full automation sandbox. It is a focus game that must prove one emotional loop first: tap a Cell, complete real effort, see Current move, let the Core split that signal between immediate Energy and stored Core Charge, use rejuvenation to integrate stored Charge, earn Module Tokens, and make a small build choice.

The research is unusually aligned across stack, features, architecture, and pitfalls. The first roadmap must protect the Generator interaction and deterministic simulation before investing in advanced module graph logic. Experts build this type of product with a pure domain/simulation core, durable local records, visual rendering as an adapter, normal accessible UI for controls, and explicit operation records for future sync. The renderer can make Flowgrid feel alive, but it must never become the source of economy truth.

The largest risks are product and architecture risks, not library risks. Flowgrid can fail by turning focus into punishment, burying the start action under systems, storing meaningful user history as fragile browser cache, or letting Pixi animations mutate resources. The mitigation is to make partial effort, append-only history, schema migrations, command invariants, and semantic UI controls foundational rather than polish.

## Stack Recommendation

Use a browser-first TypeScript stack with a strict split between app UI, renderer, simulation, persistence, and future sync.

**Recommended baseline:**
- **TypeScript 5.x:** language for domain contracts, deterministic command inputs/outputs, migrations, and tests.
- **React 19 + Vite 8:** normal app shell, panels, routing, forms, inspectors, forge choices, history, and settings.
- **PixiJS 8:** high-performance 2D renderer for Flowgrid hex visuals, routes, Current packets, Bloom, Core ripples, and module-board motion.
- **Pure TypeScript simulation:** deterministic command handlers for sessions, Bloom, Core allocation, rejuvenation, forge, routes, and module effects.
- **Dexie + IndexedDB:** durable local-first entity records, migrations, transactions, backup/export, and future sync readiness.
- **Zustand vanilla/app store:** UI coordination only, such as selected Cell, panels, visual event queues, camera state, and command status.
- **Zod:** runtime validation at boundaries such as import/restore, migration outputs, sync operations, and dev-only invariants.
- **Vitest + fast-check + fake-indexeddb:** simulation, invariant, migration, and persistence tests.
- **Playwright:** end-to-end, accessibility, IndexedDB, canvas/WebGL smoke, and screenshot tests.
- **Tailwind CSS + Radix UI + lucide-react:** restrained component styling, accessible primitives, and standard tool icons.

**Important boundaries:**
- `domain` imports no app, browser, Pixi, React, Dexie, Zustand, DOM, or persistence code.
- `simulation` is pure and accepts injected `now`, elapsed time, local date, and RNG.
- `render` consumes selectors and simulation-emitted `VisualEvent`s only.
- `ui` dispatches commands and reads selectors; it does not calculate economy rules.
- `persistence` stores records, migrations, backups, and operation logs; it does not run commands.
- `syncQueue` / `operations` should exist in v1 even though cloud sync is explicitly deferred.

Do not use Next.js/Remix, a full-stack framework, persisted Zustand blobs, a single `AppState` IndexedDB object, localStorage for production state, or CRDT/sync frameworks in v1. Flowgrid needs local command semantics and entity-specific conflict rules before choosing Replicache, Electric, RxDB, PouchDB, Yjs, or Automerge.

## Table Stakes

Flowgrid v1 needs enough product surface to feel understandable, trustworthy, and emotionally complete. The table-stakes set should be narrow but end-to-end:

- First-run Cell setup with usable starter defaults, not a module design wall.
- Flowgrid Home with Core-centered compact hex Cells.
- One-tap Generator start per Cell from the first screen.
- Reliable session controls with proportional partial-session rewards.
- Session completion summary showing duration, Current, XP, milestone progress, Energy/Core outcome, and next useful action.
- Starter Cell module board with Generator, Charge Core, Output, and Bloom already installed.
- Current flow visualization emitted from simulation events.
- Daily milestone, Bloom, and Activation until local day reset.
- Forgiving Momentum that supports return instead of punishing lapses.
- Core convert/store allocation with invariant `convert + store = 100`.
- Energy balance and 2-4 basic upgrade spends.
- Core Charge storage that gives rest something meaningful to process.
- Rejuvenation logging or recovery timer that converts prior Core Charge into Integration.
- Integration progress and reachable Module Token thresholds.
- Module Token inventory and narrow choose-one-of-three Module Forge.
- Module installation into curated starter slots.
- Session/history view and compact analytics summaries.
- IndexedDB local persistence, schema versioning, append-only completed sessions, and export.
- Offline-capable core use with no account requirement.
- Accessible controls outside canvas for every critical action.
- Minimal settings for default session length, daily target, local day boundary, and export access.

The first vertical slice should be: create a Cell, start/finish a Generator session, award partial Current/XP/Momentum, show Current moving through starter modules to the Core, complete Bloom/Activation, allocate Core output between Energy and Core Charge, log rejuvenation to gain Integration, grant a Module Token, and run a simple Forge choice. This is the slice that proves Cells + Modules + Core alternation.

## Differentiators

The differentiators should be included only where they directly support the first loop:

- **Cells as life-domain modules:** replaces generic task lists with domains of attention and identity.
- **Modules as UI and mechanics:** makes the interface feel like a playable system, but v1 should use a curated starter board.
- **Current as visible effort signal:** turns focus time into movement rather than just minutes logged.
- **Bloom as milestone event:** gives daily completion a positive mechanical consequence without punitive streaks.
- **Core dual-output strategy:** creates a simple now-vs-later choice through Energy conversion and Core Charge storage.
- **Activity/rest alternation economy:** makes rest matter only after prior effort, which protects against rest farming.
- **Module Tokens from Integration:** turns recovery into creative agency.
- **Curated Module Forge:** creates build choice without large rarity pools, fusion, or gambling-like odds.
- **Return dashboard:** opening Flowgrid after a gap should surface stored Charge, unspent Energy, token progress, and Cells near Bloom without shame.
- **Local-first ownership:** no account or network dependency for core use; export/backup is part of trust.

Explicitly defer v2+ scope: full patch editor, advanced module graph logic, prestige/Memory, module fusion, large rarity pools, cloud sync/accounts, multi-device active sessions, social rooms, leaderboards, app/site blocking, notifications/widgets, calendar integration, AI planning, complex task management, advanced analytics, and offline idle production as a major reward path.

## Architecture Implications

The system should follow one rule: simulation owns truth, renderer shows motion, persistence stores durable records, sync moves operations, and UI configures and inspects state.

**Major components:**
- **`domain`:** IDs, branded types, record shapes, constants, local date/time utilities, invariants, and validation.
- **`content`:** static module definitions, starter Cell templates, formulas, content version, and early reward pools.
- **`simulation`:** deterministic commands, economy rules, session completion, Bloom, Core allocation, rejuvenation, forge outcomes, module triggers, route processing, and visual/economy event output.
- **`app`:** command dispatch, transaction orchestration, hydration, selectors, UI-only state, and visual event publication.
- **`persistence`:** Dexie schema, migrations, repositories, import/export, backup/restore, storage estimates, and quota handling.
- **`sync`:** durable operation queue, idempotency, future transport shape, conflict policies, and ack/retry lifecycle.
- **`render`:** PixiJS application, scene graph, camera, hex layout, particles, event playback, hit testing, and module-board visuals.
- **`ui`:** React screens, panels, forms, accessible controls, Generator, Core allocation, rejuvenation, Forge, history, settings, and semantic mirrors of canvas state.
- **`tests`:** simulation invariants, migrations, repository behavior, command idempotency, renderer smoke tests, accessibility checks, and UAT flows.

Every durable action should enter as a command and return `nextState`, `economyEvents`, `visualEvents`, `operations`, and `validationIssues`. The dispatcher should assemble the required snapshot, inject time/RNG, run pure simulation, validate invariants, then atomically write changed records and operation rows in IndexedDB.

Persist normalized entity records, not a giant blob. Initial stores should include `metadata`, `cells`, `moduleDefinitions` or content version metadata, `moduleInstances`, `patches`, `routes`, `sessions`, `core`, `forgeHistory`, `events` or bounded visual logs, `operations` / `syncQueue`, `settings`, and `migrationIssues`. Completed sessions and forge history should be append-only unless a future explicit adjustment record exists.

The renderer should be a PixiJS adapter around selectors and `VisualEvent`s. Current packets, Bloom bursts, Core conversion, token grants, and route motion come from simulation-emitted events. Dropping, replaying, reducing, or skipping animations must not change Energy, Charge, XP, Tokens, sessions, Momentum, installed modules, or forge history.

## Pitfalls and Guardrails

1. **Turning focus into punishment.** Partial effort must count from Phase 1. Momentum should be recovery-friendly, missed days must not destroy earned history, and lapse-return UAT should verify that opening Flowgrid after a week feels useful rather than judging.

2. **Burying the sacred Generator.** A new Cell must work immediately with starter modules, and `open app -> tap Cell -> start session` should remain the fastest path. Patch editing, allocation choices, and Forge decisions come after a successful first session.

3. **Letting animation own economy truth.** Pixi can animate signal but cannot mutate durable resources. Add dependency boundaries and tests proving simulation runs without DOM, React, Pixi, Canvas, IndexedDB, timers, or browser APIs.

4. **Creating runaway economy loops.** Define deterministic tick/order rules early. Every trigger needs input, output, cap, and firing frequency. Validate no negative resources, no duplicate installs, allocation sums to 100, token counts never go negative, forge count never decreases, and same operation IDs are idempotent.

5. **Treating local-first data as cache.** Use IndexedDB entity stores, stable IDs, schema versions, migrations, append-only sessions, operation logs, backup/export, restore validation, storage persistence requests, and quota handling from the start.

6. **Making Canvas the whole app.** Use Canvas/WebGL for the lattice and motion, but React/Radix controls for Generator, inspectors, forms, Forge choices, history, settings, and accessibility. Every critical action needs a keyboard and semantic UI path.

7. **Confusing module definitions and instances.** Static `ModuleDefinition`s are versioned content; owned `ModuleInstance`s are user records. Forge creates instances or offers, and installation moves an instance into a Cell slot.

8. **Making random Forge outcomes unreproducible.** Inject seeded RNG, split roll from choose, persist pending offers, store payment, offered choices, chosen reward, timestamp, seed or trace, and monotonic forge count.

9. **Daily reset and timezone bugs.** Store `LocalDateString` and explicit activation windows. Centralize time logic and test DST, timezone changes, local day boundary settings, and manual clock edits.

10. **Sync readiness becoming premature sync.** Emit operation-shaped command outputs and stable IDs in v1, but do not expose accounts, remote sync, or multi-device active sessions until local semantics and conflict policies are proven.

## Implications for Roadmap

Suggested phase structure:

### Phase 1: Deterministic Foundation Slice

**Rationale:** Simulation boundaries, record types, command contracts, and invariants are the cheapest to get right before UI and persistence accrete around them.

**Delivers:** TypeScript project structure; `domain`, `content`, `simulation`, `app`, `persistence`, `render`, and `ui` boundaries; branded IDs; starter module definitions; command result shape; pure commands for create Cell, set Core allocation, start/finish focus session in memory; validation helpers and test factories.

**Features covered:** Cells, starter modules, Generator command path, partial rewards, Current/XP/Momentum formulas, first Bloom/Activation logic, Core allocation model.

**Pitfalls avoided:** Generator burial, animation-owned truth, punishment loops, runaway resources, module definition/instance confusion.

**Research flag:** Standard patterns. Skip broad research, but require phase planning to lock exact command/result contracts and invariants.

### Phase 2: Local Persistence, Migration, and Export Spine

**Rationale:** Flowgrid history is personally meaningful. Durable records, migrations, and operation logs should exist before the playable UI generates real user data.

**Delivers:** Dexie schema with normalized stores; repositories; hydration/materialization into snapshots; atomic command commits; operation queue rows; first migration fixture; JSON backup/export; session CSV export; initial import/restore if scope allows; storage persistence and quota/error handling.

**Features covered:** local persistence, append-only sessions, history trust, backup/export, sync-ready writes, reload preservation.

**Pitfalls avoided:** local-first data as cache, future sync rewrite, migration fragility, history mutation.

**Research flag:** Needs focused research during phase planning for current Dexie migration guidance, browser storage persistence behavior, fake-indexeddb compatibility, and export/restore validation.

### Phase 3: First Playable Generator Flowgrid

**Rationale:** The product must prove the protected daily interaction before adding advanced systems. This is the first user-visible vertical slice.

**Delivers:** React app shell; Flowgrid Home; compact Core-centered hex Cells; Cell creation/edit/archive; Cell Inspector; Generator timer controls; session completion summary; recent history; basic PixiJS renderer for Cells/Core/routes; Current/Bloom/Core visual events; semantic controls outside canvas.

**Features covered:** tap-to-start, partial sessions, Current visualization, daily milestone, Bloom, Activation, session summary, accessible controls, compact return cues.

**Pitfalls avoided:** Generator burial, Canvas-only app, visual overload, punishment loop, frame-rate-dependent economy.

**Research flag:** Needs renderer spike for PixiJS 8 async app setup, React lifecycle cleanup, resize, hit testing, mobile performance, reduced motion, and accessibility overlays.

### Phase 4: Core Alternation and Rejuvenation Economy

**Rationale:** This is Flowgrid's main differentiation from ordinary focus timers: effort becomes signal, the Core chooses now/later value, and rest converts stored effort into creative agency.

**Delivers:** route output to Core; convert/store allocation control; Energy and Core Charge balances; Energy upgrades; rejuvenation log/timer; Integration progress; Module Token thresholds; return dashboard showing stored Charge, Energy, token progress, and next useful action.

**Features covered:** Core dual-output strategy, Energy spending, Core Charge storage, rejuvenation, Integration, Module Tokens, return is powerful, rest matters.

**Pitfalls avoided:** rest farming, one-note currency semantics, dominant allocation strategy, daily reset bugs, runaway loops.

**Research flag:** Needs deeper economy/playtest research during planning. Exact numbers, token thresholds, upgrade costs, and allocation tuning cannot be solved by desk research alone.

### Phase 5: Module Forge and Starter Customization

**Rationale:** Build choice should arrive only after sessions, Core, and Integration have made tokens meaningful. Keep customization curated to avoid graph complexity.

**Delivers:** spend token or Energy to run Forge; persisted pending offers; seeded choose-one-of-three rewards; forge history; inventory; module installation into curated slots; 6-10 early rewards/upgrades; duplicate prevention and install invariants.

**Features covered:** Module Tokens, curated Forge, build choices tied to real history, starter board expansion, module installation, early upgrade pool.

**Pitfalls avoided:** unreproducible randomness, token duplication, forge count reset, module definition/instance confusion, advanced graph scope creep.

**Research flag:** Needs focused design research for reward cadence, RNG package choice, content pool sizing, duplicate handling policy, and deterministic replay tests.

### Phase 6: V1 Hardening and Trust

**Rationale:** Before release, Flowgrid must be credible as a daily-use local-first app, not just a playable prototype.

**Delivers:** migration test matrix; import/restore polish if deferred; operation log debug/export; idempotency tests; accessibility pass; reduced-motion/high-contrast checks; Playwright UAT flows; canvas smoke screenshots; quota and recovery UX; lapsed-user scenario.

**Features covered:** ownership, recovery, accessibility, durable trust, local-first release readiness.

**Pitfalls avoided:** browser storage loss surprises, inaccessible canvas controls, visual event flood, sync semantics being untestable later.

**Research flag:** Mostly standard patterns, but use phase research for browser storage edge cases and accessibility/canvas verification if target devices are broad.

### Phase 7: Advanced Systems and Sync Spikes

**Rationale:** Patch editing, advanced module logic, prestige/Memory, and remote sync are product-shaping systems that should wait until the starter loop is validated.

**Delivers:** only after v1 validation: patch editor, generalized module effect registry, prestige/Memory contract, offline/passive production rules, remote sync service spike, multi-device conflict tests, possible native notifications/widgets.

**Features covered:** deferred advanced systems, long-tail retention, future sync.

**Pitfalls avoided:** premature sync, prestige farming, patch editor overwhelming core loop, offline production becoming best play.

**Research flag:** Needs research. Remote sync candidates, conflict semantics, prestige economy, and platform features require dedicated investigation when requirements are concrete.

**Phase ordering rationale:**
- Build pure simulation before renderer so product truth is testable without browser/GPU state.
- Build persistence before heavy UI so real sessions, operations, and migrations are not retrofitted later.
- Make Generator playable before Forge/customization so users experience effort becoming structure before optimizing builds.
- Add Core alternation before Forge so Module Tokens are earned through the intended activity/rest loop.
- Defer graph editing, prestige, sync, and platform features until the first vertical slice proves emotional value.

## Sources

### Primary project sources

- `.planning/PROJECT.md` — Flowgrid value, requirements, constraints, terminology, and explicit out-of-scope boundaries.
- `.planning/research/STACK.md` — recommended TypeScript/React/Vite/PixiJS/Dexie stack and version verification flags.
- `.planning/research/FEATURES.md` — table stakes, differentiators, anti-features, MVP slice, and phase-friendly build order.
- `.planning/research/ARCHITECTURE.md` — layer boundaries, data flow, source layout, command contract, persistence shape, and renderer architecture.
- `.planning/research/PITFALLS.md` — critical/moderate/minor pitfalls and phase-specific warnings.
- `docs/gameplay-spine-draft.md` and `docs/technical-vision-draft.md` as cited by the research files — gameplay and technical north-star context.

### Official and high-confidence technical sources

- React docs: https://react.dev/learn/creating-a-react-app
- Vite guide: https://vite.dev/guide/
- PixiJS v8 guides: https://pixijs.com/8.x/guides/getting-started/intro
- PixiJS Application docs: https://pixijs.com/8.x/guides/components/application
- PixiJS accessibility/performance/render loop docs: https://pixijs.com/8.x/guides/
- Dexie docs: https://dexie.org/docs/Tutorial/Design
- Dexie versioning and upgrades: https://dexie.org/docs/Version/Version.stores/ and https://dexie.org/docs/Version/Version.upgrade/
- MDN IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN storage quotas and eviction criteria: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- Zustand README: https://github.com/pmndrs/zustand
- Vitest guide: https://vitest.dev/guide/
- Playwright docs: https://playwright.dev/docs/intro
- fast-check docs: https://fast-check.dev/docs/introduction/
- WHATWG canvas element: https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element
- WAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/

### Product, local-first, and domain sources

- Ink & Switch local-first essay: https://www.inkandswitch.com/essay/local-first/
- Local-first software paper: https://martin.kleppmann.com/papers/local-first.pdf
- Forest official site: https://forestapp.cc/
- Streaks official site: https://streaksapp.com/
- Loop Habit Tracker README: https://github.com/iSoron/uhabits
- Incremental game overview: https://en.wikipedia.org/wiki/Incremental_game
- Habitica feature context: https://habitica.com/static/features
- Self-determination theory behavior-change review: https://arxiv.org/abs/2402.00121
- Live & Local Schema Change: https://arxiv.org/abs/2309.11406
- Fix Your Timestep: https://gafferongames.com/post/fix_your_timestep/
- Game Programming Patterns, Game Loop: https://gameprogrammingpatterns.com/game-loop.html
- HTML5 Canvas issue taxonomy: https://arxiv.org/abs/2201.07351

### Confidence assessment and gaps

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Official docs support the choices, but exact latest versions, PixiJS v8 ecosystem compatibility, and optional helpers such as `pixi-viewport` need phase verification. |
| Features | HIGH | Strongly grounded in Flowgrid project docs and cross-checked against focus timers, habit trackers, incremental games, and local-first principles. |
| Architecture | HIGH | Layer boundaries, command contracts, entity records, and renderer-as-adapter patterns are clear and repeatedly supported across research. |
| Pitfalls | MEDIUM-HIGH | Critical risks are well grounded; economy tuning and future sync risks need validation with real usage and phase-specific spikes. |

**Overall confidence:** MEDIUM-HIGH.

**Gaps to address during planning:**
- Exact economy numbers, upgrade costs, Module Token thresholds, and Forge cadence require playtesting.
- PixiJS v8 integration details should be verified on target desktop/mobile browsers before committing to complex renderer work.
- Import/restore scope should be decided early: export is table stakes; restore is strongly preferred for trust.
- RNG package, UUID strategy, and operation sequence details should be selected during implementation planning.
- Remote sync, prestige/Memory, patch editing, notifications/widgets, and app blocking need separate research when they become active roadmap scope.

---
*Research completed: 2026-06-23*
*Ready for roadmap: yes*
