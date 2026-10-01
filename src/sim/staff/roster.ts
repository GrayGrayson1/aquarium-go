/**
 * Hiring, firing, assignments, the candidate pool, wages and skill growth. OWNER: lane "staff".
 * Every player action returns an ActionResult the UI can toast.
 */
import type { GameState, StaffMember, StaffRole, StaffTrait, Tank } from '@/types';
import type { ActionResult } from '../care';
import type { Rng } from '../rng';
import { emitEvent } from '../context';
import { HOURS_PER_DAY } from '../time';
import { spend } from '../economy';
import { getFacilityLevel } from '@/data/facilities';
import { AQUARIUM_CLUB } from '@/data/buyers';
import {
  STAFF_FIRST_NAMES,
  STAFF_LAST_NAMES,
  STAFF_NOTICE_DAYS,
  STAFF_POOL_REFRESH_DAYS,
  STAFF_POOL_SIZE,
  STAFF_ROLES,
  STAFF_ROLE_ORDER,
  STAFF_TRAITS,
  STAFF_XP_PER_LEVEL,
  STOCK_BUDGET,
  skillStars,
  staffWage,
} from '@/data/staff';
import { clamp, displayTankIds, ensureStaff, firstName, fitsIn, fmt$, nextStaffId, roleLabel, staffCapacity, staffLoad, staffUnlocked, tankLoad, totals, withStaffRng } from './common';

const fail = (message: string): ActionResult => ({ ok: false, message });

// ───────────────────────────── candidate pool ─────────────────────────────

const TRAITS_BY_ROLE: Record<StaffRole, StaffTrait[]> = { aquarist: [], stock_manager: [], docent: [] };
for (const t of Object.values(STAFF_TRAITS)) for (const r of t.roles) TRAITS_BY_ROLE[r].push(t.id);

function uniqueName(state: GameState, rng: Rng): string {
  const taken = new Set([...(state.staff?.roster ?? []), ...(state.staff?.candidates ?? [])].map((m) => m.name.split(' ')[0]));
  for (let i = 0; i < 12; i++) {
    const first = rng.pick(STAFF_FIRST_NAMES);
    if (taken.has(first) && i < 11) continue;
    return `${first} ${rng.pick(STAFF_LAST_NAMES)}`;
  }
  return `${rng.pick(STAFF_FIRST_NAMES)} ${rng.pick(STAFF_LAST_NAMES)}`;
}

function makeCandidate(state: GameState, rng: Rng, role: StaffRole, hour: number): StaffMember {
  const st = ensureStaff(state);
  const order = getFacilityLevel(state.facility.level)?.order ?? 1;
  // Bigger venues attract more experienced people: mostly ★–★★ at the shop, ★★★–★★★★ at the grand hall.
  const skill = clamp(Math.round(0.65 + order * 0.55 + rng.gauss() * 0.7), 1, 5);
  const trait = rng.pick(TRAITS_BY_ROLE[role]);
  return {
    id: nextStaffId(st),
    name: uniqueName(state, rng),
    role,
    skill,
    trait,
    wage: staffWage(role, skill),
    avatarSeed: rng.int(1, 2 ** 30),
    hiredHour: hour,
    xp: 0,
    tankIds: [],
  };
}

/** Next 8 AM at least `days` days from now. */
function poolHourAfter(hour: number, days: number): number {
  const t = hour + days * HOURS_PER_DAY;
  return Math.floor(t / HOURS_PER_DAY) * HOURS_PER_DAY + 8 + (t % HOURS_PER_DAY > 8 ? HOURS_PER_DAY : 0);
}

/** Replace the hiring pool (deterministic, staff RNG). Always offers an aquarist, a docent once visitors come, and a stock manager if you have none. */
export function refreshCandidates(state: GameState, hour = state.clock.hour): void {
  const st = ensureStaff(state);
  const size = STAFF_POOL_SIZE[state.facility.level] ?? 3;
  const haveStock = st.roster.some((m) => m.role === 'stock_manager');
  st.candidates = [];
  withStaffRng(st, (rng) => {
    const roles: StaffRole[] = ['aquarist'];
    if (!haveStock) roles.push('stock_manager');
    roles.push('docent');
    while (roles.length < size) roles.push(rng.chance(0.55) ? 'aquarist' : !haveStock && rng.chance(0.25) ? 'stock_manager' : 'docent');
    for (const role of roles.slice(0, Math.max(size, 1))) st.candidates.push(makeCandidate(state, rng, role, hour));
  });
  st.nextPoolHour = poolHourAfter(hour, STAFF_POOL_REFRESH_DAYS);
}

