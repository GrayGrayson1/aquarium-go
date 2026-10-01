/**
 * Equipment & food "fit": will this gear or food actually help the animals in this tank — and if not, why not?
 * OWNER: lane "fit". Pure, read-only helpers over the game state (no mutation, no RNG), safe to call from the UI.
 *
 * Every verdict is built from data the sim really uses — species temperature / flow / light preferences, diet tags,
 * `special` flags (escape artists, copepod eaters, high-oxygen species), the equipment summary, the expected
 * temperature the thermostats will hold, and the one autofeeder rule (dry food only, src/sim/care/autofeed.ts) — so a
 * hint never promises what the simulation won't deliver.
 *
 * Stable API (other lanes import these from '@/sim/care/fit'):
 *   equipmentFit(state, tankId, defId)        before buying / installing one more unit of `defId`
 *   installedFit(state, tankId, equipmentId)  a unit already in the tank (null for failed units — failure is shown elsewhere)
 *   tankGearIssues(state, tankId, opts?)      running gear that isn't helping (tank card notes, attention dots)
 *   foodFit(state, foodId, tankId?)           who eats a food here / elsewhere, and whether an autofeeder can drop it
 *   FIT_LABEL / FIT_TONE                      badge word and status colour for a FitLevel
 * and re-exports the autofeeder rules (canAutofeed, autofeedFoodsFor, planAutofeed, isAutofeederFood …).
 */
import type { EquipmentDef, EquipmentInstance, FoodDef, FoodForm, GameState, Tank } from '@/types';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getFoodDef, foodForm } from '@/data/catalog/foods';
import { getDecorDef, isLiving } from '@/data/catalog/decor';
import { findSpecies } from '@/data/species';
import { ROOM_TEMP_C, isSaltClass } from '../water/constants';
import { equipmentSummary, expectedTempC, flowInfo, flowMismatch, inhabitantsOf, safeGallons, skimmerSalinityFactor, FLOW_LABEL, type Inhabitant } from '../water/env';
import { aOrAn } from '../economy/util';
import { moduleFor } from '../life/breeding/registry';
import { currentPhase } from '../life/breeding/clutch';
import { MAX_PER_KIND, KIND_PLURAL, idealBand, defaultSettingFor } from './tuning';
import {
  autofeedFoodsFor,
  autofeederFoods,
  canAutofeed,
  cannotAutofeedText,
  eatsFood,
  groupEaters,
  handFoodPhrase,
  isAutofeederFood,
  onlyHandFoodClause,
  planAutofeed,
  suitedDryFoods,
  whoPhrase,
  whoShort,
  type EaterGroup,
} from './autofeed';

export {
  autofeedFoodsFor,
  autofeederFoods,
  canAutofeed,
  cannotAutofeedText,
  eatsFood,
  groupEaters,
  handFoodPhrase,
  isAutofeederFood,
  planAutofeed,
  suitedDryFoods,
  whoPhrase,
  whoShort,
  type EaterGroup,
};
export { autofeedMessage, pickAutofeedFood, FOOD_TAG_WORDS, type AutofeedPlan, type AutofeedMessage } from './autofeed';

// ───────────────────────────── Verdicts ─────────────────────────────

/** ok = helps here · partial = helps with a catch · useless = won't help these animals · harmful = works against them. */
export type FitLevel = 'ok' | 'partial' | 'useless' | 'harmful';

export interface FitVerdict {
  level: FitLevel;
  /** Badge word ("Good fit", "Won't help", "Can't install"…). */
  label: string;
  /** One plain, specific sentence — what it does in this tank and why, naming the animals. */
  text: string;
  /** Short names of the animals the verdict is about ("3 lined seahorses"). */
  who?: string[];
  /** Nothing in this tank to judge it by (empty tank, or just the device's general purpose). */
  general?: boolean;
  /** It can't be installed here at all (wrong water, or the tank already holds the most of this kind). */
  blocked?: boolean;
  /** A caveat, not a problem ("Optional" heater, a "Backup" chiller): shown in a neutral tone, never as a warning. */
  soft?: boolean;
  /** Running in the tank, it leaves animals without something they need (unfed by the autofeeder, battered by flow,
   *  CO₂ with no plants…) — worth an attention dot, not just a shrug. */
  attention?: boolean;
  /** lane:qa-r3 — worth a note beside the running gear even while it needs no dot (an autofeeder that feeds some of the
   *  animals: the ones it misses get a dot only once they are actually going hungry, so hand-feeding them clears it). */
  note?: boolean;
}

export const FIT_LABEL: Record<FitLevel, string> = { ok: 'Good fit', partial: 'Partly helps', useless: 'Won’t help', harmful: 'Harmful' };
/** Status colour for a level (the game's palette: watch = amber, danger = red). */
export const FIT_TONE: Record<FitLevel, 'good' | 'watch' | 'danger'> = { ok: 'good', partial: 'watch', useless: 'watch', harmful: 'danger' };

const RANK: Record<FitLevel, number> = { ok: 0, partial: 1, useless: 2, harmful: 3 };

