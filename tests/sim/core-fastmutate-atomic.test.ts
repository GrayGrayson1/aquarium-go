// @vitest-environment node
/**
 * lane:core (S0 review, PERSIST-009) — mutateFast is atomic, like useGame.mutate: a recipe that throws publishes
 * nothing, so a world step that fails part-way never becomes the game state, is never built on by the next tick and
 * is never autosaved. runTick keeps the failed tick's hours in its backlog instead of silently dropping them. A failed
 * publish leaves nothing behind either, and a call from inside a running recipe is refused before it touches anything
 * (security-data-2 m2, code-architecture-game-2 m4).
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

describe('PERSIST-009: mutateFast is atomic', () => {
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

describe('PERSIST-009: a failed publish and nested calls', () => {
  it('a publish that throws before the store update leaves nothing behind: the next call starts from the store', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Share', seed: 504 });
    useGame.getState().setGame(g);
    const before = useGame.getState().game!;
    const money0 = before.finance.money;
    let fired = false;
    expect(() =>
      mutateFast((d) => {
        d.finance.money += 1000;
        // share() reads this while building the published state, and throws the first time it does
        Object.defineProperty(d.finance, 'boom', {
          enumerable: true,
          configurable: true,
          get() {
            if (fired) return 1;
            fired = true;
            throw new Error('share failed');
          },
        });
      }),
    ).toThrow('share failed');
    expect(useGame.getState().game).toBe(before);
    mutateFast((d) => void (d.finance.money += 2));
    const now = useGame.getState().game!;
    expect(now.finance.money).toBe(money0 + 2);
    expect(Object.hasOwn(now.finance, 'boom')).toBe(false);
  });

  it('a store subscriber that throws after the update: the update stands once, and the next call builds on it', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Listener', seed: 505 });
    useGame.getState().setGame(g);
    const money0 = g.finance.money;
    let once = true;
    const unsubscribe = useGame.subscribe(() => {
      if (!once) return;
      once = false;
      throw new Error('subscriber failed');
    });
    try {
      expect(() => mutateFast((d) => void (d.finance.money += 1000))).toThrow('subscriber failed');
    } finally {
      unsubscribe();
    }
    expect(useGame.getState().game!.finance.money).toBe(money0 + 1000);
    mutateFast((d) => void (d.finance.money += 2));
    expect(useGame.getState().game!.finance.money).toBe(money0 + 1002);
  });

  it('a call from inside a running recipe is refused before it touches anything; the outer call stays atomic', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Nest', seed: 506 });
    useGame.getState().setGame(g);
    const money0 = g.finance.money;
    const hour0 = g.clock.hour;
    let refused: unknown = null;
    mutateFast((d) => {
      d.clock.hour += 1;
      try {
        mutateFast((inner) => void (inner.finance.money += 1000));
      } catch (e) {
        refused = e;
      }
      // the review's sequence: an inner call that fails inside a recipe that catches the error and carries on
      try {
        mutateFast(() => {
          throw new Error('inner failure');
        });
      } catch {
        /* the outer recipe carries on */
      }
    });
    expect(refused).toBeInstanceOf(Error);
    expect((refused as Error).message).toMatch(/not re-entrant/);
    const now = useGame.getState().game;
    expect(now).not.toBeNull();
    expect(now!.clock.hour).toBe(hour0 + 1);
    expect(now!.finance.money).toBe(money0);
  });

  it('an outer recipe that lets the refusal propagate publishes nothing, and the next call works', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Nest2', seed: 507 });
    useGame.getState().setGame(g);
    const before = useGame.getState().game!;
    const money0 = before.finance.money;
    expect(() =>
      mutateFast((d) => {
        d.finance.money += 7;
        mutateFast(() => undefined);
      }),
    ).toThrow(/not re-entrant/);
    expect(useGame.getState().game).toBe(before);
    mutateFast((d) => void (d.finance.money += 1));
    expect(useGame.getState().game!.finance.money).toBe(money0 + 1);
  });
});

describe('PERSIST-009: runTick on a world step that throws', () => {
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
