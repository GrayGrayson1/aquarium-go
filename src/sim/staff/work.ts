/**
 * What staff actually do each game day. OWNER: lane "staff".
 *
 *  - Aquarists walk a morning round (8 AM; early birds 7 AM) and an evening round (6 PM) of their tanks. They feed
 *    from the food cupboard with each tank's default portion (the same `feedTank` the player uses, so the numbers are
 *    the sim's), change water when nitrate / ammonia / nitrite is off or a change is due, top off evaporation, scrape
 *    algae and vacuum heavy waste. Meticulous keepers add a midday check for anyone still very hungry.
 *    (lane:staff2) Fast-metabolism tanks get more, smaller meals, as real keepers give them: a 1 PM meal and a 9 PM
 *    snack for discus, chromis, guppies and the like, a 9 PM snack for tetras (`mealsPerDay`). Each meal is sized for
 *    every animal that will actually eat it, and a keeper looks ahead: anyone who'd be very hungry before the next
 *    visit is fed now.
 *    They never breed, move, sell or medicate animals, and a water change is skipped rather than done short of salt.
 *    Keeper care never raises a creature's `life.bond` (only the player's own hand care does) and never counts toward
 *    the player's feed / water-change quests and mastery.
 *  - The stock manager checks the shelves at 9 AM (and 3 PM from skill 3) and reorders foods the animals eat and marine
 *    salt through the normal shop purchases, never spending past the daily budget.
 *  - Docents give short talks at 11 AM, 2 PM and 4 PM while the doors are open; `docentEffect` feeds the visitor sim.
 */
import type { FoodDef, GameState, SpeciesDefinition, StaffMember, Tank } from '@/types';
import { emitEvent } from '../context';
import { hourOfDay, formatClock } from '../time';
import { feedTank, waterChange, waterChangeCost, cleanTank, topOff, setEquipment, dose } from '../care';
import { getWaterReport } from '../water';
import { needsFedFood, fedResidentIndex, foodOutlookAll } from '../tankStatus';
import { HUNGER_PER_HUNGER_HOURS } from '../life/step'; // lane:staff2 — metabolism for meal planning
import { residentsOf } from '../residents'; // lane:staff2 — same order as a creatures scan (perf2's index inside a step)
import { effectiveBioload } from '../water/env';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { buyFood, buySalt, SALT_PRICE_PER_KG } from '../economy';
import { isOpenAt } from '../facility';
import { pushReaction } from '../facility/reactions';
import { findSpecies } from '@/data/species';
import { FOODS, getFoodDef } from '@/data/catalog/foods';
import { STAFF_TRAITS } from '@/data/staff';
import { isSaltClass } from '../water/constants';
import { clamp, dayRecord, displayTankIds, ensureStaff, firstName, fmt$, noteIssue, totals, FEED_RING, TALK_RING } from './common';
import { dayOf } from '../time';

// ───────────────────────────── schedule ─────────────────────────────

export type KeeperRound = 'morning' | 'midday' | 'evening' | 'late';

/** Hour of day each keeper round starts (early birds start an hour earlier in the morning). */
export const ROUND_START: Record<KeeperRound, number> = { morning: 8, midday: 13, evening: 18, late: 21 };
/** Rounds in day order. */
export const ROUND_ORDER: KeeperRound[] = ['morning', 'midday', 'evening', 'late'];
/** Game hours a keeper spends per tank on a round (walk + work) — tanks are visited one after another. */
export const VISIT_HOURS = 0.3;
/** Stock checks. */
export const STOCK_CHECKS = [9, 15];
/** Docent talk times (only while the doors are open) and talk length. */
export const TALK_HOURS = [11, 14, 16];
export const TALK_LENGTH_H = 0.75;

export function roundStart(m: StaffMember, round: KeeperRound): number {
  return ROUND_START[round] - (round === 'morning' && m.trait === 'early_bird' ? 1 : 0);
}

/** Absolute hours in [start, end) whose hour-of-day is `hod` (robust to any window length). */
export function crossings(start: number, end: number, hod: number): number[] {
  const out: number[] = [];
  if (!(end > start)) return out;
  hod = ((hod % 24) + 24) % 24; // lane:staff2 — a long round's last visits run past midnight
  let t = Math.floor(start / 24) * 24 + hod;
  if (t < start - 1e-9) t += 24;
  while (t < end - 1e-9 && out.length < 64) {
    out.push(t);
    t += 24;
  }
  return out;
}

// ── lane:staff2 — meals a day by metabolism ──

/** Hunger points this animal gains per game hour (mirrors the life sim's metabolism, src/sim/life/step.ts). */
export function hungerRate(c: Pick<GameState['creatures'][string], 'lifeStage'>, sp: Pick<SpeciesDefinition, 'hungerHours'>): number {
  const stage = c.lifeStage === 'juvenile' ? 1.25 : c.lifeStage === 'elder' ? 0.85 : 1;
  return (HUNGER_PER_HUNGER_HOURS / Math.max(1, sp.hungerHours)) * stage;
}

/** Animals the keeper feeds in this tank (alive or listed, past the egg, eats fed food or grazes). */
function feedableResidents(state: GameState, tankId: string): { c: GameState['creatures'][string]; sp: SpeciesDefinition }[] {
  const out: { c: GameState['creatures'][string]; sp: SpeciesDefinition }[] = [];
  for (const c of residentsOf(state, tankId)) {
    if (c.lifeStage === 'egg') continue;
    const sp = findSpecies(c.speciesId);
    if (!sp || sp.diet === 'photosynthetic') continue;
    out.push({ c, sp });
  }
  return out;
}

/** Hours from "just fed" to "very hungry" below which a tank gets 4 meals a day, and 3. */
export const FOUR_MEALS_H = 12;
export const THREE_MEALS_H = 15;

/**
 * Meals a day this tank's animals need from their keeper, set by the fastest metabolism among the animals that live
 * on fed food (grazers count while grazing isn't enough for them). An animal goes from a full meal to
 * "very hungry" in about its species' hungerHours (juveniles a quarter sooner), and the night from the 6 PM round to
 * the 8 AM one is 14 hours, so:
 *   hungerHours ≤ 12 (discus, chromis, guppies, firefish, tangs, seahorses): 4 small meals, 8 AM, 1 PM, 6 PM, 9 PM;
 *   hungerHours ≤ 15 (neon and cardinal tetras, white clouds, royal grammas): 3, with a 9 PM snack;
 *   otherwise the usual 2.
 * The day's food is the same, split into more, smaller meals, which is how real keepers feed fast-metabolism fish.
 */
export function mealsPerDay(state: GameState, tankId: string): 2 | 3 | 4 {
  let fastest = Infinity;
  for (const { c, sp } of feedableResidents(state, tankId)) {
    if ((!needsFedFood(sp) && !grazerNeedsFeeding(c, state.clock.hour)) || c.repro?.stage === 'brooding') continue;
    fastest = Math.min(fastest, HUNGER_PER_HUNGER_HOURS / hungerRate(c, sp));
  }
  return fastest <= FOUR_MEALS_H ? 4 : fastest <= THREE_MEALS_H ? 3 : 2;
}

/** Rounds this keeper walks to this tank, in day order (meticulous keepers check every tank at midday). */
export function tankRounds(state: GameState, m: StaffMember, tankId: string, meals = mealsPerDay(state, tankId)): KeeperRound[] {
  const out: KeeperRound[] = ['morning'];
  if (meals >= 4 || m.trait === 'meticulous') out.push('midday');
  out.push('evening');
  if (meals >= 3) out.push('late');
  return out;
}

