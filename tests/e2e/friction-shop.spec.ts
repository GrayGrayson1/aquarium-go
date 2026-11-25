/**
 * chunk 22 (ADR-0058) — the shop's friction fixes, end to end, on a phone (390×844, touch), where the play-test met
 * them. One case per finding (S-1 to S-11 in the chunk's brief, PLAN.md chunk 22):
 * - S-1: every Tanks row reaches its tank card, not only the tank in view;
 * - S-2: the More sheet's Find has a word beside its magnifier;
 * - S-3: the Staff tab says near the top how many people are applying, and goes to Hiring;
 * - S-4: a bid keeps its buyer's quote to two lines until tapped, with Accept, Counter and Decline on one row;
 * - S-5: answering bids doesn't reorder the listings while the tab is open;
 * - S-6: "Claim all" claims every finished quest, with one celebration;
 * - S-7: Shows › Entries, emptied by judging, says the results are in and opens them;
 * - S-8: Research with nothing running goes straight to the projects that can start;
 * - S-9: the room view's attention dots stay under an open panel;
 * - S-10: the bell's small links and chips, and a staff card's "Change tanks", take a tap at least 32 px tall;
 * - S-11: the admission card sets the fair ticket price in one tap.
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { aq, openApp, probe, quickGame, tid } from './helpers';

/** A built-in scenario (docs/SCENARIOS.md), built and on screen (it opens paused). */
async function scenario(page: Page, id: string): Promise<void> {
  await openApp(page, `/?scenario=${id}`);
  await page.waitForFunction(() => {
    const A = (window as unknown as { __AQ: { summary(): { screen: string }; scenario: { current(): unknown } } }).__AQ;
    return A.summary().screen === 'game' && !!A.scenario.current();
  });
  await expect(tid(page, 'lab-badge')).toBeVisible();
}

/** A new game past the guide, paused (research and the quest board as a player meets them). */
async function freshGame(page: Page): Promise<void> {
  await openApp(page);
  await quickGame(page, 'betta', { unlockAll: false, money: 3000 });
  await aq(page, 'act', 'tutorialSkip');
  await aq(page, 'dev.setSpeed', 0);
  await expect(tid(page, 'tank-open-card')).toBeVisible();
}

/** Wait until a sheet has stopped sliding (measure once it rests). */
async function settled(l: Locator): Promise<void> {
  await expect.poll(async () => { const a = (await l.boundingBox())!.y; await l.page().waitForTimeout(150); return Math.abs((await l.boundingBox())!.y - a); }).toBeLessThan(0.5);
}

/**
 * How tall a control's tap target is: the run of points straight above and below its centre that a tap there would
 * reach it at (elementFromPoint, which counts its pseudo-elements as the control).
 */
function hitHeight(l: Locator): Promise<number> {
  return l.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const c = r.top + r.height / 2;
    const on = (y: number) => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h)); };
    if (!on(c)) return 0;
    let up = 0;
    let down = 0;
    while (up < 40 && on(c - up - 1)) up++;
    while (down < 40 && on(c + down + 1)) down++;
    return up + down + 1;
  });
}

