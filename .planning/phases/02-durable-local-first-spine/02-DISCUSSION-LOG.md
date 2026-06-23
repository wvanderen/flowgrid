# Phase 2: Durable Local-First Spine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-23
**Phase:** 2-Durable Local-First Spine
**Areas discussed:** State storage model, Store topology & migrations, Export / import / restore

---

## State storage model

### Q1 — How should the repository persist applied commands?

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid: records + op log | Diff previousState vs nextState to write only changed entity records, AND append the SyncOperation + SessionRecord. State reads straight from latest records (no replay). Op log stays for sync/audit. | ✓ |
| Snapshot-replace | Write the full new FlowgridSnapshot on each applied command; still append operations for sync. Simpler diffing, writes scale with total entity count. | |
| Event-sourced replay | Append only operations + sessions; rebuild state by replaying from empty. Most sync-native, but Phase 1 commands aren't pure events and replay needs deterministic env reconstruction. | |

**User's choice:** Hybrid: records + op log
**Notes:** Matches Phase 1 README hint and the layer rule.

### Q2 — Beyond changed records + operations + sessions, what else should the repository persist?

| Option | Description | Selected |
|--------|-------------|----------|
| Records + ops + sessions only | Minimal durable set matching DATA-03. Economy events transient. Rejected commands write nothing. | ✓ |
| Also persist validation issues for rejected commands | Rejected commands log a row; STATUS enum already has 'failed'. Adds audit surface. | |
| Also persist economy events as history feed | Economy events become append-only feed for future history UI. Larger writes. | |

**User's choice:** Records + ops + sessions only
**Notes:** Cleanest contract, smallest store, no audit bloat.

### Q3 — How should the repository know which entity records changed in a SimulationResult?

| Option | Description | Selected |
|--------|-------------|----------|
| Diff in persistence layer | Repository compares previousState vs nextState maps. Keeps Phase 1 contract untouched; robust to cascades. | ✓ |
| Extend SimulationResult with changedRecordRefs manifest | Phase 1 contract gains a touched-refs list. Faster writes, but ripples back into Phase 1 result.ts and tests. | |
| updatedAt timestamp sweep | Write any record whose updatedAt >= command timestamp. Risks over-writing concurrent changes. | |

**User's choice:** Diff in persistence layer
**Notes:** Keeps Phase 1 contract untouched.

### Q4 — How should duplicate operationId / sessionId writes behave?

| Option | Description | Selected |
|--------|-------------|----------|
| Idempotent upsert, conflict on payload mismatch | Same ID + same payload = no-op. Same ID + different payload = typed conflict, write rejected. | ✓ |
| Strict reject on any duplicate ID | Any duplicate fails loudly. Strongest integrity, breaks sync replay/retry. | |
| Last-write-wins upsert | Duplicate overwrites, refreshes updatedAt. Can silently hide replays/bugs. | |

**User's choice:** Idempotent upsert, conflict on payload mismatch
**Notes:** Satisfies VER-02 and Phase 1 deterministic-replay guarantee.

---

## Store topology & migrations

### Q1 — How should entities map to IndexedDB object stores?

| Option | Description | Selected |
|--------|-------------|----------|
| One store per entity type | Per-entity stores keyed by stable ID. Matches DATA-02, enables per-entity queries and partial sync. | ✓ |
| Grouped stores (mutable vs append-only) | Fewer stores, loses per-entity indexing, complicates partial sync. | |
| Single snapshot store + op/session logs | Closest to 'one giant blob' which PROJECT.md forbids. | |

**User's choice:** One store per entity type

### Q2 — Should static ModuleDefinitions be persisted in IndexedDB, or stay as code content?

| Option | Description | Selected |
|--------|-------------|----------|
| Code content only; persist ModuleInstances | ModuleDefinitions stay in src/content (versioned via ContentVersion). Only ModuleInstances persisted. | ✓ |
| Persist definitions too, seeded by migration | Definitions as records, re-seeded when ContentVersion changes. Duplicates code content. | |

**User's choice:** Code content only; persist ModuleInstances
**Notes:** Matches MOD-01 and Phase 1 separation.

### Q3 — How should Phase 2 test schema migrations when only v1 exists?

