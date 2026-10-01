// @vitest-environment node
/**
 * lane:fix-core — game-loop regressions from the audit:
 *   S06-05  a store subscriber that mutates synchronously during the tick's publish keeps its write
 *   G1-03   background tanks are anchored to world time whichever way they are flushed (no gaps: autofeeds fire)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { FIXTURES } from '@/dev/fixtures';
import { advanceWorld, stepTank, tankLod } from '@/sim/world';
import { ensureLab } from '@/sim/water/food';
import { mutateFast, resetFastMutate } from '@/game/fastMutate';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { runTick } from '@/game/GameLoop';
import type { GameState } from '@/types';

beforeEach(() => {
  resetFastMutate();
  useGame.getState().setGame(null);
});

describe('S06-05: synchronous subscriber mutations survive the next tick', () => {
  it('a listener that mutates inside setGame is not reverted by the following fast mutation', () => {
    const g = FIXTURES.community_fw();
    g.isShowcase = false;
    g.clock.speed = 1;
    useGame.getState().setGame(g);
    useUI.setState({ screen: 'game', focusedTankId: g.tankOrder[0], view: 'tank' });
    let runs = 0;
    const unsub = useGame.subscribe((s, p) => {
      if (!s.game || s.game === p.game || s.game.shopName.endsWith('!')) return;
      runs++;
      useGame.getState().mutate((d) => {
        d.shopName += '!';
        d.finance.money += 100;
      });
    });
    try {
      const money0 = g.finance.money;
      runTick(0.25);
      expect(runs).toBe(1);
      expect(useGame.getState().game!.shopName).toBe(g.shopName + '!');
      const afterOne = useGame.getState().game!.finance.money;
      expect(afterOne).toBeGreaterThanOrEqual(money0 + 100 - 1e-6);
      runTick(0.25);
      // still one listener run: the tick did not revert the "!" (which would have re-triggered the listener)
      expect(runs).toBe(1);
      expect(useGame.getState().game!.shopName).toBe(g.shopName + '!');
      expect(useGame.getState().game!.finance.money).toBeGreaterThanOrEqual(afterOne - 50);
    } finally {
      unsub();
    }
  });

  it('mutateFast itself: a recipe result published, then a subscriber mutation, then another recipe', () => {
    const g = FIXTURES.community_fw();
    useGame.getState().setGame(g);
    const unsub = useGame.subscribe((s, p) => {
      if (s.game && s.game !== p.game && s.game.finance.money === 12345) useGame.getState().mutate((d) => void (d.finance.money = 999));
    });
    try {
      mutateFast((d) => void (d.finance.money = 12345));
      expect(useGame.getState().game!.finance.money).toBe(999);
      mutateFast((d) => void (d.clock.hour += 0));
      expect(useGame.getState().game!.finance.money).toBe(999);
      mutateFast((d) => void (d.clock.hour += 1));
      expect(useGame.getState().game!.finance.money).toBe(999);
    } finally {
      unsub();
    }
  });
});

describe('G1-03: background tank time is contiguous however it is flushed', () => {
  /** community_fw with an autofeeder (2 feeds/day) on the second tank; count feeds over `days` at 10× step size. */
  function feeds(smoothEvery: number, days = 12): number {
    const g: GameState = FIXTURES.community_fw();
    g.isShowcase = false;
    for (const f of Object.keys(g.inventory.foods)) g.inventory.foods[f] = 999;
    const B = g.tankOrder[1];
    const t = g.tanks[B];
    if (!t.equipment.some((e) => e.defId === 'autofeeder')) t.equipment.push({ id: `${t.id}_af`, defId: 'autofeeder', installedHour: g.clock.hour - 48, condition: 1, on: true, setting: 2 });
    const focus = g.tankOrder[0];
    let last = ensureLab(t).lastAutofeedHour;
    let count = 0;
    let tick = 0;
    const dt = 0.25;
    const end = g.clock.hour + days * 24;
    while (g.clock.hour < end - 1e-9) {
      advanceWorld(g, dt, { focusTankId: focus });
      tick++;
      if (smoothEvery > 0 && tick % smoothEvery === 0) {
        // what GameLoop.smoothBackgroundLod does: flush a background tank's debt after the clock advanced
        const tank = g.tanks[B];
        const debt = tank.simDebtHours ?? 0;
        const lod = tankLod(g, B, { focusTankId: focus });
        if (lod !== 'full' && debt >= 0.5) {
          tank.simDebtHours = 0;
          stepTank(g, tank, debt, lod);
        }
      }
      const l = ensureLab(g.tanks[B]);
      if (l.lastAutofeedHour !== last) {
        last = l.lastAutofeedHour;
        count++;
      }
    }
    return count;
  }

  it('fires every autofeed whether flushes happen in-step, in the smoothing pass, or alternate', () => {
    const expected = 2 * 12;
    expect(feeds(0)).toBe(expected);
    for (const k of [5, 7, 9]) expect(feeds(k), `smoothing every ${k}th tick`).toBe(expected);
  });
});
