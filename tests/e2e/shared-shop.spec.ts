/**
 * Chunk 13 (SHARED-SHOPS.md §7, §8, §9.2; SHARE-004 to SHARE-014, SHARE-018): a club's shared shop in the game itself,
 * two browser contexts on the stub server (`SHOPS_STUB=1`, started by playwright.config.ts; never the live one). The
 * owner creates the club's shop from its card in Social through the new-game screens, a member opens it from the
 * card, and then: a purchase in one appears in the other with the name in front of its alerts line; pause is refused,
 * then granted, and pops up for the other; first one wins, naming the first; a listing photo shows on both; leaving
 * brings your own game back unchanged, with no catch-up; "Still here?"; and a reconnect after the server goes down
 * and comes back. Each context signs in to the local Social stub through its stored record.
 */
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { aq, openApp, quickGame, tid } from './helpers';

const CLUB = 'highland-betta';
const SOCIAL_KEY = 'aquarium-go.social.v1';
const RESTART_PORT = Number(process.env.E2E_SHOPS_RESTART_PORT ?? 4395);

type Visit = { phase: string; you: { id: string; name: string } | null; members: { id: string; name: string; here: boolean; pause: boolean }[]; shopName: string; closing: { why: string } | null };

const contexts: BrowserContext[] = [];
test.afterEach(async () => {
  for (const c of contexts.splice(0)) await c.close().catch(() => {});
});

/** A context signed in to the local Social stub as `name`, a member of the club (the owner's account with `owner`). */
async function player(browser: Browser, name: string, opts: { owner?: boolean; path?: string } = {}): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  contexts.push(ctx);
  const record = { email: `${name.toLowerCase()}@example.com`, displayName: name, joinedClubIds: [CLUB], joinedMonths: { [CLUB]: '2026-10' }, ...(opts.owner ? { owner: true } : {}) };
  await ctx.addInitScript(
    ([key, value]) => {
      try {
        if (!localStorage.getItem(key)) localStorage.setItem(key, value);
        localStorage.setItem('aquarium-go.notify.v1', JSON.stringify({ quietHours: false }));
      } catch {
        /* ignore */
      }
    },
    [SOCIAL_KEY, JSON.stringify(record)] as const,
  );
  const page = await ctx.newPage();
  await openApp(page, opts.path ?? '/');
  await quickGame(page, 'betta');
  await aq(page, 'act', 'tutorialSkip');
  return page;
}

const visit = (page: Page) => aq<Visit>(page, 'shared.visit');

async function inShop(page: Page): Promise<void> {
  await expect(tid(page, 'shared-strip')).toBeVisible({ timeout: 90_000 });
  // the first-time card, once per shop on the device
  const ok = tid(page, 'shared-first-time-ok');
  if (await ok.isVisible().catch(() => false)) await ok.click();
}

async function openClubCard(page: Page): Promise<void> {
  await page.evaluate(() => void (location.hash = '#/social/clubs'));
  await expect(tid(page, `shared-card-${CLUB}`)).toBeVisible({ timeout: 20_000 });
}

/** The owner makes the club's shop from its card: the new-game screens titled "New shared shop", then the shop. */
async function createShop(page: Page): Promise<void> {
  await openClubCard(page);
  await tid(page, `shared-card-${CLUB}`).getByTestId('shared-create').click();
  await expect(page.getByText('New shared shop').first()).toBeVisible({ timeout: 20_000 });
  await tid(page, 'starter-card-betta').click();
  await tid(page, 'starter-confirm').click();
  await tid(page, 'name-input').fill('Sapphire');
  await tid(page, 'name-confirm').click();
  await inShop(page);
}

async function openShop(page: Page): Promise<void> {
  await openClubCard(page);
  const open = tid(page, `shared-card-${CLUB}`).getByTestId('shared-open');
  await expect(open).toBeVisible({ timeout: 30_000 });
  await open.click();
  await inShop(page);
}

