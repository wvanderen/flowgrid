// CorePanel — the /core route component (CORE-05 + CORE-02 + CORE-06 + REJ-01).
//
// The six-piece Core surface: Energy, Core Charge, Integration (current/next
// threshold), Module Tokens, and the convert/store allocation. Semantic non-canvas
// controls dispatch through the normal command path for allocation, the Activation
// boost, and the rejuvenation lifecycle (start → cosmetic timer → finish/cancel).
//
// Boundary (T-04-13): the UI never computes economy rules. All numbers come from the
// live snapshot / lastCompletedRejuvenation; the ONLY non-truth derivations are calls
// to the PURE content selectors nextIntegrationThreshold / activationBoostCost (pure
// functions in src/content, used for display labels — never economy mutation). This
// file dispatches command objects via `dispatch`; it never imports command handlers.

import { useState } from 'react';
import { Link } from 'react-router';

import type {
  CancelRejuvenationCommand,
  LogRejuvenationCommand,
  PurchaseActivationBoostCommand,
  SetCoreAllocationCommand,
  StartRejuvenationCommand,
} from '../../domain/index.js';

import { activationBoostCost, nextIntegrationThreshold } from '../../content/index.js';
import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';

import { RejuvenationSummary } from './RejuvenationSummary.js';
import { RejuvenationTimer } from './RejuvenationTimer.js';
import { nextCoreAction } from './nextCoreAction.js';

const CORE_SEED = 'flowgrid-core-seed';

function buildCoreEnv(localDayBoundary: string) {
  return makeEnv(new Date().toISOString(), { localDayBoundary }, CORE_SEED);
}

// Clamp a number-input value into the integer 0-100 range; NaN (empty input) → 0.
function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.floor(value)));
}

