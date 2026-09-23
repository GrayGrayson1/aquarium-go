// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { runTick, TICK_MS } from '@/game/GameLoop';
import { getLoopStats } from '@/game/loopStats';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { bigFacility } from '@/dev/fixtures/core-fixtures';
import { newGame } from '@/sim/newGame';
import { share, mutateFast, resetFastMutate } from '@/game/fastMutate';
import { advanceWorld } from '@/sim/world';
import { stateHash } from '@/persistence';

beforeEach(() => {
  useGame.getState().setGame(null);
  useUI.getState().set({ screen: 'title', view: 'tank', focusedTankId: null });
});

describe('core game loop tick', () => {
  it('advances game time by realDt × speed and records the tick', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Loop', seed: 71 });
    useGame.getState().setGame(g);
    useUI.getState().set({ screen: 'game', focusedTankId: g.tankOrder[0] });
    const h0 = useGame.getState().game!.clock.hour;
    const backlog = runTick(TICK_MS / 1000);
    expect(backlog).toBe(0);
    expect(useGame.getState().game!.clock.hour).toBeCloseTo(h0 + (TICK_MS / 1000) * GAME_HOURS_PER_REAL_SECOND, 9);
    expect(getLoopStats().ticks).toBeGreaterThan(0);
  });

  it('does not tick outside the game screen, or when paused', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Idle', seed: 72 });
    useGame.getState().setGame(g);
    useUI.getState().set({ screen: 'title' });
    const h0 = g.clock.hour;
    runTick(1);
    expect(useGame.getState().game!.clock.hour).toBe(h0);
    useUI.getState().set({ screen: 'game' });
    useGame.getState().mutate((d) => {
      d.clock.speed = 0;
    });
    runTick(1);
    expect(useGame.getState().game!.clock.hour).toBe(h0);
  });

  // Wall-clock budget: retried so a busy machine (other jobs pinning the performance cores) doesn't fail it;
  // a real regression still fails every attempt.
  it('10× on the big facility: one mutation per tick, keeps up, never drops time', { retry: 2 }, () => {
    const g = bigFacility();
    g.clock.speed = 10;
    useGame.getState().setGame(g);
    useUI.getState().set({ screen: 'game', view: 'facility', focusedTankId: g.tankOrder[0] });
    const h0 = g.clock.hour;
    const v0 = useGame.getState().version;
    let backlog = 0;
    const ticks = 80; // 20 real seconds
    const times: number[] = [];
    for (let i = 0; i < ticks; i++) {
      const t0 = performance.now();
      backlog = runTick(TICK_MS / 1000, backlog);
      times.push(performance.now() - t0);
    }
    // Median per-tick cost (robust to CPU contention from other processes on a shared machine).
    const ms = [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.info(`[core-loop] big_facility 10× tick median ${ms.toFixed(2)} ms, mean ${avg.toFixed(2)} ms`);
    expect(useGame.getState().version - v0).toBe(ticks);
    const expected = ticks * (TICK_MS / 1000) * GAME_HOURS_PER_REAL_SECOND * 10;
    expect(useGame.getState().game!.clock.hour + backlog).toBeCloseTo(h0 + expected, 6);
    expect(getLoopStats().droppedHours).toBe(0);
    expect(getLoopStats().errors).toBe(0);
    expect(ms).toBeLessThan(20);
  });
});

describe('core fastMutate (structural sharing without Immer)', () => {
  it('share keeps identity for unchanged subtrees and never aliases the working copy', () => {
    const prev = { a: { x: 1, y: [1, 2, { z: 3 }] }, b: { q: 'hi' }, c: [1, 2, 3] };
    const next = JSON.parse(JSON.stringify(prev));
    expect(share(prev, next)).toBe(prev);
    next.a.y[2].z = 4;
    next.c.push(4);
    delete next.b.q;
    next.d = { fresh: true };
    const out = share(prev, next) as typeof prev & { d: { fresh: boolean } };
    expect(out).not.toBe(prev);
    expect(out.a.y[0]).toBe(1);
    expect(out.a.y[2]).not.toBe(prev.a.y[2]);
    expect((out.a.y[2] as { z: number }).z).toBe(4);
    expect(out.c).toEqual([1, 2, 3, 4]);
    expect(out.b).toEqual({});
    expect(out.d).toEqual({ fresh: true });
    expect(out.d).not.toBe(next.d);
    expect(out.a.y[2]).not.toBe(next.a.y[2]);
    // unchanged sibling keeps identity
    const prev2 = { keep: { deep: { v: 1 } }, change: { v: 1 } };
    const next2 = JSON.parse(JSON.stringify(prev2));
    next2.change.v = 2;
    const out2 = share(prev2, next2) as typeof prev2;
    expect(out2.keep).toBe(prev2.keep);
  });

  it('mutateFast gives the same result as a plain advance, with one store update, keeping untouched tanks shared', () => {
    resetFastMutate();
    const g = bigFacility();
    const plain = JSON.parse(JSON.stringify(g));
    useGame.getState().setGame(g);
    const v0 = useGame.getState().version;
    const before = useGame.getState().game!;
    mutateFast((d) => advanceWorld(d, 0.25, { focusTankId: d.tankOrder[0] }));
    advanceWorld(plain, 0.25, { focusTankId: plain.tankOrder[0] });
    const after = useGame.getState().game!;
    expect(useGame.getState().version).toBe(v0 + 1);
    expect(stateHash(after)).toBe(stateHash(plain));
    // Background tanks with debt < threshold were not stepped: only their simDebtHours changed → decor array shared.
    const bg = after.tankOrder[5];
    expect(after.tanks[bg].decor).toBe(before.tanks[bg].decor);
    expect(after.tanks[bg].equipment).toBe(before.tanks[bg].equipment);
  });

  it('external mutations between fast ticks are picked up (never lost)', () => {
    resetFastMutate();
    const g = newGame({ starterId: 'betta', starterName: 'Ext', seed: 73 });
    useGame.getState().setGame(g);
    mutateFast((d) => advanceWorld(d, 0.25, {}));
    useGame.getState().mutate((d) => {
      d.finance.money += 1000;
    });
    const m = useGame.getState().game!.finance.money;
    mutateFast((d) => advanceWorld(d, 0.25, {}));
    expect(useGame.getState().game!.finance.money).toBeGreaterThanOrEqual(m - 50);
    expect(useGame.getState().game!.finance.money).toBeGreaterThan(900);
  });

  it('diff cost on the big facility stays small', () => {
    const g = bigFacility();
    const copy = structuredClone(g);
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) share(g, copy);
    const ms = (performance.now() - t0) / 20;
    console.info(`[core-loop] share() full walk of big_facility: ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(15);
  });
});
