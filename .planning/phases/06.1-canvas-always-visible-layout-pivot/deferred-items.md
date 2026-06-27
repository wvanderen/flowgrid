# Deferred Items — Phase 06.1

Out-of-scope issues discovered during phase execution. Not fixed per deviation
SCOPE BOUNDARY (pre-existing, unrelated to current task changes).

## Pre-existing test flake (Plan 01, NOT introduced by Plan 02)

**Test:** `tests/ui/flowgrid-home.test.tsx` > "AppLayout: navigating back to /
from /settings keeps the same canvas-mock identity + clears takeoverActive"

**Symptom:** Occasionally (≈1 in 5 full-suite runs) the assertion
`expect(flowgridStore.getState().takeoverActive).toBe(false)` fails after
`capturedRouter.navigate('/')`. Passes consistently in isolation
(`npx vitest run tests/ui/flowgrid-home.test.tsx`).

**Likely cause:** A timing race between AppLayout's `useEffect` that pushes
`takeoverActive` into `flowgridStore` and the test's synchronous state read
after `await screen.findByTestId(...)`. Under full-suite concurrent load the
effect microtask can land after the assertion.

**Discovered during:** Phase 06.1 Plan 02 final verification (full `vitest run`).

**Plan 02 changes that COULD have influenced it:** none directly. Plan 02 added
the `cellSwitcherOpen` state + Radix Menu + ZLiftDock render in AppLayout, but
the test in question does not exercise those paths (it navigates / → /settings
→ /, neither of which surfaces the dock or the Cell-switcher).

**Suggested future fix:** wrap the post-navigation state assertion in
`waitFor(() => expect(flowgridStore.getState().takeoverActive).toBe(false))`
or `await act(async () => {})` to flush pending effects. Tracked for a future
hardening pass; not blocking Plan 02 acceptance (the assertion is correct, the
flake is environmental).
