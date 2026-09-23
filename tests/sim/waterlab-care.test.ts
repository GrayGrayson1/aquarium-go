/**
 * Husbandry actions & starter tuning (lane waterlab).
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank } from '@/types';
import { newGame, STARTER_SETUPS } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { advanceWorld } from '@/sim/world';
import { makeContext, type SimContext } from '@/sim/context';
import { mulberry32 } from '@/sim/rng';
import { stepTankWater, consumeFood, availableFood, getWaterReport, speciesWaterComfort } from '@/sim/water';
import { feedTank, waterChange, topOff, cleanTank, dose, installEquipment, removeEquipment, setEquipment, setLighting, repairEquipment, tuneEquipmentForSpecies } from '@/sim/care';
import { getSpecies } from '@/data/species';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { FOODS, getFoodDef } from '@/data/catalog/foods';
import { EQUIPMENT } from '@/data/catalog/equipment';
import { SUBSTRATES } from '@/data/catalog/substrates';
import { STARTER_IDS } from '@/data/species';

type Starter = (typeof STARTER_IDS)[number];
const base = (starter: Starter = 'betta') => newGame({ starterId: starter, starterName: 'Test', seed: 99 });
const firstTank = (s: GameState) => s.tanks[s.tankOrder[0]];
const kindOf = (defId: string) => getEquipmentDef(defId)?.kind;

function quietCtx(state: GameState, dt: number): SimContext {
  const c = makeContext(state, dt);
  return { ...c, hour: state.clock.hour, rng: { ...mulberry32(3), chance: () => false } };
}
function run(state: GameState, tank: Tank, hours: number, step = 0.5): void {
  for (let t = 0; t < hours - 1e-9; t += step) {
    stepTankWater(state, tank, step, quietCtx(state, step));
    state.clock.hour += step;
  }
}

describe('waterlab: catalogs', () => {
  it('has every required equipment, food and substrate id', () => {
    const eq = new Set(EQUIPMENT.map((e) => e.id));
    for (const id of ['filter_sponge', 'filter_hob_small', 'filter_hob_large', 'filter_canister', 'filter_sump', 'heater_50w', 'heater_100w', 'heater_300w', 'heater_titanium_800w', 'chiller_mini', 'chiller_large', 'fan_clip', 'light_basic_led', 'light_planted', 'light_reef', 'light_reef_premium', 'airstone', 'powerhead_small', 'powerhead_large', 'wavemaker', 'skimmer_hob', 'skimmer_insump', 'ato', 'autofeeder', 'co2_kit', 'uv_sterilizer', 'refugium', 'lid_glass'])
      expect(eq.has(id), id).toBe(true);
    const foods = new Set(FOODS.map((f) => f.id));
    for (const id of ['flake_tropical', 'micro_pellets', 'sinking_pellets', 'axolotl_pellets', 'earthworm', 'bloodworm_frozen', 'brine_frozen', 'mysis_frozen', 'daphnia_frozen', 'live_snails', 'algae_wafers', 'nori_sheet', 'marine_pellets', 'live_copepods', 'coral_food', 'blanched_veg', 'baby_brine_live', 'infusoria_culture', 'goldfish_pellets', 'gel_food', 'meaty_frozen'])
      expect(foods.has(id), id).toBe(true);
    expect(new Set(SUBSTRATES.map((s) => s.kind)).size).toBe(8);
    // every starter's food ids exist
    for (const st of STARTER_IDS) for (const f of Object.keys(STARTER_SETUPS[st].foods)) expect(getFoodDef(f), f).toBeDefined();
  });
});

describe('waterlab: feeding', () => {
  it('feeding consumes inventory and adds food by tag; consumption respects tags', () => {
    const s = base('betta');
    const t = firstTank(s);
    const have = s.inventory.foods.micro_pellets;
    const r = feedTank(s, t.id, 'micro_pellets', { servings: 2 });
    expect(r.ok).toBe(true);
    expect(s.inventory.foods.micro_pellets).toBe(have - 2);
    expect(t.water.foodInWater).toBeCloseTo(2 * getFoodDef('micro_pellets')!.nutrition, 5);
    expect(t.water.foodByTag?.pellet_small).toBeGreaterThan(0);
    expect(consumeFood(t, ['snail_live'], 10)).toBe(0); // wrong food: nothing eaten
    const eaten = consumeFood(t, ['pellet_small', 'bloodworm'], 10);
    expect(eaten).toBeCloseTo(10, 5);
    expect(s.progress.counters.feeds).toBe(1);
    expect(feedTank(s, t.id, 'coral_food').ok).toBe(false); // not in inventory
  });

  it('target feeding reserves the portion for the target creature', () => {
    const s = base('lined_seahorse');
    const t = firstTank(s);
    const horse = Object.values(s.creatures)[0];
    const r = feedTank(s, t.id, 'mysis_frozen', { targetCreatureId: horse.id, servings: 1 });
    expect(r.ok).toBe(true);
    expect(t.water.targetFeed?.creatureId).toBe(horse.id);
    expect(availableFood(t, ['mysis'], 'someone_else')).toBe(0);
    expect(consumeFood(t, ['mysis'], 20, 'someone_else')).toBe(0);
    expect(consumeFood(t, ['mysis'], 20, horse.id)).toBeGreaterThan(19);
    expect(feedTank(s, t.id, 'mysis_frozen', { targetCreatureId: 'nope' }).ok).toBe(false);
  });

  it('overfeeding warns the player', () => {
    const s = base('betta');
    const t = firstTank(s);
    const r = feedTank(s, t.id, 'micro_pellets', { servings: 20 });
    expect(r.message).toMatch(/more than they can eat/i);
    expect(s.log.some((e) => e.kind === 'tip' && /overfeeding/i.test(e.text))).toBe(true);
  });
});

describe('waterlab: water changes, top-off, cleaning', () => {
  it('a marine water change uses salt and resets salinity toward the target', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    t.water.salinitySG = 1.029;
    t.water.nitrate = 30;
    const salt = s.inventory.salt;
    const r = waterChange(s, t.id, 0.4);
    expect(r.ok).toBe(true);
    expect(s.inventory.salt).toBeLessThan(salt);
    expect(t.water.salinitySG).toBeLessThan(1.028);
    expect(t.water.nitrate).toBeLessThan(20);
    s.inventory.salt = 0;
    expect(waterChange(s, t.id, 0.3).ok).toBe(false); // no salt, no marine water change
  });

  it('a large temperature-mismatched change stresses animals (flag + event)', () => {
    const s = base('axolotl');
    const t = firstTank(s);
    t.water.tempC = 16;
    const r = waterChange(s, t.id, 0.8, { newWaterTempC: 24 });
    expect(r.ok).toBe(true);
    expect(t.water.shock).toBeDefined();
    expect(t.water.shock!.severity).toBeGreaterThan(0.3);
    expect(s.log.some((e) => e.kind === 'warning' && /stressed/i.test(e.text))).toBe(true);
    // a matched change does not
    const s2 = base('axolotl');
    const t2 = firstTank(s2);
    waterChange(s2, t2.id, 0.3);
    expect(t2.water.shock).toBeUndefined();
  });

  it('top-off restores the level (freshwater)', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.water.level = 0.9;
    expect(topOff(s, t.id).ok).toBe(true);
    expect(t.water.level).toBe(1);
    expect(topOff(s, t.id).message).toMatch(/already full/i);
  });

  it('cleaning the filter too aggressively knocks the biofilter back', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.water.bioMaturity = 1;
    cleanTank(s, t.id, 'filter');
    const afterGentle = t.water.bioMaturity;
    expect(afterGentle).toBeGreaterThan(0.9);
    cleanTank(s, t.id, 'filter'); // again right away → "too often"
    expect(afterGentle - t.water.bioMaturity).toBeGreaterThan(1 - afterGentle);
    const harsh = cleanTank(s, t.id, 'filter', { harsh: true });
    expect(harsh.message).toMatch(/killed many beneficial bacteria/i);
    expect(s.progress.counters.cleanings).toBe(3);
  });

  it('gravel vacuuming removes detritus, glass scraping removes algae', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.water.detritus = 50;
    t.water.algae = 40;
    cleanTank(s, t.id, 'gravel');
    cleanTank(s, t.id, 'glass');
    expect(t.water.detritus).toBeLessThan(30);
    expect(t.water.algae).toBeLessThan(20);
  });
});

describe('waterlab: dosing', () => {
  it('each additive has a real effect and a price', () => {
    const s = base('betta');
    const t = firstTank(s);
    s.finance.money = 500;
    t.water.bioMaturity = 0.1;
    const m0 = s.finance.money;
    expect(dose(s, t.id, 'bacteria').ok).toBe(true);
    expect(t.water.bioMaturity).toBeGreaterThan(0.35);
    expect(s.finance.money).toBeLessThan(m0);
    expect(dose(s, t.id, 'conditioner').ok).toBe(true);
    expect(t.water.lab?.detoxUntilHour).toBeGreaterThan(s.clock.hour);
    const kh0 = t.water.kh;
    expect(dose(s, t.id, 'buffer').ok).toBe(true);
    expect(t.water.kh).toBeGreaterThan(kh0);
    expect(dose(s, t.id, 'fertilizer').ok).toBe(true);
    expect(t.water.lab?.fertilizer).toBeGreaterThan(0.3);
    expect(dose(s, t.id, 'salt').ok).toBe(false); // freshwater
    expect(dose(s, t.id, 'coral_supplement').ok).toBe(false);
    expect(s.progress.counters.doses).toBe(4);

    const m = base('ocellaris_clownfish');
    const mt = firstTank(m);
    m.finance.money = 500;
    mt.water.salinitySG = 1.021;
    expect(dose(m, mt.id, 'salt').ok).toBe(true);
    expect(mt.water.salinitySG).toBeCloseTo(1.022, 4);
    expect(dose(m, mt.id, 'coral_supplement').ok).toBe(true);
    expect(dose(m, mt.id, 'fertilizer').ok).toBe(false);
    m.finance.money = 0;
    expect(dose(m, mt.id, 'bacteria').ok).toBe(false);
  });

  it('conditioner lowers the reported ammonia danger', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.water.ammonia = 1.5; // soft planted water (pH ~7.1) keeps most of it ionised, so it takes more to be dangerous
    expect(getWaterReport(s, t.id).params.find((p) => p.key === 'ammonia')!.status).toBe('danger');
    s.finance.money = 100;
    dose(s, t.id, 'conditioner');
    expect(getWaterReport(s, t.id).params.find((p) => p.key === 'ammonia')!.status).not.toBe('danger');
  });
});

describe('waterlab: equipment actions', () => {
  it('moving mature filter media seeds a new tank', () => {
    const s = base('betta');
    const old = firstTank(s);
    old.water.bioMaturity = 1;
    const sponge = old.equipment.find((e) => e.defId === 'filter_sponge')!;
    const rem = removeEquipment(s, old.id, sponge.id);
    expect(rem.ok).toBe(true);
    expect(old.water.bioMaturity).toBeLessThan(0.5);
    expect(s.inventory.equipment.some((e) => e.id === sponge.id)).toBe(true);
    const fresh = createTank(s, 'g10', 'freshwater_tropical', { cycled: false, withDefaultEquipment: false });
    const inst = installEquipment(s, fresh.id, 'filter_sponge', { fromInventory: true });
    expect(inst.ok).toBe(true);
    expect(inst.message).toMatch(/seeded/i);
    expect(fresh.water.bioMaturity).toBeGreaterThan(0.6);
    expect(s.inventory.equipment.some((e) => e.id === sponge.id)).toBe(false);
  });

  it('install modes: storage spare by default, explicit purchase, explicit instance', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    const pump = t.equipment.find((e) => e.defId === 'powerhead_small')!;
    removeEquipment(s, t.id, pump.id);
    expect(s.inventory.equipment.length).toBe(1);
    // no options: the stored unit is used (no free duplicate)
    expect(installEquipment(s, t.id, 'powerhead_small').message).toMatch(/from storage/);
    expect(s.inventory.equipment.length).toBe(0);
    expect(t.equipment.some((e) => e.id === pump.id)).toBe(true);
    // purchased: always a new unit, storage untouched
    removeEquipment(s, t.id, pump.id);
    const before = t.equipment.length;
    installEquipment(s, t.id, 'powerhead_small', { purchased: true });
    expect(t.equipment.length).toBe(before + 1);
    expect(s.inventory.equipment.length).toBe(1);
    // instanceId: that exact unit
    expect(installEquipment(s, t.id, 'powerhead_small', { instanceId: pump.id }).ok).toBe(true);
    expect(s.inventory.equipment.length).toBe(0);
    expect(installEquipment(s, t.id, 'powerhead_small', { fromInventory: true }).ok).toBe(false);
  });

  it('refuses nonsense installs and clamps settings', () => {
    const s = base('betta');
    const t = firstTank(s);
    expect(installEquipment(s, t.id, 'skimmer_hob').ok).toBe(false); // freshwater
    expect(installEquipment(s, t.id, 'lid_glass').ok).toBe(false); // already has one
    const heater = t.equipment.find((e) => kindOf(e.defId) === 'heater')!;
    setEquipment(s, t.id, heater.id, { setting: 99 });
    expect(heater.setting).toBe(34);
    const light = setLighting(s, t.id, { onHour: 6, offHour: 22, intensity: 3 });
    expect(t.lighting.intensity).toBe(1.5);
    expect(light.message).toMatch(/algae/i);
  });

  it('repairing failed equipment costs money and restores it', () => {
    const s = base('betta');
    const t = firstTank(s);
    const heater = t.equipment.find((e) => kindOf(e.defId) === 'heater')!;
    heater.failed = true;
    heater.failMode = 'off';
    s.finance.money = 100;
    const r = repairEquipment(s, t.id, heater.id);
    expect(r.ok).toBe(true);
    expect(heater.failed).toBe(false);
    expect(s.finance.money).toBeLessThan(100);
  });

  it('tuneEquipmentForSpecies sets heater in the ideal band, gentle flow for seahorses, light by preference', () => {
    const s = base('lined_seahorse');
    const t = firstTank(s);
    const sea = getSpecies('lined_seahorse');
    const heater = t.equipment.find((e) => kindOf(e.defId) === 'heater')!;
    expect(heater.setting!).toBeGreaterThanOrEqual(sea.tempC.idealMin);
    expect(heater.setting!).toBeLessThanOrEqual(sea.tempC.idealMax);
    const pump = t.equipment.find((e) => kindOf(e.defId) === 'powerhead')!;
    expect(pump.setting!).toBeLessThanOrEqual(0.15);
    // re-tuning an existing tank for a different species works too
    const t2 = createTank(s, 'g29', 'marine_live_rock', { cycled: true });
    tuneEquipmentForSpecies(s, t2.id, 'ocellaris_clownfish');
    expect(t2.equipment.find((e) => kindOf(e.defId) === 'powerhead')!.setting!).toBeGreaterThan(0.4);
    const ax = base('axolotl');
    const at = firstTank(ax);
    const chill = at.equipment.find((e) => kindOf(e.defId) === 'chiller')!;
    expect(chill.setting!).toBeGreaterThanOrEqual(15);
    expect(chill.setting!).toBeLessThanOrEqual(18);
    expect(at.lighting.intensity).toBeLessThan(0.7); // axolotls like dim light
  });
});

describe('waterlab: starters stay healthy', () => {
  it('all five starter tanks are GOOD with comfort ≥ 85 at start and after 3 days of normal feeding', () => {
    for (const st of STARTER_IDS) {
      const s = base(st);
      const tank = firstTank(s);
      const c = Object.values(s.creatures).find((x) => x.tankId === tank.id)!;
      const sp = getSpecies(st);
      const check = (when: string) => {
        const r = getWaterReport(s, tank.id);
        const comfort = speciesWaterComfort(sp, tank);
        expect(r.status, `${st} ${when}: ${r.headline} — ${r.issues.map((i) => i.text).join(' / ')}`).toBe('good');
        expect(comfort.comfort, `${st} ${when}: ${comfort.stressors.join(' / ')}`).toBeGreaterThanOrEqual(85);
        expect(comfort.harm).toBe(0);
      };
      check('start');
      const foods = Object.keys(STARTER_SETUPS[st].foods);
      for (let h = 0; h < 72; h += 1) {
        const hod = s.clock.hour % 24;
        if (Math.abs(hod - 9) < 0.5 || Math.abs(hod - 18) < 0.5) {
          const food = foods[Math.floor(s.clock.hour / 24) % foods.length];
          if ((s.inventory.foods[food] ?? 0) > 0) feedTank(s, tank.id, food, sp.feedingStyle === 'target_fed' ? { targetCreatureId: c.id } : {});
        }
        advanceWorld(s, 1, { forceFull: true, focusTankId: tank.id });
      }
      check('after 3 days');
    }
  });

  it('a whole day in one 6-hour chunk (summary LOD) keeps the starter healthy and finite', () => {
    const s = base('betta');
    const t = firstTank(s);
    run(s, t, 24, 6);
    for (const v of Object.values(t.water)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
    expect(getWaterReport(s, t.id).status).toBe('good');
  });
});
