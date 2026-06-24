// CellActions — archive / unarchive / edit controls for a Cell (CELL-04, D-12).
//
// Renders the archive or unarchive button based on the Cell's current archivedAt
// state, plus an Edit button that opens the EditCellForm inside a Radix Dialog.
// Archiving navigates back to Flowgrid Home (`/`) since the Cell Board for an
// archived Cell should redirect away.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';

import type {
  ArchiveCellCommand,
  CellId,
  UnarchiveCellCommand,
} from '../../domain/index.js';
import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';
import { getCellById } from '../../simulation/selectors.js';

import { EditCellForm } from './EditCellForm.js';

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
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Edit</button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
          <Dialog.Content aria-label={`Edit ${cell.name}`} className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-700 bg-flowgrid-surface p-6 shadow-2xl space-y-4">
            <Dialog.Title className="text-lg font-semibold text-slate-100">Edit {cell.name}</Dialog.Title>
            <EditCellForm cell={cell} onDone={() => setEditOpen(false)} />
            <Dialog.Close asChild>
              <button type="button" aria-label="Close edit dialog" className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                Close
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
