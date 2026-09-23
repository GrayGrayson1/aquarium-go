import { describe, it, expect } from 'vitest';
import type { Genome, Potentials } from '@/types';
import { getSpecies } from '@/data/species';
import { mulberry32 } from '@/sim/rng';
import {
  rollGenome,
  inheritGenome,
  resolvePhenotype,
  describeGenetics,
  predictOffspringMorphs,
  MUTATION_RATE_PER_LOCUS,
} from '@/sim/life/genetics';
import { saturationOf } from '@/sim/life/color';

const P50: Potentials = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };
const g = (alleles: Record<string, [string, string]>, potentials: Partial<Potentials> = {}): Genome => ({ alleles, potentials: { ...P50, ...potentials } });

const axolotl = getSpecies('axolotl');
const betta = getSpecies('betta');
const clown = getSpecies('ocellaris_clownfish');
const puffer = getSpecies('pea_puffer');
const seahorse = getSpecies('lined_seahorse');

const AXO_WILD = { dark: ['D', 'D'], albino: ['A', 'A'], melanoid: ['M', 'M'], axanthic: ['Ax', 'Ax'], copper: ['C', 'C'] } as Record<string, [string, string]>;

describe('lifecycle genetics — rolls', () => {
  it('genome roll respects allele frequencies', () => {
    const rng = mulberry32(12345);
    const N = 4000;
    let d = 0;
    let a = 0;
    let red = 0;
    for (let i = 0; i < N; i++) {
      const ax = rollGenome(axolotl, rng);
      d += ax.alleles.dark.filter((x) => x === 'd').length;
      a += ax.alleles.albino.filter((x) => x === 'a').length;
      const b = rollGenome(betta, rng);
      red += b.alleles.color.filter((x) => x === 'red').length;
    }
    expect(d / (2 * N)).toBeGreaterThan(0.42);
    expect(d / (2 * N)).toBeLessThan(0.48);
    expect(a / (2 * N)).toBeGreaterThan(0.22);
    expect(a / (2 * N)).toBeLessThan(0.28);
    expect(red / (2 * N)).toBeGreaterThan(0.27);
    expect(red / (2 * N)).toBeLessThan(0.33);
  });

  it('potentials stay in 0..100 with a sensible spread, and bias lifts premium stock', () => {
    const rng = mulberry32(7);
    let sum0 = 0;
    let sumB = 0;
    let remarkable = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const a = rollGenome(betta, rng, 0);
      const b = rollGenome(betta, rng, 0.8);
      for (const v of Object.values(a.potentials)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
        expect(Number.isInteger(v)).toBe(true);
      }
      sum0 += a.potentials.color;
      sumB += b.potentials.color;
      if (a.potentials.color >= 90) remarkable++;
    }
    expect(sum0 / N).toBeGreaterThan(46);
    expect(sum0 / N).toBeLessThan(56);
    expect(sumB / N).toBeGreaterThan(sum0 / N + 8);
    // "Remarkable" is genuinely rare in ordinary stock
    expect(remarkable / N).toBeLessThan(0.05);
  });
});

