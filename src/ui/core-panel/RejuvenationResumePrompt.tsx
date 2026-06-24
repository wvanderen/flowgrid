// RejuvenationResumePrompt — interrupted-rejuvenation recovery banner (D-02).
//
// The rejuvenation parallel of ResumeSessionPrompt (src/ui/cell-board/ResumeSessionPrompt.tsx).
// Surfaces the resume-or-discard decision after a reload when the Core has a non-null
// activeRejuvenationStartedAt. "Resume" navigates to /core where CorePanel picks up the
// active rejuvenation (the RejuvenationTimer resumes from activeRejuvenation.startedAt
// and the Finish/Cancel controls are live). "Discard" dispatches cancel_rejuvenation,
// which writes NOTHING durable beyond clearing the marker (D-07 / Pitfall 6 — the cancel
// contract: no operation, no event, no record). This component is mounted by FlowgridHome.
//
// Boundary: dispatches the command object via `dispatch`; never imports command handlers.
// D-02 mutual exclusion guarantees at most one of (focus resume prompt, rejuvenation
// resume prompt) is mounted at a time — only one marker can be non-null app-wide.

import { useNavigate } from 'react-router';

import type { CancelRejuvenationCommand } from '../../domain/index.js';
import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';

interface RejuvenationResumePromptProps {
  readonly startedAt: string;
}

const REJUVENATION_SEED = 'flowgrid-rejuvenation-resume-seed';

export function RejuvenationResumePrompt({ startedAt }: RejuvenationResumePromptProps) {
  const navigate = useNavigate();
  const snapshot = useFlowgridStore((s) => s.snapshot);

  const handleDiscard = async () => {
    if (snapshot === null) return;
    const command: CancelRejuvenationCommand = {
      type: 'cancel_rejuvenation',
      operationId: crypto.randomUUID(),
    };
    const env = makeEnv(
      new Date().toISOString(),
      { localDayBoundary: snapshot.settings.localDayBoundary },
      REJUVENATION_SEED,
    );
    await dispatch(command, env, repository);
  };

  const handleResume = () => {
    void startedAt;
    navigate('/core');
  };

  return (
    <section
      role="alertdialog"
      aria-label="Resume rejuvenation"
      className="rounded-lg border border-core/50 bg-flowgrid-surface p-4 space-y-3"
    >
      <p className="text-slate-200">
        You had a rejuvenation in progress. Resume or discard?
      </p>
      <button type="button" onClick={handleResume} className="inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core">
        Resume
      </button>
      <button type="button" onClick={handleDiscard} className="ml-2 inline-flex items-center justify-center rounded-md border border-error/60 px-4 py-2 text-error transition hover:bg-error/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-error">
        Discard
      </button>
    </section>
  );
}
