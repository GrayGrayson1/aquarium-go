/**
 * Player husbandry actions (mutators). OWNER: lane "waterlab".
 * All return a result object the UI can toast. Every action teaches something: messages explain the "why".
 */
import type { GameState, LightPreset, Tank, EquipmentInstance, SpeciesDefinition } from '@/types';
import { getFoodDef } from '@/data/catalog/foods';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getSubstrateDef } from '@/data/catalog/substrates';
import { findSpecies } from '@/data/species';
import { spend } from '../economy';
import { bumpCounter } from '../facility';
import { emitEvent } from '../context';
import { nextId } from '../ids';
import { addFood, recommendedServings, ensureLab, scaleFood, foodDemandUnits, availableFood } from '../water/food';
import { CLASS_DEFAULTS, SALT_KG_PER_LITRE, LITRES_PER_GALLON, ROOM_TEMP_C, DETOX_FREE_FRACTION, DETOX_HOURS, isSaltClass, isMarineClass } from '../water/constants';
import { equipmentSummary, safeGallons, inhabitantsOf, safeHabitat } from '../water/env';
import { tuneTankForSpecies } from '../water/kits';
import { sanitizeWater } from '../water/step';
import { noteBreedingFood } from '../life/breeding';
import { plural as pluralName, cap } from '../compat/text';
import { refreshFoodStatus, tankFoodOutlook } from '../tankStatus';
import { aOrAn } from '../economy/util'; // lane:w2-ui ("an 800-gallon tank")
import { photoperiodTooLong } from '../time';

export interface ActionResult {
  ok: boolean;
  message: string;
}

