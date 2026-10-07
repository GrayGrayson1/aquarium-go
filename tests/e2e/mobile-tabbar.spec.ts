/**
 * lane:ui-shell (chunk 1; 0.5 spec §5.2, §5.3, §5.5, §18, §20.2; NAV-002 to NAV-005, ACC-001, ACC-002) — the phone tab
 * bar and More sheet by touch: five tabs instead of the dock, More and its tiles, the More tab's highlight, the
 * guide's way to Research, locked tiles, touch targets; and a phone held sideways (B-129).
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid } from './helpers';

const hash = (page: Page) => page.evaluate(() => location.hash);
const box = async (page: Page, id: string) => (await tid(page, id).boundingBox())!;

async function phoneGame(page: Page, opts: { unlockAll?: boolean } = {}) {
  await openApp(page);
  await quickGame(page, 'betta', opts);
  await aq(page, 'act', 'tutorialSkip');
  await page.waitForTimeout(400);
}

test.describe('phone 390×844 (touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('five tabs replace the dock; tapping one opens it, tapping it again closes it', async ({ page }) => {
    await phoneGame(page);
    const bar = tid(page, 'nav-tabbar');
    await expect(bar).toBeVisible();
    await expect(page.locator('.ag-dock')).toHaveCount(0);
    expect(await bar.evaluate((el) => el.tagName.toLowerCase())).toBe('nav');
    await expect(bar).toHaveAttribute('aria-label', 'Main');
    await expect(bar.locator('button')).toHaveText(['Tanks', 'Livestock', 'Market', 'Build', 'More']);
    expect(await bar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const widths = await bar.locator('button').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
    for (const w of widths) expect(w).toBeGreaterThanOrEqual(44);
    await expect(bar.locator('[aria-current="page"]')).toHaveCount(0);

    await tid(page, 'dock-market').tap();
    await expect(tid(page, 'panel-market')).toBeVisible();
    await expect.poll(() => hash(page)).toBe('#/shop');
    await expect(bar.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(tid(page, 'dock-market')).toHaveAttribute('aria-current', 'page');
    await tid(page, 'dock-market').tap();
    await expect(tid(page, 'panel-market')).toBeHidden();
    await expect.poll(() => hash(page)).toBe('#/');
  });

  test('More opens its sheet at about 48% height; a tile opens its panel and More stays highlighted', async ({ page }) => {
    await phoneGame(page);
    await tid(page, 'dock-more').tap();
    const sheet = tid(page, 'more-sheet');
    await expect(sheet).toBeVisible();
    await expect.poll(() => hash(page)).toBe('#/more');
    await page.waitForTimeout(500); // the sheet's spring
    const top = (await sheet.boundingBox())!.y;
    expect(top / 844).toBeGreaterThan(0.45);
    expect(top / 844).toBeLessThan(0.51);
    for (const id of ['more-visitors', 'more-shows', 'more-research', 'more-finances', 'more-encyclopedia', 'more-settings']) await expect(tid(page, id)).toBeVisible();
    await expect(sheet).toContainText('Saves, sound, notifications');
    for (const id of ['more-research', 'more-settings']) {
      const b = await box(page, id);
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    const close = (await sheet.getByRole('button', { name: 'Close More' }).boundingBox())!;
    expect(close.width).toBeGreaterThanOrEqual(44);
    expect(close.height).toBeGreaterThanOrEqual(44);

    await tid(page, 'more-research').tap();
    await expect(sheet).toBeHidden();
    await expect(tid(page, 'panel-research')).toBeVisible();
    await expect.poll(() => hash(page)).toBe('#/research');
    await expect(tid(page, 'dock-more')).toHaveAttribute('aria-current', 'page');
    // Back returns to More
    await page.goBack();
    await expect(tid(page, 'more-sheet')).toBeVisible();
  });

  test('Tab and Shift+Tab stay inside the More sheet, and Escape closes it', async ({ page }) => {
    await phoneGame(page);
    await tid(page, 'dock-more').tap();
    await expect(tid(page, 'more-sheet')).toBeVisible();
    await page.waitForTimeout(300);
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(i % 3 === 2 ? 'Shift+Tab' : 'Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="more-sheet"]'))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(tid(page, 'more-sheet')).toBeHidden();
    await expect.poll(() => hash(page)).toBe('#/');
  });

  test('locked tiles carry a lock badge and open their locked panel (§5.7)', async ({ page }) => {
    await phoneGame(page, { unlockAll: false });
    await tid(page, 'dock-more').tap();
    await expect(tid(page, 'more-visitors').locator('.ag-more__lock')).toHaveCount(1);
    await expect(tid(page, 'more-research').locator('.ag-more__lock')).toHaveCount(0);
    await tid(page, 'more-visitors').tap();
    await expect(tid(page, 'locked-visitors')).toBeVisible();
  });

  test('the guide’s Research step rings More, then the Research tile; opening Research completes it (§5.5)', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta', { unlockAll: false });
    // jump the guide to its last step, "The road ahead" (hint target dock-research)
    for (let i = 0; i < 40; i++) {
      const step = await page.evaluate(() => document.querySelector('[data-testid="tutorial-card"]')?.getAttribute('data-step'));
      if (step === 'preview') break;
      await page.evaluate(() => (window as unknown as { __AQ: { mutate(f: (d: { progress: { tutorial: { step: number } } }) => void): void } }).__AQ.mutate((d) => void (d.progress.tutorial.step += 1)));
      await page.waitForTimeout(150);
    }
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'preview');
    const bubble = tid(page, 'guide-more-bubble');
    await expect(bubble).toContainText('Guide · Research');
    await expect(bubble).toContainText('Research now lives under More. Tap More, then Research.');
    const ringAround = async (id: string) => {
      const ring = page.locator('.ag-tut-ring');
      await expect(ring).toHaveCount(1);
      await expect(ring).toHaveClass(/ag-tut-ring--gold/);
      const r = (await ring.boundingBox())!;
      const t = await box(page, id);
      return r.x <= t.x + 1 && r.y <= t.y + 1 && r.x + r.width >= t.x + t.width - 1 && r.y + r.height >= t.y + t.height - 1;
    };
    await expect.poll(() => ringAround('dock-more')).toBe(true);
    await tid(page, 'dock-more').tap();
    await expect(tid(page, 'more-sheet')).toBeVisible();
    await page.waitForTimeout(500);
    await expect.poll(() => ringAround('more-research')).toBe(true);
    await tid(page, 'more-research').tap();
    await expect(tid(page, 'panel-research')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __AQ: { summary(): { tutorial: { done: boolean } } } }).__AQ.summary().tutorial.done))
      .toBe(true);
  });
});

test.describe('phone held sideways 844×390 (touch)', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('the tab bar replaces the dock and More opens its tiles in one row', async ({ page }) => {
    await phoneGame(page);
    await expect(tid(page, 'nav-tabbar')).toBeVisible();
    await expect(page.locator('.ag-dock')).toHaveCount(0);
    await tid(page, 'dock-more').tap();
    await expect(tid(page, 'more-sheet')).toBeVisible();
    await page.waitForTimeout(500);
    const ys = await Promise.all(['more-visitors', 'more-encyclopedia'].map(async (id) => Math.round((await box(page, id)).y)));
    expect(ys[0]).toBe(ys[1]);
    // the Settings row sits clear of the tab bar
    const bar = await box(page, 'nav-tabbar');
    const settings = await box(page, 'more-settings');
    expect(settings.y + settings.height).toBeLessThanOrEqual(bar.y + 1);
  });
});
