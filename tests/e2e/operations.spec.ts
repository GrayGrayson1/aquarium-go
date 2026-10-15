/**
 * lane:automation (chunk 5, DESIGN-S3D) — Operations and the navigation around it, in a real browser.
 *
 * NAV-020: the dock (Operations right after Build, no Settings) and the gear. NAV-021 and NAV-024: the More sheet's
 * Operations row first and the five-tab strip on a 390 px phone (scrolling at 360 px). NAV-022: the routes, locked before
 * their tier, and a Map layer change that replaces the address. NAV-023: the room view's Facility map chip. AUTO-030:
 * the Overview by tier. AUTO-036 and AUTO-042: Hold all, the HUD pill, Resume all. AUTO-040: Map selection, each layer's
 * marks, a line's tank and its link, the phone's room sheet. AUTO-044: the bell's tab links before the Operations Desk.
 * AUTO-047: researching the Operations Desk opens Problems. DES-013: the bell's Add a quarantine tank, bought from its
 * dialog. MKT-017: salt in 5, 20 and 40 kg. AUTO-046: the stock budget in $1 steps.
 */
import { test, expect, type Page } from '@playwright/test';
import { aq, openApp, quickGame, tid } from './helpers';

/** A shop with tanks on Auto Water Changers (fresh and salt), paused; `keys` taken away again after unlockAll. */
async function facility(page: Page, opts: { remove?: string[]; tanks?: number } = {}): Promise<string[]> {
  await openApp(page);
  await quickGame(page, 'betta', { money: 50000 });
  await aq(page, 'dev.setSpeed', 0);
  await aq(page, 'act', 'tutorialSkip'); // the guide card hides the phone tab bar
  await aq(page, 'dev.fillTestFacility', opts.tanks ?? 4);
  const ids = await page.evaluate((remove) => {
    let out: string[] = [];
    const A = (window as unknown as { __AQ: { mutate: (fn: (d: { tankOrder: string[]; progress: { unlocked: string[] } }) => void) => void } }).__AQ;
    A.mutate((d) => {
      out = [...d.tankOrder];
      d.progress.unlocked = d.progress.unlocked.filter((k) => !remove.includes(k));
    });
    return out;
  }, opts.remove ?? []);
  for (const id of ids) await aq(page, 'act', 'installEquipment', id, 'auto_water_changer', { purchased: true });
  await aq(page, 'advance', 1); // the rooms install at the next step
  return ids;
}

const hash = (page: Page) => page.evaluate(() => location.hash);
const go = (page: Page, h: string) => page.evaluate((x) => (location.hash = x), h);

/** A betta line: the starter male breeds in the first tank, a female keeps in a new one, two more for raise and quarantine. */
async function bettaLine(page: Page): Promise<{ extra: string[]; r: { ok: boolean; lineId?: string; message: string } }> {
  const extra: string[] = [];
  for (const name of ['Grow-out Tub', 'Quarantine', 'Quiet Corner']) {
    expect((await aq<{ ok: boolean }>(page, 'act', 'buyTank', 'g20L', 'freshwater_tropical', undefined, { seeded: true, name })).ok).toBe(true);
    extra.push(await page.evaluate(() => (window as unknown as { __AQ: { game(): { tankOrder: string[] } } }).__AQ.game().tankOrder.at(-1)!));
  }
  expect((await aq<{ ok: boolean }>(page, 'dev.spawnSpecies', 'betta', extra[2], { sex: 'female', ageDays: 40 })).ok).toBe(true);
  const pair = await page.evaluate((keep) => {
    const g = (window as unknown as { __AQ: { game(): { creatures: Record<string, { id: string; speciesId: string; sex: string; tankId: string | null }> } } }).__AQ.game();
    const all = Object.values(g.creatures).filter((c) => c.speciesId === 'betta');
    const f = all.find((c) => c.sex === 'female' && c.tankId === keep)!;
    const m = all.find((c) => c.sex === 'male')!;
    return { motherId: f.id, fatherId: m.id, breed: m.tankId! };
  }, extra[2]);
  const r = await aq<{ ok: boolean; lineId?: string; message: string }>(page, 'act', 'createLine', { motherId: pair.motherId, fatherId: pair.fatherId, tanks: { breed: pair.breed, raise: extra[0], quarantine: extra[1], keep: extra[2] } });
  expect(r.ok, r.message).toBe(true);
  return { extra, r };
}

