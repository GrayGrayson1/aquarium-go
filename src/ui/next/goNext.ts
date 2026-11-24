/**
 * chunk 21 (C, "What next?") — go where an action points, through what the game already has: the fix links
 * (`goFix`), the router (`go`, and an address parsed by the router, so a route another feature owns works once it
 * exists), the guide card's own "Show me" (`showMe`) and the shared shop's dropdown. A sub-view holding the player's
 * work (the listing wizard) asks first, as Find anything's results do. OWNER: lane "next" (chunk 21).
 */
import { useGame } from '@/state/game';
import { useShell } from '../common/shellStore';
import { goFix } from '../common/fixLinks';
import { glow } from '../common/glow';
import { go, parseNav } from '../nav/router';
import { guardLeave } from '../panels/common/leaveGuard';
import { showMe } from '../tutorial/TutorialCoach';
import type { NextTo } from './nextBest';

/** The guide targets "Show me" does something for (TutorialCoach's `showMe`; a `dock-…` target opens that panel). */
const SHOW_ME = new Set(['tool-feed', 'tool-target-feed', 'tank-card-toggle', 'creature-name', 'scene', 'follow-starter']);

export function goNext(to: NextTo): void {
  guardLeave(() => goNow(to));
}

function goNow(to: NextTo): void {
  const shell = useShell.getState();
  // the sheet goes first; a destination that is a popover itself (the food picker, the shop's dropdown) replaces it
  if (shell.popover) shell.set({ popover: null });
  switch (to.kind) {
    case 'fix':
      goFix(to.to);
      return;
    case 'route':
      go(to.route);
      return;
    case 'address': {
      // (until the address's route exists, the router's nearest screen: the Encyclopedia, with its not-found note)
      const parsed = parseNav(to.hash);
      go(parsed ? parsed.route : { kind: 'panel', panel: 'encyclopedia' });
      return;
    }
    case 'guide': {
      const g = useGame.getState().game;
      if (g && (SHOW_ME.has(to.action) || to.action.startsWith('dock-'))) showMe(to.action, g);
      // a step with nothing to open (it waits for time or money): point at the guide card and what it names
      else glow(`[data-tutorial-id="${to.action}"], [data-testid="tutorial-card"]`);
      return;
    }
    case 'shared':
      useShell.getState().set({ popover: 'shared' });
      return;
  }
}
