/**
 * lane:social (chunk 6; ADR-0005 decision 3; SOC-011 A1–A3, SOC-004 A1, NAV-020) — the production build as players get
 * it (the `base-path` project: the Pages build under /aquarium-go/, opened without ?dev=1, so no developer tools): no
 * Social anywhere. The dock has its 10 items and clears the camera chips from 1400 to 1600 px; #/social addresses are
 * broken links, typed in the game or opened in a fresh page; the More sheet has no Social tile.
 */
import { test, expect, type Page } from '@playwright/test';
import { dockClear, onboardViaUI, tid } from './helpers';

const ready = (page: Page) => page.waitForFunction(() => !!(window as unknown as { __AQ?: { ready?: boolean } }).__AQ?.ready, null, { timeout: 60_000 });
const brokenToast = (page: Page) => page.locator('[data-testid="toast"]').filter({ hasText: 'That link doesn’t go anywhere' });

test('outside dev mode there is no Social: not in the dock, the More sheet, or any address', async ({ page, context, baseURL }) => {
  expect(baseURL).toMatch(/\/aquarium-go\/$/);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await ready(page);
  // no write tools here: this is the players' build
  expect(await page.evaluate(() => typeof (window as unknown as { __AQ: { newGame?: unknown } }).__AQ.newGame)).toBe('undefined');
  await onboardViaUI(page, 'betta', 'Prod');

  // the dock: 10 items, Operations right after Build, clear of the camera chips at every checked width (§5.4)
  await expect(tid(page, 'dock-social')).toHaveCount(0);
  for (const width of [1400, 1440, 1519, 1520, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    const r = await dockClear(page);
    expect(r.labels, `${width}px`).toEqual(['Tanks', 'Livestock', 'Market', 'Visitors', 'Shows', 'Build', 'Operations', 'Research', 'Finances', 'Encyclopedia']);
    expect(r.gap, `${width}px`).toBeGreaterThan(0);
    expect(r.scrolls, `${width}px`).toBe(false);
  }

  // every Social address is a broken link: the toast, and the tank view
  for (const h of ['#/social', '#/social/clubs', '#/social/leaderboards', '#/social/join/HIGHLAND-4821']) {
    await page.evaluate((x) => void (location.hash = x), h);
    await expect(brokenToast(page).first()).toBeVisible();
    await expect(tid(page, 'panel-social')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/');
  }

  // the phone More sheet: five tiles, no Social
  await page.setViewportSize({ width: 390, height: 844 });
  await tid(page, 'dock-more').click();
  await expect(tid(page, 'more-sheet').locator('.ag-more__label')).toHaveText(['Visitors', 'Shows', 'Research', 'Finances', 'Encyclopedia']);
  await expect(tid(page, 'more-social')).toHaveCount(0);

  // a fresh page opened on an invite link boots to the title with no "Then: Social" pill, then says the link was broken
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 900 });
  await tid(page, 'hud-settings').click();
  await tid(page, 'settings-save').click(); // a save to continue from (Save now)
  await expect(page.locator('[data-testid="toast"]').filter({ hasText: 'Game saved' }).first()).toBeVisible();
  const fresh = await context.newPage();
  const pills: string[] = [];
  await fresh.exposeFunction('__pill', (t: string) => void pills.push(t));
  await fresh.addInitScript(() => {
    new MutationObserver(() => {
      const d = document.querySelector('[data-testid="boot-deeplink-dest"]');
      if (d) (window as unknown as { __pill(t: string): void }).__pill(d.textContent ?? '');
    }).observe(document, { childList: true, subtree: true });
  });
  await fresh.goto('./#/social/join/HIGHLAND-4821', { waitUntil: 'domcontentloaded' });
  await ready(fresh);
  await expect(tid(fresh, 'title-continue')).toBeVisible();
  expect(pills).toEqual([]);
  await tid(fresh, 'title-continue').click();
  await expect(tid(fresh, 'hud-money')).toBeVisible();
  await expect(brokenToast(fresh)).toBeVisible();
  await expect(tid(fresh, 'panel-social')).toHaveCount(0);
});
