# Architecture Patterns

**Domain:** Local-first modular focus game / incremental systems app
**Project:** Flowgrid
**Researched:** 2026-06-23
**Overall confidence:** HIGH for layer boundaries and persistence direction; MEDIUM for final renderer implementation details until the first PixiJS slice is profiled on target devices.

## Recommendation

Build Flowgrid as a layered TypeScript application with a pure simulation core, normal React UI shell, PixiJS 8 visual renderer, Dexie-backed IndexedDB repositories, and an operation queue designed from day one even though cloud sync is deferred.

The critical rule is:

```txt
Simulation owns truth.
Renderer shows motion.
Persistence stores durable records.
Sync moves operations.
UI configures and inspects state.
```

Do not make the Canvas/WebGL scene the app. Use PixiJS for the Flowgrid lattice, Core, routes, packets, Bloom bursts, Charge fills, and module-board motion. Use normal UI components for the Generator controls, inspectors, forms, forge choices, history, settings, accessibility mirrors, and text-heavy details.

## System Shape

```txt
User intent
  -> UI command handler
  -> command validation
  -> pure simulation/domain command
  -> next durable state + domain events + visual events + sync operations
  -> atomic local persistence
  -> app store/selectors
  -> React UI and PixiJS renderer consume derived state/events
  -> background sync later drains durable operation queue
```

### Dependency Direction

Allowed imports:

```txt
app -> domain
app -> simulation
app -> persistence
app -> sync
ui -> app selectors and command dispatch
render -> render models, simulation visual-event types, selectors
persistence -> domain record types
sync -> domain operation types, persistence queue
simulation -> domain
domain -> no app, browser, persistence, UI, React, Pixi, or DOM imports
```

Forbidden imports:

```txt
simulation -> render
simulation -> persistence
simulation -> React/Pixi/DOM/browser APIs
render -> persistence
render -> economy mutation logic
ui -> module effect calculations
persistence -> command execution
sync -> UI state mutation
```

When a boundary feels awkward, add a command, selector, adapter, or domain type. Do not cross the boundary.

## Component Boundaries

| Component | Responsibility | Communicates With | Must Not Do |
|-----------|----------------|-------------------|-------------|
| `domain` | IDs, branded types, durable record shapes, constants, invariants, local date/time abstractions | `simulation`, `persistence`, `sync`, `app` | Import browser APIs, mutate state, render UI |
| `content` | Static module definitions, starting Cell template, rarity pools, formula constants, content version | `simulation`, `app` | Store per-user state |
| `simulation` | Deterministic commands, economy rules, module triggers, route processing, forge outcomes, invariant validation | `domain`, `content` | Know about React, PixiJS, IndexedDB, network, localStorage, DOM |
| `app` | Orchestration, command dispatch, transaction composition, store hydration, UI-only state, selectors | `simulation`, `persistence`, `sync`, `ui`, `render` | Hide domain rules in components |
| `persistence` | IndexedDB schema, migrations, repositories, backup/export/import, storage estimates | `domain`, `app` | Recompute economy effects or own command semantics |
| `sync` | Durable operation queue, idempotency, future transport, conflict rules, ack/retry lifecycle | `domain`, `persistence`, `app` | Ship in MVP as remote sync or mutate UI directly |
| `render` | PixiJS application, scene graph, camera, hex layout, particles, visual event playback, hit testing | `app selectors`, `visualEvents` | Own Energy, Charge, XP, Tokens, session truth, or routing math |
| `ui` | React screens, panels, forms, accessible controls, command buttons, inspectors, history, forge UI | `app selectors`, `app commands` | Calculate module effects or depend on renderer state as truth |
| `tests` | Simulation, invariants, migrations, operation generation, renderer smoke tests | All layers via public APIs | Rely only on browser manual testing |

## Recommended Source Layout