/**
 * The visits on one of this keeper's rounds. Each tank keeps its own slot on every round (its place in the keeper's
 * list × VISIT_HOURS after the round starts), so a tank joining or leaving a round mid-way (a discus bought at 8:15, a
 * grazer that starts to need its supplement) never moves another tank's visit: nobody is skipped or fed twice.
 */
export function roundVisits(state: GameState, m: StaffMember, round: KeeperRound): { tankId: string; at: number; meals: 2 | 3 | 4 }[] {
  const out: { tankId: string; at: number; meals: 2 | 3 | 4 }[] = [];
  const t0 = roundStart(m, round);
  m.tankIds.forEach((tankId, i) => {
    if (!state.tanks[tankId]) return;
    const meals = mealsPerDay(state, tankId);
    if (tankRounds(state, m, tankId, meals).includes(round)) out.push({ tankId, meals, at: t0 + i * VISIT_HOURS });
  });
  return out;
}

/** Rounds this keeper walks today (any tank on them). */
export function keeperRounds(state: GameState, m: StaffMember): KeeperRound[] {
  if (m.role !== 'aquarist') return [];
  return ROUND_ORDER.filter((r) => roundVisits(state, m, r).length > 0);
}

/** Today's keeper visits (tank + game hour) — the render layer walks keepers along this. */
export function keeperVisits(state: GameState, m: StaffMember, day = dayOf(state.clock.hour)): { tankId: string; hour: number; round: KeeperRound }[] {
  if (m.role !== 'aquarist') return [];
  const base = (day - 1) * 24;
  const out: { tankId: string; hour: number; round: KeeperRound }[] = [];
  for (const r of ROUND_ORDER) for (const v of roundVisits(state, m, r)) out.push({ tankId: v.tankId, hour: base + v.at, round: r });
  return out;
}

/**
 * Hours from this visit to the keeper's next visit to the tank, plus the half hour a meal takes to be eaten (the
 * look-ahead of a feed).
 */
function hoursToNextVisit(state: GameState, m: StaffMember, tankId: string, round: KeeperRound, rounds: KeeperRound[]): number {
  const at = (r: KeeperRound) => roundVisits(state, m, r).find((v) => v.tankId === tankId)?.at ?? roundStart(m, r);
  const i = rounds.indexOf(round);
  const next = i >= 0 && i < rounds.length - 1 ? rounds[i + 1] : rounds[0];
  let gap = at(next) - at(round);
  if (gap <= 1e-6) gap += 24;
  return gap + 0.5;
}

// ───────────────────────────── staff care never counts as the player's ─────────────────────────────

const PLAYER_COUNTERS = ['feeds', 'targetFeeds', 'waterChanges', 'cleanings', 'topOffs', 'doses'] as const;

/**
 * Run a care mutator on the staff's behalf: the player's counters (quests, mastery, achievements) are left untouched.
 * (lane:qa-final) Feeds also pass `byStaff: true`, so the player's overfeeding tip never fires for a keeper's round.
 */
function asStaff<T>(state: GameState, fn: () => T): T {
  const c = state.progress.counters;
  const saved = PLAYER_COUNTERS.map((k) => [k, c[k]] as const);
  try {
    return fn();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete c[k];
      else c[k] = v;
    }
  }
}

const eats = (sp: SpeciesDefinition, f: FoodDef) => f.tags.some((t) => sp.foods.includes(t));
const inStock = (state: GameState, id: string) => Math.floor(state.inventory.foods?.[id] ?? 0);

function throttled(state: GameState, key: string, hours: number): boolean {
  const st = ensureStaff(state);
  const h = state.clock.hour;
  if (h - (st.warned[key] ?? -1e9) < hours) return false;
  st.warned[key] = h;
  return true;
}

// ───────────────────────────── aquarists ─────────────────────────────

/**
 * Best food in stock for this species in this tank, the way a good keeper chooses:
 *  - its own food where possible: a food that faster tank-mates also eat would mostly go to them (tetras clean up the
 *    bloodworms long before the corydoras reach them, so corydoras get sinking pellets);
 *  - never something the tong-fed slow species eat (`avoid`), or it becomes a second meal for them;
 *  - a staple over a small-pack treat, and something well stocked.
 */
