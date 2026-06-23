// Read-only selectors over a FlowgridSnapshot.
//
// Pure functions that return references or copies of data in the snapshot. Selectors
// never mutate; UI, renderer, persistence, and tests use these instead of reaching
// into the snapshot structure directly.

import type {
  CellId,
  CellRecord,
  CoreRecord,
  FlowgridSnapshot,
  ModuleDefinitionKind,
  ModuleInstance,
  SessionRecord,
  SettingsRecord,
} from '../domain/index.js';
import { findModuleInstanceForCell } from './systems/modules.js';

export function getCellById(state: FlowgridSnapshot, cellId: CellId): CellRecord | undefined {
  return state.cells.get(cellId);
}

export function getCore(state: FlowgridSnapshot): CoreRecord {
  return state.core;
}

export function getSettings(state: FlowgridSnapshot): SettingsRecord {
  return state.settings;
}

export function getStarterModuleInstanceForCell(
  state: FlowgridSnapshot,
  cellId: CellId,
  kind: ModuleDefinitionKind,
): ModuleInstance | undefined {
  return findModuleInstanceForCell(state, cellId, kind);
}

export function getRecentSessions(
  state: FlowgridSnapshot,
  limit: number,
): readonly SessionRecord[] {
  if (limit <= 0) return [];
  return state.sessions.slice(-limit);
}

export function countSessions(state: FlowgridSnapshot): number {
  return state.sessions.length;
}
