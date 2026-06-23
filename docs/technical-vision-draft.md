# Flowgrid — Technical Architecture v0.1

## 1. Architecture goal

Flowgrid should be built as a production-ready local-first systems app, not just a prototype UI.

The app needs to support:

```txt
fast daily use
beautiful animated hex-grid visuals
deterministic module simulation
local-first persistence
future multi-device sync
long-lived user history
incremental-game scale
safe migrations
testable game logic
```

The architecture should protect the core interaction:

```txt
open app -> tap Cell -> start session
```

while leaving room for:

```txt
Cells
Modules
Patches
Routes
Current
Charge
Energy
Core Charge
Integration
Module Tokens
Module Forge
Activation
Bloom
Prestige
Sync
```

The central rule:

```txt
Simulation owns truth.
Renderer shows motion.
Persistence stores durable records.
Sync moves operations.
UI configures and inspects state.
```

---

# 2. Recommended stack direction

## App UI

Use a normal app UI framework for screens, panels, forms, inspectors, settings, and text-heavy UI.

Good candidates:

```txt
React
Svelte
Solid
```

Recommendation:

```txt
React + TypeScript is the safest ecosystem choice.
Svelte or Solid may feel lighter and more elegant.
```

If the goal is shipping with strong ecosystem support, React is probably the pragmatic default.

If the goal is maximal elegance and less boilerplate, Svelte is attractive.

Either way, do not build every screen inside Canvas/WebGL.

---

## Flowgrid visualization

Use a dedicated 2D rendering layer for the main Flowgrid and module-board visuals.

Recommended direction:

```txt
PixiJS or focused Canvas/WebGL renderer
```

Why:

```txt
hex Cells
smooth Current trails
animated packets
shader-like glows
Bloom bursts
Core ripples
pan/zoom module boards
high-performance route animation
large dynamic graphs
```

DOM/SVG can work for early prototypes, but the long-term aesthetic wants a real 2D visual engine.

Recommendation:

```txt
Normal UI framework for app shell.
PixiJS / Canvas-WebGL for Flowgrid visualization.
Shared state/selectors between them.
```

---

## Domain/game logic

Use pure TypeScript.

The simulation should not depend on DOM, Pixi, React, browser APIs, or persistence APIs.

```txt
input: durable state + command/event + elapsed time
output: next durable state + economy events + visual events
```

This makes the system testable and portable.

---

## Persistence

Use IndexedDB for durable local-first storage.

Avoid one giant localStorage blob for production.

Recommended abstraction:

```txt
Repository layer over IndexedDB
```

Possible libraries later:

```txt
Dexie
idb
custom thin wrapper
```

The app should treat persistence as an adapter, not as part of game logic.

---

## Sync

Design now for future sync, even if sync is not implemented immediately.

Use:

```txt
operation queue
append-friendly event records
stable IDs
updatedAt timestamps
schema migrations
conflict rules by entity type
```

Do not rely on blind whole-state replacement.

---

# 3. Layered architecture

Recommended source layout:

```txt
src/
  app/
    App.tsx
    routes.tsx
    state/
      store.ts
      commands.ts
      selectors.ts

  domain/
    types.ts
    ids.ts
    constants.ts
    invariants.ts
    time.ts

  simulation/
    engine.ts
    cells.ts
    modules.ts
    patches.ts
    routes.ts
    core.ts
    rewards.ts
    forge.ts
    progression.ts
    prestige.ts
    visual-events.ts
    selectors.ts

  persistence/
    db.ts
    schema.ts
    migrations.ts
    repositories/
      cells.ts
      modules.ts
      sessions.ts
      events.ts
      syncQueue.ts
    backup.ts

  sync/
    operations.ts
    queue.ts
    conflict.ts
    client.ts

  render/
    flowgrid/
      FlowgridCanvas.ts
      scene.ts
      camera.ts
      hex-layout.ts
      cells.ts
      routes.ts
      particles.ts
      shaders.ts
      animation.ts
    module-board/
      ModuleBoardCanvas.ts
      module-layout.ts
      patches.ts
      ports.ts

  ui/
    components/
      panels/
      buttons/
      cards/
      forms/
      modals/
    views/
      LatticeHome.tsx
      CellInspector.tsx
      CellBoard.tsx
      CoreView.tsx
      ModuleForge.tsx
      HistoryView.tsx
      SettingsView.tsx

  tests/
    factories.ts
    assertions.ts
    simulation/
    persistence/
    sync/
```

