// EditCellForm — identity-only Cell edit (CELL-03, D-11).
//
// Pre-fills name, color, icon, and dailyTargetSeconds from the existing Cell. On
// submit it constructs an edit_cell command carrying ONLY identity fields — the
// economy fields (xp, current, charge, momentum, activation, ...) are structurally
// impossible to send via this form (T-03-11 mitigation). This is the UI half of
// D-11; the simulation half lives in edit-cell.ts.

import { useState } from 'react';

import type { CellRecord, EditCellCommand, IntSeconds } from '../../domain/index.js';
import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const SESSION_SEED = 'flowgrid-edit-cell-seed';

interface EditCellFormProps {
  readonly cell: CellRecord;
  readonly onDone?: () => void;
}

export function EditCellForm({ cell, onDone }: EditCellFormProps) {
  const snapshot = useFlowgridStore((s) => s.snapshot);

  const [name, setName] = useState(cell.name);
  const [color, setColor] = useState(cell.color);
  const [icon, setIcon] = useState(cell.icon ?? '');
  const [dailyTargetSeconds, setDailyTargetSeconds] = useState<number>(
    cell.dailyMilestoneTargetSeconds,
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || !HEX_COLOR_RE.test(color) || dailyTargetSeconds <= 0) {
      return;
    }

    if (snapshot === null) return;

    // D-11: identity fields ONLY. Economy fields are never present on this object.
    const command: EditCellCommand = {
      type: 'edit_cell',
      operationId: crypto.randomUUID(),
      cellId: cell.id,
      name: trimmedName,
      color,
      icon: icon.trim().length > 0 ? icon.trim() : null,
      dailyTargetSeconds: Math.floor(dailyTargetSeconds) as IntSeconds,
    };
    const env = makeEnv(
      new Date().toISOString(),
      { localDayBoundary: snapshot.settings.localDayBoundary },
      SESSION_SEED,
    );
    await dispatch(command, env, repository);
    onDone?.();
  };

  return (
    <form onSubmit={handleSubmit} aria-label={`Edit ${cell.name}`}>
      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Name"
        />
      </label>
      <label>
        Color (hex)
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Color (hex)"
        />
      </label>
      <label>
        Icon (optional)
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          aria-label="Icon (optional)"
        />
      </label>
      <label>
        Daily target (seconds)
        <input
          type="number"
          min={1}
          step={1}
          value={dailyTargetSeconds}
          onChange={(e) => setDailyTargetSeconds(Number(e.target.value))}
          aria-label="Daily target (seconds)"
        />
      </label>
      <button type="submit">Save</button>
    </form>
  );
}
