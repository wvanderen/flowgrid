# Phase 3: Playable Generator Flowgrid - Pattern Map

**Mapped:** 2026-06-23
**Files analyzed:** ~45 (12 simulation/domain modifications, ~20 brand-new app/ui/render files, ~10 test files, 5 config files)
**Analogs found:** 17 / 45 with in-repo matches (the rest are brand-new layers with RESEARCH.md patterns)

> **Scope note:** Phases 1 and 2 populated `src/domain`, `src/simulation`, `src/persistence`, `src/content` with strong, established patterns. Phase 3 **extends** those layers (exact analogs exist) and **creates** `src/app`, `src/ui`, `src/render` from scratch (no in-repo analogs — those files fall back to `03-RESEARCH.md` Patterns 1–5). The ESLint boundary rules in `eslint.config.js` lines 31–67 forbid simulation from importing the new layers; the new layers may import inward only.

---

## File Classification

Legend — Match Quality: `exact` (same role + same data flow, copy skeleton), `role-match` (same role, adapt), `pattern-ref` (RESEARCH.md pattern, no in-repo code), `modify-in-place` (the file itself is the analog).

### A. Simulation commands (NEW — all exact analogs)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/simulation/commands/create-cell.ts` | command (service) | CRUD (+ record construction) | `src/simulation/commands/complete-focus-session.ts` + `src/content/starter-state.ts` | exact |
| `src/simulation/commands/edit-cell.ts` | command (service) | request-response (single-record patch) | `src/simulation/commands/set-core-allocation.ts` | exact |
| `src/simulation/commands/archive-cell.ts` | command (service) | request-response (flag flip) | `src/simulation/commands/set-core-allocation.ts` | exact |
| `src/simulation/commands/unarchive-cell.ts` | command (service) | request-response (flag flip) | `src/simulation/commands/set-core-allocation.ts` | exact |
| `src/simulation/commands/start-focus-session.ts` | command (service) | request-response (flag set + operation) | `src/simulation/commands/set-core-allocation.ts` | exact |
| `src/simulation/commands/cancel-focus-session.ts` | command (service) | request-response (**writes nothing durable**) | `src/simulation/commands/not-implemented.ts` (shape) + `set-core-allocation.ts` (structure) | exact |

### B. Simulation system + helpers (NEW)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/simulation/systems/day-rollover.ts` (or `commands/`) | system (transform) | transform (snapshot → snapshot) | `src/simulation/systems/bloom.ts` (pure cell transform) + RESEARCH Pattern 5 | role-match + pattern-ref |
| `src/render/flowgrid/hex-layout.ts` (or `src/simulation/hex/`) | utility (pure math) | transform (coord → pixel) | none in-repo; RESEARCH Pattern 3 (Red Blob axial/cube) | pattern-ref |

### C. Domain + simulation MODIFICATIONS (modify-in-place)

| Modified File | Role | Change | Closest Analog | Match Quality |
|---------------|------|--------|----------------|---------------|
| `src/domain/records.ts` | model | extend `CellRecord` (D-10: `color`, `icon`, `archivedAt`, optionally `activeSessionStartedAt`) | itself (lines 29–42) | modify-in-place |
| `src/domain/result.ts` | model | add 6 command interfaces + extend `SimulationCommand` union (lines 70–75) | itself | modify-in-place |
| `src/simulation/engine.ts` | route (dispatcher) | add 6 cases to exhaustive `switch` (lines 26–37) | itself | modify-in-place |
| `src/simulation/operation-events.ts` | utility | add 6 cases to `entityTypeForCommand` + `entityIdForCommand` (lines 17–45) | itself | modify-in-place |
| `src/simulation/commands/complete-focus-session.ts` | command (service) | D-15 Activation +% Current (modify line 154 region) | itself | modify-in-place |
| `src/simulation/systems/bloom.ts` | system | D-14 Momentum +1 inside `applyBloom` (lines 27–38) | itself | modify-in-place |
| `src/content/formulas.ts` | config | add `ACTIVATION_CURRENT_BONUS_PERCENT` constant | itself (lines 9–25) | modify-in-place |
| `src/persistence/database.ts` | config (migration) | D-10 v1→v2 Dexie migration (append after line 67) | itself + RESEARCH Pattern 4 | modify-in-place |

### D. Tests (NEW + extend)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `tests/simulation/create-cell.test.ts` (+ 5 siblings) | test | request-response | `tests/simulation/foundation-loop.test.ts` + `command-results.test.ts` | exact |
| `tests/simulation/day-rollover.test.ts` | test | transform | `tests/simulation/foundation-loop.test.ts` | exact |
| `tests/simulation/boundaries.test.ts` | test | boundary scan | itself (extend: assert new layers not imported by simulation) | modify-in-place |
| `tests/persistence/migration-harness.test.ts` | test | transform | itself (register real v1→v2 fixtures alongside synthetic ones) | modify-in-place |
| `tests/helpers/fixtures.ts` | test fixture | factory | itself (extend `createStarterFlowgridState` calls + new fields) | modify-in-place |
| `tests/properties/*.test.ts` | test (property) | invariant | existing property tests under `tests/properties/` | exact |
| `tests/ui/**/*.test.tsx`, `tests/app/**/*.test.ts` | test (component) | request-response | none in-repo; RESEARCH Pitfall 3 (happy-dom env) | pattern-ref |

