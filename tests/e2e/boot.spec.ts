import { test, expect } from '@playwright/test';
import { openApp, collectErrors, tid, expectCanvasNotBlank, quickGame, aq } from './helpers';

test.describe('boot', () => {
  test('first launch: title is visible and the canvas is not blank', async ({ page }) => {
    const errors = collectErrors(page);
    await openApp(page);
    await expect(tid(page, 'title-new-game')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Aquarium\s*Go/i }).first()).toBeVisible();
    // Continue only appears when a save exists (fresh browser profile → none).
    await expect(tid(page, 'title-continue')).toHaveCount(0);
    await page.waitForTimeout(2500);
    await expectCanvasNotBlank(page);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('no console-error storm during a busy session', async ({ page }) => {
    const errors = collectErrors(page);
    await openApp(page);
    await quickGame(page, 'betta', { money: 5000 });
    await aq(page, 'dev.setSpeed', 10);
    // Visit every dock panel that exists.
    for (const panel of ['tanks', 'livestock', 'market', 'visitors', 'build', 'research', 'finances', 'encyclopedia', 'settings']) {
      const btn = tid(page, `dock-${panel}`);
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(350);
      }
    }
    await page.keyboard.press('Escape');
    const toggle = tid(page, 'view-toggle');
    if (await toggle.count()) {
      await toggle.click({ noWaitAfter: true });
      await page.waitForTimeout(800);
      await toggle.click({ noWaitAfter: true });
    }
    await page.waitForTimeout(6000);
    await aq(page, 'advance', 48);
    await page.waitForTimeout(1000);
    const stats = await aq<{ errors: number }>(page, 'stats');
    expect(stats.errors, 'simulation tick errors').toBe(0);
    expect(errors.length, errors.slice(0, 10).join('\n')).toBeLessThanOrEqual(3);
  });
});
