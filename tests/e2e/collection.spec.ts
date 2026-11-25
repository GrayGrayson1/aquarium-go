/**
 * chunk 21 (feature A) — Encyclopedia › Collection on a phone and a desktop: the header, a discovered card (the
 * starter's) and an undiscovered one (a silhouette, never its name), opening a card writes its address, a link to a
 * card (`#/encyclopedia/collection/{speciesId}`) opens it with what is still to find, the species page and the
 * Encyclopedia's subtitle link to it, and nothing scrolls sideways.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid, collectErrors } from './helpers';

const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);
const hash = (page: Page) => page.evaluate(() => location.hash);

/** Back to the tank view and wait for the router to land there, then follow `h` (nav-routes-matrix's walk). */
async function land(page: Page, h: string) {
  await goHash(page, '#/');
  await expect.poll(() => page.evaluate(() => ({ hash: location.hash || '#/', panel: (window as unknown as { __AQ: { ui(): { panel: string | null } } }).__AQ.ui().panel }))).toEqual({ hash: '#/', panel: null });
  await goHash(page, h);
}

/**
 * The panel's chrome after a card is brought into view: only the panel's own list may scroll. Every ancestor of
 * `.pn-body` (the sheet, the page) still at the top, and the Close button on screen (review fix: scrollIntoView moved
 * the sheet and took its header off screen).
 */
const chrome = (page: Page) =>
  page.evaluate(() => {
    const body = document.querySelector<HTMLElement>('[data-testid="panel-encyclopedia"] .pn-body');
    let above = 0;
    for (let el = body?.parentElement ?? null; el; el = el.parentElement) above += el.scrollTop;
    above += window.scrollY;
    const close = document.querySelector('[data-testid="panel-encyclopedia"] [data-testid="panel-close"]')?.getBoundingClientRect();
    const onScreen = !!close && close.top >= 0 && close.left >= 0 && close.bottom <= window.innerHeight && close.right <= window.innerWidth;
    return { above, closeOnScreen: onScreen };
  });
const chromeStays = (page: Page) => expect.poll(() => chrome(page)).toEqual({ above: 0, closeOnScreen: true });

/** Content wider than the sheet's body (its overflow-x is hidden, so a control could sit out of reach). */
const sideways = (page: Page) =>
  page.evaluate(() => {
    const b = document.querySelector('[data-testid="panel-encyclopedia"] .pn-body');
    return b ? b.scrollWidth - b.clientWidth : -1;
  });

async function walk(page: Page) {
  const errors = collectErrors(page);
  await openApp(page);
  await quickGame(page, 'betta', { money: 5000 });
  await aq(page, 'act', 'tutorialSkip');

  await land(page, '#/encyclopedia/collection');
  const panel = tid(page, 'panel-encyclopedia');
  await expect(panel.getByRole('tab', { name: /Collection/, selected: true })).toBeVisible();
  await expect(tid(page, 'collection-summary')).toBeVisible();
  await expect(tid(page, 'collection-percent')).toHaveText(/^\d+(\.\d)?%$/);

  // a discovered card: the starter's species, its picture and its morphs seen
  const betta = tid(page, 'collection-card-betta');
  await expect(betta).toHaveAttribute('data-found', '1');
  await expect(betta).toHaveAttribute('data-status', 'in_progress');
  await expect(betta).toContainText('Betta');
  await expect(betta).toContainText(/1 of [\d,]+ morphs/);
  await expect(betta.locator('.pn-portrait--unknown')).toHaveCount(0);

  // an undiscovered card: a silhouette, "Undiscovered", never its name
  const axo = tid(page, 'collection-card-axolotl');
  await expect(axo).toHaveAttribute('data-found', '0');
  await expect(axo).toHaveAttribute('data-status', 'not_started');
  await expect(axo).toContainText('Undiscovered');
  await expect(axo).not.toContainText('Axolotl');
  await expect(axo.locator('.pn-portrait--unknown')).toHaveCount(1);

  // opening a card shows how to start it and writes its address (the list is scrolled to the card first, as a player
  // would: Playwright's own scroll-before-click may move any ancestor, which is what the chrome check below forbids)
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="collection-card-axolotl"]')!;
    const body = el.closest<HTMLElement>('.pn-body')!;
    body.scrollTop += el.getBoundingClientRect().top - body.getBoundingClientRect().top - 40;
  });
  await chromeStays(page);
  await tid(page, 'collection-toggle-axolotl').click();
  await expect(tid(page, 'collection-toggle-axolotl')).toHaveAttribute('aria-expanded', 'true');
  await expect(tid(page, 'collection-body-axolotl')).toContainText('Find this species to start its card.');
  await expect.poll(() => hash(page)).toBe('#/encyclopedia/collection/axolotl');
  await expect(tid(page, 'collection-toggle-axolotl')).toBeInViewport();
  await chromeStays(page); // opened by a tap: only the list moves
  expect(await sideways(page)).toBeLessThanOrEqual(1);

  // the address changes while the Collection is open: that card opens, in view, and the sheet stays put
  await goHash(page, '#/encyclopedia/collection/betta');
  await expect(tid(page, 'collection-toggle-betta')).toHaveAttribute('aria-expanded', 'true');
  await expect(tid(page, 'collection-toggle-axolotl')).toHaveAttribute('aria-expanded', 'false');
  await expect(tid(page, 'collection-toggle-betta')).toBeInViewport();
  await chromeStays(page);

  // a link to a card opens it (one card at a time) with the morphs still to find, as grey outlines
  await land(page, '#/encyclopedia/collection/betta');
  await expect(tid(page, 'collection-toggle-betta')).toHaveAttribute('aria-expanded', 'true');
  await expect(tid(page, 'collection-toggle-axolotl')).toHaveAttribute('aria-expanded', 'false');
  await expect(tid(page, 'collection-toggle-betta')).toBeInViewport();
  await chromeStays(page); // opened by an address: the panel's header and Close stay on screen
  const body = tid(page, 'collection-body-betta');
  await expect(body.getByTestId('collection-missing').first()).toBeVisible();
  await expect(body.getByTestId('collection-missing')).toHaveCount(12);
  await expect(body.getByTestId('collection-seen')).toHaveCount(1);
  await expect(body).toContainText('Still to find');
  expect(await sideways(page)).toBeLessThanOrEqual(1);

  // the species page links to its card
  await land(page, '#/encyclopedia/betta');
  await tid(page, 'enc-to-collection').click();
  await expect(tid(page, 'collection-toggle-betta')).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => hash(page)).toBe('#/encyclopedia/collection/betta');

  // and the Encyclopedia's subtitle, from the species list
  await land(page, '#/encyclopedia');
  await expect(panel.getByRole('tab', { name: /Species/, selected: true })).toBeVisible();
  await tid(page, 'enc-collection-link').click();
  await expect(panel.getByRole('tab', { name: /Collection/, selected: true })).toBeVisible();
  await expect.poll(() => hash(page)).toBe('#/encyclopedia/collection');

  expect(errors, errors.join('\n')).toEqual([]);
}

test.describe('the Collection', () => {
  test.describe('desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test('1440×900', async ({ page }) => {
      test.setTimeout(180_000);
      await walk(page);
    });
  });

  test.describe('phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    test('390×844', async ({ page }) => {
      test.setTimeout(180_000);
      await walk(page);
    });
  });
});
