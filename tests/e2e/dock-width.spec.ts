/**
 * lane:social (chunk 6; 0.5 spec §5.4, §20.2, §22 risk 12; SOC-004 A1–A2, NAV-020; DESIGN-S3D INTAKE C-1, C-3, C-56) —
 * with Social in the dock (dev mode: 11 items, Operations eighth) the dock never runs under the labelled camera chips
 * at 1400, 1440, 1519, 1520 and 1600 px, and doesn't scroll. The same check without Social (production, 10 items) is
 * in prod-mode.spec.ts. Each camera chip keeps its name (aria-label and title) when its label is hidden.
 */
import { test, expect } from '@playwright/test';
import { dockClear, openApp, quickGame } from './helpers';

const WIDTHS = [1400, 1440, 1519, 1520, 1600];

test('the 11-item dock (dev mode) clears the camera chips from 1400 to 1600 px and never scrolls', async ({ page }) => {
  await openApp(page);
  await quickGame(page, 'betta');
  await expect(page.locator('.ag-hud__cam:not(.ag-hud__cam--room)')).toBeVisible();
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150); // the chips slide when the layout changes
    const r = await dockClear(page);
    expect(r.labels, `${width}px`).toEqual(['Tanks', 'Livestock', 'Market', 'Visitors', 'Shows', 'Social', 'Build', 'Operations', 'Research', 'Finances', 'Encyclopedia']);
    expect(r.gap, `${width}px: dock and camera chips must not touch`).toBeGreaterThan(0);
    expect(r.scrolls, `${width}px: the dock must not scroll`).toBe(false);
  }
  // below 1440 the chips are icons only, each still named
  await page.setViewportSize({ width: 1400, height: 900 });
  for (const chip of await page.locator('.ag-hud__cam:not(.ag-hud__cam--room) .ag-camchip').all()) {
    await expect(chip.locator('span')).toBeHidden();
    expect(await chip.getAttribute('aria-label')).toBeTruthy();
    expect(await chip.getAttribute('title')).toBeTruthy();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId('camera-front').locator('span')).toBeVisible();
});
