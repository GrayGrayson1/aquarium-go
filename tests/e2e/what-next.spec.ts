/**
 * chunk 21 (C, "What next?") — the tank bar's "What next?" button and its sheet, end to end (the ranking itself is
 * unit-tested in src/ui/next/nextBest.test.ts):
 * - a hungry tank makes "Feed …" the top action, and pressing it lands on the food picker on that tank, on a phone
 *   (390×844, touch) and a computer (1440×900); on a phone held upright the button floats at the right edge, clear of
 *   the tank bar (which keeps its height), the bell, the toasts and the tab bar, and the sheet stays clear of the tab
 *   bar;
 * - chunk 21 review B1: the phone tank switcher keeps its whole status line (nothing clipped, the "2/3" index in view,
 *   the status icon drawn) with one, two and three tanks, a Watch status with and without "Food low", at the default
 *   text size and 130 %, at 390×844, 360×780 and held sideways (844×390); and the floating button stays clear of the
 *   guide card and, in the room view, of the Reset view chip;
 * - while the first-hour guide runs, its step is the top action and does what the guide card's button does;
 * - N opens it with the focus on its title (the arrow keys reach the actions), Escape closes it and gives the focus
 *   back to the button; with nothing to do it says so and offers the collection.
 */
import { test, expect, type Page } from '@playwright/test';
import { aq, openApp, probe, quickGame, tid, waitForState } from './helpers';

