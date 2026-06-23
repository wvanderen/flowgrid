# Phase 2: Durable Local-First Spine - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers Flowgrid's durable local-first persistence spine: a Dexie/IndexedDB repository layer that consumes Phase 1's durable records, persists applied commands as normalized entity records plus an append-only operation log and append-only session history, ships a versioned schema with migration-test infrastructure, exports full local state as JSON and completed sessions as CSV, and validates imports/restores all-or-nothing before touching local data. It also surfaces typed storage-error contracts that Phase 3 UI will render.

It does **not** deliver: app shell, panels, forms, settings UI, or any React UI surface (Phase 3+); rendering or visual events (Phase 3+); simulation rule changes; sync transport or conflict resolution (deferred to v2); user-facing error rendering (DATA-07 "user-facing" surface is a typed contract here — actual rendering lands in Phase 3); or new simulation commands.

</domain>

<decisions>
## Implementation Decisions

### State Storage Model
- **D-01:** Use a **hybrid records-plus-operation-log** model. Each applied command writes the changed entity records (diffed from `previousState` vs `nextState`) AND appends the `SyncOperation` + `SessionRecord`. State is read straight from the latest entity records on reload — no event replay needed. The operation log exists for sync/audit, not for state reconstruction. This matches Phase 1's `src/persistence/README.md` hint ("consume `FlowgridSnapshot`, `SessionRecord`, and `SyncOperation`") and the layer rule that persistence stores records without running simulation rules.
- **D-02:** The **durable set is minimal**: changed entity records + operations + sessions only. Economy events stay transient (recomputable). Visual events stay transient (renderer-only). Rejected and `not_implemented` commands write nothing — no audit row, no failed-operation record. (The `OperationStatus` enum retains `'failed'` for future use but Phase 2 does not populate it from rejected commands.)
- **D-03:** **Changed-record detection happens in the persistence layer**, not in simulation. The repository diffs `previousState` vs `nextState` maps and writes only changed records. This keeps the Phase 1 `SimulationResult` contract untouched and is robust to cascades (e.g., a Bloom-firing `complete_focus_session` touches Cell + Core + session + operation in one command). Phase 1 contract is NOT extended with a `changedRecordRefs` manifest.
- **D-04:** Append behavior for operation and session stores is **idempotent upsert with conflict-on-payload-mismatch**. A write whose `operationId`/`sessionId` already exists with identical payload is a silent no-op (safe for retries and future sync replay). A write whose ID exists with a different payload produces a typed conflict signal and the write is rejected. This satisfies VER-02 ("idempotent operation IDs") and Phase 1's deterministic-replay guarantee (D-08 from Phase 1 CONTEXT). Last-write-wins and strict-reject-on-any-duplicate are both rejected.

### Store Topology & Migrations
- **D-05:** Use **one IndexedDB object store per durable entity type**, each keyed by its stable ID. Nine stores: `client`, `cells`, `core`, `moduleInstances`, `routes`, `sessions`, `operations`, `settings`, `forgeHistory`. This satisfies DATA-02 ("normalized entity stores") and enables per-entity queries, partial sync, and targeted migration fixtures. Grouped stores and a single-snapshot-blob store are both rejected (the latter is explicitly forbidden by PROJECT.md).
- **D-06:** **`ModuleDefinition` records are NOT persisted** — they stay as versioned code content in `src/content/starter-modules.ts`. Only user-owned `ModuleInstance` records go in IndexedDB. This honors MOD-01 ("Static ModuleDefinitions are versioned content separate from user-owned ModuleInstances") and avoids duplicating code content into a store that would need re-seed migrations. The `moduleDefinitions` store is therefore NOT created.
- **D-07:** Ship **Dexie schema v1** with **synthetic fixture-based migration tests**. Phase 2 builds migration-test infrastructure using hand-crafted "older-shape" fixtures (e.g., a simulated pre-v1 blob or a synthetic v0 record) to prove upgrade functions transform fields correctly. No forward-looking v2 stub schema is shipped — the harness is designed so real v2 migrations reuse it. This satisfies VER-03's "migration fixtures" wording without a throwaway schema bump.
- **D-08:** The **three version axes stay distinct and documented**: (a) Dexie schema version = store-shape changes only; (b) `ContentVersion` = starter content (drives any future definition re-seed logic — moot while D-06 holds); (c) `SyncOperation.payloadVersion` = operation payload shape, used by future sync to transform old payloads. Each bumps independently. They are NOT unified under a single app schema version, and `payloadVersion` is NOT tied to the Dexie schema version.

