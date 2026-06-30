# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-06-30
**Phases:** 8 | **Plans:** 26 | **Tasks:** 78

### What Was Built
- Deterministic pure-TypeScript simulation with strict architecture boundaries and property-based invariant tests.
- Durable local-first spine: Dexie/IndexedDB normalized stores, v1→v5 migration chain, append-only history, JSON/CSV export, validated import.
- Playable Generator Flowgrid: the protected first loop on a Core-centered hex lattice with PixiJS 8 rendering.
- Core alternation & rejuvenation economy: Current routing, convert/store allocation, Energy/Charge, Integration→Module Tokens.
- Module Forge: curated three-choice rolls, monotonic forge history, reward application into starter slots.
- Hardening, accessibility & persistent canvas: full-motion renderer, semantic a11y controls, settings, Playwright + axe-core WCAG E2E, and a pathless-layout-route keeping the canvas visible during all core play.

### What Worked
- **Vertical-slice phasing** — each phase shipped a playable slice end-to-end (sim → persistence → UI), so the loop was testable in-browser continuously rather than deferring integration to the end.
- **Architecture boundaries from day 1** — ESLint import-boundary rules + boundary tests (domain/simulation/render/persistence/ui) prevented drift across 8 phases and 11.8k LOC; the W-01 repository seam landed cleanly because the boundary was already enforced.
- **Property-based tests for economy invariants** — fast-check caught real allocation/resource/token bugs that unit tests missed; VER-02 invariants held across every command addition.
- **Deterministic injected time + RNG** — forge rolls and day-rollover were replayable and testable from Phase 1 onward.
- **Append-only sessions + sync-ready operation log** — designed early, paid off in export/import validation and migration testing.
- **Milestone audit + gap-closure phase** — the v1.0 audit caught the B-01 regression (introduced by a post-6.1 redesign) before ship; a single inserted phase (06.2) closed every gap.

### What Was Inefficient
- **Canvas information architecture discovered late** — Phase 6 06-05 Task 3 failed because the canvas only mounted at `/` while every particle-emitting event ran on a different route. This required a layout pivot (Phase 6.1) + gap-closure (06.2) — a 3-phase chain that could have been avoided by validating "where does the canvas mount?" during Phase 3 app-shell planning.
- **Phase 04-03 took 254min** (10× the median plan) — the UI slice for the Core/rejuvenation economy; a Spike/RESEARCH pass on the live-timer + resume-prompt patterns before planning would have reduced rework.
- **Human-smoke checkpoints blocked autonomous closure** — Phases 5/6/6.1 each ended with a "PENDING-HUMAN-CHECKPOINT" for perceptual/canvas verification that the agent cannot self-close. Earlier Playwright structural probes (added in 6.1-03) would have unblocked these without human gating.
- **Redesign mid-milestone** — a post-6.1 "main view redesign" commit (29e32a7) introduced the B-01 hidden-Outlet regression, triggering the audit's BLOCKER. In-flight redesigns between phases carry integration risk.

### Patterns Established
- **Two-layer validation** — Zod schema shape gate (boundary) + Phase 1 invariants (defense-in-depth); `.nonnegative()` catches negative economy values before invariant code.
- **Build-once / in-place-tween rendering** — `buildFlowgridScene` returns SceneRefs for id-based in-place mutation; never destroy+rebuild on dispatch (kills particle systems).
- **Visual events are transient** — payloads mirror economy events but live in a separate `visualEvents[]`; dropping/replaying them is byte-safe (UI-04).
- **Two-paths-one-truth dispatch** — URL-driven view state (selectedCellId, takeoverActive) mirrors into the store via `setState`, never via dispatch; semantic dock controls use EXACT command shapes.
- **Process-closure VERIFICATION.md** — when code is already verified sound via cross-references, a process-closure artifact citing existing evidence is acceptable (used in Phase 06.2 for phases 01/04/06.1).

### Key Lessons
1. **Validate information architecture (mount points, route structure) before visual polish.** The canvas-always-visible pivot was the most expensive discovery in v1.0; "where does the long-lived visual surface mount?" is a Phase-1/3 question, not a Phase-6 question.
2. **Insert structural E2E probes early.** The canvas-smoke E2E (6.1-03) unblocked human-smoke closures structurally; adding scene-graph probes in Phase 3 would have caught the unmount-on-route-change issue immediately.
3. **Treat in-flight redesigns as integration-risk events.** A redesign between phases broke 3 E2E specs; re-running the full E2E gate after any app-shell change (not just phase boundaries) would have caught B-01 before the audit.
4. **Milestone audits are worth the cost.** The v1.0 audit found a BLOCKER + WARNING + 3 unverified phases that phase-level verification missed; the gap-closure phase (06.2) was cheaper than shipping broken.

### Cost Observations
- Model mix:inherit (agent-managed; opus/sonnet/haiku mix per model_profile)
- Sessions: 8 phases across 8 calendar days (2026-06-22 → 2026-06-29)
- Notable: simulation-heavy phases (01, 04-01, 05-01) executed fastest; UI/slice phases (03-03, 04-03, 06-04) took longest. Median plan ~18min; outliers 04-03 (254min) and 06-01 (87min).

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 8 | 26 | Vertical-slice phasing; boundary enforcement from day 1; milestone audit + gap-closure phase |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 246+ (unit/property/persistence/UI/E2E) | simulation-critical paths covered | stack locked in Phase 3 (React 19, Vite 8, Tailwind 4, Pixi 8, Zustand 5, Dexie 4) |

### Top Lessons (Verified Across Milestones)

1. Architecture boundaries enforced from day 1 (ESLint + tests) prevent drift cheaply.
2. Property-based invariant tests are the highest-leverage investment for economy code.
