// First-run seeding for the Flowgrid database (D-06 + Agent's Discretion).
//
// Called from FlowgridDatabase.on('populate', tx => seedStarterState(tx)). Populates
// ONLY the three singletons (client, core, settings); cells/moduleInstances/routes/
// sessions/operations/forgeHistory start empty and are filled by future user actions.
//
// This runs inside Dexie's populate transaction. It MUST use the provided `tx`
// (never the db instance) and stay synchronous (constants only) — the upgrade
// transaction auto-commits if unused (RESEARCH §1.6).
//
// `now` is generated here via `new Date().toISOString()`. This is the ONE place
// persistence creates timestamps (the layer rule forbids ambient time in
// simulation, not persistence — RESEARCH §1.6); all other timestamps come from
// SimulationResult records.

import type { Transaction } from 'dexie';

import type {
  ClientRecord,
  CoreRecord,
  SettingsRecord,
} from '../domain/index.js';

import {
  DEFAULT_CONVERT_ALLOCATION_PERCENT,
  DEFAULT_DAILY_TARGET_SECONDS,
  DEFAULT_LOCAL_DAY_BOUNDARY,
  DEFAULT_SESSION_LENGTH_SECONDS,
  DEFAULT_STORE_ALLOCATION_PERCENT,
  STARTER_CONTENT_VERSION,
} from '../content/index.js';

import { generateClientId } from './ids.js';

export function seedStarterState(tx: Transaction): void {
  const now = new Date().toISOString();

  const client: ClientRecord = {
    id: generateClientId(),
    contentVersion: STARTER_CONTENT_VERSION,
    createdAt: now,
    updatedAt: now,
  };

  const core: CoreRecord = {
    id: 'flowgrid:core',
    energy: 0,
    coreCharge: 0,
    lifetimeEnergy: 0,
    integration: 0,
    moduleTokens: 0,
    convertAllocationPercent: DEFAULT_CONVERT_ALLOCATION_PERCENT,
    storeAllocationPercent: DEFAULT_STORE_ALLOCATION_PERCENT,
    forgeCount: 0,
    // Phase 4 defaults (Pitfall 6 backward-compat — matches starter-state.ts).
    activationBoostLevel: 0,
    activeRejuvenationStartedAt: null,
    updatedAt: now,
  };

  const settings: SettingsRecord = {
    id: 'flowgrid:settings',
    defaultSessionLengthSeconds: DEFAULT_SESSION_LENGTH_SECONDS,
    dailyTargetSeconds: DEFAULT_DAILY_TARGET_SECONDS,
    localDayBoundary: DEFAULT_LOCAL_DAY_BOUNDARY,
    updatedAt: now,
  };

  tx.table('client').put(client);
  tx.table('core').put(core);
  tx.table('settings').put(settings);
}
