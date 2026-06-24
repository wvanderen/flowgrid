# Phase 4: Core Alternation and Rejuvenation Economy - Pattern Map

**Mapped:** 2026-06-24
**Files analyzed:** 33 (new + modified + extended tests)
**Analogs found:** 33 / 33 (exact or role-match — this is a pure codebase-extension phase; every new/modified file has a direct in-tree analog)

> Phase 4 adds **no new packages and no new external patterns**. Every file below is an extension of a Phase 1–3 analog that already proves the pattern. The planner can translate each analog's structure directly into the new file with mechanical deltas.

---

## File Classification

### NEW files (created this phase)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/simulation/commands/log-rejuvenation.ts` | command handler (simulation) | request-response (deterministic economy transform) | `src/simulation/commands/complete-focus-session.ts` | exact (finish-session pattern: derive duration → mutate economy → append record → emit events) |
| `src/simulation/commands/start-rejuvenation.ts` | command handler (simulation) | request-response (set marker) | `src/simulation/commands/start-focus-session.ts` | exact (set active-session marker + mutual exclusion) |
| `src/simulation/commands/cancel-rejuvenation.ts` | command handler (simulation) | request-response (clear marker, no-op durable) | `src/simulation/commands/cancel-focus-session.ts` | exact (clear marker, write nothing durable) |
| `src/simulation/commands/purchase-activation-boost.ts` | command handler (simulation) | request-response (validate cost/cap → mutate → emit) | `src/simulation/commands/set-core-allocation.ts` | exact (simplest validate→apply→emit→return on CoreRecord) |
| `src/simulation/systems/rejuvenation.ts` | pure system function (simulation) | pure transform | `src/simulation/systems/core-allocation.ts` | exact (pure integer-math helper over a CoreRecord) |
| `src/ui/core-panel/CorePanel.tsx` | React component (ui) | request-response (reads snapshot, dispatches commands) | `src/ui/cell-board/CellBoard.tsx` + `src/ui/flowgrid-home/FlowgridHome.tsx` | role-match (route component reading store + rendering child panels) |
| `src/ui/core-panel/RejuvenationSummary.tsx` | React component (ui) | render snapshot data (inline panel, persists) | `src/ui/session-summary/SessionSummary.tsx` | exact (inline completion panel reading `lastCompleted*` store field) |
| `src/ui/core-panel/RejuvenationTimer.tsx` | React component (ui) | cosmetic timer (setInterval display only) | `src/ui/cell-board/SessionTimer.tsx` | exact (cosmetic `setInterval` decoupled from durable truth) |
| `src/ui/core-panel/nextCoreAction.ts` | pure selector (ui) | pure transform | `src/ui/session-summary/nextAction.ts` | exact (pure value-in/value-out next-action string) |
| `src/ui/flowgrid-home/ReturnCues.tsx` | React component (ui) | render snapshot-derived booleans → stat-chip rail | `src/ui/flowgrid-home/FlowgridHome.tsx` + `src/ui/cell-board/ResumeSessionPrompt.tsx` | role-match (mounts on Home; reuses `text-sm text-slate-400` chip idiom + Radix patterns) |
| `tests/simulation/rejuvenation.test.ts` | test | unit/integration (command handler) | `tests/simulation/session-lifecycle.test.ts` | exact (start/cancel/log handler + replay + invariant checks) |
| `tests/simulation/activation-boost.test.ts` | test | unit (command handler + bonus derivation) | `tests/simulation/activation-bonus.test.ts` | exact (cost/cap/replay assertions over complete_focus_session bonus) |
| `tests/properties/rejuvenation-safety.property.test.ts` | test | property (invariants after random sequences) | `tests/properties/economy-safety.property.test.ts` | exact (fast-check over a command, asserts no-negative + monotonic) |

### MODIFIED files (extended this phase)

