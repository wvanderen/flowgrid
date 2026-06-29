// PixiJS 8 Ticker-driven animation lifecycle (RESEARCH §"Pixi v8 Ticker" lines
// 429-445 + §"Custom in-place tween" 447-457; D-02 live trail + D-03/D-08
// reduceMotion gate).
//
// Owns:
//   - startMotion: registers a per-frame callback that advances every tracked live
//     particle (vx/vy * deltaMS, life decrement, dead-particle removal) and returns
//     a stop handle.
//   - stopMotion: stops the ticker so no frame callbacks run (D-08 reduced/disabled
//     = animation fully off; only static hexes/halos remain).
//   - tweenTowards: a small custom exponential lerp (no tween library — @pixi/tween
//     does not exist on npm, RESEARCH §Package Legitimacy Audit).
//
// Per the render-layer ESLint block (eslint.config.js:131-176): this file imports
// Pixi + domain types ONLY. No React/Dexie/Zustand/DOM.

import type { Application, Ticker } from 'pixi.js';

import type { LiveParticle } from './particles.js';

// Register a ticker callback that advances `liveParticles` by their per-particle
// velocity (pixels/second * deltaMS), decrements remaining life, and removes dead
// particles from the layer + the tracking array. Returns a function that removes
// ONLY this callback (the caller invokes it on unmount).
//
// The callback reads ticker.deltaMS (real elapsed ms; unaffected by ticker.speed)
// rather than ticker.deltaTime (frame-normalized) so particle motion is
// framerate-independent.
export function startMotion(
  app: Application,
  liveParticles: LiveParticle[],
  onDead: (particle: LiveParticle) => void,
): () => void {
  const tick = (ticker: Ticker): void => {
    const dt = ticker.deltaMS;
    // Iterate backwards so we can cull in place without index drift.
    for (let i = liveParticles.length - 1; i >= 0; i--) {
      const lp = liveParticles[i]!;
      lp.particle.x += lp.vx * dt / 1000;
      lp.particle.y += lp.vy * dt / 1000;
      const lifeRatio = Math.max(0, Math.min(1, lp.life / lp.maxLife));
      lp.particle.alpha = Math.min(0.95, Math.sin(lifeRatio * Math.PI) * 1.05);
      lp.life -= dt;
      if (lp.life <= 0) {
        onDead(lp);
        liveParticles.splice(i, 1);
      }
    }
  };
  app.ticker.add(tick);
  return () => {
    app.ticker.remove(tick);
  };
}

// Stop the ticker entirely. Used both on unmount and when reduceMotion is true
// (D-08: animation fully off — no frame callbacks run; the static scene renders
// normally on the next render call).
export function stopMotion(app: Application): void {
  app.ticker.stop();
}

// Resume the ticker after a stopMotion call (e.g. reduceMotion toggled back off).
export function startTicker(app: Application): void {
  app.ticker.start();
}

// Exponential-easing lerp toward a target point. Framerate-independent via deltaMS;
// converges in roughly 250ms. Used by updateFlowgridScene to slide Container x/y
// and halo stroke/color in place (D-05 — never destroy + rebuild).
//
// `k` per call = 1 - exp(-8 * dt / 1000) — at 60fps (dt≈16.6) k≈0.125, matching
// the standard "lerp 12.5% of the way each frame" feel.
export function tweenTowards(
  obj: { x: number; y: number },
  tx: number,
  ty: number,
  dt: number,
): void {
  const k = 1 - Math.exp((-8 * dt) / 1000);
  obj.x += (tx - obj.x) * k;
  obj.y += (ty - obj.y) * k;
}

// Exponential-easing lerp for a single scalar (halo stroke width, alpha, etc.).
export function tweenScalar(current: number, target: number, dt: number): number {
  const k = 1 - Math.exp((-8 * dt) / 1000);
  return current + (target - current) * k;
}
