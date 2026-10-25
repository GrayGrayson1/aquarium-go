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
import { BID_MAX_OPEN_HOURS, BID_MIN_OPEN_HOURS, createListing, devOpenMarket, devStepEconomy, marketTimeScale } from '@/sim/economy';
import { simulateOffline } from '@/persistence';
import { GAME_HOURS_PER_REAL_SECOND, OFFLINE_CAP_HOURS } from '@/sim/time';
import { BUYER_ARCHETYPE_IDS, BUYER_ARCHETYPES } from '@/data/buyers';

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

describe('MKT-016: bids made during the offline catch-up last their promised real time after the return', () => {
  it('marketTimeScale keeps the saved speed during the grace catch-up', () => {
    const g = world(11, 10);
    g.offlineGrace = true;
    expect(marketTimeScale(g)).toBe(10);
  });

  // ADR-0016 decision 3: catch-up time uses up part of a bid's window, as the owner accepted. What the code guarantees is
  // the least patient buyer's shortest window (bids are scaled by the saved speed when made) less the catch-up's own game
  // hours: about 148 real seconds at 3×, 176 at 10× and 68 at 1× (MKT-016 A2). Chunk 16: the 171-second check this test
  // used at 3× and 10× was stricter than that guarantee (MKT-016's note: seed 116 fails it), so it passed only on lucky
  // streams; it is aligned with the documented minimum, as decision 3 allows, and 1× is checked too.
  const leastPatience = Math.min(...BUYER_ARCHETYPE_IDS.map((t) => BUYER_ARCHETYPES[t].patience[0]));
  const shortestWindow = (BID_MIN_OPEN_HOURS + (BID_MAX_OPEN_HOURS - BID_MIN_OPEN_HOURS) * leastPatience) * 0.95;

  it('the documented minimums: about 148 real seconds at 3×, 176 at 10×, 68 at 1×', () => {
    const floor = (speed: number) => (shortestWindow * speed - OFFLINE_CAP_HOURS) / (GAME_HOURS_PER_REAL_SECOND * speed);
    expect(floor(3)).toBeCloseTo(148.1, 0);
    expect(floor(10)).toBeCloseTo(176.1, 0);
    expect(floor(1)).toBeCloseTo(68.1, 0);
  });

  it.each([1, 3, 10] as GameSpeed[])('a game saved at %ix: every bid still open on return has at least the guaranteed minimum left', (speed) => {
    let checked = 0;
    for (const seed of [11, 12, 13, 14, 15]) {
      const g = world(seed, speed);
      const startHour = g.clock.hour;
      simulateOffline(g, 6 * 3600 * 1000); // six real hours away
      const now = g.clock.hour;
      expect(now - startHour).toBeLessThanOrEqual(OFFLINE_CAP_HOURS + 1e-9);
      // The least patient buyer's bid made at the start of the catch-up, once play resumes at the saved speed.
      const floor = (shortestWindow * speed - (now - startHour)) / (GAME_HOURS_PER_REAL_SECOND * speed);
      for (const l of g.market.listings) {
        for (const b of l.bids) {
          if (b.status !== 'open' || b.createdHour < startHour) continue;
          // Real seconds left once play resumes at the saved speed.
          const realSeconds = (b.expiresHour - now) / (GAME_HOURS_PER_REAL_SECOND * speed);
          expect(realSeconds).toBeGreaterThanOrEqual(floor - 1e-6);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0); // the check covers real buyer activity
  });
});
