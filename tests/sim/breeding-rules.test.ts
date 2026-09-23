/**
 * Breeding lane — edge cases & rules: betta pair left together too long, clownfish hierarchy (one female; the top male
 * transitions when she is removed; two females fight), adults eating axolotl eggs in the display vs. a nursery,
 * nursery capacity capping juveniles, breedingCheck guidance, and determinism.
 */
import { describe, it, expect, vi } from 'vitest';
import type { FoodTag, GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { getSpecies } from '@/data/species';
import { breedingCheck, breedingStatus, clutchStatus, noteBreedingFood } from '@/sim/life/breeding';
import { devForceBreeding, moveClutch, separateCreature, startBreeding } from '@/sim/life/breeding/actions';

// Long compressed-time runs; the shared build machine can be heavily loaded.
vi.setConfig({ testTimeout: 240_000 });

const hab = vi.hoisted(() => ({ cover: 0.6, nestSites: 2, hides: 3 }));
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
    if (c.illness && o.heal !== false) delete c.illness;
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
    const target = o.temps?.[t.id];
    if (target !== undefined) {
      t.water.tempC = target;
      for (const eq of t.equipment) if (eq.defId.includes('heater') || eq.defId.includes('chiller')) eq.setting = target;
    }
    if (o.feed?.length) noteBreedingFood(state, t.id, o.feed);
  }
}

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

describe('breeding: betta pair left together too long', () => {
  it('the male harasses the spent female with escalating warnings, stress and injury', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 777 });
    const home = state.tanks[state.tankOrder[0]];
    const ember = starter(state);
    const other = createTank(state, 'g10', 'freshwater_planted', { cycled: true, name: 'Her Tank' });
    const sapphire = addCreature(state, createCreature(state, simRng(state), 'betta', { sex: 'female', ageDays: 20, name: 'Sapphire' }), other.id);
    const temps = { [home.id]: 27, [other.id]: 27 };
    expect(devForceBreeding(state, ember.id).ok).toBe(true);
    // dev pairing created or moved a female into his tank; use whoever is his partner
    const partner = state.creatures[ember.repro.partnerId!];
    expect(partner.tankId).toBe(home.id);

    run(state, 12, { temps, feed: ['bloodworm'] }, () => clutchesOf(state, 'betta').length > 0, 1);
    expect(clutchesOf(state, 'betta')).toHaveLength(1);
    expect(partner.repro.stage).toBe('spent');
    const warnFrom = state.log.length;

    // Nobody separates them for a day.
    run(state, 26, { temps, heal: false }, undefined, 1);
    const later = state.log.slice(warnFrom);
    const harass = later.filter((e) => (e.kind === 'warning' || e.kind === 'danger') && e.creatureId === partner.id);
    expect(harass.length).toBeGreaterThanOrEqual(3);
    expect(harass.some((e) => e.kind === 'danger' && /torn|injured|critical/i.test(e.text))).toBe(true);
    expect(harass.map((e) => e.text).join(' ')).toMatch(/[Ss]eparate/);
    expect(partner.repro.harassment ?? 0).toBeGreaterThan(0.6);
    expect(partner.life?.injury ?? 0).toBeGreaterThan(0);
    expect(partner.history.some((h) => /Injured by Ember/.test(h.text))).toBe(true);
    expect(breedingStatus(state, partner.id)?.label).toMatch(/separate now|chased/i);
    // She is also eating the eggs — the advice is to move HER, not the clutch.
    expect(later.concat(state.log).some((e) => /eating .*eggs.*Move her out/.test(e.text))).toBe(true);

    // Separating her stops it.
    expect(separateCreature(state, partner.id, other.id).ok).toBe(true);
    const h0 = partner.repro.harassment ?? 0;
    run(state, 12, { temps });
    expect(partner.repro.harassment ?? 0).toBeLessThan(h0);
    void sapphire;
  });

  it('a female dropped into a male’s tank without courtship is chased too', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Rogue', seed: 778 });
    const home = state.tanks[state.tankOrder[0]];
    const her = addCreature(state, createCreature(state, simRng(state), 'betta', { sex: 'female', ageDays: 20, name: 'Velvet' }), home.id);
    her.stats.breedingReadiness = 0;
    run(state, 24, { temps: { [home.id]: 23.5 }, heal: false }, undefined, 1); // too cool to nest/court
    expect(her.repro.harassment ?? 0).toBeGreaterThan(0.3);
    expect(state.log.some((e) => e.creatureId === her.id && /chasing Velvet/.test(e.text))).toBe(true);
  });
});

