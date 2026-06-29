---
status: in_progress
created: 2026-06-27T23:18:41Z
source: codex-inline
gsd_tool_status: "global shim failed: missing ../../../package.json"
---

# Visible Canvas Animation

## Task

Make the Flowgrid canvas visibly animated during active focus sessions and render start-event feedback.

## Context

Human smoke for Phase 06.1 reported that the canvas stays mounted and Z-Lift works, but Current trails, Bloom/Activation bursts, and Core ripples are imperceptible. The existing GSD state already tracks this as the active blocker.

## Plan

1. Use durable route ids for Pixi route anchors so simulation `currentFlowVisual` events can find their scene route.
2. Make `start_focus_session` emit the existing `focusSessionStartedVisual`, and teach the particle renderer to display it.
3. Add a render-layer ambient current ticker while a focus session is active, gated by reduce-motion and takeover state.
4. Add focused tests for route-anchor resolution and start-session visual events.
