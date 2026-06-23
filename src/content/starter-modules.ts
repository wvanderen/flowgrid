// Starter ModuleDefinitions.
//
// Definitions are versioned static content. They describe module identity, kind,
// singleton policy, and Phase 1 behavior mapping. They NEVER carry user-owned state
// such as ownerCellId, installedSlotId, createdAt, or updatedAt — that lives on
// ModuleInstance records in the FlowgridSnapshot.

import type { ModuleDefinition, ModuleDefinitionKind } from '../domain/index.js';

import { STARTER_CONTENT_VERSION } from './content-version.js';

export const GENERATOR_MODULE_DEFINITION_ID = 'flowgrid:module-definition:generator';
export const CHARGE_CORE_MODULE_DEFINITION_ID = 'flowgrid:module-definition:charge-core';
export const OUTPUT_MODULE_DEFINITION_ID = 'flowgrid:module-definition:output';
export const BLOOM_MODULE_DEFINITION_ID = 'flowgrid:module-definition:bloom';

export const STARTER_MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
  {
    id: GENERATOR_MODULE_DEFINITION_ID,
    version: STARTER_CONTENT_VERSION,
    kind: 'generator',
    singletonPerCell: true,
    phase1Behavior: 'complete_focus_session',
  },
  {
    id: CHARGE_CORE_MODULE_DEFINITION_ID,
    version: STARTER_CONTENT_VERSION,
    kind: 'charge_core',
    singletonPerCell: true,
    phase1Behavior: 'store_cell_charge',
  },
  {
    id: OUTPUT_MODULE_DEFINITION_ID,
    version: STARTER_CONTENT_VERSION,
    kind: 'output',
    singletonPerCell: true,
    phase1Behavior: 'route_to_core',
  },
  {
    id: BLOOM_MODULE_DEFINITION_ID,
    version: STARTER_CONTENT_VERSION,
    kind: 'bloom',
    singletonPerCell: true,
    phase1Behavior: 'daily_bloom',
  },
];

export function getStarterModuleDefinitionByKind(
  kind: ModuleDefinitionKind,
): ModuleDefinition {
  const found = STARTER_MODULE_DEFINITIONS.find((d) => d.kind === kind);
  if (!found) {
    throw new Error(`No starter module definition for kind: ${kind}`);
  }
  return found;
}
