// @vitest-environment node
/**
 * lane:core (S0 review, adversarial F7) — runTick's backlog counts only time that was not published. A recipe that
 * throws publishes nothing, so all of the tick's hours stay in the backlog; a store subscriber that throws from inside
 * the publish runs after the world has moved, so those hours happened and must not be run again (time would run away).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runTick } from '@/game/GameLoop';
import { resetFastMutate } from '@/game/fastMutate';
import { getLoopStats } from '@/game/loopStats';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import type { GameState } from '@/types';

/** advanceWorld calls left before the mocked one throws (Infinity: never). */
const failAfter = vi.hoisted(() => ({ calls: Infinity }));

vi.mock('@/sim/world', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/sim/world')>();
  return {
    ...real,
    advanceWorld: (...args: Parameters<typeof real.advanceWorld>) => {
      if (failAfter.calls <= 0) throw new Error('slice failed');
      failAfter.calls--;
      return real.advanceWorld(...args);
    },
  };
});

function start(seed: number, speed: GameState['clock']['speed']): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Tick', seed });
  g.clock.speed = speed;
  useGame.getState().setGame(g);
  useUI.getState().set({ screen: 'game', view: 'tank', focusedTankId: g.tankOrder[0] });
  return useGame.getState().game!;
}

let unsubscribe: (() => void) | null = null;

beforeEach(() => {
  failAfter.calls = Infinity;
  resetFastMutate();
  useGame.getState().setGame(null);
});

afterEach(() => {
  unsubscribe?.();
  unsubscribe = null;
  failAfter.calls = Infinity;
});

describe('runTick backlog after a failure', () => {
  it('a slice that throws after several good ones publishes nothing and keeps every hour in the backlog', () => {
    const before = start(601, 10);
    const want = 1 * GAME_HOURS_PER_REAL_SECOND * 10; // 1 real second at 10x = 1 game hour = 4 slices
    failAfter.calls = 2;
    const errors0 = getLoopStats().errors;
    const backlog = runTick(1);
    expect(getLoopStats().errors).toBe(errors0 + 1);
    expect(useGame.getState().game).toBe(before);
    expect(backlog).toBeCloseTo(want, 9);
  });

  it('a store subscriber that throws keeps the published hours out of the backlog', () => {
    const before = start(602, 1);
    let throws = 1;
    unsubscribe = useGame.subscribe(() => {
      if (throws > 0) {
        throws--;
        throw new Error('subscriber failed');
      }
    });
    const realDt = 0.25;
    const step = realDt * GAME_HOURS_PER_REAL_SECOND;
    const errors0 = getLoopStats().errors;
    const backlog = runTick(realDt);
    expect(getLoopStats().errors).toBe(errors0 + 1);
    expect(useGame.getState().game!.clock.hour).toBeCloseTo(before.clock.hour + step, 9);
    expect(backlog).toBe(0);
    // The next tick advances by one step, not two.
    runTick(realDt, backlog);
    expect(useGame.getState().game!.clock.hour).toBeCloseTo(before.clock.hour + 2 * step, 9);
  });
});
