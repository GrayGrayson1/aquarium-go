/**
 * Hash routes (0.5 spec §6.2): what each `#/…` address opens, as pure data. No stores and no DOM here: the router
 * (./router.ts) applies a Route to the stores and writes the address back. OWNER: lane "ui-shell".
 *
 * Grammar (docs/TEST_IDS.md has the table): `#/` · `#/tanks` · `#/tanks/:tankId[/equipment|/life|/value]` ·
 * `#/livestock[/eggs|/past|/production]` · `#/livestock/animal/:creatureId` · `#/shop[?prismatic=1&rare=1&env=…]` ·
 * `#/shop/fish/:offerId` · `#/market/supplies[/:foodId]` · `#/market/listings[/:listingId]` · `#/market/history` ·
 * `#/build[/decor|/equipment|/substrate|/facility]` · `#/visitors[/staff]` · `#/shows[/entries|/results|/trophies]` ·
 * `#/research[/unlocks|/quests|/achievements]` · `#/finances` · `#/encyclopedia[/science[/:articleId]|/:speciesId]` ·
 * `#/social[/clubs|/trading|/friends|/leaderboards|/join/:code]` · `#/settings[/play|/saves|/notifications|/about]` ·
 * `#/more` · `#/log`.
 *
 * Canonical addresses leave a panel's first tab out (`#/build` is Build › Tanks). The URL word differs from the
 * internal id in four places: equipment ↔ gear (tank card), play ↔ display (Settings), eggs ↔ young (Livestock) and
 * history ↔ trends (Market; `#/market/trends` is accepted too). An unknown tab opens the panel's first tab; an unknown
 * path parses to null (the router then shows the broken-link toast).
 */
import type { PanelId } from '@/state/ui';

/** The management panels a route can open. Settings has its own kind; Social is parsed now and built in chunk 6. */
export type NavPanel = Exclude<PanelId, 'settings' | 'dev'> | 'social';
export type SettingsTab = 'general' | 'display' | 'saves' | 'notifications' | 'about';
export type TankCardTab = 'water' | 'gear' | 'life' | 'value';
export type EnvFilter = 'all' | 'fits' | 'freshwater' | 'marine' | 'brackish';

export type Route =
  | { kind: 'home' }
  /** `tab` is the panel's internal tab id (its first tab when absent); `target` a sub-view such as `offer:<id>`. */
  | { kind: 'panel'; panel: NavPanel; tab?: string; target?: string }
  | { kind: 'tankCard'; tankId: string; tab: TankCardTab }
  | { kind: 'creature'; creatureId: string }
  | { kind: 'more' }
  | { kind: 'settings'; tab: SettingsTab };

export interface ShopFilters {
  prismatic: boolean;
  rare: boolean;
  env: EnvFilter;
}

export const DEFAULT_SHOP_FILTERS: Readonly<ShopFilters> = Object.freeze({ prismatic: false, rare: false, env: 'all' as EnvFilter });
const ENV_FILTERS: readonly EnvFilter[] = ['all', 'fits', 'freshwater', 'marine', 'brackish'];

export interface ParsedRoute {
  route: Route;
  /** Only when a `#/shop` address carried a filter query (without one, the router re-applies the session's filters). */
  filters?: ShopFilters;
}

/** A tab: internal id, its URL word (null for the panel's first tab, which has none) and its name in a "Then:" pill. */
interface TabSpec {
  id: string;
  word: string | null;
  label: string;
}

const tabs = (...specs: [id: string, word: string | null, label: string][]): readonly TabSpec[] => specs.map(([id, word, label]) => ({ id, word, label }));

const PANEL_TABS: Record<NavPanel, readonly TabSpec[]> = {
  tanks: [],
  livestock: tabs(['animals', null, 'Animals'], ['young', 'eggs', 'Eggs & fry'], ['past', 'past', 'Past residents'], ['production', 'production', 'Production']),
  market: tabs(['shop', null, 'Shop'], ['supplies', 'supplies', 'Supplies'], ['listings', 'listings', 'My listings'], ['trends', 'history', 'History & demand']),
  visitors: tabs(['visitors', null, 'Visitors'], ['staff', 'staff', 'Staff']),
  build: tabs(['tanks', null, 'Tanks'], ['decor', 'decor', 'Decor'], ['equipment', 'equipment', 'Equipment'], ['substrate', 'substrate', 'Substrate'], ['facility', 'facility', 'Facility']),
  research: tabs(['research', null, 'Research'], ['unlocks', 'unlocks', 'Unlock map'], ['quests', 'quests', 'Quests'], ['achievements', 'achievements', 'Achievements']),
  finances: [],
  encyclopedia: tabs(['species', null, 'Species'], ['science', 'science', 'Aquarium science']),
  log: [],
  shows: tabs(['upcoming', null, 'Upcoming'], ['entries', 'entries', 'Entries'], ['results', 'results', 'Results'], ['trophies', 'trophies', 'Trophy case']),
  social: tabs(['overview', null, 'Overview'], ['clubs', 'clubs', 'Clubs'], ['trading', 'trading', 'Trading'], ['friends', 'friends', 'Friends'], ['leaderboards', 'leaderboards', 'Leaderboards']),
};

