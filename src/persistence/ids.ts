// The single persistence-generated ID.
//
// ClientRecord.id is the only ID persistence creates itself (Agent's Discretion
// from 02-CONTEXT.md / RESEARCH §7: crypto.randomUUID() is sufficient for a
// singleton device/client key and avoids a uuid runtime dependency). Operation
// and session IDs remain command-supplied (Phase 1 contract), never generated
// here.

export function generateClientId(): string {
  return crypto.randomUUID();
}
