# Phase 6: Hardening, Accessibility, and Trust - Pattern Map

**Mapped:** 2026-06-26
**Files analyzed:** 19 (new + modified)
**Analogs found:** 17 / 19 (2 are greenfield: `playwright.config.ts`, `tests/e2e/*` — only external-doc patterns apply)

This phase is a hardening/augmentation pass. **Every simulation/persistence/UI file has a direct, in-repo analog** (it extends an existing pattern). The **2 greenfield files** are the Playwright config + E2E specs — they have no in-repo analog but RESEARCH.md ships verified code examples for both.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/domain/records.ts` (modify) | model | CRUD (record shape) | existing `SettingsRecord` (lines 143-149) | exact (in-file extension) |
| `src/domain/result.ts` (modify) | model | event-driven | existing `VISUAL_EVENT_NAMES` (lines 222-229) + `SimulationCommand` union (159-173) | exact (in-file extension) |
| `src/simulation/engine.ts` (modify) | controller/dispatcher | request-response | existing dispatcher switch (lines 35-64) | exact (in-file extension) |
| `src/simulation/commands/update-settings.ts` (new) | service/command | request-response | `src/simulation/commands/set-core-allocation.ts` | **exact** (template named in CONTEXT) |
| `src/simulation/operation-events.ts` (modify) | utility | transform | existing `entityTypeForCommand`/`entityIdForCommand` switches (17-81) | exact (in-file extension) |
| `src/simulation/visual-events.ts` (modify) | service | event-driven | existing constructors (lines 29-76) | exact (in-file extension) |
| `src/simulation/commands/run-forge.ts` (modify) | service | event-driven | existing `economyEvents` block (206-223) | exact (in-file extension) |
| `src/simulation/commands/log-rejuvenation.ts` (modify) | service | event-driven | existing token-grant loop (lines 104-156) | exact (in-file extension) |
| `src/persistence/database.ts` (modify) | config/migration | file-I/O | existing `version(4)` block (222-235) + `upgradeForgeHistoryV3ToV4` (119-135) | **exact** (template named in CONTEXT) |
| `src/persistence/export-json.ts` (modify) | service | file-I/O | existing `exportJson` + `ARCHIVE_VERSION` (42-98) | exact (in-file extension) |
| `src/persistence/validation-schemas.ts` (modify) | config | transform | existing `settingsSchema` (109-115) + `coreSchema` `.default()` (69-70) | exact (in-file extension) |
| `src/persistence/import.ts` (modify, minimal) | service | file-I/O | existing replace-mode write path (129-153) | role-match (no logic change expected) |
| `src/render/flowgrid/scene.ts` (rewrite) | service | streaming/render | existing static stub (91-160) + `createFlowgridApplication` (178) | role-match (same seam, new internals) |
| `src/render/flowgrid/adapter.ts` (modify) | service | event-driven | existing `connectFlowgridAdapter` (36-69) | exact (in-file extension) |
| `src/render/flowgrid/particles.ts` (new) | service | streaming | **none in-repo** — use RESEARCH §ParticleContainer | no analog (RESEARCH pattern) |
| `src/render/flowgrid/motion.ts` (new) | utility | streaming | **none in-repo** — use RESEARCH §Ticker | no analog (RESEARCH pattern) |
| `src/render/flowgrid/scene-inspect.ts` (new) | utility/test | transform | **none in-repo** — use RESEARCH §Scene-graph probe | no analog (RESEARCH pattern) |
| `src/app/routes.tsx` (modify) | route | request-response | existing route table (11-27) | exact (in-file extension) |
| `src/ui/flowgrid-home/FlowgridHome.tsx` (modify) | component | request-response | existing header `<Link to="/core">` (81) + Radix Dialog (110-126) | exact (in-file extension) |
| `src/ui/flowgrid-home/FlowgridCanvas.tsx` (modify) | component | request-response | existing fail-soft catch (60-69) + mount effect (44-112) | exact (in-file extension) |
| `src/ui/settings/SettingsPanel.tsx` (new) | component | request-response | `src/ui/core-panel/CorePanel.tsx` + `src/ui/forge-panel/ForgePanel.tsx` | **exact** (route-peer template named in CONTEXT) |
| `src/ui/shared/ErrorBanner.tsx` (reference) | component | request-response | existing `role="alert"` (16) | role-match (D-07 is non-error graceful note) |
| `playwright.config.ts` (new) | config/test | batch | **none in-repo** — use RESEARCH §Playwright config | no analog (RESEARCH pattern) |
| `tests/e2e/*.spec.ts` (new) | test | batch | **none in-repo** — use RESEARCH §axe + existing `tests/simulation/*` style | no analog (RESEARCH + vitest style) |
| `vitest.config.ts` (modify, minimal) | config | batch | existing dual-environment config (14-50) | exact (in-file extension) |
| `tests/simulation/update-settings.test.ts` (new) | test | request-response | `tests/simulation/run-forge.test.ts` + command tests | exact |
| `tests/properties/*.property.test.ts` (modify/new) | test | event-driven | `tests/properties/forge-safety.property.test.ts` | exact (template for visual-event-safety + update_settings invariants) |
| `tests/persistence/migration-harness.test.ts` (modify) | test | file-I/O | existing `runMigrationFixture` entries (98-228) | exact (in-file extension) |

---

## Pattern Assignments

### `src/simulation/commands/update-settings.ts` (new command)

**Analog:** `src/simulation/commands/set-core-allocation.ts` (entire 73-line file)

CONTEXT explicitly names this as the template. It is the closest possible analog: a singleton-targeting, validate→apply→emit-operation→return command with the typed-issues-no-throw rejection path (Phase 1 D-07).

**Imports pattern** (lines 1-13):
```typescript
import type {
  FlowgridSnapshot,
  IntPercent,
  SetCoreAllocationCommand,
  SimulationEnv,
  SimulationResult,
  ValidationIssue,
} from '../../domain/index.js';

import { isCoreAllocationValid } from '../systems/core-allocation.js';
import { operationFromCommand } from '../operation-events.js';
```
> For `update_settings`: import `UpdateSettingsCommand`, `SettingsRecord`, drop `IntPercent`/`isCoreAllocationValid`, add any settings-validation helper (or inline the boolean/range checks).

**Reject-with-issues pattern** (lines 20-44) — the typed-issues-no-throw contract:
```typescript
export function setCoreAllocation(
  previousState: FlowgridSnapshot,
  command: SetCoreAllocationCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];

  if (!isCoreAllocationValid(command.convertAllocationPercent, command.storeAllocationPercent)) {
    issues.push({
      code: 'invalid_core_allocation_total',
      severity: 'error',
      entityType: 'core',
      entityId: previousState.core.id,
      message: 'Core allocation convert + store must total exactly 100 …',
      path: 'command.convertAllocationPercent,command.storeAllocationPercent',
    });
  }

  if (issues.length > 0) {
    return {
      status: 'rejected',
      previousState,
      nextState: previousState,
      economyEvents: [],
      visualEvents: [],
      operations: [],
      validationIssues: issues,
    };
  }
```

**Apply + emit operation + return `SimulationResult`** (lines 46-73):
```typescript
  const newCore = {
    ...previousState.core,
    convertAllocationPercent: convertPercent,
    storeAllocationPercent: storePercent,
    updatedAt: env.now,
  };
  const operation = operationFromCommand(command, env.now, {
    entityId: previousState.core.id,
    payload: { convertAllocationPercent: convertPercent, storeAllocationPercent: storePercent },
  });

  return {
    status: 'applied',
    previousState,
    nextState: {
      ...previousState,
      core: newCore,
      client: { ...previousState.client, updatedAt: env.now },
      operations: [...previousState.operations, operation],
    },
    economyEvents: [],
    visualEvents: [],
    operations: [operation],
    validationIssues: [],
  };
}
```
> For `update_settings`: target `previousState.settings` (singleton), write a new `SettingsRecord` with the editable subset (defaultSessionLengthSeconds, dailyTargetSeconds, localDayBoundary, reduceMotion), `entityType: 'settings'`, `entityId: previousState.settings.id`. `client.updatedAt` bump mirrors the line above (single mutation path). `visualEvents: []` — settings change has no visual event.

---

### `src/simulation/engine.ts` (add dispatcher case)

**Analog:** existing dispatcher, `src/simulation/engine.ts` lines 15-64

**Import + case pattern** (lines 15-16, 38-39):
```typescript
import { setCoreAllocation } from './commands/set-core-allocation.js';
// …
    case 'set_core_allocation':
      return setCoreAllocation(previousState, command, env);
```
> Add `import { updateSettings } from './commands/update-settings.js';` to the import block, and `case 'update_settings': return updateSettings(previousState, command, env);` to the switch. **The exhaustive switch (no default) gives compile-time safety** — adding the union variant in `result.ts` without this case fails `tsc`.

---

### `src/simulation/operation-events.ts` (add command routing)

**Analog:** existing `entityTypeForCommand` + `entityIdForCommand` switches, lines 17-81

```typescript
function entityTypeForCommand(command: SimulationCommand): EntityType {
  switch (command.type) {
    case 'set_core_allocation':
      return 'core';
    // …
  }
}
```
> Add `case 'update_settings': return 'settings';` to BOTH switches (entityTypeForCommand AND entityIdForCommand). `entityIdForCommand` returns `fallback` for singleton-targeted commands (`set_core_allocation` does at line 55) — `update_settings` should mirror that (return `fallback`, with the caller passing `previousState.settings.id` via `operationFromCommand`'s `options.entityId`, exactly as set-core-allocation.ts line 54-57 does). **Add `'settings'` to the `EntityType` union in `src/domain/operation-records.ts`** (not yet read, but it is the source of `EntityType`).

---

### `src/domain/records.ts` (extend SettingsRecord)

**Analog:** existing `SettingsRecord` lines 143-149

```typescript
export interface SettingsRecord {
  readonly id: SettingsId;
  readonly defaultSessionLengthSeconds: IntSeconds;
  readonly dailyTargetSeconds: IntSeconds;
  readonly localDayBoundary: string;
  readonly updatedAt: IsoDateTimeString;
}
```
> Add `readonly reduceMotion: boolean;` (D-08/D-11). Place it before `updatedAt` to match the "metadata last" convention seen in every other record (`CoreRecord.updatedAt:75`, `CellRecord.updatedAt:56`, `RejuvenationRecord.createdAt:140`).

---

### `src/domain/result.ts` (extend union + visual event names)

**Analog A — `SimulationCommand` union** lines 159-173:
```typescript
export type SimulationCommand =
  | CompleteFocusSessionCommand
  | SetCoreAllocationCommand
  // …
  | CancelFocusSessionCommand;
```
> Add `| UpdateSettingsCommand`. Also declare the new command interface inline (peer to `SetCoreAllocationCommand` lines 44-49):
```typescript
export interface UpdateSettingsCommand {
  readonly type: 'update_settings';
  readonly operationId: OperationId;
  readonly defaultSessionLengthSeconds: IntSeconds;
  readonly dailyTargetSeconds: IntSeconds;
  readonly localDayBoundary: string;
  readonly reduceMotion: boolean;
}
```

**Analog B — `VISUAL_EVENT_NAMES`** lines 222-229:
```typescript
export const VISUAL_EVENT_NAMES = {
  focusSessionStartedVisual: 'visual:focus_session_started',
  currentFlowVisual: 'visual:current_flow',
  bloomBurstVisual: 'visual:bloom_burst',
  cellActivationVisual: 'visual:cell_activation',
  coreConvertVisual: 'visual:core_convert',
  coreChargeStoreVisual: 'visual:core_charge_store',
} as const;
```
> Add three keys (D-04): `forgeRollVisual: 'visual:forge_roll'`, `moduleUpgradeVisual: 'visual:module_upgrade'`, `tokenGrantedVisual: 'visual:token_granted'`.

---

### `src/simulation/visual-events.ts` (add constructors)

**Analog:** existing constructors lines 29-76, e.g. `bloomBurstVisual` (50-55) and `coreConvertVisual` (64-69):

```typescript
export function bloomBurstVisual(at: IsoDateTimeString, cellId: string): VisualEvent {
  return make(
    { at, entityType: 'cell', entityId: cellId, payload: {} },
    VISUAL_EVENT_NAMES.bloomBurstVisual,
  );
}

export function coreConvertVisual(at: IsoDateTimeString, coreId: string, amount: number): VisualEvent {
  return make(
    { at, entityType: 'core', entityId: coreId, payload: { amount } },
    VISUAL_EVENT_NAMES.coreConvertVisual,
  );
}
```
> Add `forgeRollVisual(at, coreId, payload)`, `moduleUpgradeVisual(at, moduleInstanceId, payload)`, `tokenGrantedVisual(at, coreId, payload)`. Mirror the `make(params, type)` private helper (19-27) — do NOT build `VisualEvent` literals inline. `entityType` strings: `'core'` (forge roll + token grant), `'module_instance'` (module upgrade — matches `moduleUpgradedEvent` economy-event convention in `economy-events.ts:210`).

---

### `src/simulation/commands/run-forge.ts` + `log-rejuvenation.ts` (emit D-04 visual events)

**Analog:** existing `economyEvents` construction blocks.

`run-forge.ts` lines 206-223 (the block to extend — add visual events alongside the economy events):
```typescript
  const economyEvents: EconomyEvent[] = [
    forgeCompletedEvent(env.now, prevCore.id, record.id, record.paymentType, record.paymentAmount, newCore.forgeCount),
    moduleUpgradedEvent(env.now, target.id, chosen!.cellId, chosen!.moduleKind, target.level, target.level + 1),
  ];

  return {
    status: 'applied',
    // …
    visualEvents: [],   // ← currently empty; D-04 adds forgeRollVisual + moduleUpgradeVisual here
```
> The handler currently returns `visualEvents: []` (line 230). Add a `const visualEvents: VisualEvent[] = [forgeRollVisual(...), moduleUpgradeVisual(...)]` block mirroring the economy-events block, then return it. **Transient by contract (UI-04) — placement only affects animation timing** (RESEARCH Open Question Q4).

`log-rejuvenation.ts` lines 151-156 (token-grant site for `visual:token_granted`):
```typescript
  const economyEvents: EconomyEvent[] = [
    rejuvenationCompletedEvent(env.now, prevCore.id, record.id, chargeConsumed, integrationGained),
  ];
  if (tokensGranted > 0) {
    economyEvents.push(tokenGrantedEvent(env.now, prevCore.id, tokensGranted, moduleTokens));
  }
```
> Emit `tokenGrantedVisual(...)` inside the same `if (tokensGranted > 0)` guard so it fires exactly when the economy event does.

---

### `src/persistence/database.ts` (v4→v5 migration)

**Analog:** the v3→v4 migration — `FORGE_HISTORY_V4_DEFAULTS` (105-110), `upgradeForgeHistoryV3ToV4` (119-135), and `this.version(4).stores({…}).upgrade(…)` (222-235). This is byte-for-byte the proven extracted-transform pattern; the v4→v5 settings migration follows it exactly.

**Extracted transform + defaults** (lines 105-135 template):
```typescript
export const FORGE_HISTORY_V4_DEFAULTS = {
  paymentType: 'token',
  paymentAmount: 0,
  offeredChoices: [] as readonly never[],
  chosenReward: null,
} as const;

export function upgradeForgeHistoryV3ToV4(
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (row.paymentType === undefined) {
    row.paymentType = FORGE_HISTORY_V4_DEFAULTS.paymentType;
  }
  // …one if per field…
  return row;
}
```
> For settings: `SETTINGS_V5_DEFAULTS = { reduceMotion: false } as const;` and `upgradeSettingsV4ToV5(row)` that sets `reduceMotion` when undefined. Settings is a singleton so the transform runs once.

**Version block** (lines 222-235 template — repeat the FULL 10-store set verbatim):
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
      forgeHistory: 'id, createdAt',
      rejuvenations: 'id, createdAt',
    }).upgrade(async (tx) => {
      await tx.table('forgeHistory').toCollection().modify(upgradeForgeHistoryV3ToV4);
    });
```
> Add `this.version(5).stores({ /* same 10 stores verbatim */ }).upgrade(async (tx) => { await tx.table('settings').toCollection().modify(upgradeSettingsV4ToV5); });`. Indexes unchanged (`settings: 'id'`); only the stored shape widens. **The comment at lines 140-143 about the `core` store-name collision applies** — access via `db.table<…>` not a class property (settings IS a declared property, so `db.settings` is fine).

---

### `src/persistence/validation-schemas.ts` (settingsSchema + drift guard)

**Analog A — settingsSchema** lines 109-115:
```typescript
export const settingsSchema = z.object({
  id: z.string(),
  defaultSessionLengthSeconds: z.number().int().nonnegative(),
  dailyTargetSeconds: z.number().int().nonnegative(),
  localDayBoundary: z.string(),
  updatedAt: z.string().datetime(),
});
```
> Add `reduceMotion: z.boolean().default(false)`. **The `.default(false)` is the load-bearing backward-compat trick** (Pitfall 4): a v2 archive lacking the field parses and defaults, so no `ARCHIVE_VERSION` bump is required (RESEARCH Open Question Q2 recommends following the Phase 4 `coreSchema` precedent at lines 69-70).

**Analog B — drift guard** lines 200-209 (add a matching `_settingsSchemaCheck`):
```typescript
const _sessionSchemaCheck = null as unknown as z.infer<typeof sessionSchema> satisfies SessionRecord;
```
> Add `const _settingsSchemaCheck = null as unknown as z.infer<typeof settingsSchema> satisfies SettingsRecord;` + `void _settingsSchemaCheck;`. This makes a future `SettingsRecord` shape change without a schema edit fail at compile time.

---

### `src/persistence/export-json.ts` + `import.ts` (carry new field)

**Analog:** existing `exportJson` lines 59-98.

> The new `reduceMotion` field flows through automatically once `SettingsRecord` carries it (the export reads `settingsRecord` from `db.settings.toArray()` line 69 and returns it at line 94). **Decision per RESEARCH Open Question Q2:** do NOT bump `ARCHIVE_VERSION` (line 42, currently `2`) — the `.default(false)` keeps v2 archives importable. `import.ts` is unchanged (its replace-mode `db.settings.put(validated.settings)` at line 150 writes whatever the validated archive carries). If the planner decides to signal the change anyway, bump `ARCHIVE_VERSION` to `3`, widen `archiveSchema.archiveVersion` union (line 174) to include `z.literal(3)`, and update `JsonArchive.archiveVersion` (line 45).

---

### `src/render/flowgrid/scene.ts` (rewrite for full motion)

**Analog:** the existing static stub — same file, lines 13-187. The public seams (`buildFlowgridScene`, `destroyFlowgridScene`, `createFlowgridApplication`, `FlowgridApplication` type, `HEX_SIZE`, `FLOWGRID_SCENE_LABEL`) stay; internals gain ParticleContainer + tween-in-place.

**Layer-boundary imports** (lines 13-17) — keep this exact shape:
```typescript
import { Application, Container, Graphics } from 'pixi.js';

