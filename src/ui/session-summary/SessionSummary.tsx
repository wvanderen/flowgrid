// SessionSummary — inline completion panel (SESS-05).
//
// Renders the full SESS-05 content list after a focus session completes: duration,
// Current generated, XP gained, daily-milestone progress, Bloom status, Activation
// status, and the Energy / Core Charge outcome (0 in Phase 3 — Core routing is a
// Phase 4 system, surfaced as a note when both are 0). At the bottom, the pure
// nextUsefulAction hint is shown. This is an INLINE panel on the Cell Board, not a
// modal — per RESEARCH Open Question Q3 a modal would block the Generator.

import type {
  CellRecord,
  SessionRecord,
  SettingsRecord,
} from '../../domain/index.js';

import { nextUsefulAction } from './nextAction.js';

interface SessionSummaryProps {
  readonly session: SessionRecord;
  readonly cell: CellRecord;
  readonly settings: SettingsRecord;
  readonly localDate: string;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s}s`;
}

export function SessionSummary({
  session,
  cell,
  settings,
  localDate,
}: SessionSummaryProps) {
  const action = nextUsefulAction(cell, settings, localDate);
  const milestonePct =
    cell.dailyMilestoneTargetSeconds > 0
      ? Math.round(
          (cell.dailyMilestoneProgressSeconds /
            cell.dailyMilestoneTargetSeconds) *
            100,
        )
      : 0;
  // Phase 3 has no Core routing; both are 0. Surface a Phase 4 note in that case.
  const coreRouted = session.energyGained > 0 || session.coreChargeGained > 0;

  return (
    <section role="status" aria-live="polite" aria-label="Session summary" className="rounded-lg border border-core/50 bg-flowgrid-surface p-4 space-y-3">
      <h2 className="text-lg font-semibold text-core">Session Complete</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Duration</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{formatDuration(session.durationSeconds)}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Current</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{session.currentGenerated}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">XP</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{session.xpGained}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Milestone</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{milestonePct}%</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Bloom</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{session.bloomFired ? 'Bloom fired!' : 'No Bloom yet'}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Activation</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{session.activationGranted ? 'Cell Activated' : 'Not activated'}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Energy</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{session.energyGained}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Core Charge</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{session.coreChargeGained}</dd>
        </div>
      </dl>

      {!coreRouted ? <p className="text-sm text-slate-400">Core routing arrives in Phase 4.</p> : null}

      <p aria-label="Next useful action" className="rounded-md bg-slate-900/40 px-3 py-2 text-sm text-core">{action}</p>
    </section>
  );
}
