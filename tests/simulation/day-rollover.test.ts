// Phase 3 day-rollover system tests (D-13, D-14, D-16).
//
// Asserts the two pure exports from src/simulation/systems/day-rollover.ts:
//   - deriveLocalDate(now, localDayBoundary) — D-16 boundary-shifted date
//   - reconcileDayRollover(snapshot, env) — D-13 stale-state reset + D-14 Momentum decay
//
// Critical invariant (Pitfall 7): cell.activation is a monotonic lifetime counter;
// reconcileDayRollover MUST NOT reset it even when the cell is stale.

import { test, expect } from 'vitest';

import type { CellRecord, FlowgridSnapshot } from '../../src/domain/index.js';
import {
  deriveLocalDate,
  reconcileDayRollover,
} from '../../src/simulation/systems/day-rollover.js';

import { buildStarterSnapshot } from '../helpers/fixtures.js';
import { expectValidState } from '../helpers/expect-valid-state.js';

const NOW = '2026-01-15T03:00:00.000Z';
const LOCAL_DATE = '2026-01-15';

// Helper: clone a starter snapshot and replace its single Cell with an override.
function snapshotWithCell(
  state: FlowgridSnapshot,
  overrides: Partial<CellRecord>,
): FlowgridSnapshot {
  const original = state.cells.values().next().value as CellRecord;
  const updated: CellRecord = { ...original, ...overrides };
  const cells = new Map(state.cells);
  cells.set(original.id, updated);
  return { ...state, cells };
}

test('deriveLocalDate: midnight boundary returns the calendar date of `now`', () => {
  // now is 2026-01-15T03:00 UTC; boundary 00:00 → effective local date 2026-01-15.
  expect(deriveLocalDate('2026-01-15T03:00:00.000Z', '00:00')).toBe('2026-01-15');
});

test('deriveLocalDate: non-midnight boundary shifts the effective local date back one day', () => {
  // now is 2026-01-15T03:00 UTC; boundary 04:00 → subtract 4h → 2026-01-14T23:00 UTC → 2026-01-14.
  expect(deriveLocalDate('2026-01-15T03:00:00.000Z', '04:00')).toBe('2026-01-14');
});

test('deriveLocalDate: boundary at 00:30 shifts by half an hour but keeps the date when now is late enough', () => {
  // now is 2026-01-15T12:00 UTC; boundary 00:30 → subtract 30min → still 2026-01-15.
  expect(deriveLocalDate('2026-01-15T12:00:00.000Z', '00:30')).toBe('2026-01-15');
});

test('reconcileDayRollover: resets dailyMilestoneProgressSeconds to 0 when lastBloomLocalDate differs from env.localDate', () => {
  const { state } = buildStarterSnapshot('rollover-stale');
  const stale = snapshotWithCell(state, {
    dailyMilestoneProgressSeconds: 900,
    lastBloomLocalDate: '2026-01-10',
    momentum: 3,
    activation: 5,
  });

  const reconciled = reconcileDayRollover(stale, { now: NOW, localDate: LOCAL_DATE });
  const cell = reconciled.cells.values().next().value as CellRecord;

  expect(cell.dailyMilestoneProgressSeconds).toBe(0);
});

test('reconcileDayRollover: does NOT reset cell.activation (monotonic lifetime counter — Pitfall 7)', () => {
  const { state } = buildStarterSnapshot('rollover-activation');
  const stale = snapshotWithCell(state, {
    dailyMilestoneProgressSeconds: 900,
    lastBloomLocalDate: '2026-01-10',
    momentum: 3,
    activation: 5,
  });

  const reconciled = reconcileDayRollover(stale, { now: NOW, localDate: LOCAL_DATE });
  const cell = reconciled.cells.values().next().value as CellRecord;

  expect(cell.activation, 'activation counter must be preserved').toBe(5);
});

test('reconcileDayRollover: applies Momentum -1 when the prior bloom-day had no completed session', () => {
  const { ids, state } = buildStarterSnapshot('rollover-momentum-decay');
  // No session in snapshot.sessions whose startedAt slice matches lastBloomLocalDate.
  const stale = snapshotWithCell(state, {
    dailyMilestoneProgressSeconds: 1500,
    lastBloomLocalDate: '2026-01-10',
    momentum: 4,
    activation: 2,
  });

  const reconciled = reconcileDayRollover(stale, { now: NOW, localDate: LOCAL_DATE });
  const cell = reconciled.cells.values().next().value as CellRecord;

  expect(cell.momentum).toBe(3);
  void ids;
});

