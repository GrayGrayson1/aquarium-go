/**
 * Regression: switching into and out of photo mode or the close-up camera at High quality used to freeze the canvas
 * on its last frame (depth of field coming/going inside a live multisampled composer broke its depth attachment, and
 * every later blit failed). The canvas must keep changing through every toggle. OWNER: lane "waterfx".
 */
import { createHash } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, collectErrors, waitForWarmup } from './helpers';

type AQ = {
  setUI(patch: Record<string, unknown>): void;
  settings(): { update(patch: Record<string, unknown>): void };
  state(): { creatures: Record<string, { tankId?: string | null }> };
};

const setUI = (page: Page, patch: Record<string, unknown>) =>
  page.evaluate((p) => (window as unknown as { __AQ: AQ }).__AQ.setUI(p), patch);

async function canvasHash(page: Page): Promise<string> {
  await waitForWarmup(page); // lane:perf — never hash the static shader warm-up veil
  const buf = await page.locator('canvas').first().screenshot({ timeout: 30_000 });
  return createHash('md5').update(buf).digest('hex');
}

/** Water, light and the fish are always animated: two captures a moment apart must differ. */
async function expectLive(page: Page, label: string): Promise<void> {
  const a = await canvasHash(page);
  await page.waitForTimeout(800);
  const b = await canvasHash(page);
  expect(a, `canvas stopped updating after: ${label}`).not.toBe(b);
}

test.describe('camera modes keep rendering', () => {
  test('photo mode and close-up toggles never freeze the canvas (High quality)', async ({ page }) => {
    const glErrors: string[] = [];
    page.on('console', (m) => {
      if (/glBlitFramebuffer|GL_INVALID_OPERATION/i.test(m.text())) glErrors.push(m.text());
    });
    const errors = collectErrors(page);
    await openApp(page);
    await quickGame(page, 'betta');
    await page.evaluate(() => (window as unknown as { __AQ: AQ }).__AQ.settings().update({ quality: 'high' }));
    await setUI(page, { hudHidden: true, cameraMode: 'front' });
    await page.waitForTimeout(1500);
    const cid = await page.evaluate(() => Object.keys((window as unknown as { __AQ: AQ }).__AQ.state().creatures)[0]);
    expect(cid, 'starter creature').toBeTruthy();

    const steps: Record<string, unknown>[] = [
      { cameraMode: 'close', followCreatureId: cid },
      { cameraMode: 'front', followCreatureId: null },
      { photoMode: true },
      { photoMode: false },
      { cameraMode: 'close', followCreatureId: cid },
      { photoMode: true },
      { photoMode: false, cameraMode: 'follow', followCreatureId: cid },
      { cameraMode: 'front', followCreatureId: null },
    ];
    await expectLive(page, 'start');
    for (const s of steps) {
      await setUI(page, s);
      await page.waitForTimeout(1600);
      await expectLive(page, JSON.stringify(s));
    }
    expect(glErrors, glErrors.join('\n')).toEqual([]);
    const uncaught = errors.filter((e) => e.startsWith('[pageerror]'));
    expect(uncaught, uncaught.join('\n')).toEqual([]);
  });
});
