import type { Application, ParticleContainer, Ticker } from 'pixi.js';

import type { FlowgridSnapshot } from '../../domain/index.js';
import { activeFocusTrail } from './route-anchors.js';
import { emitTrail, type LiveParticle, type ParticleAnchors } from './particles.js';

interface AmbientCurrentOptions {
  readonly getSnapshot: () => FlowgridSnapshot | null;
  readonly getAnchors: () => ParticleAnchors;
  readonly isEnabled: () => boolean;
  readonly intervalMs?: number;
  readonly maxParticles?: number;
}

export function startAmbientCurrent(
  app: Application,
  layer: ParticleContainer,
  liveParticles: LiveParticle[],
  options: AmbientCurrentOptions,
): () => void {
  const intervalMs = options.intervalMs ?? 140;
  const maxParticles = options.maxParticles ?? 220;
  let elapsed = 0;

  const tick = (ticker: Ticker): void => {
    if (!options.isEnabled()) {
      elapsed = 0;
      return;
    }

    elapsed += ticker.deltaMS;
    if (elapsed < intervalMs || liveParticles.length >= maxParticles) return;
    elapsed %= intervalMs;

    const snapshot = options.getSnapshot();
    if (snapshot === null) return;

    const trail = activeFocusTrail(snapshot, options.getAnchors());
    if (trail === null) return;

    emitTrail(
      layer,
      liveParticles,
      trail.from.x,
      trail.from.y,
      trail.to.x,
      trail.to.y,
      0x67e8f9,
    );
  };

  app.ticker.add(tick);
  return () => {
    app.ticker.remove(tick);
  };
}
