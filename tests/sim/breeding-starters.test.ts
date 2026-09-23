/**
 * Breeding lane — the five starter breeding loops run END-TO-END in compressed game time.
 * The keeper helper plays a diligent player: feeds, keeps water clean and temperatures on target, offers the
 * right live foods. Dense planting / nest rocks are provided through a tankHabitat override (a well-planted tank).
 */
import { describe, it, expect, vi } from 'vitest';
import type { Creature, FoodTag, GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { getSpecies } from '@/data/species';
import { breedingCheck, breedingStatus, noteBreedingFood } from '@/sim/life/breeding';
import { devForceBreeding, moveClutch, separateCreature, startBreeding } from '@/sim/life/breeding/actions';

// Long compressed-time runs; the shared build machine can be heavily loaded.
vi.setConfig({ testTimeout: 240_000 });

const hab = vi.hoisted(() => ({ cover: 0.8, nestSites: 2, hides: 3 }));
vi.mock('@/sim/aquascape', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/sim/aquascape')>();
  return {
    ...mod,
    tankHabitat: (s: Parameters<typeof mod.tankHabitat>[0], t: Parameters<typeof mod.tankHabitat>[1]) => {
      const h = mod.tankHabitat(s, t);
      return { ...h, cover: Math.max(h.cover, hab.cover), nestSites: Math.max(h.nestSites, hab.nestSites), hides: Math.max(h.hides, hab.hides) };
    },
  };
});

interface KeeperOpts {
  feed?: FoodTag[];
  temps?: Record<string, number>;
  heal?: boolean;
}

function keeper(state: GameState, o: KeeperOpts): void {
  for (const c of Object.values(state.creatures)) {
    if (c.status !== 'alive') continue;
    c.stats.hunger = Math.min(c.stats.hunger, 15);
    if (o.heal !== false) {
      c.stats.health = Math.max(c.stats.health, 90);
      c.stats.stress = Math.min(c.stats.stress, 30);
    }
    c.stats.comfort = Math.max(c.stats.comfort, 70);
    if (c.illness) delete c.illness;
  }
  for (const t of Object.values(state.tanks)) {
    t.water.ammonia = 0;
    t.water.nitrite = 0;
    t.water.nitrate = Math.min(t.water.nitrate, 20);
    t.water.oxygen = Math.max(t.water.oxygen, 0.9);
    for (const eq of t.equipment) {
      eq.failed = false; // a diligent keeper repairs failed equipment
      eq.condition = Math.max(eq.condition, 0.9);
    }
    t.water.level = Math.max(t.water.level, 0.95);
    const target = o.temps?.[t.id];
    if (target !== undefined) {
      t.water.tempC = target;
      for (const eq of t.equipment) if (eq.defId.includes('heater') || eq.defId.includes('chiller')) eq.setting = target;
    }
    if (o.feed?.length) noteBreedingFood(state, t.id, o.feed);
  }
}

/** Advance in chunks with keeper care; stop early when `until` is satisfied. Returns hours elapsed. */
function run(state: GameState, maxHours: number, o: KeeperOpts, until?: () => boolean, chunk = 2): number {
  let t = 0;
  while (t < maxHours) {
    if (until?.()) return t;
    keeper(state, o);
    const h = Math.min(chunk, maxHours - t);
    advanceWorld(state, h, { forceFull: true });
    t += h;
  }
  return t;
}

const starter = (state: GameState) => Object.values(state.creatures).find((c) => c.isStarter)!;
const clutchesOf = (state: GameState, speciesId: string) => Object.values(state.clutches).filter((c) => c.speciesId === speciesId);
const offspringOf = (state: GameState, motherId: string) => Object.values(state.creatures).filter((c) => c.lineage.motherId === motherId);
const logText = (state: GameState) => state.log.map((e) => e.text).join('\n');

function calmSurface(tank: Tank): void {
  for (const eq of tank.equipment) {
    const id = eq.defId.toLowerCase();
    if (id.includes('air') || id.includes('powerhead') || id.includes('wave')) eq.on = false;
    if (id.includes('filter') || id.includes('sponge') || id.includes('hob')) eq.setting = 0.25;
  }
}

