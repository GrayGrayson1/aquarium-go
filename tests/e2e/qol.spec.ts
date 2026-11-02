/**
 * chunk 19 (ADR-0055, QOL-001 to QOL-008) — quality of life, end to end: panels that stay open, links to the fix,
 * search and Find anything, the decorating camera, "How to unlock", and the guide's spotlight and tour. The shared
 * shop's dropdown (QOL-007) is in shared-shop.spec.ts.
 */
import { test, expect, type Page } from '@playwright/test';
import { aq, clickTank, openApp, openPanel, probe, quickGame, tid, waitForState } from './helpers';

interface UiBits {
  panel: string | null;
  aside: string | null;
  tool: string;
  view: string;
  focusedTankId: string | null;
  selectedCreatureId: string | null;
}
const ui = (page: Page) =>
  page.evaluate(() => {
    const u = (window as unknown as { __AQ: { ui(): Record<string, unknown> } }).__AQ.ui();
    return { panel: u.panel, aside: u.panelAside, tool: u.tool, view: u.view, focusedTankId: u.focusedTankId, selectedCreatureId: u.selectedCreatureId } as UiBits;
  });
const decorCount = (page: Page) => probe<number>(page, 'g.tanks[g.tankOrder[0]].decor.length');

async function start(page: Page, money = 3000, starter = 'axolotl'): Promise<void> {
  await openApp(page);
  await quickGame(page, starter, { money });
  await aq(page, 'act', 'tutorialSkip');
  await aq(page, 'dev.setSpeed', 0);
}

/** Choose the first piece of decor that can be bought now. */
async function chooseDecor(page: Page, touch = false): Promise<void> {
  const card = page.locator('[data-decor-id]:not([disabled]):not([aria-disabled])').first();
  await expect(card).toBeVisible();
  if (touch) await card.tap();
  else await card.click();
  await expect.poll(async () => (await ui(page)).tool).toBe('decor_place');
}

/** Place the piece in hand: a few spots in case one collides with what's there. */
async function placeSomewhere(page: Page, touch = false): Promise<void> {
  const before = await decorCount(page);
  for (const [fx, fy] of [
    [0.5, 0.6],
    [0.35, 0.62],
    [0.65, 0.6],
    [0.45, 0.5],
    [0.55, 0.66],
  ]) {
    if ((await decorCount(page)) > before) break;
    await clickTank(page, touch, fx, fy);
    await page.waitForTimeout(450);
  }
  await waitForState(page, `g.tanks[g.tankOrder[0]].decor.length > ${before}`);
}

test.describe('QOL-001: panels stay open', () => {
  test('a computer keeps Build open beside the tank while a piece is placed', async ({ page }) => {
    await start(page);
    await openPanel(page, 'build');
    await tid(page, 'build-tab-decor').click();
    await chooseDecor(page);
    expect((await ui(page)).panel).toBe('build');
    await expect(tid(page, 'panel-build')).toBeVisible();
    await placeSomewhere(page);
    await expect(tid(page, 'panel-build')).toBeVisible();
    await expect(tid(page, 'build-tab-decor')).toHaveAttribute('aria-selected', 'true');
    // Escape puts the next piece down first, and only then closes Build
    await chooseDecor(page);
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await ui(page)).tool).toBe('none');
    await expect(tid(page, 'panel-build')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tid(page, 'panel-build')).toBeHidden();
  });

  test('buying an animal keeps the Market open, and See them goes to the animal', async ({ page }) => {
    await start(page);
    await aq(page, 'dev.addShopOffer', 'mystery_snail', { price: 12 });
    await openPanel(page, 'market');
    await tid(page, 'shop-offer-0').click();
    await tid(page, 'buy-offer').click();
    await expect(tid(page, 'panel-market')).toBeVisible();
    const action = tid(page, 'toast-action').filter({ hasText: 'See them' }).first();
    await expect(action).toBeVisible();
    await action.click();
    await expect(tid(page, 'panel-market')).toBeHidden();
    await expect.poll(async () => (await ui(page)).selectedCreatureId).not.toBeNull();
  });
});

