/**
 * Livestock shop: species availability, daily demand random walk + trend events, pre-rolled stock and
 * mid-day specials. OWNER: lane "market".
 */
import type { GameState, ShopOffer, Creature, SpeciesDefinition, Sex, MarketTrend } from '@/types';
import type { Rng } from '../rng';
import { nextId } from '../ids';
import { emitEvent } from '../context';
import { findSpecies, listSpecies } from '@/data/species';
import { ROSTER } from '@/data/species/roster';
import { SELLERS, type SellerDef } from '@/data/buyers';
import { isUnlocked } from '../facility';
import { createCreature, assignPrismatic, isPrismatic, isLotOffer } from '../life';
import { generateName, takenNames } from '../life/names';
import { mulberry32, hashString } from '../rng';
import { creatureValue, morphRarity } from './valuation';
import { hourOfDay } from '../time';
import { clamp, dayIndex, finite, fmtMoney, nicePrice, pluralName, capitalise, morphTitle } from './util';

// ───────────────────────────── availability ─────────────────────────────

/** Unlock keys a species needs. Starter species with no explicit requirement fall back to their roster group key. */
export function requiredUnlocks(sp: SpeciesDefinition): string[] {
  if (sp.unlock?.requires?.length) return sp.unlock.requires;
  if (sp.isStarter) {
    const r = ROSTER.find((e) => e.id === sp.id);
    if (r) return r.unlock.split('|').filter((k) => k && k !== 'starter');
  }
  return [];
}

/** A species is buyable when every required unlock is unlocked. The player's own starter species always is. */
export function isSpeciesAvailable(state: GameState, speciesId: string): boolean {
  if (speciesId === state.starterId) return true;
  const sp = findSpecies(speciesId);
  if (!sp) return false;
  return requiredUnlocks(sp).every((k) => isUnlocked(state, k));
}

export function availableSpecies(state: GameState): SpeciesDefinition[] {
  return listSpecies((s) => isSpeciesAvailable(state, s.id));
}

// ───────────────────────────── demand ─────────────────────────────

export const DEMAND_MIN = 0.6;
export const DEMAND_MAX = 1.6;

export function initDemand(state: GameState, rng: Rng): void {
  const d = (state.market.demand ??= {});
  for (const sp of listSpecies()) {
    if (d[sp.id] === undefined) d[sp.id] = Math.round(clamp(1 + rng.gauss() * 0.08, 0.85, 1.15) * 100) / 100;
  }
}

const CRAZE_TEXTS = [
  '{Single} craze at the regional expo! Buyers are paying up.',
  'A viral video of {species} has buyers searching everywhere.',
  'The spring aquarium show featured {species} — demand is up.',
  'A popular aquascaping channel just featured {species}.',
  'Public aquariums are restocking {species} this week.',
  'A hobby magazine named {species} "fish of the month".',
];
const GLUT_TEXTS = [
  'Local breeders have flooded the market with {species}; prices are soft.',
  'A big shipment of {species} just landed at every store in town.',
  '{Species} are out of fashion this week — demand dipped.',
  'Several keepers are rehoming {species} at once, so prices are down.',
];

function trendTarget(state: GameState, speciesId: string, hour: number): number {
  let t = 1;
  for (const tr of state.market.trends ?? []) if (tr.speciesId === speciesId && tr.untilHour > hour) t += tr.delta * 0.8;
  return t;
}

/** Daily demand random walk (mean-reverting, bounded 0.6..1.6) plus occasional trend events. */
export function stepDemandDaily(state: GameState, rng: Rng, hour: number): void {
  const m = state.market;
  initDemand(state, rng);
  m.trends = (m.trends ?? []).filter((t) => t.untilHour > hour);
  for (const id of Object.keys(m.demand).sort()) {
    const d = finite(m.demand[id], 1);
    const target = trendTarget(state, id, hour);
    const next = d + (target - d) * 0.12 + rng.gauss() * 0.045;
    m.demand[id] = Math.round(clamp(next, DEMAND_MIN, DEMAND_MAX) * 1000) / 1000;
  }
  if (rng.chance(0.2)) startTrend(state, rng, hour);
}

