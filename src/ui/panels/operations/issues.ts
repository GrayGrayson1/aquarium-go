/**
 * Problems in words (DESIGN-S3D §7.1, §7.6, §8.3, §11; ADR-0026 decision 9): each item's title, badge, one-line reason,
 * the tab it belongs to (before the Operations Desk the links open it) and its main action. One place, so the Overview,
 * the Problems view, the alerts drawer and the tank rows say the same thing. OWNER: lane "automation" (chunk 5).
 * Wording the design doesn't give is the owner's ADR-0032 (asked in one batch, as ADR-0026 decision 9 says).
 */
import type { GameState } from '@/types';
import { EGGS_SUPPLY, VEGETABLES, WATER_ROOM } from '@/data/catalog/machines';
import { getFoodDef } from '@/data/catalog/foods';
import { STOCK_BUDGET } from '@/data/staff';
import { formatClock, dayOf } from '@/sim/time';
import { SALT_PRICE_PER_KG } from '@/sim/economy';
import { batchGal, batchSaltKg, prepRate, saltOutText, freshCap, type Problem, type SupplyProblem } from '@/sim/automation';
import { opsSnapshot } from '@/ui/common/ops';
import { findLine } from '@/sim/production';
import { lineView } from '@/sim/production/view';

export type IssueKind = 'salt' | 'eggs' | 'veg' | 'live' | 'fresh' | 'salt_rate' | 'fresh_rate' | 'line';
export type IssueAction = 'buy-salt' | 'buy-eggs' | 'buy-veg' | 'raise-budget' | 'hire' | 'staff' | 'add-qt' | 'wait' | 'faster-prep' | 'reservoirs' | 'water-tab' | 'why' | 'feed';

export interface IssueView {
  key: string;
  kind: IssueKind;
  tone: 'watch' | 'danger';
  badge: 'Look soon' | 'Needs you';
  title: string;
  reason: string;
  /** The tab with the problem (before the Desk, links open it). */
  tab: 'water' | 'feed' | 'lines';
  /** The main action, with its long and short (phone) labels. */
  action: { id: IssueAction; label: string; short: string } | null;
  problem: Problem;
}

export const SALT_ORDER_KG = 40;
export const saltBuyLabel = `Buy ${SALT_ORDER_KG} kg · $${SALT_ORDER_KG * SALT_PRICE_PER_KG}`;

/** "10:00 AM", "tomorrow, 9:00 AM" (from `now`). */
export function whenText(at: number, now: number): string {
  const d = dayOf(at) - dayOf(now);
  return d <= 0 ? formatClock(at) : d === 1 ? `tomorrow, ${formatClock(at)}` : `Day ${dayOf(at)}, ${formatClock(at)}`;
}

/** The next 10 AM / 10 PM mixing check from `now`. */
export function nextMixHour(now: number): number {
  let best = Infinity;
  for (const h of WATER_ROOM.mixHours) {
    let t = Math.floor(now / 24) * 24 + h;
    if (t < now - 1e-9) t += 24;
    best = Math.min(best, t);
  }
  return best;
}

const first = (name: string) => name.split(' ')[0];

/** Is the stock budget at its level's maximum (then "Raise budget" gives way to the reason, ADR-0026 decision 10)? */
export function budgetAtMax(g: GameState): boolean {
  const max = STOCK_BUDGET[g.facility.level]?.max ?? 0;
  return !!g.staff && g.staff.stockBudget >= max;
}

