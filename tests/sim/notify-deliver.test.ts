/**
 * lane:notify (chunk 3; 0.5 spec §12.2–§12.6) — web delivery: what is shown and when (NOTIFY-008), the permission
 * flow (NOTIFY-007), the test notification (NOTIFY-006), device-local preferences (NOTIFY-002) and opening a tapped
 * notification (NOTIFY-009). The platform is the in-memory one; the page's focus is stubbed.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { GameEvent, GameState } from '@/types';
import { createMemoryPlatform, setPlatform, type MemoryPlatform } from '@/platform';
import { newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useNav } from '@/ui/nav/router';
import { notificationsFor, requestNotifications, sendTestNotification, startNotifications, refreshNotifyPermission, useNotifyPermission, openNotificationRoute, lookupsFor, TEST_DELAY_MS, type DeliveryEnv } from '@/ui/notify/deliver';
import { useNotifyPrefs, NOTIFY_PREFS_KEY } from '@/ui/notify/prefs';
import { emptyRateState, normalizePrefs, DEFAULT_NOTIFY_PREFS } from '@/ui/notify/rules';

let mem: MemoryPlatform;
function usePlatform(opts: Parameters<typeof createMemoryPlatform>[0]) {
  mem = createMemoryPlatform(opts);
  setPlatform(mem);
  refreshNotifyPermission();
  return mem;
}

function fakeStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, String(v)), removeItem: (k: string) => void data.delete(k), data };
}

/** A page that is visible; `focused` says whether the player is looking at it. */
function page(focused: boolean) {
  const doc = { visibilityState: 'visible', hasFocus: () => focused, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn(), setTimeout, clearTimeout });
  return doc;
}

let seq = 0;
const prismatic = (over: Partial<GameEvent> = {}): GameEvent => ({
  id: `ev_t${++seq}`,
  hour: 10,
  kind: 'market',
  text: 'Something special at the shop',
  offerId: 'offer_k3',
  notice: { topic: 'prismatic', vars: { species: 'betta', morph: 'Royal Blue Halfmoon', seller: 'Coral Cove', until: 20 } },
  ...over,
});

const game = (): GameState => {
  const g = newGame({ starterId: 'betta', starterName: 'T', seed: 2 });
  g.isShowcase = false;
  return g;
};

