/**
 * lane:genetics — the morph catalog (every phenotype the existing genetics can express, with Hardy–Weinberg market
 * frequency) and named strains (recipes over phenotype rule ids): reachability, order independence, specificity,
 * validation, offspring forecasts sharing the breeding enumeration, and the strain value premium + genetic ceiling.
 */
import { describe, it, expect } from 'vitest';
import type { Genome, MorphStrain, SpeciesDefinition } from '@/types';
import { ALL_SPECIES, getSpecies } from '@/data/species';
import { MAX_GENETIC_MULTIPLIER, RARITY_TIERS, STRAIN_VALUE } from '@/data/rarity';
import { mulberry32, hashString } from '@/sim/rng';
import { newGame } from '@/sim/newGame';
import { createCreature } from '@/sim/life';
import { normalizeGenome, predictOffspringMorphs, predictOffspringPhenotypes, resolveMorph, rollGenome } from '@/sim/life/genetics';
import { matchStrains, morphCatalog, predictOffspringStrains, strainOf, strainTier, tierForShare, validateStrains } from '@/sim/life/morphCatalog';
import { creatureValue } from '@/sim/economy';

const betta = getSpecies('betta');
const g3 = (sp: SpeciesDefinition, alleles: Genome['alleles'], pot = 50): Genome =>
  normalizeGenome(sp, { alleles, potentials: { size: pot, color: pot, pattern: pot, structure: pot, fertility: pot, hardiness: pot, temperament: 50, curiosity: 50 } });
const bettaG = (color: [string, string], pattern: [string, string], fins: [string, string], pot = 50) => g3(betta, { color, pattern, fins }, pot);

describe('morph catalog', () => {
  it('covers every species exactly, and the market shares sum to 1', () => {
    for (const sp of ALL_SPECIES) {
      const cat = morphCatalog(sp);
      expect(cat.exact, sp.id).toBe(true);
      const sum = cat.phenotypes.reduce((a, p) => a + p.frequency, 0);
      expect(Math.abs(sum - 1), sp.id).toBeLessThan(1e-9);
      expect(cat.entries.length, sp.id).toBeGreaterThan(0);
    }
  });

  it('contains every morph market stock actually rolls (400 seeded genomes per species)', () => {
    for (const sp of ALL_SPECIES) {
      const cat = morphCatalog(sp);
      const rng = mulberry32(hashString(`catalog-test:${sp.id}`));
      for (let i = 0; i < 400; i++) {
        const name = resolveMorph(sp, rollGenome(sp, rng)).morphName;
        expect(cat.byName.has(name), `${sp.id}: ${name}`).toBe(true);
      }
    }
  });

  it('frequencies agree with what market stock rolls (seeded sample, betta)', () => {
    const cat = morphCatalog(betta);
    const rng = mulberry32(99);
    const seen = new Map<string, number>();
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const n = resolveMorph(betta, rollGenome(betta, rng)).morphName;
      seen.set(n, (seen.get(n) ?? 0) + 1);
    }
    for (const e of [...cat.entries].sort((a, b) => b.frequency - a.frequency).slice(0, 6)) {
      expect(Math.abs((seen.get(e.morphName) ?? 0) / N - e.frequency), e.morphName).toBeLessThan(0.015);
    }
  });

  it('betta: 8 reachable base colours × 30 pattern/fin combinations, the colour tree', () => {
    const cat = morphCatalog(betta);
    expect(cat.groups.map((g) => g.name)).toEqual(['Red', 'Royal Blue', 'Turquoise', 'Steel Blue', 'Copper', 'Black Melano', 'Yellow', 'Opaque White']);
    for (const g of cat.groups) expect(g.entries).toHaveLength(30);
    expect(cat.entries).toHaveLength(240);
    expect(cat.byName.get('Red Veiltail')?.tier).toBe('common');
    expect(cat.byName.get('Royal Blue Butterfly Halfmoon')?.strains[0]?.id).toBe('royal_butterfly_hm');
  });

  it('tiers follow the share of market stock', () => {
    expect(tierForShare(0.5)).toBe('common');
    expect(tierForShare(0.05)).toBe('uncommon');
    expect(tierForShare(0.01)).toBe('rare');
    expect(tierForShare(0.002)).toBe('very_rare');
    expect(tierForShare(0.0001)).toBe('legendary');
  });

  it('builds every catalog quickly', () => {
    const t0 = performance.now();
    for (const sp of ALL_SPECIES) morphCatalog({ ...sp, id: `${sp.id}__timing` });
    expect(performance.now() - t0).toBeLessThan(5000);
  });
});

