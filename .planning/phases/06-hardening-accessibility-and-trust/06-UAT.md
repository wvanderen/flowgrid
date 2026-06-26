---
status: diagnosed
phase: 06-hardening-accessibility-and-trust
source: [06-VERIFICATION.md]
started: 2026-06-26T20:30:00Z
updated: 2026-06-26T20:55:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Visual animation fidelity inspection on a real GPU (not SwiftShader headless)

expected: |
  Open the production build in a real browser with WebGL. Start a focus session, run it to completion, log a rejuvenation, and run a forge roll; observe the canvas.
    - Particle Current trails visibly flow from Cell hexes toward the Core while a focus session is active.
    - Bloom burst radiates on session completion.
    - Core convert ripple and store ripple animate on allocation/rejuvenation.
    - Forge-roll and token-granted flashes animate on /forge and /core.
    - Reduced-motion ON yields static hexes/halos with no animation (ticker fully stopped), static durable state still visible.
    - WebGL-fail path shows the friendly inline note ("Visuals unavailable — you can still do everything from the Cell list below") + a Settings link, not a blank frame.
  Why human: VER-06 pixel-variance is intentionally skipped (Pixi v8 preserveDrawingBuffer:false defeats readback). The structural probe (cells>0, core===true, routes>=0) is always-run and passes, but cannot see whether particles actually move or whether the motion reads as "Current flowing".
result: issue
reported: "production build is necessary here? opening index.html shows a blank page. Local dev build still doesn't seem to have any movement at all"
severity: major

### 2. Axe + keyboard spot-check in a real browser session

expected: |
  Manual full-flow walkthrough against the production build (`npm run build && npm run preview`): create Cell, focus, complete, inspect, set allocation, log rejuvenation, forge, reload, export — across keyboard and pointer.
    - No contrast, focus-order, or ARIA regressions surface when navigating live.
    - Every step completes without friction; reload preserves all state (IndexedDB durability).
    - Keyboard navigation reaches every critical action via the semantic Cell list + panels.
    - Canvas animations enhance rather than obscure the experience.
  Why human: VER-05 runs axe in headless Chromium (zero violations) and is necessary, but a final human a11y/release-readiness pass on the production build is the "feels trustworthy as a daily app" bar the Phase Goal names. Headless axe is necessary but not sufficient.
result: pass

## Summary

total: 2
passed: 1
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Particle Current trails, Bloom bursts, Core convert/store ripples, and forge/token flashes visibly animate during their respective events in the dev build served via the Vite dev server."
  status: failed
  reason: "User reported: production build is necessary here? opening index.html shows a blank page. Local dev build still doesn't seem to have any movement at all"
  severity: major
  test: 1
  root_cause: "buildParticleAnchors in src/ui/flowgrid-home/FlowgridCanvas.tsx:227-249 returns particle positions in stage/canvas coordinates (adds refs.container.x/y to each hex-local position), but the ParticleContainer (sceneRefs.particleLayer) is parented as a child of the Flowgrid scene container (src/render/flowgrid/scene.ts:243), which is itself centered at (app.screen.width/2, app.screen.height/2). Pixi applies the centering transform a SECOND time to every particle, so all particles land at approximately (2 x canvasCenterX, 2 x canvasCenterY) — off the bottom-right corner of the canvas. The emission pipeline, ticker, and per-frame motion update are all healthy; particles simply never appear in the visible canvas region. Secondary contributor: SettingsPanel.tsx:72-96 auto-persists reduceMotion=true from the OS prefers-reduced-motion preference on the first /settings visit, which can also stop the ticker for affected users."
  artifacts:
    - path: "src/ui/flowgrid-home/FlowgridCanvas.tsx"
      issue: "buildParticleAnchors (lines 227-249) double-applies the scene container centering transform by adding refs.container.x/y to hex-local positions"
    - path: "src/render/flowgrid/scene.ts"
      issue: "particleLayer is a child of the centered scene container (line 243), so particle local coordinates must be container-local, not stage-local"
    - path: "src/ui/settings/SettingsPanel.tsx"
      issue: "auto-persists reduceMotion=true from OS preference (lines 72-96) — secondary, environment-conditional contributor"
  missing:
    - "Remove the + refs.container.x / + refs.container.y additions in buildParticleAnchors so anchors stay in container-local space (core: {0,0}; cells: {view.x, view.y}; routes: {route.fromX/fromY, route.toX/toY})"
    - "Verify in a real browser: Bloom burst centered on Core, current-flow trail travels Cell-hex -> Core"
    - "Revisit SettingsPanel OS-preference auto-persist: gate behind explicit user confirmation or make session-only so reduceMotion cannot be accidentally pinned true"
  debug_session: .planning/debug/no-canvas-animation.md
