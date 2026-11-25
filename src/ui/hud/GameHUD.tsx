/**
 * In-game HUD composition. Everything hugs the edges and collapses away; the aquarium stays the hero.
 * OWNER: lane "ui-shell".
 */
import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { Eye } from 'lucide-react';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { useSettings } from '@/state/settings'; // audit B20 review
import { sfx } from '@/audio/sfx';
import { ErrorBoundary } from '../common/ErrorBoundary';

/** Lazy so a broken/mid-edit panel module can never take the whole shell down (ErrorBoundary catches it). */
const PanelHost = lazy(() => import('../panels/PanelHost').then((m) => ({ default: m.PanelHost })));
/** lane:perf — photo mode is code-split and mounted the first time it (or a photo preview) is needed, then kept. */
const PhotoMode = lazy(() => import('../photo/PhotoMode').then((m) => ({ default: m.PhotoMode })));
function LazyPhotoMode() {
  const photoMode = useUI((s) => s.photoMode);
  const preview = useShell((s) => !!s.photo);
  const wanted = photoMode || preview;
  const [mounted, setMounted] = useState(wanted);
  useEffect(() => {
    if (wanted) setMounted(true);
  }, [wanted]);
  return mounted || wanted ? (
    <Suspense fallback={null}>
      <PhotoMode />
    </Suspense>
  ) : null;
}
import { useShell, type Popover } from '../common/shellStore';
import { useResume } from '@/persistence'; // lane:ui-shell (B-178)
import { isTextEntry, useIsMobile, useMedia } from '../common/safe';
import { BOTTOM_SHEET_QUERY } from '../common/Sheet';
import { TopBar, setSpeed, togglePause } from './TopBar';
import { Dock } from './Dock';
import { TabBar } from './TabBar'; // lane:ui-shell (chunk 1)
import { MoreSheet } from './MoreSheet'; // lane:ui-shell (chunk 1)
import { TankBar, cycleTank, toggleTankCard, toggleView } from './TankBar';
import { ToolRail, CameraChips, ToolHint, selectTool } from './ToolRail';
import { RoomViewChip } from './RoomChips';
import { CreatureCard } from '../cards/CreatureCard';
import { TankCard } from '../cards/TankCard';
import { TutorialCoach } from '../tutorial/TutorialCoach';
import { PartyBanner } from '../photo/PartyBanner';
/**
 * chunk 21 (the confirmation review, F3) — the welcome-back card is its own chunk: it shows only after an absence, and
 * the main chunk was over its size warning. It is fetched when a summary arrives (the catch-up holds the clock until
 * the card is closed, in persistence, so a moment's load changes nothing) or a few seconds after the HUD is up, and
 * kept mounted once shown, as photo mode is, so its exit animation plays.
 */
const loadWelcome = () => import('./WelcomeBack');
const WelcomeBack = lazy(() => loadWelcome().then((m) => ({ default: m.WelcomeBack })));
function LazyWelcomeBack() {
  const wanted = useResume((s) => !!s.summary);
  const [mounted, setMounted] = useState(wanted);
  useEffect(() => {
    if (wanted) setMounted(true);
  }, [wanted]);
  useEffect(() => {
    const t = window.setTimeout(() => void loadWelcome().catch(() => undefined), 8000);
    return () => window.clearTimeout(t);
  }, []);
  return mounted || wanted ? (
    <Suspense fallback={null}>
      <WelcomeBack />
    </Suspense>
  ) : null;
}
import { usePrefs } from '../common/prefs';
import { enterCinematic, useCardDockRules, useDockedCard } from './cardDock';
import { useFocusedTankGuard } from './tankGuard';
import { usePanelAsideRules } from '../panels/common/aside'; // chunk 19 (ADR-0055 decision 1, QOL-001)
import { FindAnything, useFindKeys } from '../search/FindAnything'; // chunk 19 (ADR-0055 decision 3, QOL-004)
import { DecorCamPad, isDecorating } from './DecorCamPad'; // chunk 19 (ADR-0055 decision 4, QOL-005)
import { UnlockHelpHost } from '../panels/common/UnlockHelp'; // chunk 19 (ADR-0055 decision 5, QOL-006): the one lock box
import { endTour, useTour } from '../tutorial/tourStore'; // chunk 19 (ADR-0055 decision 7, QOL-008)
/**
 * chunk 22 — the tour ("Show me around") is its own chunk: the friction fixes took the main chunk 1.65 kB over its
 * limit (vite.config.ts; BACKLOG B-233 a), and the tour is code most sessions never run. It has no address and holds
 * no panel open, so loading it late changes nothing else (its store, tourStore.ts, was already apart "so the starters
 * don't load the tour"). Fetched when a tour starts or a few seconds after the HUD is up, as the welcome-back card is.
 * If it can't be fetched the tour ends and says so, so nothing waits on a card that never comes.
 */
