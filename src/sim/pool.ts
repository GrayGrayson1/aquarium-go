/**
 * chunk 14 — a shared shop's money pool and its permission tiers (ADR-0043 decision 5, ADR-0050; PLAN.md chunk 14).
 *
 * The pool is the shop's own money (`finance.money`): everything the shop earns goes into it, and it drops only when
 * something is bought. `GameState.pool` holds only the limits: each member's tier (Spends freely, Allowance, Asks
 * first), their allowance left today and the money approved or given to them, who may approve, and the open requests.
 * Every copy applies the same commands to it, so every screen shows the same pool.
 *
 * - A member's spend is the money a command took from the pool (care and the pool's own commands aside). For a member
 *   who doesn't spend freely, every copy takes it from their allowance left today, then their approved money, in the
 *   command's own step; when that isn't enough, the result says so (`overspend`) and the server refuses the command
 *   before any copy sees it.
 * - Staff and the stock budget keep spending after, so they're for members who spend freely.
 * - The owner (the step's `owner` flag, set by the server) always spends freely, approves, and alone sets tiers.
 *
 * In a solo game there's no actor and none of this runs. OWNER: lane "social".
 */
import type { GameState, PoolAsk, PoolMember, PoolTier } from '@/types';
import { dayIndex, fmtMoney, roundCents } from './economy/util';
import { nextId } from './ids';
import type { Command } from './commands/kinds';
import type { CommandResult } from './commands/apply';
import type { Actor } from './commands/shared';

/** Requests and gifts, and an allowance: whole dollars up to this. */
export const POOL_AMOUNT_MAX = 10_000_000;
/** A request's "What for?" (optional). */
export const ASK_NOTE_MAX = 60;
/** Open requests per member (ADR-0050 decision 4). */
export const MAX_ASKS_EACH = 3;

/** The pool's own commands (they need an actor: a shared shop). */
export const POOL_KINDS: ReadonlySet<string> = new Set(['askMoney', 'cancelAsk', 'answerAsk', 'giveMoney', 'setSpending', 'setApprover']);
/** Care: every tier may, whatever it costs (decision 2). */
export const CARE_KINDS: ReadonlySet<string> = new Set(['feedTank', 'waterChange', 'topOff', 'cleanTank', 'dose', 'repairEquipment']);
/** They keep spending after (wages, the stock manager's orders): for members who spend freely (decision 2). */
export const RUNNING_COST_KINDS: ReadonlySet<string> = new Set(['hireStaff', 'fireStaff', 'setStockBudget', 'setStockOrders']);

/** The approved refusals (ADR-0050). */
export const RUNNING_COST_TEXT = 'Staff and the stock budget keep spending the pool, so only members who spend freely can change them.';
/** A pool command the screens never offer (someone else's request, a fourth one, a tier of your own): chunk 13's words. */
export const POOL_FAILED_TEXT = 'That didn’t work, and nothing was changed. Please try again.';

const own = <T>(rec: Record<string, T> | undefined, id: string): T | undefined => (rec && Object.hasOwn(rec, id) ? rec[id] : undefined);

export function poolMember(state: GameState, id: string): PoolMember | undefined {
  return own(state.pool?.members, id);
}

/** A member's tier (no record: Spends freely, decision 1). */
export function tierOf(state: GameState, id: string): PoolTier {
  return poolMember(state, id)?.tier ?? 'free';
}

/** Does this member spend the pool freely? */
export const spendsFreely = (state: GameState, actor: { id: string; owner?: boolean }): boolean => !!actor.owner || tierOf(state, actor.id) === 'free';

/** May this member answer requests and give money? */
export const mayApprove = (state: GameState, actor: { id: string; owner?: boolean }): boolean => !!actor.owner || !!poolMember(state, actor.id)?.approve;

/** Their allowance left today: a new game day tops it up to the whole allowance (decision 5). */
export function allowanceLeft(state: GameState, m: PoolMember | undefined): number {
  if (!m || m.tier !== 'allowance') return 0;
  const a = m.allowance ?? 0;
  return m.day === dayIndex(state.clock.hour) ? Math.max(0, Math.min(a, m.left ?? a)) : a;
}

/** What a member can spend now: everything for a free spender, else the allowance left today plus approved money. */
export function canSpend(state: GameState, actor: { id: string; owner?: boolean }): number {
  if (spendsFreely(state, actor)) return Infinity;
  const m = poolMember(state, actor.id);
  return roundCents(allowanceLeft(state, m) + Math.max(0, m?.extra ?? 0));
}

/** The open requests (`by`: only theirs). */
export function openAsks(state: GameState, by?: string): PoolAsk[] {
  const list = state.pool?.asks ?? [];
  return by === undefined ? list : list.filter((a) => a.by === by);
}

