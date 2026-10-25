/**
 * chunk 15 (LAB-004, LAB-005, LAB-008; ADR-0051) — the scenario lab as the owner uses it: open it from the address,
 * build a recipe through the screen (a tank, its animals, a problem, the water, the shop), play it (paused, the badge,
 * never autosaved over the player's game), start it again, keep it as a preset and open it from a link after a reload,
 * and the recipe's JSON exported and imported. Chromium and WebKit, dev build.
 */
import { test, expect, type Page } from '@playwright/test';
import { aq, collectErrors, openApp, summary, tid } from './helpers';

type Scenario = { name: string; saveId: string } | null;

async function waitForGame(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __AQ: { summary(): { screen: string } } }).__AQ.summary().screen === 'game');
}

/** The tank the recipe called `name` in the game on screen, with its animals and its heater. */
async function tankNamed(page: Page, name: string) {
  return page.evaluate((n) => {
    const g = (window as unknown as { __AQ: { game(): import('../../src/types').GameState } }).__AQ.game();
    const t = Object.values(g.tanks).find((x) => x.name === n)!;
    const animals = Object.values(g.creatures).filter((c) => c.tankId === t.id && c.status === 'alive');
    const heater = t.equipment.find((e) => e.defId.startsWith('heater'));
    return { tier: t.tierId, water: t.waterClass, ammonia: t.water.ammonia, species: animals.map((c) => c.speciesId), heater: heater ? { failed: !!heater.failed, mode: heater.failMode } : null };
  }, name);
}

test('build a recipe through the lab, play it paused and unsaved, start again, keep it, and open it from a link', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page, '/?lab=1');
  await expect(tid(page, 'lab-root')).toBeVisible();

  // start from the sandbox preset, then make it our own
  await tid(page, 'lab-preset-sandbox').click();
  await tid(page, 'lab-name').fill('E2E scenario');
  await tid(page, 'lab-money').fill('4321');

  // a tank of our own: 29 gallons of tropical water, six neon tetras, the heater stuck on, ammonia up
  await tid(page, 'lab-tab-tanks').click();
  await tid(page, 'lab-add-tank').click();
  const t = 'lab-tank-3';
  await tid(page, `${t}-name`).fill('E2E Tank');
  await tid(page, `${t}-size`).selectOption('g29');
  await tid(page, `${t}-water`).selectOption('freshwater_tropical');
  await tid(page, `${t}-add-animal`).click();
  await tid(page, `${t}-animal-0-species`).selectOption('neon_tetra');
  await tid(page, `${t}-animal-0-count`).fill('6');
  await tid(page, `${t}-problem-heater-stuck_on`).click();
  await tid(page, `${t}-water-ammonia`).fill('1.2');

  // the lab checks it as it goes: four tanks, six animals, nothing skipped
  await expect(tid(page, 'lab-counts')).toContainText('4 tanks · 6 animals');
  await expect(tid(page, 'lab-issue').and(page.locator('[data-level="error"]'))).toHaveCount(0);

  // Build and play: the game opens on it, paused, with the badge, and nothing autosaves it
  await tid(page, 'lab-build').click();
  await expect(tid(page, 'lab-root')).toHaveCount(0);
  await expect(tid(page, 'lab-badge')).toContainText('E2E scenario');
  await waitForGame(page);
  const s = await summary(page);
  expect(s.money).toBe(4321);
  expect(s.tanks).toBe(4);
  expect(await page.evaluate(() => (window as unknown as { __AQ: { game(): { clock: { speed: number } } } }).__AQ.game().clock.speed)).toBe(0);
  expect(await tankNamed(page, 'E2E Tank')).toEqual({ tier: 'g29', water: 'freshwater_tropical', ammonia: 1.2, species: Array(6).fill('neon_tetra'), heater: { failed: true, mode: 'stuck_on' } });
  const first = await aq<Scenario>(page, 'scenario.current');
  expect(first?.name).toBe('E2E scenario');
  expect(await aq<boolean>(page, 'autosave')).toBe(false);
  // nor does any save to the autosave slot ("Save now", "Save and return to title" save there)
  expect(await aq<{ ok: boolean; code?: string }>(page, 'save', 'auto')).toMatchObject({ ok: false, code: 'scenario' });
  expect((await aq<{ slot: string; saveId?: string }[]>(page, 'listSaves')).some((m) => m.saveId === first?.saveId)).toBe(false);

  // play changes it; Start again builds it fresh from its recipe
  await aq(page, 'dev.addMoney', 1000);
  expect((await summary(page)).money).toBe(5321);
  await tid(page, 'lab-restart').click();
  await page.waitForFunction((id) => (window as unknown as { __AQ: { scenario: { current(): { saveId: string } | null } } }).__AQ.scenario.current()?.saveId !== id, first?.saveId);
  expect((await summary(page)).money).toBe(4321);

  // keep it in this browser, then open it from a link after a reload
  await tid(page, 'lab-badge-open').click();
  await expect(tid(page, 'lab-root')).toBeVisible();
  await tid(page, 'lab-save').click();
  await expect(tid(page, 'lab-mine-e2e-scenario')).toBeVisible();
  await tid(page, 'lab-close').click();
  await openApp(page, `/?scenario=${encodeURIComponent('E2E scenario')}`);
  await waitForGame(page);
  await expect(tid(page, 'lab-badge')).toContainText('E2E scenario');
  expect((await summary(page)).money).toBe(4321);
  expect((await tankNamed(page, 'E2E Tank')).species).toHaveLength(6);

  expect(errors).toEqual([]);
});

test('the recipe as JSON: export a file, import one, and its problems show before building', async ({ page }) => {
  await openApp(page, '/?lab=1');
  await tid(page, 'lab-preset-heater-stuck').click();
  await tid(page, 'lab-tab-json').click();
  await expect(tid(page, 'lab-json')).toHaveValue(/"name": "Heater stuck on"/);

  const [download] = await Promise.all([page.waitForEvent('download'), tid(page, 'lab-export').click()]);
  expect(download.suggestedFilename()).toBe('scenario_heater-stuck-on.json');
  const exported = JSON.parse(await (await download.createReadStream()).toArray().then((b) => Buffer.concat(b).toString('utf8'))) as { name: string; tanks: unknown[] };
  expect(exported.name).toBe('Heater stuck on');
  expect(exported.tanks).toHaveLength(2);

  // an imported recipe with a mistake: it loads, the problem is named, and Build still makes what it can
  const recipe = { version: 1, name: 'Imported', tanks: [{ name: 'Odd Tank', animals: [{ species: 'shark' }, { species: 'axolotl', count: 2 }], water: 'freshwater_cool' }] };
  await tid(page, 'lab-import').setInputFiles({ name: 'imported.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(recipe)) });
  await expect(tid(page, 'lab-json')).toHaveValue(/"name": "Imported"/);
  await expect(tid(page, 'lab-issues')).toContainText('Unknown species "shark"');
  await tid(page, 'lab-build').click();
  await waitForGame(page);
  expect(await tankNamed(page, 'Odd Tank')).toMatchObject({ water: 'freshwater_cool', species: ['axolotl', 'axolotl'] });
});
