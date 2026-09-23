/**
 * Water chemistry & life-support simulation (lane waterlab).
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng, mulberry32 } from '@/sim/rng';
import { makeContext, type SimContext } from '@/sim/context';
import {
  stepTankWater,
  addWaste,
  getWaterReport,
  speciesWaterComfort,
  comfortStatus,
  defaultEquipmentFor,
  freeAmmoniaFraction,
  tankDailyCost,
  ROOM_TEMP_C,
} from '@/sim/water';
import { feedTank, waterChange, topOff, installEquipment, setEquipment } from '@/sim/care';
import { getSpecies, findSpecies } from '@/data/species';
import { getEquipmentDef } from '@/data/catalog/equipment';

const SEED = 4242;
const base = (starter: 'betta' | 'axolotl' | 'pea_puffer' | 'ocellaris_clownfish' | 'lined_seahorse' = 'betta') =>
  newGame({ starterId: starter, starterName: 'Test', seed: SEED });

/** Context whose RNG never rolls an equipment failure (deterministic chemistry tests). */
function quietCtx(state: GameState, dt: number, fail = false): SimContext {
  const c = makeContext(state, dt);
  return { ...c, hour: state.clock.hour, rng: { ...mulberry32(7), chance: () => fail } };
}

function run(state: GameState, tank: Tank, hours: number, opts: { step?: number; wastePerHour?: number; each?: (h: number) => void } = {}): void {
  const step = opts.step ?? 0.5;
  for (let t = 0; t < hours - 1e-9; t += step) {
    if (opts.wastePerHour) addWaste(tank, opts.wastePerHour * step);
    stepTankWater(state, tank, step, quietCtx(state, step));
    state.clock.hour += step;
    opts.each?.(t + step);
  }
}

function bareTank(state: GameState, tier: string, cls: WaterClass, cycled: boolean): Tank {
  return createTank(state, tier, cls, { cycled });
}

function allFinite(tank: Tank): boolean {
  const w = tank.water as unknown as Record<string, unknown>;
  return Object.values(w).every((v) => typeof v !== 'number' || Number.isFinite(v));
}

