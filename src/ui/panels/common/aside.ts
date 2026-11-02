/**
 * chunk 19 (ADR-0055 decision 1, QOL-001) — panels stay open. A tool started from a management panel that needs the
 * tank or the room (placing decor, a stored piece or a frag, Rearrange decor, Buy & place a tank) never closes it:
 *  - a side sheet (computers) stays where it is, beside the tank or room the tool works on;
 *  - a bottom sheet (phones, upright tablets) steps aside: `panel` goes to null and `panelAside` remembers it, so the
 *    rest of the game sees no panel (the tool rail, the hint and the whole tank come back), while PanelHost keeps it
 *    mounted off screen with its tab, filters, search and scroll intact; it comes back when the tool ends by placing,
 *    Done, Cancel or Escape. Going somewhere else meanwhile (another panel, the tank card, an animal's card, another
 *    tool, Watch, Photo, the title) drops it instead.
 * A placed piece (or tank) is seen landing for a moment before the sheet returns; on touch, while the hint offers
 * "Place another" (render/decor/placeAgain.ts) the sheet waits for that to be used, dismissed (Done) or to run out. If
 * the guide moved on to its next step meanwhile, the sheet is dropped so the guide's card isn't covered (reviewer
 * notes). OWNER: lane "ui-panels".
 */
import { useEffect } from 'react';
import { useUI, type PanelId, type ToolId, type UIState } from '@/state/ui';
import { useGame } from '@/state/game';
import { useSettings } from '@/state/settings';
import { useSharedMode } from '@/state/sharedMode';
import { usePlaceAgain } from '@/render/decor/placeAgain';
import { useFind } from '../../search/findStore';
import { useTour } from '../../tutorial/tourStore';
import { useShell } from '../../common/shellStore';
import { BOTTOM_SHEET_QUERY } from '../../common/Sheet';
import { MOBILE_QUERY } from '../../common/safe';
import { PHONE_QUERY } from './hooks';

/** Tools that step a bottom sheet aside (and come back with it). */
export const ASIDE_TOOLS: ReadonlySet<ToolId> = new Set<ToolId>(['decor_place', 'decor_move', 'tank_place']);

/** How long a placed piece (or tank) is on screen before the sheet slides back (ms). */
export const LANDED_MS = 900;

const matches = (q: string): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;
  } catch {
    return false;
  }
};

/** The same test PanelHost uses for its bottom-sheet presentation (phones, upright tablets, phones held sideways). */
export function sheetIsBottom(): boolean {
  return matches(BOTTOM_SHEET_QUERY) || matches(PHONE_QUERY) || matches(MOBILE_QUERY);
}

type Patch = Partial<Omit<UIState, 'set' | 'toast' | 'dismissToast'>>;

/**
 * Start a tool from the open panel. `patch` sets the tool and what it needs (never `panel`): a side sheet stays open; a
 * bottom sheet steps aside. With no panel open it is a plain `set`.
 */
export function startToolFromPanel(patch: Patch, bottom: boolean = sheetIsBottom()): void {
  const ui = useUI.getState();
  const panel = ui.panel;
  const { panel: _drop, panelAside: _drop2, ...rest } = patch;
  if (panel && bottom) {
    asideMark = worldMark();
    asideGuide = guideStep();
    ui.set({ ...rest, panel: null, panelAside: panel });
  } else ui.set(rest);
}

/** What a finished tool may have added to the world: every decor piece and tank (cheap, read once at each end). */
function worldMark(): number {
  const g = useGame.getState().game;
  if (!g) return 0;
  let n = g.tankOrder.length * 100_000;
  for (const id of g.tankOrder) n += g.tanks[id]?.decor.length ?? 0;
  return n;
}
let asideMark = 0;

/** The guide's step while its card is on screen (null: no guide — done, skipped, hints off or a shared shop). */
function guideStep(): number | null {
  const tut = useGame.getState().game?.progress?.tutorial;
  if (!tut || tut.done || tut.skipped || !useSettings.getState().showTutorialHints || useSharedMode.getState().club !== null) return null;
  return tut.step;
}
let asideGuide: number | null = null;

export function clearAside(): void {
  pending.cancel();
  if (useUI.getState().panelAside) useUI.getState().set({ panelAside: null });
}

/** Bring the stepped-aside sheet back, if nothing else took its place meanwhile. */
function comeBack(): void {
  const ui = useUI.getState();
  const panel = ui.panelAside;
  if (!panel) return;
  if (ui.tool !== 'none') return; // another placement started (Place another): wait for it to end too
  if (!stillHere(ui)) {
    clearAside();
    return;
  }
  // "Place another" is on offer: wait for it (its end calls this again)
  if (usePlaceAgain.getState().defId) return;
  // the guide went on to its next step meanwhile (the hiding place it asked for is in): its card leads, not Build
  const g = guideStep();
  if (asideGuide !== null && g !== null && g !== asideGuide) {
    clearAside();
    return;
  }
  ui.set({ panel, panelAside: null });
}

