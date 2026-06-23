// Invariant validators.
//
// Plan 01-02 Task 1 introduces the signatures only. Plan 01-03 Task 2 implements the
// bodies and wires them into the engine's post-command validation step. The stubs
// here return empty arrays so the domain surface compiles and imports cleanly; they
// MUST NOT be relied on to detect invalidity until Plan 01-03 replaces them.

import type { FlowgridSnapshot } from './records.js';
import type { SyncOperation } from './operation-records.js';
import type { ValidationIssue } from './validation.js';

export const validateNoNegativeResources = (_snapshot: FlowgridSnapshot): readonly ValidationIssue[] => [];

export const validateReferences = (_snapshot: FlowgridSnapshot): readonly ValidationIssue[] => [];

export const validateNoDuplicateInstalls = (_snapshot: FlowgridSnapshot): readonly ValidationIssue[] => [];

export const validateRouteAllocations = (_snapshot: FlowgridSnapshot): readonly ValidationIssue[] => [];

export const validateCoreAllocation = (_snapshot: FlowgridSnapshot): readonly ValidationIssue[] => [];

export const validateMonotonicCounters = (
  _previous: FlowgridSnapshot,
  _next: FlowgridSnapshot,
): readonly ValidationIssue[] => [];

export const validateOperationShape = (
  _operations: readonly SyncOperation[],
): readonly ValidationIssue[] => [];

export const validateFlowgridSnapshot = (
  _snapshot: FlowgridSnapshot,
): readonly ValidationIssue[] => [];
