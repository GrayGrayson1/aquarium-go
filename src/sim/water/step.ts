/**
 * Water chemistry & life-support stepper. OWNER: lane "waterlab".
 *
 * Per call: equipment wear/failures → N substeps (≤ 0.25 h) of
 *   temperature (room drift, heaters/chillers/fans/lights) → food rot & detritus → nitrification (AOB/NOB with lag)
 *   → nitrate export (plants, refugium, skimmer, live rock) → bacteria growth → O₂ / CO₂ / pH / KH → algae, clarity,
 *   pods → evaporation, ATO and salinity → then the autofeeder (last, so the food it drops is fresh when the creature
 *   step that follows this one lets the animals eat; lane:fix-water).
 * Internally chemistry is tracked as MASS (mg) and converted back to ppm with the current litres, so evaporation
 * concentrates everything and big tanks change slowly. Robust to any dt (tested up to 6 h chunks); clamps all values.
 */
import type { GameState, Tank, WaterState, WaterLabState, SpeciesDefinition } from '@/types';
import type { SimContext } from '../context';
import { getFoodDef, FOODS } from '@/data/catalog/foods';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { lightsOn } from '../time';
import {
  clamp,
  clamp01,
  finite,
  smoothstep,
  oxygenSaturation,
  oxygenRef,
  q10,
  equilibriumPH,
  ammoniaToxicityWeight,
  nitrifierTempFactor,
  BIO_ACCLIMATION_H,
} from './chem';
import {
  WASTE_TAN_MG_PER_UNIT,
  N_TO_NO2,
  NO2_TO_NO3,
  KH_PER_PPM_N,
  MAX_WATER_SUBSTEP_H,
  CLASS_DEFAULTS,
  WEAR_PER_DAY,
  DETOX_FREE_FRACTION,
  TEMP_TOLERANCE_C,
  isMarineClass,
} from './constants';
import { computeTankEnv, roomTempAt, type TankEnv, type EqEntry } from './env';
import { ensureLab, scaleFood, addFood, recommendedServings } from './food';

/** Repair NaN / out-of-range values (old saves, other lanes' writes). */
export function sanitizeWater(tank: Tank): void {
  const w = tank.water as WaterState;
  const d = CLASS_DEFAULTS[tank.waterClass] ?? CLASS_DEFAULTS.freshwater_tropical;
  w.tempC = clamp(finite(w.tempC, d.startTempC), 0, 40);
  w.pH = clamp(finite(w.pH, d.source.pH), 4, 10);
  w.ammonia = clamp(finite(w.ammonia, 0), 0, 50);
  w.nitrite = clamp(finite(w.nitrite, 0), 0, 50);
  w.nitrate = clamp(finite(w.nitrate, 0), 0, 500);
  w.oxygen = clamp(finite(w.oxygen, 0.9), 0, 1);
  w.salinitySG = clamp(finite(w.salinitySG, d.source.sg), 1, 1.04);
  w.gh = clamp(finite(w.gh, d.source.gh), 0, 40);
  w.kh = clamp(finite(w.kh, d.source.kh), 0, 25);
  w.detritus = clamp(finite(w.detritus, 0), 0, 100);
  w.algae = clamp(finite(w.algae, 0), 0, 100);
  w.clarity = clamp(finite(w.clarity, 1), 0, 1);
  w.bioMaturity = clamp(finite(w.bioMaturity, 0), 0, 1);
  w.foodInWater = clamp(finite(w.foodInWater, 0), 0, 1e5);
  w.level = clamp(finite(w.level, 1), 0.6, 1);
  const lab = ensureLab(tank);
  lab.colony = clamp(finite(lab.colony, w.bioMaturity > 0.5 ? 0.6 : 0.3), 0.25, 1);
  lab.foodAgeH = clamp(finite(lab.foodAgeH, 0), 0, 1000);
  lab.foodWaste = clamp(finite(lab.foodWaste, 0.1), 0, 1);
  lab.wasteRate = clamp(finite(lab.wasteRate, 0), 0, 1e4);
  lab.pendingWaste = clamp(finite(lab.pendingWaste, 0), 0, 1e6);
  lab.swing = clamp01(finite(lab.swing, 0));
  lab.fertilizer = clamp01(finite(lab.fertilizer, 0));
  lab.reefElements = clamp01(finite(lab.reefElements, isMarineClass(tank.waterClass) ? 0.8 : 0));
  lab.pods = clamp01(finite(lab.pods, 0.02));
  lab.co2 = clamp(finite(lab.co2, 3), 0, 80);
  if (lab.boundAmmonia !== undefined) lab.boundAmmonia = clamp(finite(lab.boundAmmonia, 0), 0, 50); // lane:fix-water
  if (lab.boundNitrite !== undefined) lab.boundNitrite = clamp(finite(lab.boundNitrite, 0), 0, 50);
  if (lab.bioTempC !== undefined) lab.bioTempC = clamp(finite(lab.bioTempC, w.tempC), 0, 40); // lane:w2-sim
}

