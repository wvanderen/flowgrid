---
sketch: 001
name: inline-module-interaction
question: "How does tapping a module hex interact inline, on the grid, without a panel covering the canvas?"
winner: "B"
tags: [interaction, paradigm, inline, canvas-always-visible]
---

# Sketch 001: Inline Module Interaction

## Design Question

Flowgrid's canvas must stay mounted and visible during all core play (the canvas-always-visible pivot). So when you tap a module hex, the interaction has to happen **inline, on the lattice itself** — no panel, sheet, or overlay ever covers the grid. This sketch asks: *what does that inline interaction actually look and feel like?*

The tapped module here is the **Generator** on a "Music" Cell — the sacred `open app → tap Cell → start session` path.

## How to View

```
open .planning/sketches/001-inline-module-interaction/index.html
```

Use the top tabs to switch variants. Click the ▲ Generator hex (or "Replay interaction") to arm each interaction. Bottom-right toolbar has theme + viewport (phone/tablet/full) previews.

## Variants

- **A: Radial Bloom** — the module hex scales up and its controls unfold as orbiting sigil-petals around it; a dashed sigil ring rotates. The hex "blooms open" in place. Lattice fully visible behind.
- **B: Z-Lift Spotlight** — the tapped module lifts toward the viewer (scale + glow), neighbors dim and recede, a soft spotlight blooms behind it, and a compact control cluster docks in the negative space beside it (never covering the grid). A focus cone keeps it wired to the Core.
- **C: Command Wheel** — the hex stays put and spawns a game-style segmented ability wheel around it (Destiny/weapon-wheel lineage). Each sector is a command; hover brightens, click selects. Holographic and game-like.

## What to Look For

- **Does the lattice stay visible and un-covered in all three?** (Non-negotiable — this is the whole pivot.)
- **Which paradigm reads as "the module is the interface" vs. "a panel snuck in"?** B's dock is the closest to a panel — does it cross the line, or is it acceptable because it floats in negative space?
- **Dopamine/juice** — which feels most alive when armed? (Sigil bloom vs. cinematic lift vs. wheel snap.)
- **Scale across viewports** — try phone/tablet in the toolbar. B's side dock gets cramped on phone; A and C center on the hex and may survive small screens better. This previews the mobile open-question.
- **Session-start friction** — the sacred path is "tap Cell → start session." Which variant makes the one-tap Start feel most immediate?

## Open Questions Surfaced

- How deep can inline controls go before escalating to a rare takeover? (A's petals vs. B's dock hint at different ceilings.)
- Does B's neighbor-dimming violate "canvas always visible" or enhance focus? (Perception question for the user.)
