/**
 * Renders the active management panel for ui.panel (tanks, livestock, market, visitors, build, research,
 * finances, encyclopedia, log). OWNER: lane "ui-panels". 'settings' and 'dev' are handled by lane "ui-shell".
 *
 * Desktop: a frosted sheet sliding in from the right (≤600px), never covering the whole tank unless the player
 * maximises it. Upright tablets: a bottom sheet that opens half-height (the tank stays visible above); drag the
 * header up to expand, down to shrink/dismiss. lane:ui-shell (chunk 1, 0.5 spec §5.6, B-150) — phones (MOBILE_QUERY,
 * either way up) open every panel at full height under the top bar, with the tab bar floating over its foot:
 * `.pn-sheet--mobile` carries that geometry (nav.css), and the panel switcher strip gives way to the tab bar.
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
import { tutorialWants } from '@/sim/facility';
import { SheetContext } from './common/PanelLayout';
import { useIsPhone, useMedia, useReducedMotion } from './common/hooks';
import { BOTTOM_SHEET_QUERY } from '../common/Sheet';
import { SHORT_LANDSCAPE_QUERY, useIsMobile } from '../common/safe';
import { edit } from './common/act';
import { PanelErrorBoundary } from './common/ErrorBoundary';
import { useDevMode } from '@/state/devTools'; // lane:core (PLAT-005)
import { useSocialAvailable } from '../online/mode'; // chunk 8 (REL-025)
import { DOCK_ITEMS, openPanel } from '../hud/Dock';
import { AttnDot, useNavDots } from '../hud/AttnDot'; // lane:notify
import { researchSeenStale } from '../common/notify'; // lane:notify
import { mark } from '../common/marks';
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
import { OperationsPanel } from './operations/OperationsPanel'; // lane:automation (chunk 5)
import { SocialPanel } from './social/SocialPanel'; // lane:social (chunk 6)
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
  operations: OperationsPanel,
  social: SocialPanel, // lane:social (chunk 6) — dev mode only (ADR-0005 decision 3): see `open` below
};

export const MANAGED_PANELS = Object.keys(PANEL_COMPONENTS) as ManagedPanelId[];

export function isManagedPanel(p: PanelId | null): p is ManagedPanelId {
  return !!p && p in PANEL_COMPONENTS;
}

export function PanelHost() {
  const panel = useUI((s) => s.panel);
  const hasGame = useGame((s) => !!s.game);
  const phone = useIsPhone();
  const mobile = useIsMobile(); // lane:ui-shell (chunk 1) — the tab bar's layout
  const bottom = useMedia(BOTTOM_SHEET_QUERY) || phone || mobile;
  // a phone (either way up) always shows the sheet at full height (panels.css, nav.css), so there is no half size to
  // drop back to
  const fullHeight = (useMedia(SHORT_LANDSCAPE_QUERY) || mobile) && bottom;
  const reduced = useReducedMotion();
  const [maximised, setMaximised] = useState(false);
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  // lane:social (chunk 6, SOC-011) — Social exists only where it is available (dev mode at first; chunk 8, REL-025)
  const social = useSocialAvailable();
  const open = hasGame && isManagedPanel(panel) && (panel !== 'social' || social);

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
      edit({ k: 'raiseFlag', flag }); // gates quests and unlocks (§4.3): a command, not a mark
    }
    if (!lastFocus.current) lastFocus.current = document.activeElement as HTMLElement | null;
    // lane:ui-shell (chunk 1, §18) — focus goes to the panel's title (the sheet itself while the panel is loading),
    // unless it is already inside the panel: chunk 6 — a quick keyboard user (or a test) who had moved on within those
    // 60 ms lost their place (the destination tiles' arrow keys, shop-filters.spec, failed under load this way). The
    // in-sheet panel switcher doesn't count: switching panels there still moves focus to the new panel's title.
    const t = window.setTimeout(() => {
      const sheet = sheetRef.current;
      const at = document.activeElement;
      if (sheet && at && at !== sheet && sheet.contains(at) && !at.closest('.pn-switch')) return;
      (sheet?.querySelector<HTMLElement>('.pn-head__title') ?? sheet)?.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(t);
  }, [open, panel]);

  // lane:notify — while Research is open, every finished project counts as seen (clears its dock dot)
  const researchStale = useGame((s) => (open && panel === 'research' && !!s.game && !s.game.isShowcase ? researchSeenStale(s.game) : false));
  useEffect(() => {
    if (!researchStale) return;
    mark('researchSeen'); // bookkeeping only (src/ui/common/marks.ts)
  }, [researchStale]);

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
      if (maximised && !fullHeight) setMaximised(false);
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
        setMax: setMaximised,
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
            className={`pn-sheet ${bottom ? 'pn-sheet--bottom' : 'pn-sheet--side'} ${phone ? 'pn-sheet--phone' : ''} ${mobile ? 'pn-sheet--mobile' : ''} ${maximised && !mobile ? 'is-max' : ''}`}
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
            {bottom && !mobile && <PanelSwitcher active={panel as ManagedPanelId} />}
          </motion.aside>
        )}
      </AnimatePresence>
    </SheetContext.Provider>
  );
}

/**
 * Bottom sheets sit over the dock, so hopping Tanks → Build → Research used to mean close, then reopen. This strip
 * is the dock's unlocked destinations inside the sheet; the sheet stays open (half or full) and just swaps panels.
 */
function PanelSwitcher({ active }: { active: ManagedPanelId }) {
  const unlocked = useGame((s) => s.game?.progress.unlocked.join('|') ?? '');
  const dev = useDevMode();
  const social = useSocialAvailable(); // lane:social (chunk 6; chunk 8, REL-025) — Social only where it exists
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(`[data-testid="sheet-switch-${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [active]);
  const items = DOCK_ITEMS.filter((it) => it.id !== 'settings' && (!it.needsSocial || social) && (!it.lock || dev || unlocked.split('|').includes(it.lock)));
  const dots = useNavDots(DOCK_ITEMS); // lane:notify — the dock's attention dots (the sheet covers the dock)
  return (
    <nav className="pn-switch" ref={ref} aria-label="Switch panel" data-testid="sheet-switch">
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = it.id === active;
        const dot = isActive ? undefined : dots[it.id];
        return (
          <button
            key={it.id}
            type="button"
            className={`pn-switch__item ${isActive ? 'is-active' : ''}`}
            aria-pressed={isActive}
            aria-label={dot ? `${it.label} — ${dot.label}` : it.label}
            title={dot ? `${it.label} — ${dot.label}` : undefined}
            data-testid={`sheet-switch-${it.id}`}
            onClick={() => {
              if (isActive) return;
              openPanel(it.id, dot?.target ?? null);
            }}
          >
            <span className="pn-switch__icon">
              <Icon size={18} aria-hidden />
              {dot && <AttnDot level={dot.level} className="pn-switch__attn" testId={`sheet-switch-dot-${it.id}`} />}
            </span>
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default PanelHost;
