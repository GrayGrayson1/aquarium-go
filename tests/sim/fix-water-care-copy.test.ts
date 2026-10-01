/**
 * Fix lane WATER — care and report copy: S01-04 (shock reason names the real shift), P1-08 (no "5 → 5 ppm"),
 * S01-09 (top-off keeps KH in salt tanks), S01-08 (KH headline), S01-12 (stocking headline), S01-10 (salt advice).
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { addCreature, createCreature } from '@/sim/life';
import { getWaterReport, speciesWaterComfort } from '@/sim/water';
import { waterChange, topOff, dose } from '@/sim/care';
import { getSpecies } from '@/data/species';
import { simRng } from '@/sim/rng';

const base = (starter: 'betta' | 'ocellaris_clownfish' = 'betta') => newGame({ starterId: starter, starterName: 'Test', seed: 99 });
const firstTank = (s: GameState) => s.tanks[s.tankOrder[0]];

describe('fix-water S01-04 / P1-08: water-change feedback', () => {
  it('a pH shift in a freshwater tank is called a pH shift, never "salinity jumped by 0.000"', () => {
    // planted / CO₂ tanks vs pH 7.2 source water; 6.5 at 50 % and 6.0 at 25 % are the shifts the original misnamed
    // (round-3 R10-04: 6.3 at 50 % was named right even before the fix)
    for (const [pH, frac] of [[6.5, 0.5], [6.0, 0.25]] as const) {
      const s = base();
      const t = firstTank(s);
      t.water.pH = pH;
      const r = waterChange(s, t.id, frac);
      expect(r.ok).toBe(true);
      expect(t.water.shock?.reason, `pH ${pH} ${frac}`).toMatch(/^pH jumped by 0\.[2-5]$/);
      expect(r.message).not.toMatch(/salinity/);
      expect(s.log.some((e) => /salinity jumped/.test(e.text))).toBe(false);
    }
  });

  it('a temperature shift between 1.4 and 2 °C is named as such', () => {
    const s = base();
    const t = firstTank(s);
    t.water.tempC = 26;
    waterChange(s, t.id, 0.5, { newWaterTempC: 22.5 }); // 1.75 °C shift
    expect(t.water.shock?.reason).toMatch(/temperature by 1\.[6-9] °C/);
  });

  it('nitrate that rounds to the same whole number is shown with a decimal', () => {
    const s = base();
    const t = firstTank(s);
    t.water.nitrate = 5.4;
    t.water.ammonia = 0;
    const r = waterChange(s, t.id, 0.1);
    expect(r.message).toMatch(/Nitrate 5\.4 → \d\.\d ppm/);
    expect(r.message).not.toMatch(/5 → 5 ppm/);
    t.water.nitrate = 30;
    expect(waterChange(s, t.id, 0.5).message).toMatch(/Nitrate 30 → 1\d ppm/);
  });
});

describe('fix-water S01-09: top-off does not drain KH from salt tanks', () => {
  it('KH is unchanged by a manual top-off (evaporation never concentrated it)', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    t.water.level = 0.94;
    t.water.kh = 8.5;
    const sg = t.water.salinitySG;
    expect(topOff(s, t.id).ok).toBe(true);
    expect(t.water.kh).toBeCloseTo(8.5, 6);
    expect(t.water.salinitySG).toBeLessThan(sg);
    expect(t.water.level).toBe(1);
  });
});

describe('fix-water S01-08 / S01-12: report headlines', () => {
  it('a high KH is not headlined "KH buffer is low"', () => {
    const s = base();
    const t = firstTank(s);
    t.water.kh = 14;
    const r = getWaterReport(s, t.id);
    const issue = r.issues.find((i) => i.param === 'kh')!;
    expect(issue.text).toMatch(/higher than your animals prefer/);
    expect(r.headline).not.toMatch(/buffer is low/);
    expect(r.headline).toBe('KH is higher than ideal');
    t.water.kh = 1.2;
    expect(getWaterReport(s, t.id).headline).toBe('KH buffer is low');
  });

  it('a nearly fully stocked tank does not read like a water-level message', () => {
    const s = base();
    s.isShowcase = true;
    const t = createTank(s, 'g10', 'freshwater_tropical', { cycled: true, placement: { x: 0, z: 0, rotY: 0 } });
    const rng = simRng(s);
    for (let i = 0; i < 9; i++) addCreature(s, createCreature(s, rng, 'neon_tetra', { ageDays: 60 }), t.id);
    const r = getWaterReport(s, t.id);
    const st = r.params.find((p) => p.key === 'stocking')!;
    expect(st.status).toBe('watch');
    expect(r.issues.map((i) => i.text).join(' ')).not.toMatch(/nearly full/);
    // with temperature and pH in range the stocking line is the only issue, so it is the headline
    t.water.tempC = 24;
    t.water.pH = 6.6;
    const headline = getWaterReport(s, t.id).headline;
    expect(headline).not.toMatch(/nearly full/);
    expect(headline).toBe('Stocking is near the limit');
  });
});

describe('fix-water S01-10: salt advice points at a route the player has', () => {
  it('mollies in fresh water are told about a brackish tank, and dosing salt says the same', () => {
    const s = base();
    s.isShowcase = true;
    s.finance.money = 100;
    const t = createTank(s, 'g29', 'freshwater_tropical', { cycled: true, placement: { x: 0, z: 0, rotY: 0 } });
    const rng = simRng(s);
    for (let i = 0; i < 3; i++) addCreature(s, createCreature(s, rng, 'sailfin_molly', { ageDays: 90 }), t.id);
    const c = speciesWaterComfort(getSpecies('sailfin_molly'), t);
    expect(c.stressors.join(' ')).toMatch(/brackish tank .*Brackish Estuaries/);
    const r = dose(s, t.id, 'salt');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Sailfin mollies would rather have a brackish tank/);
  });
});