```txt
src/
  domain/
    ids.ts
    types.ts
    records.ts
    time.ts
    invariants.ts
    validation.ts

  content/
    module-definitions.ts
    starter-cell.ts
    formulas.ts
    content-version.ts

  simulation/
    commands/
      create-cell.ts
      finish-session.ts
      log-rejuvenation.ts
      set-core-allocation.ts
      forge.ts
      install-module.ts
    systems/
      current.ts
      bloom.ts
      core.ts
      integration.ts
      routes.ts
      modules.ts
    engine.ts
    visual-events.ts
    economy-events.ts
    selectors.ts

  persistence/
    db.ts
    schema.ts
    migrations.ts
    repositories/
      cells.ts
      modules.ts
      routes.ts
      sessions.ts
      core.ts
      operations.ts
      metadata.ts
    backup.ts
    import-export.ts

  sync/
    operations.ts
    conflict-rules.ts
    queue.ts
    transport.ts

  app/
    bootstrap.ts
    store.ts
    command-dispatch.ts
    hydrate.ts
    selectors.ts
    routes.tsx

  ui/
    App.tsx
    views/
      FlowgridHome.tsx
      CellInspector.tsx
      CellBoard.tsx
      CoreView.tsx
      ModuleForge.tsx
      HistoryView.tsx
      SettingsView.tsx
    components/

  render/
    flowgrid/
      FlowgridCanvas.tsx
      pixi-app.ts
      scene.ts
      camera.ts
      hex-layout.ts
      cells-layer.ts
      routes-layer.ts
      particles-layer.ts
      event-player.ts
      hit-testing.ts
    module-board/
      ModuleBoardCanvas.tsx
      board-layout.ts
      patches-layer.ts
      ports-layer.ts

  test/
    factories.ts
    expect-valid-state.ts
```

The folders can change, but the public APIs should remain stable: commands in, deterministic results out; durable records in repositories; display models in selectors; transient visuals in render adapters.

## Core Data Model

Store durable state as normalized records, not one opaque blob. A top-level `AppSnapshot` can be assembled at load time for simulation convenience, but IndexedDB stores should remain entity-oriented.

Recommended record families:

| Store | Purpose | Sync/Migration Notes |
|-------|---------|----------------------|
| `metadata` | schema version, app version, content version, client ID, migration log | Required before any sync transport exists |
| `cells` | Cell identity, XP, Momentum, Charge, Activation, milestone settings | LWW for editable fields initially; counters need command-derived operations |
| `moduleInstances` | Owned and installed module copies | Stable IDs; installation is operation-based to avoid duplicates |
| `patches` | Internal Cell module connections | Validate endpoints and same-Cell rule on write and migration |
| `routes` | Cell/Core routes and allocation | Normalize allocation; preserve stable route IDs |
| `sessions` | Completed focus/rejuvenation/task/manual history | Append-only; corrections should become adjustment records |
| `core` | Energy, Core Charge, allocation, Integration, Tokens, Core Power | Do not blindly last-write-win counters during future sync |
| `forgeHistory` | Rolls, choices, costs, forge count | Append-only; forge count must never reset |
| `operations` | Sync-ready durable mutation log | Required in MVP even if never sent over network |
| `visualEventLog` | Optional recent replay/debug buffer | Bounded; not source of truth |
| `settings` | User preferences | LWW acceptable |

Use Dexie for the MVP because it gives a practical TypeScript-friendly repository layer over IndexedDB, explicit versioned schemas, upgrades, transactions, and indexed tables. Use raw `idb` only if the project deliberately wants a thinner wrapper and is willing to write more repository boilerplate. IndexedDB itself is the right browser storage target because it stores significant structured data asynchronously and transactionally, but browser storage remains subject to quota and eviction policies, so backup/export and `navigator.storage.persist()` handling are product requirements, not polish.

## Command And Simulation Contract

Every durable user action should enter the system as a command:

```ts
type Command<TInput> = {
  id: OperationId;
  clientId: ClientId;
  type: CommandType;
  input: TInput;
  issuedAt: IsoDateTimeString;
};

type CommandResult = {
  nextState: AppSnapshot;
  economyEvents: EconomyEvent[];
  visualEvents: VisualEvent[];
  operations: SyncOperation[];
  validationIssues: ValidationIssue[];
};
```

The app command dispatcher should:

1. Read the required records from repositories.
2. Assemble an `AppSnapshot`.
3. Pass command input, injected `now`, and injected random source into pure simulation.
4. Require `validationIssues.length === 0` before commit.
5. Persist changed records and generated operations in one IndexedDB transaction.
6. Publish state changes and visual events to the app store.

Simulation functions should be deterministic:

```ts
finishSession(state, input, env) -> CommandResult
logRejuvenation(state, input, env) -> CommandResult
runForge(state, input, env) -> CommandResult
setCoreAllocation(state, input, env) -> CommandResult
```

`env` may include `now`, `localDate`, `rng`, and content definitions. It must not include DOM, browser storage, React, PixiJS, network clients, or mutable singletons.

