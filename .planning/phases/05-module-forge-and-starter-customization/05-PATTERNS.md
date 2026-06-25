# Phase 5: Module Forge and Starter Customization - Pattern Map

**Mapped:** 2026-06-25
**Files analyzed:** 23 (9 new + 14 modified)
**Analogs found:** 23 / 23 (every file has a near-clone analog — this is a pure continuation phase)

**Headline:** Phase 5 introduces **zero new architectural concepts**. Every new file is a near-clone of an existing Phase 1–4 artifact, and every modification is a Phase-4-style in-place extension. The planner should resist inventing new patterns.

---

## File Classification

### New Files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/simulation/commands/run-forge.ts` | command (controller) | request-response (atomic mutation) | `src/simulation/commands/log-rejuvenation.ts` | **exact** (near-clone) |
| `src/simulation/commands/forge-choices.ts` | selector (utility) | read-only transform | `src/content/formulas.ts:nextIntegrationThreshold` + `src/app/rng.ts:createRng` + `src/simulation/selectors.ts` | **exact** (composite) |
| `src/content/forge.ts` | config (content) | constants + pure fns | `src/content/formulas.ts` | **exact** |
| `src/ui/forge-panel/ForgePanel.tsx` | component (route) | request-response | `src/ui/core-panel/CorePanel.tsx` | **exact** (route peer) |
| `src/ui/forge-panel/ForgeSummary.tsx` | component (read-only) | read-only | `src/ui/core-panel/RejuvenationSummary.tsx` | **exact** (near-clone) |
| `src/ui/forge-panel/ForgeChoiceList.tsx` | component (presentational) | read-only | `src/ui/cell-board/ModuleTile.tsx` | **role-match** |
| `tests/simulation/run-forge.test.ts` ⚠ | test | unit (command) | `tests/simulation/rejuvenation.test.ts` + `tests/simulation/activation-boost.test.ts` | **exact** |
| `tests/simulation/forge-choices.test.ts` ⚠ | test | unit (selector) | `tests/simulation/rejuvenation.test.ts` (determinism/replay harness) | **role-match** |
| `tests/properties/forge-safety.property.test.ts` | test | property (fast-check) | `tests/properties/economy-safety.property.test.ts` | **exact** |

⚠ **Layout correction:** RESEARCH.md suggested `tests/simulation/commands/run-forge.test.ts` (nested), but the actual codebase convention is **flat**: `tests/simulation/{name}.test.ts` (see `rejuvenation.test.ts`, `activation-boost.test.ts`, `cell-crud.test.ts`). Use the flat layout.

### Modified Files

| Modified File | Role | Data Flow | Closest Analog (within same file) | Match Quality |
|---------------|------|-----------|-----------------------------------|---------------|
| `src/domain/records.ts` | model | — | Phase 4 widened `RejuvenationRecord` (lines 128-137) | **exact** (self) |
| `src/domain/result.ts` | model | — | Phase 4 extended `LogRejuvenationCommand` (lines 56-61); Phase 4 added `ECONOMY_EVENT_NAMES` entries (lines 193-196) | **exact** (self) |
| `src/domain/validation.ts` | model | — | Phase 4 added codes to `ValidationIssueCode` union (lines 17-20) | **exact** (self) |
| `src/simulation/engine.ts` | controller (dispatcher) | request-response | Phase 4 routed `log_rejuvenation` etc. (lines 52-59) | **exact** (self) |
| `src/simulation/economy-events.ts` | utility | — | Phase 4 block at lines 133-170 (`rejuvenationCompletedEvent`, `tokenGrantedEvent`, `activationBoostPurchasedEvent`) | **exact** (self) |
| `src/simulation/commands/complete-focus-session.ts` | command | request-response | `activationBonusPercent` threading at lines 161-166 | **exact** (self — Generator per-level bonus is the literal template) |
| `src/simulation/systems/core-allocation.ts` | system | transform | `applyCoreAllocation` (lines 18-39) — Charge Core level boost site | **role-match** (D-04 A1) |
| `src/simulation/systems/routes.ts` | system | transform | `routeCurrentThroughRoutes` (lines 26-39) — Output level boost site | **role-match** (D-04 A2) |
| `src/simulation/systems/bloom.ts` | system | transform | `applyBloom` (lines 27-42) — Bloom level boost site | **role-match** (D-04 A3) |
| `src/content/formulas.ts` | config | constants | Phase 4 block at lines 46-50 (`ACTIVATION_BOOST_*` constants) | **exact** (self) |
| `src/content/index.ts` | config (barrel) | — | Existing Phase 4 exports block (lines 13-40) | **exact** (self) |
| `src/persistence/database.ts` | persistence (migration) | batch transform | v2→v3 `upgradeCoresV2ToV3` (lines 84-94) + `version(3).stores({…}).upgrade(…)` (lines 155-168) | **exact** (near-clone) |
| `src/persistence/validation-schemas.ts` | persistence | — | `rejuvenationSchema` (lines 121-130) + drift guard (lines 175-176) | **exact** (self) |
| `src/app/store/flowgrid-store.ts` | store | — | `lastCompletedRejuvenation` field (lines 51-54) + initial-state line 75 | **exact** (self) |
| `src/app/store/dispatch.ts` | store | request-response | `captureCompletedRejuvenation` (lines 139-148) + dispatch spread (lines 107, 116) | **exact** (self) |
| `src/app/routes.tsx` | route | — | `/core` route entry (lines 19-22) | **exact** (self) |
| `src/ui/flowgrid-home/ReturnCues.tsx` | component | read-only | near-Bloom tappable chip (lines 66-74) | **exact** (self) |
| `src/ui/cell-board/CellBoard.tsx` | component | read-only | `STARTER_TILES` spec (lines 29-50) + `ModuleTile` render (lines 103-112) | **exact** (self) |
| `src/ui/cell-board/ModuleTile.tsx` | component (presentational) | read-only | Existing tile body (lines 26-34) | **exact** (self) |
| `tests/persistence/migration-harness.test.ts` | test | unit (migration) | Real v2→v3 cell/core fixtures block (after line 60) | **exact** (self) |

---

## Pattern Assignments

### `src/simulation/commands/run-forge.ts` (command, request-response)

**Analog:** `src/simulation/commands/log-rejuvenation.ts` — **near-clone** (175 lines, read it whole).
**Secondary analog (energy-spend variant):** `src/simulation/commands/purchase-activation-boost.ts` (102 lines) — the Energy-cost decrement pattern.

