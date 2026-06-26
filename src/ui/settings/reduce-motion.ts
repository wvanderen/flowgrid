// Reduced-motion UI helpers (Phase 6 / D-08, D-09).
//
// The persisted SettingsRecord.reduceMotion boolean IS the effective value (D-08:
// one flag satisfies both "reduced" and "disabled"). effectiveReduceMotion returns
// it unchanged so the renderer can gate its ticker/particle systems on the durable
// truth rather than re-reading the media query (Pitfall 6 — compute effective value
// in ONE place, the UI/store; the renderer never reads matchMedia directly).
//
// prefersReducedMotion reads the OS preference, guarded for non-browser (SSR/test)
// environments. It is used ONLY by the first-load OS-preference honoring (D-09):
// when the persisted setting is false but the OS asks for reduced motion, the
// SettingsPanel mount effect dispatches a one-time update_settings to persist true.

export function effectiveReduceMotion(setting: boolean): boolean {
  return setting;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
