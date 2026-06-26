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

// --- Phase 6 / D-04 visual event constructors (forge + module token) ---
//
// Transient by contract (UI-04): the renderer consumes them for animation, but
// dropping/reducing/replaying/skipping them never changes durable economy state.
// Mirror the economy-event peer shapes so a renderer has the same fields.

// Fires once per successful run_forge alongside the forgeCompleted economy event.
// entityType 'core' matches the economy-event peer; payload carries the new
// lifetime forgeCount so the renderer can scale feedback to progression.
export function forgeRollVisual(
  at: IsoDateTimeString,
  coreId: string,
  payload: { forgeId: string; paymentType: 'token' | 'energy'; paymentAmount: number; forgeCountAfter: number },
): VisualEvent {
  return make(
    { at, entityType: 'core', entityId: coreId, payload },
    VISUAL_EVENT_NAMES.forgeRollVisual,
  );
}

// Fires once per successful run_forge alongside the moduleUpgraded economy event.
// entityType 'module_instance' matches the economy-event peer convention.
export function moduleUpgradeVisual(
  at: IsoDateTimeString,
  moduleInstanceId: string,
  payload: { cellId: string; moduleKind: string; fromLevel: number; toLevel: number },
): VisualEvent {
  return make(
    { at, entityType: 'module_instance', entityId: moduleInstanceId, payload },
    VISUAL_EVENT_NAMES.moduleUpgradeVisual,
  );
}

// Fires inside the rejuvenation threshold-grant guard (only when tokensGranted > 0),
// exactly when the tokenGranted economy event does.
export function tokenGrantedVisual(
  at: IsoDateTimeString,
  coreId: string,
  payload: { tokensGranted: number; moduleTokensAfter: number },
): VisualEvent {
  return make(
    { at, entityType: 'core', entityId: coreId, payload },
    VISUAL_EVENT_NAMES.tokenGrantedVisual,
  );
}