/** Panel names in a "Then:" pill (the dock's labels). */
const PANEL_LABEL: Record<NavPanel, string> = {
  tanks: 'Tanks',
  livestock: 'Livestock',
  market: 'Market',
  visitors: 'Visitors',
  build: 'Build',
  research: 'Research',
  finances: 'Finances',
  encyclopedia: 'Encyclopedia',
  log: 'Event log',
  shows: 'Shows',
  social: 'Social',
};

const SETTINGS_TABS = tabs(['general', null, 'General'], ['display', 'play', 'Play & access'], ['saves', 'saves', 'Saves'], ['notifications', 'notifications', 'Notifications'], ['about', 'about', 'About']);
const TANK_TABS = tabs(['water', null, 'Water'], ['gear', 'equipment', 'Equipment'], ['life', 'life', 'Life'], ['value', 'value', 'Value']);

export const NAV_PANELS = Object.keys(PANEL_TABS) as NavPanel[];
export const isNavPanel = (p: unknown): p is NavPanel => typeof p === 'string' && Object.hasOwn(PANEL_TABS, p);

/** The panel's first tab (undefined for panels without tabs). */
export const defaultTab = (panel: NavPanel): string | undefined => PANEL_TABS[panel][0]?.id;
/** Is `tab` one of the panel's tabs? */
export const isPanelTab = (panel: NavPanel, tab: string | undefined): tab is string => !!tab && PANEL_TABS[panel].some((t) => t.id === tab);
export const isSettingsTab = (t: unknown): t is SettingsTab => SETTINGS_TABS.some((s) => s.id === t);
export const isTankCardTab = (t: unknown): t is TankCardTab => TANK_TABS.some((s) => s.id === t);

/** The tab a URL word names, else the list's first tab (undefined only for a panel without tabs). */
const byWord = (list: readonly TabSpec[], word: string | undefined): TabSpec | undefined => list.find((t) => word !== undefined && t.word === word) ?? list[0];
const byId = (list: readonly TabSpec[], id: string | undefined): TabSpec | undefined => list.find((t) => t.id === id) ?? list[0];

const HOME: Route = { kind: 'home' };
const panel = (p: NavPanel, tab?: string, target?: string): Route => (target ? { kind: 'panel', panel: p, tab, target } : tab ? { kind: 'panel', panel: p, tab } : { kind: 'panel', panel: p });

/** The query of a `#/shop` address, or undefined when it names no filter. */
function parseFilters(query: string): ShopFilters | undefined {
  if (!query) return undefined;
  const q = new URLSearchParams(query);
  if (!q.has('prismatic') && !q.has('rare') && !q.has('env')) return undefined;
  const env = q.get('env') as EnvFilter | null;
  return { prismatic: q.get('prismatic') === '1', rare: q.get('rare') === '1', env: env && ENV_FILTERS.includes(env) ? env : 'all' };
}

