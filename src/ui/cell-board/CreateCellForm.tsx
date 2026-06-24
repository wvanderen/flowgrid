// CreateCellForm — CELL-01 reachability surface (D-09).
//
// Controlled form for name (text), color (hex), optional icon, and
// dailyTargetSeconds (positive integer). Client-side validation mirrors the
// simulation's create_cell validation (defense-in-depth): empty name and non-hex
// color are blocked before dispatch. On valid submit, builds a create_cell command
// with a fresh cellId, dispatches it, then navigates to the new Cell's Board.
//
// `onCreated` is an optional callback (used by the FlowgridHome Dialog wrapper to
// close the dialog after the form navigates).

import { useState } from 'react';
import { useNavigate } from 'react-router';

import type { CreateCellCommand, IntSeconds } from '../../domain/index.js';
import { DEFAULT_DAILY_TARGET_SECONDS } from '../../content/index.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';
import { makeEnv } from '../../app/env.js';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const SESSION_SEED = 'flowgrid-create-cell-seed';

interface CreateCellFormProps {
  readonly onCreated?: (cellId: string) => void;
}

interface FieldErrors {
  name?: string;
  color?: string;
  dailyTargetSeconds?: string;
}

export function CreateCellForm({ onCreated }: CreateCellFormProps) {
  const navigate = useNavigate();
  const snapshot = useFlowgridStore((s) => s.snapshot);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6b7280');
  const [icon, setIcon] = useState('');
  const [dailyTargetSeconds, setDailyTargetSeconds] = useState<number>(
    DEFAULT_DAILY_TARGET_SECONDS,
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      nextErrors.name = 'Name is required.';
    }
    if (!HEX_COLOR_RE.test(color)) {
      nextErrors.color = 'Color must be a valid hex (#rrggbb).';
    }
    const target = Math.floor(dailyTargetSeconds);
    if (!Number.isFinite(target) || target <= 0) {
      nextErrors.dailyTargetSeconds = 'Daily target must be a positive integer.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    if (snapshot === null) return;

    const newCellId = `flowgrid:cell:${crypto.randomUUID()}`;
    const command: CreateCellCommand = {
      type: 'create_cell',
      operationId: crypto.randomUUID(),
      cellId: newCellId,
      name: trimmedName,
      color,
      icon: icon.trim().length > 0 ? icon.trim() : null,
      dailyTargetSeconds: target as IntSeconds,
    };
    const env = makeEnv(
      new Date().toISOString(),
      { localDayBoundary: snapshot.settings.localDayBoundary },
      SESSION_SEED,
    );
    // dispatch returns Promise<SimulationResult | null> in production; awaiting a
    // non-promise (tests) is safe. Navigate after the dispatch resolves.
    await dispatch(command, env, repository);
    navigate(`/cells/${newCellId}`);
    onCreated?.(newCellId);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Create Cell form" className="space-y-4">
      <label className="block text-sm font-medium text-slate-300">
        Cell name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Cell name"
          autoComplete="off"
          className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-core focus:outline-none focus-visible:ring-1 focus-visible:ring-core"
        />
      </label>
      {errors.name ? (
        <p role="alert" data-error="name" className="mt-1 text-sm text-error">
          {errors.name}
        </p>
      ) : null}

      <label className="block text-sm font-medium text-slate-300">
        Color (hex)
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Cell color"
          autoComplete="off"
          className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-core focus:outline-none focus-visible:ring-1 focus-visible:ring-core"
        />
      </label>
      {errors.color ? (
        <p role="alert" data-error="color" className="mt-1 text-sm text-error">
          {errors.color}
        </p>
      ) : null}

      <label className="block text-sm font-medium text-slate-300">
        Icon (optional)
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          aria-label="Cell icon (optional)"
          autoComplete="off"
          className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-core focus:outline-none focus-visible:ring-1 focus-visible:ring-core"
        />
      </label>

      <label className="block text-sm font-medium text-slate-300">
        Daily target (seconds)
        <input
          type="number"
          min={1}
          step={1}
          value={dailyTargetSeconds}
          onChange={(e) => setDailyTargetSeconds(Number(e.target.value))}
          aria-label="Daily target (seconds)"
          className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-core focus:outline-none focus-visible:ring-1 focus-visible:ring-core"
        />
      </label>
      {errors.dailyTargetSeconds ? (
        <p role="alert" data-error="dailyTargetSeconds" className="mt-1 text-sm text-error">
          {errors.dailyTargetSeconds}
        </p>
      ) : null}

      <button type="submit" className="inline-flex w-full items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core">Create Cell</button>
    </form>
  );
}
