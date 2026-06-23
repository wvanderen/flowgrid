# Domain Pitfalls

**Domain:** Local-first modular focus game / incremental systems app  
**Project:** Flowgrid  
**Researched:** 2026-06-23  
**Overall confidence:** MEDIUM-HIGH  

Note: The GSD `research-plan` and `classify-confidence` seams were attempted, but the local `gsd-tools.cjs` shim failed before execution because `/Users/eggfam/.codex/gsd-core` is missing `package.json`. Confidence below is assigned manually from source quality: project docs, current platform specs/docs, Ink & Switch local-first research, and recent HCI/software-engineering papers.

## Phase Map Used

No roadmap exists yet, so this file uses provisional phase names for planning:

| Phase | Purpose |
|-------|---------|
| Phase 1: Foundation Slice | Pure simulation, records, starter Cells, Generator, session completion, validation tests |
| Phase 2: Playable Flowgrid | Hex home, Cell board, Core route, normal UI panels, accessible controls |
| Phase 3: Core Economy | Energy, Core Charge, convert/store allocation, rejuvenation, Integration, tokens |
| Phase 4: Module Forge | Forge rolls, inventory, module install choices, reward tuning |
| Phase 5: Durability and Recovery | Migrations, backup/export, storage persistence, offline resume, sync-ready operation queue |
| Phase 6: Advanced Systems | Patch editor, advanced modules, prestige, Memory, sync implementation |

## Critical Pitfalls

Mistakes that can damage the product promise or force architectural rewrites.

### Pitfall 1: Turning Focus Into Punishment

**Risk type:** Product, UX, accessibility  
**Phase to address:** Phase 1: Foundation Slice  
**Confidence:** HIGH  

**What goes wrong:** Flowgrid becomes another guilt loop: streak losses, decay pressure, scolding copy, or optimization pressure make users avoid the app after a lapse.

**Why it happens:** Gamified productivity apps often optimize engagement with the app rather than durable motivation for the underlying behavior. Self-determination theory research flags overreliance on external rewards, reminders, and enforcement as a source of reactance, abandonment, or behavior performed for the wrong reason.

**Warning signs:**
- Missing a day visibly damages progress or causes irreversible loss.
- Momentum reads like a streak counter with penalties instead of a forgiving return mechanic.
- Users feel they must complete a full session for the app to "count" it.
- Rejuvenation looks secondary or like a consolation prize.
- Copy uses shame, urgency, red alerts, or "you failed" language.

**Prevention:**
- Make "partial effort counts" a hard product invariant in Phase 1.
- Model Momentum as recovery-friendly pressure, not a strict streak.
- Add return-positive mechanics early: catch-up Bloom, Return Spark, Momentum Shield, or similar.
- Never make missed days destroy earned Cells, Modules, Cell XP, sessions, forge history, or tokens.
- Treat user benefit as the metric: sessions completed, return after lapse, rest/activity alternation, and useful history, not raw app opens.
- UAT should include a lapsed-user scenario: "I did not use Flowgrid for a week; opening it should feel welcoming and useful."

**Detection:**
- Users avoid opening Flowgrid after a gap.
- People describe the system as "judging" or "nagging."
- Short sessions are disproportionately abandoned.
- Session completion copy focuses on performance rather than effort becoming structure.

### Pitfall 2: Burying the Sacred Generator Under Systems

**Risk type:** Product, UX  
**Phase to address:** Phase 1: Foundation Slice  
**Confidence:** HIGH  

**What goes wrong:** The first user action becomes inspect, configure, route, allocate, choose, dismiss, or understand, instead of tap Cell -> start session.

**Why it happens:** Flowgrid has rich systems: Modules, Current, Charge, Core, Forge, routes, Activation, and future patches. Building all concepts into the first screen can drown the primary daily loop.

**Warning signs:**
- New Cell creation requires module choices before the Cell works.
- The Generator is visually equal to or less prominent than economy widgets.
- Starting a session requires visiting the Cell board, Core view, or settings.
- Users ask "what should I do first?" after opening the app.
- Tutorial text becomes necessary for the first action.