| Modified File | Role | Data Flow | Closest Analog (the same file's existing structure) | Match Quality |
|---------------|------|-----------|-----------------------------------------------------|---------------|
| `src/domain/records.ts` | model (domain) | structural (durable record shapes) | itself — `CoreRecord` (lines 54–65), `SessionRecord` (103–116), `FlowgridSnapshot` (132–142) | exact (add fields to CoreRecord; add RejuvenationRecord parallel to SessionRecord; add `rejuvenations` array parallel to `sessions`) |
| `src/domain/result.ts` | model (domain) | structural (command + event contracts) | itself — `LogRejuvenationCommand` (51–55, to refactor), `StartFocusSessionCommand` (104–108), `CancelFocusSessionCommand` (110–114), `SimulationCommand` union (116–127), `ECONOMY_EVENT_NAMES` (155–165) | exact (add 3 command interfaces; add to union; add event name constants) |
| `src/domain/ids.ts` | model (domain) | structural (typed ID + EntityType union) | itself — `SessionId`/`ForgeHistoryId` (lines 17–20), `EntityType` (23–34) | exact (add `RejuvenationId`; add `'rejuvenation'` to EntityType) |
| `src/domain/invariants.ts` | invariant checker (domain) | pure validation | itself — `validateMonotonicCounters` (213–229), `validateNoNegativeResources` core block (63–76) | exact (extend monotonic checks; add `activationBoostLevel` to non-negative block) |
| `src/content/formulas.ts` | content constants + pure functions | pure transform | itself — `ACTIVATION_CURRENT_BONUS_PERCENT` (26), `splitCoreCurrent` (59–69) | exact (add constants + derived-threshold/bonus functions) |
| `src/content/starter-state.ts` | content factory | pure factory | itself — `core:` seed block (107–118) | exact (add the 2 new fields to the seeded CoreRecord) |
| `src/content/index.ts` | barrel (content) | re-export | itself (lines 12–31) | exact (add new exports to the formulas re-export block) |
| `src/simulation/engine.ts` | dispatcher (simulation) | request-response (exhaustive switch) | itself — switch (32–55) + `logRejuvenationNotImplemented` (58–68) | exact (add 3 new cases; replace stub call with real handler) |
| `src/simulation/commands/complete-focus-session.ts` | command handler (simulation) | request-response (economy transform) | itself — bonus derivation (155–162) | exact (change bonus percent to `activationBonusPercent(core.activationBoostLevel)`) |
| `src/simulation/economy-events.ts` | event helper (simulation) | pure constructor | itself — `make()` helper (19–27) + `focusSessionCompletedEvent` (29–39) | exact (add `rejuvenationCompletedEvent`/`tokenGrantedEvent`/`activationBoostPurchasedEvent` constructors) |
| `src/simulation/visual-events.ts` | event helper (simulation) | pure constructor | itself — same `make`-style constructors | role-match (optional new visual events; dropped/logged per Phase 3 D-02) |
| `src/simulation/operation-events.ts` | event helper (simulation) | pure constructor (exhaustive switch) | itself — `entityTypeForCommand` (17–42) + `entityIdForCommand` (44–69) | exact (add 4 new command cases to both exhaustive switches; compile-error forces coverage) |
| `src/persistence/database.ts` | migration (persistence) | file I/O (Dexie schema upgrade) | itself — `upgradeCellsV1ToV2` (54–64) + `version(2).stores(...).upgrade(...)` (99–111) | exact (extract `upgradeCoresV2ToV3`; add `version(3)` repeating all stores verbatim + `rejuvenations`) |
| `src/persistence/diff.ts` | diff (persistence) | pure transform | itself — `FlowgridWritePlan` (28–41) + `diffAppend` (82–85) + `diffFlowgridSnapshots` (87–133) | exact (add `appendRejuvenations` to plan + EMPTY_PLAN + diff + isEmpty check) |
| `src/persistence/repository.ts` | repository (persistence) | file I/O (Dexie transaction) | itself — `ALL_STORE_NAMES` (42–52) + `applyResult` transaction (99–122) + `loadSnapshot` (132–171) | exact (add `'rejuvenations'` to store list; add `idempotentAppend` loop in tx; add `db.rejuvenations.toArray()` in load) |
| `src/persistence/export-json.ts` | export (persistence) | file I/O (read-all → envelope) | itself — `JsonArchive` (40–52) + `exportJson` Promise.all (54–66) | exact (add `rejuvenations` to archive interface + export Promise.all; bump `ARCHIVE_VERSION` to 2) |
| `src/persistence/import.ts` | import (persistence) | file I/O (validate → replace/merge) | itself — `ImportStats` (27–37) + `ALL_STORE_NAMES` (44–54) + replace/merge tx (113–168) | exact (add `rejuvenations` to stats + store list + both tx branches) |
| `src/persistence/validation-schemas.ts` | Zod schemas (persistence) | structural (boundary validation) | itself — `coreSchema` (51–62), `sessionSchema` (84–97), `archiveSchema` (125–137), drift-guard pattern (149–155) | exact (add `activationBoostLevel`+`activeRejuvenationStartedAt` to coreSchema; add `rejuvenationSchema`; add `rejuvenations` to archiveSchema + bump `archiveVersion`) |
| `src/app/store/flowgrid-store.ts` | store state (app) | structural (view/session coordination) | itself — `FlowgridState` (28–52), `ActiveSessionMarker` (21–24), `createStore` seed (54–62) | exact (add `lastCompletedRejuvenation` + `activeRejuvenation` fields; seed both null) |
| `src/app/store/dispatch.ts` | dispatch (app) | request-response (UI → engine → repo → store) | itself — `deriveActiveSession` (44–52), `captureCompletedSession` (109–118), `initApp` (138–162) | exact (add `captureCompletedRejuvenation` + `deriveActiveRejuvenation`; extend `setState` spread + `initApp`) |
| `src/app/routes.tsx` | route table (app) | structural (router config) | itself (lines 9–17) | exact (add a `{ path: '/core', element: <CorePanel /> }` entry) |

### EXTENDED tests

| Extended Test File | Role | Data Flow | Analog (same file's existing patterns) | Match Quality |
|--------------------|------|-----------|----------------------------------------|---------------|
| `tests/persistence/migration-harness.test.ts` | test | unit (extracted-transform fixture) | itself — `runMigrationFixture` D-10 block (63–130) | exact (add `upgradeCoresV2ToV3` fixture) |
| `tests/persistence/repository.test.ts` | test | integration (fake-indexeddb) | itself | exact (add rejuvenations diff-write + idempotent append case) |
| `tests/persistence/schema.test.ts` | test | unit (Dexie store declaration) | itself | exact (assert v3 includes `rejuvenations` store) |
| `tests/persistence/export-json.test.ts` / `import-*.test.ts` | test | integration (round-trip) | itself | exact (add `rejuvenations` round-trip + v1→v2 archive transform case) |
| `tests/simulation/boundaries.test.ts` | test | static (boundary scanner) | itself — `scanLayer` + `FORBIDDEN_RULES` (54–80) | exact (no code change needed; scanner auto-covers new `src/simulation/commands/*.ts` files) |

---

## Pattern Assignments

### `src/simulation/commands/log-rejuvenation.ts` (command handler, request-response)

**Analog:** `src/simulation/commands/complete-focus-session.ts` (the finish-session pattern) + `set-core-allocation.ts` (the simplest apply→emit→return shape)

**Imports pattern** — copy from `complete-focus-session.ts` lines 13–54:
```typescript
import type {
  CoreRecord,
  LogRejuvenationCommand,
  EconomyEvent,
  FlowgridSnapshot,
  RejuvenationRecord,           // NEW (this phase)
  SimulationEnv,
  SimulationResult,
  ValidationIssue,
  VisualEvent,
} from '../../domain/index.js';

import { ECONOMY_EVENT_NAMES } from '../../domain/index.js';
import { /* new event helpers */ } from '../economy-events.js';
import { operationFromCommand } from '../operation-events.js';
import {
  REJUVENATION_CHARGE_PER_MINUTE,        // NEW
  nextIntegrationThreshold,              // NEW
} from '../../content/index.js';
```

**rejectWith helper** — copy verbatim from `complete-focus-session.ts` lines 56–69 (also present in `set-core-allocation.ts` 34–44 inline):
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

**Duration derivation** — copy from `complete-focus-session.ts` lines 109–118 (validation) + `GeneratorTile.tsx` lines 102–104 (the `(endedAt - startedAt)/1000` floor):
```typescript
// Derive duration from startedAt/endedAt (D-04: diff for truth).
const durationSeconds = Math.floor(
  (new Date(command.endedAt).getTime() - new Date(command.startedAt).getTime()) / 1000,
);
const durationMinutes = Math.floor(durationSeconds / 60);
```

**Core record mutation pattern** — copy the immutable-spread idiom from `complete-focus-session.ts` lines 191–192 + 230–237:
```typescript
const newCore: CoreRecord = { ...coreAfterCharge, updatedAt: env.now };
const nextState: FlowgridSnapshot = {
  ...previousState,
  core: newCore,
  rejuvenations: [...previousState.rejuvenations, record],   // NEW (parallel to sessions)
  operations: [...previousState.operations, operation],
  client: { ...previousState.client, updatedAt: env.now },
};
```

**Record-append pattern (id 1:1 with operationId)** — copy from `complete-focus-session.ts` lines 195–209:
```typescript
const recordId = command.operationId;   // 1:1 with operationId (idempotent replay)
const record: RejuvenationRecord = {
  id: recordId,
  startedAt: command.startedAt,
  endedAt: command.endedAt,
  durationSeconds,
  chargeConsumed,
  integrationGained,
  tokensGranted,
  createdAt: env.now,
};
```

**Operation emission** — copy from `set-core-allocation.ts` lines 54–57:
```typescript
const operation = operationFromCommand(command, env.now, {
  entityId: previousState.core.id,
  payload: { durationSeconds, chargeConsumed, integrationGained, tokensGranted },
});
```

---

### `src/simulation/commands/start-rejuvenation.ts` (command handler, request-response — set marker)

**Analog:** `src/simulation/commands/start-focus-session.ts` (exact structural parallel: validate → check mutual exclusion → set marker → emit one operation)

**Imports pattern** — copy from `start-focus-session.ts` lines 8–17 (adapt `StartFocusSessionCommand`→`StartRejuvenationCommand`, drop `CellId`/`CellRecord` since marker is on Core).

**Mutual-exclusion scan** — copy the "scan all X for a non-null marker" loop from `start-focus-session.ts` lines 62–78, generalized for BOTH markers (D-02 / Pitfall 2):
```typescript
// start_rejuvenation rejects if ANY cell has activeSessionStartedAt OR core already has activeRejuvenationStartedAt.
for (const [id, cell] of previousState.cells) {
  if (cell.activeSessionStartedAt !== null) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'cell',
      entityId: id,
      message: `start_rejuvenation: a focus session is already active on cell ${id}.`,
      path: 'state.cells.activeSessionStartedAt',
    });
  }
}
if (previousState.core.activeRejuvenationStartedAt !== null) {
  issues.push({ /* "rejuvenation already in progress" */ });
}
```

**Set-marker mutation** — copy from `start-focus-session.ts` lines 84–96 (swap cells Map mutation for a core spread):
```typescript
const newCore: CoreRecord = {
  ...previousState.core,
  activeRejuvenationStartedAt: env.now,
  updatedAt: env.now,
};
const operation = operationFromCommand(command, env.now, {
  entityId: previousState.core.id,
  payload: { activeRejuvenationStartedAt: env.now },
});
return { status: 'applied', previousState, nextState: { ...previousState, core: newCore, operations: [...previousState.operations, operation], client: { ...previousState.client, updatedAt: env.now } }, economyEvents: [], visualEvents: [], operations: [operation], validationIssues: [] };
```

**⚠ ALSO MODIFY `start-focus-session.ts`** to add the symmetric check (Pitfall 2): reject if `previousState.core.activeRejuvenationStartedAt !== null`. Insert after the existing cell-scan block (line 78).

---

### `src/simulation/commands/cancel-rejuvenation.ts` (command handler, request-response — clear marker)

**Analog:** `src/simulation/commands/cancel-focus-session.ts` (exact parallel: clear marker, write NOTHING durable beyond the diff)

**Copy verbatim** the structure from `cancel-focus-session.ts` lines 41–98, swapping:
- `cancelFocusSession` → `cancelRejuvenation`
- `previousState.cells.get(command.cellId)` → `previousState.core`
- the `activeSessionStartedAt === null` rejection → `activeRejuvenationStartedAt === null`
- the cells Map mutation → a core spread setting `activeRejuvenationStartedAt: null`

**The critical contract** (from `cancel-focus-session.ts` lines 88–97) — cancel returns `status: 'applied'` but emits NO operation/event/record:
```typescript
// D-07 / Pitfall 6: NO operation, NO economy event, NO visual event, NO record.
return {
  status: 'applied',
  previousState,
  nextState,
  economyEvents: [],
  visualEvents: [],
  operations: [],
  validationIssues: [],
};
```

---

### `src/simulation/commands/purchase-activation-boost.ts` (command handler, request-response — validate cost/cap)

**Analog:** `src/simulation/commands/set-core-allocation.ts` (the simplest validate→apply→emit→return on CoreRecord)

**Copy the full file structure** from `set-core-allocation.ts` (73 lines total). It is the canonical minimal-command template: imports → `issues: ValidationIssue[] = []` → validation → `if (issues.length > 0) return {rejected}` → core spread → `operationFromCommand` → `return {applied}`.

**Validation block** — copy the shape from `set-core-allocation.ts` lines 20–44 (adapt conditions to cost/cap):
```typescript
const level = previousState.core.activationBoostLevel;
const cost = activationBoostCost(level);   // returns null if at cap (new content fn)
if (cost === null) {
  issues.push({
    code: 'invalid_reference',      // A5: reuse the input-error fallback code
    severity: 'error',
    entityType: 'core',
    entityId: previousState.core.id,
    message: `purchase_activation_boost: Core is already at the maximum boost level (3).`,
    path: 'state.core.activationBoostLevel',
  });
} else if (previousState.core.energy < cost) {
  issues.push({ code: 'invalid_reference', /* "energy below cost" */ });
}
```

**Core mutation** — copy the immutable-spread from `set-core-allocation.ts` lines 48–53:
```typescript
const newCore = {
  ...previousState.core,
  energy: previousState.core.energy - cost,
  activationBoostLevel: level + 1,
  updatedAt: env.now,
};
```

---

### `src/simulation/systems/rejuvenation.ts` (pure system function, transform)

**Analog:** `src/simulation/systems/core-allocation.ts` (pure integer-math helper over a CoreRecord, returns an outcome type)

**Copy the file shape** from `core-allocation.ts` lines 1–39: header comment → `import type { CoreRecord, IntNonNegative } from '../../domain/index.js'` → `import { nextIntegrationThreshold } from '../../content/index.js'` → exported pure function returning an outcome object.

**Threshold-grant loop** — implement per SPEC R4 + RESEARCH "Don't Hand-Roll" (derive from monotonic counter, bounded):
```typescript
export type RejuvenationPayout = {
  readonly chargeConsumed: IntNonNegative;
  readonly integrationGained: IntNonNegative;
  readonly tokensGranted: IntNonNegative;
};

export function computeRejuvenationPayout(
  coreCharge: IntNonNegative,
  durationMinutes: number,
): RejuvenationPayout {
  const chargeProcessedRaw = Math.min(
    coreCharge,
    Math.floor(durationMinutes * REJUVENATION_CHARGE_PER_MINUTE),
  );
  const integrationGained = Math.floor(chargeProcessedRaw / 2);
  const chargeConsumed = integrationGained * 2;   // retain odd remainder (Pitfall 3)

  // Threshold grant loop (Pitfall 4: derived threshold advances as tokens++).
  let moduleTokens = 0;
  while (integrationGained >= nextIntegrationThreshold(moduleTokens)) {
    moduleTokens += 1;
  }
  return { chargeConsumed, integrationGained, tokensGranted: moduleTokens };
}
```

> Alternatively fold these functions into `src/content/formulas.ts` alongside `splitCoreCurrent` (RESEARCH notes "or fold into formulas.ts"). The `core-allocation.ts`-as-separate-module split is the closer structural analog either way.

---

### `src/ui/core-panel/CorePanel.tsx` (React component, request-response)

**Analog:** `src/ui/flowgrid-home/FlowgridHome.tsx` (route component reading the store) + `src/ui/cell-board/GeneratorTile.tsx` (dispatch lifecycle for start/finish/cancel)

**Store-binding pattern** — copy from `FlowgridHome.tsx` lines 28–30:
```typescript
const status = useFlowgridStore((s) => s.status);
const snapshot = useFlowgridStore((s) => s.snapshot);
const lastError = useFlowgridStore((s) => s.lastError);
```

**Dispatch pattern** — copy from `GeneratorTile.tsx` lines 52–61 (build env + command + `void dispatch(...)`):
```typescript
const handleStartRejuvenation = () => {
  if (snapshot === null) return;
  const env = buildSessionEnv(snapshot.settings.localDayBoundary);
  const command: StartRejuvenationCommand = {
    type: 'start_rejuvenation',
    operationId: crypto.randomUUID(),
  };
  void dispatch(command, env, repository);
};
```

**Six-piece surface** (CORE-05) — copy the semantic-controls + `dl`/`dt`/`dd` stat grid from `SessionSummary.tsx` lines 50–86:
```tsx
<section aria-label="Core" className="rounded-lg border border-core/50 bg-flowgrid-surface p-4 space-y-3">
  <h2 className="text-lg font-semibold text-core">Core</h2>
  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <div className="rounded-md bg-slate-900/40 p-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Energy</dt>
      <dd className="mt-1 text-base font-semibold text-slate-100">{snapshot.core.energy}</dd>
    </div>
    {/* ... Core Charge, Integration (current/next), Module Tokens, Allocation ... */}
  </dl>
</section>
```

**Rejection surfacing** — copy from `GeneratorTile.tsx` lines 90–94 (`lastRejection` render).

---

### `src/ui/core-panel/RejuvenationSummary.tsx` (React component, render snapshot data — inline panel, persists)

**Analog:** `src/ui/session-summary/SessionSummary.tsx` (the exact pattern D-09 mirrors)

**Copy the file structure** from `SessionSummary.tsx` (93 lines): header comment → `import type { RejuvenationRecord, CoreRecord } from '../../domain/index.js'` → props interface → `formatDuration` helper → exported component returning a `<section role="status" aria-live="polite">` with a `<dl>` stat grid.

**Props pattern** — copy from `SessionSummary.tsx` lines 18–23:
```typescript
interface RejuvenationSummaryProps {
  readonly rejuvenation: RejuvenationRecord;
  readonly core: CoreRecord;       // for next-threshold distance
}
```

**Stat grid** — copy the `<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">` + `<div className="rounded-md bg-slate-900/40 p-2">` block from `SessionSummary.tsx` lines 53–86, swapping the fields for `chargeConsumed`/`integrationGained`/`tokensGranted`/distance-to-next-threshold.

**Persistence contract** (D-10): the panel itself has NO dismiss logic — it stays mounted because its parent (CorePanel) keeps rendering it while `lastCompletedRejuvenation !== null`. The store clearing on the next dispatch handles dismissal (see dispatch.ts pattern below).

---

### `src/ui/core-panel/RejuvenationTimer.tsx` (React component, cosmetic timer)

**Analog:** `src/ui/cell-board/SessionTimer.tsx` (exact parallel — cosmetic `setInterval`, decoupled from durable truth)

**Copy the file nearly verbatim** from `SessionTimer.tsx` (56 lines): `useState` + `useEffect` with `setInterval(..., 1000)` + `clearInterval` on unmount + `formatElapsed` helper. Only the prop name / `data-testid` / aria-label change.

**Critical contract** (from `SessionTimer.tsx` lines 1–7 header): the elapsed seconds shown here are recomputed from `startedAt` via `setInterval` and **NEVER touch durable state**. The true duration is computed at Finish time inside the finish handler (D-04 / Phase 3 D-06 carry-over).

---

### `src/ui/core-panel/nextCoreAction.ts` (pure selector)

**Analog:** `src/ui/session-summary/nextAction.ts` (exact parallel — pure value-in/value-out next-action string)

**Copy the file structure** from `nextAction.ts` (45 lines): header comment → `import type { CoreRecord } from '../../domain/index.js'` → `import { nextIntegrationThreshold, activationBoostCost } from '../../content/index.js'` → exported pure function with a priority cascade returning a deterministic string.

---

### `src/ui/flowgrid-home/ReturnCues.tsx` (React component, render snapshot-derived stat-chip rail)

**Analog:** `src/ui/flowgrid-home/FlowgridHome.tsx` (mount point + chip idiom) + `src/ui/cell-board/ResumeSessionPrompt.tsx` (snapshot-derived conditional render)

**Mount pattern** — this component is rendered BY `FlowgridHome.tsx` (insert a `<ReturnCues />` between the resume-session banner at line 84 and the New Cell dialog at line 90). Copy the store-binding from `FlowgridHome.tsx` lines 28–30.

**Chip idiom** (D-05/D-07) — copy the `text-sm text-slate-400` + `aria-live="polite"` styling from `FlowgridHome.tsx` lines 58, 76, 91:
```tsx
<p aria-live="polite" className="text-sm text-slate-400">
  Charge {core.coreCharge} · Energy {core.energy} · Tokens {core.moduleTokens}
</p>
```

**Near-Bloom tappable chip** (D-06) — copy the `useNavigate` + `navigate(...)` pattern from `FlowgridHome.tsx` lines 27, 36–41:
```tsx
const navigate = useNavigate();
// ...
<button type="button" onClick={() => navigate(`/cells/${nearBloomCell.id}`)}
        className="text-sm text-core underline">
  {nearBloomCell.name}: 1 session from Bloom
</button>
```

**Actionable-state gate** (D-05) — render `null` when no actionable state exists (charge===0 && energy===0 && tokens===0 && no near-Bloom && no recent history).

**⚠ No shame language** (D-08 / SPEC prohibition) — neutral framing only; review every string against the prohibition list.

---

### `tests/simulation/rejuvenation.test.ts` (test, command handler unit/integration)

**Analog:** `tests/simulation/session-lifecycle.test.ts` (exact parallel — start/cancel/complete handler tests + replay + invariant assertions)

**Copy the file structure** from `session-lifecycle.test.ts` (249 lines):
- imports: `vitest` `test`/`expect`, domain types, `runSimulationCommand`, `buildStarterSnapshot`/`createTestSimulationEnv` from `../helpers/fixtures.js`, `expectValidState` from `../helpers/expect-valid-state.js`, `expectReplayEqual` from `../helpers/replay.js`
- `snapshotWithCell` helper (lines 31–40) — adapt to a `snapshotWithCore` helper that overrides core fields
- one `test(...)` per acceptance criterion from SPEC R3 (amended): 100C+10min→50I; 100C+5min→25I+50C retained; 101C+11min→50I+1C retained; 0C→zero-gain record; multi-threshold grant; replay equality

**Fixture-with-core-override helper** — copy from `session-lifecycle.test.ts` lines 31–40, adapted:
```typescript
function snapshotWithCore(
  state: FlowgridSnapshot,
  overrides: Partial<CoreRecord>,
): FlowgridSnapshot {
  return { ...state, core: { ...state.core, ...overrides } };
}
```

**Replay assertion** — copy from `session-lifecycle.test.ts` lines 119–133:
```typescript
test('log_rejuvenation: is exactly replayable', () => {
  // ... two envs with same seed ...
  const a = runSimulationCommand(state, command, envA);
  const b = runSimulationCommand(state, command, envB);
  expectReplayEqual(a, b);
});
```

---

### `tests/simulation/activation-boost.test.ts` (test, command handler + bonus derivation)

**Analog:** `tests/simulation/activation-bonus.test.ts` (exact parallel — purchase cost/cap/replay + bonus-derivation-through-complete_focus_session assertions)

**Copy the file structure** from `activation-bonus.test.ts` (191 lines). Add tests for: level 0 + ≥50 Energy → success (Energy −50, level 1); next activated focus earns +15%; at-cap rejection; energy-below-cost rejection; replay equality. The `buildFocusCommand` helper (lines 37–49) is reusable for the bonus-derivation assertions.

---

### `tests/properties/rejuvenation-safety.property.test.ts` (test, property)

**Analog:** `tests/properties/economy-safety.property.test.ts` (exact parallel — fast-check over a command, asserts no-negative + invariant composition)

**Copy the file structure** from `economy-safety.property.test.ts` (54 lines): `import fc from 'fast-check'` → `fc.integer({ min, max })` arbitrary → `fc.assert(fc.property(arb, (val) => { ... }))` with `{ numRuns: 100 }`. Assertions: `result.status === 'applied'`, `validateNoNegativeResources` empty, `validateFlowgridSnapshot` empty, integration/moduleTokens monotonic vs previous, `chargeConsumed === integrationGained * 2` (Pitfall 3).

**Add the cross-type one-active-session property** (Pitfall 2): a fast-check over command sequences asserting at most one of (any cell.activeSessionStartedAt, core.activeRejuvenationStartedAt) is non-null after each step.

---

## Shared Patterns (cross-cutting — apply to ALL new/modified files in their layer)

### S1: Command handler shape (validate → apply → emit → return)
**Source:** `src/simulation/commands/set-core-allocation.ts` (full file, 73 lines — the minimal template) + `complete-focus-session.ts` (the rich template)
**Apply to:** all 4 new command handlers (`log-rejuvenation`, `start-rejuvenation`, `cancel-rejuvenation`, `purchase-activation-boost`)
```typescript
export function handlerName(
  previousState: FlowgridSnapshot,
  command: XCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];
  // 1. VALIDATE (push issues, no throw — Phase 1 D-07)
  // 2. if (issues.length > 0) return rejectWith(previousState, issues);
  // 3. APPLY (immutable spread into nextState)
  // 4. EMIT operation via operationFromCommand(command, env.now, { entityId, payload })
  // 5. RETURN { status: 'applied', previousState, nextState, economyEvents, visualEvents, operations: [operation], validationIssues: [] }
}
```

### S2: rejectWith helper (no throwing for domain invalidity)
**Source:** `src/simulation/commands/complete-focus-session.ts` lines 56–69 (identical copies in `start-focus-session.ts` 19–32, `cancel-focus-session.ts` 26–39)
**Apply to:** all 4 new command handlers — copy the helper verbatim into each file (the codebase duplicates it per-file by convention; do not extract a shared import).
```typescript
function rejectWith(state: FlowgridSnapshot, issues: readonly ValidationIssue[]): SimulationResult {
  return { status: 'rejected', previousState: state, nextState: state, economyEvents: [], visualEvents: [], operations: [], validationIssues: issues };
}
```

### S3: ValidationIssue construction (structured, code from the 8-member enum)
**Source:** `src/domain/validation.ts` lines 9–17 (the enum) + `set-core-allocation.ts` lines 23–31 (usage)
**Apply to:** all validation blocks in the 4 new handlers. Reuse `invalid_reference` for input errors (unknown id, energy-below-cost, at-cap, marker-already-set) — do NOT invent new codes (A5).
```typescript
issues.push({
  code: 'invalid_reference', severity: 'error', entityType: 'core',
  entityId: previousState.core.id, message: `...`, path: 'state.core.X',
});
```

### S4: Integer economy discipline (multiply-then-floor, no floats in durable values)
**Source:** `src/content/formulas.ts` lines 59–69 (`splitCoreCurrent`) + lines 26 (`ACTIVATION_CURRENT_BONUS_PERCENT` usage in `complete-focus-session.ts` 160–162)
**Apply to:** `rejuvenation.ts` system, `formulas.ts` additions, both command handlers that mutate economy fields. The `1.5` threshold ratio is a multiplier inside `Math.floor(50 × Math.pow(1.5, n))` — the float never persists.
```typescript
const energy = Math.floor((current * convertPercent * CORE_CONVERT_RATE) / ALLOCATION_TOTAL_PERCENT);
```

### S5: Exhaustive switch (compile-time safety for new command types)
**Source:** `src/simulation/engine.ts` lines 32–55 (dispatcher) + `src/simulation/operation-events.ts` lines 17–42 + 44–69 (two more exhaustive switches)
**Apply to:** adding the 3 new command types — the TypeScript compiler will error on every exhaustive switch that lacks a case, forcing coverage in `engine.ts`, `operation-events.ts` (×2). No manual "remember to add a case" discipline needed.

### S6: Boundary rules (ESLint + scanner-enforced layer purity)
**Source:** `tests/simulation/boundaries.test.ts` (full file, 176 lines — `scanLayer` + `FORBIDDEN_RULES`)
**Apply to:** ALL new simulation files. Rules (lines 54–80): no React/Pixi/Dexie/Zustand/DOM-shim imports; no `window`/`document`/`Date.now`/`setTimeout`/`setInterval` references; no relative imports into `../app`/`../persistence`/`../render`/`../ui`. Use `env.now` (injected) for ALL time. The scanner auto-covers new files — no test edit needed.

### S7: Operation emission (1:1 id with operationId, caller-supplied id)
**Source:** `src/simulation/operation-events.ts` lines 71–92 (`operationFromCommand`)
**Apply to:** `log-rejuvenation`, `start-rejuvenation`, `purchase-activation-boost` (cancel emits NONE — see `cancel-focus-session.ts` 88–97). RejuvenationRecord.id is 1:1 with operationId (Phase 2 D-04 idempotent replay).
```typescript
const operation = operationFromCommand(command, env.now, { entityId, payload });
```

### S8: Append-only history (no update/delete path)
**Source:** `src/persistence/repository.ts` lines 64–78 (`idempotentAppend`) + lines 111–121 (the append loops) + header comment lines 19–21
**Apply to:** `rejuvenations` store handling in `repository.ts`, `diff.ts`, `import.ts`. Mirror the `sessions`/`operations`/`forgeHistory` append-only treatment exactly — `diffAppend` detects new records by id; `idempotentAppend` does byte-identical upsert or typed conflict.

### S9: Diff-write (persistence detects changes, simulation stays pure)
**Source:** `src/persistence/diff.ts` lines 87–133 (`diffFlowgridSnapshots`) + `repository.ts` lines 96–99 (the single transaction)
**Apply to:** adding `rejuvenations` to the write plan + transaction. New CoreRecord fields are picked up automatically by `diffSingleton` (line 100); new rejuvenation records by adding an `appendRejuvenations` arm.

### S10: Dexie versioned migration (extracted pure transform + verbatim store repetition)
**Source:** `src/persistence/database.ts` lines 44–64 (`CELL_V2_DEFAULTS` + `upgradeCellsV1ToV2`) + lines 99–111 (`version(2).stores({...full set...}).upgrade(...)`)
**Apply to:** `version(3)` in `database.ts`. Extract `upgradeCoresV2ToV3` as a pure exported function; repeat ALL stores verbatim + add `rejuvenations: 'id, createdAt'`; the `.upgrade` calls `tx.table('core').toCollection().modify(upgradeCoresV2ToV3)`.
```typescript
export const CORE_V3_DEFAULTS = { activationBoostLevel: 0, activeRejuvenationStartedAt: null } as const;
export function upgradeCoresV2ToV3(core: Record<string, unknown>): Record<string, unknown> {
  if (core.activationBoostLevel === undefined) core.activationBoostLevel = CORE_V3_DEFAULTS.activationBoostLevel;
  if (core.activeRejuvenationStartedAt === undefined) core.activeRejuvenationStartedAt = CORE_V3_DEFAULTS.activeRejuvenationStartedAt;
  return core;
}
```

### S11: Capture-completed-X store field + derive-active-X projection
**Source:** `src/app/store/dispatch.ts` lines 44–52 (`deriveActiveSession`) + lines 93–101 (the `setState` spread with `lastCompletedSession`) + lines 109–118 (`captureCompletedSession`)
**Apply to:** `dispatch.ts` — add `captureCompletedRejuvenation` (match by operationId, fallback last) + `deriveActiveRejuvenation` (reads `core.activeRejuvenationStartedAt`); extend the `setState` spread + `initApp` to seed both null.
```typescript
function captureCompletedRejuvenation(command, result): RejuvenationRecord | undefined {
  if (command.type !== 'log_rejuvenation') return undefined;
  const rejuvs = result.nextState.rejuvenations;
  return rejuvs.find((r) => r.id === command.operationId) ?? rejuvs[rejuvs.length - 1];
}
```

### S12: Test fixture + replay helpers
**Source:** `tests/helpers/fixtures.ts` (`buildStarterSnapshot` + `createTestSimulationEnv` + `createTestIds`) + `tests/helpers/replay.ts` (`expectReplayEqual`) + `tests/helpers/expect-valid-state.ts` (`expectValidState`)
**Apply to:** all new test files. The starter snapshot will need the 2 new CoreRecord fields seeded (via the `starter-state.ts` change) so existing helpers work unchanged for the new commands. No new helper needed unless a `snapshotWithCore` override helper is added locally in each test file (per the `snapshotWithCell` precedent in `session-lifecycle.test.ts`).

---

## No Analog Found

**None.** This is a pure codebase-extension phase — every new/modified file has an exact or role-match analog already proven in Phases 1–3. The planner does NOT need to fall back to RESEARCH.md reference patterns; every pattern is concretely in-tree.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| *(none)* | — | — | All 33 files have an in-tree analog (see File Classification) |

---

## Metadata

**Analog search scope:** `src/domain/`, `src/simulation/` (commands, systems, engine, events), `src/content/`, `src/persistence/`, `src/app/` (store, routes), `src/ui/` (flowgrid-home, cell-board, session-summary), `tests/` (simulation, persistence, properties, helpers)

**Files scanned:** 28 source files + 6 test files + 3 test helpers read in full; all classified with file:line references.

**Key planning notes for the planner:**
1. **Pitfall 1 (command trio):** SPEC.md names only `log_rejuvenation`, but D-01/D-02's live-timed-session model mandates `start_rejuvenation` + `log_rejuvenation` + `cancel_rejuvenation`. The trio is the faithful reading (RESEARCH A3, MEDIUM confidence — confirm in plan design notes).
2. **Pitfall 2 (cross-type mutual exclusion):** BOTH `start_focus_session` (MODIFY) and `start_rejuvenation` (NEW) must check BOTH markers. Add a property test.
3. **Pitfall 3 (odd-Charge remainder):** implement `chargeConsumed = integrationGained × 2`, NOT `chargeProcessedRaw`. Test the 101-Charge case explicitly.
4. **Pitfall 5 (ARCHIVE_VERSION):** bump to 2; accept both 1 and 2 in `archiveSchema` (v1 transform injects `rejuvenations: []`).
5. **Pitfall 6 (backward-compat):** the v2→v3 migration MUST default `activationBoostLevel = 0` so existing `activation-bonus.test.ts` stays green (level 0 → bonus 10%).
6. **Wave structure:** RESEARCH recommends 3 waves mirroring Phase 3 — Wave 1 (simulation truth: records/commands/systems/migration/invariants/tests), Wave 2 blocked-on-1 (app store/dispatch/selectors + CorePanel/RejuvenationSummary/ReturnCues UI + `/core` route), Wave 3 (UAT gap-closure).

**Pattern extraction date:** 2026-06-24
