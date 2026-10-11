/**
 * lane:core (chunk 3; B-126; NOTIFY-008 A4, NOTIFY-009 A1) — the production build as GitHub Pages serves it, under
 * /aquarium-go/ (playwright.config.ts builds it into .e2e-dist and serves it with `vite preview`): the game boots
 * there, version.json, the notification icon and the service worker are beside index.html, the worker registers with
 * the base path as its scope once notifications are allowed, and a notification carries the icon from that path.
 */
import { test, expect } from '@playwright/test';

type W = { __shown: { title: string; icon?: string; tag?: string }[]; __AQ: { ready?: boolean; newGame(s: string, n: string, seed: number): unknown; mutate(fn: (g: any) => void): void; summary(): { screen: string } } };

test('the Pages build boots under /aquarium-go/; its worker, icon and version file live there', async ({ page, baseURL }) => {
  expect(baseURL).toMatch(/\/aquarium-go\/$/);
  const origin = new URL(baseURL!).origin;
  // the browser has allowed notifications; record what would be shown
  await page.addInitScript(() => {
    const w = window as unknown as W;
    w.__shown = [];
    class Granted {
      static permission = 'granted';
      static async requestPermission() {
        return 'granted';
      }
      constructor(title: string, options: { icon?: string; tag?: string } = {}) {
        w.__shown.push({ title, ...options });
      }
      close() {}
    }
    Object.defineProperty(window, 'Notification', { value: Granted, configurable: true, writable: true });
    if ('ServiceWorkerRegistration' in window) {
      ServiceWorkerRegistration.prototype.showNotification = async function (title: string, options: { icon?: string; tag?: string } = {}) {
        w.__shown.push({ title, ...options });
      };
    }
  });

  await page.goto('./?dev=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window as unknown as W).__AQ?.ready, null, { timeout: 60_000 });
  expect(new URL(page.url()).pathname).toBe('/aquarium-go/');

  for (const [file, type] of [['version.json', /json/], ['icon-192.png', /image\/png/], ['sw.js', /javascript/], ['favicon.svg', /svg/]] as const) {
    const res = await page.request.get(`${baseURL}${file}`);
    expect(res.status(), file).toBe(200);
    expect(res.headers()['content-type'], file).toMatch(type);
  }
  const version = await (await page.request.get(`${baseURL}version.json`)).json();
  expect(version).toHaveProperty('id');
  expect(version).toHaveProperty('version');

  await page.evaluate(() => (window as unknown as W).__AQ.newGame('betta', 'Tester', 12345));
  await page.waitForFunction(() => (window as unknown as W).__AQ.summary().screen === 'game');
  // permission was already granted at load: the worker registers, scoped to the base path (not the origin's root)
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope ?? null), { timeout: 20_000 }).toBe(`${origin}/aquarium-go/`);

  // a notification while the page is unfocused carries the icon from the base path
  await page.evaluate(() => void (document.hasFocus = () => false));
  await page.evaluate(() =>
    (window as unknown as W).__AQ.mutate((g) => {
      g.idCounter += 1;
      g.log.push({ id: `ev_bp${g.idCounter}`, hour: g.clock.hour, kind: 'market', text: 'x', listingId: 'l_bp', notice: { topic: 'sale', vars: { title: 'Ember', buyer: 'Maya Chen', amount: 40 } } });
    }),
  );
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__shown)).toHaveLength(1);
  const shown = await page.evaluate(() => (window as unknown as W).__shown[0]);
  expect(shown).toMatchObject({ title: 'Sold: Ember', tag: 'market' });
  expect(shown.icon).toBe('/aquarium-go/icon-192.png');

  // a link inside the base path opens its screen
  await page.evaluate(() => void (location.hash = '#/settings/notifications'));
  await expect(page.getByTestId('notify-status')).toContainText('Notifications are on');
  expect(new URL(page.url()).pathname).toBe('/aquarium-go/');
});
