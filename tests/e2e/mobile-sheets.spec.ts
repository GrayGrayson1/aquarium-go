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

  test('audit 2026-11-17 (review of D2): Livestock’s selection footer keeps every button inside the sheet', async ({ page }) => {
    await phoneGame(page);
    // a second tank, so the footer offers Move as well (four buttons and the count: about 405 px of buttons alone)
    await aq(page, 'act', 'buyTank', 'g20L', 'freshwater_tropical');
    await aq(page, 'dev.spawnSpecies', 'betta', undefined, { sex: 'female', count: 2 });
    await tid(page, 'dock-livestock').tap();
    await settled(page, '[data-testid="panel-livestock"]');
    const ticks = page.locator('[data-testid="panel-livestock"] .pn-lsrow .pn-check');
    await ticks.nth(0).click();
    await ticks.nth(1).click();
    await expect(tid(page, 'move-picked')).toBeVisible();
    /** Footer buttons outside the sheet, or covered at their centre (by the tab bar or anything else). */
    const outside = () =>
      page.evaluate(() => {
        const sheet = document.querySelector('[data-testid="panel-livestock"]')!.getBoundingClientRect();
        const buttons = [...document.querySelectorAll('[data-testid="panel-livestock"] .pn-foot button')] as HTMLElement[];
        return buttons
          .map((b) => {
            const r = b.getBoundingClientRect();
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            const ok = r.width > 0 && r.left >= sheet.left - 0.5 && r.right <= sheet.right + 0.5 && r.bottom <= sheet.bottom + 0.5 && !!top && b.contains(top);
            return ok ? null : (b.textContent ?? '').trim();
          })
          .filter((x) => x !== null);
      });
    expect(await page.locator('[data-testid="panel-livestock"] .pn-foot button').count()).toBe(4);
    // (confirmation review) the start-up toasts sit just above a phone sheet's list, and their band is re-measured every
    // 300 ms (Toasts.tsx useSheetBand), so for a moment after the footer appears they can still cover its first line:
    // wait for the footer to be clear rather than measuring in that moment (it failed once in Chromium this way)
    await expect.poll(outside, { timeout: 5_000 }).toEqual([]);
    // and on the narrowest phone the game supports
    await page.setViewportSize({ width: 360, height: 780 });
    await expect.poll(outside, { timeout: 5_000 }).toEqual([]);
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

  test('audit B18: More and Settings swipe closed from their header, as panels do', async ({ page }) => {
    await phoneGame(page);
    /**
     * A downward swipe from the middle of `sel` (a mouse pointer: the drag is the same), at a hand's pace: a move a
     * frame, about a fifth of a second in all. Ten moves sent in one burst can all land before the drag's first frame,
     * and WebKit then ended the gesture where it began (the full-height Settings sheet stayed open 7 times in 8 when
     * this case ran alone on a quiet machine; it had passed in two full runs on a busy one).
     */
    const swipe = async (sel: string) => {
      const r = (await rect(page, sel))!;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) {
        await page.mouse.move(x, y + i * 20);
        await page.waitForTimeout(16);
      }
      await page.mouse.up();
    };
    await tid(page, 'dock-more').tap();
    await settled(page, '[data-testid="more-sheet"]');
    await swipe('.ag-more__title');
    await expect(tid(page, 'more-sheet')).toBeHidden();
    await tid(page, 'dock-more').tap();
    await tid(page, 'more-settings').tap();
    await settled(page, '[data-testid="panel-settings"]');
    await swipe('[data-testid="panel-settings"] .ag-sheet__title');
    await expect(tid(page, 'panel-settings')).toBeHidden();
    // a short drag leaves it open
    await tid(page, 'dock-more').tap();
    await settled(page, '[data-testid="more-sheet"]');
    const r = (await rect(page, '.ag-more__title'))!;
    await page.mouse.move(r.left + 10, r.top + 5);
    await page.mouse.down();
    await page.mouse.move(r.left + 10, r.top + 45, { steps: 8 });
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(600);
    await expect(tid(page, 'more-sheet')).toBeVisible();
  });

  test('Settings › Notifications has no Save now footer, so with no notifications four of its six categories show before scrolling (ADR-0036)', async ({ page }) => {
    // the status card's height depends on the browser's notification state: pin it to an iPhone Safari tab's (none)
    await page.addInitScript(() => void delete (window as { Notification?: unknown }).Notification);
    await phoneGame(page);
    await goHash(page, '#/settings/notifications');
    await settled(page, '[data-testid="panel-settings"]');
    await expect(tid(page, 'settings-tab-notifications')).toHaveAttribute('aria-selected', 'true');
    await expect(tid(page, 'notify-status')).toHaveAttribute('data-permission', 'unsupported');
    await expect(tid(page, 'settings-save')).toHaveCount(0);
    await expect(page.locator('[data-testid^="notify-cat-"]')).toHaveCount(6);
    // what shows before scrolling ends where the body's box does (a footer ends it) or at the tab bar painted over it.
    // Measured at 390×844: the rows end at 533, 601, 669, 737 (Breeding), 805 (Shows) and 873 (Automation); the tab
    // bar starts at 770 and the old footer at 703, so Breeding is the row the footer hid
    const body = (await rect(page, '[data-testid="panel-settings"] .ag-sheet__body'))!;
    const bar = (await rect(page, '[data-testid="nav-tabbar"]'))!;
    const seen = Math.min(body.bottom, bar.top);
    expect(await page.evaluate(() => document.querySelector('[data-testid="panel-settings"] .ag-sheet__body')!.scrollTop)).toBe(0);
    for (const c of ['rare', 'care', 'market', 'breeding']) {
      const row = await page.evaluate((id) => document.querySelector(`[data-testid="notify-cat-${id}"]`)!.closest('.ag-notify-row')!.getBoundingClientRect().bottom, c);
      expect(row, c).toBeLessThanOrEqual(seen);
    }
    // scrolled to the end, the tab's last row clears the tab bar (in-game Settings without a footer is new on phones)
    const clear = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="panel-settings"] .ag-sheet__body') as HTMLElement;
      el.scrollTop = el.scrollHeight;
      const last = el.querySelector('.ag-tcard__content')!.getBoundingClientRect();
      return last.bottom <= document.querySelector('[data-testid="nav-tabbar"]')!.getBoundingClientRect().top + 1;
    });
    expect(clear).toBe(true);
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

  test('the animal’s card folds the guide into its pill just above the card, and the pill brings the guide back (audit 2026-11-17, P1)', async ({ page }) => {
    await phoneGame(page, { guide: true });
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'meet');
    await page.locator('[data-guide-showme]').tap(); // "Meet them" opens the starter's card
    // the meet step is done: the next one ("Have a look around") waits in the pill, in view just above the card
    const pill = page.locator('.ag-coach-pill[data-testid="tutorial-card"]');
    await expect(pill).toContainText('Have a look around');
    // chunk 22 (ADR-0058, G-2): a card the guide's button opened now goes by itself a moment after its step, unless the
    // player uses it. This case is about the player who does (reading the card), so it touches the card once the step
    // is done, and the pill path below stays what it was (friction-guide.spec.ts has the card that goes by itself)
    await page.locator('[data-testid="creature-card"] .ag-chead__species').tap();
    await settled(page, '[data-testid="creature-card"]');
    await expect(pill).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.ag-hud__coach')!).visibility)).toBe('visible');
    await expect
      .poll(async () => {
        const p = await rect(page, '.ag-coach-pill');
        const c = await rect(page, '[data-testid="creature-card"]');
        return !!p && !!c && p.top >= 0 && p.bottom <= c.top + 1 && c.top - p.bottom <= 24;
      })
      .toBe(true);
    // nothing covers it
    const hit = await page.evaluate(() => {
      const r = document.querySelector('.ag-coach-pill')!.getBoundingClientRect();
      return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('.ag-coach-pill');
    });
    expect(hit).toBe(true);
    // tapping it closes the card and opens the guide on its step
    await pill.tap();
    await expect(tid(page, 'creature-card')).toBeHidden();
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'camera');
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
      const btn = box(document.querySelector('.pn-buybar .ag-btn'))!;
      const hit = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      // chunk 6 (DES-011, 0.5 §17 "Phone sticky footer"): the bar sits at the sheet's foot, under the tab bar, and its
      // padding keeps its controls above it (it used to float 84 px above the body's own 112 px foot)
      return { n: toasts.length, overBar: toasts.some((t) => hit(t, bar)), overBuy: toasts.some((t) => hit(t, buy)), atFoot: buy.bottom >= innerHeight - 1, buttonAboveBar: btn.bottom <= bar.top + 1 };
    });
    expect(r.n).toBeGreaterThan(0);
    expect(r.overBar).toBe(false);
    expect(r.overBuy).toBe(false);
    expect(r.atFoot).toBe(true);
    expect(r.buttonAboveBar).toBe(true);
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
