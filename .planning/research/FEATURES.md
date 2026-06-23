# Feature Landscape

**Domain:** Local-first modular focus game / incremental systems app
**Project:** Flowgrid
**Researched:** 2026-06-23
**Scope:** Features dimension only: what Flowgrid v1 should include or defer to prove Cells + Modules + Core alternation.
**Overall confidence:** HIGH for v1 feature boundaries, MEDIUM for market breadth. The project docs are specific, and findings were cross-checked against focus timer, habit tracker, incremental game, and local-first sources. The GSD `research-plan` CLI was unavailable because the local shim failed to resolve its package metadata, so source confidence was assigned from source type and cross-checking rather than cached through the seam.

## Product Thesis

Flowgrid v1 should not try to be a full productivity suite, a full modular automation game, or a cloud-synced habit platform. It should prove one emotionally coherent loop:

```txt
tap Cell -> focus or log real effort -> Current moves -> Cell blooms -> Core chooses convert/store -> rejuvenation integrates stored Charge -> Module Token creates a new build choice -> return feels stronger
```

The minimum lovable version is a local-first focus game where the user can trust the timer, see effort become structure, make one or two strategic choices, and come back without shame. The v1 feature boundary should protect the four emotional promises from the project docs:

- **Tap to start:** no setup wall before the Generator.
- **Partial effort counts:** short sessions and unfinished milestones still produce some Current, XP, history, and Momentum.
- **Return is powerful:** coming back should surface stored Core Charge, pending Integration, available Energy, and next useful action.
- **Rest matters:** rejuvenation is a first-class loop that processes prior activity instead of becoming a disconnected wellness log.

## Table Stakes