test.describe('QOL-001: buying part of a group (reviewer B1)', () => {
  test('goes back to the shop list, where the rest is still on offer and starts fresh', async ({ page }) => {
    await start(page);
    expect((await aq<{ ok: boolean }>(page, 'dev.addShopOffer', 'mystery_snail', { count: 3, price: 30 })).ok).toBe(true);
    await openPanel(page, 'market');
    await tid(page, 'shop-offer-0').click();
    // buy one of the three (the third): two stay on offer
    const pick = (n: number) => page.getByRole('checkbox', { name: `Include individual ${n}` });
    for (const n of [1, 2]) {
      await expect(pick(n)).toBeChecked();
      await page.locator('label.pn-check', { has: pick(n) }).click(); // (the visible box; the input is hidden under it)
      await expect(pick(n)).not.toBeChecked();
    }
    await tid(page, 'buy-offer').click();
    await expect(tid(page, 'panel-market')).toBeVisible();
    await expect(tid(page, 'buy-offer')).toBeHidden();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/shop');
    expect(await probe<number>(page, 'g.market.stock[0].creatures.length')).toBe(2);
    // the rest is a fresh look: both picked again (the old screen kept positions that now meant other animals)
    await tid(page, 'shop-offer-0').click();
    await expect(pick(1)).toBeChecked();
    await expect(pick(2)).toBeChecked();
  });
});

test.describe('QOL-001: a phone’s sheet steps aside and comes back', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('Build slides away while the piece is placed, then back to Decor', async ({ page }) => {
    await start(page);
    await tid(page, 'dock-build').tap();
    await expect(tid(page, 'panel-build')).toBeVisible();
    await tid(page, 'build-tab-decor').tap();
    await chooseDecor(page, true);
    await expect.poll(async () => (await ui(page)).aside).toBe('build');
    await expect(tid(page, 'panel-build')).toBeHidden();
    await placeSomewhere(page, true);
    // (changed on purpose after the review: the sheet came back after 0.9 s and hid the hint's "Place another". It
    // now waits while that's offered; Place another keeps it aside, Done brings it back)
    const again = tid(page, 'toolhint-place-another');
    await expect(again).toBeVisible();
    await page.waitForTimeout(1600);
    await expect(tid(page, 'panel-build')).toBeHidden();
    await again.tap();
    await expect.poll(async () => (await ui(page)).tool).toBe('decor_place');
    await placeSomewhere(page, true);
    await expect(again).toBeVisible();
    await page.locator('.ag-toolhint__done', { hasText: 'Done' }).tap();
    await expect(tid(page, 'panel-build')).toBeVisible({ timeout: 5000 });
    await expect(tid(page, 'build-tab-decor')).toHaveAttribute('aria-selected', 'true');
    expect((await ui(page)).aside).toBeNull();
  });
});

test.describe('QOL-001: when a phone’s sheet waits, and when it stays away (reviewer N2 and notes)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('Build comes back when Place another runs out, but not after the bell opened meanwhile', async ({ page }) => {
    await start(page);
    await tid(page, 'dock-build').tap();
    await tid(page, 'build-tab-decor').tap();
    await chooseDecor(page, true);
    await placeSomewhere(page, true);
    await expect(tid(page, 'toolhint-place-another')).toBeVisible();
    // nothing tapped: the offer runs out (8 s) and Build comes back on Decor
    await expect(tid(page, 'panel-build')).toBeVisible({ timeout: 12_000 });
    await expect(tid(page, 'build-tab-decor')).toHaveAttribute('aria-selected', 'true');
    // again, and the bell opens while the sheet waits: Build stays away (it slid back over the bell)
    await chooseDecor(page, true);
    await placeSomewhere(page, true);
    await expect(tid(page, 'toolhint-place-another')).toBeVisible();
    await tid(page, 'hud-alerts').tap();
    await expect(page.locator('.ag-alerts-pop')).toBeVisible();
    await page.waitForTimeout(9500);
    await expect(tid(page, 'panel-build')).toBeHidden();
    expect((await ui(page)).aside).toBeNull();
  });

  test('when the guide moves on to its next step, its card leads and Build stays away', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'axolotl', { money: 3000 });
    await page.evaluate(() => (window as unknown as { __AQ: { mutate(fn: (s: { progress: { tutorial: { step: number } } }) => void): void } }).__AQ.mutate((s) => void (s.progress.tutorial.step = 4)));
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'habitat');
    await tid(page, 'dock-build').tap();
    await tid(page, 'build-tab-decor').tap();
    await chooseDecor(page, true);
    await expect.poll(async () => (await ui(page)).aside).toBe('build');
    await placeSomewhere(page, true);
    await aq(page, 'advance', 0.05);
    await expect.poll(() => probe<number>(page, 'g.progress.tutorial.step')).toBeGreaterThan(4);
    // the piece was bought: Done ends "Place another", and Build would come back now
    const done = page.locator('.ag-toolhint__done', { hasText: 'Done' });
    if (await done.isVisible().catch(() => false)) await done.tap();
    await page.waitForTimeout(1500);
    await expect(tid(page, 'panel-build')).toBeHidden();
    expect((await ui(page)).aside).toBeNull();
    await expect(tid(page, 'tutorial-card')).toBeVisible();
    await expect(tid(page, 'tutorial-card')).not.toHaveAttribute('data-step', 'habitat');
  });
});