import type { CellId, CellRecord, FlowgridSnapshot, LocalDateString } from '../../domain/index.js';

import { axialToPixel, ringCells } from './hex-layout.js';
```
> Add `ParticleContainer, Particle, Texture` to the pixi import; add `import { emitBurst, updateParticles } from './particles.js';` and `import { applyMotionGate } from './motion.js';`. **Do NOT import React/Dexie/Zustand/DOM** — the ESLint block at `eslint.config.js:131-176` enforces this.

**Async init seam** (lines 178-187) — unchanged; D-07 wraps the caller's try/catch, not this:
```typescript
export async function createFlowgridApplication(container: HTMLElement): Promise<Application> {
  const app = new Application();
  await app.init({
    background: 0x0f172a,
    resizeTo: container,
    preference: 'webgl',
    antialias: true,
  });
  return app;
}
```

**Color tokens** (lines 30-34) — D-09's "CSS-variable read" Agent's Discretion. Today these are hard-coded ints mirroring `src/style.css` `@theme`; the planner decides whether to read computed CSS vars. Keep the `parseColor` helper (53-65) regardless.

**Pointertap → onCellTap** (lines 150-156) — keep this contract; D-05 tweening must preserve interactivity:
```typescript
    cellHex.eventMode = 'static';
    cellHex.cursor = 'pointer';
    const cellId: CellId = cell.id;
    cellHex.on('pointertap', () => onCellTap(cellId));
