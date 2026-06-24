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
    <section aria-label={`Actions for ${cell.name}`}>
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Trigger asChild>
          <button type="button">Edit</button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content aria-label={`Edit ${cell.name}`}>
            <Dialog.Title>Edit {cell.name}</Dialog.Title>
            <EditCellForm cell={cell} onDone={() => setEditOpen(false)} />
            <Dialog.Close asChild>
              <button type="button" aria-label="Close edit dialog">
                Close
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {cell.archivedAt === null ? (
        <button type="button" onClick={handleArchive}>
          Archive
        </button>
      ) : (
        <button type="button" onClick={handleUnarchive}>
          Unarchive
        </button>
      )}
    </section>
  );
}