**Prevention:**
- A new Cell must always ship with Generator, Charge Core, Output, and Bloom installed.
- Put a start affordance on Flowgrid Home and Cell Board; do not require entering advanced module views.
- Make advanced route, patch, allocation, and forge decisions optional after a successful first session.
- Add a regression/UAT check: from cold start, create Cell and start a focus session in under 3 intentional actions.
- Defer patch editor and advanced module graph logic until after the first Cell -> Core loop is proven.

**Detection:**
- Session starts are low relative to Cell creation.
- Users spend time in configuration but do not finish sessions.
- QA needs explanatory copy to make the first screen usable.

### Pitfall 3: Letting Animation Own Economy Truth

**Risk type:** Architecture, data, performance  
**Phase to address:** Phase 1: Foundation Slice; reinforce in Phase 2: Playable Flowgrid  
**Confidence:** HIGH  

**What goes wrong:** Current packets, Bloom bursts, or Core ripples become the source of truth for resource changes. Bugs appear when animations are skipped, interrupted, replayed, backgrounded, or run at different frame rates.

**Why it happens:** Canvas/WebGL apps invite visual-first implementation. Flowgrid's visuals are meaningful, so it is easy to let the renderer calculate what "arrived" rather than only displaying simulation events.

**Warning signs:**
- Energy increments when an animation finishes.
- Visual packet collision or arrival mutates durable state.
- Background tabs, reduced motion, or low FPS change economy results.
- Replay of visual events duplicates resources.
- Pixi/Canvas code imports simulation mutators.

**Prevention:**
- Simulation emits durable state changes plus transient `VisualEvent[]`.
- Renderer consumes visual events idempotently and never updates Energy, Charge, Tokens, XP, sessions, forge history, or installed modules.
- Tests run simulation without DOM, React, Pixi, Canvas, IndexedDB, or timers.
- Add dependency linting or import-boundary tests for `simulation`, `render`, `persistence`, and `ui`.
- Reduced-motion mode must preserve all economy results while changing only presentation.

**Detection:**
- A failed animation causes missing rewards.
- Same command produces different state when run headless versus in browser.
- Economy bugs are reported as "visual timing" problems.

### Pitfall 4: Creating Runaway Economy Loops

**Risk type:** Economy, architecture  
**Phase to address:** Phase 3: Core Economy; guardrails begin in Phase 1  
**Confidence:** HIGH  

**What goes wrong:** Modules, routes, Bloom, Activation, or rejuvenation create unbounded same-tick loops, negative resources, token duplication, infinite Charge conversion, rest farming, or a dominant strategy that trivializes all other choices.

**Why it happens:** Incremental systems encourage multiplicative feedback. Flowgrid also has multiple resource forms that can trigger each other: Current, Charge, Energy, Core Charge, Integration, Module Tokens, Momentum, Bloom, Activation.

**Warning signs:**
- A module trigger can fire itself without consuming state or cooldown.
- Activation boosts Bloom in a way that immediately retriggers Bloom.
- Rejuvenation grants tokens without requiring prior Core Charge from activity.
- Convert/store allocation can drift away from 100%.
- One allocation strategy is always optimal.
- Large numbers appear before the first loop is emotionally proven.

**Prevention:**
- Define deterministic tick order in Phase 1 and keep it boring.
- Every trigger must declare input resource, output resource, cap, and whether it can fire once per tick/session/day.
- Validate after every command: no negative resources, allocation sums to 100, tokens never negative, forge count never decreases, no duplicate installs.
- Bound offline/passive production and process it in aggregate.
- For Phase 3, tune economy around choice texture, not maximization: Energy-heavy, Integration-heavy, and balanced paths must all remain viable.
- Rejuvenation must process stored Core Charge; it must not mint Module Tokens from rest alone.

