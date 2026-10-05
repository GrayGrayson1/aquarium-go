/**
 * Lane species-marine — data validation for every marine species (2 marine starters + MARINE_SPECIES).
 * Run: npx vitest run tests/sim/species-marine.test.ts
 */
import { describe, expect, it } from 'vitest';
import type {
  BehaviorSetId,
  CompatVerdict,
  CreatureVisualParams,
  FoodTag,
  ParamRange,
  Range,
  SpeciesDefinition,
  WaterClass,
} from '@/types';
import { ROSTER } from '@/data/species/roster';
import { PREY_TAGS } from '@/data/species/tags';
import { MARINE_SPECIES } from '@/data/species/marine';
import { ALL_SPECIES, findSpecies } from '@/data/species';
import { ocellarisClownfish } from '@/data/species/ocellaris_clownfish';
import { linedSeahorse } from '@/data/species/lined_seahorse';
import { UNLOCK_KEYS } from '@/data/unlockKeys';

// Exhaustive runtime mirrors of union types (Record<Union, true> makes TypeScript flag drift).
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
const VERDICT_RANK: Record<CompatVerdict, number> = { excellent: 0, usually_compatible: 1, conditional: 2, high_risk: 3, incompatible: 4 };
const MARINE_CLASSES: WaterClass[] = ['marine_fowlr', 'marine_live_rock', 'reef'];
const COLOR_KEYS: (keyof CreatureVisualParams)[] = ['bodyColor', 'bodyColor2', 'bellyColor', 'finColor', 'finColor2', 'accentColor', 'eyeColor', 'gillColor'];
const HEX = /^#[0-9a-fA-F]{6}$/;

const MARINE_ROSTER = ROSTER.filter((r) => r.lane === 'species-marine');
const MARINE_STARTERS: SpeciesDefinition[] = [ocellarisClownfish, linedSeahorse];
const MARINE_ALL: SpeciesDefinition[] = [...MARINE_STARTERS, ...MARINE_SPECIES];
const GROUPS = new Set(ALL_SPECIES.map((s) => s.group));
const ALL_IDS = new Set(ROSTER.map((r) => r.id));

