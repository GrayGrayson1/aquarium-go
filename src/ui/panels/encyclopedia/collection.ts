/**
 * The Collection (chunk 21, feature A): the whole collection and its holes, in one place. OWNER: lane "encyclopedia".
 * Pure: it reads a GameState and the species data, never a store, the clock or the RNG, so it is unit-tested directly
 * (tests/sim/ui-collection.test.ts). The view is ./CollectionView.tsx; the address is `#/encyclopedia/collection[/{id}]`.
 *
 * What counts (one rule for the header, the cards, the Encyclopedia's subtitle and the species page's link):
 *  - A species is FOUND when it is in progress.discoveredSpecies or an animal of it that isn't dead is in the save:
 *    the Encyclopedia's own rule (its species grid).
 *  - Its MORPHS are the entries of its morph catalog (every colour and combination its genetics can produce,
 *    src/sim/life/morphCatalog.ts, the species page's "Morph catalog"). One is SEEN when `${speciesId}:${morphName}`
 *    is in progress.discoveredMorphs. A species with no named colour morphs (hasNoNamedMorphs: its morph list is a
 *    note such as "(no morphs; individual variation)"), or whose catalog holds a single entry, has nothing to collect
 *    beyond itself, as its species page shows no catalog: it adds nothing to the morph totals.
 *  - The PERCENTAGE gives every species the same weight, so a species with 686 morphs weighs no more than one with 2
 *    and species without named morphs can't distort it. Per species: not found 0; found without named morphs 1; with
 *    named morphs 0.5 for finding it plus 0.5 × (morphs seen / its catalog's morphs). The percentage is the mean over
 *    every species × 100, rounded DOWN to a tenth: it reads 100 only when everything is complete, and never 0 once
 *    anything is found (one species is at least 0.5 / 97). Named strains and Prismatic finds are counted beside it,
 *    not in it: a strain is a combination of traits the morphs already count, and a Prismatic animal is an
 *    individual, not a set to complete.
 *  - A card is COMPLETE when its species is found and every catalog morph is seen (or it has none to see), NOT STARTED
 *    when it isn't found and none of its morphs is seen, and IN PROGRESS otherwise.
 *  - Default order ("nearest completion first"): in progress first, by the share of morphs seen (highest first), then
 *    by fewest morphs left, then by name; then complete, by name; then not started, by name.
 *
 * A missing morph shows only what the morph catalog already allows (catalogHint: trait names seen in some morph, ???
 * for the rest) and its tier, plus one "how to find it" line (howToFind, rules there). Nothing here names a hidden
 * allele, a hidden strain or an undiscovered species.
 */
import type { Creature, Environment, GameState, PhenotypeRule, Rarity, SpeciesDefinition } from '@/types';
import { ALL_SPECIES, findSpecies } from '@/data/species';
import { morphCatalog, seenTraitIds, predictOffspringMorphs, type CatalogEntry } from '@/sim/life';
import { breedingSystemInfo } from '@/sim/life/breeding';
import { catalogHint, hasNoNamedMorphs } from './morphs';

export type CollectionStatus = 'complete' | 'in_progress' | 'not_started';
export type StatusFilter = 'all' | CollectionStatus;
export type EnvFilter = 'all' | Environment;

/** One species' place in the collection. */
export interface SpeciesProgress {
  speciesId: string;
  environment: Environment;
  found: boolean;
  /** Nothing to collect beyond the species itself (no named colour morphs, or a single catalog entry). */
  noMorphs: boolean;
  /** Catalog morphs seen (0 when `noMorphs`). */
  morphsSeen: number;
  /** Catalog morphs (0 when `noMorphs`). */
  morphsTotal: number;
  strainsFound: number;
  strainsTotal: number;
  prismatic: number;
  /** 0..1, this species' share of the percentage (see the header). */
  score: number;
  status: CollectionStatus;
}

export interface CollectionSummary {
  /** 0..100, rounded down to a tenth (see the header). */
  percent: number;
  speciesFound: number;
  speciesTotal: number;
  morphsSeen: number;
  morphsTotal: number;
  strainsFound: number;
  strainsTotal: number;
  /** Prismatic animals ever owned. */
  prismatic: number;
}

// ───────────────────────────── what the save knows ─────────────────────────────

/** Species the player has found: discoveredSpecies, plus any species with an animal in the save that isn't dead. */
export function foundSpecies(g: GameState): Set<string> {
  const s = new Set(g.progress.discoveredSpecies);
  for (const c of Object.values(g.creatures)) if (c.status !== 'dead') s.add(c.speciesId);
  return s;
}

