/**
 * NPC buyer pool + the buyer-fit model. OWNER: lane "market".
 *
 * A listing is summarised as a profile of 0..1 aspect scores. Each buyer weighs those aspects with their
 * archetype preferences (0..2). Fit ≈ 0.75..1.3 scales their private value of the listing; the strongest
 * positive/negative contributions become the reasons quoted in their message.
 */
import type { GameState, BuyerProfile, BuyerArchetype, ListingKind, Creature, Tank, DecorInstance } from '@/types';
import type { Rng } from '../rng';
import { nextId } from '../ids';
import { findSpecies } from '@/data/species';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { BUYER_ARCHETYPES, BUYER_ARCHETYPE_IDS, PERSON_NAMES, FAMILY_NAMES, PUBLIC_AQUARIUM_NAMES, CONSERVATION_NAMES, FRAG_TASTE } from '@/data/buyers';
import { getDecorDef } from '@/data/catalog/decor'; // lane:frags
import { propagationFor, isCoralDef } from '@/data/catalog/propagation'; // lane:frags
import { FRAG_HEALED_HOURS } from './valuation'; // lane:frags
import type { Aspect } from './messages';
import { ASPECTS } from './messages';
import { clamp, clamp01, finite, RARITY_SCORE, difficultyIndex, exhibitPopularity } from './util';
import { morphRarity } from './valuation';

export const BUYER_POOL_SIZE = 18;

/** Wealthier clientele find you as the facility grows (applies to non-casual archetypes). */
const LEVEL_BUDGET_MULT: Record<string, number> = { hobby_room: 1, specialty_shop: 1.25, aquarium_store: 1.6, showroom: 2.1, destination: 2.8, grand_hall: 3.6 };
const CASUAL: BuyerArchetype[] = ['beginner', 'family', 'bargain_hunter'];

export function budgetScale(state: GameState, archetype: BuyerArchetype): number {
  return CASUAL.includes(archetype) ? 1 : LEVEL_BUDGET_MULT[state.facility?.level ?? 'hobby_room'] ?? 1;
}

// ───────────────────────────── pool ─────────────────────────────

function takeName(rng: Rng, pool: string[], used: Set<string>): string {
  const free = pool.filter((n) => !used.has(n));
  const pick = free.length ? rng.pick(free) : `${rng.pick(pool)} ${rng.int(2, 9)}`;
  return pick;
}

/** Create one buyer persona (deterministic via rng). */
export function makeBuyer(state: GameState, rng: Rng, archetype?: BuyerArchetype): BuyerProfile {
  const arch = archetype ?? rng.weighted(BUYER_ARCHETYPE_IDS, (a) => BUYER_ARCHETYPES[a].weight);
  const def = BUYER_ARCHETYPES[arch];
  const used = new Set(state.market.buyers.map((b) => b.name));
  const usedContacts = new Set<string>();
  for (const b of state.market.buyers) {
    const mm = b.name.match(/\(([^)]+)\)$/);
    usedContacts.add(mm ? mm[1] : b.name);
  }
  const contact = () => takeName(rng, PERSON_NAMES, usedContacts);
  let name: string;
  switch (def.naming) {
    case 'family':
      name = `The ${takeName(rng, FAMILY_NAMES, new Set([...used].map((n) => n.replace(/^The | family$/g, ''))))} family`;
      break;
    case 'public_aquarium':
      name = `${takeName(rng, PUBLIC_AQUARIUM_NAMES, new Set([...used].map((n) => n.split(' (')[0])))} (${contact()})`;
      break;
    case 'conservation':
      name = `${takeName(rng, CONSERVATION_NAMES, new Set([...used].map((n) => n.split(' (')[0])))} (${contact()})`;
      break;
    default:
      name = takeName(rng, PERSON_NAMES, usedContacts);
  }
  const jitter = (v: number) => Math.round(clamp(v * rng.range(0.78, 1.22), 0, 2) * 100) / 100;
  const prefs = {
    rarity: jitter(def.prefs.rarity),
    lineage: jitter(def.prefs.lineage),
    beauty: jitter(def.prefs.beauty),
    health: jitter(def.prefs.health),
    easyCare: jitter(def.prefs.easyCare),
    size: jitter(def.prefs.size),
    visitorAppeal: jitter(def.prefs.visitorAppeal),
    price: jitter(def.prefs.price),
  };
  const [bl, bh] = def.budget;
  const budget = Math.round(Math.exp(rng.range(Math.log(bl), Math.log(bh))) * budgetScale(state, arch));
  const favs: string[] = [];
  const pool = def.favouritePool.filter((id) => findSpecies(id)) as string[];
  const nFav = pool.length ? rng.int(1, Math.min(3, pool.length)) : 0;
  const shuffled = rng.shuffle([...pool]);
  for (let i = 0; i < nFav; i++) favs.push(shuffled[i]);
  return {
    id: nextId(state, 'buyer'),
    name,
    archetype: arch,
    budget,
    prefs,
    favoriteSpecies: favs,
    patience: Math.round(rng.range(def.patience[0], def.patience[1]) * 100) / 100,
    reputationWithPlayer: 0,
    avatarSeed: Math.floor(rng.next() * 1e9),
  };
}

