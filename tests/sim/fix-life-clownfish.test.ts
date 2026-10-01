/**
 * Fix lane LIFE — clownfish hierarchy regressions: a guarding male whose female leaves is released once the clutch
 * is gone and can become the group's next female (S02-01); a manual move clears stale guard duty.
 */
import { describe, it, expect, vi } from 'vitest';
import type { GameState } from '@/types';
import { newGame, previewStarters } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { devForceBreeding, separateCreature } from '@/sim/life/breeding/actions';

vi.setConfig({ testTimeout: 240_000 });

function pamper(g: GameState): void {
  for (const c of Object.values(g.creatures)) {
    if (c.status !== 'alive') continue;
    c.stats.hunger = Math.min(c.stats.hunger, 15);
    c.stats.health = Math.max(c.stats.health, 90);
    c.stats.stress = Math.min(c.stats.stress, 20);
  }
  for (const t of Object.values(g.tanks)) {
    t.water.ammonia = 0;
    t.water.nitrite = 0;
    for (const eq of t.equipment) eq.failed = false;
  }
}

function runHours(g: GameState, hours: number): void {
  for (let h = 0; h < hours; h++) {
    pamper(g);
    advanceWorld(g, 1, { forceFull: true });
  }
}

/** Bonded pair spawns; the female is sold while the male guards the eggs. Returns the guardian. */
function widowedGuardian(seed: number): { g: GameState; guardId: string; tankId: string } {
  const preview = previewStarters(seed).ocellaris_clownfish;
  const g = newGame({ starterId: 'ocellaris_clownfish', starterName: preview.name, seed, starterCreature: preview });
  const tankId = g.tankOrder[0];
  const starter = Object.values(g.creatures).find((c) => c.isStarter)!;
  addCreature(g, createCreature(g, simRng(g), 'ocellaris_clownfish', { ageDays: 30 }), tankId);
  devForceBreeding(g, starter.id);
  for (let h = 0; h < 72 && !Object.values(g.clutches).length; h++) runHours(g, 1);
  const cl = Object.values(g.clutches)[0];
  expect(cl).toBeDefined();
  const fem = Object.values(g.creatures).find((c) => c.status === 'alive' && c.reproRole === 'female')!;
  const guard = g.creatures[cl.guardedById!];
  expect(guard.repro.stage).toBe('guarding');
  fem.status = 'sold';
  fem.tankId = null;
  return { g, guardId: guard.id, tankId };
}

describe('S02-01 — guarding clownfish male whose female left', () => {
  it('is released after the clutch is gone and becomes the female for a new, smaller tank mate', () => {
    const { g, guardId, tankId } = widowedGuardian(777);
    runHours(g, 24 * 6);
    const guard = g.creatures[guardId];
    expect(guard.repro.stage).not.toBe('guarding');
    expect(guard.repro.clutchId).toBeUndefined();

    const young = addCreature(g, createCreature(g, simRng(g), 'ocellaris_clownfish', { ageDays: 14 }), tankId);
    young.genome.potentials.size = 30;
    young.sizeCm = Math.min(young.sizeCm, 7.5);
    runHours(g, 24 * 14);
    const roles = Object.values(g.creatures)
      .filter((c) => c.status === 'alive' && c.speciesId === 'ocellaris_clownfish')
      .map((c) => c.reproRole);
    expect(roles).toContain('female');
    expect(g.creatures[guardId].reproRole).toBe('female');
  });

  it('a manual move clears stale guard duty even when the clutch record is already gone', () => {
    const { g, guardId, tankId } = widowedGuardian(777);
    const guard = g.creatures[guardId];
    // Simulate an old save: the clutch vanished but the male kept the stage.
    for (const id of Object.keys(g.clutches)) delete g.clutches[id];
    guard.repro.clutchId = undefined;
    guard.repro.stage = 'guarding';
    const other = createTank(g, 'g29', 'marine_live_rock', { cycled: true, name: 'Second tank' });
    other.water.tempC = g.tanks[tankId].water.tempC;
    other.water.salinitySG = g.tanks[tankId].water.salinitySG;
    const res = separateCreature(g, guardId, other.id);
    expect(res.ok).toBe(true);
    expect(guard.repro.stage).toBe('resting');
  });
});
