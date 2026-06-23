// Numeric and content-version primitive aliases.
//
// Per AGENTS.md: "Store economy values as integers and allocation basis points where
// possible. Avoid floats for durable economy truth." These aliases document integer
// intent; runtime enforcement lives in the invariant validators (Plan 01-03).

export type Int = number;
export type IntNonNegative = number;
export type IntPositive = number;
export type IntPercent = number;
export type IntSeconds = number;
export type ContentVersion = string;
