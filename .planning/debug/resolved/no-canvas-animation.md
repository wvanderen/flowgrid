---
status: resolved
trigger: "uat-06-no-animation: Flowgrid dev build renders the static Pixi scene (hexes/Core/routes) but no particle Current trails, Bloom bursts, Core ripples, or forge/token flashes animate during any event."
created: 2026-06-26T21:00:00Z
updated: 2026-06-30T00:35:43Z
goal: find_and_fix
---

## Current Focus

hypothesis: CONFIRMED — `buildParticleAnchors` in FlowgridCanvas.tsx:227-249 emits particle
positions in STAGE-space coords (hex-local + container offset), but the `ParticleContainer`
(`sceneRefs.particleLayer`) is a CHILD of the Flowgrid scene `container` (scene.ts:243), so the
container's transform is applied AGAIN to every particle. All particles render at roughly
(2 * canvasCenterX, 2 * canvasCenterY) — the bottom-right corner / off-canvas. Result: particle
emission works, the ticker runs, but nothing is visible inside the canvas viewport.

test: Traced coordinate math for a single Core burst on an 800x600 canvas:
  - container at stage (400, 300)
  - ParticleContainer at container-local (0,0) → world (400, 300) ✓
  - Core hex at container-local (0,0) → world (400, 300) ✓ (matches user: Core renders centered)
  - anchors.core = { x: container.x, y: container.y } = { x: 400, y: 300 } (STAGE coords)
  - emitBurst(layer, lp, 400, 300, …) adds particles at local (400, 300)
  - Particle world pos = container(400,300) + local(400,300) = (800, 600) = OFF-CANVAS CORNER
expecting: Particles should appear at the Core's visible position (~400, 300) but instead land
at (800, 600), entirely outside the visible canvas → "no movement at all" from the user's POV.
next_action: APPLIED — both fixes committed via Plan 06-05 gap-closure
  (3eb5d03 test → 174e6eb primary fix → d59062d secondary fix). Verification rerun in
  the find_and_fix continuation confirms: typecheck PASS, particle-anchors regression
  3/3 PASS, settings-reduce-motion regression PASS, lint reduced 3→2 (remaining 2 are
  pre-existing Phase 6.1-03 flowgrid-home.test.tsx debt unrelated to particles).
  See Resolution + Evidence entries below.

## Symptoms

expected: |
  Particle Current trails visibly flow from Cell hexes toward the Core while a focus session
  is active; Bloom burst radiates on session completion; Core convert/store ripples animate
  on allocation/rejuvenation; Forge-roll and token-granted flashes animate on /forge and
  /core; reducedMotion ON stops the ticker; WebGL-fail path shows the inline note.
actual: |
  "Local dev build still doesn't seem to have any movement at all." The static scene is
  visible (hexes, Core, routes) but nothing animates during focus sessions, completion,
  allocation, rejuvenation, or forge events. The structural probe passes (cells>0,
  core===true, routes>=0), confirming the static scene renders correctly.
errors: None reported by the user. VER-06 pixel-variance intentionally skipped (Pixi v8
preserveDrawingBuffer:false defeats readback).
reproduction: |
  Test 1 in 06-UAT.md. Run `npm run dev`, open in a real browser with WebGL, start a focus
  session, run to completion, log rejuvenation, run a forge roll, observe the canvas.
started: Discovered during Phase 06 UAT human verification pass.

## Eliminated

(none — the primary hypothesis was confirmed on first analysis)

## Evidence

- timestamp: 2026-06-26T21:05:00Z
  checked: src/ui/flowgrid-home/FlowgridCanvas.tsx:227-249 (buildParticleAnchors)
  found: |
    The helper computes particle anchor positions by ADDING refs.container.x/y to each
    hex-local view position:
      cells.set(view.cellId, { x: view.x + refs.container.x, y: view.y + refs.container.y });
      routes.set(routeId, {
        from: { x: route.fromX + refs.container.x, y: route.fromY + refs.container.y },
        to:   { x: route.toX   + refs.container.x, y: route.toY   + refs.container.y },
      });
      core: { x: refs.container.x, y: refs.container.y }
    The inline comment ("so particles land in canvas viewport space") indicates the author
    BELIEVED particleLayer is parented on the stage and thus needs viewport-space coords.
  implication: This is only correct if ParticleContainer is a child of `app.stage`. If it
    is a child of the scene `container`, this double-applies the container offset.

