/**
 * chunk 13 — shared shops' words, exactly as the owner approved them (SHARED-SHOPS.md §8: ADR-0045 decisions 10 and 15,
 * ADR-0048 for group L, ADR-0049 for two more). Any other player-visible words go to the owner first. The first-one-wins lines are the
 * catalogue's (`conflictText`, src/sim/commands/shared.ts). OWNER: lane "social".
 */
import type { ClosingReason } from '@/types/shared';
import { fmtMoney as $ } from '@/sim/economy/util';
import { formatMoney } from '../kit';

export const SHARED_WORDS = {
  // the club card
  cardTitle: 'Shared shop',
  cardPitch: 'Play one aquarium together, live, with up to 10 club members.',
  create: 'Create shared shop',
  noShopYet: 'No shared shop yet.',
  shopMeta: (day: number, money: number) => `Day ${day} · ${formatMoney(money)}`,
  open: 'Open shared shop',
  meter: (used: string, hours: string) => `This month: ${used} of 2 GB · server awake ${hours} h`,
  // the title screen
  titleButton: (shop: string) => `Shared shop: ${shop}`,
  // creating
  newShop: 'New shared shop',
  created: 'Your club can open it from Social.',
  // opening
  saving: 'Saving your aquarium…',
  waking: 'Waking the shared shop… This takes about a minute when nobody’s been in for a while.',
  catchingUpEmpty: 'Catching up on the time nobody was here…',
  firstTime: (club: string) => `Your own aquarium is saved and waits for you. Everything here is shared with ${club}.`,
  gotIt: 'Got it',
  // inside
  strip: (shop: string, names: string[]) => `Shared · ${shop} · Here: ${names.join(', ')}`,
  back: 'Back to my aquarium',
  /** ADR-0049: "the owner" when the game doesn't know the owner's name. */
  notAllowed: (owner: string) => `Only ${owner.trim() || 'the owner'} and the people they choose can pause or change the speed.`,
  canPause: 'Can pause and change speed',
  paused: (name: string) => `${name} paused the shop.`,
  speed: (name: string, speed: number) => `${name} set the speed to ${speed}×.`,
  bigDeal: (name: string, message: string) => `${name}: ${message}`,
  alertsLine: (name: string, message: string) => `${name}: ${message}`,
  changedThat: (name: string) => `${name} already changed that.`,
  stillHere: 'Still here? The shared shop pauses when nobody’s playing.',
  imHere: 'I’m here',
  lost: 'Lost the connection to the shared shop. Reconnecting…',
  catchingUp: 'Catching up with the shared shop…',
  slow: 'Your device can’t keep up with the shared shop at this speed, so it keeps catching up. Someone who can change the speed could slow it down.',
  tooFast: 'Slow down a little: that was a lot of actions at once.',
  failed: 'That didn’t work, and nothing was changed. Please try again.',
  savesHere: (club: string) => `This is ${club}’s shared shop: it saves on the server. Your own aquarium is saved and waits for you.`,
  reload: 'Reload',
  // chunk 14 — the money pool and its tiers (ADR-0050 decision 6: as previewed). Money as the game writes it (fmtMoney).
  money: 'Money',
  moneyToSpend: (can: number) => `Money: ${$(can)} to spend`,
  moneyWaiting: (label: string, n: number) => `${label} (${n})`,
  moneyTitle: 'Shop money',
  pool: (money: number) => `Pool: ${$(money)}. Everything the shop earns goes here.`,
  youCanSpend: (can: number) => `You can spend ${$(can)}.`,
  allowanceLeft: (left: number, allowance: number) => `Allowance: ${$(left)} of ${$(allowance)} left today.`,
  approvedForYou: (extra: number) => `Approved for you: ${$(extra)}.`,
  askForMoney: 'Ask for money',
  howMuch: 'How much?',
  whatFor: 'What for? (optional)',
  sendRequest: 'Send request',
  cancel: 'Cancel',
  yourRequests: 'Your requests',
  waiting: (amount: number, note?: string) => (note ? `${$(amount)}: ${note} · Waiting` : `${$(amount)} · Waiting`),
  requests: 'Requests',
  asks: (name: string, amount: number, note?: string) => (note ? `${name} asks for ${$(amount)}: ${note}` : `${name} asks for ${$(amount)}`),
  approve: 'Approve',
  decline: 'Decline',
  giveMoney: 'Give money',
  give: 'Give',
  spending: 'Spending:',
  spendsFreely: 'Spends freely',
  allowance: 'Allowance',
  eachGameDay: 'each game day',
  asksFirst: 'Asks first',
  canApprove: 'Can approve requests and give money',
  // whole dollars from $100 (as the game writes money): the cost rounds up and what's left down, so they never read alike
  overspend: (cost: number, can: number) => `That costs ${$(cost >= 100 ? Math.ceil(cost) : cost)}, and you can spend ${$(can)}. Ask for more in Money.`,
  asksPopup: (name: string, amount: number, note?: string) => (note ? `${name} asks for ${$(amount)}: ${sentence(note)}` : `${name} asks for ${$(amount)}.`),
  approvedYour: (name: string, amount: number) => `${name} approved your ${$(amount)}.`,
  declinedYour: (name: string, amount: number) => `${name} declined your request for ${$(amount)}.`,
  gaveYou: (name: string, amount: number) => `${name} gave you ${$(amount)} to spend.`,
  waitingInMoney: (n: number) => (n === 1 ? '1 request is waiting in Money.' : `${n} requests are waiting in Money.`),
} as const;

