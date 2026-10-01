/**
 * Tank status = the worst of WATER, ANIMALS and FOOD, with one plain-language reason. OWNER: core.
 *
 * The water report alone used to set `tank.cache.status`, so a tank read "Healthy" while its betta starved. Now:
 *  - animals: starving / seriously ill / badly stressed / failing health → danger; very hungry / ill / stressed /
 *    recovering / injured → watch (same thresholds as the creature card, `creatureWellbeing`);
 *  - food: no food in stock that the tank's fed animals eat → watch; "running low" (< LOW_FOOD_MEALS meals) is exposed
 *    as `cache.foodLevel` for the HUD but does not change the status by itself.
 * Everything here is cheap (one pass over the tank's animals + the food inventory) and runs in refreshTankCache.
 */
import type { Creature, FoodDef, GameState, SpeciesDefinition, Tank } from '@/types';
import type { StatusLevel, WaterResidents } from '@/types/reports';
import { findSpecies } from '@/data/species';
import { FOODS, getFoodDef } from '@/data/catalog/foods';
import { portionForDemand, TYPICAL_MEAL_HUNGER } from './water/food';
import { effectiveBioload } from './water/env';
import { illnessDef } from './life/illness';
import { emitEvent } from './context';
import { getWaterReport } from './water';
import { creaturesInTank } from './life';
import { speciesWaterView } from './life/welfare'; // lane:fix-water — the creature card's water-harm number
import { pluralName } from './economy/util';
import { allResidents } from './residents'; // lane:perf2

const RANK: Record<StatusLevel, number> = { good: 0, watch: 1, danger: 2 };
export const worseStatus = (a: StatusLevel, b: StatusLevel): StatusLevel => (RANK[b] > RANK[a] ? b : a);

// ───────────────────────────── animals ─────────────────────────────

export type AnimalIssue = 'starving' | 'harmed_by_water' | 'dying' | 'seriously_ill' | 'badly_stressed' | 'failing' | 'very_hungry' | 'ill' | 'stressed' | 'injured' | 'recovering';

/** Thresholds mirror creatureWellbeing (src/sim/life/index.ts) so the card and the tank bar always agree. */
export const ANIMAL_THRESHOLDS = {
  starvingHunger: 90,
  hungryHunger: 70,
  dyingHealth: 25,
  failingHealth: 40,
  recoveringHealth: 75,
  seriousIllness: 60,
  badStress: 80,
  stress: 55,
  injury: 20,
  /** lane:fix-water — water harm (health points per game hour) the creature card calls DANGER (creatureWellbeing). */
  waterHarmHp: 0.05,
} as const;

const ISSUE_ORDER: AnimalIssue[] = ['starving', 'harmed_by_water', 'dying', 'seriously_ill', 'failing', 'badly_stressed', 'very_hungry', 'ill', 'stressed', 'injured', 'recovering'];
const DANGER_ISSUES = new Set<AnimalIssue>(['starving', 'harmed_by_water', 'dying', 'seriously_ill', 'failing', 'badly_stressed']);

export interface AnimalStatus {
  status: StatusLevel;
  issue: AnimalIssue | null;
  /** "Ember is starving — feed right away." / "3 animals are starving — feed right away." */
  reason: string | null;
  /** Animals sharing the headline issue (worst first). */
  creatureIds: string[];
}

function issueOf(c: Creature): AnimalIssue | null {
  const s = c.stats;
  const T = ANIMAL_THRESHOLDS;
  if (s.hunger >= T.starvingHunger) return 'starving';
  if (s.health < T.dyingHealth) return 'dying';
  if (c.illness && c.illness.severity > T.seriousIllness) return 'seriously_ill';
  if (s.health < T.failingHealth) return 'failing';
  if (s.stress > T.badStress) return 'badly_stressed';
  if (s.hunger >= T.hungryHunger) return 'very_hungry';
  if (c.illness) return 'ill';
  if (s.stress > T.stress) return 'stressed';
  if ((c.life?.injury ?? 0) > T.injury) return 'injured';
  if (s.health < T.recoveringHealth) return 'recovering';
  return null;
}