describe('waterlab: nitrogen cycle', () => {
  it('overfeeding an empty tank raises ammonia as the food rots', () => {
    const s = base();
    const fed = bareTank(s, 'g10', 'freshwater_tropical', true);
    const control = bareTank(s, 'g10', 'freshwater_tropical', true);
    s.inventory.foods.flake_tropical = 200;
    const r = feedTank(s, fed.id, 'flake_tropical', { servings: 25 });
    expect(r.ok).toBe(true);
    expect(s.inventory.foods.flake_tropical).toBe(175);
    let peak = 0;
    for (let i = 0; i < 16; i++) {
      run(s, fed, 0.5);
      run(s, control, 0.5);
      peak = Math.max(peak, fed.water.ammonia);
    }
    expect(peak).toBeGreaterThan(0.25);
    expect(peak).toBeGreaterThan(control.water.ammonia * 5);
    expect(fed.water.foodInWater).toBeLessThan(25 * 25 * 0.3); // most of it has rotted
  });

  it('an uncycled tank spikes while a cycled one with the same load stays clean', () => {
    const s = base();
    const raw = bareTank(s, 'g10', 'freshwater_tropical', false);
    const ok = bareTank(s, 'g10', 'freshwater_tropical', true);
    let rawPeak = 0;
    let okPeak = 0;
    for (let d = 0; d < 5 * 24; d += 1) {
      run(s, raw, 1, { wastePerHour: 1.5 });
      run(s, ok, 1, { wastePerHour: 1.5 });
      rawPeak = Math.max(rawPeak, raw.water.ammonia);
      okPeak = Math.max(okPeak, ok.water.ammonia);
    }
    expect(rawPeak).toBeGreaterThan(0.2);
    expect(okPeak).toBeLessThan(0.1);
  });

  it('the biofilter converts ammonia → nitrite → nitrate with a realistic lag', () => {
    const s = base();
    const t = bareTank(s, 'g10', 'freshwater_tropical', false);
    const startNitrate = t.water.nitrate;
    let peakNH = { v: 0, h: 0 };
    let peakNO2 = { v: 0, h: 0 };
    run(s, t, 10 * 24, {
      step: 1,
      wastePerHour: 1.5,
      each: (h) => {
        if (t.water.ammonia > peakNH.v) peakNH = { v: t.water.ammonia, h };
        if (t.water.nitrite > peakNO2.v) peakNO2 = { v: t.water.nitrite, h };
      },
    });
    expect(peakNH.v).toBeGreaterThan(0.2);
    expect(peakNO2.v).toBeGreaterThan(0.3);
    expect(peakNH.h).toBeLessThan(peakNO2.h); // nitrite peaks after ammonia
    expect(t.water.ammonia).toBeLessThan(0.1);
    expect(t.water.nitrite).toBeLessThan(0.15);
    expect(t.water.nitrate).toBeGreaterThan(startNitrate + 3);
    expect(t.water.bioMaturity).toBeGreaterThan(0.8);
    expect(getWaterReport(s, t.id).cycleProgress).toBeGreaterThan(0.8);
  });

  it('a bigger volume changes less per unit of waste', () => {
    const s = base();
    const small = bareTank(s, 'g10', 'freshwater_tropical', false);
    const big = bareTank(s, 'g55', 'freshwater_tropical', false);
    for (const t of [small, big]) {
      t.equipment = [];
      t.water.bioMaturity = 0;
      addWaste(t, 40);
      run(s, t, 1, { step: 1 });
    }
    expect(small.water.ammonia).toBeGreaterThan(big.water.ammonia * 3);
  });

  it('free ammonia is far more toxic at reef pH', () => {
    expect(freeAmmoniaFraction(8.2, 25)).toBeGreaterThan(freeAmmoniaFraction(7.0, 25) * 10);
  });

  it('a water change lowers nitrate', () => {
    const s = base();
    const t = bareTank(s, 'g20L', 'freshwater_tropical', true);
    t.water.nitrate = 40;
    const r = waterChange(s, t.id, 0.5);
    expect(r.ok).toBe(true);
    expect(t.water.nitrate).toBeLessThan(25);
    expect(r.message).toMatch(/Nitrate 40 → 2\d ppm/);
    expect(s.progress.counters.waterChanges).toBe(1);
  });
});