describe('lifecycle genetics — inheritance', () => {
  it('het × het gives ~25% recessive phenotype (seeded, statistical)', () => {
    const rng = mulberry32(99);
    const mom = g({ ...AXO_WILD, dark: ['D', 'd'] });
    const dad = g({ ...AXO_WILD, dark: ['d', 'D'] });
    const N = 4000;
    let leu = 0;
    for (let i = 0; i < N; i++) {
      const kid = inheritGenome(axolotl, mom, dad, rng);
      if (resolvePhenotype(axolotl, kid, 1).morphName === 'Leucistic') leu++;
    }
    expect(leu / N).toBeGreaterThan(0.22);
    expect(leu / N).toBeLessThan(0.28);
    const pred = predictOffspringMorphs(axolotl, mom, dad);
    expect(pred.find((p) => p.morphName === 'Leucistic')?.chance).toBeCloseTo(0.25, 5);
    expect(pred.find((p) => p.morphName === 'Wild Type')?.chance).toBeCloseTo(0.75, 5);
  });

  it('offspring potentials stay within 0..100 and near mid-parent', () => {
    const rng = mulberry32(2024);
    const mom = g(AXO_WILD, { size: 80, color: 90, pattern: 30, structure: 60, fertility: 100, hardiness: 0, temperament: 70, curiosity: 20 });
    const dad = g(AXO_WILD, { size: 40, color: 70, pattern: 50, structure: 60, fertility: 100, hardiness: 10, temperament: 30, curiosity: 40 });
    const N = 1500;
    const sums: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const kid = inheritGenome(axolotl, mom, dad, rng);
      for (const [k, v] of Object.entries(kid.potentials)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
        const mid = (mom.potentials[k as keyof Potentials] + dad.potentials[k as keyof Potentials]) / 2;
        expect(Math.abs(v - mid)).toBeLessThan(45);
        sums[k] = (sums[k] ?? 0) + v;
      }
    }
    for (const k of Object.keys(sums)) {
      const mid = (mom.potentials[k as keyof Potentials] + dad.potentials[k as keyof Potentials]) / 2;
      expect(Math.abs(sums[k] / N - mid)).toBeLessThan(7);
    }
  });

  it('mutations are rare, stay within the locus and are flagged', () => {
    const rng = mulberry32(5);
    const mom = g(AXO_WILD);
    const dad = g(AXO_WILD);
    const N = 20000;
    let flagged = 0;
    for (let i = 0; i < N; i++) {
      const kid = inheritGenome(axolotl, mom, dad, rng);
      for (const m of kid.mutations ?? []) {
        flagged++;
        const locus = axolotl.genetics.loci.find((l) => l.id === m.locusId)!;
        expect(locus.alleles.some((a) => a.id === m.to)).toBe(true);
        expect(m.to).not.toBe(m.from);
        expect(kid.alleles[m.locusId]).toContain(m.to);
      }
    }
    const perLocus = flagged / (N * axolotl.genetics.loci.length);
    expect(perLocus).toBeGreaterThan(MUTATION_RATE_PER_LOCUS * 0.5);
    expect(perLocus).toBeLessThan(MUTATION_RATE_PER_LOCUS * 1.6);
  });
});

