// Plan 01-01 placeholder barrel.
//
// Plan 01-02 replaces this file with re-exports from content-version.ts,
// starter-modules.ts, starter-state.ts, formulas.ts.
//
// `createStarterFlowgridState` is a typed stub: it throws at runtime because the
// real starter content factory lands in Plan 01-02. The signature is shaped to match
// the foundation-loop test contract so the test compiles and fails only at runtime.

import type {
  ContentVersion,
  IsoDateTimeString,
  FlowgridSnapshot,
} from '../domain/index.js';

export type CreateStarterFlowgridStateParams = {
  readonly now: IsoDateTimeString;
  readonly localDate: IsoDateTimeString;
  readonly clientId: string;
  readonly cellId: string;
  readonly coreId: string;
  readonly generatorModuleInstanceId: string;
  readonly chargeCoreModuleInstanceId: string;
  readonly outputModuleInstanceId: string;
  readonly bloomModuleInstanceId: string;
  readonly outputRouteId: string;
  readonly settingsId: string;
  readonly forgeHistoryId: string;
};

export const STARTER_CONTENT_VERSION: ContentVersion = 'phase-1-starter-v1';

export function createStarterFlowgridState(
  _params: CreateStarterFlowgridStateParams,
): FlowgridSnapshot {
  throw new Error(
    'Plan 01-01 stub: createStarterFlowgridState is implemented in Plan 01-02.',
  );
}
