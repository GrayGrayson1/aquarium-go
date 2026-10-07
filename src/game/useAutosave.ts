/**
 * Autosave: every AUTOSAVE_INTERVAL_MS of visible real time while in the game, plus when the tab is hidden and on
 * pagehide. Skips showcase worlds and worlds booted from a `?fixture=` / `?showcase=` URL (so dev fixtures and QA runs
 * never overwrite the player's autosave; add `&autosave=1` to opt in, in a dev build or a `?dev=1` session).
 * Respects settings.autosave.
 * OWNER: lane "core".
 */
import { useEffect } from 'react';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { devToolsAllowed } from '@/state/devTools';
import { saveCurrentGame, saveCurrentGameSync } from '@/persistence/session';
import { loopStats } from './loopStats';

export const AUTOSAVE_INTERVAL_MS = 60_000;
/** Don't autosave again on hide if we saved this recently. */
const MIN_GAP_MS = 4_000;
/**
 * lane:fix-core (S06-01) — a save that has not settled after this long releases the in-flight flag so later
 * autosaves are not skipped for the rest of the session (the storage layer times its own operations out sooner).
 */
const SAVE_WATCHDOG_MS = 30_000;
/** Consecutive failed autosaves before the player is told to export a copy. */
const WARN_AFTER_FAILURES = 2;

let fixtureSaveId: string | null = null;
let saving = false;
/** Which autosave call currently owns the `saving` flag (a watchdog-released call must not clear a newer one's). */
let saveSeq = 0;
/**
 * performance.now() of the last real save. Never set by a page load: the 4 s gap is between saves, so leaving a
 * freshly loaded game (a welcome-back catch-up just applied) still saves it, or the next visit replayed the same
 * catch-up. (Nothing is saved before a hydrated game runs: autosaveAllowed() wants the game screen, which a load
 * only shows once its catch-up is applied.)
 */
let lastSaveAt = -Infinity;
let failures = 0;
let warnedFailing = false;

function toastOnce(text: string, kind: 'warning' | 'danger') {
  try {
    useUI.getState().toast(text, kind);
  } catch {
    /* UI store not ready */
  }
}

function bootedFromFixture(): boolean {
  if (typeof location === 'undefined') return false;
  const q = new URLSearchParams(location.search);
  // lane:core (PLAT-005) — a fixture that autosaves (over the player's autosave) is a developer tool: only where they're allowed
  return (q.has('fixture') || q.has('showcase')) && !(q.get('autosave') === '1' && devToolsAllowed());
}

/** Is autosave currently allowed for the running game? */
export function autosaveAllowed(): boolean {
  const g = useGame.getState().game;
  if (!g || g.isShowcase) return false;
  if (fixtureSaveId && g.saveId === fixtureSaveId) return false;
  if (useUI.getState().screen !== 'game') return false;
  if (!useSettings.getState().autosave) return false;
  return true;
}

/**
 * Autosave right now (if allowed). Resolves to whether a save was written.
 *
 * `hidden` / `pagehide` are the moments a page may be torn down before an asynchronous write lands (lane:fix-core
 * P5-01: on reload and navigation the IndexedDB put never happened in any engine), so they first write the record
 * synchronously into localStorage — independent of any save already in flight — and then run the regular save too.
 */