**Detection:**
- Same-tick command loops require arbitrary emergency stops.
- Users discover a no-effort token path.
- A regression requires hand-editing persisted state to recover.
- Economy tests need approximate expectations because order is unclear.

### Pitfall 5: Treating Local-First Data as a Big Browser Cache

**Risk type:** Data, architecture  
**Phase to address:** Phase 1: Foundation Slice; Phase 5: Durability and Recovery  
**Confidence:** HIGH  

**What goes wrong:** Flowgrid stores all state as one opaque blob, relies on best-effort browser storage without backup/export, cannot migrate old data safely, or makes future sync impossible without replacing the data model.

**Why it happens:** IndexedDB makes early persistence easy enough that record boundaries, migrations, operation logs, and recovery are postponed. Local-first apps pay for that later because user history is long-lived and personally meaningful.

**Warning signs:**
- `localStorage` holds production state.
- IndexedDB has one `appState` object with no entity stores.
- Sessions are mutated in place instead of appended or adjusted.
- No migration test loads previous schema fixtures.
- Backup/export uses a separate shape from app state.
- Stable IDs are added only after entities already exist.

**Prevention:**
- Use entity records from Phase 1: cells, module instances, sessions, routes, patches, core, forge history, events/sync queue, settings.
- Make completed sessions append-only; corrections later become explicit adjustment records.
- Add schema versioning and migration tests before the first release with persistent user data.
- Implement export/backup through the same schema and migration path used by normal load.
- Request persistent storage where appropriate and expose backup/export because browsers can evict best-effort origin data.
- Add stable IDs, `createdAt`, `updatedAt`, and operation-shaped command outputs before implementing cloud sync.

**Detection:**
- A migration requires custom one-off parsing of arbitrary blobs.
- A user cannot inspect or export their data in a durable format.
- Sync planning discovers counters such as Energy, Tokens, Integration, or forge count cannot be merged safely.

### Pitfall 6: Making Canvas the Whole App

**Risk type:** Accessibility, UX, performance  
**Phase to address:** Phase 2: Playable Flowgrid  
**Confidence:** HIGH  

**What goes wrong:** Flowgrid becomes beautiful but inaccessible, hard to test, hard to use on mobile, and hard to inspect with assistive technology because controls, text, forms, and state are all pixels.

**Why it happens:** The hex lattice and Current animation naturally fit Canvas/WebGL, but app controls, panels, forms, inventory, settings, history, and text-heavy details need semantic UI.

**Warning signs:**
- Buttons, labels, timers, forge choices, and settings are drawn only into Canvas.
- Keyboard users cannot start a session, select a Cell, or inspect the Core.
- Screen reader output has no selected Cell, current session, Energy, Charge, or token state.
- Playwright tests can only assert screenshots, not DOM state.
- Hit testing and UI state duplicate business logic.

**Prevention:**
- Use Canvas/WebGL for the Flowgrid, routes, particles, and module-board motion.
- Use normal component UI for controls, inspectors, forms, forge choices, history, settings, and summaries.
- Mirror important selected state in semantic panels with accessible names and keyboard actions.
- Provide fallback content or one-to-one focusable mappings for interactive canvas regions.
- Add reduced-motion and high-contrast checks during Phase 2, not as polish.
- Test both DOM accessibility state and visual rendering.

**Detection:**
- Important actions have no keyboard path.
- Reduced-motion mode removes information rather than only changing animation.
- Bug reports say "I cannot tell what is selected."
- Canvas screenshot tests are the only UI tests.

## Moderate Pitfalls

### Pitfall 7: Confusing Module Definitions and Module Instances

**Risk type:** Architecture, data, economy  
**Phase to address:** Phase 1: Foundation Slice; Phase 4: Module Forge  
**Confidence:** HIGH  

**What goes wrong:** Reward, install, upgrade, duplicate, and fusion systems become tangled because the app cannot distinguish a static module type from an owned copy.

**Warning signs:**
- Installing a module mutates the module definition.
- Two Cells cannot own the same module type cleanly.
- Forge rewards are stored as definitions instead of inventory instances.
- Duplicate handling is undefined.

