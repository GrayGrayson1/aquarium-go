/**
 * Marketplace listings and auctions: create / withdraw / accept / decline / counter, buyer arrivals, bids,
 * integrity checks (deaths, sickness, tank edits), expiry, quick sales and pricing suggestions.
 * OWNER: lane "market".
 *
 * Anti-exploit rules:
 * - Every sale goes through completeSale(), which re-validates the listing and its contents first.
 * - A listing can sell exactly once (status flips to 'sold' atomically inside one mutation).
 * - Creatures in a listing are marked 'listed' (they keep living in their tank); withdraw/expiry restores 'alive'.
 * - Bids are private offers that expire, get withdrawn and are re-priced — they never ratchet upward with time.
 */
import type { GameState, Listing, ListingKind, Bid, Creature, Tank, BuyerProfile, ListingSnapshot, DecorInstance } from '@/types';
import type { SimContext } from '../context';
import type { ActionResult } from '../care';
import type { Rng } from '../rng';
import { simRng } from '../rng';
import { nextId } from '../ids';
import { emitEvent } from '../context';
import { hourOfDay, GAME_HOURS_PER_REAL_SECOND } from '../time';
import { deleteTank } from '../tanks';
import { creaturesInTank } from '../life';
import { environmentGate, previewAddition } from '../compat';
import { isUnlocked, addReputation, addMastery, bumpCounter } from '../facility';
import { findSpecies } from '@/data/species';
import { TANK_TIER_BY_ID, TANK_TIERS } from '@/data/catalog/tanks';
import { BUYER_ARCHETYPES, LOCAL_FISH_STORE, archetypeLabel } from '@/data/buyers';
import { earn } from './finance';
import { tankValuation, bundleValue, careDifficultyLabel, lineageSummary, livestockSummary, tankSignature, compatRank, quickSellQuote } from './valuation';
import { buildProfile, buyerFit, buyerInterestWeight, maybeDelegation, buildFragProfile, type ListingProfile } from './buyers';
import { fragBundleValue, fragValue, fragStoreOffer, FRAG_HEALED_HOURS } from './valuation'; // lane:frags
import { fragLabel, isCoralDef } from '@/data/catalog/propagation'; // lane:frags
import { composeBidMessage, counterReply, buyNowMessage, withdrawMessage, saleFeedback, type MsgVars, type CounterOutcome } from './messages';
import { clamp, clamp01, clonePlain, finite, fmtMoney, nicePrice, pushCapped, speciesPlural, roundCents, morphTitle } from './util';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getDecorDef } from '@/data/catalog/decor';
import { touchResidents } from '../residents'; // lane:perf2
import { saleWarnings } from './warnings'; // lane:fix-econ

export interface ListingSpec {
  kind: ListingKind;
  creatureIds?: string[];
  tankId?: string;
  reserve: number;
  buyNow?: number;
  durationHours: number;
  title?: string;
  photo?: string;
  /** lane:frags — kind 'frag': ids of frags/cuttings in storage (inventory.frags). */
  fragIds?: string[];
}

export const MIN_LISTING_HOURS = 6;
export const MAX_LISTING_HOURS = 168;
/** The market does its work in windows of at least this many game hours (stepMarket batches ticks up to it). */
export const MARKET_STEP_HOURS = 0.1;

/**
 * Market lifetimes are set in REAL time at 1× (1 game hour = 10 real seconds, so 6 game hours = 1 real minute):
 * a new player reading an offer, opening the counter form and typing a price must not lose it mid-thought.
 */
export const GAME_HOURS_PER_REAL_MINUTE = GAME_HOURS_PER_REAL_SECOND * 60;
const realMin = (m: number) => m * GAME_HOURS_PER_REAL_MINUTE;
/** A fresh offer stays open at least this long (≈ 3 real minutes at 1×) … */
export const BID_MIN_OPEN_HOURS = realMin(3);
/** … and a patient buyer's up to this long (≈ 6 real minutes). */
export const BID_MAX_OPEN_HOURS = realMin(6);
/** A buyer's reply to your counter (a split or "my offer stands") stays open at least this long (≈ 2 real min). */
export const COUNTER_REPLY_OPEN_HOURS = realMin(2);
/** Opening the counter form holds the offer this long (≈ 2 real min): no expiry, no change of heart. */
export const NEGOTIATION_HOLD_HOURS = realMin(2);
/** When bidding closes, open offers stay at least this long (≈ 2 real min) so you can still accept one. */
export const CLOSING_GRACE_HOURS = realMin(2);
/** A counter form left open holds one offer at most this long in total (≈ 6 real min): buyers don't wait forever. */
export const MAX_NEGOTIATION_HOLD_HOURS = NEGOTIATION_HOLD_HOURS * 3;

/**
 * The windows above are promises in REAL time, so at 3×/10× they cover the same real seconds: a bid that would last
 * 3 real minutes at 1× lasts 3 real minutes at 10× too (lane:fix-econ, S03-02). Tests and the offline catch-up run at
 * 1× (or paused), where this is exactly 1.
 */
export function marketTimeScale(state: GameState): number {
  const speed = finite(state.clock?.speed, 1);
  return speed > 1 ? speed : 1;
}

/** Real minutes a span of game hours lasts at 1× speed. */
export function realMinutesAt1x(gameHours: number): number {
  return gameHours / GAME_HOURS_PER_REAL_MINUTE;
}

export interface ListingDurationPreset {
  hours: number;
  /** "2 days" (game time). */
  label: string;
  /** "about 8 min at 1×" (real time). */
  realLabel: string;
  note: string;
}

const realLabel = (h: number) => `about ${Math.round(realMinutesAt1x(h))} min at 1×`;

/** Listing lengths the create-listing form should offer (game days, labelled with their real length at 1×). */
export const LISTING_DURATION_PRESETS: ListingDurationPreset[] = [
  { hours: 24, label: '1 day', realLabel: realLabel(24), note: 'Quick — fewer buyers see it' },
  { hours: 48, label: '2 days', realLabel: realLabel(48), note: 'Balanced' },
  { hours: 72, label: '3 days', realLabel: realLabel(72), note: 'More buyers, more bids' },
  { hours: 120, label: '5 days', realLabel: realLabel(120), note: 'Widest reach' },
];
export const DEFAULT_LISTING_HOURS = 48;
const MAX_ACTIVE_LISTINGS = 24;
const BIDS_CAP = 60;
const CLOSED_LISTINGS_KEPT = 40;
const CLOSED_PHOTOS_KEPT = 5;
const HISTORY_CAP = 200;

const fail = (message: string): ActionResult => ({ ok: false, message });

const WATER_CLASS_LABEL: Record<string, string> = {
  freshwater_cool: 'cool freshwater',
  freshwater_tropical: 'tropical freshwater',
  freshwater_planted: 'planted freshwater',
  marine_fowlr: 'marine fish-only',
  marine_live_rock: 'marine live-rock',
  reef: 'reef',
  brackish: 'brackish',
};
const COMPAT_WORD: Record<string, string> = {
  excellent: 'Excellent',
  usually_compatible: 'Usually compatible',
  conditional: 'Conditional',
  high_risk: 'High-risk',
  incompatible: 'Incompatible',
};

// ───────────────────────────── access ─────────────────────────────

export function marketAccess(state: GameState): { listings: boolean; tankAuctions: boolean; hint?: string } {
  const listings = isUnlocked(state, 'market_listings');
  const tankAuctions = isUnlocked(state, 'tank_auctions');
  let hint: string | undefined;
  if (!listings) hint = 'The marketplace opens as your reputation grows. Until then, the local fish store will buy animals for quick cash.';
  else if (!tankAuctions) hint = 'Whole-aquarium auctions unlock a little later. You can already list individual animals, pairs and groups.';
  return { listings, tankAuctions, hint };
}

function repFactor(state: GameState): number {
  return 0.8 + 0.5 * Math.sqrt(clamp01(finite(state.progress?.reputation, 0) / 1000));
}

const DEPTH: Record<string, number> = { hobby_room: 1, specialty_shop: 1.1, aquarium_store: 1.2, showroom: 1.3, destination: 1.4, grand_hall: 1.5 };

// ───────────────────────────── contents ─────────────────────────────

interface Contents {
  ok: boolean;
  message: string;
  kind: ListingKind;
  creatures: Creature[];
  tank?: Tank;
  /** lane:frags — kind 'frag' */
  frags: DecorInstance[];
}

/** lane:frags — at most this many frags/cuttings in one listing (a frag pack or a bundle). */
export const MAX_FRAGS_PER_LISTING = 12;

function activeListingFor(state: GameState, tankId: string): Listing | undefined {
  return state.market.listings.find((l) => l.status === 'active' && l.kind === 'tank' && l.tankId === tankId);
}

function pairCheck(a: Creature, b: Creature): string | null {
  if (a.speciesId !== b.speciesId) return 'A breeding pair must be two animals of the same species.';
  const sp = findSpecies(a.speciesId);
  if (!sp) return 'Unknown species.';
  if (['egg', 'larva', 'fry'].includes(a.lifeStage) || ['egg', 'larva', 'fry'].includes(b.lifeStage)) return 'These animals are too young to sell as a pair — list them as juveniles.';
  switch (sp.sexSystem) {
    case 'gonochoristic': {
      if (a.sex === 'unknown' || b.sex === 'unknown') return `Their sexes can't be told apart yet, so they can't be sold as a pair. List them as a group instead.`;
      if (a.sex === b.sex) return `A pair needs one male and one female — these are both ${a.sex}s. List them as a group instead.`;
      return null;
    }
    case 'protandrous':
    case 'protogynous':
    case 'simultaneous_hermaphrodite':
      return null; // any two can form a pair
    default:
      return `Pairs don't apply to ${speciesPlural(a.speciesId)}. List them as a group instead.`;
  }
}

function resolveContents(state: GameState, spec: Pick<ListingSpec, 'kind' | 'creatureIds' | 'tankId' | 'fragIds'>): Contents {
  const kind = spec.kind;
  const base = { kind, creatures: [] as Creature[], frags: [] as DecorInstance[] };
  if (kind === 'frag') {
    // lane:frags — frags & cuttings come from storage; they are held by the listing until it ends
    const ids = [...new Set(spec.fragIds ?? [])];
    if (ids.length === 0) return { ...base, ok: false, message: 'Choose the frags or cuttings to list.' };
    if (ids.length > MAX_FRAGS_PER_LISTING) return { ...base, ok: false, message: `A listing holds up to ${MAX_FRAGS_PER_LISTING} frags or cuttings.` };
    const stored = state.inventory.frags ?? [];
    const frags: DecorInstance[] = [];
    for (const id of ids) {
      const f = stored.find((x) => x.id === id);
      if (!f || !getDecorDef(f.defId)) return { ...base, ok: false, message: 'One of those frags is no longer in storage.' };
      frags.push(f);
    }
    return { ...base, ok: true, message: 'ok', frags };
  }
  if (kind === 'tank') {
    const tank = spec.tankId ? state.tanks[spec.tankId] : undefined;
    if (!tank) return { ...base, ok: false, message: 'Choose an aquarium to list.' };
    const existing = activeListingFor(state, tank.id);
    if (existing) return { ...base, ok: false, message: `${tank.name} is already listed.` };
    const creatures = creaturesInTank(state, tank.id);
    const taken = creatures.find((c) => c.status === 'listed');
    if (taken) return { ...base, ok: false, message: `${taken.name} is already in another listing. Withdraw that listing first, or move ${taken.name} out.` };
    return { ...base, ok: true, message: 'ok', creatures, tank };
  }
  const ids = [...new Set(spec.creatureIds ?? [])];
  if (ids.length === 0) return { ...base, ok: false, message: 'Choose the animals to list.' };
  const creatures: Creature[] = [];
  for (const id of ids) {
    const c = state.creatures[id];
    if (!c) return { ...base, ok: false, message: 'One of those animals could not be found.' };
    if (c.status === 'dead') return { ...base, ok: false, message: `${c.name} has died and can't be listed.` };
    if (c.status === 'sold') return { ...base, ok: false, message: `${c.name} has already been sold.` };
    if (c.status === 'listed') return { ...base, ok: false, message: `${c.name} is already listed.` };
    if (c.status !== 'alive') return { ...base, ok: false, message: `${c.name} can't be listed right now.` };
    if (c.tankId && activeListingFor(state, c.tankId)) return { ...base, ok: false, message: `${c.name}'s tank is listed as a whole aquarium.` };
    creatures.push(c);
  }
  const sameSpecies = creatures.every((c) => c.speciesId === creatures[0].speciesId);
  switch (kind) {
    case 'creature':
      if (creatures.length !== 1) return { ...base, ok: false, message: 'A single listing holds exactly one animal. Use a group listing for more.' };
      break;
    case 'pair': {
      if (creatures.length !== 2) return { ...base, ok: false, message: 'A pair listing needs exactly two animals.' };
      const why = pairCheck(creatures[0], creatures[1]);
      if (why) return { ...base, ok: false, message: why };
      break;
    }
    case 'group':
      if (creatures.length < 2) return { ...base, ok: false, message: 'A group needs at least two animals.' };
      if (!sameSpecies) return { ...base, ok: false, message: 'A group listing must be one species. List mixed animals separately, or sell the whole aquarium.' };
      break;
    case 'juveniles':
      if (!sameSpecies) return { ...base, ok: false, message: 'A juvenile batch must be one species.' };
      if (creatures.some((c) => !['juvenile', 'fry', 'larva'].includes(c.lifeStage))) return { ...base, ok: false, message: 'Only juveniles can go in a juvenile batch — list adults individually or as a group.' };
      break;
    default:
      return { ...base, ok: false, message: 'Unknown listing type.' };
  }
  return { ...base, ok: true, message: 'ok', creatures };
}

