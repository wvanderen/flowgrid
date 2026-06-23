// VER-03 import tier: all-or-nothing archive validation (D-12).
//
// Covers every D-12 rejection mode plus the all-clear case. Builds a valid archive
// via exportJson after applying a known focus-session result, then mutates copies
// and asserts each rejection surfaces the expected ValidationIssueCode. Crucially,
// validateArchive performs NO writes: the last test snapshots the DB before and
// after the call and asserts byte-identical local state.

import { beforeEach, expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

import type {
  CompleteFocusSessionCommand,
  FlowgridSnapshot,
  SimulationResult,
} from '../../src/domain/index.js';
import { createStarterFlowgridState } from '../../src/content/index.js';
import { runSimulationCommand } from '../../src/simulation/index.js';
import {
  FlowgridDatabase,
  FlowgridRepository,
  exportJson,
  validateArchive,
} from '../../src/persistence/index.js';
import type { JsonArchive } from '../../src/persistence/index.js';
import { createTestIds, createTestSimulationEnv } from '../helpers/fixtures.js';

const NOW = '2026-01-01T10:00:00.000Z';
const ENDED_AT = '2026-01-01T10:25:00.000Z';
const LOCAL_DATE = '2026-01-01';

beforeEach(() => {
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = new IDBFactory();
});

// The DB auto-seeds singletons on first open, so previousState must attach a
// starter cell/modules/routes to the SEEDED singletons (matching ids). Mirrors the
// repository.test.ts / export-json.test.ts pattern.
function attachStarterCellToSeeded(seeded: FlowgridSnapshot, prefix: string): FlowgridSnapshot {
  const ids = createTestIds(prefix);
  const starter = createStarterFlowgridState({
    now: NOW,
    localDate: LOCAL_DATE,
    clientId: seeded.client.id,
    cellId: ids.cellId,
    coreId: seeded.core.id,
    generatorModuleInstanceId: ids.generatorModuleInstanceId,
    chargeCoreModuleInstanceId: ids.chargeCoreModuleInstanceId,
    outputModuleInstanceId: ids.outputModuleInstanceId,
    bloomModuleInstanceId: ids.bloomModuleInstanceId,
    outputRouteId: ids.outputRouteId,
    settingsId: seeded.settings.id,
    forgeHistoryId: ids.forgeHistoryId,
  });
  return { ...starter, client: seeded.client, core: seeded.core, settings: seeded.settings };
}

async function writeStarterCellModulesRoutes(db: FlowgridDatabase, state: FlowgridSnapshot): Promise<void> {
  for (const cell of state.cells.values()) await db.cells.put(cell);
  for (const moduleInstance of state.moduleInstances.values()) await db.moduleInstances.put(moduleInstance);
  for (const route of state.routes.values()) await db.routes.put(route);
}

// Opens a DB, seeds, attaches the starter cell, applies one focus session, and
// returns the exported archive (archiveVersion 1, every collection populated).
async function buildValidArchive(prefix: string): Promise<JsonArchive> {
  const db = new FlowgridDatabase(`import-valid-${prefix}`);
  const repo = new FlowgridRepository(db);
  await repo.open();

  const seeded = await repo.loadSnapshot();
  const previousState = attachStarterCellToSeeded(seeded, prefix);
  await writeStarterCellModulesRoutes(db, previousState);

  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: `${prefix}:op:focus-1`,
    cellId: previousState.cells.keys().next().value as string,
    startedAt: NOW,
    endedAt: ENDED_AT,
    durationSeconds: 1500,
  };
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: prefix });
  const result = runSimulationCommand(previousState, command, env) as SimulationResult;
  expect(result.status, 'fixture focus command must apply').toBe('applied');

  const applied = await repo.applyResult(result);
  expect(applied.ok, 'applyResult must succeed').toBe(true);

  const archive = await exportJson(db);
  repo.close();
  return archive;
}

function expectCode(issues: readonly { readonly code: string }[], code: string): void {
  expect(
    issues.some((i) => i.code === code),
    `expected an issue with code ${code}, got ${JSON.stringify(issues.map((i) => i.code))}`,
  ).toBe(true);
}

test('validateArchive on a valid archive returns zero issues', async () => {
  const archive = await buildValidArchive('valid');
  expect(validateArchive(archive)).toHaveLength(0);
});