**Prevention:**
- Keep `ModuleDefinition` static and versioned.
- Store owned `ModuleInstance` records with owner/install state and runtime state.
- Validate that one module instance cannot be installed in two slots.
- Forge creates instance candidates or inventory items; install moves an instance into a Cell.

### Pitfall 8: Reset Incentives That Farm Early Rewards

**Risk type:** Economy, product  
**Phase to address:** Phase 4: Module Forge; Phase 6: Advanced Systems  
**Confidence:** HIGH  

**What goes wrong:** Prestige or reset mechanics incentivize users to repeatedly restart cheap early loops for Module Tokens, low-cost forge rolls, or front-loaded rewards.

**Warning signs:**
- Forge count resets with prestige.
- Token thresholds reset without preserving meaningful cost history.
- Early Cell creation grants repeatable high-value rewards.
- Optimal play is to abandon a developed Flowgrid.

**Prevention:**
- Keep the project rule: Module Forge count never resets.
- Preserve forge history, Cell history, modules, and meaningful earned identity across prestige.
- Delay prestige until forge economics, Core Charge, Integration, and Memory can be tested together.
- Add tests for reset/preserve lists before Phase 6 implementation.

### Pitfall 9: Offline Production Becomes the Best Way to Play

**Risk type:** Economy, product, performance  
**Phase to address:** Phase 3: Core Economy; Phase 5: Durability and Recovery  
**Confidence:** MEDIUM-HIGH  

**What goes wrong:** Users get more from closing the app than from intentional sessions, or resume processing tries to simulate every missed second and freezes.

**Warning signs:**
- Offline gains exceed active focus contribution.
- Resume takes visible seconds for long absences.
- Offline simulation emits thousands of visual packets.
- Users manipulate device time for rewards.

**Prevention:**
- Cap offline/passive elapsed time.
- Aggregate offline economy changes and emit summary visual events.
- Store `lastPassiveTickAt` and use monotonic sanity checks where available.
- Make offline progress supportive but not dominant.
- Explain offline summaries plainly in normal UI.

### Pitfall 10: Daily Reset and Time Zone Bugs Break Trust

**Risk type:** Data, UX, economy  
**Phase to address:** Phase 1: Foundation Slice; Phase 3: Core Economy  
**Confidence:** MEDIUM-HIGH  

**What goes wrong:** Bloom, Activation, Momentum, and daily targets reset incorrectly around midnight, travel, daylight saving changes, or device clock edits.

**Warning signs:**
- Activation stores only a UTC timestamp but business rules depend on local day.
- Daily progress recalculates from mutable "today" queries instead of stored local dates.
- Travel changes yesterday's milestone state.
- Tests do not cover local day boundaries.

**Prevention:**
- Store `LocalDateString` for daily milestone completion and explicit `activatedUntil` for display/expiration.
- Centralize time handling in pure domain utilities.
- Test DST transitions, timezone changes, and manual clock changes.
- Avoid using renderer or UI locale formatting as business logic.

### Pitfall 11: Random Forge Outcomes Are Not Reproducible

**Risk type:** Economy, architecture, data  
**Phase to address:** Phase 4: Module Forge  
**Confidence:** HIGH  

**What goes wrong:** A forge roll cannot be replayed, tested, audited, or synced because it uses ambient `Math.random()` and stores only the chosen result.

**Warning signs:**
- Tests mock global random state.
- A refresh changes available forge choices.
- Forge history cannot explain why a module appeared.
- Token spending and reward choice are one inseparable mutation.

**Prevention:**
- Inject a seeded RNG into simulation for forge candidate generation.
- Store forge roll records: payment, seed or random trace, offered choices, selected reward, timestamp, and forge count.
- Split `runForge` from `chooseForgeReward`.
- Validate token/energy spend before roll and instance creation after choice.

### Pitfall 12: Module Graph Complexity Arrives Before the Starter Loop

