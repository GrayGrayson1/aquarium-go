import { test, expect } from '@playwright/test';
import { openApp, onboardViaUI, quickGame, tid, aq, probe, clickTank, openPanel, waitForState, collectErrors } from './helpers';

test.describe('core gameplay loop', () => {
  test('tutorial: complete the first steps by doing them, then skip the rest', async ({ page }) => {
    await openApp(page);
    await onboardViaUI(page, 'betta', 'Coach');
    const card = tid(page, 'tutorial-card');
    await expect(card).toBeVisible();
    const step = () => probe<number>(page, 'g.progress.tutorial.step');
    const s0 = await step();
    const nextIfPlain = async () => {
      // "Next" is offered on look-around steps; the same test id marks the "Show me" hint otherwise.
      const next = tid(page, 'tutorial-next');
      if ((await next.count()) && /next/i.test((await next.first().textContent()) ?? '')) await next.first().click();
    };
    // camera → Next
    await nextIfPlain();
    // feed → use the feed tool on the tank
    await tid(page, 'tool-feed').click();
    const option = page.locator('[data-testid^="food-option-"]').first();
    if (await option.isVisible().catch(() => false)) await option.click();
    await clickTank(page);
    await page.waitForTimeout(600);
    // water → open the tank card
    const cardToggle = tid(page, 'tank-card-toggle');
    if (await cardToggle.count()) {
      await cardToggle.click();
      await page.waitForTimeout(400);
      await cardToggle.click();
    }
    await nextIfPlain();
    // habitat → place a decor item from Build
    await openPanel(page, 'build');
    await page.getByText(/^\s*Decor\s*$/).first().click();
    const decor = page.locator('[data-testid^="build-decor-"]').first();
    if (await decor.isVisible().catch(() => false)) {
      await decor.click();
      await page.waitForTimeout(400);
      await clickTank(page);
      await page.waitForTimeout(600);
    }
    await page.keyboard.press('Escape');
    await nextIfPlain();
    await expect.poll(step, { timeout: 10_000 }).toBeGreaterThanOrEqual(s0 + 3);

    // Skip the rest (skip asks for confirmation — the confirm button carries the same test id).
    await tid(page, 'tutorial-skip').first().click();
    const confirm = page.getByRole('button', { name: 'Skip guide' });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(card).toBeHidden();
    const after = await probe<{ done: boolean; skipped: boolean }>(page, 'g.progress.tutorial');
    expect(after.done || after.skipped).toBe(true);
  });

  test('feed the tank', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    const before = await probe<{ food: number; servings: number }>(
      page,
      `({ food: g.tanks[g.tankOrder[0]].water.foodInWater, servings: Object.values(g.inventory.foods).reduce((a, b) => a + b, 0) })`,
    );
    await tid(page, 'tool-feed').click();
    const option = page.locator('[data-testid^="food-option-"]').first();
    if (await option.count()) await option.click();
    await clickTank(page);
    await waitForState(
      page,
      `g.tanks[g.tankOrder[0]].water.foodInWater > ${before.food} || Object.values(g.inventory.foods).reduce((a, b) => a + b, 0) < ${before.servings} || (g.progress.counters.feeds || 0) > 0`,
    );
  });

  test('add decor in build mode', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'axolotl', { money: 2000 });
    const before = await probe<number>(page, 'g.tanks[g.tankOrder[0]].decor.length');
    await openPanel(page, 'build');
    await page.getByText(/^\s*Decor\s*$/).first().click();
    const item = page.locator('[data-testid^="build-decor-"]').first();
    await expect(item).toBeVisible();
    await item.click();
    // Placement tool: hover + click inside the tank; try a few spots in case one collides with existing decor.
    await page.waitForTimeout(400);
    for (const [fx, fy] of [[0.5, 0.55], [0.35, 0.6], [0.65, 0.6], [0.45, 0.5], [0.55, 0.62]]) {
      if ((await probe<number>(page, 'g.tanks[g.tankOrder[0]].decor.length')) > before) break;
      await clickTank(page, false, fx, fy);
      await page.waitForTimeout(500);
    }
    await waitForState(page, `g.tanks[g.tankOrder[0]].decor.length > ${before}`);
  });

  test('buy livestock from the market', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta', { money: 3000 });
    // Guarantee a compatible (mystery snail + betta = excellent), affordable offer at index 0.
    await aq(page, 'dev.addShopOffer', 'mystery_snail', { price: 12 });
    const before = await probe<{ n: number; money: number }>(page, `({ n: Object.values(g.creatures).filter(c => c.status === 'alive').length, money: g.finance.money })`);
    await openPanel(page, 'market');
    await tid(page, 'shop-offer-0').click();
    await tid(page, 'buy-offer').click();
    await waitForState(page, `Object.values(g.creatures).filter(c => c.status === 'alive').length > ${before.n}`);
    const money = await probe<number>(page, 'g.finance.money');
    expect(money).toBeLessThan(before.money);
  });

  test('incompatibility warning for a bad pairing (second male betta)', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta', { money: 3000 });
    await aq(page, 'dev.addShopOffer', 'betta', { sex: 'male', price: 25 });
    await openPanel(page, 'market');
    await tid(page, 'shop-offer-0').click();
    const verdict = tid(page, 'compat-verdict');
    await expect(verdict).toBeVisible();
    await expect(verdict).not.toHaveText(/excellent/i);
    await expect(verdict).toHaveText(/incompatible|high.?risk|conditional|risk|fight/i);
    await expect(tid(page, 'compat-reason').first()).toBeVisible();
    // The engine agrees with the UI.
    const report = await aq<{ verdict: string }>(page, 'query', 'previewAddition', await probe<string>(page, 'g.tankOrder[0]'), { speciesId: 'betta', sex: 'male' });
    expect(['incompatible', 'high_risk']).toContain(report.verdict);
  });

  test('create a listing, receive a bid, accept it', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta', { money: 3000 });
    // Something to sell besides the starter.
    await aq(page, 'dev.spawnSpecies', 'betta', undefined, { sex: 'female', count: 1 });
    await openPanel(page, 'market');
    if (!(await tid(page, 'listing-create').isVisible())) await page.getByText(/My listings/).first().click();
    await tid(page, 'listing-create').click();
    await tid(page, 'listing-kind-creature').click();
    // Wizard: kind → animal → price → duration → photo → review. (Row/Next selectors are UI internals.)
    for (let i = 0; i < 10 && !(await tid(page, 'listing-confirm').isVisible()); i++) {
      const row = page.locator('.pn-pickrow').filter({ hasNotText: 'Starter' }).first();
      if ((await row.isVisible().catch(() => false)) && !(await row.evaluate((el) => el.classList.contains('is-on')))) await row.click();
      await page.getByRole('button', { name: /^(Next|Skip)\b/ }).last().click();
      await page.waitForTimeout(250);
    }
    await tid(page, 'listing-confirm').click();
    await waitForState(page, 'g.market.listings.length > 0');
    const listingId = await probe<string>(page, 'g.market.listings[0].id');

    // Advance in small steps until an OPEN bid (bids expire after a while) or a sale.
    for (let i = 0; i < 20; i++) {
      const st = await probe<{ open: number; status: string }>(page, `(l => ({ open: l.bids.filter(b => b.status === 'open').length, status: l.status }))(g.market.listings.find(l => l.id === '${listingId}'))`);
      if (st.open > 0 || st.status !== 'active') break;
      await aq(page, 'advance', 4);
    }
    const status = await probe<string>(page, `g.market.listings.find(l => l.id === '${listingId}').status`);
    if (status === 'sold') return; // a buy-now buyer beat us to it — still a completed sale

    const moneyBefore = await probe<number>(page, 'g.finance.money');
    await aq(page, 'setUI', { panel: 'market', panelTarget: `listing:${listingId}` });
    await tid(page, 'bid-accept').first().click();
    await waitForState(page, `g.market.listings.find(l => l.id === '${listingId}').status === 'sold'`);
    expect(await probe<number>(page, 'g.finance.money')).toBeGreaterThan(moneyBefore);
  });

  test('add a second tank', async ({ page }) => {
    const errors = collectErrors(page);
    await openApp(page);
    await quickGame(page, 'pea_puffer', { money: 5000 });
    await openPanel(page, 'build');
    const tier = tid(page, 'build-tank-g10').or(page.locator('[data-testid^="build-tank-"]').first()).first();
    await tier.click();
    await page.waitForTimeout(500);
    // Placement mode: click the facility floor until a valid spot takes it (harmless if placed automatically).
    const box = (await page.locator('canvas').first().boundingBox())!;
    for (const [fx, fy] of [[0.5, 0.62], [0.3, 0.65], [0.7, 0.65], [0.5, 0.75], [0.2, 0.55], [0.8, 0.55]]) {
      if ((await probe<number>(page, 'g.tankOrder.length')) >= 2) break;
      await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(200);
      await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(400);
    }
    await waitForState(page, 'g.tankOrder.length >= 2');
    const placements = await probe<{ x: number; z: number }[]>(page, 'g.tankOrder.map(id => g.tanks[id].placement)');
    expect(placements[0].x !== placements[1].x || placements[0].z !== placements[1].z).toBe(true);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
