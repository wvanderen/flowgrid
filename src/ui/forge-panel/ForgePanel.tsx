// ForgePanel — the /forge route component (D-10, MOD-03, MOD-06). Mirrors CorePanel
// as the closest peer route. Shows current Module Tokens, current Energy, the next
// Energy cost (forgeEnergyCost(core.forgeCount) — pure content derivation, D-02),
// the 3 revealed choices (forgeChoices(snapshot) — pure selector, UI/sim boundary),
// Token + Energy roll controls that gate on affordability + reveal availability,
// and an inline ForgeSummary on success.
//
// UX flow (D-10): the user taps "Roll with Token" or "Roll with Energy" to set the
// pending paymentType, then taps a choice's "Pick" button to commit. The committed
// dispatch carries the correct paymentType + chosenReward. Navigating away and
// returning re-derives the same 3 choices from forgeCount (nothing spent yet).
//
// Boundary (T-05-11): the UI never computes economy rules and never imports the
// run_forge handler. All numbers come from the live snapshot / lastCompletedForge;
// the ONLY non-truth derivations are calls to the PURE content selector
// forgeEnergyCost + the PURE simulation selector forgeChoices (both reads). This
// file dispatches command objects via `dispatch`.
//
// Protected Generator flow (prohibition 1, Pitfall 7): ForgeSummary is an INLINE
// panel (overlay surfaces obstruct the open app → tap Cell → start session flow).
// The Forge chip that navigates here lives in the ReturnCues rail on Home (above
// the canvas) and never intercepts the Cell tap.

import { useState } from 'react';
import { Link } from 'react-router';

import type { RunForgeCommand } from '../../domain/index.js';

import { forgeEnergyCost } from '../../content/index.js';
import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';
import { forgeChoices } from '../../simulation/commands/forge-choices.js';

import { ForgeChoiceList } from './ForgeChoiceList.js';
import { ForgeSummary } from './ForgeSummary.js';

const FORGE_SEED = 'flowgrid-forge-seed';

function buildForgeEnv(localDayBoundary: string) {
  return makeEnv(new Date().toISOString(), { localDayBoundary }, FORGE_SEED);
}

export function ForgePanel() {
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const lastCompletedForge = useFlowgridStore((s) => s.lastCompletedForge);
  const lastRejection = useFlowgridStore((s) => s.lastRejection);

  // The pending payment type the user selected before picking a choice. Null until
  // they tap a roll button; defaults to 'token' at pick time if unset.
  const [pendingPaymentType, setPendingPaymentType] = useState<'token' | 'energy' | null>(null);

  if (snapshot === null) {
    return (
      <section aria-label="Forge loading" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <h2 className="text-3xl font-bold text-core">Forge</h2>
        <p role="status" className="text-sm text-slate-400">Loading Forge…</p>
      </section>
    );
  }

  const core = snapshot.core;
  const nextEnergyCost = forgeEnergyCost(core.forgeCount);
  const revealed = forgeChoices(snapshot);
  const noChoices = revealed.length === 0;
  const canRollToken = core.moduleTokens >= 1 && !noChoices;
  const canRollEnergy = core.energy >= nextEnergyCost && !noChoices;

  const cellNameById: ReadonlyMap<string, string> = new Map(
    [...snapshot.cells.values()].map((c) => [c.id, c.name]),
  );

  const handlePick = (choice: { cellId: string; moduleKind: 'generator' | 'charge_core' | 'output' | 'bloom' }) => {
    const paymentType = pendingPaymentType ?? 'token';
    const env = buildForgeEnv(snapshot.settings.localDayBoundary);
    const command: RunForgeCommand = {
      type: 'run_forge',
      operationId: crypto.randomUUID(),
      paymentType,
      chosenReward: { cellId: choice.cellId, moduleKind: choice.moduleKind },
    };
    void dispatch(command, env, repository);
  };

  return (
    <section aria-label="Forge" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-core">Forge</h2>
        <Link to="/" className="text-sm text-slate-400 underline">Home</Link>
      </div>

      {/* Stat readout: current Tokens, current Energy, next Energy cost (D-10). */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Module Tokens</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{core.moduleTokens}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Energy</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{core.energy}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Next Energy Cost</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{nextEnergyCost}</dd>
        </div>
      </dl>

      {/* Roll controls: set the pending paymentType before picking (D-10). */}
      <section aria-label="Forge roll" className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Choose a payment</h3>
        {noChoices ? (
          <p role="status" aria-live="polite" className="text-sm text-slate-400">
            All starter modules are at max level — no Forge choices available.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setPendingPaymentType('token')}
            disabled={!canRollToken}
            aria-describedby="forge-help"
            className={
              pendingPaymentType === 'token'
                ? 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg ring-2 ring-core'
                : canRollToken
                  ? 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core'
                  : 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg opacity-50 cursor-not-allowed'
            }
          >
            Roll with Token
          </button>
          <button
            type="button"
            onClick={() => setPendingPaymentType('energy')}
            disabled={!canRollEnergy}
            aria-describedby="forge-help"
            className={
              pendingPaymentType === 'energy'
                ? 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg ring-2 ring-core'
                : canRollEnergy
                  ? 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core'
                  : 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg opacity-50 cursor-not-allowed'
            }
          >
            Roll with Energy
          </button>
        </div>
        <p id="forge-help" role="status" aria-live="polite" className="text-sm text-slate-400">
          {pendingPaymentType === null
            ? 'Pick a payment, then choose one of the revealed upgrades below.'
            : pendingPaymentType === 'token'
              ? `Spending 1 Module Token on your next pick. ${core.moduleTokens} available.`
              : `Spending ${nextEnergyCost} Energy on your next pick. ${core.energy} available.`}
        </p>
      </section>

      {/* The 3 revealed choices (pure forgeChoices selector — UI/sim boundary). */}
      <section aria-label="Forge choices" className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Revealed choices</h3>
        <ForgeChoiceList
          choices={revealed}
          cellNameById={cellNameById}
          onPick={handlePick}
          disabled={pendingPaymentType === null}
        />
      </section>

      {/* D-11 inline summary (renders in-page — stays until next dispatch). */}
      {lastCompletedForge !== null ? (
        <ForgeSummary forge={lastCompletedForge} core={core} cellNameById={cellNameById} />
      ) : null}

      {/* Surfaced rejection (insufficient payment / chosen-not-in-revealed / slot-at-capacity). */}
      {lastRejection !== null ? (
        <p role="status" aria-live="polite" className="rounded-md bg-slate-900/40 px-3 py-2 text-sm text-error">{lastRejection}</p>
      ) : null}
    </section>
  );
}
