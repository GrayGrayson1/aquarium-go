/**
 * Round-3 lane SIM (S01-11 / R02-04 / R11-02 / L-2) — a new tank's lights cover the room's open hours (on 07:00, off
 * at closing, kept to 19–22), the lighting advice accepts such a day, and the save repair uses the same default.
 */
import { describe, it, expect } from 'vitest';
import { newGame, previewStarters } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { setLighting } from '@/sim/care';
import { getWaterReport } from '@/sim/water';
import { repairState } from '@/persistence/migrations';
import { clonePlain } from '@/sim/economy/util';
import { defaultLightsOff, lightsOn } from '@/sim/time';

function game() {
  const pv = previewStarters(7).betta;
  const g = newGame({ starterId: 'betta', starterName: pv.name, seed: 7, starterCreature: pv });
  g.finance.money = 1e6;
  return g;
}

describe('default photoperiod follows the open hours', () => {
  it('the starter tank and new tanks stay lit until the room closes', () => {
    const g = game();
    const starter = g.tanks[g.tankOrder[0]];
    expect(starter.lighting.onHour).toBe(7);
    expect(starter.lighting.offHour).toBe(defaultLightsOff(g.facility.closeHour));
    for (let h = g.facility.openHour; h < g.facility.closeHour; h += 0.5) expect(lightsOn(starter.lighting.onHour, starter.lighting.offHour, h)).toBe(true);
    for (const [close, off] of [[19, 19], [20, 20], [21, 21], [22, 22], [24, 22], [1, 22], [17, 19]] as const) {
      g.facility.closeHour = close;
      expect(createTank(g, 'g10', 'freshwater_tropical', { cycled: true }).lighting.offHour, `close ${close}`).toBe(off);
    }
  });

  it('the lighting advice accepts a day that covers the open hours, and flags lights left on after closing', () => {
    const g = game();
    g.facility.closeHour = 22;
    const t = createTank(g, 'g10', 'freshwater_tropical', { cycled: true });
    t.water.algae = 40;
    expect(setLighting(g, t.id, { onHour: 7, offHour: 22 }).message).not.toMatch(/algae/);
    expect(getWaterReport(g, t.id).params.find((p) => p.key === 'light')?.status).toBe('good');
    g.facility.closeHour = 19;
    expect(setLighting(g, t.id, { onHour: 7, offHour: 21 }).message).toMatch(/after the doors close/);
    expect(getWaterReport(g, t.id).params.find((p) => p.key === 'light')?.status).toBe('watch');
    expect(setLighting(g, t.id, { onHour: 6, offHour: 23 }).message).toMatch(/Long photoperiods feed algae/);
  });

  it('a damaged lighting record is repaired to the same default', () => {
    const g = game();
    g.facility.closeHour = 20;
    const save = clonePlain(g) as unknown as Record<string, any>;
    const id = g.tankOrder[0];
    save.tanks[id].lighting = { preset: 'warm', intensity: 1, onHour: 'x', offHour: null, moonlight: true };
    repairState(save);
    expect(save.tanks[id].lighting.onHour).toBe(7);
    expect(save.tanks[id].lighting.offHour).toBe(20);
  });
});