const v = (level: FitLevel, text: string, extra: Partial<FitVerdict> = {}): FitVerdict => ({ level, label: FIT_LABEL[level], text, ...extra });
const general = (text: string): FitVerdict => v('ok', text, { general: true });

// ───────────────────────────── Text helpers ─────────────────────────────

const lc = (s: string) => s.toLowerCase();
const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const num = (x: number) => (Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1));
const degC = (x: number) => `${num(x)} °C`;
const rangeC = (a: number, b: number) => `${num(a)}–${num(b)} °C`;
const isPlural = (gs: readonly EaterGroup[]) => gs.length > 1 || (gs[0]?.count ?? 0) > 1;
/** "your 3 lined seahorses" / "Ember the betta" / "your animals" (more than two species). */
const animals = (gs: readonly EaterGroup[]) => (gs.length > 2 ? 'your animals' : joinAnd(gs.map(whoPhrase)));
const verb = (gs: readonly EaterGroup[], plural: string, single: string) => (gs.length > 2 || isPlural(gs) ? plural : single);
const whoOf = (gs: readonly EaterGroup[]) => gs.map(whoShort);

// ───────────────────────────── Context ─────────────────────────────

interface FitCtx {
  state: GameState;
  tank: Tank;
  def: EquipmentDef;
  /** The unit being judged (hypothetical for a purchase), running. */
  inst: EquipmentInstance;
  /** The tank with the unit running. */
  withIt: Tank;
  /** The tank without the unit. */
  without: Tank;
  installed: boolean;
  inh: Inhabitant[];
  groups: EaterGroup[];
  gallons: number;
}

const withEquipment = (tank: Tank, equipment: EquipmentInstance[]): Tank => ({ ...tank, equipment });

function livingDecor(tank: Tank): { plants: number; corals: number; needPar: number; needer: 'plants' | 'corals' | null } {
  let plants = 0;
  let corals = 0;
  let needPar = 0;
  let needer: 'plants' | 'corals' | null = null;
  for (const d of tank.decor ?? []) {
    const def = getDecorDef(d.defId);
    if (!def || !isLiving(def)) continue;
    if (def.category === 'plant') plants++;
    else corals++;
    const need = def.lightNeed ?? 0.3;
    if (need > needPar) {
      needPar = need;
      needer = def.category === 'plant' ? 'plants' : 'corals';
    }
  }
  return { plants, corals, needPar, needer };
}

const livingWord = (l: { plants: number; corals: number }) => (l.plants && l.corals ? 'plants and corals' : l.corals ? 'corals' : 'plants');

// ───────────────────────────── Per-kind rules ─────────────────────────────

function autofeederFit(c: FitCtx): FitVerdict {
  if (!c.groups.length)
    return general('Feeds dry food on a schedule — fine for flake and pellet eaters. Seahorses, puffers and other frozen- or live-food eaters still need feeding by hand.');
  const species = c.inh.map((i) => i.species);
  const cannot = c.groups.filter((g) => !canAutofeed(g.sp));
  const dry = c.groups.filter((g) => canAutofeed(g.sp));
  if (!dry.length) return v('useless', cannotAutofeedText(cannot), { who: whoOf(cannot), attention: true });
  // What it drops from the food you own (the hopper holds one food: the one most animals here eat); with no dry food
  // they eat on the shelf, what it would drop once you buy some.
  const owned = planAutofeed(c.state.inventory.foods, species);
  const plan = owned.foodId ? owned : planAutofeed(Object.fromEntries(autofeederFoods().map((f) => [f.id, 1e9])), species);
  const food = plan.foodId ? getFoodDef(plan.foodId) : undefined;
  const missed = c.groups.filter((g) => plan.wrongFood.some((s) => s.id === g.sp.id));
  const fed = c.groups.filter((g) => plan.fed.some((s) => s.id === g.sp.id));
  const parts: string[] = [];
  let level: FitLevel = 'ok';
  let attention = false;
  // lane:qa-r3 — it does feed someone here, so the animals it misses are a standing note on the gear; they earn a dot
  // (live) only while one of them is going hungry — hand-feeding them clears it, as a dot should.
  const hungry = (gs: readonly EaterGroup[]) => c.inh.some((i) => gs.some((g) => g.sp.id === i.species.id) && (i.creature.stats?.hunger ?? 0) >= HUNGRY);
  if (cannot.length) {
    level = 'partial';
    attention = hungry(cannot);
    parts.push(`It can feed ${animals(dry)}, but ${onlyHandFoodClause(cannot)} — keep feeding ${isPlural(cannot) ? 'them' : 'it'} by hand.`);
  }
  if (missed.length && food) {
    level = 'partial';
    attention ||= hungry(missed);
    const alt = suitedDryFoods(missed.map((g) => g.sp)).map((f) => lc(f.name));
    parts.push(`It drops one dry food per feeding — ${lc(food.name)}, for ${animals(fed)} — and ${animals(missed)} ${verb(missed, 'don’t', 'doesn’t')} eat it; give ${isPlural(missed) ? 'them' : 'it'} ${alt.join(' or ')} by hand.`);
  }
  const one = !isPlural(dry) && dry.length === 1;
  if (!parts.length) parts.push(`${capFirst(animals(dry))} ${verb(dry, 'all take', 'takes')} ${food ? lc(food.name) : 'dry food'}, so an autofeeder can keep ${one ? 'it' : 'everyone'} fed.`);
  if (!owned.foodId) {
    parts.push(`You have no dry food ${one ? 'it eats' : 'they eat'} in stock${food ? ` — buy ${food.name} first` : ''}.`);
    if (level === 'ok') return v('partial', parts.join(' '), { label: 'Needs food', who: whoOf(dry) });
  }
  const about = [...cannot, ...missed];
  return v(level, parts.join(' '), { who: whoOf(about.length ? about : dry), attention, note: level !== 'ok' });
}