const loadTour = () => import('../tutorial/Tour');
const Tour = lazy(() => loadTour().then((m) => ({ default: m.Tour })));
export const TOUR_LOAD_FAILED = 'The tour didn’t load. Check your connection, then reload the game.';
function TourFailed() {
  useEffect(() => {
    endTour();
    useUI.getState().toast(TOUR_LOAD_FAILED, 'warning');
  }, []);
  return null;
}
/** Confirmation review: a fetch that never answers must not leave the tour "running" with nothing on screen (reveals
 *  wait on it, and Escape lives in the chunk). Shown while the chunk loads; gives up after a while. */
const TOUR_LOAD_WAIT_MS = 10_000;
function TourLoading() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      endTour();
      useUI.getState().toast(TOUR_LOAD_FAILED, 'warning');
    }, TOUR_LOAD_WAIT_MS);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
function LazyTour() {
  const running = useTour((s) => s.running);
  const [mounted, setMounted] = useState(running);
  useEffect(() => {
    if (running) setMounted(true);
  }, [running]);
  useEffect(() => {
    const t = window.setTimeout(() => void loadTour().catch(() => undefined), 9000);
    return () => window.clearTimeout(t);
  }, []);
  return mounted || running ? (
    <ErrorBoundary name="tour chunk" fallback={running ? <TourFailed /> : null}>
      <Suspense fallback={running ? <TourLoading /> : null}>
        <Tour />
      </Suspense>
    </ErrorBoundary>
  ) : null;
}
import { toggleWhatNext, whatNextReachable } from '../next/WhatNext'; // chunk 21 (C)

const CALM_AFTER_MS = 6000;
/** How long after a waking touch its click counts as part of the wake. */
const SWALLOW_MS = 500;
/** The parts of a calm HUD that stay drawn (or are the guide): a tap on them acts straight away. */
const CALM_LIVE = '.ag-hud__coach, .ag-topbar__left, .ag-topbar__right, .ag-tankbar';

/**
 * Nothing needs the HUD right now: the player is simply watching the tank. `keyboard`: a key other than Escape was
 * pressed since the last click or tap (closing a clicked-open panel with Escape hands focus back to its dock button as
 * :focus-visible, which must not pin a mouse player's HUD).
 */
function canCalm(keyboard: boolean): boolean {
  const ui = useUI.getState();
  const shell = useShell.getState();
  if (!usePrefs.getState().calmHud || ui.screen !== 'game' || ui.view !== 'tank') return false;
  if (ui.panel || ui.tool !== 'none' || ui.selectedCreatureId || ui.photoMode || ui.hudHidden || ui.partyMode) return false;
  if (shell.popover || shell.tankCardOpen || shell.moveCreatureId || shell.moveCreatureIds || shell.photo) return false;
  if (document.querySelector('.ag-modal-backdrop, [data-pn-modal], .ag-tut-ring, .ag-welcome, .ag-spot__ring, .ag-tour, .ag-find-backdrop')) return false;
  // keyboard users keep the HUD while a control has visible focus (a mouse click leaves plain focus behind)
  const a = document.activeElement as HTMLElement | null;
  if (keyboard && a && a !== document.body && a.closest?.('.ag-hud, .ag-sheet, .pn-sheet')) {
    let visible = true;
    try {
      visible = a.matches(':focus-visible');
    } catch {
      /* older engines */
    }
    if (visible) return false;
  }
  return true;
}

/**
 * Calm watching: after ~6 s without input in tank view the HUD recedes (opacity only — everything stays in the
 * accessibility tree and focusable, and any pointer move, touch, wheel or key brings it straight back).
 * A touch that wakes it is only a wake: the invisible dock / tool rail used to take that same tap (a panel opened, a
 * tool armed, or the HUD vanished into watch mode), so the click it produces is swallowed. Only that one click: the
 * next tap (the natural retry) always lands, and taps on the still-drawn top bar / tank bar act at once.
 */
