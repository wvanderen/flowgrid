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
    <div role="alert" data-kind={error.kind}>
      <strong>Flowgrid couldn't save that change.</strong>
      <p>{error.message}</p>
      {error.recoverable ? (
        <p>You can retry — the error is recoverable.</p>
      ) : (
        <p>This error isn't automatically recoverable.</p>
      )}
    </div>
  );
}
