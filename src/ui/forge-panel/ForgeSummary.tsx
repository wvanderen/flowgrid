// ForgeSummary — inline completion panel (D-11, MOD-06). Mirrors
// RejuvenationSummary.tsx exactly in structure: an inline <section role="status"
// aria-live="polite"> rendered by ForgePanel while lastCompletedForge !== null.
// This is an INLINE panel (overlay panels obstruct the protected Generator flow —
// prohibition 1) and is NOT ephemeral (too fleeting for a build-choice moment —
// D-11). It has NO dismiss logic: the store clearing lastCompletedForge on the next
// dispatch handles dismissal (D-10 no auto-dismiss — mirrors lastCompletedRejuvenation).
//
// Boundary (T-05-14): all economy numbers come from the passed ForgeHistoryRecord
// + CoreRecord (durable truth). The only derived display values use PURE content
// selectors (forgeEnergyCost for the next-cost hint, MODULE_LEVEL_BONUS for effect
// text) — NEVER economy mutation. This file dispatches nothing.

import type { CoreRecord, ForgeHistoryRecord } from '../../domain/index.js';
import { forgeEnergyCost } from '../../content/index.js';

import { KIND_LABELS } from './ForgeChoiceList.js';

interface ForgeSummaryProps {
  readonly forge: ForgeHistoryRecord;
  readonly core: CoreRecord;
  readonly cellNameById: ReadonlyMap<string, string>;
}

export function ForgeSummary({ forge, core, cellNameById }: ForgeSummaryProps) {
  const paymentLabel =
    forge.paymentType === 'token'
      ? `${forge.paymentAmount} token`
      : `${forge.paymentAmount} energy`;
  const chosenKindLabel = KIND_LABELS[forge.chosenReward.moduleKind];
  const chosenCellName = cellNameById.get(forge.chosenReward.cellId) ?? forge.chosenReward.cellId;
  const nextEnergyCost = forgeEnergyCost(core.forgeCount);

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Forge summary"
      className="rounded-lg border border-core/50 bg-flowgrid-surface p-4 space-y-3"
    >
      <h3 className="text-base font-semibold text-core">Forge Complete</h3>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Payment</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{paymentLabel}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Forge Count</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{forge.forgeCount}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Module Upgraded</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{chosenKindLabel}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Level</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">
            {forge.chosenReward.fromLevel} → {forge.chosenReward.toLevel}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-slate-400">
        {chosenKindLabel} on {chosenCellName} advanced to level {forge.chosenReward.toLevel}.
        {' '}Next Energy roll costs {nextEnergyCost}.
      </p>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Offered choices</p>
        <ul className="mt-1 space-y-0.5">
          {forge.offeredChoices.map((c) => {
            const name = cellNameById.get(c.cellId) ?? c.cellId;
            return (
              <li key={`${c.cellId}:${c.moduleKind}`} className="text-xs text-slate-400">
                {KIND_LABELS[c.moduleKind]} · {name}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