function rosterUnlockKey(unlock: string): string {
  const parts = unlock.split('|');
  return parts[parts.length - 1];
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

function rule(s: SpeciesDefinition, other: string) {
  return s.exceptionRules.find((r) => r.other === other);
}

function atLeast(v: CompatVerdict | undefined, floor: CompatVerdict): boolean {
  return v !== undefined && VERDICT_RANK[v] >= VERDICT_RANK[floor];
}

const get = (id: string): SpeciesDefinition => {
  const s = findSpecies(id);
  expect(s, `missing species ${id}`).toBeDefined();
  return s!;
};

describe('species-marine roster coverage', () => {
  it('every marine species id is a species-marine roster id, with no duplicates', () => {
    const ids = new Set(MARINE_ROSTER.map((r) => r.id));
    const seen = new Set<string>();
    for (const s of MARINE_ALL) {
      expect(ids.has(s.id), `${s.id} is not a species-marine roster id`).toBe(true);
      expect(seen.has(s.id), `duplicate ${s.id}`).toBe(false);
      seen.add(s.id);
    }
  });

  it('implements all 20 marine roster entries and each is reachable through the registry', () => {
    expect(MARINE_ALL.length).toBe(MARINE_ROSTER.length);
    for (const r of MARINE_ROSTER) expect(findSpecies(r.id), `missing ${r.id}`).toBeDefined();
  });

  it('MARINE_SPECIES excludes the starters (exported from the species root)', () => {
    for (const s of MARINE_SPECIES) expect(s.isStarter, s.id).toBe(false);
  });
});

describe.each(MARINE_ALL.map((s) => [s.id, s] as const))('%s', (id, s) => {
  const roster = MARINE_ROSTER.find((r) => r.id === id)!;

  it('matches its roster entry (names, env, behaviour set, visual lane, unlock)', () => {
    expect(roster).toBeDefined();
    expect(s.scientificName).toBe(roster.scientificName);
    expect(s.environment).toBe('marine');
    expect(s.behaviorSet).toBe(roster.behaviorSet);
    expect(BEHAVIOR_SETS[s.behaviorSet as BehaviorSetId], `behaviorSet ${s.behaviorSet}`).toBe(true);
    expect(s.visualLane).toBe(roster.visual);
    const key = rosterUnlockKey(roster.unlock);
    expect(key in UNLOCK_KEYS, `unknown unlock key ${key}`).toBe(true);
    expect(s.unlock.requires).toEqual([key]);
    expect(s.unlock.hint.length).toBeGreaterThan(5);
    expect(s.isStarter).toBe(roster.unlock.startsWith('starter'));
  });

  it('has consistent marine water parameters (salinity required)', () => {
    checkParamRange(`${id}.tempC`, s.tempC);
    checkParamRange(`${id}.pH`, s.pH);
    expect(s.salinitySG, 'marine species need a salinity range').not.toBeNull();
    checkParamRange(`${id}.salinitySG`, s.salinitySG!);
    expect(s.salinitySG!.min).toBeGreaterThanOrEqual(1.015);
    expect(s.salinitySG!.max).toBeLessThanOrEqual(1.03);
    expect(s.gh).toBeNull();
    if (s.kh) checkRange(`${id}.kh`, s.kh);
    expect(s.tempC.min).toBeGreaterThanOrEqual(18);
    expect(s.tempC.max).toBeLessThanOrEqual(31);
    expect(s.pH.min).toBeGreaterThanOrEqual(7.6);
    expect(s.pH.max).toBeLessThanOrEqual(8.8);
    expect(s.waterClasses.length).toBeGreaterThan(0);
    for (const wc of s.waterClasses) expect(MARINE_CLASSES, `${id} water class ${wc}`).toContain(wc);
    // Anything listed for reef tanks must not be reef-unsafe.
    if (s.waterClasses.includes('reef')) expect(s.reefSafe).not.toBe('unsafe');
  });

  it('uses only controlled-vocabulary predator/prey tags and valid food tags', () => {
    for (const t of s.predatorTags) expect(t in PREY_TAGS, `${id} predator tag ${t}`).toBe(true);
    for (const t of s.preyTags) expect(t in PREY_TAGS, `${id} prey tag ${t}`).toBe(true);
    expect(s.preyTags.length, `${id} needs at least one prey tag`).toBeGreaterThan(0);
    expect(s.foods.length).toBeGreaterThan(0);
    for (const f of s.foods) expect(FOOD_TAGS[f], `${id} food ${f}`).toBe(true);
    for (const f of s.breeding.conditions.needsConditioningFood ?? []) expect(FOOD_TAGS[f], `${id} conditioning food ${f}`).toBe(true);
  });

  it('has sane numeric fields and compressed-time life history', () => {
    const unit = [s.feedingSpeed, s.feedingAggression, s.territoriality, s.aggression, s.finNipper, s.coverPreference, s.coralRisk, s.hardiness, s.visitorAppeal, s.breeding.difficulty, s.breeding.predationWithoutNursery];
    for (const v of unit) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    const bt = s.behaviorTraits;
    for (const v of [bt.hoverTendency, bt.schoolingTightness, bt.restOnBottom, bt.hitching, bt.burrowing, bt.glassSurfing, bt.curiosity, bt.nocturnal]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(s.adultSizeCm).toBeGreaterThan(0);
    expect(s.recommendedMinTankGallons).toBeGreaterThan(0);
    expect(s.recommendedFootprint.minLengthIn).toBeGreaterThan(0);
    expect(s.bioload).toBeGreaterThan(0);
    expect(s.hungerHours).toBeGreaterThanOrEqual(8);
    expect(s.hungerHours).toBeLessThanOrEqual(48);
    if (s.temperament === 'predatory' && s.category === 'fish') expect(s.hungerHours).toBeGreaterThanOrEqual(24);
    expect(s.baseValue).toBeGreaterThan(0);
    expect(s.hidesNeeded).toBeGreaterThanOrEqual(0);
    expect(s.hidesNeeded).toBeLessThanOrEqual(3);
    expect(s.social.minGroup).toBeGreaterThanOrEqual(1);
    expect(s.social.idealGroup).toBeGreaterThanOrEqual(s.social.minGroup);
    checkRange(`${id}.clutchSize`, s.breeding.clutchSize);
    expect(s.breeding.maturityDays).toBeGreaterThanOrEqual(8);
    expect(s.breeding.maturityDays).toBeLessThanOrEqual(25);
    expect(s.breeding.incubationHours).toBeGreaterThan(0);
    expect(s.breeding.maxRaisedPerClutch).toBeGreaterThanOrEqual(1);
    expect(s.lifecycle.juvenileDays).toBeGreaterThan(0);
    expect(s.lifecycle.lifespanDays).toBeGreaterThan(s.lifecycle.juvenileDays);
    expect(s.lifecycle.lifespanDays).toBeLessThanOrEqual(500);
    expect(s.lifecycle.sexVisibleAtDays).toBeLessThanOrEqual(s.lifecycle.lifespanDays);
    expect(s.lifecycle.hatchSizeCm).toBeGreaterThan(0);
    expect(s.lifecycle.hatchSizeCm).toBeLessThan(s.adultSizeCm);
    expect(s.substrateRules.preferred.length).toBeGreaterThan(0);
    for (const k of s.substrateRules.preferred) expect(s.substrateRules.avoid).not.toContain(k);
    if (!s.captiveBredAvailable) expect(s.wildCaughtNote, `${id} is wild-caught only and needs a wildCaughtNote`).toBeTruthy();
  });

  it('has valid genetics: phenotype rules reference defined loci/alleles, valid hex colours, a fallback base', () => {
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
        expect(a.fictional, `${id} ${l.id}.${a.id} must be real`).not.toBe(true);
      }
    }
    const ruleIds = new Set<string>();
    for (const p of g.phenotypes) {
      expect(ruleIds.has(p.id), `duplicate phenotype ${p.id}`).toBe(false);
      ruleIds.add(p.id);
      expect(p.fictional, `${id} phenotype ${p.id} must be real`).not.toBe(true);
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
    // The last base rule must be the unconditional fallback, so conditional base rules are reachable ("first match wins").
    const bases = g.phenotypes.filter((p) => p.layer === 'base');
    expect(bases.length).toBeGreaterThan(0);
    expect(bases[bases.length - 1].when.length, `${id}: last base phenotype must be the fallback`).toBe(0);
    for (const k of COLOR_KEYS) {
      const v = g.baseVisual[k];
      if (k === 'gillColor' && v === undefined) continue;
      expect(HEX.test(String(v)), `${id} baseVisual.${k}=${String(v)}`).toBe(true);
    }
    expect(g.baseVisual.finType.length).toBeGreaterThan(0);
    expect(g.baseVisual.patternScale).toBeGreaterThanOrEqual(0.5);
    expect(g.baseVisual.patternScale).toBeLessThanOrEqual(2);
    for (const v of [g.baseVisual.patternContrast, g.baseVisual.iridescence, g.baseVisual.metallic, g.baseVisual.translucency, g.variation]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(s.visualMorphs.length).toBeGreaterThan(0);
  });

  it('cites sources (two or more when it carries compatibility-critical exception rules)', () => {
    expect(s.sourceReferences.length).toBeGreaterThanOrEqual(2);
    const critical = s.exceptionRules.some((r) => r.verdictFloor === 'high_risk' || r.verdictFloor === 'incompatible');
    if (critical) expect(s.sourceReferences.length, `${id} has high-risk rules`).toBeGreaterThanOrEqual(2);
    const ids = new Set<string>();
    for (const src of s.sourceReferences) {
      expect(ids.has(src.id), `${id} duplicate source id ${src.id}`).toBe(false);
      ids.add(src.id);
      expect([1, 2, 3]).toContain(src.tier);
      expect(src.facts.length).toBeGreaterThan(0);
      expect(src.url, `${id} source ${src.id} needs a URL`).toBeTruthy();
      expect(src.url!.startsWith('https://'), `${id} source url ${src.url}`).toBe(true);
    }
    expect(s.sourceReferences.some((r) => r.tier === 1), `${id} needs at least one Tier 1 source`).toBe(true);
    expect(s.confidenceNotes.length).toBeGreaterThan(0);
    expect(s.confidenceNotes.join(' ')).not.toMatch(/Seed record/);
  });

  it('exception rules and positive interactions point at real species ids, vocabulary tags or species groups', () => {
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
      expect(p.text.length).toBeGreaterThan(10);
    }
  });

  it('has a complete encyclopedia entry that never endorses release', () => {
    const e = s.encyclopedia;
    for (const [k, v] of Object.entries(e)) expect(String(v).length, `${id} encyclopedia.${k}`).toBeGreaterThan(15);
    const all = Object.values(e).join(' ').toLowerCase();
    expect(all).not.toMatch(/(safe|okay|fine|ok) to release/);
    expect(all).not.toMatch(/release (it|them) (in|into) the (wild|sea|ocean)/);
    expect(s.conservation.status.length).toBeGreaterThan(3);
    expect(s.conservation.note.length).toBeGreaterThan(20);
  });
});

describe('species-marine required biology rules', () => {
  it('ocellaris clownfish: protandrous, male egg care, optional anemone, Least Concern', () => {
    const s = ocellarisClownfish;
    expect(s.sexSystem).toBe('protandrous');
    expect(s.parentalCare).toBe('male');
    expect(s.breeding.system).toBe('clownfish_substrate');
    expect(s.anemoneRelationship).toBe('host_seeker');
    expect(s.special?.hostNote).toMatch(/No anemone is needed/);
    expect(s.conservation.status).toMatch(/Least Concern/);
    expect(s.captiveBredAvailable).toBe(true);
    // Locus ids used by other lanes stay stable.
    expect(s.genetics.loci.map((l) => l.id)).toEqual(['snow', 'mel', 'misbar']);
  });

  it('lined seahorse: slow feeder, low flow, male pouch, flags fast feeders, predators and stinging cnidarians', () => {
    const s = linedSeahorse;
    expect(s.feedingSpeed).toBeLessThanOrEqual(0.2);
    expect(s.flowPreference).toBe('low');
    expect(s.parentalCare).toBe('male_pouch');
    expect(s.breeding.system).toBe('seahorse_pouch');
    expect(s.anemoneRelationship).toBe('prey_risk');
    expect(s.special?.stingSensitive).toBe(true);
    expect(s.temperament).toBe('peaceful');
    expect(atLeast(rule(s, 'tag:tang')?.verdictFloor, 'high_risk')).toBe(true);
    expect(atLeast(rule(s, 'tag:stinging_cnidarian')?.verdictFloor, 'incompatible')).toBe(true);
    for (const pred of ['dwarf_lionfish', 'miniatus_grouper', 'peacock_mantis_shrimp']) {
      expect(atLeast(rule(s, pred)?.verdictFloor, 'incompatible'), `seahorse vs ${pred}`).toBe(true);
    }
    expect(atLeast(rule(s, 'coral_beauty')?.verdictFloor, 'high_risk')).toBe(true);
    expect(rule(s, 'ocellaris_clownfish')?.mitigatedBy).toContain('target_feeding');
    // Every fast, pushy marine feeder should be flagged against the seahorse by a rule (id, group or tag).
    const fast = MARINE_SPECIES.filter((o) => o.feedingSpeed >= 0.7 && o.feedingAggression >= 0.4);
    for (const o of fast) {
      const flagged = s.exceptionRules.some((r) => r.other === o.id || r.other === `tag:${o.group}` || o.preyTags.some((t) => r.other === `tag:${t}`) || o.predatorTags.some((t) => r.other === `tag:${t}`));
      const reverse = o.exceptionRules.some((r) => r.other === s.id || s.preyTags.some((t) => r.other === `tag:${t}`));
      const predatory = o.predatorTags.includes('fish_slow');
      expect(flagged || reverse || predatory, `seahorse needs a rule for fast feeder ${o.id}`).toBe(true);
    }
  });

  it('cleaner shrimp runs a cleaning station with fish', () => {
    const s = get('cleaner_shrimp');
    expect(s.specialBehaviors).toContain('cleaning_station');
    expect((s.positiveInteractions ?? []).length).toBeGreaterThan(0);
    expect(s.sexSystem).toBe('simultaneous_hermaphrodite');
    expect(s.special?.medicationSensitive).toBe(true);
    expect(s.reefSafe).toBe('safe');
  });

  it('peppermint shrimp eats Aiptasia but may pick at corals', () => {
    const s = get('peppermint_shrimp');
    expect(s.predatorTags).toContain('aiptasia');
    expect(s.positiveInteractions?.some((p) => p.other === 'tag:aiptasia')).toBe(true);
    expect(s.coralRisk).toBeGreaterThan(0);
    expect(s.reefSafe).not.toBe('safe');
  });

  it('blue-leg hermits may kill snails for shells and are mantis prey', () => {
    const s = get('hermit_crab');
    const r = rule(s, 'tag:snail');
    expect(r?.verdictFloor).toBe('conditional');
    expect(r?.reason).toMatch(/shell/);
    expect(s.predatorTags).toContain('snail');
    expect(s.preyTags).toContain('crustacean');
    expect(get('trochus_snail').preyTags).toContain('snail');
    expect(get('peacock_mantis_shrimp').predatorTags).toContain('crustacean');
  });

  it('tangs: big tanks, active swimmers, outgrow small tanks, tang–tang aggression', () => {
    const y = get('yellow_tang');
    const k = get('kole_tang');
    expect(y.recommendedMinTankGallons).toBeGreaterThanOrEqual(100);
    expect(y.recommendedFootprint.minLengthIn).toBeGreaterThanOrEqual(72);
    expect(k.recommendedMinTankGallons).toBeGreaterThanOrEqual(70);
    for (const t of [y, k]) {
      expect(t.activeSwimmer).toBe(true);
      expect(t.special?.outgrowsSmallTanks).toBe(true);
      expect(t.sameSpeciesRule.maleMale).toBe('fight');
      expect(t.group).toBe('tang');
    }
    expect(atLeast(rule(y, 'kole_tang')?.verdictFloor, 'conditional')).toBe(true);
    expect(atLeast(rule(k, 'yellow_tang')?.verdictFloor, 'conditional')).toBe(true);
  });

  it('coral beauty is reef-with-caution and may nip LPS and clams', () => {
    const s = get('coral_beauty');
    expect(s.reefSafe).toBe('caution');
    expect(s.coralRisk).toBeGreaterThanOrEqual(0.25);
    expect(s.predatorTags).toEqual(expect.arrayContaining(['coral_polyp', 'clam']));
    expect(s.sexSystem).toBe('protogynous');
  });

  it('foxface is venomous, grazes algae and is mostly reef-safe', () => {
    const s = get('foxface_rabbitfish');
    expect(s.special?.venomous).toBe(true);
    expect(s.diet).toBe('herbivore');
    expect(s.reefSafe).toBe('mostly_safe');
  });

  it('mandarin needs a mature tank with copepods and is a slow feeder', () => {
    const s = get('mandarin_dragonet');
    expect(s.special?.requiresMatureDays ?? 0).toBeGreaterThanOrEqual(10);
    expect(s.special?.needsPods).toBe(true);
    expect(s.feedingSpeed).toBeLessThanOrEqual(0.2);
    expect(s.foods).toContain('copepod_live');
    expect(s.visualMorphs).toEqual(expect.arrayContaining(['Green Mandarin', 'Red Mandarin']));
    expect(s.sameSpeciesRule.maleMale).toBe('fight');
  });

  it('peacock mantis shrimp is a species-only burrowing smasher with top visitor appeal', () => {
    const s = get('peacock_mantis_shrimp');
    expect(s.special?.speciesOnly).toBe(true);
    expect(s.special?.burrower).toBe(true);
    expect(s.special?.glassStrikeRisk).toBe(true);
    expect(s.visitorAppeal).toBeGreaterThanOrEqual(0.9);
    expect(s.predatorTags).toEqual(expect.arrayContaining(['snail', 'crustacean', 'shrimp_large', 'fish_small']));
    expect(s.sourceReferences.some((r) => r.url?.includes('montereybayaquarium.org'))).toBe(true);
    expect(s.sameSpeciesRule.maleMale).toBe('lethal');
    expect(s.waterClasses).not.toContain('reef');
    for (const tag of ['tag:snail', 'tag:crustacean', 'tag:fish_small']) expect(atLeast(rule(s, tag)?.verdictFloor, 'incompatible'), tag).toBe(true);
  });

  it('dwarf lionfish is venomous, eats small fish and shrimp, and is distinguished from invasive Pterois', () => {
    const s = get('dwarf_lionfish');
    expect(s.special?.venomous).toBe(true);
    expect(s.predatorTags).toEqual(expect.arrayContaining(['fish_small', 'shrimp_large']));
    expect(s.encyclopedia.conservationNote).toMatch(/Pterois volitans/);
    expect(s.sourceReferences.some((r) => r.url?.includes('noaa.gov'))).toBe(true);
    expect(s.hungerHours).toBeGreaterThanOrEqual(24);
  });

  it('miniatus grouper is a large predator needing a very large tank', () => {
    const s = get('miniatus_grouper');
    expect(s.adultSizeCm).toBeGreaterThanOrEqual(40);
    expect(s.recommendedMinTankGallons).toBeGreaterThanOrEqual(180);
    expect(s.predatorTags).toEqual(expect.arrayContaining(['fish_small', 'crustacean']));
    expect(s.special?.outgrowsSmallTanks).toBe(true);
    expect(s.hungerHours).toBeGreaterThanOrEqual(24);
  });

  it('small reef fish have the requested special needs', () => {
    expect(get('firefish').special?.escapeArtist).toBe(true);
    const w = get('watchman_goby');
    expect(w.special?.burrower).toBe(true);
    expect(w.special?.hostNote).toMatch(/pistol shrimp/);
    const cg = get('clown_goby');
    expect(cg.unlock.requires).toEqual(['reef']);
    expect(cg.special?.hostNote).toMatch(/Acropora/);
    const b = get('banggai_cardinalfish');
    expect(b.breeding.system).toBe('mouthbrooder');
    expect(b.parentalCare).toBe('male_mouth');
    expect(b.conservation.status).toMatch(/Endangered/);
    expect(b.captiveBredAvailable).toBe(true);
    const c = get('green_chromis');
    expect(['shoal', 'school']).toContain(c.social.kind);
    expect(c.social.minGroup).toBeGreaterThanOrEqual(3);
    expect(c.sameSpeciesRule.maleMale).not.toBe('ok');
    const g = get('royal_gramma');
    expect(g.sameSpeciesRule.maleMale).toBe('fight');
    expect(g.hidesNeeded).toBeGreaterThanOrEqual(2);
  });

  it('predators are flagged against the vulnerable roster species', () => {
    // Every roster prey animal small enough to be eaten must be caught by a predator's tags or an explicit rule.
    const predators = ['dwarf_lionfish', 'miniatus_grouper', 'peacock_mantis_shrimp'].map(get);
    for (const p of predators) {
      for (const prey of MARINE_ALL) {
        if (prey.id === p.id) continue;
        const small = prey.adultSizeCm <= p.maxLikelyPreySizeCm && prey.category === 'fish';
        if (!small) continue;
        const byTag = prey.preyTags.some((t) => p.predatorTags.includes(t));
        const matches = (other: string, target: SpeciesDefinition) =>
          other === target.id || other === `tag:${target.group}` || target.preyTags.some((t) => other === `tag:${t}`);
        const byRule = p.exceptionRules.some((r) => matches(r.other, prey)) || prey.exceptionRules.some((r) => matches(r.other, p));
        expect(byTag || byRule, `${p.id} should threaten ${prey.id}`).toBe(true);
      }
    }
  });

  it('wild-only animals are flagged and captive-bred starters are preferred', () => {
    for (const s of MARINE_STARTERS) expect(s.captiveBredAvailable).toBe(true);
    const wildOnly = MARINE_ALL.filter((s) => !s.captiveBredAvailable).map((s) => s.id);
    expect(wildOnly).toEqual(expect.arrayContaining(['green_chromis', 'firefish', 'peacock_mantis_shrimp']));
  });
});
