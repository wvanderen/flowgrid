// src/simulation public barrel.
//
// Re-exports env, event, operation, and engine contracts. `runSimulationCommand`
// remains a Plan 01-01 stub: Plan 01-03 implements the dispatcher in
// `src/simulation/engine.ts` and replaces this re-export.

import type {
  FlowgridSnapshot,
  SimulationCommand,
  SimulationEnv,
  SimulationResult,
} from '../domain/index.js';

export type {
  CompleteFocusSessionCommand,
  EconomyEvent,
  InstallModuleCommand,
  LogRejuvenationCommand,
  Rng,
  RunForgeCommand,
  SetCoreAllocationCommand,
  SimulationCommand,
  SimulationEnv,
  SimulationResult,
  SimulationStatus,
  VisualEvent,
} from '../domain/index.js';

export * from './deterministic-env.js';
export * from './economy-events.js';
export * from './visual-events.js';
export * from './operation-events.js';

export function runSimulationCommand(
  _previousState: FlowgridSnapshot,
  _command: SimulationCommand,
  _env: SimulationEnv,
): SimulationResult {
  throw new Error(
    'Plan 01-02 stub: runSimulationCommand is implemented in Plan 01-03.',
  );
}
