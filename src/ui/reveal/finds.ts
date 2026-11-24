/**
 * Chunk 21, feature B (rare-hatch reveals): which births earn a reveal card, and what the card says. Pure: no React, no
 * DOM, no clock, no randomness. OWNER: lane "reveal".
 *
 * The rule (`birthEarnsReveal`; the chunk's review, S1, and the lead's decision of 2026-11-24, for the owner to
 * confirm): an animal born in the shop earns a reveal when it is
 *   1. Prismatic: every Prismatic newborn is a find of its own (the save keeps each in `progress.prismaticFinds`);
 *   2. the first of a named strain in this save, at any tier (the data's lowest strain tier is uncommon; bettas have
 *      10 named strains, so at most 10 such cards a game for bettas); or
 *   3. the first of a morph of the legendary tier (`REVEAL_MORPH_TIER`; by MORPH_TIER_MIN_SHARE in src/data/rarity.ts,
 *      a morph fewer than 1 in 10,000 market animals show), and only the first such morph-only find of its species in
 *      the game day (`MORPH_REVEAL_WINDOW_HOURS`): a Prismatic or strain card doesn't use the day up.
 * Every other new morph keeps its toast and log line only. (At "rare or above" the card followed most broods: 98 to 99%
 * of betta and guppy morphs are rare or rarer, and 93% very rare or rarer. Measured over 40 broods of fresh market
 * pairs at the game's brood sizes, this rule opens a card after 5 of 40 betta broods, all of them named-strain firsts,
 * and 1 of 40 guppy or platy broods; see the chunk's report.) Bought animals never earn one: the shop shows the
 * Prismatic badge, the morph's tier and the named strain before the player chooses to buy.
 *
 * How a commit is read (`revealFindsInCommit`, given the store's previous and next game of the same save): the sim
 * already announces each first-bred morph and each Prismatic youngster with a 'celebrate' event that names the animal
 * (`mintJuveniles` in src/sim/life/breeding/clutch.ts). The commit's new events that name an animal born in this commit
 * (absent before, its history starting with 'born') are the candidates. What is new for the collection comes from the
 * save's own lists, not the event text: the morph key and the strain keys this commit added to
 * `progress.discoveredMorphs` and `progress.discoveredStrains`. Each new key goes to the first candidate in log order
 * that shows it (the sim announces a morph's first animal before the brood's Prismatic young), so a sibling never
 * repeats its brother's first. The game day of a morph-only find is its event's (`floor(hour / 24)`); the UI store keeps,
 * per species, the day of the last one shown (`MorphRevealLedger`), and a commit passes it in. Nothing in the sim
 * changes for this: no new event field, no new draw.
 */
import type { Creature, GameEvent, GameState, Rarity } from '@/types';
import { findSpecies } from '@/data/species';
import { TIER_WORD } from '@/data/rarity';
import { isPrismatic, oneInLabel, prismaticChance } from '@/sim/life/rareVariants';
import { catalogEntry, strainsOf, strainTier, tierRank } from '@/sim/life/morphCatalog';

/** The lowest morph tier that earns a reveal on its own (a morph with no new strain and no Prismatic shimmer). */
export const REVEAL_MORPH_TIER: Rarity = 'legendary';
/** At most one morph-only reveal per species in this many game hours (one game day). */
export const MORPH_REVEAL_WINDOW_HOURS = 24;
/** The window (the game day, counted from 0) an hour falls in. */
export const morphRevealWindow = (hour: number): number => Math.floor(hour / MORPH_REVEAL_WINDOW_HOURS);
/** Species id → the window of its last morph-only reveal (kept by the UI store for the aquarium on screen). */
export type MorphRevealLedger = Readonly<Record<string, number>>;

