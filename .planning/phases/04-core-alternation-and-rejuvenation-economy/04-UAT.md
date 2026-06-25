---
status: complete
phase: 04-core-alternation-and-rejuvenation-economy
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md]
mode: standard
started: 2026-06-24T21:49:15Z
updated: 2026-06-24T22:14:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill the dev server, clear IndexedDB + localStorage (DevTools > Application > Storage > Clear site data), run `npm run dev`. App boots, the v2->v3 Dexie migration runs cleanly, and the Flowgrid home route loads with a live Core (Energy/Charge/Integration/Module Tokens visible) and no console errors about missing stores or failed upgrades.
result: pass

### 2. Open the /core Route
expected: From FlowgridHome, navigate to /core (header Core link or direct URL). A CorePanel renders the six Core pieces: Energy, Core Charge, Integration (current value AND the next derived threshold), Module Tokens, and the Convert/Store allocation control. Back-to-Home link works.
result: pass

### 3. Set Core Allocation (Convert vs Store)
expected: On /core, adjust the Convert/Store allocation inputs to a valid split summing to 100% (e.g. 50/50). Click Apply Allocation. Allocation saves; the new split is reflected on the panel. Subsequent focus sessions route Current/Charge per the split.
result: pass
note: "UX feedback: two free inputs are clunky. Suggested: auto-balance (adjusting one auto-sets the other to keep the 100% sum) or a single slider. Not a defect — works as specified."

### 4. Reject Invalid Allocation
expected: Set allocation inputs to a split that does NOT sum to 100% (e.g. Convert 30 / Store 50 = 80%). The panel shows an inline sum hint, AND clicking Apply Allocation surfaces a rejection message (invalid_core_allocation_total) via lastRejection. Allocation is NOT saved.
result: pass

### 5. Spend Energy on Activation Boost
expected: With >= 50 Energy on /core, purchase Activation Boost. Energy decrements by the tier cost (50/100/200), boost level increments (0->1), and the panel reflects the new level. At level 3 the purchase is disabled (cap). A subsequent focus session on an Activated cell grants +15% Current per level (level 1 bonus observable).
result: pass

### 6. Start a Rejuvenation
expected: With Core Charge available on /core, click Start Rejuvenation. A cosmetic timer begins ticking up live (seconds/minutes). The Core is marked as actively rejuvenating.
result: pass

### 7. Cross-Type Mutual Exclusion (Focus XOR Rejuvenation)
expected: While a rejuvenation is active, starting a focus session is blocked (and vice versa: while a focus session is active, Start Rejuvenation is disabled). Only one active session of either type can exist app-wide at a time.
result: pass

### 8. Finish a Rejuvenation (Charge -> Integration -> Tokens)
expected: Let a rejuvenation run for a bit, then click Finish. A RejuvenationSummary panel appears showing: Charge processed, Integration gained, Module Tokens granted (when a threshold is crossed), and distance to next threshold. The summary PERSISTS on screen (does not auto-dismiss) until the next dispatch.
result: pass

### 9. Cancel a Rejuvenation (Writes Nothing Durable)
expected: Start a rejuvenation, then click Cancel. The active-rejuvenation marker clears, the timer stops, and NO RejuvenationRecord is written — Energy/Charge/Integration/Module Tokens are unchanged. (Cancel is a no-durable-write operation.)
result: pass

### 10. ReturnCues Rail on Home
expected: On FlowgridHome, a contextual stat-chip rail appears above the canvas showing absolute Core Charge/Energy/Module Tokens, plus a tappable near-Bloom chip when a Cell is close to Bloom, plus a recent-history note when there is recent activity. When there is no actionable state it renders nothing. Language is neutral/forgiving (no streak/guilt/missed framing).
result: pass

### 11. Interrupted-Rejuvenation Resume Prompt (D-02)
expected: Start a rejuvenation on /core, then reload the page. On FlowgridHome, a resume/discard banner appears for the interrupted rejuvenation. Resume navigates to /core; Discard dispatches cancel (no durable write). It does not overlap with any focus-session resume prompt (D-02 mutual exclusion).
result: pass

### 12. Persistence Across Reload
expected: After finishing a rejuvenation and/or purchasing an Activation boost, reload the page. Energy, Core Charge, Integration, Module Tokens, boost level, and the last RejuvenationSummary all persist correctly (sourced from the durable IndexedDB records, not lost on reload).
result: pass

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]

## Enhancement Notes

<!-- Non-blocking UX/quality suggestions captured during UAT. Not defects — features pass as specified. Candidates for a future hardening/polish phase. -->

- **Allocation input UX (from Test 3):** The Convert/Store allocation uses two independent free-text number inputs requiring the user to mentally sum to 100. Suggested improvement: auto-balance the paired input (adjusting one derives the other to preserve the 100% total) or replace with a single slider. The ratio is already known and can be enforced automatically. Current behavior (two free inputs + inline sum hint + server rejection) is intentional per the 04-03 design decision to demonstrate the invalid_core_allocation_total rejection path.
