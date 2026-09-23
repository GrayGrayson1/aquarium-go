/**
 * Saving the running game (manual + autosave). OWNER: lane "core".
 */
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { flushSimDebt } from '@/sim/world';
import { saveGame } from './slots';
import { mutateFast } from '@/game/fastMutate';
import type { SaveResult } from './types';

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
  const res = await saveGame(g, slot);
  if (res.ok) {
    // Record the save time in the live state too (not a sim change; keeps "last saved" displays honest).
    useGame.getState().mutate((d) => {
      d.lastSavedRealMs = Date.now();
    });
  }
  if (opts.toast) {
    try {
      useUI.getState().toast(res.ok ? (slot === 'auto' ? 'Game saved' : `Saved to ${slotLabel(slot)}`) : res.message, res.ok ? 'success' : 'danger');
    } catch {
      /* ignore */
    }
  }
  return res;
}

export function slotLabel(slot: string): string {
  if (slot === 'auto') return 'Autosave';
  const m = /^slot(\d+)$/.exec(slot);
  return m ? `Slot ${m[1]}` : slot;
}
