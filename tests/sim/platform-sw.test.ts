/**
 * lane:platform (chunk 3; 0.5 spec §12.6; NOTIFY-009; B-117, B-199) — public/sw.js, run in a sandbox with a fake
 * service-worker global: it only listens for install, activate and notificationclick (no fetch, cache or push), it
 * claims open windows, and a tap focuses a game window inside its scope (uncontrolled ones included) and posts the
 * route, or opens the game at `?notification=1#<route>`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

const ROOT = join(__dirname, '..', '..');
const SCOPE = 'https://example.github.io/aquarium-go/';
let source = '';

beforeAll(async () => {
  source = await readFile(join(ROOT, 'public', 'sw.js'), 'utf8');
});

interface FakeWindow {
  url: string;
  focused: boolean;
  focus: () => Promise<void>;
  postMessage: (m: unknown) => void;
  posted: unknown[];
  focusCalls: number;
}

function fakeWindow(url: string, focused = false): FakeWindow {
  const w: FakeWindow = {
    url,
    focused,
    posted: [],
    focusCalls: 0,
    focus: async () => {
      w.focusCalls++;
    },
    postMessage: (m) => w.posted.push(m),
  };
  return w;
}

function worker(windows: FakeWindow[]) {
  const listeners: Record<string, ((e: unknown) => void)[]> = {};
  const calls = { matchAll: [] as unknown[], opened: [] as string[], claimed: 0, skipped: 0 };
  const self = {
    registration: { scope: SCOPE },
    clients: {
      matchAll: async (opts: unknown) => {
        calls.matchAll.push(opts);
        return windows;
      },
      openWindow: async (url: string) => {
        calls.opened.push(url);
        return null;
      },
      claim: async () => {
        calls.claimed++;
      },
    },
    skipWaiting: () => {
      calls.skipped++;
    },
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      (listeners[type] ??= []).push(fn);
    },
  };
  runInNewContext(source, { self, URL, URLSearchParams, console });
  const fire = async (type: string, extra: Record<string, unknown> = {}) => {
    const pending: Promise<unknown>[] = [];
    const event = { waitUntil: (p: Promise<unknown>) => pending.push(p), ...extra };
    for (const fn of listeners[type] ?? []) fn(event);
    await Promise.all(pending);
  };
  const click = async (route: unknown) => {
    let closed = false;
    await fire('notificationclick', { notification: { data: { route }, close: () => (closed = true) } });
    return closed;
  };
  return { listeners, calls, fire, click };
}

describe('public/sw.js', () => {
  it('listens for install, activate and notificationclick only: no fetch, cache or push handlers', () => {
    const { listeners } = worker([]);
    expect(Object.keys(listeners).sort()).toEqual(['activate', 'install', 'notificationclick']);
    expect(source).not.toMatch(/caches\.|addEventListener\(\s*['"](fetch|push|sync|message)['"]/);
  });

  it('activates at once and claims the windows already open (B-117)', async () => {
    const w = worker([]);
    await w.fire('install');
    await w.fire('activate');
    expect(w.calls.skipped).toBe(1);
    expect(w.calls.claimed).toBe(1);
  });

  it('a tap focuses the open game window and posts the route to it', async () => {
    const game = fakeWindow(`${SCOPE}#/`);
    const w = worker([game]);
    const closed = await w.click('#/shop/fish/offer_k3');
    expect(closed).toBe(true);
    expect(w.calls.matchAll).toEqual([{ type: 'window', includeUncontrolled: true }]);
    expect(game.focusCalls).toBe(1);
    expect(game.posted).toEqual([{ type: 'notification-click', route: '#/shop/fish/offer_k3' }]);
    expect(w.calls.opened).toEqual([]);
  });

  it('prefers the focused game window, and ignores windows outside its scope', async () => {
    const other = fakeWindow('https://example.github.io/another-app/', true);
    const a = fakeWindow(`${SCOPE}?x=1#/tanks`);
    const b = fakeWindow(`${SCOPE}#/`, true);
    const w = worker([other, a, b]);
    await w.click('#/market/listings/l1');
    expect(other.posted).toEqual([]);
    expect(a.posted).toEqual([]);
    expect(b.posted).toEqual([{ type: 'notification-click', route: '#/market/listings/l1' }]);
  });

  it('with no game window it opens the game at the route, flagged as a notification', async () => {
    const w = worker([fakeWindow('https://elsewhere.example/')]);
    await w.click('#/shop/fish/offer_k3');
    expect(w.calls.opened).toEqual([`${SCOPE}?notification=1#/shop/fish/offer_k3`]);
  });

  it('a route without the hash still opens; a notification with no route opens the game', async () => {
    const a = worker([]);
    await a.click('/livestock/eggs');
    expect(a.calls.opened).toEqual([`${SCOPE}?notification=1#/livestock/eggs`]);
    const b = worker([]);
    await b.click(null);
    expect(b.calls.opened).toEqual([SCOPE]);
    const c = worker([]);
    await c.click('javascript:alert(1)');
    expect(c.calls.opened).toEqual([SCOPE]);
  });
});
