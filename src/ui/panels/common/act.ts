/**
 * Run a player action through the game store, toast the result and play a sound. OWNER: lane "ui-panels".
 *
 *   act((d) => buyOffer(d, offerId, tankId), { sound: 'coin' })
 */
import type { GameState } from '@/types';
import { useGame } from '@/state/game';
import { useUI, type Toast } from '@/state/ui';
import { sfx, type SfxId } from '@/audio/sfx';
import { markUrgent } from './hooks';

export interface ActResult {
  ok: boolean;
  message: string;
}

export interface ActOptions {
  /** Sound on success (default 'confirm'). */
  sound?: SfxId | null;
  /** Toast kind on success (default 'success'). */
  kind?: Toast['kind'];
  /** Override the success toast text. */
  successText?: string;
  /** Don't toast on success (still toasts failures). */
  quiet?: boolean;
}

export function act<R extends ActResult>(fn: (d: GameState) => R | void, opts: ActOptions = {}): R | null {
  const out: { res: R | null; err: unknown } = { res: null, err: null };
  markUrgent(true);
  try {
    // Errors propagate out of immer's produce so a half-applied action is discarded, never committed.
    useGame.getState().mutate((d) => {
      const r = fn(d);
      out.res = (r ?? { ok: true, message: '' }) as R;
    });
  } catch (e) {
    out.err = e;
  } finally {
    markUrgent(false);
  }
  const ui = useUI.getState();
  if (out.err || !out.res) {
    if (out.err && import.meta.env.DEV) console.warn('[panels] action failed', out.err);
    ui.toast(useGame.getState().game ? 'That didn’t work — please try again.' : 'No game loaded.', 'warning');
    sfx('error');
    return null;
  }
  const r = out.res;
  if (r.ok) {
    if (opts.sound !== null) sfx(opts.sound ?? 'confirm');
    const text = opts.successText ?? r.message;
    if (!opts.quiet && text) ui.toast(text, opts.kind ?? 'success');
  } else {
    sfx('error');
    ui.toast(r.message || 'Not possible right now.', 'warning');
  }
  return r;
}

/** Silent state edit (no toast/sound) — for simple UI-owned toggles like names or read flags. */
export function edit(fn: (d: GameState) => void): void {
  markUrgent(true);
  try {
    useGame.getState().mutate(fn);
  } finally {
    markUrgent(false);
  }
}

export const toast = (text: string, kind: Toast['kind'] = 'info') => useUI.getState().toast(text, kind);