### E. Config (NEW + modify)

| File | Role | Change | Closest Analog | Match Quality |
|------|------|--------|----------------|---------------|
| `tsconfig.json` (+ maybe `tsconfig.app.json`) | config | add `DOM`/`DOM.Iterable` lib, `jsx: "react-jsx"`, include `*.tsx` | itself (RESEARCH Pitfall 4) | modify-in-place |
| `vitest.config.ts` (+ maybe workspace) | config | add happy-dom env for `tests/ui/**` + `tests/app/**` | itself (RESEARCH Pitfall 3) | modify-in-place |
| `vite.config.ts` (NEW) | config | `plugin-react` + `@tailwindcss/vite` | none in-repo; RESEARCH Standard Stack | pattern-ref |
| `index.html` (NEW) | config | Vite entry | none in-repo; Vite requirement (RESEARCH §"Three Wave 0 gaps") | pattern-ref |
| `src/style.css` (NEW) | config | `@import "tailwindcss"` + `@theme` tokens | none in-repo; RESEARCH "State of the Art" | pattern-ref |
| `package.json` | config | add locked deps (RESEARCH install block) | itself | modify-in-place |

### F. App shell (NEW — no in-repo analog; RESEARCH Patterns 1 & 2)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/app/main.tsx` | entry | bootstrap | none in-repo; RESEARCH Pattern 2 | pattern-ref |
| `src/app/App.tsx` | component (root) | request-response | none in-repo; RESEARCH (RouterProvider) | pattern-ref |
| `src/app/routes.tsx` | route | request-response | none in-repo; RESEARCH (createBrowserRouter) | pattern-ref |
| `src/app/store/flowgrid-store.ts` | store | event-driven (snapshot emit) | none in-repo; RESEARCH Pattern 1 (Zustand vanilla) | pattern-ref |
| `src/app/store/dispatch.ts` | service (dispatch) | request-response (UI → sim → repo → store) | none in-repo; RESEARCH Pattern 1 | pattern-ref |
| `src/app/env.ts` | utility (factory) | request-response | `tests/helpers/fixtures.ts::createTestSimulationEnv` (lines 116–125) + `src/simulation/deterministic-env.ts` | role-match |

### G. Renderer (NEW — no in-repo analog; RESEARCH Patterns 2 & 3)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/render/flowgrid/scene.ts` | provider (scene) | event-driven (snapshot + visual events) | none in-repo; RESEARCH Pattern 2 (Pixi v8 async init) | pattern-ref |
| `src/render/flowgrid/hex-layout.ts` | utility | transform | none in-repo; RESEARCH Pattern 3 (Red Blob axial/cube) | pattern-ref |
| `src/render/flowgrid/adapter.ts` | provider (adapter) | event-driven (subscribe store) | none in-repo; RESEARCH Pattern 2 | pattern-ref |

### H. UI components (NEW — no in-repo analog)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/ui/flowgrid-home/*` | component | request-response (mounts Pixi canvas) | none in-repo; RESEARCH Pattern 2 | pattern-ref |
| `src/ui/cell-board/*` | component | request-response (dispatch + selectors) | none in-repo; UI-05 spec | pattern-ref |
| `src/ui/session-summary/*` | component | request-response (read SessionRecord) | none in-repo; SESS-05 content list | pattern-ref |
| `src/ui/shared/*` (error boundary for `PersistenceError`) | component | event-driven (error channel) | `src/persistence/errors.ts` (the contract it renders) | role-match |

---

## Pattern Assignments

### A1. `src/simulation/commands/create-cell.ts` (command, CRUD)

**Analogs:** `src/simulation/commands/complete-focus-session.ts` (skeleton) + `src/content/starter-state.ts` (record-construction template for the four starter modules + Output route)

**Imports pattern** — copy the barrel-import discipline from `complete-focus-session.ts` lines 13–53:
```typescript
// Source: src/simulation/commands/complete-focus-session.ts lines 13-53
import type {
  CellRecord, CoreRecord, EconomyEvent, FlowgridSnapshot,
  ModuleInstance, RouteRecord, SimulationEnv, SimulationResult,
  ValidationIssue, VisualEvent,
} from '../../domain/index.js';
import { ECONOMY_EVENT_NAMES } from '../../domain/index.js';
// economy-event + visual-event constructors from ../economy-events.js, ../visual-events.js
import { operationFromCommand } from '../operation-events.js';
// reuse starter-module definition IDs from ../../content/index.js
//   (GENERATOR_MODULE_DEFINITION_ID, CHARGE_CORE_MODULE_DEFINITION_ID,
//    OUTPUT_MODULE_DEFINITION_ID, BLOOM_MODULE_DEFINITION_ID)
```

