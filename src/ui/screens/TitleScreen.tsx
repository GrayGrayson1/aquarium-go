/**
 * Title screen: the showcase tank lives behind a cinematic wordmark + a quiet menu. OWNER: lane "ui-shell".
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Play, Sparkles, FolderOpen, Settings as SettingsIcon, ChevronRight, TriangleAlert } from 'lucide-react';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { findSpecies } from '@/data/species';
import { sfx, unlockAudio } from '@/audio/sfx';
import { useOnboarding, loadShowcase, prepareStarters } from './onboarding';
import { listSlots, loadIntoGame, timeAgo, slotLabel, watchSaves, storageNotice, type SaveMeta } from '../common/saves';
import { LoadDialog } from './LoadDialog';
import { speciesName } from '../common/format';
import { Modal, Button } from '../kit';
import { safe, SHORT_LANDSCAPE_QUERY, useIsMobile, useMedia } from '../common/safe';
import { useWarmup } from '@/render/shared/warmup';
import { toastMark, reportLoadFailure } from './loadFeedback'; // lane:guide
import { useShell } from '../common/shellStore';
import { buildDetail, versionLabel } from '../common/version';

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

/** The wordmark / menu entrance waits at most this long for the showcase world (a slow device still gets its menu). */
const ENTRANCE_CAP_MS = 1600;
/** The starter portraits are prepared once the entrance has played (≈1.5 s), and then only in idle time. */
const PREWARM_AFTER_MS = 1600;

/**
 * lane:fix3-ui (R12-01) — building the showcase world is one long main-thread commit (0.3 s on a fast PC), done under
 * the warm-up veil since G4-02, and that now landed in the middle of the wordmark's 1.2 s blur-in: the title froze,
 * then stuttered. When the title has to build a world, its entrance starts as the veil lifts on the finished tank
 * (capped, so it is never held back for long); otherwise at once.
 */
function useEntranceReady(): boolean {
  const [ready, setReady] = useState(() => !!useGame.getState().game?.isShowcase);
  useEffect(() => {
    if (ready) return;
    let seen = useWarmup.getState().warming;
    const cap = window.setTimeout(() => setReady(true), ENTRANCE_CAP_MS);
    const unsub = useWarmup.subscribe((st) => {
      if (st.warming) seen = true;
      else if (seen) setReady(true);
    });
    return () => {
      window.clearTimeout(cap);
      unsub();
    };
  }, [ready]);
  return ready;
}

export function Wordmark({ size = 'xl' }: { size?: 'xl' | 'md' }) {
  return (
    <h1 className={`ag-wordmark ag-wordmark--${size}`} aria-label="Aquarium Go">
      <span className="ag-wordmark__a">Aquarium</span>
      <span className="ag-wordmark__go">Go</span>
    </h1>
  );
}

/**
 * What starting over costs: the new game only overwrites the autosave. If the same aquarium is also in a manual slot
 * (same shop, starter and name) and that copy is as recent, nothing is lost; if the slot copy is older, say how much.
 */
function autosaveKeepAdvice(saves: SaveMeta[]): { safe: boolean; text: string } {
  const auto = saves.find((s) => s.slot === 'auto');
  if (!auto) return { safe: true, text: '' };
  const what = `${auto.shopName} (${speciesName(auto.starterId)}${auto.starterName ? ` ${auto.starterName}` : ''} · Day ${auto.day})`;
  const copies = saves
    .filter((s) => s.slot !== 'auto' && s.shopName === auto.shopName && s.starterId === auto.starterId && (s.starterName ?? '') === (auto.starterName ?? ''))
    .sort((a, b) => b.savedAt - a.savedAt);
  const copy = copies[0];
  // up to date = saved after the autosave, or within the same ~90 s on the same day
  if (copy && (copy.savedAt >= auto.savedAt || (copy.day === auto.day && auto.savedAt - copy.savedAt < 90_000)))
    return { safe: true, text: `${what} is also saved in ${slotLabel(copy.slot)} (${timeAgo(copy.savedAt)}), so you can load it any time.` };
  if (copy)
    return {
      safe: false,
      text: `${slotLabel(copy.slot)} has an older copy of ${auto.shopName} (Day ${copy.day}, saved ${timeAgo(copy.savedAt)}). Anything since then — you’re on Day ${auto.day} — is only in the autosave. To keep it, open it with Continue and save it to a slot in Settings first.`,
    };
  return { safe: false, text: `${what} is only in the autosave. To keep it, open it with Continue and save it to a slot in Settings first.` };
}

