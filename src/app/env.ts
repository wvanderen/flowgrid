// Production SimulationEnv factory (RESEARCH Code Examples lines 701-721, PATTERNS F1).
//
// The app shell calls this whenever it dispatches a command: the dispatcher needs an
// env whose `now`/`localDate` reflect the moment of dispatch. `localDate` is derived
// via `deriveLocalDate(now, settings.localDayBoundary)` so a user who set a non-
// midnight local-day boundary gets the correct effective calendar date for Bloom /
// Momentum / activation comparisons (D-16).

import type { IsoDateTimeString, LocalDateString, SimulationEnv } from '../domain/index.js';
import { deriveLocalDate } from '../simulation/systems/day-rollover.js';
import { createRng } from './rng.js';

export const PRODUCTION_CONTENT_VERSION = 'flowgrid:starter:v1';

export interface MakeEnvSettings {
  readonly localDayBoundary: string;
}

export function makeEnv(now: IsoDateTimeString, settings: MakeEnvSettings, seed: string): SimulationEnv {
  const localDate: LocalDateString = deriveLocalDate(now, settings.localDayBoundary);
  return {
    now,
    localDate,
    rng: createRng(seed),
    contentVersion: PRODUCTION_CONTENT_VERSION,
  };
}
