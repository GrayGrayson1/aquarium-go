/**
 * chunk 22 (ADR-0058) — the Livestock panel's friction fixes, end to end (findings L-1 to L-6 in the chunk's brief,
 * PLAN.md chunk 22). Each case is one place a play-test stopped, hunted or tapped more than it should:
 * - L-1: Eggs & fry shows the clutches first and the breeding activity after them, and a clutch with no nursery
 *   links its "in Tanks" to Tanks;
 * - L-2: Back from an animal's card brings the Animals list back where it was (its search, its rows, its scroll);
 * - L-3: hungry young have a "Feed in {tank}" button that opens that tank's food picker;
 * - L-4: "Needs attention" with nobody in it says every animal is doing well, not "Nobody matches";
 * - L-5: Production's "Which pair breeds?" lists the pairs under species headings, with chips that narrow it to one;
 * - L-6: a breeding activity line that says to move an animal has a Move button.
 * The states are built with the scenario lab's recipes (docs/SCENARIOS.md), paused.
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { aq, openApp, probe, tid } from './helpers';

const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } as const;

/** Build a recipe (docs/SCENARIOS.md) and play it: the game opens on it, paused. */
async function play(page: Page, recipe: Record<string, unknown>): Promise<void> {
  await openApp(page);
  const r = await aq<{ ok: boolean; issues: { level: string; message: string }[] }>(page, 'scenario.play', { format: 'aquarium-go-scenario', version: 1, ...recipe });
  expect(r.ok, JSON.stringify(r.issues)).toBe(true);
  expect(r.issues.filter((i) => i.level === 'error'), JSON.stringify(r.issues)).toEqual([]);
  await page.waitForFunction(() => (window as unknown as { __AQ: { summary(): { screen: string } } }).__AQ.summary().screen === 'game');
  await aq(page, 'dev.setSpeed', 0);
}

const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);
/** The panel's scrolling body. */
const body = (page: Page) => page.locator('[data-testid="panel-livestock"] .pn-body');
const top = (l: Locator) => l.evaluate((el) => el.getBoundingClientRect().top);

