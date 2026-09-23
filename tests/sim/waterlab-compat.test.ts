/**
 * Compatibility engine (lane waterlab). Uses real roster species via findSpecies() when present, and fixture
 * SpeciesDefinitions (cloned from starters) evaluated through evaluateComposition() for data-driven edge cases.
 */
import { describe, it, expect } from 'vitest';
import type { CompatReport, CompatVerdict, GameState, SpeciesDefinition, Tank, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import {
  evaluateTank,
  previewAddition,
  speciesPair,
  environmentGate,
  incidentRisks,
  evaluateComposition,
  simpleMember,
  neutralContext,
  tankContext,
  type CompatContext,
} from '@/sim/compat';
import { getSpecies, findSpecies } from '@/data/species';

const ORDER: CompatVerdict[] = ['excellent', 'usually_compatible', 'conditional', 'high_risk', 'incompatible'];
const rank = (v: CompatVerdict) => ORDER.indexOf(v);
const texts = (r: CompatReport) => r.reasons.map((x) => x.text).join('\n');

const base = (starter: 'betta' | 'axolotl' | 'pea_puffer' | 'ocellaris_clownfish' | 'lined_seahorse' = 'betta') =>
  newGame({ starterId: starter, starterName: 'Test', seed: 777 });

function stock(state: GameState, tank: Tank, speciesId: string, n: number, opts: { sex?: 'male' | 'female'; ageDays?: number } = {}): void {
  const rng = simRng(state);
  for (let i = 0; i < n; i++) addCreature(state, createCreature(state, rng, speciesId, { sex: opts.sex, ageDays: opts.ageDays ?? 60 }), tank.id);
}

/** Deep clone a starter into a fixture species with overrides. */
function fixture(from: string, id: string, patch: Partial<SpeciesDefinition>): SpeciesDefinition {
  const sp = structuredClone(getSpecies(from));
  return { ...sp, id, commonName: patch.commonName ?? id, exceptionRules: [], positiveInteractions: [], ...patch };
}

function ctxFor(a: SpeciesDefinition, b: SpeciesDefinition, patch: Partial<CompatContext> = {}): CompatContext {
  return { ...neutralContext(a, b), neutral: false, flowIndex: 1, lightLevel: 1, ...patch };
}

describe('waterlab compat: hard gates', () => {
  it('environmentGate blocks freshwater ↔ marine', () => {
    const s = base();
    const fw = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true });
    const sw = createTank(s, 'g29', 'marine_live_rock', { cycled: true });
    expect(environmentGate(getSpecies('betta'), fw).ok).toBe(true);
    expect(environmentGate(getSpecies('ocellaris_clownfish'), sw).ok).toBe(true);
    const g1 = environmentGate(getSpecies('betta'), sw);
    expect(g1.ok).toBe(false);
    expect(g1.reason).toMatch(/freshwater/i);
    expect(environmentGate(getSpecies('lined_seahorse'), fw).ok).toBe(false);
    const preview = previewAddition(s, fw.id, { speciesId: 'ocellaris_clownfish' });
    expect(preview.verdict).toBe('incompatible');
    expect(preview.reasons.some((r) => r.category === 'water' && r.severity === 'critical')).toBe(true);
  });

  it('every starter begins with an Excellent tank', () => {
    for (const st of ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'] as const) {
      const s = base(st);
      const r = evaluateTank(s, s.tankOrder[0]);
      expect(r.verdict, `${st}: ${texts(r)}`).toBe('excellent');
    }
  });
});