function who(creatures: Pick<Creature, 'name' | 'speciesId'>[]): { subject: string; plural: boolean } {
  if (creatures.length === 1) return { subject: creatures[0].name, plural: false };
  const species = new Set(creatures.map((c) => c.speciesId));
  if (species.size === 1) {
    const sp = findSpecies(creatures[0].speciesId);
    return { subject: `${creatures.length} ${sp ? pluralName(sp.commonName).toLowerCase() : 'animals'}`, plural: true };
  }
  return { subject: `${creatures.length} animals`, plural: true };
}

function issueText(issue: AnimalIssue, list: Creature[]): string {
  const { subject, plural } = who(list);
  const is = plural ? 'are' : 'is';
  const first = list[0];
  switch (issue) {
    case 'starving':
      return `${subject} ${is} starving — feed right away.`;
    case 'harmed_by_water':
      return `${subject} ${is} being harmed by the water.`;
    case 'dying':
      return `${subject} ${is} gravely weak — health is failing fast.`;
    case 'seriously_ill': {
      const sp = findSpecies(first.speciesId);
      const def = first.illness ? illnessDef(first.illness.kind) : undefined;
      const name = def && sp ? def.name(sp) : 'an illness';
      return plural ? `${subject} are seriously ill — treat them now.` : `${subject} is seriously ill with ${name} — treat it now.`;
    }
    case 'failing':
      return plural ? `${subject} are in poor health.` : `${subject}’s health is failing (${Math.round(first.stats.health)}%).`;
    case 'badly_stressed':
      return `${subject} ${is} badly stressed.`;
    case 'very_hungry':
      return `${subject} ${is} very hungry — time to feed.`;
    case 'ill': {
      const sp = findSpecies(first.speciesId);
      const def = first.illness ? illnessDef(first.illness.kind) : undefined;
      return plural || !def || !sp ? `${subject} ${is} unwell.` : `${subject} has ${def.name(sp)}.`;
    }
    case 'stressed':
      return `${subject} ${is} stressed.`;
    case 'injured':
      return `${subject} ${is} healing from injuries.`;
    case 'recovering':
      return plural ? `${subject} are recovering their health.` : `${subject} is recovering (${Math.round(first.stats.health)}% health).`;
  }
}

/** Worst animal-welfare problem in a tank (living animals only). */
export function animalStatus(creatures: Creature[]): AnimalStatus {
  const buckets = new Map<AnimalIssue, Creature[]>();
  for (const c of creatures) {
    if (c.status !== 'alive' && c.status !== 'listed') continue;
    const i = issueOf(c);
    if (!i) continue;
    let b = buckets.get(i);
    if (!b) buckets.set(i, (b = []));
    b.push(c);
  }
  for (const issue of ISSUE_ORDER) {
    const list = buckets.get(issue);
    if (!list?.length) continue;
    list.sort((a, b) => b.stats.hunger - a.stats.hunger || a.stats.health - b.stats.health || (a.id < b.id ? -1 : 1));
    return { status: DANGER_ISSUES.has(issue) ? 'danger' : 'watch', issue, reason: issueText(issue, list), creatureIds: list.map((c) => c.id) };
  }
  return { status: 'good', issue: null, reason: null, creatureIds: [] };
}

// ───────────────────────────── food in stock ─────────────────────────────

/** Fewer typical meals than this (≈ two game days of twice-daily feeding) counts as "running low". */
export const LOW_FOOD_MEALS = 4;

export interface FoodOutlook {
  level: 'ok' | 'low' | 'out';
  /** Typical meals left for the neediest fed species here (Infinity when nothing here needs feeding). */
  meals: number;
  /** Servings in stock of foods those animals eat. */
  servings: number;
  /** Residents affected (out: nothing they eat; low: fewer than LOW_FOOD_MEALS meals). */
  names: string[];
  speciesIds: string[];
  /** Foods in stock that the affected animals eat. */
  foodIds: string[];
  /** Best food to restock (what the player already uses first, then cheapest per serving that is unlocked). */
  restockId: string | null;
  /** "No food left that Ember eats" / "Food for Ember is running low (about 2 meals left)". */
  text: string | null;
}

const OK_OUTLOOK: FoodOutlook = { level: 'ok', meals: Infinity, servings: 0, names: [], speciesIds: [], foodIds: [], restockId: null, text: null };