/**
 * Nothing has taken the player somewhere else: no panel, card, Watch or Photo, and (reviewer N2: the sheet can wait
 * 8 s for "Place another", and used to slide back over these) no popover (the bell, the food picker, More), no Find
 * anything and no tour.
 */
function stillHere(ui: UIState): boolean {
  const shell = useShell.getState();
  return !ui.panel && !ui.photoMode && !ui.hudHidden && ui.screen === 'game' && !shell.tankCardOpen && !shell.popover && !useFind.getState().open && !useTour.getState().running;
}

const pending = {
  timer: 0,
  set(fn: () => void, ms: number) {
    this.cancel();
    if (ms <= 0) fn();
    else this.timer = window.setTimeout(fn, ms);
  },
  cancel() {
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = 0;
  },
};

/**
 * The rules, as a pure decision over one store update (tested in tests/sim/qol-aside.test.ts): what to do with the
 * stepped-aside panel. 'return' = the tool ended on its own terms; 'drop' = the player went somewhere else.
 */
export function asideDecision(
  s: Pick<UIState, 'panel' | 'panelAside' | 'tool' | 'photoMode' | 'hudHidden' | 'screen' | 'selectedCreatureId' | 'view' | 'focusedTankId'>,
  p: Pick<UIState, 'tool' | 'selectedCreatureId' | 'panelAside' | 'view' | 'focusedTankId'>,
  cardOpen: boolean,
): 'return' | 'drop' | 'wait' {
  if (!s.panelAside) return 'wait';
  if (s.panel || s.photoMode || s.hudHidden || s.screen !== 'game' || cardOpen) return 'drop';
  if (s.selectedCreatureId && s.selectedCreatureId !== p.selectedCreatureId) return 'drop';
  if (s.tool === p.tool) {
    // reviewer N2 — another tank or the other view meanwhile (while the tool runs, or while the sheet waits for the
    // piece to land or for "Place another"): the player went somewhere else. Not the update that stepped the sheet
    // aside (it may set the view and the tank itself), nor a tool's own end (a placed tank focuses itself: below)
    if (p.panelAside && (s.view !== p.view || s.focusedTankId !== p.focusedTankId)) return 'drop';
    return 'wait';
  }
  if (s.tool === 'none') return ASIDE_TOOLS.has(p.tool) ? 'return' : 'wait';
  // another tool took over: a placement (Place another) keeps waiting, anything else (Feed, Tap…) goes elsewhere
  return ASIDE_TOOLS.has(s.tool) ? 'wait' : 'drop';
}

/** Install the rules (GameHUD mounts this once). */
export function usePanelAsideRules(): void {
  useEffect(() => {
    const unsubUI = useUI.subscribe((s, p) => {
      if (!s.panelAside) return;
      const d = asideDecision(s, p, useShell.getState().tankCardOpen);
      if (d === 'drop') clearAside();
      else if (d === 'return') {
        const landed = worldMark() !== asideMark;
        pending.set(comeBack, landed ? LANDED_MS : 0);
      }
    });
    const unsubShell = useShell.subscribe((s, p) => {
      if (!useUI.getState().panelAside) return;
      // the tank card, or a popover (the bell, the food picker, More: reviewer N2), opened meanwhile
      if ((s.tankCardOpen && !p.tankCardOpen) || (s.popover && !p.popover)) clearAside();
    });
    const unsubFind = useFind.subscribe((s) => {
      if (s.open && useUI.getState().panelAside) clearAside();
    });
    const unsubTour = useTour.subscribe((s) => {
      if (s.running && useUI.getState().panelAside) clearAside();
    });
    const unsubGame = useGame.subscribe((s, p) => {
      if (s.game?.saveId !== p.game?.saveId && useUI.getState().panelAside) clearAside();
    });
    // "Place another" was used, dismissed or ran out: the sheet may come back now (a moment later, so a Place another
    // that starts the next placement is seen first — comeBack then waits for that one)
    const unsubAgain = usePlaceAgain.subscribe((s, p) => {
      if (p.defId && !s.defId && useUI.getState().panelAside) pending.set(comeBack, 60);
    });
    return () => {
      unsubUI();
      unsubShell();
      unsubGame();
      unsubAgain();
      unsubFind();
      unsubTour();
      pending.cancel();
    };
  }, []);
}

/** For tests: the panel a sheet stepped aside from. */
export const asidePanel = (): PanelId | null => useUI.getState().panelAside;