## Data Flow Details

### Session Completion

```txt
React Generator button
  -> dispatch startSession(cellId)
  -> active session record in app/persistence
  -> finishSession(duration, endedAt)
  -> simulation calculates Current, XP, Momentum, milestone, Bloom, Activation
  -> route output to Core
  -> Core convert/store allocation updates Energy and Core Charge
  -> completed Session appended
  -> sync operations appended
  -> visual events emitted for Current, Bloom, Core conversion/storage
  -> PixiJS animates emitted events
  -> UI panels read selectors from durable state
```

### Rejuvenation

```txt
React/Core UI logs rejuvenation
  -> simulation consumes bounded Core Charge
  -> Integration increases
  -> thresholds grant Module Tokens
  -> Session appended as rejuvenation history
  -> operation queue records append/adjust operations
  -> UI and renderer show Integration progress and token grant
```

### Forge

```txt
Forge payment selected
  -> seeded random choice generation
  -> pending forge offer persisted or committed immediately
  -> user chooses one reward
  -> module instance created
  -> forge history appended
  -> forge count increments monotonically
  -> operation queue records roll and chosen reward
```

Persist pending forge offers if choice can be interrupted by reload. Do not generate a fresh offer on reload after payment.

## Renderer Architecture

PixiJS should be an adapter around selected state and visual events, not a second app model.

Recommended renderer structure:

```txt
FlowgridCanvas React component
  -> creates/destroys PixiJS Application
  -> subscribes to display selectors and visual event queue
  -> passes display model to Scene

Scene
  -> owns Pixi containers/layers
  -> reconciles durable display model into retained visual objects
  -> plays transient VisualEvents
  -> reports hit-test intents back to app commands/selections
```

PixiJS 8's `Application` is an async entry point that manages renderer setup and ticker updates, and the ticker is appropriate for per-frame animation. Keep the ticker as a render/animation clock. Do not use ticker callbacks to mutate domain state directly. If active-session projections are shown while a session is running, treat them as UI projections unless the command is committed.

Use a fixed or bounded simulation step for any actual simulation tick. The render loop may run at 60 FPS; durable economy ticks can run at a lower fixed cadence or be computed at command boundaries. For deterministic replay, inject elapsed time into simulation explicitly and consume it in fixed steps or aggregate formulas rather than coupling results to frame rate.

Rendering rules:

| Concern | Rule |
|---------|------|
| Current packets | Animate from `VisualEvent.current_moved`; aggregate tiny packets |
| Bloom | Animate from `cell_bloomed`, never infer from progress bar crossing threshold in renderer |
| Core conversion | Animate from `core_converted` / `core_charge_stored` |
| Hit testing | Return intent (`selectCell`, `openCore`, `startSessionIntent`), not state mutations |
| Text/controls | Prefer React UI overlays/panels; use Pixi text sparingly |
| Accessibility | Mirror selected Cell/Core/module state in semantic React panels; optionally enable Pixi accessibility for direct canvas targets |
| Performance | Batch static geometry, cap particles, avoid per-frame text updates, avoid excessive masks/filters |

## UI Shell Architecture

Use React + TypeScript for the normal app shell because the ecosystem is safest for production UI, accessibility, routing, test tooling, and future desktop/PWA packaging.

The React app should own:

```txt
navigation
selectedCellId / selectedModuleId
panels and modals
forms and validation messages
Generator controls
Core allocation controls
rejuvenation logging
forge choices
history views
settings
backup/export/import
accessible mirrors of canvas state
```

UI state should be separate from domain state:

| UI-only State | Durable State |
|---------------|---------------|
| selected Cell | Cell record |
| camera position, zoom | Optional user setting only if desired |
| hovered route | Route record |
| open panel/modal | Domain records |
| draft form values | Persist only on command |
| currently playing visual events | Durable economy/session records |

Selectors should be the only place display-ready values are derived:

```ts
selectFlowgridDisplay(state)
selectCellSummary(state, cellId)
selectCellBoardDisplay(state, cellId)
selectCoreEconomy(state)
selectGeneratorState(state, cellId)
selectForgeOptions(state)
selectHistoryRange(state, range)
```

Components should not duplicate game math.

## Persistence And Migration Pattern

Use versioned IndexedDB stores and explicit migrations from the first phase. The migration surface is cheap early and expensive later.

Migration rules:

1. Every durable record has `id`, `createdAt`, `updatedAt`, and a schema-compatible shape.
2. Every schema change gets a migration test with old fixture data.
3. Migrations preserve sessions, forge history, Cell IDs, ModuleInstance IDs, and operation IDs.
4. Migrations may repair derived/cached fields, but must log repair issues.
5. After migration, run `validateAppState`.
6. Backup import uses the same migration path as normal app load.

Do not maintain a separate backup-only format. Export a portable versioned package:

```txt
metadata.json
records/*.json
operation-log.json
content-version.json
```

For browser storage durability, request persistent storage where available, show backup/export affordances early, handle `QuotaExceededError`, and make backup restore part of UAT. MDN documents that browser storage is best-effort by default and can be evicted under storage pressure or Safari inactivity policies.

## Sync-Readiness Pattern

Do not implement remote sync in the MVP, but design every durable command as if it may later sync.

Recommended operation shape:

```ts
type SyncOperation = {
  id: OperationId;
  clientId: ClientId;
  sequence: number;
  entityType: SyncEntityType;
  entityId: string;
  op: "put" | "append" | "adjust" | "delete";
  commandType: CommandType;
  payload: unknown;
  baseVersion?: string;
  schemaVersion: number;
  contentVersion: string;
  status: "pending" | "in_flight" | "acked" | "failed";
  attempts: number;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
};
```

MVP operations should be durable and idempotent locally, even without a network transport. This proves that command outputs can be recorded, replayed for debugging, exported, and later sent to a sync service.

Conflict policy by entity:

| Entity | Initial Policy | Why |
|--------|----------------|-----|
| Sessions | Append by stable ID; no casual deletes | Real history must survive |
| Forge history | Append by stable ID; forge count monotonic | Prevent cheap module farming and duplicate reward bugs |
| Module tokens / Energy / Core Charge | Operation-derived adjustments, not blind LWW | Counters are economically sensitive |
| Cells editable fields | LWW initially | Name/color/settings conflicts are low risk |
| Module layout | LWW initially; later operation merge | Good enough for single-device MVP and simple future sync |
| Patches/routes | LWW initially with invariant validation | Graph merges can wait |
| Settings | LWW | Low economic risk |

Avoid claiming CRDT support until the product has concrete multi-device requirements. For Flowgrid's personal single-user v1, operation logs plus entity-specific conflict rules are the right foundation. CRDTs may become useful for collaborative/shared Cells later, but they are not required for the first local-first milestone.

## Simulation Patterns

### Pattern: Pure Command Handlers

**What:** Each user action becomes a pure function over immutable input state plus injected environment.

**When:** All economy, progression, session, forge, Core, route, and module actions.

**Example:**

```ts
export function finishSession(
  state: AppSnapshot,
  input: FinishSessionInput,
  env: SimulationEnv
): CommandResult {
  const draft = createCompletedSession(state, input, env);
  const withCurrent = applyCurrentGeneration(state, draft);
  const withBloom = applyBloomIfNeeded(withCurrent, draft, env.localDate);
  const withCore = routeCellOutputToCore(withBloom, draft.cellId);
  return buildCommandResult(withCore, draft, env);
}
```

### Pattern: Visual Events As Output

**What:** Simulation emits transient visual events alongside durable state changes.

**When:** Any effect users should see moving, pulsing, blooming, filling, or granting.

**Example:**

```ts
type VisualEvent =
  | { type: "current_moved"; from: VisualEndpoint; to: VisualEndpoint; amount: number }
  | { type: "cell_bloomed"; cellId: CellId; amount: number }
  | { type: "core_converted"; current: number; energy: number }
  | { type: "module_token_granted"; count: number };
```

### Pattern: Invariant Gate After Every Command

**What:** Validate state after every command and migration.

**When:** Always in tests; in development runtime; in production with recoverable error reporting.

Critical invariants:

```txt
no negative Energy, Charge, XP, Integration, or Tokens
Core convert/store allocation sums to 100
installed modules are not installed twice
patch endpoints exist and stay within one Cell
routes have valid endpoints
active session references an unarchived Cell
completed sessions are append-only
forge count never decreases
pending forge payment cannot create multiple rewards
same operation ID is idempotent
```

### Pattern: Content Definitions Separate From User State

**What:** `ModuleDefinition` and formulas live in static content files with a content version; `ModuleInstance` and upgrades live in user records.

**When:** Starter modules, forge rewards, future rarity pools, upgrades, and prestige systems.

