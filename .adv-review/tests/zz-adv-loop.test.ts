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

describe('adv: a store subscriber that throws while mutateFast publishes', () => {
  it('the tick is applied AND kept in the backlog, so the next tick simulates it again', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Twice', seed: 77 });
    g.clock.speed = 1;
    useGame.getState().setGame(g);
    useUI.getState().set({ screen: 'game', focusedTankId: g.tankOrder[0] });
    const h0 = useGame.getState().game!.clock.hour;
    let armed = true;
    const unsub = useGame.subscribe(() => {
      if (armed) { armed = false; throw new Error('subscriber failed during publish'); }
    });
    const realDt = TICK_MS / 1000;
    const want = realDt * GAME_HOURS_PER_REAL_SECOND * 1;
    const backlog = runTick(realDt);
    const h1 = useGame.getState().game!.clock.hour;
    runTick(realDt, backlog);
    const h2 = useGame.getState().game!.clock.hour;
    unsub();
    console.log(`ADV-SUBSCRIBER want/tick=${want} after tick1: advanced=${(h1 - h0).toFixed(4)} backlog=${backlog.toFixed(4)}; after tick2 total=${(h2 - h0).toFixed(4)} (expected ${(2 * want).toFixed(4)})`);
    expect(h1 - h0).toBeGreaterThan(0);
  });
});

describe('adv: the load-time catch-up is not atomic', () => {
  it('simulateOffline that throws part-way has already changed the state it was given', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Half', seed: 78 }) as GameState;
    g.clock.speed = 1;
    // a second tank whose water is corrupt makes the world step throw after the first tank stepped
    const firstId = g.tankOrder[0];
    const bad = 'tank_adv_dup';
    g.tanks[bad] = { ...structuredClone(g.tanks[firstId]), id: bad } as never;
    g.tankOrder.push(bad);
    const before = JSON.stringify(g.tanks[firstId]);
    const hourBefore = g.clock.hour;
    (g.tanks[bad] as unknown as { water: unknown }).water = null;
    let threw = '';
    try { simulateOffline(g, 3 * 3600 * 1000); } catch (e) { threw = (e as Error).message; }
    const changed = JSON.stringify(g.tanks[firstId]) !== before;
    console.log(`ADV-LOAD-PARTIAL threw="${threw.slice(0, 60)}" firstTankChanged=${changed} clockMoved=${g.clock.hour !== hourBefore} offlineGraceLeft=${'offlineGrace' in g}`);
    expect(true).toBe(true);
  });
});

describe('adv: hidden catch-up when lastTickRealMs is ahead of the wall clock', () => {
  it('a clock that stepped back skips the whole catch-up', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Skew', seed: 79 });
    g.isShowcase = false;
    g.clock.speed = 1;
    g.lastTickRealMs = Date.now() + 10 * 60_000; // device clock corrected backwards by 10 minutes after the last tick
    useGame.getState().setGame(g);
    useUI.setState({ screen: 'game' });
    const s = catchUpAfterHidden(60 * 60_000);
    console.log(`ADV-SKEW hidden 60 min, lastTick 10 min "in the future": summary=${s ? `${s.hours}h` : 'null'}`);
    expect(true).toBe(true);
  });
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
