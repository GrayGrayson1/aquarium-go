/**
 * Staff shared helpers: lazy state, the staff RNG stream, daily records and read-only queries. OWNER: lane "staff".
 * Pure over GameState (Immer drafts); no React / three.
 */
import type { GameState, StaffDay, StaffMember, StaffRole, StaffState, Tank } from '@/types';
import { mulberry32, type Rng } from '../rng';
import { dayOf } from '../time';
import { getFacilityLevel } from '@/data/facilities';
import { getTankTier } from '@/data/catalog/tanks';
import { STAFF_CAPACITY, STAFF_ROLES, STOCK_BUDGET, aquaristCapacity, docentReach, tankCareUnits } from '@/data/staff';

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const fmt$ = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
export const firstName = (m: Pick<StaffMember, 'name'>) => m.name.split(' ')[0] || m.name;
export const roleLabel = (r: StaffRole) => STAFF_ROLES[r]?.label ?? r;

/** Cap on the feed / talk rings kept in the save. */
export const FEED_RING = 16;
export const TALK_RING = 12;

/** True once the 'staff' unlock is earned (specialty shop onwards). */
export function staffUnlocked(state: GameState): boolean {
  return !state.isShowcase && (state.progress?.unlocked ?? []).includes('staff');
}

/** Staff state, created on first use (old saves have none). Never call on a showcase world. */
export function ensureStaff(state: GameState): StaffState {
  if (!state.staff) {
    const lvl = state.facility?.level ?? 'specialty_shop';
    state.staff = {
      roster: [],
      candidates: [],
      nextPoolHour: -1,
      seq: 0,
      rng: ((state.seed ?? 1) ^ 0x5eed57af) >>> 0,
      stockBudget: STOCK_BUDGET[lvl]?.default ?? 60,
      stockSpent: { day: 0, amount: 0 },
      feeds: [],
      talks: [],
      care: {},
      warned: {},
    };
  }
  const st = state.staff;
  // Defensive defaults for hand-edited / partial saves.
  st.roster ??= [];
  st.candidates ??= [];
  st.feeds ??= [];
  st.talks ??= [];
  st.care ??= {};
  st.warned ??= {};
  st.stockSpent ??= { day: 0, amount: 0 };
  if (!Number.isFinite(st.stockBudget)) st.stockBudget = 60;
  if (!Number.isFinite(st.seq)) st.seq = 0;
  if (!Number.isFinite(st.rng)) st.rng = ((state.seed ?? 1) ^ 0x5eed57af) >>> 0;
  return st;
}

/** Run `fn` with the staff's own deterministic RNG stream (never touches state.rngState). */
export function withStaffRng<T>(st: StaffState, fn: (rng: Rng) => T): T {
  const r = mulberry32(st.rng >>> 0);
  try {
    return fn(r);
  } finally {
    st.rng = r.state();
  }
}

export function nextStaffId(st: StaffState): string {
  st.seq = (st.seq ?? 0) + 1;
  return `stf_${st.seq.toString(36)}`;
}

/** Today's record for a staff member (a fresh one when the day has changed). */
export function dayRecord(state: GameState, m: StaffMember): StaffDay {
  const day = dayOf(state.clock.hour);
  if (!m.today || m.today.day !== day) m.today = { day, feeds: 0, tanksFed: [], waterChanges: 0, cleanings: 0, topOffs: 0, orders: 0, spent: 0, talks: 0, issues: [] };
  return m.today;
}

export function totals(m: StaffMember): NonNullable<StaffMember['totals']> {
  return (m.totals ??= { feeds: 0, waterChanges: 0, cleanings: 0, orders: 0, spent: 0, talks: 0, days: 0 });
}

export function noteIssue(day: StaffDay, text: string): void {
  if (!day.issues.includes(text)) day.issues.push(text);
  if (day.issues.length > 6) day.issues.splice(0, day.issues.length - 6);
}

// ───────────────────────────── queries (UI + render) ─────────────────────────────

/** Most staff this facility level can employ. */
export function staffCapacity(state: GameState): number {
  return STAFF_CAPACITY[state.facility?.level ?? 'hobby_room'] ?? 0;
}

export function rosterOf(state: GameState, role?: StaffRole): StaffMember[] {
  const r = state.staff?.roster ?? [];
  return role ? r.filter((m) => m.role === role) : r;
}

/** The aquarist caring for a tank (null = the player looks after it). */
export function keeperOf(state: GameState, tankId: string): StaffMember | null {
  for (const m of state.staff?.roster ?? []) if (m.role === 'aquarist' && m.tankIds.includes(tankId)) return m;
  return null;
}

/** Docents presenting an exhibit. */
export function docentsAt(state: GameState, tankId: string): StaffMember[] {
  return (state.staff?.roster ?? []).filter((m) => m.role === 'docent' && m.tankIds.includes(tankId));
}

export function tankGallons(tank: Tank): number {
  try {
    return getTankTier(tank.tierId)?.gallons ?? 20;
  } catch {
    return 20;
  }
}

/** Care load a tank puts on this aquarist (tank units, see src/data/staff.ts). */
export function tankLoad(tank: Tank, m?: Pick<StaffMember, 'trait'>): number {
  return tankCareUnits(tankGallons(tank), tank.environment === 'marine', m?.trait);
}

/** How full someone's schedule is: aquarists in tank units, docents in exhibits. */
export function staffLoad(state: GameState, m: StaffMember): { used: number; capacity: number } {
  if (m.role === 'aquarist') {
    let used = 0;
    for (const id of m.tankIds) {
      const t = state.tanks[id];
      if (t) used += tankLoad(t, m);
    }
    return { used: Math.round(used * 100) / 100, capacity: aquaristCapacity(m.skill) };
  }
  if (m.role === 'docent') return { used: m.tankIds.filter((id) => state.tanks[id]).length, capacity: docentReach(m.skill) };
  return { used: 0, capacity: 0 };
}

/** Would this tank fit in the aquarist's / docent's remaining capacity? */
export function fitsIn(state: GameState, m: StaffMember, tank: Tank): boolean {
  const { used, capacity } = staffLoad(state, m);
  if (m.role === 'aquarist') return used + tankLoad(tank, m) <= capacity + 1e-6;
  if (m.role === 'docent') return used + 1 <= capacity;
  return false;
}

/** Total wages per day for everyone on the roster. */
export function staffWagesPerDay(state: GameState): { total: number; count: number; byRole: Record<StaffRole, number> } {
  const byRole: Record<StaffRole, number> = { aquarist: 0, stock_manager: 0, docent: 0 };
  let total = 0;
  for (const m of state.staff?.roster ?? []) {
    const w = Number.isFinite(m.wage) ? Math.max(0, m.wage) : 0;
    total += w;
    byRole[m.role] = (byRole[m.role] ?? 0) + w;
  }
  return { total: Math.round(total * 100) / 100, count: state.staff?.roster.length ?? 0, byRole };
}

/** Facility level label (for copy). */
export function levelName(state: GameState): string {
  try {
    return getFacilityLevel(state.facility.level).name;
  } catch {
    return 'your venue';
  }
}

/** Display tanks visitors can see (docent coverage is measured against these). */
export function displayTankIds(state: GameState): string[] {
  return state.tankOrder.filter((id) => {
    const t = state.tanks[id];
    return !!t && (t.purpose ?? 'display') === 'display';
  });
}
