// @vitest-environment node
/**
 * chunk 21 (feature A) — the Collection: the discovery dates in a save (progress.discoveredAt: written at every place a
 * discovery is recorded, optional and repaired only when present, no RNG draw), and the pure rules of
 * src/ui/panels/encyclopedia/collection.ts (the percentage and what it counts, statuses, filters and order, the "how
 * to find it" line that never names an unseen trait, recent finds, and "Nearly there").
 */
import { afterEach, describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CollectionView } from '@/ui/panels/encyclopedia/CollectionView';
import { EncyclopediaPanel } from '@/ui/panels/encyclopedia/EncyclopediaPanel';
import { useGame } from '@/state/game';
import type { GameState, Genome, SpeciesDefinition } from '@/types';
import { ALL_SPECIES, getSpecies } from '@/data/species';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature, registerDiscovery, stampDiscovery, morphCatalog, seenTraitIds, forcePrismatic, predictOffspringMorphs } from '@/sim/life';
import { normalizeGenome } from '@/sim/life/genetics';
import { createClutch, mintJuveniles } from '@/sim/life/breeding/clutch';
import { buyOffer, generateOffer } from '@/sim/economy';
import { encodeRecord, decodeRecord, stateHash } from '@/persistence';
import { repairState } from '@/persistence/migrations';
import { clonePlain } from '@/sim/economy/util';
import { hasNoNamedMorphs, catalogHint } from '@/ui/panels/encyclopedia/morphs';
import {
  collectionCards,
  collectionPercent,
  collectionSummary,
  compareCards,
  formatPercent,
  howToFind,
  nearlyThere,
  bestPairFind,
  recentFinds,
  speciesMorphs,
  speciesProgress,
  SELLER_LINE,
  PAIR_MIN_CHANCE,
  pairOddsKey,
} from '@/ui/panels/encyclopedia/collection';

afterEach(() => forcePrismatic('bred', 0));

const roundTrip = (g: GameState) => decodeRecord(encodeRecord(g, 'auto').text);

function game(seed = 21): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed });
  g.isShowcase = false;
  g.finance.money = 1_000_000;
  return g;
}

const betta = getSpecies('betta');
const bettaGenome = (color: string, pattern: string, fins: string): Genome =>
  normalizeGenome(betta, { alleles: { color: [color, color], pattern: [pattern, pattern], fins: [fins, fins] }, potentials: {} as Genome['potentials'] });

/** Species with morphs to collect, as the Collection counts them. */
const named = (sp: SpeciesDefinition) => !hasNoNamedMorphs(sp) && morphCatalog(sp).entries.length > 1;
const N = ALL_SPECIES.length;

// ───────────────────────────── the dates in a save ─────────────────────────────