/** `?prismatic=1&rare=1&env=marine`: keys in that order, defaults left out ('' when everything is the default). */
export function formatFilters(f: ShopFilters | undefined): string {
  if (!f) return '';
  const parts: string[] = [];
  if (f.prismatic) parts.push('prismatic=1');
  if (f.rare) parts.push('rare=1');
  if (f.env !== 'all' && ENV_FILTERS.includes(f.env)) parts.push(`env=${f.env}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/** Parse a `location.hash` ('#/shop/fish/offer_k3', '#/', '' …). Null when the path names nothing we know. */
export function parseRoute(hash: string): ParsedRoute | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const qi = h.indexOf('?');
  const path = qi >= 0 ? h.slice(0, qi) : h;
  const query = qi >= 0 ? h.slice(qi + 1) : '';
  if (path !== '' && !path.startsWith('/')) return null;
  let segs: string[];
  try {
    segs = path.split('/').filter(Boolean).map((s) => decodeURIComponent(s));
  } catch {
    return null; // a malformed %-escape
  }
  const [a, b, c] = segs;
  const tabOf = (p: NavPanel, word: string | undefined) => byWord(PANEL_TABS[p], word)?.id;
  switch (a) {
    case undefined:
      return { route: HOME };
    case 'more':
      return { route: { kind: 'more' } };
    case 'settings':
      return { route: { kind: 'settings', tab: (byWord(SETTINGS_TABS, b)?.id ?? 'general') as SettingsTab } };
    case 'tanks':
      return { route: b ? { kind: 'tankCard', tankId: b, tab: (byWord(TANK_TABS, c)?.id ?? 'water') as TankCardTab } : panel('tanks') };
    case 'livestock':
      if (b === 'animal') return { route: c ? { kind: 'creature', creatureId: c } : panel('livestock', 'animals') };
      return { route: panel('livestock', tabOf('livestock', b)) };
    case 'shop':
      if (b === 'fish' && c) return { route: panel('market', 'shop', `offer:${c}`) };
      return { route: panel('market', 'shop'), filters: parseFilters(query) };
    case 'market': {
      if (b === 'supplies') return { route: panel('market', 'supplies', c ? `food:${c}` : undefined) };
      if (b === 'listings') return { route: panel('market', 'listings', c ? `listing:${c}` : undefined) };
      if (b === 'history' || b === 'trends') return { route: panel('market', 'trends') };
      return { route: panel('market', 'shop'), filters: b === undefined || b === 'shop' ? parseFilters(query) : undefined };
    }
    case 'encyclopedia':
      if (b === 'science') return { route: panel('encyclopedia', 'science', c ? `science:${c}` : undefined) };
      return { route: b ? panel('encyclopedia', 'species', `species:${b}`) : panel('encyclopedia', 'species') };
    case 'social':
      if (b === 'join') return { route: c ? panel('social', 'overview', `join:${c}`) : panel('social', 'overview') };
      return { route: panel('social', tabOf('social', b)) };
    case 'build':
    case 'visitors':
    case 'shows':
    case 'research':
      return { route: panel(a, tabOf(a, b)) };
    case 'finances':
    case 'log':
      return { route: panel(a) };
    default:
      return null;
  }
}

const enc = (s: string) => encodeURIComponent(s);
const after = (target: string | undefined, prefix: string) => (target?.startsWith(prefix) && target.length > prefix.length ? target.slice(prefix.length) : null);

/** The canonical address of a route ('#/shop?env=marine'). Filters only apply to the plain shop route. */
export function formatRoute(route: Route, filters?: ShopFilters): string {
  switch (route.kind) {
    case 'home':
      return '#/';
    case 'more':
      return '#/more';
    case 'settings': {
      const w = byId(SETTINGS_TABS, route.tab)?.word;
      return w ? `#/settings/${w}` : '#/settings';
    }
    case 'tankCard': {
      const w = byId(TANK_TABS, route.tab)?.word;
      return `#/tanks/${enc(route.tankId)}${w ? `/${w}` : ''}`;
    }
    case 'creature':
      return `#/livestock/animal/${enc(route.creatureId)}`;
    case 'panel':
      break;
  }
  const { panel: p, target } = route;
  const spec = byId(PANEL_TABS[p], route.tab);
  if (p === 'market') {
    const offer = after(target, 'offer:');
    if (offer) return `#/shop/fish/${enc(offer)}`;
    const food = after(target, 'food:');
    if (food) return `#/market/supplies/${enc(food)}`;
    const listing = after(target, 'listing:');
    if (listing) return `#/market/listings/${enc(listing)}`;
    return !spec || spec.id === 'shop' ? `#/shop${formatFilters(filters)}` : `#/market/${spec.word}`;
  }
  if (p === 'encyclopedia') {
    const species = after(target, 'species:');
    if (species) return `#/encyclopedia/${enc(species)}`;
    const article = after(target, 'science:');
    if (article) return `#/encyclopedia/science/${enc(article)}`;
  }
  if (p === 'social') {
    const code = after(target, 'join:');
    if (code) return `#/social/join/${enc(code)}`;
  }
  return spec?.word ? `#/${p}/${spec.word}` : `#/${p}`;
}

/** Fill in the panel's tab (its first tab when absent or unknown), so equal destinations compare equal. */
export function normalizeRoute(route: Route): Route {
  if (route.kind !== 'panel') return route;
  const tab = isPanelTab(route.panel, route.tab) ? route.tab : defaultTab(route.panel);
  return panel(route.panel, tab, route.target);
}

