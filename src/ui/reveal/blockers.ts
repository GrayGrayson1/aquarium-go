/**
 * Chunk 21, feature B: when the reveal card must wait. OWNER: lane "reveal".
 *
 * A reveal never opens over another dialog or the guide's current step, and never while the game is out of sight:
 *  - off the game screen, or while the tab is hidden (a hidden tab catches up when it comes back, P5-09);
 *  - while the "While you were away" card is up: the hidden-tab catch-up publishes it right after its one commit, so
 *    the finds of the catch-up wait behind it and open once, as one card, when the player closes it;
 *  - while the tour runs, or the guide's spotlight dims the screen round the control its step needs now;
 *  - while any other dialog is open (the kit's Modal, Find anything, the More sheet, the shared shop's cards, the
 *    guide's finale), in photo mode, or with the HUD hidden for watching;
 *  - while the player is typing in a text field (the card would take the focus, and a Space or Enter meant for the
 *    field would then close it), or placing or moving decor or a tank (the chunk's review, S5 and N6).
 * `revealWaitReason` is the pure rule; `readRevealBlockers` reads the stores and the page.
 */
import { useUI, type ToolId } from '@/state/ui';
import { useResume } from '@/persistence';
import { useTour } from '../tutorial/tourStore';
import { isTextEntry } from '../common/safe';

export interface RevealBlockers {
  screen: string;
  hidden: boolean;
  welcomeBack: boolean;
  touring: boolean;
  guideSpotlight: boolean;
  otherDialog: boolean;
  photo: boolean;
  hudHidden: boolean;
  /** Focus is in a text field. */
  typing: boolean;
  /** A placement tool is in use (decor or a tank being placed or moved). */
  placing: boolean;
}

/** The tools that place or move something: a dialog over them would drop the piece mid-drag. */
export const PLACING_TOOLS: ReadonlySet<ToolId> = new Set<ToolId>(['decor_place', 'decor_move', 'tank_place']);

/** Why the card must wait, or null when it may open now. */
export function revealWaitReason(b: RevealBlockers): keyof RevealBlockers | null {
  if (b.screen !== 'game') return 'screen';
  if (b.hidden) return 'hidden';
  if (b.welcomeBack) return 'welcomeBack';
  if (b.touring) return 'touring';
  if (b.guideSpotlight) return 'guideSpotlight';
  if (b.otherDialog) return 'otherDialog';
  if (b.photo) return 'photo';
  if (b.hudHidden) return 'hudHidden';
  if (b.typing) return 'typing';
  if (b.placing) return 'placing';
  return null;
}

/** Other dialogs on the page (the reveal card itself is never open when this is read). */
export const OTHER_DIALOGS = [
  '.ag-modal-backdrop',
  '[aria-modal="true"]',
  '[role="alertdialog"]',
  '.ag-welcome',
  '.ag-coach--finale',
  '.ag-find-backdrop',
  '[data-testid="shared-opening"]',
].join(', ');

/** The guide's (or the tour's) spotlight dimming the screen: a step that wants a tap now. */
export const GUIDE_DIM = '.ag-spot__dim';

export function readRevealBlockers(): RevealBlockers {
  const ui = useUI.getState();
  const doc = typeof document !== 'undefined' ? document : null;
  const has = (sel: string) => {
    try {
      return !!doc?.querySelector(sel);
    } catch {
      return false;
    }
  };
  return {
    screen: ui.screen,
    hidden: !!doc?.hidden,
    welcomeBack: !!useResume.getState().summary,
    touring: useTour.getState().running,
    guideSpotlight: has(GUIDE_DIM),
    otherDialog: has(OTHER_DIALOGS),
    photo: ui.photoMode,
    hudHidden: ui.hudHidden,
    typing: isTextEntry(doc?.activeElement ?? null),
    placing: PLACING_TOOLS.has(ui.tool),
  };
}
