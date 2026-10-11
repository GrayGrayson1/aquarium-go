/**
 * lane:ui-shell (chunk 3; 0.5 spec §10, §18, §20.2; AUTO-003 to AUTO-005, AUTO-007, ACC-004) — the tank card's
 * Automation section in a real browser: Auto-feed bought from the card, switched, its meals set (arrow keys too) and
 * restored to 2 from a legacy 0; the paused alert and its Fix; Auto-clean refused without the money, then bought,
 * switched and shown on the Water tab; the locked switch reachable by keyboard with its reason.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid } from './helpers';

type AQ = { __AQ: { game(): any; mutate(fn: (g: any) => void): void; ui(): { toasts: { text: string; label?: string; detail?: string; kind: string }[] } } };
const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);
const hash = (page: Page) => page.evaluate(() => location.hash);
const lastToast = (page: Page) => page.evaluate(() => (window as unknown as AQ).__AQ.ui().toasts.at(-1) ?? null);

/** A paused game with the starter's tank and none of the automation gear in it; returns the tank id. */
async function automationGame(page: Page, money = 5000): Promise<string> {
  await openApp(page);
  await quickGame(page, 'betta', { money });
  await aq(page, 'act', 'tutorialSkip');
  await aq(page, 'dev.setSpeed', 0);
  return page.evaluate(() => {
    const aqw = (window as unknown as AQ).__AQ;
    const id = aqw.game().tankOrder[0];
    aqw.mutate((g) => {
      const t = g.tanks[id];
      t.name = 'Ember’s Tank';
      t.equipment = t.equipment.filter((e: { defId: string }) => e.defId !== 'autofeeder' && e.defId !== 'auto_water_changer');
      g.inventory.foods = { ...g.inventory.foods, flake_tropical: 60 };
    });
    return id;
  });
}

const device = (page: Page, tankId: string, defId: string) =>
  page.evaluate(([t, d]) => {
    const e = (window as unknown as AQ).__AQ.game().tanks[t].equipment.find((x: { defId: string }) => x.defId === d);
    return e ? { on: e.on as boolean, setting: e.setting as number | undefined } : null;
  }, [tankId, defId] as const);