describe('breeding: clownfish protandrous hierarchy', () => {
  function clownState(seed: number) {
    const state = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Tango', seed });
    const home = state.tanks[state.tankOrder[0]];
    const tango = starter(state);
    const rng = simRng(state);
    const coral = addCreature(state, createCreature(state, rng, 'ocellaris_clownfish', { ageDays: 30, name: 'Coral' }), home.id);
    const nemo = addCreature(state, createCreature(state, rng, 'ocellaris_clownfish', { ageDays: 24, name: 'Nemo' }), home.id);
    coral.sizeCm = 10;
    nemo.sizeCm = 8.5;
    tango.sizeCm = Math.min(tango.sizeCm, 8);
    return { state, home, tango, coral, nemo, fish: [tango, coral, nemo] };
  }

  it('exactly one female emerges; when she is removed the top-ranked male transitions', () => {
    const { state, home, coral, nemo, fish } = clownState(801);
    const temps = { [home.id]: 26 };
    run(state, 24 * 5, { temps });
    expect(fish.filter((f) => f.reproRole === 'female')).toHaveLength(1);
    expect(coral.reproRole).toBe('female');
    expect(fish.filter((f) => f.reproRole === 'transitioning_female')).toHaveLength(0);
    const ranks = fish.map((f) => f.repro.rank).sort();
    expect(ranks).toEqual([0, 1, 2]);
    expect(state.log.some((e) => /Coral has become the dominant female — \w+ is her male partner\./.test(e.text))).toBe(true);

    // Remove the female: the highest-ranked remaining male (Nemo, larger) takes her place.
    const side = createTank(state, 'g29', 'marine_live_rock', { cycled: true, name: 'Side Tank' });
    expect(separateCreature(state, coral.id, side.id).ok).toBe(true);
    run(state, 24 * 5, { temps: { ...temps, [side.id]: 26 } });
    const remaining = fish.filter((f) => f.tankId === home.id);
    expect(remaining.filter((f) => f.reproRole === 'female')).toHaveLength(1);
    expect(nemo.reproRole).toBe('female');
    expect(nemo.history.some((h) => h.kind === 'sex_change')).toBe(true);
    expect(state.log.some((e) => /With Coral gone, Nemo/.test(e.text))).toBe(true);
    // Coral stays female (sex change is one-way).
    expect(coral.reproRole).toBe('female');
  });

  it('two established females in one tank fight', () => {
    const { state, home, coral, nemo } = clownState(802);
    coral.reproRole = 'female';
    coral.sex = 'female';
    nemo.reproRole = 'female';
    nemo.sex = 'female';
    const chk = breedingCheck(state, coral.id, nemo.id);
    expect(chk.ok).toBe(false);
    expect(chk.reasons.join(' ')).toMatch(/females/i);
    run(state, 24, { temps: { [home.id]: 26 }, heal: false });
    const fights = state.log.filter((e) => e.kind === 'danger' && /both established females/.test(e.text));
    expect(fights.length).toBeGreaterThanOrEqual(1);
    expect((nemo.life?.injury ?? 0) + (coral.life?.injury ?? 0)).toBeGreaterThan(0);
  });

  it('a lone clownfish stays male; breedingCheck explains protandry', () => {
    const state = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Sunny', seed: 803 });
    const home = state.tanks[state.tankOrder[0]];
    const sunny = starter(state);
    run(state, 24 * 4, { temps: { [home.id]: 26 } });
    expect(sunny.reproRole).not.toBe('female');
    expect(sunny.reproRole).not.toBe('transitioning_female');
    const other = createTank(state, 'g29', 'marine_live_rock', { cycled: true });
    const buddy = addCreature(state, createCreature(state, simRng(state), 'ocellaris_clownfish', { ageDays: 20, name: 'Buddy' }), other.id);
    buddy.reproRole = 'male';
    sunny.reproRole = 'male';
    const chk = breedingCheck(state, sunny.id, buddy.id);
    expect(chk.ok).toBe(false);
    expect(`${chk.reasons.join(' ')} ${chk.nextStep}`).toMatch(/start out male|larger, bolder/);
  });
});