**Risk type:** Product, architecture, UX  
**Phase to address:** Phase 1: Foundation Slice; defer to Phase 6: Advanced Systems  
**Confidence:** HIGH  

**What goes wrong:** The app spends its first roadmap cycles on patch editors, port rules, graph validation, rare modules, and module fusion before proving that Cells + Current + Core alternation feels good.

**Warning signs:**
- Patch UI is required to make a Cell useful.
- Module families are implemented before starter modules are delightful.
- Validation complexity blocks basic focus sessions.
- The first demo cannot show a complete session-to-token path.

**Prevention:**
- In Phase 1, hard-code the starter Cell topology.
- Make internal patch capacity a future data shape but not a required interaction.
- Build one vertical path: focus session -> Current -> Core -> Energy/Core Charge -> rejuvenation -> Integration -> Module Token -> Forge stub.
- Only add user-editable patching after route, module install, and forge history are durable and tested.

## Minor Pitfalls

### Pitfall 13: Visual Overload Makes Progress Less Legible

**Risk type:** UX, accessibility, performance  
**Phase to address:** Phase 2: Playable Flowgrid  
**Confidence:** MEDIUM-HIGH  

**What goes wrong:** Current trails, Bloom bursts, Charge fills, Core ripples, and Activation auras compete until users cannot tell what changed.

**Warning signs:**
- Every fractional Current unit animates.
- Multiple colors encode unrelated concepts.
- Reduced-motion mode is an afterthought.
- Users cannot answer "what did my session produce?"

**Prevention:**
- Aggregate small packets.
- Reserve the strongest effects for Bloom, token grants, and major Core changes.
- Provide post-session summaries in normal UI.
- Define visual event priority and caps before adding shader polish.

### Pitfall 14: One-Note Currency Semantics

**Risk type:** Economy, product  
**Phase to address:** Phase 3: Core Economy  
**Confidence:** MEDIUM  

**What goes wrong:** Current, Charge, Energy, Core Charge, Integration, Module Tokens, Momentum, and XP blur together as generic points.

**Warning signs:**
- Users cannot explain why Energy differs from Charge.
- Token rewards feel like just another price discount.
- Current is only a number, not a flow.
- Rejuvenation has no distinct mechanical identity.

**Prevention:**
- Keep each resource's verb distinct: Current moves, Charge stores, Energy spends, Core Charge integrates, Tokens choose, XP grows local capacity, Momentum supports return.
- Use UI labels, iconography, and summaries that reinforce verbs.
- Avoid adding new currencies until current ones have distinct decisions.

### Pitfall 15: Sync Readiness Becomes Premature Sync Implementation

**Risk type:** Architecture, data, product  
**Phase to address:** Phase 1: Foundation Slice; Phase 5: Durability and Recovery  
**Confidence:** MEDIUM-HIGH  

**What goes wrong:** The roadmap either ignores sync until data is unsalvageable or overbuilds multi-device conflict resolution before the local MVP is validated.

**Warning signs:**
- Cloud accounts appear in the MVP critical path.
- Active sessions across devices are designed before local session completion works.
- Operation records are absent because "sync is deferred."
- Conflict rules are specified for every entity before real usage exists.

