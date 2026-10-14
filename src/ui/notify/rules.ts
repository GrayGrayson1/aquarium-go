/**
 * System-notification rules (0.5 spec §12.2; ADR-0022, ADR-0023). OWNER: lane "notify".
 *
 * Pure functions, unit-tested (tests/sim/notify-rules.test.ts): which log events become a notification, with what
 * title, body and link; quiet hours; and the rate limit. Nothing here reads a clock, the DOM or storage: the caller
 * (./deliver.ts) passes the time, the local minutes of the day and the stored state in, so the rules behave the same
 * by day and by night (B-173).
 *
 * - A log event notifies when the sim tagged it (`GameEvent.notice`, src/types/game.ts) or when it is a danger-level
 *   event about a tank (Animal care). Everything else never notifies: the in-game toast and the Alerts drawer stay the
 *   main channel.
 * - Quiet hours (default 10 PM to 8 AM, on): from 22:00 up to but not including 08:00 local time, everything is held
 *   except danger-level Animal care. Held notifications are dropped, not delivered later (the Alerts drawer keeps
 *   them all).
 * - Rate limits (real time, not game time): one per category per 30 minutes, the ones in between counted and named on
 *   the next one ("… and 2 more"); at most six an hour in all. Every notification of a category carries the same tag,
 *   so the system replaces it rather than stacking.
 */
import type { GameEvent } from '@/types';
import { fmtMoney as formatMoney } from '@/sim/economy/util'; // the log's own money format ("$120", "$4.50")
import { untilTime } from '../panels/common/format';

export type NotifyCategory = 'rare' | 'care' | 'market' | 'breeding' | 'shows' | 'auto';
/** lane:automation (chunk 5, DESIGN-S3D §8.9; NOTIFY-012) — the sixth, Automation (`auto`): shortages and paused lines. */
export const NOTIFY_CATEGORIES: readonly NotifyCategory[] = ['rare', 'care', 'market', 'breeding', 'shows', 'auto'];

export interface PlannedNotification {
  category: NotifyCategory;
  title: string;
  body: string;
  /** The address it opens (`#/shop/fish/offer_k3`). */
  route: string;
  /** 'danger' comes through quiet hours (danger-level Animal care only). */
  priority: 'normal' | 'danger';
  /** The system groups by tag: the category, so a newer one replaces the older (§12.2). */
  tag: NotifyCategory;
}