**Reject-with helper** — copy verbatim from `complete-focus-session.ts` lines 55–68 (Phase 1 D-07: reject, never throw):
```typescript
// Source: src/simulation/commands/complete-focus-session.ts lines 55-68
function rejectWith(state: FlowgridSnapshot, issues: readonly ValidationIssue[]): SimulationResult {
  return {
    status: 'rejected', previousState: state, nextState: state,
    economyEvents: [], visualEvents: [], operations: [], validationIssues: issues,
  };
}
```

**Validation pattern** — copy the accumulator style from `complete-focus-session.ts` lines 70–136. New checks (D-09): `name` non-empty, `color` hex regex `/^#[0-9a-fA-F]{6}$/`, `dailyTargetSeconds` positive integer, `cellId` not already in `state.cells`, Core exists. Reuse `ValidationIssue` codes from `src/domain/validation.ts` lines 9–17 (`invalid_reference` for cellId collision; `invalid_operation_shape` is reserved for not-implemented — for shape errors on input prefer `invalid_reference` per the established pattern).

**Record construction** — mirror `src/content/starter-state.ts` lines 75–187 exactly. The command:
1. Builds one `CellRecord` (lines 82–99) — add D-10 fields `color: command.color`, `icon: command.icon`, `archivedAt: null` (and `activeSessionStartedAt: null` if D-05 field-on-Cell is chosen).
2. Builds four `ModuleInstance` records (lines 113–162) — reuse the same `slotId(cellId, kind)` convention (line 50: `` `${cellId}:slot:${kind}` ``).
3. Builds one `RouteRecord` Output→Core at `allocationPercent: 100` (lines 163–176).
4. Emits one `SyncOperation` via `operationFromCommand(command, env.now, { entityId: command.cellId, payload: {...} })` — see `complete-focus-session.ts` lines 200–214.
5. Returns `SimulationResult` with `status: 'applied'` per lines 279–287.

**Key reuse call** — `src/simulation/operation-events.ts::operationFromCommand` (lines 47–67) already builds the operation record; just pass `command` (it auto-resolves `entityType: 'cell'` once `create_cell` is added to `entityTypeForCommand` switch at line 17).

---

### A2. `src/simulation/commands/edit-cell.ts`, `archive-cell.ts`, `unarchive-cell.ts`, `start-focus-session.ts` (commands, request-response)

**Analogy:** all four are simpler than `create-cell` — they patch a single existing Cell. Use `src/simulation/commands/set-core-allocation.ts` (73 lines, the leanest existing command) as the **primary skeleton**.

**Full skeleton** — copy `src/simulation/commands/set-core-allocation.ts` lines 1–73:
```typescript
// Source: src/simulation/commands/set-core-allocation.ts (entire file — the lean template)
export function setCoreAllocation(
  previousState: FlowgridSnapshot,
  command: SetCoreAllocationCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];
  if (!isCoreAllocationValid(command.convertAllocationPercent, command.storeAllocationPercent)) {
    issues.push({ code: 'invalid_core_allocation_total', severity: 'error',
      entityType: 'core', entityId: previousState.core.id,
      message: '...', path: 'command.convertAllocationPercent,command.storeAllocationPercent' });
  }
  if (issues.length > 0) {
    return { status: 'rejected', previousState, nextState: previousState,
      economyEvents: [], visualEvents: [], operations: [], validationIssues: issues };
  }
  const newCore = { ...previousState.core,
    convertAllocationPercent: command.convertAllocationPercent,
    storeAllocationPercent: command.storeAllocationPercent, updatedAt: env.now };
  const operation = operationFromCommand(command, env.now, { entityId: previousState.core.id,
    payload: { convertAllocationPercent: command.convertAllocationPercent,
               storeAllocationPercent: command.storeAllocationPercent } });
  return { status: 'applied', previousState,
    nextState: { ...previousState, core: newCore,
      client: { ...previousState.client, updatedAt: env.now },
      operations: [...previousState.operations, operation] },
    economyEvents: [], visualEvents: [], operations: [operation], validationIssues: [] };
}
```

**Per-command deltas:**

| Command | Validation | State mutation |
|---------|-----------|----------------|
| `edit_cell` (D-11) | cellId exists; `name` non-empty; `color` hex; `dailyTargetSeconds` positive int; **never** accept economy fields | spread existing cell + identity fields only (`name`, `color`, `icon`, `dailyTargetSeconds`), `updatedAt: env.now` |
| `archive_cell` (D-12) | cellId exists; not already archived | set `archivedAt: env.now` |
| `unarchive_cell` (D-12) | cellId exists; currently archived | set `archivedAt: null` |
| `start_focus_session` (D-05) | cellId exists; not archived; no existing `activeSessionStartedAt` on any cell (one active session) | set `activeSessionStartedAt: env.now` on the cell |

Each emits exactly **one** `SyncOperation` via `operationFromCommand`. None emit economy or visual events (mirrors `set-core-allocation.ts` lines 68–69: empty arrays).

---

### A3. `src/simulation/commands/cancel-focus-session.ts` (command, request-response — writes nothing durable)

**Analogs:** `src/simulation/commands/not-implemented.ts` (the `applied`/empty-arrays result shape) + `set-core-allocation.ts` (structure).

