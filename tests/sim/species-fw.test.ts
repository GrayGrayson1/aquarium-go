/**
 * Lane species-fw — data validation for every freshwater species (3 freshwater starters + FRESHWATER_SPECIES).
 * Run: npx vitest run tests/sim/species-fw.test.ts
 */
import { describe, expect, it } from 'vitest';
import type {
  BehaviorSetId,
  CreatureVisualParams,
  FoodTag,
  ParamRange,
  Range,
  SpeciesDefinition,
  WaterClass,
} from '@/types';
import { ROSTER } from '@/data/species/roster';
import { PREY_TAGS } from '@/data/species/tags';
import { FRESHWATER_SPECIES } from '@/data/species/freshwater';
import { ALL_SPECIES, findSpecies } from '@/data/species';
import { axolotl } from '@/data/species/axolotl';
import { betta } from '@/data/species/betta';
import { peaPuffer } from '@/data/species/pea_puffer';
import { UNLOCK_KEYS } from '@/data/unlockKeys';

// Exhaustive runtime mirrors of union types. `Record<Union, true>` makes TypeScript flag missing or extra keys,
// so these lists cannot silently drift from src/types/species.ts.
const BEHAVIOR_SETS: Record<BehaviorSetId, true> = {
  axolotl: true, betta: true, pea_puffer: true, clownfish: true, seahorse: true, schooling_small: true, livebearer: true,
  surface_dweller: true, bottom_forager: true, algae_grazer: true, loach_eel: true, hillstream: true, gourami: true,
  shrimp_dwarf: true, shrimp_cleaner: true, snail: true, frog_aquatic: true, goldfish: true, crayfish: true,
  cichlid_discus: true, reef_basslet: true, dartfish: true, goby_burrow: true, goby_perch: true, cardinal_hover: true,
  chromis: true, tang: true, angelfish_dwarf: true, rabbitfish: true, dragonet: true, hermit_crab: true,
  mantis_shrimp: true, lionfish: true, grouper: true, sessile: true, archerfish: true, // lane:brackish
};
const FOOD_TAGS: Record<FoodTag, true> = {
  flake: true, pellet_small: true, pellet_sinking: true, pellet_large: true, bloodworm: true, brine_shrimp: true,
  mysis: true, daphnia: true, earthworm: true, snail_live: true, algae_wafer: true, vegetable: true, nori: true,
  copepod_live: true, coral_food: true, biofilm: true, detritus: true, infusoria: true, baby_brine: true,
};
const FRESHWATER_CLASSES: WaterClass[] = ['freshwater_cool', 'freshwater_tropical', 'freshwater_planted'];
const COLOR_KEYS: (keyof CreatureVisualParams)[] = ['bodyColor', 'bodyColor2', 'bellyColor', 'finColor', 'finColor2', 'accentColor', 'eyeColor', 'gillColor'];
const HEX = /^#[0-9a-fA-F]{6}$/;

const FW_ROSTER = ROSTER.filter((r) => r.lane === 'species-fw');
const FW_STARTERS: SpeciesDefinition[] = [axolotl, betta, peaPuffer];
const FW_ALL: SpeciesDefinition[] = [...FW_STARTERS, ...FRESHWATER_SPECIES];
const GROUPS = new Set(ALL_SPECIES.map((s) => s.group));
const ALL_IDS = new Set(ROSTER.map((r) => r.id));

function rosterUnlockKey(unlock: string): string {
  // Starters are encoded as 'starter|<group key>'.
  const parts = unlock.split('|');
  return parts[parts.length - 1];
}

type Genotype = Record<string, [string, string]>;

function ruleMatches(rule: SpeciesDefinition['genetics']['phenotypes'][number], g: Genotype): boolean {
  return rule.when.every((c) => {
    const n = g[c.locus].filter((a) => a === c.allele).length;
    if (c.count === 'hom') return n === 2;
    if (c.count === 'het') return n === 1;
    if (c.count === 'any') return n >= 1;
    return n === 0;
  });
}

/** Every unordered allele pair at every locus, combined across loci (all species here stay well under 100k genotypes). */
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