const warnKey = (lab: WaterLabState, key: string, hour: number, every: number): boolean => {
  if (!lab.warned) lab.warned = {};
  const last = lab.warned[key];
  if (last !== undefined && hour - last < every) return false;
  lab.warned[key] = hour;
  return true;
};

// ───────────────────────────── Equipment wear & failure ─────────────────────────────

function describeFailure(e: EqEntry, tank: Tank, stuck: boolean): { text: string; kind: 'warning' | 'danger' } {
  const where = `in ${tank.name}`;
  switch (e.def.kind) {
    case 'heater':
      return stuck
        ? { kind: 'danger', text: `The ${e.def.name} ${where} has stuck ON and is overheating the water! Switch it off or remove it right away.` }
        : { kind: 'danger', text: `The ${e.def.name} ${where} has failed. The water will drift toward room temperature (about 22 °C) — repair or replace it.` };
    case 'chiller':
      return { kind: 'danger', text: `The chiller ${where} has failed. The water will warm toward room temperature (about 22 °C) — cool-water animals are at risk.` };
    case 'filter':
      return { kind: 'danger', text: `The ${e.def.name} ${where} has stopped. Without flow its bacteria start to starve and ammonia will creep up — repair or replace it.` };
    case 'light':
      return { kind: 'warning', text: `The ${e.def.name} over ${tank.name} has burned out. Plants and corals need light.` };
    case 'ato':
      return { kind: 'warning', text: `The auto top-off ${where} has failed. Top off by hand — evaporation will push salinity up.` };
    case 'airstone':
      return { kind: 'warning', text: `The air pump ${where} has failed — less oxygen, especially in warm water.` };
    case 'powerhead':
    case 'wavemaker':
      return { kind: 'warning', text: `A circulation pump ${where} has stopped — flow is lower and detritus will settle.` };
    case 'autofeeder':
      return { kind: 'warning', text: `The autofeeder ${where} has jammed. Feed by hand until it is repaired.` };
    default:
      return { kind: 'warning', text: `The ${e.def.name} ${where} has failed. Repair or replace it.` };
  }
}

function stepEquipmentWear(state: GameState, tank: Tank, dt: number, ctx: SimContext): void {
  for (const inst of tank.equipment ?? []) {
    if (!inst.on || inst.failed) continue;
    const def = getEquipmentDef(inst.defId);
    if (!def) continue;
    const wear = WEAR_PER_DAY[def.kind] ?? 0.003;
    inst.condition = clamp(finite(inst.condition, 1) - (wear * dt) / 24, 0, 1);
    const base = def.stats.failureRate ?? 0;
    if (base <= 0) continue;
    const pDay = clamp(base * (1 + 6 * Math.pow(1 - inst.condition, 2)), 0, 0.5);
    const p = 1 - Math.pow(1 - pDay, dt / 24);
    if (!ctx.rng.chance(p)) continue;
    inst.failed = true;
    const stuck = def.kind === 'heater' && ctx.rng.chance(0.15);
    inst.failMode = stuck ? 'stuck_on' : 'off';
    const msg = describeFailure({ inst, def }, tank, stuck);
    if (!state.isShowcase) ctx.emit({ kind: msg.kind, text: msg.text, tankId: tank.id, toast: true });
  }
}

// ───────────────────────────── Autofeeder ─────────────────────────────

const DRY_FOODS = new Set(['flake_tropical', 'micro_pellets', 'sinking_pellets', 'axolotl_pellets', 'algae_wafers', 'marine_pellets', 'goldfish_pellets', 'nori_sheet']);

function pickAutofeedFood(state: GameState, tank: Tank, eaters: SpeciesDefinition[]): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const f of FOODS) {
    if (!DRY_FOODS.has(f.id)) continue;
    if ((state.inventory.foods[f.id] ?? 0) < 1) continue;
    let score = 0;
    for (const sp of eaters) if (f.tags.some((t) => sp.foods.includes(t))) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = f.id;
    }
  }
  return best;
}