**Critical rule (D-07 + RESEARCH Pitfall 6):** cancel returns `status: 'applied'` (it does clear the marker) but **empty** `operations`, `sessions`, `economyEvents`, `visualEvents`. The only state change is `activeSessionStartedAt: null` on the cell.

**Result shape** — mirror `not-implemented.ts` lines 17–34 but flip `status` to `'applied'` and carry the real `nextState`:
```typescript
// Source: src/simulation/commands/not-implemented.ts lines 17-34 (adapted)
return {
  status: 'applied',          // NOT 'not_implemented' — cancel is a real action
  previousState,
  nextState: { ...previousState,
    cells: new Map(previousState.cells).set(command.cellId,
      { ...previousCell, activeSessionStartedAt: null, updatedAt: env.now }) },
  economyEvents: [],          // D-07: nothing durable
  visualEvents: [],
  operations: [],             // D-07: NO operation row — Pitfall 6
  validationIssues: [],
};
```

The repository's `applyResult` (`src/persistence/repository.ts` lines 91–130) will diff-write the changed Cell via `plan.cellPuts` (the empty `operations`/`sessions` arrays cause no append). This is the **exact** "rejected/not_implemented write nothing beyond what diff detects" pattern Phase 2 D-02 established.

---

### B1. `src/simulation/systems/day-rollover.ts` (system, transform)

**Analogs:** `src/simulation/systems/bloom.ts` (pure-cell-transform style) + RESEARCH Pattern 5 (full code at lines 519–545).

**Pure-function signature** — mirror `bloom.ts` lines 11–20 (no side effects, value-in/value-out):
```typescript
// Source: src/simulation/systems/bloom.ts lines 11-20 (signature discipline)
export function shouldFireBloom(cell: CellRecord, localDate: LocalDateString): boolean { ... }
export function applyBloom(cell: CellRecord, localDate: LocalDateString): BloomResult { ... }
```

**Body** — use RESEARCH Pattern 5 verbatim (lines 519–545). **CRITICAL — Pitfall 7 (RESEARCH lines 654–658):** do NOT reset `cell.activation` (it is a monotonic lifetime counter). Only reset `dailyMilestoneProgressSeconds` and apply Momentum decay. Also add the `deriveLocalDate` pure helper (RESEARCH lines 507–515) either here or in `src/content/`.

**Momentum decay check** — D-14 + RESEARCH Open Question Q2: compare `session.startedAt.slice(0,10)` against `cell.lastBloomLocalDate` (the local date the cell last bloomed), not against `env.localDate`.

---

### C1. `src/domain/records.ts` modification — extend `CellRecord` (D-10)

**Analog:** the file itself (lines 29–42). Add fields after line 39, keeping the readonly + integer-alias discipline:

```typescript
// Source: src/domain/records.ts lines 29-42 (extend in place)
export interface CellRecord {
  readonly id: CellId;
  readonly name: string;
  // --- D-10 additions (identity/UI fields) ---
  readonly color: string;                        // hex, e.g. '#6b7280'
  readonly icon: string | null;                  // lucide name | emoji | null
  readonly archivedAt: IsoDateTimeString | null; // null = active
  // --- D-05 (Agent's Discretion — field-on-Cell, RESEARCH A6) ---
  readonly activeSessionStartedAt: IsoDateTimeString | null;
  // --- existing economy fields (unchanged) ---
  readonly xp: IntNonNegative;
  readonly current: IntNonNegative;
  readonly charge: IntNonNegative;
  readonly momentum: IntNonNegative;
  readonly activation: IntNonNegative;           // KEEP monotonic lifetime — Pitfall 7
  readonly dailyMilestoneProgressSeconds: IntNonNegative;
  readonly dailyMilestoneTargetSeconds: IntNonNegative;
  readonly lastBloomLocalDate: LocalDateString | null;
  readonly createdAt: IsoDateTimeString;
  readonly updatedAt: IsoDateTimeString;
}
```

`IsoDateTimeString` and `LocalDateString` are already imported (lines 6–7). No new primitive types needed.

---

### C2. `src/domain/result.ts` modification — extend `SimulationCommand` union

**Analog:** the file itself (lines 35–75). Add six interfaces before line 70 and extend the union:

```typescript
// Source: src/domain/result.ts lines 35-75 (extend in place)
export interface CreateCellCommand {
  readonly type: 'create_cell';
  readonly operationId: OperationId;
  readonly cellId: CellId;              // command-generated (plain string, Phase 1 ids.ts)
  readonly name: string;
  readonly color: string;
  readonly icon: string | null;
  readonly dailyTargetSeconds: IntSeconds;
  // starter module/route IDs are generated inside the command (not in input)
}
export interface EditCellCommand { readonly type: 'edit_cell'; readonly operationId: OperationId;
  readonly cellId: CellId; readonly name: string; readonly color: string;
  readonly icon: string | null; readonly dailyTargetSeconds: IntSeconds; }
export interface ArchiveCellCommand { readonly type: 'archive_cell'; readonly operationId: OperationId; readonly cellId: CellId; }
export interface UnarchiveCellCommand { readonly type: 'unarchive_cell'; readonly operationId: OperationId; readonly cellId: CellId; }
export interface StartFocusSessionCommand { readonly type: 'start_focus_session'; readonly operationId: OperationId; readonly cellId: CellId; }
export interface CancelFocusSessionCommand { readonly type: 'cancel_focus_session'; readonly operationId: OperationId; readonly cellId: CellId; }

export type SimulationCommand =
  | CompleteFocusSessionCommand | SetCoreAllocationCommand
  | LogRejuvenationCommand | RunForgeCommand | InstallModuleCommand
  | CreateCellCommand | EditCellCommand | ArchiveCellCommand
  | UnarchiveCellCommand | StartFocusSessionCommand | CancelFocusSessionCommand;
```

