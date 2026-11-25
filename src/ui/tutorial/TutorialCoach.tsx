/**
 * Tutorial coach card (bottom-left; above the dock on phones). Reads the facility lane's chain for the starter
 * (`tutorialChain`) + `state.progress.tutorial`, pulses the element whose `data-tutorial-id` matches the step's
 * `hintTarget`, and offers a playable "Show me" action. OWNER: lane "ui-shell".
 *
 * Layout rules (so the guide never hides what it points at):
 *  - it lifts above the dock whenever the two would overlap (mid-size windows),
 *  - the left tank card stacks above it instead of pushing it over the dock (`--coach-clear` on :root),
 *  - waiting steps show live progress (friend visits 1/3, reputation 9/15) and offer a fast-forward.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, ChevronDown, ChevronUp, X, ArrowRight, Hand, Check, FastForward, Sparkles, FlaskConical, Play, Store, ScrollText } from 'lucide-react';
import type { GameSpeed, GameState } from '@/types';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { sfx } from '@/audio/sfx';
import { TUTORIAL_QUEST_REWARD, type Objective } from '@/data/quests';
import { currentTutorialStep } from '@/sim/facility';
import { useShell } from '../common/shellStore';
import { safe, SHORT_LANDSCAPE_QUERY, useIsMobile, useMedia } from '../common/safe';
import { BOTTOM_SHEET_QUERY } from '../common/Sheet';
import { ProgressDots, Button } from '../kit';
import { guideTarget, openPanel } from '../hud/Dock';
import { MORE_ITEMS } from '../hud/TabBar'; // lane:ui-shell (chunk 1)
import { toggleTankCard } from '../hud/TankBar';
import { useDockedCard, type DockedCard } from '../hud/cardDock';
import { selectTool, setCameraMode } from '../hud/ToolRail';
import { setSpeed } from '../hud/TopBar';
import { personalityLabel } from '../common/format';
import { tutorialFlag } from '../common/actions';
import { Spotlight, useSpotlightTarget } from './Spotlight'; // chunk 19 (ADR-0055 decision 7, QOL-008)
import { guideAim } from './guideTargets'; // chunk 19 (QOL-008)
import { startTour, useTour } from './tourStore'; // chunk 19 (QOL-008)
import { FINE_POINTER, currentCoachStep, friendWait, guideAnimal } from './guideText'; // audit 2026-11-17 (A1, A13)

// (the step's words moved to ./guideText, shared with Research › Quests)
export { currentCoachStep, type CoachStep } from './guideText';

/**
 * Audit 2026-11-17 (P1) — the side card that folds the guide into its pill: the left tank card that shares its column
 * on desktop, or either card's bottom sheet on a phone (the animal's card covered the guide's next step, "Have a look
 * around", right after "Meet them" opened it). The creature card's desktop sheet is on the right, clear of the guide.
 */
export function guideFold(card: DockedCard, bottomSheets: boolean): 'tank' | 'creature' | null {
  if (card === 'tank') return 'tank';
  if (card === 'creature' && bottomSheets) return 'creature';
  return null;
}

/**
 * A11 — the water step counts the reading as read once the tank card has been on screen this long (the guide opens
 * it with the reading already expanded, and points at it meanwhile). It used to end the moment the card opened.
 */
export const WATER_READ_MS = 2500;

// ───────────── objective progress (waiting steps) ─────────────

interface Progress {
  label: string;
  cur: number;
  max: number;
}

/**
 * The sim's own measure of the current step (relative counters are counted from when the step began; labels such as
 * "more friend visits" / "reputation earned on this step" come with it).
 */
function stepProgress(g: GameState, o: Objective): Progress | null {
  const v = safe('currentTutorialStep', () => currentTutorialStep(g), null);
  const p = v?.progress;
  if (!p || !(p.target > 0)) return null;
  return { label: p.label || objectiveLabel(o, p.target), cur: p.current, max: p.target };
}

const COUNTER_WORDS: Record<string, [string, string]> = { friend_visits: ['friend visit', 'friend visits'], sales: ['sale', 'sales'], feeds: ['feed', 'feeds'], decor_placed: ['decor piece placed', 'decor pieces placed'], visitors: ['visitor', 'visitors'] };

/** Words for an objective the sim didn't label ("friend visit or sale"). */
function objectiveLabel(o: Objective, n: number): string {
  const one = n === 1 ? 0 : 1;
  switch (o.type) {
    case 'counter':
      return o.label ?? COUNTER_WORDS[o.key]?.[one] ?? o.key.replace(/_/g, ' ');
    case 'reputation':
      return o.label ?? 'reputation';
    case 'any': {
      const parts = o.of.filter((x) => x.type !== 'flag').map((x) => objectiveLabel(x, n));
      return [...new Set(parts)].join(' or ') || 'to go';
    }
    case 'cond':
      return o.label ?? 'to go';
    default:
      return 'to go';
  }
}

/** Steps that complete by playing on (time passing) rather than by one click. */
function isWaitingStep(o: Objective): boolean {
  if (o.type === 'flag') return false;
  if (o.type === 'any') return o.of.every(isWaitingStep) || o.of.some((x) => x.type === 'counter' && /visit|sales/.test(x.key));
  if (o.type === 'counter') return /visit|sales/.test(o.key);
  if (o.type === 'reputation') return true;
  return o.type === 'cond' && o.cond.type === 'reputation';
}

/** The guide switched the camera to follow the starter (it hands the view back once the step is done). */
const guideCamera = { followed: false };

/**
 * chunk 22 (ADR-0058, G-2) — the card the guide's own button opened ("Meet them": the animal's card; "Open the tank
 * card"), and for which step. On a phone that card folds the guide into its pill (the tank card does on a computer
 * too), so the next step's words never showed: once the step is done the guide puts the card away after a moment,
 * unless the player has used the card or opened something else meanwhile.
 */
