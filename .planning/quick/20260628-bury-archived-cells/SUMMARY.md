# Bury Archived Cells Summary

## Outcome

Archived-cell management no longer appears under the main Flowgrid stage.

- Removed `ArchivedCellsFilter` from `AppLayout`.
- Moved archived-cell recovery into Settings via `SettingsPanel`.
- Renamed the archived surface to "Cell maintenance" and framed it as recovery-only.
- Adjusted the desktop stage height and shell overflow so the main route does not document-scroll at 1280x720.
- Updated UI tests to assert the main stage omits archived controls and Settings owns the maintenance placement.

## Verification

- `npm run typecheck`
- `npm run test -- tests/ui/flowgrid-home.test.tsx tests/ui/cell-list-a11y.test.tsx tests/ui/settings-reduce-motion.test.tsx`
- `npm run lint`
- `npm run build`
- Playwright desktop smoke at 1280x720: main route `scrollHeight === clientHeight`, no archived controls in the main stage, no console errors.
- Playwright Settings smoke: "Cell maintenance" and "Show archived Cells" are reachable in Settings, no console errors.

## Notes

The Vite production build still reports the existing large chunk warning for Pixi-heavy bundles.