function checkParamRange(label: string, r: ParamRange): void {
  expect(Number.isFinite(r.min) && Number.isFinite(r.max) && Number.isFinite(r.idealMin) && Number.isFinite(r.idealMax), `${label} finite`).toBe(true);
  expect(r.min, `${label}: min <= idealMin`).toBeLessThanOrEqual(r.idealMin);
  expect(r.idealMin, `${label}: idealMin <= idealMax`).toBeLessThanOrEqual(r.idealMax);
  expect(r.idealMax, `${label}: idealMax <= max`).toBeLessThanOrEqual(r.max);
}

function checkRange(label: string, r: Range): void {
  expect(r.min, `${label}: min <= max`).toBeLessThanOrEqual(r.max);
  expect(r.min, `${label}: min >= 0`).toBeGreaterThanOrEqual(0);
}

describe('species-fw roster coverage', () => {
  it('every freshwater species id is a roster id owned by this lane, with no duplicates', () => {
    const fwIds = new Set(FW_ROSTER.map((r) => r.id));
    const seen = new Set<string>();
    for (const s of FW_ALL) {
      expect(fwIds.has(s.id), `${s.id} is not a species-fw roster id`).toBe(true);
      expect(seen.has(s.id), `duplicate ${s.id}`).toBe(false);
      seen.add(s.id);
    }
  });

  it('FRESHWATER_SPECIES excludes starters (they are exported from the species root)', () => {
    for (const s of FRESHWATER_SPECIES) expect(s.isStarter, s.id).toBe(false);
  });

  it('implements every freshwater roster entry and each is reachable through the registry', () => {
    for (const r of FW_ROSTER) {
      const s = findSpecies(r.id);
      expect(s, `missing species ${r.id}`).toBeDefined();
    }
  });
});

