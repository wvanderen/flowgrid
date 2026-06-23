// Day-rollover reconciliation system (D-13, D-14, D-16).
//
// Two pure, side-effect-free functions:
//   - deriveLocalDate(now, localDayBoundary) — D-16 boundary-shifted date.
//   - reconcileDayRollover(snapshot, env) — D-13 stale-state reset + D-14 Momentum decay.
//
// Called at app open after repository.loadSnapshot(), before first UI render.
// It is belt-and-suspenders: durable truth is also re-checked inline by each
// Cell-touching command. Both functions are pure value-in/value-out — replay-safe.
//
// CRITICAL — Pitfall 7: `cell.activation` is a monotonic lifetime counter. It is
// NEVER reset here. "Activated today" is *derived* from lastBloomLocalDate.

import type {
  CellId,
  CellRecord,
  FlowgridSnapshot,
  IsoDateTimeString,
  LocalDateString,
} from '../../domain/index.js';

// D-16: derive the effective local date from a UTC instant and a 'HH:MM' boundary.
// The boundary marks the start of the local day; subtracting the offset shifts
// the calendar date for early-UTC times in positive-offset local days.
export function deriveLocalDate(
  now: IsoDateTimeString,
  localDayBoundary: string,
): LocalDateString {
  const [hhStr, mmStr] = localDayBoundary.split(':');
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  const offsetMs = ((Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0)) * 60 * 1000;
  const adjustedMs = new Date(now).getTime() - offsetMs;
  return new Date(adjustedMs).toISOString().slice(0, 10) as LocalDateString;
}

export type ReconcileEnv = {
  readonly now: IsoDateTimeString;
  readonly localDate: LocalDateString;
};

// D-13 + D-14: reset stale per-day state. For each Cell whose lastBloomLocalDate is
// non-null and differs from env.localDate:
//   - reset dailyMilestoneProgressSeconds to 0
//   - apply Momentum -1 if the prior bloom-day had NO completed session (floor at 0)
//   - advance updatedAt to env.now
//   - NEVER reset cell.activation (Pitfall 7 — monotonic lifetime)
// Cells that never bloomed (lastBloomLocalDate null) or bloomed today are unchanged.
//
// Momentum-decay check (D-14 / Open Question Q2): compare
//   session.startedAt.slice(0,10) === cell.lastBloomLocalDate
// i.e. the local date the cell last bloomed. This avoids penalizing a user who
// bloomed late, slept, and reconciles the next morning.
export function reconcileDayRollover(
  snapshot: FlowgridSnapshot,
  env: ReconcileEnv,
): FlowgridSnapshot {
  const cells = new Map<CellId, CellRecord>(snapshot.cells);
  for (const [id, cell] of cells) {
    // Skip never-bloomed (null) and already-today cells.
    if (cell.lastBloomLocalDate === null || cell.lastBloomLocalDate === env.localDate) {
      continue;
    }

    const hadSessionOnBloomDay = snapshot.sessions.some(
      (s) => s.cellId === id && s.startedAt.slice(0, 10) === cell.lastBloomLocalDate,
    );
    const momentum = hadSessionOnBloomDay
      ? cell.momentum
      : Math.max(0, cell.momentum - 1);

    cells.set(id, {
      ...cell,
      dailyMilestoneProgressSeconds: 0,
      // NOTE: activation is intentionally NOT reset — it is monotonic lifetime.
      momentum,
      updatedAt: env.now,
    });
  }

  return { ...snapshot, cells };
}