### Export / Import / Restore
- **D-09:** JSON full-state export contains **every entity record plus the full operation log and session history** — a complete portable archive. Restore from such an archive rebuilds identical state including the audit/sync trail and operation queue. This matches DATA-04 ("export full local state"). The operation log is NOT stripped on export.
- **D-10:** CSV session export uses **human-readable columns with a cell-name join**: `startedDate`, `endedDate`, `durationMinutes`, `cellName` (joined from `CellRecord.name`), `xpGained`, `currentGenerated`, `energyGained`, `coreChargeGained`, `bloomFired`, `activationGranted`. Spreadsheet-friendly. Units are normalized (minutes, not raw seconds). A direct `SessionRecord` field dump is rejected — `cellId` alone is opaque.
- **D-11:** Default import/restore mode is **replace** (wipe local stores, write the archive — typical "restore from backup"). **Merge** mode (upsert records by ID without wiping) is an explicit opt-in. Every-import-prompts is rejected because Phase 2 has no UI to prompt with.
- **D-12:** Import validation is **all-or-nothing with a typed `ValidationIssue` list**. Pre-flight validates the entire archive; any issue (schema version mismatch, missing required record, broken reference, invalid resource total) rejects the whole import and returns the typed issues; local data is untouched. This matches DATA-06 ("before changing local data") and reuses Phase 1's `ValidationIssue` contract (`src/domain/validation.ts`). Partial-accept and soft-warn-on-refs/resources are both rejected because they risk importing economically unsafe state.

### Agent's Discretion
The following were not user-selected gray areas and fall to the agent's discretion within the constraints above and the project architecture rules. The agent should pick standard, well-tested approaches and document them in the plan:

