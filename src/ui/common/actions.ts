/**
 * Glue for player actions from the UI: send the action as a command through the store's dispatcher (chunk 11,
 * SHARED-SHOPS.md §4.2), then toast its result, play a sound, and raise its tutorial flag. OWNER: lane "ui-shell".
 */
import type { Command, CommandResult } from '@/sim/commands';
import type { ActionResult } from '@/sim/care';
import { useGame } from '@/state/game';
import { useUI, type Toast } from '@/state/ui';
import { sfx, type SfxId } from '@/audio/sfx';
import { tutorialWants } from '@/sim/facility';
import '@/game/dispatch'; // installs the solo dispatcher
import { APPLIED_UNSEEN } from '@/ui/shared/dispatch'; // chunk 13

export interface ActOptions {
  /**
   * Toast on success (default true). `'caution'`: only when the result carries a warning (`ActionResult.caution` — a
   * feed nothing eats, a setpoint outside the animals' range), for actions that are otherwise quiet (lane:qa-r3).
   */
  toast?: boolean | 'caution';
  /**
   * lane:qa-r3 — debounce caution toasts per control: a run of stepper clicks or a slider drag ends in ONE toast about
   * the final setting (and a later result without a caution cancels a pending one).
   */
  cautionKey?: string;
  /** Toast kind on success. */
  kind?: Toast['kind'];
  /** Sound on success (default 'confirm'); null for none (a slider drag fires per pixel). */
  sound?: SfxId | null;
  /** Override the success message. */
  message?: string;
  /** Tutorial flag to fire on success (it rides in the command). */
  flag?: string;
  /** lane:guide — pick the success toast's kind from the result (a move that worked but left eggs behind is a warning). */
  kindFor?: (r: ActionResult) => Toast['kind'] | undefined;
  /**
   * chunk 11 — what to do with the result once it's in (after the toasts): at once in a solo game, when its step
   * arrives in a shared shop. Null: no aquarium was loaded.
   */
  after?: (r: CommandResult | null) => void;
}

/** Run a player action (a command). The result comes to `opts.after`; nothing is returned (§4.2). */
export function act(cmd: Command, opts: ActOptions = {}): void {
  const store = useGame.getState();
  const ui = useUI.getState();
  if (!store.game) {
    // lane:guide — never a silent no-op: say why nothing happened
    ui.toast('No aquarium is loaded right now.', 'warning');
    opts.after?.(null);
    return;
  }
  const settle = (res: CommandResult | null, error: unknown): void => {
    if (error || !res) {
      console.warn('[ui] action failed', error);
      ui.toast('That didn’t work, and nothing was changed. Please try again.', 'danger');
      sfx('error');
      opts.after?.({ ok: false, message: 'Error' });
      return;
    }
    // chunk 13: applied in steps a re-synced shared copy skipped, its own result unseen: no sound or toast to claim one
    if (res === APPLIED_UNSEEN) {
      opts.after?.(res);
      return;
    }
    // an action that returns nothing (a toggle) reads as done, as its closure's empty result did
    const r: CommandResult = res.noResult ? { ...res, message: opts.message ?? 'Done' } : res;
    if (r.ok) {
      // lane:qa-r3 — a result with a caution always shows its own message (never the caller's override) as a warning
      if (r.caution && opts.toast !== false) toastCaution(r.message, opts.cautionKey);
      else {
        if (opts.cautionKey) toastCaution(null, opts.cautionKey);
        if (opts.toast !== false && opts.toast !== 'caution') ui.toast(opts.message ?? r.message, opts.kindFor?.(r) ?? opts.kind ?? 'success');
      }
      if (opts.sound !== null) sfx(opts.sound ?? 'confirm');
    } else {
      ui.toast(r.message || 'Not possible right now.', 'warning');
      sfx('error');
    }
    opts.after?.(r);
  };
  // lane:guide — the action's errors escape the store's write, so a half-applied action is discarded rather than
  // committed; lane:ui-shell (B-179) — its guide flag is raised in a write of its own once the action has committed
  // (src/game/dispatch.ts)
  const c: Command = opts.flag ? { ...cmd, flag: opts.flag } : cmd;
  // only an error thrown before the result came back is the action's: one thrown by the toasts or `after` isn't
  const sync: { got: boolean; res: CommandResult | null } = { got: false, res: null };
  let inDispatch = true;
  try {
    store.dispatch(c, (res) => {
      if (inDispatch) {
        sync.got = true;
        sync.res = res;
      } else settle(res, null);
    });
  } catch (e) {
    if (!sync.got) {
      inDispatch = false;
      settle(null, e);
      return;
    }
  }
  inDispatch = false;
  if (sync.got) settle(sync.res, null);
}

const cautionTimers = new Map<string, number>();
const CAUTION_DEBOUNCE_MS = 650;

/**
 * lane:qa-r3 — toast an action's warning. With a `key`, wait until that control has been still for a moment (the last
 * message wins); `text` null cancels a pending one. Shared by the panels' `act` (src/ui/panels/common/act.ts).
 */
export function toastCaution(text: string | null, key?: string): void {
  if (!key) {
    if (text) useUI.getState().toast(text, 'warning');
    return;
  }
  const pending = cautionTimers.get(key);
  if (pending !== undefined) window.clearTimeout(pending);
  cautionTimers.delete(key);
  if (!text) return;
  cautionTimers.set(
    key,
    window.setTimeout(() => {
      cautionTimers.delete(key);
      useUI.getState().toast(text, 'warning');
    }, CAUTION_DEBOUNCE_MS),
  );
}

const firedFlags = new Set<string>();

/** Fire a tutorial flag once per session (cheap to call repeatedly from effects/handlers). */
export function tutorialFlag(flag: string): void {
  const g = useGame.getState().game;
  if (!g || g.isShowcase) return;
  // Re-fire whenever the CURRENT tutorial step still wants this flag (steps only count flags raised after they
  // began). Otherwise fire once per save so ordinary UI use doesn't spam mutations.
  let wanted = false;
  try {
    wanted = tutorialWants(g, flag);
  } catch {
    wanted = false;
  }
  const key = `${g.saveId}:${flag}`;
  if (!wanted && (firedFlags.has(key) || g.progress?.tutorial?.flags?.[flag])) return;
  firedFlags.add(key);
  // lane:ui-shell (B-179) — a throw discards the guide's half-made changes (the dispatcher's write is atomic)
  try {
    useGame.getState().dispatch({ k: 'raiseFlag', name: flag });
  } catch {
    /* the guide is optional */
  }
}
