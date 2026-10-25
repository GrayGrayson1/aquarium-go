/**
 * What an automatic feeder can and cannot feed. OWNER: lane "fit".
 *
 * Real aquarium autofeeders dispense DRY food only (flakes, pellets, wafers, dried seaweed — `isAutofeederFood` in
 * src/data/catalog/foods.ts). Frozen food must be thawed and live food must stay alive, so animals that eat only those
 * (seahorses, pea puffers, bumblebee gobies…) always need feeding by hand. The feeder has one hopper: each feeding it
 * drops the dry food in stock that does the most good — see pickAutofeedFood.
 *
 * Pure functions over catalog data only (no game state, no RNG), so the water sim (`runAutofeeder` in
 * src/sim/water/step.ts), the fit verdicts (./fit.ts) and any UI can share them without import cycles.
 */
import type { EquipmentInstance, FoodDef, FoodTag, SpeciesDefinition } from '@/types';
import { FOODS, foodForm, isAutofeederFood, autofeedFoodsForTags, eatsFood, madeForOtherSpecies, madeForOtherWater } from '@/data/catalog/foods';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { pluralName } from '../economy/util';

export { isAutofeederFood, eatsFood };

/** Plain words for food tags in running text ("live copepods", not "copepod_live"). */
export const FOOD_TAG_WORDS: Partial<Record<FoodTag, string>> = {
  flake: 'flakes',
  pellet_small: 'small pellets',
  pellet_sinking: 'sinking pellets',
  pellet_large: 'large pellets',
  bloodworm: 'bloodworms',
  brine_shrimp: 'brine shrimp',
  mysis: 'mysis',
  daphnia: 'daphnia',
  earthworm: 'earthworms',
  snail_live: 'live snails',
  algae_wafer: 'algae wafers',
  vegetable: 'vegetables',
  nori: 'seaweed',
  copepod_live: 'live copepods',
  coral_food: 'coral food',
  infusoria: 'infusoria',
  baby_brine: 'baby brine shrimp',
};

/** Every dry (autofeeder) food, in catalog order. */
export function autofeederFoods(): FoodDef[] {
  return FOODS.filter((f) => isAutofeederFood(f));
}

/** Dry foods this species eats (empty = an autofeeder can never feed it). One rule with the guide: autofeedFoodsForTags. */
export function autofeedFoodsFor(sp: Pick<SpeciesDefinition, 'foods'>): FoodDef[] {
  return autofeedFoodsForTags(sp.foods);
}

/** A food made for another animal or water (the catalog's `madeFor`): axolotl / goldfish pellets for anyone else, marine pellets in fresh water. */
const wrongKind = (f: FoodDef, sp: Pick<SpeciesDefinition, 'id' | 'environment'>) => madeForOtherSpecies(f, sp.id) || madeForOtherWater(f, sp.environment);

/**
 * Dry foods to offer these species (first two, de-duplicated), skipping foods made for someone else — axolotl or
 * goldfish pellets for corydoras, marine pellets in fresh water — the way a keeper would (cf. pickStaffFood).
 */
export function suitedDryFoods(species: readonly Pick<SpeciesDefinition, 'id' | 'foods' | 'environment'>[], max = 2): FoodDef[] {
  const out: FoodDef[] = [];
  for (const sp of species) {
    const all = autofeedFoodsFor(sp);
    const good = all.filter((f) => !wrongKind(f, sp));
    for (const f of good.length ? good : all) if (!out.some((x) => x.id === f.id)) out.push(f);
  }
  return out.slice(0, max);
}

/** Can an autofeeder feed this species at all (does it eat any dry food)? */
export function canAutofeed(sp: Pick<SpeciesDefinition, 'foods'>): boolean {
  return autofeedFoodsForTags(sp.foods).length > 0;
}

/**
 * "frozen or live food (mysis, brine shrimp, live copepods)" — what a non-dry eater actually takes, for sentences like
 * "Lined seahorses only eat …". Forms come from the catalog foods it eats; the examples are its own diet tags.
 */
export function handFoodPhrase(sp: Pick<SpeciesDefinition, 'foods'>, maxExamples = 3): string {
  const forms = new Set(FOODS.filter((f) => eatsFood(sp, f) && !isAutofeederFood(f)).map((f) => foodForm(f)));
  const order = ['frozen', 'live', 'fresh', 'prepared'] as const;
  const list = order.filter((f) => forms.has(f));
  const kinds = list.length ? `${list.slice(0, 2).join(' or ')} food` : 'food an autofeeder can’t hold';
  // examples: the diet tags only frozen / live / fresh foods carry (never "flakes" or "large pellets" here)
  const handOnly = (t: FoodTag) => FOODS.some((f) => f.tags.includes(t)) && FOODS.every((f) => !f.tags.includes(t) || !isAutofeederFood(f));
  const words = sp.foods.filter(handOnly).map((t) => FOOD_TAG_WORDS[t]).filter((w): w is string => !!w);
  const ex = [...new Set(words)].slice(0, maxExamples);
  return ex.length ? `${kinds} (${ex.join(', ')})` : kinds;
}

