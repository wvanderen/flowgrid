// PersistenceError renderer (Phase 2 typed contract consumed, Phase 3 UI-01 surface).
//
// Phase 2 shipped PersistenceError as a typed value that flows through ApplyResult
// → Zustand store.lastError → here. The banner renders the user-facing message and
// recoverable hint, and uses role="alert" so screen readers announce it on mount.

import type { PersistenceError } from '../../persistence/errors.js';

interface ErrorBannerProps {
  readonly error: PersistenceError | null;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  if (error === null) return null;
  return (
    <div role="alert" data-kind={error.kind} className="rounded-lg border border-error/50 bg-error/10 p-4 space-y-1">
      <strong className="block font-semibold text-error">Flowgrid couldn't save that change.</strong>
      <p className="text-sm text-slate-300">{error.message}</p>
      {error.recoverable ? (
        <p className="text-sm text-slate-300">You can retry — the error is recoverable.</p>
      ) : (
        <p className="text-sm text-slate-300">This error isn't automatically recoverable.</p>
      )}
    </div>
  );
}