**Imports pattern** (`log-rejuvenation.ts:22-42`):
```typescript
import type {
  CoreRecord,
  EconomyEvent,
  FlowgridSnapshot,
  IntNonNegative,
  RunForgeCommand,            // ← swap for the new handler's command type
  ForgeHistoryRecord,         // ← the appended record type
  SimulationEnv,
  SimulationResult,
  ValidationIssue,
} from '../../domain/index.js';

import { operationFromCommand } from '../operation-events.js';
import { forgeCompletedEvent, moduleUpgradedEvent } from '../economy-events.js';  // ← new constructors
import { forgeEnergyCost, MODULE_MAX_LEVEL } from '../../content/index.js';        // ← new content helpers
```

**`rejectWith` helper** (`log-rejuvenation.ts:44-57`) — **copy verbatim**:
```typescript
function rejectWith(
  state: FlowgridSnapshot,
  issues: readonly ValidationIssue[],
): SimulationResult {
  return {
    status: 'rejected',
    previousState: state,
    nextState: state,
    economyEvents: [],
    visualEvents: [],
    operations: [],
    validationIssues: issues,
  };
}
```

**Validation → derive-from-monotonic-counter → apply → append → emit pattern** (`log-rejuvenation.ts:64-113`):
```typescript
export function logRejuvenation(previousState, command, env): SimulationResult {
  const issues: ValidationIssue[] = [];

  // (1) Validate input shape (mirrors lines 68-77)
  if (command.endedAt < command.startedAt) {
    issues.push({ code: 'invalid_reference', severity: 'error', entityType: 'rejuvenation',
      entityId: command.operationId, message: `…`, path: 'command.startedAt,command.endedAt' });
  }
  if (issues.length > 0) return rejectWith(previousState, issues);

  // (2) DERIVE from the monotonic counter (Pitfall 4 — lines 104-113).
  // run_forge: re-derive forgeChoices(snapshot) from snapshot.core.forgeCount here.
  while (newIntegration >= nextIntegrationThreshold(moduleTokens)) {
    moduleTokens += 1;
  }

  // (3) Build newCore, (4) append record, (5) build operation, (6) emit events,
  // (7) return SimulationResult. See lines 115-174.
}
```

**Energy-spend payment pattern** (`purchase-activation-boost.ts:42-81`) — the exact shape for `run_forge`'s `paymentType: 'energy'` branch:
```typescript
const level = previousState.core.activationBoostLevel;
const cost = activationBoostCost(level);                      // ← forge: forgeEnergyCost(prevCore.forgeCount)

if (cost === null) {                                           // ← forge: target.level >= MODULE_MAX_LEVEL
  issues.push({ code: 'invalid_reference', …, message: `… already at the maximum …` });
} else if (previousState.core.energy < cost) {                 // ← forge: insufficient Energy
  issues.push({ code: 'invalid_reference', …, message: `energy ${…} is below the cost ${cost} …` });
}

if (issues.length > 0) return rejectWith(previousState, issues);

const newCore: CoreRecord = {
  ...previousState.core,
  energy: previousState.core.energy - energyCost,              // ← forge: also moduleTokens/forgeCount branches
  activationBoostLevel: newLevel,
  updatedAt: env.now,
};
```

**Append-only history record + idempotent id** (`log-rejuvenation.ts:128-137`) — `id = command.operationId` is the linchpin:
```typescript
const record: RejuvenationRecord = {
  id: command.operationId,           // ← 1:1 with operationId (idempotent replay — Phase 2 D-04)
  startedAt: command.startedAt,
  endedAt: command.endedAt,
  // …
  createdAt: env.now,
};
```

**Next-state assembly** (`log-rejuvenation.ts:158-174`):
```typescript
const nextState: FlowgridSnapshot = {
  ...previousState,
  core: newCore,
  rejuvenations: [...previousState.rejuvenations, record],   // ← forge: forgeHistory
  operations: [...previousState.operations, operation],
  client: { ...previousState.client, updatedAt: env.now },
};

return {
  status: 'applied',
  previousState,
  nextState,
  economyEvents,
  visualEvents: [],                                           // ← forge may emit visual events (Phase 6 animates)
  operations: [operation],
  validationIssues: [],
};
```

**RESEARCH.md lines 333–415 contain a full plausible handler skeleton** — the planner should treat it as the starting draft and finalize exact field names.

---

### `src/simulation/commands/forge-choices.ts` (selector, read-only transform)

**Analog (pure derivation from monotonic counter):** `src/content/formulas.ts:nextIntegrationThreshold` (lines 61-67).
**Analog (RNG construction):** `src/app/rng.ts:createRng` (lines 42-63).
**Analog (module lookup):** `src/simulation/systems/modules.ts:findModuleInstanceForCell` (lines 14-26).

**Pure derivation pattern** (`formulas.ts:61-67`):
```typescript
// DERIVED from the monotonic moduleTokens counter — never persists a "next" value.
export function nextIntegrationThreshold(moduleTokens: number): number {
  let threshold = INTEGRATION_THRESHOLD_BASE;
  for (let i = 0; i < moduleTokens; i++) {
    threshold = Math.floor(threshold * INTEGRATION_THRESHOLD_RATIO);
  }
  return threshold;
}
```

**Immutable Rng nextInt contract** (`rng.ts:49-61`) — **critical**: `nextInt` returns `[value, nextRng]`; the selector must thread `next` through the loop with a `let`:
```typescript
const make = (consumed: number): Rng => ({
  seed,
  nextInt(minInclusive: number, maxInclusive: number) {
    const nextConsumed = consumed + 1;
    ensure(nextConsumed);
    const u = buffer[consumed];
    if (u === undefined) throw new Error('createRng: buffer was not populated');
    const range = maxInclusive - minInclusive + 1;
    const value = minInclusive + Math.floor(u * range);
    return [value, make(nextConsumed)] as const;   // ← returns a NEW Rng; does not mutate
  },
});
```

**Module-instance lookup** (`modules.ts:14-26`) — used to filter maxed modules:
```typescript
export function findModuleInstanceForCell(
  state: FlowgridSnapshot,
  cellId: CellId,
  kind: ModuleDefinitionKind,
): ModuleInstance | undefined {
  const def = getStarterModuleDefinitionByKind(kind);
  for (const instance of state.moduleInstances.values()) {
    if (instance.ownerCellId === cellId && instance.definitionId === def.id) {
      return instance;
    }
  }
  return undefined;
}
```

**`createRng` call shape** — `forgeChoices` constructs its own Rng inside (NEVER `env.rng`):
```typescript
// Pitfall 2 / D-06: seed derived from snapshot, not ambient.
const rng = createRng(`forge:${snapshot.core.forgeCount}`);
```

**RESEARCH.md lines 417–448 contain a full selector skeleton** with the partial Fisher-Yates loop. The planner starts from that draft.

---

### `src/content/forge.ts` (config, constants + pure functions)