function saltIssue(g: GameState, p: SupplyProblem): IssueView {
  const now = g.clock.hour;
  const room = g.facility.water;
  const batchKg = room ? batchSaltKg(batchGal(room)) : 4.1;
  const kg = Math.round(p.stock * 10) / 10;
  const f = opsSnapshot(g).forecast;
  const noManager = p.why === 'no_manager';
  if (p.state === 'arriving') {
    const buy = f?.plan.buys.find((b) => b.kind === 'salt');
    return {
      key: 'salt',
      kind: 'salt',
      tone: 'watch',
      badge: 'Look soon',
      title: `Salt mix arrives ${dayOf(p.arrives ?? now) > dayOf(now) ? 'tomorrow, ' : 'at '}${formatClock(p.arrives ?? now)}`,
      // the design's "at her next check" describes its sample (Rosa); stock managers come from the whole name pool
      reason: `${first(f?.m.name ?? 'Your stock manager')} buys ${buy?.kg ?? SALT_ORDER_KG} kg ($${buy?.price ?? SALT_ORDER_KG * SALT_PRICE_PER_KG}) at the next check now that the budget covers it.`,
      tab: 'water',
      action: { id: 'buy-salt', label: `Buy now · $${SALT_ORDER_KG * SALT_PRICE_PER_KG}`, short: 'Buy' },
      problem: p,
    };
  }
  const batches = Math.floor((p.stock + 1e-6) / batchKg);
  const reason =
    p.state === 'out'
      ? noManager
        ? 'No one reorders salt mix. Buy it, or hire a stock manager.'
        : saltOutText(g, p)
      : batches <= 1
        ? `${kg} kg: enough for ${nextMixHour(now) - now > 12 ? 'tomorrow’s' : 'the'} ${formatClock(nextMixHour(now))} batch, then none.`
        : `${kg} kg: enough for ${batches} batches.`; // ADR-0032
  return {
    key: 'salt',
    kind: 'salt',
    tone: p.tone,
    badge: p.state === 'out' ? 'Needs you' : 'Look soon',
    title: p.state === 'out' ? 'Out of salt mix' : 'Salt mix is low',
    reason,
    tab: 'water',
    action: { id: 'buy-salt', label: saltBuyLabel, short: 'Buy' },
    problem: p,
  };
}