export function pickStaffFood(state: GameState, sp: SpeciesDefinition, tankSpecies: SpeciesDefinition[], avoid: SpeciesDefinition[] = [], env?: Tank['environment']): FoodDef | null {
  let best: FoodDef | null = null;
  let bestScore = -Infinity;
  const faster = tankSpecies.filter((s) => s.id !== sp.id && s.feedingSpeed > sp.feedingSpeed + 0.1);
  for (const f of FOODS) {
    const n = inStock(state, f.id);
    if (n < 1 || !eats(sp, f)) continue;
    const stolen = faster.filter((s) => eats(s, f)).length * 3;
    const clash = avoid.some((s) => s.id !== sp.id && eats(s, f)) ? 8 : 0;
    const staple = f.servingsPerPack > 24 ? 3 : 0;
    const perUnit = f.price / Math.max(1, f.servingsPerPack) / Math.max(1, f.nutrition);
    // Made for this animal: marine foods stay in salt water, axolotl / goldfish pellets go to axolotls / goldfish,
    // and a food with a large share of tags the species doesn't eat (big pellets for small fish) ranks lower.
    const tagFit = f.tags.filter((t) => sp.foods.includes(t)).length / Math.max(1, f.tags.length);
    const wrongKind = (/^marine_/.test(f.id) && env && env !== 'marine' ? 3 : 0) + (/^axolotl_/.test(f.id) && sp.id !== 'axolotl' ? 2 : 0) + (/^goldfish_/.test(f.id) && !/goldfish/.test(sp.id) ? 2 : 0);
    const score = staple + Math.min(2, Math.log10(1 + n)) - stolen - clash - Math.min(2, perUnit * 40) - 2 * (1 - tagFit) - wrongKind;
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return best;
}

function recordFeed(state: GameState, m: StaffMember, tank: Tank, foodId: string, servings: number, hour: number, targetCreatureId?: string): void {
  const st = ensureStaff(state);
  st.seq = (st.seq ?? 0) + 1;
  st.feeds.push({ seq: st.seq, hour, tankId: tank.id, foodId, staffId: m.id, servings, targetCreatureId });
  if (st.feeds.length > FEED_RING) st.feeds.splice(0, st.feeds.length - FEED_RING);
  const care = (st.care[tank.id] ??= {});
  care.lastFed = hour;
}

interface Resident {
  c: GameState['creatures'][string];
  sp: SpeciesDefinition;
  grazer: boolean;
}

/** lane:staff2 — hunger a keeper looks ahead to: anyone who'd pass it before the next visit is fed now ("very hungry" is 70). */
export const LOOKAHEAD_HUNGER = 62;

/** Hunger above which a grazer isn't finding enough biofilm and algae (grazing keeps it at about 15). */
export const GRAZER_SHORT = 25;

/**
 * A grazer that lives on its keeper's food as well as the glass: short of grazing now, or it has eaten from the water
 * column in the last day (a well-grazed one isn't hungry enough to bother).
 */
function grazerNeedsFeeding(c: GameState['creatures'][string], hour: number): boolean {
  return c.stats.hunger >= GRAZER_SHORT || (c.life?.lastAteHour ?? -1e9) >= hour - 24;
}

/** Who reaches the food first: the life sim's feeding weight for a species (speed × boldness, before personality). */
const feedWeight = (sp: SpeciesDefinition) => Math.pow(Math.max(0.02, sp.feedingSpeed), 1.2) * (0.5 + sp.feedingAggression);

/** Food units a meal takes for this animal right now (the default portion's sizing). */
const mealUnits = (r: Resident) => effectiveBioload(r.sp, r.c.sizeCm) * Math.max(20, r.c.stats.hunger);

/** True while the water report shows ammonia or nitrite at WATCH or worse. */
function nitrogenWatch(state: GameState, tank: Tank): boolean {
  try {
    return getWaterReport(state, tank.id).params.some((p) => (p.key === 'ammonia' || p.key === 'nitrite') && p.status !== 'good');
  } catch {
    return tank.water.ammonia > 0.25 || tank.water.nitrite > 0.25;
  }
}

/**
 * Feed one tank. `mode` 'meal' = a scheduled meal (skipped for species already fed recently, e.g. by the player);
 * 'topup' = the meticulous midday check (only animals that are very hungry). `nextVisitH` = hours until this keeper
 * is back at the tank: anyone who would be very hungry by then is fed now, even if not hungry yet. Returns species
 * that had nothing in stock.
 *
 * How a keeper feeds (the same husbandry the game teaches): each species gets a food of its own where one is in stock
 * (bottom feeders their sinking food), slow species with fast tank-mates get their portion from the tongs, and every
 * portion is sized for the animals that will actually eat it, with a small surplus so the smallest still get a share.
 * (lane:staff2) Only while the water report says WATCH or worse for ammonia or nitrite are portions trimmed ("feed
 * lightly until it clears"); a trace of ammonia is not a reason to underfeed. An animal that keeps missing out gets
 * its own portion from the tongs, taking turns when several do, and the shared meal is sized for everyone else, so a
 * tonged fish is not fed twice while the last in line goes without. A food meant for slow feeders is also eaten by the
 * faster tank-mates that eat it, so its portion covers their share too.
 */
export function keeperFeed(state: GameState, m: StaffMember, tank: Tank, mode: 'meal' | 'topup', hour: number, nextVisitH = 0): { fed: number; missing: SpeciesDefinition[] } {
  // Grazers live off biofilm and algae; a keeper only supplements them when the glass is too clean to live on.
  const residents: Resident[] = feedableResidents(state, tank.id).map(({ c, sp }) => ({ c, sp, grazer: !needsFedFood(sp) }));
  if (!residents.length) return { fed: 0, missing: [] };
  const threshold = mode === 'topup' ? 60 : 20;
  const hungerOk = (r: Resident) => {
    const h = r.c.stats.hunger;
    const ahead = nextVisitH > 0 && h + nextVisitH * hungerRate(r.c, r.sp) >= LOOKAHEAD_HUNGER;
    // A grazer that grazes enough sits near 15; one that grazing can't keep going is fed like anyone else.
    if (r.grazer) return h >= Math.max(threshold, 30) || (ahead && grazerNeedsFeeding(r.c, hour));
    return h >= threshold || ahead;
  };
  const light = nitrogenWatch(state, tank) ? 0.7 : 1;
  const bySpecies = new Map<string, { sp: SpeciesDefinition; list: Resident[] }>();
  for (const r of residents) {
    let e = bySpecies.get(r.sp.id);
    if (!e) bySpecies.set(r.sp.id, (e = { sp: r.sp, list: [] }));
    e.list.push(r);
  }
  const allSpecies = [...bySpecies.values()].map((e) => e.sp);
  // Slowest feeders first: they are planned (and fed) first.
  const order = [...bySpecies.values()].sort((a, b) => a.sp.feedingSpeed - b.sp.feedingSpeed || (a.sp.id < b.sp.id ? -1 : 1));
  const missing: SpeciesDefinition[] = [];
  const tonged: SpeciesDefinition[] = [];
  const tongedIds = new Set<string>();
  /** foodId -> residents that portion is for (insertion order = feeding order). */
  const plan = new Map<string, Resident[]>();
  let fed = 0;
  /** Target feeding with the tongs / pipette: one portion, reserved for that animal for an hour. */
  const tong = (r: Resident, food: FoodDef): boolean => {
    const before = inStock(state, food.id);
    if (before < 1) return false;
    const servings = clamp(Math.ceil((mealUnits(r) * light) / Math.max(1, food.nutrition)), 1, before);
    const res = asStaff(state, () => feedTank(state, tank.id, food.id, { targetCreatureId: r.c.id, servings, byStaff: true }));
    if (!res.ok) return false;
    recordFeed(state, m, tank, food.id, before - inStock(state, food.id), hour, r.c.id);
    tongedIds.add(r.c.id);
    fed++;
    return true;
  };
  for (const { sp, list } of order) {
    const hungry = list.filter(hungerOk);
    if (!hungry.length) continue;
    const fasterMates = residents.some((r) => r.sp.id !== sp.id && r.sp.feedingSpeed > sp.feedingSpeed + 0.2);
    const tongs = fasterMates && sp.feedingSpeed < 0.3;
    const food = pickStaffFood(state, sp, allSpecies, tongs ? [] : tonged, tank.environment);
    if (!food) {
      // Grazers without a supplement in stock still have the tank's biofilm: not worth an alarm.
      if (!list[0].grazer) missing.push(sp);
      continue;
    }
    if (tongs) {
      for (const r of hungry) if (!tong(r, food) && inStock(state, food.id) < 1) break;
      tonged.push(sp);
      continue;
    }
    // An individual that keeps missing out (shy, small, unwell) gets its own portion from the tongs on top: only a
    // clear outlier (very hungry, well above its group), the hungriest first, and those not tonged in the last half
    // day before those that were — so several missing out take turns instead of one fish being fed twice.
    const pool = list.filter((r) => !r.grazer);
    if (pool.length >= 2) {
      const mean = pool.reduce((a, r) => a + r.c.stats.hunger, 0) / pool.length;
      const recent = (r: Resident) => ((r.c.life?.targetFedUntil ?? -1e9) > hour - 12 ? 1 : 0);
      const outliers = pool
        .filter((r) => r.c.stats.hunger >= 70 && r.c.stats.hunger >= mean + 15)
        .sort((a, b) => recent(a) - recent(b) || b.c.stats.hunger - a.c.stats.hunger || (a.c.id < b.c.id ? -1 : 1))
        .slice(0, Math.max(1, Math.ceil(pool.length / 4)));
      for (const r of outliers) if (inStock(state, food.id) >= 2) tong(r, food);
    }
    const who = (mode === 'topup' ? hungry : list).filter((r) => !tongedIds.has(r.c.id));
    if (who.length) plan.set(food.id, [...(plan.get(food.id) ?? []), ...who]);
  }
  // Size the shared meal: each food ~10% over the appetite of the animals it is meant for, plus the share that faster
  // tank-mates eating the same thing take first (every animal not fed from the tongs eats from it, peckish or not, and
  // splits its appetite across the foods in the water it eats, in proportion to what's there), so the slow feeders'
  // portion still reaches them.
  const foods = [...plan.keys()].map((id) => getFoodDef(id)).filter((f): f is FoodDef => !!f);
  const planned = new Set(foods.flatMap((f) => plan.get(f.id)!));
  const eaters = residents.filter((r) => !tongedIds.has(r.c.id) && r.c.stats.hunger >= 6 && r.c.repro?.stage !== 'brooding');
  const appetite = (r: Resident) => (planned.has(r) ? mealUnits(r) : effectiveBioload(r.sp, r.c.sizeCm) * r.c.stats.hunger);
  const base = new Map<string, number>();
  for (const f of foods) base.set(f.id, 1.1 * plan.get(f.id)!.reduce((a, r) => a + mealUnits(r), 0));
  let amount = new Map(base);
  for (let iter = 0; iter < 3; iter++) {
    const next = new Map<string, number>();
    for (const f of foods) {
      const own = new Set(plan.get(f.id)!);
      let slowest = Infinity;
      for (const r of own) slowest = Math.min(slowest, feedWeight(r.sp));
      let leak = 0;
      for (const r of eaters) {
        if (own.has(r) || !eats(r.sp, f) || feedWeight(r.sp) <= slowest) continue;
        let total = 0;
        for (const g of foods) if (eats(r.sp, g)) total += amount.get(g.id) ?? 0;
        if (total > 0) leak += (appetite(r) * (amount.get(f.id) ?? 0)) / total;
      }
      next.set(f.id, (base.get(f.id) ?? 0) + leak);
    }
    amount = next;
  }
  for (const food of foods) {
    const before = inStock(state, food.id);
    if (before < 1) continue;
    const servings = clamp(Math.ceil(((amount.get(food.id) ?? 0) * light) / Math.max(1, food.nutrition)), 1, before);
    const res = asStaff(state, () => feedTank(state, tank.id, food.id, { servings, byStaff: true }));
    if (res.ok) {
      recordFeed(state, m, tank, food.id, before - inStock(state, food.id), hour);
      fed++;
    }
  }
  return { fed, missing };
}

const WATER_CHANGE_FIXES = new Set(['nitrate', 'ammonia', 'nitrite', 'ph', 'kh', 'oxygen', 'clarity']);

/**
 * Seahorses, axolotls and long-finned bettas tire in strong current. If a resident wants low flow, turn powerheads
 * and wavemakers down to a gentle setting (never up — more flow is a design decision for the player), but never
 * below what the most current-loving resident needs: a tang sharing the tank keeps the pumps up (lane:staff, S05-04),
 * and the water report explains the clash.
 */
function calmFlow(state: GameState, tank: Tank): void {
  let want: number | null = null;
  for (const c of Object.values(state.creatures)) {
    if (c.tankId !== tank.id || (c.status !== 'alive' && c.status !== 'listed')) continue;
    const pref = findSpecies(c.speciesId)?.flowPreference;
    const v = pref === 'very_low' || pref === 'low' ? 0.1 : pref === 'moderate' ? 0.6 : pref === 'high' ? 1 : null;
    if (v !== null) want = want === null ? v : Math.max(want, v);
  }
  if (want === null || want >= 1) return;
  for (const inst of tank.equipment ?? []) {
    const kind = getEquipmentDef(inst.defId)?.kind;
    if ((kind !== 'powerhead' && kind !== 'wavemaker') || inst.failed || !inst.on) continue;
    if ((inst.setting ?? 1) > want + 0.05) asStaff(state, () => setEquipment(state, tank.id, inst.id, { setting: want! }));
  }
}

/** Heater to the middle of the residents' shared ideal band (a little under the top), chiller a degree above it. */
function retuneThermostats(state: GameState, tank: Tank): void {
  let lo = -Infinity;
  let hi = Infinity;
  for (const c of Object.values(state.creatures)) {
    if (c.tankId !== tank.id || (c.status !== 'alive' && c.status !== 'listed')) continue;
    const sp = findSpecies(c.speciesId);
    if (!sp?.tempC) continue;
    lo = Math.max(lo, sp.tempC.idealMin);
    hi = Math.min(hi, sp.tempC.idealMax);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) return;
  const mid = (lo + hi) / 2;
  for (const inst of tank.equipment ?? []) {
    if (inst.failed || !inst.on) continue;
    const kind = getEquipmentDef(inst.defId)?.kind;
    const want = kind === 'heater' ? Math.min(mid, hi - 0.5) : kind === 'chiller' ? Math.max(mid + 1, lo + 1) : null;
    if (want === null || Math.abs((inst.setting ?? want) - want) < 0.25) continue;
    asStaff(state, () => setEquipment(state, tank.id, inst.id, { setting: Math.round(want * 2) / 2 }));
  }
}

/** lane:staff2 — the midday and late rounds are quick feeding visits: no glass scraping or thermostat fiddling. */
const quickRound = (round: KeeperRound) => round === 'midday' || round === 'late';

/** Routine water care on a round: water change when the report or the calendar says so, top-off, glass, gravel. */
export function keeperWaterCare(state: GameState, m: StaffMember, tank: Tank, round: KeeperRound, hour: number): string[] {
  const done: string[] = [];
  const st = ensureStaff(state);
  const care = (st.care[tank.id] ??= {});
  const day = dayRecord(state, m);
  const w = tank.water;
  const salty = isSaltClass(tank.waterClass);
  // Evaporation first: a top-off before testing keeps salinity honest.
  if (w.level < (salty ? 0.97 : 0.94)) {
    const r = asStaff(state, () => topOff(state, tank.id));
    if (r.ok) {
      day.topOffs++;
      done.push('topoff');
    }
  }
  let bad: string[] = [];
  let tempOff = false;
  let flowOff = false;
  let nitrogenDanger = false;
  try {
    const rep = getWaterReport(state, tank.id);
    // Things fresh water fixes: nitrogen waste, a sagging KH / pH, stale low-oxygen water, and low salinity in salt tanks.
    bad = rep.params
      .filter((p) => p.status !== 'good' && (WATER_CHANGE_FIXES.has(p.key) || (p.key === 'salinity' && salty && w.salinitySG < 1.02)))
      .map((p) => p.key);
    tempOff = rep.params.some((p) => p.key === 'temp' && p.status !== 'good');
    // only too MUCH current is the keeper's to calm; too still is a note for the player (S05-04)
    flowOff = rep.params.some((p) => p.key === 'flow' && p.status !== 'good' && /too strong/i.test(p.reason ?? ''));
    nitrogenDanger = rep.params.some((p) => (p.key === 'ammonia' || p.key === 'nitrite') && p.status === 'danger');
    // KH that has crashed can't be fixed with soft change water alone: a dose of buffer (a couple of dollars, on the
    // supplies ledger) stops the pH sliding. At most once a day per tank.
    const khCrash = rep.params.some((p) => p.key === 'kh' && p.status !== 'good');
    if (khCrash && round === 'morning' && !salty && hour - (care.lastBuffer ?? -1e9) >= 22) {
      const r = asStaff(state, () => dose(state, tank.id, 'buffer'));
      if (r.ok) {
        care.lastBuffer = hour;
        done.push('buffer');
      }
    }
  } catch {
    bad = [];
  }
  // A drifting thermostat is routine: set working heaters / chillers back into the residents' shared comfort band.
  if (tempOff && !quickRound(round)) retuneThermostats(state, tank);
  if (round === 'morning' && flowOff) calmFlow(state, tank);
  const urgent = bad.includes('ammonia') || bad.includes('nitrite');
  const last = care.lastWaterChange ?? tank.lastMaintenanceHour ?? -1e9;
  const dueDays = 7 - 0.4 * (clamp(m.skill, 1, 5) - 1);
  const due = hour - last >= dueDays * 24;
  // Mornings: nitrate & co (at most every other day — 25% at a time is gentler than daily big swings), due dates.
  // Any round: ammonia / nitrite emergencies.
  const recent = hour - (care.lastWaterChange ?? -1e9) < 44;
  if ((round === 'morning' && ((bad.length && !recent) || due)) || (urgent && hour - (care.lastWaterChange ?? -1e9) >= 8)) {
    // Emergencies get a bigger change (still under half, so nobody is shocked).
    const fraction = nitrogenDanger ? 0.4 : urgent ? 0.3 : 0.25;
    const salt = waterChangeCost(state, tank.id, fraction);
    if (!salt.enoughSalt) {
      // A short-salted change would drop the salinity: skip it and say so.
      const text = `No salt mix for ${tank.name}’s water change`;
      noteIssue(day, text);
      if (throttled(state, `salt:${tank.id}`, 24))
        emitEvent(state, { kind: 'warning', text: `${firstName(m)} couldn’t change the water in ${tank.name}: not enough marine salt mix (needs ${salt.saltKg.toFixed(1)} kg). Buy salt in Market › Supplies.`, tankId: tank.id, toast: urgent });
    } else {
      const opts = m.trait === 'gentle_hands' ? { newWaterTempC: w.tempC } : {};
      const r = asStaff(state, () => waterChange(state, tank.id, fraction, opts));
      if (r.ok) {
        care.lastWaterChange = hour;
        day.waterChanges++;
        totals(m).waterChanges++;
        done.push('water');
      }
    }
  }
  if (!quickRound(round)) {
    const algaeAt = m.trait === 'algae_hunter' ? 12 : 25;
    if (w.algae > algaeAt) {
      const r = asStaff(state, () => cleanTank(state, tank.id, 'glass'));
      if (r.ok) {
        day.cleanings++;
        totals(m).cleanings++;
        done.push('glass');
      }
    }
    if (round === 'morning' && w.detritus > 45) {
      const r = asStaff(state, () => cleanTank(state, tank.id, 'gravel'));
      if (r.ok) {
        day.cleanings++;
        totals(m).cleanings++;
        done.push('gravel');
      }
    }
  }
  return done;
}

const plural = (n: number, s: string, p = `${s}s`) => `${n} ${n === 1 ? s : p}`;

function speciesPhrase(list: SpeciesDefinition[]): string {
  const names = [...new Set(list.map((s) => s.commonName.toLowerCase()))];
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

/**
 * Keepers look over the equipment on every visit. Repairs cost money, so they're the player's call — the keeper
 * flags a failure and makes a stuck-on heater safe by switching it off before it cooks the tank. The 48 h reminder
 * toasts (at most one equipment toast a game day across the facility, G2-06): the failure's own toast is easy to miss
 * at 10×, and a dead filter quietly turns a healthy tank into an overstocked one.
 */
export function keeperEquipmentCheck(state: GameState, m: StaffMember, tank: Tank): void {
  for (const inst of tank.equipment ?? []) {
    if (!inst.failed) continue;
    const def = getEquipmentDef(inst.defId);
    const name = def?.name ?? 'equipment';
    const stuck = inst.failMode === 'stuck_on' && inst.on;
    if (stuck) asStaff(state, () => setEquipment(state, tank.id, inst.id, { on: false }));
    const day = dayRecord(state, m);
    noteIssue(day, `${name} failed in ${tank.name}`);
    if (throttled(state, `eq:${inst.id}`, 48)) {
      emitEvent(state, {
        kind: 'warning',
        text: stuck
          ? `${firstName(m)} found the ${name} in ${tank.name} stuck on and switched it off before the water overheated. It needs a repair (tank card › Equipment).`
          : `${firstName(m)} noticed the ${name} in ${tank.name} has failed${def?.kind === 'filter' ? ', so the tank can’t process its waste properly' : ''}. Repairs are your call — tank card › Equipment.`,
        tankId: tank.id,
        toast: stuck || throttled(state, 'eq:toast', 24),
      });
    }
  }
}

/** One keeper visit to one tank on a round. */
export function keeperVisit(state: GameState, m: StaffMember, tankId: string, round: KeeperRound, hour: number): void {
  const tank = state.tanks[tankId];
  if (!tank) return;
  const day = dayRecord(state, m);
  // lane:staff2 — a fast-metabolism tank's midday visit is a real meal; elsewhere midday is the meticulous top-up.
  const meals = mealsPerDay(state, tank.id);
  const mode = round === 'midday' && meals < 4 ? 'topup' : 'meal';
  const { fed, missing } = keeperFeed(state, m, tank, mode, hour, hoursToNextVisit(state, m, tank.id, round, tankRounds(state, m, tank.id, meals)));
  if (fed > 0) {
    day.feeds += fed;
    totals(m).feeds += fed;
    if (!day.tanksFed.includes(tank.id)) day.tanksFed.push(tank.id);
    day.last = { hour, kind: 'feed', tankId: tank.id, text: `Fed ${tank.name}` };
  }
  if (missing.length) {
    const who = speciesPhrase(missing);
    noteIssue(day, `No food for the ${who} in ${tank.name}`);
    // Honest, not silent: the log says what couldn't be fed and what to do (toasted at most once a game day).
    if (throttled(state, `nofood:${tank.id}`, 12)) {
      const hasStock = (state.staff?.roster ?? []).some((x) => x.role === 'stock_manager');
      emitEvent(state, {
        kind: 'warning',
        text: `${firstName(m)} couldn’t feed the ${who} in ${tank.name} — there’s nothing in stock they eat. Buy food in Market › Supplies${hasStock ? ' or raise the stock manager’s budget' : ', or hire a stock manager'}.`,
        tankId: tank.id,
        toast: throttled(state, 'nofood:toast', 24),
      });
    }
  }
  // Moving or selling animals is the player's call; the keeper says plainly when a tank has outgrown its filter
  // (a shrimp colony boom, a big clutch raised in the display).
  if (round === 'morning' && (tank.cache?.stockingLoad ?? 0) > 1 && (tank.water.ammonia > 0.05 || tank.water.nitrite > 0.1)) {
    noteIssue(day, `${tank.name} is overcrowded`);
    if (throttled(state, `crowd:${tank.id}`, 48)) {
      const n = Object.values(state.creatures).filter((c) => c.tankId === tank.id && c.status === 'alive').length;
      // A failed filter is the likelier culprit than the headcount: name it first (G2-06).
      const dead = (tank.equipment ?? []).find((e) => e.failed && getEquipmentDef(e.defId)?.kind === 'filter');
      const deadName = dead ? (getEquipmentDef(dead.defId)?.name ?? 'filter') : null;
      if (dead) ensureStaff(state).warned[`eq:${dead.id}`] = state.clock.hour; // this says it; skip the equipment reminder
      emitEvent(state, {
        kind: 'warning',
        text: deadName
          ? `${firstName(m)}: the ${deadName} in ${tank.name} has failed, so the rest of the filtration can’t keep up with ${n} animals even with daily water changes. Repair it in the tank card › Equipment.`
          : `${firstName(m)}: ${tank.name} is overcrowded (${n} animals) — waste is outpacing the filter even with daily water changes. Moving some to another tank, adding filtration or selling a few is your call.`,
        tankId: tank.id,
        toast: true,
      });
    }
  }
  keeperEquipmentCheck(state, m, tank); // after the crowding check, which names a failed filter itself
  // Treatment is the player's decision; the keeper makes sure they hear about a sick animal.
  if (!quickRound(round)) {
    for (const c of Object.values(state.creatures)) {
      if (c.tankId !== tank.id || c.status !== 'alive' || !c.illness || c.illness.severity < 25) continue;
      if (!throttled(state, `ill:${c.id}:${c.illness.kind}`, 72)) continue;
      noteIssue(day, `${c.name} looks unwell`);
      emitEvent(state, { kind: 'warning', text: `${firstName(m)} noticed ${c.name} in ${tank.name} looks unwell (${c.illness.kind.replace(/_/g, ' ')}). Treatment is your call — see ${c.name}’s card.`, tankId: tank.id, creatureId: c.id });
    }
  }
  const done = keeperWaterCare(state, m, tank, round, hour);
  if (done.includes('water')) day.last = { hour, kind: 'water', tankId: tank.id, text: `Water change in ${tank.name}` };
  else if (done.includes('glass') && !fed) day.last = { hour, kind: 'glass', tankId: tank.id, text: `Scraped the glass in ${tank.name}` };
  else if (done.includes('topoff') && !fed) day.last = { hour, kind: 'topoff', tankId: tank.id, text: `Topped off ${tank.name}` };
}

/** Run every keeper visit whose scheduled time falls in [start, end). */
export function stepKeepers(state: GameState, start: number, end: number): void {
  const st = state.staff;
  if (!st) return;
  for (const m of st.roster) {
    if (m.role !== 'aquarist' || !m.tankIds.length) continue;
    // lane:staff2 — every round (midday / late only for the tanks that need them, see tankRounds).
    const hs = hourOfDay(start);
    const wrapEnd = hs + (end - start);
    const span = m.tankIds.length * VISIT_HOURS;
    // Quick reject: this round's visits [t0, t0 + span] don't touch [start, end) (also across midnight).
    const hits = (a: number) => a < wrapEnd && a + span + 1e-9 >= hs;
    for (const round of ROUND_ORDER) {
      const t0 = roundStart(m, round);
      if (!(end - start >= 24 || hits(t0) || hits(t0 - 24) || hits(t0 + 24))) continue;
      for (const v of roundVisits(state, m, round)) for (const h of crossings(start, end, v.at)) keeperVisit(state, m, v.tankId, round, h);
    }
  }
}

// ───────────────────────────── stock manager ─────────────────────────────

/** Days of food the stock manager keeps on the shelf. */
export function stockTargetDays(m: StaffMember): number {
  return 3 + 0.5 * (clamp(m.skill, 1, 5) - 1) + (m.trait === 'planner' ? 2 : 0);
}

interface Order {
  kind: 'food' | 'salt';
  foodId?: string;
  packs?: number;
  kg?: number;
  urgency: number;
  label: string;
  unit: number;
}

/**
 * Servings of each food the keepers will use in a day, following the same choices a keeper makes (pickStaffFood per
 * species, one portion per food per tank). The shared-cupboard estimate in tankStatus counts every food as if it were
 * each animal's only food, which would have the stock manager fill the shelves several times over.
 * (lane:staff2) Per day from each animal's metabolism (the hunger it burns in 24 h, plus the keepers' ~15% surplus),
 * not per round: a tank fed four small meals eats what it would in two big ones, and big tanks are no longer
 * estimated at one capped default portion.
 */
export function plannedUsage(state: GameState): Map<string, number> {
  const usage = new Map<string, number>();
  const index = fedResidentIndex(state);
  // Grazers (biofilm eaters) get a supplement when the glass is too clean: count the ones hungry enough to be fed.
  for (const c of Object.values(state.creatures)) {
    if (!c.tankId || (c.status !== 'alive' && c.status !== 'listed') || c.stats.hunger < 30) continue;
    const sp = findSpecies(c.speciesId);
    if (!sp || sp.diet === 'photosynthetic' || needsFedFood(sp)) continue;
    let l = index.get(c.tankId);
    if (!l) index.set(c.tankId, (l = []));
    l.push({ c, sp });
  }
  for (const [tankId, residents] of index) {
    if (!state.tanks[tankId] || !residents.length) continue;
    const species = [...new Map(residents.map((r) => [r.sp.id, r.sp])).values()].sort((a, b) => a.feedingSpeed - b.feedingSpeed || (a.id < b.id ? -1 : 1));
    // Same plan as keeperFeed: each species its own pick, one portion per food for the species assigned to it.
    const plan = new Map<string, number>();
    for (const sp of species) {
      const food = pickStaffFood(state, sp, species, [], state.tanks[tankId]?.environment);
      if (!food) continue;
      let demand = 0;
      // Grazers live mostly on biofilm: their supplement is about half their day's appetite.
      for (const r of residents) if (r.sp.id === sp.id) demand += effectiveBioload(r.sp, r.c.sizeCm) * 24 * hungerRate(r.c, r.sp) * (needsFedFood(r.sp) ? 1 : 0.5);
      plan.set(food.id, (plan.get(food.id) ?? 0) + demand);
    }
    for (const [foodId, demand] of plan) {
      const food = getFoodDef(foodId);
      if (food) usage.set(foodId, (usage.get(foodId) ?? 0) + (demand * 1.15) / Math.max(1, food.nutrition));
    }
  }
  return usage;
}

/** What the shelves need right now (most urgent first). */
export function plannedOrders(state: GameState, m: StaffMember): Order[] {
  const orders: Order[] = [];
  const perDay = plannedUsage(state); // lane:staff2 — servings a day (was per round × 2)
  const target = stockTargetDays(m);
  const maxPacks = m.trait === 'thrifty' ? 1 : 6;
  // 1) Foods in use that would run out within the target (a day of keeper meals at a time).
  for (const [foodId, per] of perDay) {
    const f = getFoodDef(foodId);
    if (!f || !(per > 0)) continue;
    const have = inStock(state, foodId);
    const days = have / per;
    if (days >= target) continue;
    const need = Math.max(0, (target + 1) * per - have);
    const packs = clamp(Math.ceil(need / Math.max(1, f.servingsPerPack)), 1, maxPacks);
    orders.push({ kind: 'food', foodId, packs, urgency: days, label: f.name, unit: f.price });
  }
  // 2) Animals with nothing at all in stock that they eat: the best food for them.
  const outlook = foodOutlookAll(state);
  const wanted = new Set(orders.map((o) => o.foodId));
  for (const id of state.tankOrder) {
    const o = outlook[id];
    if (!o || o.level !== 'out' || !o.restockId || wanted.has(o.restockId)) continue;
    const f = getFoodDef(o.restockId);
    if (!f) continue;
    wanted.add(f.id);
    orders.push({ kind: 'food', foodId: f.id, packs: m.trait === 'thrifty' ? 1 : f.servingsPerPack <= 24 ? 2 : 1, urgency: -1, label: f.name, unit: f.price });
  }
  // 2b) Hungry grazers with no supplement on the shelf (the glass is too clean to live on): the best-value food they eat.
  const unlocked = new Set(state.progress.unlocked);
  for (const c of Object.values(state.creatures)) {
    if (!c.tankId || c.status !== 'alive' || c.stats.hunger < 45) continue;
    const sp = findSpecies(c.speciesId);
    if (!sp || sp.diet === 'photosynthetic' || needsFedFood(sp)) continue;
    if (FOODS.some((f) => eats(sp, f) && inStock(state, f.id) > 0)) continue;
    const f = FOODS.filter((x) => eats(sp, x) && (!x.unlock || unlocked.has(x.unlock))).sort((a, b) => a.price / a.servingsPerPack - b.price / b.servingsPerPack)[0];
    if (!f || wanted.has(f.id)) continue;
    wanted.add(f.id);
    orders.push({ kind: 'food', foodId: f.id, packs: 1, urgency: -0.5, label: f.name, unit: f.price });
  }
  // 3) Marine salt: enough for two rounds of 25% water changes in every salt-water tank.
  let saltNeed = 0;
  for (const id of state.tankOrder) {
    const t = state.tanks[id];
    if (!t || !isSaltClass(t.waterClass)) continue;
    try {
      saltNeed += waterChangeCost(state, id, 0.25).saltKg;
    } catch {
      /* derived only */
    }
  }
  if (saltNeed > 0) {
    const have = Math.max(0, state.inventory.salt ?? 0);
    const keep = saltNeed * (m.trait === 'planner' ? 3 : 2);
    if (have < keep) {
      const kg = Math.max(5, Math.ceil((keep * 1.25 - have) / 5) * 5);
      orders.push({ kind: 'salt', kg: m.trait === 'thrifty' ? 5 : kg, urgency: have / Math.max(0.1, saltNeed) - 1, label: 'marine salt mix', unit: SALT_PRICE_PER_KG });
    }
  }
  orders.sort((a, b) => a.urgency - b.urgency);
  return orders;
}

/** The stock manager's shelf check: buys what's needed within today's remaining budget. */
export function stockCheck(state: GameState, m: StaffMember, hour: number): void {
  const st = ensureStaff(state);
  const day = dayRecord(state, m);
  const today = dayOf(hour);
  if (st.stockSpent.day !== today) st.stockSpent = { day: today, amount: 0 };
  const orders = plannedOrders(state, m);
  if (!orders.length) return;
  const bought: string[] = [];
  // lane:staff (S05-03) — what could not be bought, and why: the day's budget, or the till itself
  const overBudget: string[] = [];
  const noCash: string[] = [];
  let spentNow = 0;
  for (const o of orders) {
    const left = Math.max(0, st.stockBudget - st.stockSpent.amount);
    const cash = Math.max(0, state.finance.money);
    if (o.kind === 'food' && o.foodId) {
      const def = getFoodDef(o.foodId);
      if (!def) continue;
      // as many packs as both the budget and the cash on hand allow — when money is tight the most urgent staple
      // still gets a pack or two rather than nothing
      const each = Math.max(0.01, def.price);
      const affordable = Math.min(o.packs ?? 1, Math.floor((left + 1e-6) / each), Math.floor((cash + 1e-6) / each));
      if (affordable < 1) {
        (cash < each ? noCash : overBudget).push(def.name.toLowerCase());
        continue;
      }
      const res = buyFood(state, def.id, affordable);
      if (!res.ok) {
        noCash.push(def.name.toLowerCase());
        continue;
      }
      const price = Math.round(def.price * affordable * 100) / 100;
      tagLastLedger(state, m);
      st.stockSpent.amount += price;
      spentNow += price;
      bought.push(`${affordable} × ${def.name}`);
    } else if (o.kind === 'salt' && o.kg) {
      const kg = Math.min(o.kg, Math.floor((Math.min(left, cash) + 1e-6) / SALT_PRICE_PER_KG / 5) * 5);
      if (kg < 5) {
        (cash < 5 * SALT_PRICE_PER_KG ? noCash : overBudget).push('salt mix');
        continue;
      }
      const res = buySalt(state, kg);
      if (!res.ok) {
        noCash.push('salt mix');
        continue;
      }
      tagLastLedger(state, m);
      const price = kg * SALT_PRICE_PER_KG;
      st.stockSpent.amount += price;
      spentNow += price;
      bought.push(`${kg} kg salt mix`);
    }
  }
  if (bought.length) {
    day.orders += bought.length;
    day.spent += spentNow;
    const tt = totals(m);
    tt.orders += bought.length;
    tt.spent += spentNow;
    day.last = { hour, kind: 'order', text: `Ordered ${bought.slice(0, 2).join(' and ')}${bought.length > 2 ? ` and ${bought.length - 2} more` : ''} (${fmt$(spentNow)})` };
  }
  if (noCash.length || overBudget.length) {
    // name the real blocker: an empty till is not a budget problem
    const broke = noCash.length > 0;
    const what = (broke ? noCash : overBudget).slice(0, 2).join(' and ');
    noteIssue(day, broke ? `Couldn’t afford ${what}` : `Budget spent — ${what} wait for tomorrow`);
    if (throttled(state, `budget:${m.id}`, 20)) {
      emitEvent(state, {
        kind: 'warning',
        text: broke
          ? `${firstName(m)} couldn’t reorder ${what}: there isn’t enough cash right now.`
          : `${firstName(m)} couldn’t reorder ${what} — today’s ${fmt$(st.stockBudget)} stock budget is spent. Raise it in Visitors › Staff.`,
      });
    }
  }
}

/** Append "· ordered by Sam" to the purchase the stock manager just made, so the ledger says who bought it. */
function tagLastLedger(state: GameState, m: StaffMember): void {
  const l = state.finance.ledger;
  const e = l[l.length - 1];
  if (e && e.amount < 0 && e.hour === state.clock.hour && !/ordered by/.test(e.memo)) e.memo = `${e.memo} · ordered by ${firstName(m)}`;
}

export function stepStockManager(state: GameState, start: number, end: number): void {
  const st = state.staff;
  if (!st) return;
  for (const m of st.roster) {
    if (m.role !== 'stock_manager') continue;
    const checks = m.skill >= 3 ? STOCK_CHECKS : STOCK_CHECKS.slice(0, 1);
    for (const hod of checks) {
      const h0 = hod - (m.trait === 'early_bird' && hod === STOCK_CHECKS[0] ? 1 : 0);
      for (const h of crossings(start, end, h0)) stockCheck(state, m, h);
    }
  }
}

// ───────────────────────────── docents ─────────────────────────────

const TALK_LINES = [
  '{staff}’s talk at {tank} drew a small crowd — people left knowing what {species} really need.',
  'Kids crowded round {tank} while {staff} explained how {species} live.',
  '“I never knew that!” — overheard after {staff}’s talk about {species} at {tank}.',
  '{staff} answered questions about {species} at {tank} long after the talk ended.',
  'A family stayed at {tank} for {staff}’s whole talk on {species}.',
];

function talkTopic(state: GameState, tankId: string): string {
  const counts = new Map<string, number>();
  for (const c of Object.values(state.creatures)) if (c.tankId === tankId && c.status === 'alive') counts.set(c.speciesId, (counts.get(c.speciesId) ?? 0) + 1);
  let best: string | null = null;
  let bestScore = -1;
  for (const [sid, n] of counts) {
    const sp = findSpecies(sid);
    const score = (sp?.visitorAppeal ?? 0.5) * 3 + Math.min(3, n) * 0.2;
    if (sp && score > bestScore) {
      bestScore = score;
      best = sp.commonName;
    }
  }
  return best ? best.toLowerCase().replace(/s$/, '') + 's' : 'aquarium life';
}

/** A docent gives a talk at one of their exhibits (rotating). */
export function giveTalk(state: GameState, m: StaffMember, hour: number): void {
  const st = ensureStaff(state);
  const exhibits = m.tankIds.filter((id) => state.tanks[id]);
  if (!exhibits.length) return;
  const day = dayRecord(state, m);
  const tankId = exhibits[(totals(m).talks + m.skill) % exhibits.length];
  const tank = state.tanks[tankId];
  st.talks.push({ hour, untilHour: hour + TALK_LENGTH_H, tankId, staffId: m.id });
  if (st.talks.length > TALK_RING) st.talks.splice(0, st.talks.length - TALK_RING);
  day.talks++;
  totals(m).talks++;
  day.last = { hour, kind: 'talk', tankId, text: `Talk at ${tank.name}` };
  // Word of mouth: the exhibit gets a little more popular, and the visitors' feed hears about it.
  const stat = (state.visitors.exhibit[tankId] ??= { popularity: 50, views: 0, wows: 0 });
  stat.popularity = Math.min(100, stat.popularity + 1.5 + 0.3 * m.skill);
  const line = TALK_LINES[(st.seq + totals(m).talks) % TALK_LINES.length]
    .replace('{staff}', firstName(m))
    .replace('{tank}', tank.name)
    .replace('{species}', talkTopic(state, tankId));
  pushReaction(state.visitors.reactions, { hour, tankId, text: line, mood: 'happy' });
}

export function stepDocents(state: GameState, start: number, end: number): void {
  const st = state.staff;
  if (!st) return;
  let j = 0;
  for (const m of st.roster) {
    if (m.role !== 'docent') continue;
    const offset = (j++ % 4) * 0.25;
    // Early birds fit in a 10 AM talk before the first crowd.
    for (const hod of m.trait === 'early_bird' ? [10, ...TALK_HOURS] : TALK_HOURS) {
      for (const h of crossings(start, end, hod + offset)) if (isOpenAt(state, h)) giveTalk(state, m, h);
    }
  }
}

export interface DocentEffect {
  /** Satisfaction points added to every visit (before archetype weighting). */
  sat: number;
  /** Extra satisfaction scaled by the visitor's appetite for learning (archetype education 0..1). */
  learn: number;
  /** Extra satisfaction for families and school groups (great-with-kids docents). */
  kids: number;
  /** Donation-chance multiplier (≥ 1). */
  donation: number;
  /** Tip-chance multiplier (≥ 1): a guided visit is remembered. */
  tip: number;
  /** Arrival multiplier (≥ 1, at most ~1.07): word of mouth about the talks. */
  draw: number;
  /** 0..1 share of the display exhibits the docents cover. */
  coverage: number;
  /** A talk is on right now. */
  talking: boolean;
}

/**
 * Bounded docent effect on the visitor sim: at most about +8 satisfaction (+3 more for kids with a great-with-kids
 * docent) and +40% donation chance, scaled by how much of the floor the docents cover and their skill.
 */
export function docentEffect(state: GameState, hour: number): DocentEffect | null {
  const docents = (state.staff?.roster ?? []).filter((m) => m.role === 'docent');
  if (!docents.length) return null;
  const exhibits = displayTankIds(state);
  if (!exhibits.length) return null;
  let reach = 0;
  let quality = 0;
  let kids = false;
  let story = false;
  for (const m of docents) {
    // only the exhibits they actually present (lane:staff, S05-05: a docent with nothing assigned covers nothing)
    reach += m.tankIds.filter((id) => state.tanks[id]).length;
    quality += 0.55 + 0.1 * clamp(m.skill, 1, 5);
    if (m.trait === 'great_with_kids') kids = true;
    if (m.trait === 'storyteller') story = true;
  }
  quality /= docents.length;
  const coverage = clamp(reach / exhibits.length, 0, 1);
  const talking = (state.staff?.talks ?? []).some((t) => hour >= t.hour && hour < t.untilHour);
  const talkMul = talking ? 1.25 : 1;
  return {
    sat: 4.5 * coverage * quality * talkMul,
    learn: 3 * coverage * quality,
    kids: kids ? 3 * coverage : 0,
    donation: 1 + (0.6 * coverage * quality + (story ? 0.25 * coverage : 0)) * talkMul,
    tip: 1 + 0.35 * coverage * quality * talkMul,
    draw: 1 + 0.065 * coverage * quality,
    coverage,
    talking,
  };
}

/** Trait copy (UI). */
export function traitLine(m: StaffMember): string {
  return STAFF_TRAITS[m.trait]?.line ?? '';
}

/** Next scheduled item for someone (UI copy): "Evening round at 5:30 PM". */
export function nextDuty(state: GameState, m: StaffMember): string {
  const h = hourOfDay(state.clock.hour);
  if (m.role === 'aquarist') {
    if (!m.tankIds.length) return 'Waiting for tanks to look after';
    const rounds = keeperRounds(state, m); // lane:staff2 — includes midday / late rounds for fast-metabolism tanks
    const next = rounds.map((r) => roundStart(m, r)).find((t) => t > h) ?? roundStart(m, 'morning');
    return `${next === roundStart(m, 'morning') && next <= h ? 'Tomorrow’s' : 'Next'} round at ${formatClock(next)}`;
  }
  if (m.role === 'stock_manager') {
    const checks = m.skill >= 3 ? STOCK_CHECKS : STOCK_CHECKS.slice(0, 1);
    const next = checks.find((t) => t > h) ?? checks[0];
    return `Next shelf check at ${formatClock(next)}`;
  }
  if (!state.facility.openToPublic) return 'No talks while the doors are closed';
  const next = TALK_HOURS.find((t) => t > h);
  return next !== undefined ? `Next talk at ${formatClock(next)}` : `First talk tomorrow at ${formatClock(TALK_HOURS[0])}`;
}

/** Plain summary of today's work ("Fed 4 tanks · 1 water change"), or null before they've done anything. */
export function todayLine(state: GameState, m: StaffMember): string | null {
  const d = m.today;
  if (!d || d.day !== dayOf(state.clock.hour)) return null;
  const parts: string[] = [];
  if (m.role === 'aquarist') {
    if (d.tanksFed.length) parts.push(`Fed ${plural(d.tanksFed.length, 'tank')}${d.feeds > d.tanksFed.length ? ` (${plural(d.feeds, 'feed')})` : ''}`);
    if (d.waterChanges) parts.push(plural(d.waterChanges, 'water change'));
    if (d.cleanings) parts.push(`${d.cleanings} × cleaning`);
    if (d.topOffs) parts.push(plural(d.topOffs, 'top-off'));
  } else if (m.role === 'stock_manager') {
    if (d.orders) parts.push(`${plural(d.orders, 'order')} · ${fmt$(d.spent)} spent`);
  } else if (d.talks) parts.push(`${plural(d.talks, 'talk')}${d.last?.tankId && state.tanks[d.last.tankId] ? ` · last at ${state.tanks[d.last.tankId].name}` : ''}`);
  return parts.length ? parts.join(' · ') : null;
}
