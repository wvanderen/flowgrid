// Plan 01-01 placeholder barrel.
//
// Plan 01-02 replaces this file with re-exports from records.ts, operation-records.ts,
// ids.ts, primitives.ts, time.ts, validation.ts, and result.ts. The minimal shapes
// below exist so src/content, src/simulation, tests/helpers, and the foundation-loop
// test compile and the stub function implementations can be typed.
//
// These types intentionally use plain `string` aliases for branded ID types. Plan 01-02
// tightens them with branded strings. Field names match the research contract so the
// foundation-loop test continues to typecheck after Plan 01-02 lands.

export type IsoDateTimeString = string;
export type LocalDateString = string;
export type ContentVersion = string;

export type CellId = string;
export type CoreId = string;
export type ModuleDefinitionId = string;
export type ModuleInstanceId = string;
export type ModuleSlotId = string;
export type RouteId = string;
export type SessionId = string;
export type OperationId = string;
export type SettingsId = string;
export type ForgeHistoryId = string;
export type ClientId = string;

export type Rng = {
  readonly seed: string;
  nextInt(minInclusive: number, maxInclusive: number): readonly [value: number, next: Rng];
};

export type SimulationEnv = {
  readonly now: IsoDateTimeString;
  readonly localDate: LocalDateString;
  readonly rng: Rng;
  readonly contentVersion: ContentVersion;
};

export type CellRecord = {
  readonly id: CellId;
  readonly name: string;
  readonly xp: number;
  readonly current: number;
  readonly charge: number;
  readonly momentum: number;
  readonly activation: number;
  readonly dailyMilestoneProgressSeconds: number;
  readonly dailyMilestoneTargetSeconds: number;
  readonly lastBloomLocalDate: LocalDateString | null;
  readonly createdAt: IsoDateTimeString;
  readonly updatedAt: IsoDateTimeString;
};

export type CoreRecord = {
  readonly id: CoreId;
  readonly energy: number;
  readonly coreCharge: number;
  readonly lifetimeEnergy: number;
  readonly integration: number;
  readonly moduleTokens: number;
  readonly convertAllocationPercent: number;
  readonly storeAllocationPercent: number;
  readonly forgeCount: number;
  readonly updatedAt: IsoDateTimeString;
};

export type ModuleDefinition = {
  readonly id: ModuleDefinitionId;
  readonly version: ContentVersion;
  readonly kind: 'generator' | 'charge_core' | 'output' | 'bloom';
  readonly singletonPerCell: boolean;
  readonly phase1Behavior:
    | 'complete_focus_session'
    | 'store_cell_charge'
    | 'route_to_core'
    | 'daily_bloom';
};

export type ModuleInstance = {
  readonly id: ModuleInstanceId;
  readonly definitionId: ModuleDefinitionId;
  readonly ownerCellId: CellId;
  readonly installedSlotId: ModuleSlotId;
  readonly level: number;
  readonly createdAt: IsoDateTimeString;
  readonly updatedAt: IsoDateTimeString;
};

export type RouteRecord = {
  readonly id: RouteId;
  readonly sourceCellId: CellId;
  readonly sourceModuleInstanceId: ModuleInstanceId;
  readonly targetCoreId: CoreId;
  readonly allocationPercent: number;
  readonly createdAt: IsoDateTimeString;
  readonly updatedAt: IsoDateTimeString;
};

export type SessionRecord = {
  readonly id: SessionId;
  readonly cellId: CellId;
  readonly startedAt: IsoDateTimeString;
  readonly endedAt: IsoDateTimeString;
  readonly durationSeconds: number;
  readonly createdAt: IsoDateTimeString;
};

export type OperationStatus = 'pending' | 'applied' | 'failed';

export type SyncOperation = {
  readonly id: OperationId;
  readonly commandType: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly payloadVersion: number;
  readonly createdAt: IsoDateTimeString;
  readonly updatedAt: IsoDateTimeString;
  readonly status: OperationStatus;
  readonly payload: unknown;
};

