// Command, result, environment, and event contracts.
//
// Plan 01-02 Task 2 owns this file, but it is introduced in Task 1 to keep
// `npm run typecheck` green at every task boundary (the foundation-loop test from
// Plan 01-01 imports command/result types from `src/domain`). Task 2 only needs to
// extend this file with new event helpers and keep the simulation-side modules in
// sync.

import type { ContentVersion, IntNonNegative, IntPercent, IntSeconds } from './primitives.js';
import type { IsoDateTimeString, LocalDateString } from './time.js';
import type { FlowgridSnapshot } from './records.js';
import type { SyncOperation } from './operation-records.js';
import type { ValidationIssue } from './validation.js';
import type {
  CellId,
  ModuleDefinitionId,
  ModuleSlotId,
  OperationId,
} from './ids.js';

export interface Rng {
  readonly seed: string;
  nextInt(minInclusive: number, maxInclusive: number): readonly [value: number, next: Rng];
}

export interface SimulationEnv {
  readonly now: IsoDateTimeString;
  readonly localDate: LocalDateString;
  readonly rng: Rng;
  readonly contentVersion: ContentVersion;
}

export type SimulationStatus = 'applied' | 'rejected' | 'not_implemented';

export interface CompleteFocusSessionCommand {
  readonly type: 'complete_focus_session';
  readonly operationId: OperationId;
  readonly cellId: CellId;
  readonly startedAt: IsoDateTimeString;
  readonly endedAt: IsoDateTimeString;
  readonly durationSeconds: IntSeconds;
}

export interface SetCoreAllocationCommand {
  readonly type: 'set_core_allocation';
  readonly operationId: OperationId;
  readonly convertAllocationPercent: IntPercent;
  readonly storeAllocationPercent: IntPercent;
}

export interface LogRejuvenationCommand {
  readonly type: 'log_rejuvenation';
  readonly operationId: OperationId;
  readonly durationSeconds: IntSeconds;
}

export interface RunForgeCommand {
  readonly type: 'run_forge';
  readonly operationId: OperationId;
}

export interface InstallModuleCommand {
  readonly type: 'install_module';
  readonly operationId: OperationId;
  readonly definitionId: ModuleDefinitionId;
  readonly ownerCellId: CellId;
  readonly installedSlotId: ModuleSlotId;
}

// --- Phase 3 cell + session-lifecycle commands (D-05, D-09, D-11, D-12) ---

export interface CreateCellCommand {
  readonly type: 'create_cell';
  readonly operationId: OperationId;
  readonly cellId: CellId;
  readonly name: string;
  readonly color: string;
  readonly icon: string | null;
  readonly dailyTargetSeconds: IntSeconds;
}

export interface EditCellCommand {
  readonly type: 'edit_cell';
  readonly operationId: OperationId;
  readonly cellId: CellId;
  readonly name: string;
  readonly color: string;
  readonly icon: string | null;
  readonly dailyTargetSeconds: IntSeconds;
}

export interface ArchiveCellCommand {
  readonly type: 'archive_cell';
  readonly operationId: OperationId;
  readonly cellId: CellId;
}

export interface UnarchiveCellCommand {
  readonly type: 'unarchive_cell';
  readonly operationId: OperationId;
  readonly cellId: CellId;
}

export interface StartFocusSessionCommand {
  readonly type: 'start_focus_session';
  readonly operationId: OperationId;
  readonly cellId: CellId;
}

export interface CancelFocusSessionCommand {
  readonly type: 'cancel_focus_session';
  readonly operationId: OperationId;
  readonly cellId: CellId;
}

export type SimulationCommand =
  | CompleteFocusSessionCommand
  | SetCoreAllocationCommand
  | LogRejuvenationCommand
  | RunForgeCommand
  | InstallModuleCommand
  | CreateCellCommand
  | EditCellCommand
  | ArchiveCellCommand
  | UnarchiveCellCommand
  | StartFocusSessionCommand
  | CancelFocusSessionCommand;

export interface EconomyEvent {
  readonly type: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly payload: unknown;
  readonly at: IsoDateTimeString;
}

export interface VisualEvent {
  readonly type: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly payload: unknown;
  readonly at: IsoDateTimeString;
}

export interface SimulationResult {
  readonly status: SimulationStatus;
  readonly previousState: FlowgridSnapshot;
  readonly nextState: FlowgridSnapshot;
  readonly economyEvents: readonly EconomyEvent[];
  readonly visualEvents: readonly VisualEvent[];
  readonly operations: readonly SyncOperation[];
  readonly validationIssues: readonly ValidationIssue[];
}

export const ECONOMY_EVENT_NAMES = {
  focusSessionCompleted: 'focus_session_completed',
  currentGenerated: 'current_generated',
  cellXpGained: 'cell_xp_gained',
  bloomFired: 'bloom_fired',
  cellActivated: 'cell_activated',
  currentRoutedToCore: 'current_routed_to_core',
  coreCurrentConverted: 'core_current_converted',
  coreChargeStored: 'core_charge_stored',
  stateValidated: 'state_validated',
} as const;

export type EconomyEventName = (typeof ECONOMY_EVENT_NAMES)[keyof typeof ECONOMY_EVENT_NAMES];

export const VISUAL_EVENT_NAMES = {
  focusSessionStartedVisual: 'visual:focus_session_started',
  currentFlowVisual: 'visual:current_flow',
  bloomBurstVisual: 'visual:bloom_burst',
  cellActivationVisual: 'visual:cell_activation',
  coreConvertVisual: 'visual:core_convert',
  coreChargeStoreVisual: 'visual:core_charge_store',
} as const;

export type NotImplementedReason =
  | 'rejuvenation_not_implemented'
  | 'forge_not_implemented'
  | 'install_module_not_implemented';

export interface NotImplementedMetadata {
  readonly reason: NotImplementedReason;
  readonly message: string;
}

export const INT_NON_NEGATIVE_ZERO: IntNonNegative = 0;
