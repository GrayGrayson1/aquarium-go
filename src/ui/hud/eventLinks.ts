/**
 * Where a piece of news lives: the panel (and deep link) a toast, an alerts-drawer row or a Log row opens. One table,
 * so a show result opens Shows › Results whether the player taps the toast, the bell's event or the Log line.
 * Pure (no React): tests import it. OWNER: lane "notify" (unlock links moved here from Toasts.tsx, lane:w2-ui).
 */
import type { GameEvent } from '@/types';
import type { PanelId } from '@/state/ui';
import { UNLOCK_KEYS } from '@/data/unlockKeys';

export interface EventLink {
  panel: PanelId;
  target: string | null;
  /** Short "where" line (toast detail). May be empty. */
  where: string;
  /** Link text in the drawer / log ("See results"). */
  label: string;
}

// "Unlocked: Shows & championships" alone never told a new player where Shows are. Feature unlocks carry a short
// "where" line and open the right panel (lane:w2-ui).
const UNLOCK_LINKS: Record<string, Omit<EventLink, 'label'>> = {
  shows: { panel: 'shows', target: 'tab:upcoming', where: 'Enter a healthy adult from Shows in the dock.' },
  shows_regional: { panel: 'shows', target: 'tab:upcoming', where: 'Regional shows are on the Shows calendar.' },
  shows_national: { panel: 'shows', target: 'tab:upcoming', where: 'National championships are on the Shows calendar.' },
  shows_international: { panel: 'shows', target: 'tab:upcoming', where: 'International championships are on the Shows calendar.' },
  photo_contests: { panel: 'shows', target: 'tab:upcoming', where: 'Aquascape classes open at shows.' },
  staff: { panel: 'visitors', target: 'tab:staff', where: 'Hire your first keeper in Visitors › Staff.' },
  visitors: { panel: 'visitors', target: 'tab:visitors', where: 'Open your doors in Visitors.' },
  brackish: { panel: 'build', target: 'tab:tanks', where: 'Set up a brackish tank in Build › Tanks.' },
  decor_mangrove: { panel: 'build', target: 'tab:decor', where: 'Find them in Build › Decor.' },
  market_listings: { panel: 'market', target: 'tab:listings', where: 'List animals in Market › My listings.' },
  tank_auctions: { panel: 'market', target: 'tab:listings', where: 'List a whole aquarium in Market › My listings.' },
  nursery: { panel: 'tanks', target: null, where: 'Set a tank’s purpose in Tanks.' },
};

const PANEL_WORD: Partial<Record<PanelId, string>> = { shows: 'Shows', visitors: 'Visitors', build: 'Build', market: 'Market', tanks: 'Tanks', research: 'Research' };
const withLabel = (l: Omit<EventLink, 'label'>, label?: string): EventLink => ({ ...l, label: label ?? `Open ${PANEL_WORD[l.panel] ?? 'it'}` });

/** Where an unlock key lives (feature keys above; tanks, gear, livestock and venues by family). */
export function unlockLink(key: string): EventLink | null {
  if (UNLOCK_LINKS[key]) return withLabel(UNLOCK_LINKS[key]);
  if (key.startsWith('tank_')) return withLabel({ panel: 'build', target: 'tab:tanks', where: 'Buy it in Build › Tanks.' });
  if (key.startsWith('gear_')) return withLabel({ panel: 'market', target: 'tab:supplies', where: 'Find it in Market › Supplies.' });
  if (key.startsWith('facility_')) return withLabel({ panel: 'build', target: 'tab:facility', where: 'Move in from Build › Facility.' });
  if (key.startsWith('decor_')) return withLabel({ panel: 'build', target: 'tab:decor', where: 'Find it in Build › Decor.' });
  if (/^(fw_|marine_)/.test(key) || key === 'reef' || key === 'predators') return withLabel({ panel: 'market', target: 'tab:shop', where: 'New species arrive in Market › Shop.' });
  return null;
}

export const UNLOCK_KEY_BY_LABEL: Record<string, string> = Object.fromEntries(Object.entries(UNLOCK_KEYS).map(([k, label]) => [label, k]));

/** Show results ("… The judge’s cards are in Shows.") and entries the club sent home ("… The club refunded the fee."). */
export const SHOW_RESULT_TEXT = /The judge’s cards (are in Shows|explain why)\.$|The club refunded the fee\.$/;

const RESULTS: EventLink = { panel: 'shows', target: 'tab:results', where: '', label: 'See results' };

/** The panel a log event opens, or null (tank / creature links are handled by the caller). */
export function eventLink(e: Pick<GameEvent, 'kind' | 'text' | 'listingId'>): EventLink | null {
  const text = e.text ?? '';
  const m = /^Unlocked:\s*(.+)$/.exec(text);
  if (m) {
    const key = UNLOCK_KEY_BY_LABEL[m[1]];
    return key ? unlockLink(key) : null;
  }
  if (SHOW_RESULT_TEXT.test(text)) return RESULTS;
  if (/^Research complete:/.test(text) || /^You picked up everything .+ covers through your own keeping/.test(text)) return { panel: 'research', target: null, where: '', label: 'Open Research' };
  if (e.listingId) return { panel: 'market', target: `listing:${e.listingId}`, where: '', label: 'View listing' };
  if (/^New arrivals at the shop:|^Market special:/.test(text)) return { panel: 'market', target: 'tab:shop', where: '', label: 'Open the shop' };
  return null;
}
