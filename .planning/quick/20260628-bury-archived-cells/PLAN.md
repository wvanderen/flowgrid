# Bury Archived Cells Plan

## Goal

Keep the main Flowgrid stage from scrolling because of archived-cell management.

## Scope

- Remove `ArchivedCellsFilter` from `AppLayout`.
- Move `ArchivedCellsFilter` into the Settings route as a buried maintenance affordance.
- Update focused UI tests to assert the new placement.
- Verify typecheck and affected UI tests.

## Design Intent

The main view should behave like a living diagram, not a document with management sections below it. Archiving is not part of the core mental model right now, so it belongs in Settings rather than the first-viewport gameplay surface.
