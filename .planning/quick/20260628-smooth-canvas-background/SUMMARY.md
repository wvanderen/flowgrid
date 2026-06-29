# Smooth Canvas Background Summary

## Outcome

The Flowgrid canvas no longer reads as a visible rectangle on desktop.

- Broadened the ambient blue field and grid treatment onto the whole app shell.
- Removed the canvas-specific mask edge.
- Made the canvas a fixed full-viewport background layer at `xl` desktop widths so its physical bounds sit outside the visible composition.
- Preserved the normal relative/stacked canvas flow on mobile.

## Verification

- `npm run typecheck`
- `npm run test -- tests/ui/flowgrid-home.test.tsx tests/ui/cell-list-a11y.test.tsx tests/ui/settings-reduce-motion.test.tsx tests/ui/z-lift-dock.test.tsx`
- `npm run lint`
- `npm run build`
- Playwright desktop smoke at 1280x720: canvas stage is fixed at viewport bounds, main route does not scroll, no console errors.
- Playwright mobile smoke at 390x844: canvas remains relative, no horizontal overflow, no console errors.

## Notes

The Vite production build still reports the existing large chunk warning for Pixi-heavy bundles.