Features users need for Flowgrid to be understandable, trustworthy, and emotionally complete. Missing these makes the app feel like a prototype rather than a product.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| First-run Cell setup with usable defaults | Users need to understand that Cells are life-domain containers, not abstract game nodes. | Med | Cell model, starter module definitions, local persistence | Offer 3-5 starter Cell suggestions such as Work, Study, Fitness, Writing, Rest. Do not require the user to design modules before their first session. |
| Flowgrid Home with Core and hex Cells | The stated product identity is a hex lattice around a Core; users need to see the central metaphor immediately. | Med | Cell setup, hex layout, selected Cell state | Keep v1 lattice compact: Core plus a small ring of Cells. Pan/zoom and huge maps can wait. |
| One-tap Generator start per Cell | Focus products compete on low-friction start. Forest's core flow is pick focus length/tree and start; Flowgrid's Generator must be equally direct. | Med | Active session state, timer UI, session commands, persistence | Generator is sacred. Cell selection should expose a primary start action without opening a configuration maze. |
| Reliable active session controls | Users must trust start, pause/stop/finish, duration, and generated rewards. | Med | Timer, command model, persistence, visual events | Include start, finish, cancel/discard, and maybe pause if it does not complicate economy rules. Define how partial sessions reward Current. |
| Partial-session reward handling | Flowgrid's promise depends on partial effort counting. | Med | Session formulas, XP/Current events, history | Award proportional Current/XP for legitimate ended sessions. Do not make cancellation the default path for interruptions. |
| Session completion summary | Focus apps commonly show the completed effort as visible progress; incremental games need immediate feedback. | Low | Economy events, selectors | Show duration, Current, XP, milestone progress, Energy/Core Charge outcome, and next suggested action. |
| Starter Cell module board | Modules are the interface and gameplay. A new Cell must demonstrate Generator -> Charge Core -> Output plus Bloom. | High | Module instances, module definitions, visual layout, command dispatch | Use a fixed starter board in v1. Let users inspect modules and maybe upgrade/install, but not freely wire complex graphs. |
| Current flow visualization | The product promise requires effort to become visible signal. | Med | Simulation visual events, Flowgrid renderer | Visuals can be simple packets/trails in v1. The renderer should not calculate economy truth. |
| Daily milestone and Bloom | Habit/focus products need a daily target; Flowgrid's differentiating completion event is Bloom. | Med | Cell progress, local day reset, Bloom module, Activation | Bloom should fire once per Cell per local day when target completes, create signal, increase Momentum, and activate the Cell. |
| Activation until local day reset | Completion needs a persistent daily consequence. | Med | Local date handling, Cell state, module selectors | Keep v1 Activation simple: visible active state plus a modest module-aware bonus. Avoid broad propagation effects. |
| Forgiving Momentum | Habit trackers often rely on streaks, but Loop's habit score pattern shows value in softening missed days after long progress. | Med | Momentum formula, local day reset, history | Use Momentum as a resilience score, not a punishment meter. Return bonuses should matter more than streak shame. |
| Core convert/store allocation | The Core must have a meaningful choice between immediate Energy and future Integration. | Med | Core state, route output, allocation controls | Start with a simple slider or segmented ratio. Enforce convert + store = 100. |
| Energy balance and basic spending | Incremental games need a resource that accumulates and gets spent on upgrades. | Med | Energy formulas, purchase commands, upgrade definitions | Include a tiny upgrade shop: Generator rate, Cell capacity, route throughput, or forge roll cost. Keep numbers readable. |
| Core Charge storage | Rest cannot matter unless activity has created something to integrate. | Med | Core allocation, Core state, visual feedback | Display stored Core Charge as potential, not just another currency. |
| Rejuvenation logging | The product promises rest matters. Rejuvenation must be a real action, not a note hidden in history. | Med | Session type, Core Charge processing, Integration | Let users log a rest session or complete a short recovery timer. It processes existing Core Charge into Integration. |
| Integration progress and Module Token threshold | Users need a visible reason to alternate activity and rest. | Med | Rejuvenation formula, threshold scaling, token grant event | First threshold should be reachable in early use. Show progress toward next token clearly. |
| Module Token inventory | Tokens are discrete reward objects, not a scaling currency. Users need to see and spend them. | Low | Integration, forge | Keep token count small and explain through UI affordance, not long text. |
| Simple Module Forge choose-one-of-three | Incremental and RPG-like habit products use rewards to sustain motivation; Flowgrid's version should create build agency. | High | Module inventory, reward generation, seeded randomness, install rules | v1 Forge should reveal 3 curated choices and let the user choose 1. No fusion, rarity economy, pity system, or large pools yet. |
| Module installation from inventory | Tokens need to create an actual build change. | Med | Inventory, Cell slots, starter board slots | Allow installing into clearly available slots. Avoid freeform patches until core loop is proven. |
| Session/history view | Users need proof that real effort was recorded. Local-first trust depends on durable history. | Med | IndexedDB sessions, selectors, date grouping | Include basic history by Cell and recent sessions. Completed sessions should be append-only. |
| Basic analytics and Cell summaries | Focus products commonly provide stats; users need to see where time and effort went. | Low-Med | History, selectors | Keep v1 to totals, streak/consistency alternatives, Cell XP, Momentum, and recent Bloom state. Advanced charts can wait. |
| Local persistence | The app cannot be trusted if focus history disappears. | Med | IndexedDB schema, migrations | Use records, stable IDs, and migration-aware schema as stated in project docs. |
| Backup/export | Local-first products establish trust through ownership. Loop supports CSV/SQLite export, and Ink & Switch emphasizes user control and longevity. | Med | Persistence schema, export serializer | Include at least JSON export of full state and CSV export of sessions. Import/restore can be v1.1 if backup export lands first, but restore is strongly preferred for trust. |
| Offline-capable core use | Forest and Loop both emphasize offline core use; local-first principles require no network dependency for core work. | Low-Med | Local app shell, IndexedDB | v1 should not require account creation, remote login, or network calls to start sessions or view history. |
| Accessible controls outside canvas | Flowgrid will use canvas/WebGL visuals, but actions and selected state need normal UI controls. | Med | UI shell, selection model, labels | Every critical action must be available through semantic UI: start, finish, inspect, allocate, log rejuvenation, forge, export. |
| Settings for daily reset and session defaults | Focus/habit tools need personal fit. | Low-Med | User settings, local date handling | Include default focus length, default daily target, local day boundary, and export location/format if relevant. |

## Differentiators

Features that make Flowgrid distinct. These should be present in v1 only where they directly prove the Core alternation thesis.

