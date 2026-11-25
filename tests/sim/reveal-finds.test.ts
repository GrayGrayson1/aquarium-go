/**
 * Chunk 21, feature B (rare-hatch reveals): the rule "does this birth earn a reveal" and how a store commit is read
 * (src/ui/reveal/finds.ts), over real broods minted by the sim. Prismatic rolls are forced through the dev hook.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState, Genome, Rarity } from '@/types';
import { getSpecies } from '@/data/species';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { simRng } from '@/sim/rng';
import { addCreature, createCreature } from '@/sim/life';
import { normalizeGenome } from '@/sim/life/genetics';
import { morphTierOf } from '@/sim/life/morphCatalog';
import { createClutch, mintJuveniles } from '@/sim/life/breeding/clutch';
import { forcePrismatic, isPrismatic } from '@/sim/life/rareVariants';
import { buyOffer, generateOffer } from '@/sim/economy';
import { emitEvent } from '@/sim/context';
import {
  MORPH_REVEAL_WINDOW_HOURS,
  REVEAL_MORPH_TIER,
  REVEAL_WORDS,
  birthEarnsReveal,
  collectionHash,
  foldMorphLedger,
  morphRevealWindow,
  newLogEvents,
  revealFindsInCommit,
  revealView,
  type RevealFind,
} from '@/ui/reveal/finds';

afterEach(() => {
  forcePrismatic('bred', 0);
  forcePrismatic('shop', 0);
});

const betta = getSpecies('betta');
/** A homozygous betta (`cambodian` and `metallic` at the wild allele unless given). */
const bettaGenome = (color: string, pattern: string, fins: string, cambodian?: string, metallic?: string): Genome =>
  normalizeGenome(betta, {
    alleles: { color: [color, color], pattern: [pattern, pattern], fins: [fins, fins], ...(cambodian ? { cambodian: [cambodian, cambodian] } : {}), ...(metallic ? { metallic: [metallic, metallic] } : {}) },
    potentials: {} as Genome['potentials'],
  });
/** Legendary betta morphs with no named strain (the catalog's tier is checked where they are used). */
const RED_METALLIC_CAMBODIAN_HALFMOON = () => bettaGenome('red', 'solid', 'halfmoon', 'c', 'me');
const RED_METALLIC_CAMBODIAN_PLAKAT = () => bettaGenome('red', 'solid', 'plakat', 'c', 'me');

/** A betta pair of one genotype and their fry, ready to become juveniles; `prev` is the store's state before. */
function brood(genome: Genome, opts: { force?: number; count?: number; known?: boolean } = {}) {
  const g = newGame({ starterId: 'betta', starterName: 'S', seed: 5 });
  const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Nursery' });
  tank.purpose = 'nursery';
  const mom = createCreature(g, simRng(g), 'betta', { sex: 'female', ageDays: 120, genome });
  const dad = createCreature(g, simRng(g), 'betta', { sex: 'male', ageDays: 120, genome });
  addCreature(g, mom, null);
  addCreature(g, dad, null);
  const cl = createClutch(g, { sp: betta, tank, mother: mom, father: dad, hour: g.clock.hour - 100, stage: 'fry', count: opts.count ?? 4, visual: 'fry_cloud', nextStageHour: g.clock.hour });
  if (opts.known) {
    // the morph and its strains are already in the collection (as if bought before)
    g.progress.discoveredMorphs.push(`betta:${mom.morphName}`);
    for (const s of betta.genetics.strains ?? []) (g.progress.discoveredStrains ??= []).push(`betta:${s.id}`);
  }
  const prev = structuredClone(g) as GameState;
  if (opts.force) forcePrismatic('bred', opts.force);
  const kids = mintJuveniles(g, cl, tank, betta, g.clock.hour, null);
  return { prev, next: g, kids, mom };
}

