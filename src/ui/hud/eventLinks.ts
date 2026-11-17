/**
 * Where a piece of news lives: the panel (and deep link) a toast, an alerts-drawer row or a Log row opens. One table,
 * so a show result opens Shows › Results whether the player taps the toast, the bell's event or the Log line.
 * Pure (no React): tests import it. OWNER: lane "notify" (unlock links moved here from Toasts.tsx, lane:w2-ui).
 */
import type { GameEvent } from '@/types';
import type { PanelId } from '@/state/ui';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { DECOR } from '@/data/catalog/decor'; // Audit 2026-11-17 (G7)

/** Audit 2026-11-17 (G7): Find's way to a piece: a tank whose water takes it, else Build › Tanks on that water. */
const findDecor = (key: string): string => `find:decor:${DECOR.find((d) => d.unlock === key)?.id ?? ''}`;

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
  shows: { panel: 'shows', target: 'tab:upcoming', where: 'Enter a healthy adult from Shows.' }, // (audit A10: phones have no dock)
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
  nursery: { panel: 'research', target: 'tab:research', where: 'Needed for the Genetics Lab and Live Food Cultures in Research.' }, // (audit A3: not tanks)
  // Audit 2026-11-17 (G7): corals and anemones live only in some marine water, so their unlock goes through Find
  decor_corals_soft: { panel: 'build', target: findDecor('decor_corals_soft'), where: 'Corals need a reef tank. Find them in Build › Decor.' },
  decor_corals_lps: { panel: 'build', target: findDecor('decor_corals_lps'), where: 'Corals need a reef tank. Find them in Build › Decor.' },
  decor_anemones: { panel: 'build', target: findDecor('decor_anemones'), where: 'Anemones need a reef or live-rock tank. Find them in Build › Decor.' },
  // Audit 2026-11-17 (G20): the unlocks whose toast pointed nowhere
  water_room: { panel: 'build', target: 'room:water', where: 'See it in Build › Facility › Water room.' },
  live_food_room: { panel: 'build', target: 'room:food', where: 'See it in Build › Facility › Live food room.' },
  operations_desk: { panel: 'operations', target: null, where: 'Its tools are in Operations.' },
  signage: { panel: 'visitors', target: 'tab:visitors', where: 'Add a sign in Visitors, or from a tank card’s Value tab.' },
  genetics_lab: { panel: 'livestock', target: null, where: 'Open an animal’s card to see its genes.' },
  // Audit 2026-11-17 (G5): the shop also waits for a tank big enough for these animals (ADR-0053 decision 4)
  fw_large: { panel: 'market', target: 'tab:shop', where: 'They come into Market › Shop once you have a tank big enough for them.' },
  elasmobranchs: { panel: 'market', target: 'tab:shop', where: 'They come into Market › Shop once you have a tank big enough for them.' },
};

/**
 * Audit 2026-11-17 (A16, G20) — unlocks that live in no panel, with just their "where" line ("Unlocked · Party / music
 * mode" said nothing else; no link).
 */
const UNLOCK_WHERE: Record<string, string> = {
  party_mode: 'Tap Party in the tank tools: the lights dance to music.',
};
export const unlockWhere = (key: string): string | undefined => (Object.hasOwn(UNLOCK_WHERE, key) ? UNLOCK_WHERE[key] : undefined);

const PANEL_WORD: Partial<Record<PanelId, string>> = { shows: 'Shows', visitors: 'Visitors', build: 'Build', market: 'Market', tanks: 'Tanks', research: 'Research', operations: 'Operations', livestock: 'Livestock' }; // Audit 2026-11-17 (G20): + Operations, Livestock
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

/**
 * audit E7: a breeding line that sends eggs or young to a nursery ("… move them to a nursery tank") opens Livestock ›
 * Eggs & fry, where the Move buttons are; a creature's card (where the toast used to go) can't move a brood.
 */
// (advice, not a tank that happens to be named Nursery: "Move him out of Nursery now" goes to his card)
const NURSERY_ADVICE = /\ba nursery\b|\bnursery tank\b/i;
const YOUNG_WORD = /\b(eggs?|egg cases?|fry|larvae|young|brood|clutch|wrigglers|shrimplets|baby snails|pups)\b/i;
const EGGS_AND_FRY: EventLink = { panel: 'livestock', target: 'tab:young', where: '', label: 'Open Eggs & fry' };

/**
 * Audit 2026-11-17 (F2) — money news opens Finances, where the ways to raise cash are: the midnight debt warning, "Cash
 * is getting low", the club's loans and their repayment, an empty room money won't restock, and back in the black.
 */
export const MONEY_NEWS = /in the red after today's bills|^Cash is getting low|lent you (another )?\S+, interest-free|^Loan repaid in full|won't restock (them|it)\.|^You're back in the black/;

/** The panel a log event opens, or null (tank / creature links are handled by the caller). */
export function eventLink(e: Pick<GameEvent, 'kind' | 'text' | 'listingId' | 'offerId'>): EventLink | null {
  const text = e.text ?? '';
  const m = /^Unlocked:\s*(.+)$/.exec(text);
  if (m) {
    const key = UNLOCK_KEY_BY_LABEL[m[1]];
    return key ? unlockLink(key) : null;
  }
  if (SHOW_RESULT_TEXT.test(text)) return RESULTS;
  // audit 2026-11-17 (A5) — "Quest complete: Feeding routine — claim your reward!" now leads to the claim button
  if (/^Quest complete:/.test(text)) return { panel: 'research', target: 'tab:quests', where: 'Claim it in Research › Quests.', label: 'Claim it' };
  if (/^Research complete:/.test(text) || /^You picked up everything .+ covers through your own keeping/.test(text)) return { panel: 'research', target: null, where: '', label: 'Open Research' };
  if (e.listingId) return { panel: 'market', target: `listing:${e.listingId}`, where: '', label: 'View listing' };
  // lane:notify (chunk 3, NOTIFY-004) — a Prismatic or special stocked opens its offer (the shop says if it has gone)
  if (typeof e.offerId === 'string' && e.offerId) return { panel: 'market', target: `offer:${e.offerId}`, where: '', label: 'Open the shop' };
  if (/^New arrivals at the shop:|^Market special:/.test(text)) return { panel: 'market', target: 'tab:shop', where: '', label: 'Open the shop' };
  if (NURSERY_ADVICE.test(text) && YOUNG_WORD.test(text)) return EGGS_AND_FRY;
  if (/^The aquarium club dropped off a little food/.test(text)) return { panel: 'finances', target: null, where: '', label: 'Ways to raise cash' }; // audit 2026-11-17: the club's food parcel
  if (MONEY_NEWS.test(text)) return { panel: 'finances', target: null, where: '', label: 'Open Finances' }; // audit 2026-11-17 (F2)
  return null;
}
