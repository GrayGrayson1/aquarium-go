/**
 * Welfare model: per-tank environment snapshot, water fallback checks, habitat fit and explainable stress factors.
 * OWNER: lane "lifecycle". Everything here is pure (reads state, never mutates) so the UI can reuse it for
 * "why is my animal stressed?" explanations.
 */
import { pluralName } from '../economy/util';
import type { Creature, GameState, SpeciesDefinition, Tank } from '@/types';
import { getSpecies, findSpecies } from '@/data/species';
import { getTankTier } from '@/data/catalog/tanks';
import { speciesWaterComfort } from '../water';
import { ammoniaToxicityWeight } from '../water/chem'; // lane:w2-sim
import { TEMP_TOLERANCE_C, isSaltClass } from '../water/constants';
import { tankHabitat, type TankHabitat } from '../aquascape';
import { lightsOn } from '../time';
import { ageDaysOf, gallonsNeededNow } from './growth';
import { tapSensitivityMul } from './personality';
import { illnessDef } from './illness';
import { fitsEnvironment } from '../compat/salinity'; // lane:brackish
import { residentsOf } from '../residents'; // lane:perf2

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : lo);

export type WaterCause = 'too_warm' | 'too_cold' | 'ammonia' | 'nitrite' | 'nitrate' | 'oxygen' | 'salinity' | 'ph' | 'environment' | 'water';

export interface SpeciesWaterView {
  /** 0..100 */
  comfort: number;
  /** Health points lost per game hour (0 = safe). */
  harm: number;
  cause: WaterCause | null;
  /** Noun phrase for the main water problem ("water that is too warm (24.0 °C) — …"), for templated messages. */
  causeText: string | null;
  /** Full-sentence explanation from the water lane when it (not the fallback) identified the problem. */
  sentence?: string | null;
  stressors: string[];
}

/** Convert the water lane's 0..1 harm rate into health points per game hour (1 ≈ lethal within a day). */
/** pH units past a species' limits that only stress (no health damage). */
export const PH_TOLERANCE = 0.3;

export function harmRateToHp(harm: number): number {
  return 6 * Math.pow(clamp(harm, 0, 1), 1.25);
}

/** "X is suffering from …" style sentence for a water problem (null when the water is fine). */
export function waterProblemText(wv: SpeciesWaterView | undefined, who: string, verb = 'is'): string | null {
  if (!wv || !(wv.harm > 0)) return null;
  if (wv.sentence) return `${who} ${verb} struggling with the water. ${wv.sentence}`;
  if (wv.causeText) return `${who} ${verb} suffering from ${wv.causeText}.`;
  return null;
}