interface GuideCard {
  kind: 'creature' | 'tank';
  /** The animal whose card it is (creature). */
  id: string | null;
  tankId: string | null;
  /** The guide's step index when its button opened the card. */
  step: number;
  /** The player used the card before its step was done (the confirmation review, 2): it is theirs. */
  used: boolean;
}
const guideCard: { current: GuideCard | null } = { current: null };
let forgetGuideCard: (() => void) | null = null;

const CARD_SEL: Readonly<Record<GuideCard['kind'], string>> = { creature: '[data-testid="creature-card"]', tank: '[data-testid="tank-card"]' };
/** What counts as using the card: a touch, the wheel, a key, focus moved inside it. */
const USE_EVENTS = ['pointerdown', 'wheel', 'keydown', 'focusin'] as const;

/**
 * An event that is the player using the card. Not the card's own focus move to its close button as it opens (Sheet:
 * 60 ms after it opens, and much later on a slow phone: the confirmation review of chunk 22, 1; a keyboard player's
 * move there still counts, by its key). And while the step is still to do (`doing`), not the reading the water step
 * asks for (a tap on it is the step itself: counting it kept the card, and the guide its pill, as before G-2).
 */
function usesCard(e: Event, kind: GuideCard['kind'], doing: boolean): boolean {
  const t = e.target as Element | null;
  if (!t?.closest?.(CARD_SEL[kind])) return false;
  if (e.type === 'focusin' && t.closest('.ag-sheet__close')) return false;
  // (the re-check of chunk 22: scrolling the readings with the wheel is reading them, not the step's tap)
  return !(doing && e.type !== 'wheel' && t.closest('[data-param]'));
}

/**
 * Remember the card the guide's button just opened, only while that card stays open (the review of chunk 22, S1(b)):
 * one the player closed and opened again is theirs, and the guide leaves it. Its use counts from now (the confirmation
 * review, 2: the water step is done 2.5 s after its card opens, and a player reading it meanwhile lost it).
 */
function rememberGuideCard(c: GuideCard | null): void {
  forgetGuideCard?.();
  forgetGuideCard = null;
  guideCard.current = c;
  if (!c) return;
  const drop = () => {
    if (guideCard.current === c) guideCard.current = null;
    forgetGuideCard?.();
    forgetGuideCard = null;
  };
  const offShell = useShell.subscribe((s) => {
    if (c.kind === 'tank' && !s.tankCardOpen) drop();
  });
  const offUI = useUI.subscribe((s) => {
    if (c.kind === 'creature' && s.selectedCreatureId !== c.id) drop();
  });
  const onUse = (e: Event) => {
    if (usesCard(e, c.kind, true)) c.used = true;
  };
  for (const t of USE_EVENTS) document.addEventListener(t, onUse, true);
  forgetGuideCard = () => {
    offShell();
    offUI();
    for (const t of USE_EVENTS) document.removeEventListener(t, onUse, true);
  };
}

/** The card the guide opened for the step just done, if it is still the one it opened and unused (and forget it). */
function takeGuideCard(done: number, now: number): GuideCard | null {
  const c = guideCard.current;
  if (!c || c.step < done || c.step >= now) return null;
  rememberGuideCard(null);
  return c.used ? null : c;
}

/**
 * How long the card the guide opened stays after its step is done (its "done" line then shows on the guide). The
 * animal's card longer (the review, S1(c)): "Meet them" is done as the card opens, so this is all the time a new player
 * has to read it; the tank card's reading has been on screen a few seconds already (A11's WATER_READ_MS).
 */
export const GUIDE_CARD_MS: Readonly<Record<GuideCard['kind'], number>> = { creature: 8000, tank: 3500 };

/** How long a step's done line shows on the guide card. */
const DONE_LINE_MS = 4200;

/**
 * Put the guide's card away after its GUIDE_CARD_MS, unless the player uses the card (a touch, the wheel, a key or
 * focus moved inside it: the review, S1(a), for keyboard and screen-reader players; `usesCard`), opens another card,
 * a panel, a popover or a tool, or closes the card themselves first. A card closed with focus inside it hands focus to
 * the guide card's own button, never to the page. `onGone` runs once it has closed it. Returns the way to call it off.
 */
function putAwayLater(c: GuideCard, onGone: () => void): () => void {
  const sel = CARD_SEL[c.kind];
  let over = false;
  const onUse = (e: Event) => {
    if (usesCard(e, c.kind, false)) stop();
  };
  const unsubUI = useUI.subscribe((s, p) => {
    if (s.panel !== p.panel || s.selectedCreatureId !== p.selectedCreatureId || s.focusedTankId !== p.focusedTankId || s.tool !== p.tool || s.view !== p.view) stop();
  });
  const unsubShell = useShell.subscribe((s, p) => {
    if (s.tankCardOpen !== p.tankCardOpen || s.popover !== p.popover) stop();
  });
  for (const t of USE_EVENTS) document.addEventListener(t, onUse, true);
  const timer = window.setTimeout(() => {
    stop();
    const ui = useUI.getState();
    const sh = useShell.getState();
    if (ui.panel || sh.popover || ui.tool !== 'none') return;
    const focused = !!document.activeElement?.closest?.(sel);
    let closed = false;
    if (c.kind === 'creature') {
      // (a computer's animal card sits on the right, clear of the guide: it stays)
      if (ui.selectedCreatureId === c.id && (window.matchMedia?.(BOTTOM_SHEET_QUERY).matches ?? false)) {
        ui.set({ selectedCreatureId: null });
        closed = true;
      }
    } else if (sh.tankCardOpen && !ui.selectedCreatureId && ui.focusedTankId === c.tankId) {
      sh.set({ tankCardOpen: false });
      closed = true;
    }
    if (!closed) return;
    if (focused) focusGuide(sel);
    onGone();
  }, GUIDE_CARD_MS[c.kind]);
  function stop() {
    if (over) return;
    over = true;
    window.clearTimeout(timer);
    unsubUI();
    unsubShell();
    for (const t of USE_EVENTS) document.removeEventListener(t, onUse, true);
  }
  return stop;
}

