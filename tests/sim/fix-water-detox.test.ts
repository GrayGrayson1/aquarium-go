/**
 * Fix lane WATER — S01-01: conditioner really binds ammonia/nitrite (sim, report and creature harm agree), and the
 * dose wears off after a day instead of discounting the comfort model for three.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { makeContext, type SimContext } from '@/sim/context';
import { mulberry32 } from '@/sim/rng';
import { stepTankWater, getWaterReport, speciesWaterComfort } from '@/sim/water';
import { dose, waterChange } from '@/sim/care';
import { speciesWaterView } from '@/sim/life/welfare';
import { getSpecies } from '@/data/species';
import { DETOX_FREE_FRACTION, DETOX_HOURS } from '@/sim/water/constants';

const base = () => newGame({ starterId: 'betta', starterName: 'Test', seed: 99 });
const firstTank = (s: GameState) => s.tanks[s.tankOrder[0]];

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
const param = (s: GameState, t: Tank, key: string) => getWaterReport(s, t.id).params.find((p) => p.key === key)!;

describe('fix-water S01-01: conditioner binds ammonia and nitrite for a day', () => {
  it('binds most of the ammonia/nitrite on dosing, and the creature harm drops with the report', () => {
    const s = base();
    const t = firstTank(s);
    const betta = getSpecies('betta');
    s.finance.money = 100;
    t.water.ammonia = 1.2;
    t.water.nitrite = 1.0;
    const harmBefore = speciesWaterView(betta, t).harm;
    expect(param(s, t, 'ammonia').status).toBe('danger');
    expect(harmBefore).toBeGreaterThan(1);

    const r = dose(s, t.id, 'conditioner');
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/1\.20 → 0\.42 ppm/);
    expect(t.water.ammonia).toBeCloseTo(1.2 * DETOX_FREE_FRACTION, 5);
    expect(t.water.nitrite).toBeCloseTo(1.0 * DETOX_FREE_FRACTION, 5);
    expect(t.water.lab?.boundAmmonia).toBeCloseTo(1.2 * (1 - DETOX_FREE_FRACTION), 5);
    expect(t.water.lab?.detoxUntilHour).toBe(s.clock.hour + DETOX_HOURS);
    // The report, the water lane's comfort and the life lane's welfare view all read the same (free) numbers.
    expect(param(s, t, 'ammonia').status).not.toBe('danger');
    expect(param(s, t, 'ammonia').reason).toMatch(/holding another 0\.78 ppm bound/);
    expect(speciesWaterView(betta, t).harm).toBeLessThan(harmBefore * 0.5);
    expect(speciesWaterComfort(betta, t).harm).toBeLessThan(0.3);
  });

  it('keeps the split through the water step, then releases the bound share when the dose wears off', () => {
    const s = base();
    const t = firstTank(s);
    s.finance.money = 100;
    t.water.bioMaturity = 0; // nothing to nitrify it away: the total is conserved through the steps
    t.water.ammonia = 1.2;
    t.water.nitrite = 1.0;
    t.water.lab!.pendingWaste = 0;
    for (const id of Object.keys(s.creatures)) delete s.creatures[id]; // no waste, no warnings
    dose(s, t.id, 'conditioner');
    const start = s.clock.hour;
    run(s, t, 12);
    const totalNH = t.water.ammonia + (t.water.lab?.boundAmmonia ?? 0);
    expect(t.water.ammonia).toBeLessThan(0.6);
    expect(totalNH).toBeGreaterThan(1.0);
    expect(t.water.ammonia / totalNH).toBeCloseTo(DETOX_FREE_FRACTION, 3);
    expect(t.water.lab?.detoxUntilHour).toBe(start + DETOX_HOURS);

    run(s, t, 13); // past the 24 h window
    expect(t.water.lab?.detoxUntilHour).toBeUndefined();
    expect(t.water.lab?.boundAmmonia).toBeUndefined();
    expect(t.water.ammonia).toBeGreaterThan(1.0); // what conditioner held is back
    expect(t.water.nitrite).toBeGreaterThan(0.8);
    expect(param(s, t, 'ammonia').status).toBe('danger');
  });

  it('warns once when the dose wears off with dangerous water underneath, and a water change removes the bound share too', () => {
    const s = base();
    const t = firstTank(s);
    s.finance.money = 100;
    t.water.bioMaturity = 0;
    t.water.ammonia = 1.2;
    t.water.nitrite = 1.0;
    dose(s, t.id, 'conditioner');
    run(s, t, 25.2, 0.7); // steps that straddle the expiry hour, as the world's pieces do
    const notice = s.log.find((e) => /conditioner in .* has worn off/i.test(e.text));
    expect(notice).toBeDefined();
    expect(notice!.text).toMatch(/ammonia is back to/);
    expect(s.log.filter((e) => /has worn off/i.test(e.text)).length).toBe(1);

    dose(s, t.id, 'conditioner');
    const boundBefore = t.water.lab!.boundAmmonia!;
    expect(waterChange(s, t.id, 0.5).ok).toBe(true);
    expect(t.water.lab!.boundAmmonia!).toBeLessThan(boundBefore * 0.6);
  });
});
