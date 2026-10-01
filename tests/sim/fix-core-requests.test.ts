// @vitest-environment node
/**
 * lane:fix-core2 — cross-lane requests against the core files:
 *   X-1 (S05-10)  a background tank's decor grows in the same world-time window as its water step
 *   X-2           the offline grace cap also holds conditioner-bound ammonia/nitrite, so an expiring dose cannot
 *                 release more than the cap after (or during) a catch-up
 *   X-3 (S02-12b) fast-forward drops to 1× when an animal starts starving — once per animal per starvation episode
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import { stepTank } from '@/sim/world';
import { ensureLab } from '@/sim/water/food';
import { simulateOffline, GRACE_MAX_TOXIN_PPM } from '@/persistence';
import { communityFw } from '@/dev/fixtures/core-fixtures';
import { runTick } from '@/game/GameLoop';
import { resetFastMutate } from '@/game/fastMutate';
import { resetStarvationGuard, STARVING_HUNGER } from '@/game/starvationGuard';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import type { GameSpeed, GameState, Tank } from '@/types';

function plantedTank(): { g: GameState; tank: Tank } {
  const g = newGame({ starterId: 'betta', starterName: 'Test', seed: 1234 });
  g.isShowcase = false;
  const tank = g.tanks[g.tankOrder[0]];
  tank.lighting.onHour = 8;
  tank.lighting.offHour = 20;
  for (const d of tank.decor) if (d.growth !== undefined) d.growth = 0.3;
  tank.water.foodInWater = 0;
  return { g, tank };
}
const totalGrowth = (t: Tank) => t.decor.reduce((s, d) => s + (d.growth ?? 0), 0);

describe('X-1: background decor growth uses the piece’s own day/night window', () => {
  it('a 4 h catch-up piece that ends at 14:00 grows (lit window), one ending at 04:00 does not', () => {
    const lit = plantedTank();
    expect(lit.tank.decor.some((d) => d.growth !== undefined)).toBe(true);
    const g0 = totalGrowth(lit.tank);
    lit.g.clock.hour = 48 + 4; // clock at 04:00; the debt runs [10:00, 14:00) of the same day
    stepTank(lit.g, lit.tank, 4, 'summary', 48 + 14);
    expect(totalGrowth(lit.tank)).toBeGreaterThan(g0);

    const dark = plantedTank();
    const d0 = totalGrowth(dark.tank);
    dark.g.clock.hour = 48 + 14; // clock at 14:00 (lit), but the debt covers [00:00, 04:00)
    stepTank(dark.g, dark.tank, 4, 'summary', 48 + 4);
    expect(totalGrowth(dark.tank)).toBeLessThanOrEqual(d0 + 1e-9);
  });
});

describe('X-2: the grace cap holds conditioner-bound toxins too', () => {
  it('a conditioner dose running through a long catch-up does not bank more than the cap', () => {
    const g = communityFw();
    g.isShowcase = false;
    const t = g.tanks[g.tankOrder[0]];
    // an uncycled tank without a filter: ammonia keeps coming; the dose outlasts the whole 12 h catch-up
    const lab = ensureLab(t);
    t.water.bioMaturity = 0;
    t.equipment = t.equipment.filter((e) => !/filter/.test(e.defId));
    for (const c of Object.values(g.creatures)) if (c.status === 'alive') c.stats.hunger = 10;
    Object.assign(t.water, { ammonia: 0.1, nitrite: 0.1 });
    lab.detoxUntilHour = g.clock.hour + 200;
    lab.boundAmmonia = 0.2;
    lab.boundNitrite = 0.2;
    for (let i = 0; i < 3; i++) simulateOffline(g, 12 * 3600_000); // three long absences in a row
    const after = ensureLab(t);
    expect(t.water.ammonia + (after.boundAmmonia ?? 0)).toBeLessThanOrEqual(GRACE_MAX_TOXIN_PPM + 1e-9);
    expect(t.water.nitrite + (after.boundNitrite ?? 0)).toBeLessThanOrEqual(GRACE_MAX_TOXIN_PPM + 1e-9);
  });

  it('a save that already held more bound toxin than the cap keeps it (no free healing), but never gains', () => {
    const g = communityFw();
    g.isShowcase = false;
    const t = g.tanks[g.tankOrder[0]];
    const lab = ensureLab(t);
    t.water.bioMaturity = 0;
    t.equipment = t.equipment.filter((e) => !/filter/.test(e.defId));
    lab.detoxUntilHour = g.clock.hour + 200;
    Object.assign(t.water, { ammonia: 0.3, nitrite: 0.3 });
    lab.boundAmmonia = 1.2;
    lab.boundNitrite = 0.9;
    simulateOffline(g, 12 * 3600_000);
    const after = ensureLab(t);
    expect(t.water.ammonia + (after.boundAmmonia ?? 0)).toBeLessThanOrEqual(1.5 + 1e-9);
    expect(t.water.nitrite + (after.boundNitrite ?? 0)).toBeLessThanOrEqual(1.2 + 1e-9);
  });
});

describe('X-3: fast-forward slows to 1× when an animal starts starving', () => {
  beforeEach(() => {
    resetFastMutate();
    resetStarvationGuard();
    useGame.getState().setGame(null);
    useUI.setState({ screen: 'game', view: 'facility', focusedTankId: null, toasts: [] });
  });
  const start = (speed: GameSpeed) => {
    const g = communityFw();
    g.isShowcase = false;
    g.clock.speed = speed;
    useGame.getState().setGame(g);
    useUI.setState({ screen: 'game', toasts: [] });
    return Object.values(g.creatures).find((c) => c.status === 'alive')!.id;
  };
  const edit = (id: string, hunger: number, health: number) =>
    useGame.getState().mutate((d) => {
      d.creatures[id].stats.hunger = hunger;
      d.creatures[id].stats.health = health;
    });
  const speed = () => useGame.getState().game!.clock.speed;

  it('drops 10× to 1× once per episode, with a toast naming the animal', () => {
    const id = start(10);
    runTick(0.25);
    expect(speed()).toBe(10);
    edit(id, 99, 60);
    runTick(0.25);
    expect(speed()).toBe(1);
    const name = useGame.getState().game!.creatures[id].name;
    expect(useUI.getState().toasts.some((t) => t.text.includes('Slowed to 1×') && t.text.includes(name))).toBe(true);
    // the player speeds up again on purpose: the same episode does not fight them
    useGame.getState().mutate((d) => void (d.clock.speed = 10));
    runTick(0.25);
    expect(speed()).toBe(10);
    // fed (episode over), then starving again: a new episode slows the clock again
    edit(id, 20, 60);
    runTick(0.25);
    expect(speed()).toBe(10);
    edit(id, STARVING_HUNGER + 1, 60);
    runTick(0.25);
    expect(speed()).toBe(1);
  });

  it('an episode that began at 1× does not slow a later fast-forward; 3× counts as fast', () => {
    const id = start(1);
    edit(id, 99, 60);
    runTick(0.25);
    useGame.getState().mutate((d) => void (d.clock.speed = 10));
    runTick(0.25);
    expect(speed()).toBe(10);

    resetFastMutate();
    const id3 = start(3);
    edit(id3, 99, 60);
    runTick(0.25);
    expect(speed()).toBe(1);
  });

  it('hungry but still in condition, or the title-screen showcase, never slows the clock', () => {
    const id = start(10);
    edit(id, 99, 95);
    runTick(0.25);
    expect(speed()).toBe(10);
    useGame.getState().mutate((d) => {
      d.isShowcase = true;
      d.creatures[id].stats.health = 40;
    });
    runTick(0.25);
    expect(speed()).toBe(10);
  });
});
