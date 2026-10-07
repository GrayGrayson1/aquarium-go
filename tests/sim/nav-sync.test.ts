// @vitest-environment node
/**
 * lane:ui-shell (chunk 1; NAV-010, NAV-011, NAV-012, B-115) — the router keeps the address and the stores in step: a
 * route is applied to the stores directly (never toggled), store changes write the address with at most one history
 * entry per gesture, filter changes replace, a hashchange-driven navigation adds nothing, a route without a sub-view
 * closes the open one, and the reset when a game ends keys on saveId. The browser's location/history/window are
 * faked (a minimal history with entries, pushState/replaceState and hashchange on back()).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { GameState } from '@/types';

// ── a tiny browser: location, a history with entries, and window events ──
type Listener = (e: { type: string }) => void;
const listeners = new Map<string, Set<Listener>>();
const fakeWindow = {
  addEventListener: (t: string, f: Listener) => (listeners.get(t) ?? listeners.set(t, new Set()).get(t)!).add(f),
  removeEventListener: (t: string, f: Listener) => listeners.get(t)?.delete(f),
  dispatch: (t: string) => [...(listeners.get(t) ?? [])].forEach((f) => f({ type: t })),
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
const fakeLocation = { origin: 'http://127.0.0.1:4399', pathname: '/', search: '', hash: '' };
/** Each entry's URL; `states` holds each entry's history.state (the browser restores it on Back and Forward). */
const entries: string[] = [];
const states: unknown[] = [];
let index = 0;
const setUrl = (url: string) => {
  const i = url.indexOf('#');
  fakeLocation.hash = i >= 0 && url.length > i + 1 ? url.slice(i) : '';
};
const fakeHistory = {
  state: null as unknown,
  pushState(s: unknown, _t: string, url: string) {
    entries.splice(index + 1);
    states.splice(index + 1);
    entries.push(url);
    states.push(s);
    index = entries.length - 1;
    fakeHistory.state = s;
    setUrl(url);
  },
  replaceState(s: unknown, _t: string, url: string) {
    entries[index] = url;
    states[index] = s;
    fakeHistory.state = s;
    setUrl(url);
  },
};
/** The browser's own navigation: a typed or followed link (a new entry with no state), then hashchange. */
function browserGo(hash: string) {
  entries.splice(index + 1);
  states.splice(index + 1);
  entries.push(`/${hash}`);
  states.push(null);
  index = entries.length - 1;
  fakeHistory.state = null;
  setUrl(`/${hash}`);
  fakeWindow.dispatch('hashchange');
}
/** Back: the older entry and its state, then hashchange (when the hash differs, as for a real browser). */
function browserBack() {
  const before = fakeLocation.hash;
  index--;
  fakeHistory.state = states[index];
  setUrl(entries[index]);
  if (fakeLocation.hash !== before) fakeWindow.dispatch('hashchange');
}
const gesture = () => fakeWindow.dispatch('pointerdown');
const flush = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

vi.stubGlobal('window', fakeWindow);
vi.stubGlobal('location', fakeLocation);
vi.stubGlobal('history', fakeHistory);

type Router = typeof import('@/ui/nav/router');
let R: Router;
let useUI: typeof import('@/state/ui').useUI;
let useGame: typeof import('@/state/game').useGame;
let useShell: typeof import('@/ui/common/shellStore').useShell;
let useShopFilters: typeof import('@/ui/panels/market/shopFilters').useShopFilters;
let useTankCardTab: typeof import('@/ui/cards/tankCardTab').useTankCardTab;
let newGame: typeof import('@/sim/newGame').newGame;
let stop: () => void;
let g: GameState;

beforeAll(async () => {
  R = await import('@/ui/nav/router');
  ({ useUI } = await import('@/state/ui'));
  ({ useGame } = await import('@/state/game'));
  ({ useShell } = await import('@/ui/common/shellStore'));
  ({ useShopFilters } = await import('@/ui/panels/market/shopFilters'));
  ({ useTankCardTab } = await import('@/ui/cards/tankCardTab'));
  ({ newGame } = await import('@/sim/newGame'));
  stop = R.startRouter({ boot: false });
});
afterAll(() => {
  stop?.();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  useUI.setState({ screen: 'title', panel: null, panelTarget: null, selectedCreatureId: null, toasts: [] });
  await flush();
  useShell.setState({ popover: null, tankCardOpen: false, settingsTab: null });
  R.useNav.setState({ tab: {}, sub: {}, fromNotification: false, pending: null, boot: null });
  useTankCardTab.setState({ want: null });
  g = newGame({ starterId: 'betta', starterName: 'Nav', seed: 77 });
  useGame.getState().setGame(g);
  entries.length = 0;
  entries.push('/');
  states.length = 0;
  states.push(null);
  index = 0;
  fakeHistory.state = null;
  fakeLocation.hash = '';
  useUI.getState().set({ screen: 'game', focusedTankId: g.tankOrder[0] });
  await flush();
});