describe('birthEarnsReveal: the rule', () => {
  // chunk 21's review (S1): at "rare or above" a card followed most broods; the lead's rule, for the owner to confirm
  it('a Prismatic or any new named strain always; a new morph only when legendary and the first such of its species today', () => {
    expect(REVEAL_MORPH_TIER).toBe('legendary');
    expect(MORPH_REVEAL_WINDOW_HOURS).toBe(24);
    expect(birthEarnsReveal({ prismatic: true })).toBe(true);
    expect(birthEarnsReveal({ prismatic: false, newStrainTier: 'uncommon' })).toBe(true);
    const byTier = (t: Rarity) => birthEarnsReveal({ prismatic: false, newMorphTier: t });
    expect((['common', 'uncommon', 'rare', 'very_rare', 'legendary'] as Rarity[]).map(byTier)).toEqual([false, false, false, false, true]);
    expect(birthEarnsReveal({ prismatic: false })).toBe(false);
    expect(birthEarnsReveal({ prismatic: false, newStrainTier: null, newMorphTier: null })).toBe(false);
    // the one-a-day limit holds back only a morph-only find
    expect(birthEarnsReveal({ prismatic: false, newMorphTier: 'legendary', morphShownToday: true })).toBe(false);
    expect(birthEarnsReveal({ prismatic: true, newMorphTier: 'legendary', morphShownToday: true })).toBe(true);
    expect(birthEarnsReveal({ prismatic: false, newStrainTier: 'rare', newMorphTier: 'legendary', morphShownToday: true })).toBe(true);
  });

  it('a game day is floor(hour / 24); the ledger records only morph-only finds', () => {
    expect([0, 23.99, 24, 47.5, 48].map(morphRevealWindow)).toEqual([0, 0, 1, 1, 2]);
    const f = (speciesId: string, w?: number): RevealFind => ({ creatureId: `c_${speciesId}_${w}`, speciesId, eventId: 'ev', prismatic: w === undefined, ...(w !== undefined ? { morphOnlyWindow: w } : {}) });
    const ledger = { betta: 3 };
    expect(foldMorphLedger(ledger, [f('betta')])).toBe(ledger);
    expect(foldMorphLedger(ledger, [f('betta', 5), f('platy', 5), f('koi')])).toEqual({ betta: 5, platy: 5 });
    expect(ledger).toEqual({ betta: 3 });
  });
});