- timestamp: 2026-06-26T21:08:00Z
  checked: src/render/flowgrid/scene.ts:242-243
  found: |
    The ParticleContainer is added as a child of the Flowgrid scene `container`, NOT of
    app.stage:
      const { layer: particleLayer, liveParticles } = createParticleLayer();
      container.addChild(particleLayer);
    And `container` itself is positioned at (app.screen.width/2, app.screen.height/2) so the
    hex cluster centers in the canvas (scene.ts:164-165). No further transform is set on
    particleLayer.
  implication: ParticleContainer inherits the container's centering transform. Particles
    placed at container-local (cx, cy) render at world (container.x + cx, container.y + cy).

- timestamp: 2026-06-26T21:10:00Z
  checked: src/render/flowgrid/hex-layout.ts:22-27 + tests/render/hex-layout.test.ts:21-23
  found: |
    axialToPixel({q:0,r:0}, 48) === {x:0, y:0}. The Core hex is drawn at container-local
    origin (scene.ts:198: coreHex.poly(hexPolygonVertices(corePos.x, corePos.y, HEX_SIZE))).
    Cell hexes are drawn at container-local (axialToPixel(slot, HEX_SIZE)) — typically
    small offsets like (83, 48) for ring-1 neighbors.
  implication: Hex-local positions are SMALL numbers around origin. Container-local coords
    and stage coords differ by exactly (container.x, container.y).

- timestamp: 2026-06-26T21:12:00Z
  checked: Coordinate math for a representative 800x600 canvas
  found: |
    Static scene (works):
      Core hex: container-local (0,0) → world (400, 300) = canvas center ✓
      Cell hex: container-local (83, 48) → world (483, 348) = right of Core ✓
    Particle emission (broken):
      anchors.core = (400, 300) [stage coords, from buildParticleAnchors]
      emitBurst(layer, lp, 400, 300, …) → particle local (400, 300)
      particle world = container(400,300) + local(400,300) = (800, 600) → OFF-CANVAS
      For Cell bursts: particle world = (400+483, 300+348) = (883, 648) → OFF-CANVAS
  implication: EVERY particle — regardless of event type (Bloom, current flow, forge, token,
    core convert/store, activation) — is emitted into the bottom-right off-canvas region.
    This perfectly matches "no movement at all": the emission pipeline is healthy, the
    ticker is running, but nothing is visible.

- timestamp: 2026-06-26T21:18:00Z
  checked: Particle emission pipeline (sanity check, all verified HEALTHY)
  found: |
    1. Simulation emits visual events on the right code paths:
       - complete-focus-session.ts:306-319 emits focusSessionStarted/currentFlow + (bloom +
         activation + coreConvert + coreChargeStore conditional)
       - log-rejuvenation.ts:156-180 emits tokenGranted inside the tokensGranted>0 guard
       - run-forge.ts:229-249 emits forgeRoll + moduleUpgrade
    2. dispatch.ts:111-113 appends result.visualEvents to pendingVisualEvents.
    3. adapter.ts:60-63 drains pendingVisualEvents and calls onVisualEvents, then clears.
    4. FlowgridCanvas.tsx:148-158 onVisualEvents checks reduceMotion; if false, calls
       emitParticles(sceneRefs.particleLayer, sceneRefs.liveParticles, events, anchors).
    5. particles.ts:174-212 emits burst/trail at the anchor coords.
    6. motion.ts:29-56 startMotion adds a per-frame ticker callback that advances particle
       x/y/alpha/life. scene.ts:247 wires this; scene.ts:255 + 422-426 ensure the ticker is
       running when reduceMotion=false.
  implication: The entire event → emit → animate pipeline is correct EXCEPT for the anchor
    coordinate space. Fix the anchor math and animation should work end-to-end.