// ───────────────────────────── hire / fire ─────────────────────────────

export function canHire(state: GameState, c: StaffMember): { ok: boolean; reason?: string } {
  if (!staffUnlocked(state)) return { ok: false, reason: 'Staff can be hired once you move into a specialty shop.' };
  const st = state.staff;
  const cap = staffCapacity(state);
  if ((st?.roster.length ?? 0) >= cap) return { ok: false, reason: `Your ${getFacilityLevel(state.facility.level).name.toLowerCase()} has room for ${cap} staff. Expand the venue for more.` };
  const max = STAFF_ROLES[c.role].max;
  if (max !== undefined && (st?.roster.filter((m) => m.role === c.role).length ?? 0) >= max) return { ok: false, reason: `You already have a ${roleLabel(c.role).toLowerCase()} — one is all a venue needs.` };
  return { ok: true };
}

export function hireStaff(state: GameState, candidateId: string): ActionResult {
  const st = ensureStaff(state);
  const idx = st.candidates.findIndex((c) => c.id === candidateId);
  if (idx < 0) return fail('That candidate has taken another job.');
  const c = st.candidates[idx];
  const check = canHire(state, c);
  if (!check.ok) return fail(check.reason ?? 'You can’t hire right now.');
  st.candidates.splice(idx, 1);
  const hour = state.clock.hour;
  const m: StaffMember = { ...c, hiredHour: hour, xp: 0, tankIds: [], unpaidDays: 0 };
  st.roster.push(m);
  let extra = '';
  if (m.role === 'aquarist') {
    const got = autoAssignOne(state, m);
    extra = got.length ? ` ${firstName(m)} will look after ${listTanks(state, got)}.` : ' Assign tanks to start their rounds.';
  } else if (m.role === 'docent') {
    const got = autoAssignOne(state, m);
    extra = got.length ? ` ${firstName(m)} will present ${listTanks(state, got)}.` : '';
    if (!state.facility.openToPublic) extra += ' Talks start once your doors are open.';
  } else {
    extra = ` Daily stock budget: ${fmt$(st.stockBudget)} (change it any time).`;
  }
  for (const id of state.tankOrder) st.care[id] ??= {};
  emitEvent(state, { kind: 'celebrate', text: `${m.name} joined your team as ${aOrAn(roleLabel(m.role))} ${roleLabel(m.role).toLowerCase()} (${skillStars(m.skill)}, ${fmt$(m.wage)}/day).${extra}` });
  return { ok: true, message: `Welcome aboard, ${firstName(m)}!${extra}` };
}

function aOrAn(w: string): string {
  return /^[aeiou]/i.test(w) ? 'an' : 'a';
}