test.describe('QOL-002: the tank card links to the fix', () => {
  test('a failed heater links to its Repair, and low food to Market › Supplies', async ({ page }) => {
    await start(page, 3000, 'betta'); // a tropical starter: its tank has a heater
    const id = await probe<string>(page, 'g.tankOrder[0]');
    const heater = await page.evaluate((tankId) => {
      const api = (window as unknown as { __AQ: { mutate(fn: (s: { tanks: Record<string, { equipment: { id: string; defId: string; failed?: boolean; failMode?: string }[] }>; inventory: { foods: Record<string, number> } }) => void): void; game(): { tanks: Record<string, { equipment: { id: string; defId: string }[] }> } } }).__AQ;
      const h = api.game().tanks[tankId].equipment.find((e) => e.defId.includes('heater'))!;
      api.mutate((s) => {
        const e = s.tanks[tankId].equipment.find((x) => x.id === h.id)!;
        e.failed = true;
        e.failMode = 'off';
        for (const k of Object.keys(s.inventory.foods)) s.inventory.foods[k] = 1;
      });
      return h.id;
    }, id);
    await aq(page, 'advance', 0.25);
    await tid(page, 'tank-card-toggle').click();
    await expect(tid(page, 'tank-card')).toBeVisible();
    const repair = tid(page, 'tank-card').locator('[data-testid^="tank-fix-"]', { hasText: 'Repair' }).first();
    await expect(repair).toBeVisible();
    await repair.click();
    await expect(tid(page, `tank-equip-repair-${heater}`)).toBeVisible();
    await tid(page, `tank-equip-repair-${heater}`).click();
    await waitForState(page, `!g.tanks['${id}'].equipment.find((e) => e.id === '${heater}').failed`);
    const food = tid(page, 'tank-card').locator('[data-testid^="tank-fix-"]', { hasText: 'Buy food' }).first();
    await expect(food).toBeVisible();
    await food.click();
    await expect(tid(page, 'panel-market')).toBeVisible();
    await expect(page.locator('[data-food-row].is-flash')).toBeVisible();
  });
});

test.describe('QOL-002: the bell (reviewer B2, B3)', () => {
  test('names gear wearing out, and its Feed link opens the food', async ({ page }) => {
    await start(page, 3000, 'betta');
    const id = await probe<string>(page, 'g.tankOrder[0]');
    type Api = { __AQ: { mutate(fn: (s: { tanks: Record<string, { equipment: { defId: string; condition: number }[] }>; creatures: Record<string, { tankId: string | null; stats: { hunger: number } }> }) => void): void } };
    // a starving betta (the sim names it on the next step), then a filter wearing out (read as it is, no step needed:
    // a step could also break it)
    await page.evaluate((tankId) => (window as unknown as Api).__AQ.mutate((s) => { for (const c of Object.values(s.creatures)) if (c.tankId === tankId) c.stats.hunger = 96; }), id);
    await aq(page, 'advance', 0.25);
    await page.evaluate((tankId) => (window as unknown as Api).__AQ.mutate((s) => void (s.tanks[tankId].equipment.find((e) => e.defId.includes('filter'))!.condition = 0.1)), id);
    await tid(page, 'hud-alerts').click();
    await expect(tid(page, 'alert-equipment-worn')).toContainText('Wearing out');
    const feed = tid(page, `alert-fix-${id}`);
    await expect(feed).toHaveText(/Feed/);
    await feed.click();
    await expect(page.locator('.ag-alerts-pop')).toBeHidden();
    await expect(page.locator('.ag-foodlist')).toBeVisible();
  });
});

