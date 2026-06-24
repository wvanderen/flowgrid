// Zod boundary schemas for the JSON archive import path (D-12).
//
// This module and `import-validation.ts` are the ONLY Phase 2 modules that import
// zod at runtime. Zod never reaches the repository write path, the reload read
// path, or export — STACK.md: "Do not put Zod in hot simulation loops"; here it
// lives at the untrusted import boundary only, mirroring each durable record shape
// from src/domain/records.ts and src/domain/operation-records.ts.
//
// Each z.object mirrors its domain interface field-for-field. A `satisfies`
// drift-guard line per critical record catches schema/type drift: if a future
// record-shape change touches records.ts without updating this schema, the guard
// fails to compile here, surfacing the divergence at the import boundary.
//
// Field rules mirror the integer-economy invariant (Integer economy units from
// PROJECT.md + D-08): IDs/timestamps/strings use z.string() / z.string().datetime();
// integer economy fields use z.number().int().nonnegative(); booleans use
// z.boolean(); SyncOperation.payload uses z.unknown() (command-specific, validated
// by simulation not persistence — RESEARCH §5.3).

import { z } from 'zod';

import type { RejuvenationRecord, SessionRecord, SyncOperation } from '../domain/index.js';

export const clientSchema = z.object({
  id: z.string(),
  contentVersion: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const cellSchema = z.object({
  id: z.string(),
  name: z.string(),
  // D-10 identity/UI fields (Phase 3).
  color: z.string(),
  icon: z.string().nullable(),
  archivedAt: z.string().datetime().nullable(),
  activeSessionStartedAt: z.string().datetime().nullable(),
  xp: z.number().int().nonnegative(),
  current: z.number().int().nonnegative(),
  charge: z.number().int().nonnegative(),
  momentum: z.number().int().nonnegative(),
  activation: z.number().int().nonnegative(),
  dailyMilestoneProgressSeconds: z.number().int().nonnegative(),
  dailyMilestoneTargetSeconds: z.number().int().nonnegative(),
  lastBloomLocalDate: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const coreSchema = z.object({
  id: z.string(),
  energy: z.number().int().nonnegative(),
  coreCharge: z.number().int().nonnegative(),
  lifetimeEnergy: z.number().int().nonnegative(),
  integration: z.number().int().nonnegative(),
  moduleTokens: z.number().int().nonnegative(),
  convertAllocationPercent: z.number().int().nonnegative(),
  storeAllocationPercent: z.number().int().nonnegative(),
  forgeCount: z.number().int().nonnegative(),
  // Phase 4 fields. `.default(...)` keeps v1 archives (exported before Phase 4)
  // parseable: an old archive without these fields gets the Pitfall-6 backward-compat
  // defaults (level 0 / no active rejuvenation). Plan 04-02 owns the full schema bump.
  activationBoostLevel: z.number().int().nonnegative().default(0),
  activeRejuvenationStartedAt: z.string().datetime().nullable().default(null),
  updatedAt: z.string().datetime(),
});

export const moduleInstanceSchema = z.object({
  id: z.string(),
  definitionId: z.string(),
  ownerCellId: z.string(),
  installedSlotId: z.string(),
  level: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const routeSchema = z.object({
  id: z.string(),
  sourceCellId: z.string(),
  sourceModuleInstanceId: z.string(),
  targetCoreId: z.string(),
  allocationPercent: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const sessionSchema = z.object({
  id: z.string(),
  cellId: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationSeconds: z.number().int().nonnegative(),
  xpGained: z.number().int().nonnegative(),
  currentGenerated: z.number().int().nonnegative(),
  bloomFired: z.boolean(),
  activationGranted: z.boolean(),
  energyGained: z.number().int().nonnegative(),
  coreChargeGained: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const settingsSchema = z.object({
  id: z.string(),
  defaultSessionLengthSeconds: z.number().int().nonnegative(),
  dailyTargetSeconds: z.number().int().nonnegative(),
  localDayBoundary: z.string(),
  updatedAt: z.string().datetime(),
});

export const forgeHistorySchema = z.object({
  id: z.string(),
  forgeCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

// Phase 4 / REJ-01: append-only rejuvenation history row. Mirrors RejuvenationRecord
// field-for-field (src/domain/records.ts). Every economy field is a nonnegative
// integer; timestamps are ISO datetime strings.
export const rejuvenationSchema = z.object({
  id: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationSeconds: z.number().int().nonnegative(),
  chargeConsumed: z.number().int().nonnegative(),
  integrationGained: z.number().int().nonnegative(),
  tokensGranted: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const operationSchema = z.object({
  id: z.string(),
  commandType: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  payloadVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(['pending', 'applied', 'failed']),
  payload: z.unknown(),
});

export const archiveSchema = z.object({
  // Phase 4: the envelope version is now 1 | 2. v1 archives (exported before
  // rejuvenations existed) are accepted; v2 archives carry the rejuvenations
  // array. The optional rejuvenations field below is what lets a v1 archive parse.
  archiveVersion: z.union([z.literal(1), z.literal(2)]),
  exportedAt: z.string(),
  client: clientSchema,
  cells: z.array(cellSchema),
  core: coreSchema,
  moduleInstances: z.array(moduleInstanceSchema),
  routes: z.array(routeSchema),
  sessions: z.array(sessionSchema),
  operations: z.array(operationSchema),
  settings: settingsSchema,
  forgeHistory: z.array(forgeHistorySchema),
  // Optional so a v1 archive (no rejuvenations field) parses; a v2 archive
  // includes it. import-validation.ts defaults a missing field to [].
  rejuvenations: z.array(rejuvenationSchema).optional(),
});

// Drift guards: a record-shape change in src/domain that is not mirrored here
// fails this typecheck, surfacing schema drift at the import boundary rather than
// letting an import silently accept (or reject) the wrong shape. `satisfies` checks
// that the schema-inferred type is assignable to the domain record type without
// widening the const's type.
//
// `entityType` is deliberately `z.string()` here (per the boundary field rules) so
// untrusted archives are not rejected for an entityType the simulation's lenient
// validateOperationShape would also accept. The operation guard therefore omits
// entityType and checks every other field — the structural drift we care about.
const _sessionSchemaCheck = null as unknown as z.infer<typeof sessionSchema> satisfies SessionRecord;
const _rejuvenationSchemaCheck =
  null as unknown as z.infer<typeof rejuvenationSchema> satisfies RejuvenationRecord;
const _operationSchemaCheck =
  null as unknown as Omit<z.infer<typeof operationSchema>, 'entityType'> satisfies Omit<
    SyncOperation,
    'entityType'
  >;
void _sessionSchemaCheck;
void _rejuvenationSchemaCheck;
void _operationSchemaCheck;