describe('breeding: nursery vs display, capacity', () => {
  function axolotlClutch(seed: number) {
    const state = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed });
    const display = state.tanks[state.tankOrder[0]];
    const mochi = starter(state);
    const axel = addCreature(state, createCreature(state, simRng(state), 'axolotl', { sex: 'male', ageDays: 26, name: 'Axel' }), display.id);
    const temps: Record<string, number> = { [display.id]: 16.5 };
    expect(devForceBreeding(state, mochi.id).ok).toBe(true);
    run(state, 60, { temps }, () => mochi.repro.stage === 'resting');
    const [cl] = clutchesOf(state, 'axolotl');
    expect(cl).toBeDefined();
    return { state, display, mochi, axel, cl, temps };
  }

  it('axolotl eggs left with adults suffer heavy losses; the same clutch in a nursery survives', () => {
    const a = axolotlClutch(901);
    const b = axolotlClutch(901);
    expect(b.cl.initialCount).toBe(a.cl.initialCount);
    const nursery = createTank(b.state, 'g20L', 'freshwater_cool', { cycled: true, purpose: 'nursery', name: 'Nursery' });
    b.temps[nursery.id] = 16.5;
    expect(moveClutch(b.state, b.cl.id, nursery.id).ok).toBe(true);

    let lastA = a.cl.survival;
    let lastB = b.cl.survival;
    run(a.state, 118, { temps: a.temps }, () => {
      if (a.state.clutches[a.cl.id]) lastA = a.state.clutches[a.cl.id].survival;
      return !a.state.clutches[a.cl.id] || a.state.clutches[a.cl.id].stage !== 'eggs';
    });
    run(b.state, 118, { temps: b.temps }, () => {
      if (b.state.clutches[b.cl.id]) lastB = b.state.clutches[b.cl.id].survival;
      return !b.state.clutches[b.cl.id] || b.state.clutches[b.cl.id].stage !== 'eggs';
    });
    // Display: the adults eat most of the eggs. Nursery: nearly all survive incubation.
    expect(lastA).toBeLessThan(0.5);
    expect(lastB).toBeGreaterThan(0.85);
    expect(a.state.log.some((e) => /eating Mochi’s eggs/.test(e.text))).toBe(true);
    const st = clutchStatus(a.state, a.cl.id);
    if (st) expect(st.warnings.join(' ')).toMatch(/nursery/);

    // Through the larval stage too (fed): display survivors are a small fraction of the nursery's.
    run(a.state, 400, { temps: a.temps, feed: ['baby_brine'] }, () => {
      if (a.state.clutches[a.cl.id]) lastA = a.state.clutches[a.cl.id].survival;
      return !a.state.clutches[a.cl.id];
    });
    run(b.state, 400, { temps: b.temps, feed: ['baby_brine'] }, () => {
      if (b.state.clutches[b.cl.id]) lastB = b.state.clutches[b.cl.id].survival;
      return !b.state.clutches[b.cl.id];
    });
    expect(lastA).toBeLessThan(0.2);
    expect(lastB).toBeGreaterThan(lastA * 2);
  });

  it('nursery capacity caps the juveniles minted; the rest are rehomed', () => {
    const small = axolotlClutch(902);
    const big = axolotlClutch(902);
    const tiny = createTank(small.state, 'g5', 'freshwater_cool', { cycled: true, purpose: 'nursery', name: 'Tiny Nursery' });
    const roomy = createTank(big.state, 'g40B', 'freshwater_cool', { cycled: true, purpose: 'nursery', name: 'Breeder Nursery' });
    small.temps[tiny.id] = 16.5;
    big.temps[roomy.id] = 16.5;
    expect(moveClutch(small.state, small.cl.id, tiny.id).ok).toBe(true);
    expect(moveClutch(big.state, big.cl.id, roomy.id).ok).toBe(true);
    run(small.state, 450, { temps: small.temps, feed: ['baby_brine', 'daphnia'] }, () => !small.state.clutches[small.cl.id]);
    run(big.state, 450, { temps: big.temps, feed: ['baby_brine', 'daphnia'] }, () => !big.state.clutches[big.cl.id]);
    const kidsSmall = offspringOf(small.state, small.mochi.id);
    const kidsBig = offspringOf(big.state, big.mochi.id);
    const max = getSpecies('axolotl').breeding.maxRaisedPerClutch;
    expect(kidsBig.length).toBeGreaterThan(0);
    expect(kidsBig.length).toBeLessThanOrEqual(max);
    expect(kidsSmall.length).toBeLessThan(kidsBig.length);
    expect(small.state.log.some((e) => /rehomed to local hobbyists/.test(e.text))).toBe(true);
    expect(small.state.log.some((e) => /at capacity|no room/.test(e.text))).toBe(true);
    expect(small.state.progress.counters.rehomed ?? 0).toBeGreaterThan(0);
    // Crowded axolotl larvae nip each other in the tiny tank.
    expect(small.state.log.some((e) => /crowded and starting to nip/.test(e.text))).toBe(true);
  });

  it('starving larvae die without live food', () => {
    const s = axolotlClutch(903);
    const nursery = createTank(s.state, 'g40B', 'freshwater_cool', { cycled: true, purpose: 'nursery' });
    s.temps[nursery.id] = 16.5;
    moveClutch(s.state, s.cl.id, nursery.id);
    let last = 1;
    run(s.state, 450, { temps: s.temps }, () => {
      const c = s.state.clutches[s.cl.id];
      if (c && c.stage !== 'eggs') last = c.survival;
      return !c;
    });
    expect(last).toBeLessThan(0.15);
    expect(s.state.log.some((e) => /larvae are hungry/.test(e.text))).toBe(true);
  });
});