// ───────────────────────────── snapshot ─────────────────────────────

function defaultTitle(state: GameState, kind: ListingKind, creatures: Creature[], tank?: Tank): string {
  if (tank) {
    const tier = TANK_TIER_BY_ID[tank.tierId];
    return `${tank.name} — ${tier?.gallons ?? '?'} gal ${WATER_CLASS_LABEL[tank.waterClass] ?? ''} aquarium`.replace(/\s+aquarium$/, ' aquarium');
  }
  const c = creatures[0];
  const sp = findSpecies(c.speciesId);
  const common = sp?.commonName ?? c.speciesId;
  const full = morphTitle(c.morphName, common);
  switch (kind) {
    case 'creature':
      return c.name && c.name !== common ? `${c.name} — ${full}` : full;
    case 'pair':
      return `Breeding pair: ${creatures[0].name} & ${creatures[1].name} (${speciesPlural(c.speciesId)})`;
    case 'group':
      return `Group of ${creatures.length} ${speciesPlural(c.speciesId)}`;
    case 'juveniles':
      return creatures.length === 1 ? `Juvenile ${full}` : `${creatures.length} juvenile ${speciesPlural(c.speciesId)}`;
    default:
      return common;
  }
}

interface Built {
  snapshot: ListingSnapshot;
  title: string;
  profile: ListingProfile;
  appeal: number;
}

