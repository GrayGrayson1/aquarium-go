/**
 * Round-2 features end to end: Shows & championships, Staff, Frags & cuttings and the Brackish estuary chapter.
 * OWNER: lane "qa-final". Fixtures and window.__AQ get each test to the interesting state fast; the steps that matter
 * (entering a show, hiring a keeper, taking a frag, converting a tank) go through the real UI (docs/TEST_IDS.md).
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, tid, aq, probe, openPanel, waitForState, waitForWarmup, collectErrors, expectCanvasNotBlank } from './helpers';

/** Load a registered fixture through the URL and wait until the world is up and its shaders have compiled. */
async function openFixture(page: Page, name: string, view: 'tank' | 'facility' = 'tank'): Promise<void> {
  await openApp(page, `/?fixture=${name}${view === 'facility' ? '&view=facility' : ''}`);
  await page.waitForFunction(() => (window as unknown as { __AQ: { summary(): { screen: string; hasGame: boolean } } }).__AQ.summary().hasGame);
  await waitForWarmup(page);
}

/** Toasts on screen right now (kind + text). */
async function toastTexts(page: Page): Promise<string[]> {
  return page.locator('[data-testid="toast"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-kind')}: ${(e.textContent ?? '').replace(/\s+/g, ' ').trim()}`));
}

test.describe('round-2 features', () => {
  test('shows: enter an eligible animal, see it judged with a judge’s card; ineligible entrants say why', async ({ page }) => {
    const errors = collectErrors(page);
    await openFixture(page, 'shows-demo');
    await openPanel(page, 'shows');
    await tid(page, 'shows-tab-upcoming').click();

    // The first open show with an Enter button → the entry flow.
    const enter = page.locator('[data-testid^="show-enter-"]:not([disabled])').first();
    await expect(enter).toBeVisible();
    const showId = ((await enter.getAttribute('data-testid')) ?? '').replace('show-enter-', '');
    await enter.click();
    await expect(tid(page, 'show-confirm-entry')).toBeVisible();

    // Pick a class where one of ours is eligible and at least one isn't (berried shrimp, an animal already entered…).
    const classes = page.locator('[data-testid^="show-class-"]');
    let picked = false;
    for (let i = 0; i < (await classes.count()) && !picked; i++) {
      await classes.nth(i).click();
      const off = page.locator('[data-testid^="show-candidate-"].is-off');
      const on = page.locator('[data-testid^="show-candidate-"]:not(.is-off)');
      if ((await on.count()) > 0 && (await off.count()) > 0) picked = true;
    }
    expect(picked, 'a class with both eligible and ineligible entrants').toBe(true);
    // Ineligible rows explain themselves (the humane rules), and can't be picked.
    const off = page.locator('[data-testid^="show-candidate-"].is-off').first();
    await expect(off.locator('.sh-cand__why')).toHaveText(/\S{3,}/);
    await expect(off.locator('input[type="radio"]')).toBeDisabled();

    // Enter the pre-picked (best eligible) animal: the fee is paid and the entry waits for the judges.
    const confirm = tid(page, 'show-confirm-entry');
    await expect(confirm).toBeEnabled();
    const before = await probe<{ money: number; entries: number }>(page, `({ money: g.finance.money, entries: (g.shows?.entries ?? []).length })`);
    await confirm.click();
    await waitForState(page, `(g.shows?.entries ?? []).length > ${before.entries}`);
    const entry = await probe<{ id: string; status: string }>(page, `(e => ({ id: e.id, status: e.status }))(g.shows.entries[g.shows.entries.length - 1])`);
    expect(entry.status).toBe('entered');
    expect(await probe<number>(page, 'g.finance.money')).toBeLessThan(before.money);
    await expect(tid(page, `show-entry-${entry.id}`)).toBeVisible(); // Entries tab after confirming

    // Advance to judging day, then read the result and its judge's card.
    const until = await probe<number>(page, `g.shows.shows.find(s => s.id === '${showId}').judgingHour - g.clock.hour`);
    await aq(page, 'advance', Math.max(1, until + 1));
    await waitForState(page, `g.shows.entries.find(e => e.id === '${entry.id}').status !== 'entered'`);
    const status = await probe<string>(page, `g.shows.entries.find(e => e.id === '${entry.id}').status`);
    await tid(page, 'shows-tab-results').click();
    const result = tid(page, `show-result-${entry.id}`);
    if (status === 'judged') {
      await expect(result).toBeVisible();
      if (!(await result.getByTestId('judge-card').isVisible())) await result.locator('.sh-result__head').click();
      const card = result.getByTestId('judge-card');
      await expect(card).toBeVisible();
      await expect(card).toContainText(/Judge’s card/i);
      await expect(card.locator('.sh-card__lines li').first()).toBeVisible();
    } else {
      // A scratched entry (unwell on the day) is refunded and says why — still a finished show day.
      expect(status).toBe('scratched');
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('staff: unlock with the shop, hire an aquarist, assign a tank, see the keeper on the tank card', async ({ page }) => {
    const errors = collectErrors(page);
    // Before the specialty shop, Visitors (and so its Staff tab) is a locked destination. lane:ui-shell (chunk 1, 0.5
    // spec §5.7) — changed on purpose: the locked panel hides its tabs, so the Staff tab's "first shop" preview can't be
    // reached any more (staff and visitors both unlock with the specialty shop); the panel says what opens it instead.
    await openApp(page);
    await quickGame(page, 'betta', { unlockAll: false });
    await aq(page, 'act', 'tutorialSkip');
    await aq(page, 'setUI', { panel: 'visitors', panelTarget: 'tab:staff' });
    await expect(tid(page, 'locked-visitors')).toContainText('Visitors open with a Specialty Shop');
    await expect(page.locator('[data-testid^="staff-hire-"]')).toHaveCount(0);

    // The specialty shop: the unlock fires (with a toast that leads to the Staff tab).
    await openFixture(page, 'staff_shop');
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aqw = (window as any).__AQ;
      aqw.mutate((d: { progress: { unlocked: string[] } }) => {
        d.progress.unlocked = d.progress.unlocked.filter((k) => k !== 'staff');
      });
    });
    await aq(page, 'advance', 1);
    await waitForState(page, `g.progress.unlocked.includes('staff')`);
    await expect.poll(async () => (await toastTexts(page)).join('\n'), { timeout: 6_000 }).toMatch(/staff/i);

    // Hire the first aquarist in the pool.
    await aq(page, 'setUI', { panel: 'visitors', panelTarget: 'tab:staff' });
    await expect(tid(page, 'staff-tab')).toBeVisible();
    const candidateId = await probe<string>(page, `g.staff.candidates.find(c => c.role === 'aquarist').id`);
    await tid(page, `staff-hire-${candidateId}`).click();
    await waitForState(page, `g.staff.roster.some(m => m.id === '${candidateId}')`);
    const card = tid(page, `staff-member-${candidateId}`);
    await expect(card).toBeVisible();

    // Assign the focused tank to them (unless hiring already shared it out).
    const tankId = await probe<string>(page, 'g.tankOrder[0]');
    const has = await probe<boolean>(page, `g.staff.roster.find(m => m.id === '${candidateId}').tankIds.includes('${tankId}')`);
    if (!has) {
      await tid(page, `staff-edit-${candidateId}`).click();
      await tid(page, `staff-assign-${candidateId}-${tankId}`).click();
      await waitForState(page, `g.staff.roster.find(m => m.id === '${candidateId}').tankIds.includes('${tankId}')`);
    }

    // The tank card names the keeper, and the line opens Visitors › Staff.
    await page.keyboard.press('Escape');
    await aq(page, 'setUI', { panel: null, view: 'tank', focusedTankId: tankId });
    await tid(page, 'tank-card-toggle').click();
    const keeper = tid(page, 'tank-card-keeper');
    await expect(keeper).toBeVisible();
    const first = (await probe<string>(page, `g.staff.roster.find(m => m.id === '${candidateId}').name`)).split(' ')[0];
    await expect(keeper).toContainText(`Cared for by ${first}`);
    await keeper.click();
    await expect(tid(page, 'staff-tab')).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('frags: take a frag from a grown coral, then list it on the market', async ({ page }) => {
    const errors = collectErrors(page);
    await openFixture(page, 'frags_reef');
    await openPanel(page, 'build');
    await tid(page, 'build-tab-decor').click();
    const take = page.locator('[data-testid^="frag-take-"]').first();
    await take.scrollIntoViewIfNeeded();
    await expect(take).toBeVisible();
    const before = await probe<string[]>(page, '(g.inventory.frags ?? []).map(f => f.id)');
    await take.click();
    await waitForState(page, `(g.inventory.frags ?? []).length > ${before.length}`);
    const fragId = await probe<string>(page, `(g.inventory.frags ?? []).map(f => f.id).find(id => !${JSON.stringify(before)}.includes(id))`);
    const item = tid(page, `frag-item-${fragId}`);
    await item.scrollIntoViewIfNeeded();
    await expect(item).toBeVisible();

    // "List" opens the Market wizard with just this frag picked; step through to the review and confirm.
    await tid(page, `frag-list-${fragId}`).click();
    await expect(tid(page, 'panel-market')).toBeVisible();
    for (let i = 0; i < 8 && !(await tid(page, 'listing-confirm').isVisible()); i++) {
      await page.getByRole('button', { name: /^(Next|Skip)\b/ }).last().click();
      await page.waitForTimeout(250);
    }
    await expect(tid(page, 'frag-review')).toBeVisible();
    await tid(page, 'listing-confirm').click();
    await waitForState(page, `g.market.listings.some(l => l.kind === 'frag' && l.status === 'active' && (l.fragItems ?? []).some(f => f.id === '${fragId}'))`);
    // The frag left storage while it's listed.
    expect(await probe<boolean>(page, `(g.inventory.frags ?? []).some(f => f.id === '${fragId}')`)).toBe(false);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('brackish: research gate, converting an empty tank, and the estuary renders', async ({ page }) => {
    const errors = collectErrors(page);
    await openApp(page);
    await quickGame(page, 'pea_puffer', { unlockAll: false, money: 20_000 });
    await aq(page, 'act', 'tutorialSkip');
    const tankId = (await aq<{ ok: boolean; tankId?: string }>(page, 'act', 'buyTank', 'g20L', 'freshwater_tropical')).tankId!;
    expect(tankId).toBeTruthy();

    // Locked: brackish is marked "(locked)" and Convert stays disabled.
    await aq(page, 'setUI', { panel: 'tanks', panelTarget: `tank:${tankId}` });
    const select = page.getByLabel('Water class');
    await expect(select).toBeVisible();
    await expect(select.locator('option[value="brackish"]')).toHaveText(/locked/i);
    await select.selectOption('brackish');
    await expect(tid(page, 'tank-convert')).toBeDisabled();

    // Research Brackish Estuaries (after intermediate freshwater) and let it finish.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__AQ.mutate((d: { progress: { unlocked: string[] } }) => {
        if (!d.progress.unlocked.includes('fw_intermediate')) d.progress.unlocked.push('fw_intermediate');
      });
    });
    await aq(page, 'setUI', { panel: 'research', panelTarget: null });
    const card = tid(page, 'research-brackish_estuaries');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await tid(page, 'research-start-brackish_estuaries').click();
    await waitForState(page, `g.progress.research.activeId === 'brackish_estuaries'`);
    await aq(page, 'advance', 48);
    await waitForState(page, `g.progress.unlocked.includes('brackish')`);

    // Now the empty tank converts to brackish water.
    await aq(page, 'setUI', { panel: 'tanks', panelTarget: `tank:${tankId}` });
    await expect(select.locator('option[value="brackish"]')).not.toHaveText(/locked/i);
    await select.selectOption('brackish');
    await expect(tid(page, 'tank-convert')).toBeEnabled();
    await tid(page, 'tank-convert').click();
    await waitForState(page, `g.tanks['${tankId}'].waterClass === 'brackish'`);
    expect(errors, errors.join('\n')).toEqual([]);

    // The estuary showcase: a brackish tank with its mangroves and archerfish, rendered (not a blank canvas).
    await openFixture(page, 'brackish_estuary');
    const s = await aq<{ focusedWaterClass: string; creatures: number }>(page, 'summary');
    expect(s.focusedWaterClass).toBe('brackish');
    expect(s.creatures).toBeGreaterThan(4);
    await expectCanvasNotBlank(page);
  });
});