describe('waterlab: temperature & equipment', () => {
  it('a heater raises the temperature and a chiller lowers it', () => {
    const s = base();
    const warm = bareTank(s, 'g20L', 'freshwater_tropical', true);
    warm.water.tempC = 20;
    const heater = warm.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'heater')!;
    setEquipment(s, warm.id, heater.id, { setting: 27 });
    run(s, warm, 24);
    expect(warm.water.tempC).toBeGreaterThan(26);

    const cool = bareTank(s, 'g20L', 'freshwater_cool', true);
    cool.water.tempC = ROOM_TEMP_C;
    const chiller = cool.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'chiller')!;
    setEquipment(s, cool.id, chiller.id, { setting: 16 });
    run(s, cool, 24);
    expect(cool.water.tempC).toBeLessThan(17.5);

    // Without its chiller the cool tank drifts back toward room temperature.
    setEquipment(s, cool.id, chiller.id, { on: false });
    run(s, cool, 48);
    expect(cool.water.tempC).toBeGreaterThan(ROOM_TEMP_C - 1.5);
  });

  it('heater and chiller fighting each other raises a warning and costs more', () => {
    const s = base();
    const t = bareTank(s, 'g20L', 'freshwater_tropical', true);
    const calmCost = tankDailyCost(s, t);
    const heater = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'heater')!;
    setEquipment(s, t.id, heater.id, { setting: 27 });
    const inst = installEquipment(s, t.id, 'chiller_mini');
    expect(inst.ok).toBe(true);
    const chiller = t.equipment.find((e) => e.defId === 'chiller_mini')!;
    const res = setEquipment(s, t.id, chiller.id, { setting: 24 });
    expect(res.message).toMatch(/fight/i);
    run(s, t, 6);
    const report = getWaterReport(s, t.id);
    expect(report.issues.some((i) => /fight/i.test(i.text))).toBe(true);
    expect(s.log.some((e) => /fighting/i.test(e.text))).toBe(true);
    expect(tankDailyCost(s, t)).toBeGreaterThan(calmCost);
    expect(t.water.lab?.conflict).toBe(true);
  });

  it('equipment failure emits an event; a stuck heater overheats the tank', () => {
    const s = base();
    const t = bareTank(s, 'g10', 'freshwater_tropical', true);
    // one step where every failure roll succeeds (including the stuck-thermostat roll)
    stepTankWater(s, t, 1, quietCtx(s, 1, true));
    expect(t.equipment.filter((e) => (getEquipmentDef(e.defId)?.stats.failureRate ?? 0) > 0).every((e) => e.failed)).toBe(true);
    expect(s.log.some((e) => /failed|stuck/i.test(e.text))).toBe(true);
    const heater = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'heater')!;
    expect(heater.failMode).toBe('stuck_on');
    run(s, t, 24);
    expect(t.water.tempC).toBeGreaterThan(29);
    const report = getWaterReport(s, t.id);
    expect(report.status).toBe('danger');
    expect(report.issues.some((i) => /stuck/i.test(i.text))).toBe(true);
    // switching it off lets it cool again
    setEquipment(s, t.id, heater.id, { on: false });
    const hot = t.water.tempC;
    run(s, t, 24);
    expect(t.water.tempC).toBeLessThan(hot - 2);
  });

  it('starter kits and big-tank kits are sensible', () => {
    expect(defaultEquipmentFor('g20L', 'freshwater_cool')).toEqual(expect.arrayContaining(['filter_sponge', 'chiller_mini', 'light_basic_led', 'lid_glass']));
    expect(defaultEquipmentFor('g20L', 'freshwater_cool').some((id) => id.startsWith('heater'))).toBe(false);
    expect(defaultEquipmentFor('g10', 'freshwater_planted')).toEqual(expect.arrayContaining(['filter_sponge', 'heater_50w', 'light_planted', 'lid_glass']));
    expect(defaultEquipmentFor('g29', 'marine_live_rock')).toEqual(expect.arrayContaining(['filter_hob_large', 'heater_100w', 'powerhead_small', 'lid_glass']));
    const huge = defaultEquipmentFor('g1000', 'reef');
    expect(huge.filter((id) => id === 'filter_sump').length).toBeGreaterThanOrEqual(2);
    expect(huge).toEqual(expect.arrayContaining(['heater_titanium_800w', 'skimmer_insump', 'ato', 'light_reef_premium', 'wavemaker']));
  });
});

describe('waterlab: salinity & evaporation', () => {
  it('salinity exists only for salt tanks, rises with evaporation, and top-off restores it', () => {
    const s = base('ocellaris_clownfish');
    const fresh = bareTank(s, 'g10', 'freshwater_tropical', true);
    expect(getWaterReport(s, fresh.id).params.some((p) => p.key === 'salinity')).toBe(false);
    expect(fresh.water.salinitySG).toBe(1);

    const t = bareTank(s, 'g29', 'marine_live_rock', true);
    t.equipment = t.equipment.filter((e) => e.defId !== 'lid_glass');
    const sg0 = t.water.salinitySG;
    run(s, t, 7 * 24, { step: 2 });
    expect(t.water.level).toBeLessThan(0.97);
    expect(t.water.salinitySG).toBeGreaterThan(sg0 + 0.0006);
    expect(getWaterReport(s, t.id).params.some((p) => p.key === 'salinity')).toBe(true);
    const r = topOff(s, t.id);
    expect(r.ok).toBe(true);
    expect(t.water.level).toBe(1);
    expect(Math.abs(t.water.salinitySG - sg0)).toBeLessThan(0.0004);
    expect(s.progress.counters.topOffs).toBe(1);
  });

  it('an auto top-off holds salinity steady', () => {
    const s = base('ocellaris_clownfish');
    const t = bareTank(s, 'g29', 'marine_live_rock', true);
    t.equipment.push({ id: 'eq_ato_test', defId: 'ato', installedHour: 0, condition: 1, on: true });
    const sg0 = t.water.salinitySG;
    run(s, t, 5 * 24, { step: 2 });
    expect(t.water.level).toBeGreaterThan(0.99);
    expect(Math.abs(t.water.salinitySG - sg0)).toBeLessThan(0.0002);
  });
});