test.describe('Livestock friction fixes on a phone (390×844, touch)', () => {
  test.use(PHONE);

  test('L-1: Eggs & fry shows the clutch first, and its “in Tanks” opens Tanks', async ({ page }) => {
    // ten guppies of each sex courting and carrying (a page of breeding activity), and fry in a tank with adults and no
    // nursery anywhere: the clutch the alerts link to
    await play(page, {
      name: 'L-1 clutches first',
      tanks: [
        { name: 'Livebearers', size: 'g75', water: 'freshwater_tropical', animals: [{ species: 'fancy_guppy', count: 20, sex: 'mixed' }], young: [{ species: 'fancy_guppy', stage: 'fry', count: 20 }] },
      ],
    });
    // breeding activity enough to fill the phone's screen: every female carrying
    await page.evaluate(() => {
      const api = (window as unknown as { __AQ: { game(): { creatures: Record<string, { id: string; sex: string }> }; dev: { forceBreeding(id: string): unknown } } }).__AQ;
      for (const c of Object.values(api.game().creatures)) if (c.sex === 'female') api.dev.forceBreeding(c.id);
    });
    await goHash(page, '#/livestock/eggs');
    await expect(tid(page, 'livestock-tab-young')).toHaveAttribute('aria-selected', 'true');
    const clutches = page.getByRole('heading', { name: 'Clutches', exact: true });
    const activity = page.getByRole('heading', { name: 'Breeding activity', exact: true });
    await expect(clutches).toBeVisible();
    await expect(activity).toBeVisible();
    expect(await page.locator('.pn-breedrow').count(), 'a screenful of breeding activity').toBeGreaterThanOrEqual(6);
    // the clutch is the first thing on the tab, on screen as it opens; the breeding activity comes after it
    expect(await top(clutches)).toBeLessThan(await top(activity));
    await expect(page.locator('.pn-clutch').first()).toBeInViewport();
    // no nursery: "in Tanks" is a link to Tanks
    const card = page.locator('.pn-clutch').first();
    await expect(card).toContainText('No suitable nursery yet.');
    await tid(page, 'clutch-open-tanks').tap();
    await expect(tid(page, 'panel-tanks')).toBeVisible();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/tanks');
  });

  test('L-2: Back from an animal’s card brings the Animals list back where it was', async ({ page }) => {
    // a hundred neon tetras: three pages of rows
    await play(page, { name: 'L-2 a long list', tanks: [{ name: 'Shoal', size: 'g125', water: 'freshwater_tropical', animals: [{ species: 'neon_tetra', count: 100 }] }] });
    await goHash(page, '#/livestock');
    await expect(tid(page, 'panel-livestock')).toBeVisible();
    await page.getByRole('textbox', { name: 'Search livestock by name, species, morph or trait' }).fill('neon');
    // scroll past the first page (the list adds rows as its foot comes into view)
    await expect.poll(async () => {
      await body(page).evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }));
      return page.locator('.pn-lsrow').count();
    }).toBeGreaterThan(40);
    // the 50th animal (on the second page) in the middle of the screen
    const row = page.locator('.pn-lsrow__main').nth(49);
    await row.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const before = await body(page).evaluate((el) => el.scrollTop);
    expect(before).toBeGreaterThan(2500);
    const rows = await page.locator('.pn-lsrow').count();
    const label = (await row.getAttribute('aria-label')) ?? '';
    expect(label).toMatch(/^Open .+’s card$/);
    await page.getByRole('button', { name: label, exact: true }).tap();
    await expect(tid(page, 'creature-card')).toBeVisible();
    await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#\/livestock\/animal\//);
    // (the player reads the card: the sheet has slid away, so the panel comes back new, not from its exit animation)
    await expect(tid(page, 'panel-livestock')).toHaveCount(0);
    await page.goBack();
    await expect(tid(page, 'panel-livestock')).toBeVisible();
    // the same search, the same rows, the same place
    await expect(page.getByRole('textbox', { name: 'Search livestock by name, species, morph or trait' })).toHaveValue('neon');
    await expect(page.locator('.pn-lsrow')).toHaveCount(rows);
    await expect.poll(() => body(page).evaluate((el) => el.scrollTop)).toBe(before);
    await expect(page.getByRole('button', { name: label, exact: true })).toBeInViewport();
  });

  test('L-3: hungry fry have a Feed button that opens their own tank’s food picker', async ({ page }) => {
    await play(page, {
      name: 'L-3 hungry fry',
      tanks: [
        { name: 'Display', size: 'g29', water: 'freshwater_tropical', animals: [{ species: 'neon_tetra', count: 6 }] },
        { name: 'Fry Nursery', size: 'g20L', water: 'freshwater_tropical', purpose: 'nursery', young: [{ species: 'fancy_guppy', stage: 'fry', count: 20 }] },
      ],
      open: { tank: 'Display' },
    });
    // fry that haven't been fed for a while (the sim's "Hungry — offer …" line)
    const nursery = await probe<string>(page, `g.tankOrder.find((id) => g.tanks[id].name === 'Fry Nursery')`);
    await page.evaluate(() => (window as unknown as { __AQ: { mutate(f: (d: { clutches: Record<string, { fed?: number }> }) => void): void } }).__AQ.mutate((d) => { for (const cl of Object.values(d.clutches)) cl.fed = 0.1; }));
    const focused = () => page.evaluate(() => (window as unknown as { __AQ: { ui(): { focusedTankId: string } } }).__AQ.ui().focusedTankId);
    expect(await focused()).not.toBe(nursery);
    await goHash(page, '#/livestock/eggs');
    const card = page.locator('.pn-clutch').first();
    await expect(card).toContainText('Hungry');
    const feed = tid(page, 'clutch-feed');
    await expect(feed).toHaveText('Feed in Fry Nursery');
    await feed.tap();
    // the panel closes and the food picker opens on the nursery (not the tank that was on screen)
    await expect(tid(page, 'panel-livestock')).toBeHidden();
    await expect(page.locator('[data-testid^="food-option-"]').first()).toBeVisible();
    expect(await focused()).toBe(nursery);
  });

  test('L-4: Needs attention with nobody in it says every animal is doing well', async ({ page }) => {
    await play(page, { name: 'L-4 all well', tanks: [{ name: 'Display', size: 'g29', water: 'freshwater_tropical', animals: [{ species: 'neon_tetra', count: 6, stats: { health: 100, hunger: 0, stress: 0 } }] }] });
    await goHash(page, '#/livestock');
    await expect(tid(page, 'panel-livestock')).toBeVisible();
    const chip = page.getByRole('button', { name: /^Needs attention/ });
    await expect(chip).toHaveText('Needs attention'); // nobody needs it (no count)
    await chip.tap();
    await expect(page.getByText('Every animal is doing well')).toBeVisible();
    await expect(page.getByText('Nobody matches')).toHaveCount(0);
    // with a search as well, an empty list is a search miss again
    await page.getByRole('textbox', { name: 'Search livestock by name, species, morph or trait' }).fill('zzz');
    await expect(page.getByText('Nobody matches')).toBeVisible();
    await page.getByRole('textbox', { name: 'Search livestock by name, species, morph or trait' }).fill('');
    // Clear filters shows everyone
    await page.getByRole('button', { name: 'Clear filters' }).tap();
    await expect(page.locator('.pn-lsrow')).toHaveCount(6);
  });

  test('L-6: a breeding line that says to move an animal has its Move button', async ({ page }) => {
    // a betta pair that has spawned: the female is to go to her own tank
    await play(page, {
      name: 'L-6 move her',
      tanks: [
        { name: 'Spawning Tank', size: 'g10', water: 'freshwater_planted', animals: [{ species: 'betta', count: 2, sex: 'pair', names: ['Sapphire', 'Pearl'], morph: 'Royal Blue Halfmoon', breed: 'spawned' }] },
        { name: 'Rest Tank', size: 'g10', water: 'freshwater_planted' },
      ],
    });
    await goHash(page, '#/livestock/eggs');
    const row = page.locator('.pn-breedrow', { hasText: /— Move / }).first();
    await expect(row).toBeVisible();
    const name = (await row.locator('b.pn-serif').textContent())!.trim();
    const id = await probe<string>(page, `Object.values(g.creatures).find((c) => c.name === ${JSON.stringify(name)}).id`);
    const move = row.getByTestId('breeding-move');
    await expect(move).toHaveText(`Move ${name}`);
    await move.tap();
    // its card, with the Move dialog open on it
    await expect(tid(page, 'move-modal')).toBeVisible();
    await expect(tid(page, 'move-modal')).toContainText('Rest Tank');
    expect(await page.evaluate(() => (window as unknown as { __AQ: { ui(): { selectedCreatureId: string | null } } }).__AQ.ui().selectedCreatureId)).toBe(id);
  });
});

