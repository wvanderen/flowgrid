# Flowgrid — Gameplay Spine v0.4

## 1. Core identity

Flowgrid is a modular focus game where real effort powers a programmable hex lattice of attention.

The user creates **Cells** for life domains:

```txt
Music
Fitness
Writing
Home
Rest
Study
Social
```

Each Cell contains **Modules**. Modules are both interface elements and gameplay components. They start sessions, track tasks, store Charge, trigger Blooms, route Current, protect Momentum, and produce Energy.

The whole system is the **Flowgrid**.

The Core sits at the center.

The design promise:

```txt
do real things
fire modules
move Current
store Charge
produce Energy
earn Modules
build better Cells
```

The emotional promise:

```txt
tap to start
partial effort counts
return is powerful
rest matters
attention becomes structure
```

---

# 2. Core terminology

## Flowgrid

The full system: the hex lattice, Cells, Core, routes, modules, progression, history, and long-tail systems.

## Cell

A life-domain unit on the Flowgrid.

Old concept:

```txt
Sphere
```

New concept:

```txt
Cell
```

A Cell is not just a node. It is a container for modules and history.

Example:

```txt
Music Cell
Writing Cell
Rest Cell
```

## Module

A functional component installed inside a Cell or, later, the Core.

Modules replace the old idea of glyphs, input modes, and charge modules.

A Module can be:

```txt
a timer
a start button
a checklist
a bloom trigger
a capacitor
a relay
a converter
a recovery engine
a signal processor
a route socket
```

Modules are the main customization/reward objects.

## Core

The global hub.

The Core receives Current from Cells and decides whether to:

```txt
convert Current into Energy
or
store Current as Core Charge
```

The Core is also the home of Core Power, global upgrades, integration/rejuvenation, and eventual prestige.

## Current

Moving signal.

Current flows through modules, patches, routes, Cells, and the Core.

## Charge

Stored signal.

Charge can live in Cells, modules, or the Core.

## Energy

Spendable output currency.

Energy buys upgrades, module forge rolls, routes, Cell expansion, Core Power, and long-tail systems.

## Module Token

A discrete reward used for Module Forge rolls or improved forge outcomes.

Tokens are not a normal scaling currency. They are milestone/reward objects.

## Momentum

A Cell’s consistency pressure.

Momentum affects generation, recovery, Activation, and module efficiency, but should remain forgiving.

## Bloom

A milestone completion event.

Bloom creates signal, rewards completion, and triggers Activation.

## Activation

A persistent daily state.

Default:

```txt
Cell milestone complete -> Bloom -> Cell Activated until local day reset
```

Activation changes module behavior for the day.

## Memory

Future prestige inheritance.

Memory is what remains after the Core resets.

---

# 3. The new hierarchy

```txt
Flowgrid
  Core
    Energy
    Core Charge
    Core Power
    Integration
    Module Tokens
    Prestige / Memory later

  Cells
    Modules
    Internal patches
    Cell Charge
    Momentum
    Milestones
    Activation
    Cell XP
    Cell history

  Routes
    Cell -> Cell
    Cell -> Core
    Core -> maybe later outputs

  Module Forge
    Energy rolls
    Token rolls
    boosted rolls

  Inventory
    Modules
    module variants
    upgrades
    duplicates / fusion later
```

---

# 4. Hexagon model

Hexagons should be the primary visual geometry.

Reasons:

```txt
Cells
lattice
adjacency
growth
modularity
signal paths
mathematical clarity
```

The global Flowgrid is a hex arrangement of Cells around the Core.

Each Cell can open into an internal module board.

The visual model:

```txt
Home view:
  hex Cells connected on a Flowgrid

Cell view:
  selected Cell opens into its module layout
```

A Cell may appear compact on the global view and expand into a module board when inspected.

---

# 5. Core loop

## Daily loop

```txt
1. User opens Flowgrid.
2. User taps a Cell.
3. The Cell’s Generator Module starts the active session.
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

## Strategic loop

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

## Long-tail loop

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

---

# 6. Default Cell

A new Cell should work immediately.

Starter Cell:

```txt
[Generator] -> [Charge Core] -> [Output]
      |
   [Bloom]