| Feature | Value Proposition | Complexity | Dependencies | V1 Recommendation |
|---------|-------------------|------------|--------------|-------------------|
| Cells as life-domain modules, not task lists | Reframes productivity around domains of attention and identity rather than endless tasks. | Med | Cell setup, history, Cell inspector | Include. This is foundational. |
| Modules as both UI and game mechanics | Makes controls feel like installed components in a living system. | High | Module definitions, instances, board renderer, command model | Include with a curated starter set. Avoid open-ended graph editing. |
| Current as visible effort signal | Turns abstract focus time into a moving, spendable flow. | Med | Simulation events, renderer | Include. This is the core sensory reward. |
| Bloom as milestone event | Makes daily completion feel celebratory and mechanically meaningful. | Med | Daily target, Bloom module, Activation | Include. Bloom is more Flowgrid-specific than a streak. |
| Core dual-output strategy | Adds a meaningful "now vs later" decision without requiring a complex economy. | Med | Core allocation, Energy, Core Charge | Include. This is the cleanest v1 strategic choice. |
| Activity/rest alternation economy | Makes rest productive only after prior effort, preserving emotional integrity and preventing rest farming. | Med | Core Charge, rejuvenation, Integration | Include. This is the strongest differentiation from standard focus timers. |
| Module Tokens from Integration | Makes rest create creative agency rather than just recovery stats. | Med | Integration thresholds, forge | Include, but keep token grants sparse and clear. |
| Curated Module Forge | Gives users a build choice and a reason to return. | High | Tokens/Energy, module inventory, install rules | Include as a narrow choose-one-of-three flow. |
| Return dashboard / "what changed while you were away" | Supports the promise that return is powerful. | Med | State selectors, history, pending rewards | Include a lightweight version: stored Charge, available Energy, token progress, Cells near Bloom. Do not add offline production yet. |
| Rest Cell as first-class optional starter | Signals that recovery is part of the system, not a guilt-free productivity loophole. | Low-Med | Starter templates, rejuvenation | Include as a suggested Cell, but Core rejuvenation should work even if the user does not create a Rest Cell. |
| Build choices tied to real history | Makes modules feel earned by actual effort rather than arbitrary gamification. | Med | History, forge, module install events | Include through session-derived currencies and forge history. |
| Local-first ownership as product trust | Differentiates from account-first productivity tools. | Med | IndexedDB, export, no account requirement | Include. Avoid cloud sync in v1 while being sync-ready internally. |

## Anti-Features

Features to explicitly not build in v1. These are attractive, but they will dilute the vertical slice or create systems debt before the core feeling is validated.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full patch editor | It invites graph complexity before users have proven they want module routing. It also raises simulation, UI, and persistence complexity at once. | Ship a fixed starter board with a few unlockable slots and curated install points. |
| Advanced module graph logic | Same-tick loops, recursive triggers, routing drift, and ambiguous economy truth can cause rewrites. | Support simple module triggers only: session finished, Bloom fired, route output, rejuvenation processed. |
| Prestige / Memory reset loop | Prestige is common in incremental games, but it is a long-tail retention system, not a v1 proof point. | Keep Core Power and Memory visible only as placeholders or omit from UI. Preserve history foundations for later. |
| Module fusion / duplicate economy | Fusion requires rarity pools, duplicate handling, balancing, and inventory UX. | Forge grants simple unique module options or upgrades. Duplicate handling can be "converted to Energy" later, not v1. |
| Large rarity pool and gacha-style odds | It shifts attention from meaningful build choices to gambling-like reward tuning. | Use curated choose-one-of-three rewards with deterministic/seeded generation and transparent categories. |
| Cloud sync and accounts | Sync would dominate architecture and product risk. Local-first v1 should prove single-device trust first. | Build sync-ready records and operation logs internally, but expose no account or multi-device sync promise. |
| Multi-device active sessions | Active focus sessions are hard to merge safely across devices and depend on sync semantics. | Single-device active session only. Completed sessions are append-only. |
| Social focus rooms / leaderboards | Forest and Habitica show social features can drive engagement, but Flowgrid's v1 promise is personal attention becoming structure. | Defer social entirely. Consider exportable screenshots or backup files only. |
| App/site blocking | Forest treats blocking as a major focus feature, but implementing cross-platform blockers is product and platform scope creep. | Make Flowgrid a compelling timer/game first. Add a "strict mode" only if it is purely in-app and cheap. |
| Notifications and widgets as core v1 | Useful for habit products, but they add platform-specific scope and permission UX. | Defer native reminders/widgets unless the chosen platform makes them trivial. In-app return cues are enough for v1. |
| Complex task manager | Todo lists, projects, priorities, comments, calendars, and reminders would turn Flowgrid into a generic productivity app. | Support optional lightweight session notes or checklist module later. V1 focus is Cells, sessions, and modules. |
| Calendar integration | It pulls the app toward scheduling rather than the focus game loop. | Use local daily targets and recent history first. |
| AI planning, coaching, or task breakdown | Not required to prove Cells + Modules + Core alternation and raises trust/privacy questions. | Keep suggestions deterministic and based on local state. |
| Full analytics dashboard | Advanced charts can delay the playable loop. | Provide compact summaries and recent history. |
| Offline idle production | Incremental games often reward returns with accumulated resources, but Flowgrid resources should come from real effort. | Use "return is powerful" through unspent Energy, stored Core Charge, pending Integration, and near-complete Blooms. |
| Punitive streak loss | It violates the emotional promise that partial effort counts and return is powerful. | Use forgiving Momentum, Bloom history, and recovery mechanics. |
| Rest farming | If rest directly mints rewards, users can bypass the effort/rest alternation. | Rejuvenation only processes Core Charge generated by prior activity. |
| Huge first-run content library | Too many module types will obscure the core loop. | Ship 4 starter modules plus a small forge pool of maybe 6-10 early modules/upgrades. |

