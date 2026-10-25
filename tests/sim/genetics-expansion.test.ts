// @vitest-environment node
/**
 * lane:genetics — chunk 2 (0.5 spec §8): the Cambodian and Metallic betta genes, the Cambodian Veiltail strain, the
 * `rare` allele flags, the 540-entry betta catalog under the owner's tier rule (ADR-0022), the breeding forecast,
 * and bettas from older saves keeping their names (GEN-002 to GEN-009). B-136 (owner, ADR-0020): Opaque White and Double
 * Tail sit one step below yellow and crowntail, so their carriers read as hidden.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Genome, Potentials, SpeciesDefinition } from '@/types';
import { getSpecies, listSpecies } from '@/data/species';
import { allelePair, describeLocus, hiddenAlleles, mostCommonAllele, morphDisplayName, normalizeGenome, predictOffspringMorphs, predictOffspringPhenotypes, resolveMorph } from '@/sim/life/genetics';
import { morphCatalog, catalogEntry, strainTier, tierRank, validateStrains } from '@/sim/life/morphCatalog';
import { oneInLabel } from '@/sim/life/rareVariants';
import { createCreature, addCreature } from '@/sim/life';
import { creatureValue } from '@/sim/economy';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { encodeRecord, decodeRecord } from '@/persistence';
import { OffspringOdds } from '@/ui/panels/common/Offspring';

const betta = getSpecies('betta');
const P: Potentials = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };
const G = (alleles: Record<string, [string, string]>): Genome => ({ alleles, potentials: { ...P } });
const name = (alleles: Record<string, [string, string]>) => morphDisplayName(betta, resolveMorph(betta, G(alleles)).morphName);

describe('rare allele flags (GEN-002)', () => {
  // chunk 16 (ADR-0052): the maroon clownfish's Lightning and Gold Nugget genes and the Marquesan flame angel are the
  // collector-sought additions
  it('exactly twelve alleles are flagged rare, across every species', () => {
    const rare: string[] = [];
    for (const sp of listSpecies()) for (const l of sp.genetics.loci) for (const a of l.alleles) if (a.rare) rare.push(`${sp.id}:${l.id}:${a.id}`);
    expect(rare.sort()).toEqual(
      [
        'betta:cambodian:c',
        'betta:color:white',
        'betta:pattern:marble',
        'betta:pattern:dragon',
        'betta:fins:double',
        'ocellaris_clownfish:misbar:mb',
        'lined_seahorse:pinto:p',
        'axolotl:axanthic:ax',
        'axolotl:copper:c',
        'maroon_clownfish:lightning:L',
        'maroon_clownfish:nugget:G',
        'flame_angelfish:bars:m',
      ].sort(),
    );
  });
});

describe('Cambodian (GEN-003)', () => {
  const locus = betta.genetics.loci.find((l) => l.id === 'cambodian')!;
  it('is a mendelian recessive appended after fins, with the §8.3 alleles and note', () => {
    expect(betta.genetics.loci.map((l) => l.id)).toEqual(['color', 'pattern', 'fins', 'cambodian', 'metallic']);
    expect(locus).toMatchObject({ name: 'Cambodian', mode: 'mendelian' });
    expect(locus.alleles).toEqual([
      { id: 'C', name: 'Normal body', dominance: 2, frequency: 0.9 },
      { id: 'c', name: 'Cambodian', dominance: 1, frequency: 0.1, rare: true },
    ]);
    expect(locus.note).toBe('Game simplification: a single recessive that pales the body of red bettas (fins stay red). It has no visible effect on other colours, so non-red fish can carry it unseen.');
  });

  it('two copies on an expressed red name and colour the fish; on other colours it stays hidden', () => {
    expect(name({ color: ['red', 'yellow'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['c', 'c'] })).toBe('Red Cambodian Veiltail Betta');
    expect(name({ color: ['royal', 'red'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['c', 'c'] })).toBe('Red Cambodian Veiltail Betta');
    const royal = { color: ['royal', 'royal'] as [string, string], pattern: ['solid', 'solid'] as [string, string], fins: ['veil', 'veil'] as [string, string] };
    const hidden = resolveMorph(betta, G({ ...royal, cambodian: ['c', 'c'] }));
    const plain = resolveMorph(betta, G({ ...royal, cambodian: ['C', 'C'] }));
    expect(hidden.morphName).not.toContain('Cambodian');
    expect(hidden.visual).toEqual(plain.visual);
    const pale = resolveMorph(betta, G({ color: ['red', 'yellow'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['c', 'c'] }));
    expect(pale.visual.bodyColor).toBe('#e9c3b0');
    expect(pale.visual.bodyColor2).toBe('#d9a892');
    expect(pale.visual.bellyColor).toBe('#f2d6c8');
  });

  it('the overlay has rarity 0.25, so c/c is rarer than C/c', () => {
    expect(betta.genetics.phenotypes.find((r) => r.id === 'cambodian')!.rarity).toBe(0.25);
    const base = { color: ['red', 'yellow'] as [string, string], pattern: ['solid', 'solid'] as [string, string], fins: ['veil', 'veil'] as [string, string] };
    expect(resolveMorph(betta, G({ ...base, cambodian: ['c', 'c'] })).rarity).toBeGreaterThan(resolveMorph(betta, G({ ...base, cambodian: ['C', 'c'] })).rarity);
  });
});

describe('Metallic (GEN-004)', () => {
  const locus = betta.genetics.loci.find((l) => l.id === 'metallic')!;
  const base = { color: ['royal', 'yellow'] as [string, string], pattern: ['butterfly', 'marble'] as [string, string], fins: ['halfmoon', 'crown'] as [string, string] };
  it('is additive with the §8.3 alleles and note', () => {
    expect(locus).toMatchObject({ name: 'Metallic', mode: 'additive' });
    expect(locus.alleles).toEqual([
      { id: 'std', name: 'Standard sheen', dominance: 1, frequency: 0.88 },
      { id: 'me', name: 'Metallic', dominance: 1, frequency: 0.12 },
    ]);
    expect(locus.note).toBe('Game simplification: real metallic/iridescent scaling is polygenic and came from wild-species crosses. Here one copy adds a soft sheen and two copies give the full Metallic look.');
  });

  it('one copy adds an unnamed sheen; two copies add "Metallic" ahead of the pattern overlays', () => {
    const one = resolveMorph(betta, G({ ...base, metallic: ['me', 'std'] }));
    const none = resolveMorph(betta, G({ ...base, metallic: ['std', 'std'] }));
    expect(morphDisplayName(betta, one.morphName)).toBe('Royal Blue Butterfly Halfmoon Betta');
    expect(one.visual.metallic).toBeGreaterThan(none.visual.metallic);
    expect(name({ ...base, metallic: ['me', 'me'] })).toBe('Royal Blue Metallic Butterfly Halfmoon Betta');
    expect(name({ color: ['royal', 'royal'], pattern: ['dragon', 'dragon'], fins: ['veil', 'veil'], metallic: ['me', 'me'] })).toBe('Royal Blue Metallic Dragon Scale Veiltail Betta');
    expect(name({ color: ['royal', 'royal'], pattern: ['marble', 'marble'], fins: ['veil', 'veil'], metallic: ['me', 'me'] })).toBe('Royal Blue Metallic Marble Veiltail Betta');
  });

  it('no one-copy Metallic name exists', () => {
    expect(JSON.stringify(betta)).not.toContain('Soft Metallic');
  });

  it('the overlay has rarity 0.2: two copies are rarer than none, one copy adds nothing', () => {
    expect(betta.genetics.phenotypes.find((r) => r.id === 'metallic')!.rarity).toBe(0.2);
    const r = (m: [string, string]) => resolveMorph(betta, G({ ...base, metallic: m })).rarity;
    expect(r(['me', 'me'])).toBeGreaterThan(r(['std', 'std']));
    expect(r(['me', 'std'])).toBe(r(['std', 'std']));
  });
});

describe('strain, chips and notes (GEN-005)', () => {
  it('a tenth strain, Cambodian Veiltail, within one tier of its catalog tier; validateStrains is clean', () => {
    const strains = betta.genetics.strains!;
    expect(strains).toHaveLength(10);
    const s = strains.find((x) => x.id === 'cambodian_veil')!;
    expect(s).toEqual({ id: 'cambodian_veil', name: 'Cambodian Veiltail', requires: ['red', 'cambodian', 'veil'], tier: 'very_rare', note: 'A pale, flesh-pink body under flowing red veil fins — the classic Cambodian look.' });
    expect(validateStrains(betta)).toEqual([]);
    const entry = catalogEntry(betta, 'Red Cambodian Veiltail')!;
    expect(Math.abs(tierRank(strainTier(betta, s)) - tierRank(entry.tier))).toBeLessThanOrEqual(1);
  });

  it('the chips gain Cambodian and Metallic, and the notes gain one sentence', () => {
    expect(betta.visualMorphs.slice(-2)).toEqual(['Cambodian', 'Metallic']);
    const v04 =
      'Simplified: colour, pattern and finnage are three independent loci with a dominance ladder, and phenotype rules mirror that ladder (a trait shows when no higher-ranked allele is present). Real betta genetics is far richer — e.g. double tail is a recessive trait caused by a deletion in a zic1/zic4 regulatory element, elephant-ear fins involve kcnh8, and marble is associated with a transposable element, so marbles can change colour through life. Colour hexes are typical show-fish tones.';
    expect(betta.genetics.notes).toBe(`${v04} Cambodian and Metallic are single-gene simplifications too: Cambodian is a recessive that pales the body of red bettas, and one Metallic copy adds a soft sheen while two give the full Metallic look.`);
  });
});

// The tier rule changed on purpose after chunk 2 (owner, ADR-0022: Legendary below 1 in 10,000, was 1 in 1,000):
// Royal Blue Metallic Butterfly Halfmoon (1 in 9,804) moves from legendary to very_rare; 1/9/21/43/466 → 1/9/21/145/364.
describe('catalog under the owner’s tier rule (GEN-006, GEN-007, PERF-001 A2; ADR-0022)', () => {
  const genotypes = (sp: SpeciesDefinition) => sp.genetics.loci.reduce((n, l) => n * ((l.alleles.length * (l.alleles.length + 1)) / 2), 1);
  it('540 entries: Red 120, every other colour 60, from 72,900 genotypes', () => {
    const cat = morphCatalog(betta);
    expect(cat.exact).toBe(true);
    expect(genotypes(betta)).toBe(72_900);
    expect(cat.entries).toHaveLength(540);
    expect(cat.groups.map((g) => [g.name, g.entries.length])).toEqual([
      ['Red', 120],
      ['Royal Blue', 60],
      ['Turquoise', 60],
      ['Steel Blue', 60],
      ['Copper', 60],
      ['Black Melano', 60],
      ['Yellow', 60],
      ['Opaque White', 60],
    ]);
  });

  // chunk 6 (B-194, ADR-0034 decision 6): §8.5's frequencies are the genes' shares (geneticFrequency, unchanged); the
  // odds the game shows and the tiers now count the seller's pick, so rare looks read a little commoner and common ones a
  // little rarer (Red Veiltail 1 in 5 → 1 in 6), and 30 betta looks move a tier (364 → 341 Legendary)
  it('the §8.5 frequencies and tiers', () => {
    const at = (n: string) => {
      const e = catalogEntry(betta, n)!;
      return [e.tier, oneInLabel(e.frequency), oneInLabel(e.geneticFrequency)];
    };
    expect(at('Royal Blue Butterfly Halfmoon')).toEqual(['rare', '1 in 104', '1 in 143']);
    expect(at('Red Cambodian Veiltail')).toEqual(['very_rare', '1 in 518', '1 in 520']);
    expect(at('Red Metallic Veiltail')).toEqual(['very_rare', '1 in 385', '1 in 360']);
    expect(at('Royal Blue Metallic Butterfly Halfmoon')).toEqual(['very_rare', '1 in 6,534', '1 in 9,804']);
    expect(at('Royal Blue Metallic Marble Veiltail')).toEqual(['legendary', '1 in 42,339', '1 in 62,006']);
    expect(at('Red Veiltail')).toEqual(['common', '1 in 6', '1 in 5']);
    const tiers = { common: 0, uncommon: 0, rare: 0, very_rare: 0, legendary: 0 };
    for (const e of morphCatalog(betta).entries) tiers[e.tier]++;
    expect(tiers).toEqual({ common: 1, uncommon: 10, rare: 25, very_rare: 163, legendary: 341 });
  });
});

describe('breeding forecast (GEN-008)', () => {
  const solidVeil = { pattern: ['solid', 'solid'] as [string, string], fins: ['veil', 'veil'] as [string, string] };
  it('Red Cambodian Veiltail × a C/c Red Veiltail gives 50/50', () => {
    const odds = predictOffspringMorphs(betta, G({ color: ['red', 'red'], ...solidVeil, cambodian: ['c', 'c'] }), G({ color: ['red', 'yellow'], ...solidVeil, cambodian: ['C', 'c'] }));
    expect(odds).toEqual([
      { morphName: 'Red Veiltail', chance: 0.5 },
      { morphName: 'Red Cambodian Veiltail', chance: 0.5 },
    ]);
  });

  it('a red/copper C/c × red/royal c/c pair gives about 3 in 8 Red Cambodian young', () => {
    const odds = predictOffspringMorphs(betta, G({ color: ['red', 'royal'], ...solidVeil, cambodian: ['c', 'c'] }), G({ color: ['red', 'copper'], ...solidVeil, cambodian: ['C', 'c'] }));
    const cambodian = odds.filter((o) => o.morphName.startsWith('Red Cambodian')).reduce((s, o) => s + o.chance, 0);
    expect(cambodian).toBeCloseTo(3 / 8, 10);
  });

  it('the worst-case pair has 576 combinations, enumerated exactly', () => {
    const mom = G({ color: ['red', 'royal'], pattern: ['solid', 'butterfly'], fins: ['veil', 'plakat'], cambodian: ['C', 'c'], metallic: ['std', 'me'] });
    const dad = G({ color: ['turq', 'steel'], pattern: ['bicolor', 'marble'], fins: ['halfmoon', 'crown'], cambodian: ['C', 'c'], metallic: ['std', 'me'] });
    let combos = 1;
    for (const l of betta.genetics.loci) {
      const m = allelePair(l, mom);
      const f = allelePair(l, dad);
      combos *= new Set(m.flatMap((a) => f.map((b) => [a, b].sort().join('|')))).size;
    }
    expect(combos).toBe(576);
    const ph = predictOffspringPhenotypes(betta, mom, dad);
    expect(ph).not.toBeNull();
    expect(ph!.reduce((s, o) => s + o.chance, 0)).toBeCloseTo(1, 10);
  });

  it('the forecast UI lists Red Cambodian Veiltail for the 50/50 pair', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 5 });
    const rng = simRng(g);
    const her = createCreature(g, rng, 'betta', { sex: 'female', genome: G({ color: ['red', 'red'], ...solidVeil, cambodian: ['c', 'c'] }) });
    const him = createCreature(g, rng, 'betta', { sex: 'male', genome: G({ color: ['red', 'yellow'], ...solidVeil, cambodian: ['C', 'c'] }) });
    const html = renderToStaticMarkup(createElement(OffspringOdds, { a: her, b: him }));
    expect(html).toContain('Red Cambodian Veiltail');
  });
});

describe('older bettas keep their names (GEN-009)', () => {
  it('the wild-type allele stays the most common in both new loci', () => {
    const l = (id: string) => betta.genetics.loci.find((x) => x.id === id)!;
    expect(mostCommonAllele(l('cambodian'))).toBe('C');
    expect(mostCommonAllele(l('metallic'))).toBe('std');
  });

  it('a genome without the new loci normalises to C/C + std/std with an unchanged name', () => {
    const old = G({ color: ['royal', 'yellow'], pattern: ['butterfly', 'marble'], fins: ['halfmoon', 'crown'] });
    const n = normalizeGenome(betta, old);
    expect(n.alleles.cambodian).toEqual(['C', 'C']);
    expect(n.alleles.metallic).toEqual(['std', 'std']);
    expect(resolveMorph(betta, old).morphName).toBe('Royal Blue Butterfly Halfmoon');
  });

  it('bettas saved before the new loci keep name, appearance and value through a save and load, with no repairs', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 31 });
    const rng = simRng(g);
    const tank = g.tankOrder[0];
    const looks = [
      { color: ['red', 'yellow'], pattern: ['solid', 'marble'], fins: ['veil', 'double'] },
      { color: ['royal', 'turq'], pattern: ['butterfly', 'butterfly'], fins: ['halfmoon', 'crown'] },
      { color: ['white', 'white'], pattern: ['dragon', 'dragon'], fins: ['plakat', 'plakat'] },
    ] as Record<string, [string, string]>[];
    for (const a of looks) addCreature(g, createCreature(g, rng, 'betta', { genome: G(a), sex: 'female' }), tank);
    // as a 0.4 save holds them: no cambodian or metallic alleles at all
    for (const c of Object.values(g.creatures)) if (c.speciesId === 'betta') {
      delete c.genome.alleles.cambodian;
      delete c.genome.alleles.metallic;
    }
    const before = Object.values(g.creatures).filter((c) => c.speciesId === 'betta').map((c) => ({ id: c.id, morphName: c.morphName, appearance: c.appearance, value: creatureValue(g, c).total }));
    expect(before).toHaveLength(4);
    const back = decodeRecord(encodeRecord(g, 'auto').text);
    expect(back.repairs).toEqual([]);
    for (const b of before) {
      const c = back.state.creatures[b.id];
      expect(c.morphName).toBe(b.morphName);
      expect(c.appearance).toEqual(b.appearance);
      expect(creatureValue(back.state, c).total).toBe(b.value);
      expect(resolveMorph(betta, c.genome).morphName).toBe(b.morphName);
    }
  });
});

describe('two-copy traits read as hidden in carriers (B-136)', () => {
  it('a yellow/white betta carries opaque white; a crown/double betta carries double tail', () => {
    const color = betta.genetics.loci.find((l) => l.id === 'color')!;
    const fins = betta.genetics.loci.find((l) => l.id === 'fins')!;
    expect(describeLocus(color, ['yellow', 'white'])).toBe('Non-red yellow · carries opaque white (het)');
    expect(describeLocus(fins, ['crown', 'double'])).toBe('Crowntail · carries double tail (het)');
    const g = G({ color: ['yellow', 'white'], pattern: ['solid', 'solid'], fins: ['crown', 'double'] });
    expect(hiddenAlleles(betta, g).map((h) => h.allele).sort()).toEqual(['double', 'white']);
    expect(name(g.alleles)).toBe('Yellow Crowntail Betta');
  });
});