/** lane:qa-r3 — hunger at which animals an autofeeder misses earn the tank a dot (the creature card says "Getting peckish" from 55). */
const HUNGRY = 60;

function heaterFit(c: FitCtx): FitVerdict {
  if (!c.groups.length) return general('Holds tropical water steady against the room (about 22 °C). Cool-water animals such as axolotls and goldfish don’t need one.');
  const band = idealBand(c.state, c.tank, 'tempC');
  const who = animals(c.groups);
  const sNow = equipmentSummary(c.without);
  if (band.max < ROOM_TEMP_C - 0.5)
    return v(
      'useless',
      `${capFirst(who)} ${verb(c.groups, 'need', 'needs')} ${rangeC(band.min, band.max)} — cooler than the room (about 22 °C). A heater can’t cool water${sNow.chillers.length ? '; the chiller does that job' : ' — a chiller can'}, so this one would only sit as a cold-room safety net.`,
      { who: whoOf(c.groups) },
    );
  // The room swings about ±0.8 °C around 22 °C (roomTempAt): only a band that holds the whole swing makes heat optional.
  const roomOk = band.min <= ROOM_TEMP_C - 0.8;
  if (roomOk && band.max < ROOM_TEMP_C + 0.8)
    return v('useless', `${capFirst(who)} ${verb(c.groups, 'like', 'likes')} ${rangeC(band.min, band.max)} — the room (about 22 °C) already sits at the warm end of that, so a heater won’t help ${c.groups.length > 1 || isPlural(c.groups) ? 'them' : 'it'}.`, { who: whoOf(c.groups) });
  if (roomOk)
    return v('partial', `${capFirst(who)} ${verb(c.groups, 'are', 'is')} comfortable at ${rangeC(band.min, band.max)}, and the room sits near 22 °C — a heater is optional here; it only steadies cooler nights.`, { label: 'Optional', soft: true, who: whoOf(c.groups) });
  const tWithout = expectedTempC(c.without);
  const tWith = expectedTempC(c.withIt);
  if (sNow.heaters.length && tWithout >= band.min - 0.2) {
    const warm = sNow.heaterSet !== null && sNow.heaterSet > band.max + 0.2 ? ` (It’s set to ${degC(sNow.heaterSet)}, a little warm for ${who} — about ${degC(Math.round(band.mid * 2) / 2)} suits ${verb(c.groups, 'them', 'it')}.)` : '';
    return v('ok', `A good backup: the heater already here holds about ${degC(tWithout)}. If one heater fails or sticks, the other keeps ${who} warm.${warm}`, { who: whoOf(c.groups) });
  }
  if (tWith < band.min - 0.3)
    return v('partial', `Too weak for ${aOrAn(c.gallons)} ${c.gallons}-gallon tank on its own: it can only hold about ${degC(tWith)}, and ${who} ${verb(c.groups, 'need', 'needs')} ${degC(band.min)} or more. Add a bigger heater too.`, { who: whoOf(c.groups) });
  return v('ok', `${capFirst(who)} ${verb(c.groups, 'need', 'needs')} ${rangeC(band.min, band.max)} — warmer than the room (about 22 °C) — and this holds about ${degC(tWith)}.`, { who: whoOf(c.groups) });
}

function chillerFit(c: FitCtx): FitVerdict {
  if (!c.groups.length) return general('Only needed for cool-water animals such as axolotls, or reefs under hot lights — the room sits near 22 °C.');
  const band = idealBand(c.state, c.tank, 'tempC');
  const who = animals(c.groups);
  const tWithout = expectedTempC(c.without);
  const tWith = expectedTempC(c.withIt);
  const hot = heaterTooHigh(c, band.max);
  if (hot) return v('useless', hot, { who: whoOf(c.groups) });
  if (equipmentSummary(c.without).chillers.length && tWithout <= band.max + 0.3)
    return v('partial', `The chiller already here holds about ${degC(tWithout)} for ${who} (${rangeC(band.min, band.max)}) — a second one is only a spare in case it fails.`, { label: 'Backup', soft: true, who: whoOf(c.groups) });
  if (tWithout > band.max + 0.3) {
    if (tWith > band.max + 0.3)
      return v('partial', `${capFirst(who)} ${verb(c.groups, 'need', 'needs')} ${rangeC(band.min, band.max)}. Without cooling this tank sits near ${degC(tWithout)}, and this chiller only pulls it to about ${degC(tWith)} — too small for ${c.gallons} gallons.`, { who: whoOf(c.groups) });
    return v('ok', `${capFirst(who)} ${verb(c.groups, 'need', 'needs')} ${rangeC(band.min, band.max)}, but without cooling this tank sits near ${degC(tWithout)} — this chiller holds about ${degC(tWith)}.`, { who: whoOf(c.groups) });
  }
  return v('useless', `${capFirst(who)} ${verb(c.groups, 'are', 'is')} happy at ${rangeC(band.min, band.max)} and this tank already holds about ${degC(tWithout)} — a chiller has nothing to do here. Chillers are for cool-water animals or reefs under hot lights.`, { who: whoOf(c.groups) });
}