describe.each(FW_ALL.map((s) => [s.id, s] as const))('%s', (id, s) => {
  const roster = FW_ROSTER.find((r) => r.id === id)!;

  it('matches its roster entry (names, env, behaviour set, visual lane, unlock)', () => {
    expect(roster).toBeDefined();
    expect(s.scientificName).toBe(roster.scientificName);
    expect(s.environment).toBe('freshwater');
    expect(s.behaviorSet).toBe(roster.behaviorSet);
    expect(BEHAVIOR_SETS[s.behaviorSet as BehaviorSetId], `behaviorSet ${s.behaviorSet}`).toBe(true);
    expect(s.visualLane).toBe(roster.visual);
    const key = rosterUnlockKey(roster.unlock);
    expect(key in UNLOCK_KEYS, `unknown unlock key ${key}`).toBe(true);
    expect(s.unlock.requires).toEqual([key]);
    expect(s.unlock.hint.length).toBeGreaterThan(5);
    expect(s.isStarter).toBe(roster.unlock.startsWith('starter'));
  });

  it('has consistent water parameters for a freshwater animal', () => {
    checkParamRange(`${id}.tempC`, s.tempC);
    checkParamRange(`${id}.pH`, s.pH);
    expect(s.salinitySG, 'freshwater species must not have a salinity range').toBeNull();
    if (s.gh) checkRange(`${id}.gh`, s.gh);
    if (s.kh) checkRange(`${id}.kh`, s.kh);
    expect(s.tempC.min).toBeGreaterThanOrEqual(0);
    expect(s.tempC.max).toBeLessThanOrEqual(36);
    expect(s.pH.min).toBeGreaterThanOrEqual(4);
    expect(s.pH.max).toBeLessThanOrEqual(9.5);
    expect(s.waterClasses.length).toBeGreaterThan(0);
    for (const wc of s.waterClasses) expect(FRESHWATER_CLASSES, `${id} water class ${wc}`).toContain(wc);
    // Cool-water specialists must not be listed for tropical classes and vice versa.
    if (s.special?.coolWater) expect(s.tempC.idealMin).toBeLessThanOrEqual(22);
    if (s.waterClasses.includes('freshwater_cool')) expect(s.tempC.idealMin).toBeLessThanOrEqual(22);
    if (s.waterClasses.every((w) => w !== 'freshwater_cool')) expect(s.tempC.idealMax).toBeGreaterThanOrEqual(22);
  });

  it('uses only controlled-vocabulary predator/prey tags and valid food tags', () => {
    for (const t of s.predatorTags) expect(t in PREY_TAGS, `${id} predator tag ${t}`).toBe(true);
    for (const t of s.preyTags) expect(t in PREY_TAGS, `${id} prey tag ${t}`).toBe(true);
    expect(s.foods.length).toBeGreaterThan(0);
    for (const f of s.foods) expect(FOOD_TAGS[f], `${id} food ${f}`).toBe(true);
    if (s.breeding.conditions.needsConditioningFood) {
      for (const f of s.breeding.conditions.needsConditioningFood) expect(FOOD_TAGS[f], `${id} conditioning food ${f}`).toBe(true);
    }
  });

  it('has sane numeric fields and compressed-time life history', () => {
    const unit = [s.feedingSpeed, s.feedingAggression, s.territoriality, s.aggression, s.finNipper, s.coverPreference, s.coralRisk, s.hardiness, s.visitorAppeal, s.breeding.difficulty, s.breeding.predationWithoutNursery];
    for (const v of unit) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(s.adultSizeCm).toBeGreaterThan(0);
    expect(s.recommendedMinTankGallons).toBeGreaterThan(0);
    expect(s.bioload).toBeGreaterThan(0);
    expect(s.hungerHours).toBeGreaterThanOrEqual(8);
    expect(s.hungerHours).toBeLessThanOrEqual(96);
    expect(s.baseValue).toBeGreaterThan(0);
    expect(s.hidesNeeded).toBeGreaterThanOrEqual(0);
    expect(s.hidesNeeded).toBeLessThanOrEqual(3);
    expect(s.social.minGroup).toBeGreaterThanOrEqual(1);
    expect(s.social.idealGroup).toBeGreaterThanOrEqual(s.social.minGroup);
    checkRange(`${id}.clutchSize`, s.breeding.clutchSize);
    expect(s.breeding.maturityDays).toBeGreaterThanOrEqual(5);
    expect(s.breeding.maturityDays).toBeLessThanOrEqual(30);
    expect(s.breeding.incubationHours).toBeGreaterThan(0);
    expect(s.breeding.maxRaisedPerClutch).toBeGreaterThanOrEqual(1);
    expect(s.lifecycle.lifespanDays).toBeGreaterThan(s.lifecycle.juvenileDays);
    expect(s.lifecycle.lifespanDays).toBeLessThanOrEqual(500);
    expect(s.lifecycle.sexVisibleAtDays).toBeLessThanOrEqual(s.lifecycle.lifespanDays);
    expect(s.lifecycle.hatchSizeCm).toBeGreaterThan(0);
    expect(s.lifecycle.hatchSizeCm).toBeLessThan(s.adultSizeCm);
    expect(s.substrateRules.preferred.length).toBeGreaterThan(0);
    for (const k of s.substrateRules.preferred) expect(s.substrateRules.avoid).not.toContain(k);
  });

  it('has valid genetics: phenotype rules reference defined loci/alleles, frequencies > 0, valid hex colours', () => {
    const g = s.genetics;
    expect(g.loci.length).toBeGreaterThan(0);
    const loci = new Map(g.loci.map((l) => [l.id, new Set(l.alleles.map((a) => a.id))]));
    expect(loci.size, 'duplicate locus ids').toBe(g.loci.length);
    for (const l of g.loci) {
      expect(l.alleles.length, `${l.id} needs >= 2 alleles`).toBeGreaterThanOrEqual(2);
      expect(new Set(l.alleles.map((a) => a.id)).size, `${l.id} duplicate allele ids`).toBe(l.alleles.length);
      for (const a of l.alleles) {
        expect(a.frequency, `${l.id}.${a.id} frequency`).toBeGreaterThan(0);
        expect(Number.isFinite(a.dominance)).toBe(true);
      }
    }
    const ruleIds = new Set<string>();
    for (const p of g.phenotypes) {
      expect(ruleIds.has(p.id), `duplicate phenotype ${p.id}`).toBe(false);
      ruleIds.add(p.id);
      expect(p.rarity).toBeGreaterThanOrEqual(0);
      expect(p.rarity).toBeLessThanOrEqual(1);
      for (const c of p.when) {
        expect(loci.has(c.locus), `${id} rule ${p.id} unknown locus ${c.locus}`).toBe(true);
        expect(loci.get(c.locus)!.has(c.allele), `${id} rule ${p.id} unknown allele ${c.locus}.${c.allele}`).toBe(true);
      }
      for (const k of COLOR_KEYS) {
        const v = p.visual[k];
        if (v !== undefined) expect(HEX.test(String(v)), `${id} rule ${p.id} ${k}=${String(v)}`).toBe(true);
      }
      if (p.visual.finLength !== undefined) {
        expect(p.visual.finLength).toBeGreaterThanOrEqual(0.4);
        expect(p.visual.finLength).toBeLessThanOrEqual(2);
      }
    }
    // A fallback base rule (no conditions) guarantees every genome resolves to a named morph.
    expect(g.phenotypes.some((p) => p.layer === 'base' && p.when.length === 0), `${id} needs a fallback base phenotype`).toBe(true);
    for (const k of COLOR_KEYS) {
      const v = g.baseVisual[k];
      if (k === 'gillColor' && v === undefined) continue;
      expect(HEX.test(String(v)), `${id} baseVisual.${k}=${String(v)}`).toBe(true);
    }
    expect(g.baseVisual.finType.length).toBeGreaterThan(0);
    expect(g.variation).toBeGreaterThanOrEqual(0);
    expect(g.variation).toBeLessThanOrEqual(1);
    expect(s.visualMorphs.length).toBeGreaterThan(0);
  });

  it('every conditional phenotype rule is reachable by at least one genotype (no shadowed morphs)', () => {
    const reached = new Set<string>();
    let count = 0;
    for (const g of allGenotypes(s)) {
      count++;
      const base = s.genetics.phenotypes.find((r) => r.layer === 'base' && ruleMatches(r, g));
      expect(base, `${id}: some genotype resolves to no base phenotype`).toBeDefined();
      reached.add(base!.id);
      for (const r of s.genetics.phenotypes) if (r.layer === 'overlay' && ruleMatches(r, g)) reached.add(r.id);
    }
    expect(count).toBeLessThan(200_000);
    // Unconditional fallbacks may be unreachable when earlier rules already cover every genotype.
    const unreached = s.genetics.phenotypes.filter((r) => r.when.length > 0 && !reached.has(r.id)).map((r) => r.id);
    expect(unreached, `${id}: unreachable phenotype rules`).toEqual([]);
  });

  it('cites sources (two or more when it carries compatibility-critical exception rules)', () => {
    expect(s.sourceReferences.length).toBeGreaterThanOrEqual(1);
    const critical = s.exceptionRules.some((r) => r.verdictFloor === 'high_risk' || r.verdictFloor === 'incompatible');
    if (critical) expect(s.sourceReferences.length, `${id} has high-risk rules`).toBeGreaterThanOrEqual(2);
    for (const src of s.sourceReferences) {
      expect([1, 2, 3]).toContain(src.tier);
      expect(src.facts.length).toBeGreaterThan(0);
      if (src.url) expect(src.url.startsWith('https://'), `${id} source url ${src.url}`).toBe(true);
    }
    expect(s.sourceReferences.some((r) => r.tier <= 2), `${id} needs at least one Tier 1/2 source`).toBe(true);
    expect(s.confidenceNotes.length).toBeGreaterThan(0);
  });

  it('exception rules point at real species ids, vocabulary tags or species groups', () => {
    expect(Array.isArray(s.exceptionRules), `${id} exceptionRules is a list`).toBe(true);
    for (const r of s.exceptionRules) {
      if (r.other.startsWith('tag:')) {
        const t = r.other.slice(4);
        expect(t in PREY_TAGS || GROUPS.has(t), `${id} rule other=${r.other}`).toBe(true);
      } else {
        expect(ALL_IDS.has(r.other), `${id} rule other=${r.other}`).toBe(true);
      }
      expect(r.reason.length).toBeGreaterThan(10);
      if (r.incidentRisk !== undefined) {
        expect(r.incidentRisk).toBeGreaterThanOrEqual(0);
        expect(r.incidentRisk).toBeLessThanOrEqual(1);
      }
    }
    for (const p of s.positiveInteractions ?? []) {
      const ok = p.other.startsWith('tag:') ? p.other.slice(4) in PREY_TAGS || GROUPS.has(p.other.slice(4)) : ALL_IDS.has(p.other);
      expect(ok, `${id} positive interaction other=${p.other}`).toBe(true);
    }
  });

  it('has a complete encyclopedia entry that never endorses release', () => {
    const e = s.encyclopedia;
    for (const [k, v] of Object.entries(e)) expect(String(v).length, `${id} encyclopedia.${k}`).toBeGreaterThan(15);
    const all = Object.values(e).join(' ').toLowerCase();
    expect(all).not.toMatch(/(safe|okay|fine) to release/);
    expect(s.conservation.status.length).toBeGreaterThan(3);
    expect(s.conservation.note.length).toBeGreaterThan(20);
  });
});

