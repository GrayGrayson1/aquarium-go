/**
 * Each player's own marks (SHARED-SHOPS.md §3.2 rule 8, §7.4): what this player has seen. They aren't player actions
 * (no rule reads them, chunk 11's list below), so they never become commands: in a solo game they're kept in the
 * save, as before; a shared shop (chunk 13) keeps them per player beside its copy, so one member reading the alerts
 * doesn't clear them for everyone. This module is the only way the interface writes them. OWNER: lane "ui-shell".
 *
 * The "seen" writes and what reads them (chunk 11, rule 8):
 * - `allRead` (the drawer's Mark read, and closing it) and `clearAll` (Clear all): events' `read` and
 *   `notify.logClearedSeq`/`logClearedHour`, read only by the bell's count and the drawer (src/ui/common/notify.ts).
 * - `logRead` (the log panel open): events' `read` again.
 * - `researchSeen` (Research open): `notify.researchSeen`, read only by the Research dock dot.
 * - `showResultsSeen` (Shows open): `shows.resultsSeenHour`, read only by the Results tab's "New" and the dock badge
 *   (`unseenResults`).
 * The panels' `opened_<panel>` flags look like marks but gate quests and unlocks (`q_first_show`, the market's
 * listings), so they're commands (`raiseFlag`), as is the staff tab's `hired_staff`.
 */
import type { GameState } from '@/types';
import { useGame } from '@/state/game';
import { markLogRead } from '@/sim/tankOps';
import { markShowResultsSeen } from '@/sim/shows';
import { clearAllEvents, markAllRead, markResearchSeen } from './notify';

export type Mark = 'allRead' | 'clearAll' | 'logRead' | 'researchSeen' | 'showResultsSeen';

const APPLY: Record<Mark, (d: GameState) => void> = {
  allRead: markAllRead,
  clearAll: clearAllEvents,
  logRead: markLogRead,
  researchSeen: markResearchSeen,
  showResultsSeen: markShowResultsSeen,
};

/** Record a mark. Bookkeeping only: a failure is logged and changes nothing (the write is atomic). */
export function mark(m: Mark): void {
  try {
    useGame.getState().mutate(APPLY[m]);
  } catch (e) {
    console.warn(`[ui] the ${m} mark failed; nothing was changed`, e);
  }
}
