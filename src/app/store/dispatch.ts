// Command dispatch path + React binding (RESEARCH Pattern 1 lines 318-340).
//
// Dispatch is the single mutation path for durable state from the UI: it runs the
// pure simulation, hands the result to the repository for diff-write, and emits the
// next snapshot into the vanilla store. React selectors subscribe via
// `useFlowgridStore(selector)` below. Visual events emitted by the simulation are
// appended to `pendingVisualEvents` — the render adapter drains them (D-02: in the
// Phase 3 stub they are dropped, which exercises the renderer/simulation safety
// boundary from day one).
//
// `dispatch` runs outside React so it can be called from non-React code paths (e.g.
// the post-load rehydration sequence, future sync replay).

import { useStore } from 'zustand';

import type {
  CellRecord,
  FlowgridSnapshot,
  ForgeHistoryRecord,
  RejuvenationRecord,
  SessionRecord,
  SimulationCommand,
  SimulationEnv,
  SimulationResult,
} from '../../domain/index.js';
import { runSimulationCommand } from '../../simulation/engine.js';
import { reconcileDayRollover } from '../../simulation/systems/day-rollover.js';
import { FlowgridRepository } from '../../persistence/index.js';
import { mapDomException } from '../../persistence/errors.js';
import { makeEnv } from '../env.js';

import {
  flowgridStore,
  type ActiveRejuvenationMarker,
  type ActiveSessionMarker,
  type FlowgridState,
} from './flowgrid-store.js';

// React-bound selector hook. Call as `useFlowgridStore((s) => s.snapshot)`.
export function useFlowgridStore<T>(selector: (s: FlowgridState) => T): T {
  return useStore(flowgridStore, selector);
}

// Scan the snapshot for the single active cell (one-active-session invariant,
// D-05) and project it to the store's ActiveSessionMarker. Returns null when no
// cell has a non-null activeSessionStartedAt (the steady state between sessions).
function deriveActiveSession(snapshot: FlowgridSnapshot): ActiveSessionMarker | null {
  for (const cell of snapshot.cells.values()) {
    const startedAt = cell.activeSessionStartedAt;
    if (startedAt !== null) {
      return { cellId: cell.id, startedAt };
    }
  }
  return null;
}

// Project the Core's active-rejuvenation marker (core.activeRejuvenationStartedAt)
// to the store's ActiveRejuvenationMarker. Returns null when no rejuvenation is in
// progress. D-02: mutually exclusive with activeSession (at most one is non-null).
function deriveActiveRejuvenation(snapshot: FlowgridSnapshot): ActiveRejuvenationMarker | null {
  const startedAt = snapshot.core.activeRejuvenationStartedAt;
  return startedAt === null ? null : { startedAt };
}

// The dispatch loop. Returns the applied SimulationResult on success (useful for
// tests / future sync code), or null when the snapshot is not loaded yet, the
// repository write failed, or the command was rejected/not_implemented.
export async function dispatch(
  command: SimulationCommand,
  env: SimulationEnv,
  repository: FlowgridRepository,
): Promise<SimulationResult | null> {
  const prev = flowgridStore.getState().snapshot;
  if (prev === null) {
    // Nothing loaded yet — drop the command silently. The init sequence owns the
    // loading→ready transition; UI controls gate dispatches behind `status === 'ready'`.
    return null;
  }

  const result = runSimulationCommand(prev, command, env);

  if (result.status !== 'applied') {
    // Rejected / not_implemented results write nothing durable (Phase 2 D-02). Surface
    // the simulation's first validation issue (or a generic fallback) as a user-facing
    // lastRejection message so the UI can render feedback instead of appearing
    // nonresponsive; durable state is unchanged. Persistence failures still go to
    // lastError below.
    const message =
      result.validationIssues[0]?.message ?? 'That action is not available right now.';
    flowgridStore.setState({ lastRejection: message });
    return null;
  }

  const apply = await repository.applyResult(result);
  if (!apply.ok) {
    // Persistence failure — keep the prior snapshot, surface the typed error. Do NOT
    // mutate pendingVisualEvents or activeSession: nothing landed.
    flowgridStore.setState({ lastError: apply.error });
    return null;
  }

  // Successful write: emit the new snapshot, append visual events, sync the active-
  // session + active-rejuvenation markers, and clear any prior error/rejection (the
  // new dispatch supersedes it). lastCompletedSession / lastCompletedRejuvenation /
  // lastCompletedForge are set when this dispatch completed a session/rejuvenation/
  // forge; they persist (no auto-dismiss — D-10) until the next dispatch supersedes
  // them.
  const lastCompletedSession = captureCompletedSession(command, result);
  const lastCompletedRejuvenation = captureCompletedRejuvenation(command, result);
  const lastCompletedForge = captureCompletedForge(command, result);
  flowgridStore.setState((s) => ({
    snapshot: result.nextState,
    pendingVisualEvents: [...s.pendingVisualEvents, ...result.visualEvents],
    activeSession: deriveActiveSession(result.nextState),
    activeRejuvenation: deriveActiveRejuvenation(result.nextState),
    lastError: null,
    lastRejection: null,
    ...(lastCompletedSession !== undefined ? { lastCompletedSession } : {}),
    ...(lastCompletedRejuvenation !== undefined ? { lastCompletedRejuvenation } : {}),
    ...(lastCompletedForge !== undefined ? { lastCompletedForge } : {}),
  }));

  return result;
}

