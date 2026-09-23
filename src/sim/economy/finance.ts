/**
 * Money: spend/earn helpers (used by every lane), daily operating bills, daily summaries, debt and the
 * one-time aquarium-club emergency loan. OWNER: lane "market".
 *
 * Invariants:
 * - Purchases (spend without allowDebt) can NEVER push money below 0.
 * - Only operating bills (allowDebt) may create debt. Animals are never repossessed.
 */
import type { GameState, LedgerEntry, DailySummary } from '@/types';
import type { SimContext } from '../context';
import { emitEvent } from '../context';
import { tankDailyCost } from '../water';
import { isUnlocked } from '../facility';
import { getFacilityLevel } from '@/data/facilities';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { AQUARIUM_CLUB, LOCAL_FISH_STORE } from '@/data/buyers';
import { dayIndex, finite, fmtMoney, roundCents, pushCapped } from './util';
import { quickSellQuote } from './valuation';
import { payStaff, staffWagesPerDay } from '../staff'; // lane:staff

const LEDGER_CAP = 400;
const DAILY_CAP = 120;
/** Debt duration before the aquarium club steps in. */
export const LOAN_AFTER_DEBT_HOURS = 72;
/** Share of each day's income that repays the loan. */
export const LOAN_REPAY_SHARE = 0.25;
const LOAN_MEMO = 'Emergency loan';

// ───────────────────────────── spend / earn ─────────────────────────────

/** Spend money. Returns false (and changes nothing) if the player cannot afford it, unless allowDebt. */
export function spend(state: GameState, amount: number, category: LedgerEntry['category'], memo: string, allowDebt = false): boolean {
  if (!Number.isFinite(amount)) return false;
  if (amount <= 0) return true;
  const f = state.finance;
  if (!Number.isFinite(f.money)) f.money = 0;
  if (!allowDebt && f.money < amount) return false;
  f.money = roundCents(f.money - amount);
  pushCapped(f.ledger, { hour: state.clock.hour, amount: -roundCents(amount), category, memo }, LEDGER_CAP);
  return true;
}

export function earn(state: GameState, amount: number, category: LedgerEntry['category'], memo: string): void {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const f = state.finance;
  if (!Number.isFinite(f.money)) f.money = 0;
  f.money = roundCents(f.money + amount);
  pushCapped(f.ledger, { hour: state.clock.hour, amount: roundCents(amount), category, memo }, LEDGER_CAP);
}

export const canAfford = (state: GameState, amount: number): boolean => Number.isFinite(amount) && state.finance.money >= amount;

// ───────────────────────────── operating costs ─────────────────────────────

export interface OperatingCosts {
  total: number;
  tanks: { tankId: string; name: string; cost: number }[];
  rent: number;
  levelName: string;
  /** lane:staff — staff wages per day (included in `total`) and how many people they cover. */
  wages?: number;
  staffCount?: number;
}

function safeTankCost(state: GameState, tankId: string): number {
  const tank = state.tanks[tankId];
  if (!tank) return 0;
  try {
    return Math.max(0, finite(tankDailyCost(state, tank)));
  } catch {
    return TANK_TIER_BY_ID[tank.tierId]?.baseUpkeep ?? 0.5;
  }
}

/** What tomorrow's bills will be: Σ tank running costs + facility rent. */
export function dailyOperatingCost(state: GameState): OperatingCosts {
  const tanks = state.tankOrder
    .filter((id) => state.tanks[id])
    .map((id) => ({ tankId: id, name: state.tanks[id].name, cost: roundCents(safeTankCost(state, id)) }));
  const lvl = getFacilityLevel(state.facility.level);
  const rent = Math.max(0, finite(lvl?.dailyRent ?? 0));
  // lane:staff — wages are part of the daily bills (paid at midnight, never into debt: see payStaff).
  const staff = state.staff?.roster.length ? staffWagesPerDay(state) : null;
  const wages = staff ? Math.max(0, finite(staff.total)) : 0;
  const total = roundCents(tanks.reduce((a, t) => a + t.cost, 0) + rent + wages);
  return { total, tanks, rent, levelName: lvl?.name ?? 'Facility', ...(staff ? { wages, staffCount: staff.count } : {}) };
}

// ───────────────────────────── suggestions when cash is short ─────────────────────────────

