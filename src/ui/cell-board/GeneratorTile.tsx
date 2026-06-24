// GeneratorTile — the protected primary action (SESS-01 / SESS-02 / SESS-03).
//
// One tile owns the Start → Finish/Cancel lifecycle for a focus session on this
// Cell. This is the sacred core interaction from PROJECT.md: "open app → tap Cell
// → start session" must stay protected, so the Start button is always the obvious
// primary action when no session is active.
//
// D-06: the SessionTimer display is purely cosmetic (setInterval); the true
// duration is computed here at Finish time as floor((endedAt - startedAt) / 1000).
// D-07: Cancel writes nothing durable beyond clearing the marker.
// D-08: a sub-second Finish routes through Cancel ("Session too short to record")
// so no zero-length session is ever recorded.

import { useState } from 'react';

import type {
  CancelFocusSessionCommand,
  CellRecord,
  CompleteFocusSessionCommand,
  StartFocusSessionCommand,
} from '../../domain/index.js';

import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';

import { SessionTimer } from './SessionTimer.js';

interface GeneratorTileProps {
  readonly cell: CellRecord;
}

const SESSION_SEED = 'flowgrid-session-seed';

function buildSessionEnv(localDayBoundary: string) {
  return makeEnv(new Date().toISOString(), { localDayBoundary }, SESSION_SEED);
}

export function GeneratorTile({ cell }: GeneratorTileProps) {
  const activeSession = useFlowgridStore((s) => s.activeSession);
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const lastRejection = useFlowgridStore((s) => s.lastRejection);
  const [tooShort, setTooShort] = useState(false);

  const isThisCellActive = activeSession?.cellId === cell.id;
  // Another Cell holds the active session — the one-active-session invariant (D-05)
  // means Start here would be rejected by the simulation. Disable the button and
  // explain why, instead of letting the user click into a silent rejection.
  const anotherCellActive = activeSession !== null && activeSession.cellId !== cell.id;

  if (!isThisCellActive || activeSession === null) {
    const handleStart = () => {
      if (snapshot === null) return;
      const env = buildSessionEnv(snapshot.settings.localDayBoundary);
      const command: StartFocusSessionCommand = {
        type: 'start_focus_session',
        operationId: crypto.randomUUID(),
        cellId: cell.id,
      };
      void dispatch(command, env, repository);
    };

    if (anotherCellActive) {
      return (
        <section aria-label="Generator" className="rounded-lg border border-core/50 bg-flowgrid-surface p-4 space-y-3">
          <h2 className="text-lg font-semibold text-core">Generator</h2>
          <p className="text-slate-300">Tap to start a focus session.</p>
          <button
            type="button"
            disabled
            aria-describedby="generator-another-active"
            className="inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg opacity-50 cursor-not-allowed"
          >
            Start Focus Session
          </button>
          <p id="generator-another-active" role="status" aria-live="polite" className="text-sm text-slate-400">
            Another focus session is active
          </p>
        </section>
      );
    }

    return (
      <section aria-label="Generator" className="rounded-lg border border-core/50 bg-flowgrid-surface p-4 space-y-3">
        <h2 className="text-lg font-semibold text-core">Generator</h2>
        <p className="text-slate-300">Tap to start a focus session.</p>
        <button type="button" onClick={handleStart} className="inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core">
          Start Focus Session
        </button>
        {lastRejection !== null ? (
          <p role="status" aria-live="polite" className="text-sm text-slate-400">
            {lastRejection}
          </p>
        ) : null}
      </section>
    );
  }

  const handleFinish = () => {
    if (snapshot === null) return;
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.floor(
      (new Date(endedAt).getTime() - new Date(activeSession.startedAt).getTime()) / 1000,
    );
    // D-08: sub-second finishes route through cancel — never record a zero session.
    if (durationSeconds <= 0) {
      setTooShort(true);
      const cancelCommand: CancelFocusSessionCommand = {
        type: 'cancel_focus_session',
        operationId: crypto.randomUUID(),
        cellId: cell.id,
      };
      const env = buildSessionEnv(snapshot.settings.localDayBoundary);
      void dispatch(cancelCommand, env, repository);
      return;
    }
    setTooShort(false);
    const env = buildSessionEnv(snapshot.settings.localDayBoundary);
    const command: CompleteFocusSessionCommand = {
      type: 'complete_focus_session',
      operationId: crypto.randomUUID(),
      cellId: cell.id,
      startedAt: activeSession.startedAt,
      endedAt,
      durationSeconds,
    };
    void dispatch(command, env, repository);
  };

  const handleCancel = () => {
    if (snapshot === null) return;
    setTooShort(false);
    const env = buildSessionEnv(snapshot.settings.localDayBoundary);
    const command: CancelFocusSessionCommand = {
      type: 'cancel_focus_session',
      operationId: crypto.randomUUID(),
      cellId: cell.id,
    };
    void dispatch(command, env, repository);
  };

  return (
    <section aria-label="Generator" className="rounded-lg border border-core/50 bg-flowgrid-surface p-4 space-y-3">
      <h2 className="text-lg font-semibold text-core">Generator</h2>
      <p className="text-slate-300">
        Session in progress: <SessionTimer startedAt={activeSession.startedAt} />
      </p>
      {tooShort ? (
        <p role="status" className="text-sm text-error">Session too short to record.</p>
      ) : null}
      <button type="button" onClick={handleFinish} className="inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core">
        Finish
      </button>
      <button type="button" onClick={handleCancel} className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
        Cancel
      </button>
    </section>
  );
}