interface Api {
  __AQ: {
    mutate(fn: (s: { finance: { money: number }; inventory: { foods: Record<string, number> }; creatures: Record<string, { tankId: string | null; stats: { hunger: number } }> }) => void): void;
    ui(): { focusedTankId: string | null; selectedCreatureId: string | null };
    setUI(p: { focusedTankId: string }): void;
    settings(): { update(p: { textScale: number }): void };
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
    // (not everything unlocked: dev.unlockAll researches the Water room and the Live food room, which the next step
    // installs with no salt mix or eggs, and those are real problems that "What next?" lists from Operations)
    await quickGame(page, 'betta', { unlockAll: false });
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
    // the collection goes to the Encyclopedia's Collection (#/encyclopedia/collection)
    await tid(page, 'hud-next').click();
    await tid(page, 'next-action-0').click();
    await expect(tid(page, 'panel-encyclopedia')).toBeVisible();
    await expect(tid(page, 'collection-summary')).toBeVisible();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/encyclopedia/collection');
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

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
/** The phone HUD's boxes that matter here, and the tank switcher's status line. */
function layout(page: Page) {
  return page.evaluate(() => {
    const box = (el: Element | null): Box | null => {
      const r = el?.getBoundingClientRect();
      return r && r.width > 0 && r.height > 0 ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null;
    };
    const s = document.querySelector<HTMLElement>('.ag-switcher__status')!;
    const index = s.querySelector('.ag-switcher__index');
    return {
      // (innerText breaks the line between flex items; what shows is the words in order)
      status: { scroll: s.scrollWidth, client: s.clientWidth, icon: s.querySelector('svg')!.getBoundingClientRect().width, text: s.innerText.replace(/\s+/g, ' ').trim(), right: s.getBoundingClientRect().right, indexRight: index ? index.getBoundingClientRect().right : null },
      btn: box(document.querySelector('[data-testid="hud-next"]')),
      bar: box(document.querySelector('.ag-tankbar')),
      bell: box(document.querySelector('[data-testid="hud-alerts"]')),
      tabs: box(document.querySelector('[data-testid="nav-tabbar"]')),
      toasts: [...document.querySelectorAll('[data-testid="toast"]')].map(box).filter((b): b is Box => !!b),
      coach: box(document.querySelector('.ag-hud__coach .ag-coach, .ag-hud__coach .ag-coach-pill')),
      roomChip: box(document.querySelector('.ag-hud__cam--room')),
      width: innerWidth,
      height: innerHeight,
    };
  });
}
const apart = (a: Box, b: Box | null) => !b || a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;

/** On a phone held upright: the floating button is on screen and clear of the tank bar, the bell, the toasts, the tab bar, the guide card and the Reset view chip. */
function expectFloatingClear(l: Awaited<ReturnType<typeof layout>>, what: string): void {
  const b = l.btn;
  expect(b, `${what}: the button is drawn`).not.toBeNull();
  if (!b) return;
  expect(b.left >= 0 && b.top >= 0 && b.right <= l.width && b.bottom <= l.height, `${what}: on screen`).toBe(true);
  expect(b.right, `${what}: at the right edge`).toBeGreaterThan(l.width - 30);
  for (const [name, other] of [['tank bar', l.bar], ['bell', l.bell], ['tab bar', l.tabs], ['guide card', l.coach], ['Reset view', l.roomChip], ...l.toasts.map((t, i) => [`toast ${i}`, t] as const)] as const)
    expect(apart(b, other), `${what}: clear of the ${name}`).toBe(true);
}

/** A game past the guide, paused, with $5,000 to buy tanks. */
async function statusGame(page: Page): Promise<string> {
  await openApp(page);
  await quickGame(page, 'betta', { money: 5000 });
  await aq(page, 'act', 'tutorialSkip');
  await aq(page, 'dev.setSpeed', 0);
  return probe<string>(page, 'g.tankOrder[0]');
}

/** The first tank at Watch (its animals very hungry), with its food running low or not. */
async function watchStatus(page: Page, tankId: string, foodLow: boolean): Promise<void> {
  await page.evaluate(
    ([t, low]) =>
      (window as unknown as Api).__AQ.mutate((s) => {
        for (const c of Object.values(s.creatures)) if (c.tankId === t) c.stats.hunger = 85;
        for (const k of Object.keys(s.inventory.foods)) s.inventory.foods[k] = low ? Math.min(s.inventory.foods[k], 1) : Math.max(s.inventory.foods[k], 40);
      }),
    [tankId, foodLow] as const,
  );
  await aq(page, 'advance', 0.25);
  await waitForState(page, `g.tanks[${JSON.stringify(tankId)}].cache.status === 'watch' && (g.tanks[${JSON.stringify(tankId)}].cache.foodLevel === 'low') === ${foodLow}`);
}

async function textScale(page: Page, v: number): Promise<void> {
  await page.evaluate((x) => (window as unknown as Api).__AQ.settings().update({ textScale: x }), v);
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--text-scale'))).toBe(String(v));
}

/**
 * chunk 21 review B1 — with one, two and three tanks, a Watch status with and without "Food low", at the default text
 * size and 130 %: the status line is whole (nothing clipped, its icon drawn, the index in view); the button floats clear
 * of the tank bar on a phone held upright, or sits in the tank bar held sideways.
 */
async function statusLineHolds(page: Page, floating: boolean): Promise<void> {
  const first = await statusGame(page);
  for (let n = 1; n <= 3; n++) {
    if (n > 1) {
      expect((await aq<{ ok: boolean }>(page, 'act', 'buyTank', 'g20L', 'freshwater_tropical')).ok).toBe(true);
      await page.evaluate((t) => (window as unknown as Api).__AQ.setUI({ focusedTankId: t }), first);
    }
    for (const foodLow of [false, true]) {
      await watchStatus(page, first, foodLow);
      for (const scale of [1, 1.3]) {
        await textScale(page, scale);
        const what = `${n} tank${n > 1 ? 's' : ''}, ${foodLow ? 'Watch · Food low' : 'Watch'}, text ${scale * 100}%`;
        // ("Food low" takes the gallons' place on a phone, as it always has with an index after it; the index stays)
        const expected = new RegExp(`^\\s*Watch${foodLow ? ' · Food low' : ' · \\d+ gal'}${n > 1 ? ` · 1/${n}` : ''}\\s*$`);
        await expect.poll(async () => (await layout(page)).status.text, { message: what }).toMatch(expected);
        const l = await layout(page);
        expect(l.status.scroll, `${what}: the status line isn't clipped (${l.status.text.trim()})`).toBeLessThanOrEqual(l.status.client);
        expect(l.status.icon, `${what}: the status icon is drawn`).toBeGreaterThan(0);
        if (n > 1) expect(l.status.indexRight!, `${what}: the index is in view`).toBeLessThanOrEqual(l.status.right + 0.5);
        if (floating) expectFloatingClear(l, what);
        else {
          expect(l.btn, `${what}: the button is drawn`).not.toBeNull();
          expect(l.btn!.top >= l.bar!.top - 1 && l.btn!.bottom <= l.bar!.bottom + 1 && l.btn!.right <= l.width, `${what}: the button sits in the tank bar, on screen`).toBe(true);
        }
      }
    }
  }
}

test.describe('What next? on a phone (390×844, touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('the button floats at the right edge, off the tank bar; a hungry tank makes Feed the top action, and it opens the food on that tank', async ({ page }) => {
    const id = await hungryGame(page);
    const l = await layout(page);
    expectFloatingClear(l, 'a hungry tank');
    expect(l.bar!.bottom - l.bar!.top).toBeLessThanOrEqual(46); // (the tank bar keeps its phone height: the tank card opens under it)
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

  test('chunk 21 review B1: the tank switcher keeps its whole status line with 1 to 3 tanks, at the default text size and 130 %', async ({ page }) => {
    await statusLineHolds(page, true);
  });

  test('the floating button stays clear of the guide card, and in the room view of the Reset view chip, at 130 % text', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'dev.setSpeed', 0);
    await textScale(page, 1.3);
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'meet');
    await expect.poll(async () => (await layout(page)).coach).not.toBeNull();
    expectFloatingClear(await layout(page), 'the guide card');
    await tid(page, 'view-toggle').tap();
    await expect.poll(async () => (await layout(page)).roomChip).not.toBeNull();
    await page.waitForTimeout(500); // (the chips and the button rise with the guide card: their transitions)
    expectFloatingClear(await layout(page), 'the room view');
    // and it is reachable there: it opens the sheet
    await tid(page, 'hud-next').tap();
    await expect(tid(page, 'next-sheet')).toBeVisible();
  });
});

test.describe('What next? on a narrow phone (360×780, touch)', () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('chunk 21 review B1: the tank switcher keeps its whole status line with 1 to 3 tanks, at the default text size and 130 %', async ({ page }) => {
    await statusLineHolds(page, true);
  });
});

test.describe('What next? on a phone held sideways (844×390, touch)', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('chunk 21 review B1: the button stays in the tank bar, whose status line stays whole with 1 to 3 tanks, at the default text size and 130 %', async ({ page }) => {
    await statusLineHolds(page, false);
  });
});