describe('revealFindsInCommit: reading a commit', () => {
  it('the first of a named strain is one page, credited to the animal the sim announced', () => {
    const { prev, next, kids } = brood(bettaGenome('royal', 'butterfly', 'halfmoon'));
    expect(kids.length).toBeGreaterThan(1);
    const finds = revealFindsInCommit(prev, next);
    expect(finds).toHaveLength(1);
    const f = finds[0];
    const announced = next.log.find((e) => e.kind === 'celebrate' && /^First /.test(e.text));
    expect(f.creatureId).toBe(announced?.creatureId);
    expect(f).toMatchObject({ speciesId: 'betta', prismatic: false, newStrain: { id: 'royal_butterfly_hm', name: 'Royal Butterfly Halfmoon', tier: 'rare' } });
    // its morph is only rare: no morph chip, and a strain card never uses up the species' day
    expect(f.newMorph).toBeUndefined();
    expect(f.morphOnlyWindow).toBeUndefined();
    const view = revealView(next, f)!;
    expect(view.name).toBe(next.creatures[f.creatureId].name);
    expect(view.morph).toBe('Royal Blue Butterfly Halfmoon · Betta');
    expect(view.lines).toEqual(['The first Royal Butterfly Halfmoon in your shop, a recognised rare strain.']);
  });

  it('a new legendary morph without a strain is a page that names it and says how rare it is', () => {
    const { prev, next, mom } = brood(RED_METALLIC_CAMBODIAN_HALFMOON());
    expect(mom.morphName).toBe('Red Metallic Cambodian Halfmoon');
    const finds = revealFindsInCommit(prev, next);
    expect(finds).toHaveLength(1);
    expect(finds[0].newStrain).toBeUndefined();
    expect(finds[0].newMorph?.tier).toBe('legendary');
    expect(finds[0].morphOnlyWindow).toBe(morphRevealWindow(next.clock.hour));
    expect(revealView(next, finds[0])!.lines).toEqual([`The first Red Metallic Cambodian Halfmoon bred in your shop. About 1 in ${Math.round(1 / finds[0].newMorph!.share!).toLocaleString('en-US')} market animals show it.`]);
  });

  it('a new common, uncommon, rare or very rare morph keeps only its toast', () => {
    for (const [genome, name, tier] of [
      [bettaGenome('red', 'solid', 'halfmoon'), 'Red Halfmoon', 'uncommon'],
      [bettaGenome('red', 'butterfly', 'halfmoon'), 'Red Butterfly Halfmoon', 'rare'],
      [bettaGenome('red', 'solid', 'halfmoon', 'C', 'me'), 'Red Metallic Halfmoon', 'very_rare'],
    ] as const) {
      const { prev, next } = brood(genome);
      // the sim did announce it as a first …
      expect(next.log.some((e) => e.kind === 'celebrate' && e.text.startsWith(`First ${name} `)), name).toBe(true);
      expect(morphTierOf(betta, name), name).toBe(tier);
      // … but it earns no reveal
      expect(revealFindsInCommit(prev, next), name).toEqual([]);
    }
  });

  it('one morph-only reveal per species a game day: the next legendary first that day keeps its toast, the next day it reveals', () => {
    const g = newGame({ starterId: 'betta', starterName: 'S', seed: 5 });
    const mint = (genome: Genome) => {
      const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: `Nursery ${Object.keys(g.tanks).length}` });
      tank.purpose = 'nursery';
      const mom = createCreature(g, simRng(g), 'betta', { sex: 'female', ageDays: 120, genome });
      const dad = createCreature(g, simRng(g), 'betta', { sex: 'male', ageDays: 120, genome });
      addCreature(g, mom, null);
      addCreature(g, dad, null);
      const cl = createClutch(g, { sp: betta, tank, mother: mom, father: dad, hour: g.clock.hour - 100, stage: 'fry', count: 3, visual: 'fry_cloud', nextStageHour: g.clock.hour });
      mintJuveniles(g, cl, tank, betta, g.clock.hour, null);
    };
    g.clock.hour = 24 * 10 + 9; // 9 AM on a day
    // two legendary firsts in one commit: one page
    let prev = structuredClone(g) as GameState;
    mint(RED_METALLIC_CAMBODIAN_HALFMOON());
    mint(RED_METALLIC_CAMBODIAN_PLAKAT());
    expect(morphTierOf(betta, 'Red Metallic Cambodian Plakat')).toBe('legendary');
    let finds = revealFindsInCommit(prev, g);
    expect(finds).toHaveLength(1);
    let ledger = foldMorphLedger({}, finds);
    expect(ledger).toEqual({ betta: 10 });
    // later that day, in another commit, a third legendary first: no page (the ledger says the day is used)
    g.clock.hour += 10;
    prev = structuredClone(g) as GameState;
    mint(bettaGenome('red', 'solid', 'crown', 'c', 'me'));
    expect(morphTierOf(betta, 'Red Metallic Cambodian Crowntail')).toBe('legendary');
    expect(revealFindsInCommit(prev, g, ledger)).toEqual([]);
    // … though without the ledger (another aquarium's) it would have been one
    expect(revealFindsInCommit(prev, g)).toHaveLength(1);
    // the next day: a page again
    g.clock.hour += 24;
    prev = structuredClone(g) as GameState;
    mint(bettaGenome('red', 'solid', 'double', 'c', 'me'));
    finds = revealFindsInCommit(prev, g, ledger);
    expect(finds).toHaveLength(1);
    ledger = foldMorphLedger(ledger, finds);
    expect(ledger).toEqual({ betta: 11 });
    // another species' day is its own
    expect(revealFindsInCommit(prev, g, { platy: 11 })).toHaveLength(1);
  });

  it('a Prismatic or a strain card never uses up the day, and still reveals on a used day', () => {
    // a Prismatic first of a legendary morph: its page shows the morph, but the day stays free
    const shimmer = brood(RED_METALLIC_CAMBODIAN_HALFMOON(), { force: 1, count: 3 });
    const day = morphRevealWindow(shimmer.next.clock.hour);
    const pages = revealFindsInCommit(shimmer.prev, shimmer.next, { betta: day });
    expect(pages[0]).toMatchObject({ prismatic: true, newMorph: { tier: 'legendary' } });
    expect(pages.every((p) => p.morphOnlyWindow === undefined)).toBe(true);
    // a strain first on a used day
    const strain = brood(bettaGenome('royal', 'butterfly', 'halfmoon'));
    expect(revealFindsInCommit(strain.prev, strain.next, { betta: morphRevealWindow(strain.next.clock.hour) })).toHaveLength(1);
  });

  it('each Prismatic youngster is its own page, in the order the sim announced them', () => {
    const { prev, next, kids } = brood(bettaGenome('red', 'solid', 'halfmoon'), { force: 3, count: 4, known: true });
    const shimmer = kids.filter((c) => isPrismatic(c));
    expect(shimmer).toHaveLength(3);
    const finds = revealFindsInCommit(prev, next);
    expect(finds.map((f) => f.creatureId)).toEqual(shimmer.map((c) => c.id));
    for (const f of finds) {
      expect(f.prismatic).toBe(true);
      expect(f.newMorph).toBeUndefined();
      expect(f.newStrain).toBeUndefined();
    }
    expect(revealView(next, finds[0])!.lines).toEqual(['Born Prismatic. About 1 in 8,192 young shimmer like this.']);
  });

  it('a Prismatic first of a strain is one page with both; a Prismatic sibling never repeats the first', () => {
    const { prev, next, kids } = brood(bettaGenome('royal', 'butterfly', 'halfmoon'), { force: 2, count: 4 });
    const finds = revealFindsInCommit(prev, next);
    expect(finds).toHaveLength(2);
    expect(finds[0]).toMatchObject({ creatureId: kids[0].id, prismatic: true, newStrain: { id: 'royal_butterfly_hm' } });
    expect(finds[1]).toMatchObject({ creatureId: kids[1].id, prismatic: true });
    expect(finds[1].newStrain).toBeUndefined();
    expect(finds[1].newMorph).toBeUndefined();
    expect(revealView(next, finds[0])!.lines).toHaveLength(2);
  });

  it('a Prismatic parent makes the odds line the bred one', () => {
    const { prev, next, mom } = brood(bettaGenome('red', 'solid', 'halfmoon'), { force: 1, known: true });
    const f = revealFindsInCommit(prev, next)[0];
    expect(f).toBeDefined();
    next.creatures[mom.id].rareVariant = { kind: 'prismatic', origin: 'shop', visualSeed: 3 };
    expect(revealView(next, f)!.lines[0]).toBe('Born Prismatic. About 1 in 2,048 young shimmer like this.');
  });

  it('nothing replays: the same state, another save, a showcase world or a commit without new events', () => {
    const { prev, next } = brood(bettaGenome('royal', 'butterfly', 'halfmoon'));
    expect(revealFindsInCommit(prev, next)).toHaveLength(1);
    expect(revealFindsInCommit(next, next)).toEqual([]);
    const later = structuredClone(next) as GameState;
    expect(revealFindsInCommit(next, later)).toEqual([]);
    expect(revealFindsInCommit({ ...prev, saveId: 'another' }, next)).toEqual([]);
    expect(revealFindsInCommit(prev, { ...next, isShowcase: true })).toEqual([]);
    expect(revealFindsInCommit(null, next)).toEqual([]);
  });

  it('a bought animal never earns one, even with a celebrate line naming it', () => {
    const g = newGame({ starterId: 'betta', starterName: 'S', seed: 9 });
    g.finance.money = 1e6;
    forcePrismatic('shop', 1);
    const offer = generateOffer(g, simRng(g), 'betta', { expiresHour: g.clock.hour + 24 })!;
    g.market.stock.unshift(offer);
    const prev = structuredClone(g) as GameState;
    expect(buyOffer(g, offer.id, g.tankOrder[0]).ok).toBe(true);
    const bought = Object.values(g.creatures).find((c) => !prev.creatures[c.id])!;
    expect(isPrismatic(bought)).toBe(true);
    emitEvent(g, { kind: 'celebrate', text: 'A test line about the new arrival.', creatureId: bought.id });
    expect(revealFindsInCommit(prev, g)).toEqual([]);
  });

  it('an animal that died before the commit was read is left out', () => {
    const { prev, next, kids } = brood(bettaGenome('royal', 'butterfly', 'halfmoon'));
    next.creatures[kids[0].id].status = 'dead';
    expect(revealFindsInCommit(prev, next)).toEqual([]);
  });
});

