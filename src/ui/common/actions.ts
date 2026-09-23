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
  /** Toast on success (default true). */
  toast?: boolean;
  /** Toast kind on success. */
  kind?: Toast['kind'];
  sound?: SfxId;
  /** Override the success message. */
  message?: string;
  /** Tutorial flag to fire on success. */
  flag?: string;
}

/** Run a domain action through `mutate`. Returns its result (or null when there is no game). */
export function act(fn: (d: GameState) => ActionResult | void | undefined, opts: ActOptions = {}): ActionResult | null {
  const store = useGame.getState();
  if (!store.game) return null;
  let result: ActionResult | null = null;
  let error: unknown = null;
  store.mutate((d) => {
    try {
      const r = fn(d);
      result = r ?? { ok: true, message: opts.message ?? 'Done' };
      if (result.ok && opts.flag && !d.isShowcase) {
        try {
          tutorialAdvance(d, opts.flag);
        } catch {
          /* tutorial lane mid-edit */
        }
      }
    } catch (e) {
      error = e;
    }
  });
  const ui = useUI.getState();
  if (error || !result) {
    console.warn('[ui] action failed', error);
    ui.toast('That didn’t work — please try again.', 'danger');
    sfx('error');
    return { ok: false, message: 'Error' };
  }
  const r = result as ActionResult;
  if (r.ok) {
    if (opts.toast !== false) ui.toast(opts.message ?? r.message, opts.kind ?? 'success');
    sfx(opts.sound ?? 'confirm');
  } else {
    ui.toast(r.message || 'Not possible right now.', 'warning');
    sfx('error');
  }
  return r;
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
