// Plan 06-05 Task 2 RED: regression test asserting SettingsPanel's mount effect
// does NOT durably persist reduceMotion from the OS preference.
//
// Secondary contributor (per UAT diagnosis + .planning/debug/no-canvas-animation.md):
// the ref-guarded mount effect in SettingsPanel.tsx dispatched update_settings to
// DURABLY persist reduceMotion=true when the OS prefers-reduced-motion and the
// persisted setting was false. This accidentally pinned reduceMotion=true for any
// user who visited /settings once with OS reduce-motion enabled, which stops the
// animation ticker and skips particle emission indefinitely — compounding the
// Task 1 coordinate bug for affected users.
//
// Gap-closure revision of D-09: the OS preference now pre-fills the checkbox as a
// SESSION-ONLY visual suggestion (no durable write). D-09's "manual override" is
// preserved — the user can still explicitly toggle + Save to persist either way.
//
// This test mocks prefersReducedMotion() → true and snapshots.settings.reduceMotion
// → false, then asserts no update_settings command is dispatched on mount.

import { beforeEach, expect, test, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

// vi.mock factories are hoisted above imports, so the mutable snapshot holder and
// dispatch spy must be created via vi.hoisted so the factories can reference them.
const { dispatchMock, snapshotRef, rejectionRef } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  snapshotRef: { current: null as unknown } as { current: unknown },
  rejectionRef: { current: null as string | null } as { current: string | null },
}));

// (a) dispatch.js — dispatch spy (captures all calls) + useFlowgridStore stub that
// reads from the local snapshot/rejection holders the test seeds before render.
vi.mock('../../src/app/store/dispatch.js', () => ({
  dispatch: dispatchMock,
  useFlowgridStore: <T,>(selector: (s: unknown) => T): T =>
    selector({ snapshot: snapshotRef.current, lastRejection: rejectionRef.current }),
}));

// (b) repository.js — empty-object stubs (the mount effect only passes repository
// to dispatch, which is itself mocked; no DB I/O is exercised).
vi.mock('../../src/app/repository.js', () => ({
  repository: {},
  database: {},
}));

// (c) reduce-motion.js — prefersReducedMotion forced ON (triggers the buggy
// branch); effectiveReduceMotion is identity so any consumer is unaffected.
vi.mock('../../src/ui/settings/reduce-motion.js', () => ({
  effectiveReduceMotion: (v: boolean) => v,
  prefersReducedMotion: () => true,
}));

// (d) persistence/index.js — no-op async stubs for the export/import handlers
// (not exercised by this test, but SettingsPanel imports them at module level).
vi.mock('../../src/persistence/index.js', () => ({
  exportJson: async () => ({}),
  exportSessionCsv: async () => '',
  importArchive: async () => ({ ok: true, value: undefined }),
}));

// (e) ArchivedCellsFilter — Settings owns the buried maintenance placement, but
// this suite should not exercise unarchive dispatch or require a full cells map.
vi.mock('../../src/ui/flowgrid-home/ArchivedCellsFilter.js', () => ({
  ArchivedCellsFilter: (): ReactNode => (
    <section aria-label="Cell maintenance" data-testid="archived-cells-filter-stub" />
  ),
}));

import { SettingsPanel } from '../../src/ui/settings/SettingsPanel.js';

// Seed a snapshot whose settings.reduceMotion is false (so the OS-preference
// honoring branch is reached) with the other three settings at their seeded
// defaults.
function seedSnapshot(): unknown {
  return {
    settings: {
      reduceMotion: false,
      defaultSessionLengthSeconds: 1500,
      dailyTargetSeconds: 1800,
      localDayBoundary: '00:00',
    },
  };
}

// Render SettingsPanel inside a memory-router-backed RouterProvider so the
// `<Link to="/" />` has router context (mirrors cell-list-a11y.test.tsx).
function renderSettings(): ReturnType<typeof render> {
  snapshotRef.current = seedSnapshot();
  rejectionRef.current = null;
  const router = createMemoryRouter([{ path: '/', element: <SettingsPanel /> }], {
    initialEntries: ['/'],
  });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  cleanup();
  dispatchMock.mockReset();
});

test('SettingsPanel mount effect: does NOT dispatch update_settings to durably persist reduceMotion from the OS preference', async () => {
  renderSettings();

  // Wait for the mount effect to flush (Settings heading proves render completed;
  // the effect runs in the same commit so the spy is populated by then).
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  const updateSettingsCalls = dispatchMock.mock.calls.filter(
    ([command]) => (command as { type?: string }).type === 'update_settings',
  );
  expect(updateSettingsCalls).toHaveLength(0);
});

test('SettingsPanel: contains the buried archived Cell maintenance surface', async () => {
  renderSettings();

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  expect(screen.getByTestId('archived-cells-filter-stub')).toBeInTheDocument();
});
