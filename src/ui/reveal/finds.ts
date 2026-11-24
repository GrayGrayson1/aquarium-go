/**
 * Chunk 21, feature B (rare-hatch reveals): which births earn a reveal card, and what the card says. Pure: no React, no
 * DOM, no clock, no randomness. OWNER: lane "reveal".
 *
 * The rule (`birthEarnsReveal`): an animal born in the shop earns a reveal when it is
 *   1. Prismatic: every Prismatic newborn is a find of its own (the save keeps each in `progress.prismaticFinds`);
 *   2. the first of a named strain in this save, at any tier (the data's lowest strain tier is uncommon); or
 *   3. the first of a morph whose catalog tier is rare or above (`REVEAL_MORPH_TIER`; by MORPH_TIER_MIN_SHARE in
 *      src/data/rarity.ts, a morph fewer than 1 in 50 market animals show).
 * A new common or uncommon morph keeps its toast and log line only. Bought animals never earn one: the shop shows the
 * Prismatic badge, the morph's tier and the named strain before the player chooses to buy (see the chunk's report).
 *
 * How a commit is read (`revealFindsInCommit`, given the store's previous and next game of the same save): the sim
 * already announces each first-bred morph and each Prismatic youngster with a 'celebrate' event that names the animal
 * (`mintJuveniles` in src/sim/life/breeding/clutch.ts). The commit's new events that name an animal born in this commit
 * (absent before, its history starting with 'born') are the candidates. What is new for the collection comes from the
 * save's own lists, not the event text: the morph key and the strain keys this commit added to
 * `progress.discoveredMorphs` and `progress.discoveredStrains`. Each new key goes to the first candidate in log order
 * that shows it (the sim announces a morph's first animal before the brood's Prismatic young), so a sibling never
 * repeats its brother's first. Nothing in the sim changes for this: no new event field, no new draw.
 */
import type { Creature, GameEvent, GameState, Rarity } from '@/types';
import { findSpecies } from '@/data/species';
import { TIER_WORD } from '@/data/rarity';
import { isPrismatic, oneInLabel, prismaticChance } from '@/sim/life/rareVariants';
import { catalogEntry, strainsOf, strainTier, tierRank } from '@/sim/life/morphCatalog';

/** The lowest morph tier that earns a reveal on its own. */
export const REVEAL_MORPH_TIER: Rarity = 'rare';

/** One animal the card shows (one page of the pager). */
export interface RevealFind {
  creatureId: string;
  speciesId: string;
  /** The event that announced it (the queue keeps log order). */
  eventId: string;
  prismatic: boolean;
  /** The first of a rare (or rarer) morph in this save: its tier and its share of market stock, when the catalog knows it. */
  newMorph?: { tier: Rarity; share: number | null };
  /** The first of a named strain in this save (the primary one, when the animal shows several new ones). */
  newStrain?: { id: string; name: string; tier: Rarity };
}

/** What makes a birth a find, for the rule. */
export interface BirthFinds {
  prismatic: boolean;
  /** Tier of a named strain this birth shows for the first time, if any. */
  newStrainTier?: Rarity | null;
  /** Tier of a morph this birth shows for the first time, if any. */
  newMorphTier?: Rarity | null;
}

/** Does this birth earn a reveal? (the rule in the header) */
export function birthEarnsReveal(f: BirthFinds): boolean {
  if (f.prismatic) return true;
  if (f.newStrainTier) return true;
  return !!f.newMorphTier && tierRank(f.newMorphTier) >= tierRank(REVEAL_MORPH_TIER);
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
 * commit with no new events.
 */
export function revealFindsInCommit(prev: GameState | null | undefined, next: GameState | null | undefined): RevealFind[] {
  if (!prev || !next || prev === next || prev.saveId !== next.saveId || next.isShowcase) return [];
  const events = newLogEvents(prev.log ?? [], next.log ?? []);
  const out: RevealFind[] = [];
  let knownMorphs: Set<string> | null = null;
  let knownStrains: Set<string> | null = null;
  let nowMorphs: Set<string> | null = null;
  let nowStrains: Set<string> | null = null;
  const claimed = new Set<string>();
  const seen = new Set<string>();
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
      // only a first that earns a reveal by itself is told (a plain new morph keeps its toast)
      if (entry && birthEarnsReveal({ prismatic: false, newMorphTier: entry.tier })) newMorph = { tier: entry.tier, share: entry.frequency > 0 ? entry.frequency : null };
    }

    let newStrain: RevealFind['newStrain'];
    for (const s of strainsOf(sp, c.genome)) {
      const key = `${sp.id}:${s.id}`;
      if (knownStrains.has(key) || claimed.has(key) || !nowStrains.has(key)) continue;
      claimed.add(key);
      newStrain ??= { id: s.id, name: s.name, tier: strainTier(sp, s) };
    }

    const prismatic = isPrismatic(c);
    if (!birthEarnsReveal({ prismatic, newStrainTier: newStrain?.tier, newMorphTier: newMorph?.tier })) continue;
    out.push({ creatureId: c.id, speciesId: sp.id, eventId: e.id, prismatic, ...(newMorph ? { newMorph } : {}), ...(newStrain ? { newStrain } : {}) });
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
  else if (f.newMorph) lines.push(f.newMorph.share ? `The first of this morph bred in your shop. About ${oneInLabel(f.newMorph.share)} market animals show it.` : 'The first of this morph bred in your shop.');
  return { name: c.name, morph: `${c.morphName} · ${sp.commonName}`, lines };
}

/** The Collection's address for a species (feature A's route; a link by address only). */
export const collectionHash = (speciesId: string): string => `#/encyclopedia/collection/${encodeURIComponent(speciesId)}`;
