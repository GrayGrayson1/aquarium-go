// Adversarial probe (review worktree only): the S0 loop / catch-up fixes under failure, reload and clock edge cases.
import { describe, it, expect, beforeEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import { runTick, TICK_MS } from '@/game/GameLoop';
import { resetFastMutate } from '@/game/fastMutate';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { simulateOffline, catchUpAfterHidden } from '@/persistence';
import type { GameState } from '@/types';

beforeEach(() => {
  resetFastMutate();
  useGame.getState().setGame(null);
  useUI.getState().set({ screen: 'title', view: 'tank', focusedTankId: null });
});

import type { GameSpeed } from '@/types';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import { createListing, devOpenMarket, devStepEconomy } from '@/sim/economy';
import { BID_MIN_OPEN_HOURS } from '@/sim/economy/listings';

function marketWorld(seed: number, speed: GameSpeed): GameState {
  const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed });
  devOpenMarket(g);
  devStepEconomy(g, 0.5);
  g.finance.money = 500;
  for (let i = 0; i < 3; i++) {
    const c = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 30 }), g.tankOrder[0]);
    c.stats.health = 100;
    createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 72 });
  }
  g.clock.speed = speed;
  return g;
}

describe('adv: bids opened during a 1x catch-up, then played on at the saved 10x', () => {
  it('reports how long (real seconds at 10x) the still-open catch-up bids last after the return', () => {
    const rows: string[] = [];
    for (const seed of [11, 12, 13, 14, 15]) {
      const g = marketWorld(seed, 10);
      const start = g.clock.hour;
      simulateOffline(g, 6 * 3600 * 1000);
      const now = g.clock.hour;
      const open = g.market.listings.flatMap((l) => l.bids).filter((b) => b.status === 'open' && b.createdHour >= start);
      const secsAt10x = open.map((b) => (b.expiresHour - now) / (GAME_HOURS_PER_REAL_SECOND * 10));
      rows.push(`seed ${seed}: open catch-up bids=${open.length} remaining real s at 10x=[${secsAt10x.map((s) => s.toFixed(0)).join(',')}]`);
    }
    console.log(`ADV-MARKET promised minimum window = ${(BID_MIN_OPEN_HOURS / GAME_HOURS_PER_REAL_SECOND).toFixed(0)} real s at any speed\n${rows.join('\n')}`);
    expect(rows.length).toBe(5);
  });
});