This keeps migrations tractable when modules change. Persist definition IDs and instance state, not copied full definitions.

### Pattern: Materialized State Plus Operation Log

**What:** Store current records for fast load and an operation log for sync/debug/history.

**When:** MVP onward.

Do not force the MVP to rebuild all state from the operation log on every boot. That adds event-sourcing complexity before the product loop is validated. Instead, make the operation log complete enough that future reconciliation and debugging are possible.

## Anti-Patterns To Avoid

### Canvas-Owned Game State

**What:** Pixi objects hold Energy, Charge, Current, route allocation, or module activation truth.

**Why bad:** Rendering bugs become economy bugs; tests need a browser/GPU; future sync cannot reason about state.

**Instead:** Renderer consumes selectors and `VisualEvent`s.

### Giant LocalStorage Blob

**What:** Serialize all state into one localStorage key.

**Why bad:** Poor migration story, low storage limits, hard sync, hard partial backup, hard corruption recovery.

**Instead:** IndexedDB records, versioned schema, repositories, backup/export path.

### UI Components Calculating Economy

**What:** React components compute Bloom, Energy, forge costs, token thresholds, or route output.

**Why bad:** Logic forks between UI and simulation, and tests miss real product behavior.

**Instead:** Selectors derive display values; commands mutate domain state.

### Sync As Whole-State Replacement

**What:** Future sync uploads/downloads a full app snapshot and overwrites local state.

**Why bad:** Counter duplication/loss, session loss, forge count reset risk, conflict ambiguity.

**Instead:** Stable IDs, append-only history, operation queue, entity-specific conflict rules.

### Frame-Rate-Dependent Simulation

**What:** Economy results depend on Pixi ticker delta or render FPS.

**Why bad:** Different devices produce different rewards; tests become flaky; offline/resume behavior is exploitable.

**Instead:** Commands and fixed/aggregate ticks with injected elapsed time.

## Suggested Build Order

### Phase 1: Architecture Skeleton And Deterministic Domain

Build:

- TypeScript project structure with `domain`, `content`, `simulation`, `persistence`, `app`, `ui`, `render`.
- Branded IDs and durable record types.
- Starter content definitions for Generator, Charge Core, Output, Bloom, Integration Core.
- Command dispatcher interface and `CommandResult`.
- `validateAppState` and test factories.
- Pure commands for create Cell, set Core allocation, start/finish focus session in memory.

Must prove:

- Simulation tests run without DOM, PixiJS, React, IndexedDB, or browser APIs.
- A session can deterministically generate Current, XP, Momentum, Bloom/Activation, Energy, Core Charge.
- Every command validates invariants.

### Phase 2: Local Persistence And Migration Foundation

Build:

- Dexie schema with normalized stores.
- Hydration/materialization from records into `AppSnapshot`.
- Atomic command commit that writes changed records and operations.
- Migration harness and first old-schema fixture.
- Backup/export/import using the same records.
- Storage durability request and quota/error handling.

Must prove:

- Reload preserves Cells, sessions, Core counters, forge count, operations.
- Migration tests protect append-only sessions and stable IDs.
- Backup can restore into a clean database.

### Phase 3: First Playable Vertical Slice

Build:

- React app shell.
- Flowgrid Home with selectable Core and Cells.
- PixiJS Flowgrid renderer for hex Cells, Core, routes, and basic Current/Bloom events.
- Generator interaction protected as the fastest path: open app -> tap Cell -> start session.
- Cell Inspector, Core View, Rejuvenation logging, simple Module Forge stub.

Must prove:

- The loop feels coherent: focus -> Current -> Bloom -> Core convert/store -> rejuvenation -> Integration -> Module Token -> forge choice.
- Renderer never owns economy truth.
- Visual events can be dropped/replayed without corrupting durable state.
- Keyboard/screen-reader accessible controls exist outside the canvas for key actions.

### Phase 4: Module Board And Internal Flow

Build:

- Cell Board view.
- Starter module layout.
- Internal module display and simple patch visualization.
- Module install/move/remove commands.
- Route Socket behavior.
- Module definitions/effect registry hardened by tests.

Must prove:

- Modules are both UI and mechanics without putting business logic in UI components.
- Duplicate installs, invalid patches, and route allocation drift are prevented.

### Phase 5: Forge, Progression, And Economy Hardening

Build:

