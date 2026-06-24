// Operation event helper.
//
// Constructs a sync-ready SyncOperation from an applied command. Operation IDs come
// from the command (caller-supplied), never generated inside simulation, so replay
// reproduces the operation record exactly.

import type {
  EntityType,
  IsoDateTimeString,
  OperationStatus,
  SimulationCommand,
  SyncOperation,
} from '../domain/index.js';

const PAYLOAD_VERSION = 1;

function entityTypeForCommand(command: SimulationCommand): EntityType {
  switch (command.type) {
    case 'complete_focus_session':
      return 'session';
    case 'set_core_allocation':
      return 'core';
    case 'log_rejuvenation':
      return 'core';
    case 'start_rejuvenation':
      return 'core';
    case 'cancel_rejuvenation':
      return 'core';
    case 'purchase_activation_boost':
      return 'core';
    case 'run_forge':
      return 'forge_history';
    case 'install_module':
      return 'module_instance';
    case 'create_cell':
      return 'cell';
    case 'edit_cell':
      return 'cell';
    case 'archive_cell':
      return 'cell';
    case 'unarchive_cell':
      return 'cell';
    case 'start_focus_session':
      return 'cell';
    case 'cancel_focus_session':
      return 'cell';
  }
}

function entityIdForCommand(command: SimulationCommand, fallback: string): string {
  switch (command.type) {
    case 'complete_focus_session':
      return command.cellId;
    case 'set_core_allocation':
      return fallback;
    case 'log_rejuvenation':
      return fallback;
    case 'start_rejuvenation':
      return fallback;
    case 'cancel_rejuvenation':
      return fallback;
    case 'purchase_activation_boost':
      return fallback;
    case 'run_forge':
      return fallback;
    case 'install_module':
      return command.ownerCellId;
    case 'create_cell':
      return command.cellId;
    case 'edit_cell':
      return command.cellId;
    case 'archive_cell':
      return command.cellId;
    case 'unarchive_cell':
      return command.cellId;
    case 'start_focus_session':
      return command.cellId;
    case 'cancel_focus_session':
      return command.cellId;
  }
}

export function operationFromCommand(
  command: SimulationCommand,
  at: IsoDateTimeString,
  options: {
    readonly entityId?: string;
    readonly payload?: unknown;
    readonly status?: OperationStatus;
  } = {},
): SyncOperation {
  const entityId = options.entityId ?? entityIdForCommand(command, 'unknown');
  return {
    id: command.operationId,
    commandType: command.type,
    entityType: entityTypeForCommand(command),
    entityId,
    payloadVersion: PAYLOAD_VERSION,
    createdAt: at,
    updatedAt: at,
    status: options.status ?? 'applied',
    payload: options.payload ?? null,
  };
}