```

## Starter Modules

### Generator Module

The main start/session module.

UI role:

```txt
Start button / timer
```

Gameplay role:

```txt
focused time -> Current
```

The Generator is sacred. It must always be easy to use.

### Charge Core Module

Stores Current as Cell Charge.

```txt
Current -> Charge
```

### Output Module

Routes Current outward.

```txt
Charge / Current -> external route
```

### Bloom Module

Tracks the daily milestone.

```txt
milestone complete -> Bloom -> Activation
```

---

# 7. Modules as UI

Flowgrid’s key design move:

```txt
The UI is made of modules.
Modules are gameplay.
```

Examples:

## Generator Module

Starts a session and produces Current.

## Task Module

Shows a checklist. Checking off items emits Current bursts.

## Count Module

Tracks reps, sets, pages, attempts, or iterations. Each count can emit a pulse.

## Bloom Module

Shows milestone progress and fires when complete.

## Reflection Module

Captures a session note and can trigger Anchor/Memory effects.

## Route Socket Module

Shows outgoing Current and route behavior.

## Capacitor Module

Stores Charge and releases it under conditions.

## Relay Module

Moves Current efficiently.

## Converter Module

Turns Current or Charge into Energy.

This makes the interface symbolic of how the user deploys time and attention.

---

# 8. Cell XP and progression

Cell XP remains local and grounded.

```txt
1 focused minute in a Cell = 1 Cell XP
```

Cell XP should not primarily unlock global module families.

That was a previous idea; v0.4 corrects it.

## Cell XP unlocks local identity and capacity

Cell XP / Cell levels can unlock:

```txt
more module cells
more installed module slots
more internal patch capacity
more external route ports
Cell-specific upgrades
Cell milestone improvements
Activation improvements
special local sockets
Module Tokens at level milestones
Cell identity bonuses
```

## Global systems unlock module families

Module families should mostly unlock through:

```txt
Core Power
Energy upgrades
Module Forge tiers
global achievements
prestige Memory later
special Core modules
```

This preserves creative freedom.

A user should not be blocked from using a module family globally just because the “wrong” Cell earned XP.

---

# 9. Module Forge

The Module Forge replaces the Glyph Forge.

Core interaction:

```txt
Spend Energy or Module Token -> reveal 3 Modules -> choose 1
```

Module rewards may include:

```txt
new Module
module variant
module upgrade
duplicate / fusion material
port upgrade
patch type
special socket
rare Core module
prestige fragment later
```

## Energy rolls

Energy rolls are the normal scalable forge path.

They can have escalating cost.

## Module Token rolls

Module Tokens provide discrete reward rolls.

They do not scale in price like Energy rolls.

A Module Token can be used for:

```txt
free forge roll
rarity boost
extra choice
targeted module family
special pool
```

Recommended early model:

```txt
1 Token = free choose-one-of-three Module roll
2 Tokens = choose-one-of-four or improved rarity odds
3 Tokens = boosted rarity / focused family roll
```

Tokens should increase agency, not just gambling intensity.

---

# 10. Core dual-output system

The Core receives Current.

Incoming Current can be allocated between two outputs:

```txt
Convert -> Energy
Store -> Core Charge
```

This is now a central strategic system.

## Energy path

```txt
Incoming Current -> Energy
```

Energy is immediate spendable growth.

## Core Charge path

```txt
Incoming Current -> Core Charge
```

Core Charge is stored integration potential.

Core Charge is later processed through rejuvenation to generate Module Tokens.

This creates a real tradeoff:

```txt
Convert now for upgrades?
Store for integration and future module rewards?
```

---

# 11. Rejuvenation and Integration

Rest/recovery should not be a side feature. It is part of the signal economy.

Core idea:

```txt
activity creates signal
the Core stores some signal as Core Charge
rejuvenation integrates Core Charge
integration produces Module Tokens
```

## Integration loop

```txt
1. Active Cells send Current to the Core.
2. Some Current becomes Core Charge.
3. User logs rejuvenation / rest / break time.
4. Rejuvenation processes Core Charge into Integration progress.
5. Integration thresholds grant Module Tokens.
```

## Why this works

It rewards alternation:

```txt
activity -> charge
rest -> integration
integration -> new modules
```

It avoids pure rest farming because rest needs Core Charge to process.

No activity means little or no Core Charge.

No rejuvenation means Core Charge remains unintegrated.

## Core Rejuvenation Module

The Core can have a special module:

```txt
Integration Core
```

or:

```txt
Rejuvenation Core
```

Recommended name:

```txt
Integration Core
```

Function:

```txt
Rejuvenation sessions process Core Charge into Integration.
Integration thresholds grant Module Tokens.
```

Example formula shape:

```txt
processedCoreCharge = min(coreCharge, rejuvenationMinutes * processingRate)
integration += processedCoreCharge
coreCharge -= processedCoreCharge
```

Then:

```txt
when integration >= nextTokenThreshold:
  grant 1 Module Token
  nextTokenThreshold scales upward
