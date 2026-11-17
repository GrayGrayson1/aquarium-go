/**
 * Pair-spawner configurations: egg_scatter_cover (pea puffer, tetras, white clouds, medaka), substrate_spawner
 * (corydoras), cave_spawner (bristlenose, kuhli), mouthbrooder (Banggai cardinal), snail_egg_clutch (mystery /
 * nerite snails) and egg_layer_generic. OWNER: lane "breeding".
 */
import type { Tank } from '@/types';
import type { RearingPhase, RearingPlan } from '../types';
import { makePairSpawner, TEXT, type PairSpawnerConfig } from './pairSpawner';
import { hasBroadLeaf, hasHardSite, hasLid, hasSandBed, plural, spName, spPlural } from '../common';


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
      `${f.name} and ${m.name} spawned deep in the ${tank.decor.length ? 'plants' : 'cover'} — ${plural(n, 'tiny egg')}!${guardian ? ` ${guardian.name} is guarding them.` : ` Adult ${spPlural(sp)} eat their eggs, so move them to a nursery tank (Livestock › Eggs & fry).`}`,
  },
});

/** audit E26: the otocinclus shares the corydoras' module; its courtship line names it, not "cory". */
export const substrateCourtText = (m: { name: string }, f: { name: string }, sp: Parameters<typeof spName>[0]) =>
  `${m.name} and friends are dashing along the glass after ${f.name} — ${/corydoras/i.test(sp.commonName) ? 'cory' : spName(sp)} spawning behaviour!`;

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
    court: (m, f, sp) => substrateCourtText(m, f, sp),
    spawn: (m, f, sp, n) => `${f.name} and ${m.name} formed the classic “T-position” and ${f.name} pressed ${plural(n, 'sticky egg')} onto the glass. The adults will eat them — move them to a nursery tank (Livestock › Eggs & fry).`,
  },
  status: (state, c) => (c.repro.stage === 'spawning' ? { label: 'Spawning in the T-position', progress: c.repro.progress } : null),
});

/** Bristlenose/kuhli: the male claims a cave and guards (fans) the eggs; wrigglers stay inside until free-swimming. */
const caveCfg: PairSpawnerConfig = {
  id: 'cave_spawner',
  plan: basePlan({
    phases: [
      { stage: 'larvae', frac: 0.3, foods: [], natural: [], visual: 'keep', label: 'wriggling fry' },
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
};
export const caveSpawnerModule = makePairSpawner(caveCfg);

/** audit E10: the same plan with this species' own first foods in its last (feeding) phase. */
function withFoods(cfg: PairSpawnerConfig, phases: Partial<Pick<RearingPhase, 'foods' | 'natural'>>[]): PairSpawnerConfig {
  return { ...cfg, plan: { ...cfg.plan, phases: cfg.plan.phases.map((ph, i) => ({ ...ph, ...(phases[i] ?? {}) })) } };
}

/**
 * audit E10: the marine cave spawners (royal gramma, firefish, watchman goby) shared the bristlenose's fry foods (algae
 * wafers, biofilm, vegetables): their notes say planktonic larvae reared on live copepods, so their fry eat those
 * (and baby brine shrimp), and live rock or a refugium grows some by itself.
 */
export const marineCaveSpawnerModule = makePairSpawner(withFoods(caveCfg, [{}, { foods: ['copepod_live', 'baby_brine'], natural: ['copepods'] }]));
/** audit E10: the bumblebee goby's fry take infusoria, then baby brine shrimp (its overview), not algae wafers. */
export const brackishCaveSpawnerModule = makePairSpawner(withFoods(caveCfg, [{}, { foods: ['infusoria', 'baby_brine'], natural: ['infusoria'] }]));

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
    // audit E1: released in a nursery, the father (moved in to release them there) eats the young
    release: (g, n, sp, inNursery) =>
      `${g.name} spat out ${plural(n, 'perfect miniature cardinal')} — they’ll shelter among spines and branches.${inNursery ? ` Move ${g.name} back out now — adults eat the young.` : ' A nursery gives the young the best start.'}`,
  },
});

const cap = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);
const isNerite = (genus: string, name: string) => /neritina|vittina|clithon/i.test(genus) || /nerite/i.test(name);
/** chunk 16 — ramshorn snails (Planorbidae) lay clear jelly clutches on the glass and plants under water. */
const isRamshorn = (genus: string) => /planorb|helisoma/i.test(genus);

