/**
 * Chunk 21, feature B (rare-hatch reveals): a rare brood opens one reveal card over the game (src/ui/reveal). The births
 * are forced, never luck: a scenario builds nurseries of guppy fry that grow up at set hours, the dev hook makes the
 * next young Prismatic, and the dev clock jump (`advance`, one store commit like the game loop's) runs them.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, tid, aq, probe, waitForState, collectErrors } from './helpers';

const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);

/** Five nurseries whose fry grow up 0.5, 6, 12, 18 and 24 game hours after the build (one brood per step below). */
const RECIPE = {
  // a recipe names its format and version (the presets' `r()` adds them); without them the lab builds a blank shop
  format: 'aquarium-go-scenario',
  version: 1,
  name: 'Reveal e2e',
  tanks: [0.5, 6, 12, 18, 24].map((at, i) => ({
    name: `Nursery ${'ABCDE'[i]}`,
    size: 'g20L',
    water: 'freshwater_tropical',
    purpose: 'nursery',
    young: [{ species: 'fancy_guppy', stage: 'fry', count: i === 0 ? 3 : 4, nextStageInHours: at }],
  })),
  open: { tank: 'Nursery A' },
};

async function playScenario(page: Page): Promise<void> {
  const built = await aq<{ ok: boolean; saveId: string; issues: { level: string; message: string }[] }>(page, 'scenario.play', RECIPE);
  expect(built.ok).toBe(true);
  // a part the lab skipped would leave a nursery out: say which, rather than time out waiting for four broods
  expect(built.issues.filter((i) => i.level === 'error')).toEqual([]);
  await waitForState(page, `g.saveId === ${JSON.stringify(built.saveId)} && Object.keys(g.clutches).length === 5`);
}

/** The next `n` young come out Prismatic while the clock jumps `hours`. */
async function hatch(page: Page, hours: number, n = 4): Promise<void> {
  await aq(page, 'dev.forcePrismatic', 'bred', n);
  await aq(page, 'advance', hours);
  await aq(page, 'dev.forcePrismatic', 'bred', 0);
}

const prismaticYoung = (page: Page) => probe<number>(page, `Object.values(g.creatures).filter(c => c.rareVariant && c.lineage.breederName === 'Your shop').length`);
const selected = (page: Page) => page.evaluate(() => (window as unknown as { __AQ: { ui(): { selectedCreatureId: string | null } } }).__AQ.ui().selectedCreatureId);
const revealTrouble = (errors: string[]) => errors.filter((e) => /reveal|hatch/i.test(e));

