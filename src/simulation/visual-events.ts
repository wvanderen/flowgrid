// Visual event constructors.
//
// Visual events are transient presentation hints derived from economy events. The
// renderer consumes them; dropping, reducing, or replaying them must never change
// durable economy state.

import type { IsoDateTimeString, VisualEvent } from '../domain/index.js';
import { VISUAL_EVENT_NAMES } from '../domain/index.js';

export { VISUAL_EVENT_NAMES } from '../domain/index.js';

type VisualEventParams = {
  readonly at: IsoDateTimeString;
  readonly entityType: VisualEvent['entityType'];
  readonly entityId: string;
  readonly payload: unknown;
};

function make(params: VisualEventParams, type: string): VisualEvent {
  return {
    type,
    entityType: params.entityType,
    entityId: params.entityId,
    payload: params.payload,
    at: params.at,
  };
}

export function focusSessionStartedVisual(
  at: IsoDateTimeString,
  cellId: string,
): VisualEvent {
  return make(
    { at, entityType: 'cell', entityId: cellId, payload: {} },
    VISUAL_EVENT_NAMES.focusSessionStartedVisual,
  );
}

export function currentFlowVisual(
  at: IsoDateTimeString,
  routeId: string,
  amount: number,
): VisualEvent {
  return make(
    { at, entityType: 'route', entityId: routeId, payload: { amount } },
    VISUAL_EVENT_NAMES.currentFlowVisual,
  );
}

export function bloomBurstVisual(at: IsoDateTimeString, cellId: string): VisualEvent {
  return make(
    { at, entityType: 'cell', entityId: cellId, payload: {} },
    VISUAL_EVENT_NAMES.bloomBurstVisual,
  );
}

export function cellActivationVisual(at: IsoDateTimeString, cellId: string): VisualEvent {
  return make(
    { at, entityType: 'cell', entityId: cellId, payload: {} },
    VISUAL_EVENT_NAMES.cellActivationVisual,
  );
}

export function coreConvertVisual(at: IsoDateTimeString, coreId: string, amount: number): VisualEvent {
  return make(
    { at, entityType: 'core', entityId: coreId, payload: { amount } },
    VISUAL_EVENT_NAMES.coreConvertVisual,
  );
}

export function coreChargeStoreVisual(at: IsoDateTimeString, coreId: string, amount: number): VisualEvent {
  return make(
    { at, entityType: 'core', entityId: coreId, payload: { amount } },
    VISUAL_EVENT_NAMES.coreChargeStoreVisual,
  );
}