interface Known {
  found: Set<string>;
  /** speciesId → morph names seen (discoveredMorphs, prefix removed). */
  seen: Map<string, Set<string>>;
  strains: Set<string>;
  prismatic: Map<string, number>;
}

function known(g: GameState): Known {
  const seen = new Map<string, Set<string>>();
  for (const key of g.progress.discoveredMorphs) {
    const i = key.indexOf(':');
    if (i <= 0) continue;
    const id = key.slice(0, i);
    const name = key.slice(i + 1).trim();
    if (!name) continue;
    let set = seen.get(id);
    if (!set) seen.set(id, (set = new Set()));
    set.add(name);
  }
  const prismatic = new Map<string, number>();
  for (const f of g.progress.prismaticFinds ?? []) prismatic.set(f.speciesId, (prismatic.get(f.speciesId) ?? 0) + 1);
  return { found: foundSpecies(g), seen, strains: new Set(g.progress.discoveredStrains ?? []), prismatic };
}

/** Does this species have morphs to collect? (Building its catalog only when its morph list names some.) */
function hasMorphs(sp: SpeciesDefinition): boolean {
  return !hasNoNamedMorphs(sp) && morphCatalog(sp).entries.length > 1;
}

function progressOf(sp: SpeciesDefinition, k: Known): SpeciesProgress {
  const found = k.found.has(sp.id);
  const noMorphs = !hasMorphs(sp);
  let morphsSeen = 0;
  let morphsTotal = 0;
  if (!noMorphs) {
    const cat = morphCatalog(sp);
    morphsTotal = cat.entries.length;
    for (const name of k.seen.get(sp.id) ?? []) if (cat.byName.has(name)) morphsSeen++;
  }
  const strains = sp.genetics.strains ?? [];
  const strainsFound = strains.filter((s) => k.strains.has(`${sp.id}:${s.id}`)).length;
  const share = morphsTotal > 0 ? morphsSeen / morphsTotal : 0;
  const score = noMorphs ? (found ? 1 : 0) : (found ? 0.5 : 0) + 0.5 * share;
  const complete = found && (noMorphs || morphsSeen >= morphsTotal);
  const status: CollectionStatus = complete ? 'complete' : !found && morphsSeen === 0 ? 'not_started' : 'in_progress';
  return { speciesId: sp.id, environment: sp.environment, found, noMorphs, morphsSeen, morphsTotal, strainsFound, strainsTotal: strains.length, prismatic: k.prismatic.get(sp.id) ?? 0, score, status };
}

/** One species' progress (its card). */
export function speciesProgress(g: GameState, sp: SpeciesDefinition): SpeciesProgress {
  return progressOf(sp, known(g));
}

/** The percentage for a sum of species scores (see the header): rounded down to a tenth. */
function percentOf(scoreSum: number, species: number): number {
  if (species <= 0) return 0;
  return Math.min(100, Math.floor((1000 * scoreSum) / species + 1e-9) / 10);
}

/**
 * The whole collection: the overall percentage and the counts in the header. Builds every species' morph catalog the
 * first time (they are cached; about 150 ms on a desktop for all of them, so the Encyclopedia's subtitle uses
 * collectionPercent instead).
 */
export function collectionSummary(g: GameState): CollectionSummary {
  const k = known(g);
  const out: CollectionSummary = { percent: 0, speciesFound: 0, speciesTotal: ALL_SPECIES.length, morphsSeen: 0, morphsTotal: 0, strainsFound: 0, strainsTotal: 0, prismatic: g.progress.prismaticFinds?.length ?? 0 };
  let sum = 0;
  for (const sp of ALL_SPECIES) {
    const p = progressOf(sp, k);
    if (p.found) out.speciesFound++;
    out.morphsSeen += p.morphsSeen;
    out.morphsTotal += p.morphsTotal;
    out.strainsFound += p.strainsFound;
    out.strainsTotal += p.strainsTotal;
    sum += p.score;
  }
  out.percent = percentOf(sum, ALL_SPECIES.length);
  return out;
}

/**
 * The same percentage as collectionSummary, touching only the species the player has found or seen a morph of (an
 * unfound species with nothing seen scores 0), so only their catalogs are built.
 */
export function collectionPercent(g: GameState): number {
  const k = known(g);
  let sum = 0;
  for (const sp of ALL_SPECIES) if (k.found.has(sp.id) || k.seen.has(sp.id)) sum += progressOf(sp, k).score;
  return percentOf(sum, ALL_SPECIES.length);
}

