/**
 * chunk 21 (C, "What next?") — the tank bar's "What next?" button and its sheet, end to end (the ranking itself is
 * unit-tested in src/ui/next/nextBest.test.ts):
 * - a hungry tank makes "Feed …" the top action, and pressing it lands on the food picker on that tank, on a phone
 *   (390×844, touch) and a computer (1440×900); on the phone the button sits inside the tank bar, which keeps its
 *   height, and the sheet stays clear of the tab bar;
 * - while the first-hour guide runs, its step is the top action and does what the guide card's button does;
 * - N opens it with the focus on its title (the arrow keys reach the actions), Escape closes it and gives the focus
 *   back to the button; with nothing to do it says so and offers the collection.
 */
import { test, expect, type Page } from '@playwright/test';
import { aq, openApp, probe, quickGame, tid, waitForState } from './helpers';

interface Api {
  __AQ: {
    mutate(fn: (s: { finance: { money: number }; creatures: Record<string, { tankId: string | null; stats: { hunger: number } }> }) => void): void;
    ui(): { focusedTankId: string | null; selectedCreatureId: string | null };
  };
}
const ui = (page: Page) => page.evaluate(() => (window as unknown as Api).__AQ.ui()).then((u) => ({ focusedTankId: u.focusedTankId, selectedCreatureId: u.selectedCreatureId }));

/** A game past the guide, paused, whose first tank's animals are very hungry (the sim says so on its next step). */
async function hungryGame(page: Page): Promise<string> {
  await openApp(page);
  await quickGame(page, 'betta', { money: 3000 });
  await aq(page, 'act', 'tutorialSkip');
  await aq(page, 'dev.setSpeed', 0);
  const id = await probe<string>(page, 'g.tankOrder[0]');
  await page.evaluate((tankId) => (window as unknown as Api).__AQ.mutate((s) => { for (const c of Object.values(s.creatures)) if (c.tankId === tankId) c.stats.hunger = 85; }), id);
  await aq(page, 'advance', 0.25);
  await waitForState(page, `(g.tanks[${JSON.stringify(id)}].cache.statusReasons ?? []).some((r) => /very hungry/.test(r))`);
  return id;
}

/** Open the sheet, check its top action is Feed for that tank, press it and land on the food picker there. */
async function feedFromWhatNext(page: Page, tankId: string, touch: boolean): Promise<void> {
  const press = (l: ReturnType<typeof tid>) => (touch ? l.tap() : l.click());
  await press(tid(page, 'hud-next'));
  await expect(tid(page, 'next-sheet')).toBeVisible();
  const top = tid(page, 'next-action-0');
  await expect(top).toHaveAttribute('data-rule', 'hungry');
  await expect(top.locator('.ag-next-item__title')).toHaveText(/^Feed /);
  await expect(top).toContainText('very hungry');
  await press(top);
  await expect(tid(page, 'next-sheet')).toBeHidden();
  await expect(page.locator('.ag-foodlist')).toBeVisible();
  expect((await ui(page)).focusedTankId).toBe(tankId);
}

test.describe('What next? on a computer (1440×900)', () => {
  test('a hungry tank makes Feed the top action, and it opens the food on that tank', async ({ page }) => {
    const id = await hungryGame(page);
    await feedFromWhatNext(page, id, false);
  });

  test('N opens it, the arrows reach its actions, Escape gives the focus back; with nothing to do it offers the collection', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'act', 'tutorialSkip');
    await aq(page, 'dev.setSpeed', 0);
    // no money: nothing to buy, nothing wrong in a new tank
    await page.evaluate(() => (window as unknown as Api).__AQ.mutate((s) => void (s.finance.money = 0)));
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('n');
    await expect(tid(page, 'next-sheet')).toBeVisible();
    await expect(tid(page, 'next-calm')).toHaveText(/You’re all caught up/);
    await expect(tid(page, 'next-action-0')).toHaveAttribute('data-rule', 'collect');
    await expect(tid(page, 'next-action-1')).toHaveCount(0);
    // the focus is on its title, as a panel's (§18); the arrow keys reach the actions
    await expect(page.locator('#ag-next-title')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(tid(page, 'next-action-0')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(tid(page, 'next-sheet')).toBeHidden();
    await expect(tid(page, 'hud-next')).toBeFocused();
    await expect(tid(page, 'hud-next')).toHaveAttribute('aria-expanded', 'false');
    // the collection goes to the Encyclopedia (its Collection once that route exists)
    await tid(page, 'hud-next').click();
    await tid(page, 'next-action-0').click();
    await expect(tid(page, 'panel-encyclopedia')).toBeVisible();
  });

  test('while the guide runs, its step is the top action and does what the guide’s own button does', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'dev.setSpeed', 0);
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'meet');
    await tid(page, 'hud-next').click();
    const top = tid(page, 'next-action-0');
    await expect(top).toHaveAttribute('data-rule', 'guide');
    await expect(top).toContainText(/Guide · 1 of \d+/);
    // nothing else competes with it
    await expect(tid(page, 'next-action-1')).toHaveCount(0);
    await top.click(); // "Meet them": the starter's card
    await expect(tid(page, 'creature-card')).toBeVisible();
    expect((await ui(page)).selectedCreatureId).not.toBeNull();
  });
});

test.describe('What next? on a phone (390×844, touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('the button sits in the tank bar; a hungry tank makes Feed the top action, and it opens the food on that tank', async ({ page }) => {
    const id = await hungryGame(page);
    const box = await page.evaluate(() => {
      const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      const b = r('[data-testid="hud-next"]');
      const bar = r('.ag-tankbar');
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, barTop: bar.top, barBottom: bar.bottom, barHeight: bar.height, width: innerWidth };
    });
    expect(box.right).toBeLessThanOrEqual(box.width);
    expect(box.top).toBeGreaterThanOrEqual(box.barTop - 1);
    expect(box.bottom).toBeLessThanOrEqual(box.barBottom + 1);
    expect(box.barHeight).toBeLessThanOrEqual(46); // (the tank bar keeps its phone height: the tank card opens under it)
    await expect(tid(page, 'hud-next')).toContainText('What next?');
    // the sheet sits under the tank bar and ends above the tab bar
    await tid(page, 'hud-next').tap();
    await expect(tid(page, 'next-sheet')).toBeVisible();
    const sheet = await page.evaluate(() => {
      const s = document.querySelector('[data-testid="next-sheet"]')!.getBoundingClientRect();
      const tabs = document.querySelector('[data-testid="nav-tabbar"]')!.getBoundingClientRect();
      const bar = document.querySelector('.ag-tankbar')!.getBoundingClientRect();
      return { top: s.top, bottom: s.bottom, left: s.left, right: s.right, tabsTop: tabs.top, barBottom: bar.bottom, width: innerWidth };
    });
    expect(sheet.top).toBeGreaterThanOrEqual(sheet.barBottom);
    expect(sheet.bottom).toBeLessThanOrEqual(sheet.tabsTop);
    expect(sheet.left).toBeGreaterThanOrEqual(0);
    expect(sheet.right).toBeLessThanOrEqual(sheet.width);
    await tid(page, 'next-close').tap();
    await expect(tid(page, 'next-sheet')).toBeHidden();
    await feedFromWhatNext(page, id, true);
  });
});
