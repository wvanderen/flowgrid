// Phase 1 "not implemented" command handlers.
//
// rejuvenation, forge, and install_module have stable command/result/event types
// from Plan 01-02 but their executable handlers are deferred to later phases. These
// helpers return a typed not_implemented SimulationResult with unchanged state so
// downstream UI, renderer, persistence, and sync phases can consume a stable shape
// without coupling to a future implementation.

import type { SimulationResult } from '../../domain/index.js';

export function notImplementedResult(
  previousState: SimulationResult['previousState'],
  operationId: string,
  commandType: string,
  message: string,
): SimulationResult {
  return {
    status: 'not_implemented',
    previousState,
    nextState: previousState,
    economyEvents: [],
    visualEvents: [],
    operations: [],
    validationIssues: [
      {
        code: 'invalid_operation_shape',
        severity: 'warning',
        entityType: 'operation',
        entityId: operationId,
        message,
        path: `command.${commandType}`,
      },
    ],
  };
}
