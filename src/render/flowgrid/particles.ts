// PixiJS 8 ParticleContainer-backed particle layer (RESEARCH §"Pixi v8
// ParticleContainer" lines 396-427; D-01/D-02/D-04 visual-event animation).
//
// Owns the particle pool + burst/trail emitters. The Ticker lifecycle that advances
// the particles lives in motion.ts; this module just emits particles into the layer
// and tracks them so motion.ts can update + cull them.
//
// Pitfall 1 (RESEARCH): do NOT import @pixi/particle-emitter (peerDeps cap
// `< 8.0.0`). Pixi v8's built-in ParticleContainer/Particle is the supported path.
//
// Per the render-layer ESLint block (eslint.config.js:131-176): this file imports
// Pixi + domain types ONLY. No React/Dexie/Zustand/DOM.

import { Particle, ParticleContainer, Texture } from 'pixi.js';

import type { VisualEvent } from '../../domain/index.js';
import { VISUAL_EVENT_NAMES } from '../../domain/index.js';

// A tracked live particle. `life` is milliseconds remaining; when it hits zero the
// ticker removes the particle from the layer. vx/vy are pixels per second.
export interface LiveParticle {
  readonly particle: Particle;
  vx: number;
  vy: number;
  life: number;
  readonly maxLife: number;
}

// Tag attached to the particle layer so scene-inspect.ts can find it without
// reaching into internals.
export const FLOWGRID_PARTICLE_LAYER_LABEL = 'flowgrid-particles';

// Build the ParticleContainer + its live-particle tracking array. The container is
// added to the stage by the caller (buildFlowgridScene); motion.ts owns the ticker
// that drains `liveParticles`.
//
// dynamicProperties.position=true so trails/bursts move every frame (RESEARCH
// example). The other dynamicProperties stay false (the default) so the GPU batches
// as much as possible.
export function createParticleLayer(): {
  readonly layer: ParticleContainer;
  readonly liveParticles: LiveParticle[];
} {
  const layer = new ParticleContainer({
    dynamicProperties: {
      position: true,
      rotation: false,
      vertex: false,
      color: false,
    },
  });
  layer.label = FLOWGRID_PARTICLE_LAYER_LABEL;
  const liveParticles: LiveParticle[] = [];
  return { layer, liveParticles };
}

// Shared 1x1 white texture — every particle tinted at emit time. Texture.WHITE is
// a Pixi v8 built-in; cached so we never re-create it per particle.
function sharedTexture(): Texture {
  return Texture.WHITE;
}

// Spawn a radial burst of `count` particles at (x, y). Used for Bloom bursts, Core
// convert/charge ripples, Activation pulse, and forge-roll/module-upgrade flashes.
export function emitBurst(
  layer: ParticleContainer,
  liveParticles: LiveParticle[],
  x: number,
  y: number,
  count: number,
  tint: number,
): void {
  const texture = sharedTexture();
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 40 + Math.random() * 60;
    const life = 950 + Math.random() * 420;
    const particle = new Particle({
      texture,
      x,
      y,
      tint,
      alpha: 0.9,
      scaleX: 0.9,
      scaleY: 0.9,
    });
    layer.addParticle(particle);
    liveParticles.push({
      particle,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
    });
  }
  layer.update();
}

