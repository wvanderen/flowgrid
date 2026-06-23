# `src/persistence` — Durable Local-First Storage

The durable IndexedDB spine that sits between the simulation engine (which produces
`SimulationResult`) and the future app shell/UI (Phase 3+). It consumes applied
`SimulationResult` outputs only — it never runs simulation rules, calculates economy
values, or emits events.

## Layer boundary (enforced)

- Persistence consumes `SimulationResult` (type-only import) and produces
  `FlowgridSnapshot` on reload. It never imports simulation runtime.
- ESLint `no-restricted-imports` blocks direct `dexie` imports outside
  `database.ts` and blocks any runtime simulation import across the layer.
- `tests/persistence/boundaries.test.ts` is the second line of defense, scanning
  for UI/renderer/state layer leakage and browser globals/timers.

## Store topology (D-05)

Nine normalized Dexie object stores, one per durable entity type, each keyed by its
stable string ID. No `moduleDefinitions` store exists (D-06: definitions stay as
versioned code content in `src/content/`).

| Store | Key | Indexes | Notes |
|---|---|---|---|
| `client` | `id` | — | singleton |
| `cells` | `id` | — | per Cell |
| `core` | `id` | — | singleton |
| `moduleInstances` | `id` | `ownerCellId` | per installed ModuleInstance |
| `routes` | `id` | `sourceCellId` | per Route |
| `sessions` | `id` | `cellId`, `startedAt` | append-only |
| `operations` | `id` | `status`, `createdAt` | append-only; future sync source |
| `settings` | `id` | — | singleton |
| `forgeHistory` | `id` | `createdAt` | append-only |

## Public surface

- `FlowgridDatabase` — Dexie subclass with the v1 schema, `on('populate')` first-run
  seed (three singletons only), and `on('blocked')` typed-error construction.
- `FlowgridRepository` — `applyResult`, `loadSnapshot`, `open`, `close` (plan 02-01).
- `PersistenceError` / `PersistenceErrorKind` / `mapDomException` — typed storage-error
  contract (DATA-07 surface; Phase 3 renders).
- `generateClientId()` — the single persistence-generated ID (`crypto.randomUUID()`).
- Export/import, CSV, and validation ship in plan 02-02 / 02-03.

## Four independent version axes (D-08)

1. **Dexie schema version** — store-shape changes (this module). Currently v1.
2. **ContentVersion** (`ClientRecord.contentVersion`) — starter content shape.
3. **SyncOperation.payloadVersion** — operation payload shape (future sync transform).
4. **archiveVersion** (`JsonArchive`, plan 02-02) — archive envelope shape.

Each bumps independently for a different reason; they are never unified.

## Time

Persistence MAY call `new Date().toISOString()` only for first-run seeding
(`seeding.ts`) and export timestamps (plan 02-02). All other timestamps come from
`SimulationResult` records. The layer rule forbids ambient time in simulation, not
persistence.
