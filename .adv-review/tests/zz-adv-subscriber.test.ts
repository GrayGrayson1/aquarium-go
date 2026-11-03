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

