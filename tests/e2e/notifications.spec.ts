/**
 * lane:notify (chunk 3; 0.5 spec §12, §20.2; NOTIFY-002, NOTIFY-006 to NOTIFY-009, DES-009, ACC-004; B-173) —
 * Settings › Notifications and web delivery in a real browser, with window.Notification (and the service worker's
 * showNotification) stubbed so every notification is recorded: no prompt at launch; the four permission states; the
 * test notification; the Alerts drawer footer; delivery only while the page is unfocused; quiet hours on a pinned
 * clock and timezone; a tap opening the offer with its banner, here and in a fresh window.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid, devUrl } from './helpers';

type Shown = { title: string; body?: string; tag?: string; icon?: string; data?: { route: string | null }; via: 'page' | 'sw' };
type W = { __notify: { shown: Shown[]; asks: number }; __notifyAnswer?: string; __AQ: { game(): any; mutate(fn: (g: any) => void): void; ui(): { toasts: { text: string; label?: string; detail?: string }[] } } };

/** Record notifications instead of showing them; `permission` is the browser's state at load. */
async function stubNotifications(page: Page, permission: 'default' | 'granted' | 'denied' | 'unsupported') {
  await page.addInitScript((p) => {
    const w = window as unknown as W & { Notification?: unknown };
    w.__notify = { shown: [], asks: 0 };
    if (p === 'unsupported') {
      delete (w as { Notification?: unknown }).Notification;
      return;
    }
    class FakeNotification {
      static permission = p;
      static async requestPermission() {
        w.__notify.asks++;
        FakeNotification.permission = (w.__notifyAnswer ?? 'granted') as typeof p;
        return FakeNotification.permission;
      }
      onclick: (() => void) | null = null;
      constructor(title: string, options: Omit<Shown, 'title' | 'via'> = {}) {
        w.__notify.shown.push({ title, ...options, via: 'page' });
      }
      close() {}
    }
    Object.defineProperty(window, 'Notification', { value: FakeNotification, configurable: true, writable: true });
    if ('ServiceWorkerRegistration' in window) {
      ServiceWorkerRegistration.prototype.showNotification = async function (title: string, options: Omit<Shown, 'title' | 'via'> = {}) {
        w.__notify.shown.push({ title, ...options, via: 'sw' });
      };
    }
  }, permission);
}

const shown = (page: Page) => page.evaluate(() => (window as unknown as W).__notify.shown);
const asks = (page: Page) => page.evaluate(() => (window as unknown as W).__notify.asks);
const lastToast = (page: Page) => page.evaluate(() => (window as unknown as W).__AQ.ui().toasts.at(-1) ?? null);
const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);
const hash = (page: Page) => page.evaluate(() => location.hash);
/** Quiet hours off on this device (as the Settings switch stores it), for tests that aren't about them. */
const quietOff = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('aquarium-go.notify.v1', JSON.stringify({ categories: { rare: true, care: true, market: true, breeding: true, shows: false }, quiet: { on: false, start: 22, end: 8 } })));

/** The player is in another window: the page stays visible but loses focus. */
const lookAway = (page: Page, away = true) => page.evaluate((a) => void (document.hasFocus = () => !a), away);

async function game(page: Page) {
  await openApp(page);
  await quickGame(page, 'betta', { money: 3000 });
  await aq(page, 'act', 'tutorialSkip');
  await aq(page, 'dev.setSpeed', 0);
}

/** Log a sim event as the game would (the delivery reads new log entries). */
async function emit(page: Page, e: Record<string, unknown>) {
  await page.evaluate((ev) => {
    (window as unknown as W).__AQ.mutate((g) => {
      g.idCounter += 1;
      g.log.push({ id: `ev_e2e${g.idCounter}`, hour: g.clock.hour, kind: 'info', text: 'x', ...ev });
    });
  }, e);
}

async function openNotificationsTab(page: Page) {
  await goHash(page, '#/settings/notifications');
  await expect(tid(page, 'settings-tab-notifications')).toHaveAttribute('aria-selected', 'true');
  await expect(tid(page, 'notify-status')).toBeVisible();
}