const pushes = () => entries.length - 1;

describe('nav-sync: address → stores (NAV-010)', () => {
  it('a game coming on screen writes #/ without a history entry', () => {
    expect(fakeLocation.hash).toBe('#/');
    expect(pushes()).toBe(0);
  });

  it('applying a route whose panel is already open keeps it open and switches its tab (never a toggle)', () => {
    useUI.getState().set({ panel: 'market', panelTarget: null });
    R.applyRoute({ kind: 'panel', panel: 'market', tab: 'supplies' });
    expect(useUI.getState().panel).toBe('market');
    expect(useUI.getState().panelTarget).toBe('tab:supplies');
    R.applyRoute({ kind: 'panel', panel: 'market', tab: 'supplies' });
    expect(useUI.getState().panel).toBe('market');
  });

  it('a route without a sub-view sends an explicit tab, so Back from an offer closes it (B-115)', async () => {
    useUI.getState().set({ panel: 'market', panelTarget: null });
    R.useNav.setState({ tab: { market: 'shop' }, sub: { market: 'offer:o1' } });
    browserGo('#/shop');
    expect(useUI.getState().panelTarget).toBe('tab:shop');
  });

  it('the tank card, a creature, Settings and More', async () => {
    const tankId = g.tankOrder[0];
    R.applyRoute({ kind: 'tankCard', tankId, tab: 'gear' });
    expect(useUI.getState().focusedTankId).toBe(tankId);
    expect(useShell.getState().tankCardOpen).toBe(true);
    expect(useTankCardTab.getState().want).toBe('gear');
    expect(fakeLocation.hash).toBe(`#/tanks/${tankId}/equipment`);

    const cid = Object.keys(g.creatures)[0];
    R.applyRoute({ kind: 'creature', creatureId: cid });
    expect(useUI.getState().selectedCreatureId).toBe(cid);
    expect(useShell.getState().tankCardOpen).toBe(false);
    expect(fakeLocation.hash).toBe(`#/livestock/animal/${cid}`);

    R.applyRoute({ kind: 'settings', tab: 'about' });
    expect(useUI.getState().panel).toBe('settings');
    expect(useShell.getState().settingsTab).toBe('about');
    expect(fakeLocation.hash).toBe('#/settings/about');

    R.applyRoute({ kind: 'more' }); // desktop (matchMedia says no): treated as home
    expect(useShell.getState().popover).toBeNull();
    expect(useUI.getState().panel).toBeNull();
    expect(fakeLocation.hash).toBe('#/');
  });

  it('a gone tank, animal, listing or species opens the nearest screen with its message (ADR-0019)', () => {
    const toastTitle = () => useUI.getState().toasts.at(-1);
    R.applyRoute({ kind: 'tankCard', tankId: 'tank_gone', tab: 'water' });
    expect(useUI.getState().panel).toBe('tanks');
    expect(toastTitle()).toMatchObject({ text: 'That tank isn’t in your aquarium', detail: 'Showing your tanks instead.' });
    R.applyRoute({ kind: 'creature', creatureId: 'cr_gone' });
    expect(useUI.getState()).toMatchObject({ panel: 'livestock', panelTarget: 'tab:animals' });
    expect(toastTitle()).toMatchObject({ text: 'That animal isn’t in your aquarium', detail: 'Showing your livestock instead.' });
    R.applyRoute({ kind: 'panel', panel: 'market', tab: 'listings', target: 'listing:gone' });
    expect(useUI.getState()).toMatchObject({ panel: 'market', panelTarget: 'tab:listings' });
    expect(toastTitle()).toMatchObject({ text: 'That listing isn’t here any more', detail: 'Showing your listings instead.' });
    R.applyRoute({ kind: 'panel', panel: 'encyclopedia', tab: 'species', target: 'species:dragon' });
    expect(useUI.getState()).toMatchObject({ panel: 'encyclopedia', panelTarget: 'tab:species' });
    expect(toastTitle()).toMatchObject({ text: 'There’s no page for that species', detail: 'Showing every species instead.' });
  });

  it('an unknown address opens the tank view with the broken-link toast and no extra entry', async () => {
    useUI.getState().set({ panel: 'build' });
    await flush();
    const before = pushes();
    browserGo('#/aquarium/nowhere');
    await flush();
    expect(useUI.getState().panel).toBeNull();
    expect(useUI.getState().toasts.at(-1)).toMatchObject({ text: 'That link doesn’t go anywhere', detail: 'Opened your aquarium instead.' });
    expect(fakeLocation.hash).toBe('#/');
    expect(pushes()).toBe(before + 1); // the browser's own entry, now showing #/
  });
});