test.describe('Rare-hatch reveals', () => {
  test('a rare brood opens one card that pages and opens the animal; it waits behind a dialog and while the player types, closes on Escape or a tap outside, and the switch turns it off', async ({ page }) => {
    test.setTimeout(180_000);
    const errors = collectErrors(page);
    await openApp(page);
    await playScenario(page);
    const card = tid(page, 'hatch-reveal');

    // brood A: three Prismatic young make one card with three pages (after a short build-up)
    await hatch(page, 1, 3);
    expect(await prismaticYoung(page)).toBe(3);
    await expect(card).toBeVisible();
    await expect(tid(page, 'hatch-reveal-name')).toBeVisible();
    await expect(card).toContainText('New for your collection');
    await expect(card.getByTestId('prismatic-badge').first()).toBeVisible();
    await expect(card).toContainText(/Born Prismatic\. About 1 in [\d,]+ young shimmer like this\./);
    await expect(tid(page, 'hatch-reveal-pager')).toHaveText('1 of 3');
    await expect(tid(page, 'hatch-reveal-prev')).toBeDisabled();
    const first = (await tid(page, 'hatch-reveal-name').textContent()) ?? '';
    await tid(page, 'hatch-reveal-next').click();
    await expect(tid(page, 'hatch-reveal-pager')).toHaveText('2 of 3');
    await expect(tid(page, 'hatch-reveal-name')).not.toHaveText(first);
    const second = (await tid(page, 'hatch-reveal-name').textContent()) ?? '';
    // from the keyboard: Next reaches the last page and keeps the focus there (the review's N6: a disabled button
    // dropped it to the page)
    await tid(page, 'hatch-reveal-next').focus();
    await page.keyboard.press('Enter');
    await expect(tid(page, 'hatch-reveal-pager')).toHaveText('3 of 3');
    await expect(tid(page, 'hatch-reveal-next')).toBeDisabled();
    await expect(tid(page, 'hatch-reveal-next')).toBeFocused();
    // the arrows turn it too
    await page.keyboard.press('ArrowLeft');
    await expect(tid(page, 'hatch-reveal-pager')).toHaveText('2 of 3');
    await page.keyboard.press('ArrowRight');
    await expect(tid(page, 'hatch-reveal-pager')).toHaveText('3 of 3');
    // (the second page fades out before the third comes in: wait for the third's name)
    await expect(tid(page, 'hatch-reveal-name')).not.toHaveText(second);
    await expect(tid(page, 'hatch-reveal-name')).not.toHaveText(first);
    // the toast and the log line stay as they were
    expect(await probe<number>(page, `g.log.filter(e => e.kind === 'celebrate' && /^Prismatic!/.test(e.text)).length`)).toBe(3);

    // See it: the card closes and the animal's card opens on that animal
    const name = (await tid(page, 'hatch-reveal-name').textContent()) ?? '';
    const id = await probe<string>(page, `Object.values(g.creatures).find(c => c.name === ${JSON.stringify(name)} && c.rareVariant).id`);
    await tid(page, 'hatch-reveal-see').click();
    await expect(card).toHaveCount(0);
    await expect.poll(() => selected(page)).toBe(id);
    await expect(tid(page, 'creature-card')).toBeVisible();
    await aq(page, 'setUI', { selectedCreatureId: null });

    // brood B arrives while Find anything is open: the card waits for it to close, then opens; Escape closes it
    await page.keyboard.press('Control+k');
    await expect(tid(page, 'find-anything')).toBeVisible();
    const before = await prismaticYoung(page);
    await hatch(page, 6);
    expect(await prismaticYoung(page)).toBeGreaterThan(before);
    await page.waitForTimeout(1500);
    await expect(card).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(tid(page, 'find-anything')).toBeHidden();
    await expect(tid(page, 'hatch-reveal-name')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(card).toHaveCount(0);

    // brood C: a tap outside the card closes it
    await hatch(page, 6);
    await expect(tid(page, 'hatch-reveal-name')).toBeVisible();
    await page.mouse.click(6, 6);
    await expect(card).toHaveCount(0);

    // brood D arrives while the player types in the shop's search box: the card waits (it would take the focus, and a
    // Space or Enter would close it), the typing goes on undisturbed, and it opens once the field is left
    await aq(page, 'setUI', { panel: 'market', panelTarget: 'tab:shop' });
    const search = tid(page, 'shop-search');
    await search.click();
    await page.keyboard.type('gup');
    await hatch(page, 6);
    await page.waitForTimeout(1500);
    await expect(card).toHaveCount(0);
    await page.keyboard.type('py');
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('guppy');
    await search.blur();
    await expect(tid(page, 'hatch-reveal-name')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(card).toHaveCount(0);
    await aq(page, 'setUI', { panel: null });

    // Settings › Notifications › Reveal rare finds off: brood E keeps its toast and log line, and no card opens
    await goHash(page, '#/settings/notifications');
    const sw = tid(page, 'notify-reveal-finds');
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await aq(page, 'setUI', { panel: null });
    await expect(tid(page, 'panel-settings')).toBeHidden();
    const lines = await probe<number>(page, `g.log.filter(e => e.kind === 'celebrate' && /^Prismatic!/.test(e.text)).length`);
    await hatch(page, 6);
    expect(await probe<number>(page, `g.log.filter(e => e.kind === 'celebrate' && /^Prismatic!/.test(e.text)).length`)).toBeGreaterThan(lines);
    await page.waitForTimeout(2000);
    await expect(card).toHaveCount(0);
    expect(revealTrouble(errors)).toEqual([]);
  });

  for (const vp of [
    { name: 'phone', width: 390, height: 844, reduced: false },
    { name: 'phone held sideways, with reduced motion', width: 844, height: 390, reduced: true },
  ]) {
    test(`the card fits a ${vp.name} (${vp.width}×${vp.height}), and Open collection opens the species' card in the Collection`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openApp(page);
      await playScenario(page);
      if (vp.reduced) await page.evaluate(() => (window as unknown as { __AQ: { settings(): { update(p: { reducedMotion: boolean }): void } } }).__AQ.settings().update({ reducedMotion: true }));
      await hatch(page, 1, 3);
      // the card's first frame: a build-up, or (reduced motion) the animal straight away
      const phase = await page.waitForFunction(() => document.querySelector('[data-testid="hatch-reveal"] .ag-hatch')?.getAttribute('data-phase') ?? null, null, { timeout: 15_000 });
      expect(await phase.jsonValue()).toBe(vp.reduced ? 'shown' : 'build');
      await expect(tid(page, 'hatch-reveal-name')).toBeVisible();
      await expect(tid(page, 'hatch-reveal-pager')).toHaveText(/^1 of [2-9]$/);
      for (const id of ['hatch-reveal-see', 'hatch-reveal-collection', 'hatch-reveal-next']) await expect(tid(page, id)).toBeInViewport({ ratio: 1 });
      await expect(tid(page, 'hatch-reveal').getByRole('button', { name: 'Close' })).toBeInViewport({ ratio: 1 });
      // the Collection (chunk 21, feature A) at #/encyclopedia/collection/{species}, the guppies' card open. Held
      // sideways, the scenario lab's own badge ("Scenario: … · not saved", a developer tool players never see) floats
      // over the card's foot and takes the pointer, so there the button is pressed from the keyboard
      if (vp.height < 500) {
        await tid(page, 'hatch-reveal-collection').focus();
        await page.keyboard.press('Enter');
      } else await tid(page, 'hatch-reveal-collection').click();
      await expect(tid(page, 'hatch-reveal')).toHaveCount(0);
      await expect(tid(page, 'panel-encyclopedia')).toBeVisible();
      await expect(tid(page, 'collection')).toBeVisible();
      await expect(tid(page, 'collection-toggle-fancy_guppy')).toHaveAttribute('aria-expanded', 'true');
      await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/encyclopedia/collection/fancy_guppy');
    });
  }
});