// Spawn a stream of particles along the line (fromX, fromY) -> (toX, toY). Used for
// the D-02 live ambient Current trail (Cell -> Core) and the currentFlowVisual burst.
export function emitTrail(
  layer: ParticleContainer,
  liveParticles: LiveParticle[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  tint: number,
): void {
  const texture = sharedTexture();
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  // Unit vector along the trail; particles drift slightly toward the destination.
  const ux = dx / dist;
  const uy = dy / dist;
  const count = 8;
  for (let i = 0; i < count; i++) {
    // Spread particles along most of the route so the motion reads from a still
    // screenshot as well as in motion. Earlier values kept all dots near the Cell
    // edge, where overlapping hexes made the trail too easy to miss.
    const t = i / count;
    const startX = fromX + dx * t * 0.75;
    const startY = fromY + dy * t * 0.75;
    const life = 1100 + Math.random() * 420;
    const particle = new Particle({
      texture,
      x: startX,
      y: startY,
      tint,
      alpha: 0.95,
      scaleX: 1.2,
      scaleY: 1.2,
    });
    layer.addParticle(particle);
    liveParticles.push({
      particle,
      vx: ux * 62 + (Math.random() - 0.5) * 16,
      vy: uy * 62 + (Math.random() - 0.5) * 16,
      life,
      maxLife: life,
    });
  }
  layer.update();
}

// Default per-event emission parameters. Events without a custom emitter fall back
// to a small burst at the event's entity anchor — the renderer caller resolves the
// pixel position. The counts/tints are conservative (Pitfall T-06-07: keep particle
// counts small; ParticleContainer is GPU-batched; dead particles are removed).
const EVENT_EMIT_PARAMS: Record<string, { count: number; tint: number }> = {
  [VISUAL_EVENT_NAMES.focusSessionStartedVisual]: { count: 18, tint: 0x67e8f9 },
  [VISUAL_EVENT_NAMES.bloomBurstVisual]: { count: 22, tint: 0x3dffa6 },
  [VISUAL_EVENT_NAMES.cellActivationVisual]: { count: 16, tint: 0xffd23d },
  [VISUAL_EVENT_NAMES.coreConvertVisual]: { count: 18, tint: 0xff3df0 },
  [VISUAL_EVENT_NAMES.coreChargeStoreVisual]: { count: 18, tint: 0x9b6cff },
  [VISUAL_EVENT_NAMES.currentFlowVisual]: { count: 10, tint: 0x34e7ff },
  [VISUAL_EVENT_NAMES.forgeRollVisual]: { count: 22, tint: 0xffd23d },
  [VISUAL_EVENT_NAMES.moduleUpgradeVisual]: { count: 18, tint: 0x3dffa6 },
  [VISUAL_EVENT_NAMES.tokenGrantedVisual]: { count: 20, tint: 0x9b6cff },
};

// Resolve a per-event anchor for an emitted visual event. The caller has the scene
// refs (Core + Cell pixel positions); we just dispatch the right emitter. Falls
// through to a no-op for events whose anchor is unknown (rare — happens only if a
// future event name is added without a wiring update).
//
// `anchors` is a lookup from `${entityType}:${entityId}` -> { x, y } the caller
// builds from scene refs before invoking this reducer.
export interface ParticleAnchors {
  readonly core: { x: number; y: number };
  readonly cells: ReadonlyMap<string, { x: number; y: number }>;
  readonly routes: ReadonlyMap<string, { from: { x: number; y: number }; to: { x: number; y: number } }>;
}

// Drive the particle layer from a batch of drained visual events. The caller
// supplies the anchors (resolved from scene refs) so this module never has to reach
// into the scene graph. Unknown events are ignored (UI-04 — visual events are
// transient; missing a flash is acceptable).
export function emitParticles(
  layer: ParticleContainer,
  liveParticles: LiveParticle[],
  events: readonly VisualEvent[],
  anchors: ParticleAnchors,
): void {
  for (const event of events) {
    const params = EVENT_EMIT_PARAMS[event.type];
    if (params === undefined) continue;

    // Resolve anchor by entityType. Core events always anchor at the Core; cell
    // events anchor at the named Cell; route events emit a trail along the route.
    if (event.entityType === 'core') {
      emitBurst(layer, liveParticles, anchors.core.x, anchors.core.y, params.count, params.tint);
    } else if (event.entityType === 'cell') {
      const cell = anchors.cells.get(event.entityId);
      if (cell !== undefined) {
        emitBurst(layer, liveParticles, cell.x, cell.y, params.count, params.tint);
      }
    } else if (event.entityType === 'route') {
      const route = anchors.routes.get(event.entityId);
      if (route !== undefined) {
        // Scene route geometry is stored Core -> Cell because the line is drawn
        // from the center outward. Current should visibly travel Cell -> Core.
        emitTrail(
          layer,
          liveParticles,
          route.to.x,
          route.to.y,
          route.from.x,
          route.from.y,
          params.tint,
        );
      }
    } else if (event.entityType === 'module_instance') {
      // Module-instance events (moduleUpgradeVisual) anchor at the Core for now —
      // per-module pixel anchors are a future refinement. The flash reads as
      // "something upgraded" without needing the exact slot.
      emitBurst(layer, liveParticles, anchors.core.x, anchors.core.y, params.count, params.tint);
    }
  }
}