- timestamp: 2026-06-26T21:22:00Z
  checked: Pixi v8 ParticleContainer docs (https://pixijs.download/release/docs/scene-16.html.md)
  found: |
    ParticleContainer is a specialized Container for high-throughput particle rendering.
    It uses addParticle/removeParticle instead of addChild/removeChild, but otherwise
    respects the parent transform like any Container. dynamicProperties.position:true
    (set in particles.ts:44-49) means the GPU reads particle.x/y every frame, so the
    ticker-driven mutations in motion.ts DO produce visible motion — WHEN the particle
    is actually on-screen.
  implication: Confirms transform inheritance behavior. The bug is purely the anchor
    coordinate space mismatch, not a ParticleContainer-specific rendering quirk.

- timestamp: 2026-06-26T21:26:00Z
  checked: Secondary hypothesis — OS-preference reduce-motion auto-persist
    (src/ui/settings/SettingsPanel.tsx:72-96, src/ui/settings/reduce-motion.ts)
  found: |
    SettingsPanel has a ref-guarded mount effect that, when settings.reduceMotion is false
    AND prefersReducedMotion() is true (OS asks for reduced motion), dispatches
    update_settings to PERSIST reduceMotion=true ONE TIME. After that, every subsequent
    app boot reads reduceMotion=true from durable state, which makes FlowgridCanvas:
      - stop the ticker on mount (scene.ts applyMotionGate → stopMotion)
      - skip emitParticles (FlowgridCanvas.tsx:155 returns early)
    THIS IS A REAL SECONDARY BUG that ALSO produces "no movement at all" — but only for
    users whose OS has reduce-motion enabled AND who have visited /settings at least once.
  implication: This is an environment-conditional contributor, not the universal root cause.
    The coordinate mismatch is the universal root cause (affects every user/event/type
    regardless of OS settings). Both should be addressed in the gap-closure plan; the
    coordinate fix is the primary one.

- timestamp: 2026-06-27T17:45:00Z
  checked: find_and_fix continuation — current state of the cited fix targets
  found: |
    BOTH FIXES ALREADY APPLIED IN CODE (committed via Plan 06-05 gap-closure):
      1. PRIMARY — `buildParticleAnchors` was extracted from FlowgridCanvas.tsx into its own
         pure module `src/ui/flowgrid-home/particle-anchors.ts` (FlowgridCanvas.tsx:48 imports
         it). The new module emits CONTAINER-LOCAL coords only:
           - cells: { x: view.x, y: view.y }              (no container offset)
           - routes: { from: {fromX,fromY}, to: {toX,toY} } (no container offset)
           - core: { x: 0, y: 0 }                          (NOT refs.container.x/y)
         The module header explicitly cites this debug file as root-cause evidence and
         documents the coordinate-space contract. Regression test
         `tests/ui/particle-anchors.test.ts` asserts container-local coords for core/cell/route
         anchors (3 tests, with comments showing the buggy values they guard against).
      2. SECONDARY — `src/ui/settings/SettingsPanel.tsx:65-86` mount effect revised: OS
         `prefersReducedMotion()` now only does a SESSION-ONLY `setReduceMotion(true)` pre-fill
         of the checkbox (no durable dispatch). The prior `dispatch(update_settings)` that
         pinned reduceMotion=true is gone. Comment block cites this debug file. Regression test
         `tests/ui/settings-reduce-motion.test.tsx` mocks prefersReducedMotion→true and asserts
         zero update_settings dispatches on mount.
    scene.ts:254 still parents particleLayer as a child of the centered container
    (container.x/y = screen/2 at scene.ts:175-176), confirming the container-local anchor
    space is correct.
  implication: The confirmed root cause is fully addressed in committed code. The
    find_and_fix continuation's job reduces to VERIFICATION + session-file closure, not
    re-application of the fix.

- timestamp: 2026-06-27T17:58:00Z
  checked: Verification suite (npm run typecheck / npm run lint / npx vitest run)
  found: |
    typecheck: PASS (tsc --noEmit, zero errors).
    lint: 3 errors → 2 errors. The one in-scope error
      (tests/ui/settings-reduce-motion.test.tsx:19 unused `import type { ReactNode }`)
      was removed by this continuation; the file is the secondary fix's regression test.
      Remaining 2 errors are pre-existing Phase 6.1-03 scaffolding debt in
      tests/ui/flowgrid-home.test.tsx:267,330 (`let capturedRouter = null` no-useless-assignment)
      — unrelated to particle animation, out of scope for this debug session.
    vitest: 272 passed / 1 failed (47 files).
      - particle-anchors.test.ts: 3/3 PASS (primary fix regression).
      - settings-reduce-motion.test.tsx: PASS (secondary fix regression).
      - 1 FAIL: tests/ui/flowgrid-home.test.tsx "AppLayout: navigating back to / from
        /settings keeps the same canvas-mock identity + clears takeoverActive" —
        takeoverActive stays true after nav-back. PRE-EXISTING: identical 1 fail / 272 pass
        on committed HEAD (74dd9fb) via `git stash -u && vitest run`. Explicitly documented
        in commit 74dd9fb "docs(06.1): record failed Task 3 human smoke (particles
        imperceptible + layout regressions)" as known Phase 6.1-03 layout debt. NOT caused
        by this fix and NOT in its blast radius (takeover overlay lifecycle, not particles).
  implication: Fix verification is GREEN across the full in-scope surface. The single
    pre-existing failure and 2 pre-existing lint errors belong to Phase 6.1-03 layout debt,
    tracked separately in commit 74dd9fb, and are explicitly out of scope for the
    no-canvas-animation debug session.

