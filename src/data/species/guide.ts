/**
 * lane:guide — Keeper's guide helpers: how a species eats in keeper terms (which shop foods it takes, grouped by TYPE —
 * dry / frozen / live / fresh), whether an autofeeder can feed it, and plain care lines for flow, temperature and its
 * special needs. Pure functions over species data + the food catalog, using the sim's own suitability rule (a food
 * suits an animal when their tags intersect), so the guide never disagrees with what really happens in a tank.
 */
import type { FlowLevel, FoodDef, FoodForm, SpeciesDefinition, SpeciesSpecialNeeds } from '@/types';
import { foodForm as catalogFoodForm, foodsForTags, autofeedFoodsForTags, isAutofeederFood } from '@/data/catalog/foods';

export type { FoodForm };

export const FOOD_FORM_ORDER: FoodForm[] = ['dry', 'frozen', 'live', 'fresh', 'prepared'];

export const FOOD_FORM_LABEL: Record<FoodForm, string> = {
  dry: 'Dry',
  frozen: 'Frozen',
  live: 'Live',
  fresh: 'Fresh',
  prepared: 'Prepared',
};

/** What each form means to a keeper (tooltips). */
export const FOOD_FORM_HINT: Record<FoodForm, string> = {
  dry: 'Flakes, pellets, wafers and dried seaweed: they keep for months, and dry food is the only kind an autofeeder can hold.',
  frozen: 'Frozen cubes: thaw in a little tank water first, feed what is eaten in a few minutes, and keep the rest frozen.',
  live: 'Living prey that keeps moving until it is eaten: the best food for hunters and for fry, with little waste.',
  fresh: 'Blanched vegetables. Take out what is left within a day so it doesn’t rot.',
  prepared: 'Foods you mix or dose yourself, such as gel food. They can’t go in an autofeeder.',
};

/** Dry / frozen / live / fresh / prepared — the food catalog's own `form` (one source of truth with the sim). */
export function foodForm(food: FoodDef | string | undefined): FoodForm {
  return catalogFoodForm(food);
}

/** Can an autofeeder dispense this food? The catalog rule the water sim's autofeeder uses (dry food only). */
export function autofeederCanDispense(foodId: string): boolean {
  return isAutofeederFood(foodId);
}

/** Shop foods this species eats (the sim's rule: any shared tag). Catalog order. */
export function foodsFor(sp: Pick<SpeciesDefinition, 'foods'>): FoodDef[] {
  return foodsForTags(sp.foods);
}

/** Foods sold for the other water type: listed last, so a betta's guide says "micro pellets", not "marine pellets". */
const MARINE_FOODS = new Set(['marine_pellets']);
const FRESHWATER_FOODS = new Set(['goldfish_pellets', 'axolotl_pellets']);

/**
 * The foods a keeper would actually offer, for the guide's lists: the sim's foods minus big-predator chunks (anything
 * tagged `pellet_large`, e.g. krill & silversides, axolotl pellets) for animals that don't take large food, and minus
 * foods sold for the other water type (goldfish pellets for a clownfish) whenever something else is left. The sim
 * still accepts those; the autofeeder verdict and "in stock" checks use `foodsFor`, not this list.
 */
export function menuFor(sp: Pick<SpeciesDefinition, 'foods' | 'environment'>): FoodDef[] {
  const bigMouth = sp.foods.includes('pellet_large');
  const all = foodsFor(sp);
  const sized = all.filter((f) => bigMouth || !f.tags.includes('pellet_large'));
  const list = sized.length ? sized : all;
  const away = (f: FoodDef) => (sp.environment === 'marine' ? FRESHWATER_FOODS.has(f.id) : MARINE_FOODS.has(f.id));
  const home = list.filter((f) => !away(f));
  return home.length ? home : list;
}

export interface FoodGroup {
  form: FoodForm;
  label: string;
  foods: FoodDef[];
}

export interface AutofeederFit {
  /** 'yes': eats a dry food the autofeeder dispenses. 'no': it can't feed this animal at all. */
  level: 'yes' | 'no';
  /** The dispensable foods it eats (empty when level is 'no'). */
  foods: FoodDef[];
  /** One plain sentence for the player. */
  text: string;
}

export interface DietGuide {
  groups: FoodGroup[];
  /** Grazes biofilm/algae or scavenges detritus that grows in the tank (no shop food needed for that part). */
  forages: boolean;
  /** "dry, frozen and live food" — the forms it takes, in words. */
  formsText: string;
  autofeeder: AutofeederFit;
}

