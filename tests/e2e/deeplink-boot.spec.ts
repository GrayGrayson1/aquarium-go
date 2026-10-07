/**
 * lane:ui-shell (chunk 1; 0.5 spec §6.4, §20.2; ADR-0019; NAV-013, DES-004) — opening the game from a link in a fresh
 * page: with a save, the loading card and then the screen; a gone target lands on its empty state; with no save, the
 * screen opens once New Game is done; a plain or broken link shows the title.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid, devUrl, onboardViaUI } from './helpers';

/** Record the loading card as the page boots (it may be up for only a moment). */
async function watchBootCard(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __bootCard?: { line: string; dest: string | null } };
    new MutationObserver(() => {
      const card = document.querySelector('[data-testid="boot-deeplink"]');
      if (card && !w.__bootCard) w.__bootCard = { line: card.querySelector('.ag-boot__line')?.textContent ?? '', dest: card.querySelector('[data-testid="boot-deeplink-dest"]')?.textContent ?? null };
    }).observe(document, { childList: true, subtree: true });
  });
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => !!(window as unknown as { __AQ?: { ready?: boolean } }).__AQ?.ready, null, { timeout: 30_000 });
}

const screen = (page: Page) => page.evaluate(() => (window as unknown as { __AQ: { summary(): { screen: string } } }).__AQ.summary().screen);

/** A saved game in this browser context (its storage is shared by every page the test opens). */
async function savedGame(page: Page): Promise<void> {
  await openApp(page);
  await quickGame(page, 'betta');
  await aq(page, 'act', 'tutorialSkip');
  expect(await aq<boolean>(page, 'autosave')).toBe(true);
}

test.describe('opening the game from a link (desktop 1440×900)', () => {
  test('with a save, the loading card names the screen, then Livestock › Eggs & fry opens', async ({ page, context }) => {
    await savedGame(page);
    const fresh = await context.newPage();
    await watchBootCard(fresh);
    await fresh.goto(devUrl('/#/livestock/eggs'), { waitUntil: 'domcontentloaded' });
    await ready(fresh);
    expect(await screen(fresh)).toBe('game');
    expect(await fresh.evaluate(() => (window as unknown as { __bootCard?: unknown }).__bootCard)).toEqual({ line: 'Loading your save…', dest: 'Then: Livestock › Eggs & fry' });
    await expect(tid(fresh, 'boot-deeplink')).toHaveCount(0);
    await expect(tid(fresh, 'panel-livestock').getByRole('tab', { name: /Eggs & fry/ })).toHaveAttribute('aria-selected', 'true');
    await expect(tid(fresh, 'title-continue')).toHaveCount(0);
    expect(await fresh.evaluate(() => location.hash)).toBe('#/livestock/eggs');
  });

  test('a link to an offer that has gone lands on “This offer has gone”', async ({ page, context }) => {
    await savedGame(page);
    const fresh = await context.newPage();
    await fresh.goto(devUrl('/#/shop/fish/offer_zz00'), { waitUntil: 'domcontentloaded' });
    await ready(fresh);
    await expect(tid(fresh, 'panel-market').getByText('This offer has gone')).toBeVisible();
  });

  test('a plain link to #/ shows the title, and a broken link the title, then its toast after Continue', async ({ page, context }) => {
    await savedGame(page);
    const plain = await context.newPage();
    await plain.goto(devUrl('/#/'), { waitUntil: 'domcontentloaded' });
    await ready(plain);
    await expect(tid(plain, 'title-continue')).toBeVisible();
    expect(await plain.evaluate(() => location.hash)).toBe('');

    const broken = await context.newPage();
    await broken.goto(devUrl('/#/aquarium/nowhere'), { waitUntil: 'domcontentloaded' });
    await ready(broken);
    await expect(tid(broken, 'title-continue')).toBeVisible();
    await tid(broken, 'title-continue').click();
    await expect(tid(broken, 'hud-money')).toBeVisible();
    await expect(broken.locator('[data-testid="toast"]').filter({ hasText: 'That link doesn’t go anywhere' })).toBeVisible();
  });

  test('with no save, the link waits through onboarding and opens Build › Tanks once', async ({ page }) => {
    await page.goto(devUrl('/#/build/tanks'), { waitUntil: 'domcontentloaded' });
    await ready(page);
    await expect(tid(page, 'title-new-game')).toBeVisible();
    await onboardViaUI(page, 'betta', 'Linky');
    await expect(tid(page, 'panel-build')).toBeVisible();
    await expect(tid(page, 'build-tab-tanks')).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => location.hash)).toBe('#/build');
    // once: closing Build leaves it closed
    await page.keyboard.press('Escape');
    await expect(tid(page, 'panel-build')).toBeHidden();
    await page.waitForTimeout(600);
    await expect(tid(page, 'panel-build')).toBeHidden();
  });
});
