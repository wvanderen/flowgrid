// nextCoreAction — pure next-action selector for the Core surface (CORE-05).
//
// Mirrors src/ui/session-summary/nextAction.ts: a pure value-in/value-out function
// returning a deterministic "next useful action" string for the Core given its
// current economy state and whether a focus session is active. This is NOT an AI
// suggestion — it is pure and unit-testable without React, and exactly replayable.
//
// Priority cascade (mirrors the activity/rest alternation loop):
//   1. A focus session is active      → finish focus to route Current to the Core
//   2. No Core Charge                 → start a focus session to build Charge
//   3. Has Core Charge                → process it with rejuvenation

import type { CoreRecord } from '../../domain/index.js';

export function nextCoreAction(core: CoreRecord, hasActiveFocus: boolean): string {
  if (hasActiveFocus) {
    return 'Finish your focus session to route Current to the Core';
  }
  if (core.coreCharge === 0) {
    return 'Start a focus session to build Core Charge';
  }
  return 'Process Core Charge with rejuvenation';
}
