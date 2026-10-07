/**
 * lane:ui-shell (chunk 1; NAV-010, NAV-016; 0.5 spec §6.2, §21 Phase 1 "Done when") — every §6.2 route except
 * Social and Production (chunks 6 and 4) opens the right screen, tab or sub-view, on desktop and on a phone.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid, probe } from './helpers';

const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);
const selectedTab = (page: Page, root: string, name: string | RegExp) => tid(page, root).getByRole('tab', { name, selected: true });

interface Ids {
  tank: string;
  creature: string;
  offer: string;
}

type Check = (page: Page, phone: boolean) => Promise<void>;

/** [route, what it must open] — `{tank}`, `{creature}` and `{offer}` are this game's ids. */
const ROUTES: [string, Check][] = [
  ['#/tanks', (p) => expect(tid(p, 'panel-tanks')).toBeVisible()],
  // (a tab's name may end with its attention dot's label)
  ['#/tanks/{tank}', (p) => expect(selectedTab(p, 'tank-card', /^Water/)).toBeVisible()],
  ['#/tanks/{tank}/equipment', (p) => expect(selectedTab(p, 'tank-card', /^Equipment/)).toBeVisible()],
  ['#/tanks/{tank}/life', (p) => expect(selectedTab(p, 'tank-card', /^Life/)).toBeVisible()],
  ['#/tanks/{tank}/value', (p) => expect(selectedTab(p, 'tank-card', 'Value')).toBeVisible()],
  ['#/livestock', (p) => expect(selectedTab(p, 'panel-livestock', /Animals/)).toBeVisible()],
  ['#/livestock/eggs', (p) => expect(selectedTab(p, 'panel-livestock', /Eggs & fry/)).toBeVisible()],
  ['#/livestock/past', (p) => expect(selectedTab(p, 'panel-livestock', 'Past residents')).toBeVisible()],
  ['#/livestock/animal/{creature}', (p) => expect(tid(p, 'creature-card')).toBeVisible()],
  ['#/shop', (p) => expect(selectedTab(p, 'panel-market', 'Shop')).toBeVisible()],
  ['#/shop?env=marine', (p) => expect(tid(p, 'panel-market').getByRole('button', { name: 'Marine', pressed: true })).toBeVisible()],
  ['#/shop/fish/{offer}', (p) => expect(tid(p, 'buy-offer')).toBeVisible()],
  ['#/market/supplies', (p) => expect(selectedTab(p, 'panel-market', 'Supplies')).toBeVisible()],
  ['#/market/listings', (p, phone) => expect(selectedTab(p, 'panel-market', phone ? /^Listings/ : /^My listings/)).toBeVisible()],
  ['#/market/history', (p, phone) => expect(selectedTab(p, 'panel-market', phone ? 'Trends' : 'History & demand')).toBeVisible()],
  ['#/build', (p) => expect(tid(p, 'build-tab-tanks')).toHaveAttribute('aria-selected', 'true')],
  ['#/build/decor', (p) => expect(tid(p, 'build-tab-decor')).toHaveAttribute('aria-selected', 'true')],
  ['#/build/equipment', (p) => expect(tid(p, 'build-tab-equipment')).toHaveAttribute('aria-selected', 'true')],
  ['#/build/substrate', (p) => expect(tid(p, 'build-tab-substrate')).toHaveAttribute('aria-selected', 'true')],
  ['#/build/facility', (p) => expect(tid(p, 'build-tab-facility')).toHaveAttribute('aria-selected', 'true')],
  ['#/visitors', (p) => expect(tid(p, 'visitors-tab-visitors')).toHaveAttribute('aria-selected', 'true')],
  ['#/visitors/staff', (p) => expect(tid(p, 'visitors-tab-staff')).toHaveAttribute('aria-selected', 'true')],
  ['#/shows', (p) => expect(tid(p, 'shows-tab-upcoming')).toHaveAttribute('aria-selected', 'true')],
  ['#/shows/entries', (p) => expect(tid(p, 'shows-tab-entries')).toHaveAttribute('aria-selected', 'true')],
  ['#/shows/results', (p) => expect(tid(p, 'shows-tab-results')).toHaveAttribute('aria-selected', 'true')],
  ['#/shows/trophies', (p) => expect(tid(p, 'shows-tab-trophies')).toHaveAttribute('aria-selected', 'true')],
  ['#/research', (p) => expect(tid(p, 'research-tab-research')).toHaveAttribute('aria-selected', 'true')],
  ['#/research/unlocks', (p) => expect(tid(p, 'research-tab-unlocks')).toHaveAttribute('aria-selected', 'true')],
  ['#/research/quests', (p) => expect(tid(p, 'research-tab-quests')).toHaveAttribute('aria-selected', 'true')],
  ['#/research/achievements', (p) => expect(tid(p, 'research-tab-achievements')).toHaveAttribute('aria-selected', 'true')],
  ['#/finances', (p) => expect(tid(p, 'panel-finances')).toBeVisible()],
  ['#/encyclopedia', (p) => expect(selectedTab(p, 'panel-encyclopedia', /Species/)).toBeVisible()],
  ['#/encyclopedia/science', (p) => expect(selectedTab(p, 'panel-encyclopedia', /Aquarium science/)).toBeVisible()],
  ['#/encyclopedia/science/nitrogen_cycle', (p) => expect(tid(p, 'panel-encyclopedia').getByRole('button', { name: /The nitrogen cycle/, expanded: true })).toBeVisible()],
  ['#/encyclopedia/betta', (p) => expect(tid(p, 'panel-encyclopedia').getByRole('heading', { name: /Betta/ }).first()).toBeVisible()],
  ['#/settings', (p) => expect(tid(p, 'settings-tab-general')).toHaveAttribute('aria-selected', 'true')],
  ['#/settings/play', (p) => expect(tid(p, 'settings-tab-display')).toHaveAttribute('aria-selected', 'true')],
  ['#/settings/saves', (p) => expect(tid(p, 'settings-tab-saves')).toHaveAttribute('aria-selected', 'true')],
  ['#/settings/about', (p) => expect(tid(p, 'settings-tab-about')).toHaveAttribute('aria-selected', 'true')],
  [
    '#/more',
    async (p, phone) => {
      if (phone) await expect(tid(p, 'more-sheet')).toBeVisible();
      else await expect.poll(() => p.evaluate(() => location.hash)).toBe('#/');
    },
  ],
  ['#/log', (p) => expect(tid(p, 'panel-log')).toBeVisible()],
];

async function routeGame(page: Page): Promise<Ids> {
  await openApp(page);
  await quickGame(page, 'betta', { money: 5000 });
  await aq(page, 'act', 'tutorialSkip');
  expect((await aq<{ ok: boolean }>(page, 'dev.addShopOffer', 'mystery_snail')).ok).toBe(true);
  return probe<Ids>(page, `({ tank: g.tankOrder[0], creature: Object.values(g.creatures).find(c => c.isStarter).id, offer: g.market.stock[g.market.stock.length - 1].id })`);
}

async function walk(page: Page, ids: Ids, phone: boolean) {
  for (const [route, check] of ROUTES) {
    const h = route.replace('{tank}', ids.tank).replace('{creature}', ids.creature).replace('{offer}', ids.offer);
    await goHash(page, '#/');
    await goHash(page, h);
    await test.step(h, () => check(page, phone));
  }
}

test.describe('every §6.2 route opens its screen', () => {
  test('desktop 1440×900', async ({ page }) => {
    test.setTimeout(240_000);
    await walk(page, await routeGame(page), false);
  });

  test.describe('phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    test('390×844', async ({ page }) => {
      test.setTimeout(240_000);
      await walk(page, await routeGame(page), true);
    });
  });
});