test.describe('Tank card › Automation (desktop 1440×900)', () => {
  test('Auto-feed: bought from the card, switched, meals set; a legacy 0 comes back as 2; the paused alert opens Equipment', async ({ page }) => {
    const tankId = await automationGame(page);
    await goHash(page, `#/tanks/${tankId}/equipment`);
    await expect(tid(page, 'tank-automation')).toBeVisible();
    const sw = tid(page, 'tank-auto-feed');
    await expect(sw).toHaveAttribute('role', 'switch');
    await expect(sw).toHaveAttribute('aria-label', 'Auto-feed for Ember’s Tank');
    await expect(sw).toHaveAttribute('aria-disabled', 'true');
    await expect(tid(page, 'tank-auto-feed-row')).toContainText('Needs an Autofeeder');

    await tid(page, 'tank-auto-feed-buy').click();
    await expect.poll(() => device(page, tankId, 'autofeeder')).toMatchObject({ on: true, setting: 2 });
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await expect(sw).not.toHaveAttribute('aria-disabled', 'true');
    await expect(tid(page, 'tank-auto-feed-row')).toContainText('Runs your Autofeeder');

    // Meals a day: a radio group bound to the setting, arrow keys included
    await tid(page, 'tank-auto-feed-meals-3').click();
    await expect.poll(async () => (await device(page, tankId, 'autofeeder'))?.setting).toBe(3);
    await expect(tid(page, 'tank-auto-feed-meals-3')).toHaveAttribute('aria-checked', 'true');
    await tid(page, 'tank-auto-feed-meals-3').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await device(page, tankId, 'autofeeder'))?.setting).toBe(4);
    await expect(tid(page, 'tank-auto-feed-meals-4')).toBeFocused();

    // off: paused, with the amber line and no meals control
    await sw.click();
    await expect.poll(async () => (await device(page, tankId, 'autofeeder'))?.on).toBe(false);
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await expect(tid(page, 'tank-auto-feed-paused')).toContainText(/^Paused — feed .+ by hand\.$/);
    await expect(tid(page, 'tank-auto-feed-meals-1')).toHaveCount(0);

    // a legacy 0 meals a day reads as off; switching on restores 2 (B-149)
    await page.evaluate((t) => (window as unknown as AQ).__AQ.mutate((g) => {
      const e = g.tanks[t].equipment.find((x: { defId: string }) => x.defId === 'autofeeder');
      e.on = true;
      e.setting = 0;
    }), tankId);
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await sw.click();
    await expect.poll(() => device(page, tankId, 'autofeeder')).toMatchObject({ on: true, setting: 2 });

    // paused with a hungry resident: the drawer's row, and Fix opens #/tanks/:id/equipment
    await page.evaluate((t) => (window as unknown as AQ).__AQ.mutate((g) => {
      g.tanks[t].equipment.find((x: { defId: string }) => x.defId === 'autofeeder').on = false;
      for (const c of Object.values(g.creatures) as { tankId: string; stats: { hunger: number } }[]) if (c.tankId === t) c.stats.hunger = 70;
    }), tankId);
    await goHash(page, '#/');
    await expect.poll(() => hash(page)).toBe('#/');
    await tid(page, 'hud-alerts').click();
    const row = tid(page, 'alert-autofeed-paused');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Ember’s Tank');
    await expect(row).toContainText(/Auto-feed is paused — feed .+ by hand\./);
    await expect(row).toContainText('Fix');
    await row.click();
    await expect.poll(() => hash(page)).toBe(`#/tanks/${tankId}/equipment`);
    await expect(tid(page, 'tank-automation')).toBeVisible();

    // back on (with food): the row clears
    await tid(page, 'tank-auto-feed').click();
    await tid(page, 'hud-alerts').click();
    await expect(tid(page, 'alert-autofeed-paused')).toHaveCount(0);
  });

  test('Auto-clean: refused without $120, then bought and on; the Water tab note follows the switch', async ({ page }) => {
    const tankId = await automationGame(page);
    await page.evaluate(() => (window as unknown as AQ).__AQ.mutate((g) => void (g.finance.money = 100)));
    await goHash(page, `#/tanks/${tankId}/equipment`);
    const sw = tid(page, 'tank-auto-clean');
    await expect(sw).toHaveAttribute('aria-disabled', 'true');
    await expect(tid(page, 'tank-auto-clean-row')).toContainText('Small daily water changes and a weekly glass scrape.');
    await tid(page, 'tank-auto-clean-buy').click();
    await expect.poll(() => lastToast(page)).toMatchObject({ label: 'Not enough money', text: 'The Auto Water Changer costs $120.' });
    expect(await device(page, tankId, 'auto_water_changer')).toBeNull();

    await page.evaluate(() => (window as unknown as AQ).__AQ.mutate((g) => void (g.finance.money = 500)));
    await tid(page, 'tank-auto-clean-buy').click();
    await expect.poll(() => device(page, tankId, 'auto_water_changer')).toMatchObject({ on: true });
    await expect.poll(() => lastToast(page)).toMatchObject({ kind: 'celebrate', label: 'Installed', text: 'Auto Water Changer on Ember’s Tank', detail: 'Auto-clean is on. Switch it off any time on the tank card.' });
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await expect(tid(page, 'tank-auto-clean-row')).toContainText('Runs your Auto Water Changer · 10% each morning · glass once a week · $0.06/day');

    await goHash(page, `#/tanks/${tankId}`);
    await expect(tid(page, 'water-autoclean-note')).toContainText('Auto-clean is on');
    await goHash(page, `#/tanks/${tankId}/equipment`);
    await sw.click();
    await expect.poll(async () => (await device(page, tankId, 'auto_water_changer'))?.on).toBe(false);
    await goHash(page, `#/tanks/${tankId}`);
    await expect(tid(page, 'water-status')).toBeVisible();
    await expect(tid(page, 'water-autoclean-note')).toHaveCount(0);
  });

  test('the locked Auto-clean switch is reachable with Tab and names its reason', async ({ page }) => {
    const tankId = await automationGame(page);
    await goHash(page, `#/tanks/${tankId}/equipment`);
    const sw = tid(page, 'tank-auto-clean');
    await expect(sw).toBeVisible();
    // aria-disabled, never the disabled attribute: it stays in the tab order (Playwright's toBeEnabled counts both)
    expect(await sw.evaluate((e) => (e as HTMLButtonElement).disabled)).toBe(false);
    await tid(page, 'tank-auto-clean-buy').focus();
    await page.keyboard.press('Tab');
    await expect(sw).toBeFocused();
    const why = await sw.getAttribute('aria-describedby');
    expect(why).toBeTruthy();
    await expect(page.locator(`[id="${why}"]`)).toContainText('Needs an Auto Water Changer');
    await page.keyboard.press('Space');
    expect(await device(page, tankId, 'auto_water_changer')).toBeNull();
  });
});
