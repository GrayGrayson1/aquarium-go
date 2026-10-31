/**
 * chunk 17 (ADR-0053; BIG-010) — the two new breeding systems run end to end in compressed game time: the bottom
 * sharks' egg cases (egg_case: about half are duds, a lone female lays empty ones that rot, warm water hatches them
 * sooner, a case hatches into a newly hatched juvenile) and the motoro's live young (ray_viviparous: a male is needed,
 * one to eight independent pups, then a rest) and the oscar's (cichlid_substrate: a pair spawns on a stone it cleans,
 * and guards the eggs and young; the review found it on the corydoras' module).
 */
import { describe, expect, it, vi } from 'vitest';
import type { Creature, GameState, Sex, Tank, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { getSpecies } from '@/data/species';
import { breedingStatus, clutchStatus } from '@/sim/life/breeding';
import { devForceBreeding, liftOutClutch } from '@/sim/life/breeding/actions';
import { eggCaseIncubation } from '@/sim/life/breeding/systems/eggCase';

vi.setConfig({ testTimeout: 240_000 });

/** A diligent keeper: fed, healthy, clean water at the given temperature. */
function keeper(state: GameState, tempC: number): void {
  for (const c of Object.values(state.creatures)) {
    if (c.status !== 'alive') continue;
    c.stats.hunger = Math.min(c.stats.hunger, 15);
    c.stats.health = Math.max(c.stats.health, 90);
    c.stats.stress = Math.min(c.stats.stress, 30);
    c.stats.comfort = Math.max(c.stats.comfort, 70);
    if (c.illness) delete c.illness;
  }
  for (const t of Object.values(state.tanks)) {
    t.water.ammonia = 0;
    t.water.nitrite = 0;
    t.water.nitrate = Math.min(t.water.nitrate, 20);
    t.water.oxygen = Math.max(t.water.oxygen, 0.9);
    t.water.tempC = tempC;
    for (const eq of t.equipment) if (eq.defId.includes('heater') || eq.defId.includes('chiller')) eq.setting = tempC;
  }
}

function run(state: GameState, maxHours: number, tempC: number, until: () => boolean, chunk = 2): number {
  let t = 0;
  while (t < maxHours) {
    if (until()) return t;
    keeper(state, tempC);
    advanceWorld(state, chunk, { forceFull: true });
    t += chunk;
  }
  return t;
}

function setup(speciesId: string, tier: string, waterClass: WaterClass, sexes: Sex[], seed = 17): { g: GameState; t: Tank; animals: Creature[] } {
  const g = newGame({ starterId: waterClass.startsWith('marine') ? 'ocellaris_clownfish' : 'betta', starterName: '', seed });
  const t = createTank(g, tier, waterClass, { cycled: true, placement: { x: 0, z: 3, rotY: 0 }, name: 'Big' });
  const rng = simRng(g);
  const animals = sexes.map((sex) => addCreature(g, createCreature(g, rng, speciesId, { ageDays: 40, sex }), t.id));
  return { g, t, animals };
}

const cases = (g: GameState, speciesId: string) => Object.values(g.clutches).filter((c) => c.speciesId === speciesId);
const young = (g: GameState, motherId: string) => Object.values(g.creatures).filter((c) => c.lineage.motherId === motherId && c.status === 'alive');
const log = (g: GameState) => g.log.map((e) => e.text).join('\n');

describe('BIG-010: shark egg cases (egg_case)', () => {
  it('a pair lays egg cases tied to the rock; a fertile one hatches into a newly hatched pup', () => {
    const { g, t, animals } = setup('epaulette_shark', 'g500', 'marine_fowlr', ['male', 'female']);
    const [, female] = animals;
    const sp = getSpecies('epaulette_shark');
    let fertile = cases(g, sp.id).find((c) => !c.infertile);
    // about half the cases are duds: lay until a fertile one comes (each laying is forced, as the lab's button does)
    for (let i = 0; i < 12 && !fertile; i++) {
      for (const c of cases(g, sp.id)) delete g.clutches[c.id];
      for (const a of animals) a.repro.stageEndsHour = g.clock.hour; // skip any rest
      expect(devForceBreeding(g, female.id).ok).toBe(true);
      run(g, 48, 26, () => cases(g, sp.id).length > 0, 1);
      expect(cases(g, sp.id).length, 'she lays once forced').toBeGreaterThan(0);
      fertile = cases(g, sp.id).find((c) => !c.infertile);
    }
    expect(fertile, 'a fertile case within twelve layings').toBeDefined();
    const cl = fertile!;
    expect(cl.visual).toBe('egg_case');
    expect(cl.count).toBeGreaterThanOrEqual(1);
    expect(cl.count).toBeLessThanOrEqual(sp.breeding.clutchSize.max);
    expect(log(g)).toMatch(/laid \d egg cases? tied to the rock/);
    // the incubation is the species' at 26 °C (real days × 8)
    expect(cl.nextStageHour - cl.laidHour).toBeCloseTo(sp.breeding.incubationHours, 0);
    const st = clutchStatus(g, cl.id)!;
    expect(st.label).toMatch(/^\d egg cases?$/);
    expect(st.detail).toMatch(/^Candled: only the yolk so far\. Hatching in /);
    expect(breedingStatus(g, female.id)?.label ?? '').not.toMatch(/Pregnant/);

    // fast-forward to the end of the incubation; it hatches at night into juveniles, newly hatched
    const n = cl.count;
    cl.nextStageHour = g.clock.hour + 1;
    run(g, 48, 26, () => !g.clutches[cl.id], 1);
    expect(g.clutches[cl.id]).toBeUndefined();
    const kids = young(g, female.id);
    expect(kids.length).toBe(n);
    for (const k of kids) {
      expect(k.lifeStage).toBe('juvenile');
      expect(k.captiveBred).toBe(true);
      expect(k.lineage.fatherId).toBe(animals[0].id);
      // a hatchling is about its species' hatch size (15 cm), not grown by the four months in the case
      expect(k.sizeCm).toBeLessThan(sp.lifecycle.hatchSizeCm * 1.6);
    }
    expect(t.id).toBeTruthy();
  });

  it('a female alone still lays, and her cases are empty; left in, they rot away', () => {
    const { g, animals } = setup('coral_catshark', 'g500', 'marine_fowlr', ['female'], 23);
    const [f] = animals;
    run(g, 24 * 14, 26, () => cases(g, 'coral_catshark').length > 0, 2);
    const [cl] = cases(g, 'coral_catshark');
    expect(cl, 'she lays without a male').toBeDefined();
    expect(cl.infertile).toBe(true);
    expect(cl.visual).toBe('egg_case');
    expect(cl.fatherId).toBeNull();
    expect(log(g)).toMatch(new RegExp(`${f.name} laid \\d egg cases? on the sand, but with no male in the tank (it is|they are) empty`));
    expect(clutchStatus(g, cl.id)?.detail).toMatch(/^(A dud|Duds): no embryo inside\./);
    // a dud lies a quarter of the incubation before it has rotted
    expect(cl.nextStageHour - cl.laidHour).toBeCloseTo(getSpecies('coral_catshark').breeding.incubationHours * 0.25, 0);
    expect(f.repro.stage).toBe('resting');
    cl.nextStageHour = g.clock.hour + 1;
    run(g, 6, 26, () => !g.clutches[cl.id], 1);
    expect(g.clutches[cl.id]).toBeUndefined();
    expect(log(g)).toMatch(/empty egg (case has|cases have) rotted away/);
    expect(young(g, f.id)).toHaveLength(0);
  });

  it('warm water hatches a case sooner (Wheeler 2021: 125 days at 27 °C, 101 at 31)', () => {
    const { g, t } = setup('epaulette_shark', 'g500', 'marine_fowlr', []);
    const sp = getSpecies('epaulette_shark');
    const at = (c: number) => {
      t.water.tempC = c;
      return eggCaseIncubation(sp, t);
    };
    expect(at(26)).toBe(sp.breeding.incubationHours);
    expect(at(28)).toBeLessThan(at(26));
    expect(at(24)).toBeGreaterThan(at(26));
    expect(at(31) / at(27)).toBeCloseTo(101 / 125, 1);
    expect(g).toBeTruthy();
  });
});

describe('BIG-010: the motoro’s live young (ray_viviparous)', () => {
  it('a female with a male gives birth to independent pups, then rests', () => {
    const { g, animals } = setup('motoro_stingray', 'g500', 'freshwater_tropical', ['male', 'female']);
    const [male, female] = animals;
    expect(devForceBreeding(g, female.id).ok).toBe(true);
    // forced: due within the hour
    expect(breedingStatus(g, female.id)?.label).toMatch(/^Pregnant: pups due/);
    run(g, 24, 26, () => young(g, female.id).length > 0, 1);
    const kids = young(g, female.id);
    expect(kids.length).toBeGreaterThanOrEqual(1);
    expect(kids.length).toBeLessThanOrEqual(8);
    for (const k of kids) {
      expect(k.speciesId).toBe('motoro_stingray');
      expect(k.lifeStage).toBe('juvenile');
      expect(k.lineage.fatherId).toBe(male.id);
      expect(k.sizeCm).toBeLessThan(20);
    }
    expect(log(g)).toMatch(new RegExp(`${female.name} gave birth to \\d+ pups?`));
    expect(female.repro.stage).toBe('resting');
    // no clutch is left behind: the pups are born as juveniles
    expect(cases(g, 'motoro_stingray')).toHaveLength(0);
  });

  it('a female without a male never becomes pregnant (no stored sperm)', () => {
    const { g, animals } = setup('motoro_stingray', 'g500', 'freshwater_tropical', ['female'], 29);
    const [f] = animals;
    run(g, 24 * 10, 26, () => f.repro.stage === 'gravid', 4);
    expect(f.repro.stage).not.toBe('gravid');
    expect(young(g, f.id)).toHaveLength(0);
  });
});

describe('BIG-010: the oscar spawns on a stone and guards (cichlid_substrate)', () => {
  it('a pair cleans a stone, lays in rows on it, and the male guards eggs and wrigglers; nobody eats the eggs', () => {
    const { g, animals } = setup('oscar', 'g180', 'freshwater_tropical', ['male', 'female'], 31);
    const [male, female] = animals;
    expect(getSpecies('oscar').breeding.system).toBe('cichlid_substrate');
    expect(devForceBreeding(g, female.id).ok).toBe(true);
    run(g, 24, 27, () => cases(g, 'oscar').length > 0, 1);
    const [cl] = cases(g, 'oscar');
    expect(cl, 'they spawn once forced').toBeDefined();
    expect(cl).toMatchObject({ visual: 'eggs_adhesive', stage: 'eggs', guardedById: male.id });
    expect(log(g)).toMatch(new RegExp(`${female.name} laid [\\d,]+ sticky eggs in rows on the stone and ${male.name} fertilised them\\. ${male.name} fans them`));
    expect(log(g)).not.toMatch(/T-position|onto the glass|cory/);
    expect(male.repro.stage).toBe('guarding');
    // through the eggs (3 days × 8) into the wrigglers, still guarded, and never eaten by a parent
    run(g, 48, 27, () => g.clutches[cl.id]?.stage === 'larvae', 2);
    expect(g.clutches[cl.id]?.stage).toBe('larvae');
    expect(g.clutches[cl.id]?.guardedById).toBe(male.id);
    expect(log(g)).not.toMatch(/eating (her|his) own eggs/);
  });
});

describe('BIG-010: egg cases one by one (the review)', () => {
  /** Force layings until one has the wanted shape; returns its clutches. */
  function layUntil(g: GameState, animals: Creature[], want: (cls: ReturnType<typeof cases>) => boolean, tries = 20) {
    for (let i = 0; i < tries; i++) {
      for (const c of cases(g, 'epaulette_shark')) delete g.clutches[c.id];
      for (const a of animals) a.repro.stageEndsHour = g.clock.hour;
      devForceBreeding(g, animals[1].id);
      run(g, 48, 26, () => cases(g, 'epaulette_shark').length > 0, 1);
      const cls = cases(g, 'epaulette_shark');
      if (want(cls)) return cls;
    }
    return null;
  }

  it('in a laying with both, the dud lies beside the good case as its own clutch, and can be lifted out', () => {
    const { g, animals } = setup('epaulette_shark', 'g500', 'marine_fowlr', ['male', 'female'], 37);
    const cls = layUntil(g, animals, (c) => c.some((x) => !x.infertile) && c.some((x) => x.infertile));
    expect(cls, 'a mixed laying within twenty').not.toBeNull();
    const good = cls!.find((x) => !x.infertile)!;
    const dud = cls!.find((x) => x.infertile)!;
    expect(good.count + dud.count).toBeLessThanOrEqual(2);
    expect(dud).toMatchObject({ visual: 'egg_case', count: 1, notes: 'A dud: no embryo inside. Lift it out, or it rots.' });
    // good eggs are refused, the dud comes out
    expect(liftOutClutch(g, good.id).ok).toBe(false);
    const r = liftOutClutch(g, dud.id);
    expect(r.ok).toBe(true);
    expect(r.message).toBe(`Lifted ${animals[1].name}’s 1 empty egg case out of Big.`);
    expect(g.clutches[dud.id]).toBeUndefined();
    expect(g.clutches[good.id]).toBeDefined();
  });

  it('through a whole incubation each case is eaten or hatches by chance: some of each over a few pairs', () => {
    let laid = 0;
    let hatched = 0;
    for (let seed = 41; seed <= 48; seed++) {
      const { g, animals } = setup('epaulette_shark', 'g500', 'marine_fowlr', ['male', 'female'], seed);
      const cls = layUntil(g, animals, (c) => c.some((x) => !x.infertile));
      expect(cls, `seed ${seed}`).not.toBeNull();
      const good = cls!.find((x) => !x.infertile)!;
      // no more laying meanwhile: the parents rest through it
      for (const a of animals) a.repro.stageEndsHour = g.clock.hour + 5000;
      laid += good.count;
      run(g, 1400, 26, () => !g.clutches[good.id], 4);
      expect(g.clutches[good.id], `seed ${seed}: hatched or lost by then`).toBeUndefined();
      hatched += young(g, animals[1].id).length;
    }
    // the adults eat about half the cases in their own tank (predationWithoutNursery 0.5)
    expect(hatched).toBeGreaterThan(0);
    expect(hatched).toBeLessThan(laid);
  });
});

describe('BIG-010: a motoro rests long after every third litter (the review)', () => {
  it('counts litters as clutches, not history lines, and rests three times as long after the third', () => {
    const { g, animals } = setup('motoro_stingray', 'g500', 'freshwater_tropical', ['male', 'female'], 43);
    const [male, female] = animals;
    const cool = getSpecies('motoro_stingray').breeding.cooldownDays * 24;
    const rests: number[] = [];
    for (let litter = 1; litter <= 3; litter++) {
      female.repro.stage = 'idle';
      female.repro.stageEndsHour = undefined;
      expect(devForceBreeding(g, female.id).ok, `litter ${litter}`).toBe(true);
      run(g, 12, 26, () => female.repro.stage === 'resting', 1);
      expect(female.repro.stage, `litter ${litter}`).toBe('resting');
      rests.push(Math.round((female.repro.stageEndsHour! - g.clock.hour) / cool));
    }
    expect(female.repro.totalClutches).toBe(3);
    // about one cooldown after the first two, three after the third
    expect(rests[0]).toBeLessThanOrEqual(1);
    expect(rests[1]).toBeLessThanOrEqual(1);
    expect(rests[2]).toBeGreaterThanOrEqual(2);
    expect(female.history.some((e) => new RegExp(`^Gave birth to \\d+ pups? by ${male.name}\\.$`).test(e.text))).toBe(true);
    expect(female.history.some((e) => /^Spawned with/.test(e.text))).toBe(false);
  });
});

describe('the older cichlids and the green chromis spawn as they really do (the owner, ADR-0053 round 5)', () => {
  const pair = (id: string, tier: string, wc: WaterClass, temp: number, seed: number) => {
    const { g, animals } = setup(id, tier, wc, ['male', 'female'], seed);
    const [male, female] = animals;
    expect(devForceBreeding(g, female.id).ok, id).toBe(true);
    run(g, 24, temp, () => cases(g, id).length > 0, 1);
    const [cl] = cases(g, id);
    expect(cl, `${id} spawns once forced`).toBeDefined();
    return { g, male, female, cl };
  };
  it('the discus, angelfish and ram clean a stone or leaf, lay in rows, and the male guards', () => {
    for (const [id, tier, temp, noun] of [['discus', 'g55', 29, 'stone'], ['freshwater_angelfish', 'g55', 27, 'leaf'], ['german_blue_ram', 'g20L', 28, 'stone']] as const) {
      expect(getSpecies(id).breeding.system, id).toBe('cichlid_substrate');
      const { g, male, female, cl } = pair(id, tier, 'freshwater_tropical', temp, 51);
      expect(cl, id).toMatchObject({ visual: 'eggs_adhesive', stage: 'eggs', guardedById: male.id });
      expect(log(g), id).toMatch(new RegExp(`${female.name} laid [\\d,]+ sticky eggs in rows on the ${noun} and ${male.name} fertilised them`));
      expect(log(g), id).not.toMatch(/T-position|onto the glass|cory/);
    }
  });
  it('the green chromis male clears a nest on the sand and guards it alone; the larvae need copepods', () => {
    expect(getSpecies('green_chromis').breeding.system).toBe('damsel_nest');
    const { g, male, female, cl } = pair('green_chromis', 'g75', 'marine_fowlr', 26, 53);
    expect(cl).toMatchObject({ visual: 'eggs_adhesive', stage: 'eggs', guardedById: male.id });
    expect(log(g)).toMatch(new RegExp(`${female.name} laid [\\d,]+ tiny eggs in ${male.name}’s nest\\. ${male.name} fans them`));
    expect(log(g)).not.toMatch(/T-position|onto the glass|cory/);
  });
});