describe('nav-sync: stores → address (NAV-011)', () => {
  it('opening Market and then switching to Supplies pushes exactly two entries: #/shop and #/market/supplies', async () => {
    gesture();
    useUI.getState().set({ panel: 'market', panelTarget: null });
    await flush();
    R.useNav.setState({ tab: { market: 'shop' } }); // the panel mounts and reports its tab
    await flush();
    gesture();
    R.useNav.setState({ tab: { market: 'supplies' } }); // the player picks Supplies
    await flush();
    expect(entries.slice(1)).toEqual(['/#/shop', '/#/market/supplies']);
  });

  it('a shop filter change rewrites the address without an entry', async () => {
    gesture();
    useUI.getState().set({ panel: 'market', panelTarget: null });
    await flush();
    const before = pushes();
    gesture();
    useShopFilters.getState().setFilters({ env: 'marine' });
    await flush();
    expect(fakeLocation.hash).toBe('#/shop?env=marine');
    expect(pushes()).toBe(before);
    useShopFilters.getState().clearFilters();
    await flush();
    expect(fakeLocation.hash).toBe('#/shop');
  });

  it('a hashchange-driven navigation adds no entry of its own, and its canonical form replaces the typed one', async () => {
    browserGo('#/market/trends');
    await flush();
    expect(useUI.getState()).toMatchObject({ panel: 'market', panelTarget: 'tab:trends' });
    expect(fakeLocation.hash).toBe('#/market/history');
    expect(pushes()).toBe(1); // only the browser's entry
  });

  it('one gesture, one entry: a panel settling on its remembered tab replaces the entry the click pushed', async () => {
    gesture();
    useUI.getState().set({ panel: 'build', panelTarget: null });
    await flush();
    expect(entries.slice(1)).toEqual(['/#/build']);
    R.useNav.setState({ tab: { build: 'decor' } }); // Build remembers Decor
    await flush();
    expect(entries.slice(1)).toEqual(['/#/build/decor']);
  });

  it('a sub-view report writes and clears its address (an offer)', async () => {
    gesture();
    useUI.getState().set({ panel: 'market', panelTarget: null });
    R.useNav.setState({ tab: { market: 'shop' } });
    await flush();
    gesture();
    R.useNav.setState({ sub: { market: 'offer:o1' } });
    await flush();
    expect(fakeLocation.hash).toBe('#/shop/fish/o1');
    gesture();
    R.useNav.setState({ sub: {} });
    await flush();
    expect(fakeLocation.hash).toBe('#/shop');
  });

  it('closing a panel navigates to #/, and Back reopens it', async () => {
    gesture();
    useUI.getState().set({ panel: 'research', panelTarget: null });
    await flush();
    gesture();
    useUI.getState().set({ panel: null, panelTarget: null });
    await flush();
    expect(entries.slice(1)).toEqual(['/#/research', '/#/']);
    browserBack();
    await flush();
    expect(useUI.getState().panel).toBe('research');
    expect(useUI.getState().panelTarget).toBe('tab:research');
  });

  it('go() pushes its route without waiting for a gesture', async () => {
    R.go({ kind: 'panel', panel: 'build', tab: 'facility' });
    await flush();
    expect(entries.slice(1)).toEqual(['/#/build/facility']);
    expect(useUI.getState()).toMatchObject({ panel: 'build', panelTarget: 'tab:facility' });
  });
});