const fail = (message: string): ActionResult => ({ ok: false, message });
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const money = (v: number) => `$${v.toFixed(2).replace(/\.00$/, '')}`;
const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`;
/** Equipment kinds in running text ("2 auto top-offs", not "2 atos"). */
const KIND_PLURAL: Partial<Record<string, string>> = { ato: 'auto top-offs', co2: 'CO₂ systems', uv: 'UV sterilisers', lid: 'lids', light: 'lights', refugium: 'refugiums' };

function getTank(state: GameState, tankId: string): Tank | null {
  const t = state.tanks[tankId];
  if (!t) return null;
  sanitizeWater(t);
  return t;
}

/** Inhabitants' combined ideal band for a parameter (falls back to the water class). */
function idealBand(state: GameState, tank: Tank, key: 'tempC' | 'salinitySG'): { min: number; max: number; mid: number } {
  const d = CLASS_DEFAULTS[tank.waterClass];
  const base = key === 'tempC' ? d.temp : d.sg ?? { idealMin: 1, idealMax: 1, min: 1, max: 1 };
  let lo = base.idealMin;
  let hi = base.idealMax;
  const inh = inhabitantsOf(state, tank.id);
  const ranges = inh.map((i) => (key === 'tempC' ? i.species.tempC : i.species.salinitySG)).filter((r): r is NonNullable<typeof r> => !!r);
  if (ranges.length) {
    const l2 = Math.max(...ranges.map((r) => r.idealMin));
    const h2 = Math.min(...ranges.map((r) => r.idealMax));
    if (l2 <= h2) {
      lo = l2;
      hi = h2;
    }
  }
  return { min: lo, max: hi, mid: (lo + hi) / 2 };
}

// ───────────────────────────── feeding ─────────────────────────────

/**
 * Feed a tank. `targetCreatureId` = target feeding (seahorse/axolotl tongs). `zone` hints where food is dropped.
 * Consumes servings from inventory.foods[foodId]; with no `servings`, a sensible portion for what's in the tank.
 */
export function feedTank(
  state: GameState,
  tankId: string,
  foodId: string,
  // lane:qa-final — `byStaff`: a keeper's round (src/sim/staff/work.ts). The result still says "more than they can eat"
  // if it ever is, but the overfeeding tip (log + toast) is for the player's own taps only.
  opts: { targetCreatureId?: string; servings?: number; zone?: 'surface' | 'middle' | 'bottom'; byStaff?: boolean } = {},
): ActionResult {
  const tank = getTank(state, tankId);
  if (!tank) return fail('That tank no longer exists.');
  const food = getFoodDef(foodId);
  if (!food) return fail('Unknown food.');
  const have = Math.floor(state.inventory.foods[foodId] ?? 0);
  if (have < 1) return fail(`You're out of ${food.name.toLowerCase()} — buy more in the shop.`);

  let targetName: string | null = null;
  let targetSp: SpeciesDefinition | undefined;
  const targetId = opts.targetCreatureId;
  if (targetId) {
    const c = state.creatures[targetId];
    if (!c || c.tankId !== tankId || (c.status !== 'alive' && c.status !== 'listed')) return fail('That animal is not in this tank.');
    targetSp = findSpecies(c.speciesId);
    targetName = c.name || targetSp?.commonName || 'it';
    if (targetSp && !food.tags.some((t) => targetSp!.foods.includes(t))) {
      return fail(`${targetName} won't eat ${food.name.toLowerCase()}. ${cap(pluralName(targetSp))} eat ${targetSp.foods.slice(0, 4).join(', ').replace(/_/g, ' ')}.`);
    }
  }

  const hour = state.clock.hour;
  const demand = foodDemandUnits(state, tank, food, targetId);
  const servings = clamp(Math.round(opts.servings ?? recommendedServings(state, tank, food, targetId)), 1, have);
  // Only uneaten food of the same kind counts toward "too much": flakes for the tetras followed by sinking pellets
  // for the corydoras is two sensible portions, not overfeeding.
  const before = availableFood(tank, food.tags);
  // lane:qa-final — a tong portion is judged against that animal's own appetite (its portion still waiting counts),
  // and the tank as a whole against everything that eats this food. Comparing one seahorse's appetite with the
  // portions just offered to its five tank-mates called a careful round of target feeding "overfeeding".
  const ownWaiting = targetId && tank.water.targetFeed?.creatureId === targetId ? tank.water.targetFeed.units : 0;
  const tankDemand = targetId ? foodDemandUnits(state, tank, food) : demand;
  state.inventory.foods[foodId] = have - servings;
  const units = addFood(tank, food, servings, hour, targetId);
  const lab = ensureLab(tank);

  // Thawed frozen food leaks a little ammonia straight away.
  if (/_frozen$/.test(food.id)) {
    const litres = safeGallons(tank) * LITRES_PER_GALLON * tank.water.level;
    tank.water.ammonia += (servings * food.waste * 0.05) / Math.max(1, litres);
  }
  // Live copepods that escape being eaten settle in and breed.
  if (food.tags.includes('copepod_live')) lab.pods = clamp((lab.pods ?? 0) + servings * 0.04 * Math.sqrt(20 / Math.max(5, safeGallons(tank))), 0, 1);
  // Breeding cues (lane:breeding field, only if present).
  if (tank.breedingEnv) {
    tank.breedingEnv.foodSeen = tank.breedingEnv.foodSeen ?? {};
    for (const t of food.tags) tank.breedingEnv.foodSeen[t] = hour;
  }
  if (targetId) {
    const c = state.creatures[targetId];
    if (c) c.life = { ...(c.life ?? {}), targetFedUntil: hour + 1 };
  }
  bumpCounter(state, 'feeds');
  if (targetId) bumpCounter(state, 'targetFeeds');
  noteBreedingFood(state, tank.id, food.tags);

  const eaters = inhabitantsOf(state, tank.id).filter((i) => food.tags.some((t) => i.species.foods.includes(t)));
  const parts: string[] = [];
  if (targetName) parts.push(`Offered ${targetName} ${food.name.toLowerCase()} with the feeding tongs — it's theirs for the next hour.`);
  else parts.push(`Fed ${plural(servings, 'serving')} of ${food.name.toLowerCase()}.`);
  if (eaters.length === 0 && inhabitantsOf(state, tank.id).length > 0) {
    parts.push('Nothing in this tank eats it — it will rot into ammonia.');
  } else if (
    demand > 0 &&
    (targetId ? units + ownWaiting > demand * 2.5 + food.nutrition || units + before > tankDemand * 2.5 + food.nutrition : units + before > demand * 2.5 + food.nutrition)
  ) {
    parts.push('That is more than they can eat — leftovers rot into ammonia within hours.');
    // The action result already says so; the log gets at most one reminder per tank per game day.
    if (!opts.byStaff && (lab.warned?.overfeed ?? -999) < hour - 24) {
      lab.warned = { ...(lab.warned ?? {}), overfeed: hour };
      if (!state.isShowcase)
        // lane:qa-play — toasted (still at most once per tank per game day): clicks in the tank give no other feedback,
        // so a player dropping ten portions only learnt about it from the log after the water turned.
        emitEvent(state, { kind: 'tip', text: `Overfeeding ${tank.name}: uneaten food decays into ammonia. Feed only what disappears in a couple of minutes.`, tankId: tank.id, toast: true });
    }
  }
  const left = state.inventory.foods[foodId] ?? 0;
  // The cupboard is shared: say plainly when this feed emptied it or left only a meal or two, then update every
  // tank's food level (and log the low / out warning right away rather than at the next tank step).
  if (left <= 0) parts.push(`That was the last of your ${food.name.toLowerCase()} — buy more in Market › Supplies.`);
  else {
    const outlook = tankFoodOutlook(state, tank.id);
    if (outlook.level !== 'ok' && outlook.foodIds.includes(foodId)) parts.push(`${left} left — about ${Math.max(1, Math.floor(outlook.meals))} meal${Math.floor(outlook.meals) === 1 ? '' : 's'} of food here. Stock up soon.`);
    else parts.push(`${left} left.`);
  }
  refreshFoodStatus(state, { notify: true });
  return { ok: true, message: parts.join(' ') };
}

// ───────────────────────────── water changes & top-off ─────────────────────────────

/** Salt (kg) a water change would use and whether the player has enough. */
export function waterChangeCost(state: GameState, tankId: string, fraction: number): { saltKg: number; enoughSalt: boolean } {
  const tank = state.tanks[tankId];
  if (!tank || !isSaltClass(tank.waterClass)) return { saltKg: 0, enoughSalt: true };
  const f = clamp(fraction, 0.05, 0.9);
  const litresFull = safeGallons(tank) * LITRES_PER_GALLON;
  const remaining = litresFull * tank.water.level * (1 - f);
  const added = litresFull - remaining;
  const target = idealBand(state, tank, 'salinitySG').mid;
  const kg = added * SALT_KG_PER_LITRE * ((target - 1) / 0.025);
  return { saltKg: Math.round(kg * 100) / 100, enoughSalt: state.inventory.salt >= kg - 1e-6 };
}

/**
 * Partial water change (0.05..0.9). Uses salt for marine tanks. New water is roughly temperature-matched unless
 * `opts.matchTemperature === false` (straight from the tap at room temperature) or `opts.newWaterTempC` is given.
 */
