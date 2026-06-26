# Exploration Seed: Canvas-Always-Visible Layout Pivot

**Origin:** Phase 06 Plan 05 gap-closure checkpoint (FAILED) — 2026-06-26
**Status:** Seed — needs `/gsd-explore` design thinking before any plan
**Severity:** Blocks UI-03, VER-06 (Phase 06 cannot fully complete without resolving this)
**Related:** `.planning/phases/06-hardening-accessibility-and-trust/06-05-SUMMARY.md`, `.planning/debug/no-canvas-animation.md`

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

## The Constraint It Violates

PROJECT.md **Core interaction**: `open app -> tap Cell -> start session` must stay protected — the Generator is sacred and must always be easy to use. Any pivot must preserve (or strengthen) the one-tap-into-a-session flow.

PROJECT.md **Rendering**: canvas/WebGL/PixiJS powers the Flowgrid + module-board visuals; the app shell, panels, forms, inspectors use a normal component framework. The pivot must keep this split.

PROJECT.md **Core Value**: "Tap a Cell, do a real thing, and feel that effort become visible, useful signal." Right now the effort is invisible because the canvas isn't present when the signal flows.

## Design Directions to Explore (from the user)

1. **Persistent canvas as the app spine.** The canvas is always visible; panels (Cell detail, Core, Forge, Settings) render as overlays, side rails, or bottom sheets rather than route replacements. Effort stays visible at all times.
2. **Context-driven camera.** Navigating to a destination (e.g. "Core") flies/pans the camera to the Core hex rather than leaving the canvas. Zoom level reflects context — a Cell session zooms to that Cell+Core+route; Forge zooms to the Forge area.
3. **Canvas-as-navigation.** Tapping hexes IS the navigation (tap Core hex → Core panel slides in over a still-visible canvas; tap a Cell → session view anchored on that Cell).

These are hypotheses, not decisions. They trade off against:
- Mobile screen real estate (canvas + panel simultaneously is hard on phones)
- Accessibility (D-06 semantic Cell list must stay primary; canvas is supplementary — UI-02)
- The sacred one-tap session start
- WebGL-fail graceful degradation (D-07: the canvas can be unavailable; the layout must not depend on it)
- Complexity / scope creep for a v1 MVP

## Open Questions for Exploration

- Persistent canvas vs. route-replacing panels: which better serves the protected `tap Cell -> start session` flow?
- Where does the session timer / focus view live if the canvas stays put? (Today it's CellBoard at `/cells/:id`.)
- How do Core allocation sliders and Forge choices coexist with a visible canvas (split view on desktop; sheet/overlay on mobile)?
- Does the camera-move approach require pan/zoom infrastructure (`pixi-viewport`, flagged LOW confidence in STACK.md) or can a simple custom camera suffice?
- Should the Cell list (D-06) remain the always-visible semantic spine, with the canvas as a persistent-but-secondary visual? Or does the canvas become the spine with the list as an overlay?
- Is this a v1-blocking redesign, or a v1.1 enhancement with a minimal v1 shim (e.g., a floating mini-canvas on session/Core/Forge routes)?

## Why This Needs `/gsd-explore` First

This is a product/IA decision with real trade-offs (mobile, a11y, scope, the sacred core flow). It must not be jammed into a gap-closure code plan. `/gsd-explore` should weigh the directions against PROJECT.md constraints, pick a target IA, and only then hand off to discuss → plan → execute as a proper phase (likely a new Phase 7 or a Phase 6.1 insertion).

## Code Touchpoints a Future Plan Will Likely Hit

- `src/app/routes.tsx` — flat route table; the pivot restructures this
- `src/ui/flowgrid-home/FlowgridHome.tsx` + `FlowgridCanvas.tsx` — canvas mount lifecycle
- `src/ui/cell-board/CellBoard.tsx`, `src/ui/core-panel/CorePanel.tsx`, `src/ui/forge-panel/ForgePanel.tsx`, `src/ui/settings/SettingsPanel.tsx` — currently route-replacing panels; become overlays/destinations
- `src/render/flowgrid/scene.ts` — camera/pan/zoom if context-driven camera is chosen
- Possibly a camera module (evaluate `pixi-viewport` vs custom — STACK.md verification flag)

## Suggested Next Command

`/gsd-explore` with this seed as input.
