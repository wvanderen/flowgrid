// src/content public barrel.

export { STARTER_CONTENT_VERSION } from './content-version.js';
export {
  BLOOM_MODULE_DEFINITION_ID,
  CHARGE_CORE_MODULE_DEFINITION_ID,
  GENERATOR_MODULE_DEFINITION_ID,
  OUTPUT_MODULE_DEFINITION_ID,
  STARTER_MODULE_DEFINITIONS,
  getStarterModuleDefinitionByKind,
} from './starter-modules.js';
export {
  ALLOCATION_TOTAL_PERCENT,
  CORE_CONVERT_RATE,
  CORE_STORE_RATE,
  CURRENT_PER_SECOND,
  DEFAULT_CONVERT_ALLOCATION_PERCENT,
  DEFAULT_DAILY_MILESTONE_TARGET_SECONDS,
  DEFAULT_DAILY_TARGET_SECONDS,
  DEFAULT_LOCAL_DAY_BOUNDARY,
  DEFAULT_SESSION_LENGTH_SECONDS,
  DEFAULT_STORE_ALLOCATION_PERCENT,
  SECONDS_PER_MINUTE,
  STARTER_CELL_NAME,
  XP_PER_MINUTE,
  focusToCurrent,
  focusToXp,
  isDailyMilestoneComplete,
  splitCoreCurrent,
} from './formulas.js';
export { createStarterFlowgridState } from './starter-state.js';
export type { CreateStarterFlowgridStateParams } from './starter-state.js';