/**
 * Focus was in the card the guide put away: on to the guide card's own button (its first button if the step has
 * none), as soon as the guide is back from its pill (it waits for the pill to leave). Not if the player has put focus
 * somewhere else meanwhile.
 */
function focusGuide(cardSel: string): void {
  const until = performance.now() + 2000;
  const tick = () => {
    const a = document.activeElement as HTMLElement | null;
    const lost = !a || a === document.body || !!a.closest(cardSel);
    if (!lost) return;
    const card = document.querySelector<HTMLElement>('section[data-testid="tutorial-card"]');
    const btn = card?.querySelector<HTMLElement>('[data-guide-showme]') ?? card?.querySelector<HTMLElement>('button');
    if (btn) btn.focus({ preventScroll: true });
    else if (performance.now() < until) window.setTimeout(tick, 50);
  };
  window.setTimeout(tick, 50);
}

/** "Speed up" on a waiting step is temporary: the guide hands back the previous speed when the step completes. */
const guideSpeed: { from: GameSpeed | null } = { from: null };

function speedUpForStep() {
  const g = useGame.getState().game;
  if (!g) return;
  if (guideSpeed.from == null) guideSpeed.from = g.clock.speed;
  sfx('click');
  setSpeed(3);
}

/** Restore the pre-"Speed up" speed, unless the player picked another speed themselves meanwhile. */
function restoreGuideSpeed(): boolean {
  const from = guideSpeed.from;
  guideSpeed.from = null;
  const g = useGame.getState().game;
  if (from == null || !g || g.clock.speed !== 3 || from === 3) return false;
  setSpeed(from);
  return true;
}

/** "Show me": do the first half of the step for the player (open the thing), never complete it for them. */
export function showMe(target: string, g: GameState) {
  const ui = useUI.getState();
  sfx('open');
  switch (target) {
    case 'tool-feed':
      ui.set({ view: 'tank', panel: null });
      useShell.getState().set({ popover: 'food' });
      break;
    case 'tool-target-feed':
      ui.set({ view: 'tank', panel: null });
      useShell.getState().set({ popover: 'target_food' });
      break;
    case 'tank-card-toggle': {
      // opens it, or brings a covered card to the front (never closes it)
      const sh = useShell.getState();
      const wasOpen = sh.tankCardOpen; // chunk 22 (G-2): a card the player had opened is theirs, not the guide's
      if (!sh.tankCardOpen || ui.panel || ui.selectedCreatureId) toggleTankCard();
      rememberGuideCard(!wasOpen && useShell.getState().tankCardOpen ? { kind: 'tank', id: null, tankId: useUI.getState().focusedTankId, step: g.progress.tutorial?.step ?? -1, used: false } : null);
      break;
    }
    case 'creature-name': {
      const starter = guideAnimal(g, ui.focusedTankId);
      const was = ui.selectedCreatureId; // chunk 22 (G-2)
      if (starter) ui.set({ selectedCreatureId: starter.id, view: 'tank', panel: null, focusedTankId: starter.tankId ?? ui.focusedTankId });
      else ui.toast('There’s no animal to show right now. Bring one home from the Market first.', 'info');
      rememberGuideCard(starter && was !== starter.id ? { kind: 'creature', id: starter.id, tankId: starter.tankId ?? null, step: g.progress.tutorial?.step ?? -1, used: false } : null);
      break;
    }
    case 'scene':
      setCameraMode(ui.cameraMode === 'orbit' ? 'close' : 'orbit');
      break;
    case 'follow-starter': {
      const starter = guideAnimal(g, ui.focusedTankId);
      if (starter) {
        ui.set({ view: 'tank', panel: null, focusedTankId: starter.tankId ?? ui.focusedTankId, followCreatureId: starter.id });
        setCameraMode('follow');
        guideCamera.followed = true;
      } else ui.toast('There’s no animal to follow right now. Bring one home from the Market first.', 'info');
      break;
    }
    default:
      if (target.startsWith('dock-')) {
        const id = target.slice(5) as Parameters<typeof openPanel>[0];
        // "show me" never closes the panel it points at (openPanel toggles): an open one is pointed at the step's section
        if (ui.panel !== id) openPanel(id);
        else {
          ui.set({ panelTarget: guideTarget(id) });
          // audit 2026-11-17 (A9): a panel already open when its step began ("The market" with the Market open) counts
          // now; its flag is only raised as a panel opens, so the step used to wait and this button did nothing
          tutorialFlag(`opened_${id}`);
          tutorialFlag(`opened_panel:${id}`);
        }
      }
  }
}

/** Button-sized name: "Tango the Magnificent" → "Tango" (long names would push the guide's buttons off the card). */
function shortName(name: string): string {
  if (name.length <= 12) return name;
  const first = name.split(/\s+/)[0];
  return first.length <= 12 ? first : `${first.slice(0, 11)}…`;
}

/** What the habitat step asks for, in each starter's own words (its suggestions lead the Build panel's decor list). */
const HABITAT_PICK: Record<string, string> = {
  axolotl: 'Pick a cave or a plant',
  betta: 'Pick a plant',
  pea_puffer: 'Pick a plant or some wood',
  ocellaris_clownfish: 'Pick some rock',
  lined_seahorse: 'Pick a hitching post',
};

