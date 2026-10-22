/**
 * The solo dispatcher (SHARED-SHOPS.md §4.2): a player action, now a command, applied at once through the store, the
 * way `act` applied its closure, so the solo game behaves as before. Importing this module installs it (the `act`
 * helpers import it); a shared shop installs its own while one is open (chunk 13), which sends the command and settles
 * the result when its step arrives.
 *
 * - The action runs in one `mutate`: a throw discards it whole (Immer) and escapes to the caller, as before.
 * - Its guide flag runs in a `mutate` of its own once the action has committed, and a throw there drops only the
 *   guide's half-made changes (B-179).
 * - Hold all, Resume all and one system's hold first catch the background tanks up on the plain working copy: the
 *   hold functions settle the tanks themselves (ADR-0026 decision 5), but inside the action's Immer draft that step is
 *   15–60× slower (`flushBackgroundTanks`). A shared shop doesn't: its command settles them inside the step.
 */
import { applyAction, applyFlag, type CommandResult } from '@/sim/commands';
import { useGame, type Dispatch } from '@/state/game';
import { flushBackgroundTanks } from './fastMutate';

const HOLDS: ReadonlySet<string> = new Set(['holdAll', 'resumeAll', 'setHold']);

export const soloDispatch: Dispatch = (cmd, done) => {
  const store = useGame.getState();
  if (!store.game) {
    done?.(null);
    return null;
  }
  if (HOLDS.has(cmd.k)) flushBackgroundTanks();
  const out: { res: CommandResult | null } = { res: null };
  store.mutate((d) => {
    out.res = applyAction(d, cmd);
  });
  const res = out.res ?? { ok: true, message: '', noResult: true };
  const flag = cmd.flag;
  if (res.ok && flag) {
    try {
      useGame.getState().mutate((d) => applyFlag(d, flag));
    } catch {
      /* the guide is optional */
    }
  }
  done?.(res);
  return res;
};

useGame.getState().installDispatch(soloDispatch);