/** Concrete, currently-possible ways to raise cash (used in debt warnings and by the UI). */
export function cashSuggestions(state: GameState): string[] {
  const out: string[] = [];
  const candidates = Object.values(state.creatures).filter((c) => c.status === 'alive' && !c.isStarter && !c.favorite);
  let best: { name: string; value: number } | null = null;
  for (const c of candidates) {
    const q = quickSellQuote(state, [c.id]);
    if (q.ok && (!best || q.total > best.value)) best = { name: c.name, value: q.total };
  }
  if (best && best.value >= 1) out.push(`Quick-sell ${best.name} to ${LOCAL_FISH_STORE} (about ${fmtMoney(best.value)} today).`);
  const listable = state.tankOrder.filter((id) => state.tanks[id] && !state.tanks[id].listingId);
  if (isUnlocked(state, 'tank_auctions') && listable.length > 0) {
    out.push('List a whole aquarium at auction — finished displays attract the biggest bids.');
  } else if (isUnlocked(state, 'market_listings')) {
    out.push('List a spare animal on the marketplace and let buyers bid.');
  }
  if (isUnlocked(state, 'visitors') && !state.facility.openToPublic) out.push('Open your doors to visitors for admission and tips.');
  const empty = state.tankOrder.filter((id) => state.tanks[id] && !Object.values(state.creatures).some((c) => c.tankId === id && (c.status === 'alive' || c.status === 'listed')));
  if (empty.length > 0) out.push(`${empty.length === 1 ? 'An empty tank still costs' : `${empty.length} empty tanks still cost`} money to run — sell or repurpose ${empty.length === 1 ? 'it' : 'them'}.`);
  if (state.tankOrder.some((id) => (state.tanks[id]?.equipment.length ?? 0) > 1)) out.push('Trim running costs: a shorter light schedule and switching off gear you do not need lowers the daily bill.');
  if (!isUnlocked(state, 'market_listings')) out.push('Keep your animals healthy and breeding — the marketplace opens as your reputation grows, and offspring sell well.');
  if (out.length === 0) {
    const starter = Object.values(state.creatures).find((c) => c.status === 'alive' && (c.isStarter || c.favorite));
    const q = starter ? quickSellQuote(state, [starter.id]) : null;
    out.push('Hold steady: bills keep running, but nothing is taken from you, and help is available if debt lasts a few days.');
    if (starter && q?.ok) out.push(`As a last resort, ${LOCAL_FISH_STORE} would pay about ${fmtMoney(q.total)} for ${starter.name}.`);
  }
  return out;
}

// ───────────────────────────── daily step ─────────────────────────────

function ledgerForDay(state: GameState, day0: number): LedgerEntry[] {
  const lo = day0 * 24;
  const hi = lo + 24;
  return state.finance.ledger.filter((e) => e.hour >= lo - 1e-6 && e.hour < hi + 1e-6);
}