function listTanks(state: GameState, ids: string[]): string {
  const names = ids.map((id) => state.tanks[id]?.name).filter(Boolean) as string[];
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

/** Let someone go. They leave with a day's pay if you can afford it; their tanks return to your care. */
export function fireStaff(state: GameState, staffId: string): ActionResult {
  const st = state.staff;
  const idx = st?.roster.findIndex((m) => m.id === staffId) ?? -1;
  if (!st || idx < 0) return fail('That person no longer works here.');
  const m = st.roster[idx];
  const paid = spend(state, m.wage, 'operating', `Wages — ${m.name}: final day’s pay`);
  st.roster.splice(idx, 1);
  noteDeparture(state, m, 'fired');
  const tanks = m.role === 'aquarist' && m.tankIds.length ? ` ${listTanks(state, m.tankIds)} ${m.tankIds.length === 1 ? 'is' : 'are'} back in your hands.` : '';
  emitEvent(state, { kind: 'info', text: `${m.name} has left the team${paid ? ' with a final day’s pay' : ''}.${tanks}` });
  return { ok: true, message: `${firstName(m)} has moved on.${tanks}` };
}

function noteDeparture(state: GameState, m: StaffMember, reason: 'fired' | 'unpaid'): void {
  const st = ensureStaff(state);
  st.departed ??= [];
  st.departed.push({ name: m.name, role: m.role, hour: state.clock.hour, reason });
  if (st.departed.length > 8) st.departed.splice(0, st.departed.length - 8);
}

// ───────────────────────────── assignments ─────────────────────────────

/** Give an aquarist the unassigned tanks that fit (largest first); docents get the most popular uncovered exhibits. */
function autoAssignOne(state: GameState, m: StaffMember): string[] {
  const st = ensureStaff(state);
  const got: string[] = [];
  if (m.role === 'aquarist') {
    const taken = new Set(st.roster.filter((x) => x.role === 'aquarist').flatMap((x) => x.tankIds));
    const free = state.tankOrder.map((id) => state.tanks[id]).filter((t): t is Tank => !!t && !taken.has(t.id));
    // Occupied tanks first (they need feeding), then by load (big tanks are the hardest to keep up with).
    const occupied = (t: Tank) => Object.values(state.creatures).some((c) => c.tankId === t.id && (c.status === 'alive' || c.status === 'listed'));
    free.sort((a, b) => Number(occupied(b)) - Number(occupied(a)) || tankLoad(b, m) - tankLoad(a, m));
    for (const t of free) {
      if (!fitsIn(state, m, t)) continue;
      m.tankIds.push(t.id);
      got.push(t.id);
    }
  } else if (m.role === 'docent') {
    const covered = new Set(st.roster.filter((x) => x.role === 'docent' && x.id !== m.id).flatMap((x) => x.tankIds));
    const ids = displayTankIds(state).sort((a, b) => popularity(state, b) - popularity(state, a));
    for (const id of [...ids.filter((x) => !covered.has(x)), ...ids.filter((x) => covered.has(x))]) {
      if (m.tankIds.includes(id) || !fitsIn(state, m, state.tanks[id])) continue;
      m.tankIds.push(id);
      got.push(id);
    }
  }
  return got;
}

function popularity(state: GameState, id: string): number {
  return (state.visitors.exhibit[id]?.popularity ?? 50) + (state.tanks[id]?.cache?.exhibitScore ?? 40);
}

/** Put a tank in (on) or take it out of (off) someone's care. One aquarist per tank; moving a tank takes it from the other. */
export function assignTank(state: GameState, staffId: string, tankId: string, on: boolean): ActionResult {
  const st = state.staff;
  const m = st?.roster.find((x) => x.id === staffId);
  const tank = state.tanks[tankId];
  if (!st || !m) return fail('That person no longer works here.');
  if (!tank) return fail('That tank no longer exists.');
  if (m.role === 'stock_manager') return fail('The stock manager looks after supplies, not tanks.');
  st.care[tankId] ??= {};
  if (!on) {
    m.tankIds = m.tankIds.filter((id) => id !== tankId);
    return { ok: true, message: m.role === 'aquarist' ? `${tank.name} is back in your hands.` : `${firstName(m)} will stop presenting ${tank.name}.` };
  }
  if (m.tankIds.includes(tankId)) return { ok: true, message: `${firstName(m)} already looks after ${tank.name}.` };
  if (!fitsIn(state, m, tank)) {
    return fail(
      m.role === 'aquarist'
        ? `${firstName(m)}’s rounds are full — ${tank.name} would be too much. Unassign a tank, or hire another aquarist.`
        : `${firstName(m)} already presents as many exhibits as they can.`,
    );
  }
  let from = '';
  if (m.role === 'aquarist') {
    for (const o of st.roster) {
      if (o.id !== m.id && o.role === 'aquarist' && o.tankIds.includes(tankId)) {
        o.tankIds = o.tankIds.filter((id) => id !== tankId);
        from = ` (from ${firstName(o)})`;
      }
    }
  }
  m.tankIds.push(tankId);
  return { ok: true, message: m.role === 'aquarist' ? `${firstName(m)} now looks after ${tank.name}${from}.` : `${firstName(m)} will present ${tank.name}.` };
}

/** Re-balance: every aquarist keeps their tanks where they still fit, then uncovered tanks go to whoever has room. */
export function autoAssignAll(state: GameState): ActionResult {
  const st = state.staff;
  if (!st?.roster.length) return fail('Hire someone first.');
  let added = 0;
  // Aquarists: uncovered tanks (occupied first, biggest first) each go to whoever has the most room left, so the
  // work is shared rather than piled on the first keeper.
  const keepers = st.roster.filter((m) => m.role === 'aquarist');
  if (keepers.length) {
    const taken = new Set(keepers.flatMap((m) => m.tankIds));
    const occupied = (t: Tank) => Object.values(state.creatures).some((c) => c.tankId === t.id && (c.status === 'alive' || c.status === 'listed'));
    const free = state.tankOrder.map((id) => state.tanks[id]).filter((t): t is Tank => !!t && !taken.has(t.id));
    free.sort((a, b) => Number(occupied(b)) - Number(occupied(a)) || tankLoad(b) - tankLoad(a));
    for (const t of free) {
      let best: StaffMember | null = null;
      let bestRoom = -Infinity;
      for (const m of keepers) {
        if (!fitsIn(state, m, t)) continue;
        const { used, capacity } = staffLoad(state, m);
        const room = 1 - used / Math.max(0.01, capacity);
        if (room > bestRoom) {
          bestRoom = room;
          best = m;
        }
      }
      if (best) {
        best.tankIds.push(t.id);
        added++;
      }
    }
  }
  for (const m of st.roster.filter((x) => x.role === 'docent').sort((a, b) => b.skill - a.skill)) added += autoAssignOne(state, m).length;
  const uncovered = state.tankOrder.filter((id) => state.tanks[id] && !st.roster.some((m) => m.role === 'aquarist' && m.tankIds.includes(id)));
  const aquarists = st.roster.some((m) => m.role === 'aquarist');
  const tail = aquarists && uncovered.length ? ` ${uncovered.length} tank${uncovered.length === 1 ? ' is' : 's are'} still yours to look after — the team is at capacity.` : '';
  return { ok: true, message: added ? `Shared out ${added} assignment${added === 1 ? '' : 's'}.${tail}` : `Everyone already has a full plate.${tail}` };
}

export function setStockBudget(state: GameState, amount: number): ActionResult {
  const st = ensureStaff(state);
  const max = STOCK_BUDGET[state.facility.level]?.max ?? 300;
  const v = clamp(Math.round(Number.isFinite(amount) ? amount : st.stockBudget), 0, max);
  st.stockBudget = v;
  return { ok: true, message: v === 0 ? 'Stock orders paused.' : `Stock budget set to ${fmt$(v)} a day.` };
}

/** Keep assignments honest: drop tanks that were sold or removed, auto-assign brand-new tanks to keepers with room. */
export function tidyAssignments(state: GameState): void {
  const st = state.staff;
  if (!st) return;
  for (const m of st.roster) if (m.tankIds.some((id) => !state.tanks[id])) m.tankIds = m.tankIds.filter((id) => state.tanks[id]);
  for (const id of Object.keys(st.care)) if (!state.tanks[id]) delete st.care[id];
  // New tanks (never seen by the team) go to an aquarist with room; tanks the player unassigned stay theirs.
  const fresh = state.tankOrder.filter((id) => state.tanks[id] && !st.care[id]);
  if (!fresh.length) return;
  for (const id of fresh) {
    st.care[id] = {};
    const tank = state.tanks[id];
    const keeper = st.roster
      .filter((m) => m.role === 'aquarist' && fitsIn(state, m, tank))
      .sort((a, b) => b.skill - a.skill || a.tankIds.length - b.tankIds.length)[0];
    if (keeper) keeper.tankIds.push(id);
    // lane:staff (S05-05) — docents only reach the exhibits they present, so a new display tank joins the round of the
    // docent with the lightest load
    if ((tank.purpose ?? 'display') === 'display') {
      const docent = st.roster.filter((m) => m.role === 'docent' && fitsIn(state, m, tank)).sort((a, b) => a.tankIds.length - b.tankIds.length || b.skill - a.skill)[0];
      if (docent) docent.tankIds.push(id);
    }
  }
}

// ───────────────────────────── wages, experience, notice ─────────────────────────────

/**
 * Midnight: pay everyone (animal care first), grow experience, and handle unpaid notice. Called from the finance
 * step's nightly bills so wages land in the same day's ledger and summary. Wages never create debt: someone who can't
 * be paid keeps working through their notice and leaves after STAFF_NOTICE_DAYS unpaid midnights.
 */
function planPayroll(state: GameState, st: NonNullable<GameState['staff']>): { paid: { m: StaffMember; amount: number }[]; unpaid: StaffMember[] } {
  const hour = state.clock.hour;
  const priority = (r: StaffRole) => STAFF_ROLE_ORDER.indexOf(r);
  const order = [...st.roster].sort((a, b) => priority(a.role) - priority(b.role) || a.hiredHour - b.hiredHour);
  const paid: { m: StaffMember; amount: number }[] = [];
  const unpaid: StaffMember[] = [];
  let budget = Math.max(0, state.finance.money);
  for (const m of order) {
    // The first day is paid pro rata.
    const share = clamp((hour - m.hiredHour) / HOURS_PER_DAY, 0, 1);
    const amount = Math.round(Math.max(0, m.wage) * share * 100) / 100;
    if (amount <= 0) continue;
    if (budget + 1e-6 >= amount) {
      budget -= amount;
      paid.push({ m, amount });
    } else unpaid.push(m);
  }
  return { paid, unpaid };
}

/**
 * Would tonight's payday cost the player someone on their last notice day? The finance step asks this before payday
 * so the club's loan can pay the team even when the cash ran short of wages before it ran into the red (G2-03).
 */
export function staffLeavingTonight(state: GameState): boolean {
  const st = state.staff;
  if (!st || !st.roster.length || state.isShowcase) return false;
  return planPayroll(state, st).unpaid.some((m) => (m.unpaidDays ?? 0) + 1 >= STAFF_NOTICE_DAYS);
}

export function payStaff(state: GameState): void {
  const st = state.staff;
  if (!st || !st.roster.length || state.isShowcase) return;
  const hour = state.clock.hour;
  const { paid, unpaid } = planPayroll(state, st);
  const total = Math.round(paid.reduce((a, p) => a + p.amount, 0) * 100) / 100;
  if (total > 0) {
    const names = paid.map((p) => firstName(p.m));
    const memo = paid.length <= 3 ? `Wages — ${paid.map((p) => `${firstName(p.m)} (${roleLabel(p.m.role).toLowerCase()})`).join(', ')}` : `Wages — ${paid.length} staff (${names.slice(0, 3).join(', ')} and ${paid.length - 3} more)`;
    if (!spend(state, total, 'operating', memo)) for (const p of paid) unpaid.push(p.m);
    else for (const p of paid) p.m.unpaidDays = 0;
  }
  for (const m of unpaid) {
    m.unpaidDays = (m.unpaidDays ?? 0) + 1;
    if (m.unpaidDays >= STAFF_NOTICE_DAYS) {
      st.roster = st.roster.filter((x) => x.id !== m.id);
      noteDeparture(state, m, 'unpaid');
      const tanks = m.role === 'aquarist' && m.tankIds.length ? ` ${listTanks(state, m.tankIds)} ${m.tankIds.length === 1 ? 'is' : 'are'} back in your hands — feed and clean them yourself until you can rehire.` : '';
      emitEvent(state, { kind: 'warning', text: `${m.name} has left: their wages went unpaid for ${STAFF_NOTICE_DAYS} days. No hard feelings.${tanks}`, toast: true });
    } else if (m.unpaidDays === 1) {
      emitEvent(state, {
        kind: 'warning',
        text: `There wasn’t enough cash to pay ${m.name} (${fmt$(m.wage)}). ${firstName(m)} will keep working for now, but will leave after ${STAFF_NOTICE_DAYS} unpaid days${state.finance.loan ? '' : ` — if the red ink lasts, ${AQUARIUM_CLUB} may step in before then`}.`,
        toast: true,
      });
    }
  }
  // Experience: a day on the job, a little faster for quick learners; skill rises slowly (and so does the wage).
  for (const m of st.roster) {
    const share = clamp((hour - m.hiredHour) / HOURS_PER_DAY, 0, 1);
    if (share <= 0) continue;
    totals(m).days += 1;
    m.xp = (m.xp ?? 0) + share * (m.trait === 'quick_learner' ? 1.5 : 1);
    const need = STAFF_XP_PER_LEVEL * m.skill;
    if (m.skill < 5 && m.xp >= need) {
      m.xp -= need;
      m.skill += 1;
      m.wage = staffWage(m.role, m.skill);
      const perk = m.role === 'aquarist' ? 'room for more tanks' : m.role === 'docent' ? 'livelier talks that reach more exhibits' : 'sharper stock planning';
      emitEvent(state, { kind: 'celebrate', text: `${m.name} has grown into a ${skillStars(m.skill)} ${roleLabel(m.role).toLowerCase()}: ${perk}. Their wage is now ${fmt$(m.wage)}/day.` });
    }
  }
}

/**
 * Fixtures / tests / dev: put someone straight on the roster (no pool, no capacity check) and auto-assign them.
 * Deterministic for the given fields.
 */
export function addStaffDirect(state: GameState, spec: { name: string; role: StaffRole; skill: number; trait: StaffTrait; avatarSeed?: number; tankIds?: string[] }): StaffMember {
  const st = ensureStaff(state);
  const m: StaffMember = {
    id: nextStaffId(st),
    name: spec.name,
    role: spec.role,
    skill: clamp(Math.round(spec.skill), 1, 5),
    trait: spec.trait,
    wage: staffWage(spec.role, spec.skill),
    avatarSeed: spec.avatarSeed ?? 1000 + st.seq * 7919,
    hiredHour: state.clock.hour - HOURS_PER_DAY,
    xp: 0,
    tankIds: [],
    unpaidDays: 0,
  };
  st.roster.push(m);
  if (spec.tankIds) m.tankIds = spec.tankIds.filter((id) => state.tanks[id]);
  else autoAssignOne(state, m);
  for (const id of state.tankOrder) st.care[id] ??= {};
  return m;
}
