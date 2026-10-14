/**
 * What Operations shows besides Problems (DESIGN-S3D §7.1–§7.3; AUTO-039, AUTO-043), as pure functions over the state.
 * OWNER: lane "automation" (chunk 5).
 *
 * - This week: the last seven completed days of `finance.daily` (the nightly summary the Finances panel reads, built
 *   from the same ledger entries), so it matches Finances for those days and the 400-entry ledger cap can't cut it.
 * - Saved this week: the live food the tanks used that the room made, at shop prices, against what making it cost.
 * - Today: the next scheduled jobs (water changes, harvests, salt mixing, the stock manager's checks), in time order.
 * - Where the water goes: a day's use by the changes, the mixer, the top-offs and the hatchery.
 * The UI memoises these on the game hour (PERF-004): they walk tanks and the forecast walks every animal.
 */
import type { GameState } from '@/types';
import { BRINE, FOOD_ROOM, INFUSORIA, WATER_ROOM } from '@/data/catalog/machines';
import { getFoodDef } from '@/data/catalog/foods';
import { crossings, dayOf, hourOfDay } from '../time';
import { nextStockCheck, stockCheckHours, stockManager } from '../staff/work';
import { isHeld } from './hold';
import { batchGal, saltCap } from './reserve';
import { SALT_KG_PER_GAL, batchSaltKg, changerOf, saltWaterNeeded, tankChangeNeed } from './water';

const round2 = (v: number) => Math.round(v * 100) / 100;

export interface WeekMoney {
  /** The days covered (the last seven completed days); null when no day has ended yet. */
  fromDay: number | null;
  toDay: number | null;
  /** Line sales (count and money), "Supplies & upkeep", and the net. */
  sold: number;
  sales: number;
  supplies: number;
  upkeep: number;
  net: number;
  /** Sales by line (lines that sold anything), biggest first. */
  lines: { lineId: string; n: number; amount: number }[];
}

/** This week · Days {a}–{b}: line sales, supplies & upkeep and the net over the last seven completed days. */
export function weekMoney(state: GameState): WeekMoney {
  const days = state.finance.daily.slice(-7);
  const lines = new Map<string, { n: number; amount: number }>();
  let supplies = 0;
  let upkeep = 0;
  for (const d of days) {
    supplies += d.supplies ?? 0;
    upkeep += d.upkeep ?? 0;
    for (const [id, v] of Object.entries(d.lines ?? {})) {
      const l = lines.get(id) ?? { n: 0, amount: 0 };
      l.n += v.n;
      l.amount += v.amount;
      lines.set(id, l);
    }
  }
  const list = [...lines.entries()].map(([lineId, v]) => ({ lineId, n: v.n, amount: round2(v.amount) })).sort((a, b) => b.amount - a.amount || (a.lineId < b.lineId ? -1 : 1));
  const sales = round2(list.reduce((a, l) => a + l.amount, 0));
  const sold = list.reduce((a, l) => a + l.n, 0);
  supplies = round2(supplies);
  upkeep = round2(upkeep);
  return { fromDay: days[0]?.day ?? null, toDay: days[days.length - 1]?.day ?? null, sold, sales, supplies, upkeep, net: round2(sales - supplies - upkeep), lines: list };
}

export interface SavedWeek {
  /** Servings the tanks used that the room made, by food (baby brine, infusoria). */
  used: { foodId: string; servings: number }[];
  /** What buying them would cost, what making them cost, and the difference. */
  shop: number;
  make: number;
  saved: number;
}

/** Saved this week (desktop Feed): counted on what the tanks used of what the room made in the last seven days. */
export function savedThisWeek(state: GameState): SavedWeek {
  const days = (state.automation?.days ?? []).filter((d) => d.day < dayOf(state.clock.hour)).slice(-7);
  const used: { foodId: string; servings: number }[] = [];
  let shop = 0;
  let made = 0;
  let makeCost = 0;
  let usedMade = 0;
  for (const foodId of [BRINE, INFUSORIA]) {
    const u = days.reduce((a, d) => a + (d.used[foodId] ?? 0), 0);
    const m = days.reduce((a, d) => a + (d.made[foodId] ?? 0), 0);
    const n = Math.min(u, m);
    made += m;
    usedMade += n;
    const def = getFoodDef(foodId);
    if (def) shop += (n * def.price) / Math.max(1, def.servingsPerPack);
    used.push({ foodId, servings: n });
  }
  makeCost = days.reduce((a, d) => a + d.makeCost, 0);
  const make = made > 0 ? (makeCost * usedMade) / made : 0;
  return { used, shop: round2(shop), make: round2(make), saved: round2(shop - make) };
}

export interface Flows {
  /** Fresh water a day: the freshwater tanks' changes (and the salt tanks' fresh share), to the mixer, top-offs. */
  fresh: { changes: number; tanks: number; mixer: number; topOff: number; atos: number };
  /** Salt water a day: the salt tanks' changes and the hatchery. */
  salt: { changes: number; tanks: number; hatchery: number };
  /** Salt mix (kg) a day. */
  saltKg: number;
}

