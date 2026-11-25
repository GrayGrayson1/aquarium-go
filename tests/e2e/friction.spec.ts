/**
 * chunk 22 (ADR-0058) — the friction fixes, end to end. Each case is one place a player stopped, hunted or tapped
 * more than they should (findings A-1 to A-5 in the chunk's brief, PLAN.md chunk 22):
 * - A-1: the tank card's "Jump to care" brings the water-change buttons into view (on a phone they sit under
 *   sixteen readings);
 * - A-2: the tank bar's name and status open and close the tank card;
 * - A-3: Market › Listings puts active listings first (the introduction only while nothing is listed), and
 *   "New listing" stays one tap away;
 * - A-4: the listing wizard's "Skip to review" lists an animal from its card in four taps, with the suggested price
 *   and the recommended length;
 * - A-5: the tooltips name the keys (Feed F, Tank card T, Room V, the tank arrows, Photo P, Just watch H);
 * - A-6: on a phone held sideways the tank card's chips, problem lines and Move tank scroll with its content, so a
 *   reading and the care buttons fit between the tabs and the tab bar (they had 0 to 23 px);
 * - A-7: there too, Settings' "Save now" ends the scrolling page (a fixed footer left 33 px of settings).
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { aq, openApp, probe, quickGame, tid } from './helpers';

/** A game past the guide, paused, with everything unlocked (listings included). */
async function game(page: Page): Promise<void> {
  await openApp(page);
  await quickGame(page, 'betta', { money: 3000 });
  await aq(page, 'act', 'tutorialSkip');
  await aq(page, 'dev.setSpeed', 0);
  await expect(tid(page, 'tank-open-card')).toBeVisible();
}

const starterId = (page: Page) => probe<string>(page, `Object.values(g.creatures).find((c) => c.status === 'alive').id`);

/** List the starter through the sim's own command (the wizard has its own case below). */
async function listStarter(page: Page): Promise<void> {
  const id = await starterId(page);
  const res = await aq<{ ok: boolean } | null>(page, 'cmd', { k: 'createListing', kind: 'creature', creatures: [id], reserve: 10, hours: 48, title: 'Friction test' });
  expect(res?.ok).toBe(true);
}

function suite(touch: boolean) {
  const press = (l: Locator) => (touch ? l.tap() : l.click());

  test('A-2: the tank’s name and status open the tank card, and close it again', async ({ page }) => {
    await game(page);
    const open = tid(page, 'tank-open-card');
    await expect(open).toHaveAttribute('aria-expanded', 'false');
    await expect(open).toContainText('Healthy');
    await press(open);
    await expect(tid(page, 'tank-card')).toBeVisible();
    await expect(open).toHaveAttribute('aria-expanded', 'true');
    await expect(tid(page, 'tank-card-toggle')).toHaveAttribute('aria-pressed', 'true');
    await press(open);
    await expect(tid(page, 'tank-card')).toBeHidden();
  });

  test('A-1: “Jump to care” brings the water change into view', async ({ page }) => {
    await game(page);
    await press(tid(page, 'tank-open-card'));
    await expect(tid(page, 'water-jump-care')).toBeVisible();
    const change = tid(page, 'action-water-change');
    if (touch) await expect(change).not.toBeInViewport(); // the reason for the link: on a phone Care starts off screen
    await press(tid(page, 'water-jump-care'));
    await expect(change).toBeInViewport({ ratio: 1 });
    await expect(tid(page, 'action-top-off')).toBeInViewport({ ratio: 1 });
    // and it is the real control: the change happens
    const before = await probe<number>(page, 'g.progress.counters?.waterChanges ?? 0');
    await press(change);
    await expect.poll(() => probe<number>(page, 'g.progress.counters?.waterChanges ?? 0')).toBeGreaterThan(before);
  });

  test('A-3: with something listed, the listings come before the introduction’s place and New listing stays', async ({ page }) => {
    await game(page);
    await page.evaluate(() => { location.hash = '#/market/listings'; });
    await expect(tid(page, 'panel-market')).toBeVisible();
    // nothing listed: the introduction, with its button
    await expect(page.locator('.pn-sellhero')).toBeVisible();
    await expect(tid(page, 'listing-create')).toHaveCount(1);
    await listStarter(page);
    // listed: no introduction; one button, in the Active heading, above the first listing
    await expect(page.locator('.pn-sellhero')).toHaveCount(0);
    const create = tid(page, 'listing-create');
    await expect(create).toHaveCount(1);
    await expect(create).toBeInViewport({ ratio: 1 });
    const card = page.locator('.pn-listing').first();
    await expect(card).toBeVisible();
    const [b, c] = [await create.boundingBox(), await card.boundingBox()];
    expect(b!.y + b!.height).toBeLessThanOrEqual(c!.y + 1);
    await press(create);
    await expect(page.getByText('What would you like to sell?')).toBeVisible();
  });

  test('A-4: Sell, Next, Skip to review, Confirm lists an animal with the suggested price and length', async ({ page }) => {
    await game(page);
    const id = await starterId(page);
    await page.evaluate((c) => { location.hash = `#/livestock/animal/${c}`; }, id);
    await expect(tid(page, 'creature-card')).toBeVisible();
    await press(tid(page, 'creature-card').getByRole('button', { name: 'Sell', exact: true }));
    await expect(page.getByText('Which animal?')).toBeVisible();
    await expect(tid(page, 'listing-skip-review')).toHaveCount(0); // not before a price is on the table
    const nav = page.locator('.pn-wizard__nav');
    await press(nav.getByRole('button', { name: 'Next' }));
    await expect(page.getByText('Set your price')).toBeVisible();
    await press(tid(page, 'listing-skip-review'));
    const confirm = tid(page, 'listing-confirm');
    await expect(confirm).toBeEnabled();
    await expect(tid(page, 'listing-skip-review')).toHaveCount(0);
    await press(confirm);
    await expect.poll(() => probe<number>(page, `g.market.listings.filter((l) => l.status === 'active').length`)).toBe(1);
    // what the skipped steps would have set: the recommended two days, no photo, a reserve above zero
    const l = await probe<{ hours: number; reserve: number; photo: boolean }>(page, `(() => { const l = g.market.listings[0]; return { hours: l.endsHour - l.createdHour, reserve: l.reserve, photo: !!l.photo }; })()`);
    expect(l.hours).toBe(48);
    expect(l.reserve).toBeGreaterThan(0);
    expect(l.photo).toBe(false);
  });
}