/** One animal the card shows (one page of the pager). */
export interface RevealFind {
  creatureId: string;
  speciesId: string;
  /** The event that announced it (the queue keeps log order). */
  eventId: string;
  prismatic: boolean;
  /** The first of a morph of REVEAL_MORPH_TIER in this save: its tier and its share of market stock (null: unknown). */
  newMorph?: { tier: Rarity; share: number | null };
  /** The first of a named strain in this save (the primary one, when the animal shows several new ones). */
  newStrain?: { id: string; name: string; tier: Rarity };
  /** Set when the morph alone earned it: the window it used up for its species (the store's ledger records it). */
  morphOnlyWindow?: number;
}

/** What makes a birth a find, for the rule. */
export interface BirthFinds {
  prismatic: boolean;
  /** Tier of a named strain this birth shows for the first time, if any. */
  newStrainTier?: Rarity | null;
  /** Tier of a morph this birth shows for the first time, if any. */
  newMorphTier?: Rarity | null;
  /** A morph-only reveal for this species was already shown in the current game day. */
  morphShownToday?: boolean;
}

/** A morph tier that may earn a reveal on its own (still subject to the one-a-day limit). */
export const morphTierReveals = (tier: Rarity | null | undefined): boolean => !!tier && tierRank(tier) >= tierRank(REVEAL_MORPH_TIER);

/** Does this birth earn a reveal? (the rule in the header) */
export function birthEarnsReveal(f: BirthFinds): boolean {
  if (f.prismatic) return true;
  if (f.newStrainTier) return true;
  return morphTierReveals(f.newMorphTier) && !f.morphShownToday;
}

/** The ledger after these finds were shown: each morph-only find records its window for its species. */
export function foldMorphLedger(ledger: MorphRevealLedger, finds: readonly RevealFind[]): MorphRevealLedger {
  let out: Record<string, number> | null = null;
  for (const f of finds) {
    if (f.morphOnlyWindow === undefined) continue;
    out ??= { ...ledger };
    out[f.speciesId] = f.morphOnlyWindow;
  }
  return out ?? ledger;
}

/**
 * The events `next` has that `prev` did not, oldest first. The log is capped (src/sim/context.ts LOG_CAP): when the
 * previous last event fell off (a long catch-up), every event the previous log lacked counts as new.
 */
export function newLogEvents(prev: readonly GameEvent[], next: readonly GameEvent[]): GameEvent[] {
  if (prev === next || !next.length) return [];
  if (!prev.length) return next.slice();
  const lastId = prev[prev.length - 1].id;
  if (next[next.length - 1].id === lastId) return [];
  for (let i = next.length - 1; i >= 0; i--) if (next[i].id === lastId) return next.slice(i + 1);
  const seen = new Set(prev.map((e) => e.id));
  return next.filter((e) => !seen.has(e.id));
}

/** Born in the shop during this commit, and still here. */
function bornNow(c: Creature | undefined, prev: GameState): c is Creature {
  return !!c && !prev.creatures[c.id] && c.history?.[0]?.kind === 'born' && (c.status === 'alive' || c.status === 'listed');
}

/**
 * The finds a store commit brought (see the header), in log order. Empty for another save, a showcase world, or a
 * commit with no new events. `ledger`: the morph-only reveals already shown in this aquarium (species → window).
 */