export function waterChange(state: GameState, tankId: string, fraction: number, opts: { matchTemperature?: boolean; newWaterTempC?: number } = {}): ActionResult {
  const tank = getTank(state, tankId);
  if (!tank) return fail('That tank no longer exists.');
  const w = tank.water;
  const f = clamp(Number.isFinite(fraction) ? fraction : 0.25, 0.05, 0.9);
  const d = CLASS_DEFAULTS[tank.waterClass];
  const salty = isSaltClass(tank.waterClass);
  const litresFull = safeGallons(tank) * LITRES_PER_GALLON;
  const current = litresFull * w.level;
  const remaining = current * (1 - f);
  const added = litresFull - remaining;
  const kr = remaining / litresFull;
  const ka = added / litresFull;
  const hour = state.clock.hour;

  // New water chemistry
  let newSG = 1;
  let saltUsed = 0;
  let saltShort = false;
  if (salty) {
    const target = idealBand(state, tank, 'salinitySG').mid;
    const need = added * SALT_KG_PER_LITRE * ((target - 1) / 0.025);
    const have = Math.max(0, state.inventory.salt);
    if (have < 0.02 && need > 0.02) return fail(`You need about ${need.toFixed(1)} kg of marine salt mix to change ${Math.round(f * 100)}% of this tank — buy salt first.`);
    saltUsed = Math.min(have, need);
    saltShort = saltUsed < need - 1e-6;
    newSG = 1 + (target - 1) * (need > 0 ? saltUsed / need : 1);
    state.inventory.salt = Math.round((have - saltUsed) * 1000) / 1000;
  }
  const src = d.source;
  const newTemp = opts.newWaterTempC ?? (opts.matchTemperature === false ? ROOM_TEMP_C : w.tempC + (ROOM_TEMP_C - w.tempC) * 0.15);
  const before = { temp: w.tempC, pH: w.pH, sg: w.salinitySG, nitrate: w.nitrate, ammonia: w.ammonia };

  w.ammonia = w.ammonia * kr;
  w.nitrite = w.nitrite * kr;
  w.nitrate = w.nitrate * kr + src.nitrate * ka;
  const lab = ensureLab(tank);
  if (lab.boundAmmonia !== undefined) lab.boundAmmonia *= kr; // lane:fix-water — conditioner-bound share goes out with the old water too
  if (lab.boundNitrite !== undefined) lab.boundNitrite *= kr;
  w.kh = w.kh * kr + src.kh * ka;
  if (!salty || tank.waterClass === 'brackish') w.gh = w.gh * kr + src.gh * ka;
  w.pH = w.pH * kr + src.pH * ka;
  w.tempC = w.tempC * kr + newTemp * ka;
  w.salinitySG = salty ? 1 + (w.salinitySG - 1) * kr + (newSG - 1) * ka : 1;
  w.oxygen = clamp(w.oxygen * kr + 0.95 * ka, 0, 1);
  w.level = 1;
  scaleFood(tank, 1 - f * 0.6);
  w.detritus = clamp(w.detritus * (1 - f * 0.35), 0, 100);
  w.clarity = clamp(w.clarity + f * 0.3, 0, 1);
  if (salty) lab.reefElements = clamp((lab.reefElements ?? 0.8) * kr + 0.85 * ka, 0, 1);
  lab.co2 = (lab.co2 ?? 1) * kr + (salty ? 0.45 : 0.6) * ka;
  tank.lastMaintenanceHour = hour;
  bumpCounter(state, 'waterChanges');

  // Sudden-change stress
  const dT = Math.abs(w.tempC - before.temp);
  const dPH = Math.abs(w.pH - before.pH);
  const dSG = Math.abs(w.salinitySG - before.sg);
  // lane:fix-water — the reason names whichever shift actually caused the shock (a 1.5 °C or 0.3 pH shift used to
  // fall through to "salinity jumped by 0.000" in freshwater tanks); salinity only counts in salt water.
  const shifts = [
    { v: (dT - 1) / 4, why: `the new water shifted the temperature by ${dT.toFixed(1)} °C` },
    { v: (dPH - 0.2) / 0.8, why: `pH jumped by ${dPH.toFixed(1)}` },
    { v: salty ? (dSG - 0.0015) / 0.006 : 0, why: `salinity jumped by ${dSG.toFixed(3)}` },
  ];
  const worst = shifts.reduce((a, b) => (b.v > a.v ? b : a));
  const severity = clamp(worst.v, 0, 1);
  let shockNote = '';
  if (severity > 0.1) {
    const why = worst.why;
    w.shock = { hour, untilHour: hour + 4 + severity * 8, severity, reason: why };
    lab.swing = clamp((lab.swing ?? 0) + severity * 0.5, 0, 1);
    shockNote = ` Careful — ${why}; sudden changes stress animals. Match the new water next time.`;
    if (!state.isShowcase) emitEvent(state, { kind: 'warning', text: `${tank.name}: ${why} during the water change — the animals are stressed.`, tankId: tank.id, toast: true });
  }
  // lane:fix-water — show a decimal when the rounded values would read as "5 → 5 ppm".
  const nDigits = before.nitrate.toFixed(0) === w.nitrate.toFixed(0) && Math.abs(before.nitrate - w.nitrate) >= 0.05 ? 1 : 0;
  const parts = [`Changed ${Math.round(f * 100)}% of the water. Nitrate ${before.nitrate.toFixed(nDigits)} → ${w.nitrate.toFixed(nDigits)} ppm.`];
  if (before.ammonia >= 0.05) parts.push(`Ammonia ${before.ammonia.toFixed(2)} → ${w.ammonia.toFixed(2)} ppm.`);
  if (salty) parts.push(`Used ${saltUsed.toFixed(1)} kg of salt mix (${state.inventory.salt.toFixed(1)} kg left); salinity ${w.salinitySG.toFixed(3)}.`);
  if (saltShort) parts.push('You ran short of salt, so the new water was weaker — salinity dropped. Buy more salt mix.');
  if (f > 0.5) parts.push('Very large changes can shock sensitive animals; 20–30% at a time is gentler.');
  return { ok: true, message: parts.join(' ') + shockNote };
}