/** Where the water goes · a day (Operations › Water): from the tanks' changers now, and yesterday's top-offs. */
export function waterFlows(state: GameState): Flows {
  let freshChanges = 0;
  let freshTanks = 0;
  let saltChanges = 0;
  let saltTanks = 0;
  let atos = 0;
  for (const id of state.tankOrder) {
    const t = state.tanks[id];
    if (!t) continue;
    if ((t.equipment ?? []).some((e) => e.defId === 'ato' && e.on && !e.failed)) atos += 1;
    const need = tankChangeNeed(state, t);
    if (!need) continue;
    freshChanges += need.fresh;
    saltChanges += need.salt;
    if (need.salt > 1e-6) saltTanks += 1;
    else freshTanks += 1;
  }
  const cones = state.facility.food?.cones.length ?? 0;
  const hatchery = cones * FOOD_ROOM.coneSaltGal;
  const salt = saltChanges + hatchery;
  const last = (state.automation?.days ?? []).filter((d) => d.day < dayOf(state.clock.hour)).slice(-1)[0];
  return {
    fresh: { changes: round2(freshChanges), tanks: freshTanks, mixer: round2(salt), topOff: round2(last?.water?.topOff ?? 0), atos },
    salt: { changes: round2(saltChanges), tanks: saltTanks, hatchery: round2(hatchery) },
    saltKg: round2(salt * SALT_KG_PER_GAL),
  };
}

export type JobKind = 'water' | 'mixing' | 'cone' | 'jar' | 'shelves';

export interface ScheduledJob {
  at: number;
  kind: JobKind;
  /** Water: tanks and gallons; mixing: gallons and kg; harvests: the culture's number and servings; shelves: which check. */
  tanks?: number;
  gal?: number;
  kg?: number;
  index?: number;
  servings?: number;
  check?: 'first' | 'second';
  /** The stock manager's name and what the forecast says she'll buy (or why salt won't fit). */
  who?: string;
  buys?: string[];
  saltBlocked?: boolean;
  /** Held by manual mode: it waits until you resume. */
  held?: boolean;
}

/** Today (desktop Overview): the next `n` scheduled jobs from `hour`, over the next day. */
export function todayJobs(state: GameState, n = 4, hour = state.clock.hour): ScheduledJob[] {
  const end = hour + 24;
  const out: ScheduledJob[] = [];
  const water = state.facility.water;
  if (water) {
    const byHour = new Map<number, { tanks: number; gal: number }>();
    for (const id of state.tankOrder) {
      const t = state.tanks[id];
      if (!t || !changerOf(t)) continue;
      const need = tankChangeNeed(state, t);
      for (const at of crossings(hour, end, t.lighting?.onHour ?? 8)) {
        const r = byHour.get(at) ?? { tanks: 0, gal: 0 };
        r.tanks += 1;
        r.gal += (need?.fresh ?? 0) + (need?.salt ?? 0);
        byHour.set(at, r);
      }
    }
    for (const [at, r] of byHour) out.push({ at, kind: 'water', tanks: r.tanks, gal: round2(r.gal), held: isHeld(state, 'water') });
    if (saltWaterNeeded(state)) {
      const gal = batchGal(water);
      for (const h of WATER_ROOM.mixHours)
        for (const at of crossings(hour, end, h)) {
          const due = water.salt < saltCap(water) * WATER_ROOM.mixBelow && !(water.mix && water.mix.gal > 1e-6);
          if (due) out.push({ at, kind: 'mixing', gal, kg: batchSaltKg(gal), held: isHeld(state, 'salt') });
        }
    }
  }
  const food = state.facility.food;
  if (food) {
    const add = (kind: 'cone' | 'jar', list: { startedHour: number | null }[], hours: number, servings: number) =>
      list.forEach((c, i) => {
        if (c.startedHour === null) return;
        const at = Math.max(hour, c.startedHour + hours);
        if (at < end) out.push({ at, kind, index: i + 1, servings, held: isHeld(state, 'food') });
      });
    add('cone', food.cones, FOOD_ROOM.coneHours, FOOD_ROOM.coneYield);
    add('jar', food.jars, FOOD_ROOM.jarHours, FOOD_ROOM.jarYield);
  }
  const m = stockManager(state);
  if (m && !state.staff?.ordersOff) {
    const hours = stockCheckHours(m);
    const f = nextStockCheck(state, hour);
    for (const h of hours)
      for (const at of crossings(hour, end, h)) {
        const first = hourOfDay(at) === Math.min(...hours);
        const next = f && Math.abs(f.at - at) < 1e-6;
        out.push({ at, kind: 'shelves', check: first ? 'first' : 'second', who: m.name, ...(next && f ? { buys: f.plan.buys.map((b) => b.label), saltBlocked: f.plan.overBudget.includes('salt mix') || f.plan.noCash.includes('salt mix') } : {}) });
      }
  }
  const order: Record<JobKind, number> = { water: 0, cone: 1, jar: 2, mixing: 3, shelves: 4 };
  return out.sort((a, b) => a.at - b.at || order[a.kind] - order[b.kind] || (a.index ?? 0) - (b.index ?? 0)).slice(0, n);
}

/** The last hour today's water changes ran (the Water changes tile's "Done {time}"), or null. */
export function lastChangeHour(state: GameState): number | null {
  const today = dayOf(state.clock.hour);
  let last: number | null = null;
  for (const id of state.tankOrder) {
    const h = state.tanks[id]?.water.lab?.lastAutoChangeHour;
    if (typeof h === 'number' && dayOf(h) === today && (last === null || h > last)) last = h;
  }
  return last;
}