/** What the rules may look up in the game they're reading (names that are not on the event itself). */
export interface RuleLookups {
  /** The game hour now ("It leaves in 14 h"). */
  hour: number;
  tankName(id: string): string | null;
  /** lane:automation (chunk 5) — the Operations Desk is researched: Automation notifications open Problems, else the problem's tab. */
  desk?: boolean;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const seg = (id: string) => encodeURIComponent(id);
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
/** End a sentence that may close on a name with its own full stop ("Coral Reef Co.") without doubling it. */
const stop = (text: string) => (/[.!?…]$/.test(text) ? text : `${text}.`);

/** "+12% vs fair value" (the listing card's wording, src/ui/panels/market/Listings.tsx), or null without a value. */
function vsFair(amount: number, fair: number | null): string | null {
  if (!fair || fair <= 0) return null;
  const p = Math.round(((amount - fair) / fair) * 100);
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)}% vs fair value`;
}

/** "Ember’s Tank: the Auto Water Changer is out of salt…" reads as "the Auto Water Changer…" under the tank's name. */
function withoutTankPrefix(text: string, tank: string): string {
  const head = `${tank}: `;
  if (!text.startsWith(head)) return text;
  const rest = text.slice(head.length);
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

/**
 * The notification a log event asks for, or null (unmapped events never notify). The category's on/off switch,
 * quiet hours and the rate limit are applied later (`decide`).
 */
export function planNotification(e: GameEvent, look: RuleLookups): PlannedNotification | null {
  const n = e.notice;
  const v = (n && typeof n === 'object' && n.vars && typeof n.vars === 'object' ? n.vars : {}) as Record<string, unknown>;
  const topic = n && typeof n === 'object' ? n.topic : undefined;
  const make = (category: NotifyCategory, title: string, body: string, route: string, priority: 'normal' | 'danger' = 'normal'): PlannedNotification => ({ category, title, body, route, priority, tag: category });
  const shopRoute = typeof e.offerId === 'string' && e.offerId ? `#/shop/fish/${seg(e.offerId)}` : '#/shop';
  const listingRoute = typeof e.listingId === 'string' && e.listingId ? `#/market/listings/${seg(e.listingId)}` : '#/market/listings';
  const leaves = (until: number | null) => (until === null ? null : untilTime(until, look.hour));

  switch (topic) {
    case 'prismatic': {
      const species = str(v.species) ?? 'animal';
      const morph = str(v.morph) ?? species;
      const seller = str(v.seller) ?? 'The shop';
      const when = leaves(num(v.until));
      return make('rare', `Prismatic ${species} in the shop`, `${seller} just stocked a Prismatic ${morph}.${when ? ` It leaves ${when}.` : ''}`, shopRoute);
    }
    case 'special': {
      const morph = str(v.morph);
      if (!morph) return null;
      const price = num(v.price);
      const when = leaves(num(v.until));
      return make('rare', `Today only: ${morph}`, `${str(v.seller) ?? 'The shop'}${price !== null ? ` · ${formatMoney(price)}` : ''}.${when ? ` Leaves ${when}.` : ''}`, shopRoute);
    }
    case 'care': {
      const tank = typeof e.tankId === 'string' ? look.tankName(e.tankId) : null;
      if (!tank || !str(e.text)) return null;
      const open = str(v.open);
      const route =
        open === 'animal' && e.creatureId ? `#/livestock/animal/${seg(e.creatureId)}` : open === 'equipment' ? `#/tanks/${seg(e.tankId!)}/equipment` : `#/tanks/${seg(e.tankId!)}`;
      return make('care', tank, withoutTankPrefix(e.text, tank), route, e.kind === 'danger' ? 'danger' : 'normal');
    }
    case 'bid': {
      const title = str(v.title);
      const amount = num(v.amount);
      if (!title || amount === null) return null;
      const fair = vsFair(amount, num(v.fair));
      return make('market', `New bid on ${title}`, `${str(v.buyer) ?? 'A buyer'} offers ${formatMoney(amount)}${fair ? ` (${fair})` : ''}.`, listingRoute);
    }
    case 'sale': {
      const title = str(v.title);
      const amount = num(v.amount);
      if (!title || amount === null) return null;
      return make('market', `Sold: ${title}`, stop(`${str(v.buyer) ?? 'A buyer'} paid ${formatMoney(amount)}`), listingRoute);
    }
    case 'auction_ending': {
      const title = str(v.title);
      const amount = num(v.amount);
      if (!title || amount === null) return null;
      return make('market', `Ending soon: ${title}`, stop(`Best offer so far: ${formatMoney(amount)} from ${str(v.buyer) ?? 'a buyer'}`), listingRoute);
    }
    case 'eggs':
    case 'hatch':
    case 'birth': {
      const count = num(v.n);
      const tank = str(v.tank);
      if (count === null || !tank) return null;
      const name = str(v.name);
      if (topic === 'eggs') return make('breeding', name ? `${name} laid eggs` : 'Eggs laid', `${plural(count, 'egg')} in ${tank}.`, '#/livestock/eggs');
      if (topic === 'hatch') return make('breeding', name ? `${name}’s eggs hatched` : 'Eggs hatched', `${count.toLocaleString('en-US')} fry ${count === 1 ? 'is' : 'are'} free-swimming in ${tank}.`, '#/livestock/eggs');
      return make('breeding', name ? `${name} gave birth` : 'Young born', `${count.toLocaleString('en-US')} young in ${tank}.`, '#/livestock/eggs');
    }
    case 'show_result': {
      const show = str(v.show);
      const name = str(v.name);
      const place = str(v.place);
      if (!show || !name || !place) return null;
      const prize = num(v.prize);
      const ribbon = str(v.ribbon);
      const parts = [prize ? `${formatMoney(prize)} prize` : null, ribbon ? `${ribbon} ribbon` : null].filter(Boolean);
      return make('shows', `${show}: ${name} placed ${place}`, parts.length ? `${parts.join(' · ')}.` : e.text, '#/shows/results');
    }
    // lane:automation (chunk 5, DESIGN-S3D §8.9; ADR-0026 decision 9) — from the Desk they open Problems, before it the tab
    case 'supply_out': {
      const body = str(v.body);
      if (!body || v.supply !== 'salt') return null;
      return make('auto', 'Out of salt mix', body, look.desk ? '#/operations/issues' : '#/operations/water');
    }
    case 'line_paused': {
      const line = str(v.line);
      const tank = str(v.tank);
      const pair = str(v.pair);
      const day = num(v.day);
      if (!line || !tank || !pair) return null;
      return make('auto', `${line} paused`, `${tank} is full, so ${pair} wait.${day !== null ? ` It restarts by itself on Day ${day}.` : ''}`, look.desk ? '#/operations/issues' : '#/operations/lines');
    }
    default:
      break;
  }
  // Untagged danger about a tank (water crashing, starving animals, a heater stuck on, no food): Animal care, and it
  // comes through quiet hours.
  if (e.kind === 'danger' && typeof e.tankId === 'string' && str(e.text)) {
    const tank = look.tankName(e.tankId);
    if (tank) return make('care', tank, withoutTankPrefix(e.text, tank), `#/tanks/${seg(e.tankId)}`, 'danger');
  }
  return null;
}