/** Top off evaporated water with fresh (RO) water — marine salinity rises if skipped. */
export function topOff(state: GameState, tankId: string): ActionResult {
  const tank = getTank(state, tankId);
  if (!tank) return fail('That tank no longer exists.');
  const w = tank.water;
  if (w.level >= 0.995) return { ok: true, message: 'Already full — nothing to top off.' };
  const salty = isSaltClass(tank.waterClass);
  const lvl = w.level;
  const added = 1 - lvl;
  const src = CLASS_DEFAULTS[tank.waterClass].source;
  const sgBefore = w.salinitySG;
  // Fresh water dilutes everything (salt did not evaporate).
  w.ammonia *= lvl;
  w.nitrite *= lvl;
  w.nitrate *= lvl;
  const lab = ensureLab(tank);
  if (lab.boundAmmonia !== undefined) lab.boundAmmonia *= lvl; // lane:fix-water
  if (lab.boundNitrite !== undefined) lab.boundNitrite *= lvl;
  w.salinitySG = salty ? 1 + (w.salinitySG - 1) * lvl : 1;
  // lane:fix-water — KH is kept in dKH and evaporation never concentrated it, so topping off must not dilute it
  // either (it drained ~1.7 dKH a month from reef tanks topped off by hand while ATO tanks lost nothing). Freshwater
  // top-offs still blend in the tap water's hardness.
  if (!salty) {
    w.kh = w.kh * lvl + src.kh * added;
    w.gh = w.gh * lvl + src.gh * added;
  }
  w.level = 1;
  bumpCounter(state, 'topOffs');
  const msg = `Topped off ${Math.round(added * 100)}% with fresh ${salty ? 'RO' : ''} water.`.replace('  ', ' ');
  return { ok: true, message: salty ? `${msg} Salinity ${sgBefore.toFixed(3)} → ${w.salinitySG.toFixed(3)} — salt never evaporates, only water does.` : msg };
}

// ───────────────────────────── cleaning ─────────────────────────────

/** Vacuum substrate / remove detritus; scrape algae; rinse the filter. */
export function cleanTank(state: GameState, tankId: string, what: 'gravel' | 'glass' | 'filter', opts: { harsh?: boolean } = {}): ActionResult {
  const tank = getTank(state, tankId);
  if (!tank) return fail('That tank no longer exists.');
  const w = tank.water;
  const lab = ensureLab(tank);
  const hour = state.clock.hour;
  let message: string;
  if (what === 'gravel') {
    const soil = tank.substrate?.kind === 'planted_soil';
    const before = w.detritus;
    w.detritus = clamp(w.detritus * (soil ? 0.55 : 0.3), 0, 100);
    scaleFood(tank, 0.4);
    lab.pods = clamp((lab.pods ?? 0) * 0.92, 0, 1);
    const sub = getSubstrateDef(tank.substrate?.kind ?? 'sand')?.name.toLowerCase() ?? 'substrate';
    message =
      tank.substrate?.kind === 'bare'
        ? `Siphoned the bare bottom clean — waste ${before.toFixed(0)} → ${w.detritus.toFixed(0)}.`
        : `Vacuumed the ${sub}: waste ${before.toFixed(0)} → ${w.detritus.toFixed(0)}.${soil ? ' (Gently — hard siphoning crushes aqua soil.)' : ''}`;
  } else if (what === 'glass') {
    const before = w.algae;
    w.algae = clamp(w.algae * 0.45, 0, 100);
    w.clarity = clamp(w.clarity + 0.04, 0, 1);
    message = before < 3 ? 'The glass was already spotless.' : `Scraped algae off the glass (${before.toFixed(0)}% → ${w.algae.toFixed(0)}%). Algae on rocks and plants needs grazers or a shorter photoperiod.`;
  } else {
    const filters = tank.equipment.filter((e) => getEquipmentDef(e.defId)?.kind === 'filter');
    if (!filters.length) return fail('There is no filter to clean.');
    const tooSoon = lab.lastFilterCleanHour !== undefined && hour - lab.lastFilterCleanHour < 72;
    const knock = opts.harsh ? 0.35 : tooSoon ? 0.15 : 0.05;
    const mBefore = w.bioMaturity;
    w.bioMaturity = clamp(w.bioMaturity * (1 - knock), 0, 1);
    lab.colony = clamp((lab.colony ?? 0.6) * (1 - knock * 0.5), 0.25, 1);
    for (const f of filters) f.condition = 1;
    w.detritus = clamp(w.detritus * 0.8, 0, 100);
    w.clarity = clamp(w.clarity + 0.05, 0, 1);
    lab.lastFilterCleanHour = hour;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    message = opts.harsh
      ? `Scrubbed the filter under the tap. The chlorine and scrubbing killed many beneficial bacteria (cycle ${pct(mBefore)} → ${pct(w.bioMaturity)}) — rinse media in old tank water instead.`
      : tooSoon
        ? `Rinsed the filter again. Cleaning this often strips beneficial bacteria (cycle ${pct(mBefore)} → ${pct(w.bioMaturity)}) — every couple of weeks is plenty.`
        : `Rinsed the filter media in old tank water: flow restored, and only a little bacteria lost (cycle ${pct(mBefore)} → ${pct(w.bioMaturity)}).`;
  }
  bumpCounter(state, 'cleanings');
  tank.lastMaintenanceHour = hour;
  return { ok: true, message };
}