/**
 * Animals that live off light or biofilm/algae don't depend on the food cupboard. lane:fix-water — only the true
 * self-feeders (otos, nerites, shrimp… flagged `needsAlgaeOrBiofilm`, which forage the film at ~10 hunger points an
 * hour in forageSubstep). A fish that merely lists biofilm (endlers, mollies, bristlenose) gets a few points an hour
 * from the shared film and starves in a week without fed food, so it counts for the low / out-of-food warnings.
 */
export function needsFedFood(sp: SpeciesDefinition): boolean {
  if (sp.diet === 'photosynthetic') return false;
  return !(sp.special?.needsAlgaeOrBiofilm && sp.foods.includes('biofilm'));
}

const eatsRaw = (sp: SpeciesDefinition, f: FoodDef) => f.tags.some((t) => sp.foods.includes(t));
/** lane:perf2 — memoised per (species, food) definition object (pure over static catalog data; hot in foodPerRound). */
const EATS = new WeakMap<SpeciesDefinition, Map<FoodDef, boolean>>();
const eats = (sp: SpeciesDefinition, f: FoodDef): boolean => {
  let m = EATS.get(sp);
  if (!m) EATS.set(sp, (m = new Map()));
  let v = m.get(f);
  if (v === undefined) m.set(f, (v = eatsRaw(sp, f)));
  return v;
};
const foodUnlocked = (state: GameState, f: FoodDef) => !f.unlock || state.progress.unlocked.includes(f.unlock);

interface Resident {
  c: Creature;
  sp: SpeciesDefinition;
}
/** Fed residents (alive or listed, not self-feeding) by tank — one pass over the creatures. */
export type ResidentIndex = Map<string, Resident[]>;

export function fedResidentIndex(state: GameState): ResidentIndex {
  const idx: ResidentIndex = new Map();
  for (const c of allResidents(state)) { // lane:perf2 — alive + listed, Object.values order (per-step index in a step)
    if (!c.tankId) continue;
    const sp = findSpecies(c.speciesId);
    if (!sp || !needsFedFood(sp)) continue;
    let l = idx.get(c.tankId);
    if (!l) idx.set(c.tankId, (l = []));
    l.push({ c, sp });
  }
  return idx;
}

/**
 * Servings of each food one feeding round takes across every tank whose fed animals eat it (a typical meal at
 * TYPICAL_MEAL_HUNGER, sized exactly like the default feed). Tanks share the cupboard, so three betta tanks empty a
 * bag three times as fast.
 */
export function foodPerRound(state: GameState, index: ResidentIndex = fedResidentIndex(state)): Map<string, number> {
  const perRound = new Map<string, number>();
  const stocked = Object.entries(state.inventory.foods ?? {}).filter(([, n]) => n > 0);
  if (!stocked.length) return perRound;
  for (const [tankId, residents] of index) {
    if (!state.tanks[tankId]) continue;
    // lane:perf2 — each resident's meal size once per tank, not once per stocked food (same values, same sum order).
    const meal = residents.map((r) => effectiveBioload(r.sp, r.c.sizeCm) * TYPICAL_MEAL_HUNGER);
    for (const [foodId] of stocked) {
      const f = getFoodDef(foodId);
      if (!f) continue;
      let demand = 0;
      const species = new Set<string>();
      for (let i = 0; i < residents.length; i++) {
        const r = residents[i];
        if (!eats(r.sp, f)) continue;
        demand += meal[i];
        species.add(r.sp.id);
      }
      if (!species.size) continue;
      perRound.set(foodId, (perRound.get(foodId) ?? 0) + portionForDemand(f, demand, species.size));
    }
  }
  return perRound;
}

/**
 * lane:fix-water — how well a food suits this species, the way pickStaffFood (staff/work.ts) judges it: a food made
 * for another animal (goldfish or axolotl pellets, marine foods in fresh water) barely counts even when its tags
 * technically match, and a food with many tags the species doesn't eat (big pellets for small fish) counts less.
 */
function foodFit(sp: SpeciesDefinition, f: FoodDef): number {
  const wrongKind =
    (/^marine_/.test(f.id) && sp.environment !== 'marine') || (/^axolotl_/.test(f.id) && sp.id !== 'axolotl') || (/^goldfish_/.test(f.id) && !/goldfish/.test(sp.id));
  const tagFit = f.tags.filter((t) => sp.foods.includes(t)).length / Math.max(1, f.tags.length);
  return (wrongKind ? 0.2 : 1) * (0.6 + 0.4 * tagFit);
}

