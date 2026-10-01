/**
 * Fix lane LIFE — bounded colony breeding (P5-10): a cherry shrimp colony stops berrying at the tank's colony ceiling
 * (≈6 per gallon, at most 80) and never has more than a handful of berried females at once, so a staffed late-game
 * facility cannot balloon into hundreds of shrimp and clutches.
 */
import { describe, it, expect, vi } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { getSpecies } from '@/data/species';
import { breedingCheck } from '@/sim/life/breeding';
import { shrimpColonyCap } from '@/sim/life/breeding/systems/shrimp';

vi.setConfig({ testTimeout: 240_000 });

function colony(seed: number, n: number) {
  const g: GameState = newGame({ starterId: 'betta', starterName: 'Solo', seed });
  const tank = createTank(g, 'g10', 'freshwater_planted', { cycled: true, name: 'Shrimp Tank' });
  tank.water.bioMaturity = 0.8;
  const rng = simRng(g);
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push(addCreature(g, createCreature(g, rng, 'cherry_shrimp', { sex: i % 3 === 0 ? 'male' : 'female', ageDays: 12 }), tank.id).id);
  return { g, tank, ids };
}

function tendDays(g: GameState, days: number): void {
  for (let d = 0; d < days * 24; d++) {
    for (const c of Object.values(g.creatures)) {
      if (c.status !== 'alive') continue;
      c.stats.hunger = Math.min(c.stats.hunger, 15);
      c.stats.health = Math.max(c.stats.health, 90);
      c.stats.stress = Math.min(c.stats.stress, 20);
    }
    for (const t of Object.values(g.tanks)) {
      t.water.ammonia = 0;
      t.water.nitrite = 0;
      t.water.nitrate = Math.min(t.water.nitrate, 10);
      t.water.tempC = 23;
      for (const eq of t.equipment) eq.failed = false;
    }
    advanceWorld(g, 1, { forceFull: true });
  }
}

const shrimpIn = (g: GameState, tankId: string) => Object.values(g.creatures).filter((c) => c.status === 'alive' && c.tankId === tankId && c.speciesId === 'cherry_shrimp');

describe('P5-10 — shrimp colony ceiling', () => {
  it('a pampered 10-gallon colony stays near the ceiling over 60 days, with at most 6 berried females at once', () => {
    const { g, tank } = colony(31, 12);
    const cap = shrimpColonyCap(tank);
    expect(cap).toBe(60);
    const sp = getSpecies('cherry_shrimp');
    let maxBerried = 0;
    for (let w = 0; w < 12; w++) {
      tendDays(g, 5);
      maxBerried = Math.max(maxBerried, shrimpIn(g, tank.id).filter((c) => c.repro.stage === 'berried').length);
    }
    const n = shrimpIn(g, tank.id).length;
    expect(n).toBeGreaterThan(12); // they do breed
    expect(n).toBeLessThanOrEqual(cap + 6 * sp.breeding.maxRaisedPerClutch);
    expect(maxBerried).toBeLessThanOrEqual(6);
  });

  it('breedingCheck explains a full colony', () => {
    const { g, tank, ids } = colony(32, 60);
    const check = breedingCheck(g, ids[0], ids[1]);
    expect(check.reasons.join(' ')).toMatch(/as large as Shrimp Tank can support/);
  });
});