/** "12%", or "0.5%" below 10 (the percentage keeps a tenth so the first finds show). */
export function formatPercent(p: number): string {
  const v = Math.max(0, Math.min(100, Number.isFinite(p) ? p : 0));
  const tenth = Math.floor(v * 10) / 10;
  return tenth === 0 || v >= 10 ? `${Math.floor(v)}%` : `${tenth.toFixed(1)}%`;
}

// ───────────────────────────── the cards ─────────────────────────────

const STATUS_ORDER: Record<CollectionStatus, number> = { in_progress: 0, complete: 1, not_started: 2 };

/** The default order: nearest completion first (see the header). */
export function compareCards(a: SpeciesProgress, b: SpeciesProgress): number {
  const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (s) return s;
  if (a.status === 'in_progress') {
    const sa = a.morphsTotal ? a.morphsSeen / a.morphsTotal : 0;
    const sb = b.morphsTotal ? b.morphsSeen / b.morphsTotal : 0;
    if (sa !== sb) return sb - sa;
    const la = a.morphsTotal - a.morphsSeen;
    const lb = b.morphsTotal - b.morphsSeen;
    if (la !== lb) return la - lb;
  }
  return nameOf(a.speciesId).localeCompare(nameOf(b.speciesId), 'en') || (a.speciesId < b.speciesId ? -1 : a.speciesId > b.speciesId ? 1 : 0);
}

const nameOf = (id: string) => findSpecies(id)?.commonName ?? id;

/** Every species' card, filtered, nearest completion first. */
export function collectionCards(g: GameState, filter: { status?: StatusFilter; env?: EnvFilter } = {}): SpeciesProgress[] {
  const k = known(g);
  const status = filter.status ?? 'all';
  const env = filter.env ?? 'all';
  return ALL_SPECIES.filter((sp) => env === 'all' || sp.environment === env)
    .map((sp) => progressOf(sp, k))
    .filter((p) => status === 'all' || p.status === status)
    .sort(compareCards);
}

// ───────────────────────────── a card's morphs ─────────────────────────────

/** Can this species' young show a new morph? (Pair breeders: an anemone that splits makes clones of itself.) */
export function canBreedMorphs(sp: SpeciesDefinition): boolean {
  const info = breedingSystemInfo(sp.id);
  return !!info?.breedable && sp.breeding.system !== 'fission';
}

/** Where sellers stand on a morph, by its tier (the share of the animals sellers stock, src/data/rarity.ts). */
export const SELLER_LINE: Readonly<Record<Rarity, string>> = Object.freeze({
  common: 'Sellers stock it often.',
  uncommon: 'Sellers stock it now and then.',
  rare: 'Sellers stock it rarely.',
  very_rare: 'Sellers stock it very rarely.',
  legendary: 'Sellers almost never stock it.',
});