beforeEach(() => {
  useUI.setState({ toasts: [] });
  useNotifyPrefs.getState().applyDefaults();
  useNotifyPrefs.getState().setQuiet(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  setPlatform(null);
});

describe('NOTIFY-008: what is shown, and when', () => {
  const env = (over: Partial<DeliveryEnv> = {}): DeliveryEnv => ({
    permission: 'granted',
    away: true,
    prefs: normalizePrefs(DEFAULT_NOTIFY_PREFS),
    rate: emptyRateState(),
    now: 1_000,
    minutes: 12 * 60,
    look: { hour: 10, tankName: () => 'Tank' },
    ...over,
  });

  it('open but not focused, granted and the category on: one notification with its route, tag and text', () => {
    const out = notificationsFor([prismatic(), { id: 'ev_i', hour: 10, kind: 'info', text: 'A visitor dropped by.' }], env());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ title: 'Prismatic betta in the shop', body: 'Coral Cove just stocked a Prismatic Royal Blue Halfmoon. It leaves in 10 h.', route: '#/shop/fish/offer_k3', category: 'rare' });
  });

  it('focused (the toast is enough), hidden, not granted or the category off: nothing', () => {
    expect(notificationsFor([prismatic()], env({ away: false }))).toEqual([]);
    expect(notificationsFor([prismatic()], env({ permission: 'default' }))).toEqual([]);
    expect(notificationsFor([prismatic()], env({ permission: 'denied' }))).toEqual([]);
    const off = normalizePrefs({ categories: { rare: false } });
    expect(notificationsFor([prismatic()], env({ prefs: off }))).toEqual([]);
  });

  it('live: a new log event while the page is unfocused notifies once; focused, it doesn’t; a loaded backlog never does', () => {
    usePlatform({ permission: 'granted' });
    useNotifyPrefs.getState().setQuiet(false); // delivery reads the device clock: keep the test the same by night (B-173)
    const doc = page(false);
    const g = game();
    g.log.push(prismatic({ id: 'ev_old' })); // already in the save: history
    useGame.setState({ game: g });
    const stop = startNotifications();
    try {
      expect(mem.shown).toEqual([]);
      useGame.setState({ game: { ...g, log: [...g.log, prismatic({ id: 'ev_new1' })] } });
      expect(mem.shown).toHaveLength(1);
      expect(mem.shown[0]).toMatchObject({ id: 'ev_new1', category: 'rare', route: '#/shop/fish/offer_k3' });
      doc.hasFocus = () => true;
      const g2 = useGame.getState().game!;
      useGame.setState({ game: { ...g2, log: [...g2.log, prismatic({ id: 'ev_new2', offerId: 'offer_z' })] } });
      expect(mem.shown).toHaveLength(1);
      // another aquarium loads: its log is history too
      doc.hasFocus = () => false;
      const other = game();
      other.saveId = 'save_other';
      other.log.push(prismatic({ id: 'ev_other' }));
      useGame.setState({ game: other });
      expect(mem.shown).toHaveLength(1);
      // an older save of the same aquarium reloaded: its new events reuse ids, and still notify
      const older = game();
      older.saveId = 'save_other';
      older.idCounter = other.idCounter - 5;
      useGame.setState({ game: older });
      const sale: GameEvent = { id: 'ev_other', hour: 10, kind: 'celebrate', text: 'Sold!', listingId: 'l1', notice: { topic: 'sale', vars: { title: 'Ember', buyer: 'Maya Chen', amount: 40 } } };
      useGame.setState({ game: { ...older, log: [...older.log, sale] } }); // (a sale: Rare stock showed one minutes ago)
      expect(mem.shown).toHaveLength(2);
      expect(mem.prepared).toBe(1); // permission was already granted: taps are made ready at start
    } finally {
      stop();
      useGame.setState({ game: null });
    }
  });

  it('nothing asks for permission at start (§12.4)', () => {
    usePlatform({ permission: 'default' });
    page(false);
    const stop = startNotifications();
    stop();
    expect(mem.requests).toBe(0);
    expect(mem.prepared).toBe(0);
  });

  it('lookupsFor reads the clock and the tank names from the game', () => {
    const g = game();
    const id = g.tankOrder[0];
    expect(lookupsFor(g).hour).toBe(g.clock.hour);
    expect(lookupsFor(g).tankName(id)).toBe(g.tanks[id].name);
    expect(lookupsFor(g).tankName('nope')).toBeNull();
  });
});

describe('NOTIFY-007: "Turn on"', () => {
  it('granted: the category defaults, the "Notifications on" toast and click delivery', async () => {
    usePlatform({ permission: 'default', answer: 'granted' });
    useNotifyPrefs.getState().setCategory('market', false);
    useNotifyPrefs.getState().setCategory('shows', true);
    expect(await requestNotifications()).toBe('granted');
    expect(mem.requests).toBe(1);
    expect(useNotifyPermission.getState().permission).toBe('granted');
    expect(useNotifyPrefs.getState().categories).toEqual({ rare: true, care: true, market: true, breeding: true, shows: false, auto: true }); // chunk 5: Automation, on by default (NOTIFY-012)
    expect(useNotifyPrefs.getState().quiet.on).toBe(true);
    const t = useUI.getState().toasts.at(-1)!;
    expect(t).toMatchObject({ kind: 'info', label: 'Notifications on', text: 'You’ll hear about rare stock, care and sales', detail: 'Choose exactly what below.' });
    expect(mem.prepared).toBe(1);
  });

  it('denied: the Denied state, no toast; dismissed: still not asked', async () => {
    usePlatform({ permission: 'default', answer: 'denied' });
    expect(await requestNotifications()).toBe('denied');
    expect(useNotifyPermission.getState().permission).toBe('denied');
    expect(useUI.getState().toasts).toEqual([]);
    usePlatform({ permission: 'default', answer: 'default' });
    expect(await requestNotifications()).toBe('default');
    expect(useNotifyPermission.getState().permission).toBe('default');
    expect(mem.prepared).toBe(0);
  });
});