test.describe('Livestock friction fixes on a computer (1440×900)', () => {
  test('L-5: “Which pair breeds?” lists the pairs under species headings, and a chip narrows it to one', async ({ page }) => {
    await openApp(page, '/?scenario=staffed-store');
    await aq(page, 'dev.setSpeed', 0);
    await goHash(page, '#/livestock/production/new');
    await expect(tid(page, 'production-new-step-1')).toHaveAttribute('aria-current', 'step');
    const pairs = page.locator('[data-testid^="production-new-pair-"]');
    const keys = () => pairs.evaluateAll((els) => els.map((e) => e.getAttribute('data-pair')!));
    const all = await keys();
    expect(all.length).toBeGreaterThan(40);
    const species = await page.locator('.pr-pairs__sp').allTextContents();
    expect(species.length).toBeGreaterThan(2);
    // a heading over each species' pairs (each pair's line names its species)
    const order = await page.locator('.pr-pairs').evaluate((el) => [...el.children].map((c) => (c.classList.contains('pr-pairs__sp') ? `# ${c.textContent}` : c.querySelector('.pr-pair__sub')?.textContent ?? '')));
    let head = '';
    for (const line of order) {
      if (line.startsWith('# ')) head = line.slice(2);
      else if (line) expect(line.startsWith(`${head} ·`), `${line} under ${head}`).toBe(true);
    }
    // a chip narrows the list to one species: its pairs, in the same order
    const chip = page.locator('[data-testid^="production-pairs-only-"]', { hasText: 'Neon tetra' });
    await expect(chip).toHaveText(/^Neon tetra \(\d+\)$/i);
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    const neon = await keys();
    expect(neon.length).toBe(Number((await chip.textContent())!.match(/\((\d+)\)/)![1]));
    const subs = await page.locator('.pr-pair__sub').allTextContents();
    for (const s of subs) expect(s).toMatch(/^Neon tetra ·/i);
    expect(neon).toEqual(all.filter((k) => neon.includes(k)));
    // the arrow keys move the choice through the pairs on show
    await pairs.first().click();
    await expect(pairs.first()).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(pairs.nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect(pairs.nth(1)).toBeFocused();
    // the pick stands, and Next goes on with it
    await tid(page, 'production-pairs-all').click();
    expect((await keys()).length).toBe(all.length);
    await expect(page.locator(`[data-pair="${neon[1]}"]`)).toHaveAttribute('aria-checked', 'true');
    await tid(page, 'production-new-next').click();
    await expect(tid(page, 'production-new-step-2')).toHaveAttribute('aria-current', 'step');
  });
});