```

Example placeholder values:

```txt
processingRate = 5 Core Charge / rejuvenation minute
firstTokenThreshold = 100 Integration
thresholdGrowth = 1.6
```

Numbers are tunable.

The design principle is more important than the exact formula.

---

# 12. Alternation as core gameplay

Flowgrid should reward cycles, not endless productivity.

Healthy loop:

```txt
focus
generate Current
route to Core
store some Core Charge
take rejuvenation time
integrate Core Charge
earn Module Tokens
install new Modules
return stronger
```

This gives recovery a meaningful mechanical role.

It also creates optimization choices:

## Energy-heavy strategy

```txt
Convert most Current to Energy.
Buy upgrades faster.
Generate fewer Module Tokens.
```

## Integration-heavy strategy

```txt
Store more Current as Core Charge.
Use rejuvenation to earn more Module Tokens.
Expand module options faster.
```

## Balanced strategy

```txt
Convert enough for upgrades.
Store enough to make rest meaningful.
```

This is emotionally aligned with the product.

---

# 13. Module categories

## Action Modules

Connected to real actions.

Examples:

```txt
Generator
Task
Count
Reflection
Recovery
Ritual Selector
```

## Signal Modules

Process Current.

Examples:

```txt
Relay
Amplifier
Splitter
Gate
Delay
Capacitor
Converter
Echo
Sequencer
```

## State Modules

Interact with Momentum, Bloom, Activation, and recovery.

Examples:

```txt
Bloom
Activation Relay
Anchor
Return Spark
Momentum Shield
Resilience
Streak Chain
```

## Economy Modules

Affect Energy, tokens, forge, scaling, or prestige.

Examples:

```txt
Local Converter
Energy Lens
Integration Core
Memory Condenser
Forge Resonator
```

Economy modules require careful balancing.

## Interface Modules

Normal app controls with mechanical meaning.

Examples:

```txt
Timer Face
Checklist Face
Milestone Dial
Route Socket
Session Note
```

---

# 14. Activation in v0.4

Activation is a Cell state that changes module behavior.

Default:

```txt
milestone complete -> Bloom -> Cell Activated until local day reset
```

Activated modules may:

```txt
generate more Current
consume less Charge
gain extra outputs
route more efficiently
copy pulses
protect Momentum
improve conversion
boost task bursts
alter Bloom behavior
```

Activation is not just a flat buff. It should be module-aware.

Example:

```txt
Generator while Activated:
+10% Current from focus time

Task while Activated:
completed tasks emit +2v

Relay while Activated:
routing loss reduced