export function revealFindsInCommit(prev: GameState | null | undefined, next: GameState | null | undefined, ledger: MorphRevealLedger = {}): RevealFind[] {
  if (!prev || !next || prev === next || prev.saveId !== next.saveId || next.isShowcase) return [];
  const events = newLogEvents(prev.log ?? [], next.log ?? []);
  const out: RevealFind[] = [];
  let knownMorphs: Set<string> | null = null;
  let knownStrains: Set<string> | null = null;
  let nowMorphs: Set<string> | null = null;
  let nowStrains: Set<string> | null = null;
  const claimed = new Set<string>();
  const seen = new Set<string>();
  const shown = new Map<string, number>(Object.entries(ledger));
  for (const e of events) {
    if (e.kind !== 'celebrate' || !e.creatureId || seen.has(e.creatureId)) continue;
    const c = next.creatures[e.creatureId];
    if (!bornNow(c, prev)) continue;
    const sp = findSpecies(c.speciesId);
    if (!sp) continue;
    seen.add(c.id);
    knownMorphs ??= new Set(prev.progress?.discoveredMorphs ?? []);
    knownStrains ??= new Set(prev.progress?.discoveredStrains ?? []);
    nowMorphs ??= new Set(next.progress?.discoveredMorphs ?? []);
    nowStrains ??= new Set(next.progress?.discoveredStrains ?? []);

    let newMorph: RevealFind['newMorph'];
    const morphKey = `${sp.id}:${c.morphName}`;
    if (!knownMorphs.has(morphKey) && !claimed.has(morphKey) && nowMorphs.has(morphKey)) {
      claimed.add(morphKey);
      const entry = catalogEntry(sp, c.morphName);
      // only a first of the reveal's tier is told (any other new morph keeps its toast)
      if (entry && morphTierReveals(entry.tier)) newMorph = { tier: entry.tier, share: entry.frequency > 0 ? entry.frequency : null };
    }

    let newStrain: RevealFind['newStrain'];
    for (const s of strainsOf(sp, c.genome)) {
      const key = `${sp.id}:${s.id}`;
      if (knownStrains.has(key) || claimed.has(key) || !nowStrains.has(key)) continue;
      claimed.add(key);
      newStrain ??= { id: s.id, name: s.name, tier: strainTier(sp, s) };
    }

    const prismatic = isPrismatic(c);
    const window = morphRevealWindow(e.hour);
    if (!birthEarnsReveal({ prismatic, newStrainTier: newStrain?.tier, newMorphTier: newMorph?.tier, morphShownToday: shown.get(sp.id) === window })) continue;
    // the morph alone earned it: that uses up the species' day
    const morphOnly = !prismatic && !newStrain;
    if (morphOnly) shown.set(sp.id, window);
    out.push({ creatureId: c.id, speciesId: sp.id, eventId: e.id, prismatic, ...(newMorph ? { newMorph } : {}), ...(newStrain ? { newStrain } : {}), ...(morphOnly ? { morphOnlyWindow: window } : {}) });
  }
  return out;
}

// ───────────────────────────── the card's words ─────────────────────────────

export const REVEAL_WORDS = {
  /** The build-up, before the animal shows. */
  buildUp: 'Something rare among the new young',
  /** Over the animal, once it shows. */
  over: 'New for your collection',
  see: 'See it',
  collection: 'Open collection',
  previous: 'Previous find',
  next: 'Next find',
  pager: (i: number, n: number) => `${i} of ${n}`,
} as const;

export interface RevealView {
  name: string;
  /** "{morph} · {species}" */
  morph: string;
  /** Why it is a find: one or two short sentences. */
  lines: string[];
}

/** What a page says about its animal (null when the animal or its species is gone from the save). */
export function revealView(g: GameState, f: RevealFind): RevealView | null {
  const c = g.creatures[f.creatureId];
  const sp = c ? findSpecies(c.speciesId) : undefined;
  if (!c || !sp) return null;
  const lines: string[] = [];
  if (f.prismatic) {
    const parents = [c.lineage?.motherId, c.lineage?.fatherId].map((id) => (id ? g.creatures[id] : undefined));
    const odds = oneInLabel(prismaticChance({ source: 'bred', rareParents: parents.filter((p) => isPrismatic(p)).length }));
    lines.push(`Born Prismatic. About ${odds} young shimmer like this.`);
  }
  if (f.newStrain) lines.push(`The first ${f.newStrain.name} in your shop, a recognised ${TIER_WORD[f.newStrain.tier]} strain.`);
  else if (f.newMorph) lines.push(`The first ${c.morphName} bred in your shop.${f.newMorph.share ? ` About ${oneInLabel(f.newMorph.share)} market animals show it.` : ''}`);
  return { name: c.name, morph: `${c.morphName} · ${sp.commonName}`, lines };
}

/** The Collection's address for a species (feature A's route; a link by address only). */
export const collectionHash = (speciesId: string): string => `#/encyclopedia/collection/${encodeURIComponent(speciesId)}`;
