/**
 * lane:qa-visual — equipment is tucked into the rear corners for every tank size and water class (never mid-glass),
 * stays inside the glass, and a sump keeps its heaters out of the display.
 */
import { describe, expect, it } from 'vitest';
import type { Tank, WaterClass } from '@/types';
import { TANK_TIERS } from '@/data/catalog/tanks';
import { defaultEquipmentFor } from '@/sim/water';
import { tankDims } from '@/sim/tankSpace';
import { equipmentLayout, equipmentEmitters } from '@/render/decor/emitters';

const CLASSES: WaterClass[] = ['freshwater_cool', 'freshwater_tropical', 'freshwater_planted', 'marine_fowlr', 'marine_live_rock', 'reef'];
/** In-water props that stand on / hang against the back glass (lights, chillers, rim gear and outside boxes excluded). */
const IN_WATER = new Set(['sponge_filter', 'heater_tube', 'airstone', 'powerhead', 'wavemaker', 'co2_kit', 'canister', 'sump']);

function tankFor(tierId: string, wc: WaterClass): Tank {
  return {
    id: `t_${tierId}_${wc}`,
    tierId,
    waterClass: wc,
    substrate: { kind: 'sand', depthCm: 4, color: '#d8ccb0' },
    water: { level: 1 },
    decor: [],
    equipment: defaultEquipmentFor(tierId, wc).map((defId, i) => ({ id: `eq${i}`, defId, installedHour: 0, condition: 1, on: true })),
  } as unknown as Tank;
}

describe('equipment layout (qa-visual)', () => {
  for (const tier of TANK_TIERS) {
    it(`${tier.id}: default kits sit in the rear corners, inside the glass, finite`, () => {
      for (const wc of CLASSES) {
        const t = tankFor(tier.id, wc);
        const d = tankDims(t);
        const layout = equipmentLayout(t);
        for (const p of layout) {
          expect(p.pos.every(Number.isFinite), `${wc} ${p.visual}`).toBe(true);
          if (!IN_WATER.has(p.visual)) continue;
          // corners: the middle 40 % of the back glass stays clear (mid-size tanks allow each corner cluster 0.36 m)
          expect(Math.abs(p.pos[0]), `${tier.id} ${wc} ${p.visual}#${p.n} x=${p.pos[0].toFixed(3)}`).toBeGreaterThan(Math.min(d.L * 0.2, d.L / 2 - 0.36));
          expect(Math.abs(p.pos[0]), `${tier.id} ${wc} ${p.visual}`).toBeLessThan(d.L / 2);
          expect(p.pos[2]).toBeLessThan(0); // against the back half
          // heaters hug the service corner (beside the filter return), not the open back glass
          if (p.visual === 'heater_tube') expect(d.L / 2 - Math.abs(p.pos[0]), `${tier.id} ${wc} heater#${p.n}`).toBeLessThan(0.18);
        }
        // sump systems hide their heaters in the sump
        if (layout.some((p) => p.visual === 'sump')) expect(layout.some((p) => p.visual === 'heater_tube')).toBe(false);
        for (const e of equipmentEmitters(t)) expect([...e.pos, ...(e.dir ?? [])].every(Number.isFinite)).toBe(true);
      }
    });
  }
});
