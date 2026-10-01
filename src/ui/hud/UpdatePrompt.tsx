/**
 * "A new version of Aquarium Go is ready — Reload": shown at the head of the toast column when the deployed build is
 * newer than the one this tab runs (see updateCheck.ts). It stays until the player reloads; Reload saves the running
 * aquarium first (the same autosave the game makes), then reloads. Never checks in dev builds or while offline.
 * OWNER: lane "ui-shell".
 */
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { useUI } from '@/state/ui';
import { saveCurrentGame } from '@/persistence';
import { autosaveAllowed } from '@/game/useAutosave';
import { Button } from '@/ui/kit';
import { BUILD_ID, CHECK_EVERY_MS, FIRST_CHECK_MS, checkGate, fetchLiveBuildId, isNewBuild } from './updateCheck';

/**
 * Polls version.json: a first look shortly after launch, then every few minutes and whenever the player comes back
 * (the tab shown again, the window focused from another app, back online).
 */
export function useNewBuildAvailable(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (BUILD_ID === 'dev') return;
    let stopped = false;
    const gate = checkGate(() => {
      if (stopped || document.visibilityState !== 'visible') return;
      void fetchLiveBuildId(import.meta.env.BASE_URL).then((live) => {
        if (!stopped && isNewBuild(BUILD_ID, live)) {
          stopped = true;
          setReady(true);
        }
      });
    });
    const check = () => {
      if (!stopped && document.visibilityState === 'visible') gate.ask();
    };
    const first = window.setTimeout(check, FIRST_CHECK_MS);
    const every = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    return () => {
      stopped = true;
      gate.cancel();
      window.clearTimeout(first);
      window.clearInterval(every);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
    };
  }, []);
  return ready;
}

/** Rendered by Toasts (at the head of its column, so the two never overlap) once useNewBuildAvailable() says so. */
export function UpdatePrompt() {
  // cinematic modes stay clean: the prompt waits until the player is back
  const quiet = useUI((s) => s.hudHidden || s.photoMode || s.screen === 'boot');
  const [busy, setBusy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  if (quiet) return null;

  const reload = async () => {
    setBusy(true);
    if (!saveFailed && autosaveAllowed()) {
      let ok = false;
      try {
        ok = (await saveCurrentGame('auto', { flush: true, toast: false })).ok;
      } catch {
        ok = false;
      }
      if (!ok) {
        // never lose play silently: say so, and let a second press reload anyway
        setSaveFailed(true);
        setBusy(false);
        return;
      }
    }
    window.location.reload();
  };

  return (
    <motion.div
      className="ag-update"
      role="status"
      data-testid="update-prompt"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
    >
      <span className="ag-update__icon" aria-hidden>
        <RefreshCw size={14} />
      </span>
      <span className="ag-update__text">{saveFailed ? 'Saving didn’t work, so a reload would lose your latest play.' : 'A new version of Aquarium Go is ready.'}</span>
      <Button size="sm" variant="primary" disabled={busy} onClick={() => void reload()} data-testid="update-reload">
        {saveFailed ? 'Reload anyway' : 'Reload'}
      </Button>
    </motion.div>
  );
}
