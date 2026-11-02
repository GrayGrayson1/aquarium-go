/**
 * chunk 19 (ADR-0055 decision 7, QOL-008) — the tour ("Show me around"): stop by stop it opens each place
 * (tourStops.ts), dims the rest, rings what it talks about and explains it in a card beside it; Next, Back and Skip
 * (→ and Enter, ←, Escape). It starts from the guide's finale, Settings › Play & access and Find anything, and leaves the
 * screen as it found it (the tank view). Mounted by GameHUD. OWNER: lane "ui-shell".
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { useDevMode } from '@/state/devTools';
import { sfx } from '@/audio/sfx';
import { Button, ProgressDots } from '../kit';
import { useShell } from '../common/shellStore';
import { isTextEntry, useIsMobile } from '../common/safe';
import { useSocialAvailable } from '../online/mode';
import { Spotlight, useSpotlightTarget, type Rect } from './Spotlight';
import { endTour, useTour } from './tourStore';
import { tourStops, type TourStop } from './tourStops';

export function Tour() {
  const running = useTour((s) => s.running);
  const inGame = useUI((s) => s.screen === 'game');
  if (!running || !inGame) return null;
  return <TourRun />;
}

function TourRun() {
  const mobile = useIsMobile();
  const social = useSocialAvailable();
  const dev = useDevMode();
  const keys = useGame((s) => s.game?.progress.unlocked.join('|') ?? '');
  const stops = useMemo(() => tourStops({ mobile, social, unlocked: (k) => dev || keys.split('|').includes(k) }), [mobile, social, dev, keys]);
  const step = useTour((s) => s.step);
  const i = Math.max(0, Math.min(step, stops.length - 1));
  const stop = stops[i];
  const last = i === stops.length - 1;

  // the tour shows the tank view's tools: started from the room view (Find anything, Settings), it goes to a tank first
  // (reviewer note: some stops pointed at nothing there)
  useLayoutEffect(() => {
    const ui = useUI.getState();
    const g = useGame.getState().game;
    if (ui.view !== 'tank' && g?.tankOrder.length) ui.set({ view: 'tank', focusedTankId: ui.focusedTankId && g.tanks[ui.focusedTankId] ? ui.focusedTankId : g.tankOrder[0] });
  }, []);

  // each stop opens what it shows (and the tank view between them)
  useEffect(() => {
    const ui = useUI.getState();
    const shell = useShell.getState();
    if (ui.tool !== 'none') ui.set({ tool: 'none' });
    if (stop.open) {
      if (ui.panel !== stop.open) ui.set({ panel: stop.open, panelTarget: null });
      if (shell.popover) shell.set({ popover: null });
    } else {
      if (ui.panel) ui.set({ panel: null, panelTarget: null });
      if (shell.tankCardOpen) shell.set({ tankCardOpen: false });
      if (stop.more) {
        if (shell.popover !== 'more') shell.set({ popover: 'more' });
      } else if (shell.popover) shell.set({ popover: null });
      if (ui.selectedCreatureId) ui.set({ selectedCreatureId: null });
    }
  }, [stop.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // leave the screen as the tour found it: the tank view
  useEffect(
    () => () => {
      const ui = useUI.getState();
      if (ui.panel) ui.set({ panel: null, panelTarget: null });
      if (useShell.getState().popover === 'more') useShell.getState().set({ popover: null });
    },
    [],
  );

  const go = (to: number) => {
    if (to < 0) return;
    if (to >= stops.length) {
      sfx('celebrate');
      endTour();
      return;
    }
    sfx('click');
    useTour.setState({ step: to });
  };

  // keys: → / Enter next, ← back, Escape ends (before the game's own Escape). The arrows stay with a text box or a
  // control that uses them (a panel's tabs, a radio group, a slider) — reviewer note: they were taken from those
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.ag-modal-backdrop, .ag-find-backdrop')) return;
      const t = e.target as HTMLElement | null;
      const ownsArrows = isTextEntry(e.target) || !!t?.closest?.('input, select, textarea, [contenteditable="true"], [role="tablist"], [role="radiogroup"], [role="listbox"], [role="slider"], [role="menu"], [role="grid"]');
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && ownsArrows) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        sfx('close');
        endTour();
      } else if (e.key === 'ArrowRight' || (e.key === 'Enter' && !(e.target as HTMLElement | null)?.closest?.('button, a, input, select, textarea'))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        go(i + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopImmediatePropagation();
        go(i - 1);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const rect = useSpotlightTarget(stop.target, { allowCovered: true, scrollIntoView: true });
  const waiting = stop.target.length > 0 && !rect;
  return (
    <>
      <Spotlight rect={rect} dimAll={!stop.target.length || waiting} hand={false} testId="tour-spotlight" />
      <TourCard stop={stop} index={i} total={stops.length} rect={rect} mobile={mobile} last={last} onNext={() => go(i + 1)} onBack={() => go(i - 1)} onSkip={() => { sfx('close'); endTour(); }} />
    </>
  );
}

const CARD_W = 360;
const GAP = 14;

type Side = 'below' | 'above' | 'left' | 'right' | 'centre';

/** Where the card goes: beside the target where it fits (left of an open side sheet first), else the middle. */
export function placeCard(rect: Rect | null, size: { w: number; h: number }, view: { w: number; h: number }, preferLeft: boolean): { x: number; y: number; side: Side } {
  const centre = { x: (view.w - size.w) / 2, y: Math.max(16, (view.h - size.h) / 2), side: 'centre' as Side };
  if (!rect) return centre;
  const clampX = (x: number) => Math.max(12, Math.min(view.w - size.w - 12, x));
  const clampY = (y: number) => Math.max(12, Math.min(view.h - size.h - 12, y));
  const fits: Record<Exclude<Side, 'centre'>, boolean> = {
    below: rect.y + rect.h + GAP + size.h <= view.h - 8,
    above: rect.y - GAP - size.h >= 8,
    left: rect.x - GAP - size.w >= 8,
    right: rect.x + rect.w + GAP + size.w <= view.w - 8,
  };
  const order: Exclude<Side, 'centre'>[] = preferLeft ? ['left', 'below', 'above', 'right'] : ['below', 'above', 'left', 'right'];
  const side = order.find((s) => fits[s]);
  switch (side) {
    case 'below':
      return { x: clampX(rect.x + rect.w / 2 - size.w / 2), y: rect.y + rect.h + GAP, side };
    case 'above':
      return { x: clampX(rect.x + rect.w / 2 - size.w / 2), y: rect.y - GAP - size.h, side };
    case 'left':
      return { x: rect.x - GAP - size.w, y: clampY(rect.y), side };
    case 'right':
      return { x: rect.x + rect.w + GAP, y: clampY(rect.y), side };
    default:
      return centre;
  }
}