/**
 * The food to suggest for these animals: each species' own best buy (suits it, a staple over a small-pack treat,
 * something the player already uses, then cheapest per serving — the keeper's own ranking), and among those picks the
 * one that feeds the most of them; ties go to the neediest (first) species. It used to be "whatever's tags cover the
 * most species", which sent tetra + corydoras and axolotl tanks to the goldfish pellets.
 */
function restockFor(state: GameState, species: SpeciesDefinition[]): string | null {
  const known = new Set(Object.keys(state.inventory.foods ?? {}));
  const picks: FoodDef[] = [];
  for (const sp of species) {
    let best: { f: FoodDef; score: number } | null = null;
    for (const f of FOODS) {
      if (!eats(sp, f) || !foodUnlocked(state, f)) continue;
      const perServing = f.price / Math.max(1, f.servingsPerPack);
      const score = foodFit(sp, f) * 10 + (f.servingsPerPack > 24 ? 3 : 0) + (known.has(f.id) ? 5 : 0) - Math.min(4, perServing * 4);
      if (!best || score > best.score) best = { f, score };
    }
    if (best && !picks.includes(best.f)) picks.push(best.f);
  }
  let bestPick: { f: FoodDef; covers: number } | null = null;
  for (const f of picks) {
    const covers = species.filter((sp) => eats(sp, f)).length;
    if (!bestPick || covers > bestPick.covers) bestPick = { f, covers };
  }
  return bestPick?.f.id ?? null;
}

