// PersistenceError renderer (Phase 2 typed contract consumed, Phase 3 UI-01 surface).
//
// Phase 2 shipped PersistenceError as a typed value that flows through ApplyResult
// → Zustand store.lastError → here. The banner renders the user-facing message and
// recoverable hint, and uses role="alert" so screen readers announce it on mount.
//
// Phase 06.2 W-01 (DATA-07): kind-specific RECOVERY_HINTS so the `blocked_upgrade`
// error surfaces actionable "close other tabs" copy. The map is keyed by
// PersistenceErrorKind; only `blocked_upgrade` has specialized copy today — other
// kinds fall through to the generic recoverable / non-recoverable branches.

import type { PersistenceError, PersistenceErrorKind } from '../../persistence/errors.js';

// Phase 06.2 W-01 / DATA-07: kind-specific recovery copy. Only `blocked_upgrade`
// has a specialized hint today; other kinds use the generic recoverable /
// non-recoverable branches below. The literal `blocked_upgrade` appears here so
// the DATA-07 grep gate (`grep blocked_upgrade src/ui/`) returns a match and the
// banner can branch on the typed kind.
const RECOVERY_HINTS: Partial<Record<PersistenceErrorKind, string>> = {
  blocked_upgrade: 'Close other Flowgrid tabs in this browser, then reload to continue.',
};

interface ErrorBannerProps {
  readonly error: PersistenceError | null;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  if (error === null) return null;
  // Phase 06.2 W-01: prefer the kind-specific recovery hint when one exists;
  // otherwise fall back to the generic recoverable / non-recoverable copy.
  const kindHint = RECOVERY_HINTS[error.kind];
  return (
    <div role="alert" data-kind={error.kind} className="rounded-lg border border-error/50 bg-error/10 p-4 space-y-1">
      <strong className="block font-semibold text-error">Flowgrid couldn't save that change.</strong>
      <p className="text-sm text-slate-300">{error.message}</p>
      {error.recoverable && kindHint !== undefined ? (
        <p className="text-sm text-slate-300">{kindHint}</p>
      ) : error.recoverable ? (
        <p className="text-sm text-slate-300">You can retry — the error is recoverable.</p>
      ) : (
        <p className="text-sm text-slate-300">This error isn't automatically recoverable.</p>
      )}
    </div>
  );
}
