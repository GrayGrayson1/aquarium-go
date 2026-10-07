/**
 * lane:ui-shell (chunk 1; 0.5 spec §6, §20.2; NAV-008, NAV-010 to NAV-016, ACC-001) — hash routes on desktop:
 * links into a running game, Back / Forward / Esc, unknown and gone links, a reload reopening the screen in the
 * address (ADR-0019), locked destinations, Copy link (never with ?dev=1) and tab strips that follow the address.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid, probe, collectErrors } from './helpers';

const hash = (page: Page) => page.evaluate(() => location.hash);
/** Follow a link inside the running game (a new history entry, then hashchange), as clicking an <a href="#/…"> would. */
const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);
const ui = (page: Page) => page.evaluate(() => (window as unknown as { __AQ: { ui(): { panel: string | null; panelTarget: string | null } } }).__AQ.ui());
/** The newest toast raised (from the store: on screen, a burst of them may still be queued behind older ones). */
const lastToast = (page: Page) => page.evaluate(() => (window as unknown as { __AQ: { ui(): { toasts: { text: string; detail?: string }[] } } }).__AQ.ui().toasts.at(-1) ?? null);

async function offerGame(page: Page): Promise<string> {
  await openApp(page);
  await quickGame(page, 'betta', { money: 5000 });
  await aq(page, 'act', 'tutorialSkip');
  expect((await aq<{ ok: boolean }>(page, 'dev.addShopOffer', 'mystery_snail')).ok).toBe(true);
  return probe<string>(page, 'g.market.stock[g.market.stock.length - 1].id');
}

