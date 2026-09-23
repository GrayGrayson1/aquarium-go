/**
 * Renders the active management panel for ui.panel (tanks, livestock, market, visitors, build, research,
 * finances, encyclopedia, log). OWNER: lane "ui-panels". 'settings' and 'dev' are handled by lane "ui-shell".
 *
 * Desktop: a frosted sheet sliding in from the right (≤600px), never covering the whole tank unless the player
 * maximises it. Phones and upright tablets: a bottom sheet that opens half-height (the tank stays visible above);
 * drag the header up to expand, down to shrink/dismiss.
 *
 * Occlusion contract with the renderer: the sheet root carries `data-occlude="right" | "bottom"`, so the camera
 * frames the aquarium in the uncovered part of the screen (src/render/camera/viewport.ts).
 *
 * Layout insets can be tuned by the shell through CSS variables on :root —
 *   --pn-top (default 76px, below the HUD), --pn-bottom (default 96px, above the dock), --pn-right (16px).
 */
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react';
import { useUI, type PanelId } from '@/state/ui';
import { useGame } from '@/state/game';
import { sfx } from '@/audio/sfx';
import { tutorialAdvance, tutorialWants } from '@/sim/facility';
import { SheetContext } from './common/PanelLayout';
import { useIsPhone, useMedia, useReducedMotion } from './common/hooks';
import { BOTTOM_SHEET_QUERY } from '../common/Sheet';
import { edit } from './common/act';
import { PanelErrorBoundary } from './common/ErrorBoundary';
import { TanksPanel } from './tanks/TanksPanel';
import { LivestockPanel } from './livestock/LivestockPanel';
import { MarketPanel } from './market/MarketPanel';
import { VisitorsPanel } from './visitors/VisitorsPanel';
import { BuildPanel } from './build/BuildPanel';
import { ResearchPanel } from './research/ResearchPanel';
import { FinancesPanel } from './finances/FinancesPanel';
import { EncyclopediaPanel } from './encyclopedia/EncyclopediaPanel';
import { LogPanel } from './log/LogPanel';
import { ShowsPanel } from './shows/ShowsPanel';
import './panels.css';

export type ManagedPanelId = Exclude<PanelId, 'settings' | 'dev'>;

export const PANEL_COMPONENTS: Record<ManagedPanelId, ComponentType> = {
  tanks: TanksPanel,
  livestock: LivestockPanel,
  market: MarketPanel,
  visitors: VisitorsPanel,
  build: BuildPanel,
  research: ResearchPanel,
  finances: FinancesPanel,
  encyclopedia: EncyclopediaPanel,
  log: LogPanel,
  shows: ShowsPanel,
};

export const MANAGED_PANELS = Object.keys(PANEL_COMPONENTS) as ManagedPanelId[];

export function isManagedPanel(p: PanelId | null): p is ManagedPanelId {
  return !!p && p in PANEL_COMPONENTS;
}

export function PanelHost() {
  const panel = useUI((s) => s.panel);
  const hasGame = useGame((s) => !!s.game);
  const phone = useIsPhone();
  const bottom = useMedia(BOTTOM_SHEET_QUERY) || phone;
  const reduced = useReducedMotion();
  const [maximised, setMaximised] = useState(false);
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const open = hasGame && isManagedPanel(panel);

  const close = useCallback(() => {
    sfx('close');
    useUI.getState().set({ panel: null, panelTarget: null });
  }, []);

  // Open side-effects: sound, tutorial flag, focus management.
  useEffect(() => {
    if (!open || !panel) return;
    sfx('open');
    const flag = `opened_${panel}`;
    const g = useGame.getState().game;
    if (g && (!g.progress.tutorial.flags[flag] || tutorialWants(g, flag))) {
      try {
        edit((d) => tutorialAdvance(d, flag));
      } catch {
        /* tutorial is optional */
      }
    }
    if (!lastFocus.current) lastFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => sheetRef.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(t);
  }, [open, panel]);

  useEffect(() => {
    if (open) return;
    setMaximised(false);
    const el = lastFocus.current;
    lastFocus.current = null;
    if (el && document.contains(el)) el.focus({ preventScroll: true });
  }, [open]);

  // Escape closes the panel (unless a modal/dialog is on top, or the user is typing).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('.ag-modal-backdrop, [data-pn-modal]')) return;
      const a = document.activeElement as HTMLElement | null;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a.closest('.pn-sheet')) {
        a.blur();
        return;
      }
      close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -50 || info.velocity.y < -500) setMaximised(true);
    else if (info.offset.y > 120 || info.velocity.y > 700) {
      if (maximised) setMaximised(false);
      else close();
    }
  };

  const Comp = open && panel ? PANEL_COMPONENTS[panel as ManagedPanelId] : null;

  const variants = bottom
    ? reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : { initial: { x: 48, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 48, opacity: 0 } };

  return (
    <SheetContext.Provider
      value={{
        close,
        maximised,
        toggleMax: () => setMaximised((m) => !m),
        phone,
        bottom,
        startDrag: (e) => {
          const t = e.target as HTMLElement;
          if (t.closest('button, input, select, a, [role="tab"], [role="radio"]')) return;
          dragControls.start(e);
        },
      }}
    >
      <AnimatePresence>
        {open && Comp && (
          <motion.aside
            key="pn-sheet"
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal={false}
            aria-label={`${panel} panel`}
            data-testid={`panel-${panel}`}
            data-panel={panel}
            data-occlude={bottom ? 'bottom' : 'right'}
            className={`pn-sheet ${bottom ? 'pn-sheet--bottom' : 'pn-sheet--side'} ${phone ? 'pn-sheet--phone' : ''} ${maximised ? 'is-max' : ''}`}
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={reduced ? { duration: 0.15 } : bottom ? { type: 'spring', damping: 34, stiffness: 320 } : { type: 'spring', damping: 32, stiffness: 300, mass: 0.9 }}
            drag={bottom && !reduced ? 'y' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: maximised ? 0 : 0.25, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <PanelErrorBoundary key={panel} onClose={close}>
              <Comp />
            </PanelErrorBoundary>
          </motion.aside>
        )}
      </AnimatePresence>
    </SheetContext.Provider>
  );
}

export default PanelHost;