/** How much feeding an animal of this species needs: a well-fed adult's food per game hour (bioload over hungerHours). */
const feedNeed = (sp: Pick<SpeciesDefinition, 'bioload' | 'hungerHours'>) =>
  Math.max(0.001, Number.isFinite(sp.bioload) ? sp.bioload : 1) / Math.max(1, Number.isFinite(sp.hungerHours) ? sp.hungerHours : 24);

/**
 * The food the autofeeder drops next: the dry food in stock that feeds the most need among `eaters` (one entry per
 * animal, so a school outweighs a single fish). B-211, the owner (ADR-0052 decision 12): each animal's vote is weighed
 * by how much feeding it needs (feedNeed), so twenty small snails can't outvote the fish; and a food made for another
 * animal or water (axolotl pellets in a reef) counts for nobody while a fitting dry food is in stock, and is dropped
 * only when nothing else suits. Ties keep catalog order. Null when no dry food in stock suits anyone.
 * This IS the sim's pick — src/sim/water/step.ts calls it.
 */
export function pickAutofeedFood(
  stock: Readonly<Record<string, number | undefined>>,
  eaters: readonly Pick<SpeciesDefinition, 'id' | 'foods' | 'environment' | 'bioload' | 'hungerHours'>[],
): string | null {
  const pick = (fittingOnly: boolean): string | null => {
    let best: string | null = null;
    let bestScore = 0;
    for (const f of FOODS) {
      if (!isAutofeederFood(f)) continue;
      if ((stock[f.id] ?? 0) < 1) continue;
      let score = 0;
      for (const sp of eaters) if (eatsFood(sp, f) && !(fittingOnly && wrongKind(f, sp))) score += feedNeed(sp);
      if (score > bestScore + 1e-12) {
        bestScore = score;
        best = f.id;
      }
    }
    return best;
  };
  return pick(true) ?? pick(false);
}

export interface AutofeedPlan {
  /** The dry food it would drop next from the current stock (null: nothing suitable in stock, or nobody eats dry food). */
  foodId: string | null;
  /** Species (unique, in tank order) that eat the food it drops. */
  fed: SpeciesDefinition[];
  /** Species that eat some dry food, just not the one it drops (one hopper, one food per feeding). */
  wrongFood: SpeciesDefinition[];
  /** Species that eat no dry food at all — frozen or live only. An autofeeder can never feed them. */
  cannot: SpeciesDefinition[];
  /** Dry foods to buy (best coverage first, at most 2) for the dry-food eaters it isn't feeding now. */
  buy: FoodDef[];
}

/** Who the autofeeder feeds in a tank with these animals (one species entry per animal) and this food stock. */
export function planAutofeed(stock: Readonly<Record<string, number | undefined>>, eaters: readonly SpeciesDefinition[]): AutofeedPlan {
  const foodId = pickAutofeedFood(stock, eaters);
  const food = foodId ? FOODS.find((f) => f.id === foodId) : undefined;
  const unique: SpeciesDefinition[] = [];
  for (const sp of eaters) if (!unique.some((u) => u.id === sp.id)) unique.push(sp);
  const fed: SpeciesDefinition[] = [];
  const wrongFood: SpeciesDefinition[] = [];
  const cannot: SpeciesDefinition[] = [];
  for (const sp of unique) {
    if (!canAutofeed(sp)) cannot.push(sp);
    else if (food && eatsFood(sp, food)) fed.push(sp);
    else wrongFood.push(sp);
  }
  // What to buy for the dry-food eaters left out: the dry foods covering most of them (cheapest first on a tie).
  const buy = wrongFood.length
    ? autofeederFoods()
        .map((f) => ({ f, n: wrongFood.filter((sp) => eatsFood(sp, f)).length, odd: wrongFood.some((sp) => eatsFood(sp, f) && wrongKind(f, sp)) ? 1 : 0 }))
        .filter((x) => x.n > 0)
        .sort((a, b) => a.odd - b.odd || b.n - a.n || a.f.price - b.f.price)
        .slice(0, 2)
        .map((x) => x.f)
    : [];
  return { foodId, fed, wrongFood, cannot, buy };
}

// ───────────────────────────── Sentences (shared by the sim log and the fit hints) ─────────────────────────────

/** One species in a tank: how many, and the animal's own name when it is alone. */
export interface EaterGroup {
  sp: SpeciesDefinition;
  count: number;
  /** The creature's name when count is 1 ("Ember"). */
  name?: string;
}

const lc = (s: string) => s.toLowerCase();
const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const joinOr = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);

