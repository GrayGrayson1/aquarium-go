/**
 * lane:fix-econ (S0 review, adversarial F8) — bids made during the offline catch-up keep their promise once the player
 * is back. The game resumes at the speed it was saved at, so a bid's window must be scaled by that speed when it is
 * created, catch-up or not: an S0 change that ran the catch-up market at 1× left those bids open for 14-33 real seconds
 * at 10× instead of the promised 3+ real minutes (BID_MIN_OPEN_HOURS).
 */
import { describe, it, expect } from 'vitest';
import type { GameSpeed, GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import { createListing, devOpenMarket, devStepEconomy, marketTimeScale } from '@/sim/economy';
import { simulateOffline } from '@/persistence';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';

function world(seed: number, speed: GameSpeed): GameState {
  const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed });
  devOpenMarket(g);
  devStepEconomy(g, 0.5);
  g.finance.money = 500;
  for (let i = 0; i < 3; i++) {
    const c = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 30 }), g.tankOrder[0]);
    c.stats.health = 100;
    const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 72 });
    expect(r.ok).toBe(true);
  }
  g.clock.speed = speed;
  return g;
}

describe('bids made during the offline catch-up last their promised real time after the return', () => {
  it('marketTimeScale keeps the saved speed during the grace catch-up', () => {
    const g = world(11, 10);
    g.offlineGrace = true;
    expect(marketTimeScale(g)).toBe(10);
  });

  it.each([3, 10] as GameSpeed[])('a game saved at %ix: every bid still open on return lasts at least ~3 real minutes', (speed) => {
    let checked = 0;
    for (const seed of [11, 12, 13, 14, 15]) {
      const g = world(seed, speed);
      const startHour = g.clock.hour;
      simulateOffline(g, 6 * 3600 * 1000); // six real hours away
      const now = g.clock.hour;
      for (const l of g.market.listings) {
        for (const b of l.bids) {
          if (b.status !== 'open' || b.createdHour < startHour) continue;
          // Real seconds left once play resumes at the saved speed.
          const realSeconds = (b.expiresHour - now) / (GAME_HOURS_PER_REAL_SECOND * speed);
          expect(realSeconds).toBeGreaterThanOrEqual(180 * 0.95 - 1e-6);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0); // the check covers real buyer activity
  });
});
