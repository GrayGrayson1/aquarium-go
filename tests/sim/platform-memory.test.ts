// @vitest-environment node
/**
 * lane:platform (PLAT-001; 0.5 design §14, §20.1) — the in-memory platform tests use in place of the browser, and the
 * platform() / setPlatform() seam: platform() makes the web platform lazily, once, and setPlatform swaps it.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createMemoryPlatform, platform, setPlatform, type NotifyPermission, type PlatformNotification } from '@/platform';

const note = (over: Partial<PlatformNotification> = {}): PlatformNotification => ({
  id: 'n1',
  title: 'Prismatic betta in the shop',
  body: 'Coral Reef Supply just stocked a Prismatic Halfmoon. It leaves in 2 h.',
  route: '/shop/fish/offer_k3x9',
  category: 'rare',
  ...over,
});

afterEach(() => {
  setPlatform(null);
  vi.unstubAllGlobals();
});

describe('PLAT-001: the memory platform', () => {
  it('records the notifications it shows, in order, as copies', async () => {
    const p = createMemoryPlatform({ permission: 'granted' });
    const first = note();
    expect(await p.notifications.show(first)).toBe(true);
    expect(await p.notifications.show(note({ id: 'n2', title: 'Test notification', route: null, category: 'test' }))).toBe(true);
    first.title = 'changed afterwards';
    expect(p.shown.map((n) => [n.id, n.title, n.route, n.category])).toEqual([
      ['n1', 'Prismatic betta in the shop', '/shop/fish/offer_k3x9', 'rare'],
      ['n2', 'Test notification', null, 'test'],
    ]);
  });

  it('reports the permission it was created with, "default" when none was given', () => {
    expect(createMemoryPlatform().notifications.permission()).toBe('default');
    for (const permission of ['default', 'granted', 'denied', 'unsupported'] as NotifyPermission[]) {
      expect(createMemoryPlatform({ permission }).notifications.permission()).toBe(permission);
    }
  });

  it.each(['default', 'denied', 'unsupported'] as NotifyPermission[])('shows nothing while the permission is %s', async (permission) => {
    const p = createMemoryPlatform({ permission });
    expect(await p.notifications.show(note())).toBe(false);
    expect(p.shown).toEqual([]);
  });

  it('request() asks only while undecided, answers "granted" by default, and counts every ask', async () => {
    const p = createMemoryPlatform();
    expect(p.requests).toBe(0); // creating it asks nothing
    expect(await p.notifications.request()).toBe('granted');
    expect(p.notifications.permission()).toBe('granted');
    expect(p.requests).toBe(1);

    const refused = createMemoryPlatform({ answer: 'denied' });
    expect(await refused.notifications.request()).toBe('denied');
    expect(await refused.notifications.show(note())).toBe(false);

    const dismissed = createMemoryPlatform({ answer: 'default' });
    expect(await dismissed.notifications.request()).toBe('default');

    // A decision stands (a browser doesn't ask again), and no browser support stays unsupported.
    const blocked = createMemoryPlatform({ permission: 'denied', answer: 'granted' });
    expect(await blocked.notifications.request()).toBe('denied');
    expect(blocked.requests).toBe(1);
    expect(await createMemoryPlatform({ permission: 'unsupported' }).notifications.request()).toBe('unsupported');
  });

  it('open() reaches every onOpen subscriber with the route; an unsubscribed one hears nothing', () => {
    const p = createMemoryPlatform({ permission: 'granted' });
    const a: (string | null)[] = [];
    const b: (string | null)[] = [];
    p.notifications.onOpen((r) => a.push(r));
    const offB = p.notifications.onOpen((r) => b.push(r));
    p.open('/market/listings/l1');
    offB();
    p.open(null);
    expect(a).toEqual(['/market/listings/l1', null]);
    expect(b).toEqual(['/market/listings/l1']);
  });

  it('records clipboard writes, and pause()/resume() run the lifecycle subscribers until they unsubscribe', async () => {
    const p = createMemoryPlatform();
    expect(await p.clipboard.write('https://example.test/#/shop/fish/offer_k3x9')).toBe(true);
    expect(p.copied).toEqual(['https://example.test/#/shop/fish/offer_k3x9']);

    const calls: string[] = [];
    const offPause = p.lifecycle.onPause(() => calls.push('pause'));
    const offResume = p.lifecycle.onResume(() => calls.push('resume'));
    p.pause();
    p.resume();
    offPause();
    offResume();
    p.pause();
    p.resume();
    expect(calls).toEqual(['pause', 'resume']);
  });

  it('like a desktop browser: no share sheet, no schedule or cancelAll, no storage list of its own', () => {
    const p = createMemoryPlatform();
    expect(p.kind).toBe('web');
    expect(p.share).toBeUndefined();
    expect(p.notifications.schedule).toBeUndefined();
    expect(p.notifications.cancelAll).toBeUndefined();
    expect(p.storageCandidates).toBeUndefined();
  });
});

describe('PLAT-001: platform() and setPlatform()', () => {
  it('platform() creates the web platform on first use, not at import, and only once', async () => {
    // Count every read of navigator: creating the web platform looks for navigator.share.
    let reads = 0;
    vi.stubGlobal('navigator', new Proxy({}, { get: () => (reads++, undefined) }));
    vi.resetModules();
    const fresh = await import('@/platform');
    expect(reads).toBe(0);
    const first = fresh.platform();
    expect(first.kind).toBe('web');
    expect(reads).toBeGreaterThan(0);
    const readsAfterFirst = reads;
    expect(fresh.platform()).toBe(first);
    expect(reads).toBe(readsAfterFirst);
  });

  it('setPlatform swaps what platform() returns; null goes back to a (new) web platform', async () => {
    const web = platform();
    expect(web.kind).toBe('web');
    expect(platform()).toBe(web);

    const mem = createMemoryPlatform({ permission: 'granted' });
    setPlatform(mem);
    expect(platform()).toBe(mem);
    expect(await platform().notifications.show(note())).toBe(true);
    expect(mem.shown).toHaveLength(1);

    setPlatform(null);
    const again = platform();
    expect(again).not.toBe(mem);
    expect(again).not.toBe(web);
    expect(again.kind).toBe('web');
  });
});