const SHOW_ME_LABEL: Record<string, string> = {
  'tool-feed': 'Open the food',
  'tool-target-feed': 'Target feed',
  'tank-card-toggle': 'Open the tank card',
  'creature-name': 'Meet them',
  scene: 'Try the camera',
  'dock-build': 'Open Build',
  'dock-tanks': 'Open Tanks', // audit 2026-11-17 (A3): the betta's and seahorse's nursery step (a tank's purpose)
  'dock-market': 'Open the Market',
  'dock-research': 'Open Research',
  'hud-money': '',
};

/**
 * Keep the guide clear of the dock and let the left tank card stack above it. Measured, not guessed: the dock width
 * depends on the window, text scale and unlocked items.
 */
function useCoachLayout(active: boolean) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!active) {
      root.style.removeProperty('--coach-clear');
      return;
    }
    const tick = () => {
      // audit 2026-11-17 (P1) — the animal's bottom sheet is as tall as its content: hud.css lifts the folded guide
      // above its real top (its layout height: the slide-in transform doesn't count)
      const ccard = document.querySelector<HTMLElement>('.ag-ccard.ag-sheet--bottom');
      if (ccard && ccard.offsetHeight > 0) root.style.setProperty('--coach-ccard-h', `${ccard.offsetHeight}px`);
      else root.style.removeProperty('--coach-ccard-h');
      const wrap = document.querySelector<HTMLElement>('.ag-hud__coach');
      const card = wrap?.querySelector<HTMLElement>('.ag-coach, .ag-coach-pill') ?? null;
      const dock = document.querySelector<HTMLElement>('.ag-dock');
      if (!wrap || !card) {
        root.style.removeProperty('--coach-clear');
        if (!wrap && useShell.getState().coachSide) useShell.getState().set({ coachSide: null });
        return;
      }
      if (dock) {
        const d = dock.getBoundingClientRect();
        const w = wrap.getBoundingClientRect();
        const overlapX = w.left < d.right - 2 && w.right > d.left + 2;
        wrap.classList.toggle('is-raised', overlapX);
      }
      const r = card.getBoundingClientRect();
      if (r.height > 0) root.style.setProperty('--coach-clear', `${Math.round(window.innerHeight - r.top + 10)}px`);
      // Camera framing (render/camera/viewport.ts): claim the side that leaves the tank more room. A tank is ~2:1,
      // so a tall raised card is better treated as a left strip, a low wide one as a bottom band.
      if (wrap.dataset.coachOcclude === '1' && r.height > 60) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const hudTop = 130;
        const hudBottom = 110;
        const aspect = 2;
        const bottomFit = Math.min(W / aspect, Math.max(0, r.top - hudTop));
        const leftFit = Math.min(Math.max(0, W - r.right) / aspect, H - hudTop - hudBottom);
        // (a phone held sideways keeps the card in the bottom-left corner: a left strip leaves the tank more room)
        const phone = (window.matchMedia?.(BOTTOM_SHEET_QUERY).matches ?? false) && !(window.matchMedia?.(SHORT_LANDSCAPE_QUERY).matches ?? false);
        const side = !phone && leftFit > bottomFit * 1.05 ? 'left' : 'bottom';
        if (useShell.getState().coachSide !== side) useShell.getState().set({ coachSide: side });
      } else if (useShell.getState().coachSide) useShell.getState().set({ coachSide: null });
    };
    tick();
    const id = window.setInterval(tick, 300);
    window.addEventListener('resize', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', tick);
      root.style.removeProperty('--coach-clear');
      root.style.removeProperty('--coach-ccard-h');
      document.querySelector('.ag-hud__coach')?.classList.remove('is-raised');
      if (useShell.getState().coachSide) useShell.getState().set({ coachSide: null });
    };
  }, [active]);
}