describe('species-fw required biology rules', () => {
  const get = (id: string) => findSpecies(id);

  it('goldfish vs dwarf shrimp is high risk (shrimplets at extreme risk)', () => {
    for (const id of ['comet_goldfish', 'fancy_goldfish']) {
      const s = get(id);
      if (!s) continue;
      const rule = s.exceptionRules.find((r) => r.other === 'tag:shrimp_dwarf');
      expect(rule, `${id} needs a tag:shrimp_dwarf rule`).toBeDefined();
      expect(rule!.verdictFloor).toBe('high_risk');
      expect(rule!.reason).toMatch(/Goldfish may eat these shrimp/);
      expect(s.predatorTags).toContain('shrimp_fry');
      expect(s.special?.heavyWaste).toBe(true);
      expect(s.special?.outgrowsSmallTanks).toBe(true);
      expect(s.waterClasses).toContain('freshwater_cool');
    }
  });

  it('axolotl is a cool-water freshwater animal, never brackish', () => {
    expect(axolotl.environment).toBe('freshwater');
    expect(axolotl.waterClasses).toEqual(['freshwater_cool']);
    expect(axolotl.salinitySG).toBeNull();
    expect(axolotl.tempC.max).toBeLessThanOrEqual(22);
  });

  it('amano and nerite reproduction reflects brackish larval needs', () => {
    const amano = get('amano_shrimp');
    if (amano) expect(['shrimp_larval_marine', 'not_in_game']).toContain(amano.breeding.system);
    const nerite = get('nerite_snail');
    if (nerite) expect(nerite.breeding.notes.toLowerCase()).toMatch(/freshwater/);
  });

  it('grazers that starve in new tanks require a mature tank', () => {
    const oto = get('otocinclus');
    if (oto) {
      expect(oto.special?.requiresMatureDays ?? 0).toBeGreaterThan(0);
      expect(oto.social.minGroup).toBeGreaterThanOrEqual(6);
    }
  });

  it('shoaling bottom-dwellers need groups', () => {
    const cory = get('panda_corydoras');
    if (cory) {
      expect(cory.social.minGroup).toBeGreaterThanOrEqual(6);
      expect(cory.special?.needsSinkingFood).toBe(true);
    }
    const kuhli = get('kuhli_loach');
    if (kuhli) {
      expect(kuhli.social.minGroup).toBeGreaterThanOrEqual(5);
      expect(kuhli.special?.escapeArtist).toBe(true);
    }
  });

  it('cardinals prefer warmer, softer water than neons', () => {
    const neon = get('neon_tetra');
    const cardinal = get('cardinal_tetra');
    if (neon && cardinal) {
      expect(cardinal.tempC.idealMax).toBeGreaterThan(neon.tempC.idealMax);
      expect(cardinal.pH.idealMin).toBeLessThanOrEqual(neon.pH.idealMin);
    }
  });
});
