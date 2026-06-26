// Starter Flowgrid state factory.
//
// Returns a deterministic FlowgridSnapshot with one starter Cell, the four starter
// ModuleInstances (Generator, Charge Core, Output, Bloom), a default Output route to
// the Core, default Core allocation, default Settings, and empty history. The same
// input params always produce a deep-equal snapshot.

import type {
  CellId,
  FlowgridSnapshot,
  IsoDateTimeString,
  LocalDateString,
  ModuleInstanceId,
  ModuleSlotId,
} from '../domain/index.js';

import {
  BLOOM_MODULE_DEFINITION_ID,
  CHARGE_CORE_MODULE_DEFINITION_ID,
  GENERATOR_MODULE_DEFINITION_ID,
  OUTPUT_MODULE_DEFINITION_ID,
} from './starter-modules.js';
import {
  DEFAULT_CONVERT_ALLOCATION_PERCENT,
  DEFAULT_DAILY_MILESTONE_TARGET_SECONDS,
  DEFAULT_DAILY_TARGET_SECONDS,
  DEFAULT_LOCAL_DAY_BOUNDARY,
  DEFAULT_SESSION_LENGTH_SECONDS,
  DEFAULT_STORE_ALLOCATION_PERCENT,
  STARTER_CELL_NAME,
} from './formulas.js';

export type CreateStarterFlowgridStateParams = {
  readonly now: IsoDateTimeString;
  readonly localDate: LocalDateString;
  readonly clientId: string;
  readonly cellId: CellId;
  readonly coreId: string;
  readonly generatorModuleInstanceId: ModuleInstanceId;
  readonly chargeCoreModuleInstanceId: ModuleInstanceId;
  readonly outputModuleInstanceId: ModuleInstanceId;
  readonly bloomModuleInstanceId: ModuleInstanceId;
  readonly outputRouteId: string;
  readonly settingsId: string;
  readonly forgeHistoryId: string;
};

// Slot IDs are derived from the owner Cell ID by convention: `${cellId}:slot:${kind}`.
// Tests that need to reference slots (e.g. install_module) MUST use this convention.
function slotId(cellId: CellId, kind: string): ModuleSlotId {
  return `${cellId}:slot:${kind}`;
}

export function createStarterFlowgridState(
  params: CreateStarterFlowgridStateParams,
): FlowgridSnapshot {
  const {
    now,
    clientId,
    cellId,
    coreId,
    generatorModuleInstanceId,
    chargeCoreModuleInstanceId,
    outputModuleInstanceId,
    bloomModuleInstanceId,
    outputRouteId,
    settingsId,
  } = params;

  const generatorSlot = slotId(cellId, 'generator');
  const chargeCoreSlot = slotId(cellId, 'charge-core');
  const outputSlot = slotId(cellId, 'output');
  const bloomSlot = slotId(cellId, 'bloom');

  return {
    client: {
      id: clientId,
      contentVersion: 'flowgrid:starter:v1',
      createdAt: now,
      updatedAt: now,
    },
    cells: new Map([
      [
        cellId,
        {
          id: cellId,
          name: STARTER_CELL_NAME,
          // D-10 identity/UI fields. These are the defaults the Dexie v2 migration
          // also writes for existing v1 cells (database.ts upgradeCellsV1ToV2).
          color: '#6b7280',
          icon: null,
          archivedAt: null,
          activeSessionStartedAt: null,
          xp: 0,
          current: 0,
          charge: 0,
          momentum: 0,
          activation: 0,
          dailyMilestoneProgressSeconds: 0,
          dailyMilestoneTargetSeconds: DEFAULT_DAILY_MILESTONE_TARGET_SECONDS,
          lastBloomLocalDate: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]),
    core: {
      id: coreId,
      energy: 0,
      coreCharge: 0,
      lifetimeEnergy: 0,
      integration: 0,
      moduleTokens: 0,
      convertAllocationPercent: DEFAULT_CONVERT_ALLOCATION_PERCENT,
      storeAllocationPercent: DEFAULT_STORE_ALLOCATION_PERCENT,
      forgeCount: 0,
      // Phase 4 defaults — Pitfall 6 backward-compat: level 0 means existing
      // activation-bonus tests stay byte-identical to Phase 3 (bonus = 10%).
      activationBoostLevel: 0,
      activeRejuvenationStartedAt: null,
      updatedAt: now,
    },
    moduleInstances: new Map([
      [
        generatorModuleInstanceId,
        {
          id: generatorModuleInstanceId,
          definitionId: GENERATOR_MODULE_DEFINITION_ID,
          ownerCellId: cellId,
          installedSlotId: generatorSlot,
          level: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      [
        chargeCoreModuleInstanceId,
        {
          id: chargeCoreModuleInstanceId,
          definitionId: CHARGE_CORE_MODULE_DEFINITION_ID,
          ownerCellId: cellId,
          installedSlotId: chargeCoreSlot,
          level: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      [
        outputModuleInstanceId,
        {
          id: outputModuleInstanceId,
          definitionId: OUTPUT_MODULE_DEFINITION_ID,
          ownerCellId: cellId,
          installedSlotId: outputSlot,
          level: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      [
        bloomModuleInstanceId,
        {
          id: bloomModuleInstanceId,
          definitionId: BLOOM_MODULE_DEFINITION_ID,
          ownerCellId: cellId,
          installedSlotId: bloomSlot,
          level: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]),
    routes: new Map([
      [
        outputRouteId,
        {
          id: outputRouteId,
          sourceCellId: cellId,
          sourceModuleInstanceId: outputModuleInstanceId,
          targetCoreId: coreId,
          allocationPercent: 100,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]),
    sessions: [],
    rejuvenations: [],
    operations: [],
    settings: {
      id: settingsId,
      defaultSessionLengthSeconds: DEFAULT_SESSION_LENGTH_SECONDS,
      dailyTargetSeconds: DEFAULT_DAILY_TARGET_SECONDS,
      localDayBoundary: DEFAULT_LOCAL_DAY_BOUNDARY,
      reduceMotion: false,
      updatedAt: now,
    },
    forgeHistory: [],
  };
}