function useCalmHud(): boolean {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    let timer = 0;
    let isCalm = false;
    let swallowUntil = 0;
    let keyboard = true;
    const arm = (ms: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (canCalm(keyboard)) {
          isCalm = true;
          setCalm(true);
        } else arm(1500);
      }, ms);
    };
    const wake = (e?: Event) => {
      if (e?.type === 'pointerdown' || e?.type === 'touchstart') keyboard = false;
      else if (e?.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') keyboard = true;
      if (isCalm) {
        isCalm = false;
        setCalm(false);
        const touch = !!e && (e.type === 'touchstart' || (e.type === 'pointerdown' && (e as PointerEvent).pointerType !== 'mouse'));
        if (touch) swallowUntil = performance.now() + SWALLOW_MS;
      }
      arm(CALM_AFTER_MS);
    };
    const swallow = (e: MouseEvent) => {
      // the window is spent by the first click after the wake, wherever it lands (the waking tap's own click often
      // reaches the canvas): a quick retry must never be eaten too
      if (!swallowUntil) return;
      const live = performance.now() <= swallowUntil;
      swallowUntil = 0;
      if (!live) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('.ag-hud') && !t.closest(CALM_LIVE)) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const opts = { passive: true, capture: true } as const;
    const evs = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart', 'focusin'] as const;
    for (const e of evs) window.addEventListener(e, wake, opts);
    window.addEventListener('click', swallow, true);
    // a state change (panel opened by a shortcut, new tool…) also wakes it
    const unsubUI = useUI.subscribe((s, p) => {
      if (s.panel !== p.panel || s.tool !== p.tool || s.selectedCreatureId !== p.selectedCreatureId || s.view !== p.view) wake();
    });
    const unsubShell = useShell.subscribe((s, p) => {
      if (s.popover !== p.popover || s.tankCardOpen !== p.tankCardOpen) wake();
    });
    arm(CALM_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
      for (const e of evs) window.removeEventListener(e, wake, opts);
      window.removeEventListener('click', swallow, true);
      unsubUI();
      unsubShell();
    };
  }, []);
  return calm;
}

/** Letter shortcuts stay out of text fields; a slider or select still takes Escape (it blurs and closes its layer). */
function isTyping(e: KeyboardEvent) {
  if (isTextEntry(e.target)) return true;
  const t = e.target as HTMLElement | null;
  return e.key !== 'Escape' && !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT');
}

/** Space/Enter on a focused control must activate that control, never a global shortcut. */
export function isOnControl(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && !!t.closest?.('button, a, [role="button"], [role="switch"], [role="radio"], [role="tab"], [role="slider"], summary');
}

/**
 * Audit B20 — Space inside a panel, a sheet or a popover scrolls it: opening a panel puts focus on its title, and Space
 * there used to pause the game instead of scrolling the list.
 */
export function isInSheet(e: Pick<KeyboardEvent, 'target'>) {
  const t = e.target as HTMLElement | null;
  return !!t && !!t.closest?.('.pn-sheet, .ag-sheet, .ag-popover');
}

/**
 * The list Space scrolls: the nearest scrolling box around the focus, else the sheet's own body (review: from the
 * panel's title, in the header outside its body, the browser scrolled nothing).
 */
export function sheetScroller(t: HTMLElement): HTMLElement | null {
  const root = t.closest<HTMLElement>('.pn-sheet, .ag-sheet, .ag-popover');
  if (!root) return null;
  for (let el: HTMLElement | null = t; el && el !== root.parentElement; el = el.parentElement) {
    const y = getComputedStyle(el).overflowY;
    if ((y === 'auto' || y === 'scroll') && el.scrollHeight > el.clientHeight) return el;
  }
  return root.querySelector<HTMLElement>('.pn-body, .ag-sheet__body, .ag-alerts-pop__body');
}

