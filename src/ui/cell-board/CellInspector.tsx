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
    <section aria-label={`Inspector for ${cell.name}`}>
      <dl>
        <div>
          <dt>XP</dt>
          <dd>{cell.xp}</dd>
        </div>
        <div>
          <dt>Momentum</dt>
          <dd>{cell.momentum}</dd>
        </div>
        <div>
          <dt>Charge</dt>
          <dd>{cell.charge}</dd>
        </div>
        <div>
          <dt>Daily Milestone</dt>
          <dd>
            {minutesLabel(cell.dailyMilestoneProgressSeconds)} /{' '}
            {minutesLabel(cell.dailyMilestoneTargetSeconds)}
          </dd>
        </div>
        <div>
          <dt>Activation</dt>
          <dd>{activatedToday ? 'Activated today' : 'Not activated'}</dd>
        </div>
      </dl>

      {recent.length > 0 ? (
        <ol aria-label="Recent sessions">
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
        <p>No sessions yet.</p>
      )}
    </section>
  );
}