```

---

### `src/render/flowgrid/adapter.ts` (switch rebuild→update-in-place)

**Analog:** existing `connectFlowgridAdapter` lines 36-69. The D-05 change is surgical: the `onSnapshot` callback the UI passes stops calling `destroyFlowgridScene`+`buildFlowgridScene` and instead calls a new `updateFlowgridScene` (in-place property mutation). The D-01/D-02/D-04 change is the `onVisualEvents` callback stops being a no-op.

**The current rebuild-on-snapshot handler** (caller side, `FlowgridCanvas.tsx:86-90`):
```typescript
        (nextSnapshot) => {
          if (app === null) return;
          destroyFlowgridScene(app);
          buildFlowgridScene(app, nextSnapshot, (cellId) => onCellTapRef.current(cellId), localDate);
        },
        (_events) => {
          // D-02: visual events are received and dropped. Phase 3 has no animation.
        },
```
> Replace the rebuild with `updateFlowgridScene(app, sceneRefs, nextSnapshot, localDate, reduceMotion)` and the no-op with `emitParticles(particleLayer, events)` (gated on `reduceMotion`). The adapter file itself (`adapter.ts`) needs NO change — its `SceneRebuildHandler`/`VisualEventDrainHandler` types (25-26) are already generic. **Pitfall 3 (RESEARCH):** D-05 must ship in the same wave as D-01/D-02 or the live trail restarts on every dispatch.

---

### `src/render/flowgrid/{particles,motion,scene-inspect}.ts` (new render modules)

**No in-repo analog.** Use the verified RESEARCH.md code examples:
- **particles.ts** ← RESEARCH §"Pixi v8 ParticleContainer" (lines 396-427): `new ParticleContainer({ dynamicProperties: { position: true, … } })`, `addParticle`/`removeParticle` (NOT `addChild`/`removeChild`), call `particleLayer.update()` after static-property changes.
- **motion.ts** ← RESEARCH §"Pixi v8 Ticker" (429-445) + §"Reduced-motion auto-detect" (534-543): `app.ticker.add((ticker) => { … ticker.deltaMS … })`, `if (reduceMotion) app.ticker.stop() else app.ticker.start()`. The custom tween lerp (§"Custom in-place tween" 447-457) lives here too.
- **scene-inspect.ts** ← RESEARCH §"Scene-graph probe" (545-560): `summarizeScene(app): { cells, core, routes }`. **Pitfall 5:** the planner must pick a gating mechanism (RESEARCH Open Question Q1 recommends option (a): always exposed, aggregate counts only, no internal refs).

**CRITICAL — do NOT install** `@pixi/tween` (does not exist) or `@pixi/particle-emitter` (peerDeps cap `< 8.0.0`). RESEARCH §Package Legitimacy Audit (149-165) verified both.

---

### `src/app/routes.tsx` (add /settings route)

**Analog:** existing route table lines 11-27:
```typescript
export const router = createBrowserRouter([
  { path: '/', element: <FlowgridHome /> },
  { path: '/cells/:cellId', element: <CellBoard /> },
  { path: '/core', element: <CorePanel /> },
  { path: '/forge', element: <ForgePanel /> },
]);
```
> Add `import { SettingsPanel } from '../ui/settings/SettingsPanel.js';` (peer to lines 6-9) and `{ path: '/settings', element: <SettingsPanel /> }` as a fifth entry. The `/core` and `/forge` peers (lines 21-27) are the exact shape to copy.

---

### `src/ui/settings/SettingsPanel.tsx` (new route-peer component)

**Analog:** `src/ui/core-panel/CorePanel.tsx` (287 lines) + `src/ui/forge-panel/ForgePanel.tsx` (179 lines). These are THE named templates for a route component that reads the store, dispatches commands, and renders inline feedback.

**Imports + store wiring** (`CorePanel.tsx` lines 14-32):
```typescript
import { useState } from 'react';
import { Link } from 'react-router';

