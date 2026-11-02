/**
 * chunk 19 (ADR-0055 decision 1, QOL-001) — panels stay open. A tool started from a management panel that needs the
 * tank or the room (placing decor, a stored piece or a frag, Rearrange decor, Buy & place a tank) never closes it:
 *  - a side sheet (computers) stays where it is, beside the tank or room the tool works on;
 *  - a bottom sheet (phones, upright tablets) steps aside: `panel` goes to null and `panelAside` remembers it, so the
 *    rest of the game sees no panel (the tool rail, the hint and the whole tank come back), while PanelHost keeps it
 *    mounted off screen with its tab, filters, search and scroll intact; it comes back when the tool ends by placing,
 *    Done, Cancel or Escape. Going somewhere else meanwhile (another panel, the tank card, an animal's card, another
 *    tool, Watch, Photo, the title) drops it instead.
 * A placed piece (or tank) is seen landing for a moment before the sheet returns. OWNER: lane "ui-panels".
 */
import { useEffect } from 'react';
import { useUI, type PanelId, type ToolId, type UIState } from '@/state/ui';
import { useGame } from '@/state/game';
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
  ui.set({ panel, panelAside: null });
}

/** Nothing has taken the player somewhere else. */
function stillHere(ui: UIState): boolean {
  return !ui.panel && !ui.photoMode && !ui.hudHidden && ui.screen === 'game' && !useShell.getState().tankCardOpen;
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
  s: Pick<UIState, 'panel' | 'panelAside' | 'tool' | 'photoMode' | 'hudHidden' | 'screen' | 'selectedCreatureId'>,
  p: Pick<UIState, 'tool' | 'selectedCreatureId' | 'panelAside'>,
  cardOpen: boolean,
): 'return' | 'drop' | 'wait' {
  if (!s.panelAside) return 'wait';
  if (s.panel || s.photoMode || s.hudHidden || s.screen !== 'game' || cardOpen) return 'drop';
  if (s.selectedCreatureId && s.selectedCreatureId !== p.selectedCreatureId) return 'drop';
  if (s.tool === p.tool) return 'wait';
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
      if (s.tankCardOpen && !p.tankCardOpen && useUI.getState().panelAside) clearAside();
    });
    const unsubGame = useGame.subscribe((s, p) => {
      if (s.game?.saveId !== p.game?.saveId && useUI.getState().panelAside) clearAside();
    });
    return () => {
      unsubUI();
      unsubShell();
      unsubGame();
      pending.cancel();
    };
  }, []);
}

/** For tests: the panel a sheet stepped aside from. */
export const asidePanel = (): PanelId | null => useUI.getState().panelAside;
