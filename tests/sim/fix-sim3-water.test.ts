/**
 * Round-3 lane SIM — water report vs. welfare consistency.
 *   R02-03  salt softens nitrite for brackish and marine tanks alike: a GOOD report never hides water harm, and the
 *           tank bar never says "being harmed by the water — water is healthy".
 *   R02-02  "Tank needs a heater" is DANGER only where the temperature row is DANGER (past the tolerance band).
 *   R02-05  re-dosing conditioner during an active dose extends it and quotes no drop the next substep undoes.
 */
import { describe, it, expect } from 'vitest';
import { newGame, previewStarters } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { getWaterReport } from '@/sim/water';
import { refreshTankCache, advanceWorld } from '@/sim/world';
import { dose } from '@/sim/care';
import { speciesWaterView } from '@/sim/life/welfare';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { tuneTankForSpecies } from '@/sim/water/kits';
import { getSpecies } from '@/data/species';
import { ANIMAL_THRESHOLDS } from '@/sim/tankStatus';
import type { WaterClass } from '@/types';

describe('R02-03 — nitrite in salt tanks', () => {
  const cases: [string, WaterClass][] = [
    ['sailfin_molly', 'brackish'],
    ['figure_eight_puffer', 'brackish'],
    ['ocellaris_clownfish', 'marine_fowlr' as WaterClass],
    ['neon_tetra', 'freshwater_tropical'],
  ];
  for (const [spId, wc] of cases) {
    it(`${spId}: a GOOD report means no water harm, at any nitrite`, () => {
      const pv = previewStarters(3).betta;
      const g = newGame({ starterId: 'betta', starterName: pv.name, seed: 3, starterCreature: pv });
      g.finance.money = 1e6;
      const sp = getSpecies(spId);
      const cls = (sp.waterClasses?.includes(wc) ? wc : sp.waterClasses?.[0] ?? wc) as WaterClass;
      const t = createTank(g, 'g29', cls, { cycled: true, name: 'T' });
      tuneTankForSpecies(t, sp, true);
      addCreature(g, createCreature(g, simRng(g), spId, { ageDays: 90 }), t.id);
      for (let no2 = 0; no2 <= 2.0001; no2 += 0.1) {
        t.water.nitrite = no2;
        t.water.ammonia = 0;
        refreshTankCache(g, t);
        const rep = getWaterReport(g, t.id);
        const harm = speciesWaterView(sp, t).harm;
        if (rep.status === 'good') expect(harm, `${cls} NO2 ${no2.toFixed(1)}`).toBeLessThanOrEqual(ANIMAL_THRESHOLDS.waterHarmHp);
        expect(t.cache.statusReason ?? '').not.toMatch(/harmed by the water — water is healthy/i);
      }
    });
  }
});

describe('R02-02 — the no-heater line agrees with the temperature row', () => {
  it('a betta at room temperature is WATCH; well below its tolerated minimum it is DANGER', () => {
    const pv = previewStarters(3).betta;
    const g = newGame({ starterId: 'betta', starterName: pv.name, seed: 3, starterCreature: pv });
    const t = g.tanks[g.tankOrder[0]];
    t.equipment = t.equipment.filter((e) => !e.defId.includes('heater'));
    for (const [temp, want] of [[21.5, 'watch'], [20.4, 'watch'], [19.5, 'danger']] as const) {
      t.water.tempC = temp;
      refreshTankCache(g, t);
      const rep = getWaterReport(g, t.id);
      const heater = rep.issues.find((i) => /There is no heater/.test(i.text));
      const row = rep.params.find((p) => p.key === 'temp');
      expect(heater?.status, `${temp} °C`).toBe(want);
      expect(row?.status, `${temp} °C`).toBe(want);
    }
  });
});

describe('R02-05 — conditioner top-up', () => {
  it('extends the active dose; what the test kit shows does not bounce back', () => {
    const pv = previewStarters(3).betta;
    const g = newGame({ starterId: 'betta', starterName: pv.name, seed: 3, starterCreature: pv });
    g.finance.money = 1e5;
    const t = g.tanks[g.tankOrder[0]];
    t.water.ammonia = 1;
    expect(dose(g, t.id, 'conditioner').message).toMatch(/1\.00 → 0\.35/);
    advanceWorld(g, 1, { focusTankId: t.id });
    const until = t.water.lab!.detoxUntilHour!;
    const before = t.water.ammonia;
    const r = dose(g, t.id, 'conditioner');
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/topped up/);
    expect(r.message).not.toMatch(/→/);
    expect(t.water.lab!.detoxUntilHour!).toBeGreaterThan(until);
    advanceWorld(g, 0.25, { focusTankId: t.id });
    expect(Math.abs(t.water.ammonia - before)).toBeLessThan(0.02);
  });
});
