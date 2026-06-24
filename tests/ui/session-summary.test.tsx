// Plan 03-03 Task 2 RED: nextUsefulAction + SessionSummary tests (SESS-05).
//
// nextUsefulAction is a PURE selectors/content function (NOT an AI suggestion —
// CONTEXT Agent's Discretion line 50). SessionSummary renders the SESS-05 content
// list and the next-action hint. Both live under tests/ui so they share the
// happy-dom project, but nextUsefulAction is tested as a plain function too.

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../../src/app/repository.js', () => ({
  repository: { open: vi.fn(), loadSnapshot: vi.fn(), applyResult: vi.fn() },
  database: {},
}));

import type {
  CellRecord,
  SessionRecord,
  SettingsRecord,
} from '../../src/domain/index.js';
import { ACTIVATION_CURRENT_BONUS_PERCENT } from '../../src/content/index.js';

import { nextUsefulAction } from '../../src/ui/session-summary/nextAction.js';
import { SessionSummary } from '../../src/ui/session-summary/SessionSummary.js';

const LOCAL_DATE = '2026-06-23';

function makeCell(overrides: Partial<CellRecord> = {}): CellRecord {
  return {
    id: 'flowgrid:cell:test',
    name: 'Music',
    color: '#3b82f6',
    icon: null,
    archivedAt: null,
    activeSessionStartedAt: null,
    xp: 10,
    current: 0,
    charge: 0,
    momentum: 1,
    activation: 2,
    dailyMilestoneProgressSeconds: 0,
    dailyMilestoneTargetSeconds: 1800,
    lastBloomLocalDate: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-23T00:00:00.000Z',
    ...overrides,
  };
}

function makeSettings(overrides: Partial<SettingsRecord> = {}): SettingsRecord {
  return {
    id: 'flowgrid:settings',
    defaultSessionLengthSeconds: 1500,
    dailyTargetSeconds: 1800,
    localDayBoundary: '04:00',
    updatedAt: '2026-06-23T00:00:00.000Z',
    ...overrides,
  };
}

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'flowgrid:session:test',
    cellId: 'flowgrid:cell:test',
    startedAt: '2026-06-23T08:00:00.000Z',
    endedAt: '2026-06-23T08:25:00.000Z',
    durationSeconds: 1500,
    xpGained: 25,
    currentGenerated: 1500,
    bloomFired: false,
    activationGranted: false,
    energyGained: 0,
    coreChargeGained: 0,
    createdAt: '2026-06-23T08:25:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

// --- nextUsefulAction: pure function tests ---

test('nextUsefulAction: "more minutes to bloom" when milestone progress is below target', () => {
  const cell = makeCell({
    dailyMilestoneProgressSeconds: 600,
    dailyMilestoneTargetSeconds: 1800,
    lastBloomLocalDate: null,
  });
  const settings = makeSettings();
  const result = nextUsefulAction(cell, settings, LOCAL_DATE);

  // 1200s remaining = 20 minutes.
  expect(result).toMatch(/more minutes to bloom/i);
  expect(result).toContain('20');
});

test('nextUsefulAction: references Activation bonus and the day-reset boundary when the cell is Activated today', () => {
  const cell = makeCell({ lastBloomLocalDate: LOCAL_DATE });
  const settings = makeSettings({ localDayBoundary: '04:00' });
  const result = nextUsefulAction(cell, settings, LOCAL_DATE);

  expect(result).toMatch(/activated/i);
  expect(result).toContain(String(ACTIVATION_CURRENT_BONUS_PERCENT));
  expect(result).toContain('04:00');
});

test('nextUsefulAction: "Bloom is ready" when milestone complete but Bloom has not fired today', () => {
  const cell = makeCell({
    dailyMilestoneProgressSeconds: 1800,
    dailyMilestoneTargetSeconds: 1800,
    lastBloomLocalDate: null,
  });
  const result = nextUsefulAction(cell, makeSettings(), LOCAL_DATE);

  expect(result).toMatch(/bloom is ready/i);
});

// --- SessionSummary: component tests ---

test('SessionSummary: displays duration, Current, XP, milestone, Bloom status, Activation status, Energy/Core outcome', () => {
  const session = makeSession({
    durationSeconds: 1500,
    xpGained: 25,
    currentGenerated: 1500,
    bloomFired: true,
    activationGranted: true,
    energyGained: 0,
    coreChargeGained: 0,
  });
  const cell = makeCell({
    dailyMilestoneProgressSeconds: 1500,
    dailyMilestoneTargetSeconds: 1500,
    lastBloomLocalDate: LOCAL_DATE,
  });

  render(
    <SessionSummary
      session={session}
      cell={cell}
      settings={makeSettings()}
      localDate={LOCAL_DATE}
    />,
  );

  expect(screen.getByText(/session complete/i)).toBeInTheDocument();
  // Duration surfaced (1500s = 25m).
  expect(screen.getByText(/25m/i)).toBeInTheDocument();
  // Current + XP.
  expect(screen.getByText('1500')).toBeInTheDocument();
  expect(screen.getByText('25')).toBeInTheDocument();
  // Bloom fired.
  expect(screen.getByText(/bloom fired/i)).toBeInTheDocument();
  // Cell Activated.
  expect(screen.getByText(/cell activated/i)).toBeInTheDocument();
  // Energy/Core both 0 → Phase 4 note.
  expect(screen.getByText(/phase 4/i)).toBeInTheDocument();
});

test('SessionSummary: shows "No Bloom yet" when bloomFired is false', () => {
  const session = makeSession({ bloomFired: false, activationGranted: false });
  const cell = makeCell();

  render(
    <SessionSummary
      session={session}
      cell={cell}
      settings={makeSettings()}
      localDate={LOCAL_DATE}
    />,
  );

  expect(screen.getByText(/no bloom yet/i)).toBeInTheDocument();
  expect(screen.getByText(/not activated/i)).toBeInTheDocument();
});

test('SessionSummary: displays the next useful action text from nextUsefulAction', () => {
  const session = makeSession();
  const cell = makeCell({
    dailyMilestoneProgressSeconds: 600,
    dailyMilestoneTargetSeconds: 1800,
    lastBloomLocalDate: null,
  });

  render(
    <SessionSummary
      session={session}
      cell={cell}
      settings={makeSettings()}
      localDate={LOCAL_DATE}
    />,
  );

  expect(screen.getByText(/more minutes to bloom/i)).toBeInTheDocument();
});