test.describe('QOL-003 and QOL-004: search, filters and Find anything', () => {
  test('a search narrows Build’s decor and the Market', async ({ page }) => {
    await start(page);
    await openPanel(page, 'build');
    await tid(page, 'build-tab-decor').click();
    const all = await page.locator('[data-decor-id]').count();
    await tid(page, 'decor-search').fill('java');
    await expect(tid(page, 'decor-count')).toBeVisible();
    const some = await page.locator('[data-decor-id]').count();
    expect(some).toBeGreaterThan(0);
    expect(some).toBeLessThan(all);
    for (const name of await page.locator('[data-decor-id] .pn-decor__name').allTextContents()) expect(name.toLowerCase()).toContain('java');
    await aq(page, 'dev.addShopOffer', 'mystery_snail', { price: 12 });
    await openPanel(page, 'market');
    await tid(page, 'shop-search').fill('mystery snail');
    await expect(tid(page, 'shop-filter-count')).toHaveText(/^\d+ of \d+$/);
    const cards = page.locator('[data-testid^="shop-offer-"]');
    await expect(cards.first()).toContainText(/snail/i);
    await tid(page, 'shop-search').fill('zzzz');
    await expect(tid(page, 'shop-empty')).toBeVisible();
    await tid(page, 'shop-clear-filters').click();
    await expect(tid(page, 'shop-search')).toHaveValue('');
  });

  test('Find anything goes to a decor piece with Build searched for it', async ({ page }) => {
    await start(page);
    await page.keyboard.press('Control+k');
    await expect(tid(page, 'find-anything')).toBeVisible();
    await tid(page, 'find-input').fill('java fern');
    const hit = page.locator('[data-testid^="find-result-decor:"]').first();
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(tid(page, 'find-anything')).toBeHidden();
    await expect(tid(page, 'panel-build')).toBeVisible();
    await expect(tid(page, 'decor-search')).toHaveValue(/java fern/i);
    await expect(page.locator('[data-decor-id="java_fern"]')).toBeVisible();
  });

  test('Find anything keeps Tab inside, Enter on Close only closes, and focus goes back only on a dismiss (reviewer B7)', async ({ page }) => {
    await start(page);
    await tid(page, 'hud-find').focus();
    await page.keyboard.press('Enter');
    await expect(tid(page, 'find-input')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(tid(page, 'find-close')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(tid(page, 'find-input')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(tid(page, 'find-close')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tid(page, 'find-anything')).toBeHidden();
    expect((await ui(page)).panel).toBeNull();
    await expect(tid(page, 'hud-find')).toBeFocused();
    // a result: the destination keeps the focus it gives (the panel's title), it isn't pulled back to the opener
    await page.keyboard.press('Enter');
    await expect(tid(page, 'find-input')).toBeFocused();
    await page.keyboard.type('notifications');
    await page.keyboard.press('Enter');
    await expect(tid(page, 'panel-settings')).toBeVisible();
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="panel-settings"]'))).toBe(true);
    // and a panel (PanelHost) keeps its own title's focus
    await page.keyboard.press('Escape');
    await expect(tid(page, 'panel-settings')).toBeHidden();
    await tid(page, 'hud-find').focus();
    await page.keyboard.press('Enter');
    await expect(tid(page, 'find-input')).toBeFocused();
    await page.keyboard.type('market supplies');
    await page.keyboard.press('Enter');
    await expect(tid(page, 'panel-market')).toBeVisible();
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="panel-market"]'))).toBe(true);
  });

  test('Find anything on a piece no tank of yours can take says so, and opens Tanks on that water (reviewer B5)', async ({ page }) => {
    await start(page);
    await page.keyboard.press('Control+k');
    await tid(page, 'find-input').fill('coral');
    const hit = page.locator('[data-testid^="find-result-decor:"]', { hasText: 'Needs a reef tank' }).first();
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(tid(page, 'panel-build')).toBeVisible();
    await expect(tid(page, 'build-tab-tanks')).toHaveAttribute('aria-selected', 'true');
    await expect(tid(page, 'build-wc-reef')).toHaveClass(/ag-glow|is-on/);
  });

  test('Find anything opens a screen with the keyboard alone', async ({ page }) => {
    await start(page);
    await page.locator('canvas').first().click({ position: { x: 5, y: 5 }, force: true }).catch(() => {});
    await page.keyboard.press('/');
    await expect(tid(page, 'find-input')).toBeFocused();
    await page.keyboard.type('notifications');
    await page.keyboard.press('Enter');
    await expect(tid(page, 'panel-settings')).toBeVisible();
  });
});

test.describe('QOL-005: the decorating camera', () => {
  test('the view pad turns, tilts and jumps to Above, and the tool rail steps aside', async ({ page }) => {
    await start(page);
    await openPanel(page, 'build');
    await tid(page, 'build-tab-decor').click();
    await chooseDecor(page);
    await expect(tid(page, 'decor-cam-pad')).toBeVisible();
    await expect(page.locator('.ag-toolrail')).toBeHidden();
    await expect.poll(async () => (await aq<{ mode: string }>(page, 'camera')).mode).toBe('decorate');
    const cam = () => aq<{ want: { yaw: number; pitch: number; zoom: number } }>(page, 'camera');
    const p0 = (await cam()).want;
    await tid(page, 'decor-cam-turn-right').click();
    await tid(page, 'decor-cam-in').click();
    const p1 = (await cam()).want;
    expect(p1.yaw).toBeGreaterThan(p0.yaw);
    expect(p1.zoom).toBeLessThan(p0.zoom);
    await tid(page, 'decor-view-above').click();
    await expect.poll(async () => (await cam()).want.pitch).toBeGreaterThan(1.3);
    // the wheel zooms the camera (it used to turn the piece)
    const box = await page.locator('canvas').first().boundingBox();
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.5);
    const z0 = (await cam()).want.zoom;
    await page.mouse.wheel(0, 300);
    await expect.poll(async () => (await cam()).want.zoom).toBeGreaterThan(z0);
    await page.keyboard.press('Escape');
    await expect(tid(page, 'decor-cam-pad')).toBeHidden();
    await expect.poll(async () => (await aq<{ mode: string }>(page, 'camera')).mode).not.toBe('decorate');
  });
});