The exact folder names can change, but the boundaries matter.

---

# 4. Dependency rules

Allowed direction:

```txt
ui -> app -> simulation -> domain
render -> simulation selectors / visual events
persistence -> domain
app -> persistence
sync -> persistence/domain
```

Rules:

```txt
domain imports nothing app-specific
simulation does not import UI, Pixi, React, or IndexedDB
render does not calculate economy
ui does not calculate module effects
persistence does not run game commands
sync does not mutate UI state directly
```

When a dependency feels awkward, add:

```txt
selector
command
domain type
adapter
```

Do not cross layers casually.

---

# 5. Core domain model

## AppState

Top-level durable state.

```ts
type AppState = {
  version: number;
  cells: Record<CellId, Cell>;
  modules: Record<ModuleInstanceId, ModuleInstance>;
  moduleDefinitionsVersion: string;
  patches: Record<PatchId, Patch>;
  routes: Record<RouteId, Route>;
  sessions: Record<SessionId, Session>;
  tasks: Record<TaskId, Task>;
  core: CoreState;
  forge: ForgeState;
  inventory: ModuleInventory;
  activeSession?: ActiveSession;
  settings: UserSettings;
};
```

Eventually, this should be stored as records, not as a single blob.

---

## Cell

A Cell is a life-domain node on the Flowgrid.

```ts
type Cell = {
  id: CellId;
  name: string;
  color: string;
  icon?: string;

  xp: number;
  level: number;
  cellPointsEarned: number;
  cellPointsSpent: number;

  momentum: number;
  charge: number;
  maxCharge: number;

  dailyTargetSeconds: number;
  dailyProgressSeconds: number;
  milestoneCompletedDate?: LocalDateString;
  activatedUntil?: IsoDateTimeString;

  moduleSlots: ModuleSlot[];
  installedModuleIds: ModuleInstanceId[];

  routePortCount: number;
  internalPatchLimit: number;

  archivedAt?: IsoDateTimeString;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
};
```

---

## ModuleDefinition

A module definition describes a module type.

Definitions are static/game-content data.

```ts
type ModuleDefinition = {
  id: ModuleDefinitionId;
  name: string;
  family: ModuleFamily;
  rarity: ModuleRarity;
  description: string;

  ports: ModulePortDefinition[];
  triggers: ModuleTriggerDefinition[];
  effects: ModuleEffectDefinition[];

  installRules: ModuleInstallRule[];
  upgradeRules?: ModuleUpgradeRule[];

  tags: ModuleTag[];
};
```

Example families:

```ts
type ModuleFamily =
  | "action"
  | "signal"
  | "state"
  | "economy"
  | "interface"
  | "core"
  | "prestige";
```

---

## ModuleInstance

A module instance is a specific module the user owns or has installed.

```ts
type ModuleInstance = {
  id: ModuleInstanceId;
  definitionId: ModuleDefinitionId;

  ownerCellId?: CellId;
  installedSlotId?: ModuleSlotId;

  level: number;
  variant?: string;

  state: ModuleRuntimeState;

  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
};
```

Important distinction:

```txt
ModuleDefinition = what this module type is
ModuleInstance = this owned copy of that module
```

---

## Patch

Internal connection between modules inside one Cell.

```ts
type Patch = {
  id: PatchId;
  cellId: CellId;

  fromModuleId: ModuleInstanceId;
  fromPortId: PortId;

  toModuleId: ModuleInstanceId;
  toPortId: PortId;

  enabled: boolean;

  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
};
```

---

## Route

External connection between Cells and/or Core.

```ts
type Route = {
  id: RouteId;

  from: RouteEndpoint;
  to: RouteEndpoint;

  enabled: boolean;
  allocationPercent: number;

  level: number;
  throughputMultiplier: number;
  currentLoss: number;

  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
};

type RouteEndpoint =
  | { type: "cell"; cellId: CellId; portId?: PortId }
  | { type: "core"; portId?: PortId };
```