/** Group animals by species (tank order), naming a lone animal. */
export function groupEaters(animals: readonly { species: SpeciesDefinition; creature?: { name?: string } }[]): EaterGroup[] {
  const out: EaterGroup[] = [];
  for (const a of animals) {
    const g = out.find((x) => x.sp.id === a.species.id);
    if (g) {
      g.count += 1;
      delete g.name;
    } else out.push({ sp: a.species, count: 1, name: a.creature?.name || undefined });
  }
  return out;
}

/** "your 3 lined seahorses" · "Ember the lined seahorse" · "your lined seahorse". */
export function whoPhrase(g: EaterGroup): string {
  if (g.count > 1) return `your ${g.count} ${pluralName(g.sp.commonName)}`;
  return g.name ? `${g.name} the ${lc(g.sp.commonName)}` : `your ${lc(g.sp.commonName)}`;
}

/** Species-level short form for lists and badges: "3 lined seahorses" / "lined seahorse". */
export function whoShort(g: EaterGroup): string {
  return g.count > 1 ? `${g.count} ${pluralName(g.sp.commonName)}` : lc(g.sp.commonName);
}

const isPlural = (gs: readonly EaterGroup[]) => gs.length > 1 || (gs[0]?.count ?? 0) > 1;
const them = (gs: readonly EaterGroup[]) => (isPlural(gs) ? 'them' : 'it');
const handAdvice = (gs: readonly EaterGroup[]) =>
  gs.some((g) => g.sp.feedingStyle === 'target_fed' || g.sp.feedingSpeed < 0.3) ? `feed ${them(gs)} by hand or target-feed` : `feed ${them(gs)} by hand`;

/**
 * "Your 3 lined seahorses only eat frozen or live food (mysis, brine shrimp, live copepods)" — for animals that eat
 * no dry food. Several species share one phrase built from all their diets.
 */
export function onlyHandFoodClause(gs: readonly EaterGroup[]): string {
  if (!gs.length) return '';
  const foods = [...new Set(gs.flatMap((g) => g.sp.foods))];
  return `${joinAnd(gs.map(whoPhrase))} only ${isPlural(gs) ? 'eat' : 'eats'} ${handFoodPhrase({ foods }, gs.length > 1 ? 4 : 3)}`;
}

/** Player-facing sentence for animals an autofeeder can never feed, with what to do instead. */
export function cannotAutofeedText(gs: readonly EaterGroup[]): string {
  if (!gs.length) return '';
  return `${capFirst(onlyHandFoodClause(gs))}, so an autofeeder can’t feed ${them(gs)} — ${handAdvice(gs)}.`;
}

export interface AutofeedMessage {
  kind: 'useless' | 'misses' | 'empty';
  text: string;
}

/**
 * The water sim's autofeeder notices (src/sim/water/step.ts):
 * - 'useless' — nobody in the tank eats dry food (it can never feed them);
 * - 'misses'  — it feeds some animals, but others need frozen/live food or a different dry food;
 * - 'empty'   — the dry food the animals eat has run out (buy it).
 * Null when everyone is fed by what it drops.
 */
export function autofeedMessage(tankName: string, plan: AutofeedPlan, groups: readonly EaterGroup[], opts: { keeperName?: string } = {}): AutofeedMessage | null {
  const pick = (list: SpeciesDefinition[]) => groups.filter((g) => list.some((s) => s.id === g.sp.id));
  const cannot = pick(plan.cannot);
  const wrong = pick(plan.wrongFood);
  const fed = pick(plan.fed);
  const keeper = opts.keeperName ? ` ${opts.keeperName} hand-feeds this tank, so they won’t go hungry.` : '';
  if (!plan.foodId && !wrong.length && !fed.length) {
    if (!cannot.length) return null;
    return {
      kind: 'useless',
      text: `The autofeeder on ${tankName} can’t feed anything here: ${onlyHandFoodClause(cannot)}, and an autofeeder holds dry food only. ${capFirst(handAdvice(cannot))} — you can remove the autofeeder or move it to a tank of flake or pellet eaters.${keeper}`,
    };
  }
  if (!plan.foodId) {
    const buy = plan.buy.map((f) => f.name);
    const also = cannot.length ? ` (${capFirst(joinAnd(cannot.map(whoPhrase)))} need${isPlural(cannot) ? '' : 's'} frozen or live food by hand either way.)` : '';
    return {
      kind: 'empty',
      text: `The autofeeder on ${tankName} is out of dry food ${joinAnd(wrong.map(whoPhrase))} ${isPlural(wrong) ? 'eat' : 'eats'}${buy.length ? ` — buy ${joinOr(buy)} in Market › Supplies` : ''}.${also}`,
    };
  }
  if (!cannot.length && !wrong.length) return null;
  const food = FOODS.find((f) => f.id === plan.foodId);
  const parts: string[] = [];
  if (cannot.length) parts.push(`${capFirst(onlyHandFoodClause(cannot))} — ${handAdvice(cannot)}.`);
  if (wrong.length && food) {
    const alt = suitedDryFoods(wrong.map((g) => g.sp)).map((f) => lc(f.name));
    parts.push(`${capFirst(joinAnd(wrong.map(whoPhrase)))} ${isPlural(wrong) ? 'don’t' : 'doesn’t'} eat ${lc(food.name)} — give ${them(wrong)} ${joinOr(alt)} by hand.`);
  }
  return {
    kind: 'misses',
    text: `The autofeeder on ${tankName} only feeds ${fed.length ? joinAnd(fed.map(whoPhrase)) : 'some of the animals'} (it drops ${lc(food?.name ?? 'dry food')}). ${parts.join(' ')}${keeper}`,
  };
}