test.describe('Notifications (desktop 1440×900)', () => {
  test('no prompt at launch; Turn on from the Alerts drawer footer; granted; the test notification', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await stubNotifications(page, 'default');
    await game(page);
    expect(await asks(page)).toBe(0);

    // the Alerts drawer footer (permission not asked yet) opens Settings › Notifications
    await tid(page, 'hud-alerts').click();
    await expect(tid(page, 'alerts-notify-cta')).toContainText('Get alerts like these as system notifications, not just in here.');
    await tid(page, 'alerts-notify-turn-on').click();
    await expect.poll(() => hash(page)).toBe('#/settings/notifications');
    expect(await asks(page)).toBe(0); // the footer only opens Settings
    // chunk 8 (REL-031): six tabs, Account after Saves, wherever Social exists (every e2e build: the stub)
    await expect(page.locator('[data-testid^="settings-tab-"]')).toHaveCount(6);

    await expect(tid(page, 'notify-status')).toContainText('Notifications are off');
    for (const c of ['rare', 'care', 'market', 'breeding', 'shows']) {
      const sw = tid(page, `notify-cat-${c}`);
      await expect(sw).toHaveAttribute('role', 'switch');
      await expect(sw).toHaveAttribute('aria-disabled', 'true');
      await expect(sw).toHaveAttribute('aria-describedby', 'notify-status-title');
    }
    await expect(tid(page, 'notify-quiet')).toHaveAttribute('aria-checked', 'true');

    // not granted: Send test only says so
    await tid(page, 'notify-test').click();
    await expect.poll(() => lastToast(page)).toMatchObject({ text: 'Turn notifications on first' });

    await tid(page, 'notify-turn-on').click();
    await expect(tid(page, 'notify-status')).toContainText('Notifications are on');
    expect(await asks(page)).toBe(1);
    await expect.poll(() => lastToast(page)).toMatchObject({ label: 'Notifications on', text: 'You’ll hear about rare stock, care and sales', detail: 'Choose exactly what below.' });
    await expect(tid(page, 'notify-cat-rare')).toHaveAttribute('aria-checked', 'true');
    await expect(tid(page, 'notify-cat-shows')).toHaveAttribute('aria-checked', 'false');
    await expect(tid(page, 'notify-cat-rare')).not.toHaveAttribute('aria-disabled', 'true');

    await tid(page, 'notify-test').click();
    await page.waitForTimeout(600);
    expect(await shown(page)).toEqual([]); // about 1.5 s, not at once
    await expect.poll(() => shown(page), { timeout: 5000 }).toHaveLength(1);
    expect((await shown(page))[0]).toMatchObject({ title: 'Test notification', body: 'Notifications work on this device. You’ll hear about rare stock, hungry animals and sales.', tag: 'test' });
    await expect(tid(page, 'notify-test-line')).toHaveText('Sent — it appears at the top of the screen');

    // a switch writes the device's preferences
    await tid(page, 'notify-cat-shows').click();
    await expect(tid(page, 'notify-cat-shows')).toHaveAttribute('aria-checked', 'true');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('aquarium-go.notify.v1') ?? 'null'));
    expect(stored).toMatchObject({ categories: { shows: true }, quiet: { on: true, start: 22, end: 8 } });

    // the drawer footer has gone
    await goHash(page, '#/');
    await tid(page, 'hud-alerts').click();
    await expect(tid(page, 'alerts-events')).toBeVisible();
    await expect(tid(page, 'alerts-notify-cta')).toHaveCount(0);
  });

  test('denied and unsupported read as the design and the owner wrote them', async ({ page, browser }) => {
    await stubNotifications(page, 'default');
    await page.addInitScript(() => void ((window as unknown as W).__notifyAnswer = 'denied'));
    await game(page);
    await openNotificationsTab(page);
    await tid(page, 'notify-turn-on').click();
    await expect(tid(page, 'notify-status')).toContainText('Blocked in your browser');
    await expect(tid(page, 'notify-status')).toContainText('To turn them on, allow notifications for this site in your browser’s site settings, then come back.');
    await expect(tid(page, 'notify-turn-on')).toHaveCount(0);

    const other = await browser.newPage();
    await stubNotifications(other, 'unsupported');
    await game(other);
    await openNotificationsTab(other);
    await expect(tid(other, 'notify-status')).toHaveText(/This browser can’t show notifications\s*Alerts still appear in the game\./);
    await expect(tid(other, 'notify-status')).not.toContainText('Home Screen');
    await other.close();
  });

  test('delivery: only while unfocused, with the icon, tag and route; a tap opens the offer with its banner', async ({ page }) => {
    await stubNotifications(page, 'granted');
    await quietOff(page); // delivery reads the device clock: the same by night (quiet hours have their own test)
    await game(page);
    const offerId = await page.evaluate(() => (window as unknown as W).__AQ.game().market.stock[0].id as string);
    const prismatic = { kind: 'market', text: 'Something special at the shop', toast: true, offerId, notice: { topic: 'prismatic', vars: { species: 'betta', morph: 'Royal Blue Halfmoon', seller: 'Coral Cove', until: 9999 } } };

    await lookAway(page, false);
    await emit(page, prismatic);
    await page.waitForTimeout(300);
    expect(await shown(page)).toEqual([]); // focused: the in-game toast is enough

    await lookAway(page, true);
    await emit(page, prismatic);
    await expect.poll(() => shown(page)).toHaveLength(1);
    const n = (await shown(page))[0];
    expect(n).toMatchObject({ title: 'Prismatic betta in the shop', tag: 'rare', data: { route: `#/shop/fish/${offerId}` } });
    expect(n.icon).toMatch(/\/icon-192\.png$/);
    expect(n.body).toMatch(/^Coral Cove just stocked a Prismatic Royal Blue Halfmoon\. It leaves in /);

    // the tap: through the service worker's message (or the page's own notification's click)
    await page.evaluate((route) => {
      const msg = { type: 'notification-click', route };
      if (navigator.serviceWorker) navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: msg }));
    }, `#/shop/fish/${offerId}`);
    await expect.poll(() => hash(page)).toBe(`#/shop/fish/${offerId}`);
    await expect(tid(page, 'offer-from-notification')).toHaveText('Opened from your notification');
    // one-shot: another offer opens without it
    const second = await page.evaluate(() => (window as unknown as W).__AQ.game().market.stock[1]?.id as string | undefined);
    if (second) {
      await goHash(page, `#/shop/fish/${second}`);
      await expect.poll(() => hash(page)).toBe(`#/shop/fish/${second}`);
      await expect(tid(page, 'offer-from-notification')).toHaveCount(0);
    }
  });

  test('a fresh window from a tap boots the save, then opens the offer with its banner', async ({ page, context }) => {
    await stubNotifications(page, 'granted');
    await game(page);
    const offerId = await page.evaluate(() => (window as unknown as W).__AQ.game().market.stock[0].id as string);
    await aq(page, 'save');
    const fresh = await context.newPage();
    await stubNotifications(fresh, 'granted');
    // the loading card can come and go before a poll sees it (WebKit opens a small save that fast): record that it
    // appeared, from the first moment of the page
    await fresh.addInitScript(() => {
      const w = window as unknown as { __sawBootCard?: boolean };
      new MutationObserver(() => {
        if (document.querySelector('[data-testid="boot-deeplink"]')) w.__sawBootCard = true;
      }).observe(document, { childList: true, subtree: true });
    });
    const url = devUrl(`/?notification=1#/shop/fish/${offerId}`);
    await fresh.goto(url, { waitUntil: 'domcontentloaded' });
    await fresh.waitForFunction(() => !!(window as unknown as { __AQ?: { ready?: boolean } }).__AQ?.ready, null, { timeout: 30_000 });
    expect(await fresh.evaluate(() => !!(window as unknown as { __sawBootCard?: boolean }).__sawBootCard), 'the loading card named the screen').toBe(true);
    await expect(tid(fresh, 'offer-from-notification')).toBeVisible();
    expect(await fresh.evaluate(() => location.search)).not.toContain('notification');
    await fresh.close();
  });
});

