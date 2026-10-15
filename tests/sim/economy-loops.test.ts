/**
 * lane:market (chunk 4; BACKLOG B-130) — value-creating economy loops, each test landing with its fix:
 *
 * - B-138 (ADR-0029 decision 3): an empty, freshly dressed tank sells for about what its parts cost; the beauty and
 *   ethical-display bonuses need animals, and a beautiful stocked tank keeps its premium.
 * - B-139 (ADR-0029 decision 4): one sale counts once however many animals it has, so a quick sale of 25 shrimp
 *   doesn't unlock tank auctions, earn "Trusted Trader" or pay sale XP 25 times; "animals sold" stays its own counter.
 *   An older save's quest baselines (taken when sales counted animals) are rebased so the quest can still complete.
 *
 * The production line's money paths (it only lists through the market and never creates money) are checked in
 * tests/sim/production-line.test.ts and automation-invariants.test.ts. M24 (B-124) and M62 (B-162) keep their loop
 * tests for when they're fixed.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import { createTank } from '@/sim/tanks';
import { placeDecor } from '@/sim/aquascape';
import { refreshTankCache } from '@/sim/world';
import { buyTank, devOpenMarket, devStepEconomy, quickSell, tankValuation } from '@/sim/economy';
import { counterValue, isUnlocked, stepProgression, tutorialSkip } from '@/sim/facility';
import { makeContext } from '@/sim/context';

function world(seed = 31): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Loop', seed });
  devOpenMarket(g);
  devStepEconomy(g, 0.5);
  g.finance.money = 20000;
  g.isShowcase = false;
  return g;
}

const progressStep = (g: GameState) => stepProgression(g, 0.1, makeContext(g, 0.1));

describe('B-138: an empty dressed tank is worth its parts, not a premium', () => {
  it('buying a kit and decor, then valuing the empty tank, gives back no more than was spent', () => {
    const g = world();
    const before = g.finance.money;
    const r = buyTank(g, 'g20L', 'freshwater_planted', undefined, { seeded: true });
    expect(r.ok).toBe(true);
    const tank = g.tanks[r.tankId!];
    const pieces: [string, number, number][] = [['seiryu_stone', -0.15, 0.05], ['dragon_stone', 0.12, -0.04], ['spider_wood', 0, 0], ['java_fern', -0.2, -0.08], ['anubias_nana', 0.2, 0.08], ['vallisneria', -0.05, -0.1], ['amazon_sword', 0.08, 0.1], ['java_moss', 0.18, -0.1]];
    let placed = 0;
    for (const [id, x, z] of pieces) if (placeDecor(g, tank.id, id, { x, z, rotY: 0, scale: 1 }).ok) placed++;
    expect(placed).toBeGreaterThanOrEqual(5);
    const spent = before - g.finance.money;
    expect(spent).toBeGreaterThan(0);
    tank.water.bioMaturity = 1; // fully cycled: the best case for the seller
    tank.createdHour -= 24 * 20;
    refreshTankCache(g, tank);
    tank.cache.beauty = 95; // a gorgeous layout: before the fix this alone priced it at about 1.5× its parts
    const v = tankValuation(g, tank.id);
    expect(v.modifiers.some((m) => m.label === 'Aquascape beauty')).toBe(false);
    expect(v.modifiers.some((m) => m.label === 'Coherent, ethical display')).toBe(false);
    expect(v.expected).toBeLessThanOrEqual(spent);
  });

  it('a beautiful, healthy stocked tank keeps its beauty and ethical-display premium', () => {
    const g = world(32);
    const t = createTank(g, 'g40B', 'freshwater_planted', { cycled: true, placement: { x: 2, z: 1, rotY: 0 } });
    for (let i = 0; i < 6; i++) addCreature(g, createCreature(g, simRng(g), 'neon_tetra', { ageDays: 40 }), t.id);
    refreshTankCache(g, t);
    Object.assign(t.cache, { beauty: 90, welfare: 95, compatVerdict: 'excellent', status: 'good', waterStatus: 'good', stability: 90 });
    const v = tankValuation(g, t.id);
    expect(v.modifiers.find((m) => m.label === 'Aquascape beauty')!.mult).toBeGreaterThan(1.3);
    expect(v.modifiers.some((m) => m.label === 'Coherent, ethical display')).toBe(true);
  });
});

describe('B-139: a sale counts once, however many animals it has', () => {
  it('a quick sale of 25 shrimp is one sale: no tank auctions, no Trusted Trader, sale XP once', () => {
    const g = world(33);
    tutorialSkip(g);
    // devOpenMarket opens tank auctions too: close them again, so only play (three sales, 150 business XP or a shop) can
    g.progress.unlocked = g.progress.unlocked.filter((k) => k !== 'tank_auctions');
    g.progress.mastery.business = 0;
    const t = createTank(g, 'g20L', 'freshwater_planted', { cycled: true, placement: { x: 2, z: 1, rotY: 0 } });
    const ids: string[] = [];
    for (let i = 0; i < 25; i++) ids.push(addCreature(g, createCreature(g, simRng(g), 'cherry_shrimp', { ageDays: 30 }), t.id).id);
    progressStep(g);
    const xp0 = g.progress.mastery.business ?? 0;
    expect(isUnlocked(g, 'tank_auctions')).toBe(false);
    expect(quickSell(g, ids).ok).toBe(true);
    for (let i = 0; i < 5; i++) progressStep(g);
    expect(g.progress.counters.animalsSold).toBe(25);
    expect(counterValue(g, 'sales')).toBe(1);
    expect(isUnlocked(g, 'tank_auctions')).toBe(false);
    expect(g.progress.achievements).not.toContain('trader');
    // one sale's XP: 2 from the quick sale, 10 from the sales counter, the market scan's share (≤ 80)
    expect((g.progress.mastery.business ?? 0) - xp0).toBeLessThan(10 * 2 + 2 + 80);
  });

  it('an older save whose baselines counted animals is rebased, so its quest and tutorial step can still finish', () => {
    const g = world(34);
    g.progress.counters.sales = 3;
    g.progress.counters.animalsSold = 40;
    g.progress.counters.births = 5;
    // Taken by an older build: "sales" was the animal count, and a births baseline above today's count.
    g.progress.tutorial.stepBaselines = { sales: 40, friend_visits: 0 };
    g.progress.quests.push({ id: 'q_breed_more', status: 'active', progress: 0, startedHour: g.clock.hour, baseline: 50, target: 3 });
    progressStep(g);
    expect(g.progress.tutorial.stepBaselines?.sales ?? 3).toBeLessThanOrEqual(3);
    const q = g.progress.quests.find((x) => x.id === 'q_breed_more')!;
    expect(q.baseline).toBe(5);
    g.progress.counters.births = 8;
    progressStep(g);
    expect(g.progress.quests.find((x) => x.id === 'q_breed_more')!.status).toBe('complete');
    // A second pass changes nothing (idempotent).
    const snapshot = JSON.stringify(g.progress.quests);
    progressStep(g);
    expect(JSON.stringify(g.progress.quests)).toBe(snapshot);
  });
});
