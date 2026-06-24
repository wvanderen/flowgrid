// CellInspector — read-only economy + Activation summary for a Cell (CELL-02).
//
// Renders an accessible description list (<dl>) with XP, Momentum, Charge, daily
// milestone progress (seconds / target as "Xm / Ym"), the derived Activation state
// ("Activated today" when lastBloomLocalDate === today's local date, else "Not
// activated"), and a compact recent-sessions list. All values are read straight
// from the CellRecord / snapshot; no mutation.

import type {
  CellRecord,
  FlowgridSnapshot,
  SettingsRecord,
} from '../../domain/index.js';
import { getRecentSessions } from '../../simulation/selectors.js';
import { deriveLocalDate } from '../../simulation/systems/day-rollover.js';

interface CellInspectorProps {
  readonly cell: CellRecord;
  readonly snapshot: FlowgridSnapshot;
  readonly settings: SettingsRecord;
}

function minutesLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)}m`;
}

export function CellInspector({ cell, snapshot, settings }: CellInspectorProps) {
  const today = deriveLocalDate(new Date().toISOString(), settings.localDayBoundary);
  const activatedToday = cell.lastBloomLocalDate === today;
  const recent = getRecentSessions(snapshot, 5);

  return (
    <section aria-label={`Inspector for ${cell.name}`} className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">XP</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-100">{cell.xp}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Momentum</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-100">{cell.momentum}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Charge</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-100">{cell.charge}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Daily Milestone</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-100">
            {minutesLabel(cell.dailyMilestoneProgressSeconds)} /{' '}
            {minutesLabel(cell.dailyMilestoneTargetSeconds)}
          </dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Activation</dt>
          <dd className={activatedToday ? 'mt-1 text-lg font-semibold text-cell-activated' : 'mt-1 text-lg font-semibold text-slate-100'}>{activatedToday ? 'Activated today' : 'Not activated'}</dd>
        </div>
      </dl>

      {recent.length > 0 ? (
        <ol aria-label="Recent sessions" className="space-y-1 text-sm text-slate-400">
          {recent.map((session) => (
            <li key={session.id}>
              <time dateTime={session.startedAt}>
                {new Date(session.startedAt).toLocaleDateString()}
              </time>{' '}
              — {Math.floor(session.durationSeconds / 60)}m —{' '}
              {session.currentGenerated} Current
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-slate-400">No sessions yet.</p>
      )}
    </section>
  );
}
