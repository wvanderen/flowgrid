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
    <section role="status" aria-live="polite" aria-label="Session summary">
      <h2>Session Complete</h2>
      <dl>
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(session.durationSeconds)}</dd>
        </div>
        <div>
          <dt>Current</dt>
          <dd>{session.currentGenerated}</dd>
        </div>
        <div>
          <dt>XP</dt>
          <dd>{session.xpGained}</dd>
        </div>
        <div>
          <dt>Milestone</dt>
          <dd>{milestonePct}%</dd>
        </div>
        <div>
          <dt>Bloom</dt>
          <dd>{session.bloomFired ? 'Bloom fired!' : 'No Bloom yet'}</dd>
        </div>
        <div>
          <dt>Activation</dt>
          <dd>{session.activationGranted ? 'Cell Activated' : 'Not activated'}</dd>
        </div>
        <div>
          <dt>Energy</dt>
          <dd>{session.energyGained}</dd>
        </div>
        <div>
          <dt>Core Charge</dt>
          <dd>{session.coreChargeGained}</dd>
        </div>
      </dl>

      {!coreRouted ? <p>Core routing arrives in Phase 4.</p> : null}

      <p aria-label="Next useful action">{action}</p>
    </section>
  );
}