describe('progress.discoveredAt: every discovery is dated', () => {
  it('the starter: its species, its morph and any named strain, at the new game’s hour', () => {
    const g = game();
    const starter = Object.values(g.creatures)[0];
    const h = Math.floor(g.clock.hour);
    expect(g.progress.discoveredAt?.betta).toBe(h);
    expect(g.progress.discoveredAt?.[`betta:${starter.morphName}`]).toBe(h);
    for (const k of g.progress.discoveredStrains ?? []) expect(g.progress.discoveredAt?.[k]).toBe(h);
    // every listed discovery has its date, and nothing else is dated
    expect(Object.keys(g.progress.discoveredAt ?? {}).sort()).toEqual([...g.progress.discoveredSpecies, ...g.progress.discoveredMorphs, ...(g.progress.discoveredStrains ?? [])].sort());
  });

  it('buying a new species dates it and its morph at the purchase’s whole hour; a second find keeps the first date', () => {
    const g = game();
    const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Shoal' });
    g.clock.hour += 30.6;
    const o = generateOffer(g, simRng(g), 'neon_tetra', { expiresHour: g.clock.hour + 24, sexes: [undefined, undefined, undefined] })!;
    g.market.stock.push(o);
    expect(buyOffer(g, o.id, tank.id).ok).toBe(true);
    const h = Math.floor(g.clock.hour);
    expect(g.progress.discoveredAt?.neon_tetra).toBe(h);
    for (const c of Object.values(g.creatures).filter((c) => c.speciesId === 'neon_tetra')) expect(g.progress.discoveredAt?.[`neon_tetra:${c.morphName}`]).toBe(h);
    // later finds of the same keys never move the date
    g.clock.hour += 100;
    for (const c of Object.values(g.creatures)) registerDiscovery(g, c);
    stampDiscovery(g, 'neon_tetra');
    expect(g.progress.discoveredAt?.neon_tetra).toBe(h);
  });

  it('a brood dates its new morphs and named strains; dating draws nothing from the sim stream', () => {
    const g = game(5);
    const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Nursery' });
    tank.purpose = 'nursery';
    const mom = createCreature(g, simRng(g), 'betta', { sex: 'female', ageDays: 120, genome: bettaGenome('royal', 'butterfly', 'halfmoon') });
    const dad = createCreature(g, simRng(g), 'betta', { sex: 'male', ageDays: 120, genome: bettaGenome('royal', 'butterfly', 'halfmoon') });
    addCreature(g, mom, null);
    addCreature(g, dad, null);
    g.clock.hour += 50;
    const cl = createClutch(g, { sp: betta, tank, mother: mom, father: dad, hour: g.clock.hour - 100, stage: 'fry', count: 4, visual: 'fry_cloud', nextStageHour: g.clock.hour });
    const kids = mintJuveniles(g, cl, tank, betta, g.clock.hour, null);
    const h = Math.floor(g.clock.hour);
    expect(kids[0].morphName).toBe('Royal Blue Butterfly Halfmoon');
    expect(g.progress.discoveredAt?.['betta:Royal Blue Butterfly Halfmoon']).toBe(h);
    expect(g.progress.discoveredAt?.['betta:royal_butterfly_hm']).toBe(h);
    // the stamp itself: the rng state is untouched
    const rng = g.rngState;
    stampDiscovery(g, 'betta:Some New Morph');
    registerDiscovery(g, { ...kids[0], speciesId: 'axolotl', morphName: 'Copper' });
    expect(g.rngState).toBe(rng);
    expect(g.progress.discoveredAt?.axolotl).toBe(h);
  });

  it('never dates a name every object inherits', () => {
    const g = game();
    const before = Object.keys(g.progress.discoveredAt ?? {});
    stampDiscovery(g, '__proto__');
    stampDiscovery(g, 'constructor');
    stampDiscovery(g, 'toString');
    stampDiscovery(g, '');
    // (review N9: the old prototype check could not fail; these can: without the guard 'constructor', 'toString' and
    // '' would be dated)
    expect(Object.keys(g.progress.discoveredAt ?? {})).toEqual(before);
    for (const k of ['constructor', 'toString', '']) expect(Object.hasOwn(g.progress.discoveredAt!, k)).toBe(false);
  });
});

