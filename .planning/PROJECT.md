# Flowgrid

## What This Is

Flowgrid is a modular focus game where real effort powers a programmable hex lattice of attention. Users create Cells for life domains like Music, Fitness, Writing, Home, Rest, Study, and Social; each Cell contains Modules that are both interface elements and gameplay components.

The Core sits at the center of the Flowgrid. Focus sessions, tasks, counts, reflection, and rejuvenation create signal that flows as Current, stores as Charge, converts into Energy, and eventually produces Module Tokens and new build choices.

Flowgrid is not a generic productivity tracker. It is a local-first systems app and incremental game about turning attention, action, and recovery into playable structure.

## Core Value

Tap a Cell, do a real thing, and feel that effort become visible, useful signal in a modular system that makes returning feel powerful and forgiving.

## Requirements

### Validated

- ✓ Simulation logic is deterministic, pure TypeScript, and separate from rendering, persistence, and UI concerns. — Phase 1
- ✓ Durable app state is local-first, IndexedDB-backed, migration-aware, and structured as records rather than one giant opaque blob. — Phase 2
- ✓ A user can create and inspect Cells as life-domain nodes on a hex Flowgrid around a Core. — Phase 3
- ✓ A new Cell works immediately with starter Modules: Generator, Charge Core, Output, and Bloom. — Phase 3
- ✓ The Generator Module is always easy to use and starts an active focus session with minimal friction. — Phase 3
- ✓ Real focus time generates Current, Cell XP, Momentum, milestone progress, and visible flow feedback. — Phase 3
- ✓ Cell milestone completion fires Bloom, creates signal, increases Momentum, and activates the Cell until local day reset. — Phase 3
- ✓ Current can move through a Cell, route toward the Core, and be allocated by the Core between Energy conversion and Core Charge storage. — Phase 4
- ✓ Rejuvenation logs can process Core Charge into Integration progress and grant Module Tokens at thresholds. — Phase 4
- ✓ v1.0 milestone audit gaps closed: B-01 E2E aligned with the redesign, W-01 `blocked_upgrade` surfaces to the UI, and all phases verified. — Phase 06.2

### Active

- [ ] Module Tokens can be used in an early Module Forge flow that reveals choices and creates new build opportunities.
- [ ] Energy can be spent on early upgrades, forge rolls, routes, Cell expansion, or Core Power placeholders.
- [ ] The renderer visualizes simulation-emitted visual events rather than owning economy truth.
- [ ] The first production slice proves that Cells + Modules + Core alternation feels good before advanced systems are built.

### Out of Scope

- Full patch editor - deferred until the starter Cell, Current flow, and Core economy prove the core interaction.
- Advanced module graph logic - deferred to avoid tangling simulation complexity before the vertical slice is playable.
- Module fusion and complex rarity pools - deferred until the Module Forge has a simple useful loop.
- Prestige and Memory - long-tail systems that should build on proven Core, Module, and history foundations.
- Cloud sync and advanced conflict resolution - architecture should be sync-ready, but v1 stays local-first.
- Multi-device active session handling - depends on sync semantics and should not block the local MVP.
- Complex shader effects and animation tooling - visual direction matters, but simulation and basic flow feedback come first.
- Building the whole app inside Canvas/WebGL - normal UI must handle controls, forms, inspectors, lists, settings, and text-heavy details.

## Context

Flowgrid's design promise is:

```txt
do real things
fire modules
move Current
store Charge
produce Energy
earn Modules
build better Cells
```

Its emotional promise is:

```txt
tap to start
partial effort counts
return is powerful
rest matters
attention becomes structure
```

The primary daily loop is:

```txt
1. User opens Flowgrid.
2. User taps a Cell.
3. The Cell's Generator Module starts the active session.
4. Real focus time generates Current.
5. Current fills Charge, fires modules, or routes outward.
6. Cell XP and Momentum increase.
7. Daily milestone progress increases.
8. If milestone completes, the Bloom Module fires.
9. Bloom creates signal and activates the Cell for the day.
10. Current moves through routes toward other Cells or the Core.
11. The Core converts some Current into Energy or stores it as Core Charge.
12. Energy buys upgrades and forge rolls.
13. Core Charge can be integrated through rejuvenation.
14. Integration grants Module Tokens.
15. Module Tokens create new build opportunities.
```

The strategic loop is:

```txt
generate Current
route Current
store Charge
choose how Core handles incoming signal
convert some into Energy
store some as Core Charge
integrate Core Charge through rejuvenation
earn Module Tokens
forge and install Modules
build stronger Cells
```

The long-tail loop is:

```txt
build Cells
scale Energy
earn Modules
expand the Flowgrid
increase Core Power
unlock deeper module systems
eventually prestige
Core resets
Cells, Modules, forge history, Memory, and real history persist
```

Important terminology:

- **Flowgrid**: the full system: hex lattice, Cells, Core, routes, Modules, progression, history, and long-tail systems.
- **Cell**: a life-domain unit on the Flowgrid. Cells replace the older Sphere concept and contain modules and history.
- **Module**: a functional component installed inside a Cell or, later, the Core. Modules are both UI and mechanics.
- **Core**: the global hub for Energy, Core Charge, Core Power, Integration, Module Tokens, and eventual prestige.
- **Current**: moving signal through modules, patches, routes, Cells, and the Core.
- **Charge**: stored signal in Cells, modules, or the Core.
- **Energy**: spendable output currency for upgrades, forge rolls, routes, Cell expansion, Core Power, and long-tail systems.
- **Module Token**: a discrete milestone/reward object for Module Forge agency, not a normal scaling currency.
- **Momentum**: a Cell's consistency pressure, designed to be forgiving rather than punitive.
- **Bloom**: milestone completion event that creates signal and activates a Cell.
- **Activation**: persistent daily Cell state, usually from Bloom until local day reset.
- **Memory**: future prestige inheritance that remains when the Core resets.

The visual model is hexagonal. The Flowgrid home shows compact hex Cells around the Core; selecting a Cell opens an internal module board. Hexagons are primary because they support adjacency, growth, modularity, signal paths, and mathematical clarity.

The first implementation slice should include:

- Flowgrid Home with hex Cells.
- Core node.
- Cells replacing Spheres.
- Generator Module.
- Charge Core Module.
- Output Module.
- Bloom Module.
- Current routing to Core.
- Energy conversion.
- Core Charge storage.
- Simple convert/store allocation.
- Rejuvenation logging.
- Integration progress.
- Module Tokens.
- Module Forge stub.
- IndexedDB persistence.
- Backup/export path.
- Basic validation tests.

Technical north star:

```txt
Flowgrid is a local-first TypeScript systems app with a pure simulation engine, a Canvas/WebGL hex-lattice renderer, normal component UI for controls and inspectors, IndexedDB persistence, and an operation-log path to future multi-device sync.
```

## Constraints

- **Core interaction**: `open app -> tap Cell -> start session` must stay protected - the Generator is sacred and must always be easy to use.
- **Architecture boundary**: Simulation owns truth; renderer shows motion; persistence stores durable records; sync moves operations; UI configures and inspects state.
- **Domain logic**: Simulation must not depend on DOM, Pixi, React, browser APIs, or persistence APIs.
- **Rendering**: Canvas/WebGL or PixiJS should power Flowgrid and module-board visuals, but app shell, panels, forms, inspectors, settings, and text-heavy UI should use a normal component framework.
- **Persistence**: Durable state should use IndexedDB records with migrations, not a giant localStorage blob.
- **Sync readiness**: Stable IDs, append-friendly event records, updatedAt timestamps, schema migrations, operation queue, and entity-specific conflict rules should be designed early even if sync ships later.
- **History**: Completed sessions are append-only real history and should not be casually mutated.
- **Testing**: Pure simulation tests are the highest leverage. Every command should be able to validate invariants after execution.
- **Economy safety**: Avoid same-tick infinite loops, negative resources, duplicate module installs, token duplication, forge count resets, offline production exploits, and route allocation drift.
- **Recovery design**: Rejuvenation must matter mechanically, but rest farming should require Core Charge created by prior activity.
- **Prestige rule**: Module Forge count must not reset, because resetting it would incentivize cheap module farming.
- **Accessibility**: Canvas visuals must be paired with normal UI controls, semantic labels, and accessible panels for important actions and selected state.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Cells instead of Spheres | Cells communicate life-domain containers with modules, history, and local progression. | - Pending |
| Make Modules both UI and gameplay | The app's interface should be symbolic of how the user deploys time and attention. | - Pending |
| Center the daily loop on Generator -> Current -> Bloom -> Core | This protects the tap-to-start focus interaction while giving effort visible systemic consequences. | - Pending |
| Make the Core a dual-output system | Convert/store allocation creates a meaningful strategy tradeoff between immediate Energy and future Integration. | ✓ Phase 4 — convert/store allocation live with 100% enforcement; Energy→Activation boost sink shipped |
| Make rejuvenation part of the economy | Recovery becomes mechanically meaningful through Core Charge processing and Module Token rewards. | ✓ Phase 4 — Charge→Integration→Module Tokens via derived threshold sequence; rest requires prior Charge |
| Keep Cell XP local | Local XP should grow Cell capacity and identity without blocking global module-family creativity. | - Pending |
| Unlock global module families through Core and forge systems | Creative module freedom should not depend on the "right" Cell earning XP first. | - Pending |
| Build the first milestone as a vertical slice | The project needs to prove Cells + Modules + Core alternation feels good before advanced systems expand. | - Pending |
| Separate simulation, rendering, persistence, sync, and UI | This keeps game logic testable, visuals expressive, persistence durable, and future sync possible. | - Pending |
| Use local-first persistence with sync-ready operations | Long-lived user history and future multi-device sync require durable records and operation semantics from the start. | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-30 after Phase 06.2 — v1.0 milestone re-verifies PASS; full milestone-boundary review pending `/gsd-complete-milestone v1.0`.*