function startTrend(state: GameState, rng: Rng, hour: number): void {
  const m = state.market;
  const owned = new Set(Object.values(state.creatures).filter((c) => c.status === 'alive' || c.status === 'listed').map((c) => c.speciesId));
  const pool = availableSpecies(state).filter((s) => !(m.trends ?? []).some((t) => t.speciesId === s.id));
  if (pool.length === 0) return;
  const sp = rng.weighted(pool, (s) => (owned.has(s.id) ? 3 : 1));
  const craze = rng.chance(0.62);
  const delta = craze ? rng.range(0.3, 0.5) : -rng.range(0.2, 0.3);
  const plural = pluralName(sp.commonName);
  const text = rng
    .pick(craze ? CRAZE_TEXTS : GLUT_TEXTS)
    .replace(/\{species\}/g, plural)
    .replace(/\{Species\}/g, capitalise(plural))
    .replace(/\{Single\}/g, sp.commonName);
  const trend: MarketTrend = { speciesId: sp.id, text, delta: Math.round(delta * 100) / 100, startHour: hour, untilHour: hour + rng.range(72, 144) };
  (m.trends ??= []).push(trend);
  m.demand[sp.id] = Math.round(clamp(finite(m.demand[sp.id], 1) + delta, DEMAND_MIN, DEMAND_MAX) * 1000) / 1000;
  emitEvent(state, { kind: 'market', text, toast: owned.has(sp.id) });
}

// ───────────────────────────── offers ─────────────────────────────

type OfferTier = 'standard' | 'breeder' | 'rare' | 'special';

const RARITY_WEIGHT: Record<string, number> = { common: 1, uncommon: 0.7, rare: 0.35, very_rare: 0.15, legendary: 0.05 };
const FACILITY_OFFERS: Record<string, number> = { hobby_room: 7, specialty_shop: 9, aquarium_store: 11, showroom: 12, destination: 14, grand_hall: 16 };

function sellerFor(rng: Rng, speciesId: string): SellerDef {
  const specialists = SELLERS.filter((s) => s.specialties.includes(speciesId));
  if (specialists.length && rng.chance(0.8)) return rng.pick(specialists);
  const general = SELLERS.filter((s) => s.specialties.length === 0);
  return general.length ? rng.pick(general) : rng.pick(SELLERS);
}

interface Composition {
  count: number;
  sexes: (Sex | undefined)[];
  label: (plural: string, singular: string) => string;
  note?: string;
}

function composition(sp: SpeciesDefinition, rng: Rng): Composition {
  const s = sp.social;
  const kind = s?.kind ?? 'solitary';
  const minG = Math.max(1, s?.minGroup ?? 1);
  const idealG = Math.max(minG, s?.idealGroup ?? minG);
  if (kind === 'school' || kind === 'shoal' || kind === 'colony' || (kind === 'group' && minG >= 3)) {
    const n = clamp(Math.round(idealG * rng.range(0.7, 1.1)), Math.max(3, minG), 10);
    const colony = kind === 'colony';
    return {
      count: n,
      sexes: new Array(n).fill(undefined),
      label: (pl) => `${colony ? 'Colony' : 'Group'} of ${n} ${pl}`,
      note: colony ? 'Colonies settle and breed more readily together.' : 'Schooling fish feel safest in numbers.',
    };
  }
  const gonochoristic = sp.sexSystem === 'gonochoristic';
  if ((kind === 'pair' || kind === 'pair_hierarchy') && rng.chance(0.45)) {
    const note =
      sp.sexSystem === 'gonochoristic'
        ? 'A ready-made pair for breeding.'
        : sp.sexSystem === 'protandrous'
          ? 'Raised together — the larger one will become the female.'
          : sp.sexSystem === 'protogynous'
            ? 'Raised together — the larger one will become the male.'
            : sp.sexSystem === 'simultaneous_hermaphrodite'
              ? 'Any two adults can pair up — both can carry eggs.'
              : 'Kept together as a settled pair.';
    return {
      count: 2,
      sexes: gonochoristic ? ['male', 'female'] : [undefined, undefined],
      label: (pl) => `${gonochoristic ? 'Male & female' : sp.sexSystem === 'protandrous' || sp.sexSystem === 'protogynous' ? 'Juvenile pair of' : 'Pair of'} ${pl}`,
      note,
    };
  }
  if (kind === 'harem' && gonochoristic && rng.chance(0.3)) {
    return { count: 3, sexes: ['male', 'female', 'female'], label: (pl) => `Trio of ${pl} (1 male, 2 females)`, note: 'One male to several females spreads out his attention.' };
  }
  return { count: 1, sexes: [undefined], label: (_pl, sg) => sg };
}

function morphLabel(c: Creature, sp: SpeciesDefinition): string {
  return morphTitle(c.morphName, sp.commonName);
}