// ───────────────────────────── additives ─────────────────────────────

type Additive = 'bacteria' | 'conditioner' | 'salt' | 'buffer' | 'fertilizer' | 'coral_supplement';

/** Price of one dose of an additive for this tank (money; salt uses inventory instead). */
export function doseCost(state: GameState, tankId: string, additive: Additive): number {
  const tank = state.tanks[tankId];
  const gal = tank ? safeGallons(tank) : 20;
  const scale = gal / 20;
  switch (additive) {
    case 'bacteria':
      return Math.round(Math.max(5, 8 * scale) * 100) / 100;
    case 'conditioner':
      return Math.round(Math.max(1, 1.5 * scale) * 100) / 100;
    case 'buffer':
    case 'fertilizer':
      return Math.round(Math.max(2, 2 * scale) * 100) / 100;
    case 'coral_supplement':
      return Math.round(Math.max(3, 4 * scale) * 100) / 100;
    default:
      return 0;
  }
}

/** Dose an additive: bottled bacteria, water conditioner, salt, buffer, fertilizer, coral supplement. */
export function dose(state: GameState, tankId: string, additive: Additive): ActionResult {
  const tank = getTank(state, tankId);
  if (!tank) return fail('That tank no longer exists.');
  const w = tank.water;
  const lab = ensureLab(tank);
  const salty = isSaltClass(tank.waterClass);
  const marine = tank.environment === 'marine';
  const hour = state.clock.hour;
  const cost = doseCost(state, tankId, additive);
  const pay = (label: string): boolean => cost <= 0 || spend(state, cost, 'consumables', `${label} for ${tank.name}`);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  let message: string;
  switch (additive) {
    case 'bacteria': {
      if (!pay('Bottled bacteria')) return fail(`Bottled bacteria costs ${money(cost)} for this tank — not enough money.`);
      const m0 = w.bioMaturity;
      w.bioMaturity = clamp(m0 + (1 - m0) * 0.35, 0, 1);
      lab.colony = clamp((lab.colony ?? 0.3) + 0.2, 0.25, 1);
      message =
        m0 > 0.9
          ? 'The filter is already fully established — the bottled bacteria had little to add.'
          : `Seeded the filter with bottled nitrifying bacteria: ${pct(m0)} → ${pct(w.bioMaturity)} established. Keep feeding lightly while it finishes cycling.`;
      break;
    }
    case 'conditioner': {
      if (!pay('Water conditioner')) return fail(`Conditioner costs ${money(cost)} — not enough money.`);
      // Round-3 R02-05 — a dose still working already holds its share bound (the water step keeps the split): a top-up
      // only extends it, so don't quote a drop the next substep would undo.
      if ((lab.detoxUntilHour ?? -Infinity) > hour) {
        lab.detoxUntilHour = hour + DETOX_HOURS;
        const free: string[] = [];
        if (w.ammonia >= 0.005) free.push(`ammonia at ${w.ammonia.toFixed(2)} ppm`);
        if (w.nitrite >= 0.005) free.push(`nitrite at ${w.nitrite.toFixed(2)} ppm`);
        message = `Conditioner topped up — it keeps binding for another day${free.length ? `, with free ${free.join(' and free ')}` : ''}. Only a water change lowers what it holds.`;
        break;
      }
      // lane:fix-water — really bind it: the bound share (lab.boundAmmonia/boundNitrite) neither harms animals nor
      // shows on the report until the dose wears off (the water step keeps the split while detoxUntilHour is ahead).
      const nh = w.ammonia * (1 - DETOX_FREE_FRACTION);
      const no2 = w.nitrite * (1 - DETOX_FREE_FRACTION);
      w.ammonia -= nh;
      w.nitrite -= no2;
      lab.boundAmmonia = (lab.boundAmmonia ?? 0) + nh;
      lab.boundNitrite = (lab.boundNitrite ?? 0) + no2;
      lab.detoxUntilHour = hour + DETOX_HOURS;
      const bound: string[] = [];
      if (nh >= 0.005) bound.push(`ammonia (${(w.ammonia + nh).toFixed(2)} → ${w.ammonia.toFixed(2)} ppm)`);
      if (no2 >= 0.005) bound.push(`nitrite (${(w.nitrite + no2).toFixed(2)} → ${w.nitrite.toFixed(2)} ppm)`);
      message = bound.length
        ? `Conditioner bound most of the ${bound.join(' and ')} into a less toxic form for about a day. It buys time, but the cause still needs fixing — change water and feed less; when it wears off, what it holds comes back.`
        : 'Conditioner is binding ammonia and nitrite into a less toxic form for about a day. It buys time, but the cause still needs fixing — change water and feed less.';
      break;
    }
    case 'salt': {
      if (!salty) {
        // lane:fix-water — when the tank holds brackish animals (mollies, bumblebee gobies) point at the real route.
        const estuary = inhabitantsOf(state, tank.id).find((i) => i.species.environment === 'brackish');
        return fail(
          estuary
            ? `Salt can’t go into a freshwater tank — shrimp, snails, scaleless fish and plants are harmed by it. ${cap(pluralName(estuary.species.commonName))} would rather have a brackish tank (Research › Brackish Estuaries).`
            : 'Freshwater tanks don’t need salt — shrimp, snails, scaleless fish and plants are harmed by it.',
        );
      }
      const band = CLASS_DEFAULTS[tank.waterClass].sg!;
      const target = Math.min(band.idealMax, idealBand(state, tank, 'salinitySG').max);
      if (w.salinitySG >= target - 0.0002) return fail(`Salinity is already ${w.salinitySG.toFixed(3)} — more salt would push it too high. Top off with fresh water if it creeps up.`);
      const step = Math.min(0.001, target - w.salinitySG);
      const litres = safeGallons(tank) * LITRES_PER_GALLON * w.level;
      const kg = litres * SALT_KG_PER_LITRE * (step / 0.025);
      if (state.inventory.salt < kg) return fail(`You need ${kg.toFixed(2)} kg of salt mix for this dose — buy more salt.`);
      state.inventory.salt = Math.round((state.inventory.salt - kg) * 1000) / 1000;
      const before = w.salinitySG;
      w.salinitySG += step;
      message = `Dissolved ${kg.toFixed(2)} kg of salt mix: salinity ${before.toFixed(3)} → ${w.salinitySG.toFixed(3)}. Raise it no more than about 0.001 a day.`;
      break;
    }
    case 'buffer': {
      if (!pay('pH buffer')) return fail(`Buffer costs ${money(cost)} — not enough money.`);
      const k0 = w.kh;
      const p0 = w.pH;
      w.kh = clamp(w.kh + (marine ? 1 : 1.5), 0, 14);
      if (!salty) w.gh = clamp(w.gh + 0.3, 0, 30);
      w.pH = clamp(w.pH + (marine ? 0.06 : 0.12), 4, 9.2);
      message = `Raised carbonate hardness ${k0.toFixed(1)} → ${w.kh.toFixed(1)} dKH (pH ${p0.toFixed(2)} → ${w.pH.toFixed(2)}). KH is the buffer that stops pH crashing.`;
      break;
    }
    case 'fertilizer': {
      // brackish tanks can hold salt-tolerant plants (java fern, anubias, crypts), so only marine/reef refuse it
      if (isMarineClass(tank.waterClass)) return fail('Marine tanks don’t want plant fertiliser — it would just feed algae.');
      if (!pay('Plant fertiliser')) return fail(`Fertiliser costs ${money(cost)} — not enough money.`);
      lab.fertilizer = clamp((lab.fertilizer ?? 0) + 0.5, 0, 1);
      const plants = (safeHabitat(state, tank).nitrateUptake ?? 0) > 0.05;
      message = plants
        ? 'Dosed liquid fertiliser: plants will grow faster and outcompete algae for the next few days.'
        : 'Dosed fertiliser — without many plants to use it, algae will take the nutrients instead.';
      break;
    }
    case 'coral_supplement': {
      if (!marine) return fail('Coral supplements are for reef tanks.');
      if (!pay('Coral supplement')) return fail(`Coral supplement costs ${money(cost)} — not enough money.`);
      const e0 = lab.reefElements ?? 0.5;
      lab.reefElements = clamp(e0 + 0.35, 0, 1);
      w.kh = clamp(w.kh + 0.6, 0, 12);
      message = `Dosed calcium, alkalinity and trace elements (reef elements ${pct(e0)} → ${pct(lab.reefElements)}). Corals use these to build their skeletons.`;
      break;
    }
    default:
      return fail('Unknown additive.');
  }
  bumpCounter(state, 'doses');
  return { ok: true, message: cost > 0 ? `${message} (${money(cost)})` : message };
}

