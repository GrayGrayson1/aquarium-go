// @vitest-environment node
/**
 * Chunk 11 (SHARED-SHOPS.md §4.2): player actions reach the store as commands through its installed dispatcher. The
 * solo one applies a command at once, as `act` applied its closure: the result comes back before `dispatch` returns,
 * an action that throws changes nothing, the guide flag runs in a write of its own, and the hold actions catch the
 * background tanks up on the plain copy first. A shared shop's dispatcher (chunk 13) settles later; the `act`
 * helpers wait for it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const flush = vi.hoisted(() => ({ calls: 0 }));
const boom = vi.hoisted(() => ({ on: false }));
vi.mock('@/sim/economy/purchases', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/sim/economy/purchases')>();
  return {
    ...real,
    buyEggs: (d: { finance: { money: number } }, tins: number) => {
      if (!boom.on) return real.buyEggs(d as never, tins);
      d.finance.money += 1000;
      throw new Error('half-done');
    },
  };
});
vi.mock('@/game/fastMutate', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/game/fastMutate')>();
  return {
    ...real,
    flushBackgroundTanks: () => {
      flush.calls++;
      real.flushBackgroundTanks();
    },
  };
});

import type { CommandResult } from '@/sim/commands';
import type { Dispatch } from '@/state/game';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { newGame } from '@/sim/newGame';
import { stateHash } from '@/persistence/hash';
import { soloDispatch } from '@/game/dispatch';
import { act as uiAct } from '@/ui/common/actions';
import { act as panelAct } from '@/ui/panels/common/act';

/** What the imports alone installed, before any test installs anything. */
const installedByImports = useGame.getState().dispatch;

beforeEach(() => {
  flush.calls = 0;
  boom.on = false;
  useGame.getState().installDispatch(soloDispatch);
  useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Dispatch', seed: 5 }));
  useUI.setState({ toasts: [] });
});

describe('chunk 11: the solo dispatcher (§4.2)', () => {
  it('is installed by importing the act helpers', () => {
    expect(installedByImports).toBe(soloDispatch);
  });

  it('applies a command at once: the result comes to `done` before dispatch returns it', () => {
    const salt = useGame.getState().game!.inventory.salt;
    const actions = useGame.getState().actions;
    const seen: (CommandResult | null)[] = [];
    const r = useGame.getState().dispatch({ k: 'buySalt', kg: 5 }, (x) => seen.push(x));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(r);
    expect(r?.ok).toBe(true);
    expect(useGame.getState().game!.inventory.salt).toBe(salt + 5);
    expect(useGame.getState().actions).toBe(actions + 1);
  });

  it('with no game it answers null', () => {
    useGame.getState().setGame(null);
    const seen: unknown[] = [];
    expect(useGame.getState().dispatch({ k: 'buySalt', kg: 5 }, (x) => seen.push(x))).toBeNull();
    expect(seen).toEqual([null]);
  });

  it('an action that throws part-way escapes and changes nothing', () => {
    const before = stateHash(useGame.getState().game!);
    boom.on = true;
    const seen: unknown[] = [];
    expect(() => useGame.getState().dispatch({ k: 'buyEggs', tins: 1 }, (x) => seen.push(x))).toThrow('half-done');
    boom.on = false;
    expect(seen).toEqual([]);
    expect(stateHash(useGame.getState().game!)).toBe(before);
  });

  it('the hold actions catch the background tanks up first; other actions do not', () => {
    useGame.getState().dispatch({ k: 'buySalt', kg: 5 });
    expect(flush.calls).toBe(0);
    useGame.getState().dispatch({ k: 'holdAll' });
    useGame.getState().dispatch({ k: 'setHold', sys: 'food', on: false });
    useGame.getState().dispatch({ k: 'resumeAll' });
    expect(flush.calls).toBe(3);
  });

  it('raises a command’s guide flag in a write of its own, after the action', () => {
    const actions = useGame.getState().actions;
    useGame.getState().dispatch({ k: 'buySalt', kg: 5, flag: 'dispatch_probe' });
    expect(useGame.getState().game!.progress.tutorial.flags.dispatch_probe).toBe(true);
    expect(useGame.getState().actions).toBe(actions + 2);
  });
});

describe('chunk 11: the guide advances once per flag (the fresh review’s B1)', () => {
  it('feed by tapping the tank, then open the tank card: the water step starts and waits, as before', async () => {
    const { currentTutorialStep, tutorialAdvance } = await import('@/sim/facility');
    const { deepClone } = await import('@/sim/clone');
    const step = () => currentTutorialStep(useGame.getState().game!)?.id;
    const g = newGame({ starterId: 'betta', starterName: 'Probe', seed: 7 });
    for (let i = 0; i < 20 && currentTutorialStep(g)?.id !== 'feed'; i++) tutorialAdvance(g);
    expect(currentTutorialStep(g)?.id).toBe('feed');
    g.clock.speed = 0;
    useGame.getState().setGame(g);
    const tank = g.tankOrder[0];
    const food = Object.keys(g.inventory.foods).find((f) => (g.inventory.foods[f] ?? 0) >= 1)!;
    expect(useGame.getState().dispatch({ k: 'feedTank', tank, food, zone: 'surface' })?.ok).toBe(true); // a tap: no flag
    const old = deepClone(useGame.getState().game!);
    tutorialAdvance(old, 'opened_tank_card'); // what tutorialFlag('opened_tank_card') did
    useGame.getState().dispatch({ k: 'raiseFlag', name: 'opened_tank_card' });
    expect(step()).toBe('water');
    expect(stateHash(useGame.getState().game!)).toBe(stateHash(old));
  });
});

describe('chunk 11: the act helpers wait for a dispatcher that settles later (a shared shop, chunk 13)', () => {
  /** A stand-in for chunk 13's: it holds each command until `settle` is called, then applies it the solo way. */
  function deferred(): { dispatch: Dispatch; settle: () => void } {
    const held: (() => void)[] = [];
    return {
      dispatch: (cmd, done) => {
        held.push(() => soloDispatch(cmd, done));
        return undefined;
      },
      settle: () => held.splice(0).forEach((f) => f()),
    };
  }

  it('toasts, plays and calls `after` only when the result arrives', () => {
    const d = deferred();
    useGame.getState().installDispatch(d.dispatch);
    const got: (CommandResult | null)[] = [];
    uiAct({ k: 'buySalt', kg: 5 }, { message: 'Bought salt', after: (r) => got.push(r) });
    panelAct({ k: 'buySalt', kg: 5 }, { successText: 'Bought more salt', after: (r) => got.push(r) });
    expect(got).toEqual([]);
    expect(useUI.getState().toasts).toEqual([]);
    d.settle();
    expect(got.map((r) => r?.ok)).toEqual([true, true]);
    expect(useUI.getState().toasts.map((t) => t.text)).toEqual(['Bought salt', 'Bought more salt']);
  });
});
