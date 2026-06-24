// Simulation dispatcher.
//
// `runSimulationCommand` dispatches each command variant to its handler. Exhaustive
// switching over the discriminated union guarantees that adding a new command type
// without a handler fails at compile time.

import type {
  FlowgridSnapshot,
  LogRejuvenationCommand,
  RunForgeCommand,
  InstallModuleCommand,
  StartRejuvenationCommand,
  CancelRejuvenationCommand,
  PurchaseActivationBoostCommand,
  SimulationCommand,
  SimulationEnv,
  SimulationResult,
} from '../domain/index.js';

import { completeFocusSession } from './commands/complete-focus-session.js';
import { setCoreAllocation } from './commands/set-core-allocation.js';
import { notImplementedResult } from './commands/not-implemented.js';
import { createCell } from './commands/create-cell.js';
import { editCell } from './commands/edit-cell.js';
import { archiveCell } from './commands/archive-cell.js';
import { unarchiveCell } from './commands/unarchive-cell.js';
import { startFocusSession } from './commands/start-focus-session.js';
import { cancelFocusSession } from './commands/cancel-focus-session.js';

export function runSimulationCommand(
  previousState: FlowgridSnapshot,
  command: SimulationCommand,
  env: SimulationEnv,
): SimulationResult {
  switch (command.type) {
    case 'complete_focus_session':
      return completeFocusSession(previousState, command, env);
    case 'set_core_allocation':
      return setCoreAllocation(previousState, command, env);
    case 'create_cell':
      return createCell(previousState, command, env);
    case 'edit_cell':
      return editCell(previousState, command, env);
    case 'archive_cell':
      return archiveCell(previousState, command, env);
    case 'unarchive_cell':
      return unarchiveCell(previousState, command, env);
    case 'start_focus_session':
      return startFocusSession(previousState, command, env);
    case 'cancel_focus_session':
      return cancelFocusSession(previousState, command, env);
    case 'log_rejuvenation':
      return logRejuvenationNotImplemented(previousState, command);
    case 'start_rejuvenation':
      return startRejuvenationNotImplemented(previousState, command);
    case 'cancel_rejuvenation':
      return cancelRejuvenationNotImplemented(previousState, command);
    case 'purchase_activation_boost':
      return purchaseActivationBoostNotImplemented(previousState, command);
    case 'run_forge':
      return runForgeNotImplemented(previousState, command);
    case 'install_module':
      return installModuleNotImplemented(previousState, command);
  }
}

function logRejuvenationNotImplemented(
  state: FlowgridSnapshot,
  command: LogRejuvenationCommand,
): SimulationResult {
  return notImplementedResult(
    state,
    command.operationId,
    command.type,
    'log_rejuvenation is not implemented until Phase 4 (Core Alternation and Rejuvenation Economy).',
  );
}

// Phase 4 stubs — Task 2 replaces each with its real handler. Kept here so the
// dispatcher's exhaustive switch compiles at the Task 1 type-layer boundary.
function startRejuvenationNotImplemented(
  state: FlowgridSnapshot,
  command: StartRejuvenationCommand,
): SimulationResult {
  return notImplementedResult(
    state,
    command.operationId,
    command.type,
    'start_rejuvenation is not implemented until Phase 4 (plan 04-01 Task 2).',
  );
}

function cancelRejuvenationNotImplemented(
  state: FlowgridSnapshot,
  command: CancelRejuvenationCommand,
): SimulationResult {
  return notImplementedResult(
    state,
    command.operationId,
    command.type,
    'cancel_rejuvenation is not implemented until Phase 4 (plan 04-01 Task 2).',
  );
}

function purchaseActivationBoostNotImplemented(
  state: FlowgridSnapshot,
  command: PurchaseActivationBoostCommand,
): SimulationResult {
  return notImplementedResult(
    state,
    command.operationId,
    command.type,
    'purchase_activation_boost is not implemented until Phase 4 (plan 04-01 Task 2).',
  );
}

function runForgeNotImplemented(
  state: FlowgridSnapshot,
  command: RunForgeCommand,
): SimulationResult {
  return notImplementedResult(
    state,
    command.operationId,
    command.type,
    'run_forge is not implemented until Phase 5 (Module Forge and Starter Customization).',
  );
}

function installModuleNotImplemented(
  state: FlowgridSnapshot,
  command: InstallModuleCommand,
): SimulationResult {
  return notImplementedResult(
    state,
    command.operationId,
    command.type,
    'install_module is not implemented until Phase 5 (Module Forge and Starter Customization).',
  );
}