/**
 * Mystery snails lay a pink clutch in the air gap above the waterline (needs a lid); nerite eggs never hatch in
 * freshwater; ramshorns lay under water, so they need neither.
 */
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
  layOf: (sp) => (isRamshorn(sp.genus) ? { site: 'glass', visual: 'eggs_adhesive' } : null),
  extraSites: 0,
  maleRestFrac: 0.3,
  gate(state, tank: Tank, sp) {
    if (isNerite(sp.genus, sp.commonName) || isRamshorn(sp.genus)) return { ok: true };
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
        : isRamshorn(sp.genus)
          ? `${f.name} stuck a little jelly clutch of ${plural(n, 'egg')} to the glass.`
          : `${f.name} crawled above the waterline and laid a bright pink clutch of ${plural(n, 'egg')} under the lid! Keep the air gap humid until they hatch.`,
  },
});

/**
 * chunk 17 — the substrate-spawning cichlids (the oscar; and, the owner's round 5, the discus, freshwater angelfish and
 * German blue ram, which used the corydoras' module): the pair scrubs a surface clean, she lays her sticky eggs on it in
 * rows and he fertilises them; the male fans them and the pair chase off anything that comes near, and he goes on
 * guarding the wrigglers and the free-swimming fry (ADW; Seriously Fish). Unlike corydoras, the parents don't eat
 * their eggs. Where each lays: a flat stone (oscar, ram), a smooth upright stone (discus: a breeding cone in a real
 * tank), a broad leaf (angelfish).
 */
type Surface = 'stone' | 'leaf' | 'sand';
interface SurfaceText {
  where: string;
  noun: string;
  site: 'rock' | 'plants_mid' | 'floor';
}
const SURFACE: Record<Surface, SurfaceText> = {
  stone: { where: 'a flat stone', noun: 'stone', site: 'rock' },
  leaf: { where: 'a broad leaf', noun: 'leaf', site: 'plants_mid' },
  sand: { where: 'a patch of sand', noun: 'sand', site: 'floor' },
};
/**
 * audit E11 (B-223): what each cichlid will lay on, in the order it prefers, and what the gate says when the tank has
 * none of them (the species' own notes: the angelfish a broad leaf or slate, the ram a stone, leaf or sand pit).
 */
const CICHLID_SURFACE: Record<string, { accepts: Surface[]; stoneWhere?: string; reason: string; step: string }> = {
  oscar: { accepts: ['stone'], reason: 'There is no flat rock or tile to lay eggs on.', step: 'Add a flat stone or rock near their favourite spot.' },
  german_blue_ram: { accepts: ['stone', 'leaf', 'sand'], reason: 'There is no flat stone, broad leaf or patch of sand to lay eggs on.', step: 'Add a flat stone, a broad-leaved plant such as anubias, or a sand substrate.' },
  discus: { accepts: ['stone'], stoneWhere: 'a smooth upright stone', reason: 'There is no smooth stone or slate to lay eggs on.', step: 'Add a slate or a smooth stone.' },
  freshwater_angelfish: { accepts: ['leaf', 'stone'], reason: 'There is no broad leaf or smooth stone to lay eggs on.', step: 'Add an Amazon sword, anubias or a flat stone.' },
};
const cichlidOf = (sp: { id: string }) => CICHLID_SURFACE[sp.id] ?? CICHLID_SURFACE.oscar;
const hasSurface = (s: Surface, tank: Tank, hab?: { nestSites: number }) => (s === 'stone' ? hasHardSite(tank, hab) : s === 'leaf' ? hasBroadLeaf(tank) : hasSandBed(tank));
/** Where this cichlid lays in this tank: the first surface it prefers that the tank has (its first choice in words when none). */
function surfaceOf(sp: { id: string }, tank?: Tank, hab?: { nestSites: number }): SurfaceText {
  const c = cichlidOf(sp);
  const pick = (tank ? c.accepts.find((s) => hasSurface(s, tank, hab)) : undefined) ?? c.accepts[0];
  return pick === 'stone' && c.stoneWhere ? { ...SURFACE.stone, where: c.stoneWhere } : SURFACE[pick];
}

