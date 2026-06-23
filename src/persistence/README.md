# `src/persistence` — Durable Storage (Phase 1 boundary)

Phase 1 defers persistence. This folder is a placeholder for the future Dexie/IndexedDB repository layer described in `.planning/REQUIREMENTS.md` (DATA-01..DATA-07) and Phase 2 of the roadmap.

Phase 1 simulation must not import from this layer. Persistence will consume `FlowgridSnapshot`, `SessionRecord`, and `SyncOperation` records produced by the simulation; it will never run simulation rules.
