/**
 * Pair-spawner configurations: egg_scatter_cover (pea puffer, tetras, white clouds, medaka), substrate_spawner
 * (corydoras), cave_spawner (bristlenose, kuhli), mouthbrooder (Banggai cardinal), snail_egg_clutch (mystery /
 * nerite snails) and egg_layer_generic. OWNER: lane "breeding".
 */
import type { Tank } from '@/types';
import type { RearingPlan } from '../types';
import { makePairSpawner, TEXT } from './pairSpawner';
import { hasLid, plural, spName, spPlural } from '../common';

const basePlan = (over: Partial<RearingPlan>): RearingPlan => ({
  phases: [
    { stage: 'larvae', frac: 0.2, foods: ['infusoria'], natural: ['infusoria'], visual: 'keep', label: 'larvae' },
    { stage: 'fry', frac: 0.8, foods: ['baby_brine', 'infusoria', 'daphnia'], natural: ['infusoria'], visual: 'fry_cloud', label: 'fry' },
  ],
  eggTags: ['eggs'],
  youngTags: ['fry'],
  parentsEatEggs: true,
  guardEggs: false,
  guardianEatsFry: false,
  planktonic: false,
  hatchAtNight: false,
  larvaeViable: true,
  starveSeverity: 1.1,
  coverShelter: 0.4,
  yolkFrac: 0.15,
  ...over,
});

/** Pea puffer, tetras, white clouds, medaka… — a courting chase into moss/plants, few-to-many scattered eggs. */
export const eggScatterModule = makePairSpawner({
  id: 'egg_scatter_cover',
  plan: basePlan({}),
  window: 'morning',
  courtHours: [1.5, 3],
  spawnHours: [0.75, 1.5],
  spawnStage: 'spawning',
  guardStage: 'guarding',
  visual: 'eggs_scattered',
  site: 'plants_low',
  extraSites: 4,
  maleRestFrac: 0.5,
  text: {
    court: (m, f, sp) =>
      sp.behaviorSet === 'pea_puffer'
        ? `${m.name} darkens his belly stripe and chases ${f.name} into the moss — a pea puffer courtship!`
        : `${m.name} is flashing and chasing ${f.name} through the plants — the ${spName(sp)} are about to spawn.`,
    spawn: (m, f, sp, n, tank, guardian) =>
      `${f.name} and ${m.name} spawned deep in the ${tank.decor.length ? 'plants' : 'cover'} — ${plural(n, 'tiny egg')}!${guardian ? ` ${guardian.name} is guarding them.` : ` Adult ${spPlural(sp)} eat their eggs, so move them to a nursery tank.`}`,
  },
});

/** Corydoras: males jostle a female, T-position, sticky eggs pressed onto the glass. */
export const substrateSpawnerModule = makePairSpawner({
  id: 'substrate_spawner',
  plan: basePlan({
    phases: [
      { stage: 'larvae', frac: 0.2, foods: ['infusoria'], natural: ['infusoria'], visual: 'keep', label: 'larvae' },
      { stage: 'fry', frac: 0.8, foods: ['baby_brine', 'infusoria', 'pellet_sinking', 'flake'], natural: ['infusoria', 'biofilm'], visual: 'fry_cloud', label: 'fry' },
    ],
  }),
  window: 'any',
  courtHours: [2, 4],
  spawnHours: [1, 2],
  spawnStage: 'spawning',
  guardStage: 'guarding',
  visual: 'eggs_adhesive',
  site: 'glass',
  extraSites: 6,
  maleRestFrac: 0.4,
  text: {
    court: (m, f) => `${m.name} and friends are dashing along the glass after ${f.name} — cory spawning behaviour!`,
    spawn: (m, f, sp, n) => `${f.name} and ${m.name} formed the classic “T-position” and ${f.name} pressed ${plural(n, 'sticky egg')} onto the glass. The adults will eat them — move them to a nursery tank.`,
  },
  status: (state, c) => (c.repro.stage === 'spawning' ? { label: 'Spawning in the T-position', progress: c.repro.progress } : null),
});

/** Bristlenose/kuhli: the male claims a cave and guards (fans) the eggs; wrigglers stay inside until free-swimming. */
export const caveSpawnerModule = makePairSpawner({
  id: 'cave_spawner',
  plan: basePlan({
    phases: [
      { stage: 'larvae', frac: 0.3, foods: [], natural: [], visual: 'keep', label: 'wrigglers' },
      { stage: 'fry', frac: 0.7, foods: ['algae_wafer', 'biofilm', 'pellet_sinking', 'vegetable', 'baby_brine'], natural: ['biofilm', 'algae'], visual: 'fry_cloud', label: 'fry' },
    ],
    guardEggs: true,
    guardYoung: true,
    yolkFrac: 0.3,
    coverShelter: 0.5,
    starveSeverity: 0.9,
  }),
  window: 'night',
  courtHours: [2, 5],
  spawnHours: [1, 3],
  spawnStage: 'spawning',
  guardStage: 'guarding',
  visual: 'eggs_adhesive',
  site: 'cave',
  extraSites: 2,
  maleRestFrac: 0.3,
  text: {
    court: (m, f) => `${m.name} has cleaned out his cave and is coaxing ${f.name} inside.`,
    spawn: (m, f, sp, n, tank, guardian) => `${f.name} laid a sticky cluster of ${plural(n, 'egg')} in ${m.name}’s cave.${guardian ? ` ${guardian.name} is fanning them with his fins.` : ''}`,
  },
});