/** When the tank is too warm only because a heater is set above the animals' range, that's the fix — not cooling gear. */
function heaterTooHigh(c: FitCtx, max: number): string | null {
  const s = equipmentSummary(c.without);
  if (s.heaterSet === null || s.heaterSet <= max + 0.2) return null;
  const want = idealBand(c.state, c.tank, 'tempC').mid;
  return `The warmth here comes from the heater, set to ${degC(s.heaterSet)} — above the ${degC(max)} ${animals(c.groups)} ${verb(c.groups, 'like', 'likes')}. Turn it down to about ${degC(Math.round(want * 2) / 2)} instead; cooling gear would only fight it.`;
}

function fanFit(c: FitCtx): FitVerdict {
  if (!c.groups.length) return general('Cools 1–2 °C by evaporation — a mild fix for a slightly warm tank, not a chiller.');
  const band = idealBand(c.state, c.tank, 'tempC');
  const who = animals(c.groups);
  const tWithout = expectedTempC(c.without);
  const tWith = expectedTempC(c.withIt);
  if (band.min > ROOM_TEMP_C + 0.3)
    return v('useless', `${capFirst(who)} ${verb(c.groups, 'need', 'needs')} warmth (${rangeC(band.min, band.max)}), not cooling — a fan only makes the heater work harder and the water evaporate faster.`, { who: whoOf(c.groups), attention: equipmentSummary(c.without).heaters.length > 0 });
  const hot = heaterTooHigh(c, band.max);
  if (hot) return v('useless', hot, { who: whoOf(c.groups) });
  if (tWithout > band.max + 0.3) {
    const delta = Math.max(0, tWithout - tWith);
    if (tWith <= band.max + 0.3) return v('ok', `Cools about ${num(delta)} °C — enough to keep ${who} under ${degC(band.max)}. Expect to top off more often.`, { who: whoOf(c.groups) });
    return v('partial', `Cools only about ${num(delta)} °C: ${who} ${verb(c.groups, 'need', 'needs')} ${degC(band.max)} or less and this tank sits near ${degC(tWithout)} — a chiller is the real fix.`, { who: whoOf(c.groups) });
  }
  return v('useless', `This tank isn’t too warm for ${who} (${rangeC(band.min, band.max)}) — a fan would only speed up evaporation.`, { who: whoOf(c.groups) });
}

function lightFit(c: FitCtx): FitVerdict {
  const s0 = equipmentSummary(c.without);
  const s1 = equipmentSummary(c.withIt);
  const intensity = c.tank.lighting?.intensity ?? 1;
  const living = livingDecor(c.tank);
  const level = (par: number) => (par * intensity < 0.35 ? 0 : par * intensity < 0.75 ? 1 : 2);
  const dim = c.groups.filter((g) => g.sp.lightPreference === 'dim');
  if (dim.length && level(s1.par) === 2)
    return v('partial', `Bright for ${animals(dim)}, which ${verb(dim, 'prefer', 'prefers')} dim, shaded water — keep the intensity low or add floating plants and caves for shade.`, { who: whoOf(dim) });
  const any = living.plants + living.corals > 0;
  if (any && living.needPar > s0.par * intensity + 0.05) {
    if (s1.par * intensity >= living.needPar - 0.05) return v('ok', `Gives your ${livingWord(living)} the light they need to grow${s0.lights.length ? '' : ', and the animals a day/night rhythm'}.`);
    return v('partial', `Better than ${s0.lights.length ? 'what’s here' : 'no light'}, but your ${living.needer ?? livingWord(living)} need stronger light than this to thrive.`);
  }
  if (!s0.lights.length) return v('ok', c.groups.length ? 'This tank has no light yet — animals need a day/night rhythm.' : 'Plants and corals need light, and animals need a day/night rhythm.', { general: !c.groups.length && !any });
  return general('Adds light for plants and corals, and a brighter display.');
}