/** Make sure the pool has buyers and every archetype is represented at least once. */
export function ensureBuyerPool(state: GameState, rng: Rng, target = BUYER_POOL_SIZE): void {
  const m = state.market;
  if (!Array.isArray(m.buyers)) m.buyers = [];
  for (const a of BUYER_ARCHETYPE_IDS) {
    if (m.buyers.length >= target + BUYER_ARCHETYPE_IDS.length) break;
    if (!m.buyers.some((b) => b.archetype === a)) m.buyers.push(makeBuyer(state, rng, a));
  }
  while (m.buyers.length < target) m.buyers.push(makeBuyer(state, rng));
}

/** Daily churn: a few buyers move on (never ones with open bids), new faces arrive, budgets drift. */
export function rotateBuyers(state: GameState, rng: Rng): void {
  const m = state.market;
  const busy = new Set<string>();
  for (const l of m.listings) if (l.status === 'active') for (const b of l.bids) if (b.status === 'open' || b.status === 'countered') busy.add(b.buyerId);
  const leaving = rng.int(1, 3);
  for (let i = 0; i < leaving; i++) {
    const candidates = m.buyers.filter((b) => !busy.has(b.id));
    if (candidates.length <= BUYER_ARCHETYPE_IDS.length) break;
    const out = rng.pick(candidates);
    m.buyers = m.buyers.filter((b) => b.id !== out.id);
  }
  for (const b of m.buyers) {
    const def = BUYER_ARCHETYPES[b.archetype];
    if (!def) continue;
    const k = budgetScale(state, b.archetype);
    if (b.budget <= def.budget[1] * k * 1.2) b.budget = Math.round(clamp(b.budget * rng.range(0.92, 1.1), def.budget[0] * 0.8, def.budget[1] * k * 1.2));
    else b.budget = Math.round(b.budget * rng.range(0.85, 1)); // visiting delegations slowly lose interest
    // relationships soften toward neutral over time
    b.reputationWithPlayer = Math.round(b.reputationWithPlayer * 0.97 * 1000) / 1000;
  }
  ensureBuyerPool(state, rng);
}

// ───────────────────────────── listing profile ─────────────────────────────

export interface ListingProfile {
  kind: ListingKind;
  isTank: boolean;
  speciesIds: string[];
  /** 0..1 aspect scores. */
  attrs: Record<Aspect, number>;
  /** Most valuable species (for message wording). */
  leadSpeciesId?: string;
  leadCreature?: Creature;
  gallons: number;
  /** lane:frags — kind 'frag': share of corals (vs plant cuttings) in the listing, 0..1. */
  coralShare?: number;
}

const SIZE_REF_CM = 25;