export type SettingsRecord = {
  readonly id: SettingsId;
  readonly defaultSessionLengthSeconds: number;
  readonly dailyTargetSeconds: number;
  readonly localDayBoundary: string;
  readonly updatedAt: IsoDateTimeString;
};

export type ForgeHistoryRecord = {
  readonly id: ForgeHistoryId;
  readonly forgeCount: number;
  readonly createdAt: IsoDateTimeString;
};

export type ClientRecord = {
  readonly id: ClientId;
  readonly contentVersion: ContentVersion;
  readonly updatedAt: IsoDateTimeString;
};

export type FlowgridSnapshot = {
  readonly client: ClientRecord;
  readonly cells: ReadonlyMap<CellId, CellRecord>;
  readonly core: CoreRecord;
  readonly moduleInstances: ReadonlyMap<ModuleInstanceId, ModuleInstance>;
  readonly routes: ReadonlyMap<RouteId, RouteRecord>;
  readonly sessions: readonly SessionRecord[];
  readonly operations: readonly SyncOperation[];
  readonly settings: SettingsRecord;
  readonly forgeHistory: readonly ForgeHistoryRecord[];
};

export type CompleteFocusSessionCommand = {
  readonly type: 'complete_focus_session';
  readonly operationId: OperationId;
  readonly cellId: CellId;
  readonly startedAt: IsoDateTimeString;
  readonly endedAt: IsoDateTimeString;
  readonly durationSeconds: number;
};

export type SetCoreAllocationCommand = {
  readonly type: 'set_core_allocation';
  readonly operationId: OperationId;
  readonly convertAllocationPercent: number;
  readonly storeAllocationPercent: number;
};

export type LogRejuvenationCommand = {
  readonly type: 'log_rejuvenation';
  readonly operationId: OperationId;
  readonly durationSeconds: number;
};

export type RunForgeCommand = {
  readonly type: 'run_forge';
  readonly operationId: OperationId;
};

export type InstallModuleCommand = {
  readonly type: 'install_module';
  readonly operationId: OperationId;
  readonly definitionId: ModuleDefinitionId;
  readonly ownerCellId: CellId;
  readonly installedSlotId: ModuleSlotId;
};

export type SimulationCommand =
  | CompleteFocusSessionCommand
  | SetCoreAllocationCommand
  | LogRejuvenationCommand
  | RunForgeCommand
  | InstallModuleCommand;

export type SimulationStatus = 'applied' | 'rejected' | 'not_implemented';

export type EconomyEvent = {
  readonly type: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly payload: unknown;
  readonly at: IsoDateTimeString;
};

export type VisualEvent = {
  readonly type: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly payload: unknown;
  readonly at: IsoDateTimeString;
};

export type ValidationIssueCode =
  | 'negative_resource'
  | 'invalid_reference'
  | 'duplicate_module_install'
  | 'invalid_route_allocation'
  | 'invalid_core_allocation_total'
  | 'token_regression'
  | 'forge_count_regression'
  | 'invalid_operation_shape';

export type ValidationIssue = {
  readonly code: ValidationIssueCode;
  readonly severity: 'error' | 'warning';
  readonly entityType?: string;
  readonly entityId?: string;
  readonly path?: string;
  readonly message: string;
};

export type SimulationResult = {
  readonly status: SimulationStatus;
  readonly previousState: FlowgridSnapshot;
  readonly nextState: FlowgridSnapshot;
  readonly economyEvents: readonly EconomyEvent[];
  readonly visualEvents: readonly VisualEvent[];
  readonly operations: readonly SyncOperation[];
  readonly validationIssues: readonly ValidationIssue[];
};

export const PHASE_01_01_PLACEHOLDER =
  'src/domain barrel: Plan 01-02 replaces these placeholder contracts with re-exports of full record shapes.';