// ───────────────────────────── equipment ─────────────────────────────

const MAX_PER_KIND: Record<string, number> = { lid: 1, ato: 1, autofeeder: 1, co2: 1, filter: 4, heater: 4, chiller: 3, light: 4, skimmer: 2, uv: 2, refugium: 1, fan: 3, airstone: 4, powerhead: 6, wavemaker: 4 };

function defaultSettingFor(state: GameState, tank: Tank, kind: string, fallback: number | undefined): number | undefined {
  const inh = inhabitantsOf(state, tank.id);
  const temp = idealBand(state, tank, 'tempC');
  const cool = tank.waterClass === 'freshwater_cool' || temp.mid < ROOM_TEMP_C - 0.5;
  switch (kind) {
    case 'heater':
      return cool ? Math.max(10, temp.min - 1) : Math.round(temp.mid * 2) / 2;
    case 'chiller': {
      if (cool) return Math.round(temp.mid * 2) / 2;
      const s = equipmentSummary(tank);
      return Math.max((s.heaterSet ?? temp.mid) + 1.5, temp.max);
    }
    case 'powerhead':
    case 'wavemaker': {
      const prefs = inh.map((i) => i.species.flowPreference);
      if (prefs.includes('very_low') || prefs.includes('low')) return 0.1;
      if (prefs.includes('moderate')) return 0.6;
      return fallback ?? 1;
    }
    default:
      return fallback;
  }
}

/**
 * Install equipment in a tank.
 * - `{ instanceId }` installs that specific unit from `state.inventory.equipment` (preferred for "install from storage").
 * - `{ purchased: true }` always creates a brand-new unit (economy.buyEquipment should pass this after charging).
 * - `{ fromInventory: true }` requires an owned spare of `defId` and fails if there is none.
 * - No options: uses an owned spare of `defId` if one is in storage, otherwise creates a new unit.
 * Filter media removed from a mature tank carries bacteria and seeds the new tank.
 */
