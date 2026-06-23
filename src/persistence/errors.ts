// Typed storage-error contract for the persistence layer (DATA-07 surface).
//
// Phase 2 ships the typed contract only; Phase 3 UI subscribes to and renders
// these errors. The repository and import path surface PersistenceError values
// via ApplyResult / ImportResult rather than throwing for normal invalidity
// (mirrors Phase 1's typed-results discipline).
//
// `mapDomException` maps known DOMException names plus the missing-indexedDB
// case to the correct kind/recoverable classification (RESEARCH §6.2).

export type PersistenceErrorKind =
  | 'quota_exceeded'
  | 'persistence_denied'
  | 'blocked_upgrade'
  | 'write_failure'
  | 'session_conflict'
  | 'operation_conflict'
  | 'indexeddb_unavailable'
  | 'unknown';

export interface PersistenceError {
  readonly kind: PersistenceErrorKind;
  readonly message: string;
  readonly recoverable: boolean;
  readonly cause?: unknown;
}

function isObjectWith<T>(value: unknown, key: keyof T): value is T {
  return typeof value === 'object' && value !== null && key in value;
}

function domExceptionName(e: unknown): string | null {
  if (isObjectWith<{ name: unknown }>(e, 'name')) {
    const name = e.name;
    if (typeof name === 'string') return name;
  }
  return null;
}

function error(e: unknown, fallbackMessage: string): PersistenceError {
  if (e instanceof Error) {
    return { kind: 'unknown', message: e.message, recoverable: false, cause: e };
  }
  return { kind: 'unknown', message: fallbackMessage, recoverable: false, cause: e };
}

// `lib` is ES2022-only (no DOM), so indexedDB is not on the globalThis type.
// Probe via a typed cast; the binding exists at runtime in browsers and is
// installed by fake-indexeddb in tests. The boundary scanner deliberately does
// NOT forbid `indexedDB` here.
function readGlobalIndexedDB(): unknown {
  return (globalThis as unknown as { indexedDB?: unknown }).indexedDB;
}

export function mapDomException(e: unknown): PersistenceError {
  if (typeof readGlobalIndexedDB() === 'undefined') {
    return {
      kind: 'indexeddb_unavailable',
      message: 'IndexedDB is not available in this environment.',
      recoverable: false,
      cause: e,
    };
  }

  const name = domExceptionName(e);
  switch (name) {
    case 'QuotaExceededError':
      return {
        kind: 'quota_exceeded',
        message: 'Storage quota exceeded. Free up space or export and reset local data.',
        recoverable: true,
        cause: e,
      };
    case 'SecurityError':
      return {
        kind: 'persistence_denied',
        message: 'Browser storage policy blocked IndexedDB access.',
        recoverable: true,
        cause: e,
      };
    case 'InvalidStateError':
      return {
        kind: 'blocked_upgrade',
        message: 'IndexedDB upgrade is blocked, likely by another open tab.',
        recoverable: true,
        cause: e,
      };
    case 'UnknownError':
    case 'DataError':
    case 'OperationError':
      return {
        kind: 'write_failure',
        message: 'An IndexedDB write failed.',
        recoverable: true,
        cause: e,
      };
    case null:
      return error(e, 'An unknown persistence failure occurred.');
    default:
      return error(e, 'An unknown persistence failure occurred.');
  }
}

export function conflictError(
  kind: 'session_conflict' | 'operation_conflict',
  message: string,
  cause?: unknown,
): PersistenceError {
  return { kind, message, recoverable: false, cause };
}