export function TitleScreen() {
  const titleStarter = useOnboarding((s) => s.titleStarter);
  const game = useGame((s) => s.game);
  const [saves, setSaves] = useState<SaveMeta[] | null>(null);
  const [loadOpen, setLoadOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const mobile = useIsMobile();
  const sideways = useMedia(SHORT_LANDSCAPE_QUERY); // a phone held sideways: the menu is a left column again
  const [notice, setNotice] = useState(() => storageNotice());
  const entered = useEntranceReady();

  useEffect(() => {
    if (!useGame.getState().game?.isShowcase) loadShowcase(titleStarter);
    else {
      const g = useGame.getState().game;
      useUI.getState().set({ focusedTankId: g?.tankOrder[0] ?? null, view: 'tank' });
    }
    let alive = true;
    const relist = () => {
      listSlots().then((s) => alive && setSaves(s));
      setNotice(storageNotice());
    };
    relist();
    // a late IndexedDB migration (or backend switch) can bring saves in after the first listing
    const unwatch = watchSaves(relist);
    return () => {
      alive = false;
      unwatch();
    };
  }, [titleStarter]);

  // the starter reveal's five card portraits render while the player reads the menu, not during the cards' entrance
  // (G4-03) — and not during the title's own entrance either (R12-01): even split into short steps (P-9), a first
  // portrait of a species still costs a few frames' worth of work, so they wait until the menu has settled, then take
  // idle time. Pointing at New Game starts them at once. Leaving the title (Continue,
  // Load) cancels whatever has not started.
  useEffect(() => {
    if (!entered) return;
    const w = window as IdleWindow;
    const run = () => safe('prepareStarters', prepareStarters, undefined);
    let idle = 0;
    const t = window.setTimeout(() => {
      if (w.requestIdleCallback) idle = w.requestIdleCallback(run, { timeout: 2000 });
      else run();
    }, PREWARM_AFTER_MS);
    return () => {
      window.clearTimeout(t);
      if (idle) w.cancelIdleCallback?.(idle);
    };
  }, [entered]);
  const prewarmNow = () => safe('prepareStarters', prepareStarters, undefined);

  const latest = saves?.[0];
  const keep = useMemo(() => autosaveKeepAdvice(saves ?? []), [saves]);
  const showcaseCreature = game?.isShowcase ? Object.values(game.creatures).find((c) => c.isStarter) : undefined;
  const sp = showcaseCreature ? findSpecies(showcaseCreature.speciesId) : undefined;

  const startNew = () => {
    unlockAudio();
    sfx('confirm');
    useOnboarding.getState().begin();
    useUI.getState().set({ screen: 'starter' });
  };

  const onNew = () => {
    if (saves && saves.some((s) => s.slot === 'auto')) setConfirmNew(true);
    else startNew();
  };

  const onContinue = async () => {
    if (!latest || busy) return;
    unlockAudio();
    setBusy(true);
    sfx('confirm');
    const mark = toastMark(); // lane:guide — one message per failure (see ./loadFeedback)
    const g = await loadIntoGame(latest.slot);
    setBusy(false);
    if (!g) reportLoadFailure(mark);
  };

  const item = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: entered ? { opacity: 1, y: 0 } : undefined,
    transition: { delay: 0.55 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <motion.div className="ag-screen ag-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <div className="ag-title__veil" aria-hidden />
      {/* camera framing (render/camera/viewport.ts): the menu column covers the left (phones: the bottom) */}
      <div className="ag-title__col" data-occlude={mobile && !sideways ? 'bottom' : 'left'}>
        <motion.div initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }} animate={entered ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}>
          <Wordmark />
        </motion.div>
        <motion.p className="ag-title__tagline" initial={{ opacity: 0 }} animate={entered ? { opacity: 1 } : undefined} transition={{ delay: 0.35, duration: 1 }}>
          Raise remarkable creatures. Build living worlds.
        </motion.p>

        <nav className="ag-title__menu" aria-label="Main menu">
          {latest && (
            <motion.button {...item(0)} type="button" className="ag-menubtn ag-menubtn--primary" data-testid="title-continue" onClick={onContinue} disabled={busy}>
              <Play size={18} aria-hidden />
              <span className="ag-menubtn__text">
                <span>Continue</span>
                <span className="ag-menubtn__sub">
                  {latest.shopName}
                  {latest.starterName ? ` · ${latest.starterName}` : ''} · Day {latest.day} · {timeAgo(latest.savedAt)}
                </span>
              </span>
              <ChevronRight size={18} className="ag-menubtn__chev" aria-hidden />
            </motion.button>
          )}
          <motion.button {...item(1)} type="button" className={`ag-menubtn ${latest ? '' : 'ag-menubtn--primary'}`} data-testid="title-new-game" onClick={onNew} onPointerEnter={prewarmNow} onFocus={prewarmNow}>
            <Sparkles size={18} aria-hidden />
            <span className="ag-menubtn__text">
              <span>New Game</span>
              {!latest && <span className="ag-menubtn__sub">Choose your first companion</span>}
            </span>
            <ChevronRight size={18} className="ag-menubtn__chev" aria-hidden />
          </motion.button>
          <motion.button {...item(2)} type="button" className="ag-menubtn" data-testid="title-load" onClick={() => { sfx('open'); setLoadOpen(true); }} disabled={!saves?.length}>
            <FolderOpen size={18} aria-hidden />
            <span className="ag-menubtn__text">
              <span>Load</span>
              {saves && <span className="ag-menubtn__sub">{saves.length ? `${saves.length} saved aquarium${saves.length === 1 ? '' : 's'}` : 'No saves yet'}</span>}
            </span>
          </motion.button>
          <motion.button {...item(3)} type="button" className="ag-menubtn" data-testid="title-settings" onClick={() => { sfx('open'); useUI.getState().set({ panel: 'settings' }); }}>
            <SettingsIcon size={18} aria-hidden />
            <span className="ag-menubtn__text">
              <span>Settings</span>
            </span>
          </motion.button>
        </nav>
        {notice && (
          <p className={`ag-title__notice is-${notice.tone}`} role="status" data-testid="storage-notice">
            <TriangleAlert size={14} aria-hidden /> {notice.text}
          </p>
        )}
      </div>

      {showcaseCreature && sp && (
        <motion.div className="ag-title__caption" initial={{ opacity: 0 }} animate={entered ? { opacity: 1 } : undefined} transition={{ delay: 1.4, duration: 1 }}>
          <span className="ag-title__caption-over">In the tank</span>
          <span className="ag-title__caption-name">{showcaseCreature.name}</span>
          <span className="ag-muted">
            {showcaseCreature.morphName && showcaseCreature.morphName !== 'Wild type' && showcaseCreature.morphName !== 'Wild Type' ? `${showcaseCreature.morphName} ` : ''}
            {sp.commonName} · <em>{sp.scientificName}</em>
          </span>
        </motion.div>
      )}
      <div className="ag-title__foot" aria-hidden>
        Every creature, plant and ripple is generated live.
      </div>
      <motion.button
        type="button"
        className="ag-title__version"
        data-testid="title-version"
        title={`${buildDetail()} · open Settings › About`}
        aria-label={`Aquarium Go ${versionLabel()}. ${buildDetail()}. Open About.`}
        initial={{ opacity: 0 }}
        animate={entered ? { opacity: 1 } : undefined}
        transition={{ delay: 1.6, duration: 1 }}
        onClick={() => {
          sfx('open');
          useShell.getState().set({ settingsTab: 'about' });
          useUI.getState().set({ panel: 'settings' });
        }}
      >
        {versionLabel()}
      </motion.button>

      <LoadDialog open={loadOpen} onClose={() => setLoadOpen(false)} onChanged={() => listSlots().then(setSaves)} />
      <Modal
        open={confirmNew}
        onClose={() => setConfirmNew(false)}
        title="Start a new aquarium?"
        subtitle={keep.safe ? 'Only the autosave is replaced when the new game saves.' : 'Your current autosave will be replaced when the new game saves.'}
        width={460}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmNew(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setConfirmNew(false); startNew(); }}>Start fresh</Button>
          </>
        }
      >
        <p className="ag-muted" style={{ margin: 0 }}>
          {keep.text}
        </p>
      </Modal>
    </motion.div>
  );
}