/** Summarise creatures (+ optional tank) as aspect scores in 0..1. */
export function buildProfile(state: GameState, kind: ListingKind, creatures: Creature[], tank?: Tank): ListingProfile {
  const speciesIds = [...new Set(creatures.map((c) => c.speciesId))];
  const n = Math.max(1, creatures.length);
  let rarity = 0;
  let lineage = 0;
  let beautyAnimal = 0;
  let health = 0;
  let size = 0;
  let appeal = 0;
  let diff = 0;
  let lead: Creature | undefined;
  let leadScore = -1;
  for (const c of creatures) {
    const sp = findSpecies(c.speciesId);
    const mr = morphRarity(sp, c);
    const sr = RARITY_SCORE[sp?.rarity ?? 'common'] ?? 0.1;
    rarity += clamp01(0.7 * mr + 0.6 * sr);
    const gen = c.lineage?.generation ?? 0;
    lineage += clamp01(Math.min(1, gen / 4) * 0.55 + ((c.repro?.totalOffspringRaised ?? 0) > 0 ? 0.3 : 0) + (c.captiveBred ? 0.15 : 0));
    const p = c.genome?.potentials;
    beautyAnimal += p ? clamp01((0.4 * p.color + 0.3 * p.pattern + 0.3 * p.structure) / 100 + 0.25 * mr) : 0.5;
    health += clamp01(finite(c.stats?.health, 100) / 100 - (c.illness ? 0.35 : 0));
    size += clamp01(finite(c.sizeCm, 3) / SIZE_REF_CM);
    appeal += clamp01(sp?.visitorAppeal ?? 0.5);
    diff += difficultyIndex(sp);
    const score = (sp?.baseValue ?? 10) * (1 + mr);
    if (score > leadScore) {
      leadScore = score;
      lead = c;
    }
  }
  const attrs: Record<Aspect, number> = {
    rarity: creatures.length ? rarity / n : 0.1,
    lineage: creatures.length ? lineage / n : 0.2,
    beauty: creatures.length ? beautyAnimal / n : 0.5,
    health: creatures.length ? health / n : 0.9,
    easyCare: creatures.length ? 1 - diff / n / 3 : 0.7,
    size: creatures.length ? size / n : 0.3,
    visitorAppeal: creatures.length ? appeal / n : 0.3,
  };
  let gallons = 0;
  if (tank) {
    gallons = TANK_TIER_BY_ID[tank.tierId]?.gallons ?? 20;
    attrs.beauty = clamp01(finite(tank.cache?.beauty, 40) / 100);
    const welfare = clamp01(finite(tank.cache?.welfare, 100) / 100);
    const stab = clamp01(finite(tank.cache?.stability, 70) / 100);
    // Water condition (animal welfare is already in `welfare`).
    const water = tank.cache?.waterStatus ?? tank.cache?.status;
    const statusPen = water === 'danger' ? 0.3 : water === 'watch' ? 0.08 : 0;
    attrs.health = clamp01((creatures.length ? 0.45 * attrs.health + 0.35 * welfare : 0.8 * welfare) + 0.2 * stab - statusPen);
    attrs.size = clamp01(Math.log(Math.max(5, gallons) / 5) / Math.log(200));
    const pop = exhibitPopularity(state, tank.id);
    const exhibit = clamp01(finite(tank.cache?.exhibitScore, 30) / 100);
    attrs.visitorAppeal = clamp01(0.45 * attrs.visitorAppeal + 0.45 * exhibit + 0.05 + 0.8 * pop);
    let ease = attrs.easyCare;
    if (tank.waterClass === 'reef') ease -= 0.25;
    else if (tank.environment === 'marine') ease -= 0.12;
    ease += clamp01(finite(tank.water?.bioMaturity, 0)) * 0.1;
    attrs.easyCare = clamp01(ease);
  }
  return { kind, isTank: !!tank, speciesIds, attrs, leadSpeciesId: lead?.speciesId ?? speciesIds[0], leadCreature: lead, gallons };
}

// ───────────────────────────── fit ─────────────────────────────

export interface FitResult {
  fit: number;
  likes: Aspect[];
  concerns: Aspect[];
  indifferent?: Aspect;
  favourite: boolean;
}

/** How well a listing matches a buyer (multiplier on their private value) and the reasons why. */
export function buyerFit(buyer: BuyerProfile, profile: ListingProfile): FitResult {
  const prefs = buyer.prefs;
  let wsum = 0;
  let acc = 0;
  const contrib: { a: Aspect; c: number }[] = [];
  for (const a of ASPECTS) {
    const w = clamp(finite(prefs[a as keyof typeof prefs], 1), 0, 2);
    const d = profile.attrs[a] - 0.5;
    wsum += w;
    acc += w * d;
    contrib.push({ a, c: w * d });
  }
  let fit = 1 + (0.55 * acc) / Math.max(1, wsum);
  const favourite = profile.speciesIds.some((s) => buyer.favoriteSpecies.includes(s));
  if (favourite) fit += 0.1;
  fit *= 1 - 0.12 * (clamp(finite(prefs.price, 1), 0, 2) - 1);
  fit *= 1 + 0.1 * clamp(finite(buyer.reputationWithPlayer, 0), -1, 1);
  fit = clamp(fit, 0.55, 1.5);

  const sorted = [...contrib].sort((x, y) => y.c - x.c);
  const likes = sorted.filter((x) => x.c > 0.05).slice(0, 2).map((x) => x.a);
  const concerns = sorted
    .filter((x) => x.c < -0.06)
    .sort((x, y) => x.c - y.c)
    .slice(0, 1)
    .map((x) => x.a);
  // Indifferent: a strong listing aspect the buyer barely weighs ("I don't care much about rare morphs").
  let indifferent: Aspect | undefined;
  for (const a of ASPECTS) {
    const w = clamp(finite(prefs[a as keyof typeof prefs], 1), 0, 2);
    if (profile.attrs[a] >= 0.45 && w <= 0.35 && !likes.includes(a)) {
      indifferent = a;
      break;
    }
  }
  return { fit, likes, concerns, indifferent, favourite };
}