function airstoneFit(c: FitCtx): FitVerdict {
  const s0 = equipmentSummary(c.without);
  if (s0.co2 > 0) return v('partial', 'Its bubbles drive off the injected CO₂ your plants use — run it only at night, when the plants aren’t using CO₂.');
  const highOx = c.groups.filter((g) => g.sp.special?.highOxygen);
  if (highOx.length) return v('ok', `${capFirst(animals(highOx))} ${verb(highOx, 'need', 'needs')} cool, oxygen-rich water — this helps.`, { who: whoOf(highOx) });
  if (c.groups.length && (c.tank.water?.oxygen ?? 1) < 0.7) return v('ok', `Oxygen is on the low side here (${Math.round((c.tank.water.oxygen ?? 0) * 100)}% of saturation) — this raises it.`);
  return general('More oxygen — a cheap safety net in warm or crowded tanks.');
}

function flowFit(c: FitCtx): FitVerdict {
  const pump = c.def.kind === 'powerhead' || c.def.kind === 'wavemaker';
  if (!c.groups.length)
    return general(pump ? 'Adds circulation so waste reaches the filter. Keep it gentle for seahorses, bettas and other weak swimmers.' : 'Every tank needs filtration: its bacteria turn toxic ammonia into nitrate.');
  const f0 = flowInfo(c.without);
  const f1 = flowInfo(c.withIt);
  // Only blame this unit for strong current if it is what makes the current strong: it raises the flow level, or (with
  // several pumps sharing the job) carries at least a third of the flow.
  const s0 = equipmentSummary(c.without);
  const s1 = equipmentSummary(c.withIt);
  const share = s1.flowGph > 0 ? (s1.flowGph - s0.flowGph) / s1.flowGph : 0;
  const blame = (after: string) => f1.index > f0.index || (after === 'too_strong' && share >= 0.33);
  const rows = c.groups.map((g) => {
    const after = flowMismatch(f1.index, g.sp);
    const before = flowMismatch(f0.index, g.sp);
    return { g, before, after: (after === 'too_strong' || after === 'bit_strong') && !blame(after) ? 'ok' : after };
  });
  const tooStrong = rows.filter((r) => r.after === 'too_strong').map((r) => r.g);
  const bitStrong = rows.filter((r) => r.after === 'bit_strong').map((r) => r.g);
  const helped = rows.filter((r) => (r.before === 'too_still' || r.before === 'bit_still') && (r.after === 'ok' || (r.before === 'too_still' && r.after === 'bit_still'))).map((r) => r.g);
  const pref = (gs: EaterGroup[]) => FLOW_LABEL[gs[0].sp.flowPreference];
  const pct = Math.round((c.inst.setting ?? 1) * 100);
  if (tooStrong.length) {
    if (!pump)
      return v('partial', `Its outflow makes the current too strong for ${animals(tooStrong)}, which ${verb(tooStrong, 'need', 'needs')} ${pref(tooStrong)} flow — turn its flow down or choose a sponge filter.`, { who: whoOf(tooStrong), attention: true });
    return v('harmful', `${pct < 100 ? `Even turned down to ${pct}%, it` : 'It'} makes the current too strong for ${animals(tooStrong)}, which ${verb(tooStrong, 'need', 'needs')} ${pref(tooStrong)} flow — strong current wears weak swimmers out and stresses them.`, { who: whoOf(tooStrong), attention: true });
  }
  if (bitStrong.length) return v('partial', `It makes the current a little strong for ${animals(bitStrong)} (${verb(bitStrong, 'they like', 'it likes')} ${pref(bitStrong)} flow) — keep it turned down.`, { who: whoOf(bitStrong) });
  if (helped.length) return v('ok', `Gives ${animals(helped)} the ${FLOW_LABEL[helped[0].sp.flowPreference]} current ${verb(helped, 'they need', 'it needs')}.`, { who: whoOf(helped) });
  if (!pump) {
    if (!s0.filters.length) return v('ok', 'This tank has no filter yet — every tank needs one: its bacteria turn toxic ammonia into nitrate.');
    if ((c.tank.cache?.stockingLoad ?? 0) > 1) return v('ok', 'This tank is stocked beyond what its filter can handle — this adds the capacity it needs.');
    return general('Adds biological filtration — more bacteria to turn ammonia into nitrate.');
  }
  const gentle = c.groups.filter((g) => g.sp.flowPreference === 'very_low' || g.sp.flowPreference === 'low');
  if (gentle.length && pct <= 30) return v('ok', `Set to a gentle ${pct}% for ${animals(gentle)}, it adds circulation without battering ${isPlural(gentle) || gentle.length > 1 ? 'them' : 'it'}.`, { who: whoOf(gentle) });
  return general('Adds circulation so waste reaches the filter and the surface keeps moving.');
}

function skimmerFit(c: FitCtx): FitVerdict {
  const sg = c.tank.water?.salinitySG ?? 1.025;
  const k = skimmerSalinityFactor(sg);
  if (k < 0.35) return v('useless', `Skimmers need near sea-strength salt water to foam. At this tank’s salinity (SG ${sg.toFixed(3)}) it would remove almost nothing — water changes do the job here.`);
  if (k < 0.95) return v('partial', `Skimmers foam best in full-strength sea water; at SG ${sg.toFixed(3)} it only does part of the job.`);
  if ((c.tank.water?.nitrate ?? 0) > 30 && c.groups.length) return v('ok', `Nitrate is ${Math.round(c.tank.water.nitrate)} ppm here — a skimmer pulls out waste before it becomes nitrate.`);
  return general('Strips dissolved waste before it becomes nitrate, and adds oxygen.');
}

