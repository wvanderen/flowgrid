// Module lookup system.
//
// Read-only queries over a FlowgridSnapshot's module instances. Used by command
// handlers to find starter modules on a Cell and by validators to check references.

import type {
  CellId,
  FlowgridSnapshot,
  ModuleDefinitionKind,
  ModuleInstance,
} from '../../domain/index.js';
import { getStarterModuleDefinitionByKind, STARTER_MODULE_DEFINITIONS } from '../../content/index.js';

export function findModuleInstanceForCell(
  state: FlowgridSnapshot,
  cellId: CellId,
  kind: ModuleDefinitionKind,
): ModuleInstance | undefined {
  const def = getStarterModuleDefinitionByKind(kind);
  for (const instance of state.moduleInstances.values()) {
    if (instance.ownerCellId === cellId && instance.definitionId === def.id) {
      return instance;
    }
  }
  return undefined;
}

export function hasStarterModulesForCell(
  state: FlowgridSnapshot,
  cellId: CellId,
): boolean {
  for (const def of STARTER_MODULE_DEFINITIONS) {
    const found = [...state.moduleInstances.values()].find(
      (m) => m.ownerCellId === cellId && m.definitionId === def.id,
    );
    if (!found) return false;
  }
  return true;
}
