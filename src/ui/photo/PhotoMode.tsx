/**
 * Photo mode: the HUD disappears; a quiet capture bar, optional focus/depth controls (when the waterfx lane
 * exposes them), a subject picker, capture → preview → download + a "photo" moment in the creature's history.
 * OWNER: lane "ui-shell".
 */
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, X, Download, Grid3x3, ScanEye, Check } from 'lucide-react';
import * as photoModule from '@/render/camera/photo';
import { capturePhoto } from '@/render/camera/photo';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { sfx } from '@/audio/sfx';
import { creaturesInTank } from '@/sim/life';
import { noteInteraction } from '@/sim/life/actions';
import { useShell } from '../common/shellStore';
import { safe } from '../common/safe';
import { downloadDataUrl } from '../common/saves';
import { tutorialFlag } from '../common/actions';
import { Modal, Button, Slider, Chip } from '../kit';

type Store = { getState: () => Record<string, unknown>; setState: (p: Record<string, unknown>) => void; subscribe: (cb: () => void) => () => void };
const P = photoModule as unknown as Record<string, unknown>;
/** Optional zustand-style store the render lane may export for photo camera parameters. */
const photoStore: Store | null = (() => {
  const s = P.usePhotoSettings ?? P.photoSettings ?? P.usePhotoStore;
  if (s && typeof (s as Store).getState === 'function' && typeof (s as Store).setState === 'function') return s as Store;
  return null;
})();

const PARAM_META: Record<string, { label: string; min: number; max: number; step: number }> = {
  focus: { label: 'Focus distance', min: 0, max: 1, step: 0.01 },
  focusDistance: { label: 'Focus distance', min: 0, max: 1, step: 0.01 },
  aperture: { label: 'Background blur', min: 0, max: 1, step: 0.01 },
  bokeh: { label: 'Background blur', min: 0, max: 1, step: 0.01 },
  dof: { label: 'Depth of field', min: 0, max: 1, step: 0.01 },
  exposure: { label: 'Exposure', min: -1, max: 1, step: 0.05 },
  vignette: { label: 'Vignette', min: 0, max: 1, step: 0.01 },
  zoom: { label: 'Zoom', min: 0, max: 1, step: 0.01 },
};

function usePhotoParams() {
  const [v, setV] = useState<Record<string, unknown>>(() => photoStore?.getState() ?? {});
  useEffect(() => (photoStore ? photoStore.subscribe(() => setV({ ...photoStore.getState() })) : undefined), []);
  const keys = Object.keys(PARAM_META).filter((k) => typeof v[k] === 'number');
  return { v, keys, set: (k: string, x: number) => photoStore?.setState({ [k]: x }) };
}

/** One capture at a time: a full-resolution capture blocks the main thread for ~200 ms, so key repeat must not queue them. */
let capturing = false;

export async function takePhoto(): Promise<void> {
  if (capturing) return;
  capturing = true;
  try {
    const ui = useUI.getState();
    sfx('camera');
    const flash = document.createElement('div');
    flash.className = 'ag-flash';
    document.body.appendChild(flash);
    window.setTimeout(() => flash.remove(), 700);
    const url = await capturePhoto({ hideUI: true }).catch(() => null);
    if (!url) {
      ui.toast('The photo could not be captured.', 'warning');
      return;
    }
    const creatureId = ui.followCreatureId ?? ui.selectedCreatureId;
    const g = useGame.getState().game;
    if (creatureId && g && g.creatures[creatureId]) {
      useGame.getState().mutate((d) => {
        const c = d.creatures[creatureId];
        if (!c) return;
        // noteInteraction writes one throttled "photo" story line (6 game hours) — keep that throttle, just give the
        // line it wrote the tank's name instead of adding a second entry for every shutter press.
        const before = c.history.length;
        safe('noteInteraction', () => noteInteraction(d, creatureId, 'photo'), undefined);
        const last = c.history[c.history.length - 1];
        if (c.history.length > before && last?.kind === 'photo') last.text = `Posed for a portrait in ${d.tanks[c.tankId ?? '']?.name ?? 'the aquarium'}.`;
      });
    }
    tutorialFlag('photo_taken');
    useShell.getState().set({ photo: { url, creatureId: creatureId ?? null, tankId: ui.focusedTankId } });
  } finally {
    capturing = false;
  }
}

