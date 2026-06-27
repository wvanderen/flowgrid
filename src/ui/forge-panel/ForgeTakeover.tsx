// ForgeTakeover — full-screen overlay wrapper for /forge (Phase 6.1 D-02).
//
// Wraps the existing ForgePanel in a fixed inset-0 z-50 container so the forge UI
// renders ABOVE the still-mounted FlowgridCanvas (which AppLayout keeps mounted
// in the layout slot). The fixed positioning + high z-index is the load-bearing
// property: it escapes the canvas's stacking context so the overlay covers the
// full viewport at document-body level (RESEARCH Pitfall 5). Radix Portal is NOT
// required here because ForgeTakeover is not a Radix Dialog — the fixed-inset-0-
// z-50 wrapper achieves the same document-body-level layering.
//
// Returning from /forge is instant: the route swaps back to /, AppLayout stays
// mounted, takeoverActive flips false, the canvas ticker resumes — no Pixi
// re-init, no scene rebuild (D-05 preserved across takeovers).
//
// Seed decision 4 ("accept the miss" for mid-takeover events) means Forge
// flashes may be missed while Forge is open. The emit-gate in FlowgridCanvas's
// onVisualEvents drops them byte-safe (UI-04 — visual events are transient).

import type { ReactNode } from 'react';

import { ForgePanel } from './ForgePanel.js';

export function ForgeTakeover(): ReactNode {
  return (
    <div
      className="fixed inset-0 z-50 overflow-auto bg-flowgrid-bg"
      data-testid="forge-takeover-root"
      role="dialog"
      aria-label="Forge"
    >
      <ForgePanel />
    </div>
  );
}