`IntSeconds` already imported (line 9). No new imports needed.

---

### C3. `src/simulation/engine.ts` modification — add 6 cases

**Analog:** the file itself (lines 26–37). The exhaustive `switch` has **no `default`** — TypeScript will force the planner to add all six cases (RESEARCH Pitfall 5):

```typescript
// Source: src/simulation/engine.ts lines 26-37 (extend the switch)
switch (command.type) {
  case 'complete_focus_session': return completeFocusSession(previousState, command, env);
  case 'set_core_allocation':    return setCoreAllocation(previousState, command, env);
  case 'create_cell':            return createCell(previousState, command, env);          // NEW
  case 'edit_cell':              return editCell(previousState, command, env);            // NEW
  case 'archive_cell':           return archiveCell(previousState, command, env);         // NEW
  case 'unarchive_cell':         return unarchiveCell(previousState, command, env);       // NEW
  case 'start_focus_session':    return startFocusSession(previousState, command, env);   // NEW
  case 'cancel_focus_session':   return cancelFocusSession(previousState, command, env);  // NEW
  case 'log_rejuvenation':       return logRejuvenationNotImplemented(previousState, command);
  case 'run_forge':              return runForgeNotImplemented(previousState, command);
  case 'install_module':         return installModuleNotImplemented(previousState, command);
  // NO default — exhaustiveness is the safety guarantee (Pitfall 5)
}
```

Add six imports at the top mirroring lines 17–18.

---

### C4. `src/simulation/operation-events.ts` modification — add 6 cases × 2 switches

**Analog:** the file itself (lines 17–45). Both `entityTypeForCommand` (line 17) and `entityIdForCommand` (line 32) are exhaustive switches — TypeScript forces all six new cases:

```typescript
// Source: src/simulation/operation-events.ts lines 17-30 (extend entityTypeForCommand)
case 'create_cell':          return 'cell';
case 'edit_cell':            return 'cell';
case 'archive_cell':         return 'cell';
case 'unarchive_cell':       return 'cell';
case 'start_focus_session':  return 'cell';
case 'cancel_focus_session': return 'cell';   // (operation array will be empty, but case required)
```

`cancel_focus_session` will never actually call `operationFromCommand` (D-07 writes no operation), but the switch still needs the case or compilation fails.

---

### C5. `src/simulation/commands/complete-focus-session.ts` modification — D-15 Activation bonus

**Analog:** the file itself, modifying the region around line 154. RESEARCH Code Examples lines 672–684:

```typescript
// Source: RESEARCH §"Activation bonus in complete-focus-session" lines 672-684
import { ACTIVATION_CURRENT_BONUS_PERCENT } from '../../content/formulas.js';  // new constant

const baseCurrent = generateCurrent(command.durationSeconds);
const cell = previousState.cells.get(command.cellId)!;
const isActivatedToday = cell.lastBloomLocalDate === env.localDate;
const currentGenerated = isActivatedToday
  ? baseCurrent + Math.floor((baseCurrent * ACTIVATION_CURRENT_BONUS_PERCENT) / 100)
  : baseCurrent;
// xpGained is NOT bonused (D-15 explicitly leaves XP path untouched).
```

`baseCurrent` replaces the current `currentGenerated` at line 154. All downstream code (routing, session record, events) already consumes `currentGenerated` — no further edits.

---

### C6. `src/simulation/systems/bloom.ts` modification — D-14 Momentum +1

**Analog:** the file itself, lines 31–38. RESEARCH Code Examples lines 687–699:

```typescript
// Source: src/simulation/systems/bloom.ts lines 31-38 (add momentum field)
return {
  cell: {
    ...cell,
    activation: cell.activation + 1,
    momentum: cell.momentum + 1,         // D-14: +1 on Bloom (SIM-06)
    lastBloomLocalDate: localDate,
  },
  fired: true,
};
```

The Momentum-decay half of D-14 lives in `day-rollover.ts` (B1), not here — `applyBloom` only fires the `+1`.

---

### C7. `src/content/formulas.ts` modification — add Activation constant

**Analog:** the file itself, lines 9–25 (the constants block). Append one line:

```typescript
// Source: src/content/formulas.ts lines 9-25 (append constant)
export const ACTIVATION_CURRENT_BONUS_PERCENT: IntPercent = 10; // D-15; content-tunable (RESEARCH A8)
```

`IntPercent` already imported (line 7).

---

