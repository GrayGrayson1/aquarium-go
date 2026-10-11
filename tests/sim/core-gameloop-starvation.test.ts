// @vitest-environment node
/**
 * lane:core (chunk 3; BACKLOG B-013) — runTick's failure path drops the starvation slowdown it found: a tick whose
 * world step never published (the working copy was thrown away) must not toast "slowed down" for hours that didn't
 * happen. The control: the same tick, published, does toast.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runTick } from '@/game/GameLoop';
import { resetFastMutate } from '@/game/fastMutate';
import { starvationSlowdownText } from '@/game/starvationGuard';
import { newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';

const mode = vi.hoisted(() => ({ failPublish: false }));

// Every tick finds a starving animal, so a published tick always toasts the slowdown.
vi.mock('@/game/starvationGuard', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/game/starvationGuard')>();
  return { ...real, checkStarvation: () => ['Ember'] };
});

// failPublish: the recipe runs to the end on a copy (so runTick has seen the slowdown), then the publish fails and
// nothing reaches the store — the "recipe that throws publishes nothing" case of fastMutate.ts.
vi.mock('@/game/fastMutate', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/game/fastMutate')>();
  const store = await import('@/state/game');
  return {
    ...real,
    mutateFast: (recipe: Parameters<typeof real.mutateFast>[0]) => {
      if (!mode.failPublish) return real.mutateFast(recipe);
      recipe(structuredClone(store.useGame.getState().game!));
      throw new Error('publish failed');
    },
  };
});

function start(): void {
  const g = newGame({ starterId: 'betta', starterName: 'Tick', seed: 77 });
  g.clock.speed = 1;
  useGame.getState().setGame(g);
  useUI.getState().set({ screen: 'game', view: 'tank', focusedTankId: g.tankOrder[0] });
  useUI.setState({ toasts: [] });
}

const slowdownToasts = () => useUI.getState().toasts.filter((t) => t.text === starvationSlowdownText(['Ember']));

beforeEach(() => {
  mode.failPublish = false;
  resetFastMutate();
  useGame.getState().setGame(null);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  mode.failPublish = false;
});

describe('B-013: the starvation slowdown belongs to a tick that happened', () => {
  it('a published tick that finds starving animals toasts the slowdown', () => {
    start();
    const hour = useGame.getState().game!.clock.hour;
    runTick(1);
    expect(useGame.getState().game!.clock.hour).toBeGreaterThan(hour);
    expect(slowdownToasts()).toHaveLength(1);
  });

  it('a tick that published nothing keeps its hours in the backlog and toasts nothing', () => {
    start();
    const before = useGame.getState().game!;
    mode.failPublish = true;
    const backlog = runTick(1);
    expect(useGame.getState().game).toBe(before); // nothing was published
    expect(backlog).toBeGreaterThan(0);
    expect(slowdownToasts()).toEqual([]);
  });
});
