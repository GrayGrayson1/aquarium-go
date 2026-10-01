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
import { Compass, ChevronDown, ChevronUp, X, ArrowRight, Hand, Check, FastForward, Sparkles, FlaskConical } from 'lucide-react';
import type { GameSpeed, GameState } from '@/types';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { sfx } from '@/audio/sfx';
import { tutorialChain, type TutorialStepDef, type Objective } from '@/data/quests';
import { tutorialAdvance, tutorialSkip, currentTutorialStep } from '@/sim/facility';
import { interpolate } from '@/sim/facility/progression';
import { findSpecies } from '@/data/species';
import { useShell } from '../common/shellStore';
import { safe, SHORT_LANDSCAPE_QUERY, useMedia } from '../common/safe';
import { BOTTOM_SHEET_QUERY } from '../common/Sheet';
import { ProgressDots, Button } from '../kit';
import { guideTarget, openPanel } from '../hud/Dock';
import { toggleTankCard } from '../hud/TankBar';
import { useDockedCard } from '../hud/cardDock';
import { setCameraMode } from '../hud/ToolRail';
import { setSpeed } from '../hud/TopBar';
import { convertTempText, personalityLabel } from '../common/format';

export interface CoachStep {
  index: number;
  total: number;
  step: TutorialStepDef;
  title: string;
  body: string;
  /** "Done" line of the step before this one (shown briefly when the guide advances). */
  prevDone: string | null;
  /** Numbering the player sees: an opening step that completes by itself (meeting the starter) isn't counted. */
  shownIndex: number;
  shownTotal: number;
}

/** Mouse players click; touch players tap. The chain copy is written for touch ("Tap Feed…"). */
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

function fill(t: string, name: string, species: string, fine: boolean, g?: GameState) {
  // {temp} / {salinity}: the sim's own wording of the starter's ideal band (same numbers as the tank card), shown in
  // the player's unit and tidied the same way ("24.5–28 °C")
  if (g && /\{(temp|salinity)\}/.test(t)) t = safe('interpolate', () => interpolate(g, t), t);
  t = convertTempText(t, useSettings.getState().tempUnit) ?? t;
  let s = t.replace(/\{name\}/g, name).replace(/\{species\}/g, species);
  if (fine) s = s.replace(/\bTap\b/g, 'Click').replace(/\btap\b/g, 'click').replace(/ or pinch/g, '');
  return s;
}

