/**
 * chunk 19 (ADR-0055 decision 3, QOL-004) — Find anything: one search over the whole game, and where each result goes.
 * Pure over the game (node-safe; tests/sim/qol-search.test.ts): screens (every panel and tab, Settings', the tour),
 * your tanks and animals, the shop's stock, food, equipment, decor, tank sizes, research, unlocks still to come and
 * the species you have discovered. A list item opens its list searched for it (`find:` panel targets) with the item
 * glowing. The group names and details are drafted words (ADR-0055 decision 8). OWNER: lane "ui-shell".
 */
import type { Environment, GameState, Tank, WaterClass } from '@/types';
import type { PanelId } from '@/state/ui';
import { DECOR } from '@/data/catalog/decor';
import { EQUIPMENT } from '@/data/catalog/equipment';
import { FOODS } from '@/data/catalog/foods';
import { TANK_TIERS } from '@/data/catalog/tanks';
import { RESEARCH } from '@/data/research';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import { ALL_SPECIES, findSpecies } from '@/data/species';
import { isFoodAvailable, isSpeciesAvailable } from '@/sim/economy';
import { morphDisplayName } from '@/sim/life/genetics';
import { screenList, type Route } from '../nav/routes';
import { fold, queryWords, score } from '../panels/common/match';

export type FindGroup = 'Screens' | 'Your tanks' | 'Your animals' | 'In the shop' | 'Food & supplies' | 'Equipment' | 'Decor' | 'Tank sizes' | 'Research' | 'Unlocks' | 'Encyclopedia';

/** The order groups are listed in. */
export const FIND_GROUPS: readonly FindGroup[] = ['Screens', 'Your tanks', 'Your animals', 'In the shop', 'Food & supplies', 'Equipment', 'Decor', 'Tank sizes', 'Research', 'Unlocks', 'Encyclopedia'];

export type FindGo =
  | { kind: 'route'; route: Route }
  | { kind: 'panel'; panel: PanelId; target: string | null }
  | { kind: 'tank'; tankId: string }
  | { kind: 'creature'; creatureId: string }
  | { kind: 'tour' };

export interface FindResult {
  key: string;
  group: FindGroup;
  title: string;
  detail?: string;
  locked?: boolean;
  score: number;
  go: FindGo;
}

/** At most this many results per group (the whole list stays short enough to scan). */
export const PER_GROUP = 6;

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** An item made for some waters (equipment's and decor's `environments`, decor's `waterClasses`) suits this tank. */
export function itemSuitsTank(t: Pick<Tank, 'environment' | 'waterClass'>, envs: readonly Environment[] | undefined, wcs?: readonly WaterClass[]): boolean {
  return (!envs?.length || envs.includes(t.environment)) && (!wcs?.length || wcs.includes(t.waterClass));
}
/** Some tank of yours can take the item. */
export function anyTankSuits(g: GameState, envs: readonly Environment[] | undefined, wcs?: readonly WaterClass[]): boolean {
  return g.tankOrder.some((id) => !!g.tanks[id] && itemSuitsTank(g.tanks[id], envs, wcs));
}
const ENV_WORD: Record<Environment, string> = { freshwater: 'freshwater', marine: 'marine', brackish: 'brackish' };
const WC_WORD: Record<WaterClass, string> = { freshwater_cool: 'cool freshwater', freshwater_tropical: 'tropical freshwater', freshwater_planted: 'planted', marine_fowlr: 'fish-only marine', marine_live_rock: 'live rock', reef: 'reef', brackish: 'brackish' };
const orList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);
/** "Needs a reef tank" when no tank of yours can take the item (reviewer B5: it led to an empty list), else null. */
export function needsTankText(g: GameState, envs: readonly Environment[] | undefined, wcs?: readonly WaterClass[]): string | null {
  if (anyTankSuits(g, envs, wcs)) return null;
  const words = wcs?.length ? [...new Set(wcs.map((w) => WC_WORD[w] ?? w))] : (envs ?? []).map((e) => ENV_WORD[e] ?? e);
  return words.length ? `Needs a ${orList(words)} tank` : null;
}
const has = (g: GameState, key: string | undefined | null) => !key || g.progress.unlocked.includes(key);
/** Destinations the dock locks (src/ui/hud/Dock.tsx DOCK_ITEMS' `lock`). */
const SCREEN_LOCK: Partial<Record<string, string>> = { visitors: 'visitors', shows: 'shows' };
const TOUR_WORDS = 'tour guide help show me around how to play';

