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
import { CreateCellForm } from '../../src/ui/cell-board/CreateCellForm.js';

const mockedDispatch = dispatch as unknown as ReturnType<typeof vi.fn>;

function renderForm(): ReturnType<typeof render> {
  const router = createMemoryRouter(
    [{ path: '/', element: <CreateCellForm /> }],
    { initialEntries: ['/'] },
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  cleanup();
  mockedDispatch.mockClear();
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

  expect(mockedDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'create_cell',
      name: 'Music',
      color: '#3b82f6',
      icon: null,
      dailyTargetSeconds: 1800,
    }),
  );
  const sentCommand = mockedDispatch.mock.calls[0]![0] as { cellId: string };
  expect(sentCommand.cellId).toMatch(/^flowgrid:cell:/);
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