/** "Prismatic betta" → "Prismatic betta."; a note that ends a sentence itself keeps its own mark (as the alerts line). */
function sentence(s: string): string {
  return /[.!?…]$/.test(s) ? s : `${s}.`;
}

/** Why a visit ended: the server's closings (§8), or this player's sign-in (ADR-0049). */
export type VisitEnd = ClosingReason | 'signedOut';

/** What a `closing` says (§8), with the day shops open again, the last save and the club filled in. */
export function closingText(why: VisitEnd, o: { club: string; until?: string; savedAt?: number; now?: number }): string {
  switch (why) {
    case 'signedOut':
      return 'You need to be signed in to play the shared shop. Sign in from Social and open it again.';
    case 'cap':
      return `Shared shops have used this month’s free data (2 GB). They open again on ${reopenDate(o.until, o.now)}.`;
    case 'hours':
      return `Shared shops have used this month’s free server hours. They open again on ${reopenDate(o.until, o.now)}.`;
    case 'full':
      return 'The shared shop is full (10 people). Try again soon.';
    case 'build':
      return 'A new version of Aquarium Go is out. Reload to join the shared shop.';
    case 'updating':
      return 'The shared shop is updating. Try again in a few minutes.';
    case 'removed':
      return `You’re no longer in ${o.club}, so you can’t open its shared shop.`;
    case 'elsewhere':
      return 'You opened this shared shop in another tab.';
    case 'fault':
      return `The shared shop hit a problem and stopped. It’s saved as of ${clockTime(o.savedAt)}.`;
    case 'restart':
      return `The shared shop’s server restarted, so it went back to its last save (${minutesAgo(o.savedAt, o.now)} minutes ago).`;
    case 'outofstep':
      return 'Your game keeps falling out of step with the shared shop, so it stopped. Reload to try again.';
    case 'gone':
      return `${o.club} has no shared shop any more.`;
  }
}

/** The closings that offer Reload (§8). */
export const RELOAD_CLOSINGS: ReadonlySet<VisitEnd> = new Set(['build', 'outofstep']);

/** "1 November" from `YYYY-MM-DD` (the server's day, UTC); without one, the 1st of next month (when caps reset). */
export function reopenDate(until: string | undefined, now = Date.now()): string {
  const m = until ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(until) : null;
  const today = new Date(now);
  const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

function clockTime(at: number | undefined): string {
  const d = new Date(typeof at === 'number' && Number.isFinite(at) ? at : Date.now());
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function minutesAgo(at: number | undefined, now = Date.now()): number {
  if (typeof at !== 'number' || !Number.isFinite(at)) return 0;
  return Math.max(0, Math.round((now - at) / 60_000));
}

/** "1.2 GB", "340 MB" for the owner's meter. */
export function formatBytes(n: number): string {
  if (!(n > 0)) return '0 MB';
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)} GB`;
  return `${Math.max(1, Math.round(n / 1e6))} MB`;
}

/** Awake hours, whole above 10. */
export function formatHours(seconds: number): string {
  const h = Math.max(0, seconds) / 3600;
  return h >= 10 ? String(Math.round(h)) : h.toFixed(1);
}