export function PhotoMode() {
  const photoMode = useUI((s) => s.photoMode);
  const followId = useUI((s) => s.followCreatureId);
  const tankId = useUI((s) => s.focusedTankId);
  // lane:perf — only follow the (4×/s) game state while photo mode is open
  const game = useGame((s) => (photoMode ? s.game : null));
  const [grid, setGrid] = useState(false);
  const { v, keys, set } = usePhotoParams();
  const residents = game && tankId ? safe('creaturesInTank', () => creaturesInTank(game, tankId), []) : [];

  useEffect(() => {
    if (!photoMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return; // holding Space must not fire a capture per auto-repeat
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (document.querySelector('.ag-modal-backdrop')) return; // the preview (or any dialog) owns the keys while open
      if (e.key === 'Escape') useUI.getState().set({ photoMode: false });
      if ((e.key === ' ' || e.key === 'Enter') && !(e.target as HTMLElement)?.closest?.('button, a, [role="button"], [role="radio"], [role="switch"]')) {
        e.preventDefault();
        void takePhoto();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photoMode]);

  const exit = () => {
    sfx('close');
    useUI.getState().set({ photoMode: false });
  };

  return (
    <>
      <AnimatePresence>
        {photoMode && (
          <motion.div className="ag-photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="ag-photo__frame" aria-hidden>
              <i className="tl" />
              <i className="tr" />
              <i className="bl" />
              <i className="br" />
            </div>
            {grid && <div className="ag-photo__grid" aria-hidden />}
            <div className="ag-photo__top">
              <span className="ag-photo__tag">
                <Camera size={14} aria-hidden /> Photo mode
              </span>
              {residents.length > 0 && (
                <div className="ag-photo__subjects" role="group" aria-label="Subject">
                  <ScanEye size={14} aria-hidden className="ag-muted" />
                  {residents.slice(0, 8).map((c) => (
                    <Chip
                      key={c.id}
                      size="sm"
                      selected={followId === c.id}
                      onClick={() => useUI.getState().set({ followCreatureId: followId === c.id ? null : c.id, cameraMode: followId === c.id ? 'front' : 'follow' })}
                    >
                      {c.name}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
            {keys.length > 0 && (
              <div className="ag-photo__params">
                {keys.map((k) => (
                  <label key={k} className="ag-photo__param">
                    <span className="ag-small">{PARAM_META[k].label}</span>
                    <Slider label={PARAM_META[k].label} value={v[k] as number} min={PARAM_META[k].min} max={PARAM_META[k].max} step={PARAM_META[k].step} onChange={(x) => set(k, x)} />
                  </label>
                ))}
              </div>
            )}
            <div className="ag-photo__bar">
              <button type="button" className="ag-photo__side" onClick={exit} aria-label="Leave photo mode">
                <X size={18} />
                <span>Exit</span>
              </button>
              <button type="button" className="ag-shutter" onClick={() => void takePhoto()} aria-label="Take photo" data-testid="photo-capture">
                <span />
              </button>
              <button type="button" className={clsx('ag-photo__side', grid && 'is-on')} onClick={() => { sfx('click'); setGrid(!grid); }} aria-pressed={grid} aria-label="Composition grid">
                <Grid3x3 size={18} />
                <span>Grid</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <PhotoPreview />
    </>
  );
}

function PhotoPreview() {
  const photo = useShell((s) => s.photo);
  const game = useGame((s) => (photo ? s.game : null)); // lane:perf — only while a photo is shown
  const c = photo?.creatureId && game ? game.creatures[photo.creatureId] : null;
  const close = () => useShell.getState().set({ photo: null });
  return (
    <Modal
      open={!!photo}
      onClose={close}
      title={c ? `${c.name}, photographed` : 'Your photo'}
      subtitle={c ? 'Added to their story.' : 'Saved to this session — download to keep it.'}
      width={760}
      testId="photo-preview"
      actions={
        <>
          <Button variant="ghost" onClick={close}>
            <Check size={16} /> Done
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!photo) return;
              const name = (c?.name ?? game?.shopName ?? 'aquarium').replace(/[^\w-]+/g, '-').toLowerCase();
              downloadDataUrl(`aquarium-go-${name}-${Date.now()}.png`, photo.url);
              sfx('confirm');
            }}
          >
            <Download size={16} /> Download PNG
          </Button>
        </>
      }
    >
      {photo && <img className="ag-photo__preview" src={photo.url} alt={c ? `Photo of ${c.name}` : 'Aquarium photo'} />}
    </Modal>
  );
}