describe('lifecycle genetics — phenotypes & names', () => {
  it('axolotl morphs: dd aa → White Albino, aa → Golden Albino, dd → Leucistic', () => {
    expect(resolvePhenotype(axolotl, g({ ...AXO_WILD, dark: ['d', 'd'], albino: ['a', 'a'] }), 3).morphName).toBe('White Albino');
    expect(resolvePhenotype(axolotl, g({ ...AXO_WILD, albino: ['a', 'a'] }), 3).morphName).toBe('Golden Albino');
    expect(resolvePhenotype(axolotl, g({ ...AXO_WILD, dark: ['d', 'd'] }), 3).morphName).toBe('Leucistic');
    expect(resolvePhenotype(axolotl, g({ ...AXO_WILD, dark: ['D', 'd'], albino: ['A', 'a'] }), 3).morphName).toBe('Wild Type');
    expect(resolvePhenotype(axolotl, g({ ...AXO_WILD, melanoid: ['m', 'm'] }), 3).morphName).toBe('Melanoid');
    // Leucistic keeps its dark eyes, golden albino gets pale eyes
    const leu = resolvePhenotype(axolotl, g({ ...AXO_WILD, dark: ['d', 'd'] }), 3).visual;
    expect(saturationOf(leu.bodyColor)).toBeLessThan(0.7);
  });

  it('betta names compose colour + pattern + finnage, respecting the dominance ladder', () => {
    const royalHm = g({ color: ['royal', 'royal'], pattern: ['butterfly', 'butterfly'], fins: ['halfmoon', 'halfmoon'] });
    expect(resolvePhenotype(betta, royalHm, 10).morphName).toBe('Royal Blue Butterfly Halfmoon');
    const redVeil = g({ color: ['red', 'royal'], pattern: ['solid', 'marble'], fins: ['veil', 'halfmoon'] });
    expect(resolvePhenotype(betta, redVeil, 10).morphName).toBe('Red Veiltail');
    const veilPlakat = g({ color: ['turq', 'turq'], pattern: ['solid', 'solid'], fins: ['veil', 'plakat'] });
    const vp = resolvePhenotype(betta, veilPlakat, 10);
    expect(vp.morphName).toBe('Turquoise Veiltail');
    expect(vp.visual.finType).toBe('veiltail');
    const plakat = g({ color: ['copper', 'black'], pattern: ['dragon', 'dragon'], fins: ['plakat', 'crown'] });
    expect(resolvePhenotype(betta, plakat, 10).morphName).toBe('Copper Dragon Scale Plakat');
  });

  it('clownfish: one snowflake copy = Snowflake, two = Platinum; misbar slots before the species word', () => {
    const base = { snow: ['wt', 'wt'], mel: ['O', 'O'], misbar: ['N', 'N'] } as Record<string, [string, string]>;
    expect(resolvePhenotype(clown, g({ ...base, snow: ['wt', 'sn'] }), 1).morphName).toBe('Snowflake');
    expect(resolvePhenotype(clown, g({ ...base, snow: ['sn', 'sn'] }), 1).morphName).toBe('Platinum');
    expect(resolvePhenotype(clown, g(base), 1).morphName).toBe('Orange Ocellaris');
    expect(resolvePhenotype(clown, g({ ...base, misbar: ['mb', 'mb'] }), 1).morphName).toBe('Orange Misbar Ocellaris');
    expect(resolvePhenotype(clown, g({ ...base, mel: ['O', 'B'] }), 1).morphName).toBe('Black Ocellaris');
  });

  it('additive loci blend: one golden copy gives an intermediate hue without the name', () => {
    const wild = resolvePhenotype(puffer, g({ spots: ['fine', 'fine'], hue: ['green', 'green'] }, { color: 50 }), 77);
    const het = resolvePhenotype(puffer, g({ spots: ['fine', 'fine'], hue: ['green', 'gold'] }, { color: 50 }), 77);
    const hom = resolvePhenotype(puffer, g({ spots: ['fine', 'fine'], hue: ['gold', 'gold'] }, { color: 50 }), 77);
    expect(hom.morphName).toBe('Golden');
    expect(het.morphName).toBe('Wild Type');
    expect(het.visual.bodyColor).not.toBe(wild.visual.bodyColor);
    expect(het.visual.bodyColor).not.toBe(hom.visual.bodyColor);
    expect(resolvePhenotype(seahorse, g({ hue: ['dark', 'dark'], pinto: ['p', 'p'] }), 5).morphName).toBe('Dark Pinto');
  });

  it('individual variation: unique per seed, richer colour and cleaner pattern with higher potentials, plausible structure', () => {
    const alle = { color: ['royal', 'royal'], pattern: ['solid', 'solid'], fins: ['halfmoon', 'halfmoon'] } as Record<string, [string, string]>;
    const a = resolvePhenotype(betta, g(alle), 111).visual;
    const b = resolvePhenotype(betta, g(alle), 222).visual;
    expect(a.bodyColor).not.toBe(b.bodyColor);
    expect(a.patternSeed).toBe(111);
    const dull = resolvePhenotype(betta, g(alle, { color: 5, pattern: 5, structure: 5 }), 333).visual;
    const rich = resolvePhenotype(betta, g(alle, { color: 95, pattern: 95, structure: 95 }), 333).visual;
    expect(saturationOf(rich.bodyColor)).toBeGreaterThan(saturationOf(dull.bodyColor));
    expect(rich.patternContrast).toBeGreaterThan(dull.patternContrast);
    expect(rich.patternRegularity!).toBeGreaterThan(dull.patternRegularity!);
    expect(rich.finLength).toBeGreaterThan(dull.finLength);
    for (const v of [dull, rich]) {
      expect(v.finLength).toBeGreaterThanOrEqual(0.6);
      expect(v.finLength).toBeLessThanOrEqual(1.6);
      expect(v.bodyDepth).toBeGreaterThanOrEqual(0.85);
      expect(v.bodyDepth).toBeLessThanOrEqual(1.15);
    }
    const gills = resolvePhenotype(axolotl, g(AXO_WILD, { structure: 95 }), 9).visual.gillFullness;
    const thin = resolvePhenotype(axolotl, g(AXO_WILD, { structure: 5 }), 9).visual.gillFullness;
    expect(gills).toBeGreaterThan(thin);
    expect(gills).toBeLessThanOrEqual(1.5);
    // deterministic
    expect(resolvePhenotype(betta, g(alle), 111)).toEqual(resolvePhenotype(betta, g(alle), 111));
  });
});

describe('lifecycle genetics — disclosure', () => {
  it('level 0 shows bands + morph only; level 1 reveals alleles', () => {
    const genome = g({ ...AXO_WILD, dark: ['D', 'd'] }, { size: 92, color: 60, pattern: 40 });
    const l0 = describeGenetics(axolotl, genome, 0);
    expect(l0.find((r) => r.label === 'Morph')?.value).toBe('Wild Type');
    expect(l0.find((r) => r.label === 'Size')?.value).toBe('Remarkable');
    expect(l0.find((r) => r.label === 'Colour')?.value).toBe('Promising');
    expect(l0.find((r) => r.label === 'Pattern')?.value).toBe('Ordinary');
    expect(l0.some((r) => /\d/.test(r.value))).toBe(false);
    expect(l0.some((r) => /carries/.test(r.value))).toBe(false);
    const l1 = describeGenetics(axolotl, genome, 1);
    expect(l1.find((r) => r.label === 'Leucistic (d)')?.value).toContain('carries leucistic (het)');
    expect(l1.find((r) => r.label === 'Size')?.value).toContain('92');
  });
});