function runAutofeeder(state: GameState, tank: Tank, env: TankEnv, dt: number, ctx: SimContext): void {
  const af = env.summary.autofeeder;
  if (!af || env.inhabitants.length === 0) return;
  const perDay = clamp(Math.round(finite(af.inst.setting, af.def.stats.defaultSetting ?? 2)), 0, 4);
  if (perDay <= 0) return;
  const lab = ensureLab(tank);
  const on = tank.lighting?.onHour ?? 8;
  const off = tank.lighting?.offHour ?? 22;
  const span = ((off - on + 24) % 24) || 12;
  const times: number[] = [];
  for (let i = 0; i < perDay; i++) times.push((on + 1 + (i * Math.max(1, span - 2)) / Math.max(1, perDay - 1 || 1)) % 24);
  const start = ctx.hour;
  const end = ctx.hour + dt;
  for (let day = Math.floor(start / 24); day <= Math.floor(end / 24); day++) {
    for (const t of times) {
      const at = day * 24 + t;
      if (at < start || at >= end) continue;
      if (lab.lastAutofeedHour !== undefined && at - lab.lastAutofeedHour < 0.5) continue;
      const foodId = pickAutofeedFood(state, tank, env.inhabitants.map((i) => i.species));
      if (!foodId) {
        if (warnKey(lab, 'autofeeder_empty', at, 24) && !state.isShowcase)
          ctx.emit({ kind: 'warning', text: `The autofeeder on ${tank.name} is empty — it needs a dry food your animals eat (flakes or pellets).`, tankId: tank.id });
        continue;
      }
      const food = getFoodDef(foodId)!;
      // lane:fix-water — the same portion a manual Feed gives (portionForDemand caps it by pack size), not a flat 3:
      // three servings fed four small fish and starved a school of neons on the default 2×/day schedule.
      const servings = Math.min(recommendedServings(state, tank, food), state.inventory.foods[foodId] ?? 0);
      if (servings <= 0) continue;
      state.inventory.foods[foodId] = (state.inventory.foods[foodId] ?? 0) - servings;
      addFood(tank, food, servings, at);
      lab.lastAutofeedHour = at;
    }
  }
}

// ───────────────────────────── Substep ─────────────────────────────

interface StepInputs {
  animalTanPerH: number;
  hour: number;
  index: number;
  lightOn: boolean;
  lightIntensity: number;
}