/** Relative chance this buyer looks at a listing at all. */
export function buyerInterestWeight(buyer: BuyerProfile, profile: ListingProfile, fit: number, value: number): number {
  const def = BUYER_ARCHETYPES[buyer.archetype];
  if (!def) return 0;
  let w = def.weight * (def.kindAffinity[profile.kind] ?? 0.5) * fit * fit;
  // lane:frags — reef collectors chase coral frags, aquascapers want cuttings; small frag prices are normal
  const taste = profile.kind === 'frag' ? FRAG_TASTE[buyer.archetype] : undefined;
  if (taste) w *= taste.plant + (taste.coral - taste.plant) * clamp01(finite(profile.coralShare, 0.5));
  if (value < (profile.kind === 'frag' ? def.minInterestValue * 0.2 : def.minInterestValue)) w *= 0.15;
  if (buyer.budget < value * 0.45) w *= buyer.archetype === 'bargain_hunter' ? 0.8 : 0.12;
  return Math.max(0, w);
}

/**
 * A listing worth more than anyone in the pool can pay occasionally draws a special visitor:
 * a public-aquarium delegation or a serious collector with the budget to match.
 */
export function maybeDelegation(state: GameState, rng: Rng, value: number, kind: ListingKind): BuyerProfile | null {
  // Delegations (public aquariums / serious collectors) only chase genuinely valuable listings.
  if (value < 400) return null;
  const maxBudget = state.market.buyers.reduce((a, b) => Math.max(a, b.budget), 0);
  if (value <= maxBudget * 0.8) return null;
  const visiting = state.market.buyers.filter((b) => b.budget > (BUYER_ARCHETYPES[b.archetype]?.budget[1] ?? 0) * budgetScale(state, b.archetype) * 1.2).length;
  if (visiting >= 3 || !rng.chance(kind === 'tank' ? 0.35 : 0.2)) return null;
  const b = makeBuyer(state, rng, rng.chance(kind === 'tank' ? 0.65 : 0.35) ? 'public_aquarium' : 'collector');
  b.budget = Math.round(value * rng.range(1.05, 1.6));
  b.patience = Math.max(b.patience, 0.7);
  state.market.buyers.push(b);
  return b;
}

// ───────────────────────────── frag listings (lane:frags) ─────────────────────────────

const CORAL_RARITY: Record<string, number> = { sps: 0.72, lps: 0.58, soft: 0.34, zoanthid: 0.4, mushroom: 0.3, gsp: 0.22 };
const CORAL_EASE: Record<string, number> = { sps: 0.15, lps: 0.5, soft: 0.8, zoanthid: 0.75, mushroom: 0.9, gsp: 0.9 };

/**
 * lane:frags — a frag/cutting listing as aspect scores (there are no animals). Coral type drives rarity and care,
 * grow-out drives size, healing and a local track record drive provenance ("lineage"), and the def drives looks.
 */
export function buildFragProfile(state: GameState, items: DecorInstance[]): ListingProfile {
  const n = Math.max(1, items.length);
  const now = finite(state.clock?.hour, 0);
  let rarity = 0;
  let lineage = 0;
  let beauty = 0;
  let health = 0;
  let ease = 0;
  let size = 0;
  let appeal = 0;
  let coral = 0;
  for (const it of items) {
    const def = getDecorDef(it.defId);
    const rule = propagationFor(def);
    const isCoral = isCoralDef(def);
    const t = def?.coralType ?? 'soft';
    const planted = it.frag?.plantedHour;
    const healed = planted !== undefined && now - planted >= FRAG_HEALED_HOURS;
    const grown = clamp01((finite(it.growth, rule.startGrowth) - rule.startGrowth) / Math.max(0.05, 1 - rule.startGrowth));
    rarity += isCoral ? CORAL_RARITY[t] ?? 0.35 : 0.1;
    lineage += clamp01(0.3 + 0.15 * ((it.frag?.generation ?? 1) - 1) + (healed ? 0.2 : 0));
    beauty += clamp01((def?.beauty ?? 5) / 10);
    health += clamp01(finite(it.health, 90) / 100);
    ease += isCoral ? CORAL_EASE[t] ?? 0.6 : clamp01(1.05 - finite(def?.lightNeed, 0.3));
    size += clamp01(0.15 + 0.8 * grown);
    appeal += isCoral ? 0.4 + 0.2 * clamp01((def?.beauty ?? 5) / 10) : 0.2;
    if (isCoral) coral++;
  }
  const attrs: Record<Aspect, number> = {
    rarity: rarity / n,
    lineage: lineage / n,
    beauty: beauty / n,
    health: health / n,
    easyCare: ease / n,
    size: size / n,
    visitorAppeal: appeal / n,
  };
  return { kind: 'frag', isTank: false, speciesIds: [], attrs, gallons: 0, coralShare: items.length ? coral / items.length : 0 };
}
