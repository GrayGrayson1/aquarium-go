/**
 * Saving the running game (manual + autosave). OWNER: lane "core".
 */
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { flushSimDebt } from '@/sim/world';
import { saveGame, saveGameSync, parseSlotRef } from './slots';
import { useResume } from './offline';
import { mutateFast } from '@/game/fastMutate';
import type { GameState } from '@/types';
import type { SaveResult } from './types';

/**
 * lane:fix3-saves (R03-03) — the welcome-back card pauses the clock only while it is open: a save taken meanwhile
 * (the player glanced and left) stores the speed the card will resume, or the next absence would pass no time at all
 * and come back silently paused.
 */
function forSaving(g: GameState): GameState {
  const resume = useResume.getState().summary?.resumeSpeed;
  if (!resume || g.clock.speed !== 0) return g;
  return { ...g, clock: { ...g.clock, speed: resume as GameState['clock']['speed'] } };
}

export interface SaveCurrentOptions {
  /** Resolve background tanks' pending sim debt first so the save reflects "now" (default true). */
  flush?: boolean;
  /** Toast the outcome (default false — autosave is silent; the Settings "Save" button passes true). */
  toast?: boolean;
}

/** Save the game currently in the store. Showcase worlds are skipped. */
export async function saveCurrentGame(slot = 'auto', opts: SaveCurrentOptions = {}): Promise<SaveResult> {
  const { game } = useGame.getState();
  if (!game) return { ok: false, slot, message: 'No game running.' };
  if (game.isShowcase) return { ok: false, slot, message: 'Showcase worlds are not saved.' };
  if (opts.flush !== false) {
    try {
      mutateFast((d) => {
        flushSimDebt(d);
        d.lastTickRealMs = Date.now();
      });
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[aquarium-go] flush before save failed', e);
    }
  }
  const g = useGame.getState().game;
  if (!g) return { ok: false, slot, message: 'No game running.' };
  const res = await saveGame(forSaving(g), slot);
  if (res.ok) {
    // Record the save time in the live state too (not a sim change; keeps "last saved" displays honest).
    useGame.getState().mutate((d) => {
      d.lastSavedRealMs = Date.now();
    });
  }
  if (opts.toast) {
    try {
      // lane:fix-core (S06-08) — a write that only reached memory is not "saved": say so, as a warning.
      if (res.ok && res.degraded) useUI.getState().toast(res.message, 'warning');
      else useUI.getState().toast(res.ok ? (slot === 'auto' ? 'Game saved' : `Saved to ${slotLabel(slot)}`) : res.message, res.ok ? 'success' : 'danger');
    } catch {
      /* ignore */
    }
  }
  return res;
}

/**
 * lane:fix-core (P5-01) — synchronous emergency save for pagehide / hidden: flushes background tanks and writes the
 * record straight into localStorage (see slots.saveGameSync). Returns whether it was written.
 */
export function saveCurrentGameSync(slot = 'auto'): boolean {
  const { game } = useGame.getState();
  if (!game || game.isShowcase) return false;
  try {
    mutateFast((d) => {
      flushSimDebt(d);
      d.lastTickRealMs = Date.now();
    });
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[aquarium-go] flush before save failed', e);
  }
  const g = useGame.getState().game;
  if (!g) return false;
  try {
    return saveGameSync(forSaving(g), slot);
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[aquarium-go] emergency save failed', e);
    return false;
  }
}

export function slotLabel(ref: string): string {
  const { slot, backup } = parseSlotRef(ref);
  if (backup) return slot === 'auto' ? 'Previous autosave' : `Previous copy of ${slotLabel(slot)}`;
  if (slot === 'auto') return 'Autosave';
  const m = /^slot(\d+)$/.exec(slot);
  return m ? `Slot ${m[1]}` : slot;
}