export async function autosaveNow(reason = 'manual'): Promise<boolean> {
  if (!autosaveAllowed()) return false;
  const urgent = reason === 'hidden' || reason === 'pagehide';
  let mirrored = false;
  if (urgent) {
    mirrored = saveCurrentGameSync('auto');
    if (mirrored) {
      lastSaveAt = performance.now();
      loopStats.lastAutosaveAt = Date.now();
      loopStats.lastAutosaveOk = true;
    }
  }
  if (saving) return mirrored;
  saving = true;
  const token = ++saveSeq;
  const watchdog = setTimeout(() => {
    if (!saving || saveSeq !== token) return;
    saving = false;
    if (typeof console !== 'undefined') console.warn(`[aquarium-go] autosave (${reason}) is taking too long — later autosaves will not wait for it`);
  }, SAVE_WATCHDOG_MS);
  try {
    const res = await saveCurrentGame('auto', { flush: true, toast: false });
    lastSaveAt = performance.now();
    loopStats.lastAutosaveAt = Date.now();
    loopStats.lastAutosaveOk = res.ok;
    if (res.ok) {
      loopStats.autosaves++;
      failures = 0;
      if (res.degraded && !warnedFailing) {
        warnedFailing = true;
        toastOnce(res.message, 'warning');
      }
    } else {
      if (typeof console !== 'undefined') console.warn(`[aquarium-go] autosave (${reason}) failed: ${res.message}`);
      // lane:fix-core (P5-04) — another tab played this aquarium further: not a fault. lane:fix3-saves (R03-01) — the
      // player is told by a lasting banner with a choice (StaleTabBanner), not by a toast.
      // lane:core (PERSIST-014, ADR-0016 decision 2) — a newer version of the game wrote this slot: say so once, with
      // its "refresh the page" line, rather than "autosave isn't landing".
      if (res.code === 'too_new') {
        if (!warnedFailing) {
          warnedFailing = true;
          toastOnce(res.message, 'warning');
        }
      } else if (res.code !== 'stale' && ++failures >= WARN_AFTER_FAILURES && !warnedFailing) {
        warnedFailing = true;
        toastOnce('Autosave isn’t landing — export a copy from Settings › Saves to keep your progress safe.', 'danger');
      }
    }
    return res.ok || mirrored;
  } catch (e) {
    if (typeof console !== 'undefined') console.warn(`[aquarium-go] autosave (${reason}) threw`, e);
    if (++failures >= WARN_AFTER_FAILURES && !warnedFailing) {
      warnedFailing = true;
      toastOnce('Autosave isn’t landing — export a copy from Settings › Saves to keep your progress safe.', 'danger');
    }
    return mirrored;
  } finally {
    clearTimeout(watchdog);
    if (saveSeq === token) saving = false;
  }
}

/** Tests: forget the in-flight flag and the warning state. */
export function resetAutosaveState(): void {
  saving = false;
  failures = 0;
  warnedFailing = false;
  lastSaveAt = -Infinity;
}

/** Is a save on leaving (tab hidden / page hide) due, i.e. no real save landed in the last few seconds? */
export function leaveSaveDue(now = performance.now()): boolean {
  return now - lastSaveAt > MIN_GAP_MS;
}

export function useAutosave(): void {
  useEffect(() => {
    // Remember the first game set after a fixture/showcase boot so it is never autosaved.
    const fromFixture = bootedFromFixture();
    let firstSeen = !!useGame.getState().game;
    if (fromFixture && firstSeen) fixtureSaveId = useGame.getState().game!.saveId;
    const unsub = useGame.subscribe((s) => {
      if (!firstSeen && s.game) {
        firstSeen = true;
        if (fromFixture) fixtureSaveId = s.game.saveId;
      }
    });

    let visibleSince = performance.now();
    let accumulatedVisibleMs = 0;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      const now = performance.now();
      accumulatedVisibleMs += now - visibleSince;
      visibleSince = now;
      if (accumulatedVisibleMs >= AUTOSAVE_INTERVAL_MS) {
        accumulatedVisibleMs = 0;
        // lane:pc-perf — the timed save waits for an idle moment between frames (at most 3 s), so its serialize +
        // checksum never lands in the middle of a camera flight or a busy frame on a slower PC
        const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
        if (ric) ric(() => void autosaveNow('interval'), { timeout: 3000 });
        else void autosaveNow('interval');
      }
    }, 5_000);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (leaveSaveDue()) void autosaveNow('hidden');
      } else {
        visibleSince = performance.now();
      }
    };
    const onPageHide = () => {
      if (leaveSaveDue()) void autosaveNow('pagehide');
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      unsub();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);
}
