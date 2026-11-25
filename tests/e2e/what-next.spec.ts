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
    // the drawn room before each "·" (the confirmation review, F2: "Watch· 10 gal"): from the end of what comes
    // before it (the status word, or the part before) to the dot itself
    const words = [...s.childNodes].filter((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
    const wordRange = document.createRange();
    if (words.length) {
      wordRange.setStart(words[0], 0);
      wordRange.setEnd(words[words.length - 1], (words[words.length - 1].textContent ?? '').length);
    }
    let prevRight = wordRange.getBoundingClientRect().right;
    let sepGap = Infinity;
    for (const el of [...s.children].filter((c) => c.tagName.toLowerCase() !== 'svg' && getComputedStyle(c).display !== 'none')) {
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const i = (n.textContent ?? '').indexOf('·');
        if (i < 0) continue;
        const dot = document.createRange();
        dot.setStart(n, i);
        dot.setEnd(n, i + 1);
        sepGap = Math.min(sepGap, dot.getBoundingClientRect().left - prevRight);
        break;
      }
      prevRight = el.getBoundingClientRect().right;
    }
    const btnEl = document.querySelector<HTMLElement>('[data-testid="hud-next"]');
    const br = btnEl?.getBoundingClientRect();
    const hit = br && br.width > 0 ? document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2) : null;
    return {
      sepGap,
      btnShown: !!btnEl && getComputedStyle(btnEl).visibility === 'visible' && Number(getComputedStyle(btnEl.closest('.ag-next-anchor')!).opacity) > 0,
      // (what a tap at its centre reaches: the button, not a toast, the guide card or the room view's edge cue over it)
      btnTopmost: !!hit?.closest('[data-testid="hud-next"]'),
      toolRow: box(document.querySelector('.ag-toolrail')),
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
  expect(l.btnShown, `${what}: the button is shown`).toBe(true);
  expect(l.btnTopmost, `${what}: a tap at its centre reaches it`).toBe(true);
  for (const [name, other] of [['tank bar', l.bar], ['bell', l.bell], ['tab bar', l.tabs], ['tool row', l.toolRow], ['guide card', l.coach], ['Reset view', l.roomChip], ...l.toasts.map((t, i) => [`toast ${i}`, t] as const)] as const)
    expect(apart(b, other), `${what}: clear of the ${name}`).toBe(true);
}

/** Toasts under the tank bar: the phone's column shows two at most (the newest). */
async function twoToasts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ui = (window as unknown as { __AQ: { ui(): { toast(t: string, k?: string): void } } }).__AQ.ui();
    ui.toast('A first toast, for the layout check', 'info');
    ui.toast('A second toast, for the layout check', 'info');
  });
  await expect.poll(async () => (await layout(page)).toasts.length).toBe(2);
}

/**
 * The confirmation review, F1: on a phone held upright the button is either shown and clear of everything around it
 * (the toast column's room, the guide card, the tool row or the Reset view chip, the tab bar) or, when the guide card
 * leaves no room between it and the toasts' room, out of the way. Never over the toasts or the tank bar.
 */
