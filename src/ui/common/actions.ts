/**
 * Glue for calling sim mutators from UI: run through `mutate`, toast the ActionResult, play a sound, and fire
 * tutorial flags. OWNER: lane "ui-shell".
 */
import type { GameState } from '@/types';
import type { ActionResult } from '@/sim/care';
import { useGame } from '@/state/game';
import { useUI, type Toast } from '@/state/ui';
import { sfx, type SfxId } from '@/audio/sfx';
import { tutorialAdvance, tutorialWants } from '@/sim/facility';

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
  /** Tutorial flag to fire on success. */
  flag?: string;
  /** lane:guide — pick the success toast's kind from the result (a move that worked but left eggs behind is a warning). */
  kindFor?: (r: ActionResult) => Toast['kind'] | undefined;
}

/** Run a domain action through `mutate`. Returns its result (or null when there is no game). */
export function act(fn: (d: GameState) => ActionResult | void | undefined, opts: ActOptions = {}): ActionResult | null {
  const store = useGame.getState();
  const ui = useUI.getState();
  if (!store.game) {
    // lane:guide — never a silent no-op: say why nothing happened
    ui.toast('No aquarium is loaded right now.', 'warning');
    return null;
  }
  let result: ActionResult | null = null;
  let error: unknown = null;
  try {
    // lane:guide — the action's errors escape immer's produce, so a half-applied action is discarded rather than
    // committed (it used to be caught inside the recipe, saving partial changes — a retry could pay twice).
    store.mutate((d) => {
      const r = fn(d);
      result = r ?? { ok: true, message: opts.message ?? 'Done' };
    });
  } catch (e) {
    error = e;
  }
  // lane:ui-shell (B-179) — the guide's step runs in its own mutate once the action has committed: a throw there
  // discards only the guide's half-made changes (it used to be caught inside the action's recipe and committed).
  const flag = opts.flag;
  if (!error && (result as ActionResult | null)?.ok && flag) {
    try {
      store.mutate((d) => {
        if (!d.isShowcase) tutorialAdvance(d, flag);
      });
    } catch {
      /* the guide is optional */
    }
  }
  if (error || !result) {
    console.warn('[ui] action failed', error);
    ui.toast('That didn’t work, and nothing was changed. Please try again.', 'danger');
    sfx('error');
    return { ok: false, message: 'Error' };
  }
  const r = result as ActionResult;
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
  return r;
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
  useGame.getState().mutate((d) => {
    try {
      tutorialAdvance(d, flag);
    } catch {
      /* ignore */
    }
  });
}