function substep(tank: Tank, env: TankEnv, h: number, inp: StepInputs): { tanIn: number } {
  const w = tank.water;
  const lab = ensureLab(tank);
  const s = env.summary;
  const marine = env.salt;
  // lane:brackish — brackish water sits between fresh and sea water: its carbonate chemistry, dissolved CO₂ and
  // organic load are blended by how salty it is (fraction of full-strength sea water, SG 1.025).
  const brackish = tank.waterClass === 'brackish';
  const saltFrac = brackish ? clamp((w.salinitySG - 1) / 0.025, 0, 1) : marine ? 1 : 0;
  const litresBefore = env.litresFull * w.level;
  let L = litresBefore;

  // ── 1. Temperature ──
  const lightHeat = inp.lightOn ? 0.5 * Math.min(1.2, s.par) * inp.lightIntensity : 0;
  const ambient = roomTempAt(inp.hour) - s.fanCool + lightHeat;
  const tau = env.tau * (s.fans > 0 ? 0.8 : 1);
  let T = ambient + (w.tempC - ambient) * Math.exp(-h / tau);
  const perW = (h * 0.86) / Math.max(1, L); // °C per watt over this substep
  for (const e of s.stuckHeaters) T += (e.def.stats.power ?? 0) * perW;
  const heat = () => {
    for (const e of s.heaters) {
      const set = finite(e.inst.setting, e.def.stats.defaultSetting ?? 25.5);
      if (T < set) T += Math.min((e.def.stats.power ?? 0) * perW, set - T);
    }
  };
  const chill = () => {
    for (const e of s.chillers) {
      const set = finite(e.inst.setting, e.def.stats.defaultSetting ?? 18);
      if (T > set) T -= Math.min((e.def.stats.power ?? 0) * perW, T - set);
    }
  };
  // Fighting thermostats: the order flips every substep, so the temperature see-saws between the two setpoints.
  if (s.conflict && inp.index % 2 === 1) {
    chill();
    heat();
  } else {
    heat();
    chill();
  }
  w.tempC = clamp(T, 0, 40);
  T = w.tempC;
  const fT = clamp(q10(T), 0.25, 1.6);

  // ── masses (mg) ──
  // lane:fix-water — conditioner-bound ammonia/nitrite (lab.boundAmmonia/boundNitrite, ppm) is still there for the
  // filter bacteria; it is split from the free (toxic, reported) part again at the end of the substep.
  let tan = (w.ammonia + (lab.boundAmmonia ?? 0)) * L;
  let no2 = (w.nitrite + (lab.boundNitrite ?? 0)) * L;
  let no3 = w.nitrate * L;
  let tanIn = 0;

  // ── 2. Food rot ──
  const age = (lab.foodAgeH ?? 0) + h;
  lab.foodAgeH = age;
  let foodTan = 0;
  if (w.foodInWater > 0) {
    const k = age < 0.75 ? 0 : 0.35 * clamp(q10(T, 25, 1.9), 0.4, 1.6);
    if (k > 0) {
      const before = w.foodInWater;
      scaleFood(tank, Math.exp(-k * h));
      const decayed = Math.max(0, before - w.foodInWater);
      foodTan = decayed * (lab.foodWaste ?? 0.1);
    }
  }
  // Skimmers pull out some dissolved organics before they break down.
  foodTan *= 1 - 0.35 * s.skimmerExport;
  tan += foodTan;
  tanIn += foodTan;

  // ── 3. Animal waste & detritus mineralisation ──
  const animalTan = inp.animalTanPerH * h;
  tan += animalTan;
  tanIn += animalTan;
  const mineral = w.detritus * 0.003 * fT * h;
  const mineralTan = (mineral * L) / 14;
  tan += mineralTan;
  tanIn += mineralTan;
  const solids = (animalTan * 6 + foodTan * 5) / Math.max(1, L);
  const turnoverFrac = clamp(s.filterGph / Math.max(1, env.gallons * 4), 0, 1.5);
  const mechOut = w.detritus * (s.mech * turnoverFrac * 0.006 + s.skimmerExport * 0.004) * h;
  w.detritus = clamp(w.detritus + solids - mineral - mechOut, 0, 100);

  // ── 4. Nitrification ──
  const m = w.bioMaturity;
  const colony = clamp(lab.colony ?? 0.5, 0.25, 1);
  const capUnits = s.bioCapUnits + env.surfaceBioUnits;
  const capMg = capUnits * WASTE_TAN_MG_PER_UNIT;
  const aob = smoothstep(m * 1.5);
  const nob = smoothstep((m - 0.18) * 1.6);
  const fPH = clamp((w.pH - 5.8) / 1.0, 0.1, 1);
  const fO2 = clamp(w.oxygen / 0.45, 0.15, 1);
  // lane:w2-sim — the colony acclimates to the tank's temperature over ~2 days (cool-water filters still work).
  const accT = finite(lab.bioTempC, T);
  lab.bioTempC = accT + (T - accT) * (1 - Math.exp(-h / BIO_ACCLIMATION_H));
  const fBioT = nitrifierTempFactor(T, accT);
  const env1 = colony * fBioT * fPH * fO2;
  const C1 = tan / L;
  const vmax1 = capMg * aob * env1;
  const ox1 = tan * (1 - Math.exp(-(vmax1 / (0.08 + C1) / L) * h));
  tan -= ox1;
  no2 += ox1 * N_TO_NO2;
  const C2 = no2 / L;
  // Once established, nitrite oxidisers out-pace the ammonia oxidisers, so a mature filter holds nitrite below
  // ammonia; nitrite spikes belong to cycling (nob lags aob above). lane:w2-sim: 1.1 → 1.5.
  const vmax2 = capMg * N_TO_NO2 * nob * env1 * 1.5;
  const ox2 = no2 * (1 - Math.exp(-(vmax2 / (0.12 + C2) / L) * h));
  no2 -= ox2;
  no3 += ox2 * NO2_TO_NO3;
  // Plant nitrate uptake and plant oxygen are applied by the aquascape lane's stepTankDecor (growth-aware), so they
  // are NOT applied here. Plants still matter below for CO₂ uptake (pH) and algae competition.
  // tankHabitat() values are already normalised "per 10 gallons".
  const plantPpmH = Math.max(0, env.habitat.nitrateUptake ?? 0);
  const fert = lab.fertilizer ?? 0;
  const plantBoost = (1 + fert * 0.6) * (1 + s.co2 * 0.5);
  // KH & oxygen used by nitrification
  w.kh = Math.max(0, w.kh - (ox1 / L) * KH_PER_PPM_N);
  const nitrO2 = (3.43 * ox1 + 1.14 * (ox2 / N_TO_NO2)) / L;

  // ── 5. Nitrate export (non-plant) ──
  const refExp = s.refugiumExport * 0.01 * (inp.lightOn ? 1 : 0.6);
  const skimExp = s.skimmerExport * 0.002;
  const rockExp = tank.waterClass === 'marine_live_rock' || tank.waterClass === 'reef' ? 0.0015 * m : 0;
  const dsbExp = tank.substrate?.depthCm >= 8 && (tank.substrate.kind === 'sand' || tank.substrate.kind === 'fine_sand' || tank.substrate.kind === 'aragonite') ? 0.001 : 0;
  const algaeExp = (w.algae / 100) * 0.004 * (inp.lightOn ? 1 : 0.3);
  no3 *= Math.exp(-(refExp + skimExp + rockExp + dsbExp + algaeExp) * h);

  // ── 6. Biofilter growth & colony adaptation ──
  const filterRunning = s.activeFilters.length > 0;
  const wasteRate = lab.wasteRate ?? 0;
  const supply = clamp(C1 / (C1 + 0.08) + wasteRate / (capMg * 0.1 + 0.02) + (C2 / (C2 + 0.2)) * 0.3, 0, 1);
  if (supply > 0.02 && (filterRunning || env.surfaceBioUnits > 0)) {
    const r = 0.045 * (filterRunning ? 1 : 0.35) * Math.min(1.2, fBioT) * fO2 * fPH;
    const grow = r * supply * Math.max(m, 0.03) * (1 - m) * h;
    w.bioMaturity = clamp(m + grow, 0, 1);
  } else {
    w.bioMaturity = clamp(m * Math.exp(-0.003 * h), 0, 1);
  }
  if (!filterRunning && s.filters.length > 0) w.bioMaturity = clamp(w.bioMaturity * Math.exp(-0.006 * h), 0, 1);
  // A cool colony needs more biomass for the same load (lane:w2-sim: temperature-aware target).
  const capNow = Math.max(1e-6, capMg * aob * fBioT);
  const target = clamp(0.3 + 2.5 * (wasteRate / capNow) + (C1 > 0.2 ? 0.3 : 0), 0.3, 1);
  const rate = target > colony ? 0.06 : 0.01;
  lab.colony = clamp(colony + (target - colony) * (1 - Math.exp(-rate * h)), 0.25, 1);

  // ── 7. Oxygen & CO₂ ──
  const sg = w.salinitySG;
  const sat = oxygenSaturation(T, sg);
  const ref = oxygenRef(sg);
  let DO = w.oxygen * ref;
  const resp = ((env.bioloadUnits * 2.0 * clamp(q10(T, 25, 2.2), 0.3, 1.8)) / Math.max(1, L)) * h;
  const decayO2 = ((foodTan + mineralTan) * 8) / Math.max(1, L);
  const plantO2 = Math.max(0, env.habitat.oxygen ?? 0);
  const algaeO2 = (w.algae / 100) * 0.25 * Math.min(1, s.par);
  // plant O₂ is added by the aquascape step; only algae photosynthesis (and night respiration of both) here
  const photo = inp.lightOn ? algaeO2 * inp.lightIntensity * h : -(plantO2 * 0.5 + algaeO2) * 0.25 * h;
  const kla = env.kla;
  DO = (DO + kla * sat * h + photo - resp - nitrO2 - decayO2) / (1 + kla * h);
  DO = clamp(DO, 0, sat * 1.12);
  w.oxygen = clamp(DO / ref, 0, 1);

  const co2Air = brackish ? 0.6 - 0.15 * saltFrac : marine ? 0.45 : 0.6;
  const co2Prod = (resp + decayO2 + nitrO2 * 0.2) * 1.375;
  const inj = s.co2 > 0 && inp.lightOn ? s.co2 * 12 * h : 0;
  const uptake = inp.lightOn ? (plantO2 * plantBoost + algaeO2) * 1.375 * inp.lightIntensity * h : 0;
  let co2 = finite(lab.co2, co2Air);
  const klaCo2 = kla * 0.9;
  co2 = (co2 + klaCo2 * co2Air * h + co2Prod + inj - uptake) / (1 + klaCo2 * h);
  lab.co2 = clamp(co2, 0.1, 80);

  // ── 8. KH, pH ──
  const soil = tank.substrate?.kind === 'planted_soil';
  const aragonite = tank.substrate?.kind === 'aragonite';
  if (soil) w.kh += (3 - w.kh) * (1 - Math.exp(-0.004 * h)) * (w.kh > 3 ? 1 : 0);
  if (aragonite && w.kh < (marine ? 7.5 : 9)) w.kh += 0.0015 * h;
  if (marine && env.corals > 0) {
    const c = env.habitat.corals;
    const demand = (c.sps ?? 0) * 1 + (c.lps ?? 0) * 0.7 + (c.soft ?? 0) * 0.2 + (c.zoanthid ?? 0) * 0.2 + (c.gsp ?? 0) * 0.15 + (c.mushroom ?? 0) * 0.1;
    const use = demand * 0.002 * (100 / Math.max(20, env.litresFull)) * (0.4 + 0.6 * (lab.reefElements ?? 0.8)) * h;
    w.kh = Math.max(0, w.kh - use);
    lab.reefElements = clamp01((lab.reefElements ?? 0.8) - use * 0.05);
  }
  w.kh = clamp(w.kh, 0, 25);
  const organicCo2 = brackish ? 3.0 - 2.8 * saltFrac : marine ? 0.2 : soil ? 4.5 : 3.0;
  let pHeq = (brackish ? equilibriumPH(w.kh, lab.co2 + organicCo2, false, saltFrac) : equilibriumPH(w.kh, lab.co2 + organicCo2, marine)) - 0.0015 * w.detritus - (soil ? 0.15 : 0);
  if (w.kh < 0.6) pHeq = Math.min(pHeq, 6.2 + w.kh); // buffer exhausted: acids win
  w.pH = clamp(w.pH + (pHeq - w.pH) * (1 - Math.exp(-h / 1.2)), 4.5, 9.6);

  // ── 9. Algae, clarity, pods, consumables ──
  const par = inp.lightOn ? Math.min(1.5, s.par) * inp.lightIntensity : 0;
  const C3b = no3 / L;
  const nutrient = clamp((C3b / (C3b + 12)) * 0.8 + Math.min(0.3, w.detritus / 150) + fert * 0.3, 0, 1.2);
  // plants compete for nutrients (the aquascape step also removes some algae directly)
  const comp = Math.min(0.5, plantPpmH * 1.5 * plantBoost);
  if (par > 0) {
    const r = 0.045 * par * nutrient * (1 - comp) * (1 - 0.4 * s.uvExport) * clamp(q10(T, 25, 1.6), 0.5, 1.4);
    w.algae = clamp(w.algae + r * (1.5 + w.algae) * (1 - w.algae / 100) * h, 0, 100);
  }
  if (nutrient < 0.08) w.algae = clamp(w.algae * Math.exp(-0.004 * h), 0, 100);

  const C1b = tan / L;
  const bloom = w.bioMaturity < 0.45 && C1b > 0.15 ? (0.45 - w.bioMaturity) * 0.8 * Math.min(1, C1b) : 0;
  const green = w.algae > 50 ? ((w.algae - 50) / 100) * 0.5 * (1 - s.uvExport) : 0;
  const foodCloud = Math.min(0.3, (w.foodInWater / Math.max(1, L)) * 0.4);
  const clarityTarget = clamp(1 - w.detritus * 0.0035 - bloom * (1 - 0.7 * s.uvExport) - green - foodCloud, 0.05, 1);
  const cRate = clarityTarget > w.clarity ? 0.25 + s.mech * 0.5 + s.uvExport * 0.5 : 0.4;
  w.clarity = clamp(w.clarity + (clarityTarget - w.clarity) * (1 - Math.exp(-cRate * h)), 0, 1);

  const podCap = clamp(
    (tank.waterClass === 'marine_live_rock' || tank.waterClass === 'reef' ? 0.45 + 0.4 * w.bioMaturity : tank.waterClass === 'freshwater_planted' ? 0.35 : 0.1) +
      s.refugiumExport * 0.8,
    0.05,
    1,
  );
  const pods = lab.pods ?? 0;
  lab.pods = clamp01(pods + (0.015 * Math.max(pods, 0.01) * (1 - pods / podCap)) * h);

  lab.fertilizer = clamp01(fert * Math.exp(-h / 40));

  // ── 10. Evaporation, ATO, salinity ──
  const evap =
    0.00035 *
    clamp(1 + 0.05 * (T - 22), 0.4, 2) *
    Math.pow(12 / Math.max(8, env.heightIn), 0.7) *
    (s.lid ? 0.33 : 1) *
    (1 + s.fans * 1.5) *
    (1 + 0.3 * Math.min(2, s.agitation));
  let level = w.level - evap * h;
  if (s.ato && level < 0.995) level = 0.995;
  level = clamp(level, 0.6, 1);
  const litresAfter = env.litresFull * level;
  // Salt does not evaporate: SG-1 scales inversely with volume.
  if (w.salinitySG > 1.0005) w.salinitySG = clamp(1 + ((w.salinitySG - 1) * litresBefore) / litresAfter, 1, 1.04);
  w.level = level;
  L = litresAfter;

  // The dose is active until stepTankWaterImpl expires it (releaseDetox, the one place the bound share is put back).
  const free = lab.detoxUntilHour !== undefined ? DETOX_FREE_FRACTION : 1;
  w.ammonia = clamp((tan / L) * free, 0, 50);
  w.nitrite = clamp((no2 / L) * free, 0, 50);
  if (free < 1) {
    lab.boundAmmonia = clamp((tan / L) * (1 - free), 0, 50);
    lab.boundNitrite = clamp((no2 / L) * (1 - free), 0, 50);
  } else {
    delete lab.boundAmmonia;
    delete lab.boundNitrite;
  }
  w.nitrate = clamp(no3 / L, 0, 500);
  return { tanIn };
}