test.describe('hash routes (desktop 1440×900)', () => {
  test('a link to an offer opens it; Back shows the shop, Forward the offer again, Esc closes to #/', async ({ page }) => {
    const id = await offerGame(page);
    await expect.poll(() => hash(page)).toBe('#/');
    await goHash(page, `#/shop/fish/${id}`);
    await expect(tid(page, 'buy-offer')).toBeVisible();
    await expect.poll(() => hash(page)).toBe(`#/shop/fish/${id}`);

    // the player's own way there: the dock, then the offer's card
    await goHash(page, '#/');
    await expect(tid(page, 'panel-market')).toBeHidden();
    await tid(page, 'dock-market').click();
    await expect.poll(() => hash(page)).toBe('#/shop');
    const index = await probe<number>(page, `g.market.stock.findIndex(o => o.id === ${JSON.stringify(id)})`);
    await tid(page, `shop-offer-${index}`).click();
    await expect(tid(page, 'buy-offer')).toBeVisible();
    await expect.poll(() => hash(page)).toBe(`#/shop/fish/${id}`);

    await page.goBack();
    await expect.poll(() => hash(page)).toBe('#/shop');
    await expect(tid(page, 'buy-offer')).toBeHidden();
    await expect(tid(page, 'panel-market')).toBeVisible();
    await page.goForward();
    await expect(tid(page, 'buy-offer')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(tid(page, 'panel-market')).toBeHidden();
    await expect.poll(() => hash(page)).toBe('#/');
  });

  test('switching tabs rewrites the address, and arrow keys move between tabs', async ({ page }) => {
    await offerGame(page);
    await tid(page, 'dock-livestock').click();
    await expect.poll(() => hash(page)).toBe('#/livestock');
    const strip = tid(page, 'panel-livestock').getByRole('tablist');
    await expect(strip.getByRole('tab', { selected: true })).toHaveCount(1);
    await strip.getByRole('tab', { name: /Eggs & fry/ }).click();
    await expect.poll(() => hash(page)).toBe('#/livestock/eggs');
    await strip.getByRole('tab', { name: /Eggs & fry/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => hash(page)).toBe('#/livestock/past');
    await expect(strip.getByRole('tab', { name: 'Past residents' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => hash(page)).toBe('#/livestock/eggs');

    await goHash(page, '#/settings/play');
    await expect(tid(page, 'settings-tab-display')).toHaveAttribute('aria-selected', 'true');
    await tid(page, 'settings-tab-about').click();
    await expect.poll(() => hash(page)).toBe('#/settings/about');
    await goHash(page, '#/settings/notifications'); // built in chunk 3: General until then
    await expect(tid(page, 'settings-tab-general')).toHaveAttribute('aria-selected', 'true');
  });

  test('broken, unknown-tab and gone links (§6.5, ADR-0019)', async ({ page }) => {
    const errors = collectErrors(page);
    await offerGame(page);
    await goHash(page, '#/nowhere');
    await expect(page.locator('[data-testid="toast"]').filter({ hasText: 'That link doesn’t go anywhere' })).toBeVisible();
    expect(await lastToast(page)).toMatchObject({ text: 'That link doesn’t go anywhere', detail: 'Opened your aquarium instead.' });
    await expect.poll(() => hash(page)).toBe('#/');
    expect((await ui(page)).panel).toBeNull();

    await goHash(page, '#/build/notatab');
    await expect(tid(page, 'build-tab-tanks')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => hash(page)).toBe('#/build');

    await goHash(page, '#/shop/fish/offer_zz00');
    await expect(tid(page, 'panel-market').getByText('This offer has gone')).toBeVisible();

    await goHash(page, '#/tanks/tank_nope');
    await expect(tid(page, 'panel-tanks')).toBeVisible();
    expect(await lastToast(page)).toMatchObject({ text: 'That tank isn’t in your aquarium', detail: 'Showing your tanks instead.' });
    await goHash(page, '#/livestock/animal/cr_nope');
    await expect(tid(page, 'panel-livestock')).toBeVisible();
    expect(await lastToast(page)).toMatchObject({ text: 'That animal isn’t in your aquarium' });
    await goHash(page, '#/market/listings/listing_nope');
    await expect(tid(page, 'panel-market')).toBeVisible();
    expect(await lastToast(page)).toMatchObject({ text: 'That listing isn’t here any more' });
    await goHash(page, '#/encyclopedia/dragon');
    await expect(tid(page, 'panel-encyclopedia')).toBeVisible();
    expect(await lastToast(page)).toMatchObject({ text: 'There’s no page for that species' });
    expect(errors, errors.join('\n')).toEqual([]); // NAV-014 A3: no console error on the way
  });

  test('after “Save and return to title”, Back doesn’t reopen the game (NAV-012 A3)', async ({ page }) => {
    const id = await offerGame(page);
    await goHash(page, `#/shop/fish/${id}`);
    await expect(tid(page, 'buy-offer')).toBeVisible();
    await goHash(page, '#/settings/saves');
    await tid(page, 'panel-settings').getByRole('button', { name: 'Save and return to title' }).click();
    await expect(tid(page, 'title-continue')).toBeVisible();
    expect(await hash(page)).toBe('');
    await page.goBack(); // into the ended game's offer entry
    await page.waitForTimeout(800);
    await expect(tid(page, 'title-continue')).toBeVisible();
    await expect(tid(page, 'boot-deeplink')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __AQ: { summary(): { screen: string } } }).__AQ.summary().screen)).toBe('title');
    expect(await hash(page)).toBe('');
  });

  test('a reload reopens the screen in the address (ADR-0019 decision 2)', async ({ page }) => {
    await offerGame(page);
    expect(await aq<boolean>(page, 'autosave')).toBe(true);
    await goHash(page, '#/settings/saves');
    await expect(tid(page, 'settings-tab-saves')).toHaveAttribute('aria-selected', 'true');
    const saveId = await probe<string>(page, 'g.saveId');
    await page.reload();
    await page.waitForFunction(() => !!(window as unknown as { __AQ?: { ready?: boolean } }).__AQ?.ready, null, { timeout: 30_000 });
    await expect(tid(page, 'panel-settings')).toBeVisible();
    await expect(tid(page, 'settings-tab-saves')).toHaveAttribute('aria-selected', 'true');
    expect(await hash(page)).toBe('#/settings/saves');
    expect(await probe<string>(page, 'g.saveId')).toBe(saveId);
    await expect(tid(page, 'title-continue')).toHaveCount(0);
  });

  test('locked destinations open their locked panel, from the dock and from links (§5.7)', async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta', { unlockAll: false });
    await tid(page, 'dock-visitors').click();
    const visitors = tid(page, 'panel-visitors');
    await expect(visitors.getByText('Visitors open with a Specialty Shop')).toBeVisible();
    await expect(visitors.getByRole('tablist')).toHaveCount(0);
    // the dock no longer answers a locked destination with a toast (lockedToast)
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { __AQ: { ui(): { toasts: { text: string }[] } } }).__AQ.ui().toasts.filter((t) => /locked|opens once you move/i.test(t.text)).length)).toBe(0);
    await visitors.getByRole('button', { name: 'Open Build › Facility' }).click();
    await expect.poll(() => hash(page)).toBe('#/build/facility');
    await expect(tid(page, 'build-tab-facility')).toHaveAttribute('aria-selected', 'true');

    await goHash(page, '#/visitors/staff');
    await expect(tid(page, 'locked-visitors')).toBeVisible();
    await goHash(page, '#/shows/results');
    await expect(tid(page, 'locked-shows')).toContainText('Shows unlock after the guide');
    await expect(tid(page, 'locked-shows')).toContainText('Finish the guide or reach 20 reputation to enter club shows.');
    await expect(tid(page, 'dock-shows').locator('.ag-dock__lock')).toHaveCount(1);

    await aq(page, 'dev.unlockAll');
    await expect(tid(page, 'locked-shows')).toHaveCount(0);
    await expect(tid(page, 'panel-shows').getByRole('tablist')).toBeVisible();
    await expect(tid(page, 'dock-shows').locator('.ag-dock__lock')).toHaveCount(0);
  });

  test('Copy link copies the offer’s share link, never with ?dev=1 (§6.6, NAV-015)', async ({ page, context, baseURL }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const id = await offerGame(page);
    expect(page.url()).toContain('dev=1');
    await goHash(page, `#/shop/fish/${id}`);
    const copy = tid(page, 'offer-copy-link');
    await expect(copy).toHaveText('Copy link');
    await copy.click();
    await expect(copy).toHaveText('Link copied');
    const expected = `${new URL(baseURL!).origin}/#/shop/fish/${id}`;
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    await expect(tid(page, 'offer-link-row').locator('input')).toHaveValue(expected);
    // back to "Copy link" after 4 s
    await expect(copy).toHaveText('Copy link', { timeout: 6_000 });
  });

  test('when the clipboard refuses, the link is shown selected for a manual copy (NAV-015 A3)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } });
      document.execCommand = () => false;
    });
    const id = await offerGame(page);
    await goHash(page, `#/shop/fish/${id}`);
    await tid(page, 'offer-copy-link').click();
    const input = tid(page, 'offer-link-row').locator('input');
    await expect(input).toBeFocused();
    await expect(tid(page, 'offer-copy-link')).toHaveText('Copy link');
    const sel = await input.evaluate((el: HTMLInputElement) => ({ start: el.selectionStart, end: el.selectionEnd, len: el.value.length, value: el.value }));
    expect(sel.start).toBe(0);
    expect(sel.end).toBe(sel.len);
    expect(sel.value).toMatch(new RegExp(`/#/shop/fish/${id}$`));
  });

  test('opening a panel moves focus into it, and Escape hands it back to its dock button (§18)', async ({ page }) => {
    await offerGame(page);
    await tid(page, 'dock-market').focus();
    await page.keyboard.press('Enter');
    await expect(tid(page, 'panel-market')).toBeVisible();
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-testid="panel-market"]'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(tid(page, 'panel-market')).toBeHidden();
    await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid)).toBe('dock-market');
  });
});