describe('progress.discoveredAt in a save', () => {
  it('a game with dates round-trips with no repairs and the same hash twice', () => {
    const g = game();
    const once = roundTrip(g);
    expect(once.repairs).toEqual([]);
    expect(once.state.progress.discoveredAt).toEqual(g.progress.discoveredAt);
    const twice = roundTrip(once.state);
    expect(twice.repairs).toEqual([]);
    expect(stateHash(twice.state)).toBe(stateHash(once.state));
  });

  it('absent (an older save): no repair, it stays absent and the stateHash is as it was', () => {
    const g = game();
    delete g.progress.discoveredAt;
    const before = stateHash(g);
    const withUndefined = clonePlain(g);
    withUndefined.progress.discoveredAt = undefined;
    expect(stateHash(withUndefined)).toBe(before);
    const back = roundTrip(g);
    expect(back.repairs).toEqual([]);
    expect(back.state.progress.discoveredAt).toBeUndefined();
    expect(stateHash(back.state)).toBe(stateHash(roundTrip(back.state).state));
  });

  it('a record that isn’t one is removed with a note', () => {
    const g = game();
    const raw = clonePlain(g) as unknown as Record<string, unknown>;
    ((raw as unknown as GameState).progress as unknown as Record<string, unknown>).discoveredAt = ['betta'];
    expect(repairState(raw)).toContain('progress.discoveredAt: unreadable, removed');
    expect((raw as unknown as GameState).progress.discoveredAt).toBeUndefined();
  });

  // Review N2 (changed on purpose): a date whose key this build doesn't list is kept, not removed. A newer build may date
  // a kind of find this one doesn't know, and its save must never lose anything here; the Collection reads only the
  // dates of finds in its lists (see "recently found").
  it('keeps every finite hour under a usable key, known or not; unreadable ones are removed with notes', () => {
    const g = game();
    const at = g.progress.discoveredAt!;
    const raw = clonePlain(g) as unknown as GameState;
    const dates = raw.progress.discoveredAt as Record<string, unknown>;
    dates.axolotl = 12; // not a discovery here
    dates['betta:Made Up'] = 3; // not a morph this build knows
    dates['egg:betta:cl_9'] = 40; // a kind of find a newer build might date
    dates[raw.progress.discoveredSpecies[0]] = 'soon'; // a discovery, unreadable
    dates['betta:Other'] = null; // unreadable
    dates['constructor'] = 5;
    Object.defineProperty(dates, '__proto__', { value: 7, enumerable: true, configurable: true, writable: true });
    const repairs = repairState(raw as unknown as Record<string, unknown>);
    // (inherited names go first, in the save-wide scrub; the record's own check takes the other two)
    expect(repairs).toEqual(expect.arrayContaining(['progress.discoveredAt: key "constructor" is not a valid id, removed', 'progress.discoveredAt: key "__proto__" is not a valid id, removed', 'progress.discoveredAt: 2 unreadable dates removed']));
    const { [raw.progress.discoveredSpecies[0]]: _gone, ...rest } = at;
    expect(raw.progress.discoveredAt).toEqual({ ...rest, axolotl: 12, 'betta:Made Up': 3, 'egg:betta:cl_9': 40 });
    expect(Object.hasOwn(raw.progress.discoveredAt!, '__proto__')).toBe(false);
    // the save with them round-trips with no repairs
    expect(roundTrip(raw).repairs).toEqual([]);
  });

  it('a record far beyond every find there is is trimmed to the first 30,000 dates, with a note', () => {
    const g = game();
    const raw = clonePlain(g) as unknown as GameState;
    const dates = raw.progress.discoveredAt as Record<string, number>;
    const n = Object.keys(dates).length;
    for (let i = 0; i < 30_005; i++) dates[`made:up:${i}`] = i;
    const repairs = repairState(raw as unknown as Record<string, unknown>);
    expect(repairs).toContain(`progress.discoveredAt: ${n + 30_005 - 30_000} beyond 30000 removed`);
    const kept = Object.keys(raw.progress.discoveredAt!);
    expect(kept).toHaveLength(30_000);
    expect(kept.slice(0, n)).toEqual(Object.keys(g.progress.discoveredAt!)); // the oldest written are kept
  });
});

// ───────────────────────────── the percentage ─────────────────────────────

