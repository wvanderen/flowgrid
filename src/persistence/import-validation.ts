// All-or-nothing archive validator (D-12).
//
// Pre-flight validates the ENTIRE archive before any local write. Any issue (shape,
// reference, resource, allocation) rejects the whole import and the caller
// (`import.ts`) leaves local data byte-identical to its pre-import state. Reuses
// Phase 1's exact `ValidationIssue` contract — single source of truth for economy
// safety (no parallel error type invented at the import boundary).
//
// Pipeline (RESEARCH §5.3):
//   1. Zod safeParse (shape) — on failure, map each ZodIssue to a ValidationIssue
//      with code 'invalid_operation_shape' and the Zod issue path.
//   2. On success, assemble the parsed arrays into a FlowgridSnapshot (Maps for
//      cells/moduleInstances/routes; arrays for the append-only stores).
//   3. Reuse Phase 1 `validateFlowgridSnapshot` (references/resources/allocations/
//      operations). An archive that passes import validation is guaranteed to be in
//      the same safe economy state the simulation enforces after every command.
//
// This module performs NO writes. It imports `validateFlowgridSnapshot` from the
// domain layer — a pure runtime import of an invariant checker, NOT simulation-rule
// execution. No dexie, no `../simulation` import.

import type {
  CellId,
  CellRecord,
  FlowgridSnapshot,
  ModuleInstance,
  ModuleInstanceId,
  RouteId,
  RouteRecord,
  SyncOperation,
  ValidationIssue,
} from '../domain/index.js';
import { validateFlowgridSnapshot } from '../domain/index.js';

import { archiveSchema } from './validation-schemas.js';

function joinPath(path: readonly PropertyKey[]): string {
  return path
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : String(segment)))
    .join('.');
}

function mapZodIssues(
  zodIssues: readonly {
    readonly path: readonly PropertyKey[];
    readonly message: string;
  }[],
): ValidationIssue[] {
  return zodIssues.map((zodIssue) => {
    const path = joinPath(zodIssue.path);
    const base = {
      code: 'invalid_operation_shape' as const,
      severity: 'error' as const,
      entityType: 'operation' as const,
      entityId: 'archive',
      message: zodIssue.message,
    };
    return path.length > 0 ? { ...base, path } : base;
  });
}

export function validateArchive(input: unknown): readonly ValidationIssue[] {
  const parsed = archiveSchema.safeParse(input);
  if (!parsed.success) {
    return mapZodIssues(parsed.error.issues);
  }

  const archive = parsed.data;
  // `operations` carries `entityType: string` at the schema boundary (untrusted
  // input); the snapshot wants the narrower EntityType union. The schema guarantees
  // a non-empty string and Phase 1 `validateOperationShape` (called inside
  // validateFlowgridSnapshot) performs the semantic non-empty check, so this cast
  // is the honest bridge between the loose boundary type and the domain union.
  const operations = archive.operations as unknown as readonly SyncOperation[];
  const snapshot: FlowgridSnapshot = {
    client: archive.client,
    cells: new Map<CellId, CellRecord>(archive.cells.map((cell) => [cell.id, cell] as const)),
    core: archive.core,
    moduleInstances: new Map<ModuleInstanceId, ModuleInstance>(
      archive.moduleInstances.map((m) => [m.id, m] as const),
    ),
    routes: new Map<RouteId, RouteRecord>(archive.routes.map((r) => [r.id, r] as const)),
    sessions: archive.sessions,
    operations,
    settings: archive.settings,
    forgeHistory: archive.forgeHistory,
  };

  // Reuse Phase 1's composition root — the same validators the engine runs after
  // every applied command.
  return [...validateFlowgridSnapshot(snapshot)];
}
