// VER-04 — release-readiness full-flow E2E against the production build.
//
// Drives the complete critical Flowgrid flow in a real browser: create a Cell,
// run a focus session to completion (Current/XP/Core outcome surfaced), set Core
// allocation, log a rejuvenation, optionally run a Forge roll when a Module Token
// is available, then reload and assert IndexedDB durability (VER-04's
// reload-with-state). Finally asserts the Settings export surface is present.

import { test, expect } from '@playwright/test';

const CELL_NAME = 'E2E Release Cell';

// Sessions shorter than 1s route through cancel ("Session too short to record"),
// so a focus session must run > 1s to be recorded as a real completion.
const MIN_RECORDED_SESSION_MS = 1200;

test('VER-04: create Cell → focus → outcome → allocation → rejuvenation → reload-with-state', async ({ page }) => {
  await page.goto('/');

  // Wait for the store to load: the starter Cell seeds on first run.
  await expect(page.getByText('active Cell')).toBeVisible();

  // (2) Create a Cell via the New Cell dialog.
  await page.getByRole('button', { name: 'New Cell' }).click();
  await page.getByLabel('Cell name').fill(CELL_NAME);
  await page.getByRole('button', { name: 'Create Cell' }).click();

  // CreateCellForm navigates to the new Cell's board; return home to use the
  // semantic Cell list (deterministic, D-06).
  await page.getByRole('link', { name: 'Return to Flowgrid' }).click();
  await expect(page.getByText(/active Cells?\./)).toBeVisible();

  // (3) Navigate to the new Cell via the semantic Cell list and run a session.
  await page.getByRole('link', { name: CELL_NAME }).click();
  await expect(page.getByRole('heading', { name: CELL_NAME })).toBeVisible();

  await page.getByRole('button', { name: 'Start Focus Session' }).click();
  await page.waitForTimeout(MIN_RECORDED_SESSION_MS);
  await page.getByRole('button', { name: 'Finish' }).click();

  // (4) Assert completion feedback (Current/XP/Core outcome text).
  await expect(page.getByRole('status', { name: 'Session summary' })).toBeVisible();
  await expect(page.getByText('Session Complete')).toBeVisible();

  // (5) Navigate to Core, set allocation, Apply.
  await page.goto('/core');
  await expect(page.getByRole('heading', { name: 'Core' })).toBeVisible();
  const convertInput = page.getByLabel('Convert %');
  const storeInput = page.getByLabel('Store %');
  await convertInput.fill('60');
  await storeInput.fill('40');
  await page.getByRole('button', { name: 'Apply Allocation' }).click();
  // Allocation applied (60/40); the surfaced Core stat grid reflects Convert 60.
  await expect(page.locator('dl').first().getByText('60')).toBeVisible();

  // (6) Log a rejuvenation. With 0 Core Charge this is an honored no-op rest
  // (chargeConsumed=0); a RejuvenationRecord still appends and the summary shows.
  await page.getByRole('button', { name: 'Start Rejuvenation' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByRole('status', { name: 'Rejuvenation summary' })).toBeVisible();
  await expect(page.getByText('Rejuvenation Complete')).toBeVisible();

  // (7) Forge — conditional on a Module Token being available (REJ-04 threshold).
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
  await page.goto('/');
  await page.reload();
  await expect(page.getByText(/active Cells?\./)).toBeVisible();
  await expect(page.getByRole('link', { name: CELL_NAME })).toBeVisible();

  // (9) Settings export surface is present.
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Export full state (JSON)' })).toBeVisible();
});
