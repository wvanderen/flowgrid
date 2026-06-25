// ReturnCues — contextual stat-chip rail on FlowgridHome (UI-07, D-05/D-06/D-07/D-08).
//
// Surfaces absolute Core economy values (Charge / Energy / Tokens) plus a near-Bloom
// Cell chip and a recent-history note whenever actionable state exists, and renders
// NOTHING when there is none (D-05 contextual trigger). All framing is neutral and
// informational — every string stays neutral and forgiving (prohibition 6).
//
// Boundary (T-04-13): the UI never computes economy rules. The only derivation here is
// reading absolute values from the snapshot and a milestone-distance comparison for
// the near-Bloom chip (a read-only projection, not an economy mutation). The near-Bloom
// chip navigates to that Cell's Board via React Router so the user can start the
// session that completes Bloom; the other chips are flat informational values (D-07).

import { useNavigate } from 'react-router';

import { DEFAULT_SESSION_LENGTH_SECONDS, forgeEnergyCost } from '../../content/index.js';
import { useFlowgridStore } from '../../app/store/dispatch.js';

// A Cell is "near Bloom" when its remaining daily-milestone seconds fit within one
// default session (D-06). Both this constant and the daily milestone target are 1500s,
// so "1 session from Bloom" reads accurately.
const NEAR_BLOOM_THRESHOLD_SECONDS = DEFAULT_SESSION_LENGTH_SECONDS;

export function ReturnCues() {
  const navigate = useNavigate();
  const snapshot = useFlowgridStore((s) => s.snapshot);

  if (snapshot === null) return null;

  const { core } = snapshot;

  // D-05 actionable-state booleans. Absolute values only (D-07).
  const hasCharge = core.coreCharge > 0;
  const hasEnergy = core.energy > 0;
  const hasTokens = core.moduleTokens > 0;
  const hasRecentHistory = snapshot.sessions.length > 0;

  // Phase 5 / D-12: Forge readiness. The chip surfaces when the user can afford at
  // least one roll — either a Module Token OR enough Energy for the next cost
  // (forgeEnergyCost(core.forgeCount), pure content derivation D-02). Pitfall 7:
  // this chip lives in the ReturnCues rail ABOVE the canvas and navigates to
  // /forge — it never intercepts the protected open app → tap Cell → start session
  // flow on the FlowgridHome canvas below.
  const nextForgeEnergyCost = forgeEnergyCost(core.forgeCount);
  const canForge = hasTokens || core.energy >= nextForgeEnergyCost;

  // D-06: the closest-to-Bloom active Cell within one session of its milestone.
  const activeCells = [...snapshot.cells.values()].filter((c) => c.archivedAt === null);
  let nearBloomCell: { id: string; name: string } | null = null;
  let smallestRemaining = Number.POSITIVE_INFINITY;
  for (const cell of activeCells) {
    const remaining = cell.dailyMilestoneTargetSeconds - cell.dailyMilestoneProgressSeconds;
    if (remaining <= NEAR_BLOOM_THRESHOLD_SECONDS && remaining < smallestRemaining) {
      smallestRemaining = remaining;
      nearBloomCell = { id: cell.id, name: cell.name };
    }
  }

  // D-05: render nothing when there is no actionable state.
  if (!hasCharge && !hasEnergy && !hasTokens && nearBloomCell === null && !hasRecentHistory && !canForge) {
    return null;
  }

  return (
    <section aria-label="Return cues" aria-live="polite" className="flex flex-wrap items-center gap-3">
      {hasCharge ? (
        <span className="text-sm text-slate-400">Charge {core.coreCharge}</span>
      ) : null}
      {hasEnergy ? (
        <span className="text-sm text-slate-400">Energy {core.energy}</span>
      ) : null}
      {hasTokens ? (
        <span className="text-sm text-slate-400">Tokens {core.moduleTokens}</span>
      ) : null}
      {nearBloomCell !== null ? (
        <button
          type="button"
          onClick={() => navigate(`/cells/${nearBloomCell.id}`)}
          className="text-sm text-core underline"
        >
          {nearBloomCell.name}: 1 session from Bloom
        </button>
      ) : null}
      {canForge ? (
        <button
          type="button"
          onClick={() => navigate('/forge')}
          className="text-sm text-core underline"
        >
          Forge ready
        </button>
      ) : null}
      {hasRecentHistory ? (
        <span className="text-sm text-slate-400">Recent sessions: {snapshot.sessions.length}</span>
      ) : null}
    </section>
  );
}