export interface OfferOptions {
  tier?: OfferTier;
  expiresHour: number;
  /** Force sexes (e.g. a mate for the starter). */
  sexes?: (Sex | undefined)[];
  note?: string;
  label?: string;
}

/**
 * Animals rolled together must not share a name (two guppies both called "Ruby"), nor take the name of an animal the
 * player already keeps. Renames use a generator seeded from the creature id, so the sim RNG stream is untouched.
 */
export function uniqueOfferNames(state: GameState, sp: SpeciesDefinition, creatures: Creature[]): void {
  if (creatures.length === 0) return;
  let taken: Set<string> | null = null;
  const used = new Set<string>();
  for (const c of creatures) {
    if (used.has(c.name)) {
      taken ??= takenNames(state);
      const avoid = new Set<string>([...taken, ...used]);
      c.name = generateName(sp, mulberry32(hashString(`name:${c.id}`)), avoid, c.sex); // lane:w2-sim: sex-matched
    }
    used.add(c.name);
  }
}

/** Pre-roll a shop offer for a species (creatures are NOT inserted into state.creatures). */
export function generateOffer(state: GameState, rng: Rng, speciesId: string, opts: OfferOptions): ShopOffer | null {
  const sp = findSpecies(speciesId);
  if (!sp) return null;
  const tier: OfferTier = opts.tier ?? rng.weighted<OfferTier>(['standard', 'breeder', 'rare'], (t) => (t === 'standard' ? 0.7 : t === 'breeder' ? 0.22 : 0.08));
  const comp = opts.sexes ? { count: opts.sexes.length, sexes: opts.sexes, label: (_pl: string, sg: string) => sg, note: undefined as string | undefined } : composition(sp, rng);
  const seller = sellerFor(rng, speciesId);
  const captiveBred = sp.captiveBredAvailable !== false;
  const lc = sp.lifecycle;
  const generation = tier === 'breeder' ? rng.int(2, 5) : tier === 'rare' || tier === 'special' ? rng.int(1, 3) : 0;
  const bias = tier === 'standard' ? rng.range(-0.3, 0.2) : tier === 'breeder' ? rng.range(0.3, 0.55) : rng.range(0.5, 0.8);
  const creatures: Creature[] = [];
  // Offers that promise a sex (mates, pairs, trios) must be old enough for it to be visible.
  const sexed = comp.sexes.some((x) => x === 'male' || x === 'female');
  const minAge = sexed ? Math.max(lc.sexVisibleAtDays + 1.5, lc.juvenileDays * 0.5) : lc.juvenileDays * 0.5;
  const baseAge = Math.max(minAge, Math.max(1, lc.juvenileDays) * rng.range(0.6, 1.35));
  for (let i = 0; i < comp.count; i++) {
    const sex = comp.sexes[i];
    const roll = (): Creature =>
      createCreature(state, rng, speciesId, {
        ...(sex ? { sex } : {}),
        ageDays: Math.max(minAge, baseAge * rng.range(0.9, 1.1)),
        captiveBred,
        potentialsBias: bias,
        generation,
        breederName: seller.name,
      });
    let c = roll();
    // Rare/special singles: the seller picks the most striking of several candidates.
    if ((tier === 'rare' || tier === 'special') && comp.count <= 2) {
      let best = morphRarity(sp, c);
      for (let k = 0; k < 5; k++) {
        const alt = roll();
        const r = morphRarity(sp, alt);
        if (r > best) {
          best = r;
          c = alt;
        }
      }
    }
    if (generation > 0) c.lineage.lineId = `${seller.name}:${speciesId}:${(c.morphName || 'line').toLowerCase().replace(/\s+/g, '_')}`;
    creatures.push(c);
  }
  uniqueOfferNames(state, sp, creatures);
  // lane:genetics — one Prismatic roll per stocked animal, after the seller's pick (never per candidate), from each
  // animal's own generator (the sim stream is untouched). The result is stored with the offer, so reopening or
  // reloading the shop can never reroll it.
  for (const c of creatures) assignPrismatic(state, c, 'shop');
  const lead = creatures[0];
  const sum = creatures.reduce((a, c) => a + creatureValue(state, c).total, 0);
  // Rare/special singles were hand-picked (best of several) and carry a collector markup; groups get breeder pricing.
  const picked = (tier === 'rare' || tier === 'special') && comp.count <= 2;
  const markup = tier === 'standard' ? rng.range(1.25, 1.45) : picked ? rng.range(1.5, 1.9) : rng.range(1.35, 1.6);
  const groupDiscount = creatures.length >= 3 ? 0.88 : 1;
  const price = Math.max(1, nicePrice(sum * markup * groupDiscount));
  const plural = pluralName(sp.commonName);
  const singular = morphLabel(lead, sp);
  let label = opts.label ?? comp.label(plural, singular);
  let note = opts.note ?? comp.note;
  if (tier === 'breeder') {
    const morph = lead.morphName && !/^wild type$/i.test(lead.morphName) ? `${lead.morphName.toLowerCase()} ` : '';
    note = `${seller.name} — F${generation} ${morph}${seller.lineFlavour}${note ? `. ${note}` : ''}`;
  } else if (tier === 'rare' || tier === 'special') {
    const r = morphRarity(sp, lead);
    note = `${tier === 'special' ? 'Today only' : 'Rare find'}: ${r > 0.05 ? lead.morphName : `top-quality ${sp.commonName.toLowerCase()}`}${note ? `. ${note}` : ''}`;
    if (comp.count === 1 && !opts.label) label = singular;
  }
  // lane:genetics — a Prismatic is the headline; a group carrying one is sold as one lot (see isLotOffer).
  const shimmer = creatures.filter((c) => isPrismatic(c)).length;
  if (shimmer) {
    if (creatures.length === 1 && !opts.label) label = `Prismatic ${label}`;
    const lot = creatures.length > 1 ? ` Includes ${shimmer === 1 ? 'a Prismatic' : `${shimmer} Prismatics`} — sold as one lot.` : '';
    note = `Prismatic! An ultra-rare shimmer — one in thousands.${lot}${note ? ` ${note}` : ''}`;
  }
  return {
    id: nextId(state, 'offer'),
    kind: creatures.length > 1 ? 'group' : 'creature',
    speciesId,
    creatures,
    price,
    seller: seller.name,
    expiresHour: opts.expiresHour,
    note,
    tier,
    label,
    unitPrice: creatures.length > 1 ? Math.max(1, nicePrice((price / creatures.length) * 1.12)) : price,
  };
}