export function currentCoachStep(g: GameState | null, fine = false): CoachStep | null {
  if (!g || g.isShowcase) return null;
  const tut = g.progress?.tutorial;
  if (!tut || tut.done || tut.skipped) return null;
  const chain = safe('tutorialChain', () => tutorialChain(tut.starterId || g.starterId), []);
  if (!chain.length || tut.step >= chain.length) return null;
  const step = chain[Math.max(0, tut.step)];
  const starter = Object.values(g.creatures).find((c) => c.isStarter && c.status === 'alive') ?? Object.values(g.creatures)[0];
  const name = starter?.name ?? 'your companion';
  const species = (findSpecies(starter?.speciesId ?? g.starterId)?.commonName ?? 'animal').toLowerCase();
  const prev = tut.step > 0 ? chain[tut.step - 1] : null;
  const auto = chain[0]?.id === 'meet' && !chain[0].done && tut.step > 0 ? 1 : 0;
  return {
    shownIndex: Math.max(0, tut.step - auto),
    shownTotal: chain.length - auto,
    index: tut.step,
    total: chain.length,
    step,
    title: fill(step.title, name, species, fine, g),
    body: fill(step.body, name, species, fine, g),
    prevDone: prev?.done ? fill(prev.done, name, species, fine, g) : null,
  };
}

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
function showMe(target: string, g: GameState) {
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
      if (!sh.tankCardOpen || ui.panel || ui.selectedCreatureId) toggleTankCard();
      break;
    }
    case 'creature-name': {
      const starter = Object.values(g.creatures).find((c) => c.isStarter && c.status === 'alive');
      if (starter) ui.set({ selectedCreatureId: starter.id, view: 'tank', panel: null, focusedTankId: starter.tankId ?? ui.focusedTankId });
      break;
    }
    case 'scene':
      setCameraMode(ui.cameraMode === 'orbit' ? 'close' : 'orbit');
      break;
    case 'follow-starter': {
      const starter = Object.values(g.creatures).find((c) => c.isStarter && c.status === 'alive');
      if (starter) {
        ui.set({ view: 'tank', panel: null, focusedTankId: starter.tankId ?? ui.focusedTankId, followCreatureId: starter.id });
        setCameraMode('follow');
        guideCamera.followed = true;
      }
      break;
    }
    default:
      if (target.startsWith('dock-')) {
        const id = target.slice(5) as Parameters<typeof openPanel>[0];
        // "show me" never closes the panel it points at (openPanel toggles): an open one is pointed at the step's section
        if (ui.panel !== id) openPanel(id);
        else ui.set({ panelTarget: guideTarget(id) });
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
  const leftSheet = dockedCard === 'tank' && !bottomSheets;
  // lane:qa-final — on phones the tank card is a bottom sheet that hid the expanded guide (after the water step the
  // next step sat unseen under it). It folds into the pill too, which hud.css lifts just above the sheet.
  const phoneSheet = dockedCard === 'tank' && bottomSheets;
  const collapsed = userCollapsed || leftSheet || phoneSheet;
  const [confirmSkip, setConfirmSkip] = useState(false);
  const cur = currentCoachStep(game, fine);
  const lastIdx = useRef<number | null>(null);
  const [justAdvanced, setJustAdvanced] = useState(false);
  const [doneLine, setDoneLine] = useState<string | null>(null);

  useEffect(() => {
    if (!cur) return;
    if (lastIdx.current != null && cur.index > lastIdx.current) {
      sfx('unlock', { volume: 0.6 });
      setJustAdvanced(true);
      // two waiting steps in a row ("Word gets around" → reputation): ×3 carries over instead of dropping to 1× for
      // a second wait the player would have to speed up again
      const slowed = isWaitingStep(cur.step.objective) ? false : restoreGuideSpeed();
      setDoneLine(slowed ? `${cur.prevDone ?? 'Done.'} Back to normal speed.` : cur.prevDone);
      setCollapsed(false);
      setConfirmSkip(false);
      const t = window.setTimeout(() => setJustAdvanced(false), 1400);
      const t2 = window.setTimeout(() => setDoneLine(null), 4200);
      // a follow-cam the guide started ends with its step (after a moment to enjoy the behaviour)
      const t3 = guideCamera.followed
        ? window.setTimeout(() => {
            guideCamera.followed = false;
            if (useUI.getState().cameraMode === 'follow') useUI.getState().set({ cameraMode: 'front' });
          }, 2500)
        : 0;
      return () => {
        window.clearTimeout(t);
        window.clearTimeout(t2);
        if (t3) window.clearTimeout(t3);
      };
    }
    lastIdx.current = cur.index;
  }, [cur?.index]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (cur) lastIdx.current = cur.index;
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
    }
  }, [cur?.index, tutDone, saveId, hints]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = ((!!cur && hints) || finale) && !!game;
  useCoachLayout(visible);

  if (finale && game) return <GuideFinale game={game} onClose={() => setFinale(false)} />;
  if (!cur || !hints || !game) return null;
  // Slow feeders (seahorses) are taught target feeding: point at that tool instead of plain Feed.
  const target = cur.step.hintTarget === 'tool-feed' && /target-feed/i.test(cur.step.body) ? 'tool-target-feed' : cur.step.hintTarget;
  // "Watch the gills" style steps: the helpful action is following the starter, not orbiting.
  const observing = cur.step.id === 'observe' && target === 'scene';
  const action = observing ? 'follow-starter' : target;
  const starterName = Object.values(game.creatures).find((c) => c.isStarter && c.status === 'alive')?.name;
  // the CTA follows the state: once the food picker / Build is open the button gives way to a plain hint saying what
  // to do there (pressing "Open Build" again used to close Build, and re-opening an open food picker did nothing).
  // The upgrade step only waits for reputation: with Build open there is nothing more to point at.
  const starterId = game.progress.tutorial?.starterId || game.starterId;
  const opened =
    (target === 'tool-feed' && popover === 'food') || (target === 'tool-target-feed' && popover === 'target_food')
      ? 'Pick a food'
      : target === 'dock-build' && panel === 'build'
        ? cur.step.id === 'habitat'
          ? (HABITAT_PICK[starterId] ?? 'Pick a decoration')
          : ''
        : null;
  const showLabel = opened != null ? '' : observing ? (starterName ? `Follow ${shortName(starterName)}` : 'Follow') : SHOW_ME_LABEL[target] ?? (target.startsWith('dock-') ? `Open ${target.slice(5)}` : '');
  const canNext = cur.step.objective.type === 'flag' && !!cur.step.objective.fallbackHours;
  const waiting = isWaitingStep(cur.step.objective);
  const progress = waiting ? stepProgress(game, cur.step.objective) : null;
  const pct = progress ? Math.max(0, Math.min(1, progress.cur / Math.max(1, progress.max))) : 0;

  return (
    <>
      {!collapsed && !panel && tool === 'none' && <TutorialHighlight target={target} />}
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
              if (leftSheet || phoneSheet) useShell.getState().set({ tankCardOpen: false });
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
                        useGame.getState().mutate((d) => safe('tutorialSkip', () => tutorialSkip(d), undefined));
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
                        onClick={() => useGame.getState().mutate((d) => safe('tutorialAdvance', () => tutorialAdvance(d), undefined))}
                      >
                        Next <ArrowRight size={14} />
                      </Button>
                    )}
                    {showLabel && (
                      <Button size="sm" variant={waiting && speed > 0 && speed < 3 ? 'ghost' : 'primary'} onClick={() => showMe(action, game)} data-testid={canNext ? undefined : 'tutorial-next'}>
                        <Hand size={14} /> {showLabel}
                      </Button>
                    )}
                    {opened && (
                      <span className="ag-coach__note ag-coach__note--do" data-testid="tutorial-hint">
                        <Hand size={13} aria-hidden /> {opened}
                      </span>
                    )}
                    {waiting && speed > 0 && speed < 3 && (
                      <Button size="sm" variant="primary" onClick={speedUpForStep} title="Run time at ×3 until this step is done, then back to normal speed">
                        <FastForward size={14} /> Speed up
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

/** Pulsing ring around the element with the matching data-tutorial-id (tracks layout changes). */
function TutorialHighlight({ target }: { target: string }) {
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
      className={clsx('ag-tut-ring', rect.round && 'is-round')}
      aria-hidden
      style={{ left: rect.x - pad, top: rect.y - pad, width: rect.w + pad * 2, height: rect.h + pad * 2 }}
    />
  );
}

/** End of the guide: what the player has learnt (care, beauty, individuals, business) and what unlocks next. */
function GuideFinale({ game, onClose }: { game: GameState; onClose: () => void }) {
  // (no auto-close: the recap is the one place that says what unlocks next, and "Later" is right there)
  useEffect(() => {
    sfx('celebrate');
  }, []);
  const starter = Object.values(game.creatures).find((c) => c.isStarter && c.status === 'alive');
  const tank = starter?.tankId ? game.tanks[starter.tankId] : game.tanks[game.tankOrder[0]];
  const name = starter?.name ?? 'Your companion';
  const traits = (starter?.personality ?? []).slice(0, 2).map((t) => safe('personality', () => personalityLabel(t).toLowerCase(), t));
  const earned = Math.round(game.progress.counters?.tips_total ?? 0);
  const lines = [
    `${name} is settled, fed and healthy.`,
    tank ? `${tank.name} scores ${Math.round(tank.cache.beauty)} for beauty.` : null,
    traits.length ? `${name}’s personality: ${traits.join(' and ')}. No two animals are alike.` : `${name} is one of a kind.`,
    earned > 0 ? `Your first $${earned} from friends and visitors.` : 'Your first visitors have been by.',
  ].filter(Boolean) as string[];
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
      <p className="ag-coach__body">Next: breeding, bigger tanks and a shop of your own. Club shows are open too — find Shows in the dock. The quest board has your first goals.</p>{/* lane:w2-ui — shows unlock as the guide ends */}
      <div className="ag-coach__foot">
        <span />
        <div className="ag-row" style={{ gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={() => { sfx('close'); onClose(); }}>Later</Button>
          <Button size="sm" variant="primary" onClick={() => { openPanel('research'); onClose(); }}>
            <FlaskConical size={14} /> See what unlocks
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