/** Every juvenile has species-valid inherited alleles (one from each parent unless a logged mutation) and lineage. */
function expectValidOffspring(kids: Creature[], mother: Creature, father: Creature): void {
  const sp = getSpecies(mother.speciesId);
  const morphNames = new Set([...sp.genetics.phenotypes.map((p) => p.name), ...sp.visualMorphs]);
  for (const k of kids) {
    expect(k.speciesId).toBe(mother.speciesId);
    expect(k.lineage.motherId).toBe(mother.id);
    expect(k.lineage.fatherId).toBe(father.id);
    expect(k.lineage.breederName).toBe('Your shop');
    expect(k.lineage.generation).toBe(Math.max(mother.lineage.generation, father.lineage.generation) + 1);
    expect(k.captiveBred).toBe(true);
    expect(typeof k.morphName).toBe('string');
    expect(k.morphName.length).toBeGreaterThan(0);
    // morph resolves from the species' phenotype rules (composed names may join base + overlays)
    const known = [...morphNames].some((n) => k.morphName.toLowerCase().includes(n.toLowerCase())) || /wild/i.test(k.morphName);
    expect(known).toBe(true);
    const mutated = new Set((k.genome.mutations ?? []).map((m) => m.locusId));
    for (const locus of sp.genetics.loci) {
      const pair = k.genome.alleles[locus.id];
      expect(pair).toBeDefined();
      const valid = new Set(locus.alleles.map((a) => a.id));
      expect(valid.has(pair[0]) && valid.has(pair[1])).toBe(true);
      if (mutated.has(locus.id)) continue;
      const m = mother.genome.alleles[locus.id];
      const f = father.genome.alleles[locus.id];
      if (m && f) expect(m.includes(pair[0]) && f.includes(pair[1])).toBe(true);
    }
    for (const v of Object.values(k.genome.potentials)) expect(Number.isFinite(v)).toBe(true);
  }
}

