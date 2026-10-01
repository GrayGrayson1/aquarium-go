/**
 * Drives the simulation in real time. OWNER: lane "core".
 *
 * - Ticks at 4 Hz (TICK_MS): advances game time by realDt × speed × GAME_HOURS_PER_REAL_SECOND.
 * - Pauses while the tab is hidden and never jumps on resume from a short break. After a long hidden spell
 *   (OFFLINE_HIDDEN_MIN_MS) it runs the same bounded catch-up as loading a save (lane:fix-core P5-09; see
 *   src/persistence/offline.ts), so a backgrounded phone and a closed tab come back to the same aquarium.
 * - One store update per tick (mutateFast: plain working copy + structural sharing, no Immer drafts); inside it the
 *   requested time is split into small advanceWorld slices under a per-tick time budget (TICK_BUDGET_MS). Unfinished
 *   time carries over as a bounded backlog, so 10× never stutters.
 * - The focused tank (tank view) runs at full fidelity; a smoothing pass flushes background tanks whose LOD debt is
 *   close to its threshold while budget remains, spreading their work across ticks instead of spiking.
 * - Fast-forward drops back to 1× when an animal starts starving (lane:fix-core2, see ./starvationGuard.ts).
 * - Mounts the autosave hook.
 */
import { useEffect } from 'react';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { advanceWorld, stepTank, tankLod, type AdvanceOptions } from '@/sim/world';
import { GAME_HOURS_PER_REAL_SECOND, MAX_SUBSTEP_HOURS } from '@/sim/time';
import type { GameState } from '@/types';
import { loopStats } from './loopStats';
import { useAutosave } from './useAutosave';
import { mutateFast } from './fastMutate';
import { catchUpAfterHidden } from '@/persistence/offline';
import { checkStarvation, starvationSlowdownText } from './starvationGuard';

export const TICK_MS = 250;
/** Real milliseconds of sim work allowed per tick before carrying the rest over. */
export const TICK_BUDGET_MS = 10;
/** Largest single advanceWorld slice (game hours). */
const SLICE_HOURS = MAX_SUBSTEP_HOURS / 2;
/** Carried-over game hours are capped (if the sim can't keep up we drop time rather than spiral). */
const MAX_BACKLOG_HOURS = 1.5;
/** Clamp real dt (e.g. a throttled timer) so a single tick never tries to cover more than this. */
const MAX_REAL_DT_S = 1;
/** Smoothing: flush a background tank early once its debt reaches this fraction of its LOD threshold. */
const EARLY_FLUSH_FRACTION = 0.5;
const MAX_EARLY_FLUSHES_PER_TICK = 4;
const LOD_THRESHOLD_H = { reduced: 1, summary: 4 } as const;

let flushCursor = 0;
const seenErrors = new Set<string>();

function reportError(e: unknown) {
  loopStats.errors++;
  const msg = e instanceof Error ? e.message : String(e);
  loopStats.lastError = msg;
  if (seenErrors.has(msg) || seenErrors.size > 8) return;
  seenErrors.add(msg);
  console.error('[aquarium-go] simulation tick failed:', e);
}

/** Flush background tanks whose debt is close to their LOD threshold, round-robin, within the time budget. */
function smoothBackgroundLod(d: GameState, opts: AdvanceOptions, tickStart: number): void {
  const n = d.tankOrder.length;
  if (n < 2) return;
  let flushed = 0;
  for (let i = 0; i < n && flushed < MAX_EARLY_FLUSHES_PER_TICK; i++) {
    if (performance.now() - tickStart > TICK_BUDGET_MS) break;
    const idx = (flushCursor + i) % n;
    const id = d.tankOrder[idx];
    const tank = d.tanks[id];
    if (!tank) continue;
    const lod = tankLod(d, id, opts);
    if (lod === 'full') continue;
    const debt = tank.simDebtHours ?? 0;
    if (debt < LOD_THRESHOLD_H[lod] * EARLY_FLUSH_FRACTION) continue;
    tank.simDebtHours = 0;
    stepTank(d, tank, debt, lod);
    flushed++;
    flushCursor = (idx + 1) % n;
  }
  loopStats.smoothedFlushes += flushed;
}

/** Advance the store's game by one real-time tick. Exported for tests/dev (normally driven by <GameLoop/>). */
export function runTick(realDtSeconds: number, backlogHours = 0): number {
  const game = useGame.getState().game;
  if (!game) return 0;
  const ui = useUI.getState();
  if (ui.screen !== 'game' && !game.isShowcase) return 0;
  if (game.clock.speed === 0) return 0;
  const want = Math.max(0, realDtSeconds) * GAME_HOURS_PER_REAL_SECOND * game.clock.speed + backlogHours;
  const opts: AdvanceOptions = { focusTankId: ui.view === 'tank' ? ui.focusedTankId : null };
  const t0 = performance.now();
  let done = 0;
  let slowedFor = null as string[] | null; // set inside the mutation (no narrowing to null)
  // Plain working copy + structural-sharing publish (see ./fastMutate.ts): ~15× cheaper than an Immer draft.
  try {
    mutateFast((d) => {
      d.lastTickRealMs = Date.now();
      while (want - done > 1e-9) {
        const slice = Math.min(SLICE_HOURS, want - done);
        advanceWorld(d, slice, opts);
        done += slice;
        if (performance.now() - t0 > TICK_BUDGET_MS) break;
      }
      smoothBackgroundLod(d, opts, t0);
      slowedFor = checkStarvation(d);
    });
  } catch (e) {
    reportError(e);
  }
  if (slowedFor) ui.toast(starvationSlowdownText(slowedFor), 'warning');
  const ms = performance.now() - t0;
  loopStats.ticks++;
  loopStats.lastMs = ms;
  loopStats.avgMs = loopStats.avgMs * 0.9 + ms * 0.1;
  loopStats.maxMs = Math.max(loopStats.maxMs * 0.999, ms);
  const left = Math.max(0, want - done);
  if (left > MAX_BACKLOG_HOURS) loopStats.droppedHours += left - MAX_BACKLOG_HOURS;
  const backlog = Math.min(MAX_BACKLOG_HOURS, left);
  loopStats.backlogHours = backlog;
  return backlog;
}

export function GameLoop() {
  useAutosave();
  useEffect(() => {
    let last = performance.now();
    let backlog = 0;
    let hidden = typeof document !== 'undefined' ? document.hidden : false;
    loopStats.hidden = hidden;
    let hiddenAt = hidden ? Date.now() : 0;
    const onVisibility = () => {
      const wasHidden = hidden;
      hidden = document.hidden;
      loopStats.hidden = hidden;
      // Never jump on resume: restart the clock from now and drop any carried time.
      last = performance.now();
      backlog = 0;
      if (hidden) hiddenAt = Date.now();
      else if (wasHidden && hiddenAt) {
        const span = Date.now() - hiddenAt;
        hiddenAt = 0;
        // A long absence catches up (bounded, under the grace period) — the autosave on hide already stored the
        // moment the tab went dark, so a tab the OS discards instead comes back the same way through Continue.
        try {
          catchUpAfterHidden(span);
        } catch (e) {
          reportError(e);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const id = window.setInterval(() => {
      const now = performance.now();
      const realDt = Math.min(MAX_REAL_DT_S, Math.max(0, (now - last) / 1000));
      last = now;
      if (hidden) return;
      const g = useGame.getState().game;
      loopStats.paused = !g || g.clock.speed === 0;
      if (!g || g.clock.speed === 0) {
        backlog = 0;
        return;
      }
      backlog = runTick(realDt, backlog);
    }, TICK_MS);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return null;
}