export function installEquipment(
  state: GameState,
  tankId: string,
  defId: string,
  opts: { fromInventory?: boolean; instanceId?: string; purchased?: boolean } = {},
): ActionResult {
  const tank = getTank(state, tankId);
  if (!tank) return fail('That tank no longer exists.');
  const def = getEquipmentDef(defId);
  if (!def) return fail('Unknown equipment.');
  if (def.environments.length && !def.environments.includes(tank.environment)) {
    if (def.kind === 'skimmer') return fail('Protein skimmers only work in salt water — fresh water will not foam.');
    if (def.kind === 'co2') return fail('CO₂ injection is for freshwater planted tanks.');
    if (def.kind === 'refugium') return fail('A macroalgae refugium is a marine system.');
    return fail(`The ${def.name} isn't made for ${tank.environment} tanks.`);
  }
  const sameKind = tank.equipment.filter((e) => getEquipmentDef(e.defId)?.kind === def.kind).length;
  const max = MAX_PER_KIND[def.kind] ?? 6;
  if (sameKind >= max) return fail(def.kind === 'lid' ? 'This tank already has a lid.' : `This tank already has ${sameKind} ${KIND_PLURAL[def.kind] ?? `${def.kind}s`} — that's the most that fit.`);

  let inst: EquipmentInstance | undefined;
  let fromStorage = false;
  if (!opts.purchased) {
    const idx = state.inventory.equipment.findIndex((e) => (opts.instanceId ? e.id === opts.instanceId : e.defId === defId));
    if (idx >= 0) {
      inst = state.inventory.equipment.splice(idx, 1)[0];
      fromStorage = true;
    } else if (opts.instanceId || opts.fromInventory) return fail(`You don't have a spare ${def.name} in storage.`);
  }
  const hour = state.clock.hour;
  if (!inst) {
    inst = { id: nextId(state, 'eq'), defId, installedHour: hour, condition: 1, on: true, setting: def.stats.defaultSetting };
  }
  inst.installedHour = hour;
  inst.on = true;
  // Thermostats and pumps are set for this tank's animals (a stored unit keeps its setting unless it has none).
  const tuned = defaultSettingFor(state, tank, def.kind, def.stats.defaultSetting);
  if (tuned !== undefined && (inst.setting === undefined || !fromStorage || def.kind === 'heater' || def.kind === 'chiller')) inst.setting = tuned;

  const notes: string[] = [];
  // Mature media seeds the tank.
  if (def.kind === 'filter' && inst.bio) {
    const age = Math.max(0, hour - inst.bio.sinceHour);
    const seed = inst.bio.maturity * Math.exp(-age / 48);
    const s = equipmentSummary(tank);
    const share = (def.stats.bioCapacity ?? 0) / Math.max(1, s.bioCapUnits + (def.stats.bioCapacity ?? 0));
    const m0 = tank.water.bioMaturity;
    if (seed > m0) {
      tank.water.bioMaturity = clamp(m0 + (seed - m0) * Math.min(1, share * 1.2), 0, 1);
      notes.push(`Its mature media seeded the tank's bacteria (cycle ${Math.round(m0 * 100)}% → ${Math.round(tank.water.bioMaturity * 100)}%).`);
    } else if (age > 48) {
      notes.push('The bacteria in its media died off while it sat dry.');
    }
    delete inst.bio;
  }
  tank.equipment.push(inst);

  const gallons = safeGallons(tank);
  if (gallons > def.gallonsRange.max * 1.05) notes.push(`It's undersized for ${aOrAn(gallons)} ${gallons}-gallon tank.`);
  if (def.kind === 'heater' && tank.waterClass === 'freshwater_cool') notes.push('Heads-up: this is a cool-water tank — the heater is set low as a cold-room safety net.');
  if (def.kind === 'heater' || def.kind === 'chiller') notes.push(`Set to ${inst.setting?.toFixed(1)} °C.`);
  if (equipmentSummary(tank).conflict) notes.push('Warning: the heater is set at or above the chiller — they will fight each other.');
  if (def.kind === 'airstone' && tank.waterClass === 'freshwater_planted' && equipmentSummary(tank).co2 > 0) notes.push('Bubbles drive off injected CO₂ — consider running it only at night.');
  return { ok: true, message: [`Installed the ${def.name}${fromStorage ? ' from storage' : ''}.`, ...notes].join(' ') };
}

export function removeEquipment(state: GameState, tankId: string, equipmentId: string): ActionResult {
  const tank = getTank(state, tankId);
  if (!tank) return fail('That tank no longer exists.');
  const idx = tank.equipment.findIndex((e) => e.id === equipmentId);
  if (idx < 0) return fail('That equipment is not in this tank.');
  const inst = tank.equipment[idx];
  const def = getEquipmentDef(inst.defId);
  const notes: string[] = [];
  if (def?.kind === 'filter') {
    const s = equipmentSummary(tank);
    const share = (def.stats.bioCapacity ?? 0) / Math.max(1, s.bioCapUnits);
    const m0 = tank.water.bioMaturity;
    inst.bio = { maturity: m0, sinceHour: state.clock.hour };
    tank.water.bioMaturity = clamp(m0 * (1 - 0.85 * clamp(share, 0, 1)), 0, 1);
    if (m0 - tank.water.bioMaturity > 0.05)
      notes.push(`Its bacteria left with it (cycle ${Math.round(m0 * 100)}% → ${Math.round(tank.water.bioMaturity * 100)}%). Install it in another tank within a day or two to seed that tank.`);
  }
  tank.equipment.splice(idx, 1);
  state.inventory.equipment.push(inst);
  return { ok: true, message: [`Removed the ${def?.name ?? 'equipment'} and put it in storage.`, ...notes].join(' ') };
}