/** Requests an approver can answer (not their own). */
export const asksFor = (state: GameState, actor: { id: string; owner?: boolean }): PoolAsk[] => (mayApprove(state, actor) ? openAsks(state).filter((a) => a.by !== actor.id) : []);

/**
 * Take a spend from a member's allowance left today, then their approved money (decision 5). Returns what they couldn't
 * cover (0 when they could): the server refuses that command, so a copy never keeps a member's money below zero.
 */
export function takeSpend(state: GameState, id: string, amount: number): number {
  const m = poolMember(state, id);
  if (!m || m.tier === 'free') return 0;
  let rest = roundCents(amount);
  if (m.tier === 'allowance') {
    const left = allowanceLeft(state, m);
    const use = Math.min(left, rest);
    m.left = roundCents(left - use);
    m.day = dayIndex(state.clock.hour);
    rest = roundCents(rest - use);
  }
  if (rest > 0 && (m.extra ?? 0) > 0) {
    const use = Math.min(m.extra!, rest);
    const extra = roundCents(m.extra! - use);
    if (extra > 0) m.extra = extra;
    else delete m.extra;
    rest = roundCents(rest - use);
  }
  return Math.max(0, rest);
}

/**
 * Staff and the stock budget, for a member who doesn't spend freely: refused before anything else is checked (they
 * may not, whatever has changed since), on every copy, with the approved words. Null: the tier allows it.
 */
export function tierRefusal(state: GameState, cmd: Command, actor: Actor): CommandResult | null {
  return RUNNING_COST_KINDS.has(cmd.k) && !spendsFreely(state, actor) ? { ok: false, message: RUNNING_COST_TEXT } : null;
}

/**
 * A member's command, with the pool's limits (applyCommand calls this for every command that isn't the pool's own,
 * inside first one wins): what a member who doesn't spend freely buys is taken from their money, and `overspend` when
 * it was more than they had.
 */
export function spendAs(state: GameState, cmd: Command, actor: Actor, run: () => CommandResult): CommandResult {
  if (spendsFreely(state, actor) || CARE_KINDS.has(cmd.k)) return run();
  const before = state.finance.money;
  const res = run();
  const spent = roundCents(before - state.finance.money);
  if (!(spent > 0)) return res;
  const can = canSpend(state, actor);
  return takeSpend(state, actor.id, spent) > 0 ? { ...res, overspend: { cost: spent, can } } : res;
}

// ───────────────────────────── the pool's own commands ─────────────────────────────

type PoolCommand = Extract<Command, { k: 'askMoney' | 'cancelAsk' | 'answerAsk' | 'giveMoney' | 'setSpending' | 'setApprover' }>;

export const isPoolCommand = (cmd: Command): cmd is PoolCommand => POOL_KINDS.has(cmd.k);

const fail = (): CommandResult => ({ ok: false, message: POOL_FAILED_TEXT });
const okAmount = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= POOL_AMOUNT_MAX;
const money = (n: number): string => fmtMoney(n);
/** "Prismatic betta" → "Prismatic betta."; a note that ends a sentence itself keeps its own mark. */
const sentence = (s: string): string => (/[.!?…]$/.test(s) ? s : `${s}.`);

/** The approved lines (ADR-0050 decision 6): each is its command's alerts line, the name in front. */
export const POOL_LINES = {
  asked: (amount: number, note?: string) => (note ? `Asked for ${money(amount)}: ${sentence(note)}` : `Asked for ${money(amount)}.`),
  approved: (name: string, amount: number) => `Approved ${name}’s ${money(amount)}.`,
  declined: (name: string, amount: number) => `Declined ${name}’s request for ${money(amount)}.`,
  gave: (name: string, amount: number) => `Gave ${name} ${money(amount)} to spend.`,
  cancelled: (amount: number) => `Cancelled the request for ${money(amount)}.`,
  free: (name: string) => `Set ${name} to spend freely.`,
  allowance: (name: string, amount: number) => `Set ${name}’s allowance to ${money(amount)} a game day.`,
  ask: (name: string) => `Set ${name} to ask first.`,
  approver: (name: string) => `Let ${name} approve requests.`,
  notApprover: (name: string) => `${name} can no longer approve requests.`,
} as const;

/** A member's record, made when it's first needed (a member with none spends freely). */
function recordOf(state: GameState, id: string, name: string): PoolMember {
  const pool = (state.pool ??= {});
  const members = (pool.members ??= {});
  return own(members, id) ?? (members[id] = { name, tier: 'free' });
}

