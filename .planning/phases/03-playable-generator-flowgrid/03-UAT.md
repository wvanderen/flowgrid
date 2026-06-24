---
status: diagnosed
phase: 03-playable-generator-flowgrid
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-06-23T20:30:00Z
updated: 2026-06-24T02:59:29Z
---

## Current Test

[testing complete]

## Tests

### Section 1 — User-Flow Walk-Through (MVP)

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Start the app from scratch with `npm run dev`. The dev server boots without errors, the page loads, and the Flowgrid app renders (no blank screen, no console crash). The initApp sequence (loadSnapshot → day-rollover → store ready) completes before React mounts.
result: pass

### 2. Open App — Flowgrid Home Renders
expected: Navigate to the app URL. You see an accessible `<h1>Flowgrid</h1>` heading. The Core-centered hex scene renders (Core at center, any non-archived Cells in rings around it, route lines back to Core). A "New Cell" button is visible. If this is a fresh install you see an empty/ready state with zero active cells.
result: issue
reported: "Hexes aren't quite centered and some go off the edges of the frame. Besides that things look as expected"
severity: cosmetic

### 3. Create a Cell
expected: Click the "New Cell" button. A Radix Dialog opens with CreateCellForm (name, color, dailyTargetSeconds fields). Fill in a name (e.g. "Music"), pick a color, set a daily target, and submit. The dialog closes and you navigate to the new Cell's Board at `/cells/:cellId`.
result: pass

### 4. Cell Board Shows Cell + Starter Modules
expected: On the Cell Board you see the CellInspector (XP, Momentum, Charge, daily milestone like "Xm/Ym", Activation state, recent sessions), four accessible starter ModuleTiles, the GeneratorTile (showing a Start action), and CellActions.
result: pass

### 5. Start Generator Session
expected: Click Start on the GeneratorTile. The session becomes active: a SessionTimer begins counting, and the tile switches to show Finish and Cancel actions. No errors. (Tapping Start on a second cell should be rejected — one active session across the whole Flowgrid.)
result: issue
reported: "It's rejected but the button just appears nonresponsive when clicked on the second cell. not good UX. Otherwise this passes"
severity: minor

### 6. Finish Session → SessionSummary + Rewards
expected: Let the timer run a few seconds (or more), then click Finish. A SessionSummary inline panel appears showing duration, Current earned, XP, milestone %, Bloom status, Activation status, and Energy/Core Charge outcome. The Cell's numbers update to reflect the earned rewards.
result: pass

### 7. Cancel Session Safely
expected: Start another session, then immediately click Cancel. The session returns to the Start state. No session row is recorded for the cancel (cancel writes nothing durable). The GeneratorTile shows Start again.
result: pass

### 8. See Cell Progress (Current/XP/Momentum/Activation)
expected: After finishing a session, the CellInspector reflects updated Current, XP, and Bloom Momentum (Momentum increments on Bloom). If the Cell reached Bloom, an Activation halo should appear and the Activation bonus (+10% Current) is indicated for the next finish.
result: pass

### 9. Resume Interrupted Session
expected: Start a session, then reload the browser tab (simulating an interruption). Return to Flowgrid Home. A ResumeSessionPrompt banner appears offering Resume or Discard. Discard clears the active session (cancel_focus_session); Resume returns you to the active session.
result: pass

### 10. Edit a Cell (Identity Only)
expected: On a Cell Board, use CellActions → Edit. An EditCellForm opens with name/color/icon/dailyTargetSeconds. Change the name/color and save. The Cell identity updates. (Economy fields like XP/Current/Charge cannot be set through this form.)
result: pass

### 11. Archive + Unarchive a Cell
expected: On a Cell Board, use CellActions → Archive. The Cell is archived (no longer on the main Flowgrid Home grid). On Flowgrid Home an ArchivedCellsFilter management section lists the archived cell with an Unarchive action. Unarchive returns it to the grid.
result: pass

### Section 2 — Technical Checks (run only after Section 1 passes)

### 12. One-Active-Session Invariant
expected: With a session active on one Cell, attempting to Start a session on a different Cell (or re-targeting the same Cell) is rejected. Only one Generator session can be active across the entire Flowgrid at once.
result: pass

### 13. Sub-Second Finish Routes to Cancel
expected: Start a session and Finish it within the same second. Instead of recording a zero-length session, it routes through cancel — no zero-length session is ever persisted to history.
result: pass

### 14. Edit Form Cannot Inject Economy Fields
expected: The edit_cell command dispatched from EditCellForm carries only identity fields (name/color/icon/dailyTargetSeconds). XP, Current, Charge, and Momentum are structurally absent from the dispatched command object and cannot be modified through the UI.
result: pass

### Section 3 — Coverage Check (goal-backward)

