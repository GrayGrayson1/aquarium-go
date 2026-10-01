/**
 * Fix lane WATER — S16-02: a heater failure is a problem to fix, not a death sentence. The betta's tolerated floor is
 * 21 °C (room temperature is 22 ± 0.8), and up to TEMP_TOLERANCE_C past any species' limit is stress (WATCH), with
 * harm ramping from zero beyond it instead of a step.
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { getWaterReport, speciesWaterComfort } from '@/sim/water';
import { TEMP_TOLERANCE_C } from '@/sim/water/constants';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getSpecies } from '@/data/species';

describe('fix-water S16-02: temperature tolerance band', () => {
  it('the starter betta survives a week at room temperature after its heater fails', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Test', seed: 12345 });
    s.isShowcase = true;
    const t = s.tanks[s.tankOrder[0]];
    const heater = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'heater')!;
    heater.failed = true;
    heater.failMode = 'off';
    const betta = Object.values(s.creatures).find((c) => c.speciesId === 'betta')!;
    for (let day = 0; day < 7; day++) {
      // keep it fed so only the temperature is under test
      betta.stats.hunger = 20;
      advanceWorld(s, 24, { forceFull: true });
    }
    expect(t.water.tempC).toBeLessThan(23.5);
    expect(betta.status).toBe('alive');
    expect(betta.stats.health).toBeGreaterThan(85);
    const temp = getWaterReport(s, t.id).params.find((p) => p.key === 'temp')!;
    expect(temp.status).toBe('watch'); // cooler than ideal, tolerated
  });

  it('inside the band is stress only (WATCH); beyond it harm ramps up from zero', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Test', seed: 1 });
    const t = s.tanks[s.tankOrder[0]];
    const sp = getSpecies('honey_gourami'); // floor 22 °C
    t.water.tempC = sp.tempC.min - TEMP_TOLERANCE_C * 0.5;
    const inside = speciesWaterComfort(sp, t);
    expect(inside.harm).toBe(0);
    expect(inside.comfort).toBeLessThan(60);
    t.water.tempC = sp.tempC.min - TEMP_TOLERANCE_C - 0.2;
    const justPast = speciesWaterComfort(sp, t).harm;
    expect(justPast).toBeGreaterThan(0);
    expect(justPast).toBeLessThan(0.1);
    t.water.tempC = sp.tempC.min - TEMP_TOLERANCE_C - 2;
    expect(speciesWaterComfort(sp, t).harm).toBeGreaterThan(justPast * 5);

    // the report's band matches: the betta tank at 20.5 °C is WATCH (floor 21), at 19.5 °C DANGER
    t.water.tempC = 20.5;
    expect(getWaterReport(s, t.id).params.find((p) => p.key === 'temp')!.status).toBe('watch');
    t.water.tempC = 19.5;
    expect(getWaterReport(s, t.id).params.find((p) => p.key === 'temp')!.status).toBe('danger');
  });
});
