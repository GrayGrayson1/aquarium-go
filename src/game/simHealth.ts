/**
 * lane:core (chunk 6; B-002, ADR-0029 decision 1) — when the simulation keeps failing, stop it and say so. OWNER: core.
 *
 * A tick that throws publishes nothing (mutateFast is atomic), so the store keeps the last good world. Before this, a
 * step that kept throwing froze the aquarium with one console line and no word to the player. Now, after
 * FAILURES_TO_STOP failed ticks in a row (under a second at 4 Hz; one good tick resets the count), the loop stops
 * ticking and the UI shows "Something went wrong — your aquarium is paused. Save and reload." with Save (the last good
 * world) and Reload. Another aquarium coming on screen (a load, a new game) starts the loop again.
 *
 * `setSimFault` makes every tick fail: a seam for the dev tools and tests (`__AQ.dev.failSim`, ?dev=1 only).
 */
import { create } from 'zustand';
import { useGame } from '@/state/game';

export const FAILURES_TO_STOP = 3;

export const useSimHealth = create<{ stopped: boolean }>(() => ({ stopped: false }));

let streak = 0;
let fault = false;

/** The loop is stopped: a step kept failing. */
export const simStopped = (): boolean => useSimHealth.getState().stopped;

export function noteTickFailed(): void {
  streak++;
  if (streak >= FAILURES_TO_STOP && !simStopped()) useSimHealth.setState({ stopped: true });
}

export function noteTickOk(): void {
  streak = 0;
}

/** Start again (another aquarium, or tests). */
export function resumeSim(): void {
  streak = 0;
  if (simStopped()) useSimHealth.setState({ stopped: false });
}

/** Dev tools and tests: every tick throws while on. */
export function setSimFault(on: boolean): void {
  fault = on;
}

/** Called inside the tick's recipe: throws while the dev fault is on. */
export function checkSimFault(): void {
  if (fault) throw new Error('Simulated failure (developer tools)');
}

// another aquarium on screen (a load, a new game, the title's showcase giving way) gets a running loop
useGame.subscribe((s, prev) => {
  if (s.game?.saveId !== prev.game?.saveId) resumeSim();
});