describe('named strains', () => {
  it('every shipped recipe is valid, reachable and unambiguous', () => {
    for (const sp of ALL_SPECIES) expect(validateStrains(sp), sp.id).toEqual([]);
  });

  it('shipped tiers stay within one step of how often stock shows the combination', () => {
    for (const sp of ALL_SPECIES) {
      const cat = morphCatalog(sp);
      for (const s of sp.genetics.strains ?? []) {
        const share = cat.phenotypes.filter((p) => s.requires.every((r) => p.ruleIds.includes(r)) && !(s.excludes ?? []).some((r) => p.ruleIds.includes(r))).reduce((a, p) => a + p.frequency, 0);
        const derived = RARITY_TIERS.indexOf(tierForShare(share));
        const shipped = RARITY_TIERS.indexOf(strainTier(sp, s));
        expect(Math.abs(derived - shipped), `${sp.id}:${s.id}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('matching is order-independent and the most specific strain wins', () => {
    const a = matchStrains(betta, ['royal', 'butterfly', 'halfmoon']).map((s) => s.id);
    const b = matchStrains(betta, ['halfmoon', 'royal', 'butterfly']).map((s) => s.id);
    expect(a).toEqual(b);
    expect(a[0]).toBe('royal_butterfly_hm');
    expect(a).toContain('blue_butterfly');
    expect(matchStrains(betta, ['butterfly', 'royal'])[0]?.id).toBe('blue_butterfly');
    expect(matchStrains(betta, ['royal'])).toEqual([]);
  });

  it('strainOf reads the genome through the existing expression rules', () => {
    expect(strainOf(betta, bettaG(['black', 'black'], ['dragon', 'dragon'], ['veil', 'veil']))?.id).toBe('black_samurai');
    // a recessive carried but not shown never names a strain
    expect(strainOf(betta, bettaG(['red', 'black'], ['dragon', 'dragon'], ['veil', 'veil']))?.id).toBe('red_dragon');
    expect(strainOf(betta, bettaG(['red', 'red'], ['solid', 'dragon'], ['veil', 'veil']))).toBeUndefined();
  });

  it('excludes keep a strain off phenotypes that show the excluded trait', () => {
    const sp: SpeciesDefinition = { ...betta, id: 'betta__excl', genetics: { ...betta.genetics, strains: [{ id: 'plain_royal', name: 'Plain Royal', requires: ['royal', 'veil'], excludes: ['butterfly'] }] } };
    expect(matchStrains(sp, ['royal', 'veil']).map((s) => s.id)).toEqual(['plain_royal']);
    expect(matchStrains(sp, ['royal', 'veil', 'butterfly'])).toEqual([]);
    expect(validateStrains(sp)).toEqual([]);
  });

  it('the validator catches broken recipes', () => {
    const bad = (id: string, strains: MorphStrain[]): SpeciesDefinition => ({ ...betta, id, genetics: { ...betta.genetics, strains } });
    const issues = validateStrains(
      bad('betta__bad1', [
        { id: 'two_bases', name: 'Two Bases', requires: ['royal', 'red'] },
        { id: 'two_bases', name: 'Dup Id', requires: ['royal', 'veil'] },
        { id: 'ghost', name: 'Ghost', requires: ['nope'] },
        { id: 'clash', name: 'Clash', requires: ['royal', 'butterfly'], excludes: ['royal'] },
        { id: 'twin_a', name: 'Twin A', requires: ['steel', 'crown'] },
        { id: 'twin_b', name: 'Twin B', requires: ['crown', 'steel'] },
        { id: 'empty', name: 'Empty', requires: [] },
      ]),
    ).map((i) => i.message);
    expect(issues.some((m) => /two base colours/.test(m))).toBe(true);
    expect(issues.some((m) => /duplicate strain id/.test(m))).toBe(true);
    expect(issues.some((m) => /unknown phenotype rule "nope"/.test(m))).toBe(true);
    expect(issues.some((m) => /requires and excludes royal/.test(m))).toBe(true);
    expect(issues.some((m) => /same recipe as "twin_a"/.test(m))).toBe(true);
    expect(issues.some((m) => /requires no traits/.test(m))).toBe(true);

    const unreachable = validateStrains(bad('betta__bad2', [{ id: 'never', name: 'Never', requires: ['butterfly', 'marble'], tier: 'legendary' }]));
    expect(unreachable.map((i) => i.message)).toEqual([expect.stringMatching(/unreachable/)]);

    const ambiguous = validateStrains(
      bad('betta__bad3', [
        { id: 'royal_hm', name: 'Royal HM', requires: ['royal', 'halfmoon'], tier: 'rare' },
        { id: 'royal_bf', name: 'Royal BF', requires: ['royal', 'butterfly'], tier: 'rare' },
      ]),
    );
    expect(ambiguous.some((i) => /ties with/.test(i.message))).toBe(true);
  });
});

describe('offspring forecasts share the breeding enumeration', () => {
  it('phenotype forecast aggregates to exactly the morph forecast', () => {
    const mom = bettaG(['royal', 'red'], ['butterfly', 'solid'], ['halfmoon', 'veil']);
    const dad = bettaG(['royal', 'black'], ['butterfly', 'dragon'], ['halfmoon', 'plakat']);
    const ph = predictOffspringPhenotypes(betta, mom, dad)!;
    expect(Math.abs(ph.reduce((a, p) => a + p.chance, 0) - 1)).toBeLessThan(1e-12);
    const byName = new Map<string, number>();
    for (const p of ph) byName.set(p.morphName, (byName.get(p.morphName) ?? 0) + p.chance);
    const morphs = predictOffspringMorphs(betta, mom, dad);
    expect(morphs.length).toBe(byName.size);
    for (const m of morphs) expect(byName.get(m.morphName)).toBeCloseTo(m.chance, 12);
  });

  it('strain forecast: a true-breeding royal butterfly halfmoon pair gives that strain every time', () => {
    const rbh = bettaG(['royal', 'royal'], ['butterfly', 'butterfly'], ['halfmoon', 'halfmoon']);
    const out = predictOffspringStrains(betta, rbh, rbh);
    expect(out).toHaveLength(1);
    expect(out[0].strain.id).toBe('royal_butterfly_hm');
    expect(out[0].chance).toBe(1);
  });

  it('strain forecast for carriers matches Mendelian odds (¼ show double tail)', () => {
    const carrier = bettaG(['red', 'red'], ['marble', 'marble'], ['double', 'crown']);
    const out = predictOffspringStrains(betta, carrier, carrier);
    expect(out.find((o) => o.strain.id === 'marble_double')?.chance).toBe(0.25);
  });
});

describe('named-strain value', () => {
  const g = newGame({ starterId: 'betta', starterName: 'Val', seed: 4 });
  const make = (genome: Genome) => createCreature(g, mulberry32(3), 'betta', { genome, ageDays: 120 });

  it('adds its tier premium once, as its own factor', () => {
    const rbh = make(bettaG(['royal', 'royal'], ['butterfly', 'butterfly'], ['halfmoon', 'halfmoon']));
    const v = creatureValue(g, rbh);
    const f = v.factors.filter((x) => x.label.startsWith('Named strain'));
    expect(f).toHaveLength(1);
    expect(f[0].label).toBe('Named strain: Royal Butterfly Halfmoon');
    expect(f[0].mult).toBe(STRAIN_VALUE.rare);
  });

  it('an animal of no strain gets no strain factor', () => {
    const plain = make(bettaG(['red', 'red'], ['solid', 'solid'], ['veil', 'veil']));
    expect(creatureValue(g, plain).factors.some((x) => x.label.startsWith('Named strain'))).toBe(false);
  });

  it('morph × strain × show qualities never exceeds the genetic ceiling', () => {
    const top = make(bettaG(['black', 'black'], ['dragon', 'dragon'], ['double', 'double'], 99));
    const v = creatureValue(g, top);
    const mult = (prefix: string) => v.factors.find((x) => x.label.startsWith(prefix))?.mult ?? 1;
    const stacked = mult('Morph:') * mult('Named strain') * mult('Show qualities');
    expect(stacked).toBeLessThanOrEqual(MAX_GENETIC_MULTIPLIER + 0.01);
    expect(mult('Named strain')).toBeLessThan(STRAIN_VALUE.legendary);
    expect(mult('Named strain')).toBeGreaterThan(1);
  });
});
