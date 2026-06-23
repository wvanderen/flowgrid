// Sync-ready operation records.
//
// Every applied command emits exactly one SyncOperation with a stable ID supplied by
// the command (never generated inside simulation). Operations are append-only
// mutation records that a future sync layer can move across devices.

import type { IsoDateTimeString } from './time.js';
import type { EntityType, OperationId } from './ids.js';

export type OperationStatus = 'pending' | 'applied' | 'failed';

export interface SyncOperation {
  readonly id: OperationId;
  readonly commandType: string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly payloadVersion: number;
  readonly createdAt: IsoDateTimeString;
  readonly updatedAt: IsoDateTimeString;
  readonly status: OperationStatus;
  readonly payload: unknown;
}