function settingRange(kind: string): [number, number] {
  switch (kind) {
    case 'heater':
      return [15, 34];
    case 'chiller':
      return [8, 28];
    case 'light':
      return [0, 1.5];
    case 'filter':
      return [0.3, 1];
    case 'autofeeder':
      return [0, 4];
    default:
      return [0, 1];
  }
}

export function setEquipment(state: GameState, tankId: string, equipmentId: string, patch: { on?: boolean; setting?: number }): ActionResult {
  const tank = getTank(state, tankId);
  if (!tank) return fail('That tank no longer exists.');
  const inst = tank.equipment.find((e) => e.id === equipmentId);
  if (!inst) return fail('That equipment is not in this tank.');
  const def = getEquipmentDef(inst.defId);
  if (!def) return fail('Unknown equipment.');
  const notes: string[] = [];
  if (patch.setting !== undefined && Number.isFinite(patch.setting)) {
    const [lo, hi] = settingRange(def.kind);
    let v = clamp(patch.setting, lo, hi);
    if (def.kind === 'autofeeder') v = Math.round(v);
    inst.setting = v;
    if (def.kind === 'heater' || def.kind === 'chiller') notes.push(`${def.kind === 'heater' ? 'Heater' : 'Chiller'} set to ${v.toFixed(1)} °C.`);
    else if (def.kind === 'autofeeder') notes.push(v === 0 ? 'Autofeeder paused.' : `Autofeeder will dispense ${v}× a day.`);
    else notes.push(`${def.name} set to ${Math.round(v * 100)}%.`);
  }
  if (patch.on !== undefined) {
    inst.on = patch.on;
    if (!patch.on && inst.failed && inst.failMode === 'stuck_on') notes.push('Switched off the stuck heater. It needs repair or replacement.');
    else notes.push(`${def.name} switched ${patch.on ? 'on' : 'off'}.`);
    if (!patch.on && def.kind === 'filter') notes.push('With the filter off, its bacteria starve and ammonia will build up — don’t leave it off for long.');
    if (!patch.on && (def.kind === 'heater' || def.kind === 'chiller')) notes.push('The water will drift toward room temperature.');
  }
  const s = equipmentSummary(tank);
  if (s.conflict) notes.push(`Warning: heater ${s.heaterSet?.toFixed(1)} °C vs chiller ${s.chillerSet?.toFixed(1)} °C — they'll fight each other. Keep the heater at least 1 °C below the chiller.`);
  return { ok: true, message: notes.join(' ') || 'Updated.' };
}

/** Repair failed or worn equipment for ~35 % of its price. */
export function repairEquipment(state: GameState, tankId: string, equipmentId: string): ActionResult {
  const tank = getTank(state, tankId);
  if (!tank) return fail('That tank no longer exists.');
  const inst = tank.equipment.find((e) => e.id === equipmentId);
  if (!inst) return fail('That equipment is not in this tank.');
  const def = getEquipmentDef(inst.defId);
  if (!def) return fail('Unknown equipment.');
  if (!inst.failed && inst.condition > 0.85) return fail(`The ${def.name} is working fine.`);
  const cost = Math.max(5, Math.round(def.price * 0.35));
  if (!spend(state, cost, 'equipment', `Repair ${def.name} (${tank.name})`)) return fail(`Repairing the ${def.name} costs ${money(cost)} — not enough money.`);
  inst.failed = false;
  delete inst.failMode;
  inst.condition = Math.max(inst.condition, 0.9);
  inst.on = true;
  return { ok: true, message: `Repaired the ${def.name} for ${money(cost)}.` };
}

export function setLighting(
  state: GameState,
  tankId: string,
  patch: Partial<{ preset: LightPreset; intensity: number; onHour: number; offHour: number; moonlight: boolean }>,
): ActionResult {
  const t = state.tanks[tankId];
  if (!t) return fail('That tank no longer exists.');
  const L = t.lighting;
  if (patch.preset) L.preset = patch.preset;
  if (patch.intensity !== undefined && Number.isFinite(patch.intensity)) L.intensity = clamp(patch.intensity, 0, 1.5);
  if (patch.onHour !== undefined && Number.isFinite(patch.onHour)) L.onHour = ((patch.onHour % 24) + 24) % 24;
  if (patch.offHour !== undefined && Number.isFinite(patch.offHour)) L.offHour = ((patch.offHour % 24) + 24) % 24;
  if (patch.moonlight !== undefined) L.moonlight = patch.moonlight;
  const period = ((L.offHour - L.onHour + 24) % 24) || 24;
  const hh = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  const notes = [`Lights ${hh(L.onHour)}–${hh(L.offHour)} (${Math.round(period)} h) at ${Math.round(L.intensity * 100)}%.`];
  if (photoperiodTooLong(L, state.facility?.closeHour)) {
    notes.push(period > 15 ? 'Long photoperiods feed algae — keep the day to the open hours, or 8–10 hours if algae is a problem.' : 'The lights stay on after the doors close — that feeds algae without anyone seeing it.');
  }
  if (period < 6) notes.push('Plants and corals need at least 6–8 hours of light.');
  return { ok: true, message: notes.join(' ') };
}

/** Adjust a new tank's equipment settings for a species (heater setpoint, flow level, light intensity). */
export function tuneEquipmentForSpecies(state: GameState, tankId: string, speciesId: string): void {
  const tank = state.tanks[tankId];
  const sp = findSpecies(speciesId);
  if (!tank || !sp) return;
  const fresh = inhabitantsOf(state, tankId).length === 0;
  tuneTankForSpecies(tank, sp, fresh);
}