describe('waterlab compat: predation', () => {
  it('goldfish + dwarf shrimp → high risk, with a predation reason and a young-only shrimplet incident', () => {
    const goldfish = findSpecies('comet_goldfish') ?? findSpecies('fancy_goldfish');
    const shrimp = findSpecies('cherry_shrimp');
    if (goldfish && shrimp) {
      const s = base('axolotl');
      const t = createTank(s, 'g75', goldfish.waterClasses[0], { cycled: true });
      stock(s, t, goldfish.id, 2);
      stock(s, t, shrimp.id, 10);
      const r = evaluateTank(s, t.id);
      const pair = r.pairs.find((p) => [p.a, p.b].includes(goldfish.id) && [p.a, p.b].includes(shrimp.id))!;
      expect(pair.verdict).toBe('high_risk');
      expect(rank(r.verdict)).toBeGreaterThanOrEqual(rank('high_risk'));
      expect(pair.reasons.some((x) => x.category === 'predation')).toBe(true);
      const inc = incidentRisks(s, t.id);
      const young = inc.find((i) => i.youngOnly && i.actorSpeciesId === goldfish.id && i.targetSpeciesId === shrimp.id);
      expect(young).toBeDefined();
      expect(young!.lethal).toBe(true);
      const adults = inc.find((i) => !i.youngOnly && i.kind === 'predation' && i.actorSpeciesId === goldfish.id);
      expect(adults).toBeDefined();
      expect(young!.perDay).toBeGreaterThan(adults!.perDay);
    }
    // Pure data path (independent of roster data): a goldfish-like fixture and a dwarf-shrimp-like fixture.
    const gf = fixture('axolotl', 'fx_goldfish', {
      commonName: 'Fixture Goldfish',
      category: 'fish',
      diet: 'omnivore',
      predatorTags: ['shrimp_dwarf', 'shrimp_fry', 'fry', 'eggs'],
      preyTags: ['fish_medium'],
      maxLikelyPreySizeCm: 4,
      adultSizeCm: 20,
      recommendedMinTankGallons: 40,
    });
    const sh = fixture('axolotl', 'fx_shrimp', {
      commonName: 'Fixture Shrimp',
      category: 'invertebrate',
      diet: 'omnivore',
      feedingStyle: 'grazer',
      predatorTags: [],
      preyTags: ['shrimp_dwarf', 'shrimp_fry', 'crustacean'],
      adultSizeCm: 2.5,
      maxLikelyPreySizeCm: 0,
      breeding: { ...getSpecies('axolotl').breeding, system: 'shrimp_berried' },
      lifecycle: { ...getSpecies('axolotl').lifecycle, hatchSizeCm: 0.2 },
      social: { kind: 'colony', minGroup: 1, idealGroup: 10 },
    });
    const ev = evaluateComposition([simpleMember(gf, 2), simpleMember(sh, 10)], ctxFor(gf, sh));
    expect(ev.report.verdict).toBe('high_risk');
    expect(texts(ev.report)).toMatch(/Fixture goldfish may eat fixture shrimp/i);
    expect(ev.incidents.some((i) => i.youngOnly && i.targetSpeciesId === 'fx_shrimp')).toBe(true);
    // Dense cover lowers the odds but can never make the pairing acceptable.
    const covered = evaluateComposition(
      [simpleMember(gf, 2), simpleMember(sh, 10)],
      ctxFor(gf, sh, { habitat: { ...ctxFor(gf, sh).habitat, cover: 1, hides: 30, sightBreak: 1 } }),
    );
    const pOpen = ev.incidents.find((i) => i.kind === 'predation' && !i.youngOnly)!.perDay;
    const pCovered = covered.incidents.find((i) => i.kind === 'predation' && !i.youngOnly)!.perDay;
    expect(pCovered).toBeLessThan(pOpen);
    expect(covered.report.verdict).toBe('high_risk');
  });

  it('young shrimp are at risk even when adults are tolerated', () => {
    const neon = findSpecies('neon_tetra');
    const shrimp = findSpecies('cherry_shrimp');
    if (!neon || !shrimp) return; // roster species not written yet
    const r = speciesPair(neon, shrimp);
    expect(texts(r)).toMatch(/young cherry shrimp are at high predation risk even if adults are usually tolerated/i);
    expect(rank(r.verdict)).toBeLessThanOrEqual(rank('conditional'));
  });

  it('pea puffer + snails → high risk', () => {
    const snail = findSpecies('nerite_snail') ?? findSpecies('mystery_snail');
    const puffer = getSpecies('pea_puffer');
    const target =
      snail ??
      fixture('axolotl', 'fx_snail', { commonName: 'Fixture Snail', category: 'invertebrate', preyTags: ['snail', 'snail_small'], predatorTags: [], adultSizeCm: 2.5, diet: 'herbivore' });
    const r = snail ? speciesPair(puffer, target) : evaluateComposition([simpleMember(puffer, 1), simpleMember(target, 3)], ctxFor(puffer, target)).report;
    expect(r.verdict).toBe('high_risk');
    expect(texts(r)).toMatch(/hunt snails/i);
  });

  it('predatory fish swallow tank mates that fit in their mouth', () => {
    const lion = findSpecies('dwarf_lionfish');
    const fire = findSpecies('firefish');
    if (!lion || !fire) return;
    const r = speciesPair(lion, fire);
    expect(rank(r.verdict)).toBeGreaterThanOrEqual(rank('high_risk'));
    expect(r.reasons.some((x) => x.category === 'predation')).toBe(true);
  });
});