/** The owner's shop, created once per test (the stub server keeps it while it runs: later tests join it). */
async function ownerAndMember(browser: Browser): Promise<{ ola: Page; ben: Page }> {
  const ola = await player(browser, 'Ola', { owner: true });
  await openClubCard(ola);
  const card = tid(ola, `shared-card-${CLUB}`);
  if (await card.getByTestId('shared-create').isVisible().catch(() => false)) await createShop(ola);
  else await openShop(ola);
  const ben = await player(browser, 'Ben');
  await openShop(ben);
  await expect.poll(async () => (await visit(ola)).members.filter((m) => m.here).length, { timeout: 20_000 }).toBe(2);
  return { ola, ben };
}

const gameOf = (page: Page) => aq<{ finance: { money: number }; clock: { speed: number; hour: number }; inventory: { foods: Record<string, number> }; creatures: Record<string, { id: string; status: string; isStarter?: boolean }>; log: { text: string; byName?: string }[]; saveId: string }>(page, 'game');

test.describe('Shared shops (two browsers on the stub server)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(240_000);

  test('the owner creates the shop from the club card; a member opens it; a purchase shows on both, with the name in the alerts', async ({ browser }) => {
    const { ola, ben } = await ownerAndMember(browser);
    await expect(tid(ola, 'shared-strip')).toContainText('Shared · ');
    await expect(tid(ola, 'shared-strip')).toContainText('Here: ');
    await expect(tid(ben, 'shared-strip')).toContainText('Ola');
    const food = Object.keys((await gameOf(ola)).inventory.foods)[0];
    const res = await aq<{ ok: boolean; message: string }>(ola, 'cmd', { k: 'buyFood', food, packs: 1 });
    expect(res.ok, res.message).toBe(true);
    const money = (await gameOf(ola)).finance.money;
    await expect.poll(async () => (await gameOf(ben)).finance.money, { timeout: 10_000 }).toBe(money);
    await tid(ben, 'hud-alerts').click();
    await expect(ben.locator('.ag-event__text', { hasText: /^Ola: / }).first()).toBeVisible();
  });

  test('pause is refused for a member, then the owner grants it and the pause pops up for the owner', async ({ browser }) => {
    const { ola, ben } = await ownerAndMember(browser);
    await tid(ben, 'hud-speed-0').click();
    await expect(ben.getByText('Only Ola and the people they choose can pause or change the speed.')).toBeVisible();
    const benId = (await visit(ben)).you!.id;
    await tid(ola, 'shared-strip-members').click();
    await tid(ola, `shared-grant-${benId}`).click();
    await expect.poll(async () => (await visit(ben)).members.find((m) => m.id === benId)?.pause, { timeout: 10_000 }).toBe(true);
    await tid(ben, 'hud-speed-0').click();
    await expect.poll(async () => (await gameOf(ola)).clock.speed, { timeout: 10_000 }).toBe(0);
    await expect(ola.getByText('Ben paused the shop.')).toBeVisible();
    // and back, for the tests after
    await aq(ben, 'cmd', { k: 'setSpeed', speed: 1 });
  });

  test('first one wins: two members sell the same fish, and the second is told who sold it first', async ({ browser }) => {
    const { ola, ben } = await ownerAndMember(browser);
    const g = await gameOf(ola);
    const fish = Object.values(g.creatures).find((c) => c.status === 'alive' && !c.isStarter) ?? Object.values(g.creatures).find((c) => c.status === 'alive')!;
    const cmd = { k: 'quickSell', creatures: [fish.id] };
    const [a, b] = await Promise.all([aq<{ ok: boolean; message: string }>(ola, 'cmd', cmd), aq<{ ok: boolean; message: string }>(ben, 'cmd', cmd)]);
    const results = [a, b];
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)!.message).toMatch(/^(Ola|Ben) already sold that fish\.$/);
  });

  test('a listing photo shows on both screens, drawn from the picture the server sends', async ({ browser }) => {
    const { ola, ben } = await ownerAndMember(browser);
    const photo = await ola.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 40;
      const x = c.getContext('2d')!;
      x.fillStyle = '#2fc4b2';
      x.fillRect(0, 0, 64, 40);
      return c.toDataURL('image/jpeg', 0.8);
    });
    const g = await gameOf(ola);
    const fish = Object.values(g.creatures).find((c) => c.status === 'alive')!;
    const res = await aq<{ ok: boolean; message: string }>(ola, 'cmd', { k: 'createListing', kind: 'creature', creatures: [fish.id], reserve: 10, hours: 24, title: 'Photo test', photo });
    expect(res.ok, res.message).toBe(true);
    for (const page of [ola, ben]) {
      await page.evaluate(() => void (location.hash = '#/market/listings'));
      await expect(tid(page, 'listing-photo-shared').first()).toBeVisible({ timeout: 20_000 });
      const src = await tid(page, 'listing-photo-shared').first().getAttribute('src');
      expect(src).toMatch(/^blob:/);
    }
  });

  test('leaving brings your own aquarium back as it was, with no catch-up for the time away', async ({ browser }) => {
    const ben = await player(browser, 'Ben');
    const before = await gameOf(ben); // running at 1×: 0.1 game hours a real second
    expect(before.clock.speed).toBe(1);
    await openShop(ben);
    await ben.waitForTimeout(15_000); // caught up, these 15 seconds would be 1.5 game hours
    await tid(ben, 'shared-back').click();
    await expect(tid(ben, 'shared-strip')).toBeHidden();
    await expect.poll(async () => (await gameOf(ben)).saveId, { timeout: 20_000 }).toBe(before.saveId);
    await aq(ben, 'dev.setSpeed', 0);
    const after = await gameOf(ben);
    expect(after.finance.money).toBe(before.finance.money);
    // only the moments before the save and after the return ran here
    expect(after.clock.hour - before.clock.hour).toBeLessThan(0.7);
    await expect(tid(ben, 'welcome-back')).toHaveCount(0);
  });

  test('"Still here?" after 30 quiet minutes; answered, the player stays; unanswered, they count as away', async ({ browser }) => {
    const { ola, ben } = await ownerAndMember(browser);
    await aq(ben, 'shared.quiet', 30 * 60_000);
    await expect(tid(ben, 'shared-still-here')).toBeVisible();
    await tid(ben, 'shared-still-here-yes').click();
    await expect(tid(ben, 'shared-still-here')).toBeHidden();
    await aq(ben, 'shared.quiet', 31 * 60_000);
    const benId = (await visit(ben)).you!.id;
    await expect.poll(async () => (await visit(ola)).members.find((m) => m.id === benId)?.here, { timeout: 10_000 }).toBe(false);
  });
});

