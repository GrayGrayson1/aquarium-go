import { test, expect } from '@playwright/test';
import { openApp, onboardViaUI, quickGame, tid, aq, probe, openPanel } from './helpers';

test.describe('save / load / settings', () => {
  test('manual save → reload → Continue restores the game', async ({ page }) => {
    await openApp(page);
    await onboardViaUI(page, 'axolotl', 'Keeper');
    await aq(page, 'dev.addMoney', 123);
    await aq(page, 'advance', 5);
    const before = await probe<{ ids: string[]; money: number; hour: number; saveId: string }>(
      page,
      `({ ids: Object.keys(g.creatures).sort(), money: g.finance.money, hour: g.clock.hour, saveId: g.saveId })`,
    );
    await openPanel(page, 'settings');
    await tid(page, 'settings-save').click();
    await expect.poll(async () => (await aq<{ slot: string }[]>(page, 'listSaves')).length).toBeGreaterThan(0);

    await page.reload();
    await openApp(page);
    await expect(tid(page, 'title-continue')).toBeVisible();
    await tid(page, 'title-continue').click();
    await expect(tid(page, 'hud-money')).toBeVisible();
    const after = await probe<{ ids: string[]; money: number; hour: number; saveId: string }>(
      page,
      `({ ids: Object.keys(g.creatures).sort(), money: g.finance.money, hour: g.clock.hour, saveId: g.saveId })`,
    );
    expect(after.saveId).toBe(before.saveId);
    for (const id of before.ids) expect(after.ids).toContain(id);
    expect(after.hour).toBeGreaterThanOrEqual(before.hour);
  });

  test('autosave writes the auto slot for a real game', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    expect(await aq<boolean>(page, 'autosave')).toBe(true);
    const saves = await aq<{ slot: string; starterId: string }[]>(page, 'listSaves');
    expect(saves.find((s) => s.slot === 'auto')?.starterId).toBe('betta');
    expect(await aq<string>(page, 'storageBackend')).toBe('indexeddb');
  });

  test('offline catch-up is capped and nobody dies', async ({ page }) => {
    await openApp(page);
    await aq(page, 'loadFixture', 'offline_test');
    const saved = await aq<{ ok: boolean }>(page, 'save', 'slot2');
    expect(saved.ok).toBe(true);
    // The running game stamps "now" when saving; pretend the player left 6 real hours ago.
    expect(await aq<boolean>(page, 'backdateSave', 'slot2', 6 * 3600 * 1000)).toBe(true);
    const r = await aq<{ ok: boolean; summary: { hours: number; capped: boolean } | null }>(page, 'loadAndResume', 'slot2');
    expect(r.ok).toBe(true);
    expect(r.summary?.hours).toBe(12);
    expect(r.summary?.capped).toBe(true);
    const dead = await probe<number>(page, `Object.values(g.creatures).filter(c => c.status === 'dead').length`);
    expect(dead).toBe(0);
  });

  test('a migrated legacy (v0) save loads and runs', async ({ page }) => {
    await openApp(page, '/?fixture=core_legacy_v0');
    await page.waitForFunction(() => (window as unknown as { __AQ: { summary(): { screen: string } } }).__AQ.summary().screen === 'game');
    const v = await probe<{ schema: number; tanks: number; hour: number }>(page, '({ schema: g.schemaVersion, tanks: g.tankOrder.length, hour: g.clock.hour })');
    expect(v.schema).toBeGreaterThanOrEqual(1);
    expect(v.tanks).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    expect(await probe<number>(page, 'g.clock.hour')).toBeGreaterThan(v.hour);
  });

  test('settings persist across reloads', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await openPanel(page, 'settings');
    await tid(page, 'settings-quality-low').click();
    expect(await page.evaluate(() => (window as unknown as { __AQ: { settings(): { quality: string } } }).__AQ.settings().quality)).toBe('low');
    await page.reload();
    await openApp(page);
    expect(await page.evaluate(() => (window as unknown as { __AQ: { settings(): { quality: string } } }).__AQ.settings().quality)).toBe('low');
  });

  test('ADR-0036 (F4): Save now sits on General and Saves only', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await openPanel(page, 'settings');
    const foot = tid(page, 'panel-settings').locator('.ag-sheet__foot');
    const tabs: [string, boolean][] = [['general', true], ['display', false], ['saves', true], ['notifications', false], ['about', false], ['general', true]];
    for (const [t, on] of tabs) {
      await tid(page, `settings-tab-${t}`).click();
      await expect(tid(page, `settings-tab-${t}`)).toHaveAttribute('aria-selected', 'true');
      await expect(tid(page, 'settings-save'), t).toHaveCount(on ? 1 : 0);
      await expect(foot, t).toHaveCount(on ? 1 : 0);
    }
    // focus on Save now moves to the new tab as the footer goes, after a click (WebKit doesn't focus a clicked tab) or
    // a link (Back and Forward), rather than falling to the page
    await tid(page, 'settings-save').focus();
    await tid(page, 'settings-tab-display').click();
    await expect(tid(page, 'settings-tab-display')).toBeFocused();
    await tid(page, 'settings-tab-general').click();
    await tid(page, 'settings-save').focus();
    await page.evaluate(() => void (location.hash = '#/settings/about'));
    await expect(tid(page, 'settings-tab-about')).toHaveAttribute('aria-selected', 'true');
    await expect(tid(page, 'settings-tab-about')).toBeFocused();
    // it still saves, from Saves too
    await tid(page, 'settings-tab-saves').click();
    await tid(page, 'settings-save').click();
    await expect(page.locator('[data-testid="toast"]').filter({ hasText: 'Game saved' }).first()).toBeVisible();
  });

  test('export → import roundtrip in the browser', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'lined_seahorse');
    const ids = await probe<string[]>(page, 'Object.keys(g.creatures).sort()');
    const text = await aq<string>(page, 'exportText');
    expect(text.length).toBeGreaterThan(500);
    const bad = await aq<{ ok: boolean; error?: string }>(page, 'importText', '{"not":"a save"}', 'slot3');
    expect(bad.ok).toBe(false);
    expect(bad.error).toMatch(/isn't an Aquarium Go save/i);
    const good = await aq<{ ok: boolean; slot?: string }>(page, 'importText', text, 'slot3');
    expect(good.ok).toBe(true);
    const r = await aq<{ ok: boolean }>(page, 'loadAndResume', 'slot3');
    expect(r.ok).toBe(true);
    expect(await probe<string[]>(page, 'Object.keys(g.creatures).sort()')).toEqual(ids);
  });
});