### C8. `src/persistence/database.ts` modification — D-10 v1→v2 migration

**Analog:** the file itself (append after line 67) + RESEARCH Pattern 4 (lines 451–491). The Dexie pattern is `version(N).stores({...}).upgrade(async tx => ...)`:

```typescript
// Source: RESEARCH Pattern 4 lines 469-490 + src/persistence/database.ts lines 57-67
// Append inside the constructor, after the v1 declaration + populate/blocked handlers:

this.version(2).stores({
  // Same store definitions as v1 — non-indexed new fields need NO index entries.
  // Safest: repeat all stores verbatim from v1 (lines 58-67).
  client: 'id', cells: 'id', core: 'id',
  moduleInstances: 'id, ownerCellId',
  routes: 'id, sourceCellId',
  sessions: 'id, cellId, startedAt',
  operations: 'id, status, createdAt',
  settings: 'id',
  forgeHistory: 'id, createdAt',
}).upgrade(async (tx) => {
  await tx.table('cells').toCollection().modify((cell: Record<string, unknown>) => {
    if (cell.color === undefined) cell.color = '#6b7280';
    if (cell.icon === undefined) cell.icon = null;
    if (cell.archivedAt === undefined) cell.archivedAt = null;
    if (cell.activeSessionStartedAt === undefined) cell.activeSessionStartedAt = null; // D-05 field-on-Cell
  });
});
```

**Migration test** — register real fixtures in `tests/persistence/migration-harness.test.ts` (modify-in-place). The harness `runMigrationFixture` (`tests/persistence/migration-harness.ts` lines 21–26) is unchanged; just add real v1-shape-cell → v2-shape-cell cases alongside the synthetic ones at lines 28–59. Pattern: build a v1 cell (no new fields), run the upgrade transform (extract the `modify` callback into a named export so it is testable in isolation), assert the v2 shape with defaults.

---

### D1. Test files — exact analog: `tests/simulation/foundation-loop.test.ts`

**Imports + fixture-build pattern** — copy `tests/simulation/foundation-loop.test.ts` lines 1–39 verbatim:
```typescript
// Source: tests/simulation/foundation-loop.test.ts lines 1-39
import { test, expect } from 'vitest';
import { createStarterFlowgridState } from '../../src/content/index.js';
import type { CompleteFocusSessionCommand } from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import { expectValidState } from '../helpers/expect-valid-state.js';
import { expectReplayEqual } from '../helpers/replay.js';
import { createTestIds, createTestSimulationEnv } from '../helpers/fixtures.js';

const NOW = '2026-01-01T10:00:00.000Z';
const LOCAL_DATE = '2026-01-01';
// buildStarterState(prefix) helper — copy lines 22-39
```

**Per-test assertions** — mirror lines 41–80: assert `status`, `previousState` identity, `nextState` newness, event arrays present, then command-specific assertions. Always close with `expectValidState(result.nextState)` (the invariant composition from `src/domain/invariants.ts`).

**Replay assertion** — for each applied command, run twice and `expectReplayEqual(resultA, resultB)` (Phase 1 D-08 exact replay; helper at `tests/helpers/replay.ts` lines 8–10).

---

### E1–E6. Config files — see RESEARCH Pitfalls 3 & 4

These are mechanical setup. The two non-trivial rules:

**`tsconfig.json` (Pitfall 4)** — add DOM lib + JSX + `.tsx` include. Either extend the root or add `tsconfig.app.json`:
- `lib: ["ES2022", "DOM", "DOM.Iterable"]`
- `jsx: "react-jsx"`
- `include: ["src/**/*.ts", "src/**/*.tsx"]`
- Keep all strict flags (lines 8–13). Simulation purity stays enforced by `tests/simulation/boundaries.test.ts` + ESLint `no-restricted-imports` (`eslint.config.js` lines 31–67), not by tsconfig.

**`vitest.config.ts` (Pitfall 3)** — two environments needed. Preferred: Vitest workspace with two configs (`environment: 'node'` for `tests/simulation/**` + `tests/persistence/**`, `environment: 'happy-dom'` for `tests/ui/**` + `tests/app/**`). Keep `setupFiles: ['tests/helpers/setup-indexeddb.ts']` (line 7) on both. The existing node tests must keep passing untouched.

**`vite.config.ts` (NEW)**, **`index.html` (NEW)**, **`src/style.css` (NEW)**, **`package.json`** — follow RESEARCH "Standard Stack" install block (lines 149–159) and "State of the Art" Tailwind v4 CSS-first note (line 728). No in-repo analog.

---

### F1. `src/app/env.ts` (utility factory) — role-match analog

**Analogs:** `tests/helpers/fixtures.ts::createTestSimulationEnv` (lines 116–125) is the **direct template** — production `makeEnv` is the same shape minus the test defaults. `src/simulation/deterministic-env.ts` (the placeholder that says "lands when the app shell needs it (Phase 3+)") is the designated home.