describe('breeding: checks and guidance', () => {
  it('explains species, sex, maturity and location problems in plain language', () => {
    const state = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 1001 });
    const mochi = starter(state);
    const rng = simRng(state);
    const tank = state.tanks[state.tankOrder[0]];
    const young = addCreature(state, createCreature(state, rng, 'axolotl', { sex: 'male', ageDays: 5, name: 'Tadpole' }), tank.id);
    const r1 = breedingCheck(state, mochi.id, young.id);
    expect(r1.ok).toBe(false);
    expect(r1.reasons.join(' ')).toMatch(/too young/);
    const sister = addCreature(state, createCreature(state, rng, 'axolotl', { sex: 'female', ageDays: 30, name: 'Sis' }), tank.id);
    expect(breedingCheck(state, mochi.id, sister.id).reasons.join(' ')).toMatch(/Both are females/);
    const other = createTank(state, 'g20L', 'freshwater_cool', { cycled: true });
    const guy = addCreature(state, createCreature(state, rng, 'axolotl', { sex: 'male', ageDays: 30, name: 'Guy' }), other.id);
    // Apart but otherwise compatible: Start breeding can bring them together; the next step says what follows.
    const r3 = breedingCheck(state, mochi.id, guy.id);
    expect(r3.ok).toBe(true);
    expect(r3.nextStep ?? '').toMatch(/Start breeding moves .* then: chill the water/i);
    const betta = addCreature(state, createCreature(state, rng, 'betta', { sex: 'male', ageDays: 20, name: 'Blue' }), other.id);
    expect(breedingCheck(state, mochi.id, betta.id).reasons[0]).toMatch(/different species/);
    const st = breedingStatus(state, young.id);
    expect(st?.label).toMatch(/Too young/);
  });

  it('betta: the check asks for a nest first and startBreeding refuses until then', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Koi', seed: 1002 });
    const koi = starter(state);
    const other = createTank(state, 'g10', 'freshwater_planted', { cycled: true });
    const her = addCreature(state, createCreature(state, simRng(state), 'betta', { sex: 'female', ageDays: 20, name: 'Pearl' }), other.id);
    const chk = breedingCheck(state, koi.id, her.id);
    expect(chk.ok).toBe(false);
    expect(chk.nextStep ?? '').toMatch(/bubble nest first/);
    const res = startBreeding(state, koi.id, her.id);
    expect(res.ok).toBe(false);
    expect(her.tankId).toBe(other.id);
  });

  it('startBreeding brings an apart pair together in the viewed animal’s tank (betta: always the male’s nest tank)', () => {
    const state = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 1003 });
    const mochi = starter(state);
    const other = createTank(state, 'g20L', 'freshwater_cool', { cycled: true });
    const guy = addCreature(state, createCreature(state, simRng(state), 'axolotl', { sex: 'male', ageDays: 30, name: 'Guy' }), other.id);
    const res = startBreeding(state, guy.id, mochi.id, guy.tankId ?? undefined);
    expect(res.ok).toBe(true);
    expect(mochi.tankId).toBe(other.id);
    expect(mochi.repro.partnerId).toBe(guy.id);
    expect(res.message).toMatch(/Chill the water/);

    const b = newGame({ starterId: 'betta', starterName: 'Ember', seed: 1004 });
    const home = b.tanks[b.tankOrder[0]];
    const ember = starter(b);
    const herTank = createTank(b, 'g10', 'freshwater_planted', { cycled: true });
    const her = addCreature(b, createCreature(b, simRng(b), 'betta', { sex: 'female', ageDays: 20, name: 'Pearl' }), herTank.id);
    expect(devForceBreeding(b, ember.id).ok).toBe(true); // nest ready + a conditioned mate
    const mate = b.creatures[ember.repro.partnerId!];
    // dev pairing picked Pearl (or made a mate); either way the pair meets in HIS tank even if the card passes hers
    expect(mate.tankId).toBe(home.id);
    void her;
  });
});