function refugiumFit(c: FitCtx): FitVerdict {
  const podNeeders = c.groups.filter((g) => g.sp.special?.needsPods);
  if (podNeeders.length) return v('ok', `${capFirst(animals(podNeeders))} ${verb(podNeeders, 'live', 'lives')} on copepods — a refugium keeps a breeding supply drifting into the tank.`, { who: whoOf(podNeeders) });
  const podEaters = c.groups.filter((g) => g.sp.foods.includes('copepod_live'));
  if (podEaters.length) return v('ok', `Copepods breed safely there and drift out as live food for ${animals(podEaters)}.`, { who: whoOf(podEaters) });
  return general('Macroalgae soaks up nitrate, and copepods breed there safely.');
}

function uvFit(c: FitCtx): FitVerdict {
  const w = c.tank.water;
  if (w && (w.algae > 40 || w.clarity < 0.75)) return v('ok', `The water here is ${w.algae > 40 ? 'turning green' : 'cloudy'} — UV clears free-floating algae and bacteria (not algae already on the glass).`);
  return general('Kills free-floating algae and bacteria — insurance against green water. It won’t remove algae on the glass.');
}

function atoFit(c: FitCtx): FitVerdict {
  if (isSaltClass(c.tank.waterClass)) return v('ok', 'Keeps salinity steady: only water evaporates, never salt, so topping off by hand is a daily chore without it.', { general: true });
  return general('Keeps the water level up so filters never run dry. Fresh water needs it less than salt water does.');
}

function co2Fit(c: FitCtx): FitVerdict {
  const living = livingDecor(c.tank);
  if (!living.plants)
    return v('useless', `CO₂ only feeds live plants — with none in this tank it would just lower the pH${c.groups.length ? ` and stress ${animals(c.groups)}` : ''}.`, { attention: c.groups.length > 0, who: whoOf(c.groups) });
  const s0 = equipmentSummary(c.without);
  const airstone = s0.entries.some((e) => e.def.kind === 'airstone' && e.inst.on && !e.inst.failed);
  if (airstone) return v('partial', 'The airstone here drives the CO₂ straight back out — run the airstone only at night.');
  return v('ok', `Your ${living.plants} live plant${living.plants === 1 ? '' : 's'} will grow faster and pearl under good light. Keep the surface moving at night so the animals aren’t short of oxygen.`);
}

function lidFit(c: FitCtx): FitVerdict {
  const jumpers = c.groups.filter((g) => g.sp.special?.escapeArtist);
  if (jumpers.length) return v('ok', `${capFirst(animals(jumpers))} can jump or climb out — a lid keeps ${isPlural(jumpers) || jumpers.length > 1 ? 'them' : 'it'} in, and cuts evaporation too.`, { who: whoOf(jumpers) });
  return general('Cuts evaporation by about two thirds and stops surprise jumpers.');
}

function kindFit(c: FitCtx): FitVerdict {
  switch (c.def.kind) {
    case 'autofeeder':
      return autofeederFit(c);
    case 'heater':
      return heaterFit(c);
    case 'chiller':
      return chillerFit(c);
    case 'fan':
      return fanFit(c);
    case 'light':
      return lightFit(c);
    case 'airstone':
      return airstoneFit(c);
    case 'filter':
    case 'powerhead':
    case 'wavemaker':
      return flowFit(c);
    case 'skimmer':
      return skimmerFit(c);
    case 'refugium':
      return refugiumFit(c);
    case 'uv':
      return uvFit(c);
    case 'ato':
      return atoFit(c);
    case 'co2':
      return co2Fit(c);
    case 'lid':
      return lidFit(c);
    default:
      return general(c.def.description);
  }
}

/** Size notes on top of the kind's verdict (heaters/chillers already judge their own power). */
function sizeNote(c: FitCtx, out: FitVerdict): FitVerdict {
  if (out.level === 'useless' || out.level === 'harmful') return out;
  const { min, max } = c.def.gallonsRange;
  const k = c.def.kind;
  if (k === 'heater' && c.gallons < min * 0.6)
    return { ...v('partial', `${out.text} Oversized for ${aOrAn(c.gallons)} ${c.gallons}-gallon tank, though: if its thermostat ever sticks on, it can overheat the water within hours.`), who: out.who };
  if (k !== 'heater' && k !== 'chiller' && k !== 'lid' && k !== 'autofeeder' && k !== 'ato' && k !== 'co2' && c.gallons > max * 1.05)
    return { ...v('partial', `${out.general ? '' : `${out.text} `}It’s undersized for ${aOrAn(c.gallons)} ${c.gallons}-gallon tank (made for ${min}–${max} gallons), so it will only do part of the job.`), who: out.who, attention: out.attention, note: out.note };
  return out;
}

