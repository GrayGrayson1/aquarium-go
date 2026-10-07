/**
 * The hash router (0.5 spec §6.3, §6.4; ADR-0019): keeps the address and the stores in step, opens links and reloads
 * at the right screen, and tidies up when a game ends. Route data lives in ./routes.ts. OWNER: lane "ui-shell".
 *
 * Address → stores: on `hashchange` (Back, Forward, a typed or followed link) `applyRoute` sets `useUI`/`useShell`
 * directly, never through `openPanel` (which closes a panel that is already open).
 * Stores → address: whenever what is on screen changes (panel, tab, sub-view, a card, More) `currentRoute()` is
 * written back. At most one history entry per player gesture: the first change after a pointer or key press pushes,
 * and whatever follows before the next gesture (a panel settling on its remembered tab, a link resolving) replaces
 * it. Shop filter changes always replace, and applying an address never pushes (its entry exists already).
 * Boot (ADR-0019): a link to a real screen loads the latest save behind the loading card, then opens it; a reload,
 * or a return through history, reopens this tab's aquarium at the address; a plain address, or a link to `#/`, shows
 * the title. With no save the route waits (`pending`) and opens once, when the first game starts.
 * Leaving: back to the title clears the hash; another aquarium (a loaded slot) resets it to `#/`; one-shot targets,
 * sub-views and the notification flag go with them.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { useUI, type UIState } from '@/state/ui';
import { useGame } from '@/state/game';
import { findSpecies } from '@/data/species';
import { listSaves } from '@/persistence';
import { useShell } from '../common/shellStore';
import { loadIntoGame } from '../common/saves';
import { MOBILE_QUERY } from '../common/safe';
import { tutorialFlag } from '../common/actions';
import { toastMark, reportLoadFailure } from '../screens/loadFeedback';
import { useTankCardTab } from '../cards/tankCardTab';
import { useShopFilters } from '../panels/market/shopFilters';
import {
  formatRoute,
  isNavPanel,
  isSettingsTab,
  isTankCardTab,
  normalizeRoute,
  panelTargetFor,
  parseRoute,
  routeForPanelTarget,
  routeLabel,
  type NavPanel,
  type ParsedRoute,
  type Route,
  type SettingsTab,
  type ShopFilters,
  type TankCardTab,
} from './routes';

/** Panels, plus Settings and the tank card, report their tab under these keys. */
export type NavKey = NavPanel | 'settings' | 'tankCard';

export interface NavBoot {
  /** The "Then: …" pill, or null when the route is the tank view. */
  dest: string | null;
  /** Real time since the save was written, once it is known (under a minute the card says only "Loading your save…"). */
  awayMs: number | null;
}

interface NavState {
  /** The active tab of each mounted panel (and Settings, the tank card), as they report it (`useNavTab`). */
  tab: Partial<Record<NavKey, string>>;
  /** The open sub-view of each mounted panel ('offer:<id>', 'species:<id>' …), as they report it (`useNavSub`). */
  sub: Partial<Record<NavKey, string>>;
  /** Transient: the offer detail says "Opened from your notification" (its banner comes with chunk 2). */
  fromNotification: boolean;
  /** A route waiting for a game (a link or reload boot, or a link with no save yet); applied once, when it starts. */
  pending: ParsedRoute | null;
  /** The loading card while a link or a reload opens a save. */
  boot: NavBoot | null;
}

export const useNav = create<NavState>(() => ({ tab: {}, sub: {}, fromNotification: false, pending: null, boot: null }));

const HOME: Route = { kind: 'home' };
/** How long after a pointer or key press a store change still counts as that gesture's navigation. */
const GESTURE_MS = 1500;
const SESSION_KEY = 'aquarium-go.nav.v1';

/** §6.5, §16: a link that names nothing. */
export const BROKEN_LINK = { title: 'That link doesn’t go anywhere', detail: 'Opened your aquarium instead.' } as const;
/** ADR-0019 decision 4: a link to something that no longer exists opens the nearest screen and says so. */
export const NOT_FOUND = {
  tank: { panel: 'tanks', target: null, title: 'That tank isn’t in your aquarium', detail: 'Showing your tanks instead.' },
  creature: { panel: 'livestock', target: 'tab:animals', title: 'That animal isn’t in your aquarium', detail: 'Showing your livestock instead.' },
  listing: { panel: 'market', target: 'tab:listings', title: 'That listing isn’t here any more', detail: 'Showing your listings instead.' },
  species: { panel: 'encyclopedia', target: 'tab:species', title: 'There’s no page for that species', detail: 'Showing every species instead.' },
} as const satisfies Record<string, { panel: NavPanel; target: string | null; title: string; detail: string }>;

