---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Audit Gaps
current_phase: 06.2
current_phase_name: close-v1-0-audit-gaps-b-01-applayout-hidden-outlet-w-01-bloc
status: "Phase 06.2 plan 06.2-01 ABORTED at Task 1 (Rule 4 architectural checkpoint). Plan was built on incorrect git evidence — commit 29e32a7 is a 39-file intentional redesign (not a single-hunk regression); its canvas-as-full-viewport-background layout is fundamentally incompatible with visible+clickable child-route `<Outlet/>` content (bare Outlet = 3/14 E2E; canvas intercepts pointer events). User decision: KEEP the redesign, do NOT revert 29e32a7. Findings + corrected evidence captured in phase `.continue-here.md`. Re-plan via /gsd-plan-phase 06.2 — new plan must choose Option C (hybrid layout under redesign) or Option B (rewrite E2E specs for ZLiftDock, now legitimate)."
stopped_at: "Phase 06.2-01 aborted at Task 1 (Rule 4 architectural checkpoint); routing back to /gsd-plan-phase 06.2 with corrected git evidence (see phase `.continue-here.md`). Redesign commit 29e32a7 is fixed input."
last_updated: "2026-06-29T20:23:23.002Z"
last_activity: 2026-06-29
last_activity_desc: Phase 06.2-01 aborted (Rule 4 architectural checkpoint); routing back to planning
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 26
  completed_plans: 25
  percent: 88
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-24)

**Core value:** Tap a Cell, do a real thing, and feel that effort become visible, useful signal in a modular system that makes returning feel powerful and forgiving.
**Current focus:** Phase 06.2 — close-v1-0-audit-gaps-b-01-applayout-hidden-outlet-w-01-bloc

## Current Position

Phase: 06.2 (close-v1-0-audit-gaps-b-01-applayout-hidden-outlet-w-01-bloc) — RE-PLANNING (06.2-01 aborted)
Plan: 1 of 1 (aborted at Task 1)
Status: Phase 06.2-01 aborted at Task 1 — plan was built on incorrect git evidence. Commit 29e32a7 is a 39-file intentional redesign, not a single-hunk regression. Bare `<Outlet/>` fix yields 3/14 E2E (canvas intercepts pointer events on child-route links). User decision: keep the redesign; re-plan with corrected evidence. Findings captured in phase `.continue-here.md`.
Last activity: 2026-06-29 — Phase 06.2-01 aborted (Rule 4 architectural checkpoint); routing back to planning

Progress: [██████████░░░░░░░░░░] 25/25 plans (7/8 phases complete; 06.2 = 0 plans, not started)

## Performance Metrics

**Velocity:**

- Total plans completed: 9
- Average duration: n/a
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Deterministic Foundation Slice | 3/3 | TBD | n/a |
| 2. Durable Local-First Spine | 0 | TBD | n/a |
| 3. Playable Generator Flowgrid | 5/5 | TBD | n/a |
| 4. Core Alternation and Rejuvenation Economy | 0 | TBD | n/a |
| 5. Module Forge and Starter Customization | 0 | TBD | n/a |
| 6. Hardening, Accessibility, and Trust | 0 | TBD | n/a |
| 04 | 3 | - | - |
| 06.1 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: none
- Trend: n/a