// ───────────────────────────── Public step ─────────────────────────────

export function stepTankWaterImpl(state: GameState, tank: Tank, dt: number, ctx: SimContext): void {
  if (!(dt > 0) || !tank?.water) return;
  sanitizeWater(tank);
  const w = tank.water;
  const lab = ensureLab(tank);
  stepEquipmentWear(state, tank, dt, ctx);
  const env = computeTankEnv(state, tank);

  const pending = lab.pendingWaste ?? 0;
  lab.pendingWaste = 0;
  const animalTanPerH = (pending * WASTE_TAN_MG_PER_UNIT) / dt;

  const prevT = w.tempC;
  const prevPH = w.pH;
  const prevSG = w.salinitySG;
  const n = Math.max(1, Math.ceil(dt / MAX_WATER_SUBSTEP_H - 1e-9));
  const h = dt / n;
  let tanIn = 0;
  const intensity = clamp(tank.lighting?.intensity ?? 1, 0, 1.5);
  for (let i = 0; i < n; i++) {
    const hour = ctx.hour + i * h + h / 2;
    const on = env.summary.lights.length > 0 && lightsOn(tank.lighting?.onHour ?? 8, tank.lighting?.offHour ?? 22, hour);
    tanIn += substep(tank, env, h, { animalTanPerH, hour, index: i, lightOn: on, lightIntensity: intensity }).tanIn;
  }

  // Smoothed waste input (mg/h) drives colony adaptation and the "filter overloaded" report.
  const instRate = tanIn / dt;
  lab.wasteRate = (lab.wasteRate ?? 0) + (instRate - (lab.wasteRate ?? 0)) * (1 - Math.exp(-dt / 6));

  // Target-fed portions are released to everyone after about an hour.
  if (w.targetFeed && ctx.hour + dt - w.targetFeed.hour > 1) delete w.targetFeed;
  if (w.shock && ctx.hour + dt > w.shock.untilHour + 24) delete w.shock;
  // lane:fix-water — the conditioner wears off: what it held bound is toxic (and on the test kit) again. Expire the
  // dose right away (it used to linger 48 h, discounting the comfort model long after the water was dangerous).
  if (lab.detoxUntilHour !== undefined && ctx.hour + dt >= lab.detoxUntilHour) releaseDetox(state, tank, env, ctx.hour + dt, ctx);

  // The autofeeder drops its portion LAST so it is fresh when the creature step (next in the piece) lets the animals
  // eat; dropped first it aged — and in 1 h / 4 h background pieces mostly rotted — before anyone took a bite.
  runAutofeeder(state, tank, env, dt, ctx);

  // Instability (EMA over ~12 h).
  const rT = Math.abs(w.tempC - prevT) / dt;
  const rPH = Math.abs(w.pH - prevPH) / dt;
  const rSG = Math.abs(w.salinitySG - prevSG) / dt;
  const tox = w.ammonia * ammoniaToxicityWeight(w.pH, w.tempC) + w.nitrite * (env.salt ? 0.25 : 1);
  let v = clamp(rT / 0.6 + rPH / 0.08 + rSG / 0.0004 + Math.min(0.5, tox * 0.6), 0, 1);
  if (env.summary.conflict) v = Math.max(v, 0.65);
  lab.swing = clamp01((lab.swing ?? 0) + (v - (lab.swing ?? 0)) * (1 - Math.exp(-dt / 12)));
  lab.conflict = env.summary.conflict;
  lab.prevTemp = w.tempC;
  lab.prevPH = w.pH;
  lab.prevSG = w.salinitySG;
  tank.cache.stockingLoad = env.stockingLoad;

  emitWaterWarnings(state, tank, env, ctx, dt);
}

