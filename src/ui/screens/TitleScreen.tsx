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
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const run = () => safe('prepareStarters', prepareStarters, undefined);
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(run, 1200);
    return () => window.clearTimeout(t);
  }, []);

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
    const g = await loadIntoGame(latest.slot);
    setBusy(false);
    if (!g) useUI.getState().toast('That save could not be opened.', 'danger');
  };

  const item = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.55 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <motion.div className="ag-screen ag-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <div className="ag-title__veil" aria-hidden />
      {/* camera framing (render/camera/viewport.ts): the menu column covers the left (phones: the bottom) */}
      <div className="ag-title__col" data-occlude={mobile && !sideways ? 'bottom' : 'left'}>
        <motion.div initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}>
          <Wordmark />
        </motion.div>
        <motion.p className="ag-title__tagline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 1 }}>
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
          <motion.button {...item(1)} type="button" className={`ag-menubtn ${latest ? '' : 'ag-menubtn--primary'}`} data-testid="title-new-game" onClick={onNew}>
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
        <motion.div className="ag-title__caption" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 1 }}>
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
