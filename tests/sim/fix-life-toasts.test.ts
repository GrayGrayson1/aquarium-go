/**
 * Fix lane LIFE — what the sim toasts: a brood's sex reveals merge into one toast (S02-11); starving / water danger
 * toasts are merged per tank and throttled by clock speed while the log stays complete (P7-08); the starter's
 * "very hungry" cue reaches the screen (S02-12).
 */
import { describe, it, expect, vi } from 'vitest';
import type { GameSpeed, GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { getSpecies } from '@/data/species';

vi.setConfig({ testTimeout: 240_000 });

describe('S02-11 — sex reveals of a brood', () => {
  it('30 guppy siblings revealing together produce one toast (and 30 log lines)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'X', seed: 5 });
    const sp = getSpecies('fancy_guppy');
    const t = createTank(g, 'g29', sp.waterClasses[0], { name: 'Nursery' });
    t.purpose = 'nursery';
    const rng = simRng(g);
    for (let i = 0; i < 30; i++) addCreature(g, createCreature(g, rng, 'fancy_guppy', { ageDays: sp.lifecycle.sexVisibleAtDays - 0.5, motherId: 'x', fatherId: 'y' }), t.id);
    const before = g.log.length;
    for (let h = 0; h < 48; h++) {
      for (const c of Object.values(g.creatures)) c.stats.hunger = 10;
      advanceWorld(g, 1, { forceFull: true });
    }
    const evs = g.log.slice(before).filter((e) => e.tankId === t.id && e.kind === 'celebrate');
    const reveals = evs.filter((e) => / is a (male|female)!/.test(e.text));
    expect(reveals).toHaveLength(30);
    expect(reveals.filter((e) => e.toast)).toHaveLength(0);
    const merged = evs.filter((e) => e.toast);
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toMatch(/^30 young fancy guppies are showing their sex — \d+ males? and \d+ females?\.$/);
  });

  it('a single reveal still toasts with its own line', () => {
    const g = newGame({ starterId: 'betta', starterName: 'X', seed: 5 });
    const sp = getSpecies('betta');
    const t = createTank(g, 'g10', sp.waterClasses[0], { name: 'Grow-out' });
    addCreature(g, createCreature(g, simRng(g), 'betta', { ageDays: sp.lifecycle.sexVisibleAtDays - 0.5, motherId: 'x', fatherId: 'y' }), t.id);
    const before = g.log.length;
    for (let h = 0; h < 48; h++) {
      for (const c of Object.values(g.creatures)) c.stats.hunger = 10;
      advanceWorld(g, 1, { forceFull: true });
    }
    const reveals = g.log.slice(before).filter((e) => e.tankId === t.id && / is a (male|female)!/.test(e.text));
    expect(reveals).toHaveLength(1);
    expect(reveals[0].toast).toBe(true);
  });
});

function starvingTank(speed: GameSpeed, hours: number): { g: GameState; tankId: string } {
  const g = newGame({ starterId: 'betta', starterName: 'X', seed: 9 });
  g.clock.speed = speed;
  const t = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Community' });
  const rng = simRng(g);
  for (const id of ['fancy_guppy', 'neon_tetra', 'panda_corydoras']) for (let i = 0; i < 4; i++) addCreature(g, createCreature(g, rng, id, { ageDays: 30 }), t.id);
  for (const c of Object.values(g.creatures)) {
    c.stats.hunger = 96;
    c.stats.health = 80;
  }
  for (let h = 0; h < hours; h++) {
    for (const tank of Object.values(g.tanks)) {
      tank.water.ammonia = 0;
      tank.water.nitrite = 0;
    }
    advanceWorld(g, 1, { forceFull: true });
  }
  return { g, tankId: t.id };
}

describe('P7-08 — starving danger toasts', () => {
  it('at 10× one tank with three starving groups toasts once per 240 h, while the log still gets a line per group per day', () => {
    const { g, tankId } = starvingTank(10, 150);
    const danger = g.log.filter((e) => e.tankId === tankId && e.kind === 'danger' && /starving/.test(e.text));
    expect(danger.length).toBeGreaterThanOrEqual(3 * 4); // 3 groups × a line per day (allowing a slow first day)
    const toasts = danger.filter((e) => e.toast);
    expect(toasts).toHaveLength(1);
    expect(toasts[0].text).toMatch(/^3 groups in Community are starving/);
  });

  it('at 1× the same tank re-toasts every game day', () => {
    const { g, tankId } = starvingTank(1, 150);
    const toasts = g.log.filter((e) => e.tankId === tankId && e.kind === 'danger' && /starving/.test(e.text) && e.toast);
    expect(toasts.length).toBeGreaterThanOrEqual(5);
    expect(toasts.length).toBeLessThanOrEqual(7);
  });
});

describe('S02-12 — the early "very hungry" cue', () => {
  it('toasts for the starter', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 3 });
    const c = Object.values(g.creatures).find((x) => x.isStarter)!;
    c.stats.hunger = 85; // above the tutorial-grace cap, as if the player skipped feeding
    advanceWorld(g, 3, { forceFull: true });
    const hungry = g.log.filter((e) => e.creatureId === c.id && /very hungry/.test(e.text));
    expect(hungry.length).toBeGreaterThanOrEqual(1);
    expect(hungry[0].toast).toBe(true);
  });
});