let started = false;
let applying = 0;
let gestureAt = -Infinity;
let syncQueued = false;
/** A link that went nowhere: say so once the game is on screen (ADR-0019 decision 1). */
let brokenLinkOnStart = false;

// ───────────────────────────── reports from the panels ─────────────────────────────

function report(field: 'tab' | 'sub', key: NavKey, value: string | undefined): void {
  const cur = useNav.getState()[field];
  if (cur[key] === value) return;
  const next = { ...cur };
  if (value === undefined) delete next[key];
  else next[key] = value;
  useNav.setState(field === 'tab' ? { tab: next } : { sub: next });
}

/** A mounted panel reports its active tab, so the address follows the player's tab changes (§6.3). */
export function useNavTab(key: NavKey, tab: string | null | undefined): void {
  useEffect(() => report('tab', key, tab ?? undefined), [key, tab]);
  useEffect(() => () => report('tab', key, undefined), [key]);
}

/** A mounted panel reports the sub-view it shows ('offer:<id>'), or null when none is open. */
export function useNavSub(key: NavKey, sub: string | null | undefined): void {
  useEffect(() => report('sub', key, sub ?? undefined), [key, sub]);
  useEffect(() => () => report('sub', key, undefined), [key]);
}

// ───────────────────────────── stores → address ─────────────────────────────

const settingsTabOf = (t: string | null | undefined): SettingsTab => (isSettingsTab(t) ? t : 'general');
const tankTabOf = (t: string | null | undefined): TankCardTab => (isTankCardTab(t) ? t : 'water');

/** What is on screen, as a route. A command a panel hasn't handled yet counts as already done. */
export function currentRoute(): Route {
  const ui = useUI.getState();
  const shell = useShell.getState();
  const nav = useNav.getState();
  const g = useGame.getState().game;
  const p = ui.panel;
  if (p === 'settings') return { kind: 'settings', tab: settingsTabOf(shell.settingsTab ?? nav.tab.settings) };
  if (p && isNavPanel(p)) {
    const commanded = ui.panelTarget ? routeForPanelTarget(p, ui.panelTarget) : null;
    if (commanded) return commanded;
    const sub = nav.sub[p];
    return normalizeRoute(sub ? { kind: 'panel', panel: p, tab: nav.tab[p], target: sub } : { kind: 'panel', panel: p, tab: nav.tab[p] });
  }
  if (p) return HOME; // the dev panel has no address
  if (ui.selectedCreatureId && g?.creatures[ui.selectedCreatureId]) return { kind: 'creature', creatureId: ui.selectedCreatureId };
  if (shell.tankCardOpen && ui.focusedTankId && g?.tanks[ui.focusedTankId]) return { kind: 'tankCard', tankId: ui.focusedTankId, tab: tankTabOf(useTankCardTab.getState().want ?? nav.tab.tankCard) };
  if (shell.popover === 'more') return { kind: 'more' };
  return HOME;
}

const hasHistory = () => typeof location !== 'undefined' && typeof history !== 'undefined';
const routePart = (h: string) => h.split('?')[0];

/**
 * Write `hash` ('' removes it) without a hashchange. 'auto' pushes for the first change after a gesture and replaces
 * otherwise; a change of shop filters alone always replaces.
 */
function writeHash(hash: string, mode: 'auto' | 'push' | 'replace'): void {
  if (!hasHistory() || location.hash === hash) return;
  const filtersOnly = !!hash && !!location.hash && routePart(hash) === routePart(location.hash);
  // (a page without a hash is the title or onboarding: the game coming on screen takes its entry over, never stacks one)
  const push = !filtersOnly && !!location.hash && (mode === 'push' || (mode === 'auto' && performance.now() - gestureAt < GESTURE_MS));
  try {
    const url = location.pathname + location.search + hash;
    if (push) {
      gestureAt = -Infinity; // one entry per gesture
      history.pushState(history.state, '', url);
    } else history.replaceState(history.state, '', url);
  } catch (e) {
    console.warn('[nav] could not write the address', e);
  }
}

