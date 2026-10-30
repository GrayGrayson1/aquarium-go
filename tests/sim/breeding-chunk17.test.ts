/**
 * chunk 17 (ADR-0053; BIG-010) — the two new breeding systems run end to end in compressed game time: the bottom
 * sharks' egg cases (egg_case: about half are duds, a lone female lays empty ones that rot, warm water hatches them
 * sooner, a case hatches into a newly hatched juvenile) and the motoro's live young (ray_viviparous: a male is needed,
 * one to eight independent pups, then a rest).
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
import { devForceBreeding } from '@/sim/life/breeding/actions';
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
