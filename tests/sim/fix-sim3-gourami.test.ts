/**
 * Round-3 lane SIM (R02-01) — the betta's lethal harassment is betta-specific. Honey gouramis ('courtship_ok') live
 * happily as a pair; only a spent female left beside a male guarding his nest is chased (and warned about).
 */
import { describe, it, expect, vi } from 'vitest';
import type { GameState } from '@/types';
import { newGame, previewStarters } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { advanceWorld } from '@/sim/world';
import { feedTank } from '@/sim/care';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { tuneTankForSpecies } from '@/sim/water/kits';
import { getSpecies } from '@/data/species';
import { devForceBreeding } from '@/sim/life/breeding/actions';
import { noteBreedingFood } from '@/sim/life/breeding';

vi.setConfig({ testTimeout: 240_000 });

function gouramiPair(seed: number) {
  const pv = previewStarters(seed).betta;
  const g = newGame({ starterId: 'betta', starterName: pv.name, seed, starterCreature: pv });
  g.finance.money = 1e6;
  const t = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Community' });
  tuneTankForSpecies(t, getSpecies('honey_gourami'), true);
  t.water.tempC = 26;
  const rng = simRng(g);
  const m = addCreature(g, createCreature(g, rng, 'honey_gourami', { sex: 'male', ageDays: 90 }), t.id);
  const f = addCreature(g, createCreature(g, rng, 'honey_gourami', { sex: 'female', ageDays: 90 }), t.id);
  return { g, t, m, f };
}

function tend(g: GameState, hours: number, each?: (h: number) => void): void {
  for (let h = 0; h < hours; h++) {
    for (const t of Object.values(g.tanks)) {
      t.water.ammonia = 0;
      t.water.nitrite = 0;
    }
    if (h % 12 === 0) {
      g.inventory.foods['flake_tropical'] = 50;
      for (const id of g.tankOrder) feedTank(g, id, 'flake_tropical', {});
    }
    each?.(h);
    advanceWorld(g, 1, { forceFull: true });
  }
}

describe('R02-01 — honey gourami pairs are not harassed to death', () => {
  it('a male + female pair in a tended tank lives 14 days unharmed', () => {
    for (const seed of [11, 22]) {
      const { g, f } = gouramiPair(seed);
      let maxH = 0;
      tend(g, 24 * 14, () => {
        maxH = Math.max(maxH, f.repro.harassment ?? 0);
      });
      expect(f.status).toBe('alive');
      expect(maxH).toBeLessThan(0.15);
      expect(g.log.some((e) => e.creatureId === f.id && /chasing|attacking|injured/i.test(e.text))).toBe(false);
    }
  });

  it('a spent female left with the guarding male is still chased and warned about', () => {
    const { g, t, m, f } = gouramiPair(11);
    devForceBreeding(g, m.id);
    tend(g, 24, () => noteBreedingFood(g, t.id, ['bloodworm']));
    expect(m.repro.stage).toBe('guarding');
    expect(f.repro.stage).toBe('spent');
    expect(f.repro.harassment ?? 0).toBeGreaterThan(0.15);
    expect(g.log.some((e) => e.creatureId === f.id && e.kind === 'warning' && /after spawning/.test(e.text))).toBe(true);
  });
});
