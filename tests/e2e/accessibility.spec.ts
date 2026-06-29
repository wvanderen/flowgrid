// VER-05 — keyboard-only flow + per-route axe WCAG scans against the production build.
//
// (A) Drives the critical actions via page.keyboard (Tab/Enter) only — no pointer
//     clicks — proving every canvas-backed action is reachable through the semantic
//     Cell list + non-canvas panels (D-06). (B) Runs an axe scan on every primary
//     route asserting zero WCAG 2.0/2.1 A+AA violations (T-06-12).
//
// Phase 06.2 (Option B): the keyboard flow + axe scans drive through the redesign's
// always-visible ZLiftDock + AppLayout chrome. The retired CellBoard / FlowgridHome
// / CorePanel child routes are display:none under the redesign's <Outlet/>
// retirement wrapper, so axe ignores them and only the visible floating chrome is
// analyzed.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const CELL_NAME = 'E2E A11y Cell';
const MIN_RECORDED_SESSION_MS = 1200;

interface ActiveElement {
  tag: string;
  role: string | null;
  name: string;
  href: string | null;
}

function nameMatches(actual: string, want: RegExp | string): boolean {
  return typeof want === 'string' ? actual.includes(want) : want.test(actual);
}

// Tab from the current focus position until an element matching role+name receives
// keyboard focus. Caps iterations so an unreachable target fails fast instead of
// looping the document forever.
async function tabTo(
  page: import('@playwright/test').Page,
  opts: { role?: string; name?: RegExp | string; maxTabs?: number },
): Promise<void> {
  const maxTabs = opts.maxTabs ?? 50;
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate((): ActiveElement | null => {
      const el = document.activeElement as HTMLElement | null;
      if (el === null || el === document.body) return null;
      return {
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        name: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 120),
        href: el.getAttribute('href'),
      };
    });
    if (
      active !== null &&
      (opts.role === undefined || active.role === opts.role || active.tag === opts.role) &&
      (opts.name === undefined || nameMatches(active.name, opts.name))
    ) {
      return;
    }
  }
  throw new Error(`tabTo: could not focus ${JSON.stringify(opts)} within ${maxTabs} tabs`);
}

async function createCell(page: import('@playwright/test').Page, name: string): Promise<void> {
  await page.goto('/');
  // Readiness: AppLayout's always-visible floating surface. Replaces the retired
  // FlowgridHome "active Cell" text (now hidden via the redesign's <Outlet/>
  // retirement wrapper — Option B).
  await expect(page.getByRole('button', { name: 'New Cell' })).toBeVisible();
  await page.getByRole('button', { name: 'New Cell' }).click();
  await page.getByLabel('Cell name').fill(name);
  await page.getByRole('button', { name: 'Create Cell' }).click();
  // CreateCellForm navigates to /cells/:id (retired CellBoard); return home via
  // AppLayout's "Flowgrid" header logo Link (replaces CellBoard's retired
  // "Return to Flowgrid" link).
  await page.getByRole('link', { name: 'Flowgrid', exact: true }).click();
  await expect(page.getByRole('link', { name })).toBeVisible();
}

test('VER-05 (keyboard): Cell list → Start → Finish via keyboard only', async ({ page }) => {
  await createCell(page, CELL_NAME);

  // Tab to the created Cell's link in the semantic Cell list and open it via Enter.
  await tabTo(page, { name: CELL_NAME });
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/cells\//);
  // ZLiftDock CellInspectorDock renders the cell name in an <h2> (the retired
  // CellBoard's <h1> is display:none under the redesign — Option B).
  await expect(page.getByRole('heading', { name: CELL_NAME, level: 2 })).toBeVisible();

  // Start a focus session via keyboard. ZLiftDock's Start Focus Session button is
  // a semantic <button> in the tab order; the retired CellBoard parity button is
  // display:none so the tabTo helper resolves to the ZLiftDock control.
  await tabTo(page, { name: 'Start Focus Session' });
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();

  // Run long enough to record (> 1s), then Finish via keyboard.
  await page.waitForTimeout(MIN_RECORDED_SESSION_MS);
  await tabTo(page, { name: 'Finish' });
  await page.keyboard.press('Enter');

  // Completion feedback surfaced without a single pointer click. Scope to the
  // visible SessionSummary status region: getByRole('status') uses the a11y tree
  // (filters display:none), so the retired CellBoard's parity SessionSummary
  // (hidden under the redesign) does NOT match — only ZLiftDock's does. Avoids
  // the getByText strict-mode-violation that arises when the hidden CellBoard
  // h2 is still in the DOM.
  const sessionSummary = page.getByRole('status', { name: 'Session summary' });
  await expect(sessionSummary.getByText('Session Complete')).toBeVisible();
});

const ROUTES: ReadonlyArray<{ id: string; path: string; setup?: (page: import('@playwright/test').Page) => Promise<void> }> = [
  { id: 'home', path: '/' },
  {
    id: 'cell-board',
    path: '',
    async setup(page) {
      await createCell(page, CELL_NAME);
      await page.getByRole('link', { name: CELL_NAME }).click();
    },
  },
  { id: 'core', path: '/core' },
  { id: 'forge', path: '/forge' },
  { id: 'settings', path: '/settings' },
];

for (const route of ROUTES) {
  test(`VER-05 (axe): ${route.id} route has no WCAG violations`, async ({ page }) => {
    if (route.setup !== undefined) {
      await route.setup(page);
    } else {
      await page.goto(route.path);
      // Wait for the route's primary heading so axe analyzes the rendered tree,
      // not the loading placeholder. Under the redesign the always-visible
      // AppLayout <h1>Flowgrid</h1> is present on every non-takeover route; the
      // ZLiftDock <h2>Core</h2> appears on /core. Takeover routes (/forge,
      // /settings) render their overlay heading (Forge / Settings) above the
      // still-mounted canvas.
      const heading =
        route.id === 'home' ? 'Flowgrid' :
        route.id === 'core' ? 'Core' :
        route.id === 'forge' ? 'Forge' :
        route.id === 'settings' ? 'Settings' :
        'Flowgrid';
      await expect(page.getByRole('heading', { name: heading, exact: false })).toBeVisible();
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