describe('nav-sync: leaving a game (NAV-012)', () => {
  it('repeated mutate calls with the same saveId never reset anything', async () => {
    useUI.getState().set({ panel: 'market', panelTarget: 'offer:o1' });
    R.useNav.setState({ sub: { market: 'offer:o1' }, fromNotification: true });
    await flush();
    const hash = fakeLocation.hash;
    for (let i = 0; i < 5; i++) useGame.getState().mutate((d) => void (d.clock.hour += 1));
    await flush();
    expect(useUI.getState().panelTarget).toBe('offer:o1');
    expect(R.useNav.getState().sub).toEqual({ market: 'offer:o1' });
    expect(R.useNav.getState().fromNotification).toBe(true);
    expect(fakeLocation.hash).toBe(hash);
  });

  it('another aquarium (a loaded slot) resets the address to #/ by replacing, and drops targets and sub-views', async () => {
    gesture();
    useUI.getState().set({ panel: 'market', panelTarget: 'offer:o1' });
    R.useNav.setState({ sub: { market: 'offer:o1' }, fromNotification: true });
    await flush();
    const before = pushes();
    // what loadAndResume does: the new world, then the game screen with nothing open
    useGame.getState().setGame(newGame({ starterId: 'axolotl', starterName: 'Other', seed: 3 }));
    useUI.getState().set({ screen: 'game', panel: null, panelTarget: null });
    await flush();
    expect(useUI.getState().panelTarget).toBeNull();
    expect(R.useNav.getState().sub).toEqual({});
    expect(R.useNav.getState().fromNotification).toBe(false);
    expect(fakeLocation.hash).toBe('#/');
    expect(pushes()).toBe(before);
  });

  it('back to the title removes the hash', async () => {
    useUI.getState().set({ panel: 'build' });
    await flush();
    useUI.getState().set({ screen: 'title', panel: null });
    await flush();
    expect(fakeLocation.hash).toBe('');
  });

  it('Back from the title into the ended game’s entries stays on the title (NAV-012 A3)', async () => {
    gesture();
    useUI.getState().set({ panel: 'market', panelTarget: null });
    R.useNav.setState({ tab: { market: 'shop' }, sub: { market: 'offer:o1' } });
    await flush();
    expect(fakeLocation.hash).toBe('#/shop/fish/o1');
    useUI.getState().set({ screen: 'title', panel: null }); // "Save and return to title"
    await flush();
    expect(fakeLocation.hash).toBe('');
    browserBack(); // into #/ of the game that ended
    await flush();
    expect(useUI.getState().screen).toBe('title');
    expect(R.useNav.getState().boot).toBeNull();
    expect(R.useNav.getState().pending).toBeNull();
    expect(fakeLocation.hash).toBe('');
  });

  it('Back into another aquarium’s entry keeps the one on screen, untouched', async () => {
    gesture();
    useUI.getState().set({ panel: 'research', panelTarget: null });
    await flush();
    gesture();
    useUI.getState().set({ panel: 'build', panelTarget: null });
    await flush();
    expect(entries.slice(1)).toEqual(['/#/research', '/#/build']);
    // another slot loaded from Settings: the new aquarium, nothing open (its #/ replaces the #/build entry)
    useGame.getState().setGame(newGame({ starterId: 'axolotl', starterName: 'B', seed: 4 }));
    useUI.getState().set({ screen: 'game', panel: null, panelTarget: null });
    await flush();
    expect(fakeLocation.hash).toBe('#/');
    browserBack(); // into the first aquarium's #/research
    await flush();
    expect(useUI.getState().panel).toBeNull();
    expect(fakeLocation.hash).toBe('#/');
    expect((fakeHistory.state as { aqGame?: string }).aqGame).toBe(useGame.getState().game!.saveId);
  });

  it('a link typed on the title (no tag) still opens as a link', async () => {
    useUI.getState().set({ screen: 'title', panel: null });
    await flush();
    browserGo('#/build/decor');
    for (let i = 0; i < 20 && R.useNav.getState().boot; i++) await new Promise((r) => setTimeout(r, 10));
    // no save in this test: the route waits for the first game
    expect(R.useNav.getState().pending?.route).toEqual({ kind: 'panel', panel: 'build', tab: 'decor' });
    R.useNav.setState({ pending: null, boot: null });
  });

  it('a route waiting for a game opens once, when the game starts', async () => {
    useUI.getState().set({ screen: 'title' });
    await flush();
    R.useNav.setState({ pending: { route: { kind: 'panel', panel: 'build', tab: 'tanks' } } });
    useUI.getState().set({ screen: 'game' });
    await flush();
    expect(useUI.getState()).toMatchObject({ panel: 'build', panelTarget: 'tab:tanks' });
    expect(R.useNav.getState().pending).toBeNull();
    expect(fakeLocation.hash).toBe('#/build');
  });
});