test('validateArchive rejects a malformed archiveVersion with invalid_operation_shape', async () => {
  const archive = await buildValidArchive('shape');
  const malformed = { ...archive, archiveVersion: 99 };
  const issues = validateArchive(malformed);
  expectCode(issues, 'invalid_operation_shape');
});

test('validateArchive rejects a missing required field with invalid_operation_shape', async () => {
  const archive = await buildValidArchive('missing');
  // Strip a required field by rebuilding the client as a mutable record without it.
  const { createdAt: _omit, ...clientWithoutCreatedAt } = archive.client;
  void _omit;
  const malformed = { ...archive, client: clientWithoutCreatedAt };
  const issues = validateArchive(malformed);
  expectCode(issues, 'invalid_operation_shape');
});

test('validateArchive rejects a negative cell resource (caught by the Zod nonnegative gate as invalid_operation_shape)', async () => {
  const archive = await buildValidArchive('negative');
  const mutatedCell = { ...archive.cells[0]!, xp: -1 };
  const malformed = { ...archive, cells: [mutatedCell] };
  const issues = validateArchive(malformed);
  // The schema's z.number().int().nonnegative() catches the negative at the shape
  // boundary before Phase 1's validateNoNegativeResources runs, so the code is
  // invalid_operation_shape. The negative_resource code is defense-in-depth: it
  // would fire only if the schema ever loosened its nonnegative constraint. The
  // rejection outcome is what matters (local data stays untouched).
  expect(issues.length).toBeGreaterThan(0);
  expectCode(issues, 'invalid_operation_shape');
});

test('validateArchive rejects a session with a broken cellId reference with invalid_reference', async () => {
  const archive = await buildValidArchive('broken-ref');
  const mutatedSession = { ...archive.sessions[0]!, cellId: 'broken-ref:no-such-cell' };
  const malformed = { ...archive, sessions: [mutatedSession] };
  const issues = validateArchive(malformed);
  expectCode(issues, 'invalid_reference');
});

test('validateArchive rejects route allocations summing over 100 from a shared sourceCell with invalid_route_allocation', async () => {
  const archive = await buildValidArchive('route-sum');
  const originalRoute = archive.routes[0]!;
  // Original output route has allocationPercent 100. Add a second route from the
  // SAME sourceCellId with allocationPercent 50 -> sum 150 > 100. Each individual
  // route is in [0,100], so only the per-sourceCell sum check fires.
  const extraRoute = {
    ...originalRoute,
    id: `${originalRoute.id}:extra`,
    allocationPercent: 50,
  };
  const malformed = { ...archive, routes: [originalRoute, extraRoute] };
  const issues = validateArchive(malformed);
  expectCode(issues, 'invalid_route_allocation');
});

test('validateArchive rejects a core allocation that does not total 100 with invalid_core_allocation_total', async () => {
  const archive = await buildValidArchive('core-alloc');
  const mutatedCore = { ...archive.core, convertAllocationPercent: 60, storeAllocationPercent: 50 };
  const malformed = { ...archive, core: mutatedCore };
  const issues = validateArchive(malformed);
  expectCode(issues, 'invalid_core_allocation_total');
});

test('validateArchive performs no writes: the DB is byte-identical before and after', async () => {
  const db = new FlowgridDatabase('import-no-write');
  const repo = new FlowgridRepository(db);
  await repo.open();

  const seeded = await repo.loadSnapshot();
  const previousState = attachStarterCellToSeeded(seeded, 'no-write');
  await writeStarterCellModulesRoutes(db, previousState);
  const command: CompleteFocusSessionCommand = {
    type: 'complete_focus_session',
    operationId: 'no-write:op:focus-1',
    cellId: previousState.cells.keys().next().value as string,
    startedAt: NOW,
    endedAt: ENDED_AT,
    durationSeconds: 1500,
  };
  const env = createTestSimulationEnv({ now: NOW, localDate: LOCAL_DATE, seed: 'no-write' });
  const result = runSimulationCommand(previousState, command, env) as SimulationResult;
  await repo.applyResult(result);

  const before = await repo.loadSnapshot();

  const archive = await exportJson(db);
  validateArchive({ ...archive, archiveVersion: 99 });
  validateArchive({
    ...archive,
    core: { ...archive.core, convertAllocationPercent: 1, storeAllocationPercent: 1 },
  });
  validateArchive(archive);

  const after = await repo.loadSnapshot();
  repo.close();

  expect(after).toEqual(before);
});
