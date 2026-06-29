# Smooth Canvas Background Plan

## Goal

Remove the visible rectangular contrast edge around the Flowgrid canvas so the sigil reads as part of one continuous app field.

## Scope

- Adjust the ambient shell background to carry the blue field across the whole main view.
- Remove the canvas-specific edge treatment that makes its bounds legible.
- Verify with typecheck, focused UI tests, and a browser smoke screenshot/metrics pass.

## Design Intent

The user should perceive a living diagram embedded in the app, not a canvas plate placed over a different page background.
