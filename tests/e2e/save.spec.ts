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
    // focus on Save now moves to the new tab as the footer goes after a link (Back and Forward), rather than falling to
    // the page; a clicked tab takes focus itself in Chromium and WebKit (the click step checks that stays so)
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

  test('chunk 9 (E1, G1; REL-037): the save dialogs say what is kept, in ADR-0044’s words, and it is', async ({ page }) => {
    type Meta = { slot: string; day: number; previousOf?: string; saveId?: string };
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'save', 'slot1'); // day 1
    await aq(page, 'advance', 30);
    await aq(page, 'save', 'slot2'); // day 2
    const row = (label: string) => page.locator('.ag-saverow', { has: page.locator('.ag-saverow__slot', { hasText: new RegExp(`^${label}$`) }) });
    const openSaves = async () => {
      await openPanel(page, 'settings');
      await tid(page, 'settings-tab-saves').click();
    };

    // Load an earlier copy of the aquarium on screen: the current progress stays listed, and a slot is offered
    await openSaves();
    await row('Slot 1').getByRole('button', { name: 'Load' }).click();
    await expect(tid(page, 'load-confirm')).toContainText('This is an earlier copy of the aquarium you are playing. Your current progress (Day 2) stays listed as “Previous autosave” until you switch again.');
    await expect(tid(page, 'load-confirm-park')).toHaveText('Save to Slot 3 & load');
    await tid(page, 'load-confirm-load').click();
    await expect.poll(() => probe<number>(page, 'g.clock.hour')).toBeLessThan(24);
    await aq(page, 'autosave');
    await aq(page, 'autosave');
    expect((await aq<Meta[]>(page, 'listSaves')).find((m) => m.previousOf === 'auto')?.day).toBe(2);

    // Replace a slot that holds a later copy: it says so, and the later copy is listed beneath the slot
    await openSaves();
    await tid(page, 'save-overwrite-slot2').click();
    await expect(tid(page, 'overwrite-confirm')).toContainText('It holds a later copy (Day 2) than the one you are playing (Day 1). The later copy stays listed as “Previous copy of Slot 2”, so this can be undone.');
    await tid(page, 'overwrite-confirm-replace').click();
    await expect(row('Previous copy of Slot 2')).toBeVisible();

    // Import into a slot that holds a save: it asks first, and says the listed previous copy goes
    const text = await aq<string>(page, 'exportText');
    await page.getByRole('radiogroup', { name: 'Import slot' }).getByRole('radio', { name: '#2' }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: 'aquarium.json', mimeType: 'application/json', buffer: Buffer.from(text) });
    const imp = tid(page, 'import-confirm');
    await expect(imp).toContainText('Replace Slot 2?');
    await expect(imp).toContainText('It will be replaced with the imported save. The old copy stays listed as “Previous copy of Slot 2”, so this can be undone. “Previous copy of Slot 2” (');
    await expect(imp).toContainText(', Day 2) is deleted.');
    await tid(page, 'import-confirm-replace').click();
    await expect(page.locator('[data-testid="toast"]').filter({ hasText: 'Imported into Slot 2.' }).first()).toBeVisible();
    const saves = await aq<Meta[]>(page, 'listSaves');
    expect(saves.find((m) => m.previousOf === 'slot2')?.day).toBe(1); // what the import replaced, kept
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
