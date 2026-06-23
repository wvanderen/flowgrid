// Stable typed ID aliases for Flowgrid durable entities.
//
// Phase 1 implementation note (deviation from Plan 01-02 Task 1 behavior text which
// asked for "branded" ID types): IDs are plain `string` aliases rather than
// intersection-branded strings. Plain aliases keep stable typed surfaces across
// Plans 01-01, 01-02, and 01-03 without forcing `as CellId` casts at every command
// construction site. Branding can be tightened in a later phase once the engine and
// command surface are stable; the validators in Plan 01-03 operate on string values
// directly and do not require branding to be correct.

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

export type EntityType =
  | 'client'
  | 'cell'
  | 'core'
  | 'module_definition'
  | 'module_instance'
  | 'module_slot'
  | 'route'
  | 'session'
  | 'operation'
  | 'settings'
  | 'forge_history';
