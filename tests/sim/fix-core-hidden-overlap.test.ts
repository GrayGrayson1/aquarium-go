// @vitest-environment node
/**
 * lane:core (S0 review) — the hidden-tab catch-up simulates only the time the world hasn't caught up yet. A load that
 * finishes while the tab is hidden runs its own catch-up and moves lastTickRealMs to that moment; the return to the
 * tab used to simulate the whole hidden spell again on top of it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import { catchUpAfterHidden } from '@/persistence';
import { resetFastMutate } from '@/game/fastMutate';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';

const MIN = 60_000;

function anchoredWorld(lastTickAgoMs: number) {
  const g = newGame({ starterId: 'betta', starterName: 'Overlap', seed: 314 });
  g.isShowcase = false;
  g.clock.speed = 1;
  g.lastTickRealMs = Date.now() - lastTickAgoMs;
  useGame.getState().setGame(g);
  useUI.setState({ screen: 'game' });
  return g;
}

beforeEach(() => {
  resetFastMutate();
  useGame.getState().setGame(null);
});

describe('hidden-tab catch-up after a load during the hidden spell', () => {
  it('a world that caught up a minute ago gets no second catch-up for a 30-minute absence', () => {
    const g = anchoredWorld(1 * MIN);
    expect(catchUpAfterHidden(30 * MIN)).toBeNull();
    expect(useGame.getState().game!.clock.hour).toBe(g.clock.hour);
  });

  it('only the time since the world last caught up is simulated', () => {
    anchoredWorld(6 * MIN);
    const s = catchUpAfterHidden(60 * MIN);
    expect(s).toBeTruthy();
    // 6 real minutes, not the 60 the tab was hidden
    expect(s!.uncappedHours).toBeCloseTo(6 * 60 * GAME_HOURS_PER_REAL_SECOND, 1);
  });

  it('a plain hidden spell (world anchored when the tab went dark) still catches up all of it', () => {
    anchoredWorld(20 * MIN);
    const s = catchUpAfterHidden(20 * MIN);
    expect(s).toBeTruthy();
    expect(s!.uncappedHours).toBeCloseTo(20 * 60 * GAME_HOURS_PER_REAL_SECOND, 1);
  });
});
