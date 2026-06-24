// SessionTimer — cosmetic elapsed-time display (D-06).
//
// Purely visual: the elapsed seconds shown here are recomputed from `startedAt`
// via setInterval and NEVER touch durable state. The true session duration is
// computed at Finish time as floor((endedAt - startedAt) / 1000) inside
// GeneratorTile. Clearing the interval on unmount prevents leaks (T-03-12).

import { useEffect, useState } from 'react';

interface SessionTimerProps {
  readonly startedAt: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

function elapsedSeconds(startedAt: string): number {
  return (Date.now() - new Date(startedAt).getTime()) / 1000;
}

export function SessionTimer({ startedAt }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(() => elapsedSeconds(startedAt));

  useEffect(() => {
    // Re-sync on startedAt change, then tick once per second (D-06 cosmetic).
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
      data-testid="session-timer"
      className="font-mono text-lg font-semibold text-core"
    >
      {formatElapsed(elapsed)}
    </time>
  );
}