/** Conditioner has worn off: put the bound ammonia/nitrite back and, if it matters, say so once. */
function releaseDetox(state: GameState, tank: Tank, env: TankEnv, hour: number, ctx: SimContext): void {
  const w = tank.water;
  const lab = ensureLab(tank);
  const nh = lab.boundAmmonia ?? 0;
  const no2 = lab.boundNitrite ?? 0;
  w.ammonia = clamp(w.ammonia + nh, 0, 50);
  w.nitrite = clamp(w.nitrite + no2, 0, 50);
  delete lab.boundAmmonia;
  delete lab.boundNitrite;
  delete lab.detoxUntilHour;
  if (state.isShowcase || env.inhabitants.length === 0) return;
  const weighted = w.ammonia * ammoniaToxicityWeight(w.pH, w.tempC) + w.nitrite * (env.salt ? 0.25 : 1);
  if (weighted < 0.25 || nh + no2 < 0.05) return;
  const parts: string[] = [];
  if (nh >= 0.02) parts.push(`ammonia is back to ${w.ammonia.toFixed(2)} ppm`);
  if (no2 >= 0.02) parts.push(`nitrite is back to ${w.nitrite.toFixed(2)} ppm`);
  // This notice carries the advice, so the spike toasts for this water hold off for their usual day.
  warnKey(lab, 'ammonia', hour, 24);
  warnKey(lab, 'nitrite', hour, 24);
  ctx.emit({
    kind: weighted >= 0.5 ? 'danger' : 'warning',
    text: `The conditioner in ${tank.name} has worn off — ${parts.join(' and ')}. Change 30–50% of the water, or dose again to buy another day.`,
    tankId: tank.id,
    toast: true,
  });
}