describe('the Collection’s numbers', () => {
  it('a new betta game: one species, its one morph, every species weighed the same', () => {
    const g = game();
    const s = collectionSummary(g);
    const bettaTotal = morphCatalog(betta).entries.length;
    expect(s).toMatchObject({ speciesFound: 1, speciesTotal: N, morphsSeen: 1, prismatic: 0 });
    expect(s.morphsTotal).toBe(ALL_SPECIES.filter(named).reduce((n, sp) => n + morphCatalog(sp).entries.length, 0));
    expect(s.strainsTotal).toBe(ALL_SPECIES.reduce((n, sp) => n + (sp.genetics.strains?.length ?? 0), 0));
    expect(s.percent).toBe(Math.floor((1000 * (0.5 + 0.5 / bettaTotal)) / N) / 10);
    expect(s.percent).toBeGreaterThan(0);
    expect(collectionPercent(g)).toBe(s.percent);
  });

  it('a species with no named colour morphs counts in full once found, and its morphs count nowhere', () => {
    const g = game();
    const tang = getSpecies('yellow_tang');
    expect(hasNoNamedMorphs(tang)).toBe(true);
    const before = collectionSummary(g);
    g.progress.discoveredSpecies.push('yellow_tang');
    g.progress.discoveredMorphs.push('yellow_tang:Richly coloured Yellow Tang');
    const after = collectionSummary(g);
    expect(after.morphsSeen).toBe(before.morphsSeen);
    expect(after.morphsTotal).toBe(before.morphsTotal);
    expect(after.speciesFound).toBe(2);
    expect(speciesProgress(g, tang)).toMatchObject({ found: true, noMorphs: true, morphsTotal: 0, score: 1, status: 'complete' });
    expect(collectionPercent(g)).toBe(after.percent);
  });

  it('reads 100 only when every species and every morph is in; one morph short reads less', () => {
    const g = game();
    g.progress.discoveredSpecies = ALL_SPECIES.map((sp) => sp.id);
    g.progress.discoveredMorphs = ALL_SPECIES.filter(named).flatMap((sp) => morphCatalog(sp).entries.map((e) => `${sp.id}:${e.morphName}`));
    expect(collectionSummary(g).percent).toBe(100);
    expect(collectionCards(g).every((c) => c.status === 'complete')).toBe(true);
    g.progress.discoveredMorphs.pop();
    const p = collectionSummary(g).percent;
    expect(p).toBeLessThan(100);
    expect(formatPercent(p)).not.toBe('100%');
    expect(collectionPercent(g)).toBe(p);
  });

  it('a morph name the catalog doesn’t know is not counted', () => {
    const g = game();
    const s = collectionSummary(g).morphsSeen;
    g.progress.discoveredMorphs.push('betta:Not A Real Morph');
    expect(collectionSummary(g).morphsSeen).toBe(s);
  });

  it('formats a tenth below 10 and whole numbers above, never rounding up', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.5)).toBe('0.5%');
    expect(formatPercent(9.99)).toBe('9.9%');
    expect(formatPercent(12.9)).toBe('12%');
    expect(formatPercent(99.9)).toBe('99%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(Number.NaN)).toBe('0%');
    expect(formatPercent(0.05)).toBe('0%');
  });
});

describe('the cards: status, filters and order', () => {
  it('statuses, and the default order puts in-progress first (most seen first), then complete, then not started', () => {
    const g = game();
    g.progress.discoveredSpecies.push('yellow_tang', 'axolotl'); // complete; found with nothing seen
    g.progress.discoveredMorphs.push('axolotl:Wild Type', 'axolotl:Leucistic');
    const cards = collectionCards(g);
    expect(cards.map((c) => c.status)).toEqual([...cards].sort(compareCards).map((c) => c.status));
    const order = cards.map((c) => c.speciesId);
    expect(order.indexOf('axolotl')).toBeLessThan(order.indexOf('betta')); // 2 of 7 seen before 1 of 540
    expect(order.indexOf('betta')).toBeLessThan(order.indexOf('yellow_tang'));
    expect(cards.find((c) => c.speciesId === 'neon_tetra')?.status).toBe('not_started');
    const firstNotStarted = cards.findIndex((c) => c.status === 'not_started');
    expect(cards.slice(0, firstNotStarted).every((c) => c.status !== 'not_started')).toBe(true);
    expect(cards.slice(firstNotStarted).every((c) => c.status === 'not_started')).toBe(true);
  });

  it('filters by status and by water type', () => {
    const g = game();
    g.progress.discoveredSpecies.push('yellow_tang');
    expect(collectionCards(g, { status: 'complete' }).map((c) => c.speciesId)).toEqual(['yellow_tang']);
    expect(collectionCards(g, { status: 'in_progress' }).map((c) => c.speciesId)).toEqual(['betta']);
    const marine = collectionCards(g, { env: 'marine' });
    expect(marine.length).toBe(ALL_SPECIES.filter((sp) => sp.environment === 'marine').length);
    expect(marine.every((c) => c.environment === 'marine')).toBe(true);
    expect(collectionCards(g, { status: 'complete', env: 'freshwater' })).toEqual([]);
    expect(collectionCards(g, { status: 'not_started' }).length).toBe(N - 2);
  });
});

// ───────────────────────────── a card's morphs ─────────────────────────────

