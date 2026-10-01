/**
 * HUD layout and input checks in a real browser (round-3 UI-A, R07-08): the regressions source-text CSS tests could
 * not see — the alerts popover under a card or panel (R07-01), the phone money delta under the tank bar (HUD-2),
 * toasts over a sideways phone's sheet header (R07-04) and the calm HUD eating clicks and taps (R11-01, R07-02).
 * Final playtest: a sideways phone's open list stays clear of toasts (one, in the sheet's header row beside its close
 * button), and Escape closing a clicked-open panel no longer keeps a mouse player's HUD from calming.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid } from './helpers';

/** New betta game without the guide (its highlight ring keeps the HUD from calming). */
async function plainGame(page: Page) {
  await openApp(page);
  await quickGame(page, 'betta');
  await aq(page, 'act', 'tutorialSkip');
  await page.waitForTimeout(600);
}

/** Share of a 5×3 grid of points over the alerts popover that hit the popover itself. */
async function popoverHits(page: Page): Promise<number> {
  return page.evaluate(() => {
    const pop = document.querySelector('.ag-alerts-pop');
    if (!pop) return 0;
    const b = pop.getBoundingClientRect();
    let n = 0;
    for (const fx of [0.1, 0.3, 0.5, 0.7, 0.9]) for (const fy of [0.2, 0.5, 0.8]) if (pop.contains(document.elementFromPoint(b.left + b.width * fx, b.top + b.height * fy))) n++;
    return n / 15;
  });
}

async function waitCalm(page: Page) {
  await page.waitForFunction(() => !!document.querySelector('.ag-hud.is-calm'), null, { timeout: 20_000 });
}

const panel = (page: Page) => page.evaluate(() => (window as unknown as { __AQ: { ui(): { panel: string | null } } }).__AQ.ui().panel);

test.describe('desktop 1440×900', () => {
  test('the alerts popover opens above the creature card and above a panel', async ({ page }) => {
    await plainGame(page);
    const starter = await page.evaluate(() => Object.values((window as unknown as { __AQ: { state(): { creatures: Record<string, { id: string; isStarter?: boolean }> } } }).__AQ.state().creatures).find((c) => c.isStarter)!.id);
    await aq(page, 'setUI', { selectedCreatureId: starter });
    await page.waitForTimeout(900);
    await tid(page, 'hud-alerts').click();
    await page.waitForTimeout(600);
    expect(await popoverHits(page)).toBe(1);
    await page.keyboard.press('Escape');
    await aq(page, 'setUI', { selectedCreatureId: null, panel: 'market' });
    await page.waitForTimeout(1200);
    await tid(page, 'hud-alerts').click();
    await page.waitForTimeout(600);
    expect(await popoverHits(page)).toBe(1);
  });

  test('a calm HUD still takes the click of a mouse resting on a control', async ({ page }) => {
    await plainGame(page);
    const b = (await tid(page, 'dock-build').boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await waitCalm(page);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(500);
    expect(await panel(page)).toBe('build');
  });

  test('closing a clicked-open panel with Escape still lets the HUD calm', async ({ page }) => {
    await plainGame(page);
    await tid(page, 'dock-build').click();
    await page.waitForTimeout(800);
    expect(await panel(page)).toBe('build');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    expect(await panel(page)).toBeNull();
    await page.mouse.move(700, 450, { steps: 3 });
    await waitCalm(page);
  });
});

test.describe('phone 390×844 (touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('the money delta is drawn over the tank bar', async ({ page }) => {
    await plainGame(page);
    // (the delta never takes taps; let it answer a hit test so the test can see whether it is drawn on top)
    await page.addStyleTag({ content: '.ag-money-delta { pointer-events: auto !important; }' });
    await aq(page, 'dev.addMoney', 25);
    const hit = await page.waitForFunction(() => {
      const d = document.querySelector('.ag-money-delta');
      if (!d) return null;
      const b = d.getBoundingClientRect();
      return d.contains(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)) ? 'delta' : 'covered';
    });
    expect(await hit.jsonValue()).toBe('delta');
  });

  test('a calm HUD: the first tap on the hidden dock only wakes it, the quick retry lands, the drawn bell acts at once', async ({ page }) => {
    await plainGame(page);
    const m = (await tid(page, 'dock-market').boundingBox())!;
    await waitCalm(page);
    await page.touchscreen.tap(m.x + m.width / 2, m.y + m.height / 2);
    await page.waitForTimeout(350);
    expect(await panel(page)).toBeNull();
    await page.touchscreen.tap(m.x + m.width / 2, m.y + m.height / 2);
    await page.waitForTimeout(700);
    expect(await panel(page)).toBe('market');
    await aq(page, 'setUI', { panel: null });
    const bell = (await tid(page, 'hud-alerts').boundingBox())!;
    await waitCalm(page);
    await page.touchscreen.tap(bell.x + bell.width / 2, bell.y + bell.height / 2);
    await page.waitForTimeout(600);
    await expect(page.locator('.ag-alerts-pop')).toHaveCount(1);
  });
});

/** A sideways phone with a panel open: toasts stay off its list, tabs and buttons (one, in its header row). */
async function sidewaysToasts(page: Page, id: string) {
  await plainGame(page);
  await aq(page, 'setUI', { panel: id });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const u = (window as unknown as { __AQ: { ui(): { toast(t: string, k: string): void } } }).__AQ.ui();
    u.toast('Kofi dropped by and left a generous twelve dollar tip', 'info');
    u.toast('Water is getting warm in the Starter tank', 'warning');
  });
  await page.waitForTimeout(1000);
  return page.evaluate(() => {
    const head = document.querySelector('.pn-head');
    const body = document.querySelector('.pn-body')?.getBoundingClientRect();
    if (!head || !body) return 'no panel';
    const toasts = [...document.querySelectorAll('[data-testid="toast"]')].map((t) => t.getBoundingClientRect());
    if (toasts.length !== 1) return `${toasts.length} toasts`;
    const t = toasts[0];
    const hit = (b: DOMRect) => t.left < b.right && t.right > b.left && t.top < b.bottom && t.bottom > b.top;
    if (hit(body)) return 'over the list';
    if ([...head.querySelectorAll('button, [role="tab"], input, select')].some((c) => hit(c.getBoundingClientRect()))) return 'over a header control';
    return t.top < head.getBoundingClientRect().bottom ? 'in the header' : 'elsewhere';
  });
}

test.describe('phone held sideways 844×390 (touch)', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('with a panel open, one toast sits in its header row, off the list, tabs and buttons', async ({ page }) => {
    expect(await sidewaysToasts(page, 'market')).toBe('in the header');
    await aq(page, 'setUI', { panel: 'livestock' });
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const t = document.querySelector('[data-testid="toast"]')?.getBoundingClientRect();
      const body = document.querySelector('.pn-body')?.getBoundingClientRect();
      return !t || !body ? 'none' : t.bottom <= body.top ? 'clear' : 'over the list';
    });
    expect(['none', 'clear']).toContain(r);
  });
});

test.describe('phone held sideways 932×430 (touch)', () => {
  test.use({ viewport: { width: 932, height: 430 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test('with Livestock open, one toast sits in its header row, off the list', async ({ page }) => {
    expect(await sidewaysToasts(page, 'livestock')).toBe('in the header');
  });
});