/** Write what is on screen into the address. Only in a game: the title and onboarding have no hash. */
export function syncAddress(mode: 'auto' | 'push' | 'replace' = 'auto'): void {
  syncQueued = false;
  if (!started || applying) return;
  const nav = useNav.getState();
  if (useUI.getState().screen !== 'game' || nav.boot || nav.pending) return;
  const route = currentRoute();
  const shop = route.kind === 'panel' && route.panel === 'market' && !route.target && route.tab === 'shop';
  writeHash(formatRoute(route, shop ? useShopFilters.getState().filters : undefined), mode);
}

/** Store changes come in bursts (one click sets several stores): write the address once, after the burst. */
function scheduleSync(): void {
  if (syncQueued || !started) return;
  syncQueued = true;
  queueMicrotask(() => {
    if (syncQueued) syncAddress('auto');
  });
}

// ───────────────────────────── address → stores ─────────────────────────────

const isMobileNow = () => typeof window !== 'undefined' && !!window.matchMedia?.(MOBILE_QUERY).matches;

function toast(t: { title: string; detail: string }): void {
  useUI.getState().toast(t.title, 'info', { detail: t.detail });
}

function closeCards(patch: Partial<UIState> = {}): void {
  useUI.getState().set({ panelTarget: null, selectedCreatureId: null, ...patch });
  const shell = useShell.getState();
  if (shell.tankCardOpen || shell.popover) shell.set({ tankCardOpen: false, popover: null });
}

function openPanelRoute(p: NavPanel, target: string | null): void {
  const shell = useShell.getState();
  if (shell.popover) shell.set({ popover: null });
  useUI.getState().set({ panel: p as UIState['panel'], panelTarget: target });
  tutorialFlag(`opened_panel:${p}`);
}

function notFound(kind: keyof typeof NOT_FOUND): void {
  const nf = NOT_FOUND[kind];
  closeCards();
  openPanelRoute(nf.panel, nf.target);
  toast(nf);
}

function applyInner(route: Route, filters: ShopFilters | undefined): void {
  const g = useGame.getState().game;
  switch (route.kind) {
    case 'home':
      closeCards({ panel: null });
      return;
    case 'more':
      if (!isMobileNow()) return applyInner(HOME, undefined); // desktop has no More sheet (§5.3)
      closeCards({ panel: null });
      useShell.getState().set({ popover: 'more' });
      return;
    case 'settings':
      useShell.getState().set({ settingsTab: route.tab, popover: null });
      useUI.getState().set({ panel: 'settings', panelTarget: null });
      return;
    case 'tankCard': {
      if (!g?.tanks[route.tankId]) return notFound('tank');
      useTankCardTab.setState({ want: route.tab });
      useUI.getState().set({ panel: null, panelTarget: null, selectedCreatureId: null, focusedTankId: route.tankId, view: 'tank' });
      useShell.getState().set({ tankCardOpen: true, popover: null });
      return;
    }
    case 'creature': {
      const c = g?.creatures[route.creatureId];
      if (!c) return notFound('creature');
      const inTank = c.status === 'alive' && !!c.tankId && !!g?.tanks[c.tankId];
      useShell.getState().set({ tankCardOpen: false, popover: null });
      useUI.getState().set({ panel: null, panelTarget: null, selectedCreatureId: c.id, ...(inTank ? { focusedTankId: c.tankId, view: 'tank' as const } : {}) });
      return;
    }
    case 'panel': {
      const { panel: p, target } = route;
      if (p === 'social') {
        // Social is built in chunk 6 (and is dev-only until a backend exists, ADR-0005 decision 3)
        toast(BROKEN_LINK);
        return applyInner(HOME, undefined);
      }
      if (p === 'market' && target?.startsWith('listing:') && !g?.market.listings.some((l) => l.id === target.slice(8))) return notFound('listing');
      if (p === 'encyclopedia' && target?.startsWith('species:') && !findSpecies(target.slice(8))) return notFound('species');
      if (p === 'market' && route.tab === 'shop' && !target && filters) useShopFilters.getState().setFilters(filters);
      useUI.getState().set({ selectedCreatureId: null });
      openPanelRoute(p, panelTargetFor(route));
      return;
    }
  }
}

/**
 * Address → stores (§6.2's third column). Sets the stores directly and never toggles. `mode` says how the address is
 * written afterwards: 'replace' when it came from the address, 'push' for a navigation from code (`go`).
 */
export function applyRoute(route: Route, filters?: ShopFilters, mode: 'push' | 'replace' = 'replace'): void {
  applying++;
  try {
    applyInner(normalizeRoute(route), filters);
  } finally {
    applying--;
  }
  if (!applying) syncAddress(mode);
}

