// Plan 03-03 Task 1 RED: CreateCellForm validation + dispatch tests (CELL-01).
//
// The form is the CELL-01 reachability surface: name/color/icon/dailyTargetSeconds
// inputs that validate client-side then dispatch a create_cell command. Invalid
// input must NOT dispatch.

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

vi.mock('../../src/app/repository.js', () => ({
  repository: {
    open: vi.fn(),
    loadSnapshot: vi.fn(),
    applyResult: vi.fn(),
  },
  database: {},
}));

vi.mock('../../src/app/store/dispatch.js', async (importActual) => {
  const actual =
    await importActual<typeof import('../../src/app/store/dispatch.js')>();
  return { ...actual, dispatch: vi.fn() };
});

import { dispatch } from '../../src/app/store/dispatch.js';
import { flowgridStore } from '../../src/app/store/flowgrid-store.js';
import { CreateCellForm } from '../../src/ui/cell-board/CreateCellForm.js';
import { buildStarterSnapshot } from '../helpers/fixtures.js';

const mockedDispatch = dispatch as unknown as ReturnType<typeof vi.fn>;

// dispatch(command, env, repository) is called with 3 args; assert on the command
// (first arg) directly via toMatchObject for a clean partial-deep check. Returns
// the sent command so callers can run further field-level assertions.
function expectSentCommand(partial: Record<string, unknown>): Record<string, unknown> {
  expect(mockedDispatch).toHaveBeenCalled();
  const lastCall = mockedDispatch.mock.calls.at(-1);
  expect(lastCall).toBeDefined();
  const sentCommand = lastCall![0] as Record<string, unknown>;
  expect(sentCommand).toMatchObject(partial);
  return sentCommand;
}

function renderForm(): ReturnType<typeof render> {
  const router = createMemoryRouter(
    [
      { path: '/', element: <CreateCellForm /> },
      // CreateCellForm navigates to /cells/:cellId after dispatch; include the route
      // so the post-dispatch navigation does not hit React Router's no-match boundary.
      { path: '/cells/:cellId', element: <div aria-label="Cell Board stub" /> },
    ],
    { initialEntries: ['/'] },
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  cleanup();
  mockedDispatch.mockClear();
  // CreateCellForm reads snapshot.settings.localDayBoundary to build the env, so
  // seed a ready store with a starter snapshot before each form test.
  const { state } = buildStarterSnapshot('ccf');
  flowgridStore.setState({
    snapshot: state,
    activeSession: null,
    pendingVisualEvents: [],
    status: 'ready',
    lastError: null,
  });
});

afterEach(() => {
  cleanup();
});

function fillValidForm(): void {
  fireEvent.change(screen.getByLabelText(/^cell name$/i), {
    target: { value: 'Music' },
  });
  fireEvent.change(screen.getByLabelText(/color/i), {
    target: { value: '#3b82f6' },
  });
  fireEvent.change(screen.getByLabelText(/daily target/i), {
    target: { value: '1800' },
  });
}

test('CreateCellForm: dispatches create_cell with name, color, icon, dailyTargetSeconds on valid submit (CELL-01)', async () => {
  renderForm();
  fillValidForm();
  // icon is optional — leave blank (null).
  fireEvent.click(screen.getByRole('button', { name: /create cell/i }));

  await waitFor(() => {
    expect(mockedDispatch).toHaveBeenCalledTimes(1);
  });

  const sent = expectSentCommand({
    type: 'create_cell',
    name: 'Music',
    color: '#3b82f6',
    icon: null,
    dailyTargetSeconds: 1800,
  }) as { cellId: string };
  expect(sent.cellId).toMatch(/^flowgrid:cell:/);
});

test('CreateCellForm: rejects an empty name and does NOT dispatch', async () => {
  renderForm();
  // Leave name empty; fill valid color + target.
  fireEvent.change(screen.getByLabelText(/color/i), {
    target: { value: '#3b82f6' },
  });
  fireEvent.change(screen.getByLabelText(/daily target/i), {
    target: { value: '1800' },
  });
  fireEvent.click(screen.getByRole('button', { name: /create cell/i }));

  expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  expect(mockedDispatch).not.toHaveBeenCalled();
});

test('CreateCellForm: rejects an invalid color hex and does NOT dispatch', async () => {
  renderForm();
  fireEvent.change(screen.getByLabelText(/^cell name$/i), {
    target: { value: 'Music' },
  });
  fireEvent.change(screen.getByLabelText(/color/i), {
    target: { value: 'not-a-color' },
  });
  fireEvent.change(screen.getByLabelText(/daily target/i), {
    target: { value: '1800' },
  });
  fireEvent.click(screen.getByRole('button', { name: /create cell/i }));

  expect(screen.getByText(/valid hex/i)).toBeInTheDocument();
  expect(mockedDispatch).not.toHaveBeenCalled();
});