test.describe('QOL-005: the arrows after a piece is picked in Build (reviewer B6)', () => {
  test('turn the camera while focus is still on the decor card; a text box keeps them', async ({ page }) => {
    await start(page);
    await openPanel(page, 'build');
    await tid(page, 'build-tab-decor').click();
    const card = page.locator('[data-decor-id]:not([disabled]):not([aria-disabled])').first();
    await card.focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await ui(page)).tool).toBe('decor_place');
    await expect(card).toBeFocused();
    await expect.poll(async () => (await aq<{ mode: string }>(page, 'camera')).mode).toBe('decorate');
    const yaw = async () => (await aq<{ want: { yaw: number } }>(page, 'camera')).want.yaw;
    const y0 = await yaw();
    await page.keyboard.press('ArrowRight');
    await expect.poll(yaw).toBeGreaterThan(y0);
    await tid(page, 'decor-search').focus();
    const y1 = await yaw();
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(250);
    expect(await yaw()).toBe(y1);
  });
});

test.describe('QOL-005: the pad on a phone held sideways (reviewer B9)', () => {
  test.use({ viewport: { width: 667, height: 375 }, hasTouch: true, isMobile: true });
  test('is a column at the right, framed around on the right, its buttons full size', async ({ page }) => {
    await start(page);
    await aq(page, 'dev.setSpeed', 0);
    await page.evaluate(() => (window as unknown as { __AQ: { ui(): { set(p: Record<string, unknown>): void } } }).__AQ.ui().set({ panel: 'build', panelTarget: 'tab:decor' }));
    await expect(tid(page, 'panel-build')).toBeVisible();
    await chooseDecor(page, true);
    const pad = tid(page, 'decor-cam-pad');
    await expect(pad).toBeVisible();
    await expect(pad).toHaveAttribute('data-layout', 'column');
    await expect(pad).toHaveAttribute('data-occlude', 'right');
    const box = (await pad.boundingBox())!;
    expect(box.width).toBeLessThan(160);
    expect(box.x).toBeGreaterThan(667 / 2);
    for (const b of await page.locator('.ag-decorpad__btn').all()) expect((await b.boundingBox())!.width).toBeGreaterThanOrEqual(40);
  });
});

