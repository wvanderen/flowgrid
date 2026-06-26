// Durable record shapes for Flowgrid entities.
//
// All records are readonly and use integer aliases for economy fields. Records are
// value types: commands return new records rather than mutating in place.

import type { ContentVersion, IntNonNegative, IntPercent, IntSeconds } from './primitives.js';
import type { IsoDateTimeString, LocalDateString } from './time.js';
import type { SyncOperation } from './operation-records.js';
import type {
  CellId,
  ClientId,
  CoreId,
  ForgeHistoryId,
  ModuleDefinitionId,
  ModuleInstanceId,
  ModuleSlotId,
  RejuvenationId,
  RouteId,
  SessionId,
  SettingsId,
} from './ids.js';
// Phase 5 / D-09: ForgeHistoryRecord carries the curated reveal + chosen reward, so it
// depends on the ForgeChoice payload type declared alongside the command in result.ts.
// Type-only import keeps this erased at runtime (no circular value import).
import type { ForgeChoice } from './result.js';

export interface ClientRecord {
  readonly id: ClientId;
  readonly contentVersion: ContentVersion;
  readonly createdAt: IsoDateTimeString;
  readonly updatedAt: IsoDateTimeString;
}

export interface CellRecord {
  readonly id: CellId;
  readonly name: string;
  // --- D-10 additions (identity / UI fields) ---
  readonly color: string; // hex, e.g. '#6b7280'
  readonly icon: string | null; // lucide name | emoji | null
  readonly archivedAt: IsoDateTimeString | null; // null = active (D-12)
  // --- D-05 (active-session marker stored on the Cell) ---
  readonly activeSessionStartedAt: IsoDateTimeString | null;
  // --- existing economy fields (unchanged order) ---
  readonly xp: IntNonNegative;
  readonly current: IntNonNegative;
  readonly charge: IntNonNegative;
  readonly momentum: IntNonNegative;
  // `activation` is a MONOTONIC LIFETIME counter (incremented each Bloom).
  // "Activated today" is *derived* from lastBloomLocalDate === env.localDate.
  // Day-rollover MUST NOT reset it (Pitfall 7).
  readonly activation: IntNonNegative;
  readonly dailyMilestoneProgressSeconds: IntNonNegative;
  readonly dailyMilestoneTargetSeconds: IntNonNegative;
  readonly lastBloomLocalDate: LocalDateString | null;
  readonly createdAt: IsoDateTimeString;
  readonly updatedAt: IsoDateTimeString;
}

export interface CoreRecord {
  readonly id: CoreId;
  readonly energy: IntNonNegative;
  readonly coreCharge: IntNonNegative;
  readonly lifetimeEnergy: IntNonNegative;
  readonly integration: IntNonNegative;
  readonly moduleTokens: IntNonNegative;
  readonly convertAllocationPercent: IntPercent;
  readonly storeAllocationPercent: IntPercent;
  readonly forgeCount: IntNonNegative;
  // CORE-06: Energy-spend Activation-bonus upgrade level (cap ACTIVATION_BOOST_MAX_LEVEL).
  // Monotonic — never decreases; guarded by activation_boost_regression invariant.
  readonly activationBoostLevel: IntNonNegative;
  // D-01/D-02 live-timed rejuvenation marker (stored on the Core, mirrors Cell.activeSessionStartedAt).
  // Non-null means a rejuvenation session is in progress; mutually exclusive with any Cell focus session.
  readonly activeRejuvenationStartedAt: IsoDateTimeString | null;
  readonly updatedAt: IsoDateTimeString;
}

export type ModuleDefinitionKind = 'generator' | 'charge_core' | 'output' | 'bloom';

export type ModulePhase1Behavior =
  | 'complete_focus_session'
  | 'store_cell_charge'
  | 'route_to_core'
  | 'daily_bloom';

export interface ModuleDefinition {
  readonly id: ModuleDefinitionId;
  readonly version: ContentVersion;
  readonly kind: ModuleDefinitionKind;
  readonly singletonPerCell: boolean;
  readonly phase1Behavior: ModulePhase1Behavior;
}