test('reconcileDayRollover: Momentum floors at 0 (never goes negative)', () => {
  const { state } = buildStarterSnapshot('rollover-momentum-floor');
  const stale = snapshotWithCell(state, {
    dailyMilestoneProgressSeconds: 1500,
    lastBloomLocalDate: '2026-01-10',
    momentum: 0,
    activation: 1,
  });

  const reconciled = reconcileDayRollover(stale, { now: NOW, localDate: LOCAL_DATE });
  const cell = reconciled.cells.values().next().value as CellRecord;

  expect(cell.momentum).toBe(0);
});

test('reconcileDayRollover: preserves Momentum when a session was completed on the prior bloom-day', () => {
  const { ids, state } = buildStarterSnapshot('rollover-momentum-preserved');
  // Inject a session whose startedAt slice (YYYY-MM-DD) matches the cell's lastBloomLocalDate.
  const priorDay = '2026-01-10';
  const stale = snapshotWithCell(state, {
    dailyMilestoneProgressSeconds: 1500,
    lastBloomLocalDate: priorDay,
    momentum: 4,
    activation: 2,
  });
  const withSession: FlowgridSnapshot = {
    ...stale,
    sessions: [
      {
        id: `${ids.clientId}:op:prior`,
        cellId: ids.cellId,
        startedAt: `${priorDay}T10:00:00.000Z`,
        endedAt: `${priorDay}T10:25:00.000Z`,
        durationSeconds: 1500,
        xpGained: 25,
        currentGenerated: 1500,
        bloomFired: true,
        activationGranted: true,
        energyGained: 750,
        coreChargeGained: 750,
        createdAt: `${priorDay}T10:25:00.000Z`,
      },
    ],
  };

  const reconciled = reconcileDayRollover(withSession, { now: NOW, localDate: LOCAL_DATE });
  const cell = reconciled.cells.values().next().value as CellRecord;

  expect(cell.momentum, 'prior-day session prevents Momentum decay').toBe(4);
});

test('reconcileDayRollover: leaves never-bloomed Cells unchanged (lastBloomLocalDate null)', () => {
  const { state } = buildStarterSnapshot('rollover-never-bloomed');
  const stale = snapshotWithCell(state, {
    dailyMilestoneProgressSeconds: 500,
    lastBloomLocalDate: null,
    momentum: 2,
    activation: 0,
  });

  const reconciled = reconcileDayRollover(stale, { now: NOW, localDate: LOCAL_DATE });
  const cell = reconciled.cells.values().next().value as CellRecord;

  expect(cell.dailyMilestoneProgressSeconds, 'never-bloomed cell keeps its progress').toBe(500);
  expect(cell.momentum).toBe(2);
  expect(cell.activation).toBe(0);
});

test('reconcileDayRollover: leaves already-today Cells unchanged (lastBloomLocalDate === env.localDate)', () => {
  const { state } = buildStarterSnapshot('rollover-today');
  const stale = snapshotWithCell(state, {
    dailyMilestoneProgressSeconds: 800,
    lastBloomLocalDate: LOCAL_DATE,
    momentum: 3,
    activation: 1,
  });

  const reconciled = reconcileDayRollover(stale, { now: NOW, localDate: LOCAL_DATE });
  const cell = reconciled.cells.values().next().value as CellRecord;

  expect(cell.dailyMilestoneProgressSeconds, 'today-bloomed cell keeps its progress').toBe(800);
  expect(cell.momentum).toBe(3);
});

test('reconcileDayRollover: stale cell updatedAt advances to env.now', () => {
  const { state } = buildStarterSnapshot('rollover-updated');
  const stale = snapshotWithCell(state, {
    dailyMilestoneProgressSeconds: 1500,
    lastBloomLocalDate: '2026-01-10',
    momentum: 2,
    activation: 1,
    updatedAt: '2026-01-10T11:00:00.000Z',
  });

  const reconciled = reconcileDayRollover(stale, { now: NOW, localDate: LOCAL_DATE });
  const cell = reconciled.cells.values().next().value as CellRecord;

  expect(cell.updatedAt).toBe(NOW);
});

test('reconcileDayRollover: reconciled snapshot passes invariant validation', () => {
  const { state } = buildStarterSnapshot('rollover-invariants');
  const stale = snapshotWithCell(state, {
    dailyMilestoneProgressSeconds: 1500,
    lastBloomLocalDate: '2026-01-10',
    momentum: 2,
    activation: 1,
  });

  const reconciled = reconcileDayRollover(stale, { now: NOW, localDate: LOCAL_DATE });
  expectValidState(reconciled);
});
