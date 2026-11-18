/**
 * Audit 2026-11-17, the review of I2: every in-app Reload (the update prompt, the simulation's failure banner, the
 * shared shop's closing card, the crash cards) asks first in the game's own words when it would lose play: with Autosave
 * off nothing saves on leaving, and iPhone and iPad Safari never show the browser's "Leave site?". The question is
 * ReloadConfirm.tsx (the crash cards ask inline: the interface behind them may be what broke). OWNER: lane "ui-shell".
 */
import { create } from 'zustand';
import { allowLeave, leaveWouldLose } from '@/game/useAutosave';
import { saveCurrentGame } from '@/persistence';

export const RELOAD_WORDS = {
  offLine: 'Autosave is off, so reloading loses your play since the last save.',
  saveAndReload: 'Save now and reload',
  reloadAnyway: 'Reload anyway',
  /** The update prompt's approved line. */
  saveFailed: 'Saving didn’t work, so a reload would lose your latest play.',
} as const;

/** The question is up; `failed`: the save it offered didn't land. */
export const useReloadAsk = create<{ open: boolean; failed: boolean; busy: boolean }>(() => ({ open: false, failed: false, busy: false }));

const reloadPage = (): void => {
  if (typeof location !== 'undefined') location.reload();
};

/** Reload, or (it would lose play) ask first. */
export function guardedReload(): void {
  if (leaveWouldLose()) {
    useReloadAsk.setState({ open: true, failed: false, busy: false });
    return;
  }
  reloadPage();
}

/**
 * "Save now and reload": the game on screen into the autosave slot, whatever the switch says (the player asked), then
 * the reload. False (nothing reloaded) when the save didn't land.
 */
export async function saveThenReload(): Promise<boolean> {
  try {
    const r = await saveCurrentGame('auto', { flush: true, toast: false });
    // a scenario lab world is never saved over the autosave, and a tab another tab played further isn't either: as Load
    if (!r.ok && r.code !== 'scenario' && r.code !== 'stale') return false;
  } catch {
    return false;
  }
  allowLeave();
  reloadPage();
  return true;
}

/** "Reload anyway": the player chose to lose it (the browser needn't ask again). */
export function reloadAnyway(): void {
  allowLeave();
  reloadPage();
}