/** Keyboard: Space pause · 1/2/3 speed · F feed · T tank card · V view · [ ] tanks · H watch · P photo · N what next · Esc back out. */
function useHudKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const ui = useUI.getState();
      // (chunk 19: nor while Find anything is open — a quick typist's first letters, before its box has focus, were
      // game shortcuts: "p" opened Photo mode)
      if (ui.screen !== 'game' || document.querySelector('.ag-modal-backdrop, .ag-find-backdrop')) return;
      if (ui.photoMode) return; // photo mode handles its own keys
      if (ui.hudHidden) {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'h') {
          e.preventDefault();
          sfx('open');
          ui.set({ hudHidden: false });
        }
        return;
      }
      switch (e.key) {
        case ' ':
          if (isOnControl(e)) return;
          if (isInSheet(e)) {
            const list = sheetScroller(e.target as HTMLElement);
            if (list) {
              e.preventDefault();
              list.scrollBy({ top: (e.shiftKey ? -1 : 1) * list.clientHeight * 0.85, behavior: useSettings.getState().reducedMotion ? 'auto' : 'smooth' });
            }
            return;
          }
          e.preventDefault();
          togglePause();
          sfx('click');
          break;
        case '1':
          setSpeed(1);
          break;
        case '2':
          setSpeed(3);
          break;
        case '3':
          setSpeed(10);
          break;
        case '[':
          cycleTank(-1);
          break;
        case ']':
          cycleTank(1);
          break;
        case 't':
        case 'T':
          toggleTankCard();
          break;
        case 'v':
        case 'V':
          toggleView();
          break;
        case 'f':
        case 'F':
          if (ui.view === 'tank') useShell.getState().togglePopover('food');
          break;
        case 'h':
        case 'H':
          sfx('close');
          enterCinematic('watch');
          break;
        case 'n':
        case 'N':
          // chunk 21 (C) — "What next?", while its button is on screen (a phone's full panel hides the tank bar)
          if (!whatNextReachable()) return;
          toggleWhatNext();
          break;
        case 'p':
        case 'P':
          if (ui.view === 'tank') {
            sfx('camera');
            enterCinematic('photo');
          }
          break;
        case 'Escape': {
          const shell = useShell.getState();
          const a = document.activeElement as HTMLElement | null;
          if (a && a !== document.body && (a.tagName === 'INPUT' || a.tagName === 'SELECT')) a.blur();
          if (shell.popover) shell.set({ popover: null });
          else if (useResume.getState().summary && ui.screen === 'game') useResume.getState().clear(); // lane:ui-shell (B-178) — the welcome-back card
          else if (ui.tool !== 'none') selectTool('none');
          else if (ui.panel) ui.set({ panel: null });
          else if (ui.selectedCreatureId) ui.set({ selectedCreatureId: null });
          else if (shell.tankCardOpen) shell.set({ tankCardOpen: false });
          else return;
          e.preventDefault(); // one layer per Escape (sheets skip handled events)
          sfx('close');
          break;
        }
        default:
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Keyboard users: a popover that closes (Escape, a pick) hands focus back to the button that opened it. */
const POPOVER_TRIGGER: Partial<Record<NonNullable<Popover>, string>> = { food: 'tool-feed', target_food: 'tool-target-feed', lights: 'tool-lights', alerts: 'hud-alerts', more: 'dock-more', shared: 'shared-strip' };
function usePopoverFocusReturn() {
  const popover = useShell((s) => s.popover);
  const prev = useRef<Popover>(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = popover;
    if (popover || !was) return;
    const id = POPOVER_TRIGGER[was];
    // (the popover is fading out: focus is still inside it, or already fell to <body>)
    const a = document.activeElement;
    if (id && (!a || a === document.body || a.closest('.ag-popover'))) document.querySelector<HTMLElement>(`[data-testid="${id}"]`)?.focus({ preventScroll: true });
  }, [popover]);
}

/** Close popovers when clicking elsewhere (the 3D scene or other HUD). */
function usePopoverDismiss() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!useShell.getState().popover) return;
      const t = e.target as HTMLElement | null;
      // (a dialog opened from a popover, such as the bell's "Add a quarantine tank", is portalled outside it: a press
      // inside it used to close the popover, and the dialog with it)
      if (t?.closest('.ag-popanchor, .ag-popover, .ag-modal-backdrop')) return;
      useShell.getState().set({ popover: null });
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, []);
}