describe('waterlab compat: social rules', () => {
  it('two male bettas → incompatible (critical)', () => {
    const s = base('betta');
    const tankId = s.tankOrder[0];
    const r = previewAddition(s, tankId, { speciesId: 'betta', sex: 'male' });
    expect(r.verdict).toBe('incompatible');
    expect(r.reasons.some((x) => x.severity === 'critical' && /fight/i.test(x.text))).toBe(true);
    // the life lane gets a lethal aggression incident between the two males
    stock(s, s.tanks[tankId], 'betta', 1, { sex: 'male' });
    const inc = incidentRisks(s, tankId).find((i) => i.kind === 'aggression' && i.actorSpeciesId === 'betta');
    expect(inc?.lethal).toBe(true);
    expect(inc?.actorIds?.length).toBe(2);
  });

  it('a schooling species kept below its minimum group gets a warning', () => {
    const school = findSpecies('neon_tetra') ?? fixture('pea_puffer', 'fx_tetra', { commonName: 'Fixture Tetra', social: { kind: 'school', minGroup: 6, idealGroup: 10 } });
    const ctx = ctxFor(school, school, { waterClass: school.waterClasses[0] });
    const one = evaluateComposition([simpleMember(school, 1)], ctx).report;
    expect(one.reasons.some((x) => x.severity === 'warning' && /needs a group of at least six/i.test(x.text))).toBe(true);
    const eight = evaluateComposition([simpleMember(school, 8)], ctx).report;
    expect(eight.reasons.some((x) => /needs a group/i.test(x.text))).toBe(false);
  });

  it('two young clownfish pair up (protandrous hierarchy)', () => {
    const s = base('ocellaris_clownfish');
    const r = previewAddition(s, s.tankOrder[0], { speciesId: 'ocellaris_clownfish', sex: 'male' });
    expect(r.verdict).toBe('excellent');
    expect(texts(r)).toMatch(/pair up/i);
  });
});

