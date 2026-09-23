/**
 * Lane brackish — the estuary chapter: species data, research/unlocks, salinity-aware compatibility, brackish water,
 * water-class conversion, shop gating and the showcase fixture.
 * Run: npx vitest run tests/sim/species-brackish.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { CompatVerdict, CreatureVisualParams, FoodTag, GameState, ParamRange, SpeciesDefinition } from '@/types';
import { ROSTER } from '@/data/species/roster';
import { PREY_TAGS } from '@/data/species/tags';
import { BRACKISH_SPECIES } from '@/data/species/brackish';
import { ALL_SPECIES, findSpecies } from '@/data/species';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import { RESEARCH_BY_ID } from '@/data/research';
import { getDecorDef } from '@/data/catalog/decor';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { advanceWorld } from '@/sim/world';
import { speciesPair, environmentGate, evaluateTank, clearCompatCache } from '@/sim/compat';
import { fitsEnvironment } from '@/sim/compat/salinity';
import { getWaterReport, initialWater, speciesWaterComfort, tankDailyCost } from '@/sim/water';
import { CLASS_DEFAULTS, saltStrength } from '@/sim/water/constants';
import { waterChangeCost } from '@/sim/care';
import { isSpeciesAvailable } from '@/sim/economy/shop';
import { convertWaterClass } from '@/ui/panels/common/tankOps';
import { stockTank } from '@/dev/fixtures/core-helpers';
import { FIXTURES } from '@/dev/fixtures';

const IDS = ['figure_eight_puffer', 'bumblebee_goby', 'sailfin_molly', 'banded_archerfish'];
const FOOD_TAGS: Record<FoodTag, true> = {
  flake: true, pellet_small: true, pellet_sinking: true, pellet_large: true, bloodworm: true, brine_shrimp: true,
  mysis: true, daphnia: true, earthworm: true, snail_live: true, algae_wafer: true, vegetable: true, nori: true,
  copepod_live: true, coral_food: true, biofilm: true, detritus: true, infusoria: true, baby_brine: true,
};
const RANK: Record<CompatVerdict, number> = { excellent: 0, usually_compatible: 1, conditional: 2, high_risk: 3, incompatible: 4 };
const COLOR_KEYS: (keyof CreatureVisualParams)[] = ['bodyColor', 'bodyColor2', 'bellyColor', 'finColor', 'finColor2', 'accentColor', 'eyeColor'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const ALL_IDS = new Set(ROSTER.map((r) => r.id));
const GROUPS = new Set(ALL_SPECIES.map((s) => s.group));

const get = (id: string): SpeciesDefinition => {
  const s = findSpecies(id);
  expect(s, `missing species ${id}`).toBeDefined();
  return s!;
};

function checkParamRange(label: string, r: ParamRange): void {
  expect(r.min, `${label}: min <= idealMin`).toBeLessThanOrEqual(r.idealMin);
  expect(r.idealMin, `${label}: idealMin <= idealMax`).toBeLessThanOrEqual(r.idealMax);
  expect(r.idealMax, `${label}: idealMax <= max`).toBeLessThanOrEqual(r.max);
}

type Genotype = Record<string, [string, string]>;
function* allGenotypes(s: SpeciesDefinition): Generator<Genotype> {
  const loci = s.genetics.loci;
  const pairs = loci.map((l) => {
    const out: [string, string][] = [];
    for (let i = 0; i < l.alleles.length; i++) for (let j = i; j < l.alleles.length; j++) out.push([l.alleles[i].id, l.alleles[j].id]);
    return out;
  });
  const idx = pairs.map(() => 0);
  for (;;) {
    const g: Genotype = {};
    loci.forEach((l, k) => (g[l.id] = pairs[k][idx[k]]));
    yield g;
    let k = 0;
    while (k < idx.length) {
      idx[k]++;
      if (idx[k] < pairs[k].length) break;
      idx[k] = 0;
      k++;
    }
    if (k === idx.length) return;
  }
}
const ruleMatches = (rule: SpeciesDefinition['genetics']['phenotypes'][number], g: Genotype) =>
  rule.when.every((c) => {
    const n = g[c.locus].filter((a) => a === c.allele).length;
    return c.count === 'hom' ? n === 2 : c.count === 'het' ? n === 1 : c.count === 'any' ? n >= 1 : n === 0;
  });

function freshGame(unlockBrackish = true): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Test', seed: 4242 });
  g.isShowcase = true;
  for (const k of ['fw_basic', 'fw_intermediate', 'marine_basics', 'tank_75', 'tank_125', ...(unlockBrackish ? ['brackish', 'decor_mangrove'] : [])]) if (!g.progress.unlocked.includes(k)) g.progress.unlocked.push(k);
  return g;
}

describe('brackish roster & data', () => {
  it('ships four brackish species, all registered and on the roster', () => {
    expect(BRACKISH_SPECIES.map((s) => s.id).sort()).toEqual([...IDS].sort());
    for (const id of IDS) {
      const r = ROSTER.find((x) => x.id === id);
      expect(r, `roster ${id}`).toBeDefined();
      expect(r!.env).toBe('brackish');
      expect(r!.lane).toBe('brackish');
      expect(ALL_SPECIES.some((s) => s.id === id)).toBe(true);
    }
  });

  describe.each(IDS.map((id) => [id] as const))('%s', (id) => {
    const s = get(id);
    const roster = ROSTER.find((r) => r.id === id)!;

    it('matches its roster entry and unlocks with the brackish research', () => {
      expect(s.scientificName).toBe(roster.scientificName);
      expect(s.commonName).toBe(roster.commonName);
      expect(s.behaviorSet).toBe(roster.behaviorSet);
      expect(s.environment).toBe('brackish');
      expect(s.visualLane).toBe('fish');
      expect(s.unlock.requires).toEqual(['brackish']);
      expect('brackish' in UNLOCK_KEYS).toBe(true);
      expect(s.isStarter).toBe(false);
    });

    it('has consistent brackish water parameters', () => {
      checkParamRange(`${id}.tempC`, s.tempC);
      checkParamRange(`${id}.pH`, s.pH);
      expect(s.salinitySG, 'brackish species need a salinity range').not.toBeNull();
      checkParamRange(`${id}.salinitySG`, s.salinitySG!);
      expect(s.salinitySG!.min).toBeGreaterThanOrEqual(1.0);
      expect(s.salinitySG!.max).toBeLessThanOrEqual(1.025);
      // the ideal band sits in low-end brackish water
      expect(s.salinitySG!.idealMax).toBeLessThanOrEqual(1.012);
      expect(s.salinitySG!.idealMax).toBeGreaterThan(1.003);
      expect(s.waterClasses).toContain('brackish');
      // every brackish species can live in the brackish class itself
      const d = CLASS_DEFAULTS.brackish.sg!;
      expect(Math.min(d.idealMax, s.salinitySG!.idealMax)).toBeGreaterThanOrEqual(Math.max(d.idealMin, s.salinitySG!.idealMin));
    });

    it('uses vocabulary tags, valid foods and sane numbers', () => {
      for (const t of [...s.predatorTags, ...s.preyTags]) expect(t in PREY_TAGS, `${id} tag ${t}`).toBe(true);
      for (const f of s.foods) expect(FOOD_TAGS[f], `${id} food ${f}`).toBe(true);
      for (const v of [s.feedingSpeed, s.feedingAggression, s.territoriality, s.aggression, s.finNipper, s.coverPreference, s.hardiness, s.visitorAppeal, s.breeding.difficulty]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(s.hungerHours).toBeGreaterThanOrEqual(8);
      expect(s.lifecycle.lifespanDays).toBeLessThanOrEqual(500);
      expect(s.lifecycle.lifespanDays).toBeGreaterThan(s.lifecycle.juvenileDays);
      expect(s.lifecycle.hatchSizeCm).toBeLessThan(s.adultSizeCm);
      expect(s.breeding.maturityDays).toBeGreaterThanOrEqual(5);
      expect(s.breeding.maturityDays).toBeLessThanOrEqual(30);
    });

    it('has valid, fully reachable genetics with hex colours', () => {
      const g = s.genetics;
      const loci = new Map(g.loci.map((l) => [l.id, new Set(l.alleles.map((a) => a.id))]));
      for (const p of g.phenotypes) {
        for (const c of p.when) expect(loci.get(c.locus)?.has(c.allele), `${id} ${p.id} ${c.locus}.${c.allele}`).toBe(true);
        for (const k of COLOR_KEYS) if (p.visual[k] !== undefined) expect(HEX.test(String(p.visual[k])), `${id} ${p.id} ${k}`).toBe(true);
      }
      for (const k of COLOR_KEYS) expect(HEX.test(String(g.baseVisual[k])), `${id} base ${k}`).toBe(true);
      expect(g.phenotypes.some((p) => p.layer === 'base' && p.when.length === 0)).toBe(true);
      const reached = new Set<string>();
      for (const gt of allGenotypes(s)) {
        const base = g.phenotypes.find((r) => r.layer === 'base' && ruleMatches(r, gt));
        expect(base).toBeDefined();
        reached.add(base!.id);
        for (const r of g.phenotypes) if (r.layer === 'overlay' && ruleMatches(r, gt)) reached.add(r.id);
      }
      expect(g.phenotypes.filter((r) => r.when.length > 0 && !reached.has(r.id)).map((r) => r.id)).toEqual([]);
    });

    it('cites real sources and records its uncertainty', () => {
      expect(s.sourceReferences.length).toBeGreaterThanOrEqual(2);
      expect(s.sourceReferences.some((r) => r.tier === 1)).toBe(true);
      for (const src of s.sourceReferences) {
        expect(src.url?.startsWith('https://'), `${id} ${src.id}`).toBe(true);
        expect(src.facts.length).toBeGreaterThan(0);
      }
      expect(s.confidenceNotes.length).toBeGreaterThanOrEqual(2);
      for (const r of s.exceptionRules) {
        const ok = r.other.startsWith('tag:') ? r.other.slice(4) in PREY_TAGS || GROUPS.has(r.other.slice(4)) : ALL_IDS.has(r.other);
        expect(ok, `${id} rule ${r.other}`).toBe(true);
      }
    });

    it('has a complete encyclopedia entry that never endorses release', () => {
      for (const [k, v] of Object.entries(s.encyclopedia)) expect(String(v).length, `${id}.${k}`).toBeGreaterThan(15);
      const all = Object.values(s.encyclopedia).join(' ').toLowerCase() + ' ' + s.conservation.note.toLowerCase();
      expect(all).not.toMatch(/(safe|okay|fine) to release/);
      expect(s.conservation.status.length).toBeGreaterThan(3);
    });
  });
});

describe('brackish species biology', () => {
  it('figure-eight puffer: hard-food snail eater, fin nipper, not bred in the game', () => {
    const s = get('figure_eight_puffer');
    expect(s.foods).toContain('snail_live');
    expect(s.predatorTags).toEqual(expect.arrayContaining(['snail', 'shrimp_dwarf', 'long_fins']));
    expect(s.finNipper).toBeGreaterThanOrEqual(0.6);
    expect(s.breeding.system).toBe('not_in_game');
    expect(s.behaviorSet).toBe('pea_puffer');
    for (const tag of ['tag:snail', 'tag:shrimp_dwarf', 'tag:long_fins']) expect(s.exceptionRules.find((r) => r.other === tag)?.verdictFloor).toBe('high_risk');
  });

  it('bumblebee goby: tiny perching cave spawner with male egg care', () => {
    const s = get('bumblebee_goby');
    expect(s.adultSizeCm).toBeLessThanOrEqual(4.5);
    expect(s.behaviorSet).toBe('goby_perch');
    expect(s.breeding.system).toBe('cave_spawner');
    expect(s.breeding.conditions.needsNestSite).toBe(true);
    expect(s.parentalCare).toBe('male');
    expect(s.foods).not.toContain('flake');
  });

  it('sailfin molly: peaceful livebearer with real domestic morphs', () => {
    const s = get('sailfin_molly');
    expect(s.temperament).toBe('peaceful');
    expect(s.aggression).toBeLessThan(0.2);
    expect(s.breeding.system).toBe('livebearer');
    const names = s.genetics.phenotypes.map((p) => p.name);
    for (const m of ['Black', 'Dalmatian', 'Gold', 'Lyretail', 'Wild Sailfin']) expect(names).toContain(m);
    expect(s.foods).toEqual(expect.arrayContaining(['vegetable', 'algae_wafer']));
    // Balloon mollies are deliberately left out (spinal deformity).
    expect(names.some((n) => /balloon/i.test(n))).toBe(false);
  });

  it('banded archerfish: big-tank showpiece that spits, eats small fish, not bred', () => {
    const s = get('banded_archerfish');
    expect(s.recommendedMinTankGallons).toBeGreaterThanOrEqual(100);
    expect(s.specialBehaviors).toContain('spit_shot');
    expect(s.behaviorSet).toBe('archerfish');
    expect(s.visitorAppeal).toBeGreaterThanOrEqual(0.9);
    expect(s.breeding.system).toBe('not_in_game');
    expect(s.special?.escapeArtist).toBe(true);
    expect(s.exceptionRules.find((r) => r.other === 'tag:fish_tiny')?.verdictFloor).toBe('high_risk');
  });
});

describe('research & unlocks', () => {
  it('Brackish Estuaries research needs intermediate freshwater and grants the chapter', () => {
    const r = RESEARCH_BY_ID.brackish_estuaries;
    expect(r).toBeDefined();
    expect(r.requires).toEqual(expect.arrayContaining([{ type: 'unlocked', key: 'fw_intermediate' }]));
    expect(r.grants).toEqual(expect.arrayContaining(['brackish', 'decor_mangrove']));
    expect(r.cost).toBeGreaterThan(500);
    expect(r.hours).toBeGreaterThanOrEqual(24);
  });

  it('both keys have unlock rules with hints', () => {
    for (const k of ['brackish', 'decor_mangrove']) {
      expect(UNLOCK_RULE_BY_KEY[k], k).toBeDefined();
      expect(UNLOCK_RULE_BY_KEY[k].hint.length).toBeGreaterThan(8);
    }
  });

  it('the shop only offers brackish species once the chapter is unlocked', () => {
    const locked = freshGame(false);
    for (const id of IDS) expect(isSpeciesAvailable(locked, id), id).toBe(false);
    const open = freshGame(true);
    for (const id of IDS) expect(isSpeciesAvailable(open, id), id).toBe(true);
  });
});

describe('salinity-aware compatibility', () => {
  const pair = (a: string, b: string) => {
    clearCompatCache();
    return speciesPair(get(a), get(b));
  };
  const text = (r: ReturnType<typeof pair>) => r.reasons.map((x) => x.text).join(' | ');

  it('brackish-only fish and freshwater-only fish can never share a tank — and the verdict says why', () => {
    const r = pair('figure_eight_puffer', 'neon_tetra');
    expect(r.verdict).toBe('incompatible');
    expect(text(r)).toMatch(/brackish/i);
    expect(text(r)).toMatch(/salt|salinity/i);
  });

  it('brackish fish and full-marine fish never share a tank', () => {
    for (const [a, b] of [
      ['figure_eight_puffer', 'ocellaris_clownfish'],
      ['sailfin_molly', 'ocellaris_clownfish'],
      ['banded_archerfish', 'yellow_tang'],
    ]) {
      const r = pair(a, b);
      expect(r.verdict, `${a} + ${b}`).toBe('incompatible');
      expect(text(r)).toMatch(/sea water|salinity/i);
    }
  });

  it('mollies bridge fresh and brackish water: guppies are not a salinity conflict', () => {
    const r = pair('sailfin_molly', 'fancy_guppy');
    expect(RANK[r.verdict]).toBeLessThan(RANK.incompatible);
    expect(r.reasons.some((x) => x.severity === 'critical' && x.category === 'water')).toBe(false);
  });

  it('figure-eight puffers nip mollies’ sails; archerfish eat bumblebee gobies', () => {
    expect(RANK[pair('figure_eight_puffer', 'sailfin_molly').verdict]).toBeGreaterThanOrEqual(RANK.high_risk);
    expect(RANK[pair('banded_archerfish', 'bumblebee_goby').verdict]).toBeGreaterThanOrEqual(RANK.high_risk);
  });

  it('mollies are peaceful with the other estuary fish', () => {
    expect(RANK[pair('sailfin_molly', 'banded_archerfish').verdict]).toBeLessThanOrEqual(RANK.conditional);
    expect(RANK[pair('sailfin_molly', 'bumblebee_goby').verdict]).toBeLessThanOrEqual(RANK.conditional);
  });

  it('the purchase gate and the engine share one salinity model', () => {
    const g = freshGame();
    const fresh = createTank(g, 'g29', 'freshwater_tropical');
    const brack = createTank(g, 'g29', 'brackish');
    const reef = createTank(g, 'g29', 'reef');
    expect(environmentGate(get('sailfin_molly'), fresh).ok).toBe(true);
    expect(environmentGate(get('figure_eight_puffer'), fresh).ok).toBe(false);
    expect(environmentGate(get('figure_eight_puffer'), brack).ok).toBe(true);
    expect(environmentGate(get('neon_tetra'), brack).ok).toBe(false);
    expect(environmentGate(get('ocellaris_clownfish'), brack).ok).toBe(false);
    expect(environmentGate(get('sailfin_molly'), reef).ok).toBe(false);
    for (const sp of ALL_SPECIES) for (const t of [fresh, brack, reef]) expect(environmentGate(sp, t).ok, `${sp.id} in ${t.environment}`).toBe(fitsEnvironment(sp, t.environment));
  });

  it('a molly in a freshwater tank gets an honest "a little salt suits them best" note, not a warning', () => {
    const g = freshGame();
    const fresh = createTank(g, 'g40B', 'freshwater_tropical', { cycled: true });
    stockTank(g, fresh.id, [{ species: 'sailfin_molly', count: 4, sex: 'mixed' }]);
    clearCompatCache();
    const r = evaluateTank(g, fresh.id);
    const note = r.reasons.find((x) => x.category === 'salinity');
    expect(note?.severity).toBe('info');
    expect(note?.text).toMatch(/salt/);
    const c = speciesWaterComfort(get('sailfin_molly'), fresh);
    expect(c.harm).toBe(0);
    expect(c.stressors.join(' ')).toMatch(/little salt/);
  });
});

describe('brackish water', () => {
  it('the brackish class targets SG 1.004–1.012 with marine salt at about a third strength', () => {
    const d = CLASS_DEFAULTS.brackish;
    expect(d.sg!.idealMin).toBeCloseTo(1.004, 4);
    expect(d.sg!.idealMax).toBeCloseTo(1.012, 4);
    expect(d.source.sg).toBeGreaterThanOrEqual(1.004);
    expect(d.source.sg).toBeLessThanOrEqual(1.012);
    expect(saltStrength('brackish')).toBeGreaterThan(0.2);
    expect(saltStrength('brackish')).toBeLessThan(0.5);
    expect(saltStrength('reef')).toBeCloseTo(1, 5);
    const w = initialWater('brackish', true);
    expect(w.salinitySG).toBeCloseTo(d.source.sg, 5);
    expect(w.pH).toBeGreaterThanOrEqual(d.pH.idealMin);
    expect(w.pH).toBeLessThanOrEqual(d.pH.idealMax);
  });

  it('brackish tanks cost far less salt than marine tanks of the same size', () => {
    const g = freshGame();
    const b = createTank(g, 'g55', 'brackish', { cycled: true });
    const m = createTank(g, 'g55', 'marine_fowlr', { cycled: true });
    g.inventory.salt = 100;
    const cb = waterChangeCost(g, b.id, 0.25).saltKg;
    const cm = waterChangeCost(g, m.id, 0.25).saltKg;
    expect(cb).toBeGreaterThan(0);
    expect(cb / cm).toBeGreaterThan(0.15);
    expect(cb / cm).toBeLessThan(0.5);
    expect(tankDailyCost(g, b)).toBeLessThan(tankDailyCost(g, m));
  });

  it('water reports explain low brackish salinity in plain words', () => {
    const g = freshGame();
    const t = createTank(g, 'g29', 'brackish', { cycled: true });
    stockTank(g, t.id, [{ species: 'figure_eight_puffer', count: 1 }]);
    t.water.salinitySG = 1.001;
    const rep = getWaterReport(g, t.id);
    const sal = rep.params.find((p) => p.key === 'salinity');
    expect(sal).toBeDefined();
    expect(sal!.status).not.toBe('good');
    expect(sal!.advice).toMatch(/third of reef strength/);
    const c = speciesWaterComfort(get('figure_eight_puffer'), t);
    expect(c.stressors.join(' ')).toMatch(/too fresh/);
    // estuary fish are euryhaline: fresh water hurts slowly, not instantly
    expect(c.harm).toBeGreaterThan(0);
    expect(c.harm).toBeLessThan(0.3);
  });

  it('a stocked brackish tank stays in its ideal band over a week of sim time', () => {
    const g = FIXTURES.brackish_estuary();
    const id = g.tankOrder[0];
    advanceWorld(g, 24 * 7, {});
    const t = g.tanks[id];
    const d = CLASS_DEFAULTS.brackish;
    expect(Number.isFinite(t.water.pH)).toBe(true);
    expect(t.water.pH).toBeGreaterThanOrEqual(d.pH.min);
    expect(t.water.pH).toBeLessThanOrEqual(d.pH.max);
    expect(t.water.salinitySG).toBeGreaterThanOrEqual(1.004);
    expect(t.water.salinitySG).toBeLessThanOrEqual(1.014);
    expect(getWaterReport(g, id).status).not.toBe('danger');
  });
});

describe('water-class conversion', () => {
  it('needs the unlock, keeps part of the cycle for fresh → brackish, and keeps brackish-tolerant plants', () => {
    const g = freshGame(false);
    const t = createTank(g, 'g29', 'freshwater_planted', { cycled: true });
    t.decor.push({ id: 'd1', defId: 'java_fern', x: 0, y: 0, z: 0, rotY: 0, scale: 1, seed: 1 });
    t.decor.push({ id: 'd2', defId: 'amazon_sword', x: 0.1, y: 0, z: 0, rotY: 0, scale: 1, seed: 2 });
    expect(convertWaterClass(g, t.id, 'brackish').ok).toBe(false);
    g.progress.unlocked.push('brackish');
    const maturity = t.water.bioMaturity;
    const r = convertWaterClass(g, t.id, 'brackish');
    expect(r.ok).toBe(true);
    expect(t.environment).toBe('brackish');
    expect(t.water.salinitySG).toBeGreaterThanOrEqual(1.004);
    expect(t.water.bioMaturity).toBeGreaterThan(0.3);
    expect(t.water.bioMaturity).toBeLessThan(maturity);
    expect(t.decor.map((d) => d.defId)).toEqual(['java_fern']);
    expect(g.inventory.decor.some((d) => d.defId === 'amazon_sword')).toBe(true);
    expect(r.message).toMatch(/salt/i);
  });

  it('fresh → marine still starts the cycle from scratch', () => {
    const g = freshGame();
    const t = createTank(g, 'g29', 'freshwater_tropical', { cycled: true });
    convertWaterClass(g, t.id, 'marine_fowlr');
    expect(t.water.bioMaturity).toBeLessThan(0.1);
  });
});

describe('plants & decor for planted brackish tanks', () => {
  it('java fern, anubias and java moss tolerate low-end brackish; soft-water plants do not', () => {
    for (const id of ['java_fern', 'anubias_nana', 'java_moss']) expect(getDecorDef(id)?.environments, id).toContain('brackish');
    for (const id of ['amazon_sword', 'monte_carlo', 'rotala']) expect(getDecorDef(id)?.environments, id).not.toContain('brackish');
  });

  it('mangrove hardscape is gated by its own unlock', () => {
    const m = getDecorDef('mangrove_roots');
    if (!m) return; // decor lands with the render work
    expect(m.unlock).toBe('decor_mangrove');
    expect(m.environments).toContain('brackish');
  });
});

describe('showcase fixture', () => {
  it('brackish_estuary builds a healthy, compatible estuary with every new species', () => {
    const g = FIXTURES.brackish_estuary();
    const main = g.tanks[g.tankOrder[0]];
    expect(main.waterClass).toBe('brackish');
    const species = new Set(Object.values(g.creatures).filter((c) => c.status === 'alive').map((c) => c.speciesId));
    for (const id of IDS) expect(species.has(id), id).toBe(true);
    for (const id of g.tankOrder) {
      const t = g.tanks[id];
      if (t.waterClass !== 'brackish') continue;
      clearCompatCache();
      expect(evaluateTank(g, id).verdict, t.name).not.toBe('incompatible');
      expect(RANK[evaluateTank(g, id).verdict], t.name).toBeLessThan(RANK.high_risk);
      expect(getWaterReport(g, id).status, t.name).toBe('good');
    }
  });

  it('the puffer and goby variants focus their own tanks', () => {
    const p = FIXTURES.brackish_puffer();
    expect(Object.values(p.creatures).some((c) => c.tankId === p.tankOrder[0] && c.speciesId === 'figure_eight_puffer')).toBe(true);
    const b = FIXTURES.brackish_gobies();
    expect(Object.values(b.creatures).some((c) => c.tankId === b.tankOrder[0] && c.speciesId === 'bumblebee_goby')).toBe(true);
  });
});