describe('missing morphs: the hint and how to find it', () => {
  it('seen plus missing is the whole catalog; missing comes easiest first', () => {
    const g = game();
    const { seen, missing } = speciesMorphs(g, betta);
    expect(seen.length + missing.length).toBe(morphCatalog(betta).entries.length);
    const freq = new Map(morphCatalog(betta).entries.map((e) => [e.morphName, e.frequency]));
    for (let i = 1; i < missing.length; i++) expect(freq.get(missing[i - 1].morphName)!).toBeGreaterThanOrEqual(freq.get(missing[i].morphName)!);
  });

  it('never names a trait the player hasn’t seen, in the hint or in how to find it', () => {
    for (const id of ['betta', 'fancy_guppy', 'koi', 'axolotl', 'cherry_shrimp', 'neon_tetra']) {
      const sp = getSpecies(id);
      const cat = morphCatalog(sp);
      const g = game();
      // a few morphs seen: the most common one and one rare one
      g.progress.discoveredMorphs = [`${id}:${cat.entries[0].morphName}`, `${id}:${cat.entries[cat.entries.length - 1].morphName}`];
      const seenNames = new Set(cat.entries.filter((e) => g.progress.discoveredMorphs.includes(`${id}:${e.morphName}`)).map((e) => e.morphName));
      const seen = seenTraitIds(sp, seenNames);
      const seenWords = sp.genetics.phenotypes.filter((r) => seen.has(r.id)).map((r) => r.name.toLowerCase());
      const unseen = sp.genetics.phenotypes.filter((r) => !seen.has(r.id) && r.when.length > 0 && !seenWords.some((w) => w.includes(r.name.toLowerCase())));
      for (const m of speciesMorphs(g, sp).missing) {
        for (const r of unseen) {
          expect(m.hint.toLowerCase().split(' · ')).not.toContain(r.name.toLowerCase());
          expect(m.how.toLowerCase()).not.toMatch(new RegExp(`\\b${r.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
        }
        expect(m.hint).toBe(catalogHint(sp, cat.byName.get(m.morphName)!, seen));
      }
    }
  });

  it('common and uncommon morphs, and species whose young can’t show new morphs, get the sellers’ line', () => {
    const cat = morphCatalog(betta);
    const all = new Set(betta.genetics.phenotypes.map((r) => r.id));
    for (const e of cat.entries.filter((x) => x.tier === 'common' || x.tier === 'uncommon')) expect(howToFind(betta, e, all)).toBe(SELLER_LINE[e.tier]);
    // the anemone splits into clones; a species not bred in the game
    for (const id of ['bubbletip_anemone', 'naso_tang']) {
      const sp = getSpecies(id);
      for (const e of morphCatalog(sp).entries) expect(howToFind(sp, e, new Set(sp.genetics.phenotypes.map((r) => r.id)))).toBe(SELLER_LINE[e.tier]);
    }
  });

  it('a rare morph with a two-copy trait: “both parents carry” the seen trait, or a trait not seen yet', () => {
    const cat = morphCatalog(betta);
    const twoCopy = (id: string) => betta.genetics.phenotypes.find((r) => r.id === id)?.when.some((c) => c.count === 'hom' || c.count === 'none');
    const e = cat.entries.find((x) => (x.tier === 'rare' || x.tier === 'very_rare') && x.traitIds.some(twoCopy))!;
    expect(e).toBeDefined();
    const all = new Set(betta.genetics.phenotypes.map((r) => r.id));
    const both = e.traitIds.filter(twoCopy).map((id) => betta.genetics.phenotypes.find((r) => r.id === id)!.name);
    expect(howToFind(betta, e, all)).toBe(`Shows when both parents carry ${both.length === 1 ? both[0] : `${both.slice(0, -1).join(', ')} and ${both[both.length - 1]}`}.`);
    expect(howToFind(betta, e, new Set())).toBe('Shows when both parents carry a trait you haven’t seen yet.');
    // a seen two-copy trait beside an unseen one-copy trait: the unseen one is mentioned, never named
    const rule = (id: string) => betta.genetics.phenotypes.find((r) => r.id === id)!;
    const mixed = cat.entries.find((x) => x.tier !== 'common' && x.tier !== 'uncommon' && x.traitIds.some(twoCopy) && x.traitIds.some((id) => !twoCopy(id) && rule(id).when.length > 0))!;
    expect(mixed).toBeDefined();
    const hidden = mixed.traitIds.find((id) => !twoCopy(id) && rule(id).when.length > 0)!;
    const partial = new Set([...all].filter((id) => id !== hidden));
    const named = mixed.traitIds.filter(twoCopy).map((id) => rule(id).name);
    const line = howToFind(betta, mixed, partial);
    expect(line).toBe(`Shows when both parents carry ${named.length === 1 ? named[0] : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`}. It also needs a trait you haven’t seen yet.`);
    expect(line).not.toContain(rule(hidden).name);
  });
});

// ───────────────────────────── recently found ─────────────────────────────

describe('recently found', () => {
  it('newest first, a species and its first morph in one row, with the game day', () => {
    const g = game();
    const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Shoal' });
    g.clock.hour += 48;
    const o = generateOffer(g, simRng(g), 'neon_tetra', { expiresHour: g.clock.hour + 24, sexes: [undefined] })!;
    g.market.stock.push(o);
    expect(buyOffer(g, o.id, tank.id).ok).toBe(true);
    const rows = recentFinds(g, 5);
    const h = Math.floor(g.clock.hour);
    expect(rows[0]).toMatchObject({ speciesId: 'neon_tetra', hour: h, day: Math.floor(h / 24) + 1, newSpecies: true, morphs: [o.creatures[0].morphName] });
    expect(rows[1]).toMatchObject({ speciesId: 'betta', newSpecies: true });
    expect(recentFinds(g, 1)).toHaveLength(1);
  });

  it('reads only dates of finds in the lists (a newer build’s or a stray date never names anything)', () => {
    const g = game();
    const before = recentFinds(g);
    g.progress.discoveredAt = { ...g.progress.discoveredAt, axolotl: 900, 'axolotl:Copper': 900, 'betta:Made Up': 900, 'egg:betta:cl_9': 900 };
    expect(recentFinds(g)).toEqual(before);
  });

  it('an older save without dates shows only what carries its own hour (Prismatic finds)', () => {
    const g = game();
    delete g.progress.discoveredAt;
    expect(recentFinds(g)).toEqual([]);
    const c = Object.values(g.creatures)[0];
    g.progress.prismaticFinds = [{ speciesId: 'betta', creatureId: c.id, name: c.name, morphName: c.morphName, origin: 'shop', hour: 30.5 }];
    expect(recentFinds(g)).toEqual([{ speciesId: 'betta', hour: 30, day: 2, newSpecies: false, morphs: [], strains: [], prismatic: [c.name] }]);
  });
});

// ───────────────────────────── nearly there ─────────────────────────────

describe('nearly there', () => {
  it('suggests in-progress species nearest completion, then an undiscovered species in the shop', () => {
    const g = game();
    g.market.stock = [];
    g.progress.discoveredSpecies.push('axolotl');
    g.progress.discoveredMorphs.push('axolotl:Wild Type', 'axolotl:Leucistic');
    let tips = nearlyThere(g, 3);
    expect(tips.map((t) => t.kind)).toEqual(['species', 'species']);
    expect(tips[0]).toMatchObject({ kind: 'species', speciesId: 'axolotl', seen: 2, total: morphCatalog(getSpecies('axolotl')).entries.length });
    const o = generateOffer(g, simRng(g), 'neon_tetra', { expiresHour: g.clock.hour + 24, sexes: [undefined] })!;
    g.market.stock.push(o);
    tips = nearlyThere(g, 3);
    expect(tips[2]).toEqual({ kind: 'shop', speciesId: 'neon_tetra', offerId: o.id });
    expect(nearlyThere(g, 1)).toHaveLength(1);
  });

  it('a bonded pair whose young could show a missing morph comes first, shown only by its hint', () => {
    const g = game(5);
    const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Pair' });
    // carriers: each parent shows Red Veiltail and carries Halfmoon fins
    const genome = normalizeGenome(betta, { alleles: { color: ['red', 'red'], pattern: ['solid', 'solid'], fins: ['veil', 'halfmoon'] }, potentials: {} as Genome['potentials'] });
    const mom = addCreature(g, createCreature(g, simRng(g), 'betta', { sex: 'female', ageDays: 120, genome, name: 'Ruby' }), tank.id);
    const dad = addCreature(g, createCreature(g, simRng(g), 'betta', { sex: 'male', ageDays: 120, genome: clonePlain(genome), name: 'Blaze' }), tank.id);
    expect(bestPairFind(g)).toBeNull(); // not a pair yet
    mom.repro.partnerId = dad.id;
    dad.repro.partnerId = mom.id;
    const pair = bestPairFind(g)!;
    expect(pair).toMatchObject({ kind: 'pair', speciesId: 'betta', names: ['Ruby', 'Blaze'] });
    expect(pair.chance).toBeGreaterThanOrEqual(PAIR_MIN_CHANCE);
    const names = new Set(g.progress.discoveredMorphs.filter((k) => k.startsWith('betta:')).map((k) => k.slice(6)));
    const seen = seenTraitIds(betta, names);
    // the hint is the catalog's own for some missing morph, and names only seen traits
    const missing = morphCatalog(betta).entries.filter((e) => !names.has(e.morphName));
    expect(missing.some((e) => catalogHint(betta, e, seen) === pair.hint)).toBe(true);
    expect(nearlyThere(g, 3)[0]).toEqual(pair);
    // a dead partner is no pair
    dad.status = 'dead';
    expect(bestPairFind(g)).toBeNull();
  });

  it('another aquarium with the same animal ids never reads this one’s pair odds (review S6)', () => {
    const pairIn = (color: [string, string], fins: [string, string]) => {
      const g = game(5);
      const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Pair' });
      const genome = normalizeGenome(betta, { alleles: { color, pattern: ['solid', 'solid'], fins }, potentials: {} as Genome['potentials'] });
      const mom = addCreature(g, createCreature(g, simRng(g), 'betta', { sex: 'female', ageDays: 120, genome, name: 'Ruby' }), tank.id);
      const dad = addCreature(g, createCreature(g, simRng(g), 'betta', { sex: 'male', ageDays: 120, genome: clonePlain(genome), name: 'Blaze' }), tank.id);
      mom.repro.partnerId = dad.id;
      dad.repro.partnerId = mom.id;
      return { g, mom, dad };
    };
    const a = pairIn(['red', 'red'], ['veil', 'halfmoon']);
    const first = bestPairFind(a.g)!;
    expect(first).not.toBeNull();
    // a new game with the same seed: the same ids, other genes (the old cache, keyed by ids, answered with a's odds)
    const b = pairIn(['royal', 'royal'], ['crown', 'crown']);
    expect([b.mom.id, b.dad.id]).toEqual([a.mom.id, a.dad.id]);
    expect(pairOddsKey(betta, b.mom, b.dad)).not.toBe(pairOddsKey(betta, a.mom, a.dad));
    const second = bestPairFind(b.g)!;
    // what b's own genes give, worked out afresh
    const cat = morphCatalog(betta);
    const names = new Set(b.g.progress.discoveredMorphs.filter((k) => k.startsWith('betta:')).map((k) => k.slice(6)));
    const fresh = predictOffspringMorphs(betta, b.mom.genome, b.dad.genome)
      .filter((o) => cat.byName.has(o.morphName) && !names.has(o.morphName) && o.chance >= PAIR_MIN_CHANCE)
      .sort((x, y) => y.chance - x.chance)[0];
    expect(second).toMatchObject({ chance: fresh.chance, hint: catalogHint(betta, cat.byName.get(fresh.morphName)!, seenTraitIds(betta, names)) });
    expect(second).not.toEqual(first);
    // and back in the first aquarium, its own odds again
    expect(bestPairFind(a.g)).toEqual(first);
  });
});

// ───────────────────────────── one morph count ─────────────────────────────

describe('one morph count (review S7)', () => {
  afterEach(() => useGame.setState({ game: null }));

  it('after a yellow tang joins, the Collection counts the morphs it collects, and the subtitle has no other count', () => {
    const g = game();
    const tang = addCreature(g, createCreature(g, simRng(g), 'yellow_tang', { ageDays: 200, name: 'Sunny' }), null);
    registerDiscovery(g, tang); // as buying records it
    expect(g.progress.discoveredMorphs).toHaveLength(2); // the betta's and the tang's
    const s = collectionSummary(g); // builds every catalog, so the subtitle's percentage is ready below
    expect(s.morphsSeen).toBe(1); // a species with no named colour morphs has none to count
    expect(s.morphsSeen).toBe(collectionCards(g).reduce((n, c) => n + c.morphsSeen, 0));
    useGame.setState({ game: g });
    const html = renderToStaticMarkup(createElement(EncyclopediaPanel));
    const sub = /class="pn-head__sub"[^>]*>(.*?)<\/div>/.exec(html)?.[1].replace(/<[^>]+>/g, '') ?? '';
    expect(sub).toBe(`${formatPercent(s.percent)} collected · 2 of ${N} species discovered`);
    expect(sub).not.toMatch(/morph/);
  });
});

// ───────────────────────────── the view, server-rendered ─────────────────────────────

describe('the Collection view (server-rendered)', () => {
  const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const tag = (markup: string, testId: string) => new RegExp(`<[^>]*data-testid="${testId}"[^>]*>`).exec(markup)?.[0] ?? '';
  // (every catalog built first, as the warm-up does before the view shows its numbers: ui-collection-warmup.test.ts
  // covers the view while they are still being built)
  const view = (g: GameState, open: string | null) => {
    collectionSummary(g);
    return renderToStaticMarkup(
      createElement(CollectionView, {
        g,
        open,
        onOpen: () => {},
        reveal: 0,
        availability: () => ({ text: 'Unlocked to buy', available: true }),
        onSpeciesPage: () => {},
        onOffer: () => {},
      }),
    );
  };

  it('the header, the empty recent list of an older save, and a discovered and an undiscovered card', () => {
    const g = game();
    delete g.progress.discoveredAt;
    const html = view(g, null);
    const s = collectionSummary(g);
    expect(/data-testid="collection-percent"[^>]*>([^<]*)</.exec(html)?.[1]).toBe(formatPercent(s.percent));
    expect(text(html)).toContain('Your collection');
    expect(text(html)).toContain('Each species counts the same: half for finding it, half for the morphs you have seen. A species with no named colour morphs counts in full once found.');
    expect(text(html)).toContain('Your next finds will show here, with the day you found them.');
    expect(tag(html, 'collection-card-betta')).toContain('data-status="in_progress"');
    expect(tag(html, 'collection-card-betta')).toContain('data-found="1"');
    expect(tag(html, 'collection-card-axolotl')).toContain('data-status="not_started"');
    expect(tag(html, 'collection-card-axolotl')).toContain('data-found="0"');
    expect(tag(html, 'collection-toggle-betta')).toContain('aria-expanded="false"');
    expect(text(html)).toContain(`Freshwater · 1 of ${morphCatalog(betta).entries.length} morphs`);
    expect(text(html)).toContain(`Freshwater · Unlocked to buy · ${morphCatalog(getSpecies('axolotl')).entries.length} morphs to find`);
    // an undiscovered species is never named
    expect(text(html)).not.toMatch(/Axolotl/);
  });

  it('an open card lists missing morphs as hints with their tier and how to find them, then the seen ones', () => {
    const g = game();
    const html = view(g, 'betta');
    expect(tag(html, 'collection-toggle-betta')).toContain('aria-expanded="true"');
    const missing = speciesMorphs(g, betta).missing;
    expect(html.match(/data-testid="collection-missing"/g)).toHaveLength(12);
    expect(text(html)).toContain(`Still to find · ${missing.length}`);
    expect(text(html)).toContain(`Not yet seen: ${missing[0].hint}`);
    expect(text(html)).toContain(missing[0].how);
    expect(text(html)).toContain(`Show 24 more`);
    expect(text(html)).toContain('Seen · 1');
    expect(text(html)).toContain('Open species page');
    expect(text(html)).toContain('Recently found');
    expect(text(html)).toContain('New species · New morph:');
  });

  it('an open undiscovered card says how to start it, without naming it', () => {
    const g = game();
    const html = view(g, 'axolotl');
    expect(text(html)).toContain('Find this species to start its card.');
    expect(html).not.toContain('data-testid="collection-missing"');
    expect(text(html)).not.toMatch(/Axolotl/);
  });
});
