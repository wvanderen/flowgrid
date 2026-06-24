// Economy event constructors.
//
// Economy events are durable meaning: they describe what the simulation produced.
// Visual events describe how to animate it. The split keeps renderer drops from
// changing economy truth.

import type { EconomyEvent, IsoDateTimeString } from '../domain/index.js';
import { ECONOMY_EVENT_NAMES } from '../domain/index.js';

export { ECONOMY_EVENT_NAMES } from '../domain/index.js';

type EconomyEventParams = {
  readonly at: IsoDateTimeString;
  readonly entityType: EconomyEvent['entityType'];
  readonly entityId: string;
  readonly payload: unknown;
};

function make(params: EconomyEventParams, type: string): EconomyEvent {
  return {
    type,
    entityType: params.entityType,
    entityId: params.entityId,
    payload: params.payload,
    at: params.at,
  };
}

export function focusSessionCompletedEvent(
  at: IsoDateTimeString,
  sessionId: string,
  cellId: string,
  durationSeconds: number,
): EconomyEvent {
  return make(
    { at, entityType: 'session', entityId: sessionId, payload: { cellId, durationSeconds, sessionId } },
    ECONOMY_EVENT_NAMES.focusSessionCompleted,
  );
}

export function currentGeneratedEvent(
  at: IsoDateTimeString,
  cellId: string,
  amount: number,
): EconomyEvent {
  return make(
    { at, entityType: 'cell', entityId: cellId, payload: { amount } },
    ECONOMY_EVENT_NAMES.currentGenerated,
  );
}

export function cellXpGainedEvent(
  at: IsoDateTimeString,
  cellId: string,
  amount: number,
): EconomyEvent {
  return make(
    { at, entityType: 'cell', entityId: cellId, payload: { amount } },
    ECONOMY_EVENT_NAMES.cellXpGained,
  );
}

export function bloomFiredEvent(
  at: IsoDateTimeString,
  cellId: string,
  localDate: string,
): EconomyEvent {
  return make(
    { at, entityType: 'cell', entityId: cellId, payload: { localDate } },
    ECONOMY_EVENT_NAMES.bloomFired,
  );
}

export function cellActivatedEvent(
  at: IsoDateTimeString,
  cellId: string,
  activation: number,
): EconomyEvent {
  return make(
    { at, entityType: 'cell', entityId: cellId, payload: { activation } },
    ECONOMY_EVENT_NAMES.cellActivated,
  );
}

export function currentRoutedToCoreEvent(
  at: IsoDateTimeString,
  routeId: string,
  cellId: string,
  coreId: string,
  amount: number,
): EconomyEvent {
  return make(
    { at, entityType: 'route', entityId: routeId, payload: { cellId, coreId, amount } },
    ECONOMY_EVENT_NAMES.currentRoutedToCore,
  );
}

export function coreCurrentConvertedEvent(
  at: IsoDateTimeString,
  coreId: string,
  inputCurrent: number,
  energyGained: number,
): EconomyEvent {
  return make(
    { at, entityType: 'core', entityId: coreId, payload: { inputCurrent, energyGained } },
    ECONOMY_EVENT_NAMES.coreCurrentConverted,
  );
}

export function coreChargeStoredEvent(
  at: IsoDateTimeString,
  coreId: string,
  inputCurrent: number,
  chargeStored: number,
): EconomyEvent {
  return make(
    { at, entityType: 'core', entityId: coreId, payload: { inputCurrent, chargeStored } },
    ECONOMY_EVENT_NAMES.coreChargeStored,
  );
}

export function stateValidatedEvent(
  at: IsoDateTimeString,
  snapshotId: string,
  issueCount: number,
): EconomyEvent {
  return make(
    { at, entityType: 'client', entityId: snapshotId, payload: { issueCount } },
    ECONOMY_EVENT_NAMES.stateValidated,
  );
}

// --- Phase 4 economy event constructors ---

export function rejuvenationCompletedEvent(
  at: IsoDateTimeString,
  coreId: string,
  rejuvenationId: string,
  chargeConsumed: number,
  integrationGained: number,
): EconomyEvent {
  return make(
    { at, entityType: 'core', entityId: coreId, payload: { rejuvenationId, chargeConsumed, integrationGained } },
    ECONOMY_EVENT_NAMES.rejuvenationCompleted,
  );
}

export function tokenGrantedEvent(
  at: IsoDateTimeString,
  coreId: string,
  tokensGranted: number,
  moduleTokensAfter: number,
): EconomyEvent {
  return make(
    { at, entityType: 'core', entityId: coreId, payload: { tokensGranted, moduleTokensAfter } },
    ECONOMY_EVENT_NAMES.tokenGranted,
  );
}

export function activationBoostPurchasedEvent(
  at: IsoDateTimeString,
  coreId: string,
  energyCost: number,
  newLevel: number,
): EconomyEvent {
  return make(
    { at, entityType: 'core', entityId: coreId, payload: { energyCost, newLevel } },
    ECONOMY_EVENT_NAMES.activationBoostPurchased,
  );
}