function WatchRestore() {
  const hidden = useUI((s) => s.hudHidden);
  return (
    <AnimatePresence>
      {hidden && (
        <motion.button
          type="button"
          className="ag-watch-restore"
          aria-label="Show interface (H)"
          title="Show interface (H)"
          data-testid="watch-restore"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => {
            sfx('open');
            useUI.getState().set({ hudHidden: false });
          }}
        >
          <Eye size={16} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function GameHUD() {
  useHudKeys();
  usePopoverDismiss();
  usePopoverFocusReturn();
  useCardDockRules();
  usePanelAsideRules();
  useFindKeys();
  useFocusedTankGuard();
  const calm = useCalmHud();
  const hidden = useUI((s) => s.hudHidden);
  const photo = useUI((s) => s.photoMode);
  const view = useUI((s) => s.view);
  const panel = useUI((s) => s.panel);
  const decorating = useUI((s) => isDecorating(s.tool, s.view)); // chunk 19 (QOL-005): the view pad takes the tool rail's place
  const docked = useDockedCard();
  const creatureOpen = docked === 'creature';
  const tankCardOpen = docked === 'tank';
  const hasGame = useGame((s) => !!s.game);
  const mobile = useIsMobile();
  const bottomSheets = useMedia(BOTTOM_SHEET_QUERY);
  const chromeHidden = hidden || photo;
  const sideSheets = !bottomSheets && !panel;
  // the guide card reserves its corner for the camera (desktop tank view); when it takes the left strip, the tank
  // shifts right, so the tool rail reserves its own strip too. Beside the right creature card a left strip would leave
  // too little width (the framing then gives up), so the guide falls back to the bottom band.
  const coachSide = useShell((s) => s.coachSide);
  // phones: the guide sits in the band above the dock, so it always claims the bottom (tank and room view)
  const coachOcclude = !panel && (bottomSheets || view === 'tank');
  if (!hasGame) return null;
  return (
    <>
      <motion.div
        className={clsx('ag-hud', chromeHidden && 'is-hidden', calm && !chromeHidden && 'is-calm', decorating && 'is-decorating', bottomSheets && (panel || creatureOpen || tankCardOpen) && 'has-bottom-sheet', view === 'facility' && 'is-facility', creatureOpen && sideSheets && 'has-right-sheet', tankCardOpen && sideSheets && 'has-left-sheet', panel && 'has-panel')}
        initial={{ opacity: 0 }}
        animate={{ opacity: chromeHidden ? 0 : 1 }}
        transition={{ duration: 0.35 }}
        aria-hidden={chromeHidden}
        inert={chromeHidden}
      >
        <ErrorBoundary name="topbar">
          <TopBar compact={mobile} />
        </ErrorBoundary>
        {/* chunk 13's shared-shop strip is the top-left pill's dropdown since chunk 19 (QOL-007, src/ui/shared/SharedMenu.tsx) */}
        <ErrorBoundary name="tankbar">
          <TankBar />
        </ErrorBoundary>
        {view === 'tank' && (
          <ErrorBoundary name="tools">
            <ToolRail occlude={(creatureOpen && sideSheets) || (coachOcclude && coachSide === 'left' && !creatureOpen)} />
            <div className="ag-hud__cam">
              <CameraChips />
            </div>
            <DecorCamPad />
          </ErrorBoundary>
        )}
        {view === 'facility' && (
          <ErrorBoundary name="roomcam">
            <div className="ag-hud__cam ag-hud__cam--room">
              <RoomViewChip />
            </div>
          </ErrorBoundary>
        )}
        <ErrorBoundary name="toolhint">
          <ToolHint />
        </ErrorBoundary>
        <ErrorBoundary name="dock">
          {/* lane:ui-shell (chunk 1, §5.2) — phones get the five-tab bar instead of the dock */}
          {mobile ? <TabBar /> : <Dock />}
        </ErrorBoundary>
        <ErrorBoundary name="tutorial">
          {/* the expanded guide card claims its corner: the coach picks data-occlude="bottom"|"left" so the camera frames the tank clear of it (desktop tank view) */}
          <div className="ag-hud__coach" data-coach-occlude={coachOcclude ? '1' : undefined} data-occlude={coachOcclude && coachSide ? (coachSide === 'left' && creatureOpen ? 'bottom' : coachSide) : undefined}>
            <TutorialCoach />
          </div>
        </ErrorBoundary>
        <ErrorBoundary name="party">
          <PartyBanner />
        </ErrorBoundary>
      </motion.div>
      <ErrorBoundary name="creature-card">
        <CreatureCard />
      </ErrorBoundary>
      <ErrorBoundary name="tank-card">
        <TankCard />
      </ErrorBoundary>
      {/* Always mounted in game: PanelHost (lane ui-panels) renders ui.panel (except settings/dev) and any build-mode overlays. */}
      <ErrorBoundary name="panels" resetKey={panel}>
        <Suspense fallback={null}>
          <PanelHost />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary name="more">
        <MoreSheet />
      </ErrorBoundary>
      <ErrorBoundary name="photo">
        <LazyPhotoMode />
      </ErrorBoundary>
      <WatchRestore />
      <ErrorBoundary name="find">
        <FindAnything />
      </ErrorBoundary>
      <ErrorBoundary name="unlock-help">
        <UnlockHelpHost />
      </ErrorBoundary>
      <ErrorBoundary name="tour">
        <LazyTour />
      </ErrorBoundary>
      <ErrorBoundary name="welcome">
        <LazyWelcomeBack />
      </ErrorBoundary>
    </>
  );
}