function runMidnight(state: GameState, endedDay0: number): void {
  const f = state.finance;
  const costs = dailyOperatingCost(state);

  // 1. Operating bills (the only thing allowed to create debt).
  if (costs.tanks.length <= 6) {
    for (const t of costs.tanks) if (t.cost > 0) spend(state, t.cost, 'operating', `Running costs — ${t.name}`, true);
  } else {
    const top = [...costs.tanks].sort((a, b) => b.cost - a.cost).slice(0, 3);
    const tankTotal = roundCents(costs.tanks.reduce((a, t) => a + t.cost, 0));
    spend(state, tankTotal, 'operating', `Running costs — ${costs.tanks.length} tanks (largest: ${top.map((t) => `${t.name} ${fmtMoney(t.cost)}`).join(', ')})`, true);
  }
  if (costs.rent > 0) spend(state, costs.rent, 'facility', `Rent — ${costs.levelName}`, true);
  // lane:staff — wages: animal care is paid first; anyone who can't be paid works out a notice period instead of creating debt.
  payStaff(state);
  // lane:w2-sim — the daily bill the warnings quote is the one the Finances panel shows: the same dailyOperatingCost,
  // taken after payday, so staff who just left over unpaid wages are no longer on it.
  const ahead = dailyOperatingCost(state);

  // 2. Loan repayment from a share of the day's income.
  const dayEntries = ledgerForDay(state, endedDay0);
  const income = dayEntries.filter((e) => e.amount > 0 && !e.memo.startsWith(LOAN_MEMO)).reduce((a, e) => a + e.amount, 0);
  if (f.loan && f.loan.outstanding > 0 && income > 0) {
    const repay = roundCents(Math.min(f.loan.outstanding, income * LOAN_REPAY_SHARE, Math.max(0, f.money)));
    if (repay > 0 && spend(state, repay, 'other', `Loan repayment to ${AQUARIUM_CLUB}`)) {
      f.loan.outstanding = roundCents(f.loan.outstanding - repay);
      if (f.loan.outstanding <= 0.01) {
        f.loan.outstanding = 0;
        f.loan.repaidHour = state.clock.hour;
        emitEvent(state, { kind: 'celebrate', text: `Loan repaid in full — ${AQUARIUM_CLUB} sends their thanks and a round of applause.`, toast: true });
      }
    }
  }

  // 3. Daily summary.
  const entries = ledgerForDay(state, endedDay0);
  const summary: DailySummary = {
    day: endedDay0 + 1,
    income: roundCents(entries.filter((e) => e.amount > 0 && !e.memo.startsWith(LOAN_MEMO)).reduce((a, e) => a + e.amount, 0)),
    expenses: roundCents(-entries.filter((e) => e.amount < 0).reduce((a, e) => a + e.amount, 0)),
    visitors: visitorsForDay(state, endedDay0 + 1),
    sales: entries.filter((e) => e.amount > 0 && (e.category === 'livestock_sale' || e.category === 'tank_sale')).length,
  };
  pushCapped(f.daily, summary, DAILY_CAP);

  // 4. Warnings with concrete suggestions.
  if (f.money < 0) {
    const tips = cashSuggestions(state);
    const loanNote = f.loan ? '' : ' If things stay tight for a few days, the local aquarium club may be able to help.';
    emitEvent(state, {
      kind: 'warning',
      text: `You're ${fmtMoney(-f.money)} in the red after today's bills (${fmtMoney(ahead.total)}/day). Purchases are paused, but your animals are safe.${tips.length ? ` Ideas: ${tips.slice(0, 3).join(' ')}` : ''}${loanNote}`,
      toast: true,
    });
    f.lastWarnHour = state.clock.hour;
  } else if (ahead.total > 0 && f.money < ahead.total * 3 && state.clock.hour - (f.lastWarnHour ?? -999) >= 47) {
    const days = Math.max(0, Math.floor(f.money / ahead.total));
    emitEvent(state, {
      kind: 'tip',
      text: `Cash is getting low: ${fmtMoney(f.money)} covers about ${days} day${days === 1 ? '' : 's'} of running costs (${fmtMoney(ahead.total)}/day).`,
    });
    f.lastWarnHour = state.clock.hour;
  }
}

function visitorsForDay(state: GameState, day: number): number {
  const v = state.visitors;
  if (!v) return 0;
  if (v.today && v.today.day === day) return Math.round(finite(v.today.count));
  const h = v.history?.find((x) => x.day === day);
  return h ? Math.round(finite(h.count)) : 0;
}

function grantLoan(state: GameState): void {
  const f = state.finance;
  const costs = dailyOperatingCost(state);
  const cushion = Math.max(120, costs.total * 3);
  const amount = Math.ceil((Math.max(0, -f.money) + cushion) / 10) * 10;
  earn(state, amount, 'other', `${LOAN_MEMO} from ${AQUARIUM_CLUB}`);
  f.loan = { amount, outstanding: amount, takenHour: state.clock.hour };
  delete f.debtSinceHour;
  emitEvent(state, {
    kind: 'celebrate',
    text: `Good news: ${AQUARIUM_CLUB} heard you were struggling and lent you ${fmtMoney(amount)}, interest-free. It is repaid automatically from a quarter of your future daily income. This is a one-time lifeline, so plan your running costs carefully.`,
    toast: true,
  });
}

/** Daily operating costs (equipment upkeep, electricity, rent), summaries, debt handling and the emergency loan. */
export function stepFinance(state: GameState, dt: number, ctx: SimContext): void {
  const f = state.finance;
  if (!Number.isFinite(f.money)) f.money = 0;
  if (state.isShowcase) return; // showcase worlds never pay bills or earn money
  const start = ctx.hour;
  const end = ctx.hour + Math.max(0, dt);

  if (dayIndex(end) > dayIndex(start)) {
    const endedDay0 = dayIndex(start);
    if ((f.lastBilledDay ?? 0) < endedDay0 + 1) {
      f.lastBilledDay = endedDay0 + 1;
      runMidnight(state, endedDay0);
    }
  }

  if (f.money < 0) {
    if (f.debtSinceHour === undefined) f.debtSinceHour = state.clock.hour;
  } else if (f.debtSinceHour !== undefined) {
    delete f.debtSinceHour;
    emitEvent(state, { kind: 'info', text: `You're back in the black with ${fmtMoney(f.money)}. Purchases are available again.` });
  }

  if (f.debtSinceHour !== undefined && !f.loan && end - f.debtSinceHour >= LOAN_AFTER_DEBT_HOURS) grantLoan(state);
}
