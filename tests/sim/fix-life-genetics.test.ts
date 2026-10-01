/**
 * Fix lane LIFE — genetics regressions: offspring-odds preview enumerates distinct allele pairs, so a 7-locus medaka
 * cross gets a real prediction instead of "100% mother's morph" (S02-03); wild-based overlay morphs count as
 * discoveries (S02-09); composeMorphName never splices a descriptive overlay into a base name (S16-05).
 */
import { describe, it, expect } from 'vitest';
import type { Genome } from '@/types';
import { getSpecies } from '@/data/species';
import { composeMorphName, predictOffspringMorphs, inheritGenome, resolvePhenotype, normalizeGenome } from '@/sim/life/genetics';
import { mulberry32, simRng } from '@/sim/rng';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { createClutch, mintJuveniles } from '@/sim/life/breeding/clutch';

const medaka = getSpecies('medaka');
const genome = (b: [string, string], r: [string, string], extra: Partial<Genome['alleles']> = {}): Genome =>
  normalizeGenome(medaka, {
    alleles: { b, r, deep: ['n', 'n'], shine: ['n', 'n'], lame: ['n', 'n'], fins: ['n', 'n'], shape: ['n', 'n'], ...extra },
    potentials: {} as Genome['potentials'],
  });

describe('S02-03 — predictOffspringMorphs for many-locus species', () => {
  it('white × wild medaka predicts wild offspring, not the mother’s morph', () => {
    const mom = genome(['b', 'b'], ['r', 'r']);
    const dad = genome(['B', 'B'], ['R', 'R']);
    expect(resolvePhenotype(medaka, mom, 1).morphName).toMatch(/Shiro/);
    const pred = predictOffspringMorphs(medaka, mom, dad);
    expect(pred[0].morphName).toMatch(/Kuro/);
    expect(pred[0].chance).toBeCloseTo(1, 6);
  });

  it('matches Monte-Carlo inheritance for a double-heterozygous cross (weights sum to 1)', () => {
    const mom = genome(['B', 'b'], ['R', 'r'], { shine: ['n', 'S'] });
    const dad = genome(['B', 'b'], ['R', 'r'], { shine: ['n', 'S'] });
    const pred = predictOffspringMorphs(medaka, mom, dad);
    const sum = pred.reduce((a, p) => a + p.chance, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(pred.length).toBeGreaterThan(2);
    const rng = mulberry32(11);
    const N = 4000;
    const tally = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const k = inheritGenome(medaka, mom, dad, rng);
      const n = resolvePhenotype(medaka, k, 1).morphName;
      tally.set(n, (tally.get(n) ?? 0) + 1);
    }
    for (const p of pred) {
      const observed = (tally.get(p.morphName) ?? 0) / N;
      expect(Math.abs(observed - p.chance)).toBeLessThan(0.04);
    }
  });
});

describe('S02-09 — first-bred celebration for wild-based overlay morphs', () => {
  function mintMedaka(alleles: Partial<Genome['alleles']>) {
    const g = newGame({ starterId: 'betta', starterName: 'S', seed: 5 });
    const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Nursery' });
    tank.purpose = 'nursery';
    const gen = genome(['B', 'B'], ['R', 'R'], alleles);
    const mom = createCreature(g, simRng(g), 'medaka', { sex: 'female', ageDays: 20, genome: gen });
    const dad = createCreature(g, simRng(g), 'medaka', { sex: 'male', ageDays: 20, genome: gen });
    addCreature(g, mom, null);
    addCreature(g, dad, null);
    const cl = createClutch(g, { sp: medaka, tank, mother: mom, father: dad, hour: g.clock.hour - 100, stage: 'fry', count: 3, visual: 'fry_cloud', nextStageHour: g.clock.hour });
    const before = g.progress.counters.morphsDiscovered ?? 0;
    const kids = mintJuveniles(g, cl, tank, medaka, g.clock.hour, null);
    return { g, kids, discovered: (g.progress.counters.morphsDiscovered ?? 0) - before };
  }

  it('"Kuro (Wild) Miyuki" counts as a discovery', () => {
    const { g, kids, discovered } = mintMedaka({ shine: ['M', 'M'] });
    expect(kids[0].morphName).toBe('Kuro (Wild) Miyuki');
    expect(discovered).toBe(1);
    expect(g.log.some((e) => /First Kuro \(Wild\) Miyuki medaka/.test(e.text))).toBe(true);
  });

  it('a plain "Kuro (Wild)" does not', () => {
    const { kids, discovered } = mintMedaka({});
    expect(kids[0].morphName).toBe('Kuro (Wild)');
    expect(discovered).toBe(0);
  });
});

describe('S16-05 — composeMorphName keeps multi-word base names intact', () => {
  const rule = (name: string) => ({ id: name, name, layer: 'overlay' as const, when: [], visual: {}, rarity: 0 });
  it('single-token overlays still slot in before the species noun', () => {
    expect(composeMorphName(getSpecies('ocellaris_clownfish'), rule('Orange Ocellaris'), [rule('Misbar')])).toBe('Orange Misbar Ocellaris');
  });
  it('descriptive overlays become a prefix instead of splitting the base', () => {
    expect(composeMorphName(getSpecies('cleaner_shrimp'), rule('Skunk Cleaner'), [rule('Richly coloured')])).toBe('Richly coloured Skunk Cleaner');
    expect(composeMorphName(getSpecies('white_cloud_minnow'), rule('White Cloud'), [rule('Long-fin (Meteor)')])).toBe('Long-fin (Meteor) White Cloud');
    expect(composeMorphName(getSpecies('clown_goby'), rule('Yellow Clown Goby'), [rule('Richly coloured')])).toBe('Richly coloured Yellow Clown Goby');
  });
});
