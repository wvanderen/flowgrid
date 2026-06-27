// SettingsTakeover — full-screen overlay wrapper for /settings (Phase 6.1 D-02).
//
// Wraps the existing SettingsPanel in a fixed inset-0 z-50 container so the
// settings UI renders ABOVE the still-mounted FlowgridCanvas (which AppLayout
// keeps mounted in the layout slot). The fixed positioning + high z-index is
// the load-bearing property: it escapes the canvas's stacking context so the
// overlay covers the full viewport at document-body level (RESEARCH Pitfall 5).
// Radix Portal is NOT required here because SettingsTakeover is not a Radix
// Dialog — the fixed-inset-0-z-50 wrapper achieves the same document-body-level
// layering.
//
// Returning from /settings is instant: the route swaps back to /, AppLayout
// stays mounted, takeoverActive flips false, the canvas ticker resumes — no
// Pixi re-init, no scene rebuild (D-05 preserved across takeovers).

import type { ReactNode } from 'react';

import { SettingsPanel } from './SettingsPanel.js';

export function SettingsTakeover(): ReactNode {
  return (
    <div
      className="fixed inset-0 z-50 overflow-auto bg-flowgrid-bg"
      data-testid="settings-takeover-root"
      role="dialog"
      aria-label="Settings"
    >
      <SettingsPanel />
    </div>
  );
}