test.describe('Shared shops: the server goes down and comes back', () => {
  test.setTimeout(240_000);
  let server: ChildProcess | null = null;
  const start = async () => {
    server = spawn(process.execPath, ['dist-server/main.js'], { env: { ...process.env, PORT: String(RESTART_PORT), SHOPS_STUB: '1', ALLOWED_ORIGINS: 'http://127.0.0.1:*' }, stdio: 'ignore' });
    const until = Date.now() + 30_000;
    for (;;) {
      const up = await fetch(`http://127.0.0.1:${RESTART_PORT}/health`).then((r) => r.ok, () => false);
      if (up) return;
      if (Date.now() > until) throw new Error('the restart test server did not start');
      await new Promise((r) => setTimeout(r, 200));
    }
  };
  test.afterEach(() => {
    server?.kill('SIGKILL');
    server = null;
  });

  test('a dropped connection says so, reconnects when the server is back, and the shop is on screen again', async ({ browser }) => {
    await start();
    const ben = await player(browser, 'Ben', { path: `/?shops=${encodeURIComponent(`http://127.0.0.1:${RESTART_PORT}`)}` });
    await aq(ben, 'shared.open', { id: 'new_betta', name: 'new_betta' });
    await inShop(ben);
    server!.kill('SIGKILL');
    server = null;
    await expect(tid(ben, 'shared-notice')).toHaveAttribute('data-kind', 'lost', { timeout: 30_000 });
    await expect(ben.getByText('Lost the connection to the shared shop. Reconnecting…')).toBeVisible();
    await start();
    await expect.poll(async () => (await visit(ben)).phase, { timeout: 60_000 }).toBe('open');
    await expect(tid(ben, 'shared-notice')).toBeHidden();
    await expect(tid(ben, 'shared-strip')).toBeVisible();
  });
});
