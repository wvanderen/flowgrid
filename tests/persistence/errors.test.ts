// VER-03 P1: PersistenceError mapping for known DOMException.name values and the
// indexedDB-undefined case (RESEARCH §6.2).

import { beforeEach, expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

import { conflictError, mapDomException } from '../../src/persistence/index.js';

beforeEach(() => {
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = new IDBFactory();
});

test('QuotaExceededError maps to quota_exceeded and recoverable', () => {
  const r = mapDomException(new DOMException('quota', 'QuotaExceededError'));
  expect(r.kind).toBe('quota_exceeded');
  expect(r.recoverable).toBe(true);
});

test('SecurityError maps to persistence_denied and recoverable', () => {
  const r = mapDomException(new DOMException('sec', 'SecurityError'));
  expect(r.kind).toBe('persistence_denied');
  expect(r.recoverable).toBe(true);
});

test('InvalidStateError maps to blocked_upgrade and recoverable', () => {
  const r = mapDomException(new DOMException('blocked', 'InvalidStateError'));
  expect(r.kind).toBe('blocked_upgrade');
  expect(r.recoverable).toBe(true);
});

test('UnknownError, DataError, OperationError map to write_failure', () => {
  for (const name of ['UnknownError', 'DataError', 'OperationError'] as const) {
    const r = mapDomException(new DOMException(name, name));
    expect(r.kind).toBe('write_failure');
    expect(r.recoverable).toBe(true);
  }
});

test('generic Error maps to unknown and non-recoverable', () => {
  const r = mapDomException(new Error('boom'));
  expect(r.kind).toBe('unknown');
  expect(r.recoverable).toBe(false);
});

test('indexedDB undefined maps to indexeddb_unavailable and non-recoverable', () => {
  const holder = globalThis as unknown as { indexedDB?: unknown };
  const original = holder.indexedDB;
  holder.indexedDB = undefined;
  try {
    const r = mapDomException(new Error('anything'));
    expect(r.kind).toBe('indexeddb_unavailable');
    expect(r.recoverable).toBe(false);
  } finally {
    holder.indexedDB = original;
  }
});

test('conflictError builds a non-recoverable PersistenceError with the given kind', () => {
  const sessionConflict = conflictError('session_conflict', 'mismatch', undefined);
  expect(sessionConflict.kind).toBe('session_conflict');
  expect(sessionConflict.recoverable).toBe(false);

  const operationConflict = conflictError('operation_conflict', 'mismatch', undefined);
  expect(operationConflict.kind).toBe('operation_conflict');
});