export function CorePanel() {
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const activeRejuvenation = useFlowgridStore((s) => s.activeRejuvenation);
  const lastCompletedRejuvenation = useFlowgridStore((s) => s.lastCompletedRejuvenation);
  const activeSession = useFlowgridStore((s) => s.activeSession);
  const lastRejection = useFlowgridStore((s) => s.lastRejection);

  // Allocation local state, seeded from the snapshot's core. The only writer of
  // allocation is this control, so after a successful Apply the snapshot and local
  // state agree (no re-seed needed).
  const [convertPct, setConvertPct] = useState(snapshot?.core.convertAllocationPercent ?? 50);
  const [storePct, setStorePct] = useState(snapshot?.core.storeAllocationPercent ?? 50);

  if (snapshot === null) {
    return (
      <section aria-label="Core loading" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <h2 className="text-3xl font-bold text-core">Core</h2>
        <p role="status" className="text-sm text-slate-400">Loading Core…</p>
      </section>
    );
  }

  const core = snapshot.core;
  const nextThreshold = nextIntegrationThreshold(core.moduleTokens);
  const hasActiveFocus = activeSession !== null;

  // --- Allocation control (CORE-02) ---
  const allocationSum = convertPct + storePct;
  const allocationValid = allocationSum === 100;

  const handleApplyAllocation = () => {
    const env = buildCoreEnv(snapshot.settings.localDayBoundary);
    const command: SetCoreAllocationCommand = {
      type: 'set_core_allocation',
      operationId: crypto.randomUUID(),
      convertAllocationPercent: convertPct,
      storeAllocationPercent: storePct,
    };
    void dispatch(command, env, repository);
  };

  // --- Activation boost (CORE-06) ---
  const boostLevel = core.activationBoostLevel;
  const boostCost = activationBoostCost(boostLevel);
  const atCap = boostCost === null;
  const cannotAfford = !atCap && core.energy < boostCost;
  const boostDisabled = atCap || cannotAfford;

  const handlePurchaseBoost = () => {
    const env = buildCoreEnv(snapshot.settings.localDayBoundary);
    const command: PurchaseActivationBoostCommand = {
      type: 'purchase_activation_boost',
      operationId: crypto.randomUUID(),
    };
    void dispatch(command, env, repository);
  };

  // --- Rejuvenation lifecycle (REJ-01, D-02 mutual exclusion) ---
  const handleStartRejuvenation = () => {
    const env = buildCoreEnv(snapshot.settings.localDayBoundary);
    const command: StartRejuvenationCommand = {
      type: 'start_rejuvenation',
      operationId: crypto.randomUUID(),
    };
    void dispatch(command, env, repository);
  };

  const handleFinishRejuvenation = () => {
    if (activeRejuvenation === null) return;
    const endedAt = new Date().toISOString();
    const env = buildCoreEnv(snapshot.settings.localDayBoundary);
    const command: LogRejuvenationCommand = {
      type: 'log_rejuvenation',
      operationId: crypto.randomUUID(),
      startedAt: activeRejuvenation.startedAt,
      endedAt,
    };
    void dispatch(command, env, repository);
  };

  const handleCancelRejuvenation = () => {
    const env = buildCoreEnv(snapshot.settings.localDayBoundary);
    const command: CancelRejuvenationCommand = {
      type: 'cancel_rejuvenation',
      operationId: crypto.randomUUID(),
    };
    void dispatch(command, env, repository);
  };

  return (
    <section aria-label="Core" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-core">Core</h2>
        <Link to="/" className="text-sm text-slate-400 underline">Home</Link>
      </div>

      {/* CORE-05 six-piece stat grid. */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Energy</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{core.energy}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Core Charge</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{core.coreCharge}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Integration</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{core.integration} / {nextThreshold}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Module Tokens</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{core.moduleTokens}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Convert %</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{core.convertAllocationPercent}</dd>
        </div>
        <div className="rounded-md bg-slate-900/40 p-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Store %</dt>
          <dd className="mt-1 text-base font-semibold text-slate-100">{core.storeAllocationPercent}</dd>
        </div>
      </dl>

      {/* CORE-02 allocation control. */}
      <section aria-label="Core allocation" className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Allocation</h3>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm text-slate-300">
            Convert %
            <input
              type="number"
              min={0}
              max={100}
              value={convertPct}
              onChange={(e) => setConvertPct(clampPercent(e.target.valueAsNumber))}
              className="ml-2 w-20 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
            />
          </label>
          <label className="text-sm text-slate-300">
            Store %
            <input
              type="number"
              min={0}
              max={100}
              value={storePct}
              onChange={(e) => setStorePct(clampPercent(e.target.valueAsNumber))}
              className="ml-2 w-20 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
            />
          </label>
          <button type="button" onClick={handleApplyAllocation} className="inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core">
            Apply Allocation
          </button>
        </div>
        {!allocationValid ? (
          <p role="status" aria-live="polite" className="text-sm text-error">
            Convert + Store must total exactly 100 (currently {allocationSum}).
          </p>
        ) : null}
      </section>

      {/* CORE-06 Activation boost. */}
      <section aria-label="Activation boost" className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Activation Boost</h3>
        <p className="text-sm text-slate-400">
          Level {boostLevel} {atCap ? '(max)' : `· next level costs ${boostCost} Energy`}
        </p>
        <button
          type="button"
          onClick={handlePurchaseBoost}
          disabled={boostDisabled}
          aria-describedby="boost-help"
          className={boostDisabled
            ? 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg opacity-50 cursor-not-allowed'
            : 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core'}
        >
          Purchase Boost
        </button>
        <p id="boost-help" role="status" aria-live="polite" className="text-sm text-slate-400">
          {atCap
            ? 'Already at the maximum boost level.'
            : cannotAfford
              ? `Need ${boostCost} Energy to purchase (have ${core.energy}).`
              : `Each level adds +5% Current on Activated focus sessions.`}
        </p>
      </section>

      {/* REJ-01 rejuvenation lifecycle. */}
      <section aria-label="Rejuvenation" className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Rejuvenation</h3>
        {activeRejuvenation === null ? (
          <>
            <p className="text-slate-300">Process stored Core Charge into Integration.</p>
            <button
              type="button"
              onClick={handleStartRejuvenation}
              disabled={hasActiveFocus}
              aria-describedby="rejuvenation-help"
              className={hasActiveFocus
                ? 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg opacity-50 cursor-not-allowed'
                : 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core'}
            >
              Start Rejuvenation
            </button>
            {hasActiveFocus ? (
              <p id="rejuvenation-help" role="status" aria-live="polite" className="text-sm text-slate-400">
                A focus session is active — finish it before rejuvenating.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-slate-300">
              Rejuvenation in progress: <RejuvenationTimer startedAt={activeRejuvenation.startedAt} />
            </p>
            <button type="button" onClick={handleFinishRejuvenation} className="inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core">
              Finish
            </button>
            <button type="button" onClick={handleCancelRejuvenation} className="ml-2 inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
              Cancel
            </button>
          </>
        )}
      </section>

      {/* REJ-05 persisting summary (D-10: no dismiss — stays until next dispatch). */}
      {lastCompletedRejuvenation !== null ? (
        <RejuvenationSummary rejuvenation={lastCompletedRejuvenation} core={core} />
      ) : null}

      {/* Surfaced rejection (allocation total / boost / rejuvenation mutual exclusion). */}
      {lastRejection !== null ? (
        <p role="status" aria-live="polite" className="rounded-md bg-slate-900/40 px-3 py-2 text-sm text-error">{lastRejection}</p>
      ) : null}

      {/* Next-action hint (pure selector). */}
      <p aria-label="Next core action" className="rounded-md bg-slate-900/40 px-3 py-2 text-sm text-core">
        {nextCoreAction(core, hasActiveFocus)}
      </p>
    </section>
  );
}
