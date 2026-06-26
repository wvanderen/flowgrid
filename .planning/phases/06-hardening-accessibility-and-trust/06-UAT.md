---
status: testing
phase: 06-hardening-accessibility-and-trust
source: [06-VERIFICATION.md]
started: 2026-06-26T20:30:00Z
updated: 2026-06-26T20:30:00Z
---

## Current Test

number: 1
name: Visual animation fidelity inspection on a real GPU (not SwiftShader headless)
expected: |
  Current trails, Bloom bursts, Core convert/store ripples, forge/token flashes visibly animate during their respective events; reduceMotion=true stops all animation while leaving the static scene visible; the WebGL-fail path shows the friendly inline note with a Settings link.
awaiting: user response

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
result: [pending]

### 2. Axe + keyboard spot-check in a real browser session

expected: |
  Manual full-flow walkthrough against the production build (`npm run build && npm run preview`): create Cell, focus, complete, inspect, set allocation, log rejuvenation, forge, reload, export — across keyboard and pointer.
    - No contrast, focus-order, or ARIA regressions surface when navigating live.
    - Every step completes without friction; reload preserves all state (IndexedDB durability).
    - Keyboard navigation reaches every critical action via the semantic Cell list + panels.
    - Canvas animations enhance rather than obscure the experience.
  Why human: VER-05 runs axe in headless Chromium (zero violations) and is necessary, but a final human a11y/release-readiness pass on the production build is the "feels trustworthy as a daily app" bar the Phase Goal names. Headless axe is necessary but not sufficient.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
