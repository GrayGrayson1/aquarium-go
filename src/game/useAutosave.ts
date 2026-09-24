/**
 * Autosave: every AUTOSAVE_INTERVAL_MS of visible real time while in the game, plus when the tab is hidden and on
 * pagehide. Skips showcase worlds and worlds booted from a `?fixture=` / `?showcase=` URL (so dev fixtures and QA runs
 * never overwrite the player's autosave; add `&autosave=1` to opt in). Respects settings.autosave.
 * OWNER: lane "core".
 */
import { useEffect } from 'react';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { saveCurrentGame } from '@/persistence/session';
import { loopStats } from './loopStats';

export const AUTOSAVE_INTERVAL_MS = 60_000;
/** Don't autosave again on hide if we saved this recently. */
const MIN_GAP_MS = 4_000;

let fixtureSaveId: string | null = null;
let saving = false;
let lastSaveAt = 0;

function bootedFromFixture(): boolean {
  if (typeof location === 'undefined') return false;
  const q = new URLSearchParams(location.search);
  return (q.has('fixture') || q.has('showcase')) && q.get('autosave') !== '1';
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

/** Autosave right now (if allowed). Resolves to whether a save was written. */
export async function autosaveNow(reason = 'manual'): Promise<boolean> {
  if (saving || !autosaveAllowed()) return false;
  saving = true;
  try {
    const res = await saveCurrentGame('auto', { flush: true, toast: false });
    lastSaveAt = performance.now();
    loopStats.lastAutosaveAt = Date.now();
    loopStats.lastAutosaveOk = res.ok;
    if (res.ok) loopStats.autosaves++;
    else if (typeof console !== 'undefined') console.warn(`[aquarium-go] autosave (${reason}) failed: ${res.message}`);
    return res.ok;
  } catch (e) {
    if (typeof console !== 'undefined') console.warn(`[aquarium-go] autosave (${reason}) threw`, e);
    return false;
  } finally {
    saving = false;
  }
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

    lastSaveAt = performance.now();
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
        if (performance.now() - lastSaveAt > MIN_GAP_MS) void autosaveNow('hidden');
      } else {
        visibleSince = performance.now();
      }
    };
    const onPageHide = () => {
      if (performance.now() - lastSaveAt > MIN_GAP_MS) void autosaveNow('pagehide');
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