function TourCard({ stop, index, total, rect, mobile, last, onNext, onBack, onSkip }: { stop: TourStop; index: number; total: number; rect: Rect | null; mobile: boolean; last: boolean; onNext: () => void; onBack: () => void; onSkip: () => void }) {
  const reduced = useSettings((s) => s.reducedMotion);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: CARD_W, h: 200 });
  const [view, setView] = useState({ w: typeof window === 'undefined' ? 1024 : window.innerWidth, h: typeof window === 'undefined' ? 768 : window.innerHeight });
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight });
  }, [stop.id, view.w]);
  useEffect(() => {
    const on = () => setView({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-testid="tour-next"]')?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(t);
  }, [stop.id]);
  // phones: the card sits at the top or the bottom of the screen, away from what it points at
  const pos = mobile
    ? { x: 12, y: rect && rect.y + rect.h / 2 > view.h / 2 ? Math.max(12, (rect?.y ?? 0) - size.h - GAP > 60 ? 64 : 12) : Math.max(12, view.h - size.h - 96), side: 'centre' as Side }
    : placeCard(rect, size, view, !!stop.open);
  if (typeof document === 'undefined') return null;
  const root = document.querySelector('.ag-ui') ?? document.body;
  const titleId = `ag-tour-${stop.id}`;
  return createPortal(
    <motion.div
      ref={ref}
      className="ag-tour"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-testid="tour-card"
      data-stop={stop.id}
      style={{ width: mobile ? view.w - 24 : CARD_W }}
      initial={{ opacity: 0, x: pos.x, y: pos.y + 10 }}
      animate={{ opacity: 1, x: pos.x, y: pos.y }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="ag-tour__top">
        <span className="ag-tour__badge">
          <Compass size={13} aria-hidden /> Tour · {index + 1} of {total}
        </span>
        <button type="button" className="ag-tour__skip" onClick={onSkip} data-testid="tour-skip" aria-label="End the tour">
          <X size={15} aria-hidden />
        </button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={stop.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: reduced ? 0 : 0.18 }}>
          <h3 className="ag-tour__title" id={titleId}>
            {stop.title}
          </h3>
          <p className="ag-tour__body">{stop.body}</p>
        </motion.div>
      </AnimatePresence>
      <div className="ag-tour__foot">
        <ProgressDots total={total} index={index} label="Tour progress" />
        <div className="ag-row" style={{ gap: 6 }}>
          {index > 0 && (
            <Button size="sm" variant="ghost" silent onClick={onBack} data-testid="tour-back">
              <ArrowLeft size={14} aria-hidden /> Back
            </Button>
          )}
          <Button size="sm" variant="primary" silent onClick={onNext} data-testid="tour-next">
            {last ? 'Done' : index === 0 ? 'Let’s go' : 'Next'} {!last && <ArrowRight size={14} aria-hidden />}
          </Button>
        </div>
      </div>
    </motion.div>,
    root,
  );
}
