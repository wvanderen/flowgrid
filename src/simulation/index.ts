// Plan 01-01 placeholder barrel.
//
// Plan 01-03 replaces this file with re-exports from engine.ts, selectors.ts,
// deterministic-env.ts, economy-events.ts, visual-events.ts, operation-events.ts,
// and the commands/ and systems/ subdirectories.
//
// `runSimulationCommand` is a typed stub: it throws at runtime because the real
// dispatcher lands in Plan 01-03. The signature matches the foundation-loop test
// contract so the test compiles and fails only at runtime.

import type {
  SimulationCommand,
  SimulationEnv,
  SimulationResult,
  FlowgridSnapshot,
} from '../domain/index.js';

export function runSimulationCommand(
  _previousState: FlowgridSnapshot,
  _command: SimulationCommand,
  _env: SimulationEnv,
): SimulationResult {
  throw new Error(
    'Plan 01-01 stub: runSimulationCommand is implemented in Plan 01-03.',
  );
}