## Feature Dependencies

```txt
Cell model -> First-run Cell setup -> Flowgrid Home -> Generator start
Generator start -> Active session controls -> Session completion -> Current/XP/Momentum rewards
Session completion -> Daily milestone progress -> Bloom -> Activation
Session completion -> Current events -> Output route -> Core convert/store allocation
Core allocation -> Energy + Core Charge
Energy -> Basic upgrades + Energy forge payment
Core Charge -> Rejuvenation logging -> Integration -> Module Tokens
Module Tokens -> Module Forge -> Module inventory -> Module installation
Module installation -> Starter board expansion
Session history -> Analytics summaries + Backup/export + Return dashboard
IndexedDB records -> Local persistence -> History trust -> Backup/export -> Future sync readiness
Visual events -> Current flow visualization + Bloom/Core feedback
Accessible UI controls -> All canvas-backed actions
```

## MVP Recommendation

Prioritize this v1 slice:

1. **Create Cells and see Core-centered hex Flowgrid.**
   - Proves the product metaphor quickly.
   - Required for all later systems.

2. **Tap a Cell and start/finish a Generator session.**
   - Protects the sacred interaction.
   - Partial sessions generate proportional Current, Cell XP, Momentum, milestone progress, and history.

3. **Show Current moving through starter modules to the Core.**
   - Makes effort visible.
   - Keeps modules understandable before customization.

4. **Complete a daily milestone, fire Bloom, and activate the Cell.**
   - Replaces punitive streaks with a positive daily event.
   - Makes partial effort and full completion both legible.

5. **Let the Core split incoming Current between Energy and Core Charge.**
   - Proves Flowgrid has strategy without requiring advanced graphs.
   - The allocation control should be simple and always valid.

6. **Let Energy buy 2-4 basic upgrades.**
   - Gives incremental-game payoff.
   - Keep costs small, readable, and capped for v1.

7. **Let rejuvenation process Core Charge into Integration and Module Tokens.**
   - Proves rest matters mechanically.
   - Prevents rest farming because Core Charge must come from previous activity.

8. **Let a Module Token run a simple choose-one-of-three Module Forge.**
   - Gives a satisfying build choice.
   - The reward should install into an obvious slot or upgrade an existing starter module.

9. **Persist everything locally with history and export.**
   - Makes the app trustworthy.
   - Supports local-first identity without cloud sync.

Defer:

