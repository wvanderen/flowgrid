---
sketch: 002
name: scene-composition-depth
question: "What's the scene composition and depth of the Flowgrid lattice — flat, tilted/parallax, or a receding Core well?"
winner: "A"
tags: [layout, substrate, depth, scene]
---

# Sketch 002: Scene Composition & Depth

## Design Question

Sketch 001 locked *how you interact* with a module inline. This sketch asks what the **lattice itself** looks and feels like as a world — the substrate everything sits on. The mood references (Ghost in the Shell's net, VJ depth, Super Hexagon's pulsing geometry, Moonsigil's sacred precision) pull toward depth and dimensionality, but depth costs build effort and risks mobile/a11y clarity. Is the lattice a flat glowing board, a tilted parallax dataspace, or a well you peer into?

## How to View

```
open .planning/sketches/002-scene-composition-depth/index.html
```

Switch the top tabs (A: Flat Top-Down / B: Tilted Iso Planes / C: Core Well). Each transition animates. The legend (top-left) shows the substrate, depth cue, and relative build cost.

## Variants

- **A: Flat Top-Down** — the lattice faces you dead-on, pure 2D glow. Most readable, cheapest to build (CSS/SVG), closest to the current renderer. Super Hexagon flat-intensity.
- **B: Tilted Iso Planes** — the plane rotates in 3D with stacked translucent ring-planes at different depths for GitS parallax. Feels like a dataspace, not a board. Medium build cost (CSS 3D; real Pixi later).
- **C: Core Well** — concentric glowing rings recede toward a vanishing Core at the center; you peer *into* it. Most alien/primordial, most dramatic depth. Highest build cost (likely needs a real camera + Pixi work).

## What to Look For

- **Readability vs. awe** — Flat is clearest for "tap the right Cell"; Tilt/Well are more intoxicating but small text and hex-hit-areas get harder at an angle. Which serves the sacred one-tap session start?
- **Mobile** — tilt/well get cramped and hard to tap on a phone; flat survives best. (Toolbar phone preview isn't wired here, but imagine it on a 375px screen.)
- **Accessibility (UI-02)** — semantic non-canvas controls must stay primary. Depth is supplementary flavor; does Tilt/Well risk making the canvas feel *required*?
- **WebGL-fail (D-07)** — Flat degrades to a clean 2D board if WebGL dies. Tilt/Well lose their magic without 3D. Which is the safer substrate to *depend* on?
- **Cost honesty** — the legend shows build cost. C (well) likely needs a real camera module (evaluate `pixi-viewport` vs custom per STACK.md). Is the drama worth it for v1?

## Open Questions Surfaced

- Should v1 ship Flat and earn depth (Tilt/Well) as a v1.1+ enhancement, or is depth part of the core promise worth paying for now?
- If Tilt/Well, does the camera need pan/zoom (inline interaction from sketch 001 may want zoom-to-Cell)?