### 15. Protected First Loop End-to-End Coverage
expected: The phase delivers its stated outcome: from a Core-centered hex Flowgrid, a user can create a Cell, start a Generator session with minimal friction, finish or cancel it safely, and see Cell progress, Current, Bloom, Activation, and starter modules. The protected `open app → tap Cell → start session` interaction stays easy to use throughout.
result: issue
reported: "Finish triggers the session complete but session continues after pressing. Also there's no way to return to the home view without hitting back or navigating via URL. Centering issues on grid view prevent some grids from being accessed"
severity: major

## Summary

total: 15
passed: 12
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "The Core-centered hex scene renders centered within the canvas frame, with Core and Cell hexes fully visible inside the bordered viewport"
  status: failed
  reason: "User reported: Hexes aren't quite centered and some go off the edges of the frame. Besides that things look as expected"
  severity: cosmetic
  test: 2
  root_cause: "buildFlowgridScene draws the Core at axial (0,0) directly into Pixi stage coordinates, so the Core lands at pixel (0,0) instead of the center of the resized canvas. Ring cells are then laid out around that top-left origin, causing visible hexes to clip against the canvas frame and making some cells hard or impossible to tap."
  artifacts:
    - path: "src/render/flowgrid/scene.ts"
      issue: "Canvas scene appears anchored too far toward the top-left of the frame; some hexes clip at the frame edge"
    - path: "src/render/flowgrid/hex-layout.ts"
      issue: "Check layout centering/bounds math for small active-cell counts"
  missing:
    - "Center the Core/cell hex cluster within the available canvas viewport"
    - "Add enough scene padding or adaptive fit/scale so visible hexes do not clip against the canvas frame"
    - "Verify the fix with the provided screenshot scenario: 3 active Cells on Flowgrid Home"
  debug_session: "inline diagnosis 2026-06-24T02:59:29Z"

- truth: "When a second Generator Start is rejected because another session is active, the UI communicates the rejection instead of appearing nonresponsive"
  status: failed
  reason: "User reported: It's rejected but the button just appears nonresponsive when clicked on the second cell. not good UX. Otherwise this passes"
  severity: minor
  test: 5
  root_cause: "dispatch() drops rejected simulation results by returning null without writing validation issues or a user-facing message to flowgridStore. GeneratorTile also renders an enabled Start button for cells that are not the active cell even when another activeSession exists, so a rejected start_focus_session has no visible feedback and appears nonresponsive."
  artifacts:
    - path: "src/ui/cell-board/GeneratorTile.tsx"
      issue: "Rejected start_focus_session path does not surface visible feedback to the user"
    - path: "src/app/store/dispatch.ts"
      issue: "Check whether rejected simulation results are exposed through lastError/status for UI display"
  missing:
    - "Show clear feedback when Start is rejected due to an existing active session, such as an inline message or disabled/explanatory state"
    - "Keep the one-active-session invariant intact while making the rejection perceivable"
  debug_session: "inline diagnosis 2026-06-24T02:59:29Z"

- truth: "The protected first loop remains easy to complete end-to-end: Finish clears the active session UI, users can return Home without browser back/URL edits, and grid centering keeps cells accessible"
  status: failed
  reason: "User reported: Finish triggers the session complete but session continues after pressing. Also there's no way to return to the home view without hitting back or navigating via URL. Centering issues on grid view prevent some grids from being accessed"
  severity: major
  test: 15
  root_cause: "Three root causes combine here: completeFocusSession appends a SessionRecord but never clears cell.activeSessionStartedAt, so deriveActiveSession() keeps projecting the session as active after Finish; CellBoard's normal happy path lacks a Link or navigation control back to Flowgrid Home; and buildFlowgridScene draws around stage origin (0,0) rather than a centered/padded viewport, so grid clipping can prevent cell access."
  artifacts:
    - path: "src/ui/cell-board/GeneratorTile.tsx"
      issue: "After Finish completes, the active-session UI appears to continue instead of returning cleanly to Start"
    - path: "src/app/store/dispatch.ts"
      issue: "Check lastCompletedSession/activeSession projection and snapshot update after complete_focus_session"
    - path: "src/ui/cell-board/CellBoard.tsx"
      issue: "Cell Board lacks an in-app navigation affordance back to Flowgrid Home"
    - path: "src/render/flowgrid/scene.ts"
      issue: "Grid centering/access issue can prevent cells from being reached from the Flowgrid view"
  missing:
    - "Ensure Finish transitions the GeneratorTile back to the idle Start state while preserving the SessionSummary"
    - "Add a visible in-app Home/Flowgrid navigation control from Cell Board"
    - "Fix Flowgrid scene centering/padding so every visible Cell is accessible"
  debug_session: "inline diagnosis 2026-06-24T02:59:29Z"