- Full patch editor: wait until users understand starter modules and want control.
- Prestige/Memory: wait until Core economy and history feel worth preserving.
- Cloud sync/accounts: wait until local record schema, operations, and migration semantics are proven.
- App blocking/social rooms/widgets: useful but not part of the core proof.
- Complex task/project management: would obscure Flowgrid's identity.

## Suggested V1 Feature Set

### Core Product

| Feature | Include in v1? | Complexity | Depends On | Acceptance Shape |
|---------|----------------|------------|------------|------------------|
| Create/edit/archive Cell | Yes | Med | Persistence, Cell model | User can create a named Cell with color/icon, inspect it, and archive without deleting history. |
| Hex Flowgrid Home | Yes | Med | Cell records, Core state | Core appears centered; Cells appear around it; selecting a Cell opens inspector/board. |
| Cell Inspector | Yes | Low-Med | Selectors | Shows XP, Momentum, Charge, milestone, Activation, installed modules, recent sessions. |
| Generator session | Yes | Med | Active session state | User can start in one tap, see elapsed/remaining time, finish, and receive rewards. |
| Session note | Maybe | Low | Session model | Optional short note at finish. Do not block completion. |
| Lightweight checklist/task module | Defer or late v1 | Med | Module framework | Only add if Generator feels too narrow; otherwise save for v1.1. |
| Count/reps module | Defer | Med | Module framework | Valuable for Fitness/Music, but not needed to prove Core alternation. |

### Game Systems

| Feature | Include in v1? | Complexity | Depends On | Acceptance Shape |
|---------|----------------|------------|------------|------------------|
| Current generation | Yes | Med | Session completion, formulas | Focus time creates Current with deterministic formula. |
| Cell XP | Yes | Low | Session completion | Minutes map to XP or a simple equivalent. |
| Momentum | Yes | Med | Local day, history | Misses decay softly; returns can recover. No hard failure state. |
| Daily milestone | Yes | Med | Cell settings, local date | Progress accumulates from partial sessions; completes once per local day. |
| Bloom | Yes | Med | Milestone | Bloom fires visual/economy event and activates Cell. |
| Activation | Yes | Med | Bloom, local day reset | Active Cells show state and gain simple module-aware bonus. |
| Charge Core | Yes | Med | Starter modules | Cell Charge stores some Current or visualizes accumulation. |
| Output route to Core | Yes | Med | Current, route model | Each starter Cell can route Current to Core without user graph editing. |
| Core allocation | Yes | Med | Core state, route output | User can set convert/store split; invariant remains 100%. |
| Energy | Yes | Low-Med | Core conversion | User sees spendable Energy and lifetime Energy. |
| Core Charge | Yes | Low-Med | Core storage | User sees stored Charge and capacity. |
| Rejuvenation | Yes | Med | Core Charge | Rest session/log processes Core Charge into Integration. |
| Integration | Yes | Med | Rejuvenation | Progress bar toward next Module Token. |
| Module Tokens | Yes | Low | Integration thresholds | Token grant is visible and spendable. |
| Module Forge | Yes, narrow | High | Tokens/Energy, inventory | Spend token, reveal 3 choices, pick 1, install or add to inventory. |
| Energy upgrades | Yes, small | Med | Energy | 2-4 upgrades with capped levels. |
| Prestige/Memory | No | High | Mature economy | Keep out of v1 UI. |

### Trust and Data

| Feature | Include in v1? | Complexity | Depends On | Acceptance Shape |
|---------|----------------|------------|------------|------------------|
| IndexedDB persistence | Yes | Med | Domain schema | Reload preserves Cells, sessions, Core, modules, inventory, settings. |
| Migration versioning | Yes | Med | Persistence layer | Schema has version and migration path from day one. |
| Append-only completed sessions | Yes | Med | Session model | Completed sessions are not silently edited; later corrections can be adjustment records. |
| Backup/export JSON | Yes | Med | Persistence records | User can export full local state. |
| Session CSV export | Yes | Low-Med | Session history | User can export completed sessions for ownership and analysis. |
| Import/restore | Strong maybe | Med-High | Export schema, validation | Prefer include if possible; otherwise roadmap immediately after v1. |
| Cloud sync | No | High | Operation log, conflict semantics | Design records to be sync-ready but do not expose sync. |
| Account/login | No | Med-High | Cloud service | Avoid entirely in v1. |