test.describe('NAV-020: Operations in the dock, Settings on the gear', () => {
  test('the dock items, Operations right after Build, no dock-settings; the gear opens and closes Settings', async ({ page, browserName }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    const ids = await page.locator('nav.ag-dock .ag-dock__item[data-testid^="dock-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    // chunk 6: the e2e app runs in dev mode, where the Social stub is in the dock after Shows (0.5 §13, ADR-0005 decision 3;
    // the S3-D screens draw it there); prod-mode.spec checks the ten items without it in a production build
    expect(ids).toEqual(['dock-tanks', 'dock-livestock', 'dock-market', 'dock-visitors', 'dock-shows', 'dock-social', 'dock-build', 'dock-operations', 'dock-research', 'dock-finances', 'dock-encyclopedia']);
    await expect(tid(page, 'dock-settings')).toHaveCount(0);
    const gear = tid(page, 'hud-settings');
    await expect(gear).toHaveAttribute('aria-label', 'Settings');
    // WebKit doesn't focus a button on click (Safari's own behaviour), so there is no focus to give back after a mouse
    // open: there the gear is opened from the keyboard, the case focus return is for (a11y.spec.ts does the same)
    if (browserName === 'webkit') {
      await gear.focus();
      await page.keyboard.press('Enter');
    } else await gear.click();
    await expect(tid(page, 'panel-settings')).toBeVisible();
    await expect(gear).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(tid(page, 'panel-settings')).toBeHidden();
    await expect(gear).toBeFocused();
  });
});

test.describe('NAV-022, AUTO-030: the routes by tier', () => {
  test('early: the early Overview and the locked pages; links keep working', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta', { unlockAll: false });
    await go(page, '#/operations');
    await expect(tid(page, 'panel-operations')).toBeVisible();
    await expect(tid(page, 'ops-assisted')).toBeVisible();
    await expect(tid(page, 'ops-ladder')).toBeVisible();
    await expect(tid(page, 'ops-early-locked-water')).toBeVisible();
    await expect(tid(page, 'ops-tab-water')).toHaveCount(0);
    for (const [h, id] of [
      ['#/operations/water', 'ops-locked-water'],
      ['#/operations/feed', 'ops-locked-feed'],
      ['#/operations/issues', 'ops-locked-issues'],
      ['#/operations/manual', 'ops-locked-manual'],
      ['#/build/facility/water', 'build-room-locked-water'],
    ]) {
      await go(page, h);
      await expect(tid(page, id)).toBeVisible();
      expect(await hash(page)).toBe(h);
    }
  });

  test('late: every tab, Problems and Manual mode open; a Map layer change replaces the address', async ({ page }) => {
    await facility(page);
    await go(page, '#/operations/water');
    await expect(tid(page, 'water-meter-fresh')).toBeVisible();
    await go(page, '#/operations/feed');
    await expect(tid(page, 'feed-hatchery')).toBeVisible();
    await go(page, '#/operations/lines');
    await expect(tid(page, 'panel-operations').getByText('No production line yet')).toBeVisible();
    await go(page, '#/operations/issues');
    await expect(tid(page, 'ops-issues-back')).toBeVisible();
    await expect(tid(page, 'ops-tab-overview')).toHaveAttribute('aria-selected', 'true');
    await go(page, '#/operations/manual');
    await expect(tid(page, 'manual-banner')).toBeVisible();
    await go(page, '#/operations/map');
    await expect(tid(page, 'map-details')).toBeVisible();
    const before = await page.evaluate(() => history.length);
    await tid(page, 'map-layer-water').click();
    await expect.poll(() => hash(page)).toBe('#/operations/map?layer=water');
    expect(await page.evaluate(() => history.length)).toBe(before);
    await go(page, '#/operations/map?layer=nonsense');
    await expect(tid(page, 'map-layer-all')).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('AUTO-036, AUTO-042: manual mode', () => {
  test('Hold all → the HUD pill → Manual mode; Resume all removes the pill', async ({ page }) => {
    await facility(page);
    await tid(page, 'dock-operations').click();
    await expect(tid(page, 'panel-operations')).toBeVisible();
    await tid(page, 'ops-hold-all').click();
    await expect(tid(page, 'manual-banner')).toContainText('Manual mode is on');
    const pill = tid(page, 'hud-manual-mode');
    await expect(pill).toBeVisible();
    await expect(pill).toHaveAttribute('aria-label', 'Manual mode is on. Open it');
    await expect(pill).toContainText('Manual mode');
    await page.keyboard.press('Escape');
    await pill.click();
    await expect(tid(page, 'manual-banner')).toBeVisible();
    expect(await hash(page)).toBe('#/operations/manual');
    await tid(page, 'manual-toggle-water').click(); // one system resumed alone
    await expect(tid(page, 'manual-banner')).toContainText('4 of 5 systems are on hold.');
    await tid(page, 'manual-resume-all').click();
    await expect(tid(page, 'hud-manual-mode')).toHaveCount(0);
    await expect(tid(page, 'manual-banner')).toContainText('Manual mode is off');
  });
});

test.describe('AUTO-040: the Map', () => {
  test('selecting a tank shows its details; selecting it again clears them', async ({ page }) => {
    const ids = await facility(page);
    await go(page, '#/operations/map');
    const tile = tid(page, `map-tank-${ids[0]}`);
    await tile.click();
    await expect(tid(page, 'map-details')).toContainText('Selected on the map');
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
    await tile.click();
    await expect(tid(page, 'map-details')).toContainText('Select a room, machine or tank to see its details.');
    // the first Esc clears a selection, the next closes the panel
    await tile.click();
    await page.keyboard.press('Escape');
    await expect(tid(page, 'map-details')).toContainText('Select a room, machine or tank to see its details.');
    await expect(tid(page, 'panel-operations')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tid(page, 'panel-operations')).toBeHidden();
  });

  test('each layer marks the tanks its own way; a line’s grow-out tank shows its places and opens the line', async ({ page }) => {
    const ids = await facility(page);
    const { extra, r } = await bettaLine(page);
    await go(page, '#/operations/map');
    await tid(page, 'map-layer-water').click();
    await expect(tid(page, `map-tank-${ids[0]}`)).toContainText('gal a day'); // a tank on an Auto Water Changer
    // chunk 6 (B-202): an exact answer (the check accepted any of four, so it couldn't fail): this tank gets an Autofeeder
    expect((await aq<{ ok: boolean }>(page, 'act', 'installEquipment', ids[0], 'autofeeder', { purchased: true })).ok).toBe(true);
    await tid(page, 'map-layer-food').click();
    await expect(tid(page, `map-tank-${ids[0]}`)).toContainText('Autofeeder');
    await tid(page, 'map-layer-animals').click();
    // the Animals layer names its lines in text: the short name on the tile, the whole name in its label (C-64)
    await expect(tid(page, `map-tank-${extra[0]}`)).toContainText('· Betta');
    await expect(tid(page, `map-tank-${extra[0]}`)).toHaveAttribute('aria-label', /Betta line/);
    await tid(page, `map-tank-${extra[0]}`).click();
    await expect(tid(page, 'map-details')).toContainText('Places');
    await tid(page, 'map-details').getByRole('button', { name: 'Betta line' }).click();
    await expect.poll(() => hash(page)).toBe(`#/livestock/production/${r.lineId}`);
  });

  test('the room view’s Facility map chip opens the Map; closing it returns to the room view', async ({ page }) => {
    await facility(page);
    await tid(page, 'view-toggle').click();
    await expect.poll(() => aq<{ view: string }>(page, 'summary').then((s) => s.view)).toBe('facility');
    await tid(page, 'room-facility-map').click();
    await expect(tid(page, 'map-details')).toBeVisible();
    expect(await hash(page)).toBe('#/operations/map');
    await page.keyboard.press('Escape');
    await expect(tid(page, 'panel-operations')).toBeHidden();
    expect((await aq<{ view: string }>(page, 'summary')).view).toBe('facility');
  });
});

test.describe('AUTO-044: before the Operations Desk', () => {
  test('the bell lists the salt problem and its Water tab link opens the tab; Problems is locked', async ({ page }) => {
    await facility(page, { remove: ['operations_desk'] });
    await page.evaluate(() => (window as unknown as { __AQ: { mutate: (fn: (d: { inventory: { salt: number } }) => void) => void } }).__AQ.mutate((d) => void (d.inventory.salt = 0)));
    await tid(page, 'hud-alerts').click();
    await expect(tid(page, 'alerts-automation')).toBeVisible();
    await tid(page, 'alerts-item-tab-water').click();
    await expect(tid(page, 'water-meter-saltmix')).toBeVisible();
    await go(page, '#/operations/issues');
    await expect(tid(page, 'ops-locked-issues')).toBeVisible();
    await expect(tid(page, 'ops-next-up')).toBeVisible();
  });

  test('AUTO-047: researching the Operations Desk opens Problems three days later', async ({ page }) => {
    await facility(page, { remove: ['operations_desk'] });
    await page.evaluate(() =>
      (window as unknown as { __AQ: { mutate: (fn: (d: { facility: { level: string }; progress: { research: { completed: string[] } } }) => void) => void } }).__AQ.mutate((d) => {
        d.facility.level = 'aquarium_store';
      }),
    );
    await go(page, '#/research');
    await tid(page, 'research-start-operations_desk').click();
    await aq(page, 'advance', 73);
    await go(page, '#/operations/issues');
    await expect(tid(page, 'ops-issues-back')).toBeVisible();
    await expect(tid(page, 'ops-locked-issues')).toHaveCount(0);
  });
});

test.describe('DES-013: the bell with the Operations Desk', () => {
  test('a held-up line’s “Add a quarantine tank” opens its dialog, which stays open to the press, and buys the tank', async ({ page }) => {
    await facility(page);
    const { extra, r } = await bettaLine(page);
    // the line is held up for a quarantine tank (the line step sets this when every quarantine tank is full)
    await page.evaluate((id) => (window as unknown as { __AQ: { mutate: (fn: (d: { production: { lines: { id: string; waiting?: boolean }[] } }) => void) => void } }).__AQ.mutate((d) => void (d.production.lines.find((l) => l.id === id)!.waiting = true)), r.lineId!);
    const tanks = () => page.evaluate(() => (window as unknown as { __AQ: { game(): { tankOrder: string[] } } }).__AQ.game().tankOrder.length);
    const before = await tanks();
    await tid(page, 'hud-alerts').click();
    await tid(page, 'alerts-item-add-qt').click();
    await expect(tid(page, 'production-add-qt-dialog')).toBeVisible();
    // a press inside the dialog (it is portalled outside the drawer) used to close the drawer, and the dialog with it
    // (the drawer's fade-out kept the dialog on screen for a fast click: the bell's own state shows the close at once)
    await tid(page, 'production-add-qt-seeded').click();
    await expect(tid(page, 'production-add-qt-seeded')).toHaveAttribute('aria-checked', 'false');
    await expect(tid(page, 'hud-alerts')).toHaveAttribute('aria-expanded', 'true');
    await expect(tid(page, 'production-add-qt-dialog')).toBeVisible();
    await tid(page, 'production-add-qt-buy').click();
    await expect(tid(page, 'production-add-qt-dialog')).toBeHidden();
    await expect.poll(tanks).toBe(before + 1);
    const qt = await page.evaluate((id) => (window as unknown as { __AQ: { game(): { production: { lines: { id: string; tanks: { quarantine: string[] } }[] } } } }).__AQ.game().production.lines.find((l) => l.id === id)!.tanks.quarantine, r.lineId!);
    expect(qt).toHaveLength(2);
    expect(qt[0]).toBe(extra[1]);
  });
});

test.describe('MKT-017, AUTO-046: Supplies and Staff', () => {
  test('salt in 5, 20 and 40 kg; #/market/supplies/salt outlines the row', async ({ page }) => {
    await facility(page);
    await page.evaluate(() => (window as unknown as { __AQ: { mutate: (fn: (d: { inventory: { salt: number } }) => void) => void } }).__AQ.mutate((d) => void (d.inventory.salt = 0)));
    await go(page, '#/market/supplies/salt');
    await expect(tid(page, 'supplies-row-salt')).toBeVisible();
    const salt = () => page.evaluate(() => (window as unknown as { __AQ: { summary: () => unknown } }).__AQ && (window as unknown as { __AQ: { state: () => { inventory: { salt: number } } } }).__AQ.state().inventory.salt);
    await tid(page, 'supplies-salt-buy-5').click();
    await expect.poll(salt).toBe(5);
    await tid(page, 'supplies-salt-buy-20').click();
    await expect.poll(salt).toBe(25);
    await tid(page, 'supplies-salt-buy-40').click();
    await expect.poll(salt).toBe(65);
    await expect(tid(page, 'supplies-row-salt').getByRole('group', { name: 'Buy marine salt mix' })).toBeVisible();
  });

  test('the stock budget moves in $1 steps and the orders switch keeps it', async ({ page }) => {
    await facility(page);
    await page.evaluate(() =>
      (window as unknown as { __AQ: { mutate: (fn: (d: { facility: { level: string } }) => void) => void } }).__AQ.mutate((d) => {
        d.facility.level = 'aquarium_store';
      }),
    );
    await aq(page, 'dev.hireStaff', 'stock_manager');
    await go(page, '#/visitors/staff');
    const slider = tid(page, 'staff-budget').getByRole('slider');
    await expect(slider).toBeVisible();
    await page.waitForTimeout(300); // an opening panel moves focus to its title first (PanelHost)
    await slider.focus();
    await page.keyboard.press('End');
    // at a held arrow key's pace (a controlled range input can't take presses faster than it re-renders)
    for (let i = 0; i < 39; i++) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(50);
    }
    await expect(tid(page, 'staff-budget')).toContainText('$261/day');
    await tid(page, 'staff-orders').click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __AQ: { state: () => { staff: { ordersOff?: boolean; stockBudget: number } } } }).__AQ.state().staff)).toMatchObject({ ordersOff: true });
  });
});