describe('breeding: starter loops end-to-end', () => {
  it('axolotl: cooling cue → courtship → spermatophore → eggs on plants → nursery → juveniles', () => {
    const state = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 101 });
    const display = state.tanks[state.tankOrder[0]];
    const mochi = starter(state);
    expect(mochi.reproRole === 'female' || mochi.sex === 'female').toBe(true);
    const rng = simRng(state);
    const axel = addCreature(state, createCreature(state, rng, 'axolotl', { sex: 'male', ageDays: 26, name: 'Axel' }), display.id);
    const nursery = createTank(state, 'g20L', 'freshwater_cool', { cycled: true, purpose: 'nursery', name: 'Nursery' });
    const temps = { [display.id]: 17, [nursery.id]: 17 };

    // Without a seasonal cue the check explains what to do.
    run(state, 6, { temps });
    const pre = breedingCheck(state, mochi.id, axel.id);
    expect(pre.ok).toBe(false);
    expect(pre.nextStep ?? '').toMatch(/2 °C|rainy season/i);

    // Chill the water by ~2.5 °C (a cool water change): the "rainy season" cue.
    temps[display.id] = 14.5;
    run(state, 40, { temps }, () => mochi.repro.stage === 'courting' || mochi.repro.stage === 'following' || mochi.repro.stage === 'gravid' || mochi.repro.stage === 'laying');
    expect(logText(state)).toMatch(/cooled by/);
    expect(['courting', 'following', 'gravid', 'laying']).toContain(mochi.repro.stage);

    // She lays over several hours, singly on the plants.
    run(state, 60, { temps }, () => mochi.repro.stage === 'resting');
    expect(mochi.repro.stage).toBe('resting');
    const [cl] = clutchesOf(state, 'axolotl');
    expect(cl).toBeDefined();
    expect(cl.visual).toBe('egg_strands');
    expect(cl.anchor).toBeDefined();
    expect(cl.initialCount ?? 0).toBeGreaterThan(50);

    // Move the eggs to the nursery before the adults eat them.
    const mv = moveClutch(state, cl.id, nursery.id);
    expect(mv.ok).toBe(true);
    run(state, 400, { temps, feed: ['baby_brine', 'daphnia'] }, () => !state.clutches[cl.id]);
    expect(state.clutches[cl.id]).toBeUndefined();

    const kids = offspringOf(state, mochi.id);
    expect(kids.length).toBeGreaterThan(0);
    expect(kids.length).toBeLessThanOrEqual(getSpecies('axolotl').breeding.maxRaisedPerClutch);
    expect(kids.every((k) => k.tankId === nursery.id)).toBe(true);
    expectValidOffspring(kids, mochi, axel);
    expect(mochi.repro.totalOffspringRaised).toBe(kids.length);
    expect(logText(state)).toMatch(/ready to meet you/);
  });

  it('betta: bubble nest → introduce female → spawn → separate both → free-swimming fry → juveniles', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 202 });
    const home = state.tanks[state.tankOrder[0]];
    calmSurface(home);
    const ember = starter(state);
    const rng = simRng(state);
    const herTank = createTank(state, 'g10', 'freshwater_planted', { cycled: true, name: 'Sapphire’s Tank' });
    const restTank = createTank(state, 'g10', 'freshwater_planted', { cycled: true, name: 'Rest Tank' });
    const sapphire = addCreature(state, createCreature(state, rng, 'betta', { sex: 'female', ageDays: 20, name: 'Sapphire' }), herTank.id);
    const temps = { [home.id]: 27, [herTank.id]: 27, [restTank.id]: 27 };
    const feed: FoodTag[] = ['bloodworm', 'brine_shrimp'];

    run(state, 96, { temps, feed }, () => ember.repro.stage === 'nest_ready');
    expect(ember.repro.stage).toBe('nest_ready');
    expect(ember.repro.nestProgress).toBeGreaterThanOrEqual(1);
    expect(ember.repro.nestAnchor).toBeDefined();
    expect(breedingStatus(state, ember.id)?.label).toMatch(/nest/i);
    run(state, 24, { temps, feed }, () => sapphire.stats.breedingReadiness >= 70);

    const chk = breedingCheck(state, ember.id, sapphire.id);
    expect(chk.ok).toBe(true);
    const res = startBreeding(state, sapphire.id, ember.id);
    expect(res.ok).toBe(true);
    expect(sapphire.tankId).toBe(home.id);
    expect(ember.repro.stage).toBe('courting');

    run(state, 16, { temps, feed }, () => clutchesOf(state, 'betta').length > 0, 1);
    const [cl] = clutchesOf(state, 'betta');
    expect(cl).toBeDefined();
    expect(cl.visual).toBe('bubble_nest');
    expect(cl.guardedById).toBe(ember.id);
    expect(ember.repro.stage).toBe('guarding');
    expect(sapphire.repro.stage).toBe('spent');

    // Remove the female right away.
    expect(separateCreature(state, sapphire.id, herTank.id).ok).toBe(true);
    expect(sapphire.repro.stage).toBe('resting');

    // Male tends eggs and larvae in the nest until the fry swim free.
    run(state, 80, { temps, feed: ['infusoria'] }, () => state.clutches[cl.id]?.stage === 'fry');
    expect(state.clutches[cl.id]?.stage).toBe('fry');
    expect(logText(state)).toMatch(/free-swimming/);
    const sep = separateCreature(state, ember.id, restTank.id);
    expect(sep.ok).toBe(true);
    expect(sep.message).toMatch(/job is done/);

    run(state, 150, { temps, feed: ['infusoria', 'baby_brine'] }, () => !state.clutches[cl.id]);
    const kids = offspringOf(state, sapphire.id);
    expect(kids.length).toBeGreaterThan(0);
    expect(kids.length).toBeLessThanOrEqual(getSpecies('betta').breeding.maxRaisedPerClutch);
    expectValidOffspring(kids, sapphire, ember);
    expect(kids[0].lineage.lineId).toMatch(/^betta-/);
  });

  it('pea puffer: conditioning + dense cover → chase into the moss → scattered eggs → nursery → juveniles', () => {
    hab.cover = 0.8;
    const state = newGame({ starterId: 'pea_puffer', starterName: 'Wasabi', seed: 303 });
    const home = state.tanks[state.tankOrder[0]];
    const wasabi = starter(state);
    const rng = simRng(state);
    const pickle = addCreature(state, createCreature(state, rng, 'pea_puffer', { sex: 'female', ageDays: 14, name: 'Pickle' }), home.id);
    const nursery = createTank(state, 'g10', 'freshwater_planted', { cycled: true, purpose: 'nursery', name: 'Nursery' });
    const temps = { [home.id]: 26, [nursery.id]: 26 };

    run(state, 96, { temps, feed: ['bloodworm', 'snail_live'] }, () => clutchesOf(state, 'pea_puffer').length > 0, 1);
    const [cl] = clutchesOf(state, 'pea_puffer');
    expect(cl).toBeDefined();
    expect(cl.visual).toBe('eggs_scattered');
    const sp = getSpecies('pea_puffer');
    expect(cl.count).toBeGreaterThanOrEqual(sp.breeding.clutchSize.min);
    expect(cl.count).toBeLessThanOrEqual(sp.breeding.clutchSize.max);
    expect(logText(state)).toMatch(/moss/);

    expect(moveClutch(state, cl.id, nursery.id).ok).toBe(true);
    run(state, 220, { temps, feed: ['infusoria', 'baby_brine'] }, () => !state.clutches[cl.id]);
    const kids = offspringOf(state, pickle.id);
    expect(kids.length).toBeGreaterThan(0);
    expectValidOffspring(kids, pickle, wasabi);
  });

  it('clownfish: hierarchy → sex change → pair → nest rock → male tends eggs → night hatch in nursery → juveniles', () => {
    hab.nestSites = 2;
    const state = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Tango', seed: 404 });
    const home = state.tanks[state.tankOrder[0]];
    const tango = starter(state);
    const rng = simRng(state);
    const coral = addCreature(state, createCreature(state, rng, 'ocellaris_clownfish', { ageDays: 30, name: 'Coral' }), home.id);
    coral.sizeCm = Math.max(coral.sizeCm, tango.sizeCm + 1.5);
    const nursery = createTank(state, 'g29', 'marine_live_rock', { cycled: true, purpose: 'nursery', name: 'Larval Tank' });
    const temps = { [home.id]: 26, [nursery.id]: 26 };

    run(state, 24 * 6, { temps }, () => coral.reproRole === 'female');
    const fish = [tango, coral];
    expect(fish.filter((f) => f.reproRole === 'female')).toHaveLength(1);
    expect(coral.reproRole).toBe('female');
    expect(coral.sex).toBe('female');
    expect(coral.history.some((h) => h.kind === 'sex_change')).toBe(true);
    expect(logText(state)).toMatch(/Coral has become the dominant female — Tango is her male partner\./);
    expect(coral.repro.partnerId).toBe(tango.id);
    expect(tango.repro.partnerId).toBe(coral.id);
    expect(coral.repro.rank).toBe(0);

    // Pair bond → nest site → evening spawn.
    run(state, 24 * 8, { temps }, () => clutchesOf(state, 'ocellaris_clownfish').length > 0, 1);
    const [cl] = clutchesOf(state, 'ocellaris_clownfish');
    expect(cl).toBeDefined();
    expect(cl.visual).toBe('eggs_adhesive');
    expect(cl.guardedById).toBe(tango.id);
    expect(tango.repro.stage).toBe('guarding');
    expect(breedingStatus(state, tango.id)?.label).toMatch(/Guarding \d+/);

    // Move the eggs to the larval tank before they hatch at night.
    expect(moveClutch(state, cl.id, nursery.id).ok).toBe(true);
    run(state, 24 * 5, { temps, feed: ['infusoria', 'baby_brine'] }, () => state.clutches[cl.id]?.stage === 'larvae');
    expect(state.clutches[cl.id]?.stage).toBe('larvae');
    const hatchHour = state.clock.hour;
    const hod = ((hatchHour % 24) + 24) % 24;
    expect(hod >= 21 || hod < 8).toBe(true); // hatched after lights-out

    run(state, 260, { temps, feed: ['infusoria', 'baby_brine', 'copepod_live'] }, () => !state.clutches[cl.id]);
    const kids = offspringOf(state, coral.id);
    expect(kids.length).toBeGreaterThan(0);
    expectValidOffspring(kids, coral, tango);
  });

  it('seahorse: morning greetings → dawn dance → male pregnancy → birth → nursery with copepods → juveniles', () => {
    const state = newGame({ starterId: 'lined_seahorse', starterName: 'Atlas', seed: 505 });
    const home = state.tanks[state.tankOrder[0]];
    const atlas = starter(state);
    expect(atlas.reproRole === 'male' || atlas.sex === 'male').toBe(true);
    const rng = simRng(state);
    const sera = addCreature(state, createCreature(state, rng, 'lined_seahorse', { sex: 'female', ageDays: 26, name: 'Seraphina' }), home.id);
    const nursery = createTank(state, 'g29', 'marine_live_rock', { cycled: true, purpose: 'nursery', name: 'Kreisel' });
    const temps = { [home.id]: 24, [nursery.id]: 24 };

    run(state, 24 * 5, { temps }, () => atlas.repro.stage === 'pregnant', 1);
    expect(atlas.repro.stage).toBe('pregnant');
    expect(atlas.repro.partnerId).toBe(sera.id);
    expect((atlas.repro.bond ?? 0)).toBeGreaterThanOrEqual(2);
    const [cl] = clutchesOf(state, 'lined_seahorse');
    expect(cl.stage).toBe('in_pouch');
    expect(cl.visual).toBe('pouch');
    expect(cl.guardedById).toBe(atlas.id);
    expect(atlas.repro.carryingUntilHour).toBeGreaterThan(state.clock.hour);
    expect(breedingStatus(state, atlas.id)?.label).toMatch(/Pregnant — due in/);

    // The pouch swells as the pregnancy progresses.
    run(state, 80, { temps });
    const mid = atlas.repro.progress ?? 0;
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(1);

    run(state, 200, { temps }, () => state.clutches[cl.id]?.stage === 'fry', 1);
    expect(state.clutches[cl.id]?.stage).toBe('fry');
    expect(logText(state)).toMatch(/Atlas gave birth to [\d,]+ fry!/);
    expect(atlas.repro.stage).toBe('resting');

    expect(moveClutch(state, cl.id, nursery.id).ok).toBe(true);
    run(state, 300, { temps, feed: ['copepod_live', 'baby_brine'] }, () => !state.clutches[cl.id]);
    const kids = offspringOf(state, sera.id);
    expect(kids.length).toBeGreaterThan(0);
    expect(kids.every((k) => k.lineage.fatherId === atlas.id)).toBe(true);
    expectValidOffspring(kids, sera, atlas);

    // After his short rest, Atlas can carry again.
    run(state, 24 * 8, { temps }, () => atlas.repro.stage === 'pregnant', 1);
    expect(atlas.repro.stage).toBe('pregnant');
  });

  it('devForceBreeding makes a valid pair and jumps ahead for every starter', () => {
    for (const id of ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'] as const) {
      const state = newGame({ starterId: id, starterName: 'Solo', seed: 606 });
      const c = starter(state);
      const r = devForceBreeding(state, c.id);
      expect(r.ok, `${id}: ${r.message}`).toBe(true);
      const partner = c.repro.partnerId ? state.creatures[c.repro.partnerId] : undefined;
      expect(partner, id).toBeDefined();
      expect(partner!.tankId).toBe(c.tankId);
      run(state, 48, { feed: ['bloodworm', 'snail_live', 'brine_shrimp'] }, () => Object.keys(state.clutches).length > 0, 1);
      expect(Object.keys(state.clutches).length, id).toBeGreaterThan(0);
    }
  });
});