function emitWaterWarnings(state: GameState, tank: Tank, env: TankEnv, ctx: SimContext, dt: number): void {
  if (state.isShowcase) return;
  const w = tank.water;
  const lab = ensureLab(tank);
  const hour = ctx.hour + dt;
  const s = env.summary;
  if (s.conflict && warnKey(lab, 'conflict', hour, 12)) {
    ctx.emit({
      kind: 'warning',
      text: `The heater (${(s.heaterSet ?? 0).toFixed(1)} °C) and chiller (${(s.chillerSet ?? 0).toFixed(1)} °C) in ${tank.name} are fighting each other — wasting power and making the temperature swing. Set the heater at least 1 °C below the chiller.`,
      tankId: tank.id,
      toast: true,
    });
  }
  if (env.inhabitants.length === 0) return;
  const weighted = w.ammonia * ammoniaToxicityWeight(w.pH, w.tempC); // free ammonia only: conditioner already holds its share bound
  if (weighted >= 0.5 && warnKey(lab, 'ammonia', hour, 24)) {
    const deadFilter = env.summary.failed.find((e) => e.def.kind === 'filter');
    const cause = deadFilter
      ? `the ${deadFilter.def.name} has failed — repair it in the tank card › Equipment`
      : w.bioMaturity < 0.5
        ? 'the biological filter is not established yet'
        : env.stockingLoad > 1
          ? 'the tank is overstocked for its filter'
          : w.foodInWater > 0
            ? 'uneaten food is rotting'
            : 'waste is outpacing the filter';
    ctx.emit({ kind: 'danger', text: `Ammonia is spiking in ${tank.name} (${w.ammonia.toFixed(2)} ppm) — ${cause}. Do a 30–50% water change and feed lightly.`, tankId: tank.id, toast: true });
  }
  const nitriteW = w.nitrite * (env.salt ? 0.25 : 1);
  if (nitriteW >= 0.5 && warnKey(lab, 'nitrite', hour, 24)) {
    ctx.emit({ kind: 'danger', text: `Nitrite is spiking in ${tank.name} (${w.nitrite.toFixed(2)} ppm) — the filter bacteria are still catching up. Change 30–50% of the water.`, tankId: tank.id, toast: true });
  }
  // Temperature vs inhabitants
  let tooWarm: string | null = null;
  let tooCold: string | null = null;
  for (const { creature, species } of env.inhabitants) {
    // lane:fix-water — past the tolerance band, where the report turns DANGER (inside it the bar says "a little cool").
    if (w.tempC > species.tempC.max + TEMP_TOLERANCE_C) tooWarm = tooWarm ?? (creature.name || species.commonName);
    if (w.tempC < species.tempC.min - TEMP_TOLERANCE_C) tooCold = tooCold ?? (creature.name || species.commonName);
  }
  if (tooWarm && warnKey(lab, 'too_warm', hour, 12))
    ctx.emit({ kind: 'danger', text: `${tank.name} is ${w.tempC.toFixed(1)} °C — too warm for ${tooWarm}. Check the heater/chiller settings.`, tankId: tank.id, toast: true });
  if (tooCold && warnKey(lab, 'too_cold', hour, 12))
    ctx.emit({ kind: 'danger', text: `${tank.name} is ${w.tempC.toFixed(1)} °C — too cold for ${tooCold}. It needs a working heater.`, tankId: tank.id, toast: true });
  if (w.oxygen < 0.5 && warnKey(lab, 'oxygen', hour, 12))
    ctx.emit({ kind: 'danger', text: `Oxygen is low in ${tank.name}. Add an airstone or more surface movement — animals may gasp at the surface.`, tankId: tank.id, toast: true });
  if (w.level < 0.86 && warnKey(lab, 'level', hour, 24))
    ctx.emit({ kind: 'warning', text: `The water level in ${tank.name} has dropped to ${Math.round(w.level * 100)}%. Top off with fresh water${env.salt ? ' — salinity rises as water evaporates' : ''}.`, tankId: tank.id });
  const d = CLASS_DEFAULTS[tank.waterClass];
  if (env.salt && d.sg && (w.salinitySG > d.sg.max || w.salinitySG < d.sg.min) && warnKey(lab, 'salinity', hour, 24))
    ctx.emit({ kind: 'warning', text: `Salinity in ${tank.name} is ${w.salinitySG.toFixed(3)} — outside the safe range. ${w.salinitySG > d.sg.max ? 'Top off with fresh water.' : 'Dose salt mix gradually.'}`, tankId: tank.id, toast: true });
}
