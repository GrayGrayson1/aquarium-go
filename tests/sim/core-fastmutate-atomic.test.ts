// @vitest-environment node
/**
 * lane:core (S0 review, PERSIST-004) — mutateFast is atomic, like useGame.mutate: a recipe that throws publishes
 * nothing, so a world step that fails part-way never becomes the game state, is never built on by the next tick and
 * is never autosaved. runTick keeps the failed tick's hours in its backlog instead of silently dropping them.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import { mutateFast, resetFastMutate } from '@/game/fastMutate';
import { runTick, TICK_MS } from '@/game/GameLoop';
import { getLoopStats } from '@/game/loopStats';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import type { GameState } from '@/types';

beforeEach(() => {
  resetFastMutate();
  useGame.getState().setGame(null);
  useUI.getState().set({ screen: 'title', view: 'tank', focusedTankId: null });
});

describe('mutateFast is atomic', () => {
  it('a recipe that throws publishes nothing and leaves the store state untouched', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Atom', seed: 501 });
    useGame.getState().setGame(g);
    const before = useGame.getState().game!;
    const money0 = before.finance.money;
    const version0 = useGame.getState().version;
    expect(() =>
      mutateFast((d) => {
        d.finance.money += 1000;
        d.clock.hour += 5;
        throw new Error('boom mid-step');
      }),
    ).toThrow('boom mid-step');
    expect(useGame.getState().game).toBe(before);
    expect(useGame.getState().version).toBe(version0);
    expect(useGame.getState().game!.finance.money).toBe(money0);
  });

  it('the next call starts from the store again, not from the abandoned working copy', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Fresh', seed: 502 });
    useGame.getState().setGame(g);
    const money0 = g.finance.money;
    mutateFast((d) => void (d.finance.money += 1)); // warm the working copy
    expect(() =>
      mutateFast((d) => {
        d.finance.money += 500;
        throw new Error('fail');
      }),
    ).toThrow('fail');
    mutateFast((d) => void (d.finance.money += 2));
    expect(useGame.getState().game!.finance.money).toBe(money0 + 3);
  });
});

describe('runTick on a world step that throws', () => {
  it('changes nothing, reports the error and keeps the hours in the backlog', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Broken', seed: 503 });
    // A corrupt tank makes every world step throw part-way.
    (g.tanks[g.tankOrder[0]] as unknown as { water: unknown }).water = null;
    useGame.getState().setGame(g);
    useUI.getState().set({ screen: 'game', focusedTankId: g.tankOrder[0] });
    const before: GameState = useGame.getState().game!;
    const errors0 = getLoopStats().errors;
    const realDt = TICK_MS / 1000;
    const backlog = runTick(realDt);
    expect(getLoopStats().errors).toBe(errors0 + 1);
    expect(useGame.getState().game).toBe(before);
    expect(useGame.getState().game!.clock.hour).toBe(before.clock.hour);
    expect(backlog).toBeCloseTo(realDt * GAME_HOURS_PER_REAL_SECOND * before.clock.speed, 9);
  });
});