describe('NOTIFY-006: the test notification', () => {
  it('granted: arrives after about 1.5 s, focused or not', () => {
    vi.useFakeTimers();
    usePlatform({ permission: 'granted' });
    page(true);
    expect(sendTestNotification()).toBe(true);
    expect(mem.shown).toEqual([]);
    vi.advanceTimersByTime(TEST_DELAY_MS - 1);
    expect(mem.shown).toEqual([]);
    vi.advanceTimersByTime(1);
    return Promise.resolve().then(() => {
      expect(TEST_DELAY_MS).toBe(1500);
      expect(mem.shown).toHaveLength(1);
      expect(mem.shown[0]).toMatchObject({ title: 'Test notification', body: 'Notifications work on this device. You’ll hear about rare stock, hungry animals and sales.', route: null, category: 'test' });
    });
  });

  it('not granted: the toast "Turn notifications on first", nothing sent', () => {
    usePlatform({ permission: 'default' });
    expect(sendTestNotification()).toBe(false);
    expect(useUI.getState().toasts.at(-1)?.text).toBe('Turn notifications on first');
    expect(mem.shown).toEqual([]);
  });
});

describe('NOTIFY-002: preferences live on the device, never in the save', () => {
  it('a switch writes aquarium-go.notify.v1 and reads back; a malformed value reads as the defaults', () => {
    const store = fakeStorage();
    vi.stubGlobal('localStorage', store);
    useNotifyPrefs.getState().setCategory('shows', true);
    useNotifyPrefs.getState().setQuiet(false);
    expect(JSON.parse(store.data.get(NOTIFY_PREFS_KEY)!)).toEqual({ categories: { rare: true, care: true, market: true, breeding: true, shows: true, auto: true }, quiet: { on: false, start: 22, end: 8 } }); // chunk 5: + Automation
    useNotifyPrefs.setState({ categories: normalizePrefs(undefined).categories, quiet: normalizePrefs(undefined).quiet });
    useNotifyPrefs.getState().reload();
    expect(useNotifyPrefs.getState().categories.shows).toBe(true);
    expect(useNotifyPrefs.getState().quiet.on).toBe(false);
    store.data.set(NOTIFY_PREFS_KEY, '{nope');
    useNotifyPrefs.getState().reload();
    expect(useNotifyPrefs.getState().categories).toEqual(DEFAULT_NOTIFY_PREFS.categories);
    expect(useNotifyPrefs.getState().quiet.on).toBe(true);
  });

  it('nothing about notifications is in the game state', () => {
    const g = game();
    expect(JSON.stringify(g)).not.toMatch(/aquarium-go\.notify|quiet/);
  });
});

describe('NOTIFY-009: a tapped notification opens its screen', () => {
  it('in a game: the offer opens with "Opened from your notification"; other screens open plainly', () => {
    const g = game();
    useGame.setState({ game: g });
    useUI.setState({ screen: 'game', panel: null, panelTarget: null });
    useNav.setState({ fromNotification: false });
    try {
      openNotificationRoute('#/shop/fish/offer_k3');
      expect(useUI.getState().panel).toBe('market');
      expect(useUI.getState().panelTarget).toBe('offer:offer_k3');
      expect(useNav.getState().fromNotification).toBe(true);
      useNav.setState({ fromNotification: false });
      openNotificationRoute('#/livestock/eggs');
      expect(useUI.getState().panel).toBe('livestock');
      expect(useNav.getState().fromNotification).toBe(false);
      openNotificationRoute(null);
      openNotificationRoute('#/nowhere/at/all');
      expect(useUI.getState().panel).toBe('livestock');
    } finally {
      useGame.setState({ game: null });
      useUI.setState({ screen: 'title', panel: null, panelTarget: null });
    }
  });

  it('before a game is on screen, the route waits for one', () => {
    useUI.setState({ screen: 'title', panel: null, panelTarget: null });
    openNotificationRoute('#/shop/fish/offer_q');
    expect(useNav.getState().pending?.route).toEqual({ kind: 'panel', panel: 'market', tab: 'shop', target: 'offer:offer_q' });
    expect(useNav.getState().fromNotification).toBe(true);
    useNav.setState({ pending: null, fromNotification: false });
  });
});