function nextRefreshHour(hour: number): number {
  const d = dayIndex(hour - 8);
  return (d + 1) * 24 + 8;
}

function starterMateOffer(state: GameState, rng: Rng, expiresHour: number): ShopOffer | null {
  const starter = Object.values(state.creatures).find((c) => c.isStarter && (c.status === 'alive' || c.status === 'listed'));
  const sp = findSpecies(state.starterId);
  if (!sp) return null;
  if (!starter) return generateOffer(state, rng, state.starterId, { expiresHour });
  let sexes: (Sex | undefined)[] | undefined;
  if (sp.sexSystem === 'gonochoristic' && (starter.sex === 'male' || starter.sex === 'female')) sexes = [starter.sex === 'male' ? 'female' : 'male'];
  const offer = generateOffer(state, rng, state.starterId, { expiresHour, sexes, tier: rng.chance(0.3) ? 'breeder' : 'standard' });
  if (offer && sexes) offer.note = `A potential mate for ${starter.name}.${offer.note ? ` ${offer.note}` : ''}`;
  return offer;
}

/** Remove expired offers and top the stock back up. `initial` = new game. */
export function refreshStock(state: GameState, rng: Rng, hour: number, initial = false): number {
  const m = state.market;
  m.stock = (m.stock ?? []).filter((o) => o.expiresHour > hour && o.creatures.length > 0);
  const target = FACILITY_OFFERS[state.facility.level] ?? 7;
  const avail = availableSpecies(state);
  const nextRefresh = nextRefreshHour(hour);
  let added = 0;
  if (!m.stock.some((o) => o.speciesId === state.starterId)) {
    const o = starterMateOffer(state, rng, nextRefresh + 24 * rng.int(0, 1));
    if (o) {
      m.stock.push(o);
      added++;
      if (!initial) announcePrismatic(state, o);
    }
  }
  let guard = 0;
  while (m.stock.length < target && avail.length > 0 && guard++ < 40) {
    const counts = new Map<string, number>();
    for (const o of m.stock) counts.set(o.speciesId, (counts.get(o.speciesId) ?? 0) + 1);
    const pool = avail.filter((s) => (counts.get(s.id) ?? 0) < (avail.length <= 3 ? 3 : 2));
    if (pool.length === 0) break;
    const sp = rng.weighted(pool, (s) => (RARITY_WEIGHT[s.rarity] ?? 0.5) * (state.progress.discoveredSpecies.includes(s.id) ? 1 : 1.25) * (s.id === state.starterId ? 1.2 : 1));
    const o = generateOffer(state, rng, sp.id, { expiresHour: nextRefresh + 24 * (rng.chance(0.4) ? 1 : 0) });
    if (o) {
      m.stock.push(o);
      added++;
      if (!initial) announcePrismatic(state, o);
    }
  }
  if (!initial) m.lastRefreshHour = hour;
  return added;
}