**Analog:** `src/content/formulas.ts` (Phase 4 block lines 33-81).

**Constants block pattern** (`formulas.ts:33-50`):
```typescript
// --- Phase 4: Rejuvenation + Integration threshold + Activation boost constants ---
// All values are content-tunable (SPEC Constraints / Tunability) and live here, not
// hardcoded inside command handlers. Integer discipline: the 1.5 ratio is a multiplier
// inside Math.floor only — the float never persists.

export const REJUVENATION_CHARGE_PER_MINUTE = 10;

export const INTEGRATION_THRESHOLD_BASE = 50;
export const INTEGRATION_THRESHOLD_RATIO = 1.5;

// CORE-06: Activation-bonus upgrade (cap 3, scaling Energy cost, +5% per level).
export const ACTIVATION_BOOST_PER_LEVEL = 5;
export const ACTIVATION_BOOST_MAX_LEVEL = 3;
export const ACTIVATION_BOOST_COSTS = [50, 100, 200] as const;
```

**Pure derivation function pattern** (`formulas.ts:71-81`) — the template for `forgeEnergyCost(forgeCount)` and `moduleLevelBonus(kind, level)`:
```typescript
// CORE-06: Energy cost to advance from `currentLevel` to the next, or null when at cap.
export function activationBoostCost(currentLevel: number): number | null {
  return currentLevel < ACTIVATION_BOOST_COSTS.length
    ? ACTIVATION_BOOST_COSTS[currentLevel]!
    : null;
}

// CORE-06: effective Activation Current bonus percent for a level. Derived from the
// persisted level so it can never diverge from truth. 10/15/20/25 for levels 0/1/2/3.
export function activationBonusPercent(level: number): number {
  return ACTIVATION_CURRENT_BONUS_PERCENT + level * ACTIVATION_BOOST_PER_LEVEL;
}
```

The new `forge.ts` should export: `FORGE_ENERGY_BASE`, `FORGE_ENERGY_STEP`, `MODULE_MAX_LEVEL`, `MODULE_LEVEL_BONUS` (keyed by `ModuleDefinitionKind`), plus pure helpers `forgeEnergyCost(forgeCount)` and `moduleLevelBonus(kind, level)`. Re-export through `src/content/index.ts:12-40` (add to the existing `formulas.js` re-export block, or add a new `forge.js` block).

---

### `src/ui/forge-panel/ForgePanel.tsx` (component, route — request-response)

