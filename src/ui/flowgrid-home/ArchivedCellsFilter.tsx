// ArchivedCellsFilter — management surface for archived Cells (D-12).
//
// Archived Cells are hidden from the Flowgrid canvas (and the active-cell count)
// but remain manageable behind this collapsible React-side list. The toggle
// controls visibility; when expanded, each archived Cell is listed with its name
// and an Unarchive action that dispatches unarchive_cell. This component does NOT
// touch the Pixi canvas — the canvas already filters archived Cells independently.

import { useState } from 'react';

import type { UnarchiveCellCommand } from '../../domain/index.js';
import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';

const SESSION_SEED = 'flowgrid-archived-filter-seed';

export function ArchivedCellsFilter() {
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const [expanded, setExpanded] = useState(false);

  if (snapshot === null) return null;

  const archivedCells = [...snapshot.cells.values()].filter(
    (c) => c.archivedAt !== null,
  );

  const handleUnarchive = async (cellId: string) => {
    const command: UnarchiveCellCommand = {
      type: 'unarchive_cell',
      operationId: crypto.randomUUID(),
      cellId,
    };
    const env = makeEnv(
      new Date().toISOString(),
      { localDayBoundary: snapshot.settings.localDayBoundary },
      SESSION_SEED,
    );
    await dispatch(command, env, repository);
  };

  return (
    <section aria-label="Cell maintenance" className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-200">Cell maintenance</h3>
        <p className="text-sm text-slate-400">
          Archived Cells stay out of the main Flowgrid. Use this only to recover an older Cell.
        </p>
      </div>
      <button
        type="button"
        aria-pressed={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        {expanded ? 'Hide archived Cells' : 'Show archived Cells'}
      </button>

      {expanded ? (
        archivedCells.length === 0 ? (
          <p className="text-sm text-slate-400">No archived Cells.</p>
        ) : (
          <ul className="divide-y divide-slate-700">
            {archivedCells.map((cell) => (
              <li key={cell.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-slate-200">{cell.name}</span>
                <button type="button" onClick={() => handleUnarchive(cell.id)} className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                  Unarchive
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
