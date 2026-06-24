// Validation issue contracts.
//
// Validation produces structured issues, not thrown errors. Normal domain invalidity
// (unknown cell, non-positive duration, invalid allocation, etc.) returns issues with
// unchanged state. Programmer/config errors may still throw in tests.

import type { EntityType } from './ids.js';

export type ValidationIssueCode =
  | 'negative_resource'
  | 'invalid_reference'
  | 'duplicate_module_install'
  | 'invalid_route_allocation'
  | 'invalid_core_allocation_total'
  | 'token_regression'
  | 'forge_count_regression'
  // Phase 4 monotonic-counter guards (parallel to token_regression / forge_count_regression).
  | 'integration_regression'
  | 'activation_boost_regression'
  | 'invalid_operation_shape';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  readonly code: ValidationIssueCode;
  readonly severity: ValidationSeverity;
  readonly entityType?: EntityType;
  readonly entityId?: string;
  readonly path?: string;
  readonly message: string;
}
