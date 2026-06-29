---
status: complete
completed_at: "2026-06-28T00:00:00.000Z"
---

# Main Surface Cockpit Summary

Implemented the confirmed living-diagram cockpit direction:

- Reworked `AppLayout` into a first-viewport cockpit with compact header, global rail, canvas stage, and selection inspector.
- Promoted `ZLiftDock` into the real inspector for home, selected Cell, and selected Core states.
- Folded selected Cell activity into the inspector: Generator controls, stats, modules, recent sessions, summary, edit/archive actions.
- Added Core-as-selectable-node behavior: Core route selection, Core inspector content, Core allocation/rejuvenation/boost/forge controls, and Core visual highlight.
- Added render plumbing for Core taps from the Pixi scene to route to `/core`.
- Hid non-takeover child-route content from the visible layout so old Cell/Core page stacks no longer force a long scroll below the canvas.
- Kept the interrupted focus prompt from duplicating live session controls.
- Updated layout tests to reflect the cockpit model.

Verification:

- `npm run test -- tests/ui/z-lift-dock.test.tsx tests/ui/flowgrid-home.test.tsx tests/ui/cell-list-a11y.test.tsx tests/ui/cell-board.test.tsx`
- `npm run build`
- `npm run typecheck`
- `npm run lint`
- Browser smoke: home, selected Cell, selected Core, mobile viewport, and console error check.