**Prevention:**
- Phase 1 should emit operation-shaped command results and stable entity IDs.
- Phase 5 should add backup/export and a durable sync queue.
- Defer actual cloud sync and multi-device active-session semantics.
- Define early conflict policies only for known entities: append sessions/forge history; last-write editable labels/layouts; never blind-LWW counters.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Risk Types | Mitigation |
|-------------|----------------|------------|------------|
| Phase 1: Foundation Slice | Generator is hidden behind setup | Product, UX | New Cell works immediately; start session from Home; UAT under 3 actions |
| Phase 1: Foundation Slice | Simulation and renderer tangle | Architecture, performance | Pure TypeScript simulation; visual events only; import-boundary tests |
| Phase 1: Foundation Slice | State blob blocks migrations | Data, architecture | Entity stores, schema versioning, migration fixtures, stable IDs |
| Phase 1: Foundation Slice | Daily logic breaks around local dates | Data, UX | Central time utilities; LocalDateString tests; no renderer-owned time logic |
| Phase 2: Playable Flowgrid | Canvas-only UI excludes users | Accessibility, UX | Semantic panels and controls; keyboard paths; fallback/focusable mappings |
| Phase 2: Playable Flowgrid | Visual event flood hurts readability | UX, performance | Packet aggregation, effect priority, reduced-motion mode |
| Phase 3: Core Economy | Rest farming mints tokens | Economy, product | Rejuvenation processes prior Core Charge only |
| Phase 3: Core Economy | Convert/store has a dominant strategy | Economy | Tune around multiple viable strategies; telemetry/UAT for allocation choices |
| Phase 4: Module Forge | Random rolls cannot be audited | Economy, data | Seeded RNG, forge history, split roll from reward choice |
| Phase 4: Module Forge | Module definitions mutate like instances | Architecture, data | Static definitions, owned instances, install invariants |
| Phase 5: Durability and Recovery | Browser storage loss surprises users | Data, UX | Persistent storage request, backup/export, restore test |
| Phase 5: Durability and Recovery | Offline progress freezes resume | Performance, economy | Bounded aggregate resume, summary visual events |
| Phase 6: Advanced Systems | Prestige farms early rewards | Economy | Preserve forge count/history; test reset/preserve contract |
| Phase 6: Advanced Systems | Patch editor overwhelms core loop | UX, architecture | Require proven starter loop and module install path before patch editing |

## Sources

- Flowgrid project docs: `.planning/PROJECT.md`, `docs/gameplay-spine-draft.md`, `docs/technical-vision-draft.md` (primary project context, HIGH confidence).
- Alberts, Lyngs, Lukoff, "Designing for Sustained Motivation: A Review of Self-Determination Theory in Behaviour Change Technologies" (2024), https://arxiv.org/abs/2402.00121 (motivation, reactance, engagement-vs-behavior pitfalls, HIGH confidence for product/UX risks).
- Ink & Switch, "Local-first software: You own your data, in spite of the cloud" (2019), https://www.inkandswitch.com/essay/local-first/ (local-first principles and data ownership, HIGH confidence).
- Edwards, Petricek, van der Storm, "Live & Local Schema Change: Challenge Problems" (2023), https://arxiv.org/abs/2309.11406 (schema change difficulty in local-first systems, HIGH confidence).
- MDN, "Storage quotas and eviction criteria", https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria (browser storage persistence/eviction behavior, HIGH confidence).
- WHATWG HTML Living Standard, `canvas` element, https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element (canvas fallback and keyboard-accessible mapping requirements, HIGH confidence).
- W3C WAI-ARIA Authoring Practices, "Read Me First", https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/ (ARIA/native semantics guidance, HIGH confidence).
- Macklon et al., "A Taxonomy of Testable HTML5 Canvas Issues" (2022), https://arxiv.org/abs/2201.07351 (Canvas testing, visual issue, and DOM-representation pitfalls, MEDIUM-HIGH confidence).
- MDN, "Optimizing canvas", https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas (canvas performance tactics, HIGH confidence).
- Fiedler, "Fix Your Timestep!" (2004, maintained), https://gafferongames.com/post/fix_your_timestep/ (fixed timestep and simulation/render separation, MEDIUM-HIGH confidence).
- Nystrom, "Game Loop", Game Programming Patterns, https://gameprogrammingpatterns.com/game-loop.html (game loop structure, MEDIUM-HIGH confidence).
- Chance et al., "On Determinism of Game Engines used for Simulation-based Autonomous Vehicle Verification" (2021), https://arxiv.org/abs/2104.06262 (determinism and repeatability as simulation testing requirements, MEDIUM-HIGH confidence).
- Incremental game genre overview, https://en.wikipedia.org/wiki/Incremental_game (genre vocabulary only; used for low-stakes context around prestige/offline/large-number conventions, LOW-MEDIUM confidence).