/** The one-shot `panelTarget` command that opens a panel route: its sub-view, else an explicit `tab:<id>` (B-115). */
export function panelTargetFor(route: Extract<Route, { kind: 'panel' }>): string | null {
  if (route.target) return route.target;
  const tab = isPanelTab(route.panel, route.tab) ? route.tab : defaultTab(route.panel);
  return tab ? `tab:${tab}` : null;
}

/**
 * What an existing `panelTarget` command will open, as a route, for the address bar to show before the panel has
 * handled it ('listing:l1' → My listings › l1, 'clutches' → Eggs & fry). Commands with no address of their own
 * (a listing wizard, a decor category…) give their panel's tab, or null when that isn't known.
 */
export function routeForPanelTarget(p: NavPanel, target: string): Route | null {
  const tab = after(target, 'tab:');
  if (tab) return panel(p, isPanelTab(p, tab) ? tab : defaultTab(p));
  switch (p) {
    case 'market':
      if (after(target, 'offer:')) return panel(p, 'shop', target);
      if (after(target, 'food:')) return panel(p, 'supplies', target);
      if (after(target, 'listing:')) return panel(p, 'listings', target);
      if (target === 'sell' || target === 'list' || target.startsWith('list:')) return panel(p, 'listings');
      return null;
    case 'encyclopedia':
      if (after(target, 'species:')) return panel(p, 'species', target);
      if (after(target, 'science:')) return panel(p, 'science', target);
      return null;
    case 'livestock':
      if (target === 'young' || target === 'clutches') return panel(p, 'young');
      if (target.startsWith('sell:')) return panel(p, 'animals');
      return null;
    case 'build':
      if (target.startsWith('equipment:')) return panel(p, 'equipment');
      if (target.startsWith('decor:') || target.startsWith('decor-cat:')) return panel(p, 'decor');
      return null;
    case 'visitors':
      return target === 'staff' || target === 'visitors' ? panel(p, target) : null;
    case 'shows':
      if (target.startsWith('result:')) return panel(p, 'results');
      if (target.startsWith('show:') || target.startsWith('enter:')) return panel(p, 'upcoming');
      return null;
    case 'social':
      return after(target, 'join:') ? panel(p, 'overview', target) : null;
    default:
      return null;
  }
}

/** Do two routes open the same thing (filters aside)? */
export const sameRoute = (a: Route, b: Route): boolean => formatRoute(normalizeRoute(a)) === formatRoute(normalizeRoute(b));

/**
 * The link to share for a route: this page's origin and path plus the route, and nothing else, so `?dev=1`,
 * `?fixture=…` and any other query flag never travel (§6.6).
 */
export function shareUrl(route: Route, loc: { origin: string; pathname: string } = location, filters?: ShopFilters): string {
  return `${loc.origin}${loc.pathname}${formatRoute(route, filters)}`;
}

/** Names the pill can use once the save is read (a tank's, an animal's or an offer's), or null to keep the generic. */
export interface RouteNames {
  tank?: (id: string) => string | null;
  creature?: (id: string) => string | null;
  offer?: (id: string) => string | null;
  species?: (id: string) => string | null;
}

const SEP = ' › ';

/** Where a route goes, for the loading card's "Then: …" pill: "Livestock › Eggs & fry". Null for home. */
export function routeLabel(route: Route, names: RouteNames = {}): string | null {
  switch (route.kind) {
    case 'home':
      return null;
    case 'more':
      return 'More';
    case 'settings':
      return `Settings${SEP}${byId(SETTINGS_TABS, route.tab)?.label ?? 'General'}`;
    case 'tankCard':
      return `${names.tank?.(route.tankId) ?? 'Tank card'}${SEP}${byId(TANK_TABS, route.tab)?.label ?? 'Water'}`;
    case 'creature':
      return `Livestock${SEP}${names.creature?.(route.creatureId) ?? 'Animal'}`;
    case 'panel':
      break;
  }
  const { panel: p, target } = route;
  const title = PANEL_LABEL[p];
  const offer = p === 'market' ? after(target, 'offer:') : null;
  if (offer) return `${title}${SEP}${names.offer?.(offer) ?? 'Shop'}`;
  const species = p === 'encyclopedia' ? after(target, 'species:') : null;
  if (species) return `${title}${SEP}${names.species?.(species) ?? 'Species'}`;
  if (p === 'social' && after(target, 'join:')) return `${title}${SEP}Club invite`;
  const spec = byId(PANEL_TABS[p], route.tab);
  return spec ? `${title}${SEP}${spec.label}` : title;
}