export function TutorialCoach() {
  const game = useGame((s) => s.game);
  const hints = useSettings((s) => s.showTutorialHints);
  const panel = useUI((s) => s.panel);
  const popover = useShell((s) => s.popover);
  const tool = useUI((s) => s.tool);
  const speed = useGame((s) => s.game?.clock.speed ?? 1);
  const fine = useMedia(FINE_POINTER);
  const [userCollapsed, setCollapsed] = useState(false);
  // The left tank card shares the guide's column on desktop: the guide folds into its pill meanwhile.
  const bottomSheets = useMedia(BOTTOM_SHEET_QUERY);
  const dockedCard = useDockedCard();
  // lane:qa-final — on phones the tank card is a bottom sheet that hid the expanded guide (after the water step the
  // next step sat unseen under it). It folds into the pill too, which hud.css lifts just above the sheet; and so does
  // the animal's card (audit 2026-11-17, P1), whose sheet the guide measures (useCoachLayout).
  const fold = guideFold(dockedCard, bottomSheets);
  const mobile = useIsMobile(); // lane:ui-shell (chunk 1) — the tab bar's layout, where some destinations live in More
  const collapsed = userCollapsed || fold !== null;
  const [confirmSkip, setConfirmSkip] = useState(false);
  const cur = currentCoachStep(game, fine);
  const lastIdx = useRef<number | null>(null);
  const lastStepId = useRef<string | null>(null); // chunk 22 (G-1): the step just done, at an advance
  const putAway = useRef<(() => void) | null>(null); // chunk 22 (G-2)
  const [justAdvanced, setJustAdvanced] = useState(false);
  const [doneLine, setDoneLine] = useState<string | null>(null);
  // chunk 22 (G-2, the review's S1(c)): the done line has one timer, so the guide can show it again, for its full time,
  // when it puts the card away (under the card the guide is only its pill, and the line went unseen)
  const doneTimer = useRef(0);
  const lastDone = useRef<string | null>(null);
  const showDone = useRef((line: string | null, ms: number) => {
    window.clearTimeout(doneTimer.current);
    lastDone.current = line;
    setDoneLine(line);
    doneTimer.current = window.setTimeout(() => setDoneLine(null), ms);
  }).current;
  useEffect(
    () => () => {
      putAway.current?.();
      window.clearTimeout(doneTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!cur) return;
    if (lastIdx.current != null && cur.index > lastIdx.current) {
      sfx('unlock', { volume: 0.6 });
      setJustAdvanced(true);
      // two waiting steps in a row ("Word gets around" → reputation): ×3 carries over instead of dropping to 1× for
      // a second wait the player would have to speed up again
      const slowed = isWaitingStep(cur.step.objective) ? false : restoreGuideSpeed();
      const line = slowed ? `${cur.prevDone ?? 'Done.'} Back to normal speed.` : cur.prevDone;
      setCollapsed(false);
      setConfirmSkip(false);
      const shown = useSettings.getState().showTutorialHints && !useTour.getState().running;
      // chunk 22 (ADR-0058, G-1): the feed step is done with one tap of food, but the food stayed in hand, and on a
      // phone its prompt ("Tap the water to drop …") hides the guide card, so the next step was never read. The guide
      // puts the food down as it moves on (only here: feeding outside the guide keeps the tool as it was)
      if (shown && lastStepId.current === 'feed') {
        const ui = useUI.getState();
        if (ui.tool === 'feed' || ui.tool === 'target_feed') selectTool('none');
        const sh = useShell.getState();
        if (sh.popover === 'food' || sh.popover === 'target_food') sh.set({ popover: null });
      }
      // chunk 22 (G-2): the card the guide's button opened for the step just done goes away after a moment, and the
      // done line shows again, for its full time, once it has gone (until then it is held: the guide is a pill)
      const card = takeGuideCard(lastIdx.current, cur.index);
      // (a computer's animal card sits on the right, clear of the guide: it isn't put away)
      const away = shown && !!card && (card.kind === 'tank' || bottomSheets);
      if (away && card) {
        putAway.current?.();
        putAway.current = putAwayLater(card, () => showDone(lastDone.current, DONE_LINE_MS));
      }
      showDone(line, away && card ? GUIDE_CARD_MS[card.kind] + 1000 : DONE_LINE_MS);
      const t = window.setTimeout(() => setJustAdvanced(false), 1400);
      // a follow-cam the guide started ends with its step (after a moment to enjoy the behaviour)
      const t3 = guideCamera.followed
        ? window.setTimeout(() => {
            guideCamera.followed = false;
            if (useUI.getState().cameraMode === 'follow') useUI.getState().set({ cameraMode: 'front' });
          }, 2500)
        : 0;
      return () => {
        window.clearTimeout(t);
        if (t3) window.clearTimeout(t3);
      };
    }
    lastIdx.current = cur.index;
  }, [cur?.index]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cur) return;
    lastIdx.current = cur.index;
    lastStepId.current = cur.step.id;
  });
  // guide finished or skipped while sped up: hand the speed back too
  const hasStep = !!cur;
  useEffect(() => {
    if (!hasStep) restoreGuideSpeed();
  }, [hasStep]);

  // The guide just finished in this session: celebrate and point at what unlocks next.
  const sawGuide = useRef<string | null>(null);
  const [finale, setFinale] = useState(false);
  const saveId = game?.saveId ?? null;
  const tutDone = !!game?.progress?.tutorial?.done && !game?.progress?.tutorial?.skipped;
  useEffect(() => {
    if (cur && saveId && hints) sawGuide.current = saveId;
    else if (tutDone && saveId && sawGuide.current === saveId) {
      sawGuide.current = null;
      setFinale(true);
      // chunk 22 (ADR-0058, G-3): the last step ends as Research opens, and on a phone its sheet covers the finale
      // card: Research turns to its Quests tab, where the guide's reward waits (the finale shows when it closes)
      const ui = useUI.getState();
      if (bottomSheets && ui.panel === 'research') ui.set({ panelTarget: 'tab:quests' });
    }
  }, [cur?.index, tutDone, saveId, hints]); // eslint-disable-line react-hooks/exhaustive-deps

  // chunk 19 (QOL-008) — the tour has the screen to itself while it runs
  const touring = useTour((s) => s.running);
  const visible = ((!!cur && hints) || finale) && !!game && !touring;
  useCoachLayout(visible);
  const tankCardOpen = useShell((s) => s.tankCardOpen);
  // A11 — the water step: while the tank card is on screen the guide is folded beside it, but it still points at the
  // reading it asks about, and counts it as read after a moment (opening the card used to end the step at once)
  const waterCard = cur?.step.id === 'water' && dockedCard === 'tank';
  useEffect(() => {
    if (!waterCard) return;
    const t = window.setTimeout(() => tutorialFlag('read_water'), WATER_READ_MS);
    return () => window.clearTimeout(t);
  }, [waterCard]);
  const aimNow = cur && game && hints && !touring && (!collapsed || (waterCard && !userCollapsed)) ? guideAim(cur.step.id, cur.step.hintTarget === 'tool-feed' && /target-feed/i.test(cur.step.body) ? 'tool-target-feed' : cur.step.hintTarget, game.progress.tutorial?.starterId || game.starterId, { panel, popover, tool, tankCardOpen, mobile }, cur.step.reward?.unlocks ?? []) : null;
  const spotRect = useSpotlightTarget(aimNow?.candidates ?? [], { scrollIntoView: true });

  if (touring) return null;
  if (finale && game) return <GuideFinale game={game} mobile={mobile} onClose={() => setFinale(false)} />;
  if (!cur || !hints || !game) return null;
  // Slow feeders (seahorses) are taught target feeding: point at that tool instead of plain Feed.
  const target = cur.step.hintTarget === 'tool-feed' && /target-feed/i.test(cur.step.body) ? 'tool-target-feed' : cur.step.hintTarget;
  // "Watch the gills" style steps: the helpful action is following the starter, not orbiting.
  const observing = cur.step.id === 'observe' && target === 'scene';
  const action = observing ? 'follow-starter' : target;
  const starterName = guideAnimal(game)?.name; // A1: the animal "Follow" follows (the starter while it is with you)
  // the CTA follows the state: once the food picker / Build is open the button gives way to a plain hint saying what
  // to do there (pressing "Open Build" again used to close Build, and re-opening an open food picker did nothing).
  // The upgrade step only waits for reputation: with its panel (Build, or Tanks for a nursery) open there is nothing
  // more to point at.
  const starterId = game.progress.tutorial?.starterId || game.starterId;
  const opened =
    (target === 'tool-feed' && popover === 'food') || (target === 'tool-target-feed' && popover === 'target_food')
      ? 'Pick a food'
      : target === 'dock-build' && panel === 'build'
        ? cur.step.id === 'habitat'
          ? (HABITAT_PICK[starterId] ?? 'Pick a decoration')
          : ''
        : cur.step.id === 'upgrade' && target === `dock-${panel}`
          ? ''
          : null;
  const showLabel = opened != null ? '' : observing ? (starterName ? `Follow ${shortName(starterName)}` : 'Follow') : SHOW_ME_LABEL[target] ?? (target.startsWith('dock-') ? `Open ${target.slice(5)}` : '');
  const canNext = cur.step.objective.type === 'flag' && !!cur.step.objective.fallbackHours;
  const waiting = isWaitingStep(cur.step.objective);
  const progress = waiting ? stepProgress(game, cur.step.objective) : null;
  const pct = progress ? Math.max(0, Math.min(1, progress.cur / Math.max(1, progress.max))) : 0;
  // A1 — a step waiting on friends says why none can come (no animal on show, one unwell, night) instead of waiting in
  // silence; "Speed up" is offered only when time is what's missing. A17 — and says when time is paused.
  const wait = waiting ? friendWait(game, cur.step.id) : null;
  const timeHelps = waiting && (!wait || wait.time);
  const paused = timeHelps && speed === 0;

  // lane:ui-shell (chunk 1, §5.5) — on phones a destination that lives in More (Research) has no dock button to ring:
  // ring the More tab with a note saying so, then the destination's tile once the More sheet is open
  const inMore = mobile && target.startsWith('dock-') ? MORE_ITEMS.find((it) => it.id === target.slice(5)) : undefined;
  const moreOpen = popover === 'more';
  const ringTarget = inMore ? (moreOpen ? `more-${inMore.id}` : 'dock-more') : target;
  const ringing = !collapsed && !panel && tool === 'none';

  return (
    <>
      {/* chunk 19 (ADR-0055 decision 7, QOL-008) — the spotlight follows the step into the place it needs (guideTargets.ts) */}
      {aimNow && <Spotlight rect={spotRect} dim={aimNow.dim} hand={aimNow.hand} gold={!!inMore} />}
      {!aimNow && ringing && <TutorialHighlight target={ringTarget} gold={!!inMore} />}
      {ringing && inMore && !moreOpen && <MoreGuideBubble label={inMore.label} />}
      <AnimatePresence mode="wait">
        {collapsed ? (
          <motion.button
            key="pill"
            type="button"
            className="ag-coach-pill"
            data-testid="tutorial-card"
            onClick={() => {
              sfx('open');
              setCollapsed(false);
              if (fold === 'tank') useShell.getState().set({ tankCardOpen: false });
              else if (fold === 'creature') useUI.getState().set({ selectedCreatureId: null });
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            aria-label={`Show guide: ${cur.title}`}
          >
            <Compass size={15} aria-hidden /> <span>{cur.title}</span> <span className="ag-muted">{cur.shownIndex + 1}/{cur.shownTotal}</span>
            <ChevronUp size={14} aria-hidden />
          </motion.button>
        ) : (
          <motion.section
            key={`card-${cur.index}`}
            className={clsx('ag-coach', justAdvanced && 'is-advanced')}
            data-testid="tutorial-card"
            data-step={cur.step.id}
            aria-label="Guide"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="ag-coach__top">
              <span className="ag-coach__badge">
                <Compass size={13} aria-hidden /> Guide · {cur.shownIndex + 1} of {cur.shownTotal}
              </span>
              <button type="button" className="ag-coach__icon" aria-label="Minimise guide" onClick={() => { sfx('close'); setCollapsed(true); }}>
                <ChevronDown size={16} />
              </button>
            </div>
            <AnimatePresence initial={false}>
              {doneLine && (
                <motion.div
                  className="ag-coach__done"
                  role="status"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Check size={13} aria-hidden /> {doneLine}
                </motion.div>
              )}
            </AnimatePresence>
            <h3 className="ag-coach__title">{cur.title}</h3>
            <p className="ag-coach__body">{cur.body}</p>
            {progress && (
              <div className="ag-coach__progress" aria-label={`${progress.label}: ${Math.floor(progress.cur)} of ${progress.max}`}>
                <div className="ag-coach__progress-row">
                  <span>
                    <span className="ag-tabular">
                      {Math.min(progress.max, Math.floor(progress.cur))}/{progress.max}
                    </span>{' '}
                    {progress.label}
                  </span>
                </div>
                <div className="ag-coach__bar">
                  <span style={{ transform: `scaleX(${pct})` }} />
                </div>
              </div>
            )}
            {(wait || paused) && (
              // audit 2026-11-17 (A1, A17) — what the step is waiting for, when playing on alone won't bring it
              <p className="ag-coach__wait" role="status" data-testid="coach-wait">
                {[wait?.text, paused ? 'Time is paused.' : null].filter(Boolean).join(' ')}
              </p>
            )}
            <div className="ag-coach__foot">
              <ProgressDots total={cur.shownTotal} index={cur.shownIndex} label="Guide progress" />
              <div className="ag-row" style={{ gap: 6 }}>
                {confirmSkip ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmSkip(false)}>Keep guide</Button>
                    <Button
                      size="sm"
                      variant="danger"
                      data-testid="tutorial-skip"
                      onClick={() => {
                        // lane:ui-shell (B-179): a throw discards the draft. Audit 2026-11-17 (A5): a skip used to end in
                        // silence, with nothing saying where the goals went
                        safe('tutorialSkip', () => void useGame.getState().dispatch({ k: 'tutorialSkip' }, (r) => {
                          if (!r || r.ok) useUI.getState().toast('Guide skipped. Your goals are in Research › Quests, and Settings › Play & access has a tour of the game.', 'info');
                        }), undefined);
                        setConfirmSkip(false);
                      }}
                    >
                      Skip guide
                    </Button>
                  </>
                ) : (
                  <>
                    <button type="button" className="ag-coach__skip" data-testid="tutorial-skip" onClick={() => setConfirmSkip(true)}>
                      <X size={13} aria-hidden /> Skip
                    </button>
                    {canNext && (
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid="tutorial-next"
                        onClick={() => safe('tutorialAdvance', () => void useGame.getState().dispatch({ k: 'tutorialNext' }), undefined) /* lane:ui-shell (B-179) */}
                      >
                        Next <ArrowRight size={14} />
                      </Button>
                    )}
                    {wait?.action === 'market' ? (
                      // A1 — no animal on show: the way forward is a new animal (the step's own button can't help)
                      <Button size="sm" variant="primary" data-testid="coach-wait-market" onClick={() => openPanel('market', 'tab:shop')}>
                        <Store size={14} /> Open the Market
                      </Button>
                    ) : (
                      showLabel && (
                        <Button size="sm" variant={timeHelps && speed > 0 && speed < 3 ? 'ghost' : 'primary'} onClick={() => showMe(action, game)} data-testid={canNext ? undefined : 'tutorial-next'} data-guide-showme="">
                          <Hand size={14} /> {showLabel}
                        </Button>
                      )
                    )}
                    {opened && (
                      <span className="ag-coach__note ag-coach__note--do" data-testid="tutorial-hint">
                        <Hand size={13} aria-hidden /> {opened}
                      </span>
                    )}
                    {timeHelps && speed > 0 && speed < 3 && (
                      <Button size="sm" variant="primary" onClick={speedUpForStep} title="Run time at ×3 until this step is done, then back to normal speed">
                        <FastForward size={14} /> Speed up
                      </Button>
                    )}
                    {paused && (
                      // A17 — a waiting step with time paused used to offer nothing at all
                      <Button size="sm" variant="primary" data-testid="coach-play" onClick={() => { sfx('click'); setSpeed(useShell.getState().lastSpeed ?? 1); }}>
                        <Play size={14} /> Play
                      </Button>
                    )}
                    {waiting && speed === 3 && guideSpeed.from != null && (
                      <span className="ag-coach__note" role="status">
                        <FastForward size={12} aria-hidden /> ×3 until done
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

/** The target sits under a sheet, popover or the guide itself (a ring over a covering sheet would mislead). */
function isCovered(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return true;
  const x = Math.min(window.innerWidth - 1, Math.max(0, r.left + r.width / 2));
  const y = Math.min(window.innerHeight - 1, Math.max(0, r.top + r.height / 2));
  const top = document.elementFromPoint(x, y);
  if (!top) return false;
  if (el.contains(top) || top.contains(el)) return false;
  // the HUD root, the canvas and the ring itself are see-through for this purpose
  return !!top.closest('.ag-sheet, .pn-sheet, .ag-popover, .ag-coach, .ag-coach-pill, .ag-modal, .ag-welcome');
}

/** lane:ui-shell (chunk 1, §5.5, §16) — the guide's note for a destination that lives in More on phones. */
export function moreGuideCopy(label: string): { label: string; text: string } {
  return { label: `Guide · ${label}`, text: `${label} now lives under More. Tap More, then ${label}.` };
}

/**
 * lane:ui-shell (chunk 1, §5.5, §16) — the guide's note above the phone's More tab while it rings it: "Guide ·
 * Research" / "Research now lives under More. Tap More, then Research."
 */
function MoreGuideBubble({ label }: { label: string }) {
  const [pos, setPos] = useState<{ right: number; bottom: number } | null>(null);
  useLayoutEffect(() => {
    let t = 0;
    let last = '';
    const measure = () => {
      const el = document.querySelector<HTMLElement>('[data-testid="dock-more"]');
      const r = el?.getBoundingClientRect();
      const next = r && r.width > 0 ? { right: Math.max(8, Math.round(window.innerWidth - r.right)), bottom: Math.round(window.innerHeight - r.top + 10) } : null;
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setPos(next);
      }
      t = window.setTimeout(measure, 250);
    };
    measure();
    return () => window.clearTimeout(t);
  }, []);
  if (!pos) return null;
  // (moreGuideCopy's text, with More in bold as §16 sets it)
  return (
    <div className="ag-guide-bubble" role="status" data-testid="guide-more-bubble" style={{ right: pos.right, bottom: pos.bottom }}>
      <span className="ag-guide-bubble__label">{moreGuideCopy(label).label}</span>
      {label} now lives under <strong>More</strong>. Tap More, then {label}.
    </div>
  );
}

/** Pulsing ring around the element with the matching data-tutorial-id (tracks layout changes). */
function TutorialHighlight({ target, gold }: { target: string; gold?: boolean }) {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number; round: boolean } | null>(null);
  useLayoutEffect(() => {
    if (!target || target === 'scene') {
      setRect(null);
      return;
    }
    let raf = 0;
    let last = '';
    // phones: the dock scrolls sideways, and the ring used to sit around a Build / Research button that was off the
    // edge of the screen. The target is scrolled into view once per step (the ring then tracks it as usual).
    let scrolled = false;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tutorial-id="${CSS.escape(target)}"]`);
      if (el && !scrolled && el.closest('.ag-dock__scroll')) {
        scrolled = true;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.left < 0 || r.right > window.innerWidth)) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
      if (!el || el.offsetParent === null || isCovered(el)) {
        if (last !== 'none') {
          last = 'none';
          setRect(null);
        }
      } else {
        const r = el.getBoundingClientRect();
        const key = `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`;
        if (key !== last && r.width > 0) {
          last = key;
          const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius || '0');
          setRect({ x: r.x, y: r.y, w: r.width, h: r.height, round: radius >= Math.min(r.width, r.height) / 2 - 1 });
        }
      }
      raf = window.setTimeout(measure, 250) as unknown as number;
    };
    measure();
    return () => window.clearTimeout(raf);
  }, [target]);
  if (!rect) return null;
  const pad = 5;
  return (
    <div
      className={clsx('ag-tut-ring', rect.round && 'is-round', gold && 'ag-tut-ring--gold')}
      aria-hidden
      style={{ left: rect.x - pad, top: rect.y - pad, width: rect.w + pad * 2, height: rect.h + pad * 2 }}
    />
  );
}

/**
 * The finale's recap. Audit 2026-11-17 (A1): it said "{name} is settled, fed and healthy." (and "Your companion is
 * one of a kind.") whatever had happened: the starter's lines now need the starter alive, and the first one its tank
 * in good shape.
 */
export function finaleLines(game: GameState): string[] {
  const starter = Object.values(game.creatures).find((c) => c.isStarter && c.status === 'alive');
  const tank = starter?.tankId ? game.tanks[starter.tankId] : game.tanks[game.tankOrder[0]];
  const traits = (starter?.personality ?? []).slice(0, 2).map((t) => safe('personality', () => personalityLabel(t).toLowerCase(), t));
  const earned = Math.round(game.progress.counters?.tips_total ?? 0);
  return [
    starter && tank?.cache?.status === 'good' ? `${starter.name} is settled, fed and healthy.` : null,
    tank ? `${tank.name} scores ${Math.round(tank.cache.beauty)} for beauty.` : null,
    starter ? (traits.length ? `${starter.name}’s personality: ${traits.join(' and ')}. No two animals are alike.` : `${starter.name} is one of a kind.`) : null,
    earned > 0 ? `Your first $${earned} from friends and visitors.` : 'Your first visitors have been by.',
  ].filter(Boolean) as string[];
}

/**
 * What comes next, and where: audit 2026-11-17 (A5) — the quest board and the guide's own reward ("First steps") are
 * in Research › Quests, which the finale never said; (A10) phones have no dock, Shows is under More there.
 */
export function finaleNext(game: GameState, mobile: boolean): string {
  const owed = game.progress.quests.some((q) => q.id === 'tutorial' && q.status === 'complete');
  const goals = owed ? `Your first goals, and $${TUTORIAL_QUEST_REWARD.money ?? 0} for finishing the guide, are waiting in Research › Quests.` : 'Your first goals are waiting in Research › Quests.';
  return `Next: breeding, bigger tanks and a shop of your own. Club shows are open too — find Shows ${mobile ? 'under More' : 'in the dock'}. ${goals}`;
}

/** End of the guide: what the player has learnt (care, beauty, individuals, business) and what unlocks next. */
function GuideFinale({ game, mobile, onClose }: { game: GameState; mobile: boolean; onClose: () => void }) {
  // (no auto-close: the recap is the one place that says what unlocks next, and "Later" is right there)
  useEffect(() => {
    sfx('celebrate');
  }, []);
  const lines = finaleLines(game);
  return (
    <motion.section
      className="ag-coach ag-coach--finale"
      data-testid="tutorial-card"
      data-step="finale"
      aria-label="Guide complete"
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="ag-coach__top">
        <span className="ag-coach__badge">
          <Sparkles size={13} aria-hidden /> Guide complete
        </span>
        <button type="button" className="ag-coach__icon" aria-label="Close" onClick={() => { sfx('close'); onClose(); }}>
          <X size={16} />
        </button>
      </div>
      <h3 className="ag-coach__title">You’re on your way</h3>
      <ul className="ag-coach__list">
        {lines.map((l) => (
          <li key={l}>
            <Check size={13} aria-hidden /> {l}
          </li>
        ))}
      </ul>
      <p className="ag-coach__body">{finaleNext(game, mobile)}</p>{/* lane:w2-ui — shows unlock as the guide ends */}
      <div className="ag-coach__foot">
        <span />
        <div className="ag-row ag-wrap" style={{ gap: 6, justifyContent: 'flex-end' }}>
          <Button size="sm" variant="ghost" onClick={() => { sfx('close'); onClose(); }}>Later</Button>
          {/* A6: with a target openPanel always opens (the last step ends as Research opens: a bare openPanel closed it) */}
          <Button size="sm" onClick={() => { openPanel('research', 'tab:unlocks'); onClose(); }}>
            <FlaskConical size={14} /> See what unlocks
          </Button>
          {/* A5 — the quest board and the guide's reward */}
          <Button size="sm" data-testid="coach-quests" onClick={() => { openPanel('research', 'tab:quests'); onClose(); }}>
            <ScrollText size={14} /> See your quests
          </Button>
          {/* chunk 19 (ADR-0055 decision 7, QOL-008) — the tour of everything else */}
          <Button size="sm" variant="primary" data-testid="guide-tour" onClick={() => { onClose(); startTour(); }}>
            <Compass size={14} /> Show me around
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