import type { SetCoreAllocationCommand } from '../../domain/index.js';

import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';
```
> SettingsPanel mirrors this: import `UpdateSettingsCommand`, the same `makeEnv`/`repository`/`dispatch`/`useFlowgridStore` trio. Add `import { exportJson, exportSessionCsv } from '../../persistence/…'` and `import { importArchive } from '../../persistence/import.js'` for D-11/D-13 (goes through the persistence barrel per the UI ESLint rule).

**Local-form-state + clamp pattern** (`CorePanel.tsx` lines 40-44, 56-57):
```typescript
function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.floor(value)));
}
// …
  const [convertPct, setConvertPct] = useState(snapshot?.core.convertAllocationPercent ?? 50);
```
> Settings form fields (defaultSessionLengthSeconds, dailyTargetSeconds, localDayBoundary, reduceMotion) follow the same controlled-input + local-state pattern, seeded from `snapshot.settings`.

**Build-env + dispatch** (`CorePanel.tsx` lines 36-38, 76-85):
```typescript
const CORE_SEED = 'flowgrid-core-seed';
function buildCoreEnv(localDayBoundary: string) {
  return makeEnv(new Date().toISOString(), { localDayBoundary }, CORE_SEED);
}
// …
    const env = buildCoreEnv(snapshot.settings.localDayBoundary);
    const command: SetCoreAllocationCommand = {
      type: 'set_core_allocation',
      operationId: crypto.randomUUID(),
      convertAllocationPercent: convertPct,
      storeAllocationPercent: storePct,
    };
    void dispatch(command, env, repository);