*Updated after each plan completion*
| Phase 02 P01 | 52min | 6 tasks | 19 files |
| Phase 02 P02 | 6min | 3 tasks | 5 files |
| Phase 02 P03 | 19min | 5 tasks | 9 files |
| Phase 03 P04 | 12min | 3 tasks | 15 files |
| Phase 04 P01 | 16min | 3 tasks | 19 files |
| Phase 04 P02 | 10min | 2 tasks | 14 files |
| Phase 04 P03 | 254min | 4 tasks | 10 files |
| Phase 05 P01 | 71min | 3 tasks | 19 files |
| Phase 05 P02 | 3min | 2 tasks | 2 files |
| Phase 05 P03 | 20min | 4 tasks | 9 files |
| Phase 06 P01 | 87min | 3 tasks | 19 files |
| Phase 06 P02 | 13min | 3 tasks | 10 files |
| Phase 06 P03 | 6min | 2 tasks | 2 files |
| Phase 06 P04 | 63min | 3 tasks | 9 files |
| Phase 06.1 P01 | 12min | 3 tasks | 10 files |
| Phase 06.1 P02 | 17min | 3 tasks | 10 files |
| Phase 06.1 P03 | 18min | 2 of 3 tasks (Task 3 = human smoke) | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: v1 uses six coarse vertical MVP phases rather than horizontal model/API/UI layers.
- [Roadmap]: Advanced systems and sync spikes are deferred until the first Generator -> Core -> Rejuvenation -> Forge loop is validated.
- [Roadmap]: Requirement coverage count was corrected to 61 v1 IDs based on REQUIREMENTS.md.
- [Plan 01-01]: Latest npm versions approved for all dev deps; prettier skipped. Added globals as a required ESLint 10 flat-config companion.
- [Plan 01-02]: IDs are plain string aliases (not branded) to reduce cross-plan friction; result.ts introduced in Task 1 to keep typecheck green at every task boundary; slot IDs derived from cellId by convention.
- [Plan 01-03]: Session IDs are 1:1 with operation IDs in Phase 1; foundation loop is atomic (no intermediate Cell.current accumulation); command input validation uses `invalid_reference` since no dedicated input-error code exists in Phase 1's enum.
- [Phase ?]: 02-01: database.ts is the sole Dexie gateway; core store accessed via db.table() (Dexie core:DBCore collision); first-run seed writes only the 3 singletons; reload flow uses seeded snapshot as previousState
- [Phase ?]: ARCHIVE_VERSION=1 is a fourth independent version axis (archive envelope shape), distinct from Dexie schema/ContentVersion/payloadVersion (D-08); exportJson never strips the operation log (D-09).
- [Phase 02]: 02-03: Zod schema .nonnegative() catches negative economy values at shape boundary (invalid_operation_shape) before Phase 1 invariants; negative_resource is defense-in-depth at import boundary. — Two-layer validation pipeline: schema-first gate makes Phase 1 negative_resource check redundant for fields the schema mirrors
- [Phase 02]: 02-03: Merge mode conflicts on shared-id singletons (core id 'flowgrid:core') when merging divergent full archives; intended merge use is adding new records to existing state. — D-04 payload-mismatch applies to merge; singletons with same id but different post-session payloads surface write_failure
- [Phase ?]: Plan 03-04: Single dark-theme body layer in @layer base (not per-route bg-flowgrid-bg) so every route section inherits the dark background; #root gets min-height: 100vh.
- [Phase ?]: Plan 03-04: Did NOT flip 03-UAT.md test 2 from issue to pass — the plan defers that flip until the human visual smoke (npm run dev) confirms the styling renders; the autonomous agent verifies build green + root-cause closure (CSS bundle grows to 19.04kB).
- [Phase 03]: Plan 03-05 (gap-closure): complete_focus_session never cleared activeSessionStartedAt — the original session-lifecycle suite covered start/cancel but not complete, so the "session continues after Finish" bug slipped through. One-line simulation fix + regression test (test #10 in session-lifecycle.test.ts). Also: rejected start_focus_session is now surfaced via lastRejection store field + disabled Start button with "Another focus session is active"; Cell Board happy path got a Home Link; Flowgrid scene container centered via container.x/y = app.screen.{width,height}/2. UAT tests 2/5/15 closure-ready pending human re-smoke.
- [Phase ?]: Plan 04-01: iterative-floor threshold formula (50,75,112,168,252) over closed-form floor(50*1.5^n) which gave 253 at the 5th threshold, contradicting the SPEC
- [Phase ?]: Plan 04-01: folded rejuvenation payout derivation inline into log-rejuvenation.ts (per plan Design note) rather than a separate src/simulation/systems/rejuvenation.ts module
- [Phase ?]: Plan 04-01: SPEC R4 '>=125 grants 2 tokens' is mathematically inconsistent with its documented threshold sequence (112 < 125 -> 125 crosses 3 thresholds). Honored the threshold-sequence contract (stated 3x) and tested multi-threshold grant at Integration 75 (the actual 2nd threshold)
- [Phase ?]: Plan 04-02: Kept coreSchema .default() on Phase 4 activation fields (added by 04-01 deviation #2) rather than the plan's bare validators — the defaults are required for v1 archive backward-compat (Pitfall 6); removing them would reject v1 archives whose core predates Phase 4
- [Phase ?]: Plan 04-02: Normalized v1 archive rejuvenations at import.ts boundary via double cast (validated as unknown as {rejuvenations?: ...}).rejuvenations ?? [] — JsonArchive.rejuvenations stays required (matches exportJson) while import honestly bridges the v1 optional-field runtime reality; reused write_failure conflict kind for rejuvenations (mirrors forgeHistory, no dedicated kind in the 8-member union)
- [Phase 04-03]: Apply Allocation kept always enabled (not disabled on sum!=100) so the SPEC smoke 'try 30/50 sum 80 and confirm rejection' is demonstrable in the browser - client inline sum hint AND dispatch surfaces invalid_core_allocation_total via lastRejection
- [Phase 04-03]: RejuvenationResumePrompt is Core-scoped (no cellId), mirrors ResumeSessionPrompt (Resume -> navigate('/core'), Discard -> cancel_rejuvenation which writes nothing durable); D-02 mutual exclusion means the focus and rejuvenation resume prompts never mount simultaneously
- [Phase 04-03]: Near-Bloom threshold = DEFAULT_SESSION_LENGTH_SECONDS (1500s = DEFAULT_DAILY_MILESTONE_TARGET_SECONDS) so '1 session from Bloom' reads accurately; RejuvenationTimer reuses SessionTimer's formatElapsed (import) to keep the cosmetic clock DRY and decoupled from durable truth (D-04)
- [Phase 05-01]: D-04 A1/A2/A3 resolved as least-invasive — Charge Core boosts store-side rate, Output boosts routed amount, Bloom grants +1+level activation/momentum. None add new model fields or break the 100-sum allocation cap. All documented in code comments at application sites warning against the conflation/overflow anti-patterns.
- [Phase 05-01]: createRng moved from src/app/rng.ts to src/simulation/rng.ts (canonical home) with app/rng.ts re-exporting — the prior simulation→app import violated the one-way architecture boundary enforced by tests/simulation/boundaries.test.ts.
- [Phase 05-01]: slot_at_capacity handler check is defense-in-depth (the reveal filter makes it unreachable via normal dispatch); validateModuleLevelCap invariant backstop is the independent guard. Insufficient-payment reuses negative_resource; chosen-not-in-revealed reuses invalid_reference (RESEARCH A6 — minimum new ValidationIssueCode surface).
- [Phase 05-02]: Task 2 (Zod widening + drift guard + export/import) was fully pre-staged by Plan 05-01 Deviation #1 (commit 98fc4d2); all 6 acceptance criteria verified green, no empty commit made. moduleKind uses z.enum (stricter than plan's z.string) to mirror ModuleDefinitionKind and close T-05-07 at the enum boundary.
- [Phase 05-02]: Dexie v3→v4 bump ships full 10-store-set repetition + .upgrade() on the empty pre-Phase-5 forgeHistory store (RESEARCH Pitfall 5). upgradeForgeHistoryV3ToV4 + FORGE_HISTORY_V4_DEFAULTS are exported pure transforms exercised by the migration harness. D-09 fully shipped across 05-01 + 05-02.
- [Phase 05-03]: /forge route (ForgePanel + ForgeSummary + ForgeChoiceList) is a near-clone of the /core route peer pattern; ForgeSummary is an INLINE <section role=status aria-live=polite> (NOT a modal — D-11/Pitfall 7). Two-step roll UX: user picks payment via local-state pendingPaymentType then taps Pick — keeps dispatch atomic. KIND_LABELS centralized in ForgeChoiceList for DRY reuse. ReturnCues Forge chip lives in the rail above the canvas (never intercepts the Cell tap). ModuleTile reads MODULE_LEVEL_BONUS (UI ↔ sim agreement, D-13).
- [Phase 05-03]: Task 4 human visual smoke is deferred — autonomous agent verified build/test/lint/tsc green + all acceptance grep counts, but cannot run a real-browser click flow. Surfaced as checkpoint:human-verify in SUMMARY; Phase 6 VER-04/05/06 will re-exercise the flow.
- [Phase 06]: ARCHIVE_VERSION stays at 2 for reduceMotion — settingsSchema .default(false) makes the field-additive change backward-compatible (Phase 4 coreSchema precedent, Pitfall 4 / Q2); documented in export-json.ts
- [Phase 06]: D-09 OS-preference honoring runs as a one-time ref-guarded mount effect in SettingsPanel (not persistence) so seeding stays DOM-free and testable; reduceMotion is computed in the UI/store layer and passed into the renderer (Pitfall 6)
- [Phase 06]: D-04 visual events are transient (UI-04) — payloads mirror their economy-event peers but live in a separate visualEvents[] array, so dropping them is byte-safe. forgeRoll + moduleUpgrade emitted in run-forge.ts alongside economy events; tokenGranted inside the if (tokensGranted > 0) guard in log-rejuvenation.ts (Q4)
- [Phase 06]: D-05 build-once lands with D-01 (RESEARCH Pitfall 3) — rebuild-on-dispatch kills particle systems. buildFlowgridScene returns SceneRefs for id-based in-place lookup; updateFlowgridScene mutates hex/halo/color in place and NEVER destroys+rebuilds
- [Phase 06]: summarizeScene returns aggregate counts ONLY (Open Q1 option (a)) — no internal Pixi refs leak; window.__flowgridInspect exposed unconditionally (NOT MODE-gated; Playwright runs the production build per D-17 / Pitfall 5)
- [Phase 06]: D-07 graceful WebGL-fail uses role="status" aria-live="polite" (graceful degradation), NOT role="alert" (ErrorBanner error state) — the economy stays fully usable via the Cell list + panels
- [Phase ?]: D-06 always-visible semantic Cell list (06-03) mounts <nav aria-label=Cells> alongside FlowgridCanvas, closing UI-02 — every existing Cell is now openable from Home via keyboard (Tab+Enter); doubles as the no-WebGL fallback for D-07
- [Phase ?]: [Phase 06]: Plan 06-04 release-readiness E2E gate complete — VER-04 full flow + IndexedDB reload, VER-05 keyboard + axe WCAG scans per route (caught+fixed a ModuleTile contrast regression), VER-06 scene-graph probe + reduced-motion economy-equivalence. Production app boots empty by design; E2E creates its own Cell.
- [Phase 06]: Plan 06-05 (gap-closure, PARTIAL): Task 1 fixed particle coordinate space (anchors are container-local — ParticleContainer is a child of the centered scene container, so adding the stage offset double-applied centering) by extracting a pure `buildParticleAnchors` module (TYPE-ONLY pixi imports). Task 2 revised D-09 to session-only OS-preference pre-fill (no durable `update_settings` on mount). Both correct, committed (174e6eb, d59062d), 246 tests green. BUT Task 3 human smoke FAILED — the real blocker is IA: canvas mounts only at `/` while every particle-emitting event runs on a different route that unmounts it. UI-03/VER-06 still open; a layout pivot is required (seed: .planning/exploration/canvas-always-visible-layout-pivot.md).
- [Phase 06.1]: [Plan 06.1-01]: Persistent canvas spine via pathless React Router v7 layout route — AppLayout mounts FlowgridCanvas ONCE and survives navigation across /, /cells/:id, /core (D-05 build-once preserved); selectedCellId + takeoverActive are view-state mirrors of the URL pushed via flowgridStore.setState (never dispatched); /settings + /forge are fixed inset-0 z-50 overlays with ticker paused via explicit takeoverActive flag (visibilityState alone cannot fire for in-DOM overlays — RESEARCH Pitfall 3).
- [Phase ?]: Plan 06.1-02: Z-Lift in-place scene op (tweenScalar lift + dim + lazy spotlight/focusCone Graphics, never destroy — Pitfall 4 closed; container stays centered per D-07 fixed framing); pure computeZLiftTargets helper with TYPE-ONLY imports (mirrors particle-anchors.ts); adapter tracks lastSelectedCellId so URL-only selection drives Z-Lift.
- [Phase ?]: Plan 06.1-02: ZLiftDock renders semantic Start/Finish/Cancel + Core allocation controls beside the canvas with two-paths-one-truth dispatch parity (EXACT command shapes GeneratorTile uses); responsive side-dock/bottom-strip per D-04; v1 heuristic side dock (RESEARCH A3).
- [Phase ?]: Plan 06.1-02: Cell-list nav collapses into a Radix Menu Cell-switcher below md: (D-04 chrome collapse); @radix-ui/react-menu standalone primitive used via controlled open state + Menu.Anchor (no Trigger primitive; DropdownMenu not installed).
- [Phase ?]: Plan 06.1-02: EditCellDialog extracted as a dedicated Radix Dialog for Cell edit (D-06 configuration exception); Dialog.Portal escapes layout stacking context (Pitfall 5); reuses EditCellForm (edit_cell command — Rule 3 fix on plan's update_cell typo); Task 3 is a pure refactor (characterization tests per tdd.md).
- [Phase 06.1]: [Plan 06.1-03]: Acceptance gate — extended canvas-smoke E2E (4 new tests: persists-across-core-routes, param-change identity via SPA nav, takeover-coverage with canvas-attach wait, probe-non-zero-throughout-session-lifecycle) + UI tests (strict DOM-identity on canvas persistence, D-09 WebGL-fail continuity, D-03 chrome persistence across core routes, CellBoard alongside canvas mock with Return-to-Flowgrid identity preservation). Tasks 1+2 complete + green (build, canvas-smoke 6/1-skip, UI 61). Rule 3 fixes: CellBoard vs ZLiftDock accessible-name collisions (scope to CellBoard region + level:1); takeover test page.goto reload race (waitFor attached); RTL API mismatch (getByRole region not getByLabel). Task 3 (re-opened 06-05 Task 3 human smoke) PENDING-HUMAN-CHECKPOINT — UI-03/VER-06 deliberately NOT re-closed until human approval.

### Pending Todos

- [ ] **RE-PLAN + execute Phase 06.2** — plan `06.2-01` was aborted (Rule 4 architectural checkpoint): its B-01 fix was built on incorrect git evidence. Commit `29e32a7` is a 39-file intentional redesign, not a single-hunk regression; the redesign's full-viewport canvas intercepts pointer events on child-route `<Outlet/>` content (3/14 E2E with bare Outlet). User decision: **keep the redesign, do NOT revert `29e32a7`**. Re-plan via `/gsd-plan-phase 06.2` choosing Option C (hybrid layout under redesign) or Option B (rewrite E2E specs for ZLiftDock). Corrected evidence + carried-over scope (W-01/DATA-07, VERIFICATION.md for 01/04, REQUIREMENTS/ROADMAP drift) captured in phase `.continue-here.md`.
- [ ] **Re-audit milestone v1.0 after 06.2** — confirm status PASS (no BLOCKER, no unverified phase) before running `/gsd-complete-milestone`.

### Blockers/Concerns

- **B-01 (BLOCKER, re-scoped 2026-06-29):** The hidden-`<Outlet/>` wrapper in `src/ui/shell/AppLayout.tsx` is one mechanism inside a 39-file intentional redesign (`29e32a7`), NOT an isolated regression. Bare-Outlet fix yields 3/14 E2E — the redesign's canvas-as-full-viewport-background layout intercepts pointer events on child-route links. Resolution requires a structural decision (hybrid layout OR E2E rewrite), not a single-hunk reversal. Redesign is fixed input per user decision. Re-opens VER-04, VER-05 (partial), VER-06, UI-03, UI-08. Full detail: `.planning/phases/06.2-.../.continue-here.md`.
- Phase 06.1 UAT otherwise passed 11/11. Other prior blockers (particle imperceptibility, grainy hexagons, redundant resume prompt, excessive scroll) were accepted as resolved by the user during UAT.

### Roadmap Evolution

- Phase 06.2 inserted after Phase 6.1: Close v1.0 audit gaps: B-01 AppLayout hidden Outlet + W-01 blocked_upgrade surfacing + VERIFICATION.md for 01/04/06.1 + REQUIREMENTS/ROADMAP reconciliation (URGENT)

## Deferred Items

Items acknowledged and carried forward from roadmap creation:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Advanced modules | Full patch editor, advanced module graphs, duplicate/fusion systems, larger rarity pools | Deferred to v2+ | Roadmap creation |
| Long-tail progression | Prestige and Memory | Deferred to v2+ | Roadmap creation |
| Sync and platform | Cloud sync, multi-device active sessions, native notifications/widgets | Deferred to v2+ | Roadmap creation |

## Session Continuity

Last session: 2026-06-29
Stopped at: Phase 06.2 inserted (URGENT) to close v1.0 milestone-audit gaps. Phase 06.1 is the last completed phase (UAT 11/11). The v1.0 milestone is NOT ready to complete until 06.2 closes B-01 + W-01 + missing VERIFICATION.md + REQUIREMENTS/ROADMAP drift.
Resume file: None — run `/gsd-plan-phase 06.2` to plan the audit-gap closure, then execute. See `.planning/v1.0-MILESTONE-AUDIT.md` for full gap detail.