describe('waterlab: stocking, stability and reports', () => {
  it('overcrowding raises stocking load and lowers stability', () => {
    const s = base('betta');
    const tankId = s.tankOrder[0];
    const tank = s.tanks[tankId];
    const calm = getWaterReport(s, tankId);
    const extraId = findSpecies('neon_tetra') ? 'neon_tetra' : 'pea_puffer';
    const rng = simRng(s);
    for (let i = 0; i < 30; i++) addCreature(s, createCreature(s, rng, extraId, { ageDays: 60 }), tankId);
    run(s, tank, 24, { wastePerHour: 12 });
    const crowded = getWaterReport(s, tankId);
    expect(crowded.stockingLoad).toBeGreaterThan(1);
    expect(crowded.stockingLoad).toBeGreaterThan(calm.stockingLoad * 3);
    expect(crowded.stability).toBeLessThan(calm.stability);
    expect(crowded.params.find((p) => p.key === 'stocking')?.status).toBe('danger');
  });

  it('starter tanks begin healthy', () => {
    for (const st of ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'] as const) {
      const s = base(st);
      const r = getWaterReport(s, s.tankOrder[0]);
      expect(r.status, `${st}: ${r.headline}`).toBe('good');
      expect(r.dailyCost).toBeGreaterThan(0);
      expect(r.stability).toBeGreaterThan(40);
    }
  });

  it('axolotl in warm water is in DANGER (comfort + report)', () => {
    const s = base('axolotl');
    const tank = s.tanks[s.tankOrder[0]];
    const ax = getSpecies('axolotl');
    expect(comfortStatus(speciesWaterComfort(ax, tank).comfort)).toBe('good');
    tank.water.tempC = 24;
    const c = speciesWaterComfort(ax, tank);
    expect(comfortStatus(c.comfort)).toBe('danger');
    expect(c.harm).toBeGreaterThan(0.2);
    expect(c.stressors.join(' ')).toMatch(/too warm/i);
    const temp = getWaterReport(s, tank.id).params.find((p) => p.key === 'temp')!;
    expect(temp.status).toBe('danger');
    expect(temp.reason).toMatch(/too high/i);
  });

  it('freshwater animals in salt water are a hard fail', () => {
    const s = base('betta');
    const marine = bareTank(s, 'g10', 'marine_fowlr', true);
    const c = speciesWaterComfort(getSpecies('betta'), marine);
    expect(c.comfort).toBe(0);
    expect(c.harm).toBe(1);
  });

  it('is robust to 6-hour chunks (no NaN, values in range, similar outcome to fine steps)', () => {
    const coarse = base('lined_seahorse');
    const fine = base('lined_seahorse');
    const tc = coarse.tanks[coarse.tankOrder[0]];
    const tf = fine.tanks[fine.tankOrder[0]];
    run(coarse, tc, 4 * 24, { step: 6, wastePerHour: 2 });
    run(fine, tf, 4 * 24, { step: 0.25, wastePerHour: 2 });
    expect(allFinite(tc)).toBe(true);
    expect(tc.water.oxygen).toBeGreaterThanOrEqual(0);
    expect(tc.water.oxygen).toBeLessThanOrEqual(1);
    expect(Math.abs(tc.water.tempC - tf.water.tempC)).toBeLessThan(0.6);
    expect(Math.abs(tc.water.nitrate - tf.water.nitrate)).toBeLessThan(Math.max(1.5, tf.water.nitrate * 0.15));
    expect(Math.abs(tc.water.salinitySG - tf.water.salinitySG)).toBeLessThan(0.0005);
  });
});