```
> `SETTINGS_SEED = 'flowgrid-settings-seed'`, `buildSettingsEnv(...)`, then dispatch `UpdateSettingsCommand { type: 'update_settings', operationId: crypto.randomUUID(), … }`. **Note:** the command's `localDayBoundary` field feeds back into the NEXT `buildSettingsEnv` — reload-only behavior (RESEARCH Open Question Q3) is the simpler choice.

**Inline rejection surface** (`CorePanel.tsx` lines 276-279, `ForgePanel.tsx` 173-176):
```typescript
      {lastRejection !== null ? (
        <p role="status" aria-live="polite" className="rounded-md bg-slate-900/40 px-3 py-2 text-sm text-error">{lastRejection}</p>
      ) : null}
```
> Reuse verbatim — `lastRejection` is already populated by `dispatch.ts:88-90` for any rejected `update_settings`. `role="status" aria-live="polite"` is the project's a11y convention for non-error feedback.

**Route-peer shell + Home link** (`ForgePanel.tsx` lines 86-90):
```typescript
    <section aria-label="Forge" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-core">Forge</h2>
        <Link to="/" className="text-sm text-slate-400 underline">Home</Link>
      </div>
```
> SettingsPanel: `aria-label="Settings"`, `<h2>Settings</h2>`, `<Link to="/">Home</Link>`.

**Export buttons (D-11) + import confirm dialog (D-13):**
> Export: two `<button onClick={() => { const archive = await exportJson(db); triggerDownload(…) }}>` controls. The `triggerDownload(filename, mime, content)` helper is a small new util (RESEARCH §"Don't Hand-Roll" 339). Import: a Radix `Dialog.Root` (exact idiom at `FlowgridHome.tsx:110-126`) wrapping a file input + a confirmation warning + a call to `importArchive(db, parsed, 'replace')`. The existing `import.ts` replace-mode path (lines 129-153) is the call target.

---

### `src/ui/flowgrid-home/FlowgridHome.tsx` (D-06 Cell list + Settings link)

**Analog A — header link** lines 78-82:
```typescript
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-core">Flowgrid</h1>
        {/* Reachable /core navigation (peer to / and /cells/:id). */}
        <Link to="/core" className="text-sm text-slate-400 underline">Core</Link>
      </div>
