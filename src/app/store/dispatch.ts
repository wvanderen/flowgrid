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
    // validation issues to the store so the UI can render them if needed; durable
    // state is unchanged.
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
  // session marker, and clear any prior error (the new dispatch supersedes it).
  const lastCompletedSession = captureCompletedSession(command, result);
  flowgridStore.setState((s) => ({
    snapshot: result.nextState,
    pendingVisualEvents: [...s.pendingVisualEvents, ...result.visualEvents],
    activeSession: deriveActiveSession(result.nextState),
    lastError: null,
    ...(lastCompletedSession !== undefined ? { lastCompletedSession } : {}),
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

// Exposed so tests can reset to a known state without going through dispatch.
export function hydrateStoreForTests(snapshot: FlowgridSnapshot, cells: Iterable<CellRecord>): void {
  flowgridStore.setState({
    snapshot,
    pendingVisualEvents: [],
    activeSession: deriveActiveSession(snapshot),
    status: 'ready',
    lastError: null,
  });
  void cells;
}

// App-open sequence (D-13). Opens the repository, loads the durable snapshot,
// runs the belt-and-suspenders day-rollover reconciliation so the Flowgrid is
// correct immediately, and transitions the store loading→ready before React
// mounts (main.tsx awaits this). On any failure the store lands in 'error' with a
// typed PersistenceError so FlowgridHome renders ErrorBanner.
export async function initApp(repository: FlowgridRepository): Promise<void> {
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
      lastCompletedSession: null,
      status: 'ready',
      lastError: null,
    });
  } catch (e) {
    flowgridStore.setState({
      status: 'error',
      lastError: mapDomException(e),
    });
  }
}
