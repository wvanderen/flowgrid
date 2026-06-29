# Sigil Stage Composition Summary

## Outcome

The main Flowgrid view now treats the diagram as the first-viewport stage instead of a framed canvas card.

- Replaced the boxed canvas composition with a full-screen ambient sigil shell.
- Let the Pixi canvas fill the stage as a transparent, softly masked frame.
- Scaled the diagram up responsively so the Core and selected Cell read as the primary subject.
- Converted the right inspector from one heavy panel into stacked z-lift surfaces.
- Gave sacred actions, including Cell Generator and Core Rejuvenation, a gold spotlight treatment.
- Preserved semantic React controls for selection, Core inspection, Generator start, modules, sessions, and mobile access.

## Verification

- `npm run typecheck`
- `npm run test -- tests/ui/z-lift-dock.test.tsx tests/ui/flowgrid-home.test.tsx tests/ui/cell-list-a11y.test.tsx tests/ui/cell-board.test.tsx`
- `npm run lint`
- `npm run build`
- Playwright desktop smoke at 1280x720 with a created Cell: no console errors.
- Playwright mobile smoke at 390x844 with a created Cell: no console errors, no horizontal overflow, canvas mask applied.

## Notes

The Vite production build still reports the existing large chunk warning for Pixi-heavy bundles.