```
> Add a sibling `<Link to="/settings">Settings</Link>` next to the Core link (D-10).

**Analog B — D-06 semantic Cell list.** The existing `activeCells` derivation (line 66) already produces the data; the UI just needs a `<nav aria-label="Cells"><ul>…<li><Link to={'/cells/'+id}>…</Link></li>…</ul></nav>` block mounted alongside `<FlowgridCanvas>` (line 135). RESEARCH §"Pattern 1: Always-visible semantic Cell list" (252-271) ships the exact JSX. **Mount it unconditionally** (not gated on WebGL failure) per D-06.

---

### `src/ui/flowgrid-home/FlowgridCanvas.tsx` (D-07 WebGL-fail message + reduceMotion wiring)

**Analog:** existing fail-soft catch lines 60-69:
```typescript
      try {
        app = await createFlowgridApplication(container);
      } catch (e) {
        // WebGL unavailable (old browser, headless context). Fail soft: log and
        // leave the container empty. Phase 6 hardening owns resilience (T-03-08).
        console.error('FlowgridCanvas: Pixi Application.init failed', e);
        app = null;
        return;
      }
```
> D-07 replaces the silent empty-container return with rendering an inline note into `containerRef.current` (or a React state toggle that renders the note in JSX): "Visuals unavailable — you can still do everything from the Cell list below" + `<Link to="/settings">`. **Not an error state** — `ErrorBanner.tsx` (`role="alert"`, line 16) is the wrong pattern; use `role="status"` (the loading-state convention at `FlowgridHome.tsx:61`).

**reduceMotion wiring:** compute the effective value (D-09) in the UI/store layer (NOT the render layer — Pitfall 6), pass it into `buildFlowgridScene`/`updateFlowgridScene` and the adapter's `onSnapshot`/`onVisualEvents` closures. RESEARCH §"Reduced-motion auto-detect + override" (534-543) gives `effectiveReduceMotion(setting)`. The mount-effect dep-array comment (lines 109-115) stays — `localDayBoundary` capture-at-mount is still reload-only (Open Question Q3).

---

### `playwright.config.ts` (new) + `tests/e2e/*.spec.ts` (new)

**No in-repo analog.** Use RESEARCH.md verified examples verbatim:

**playwright.config.ts** ← RESEARCH §"Playwright config" (489-516). Critical pieces:
- `webServer.command: 'npm run build && npm run preview -- --strictPort'` (D-17 production build)
- `webServer.url: 'http://localhost:4173'` (vite preview default port — Assumption A2)
- `launchOptions.args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']` — **CRITICAL Pitfall 2**, without these VER-06 WebGL fails in headless Chromium
- `testDir: './tests/e2e'`
- Add `package.json` scripts `"test:e2e": "playwright test"` and `"test:e2e:ui": "playwright test --ui"` (RESEARCH line 515)

**E2E specs** ← RESEARCH §"axe-core scan per route" (518-532) + §"Scene-graph probe" (545-560):
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home has no WCAG violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```
> Run on `/`, `/cells/:id`, `/core`, `/forge`, `/settings`. For VER-06 canvas probe: `const summary = await page.evaluate(() => (window as any).__flowgridInspect?.());` then `expect(summary.cells).toBeGreaterThan(0)`. The full-flow VER-04 spec drives the semantic Cell list via `page.keyboard.press('Tab'/'Enter')` (D-15) and reloads with `page.reload()` to exercise IndexedDB persistence.

**Test-style analog (in-repo):** existing vitest specs use `import { test, expect } from 'vitest'` with explicit imports (no globals) — `tests/simulation/run-forge.test.ts:14` is the canonical style. Playwright uses the same named-import shape from `@playwright/test`.

---

### `tests/simulation/update-settings.test.ts` (new) + property tests

**Acceptance-test analog:** `tests/simulation/run-forge.test.ts` (334 lines) — structure: snapshot-with-overrides helpers, one `test()` per acceptance bullet (applied/rejected/idempotent-replay), uses `buildStarterSnapshot` + `createTestSimulationEnv` from `tests/helpers/fixtures.ts` + `expectValidState` + `expectReplayEqual`.

**Property-test analog:** `tests/properties/forge-safety.property.test.ts` (114 lines) — `fc.assert(fc.property(arb, (input) => { … }))` with `{ numRuns: 100 }`. For **update_settings invariants** (VER-02): settings record stays well-formed, `reduceMotion` is boolean, existing Cells' `dailyMilestoneTargetSeconds` unchanged (D-12). For **visual-event safety** (UI-04): the load-bearing property — `runSimulationCommand` with `visualEvents: []` forced produces identical `nextState`/`operations`/`issues` to the natural result (drop freely). Mirror the rejected-result invariant at `forge-safety.property.test.ts:92-95`:
```typescript
      } else {
        // Rejected -> state byte-identical, nothing durable written.
        expect(result.nextState).toEqual(seeded);
        expect(result.operations).toEqual([]);
```

---

### `tests/persistence/migration-harness.test.ts` (add v4→v5 fixture)

**Analog:** existing `runMigrationFixture` entries, e.g. the v3→v4 forgeHistory block lines 208-228:
```typescript
describe('v3 -> v4 forgeHistory migration (upgradeForgeHistoryV3ToV4)', () => {
  interface V3ForgeHistory { /* … */ }

  runMigrationFixture<V3ForgeHistory, Record<string, unknown>>({
    description: 'v3 → v4 forgeHistory: fills absent Phase 5 fields with sentinel defaults',
    input: { id: 'test:forge:1', forgeCount: 0, createdAt: '2026-01-01T00:00:00.000Z' },
    upgrade: (old) => upgradeForgeHistoryV3ToV4({ ...old }),
    expected: { /* … with defaults filled … */ },
  });
});
```
> Add a parallel `describe('v4 -> v5 settings migration (upgradeSettingsV4ToV5)')` block with a V4Settings interface (no `reduceMotion`), `upgrade: (old) => upgradeSettingsV4ToV5({ ...old })`, `expected: { …, reduceMotion: false }`. Import `upgradeSettingsV4ToV5` from `../../src/persistence/database.js` (peer to lines 11-14). Settings is a singleton so one fixture suffices.

---

## Shared Patterns

### Layer-boundary enforcement (ESLint)
**Source:** `eslint.config.js` lines 31-207
**Apply to:** ALL new/modified files
- `src/simulation/**` — no React/Pixi/Dexie/Zustand/DOM/app-persistence-render-ui (lines 31-67)
- `src/persistence/**` — no direct Dexie (except `database.ts`), no simulation (69-124)
- `src/render/**` — Pixi + domain types/selectors ONLY; no React/Dexie/Zustand/DOM/app/persistence/ui (131-176)
- `src/ui/**` — no `pixi.js` direct (canvas behind `FlowgridCanvas`→`scene.ts`), no Dexie direct (go through `src/persistence/index.ts` barrel) (185-207)

The new `render/flowgrid/{particles,motion,scene-inspect}.ts` and `ui/settings/SettingsPanel.tsx` inherit these automatically by path.

### Command-handler shape (validate → apply → emit op → return)
**Source:** `src/simulation/commands/set-core-allocation.ts` (full file)
**Apply to:** `update-settings.ts`; the same shape governs every existing command — `run-forge.ts`, `log-rejuvenation.ts`, etc.
- Typed `ValidationIssue[]` accumulation, NO throwing (Phase 1 D-07)
- Reject returns `nextState: previousState` + empty everything (lines 34-44)
- Apply spreads previousState, bumps `client.updatedAt` + appends operation (62-67)
- `operationFromCommand` builds the sync-ready `SyncOperation` (line 54)

### Typed-issues-no-throw rejection surface
**Source:** `src/app/store/dispatch.ts` lines 82-91 + `CorePanel.tsx` 276-279
**Apply to:** `SettingsPanel.tsx` and any settings feedback
```typescript
  if (result.status !== 'applied') {
    const message = result.validationIssues[0]?.message ?? 'That action is not available right now.';
    flowgridStore.setState({ lastRejection: message });
    return null;
  }
```
> The UI renders `<p role="status" aria-live="polite">{lastRejection}</p>`. `update_settings` rejections (invalid session length, malformed boundary) flow through this unchanged.

### Route-peer component shell
**Source:** `src/ui/core-panel/CorePanel.tsx` + `src/ui/forge-panel/ForgePanel.tsx`
**Apply to:** `SettingsPanel.tsx`
The four-part shell: (1) loading guard (`if (snapshot === null) return <loading/>`), (2) `<section aria-label="…" className="mx-auto max-w-5xl px-4 py-6 space-y-6">`, (3) header with `<h2>` + `<Link to="/">Home</Link>`, (4) `<dl>` stat grid + control sections + inline summary + `lastRejection` surface.

### Visual-event transience (UI-04 safety)
**Source:** `src/render/flowgrid/adapter.ts` lines 58-63 (the "drop freely" seam) + `src/simulation/visual-events.ts` header (1-6)
**Apply to:** `run-forge.ts`/`log-rejuvenation.ts` D-04 emissions, `particles.ts`, the visual-event-safety property test
The renderer MAY drop/reduce/replay/skip visual events with ZERO effect on durable state. The render layer has NO write path to Dexie (ESLint-enforced). The new `visual:forge_roll`/`module_upgrade`/`token_granted` events inherit this contract — they are emitted freely by the simulation and consumed opportunistically by the renderer.

### Dexie extracted-transform migration (4 independent version axes)
**Source:** `src/persistence/database.ts` lines 43-235 + `tests/persistence/migration-harness.test.ts`
**Apply to:** the v4→v5 settings migration
- Exported `*_V5_DEFAULTS` const + `upgradeSettingsV4ToV5` pure function (template lines 105-135)
- `this.version(N).stores({ /* FULL set verbatim */ }).upgrade(async (tx) => { await tx.table('settings').toCollection().modify(upgradeSettingsV4ToV5); })` (template 222-235)
- Harness fixture in `migration-harness.test.ts` (template 208-228)
- The 4 version axes (Dexie schema / ContentVersion / payloadVersion / ARCHIVE_VERSION) NEVER unify — only the Dexie axis bumps here; ARCHIVE_VERSION stays at 2 per the `.default(false)` backward-compat trick.

### Inline-not-modal (Phase 3/4/5 anti-pattern)
**Source:** `FlowgridHome.tsx` Radix Dialog usage (110-126), `ForgeSummary`/`RejuvenationSummary` inline panels
**Apply to:** `/settings` route (D-10), WebGL-failure message (D-07), import-confirmation dialog (D-13)
- `/settings` is a ROUTE, not a modal
- D-07's WebGL-fail note is an INLINE `<div role="status">`, not a blocking dialog
- D-13's import confirmation IS a Radix Dialog (the one legitimate modal use — destructive-action confirmation, mirroring the New-Cell dialog idiom)

---

## No Analog Found

Files with no close in-repo match (planner uses RESEARCH.md verified examples instead):

| File | Role | Data Flow | Reason | RESEARCH Reference |
|------|------|-----------|--------|--------------------|
| `src/render/flowgrid/particles.ts` (new) | service | streaming/render | No particle system exists; Phase 3 was a static stub | RESEARCH §"Pixi v8 ParticleContainer" (396-427) |
| `src/render/flowgrid/motion.ts` (new) | utility | streaming | No animation ticker exists | RESEARCH §"Pixi v8 Ticker" (429-445) + §"Custom in-place tween" (447-457) |
| `src/render/flowgrid/scene-inspect.ts` (new) | utility/test | transform | No test-hook export exists | RESEARCH §"Scene-graph probe" (545-560) + Pitfall 5 / Open Q1 |
| `playwright.config.ts` (new) | config | batch | First E2E config in the repo | RESEARCH §"Playwright config" (489-516) |
| `tests/e2e/*.spec.ts` (new) | test | batch | First E2E specs; vitest style is the only in-repo test idiom | RESEARCH §"axe-core scan per route" (518-532) + §VER-04/06 flows |

All five have HIGH-confidence verified code examples in RESEARCH.md; the planner can copy them directly into plan actions.

---

## Metadata

**Analog search scope:** `src/domain/`, `src/simulation/`, `src/persistence/`, `src/render/flowgrid/`, `src/ui/{flowgrid-home,core-panel,forge-panel,shared}/`, `src/app/`, `tests/{simulation,persistence,properties}/`, `eslint.config.js`, `vitest.config.ts`, `package.json`

**Files scanned:** 22 (17 analog files read in full + 5 grep/glob confirmations)

**Pattern extraction date:** 2026-06-26

**Cross-references to RESEARCH.md open questions the planner must resolve:**
- Q1 — scene-graph probe gating (recommend option (a): aggregate counts only)
- Q2 — `ARCHIVE_VERSION` bump (recommend: NO bump, use `.default(false)`)
- Q3 — `localDayBoundary` live-reload (recommend: reload-only)
- Q4 — D-04 visual-event emission sites (run-forge.ts for forge/module; log-rejuvenation.ts token-grant loop for token)