- **DATA-07 error surfacing** — Phase 2 delivers typed `PersistenceError`/storage-failure contracts (quota exceeded, persistence denied, blocked upgrade, write failure) surfaced as typed results or an error channel that Phase 3 UI will subscribe to and render. No user-facing rendering ships in Phase 2. The contract must distinguish recoverable (e.g., quota near limit) from non-recoverable (e.g., IndexedDB blocked/unavailable) states.
- **First-run seeding** — how the initial `ClientRecord`, `SettingsRecord`, and starter `CoreRecord` are created on first open (repository-level seed script triggered when stores are empty), and the trigger conditions.
- **`ClientRecord.id` generation** — stable ID for the device/client. STACK.md flags "UUID v7 or `crypto.randomUUID()` — verify package during persistence phase." The agent should pick `crypto.randomUUID()` unless a sortable UUID v7 package is clearly maintained; operation/session IDs continue to be supplied by commands (Phase 1 contract).
- **Indexes/query patterns** — secondary indexes on stores (e.g., sessions by cellId/startedAt, operations by status/createdAt) as needed for export and future history views. Keep minimal; add only what export/restore/reload actually require.
- **Reload/read path** — bulk-read all stores into a `FlowgridSnapshot` on app open. Operations/sessions read eagerly for v1 (expected small); revisit pagination only if a later phase shows growth.
- **Transaction boundaries** — wrap each applied command's writes (changed records + operation + session) in a single Dexie/IndexedDB transaction where the boundary allows it (DATA-03). Replace-mode restore wraps the wipe + write set in a transaction where feasible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` — Defines Flowgrid's core value, daily/strategic loops, terminology, architecture constraints (esp. "Simulation owns truth; renderer shows motion; persistence stores durable records; sync moves operations; UI configures and inspects state"), economy safety rules, and out-of-scope boundaries. Directly governs the layer rule this phase must obey.
- `.planning/REQUIREMENTS.md` — Defines Phase 2 requirements `DATA-01` through `DATA-07`, `SESS-04`, and `VER-03`. `SESS-04` (append-only session history with Cell, time, duration, XP, Current, Energy/Core outcome, Bloom/Activation effects) is the session-record contract the repository must persist.
- `.planning/ROADMAP.md` — Defines Phase 2 goal, success criteria, and Phase 1 dependency.
- `.planning/STATE.md` — Records Phase 1 completion and the roadmap/plan decisions carrying into this work (esp. plain-string IDs, SessionId↔OperationId 1:1 in Phase 1, foundation-loop atomicity).
- `.planning/phases/01-deterministic-foundation-slice/01-CONTEXT.md` — Phase 1 decisions that constrain Phase 2: D-02 (rejuvenation/forge/install return `not_implemented`), D-07 (commands return typed validation issues, don't throw), D-08 (deterministic replay is exact across state/events/operations/issues).

### Phase 1 Code Contracts (the inputs Phase 2 consumes — MUST read)
- `src/domain/records.ts` — All durable record shapes: `ClientRecord`, `CellRecord`, `CoreRecord`, `ModuleDefinition` (NOT persisted per D-06), `ModuleInstance`, `RouteRecord`, `SessionRecord`, `SettingsRecord`, `ForgeHistoryRecord`, and the aggregate `FlowgridSnapshot` (maps + arrays). Repository stores mirror these.
- `src/domain/operation-records.ts` — `SyncOperation` shape (id, commandType, entityType, entityId, payloadVersion, createdAt, updatedAt, status, payload) and `OperationStatus` enum (`'pending' | 'applied' | 'failed'`). Append-only by stable ID.
- `src/domain/result.ts` — `SimulationResult` contract (previousState, nextState, economyEvents, visualEvents, operations, validationIssues) and `SimulationStatus` (`'applied' | 'rejected' | 'not_implemented'`). Repository consumes this; only `applied` results trigger writes.
- `src/domain/validation.ts` — `ValidationIssue` contract and codes. Reused for import validation (D-12).
- `src/domain/ids.ts` — Plain `string` ID aliases (not branded) and the `EntityType` union. Drives store key types and the entityType field on operations.
- `src/domain/primitives.ts` — `ContentVersion`, `IntNonNegative`, `IntPercent`, `IntSeconds` branded primitives backing all economy fields (integer units — never floats).
- `src/domain/time.ts` — `IsoDateTimeString`, `LocalDateString` shapes used across records.
- `src/persistence/README.md` — Phase 1 placeholder explicitly naming DATA-01..DATA-07, Phase 2, and the three consumable types (`FlowgridSnapshot`, `SessionRecord`, `SyncOperation`). Confirms the layer boundary.

### Design Drafts
- `docs/technical-vision-draft.md` — Layer boundary rule (simulation owns truth; persistence stores durable records; sync moves operations).
- `docs/gameplay-spine-draft.md` — Cell/Core/Current/Charge/Energy/Bloom/Activation concepts the persisted records represent.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/domain/records.ts` — Complete durable record surface already exists. Phase 2 maps these directly to Dexie stores; no new domain types needed.
- `src/domain/operation-records.ts` — `SyncOperation` is already sync-ready (stable ID, payloadVersion, status, timestamps). The operation store is a near-direct persistence of this type.
- `src/domain/validation.ts` + `src/domain/invariants.ts` — Validation infrastructure already exists. Import validation (D-12) should reuse `ValidationIssue` and the invariant checks rather than invent a parallel error type.
- `src/content/starter-state.ts` + `src/content/starter-modules.ts` — Source of starter state for first-run seeding (Agent's Discretion).
- `tests/helpers/fixtures.ts` + `tests/helpers/replay.ts` — Phase 1 test fixtures and deterministic-replay helpers. Migration-fixture tests (D-07) should build on these patterns.

### Established Patterns
- **Strict layer boundaries** enforced by ESLint (Phase 1): simulation must not import persistence; persistence must not run simulation rules. Phase 2 repository consumes `SimulationResult` outputs only.
- **Integer economy units** everywhere (`IntNonNegative`, `IntPercent`, `IntSeconds`). Resource-invariant checks on import (D-12) validate non-negativity and allocation totals, never floats.
- **Plain string IDs** (not branded) — simplifies IndexedDB key serialization and migration. No `as CellId` casts needed at repository boundaries.
- **Typed results, no throwing for domain invalidity** (Phase 1 D-07) — repository write conflicts (D-04) and import failures (D-12) return typed results, not thrown errors.
- **Deterministic replay** (Phase 1 D-08) — the same inputs produce identical `SyncOperation` records, which is what makes idempotent upsert (D-04) safe.

### Integration Points
- Repository sits between the simulation engine (`src/simulation/engine.ts`, which produces `SimulationResult`) and the future app shell/UI (Phase 3+). It exposes a write path (consume `SimulationResult`) and a read path (load `FlowgridSnapshot`).
- Export/import are standalone repository operations (no simulation involvement).
- The operation store is the future sync layer's source of truth — Phase 2 shapes it for v2 sync even though no transport ships.

</code_context>

<specifics>
## Specific Ideas

- The hybrid model is the natural fit specifically because Phase 1 already produces both `nextState` and append-only `operations`/`sessions` — no contract change is needed to get the best of snapshot and event-sourced approaches.
- Migration testing must be forward-compatible: the synthetic-fixture harness built now should be directly reusable by the real v1→v2 migration when it arrives, not thrown away.
- CSV is for humans opening a spreadsheet, not for machine re-import — readability (cellName, minutes, dates) outweighs field-for-field fidelity.
- Replace-as-default-restore reflects the "I made a backup and want it back" mental model; merge exists for the rarer "combine two archives" case.

</specifics>

<deferred>
## Deferred Ideas

- **Persisting economy events as a history feed** — considered as a way to give Phase 3+ history/analytics views free data, but rejected for v1 as write/store bloat. History views in Phase 3+ can derive from session records or revisit this if needed.
- **Persisting validation issues for rejected commands as an audit row** — rejected for v1; the `OperationStatus` `'failed'` enum value remains available if audit becomes a requirement.
- **User-facing rendering of storage errors (DATA-07 UI)** — the typed contract ships in Phase 2; the actual rendered recovery UX belongs to Phase 3 (Playable Generator Flowgrid) or Phase 6 (Hardening/Accessibility/Trust) where UI surfaces exist.
- **Operation log pagination / lazy loading on reload** — eager read is fine for v1 scale; revisit only if a later phase shows growth.

</deferred>

---

*Phase: 2-Durable Local-First Spine*
*Context gathered: 2026-06-23*
