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
    <section aria-label="Archived Cells">
      <button
        type="button"
        aria-pressed={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Hide archived Cells' : 'Show archived Cells'}
      </button>

      {expanded ? (
        archivedCells.length === 0 ? (
          <p>No archived Cells.</p>
        ) : (
          <ul>
            {archivedCells.map((cell) => (
              <li key={cell.id}>
                <span>{cell.name}</span>
                <button type="button" onClick={() => handleUnarchive(cell.id)}>
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
