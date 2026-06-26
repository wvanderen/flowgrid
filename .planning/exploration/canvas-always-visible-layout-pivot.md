# Exploration: Canvas-Always-Visible Layout Pivot

**Origin:** Phase 06 Plan 05 gap-closure checkpoint (FAILED) — 2026-06-26
**Explored:** 2026-06-26 via `/gsd-explore`
**Status:** Explored — target IA chosen; ready for `/gsd-discuss-phase` -> `/gsd-plan-phase`. Phase 6.1 added to ROADMAP.md (UI-08 added to REQUIREMENTS.md).
**Severity:** Blocks UI-03, VER-06 (Phase 06 cannot fully complete without resolving this)
**Related:** `.planning/phases/06-hardening-accessibility-and-trust/06-05-SUMMARY.md`, `.planning/debug/no-canvas-animation.md`, `.planning/ROADMAP.md` (Phase 6.1)

---

## The Problem

Flowgrid's particle system — the visual centerpiece that turns effort into "visible, useful signal" (PROJECT.md core value) — is structurally disconnected from the events that feed it. The `FlowgridCanvas` (PixiJS hex lattice + particles) is mounted **only** on the `/` route (`FlowgridHome`). Every gameplay event that emits particles happens on a different route, and navigating there **unmounts the canvas**:

| Visual event | Fires on route | Canvas during event |
|---|---|---|
| Current trails (active session) | `/cells/:cellId` | unmounted |
| Bloom burst + Activation + Core ripple (session finish) | finish routes away from `/` | unmounted |
| Core convert/store ripple | `/core` | unmounted |
| token-granted flash (rejuvenation) | `/core` | unmounted |
| forge-roll / module-upgrade flash | `/forge` | unmounted |

Net effect: **particles can never be seen by the user during the events that produce them.** This is why Phase 06 UAT Test 1 saw "just static hexagons" — and why Plan 06-05's coordinate-space fix alone could not close the gap. This is an information-architecture / navigation problem, not a rendering bug.

## The Constraints It Must Honor

PROJECT.md **Core interaction**: `open app -> tap Cell -> start session` must stay protected — the Generator is sacred and must always be easy to use. Any pivot must preserve (or strengthen) the one-tap-into-a-session flow.

PROJECT.md **Rendering**: canvas/WebGL/PixiJS powers the Flowgrid + module-board visuals; the app shell, panels, forms, inspectors use a normal component framework. The pivot must keep this split.

PROJECT.md **Core Value**: "Tap a Cell, do a real thing, and feel that effort become visible, useful signal." Right now the effort is invisible because the canvas isn't present when the signal flows.

## Decisions — `/gsd-explore` session (2026-06-26)

The target information architecture is now chosen. The session resolved the core fork: **canvas-as-spine, never covered** — not route-swapping panels, and not (primarily) a context-driven camera.

**Target IA:**

1. **Canvas is the spine, never covered.** The `FlowgridCanvas` stays mounted and visible during all signal-producing interactions. Module interactions happen **inline on the grid itself** — tapping a hex module interacts with it in place. No panel, sheet, or overlay ever covers the canvas during core play.
2. **The session view moves onto the canvas.** The focus timer / session view no longer lives at `/cells/:id`; it is anchored inline on the selected Cell while the grid remains visible. This preserves the sacred `open app -> tap Cell -> start session` as a literal one-tap flow with no navigation.
3. **Rare takeovers are the only full-screen departures.** Settings, History, and Forge build-choice flows are the sole exceptions that may take over the full screen — explicit, returnable, and the only routes that replace/unmount the canvas.
4. **Mid-takeover events: accept the miss.** If a canvas event fires during a rare takeover, the animation may be missed; durable state still updates silently. No event-replay queue — this honors the architecture boundary (simulation owns truth; renderer shows motion) and avoids creating a new economy-safety surface (event ordering, same-tick bursts, dedup).

**Why this resolves the original blocker:** ~all gameplay events that emit particles (active-session Current trails, finish Bloom/Activation/Core ripple, Core convert/store ripple, rejuvenation token-grant flash) occur during core play, which now happens with the canvas visible. The IA disconnect in "The Problem" is dissolved for the common case. Forge is the one signal-producing flow that remains a takeover; its flashes are accepted as misses per decision 4 (Forge's strategic moment is the choice, not the flash).

**Connection to the sacred flow:** canvas-always-visible *strengthens* the protected core interaction — the grid is literally always one tap away, no navigation required.

## Open Questions — Resolved vs. Still Open

**Resolved by this session:**

- Persistent canvas vs. route-replacing panels -> **persistent canvas, never covered.**
- Canvas-as-navigation -> **yes; tapping hexes IS the interaction (inline).**
- Where the session timer / focus view lives -> **on the canvas, anchored to the Cell (not `/cells/:id`).**
- Whether Core allocation coexists with a visible canvas -> **yes, inline (Core is not a takeover).**
- Event behavior during a takeover -> **accept the miss, no replay queue.**

**Still open -> hand to `/gsd-discuss-phase` then `/gsd-plan-phase`:**

- **Mobile real estate.** "Never covered" + inline hex interaction is desktop-flavored; on a phone a hex is small and inline controls may be cramped. Decide: desktop never-covered + mobile sheet/overlay split, or a single responsive compromise.
- **Accessibility spine (UI-02 / D-06).** Does the always-visible semantic Cell list remain the primary a11y surface with the canvas supplementary, or does canvas-as-spine change the a11y contract? Must stay non-dependent on canvas.
- **WebGL-fail (D-07).** If the canvas IS the spine, what does the layout degrade to when WebGL/Canvas is unavailable? The layout must not depend on a working canvas.
- **Camera / zoom-to-cell.** Inline module interaction may still need zoom-to-Cell (or at least focus-highlight). Evaluate `pixi-viewport` vs a simple custom camera (STACK.md verification flag).
- **Inline interaction depth.** How much module configuration can live inline on a hex before it must escalate to a takeover? Feeds the `/gsd-sketch` below.

## Code Touchpoints a Future Plan Will Likely Hit

- `src/app/routes.tsx` — flat route table; the pivot restructures this
- `src/ui/flowgrid-home/FlowgridHome.tsx` + `FlowgridCanvas.tsx` — canvas mount lifecycle (lift to app shell so it persists across core interactions)
- `src/ui/cell-board/CellBoard.tsx`, `src/ui/core-panel/CorePanel.tsx`, `src/ui/forge-panel/ForgePanel.tsx`, `src/ui/settings/SettingsPanel.tsx` — currently route-replacing panels; CellBoard/Core become inline-on-grid, Forge/Settings/History become the rare takeovers
- `src/render/flowgrid/scene.ts` — possible zoom-to-cell / focus-highlight for inline interaction
- Possibly a camera module (evaluate `pixi-viewport` vs custom — STACK.md verification flag)

## Suggested Next Commands

1. `/gsd-sketch` — explore what **inline module interaction** looks/feels like on a hex (the "modules are the interface itself" frontier). Selected as an output of this explore session.
2. `/gsd-discuss-phase` -> `/gsd-plan-phase` for **Phase 6.1: Canvas-Always-Visible Layout Pivot** (added to ROADMAP.md by this session; unblocks 06-05 / UI-03 / VER-06).
3. Then re-open 06-05 Task 3 once the pivot lands.
