// Simulation dispatcher.
//
// `runSimulationCommand` dispatches each command variant to its handler. Exhaustive
// switching over the discriminated union guarantees that adding a new command type
// without a handler fails at compile time.

import type {
  FlowgridSnapshot,
  InstallModuleCommand,
  SimulationCommand,
  SimulationEnv,
  SimulationResult,
} from '../domain/index.js';

import { completeFocusSession } from './commands/complete-focus-session.js';
import { setCoreAllocation } from './commands/set-core-allocation.js';
import { updateSettings } from './commands/update-settings.js';
import { notImplementedResult } from './commands/not-implemented.js';
import { createCell } from './commands/create-cell.js';
import { editCell } from './commands/edit-cell.js';
import { archiveCell } from './commands/archive-cell.js';
import { unarchiveCell } from './commands/unarchive-cell.js';
import { startFocusSession } from './commands/start-focus-session.js';
import { cancelFocusSession } from './commands/cancel-focus-session.js';
import { logRejuvenation } from './commands/log-rejuvenation.js';
import { startRejuvenation } from './commands/start-rejuvenation.js';
import { cancelRejuvenation } from './commands/cancel-rejuvenation.js';
import { purchaseActivationBoost } from './commands/purchase-activation-boost.js';
import { runForge } from './commands/run-forge.js';

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
    case 'update_settings':
      return updateSettings(previousState, command, env);
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
      return logRejuvenation(previousState, command, env);
    case 'start_rejuvenation':
      return startRejuvenation(previousState, command, env);
    case 'cancel_rejuvenation':
      return cancelRejuvenation(previousState, command, env);
    case 'purchase_activation_boost':
      return purchaseActivationBoost(previousState, command, env);
    case 'run_forge':
      return runForge(previousState, command, env);
    case 'install_module':
      return installModuleNotImplemented(previousState, command);
  }
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
