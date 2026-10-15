/**
 * lane:ui-shell (chunk 6; B-196, ADR-0029 decision 10) — "Move tank" on the tank card opens the existing placement
 * ghost on that tank in the room view: a mouse click on a free spot moves it there (nothing is bought); a phone previews
 * with a tap and confirms with "Move here"; Escape (or Cancel) leaves it where it was.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid, probe, collectErrors } from './helpers';

type Spot = { x: number; z: number; rotY: number } | undefined;
const placement = (page: Page) => probe<Spot>(page, 'g.tanks[g.tankOrder[0]].placement');
const SPOTS: [number, number][] = [[0.3, 0.72], [0.7, 0.72], [0.25, 0.62], [0.75, 0.62], [0.5, 0.8], [0.4, 0.66]];

async function openMove(page: Page): Promise<void> {
  await tid(page, 'tank-card-toggle').click();
  await expect(tid(page, 'tank-move')).toHaveText('Move tank');
  await tid(page, 'tank-move').click();
  await expect(tid(page, 'tank-card')).toBeHidden();
  await expect(page.locator('.ag-toolhint')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __AQ: { ui(): { view: string; tool: string; movingTankId: string | null } } }).__AQ.ui())).toMatchObject({ view: 'facility', tool: 'tank_place' });
}

test.describe('Move tank (desktop)', () => {
  test('moves the tank to the clicked spot, for free; Escape cancels', async ({ page }) => {
    const errors = collectErrors(page);
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'act', 'tutorialSkip');
    const before = await placement(page);
    const money = await probe<number>(page, 'g.finance.money');
    const tanks = await probe<number>(page, 'g.tankOrder.length');

    // Escape leaves it where it was
    await openMove(page);
    await expect(page.locator('.ag-toolhint')).toContainText('move the tank there');
    await page.keyboard.press('Escape');
    await expect(page.locator('.ag-toolhint')).toHaveCount(0);
    expect(await placement(page)).toEqual(before);

    await openMove(page);
    await page.waitForTimeout(800); // the room view's camera settles
    const box = (await page.locator('canvas').first().boundingBox())!;
    for (const [fx, fy] of SPOTS) {
      const now = await placement(page);
      if (now && before && (now.x !== before.x || now.z !== before.z)) break;
      await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(250);
      await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(500);
    }
    const after = await placement(page);
    expect(after && before && (after.x !== before.x || after.z !== before.z)).toBe(true);
    await expect(page.locator('[data-testid="toast"]').filter({ hasText: 'moved.' }).first()).toBeVisible();
    expect(await probe<number>(page, 'g.finance.money')).toBe(money);
    expect(await probe<number>(page, 'g.tankOrder.length')).toBe(tanks);
    // the tool is done, and a later purchase can never turn into a move
    expect(await page.evaluate(() => (window as unknown as { __AQ: { ui(): { tool: string; movingTankId: string | null } } }).__AQ.ui())).toMatchObject({ tool: 'none', movingTankId: null });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Move tank (phone, touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('a tap previews the spot and Move here moves the tank', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'act', 'tutorialSkip');
    const before = await placement(page);
    await openMove(page);
    await page.waitForTimeout(800);
    const box = (await page.locator('canvas').first().boundingBox())!;
    const confirm = tid(page, 'placement-confirm');
    for (const [fx, fy] of SPOTS) {
      await page.touchscreen.tap(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(400);
      if ((await confirm.isVisible()) && (await confirm.isEnabled())) break;
    }
    await expect(confirm).toHaveText('Move here');
    await confirm.tap();
    await expect.poll(async () => {
      const p = await placement(page);
      return !!p && !!before && (p.x !== before.x || p.z !== before.z);
    }).toBe(true);
  });
});
