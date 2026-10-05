/**
 * lane:fix-econ (S0 review) — the offline catch-up runs the market at 1×. The clock keeps the speed the game was saved
 * at, and marketTimeScale used to read it, so a game saved at 10× stretched every bid window and buyer hazard tenfold
 * while catching up (contrary to the code comment and docs/GAME_DESIGN.md "Timing is humane in real time").
 */
import { describe, it, expect } from 'vitest';
import type { GameSpeed, GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import { createListing, devOpenMarket, devStepEconomy, marketTimeScale } from '@/sim/economy';
import { simulateOffline } from '@/persistence';

function world(seed: number, speed: GameSpeed): GameState {
  const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed });
  devOpenMarket(g);
  devStepEconomy(g, 0.5);
  g.finance.money = 500;
  const c = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 30 }), g.tankOrder[0]);
  c.stats.health = 100;
  const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 72 });
  expect(r.ok).toBe(true);
  g.clock.speed = speed;
  return g;
}

describe('offline catch-up runs the market at 1×', () => {
  it('marketTimeScale is 1 during the grace catch-up, whatever speed was saved', () => {
    const g = world(11, 10);
    expect(marketTimeScale(g)).toBe(10);
    g.offlineGrace = true;
    expect(marketTimeScale(g)).toBe(1);
  });

  it('the same save caught up at saved speed 10 and at 1 leaves an identical market', () => {
    const slow = world(11, 1);
    const fast = world(11, 10);
    const away = 6 * 3600 * 1000; // six real hours
    simulateOffline(slow, away);
    simulateOffline(fast, away);
    const bids = slow.market.listings.reduce((n, l) => n + l.bids.length, 0);
    expect(bids).toBeGreaterThan(0); // the comparison covers real buyer activity
    expect(JSON.stringify(fast.market)).toBe(JSON.stringify(slow.market));
  });
});