test.describe('Shop friction fixes on a phone (390×844, touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('S-1: every Tanks row has Tank card, which opens that tank’s card', async ({ page }) => {
    await scenario(page, 'staffed-store');
    await aq(page, 'setUI', { panel: 'tanks' });
    await expect(tid(page, 'panel-tanks')).toBeVisible();
    const ids = await probe<string[]>(page, 'g.tankOrder');
    const inView = await page.evaluate(() => (window as unknown as { __AQ: { ui(): { focusedTankId: string } } }).__AQ.ui().focusedTankId);
    for (const id of ids) await expect(tid(page, `tank-row-card-${id}`)).toHaveCount(1);
    const other = ids.find((id) => id !== inView)!;
    const row = tid(page, `tanks-row-${other}`);
    await row.scrollIntoViewIfNeeded();
    // compact on a phone: View, Tank card and Manage share one row under the value line
    const ys = await row.locator('.pn-tankcard__foot .ag-btn').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(ys).toHaveLength(3);
    expect(new Set(ys).size).toBe(1);
    await tid(page, `tank-row-card-${other}`).tap();
    const card = tid(page, 'tank-card');
    await expect(card).toBeVisible();
    await expect(card.locator('.ag-thead__name')).toHaveText(await probe<string>(page, `g.tanks['${other}'].name`));
    await expect.poll(() => page.evaluate(() => (window as unknown as { __AQ: { ui(): { focusedTankId: string } } }).__AQ.ui().focusedTankId)).toBe(other);
  });

  test('S-2: Find in the More sheet says “Find” beside its magnifier', async ({ page }) => {
    await freshGame(page);
    await page.evaluate(() => { location.hash = '#/more'; });
    const find = tid(page, 'more-find');
    await expect(find).toBeVisible();
    await expect(find).toHaveText('Find');
    await expect(find).toHaveAttribute('aria-label', 'Find anything');
    await expect(find.getByText('Find', { exact: true })).toBeVisible();
    await find.tap();
    await expect(tid(page, 'find-anything')).toBeVisible();
  });

  test('S-3: the Staff tab says how many are applying and goes to Hiring', async ({ page }) => {
    await scenario(page, 'staffed-store');
    // new faces arrive (the pool's own timing), while the team of four is full
    await page.evaluate(() => {
      const A = (window as unknown as { __AQ: { state(): { staff: { nextPoolHour: number }; clock: { hour: number } }; advance(h: number): void } }).__AQ;
      const g = A.state();
      A.advance(Math.max(1, g.staff.nextPoolHour - g.clock.hour + 1));
    });
    const applying = await probe<number>(page, 'g.staff.candidates.length');
    expect(applying).toBeGreaterThan(1);
    await aq(page, 'setUI', { panel: 'visitors', panelTarget: 'tab:staff' });
    await expect(tid(page, 'staff-tab')).toBeVisible();
    await expect(tid(page, 'staff-hiring')).toBeAttached();
    await expect(tid(page, 'staff-applying')).toHaveCount(0); // a full team can't hire: nothing to point at
    // one leaves: there is room, and the line says so near the top
    const docent = await probe<string>(page, `g.staff.roster.find((m) => m.role === 'docent').id`);
    expect((await aq<{ ok: boolean }>(page, 'cmd', { k: 'fireStaff', staff: docent })).ok).toBe(true);
    const line = tid(page, 'staff-applying');
    await expect(line).toHaveText(`${applying} people are applying for a job.`);
    await settled(tid(page, 'panel-visitors'));
    await expect(line).toBeInViewport();
    const hiring = tid(page, 'staff-hiring').getByText('Hiring', { exact: true });
    await expect(hiring).not.toBeInViewport();
    await tid(page, 'staff-see-candidates').tap();
    await expect(hiring).toBeInViewport();
    await expect(page.locator('[data-testid^="staff-hire-"]').first()).toBeInViewport();
  });

  test('S-4: a bid’s quote keeps to two lines until tapped, and its three answers share a row', async ({ page }) => {
    await scenario(page, 'market-bids');
    await page.evaluate(() => { location.hash = '#/market/listings'; });
    await expect(tid(page, 'panel-market')).toBeVisible();
    const bid = page.locator('.pn-bid').first();
    const quote = bid.getByTestId('bid-quote');
    await quote.scrollIntoViewIfNeeded();
    // lines on show (the button's height), and in all (the clamped words' scroll height)
    const lines = () => quote.evaluate((el) => {
      const q = el.querySelector('.pn-quote')!;
      const lh = parseFloat(getComputedStyle(q).lineHeight);
      return { shown: Math.round(el.getBoundingClientRect().height / lh), full: Math.round(q.scrollHeight / lh) };
    });
    const before = await lines();
    expect(before.full).toBeGreaterThan(2); // this buyer has a long story
    expect(before.shown).toBe(2);
    await expect(quote).toHaveAttribute('aria-expanded', 'false');
    const ys = await bid.locator('.pn-bid__actions .ag-btn').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(ys).toHaveLength(3);
    expect(new Set(ys).size).toBe(1);
    // and no answer is cut off
    for (const id of ['bid-accept', 'bid-counter', 'bid-decline']) {
      expect(await bid.getByTestId(id).evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
    await quote.tap();
    await expect(quote).toHaveAttribute('aria-expanded', 'true');
    expect((await lines()).shown).toBe(before.full);
    await quote.tap();
    expect((await lines()).shown).toBe(2);
  });

  test('S-5: answering bids leaves the listings where they are until the tab is opened again', async ({ page }) => {
    await scenario(page, 'market-bids');
    await page.evaluate(() => { location.hash = '#/market/listings'; });
    await expect(tid(page, 'panel-market')).toBeVisible();
    const order = () => page.locator('.pn-listing:not(.is-ended)').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    await expect.poll(async () => (await order()).length).toBeGreaterThan(2);
    const first = await order();
    const top = first[0]!.slice('listing-'.length);
    // the top listing (the most open bids) has every bid declined: re-sorted, it would drop to the bottom
    const bids = await probe<string[]>(page, `g.market.listings.find((l) => l.id === '${top}').bids.filter((b) => b.status === 'open').map((b) => b.id)`);
    expect(bids.length).toBeGreaterThan(0);
    for (const bid of bids) expect((await aq<{ ok: boolean }>(page, 'cmd', { k: 'declineBid', listing: top, bid })).ok).toBe(true);
    await expect.poll(() => probe<number>(page, `g.market.listings.find((l) => l.id === '${top}').bids.filter((b) => b.status === 'open').length`)).toBe(0);
    await page.waitForTimeout(1200); // the panel redraws (every 800 ms)
    expect(await order()).toEqual(first);
    // opened again, the order is decided afresh: listings with bids first
    const tabs = tid(page, 'panel-market');
    await tabs.getByRole('tab', { name: 'Shop', exact: true }).tap();
    await tabs.getByRole('tab', { name: /^Listings/ }).tap();
    await expect.poll(async () => (await order()).indexOf(`listing-${top}`)).toBe(first.length - 1);
  });

  test('S-6: Claim all claims every finished quest, in one celebration', async ({ page }) => {
    await freshGame(page);
    const ids = ['q_feed_routine', 'q_water_changes', 'q_water_good_3d'];
    await page.evaluate((qs) => {
      type Api = { __AQ: { mutate(fn: (s: { progress: { quests: { id: string; status: string; progress: number; startedHour: number }[] } }) => void): void } };
      (window as unknown as Api).__AQ.mutate((s) => {
        s.progress.quests = qs.map((id) => ({ id, status: 'complete', progress: 1, startedHour: 0 }));
      });
    }, ids);
    const money = await probe<number>(page, 'g.finance.money');
    const toasts = await page.evaluate(() => (window as unknown as { __AQ: { ui(): { toasts: unknown[] } } }).__AQ.ui().toasts.length);
    await aq(page, 'setUI', { panel: 'research', panelTarget: 'tab:quests' });
    const all = tid(page, 'quests-claim-all');
    await expect(all).toHaveText('Claim all (3)');
    await all.tap();
    await expect.poll(() => probe<string[]>(page, 'g.progress.quests.filter((q) => q.status !== "claimed").map((q) => q.id)')).toEqual([]);
    expect(await probe<number[]>(page, `[${ids.map((id) => `g.progress.counters['quest_claimed:${id}']`).join(', ')}]`)).toEqual([1, 1, 1]);
    expect(await probe<number>(page, 'g.finance.money')).toBeGreaterThan(money);
    await expect(all).toHaveCount(0);
    // one toast for the three, naming what they gave
    const added = await page.evaluate((n) => (window as unknown as { __AQ: { ui(): { toasts: { text: string; kind: string; detail?: string }[] } } }).__AQ.ui().toasts.slice(n), toasts);
    expect(added.filter((t) => /^Reward|Quest claimed/.test(t.text))).toEqual([]);
    expect(added.filter((t) => t.text === '3 rewards claimed')).toHaveLength(1);
    expect(added.find((t) => t.text === '3 rewards claimed')).toMatchObject({ kind: 'celebrate', detail: expect.stringContaining('$') });
  });

  test('S-7: Entries, emptied by judging, says the results are in and opens them', async ({ page }) => {
    await scenario(page, 'show-day');
    await aq(page, 'advance', 3); // judging (an hour away) comes and goes
    await expect.poll(() => probe<number>(page, 'g.shows.entries.filter((e) => e.status === "entered").length')).toBe(0);
    await aq(page, 'setUI', { panel: 'shows', panelTarget: 'tab:entries' });
    await expect(tid(page, 'panel-shows')).toBeVisible();
    await expect(tid(page, 'panel-shows').getByText('The results are in')).toBeVisible();
    await expect(tid(page, 'panel-shows').getByText('No entries waiting')).toHaveCount(0);
    await tid(page, 'shows-entries-see-results').tap();
    await expect(tid(page, 'shows-tab-results')).toHaveAttribute('aria-selected', 'true');
    // seen now: back on Entries it is the usual empty state, pointing at the calendar
    await tid(page, 'shows-tab-entries').tap();
    await expect(tid(page, 'panel-shows').getByText('No entries waiting')).toBeVisible();
    await expect(tid(page, 'shows-entries-see-results')).toHaveCount(0);
  });

  test('S-8: with nothing running, Research goes straight to the projects that can start', async ({ page }) => {
    await freshGame(page);
    await aq(page, 'setUI', { panel: 'research', panelTarget: 'tab:research' });
    const go = tid(page, 'research-show-startable');
    await expect(go).toBeInViewport();
    await expect(go).toHaveText('See what you can start');
    await go.tap();
    const chip = tid(page, 'research-status-available');
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(chip).toBeInViewport();
    // the list shows only those, and the first is on screen with the filter
    await expect(page.locator('.pn-research:not(.is-available)')).toHaveCount(0);
    await expect(page.locator('.pn-research.is-available').first()).toBeInViewport();
  });

  test('S-9: the room view’s attention dots stay under an open panel', async ({ page }) => {
    await scenario(page, 'ammonia-crisis');
    await aq(page, 'setUI', { view: 'facility' });
    const dot = page.locator('[data-testid^="room-tank-attn-"]').first();
    await expect(dot).toBeAttached();
    // is the dot what a tap at its centre would land on? (it takes no taps, so let it for the question)
    const onTop = () =>
      dot.evaluate((el: HTMLElement) => {
        el.style.pointerEvents = 'auto';
        const r = el.getBoundingClientRect();
        const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        el.style.pointerEvents = '';
        return h === el;
      });
    await expect.poll(onTop).toBe(true); // over the room, it shows
    await aq(page, 'setUI', { panel: 'tanks' });
    const panel = tid(page, 'panel-tanks');
    await expect(panel).toBeVisible();
    await settled(panel);
    // the sheet covers the dot's place, and the dot stays under it
    const [d, p] = [(await dot.boundingBox())!, (await panel.boundingBox())!];
    expect(d.y).toBeGreaterThan(p.y);
    expect(await onTop()).toBe(false);
  });

  test('S-10: the bell’s small links and chips, and “Change tanks”, take a tap at least 32 px tall', async ({ page }) => {
    await scenario(page, 'staffed-store');
    await aq(page, 'advance', 12); // a day's news: a tank's name and links on its rows
    await tid(page, 'hud-alerts').tap();
    await expect(tid(page, 'alerts-body')).toBeVisible();
    const targets: Locator[] = [
      tid(page, 'alerts-mark-read'),
      tid(page, 'alerts-clear-all'),
      tid(page, 'alerts-open-log'),
      page.locator('.ag-alerts-pop .ag-chip--sm').first(),
      page.locator('.ag-alerts-pop .ag-event__meta .ag-linkbtn').first(),
    ];
    for (const t of targets) {
      await t.scrollIntoViewIfNeeded();
      const box = (await t.boundingBox())!;
      expect(box.height).toBeLessThan(32); // they look as they did
      expect(await hitHeight(t), (await t.textContent()) ?? '').toBeGreaterThanOrEqual(32);
    }
    await tid(page, 'alerts-close').tap();
    await aq(page, 'setUI', { panel: 'visitors', panelTarget: 'tab:staff' });
    const edit = page.locator('[data-testid^="staff-edit-"]').first();
    await edit.scrollIntoViewIfNeeded();
    await expect(edit).toHaveText('Change tanks');
    expect(await hitHeight(edit)).toBeGreaterThanOrEqual(32);
    await edit.tap({ position: { x: 10, y: -6 } }); // above the words, inside the larger target
    await expect(edit).toHaveText('Done');
  });

  test('S-11: Set to fair price sets the ticket to the fair figure in one tap', async ({ page }) => {
    await scenario(page, 'staffed-store');
    await aq(page, 'setUI', { panel: 'visitors', panelTarget: 'tab:visitors' });
    await expect(tid(page, 'panel-visitors')).toBeVisible();
    const fairText = await tid(page, 'panel-visitors').getByText(/A fair ticket for your exhibits today is about/).textContent();
    const fair = Number(/\$(\d+)/.exec(fairText ?? '')![1]);
    const price = await probe<number>(page, 'g.facility.admission');
    expect(price).not.toBe(fair);
    const btn = tid(page, 'admission-fair');
    await expect(btn).toHaveText(`Set to fair price ($${fair})`);
    await btn.tap();
    await expect.poll(() => probe<number>(page, 'g.facility.admission')).toBe(fair);
    await expect(btn).toHaveCount(0);
    await expect(tid(page, 'panel-visitors').locator('.pn-admission__v')).toHaveText(`$${fair}`);
  });
});