/** A record that says nothing a missing one wouldn't is removed, and so is an empty pool (no `undefined` kept). */
function tidy(state: GameState, id?: string): void {
  const pool = state.pool;
  if (!pool) return;
  if (id !== undefined && pool.members) {
    const m = own(pool.members, id);
    if (m && m.tier === 'free' && !m.approve && !(m.extra! > 0)) delete pool.members[id];
  }
  if (pool.members && !Object.keys(pool.members).length) delete pool.members;
  if (pool.asks && !pool.asks.length) delete pool.asks;
  if (!pool.members && !pool.asks) delete state.pool;
}

function removeAsk(state: GameState, askId: string): PoolAsk | undefined {
  const list = state.pool?.asks;
  const i = list ? list.findIndex((a) => a.id === askId) : -1;
  if (i < 0) return undefined;
  const [a] = list!.splice(i, 1);
  return a;
}

/** Run one of the pool's commands for its sender (first one wins has already checked the request is still open). */
export function applyPoolCommand(state: GameState, cmd: PoolCommand, actor: Actor): CommandResult {
  switch (cmd.k) {
    case 'askMoney': {
      if (spendsFreely(state, actor) || !okAmount(cmd.amount) || openAsks(state, actor.id).length >= MAX_ASKS_EACH) return fail();
      const note = (cmd.note ?? '').trim().slice(0, ASK_NOTE_MAX);
      const ask: PoolAsk = { id: nextId(state, 'ask'), by: actor.id, name: actor.name, amount: cmd.amount, hour: state.clock.hour };
      if (note) ask.note = note;
      ((state.pool ??= {}).asks ??= []).push(ask);
      return { ok: true, message: POOL_LINES.asked(ask.amount, ask.note) };
    }
    case 'cancelAsk': {
      const a = openAsks(state).find((x) => x.id === cmd.ask);
      if (!a || a.by !== actor.id) return fail();
      removeAsk(state, a.id);
      tidy(state);
      return { ok: true, message: POOL_LINES.cancelled(a.amount), pool: { member: a.by, amount: a.amount } };
    }
    case 'answerAsk': {
      const a = openAsks(state).find((x) => x.id === cmd.ask);
      if (!a || a.by === actor.id || !mayApprove(state, actor)) return fail();
      removeAsk(state, a.id);
      if (cmd.yes) {
        const m = recordOf(state, a.by, a.name);
        m.extra = roundCents((m.extra ?? 0) + a.amount);
      }
      tidy(state, a.by);
      const message = cmd.yes ? POOL_LINES.approved(a.name, a.amount) : POOL_LINES.declined(a.name, a.amount);
      return { ok: true, message, pool: { member: a.by, amount: a.amount, yes: cmd.yes } };
    }
    case 'giveMoney': {
      if (cmd.member === actor.id || !mayApprove(state, actor) || !okAmount(cmd.amount) || !cmd.name.trim()) return fail();
      const m = recordOf(state, cmd.member, cmd.name);
      m.name = cmd.name;
      m.extra = roundCents((m.extra ?? 0) + cmd.amount);
      return { ok: true, message: POOL_LINES.gave(cmd.name, cmd.amount), pool: { member: cmd.member, amount: cmd.amount } };
    }
    case 'setSpending': {
      if (!actor.owner || cmd.member === actor.id || !cmd.name.trim()) return fail();
      if (cmd.tier === 'allowance' && !(cmd.allowance !== undefined && okAmount(cmd.allowance))) return fail();
      const m = recordOf(state, cmd.member, cmd.name);
      m.name = cmd.name;
      m.tier = cmd.tier;
      if (cmd.tier === 'allowance') {
        // a new amount starts whole today
        m.allowance = cmd.allowance!;
        m.left = cmd.allowance!;
        m.day = dayIndex(state.clock.hour);
      } else {
        delete m.allowance;
        delete m.left;
        delete m.day;
      }
      const message = cmd.tier === 'free' ? POOL_LINES.free(cmd.name) : cmd.tier === 'allowance' ? POOL_LINES.allowance(cmd.name, cmd.allowance!) : POOL_LINES.ask(cmd.name);
      tidy(state, cmd.member);
      return { ok: true, message, pool: { member: cmd.member } };
    }
    case 'setApprover': {
      if (!actor.owner || cmd.member === actor.id || !cmd.name.trim()) return fail();
      const m = recordOf(state, cmd.member, cmd.name);
      m.name = cmd.name;
      if (cmd.on) m.approve = true;
      else delete m.approve;
      tidy(state, cmd.member);
      return { ok: true, message: cmd.on ? POOL_LINES.approver(cmd.name) : POOL_LINES.notApprover(cmd.name), pool: { member: cmd.member } };
    }
  }
}
