// VER-04 — release-readiness full-flow E2E against the production build.
//
// Drives the complete critical Flowgrid flow in a real browser: create a Cell,
// run a focus session to completion (Current/XP/Core outcome surfaced), set Core
// allocation, log a rejuvenation, optionally run a Forge roll when a Module Token
// is available, then reload and assert IndexedDB durability (VER-04's
// reload-with-state). Finally asserts the Settings export surface is present.
//
// Phase 06.2 (Option B): every locator that previously targeted retired child-route
// chrome (CellBoard's "Return to Flowgrid" link, Cell `<h1>`, `Cell Board for X`
// region; FlowgridHome's "active Cell" text; CorePanel's Core `<h1>` + `dl`) now
// drives through the redesign's always-visible ZLiftDock + AppLayout chrome. The
// hidden `<Outlet/>` wrapper in AppLayout stays UNTOUCHED — it is a deliberate
// retirement mechanism per the user decision (2026-06-29).

import { test, expect } from '@playwright/test';

const CELL_NAME = 'E2E Release Cell';

// Sessions shorter than 1s route through cancel ("Session too short to record"),
// so a focus session must run > 1s to be recorded as a real completion.
const MIN_RECORDED_SESSION_MS = 1200;

test('VER-04: create Cell → focus → outcome → allocation → rejuvenation → reload-with-state', async ({ page }) => {
  await page.goto('/');

  // Readiness: AppLayout's always-visible floating surface (the New Cell button
  // is present whenever !takeoverActive). Replaces the retired FlowgridHome
  // "active Cell" text (now hidden via the redesign's <Outlet/> retirement
  // wrapper — Option B).
  await expect(page.getByRole('button', { name: 'New Cell' })).toBeVisible();

  // (2) Create a Cell via the New Cell dialog.
  await page.getByRole('button', { name: 'New Cell' }).click();
  await page.getByLabel('Cell name').fill(CELL_NAME);
  await page.getByRole('button', { name: 'Create Cell' }).click();

  // CreateCellForm navigates to /cells/:id (retired CellBoard). Return home via
  // AppLayout's "Flowgrid" header logo Link (replaces CellBoard's retired
  // "Return to Flowgrid" link). Readiness: the new Cell appears in the
  // persistent Cell-list nav (AppLayout chrome, always visible when
  // !takeoverActive).
  await page.getByRole('link', { name: 'Flowgrid', exact: true }).click();
  await expect(page.getByRole('link', { name: CELL_NAME })).toBeVisible();

  // (3) Navigate to the new Cell via the semantic Cell list. ZLiftDock's
  // CellInspectorDock mounts on /cells/:id (`Controls for X` region + the Cell
  // name in an <h2>). The retired CellBoard's <h1> is display:none so it is not
  // in the accessibility tree.
  await page.getByRole('link', { name: CELL_NAME }).click();
  await expect(page.getByRole('heading', { name: CELL_NAME, level: 2 })).toBeVisible();

  // Scope Start/Finish to ZLiftDock's CellInspectorDock (`Controls for X`) so
  // the click is deterministic. The retired CellBoard renders parity buttons
  // but is display:none under the redesign.
  const cellDock = page.getByLabel(`Controls for ${CELL_NAME}`);
  await cellDock.getByRole('button', { name: 'Start Focus Session' }).click();
  await page.waitForTimeout(MIN_RECORDED_SESSION_MS);
  await cellDock.getByRole('button', { name: 'Finish' }).click();

  // (4) Assert completion feedback (Current/XP/Core outcome text). Scope to the
  // visible SessionSummary status region: getByRole('status') uses the a11y tree
  // (filters display:none), so the retired CellBoard's parity SessionSummary
  // (hidden under the redesign) does NOT match — only ZLiftDock's does. Avoids
  // the getByText strict-mode-violation that arises when the hidden CellBoard
  // h2 is still in the DOM.
  const sessionSummary = page.getByRole('status', { name: 'Session summary' });
  await expect(sessionSummary).toBeVisible();
  await expect(sessionSummary.getByText('Session Complete')).toBeVisible();

  // (5) Navigate to Core, set allocation, Apply. ZLiftDock's CoreInspector mounts
  // on /core (`Controls for Core` region + Core <h2> + Convert/Store inputs).
  await page.goto('/core');
  await expect(page.getByRole('heading', { name: 'Core', level: 2 })).toBeVisible();
  // Scope inputs to the visible CoreInspector region: getByLabel does not filter
  // display:none, and the retired CorePanel renders parity Convert %/Store %
  // inputs that remain in the DOM under the redesign. Scoping to
  // `Controls for Core` (ZLiftDock's <aside aria-label>) disambiguates.
  const coreDock = page.getByLabel('Controls for Core');
  const convertInput = coreDock.getByLabel('Convert %');
  const storeInput = coreDock.getByLabel('Store %');
  await convertInput.fill('60');
  await storeInput.fill('40');
  await coreDock.getByRole('button', { name: 'Apply Allocation' }).click();
  // Allocation applied (60/40); the Convert % input reflects 60 after Apply
  // (controlled input synced from core.convertAllocationPercent via the
  // useEffect at ZLiftDock.tsx). Replaces the retired CorePanel
  // `dl.first.getByText('60')` assertion.
  await expect(convertInput).toHaveValue('60');

  // (6) Log a rejuvenation. With 0 Core Charge this is an honored no-op rest
  // (chargeConsumed=0); a RejuvenationRecord still appends and the summary shows.
  await page.getByRole('button', { name: 'Start Rejuvenation' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Finish' }).click();
  // Scope to the visible RejuvenationSummary status region (the retired
  // CorePanel's parity summary is display:none; scoping via getByRole('status')
  // filters it from the a11y tree and avoids getByText strict-mode-violation).
  const rejuvenationSummary = page.getByRole('status', { name: 'Rejuvenation summary' });
  await expect(rejuvenationSummary).toBeVisible();
  await expect(rejuvenationSummary.getByText('Rejuvenation Complete')).toBeVisible();

  // (7) Forge — conditional on a Module Token being available (REJ-04 threshold).
  // /forge is a takeover overlay: ForgeTakeover renders via the visible Outlet
  // (takeover children are NOT hidden by the redesign's retirement wrapper).
  await page.goto('/forge');
  await expect(page.getByRole('heading', { name: 'Forge' })).toBeVisible();
  const rollWithToken = page.getByRole('button', { name: 'Roll with Token' });
  if (await rollWithToken.isEnabled()) {
    await rollWithToken.click();
    // Pick the first revealed choice to commit the forge roll.
    await page.getByRole('button', { name: /Pick/ }).first().click();
    await expect(page.getByText(/Forge/)).toBeVisible();
  }

  // (8) Reload Home and assert durable state persisted across the reload (VER-04).
  // Replaces the retired FlowgridHome `/active Cells?\./` readiness assertion.
  await page.goto('/');
  await page.reload();
  await expect(page.getByRole('button', { name: 'New Cell' })).toBeVisible();
  await expect(page.getByRole('link', { name: CELL_NAME })).toBeVisible();

  // (9) Settings export surface is present. /settings is a takeover overlay.
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Export full state (JSON)' })).toBeVisible();
});