| Option | Description | Selected |
|--------|-------------|----------|
| Ship v1 + synthetic fixture-based migration tests | Declare v1. Migration-test infra uses synthetic older-shape fixtures to prove upgrade functions. Reusable by real v2. | ✓ |
| Ship v1 + a forward v2 stub schema | Declare v1 and a minimal v2 with real upgrade function. Proves mechanism concretely, throwaway schema bump. | |
| Ship v1, test creation only | Verify schema creation and repo read/write. Defer migration-fixture testing. Under-covers VER-03. | |

**User's choice:** Ship v1 + synthetic fixture-based migration tests

### Q4 — How should the three version axes relate for migration?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep distinct, document each | Dexie schema version, ContentVersion, payloadVersion each bump independently. Most flexible for sync. | ✓ |
| Unify under a single app schema version | One number drives everything. Forces coordinated bumps. | |
| Keep distinct, tie payloadVersion to Dexie schema version | Op payload shape only changes when store schema changes. Slight coupling. | |

**User's choice:** Keep distinct, document each

---

## Export / import / restore

### Q1 — What should the JSON full-state export contain?

| Option | Description | Selected |
|--------|-------------|----------|
| Full records + operations + sessions | Every entity record plus full operation log and session history. Complete portable archive. | ✓ |
| Records + sessions, omit operation log | Smaller file, restore loses sync/audit trail and op queue. | |
| Records only (current snapshot) | Smallest, loses session history and operations. Contradicts append-only guarantees. | |

**User's choice:** Full records + operations + sessions
**Notes:** Matches DATA-04 'export full local state'.

### Q2 — What columns should the CSV session export use?

| Option | Description | Selected |
|--------|-------------|----------|
| Human-readable with cell name join | startedDate, endedDate, durationMinutes, cellName (joined), xpGained, currentGenerated, energyGained, coreChargeGained, bloomFired, activationGranted. | ✓ |
| Direct SessionRecord field dump | One column per field, names as-is. cellId opaque, units raw seconds. | |
| Minimal essential columns | date, durationMinutes, cellName, xpGained, energyGained, bloomFired. Drops current/charge/activation detail. | |

**User's choice:** Human-readable with cell name join

### Q3 — What should the default import/restore behavior be?

| Option | Description | Selected |
|--------|-------------|----------|
| Replace by default; merge opt-in | Default restore wipes and writes archive. Merge is explicit opt-in. Safest for 'restore from backup'. | ✓ |
| Merge by default; replace opt-in | Default adds/updates by ID without wiping. Gentler, risks silent ID collisions. | |
| Always require explicit mode choice | Every import prompts. Most explicit, Phase 2 has no UI to prompt. | |

**User's choice:** Replace by default; merge opt-in

### Q4 — How strict should import validation be?

| Option | Description | Selected |
|--------|-------------|----------|
| All-or-nothing; typed ValidationIssue list | Pre-flight validates whole archive; any issue rejects import, returns typed issues, local data untouched. | ✓ |
| Hard-reject on schema/missing; soft-warn on refs/resources | Permissive on refs/resources. Risks importing economically unsafe state. | |
| Partial accept: import valid records, skip invalid | Violates 'before changing local data', can produce half-restored state. | |

**User's choice:** All-or-nothing; typed ValidationIssue list
**Notes:** Reuses Phase 1 ValidationIssue contract.

---

## the agent's Discretion

The following were not user-selected gray areas and fall to the agent:
- **DATA-07 error surfacing** — typed PersistenceError/storage-failure contracts (quota, denied, blocked upgrade, write failure) surfaced for Phase 3 UI to render; no rendering ships in Phase 2.
- **First-run seeding** — initial ClientRecord/SettingsRecord/starter CoreRecord creation when stores are empty.
- **ClientRecord.id generation** — `crypto.randomUUID()` unless a maintained UUID v7 package is found; operation/session IDs continue to be command-supplied.
- **Indexes/query patterns** — minimal secondary indexes, only what export/restore/reload require.
- **Reload/read path** — bulk-read all stores into FlowgridSnapshot on open; eager read for v1.
- **Transaction boundaries** — wrap each applied command's writes in a single Dexie transaction where feasible (DATA-03).

## Deferred Ideas

- Persisting economy events as a history feed (write/store bloat for v1).
- Persisting validation issues for rejected commands as audit rows (`'failed'` status remains available).
- User-facing rendering of storage errors — typed contract ships now, rendered UX belongs to Phase 3 / Phase 6.
- Operation log pagination/lazy loading on reload — eager read fine for v1 scale.

---