---

## CoreState

The Core handles Energy, Core Charge, Integration, Tokens, and Core Power.

```ts
type CoreState = {
  energy: number;
  lifetimeEnergy: number;

  coreCharge: number;
  maxCoreCharge: number;

  convertAllocationPercent: number;
  storeAllocationPercent: number;

  integration: number;
  nextModuleTokenThreshold: number;
  moduleTokens: number;

  corePowerLevel: number;
  corePowerPurchases: CorePowerPurchase[];

  prestigeCount: number;
  memory: number;

  lastPassiveTickAt: IsoDateTimeString;

  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
};
```

Rule:

```txt
convertAllocationPercent + storeAllocationPercent = 100
```

---

## Session

Sessions are append-only real history.

```ts
type Session = {
  id: SessionId;
  cellId: CellId;
  ritualId?: RitualId;

  type: "focus" | "rejuvenation" | "manual" | "task";
  startedAt: IsoDateTimeString;
  endedAt: IsoDateTimeString;
  durationSeconds: number;

  xpGained: number;
  currentGenerated: number;
  energyProduced: number;
  coreChargeProduced: number;

  milestoneCompleted: boolean;
  activatedCell: boolean;

  createdAt: IsoDateTimeString;
};
```

Completed sessions should not be mutated casually. Corrections should be explicit adjustment records later.

---

# 6. Command model

Most user actions should become commands.

Commands call simulation/domain functions and then persist results.

Examples:

```ts
createCell(input)
archiveCell(cellId)
startSession(cellId, ritualId?)
finishSession(activeSessionId)
logRejuvenationSession(input)

installModule(cellId, moduleInstanceId, slotId)
moveModule(moduleInstanceId, targetSlotId)
removeModule(moduleInstanceId)
createPatch(input)
removePatch(patchId)

createRoute(input)
updateRouteAllocation(routeId, percent)
toggleRoute(routeId)

runForgeWithEnergy()
runForgeWithToken(options)
chooseForgeReward(rewardId)

purchaseCorePower()
setCoreAllocation(convertPercent, storePercent)
```

Command output should include:

```ts
type CommandResult = {
  state: AppState;
  economyEvents: EconomyEvent[];
  visualEvents: VisualEvent[];
  syncOperations: SyncOperation[];
};
```

---

# 7. Simulation model

The simulation engine should be deterministic.

## Main function

```ts
simulate(state, input): SimulationResult
```

Possible input types:

```ts
type SimulationInput =
  | { type: "finish_session"; session: SessionDraft }
  | { type: "tick"; elapsedMs: number; now: string }
  | { type: "route_current"; elapsedMs: number; now: string }
  | { type: "process_rejuvenation"; session: SessionDraft }
  | { type: "forge"; payment: ForgePayment }
  | { type: "install_module"; input: InstallModuleInput };
```

Result:

```ts
type SimulationResult = {
  nextState: AppState;
  economyEvents: EconomyEvent[];
  visualEvents: VisualEvent[];
};
```

---

## Tick simulation

Ticks should process:

```txt
passive Current generation
module burn effects
route movement
Core conversion/storage
Integration processing if active
cooldowns
threshold triggers
```

Avoid same-tick infinite loops.

Use deterministic ordering.

Example order:

```txt
1. generate passive Current
2. process active session projections if needed
3. process internal module patches
4. process route outputs
5. process Core conversion/storage
6. process threshold triggers
7. emit visual events
8. validate invariants
```

---

## Event safety

Any system that can trigger other systems needs guardrails.

Rules:

```txt
no unbounded same-tick recursion
threshold triggers have cooldown or consume state
route movement is capped
module effects are deterministic
randomness is injected explicitly
```

Forge randomness should accept a seeded random source for testability.

---

# 8. Visual event system

The simulation should emit visual events for animation.

The renderer should not infer important economic facts by itself.

Examples:

```ts
type VisualEvent =
  | {
      type: "current_moved";
      from: VisualEndpoint;
      to: VisualEndpoint;
      amount: number;
      durationMs: number;
      tags: VisualTag[];
    }
  | {
      type: "cell_bloomed";
      cellId: CellId;
      amount: number;
    }
  | {
      type: "cell_activated";
      cellId: CellId;
      until: string;
    }
  | {
      type: "core_converted";
      currentAmount: number;
      energyAmount: number;
    }
  | {
      type: "core_charge_stored";
      amount: number;
    }
  | {
      type: "module_token_granted";
      count: number;
    };
```

Visual events are transient.

Durable state still lives in IndexedDB/domain state.

---

# 9. Rendering architecture

## App shell

Normal UI framework renders:

```txt
navigation
headers
bottom sheets
inspectors
forms
module cards
forge choices
settings
history
text-heavy details
```

## Flowgrid renderer

Canvas/WebGL renders:

```txt
hex Cell lattice
Core
routes
Current trails
packets
Activation auras
Bloom bursts
Charge fills
shader-like glows
```

## Module board renderer

Canvas/WebGL or hybrid UI renders:

```txt
Cell internal module board
modules
ports
patches
internal Current flow
module activation
Charge burn
```

For the module board, a hybrid approach may work:

```txt
Canvas/WebGL background for patches/particles
DOM/SVG/HTML cards for modules
```

This makes text and controls easier while preserving beautiful animated flow.

---

# 10. State management

Use a single app-level state container that coordinates:

```txt
loaded durable state
derived selectors
pending visual events
current UI selection
active panel
local unsaved UI edits
```

Keep UI view state separate from persisted domain state.

Examples of UI-only state:

```txt
selectedCellId
selectedModuleId
camera position
open panel
hovered route
draft patch being drawn
```

Persist only what matters to the product model.

---

# 11. Selectors

Selectors should derive display-ready information from durable state.

Examples:

```ts
selectCellSummary(state, cellId)
selectFlowgridLayout(state)
selectCoreEconomy(state)
selectEnergyRate(state)
selectCellActivationState(state, cellId)
selectModuleBoard(state, cellId)
selectAvailableForgePayments(state)
selectHistorySummary(state, range)
```

UI should not manually compute game rules.

It should ask selectors.

---

# 12. Persistence architecture

## IndexedDB stores

Likely stores:

```txt
metadata
cells
moduleDefinitions
moduleInstances
patches
routes
sessions
tasks
rituals
core
forgeHistory
events
syncQueue
settings
```

## Migrations

Every persisted schema change gets a migration.

Migration rules:

```txt
never silently change record shape
preserve stable IDs
preserve sessions
repair invalid references where possible
log migration issues
validate after migration
```

## Backup

Backup/export should use the same schema and migration path as normal load.

Do not create a separate backup-only format that drifts from app state.

---

# 13. Sync architecture

Sync can be deferred, but the architecture should prepare for it.

## Operation queue

Every durable mutation can enqueue an operation:

```ts
type SyncOperation = {
  id: SyncOperationId;
  entityType: SyncEntityType;
  entityId: string;
  op: "put" | "delete" | "append" | "adjust";
  payload: unknown;
  status: "pending" | "in_flight" | "acked" | "failed";
  attempts: number;
  createdAt: string;
  updatedAt: string;
};
```

## Conflict strategy by entity

### Sessions

```txt
append-only
merge by id
never delete completed history casually
```

### Cells

```txt
last-write-wins for editable fields at first
```

### Module layouts

```txt
last-write-wins at first
future: layout operation merge
```

### Patches/routes

```txt
last-write-wins or operation merge
```

### Core counters

Do not blindly last-write-win Energy, Core Charge, Integration, or Tokens.

Prefer:

```txt
server-applied operations
or
reconciliation from event history
```

### Forge history

Append-only.

Forge count should not reset and should be conflict-safe.

---

# 14. Invariants

Add validation early.

```ts
validateAppState(state): ValidationIssue[]
```

Should check:

```txt
no duplicate IDs
all module owner Cell IDs exist
installed modules are not installed twice
patch endpoints exist
patches stay within one Cell
routes have valid endpoints
route allocations normalize correctly
no negative Energy/Charge/XP/Tokens
Core convert/store allocation sums to 100
Cell spent points <= earned points
active session references valid Cell
completed sessions are immutable
archived Cells are not active session targets
forge count never decreases
module token count never negative
```

Tests should use:

```ts
expectValidState(state)
```

after every command.

---

# 15. Testing strategy

Prioritize pure simulation tests.

## High-value test suites

```txt
session completion
Current generation
Bloom and Activation
Core conversion/storage allocation
Rejuvenation -> Integration -> Token thresholds
Module Forge cost and token spending
module installation
patch validation
route allocation
offline/passive tick
prestige later
migrations
sync merge rules
```

## Regression tests

Every economy bug gets a regression test.

Especially:

```txt
infinite loops
negative resources
duplicate module install
forge count reset
token duplication
route allocation drift
offline production exploit
same-tick trigger recursion
```

---

# 16. Animation/performance strategy

The renderer should handle many visual packets without choking.

Rules:

```txt
aggregate tiny packets
do not animate every fractional unit
use visual batching
cap particles
separate economy tick from render frame
interpolate visuals between durable state updates
```

Example:

```txt
simulation tick every 250ms or 1000ms
render at 60fps when active
render slower / pause when backgrounded
```

For offline gains:

```txt
calculate aggregate economy result
show summary animation or compressed packet burst
do not simulate every missed second visually
```

---

# 17. Offline/passive production

Offline production must be bounded and explainable.

Potential model:

```txt
on app resume:
  elapsed = now - lastPassiveTickAt
  cappedElapsed = min(elapsed, offlineCap)
  simulate passive generation and routing in aggregate
  emit summary visual events
```

Keep offline behavior emotionally positive but not dominant.

---

# 18. MVP vertical slice

The first production-minded version should prove the new architecture without building every system.

## Include

```txt
Flowgrid Home with hex Cells
Core node
Cell creation/edit
Generator Module
Charge Core Module
Output Module
Bloom Module
active session
post-session summary
Current generation
Cell Charge
route to Core
Core convert/store allocation
Energy
Core Charge
rejuvenation logging
Integration progress
Module Tokens
Module Forge placeholder
IndexedDB persistence
backup/export
basic validation tests
```

## Defer

```txt
full module patch editor
advanced module inventory
module fusion
prestige
cloud sync
advanced conflict resolution
rare module pools
Core module marketplace
multi-device active session handling
complex shader effects
```

The MVP should prove:

```txt
the concept works
the app is fast
the simulation is testable
the data model can survive
the visual direction is feasible
```

---

# 19. Production risks

## Risk: Canvas app becomes inaccessible

Mitigation:

```txt
use normal UI for text and controls
provide semantic labels
keep important actions outside canvas when possible
mirror selected state in accessible panels
```

## Risk: Simulation gets tangled with animation

Mitigation:

```txt
visual events only
renderer does not own economy
simulation is pure
```

## Risk: Sync becomes impossible later

Mitigation:

```txt
stable IDs
append-only sessions
operation queue
entity records
avoid giant opaque state blobs
```

## Risk: Module system becomes untestable

Mitigation:

```txt
declarative module definitions
pure module effect functions
deterministic trigger order
effect registry
seeded randomness
```

## Risk: Early product becomes too complex

Mitigation:

```txt
default Cell works immediately
hide advanced patching at first
tap-to-start remains primary
module board is optional early
```

---

# 20. Recommended next implementation stance

Do not rewrite everything experimentally again without a stable target.

Use v0.4 as the new product foundation and build the next version around:

```txt
Cells
Modules
Core dual-output
Module Tokens
hex Flowgrid
pure simulation
Canvas/WebGL visualization
IndexedDB persistence
sync-ready operations
```

The prototype can still be small, but the architecture should point toward this future.

North-star technical summary:

```txt
Flowgrid is a local-first TypeScript systems app with a pure simulation engine, a Canvas/WebGL hex-lattice renderer, normal component UI for controls and inspectors, IndexedDB persistence, and an operation-log path to future multi-device sync.
```
