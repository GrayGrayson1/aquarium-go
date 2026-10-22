/**
 * Run a player action (a command) through the game store's dispatcher, toast the result and play a sound. OWNER: lane
 * "ui-panels". The result comes to `opts.after` (at once in a solo game; when its step arrives in a shared shop).
 *
 *   act({ k: 'buyOffer', offer: offerId, tank: tankId }, { sound: 'coin' })
 */
import type { Command, CommandResult } from '@/sim/commands';
import { useGame } from '@/state/game';
import { useUI, type Toast } from '@/state/ui';
import { sfx, type SfxId } from '@/audio/sfx';
import { markUrgent } from './hooks';
import { toastCaution } from '@/ui/common/actions'; // lane:qa-r3
import { APPLIED_UNSEEN } from '@/ui/shared/dispatch';

export interface ActOptions {
  /** Sound on success (default 'confirm'). */
  sound?: SfxId | null;
  /** Toast kind on success (default 'success'). */
  kind?: Toast['kind'];
  /** Override the success toast text. */
  successText?: string;
  /** Don't toast on success (still toasts failures, and results with a caution — lane:qa-r3). */
  quiet?: boolean;
  /** lane:qa-r3 — debounce caution toasts per control (a slider drag ends in one toast; see toastCaution). */
  cautionKey?: string;
  /** chunk 11 — what to do with the result once it's in (after the toast). Null: it failed, or no game was loaded. */
  after?: (r: CommandResult | null) => void;
}

export function act(cmd: Command, opts: ActOptions = {}): void {
  const settle = (res: CommandResult | null, err: unknown): void => {
    const ui = useUI.getState();
    if (err || !res) {
      if (err && import.meta.env.DEV) console.warn('[panels] action failed', err);
      ui.toast(useGame.getState().game ? 'That didn’t work — please try again.' : 'No game loaded.', 'warning');
      sfx('error');
      opts.after?.(null);
      return;
    }
    // chunk 13: applied in steps a re-synced shared copy skipped, its own result unseen: no sound or toast to claim one
    if (res === APPLIED_UNSEEN) {
      opts.after?.(res);
      return;
    }
    // an action that returns nothing (a toggle) reads as an empty success, as its closure's did
    const r: CommandResult = res.noResult ? { ...res, message: '' } : res;
    if (r.ok) {
      if (opts.sound !== null) sfx(opts.sound ?? 'confirm');
      // lane:qa-r3 — a result with a caution always shows its own message as a warning, even from a quiet control
      if (r.caution && r.message) toastCaution(r.message, opts.cautionKey);
      else {
        if (opts.cautionKey) toastCaution(null, opts.cautionKey);
        const text = opts.successText ?? r.message;
        if (!opts.quiet && text) ui.toast(text, opts.kind ?? 'success');
      }
    } else {
      sfx('error');
      ui.toast(r.message || 'Not possible right now.', 'warning');
    }
    opts.after?.(r);
  };
  // Errors propagate out of the store's write so a half-applied action is discarded, never committed. Only an error
  // thrown before the result came back is the action's: one thrown by the toast or `after` isn't.
  const sync: { got: boolean; res: CommandResult | null } = { got: false, res: null };
  let inDispatch = true;
  let err: unknown = null;
  markUrgent(true);
  try {
    useGame.getState().dispatch(cmd, (res) => {
      if (inDispatch) {
        sync.got = true;
        sync.res = res;
      } else settle(res, null);
    });
  } catch (e) {
    if (!sync.got) err = e ?? new Error('action failed');
  } finally {
    inDispatch = false;
    markUrgent(false);
  }
  if (err) settle(null, err);
  else if (sync.got) settle(sync.res, null);
}

/**
 * A silent player action (no toast or sound) — for simple settings like names, budgets or a bid's hold. lane:ui-shell
 * (B-179) — one that throws is discarded whole and logged, never thrown at the caller (an interval would rethrow it
 * every 15 s).
 */
export function edit(cmd: Command): void {
  markUrgent(true);
  try {
    useGame.getState().dispatch(cmd);
  } catch (e) {
    console.warn('[panels] edit failed; nothing was changed', e);
  } finally {
    markUrgent(false);
  }
}

export const toast = (text: string, kind: Toast['kind'] = 'info') => useUI.getState().toast(text, kind);
