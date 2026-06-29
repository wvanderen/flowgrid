---
status: completed
created: 2026-06-28T00:00:00Z
source: codex-inline
---

# Canvas Visual Finish

## Task

Bring the Pixi Flowgrid canvas up to the approved v1 Flat Top-Down visual direction from sketch 002 and the Holographic Plasma sketch theme.

## Scope

- Preserve all existing gameplay, persistence, simulation, routing, and accessibility behavior.
- Improve renderer crispness, hex styling, route styling, Core treatment, Z-Lift affordance, and particle readability.
- Stay in v1 Flat Top-Down; do not add a 3D camera, tilt, well, pan/zoom, or new gameplay.

## References

- `.planning/sketches/002-scene-composition-depth/README.md`
- `.planning/sketches/002-scene-composition-depth/index.html`
- `.planning/sketches/001-inline-module-interaction/README.md`
- `.planning/sketches/themes/default.css`

## Verification

- `npm run lint`
- `npm run typecheck`
- `npx vitest run tests/render/route-anchors.test.ts tests/ui/particle-anchors.test.ts tests/render/hex-layout.test.ts tests/ui/z-lift-targets.test.ts`
- `npx vitest run`
- `npm run build`
- Browser smoke at `http://127.0.0.1:5173/`