/**
 * Search the game. An empty query lists the screens (and the tour), so the box doubles as a map of the game.
 * `social`: Social and Settings › Account exist in this build (src/ui/online/mode.ts). `tour: false` leaves the tour
 * out (a shared shop: its Settings don't offer it either).
 */
export function findAnything(g: GameState, q: string, opts: { social?: boolean; /** false in a shared shop (it has no tour) */ tour?: boolean } = {}): FindResult[] {
  const words = queryWords(q);
  const out: FindResult[] = [];
  const push = (r: Omit<FindResult, 'score'>, name: string, ...more: (string | undefined | null | false)[]) => {
    const s = words.length ? score(words, name, ...more) : r.group === 'Screens' ? 1 : 0;
    if (s > 0) out.push({ ...r, score: s });
  };

  // screens (and the tour)
  if (opts.tour !== false) push({ key: 'tour', group: 'Screens', title: 'Show me around', detail: 'A tour of the whole game', go: { kind: 'tour' } }, 'Show me around', TOUR_WORDS);
  for (const sc of screenList()) {
    if (!opts.social && (sc.panel === 'social' || (sc.route.kind === 'settings' && sc.route.tab === 'account'))) continue;
    const lock = sc.panel !== 'settings' ? SCREEN_LOCK[sc.panel] : undefined;
    push({ key: `screen:${sc.name}`, group: 'Screens', title: sc.name, locked: !!lock && !has(g, lock), go: { kind: 'route', route: sc.route } }, sc.name);
  }
  if (!words.length) return out;

  // your tanks and animals
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (!t) continue;
    push({ key: `tank:${id}`, group: 'Your tanks', title: t.name, detail: `${tierGallons(t.tierId)} gal · ${t.cache.status === 'good' ? 'Healthy' : t.cache.status === 'danger' ? 'Danger' : 'Watch'}`, go: { kind: 'tank', tankId: id } }, t.name, 'tank');
  }
  for (const c of Object.values(g.creatures)) {
    if (c.status !== 'alive' && c.status !== 'listed') continue;
    const sp = findSpecies(c.speciesId);
    const where = c.tankId ? g.tanks[c.tankId]?.name : undefined;
    push({ key: `animal:${c.id}`, group: 'Your animals', title: c.name || sp?.commonName || 'Animal', detail: [sp?.commonName, where].filter(Boolean).join(' · '), go: { kind: 'creature', creatureId: c.id } }, c.name || '', sp?.commonName, c.morphName);
  }

  // the shop's stock
  for (const o of g.market.stock) {
    const sp = findSpecies(o.speciesId);
    if (!sp) continue;
    const lead = o.creatures[0];
    const name = safeName(() => morphDisplayName(sp, lead?.morphName ?? ''), sp.commonName);
    const title = o.kind === 'group' ? `${o.creatures.length} × ${name}` : name;
    push({ key: `offer:${o.id}`, group: 'In the shop', title, detail: `${money(o.price)} · ${o.seller}`, locked: !isSpeciesAvailable(g, sp.id), go: { kind: 'panel', panel: 'market', target: `offer:${o.id}` } }, title, sp.commonName, sp.scientificName);
  }

  // what you can buy and build
  for (const f of FOODS) {
    const locked = !has(g, f.unlock) || !safeBool(() => isFoodAvailable(g, f));
    push({ key: `food:${f.id}`, group: 'Food & supplies', title: f.name, detail: `${money(f.price)} · Market › Supplies`, locked, go: { kind: 'panel', panel: 'market', target: `food:${f.id}` } }, f.name, 'food', f.description);
  }
  // (an item no tank of yours can take says which tank it needs; Build then opens on Tanks, on that water)
  for (const e of EQUIPMENT) {
    const needs = needsTankText(g, e.environments);
    push({ key: `equip:${e.id}`, group: 'Equipment', title: e.name, detail: `${money(e.price)} · ${needs ?? 'Build › Equipment'}`, locked: !has(g, e.unlock), go: { kind: 'panel', panel: 'build', target: `find:equipment:${e.id}` } }, e.name, e.kind.replace(/_/g, ' '), e.description);
  }
  for (const d of DECOR) {
    const needs = needsTankText(g, d.environments, d.waterClasses);
    push({ key: `decor:${d.id}`, group: 'Decor', title: d.name, detail: `${money(d.price)} · ${needs ?? 'Build › Decor'}`, locked: !has(g, d.unlock), go: { kind: 'panel', panel: 'build', target: `find:decor:${d.id}` } }, d.name, d.category.replace(/_/g, ' '));
  }
  for (const t of TANK_TIERS) {
    push({ key: `tier:${t.id}`, group: 'Tank sizes', title: t.name, detail: `${t.gallons.toLocaleString('en-US')} gallons · Build › Tanks`, locked: !has(g, t.unlock), go: { kind: 'panel', panel: 'build', target: `find:tank:${t.id}` } }, t.name, `${t.gallons} gallon gal tank aquarium`);
  }

  // research and unlocks
  const done = new Set(g.progress.research.completed);
  for (const r of RESEARCH) {
    const status = done.has(r.id) ? 'Complete' : g.progress.research.activeId === r.id ? 'In progress' : '';
    push({ key: `research:${r.id}`, group: 'Research', title: r.name, detail: status ? `${status} · Research` : 'Research', go: { kind: 'panel', panel: 'research', target: `research:${r.id}` } }, r.name, r.blurb, ...r.grants.map((k) => (UNLOCK_KEYS as Record<string, string>)[k]));
  }
  for (const [key, label] of Object.entries(UNLOCK_KEYS)) {
    if (has(g, key)) continue;
    push({ key: `unlock:${key}`, group: 'Unlocks', title: label, detail: UNLOCK_RULE_BY_KEY[key]?.hint, locked: true, go: { kind: 'panel', panel: 'research', target: `unlock:${key}` } }, label, UNLOCK_RULE_BY_KEY[key]?.hint);
  }

  // the Encyclopedia: species you have discovered (the rest can't be searched there either)
  const known = new Set(g.progress.discoveredSpecies);
  for (const c of Object.values(g.creatures)) if (c.status !== 'dead') known.add(c.speciesId);
  for (const sp of ALL_SPECIES) {
    if (!known.has(sp.id)) continue;
    push({ key: `species:${sp.id}`, group: 'Encyclopedia', title: sp.commonName, detail: sp.scientificName, go: { kind: 'panel', panel: 'encyclopedia', target: `species:${sp.id}` } }, sp.commonName, sp.scientificName);
  }
  return out;
}

/** The results in the order shown: by group, best first within a group, at most `PER_GROUP` each. */
export function orderResults(list: FindResult[]): FindResult[] {
  const out: FindResult[] = [];
  for (const grp of FIND_GROUPS) {
    const inGroup = list.filter((r) => r.group === grp).sort((a, b) => b.score - a.score || Number(!!a.locked) - Number(!!b.locked) || fold(a.title).localeCompare(fold(b.title)));
    out.push(...(grp === 'Screens' && list.every((r) => r.group === 'Screens') ? inGroup : inGroup.slice(0, PER_GROUP)));
  }
  return out;
}

function tierGallons(tierId: string): number {
  return TANK_TIERS.find((t) => t.id === tierId)?.gallons ?? 0;
}
function safeName(fn: () => string, fallback: string): string {
  try {
    return fn() || fallback;
  } catch {
    return fallback;
  }
}
function safeBool(fn: () => boolean): boolean {
  try {
    return fn();
  } catch {
    return true;
  }
}
