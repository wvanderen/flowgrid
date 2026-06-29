---
status: in_progress
created_at: "2026-06-28T00:00:00.000Z"
---

# Main Surface Cockpit

Task: Integrate the main Flowgrid canvas, selected Cell controls, and Core controls into one first-viewport living-diagram surface.

## Confirmed Direction

- Keep the canvas as the central living diagram.
- Fold selected Cell activity into the first-viewport inspector instead of rendering the full Cell Board below the canvas.
- Make the Core behave like a selectable diagram node with equivalent inspector treatment.
- Preserve the protected path: open app -> tap Cell -> start session.

## Implementation Plan

1. Refactor `ZLiftDock` into a selection inspector that supports Cell and Core modes.
2. Move useful Cell Board content into the inspector: Generator lifecycle, stats, module strip, recent sessions, edit/archive actions.
3. Move Core route content into the inspector: Core stats, allocation, rejuvenation, boost/forge/readiness cues.
4. Restructure `AppLayout` so the first viewport is a cockpit: header, canvas stage, inspector, compact global actions.
5. Reduce child route components to semantic route-status content so they no longer create a long lower page stack.
6. Verify with focused tests and a browser smoke if possible.

## Notes

The installed GSD helper failed during `init.quick` with a missing `package.json` module resolution error, so this quick artifact was created manually to satisfy the repo workflow gate before edits.