### UX and Accessibility

| Feature | Include in v1? | Complexity | Depends On | Acceptance Shape |
|---------|----------------|------------|------------|------------------|
| Normal UI controls for canvas actions | Yes | Med | App shell, selection model | Keyboard/screen-reader reachable actions exist for core operations. |
| Visual feedback for Current/Bloom/Core | Yes | Med | Visual events | Flow packets, Bloom burst, Core convert/store pulse. |
| Compact return dashboard | Yes | Med | Selectors | Opening app shows useful next actions and pending progress without shame. |
| Settings | Yes, minimal | Low-Med | Persistence | Default focus duration, daily target, local day boundary, export access. |
| Notifications | Defer | Med | Platform APIs | Not required for local web MVP. |
| Widgets | Defer | High | Native/platform | Not part of v1 proof. |
| Soundscapes | Defer | Low-Med | Audio assets/settings | Nice focus timer feature, but not core to Flowgrid differentiation. |

## Phase-Friendly Build Order

1. **Local Shell and State**
   - Cells, Core, IndexedDB records, settings, export skeleton.
   - Avoids building visuals against throwaway state.

2. **Generator Vertical Slice**
   - Flowgrid Home, Cell inspector, Generator session, session history, Current/XP/Momentum.
   - Proves tap-to-start and partial effort.

3. **Bloom and Activation**
   - Daily target, Bloom module, Activation state, local day reset.
   - Proves return-friendly habit loop without punitive streaks.

4. **Core Alternation**
   - Route output to Core, convert/store allocation, Energy, Core Charge.
   - Proves the central strategy.

5. **Rejuvenation and Integration**
   - Rest logging/timer, Core Charge processing, Integration thresholds, Module Tokens.
   - Proves rest matters.

6. **Forge and Starter Customization**
   - Choose-one-of-three forge, inventory, install into curated slots, small upgrade pool.
   - Proves build-better-Cells without full graph scope.

7. **Hardening and Trust**
   - Migration tests, append-only history validation, export/import polish, accessibility pass.
   - Makes v1 credible for real daily use.

## Sources

- Flowgrid project docs: `.planning/PROJECT.md`, `docs/gameplay-spine-draft.md`, `docs/technical-vision-draft.md`. Confidence: HIGH. Primary project source for emotional promise, v1 scope, terminology, and explicit out-of-scope boundaries.
- Forest official site. Focus timer, visible progress, app blocking, analytics, group focus, mindful breaks, offline core use, and plan comparison. Confidence: HIGH. https://forestapp.cc/
- Streaks official site. Habit streaks, flexible schedules, automatic health tracking, watch widgets, and task statistics. Confidence: HIGH. https://streaksapp.com/
- Loop Habit Tracker README. Forgiving habit score, flexible schedules, reminders, widgets, CSV/SQLite export, offline/private use, and no-account posture. Confidence: HIGH. https://github.com/iSoron/uhabits
- Ink & Switch local-first essay. Local-first ideals: fast local access, optional network, longevity, privacy, ownership/control, and export-friendly data ownership. Confidence: HIGH. https://www.inkandswitch.com/essay/local-first/
- Incremental game overview. Common genre mechanics: simple action into currency, upgrades, escalating progression, achievements/milestones, automation, and prestige as a later-stage loop. Confidence: MEDIUM. https://en.wikipedia.org/wiki/Incremental_game
- Habitica overview via crawled encyclopedia result. Habits/Dailies/To-Dos, XP/gold rewards, RPG framing, and social/quest systems. Confidence: MEDIUM because official pages were JavaScript-empty in this environment. https://habitica.com/static/features

## Gaps and Follow-Up Research

- Exact v1 economy numbers need playtesting, not desk research. Start with readable values and cap early upgrades.
- Module Forge pool size and reward cadence should be tuned after the Generator/Bloom/Core loop is playable.
- If Flowgrid targets native mobile first, notifications, widgets, and app blocking should be researched separately because platform constraints dominate feature cost.
- If import/restore cannot fit v1, document export format stability and make restore the first post-v1 trust feature.
