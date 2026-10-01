/**
 * lane:guide — one clear message when a save fails to open. `loadIntoGame` already toasts the specific reason when it
 * knows one; the screens used to add a generic "could not be opened" on top (two toasts for one failure). Mark the
 * toast queue before loading, then call `reportLoadFailure` only if nothing explained the failure meanwhile.
 */
import { useUI } from '@/state/ui';

/** The newest toast id right now (pass to `reportLoadFailure` after a failed load). */
export function toastMark(): number {
  const ts = useUI.getState().toasts;
  return ts.length ? ts[ts.length - 1].id : -1;
}

/** Toast a generic failure unless a warning/danger toast already explained it since `mark`. */
export function reportLoadFailure(mark: number): void {
  const ui = useUI.getState();
  if (ui.toasts.some((t) => t.id > mark && (t.kind === 'danger' || t.kind === 'warning'))) return;
  ui.toast('That save could not be opened. Try its previous copy, or an exported file.', 'danger');
}