test.describe('Friction fixes on a computer (1440×900)', () => {
  suite(false);

  test('A-5: the tooltips name the keys', async ({ page }) => {
    await game(page);
    await expect(tid(page, 'tool-feed')).toHaveAttribute('title', /\(F\)$/);
    await expect(tid(page, 'tool-photo')).toHaveAttribute('title', 'Photo (P)');
    await expect(tid(page, 'tool-watch')).toHaveAttribute('title', 'Just watch (H)');
    await expect(tid(page, 'tank-card-toggle')).toHaveAttribute('title', 'Tank card (T)');
    await expect(tid(page, 'view-toggle')).toHaveAttribute('title', 'Show the whole room (V)');
    await expect(tid(page, 'tank-prev')).toHaveAttribute('title', 'Previous tank ([)');
    await expect(tid(page, 'tank-next')).toHaveAttribute('title', 'Next tank (])');
    // and the keys do what the tooltips say
    await page.keyboard.press('t');
    await expect(tid(page, 'tank-card')).toBeVisible();
    await page.keyboard.press('t');
    await expect(tid(page, 'tank-card')).toBeHidden();
  });
});

test.describe('Friction fixes on a phone (390×844, touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  suite(true);
});

test.describe('Friction fixes on a phone held sideways (844×390, touch)', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('A-6: the tank card’s header details scroll away, and a reading and the care buttons fit on screen', async ({ page }) => {
    await game(page);
    await tid(page, 'tank-card-toggle').tap();
    const card = tid(page, 'tank-card');
    await expect(card).toBeVisible();
    // only the name stays in the fixed header; the chips and Move tank are the first thing in the scrolling body
    await expect(card.locator('.ag-sheet__head .ag-thead__name')).toHaveText(/.+/);
    await expect(card.locator('.ag-sheet__head [data-testid="tank-move"]')).toHaveCount(0);
    await expect(card.locator('.ag-sheet__body [data-testid="tank-card-details"] [data-testid="tank-move"]')).toBeVisible();
    // (the sheet slides in: measure once it rests)
    await expect.poll(async () => { const a = (await card.boundingBox())!.y; await page.waitForTimeout(150); return Math.abs((await card.boundingBox())!.y - a); }).toBeLessThan(0.5);
    // the room between the sticky tabs and the tab bar, once the details have scrolled away
    const room = async (id: string) => {
      // scroll it to just under the tabs (68 px; they stick to the top of the body once the details have passed)
      await tid(page, id).evaluate((el) => {
        const body = el.closest('.ag-sheet__body')!;
        body.scrollTo({ top: body.scrollTop + el.getBoundingClientRect().top - (body.getBoundingClientRect().top + 76), behavior: 'instant' });
      });
      return page.evaluate((testId) => {
        const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        const el = box(`[data-testid="${testId}"]`);
        return { top: el.top, bottom: el.bottom, tabs: box('[data-testid="tank-card"] .ag-tcard__tabs').bottom, bar: box('[data-testid="nav-tabbar"]').top };
      }, id);
    };
    for (const id of ['water-status', 'action-water-change', 'action-top-off']) {
      const r = await room(id);
      expect(r.bar - r.tabs, 'room for content').toBeGreaterThanOrEqual(100);
      expect(r.top, `${id} below the tabs`).toBeGreaterThanOrEqual(r.tabs - 1);
      expect(r.bottom, `${id} above the tab bar`).toBeLessThanOrEqual(r.bar + 1);
    }
    // the care button is the real one
    const before = await probe<number>(page, 'g.progress.counters?.waterChanges ?? 0');
    await tid(page, 'action-water-change').tap();
    await expect.poll(() => probe<number>(page, 'g.progress.counters?.waterChanges ?? 0')).toBeGreaterThan(before);
  });
  test('A-7: Settings keeps room for its rows, and Save now ends the page', async ({ page }) => {
    await game(page);
    await page.evaluate(() => { location.hash = '#/settings'; });
    const panel = tid(page, 'panel-settings');
    await expect(panel).toBeVisible();
    await expect.poll(async () => { const a = (await panel.boundingBox())!.y; await page.waitForTimeout(150); return Math.abs((await panel.boundingBox())!.y - a); }).toBeLessThan(0.5);
    await expect(panel.locator('.ag-sheet__foot')).toHaveCount(0);
    const save = panel.locator('.ag-sheet__body [data-testid="settings-save"]');
    await expect(save).toHaveCount(1);
    const room = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      return box('[data-testid="nav-tabbar"]').top - box('[data-testid="panel-settings"] .ag-tcard__tabs').bottom;
    });
    expect(room).toBeGreaterThanOrEqual(100);
    // it scrolls into reach above the tab bar, and it saves
    await save.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const bar = (await tid(page, 'nav-tabbar').boundingBox())!.y;
    const b = (await save.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(bar);
    await save.tap();
    await expect(tid(page, 'toast').filter({ hasText: /saved/i }).first()).toBeVisible();
  });
});
