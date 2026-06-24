// RejuvenationSummary — inline completion panel (REJ-05, mirrors SessionSummary).
//
// Renders the four REJ-05 values after a rejuvenation completes: Charge processed,
// Integration gained, Module Tokens granted (if any), and the remaining Integration
// distance to the next threshold. This is an INLINE panel on the Core panel, not a
// modal — and it has NO dismiss logic (D-10): it stays mounted because its parent
// (CorePanel) keeps rendering it while `lastCompletedRejuvenation !== null`. The
// store clearing the field on the next dispatch handles dismissal.
//
// Boundary: all economy numbers come from the passed RejuvenationRecord + CoreRecord
// (durable truth). The only derived display value (distance to next threshold) uses
// the PURE content selector `nextIntegrationThreshold` — a pure function in
// src/content, NOT an economy mutation.

import type { CoreRecord, RejuvenationRecord } from '../../domain/index.js';
import { nextIntegrationThreshold } from '../../content/index.js';

interface RejuvenationSummaryProps {
  readonly rejuvenation: RejuvenationRecord;
  readonly core: CoreRecord;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s}s`;
}

export function RejuvenationSummary({ rejuvenation, core }: RejuvenationSummaryProps) {
  const nextThreshold = nextIntegrationThreshold(core.moduleTokens);
  const distanceToNext = Math.max(0, nextThreshold - core.integration);

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Rejuvenation summary"
      className="rounded-lg border border-core/50 bg-flowgrid-surface p-4 space-y-3"
    >
      <h3 className="text-base font-semibold text-core">Rejuvenation Complete</h3>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Charge Processed</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{rejuvenation.chargeConsumed}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Integration Gained</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{rejuvenation.integrationGained}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Tokens Granted</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{rejuvenation.tokensGranted}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Distance to Next</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{distanceToNext}</dd>
        </div>
      </dl>
      <p className="text-sm text-slate-400">
        Rested {formatDuration(rejuvenation.durationSeconds)} · next token at {nextThreshold} Integration.
      </p>
    </section>
  );
}
