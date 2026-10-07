/**
 * lane:ui-shell (chunk 1; 0.5 spec §5.6, §20.2; NAV-006, NAV-007; B-116, B-150) — phone sheets: full height under the
 * top bar with the tab bar painted over their foot, content that scrolls clear of it, the tank card under the tank
 * bar, toasts above the tab bar and clear of the buy bar, tab strips that bring a linked tab into view; and a phone
 * held sideways (844×390).
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid, probe } from './helpers';

const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);
const rect = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const r = document.querySelector(s)?.getBoundingClientRect();
    return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height } : null;
  }, sel);

async function phoneGame(page: Page, opts: { guide?: boolean } = {}) {
  await openApp(page);
  await quickGame(page, 'betta', { money: 5000 });
  if (!opts.guide) await aq(page, 'act', 'tutorialSkip');
  await page.waitForTimeout(400);
}

/** The panel is fully open (its spring has settled). */
async function settled(page: Page, sel: string) {
  let last = -1;
  await expect
    .poll(async () => {
      const r = await rect(page, sel);
      const top = r ? Math.round(r.top) : -1;
      const same = top === last;
      last = top;
      return same && top >= 0;
    })
    .toBe(true);
}

test.describe('phone 390×844 (touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('a panel opens at full height under the top bar, under the tab bar, and its content scrolls clear of it', async ({ page }) => {
    await phoneGame(page);
    await tid(page, 'dock-livestock').tap();
    await settled(page, '[data-testid="panel-livestock"]');
    const sheet = (await rect(page, '[data-testid="panel-livestock"]'))!;
    expect(Math.abs(sheet.top - 64)).toBeLessThanOrEqual(2);
    await expect(tid(page, 'panel-livestock')).toHaveAttribute('data-occlude', 'bottom');
    await expect(tid(page, 'panel-livestock')).toHaveClass(/pn-sheet--mobile/);
    await expect(tid(page, 'panel-livestock').locator('.pn-switch')).toHaveCount(0);
    // the tab bar paints over the sheet
    const hit = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="nav-tabbar"]')!.getBoundingClientRect();
      return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest('[data-testid^="dock-"]')?.getAttribute('data-testid') ?? null;
    });
    expect(hit).not.toBeNull();
    // the tank bar steps aside under a full panel
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.ag-tankbar')!).visibility)).toBe('hidden');
    // the end of the content can scroll above the tab bar
    const clear = await page.evaluate(() => {
      const body = document.querySelector('[data-testid="panel-livestock"] .pn-body') as HTMLElement;
      body.scrollTop = body.scrollHeight;
      const last = body.lastElementChild!.getBoundingClientRect();
      const bar = document.querySelector('[data-testid="nav-tabbar"]')!.getBoundingClientRect();
      return last.bottom <= bar.top + 1;
    });
    expect(clear).toBe(true);
  });

  test('Settings opens at full height from the same top', async ({ page }) => {
    await phoneGame(page);
    await tid(page, 'dock-more').tap();
    await tid(page, 'more-settings').tap();
    await settled(page, '[data-testid="panel-settings"]');
    const sheet = (await rect(page, '[data-testid="panel-settings"]'))!;
    expect(Math.abs(sheet.top - 64)).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => location.hash)).toBe('#/settings');
  });

  test('the tank card opens below the tank bar, which stays in view, and the guide steps aside', async ({ page }) => {
    await phoneGame(page, { guide: true });
    await expect(tid(page, 'tutorial-card')).toBeVisible();
    const tankId = await probe<string>(page, 'g.tankOrder[0]');
    await goHash(page, `#/tanks/${tankId}`);
    await settled(page, '[data-testid="tank-card"]');
    const card = (await rect(page, '[data-testid="tank-card"]'))!;
    expect(Math.abs(card.top - 118)).toBeLessThanOrEqual(2);
    const bar = (await rect(page, '.ag-tankbar'))!;
    expect(bar.bottom).toBeLessThanOrEqual(card.top);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.ag-tankbar')!).visibility)).toBe('visible');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.ag-hud__coach')!).visibility)).toBe('hidden');
  });

  test('toasts sit above the tab bar and clear of the offer’s buy bar (B-116)', async ({ page }) => {
    await phoneGame(page);
    expect((await aq<{ ok: boolean }>(page, 'dev.addShopOffer', 'mystery_snail')).ok).toBe(true);
    const id = await probe<string>(page, 'g.market.stock[g.market.stock.length - 1].id');
    await goHash(page, `#/shop/fish/${id}`);
    await expect(page.locator('.pn-buybar')).toBeVisible();
    await settled(page, '[data-testid="panel-market"]');
    await page.evaluate(() => {
      const u = (window as unknown as { __AQ: { ui(): { toast(t: string, k: string): void } } }).__AQ.ui();
      u.toast('Kofi dropped by and left a generous twelve dollar tip', 'info');
      u.toast('Water is getting warm in the Starter tank', 'warning');
    });
    await expect(page.locator('[data-testid="toast"]').first()).toBeVisible();
    await page.waitForTimeout(900); // the band is measured every 300 ms
    const r = await page.evaluate(() => {
      const box = (el: Element | null) => el?.getBoundingClientRect() ?? null;
      const toasts = [...document.querySelectorAll('[data-testid="toast"]')].map((t) => t.getBoundingClientRect());
      const bar = box(document.querySelector('[data-testid="nav-tabbar"]'))!;
      const buy = box(document.querySelector('.pn-buybar'))!;
      const hit = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return { n: toasts.length, overBar: toasts.some((t) => hit(t, bar)), overBuy: toasts.some((t) => hit(t, buy)), buyAboveBar: buy.bottom <= bar.top + 1 };
    });
    expect(r.n).toBeGreaterThan(0);
    expect(r.overBar).toBe(false);
    expect(r.overBuy).toBe(false);
    expect(r.buyAboveBar).toBe(true);
  });

  test('a link to a tab at the end of a strip brings it into view (§5.6)', async ({ page }) => {
    await phoneGame(page);
    for (const [h, tab] of [
      ['#/research/achievements', 'research-tab-achievements'],
      ['#/settings/about', 'settings-tab-about'],
    ]) {
      await goHash(page, h);
      await expect(tid(page, tab)).toHaveAttribute('aria-selected', 'true');
      await page.waitForTimeout(500);
      const inView = await page.evaluate((id) => {
        const t = document.querySelector(`[data-testid="${id}"]`)!;
        const strip = t.closest('[role="tablist"]')!.getBoundingClientRect();
        const r = t.getBoundingClientRect();
        return r.left >= strip.left - 1 && r.right <= strip.right + 1;
      }, tab);
      expect(inView, h).toBe(true);
    }
  });
});

test.describe('phone held sideways 844×390 (touch)', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('the folded rail ends above the tab bar, and a panel keeps today’s top', async ({ page }) => {
    await phoneGame(page);
    const rail = (await rect(page, '.ag-toolrail'))!;
    const bar = (await rect(page, '[data-testid="nav-tabbar"]'))!;
    expect(rail.bottom).toBeLessThanOrEqual(bar.top);
    await tid(page, 'dock-market').tap();
    await settled(page, '[data-testid="panel-market"]');
    const sheet = (await rect(page, '[data-testid="panel-market"]'))!;
    expect(Math.abs(sheet.top - 6)).toBeLessThanOrEqual(2);
    await expect(tid(page, 'panel-market').locator('.pn-switch')).toHaveCount(0);
  });
});