- Real forge payment/reward/choice flow.
- Pending offer persistence.
- Energy roll and token roll cost models.
- Cell XP local progression.
- Core Power placeholders if needed.
- Regression tests for token duplication, forge count reset, negative counters, same-tick recursion.

Must prove:

- Forge count is monotonic and survives reload/migration.
- Token and Energy spending are idempotent under retry/reload.

### Phase 6: Sync-Ready Audit Before Remote Sync

Build:

- Operation log inspector/debug export.
- Idempotency tests.
- Per-entity conflict rule tests with synthetic remote/local operations.
- Optional local loopback sync simulation.

Must prove:

- Applying the same operation twice is safe.
- Sessions and forge history merge by ID.
- Counter operations do not use blind last-write-wins.

Remote sync should only start after this phase. Otherwise sync will force rewrites across persistence, commands, and counters.

## First Vertical Slice Acceptance

The first production slice must prove architecture and product feel together:

| Requirement | Proof |
|-------------|-------|
| Simulation independent | Unit tests import only `domain`, `content`, and `simulation` |
| Renderer is adapter | Pixi scene can be disabled while commands, persistence, and UI state still work |
| Persistence is durable | Reload after every key command preserves records and operation log |
| Sync-ready writes | Every durable command emits at least one operation with stable ID/client/sequence |
| Generator is protected | Starting a Cell session is available from first screen with no module-board detour |
| Core alternation works | Focus creates Core Charge; rejuvenation consumes it into Integration and Tokens |
| Visual event path works | Current/Bloom/Core/token animations come from simulation-emitted events |
| Migration path exists | At least one migration fixture passes before more systems are built |
| Accessibility exists | Canvas selection is mirrored in semantic React panels and controls |

## Scalability Considerations

| Concern | At 100 users / local records | At 10K records | At 1M records |
|---------|------------------------------|----------------|---------------|
| Simulation | Snapshot commands in memory | Load command-specific subsets; avoid full scans | Incremental/materialized aggregates required |
| Sessions | Append and query recent history | Indexed by `cellId`, `startedAt`, `type` | Archive/summary tables; paginated history |
| Visual events | Play all meaningful events | Aggregate tiny packets | Summary animations only |
| Rendering | Simple Pixi containers | Culling and batched static geometry | Level-of-detail and viewport-only scene reconciliation |
| Migrations | Fast full migration | Progress UI and repair logs | Chunked migrations and backup-before-upgrade |
| Operation log | Keep all | Compact acknowledged/no-op local ops after backup | Checkpoints/snapshots plus retained critical history |
| Sync | Not implemented | Loopback/backup sync viable | Server-side operation application and semantic conflict handling |

## Research Flags For Roadmap

- Renderer integration needs a spike before heavy UI investment: PixiJS 8 async app setup, React lifecycle cleanup, resize behavior, hit testing, and accessibility overlays should be proven on desktop and mobile.
- Dexie schema design should be finalized before feature work creates many record types. Changing store keys later is possible but migration-heavy.
- Offline/passive production needs separate economy design. It should be bounded, aggregate, and testable, not a replay of every missed second.
- Future remote sync needs a dedicated phase. The MVP should emit operations, but not pretend that a remote transport/conflict service is solved.
- Module effect registry needs deeper design before advanced modules. The starter modules can be hand-coded; generalized patch/effect logic should wait until the vertical slice proves the loop.

## Sources

- Flowgrid project context: `.planning/PROJECT.md`, `docs/gameplay-spine-draft.md`, `docs/technical-vision-draft.md`
- PixiJS Application docs: https://pixijs.com/8.x/guides/components/application
- PixiJS Ticker docs: https://pixijs.com/8.x/guides/components/ticker
- PixiJS Render Loop docs: https://pixijs.com/8.x/guides/concepts/render-loop
- PixiJS Performance Tips: https://pixijs.com/8.x/guides/concepts/performance-tips
- PixiJS Accessibility docs: https://pixijs.com/8.x/guides/components/accessibility
- Dexie `Version.stores()` docs: https://dexie.org/docs/Version/Version.stores()
- Dexie `Version.upgrade()` docs: https://dexie.org/docs/Version/Version.upgrade()
- `idb` `openDB` README: https://github.com/jakearchibald/idb#opendb
- MDN IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN storage quotas and eviction criteria: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- Local-first software paper: https://martin.kleppmann.com/papers/local-first.pdf
- Fixed timestep reference: https://gafferongames.com/post/fix_your_timestep/