/** lane:genetics — a Prismatic in the morning's restock is always news (the very first stock stays quiet). */
function announcePrismatic(state: GameState, o: ShopOffer): void {
  const c = o.creatures.find((x) => isPrismatic(x));
  const sp = findSpecies(o.speciesId);
  if (!c || !sp) return;
  emitEvent(state, { kind: 'market', text: `Something special at the shop: a Prismatic ${morphLabel(c, sp)} from ${o.seller} — ${fmtMoney(o.price)}${isLotOffer(o) ? ' (sold with its group)' : ''}.`, toast: true });
}

/** When new unlocks land, stock the newly available species right away. */
export function stockNewUnlocks(state: GameState, rng: Rng, hour: number, announce: boolean): void {
  const m = state.market;
  const n = state.progress.unlocked.length;
  if (m.seenUnlocks === n) return;
  // Only species that the NEW unlock keys made available count as "new arrivals" (unlocking party mode or a tank
  // size must not announce random restocks). `unlocked` is append-only, so the new keys are the tail.
  const newKeys = new Set(m.seenUnlocks !== undefined && m.seenUnlocks >= 0 && m.seenUnlocks < n ? state.progress.unlocked.slice(m.seenUnlocks) : state.progress.unlocked);
  m.seenUnlocks = n;
  const offered = new Set(m.stock.map((o) => o.speciesId));
  const fresh = availableSpecies(state).filter((s) => !offered.has(s.id) && requiredUnlocks(s).some((k) => newKeys.has(k)));
  if (fresh.length === 0) return;
  const picks = rng.shuffle([...fresh]).slice(0, 3);
  const names: string[] = [];
  for (const sp of picks) {
    const o = generateOffer(state, rng, sp.id, { expiresHour: nextRefreshHour(hour) + 24 });
    if (o) {
      m.stock.push(o);
      names.push(o.creatures.some((x) => isPrismatic(x)) ? `${pluralName(sp.commonName)} (one of them Prismatic!)` : pluralName(sp.commonName));
    }
  }
  if (announce && names.length) emitEvent(state, { kind: 'market', text: `New arrivals at the shop: ${names.join(', ')}.`, toast: true });
}

/** Occasional mid-day special (11 AM–5 PM, at most one per day). */
export function maybeSpecial(state: GameState, rng: Rng, start: number, dt: number): void {
  const m = state.market;
  const hod = hourOfDay(start);
  if (hod < 11 || hod >= 17) return;
  const day = dayIndex(start);
  if ((m.lastSpecialDay ?? -1) >= day) return;
  if (!rng.chance(1 - Math.exp(-0.12 * dt))) return;
  m.lastSpecialDay = day;
  const avail = availableSpecies(state);
  if (avail.length === 0) return;
  const sp = rng.weighted(avail, (s) => (RARITY_WEIGHT[s.rarity] ?? 0.5) + (s.id === state.starterId ? 0.5 : 0));
  const o = generateOffer(state, rng, sp.id, { tier: rng.chance(0.5) ? 'special' : 'breeder', expiresHour: start + rng.range(6, 10) });
  if (!o) return;
  o.tier = 'special';
  m.stock.unshift(o);
  // lane:w2-sim — a special pops up only when it's news: a species the player hasn't kept yet (or their starter's
  // kind) that could live in one of their tanks. A betta deal is noise to a reef keeper, and the tenth neon-tetra deal
  // to a tetra keeper. Every special is still in the log and the shop. Log-pace sweep: ~1 fewer toast per game day.
  const fits = state.tankOrder.some((id) => { const t = state.tanks[id]; return !!t && sp.waterClasses.includes(t.waterClass); });
  const news = sp.id === state.starterId || !state.progress.discoveredSpecies.includes(sp.id);
  // lane:genetics — a Prismatic special is always news
  const shimmer = o.creatures.some((x) => isPrismatic(x));
  emitEvent(state, { kind: 'market', text: `Market special: ${o.label} from ${o.seller} — ${fmtMoney(o.price)}, today only.`, toast: shimmer || (fits && news) });
}
