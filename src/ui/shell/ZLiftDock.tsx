// ZLiftDock — first-viewport selection inspector for the living Flowgrid diagram.
//
// This began as a small semantic Z-Lift dock, but the Phase 6.1 cockpit pivot makes
// it the primary inspector beside/below the persistent canvas. It supports three
// modes: home/no selection, selected Cell, and selected Core. The inspector only
// dispatches normal simulation commands; no economy truth is computed here.

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Battery,
  Check,
  Flower,
  Play,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import type {
  CancelFocusSessionCommand,
  CancelRejuvenationCommand,
  CellId,
  CellRecord,
  CompleteFocusSessionCommand,
  FlowgridSnapshot,
  LogRejuvenationCommand,
  ModuleDefinitionKind,
  PurchaseActivationBoostCommand,
  SetCoreAllocationCommand,
  StartFocusSessionCommand,
  StartRejuvenationCommand,
} from '../../domain/index.js';
import {
  MODULE_LEVEL_BONUS,
  activationBoostCost,
  forgeEnergyCost,
  nextIntegrationThreshold,
} from '../../content/index.js';
import { makeEnv } from '../../app/env.js';
import { repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';
import { getCellById } from '../../simulation/selectors.js';
import { deriveLocalDate } from '../../simulation/systems/day-rollover.js';
import { findModuleInstanceForCell } from '../../simulation/systems/modules.js';
import { RejuvenationSummary } from '../core-panel/RejuvenationSummary.js';
import { RejuvenationTimer } from '../core-panel/RejuvenationTimer.js';
import { nextCoreAction } from '../core-panel/nextCoreAction.js';
import { CellActions } from '../cell-board/CellActions.js';
import { SessionTimer } from '../cell-board/SessionTimer.js';
import { SessionSummary } from '../session-summary/SessionSummary.js';

const SESSION_SEED = 'flowgrid-z-lift-dock-seed';
const CORE_SEED = 'flowgrid-core-inspector-seed';

const STARTER_TILES: readonly {
  readonly kind: ModuleDefinitionKind;
  readonly label: string;
  readonly icon: LucideIcon;
}[] = [
  { kind: 'generator', label: 'Generator', icon: Zap },
  { kind: 'charge_core', label: 'Charge Core', icon: Battery },
  { kind: 'output', label: 'Output', icon: ArrowRight },
  { kind: 'bloom', label: 'Bloom', icon: Flower },
];

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.floor(value)));
}

function minutesLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)}m`;
}

function buildEnv(localDayBoundary: string, seed: string) {
  return makeEnv(new Date().toISOString(), { localDayBoundary }, seed);
}

export function ZLiftDock() {
  const selectedCellId = useFlowgridStore((s) => s.selectedCellId);
  const selectedCore = useFlowgridStore((s) => s.selectedCore);
  const snapshot = useFlowgridStore((s) => s.snapshot);

  if (snapshot === null) return null;

  if (selectedCore) {
    return <CoreInspector snapshot={snapshot} />;
  }

  if (selectedCellId !== null) {
    const cell = getCellById(snapshot, selectedCellId);
    if (cell !== undefined) {
      return <CellInspectorDock snapshot={snapshot} cell={cell} selectedCellId={selectedCellId} />;
    }
  }

  const activeCells = [...snapshot.cells.values()].filter((c) => c.archivedAt === null);
  return (
    <aside
      aria-label="Flowgrid inspector"
      className="space-y-3"
    >
      <div className="flowgrid-floating-surface space-y-4 rounded-lg p-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-100">Living diagram</h2>
          <p className="text-sm text-slate-400">
            Select a Cell or the Core to inspect signal and act.
          </p>
        </header>
        <dl className="grid grid-cols-3 gap-2">
          <Stat label="Cells" value={activeCells.length} />
          <Stat label="Charge" value={snapshot.core.coreCharge} />
          <Stat label="Energy" value={snapshot.core.energy} />
        </dl>
        <Link
          to="/core"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-core"
        >
          <Sparkles aria-hidden="true" className="h-4 w-4 text-core" />
          Inspect Core
        </Link>
      </div>
    </aside>
  );
}

interface CellInspectorDockProps {
  readonly snapshot: FlowgridSnapshot;
  readonly cell: CellRecord;
  readonly selectedCellId: CellId;
}

function CellInspectorDock({ snapshot, cell, selectedCellId }: CellInspectorDockProps) {
  const activeSession = useFlowgridStore((s) => s.activeSession);
  const lastCompletedSession = useFlowgridStore((s) => s.lastCompletedSession);
  const lastRejection = useFlowgridStore((s) => s.lastRejection);
  const [tooShort, setTooShort] = useState(false);

  const isThisCellActive = activeSession?.cellId === selectedCellId;
  const anotherCellActive = activeSession !== null && activeSession.cellId !== selectedCellId;
  const localDate = deriveLocalDate(
    new Date().toISOString(),
    snapshot.settings.localDayBoundary,
  );
  const activatedToday = cell.lastBloomLocalDate === localDate;
  const recent = snapshot.sessions
    .filter((session) => session.cellId === selectedCellId)
    .slice(-3)
    .reverse();
  const showSummary =
    lastCompletedSession !== null && lastCompletedSession.cellId === selectedCellId;

  const handleStart = () => {
    const command: StartFocusSessionCommand = {
      type: 'start_focus_session',
      operationId: crypto.randomUUID(),
      cellId: selectedCellId,
    };
    void dispatch(command, buildEnv(snapshot.settings.localDayBoundary, SESSION_SEED), repository);
  };

  const handleFinish = () => {
    if (activeSession === null) return;
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.floor(
      (new Date(endedAt).getTime() - new Date(activeSession.startedAt).getTime()) / 1000,
    );
    if (durationSeconds <= 0) {
      setTooShort(true);
      const cancelCommand: CancelFocusSessionCommand = {
        type: 'cancel_focus_session',
        operationId: crypto.randomUUID(),
        cellId: selectedCellId,
      };
      void dispatch(cancelCommand, buildEnv(snapshot.settings.localDayBoundary, SESSION_SEED), repository);
      return;
    }
    setTooShort(false);
    const command: CompleteFocusSessionCommand = {
      type: 'complete_focus_session',
      operationId: crypto.randomUUID(),
      cellId: selectedCellId,
      startedAt: activeSession.startedAt,
      endedAt,
      durationSeconds,
    };
    void dispatch(command, buildEnv(snapshot.settings.localDayBoundary, SESSION_SEED), repository);
  };

  const handleCancel = () => {
    setTooShort(false);
    const command: CancelFocusSessionCommand = {
      type: 'cancel_focus_session',
      operationId: crypto.randomUUID(),
      cellId: selectedCellId,
    };
    void dispatch(command, buildEnv(snapshot.settings.localDayBoundary, SESSION_SEED), repository);
  };

  return (
    <aside
      aria-label={`Controls for ${cell.name}`}
      className="space-y-3 xl:max-h-[calc(100vh-10rem)] xl:overflow-auto"
    >
      <div className="space-y-3">
        <header className="flowgrid-floating-surface space-y-3 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">{cell.name}</h2>
              <p className="text-sm text-slate-400">
                {activatedToday ? 'Activated today' : 'Not activated'} · {minutesLabel(cell.dailyMilestoneProgressSeconds)} / {minutesLabel(cell.dailyMilestoneTargetSeconds)}
              </p>
            </div>
            <span className="rounded-md border border-slate-700/60 bg-slate-950/30 px-2 py-1 text-xs font-medium text-slate-300">
              Cell
            </span>
          </div>
          <dl className="grid grid-cols-3 gap-2">
            <Stat label="Charge" value={cell.charge} />
            <Stat label="XP" value={cell.xp} />
            <Stat label="Momentum" value={cell.momentum} />
          </dl>
        </header>

        <section aria-label="Generator" className="flowgrid-floating-surface flowgrid-spotlight-action space-y-3 rounded-lg p-3">
          <h3 className="text-base font-semibold text-core">Generator</h3>
          {!isThisCellActive ? (
            <>
              <button
                type="button"
                onClick={handleStart}
                disabled={anotherCellActive}
                aria-describedby={anotherCellActive ? 'dock-another-active' : undefined}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-core px-3 py-2 text-sm font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play aria-hidden="true" className="h-4 w-4" />
                Start Focus Session
              </button>
              {anotherCellActive ? (
                <p id="dock-another-active" role="status" aria-live="polite" className="text-sm text-slate-400">
                  Another focus session is active
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-slate-300">
                In progress: <SessionTimer startedAt={activeSession.startedAt} />
              </p>
              {tooShort ? (
                <p role="status" className="text-sm text-error">Session too short to record.</p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-core px-3 py-2 text-sm font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core"
                >
                  <Check aria-hidden="true" className="h-4 w-4" />
                  Finish
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </>
          )}
          {lastRejection !== null ? (
            <p role="status" aria-live="polite" className="text-sm text-error">
              {lastRejection}
            </p>
          ) : null}
        </section>

        {showSummary ? (
          <SessionSummary
            session={lastCompletedSession!}
            cell={cell}
            settings={snapshot.settings}
            localDate={localDate}
          />
        ) : null}

        <section aria-label="Modules" className="flowgrid-floating-surface space-y-2 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-slate-200">Modules</h3>
          <div className="grid grid-cols-2 gap-2">
            {STARTER_TILES.map((tile) => (
              <ModuleChip
                key={tile.kind}
                snapshot={snapshot}
                cellId={cell.id}
                kind={tile.kind}
                label={tile.label}
                Icon={tile.icon}
              />
            ))}
          </div>
        </section>

        <section aria-label="Recent sessions" className="flowgrid-floating-surface space-y-2 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-slate-200">Recent sessions</h3>
          {recent.length > 0 ? (
            <ol className="space-y-1 text-sm text-slate-400">
              {recent.map((session) => (
                <li key={session.id} className="flex justify-between gap-3">
                  <time dateTime={session.startedAt}>{new Date(session.startedAt).toLocaleDateString()}</time>
                  <span>{Math.floor(session.durationSeconds / 60)}m · {session.currentGenerated} Current</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-400">No sessions yet.</p>
          )}
        </section>

        <CellActions cellId={cell.id} />
      </div>
    </aside>
  );
}

interface ModuleChipProps {
  readonly snapshot: FlowgridSnapshot;
  readonly cellId: CellId;
  readonly kind: ModuleDefinitionKind;
  readonly label: string;
  readonly Icon: LucideIcon;
}

function ModuleChip({ snapshot, cellId, kind, label, Icon }: ModuleChipProps) {
  const instance = findModuleInstanceForCell(snapshot, cellId, kind);
  const level = instance?.level ?? 0;
  const perLevel = MODULE_LEVEL_BONUS[kind];
  const levelEffect = level * perLevel;
  const isBloom = kind === 'bloom';
  return (
    <div role="group" aria-label={label} className="rounded-md border border-slate-700/45 bg-slate-950/20 p-2">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="h-4 w-4 text-core" />
        <h4 className="text-sm font-semibold text-slate-100">{label} · Lv {level}</h4>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {isBloom ? `+${levelEffect} activation` : `+${levelEffect}%`}
      </p>
    </div>
  );
}

interface CoreInspectorProps {
  readonly snapshot: FlowgridSnapshot;
}

function CoreInspector({ snapshot }: CoreInspectorProps) {
  const activeSession = useFlowgridStore((s) => s.activeSession);
  const activeRejuvenation = useFlowgridStore((s) => s.activeRejuvenation);
  const lastCompletedRejuvenation = useFlowgridStore((s) => s.lastCompletedRejuvenation);
  const lastRejection = useFlowgridStore((s) => s.lastRejection);
  const core = snapshot.core;
  const [convertPct, setConvertPct] = useState(core.convertAllocationPercent);
  const [storePct, setStorePct] = useState(core.storeAllocationPercent);

  useEffect(() => {
    setConvertPct(core.convertAllocationPercent);
    setStorePct(core.storeAllocationPercent);
  }, [core.convertAllocationPercent, core.storeAllocationPercent]);

  const nextThreshold = nextIntegrationThreshold(core.moduleTokens);
  const allocationSum = convertPct + storePct;
  const allocationValid = allocationSum === 100;
  const hasActiveFocus = activeSession !== null;
  const boostCost = activationBoostCost(core.activationBoostLevel);
  const boostAtCap = boostCost === null;
  const cannotAffordBoost = !boostAtCap && core.energy < boostCost;
  const nextForgeEnergyCost = forgeEnergyCost(core.forgeCount);
  const canForge = core.moduleTokens > 0 || core.energy >= nextForgeEnergyCost;

  const handleApplyAllocation = () => {
    const command: SetCoreAllocationCommand = {
      type: 'set_core_allocation',
      operationId: crypto.randomUUID(),
      convertAllocationPercent: convertPct,
      storeAllocationPercent: storePct,
    };
    void dispatch(command, buildEnv(snapshot.settings.localDayBoundary, CORE_SEED), repository);
  };

  const handlePurchaseBoost = () => {
    const command: PurchaseActivationBoostCommand = {
      type: 'purchase_activation_boost',
      operationId: crypto.randomUUID(),
    };
    void dispatch(command, buildEnv(snapshot.settings.localDayBoundary, CORE_SEED), repository);
  };

  const handleStartRejuvenation = () => {
    const command: StartRejuvenationCommand = {
      type: 'start_rejuvenation',
      operationId: crypto.randomUUID(),
    };
    void dispatch(command, buildEnv(snapshot.settings.localDayBoundary, CORE_SEED), repository);
  };

  const handleFinishRejuvenation = () => {
    if (activeRejuvenation === null) return;
    const command: LogRejuvenationCommand = {
      type: 'log_rejuvenation',
      operationId: crypto.randomUUID(),
      startedAt: activeRejuvenation.startedAt,
      endedAt: new Date().toISOString(),
    };
    void dispatch(command, buildEnv(snapshot.settings.localDayBoundary, CORE_SEED), repository);
  };

  const handleCancelRejuvenation = () => {
    const command: CancelRejuvenationCommand = {
      type: 'cancel_rejuvenation',
      operationId: crypto.randomUUID(),
    };
    void dispatch(command, buildEnv(snapshot.settings.localDayBoundary, CORE_SEED), repository);
  };

  return (
    <aside
      aria-label="Controls for Core"
      className="space-y-3 xl:max-h-[calc(100vh-10rem)] xl:overflow-auto"
    >
      <div className="space-y-3">
        <header className="flowgrid-floating-surface space-y-3 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-core">Core</h2>
              <p className="text-sm text-slate-400">{nextCoreAction(core, hasActiveFocus)}</p>
            </div>
            <span className="rounded-md border border-core/30 bg-core/10 px-2 py-1 text-xs font-semibold text-core">
              Selected
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            <Stat label="Core Charge" value={core.coreCharge} />
            <Stat label="Energy" value={core.energy} />
            <Stat label="Integration" value={`${core.integration} / ${nextThreshold}`} />
            <Stat label="Tokens" value={core.moduleTokens} />
          </dl>
        </header>

        <section aria-label="Core allocation" className="flowgrid-floating-surface space-y-3 rounded-lg p-3">
          <h3 className="text-base font-semibold text-slate-200">Allocation</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-slate-300">
              Convert %
              <input
                type="number"
                min={0}
                max={100}
                value={convertPct}
                onChange={(e) => setConvertPct(clampPercent(e.target.valueAsNumber))}
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-core"
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
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-core"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleApplyAllocation}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-core px-3 py-2 text-sm font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core"
          >
            Apply Allocation
          </button>
          {!allocationValid ? (
            <p role="status" aria-live="polite" className="text-sm text-error">
              Convert + Store must total 100 (currently {allocationSum}).
            </p>
          ) : null}
        </section>

        <section aria-label="Rejuvenation" className="flowgrid-floating-surface flowgrid-spotlight-action space-y-3 rounded-lg p-3">
          <h3 className="text-base font-semibold text-slate-200">Rejuvenation</h3>
          {activeRejuvenation === null ? (
            <>
              <p className="text-sm text-slate-400">Process stored Core Charge into Integration.</p>
              <button
                type="button"
                onClick={handleStartRejuvenation}
                disabled={hasActiveFocus}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-core px-3 py-2 text-sm font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Rejuvenation
              </button>
              {hasActiveFocus ? (
                <p role="status" aria-live="polite" className="text-sm text-slate-400">
                  Finish the active focus session before rejuvenating.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-slate-300">
                In progress: <RejuvenationTimer startedAt={activeRejuvenation.startedAt} />
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFinishRejuvenation}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-core px-3 py-2 text-sm font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core"
                >
                  Finish
                </button>
                <button
                  type="button"
                  onClick={handleCancelRejuvenation}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </section>

        <section aria-label="Core opportunities" className="flowgrid-floating-surface space-y-3 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePurchaseBoost}
              disabled={boostAtCap || cannotAffordBoost}
              className="min-h-11 rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-core disabled:cursor-not-allowed disabled:opacity-50"
            >
              {boostAtCap ? 'Boost max' : `Boost Lv ${core.activationBoostLevel + 1}`}
            </button>
            <Link
              to="/forge"
              className={canForge
                ? 'inline-flex min-h-11 items-center justify-center rounded-md bg-core px-3 py-2 text-sm font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core'
                : 'inline-flex min-h-11 items-center justify-center rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-core'}
            >
              {canForge ? 'Forge ready' : `Forge: ${nextForgeEnergyCost} Energy`}
            </Link>
          </div>
          {!boostAtCap && cannotAffordBoost ? (
            <p role="status" aria-live="polite" className="text-sm text-slate-400">
              Boost needs {boostCost ?? 0} Energy.
            </p>
          ) : null}
        </section>

        {lastCompletedRejuvenation !== null ? (
          <RejuvenationSummary rejuvenation={lastCompletedRejuvenation} core={core} />
        ) : null}

        {lastRejection !== null ? (
          <p role="status" aria-live="polite" className="rounded-md border border-error/30 bg-slate-950/25 px-3 py-2 text-sm text-error">
            {lastRejection}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

interface StatProps {
  readonly label: string;
  readonly value: number | string;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-md border border-slate-700/40 bg-slate-950/18 p-2">
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-slate-100">{value}</dd>
    </div>
  );
}
