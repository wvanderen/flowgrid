// RejuvenationTimer — cosmetic elapsed-time display for an active rejuvenation
// (D-04 / Phase 3 D-06 carry-over).
//
// Purely visual: the elapsed seconds shown here are recomputed from `startedAt` on a
// one-second tick and NEVER touch durable state. The true rejuvenation duration is
// computed at Finish time as floor((endedAt - startedAt) / 1000) inside CorePanel's
// Finish handler (which dispatches log_rejuvenation with the derived duration).
// Clearing the interval on unmount prevents leaks (mirrors SessionTimer / T-03-12).
//
// Boundary: this file imports nothing from src/simulation — it only renders a clock.

import { useEffect, useState } from 'react';

import { formatElapsed } from '../cell-board/SessionTimer.js';

interface RejuvenationTimerProps {
  readonly startedAt: string;
}

function elapsedSeconds(startedAt: string): number {
  return (Date.now() - new Date(startedAt).getTime()) / 1000;
}

export function RejuvenationTimer({ startedAt }: RejuvenationTimerProps) {
  const [elapsed, setElapsed] = useState(() => elapsedSeconds(startedAt));

  useEffect(() => {
    // Re-sync on startedAt change, then tick once per second (D-04 cosmetic).
    setElapsed(elapsedSeconds(startedAt));
    const intervalId = setInterval(() => {
      setElapsed(elapsedSeconds(startedAt));
    }, 1000);
    return () => {
      clearInterval(intervalId);
    };
  }, [startedAt]);

  const wholeSeconds = Math.max(0, Math.floor(elapsed));

  return (
    <time
      aria-live="polite"
      dateTime={`PT${wholeSeconds}S`}
      data-testid="rejuvenation-timer"
      className="font-mono text-lg font-semibold text-core"
    >
      {formatElapsed(elapsed)}
    </time>
  );
}
