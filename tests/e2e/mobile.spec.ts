import { test, expect } from '@playwright/test';
import { openApp, onboardViaUI, tid, clickTank, collectErrors, expectCanvasNotBlank, probe } from './helpers';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

test.describe('mobile 390×844 with touch', () => {
  test('title fits, onboarding works by touch, tapping the tank is handled', async ({ page }) => {
    const errors = collectErrors(page);
    await openApp(page);
    await expect(tid(page, 'title-new-game')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'horizontal page scroll on mobile').toBeLessThanOrEqual(1);

    // Onboarding entirely with taps.
    await onboardViaUI(page, 'pea_puffer', 'Tiny', true);
    const money = await tid(page, 'hud-money').boundingBox();
    expect(money).not.toBeNull();
    expect(money!.x).toBeGreaterThanOrEqual(0);
    expect(money!.x + money!.width).toBeLessThanOrEqual(390);

    const tapBefore = await probe<number>(page, 'g.tanks[g.tankOrder[0]].tapPressure');
    for (let i = 0; i < 3; i++) {
      await clickTank(page, true);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
    await expectCanvasNotBlank(page);
    const hourA = await probe<number>(page, 'g.clock.hour');
    await page.waitForTimeout(1200);
    expect(await probe<number>(page, 'g.clock.hour')).toBeGreaterThan(hourA);
    expect(typeof tapBefore).toBe('number');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