function listNames(names: string[]): string {
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

/** Is anyone in this tank about to go hungry because the cupboard is (nearly) bare? */
export function tankFoodOutlook(state: GameState, tankId: string, pre?: { index: ResidentIndex; perRound: Map<string, number> }): FoodOutlook {
  const index = pre?.index ?? fedResidentIndex(state);
  const residents = (index.get(tankId) ?? []).map((r) => r.c);
  if (!residents.length) return OK_OUTLOOK;
  const perRound = pre?.perRound ?? foodPerRound(state, index);
  const foods = state.inventory.foods ?? {};
  const bySpecies = new Map<string, Creature[]>();
  for (const c of residents) {
    let l = bySpecies.get(c.speciesId);
    if (!l) bySpecies.set(c.speciesId, (l = []));
    l.push(c);
  }
  let worstMeals = Infinity;
  let level: FoodOutlook['level'] = 'ok';
  const out: Creature[] = [];
  const low: Creature[] = [];
  const needy: SpeciesDefinition[] = [];
  const stockedFor = new Set<string>();
  let servingsForNeedy = 0;
  for (const [sid, list] of bySpecies) {
    const sp = findSpecies(sid);
    if (!sp) continue;
    let meals = 0;
    let servings = 0;
    const ids: string[] = [];
    for (const [foodId, nRaw] of Object.entries(foods)) {
      const n = Math.floor(nRaw ?? 0);
      if (n <= 0) continue;
      const f = getFoodDef(foodId);
      if (!f || !eats(sp, f)) continue;
      servings += n;
      ids.push(foodId);
      meals += n / Math.max(1, perRound.get(foodId) ?? 1);
    }
    worstMeals = Math.min(worstMeals, meals);
    if (servings <= 0) {
      out.push(...list);
      needy.push(sp);
    } else if (meals < LOW_FOOD_MEALS) {
      low.push(...list);
      needy.push(sp);
      servingsForNeedy += servings;
      for (const id of ids) stockedFor.add(id);
    }
  }
  if (out.length) level = 'out';
  else if (low.length) level = 'low';
  if (level === 'ok') return { ...OK_OUTLOOK, meals: worstMeals };
  const affected = level === 'out' ? out : low;
  const names = affected.map((c) => c.name);
  const subject = affected.length > 3 && new Set(affected.map((c) => c.speciesId)).size === 1 ? `your ${pluralName(needy[0].commonName).toLowerCase()}` : listNames(names);
  const verb = affected.length === 1 ? 'eats' : 'eat';
  const mealsLeft = Math.max(1, Math.floor(worstMeals));
  const text = level === 'out' ? `No food left that ${subject} ${verb}` : `Food for ${subject} is running low (about ${mealsLeft} meal${mealsLeft === 1 ? '' : 's'} left)`;
  return {
    level,
    meals: level === 'out' ? 0 : worstMeals,
    servings: level === 'out' ? 0 : servingsForNeedy,
    names,
    speciesIds: needy.map((sp) => sp.id),
    foodIds: [...stockedFor],
    restockId: restockFor(state, needy),
    text,
  };
}

/** Food outlook for every tank (one shared per-round estimate). */
export function foodOutlookAll(state: GameState): Record<string, FoodOutlook> {
  const index = fedResidentIndex(state);
  const perRound = foodPerRound(state, index);
  const out: Record<string, FoodOutlook> = {};
  for (const id of state.tankOrder) if (state.tanks[id]) out[id] = tankFoodOutlook(state, id, { index, perRound });
  return out;
}

// ───────────────────────────── composite status ─────────────────────────────

/** Issues that are usually a CONSEQUENCE of bad water (so the water headline explains them better). */
const WATER_CONSEQUENCES = new Set<AnimalIssue | null>(['dying', 'failing', 'badly_stressed', 'stressed', 'recovering']);

/**
 * lane:fix-water — the creature card says DANGER as soon as the water is costing an animal health (harm above
 * ANIMAL_THRESHOLDS.waterHarmHp), which starts at the report's WATCH line; the tank bar used to stay at "watch" for that
 * whole band while every card in the tank was red. The water report lists who it is harming; this folds that into the
 * animals' status ahead of everything but starvation, with the water headline as the explanation.
 */
function withWaterHarm(tank: Tank, animals: AnimalStatus, water: { headline: string; residents?: WaterResidents[] }): AnimalStatus {
  if (!water.residents?.length || animals.issue === 'starving') return animals;
  const hurt = water.residents.filter((r) => {
    const sp = findSpecies(r.speciesId);
    return sp ? speciesWaterView(sp, tank).harm > ANIMAL_THRESHOLDS.waterHarmHp : false;
  });
  if (!hurt.length) return animals;
  const list = hurt.flatMap((h) => h.creatureIds.map((id, i) => ({ id, name: h.names[i] ?? h.speciesId, speciesId: h.speciesId })));
  const { subject, plural } = who(list);
  return {
    status: 'danger',
    issue: 'harmed_by_water',
    reason: `${subject} ${plural ? 'are' : 'is'} being harmed by the water — ${water.headline.charAt(0).toLowerCase()}${water.headline.slice(1)}.`,
    creatureIds: list.map((x) => x.id),
  };
}

/**
 * Combine water, animals and food into `cache.status` + reasons. `water` is the water report (its status, one-line
 * headline and, when present, who it is harming). Pure over its inputs; writes only tank.cache.
 */
export function composeTankStatus(tank: Tank, water: { status: StatusLevel; headline: string; residents?: WaterResidents[] }, animalsIn: AnimalStatus, food: FoodOutlook): void {
  const c = tank.cache;
  const animals = withWaterHarm(tank, animalsIn, water);
  c.waterStatus = water.status;
  c.animalStatus = animals.status;
  c.foodLevel = food.level;
  const foodStatus: StatusLevel = food.level === 'out' ? 'watch' : 'good';
  const status = worseStatus(worseStatus(water.status, animals.status), foodStatus);
  c.status = status;
  const reasons: { source: 'water' | 'animals' | 'food'; level: StatusLevel; text: string; pri: number }[] = [];
  if (water.status !== 'good') reasons.push({ source: 'water', level: water.status, text: water.headline, pri: 0 });
  if (animals.status !== 'good' && animals.reason) {
    // Starvation and illness aren't explained by the water; weakness and stress next to bad water usually are.
    const waterFirst = water.status === animals.status && WATER_CONSEQUENCES.has(animals.issue);
    reasons.push({ source: 'animals', level: animals.status, text: animals.reason, pri: waterFirst ? 1 : -1 });
  }
  if (food.level !== 'ok' && food.text) reasons.push({ source: 'food', level: foodStatus, text: `${food.text}.`, pri: 2 });
  reasons.sort((a, b) => RANK[b.level] - RANK[a.level] || a.pri - b.pri);
  if (status === 'good' || !reasons.length) {
    delete c.statusReason;
    delete c.statusSource;
    c.statusReasons = reasons.map((r) => r.text);
    if (!c.statusReasons.length) delete c.statusReasons;
    return;
  }
  c.statusReason = reasons[0].text;
  c.statusSource = reasons[0].source;
  c.statusReasons = reasons.map((r) => r.text);
}

/** Water-only status for systems that are really about the water (market "water crashed", water-streak quest). */
export function tankWaterStatus(tank: Tank | undefined): StatusLevel {
  return tank?.cache?.waterStatus ?? tank?.cache?.status ?? 'good';
}

// ───────────────────────────── low-food warnings ─────────────────────────────

/**
 * Food toasts at most this often (game hours) across all tanks — "running low" about every two game days (8 real
 * minutes at 1×), "out" once a game day. Every transition is still logged (once per food per restock cycle).
 */
const FOOD_TOAST_GAP_H = { low: 48, out: 24 } as const;
/**
 * "Running low" toasts the first few times (it teaches the HUD's food alert); after that it is logged and shown in the
 * HUD alerts only. "Out of food" always toasts (throttled above).
 */
const FOOD_LOW_TOASTS = 2;
/** Another tank running low on the same food within this many game hours is not logged again. */
const FOOD_LOG_DEDUPE_H = 12;

/**
 * Log (and toast, throttled) when a tank's fed animals are running low on food or have run out. Fires on the
 * transition only (ok → low, → out); re-arms once the cupboard is restocked. Showcase worlds stay quiet.
 */
export function noteFoodLevel(state: GameState, tank: Tank, food: FoodOutlook): void {
  if (state.isShowcase || state.offlineGrace) return;
  const lab = (tank.water.lab ??= {});
  const warned = (lab.warned ??= {});
  const hour = state.clock.hour;
  if (food.level === 'ok') {
    delete warned.food_low;
    delete warned.food_out;
    return;
  }
  const key = food.level === 'out' ? 'food_out' : 'food_low';
  if (warned[key] !== undefined) return;
  warned[key] = hour;
  if (food.level === 'out') warned.food_low ??= hour;
  const counters = state.progress.counters;
  // Tanks share the cupboard: when several tanks run low on the same food, one log line covers them all.
  const logKey = `_foodLog:${food.level}:${food.restockId ?? 'any'}`;
  if (hour - (counters[logKey] ?? -1e9) < FOOD_LOG_DEDUPE_H) return;
  counters[logKey] = hour;
  const toastKey = food.level === 'out' ? '_foodOutToastHour' : '_foodLowToastHour';
  const toast = hour - (counters[toastKey] ?? -1e9) >= FOOD_TOAST_GAP_H[food.level] && (food.level === 'out' || (counters._foodLowToasts ?? 0) < FOOD_LOW_TOASTS);
  if (toast) {
    counters[toastKey] = hour;
    if (food.level === 'low') counters._foodLowToasts = (counters._foodLowToasts ?? 0) + 1;
  }
  const restock = food.restockId ? getFoodDef(food.restockId)?.name.toLowerCase() : null;
  const buy = restock ? ` Buy ${restock} in Market › Supplies.` : ' Buy food in Market › Supplies.';
  emitEvent(state, {
    kind: food.level === 'out' ? 'danger' : 'warning',
    text: `${food.text}.${buy}`,
    tankId: tank.id,
    toast,
  });
}

/**
 * Re-derive food levels right away after the cupboard changed (a feed, a purchase, a reward). The cupboard is shared,
 * so one feed can change what every tank has left. Only tanks whose food level changed are recomposed. With
 * `notify`, low/out transitions are logged (throttled toasts) immediately instead of at the tank's next step.
 */
export function refreshFoodStatus(state: GameState, opts: { notify?: boolean } = {}): void {
  const index = fedResidentIndex(state);
  const perRound = foodPerRound(state, index);
  for (const id of state.tankOrder) {
    const tank = state.tanks[id];
    if (!tank?.cache) continue;
    try {
      const food = tankFoodOutlook(state, id, { index, perRound });
      if (tank.cache.waterStatus && tank.cache.foodLevel !== food.level) {
        composeTankStatus(tank, getWaterReport(state, id), animalStatus(creaturesInTank(state, id)), food);
      }
      if (opts.notify) noteFoodLevel(state, tank, food);
    } catch {
      /* derived only — never block the action that changed the cupboard */
    }
  }
}
