# Phase 2 Research: Durable Local-First Spine

**Researched:** 2026-06-23
**Domain:** Dexie/IndexedDB persistence, repository layer, migrations, export/import/restore, fake-indexeddb testing
**Confidence:** HIGH for architecture fit, store topology, and Phase 1 contract consumption (verified against code); HIGH for Dexie 4.x and fake-indexeddb APIs (verified against published docs and current npm versions); MEDIUM for Zod 4.x integration specifics (stable release verified, but API surface is large and only boundary usage is needed).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**State Storage Model:**
- **D-01:** Hybrid records-plus-operation-log. Write changed entity records (diffed previousState vs nextState) AND append SyncOperation + SessionRecord. State read straight from latest records on reload — no event replay.
- **D-02:** Minimal durable set: changed entity records + operations + sessions. Economy events and visual events stay transient. Rejected and `not_implemented` commands write nothing.
- **D-03:** Changed-record detection happens in the persistence layer (diff previousState vs nextState maps). Phase 1 SimulationResult contract is NOT extended.
- **D-04:** Idempotent upsert with conflict-on-payload-mismatch. Same ID + same payload = silent no-op. Same ID + different payload = typed conflict signal, write rejected.

**Store Topology & Migrations:**
- **D-05:** One IndexedDB object store per durable entity type. Nine stores: `client`, `cells`, `core`, `moduleInstances`, `routes`, `sessions`, `operations`, `settings`, `forgeHistory`.
- **D-06:** ModuleDefinition records are NOT persisted — they stay as versioned code content in `src/content/starter-modules.ts`. Only ModuleInstances go in IndexedDB.
- **D-07:** Ship Dexie schema v1 with synthetic fixture-based migration tests. No forward-looking v2 stub schema.
- **D-08:** Three version axes stay distinct: Dexie schema version (store-shape), ContentVersion (starter content), SyncOperation.payloadVersion (operation payload shape). Each bumps independently.

**Export / Import / Restore:**
- **D-09:** JSON full-state export = every entity record + full operation log + session history. Operation log is NOT stripped.
- **D-10:** CSV session export = human-readable columns: `startedDate`, `endedDate`, `durationMinutes`, `cellName` (joined), `xpGained`, `currentGenerated`, `energyGained`, `coreChargeGained`, `bloomFired`, `activationGranted`. Units normalized (minutes).
- **D-11:** Default import/restore mode is replace (wipe + write). Merge mode (upsert by ID) is explicit opt-in.
- **D-12:** Import validation is all-or-nothing with typed ValidationIssue list. Pre-flight validates entire archive; any issue rejects import and local data is untouched. Reuses Phase 1 ValidationIssue contract.

### Agent's Discretion
- DATA-07 error surfacing: typed PersistenceError/storage-failure contracts for Phase 3 UI.
- First-run seeding: initial ClientRecord/SettingsRecord/starter CoreRecord creation.
- ClientRecord.id generation: `crypto.randomUUID()` unless a maintained UUID v7 package is clearly better.
- Indexes/query patterns: minimal secondary indexes, only what export/restore/reload require.
- Reload/read path: bulk-read all stores into FlowgridSnapshot on open; eager read for v1.
- Transaction boundaries: wrap each applied command's writes in a single Dexie transaction where feasible.

### Deferred Ideas (OUT OF SCOPE)
- Persisting economy events as a history feed.
- Persisting validation issues for rejected commands as audit rows.
- User-facing rendering of storage errors (typed contract ships now; rendered UX is Phase 3/6).
- Operation log pagination/lazy loading on reload.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | IndexedDB persistence preserves Cells, sessions, Core, modules, forge history, operations, and settings across reloads. | Store topology, reload read path, and first-run seeding below. |
| DATA-02 | Persistence uses normalized entity stores with schema versioning and migrations rather than one giant app-state blob. | Dexie 9-store schema design and versioning model below. |
| DATA-03 | Command persistence writes changed records and sync-ready operations atomically where IndexedDB transaction boundaries allow it. | Transaction boundaries and diff-then-write strategy below. |
| DATA-04 | User can export full local state as JSON. | JSON export archive shape and serialization below. |
| DATA-05 | User can export completed sessions as CSV. | CSV column mapping and cell-name join below. |
| DATA-06 | Import or restore validates schema version, required records, references, and resource invariants before replacing or merging local data. | All-or-nothing import validation pipeline with Zod + invariant checks below. |
| DATA-07 | App handles storage persistence/quota errors with recoverable user-facing states. | Typed PersistenceError contract and recoverable/non-recoverable classification below. |
| SESS-04 | Completed sessions stored as append-only history records with Cell, start/end time, duration, XP, Current, Energy/Core outcome, and Bloom/Activation effects. | SessionRecord mapping to sessions store and append-only enforcement below. |
| VER-03 | Persistence tests cover Dexie schema creation, migration fixtures, repository writes, append-only sessions, export, and restore validation. | fake-indexeddb + Vitest test matrix and migration-fixture harness below. |

</phase_requirements>

---

## Executive Summary

Phase 2 builds the durable persistence spine that sits between Phase 1's simulation engine (which produces `SimulationResult`) and the future app shell/UI (Phase 3+). The repository consumes applied `SimulationResult` outputs only — it never runs simulation rules. It diffs `previousState` vs `nextState` to write only changed entity records, appends the `SyncOperation` and `SessionRecord`, and reads the latest records back into a `FlowgridSnapshot` on reload. [VERIFIED: src/persistence/README.md, 02-CONTEXT.md D-01/D-03]

The store topology is nine Dexie object stores — one per durable entity type — each keyed by its stable string ID. No `moduleDefinitions` store is created (D-06: definitions stay as versioned code content). The schema ships as Dexie v1 with a synthetic-fixture migration-test harness designed for reuse by the real v1→v2 migration. [VERIFIED: 02-CONTEXT.md D-05/D-06/D-07]

Export produces a complete JSON archive (all records + operations + sessions) and a human-readable CSV session export with cell-name joins and minute-normalized durations. Import/restore validates the entire archive all-or-nothing using Zod 4.x at the boundary (schema/shape) plus Phase 1's `validateFlowgridSnapshot` (references/resources/invariants), returning typed `ValidationIssue[]` on any failure without touching local data. [VERIFIED: 02-CONTEXT.md D-09/D-10/D-11/D-12]