Anchor while Activated:
protection can affect connected Cells
```

Activation should feel valuable but not mandatory.

---

# 15. Bloom in v0.4

Bloom is handled by the Bloom Module.

When the daily milestone completes:

```txt
Bloom fires
Bloom Current is created
Momentum increases
Cell activates
Bloom-compatible modules may trigger
```

Bloom can be patched internally:

```txt
Bloom -> Capacitor
Bloom -> Output
Bloom -> Activation Relay
Bloom -> Resonance
```

This makes milestone completion part of the modular system.

---

# 16. Paths in v0.4

Paths remain useful, but they should not be the primary source of global module unlocks.

Paths are local Cell development tracks.

They improve local module behavior, Cell capacity, and identity.

## Flow Path

Improves routing, outputs, route efficiency, relay modules, splitters.

## Charge Path

Improves storage, capacitors, Charge capacity, Charge efficiency, threshold release.

## Bloom Path

Improves milestone bursts, Activation, Bloom module outputs, completion triggers.

## Anchor Path

Improves recovery, Momentum protection, decay resistance, return behavior.

## Spark Path

Future: session start, first minutes, short sessions, ignition bursts.

## Echo Path

Future: copied pulses, resonance, neighbor effects, activation spread.

## Archive Path

Future: Memory, prestige persistence, history, inheritance.

---

# 17. Energy and scaling

Energy is the main scaling currency.

Energy is generated by:

```txt
Core conversion
converter modules
Bloom conversion
economy modules
prestige systems later
```

Energy is spent on:

```txt
Core Power
Module Forge rolls
Cell expansion
module upgrades
route upgrades
inventory capacity
special sockets
automation
prestige unlocks
```

Energy can scale to very high numbers.

This supports the incremental long tail.

---

# 18. Prestige

Prestige resets the Core cycle, not the user’s life.

Fantasy:

```txt
The Core collapses and reforms.
The Cells remember.
```

Resets:

```txt
Core Power level
current Energy
some Core upgrades
global multipliers
cycle-specific unlocks
possibly Core Charge / Integration
```

Persists:

```txt
Cells
Cell names
Cell XP/history
modules
module inventory
module forge count
Cell layouts maybe with rules
milestone history
lifetime stats
Memory
prestige count
```

Strong rule:

```txt
Module Forge count does not reset.
```

Reason:

```txt
Resetting forge count would incentivize cheap module farming.
```

Memory can unlock:

```txt
prestige module families
permanent module slots
preserved Cell layouts
Core inheritance
route templates
Archive modules
deeper Cell expansion
```

---

# 19. UI implications

The UI should now have four major surfaces.

## 1. Flowgrid Home

Shows:

```txt
hex Cells
Core
routes
Current flow
Cell Charge
Activation
Energy rate
Module Tokens
selected Cell quick panel
```

Important header values:

```txt
Energy
Energy generation rate
Module Tokens
```

Core Power can appear in the Core itself, not necessarily the header.

## 2. Cell Board

Shows:

```txt
modules
ports
patches
Cell Charge
internal Current
Generator module
Bloom module
Output module
installed rewards
```

This is the real identity screen.

## 3. Core View

Shows:

```txt
Energy
Current-to-Energy conversion
Core Charge
convert/store allocation
Integration Core
rejuvenation processing
Module Token thresholds
Core Power
```

## 4. Module Forge

Shows:

```txt
Energy roll
Token roll
boosted token roll
three choices
module inventory
rarity
install target
```

---

# 20. Technical direction

Flowgrid should be designed as a production-ready local-first systems app.

## Architecture principles

```txt
Simulation is separate from rendering.
Rendering is separate from persistence.
Persistence is local-first and sync-ready.
Animations visualize emitted events.
Economy logic is deterministic and testable.
Sessions are append-only history.
Module graph logic is pure TypeScript.
```

## Recommended long-term stack direction

Normal app UI:

```txt
React, Svelte, Solid, or similar component framework
```

Visualization layer:

```txt
2D Canvas/WebGL
PixiJS or a focused custom renderer
```

Persistence:

```txt
IndexedDB with migrations
```

Sync:

```txt
operation queue / event-log-friendly local-first sync
```

Domain logic:

```txt
pure TypeScript simulation engine
```

## Why PixiJS / Canvas-WebGL

Flowgrid will need:

```txt
hex Cells
animated Current trails
packet animation
Bloom bursts
Core charge ripples
smooth route lines
module board pan/zoom
shader-like flat glow
large-number visual updates
```

DOM-only will become limiting.

But forms, inspectors, lists, settings, and text-heavy panels should remain normal app UI.

Do not build the whole app inside canvas.

---

# 21. Simulation model

Core simulation should be deterministic.

Example shape:

```txt
simulateFlow(state, elapsedMs) -> {
  nextState,
  economyEvents,
  visualEvents
}
```

Economy events affect durable state.

Visual events animate what happened.

Example visual event:

```txt
CurrentMoved {
  from: moduleA,
  to: moduleB,
  amount: 12,
  durationMs: 800
}
```

The renderer animates it.

The simulation owns the truth.

---

# 22. Persistence and sync model

Use durable records rather than one giant blob.

Likely stores:

```txt
cells
modules
installedModules
patches
routes
sessions
tasks
core
forgeHistory
events
syncQueue
settings
```

Sync should use operations:

```txt
SessionCompleted
TaskChecked
ModuleInstalled
ModuleMoved
PatchChanged
RouteChanged
ForgeRolled
CorePowerPurchased
RejuvenationLogged
PrestigePerformed
```

Sessions should be append-only.

Cell/module layout conflicts can start with last-write-wins, then become more sophisticated later if needed.

---

# 23. First implementation slice

Do not build the whole system immediately.

Build a vertical slice that proves the new identity.

## Include

```txt
Flowgrid Home with hex Cells
Core
Cells replacing Spheres
Generator Module
Charge Core Module
Output Module
Bloom Module
Current routing to Core
Energy conversion
Core Charge storage
simple convert/store allocation
Rejuvenation logging
Integration progress
Module Tokens
Module Forge stub
```

## Defer

```txt
full patch editor
advanced module graph logic
module fusion
prestige
Memory
complex rarity
advanced animation editor
multi-device sync implementation
advanced conflict resolution
Core modules beyond Integration Core
```

The first goal:

```txt
prove that Cells + Modules + Core alternation feels good
```

---

# 24. North-star summary

Flowgrid v0.4:

```txt
The whole board is the Flowgrid.
Life domains are Cells.
Cells contain Modules.
Modules are both UI and mechanics.
Real effort fires Generator and Action Modules.
Current flows through Cells and routes.
Charge stores signal.
The Core converts Current into Energy or stores it as Core Charge.
Energy buys upgrades and forge rolls.
Core Charge is integrated through rejuvenation.
Integration grants Module Tokens.
Module Tokens create new module choices.
Activation changes module behavior for the day.
Bloom is the milestone event that activates a Cell.
Cell XP grows local capacity and identity.
Global progression unlocks module families.
Prestige eventually resets the Core while Cells, Modules, forge history, Memory, and real history persist.
```

The design has become:

```txt
a modular signal system for building playable structures around attention, action, and recovery
```