function blockedText(def: EquipmentDef, tank: Tank): string {
  switch (def.kind) {
    case 'skimmer':
      return 'Protein skimmers only work in salt water — fresh water won’t foam.';
    case 'co2':
      return 'CO₂ injection is for freshwater planted tanks.';
    case 'refugium':
      return 'A macroalgae refugium is a marine system.';
    case 'light':
      return def.environments.includes('freshwater') ? 'Planted-tank lights are made for freshwater plants.' : 'Reef lights are built for marine and brackish tanks.';
    default:
      return `The ${def.name} isn’t made for ${tank.environment} tanks.`;
  }
}

function makeCtx(state: GameState, tank: Tank, def: EquipmentDef, inst: EquipmentInstance, installed: boolean): FitCtx {
  const running: EquipmentInstance = { ...inst, on: true, failed: false };
  delete running.failMode;
  const others = (tank.equipment ?? []).filter((e) => e.id !== inst.id);
  const inh = inhabitantsOf(state, tank.id);
  return {
    state,
    tank,
    def,
    inst: running,
    withIt: withEquipment(tank, [...others, running]),
    without: withEquipment(tank, others),
    installed,
    inh,
    groups: groupEaters(inh),
    gallons: safeGallons(tank),
  };
}

function judge(c: FitCtx): FitVerdict {
  try {
    return sizeNote(c, kindFit(c));
  } catch {
    return general(c.def.description); // never let a hint break a panel
  }
}

/**
 * Would one more unit of `defId` help the animals in this tank? (Before buying or installing it.)
 * The hypothetical unit gets the setting installEquipment would give it (thermostat for these animals, gentle pumps).
 */
export function equipmentFit(state: GameState, tankOrId: Tank | string, defId: string): FitVerdict {
  const tank = typeof tankOrId === 'string' ? state.tanks[tankOrId] : tankOrId;
  const def = getEquipmentDef(defId);
  if (!def) return v('useless', 'Unknown equipment.', { blocked: true, label: 'Can’t install' });
  if (!tank) return general(def.description);
  if (def.environments.length && !def.environments.includes(tank.environment)) return v('useless', blockedText(def, tank), { blocked: true, label: 'Can’t install' });
  const same = (tank.equipment ?? []).filter((e) => getEquipmentDef(e.defId)?.kind === def.kind).length;
  const max = MAX_PER_KIND[def.kind] ?? 6;
  if (same >= max)
    return v('useless', max === 1 ? `This tank already has ${aOrAn(def.name)} ${lc(def.name)} — one is all it needs.` : `This tank already has ${same} ${KIND_PLURAL[def.kind] ?? `${def.kind}s`} — that’s the most that fit.`, { blocked: true, label: 'Already fitted', soft: true }); // lane:qa-r3 — a fact, not a warning: neutral
  const setting = defaultSettingFor(state, tank, def.kind, def.stats.defaultSetting);
  const inst: EquipmentInstance = { id: '__fit_preview', defId, installedHour: state.clock?.hour ?? 0, condition: 1, on: true, setting };
  return judge(makeCtx(state, tank, def, inst, false));
}

/** Is a unit already in the tank helping? Null for failed units (the failure is the story) or unknown ids. */
export function installedFit(state: GameState, tankOrId: Tank | string, equipmentId: string): FitVerdict | null {
  const tank = typeof tankOrId === 'string' ? state.tanks[tankOrId] : tankOrId;
  const inst = tank?.equipment?.find((e) => e.id === equipmentId);
  const def = inst ? getEquipmentDef(inst.defId) : undefined;
  if (!tank || !inst || !def || inst.failed) return null;
  return judge(makeCtx(state, tank, def, inst, true));
}

export interface GearIssue {
  equipmentId: string;
  defId: string;
  name: string;
  verdict: FitVerdict;
}

/**
 * Running gear in this tank that isn't helping its animals: useless or harmful units, and anything flagged
 * `attention` (an autofeeder that leaves animals unfed, flow too strong for them, CO₂ without plants…) or a `note`.
 * `attentionOnly` keeps just the ones worth an attention dot.
 */
export function tankGearIssues(state: GameState, tankId: string, opts: { attentionOnly?: boolean } = {}): GearIssue[] {
  const tank = state.tanks[tankId];
  if (!tank) return [];
  const out: GearIssue[] = [];
  for (const inst of tank.equipment ?? []) {
    if (!inst.on || inst.failed) continue;
    const verdict = installedFit(state, tank, inst.id);
    if (!verdict) continue;
    const show = opts.attentionOnly ? !!verdict.attention : verdict.attention || verdict.note || verdict.level === 'useless' || verdict.level === 'harmful';
    if (show) out.push({ equipmentId: inst.id, defId: inst.defId, name: getEquipmentDef(inst.defId)?.name ?? inst.defId, verdict });
  }
  return out.sort((a, b) => RANK[b.verdict.level] - RANK[a.verdict.level]);
}

// ───────────────────────────── Food ─────────────────────────────

export interface FoodEaterGroup {
  speciesId: string;
  /** "3 lined seahorses" / "betta". */
  who: string;
  count: number;
  tankId: string;
  tankName: string;
}