/** Navigate from code (a button that opens a screen): apply the route and push its address (§6.3). */
export function go(route: Route, opts: { replace?: boolean; filters?: ShopFilters; fromNotification?: boolean } = {}): void {
  if (opts.fromNotification) useNav.setState({ fromNotification: true });
  applyRoute(route, opts.filters, opts.replace ? 'replace' : 'push');
}

function onHashChange(): void {
  gestureAt = -Infinity; // the entry exists already: nothing that follows may push another
  const parsed = parseRoute(location.hash);
  const screen = useUI.getState().screen;
  if (screen !== 'game') {
    // a link typed or followed while on the title (open it like a link) or during onboarding (it waits)
    if (!parsed || parsed.route.kind === 'home' || useNav.getState().boot) return;
    if (screen === 'title' || screen === 'boot') void bootLoad(parsed, false);
    else useNav.setState({ pending: parsed });
    return;
  }
  if (!parsed) {
    toast(BROKEN_LINK);
    applyRoute(HOME);
    return;
  }
  applyRoute(parsed.route, parsed.filters);
}

// ───────────────────────────── boot, reload, leaving ─────────────────────────────

type NavType = 'navigate' | 'reload' | 'back_forward' | 'prerender';

interface BootCapture {
  hash: string;
  /** The page was reloaded, or reached again through history (ADR-0019 decision 2). */
  returning: boolean;
  /** `?fixture=` / `?showcase=` / `?sandbox=`: App.tsx builds that world, and the address opens on top of it. */
  urlBoot: boolean;
  /** This boot will open a save behind the loading card (QA's `__AQ.ready` waits for it). */
  loads: boolean;
  used: boolean;
}

function captureBoot(): BootCapture {
  if (typeof location === 'undefined') return { hash: '', returning: false, urlBoot: false, loads: false, used: true };
  let type: NavType = 'navigate';
  try {
    const entry = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (entry?.type) type = entry.type as NavType;
  } catch {
    /* an older engine: treat it as a link */
  }
  const q = new URLSearchParams(location.search);
  const hash = location.hash === '#' ? '' : location.hash;
  const returning = type === 'reload' || type === 'back_forward';
  const urlBoot = q.has('fixture') || q.has('showcase') || q.has('sandbox');
  const parsed = hash ? parseRoute(hash) : null;
  const loads = !!hash && !urlBoot && (returning || (!!parsed && parsed.route.kind !== 'home'));
  return { hash, returning, urlBoot, loads, used: useUI.getState().screen !== 'boot' };
}

/** Read once, when this module first loads during startup (§6.4 item 1; B-117): the address and how the page opened. */
const BOOT: BootCapture = captureBoot();

/** Is a link or reload boot still opening a save? (`__AQ.ready` stays false meanwhile.) */
export const navBootPending = (): boolean => (!BOOT.used && BOOT.loads) || !!useNav.getState().boot;

function rememberGame(): void {
  try {
    const g = useGame.getState().game;
    if (g && !g.isShowcase) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ saveId: g.saveId }));
  } catch {
    /* storage blocked: a reload then reopens the latest save */
  }
}

function forgetGame(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function rememberedSaveId(): string | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as { saveId?: unknown } | null;
    return typeof v?.saveId === 'string' ? v.saveId : null;
  } catch {
    return null;
  }
}

/**
 * Open a save behind the loading card, then the route (it waits in `pending` until the game is on screen). A reload
 * prefers the aquarium this tab was playing; a link takes the latest save. No save: the title, and the route keeps
 * waiting for the first game. A failed load: the title, with the load's own message (`reportLoadFailure`).
 */
async function bootLoad(parsed: ParsedRoute, returning: boolean): Promise<void> {
  const dest = routeLabel(parsed.route);
  useNav.setState({ boot: { dest, awayMs: null }, pending: parsed.route.kind === 'home' ? null : parsed });
  let slot: string | null = null;
  try {
    const metas = (await listSaves()).filter((m) => !m.previousOf);
    const sid = returning ? rememberedSaveId() : null;
    const meta = (sid ? metas.find((m) => m.saveId === sid) : undefined) ?? metas[0];
    if (meta) {
      slot = meta.slot;
      useNav.setState({ boot: { dest, awayMs: Math.max(0, Date.now() - meta.savedAt) } });
    }
  } catch (e) {
    console.warn('[nav] could not list the saves for a link', e);
  }
  if (!slot) {
    useNav.setState({ boot: null });
    if (!useNav.getState().pending) writeHash('', 'replace');
    return;
  }
  const mark = toastMark();
  const g = await loadIntoGame(slot);
  if (!g) {
    reportLoadFailure(mark);
    brokenLinkOnStart = false;
    useNav.setState({ boot: null, pending: null });
    if (useUI.getState().screen !== 'game') writeHash('', 'replace');
    return;
  }
  useNav.setState({ boot: null });
  syncAddress('replace');
}