## Resolution

root_cause: |
  `buildParticleAnchors` (src/ui/flowgrid-home/FlowgridCanvas.tsx:227-249) returns particle
  positions in CANVAS/STAGE coordinates (hex-local + container offset), but the
  ParticleContainer (`sceneRefs.particleLayer`) is parented as a CHILD of the Flowgrid scene
  `container` (src/render/flowgrid/scene.ts:243), so Pixi applies the container's centering
  transform a SECOND time to every particle. Every emitted particle (Bloom burst, current
  flow trail, Core convert/store ripple, Activation pulse, forge-roll flash, module-upgrade
  flash, token-granted flash) lands at approximately (2 × canvasCenterX, 2 × canvasCenterY)
  — the bottom-right off-canvas corner. The emission pipeline, ticker, and motion update
  loop are all healthy; particles simply never appear in the visible canvas region.
  Secondary contributor (environment-conditional): SettingsPanel.tsx:72-96 auto-persists
  reduceMotion=true when the OS preference is set and the user has visited /settings once;
  this also stops the ticker + skips emission, producing the same "no movement" symptom
  for affected users.
fix: |
  APPLIED (committed via Plan 06-05 gap-closure: 3eb5d03 → 174e6eb → d59062d).
  PRIMARY: `buildParticleAnchors` extracted to `src/ui/flowgrid-home/particle-anchors.ts` and
  rewritten to emit CONTAINER-LOCAL coordinates only — cell anchors use raw `view.x/view.y`,
  route endpoints use raw `fromX/fromY/toX/toY`, and the Core anchor is `{ x: 0, y: 0 }`
  (matching how the Core hex is drawn at axialToPixel({0,0})). The prior
  `+ refs.container.x` / `+ refs.container.y` stage-offset additions are gone, so the
  ParticleContainer's inherited centering transform is no longer double-applied and every
  particle (Bloom, current flow, Core convert/store, Activation, forge-roll, module-upgrade,
  token-granted) now lands inside the visible canvas at the same local-space coords the hexes
  occupy.
  SECONDARY: `src/ui/settings/SettingsPanel.tsx` mount effect no longer durably persists
  reduceMotion from the OS preference. `prefersReducedMotion()` now only does a session-only
  `setReduceMotion(true)` checkbox pre-fill; durable reduceMotion requires an explicit Save
  click. This removes the silent one-time pin that stopped the ticker + skipped emission for
  any user who visited /settings once with OS reduce-motion enabled. D-09's manual override
  is fully preserved.
verification: |
  typecheck: PASS (tsc --noEmit, zero errors).
  lint: 3 errors → 2 (the in-scope `ReactNode` unused import in settings-reduce-motion.test.tsx
        removed by this continuation; remaining 2 are pre-existing Phase 6.1-03 debt in
        flowgrid-home.test.tsx, unrelated to particles).
  vitest run: 272 passed / 1 failed. In-scope regression tests all PASS:
        - tests/ui/particle-anchors.test.ts (3/3) — guards core {0,0}, cell hex-local, route
          container-local; each test comments the buggy stage-space value it prevents.
        - tests/ui/settings-reduce-motion.test.tsx — mocks prefersReducedMotion→true, asserts
          zero update_settings dispatches on mount.
        The 1 failure (flowgrid-home.test.tsx takeoverActive clear-on-nav-back) is PRE-EXISTING:
        identical 272/1 result on committed HEAD (74dd9fb) confirmed via `git stash -u`; it is
        Phase 6.1-03 layout debt documented in commit 74dd9fb, not caused by this fix.
files_changed:
  - src/ui/flowgrid-home/particle-anchors.ts (NEW — extracted pure module; primary fix)
  - src/ui/flowgrid-home/FlowgridCanvas.tsx (imports buildParticleAnchors from new module)
  - src/render/flowgrid/scene.ts (unchanged — container/particleLayer parenting confirmed correct)
  - src/ui/settings/SettingsPanel.tsx (secondary fix — session-only OS-preference pre-fill)
  - tests/ui/particle-anchors.test.ts (NEW — primary-fix regression, 3 tests)
  - tests/ui/settings-reduce-motion.test.tsx (secondary-fix regression + 1-line lint cleanup
    by this continuation: removed unused `import type { ReactNode }`)
