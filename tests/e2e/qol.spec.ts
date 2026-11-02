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
    await expect(tid(page, 'panel-build')).toBeVisible({ timeout: 5000 });
    await expect(tid(page, 'build-tab-decor')).toHaveAttribute('aria-selected', 'true');
    expect((await ui(page)).aside).toBeNull();
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