/** Banggai cardinal: the male holds the eggs in his mouth and cannot eat until he releases fully formed young. */
export const mouthbrooderModule = makePairSpawner({
  id: 'mouthbrooder',
  plan: basePlan({
    phases: [{ stage: 'fry', frac: 1, foods: ['baby_brine', 'copepod_live', 'mysis'], natural: ['copepods'], visual: 'fry_cloud', label: 'young' }],
    parentsEatEggs: false,
    coverShelter: 0.45,
    starveSeverity: 1.0,
    yolkFrac: 0.05,
  }),
  window: 'dawn',
  courtHours: [2, 4],
  spawnHours: [0.5, 1],
  spawnStage: 'spawning',
  guardStage: 'brooding',
  visual: 'eggs_adhesive',
  site: 'midwater',
  extraSites: 0,
  carried: true,
  maleRestFrac: 0.5,
  text: {
    court: (m, f) => `${f.name} is courting ${m.name}, circling him with fins held wide.`,
    spawn: (m, f, sp, n) => `${f.name} released a ball of ${plural(n, 'egg')} and ${m.name} scooped them into his mouth. He won’t eat until they hatch.`,
    release: (g, n) => `${g.name} spat out ${plural(n, 'perfect miniature cardinal')} — they’ll shelter among spines and branches. A nursery gives them the best start.`,
  },
});

const cap = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);
const isNerite = (genus: string, name: string) => /neritina|vittina|clithon/i.test(genus) || /nerite/i.test(name);

/** Mystery snails lay a pink clutch in the air gap above the waterline (needs a lid); nerite eggs never hatch in freshwater. */
export const snailClutchModule = makePairSpawner({
  id: 'snail_egg_clutch',
  plan: basePlan({
    phases: [{ stage: 'fry', frac: 1, foods: ['algae_wafer', 'vegetable', 'biofilm', 'flake'], natural: ['biofilm', 'algae'], visual: 'fry_cloud', label: 'baby snails' }],
    eggTags: ['eggs'],
    youngTags: ['snail_small', 'snail'],
    parentsEatEggs: false,
    starveSeverity: 0.5,
    coverShelter: 0.3,
    yolkFrac: 0.1,
  }),
  window: 'night',
  courtHours: [2, 6],
  spawnHours: [2, 4],
  spawnStage: 'laying',
  guardStage: 'guarding',
  visual: 'snail_clutch',
  site: 'above_water',
  extraSites: 0,
  maleRestFrac: 0.3,
  gate(state, tank: Tank, sp) {
    if (isNerite(sp.genus, sp.commonName)) return { ok: true };
    // The rim leaves an air gap above the waterline; a lid keeps it humid (and the snails inside).
    if (hasLid(tank) && tank.water.level >= 0.6) return { ok: true };
    return {
      ok: false,
      reason: `${cap(spPlural(sp))} climb out above the waterline to lay their eggs — without a lid the clutch would dry out (or the snail would wander off).`,
      step: 'Fit a lid, keeping a small air gap above the water, so they can lay safely.',
    };
  },
  infertile(sp, tank) {
    if (isNerite(sp.genus, sp.commonName) && tank.environment === 'freshwater') {
      return 'Nerite snails dot the decor with little white eggs, but their larvae need brackish water — in freshwater the eggs never hatch (they fade away in time).';
    }
    return null;
  },
  text: {
    court: (m, f, sp) => `${m.name} and ${f.name} are pairing up — the ${spPlural(sp)} are mating.`,
    spawn: (m, f, sp, n, tank, guardian) =>
      isNerite(sp.genus, sp.commonName)
        ? `${f.name} has dotted the decor with tiny white eggs.`
        : `${f.name} crawled above the waterline and laid a bright pink clutch of ${plural(n, 'egg')} under the lid! Keep the air gap humid until they hatch.`,
  },
});

export const genericEggLayerModule = makePairSpawner({
  id: 'egg_layer_generic',
  plan: basePlan({}),
  window: 'morning',
  courtHours: [2, 4],
  spawnHours: [1, 2],
  spawnStage: 'spawning',
  guardStage: 'guarding',
  visual: 'eggs_scattered',
  site: 'plants_low',
  extraSites: 3,
  maleRestFrac: 0.5,
  text: { court: TEXT.genericCourt, spawn: TEXT.genericSpawn },
});