describe('waterlab compat: tank fit & behaviour', () => {
  it('tank size is judged at ADULT size, even for juveniles', () => {
    const big = findSpecies('comet_goldfish');
    const s = base('betta');
    const t = createTank(s, 'g10', 'freshwater_tropical', { cycled: true });
    if (big) {
      const r = previewAddition(s, t.id, { speciesId: big.id, sizeCm: 4, count: 1 });
      const size = r.reasons.find((x) => x.category === 'size' && /adult/i.test(x.text));
      expect(size).toBeDefined();
      expect(['warning', 'critical']).toContain(size!.severity);
      expect(size!.text).toMatch(/grow/i);
    }
    const fx = fixture('betta', 'fx_bigfish', { commonName: 'Fixture Bigfish', adultSizeCm: 30, recommendedMinTankGallons: 55, activeSwimmer: true, recommendedFootprint: { minLengthIn: 48, minWidthIn: 13 } });
    const ctx: CompatContext = { ...tankContext(s, t), neutral: false };
    const r2 = evaluateComposition([simpleMember(fx, 1, 'male', 5)], ctx).report;
    expect(r2.reasons.some((x) => x.category === 'size' && /at least 55 gallons/.test(x.text))).toBe(true);
    expect(texts(r2)).toMatch(/requires more swimming length than this tank provides/);
  });

  it('seahorse + fast, aggressive feeder → feeding-competition reason', () => {
    const sea = getSpecies('lined_seahorse');
    const fast = findSpecies('green_chromis') ?? getSpecies('ocellaris_clownfish');
    const r = speciesPair(sea, fast);
    const feed = r.reasons.find((x) => x.category === 'feeding' && /outcompete the lined seahorse at feeding/i.test(x.text));
    expect(feed).toBeDefined();
    expect(feed!.mitigation).toMatch(/target feeding/i);
    expect(rank(r.verdict)).toBeGreaterThanOrEqual(rank('conditional'));
    // fixture: a very fast, pushy feeder crosses into high risk
    const bully = fixture('ocellaris_clownfish', 'fx_glutton', { commonName: 'Fixture Glutton', feedingSpeed: 0.95, feedingAggression: 0.8 });
    const rb = evaluateComposition([simpleMember(bully, 1), simpleMember(sea, 2)], ctxFor(bully, sea)).report;
    expect(rb.reasons.some((x) => x.category === 'feeding' && x.severity === 'warning')).toBe(true);
    expect(rb.verdict).toBe('high_risk');
  });

  it('reef-unsafe species with corals present → "Coral may be nipped" warning', () => {
    const clown = getSpecies('ocellaris_clownfish');
    const nipper = fixture('ocellaris_clownfish', 'fx_nipper', { commonName: 'Fixture Angel', reefSafe: 'unsafe', coralRisk: 0.7 });
    const withCorals = ctxFor(nipper, clown, { waterClass: 'reef', corals: 4 });
    withCorals.habitat = { ...withCorals.habitat, corals: { soft: 2, lps: 2, sps: 0, zoanthid: 0, mushroom: 0, gsp: 0 } };
    const r = evaluateComposition([simpleMember(nipper, 1)], withCorals);
    expect(r.report.reasons.some((x) => x.severity === 'warning' && /Coral may be nipped/.test(x.text))).toBe(true);
    expect(r.incidents.some((i) => i.kind === 'coral_nip')).toBe(true);
    const noCorals = evaluateComposition([simpleMember(nipper, 1)], ctxFor(nipper, clown, { waterClass: 'reef', corals: 0 }));
    expect(noCorals.report.reasons.some((x) => /Coral may be nipped/.test(x.text))).toBe(false);
  });

  it('compatible temperature but incompatible temperament', () => {
    const peaceful = fixture('ocellaris_clownfish', 'fx_dove', { commonName: 'Fixture Dove', temperament: 'peaceful', aggression: 0.02, territoriality: 0.1, adultSizeCm: 6, predatorTags: [], feedingSpeed: 0.5 });
    const brute = fixture('ocellaris_clownfish', 'fx_brute', { commonName: 'Fixture Brute', temperament: 'aggressive', aggression: 0.8, territoriality: 0.8, adultSizeCm: 12, predatorTags: [], feedingSpeed: 0.5 });
    const r = evaluateComposition([simpleMember(brute, 1), simpleMember(peaceful, 1)], ctxFor(brute, peaceful)).report;
    expect(r.reasons.some((x) => x.category === 'temperature' && x.severity !== 'positive')).toBe(false);
    expect(r.reasons.some((x) => x.category === 'aggression' && /bully/i.test(x.text))).toBe(true);
    expect(rank(r.verdict)).toBeGreaterThanOrEqual(rank('high_risk'));
  });

  it('axolotl + gravel → ingestion warning; fine sand is fine', () => {
    const s = base('axolotl');
    const tank = s.tanks[s.tankOrder[0]];
    expect(evaluateTank(s, tank.id).reasons.some((x) => /swallow/i.test(x.text))).toBe(false);
    tank.substrate = { kind: 'gravel', depthCm: 4, color: '#777' };
    const r = evaluateTank(s, tank.id);
    const ing = r.reasons.find((x) => /swallow/i.test(x.text));
    expect(ing?.severity).toBe('warning');
    expect(ing?.category).toBe('habitat');
  });

  it('axolotl + tropical tank mates: temperatures never overlap', () => {
    const r = speciesPair(getSpecies('axolotl'), getSpecies('betta'));
    expect(r.verdict).toBe('incompatible');
    expect(r.reasons.some((x) => x.category === 'temperature' && x.severity === 'critical')).toBe(true);
  });

  it('speciesPair is symmetric and well-formed', () => {
    const ids = ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'];
    for (const a of ids)
      for (const b of ids) {
        const ab = speciesPair(getSpecies(a), getSpecies(b));
        const ba = speciesPair(getSpecies(b), getSpecies(a));
        expect(ab.verdict).toBe(ba.verdict);
        expect(ab.score).toBeGreaterThanOrEqual(0);
        expect(ab.score).toBeLessThanOrEqual(100);
      }
  });

  it('flags a seahorse among stinging cnidarians and a species-only predator with any tank mate', () => {
    const sea = getSpecies('lined_seahorse');
    const ctx = ctxFor(sea, sea, { waterClass: 'reef', stinging: 1, anemones: 1 });
    const r = evaluateComposition([simpleMember(sea, 2)], ctx);
    expect(rank(r.report.verdict)).toBeGreaterThanOrEqual(rank('high_risk'));
    expect(r.incidents.some((i) => i.kind === 'sting' && i.targetSpeciesId === sea.id)).toBe(true);
    const loner = fixture('ocellaris_clownfish', 'fx_loner', { commonName: 'Fixture Loner', special: { speciesOnly: true } });
    const rl = evaluateComposition([simpleMember(loner, 1), simpleMember(getSpecies('ocellaris_clownfish'), 1)], ctxFor(loner, getSpecies('ocellaris_clownfish')));
    expect(rank(rl.report.verdict)).toBeGreaterThanOrEqual(rank('high_risk'));
  });

  it('water class mismatch and temperature are explained for the real tank', () => {
    const s = base('betta');
    const cool = createTank(s, 'g20L', 'freshwater_cool' as WaterClass, { cycled: true });
    const r = previewAddition(s, cool.id, { speciesId: 'betta', sex: 'male' });
    expect(r.reasons.some((x) => x.category === 'temperature' && /too cold/i.test(x.text))).toBe(true);
  });
});