// ───────────────────────────── preferences, quiet hours, rate limits ─────────────────────────────

export interface NotifyPrefs {
  categories: Record<NotifyCategory, boolean>;
  quiet: { on: boolean; start: number; end: number };
}

/** §12.2: every category on except Shows; quiet hours on, 10 PM to 8 AM. */
export const DEFAULT_NOTIFY_PREFS: NotifyPrefs = Object.freeze({
  categories: Object.freeze({ rare: true, care: true, market: true, breeding: true, shows: false, auto: true }),
  quiet: Object.freeze({ on: true, start: 22, end: 8 }),
}) as NotifyPrefs;

/** A stored value read back: anything missing or malformed takes its default (the hours are fixed in 0.5). */
export function normalizePrefs(raw: unknown): NotifyPrefs {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const cats = o.categories && typeof o.categories === 'object' ? (o.categories as Record<string, unknown>) : {};
  const quiet = o.quiet && typeof o.quiet === 'object' ? (o.quiet as Record<string, unknown>) : {};
  const categories = {} as Record<NotifyCategory, boolean>;
  for (const c of NOTIFY_CATEGORIES) categories[c] = typeof cats[c] === 'boolean' ? (cats[c] as boolean) : DEFAULT_NOTIFY_PREFS.categories[c];
  return { categories, quiet: { on: typeof quiet.on === 'boolean' ? quiet.on : DEFAULT_NOTIFY_PREFS.quiet.on, start: 22, end: 8 } };
}

/** Is `minutes` (local minutes since midnight, 0–1439) inside quiet hours? 22:00 is in; 08:00 is out. */
export function inQuietHours(minutes: number, quiet: NotifyPrefs['quiet']): boolean {
  if (!quiet.on) return false;
  const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  const start = quiet.start * 60;
  const end = quiet.end * 60;
  return start <= end ? m >= start && m < end : m >= start || m < end;
}

export const CATEGORY_GAP_MS = 30 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const MAX_PER_HOUR = 6;

/** What the rate limit remembers between notifications (kept in memory: a reload starts fresh). */
export interface RateState {
  /** When each category last showed one. */
  last: Partial<Record<NotifyCategory, number>>;
  /** Held back by the limit since then: named on the category's next one. */
  folded: Partial<Record<NotifyCategory, number>>;
  /** When the ones shown in the last hour went out. */
  shown: number[];
}

export const emptyRateState = (): RateState => ({ last: {}, folded: {}, shown: [] });

export type Decision = { show: true; title: string; body: string } | { show: false; why: 'category-off' | 'quiet' | 'rate' };

/**
 * Should this planned notification be shown now? `now` is real time in ms, `minutes` the device's local minutes of
 * the day. Updates `rate` in place when it shows (or is held back by the limit).
 */
export function decide(p: PlannedNotification, prefs: NotifyPrefs, rate: RateState, now: number, minutes: number): Decision {
  if (!prefs.categories[p.category]) return { show: false, why: 'category-off' };
  if (inQuietHours(minutes, prefs.quiet) && !(p.category === 'care' && p.priority === 'danger')) return { show: false, why: 'quiet' };
  rate.shown = rate.shown.filter((t) => now - t < HOUR_MS && t <= now);
  const last = rate.last[p.category];
  if ((last !== undefined && now - last < CATEGORY_GAP_MS && now >= last) || rate.shown.length >= MAX_PER_HOUR) {
    rate.folded[p.category] = (rate.folded[p.category] ?? 0) + 1;
    return { show: false, why: 'rate' };
  }
  const more = rate.folded[p.category] ?? 0;
  rate.folded[p.category] = 0;
  rate.last[p.category] = now;
  rate.shown.push(now);
  return { show: true, title: p.title, body: more > 0 ? `${p.body} … and ${more} more` : p.body };
}

/** The test notification (§12.5): it skips the categories, quiet hours and the limit (it's a test). */
export const TEST_NOTIFICATION = Object.freeze({
  title: 'Test notification',
  body: 'Notifications work on this device. You’ll hear about rare stock, hungry animals and sales.',
});