// ───────────────────────────── Auto-feed paused (lane:automation, 0.5 §10.2, AUTO-005) ─────────────────────────────

/** Hunger (0–100) at which a paused Auto-feed is worth an alert. */
export const AUTOFEED_PAUSED_HUNGER = 50;

/**
 * Why a tank's Autofeeder isn't feeding: switched off (or a legacy 0 meals a day), jammed, out of dry food, or held by
 * manual mode (lane:automation, chunk 5; ADR-0026 decision 15: a held one counts as paused).
 */
export type AutofeedPauseReason = 'off' | 'failed' | 'empty' | 'held';

export interface AutofeedPause {
  reason: AutofeedPauseReason;
  /** The hungriest resident (hunger ≥ AUTOFEED_PAUSED_HUNGER): the alert says "feed {name} by hand". */
  creatureId: string;
  name: string;
}

/**
 * Is the tank's Autofeeder installed but not feeding while a resident is hungry (hunger ≥ 50)? The alert row, the
 * tank's attention dot and the sim's "Auto-feed is paused" event share this rule. 'empty' counts only when someone in
 * the tank eats dry food (an autofeeder in a seahorse tank is useless, not empty: the fit line covers that).
 */
export function autofeedPause(
  equipment: readonly EquipmentInstance[] | undefined,
  inhabitants: readonly { creature: { id: string; name: string; stats?: { hunger?: number } }; species: SpeciesDefinition }[],
  stock: Readonly<Record<string, number | undefined>>,
  /** lane:automation (chunk 5) — manual mode holds the Autofeeders. */
  held = false,
): AutofeedPause | null {
  const feeders = (equipment ?? []).filter((e) => getEquipmentDef(e.defId)?.kind === 'autofeeder');
  if (!feeders.length || !inhabitants.length) return null;
  let hungry: (typeof inhabitants)[number] | null = null;
  for (const i of inhabitants) {
    const h = i.creature.stats?.hunger;
    if (typeof h === 'number' && h >= AUTOFEED_PAUSED_HUNGER && (!hungry || h > (hungry.creature.stats?.hunger ?? 0))) hungry = i;
  }
  if (!hungry) return null;
  const working = feeders.filter((e) => !e.failed);
  const running = working.filter((e) => e.on && !(typeof e.setting === 'number' && Math.round(e.setting) <= 0));
  let reason: AutofeedPauseReason | null = null;
  if (!working.length) reason = 'failed';
  else if (!running.length) reason = 'off';
  else if (held) reason = 'held';
  else if (inhabitants.some((i) => canAutofeed(i.species)) && !pickAutofeedFood(stock, inhabitants.map((i) => i.species))) reason = 'empty';
  return reason ? { reason, creatureId: hungry.creature.id, name: hungry.creature.name } : null;
}

/** The meals a day an Autofeeder is set to (0 = paused; a legacy `setting: 0` reads as off). */
export function mealsOf(e: EquipmentInstance): number {
  const v = typeof e.setting === 'number' && Number.isFinite(e.setting) ? e.setting : (getEquipmentDef(e.defId)?.stats.defaultSetting ?? 2);
  return Math.max(0, Math.min(4, Math.round(v)));
}

/** Is Auto-feed on: the Autofeeder switched on with at least one meal a day (§10.2's "installed, on")? */
export const autoFeedOn = (e: EquipmentInstance): boolean => e.on && mealsOf(e) > 0;

/**
 * B-149: the Auto-feed switch turned on from a legacy `setting: 0` also restores the def's default meals (2);
 * `setEquipment` itself is unchanged. (Moved here from the tank card in chunk 11: the `setAutoFeed` command reads it.)
 */
export function autoFeedPatch(e: EquipmentInstance, on: boolean): { on: boolean; setting?: number } {
  if (!on) return { on: false };
  return mealsOf(e) > 0 ? { on: true } : { on: true, setting: getEquipmentDef(e.defId)?.stats.defaultSetting ?? 2 };
}
