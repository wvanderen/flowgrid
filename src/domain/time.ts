// Time primitive aliases.
//
// Phase 1 simulation never constructs these from ambient time. Commands receive
// `now` and `localDate` via SimulationEnv; tests inject deterministic values.

export type IsoDateTimeString = string;
export type LocalDateString = string;