/** "a, b and c" */
export function listWords(items: string[], joiner = 'and'): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${joiner} ${items[items.length - 1]}`;
}

/** Shop name in running text: "Frozen Mysis Shrimp" → "frozen mysis shrimp". */
export function foodWord(f: FoodDef): string {
  return f.name.toLowerCase();
}

export function dietGuide(sp: SpeciesDefinition): DietGuide {
  const menu = menuFor(sp);
  const groups: FoodGroup[] = FOOD_FORM_ORDER.map((form) => ({ form, label: FOOD_FORM_LABEL[form], foods: menu.filter((f) => foodForm(f) === form) })).filter((g) => g.foods.length > 0);
  const forages = sp.foods.includes('biofilm') || sp.foods.includes('detritus');
  const formsText = groups.length ? `${listWords(groups.map((g) => g.form))} food` : 'what it finds in the tank';
  return { groups, forages, formsText, autofeeder: autofeederFit(sp, menu, groups) };
}

function autofeederFit(sp: SpeciesDefinition, menu: FoodDef[], groups: FoodGroup[]): AutofeederFit {
  // the level follows the sim's own rule — autofeedFoodsForTags in the food catalog, the same call behind `canAutofeed`
  // in src/sim/care/autofeed.ts (lane:qa-r3: one rule, no copy); the names come from the keeper's menu
  const dispensable = autofeedFoodsForTags(sp.foods);
  if (dispensable.length > 0) {
    const shown = menu.filter((f) => autofeederCanDispense(f.id));
    const names = listWords((shown.length ? shown : dispensable).slice(0, 2).map(foodWord), 'or');
    const other = groups.filter((g) => g.form === 'frozen' || g.form === 'live').map((g) => g.form);
    const extra = other.length ? ` Offer its ${listWords(other)} food by hand.` : '';
    return { level: 'yes', foods: dispensable, text: `An autofeeder can feed it if you stock ${names}.${extra}` };
  }
  const eats = menu.slice(0, 4).map(foodWord);
  const forms = listWords(groups.map((g) => g.form), 'or');
  const how = sp.feedingStyle === 'target_fed' ? 'target-feed it by hand' : 'feed it by hand';
  const what = eats.length ? `It only eats ${forms} food (${listWords(eats)})` : 'It only eats what it finds in the tank';
  return { level: 'no', foods: [], text: `${what}. Autofeeders only hold dry food such as flakes and pellets, so ${how}.` };
}

// ───────────────────────────── Flow & temperature ─────────────────────────────

export const FLOW_GUIDE: Record<FlowLevel, { label: string; text: string }> = {
  very_low: { label: 'Very gentle flow', text: 'Near-still water: a sponge filter or a baffled outlet. Strong current tires it out.' },
  low: { label: 'Gentle flow', text: 'Calm water with gentle circulation. Keep strong jets and wavemakers away from it.' },
  moderate: { label: 'Moderate flow', text: 'Steady circulation, with calmer spots behind rocks or plants to rest.' },
  high: { label: 'Strong flow', text: 'Fast, oxygen-rich water. A powerhead or wavemaker helps.' },
};

/** One line on temperature in keeper terms (heater or not). °C values convert with the player's unit in the UI. */
export function temperatureGuide(sp: Pick<SpeciesDefinition, 'tempC'>): { label: string; text: string } {
  const t = sp.tempC;
  const n = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const ideal = `${n(t.idealMin)}–${n(t.idealMax)} °C`;
  const limit = `${n(t.max)} °C`;
  if (t.idealMax <= 20) return { label: 'Cold water', text: `Ideal ${ideal}. No heater: most rooms are warmer than it likes, so in warm weather it needs a fan or a chiller to stay under ${limit}.` };
  if (t.idealMin >= 23) return { label: 'Tropical', text: `Ideal ${ideal}. Needs a heater: an ordinary room is too cool for it. Never let it go over ${limit}.` };
  if (t.idealMax <= 23) return { label: 'Cool to room temperature', text: `Ideal ${ideal}. No heater in a normal room, and too cool for a tropical tank. Keep it under ${limit} in summer.` };
  if (t.idealMin <= 20) return { label: 'Room temperature', text: `Ideal ${ideal}. Happy unheated in a normal room. Keep it under ${limit}.` };
  return { label: 'Warm room temperature', text: `Ideal ${ideal}. A heater keeps it steady if your room runs cool. Keep it under ${limit}.` };
}

// ───────────────────────────── "In real life" ─────────────────────────────

/** Data-backed keeping tips from the species' special-needs flags, most important first. */
export function specialNeedTips(sp: SpeciesDefinition): string[] {
  const s: SpeciesSpecialNeeds = sp.special ?? {};
  const out: string[] = [];
  if (s.speciesOnly) out.push('Keep it alone in its own tank: tank mates become prey or targets.');
  if (s.venomous) out.push('Its spines are venomous. Never handle it bare-handed, and take care when netting it or working in the tank.');
  if (s.glassStrikeRisk) out.push('A strike can chip or crack thin glass, so house it in acrylic or thick glass.');
  if (s.needsPods) out.push('It picks at live copepods almost all day. Only a mature tank or a refugium grows enough of them.');
  if (s.stingSensitive) out.push('Keep it away from anemones and strongly stinging corals, which burn its skin.');
  if (s.needsAlgaeOrBiofilm) {
    const extra = foodsFor(sp).filter((f) => f.id === 'algae_wafers' || f.id === 'nori_sheet' || f.id === 'blanched_veg' || f.id === 'gel_food');
    const top = extra.length ? `, and top up with ${listWords(extra.slice(0, 2).map(foodWord), 'or')}` : '';
    out.push(`It grazes algae and biofilm. Add it to an established tank, not a brand-new one${top}.`);
  } else if (s.requiresMatureDays) out.push('Add it only to an established tank, not a brand-new one.');
  if (s.highOxygen) out.push('It needs fast, oxygen-rich water: strong flow and plenty of surface movement.');
  if (s.needsSinkingFood) out.push('It feeds on the bottom. Use sinking food so faster fish don’t eat it all first.');
  if (s.airBreather) out.push('It breathes air at the surface. Keep the surface reachable and leave an air gap under the lid.');
  if (s.escapeArtist) out.push('It can jump or climb out, so keep the tank covered with a snug lid.');
  if (s.burrower) out.push('It burrows. Give it soft sand to dig in, and stand rockwork on the tank floor so digging can’t topple it.');
  if (s.outgrowsSmallTanks) out.push(`It grows big (about ${sp.adultSizeCm} cm). Choose the tank for its adult size, not the size it is in the shop.`);
  if (s.heavyWaste) out.push('It makes a lot of waste. Use a strong filter and change water often.');
  if (s.medicationSensitive) out.push('It is sensitive to copper and many fish medicines. Treat sick tank mates in a separate hospital tank.');
  return out;
}

/** Key ideas of each special-need tip: a tip is skipped when the species' own keeper tip already covers it. */
const TIP_TOPICS: [RegExp, RegExp][] = [
  [/lid/, /\b(lid|cover|jump|leap)/i],
  [/venomous/, /(spine|venom|sting)/i],
  [/burrows/, /(burrow|dig|rockwork)/i],
  [/copper/, /(copper|medicat)/i],
  [/copepods/, /copepod/i],
  [/grows big/, /(adult size|grows? (big|large))/i],
  [/waste/, /(waste|nitrate|filter)/i],
  [/breathes air/, /(gulps? air|breathes? air|air gap)/i],
  [/anemones/, /anemone/i],
  [/thin glass/, /glass/i],
  [/sinking food/, /sinking/i],
];

/** The "In real life" block: the species' own tip first, then special-need tips it doesn't already cover (capped). */
export function realLifeTips(sp: SpeciesDefinition, max = 4): string[] {
  const out: string[] = [];
  const own = sp.encyclopedia.keeperTip?.trim();
  if (own) out.push(own);
  for (const t of specialNeedTips(sp)) {
    if (out.length >= max) break;
    if (own && TIP_TOPICS.some(([tip, said]) => tip.test(t) && said.test(own))) continue;
    out.push(t);
  }
  return out;
}

/** One line for the diet: the species' feeding note, or a composed fallback from the data. */
export function feedingLine(sp: SpeciesDefinition): string {
  const own = sp.encyclopedia.feedingNote?.trim();
  if (own) return own;
  const d = dietGuide(sp);
  const style = FEEDING_STYLE_WORD[sp.feedingStyle] ?? 'feeder';
  return `A ${style} that takes ${d.formsText}${d.forages ? ', and grazes or scavenges in the tank between meals' : ''}.`;
}

export const FEEDING_STYLE_WORD: Record<SpeciesDefinition['feedingStyle'], string> = {
  surface: 'surface feeder',
  midwater: 'mid-water feeder',
  bottom: 'bottom feeder',
  grazer: 'grazer',
  hunter: 'hunter',
  ambush: 'ambush predator',
  target_fed: 'slow feeder that needs target-feeding',
  picker: 'slow, picky feeder',
  scavenger: 'scavenger',
};