/** Every problem as words, in the snapshot's order (danger first). */
export function issueViews(g: GameState, problems: readonly Problem[]): IssueView[] {
  const out: IssueView[] = [];
  for (const p of problems) {
    if (p.kind === 'line') {
      const line = findLine(g, p.lineId);
      const v = line ? lineView(g, line) : null;
      const raise = line ? g.tanks[line.tanks.raise]?.name ?? 'The raise tank' : 'The raise tank';
      const places = v?.raising.places;
      out.push({
        key: `line:${p.lineId}`,
        kind: 'line',
        tone: 'watch',
        badge: 'Look soon',
        title: `${p.name} paused`,
        reason: places ? `${raise} is full: ${places.used} of ${places.cap} places.` : `${raise} is full.`,
        tab: 'lines',
        action: { id: 'why', label: 'See why', short: 'Why' },
        problem: p,
      });
      continue;
    }
    switch (p.supply) {
      case 'salt':
        out.push(saltIssue(g, p));
        break;
      case 'eggs':
        out.push({
          key: 'eggs',
          kind: 'eggs',
          tone: p.tone,
          badge: p.state === 'out' ? 'Needs you' : 'Look soon',
          title: p.state === 'arriving' ? 'Brine shrimp eggs arrive at the next check' : p.state === 'out' ? 'Out of brine shrimp eggs' : 'Brine shrimp eggs are low', // ADR-0032
          reason: p.state === 'out' ? 'The hatchery cones wait for eggs.' : `${p.stock} ${p.stock === 1 ? 'scoop' : 'scoops'}: a cone takes one a day.`, // ADR-0032
          tab: 'feed',
          action: { id: 'buy-eggs', label: `Buy · $${EGGS_SUPPLY.price}`, short: 'Buy' },
          problem: p,
        });
        break;
      case 'veg': {
        const veg = getFoodDef(VEGETABLES);
        out.push({
          key: 'veg',
          kind: 'veg',
          tone: p.tone,
          badge: p.state === 'out' ? 'Needs you' : 'Look soon',
          title: p.state === 'arriving' ? 'Vegetables arrive at the next check' : p.state === 'out' ? 'Out of vegetables for the jars' : 'Vegetables for the jars are low', // ADR-0032
          reason: p.state === 'out' ? 'The infusoria jars wait for Blanched Vegetables.' : `${p.stock} ${p.stock === 1 ? 'serving' : 'servings'}: a jar takes one every 3 days.`, // ADR-0032
          tab: 'feed',
          action: { id: 'buy-veg', label: `Buy · $${veg?.price ?? 3}`, short: 'Buy' },
          problem: p,
        });
        break;
      }
      case 'live': {
        const names = (p.tankIds ?? []).map((id) => g.tanks[id]?.name).filter(Boolean) as string[];
        out.push({
          key: 'live',
          kind: 'live',
          tone: p.tone,
          badge: p.state === 'out' ? 'Needs you' : 'Look soon',
          title: p.state === 'out' ? 'No live food for the dosers' : 'Live food is short for the dosers', // ADR-0032
          reason: `${names[0] ?? 'A tank'}${names.length > 1 ? ` and ${names.length - 1} more` : ''} ${names.length > 1 ? 'have' : 'has'} young to feed and none of their food in stock.`, // ADR-0032
          tab: 'feed',
          action: { id: 'feed', label: 'Feed tab', short: 'Feed' },
          problem: p,
        });
        break;
      }
      case 'fresh': {
        const room = g.facility.water;
        const rate = room ? prepRate(room) : 6;
        const by = g.clock.hour + Math.min(24, (room ? freshCap(room) : 150) / rate);
        out.push({
          key: 'fresh',
          kind: 'fresh',
          tone: 'watch',
          badge: 'Look soon',
          title: 'Fresh water ran out',
          reason: `Today’s water used the whole fresh reserve. Auto Top-Offs and salt mixing wait until the prep station refills it: ${Math.floor(rate * 4)} gal by ${formatClock(Math.min(by, g.clock.hour + 4))}.`,
          tab: 'water',
          action: { id: 'faster-prep', label: 'Faster prep in Build', short: 'Build' },
          problem: p,
        });
        break;
      }
      // the Water room's day (ADR-0033): the action buys the upgrade that helps, or opens the Water tab once none is left
      case 'salt_rate': {
        const room = g.facility.water;
        const more = !!room && room.reservoirs < WATER_ROOM.maxReservoirs;
        out.push({
          key: 'salt_rate',
          kind: 'salt_rate',
          tone: 'watch',
          badge: 'Look soon',
          title: 'Salt water runs short',
          reason: `The salt tanks’ changes use ${Math.round(p.perDay)} gal of salt water a day, and the mixer makes up to ${Math.round(p.capacity ?? 0)}. The changes it can’t cover are skipped, not done weak.`,
          tab: 'water',
          action: more ? { id: 'reservoirs', label: 'Reservoirs in Build', short: 'Build' } : { id: 'water-tab', label: 'Water tab', short: 'Water' },
          problem: p,
        });
        break;
      }
      case 'fresh_rate': {
        const room = g.facility.water;
        const reserve = p.limit === 'reserve';
        // chunk 6 (B-202, ADR-0034 decision 7): the mixer's checks find too little though the day is covered
        if (p.limit === 'timing') {
          const moreRes = !!room && room.reservoirs < WATER_ROOM.maxReservoirs;
          const morePrep = !!room && room.prepLevel < WATER_ROOM.prepRates.length - 1;
          out.push({
            key: 'fresh_rate',
            kind: 'fresh_rate',
            tone: 'watch',
            badge: 'Look soon',
            title: 'Fresh water runs short',
            reason: `Salt mixing needs ${Math.round(p.capacity ?? 0)} gal of fresh water at its 10 AM and 10 PM checks, and the fresh reserve doesn’t have it by then. What it can’t cover waits: changes are skipped, not done weak.`,
            tab: 'water',
            action: moreRes ? { id: 'reservoirs', label: 'Reservoirs in Build', short: 'Build' } : morePrep ? { id: 'faster-prep', label: 'Faster prep in Build', short: 'Build' } : { id: 'water-tab', label: 'Water tab', short: 'Water' },
            problem: p,
          });
          break;
        }
        const more = !!room && (reserve ? room.reservoirs < WATER_ROOM.maxReservoirs : room.prepLevel < WATER_ROOM.prepRates.length - 1);
        out.push({
          key: 'fresh_rate',
          kind: 'fresh_rate',
          tone: 'watch',
          badge: 'Look soon',
          title: 'Fresh water runs short',
          reason: reserve
            ? `The tanks’ changes take ${Math.round(p.perDay)} gal of fresh water at lights-on, and the fresh reserve holds ${Math.round(p.capacity ?? 0)}. What it can’t cover waits: changes are skipped, not done weak.`
            : `The tanks use ${Math.round(p.perDay)} gal of fresh water a day, and the prep station makes ${Math.round(p.capacity ?? 0)}. What it can’t cover waits: changes are skipped, not done weak.`,
          tab: 'water',
          action: !more ? { id: 'water-tab', label: 'Water tab', short: 'Water' } : reserve ? { id: 'reservoirs', label: 'Reservoirs in Build', short: 'Build' } : { id: 'faster-prep', label: 'Faster prep in Build', short: 'Build' },
          problem: p,
        });
        break;
      }
    }
  }
  return out;
}

/** "{n} to look at" (amber) or "{n} problems" (red, when anything needs you). */
export function issuesHeader(counts: { total: number; danger: number }): string {
  return counts.danger > 0 ? `${counts.total} ${counts.total === 1 ? 'problem' : 'problems'}` : `${counts.total} to look at`;
}
