// EditCellDialog (Phase 6.1 / D-06; Plan 06.1-02 Task 3).
//
// Radix Dialog for editing an existing Cell — the D-06 configuration exception
// to the "never covered during core play" rule. Cell edit is configuration, NOT
// signal-producing, so the rule does not apply. The dialog reuses the existing
// EditCellForm (which dispatches the existing edit_cell command — the actual
// command name; the plan's `update_cell` was a typo and is a Rule 3 fix).
//
// Dialog.Portal is load-bearing (RESEARCH Pitfall 5): it mounts the dialog at
// document.body so the dialog escapes the persistent layout's stacking context
// and renders above the Pixi canvas overlay. Without the Portal the dialog could
// render behind the canvas.
//
// Extracted from CellActions (which previously inlined this Dialog) so the edit
// surface is reusable and independently testable. Behavior is unchanged: the
// Edit button triggers the dialog; Save dispatches edit_cell; Close dismisses
// without dispatch.

import * as Dialog from '@radix-ui/react-dialog';

import type { CellRecord } from '../../domain/index.js';
import { EditCellForm } from './EditCellForm.js';

interface EditCellDialogProps {
  readonly cell: CellRecord;
  // Controlled open state. The parent owns this so the Edit button (rendered
  // elsewhere in CellActions) can open the dialog via Dialog.Trigger asChild,
  // while the form's onDone callback closes it.
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  // The Edit trigger element, rendered via Dialog.Trigger asChild. Decouples
  // the trigger styling from the dialog contents.
  readonly trigger: React.ReactNode;
}

export function EditCellDialog({
  cell,
  open,
  onOpenChange,
  trigger,
}: EditCellDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content
          aria-label={`Edit ${cell.name}`}
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-700 bg-flowgrid-surface p-6 shadow-2xl space-y-4"
        >
          <Dialog.Title className="text-lg font-semibold text-slate-100">
            Edit {cell.name}
          </Dialog.Title>
          <EditCellForm cell={cell} onDone={() => onOpenChange(false)} />
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close edit dialog"
              className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Close
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