export interface FoodFit {
  foodId: string;
  form: FoodForm;
  /** An autofeeder can dispense it (dry food). */
  autofeeder: boolean;
  /** Animals in the given tank that eat it. */
  here: FoodEaterGroup[];
  /** Animals in your other tanks (all tanks when no tank is given) that eat it. */
  elsewhere: FoodEaterGroup[];
  /** Growing fry / larvae whose current food this is. */
  young: { tankId: string; tankName: string; label: string }[];
  /** 'useless' = nobody you keep (or are raising) eats it. */
  level: 'ok' | 'useless';
  /** "Eaten by 3 lined seahorses (Seahorse Haven) and 2 firefish (Reef)." / "Nobody you keep eats this." */
  text: string;
  /** "Dry — an autofeeder can drop it." / "Frozen — thaw it and feed by hand; an autofeeder can’t." */
  formText: string;
}

const FORM_TEXT: Record<FoodForm, string> = {
  dry: 'Dry — an autofeeder can dispense it.',
  frozen: 'Frozen — thaw it and feed by hand; an autofeeder can’t dispense it.',
  live: 'Live — add it by hand; an autofeeder can’t hold live food.',
  fresh: 'Fresh — feed by hand and remove leftovers; an autofeeder can’t hold it.',
  prepared: 'Feed by hand — an autofeeder can’t dispense it.',
};

function eaterGroupsIn(state: GameState, tank: Tank, food: FoodDef): FoodEaterGroup[] {
  const groups = groupEaters(inhabitantsOf(state, tank.id).filter((i) => eatsFood(i.species, food)));
  return groups.map((g) => ({ speciesId: g.sp.id, who: whoShort(g), count: g.count, tankId: tank.id, tankName: tank.name }));
}

function youngEating(state: GameState, tank: Tank, food: FoodDef): string | null {
  for (const cl of Object.values(state.clutches ?? {})) {
    if (cl.tankId !== tank.id || cl.count <= 0 || cl.stage === 'eggs' || cl.stage === 'in_pouch') continue;
    const sp = findSpecies(cl.speciesId);
    if (!sp) continue;
    try {
      const ph = currentPhase(cl, moduleFor(sp));
      if (ph?.foods.some((t) => food.tags.includes(t))) return ph.label || 'young';
    } catch {
      /* breeding data mid-edit: skip */
    }
  }
  return null;
}

const listGroups = (gs: FoodEaterGroup[], withTank: boolean, max = 3): string => {
  const shown = gs.slice(0, max).map((g) => (withTank ? `${g.who} (${g.tankName})` : g.who));
  const more = gs.length - shown.length;
  return more > 0 ? `${shown.join(', ')} and ${more} more` : joinAnd(shown);
};

/** Who eats this food — in `tankId` if given, and across the facility — and whether an autofeeder can drop it. */
export function foodFit(state: GameState, foodId: string, tankId?: string | null): FoodFit {
  const food = getFoodDef(foodId);
  const form = foodForm(food);
  const base = { foodId, form, autofeeder: isAutofeederFood(food), formText: FORM_TEXT[form] };
  if (!food) return { ...base, here: [], elsewhere: [], young: [], level: 'useless', text: 'Unknown food.' };
  const here: FoodEaterGroup[] = [];
  const elsewhere: FoodEaterGroup[] = [];
  const young: FoodFit['young'] = [];
  for (const id of state.tankOrder ?? Object.keys(state.tanks)) {
    const t = state.tanks[id];
    if (!t) continue;
    const gs = eaterGroupsIn(state, t, food);
    (tankId && id === tankId ? here : elsewhere).push(...gs);
    const y = youngEating(state, t, food);
    if (y) young.push({ tankId: t.id, tankName: t.name, label: y });
  }
  const multiTank = new Set(elsewhere.map((g) => g.tankId)).size > 1 || (!tankId && (state.tankOrder?.length ?? 0) > 1);
  const youngText = young.length ? `${young.length === 1 ? `the ${young[0].label} in ${young[0].tankName}` : 'your growing fry'}` : '';
  let text: string;
  if (tankId) {
    const tankName = state.tanks[tankId]?.name ?? 'this tank';
    if (here.length) text = `Eaten here by ${listGroups(here, false)}${elsewhere.length ? `; also by ${listGroups(elsewhere, true, 2)}` : ''}.`;
    else if (elsewhere.length || youngText) text = `Nothing in ${tankName} eats it — ${[elsewhere.length ? listGroups(elsewhere, true) : '', youngText].filter(Boolean).join(' and ')} ${elsewhere.length + young.length > 1 || (elsewhere[0]?.count ?? 1) > 1 ? 'do' : 'does'}.`;
    else text = 'Nobody you keep eats this.';
  } else if (elsewhere.length) text = `Eaten by ${listGroups(elsewhere, multiTank)}${youngText ? `, and ${youngText}` : ''}.`;
  else if (youngText) text = `Food for ${youngText}.`;
  else text = 'Nobody you keep eats this.';
  const level = here.length || elsewhere.length || young.length ? 'ok' : 'useless';
  return { ...base, here, elsewhere, young, level, text };
}
