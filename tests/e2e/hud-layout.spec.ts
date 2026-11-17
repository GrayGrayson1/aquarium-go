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

/**
 * Audit B1: a bell with many rows (nine stocked tanks, an empty cupboard, every tank's gear wearing out). The drawer's
 * body scrolls, the danger rows lead, and once scrolled to its end "Full event log" is on screen and takes the tap.
 */
async function crowdedBell(page: Page, touch = false) {
  await plainGame(page);
  await aq(page, 'dev.fillTestFacility', 8);
  type Api = { __AQ: { mutate(fn: (s: { tankOrder: string[]; inventory: { foods: Record<string, number> }; tanks: Record<string, { equipment: { condition?: number; failed?: boolean }[] }> }) => void): void } };
  await page.evaluate(() => (window as unknown as Api).__AQ.mutate((s) => void (s.inventory.foods = {})));
  await aq(page, 'advance', 0.25);
  await aq(page, 'dev.setSpeed', 0);
  await page.evaluate(() =>
    (window as unknown as Api).__AQ.mutate((s) => {
      for (const id of s.tankOrder) for (const e of s.tanks[id].equipment) if (!e.failed) e.condition = 0.1;
    }),
  );
  const bell = tid(page, 'hud-alerts');
  if (touch) await bell.tap();
  else await bell.click();
  await expect(page.locator('.ag-alerts-pop')).toBeVisible();
  const before = await page.evaluate(() => {
    const body = document.querySelector('[data-testid="alerts-body"]') as HTMLElement | null;
    const rows = [...document.querySelectorAll('.ag-alert-list .ag-alert-row')];
    return {
      scrolls: !!body && getComputedStyle(body).overflowY === 'auto' && body.scrollHeight > body.clientHeight + 40,
      first: rows[0]?.className ?? '',
      dangerAfterWatch: rows.some((r, i) => r.classList.contains('is-danger') && rows.slice(0, i).some((x) => x.classList.contains('is-watch'))),
    };
  });
  expect(before.scrolls).toBe(true);
  expect(before.first).toContain('is-danger');
  expect(before.dangerAfterWatch).toBe(false);
  await page.evaluate(() => {
    const body = document.querySelector('[data-testid="alerts-body"]') as HTMLElement;
    body.scrollTop = body.scrollHeight;
  });
  await page.waitForTimeout(200);
  const reach = await page.evaluate(() => {
    const pop = document.querySelector('.ag-alerts-pop')!.getBoundingClientRect();
    const b = document.querySelector('[data-testid="alerts-open-log"]')!.getBoundingClientRect();
    const x = b.left + b.width / 2;
    const y = b.top + b.height / 2;
    if (y > pop.bottom || y < pop.top || y > innerHeight) return 'off screen';
    return document.querySelector('[data-testid="alerts-open-log"]')!.contains(document.elementFromPoint(x, y)) ? 'reachable' : 'covered';
  });
  expect(reach).toBe('reachable');
  const log = tid(page, 'alerts-open-log');
  if (touch) await log.tap();
  else await log.click();
  await expect.poll(() => panel(page)).toBe('log');
}

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

  test('audit B1: a bell with many rows scrolls, leads with danger and reaches Full event log', async ({ page }) => {
    await crowdedBell(page);
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

  test('audit B1: a bell with many rows scrolls, leads with danger and reaches Full event log', async ({ page }) => {
    await crowdedBell(page, true);
  });

  test('audit B9: the clock pill shows the day over the time, and the top bar still fits with a five-digit balance', async ({ page }) => {
    await plainGame(page);
    await aq(page, 'dev.addMoney', 54_000);
    await expect(tid(page, 'hud-day')).toHaveText(/^Day \d+$/);
    await expect(tid(page, 'hud-clock')).toHaveText(/\d{1,2}:\d\d/);
    const b = await page.evaluate(() => {
      const r = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
      const clock = r('.ag-topbar .ag-clock-pill');
      const speed = r('.ag-topbar .ag-speed');
      return { clock: clock.right, clockH: clock.height, speedL: speed.left, speedR: speed.right, money: r('[data-testid="hud-money"]').left, bell: r('[data-testid="hud-alerts"]').right };
    });
    expect(b.clock).toBeLessThanOrEqual(b.speedL);
    expect(b.speedR).toBeLessThanOrEqual(b.money);
    expect(b.bell).toBeLessThanOrEqual(390);
    expect(b.clockH).toBeLessThanOrEqual(48);
  });

  test('audit B12: in the room view the guide card leaves Reset view on screen, just above it', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await expect(tid(page, 'tutorial-card')).toBeVisible();
    await aq(page, 'setUI', { view: 'facility' });
    const reset = tid(page, 'camera-room-reset');
    await expect(reset).toBeVisible();
    await expect(page.locator('.ag-hud__coach .ag-coach')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const chip = document.querySelector('[data-testid="camera-room-reset"]')!.getBoundingClientRect();
          const coach = document.querySelector('.ag-hud__coach .ag-coach')!.getBoundingClientRect();
          return chip.bottom <= coach.top + 1 && chip.top > 0;
        }),
      )
      .toBe(true);
    await reset.tap();
  });

  test('audit B19: over an open sheet a toast’s text only pins it; its button goes there', async ({ page }) => {
    await plainGame(page);
    await aq(page, 'setUI', { panel: 'market' });
    await page.waitForTimeout(1200);
    type Api = { __AQ: { game(): { tankOrder: string[] }; ui(): { toast(t: string, k: string, parts?: { tankId?: string }): void } } };
    await page.evaluate(() => {
      const A = (window as unknown as Api).__AQ;
      A.ui().toast('Ember is settling into the Starter tank', 'success', { tankId: A.game().tankOrder[0] });
    });
    const toast = tid(page, 'toast').filter({ hasText: 'Ember is settling' });
    await expect(toast).toBeVisible();
    await toast.locator('.ag-toast__text').tap();
    await expect(toast).toHaveClass(/is-expanded/);
    expect(await panel(page)).toBe('market');
    await toast.getByTestId('toast-action').tap();
    await expect.poll(() => panel(page)).toBeNull();
  });

  test('audit B15: the pause segment puts “Paused” in the clock pill; 1× brings the day back', async ({ page }) => {
    await plainGame(page);
    await tid(page, 'hud-speed-0').tap();
    await expect(tid(page, 'hud-day')).toHaveText('Paused');
    await expect(tid(page, 'hud-day')).toBeVisible();
    await tid(page, 'hud-speed-1').tap();
    await expect(tid(page, 'hud-day')).toHaveText(/^Day \d+$/);
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

  test('audit B1: a bell with many rows scrolls, leads with danger and reaches Full event log', async ({ page }) => {
    await crowdedBell(page, true);
  });
});

test.describe('phone held sideways 932×430 (touch)', () => {
  test.use({ viewport: { width: 932, height: 430 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test('with Livestock open, one toast sits in its header row, off the list', async ({ page }) => {
    expect(await sidewaysToasts(page, 'livestock')).toBe('in the header');
  });
});