describe('newLogEvents', () => {
  const ev = (id: string): GameEvent => ({ id, hour: 0, kind: 'info', text: id });
  it('takes what follows the previous last event, or everything the previous log lacked once it fell off the cap', () => {
    const a = [ev('1'), ev('2'), ev('3')];
    expect(newLogEvents(a, a)).toEqual([]);
    expect(newLogEvents(a, [...a, ev('4'), ev('5')]).map((e) => e.id)).toEqual(['4', '5']);
    expect(newLogEvents(a, [ev('2'), ev('3')])).toEqual([]);
    // the cap spliced the oldest off, '3' among them
    expect(newLogEvents(a, [ev('4'), ev('5')]).map((e) => e.id)).toEqual(['4', '5']);
    expect(newLogEvents([], [ev('1')]).map((e) => e.id)).toEqual(['1']);
  });
});

describe('the card’s words', () => {
  it('say what the owner reads in the report', () => {
    expect(REVEAL_WORDS.buildUp).toBe('Something rare among the new young');
    expect(REVEAL_WORDS.over).toBe('New for your collection');
    expect([REVEAL_WORDS.see, REVEAL_WORDS.collection, REVEAL_WORDS.previous, REVEAL_WORDS.next]).toEqual(['See it', 'Open collection', 'Previous find', 'Next find']);
    expect(REVEAL_WORDS.pager(1, 3)).toBe('1 of 3');
    expect(collectionHash('betta')).toBe('#/encyclopedia/collection/betta');
  });
});