describe('breeding: determinism', () => {
  function scenario(seed: number): string {
    const state = newGame({ starterId: 'lined_seahorse', starterName: 'Atlas', seed });
    const home = state.tanks[state.tankOrder[0]];
    const atlas = starter(state);
    addCreature(state, createCreature(state, simRng(state), 'lined_seahorse', { sex: 'female', ageDays: 26, name: 'Seraphina' }), home.id);
    run(state, 24 * 9, { temps: { [home.id]: 24 } }, () => false);
    const nursery = createTank(state, 'g29', 'marine_live_rock', { cycled: true, purpose: 'nursery' });
    for (const cl of Object.values(state.clutches)) if (cl.stage === 'fry') moveClutch(state, cl.id, nursery.id);
    run(state, 24 * 12, { temps: { [home.id]: 24, [nursery.id]: 24 }, feed: ['copepod_live', 'baby_brine'] });
    const creatures = Object.values(state.creatures)
      .map((c) => ({ id: c.id, name: c.name, morph: c.morphName, alleles: c.genome.alleles, lineage: c.lineage, repro: c.repro, tank: c.tankId }))
      .sort((x, y) => (x.id < y.id ? -1 : 1));
    const clutches = Object.values(state.clutches).map((c) => ({ ...c }));
    const log = state.log.filter((e) => e.kind === 'breeding').map((e) => `${e.hour.toFixed(2)} ${e.text}`);
    void atlas;
    return JSON.stringify({ creatures, clutches, log, rng: state.rngState });
  }

  it('the same seed and actions give identical breeding outcomes', () => {
    const a = scenario(4242);
    const b = scenario(4242);
    expect(a).toBe(b);
    expect(a).toMatch(/gave birth/);
  });
});
