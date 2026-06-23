# `src/render` — Renderer (Phase 1 boundary)

Phase 1 defers rendering. This folder is a placeholder for the future PixiJS scene adapter described in Phase 3+ of the roadmap and `docs/technical-vision-draft.md`.

The renderer will consume `VisualEvent` records emitted by the simulation. It must never own economy truth. Phase 1 simulation must not import from this layer, and must not import `pixi.js` or any DOM/Canvas API.