test.describe('NAV-021, NAV-024: phones', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('More shows Operations first; the five tabs fit at 390 px', async ({ page }) => {
    await facility(page);
    await tid(page, 'dock-more').tap();
    // (the sheet's grabber, as drawn, sits above its rows: chunk 6, DES-011)
    const first = page.locator('.ag-more > *:not(.ag-more__head):not(.ag-more__grab)').first();
    await expect(first).toHaveAttribute('data-testid', 'more-operations');
    await tid(page, 'more-operations').tap();
    await expect(tid(page, 'panel-operations')).toBeVisible();
    const strip = page.locator('.ops-tabs');
    const fits = await strip.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(fits).toBe(true);
    for (const t of ['overview', 'water', 'feed', 'lines', 'map']) await expect(tid(page, `ops-tab-${t}`)).toBeVisible();
  });

  test('AUTO-040: on the Map a room tap opens its sheet', async ({ page }) => {
    await facility(page);
    await go(page, '#/operations/map');
    await tid(page, 'map-room-water').tap();
    const sheet = tid(page, 'map-room-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Water room');
    await expect(sheet.getByRole('button', { name: /Water tab/ })).toBeVisible();
  });
});

test.describe('NAV-020, NAV-023: the dock clears the camera chips with the wider Operations label', () => {
  type Box = { x: number; y: number; width: number; height: number };
  const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  test('the tank view at 1400–1600 px, and the room view’s two labelled chips at 981–1440 px (C-60)', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'act', 'tutorialSkip');
    const measure = async (chips: string, w: number, view: string) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(400);
      await page.mouse.move(w / 2, 880); // wake a calm HUD so the dock is laid out where it shows
      await page.waitForTimeout(200);
      const dock = await page.locator('nav.ag-dock').boundingBox();
      const chip = await page.locator(chips).first().boundingBox();
      expect(dock && chip, `${view} at ${w}: both shown`).toBeTruthy();
      expect(overlap(dock!, chip!), `${view} at ${w}`).toBe(false);
    };
    for (const w of [1400, 1440, 1519, 1520, 1600]) await measure('.ag-hud__cam:not(.ag-hud__cam--room) .ag-camchips', w, 'tank view');
    await tid(page, 'view-toggle').click();
    await expect(tid(page, 'room-facility-map')).toBeVisible();
    for (const w of [981, 1024, 1180, 1280, 1440]) await measure('.ag-hud__cam--room .ag-camchips', w, 'room view');
  });
});