```typescript
// Source: tests/helpers/fixtures.ts lines 116-125 (production-ize)
export function createTestSimulationEnv(params: CreateTestSimulationEnvParams = {}): SimulationEnv {
  return {
    now: params.now ?? '2026-01-01T00:00:00.000Z',
    localDate: params.localDate ?? '2026-01-01',
    rng: createRng(params.seed ?? 'flowgrid-test-seed'),
    contentVersion: params.contentVersion ?? 'phase-1-starter-v1',
  };
}
```

Production version (RESEARCH Code Examples lines 701–721) takes `now`, `settings.localDayBoundary`, and a `seed`; computes `localDate` via `deriveLocalDate` (B1). Reuse the `xmur3`/`mulberry32` RNG from `tests/helpers/fixtures.ts` lines 61–107 — extract to `src/app/rng.ts` (or a shared `src/simulation/rng.ts` if simulation ever needs it; for Phase 3 keep it in `src/app`).

---

## Shared Patterns

### S1. Command result shape (Phase 1 D-07 — reject, never throw)

**Source:** `src/simulation/commands/complete-focus-session.ts` lines 55–68 (`rejectWith`) + lines 279–287 (applied return).
**Apply to:** ALL six new commands + the `day-rollover` helper.

Every command returns a `SimulationResult` — never throws for domain invalidity. Validation accumulates `ValidationIssue[]`; non-empty list → `rejectWith(state, issues)`. Applied results always carry `previousState`, a fresh `nextState`, four event/operation/issue arrays (empty if nothing to emit), and `status: 'applied'`.

### S2. Operation record construction

**Source:** `src/simulation/operation-events.ts` lines 47–67 (`operationFromCommand`).
**Apply to:** `create_cell`, `edit_cell`, `archive_cell`, `unarchive_cell`, `start_focus_session` (each emits exactly one operation). **NOT** `cancel_focus_session` (D-07: empty operations array).

The helper takes the command + `env.now` + optional `{ entityId, payload }`. `entityType`/`entityId` auto-resolve via the exhaustive switches (C4). `payloadVersion: 1` is hardcoded (line 15) — do not bump unless the payload shape changes (RESEARCH "Four independent version axes", database.ts lines 10–15).

### S3. Validation issue construction

**Source:** `src/domain/validation.ts` lines 9–27 (codes + shape) + `complete-focus-session.ts` lines 78–133 (accumulator style).
**Apply to:** all new commands.

Reuse the eight existing codes (`negative_resource`, `invalid_reference`, `duplicate_module_install`, `invalid_route_allocation`, `invalid_core_allocation_total`, `token_regression`, `forge_count_regression`, `invalid_operation_shape`). For new validation needs (color hex format, name non-empty, archived-state guards): prefer `invalid_reference` (the established catch-all for "this value points to a problem"). If a genuinely new code is needed, add it to the union at line 17 and document why.

### S4. Diff-write persistence path (unchanged)

**Source:** `src/persistence/repository.ts` lines 91–130 (`applyResult`) + `src/persistence/diff.ts` lines 87–133 (`diffFlowgridSnapshots`).
**Apply to:** all new commands automatically — no persistence code changes beyond the v2 migration.

`applyResult` consumes any `SimulationResult` whose `status === 'applied'`. New-Cell writes appear in `plan.cellPuts`; new modules in `plan.moduleInstancePuts`; new routes in `plan.routePuts`. The repository **does not know** which command produced the result — it only diffs. This is why cancel (A3) "writes nothing durable" except the cell-marker clear: the only non-empty plan bucket is `cellPuts`.

### S5. Deterministic replay (Phase 1 D-08)

**Source:** `tests/helpers/replay.ts` (entire file) + `foundation-loop.test.ts` replay assertions.
**Apply to:** every new simulation test.

Run the command twice with identical inputs; `expectReplayEqual(resultA, resultB)` must pass. **No `Math.random()` in any new command** — RNG comes only from `env.rng` (which `create_cell` does not need; `edit/archive/start/cancel` do not need). D-14 Momentum decay and D-15 Activation bonus are pure arithmetic — replay-safe by construction.

### S6. Layer boundary enforcement

**Source:** `eslint.config.js` lines 31–67 (simulation import ban) + lines 68–124 (persistence import ban) + `tests/simulation/boundaries.test.ts` (extend).
**Apply to:** every new file in `src/app`, `src/ui`, `src/render` — they may import inward (`domain`, `simulation` selectors, `persistence` repository) but never the reverse.

The ESLint rules already forbid `src/simulation/**` from importing `react`, `pixi.js`, `dexie`, `zustand`, `happy-dom`, `jsdom`, or anything in `app/persistence/render/ui`. The new `src/render/**` and `src/ui/**` layers should add analogous `no-restricted-imports` rules: render must not import React or Dexie (Pixi-only + domain selectors + visual-event types); UI must not import Pixi or Dexie directly (React + domain selectors + the repository barrel `src/persistence/index.ts`). `tests/simulation/boundaries.test.ts` should be extended to assert these new bans.

### S7. Integer economy discipline

**Source:** `src/domain/primitives.ts` (`IntNonNegative`, `IntPercent`, `IntSeconds`) + `src/content/formulas.ts` integer math (multiply-first, floor-once at lines 59–60).
**Apply to:** D-15 Activation bonus (C5) and D-14 Momentum (C6).

