/**
 * Layout contracts of the in-game UI: sheets declare what they cover (`data-occlude`, read by the camera framing),
 * panels stay narrow enough for the tank to remain the hero, toasts never sit on a right-hand panel and bursts
 * merge. OWNER: polish-ux (lane "ui-shell").
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, tid, collectErrors } from './helpers';

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

/** Push sim-style log events flagged for toasting. */
async function pushEvents(page: Page, events: { kind: string; text: string }[]) {
  await page.evaluate((evs) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__AQ.mutate((d: any) => {
      for (const e of evs) d.log.push({ id: `e2e-${Math.random().toString(36).slice(2)}`, hour: d.clock.hour, kind: e.kind, text: e.text, toast: true });
    });
  }, events);
}

const ACHIEVEMENTS = [
  { kind: 'celebrate', text: 'Achievement: First Meal — Feed your starter for the first time.' },
  { kind: 'celebrate', text: 'Achievement: Green Thumb — Keep 5 live plants.' },
  { kind: 'celebrate', text: 'Achievement: Night Owl — Watch the tank at night.' },
];

test.describe('UI layout contracts (desktop)', () => {
  test('panels are ≤600px, declare occlusion, and toasts stay clear of them', async ({ page }) => {
    const errors = collectErrors(page);
    await openApp(page);
    await quickGame(page, 'betta');
    await tid(page, 'dock-market').click();
    const panel = tid(page, 'panel-market');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-occlude', 'right');
    await page.waitForTimeout(600);
    const pb = (await panel.boundingBox())!;
    expect(pb.width).toBeLessThanOrEqual(601);

    await pushEvents(page, [
      ...ACHIEVEMENTS,
      { kind: 'danger', text: 'Ammonia is spiking in the test tank — change some water.' },
      { kind: 'unlock', text: 'Unlocked: 40 gal breeder' },
      { kind: 'market', text: 'New arrivals at the shop: neon tetras, nerite snails.' },
    ]);
    await page.waitForTimeout(700);
    const toasts = tid(page, 'toast');
    const n = await toasts.count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(3);
    for (let i = 0; i < n; i++) {
      const b = (await toasts.nth(i).boundingBox())!;
      expect(overlaps(b, pb), `toast ${i} overlaps the market panel`).toBe(false);
    }
    // the three achievements arrived together and became one toast
    await expect(toasts.filter({ hasText: /3 new achievements/i })).toHaveCount(1);
    // danger always wins a slot
    await expect(toasts.filter({ hasText: /Ammonia is spiking/ })).toHaveCount(1);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('creature card and tank card declare which side they cover', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'axolotl');
    const starter = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).__AQ.state();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (Object.values(g.creatures) as any[]).find((c) => c.isStarter).id as string;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate((id) => (window as any).__AQ.setUI({ selectedCreatureId: id }), starter);
    await expect(tid(page, 'creature-card')).toHaveAttribute('data-occlude', 'right');
    await page.keyboard.press('Escape');
    await tid(page, 'tank-card-toggle').click();
    await expect(tid(page, 'tank-card')).toHaveAttribute('data-occlude', 'left');
  });
});

test.describe('UI layout contracts (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // lane:ui-shell (chunk 1, NAV-017; 0.5 spec §20.3) — renamed and updated on purpose: phones swap the scrolling dock
  // for the five-tab bar (§5.2) and open panels at full height under the top bar (§5.6). The occlusion and toast
  // assertions are kept.
  test('bottom sheets open full height under the top bar, the five-tab bar fits, at most two toasts', async ({ page }) => {
    const errors = collectErrors(page);
    await openApp(page);
    await quickGame(page, 'pea_puffer');
    const bar = tid(page, 'nav-tabbar');
    await expect(bar).toBeVisible();
    await expect(bar.locator('button')).toHaveCount(5);
    expect(await bar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

    await tid(page, 'dock-market').tap();
    const panel = tid(page, 'panel-market');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-occlude', 'bottom');
    await page.waitForTimeout(700);
    const pb = (await panel.boundingBox())!;
    // the sheet starts just under the top bar (64 px without a notch), and the tab bar still takes taps above it
    expect(Math.abs(pb.y - 64)).toBeLessThanOrEqual(2);
    const onBar = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="nav-tabbar"]')!.getBoundingClientRect();
      return !!document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest('[data-testid="nav-tabbar"]');
    });
    expect(onBar).toBe(true);

    await pushEvents(page, [...ACHIEVEMENTS, { kind: 'warning', text: 'The heater in the test tank has failed.' }, { kind: 'info', text: 'A routine note.' }]);
    await page.waitForTimeout(700);
    expect(await tid(page, 'toast').count()).toBeLessThanOrEqual(2);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