/** "A", "A and B", "A, B and C". */
function listWords(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** A trait that only shows when both parents pass something on: a condition on two copies, or on none of an allele. */
function needsBothParents(rule: PhenotypeRule): boolean {
  return rule.when.some((c) => c.count === 'hom' || c.count === 'none');
}

/**
 * One honest line on how to find a missing morph, from its tier, its traits and whether the species breeds here:
 *  1. Common or uncommon, or a species whose young can't show new morphs: where sellers stand (SELLER_LINE).
 *  2. Otherwise, from its traits (a catch-all base such as "Wild Type" is no trait), naming only traits already seen:
 *     - a seen trait that needs both parents (two copies, or none of an allele): "Shows when both parents carry
 *       {them}.", plus "It also needs a trait you haven’t seen yet." when any of its traits is unseen;
 *     - traits that need both parents, none of them seen: "Shows when both parents carry a trait you haven’t seen yet.";
 *     - only traits one parent can pass on, all seen: "Breed it from parents showing {them}.";
 *     - only such traits, one unseen: the sellers' line (nothing to breed from yet).
 * It never names a trait the player hasn't seen, an allele, or a strain's recipe.
 */
export function howToFind(sp: SpeciesDefinition, e: Pick<CatalogEntry, 'traitIds' | 'tier'>, seenTraits: ReadonlySet<string>): string {
  const seller = SELLER_LINE[e.tier] ?? SELLER_LINE.rare;
  if (e.tier === 'common' || e.tier === 'uncommon' || !canBreedMorphs(sp)) return seller;
  const rules = e.traitIds.map((id) => sp.genetics.phenotypes.find((r) => r.id === id)).filter((r): r is PhenotypeRule => !!r && r.when.length > 0);
  const both = rules.filter(needsBothParents);
  if (both.length) {
    const seen = both.filter((r) => seenTraits.has(r.id)).map((r) => r.name);
    if (!seen.length) return 'Shows when both parents carry a trait you haven’t seen yet.';
    const unseen = rules.some((r) => !seenTraits.has(r.id));
    return `Shows when both parents carry ${listWords(seen)}.${unseen ? ' It also needs a trait you haven’t seen yet.' : ''}`;
  }
  if (rules.length && rules.every((r) => seenTraits.has(r.id))) return `Breed it from parents showing ${listWords(rules.map((r) => r.name))}.`;
  return seller;
}

export interface MissingMorph {
  morphName: string;
  /** What the player may see of it (catalogHint). */
  hint: string;
  tier: Rarity;
  how: string;
}

export interface SpeciesMorphs {
  /** Seen catalog morphs, in catalog order (by base colour, most common first). */
  seen: CatalogEntry[];
  /** Missing catalog morphs, easiest first: most often stocked, then by name. */
  missing: MissingMorph[];
}

/** A found species' seen and missing morphs (empty for a species with nothing to collect). */
export function speciesMorphs(g: GameState, sp: SpeciesDefinition): SpeciesMorphs {
  if (!hasMorphs(sp)) return { seen: [], missing: [] };
  const cat = morphCatalog(sp);
  const names = known(g).seen.get(sp.id) ?? new Set<string>();
  const seenTraits = seenTraitIds(sp, names);
  const seen = cat.entries.filter((e) => names.has(e.morphName));
  const missing = cat.entries
    .filter((e) => !names.has(e.morphName))
    .sort((a, b) => b.frequency - a.frequency || a.morphName.localeCompare(b.morphName, 'en'))
    .map((e) => ({ morphName: e.morphName, hint: catalogHint(sp, e, seenTraits), tier: e.tier, how: howToFind(sp, e, seenTraits) }));
  return { seen, missing };
}

/** The swatch of a catalog morph: its base colour's body colour, else the species' own. */
export function morphSwatch(sp: SpeciesDefinition, e: Pick<CatalogEntry, 'phenotypes'>): string {
  const baseId = e.phenotypes[0]?.baseId;
  return (baseId ? sp.genetics.phenotypes.find((r) => r.id === baseId)?.visual.bodyColor : undefined) ?? sp.genetics.baseVisual.bodyColor ?? '#7a8b90';
}

// ───────────────────────────── recently found ─────────────────────────────

/** Finds made at one game hour for one species (a first purchase is a new species and its first morph together). */
export interface RecentFind {
  speciesId: string;
  hour: number;
  /** In-game day (day 1 is hours 0–23). */
  day: number;
  newSpecies: boolean;
  morphs: string[];
  /** Strain names. */
  strains: string[];
  /** Prismatic animals' names. */
  prismatic: string[];
}

/**
 * The latest dated finds, newest first: progress.discoveredAt (species, morphs, named strains; older saves have none)
 * and the Prismatic finds' own hours, grouped by species and game hour. Ties keep the order they were found in.
 */
export function recentFinds(g: GameState, limit = 5): RecentFind[] {
  const p = g.progress;
  const strains = new Set(p.discoveredStrains ?? []);
  const groups = new Map<string, RecentFind & { order: number }>();
  let order = 0;
  const groupOf = (speciesId: string, hour: number) => {
    const h = Math.floor(hour);
    const key = `${speciesId}|${h}`;
    let grp = groups.get(key);
    if (!grp) groups.set(key, (grp = { speciesId, hour: h, day: Math.floor(h / 24) + 1, newSpecies: false, morphs: [], strains: [], prismatic: [], order: 0 }));
    grp.order = ++order;
    return grp;
  };
  for (const [key, hour] of Object.entries(p.discoveredAt ?? {})) {
    if (typeof hour !== 'number' || !Number.isFinite(hour)) continue;
    const i = key.indexOf(':');
    if (i < 0) {
      if (findSpecies(key)) groupOf(key, hour).newSpecies = true;
      continue;
    }
    const sp = findSpecies(key.slice(0, i));
    if (!sp) continue;
    const rest = key.slice(i + 1);
    const strain = strains.has(key) ? sp.genetics.strains?.find((s) => s.id === rest) : undefined;
    if (strain) groupOf(sp.id, hour).strains.push(strain.name);
    else groupOf(sp.id, hour).morphs.push(rest);
  }
  for (const f of p.prismaticFinds ?? []) if (Number.isFinite(f.hour) && findSpecies(f.speciesId)) groupOf(f.speciesId, f.hour).prismatic.push(f.name);
  return [...groups.values()]
    .sort((a, b) => b.hour - a.hour || b.order - a.order)
    .slice(0, Math.max(0, limit))
    .map(({ order: _order, ...rest }) => rest);
}

// ───────────────────────────── nearly there ─────────────────────────────

export type NearlyThere =
  /** A pair the player keeps whose young could show a morph they're missing (the pair's own "Expected young"). */
  | { kind: 'pair'; speciesId: string; names: [string, string]; hint: string; chance: number }
  /** An in-progress species, nearest completion. */
  | { kind: 'species'; speciesId: string; seen: number; total: number }
  /** An undiscovered species in the shop right now. */
  | { kind: 'shop'; speciesId: string; offerId: string };

/** Young from a pair: at least this share must be a missing morph for the pair to be suggested. */
export const PAIR_MIN_CHANCE = 0.05;

/** speciesId|motherId|fatherId → the pair's expected young (genomes never change, so this never goes stale). */
const PAIR_ODDS = new Map<string, { morphName: string; chance: number }[]>();
const PAIR_ODDS_MAX = 200;

const kept = (c: Creature | undefined): c is Creature => !!c && (c.status === 'alive' || c.status === 'listed');

/**
 * The best missing morph any of the player's bonded pairs could produce, or null. Only pairs the game already shows
 * "Expected young" for (Livestock: an animal and its partner, both kept), with predictOffspringMorphs, the helper that
 * card uses: it names no more than that card does, and the suggestion shows only the catalog hint. Cached per pair.
 */
export function bestPairFind(g: GameState): Extract<NearlyThere, { kind: 'pair' }> | null {
  const k = known(g);
  let best: { item: Extract<NearlyThere, { kind: 'pair' }>; key: string } | null = null;
  const done = new Set<string>();
  for (const a of Object.values(g.creatures)) {
    if (!kept(a) || !a.repro?.partnerId) continue;
    const b = g.creatures[a.repro.partnerId];
    if (!kept(b) || b.speciesId !== a.speciesId || b === a) continue;
    const mom = a.sex === 'female' ? a : b.sex === 'female' ? b : a;
    const dad = mom === a ? b : a;
    const key = `${a.speciesId}|${mom.id}|${dad.id}`;
    if (done.has(key)) continue;
    done.add(key);
    const sp = findSpecies(a.speciesId);
    if (!sp || !k.found.has(sp.id) || !hasMorphs(sp) || !canBreedMorphs(sp)) continue;
    let odds = PAIR_ODDS.get(key);
    if (!odds) {
      try {
        odds = predictOffspringMorphs(sp, mom.genome, dad.genome);
      } catch {
        odds = [];
      }
      if (PAIR_ODDS.size >= PAIR_ODDS_MAX) PAIR_ODDS.clear();
      PAIR_ODDS.set(key, odds);
    }
    const cat = morphCatalog(sp);
    const names = k.seen.get(sp.id) ?? new Set<string>();
    for (const o of odds) {
      const e = cat.byName.get(o.morphName);
      if (!e || names.has(o.morphName) || o.chance < PAIR_MIN_CHANCE) continue;
      if (best && (o.chance < best.item.chance || (o.chance === best.item.chance && key >= best.key))) continue;
      best = { key, item: { kind: 'pair', speciesId: sp.id, names: [mom.name, dad.name], hint: catalogHint(sp, e, seenTraitIds(sp, names)), chance: o.chance } };
    }
  }
  return best?.item ?? null;
}

/**
 * Up to `limit` suggestions: the best pair find (if any), then the in-progress species nearest completion (another
 * species than the pair's), then, with room left, an undiscovered species in the shop right now.
 */
export function nearlyThere(g: GameState, limit = 3): NearlyThere[] {
  const out: NearlyThere[] = [];
  const pair = bestPairFind(g);
  if (pair) out.push(pair);
  for (const c of collectionCards(g, { status: 'in_progress' })) {
    if (out.length >= limit) break;
    if (!c.found || c.noMorphs || c.speciesId === pair?.speciesId) continue;
    out.push({ kind: 'species', speciesId: c.speciesId, seen: c.morphsSeen, total: c.morphsTotal });
  }
  if (out.length < limit) {
    const found = foundSpecies(g);
    const offer = g.market.stock.find((o) => !found.has(o.speciesId) && o.expiresHour > g.clock.hour && o.creatures.length > 0 && !!findSpecies(o.speciesId));
    if (offer) out.push({ kind: 'shop', speciesId: offer.speciesId, offerId: offer.id });
  }
  return out.slice(0, limit);
}