`Math.floor((baseCurrent * ACTIVATION_CURRENT_BONUS_PERCENT) / 100)` — multiply before divide, floor once. Never use floating-point for durable economy values. The new `color`/`icon`/`archivedAt`/`activeSessionStartedAt` fields are the **first non-economy fields** on `CellRecord` (CONTEXT.md "Established Patterns" line 115) — they stay as plain `string` / `string | null` / `IsoDateTimeString | null`, not integer aliases.

---

## No Analog Found

Files with **no close in-repo match**. The planner should use `03-RESEARCH.md` patterns (cited per file) instead of searching the codebase further. These are all in the brand-new `src/app`, `src/ui`, `src/render` layers that Phase 3 populates for the first time.

| File / Group | Role | Data Flow | Reason | Use Instead |
|------|------|-----------|--------|-------------|
| `src/app/main.tsx`, `App.tsx`, `routes.tsx` | entry / component / route | request-response | No React code exists in-repo; folders are placeholder READMEs | RESEARCH Pattern 2 + "Pitfall 2" (React Router v7 declarative `createBrowserRouter` mode) |
| `src/app/store/flowgrid-store.ts` | store | event-driven | No Zustand code in-repo | RESEARCH Pattern 1 lines 293–311 (full Zustand vanilla `createStore` example) |
| `src/app/store/dispatch.ts` | service | request-response | No dispatch wiring in-repo | RESEARCH Pattern 1 lines 318–340 (full `dispatch` function); consumes `runSimulationCommand` + `FlowgridRepository.applyResult` directly |
| `src/render/flowgrid/scene.ts` | provider | event-driven | No Pixi code in-repo | RESEARCH Pattern 2 lines 347–383 (full `FlowgridCanvas` component with v8 async `Application.init()`); **Pitfall 1**: use `app.canvas` not `app.view` |
| `src/render/flowgrid/hex-layout.ts` | utility | transform | No hex math in-repo; STACK.md mandates owning it | RESEARCH Pattern 3 lines 396–444 (full Red Blob axial/cube module: `axialToPixel`, `pixelToAxial`, `axialRound`, `ringCells`) |
| `src/render/flowgrid/adapter.ts` | provider | event-driven | No scene adapter in-repo | RESEARCH Pattern 2 + "Architecture Patterns" diagram lines 203–206 (subscribes store + drops visual events per D-02) |
| `src/ui/flowgrid-home/*` | component | request-response | No React components in-repo | RESEARCH Pattern 2 (mounts Pixi canvas) + D-02/D-03 (static state, tap → navigate) |
| `src/ui/cell-board/*` | component | request-response | No React components in-repo | UI-05 spec (`REQUIREMENTS.md`); reads via `src/simulation/selectors.ts` (lines 19–45); dispatches via `src/app/store/dispatch.ts` |
| `src/ui/session-summary/*` | component | request-response | No React components in-repo | SESS-05 content list (CONTEXT.md line 50); reads `SessionRecord` fields from `src/domain/records.ts` lines 93–106 |
| `src/ui/shared/error-boundary.tsx` | component | event-driven | No React components in-repo | Renders the typed `PersistenceError` from `src/persistence/errors.ts` lines 11–26 (the contract Phase 2 shipped, Phase 3 renders) |
| `vite.config.ts`, `index.html`, `src/style.css` | config | — | No Vite/Tailwind setup in-repo | RESEARCH "Standard Stack" install block lines 149–159 + "State of the Art" line 728 (Tailwind v4 CSS-first) |
| `tests/ui/**`, `tests/app/**` | test (component) | request-response | No RTL tests in-repo | RESEARCH Pitfall 3 (happy-dom env via Vitest workspace); Testing Library + user-event per RESEARCH Standard Stack lines 133–135 |

---

## Metadata

**Analog search scope:** `src/domain/`, `src/simulation/`, `src/persistence/`, `src/content/`, `tests/helpers/`, `tests/simulation/`, `tests/persistence/`, `eslint.config.js`, `tsconfig.json`, `vitest.config.ts`, `package.json`, plus placeholder READMEs in `src/app/`, `src/ui/`, `src/render/`.

**Files scanned:** 28 source/test files read in full (all ≤ 288 lines — single-pass reads, no re-reads); 0 partial/grep-driven reads needed (no file exceeded the 2,000-line threshold).

**Strong analogs identified (stop point reached):** 3 command analogs (`complete-focus-session.ts`, `set-core-allocation.ts`, `not-implemented.ts`), 1 record-construction analog (`starter-state.ts`), 1 migration analog (`database.ts` itself + RESEARCH Pattern 4), 1 dispatcher analog (`engine.ts` itself), 1 test analog (`foundation-loop.test.ts`), 1 env-factory analog (`fixtures.ts::createTestSimulationEnv`). All 12 simulation/domain/persistence changes have exact in-repo analogs; all `src/app`/`src/ui`/`src/render` files fall back to RESEARCH patterns by design (Phase 3 is the first phase to populate those layers).

**Pattern extraction date:** 2026-06-23