test.describe('Quiet hours on the device clock (B-173)', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('11 PM: a market notification is held, urgent care comes through; 8 AM: it shows', async ({ page }) => {
    await stubNotifications(page, 'granted');
    await page.clock.setFixedTime(new Date('2026-10-12T03:00:00Z')); // 23:00 in New York
    await game(page);
    const tankId = await page.evaluate(() => (window as unknown as W).__AQ.game().tankOrder[0] as string);
    await lookAway(page, true);
    await emit(page, { kind: 'market', listingId: 'l_q', notice: { topic: 'sale', vars: { title: 'Ember', buyer: 'Maya Chen', amount: 40 } } });
    await page.waitForTimeout(300);
    expect(await shown(page)).toEqual([]);
    await emit(page, { kind: 'danger', tankId, text: 'Your bettas are starving and losing condition — feed right away.' });
    await expect.poll(() => shown(page)).toHaveLength(1);
    expect((await shown(page))[0]).toMatchObject({ tag: 'care', data: { route: `#/tanks/${tankId}` } });

    await page.clock.setFixedTime(new Date('2026-10-12T12:00:00Z')); // 08:00 in New York
    await emit(page, { kind: 'market', listingId: 'l_q', notice: { topic: 'sale', vars: { title: 'Ember', buyer: 'Maya Chen', amount: 40 } } });
    await expect.poll(() => shown(page)).toHaveLength(2);
    expect((await shown(page))[1]).toMatchObject({ title: 'Sold: Ember', body: 'Maya Chen paid $40.', tag: 'market' });
  });
});