function buildSnapshot(state: GameState, kind: ListingKind, creatures: Creature[], tank: Tank | undefined, photo?: string, frags: DecorInstance[] = []): Built {
  if (kind === 'frag') return buildFragSnapshot(state, frags, photo); // lane:frags
  const profile = buildProfile(state, kind, creatures, tank);
  const avgHealth = creatures.length ? creatures.reduce((a, c) => a + clamp(finite(c.stats?.health, 100), 0, 100), 0) / creatures.length : 100;
  let valuation: number;
  let low: number;
  let high: number;
  let healthScore: number;
  let beautyScore: number;
  let summary: string;
  if (tank) {
    const tv = tankValuation(state, tank.id);
    valuation = tv.expected;
    low = tv.low;
    high = tv.high;
    const welfare = clamp(finite(tank.cache?.welfare, 100), 0, 100);
    healthScore = Math.round(creatures.length ? welfare : clamp(finite(tank.cache?.stability, 70), 0, 100));
    beautyScore = Math.round(clamp(finite(tank.cache?.beauty, 40), 0, 100));
    const tier = TANK_TIER_BY_ID[tank.tierId];
    const ageDays = Math.max(0, Math.round((state.clock.hour - tank.createdHour) / 24));
    const clutches = Object.values(state.clutches).filter((c) => c.tankId === tank.id).length;
    summary = [
      `${tier?.name ?? tank.tierId} · ${WATER_CLASS_LABEL[tank.waterClass] ?? tank.waterClass}`,
      livestockSummary(creatures),
      `${tank.decor.length} decor piece${tank.decor.length === 1 ? '' : 's'} · ${tank.equipment.length} equipment item${tank.equipment.length === 1 ? '' : 's'}`,
      `Beauty ${beautyScore} · Welfare ${Math.round(welfare)} · ${COMPAT_WORD[tank.cache?.compatVerdict ?? 'excellent']} compatibility`,
      `${tank.water.bioMaturity >= 0.7 ? 'Cycled' : 'Still cycling'} · established ${ageDays} day${ageDays === 1 ? '' : 's'}`,
      clutches ? `Includes ${clutches} clutch${clutches === 1 ? '' : 'es'} of eggs/fry` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  } else {
    const bv = bundleValue(state, kind, creatures);
    valuation = bv.expected;
    low = bv.low;
    high = bv.high;
    healthScore = Math.round(avgHealth);
    beautyScore = Math.round(profile.attrs.beauty * 100);
    const c = creatures[0];
    const sexes = creatures.map((x) => x.sex).filter((s) => s !== 'unknown');
    const stages = [...new Set(creatures.map((x) => x.lifeStage))].join('/');
    summary = [
      livestockSummary(creatures),
      stages,
      sexes.length ? `${sexes.filter((s) => s === 'male').length}♂ ${sexes.filter((s) => s === 'female').length}♀` : '',
      creatures.length === 1 && c.personality?.length ? `Personality: ${c.personality.map((p) => p.replace(/_/g, ' ')).join(', ')}` : '',
      `Health ${healthScore}${creatures.some((x) => x.illness) ? ' (illness disclosed)' : ''}`,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  const snapshot: ListingSnapshot = {
    valuation,
    low,
    high,
    healthScore,
    beautyScore,
    careDifficulty: careDifficultyLabel(state, creatures, tank),
    lineageSummary: lineageSummary(state, creatures),
    summary,
    creatureIds: creatures.map((c) => c.id),
    tankId: tank?.id,
    welfare: tank ? Math.round(clamp(finite(tank.cache?.welfare, 100), 0, 100)) : Math.round(avgHealth),
    compatVerdict: tank?.cache?.compatVerdict,
    waterStatus: tank?.cache?.waterStatus ?? tank?.cache?.status,
    gallons: tank ? TANK_TIER_BY_ID[tank.tierId]?.gallons : undefined,
    speciesIds: profile.speciesIds,
    signature: tank ? tankSignature(tank) : undefined,
  };
  if (photo) snapshot.photo = photo;
  const a = profile.attrs;
  const appeal = clamp01(0.22 + 0.2 * a.beauty + 0.18 * a.health + 0.14 * a.rarity + 0.1 * a.visitorAppeal + 0.06 * a.lineage + (photo ? 0.06 : 0) + (tank ? 0.05 : 0));
  return { snapshot, title: defaultTitle(state, kind, creatures, tank), profile, appeal };
}

// ───────────────────────────── frag snapshot (lane:frags) ─────────────────────────────

function fragTitle(frags: DecorInstance[]): string {
  const defs = [...new Set(frags.map((f) => f.defId))];
  const corals = frags.filter((f) => isCoralDef(getDecorDef(f.defId))).length;
  if (frags.length === 1) return fragLabel(frags[0]);
  if (defs.length === 1) return `${frags.length} × ${fragLabel(frags[0])}${isCoralDef(getDecorDef(frags[0].defId)) ? 's' : ''}`;
  if (corals === frags.length) return `Mixed coral frag pack (${frags.length} frags)`;
  if (corals === 0) return `Planted-tank cuttings bundle (${frags.length} kinds)`;
  return `Frags & cuttings bundle (${frags.length} pieces)`;
}

const FRAG_CARE: Record<string, [number, string]> = { sps: [3, 'Advanced'], lps: [2, 'Intermediate'], soft: [1, 'Beginner'], zoanthid: [1, 'Beginner'], mushroom: [0, 'Beginner'], gsp: [0, 'Beginner'] };

function buildFragSnapshot(state: GameState, frags: DecorInstance[], photo?: string): Built {
  const profile = buildFragProfile(state, frags);
  const bv = fragBundleValue(state, frags);
  const now = state.clock.hour;
  const n = Math.max(1, frags.length);
  const avgHealth = frags.reduce((a, f) => a + clamp(finite(f.health, 90), 0, 100), 0) / n;
  let care: [number, string] = [0, 'Beginner'];
  for (const f of frags) {
    const def = getDecorDef(f.defId);
    const c: [number, string] = isCoralDef(def) ? FRAG_CARE[def?.coralType ?? 'soft'] ?? [1, 'Beginner'] : finite(def?.lightNeed, 0.3) >= 0.5 ? [1, 'Intermediate'] : [0, 'Beginner'];
    if (c[0] > care[0]) care = c;
  }
  const byDef = new Map<string, number>();
  for (const f of frags) byDef.set(f.defId, (byDef.get(f.defId) ?? 0) + 1);
  const healed = frags.filter((f) => f.frag?.plantedHour !== undefined && now - f.frag.plantedHour >= FRAG_HEALED_HOURS).length;
  const lines = [...new Set(frags.map((f) => f.frag?.lineName).filter(Boolean))] as string[];
  const maxGen = frags.reduce((m, f) => Math.max(m, f.frag?.generation ?? 1), 1);
  const summary = [
    [...byDef.entries()].map(([id, k]) => `${k} × ${fragLabel({ defId: id })}`).join(', '),
    healed === frags.length ? (frags.length === 1 ? 'Healed on its plug' : 'All healed') : healed > 0 ? `${healed} healed, ${frags.length - healed} fresh` : 'Fresh cuts',
    `Health ${Math.round(avgHealth)}`,
  ].join(' · ');
  const snapshot: ListingSnapshot = {
    valuation: bv.expected,
    low: bv.low,
    high: bv.high,
    healthScore: Math.round(avgHealth),
    beautyScore: Math.round(profile.attrs.beauty * 100),
    careDifficulty: care[1],
    lineageSummary: `${lines[0] ?? `${state.shopName} line`}${maxGen >= 2 ? ` · up to generation ${maxGen}` : ''} · aquacultured in your shop`,
    summary,
    creatureIds: [],
    welfare: Math.round(avgHealth),
    speciesIds: [],
  };
  if (photo) snapshot.photo = photo;
  const a = profile.attrs;
  const appeal = clamp01(0.26 + 0.2 * a.beauty + 0.18 * a.health + 0.12 * a.rarity + 0.06 * a.lineage + (photo ? 0.06 : 0));
  return { snapshot, title: fragTitle(frags), profile, appeal };
}

function currentValuation(state: GameState, l: Listing): number {
  if (l.kind === 'frag') return l.fragItems?.length ? fragBundleValue(state, l.fragItems).expected : 0; // lane:frags
  if (l.kind === 'tank') {
    if (!l.tankId || !state.tanks[l.tankId]) return 0;
    // Price what the buyer receives: the listed animals, gear and decor (see completeSale — anything added after
    // listing is handed back to the seller), never the tank's current contents (lane:fix-econ, S03-01).
    return tankValuation(state, l.tankId, { creatureIds: new Set(l.creatureIds), itemIds: listedItemIds(l.snapshot.signature) ?? undefined, maxBeauty: l.snapshot.beautyScore }).expected;
  }
  const creatures = l.creatureIds.map((id) => state.creatures[id]).filter((c): c is Creature => !!c && (c.status === 'listed' || c.status === 'alive'));
  return creatures.length ? bundleValue(state, l.kind, creatures).expected : 0;
}

function listingCreatures(state: GameState, l: Listing): Creature[] {
  return l.creatureIds.map((id) => state.creatures[id]).filter((c): c is Creature => !!c && (c.status === 'listed' || c.status === 'alive'));
}

// ───────────────────────────── preview / pricing ─────────────────────────────

export interface ListingPreview {
  ok: boolean;
  message: string;
  title: string;
  expected: number;
  low: number;
  high: number;
  suggestedReserve: number;
  suggestedBuyNow: number;
  snapshot?: ListingSnapshot;
  /** Plain-language warnings for the confirm dialog (final tank, sick animals, starter...). */
  warnings: string[];
}

/** Everything the listing dialog needs before the player commits. */
export function previewListing(state: GameState, spec: Omit<ListingSpec, 'reserve' | 'durationHours'>): ListingPreview {
  const empty: ListingPreview = { ok: false, message: '', title: '', expected: 0, low: 0, high: 0, suggestedReserve: 0, suggestedBuyNow: 0, warnings: [] };
  const access = marketAccess(state);
  if (!access.listings) return { ...empty, message: access.hint ?? 'The marketplace is not open yet.' };
  if (spec.kind === 'tank' && !access.tankAuctions) return { ...empty, message: access.hint ?? 'Whole-aquarium auctions are not unlocked yet.' };
  const contents = resolveContents(state, spec);
  if (!contents.ok) return { ...empty, message: contents.message };
  const built = buildSnapshot(state, contents.kind, contents.creatures, contents.tank, spec.photo, contents.frags);
  const warnings: string[] = [];
  if (contents.kind === 'frag') {
    // lane:frags
    const fresh = contents.frags.filter((f) => isCoralDef(getDecorDef(f.defId)) && !(f.frag?.plantedHour !== undefined && state.clock.hour - f.frag.plantedHour >= FRAG_HEALED_HOURS)).length;
    if (fresh) warnings.push(`${fresh === contents.frags.length ? 'These are fresh cuts' : `${fresh} of these ${fresh === 1 ? 'is a fresh cut' : 'are fresh cuts'}`}. Buyers pay about a fifth more for a frag that has healed on its plug for a day — a frag rack is the place for that.`);
    warnings.push('Listed frags wait in your holding system and don’t grow until the listing ends. Unsold ones come back to storage.');
  }
  if (contents.tank && state.tankOrder.length === 1) warnings.push('This is your last aquarium. If it sells you will have an empty room — and the money to start a new build.');
  if (contents.tank) {
    const tier = TANK_TIER_BY_ID[contents.tank.tierId];
    const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
    warnings.push(`Included: the ${tier?.name ?? 'tank'}, ${n(contents.tank.equipment.length, 'equipment item', 'equipment items')}, ${n(contents.tank.decor.length, 'decor piece', 'decor pieces')} and ${n(contents.creatures.length, 'animal', 'animals')}. Anything added later is not part of the sale (animals are moved to another tank, gear and decor go to storage).`);
    if ((contents.tank.cache?.compatVerdict && compatRank(contents.tank.cache.compatVerdict) >= 3) || (contents.tank.cache?.waterStatus ?? contents.tank.cache?.status) === 'danger') warnings.push('Selling a tank in poor shape lowers bids and can cost reputation.');
  }
  // Sick, starter, brooding/guarding, pair and favourite warnings (shared with quick sale — S03-05).
  warnings.push(...saleWarnings(state, contents.creatures.map((c) => c.id)));
  return {
    ok: true,
    message: 'ok',
    title: spec.title?.trim() || built.title,
    expected: built.snapshot.valuation,
    low: built.snapshot.low ?? built.snapshot.valuation,
    high: built.snapshot.high ?? built.snapshot.valuation,
    suggestedReserve: nicePrice(built.snapshot.valuation * 0.8),
    suggestedBuyNow: nicePrice(built.snapshot.valuation * 1.35),
    snapshot: built.snapshot,
    warnings,
  };
}

/** Suggested reserve/buy-now for a listing spec. */
export function suggestPricing(state: GameState, spec: Omit<ListingSpec, 'reserve' | 'durationHours'>): { reserve: number; buyNow: number; expected: number } {
  const contents = resolveContents(state, spec);
  if (!contents.ok) return { reserve: 0, buyNow: 0, expected: 0 };
  let expected: number;
  if (contents.tank) expected = tankValuation(state, contents.tank.id).expected;
  else if (contents.kind === 'frag') expected = fragBundleValue(state, contents.frags).expected; // lane:frags
  else expected = bundleValue(state, contents.kind, contents.creatures).expected;
  return { reserve: nicePrice(expected * 0.8), buyNow: nicePrice(expected * 1.35), expected };
}

// ───────────────────────────── create / withdraw ─────────────────────────────

export function createListing(state: GameState, spec: ListingSpec): ActionResult & { listingId?: string } {
  const access = marketAccess(state);
  if (!access.listings) return fail(access.hint ?? 'The marketplace is not open yet.');
  if (spec.kind === 'tank' && !access.tankAuctions) return fail(access.hint ?? 'Whole-aquarium auctions are not unlocked yet.');
  if (state.market.listings.filter((l) => l.status === 'active').length >= MAX_ACTIVE_LISTINGS) return fail(`You can run up to ${MAX_ACTIVE_LISTINGS} listings at once.`);
  const reserve = finite(spec.reserve, NaN);
  if (!Number.isFinite(reserve) || reserve < 0) return fail('Set a reserve of $0 or more.');
  let buyNow: number | undefined;
  if (spec.buyNow !== undefined && spec.buyNow !== null && spec.buyNow > 0) {
    if (!Number.isFinite(spec.buyNow)) return fail('That buy-now price is not valid.');
    if (spec.buyNow < reserve) return fail('The buy-now price must be at least your reserve.');
    buyNow = Math.round(spec.buyNow);
  }
  const duration = clamp(finite(spec.durationHours, DEFAULT_LISTING_HOURS), MIN_LISTING_HOURS, MAX_LISTING_HOURS);
  const contents = resolveContents(state, spec);
  if (!contents.ok) return fail(contents.message);

  const built = buildSnapshot(state, contents.kind, contents.creatures, contents.tank, spec.photo, contents.frags);
  const now = state.clock.hour;
  const id = nextId(state, 'lst');
  const title = (spec.title?.trim() || built.title).slice(0, 90);
  const listing: Listing = {
    id,
    kind: contents.kind,
    title,
    creatureIds: contents.creatures.map((c) => c.id),
    tankId: contents.tank?.id,
    reserve: Math.round(reserve),
    buyNow,
    createdHour: now,
    endsHour: now + duration,
    status: 'active',
    bids: [],
    interest: clamp01(0.2 + built.appeal * 0.6),
    snapshot: built.snapshot,
    appeal: built.appeal,
    lastValuation: built.snapshot.valuation,
    alerts: [],
  };
  for (const c of contents.creatures) {
    c.status = 'listed';
    pushCapped(c.history, { hour: now, kind: 'listed', text: `Listed for sale: "${title}".` }, 40);
  }
  if (contents.tank) contents.tank.listingId = id;
  if (contents.kind === 'frag') {
    // lane:frags — the listing holds the frags (they leave storage; unsold ones come back)
    const ids = new Set(contents.frags.map((f) => f.id));
    listing.fragItems = contents.frags.map((f) => clonePlain(f));
    state.inventory.frags = (state.inventory.frags ?? []).filter((f) => !ids.has(f.id));
  }
  state.market.listings.push(listing);
  bumpCounter(state, 'listingsCreated');
  emitEvent(state, {
    kind: 'market',
    text: `Listed "${title}" — expected ${fmtMoney(built.snapshot.low ?? built.snapshot.valuation)}–${fmtMoney(built.snapshot.high ?? built.snapshot.valuation)}. Buyers will start looking soon.`,
    listingId: id,
    tankId: contents.tank?.id,
  });
  return { ok: true, message: `Listed "${title}".`, listingId: id };
}

function restoreContents(state: GameState, l: Listing): void {
  for (const id of l.creatureIds) {
    const c = state.creatures[id];
    if (c && c.status === 'listed') c.status = 'alive';
  }
  if (l.tankId) {
    const t = state.tanks[l.tankId];
    if (t && t.listingId === l.id) delete t.listingId;
  }
  // lane:frags — unsold frags go back to storage (the closed listing keeps its copy for display only)
  if (l.kind === 'frag' && l.fragItems?.length) {
    const stored = (state.inventory.frags ??= []);
    for (const f of l.fragItems) if (!stored.some((x) => x.id === f.id)) stored.push(clonePlain(f));
  }
}

function closeOpenBids(l: Listing, status: Bid['status'], note: string): void {
  for (const b of l.bids) {
    if (b.status === 'open' || b.status === 'countered') {
      b.status = status;
      b.note = note;
    }
  }
}

export function withdrawListing(state: GameState, listingId: string): ActionResult {
  const l = state.market.listings.find((x) => x.id === listingId);
  if (!l) return fail('Listing not found.');
  if (l.status !== 'active') return fail(`This listing is already ${l.status}.`);
  l.status = 'withdrawn';
  l.closedHour = state.clock.hour; // S13-10: the Sold card and 'Recently ended' order read it
  l.outcome = 'You withdrew this listing.';
  restoreContents(state, l);
  closeOpenBids(l, 'declined', 'Listing withdrawn by the seller.');
  emitEvent(state, { kind: 'market', text: `Withdrew "${l.title}". Everything stays with you.`, listingId: l.id });
  return { ok: true, message: `Withdrew "${l.title}".` };
}

// ───────────────────────────── sale ─────────────────────────────

interface SaleCheck {
  ok: boolean;
  message: string;
  creatures: Creature[];
  tank?: Tank;
  relocations: { c: Creature; toTankId: string; risky: boolean }[];
}

/**
 * Where an animal that is not part of a tank sale goes: a tank it can live in (environment + temperature), preferring
 * its water class, a compatible community and light stocking. Never an 'incompatible' mix; a high-risk one only when
 * nothing better exists, and the sale then says so (lane:fix-econ, S03-04).
 */
function findRelocation(state: GameState, c: Creature, excludeTankId: string, reserved: Map<string, number>, verdicts: Map<string, string>): { id: string; risky: boolean } | null {
  const sp = findSpecies(c.speciesId);
  if (!sp) return null;
  // Siblings (a minted clutch, a shoal) get the same compatibility verdict: preview each kind of animal once per tank
  // (round-3 R01-03 — this runs on every market step while a listed tank holds animals that aren't part of the sale).
  const kind = `${c.speciesId}|${c.sex ?? 'unknown'}|${c.lifeStage}|${Math.round(finite(c.sizeCm, 0) * 4)}`;
  let best: { id: string; score: number; risky: boolean } | null = null;
  for (const id of state.tankOrder) {
    if (id === excludeTankId) continue;
    const t = state.tanks[id];
    if (!t || activeListingFor(state, id)) continue;
    let gate = { ok: false };
    try {
      gate = environmentGate(sp, t);
    } catch {
      gate = { ok: sp.environment === t.environment };
    }
    if (!gate.ok) continue;
    // Never park an animal somewhere it can't survive: the water must be within its temperature range
    // (an axolotl must not land in a 26 °C tropical tank).
    const temp = finite(t.water?.tempC, NaN);
    if (Number.isFinite(temp) && (temp < sp.tempC.min || temp > sp.tempC.max)) continue;
    const memoKey = `${id}|${kind}`;
    let verdict = verdicts.get(memoKey);
    if (verdict === undefined) {
      try {
        verdict = previewAddition(state, id, { speciesId: c.speciesId, creatureIds: [c.id] }).verdict;
      } catch {
        verdict = 'excellent';
      }
      verdicts.set(memoKey, verdict);
    }
    if (verdict === 'incompatible') continue;
    const compat = verdict === 'high_risk' ? -3 : verdict === 'conditional' ? -1 : 0;
    const score = (sp.waterClasses?.includes(t.waterClass) ? 2 : 0) + compat - (reserved.get(id) ?? 0) * 0.1 - finite(t.cache?.stockingLoad, 0);
    if (!best || score > best.score) best = { id, score, risky: verdict === 'high_risk' };
  }
  if (best) reserved.set(best.id, (reserved.get(best.id) ?? 0) + 1);
  return best ? { id: best.id, risky: best.risky } : null;
}

function validateForSale(state: GameState, l: Listing): SaleCheck {
  const none = { creatures: [] as Creature[], relocations: [] as SaleCheck['relocations'] };
  if (l.status !== 'active') return { ...none, ok: false, message: 'This listing is no longer active.' };
  const creatures = l.creatureIds.map((id) => state.creatures[id]).filter((c): c is Creature => !!c && (c.status === 'listed' || c.status === 'alive'));
  if (l.kind === 'frag') return l.fragItems?.length ? { ok: true, message: 'ok', creatures: [], relocations: [] } : { ...none, ok: false, message: 'The listed frags are no longer available.' }; // lane:frags
  if (l.kind !== 'tank') {
    if (creatures.length !== l.creatureIds.length || creatures.length === 0) return { ...none, ok: false, message: 'The listed animals have changed. Please re-list.' };
    return { ok: true, message: 'ok', creatures, relocations: [] };
  }
  const tank = l.tankId ? state.tanks[l.tankId] : undefined;
  if (!tank || tank.listingId !== l.id) return { ...none, ok: false, message: 'The aquarium in this listing no longer exists.' };
  const inTank = creatures.filter((c) => c.tankId === tank.id);
  const unlisted = creaturesInTank(state, tank.id).filter((c) => !l.creatureIds.includes(c.id));
  const relocations: SaleCheck['relocations'] = [];
  const reserved = new Map<string, number>();
  const verdicts = new Map<string, string>();
  for (const c of unlisted) {
    const to = findRelocation(state, c, tank.id, reserved, verdicts);
    if (!to) return { ...none, ok: false, message: `${c.name} isn't part of this sale and has no other suitable tank to move to. Move ${c.name} first, or withdraw and re-list the tank with ${c.name} included.` };
    relocations.push({ c, toTankId: to.id, risky: to.risky });
  }
  return { ok: true, message: 'ok', creatures: inTank, tank, relocations };
}

interface SaleAssessment {
  kind: 'good' | 'unhealthy' | 'misrep';
  penalty: number;
  details: string[];
}

/** Compare the state at sale with what buyers were shown (the snapshot). */
function assessSale(state: GameState, l: Listing, creatures: Creature[], tank?: Tank): SaleAssessment {
  const snap = l.snapshot;
  const details: string[] = [];
  const avgHealth = creatures.length ? creatures.reduce((a, c) => a + clamp(finite(c.stats?.health, 100), 0, 100), 0) / creatures.length : 100;
  const cur = tank ? (creatures.length ? clamp(finite(tank.cache?.welfare, 100), 0, 100) : 100) : avgHealth;
  const shown = finite(snap.welfare ?? snap.healthScore, 100);
  const sick = creatures.filter((c) => c.illness || (c.stats?.health ?? 100) < 45).length;
  let misrep = 0;
  let unhealthy = 0;
  const drop = shown - cur;
  if (drop > 15) {
    misrep += (drop - 15) * 0.8;
    details.push(`health dropped from ${Math.round(shown)} to ${Math.round(cur)} after listing`);
  }
  if (tank) {
    const compatDrop = compatRank(tank.cache?.compatVerdict) - compatRank(snap.compatVerdict);
    if (compatDrop >= 2) {
      misrep += 12 * (compatDrop - 1);
      details.push('the stocking became far less compatible after listing');
    }
    if (snap.waterStatus !== 'danger' && (tank.cache?.waterStatus ?? tank.cache?.status) === 'danger') {
      misrep += 10;
      details.push('the water crashed after listing');
    }
    if (compatRank(tank.cache?.compatVerdict) >= 3) {
      unhealthy += 8;
      details.push('the stocking is risky');
    }
  }
  if (sick > 0) {
    const disclosedSick = creatures.filter((c) => (l.alerts ?? []).includes(`sick:${c.id}`) || snap.summary.includes('illness disclosed')).length;
    misrep += 6 * Math.max(0, sick - disclosedSick);
    unhealthy += 3 * sick;
    details.push(`${sick} animal${sick === 1 ? ' was' : 's were'} unwell at handover`);
  }
  if (cur < 50) unhealthy += (50 - cur) * 0.3;
  if (l.changedSinceListing) misrep *= 0.5; // changes were disclosed to buyers
  const penalty = Math.round(Math.min(60, misrep + unhealthy));
  const kind: SaleAssessment['kind'] = misrep >= 5 ? 'misrep' : unhealthy >= 3 ? 'unhealthy' : 'good';
  return { kind, penalty: kind === 'good' ? 0 : Math.max(2, penalty), details };
}

function msgVars(state: GameState, l: Listing, buyerName?: string, org?: string): MsgVars {
  if (l.kind === 'frag') return fragMsgVars(l, buyerName, org); // lane:frags
  const creatures = listingCreatures(state, l);
  const lead = creatures[0];
  const sid = l.snapshot.speciesIds?.[0] ?? lead?.speciesId;
  const species = sid ? speciesPlural(sid) : 'fish';
  // lane:w2-ui — a pair / group / juveniles batch reads "they" and "this pair", never one animal's name ("[many]" templates)
  const many = l.kind !== 'tank' && l.creatureIds.length > 1;
  const lot = l.kind === 'pair' ? 'this pair' : l.kind === 'group' ? 'this group' : l.kind === 'juveniles' ? 'these juveniles' : `these ${species}`;
  return {
    species,
    name: l.kind === 'tank' ? (l.tankId && state.tanks[l.tankId]?.name) || 'this tank' : many ? lot : lead?.name ?? 'this animal',
    morph: lead?.morphName && !/^wild type$/i.test(lead.morphName) ? lead.morphName : '',
    gallons: String(l.snapshot.gallons ?? ''),
    org: org ?? buyerName ?? '',
    scope: l.kind === 'tank' ? 'tank' : 'animal',
    ...(many ? { many: '1', lot } : {}),
  };
}

/** lane:frags — message vars for a frag listing: "hammer coral frags", "these cuttings", coral/plant scope. */
function fragMsgVars(l: Listing, buyerName?: string, org?: string): MsgVars {
  const items = l.fragItems ?? [];
  const defs = items.map((f) => getDecorDef(f.defId));
  const corals = defs.filter((d) => isCoralDef(d)).length;
  const fragType = items.length && corals === items.length ? 'coral' : corals === 0 && items.length ? 'plant' : 'mixed';
  const oneKind = new Set(items.map((f) => f.defId)).size === 1;
  const lead = defs[0];
  const species = oneKind && lead ? (fragType === 'coral' ? `${lead.name.replace(/ Colony$/, '').toLowerCase()} frags` : `${lead.name.toLowerCase()} cuttings`) : fragType === 'coral' ? 'coral frags' : fragType === 'plant' ? 'plant cuttings' : 'frags and cuttings';
  // lane:w2-ui — a frag pack reads "they" ([many] templates)
  const lot = fragType === 'coral' ? 'these frags' : fragType === 'plant' ? 'these cuttings' : 'these pieces';
  return { species, name: items.length === 1 ? 'this frag' : lot, morph: '', gallons: '', org: org ?? buyerName ?? '', scope: 'frag', fragType, ...(items.length > 1 ? { many: '1', lot } : {}) };
}

function orgOf(buyer: BuyerProfile | undefined): string | undefined {
  if (!buyer) return undefined;
  return buyer.name.includes(' (') ? buyer.name.split(' (')[0] : undefined;
}

/** The single path through which every sale happens (accept, accepted counter, buy-now). */
function completeSale(state: GameState, l: Listing, bid: Bid, price: number, via: 'accept' | 'counter' | 'buy_now', rng: Rng): ActionResult {
  const check = validateForSale(state, l);
  if (!check.ok) return fail(check.message);
  if (!Number.isFinite(price) || price <= 0) return fail('That offer is not valid.');
  const now = state.clock.hour;
  const buyer = state.market.buyers.find((b) => b.id === bid.buyerId);
  const buyerName = bid.buyerName ?? buyer?.name ?? 'A buyer';
  const archetype = bid.archetype ?? buyer?.archetype ?? 'experienced_keeper';
  const assessment = assessSale(state, l, check.creatures, check.tank);
  const beauty = check.tank ? finite(check.tank.cache?.beauty, 0) : 0;
  const welfare = check.tank ? finite(check.tank.cache?.welfare, 0) : 0;
  const showpiece = !!check.tank && beauty >= 75 && welfare >= 80 && compatRank(check.tank.cache?.compatVerdict) <= 1 && assessment.kind === 'good';

  // 1. Money.
  earn(state, roundCents(price), l.kind === 'tank' ? 'tank_sale' : 'livestock_sale', `Sold "${l.title}" to ${buyerName}`);

  // 2. Unlisted animals stay with the player.
  for (const r of check.relocations) {
    const to = state.tanks[r.toTankId];
    r.c.tankId = r.toTankId;
    touchResidents(); // lane:perf2 — a move-in: drop the step's residents index
    // A brood carried by the animal (seahorse pouch, berried shrimp) moves with it.
    for (const cl of Object.values(state.clutches)) {
      if (cl.guardedById === r.c.id && (cl.stage === 'in_pouch' || (cl.visual === 'berried' && cl.stage === 'eggs'))) cl.tankId = r.toTankId;
    }
    pushCapped(r.c.history, { hour: now, kind: 'moved', text: `Moved to ${to?.name ?? 'another tank'} — not part of the sale of ${check.tank?.name ?? 'its tank'}.` }, 40);
    // Say where they went (S03-04): the log entry opens the animal, and a risky mix is called out.
    emitEvent(state, {
      kind: r.risky ? 'warning' : 'info',
      text: `${r.c.name} wasn't part of the sale and now lives in ${to?.name ?? 'another tank'}.${r.risky ? ` It's a risky mix there — the only tank that would do. Find ${r.c.name} a better home soon.` : ''}`,
      creatureId: r.c.id,
      tankId: r.toTankId,
      toast: true,
    });
  }

  // 3. Exactly the listed contents leave.
  for (const c of check.creatures) {
    c.status = 'sold';
    c.tankId = null;
    pushCapped(c.history, { hour: now, kind: 'sold', text: `Sold to ${buyerWithRole(buyerName, archetype)} for ${fmtMoney(price)}.` }, 40);
  }
  const soldTankName = check.tank?.name;
  if (check.tank) {
    const soldTankId = check.tank.id;
    // Equipment and decor added AFTER listing aren't part of the sale (the listing preview promises this): they go
    // back into storage. The snapshot signature records the instance ids that were listed.
    const listed = listedItemIds(l.snapshot.signature);
    if (listed) {
      const keptNames: string[] = [];
      const eqKeep = check.tank.equipment.filter((e) => !listed.has(e.id));
      const decKeep = check.tank.decor.filter((d) => !listed.has(d.id));
      for (const e of eqKeep) {
        state.inventory.equipment.push({ ...clonePlain(e), on: false });
        keptNames.push(getEquipmentDef(e.defId)?.name ?? 'equipment');
      }
      for (const d of decKeep) {
        if (d.frag && d.frag.grownHour === undefined) (state.inventory.frags ??= []).push({ ...clonePlain(d), x: 0, y: 0, z: 0 }); // lane:frags
        else state.inventory.decor.push({ ...clonePlain(d), x: 0, y: 0, z: 0 });
        keptNames.push(getDecorDef(d.defId)?.name ?? 'decor');
      }
      check.tank.equipment = check.tank.equipment.filter((e) => listed.has(e.id));
      check.tank.decor = check.tank.decor.filter((d) => listed.has(d.id));
      if (keptNames.length) emitEvent(state, { kind: 'info', text: `You kept what you added after listing ${check.tank.name}: ${keptNames.join(', ')}. ${keptNames.length === 1 ? 'It’s' : 'They’re'} in storage.` });
    }
    // Eggs and fry are in the water — they travel with the aquarium to its new owner (never silently deleted).
    const broods = Object.values(state.clutches).filter((cl) => cl.tankId === soldTankId && cl.count > 0);
    if (broods.length) {
      const young = broods.reduce((a, cl) => a + cl.count, 0);
      emitEvent(state, { kind: 'info', text: `The ${young.toLocaleString('en-US')} ${broods.every((cl) => cl.stage === 'eggs') ? 'eggs' : 'young'} in ${check.tank.name} went with the aquarium to ${buyerName}.` });
    }
    delete check.tank.listingId;
    deleteTank(state, soldTankId);
    // Safety net: nothing may keep pointing at a tank that no longer exists.
    for (const c of Object.values(state.creatures)) {
      if (c.tankId === soldTankId && (c.status === 'alive' || c.status === 'listed')) {
        c.tankId = null;
        if (c.status === 'listed' && !state.market.listings.some((x) => x.status === 'active' && x.creatureIds.includes(c.id))) c.status = 'alive';
        emitEvent(state, { kind: 'warning', text: `${c.name} was not part of the sale and is waiting in a holding container. Give ${c.name} a tank soon.`, creatureId: c.id, toast: true });
      }
    }
  }

  // 4. Listing + bids.
  bid.status = 'accepted';
  if (via === 'counter') bid.amount = Math.round(price);
  l.status = 'sold';
  l.closedHour = state.clock.hour;
  l.soldTo = bid.buyerId;
  l.soldFor = roundCents(price);
  l.outcome = `Sold to ${buyerName} for ${fmtMoney(price)}${via === 'buy_now' ? ' (buy-now)' : via === 'counter' ? ' (they accepted your counter)' : ''}.`;
  for (const other of l.bids) {
    if (other !== bid && (other.status === 'open' || other.status === 'countered')) {
      other.status = 'declined';
      other.note = 'Sold to another buyer.';
    }
  }
  pushCapped(state.market.history, { hour: now, kind: l.kind, title: l.title, price: roundCents(price), buyer: buyerName }, HISTORY_CAP);

  // 5. Reputation, mastery, counters.
  let rep: number;
  if (assessment.kind === 'good') rep = (l.kind === 'tank' ? 6 + Math.min(30, price / 150) : l.kind === 'frag' ? 0.5 + Math.min(4, price / 80) : 2 + Math.min(20, price / 60)) + (showpiece ? 5 : 0);
  else rep = -assessment.penalty;
  addReputation(state, Math.round(rep * 10) / 10, assessment.kind === 'good' ? `Sold "${l.title}"` : `Buyer unhappy with "${l.title}"`);
  addMastery(state, 'business', Math.round(l.kind === 'frag' ? 2 + Math.min(30, price / 25) : 5 + Math.min(150, price / 20)));
  if (l.kind === 'frag') {
    // lane:frags
    const items = l.fragItems ?? [];
    const corals = items.filter((f) => isCoralDef(getDecorDef(f.defId))).length;
    addMastery(state, corals * 2 >= items.length ? 'marine' : 'aquascaping', 2 + items.length);
    bumpCounter(state, 'fragsSold', items.length);
  }
  bumpCounter(state, 'sales');
  if (l.kind === 'tank') bumpCounter(state, 'tankSales');
  bumpCounter(state, 'animalsSold', check.creatures.length);
  bumpCounter(state, 'salesRevenue', Math.round(price));
  if (buyer) {
    buyer.reputationWithPlayer = clamp(buyer.reputationWithPlayer + (assessment.kind === 'good' ? 0.1 : assessment.kind === 'unhealthy' ? -0.2 : -0.5), -1, 1);
    buyer.budget = Math.max(BUYER_ARCHETYPES[buyer.archetype]?.budget[0] ?? 50, Math.round(buyer.budget * 0.85));
  }

  // 6. Events + feedback. lane:w2-sim — a happy buyer's note rides on the "Sold!" entry (one log line per sale, not two).
  const vars = msgVars(state, l, buyerName, orgOf(buyer));
  const thanks = assessment.kind === 'good' ? ` ${buyerName}: "${saleFeedback(rng, archetype, 'good', vars)}"` : '';
  emitEvent(state, {
    kind: 'celebrate',
    text: `Sold! "${l.title}" went to ${buyerWithRole(buyerName, archetype)} for ${fmtMoney(price)}.${showpiece ? ' A showpiece sale — your reputation grows.' : ''}${thanks}`,
    listingId: l.id,
    toast: true,
  });
  if (assessment.kind !== 'good') {
    emitEvent(state, {
      kind: 'warning',
      text: `${buyerName}: "${saleFeedback(rng, archetype, assessment.kind, vars)}" (${assessment.details.join('; ') || 'the setup was not in good shape'}). Reputation −${assessment.penalty}.`,
      listingId: l.id,
      toast: true,
    });
  }
  if (check.tank && state.tankOrder.length === 0) {
    const tiers = TANK_TIERS.filter((t) => isUnlocked(state, t.unlock));
    const cheap = tiers.sort((a, b) => a.price - b.price)[0];
    emitEvent(state, {
      kind: 'info',
      text: `${soldTankName ?? 'Your last aquarium'} has gone to its new home. You have ${fmtMoney(state.finance.money)} and an empty room — ${cheap ? `a ${cheap.name} kit starts at about ${fmtMoney(cheap.price)}. ` : ''}Tip: start the next tank early, because new tanks need time to cycle before animals move in.`,
      toast: true,
    });
  }
  return { ok: true, message: `Sold "${l.title}" to ${buyerName} for ${fmtMoney(price)}.` };
}

/**
 * "Maya Chen (Collector)" — but an organisation buyer already carries its contact in brackets, so
 * "Coldwater Amphibian Circle (Jonah Whitfield), a conservation-minded buyer" instead of two bracket pairs.
 */
function buyerWithRole(name: string, archetype: Parameters<typeof archetypeLabel>[0]): string {
  const role = archetypeLabel(archetype);
  if (!/\)\s*$/.test(name)) return `${name} (${role})`;
  const lower = role.charAt(0).toLowerCase() + role.slice(1);
  return `${name}, ${/^[aeiou]/i.test(lower) ? 'an' : 'a'} ${lower},`;
}

/**
 * True when the tank's signature changed only by adding equipment/decor: the tier, water class, substrate and backdrop
 * are the same and every listed item is still installed (lane:fix-econ, S03-01).
 */
function onlyAdditions(listedSig: string, currentSig: string): boolean {
  const a = listedSig.split('|');
  const b = currentSig.split('|');
  if (a.length < 6 || b.length < 6) return false;
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return false;
  const now = listedItemIds(currentSig);
  const listed = listedItemIds(listedSig);
  if (!now || !listed) return false;
  for (const id of listed) if (!now.has(id)) return false;
  return true;
}

/** Equipment/decor instance ids recorded in a tank listing's signature (see tankSignature), or null if unknown. */
function listedItemIds(sig: string | undefined): Set<string> | null {
  if (!sig) return null;
  const parts = sig.split('|');
  if (parts.length < 6) return null;
  const ids = new Set<string>();
  for (const seg of [parts[4], parts[5]]) {
    for (const item of seg.split(',')) {
      const i = item.lastIndexOf(':');
      if (i > 0) ids.add(item.slice(i + 1));
    }
  }
  return ids;
}

// ───────────────────────────── player bid actions ─────────────────────────────

function statusMessage(l: Listing): string {
  switch (l.status) {
    case 'sold':
      return 'This listing has already sold.';
    case 'withdrawn':
      return 'This listing was withdrawn.';
    case 'expired':
      return 'This listing has ended.';
    case 'invalidated':
      return `This listing was cancelled${l.outcome ? `: ${l.outcome}` : '.'}`;
    default:
      return 'This listing is not active.';
  }
}

export function acceptBid(state: GameState, listingId: string, bidId: string): ActionResult {
  const l = state.market.listings.find((x) => x.id === listingId);
  if (!l) return fail('Listing not found.');
  if (l.status !== 'active') return fail(statusMessage(l));
  const b = l.bids.find((x) => x.id === bidId);
  if (!b) return fail('That offer could not be found.');
  if (b.status === 'countered') return fail(`Waiting for ${b.buyerName ?? 'the buyer'} to reply to your counter.`);
  if (b.status !== 'open') return fail(`That offer is no longer open (${b.status}).`);
  if (b.expiresHour <= state.clock.hour) {
    b.status = 'expired';
    return fail('That offer has just expired.');
  }
  // Re-check contents first: buyers re-evaluate after deaths, sickness or edits (no stale-bid exploits).
  const rng = simRng(state);
  const before = b.amount;
  if (!checkIntegrity(state, l, rng)) return fail(statusMessage(l));
  if (b.status !== 'open') return fail(`${b.buyerName ?? 'The buyer'} withdrew after the listing changed.`);
  if (b.amount !== before) return fail(`${b.buyerName ?? 'The buyer'} revised their offer to ${fmtMoney(b.amount)} after the listing changed. Review it again.`);
  return completeSale(state, l, b, b.amount, 'accept', rng);
}

export function declineBid(state: GameState, listingId: string, bidId: string): ActionResult {
  const l = state.market.listings.find((x) => x.id === listingId);
  if (!l) return fail('Listing not found.');
  if (l.status !== 'active') return fail(statusMessage(l));
  const b = l.bids.find((x) => x.id === bidId);
  if (!b) return fail('That offer could not be found.');
  if (b.status !== 'open' && b.status !== 'countered') return fail(`That offer is no longer open (${b.status}).`);
  b.status = 'declined';
  b.note = 'Declined by you.';
  delete b.holdUntilHour;
  delete b.holdStartHour;
  const buyer = state.market.buyers.find((x) => x.id === b.buyerId);
  if (buyer) buyer.reputationWithPlayer = clamp(buyer.reputationWithPlayer - 0.02, -1, 1);
  return { ok: true, message: `Declined ${b.buyerName ? `${b.buyerName.replace(/^The /, 'the ')}’s` : 'the'} offer of ${fmtMoney(b.amount)}.` }; // lane:qa-play: possessive
}

export function counterBid(state: GameState, listingId: string, bidId: string, amount: number): ActionResult {
  const l = state.market.listings.find((x) => x.id === listingId);
  if (!l) return fail('Listing not found.');
  if (l.status !== 'active') return fail(statusMessage(l));
  const b = l.bids.find((x) => x.id === bidId);
  if (!b) return fail('That offer could not be found.');
  if (b.status === 'countered') return fail(`You've already countered — waiting for ${b.buyerName ?? 'the buyer'}.`);
  if (b.status !== 'open') return fail(`That offer is no longer open (${b.status}).`);
  if (b.expiresHour <= state.clock.hour) {
    b.status = 'expired';
    return fail('That offer has just expired.');
  }
  const amt = Math.round(finite(amount, NaN));
  if (!Number.isFinite(amt) || amt <= 0) return fail('Enter a valid counter-offer.');
  if (amt <= b.amount) return fail('A counter should be higher than their offer — accept it instead.');
  if (l.buyNow && amt > l.buyNow) return fail(`Your buy-now price is ${fmtMoney(l.buyNow)} — counter at or below it.`);
  if (amt > b.amount * 5) return fail('That is more than five times their offer. Try something they might accept.');
  const rng = simRng(state);
  const buyer = state.market.buyers.find((x) => x.id === b.buyerId);
  const patience = finite(buyer?.patience, 0.5);
  b.status = 'countered';
  delete b.holdUntilHour;
  delete b.holdStartHour;
  b.counterAmount = amt;
  b.counterResponseHour = state.clock.hour + Math.max(0.5, rng.range(1, 3.5) * (1.3 - patience));
  delete b.response;
  const hrs = Math.max(1, Math.round(b.counterResponseHour - state.clock.hour));
  return { ok: true, message: `Counter of ${fmtMoney(amt)} sent to ${b.buyerName ?? 'the buyer'}. Expect a reply in about ${hrs} h.` };
}

/**
 * The player opened the counter-offer form: hold the offer for NEGOTIATION_HOLD_HOURS (≈ 2 real minutes at any speed)
 * so it can't expire or be withdrawn while they type. Safe to call repeatedly (e.g. on every form open); never
 * shortens. A form left open can't park a buyer forever: the hold is capped at MAX_NEGOTIATION_HOLD_HOURS in total
 * (S03-08), after which the offer runs out normally.
 */
export function holdBidForCounter(state: GameState, listingId: string, bidId: string): ActionResult {
  const l = state.market.listings.find((x) => x.id === listingId);
  if (!l) return fail('Listing not found.');
  if (l.status !== 'active') return fail(statusMessage(l));
  const b = l.bids.find((x) => x.id === bidId);
  if (!b) return fail('That offer could not be found.');
  if (b.status !== 'open') return fail(`That offer is no longer open (${b.status}).`);
  const now = state.clock.hour;
  if (b.expiresHour <= now) {
    b.status = 'expired';
    return fail('That offer has just expired.');
  }
  const k = marketTimeScale(state);
  // A new hold starts only after the offer has run unheld for a full window (the form was closed and reopened much
  // later); a form kept open can't chain holds, because the capped hold expires the offer with it.
  if (b.holdStartHour === undefined || now - (b.holdUntilHour ?? -Infinity) >= NEGOTIATION_HOLD_HOURS * k) b.holdStartHour = now;
  const cap = b.holdStartHour + MAX_NEGOTIATION_HOLD_HOURS * k;
  const until = Math.min(cap, now + NEGOTIATION_HOLD_HOURS * k);
  b.holdUntilHour = Math.max(b.holdUntilHour ?? 0, until);
  b.expiresHour = Math.max(b.expiresHour, b.holdUntilHour);
  if (until <= now) return { ok: true, message: `${b.buyerName ?? 'The buyer'} has waited a while already — send your counter soon.` };
  return { ok: true, message: `${b.buyerName ?? 'The buyer'} will wait while you write your counter-offer.` };
}

// ───────────────────────────── counter suggestion (lane:fix-econ, S03-03) ─────────────────────────────

export interface CounterSuggestion {
  /** A counter most buyers of this kind can still say yes to (above their offer, never above buy-now). */
  amount: number;
  /** One line on how buyers tend to answer a counter. */
  hint: string;
}

/**
 * The number the counter form pre-fills. A buyer opens at a share of their private ceiling (BUYER_ARCHETYPES.opening),
 * so asking for their offer ÷ (three quarters of the way up that range) leaves ~3 in 4 able to accept outright; over
 * ~15% above their ceiling most walk. A buyer who has already replied to a counter is sitting near their ceiling.
 */
export function suggestCounter(l: Listing, b: Bid): CounterSuggestion {
  const archetype = b.archetype ?? 'experienced_keeper';
  const [lo, hi] = BUYER_ARCHETYPES[archetype]?.opening ?? [0.82, 0.95];
  const max = l.buyNow && l.buyNow > 0 ? l.buyNow : b.amount * 5;
  let k: number;
  let hint: string;
  if (b.response !== undefined) {
    k = 1.03;
    hint = `${b.buyerName ?? 'This buyer'} has already moved once — a small step, or accepting, is the safe play.`;
  } else {
    k = 1 / (lo + 0.75 * (hi - lo));
    hint = archetype === 'bargain_hunter' ? 'Bargain hunters open low: there is room to ask for more, but they rarely pay full value.' : 'Most buyers meet a counter within about 10% of their offer; ask 15% more and they tend to walk.';
  }
  const amount = Math.min(Math.max(nicePrice(b.amount * k), Math.round(b.amount) + 1), Math.max(Math.round(b.amount) + 1, Math.floor(max)));
  return { amount, hint };
}

// ───────────────────────────── quick sale ─────────────────────────────

/** Instant low-price sale to the local fish store (no auction). */
export function quickSell(state: GameState, creatureIds: string[]): ActionResult {
  const q = quickSellQuote(state, creatureIds);
  if (!q.ok) return fail(q.message);
  const now = state.clock.hour;
  const sold = q.perCreature.map((p) => state.creatures[p.id]);
  const sick = sold.filter((c) => c.illness || (c.stats?.health ?? 100) < 45).length;
  for (const p of q.perCreature) {
    const c = state.creatures[p.id];
    c.status = 'sold';
    c.tankId = null;
    pushCapped(c.history, { hour: now, kind: 'sold', text: `Sold to ${LOCAL_FISH_STORE} for ${fmtMoney(p.offer)}.` }, 40);
  }
  const names = sold.length <= 3 ? sold.map((c) => c.name).join(', ') : `${sold.length} animals`;
  earn(state, q.total, 'livestock_sale', `Quick sale to ${LOCAL_FISH_STORE}: ${names}`);
  pushCapped(state.market.history, { hour: now, kind: sold.length > 1 ? 'group' : 'creature', title: `Quick sale: ${names}`, price: q.total, buyer: LOCAL_FISH_STORE }, HISTORY_CAP);
  bumpCounter(state, 'sales');
  bumpCounter(state, 'quickSales');
  bumpCounter(state, 'animalsSold', sold.length);
  bumpCounter(state, 'salesRevenue', Math.round(q.total));
  addMastery(state, 'business', 2);
  if (sick > 0) addReputation(state, -2 * sick, 'Sold unwell animals to the local store');
  emitEvent(state, { kind: 'info', text: `${LOCAL_FISH_STORE} bought ${names} for ${fmtMoney(q.total)}.${sick ? ' They noted the animals were unwell.' : ''}` });
  return { ok: true, message: `Sold ${names} to ${LOCAL_FISH_STORE} for ${fmtMoney(q.total)}.` };
}

// ───────────────────────────── simulation ─────────────────────────────

function invalidate(state: GameState, l: Listing, text: string, advice: string): void {
  l.status = 'invalidated';
  l.closedHour = state.clock.hour;
  l.outcome = text;
  l.advice = advice;
  restoreContents(state, l);
  closeOpenBids(l, 'withdrawn', 'Listing cancelled.');
  emitEvent(state, { kind: 'warning', text, listingId: l.id, toast: true });
}

/**
 * Re-value the listing and move open bids with it; some buyers may withdraw. Every reason to re-price is bad news
 * (a loss, an illness, a layout change, a water crash), so offers only ever move down — a bid never ratchets up
 * because the seller changed the tank after listing (lane:fix-econ, S03-01).
 */
function repriceBids(state: GameState, l: Listing, rng: Rng, reason: string, withdrawChance: number, withdrawReason: 'changed' | 'water' | 'sick', extraMult = 1): void {
  const newVal = currentValuation(state, l);
  const ref = finite(l.lastValuation ?? l.snapshot.valuation, 0);
  const ratio = ref > 0 ? clamp((newVal / ref) * extraMult, 0.2, 1) : Math.min(1, extraMult);
  l.lastValuation = ref > 0 ? Math.min(newVal, ref) : newVal;
  for (const b of l.bids) {
    if (b.status !== 'open' && b.status !== 'countered') continue;
    const buyer = state.market.buyers.find((x) => x.id === b.buyerId);
    const archetype = b.archetype ?? buyer?.archetype ?? 'experienced_keeper';
    const sensitive = archetype === 'public_aquarium' || archetype === 'conservation' ? 1.4 : archetype === 'bargain_hunter' ? 0.6 : 1;
    if (rng.chance(clamp01(withdrawChance * sensitive))) {
      b.status = 'withdrawn';
      b.note = withdrawMessage(rng, archetype, withdrawReason, msgVars(state, l, b.buyerName, orgOf(buyer)));
      continue;
    }
    if (ratio < 0.99) {
      b.amount = Math.max(1, nicePrice(b.amount * ratio));
      b.ceiling = Math.max(b.amount, nicePrice(finite(b.ceiling ?? b.amount, b.amount) * ratio));
      b.note = `Revised down after ${reason}.`;
    }
  }
}

function markChanged(l: Listing, text: string): void {
  l.changedSinceListing = l.changedSinceListing && !l.changedSinceListing.includes(text) ? `${l.changedSinceListing} ${text}` : text;
}

/** Detect deaths, sickness, removals and tank edits. Returns false if the listing was invalidated. */
function checkIntegrity(state: GameState, l: Listing, rng: Rng): boolean {
  const has = (k: string) => (l.alerts ?? []).includes(k);
  const addAlert = (k: string) => {
    (l.alerts ??= []).push(k);
  };
  const removeAlert = (k: string) => {
    l.alerts = (l.alerts ?? []).filter((x) => x !== k);
  };
  const isTank = l.kind === 'tank';
  const tank = isTank && l.tankId ? state.tanks[l.tankId] : undefined;
  if (isTank && !tank) {
    invalidate(state, l, `"${l.title}" was cancelled because the aquarium no longer exists.`, 'List aquariums only while they are set up.');
    return false;
  }
  const died: string[] = [];
  const removed: string[] = [];
  const sickNow: Creature[] = [];
  for (const id of [...l.creatureIds]) {
    const c = state.creatures[id];
    if (!c || c.status === 'dead') {
      died.push(c?.name ?? 'An animal');
      if (c) addAlert(`dead:${id}`);
      l.creatureIds = l.creatureIds.filter((x) => x !== id);
      continue;
    }
    if (c.status === 'sold') {
      removed.push(c.name);
      l.creatureIds = l.creatureIds.filter((x) => x !== id);
      continue;
    }
    if (isTank && c.tankId !== l.tankId) {
      removed.push(c.name);
      if (c.status === 'listed') c.status = 'alive';
      l.creatureIds = l.creatureIds.filter((x) => x !== id);
      continue;
    }
    if (c.status === 'alive') c.status = 'listed';
    const unwell = !!c.illness || finite(c.stats?.health, 100) < 45;
    if (unwell && !has(`sick:${id}`)) {
      addAlert(`sick:${id}`);
      sickNow.push(c);
    } else if (!unwell && has(`sick:${id}`) && finite(c.stats?.health, 100) >= 70) {
      removeAlert(`sick:${id}`);
    }
  }

  if (died.length || removed.length) {
    const minCount = l.kind === 'group' ? 2 : 1;
    const essential = l.kind === 'creature' || l.kind === 'pair' || (l.kind !== 'tank' && l.creatureIds.length < minCount);
    if (essential && died.length) {
      invalidate(state, l, `${died.join(', ')} died while listed. "${l.title}" was cancelled and buyers were notified.`, 'Losses happen. Check the tank’s water and compatibility report before listing again.');
      return false;
    }
    if (essential) {
      invalidate(state, l, `"${l.title}" was cancelled because ${removed.join(', ')} ${removed.length === 1 ? 'is' : 'are'} no longer part of it.`, 'Keep listed animals in place until the sale completes.');
      return false;
    }
    const text = died.length ? `${died.join(', ')} died after listing.` : `${removed.join(', ')} ${removed.length === 1 ? 'was' : 'were'} moved out after listing.`;
    markChanged(l, text);
    repriceBids(state, l, rng, died.length ? 'the loss' : 'the change', 0.25, 'changed');
    emitEvent(state, { kind: 'warning', text: `"${l.title}": ${text} Buyers re-evaluated their offers.`, listingId: l.id, toast: true });
  }

  if (sickNow.length) {
    const names = sickNow.map((c) => c.name).join(', ');
    markChanged(l, `${names} fell ill after listing.`);
    repriceBids(state, l, rng, 'hearing about the illness', 0.3, 'sick');
    emitEvent(state, { kind: 'warning', text: `${names} ${sickNow.length === 1 ? 'is' : 'are'} unwell. Buyers of "${l.title}" were told and revised their offers.`, listingId: l.id, creatureId: sickNow[0].id, toast: true });
  }

  if (tank) {
    const extras = creaturesInTank(state, tank.id).filter((c) => !l.creatureIds.includes(c.id) && !has(`added:${c.id}`));
    if (extras.length) {
      for (const c of extras) addAlert(`added:${c.id}`);
      const names = extras.map((c) => c.name).join(', ');
      markChanged(l, `${names} joined the tank after listing (not part of the sale).`);
      emitEvent(state, { kind: 'info', text: `${names} ${extras.length === 1 ? 'is' : 'are'} in "${tank.name}" but not part of its listing — they'll be moved to another tank if it sells.`, listingId: l.id, tankId: tank.id });
    }
    // Can a buyer actually complete this sale? Only unlisted residents can block it (S03-07): warn while they do.
    const unlisted = creaturesInTank(state, tank.id).some((c) => !l.creatureIds.includes(c.id));
    if (unlisted || l.blocked) {
      const check = unlisted ? validateForSale(state, l) : null;
      if (check && !check.ok) {
        if (!l.blocked) emitEvent(state, { kind: 'warning', text: `No buyer can complete "${l.title}" right now: ${check.message}`, listingId: l.id, tankId: tank.id, toast: true });
        l.blocked = check.message;
      } else if (l.blocked) {
        delete l.blocked;
        emitEvent(state, { kind: 'info', text: `"${l.title}" can sell again — every animal that isn't part of the sale has somewhere to go.`, listingId: l.id, tankId: tank.id });
      }
    }
    const sig = tankSignature(tank);
    if (l.snapshot.signature && sig !== l.snapshot.signature && !has(`sig:${sig}`)) {
      addAlert(`sig:${sig}`);
      if (onlyAdditions(l.snapshot.signature, sig)) {
        // Gear or decor added after listing stays with the seller (completeSale hands it back), so buyers price the
        // listing exactly as before: no re-pricing, no change of heart (lane:fix-econ, S03-01).
        emitEvent(state, { kind: 'info', text: `What you added to "${tank.name}" after listing it isn't part of the sale — it goes back to storage if the tank sells. Offers are unchanged.`, listingId: l.id, tankId: tank.id });
      } else {
        markChanged(l, 'The aquascape or equipment changed after listing.');
        repriceBids(state, l, rng, 'the layout change', 0.35, 'changed');
        emitEvent(state, { kind: 'market', text: `You changed "${tank.name}" after listing it. Buyers re-evaluated — some withdrew.`, listingId: l.id, tankId: tank.id });
      }
    }
    const status = tank.cache?.waterStatus ?? tank.cache?.status;
    if (status === 'danger' && l.snapshot.waterStatus !== 'danger' && !has('water')) {
      addAlert('water');
      markChanged(l, 'Water quality crashed after listing.');
      repriceBids(state, l, rng, 'the water problems', 0.4, 'water', 0.85);
      emitEvent(state, { kind: 'warning', text: `Water quality in "${tank.name}" crashed while it's listed. Buyers noticed — fix the water to protect the sale.`, listingId: l.id, tankId: tank.id, toast: true });
    } else if (status === 'good' && has('water')) {
      removeAlert('water');
    }
  }
  return true;
}

function resolveCounters(state: GameState, l: Listing, rng: Rng, end: number): void {
  for (const b of l.bids) {
    if (l.status !== 'active') return;
    if (b.status !== 'countered' || b.counterResponseHour === undefined || b.counterResponseHour > end) continue;
    const buyer = state.market.buyers.find((x) => x.id === b.buyerId);
    const archetype = b.archetype ?? buyer?.archetype ?? 'experienced_keeper';
    const patience = finite(buyer?.patience, 0.5);
    const ceiling = Math.max(b.amount, finite(b.ceiling ?? b.amount * 1.1, b.amount));
    const counter = finite(b.counterAmount ?? b.amount, b.amount);
    const gap = (counter - ceiling) / Math.max(1, ceiling);
    const bargain = archetype === 'bargain_hunter';
    const acceptAdj = bargain ? -0.15 : archetype === 'collector' || archetype === 'public_aquarium' ? 0.05 : 0;
    let outcome: CounterOutcome;
    if (gap <= 0) {
      outcome = rng.chance(clamp(0.78 + 0.18 * patience + acceptAdj, 0.4, 0.97)) ? 'accept' : 'split';
    } else if (gap <= 0.15) {
      const r = rng.next();
      const pSplit = clamp(0.5 + 0.35 * patience - gap * 2 - (bargain ? 0.1 : 0), 0.15, 0.85);
      const pHold = 0.25;
      outcome = r < pSplit ? 'split' : r < pSplit + pHold ? 'hold' : 'walk';
    } else {
      outcome = rng.chance(clamp(0.3 * patience + (archetype === 'public_aquarium' ? 0.1 : 0) - (bargain ? 0.1 : 0), 0.02, 0.5)) ? 'hold' : 'walk';
    }
    const vars = msgVars(state, l, b.buyerName, orgOf(buyer));
    delete b.counterResponseHour;
    if (outcome === 'accept') {
      b.response = counterReply(rng, archetype, 'accept', { ...vars, counter: fmtMoney(counter), amount: fmtMoney(counter) });
      b.status = 'open';
      const res = completeSale(state, l, b, counter, 'counter', rng);
      if (!res.ok) {
        b.status = 'withdrawn';
        b.note = `${b.buyerName ?? 'The buyer'} agreed, but the sale could not complete: ${res.message}`;
        emitEvent(state, { kind: 'warning', text: b.note, listingId: l.id, toast: true });
      }
      return;
    }
    if (outcome === 'split') {
      const mid = nicePrice(Math.min(ceiling * 1.03, (b.amount + counter) / 2));
      b.amount = Math.max(b.amount + 1, Math.min(mid, counter));
      b.status = 'open';
      // The counter-offer stays open long enough to read and answer (≥ ~2 real minutes at any speed).
      b.expiresHour = end + COUNTER_REPLY_OPEN_HOURS * marketTimeScale(state) + rng.range(0, 12) * patience;
      b.response = counterReply(rng, archetype, 'split', { ...vars, amount: fmtMoney(b.amount), counter: fmtMoney(counter) });
      emitEvent(state, { kind: 'market', text: `${b.buyerName ?? 'A buyer'} replied to your counter on "${l.title}": "${b.response}"`, listingId: l.id, toast: true });
    } else if (outcome === 'hold') {
      b.status = 'open';
      b.expiresHour = Math.max(b.expiresHour, end + COUNTER_REPLY_OPEN_HOURS * marketTimeScale(state));
      b.response = counterReply(rng, archetype, 'hold', { ...vars, amount: fmtMoney(b.amount), counter: fmtMoney(counter) });
      emitEvent(state, { kind: 'market', text: `${b.buyerName ?? 'A buyer'} replied to your counter on "${l.title}": "${b.response}"`, listingId: l.id, toast: true });
    } else {
      b.status = 'withdrawn';
      b.response = counterReply(rng, archetype, 'walk', { ...vars, amount: fmtMoney(b.amount), counter: fmtMoney(counter) });
      if (buyer) buyer.reputationWithPlayer = clamp(buyer.reputationWithPlayer - 0.03, -1, 1);
      emitEvent(state, { kind: 'market', text: `${b.buyerName ?? 'A buyer'} walked away from "${l.title}": "${b.response}"`, listingId: l.id, toast: true });
    }
  }
}

function bestOpen(l: Listing): Bid | undefined {
  let best: Bid | undefined;
  for (const b of l.bids) if (b.status === 'open' && (!best || b.amount > best.amount)) best = b;
  return best;
}

export function bestOpenBid(l: Listing): Bid | undefined {
  return bestOpen(l);
}

function expireAndDrift(state: GameState, l: Listing, rng: Rng, dt: number, end: number): void {
  const best = bestOpen(l);
  for (const b of l.bids) {
    if (b.status !== 'open') continue;
    if (b.expiresHour <= end) {
      b.status = 'expired';
      b.note = 'The buyer moved on.';
      if (b === best) emitEvent(state, { kind: 'market', text: `${b.buyerName ?? 'A buyer'}'s ${fmtMoney(b.amount)} offer on "${l.title}" expired.`, listingId: l.id });
      continue;
    }
    // The player is writing a counter-offer: the buyer waits (no change of heart mid-negotiation).
    if (b.holdUntilHour !== undefined && b.holdUntilHour > end) continue;
    // Buyers occasionally change their minds (waiting is never risk-free) — per real second, so 10× is no riskier.
    const buyer = state.market.buyers.find((x) => x.id === b.buyerId);
    const hazard = (0.015 * (1 - finite(buyer?.patience, 0.5))) / marketTimeScale(state);
    if (rng.chance(1 - Math.exp(-hazard * dt))) {
      b.status = 'withdrawn';
      b.note = withdrawMessage(rng, b.archetype ?? buyer?.archetype ?? 'experienced_keeper', 'lost_interest', msgVars(state, l, b.buyerName, orgOf(buyer)));
    }
  }
}

function avgDemand(state: GameState, l: Listing): number {
  const ids = l.snapshot.speciesIds?.length ? l.snapshot.speciesIds : [];
  if (!ids.length) return 1;
  return ids.reduce((a, id) => a + finite(state.market.demand?.[id] ?? 1, 1), 0) / ids.length;
}

function updateInterest(state: GameState, l: Listing, rng: Rng, dt: number, end: number): void {
  const age = Math.max(0, end - l.createdHour);
  const appeal = finite(l.appeal ?? 0.5, 0.5);
  const fresh = 0.55 + 0.45 * Math.exp(-age / 18);
  const ending = end < l.endsHour && l.endsHour - end < 6 ? 0.1 : 0;
  const val = finite(l.lastValuation ?? l.snapshot.valuation, 1);
  const reservePen = val > 0 && l.reserve > val * 1.1 ? clamp(1 - (l.reserve / val - 1.1) * 0.8, 0.35, 1) : 1;
  const target = clamp01(appeal * fresh * Math.pow(avgDemand(state, l), 0.7) * repFactor(state) * reservePen * (l.changedSinceListing ? 0.85 : 1) + ending);
  const k = 1 - Math.exp(-dt / 5);
  l.interest = clamp(finite(l.interest, 0.3) + (target - finite(l.interest, 0.3)) * k + rng.gauss() * 0.015 * Math.sqrt(Math.max(0, dt)), 0.02, 1);
}

function arrivals(state: GameState, l: Listing, rng: Rng, dt: number, end: number, force = false): void {
  const hod = hourOfDay(end);
  const activity = hod < 7 ? 0.2 : hod < 9 ? 0.6 : hod < 21 ? 1 : 0.55;
  const base = l.kind === 'tank' ? 0.42 : 0.55;
  const lambda = base * (0.35 + l.interest) * activity * repFactor(state) * (DEPTH[state.facility.level] ?? 1);
  if (!force && !rng.chance(1 - Math.exp(-lambda * dt))) return;

  const creatures = listingCreatures(state, l);
  const tank = l.kind === 'tank' && l.tankId ? state.tanks[l.tankId] : undefined;
  const isFrag = l.kind === 'frag'; // lane:frags
  if (isFrag ? !l.fragItems?.length : l.kind !== 'tank' && creatures.length === 0) return;
  const profile = isFrag ? buildFragProfile(state, l.fragItems!) : buildProfile(state, l.kind, creatures, tank);
  const value = currentValuation(state, l) * (l.changedSinceListing ? 0.96 : 1);
  if (!(value > 0)) return;

  const cooldown = new Set(l.bids.filter((b) => b.status === 'open' || b.status === 'countered' || (b.status === 'declined' && end - b.createdHour < 10) || (b.status === 'withdrawn' && end - b.createdHour < 16)).map((b) => b.buyerId));
  const delegation = maybeDelegation(state, rng, value, l.kind);
  const candidates = delegation ? [delegation] : state.market.buyers.filter((b) => !cooldown.has(b.id));
  if (!candidates.length) return;
  const fits = new Map(candidates.map((b) => [b.id, buyerFit(b, profile)]));
  const buyer = rng.weighted(candidates, (b) => buyerInterestWeight(b, profile, fits.get(b.id)!.fit, value));
  const fr = fits.get(buyer.id)!;
  if (buyerInterestWeight(buyer, profile, fr.fit, value) <= 0) return;
  const def = BUYER_ARCHETYPES[buyer.archetype];

  // Private value: fit × noise × timing. No upward drift with waiting: late bids skew slightly lower,
  // with an occasional eager late bidder.
  const age = Math.max(0, end - l.createdHour);
  const dur = Math.max(1, l.endsHour - l.createdHour);
  const stale = clamp01(age / dur - 0.4);
  const timing = rng.chance(0.08) ? rng.range(1.05, 1.15) : 1 - 0.12 * stale * rng.next();
  let W = value * fr.fit * Math.exp(rng.gauss() * 0.11) * timing;
  let capped = false;
  if (W > buyer.budget) {
    W = buyer.budget;
    capped = true;
  }
  let amount = W * rng.range(def?.opening[0] ?? 0.8, def?.opening[1] ?? 0.95);
  const overBudget = capped && amount >= buyer.budget * 0.9;
  if (amount < value * 0.28) return; // not a serious offer

  const vars = msgVars(state, l, buyer.name, orgOf(buyer));
  const now = state.clock.hour;
  // Buy-now: a buyer whose private value clears the buy-now price just takes it.
  if (l.buyNow && W >= l.buyNow && buyer.budget >= l.buyNow) {
    const bid: Bid = {
      id: nextId(state, 'bid'),
      buyerId: buyer.id,
      amount: l.buyNow,
      message: buyNowMessage(rng, buyer.archetype, vars),
      createdHour: now,
      expiresHour: now + 1,
      status: 'open',
      buyerName: buyer.name,
      archetype: buyer.archetype,
      ceiling: Math.round(W),
    };
    l.bids.push(bid);
    const res = completeSale(state, l, bid, l.buyNow, 'buy_now', rng);
    if (!res.ok) {
      bid.status = 'withdrawn';
      bid.note = `Tried to buy now, but: ${res.message}`;
      // The sale is stuck, not the buyer: say so once, loudly (S03-07). checkIntegrity keeps l.blocked current.
      if (!l.blocked) emitEvent(state, { kind: 'warning', text: `${buyer.name} tried to buy "${l.title}" now, but ${res.message}`, listingId: l.id, tankId: l.tankId, toast: true });
      l.blocked = res.message;
    }
    return;
  }

  amount = Math.max(1, nicePrice(amount));
  const ceiling = Math.max(amount, nicePrice(W));
  const message = composeBidMessage(rng, {
    archetype: buyer.archetype,
    isTank: !!tank,
    isFrag,
    likes: fr.likes,
    concerns: fr.concerns,
    indifferent: fr.indifferent,
    favourite: fr.favourite,
    stale: stale > 0.3,
    changed: !!l.changedSinceListing,
    overBudget,
    vars,
  });
  const patience = finite(buyer.patience, 0.5);
  const bid: Bid = {
    id: nextId(state, 'bid'),
    buyerId: buyer.id,
    amount,
    message,
    createdHour: now,
    // At least ~3 real minutes at any speed (a patient buyer ~6): long enough to read, compare and counter.
    expiresHour: now + (BID_MIN_OPEN_HOURS + (BID_MAX_OPEN_HOURS - BID_MIN_OPEN_HOURS) * patience) * rng.range(0.95, 1.1) * marketTimeScale(state),
    status: 'open',
    buyerName: buyer.name,
    archetype: buyer.archetype,
    ceiling,
  };
  const prevBest = bestOpen(l);
  if (amount < l.reserve) {
    bid.status = 'declined';
    bid.note = `Below your reserve of ${fmtMoney(l.reserve)} — declined automatically.`;
  } else {
    l.interest = clamp(l.interest + 0.04, 0.02, 1);
    // Only the new best offer is logged/toasted (the listing card shows every bid) — keeps the shared log readable.
    if (!prevBest || amount > prevBest.amount) {
      emitEvent(state, { kind: 'market', text: `${buyerWithRole(buyer.name, buyer.archetype)} offered ${fmtMoney(amount)} for "${l.title}".`, listingId: l.id, toast: true });
    }
  }
  l.bids.push(bid);
  if (l.bids.length > BIDS_CAP) {
    const idx = l.bids.findIndex((b) => b.status !== 'open' && b.status !== 'countered');
    if (idx >= 0) l.bids.splice(idx, 1);
  }
}

function expireListing(state: GameState, l: Listing): void {
  l.status = 'expired';
  l.closedHour = state.clock.hour;
  restoreContents(state, l);
  const received = l.bids.length;
  const belowReserve = l.bids.filter((b) => b.note?.startsWith('Below your reserve'));
  const demand = avgDemand(state, l);
  const sid = l.snapshot.speciesIds?.[0];
  let advice: string;
  if (received === 0) {
    const tips = [l.reserve > 0 ? 'a lower reserve' : '', 'a longer listing', l.snapshot.photo ? '' : 'a listing photo', demand < 0.95 && sid ? `waiting until demand for ${speciesPlural(sid)} recovers (now ${demand.toFixed(2)}×)` : '', l.snapshot.beautyScore < 50 && l.kind === 'tank' ? 'improving the aquascape first' : '']
      .filter(Boolean)
      .join(', ');
    advice = `No bids arrived. Try ${tips || 'listing again when buyers are more active'}.`;
  } else if (belowReserve.length === received) {
    const top = Math.max(...belowReserve.map((b) => b.amount));
    advice = `${received} offer${received === 1 ? ' was' : 's were'} below your reserve (best ${fmtMoney(top)}). A reserve near ${fmtMoney(nicePrice(top * 1.02))} would likely sell.`;
  } else if (l.blocked) {
    advice = `The sale was blocked: ${l.blocked}`;
  } else {
    advice = 'Offers expired before you accepted one. Buyers don’t wait forever — accept or counter sooner.';
  }
  l.advice = advice;
  l.outcome = 'Ended without a sale.';
  emitEvent(state, { kind: 'market', text: `"${l.title}" ended without a sale. ${advice}`, listingId: l.id, toast: true });
}

/** Per-tick listing simulation: integrity, counters, expiries, interest, arrivals, end of auction. */
export function stepListings(state: GameState, dt: number, ctx: SimContext): void {
  const rng = ctx.rng;
  const end = ctx.hour + Math.max(0, dt);
  for (const l of state.market.listings) {
    if (l.status !== 'active') continue;
    if (!checkIntegrity(state, l, rng)) continue;
    resolveCounters(state, l, rng, end);
    if (l.status !== 'active') continue;
    expireAndDrift(state, l, rng, dt, end);
    updateInterest(state, l, rng, dt, end);
    if (end < l.endsHour) {
      // One buyer per window at most, so a long window (10×, the offline catch-up) must be walked in market-cadence
      // pieces or it sees fewer buyers per hour than 1× does (lane:fix-econ, G1-05). A 1× window is one piece.
      const pieces = Math.max(1, Math.ceil(dt / MARKET_STEP_HOURS - 0.05));
      const piece = dt / pieces;
      for (let i = 1; i <= pieces && l.status === 'active'; i++) arrivals(state, l, rng, piece, end - dt + piece * i);
    }
    if (l.status !== 'active') continue;
    if (end >= l.endsHour) {
      const pending = l.bids.some((b) => b.status === 'open' || b.status === 'countered');
      if (!pending) expireListing(state, l);
      else if (!(l.alerts ?? []).includes('closed')) {
        (l.alerts ??= []).push('closed');
        // Bidding closed: every open offer stays long enough to act on the toast below.
        for (const b of l.bids) if (b.status === 'open') b.expiresHour = Math.max(b.expiresHour, l.endsHour + CLOSING_GRACE_HOURS * marketTimeScale(state));
        const best = bestOpen(l);
        emitEvent(state, { kind: 'market', text: `Bidding closed on "${l.title}". ${best ? `Best open offer: ${fmtMoney(best.amount)} from ${best.buyerName ?? 'a buyer'} — accept it before it expires.` : 'Waiting on a counter reply.'}`, listingId: l.id, toast: true });
      }
    }
  }
  // Prune: keep active listings and the most recent closed ones; only the newest closed keep their photos.
  const closed = state.market.listings.filter((l) => l.status !== 'active');
  if (closed.length > CLOSED_LISTINGS_KEPT) {
    const drop = new Set(closed.slice(0, closed.length - CLOSED_LISTINGS_KEPT).map((l) => l.id));
    state.market.listings = state.market.listings.filter((l) => !drop.has(l.id));
  }
  const withPhotos = closed.filter((l) => l.snapshot.photo);
  for (let i = 0; i < withPhotos.length - CLOSED_PHOTOS_KEPT; i++) delete withPhotos[i].snapshot.photo;
}

/** DEV/UI testing: make one buyer look at a listing right now (may bid, buy-now, or pass). */
export function forceBuyerVisit(state: GameState, listingId: string): ActionResult {
  const l = state.market.listings.find((x) => x.id === listingId);
  if (!l) return fail('Listing not found.');
  if (l.status !== 'active') return fail(statusMessage(l));
  const before = l.bids.length;
  arrivals(state, l, simRng(state), 0, state.clock.hour, true);
  return l.bids.length > before ? { ok: true, message: 'A buyer made an offer.' } : { ok: true, message: 'A buyer looked but passed.' };
}

// ───────────────────────────── frags: local store (lane:frags) ─────────────────────────────

/**
 * Sell frags/cuttings to the local fish store at FRAG_STORE_RATE of fair value (instant, no auction). The items must
 * already be out of the tank/storage — callers (quickSellFrags, removeDecor) take them out first.
 */
export function sellFragsToStore(state: GameState, items: DecorInstance[]): ActionResult & { total?: number } {
  if (!items.length) return fail('Choose at least one frag or cutting.');
  const offers = items.map((f) => fragStoreOffer(state, f));
  const total = offers.reduce((a, v) => a + v, 0);
  const now = state.clock.hour;
  const names = items.length === 1 ? fragLabel(items[0]) : `${items.length} frags & cuttings`;
  earn(state, total, 'livestock_sale', `Sold ${names} to ${LOCAL_FISH_STORE}`);
  // Store sales soften frag prices (saturation) but are not market sales: no history entry, so no sales reputation.
  const recent = (state.market.fragSaleHours ?? []).filter((h) => now - h <= 72);
  for (let i = 0; i < items.length; i++) recent.push(now);
  state.market.fragSaleHours = recent.slice(-60);
  bumpCounter(state, 'fragsSold', items.length);
  bumpCounter(state, 'salesRevenue', Math.round(total));
  addMastery(state, 'business', 1);
  return { ok: true, message: `${LOCAL_FISH_STORE} bought ${names} for ${fmtMoney(total)}.`, total };
}

/** Quick-sell frags/cuttings from storage to the local fish store. */
export function quickSellFrags(state: GameState, fragIds: string[]): ActionResult & { total?: number } {
  const ids = new Set(fragIds);
  const stored = state.inventory.frags ?? [];
  const items = stored.filter((f) => ids.has(f.id));
  if (!items.length || items.length !== ids.size) return fail('Those frags are no longer in storage.');
  state.inventory.frags = stored.filter((f) => !ids.has(f.id));
  return sellFragsToStore(state, items);
}

/** What the local store would pay for these stored frags right now (UI preview). */
export function quickSellFragsQuote(state: GameState, fragIds: string[]): number {
  const ids = new Set(fragIds);
  return (state.inventory.frags ?? []).filter((f) => ids.has(f.id)).reduce((a, f) => a + fragStoreOffer(state, f), 0);
}

/** Fair value of one stored frag (UI convenience). */
export function storedFragValue(state: GameState, fragId: string): number {
  const f = (state.inventory.frags ?? []).find((x) => x.id === fragId);
  return f ? fragValue(state, f).expected : 0;
}
