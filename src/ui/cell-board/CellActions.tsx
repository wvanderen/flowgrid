// CellActions — archive / unarchive / edit controls for a Cell (CELL-04, D-12).
//
// Renders the archive or unarchive button based on the Cell's current archivedAt
// state, plus an Edit button that opens EditCellDialog (Phase 6.1 / D-06
// configuration exception). Archiving navigates back to Flowgrid Home (`/`) since
// the Cell Board for an archived Cell should redirect away.

import { useState } from 'react';
import { useNavigate } from 'react-router';

import type {
  ArchiveCellCommand,
  CellId,
  UnarchiveCellCommand,
} from '../../domain/index.js';
import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';
import { getCellById } from '../../simulation/selectors.js';

import { EditCellDialog } from './EditCellDialog.js';

interface CellActionsProps {
  readonly cellId: CellId;
}

const SESSION_SEED = 'flowgrid-cell-actions-seed';

export function CellActions({ cellId }: CellActionsProps) {
  const navigate = useNavigate();
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const [editOpen, setEditOpen] = useState(false);

  if (snapshot === null) return null;

  const cell = getCellById(snapshot, cellId);
  if (cell === undefined) return null;

  const buildEnv = () =>
    makeEnv(
      new Date().toISOString(),
      { localDayBoundary: snapshot.settings.localDayBoundary },
      SESSION_SEED,
    );

  const handleArchive = async () => {
    const command: ArchiveCellCommand = {
      type: 'archive_cell',
      operationId: crypto.randomUUID(),
      cellId,
    };
    await dispatch(command, buildEnv(), repository);
    // Archived Cells are hidden from the Flowgrid; navigate Home.
    navigate('/');
  };

  const handleUnarchive = async () => {
    const command: UnarchiveCellCommand = {
      type: 'unarchive_cell',
      operationId: crypto.randomUUID(),
      cellId,
    };
    await dispatch(command, buildEnv(), repository);
  };

  return (
    <section aria-label={`Actions for ${cell.name}`} className="flex flex-wrap items-center gap-2">
      {/* Phase 6.1 D-06 (Plan 06.1-02 Task 3): the Edit dialog is extracted into
          a dedicated EditCellDialog component (reusable + independently
          testable). Behavior is unchanged: Edit opens the dialog, Save
          dispatches edit_cell via EditCellForm, Close dismisses. Dialog.Portal
          escapes the layout stacking context (RESEARCH Pitfall 5). */}
      <EditCellDialog
        cell={cell}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Edit
          </button>
        }
      />

      {cell.archivedAt === null ? (
        <button type="button" onClick={handleArchive} className="inline-flex items-center justify-center rounded-md border border-error/60 px-4 py-2 text-error transition hover:bg-error/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-error">
          Archive
        </button>
      ) : (
        <button type="button" onClick={handleUnarchive} className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
          Unarchive
        </button>
      )}
    </section>
  );
}