// After a successful complete_focus_session, surface the newly-appended session so
// CellBoard can render SessionSummary (SESS-05). The session id is 1:1 with the
// command operationId in Phase 1, so we match by id and fall back to the last entry.
function captureCompletedSession(
  command: SimulationCommand,
  result: SimulationResult,
): SessionRecord | undefined {
  if (command.type !== 'complete_focus_session') return undefined;
  const sessions = result.nextState.sessions;
  const matched = sessions.find((s) => s.id === command.operationId);
  if (matched !== undefined) return matched;
  return sessions[sessions.length - 1];
}

// After a successful log_rejuvenation, surface the newly-appended RejuvenationRecord
// so CorePanel can render RejuvenationSummary (REJ-05, D-09). The record id is 1:1
// with the command operationId, so we match by id and fall back to the last entry.
function captureCompletedRejuvenation(
  command: SimulationCommand,
  result: SimulationResult,
): RejuvenationRecord | undefined {
  if (command.type !== 'log_rejuvenation') return undefined;
  const rejuvs = result.nextState.rejuvenations;
  const matched = rejuvs.find((r) => r.id === command.operationId);
  if (matched !== undefined) return matched;
  return rejuvs[rejuvs.length - 1];
}

// Phase 5 / D-11: after a successful run_forge, surface the newly-appended
// ForgeHistoryRecord so ForgePanel can render ForgeSummary (MOD-03, D-10). The record
// id is 1:1 with the command operationId (idempotent — Phase 2 D-04), so we match by
// id and fall back to the last entry. Mirrors captureCompletedRejuvenation exactly.
function captureCompletedForge(
  command: SimulationCommand,
  result: SimulationResult,
): ForgeHistoryRecord | undefined {
  if (command.type !== 'run_forge') return undefined;
  const rows = result.nextState.forgeHistory;
  const matched = rows.find((r) => r.id === command.operationId);
  if (matched !== undefined) return matched;
  return rows[rows.length - 1];
}

// Exposed so tests can reset to a known state without going through dispatch.
export function hydrateStoreForTests(snapshot: FlowgridSnapshot, cells: Iterable<CellRecord>): void {
  flowgridStore.setState({
    snapshot,
    pendingVisualEvents: [],
    activeSession: deriveActiveSession(snapshot),
    activeRejuvenation: deriveActiveRejuvenation(snapshot),
    lastCompletedSession: null,
    lastCompletedRejuvenation: null,
    lastCompletedForge: null,
    status: 'ready',
    lastError: null,
    lastRejection: null,
  });
  void cells;
}

// App-open sequence (D-13). Opens the repository, loads the durable snapshot,
// runs the belt-and-suspenders day-rollover reconciliation so the Flowgrid is
// correct immediately, and transitions the store loading→ready before React
// mounts (main.tsx awaits this). On any failure the store lands in 'error' with a
// typed PersistenceError so FlowgridHome renders ErrorBanner.
//
// Phase 06.2 W-01 (DATA-07): subscribes to repository.onBlockedUpgrade BEFORE
// repository.open() so the typed `blocked_upgrade` PersistenceError (Dexie's
// on('blocked') event — fires when another tab holds an older schema version)
// reaches flowgridStore.lastError and surfaces in ErrorBanner with kind-specific
// recovery copy. Registration must precede open() because the event fires DURING
// open().
export async function initApp(repository: FlowgridRepository): Promise<void> {
  // W-01 / DATA-07: route the `blocked_upgrade` PersistenceError to the UI.
  // Subscribe BEFORE repository.open() — Dexie's on('blocked') fires during
  // open() when another tab holds an older schema version.
  repository.onBlockedUpgrade((error) => {
    flowgridStore.setState({ status: 'error', lastError: error });
  });
  try {
    await repository.open();
    const snapshot = await repository.loadSnapshot();
    const env = makeEnv(
      new Date().toISOString(),
      { localDayBoundary: snapshot.settings.localDayBoundary },
      'flowgrid-app-seed',
    );
    const reconciled = reconcileDayRollover(snapshot, env);
    flowgridStore.setState({
      snapshot: reconciled,
      pendingVisualEvents: [],
      activeSession: deriveActiveSession(reconciled),
      activeRejuvenation: deriveActiveRejuvenation(reconciled),
      lastCompletedSession: null,
      lastCompletedRejuvenation: null,
      lastCompletedForge: null,
      status: 'ready',
      lastError: null,
      lastRejection: null,
    });
  } catch (e) {
    flowgridStore.setState({
      status: 'error',
      lastError: mapDomException(e),
    });
  }
}
