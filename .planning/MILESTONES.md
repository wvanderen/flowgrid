# Milestones

## v1.0 MVP (Shipped: 2026-06-30)

**Delivered:** Flowgrid v1 — a local-first modular focus game where real effort powers a programmable hex lattice, completing the full vertical slice from deterministic simulation through durable persistence, playable Generator loop, Core alternation, Module Forge, accessible hardening, and a persistent always-visible canvas.

**Phases completed:** 8 phases, 26 plans, 78 tasks
**Timeline:** 2026-06-22 → 2026-06-29 (8 days)
**Git range:** `a32c361` (docs: initialize project) → `2dc4942` (205 commits, 51 feat)
**Codebase:** ~11,845 LOC TypeScript across 108 source files

**Key accomplishments:**

- **Deterministic pure-TypeScript simulation foundation** — strict architecture boundaries (domain/simulation/render/persistence/ui), command/result contracts, sync-ready operations, invariant validators, and property-based tests with injected time and RNG (Phase 1).
- **Durable local-first spine** — Dexie/IndexedDB normalized entity stores with a v1→v5 migration chain, append-only session history, JSON full-state + CSV export, all-or-nothing validated import, and a typed PersistenceError contract (Phase 2).
- **Playable Generator Flowgrid** — the protected first loop on a Core-centered hex lattice: create/inspect/edit/archive Cells, start/finish focus sessions, Current/XP/Momentum, daily milestones, once-per-day Bloom, Activation, and a PixiJS 8 renderer with the React 19 / Vite 8 / Tailwind 4 / Zustand 5 stack (Phase 3).
- **Core alternation & rejuvenation economy** — Current routing to the Core, enforced 100% convert/store allocation, Energy conversion + Core Charge storage, Energy-spend Activation boost, and duration-gated rejuvenation that processes Charge → Integration → Module Tokens (Phase 4).
- **Module Forge & starter customization** — atomic run_forge handler with curated three-choice rolls, MODULE_LEVEL_BONUS content, monotonic forge history, and a `/forge` route applying rewards into starter slots without a full patch editor (Phase 5).
- **Hardening, accessibility & persistent canvas** — full-motion Pixi v8 render layer, semantic non-canvas controls for every critical action, `/settings` route, Playwright + axe-core E2E (VER-04/05/06), and a pathless-layout-route pivot keeping the canvas mounted and visible during all core signal-producing interactions (Phases 6, 6.1, 06.2).

**Known deferred items at close:** 5 (see STATE.md Deferred Items) — 3 ad-hoc quick tasks of unknown status, plus Phase 05/06 verifications at `human_needed` (accepted by the PASS milestone audit; deferred human-smoke paths closed via the green E2E suite). Optional tech-debt cleanup (W-02..W-05) deferred to a future hygiene phase.

**Archive:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`, `.planning/milestones/v1.0-MILESTONE-AUDIT.md`

---