**Analog:** `src/ui/core-panel/CorePanel.tsx` (287 lines, read it whole — it's the closest peer route).

**Route registration** (`src/app/routes.tsx:19-22`):
```typescript
{
  path: '/core',
  element: <CorePanel />,
},
// Phase 5 adds:
//   { path: '/forge', element: <ForgePanel /> },
```

**Imports + dispatch wiring** (`CorePanel.tsx:14-32`):
```typescript
import { useState } from 'react';
import { Link } from 'react-router';

import type {
  CancelRejuvenationCommand,
  LogRejuvenationCommand,
  PurchaseActivationBoostCommand,
  SetCoreAllocationCommand,
  StartRejuvenationCommand,
} from '../../domain/index.js';

import { activationBoostCost, nextIntegrationThreshold } from '../../content/index.js';
import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';

import { RejuvenationSummary } from './RejuvenationSummary.js';
```

**Store selector + last-completed read** (`CorePanel.tsx:46-51`):
```typescript
export function CorePanel() {
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const activeRejuvenation = useFlowgridStore((s) => s.activeRejuvenation);
  const lastCompletedRejuvenation = useFlowgridStore((s) => s.lastCompletedRejuvenation);
  // ← ForgePanel reads lastCompletedForge
```

**Local env builder + command dispatch** (`CorePanel.tsx:34-44, 76-85, 94-101`) — **copy verbatim** for forge:
```typescript
const CORE_SEED = 'flowgrid-core-seed';
function buildCoreEnv(localDayBoundary: string) {
  return makeEnv(new Date().toISOString(), { localDayBoundary }, CORE_SEED);
}

const handlePurchaseBoost = () => {
  const env = buildCoreEnv(snapshot.settings.localDayBoundary);
  const command: PurchaseActivationBoostCommand = {
    type: 'purchase_activation_boost',
    operationId: crypto.randomUUID(),
  };
  void dispatch(command, env, repository);
};
```

**Disabled-when-unaffordable button pattern** (`CorePanel.tsx:88-101, 213-223`) — the exact shape for the Token/Energy roll buttons:
```typescript
const boostLevel = core.activationBoostLevel;
const boostCost = activationBoostCost(boostLevel);
const atCap = boostCost === null;
const cannotAfford = !atCap && core.energy < boostCost;
const boostDisabled = atCap || cannotAfford;

<button type="button" onClick={handlePurchaseBoost} disabled={boostDisabled}
  aria-describedby="boost-help"
  className={boostDisabled
    ? '… opacity-50 cursor-not-allowed'
    : '… transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core'}>
  Purchase Boost
</button>
```

**Inline summary mount** (`CorePanel.tsx:271-274`) — **copy verbatim**, swap the component:
```typescript
{lastCompletedRejuvenation !== null ? (
  <RejuvenationSummary rejuvenation={lastCompletedRejuvenation} core={core} />
) : null}
// ForgePanel:
//   {lastCompletedForge !== null ? (<ForgeSummary forge={lastCompletedForge} core={core} />) : null}
```

---

### `src/ui/forge-panel/ForgeSummary.tsx` (component, read-only)

**Analog:** `src/ui/core-panel/RejuvenationSummary.tsx` (65 lines) — **near-clone**.

**Full template** (`RejuvenationSummary.tsx:30-64`) — copy structure, swap fields:
```typescript
export function RejuvenationSummary({ rejuvenation, core }: RejuvenationSummaryProps) {
  const nextThreshold = nextIntegrationThreshold(core.moduleTokens);
  const distanceToNext = Math.max(0, nextThreshold - core.integration);

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Rejuvenation summary"
      className="rounded-lg border border-core/50 bg-flowgrid-surface p-4 space-y-3"
    >
      <h3 className="text-base font-semibold text-core">Rejuvenation Complete</h3>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Charge Processed</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{rejuvenation.chargeConsumed}</dd>
        </div>
        {/* … three more cells … */}
      </dl>
      <p className="text-sm text-slate-400">… summary sentence …</p>
    </section>
  );
}
```

**Critical UI-boundary rule** (`RejuvenationSummary.tsx:9-13` comment) — all economy numbers come from the passed record + `CoreRecord`; the only derived display value uses the PURE content selector. ForgeSummary follows the same rule: derive the next Energy cost via `forgeEnergyCost(core.forgeCount)` (pure content fn), never recompute economy.

---

### `src/ui/forge-panel/ForgeChoiceList.tsx` (component, presentational)

**Analog:** `src/ui/cell-board/ModuleTile.tsx` (35 lines) — the lucide icon + kind-keyed presentational tile pattern.

**Kind-keyed icon map** (`ModuleTile.tsx:13-18`):
```typescript
import { ArrowRight, Battery, Flower, Zap, type LucideIcon } from 'lucide-react';

const KIND_ICONS: Readonly<Record<ModuleDefinitionKind, LucideIcon>> = {
  generator: Zap,
  charge_core: Battery,
  output: ArrowRight,
  bloom: Flower,
};
```

ForgeChoiceList will render the 3 revealed choices; each row can follow the same `<div role="group">` accessible semantic (lines 28-34). Note: choices carry a `cellId` + `moduleKind`, so each row needs the cell name (resolve via `getCellById`) alongside the kind label.

---

### `tests/simulation/run-forge.test.ts` (test, unit command)

**Analog:** `tests/simulation/rejuvenation.test.ts` + `tests/simulation/activation-boost.test.ts`.

**Test scaffold** (`rejuvenation.test.ts:14-67`):
```typescript
import { test, expect } from 'vitest';

import type {
  CellRecord, CoreRecord, FlowgridSnapshot,
  LogRejuvenationCommand,
} from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import { nextIntegrationThreshold } from '../../src/content/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';
import { expectValidState } from '../helpers/expect-valid-state.js';
import { expectReplayEqual } from '../helpers/replay.js';

const NOW = '2026-01-04T14:00:00.000Z';
const LOCAL_DATE = '2026-01-04';

// Override Core fields on a starter snapshot.
function snapshotWithCore(state: FlowgridSnapshot, overrides: Partial<CoreRecord>): FlowgridSnapshot {
  return { ...state, core: { ...state.core, ...overrides } };
}
function snapshotWithCell(state: FlowgridSnapshot, overrides: Partial<CellRecord>): FlowgridSnapshot {
  const original = state.cells.values().next().value as CellRecord;
  const updated: CellRecord = { ...original, ...overrides };
  const cells = new Map(state.cells);
  cells.set(original.id, updated);
  return { ...state, cells };
}

function buildLogRej(ids, suffix, startedAt, endedAt): LogRejuvenationCommand {
  return { type: 'log_rejuvenation', operationId: `${ids.clientId}:op:${suffix}`, startedAt, endedAt };
}
```

`run-forge.test.ts` reuses the same `buildStarterSnapshot` + `createTestSimulationEnv` + `snapshotWithCore` + `expectReplayEqual`. The Energy-payment test cases mirror `activation-boost.test.ts`'s cost/affordability/cap assertions.

**Test cases to cover** (from CONTEXT.md D-06 + VER-02 discretion):
- Token roll + Energy roll both succeed and apply `+1 level`
- Insufficient tokens / insufficient energy → rejected, state unchanged
- `chosenReward ∉ revealedChoices` → rejected (TOCTOU defense)
- Target at `MODULE_MAX_LEVEL` → rejected (`slot_at_capacity`)
- `forgeCount` monotonic increment; `moduleTokens`/`energy` non-negative after payment
- Idempotent replay (same `operationId` → byte-identical result via `expectReplayEqual`)
- Cross-Cell reveal (multiple cells → choices drawn from both)

---

### `tests/simulation/forge-choices.test.ts` (test, unit selector)

**Analog:** Same harness as `rejuvenation.test.ts` (determinism assertions).

**Test cases** (from D-06/D-05):
- Same `forgeCount` → identical choices (replay determinism)
- Different `forgeCount` → choices re-derive identically (no `env.rng` use)
- Maxed modules filtered from the pool
- Fewer than 3 non-maxed modules → returns `min(3, poolSize)`
- Empty pool (all maxed) → returns `[]`

---

### `tests/properties/forge-safety.property.test.ts` (test, property)

**Analog:** `tests/properties/economy-safety.property.test.ts` (54 lines) — **near-clone**.

**Full template** (`economy-safety.property.test.ts:7-53`):
```typescript
import fc from 'fast-check';
import { expect, test } from 'vitest';

import type { CompleteFocusSessionCommand } from '../../src/domain/index.js';
import { validateNoNegativeResources, validateFlowgridSnapshot } from '../../src/domain/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';

import { buildStarterSnapshot, createTestSimulationEnv } from '../helpers/fixtures.js';

const STARTED_AT = '2026-01-01T10:00:00.000Z';
const ENDED_AT = '2026-01-01T11:00:00.000Z';
const LOCAL_DATE = '2026-01-01';

const durationArb = fc.integer({ min: 1, max: 7200 });

test('complete_focus_session preserves non-negative resource invariants', () => {
  fc.assert(
    fc.property(durationArb, (durationSeconds) => {
      const { state, ids } = buildStarterSnapshot('safety');
      const command: CompleteFocusSessionCommand = { /* … */ };
      const env = createTestSimulationEnv({ now: STARTED_AT, localDate: LOCAL_DATE, seed: 'safety' });
      const result = runSimulationCommand(state, command, env);

      expect(result.status).toBe('applied');
      expect(result.nextState.core.energy).toBeGreaterThanOrEqual(0);
      // … more assertions …

      const negativeIssues = validateNoNegativeResources(result.nextState);
      expect(negativeIssues, negativeIssues.map((i) => i.message).join('\n')).toEqual([]);

      const allIssues = validateFlowgridSnapshot(result.nextState);
      expect(allIssues, allIssues.map((i) => i.message).join('\n')).toEqual([]);
    }),
    { numRuns: 100 },
  );
});
```

The forge property test uses `fc.record({ paymentType: fc.constantFrom('token','energy'), forgeCount: fc.integer({min:0,max:50}), … })` to generate commands, then asserts `forgeCount` monotonicity, `moduleTokens`/`energy` non-negativity, `moduleInstance.level <= MODULE_MAX_LEVEL`, and `chosenReward ∈ revealedChoices`.

---

### `tests/persistence/migration-harness.test.ts` (test, migration)

**Analog:** Same file's existing v1→v2 cell + v2→v3 core fixture blocks (lines 58+).

**Harness API** (`tests/persistence/migration-harness.ts:14-26`):
```typescript
export interface MigrationFixture<OldShape, NewShape> {
  readonly description: string;
  readonly input: OldShape;
  readonly upgrade: (record: OldShape) => NewShape;
  readonly expected: NewShape;
}

export function runMigrationFixture<OldShape, NewShape>(fixture: MigrationFixture<OldShape, NewShape>): void {
  it(fixture.description, () => {
    expect(fixture.upgrade(fixture.input)).toEqual(fixture.expected);
  });
}
```

**Import the extracted transform** (`migration-harness.test.ts:10`):
```typescript
import { upgradeCellsV1ToV2, upgradeCoresV2ToV3 } from '../../src/persistence/database.js';
// Phase 5 adds upgradeForgeHistoryV3ToV4 to this import.
```

Add a fixture proving `upgradeForgeHistoryV3ToV4` fills the new fields with sentinel defaults on a v3 row (the store is empty pre-Phase-5, but the harness still exercises the transform).

---

## Modified-File Pattern Assignments (self-analog — copy the immediately-prior Phase 4 block)

### `src/domain/records.ts` — widen `ForgeHistoryRecord`

**Self-analog:** Phase 4's `RejuvenationRecord` (lines 128-137).
**Current shape** (`records.ts:147-151`):
```typescript
export interface ForgeHistoryRecord {
  readonly id: ForgeHistoryId;
  readonly forgeCount: IntNonNegative;
  readonly createdAt: IsoDateTimeString;
}
```
**Widen to** (mirror the `RejuvenationRecord` readonly-field style):
```typescript
export interface ForgeHistoryRecord {
  readonly id: ForgeHistoryId;
  readonly forgeCount: IntNonNegative;
  readonly paymentType: 'token' | 'energy';
  readonly paymentAmount: IntNonNegative;
  readonly offeredChoices: readonly ForgeChoice[];     // may need a new ForgeChoice type in result.ts or ids.ts
  readonly chosenReward: { readonly cellId: CellId; readonly moduleKind: ModuleDefinitionKind;
                           readonly fromLevel: IntNonNegative; readonly toLevel: IntNonNegative };
  readonly createdAt: IsoDateTimeString;
}
```
A new `ForgeChoice` type (`{ cellId, moduleKind }`) should be added to `src/domain/result.ts` or `src/domain/records.ts` — the planner picks (Agent's Discretion).

---

### `src/domain/result.ts` — extend `RunForgeCommand` + add event names

**Self-analog:** Phase 4's `LogRejuvenationCommand` extension (lines 56-61) — comment notes the in-place refactor is safe because no durable data depends on the stub shape.

**Current** (`result.ts:82-85`):
```typescript
export interface RunForgeCommand {
  readonly type: 'run_forge';
  readonly operationId: OperationId;
}
```
**Extend in place** (mirror lines 56-61):
```typescript
export interface RunForgeCommand {
  readonly type: 'run_forge';
  readonly operationId: OperationId;
  readonly paymentType: 'token' | 'energy';
  readonly chosenReward: { readonly cellId: CellId; readonly moduleKind: ModuleDefinitionKind };
}
```
Imports for `CellId`, `ModuleDefinitionKind` may need adding to the existing import block at `result.ts:14-19`.

**Add event names** (mirror Phase 4 block at `result.ts:193-196`):
```typescript
export const ECONOMY_EVENT_NAMES = {
  // … existing entries …
  // Phase 5 economy events (forge + module upgrade).
  forgeCompleted: 'forge_completed',
  moduleUpgraded: 'module_upgraded',
} as const;
```

---

### `src/domain/validation.ts` — add `slot_at_capacity` code

**Self-analog:** Phase 4 added `integration_regression`, `activation_boost_regression`, `invalid_operation_shape` (lines 17-20).

```typescript
export type ValidationIssueCode =
  | 'negative_resource'
  | 'invalid_reference'
  // …
  | 'invalid_operation_shape'
  // Phase 5: target module already at MODULE_MAX_LEVEL.
  | 'slot_at_capacity';
```
Insufficient-payment reuses `negative_resource`; chosen-not-in-revealed reuses `invalid_reference` (per RESEARCH Pitfall 3 + Agent's Discretion A6).

---

### `src/simulation/engine.ts` — route `run_forge` to real handler

**Self-analog:** Phase 4 routed `log_rejuvenation`/`start_rejuvenation`/`cancel_rejuvenation`/`purchase_activation_boost` (lines 52-59).

**Current** (`engine.ts:60-63, 67-77`):
```typescript
case 'run_forge':
  return runForgeNotImplemented(previousState, command);
case 'install_module':
  return installModuleNotImplemented(previousState, command);
```
**Change to** (add import at line 28; delete `runForgeNotImplemented` at lines 67-77):
```typescript
import { runForge } from './commands/run-forge.js';
// …
case 'run_forge':
  return runForge(previousState, command, env);
case 'install_module':
  return installModuleNotImplemented(previousState, command);   // ← stays (D-08)
```
The exhaustive switch guarantees compile-time safety — no union change beyond the in-place `RunForgeCommand` extension.

---

### `src/simulation/economy-events.ts` — add `forgeCompletedEvent` + `moduleUpgradedEvent`

**Self-analog:** Phase 4 block (lines 133-170).

**Constructor template** (copy lines 160-170):
```typescript
export function activationBoostPurchasedEvent(
  at: IsoDateTimeString,
  coreId: string,
  energyCost: number,
  newLevel: number,
): EconomyEvent {
  return make(
    { at, entityType: 'core', entityId: coreId, payload: { energyCost, newLevel } },
    ECONOMY_EVENT_NAMES.activationBoostPurchased,
  );
}
```
Add `forgeCompletedEvent(at, coreId, forgeId, paymentType, paymentAmount, forgeCountAfter)` and `moduleUpgradedEvent(at, moduleInstanceId, cellId, moduleKind, fromLevel, toLevel)` following the same `make({ at, entityType, entityId, payload }, ECONOMY_EVENT_NAMES.X)` shape.

---

### `src/simulation/commands/complete-focus-session.ts` — Generator per-level bonus (D-04)

**Self-analog (literal template):** `activationBonusPercent` threading at lines 161-166.

**Current** (`complete-focus-session.ts:161-166`):
```typescript
const baseCurrent = generateCurrent(command.durationSeconds);
const isActivatedToday = previousCell.lastBloomLocalDate === env.localDate;
const activationBonusPct = activationBonusPercent(previousState.core.activationBoostLevel);
const currentGenerated = isActivatedToday
  ? baseCurrent + Math.floor((baseCurrent * activationBonusPct) / 100)
  : baseCurrent;
```
**Add the Generator-level bonus alongside** (read owning Generator module's `level`, multiply-then-floor):
```typescript
const generator = findModuleInstanceForCell(previousState, command.cellId, 'generator');
const generatorLevel = generator?.level ?? 0;
const generatorBonusPct = moduleLevelBonus('generator', generatorLevel);  // pure content fn
const currentGenerated = baseCurrent
  + Math.floor((baseCurrent * generatorBonusPct) / 100);   // integer multiply-then-floor
// (combine with the activation bonus — both are additive +% Current)
```
**Critical (D-03 / RESEARCH Pitfall 1):** `generatorLevel` is a DIFFERENT axis from `activationBoostLevel`. Do NOT conflate.

---

### `src/simulation/systems/{core-allocation,routes,bloom}.ts` — D-04 Charge Core / Output / Bloom

⚠ **RESEARCH Open Question #1 is unresolved.** The planner should resolve A1/A2/A3 (or pick + document) before implementing these three. The mechanic is locked; the interpretation is not.

**Charge Core (A1 — boost store-side effective rate, NOT a hard cap):**
- Edit site: `applyCoreAllocation` (`core-allocation.ts:18-39`). After computing `split`, multiply `split.coreCharge` by a level-derived factor (multiply-then-floor).
- Needs the owning Charge Core module's `level` — pass it in (or look up via `findModuleInstanceForCell`). The current signature `(core, incomingCurrent)` does NOT take a Cell/module context — the planner must extend the signature OR thread the level through from `complete-focus-session.ts:195` (the only caller).

**Output (A2 — boost routed amount, NOT raise the 100-sum cap):**
- Edit site: `routeCurrentThroughRoutes` (`routes.ts:26-39`). Multiply the per-route `Math.floor((current * route.allocationPercent) / 100)` by an Output-level factor (multiply-then-floor).
- Needs the Output module's `level` — current signature takes `routes` not module instances; extend signature OR resolve level at the call site in `complete-focus-session.ts:193`.

**Bloom (A3 — more activation/momentum per Bloom, NOT feeding `activationBonusPercent`):**
- Edit site: `applyBloom` (`bloom.ts:27-42`). Lines 32-38 currently add `+1` to `activation` and `momentum`. Change to `+1 + bloomLevel` (resolve via the owning Bloom module's `level`).
- ⚠ `applyBloom(cell, localDate)` does not take a `level` param — extend the signature to `applyBloom(cell, localDate, bloomLevel)` and update the call site at `complete-focus-session.ts:178`.

---

### `src/content/formulas.ts` + `src/content/index.ts` — add constants

**Self-analog:** Phase 4 added `ACTIVATION_BOOST_*` constants (`formulas.ts:46-50`) and re-exported them through the barrel (`index.ts:13-16`).

Add (in `formulas.ts` or in a new `forge.ts` then re-export):
```typescript
// Phase 5: Module Forge constants (D-02/D-04/D-05). Content-tunable.
export const FORGE_ENERGY_BASE = 50;
export const FORGE_ENERGY_STEP = 25;
export const MODULE_MAX_LEVEL = 3;

export function forgeEnergyCost(forgeCount: number): number {
  return FORGE_ENERGY_BASE + forgeCount * FORGE_ENERGY_STEP;
}
```
Re-export through `src/content/index.ts` by adding to the existing `formulas.js` re-export block (lines 12-40).

---

### `src/persistence/database.ts` — v3→v4 schema bump

**Self-analog (near-clone):** v2→v3 `upgradeCoresV2ToV3` (lines 84-94) + `version(3).stores({…}).upgrade(…)` (lines 155-168).

**Extracted transform template** (`database.ts:84-94`):
```typescript
export function upgradeCoresV2ToV3(
  core: Record<string, unknown>,
): Record<string, unknown> {
  if (core.activationBoostLevel === undefined) {
    core.activationBoostLevel = CORE_V3_DEFAULTS.activationBoostLevel;
  }
  if (core.activeRejuvenationStartedAt === undefined) {
    core.activeRejuvenationStartedAt = CORE_V3_DEFAULTS.activeRejuvenationStartedAt;
  }
  return core;
}
```
**Add (mirror)**:
```typescript
export const FORGE_HISTORY_V4_DEFAULTS = {
  paymentType: 'token',
  paymentAmount: 0,
  offeredChoices: [],
  chosenReward: null,
} as const;

export function upgradeForgeHistoryV3ToV4(
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (row.paymentType === undefined) row.paymentType = FORGE_HISTORY_V4_DEFAULTS.paymentType;
  if (row.paymentAmount === undefined) row.paymentAmount = FORGE_HISTORY_V4_DEFAULTS.paymentAmount;
  if (row.offeredChoices === undefined) row.offeredChoices = FORGE_HISTORY_V4_DEFAULTS.offeredChoices;
  if (row.chosenReward === undefined) row.chosenReward = FORGE_HISTORY_V4_DEFAULTS.chosenReward;
  return row;
}
```

**Version declaration template** (`database.ts:155-168`) — **copy the FULL store set verbatim** (Dexie requires it; RESEARCH Pitfall 5):
```typescript
this.version(4).stores({
  client: 'id',
  cells: 'id',
  core: 'id',
  moduleInstances: 'id, ownerCellId',
  routes: 'id, sourceCellId',
  sessions: 'id, cellId, startedAt',
  operations: 'id, status, createdAt',
  settings: 'id',
  forgeHistory: 'id, createdAt',   // indexes unchanged (D-09 adds fields, not indexes)
  rejuvenations: 'id, createdAt',
}).upgrade(async (tx) => {
  await tx.table('forgeHistory').toCollection().modify(upgradeForgeHistoryV3ToV4);
});
```
The `.upgrade()` MUST exist even though the store is empty pre-Phase-5 (mirrors v2/v3 always including `.upgrade`; lets the harness exercise the transform).

---

### `src/persistence/validation-schemas.ts` — widen `forgeHistorySchema` + drift guard

**Self-analog:** Phase 4's `rejuvenationSchema` (lines 121-130) + drift guard (lines 175-176).

**Current** (`validation-schemas.ts:112-116`):
```typescript
export const forgeHistorySchema = z.object({
  id: z.string(),
  forgeCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
```
**Widen** (mirror `rejuvenationSchema` field-for-field with the new domain shape):
```typescript
export const forgeHistorySchema = z.object({
  id: z.string(),
  forgeCount: z.number().int().nonnegative(),
  paymentType: z.enum(['token', 'energy']),
  paymentAmount: z.number().int().nonnegative(),
  offeredChoices: z.array(z.object({ cellId: z.string(), moduleKind: z.string() })),
  chosenReward: z.object({
    cellId: z.string(),
    moduleKind: z.string(),
    fromLevel: z.number().int().nonnegative(),
    toLevel: z.number().int().nonnegative(),
  }),
  createdAt: z.string().datetime(),
});
```
**Add drift guard** (mirror lines 175-176):
```typescript
import type { ForgeHistoryRecord, RejuvenationRecord, SessionRecord, SyncOperation } from '../domain/index.js';
// …
const _forgeHistorySchemaCheck =
  null as unknown as z.infer<typeof forgeHistorySchema> satisfies ForgeHistoryRecord;
void _forgeHistorySchemaCheck;
```
**Pitfall 6:** forgetting this guard lets the schema silently drift from the domain record.

---

### `src/app/store/flowgrid-store.ts` — add `lastCompletedForge` field

**Self-analog:** `lastCompletedRejuvenation` (lines 51-54 + initial-state line 75).

```typescript
import type {
  FlowgridSnapshot, ForgeHistoryRecord, IsoDateTimeString,
  RejuvenationRecord, SessionRecord, VisualEvent,
} from '../../domain/index.js';

// In FlowgridState (after line 54):
readonly lastCompletedForge: ForgeHistoryRecord | null;

// In initial state (after line 75):
lastCompletedForge: null,
```

---

### `src/app/store/dispatch.ts` — add `captureCompletedForge`

**Self-analog:** `captureCompletedRejuvenation` (lines 139-148) + dispatch spread (lines 107, 116).

**Copy verbatim and swap types** (lines 139-148):
```typescript
function captureCompletedForge(
  command: SimulationCommand,
  result: SimulationResult,
): ForgeHistoryRecord | undefined {
  if (command.type !== 'run_forge') return undefined;
  const rows = result.nextState.forgeHistory;
  const matched = rows.find((r) => r.id === command.operationId);
  if (matched !== undefined) return matched;
  return rows[rows.length - 1];
}
```
**Wire into dispatch setState** (mirror lines 106-107, 115-117):
```typescript
const lastCompletedSession = captureCompletedSession(command, result);
const lastCompletedRejuvenation = captureCompletedRejuvenation(command, result);
const lastCompletedForge = captureCompletedForge(command, result);
flowgridStore.setState((s) => ({
  // … existing fields …
  ...(lastCompletedSession !== undefined ? { lastCompletedSession } : {}),
  ...(lastCompletedRejuvenation !== undefined ? { lastCompletedRejuvenation } : {}),
  ...(lastCompletedForge !== undefined ? { lastCompletedForge } : {}),
}));
```
Also clear in `hydrateStoreForTests` (line 158) and `initApp` (line 187): add `lastCompletedForge: null,`.

---

### `src/app/routes.tsx` — add `/forge` route

**Self-analog:** `/core` route entry (lines 19-22).

```typescript
import { ForgePanel } from '../ui/forge-panel/ForgePanel.js';

// Add to router array (peer to /core):
{
  path: '/forge',
  element: <ForgePanel />,
},
```

---

### `src/ui/flowgrid-home/ReturnCues.tsx` — add Forge chip (D-12)

**Self-analog:** near-Bloom tappable chip (lines 39-48, 66-74) + actionable-state booleans (lines 33-35).

**Readiness boolean** (extend lines 33-35):
```typescript
const hasTokens = core.moduleTokens > 0;
// Phase 5 / D-12:
const nextForgeEnergyCost = forgeEnergyCost(core.forgeCount);
const canForge = hasTokens || core.energy >= nextForgeEnergyCost;
```
**Tappable navigate chip** (copy lines 66-74, swap target + label):
```typescript
{canForge ? (
  <button
    type="button"
    onClick={() => navigate('/forge')}
    className="text-sm text-core underline"
  >
    Forge ready
  </button>
) : null}
```
Update the "render nothing when no actionable state" guard at line 51 to include `&& !canForge`.
**Pitfall 7:** the chip lives in the ReturnCues rail (above the canvas) — never inside CellBoard or GeneratorTile.

---

### `src/ui/cell-board/CellBoard.tsx` — pass `level` + effect to `ModuleTile` (D-13)

**Self-analog:** `STARTER_TILES` spec (lines 29-50) + `ModuleTile` render loop (lines 103-112).

The render loop currently passes only `kind`/`label`/`description`. Extend it to also resolve each module's `level` (via `findModuleInstanceForCell`) and per-level effect (via `moduleLevelBonus` from content):
```typescript
{STARTER_TILES.map((tile) => {
  const instance = findModuleInstanceForCell(snapshot, cellId, tile.kind);
  const level = instance?.level ?? 0;
  return (
    <ModuleTile
      key={tile.kind}
      kind={tile.kind}
      label={tile.label}
      description={tile.description}
      level={level}                              // ← new
      levelEffect={moduleLevelBonus(tile.kind, level)}  // ← new (pure content fn)
    />
  );
})}
```

---

### `src/ui/cell-board/ModuleTile.tsx` — render level badge + effect

**Self-analog:** existing tile body (lines 26-34) — extend the props + JSX.

```typescript
interface ModuleTileProps {
  readonly kind: ModuleDefinitionKind;
  readonly label: string;
  readonly description: string;
  readonly level: number;          // ← new
  readonly levelEffect: number;    // ← new (the active bonus magnitude)
}

export function ModuleTile({ kind, label, description, level, levelEffect }: ModuleTileProps) {
  const Icon = KIND_ICONS[kind];
  return (
    <div role="group" aria-label={label} className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
      <h2 className="text-base font-semibold text-slate-100">{label} · Lv {level}</h2>
      <Icon aria-hidden="true" data-testid={`module-tile-icon-${kind}`} className="h-8 w-8 text-core" />
      <p className="text-sm text-slate-400">{description}</p>
      <p className="text-xs text-slate-500">+{levelEffect}% per level · current bonus +{levelEffect * level}%</p>
    </div>
  );
}
```
(Exact label/effect phrasing is Agent's Discretion; the structure follows the existing accessible semantic tile.)

---

## Shared Patterns

### Atomic command shape (apply to: `run-forge.ts` only — but the template is universal)

**Source:** `src/simulation/commands/log-rejuvenation.ts` (full file) + `purchase-activation-boost.ts`.
**Shape:** `validate → derive-from-monotonic-counter → apply → append-record → emit-operation-and-economy-events → return SimulationResult`. Always single command, single operation, single history row. Rejected results write nothing durable. Never throw for domain invalidity — return structured `ValidationIssue[]`.

### `rejectWith` helper (apply to: every command handler)

**Source:** `log-rejuvenation.ts:44-57`, `purchase-activation-boost.ts:22-35`, `start-rejuvenation.ts:21-34` — **identical** across all three. Copy verbatim into `run-forge.ts`.

### Integer discipline (apply to: all per-level bonuses, Energy cost, payment math)

**Source:** `complete-focus-session.ts:164-166` + `formulas.ts:107-118`.
```typescript
// Multiply-then-floor — NEVER floats, NEVER Math.round.
const currentGenerated = baseCurrent + Math.floor((baseCurrent * bonusPct) / 100);
```
**Warning sign:** any `* 1.x` float multiplier; any `Math.round`.

### Idempotent record id (apply to: `ForgeHistoryRecord.id`)

**Source:** `log-rejuvenation.ts:129` + `complete-focus-session.ts:199`.
```typescript
const record: RejuvenationRecord = { id: command.operationId, /* … */ };
```
`ForgeHistoryRecord.id = command.operationId` — the linchpin of replay idempotency (Phase 2 D-04). Repository's `idempotentAppend` + `diffAppend` (`diff.ts:85-88, 100`) handle the dedup automatically.

### `operationFromCommand` (apply to: `run_forge` — no change needed)

**Source:** `src/simulation/operation-events.ts:31-32, 64-65`.
The existing exhaustive switch **already** routes `run_forge` → `entityType: 'forge_history'`. No change needed unless the planner wants to populate the operation `payload` (the handler does this via the `options.payload` argument — mirror `log-rejuvenation.ts:139-149`).

### Diff-write (apply to: widened `ForgeHistoryRecord` — automatic, no code change)

**Source:** `src/persistence/diff.ts:85-88, 100`.
```typescript
function diffAppend<T>(previous, next, idOf): readonly T[] {
  const previousIds = new Set(previous.map(idOf));
  return next.filter((record) => !previousIds.has(idOf(record)));
}
// …
const appendForgeHistory = diffAppend(previous.forgeHistory, next.forgeHistory, (f) => f.id);
```
The diff keys on `id` only — widening the record shape needs **zero** diff logic change. Same for repository's `idempotentAppend` and the export/import archive envelope (which already carries `forgeHistory`).

### Store-field-clears-on-next-dispatch (apply to: `lastCompletedForge`)

**Source:** `dispatch.ts:106-117` + `flowgrid-store.ts:51-54, 75`.
The inline summary persists until the NEXT dispatch supersedes it (no auto-dismiss, no dismiss button — D-11). The setState spread with the `undefined`-guard pattern (lines 115-117) handles the "next dispatch clears it" semantic automatically.

### Inline-summary-not-modal (apply to: `ForgeSummary`)

**Source:** `RejuvenationSummary.tsx:1-8` (comment) + `CorePanel.tsx:271-274` (mount site).
**Rule:** modals obstruct the protected `open app → tap Cell → start session` flow. The summary is an inline `<section role="status" aria-live="polite">` mounted by the parent route while the store field is non-null.

---

## No Analog Found

**None.** Every file in Phase 5 has at least a role-match analog. This is a pure-continuation phase — the planner should treat every new file as a near-clone of its analog and every modification as a Phase-4-style in-place extension.

The only genuinely new logic (per RESEARCH.md "Don't Hand-Roll" table, line 276):
1. The `forgeChoices` selection algorithm (partial Fisher-Yates over the curated pool) — composite of `createRng` + `findModuleInstanceForCell` + a standard algorithm.
2. The per-level-effect reads in the three underspecified systems (Charge Core / Output / Bloom — RESEARCH Open Question #1 / Pitfalls A1–A3 — **resolve before implementation**).
3. The `MODULE_LEVEL_BONUS` content numbers (pure content-tunable values).

---

## Metadata

**Analog search scope:**
- `src/domain/` (records, result, validation, invariants, ids)
- `src/simulation/` (engine, commands/*, systems/*, economy-events, operation-events, selectors)
- `src/content/` (formulas, starter-state, starter-modules, index)
- `src/persistence/` (database, diff, validation-schemas)
- `src/app/` (rng, routes, store/dispatch, store/flowgrid-store)
- `src/ui/` (core-panel/*, flowgrid-home/ReturnCues, cell-board/*)
- `tests/` (simulation/*, properties/*, persistence/migration-harness)

**Files scanned:** ~30 source + test files (every analog cited in CONTEXT.md `canonical_refs` and RESEARCH.md `State of the Art`).

**Pattern extraction date:** 2026-06-25

## PATTERN MAPPING COMPLETE

**Phase:** 5 - Module Forge and Starter Customization
**Files classified:** 23 (9 new + 14 modified)
**Analogs found:** 23 / 23

### Coverage
- Files with exact analog: 21 (near-clone or self-analog with Phase 4 block as template)
- Files with role-match analog: 2 (`ForgeChoiceList.tsx` ← `ModuleTile.tsx`; `forge-choices.test.ts` ← `rejuvenation.test.ts`)
- Files with no analog: 0

### Key Patterns Identified
- **Atomic command + pure selector split (D-06):** `run_forge` is a near-clone of `log_rejuvenation`; `forgeChoices` is a pure derivation seeded from `forgeCount` (NEVER `env.rng`) — mirrors `nextIntegrationThreshold` derivation discipline.
- **Phase 4 in-place extension template:** every modified file has a same-file Phase 4 block to copy (`LogRejuvenationCommand` extension, `rejuvenationSchema`, `captureCompletedRejuvenation`, `lastCompletedRejuvenation`, `upgradeCoresV2ToV3`, `/core` route, near-Bloom ReturnCues chip, `RejuvenationSummary`).
- **Integer multiply-then-floor discipline:** all per-level bonuses follow `complete-focus-session.ts:164-166` (`Math.floor((base * pct) / 100)`); no floats, no `Math.round`.
- **Idempotent record id (`operationId` 1:1):** `ForgeHistoryRecord.id = command.operationId` — diff/repository/export/import pick up the widened shape with zero logic change.
- **Inline-summary-not-modal:** `ForgeSummary` mirrors `RejuvenationSummary`; the protected Generator flow stays unobstructed.
- **Dexie full-store-set repetition:** `version(4).stores({...full set...}).upgrade(...)` — copy v3 verbatim, include `.upgrade()` even on the empty store (RESEARCH Pitfall 5).

### ⚠ Open Items Surfaced for the Planner
1. **RESEARCH Open Question #1 (D-04 per-level effects for Charge Core / Output / Bloom) is UNRESOLVED** — three of four systems have no clean knob; the planner should resolve A1/A2/A3 with the user (or pick + document) before implementing those three system edits. Generator's `+X% Current` is unambiguous (mirror `activationBonusPercent`).
2. **Test layout correction:** RESEARCH suggested `tests/simulation/commands/`; the actual convention is flat `tests/simulation/{name}.test.ts`.
3. **System function signatures may need extending:** `applyBloom(cell, localDate)`, `routeCurrentThroughRoutes(current, routes)`, and `applyCoreAllocation(core, incomingCurrent)` don't currently take a module `level` — the planner must extend them (or thread the level from `complete-focus-session.ts` which is the only caller).

### File Created
`/Users/eggfam/dev/flowgrid/.planning/phases/05-module-forge-and-starter-customization/05-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns + line ranges directly in PLAN.md actions.
