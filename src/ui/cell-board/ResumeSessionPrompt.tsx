// ResumeSessionPrompt — interrupted-session recovery banner (D-05).
//
// Surfaces the resume-or-discard decision after a reload when a Cell has a non-null
// activeSessionStartedAt. "Resume" navigates to the Cell Board where GeneratorTile
// picks up the active session (the SessionTimer resumes from activeSessionStartedAt).
// "Discard" dispatches cancel_focus_session, which writes NOTHING durable beyond
// clearing the marker (D-07). This component is mounted by FlowgridHome.

import { useNavigate } from 'react-router';

import type { CancelFocusSessionCommand } from '../../domain/index.js';
import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';

interface ResumeSessionPromptProps {
  readonly cellId: string;
  readonly cellName: string;
  readonly startedAt: string;
}

const SESSION_SEED = 'flowgrid-resume-seed';

export function ResumeSessionPrompt({
  cellId,
  cellName,
  startedAt,
}: ResumeSessionPromptProps) {
  const navigate = useNavigate();
  const snapshot = useFlowgridStore((s) => s.snapshot);

  const handleDiscard = async () => {
    if (snapshot === null) return;
    const command: CancelFocusSessionCommand = {
      type: 'cancel_focus_session',
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

  const handleResume = () => {
    void startedAt;
    navigate(`/cells/${cellId}`);
  };

  return (
    <section
      role="alertdialog"
      aria-label={`Resume focus session for ${cellName}`}
      className="rounded-lg border border-core/50 bg-flowgrid-surface p-4 space-y-3"
    >
      <p className="text-slate-200">
        You had a focus session in progress for {cellName}. Resume or discard?
      </p>
      <button type="button" onClick={handleResume} className="inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core">
        Resume
      </button>
      <button type="button" onClick={handleDiscard} className="inline-flex items-center justify-center rounded-md border border-error/60 px-4 py-2 text-error transition hover:bg-error/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-error">
        Discard
      </button>
    </section>
  );
}