export interface ModuleInstance {
  readonly id: ModuleInstanceId;
  readonly definitionId: ModuleDefinitionId;
  readonly ownerCellId: CellId;
  readonly installedSlotId: ModuleSlotId;
  readonly level: IntNonNegative;
  readonly createdAt: IsoDateTimeString;
  readonly updatedAt: IsoDateTimeString;
}

export interface RouteRecord {
  readonly id: RouteId;
  readonly sourceCellId: CellId;
  readonly sourceModuleInstanceId: ModuleInstanceId;
  readonly targetCoreId: CoreId;
  readonly allocationPercent: IntPercent;
  readonly createdAt: IsoDateTimeString;
  readonly updatedAt: IsoDateTimeString;
}

export interface SessionRecord {
  readonly id: SessionId;
  readonly cellId: CellId;
  readonly startedAt: IsoDateTimeString;
  readonly endedAt: IsoDateTimeString;
  readonly durationSeconds: IntSeconds;
  readonly xpGained: IntNonNegative;
  readonly currentGenerated: IntNonNegative;
  readonly bloomFired: boolean;
  readonly activationGranted: boolean;
  readonly energyGained: IntNonNegative;
  readonly coreChargeGained: IntNonNegative;
  readonly createdAt: IsoDateTimeString;
}

// REJ-01 append-only history row for a completed rejuvenation session (SPEC R6).
// `id` is 1:1 with the command `operationId` so replays are idempotent. Records are
// never mutated or deleted after creation (history is sacred — prohibition 5).
export interface RejuvenationRecord {
  readonly id: RejuvenationId;
  readonly startedAt: IsoDateTimeString;
  readonly endedAt: IsoDateTimeString;
  readonly durationSeconds: IntSeconds;
  readonly chargeConsumed: IntNonNegative;
  readonly integrationGained: IntNonNegative;
  readonly tokensGranted: IntNonNegative;
  readonly createdAt: IsoDateTimeString;
}

export interface SettingsRecord {
  readonly id: SettingsId;
  readonly defaultSessionLengthSeconds: IntSeconds;
  readonly dailyTargetSeconds: IntSeconds;
  readonly localDayBoundary: string;
  readonly reduceMotion: boolean;
  readonly updatedAt: IsoDateTimeString;
}

// Phase 5 / D-09: widened ForgeHistoryRecord. Each successful run_forge appends ONE
// row capturing MOD-05 literally: the payment (token or energy + amount), all offered
// choices (the curated reveal), the chosen reward with its level change, the new
// monotonic forgeCount, and the timestamp. `id` is 1:1 with the command operationId
// so replays are idempotent (Phase 2 D-04; repository's idempotentAppend dedups).
// Records are append-only (history is sacred — prohibition 5).
export interface ForgeHistoryRecord {
  readonly id: ForgeHistoryId;
  readonly forgeCount: IntNonNegative;
  readonly paymentType: 'token' | 'energy';
  readonly paymentAmount: IntNonNegative;
  readonly offeredChoices: readonly ForgeChoice[];
  readonly chosenReward: {
    readonly cellId: CellId;
    readonly moduleKind: ModuleDefinitionKind;
    readonly fromLevel: IntNonNegative;
    readonly toLevel: IntNonNegative;
  };
  readonly createdAt: IsoDateTimeString;
}

export interface FlowgridSnapshot {
  readonly client: ClientRecord;
  readonly cells: ReadonlyMap<CellId, CellRecord>;
  readonly core: CoreRecord;
  readonly moduleInstances: ReadonlyMap<ModuleInstanceId, ModuleInstance>;
  readonly routes: ReadonlyMap<RouteId, RouteRecord>;
  readonly sessions: readonly SessionRecord[];
  // REJ-01: append-only rejuvenation history, parallel to `sessions`.
  readonly rejuvenations: readonly RejuvenationRecord[];
  readonly operations: readonly SyncOperation[];
  readonly settings: SettingsRecord;
  readonly forgeHistory: readonly ForgeHistoryRecord[];
}
