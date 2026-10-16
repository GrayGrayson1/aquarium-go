// @vitest-environment node
/**
 * lane:core (chunk 6; B-002, ADR-0029 decision 1) — a simulation that keeps failing stops and says so: after three
 * failed ticks in a row (one good tick resets the count) the loop stops ticking, the store keeps the last good world,
 * and the banner reads "Something went wrong — your aquarium is paused. Save and reload." with Save and Reload; another
 * aquarium coming on screen starts the loop again. A stopped aquarium doesn't catch up when its tab comes back either.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { catchUpOnReturn, runTick } from '@/game/GameLoop';
import { resetFastMutate } from '@/game/fastMutate';
import { FAILURES_TO_STOP, resumeSim, setSimFault, simStopped, useSimHealth } from '@/game/simHealth';
import { loopStats } from '@/game/loopStats';
import { newGame } from '@/sim/newGame';
import { stateHash } from '@/persistence';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { SIM_FAILURE_TEXT, SimFailureBanner } from '@/ui/common/SimFailureBanner';

function start(seed = 41): void {
  const g = newGame({ starterId: 'betta', starterName: 'Tick', seed });
  g.clock.speed = 1;
  useGame.getState().setGame(g);
  useUI.getState().set({ screen: 'game', view: 'tank', focusedTankId: g.tankOrder[0] });
}

beforeEach(() => {
  resetFastMutate();
  setSimFault(false);
  resumeSim();
  start();
});
afterEach(() => {
  setSimFault(false);
  resumeSim();
});

describe('a simulation that keeps failing (B-002)', () => {
  it('stops after three failed ticks in a row, keeping the last good world', () => {
    expect(FAILURES_TO_STOP).toBe(3);
    runTick(1);
    const good = stateHash(useGame.getState().game!);
    const hour = useGame.getState().game!.clock.hour;
    const errors = loopStats.errors;
    setSimFault(true);
    runTick(1);
    runTick(1);
    expect(simStopped()).toBe(false);
    runTick(1);
    expect(simStopped()).toBe(true);
    expect(loopStats.errors).toBe(errors + 3);
    // nothing of the failed ticks reached the store, and a stopped loop doesn't tick (or fail) again
    expect(useGame.getState().game!.clock.hour).toBe(hour);
    expect(stateHash(useGame.getState().game!)).toBe(good);
    setSimFault(false);
    expect(runTick(1)).toBe(0);
    expect(useGame.getState().game!.clock.hour).toBe(hour);
    expect(loopStats.errors).toBe(errors + 3);
  });

  it('a good tick between failures resets the count', () => {
    for (let i = 0; i < 4; i++) {
      setSimFault(true);
      runTick(1);
      runTick(1);
      setSimFault(false);
      runTick(1);
    }
    expect(simStopped()).toBe(false);
  });

  it('another aquarium on screen starts the loop again', () => {
    setSimFault(true);
    for (let i = 0; i < FAILURES_TO_STOP; i++) runTick(1);
    expect(simStopped()).toBe(true);
    setSimFault(false);
    start(42);
    expect(simStopped()).toBe(false);
    const hour = useGame.getState().game!.clock.hour;
    runTick(1);
    expect(useGame.getState().game!.clock.hour).toBeGreaterThan(hour);
  });

  it('a stopped aquarium doesn’t catch up when its tab comes back (a running one does)', () => {
    setSimFault(true);
    for (let i = 0; i < FAILURES_TO_STOP; i++) runTick(1);
    setSimFault(false);
    const away = 20 * 60_000;
    const g = useGame.getState().game!;
    g.isShowcase = false;
    g.lastTickRealMs = Date.now() - away; // the tab went dark twenty minutes ago
    const hour = g.clock.hour;
    catchUpOnReturn(away);
    expect(useGame.getState().game!.clock.hour).toBe(hour);
    resumeSim();
    catchUpOnReturn(away);
    expect(useGame.getState().game!.clock.hour).toBeGreaterThan(hour);
  });

  it('the banner: the owner’s words, Save and Reload, announced; only while stopped, in the game', () => {
    expect(SIM_FAILURE_TEXT).toBe('Something went wrong — your aquarium is paused. Save and reload.');
    const render = (stopped: boolean, screen: 'game' | 'title') => {
      Object.assign(useSimHealth.getInitialState(), { stopped });
      Object.assign(useUI.getInitialState(), { screen });
      return renderToStaticMarkup(createElement(SimFailureBanner));
    };
    const out = render(true, 'game');
    expect(out).toContain('role="alert"');
    expect(out).toContain(SIM_FAILURE_TEXT);
    expect(out).toMatch(/data-testid="sim-failure-save"[^>]*>.*Save<\/button>/);
    expect(out).toMatch(/data-testid="sim-failure-reload"[^>]*>.*Reload<\/button>/);
    expect(render(false, 'game')).toBe('');
    expect(render(true, 'title')).toBe('');
    Object.assign(useSimHealth.getInitialState(), { stopped: false });
    Object.assign(useUI.getInitialState(), { screen: 'boot' });
  });
});