/** Short lowercase label from a water-lane sentence ("Water is too warm: 26 °C (…)" → "water is too warm"). */
function shortLabel(sentence: string): string {
  const head = sentence.split(/:\s|\s\(|\s—|\.\s|\.$/)[0].trim();
  return head ? head.charAt(0).toLowerCase() + head.slice(1) : 'water conditions';
}

const SEVERITY_HINTS: [RegExp, number][] = [
  [/cannot survive/i, 10],
  [/burning gills|stops blood|dangerously/i, 8],
  [/too (warm|cold):/i, 7],
  [/outside (what|the safe)/i, 6],
  [/far too/i, 5],
  [/long exposure|weakens/i, 4],
  [/spik|toxic/i, 4],
];

/** The water-lane stressor most likely to be doing harm (its list is in check order, not severity order). */
function worstStressor(stressors: string[]): string | null {
  let best: string | null = null;
  let score = -1;
  for (const st of stressors) {
    let v = 1;
    for (const [re, w] of SEVERITY_HINTS) if (re.test(st)) v = Math.max(v, w);
    if (v > score) {
      score = v;
      best = st;
    }
  }
  return best;
}

export interface GroupInfo {
  n: number;
  adultsMale: number;
  adultsFemale: number;
  juveniles: number;
  ids: string[];
}

export interface TankEnv {
  tank: Tank;
  gallons: number;
  habitat: TankHabitat;
  water: Map<string, SpeciesWaterView>;
  groups: Map<string, GroupInfo>;
  quarantine: boolean;
  /** Target-feed creature id from the water lane marker (if any). */
  targetFeedId: string | null;
}

export const EMPTY_HABITAT: TankHabitat = {
  hides: 0,
  cover: 0,
  sightBreak: 0,
  hitching: 0,
  grazing: 0,
  enrichment: 0,
  nitrateUptake: 0,
  oxygen: 0,
  hasHost: false,
  nestSites: 0,
  hazards: { sharp: false, ingestible: false },
  corals: { soft: 0, lps: 0, sps: 0, zoanthid: 0, mushroom: 0, gsp: 0 },
};

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function tankGallons(tank: Tank): number {
  try {
    return getTankTier(tank.tierId).gallons;
  } catch {
    return 20;
  }
}

/** Optional target-feed marker written by the water/care lane (several shapes tolerated). */
export function readTargetFeed(tank: Tank, hour: number): string | null {
  const raw = (tank.water as unknown as Record<string, unknown>).targetFeed ?? (tank.water as unknown as Record<string, unknown>).targetFeedCreatureId;
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const id = o.creatureId ?? o.targetCreatureId ?? o.id;
    const until = o.untilHour ?? o.expiresHour;
    if (typeof until === 'number' && until < hour) return null;
    if (typeof o.amount === 'number' && o.amount <= 0) return null;
    if (typeof o.units === 'number' && o.units <= 0) return null;
    if (typeof o.hour === 'number' && until === undefined && hour - o.hour > 1.5) return null;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

/** Independent temperature/chemistry checks so welfare stays correct even if water reports are coarse. */
export function fallbackWater(sp: SpeciesDefinition, tank: Tank): SpeciesWaterView {
  const w = tank.water;
  const temp = num(w.tempC, 22);
  let harm = 0;
  let penalty = 0;
  let cause: WaterCause | null = null;
  let causeHarm = 0;
  let causeText: string | null = null;
  const plural = pluralName(sp.commonName);
  const note = (c: WaterCause, h: number, text: string) => {
    harm += h;
    if (h > causeHarm) {
      causeHarm = h;
      cause = c;
      causeText = text;
    }
  };

  // lane:brackish — mollies and bumblebee gobies (brackish) may live in hard fresh water: one shared salinity model.
  if (!fitsEnvironment(sp, tank.environment)) {
    note('environment', 8, `the wrong kind of water — ${plural} are ${sp.environment} animals`);
    penalty += 70;
  }
  // Temperature. Up to TEMP_TOLERANCE_C past a limit is stress only (the water report says WATCH), as for pH; beyond
  // it harm ramps up from zero, so a heater failure at room temperature doesn't mark every marine fish DANGER.
  if (temp > sp.tempC.max) {
    const over = temp - sp.tempC.max;
    if (over > TEMP_TOLERANCE_C) note('too_warm', 0.25 * Math.pow(over - TEMP_TOLERANCE_C, 1.4), `water that is too warm (${temp.toFixed(1)} °C) — ${plural} need ${sp.tempC.idealMin}–${sp.tempC.idealMax} °C`);
    penalty += 35 + over * 8;
  } else if (temp < sp.tempC.min) {
    const under = sp.tempC.min - temp;
    if (under > TEMP_TOLERANCE_C) note('too_cold', 0.2 * Math.pow(under - TEMP_TOLERANCE_C, 1.4), `water that is too cold (${temp.toFixed(1)} °C) — ${plural} need ${sp.tempC.idealMin}–${sp.tempC.idealMax} °C`);
    penalty += 35 + under * 8;
  } else if (temp > sp.tempC.idealMax) {
    penalty += Math.min(30, ((temp - sp.tempC.idealMax) / Math.max(0.5, sp.tempC.max - sp.tempC.idealMax)) * 28);
  } else if (temp < sp.tempC.idealMin) {
    penalty += Math.min(30, ((sp.tempC.idealMin - temp) / Math.max(0.5, sp.tempC.idealMin - sp.tempC.min)) * 24);
  }
  // Salinity
  const sg = num(w.salinitySG, 1);
  if (sp.salinitySG) {
    if (sg < sp.salinitySG.min - 0.002 || sg > sp.salinitySG.max + 0.002) {
      const d = sg < sp.salinitySG.min ? sp.salinitySG.min - sg : sg - sp.salinitySG.max;
      note('salinity', 0.4 + d * 150, `salinity out of range (SG ${sg.toFixed(3)})`);
      penalty += 30 + d * 800;
    }
  } else if (sp.environment === 'freshwater' && sg > 1.004) {
    note('salinity', 1 + (sg - 1.004) * 300, 'salty water in a freshwater tank');
    penalty += 40;
  }
  // pH
  const pH = num(w.pH, 7);
  if (pH < sp.pH.min || pH > sp.pH.max) {
    const d = pH < sp.pH.min ? sp.pH.min - pH : pH - sp.pH.max;
    // A small excursion (≤ PH_TOLERANCE past the species limit) is chronic stress, not a slow death sentence:
    // real fish ride out a pH a notch above their range. Beyond that, damage climbs quickly.
    if (d > PH_TOLERANCE) note('ph', 0.1 + (d - PH_TOLERANCE) * 1.5, `pH out of range (${pH.toFixed(1)})`);
    penalty += 15 + d * 20;
  }
  // Nitrogen compounds. lane:w2-sim — ammonia is weighted by how much of it is toxic free NH₃ at this pH and
  // temperature (the water report's weighting), so a cool, neutral axolotl tank isn't judged like a warm reef, and harm
  // starts at the report's WATCH line rather than while it still reads GOOD.
  const amm = num(w.ammonia, 0);
  const ammW = amm * ammoniaToxicityWeight(pH, temp);
  if (ammW > 0.25) {
    note('ammonia', (ammW - 0.25) * 2.4, `ammonia in the water (${amm.toFixed(2)} ppm)`);
    penalty += Math.min(50, amm * 30);
  } else if (amm > 0.05) penalty += amm * 25;
  // Salt softens nitrite. Keyed on the TANK's salt, as the water report weighs it (×0.25), so harm starts at the
  // report's WATCH line in brackish and marine tanks alike (round-3 R02-03).
  const no2 = num(w.nitrite, 0);
  const salt = isSaltClass(tank.waterClass) || tank.environment !== 'freshwater';
  const no2W = salt ? no2 * 0.25 : no2;
  if (no2W > 0.25) {
    note('nitrite', salt ? (no2 - 1) * 0.6 : (no2 - 0.25) * 2, `nitrite in the water (${no2.toFixed(2)} ppm)`);
    penalty += Math.min(40, no2W * 25);
  } else if (no2W > 0.05) penalty += no2W * 20;
  const no3 = num(w.nitrate, 0);
  const no3Limit = sp.environment === 'marine' && sp.category !== 'fish' ? 25 : 60;
  if (no3 > no3Limit) {
    note('nitrate', ((no3 - no3Limit) / 100) * 0.6, `high nitrate (${Math.round(no3)} ppm)`);
    penalty += Math.min(25, (no3 - no3Limit) * 0.3);
  }
  const o2 = num(w.oxygen, 1);
  if (o2 < 0.55) {
    note('oxygen', (0.55 - o2) * 14, 'low oxygen');
    penalty += (0.55 - o2) * 90;
  } else if (o2 < 0.75) penalty += (0.75 - o2) * 40;

  return { comfort: clamp(100 - penalty, 0, 100), harm: clamp(harm, 0, 12), cause, causeText, stressors: causeText ? [causeText] : [] };
}

/** Combine the water lane's comfort/harm with the fallback check (worst of both; never summed). */
export function speciesWaterView(sp: SpeciesDefinition, tank: Tank): SpeciesWaterView {
  const own = fallbackWater(sp, tank);
  let wl: { comfort: number; harm: number; stressors: string[] } = { comfort: 100, harm: 0, stressors: [] };
  try {
    const r = speciesWaterComfort(sp, tank);
    wl = { comfort: num(r?.comfort, 100), harm: clamp(num(r?.harm, 0), 0, 1), stressors: Array.isArray(r?.stressors) ? r.stressors : [] };
  } catch {
    /* water lane mid-edit: fallback only */
  }
  const wlHp = harmRateToHp(wl.harm);
  const harm = Math.max(own.harm, wlHp);
  // Prefer our own noun-phrase wording when the fallback sees a comparable problem; otherwise quote the water lane.
  const useOwn = own.harm > 0 && own.harm >= wlHp * 0.5;
  const sentence = useOwn || !(wlHp > 0) ? null : worstStressor(wl.stressors);
  return {
    comfort: clamp(Math.min(own.comfort, wl.comfort), 0, 100),
    harm,
    cause: useOwn ? own.cause : harm > 0 ? 'water' : own.cause,
    causeText: useOwn ? own.causeText : sentence ? shortLabel(sentence) : own.causeText,
    sentence,
    stressors: [...own.stressors, ...wl.stressors.filter((x) => !own.stressors.includes(x))],
  };
}

function safeHabitat(state: GameState, tank: Tank): TankHabitat {
  try {
    const h = tankHabitat(state, tank);
    return h ?? EMPTY_HABITAT;
  } catch {
    return EMPTY_HABITAT;
  }
}

/** Living creatures (alive + listed) in a tank, in stable id order. */
export function livingIn(state: GameState, tankId: string): Creature[] {
  const out = residentsOf(state, tankId); // lane:perf2 — per-step residents index (fresh array; sorting it is fine)
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

export function buildGroups(creatures: Creature[]): Map<string, GroupInfo> {
  const groups = new Map<string, GroupInfo>();
  for (const c of creatures) {
    let g = groups.get(c.speciesId);
    if (!g) {
      g = { n: 0, adultsMale: 0, adultsFemale: 0, juveniles: 0, ids: [] };
      groups.set(c.speciesId, g);
    }
    g.n++;
    g.ids.push(c.id);
    if (c.lifeStage === 'adult' || c.lifeStage === 'elder') {
      if (c.reproRole === 'male' || c.reproRole === 'transitioning_female') g.adultsMale++;
      else if (c.reproRole === 'female') g.adultsFemale++;
    } else g.juveniles++;
  }
  return groups;
}

export function buildTankEnv(state: GameState, tank: Tank, creatures: Creature[], hour: number): TankEnv {
  const water = new Map<string, SpeciesWaterView>();
  for (const c of creatures) {
    if (water.has(c.speciesId)) continue;
    const sp = findSpecies(c.speciesId);
    if (sp) water.set(c.speciesId, speciesWaterView(sp, tank));
  }
  return {
    tank,
    gallons: tankGallons(tank),
    habitat: safeHabitat(state, tank),
    water,
    groups: buildGroups(creatures),
    quarantine: tank.purpose === 'quarantine',
    targetFeedId: readTargetFeed(tank, hour),
  };
}

export interface HabitatFit {
  score: number; // 0..1
  notes: string[];
}

/** How well the decor/substrate/light suits this species (0..1) with reasons. */
export function habitatFit(env: TankEnv, sp: SpeciesDefinition, n: number): HabitatFit {
  const hab = env.habitat;
  const notes: string[] = [];
  let wsum = 0;
  let ssum = 0;
  const part = (w: number, s: number) => {
    wsum += w;
    ssum += w * clamp(s, 0, 1);
  };
  if (sp.hidesNeeded > 0) {
    const need = sp.hidesNeeded * Math.max(1, Math.sqrt(n));
    const s = hab.hides / need;
    part(1, s);
    if (s < 0.6) notes.push(`needs more hiding places (${Math.floor(hab.hides)} of ~${Math.ceil(need)})`);
  }
  const pref = sp.coverPreference;
  if (pref > 0.05) {
    let s = hab.cover >= pref ? 1 : 1 - ((pref - hab.cover) / pref) * 0.85;
    if (pref < 0.3 && hab.cover > pref + 0.55) s -= 0.2;
    part(0.5 + pref, s);
    if (s < 0.55) notes.push('wants more plant or decor cover');
  }
  if (sp.behaviorTraits.hitching > 0.5) {
    const need = Math.max(1, Math.ceil(n * 0.75));
    const s = hab.hitching / need;
    part(1.5, s);
    if (s < 0.7) notes.push('needs more hitching posts to hold onto');
  }
  const kind = env.tank.substrate?.kind;
  if (kind && sp.substrateRules.avoid.includes(kind)) {
    part(1, 0.2);
    notes.push(`the ${kind.replace('_', ' ')} substrate is unsuitable`);
  }
  if (hab.hazards.sharp && sp.hasLongFins) {
    part(0.5, 0.45);
    notes.push('sharp decor can tear long fins');
  }
  if (sp.behaviorSet === 'betta' || sp.behaviorSet === 'gourami') {
    const rest = (hab.leafRests ?? 0) > 0 || (hab.surfaceCover ?? 0) > 0.2;
    part(0.5, rest ? 1 : 0.6);
    if (!rest) notes.push('would love a broad leaf or floating plants to rest under near the surface');
  }
  const intensity = num(env.tank.lighting?.intensity, 1);
  if (sp.lightPreference === 'dim' && intensity > 1.0) {
    part(0.5, 0.55);
    notes.push('the light is brighter than it likes');
  } else if (sp.lightPreference === 'bright' && intensity < 0.5) {
    part(0.5, 0.7);
    notes.push('the light is dimmer than it likes');
  } else part(0.5, 1);
  return { score: wsum > 0 ? ssum / wsum : 1, notes };
}

/** Does this species risk swallowing the substrate (axolotl on gravel)? */
export function ingestionHazard(env: TankEnv, sp: SpeciesDefinition): boolean {
  const kind = env.tank.substrate?.kind;
  const avoidsSmallGrains = sp.substrateRules.avoid.some((k) => k === 'gravel' || k === 'fine_gravel');
  if (!avoidsSmallGrains) return false;
  if (sp.feedingStyle !== 'bottom' && sp.behaviorSet !== 'axolotl') return false;
  return kind === 'gravel' || kind === 'fine_gravel' || env.habitat.hazards.ingestible;
}

export interface StressFactor {
  key: string;
  label: string;
  amount: number;
}

const OUTCOME_STRESS = { ok: 0, tension: 10, fight: 24, lethal: 34 } as const;

export function conspecificTension(sp: SpeciesDefinition, g: GroupInfo | undefined, c: Creature, gallons: number): StressFactor | null {
  if (!g || g.n < 2) return null;
  const rule = sp.sameSpeciesRule;
  let amount = 0;
  let label = '';
  const adult = c.lifeStage === 'adult' || c.lifeStage === 'elder';
  const plural = sp.commonName.toLowerCase();
  if (adult) {
    const male = c.reproRole === 'male' || c.reproRole === 'transitioning_female';
    const female = c.reproRole === 'female';
    if (male && g.adultsMale >= 2 && OUTCOME_STRESS[rule.maleMale] > amount) {
      amount = OUTCOME_STRESS[rule.maleMale];
      label = `rival males (${plural})`;
    }
    if (female && g.adultsFemale >= 2 && OUTCOME_STRESS[rule.femaleFemale] > amount) {
      amount = OUTCOME_STRESS[rule.femaleFemale];
      label = `rival females (${plural})`;
    }
    if (female && g.adultsMale >= 1 && rule.mixed === 'harassment' && 15 > amount) {
      amount = 15;
      label = 'harassment from a male';
    }
  } else if (g.juveniles >= 2 && OUTCOME_STRESS[rule.juvenile] > 0) {
    const a = OUTCOME_STRESS[rule.juvenile] * 0.6;
    if (a > amount) {
      amount = a;
      label = 'squabbling siblings';
    }
  }
  const cap = sp.social.maxPer10Gallons;
  if (cap && g.n > Math.max(1, (cap * gallons) / 10)) {
    const a = Math.min(20, 6 * (g.n - (cap * gallons) / 10));
    if (a > amount) {
      amount = a;
      label = 'too many of its kind for the space';
    }
  }
  return amount > 0 ? { key: 'conspecific', label, amount } : null;
}

/** Explainable stress contributions (target stress ≈ sum, scaled by temperament). */
export function stressFactors(state: GameState, env: TankEnv, c: Creature, sp: SpeciesDefinition, hour: number): StressFactor[] {
  const out: StressFactor[] = [];
  const add = (key: string, label: string, amount: number) => {
    if (amount > 0.5) out.push({ key, label, amount });
  };
  const wv = env.water.get(sp.id);
  const worst = wv ? worstStressor(wv.stressors) : null;
  const comfortLabel = wv?.causeText ? `water: ${wv.causeText}` : worst ? `water: ${shortLabel(worst)}` : 'surroundings not quite right';
  add('comfort', comfortLabel, (100 - c.stats.comfort) * 0.55);
  const load = num(env.tank.cache?.stockingLoad, 0);
  if (load > 1) add('crowding', 'the tank is overstocked', Math.min(35, (load - 1) * 35));
  const need = gallonsNeededNow(sp, c.sizeCm);
  if (env.gallons < need) add('tank_size', `the tank is too small (needs ~${Math.ceil(need)} gal)`, (1 - env.gallons / need) * 45);
  const tap = num(env.tank.tapPressure, 0);
  if (tap > 0) add('tapping', 'glass tapping', tap * 2.5 * tapSensitivityMul(c.personality) * (1 + num(c.life?.tapSensitivity, 0) * 0.25));
  const g = env.groups.get(sp.id);
  const n = g?.n ?? 1;
  // A quarantine tank is a short stay away from the group on purpose: being alone there weighs far less, so a sick
  // schooling fish can actually recover where the illness advice sends it.
  const qMul = env.quarantine ? 0.25 : 1;
  if (sp.social.minGroup > 1 && n < sp.social.minGroup) add('lonely', env.quarantine ? 'away from its group while recovering' : `lonely — likes groups of ${sp.social.minGroup}+`, (1 - n / sp.social.minGroup) * 40 * qMul);
  const t = conspecificTension(sp, g, c, env.gallons);
  if (t) add(t.key, t.label, t.amount);
  if (c.stats.hunger > 65) add('hunger', 'hunger', (c.stats.hunger - 65) * 0.35);
  if (c.illness) add('illness', illnessDef(c.illness.kind)?.name(sp) ?? 'illness', (c.illness.severity / 100) * (illnessDef(c.illness.kind)?.stress ?? 10) + 4);
  const injury = num(c.life?.injury, 0);
  if (injury > 0) add('injury', 'healing injuries', injury * 0.2);
  const since = hour - Math.max(c.acquiredHour, c.life?.settledSinceHour ?? -Infinity);
  if (since >= 0 && since < 24) add('new_home', 'settling into a new home', 12 * (1 - since / 24));
  const lit = lightsOn(env.tank.lighting.onHour, env.tank.lighting.offHour, hour);
  if (lit && sp.behaviorTraits.nocturnal >= 0.5 && env.habitat.hides < Math.max(1, sp.hidesNeeded)) add('daylight', 'no dark place to rest by day', 6);
  if (c.stats.social < 55) add('social', 'social needs unmet', ((55 - c.stats.social) / 55) * 10 * qMul);
  const shock = env.tank.water.shock;
  if (shock && hour < shock.untilHour && hour >= shock.hour - 1e-6) add('shock', shock.reason || 'a sudden change in the water', clamp(shock.severity, 0, 1) * 30);
  return out.sort((a, b) => b.amount - a.amount);
}

export function stressTarget(factors: StressFactor[], c: Creature): number {
  const temperament = num(c.genome?.potentials?.temperament, 50) / 100;
  let s = 0;
  for (const f of factors) s += f.amount;
  s -= (num(c.stats.enrichment, 50) - 50) * 0.1;
  s *= 1.15 - 0.3 * temperament;
  return clamp(s, 0, 100);
}

/** 0..100 social comfort target. */
export function socialTarget(sp: SpeciesDefinition, n: number): number {
  const kind = sp.social.kind;
  if (sp.social.minGroup > 1 && n < sp.social.minGroup) return clamp(100 * (n / sp.social.minGroup) * 0.6, 5, 60);
  if ((kind === 'pair' || kind === 'pair_hierarchy') && n === 1) return 70;
  if (kind === 'solitary' && n > 1) return clamp(60 - 10 * (n - 2), 20, 60);
  return clamp(85 + 15 * Math.min(1, n / Math.max(1, sp.social.idealGroup)), 0, 100);
}

/** Age helper re-exported for the UI. */
export function creatureAgeDays(state: GameState, c: Creature): number {
  return ageDaysOf(c, state.clock.hour);
}

export function speciesOf(c: Creature): SpeciesDefinition {
  return getSpecies(c.speciesId);
}