function expectFloatingPlaced(l: Awaited<ReturnType<typeof layout>>, what: string): void {
  const toastRoom = l.bar!.bottom + 8 + 2 * 46 + 5 + 8; // (two compact toasts under the tank bar: float.ts)
  const below = [l.coach, l.toolRow, l.roomChip, l.tabs].filter((b): b is Box => !!b && b.bottom > toastRoom);
  const floor = Math.min(...below.map((b) => b.top));
  const room = floor - 8 - toastRoom;
  if (room < 48) {
    expect(l.btnShown, `${what}: no room (${Math.round(room)} px), so the button is out of the way`).toBe(false);
    return;
  }
  expectFloatingClear(l, what);
  expect(l.btn!.top, `${what}: under the toasts' room`).toBeGreaterThanOrEqual(toastRoom - 1);
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
        expect(l.sepGap, `${what}: a space before each "·" (${l.status.text})`).toBeGreaterThanOrEqual(1.5);
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

  test('the confirmation review, C1: with toasts showing, the open sheet is above them, and its top action is what a tap reaches', async ({ page }) => {
    const id = await hungryGame(page);
    await twoToasts(page);
    await tid(page, 'hud-next').tap();
    await expect(tid(page, 'next-sheet')).toBeVisible();
    const hits = await page.evaluate(() => {
      const inSheet = (el: Element) => {
        const r = el.getBoundingClientRect();
        return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('[data-testid="next-sheet"]');
      };
      const toasts = [...document.querySelectorAll('[data-testid="toast"]')].map((t) => t.getBoundingClientRect());
      const top = document.querySelector('[data-testid="next-action-0"]')!.getBoundingClientRect();
      return {
        title: inSheet(document.querySelector('#ag-next-title')!),
        top: inSheet(document.querySelector('[data-testid="next-action-0"]')!),
        // (they do share the column under the tank bar: the test means something)
        overlap: toasts.some((t) => t.bottom > top.top && t.top < top.bottom),
      };
    });
    expect(hits.overlap, 'a toast lies under the top action').toBe(true);
    expect(hits.title, 'the title is above the toasts').toBe(true);
    expect(hits.top, 'the top action is above the toasts').toBe(true);
    await tid(page, 'next-action-0').tap();
    await expect(tid(page, 'next-sheet')).toBeHidden();
    await expect(page.locator('.ag-foodlist')).toBeVisible();
    expect((await ui(page)).focusedTankId).toBe(id);
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

test.describe('What next? on a phone with its browser bars (390×664, touch)', () => {
  test.use({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('the confirmation review, F1: the button is placed clear of the toasts, the tank bar and the guide card, in both views, with and without the guide', async ({ page }) => {
    await floatingAround(page);
  });

  test('the confirmation review, C1: with the guide card showing at 130 % text, the open sheet is above it, and its lower action is what a tap reaches', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'dev.setSpeed', 0);
    await textScale(page, 1.3);
    // no animal left (the guide's step can't show one): the sheet lists the guide's step and "Open the Market"
    await page.evaluate(() => (window as unknown as { __AQ: { mutate(f: (s: { creatures: Record<string, { status: string }> }) => void): void } }).__AQ.mutate((s) => {
      for (const c of Object.values(s.creatures)) c.status = 'sold';
    }));
    await expect.poll(async () => (await layout(page)).coach).not.toBeNull();
    const l = await layout(page);
    expectFloatingPlaced(l, 'the guide card at 130 %');
    await tid(page, 'hud-next').tap();
    await expect(tid(page, 'next-action-1')).toHaveAttribute('data-rule', 'empty');
    const hits = await page.evaluate(() => {
      const coach = document.querySelector('.ag-hud__coach .ag-coach')!.getBoundingClientRect();
      const second = document.querySelector('[data-testid="next-action-1"]')!.getBoundingClientRect();
      const x = second.left + second.width / 2;
      // a point of the second action that the guide card lies under, if any; else its centre
      const y = second.bottom > coach.top ? Math.max(second.top, coach.top) + Math.min(8, (second.bottom - Math.max(second.top, coach.top)) / 2) : second.top + second.height / 2;
      return { overlap: second.bottom > coach.top, hit: !!document.elementFromPoint(x, y)?.closest('[data-testid="next-sheet"]') };
    });
    expect(hits.overlap, 'the guide card lies under the second action').toBe(true);
    expect(hits.hit, 'the second action is above the guide card').toBe(true);
    await tid(page, 'next-action-1').tap();
    await expect(tid(page, 'panel-market')).toBeVisible();
  });
});

test.describe('What next? on a small phone with its browser bars (375×548, touch)', () => {
  test.use({ viewport: { width: 375, height: 548 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('the confirmation review, F1: the button is placed clear of the toasts, the tank bar and the guide card, in both views, with and without the guide', async ({ page }) => {
    await floatingAround(page);
  });
});

/**
 * The confirmation review, F1: with two toasts up, in the tank view and the room view, at the default text size and
 * 130 %, with the guide card and after skipping the guide: the button is clear of everything (and a tap reaches it),
 * or out of the way when there is no room; and while it is shown it opens the sheet.
 */
async function floatingAround(page: Page): Promise<void> {
  await openApp(page);
  await quickGame(page, 'betta');
  await aq(page, 'dev.setSpeed', 0);
  for (const guide of [true, false]) {
    if (!guide) await aq(page, 'act', 'tutorialSkip');
    for (const view of ['tank', 'room'] as const) {
      for (const scale of [1, 1.3]) {
        await textScale(page, scale);
        await twoToasts(page);
        const what = `${guide ? 'the guide card' : 'no guide'}, the ${view} view, text ${scale * 100}%`;
        if (guide) await expect.poll(async () => (await layout(page)).coach, { message: what }).not.toBeNull();
        else await expect.poll(async () => (await layout(page)).coach, { message: what }).toBeNull();
        if (view === 'room') await expect.poll(async () => (await layout(page)).roomChip, { message: what }).not.toBeNull();
        await page.waitForTimeout(700); // (float.ts places it every 300 ms; its move eases over 350 ms)
        expectFloatingPlaced(await layout(page), what);
      }
      await tid(page, 'view-toggle').tap();
    }
  }
  // without the guide, it is there and opens the sheet
  await textScale(page, 1);
  await expect.poll(async () => (await layout(page)).btnShown).toBe(true);
  await tid(page, 'hud-next').tap();
  await expect(tid(page, 'next-sheet')).toBeVisible();
}