export const cichlidSubstrateModule = makePairSpawner({
  id: 'cichlid_substrate',
  plan: basePlan({
    phases: [
      { stage: 'larvae', frac: 0.3, foods: [], natural: [], visual: 'keep', label: 'wriggling fry' },
      { stage: 'fry', frac: 0.7, foods: ['baby_brine', 'flake', 'pellet_small', 'daphnia'], natural: ['infusoria'], visual: 'fry_cloud', label: 'fry' },
    ],
    parentsEatEggs: false,
    guardEggs: true,
    guardYoung: true,
    pairGuards: true,
    yolkFrac: 0.3,
    coverShelter: 0.3,
    starveSeverity: 1,
  }),
  window: 'evening',
  courtHours: [3, 8],
  spawnHours: [1, 2],
  spawnStage: 'spawning',
  guardStage: 'guarding',
  visual: 'eggs_adhesive',
  site: 'rock',
  layOf: (sp, tank) => {
    const s = surfaceOf(sp, tank);
    return s.site === 'rock' ? null : { site: s.site, visual: 'eggs_adhesive' };
  },
  nestSite: (tank, sp, hab) => {
    const c = cichlidOf(sp);
    return c.accepts.some((s) => hasSurface(s, tank, hab)) ? null : { ok: false, reason: c.reason, step: c.step };
  },
  extraSites: 4,
  maleRestFrac: 0.6,
  text: {
    court: (m, f, sp, tank) => `${m.name} and ${f.name} are scrubbing ${surfaceOf(sp, tank).where} clean with their mouths: the ${spPlural(sp)} are about to spawn.`,
    spawn: (m, f, sp, n, tank, guardian) =>
      `${f.name} laid ${plural(n, 'sticky egg')} in rows on the ${surfaceOf(sp, tank).noun} and ${m.name} fertilised them.${guardian ? ` ${guardian.name} fans them, and the pair chase off anything that comes near.` : ''}`,
  },
});

/**
 * chunk 17 (the owner's round 5) — damselfish (the green chromis, which used the corydoras' module): the male clears a
 * nest on the sand or rubble and dips and dashes to lead a female to it; she lays tiny sticky eggs there and he fans
 * and guards them alone, eating any that fail, until they hatch two or three days later (Fishes of Australia; the
 * species' notes). The larvae drift in open water and need live copepods: lost in a display tank, and a hard rear even
 * in a nursery (only research labs have managed it).
 */
export const damselNestModule = makePairSpawner({
  id: 'damsel_nest',
  plan: basePlan({
    phases: [
      { stage: 'larvae', frac: 0.4, foods: ['copepod_live'], natural: ['copepods'], visual: 'fry_cloud', label: 'larvae' },
      { stage: 'fry', frac: 0.6, foods: ['copepod_live', 'baby_brine'], natural: ['copepods'], visual: 'fry_cloud', label: 'fry' },
    ],
    parentsEatEggs: false,
    guardEggs: true,
    planktonic: true,
    starveSeverity: 1.6,
    coverShelter: 0.1,
    yolkFrac: 0.05,
  }),
  window: 'morning',
  courtHours: [1, 3],
  spawnHours: [1, 2],
  spawnStage: 'spawning',
  guardStage: 'guarding',
  visual: 'eggs_adhesive',
  site: 'floor',
  // audit E11 (B-223): the male clears his nest on sand or rubble, not on a flat rock
  nestSite: (tank) => (hasSandBed(tank) ? null : { ok: false, reason: 'There is no sand or rubble for the male to clear a nest in.', step: 'Use a sand substrate, or add some rubble.' }),
  extraSites: 3,
  maleRestFrac: 0.4,
  text: {
    court: (m, f, sp) => `${m.name} has cleared a nest on the sand and is dipping and dashing to lead ${f.name} to it: the ${spPlural(sp)} are about to spawn.`,
    spawn: (m, f, sp, n, tank, guardian) =>
      `${f.name} laid ${plural(n, 'tiny egg')} in ${m.name}’s nest.${guardian ? ` ${guardian.name} fans them and chases off any fish that comes near.` : ''} The larvae will need live copepods in a nursery.`,
  },
});

const genericCfg: PairSpawnerConfig = {
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
};
export const genericEggLayerModule = makePairSpawner(genericCfg);

/** audit E10: the mandarin's larvae are reared on copepods (its notes), not infusoria (which a marine tank never grows). */
export const copepodEggLayerModule = makePairSpawner(withFoods(genericCfg, [{ foods: ['copepod_live'], natural: ['copepods'] }, { foods: ['copepod_live', 'baby_brine'], natural: ['copepods'] }]));

/**
 * audit E10: the trochus snail broadcasts a milky cloud of eggs and its babies settle on the glass without help (its
 * notes): the parents don't eat the eggs, and the baby snails graze like a mystery snail's (biofilm and algae).
 */
export const trochusModule = makePairSpawner({
  ...genericCfg,
  plan: {
    ...genericCfg.plan,
    phases: [{ stage: 'fry', frac: 1, foods: ['algae_wafer', 'vegetable'], natural: ['biofilm', 'algae'], visual: 'fry_cloud', label: 'baby snails' }],
    youngTags: ['snail_small', 'snail'],
    parentsEatEggs: false,
  },
  text: {
    court: TEXT.genericCourt,
    spawn: (m, f) => `${f.name} released a milky cloud of eggs — tiny snails may settle on the glass.`,
  },
});