**Verified package versions (npm, 2026-06-23):**
- `dexie` 4.4.4 — stable, TypeScript-native, supports `db.version().stores()`, `db.on('populate')`, `db.on('blocked')`, `db.transaction()`, `table.bulkPut()`.
- `fake-indexeddb` 6.2.5 — pure JS in-memory IndexedDB, 82.8% Web Platform Tests pass, TypeScript types built-in (uses TS built-in IndexedDB types), works with Dexie via `import "fake-indexeddb/auto"` before Dexie import, or by passing `{ indexedDB, IDBKeyRange }` to the Dexie constructor.
- `zod` 4.4.3 — stable, `safeParse()` returns `{ success, data?, error? }`, `z.prettifyError()` for human-readable messages, `z.discriminatedUnion()` composes. Used ONLY at import/restore boundary — never in simulation loops or hot read paths.

---

## 1. Dexie 4.x Schema Design & Versioned Migrations

### 1.1 Store Topology (D-05)

Nine object stores, each keyed by its stable string ID. The schema declaration syntax is `primaryKey, index1, index2, ...`. Only indexed properties need to be listed; all object properties are stored regardless.

[VERIFIED: https://dexie.org/docs/Tutorial/Design — "You only need to specify properties that you wish to index. The object store will allow any properties on your stored objects but you can only query them by indexed properties."]

```ts
db.version(1).stores({
  client:         'id',                         // singleton
  cells:          'id',                         // keyed by CellId
  core:           'id',                         // singleton
  moduleInstances:'id, ownerCellId',            // keyed by ModuleInstanceId
  routes:         'id, sourceCellId',           // keyed by RouteId
  sessions:       'id, cellId, startedAt',      // keyed by SessionId; append-only
  operations:     'id, status, createdAt',      // keyed by OperationId; append-only
  settings:       'id',                         // singleton
  forgeHistory:   'id, createdAt',              // keyed by ForgeHistoryId; append-only
});
```

**Index rationale (Agent's Discretion — minimal, only what export/restore/reload need):**
- `moduleInstances.ownerCellId` — reload needs to reconstruct the `ReadonlyMap<ModuleInstanceId, ModuleInstance>`; future Cell-board views will query by Cell. Low cost, high value.
- `routes.sourceCellId` — same reasoning; routes are per-Cell.
- `sessions.cellId, sessions.startedAt` — CSV export needs sessions sorted by date; future history views filter by Cell. `startedAt` index enables ordered reads without in-memory sort.
- `operations.status, operations.createdAt` — future sync reads by status (pending → push); `createdAt` enables ordered audit. Minimal cost.
- `forgeHistory.createdAt` — ordered read for future forge-history view.

No compound indexes are needed for v1. Single-property indexes cover every query the reload, export, and restore paths perform (bulk-read all records, then assemble in memory).

### 1.2 Primary Keys

All stores use inbound keys — the `id` field is part of the stored object and serves as the primary key. This is the natural fit because every Phase 1 record already has a stable string `id` field, and the simulation supplies operation/session IDs from commands (never auto-increment). [VERIFIED: src/domain/records.ts, src/domain/operation-records.ts, src/domain/ids.ts]

Dexie syntax `storeName: 'id'` (first property listed = primary key = inbound key path). No `++` auto-increment anywhere.

### 1.3 Singleton Stores (client, core, settings)

`client`, `core`, and `settings` are singletons — exactly one record each. They still get their own stores (not a merged blob) because:
- Per-entity queries and targeted migrations remain possible.
- Partial sync (future v2) can sync settings independently from core.
- The layer rule says normalized entity stores, not grouped blobs. [VERIFIED: 02-CONTEXT.md D-05]

The singleton invariant (exactly one record) is enforced at the repository write level, not at the IndexedDB schema level (IndexedDB has no "max one record" constraint). The repository's `seedIfEmpty()` and `replaceSingleton()` methods maintain this.

### 1.4 Versioning Model (D-07, D-08)

**Dexie schema versioning** (D-08 axis a): Phase 2 declares `db.version(1)`. This number only bumps when store shapes change (add/remove stores, add/remove indexes, or data-shape upgrade functions needed). [VERIFIED: https://dexie.org/docs/Tutorial/Design — "Create/drop/alter indexes or tables by adding a new version(x) with an updated stores({...}) spec."]

**Key Dexie versioning rules for the planner:**
1. A version with an `.upgrade()` function must never be altered once shipped. Future v2 adds a new `db.version(2).stores({...}).upgrade(tx => {...})` declaration alongside the existing v1 declaration. [VERIFIED: https://dexie.org/docs/Tutorial/Design]
2. Dexie >= 3 only requires keeping versions that have upgrade functions. Pure index changes can bump an existing declaration. [VERIFIED: https://dexie.org/docs/Tutorial/Design]
3. The upgrade transaction rolls back entirely if any upgrade function throws — no half-upgraded state is possible. [VERIFIED: https://dexie.org/docs/Tutorial/Design — "If any error occur in any upgrade function in the sequence, the upgrade transaction will roll back and db.open() will fail."]
4. New versions only specify changed stores; unmentioned stores keep their existing schema. [VERIFIED: https://dexie.org/docs/Tutorial/Design]

**ContentVersion** (D-08 axis b): `STARTER_CONTENT_VERSION = 'flowgrid:starter:v1'` from `src/content/content-version.ts`. Bumps when starter module shapes change. Moot while D-06 holds (definitions not persisted), but the axis is documented.

**payloadVersion** (D-08 axis c): `PAYLOAD_VERSION = 1` from `src/simulation/operation-events.ts`. Bumps when the operation payload shape changes. Future sync uses this to transform old payloads. Independent from Dexie schema version.

### 1.5 Blocked Upgrades (DATA-07)

When another tab holds an open connection and a schema upgrade is requested, Dexie fires `db.on('blocked', ...)`. The upgrade has NOT failed — it resumes when the blocker releases the database. [VERIFIED: https://dexie.org/docs/Dexie/Dexie.on.blocked]

By default, Dexie auto-closes connections on `versionchange` events, so `blocked` is unlikely unless a page hangs. [VERIFIED: https://dexie.org/docs/Dexie/Dexie.on.blocked]

**Recommendation for Phase 2:** subscribe to `db.on('blocked')` and surface it as a `PersistenceError` with `kind: 'blocked_upgrade'` (recoverable). Phase 3 UI renders the "please close other tabs" message. The contract ships in Phase 2; rendering does not.

### 1.6 First-Run Seeding (Agent's Discretion)

Dexie's `db.on('populate', tx => {...})` fires exactly once — when the database is created for the first time (not on upgrades). It runs inside the upgrade transaction. [VERIFIED: https://dexie.org/docs/Dexie/Dexie.on.populate]

**Critical constraint:** the populate callback must use the provided `tx` (transaction) parameter, not the `db` instance, and must not call external async APIs — the upgrade transaction auto-commits if unused. [VERIFIED: https://dexie.org/docs/Dexie/Dexie.on.populate — "NOTE: If the callback is an async function, make sure to use the provided transaction rather than the Dexie instance."]

**Seeding strategy:**
- `client` store: insert a `ClientRecord` with `id = crypto.randomUUID()`, `contentVersion = STARTER_CONTENT_VERSION`, `createdAt/updatedAt = now`.
- `settings` store: insert a default `SettingsRecord` (from `formulas.ts` constants).
- `core` store: insert a starter `CoreRecord` with zeroed counters and default allocation.
- `cells`, `moduleInstances`, `routes`, `sessions`, `operations`, `forgeHistory`: empty on first run. Cells/modules/routes are created by future user actions (Phase 3+); sessions/operations/forgeHistory start empty.

**Alternative considered:** seed in a post-open check (`if stores empty, seed`). This is more flexible (can read external inputs) but requires a second transaction. For Phase 1 starter state (pure deterministic constants), `on('populate')` is simpler and atomic. The planner should use `on('populate')` for the singleton defaults and document that any future async-seeded content would move to `on('ready')`.

**`now` for seeding:** the populate callback needs an ISO timestamp. Since persistence is allowed to call `new Date().toISOString()` (the layer rule forbids simulation from using ambient time, not persistence), the seed function generates `now` internally. This is the one place persistence creates timestamps — all other timestamps come from `SimulationResult` records.

---

## 2. Append-Only Session History (SESS-04)

### 2.1 SessionRecord Mapping

The `SessionRecord` from `src/domain/records.ts` maps directly to a record in the `sessions` store. Its shape already contains every field SESS-04 requires:

| SESS-04 field | SessionRecord field |
|---|---|
| Cell | `cellId` |
| start time | `startedAt` (IsoDateTimeString) |
| end time | `endedAt` (IsoDateTimeString) |
| duration | `durationSeconds` (IntSeconds) |
| XP | `xpGained` (IntNonNegative) |
| Current | `currentGenerated` (IntNonNegative) |
| Energy/Core outcome | `energyGained`, `coreChargeGained` (IntNonNegative) |
| Bloom effect | `bloomFired` (boolean) |
| Activation effect | `activationGranted` (boolean) |

No new fields or transformations are needed. The repository stores the record as-is. [VERIFIED: src/domain/records.ts:93-106]

### 2.2 Append-Only Enforcement (D-04)

Sessions are append-only: a session should never be mutated once written. The idempotent-upsert rule (D-04) enforces this mechanically:

- **Same `id` + identical payload** → silent no-op (safe for retries, replays, and future sync).
- **Same `id` + different payload** → typed conflict signal (`PersistenceError` with `kind: 'session_conflict'`), write rejected.

This is stronger than a simple "never update" rule because it catches bugs where a different session accidentally collides with an existing ID, while allowing safe retry/replay. [VERIFIED: 02-CONTEXT.md D-04]

**Implementation:** before writing a session, `table.get(id)` checks for an existing record. If found, deep-compare (JSON-serialize both sides for exact byte equality — Phase 1's deterministic replay guarantees identical serialization). If different, reject. If same, skip.

**Deep-compare note:** Phase 1's deterministic-replay guarantee (Phase 1 D-08) means the same command produces byte-identical records, so JSON-serialize-and-compare is safe and simple. A structural deep-equal is equivalent but more code. The planner should use `JSON.stringify(a) === JSON.stringify(b)` with a comment citing Phase 1 determinism.

### 2.3 Session History Integrity

The `sessions` store is never bulk-cleared except by an explicit replace-mode restore (which wipes and rewrites the entire archive). Normal command writes only append. There is no `table.update()` or `table.delete()` path for sessions in the repository API. [VERIFIED: 02-CONTEXT.md — "Completed sessions and forge history are append-only unless a future explicit adjustment record exists."]

---

## 3. Sync-Ready Operation Rows

### 3.1 SyncOperation Mapping

`SyncOperation` from `src/domain/operation-records.ts` maps directly to a record in the `operations` store:

```ts
interface SyncOperation {
  id: OperationId;        // stable, command-supplied
  commandType: string;
  entityType: EntityType;
  entityId: string;
  payloadVersion: number; // = 1 (D-08 axis c)
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  status: OperationStatus; // 'pending' | 'applied' | 'failed'
  payload: unknown;        // command-specific
}
```

Every field is already sync-ready: stable ID, entity type for routing, payload version for transformation, timestamps for ordering, status for retry. [VERIFIED: src/domain/operation-records.ts]

### 3.2 Operation Store as Sync Source of Truth

The `operations` store is the future sync layer's source of truth — Phase 2 shapes it for v2 sync even though no transport ships. The store is append-only under the same idempotent-upsert rule (D-04) as sessions. [VERIFIED: 02-CONTEXT.md D-09 — "The operation store is the future sync layer's source of truth."]

**Status lifecycle in Phase 2:** all operations written by Phase 2 repository consume `SimulationResult.operations`, which are emitted with `status: 'applied'` by `operationFromCommand()`. The `'pending'` and `'failed'` statuses exist in the enum but are not populated by Phase 2's write path. Future sync will set `'pending'` on creation and flip to `'applied'` after server acknowledgment; `'failed'` remains for future audit. [VERIFIED: src/simulation/operation-events.ts:66]

### 3.3 Conflict Rule Readiness

Phase 2 does not implement multi-device conflict resolution (deferred to v2 SYNC-01..SYNC-03). But the operation row shape is designed so future conflict rules can be entity-specific:

| Entity | Likely conflict rule (future v2) |
|---|---|
| sessions | Last-write-wins by ID; append-only, no real conflict possible |
| operations | Server-applied ordering by createdAt; payload version transform |
| cells, core, settings | Last-write-wins or field-level merge |
| moduleInstances, routes | Last-write-wins; referential integrity re-validated on merge |
| forgeHistory | Append-only; monotonic forgeCount enforced |

The planner should document that Phase 2's conflict surface is limited to the D-04 payload-mismatch check (single-device integrity), not multi-device merge.

---

## 4. Repository Layer Boundary

### 4.1 Layer Rule

The repository sits between simulation and UI. It:
- **Consumes** `SimulationResult` (write path) and produces `FlowgridSnapshot` (read path).
- **Does NOT** run simulation rules, calculate economy values, or emit events.
- **Does NOT** import from `src/simulation` (except type-only imports for `SimulationResult`).

[VERIFIED: src/persistence/README.md — "Persistence will consume FlowgridSnapshot, SessionRecord, and SyncOperation records produced by the simulation; it will never run simulation rules."]

### 4.2 ESLint Boundary Enforcement

The existing ESLint config blocks `src/simulation/**` from importing Dexie, fake-indexeddb, and persistence. Phase 2 should add the **reverse** boundary: `src/persistence/**` must not import from `src/simulation/**` (except type-only). The planner should extend `eslint.config.js` with a `no-restricted-imports` block for persistence files. [VERIFIED: eslint.config.js — simulation block is the model to mirror]

**Recommended persistence import rules:**
```js
{
  files: ['src/persistence/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { name: 'dexie', message: 'Import Dexie through the database module, not directly in repositories.' },
      ],
      patterns: [
        {
          group: ['@/simulation/*', '@/simulation', '../simulation/*', '../simulation', '../../simulation/*', '../../simulation'],
          message: 'Persistence must not import simulation. Consume SimulationResult types only.',
        },
      ],
    }],
  },
}
```

Type-only imports (`import type { SimulationResult } from '../simulation/...'`) should be allowed because the repository needs the type contract but must not call simulation functions. TypeScript's `verbatimModuleSyntax: false` (current tsconfig) permits type-only imports without runtime coupling. [VERIFIED: tsconfig.json — `verbatimModuleSyntax: false`]

### 4.3 Repository API Surface

The planner should define a `FlowgridRepository` interface with these operations:

**Write path:**
```ts
applyResult(result: SimulationResult): Promise<ApplyResult>;
// ApplyResult = { ok: true } | { ok: false, error: PersistenceError }
// Only called when result.status === 'applied'.
// Diffs previousState vs nextState, writes changed records + operations + sessions.
```

**Read path:**
```ts
loadSnapshot(): Promise<FlowgridSnapshot>;
// Bulk-reads all 9 stores, assembles FlowgridSnapshot.
// Seeds if empty (first run).
```

**Export:**
```ts
exportJson(): Promise<JsonArchive>;
// Reads all stores, returns a serializable archive object.
exportSessionCsv(): Promise<string>;
// Reads sessions + cells, produces CSV string with cellName join.
```

**Import/Restore:**
```ts
importArchive(archive: unknown, mode: 'replace' | 'merge'): Promise<ImportResult>;
// ImportResult = { ok: true, stats: ImportStats } | { ok: false, issues: ValidationIssue[] }
// Validates entire archive before touching local data (D-12).
```

**Lifecycle:**
```ts
open(): Promise<void>;
close(): Promise<void>;
```

### 4.4 Diff Strategy (D-03)

The repository diffs `previousState` vs `nextState` to write only changed records. The `FlowgridSnapshot` has these mutable entity maps: `cells`, `moduleInstances`, `routes`. The `core`, `client`, and `settings` are singletons (compare by deep equality). Sessions, operations, and forgeHistory are arrays (compare lengths and tail).

**Diff algorithm (per entity type):**

For map-based entities (cells, moduleInstances, routes):
1. For each key in `nextState.entities`: if not in `previousState.entities` → insert. If in both and different → update.
2. For each key in `previousState.entities` not in `nextState.entities` → delete (rare in Phase 1; cells are archived not deleted, but the diff handles it).

For singleton entities (client, core, settings):
1. JSON-serialize both sides; if different → put (upsert).

For array entities (sessions, operations, forgeHistory):
1. Find new tail elements (those in `nextState` but not in `previousState` by ID).
2. Write each new element with the idempotent-upsert check (D-04).

**Cascade example:** a `complete_focus_session` command touches:
- `client` (updatedAt bump) → 1 singleton write
- `cells` (the focus Cell) → 1 map write
- `core` (Energy/Charge/allocations) → 1 singleton write
- `sessions` (new SessionRecord) → 1 append
- `operations` (new SyncOperation) → 1 append

All five writes go in a single Dexie transaction (DATA-03). [VERIFIED: src/simulation/commands/complete-focus-session.ts:216-226 — nextState spreads previousState and overrides cells, core, sessions, operations, client]

### 4.5 Transaction Boundaries (DATA-03, Agent's Discretion)

Each `applyResult()` call wraps all writes in a single Dexie transaction:

```ts
await db.transaction('rw', db.client, db.cells, db.core, db.moduleInstances, db.routes, db.sessions, db.operations, db.settings, db.forgeHistory, async () => {
  // 1. Diff and write changed entity records
  // 2. Append new sessions (with idempotent-upsert check)
  // 3. Append new operations (with idempotent-upsert check)
  // 4. Any error aborts the entire transaction — no partial writes
});
```

[VERIFIED: https://dexie.org/docs/Dexie/Dexie.transaction() — "If modifying a database and an error occurs, every modification will be rolled back."]

**Replace-mode restore** wraps the wipe + write set in a transaction where feasible. Note: `db.tables.forEach(t => t.clear())` followed by bulk writes can fit in a single transaction across all 9 stores. If the archive is extremely large (future concern), the transaction may time out — but Phase 2 scale is small (single-user, hundreds of sessions at most).

**Transaction scope rule:** all tables that might be written must be included in the transaction declaration. Forgetting a table causes a runtime error. [VERIFIED: https://dexie.org/docs/Dexie/Dexie.transaction() — "If you forget to include a table required by a function, the operation will fail."]

---

## 5. Export / Import / Restore

### 5.1 JSON Export Archive (D-09)

The JSON archive is a complete portable snapshot of all durable state:

```ts
interface JsonArchive {
  readonly archiveVersion: 1;           // archive format version (distinct from Dexie/schema/content/payload)
  readonly exportedAt: IsoDateTimeString;
  readonly client: ClientRecord;
  readonly cells: readonly CellRecord[];
  readonly core: CoreRecord;
  readonly moduleInstances: readonly ModuleInstance[];
  readonly routes: readonly RouteRecord[];
  readonly sessions: readonly SessionRecord[];
  readonly operations: readonly SyncOperation[];
  readonly settings: SettingsRecord;
  readonly forgeHistory: readonly ForgeHistoryRecord[];
}
```

**`archiveVersion`** is a fourth version axis: it identifies the archive envelope shape, not the store schema or content. It lets future importers detect and transform old archive formats. The planner should document all four version axes in the code:
1. `archiveVersion` — archive envelope shape (in JsonArchive)
2. Dexie schema version — store shape (in Dexie declaration)
3. `ContentVersion` — starter content (in ClientRecord.contentVersion)
4. `SyncOperation.payloadVersion` — operation payload shape (in SyncOperation)

[VERIFIED: 02-CONTEXT.md D-08, D-09]

### 5.2 CSV Session Export (D-10)

Human-readable, spreadsheet-friendly. Columns per D-10:

| Column | Source | Transform |
|---|---|---|
| `startedDate` | `session.startedAt` | Extract date portion (first 10 chars of ISO string: `YYYY-MM-DD`) |
| `endedDate` | `session.endedAt` | Same |
| `durationMinutes` | `session.durationSeconds` | `Math.round(durationSeconds / 60)` or `Math.floor`; planner should pick floor for consistency with `focusToXp` |
| `cellName` | `CellRecord.name` (joined via `session.cellId`) | Lookup in cells map |
| `xpGained` | `session.xpGained` | As-is |
| `currentGenerated` | `session.currentGenerated` | As-is |
| `energyGained` | `session.energyGained` | As-is |
| `coreChargeGained` | `session.coreChargeGained` | As-is |
| `bloomFired` | `session.bloomFired` | `true`/`false` string |
| `activationGranted` | `session.activationGranted` | `true`/`false` string |

**CSV escaping:** use standard RFC 4180 quoting — wrap fields containing commas, quotes, or newlines in double quotes; escape internal quotes by doubling. The planner should implement a small `csvEscape()` helper (no dependency needed for 10 columns). Sessions sorted by `startedAt` ascending for chronological readability.

**Cell-name join:** sessions reference `cellId`, but the CSV needs `cellName`. The export reads the `cells` store, builds a `Map<CellId, CellRecord>`, and joins. If a session's `cellId` is missing from cells (shouldn't happen due to referential integrity, but defensive), emit `cellName = '(unknown)'`. [VERIFIED: 02-CONTEXT.md D-10 — "cellId alone is opaque."]

### 5.3 Import Validation Pipeline (D-12)

All-or-nothing. Validate the entire archive before touching local data. The pipeline:

```
1. Parse JSON → unknown
2. Zod schema validation (shape/structure) → typed issues or parsed archive
3. Referential integrity (Phase 1 validateReferences) → typed issues
4. Resource invariants (Phase 1 validateNoNegativeResources, validateCoreAllocation, etc.) → typed issues
5. If ANY issues → return { ok: false, issues }, local data untouched
6. If zero issues → execute replace or merge
```

**Step 1-2: Zod boundary validation.** Zod 4.x `safeParse()` returns `{ success: true, data } | { success: false, error }`. The error is a `ZodError` with structured issues. The planner should map Zod issues to `ValidationIssue` with `code: 'invalid_operation_shape'` (closest existing code for "the thing I received is not shaped correctly") and `path` from the Zod issue path.

Zod schemas to define (in `src/persistence/validation-schemas.ts`):
- `z.object()` for each record type, with `z.string()` for IDs, `z.number().int().nonnegative()` for integer economy fields, `z.string().datetime()` for ISO timestamps, `z.boolean()` for flags.
- The archive schema composes record schemas.
- `payload: z.unknown()` on the operation schema (payload is command-specific and validated by the simulation, not by persistence).

[VERIFIED: https://zod.dev/v4 — `safeParse`, `z.object`, `z.number().int().nonnegative()` all stable in v4]

**Step 3-4: Phase 1 invariant reuse.** After Zod parsing, assemble the archive into a `FlowgridSnapshot` (maps + arrays) and call `validateFlowgridSnapshot()` from `src/domain/invariants.ts`. This reuses the exact same validators Phase 1 built: `validateNoNegativeResources`, `validateReferences`, `validateNoDuplicateInstalls`, `validateRouteAllocations`, `validateCoreAllocation`, `validateOperationShape`. [VERIFIED: src/domain/invariants.ts:275-283]

This is elegant: the import path validates archives against the same invariants the simulation enforces after every command. An archive that passes import validation is guaranteed to be in a safe economy state.

**Step 6: Replace vs Merge (D-11):**
- **Replace (default):** `db.transaction('rw', allTables, async () => { await Promise.all(allTables.map(t => t.clear())); await bulkWriteArchive(archive); })`. Wipes all stores, writes the archive. Atomic if it fits in one transaction.
- **Merge (opt-in):** `db.transaction('rw', allTables, async () => { for each record: upsert by ID })`. Conflicts on payload mismatch (D-04) are checked per-record. No wipe.

### 5.4 Where Zod Belongs (and Doesn't)

**Zod is used ONLY at the import/restore boundary.** It does NOT appear in:
- Simulation loops (hot path).
- Repository write path (records come from trusted `SimulationResult`).
- Reload read path (records come from our own IndexedDB stores).
- Export (we're serializing our own trusted records).

[VERIFIED: research/STACK.md — "Use for imported backups, migration outputs, sync operation payloads, and dev-only invariant checks. Do not put Zod in hot simulation loops."]

This keeps Zod's bundle cost isolated to the import code path (tree-shakeable if import is lazy-loaded in Phase 3+).

---

## 6. Typed PersistenceError Contract (DATA-07)

Phase 2 ships a typed error contract that Phase 3 UI will render. No rendering ships in Phase 2. [VERIFIED: 02-CONTEXT.md Agent's Discretion — "Phase 2 delivers typed PersistenceError/storage-failure contracts... No user-facing rendering ships in Phase 2."]

### 6.1 Error Taxonomy

```ts
type PersistenceErrorKind =
  | 'quota_exceeded'        // recoverable: user can clear data or export+reset
  | 'persistence_denied'    // recoverable: browser storage policy blocked IndexedDB
  | 'blocked_upgrade'       // recoverable: another tab holds the DB; user closes it
  | 'write_failure'         // may be transient: generic write error
  | 'session_conflict'      // integrity: same sessionId, different payload (D-04)
  | 'operation_conflict'    // integrity: same operationId, different payload (D-04)
  | 'indexeddb_unavailable' // non-recoverable: IndexedDB not supported/disabled
  | 'unknown';              // catch-all

interface PersistenceError {
  readonly kind: PersistenceErrorKind;
  readonly message: string;
  readonly recoverable: boolean;
  readonly cause?: unknown; // original DOMException or Error
}
```

**Recoverable vs non-recoverable classification:**
- Recoverable: user action can resolve it (close tabs, clear space, change browser settings). App can retry.
- Non-recoverable: app cannot function (IndexedDB unavailable). App should surface a "cannot save data" state.

### 6.2 DOMException Mapping

IndexedDB errors surface as `DOMException` with a `name` property. The repository maps known names:

| DOMException.name | PersistenceErrorKind | Recoverable |
|---|---|---|
| `QuotaExceededError` | `quota_exceeded` | Yes |
| `SecurityError` | `persistence_denied` | Yes |
| `InvalidStateError` (DB blocked) | `blocked_upgrade` | Yes |
| `UnknownError`, `DataError` | `write_failure` | Maybe |
| `OperationError` | `write_failure` | Maybe |

If `indexedDB` global is undefined → `indexeddb_unavailable` (non-recoverable).

### 6.3 Conflict Errors (D-04)

Session and operation conflicts (same ID, different payload) are `session_conflict` / `operation_conflict`. These indicate either a bug (two different sessions with the same ID) or a corrupted replay. Recoverable only by rejecting the write — the caller (app shell) decides whether to log, alert, or ignore.

---

## 7. UUID Strategy (Agent's Discretion)

### 7.1 Recommendation: `crypto.randomUUID()` for ClientRecord.id

[VERIFIED: 02-CONTEXT.md — "The agent should pick crypto.randomUUID() unless a sortable UUID v7 package is clearly maintained."]

**`crypto.randomUUID()`** is available in:
- Node.js 19+ (global `crypto` object). The project's `@types/node` ^22.10.0 and current Node runtime support it.
- All modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+).

It generates RFC 4122 v4 UUIDs (random). For a client/device ID that is created once and never sorted, v4 is sufficient. The client ID does not need sortability — it's a singleton key, not a timestamp-ordered record.

**No UUID v7 package needed.** The `uuid` npm package (14.0.1) supports v7 (RFC 9562), but adding a runtime dependency for a single `crypto.randomUUID()` call is unnecessary weight. Operation and session IDs continue to be command-supplied (Phase 1 contract), not persistence-generated. [VERIFIED: src/domain/operation-records.ts — "Operation IDs come from the command (caller-supplied), never generated inside simulation."]

### 7.2 When UUID v7 Would Matter

UUID v7 (timestamp-prefixed, sortable) would be valuable for **operation IDs** if sync needed time-ordered iteration without a separate index. But Phase 1 already decided operation IDs are command-supplied strings (could be any format), and the `operations` store has a `createdAt` index for ordering. So v7 is not needed.

**Decision: `crypto.randomUUID()` for the one persistence-generated ID (ClientRecord.id). No uuid package dependency.**

---

## 8. Offline / Exploit Safety

### 8.1 Persistence Design Supporting Economy Safety

The economy-safety constraints from PROJECT.md map to persistence design choices:

| Exploit/Invariant | Persistence mitigation |
|---|---|
| Negative resources | Import validation runs `validateNoNegativeResources`; write path trusts `SimulationResult` (already validated) |
| Duplicate module installs | Import validation runs `validateNoDuplicateInstalls` |
| Token duplication | Import validation runs `validateMonotonicCounters` (token regression check) |
| Forge count resets | Import validation runs `validateMonotonicCounters` (forge count regression check) |
| Route allocation drift | Import validation runs `validateRouteAllocations` (sum ≤ 100) |
| Offline production exploits | Persistence stores NO idle-production logic; no timer-driven writes; only `applyResult()` writes, and only for `status === 'applied'` results |
| Same-tick infinite loops | Repository writes are synchronous per-command; no cascade or auto-retry loop |

### 8.2 No Offline Idle Production

Phase 2 persistence does NOT implement any form of offline production, idle reward calculation, or "catch-up" processing. The repository is a passive store: it writes what the simulation produces and reads what was stored. Any "time gap" processing (e.g., Core Charge decay, Momentum changes) is a Phase 3+ simulation concern, not a persistence concern. [VERIFIED: PROJECT.md — "Offline idle production as a primary reward" is out of scope; REJ-03 — "Rejuvenation cannot create meaningful Module Token progress without prior Core Charge from activity."]

### 8.3 Append-Only Integrity

Sessions, operations, and forgeHistory are append-only. The repository API has no `updateSession`, `deleteOperation`, or `clearHistory` method. The only path that clears these stores is replace-mode restore, which is an explicit, validated, user-initiated action. This prevents casual mutation of history. [VERIFIED: PROJECT.md — "Completed sessions are append-only real history and should not be casually mutated."]

---

## 9. fake-indexeddb + Vitest Testing (VER-03)

### 9.1 Setup

`fake-indexeddb` 6.2.5 provides a pure JS in-memory IndexedDB implementation. It works with Dexie by importing `fake-indexeddb/auto` before Dexie, which sets global `indexedDB` and `IDBKeyRange`. [VERIFIED: https://www.npmjs.com/package/fake-indexeddb — "If you import fake-indexeddb/auto before importing dexie, it should work."]

**Vitest setup:** add a setup file that imports `fake-indexeddb/auto`:

```ts
// tests/helpers/setup-indexeddb.ts
import 'fake-indexeddb/auto';
```

Update `vitest.config.ts`:
```ts
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/helpers/setup-indexeddb.ts'],
    globals: false,
  },
});
```

Alternatively, pass `{ indexedDB, IDBKeyRange }` to the Dexie constructor in tests to avoid polluting the global scope. The planner should pick global setup (`fake-indexeddb/auto` in setupFiles) for simplicity — Phase 2 tests are all persistence tests that need IndexedDB.

**Test isolation:** each test creates a fresh `IDBFactory` instance or uses a unique database name per test to avoid cross-test contamination:

```ts
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  // Reset IndexedDB to a clean state
  (globalThis as any).indexedDB = new IDBFactory();
});
```

[VERIFIED: https://www.npmjs.com/package/fake-indexeddb — "Wiping/resetting the indexedDB for a fresh state: indexedDB = new IDBFactory();"]

### 9.2 Test Matrix (VER-03)

VER-03 requires coverage of: schema creation, migration fixtures, repository writes, append-only sessions, export, and restore validation.

| Test category | Test cases | Priority |
|---|---|---|
| **Schema creation** | Opens DB with v1 schema; all 9 stores exist; singleton stores are empty before seed; `on('populate')` seeds client/settings/core | P0 |
| **First-run seeding** | Fresh DB → `loadSnapshot()` returns a valid starter `FlowgridSnapshot` with client, core, settings, and empty history | P0 |
| **Reload durability** | Write a focus-session result, reload (fresh repository instance), verify `FlowgridSnapshot` matches | P0 |
| **Repository writes** | `applyResult(appliedResult)` writes changed cells/core/sessions/operations; `applyResult(rejectedResult)` writes nothing; `applyResult(notImplementedResult)` writes nothing | P0 |
| **Diff correctness** | Apply a result that changes only one cell → only that cell is written (verify via spy or read-back); core singleton write happens when core changes | P1 |
| **Idempotent upsert (D-04)** | Apply same result twice → second is no-op; apply result with same session ID but different payload → `session_conflict` error | P0 |
| **Transaction atomicity** | Mid-transaction error aborts all writes (mock or force a failure); verify no partial state | P1 |
| **Append-only sessions** | Write session; attempt to modify (no API exists); verify no update path; verify conflict on payload mismatch | P0 |
| **JSON export** | Export after known writes → archive matches expected shape; `archiveVersion` present; all stores represented | P0 |
| **CSV export** | Export sessions with known data → columns match D-10; cellName joined; duration in minutes; CSV escaping correct | P0 |
| **Import validation (D-12)** | Valid archive → imports successfully; archive with negative resource → rejected with `ValidationIssue[]`; broken reference → rejected; missing required record → rejected; wrong schema → rejected with Zod-mapped issues | P0 |
| **Import replace mode** | Replace wipes existing data, writes archive; verify exact match | P0 |
| **Import merge mode** | Merge upserts by ID without wiping; existing records not in archive survive | P1 |
| **Import atomicity** | Invalid archive → local data completely untouched (verify by reading back pre-import state) | P0 |
| **Migration fixtures (D-07)** | Synthetic v0 fixture → upgrade function → v1 shape; field transforms verified; harness reusable for future v2 | P1 |
| **PersistenceError surfacing** | Quota exceeded (simulate) → `PersistenceError` with `kind: 'quota_exceeded'`; blocked upgrade → `kind: 'blocked_upgrade'` | P1 |

### 9.3 Migration-Fixture Harness (D-07)

Phase 2 ships only Dexie v1, so there is no real v0→v1 migration to test. Instead, build a **synthetic-fixture harness** that:

1. Defines a synthetic "pre-v1" fixture (e.g., a record with an old field name or missing field).
2. Runs a synthetic upgrade function that transforms it to the v1 shape.
3. Asserts the transformed record matches the expected v1 shape.
4. Is structured so the real v1→v2 migration (when it arrives) plugs into the same harness.

**Harness structure:**

```ts
// tests/persistence/migration-harness.ts
interface MigrationFixture<OldShape, NewShape> {
  readonly description: string;
  readonly input: OldShape;
  readonly upgrade: (record: OldShape) => NewShape;
  readonly expected: NewShape;
}

function runMigrationFixture<T, U>(fixture: MigrationFixture<T, U>): void {
  it(fixture.description, () => {
    const result = fixture.upgrade(fixture.input);
    expect(result).toEqual(fixture.expected);
  });
}
```

**Example synthetic fixture:** a `CellRecord` from a hypothetical "v0" that used `milestoneProgress` (seconds) instead of `dailyMilestoneProgressSeconds`. The upgrade function renames the field. The fixture proves the harness can exercise field-level transforms.

The harness should also test **schema-level upgrades** using fake-indexeddb: create a DB at a synthetic old version, then open with the new version, and verify the upgrade transaction runs the upgrade function and transforms data correctly. This is the highest-fidelity migration test possible without real browser IndexedDB.

**Why not a forward v2 stub (D-07 rejected alternative):** the discussion rejected shipping a throwaway v2 stub schema. The harness proves the mechanism without polluting the shipped schema. When real v2 arrives, it adds `db.version(2).stores({...}).upgrade(...)` and a real fixture — the harness is already there. [VERIFIED: 02-DISCUSSION-LOG.md Q3]

### 9.4 Property-Based Persistence Tests (VER-02 extension)

The planner may consider a few fast-check property tests for persistence invariants:

| Property | Generator | Invariant |
|---|---|---|
| Export-then-import round-trip | Arbitrary valid `FlowgridSnapshot` | `import(export(state))` reproduces `state` |
| Reload round-trip | Arbitrary applied `SimulationResult` | `loadSnapshot()` after `applyResult()` matches `result.nextState` |
| Idempotent apply | Arbitrary applied `SimulationResult` | `apply(r)` then `apply(r)` === `apply(r)` once |

These are optional but high-value. The planner should prioritize P0 tests first and add property tests if time allows.

---

## Validation Architecture

> This project has `nyquist_validation` disabled. This section focuses on concrete testing strategy rather than Nyquist sampling dimensions.

### Testing Layers

| Layer | Tool | Scope | Existing? |
|---|---|---|---|
| Pure simulation unit tests | Vitest (node env) | Phase 1 commands, invariants | Yes (36 tests) |
| Pure persistence unit tests | Vitest (node env) + fake-indexeddb | Repository, export, import, migrations | **Phase 2 adds** |
| Property-based tests | fast-check | Economy invariants, persistence round-trips | Phase 1 has economy; Phase 2 may extend |
| Browser E2E | Playwright (Phase 6) | Full reload-with-state-preserved flow | Deferred to Phase 6 (VER-04) |

### Phase 2 Validation Gaps (what Phase 2 cannot fully verify)

1. **Real browser IndexedDB behavior** — fake-indexeddb has 82.8% WPT pass rate; edge cases (quota enforcement, actual `onblocked` firing, structured clone of complex objects) differ from real browsers. Phase 6 browser tests (VER-04) cover the real-browser reload flow. [VERIFIED: https://www.npmjs.com/package/fake-indexeddb — quality table]

2. **Actual quota exceeded** — fake-indexeddb does not enforce quota. Quota-error mapping must be unit-tested by mocking the DOMException, not by actually filling storage.

3. **Cross-tab blocked upgrade** — requires two real browser tabs. Unit-tested by mocking; verified in Phase 6 browser tests.

4. **Large-scale performance** — Phase 2 tests use small datasets. Performance at thousands of sessions is not validated. Acceptable for v1 single-user scale; revisit if a later phase shows growth.

### What Phase 2 CAN and MUST Verify

- Schema creation and store existence (fake-indexeddb).
- First-run seeding produces valid starter state.
- Reload round-trip preserves all entity types.
- Repository writes only on `applied` results.
- Diff correctness (only changed records written).
- Idempotent upsert with conflict detection (D-04).
- Append-only session enforcement (no mutation path).
- JSON export shape completeness.
- CSV export column mapping and escaping.
- Import validation rejects all D-12 failure modes (schema, missing, refs, resources).
- Import replace and merge modes.
- Import atomicity (local data untouched on rejection).
- Migration-fixture harness exercises field transforms.
- PersistenceError mapping for known DOMException names.

---

## Recommended Source Layout

New files in `src/persistence/`:

```txt
src/persistence/
  README.md                    (update: remove "Phase 1 placeholder", document the layer)
  database.ts                  (Dexie subclass, schema declaration, on('populate') seed)
  repository.ts                (FlowgridRepository: applyResult, loadSnapshot, open, close)
  diff.ts                      (changed-record detection: diffFlowgridSnapshots)
  export-json.ts               (JsonArchive type, exportJson)
  export-csv.ts                (exportSessionCsv, csvEscape)
  import.ts                    (importArchive, replace/merge execution)
  validation-schemas.ts        (Zod schemas for archive and record types)
  import-validation.ts         (validateArchive → ValidationIssue[], composes Zod + Phase 1 invariants)
  errors.ts                    (PersistenceError type, DOMException mapping)
  seeding.ts                   (seedStarterState for on('populate'))
  ids.ts                       (generateClientId → crypto.randomUUID())
  index.ts                     (barrel re-export)
```

New test files in `tests/persistence/`:

```txt
tests/persistence/
  schema.test.ts               (store creation, first-run seeding)
  repository.test.ts           (applyResult, loadSnapshot, reload durability)
  diff.test.ts                 (changed-record detection edge cases)
  append-only.test.ts          (session/operation idempotent upsert, conflict detection)
  export-json.test.ts          (JSON archive shape and completeness)
  export-csv.test.ts           (CSV columns, cellName join, escaping)
  import-validation.test.ts    (all D-12 rejection modes)
  import-replace.test.ts       (replace mode wipe+write)
  import-merge.test.ts         (merge mode upsert)
  migration-harness.test.ts    (synthetic fixture-based migration tests)
  errors.test.ts               (PersistenceError mapping)
```

### Dependencies to Add

```json
{
  "dependencies": {
    "dexie": "^4.4.4"
  },
  "devDependencies": {
    "fake-indexeddb": "^6.2.5",
    "zod": "^4.4.3"
  }
}
```

**Note on dependency classification:**
- `dexie` is a **runtime dependency** — it powers the actual IndexedDB layer in the shipped app.
- `fake-indexeddb` is a **dev dependency** — only used in tests.
- `zod` is a **runtime dependency** — used at the import/restore boundary in the shipped app. It is tree-shakeable and only loaded when import is called. If Phase 3 lazy-loads the import module, Zod stays out of the main bundle.

No UUID package is needed (`crypto.randomUUID()` is a platform API).

---

## Key Decisions for the Planner

1. **Dexie schema declaration** goes in `src/persistence/database.ts`. One `db.version(1).stores({...})` call with the 9-store topology. Future versions add new `db.version(2)...` declarations alongside, never modifying v1.

2. **First-run seeding** uses `db.on('populate')` with the provided transaction. Seeds `client` (with `crypto.randomUUID()`), `settings`, and `core` only. Other stores start empty.

3. **Repository consumes `SimulationResult`** via a type-only import. No runtime import from `src/simulation`. The ESLint boundary block enforces this.

4. **Diff is a pure function** (`diffFlowgridSnapshots(prev, next)`) returning a write plan (inserts, updates, deletes, appends). The repository executes the plan in a transaction. This separation makes the diff unit-testable without IndexedDB.

5. **Idempotent upsert** is implemented as: `get(id)` → if exists, JSON-compare → if same, skip → if different, return conflict. If not exists, `put()`. This is O(1) per record and correct under Phase 1's determinism guarantee.

6. **Zod schemas** are defined once in `validation-schemas.ts` and used only by `import-validation.ts`. They mirror the `src/domain/records.ts` shapes but add runtime parsing. If a record shape changes, both the domain type and the Zod schema must update — the planner should note this as a maintenance coupling.

7. **Import validation composes** Zod (shape) + Phase 1 `validateFlowgridSnapshot()` (invariants). This means the same validators protect both simulation output and imported archives — single source of truth for economy safety.

8. **Transaction scope** for `applyResult()` includes all 9 stores. Even if a command only touches 3 stores, including all is safe and avoids "table not in transaction" errors if a future command touches more.

9. **`archiveVersion`** is a new version axis (envelope shape), documented alongside the other three. Set to `1` in Phase 2.

10. **CSV escaping** uses a small inline helper (no papaparse dependency for 10 columns). RFC 4180 quoting.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| fake-indexeddb behavior diverges from real IndexedDB on edge cases | Medium | Medium | Phase 6 browser tests (VER-04) cover real-browser reload; Phase 2 tests cover logic, not browser quirks |
| Transaction timeout on large replace-mode restore | Low | Medium | Phase 2 scale is small; document the limit; revisit if archives grow |
| Zod schema drift from domain types | Medium | Low | Keep schemas in one file; add a type-level assertion `z.infer<typeof schema> extends RecordType` |
| `on('populate')` async pitfalls | Low | High | Use sync seed (constants only); no ajax/async in populate; document the constraint |
| Idempotent-upsert O(n) on large operation log | Low | Low | `get(id)` is indexed O(1); fine for single-user scale |
| Dexie v4 breaking changes from v3 patterns | Low | Medium | Verified against v4 docs; v4 is stable since 2024; patterns used here are v3-stable and v4-compatible |

---

## Source Citations

- Phase 1 code contracts: `src/domain/records.ts`, `src/domain/operation-records.ts`, `src/domain/result.ts`, `src/domain/validation.ts`, `src/domain/ids.ts`, `src/domain/invariants.ts`, `src/domain/primitives.ts`, `src/domain/time.ts`
- Phase 1 simulation: `src/simulation/engine.ts`, `src/simulation/commands/complete-focus-session.ts`, `src/simulation/operation-events.ts`, `src/simulation/commands/not-implemented.ts`
- Phase 1 content: `src/content/starter-state.ts`, `src/content/starter-modules.ts`, `src/content/content-version.ts`, `src/content/formulas.ts`
- Phase 1 tests: `tests/helpers/fixtures.ts`, `tests/helpers/replay.ts`
- Config: `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`
- Decisions: `.planning/phases/02-durable-local-first-spine/02-CONTEXT.md`, `02-DISCUSSION-LOG.md`
- External docs: https://dexie.org/docs/Tutorial/Design, https://dexie.org/docs/Dexie/Dexie.transaction(), https://dexie.org/docs/Dexie/Dexie.on.populate, https://dexie.org/docs/Dexie/Dexie.on.blocked, https://dexie.org/docs/Table/Table.bulkPut(), https://www.npmjs.com/package/fake-indexeddb, https://zod.dev/v4
- npm versions verified 2026-06-23: dexie 4.4.4, zod 4.4.3, fake-indexeddb 6.2.5, uuid 14.0.1

## RESEARCH COMPLETE