test.describe('QOL-005: the pad beside Build in a mid-size window (reviewer B10)', () => {
  test.use({ viewport: { width: 900, height: 700 } });
  test('lies as rows under the tank, left of the sheet, framed around from below', async ({ page }) => {
    await start(page);
    await openPanel(page, 'build');
    await tid(page, 'build-tab-decor').click();
    await chooseDecor(page);
    const pad = tid(page, 'decor-cam-pad');
    await expect(pad).toBeVisible();
    await expect(pad).toHaveAttribute('data-layout', 'band');
    await expect(pad).toHaveAttribute('data-occlude', 'bottom');
    const sheet = (await page.locator('.pn-sheet--side').first().boundingBox())!;
    await expect.poll(async () => { const b = (await pad.boundingBox())!; return b.x + b.width <= sheet.x + 1 && b.y > 700 / 2; }).toBe(true);
  });
});

test.describe('QOL-006: how to unlock', () => {
  test('a locked tank size explains its route with progress', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta', { unlockAll: false });
    await aq(page, 'act', 'tutorialSkip');
    await openPanel(page, 'build');
    const lock = page.locator('[data-testid^="tank-locked-"]').first();
    await lock.scrollIntoViewIfNeeded();
    await lock.click();
    await expect(tid(page, 'unlock-help-modal')).toBeVisible();
    await expect(tid(page, 'unlock-help-modal')).toContainText('How to unlock');
    await expect(tid(page, 'unlock-help-modal').locator('.pn-req').first()).toBeVisible();
  });
});

test.describe('QOL-008: the guide and the tour', () => {
  test('the spotlight follows the feed step from Feed to the food', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'dev.setSpeed', 0);
    await page.evaluate(() => (window as unknown as { __AQ: { mutate(fn: (s: { progress: { tutorial: { step: number } } }) => void): void } }).__AQ.mutate((s) => void (s.progress.tutorial.step = 2)));
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'feed');
    const ring = tid(page, 'guide-spotlight-ring');
    await expect(ring).toBeVisible();
    const near = async (sel: string) => {
      const a = await ring.boundingBox();
      const b = await page.locator(sel).first().boundingBox();
      return !!a && !!b && Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) < 30 && Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)) < 30;
    };
    await expect.poll(() => near('[data-tutorial-id="tool-feed"]')).toBe(true);
    await tid(page, 'tool-feed').click();
    await expect.poll(() => near('.ag-foodlist .ag-food')).toBe(true);
  });

  test('the tour runs from Settings to the end and leaves the tank view as it was', async ({ page }) => {
    await start(page);
    await openPanel(page, 'settings');
    await page.locator('[data-testid^="settings-tab-"]').filter({ hasText: /Play/ }).first().click();
    await tid(page, 'settings-tour').click();
    await expect(tid(page, 'tour-card')).toBeVisible();
    await expect(tid(page, 'tour-card')).toHaveAttribute('data-stop', 'welcome');
    const seen: string[] = [];
    for (let i = 0; i < 30 && (await tid(page, 'tour-card').count()); i++) {
      const stop = (await tid(page, 'tour-card').getAttribute('data-stop')) ?? '';
      seen.push(stop);
      if (stop === 'market') await expect(tid(page, 'panel-market')).toBeVisible();
      await tid(page, 'tour-next').click();
    }
    await expect(tid(page, 'tour-card')).toBeHidden();
    expect(seen[0]).toBe('welcome');
    expect(seen.at(-1)).toBe('done');
    for (const id of ['market', 'build', 'research', 'settings']) expect(seen).toContain(id);
    expect((await ui(page)).panel).toBeNull();
  });
});
