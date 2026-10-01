/**
 * Fix lane WATER — S01-02 (autofeeder portion follows tank demand, not a flat 3 servings) and S01-03 (autofed food
 * is dropped at the end of the water step, so background LOD pieces don't rot it before the animals eat).
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { stepTank, advanceWorld } from '@/sim/world';
import { createCreature, addCreature } from '@/sim/life';
import { starterAquascape } from '@/sim/aquascape';
import { installEquipment, setEquipment } from '@/sim/care';
import { recommendedServings } from '@/sim/water';
import { getFoodDef } from '@/data/catalog/foods';
import { simRng } from '@/sim/rng';
import type { SimLod } from '@/sim/context';

function build(speciesId: string, n: number, tier = 'g10', perDay?: number): { s: GameState; id: string } {
  const s: GameState = newGame({ starterId: 'betta', starterName: 'T', seed: 5 });
  for (const id of Object.keys(s.creatures)) delete s.creatures[id];
  for (const id of [...s.tankOrder]) delete s.tanks[id];
  s.tankOrder = [];
  s.isShowcase = true;
  s.inventory.foods = { flake_tropical: 2000 };
  const tank = createTank(s, tier, 'freshwater_tropical', { cycled: true, placement: { x: 0, z: 0, rotY: 0 } });
  tank.decor = starterAquascape(s, 'generic', tank);
  installEquipment(s, tank.id, 'autofeeder', { purchased: true });
  if (perDay !== undefined) {
    const af = tank.equipment.find((e) => e.defId === 'autofeeder')!;
    setEquipment(s, tank.id, af.id, { setting: perDay });
  }
  const rng = simRng(s);
  for (let i = 0; i < n; i++) addCreature(s, createCreature(s, rng, speciesId, { ageDays: 40 }), tank.id);
  return { s, id: tank.id };
}
const aliveIn = (s: GameState, id: string) => Object.values(s.creatures).filter((c) => c.tankId === id && c.status === 'alive');

describe('fix-water S01-02: autofeeder portions follow the tank', () => {
  it('a school of six neons on the default 2x/day schedule is fed, not starved', () => {
    const { s, id } = build('neon_tetra', 6, 'g10', 2);
    const t = s.tanks[id];
    const manual = recommendedServings(s, t, getFoodDef('flake_tropical')!, undefined, 55);
    expect(manual).toBeGreaterThan(3);
    const flakes0 = s.inventory.foods.flake_tropical;
    advanceWorld(s, 24 * 4, { forceFull: true });
    const used = (flakes0 - s.inventory.foods.flake_tropical) / 4;
    expect(used).toBeGreaterThan(6); // it used to be capped at 3 servings × 2 feeds
    const alive = aliveIn(s, id);
    expect(alive.length).toBe(6);
    const avgHunger = alive.reduce((a, c) => a + c.stats.hunger, 0) / alive.length;
    expect(avgHunger).toBeLessThan(70);
    expect(Math.min(...alive.map((c) => c.stats.health))).toBeGreaterThan(90);
    expect(t.cache.statusReason ?? '').not.toMatch(/starving/);
  });
});

describe('fix-water S01-03: autofed food is eaten fresh at every LOD', () => {
  it('summary-LOD (4 h) pieces feed the tank about as well as the focused tank', () => {
    const hungerAt: Record<string, number> = {};
    const nh3At: Record<string, number> = {};
    for (const [lod, piece] of [
      ['full', 0.25],
      ['summary', 4],
    ] as [SimLod, number][]) {
      const { s, id } = build('fancy_guppy', 2);
      const t = s.tanks[id];
      let hungerSum = 0;
      let samples = 0;
      let maxNH3 = 0;
      for (let h = 0; h < 24 * 5; h += piece) {
        s.clock.hour += piece;
        stepTank(s, t, piece, lod);
        if (h >= 24) {
          const alive = aliveIn(s, id);
          hungerSum += alive.reduce((a, c) => a + c.stats.hunger, 0) / Math.max(1, alive.length);
          samples++;
        }
        maxNH3 = Math.max(maxNH3, t.water.ammonia);
      }
      hungerAt[lod] = hungerSum / samples;
      nh3At[lod] = maxNH3;
      expect(Math.min(...aliveIn(s, id).map((c) => c.stats.health))).toBeGreaterThan(90);
    }
    // Before the fix: full 27 vs summary 94 average hunger, and four times the ammonia from rotting flakes.
    expect(hungerAt.summary).toBeLessThan(hungerAt.full + 15);
    expect(nh3At.summary).toBeLessThan(nh3At.full * 1.5 + 0.02);
  });
});
