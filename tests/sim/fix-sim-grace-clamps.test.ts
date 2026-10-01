/**
 * lane:fix3-sim (R03-04 root fix) — the lifecycle step's offline-grace clamps hold an animal where it is; they never
 * improve it. Hunger may not rise past max(GRACE_MAX_HUNGER, its pre-metabolism value) and health may not fall below
 * min(GRACE_HEALTH_FLOOR, its value before this sub-step's damage). Real feeding and recovery still count.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank, Creature } from '@/types';
import { newGame } from '@/sim/newGame';
import { makeContext } from '@/sim/context';
import { stepTankCreatures, killCreature } from '@/sim/life';
import { GRACE_HEALTH_FLOOR, GRACE_MAX_HUNGER } from '@/sim/life/step';

function setup(seed = 3): { s: GameState; tank: Tank; c: Creature } {
  const s = newGame({ starterId: 'betta', starterName: 'Pip', seed });
  const tank = s.tanks[s.tankOrder[0]];
  const c = Object.values(s.creatures)[0];
  c.isStarter = false; // no early-game starter cap in the way
  Object.assign(tank.water, { ammonia: 0, nitrite: 0, nitrate: 5, oxygen: 0.95, foodInWater: 0, foodByTag: {} });
  s.offlineGrace = true;
  return { s, tank, c };
}

function run(s: GameState, tank: Tank, hours: number): void {
  for (let t = 0; t < hours; t++) {
    tank.water.foodInWater = 0;
    tank.water.foodByTag = {};
    stepTankCreatures(s, tank, 1, makeContext(s, 1));
    s.clock.hour += 1;
  }
}

describe('offline grace clamps never improve an animal for free', () => {
  it('a starving, critically ill animal is held where it was, not fed to 60 and healed to 20', () => {
    const { s, tank, c } = setup();
    Object.assign(c.stats, { hunger: 97, health: 4 });
    run(s, tank, 6);
    expect(c.status).toBe('alive');
    expect(c.stats.hunger).toBeGreaterThan(GRACE_MAX_HUNGER);
    expect(c.stats.hunger).toBeLessThanOrEqual(97 + 1e-9);
    expect(c.stats.health).toBeLessThan(GRACE_HEALTH_FLOOR);
    expect(c.stats.health).toBeGreaterThanOrEqual(4 - 1e-9);
  });

  it('a healthy animal still gets the usual limits (hunger capped at 60, health floored at 20)', () => {
    const { s, tank, c } = setup(4);
    Object.assign(c.stats, { hunger: 40, health: 100 });
    run(s, tank, 24 * 6);
    expect(c.status).toBe('alive');
    expect(c.stats.hunger).toBeLessThanOrEqual(GRACE_MAX_HUNGER + 1e-9);
    expect(c.stats.health).toBeGreaterThanOrEqual(GRACE_HEALTH_FLOOR - 1e-9);
  });

  it('real feeding during grace still lowers a pinned animal’s hunger', () => {
    const { s, tank, c } = setup(5);
    Object.assign(c.stats, { hunger: 90, health: 60 });
    tank.water.foodInWater = 200;
    tank.water.foodByTag = { bloodworm: 200 };
    stepTankCreatures(s, tank, 1, makeContext(s, 1));
    expect(c.stats.hunger).toBeLessThan(GRACE_MAX_HUNGER);
  });

  it('a lethal blow during grace leaves the animal where it was, not at the floor', () => {
    const { s, c } = setup(6);
    c.stats.health = -3; // a 7-point nip on an animal at 4
    const died = killCreature(s, c, { kind: 'injury', cause: 'test', text: 'test' }, s.clock.hour, () => {}, Math.min(GRACE_HEALTH_FLOOR, 4));
    expect(died).toBe(false);
    expect(c.status).toBe('alive');
    expect(c.stats.health).toBe(4);
  });
});