function runBoot(): void {
  if (BOOT.used) return;
  BOOT.used = true;
  const { hash, returning, urlBoot } = BOOT;
  if (!hash) return; // a plain address: the title
  const parsed = parseRoute(hash);
  if (urlBoot) {
    if (parsed && parsed.route.kind !== 'home') useNav.setState({ pending: parsed });
    return;
  }
  if (!parsed) brokenLinkOnStart = true;
  if (returning) void bootLoad(parsed ?? { route: HOME }, true);
  else if (parsed && parsed.route.kind !== 'home') void bootLoad(parsed, false);
  else writeHash('', 'replace'); // a link to the tank view, or to nowhere, shows the title (ADR-0019 decision 1)
}

/** A game came on screen (a new game, Continue, a link or reload boot, a fixture): its pending route, else `#/`. */
function onGameStart(): void {
  rememberGame();
  queueMicrotask(() => {
    if (useUI.getState().screen !== 'game') return;
    const { pending } = useNav.getState();
    if (pending) {
      useNav.setState({ pending: null });
      applyRoute(pending.route, pending.filters, 'replace');
    } else writeHash('#/', 'replace');
    if (brokenLinkOnStart) {
      brokenLinkOnStart = false;
      toast(BROKEN_LINK);
    }
  });
}

/** One-shot commands and sub-views belong to the aquarium they were made for (§6.4 item 5). */
function resetTransient(): void {
  if (useUI.getState().panelTarget) useUI.getState().set({ panelTarget: null });
  useNav.setState({ sub: {}, fromNotification: false });
}

function onLeaveGame(): void {
  forgetGame();
  resetTransient();
  if (!useNav.getState().boot) writeHash('', 'replace');
}

/** Another aquarium replaced the one on screen (a slot loaded from Settings): back to `#/`, no Back into the old one. */
function onSaveSwitch(): void {
  rememberGame();
  resetTransient();
  writeHash('#/', 'replace');
}

const onGesture = () => {
  gestureAt = performance.now();
};

/**
 * Start the router (UIRoot calls it once, on mount): listeners, store subscriptions, then the boot. Returns the
 * cleanup (tests). `boot: false` skips the startup boot.
 */
export function startRouter(opts: { boot?: boolean } = {}): () => void {
  if (started || !hasHistory()) return () => {};
  started = true;
  const offs: (() => void)[] = [];
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('pointerdown', onGesture, true);
  window.addEventListener('keydown', onGesture, true);
  offs.push(() => {
    window.removeEventListener('hashchange', onHashChange);
    window.removeEventListener('pointerdown', onGesture, true);
    window.removeEventListener('keydown', onGesture, true);
  });
  offs.push(
    useUI.subscribe((s, p) => {
      if (s.screen !== p.screen) {
        if (s.screen === 'game') onGameStart();
        else if (p.screen === 'game') onLeaveGame();
        return;
      }
      if (s.panel !== p.panel || s.panelTarget !== p.panelTarget || s.selectedCreatureId !== p.selectedCreatureId || s.focusedTankId !== p.focusedTankId) scheduleSync();
    }),
  );
  offs.push(
    useGame.subscribe((s, p) => {
      if (s.game?.saveId !== p.game?.saveId && p.game && s.game && useUI.getState().screen === 'game') onSaveSwitch();
    }),
  );
  offs.push(
    useShell.subscribe((s, p) => {
      if (s.popover !== p.popover || s.tankCardOpen !== p.tankCardOpen || s.settingsTab !== p.settingsTab) scheduleSync();
    }),
  );
  offs.push(useNav.subscribe((s, p) => (s.tab !== p.tab || s.sub !== p.sub ? scheduleSync() : undefined)));
  offs.push(useShopFilters.subscribe((s, p) => (s.filters !== p.filters ? scheduleSync() : undefined)));
  offs.push(useTankCardTab.subscribe((s, p) => (s.want !== p.want ? scheduleSync() : undefined)));
  if (opts.boot !== false) runBoot();
  if (useUI.getState().screen === 'game') onGameStart();
  return () => {
    for (const off of offs) off();
    started = false;
    syncQueued = false;
  };
}
