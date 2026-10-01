/**
 * Fix lane LIFE — the betta rule has teeth (S02-08): a spent female left in the male's tank declines and dies of
 * harassment within a few days (after the escalating warnings), while a separated one recovers.
 */
import { describe, it, expect, vi } from 'vitest';
import type { GameState } from '@/types';
import { newGame, previewStarters } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { advanceWorld } from '@/sim/world';
import { feedTank } from '@/sim/care';
import { devForceBreeding, separateCreature } from '@/sim/life/breeding/actions';
import { noteBreedingFood } from '@/sim/life/breeding';

vi.setConfig({ testTimeout: 240_000 });

function spawnedPair(seed: number) {
  const preview = previewStarters(seed).betta;
  const g = newGame({ starterId: 'betta', starterName: preview.name, seed, starterCreature: preview });
  const male = Object.values(g.creatures).find((c) => c.isStarter)!;
  const tankId = male.tankId!;
  devForceBreeding(g, male.id);
  for (let h = 0; h < 16 && !Object.keys(g.clutches).length; h++) {
    water(g);
    noteBreedingFood(g, tankId, ['bloodworm']);
    advanceWorld(g, 1, { forceFull: true });
  }
  const female = g.creatures[male.repro.partnerId!];
  expect(female.repro.stage).toBe('spent');
  return { g, male, female, tankId };
}

function water(s: GameState): void {
  for (const t of Object.values(s.tanks)) {
    t.water.ammonia = 0;
    t.water.nitrite = 0;
    for (const eq of t.equipment) eq.failed = false;
  }
}

function keep(g: GameState, days: number, stop: () => boolean): void {
  for (let h = 0; h < 24 * days && !stop(); h++) {
    water(g);
    if (h % 12 === 0) {
      const foodId = Object.keys(g.inventory.foods).find((k) => (g.inventory.foods[k] ?? 0) > 0);
      if (foodId) for (const id of g.tankOrder) feedTank(g, id, foodId, {});
      else g.inventory.foods['micro_pellets'] = 20;
    }
    advanceWorld(g, 1, { forceFull: true });
  }
}

describe('S02-08 — betta female left with the male', () => {
  it('declines and dies of harassment within ~5 days, after the danger warnings', () => {
    const { g, female } = spawnedPair(5150);
    keep(g, 6, () => female.status !== 'alive');
    expect(female.status).toBe('dead');
    expect(female.deathCause).toBe('harassment by a tank mate');
    const warnings = g.log.filter((e) => e.creatureId === female.id && e.kind === 'danger');
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('recovers once separated', () => {
    const { g, female, tankId } = spawnedPair(5150);
    keep(g, 1, () => false);
    expect(female.status).toBe('alive');
    const rest = createTank(g, 'g10', 'freshwater_tropical', { cycled: true, name: 'Recovery' });
    rest.water.tempC = g.tanks[tankId].water.tempC;
    expect(separateCreature(g, female.id, rest.id).ok).toBe(true);
    keep(g, 5, () => false);
    expect(female.status).toBe('alive');
    expect(female.stats.health).toBeGreaterThan(80);
  });
});
