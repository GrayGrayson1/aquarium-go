/**
 * Tank environment aggregation: equipment effects, volume, habitat and inhabitants. OWNER: lane "waterlab".
 * `equipmentSummary` / `flowInfo` need only the tank (used by speciesWaterComfort, which has no state);
 * `computeTankEnv` adds habitat + inhabitants from the game state.
 */
import type { Creature, EquipmentDef, EquipmentInstance, GameState, SpeciesDefinition, Tank, FlowLevel } from '@/types';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getTankTier } from '@/data/catalog/tanks';
import { getDecorDef } from '@/data/catalog/decor';
import { findSpecies } from '@/data/species';
import { tankHabitat, type TankHabitat } from '../aquascape';
import { clamp, nitrifierTempFactor } from './chem';
import { LITRES_PER_GALLON, ROOM_TEMP_C, isSaltClass } from './constants';
import { residentsOf } from '../residents'; // lane:perf2

export interface EqEntry {
  inst: EquipmentInstance;
  def: EquipmentDef;
}

export interface EquipmentSummary {
  entries: EqEntry[];
  /** Every filter (any state). */
  filters: EqEntry[];
  /** Filters running normally. */
  activeFilters: EqEntry[];
  /** Waste units/hour the filter media could nitrify at full maturity (off/failed filters keep 20 % via surfaces). */
  bioCapUnits: number;
  /** Rated flow of running filters (gph). */
  filterGph: number;
  /** 0..1 flow-weighted mechanical efficiency of running filters. */
  mech: number;
  heaters: EqEntry[];
  stuckHeaters: EqEntry[];
  heaterPower: number;
  /** Highest heater thermostat (°C) or null. */
  heaterSet: number | null;
  chillers: EqEntry[];
  chillerPower: number;
  chillerSet: number | null;
  /** °C of evaporative cooling from fans. */
  fanCool: number;
  fans: number;
  lights: EqEntry[];
  /** Σ par × setting of working lights (0..~1.6). */
  par: number;
  aeration: number;
  agitation: number;
  /** Effective circulation (gph) from filters + pumps. */
  flowGph: number;
  skimmerExport: number;
  refugiumExport: number;
  uvExport: number;
  /** CO₂ injection 0..1 (0 = none). */
  co2: number;
  ato: boolean;
  autofeeder: EqEntry | null;
  lid: boolean;
  failed: EqEntry[];
  /** Heater thermostat set at/above chiller setpoint — they fight. */
  conflict: boolean;
}

const settingOr = (inst: EquipmentInstance, def: EquipmentDef, fallback: number) =>
  typeof inst.setting === 'number' && Number.isFinite(inst.setting) ? inst.setting : def.stats.defaultSetting ?? fallback;

/** Size factor: a device sized for small tanks has less effect in a big one. */
function sizeFactor(def: EquipmentDef, gallons: number): number {
  return clamp(Math.sqrt(Math.max(1, def.gallonsRange.max) / Math.max(1, gallons)), 0.3, 1.25);
}

export function equipmentSummary(tank: Tank): EquipmentSummary {
  const gallons = safeGallons(tank);
  const level = tank.water?.level ?? 1;
  const s: EquipmentSummary = {
    entries: [],
    filters: [],
    activeFilters: [],
    bioCapUnits: 0,
    filterGph: 0,
    mech: 0,
    heaters: [],
    stuckHeaters: [],
    heaterPower: 0,
    heaterSet: null,
    chillers: [],
    chillerPower: 0,
    chillerSet: null,
    fanCool: 0,
    fans: 0,
    lights: [],
    par: 0,
    aeration: 0,
    agitation: 0,
    flowGph: 0,
    skimmerExport: 0,
    refugiumExport: 0,
    uvExport: 0,
    co2: 0,
    ato: false,
    autofeeder: null,
    lid: false,
    failed: [],
    conflict: false,
  };
  let mechWeighted = 0;
  for (const inst of tank.equipment ?? []) {
    const def = getEquipmentDef(inst.defId);
    if (!def) continue;
    const e: EqEntry = { inst, def };
    s.entries.push(e);
    if (inst.failed) s.failed.push(e);
    const working = inst.on && !inst.failed;
    const sf = sizeFactor(def, gallons);
    switch (def.kind) {
      case 'filter': {
        s.filters.push(e);
        const bio = def.stats.bioCapacity ?? 0;
        // Hang-on-back filters suck air when the level drops below the intake.
        const hobStarved = def.visual === 'hob_filter' && level < 0.86;
        if (working) {
          s.activeFilters.push(e);
          const set = clamp(settingOr(inst, def, 1), 0.3, 1);
          const flow = (def.stats.flowGph ?? 0) * set * (hobStarved ? 0.3 : 1);
          s.bioCapUnits += bio * (hobStarved ? 0.5 : 1);
          s.filterGph += flow;
          mechWeighted += (def.stats.mechanical ?? 0) * flow;
          s.flowGph += flow * (def.visual === 'sponge_filter' ? 0.35 : 0.75);
          s.aeration += (def.stats.aeration ?? 0) * sf * (hobStarved ? 0.3 : 1);
          s.agitation += (def.stats.agitation ?? 0) * sf * set;
        } else {
          s.bioCapUnits += bio * 0.2;
        }
        break;
      }
      case 'heater': {
        const stuck = inst.on && inst.failed && inst.failMode === 'stuck_on';
        if (stuck) s.stuckHeaters.push(e);
        if (working) {
          s.heaters.push(e);
          s.heaterPower += def.stats.power ?? 0;
          const set = settingOr(inst, def, 25.5);
          s.heaterSet = s.heaterSet === null ? set : Math.max(s.heaterSet, set);
        }
        break;
      }
      case 'chiller':
        if (working) {
          s.chillers.push(e);
          s.chillerPower += def.stats.power ?? 0;
          const set = settingOr(inst, def, 18);
          s.chillerSet = s.chillerSet === null ? set : Math.min(s.chillerSet, set);
        }
        break;
      case 'fan':
        if (working) {
          s.fans += 1;
          s.fanCool += (def.stats.power ?? 1.5) * clamp(settingOr(inst, def, 1), 0, 1) * clamp(sf, 0.5, 1);
          s.agitation += (def.stats.agitation ?? 0) * sf;
        }
        break;
      case 'light':
        if (working) {
          s.lights.push(e);
          s.par += (def.stats.par ?? 0.3) * clamp(settingOr(inst, def, 1), 0, 1.5) * clamp(sf, 0.45, 1);
        }
        break;
      case 'airstone':
        if (working) {
          s.aeration += (def.stats.aeration ?? 0) * sf;
          s.agitation += (def.stats.agitation ?? 0) * sf;
        }
        break;
      case 'powerhead':
      case 'wavemaker':
        if (working) {
          const set = clamp(settingOr(inst, def, 1), 0, 1);
          s.flowGph += (def.stats.flowGph ?? 0) * set;
          s.aeration += (def.stats.aeration ?? 0) * sf * set;
          s.agitation += (def.stats.agitation ?? 0) * sf * set;
        }
        break;
      case 'skimmer':
        if (working && level >= 0.86) {
          // lane:fit — a skimmer's foam needs near sea-strength salt water: in low brackish water it barely skims
          // (it still stirs air into the water).
          s.skimmerExport += (def.stats.export ?? 0) * clamp(sf, 0.4, 1.1) * skimmerSalinityFactor(tank.water?.salinitySG ?? 1.025);
          s.aeration += (def.stats.aeration ?? 0) * sf;
        }
        break;
      case 'refugium':
        if (working) s.refugiumExport += (def.stats.export ?? 0) * clamp(sf, 0.4, 1.1);
        break;
      case 'uv':
        if (working) s.uvExport += (def.stats.export ?? 0) * clamp(sf, 0.4, 1.1);
        break;
      case 'co2':
        if (working) s.co2 = Math.max(s.co2, clamp(settingOr(inst, def, 0.5), 0, 1));
        break;
      case 'ato':
        if (working) s.ato = true;
        break;
      case 'autofeeder':
        if (working) s.autofeeder = e;
        break;
      case 'lid':
        s.lid = true;
        break;
    }
  }
  s.mech = s.filterGph > 0 ? mechWeighted / s.filterGph : 0;
  s.par = Math.min(1.6, s.par);
  s.skimmerExport = Math.min(1, s.skimmerExport);
  s.refugiumExport = Math.min(1.2, s.refugiumExport);
  s.uvExport = Math.min(1, s.uvExport);
  s.fanCool = Math.min(3, s.fanCool);
  s.conflict = s.heaterSet !== null && s.chillerSet !== null && s.heaterSet > s.chillerSet - 0.3;
  return s;
}

/**
 * lane:fit — how well a protein skimmer foams at this salinity: 1 at SG ≥ 1.020 (reef and fish-only marine water), falling
 * to 0 at SG 1.008 (low brackish). Real skimmers need near sea-strength water for stable foam.
 */
export function skimmerSalinityFactor(sg: number): number {
  return clamp(((Number.isFinite(sg) ? sg : 1.025) - 1.008) / 0.012, 0, 1);
}

export function safeGallons(tank: Pick<Tank, 'tierId'>): number {
  try {
    return getTankTier(tank.tierId).gallons;
  } catch {
    return 20;
  }
}

export function tankGeometryIn(tank: Pick<Tank, 'tierId'>): { l: number; w: number; h: number } {
  try {
    return getTankTier(tank.tierId).dimsIn;
  } catch {
    return { l: 30, w: 12, h: 12 };
  }
}

// ───────────────────────────── Flow ─────────────────────────────

export const FLOW_LEVELS: FlowLevel[] = ['very_low', 'low', 'moderate', 'high'];
export const FLOW_LABEL: Record<FlowLevel, string> = { very_low: 'very gentle', low: 'gentle', moderate: 'moderate', high: 'strong' };

export function flowLevelIndex(turnoverPerHour: number): number {
  if (turnoverPerHour < 4) return 0;
  if (turnoverPerHour < 10) return 1;
  if (turnoverPerHour < 25) return 2;
  return 3;
}

/** Effective circulation (tank volumes per hour) and its FlowLevel index 0..3. */
export function flowInfo(tank: Tank, summary = equipmentSummary(tank)): { turnover: number; index: number; level: FlowLevel } {
  const turnover = summary.flowGph / Math.max(1, safeGallons(tank));
  const index = flowLevelIndex(turnover);
  return { turnover, index, level: FLOW_LEVELS[index] };
}

export const flowPrefIndex = (f: FlowLevel) => Math.max(0, FLOW_LEVELS.indexOf(f));

/**
 * lane:w2-sim — one shared flow rule for the water report, the comfort model and compatibility:
 * one level off a species' preferred flow is a gentle note ('bit_*': GOOD, with advice); two or more levels off is
 * WATCH ('too_*'). Species that need oxygen-rich current (special.highOxygen) are already short at one level too still.
 */
export type FlowMismatch = 'ok' | 'bit_strong' | 'bit_still' | 'too_strong' | 'too_still';
export function flowMismatch(flowIndex: number, species: Pick<SpeciesDefinition, 'flowPreference' | 'special'>): FlowMismatch {
  const diff = flowIndex - flowPrefIndex(species.flowPreference);
  if (diff >= 2) return 'too_strong';
  if (diff === 1) return 'bit_strong';
  if (diff <= -2 || (diff <= -1 && species.special?.highOxygen)) return 'too_still';
  if (diff === -1) return 'bit_still';
  return 'ok';
}

// ───────────────────────────── Temperature expectations ─────────────────────────────

/** Thermal time constant (hours) — how quickly the tank follows room temperature. Bigger water = slower. */
export function thermalTau(gallons: number, lid: boolean): number {
  return (4 + 2.2 * Math.sqrt(Math.max(1, gallons))) * (lid ? 1.15 : 1);
}

/** Room temperature at a game hour: 22 °C with a gentle ±0.8 °C daily cycle (warmest mid-afternoon). */
export function roomTempAt(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  return ROOM_TEMP_C + 0.8 * Math.sin(((h - 9) / 24) * Math.PI * 2);
}

/** Where the thermostat equipment will hold this tank (°C), ignoring short swings. */
export function expectedTempC(tank: Tank, summary = equipmentSummary(tank)): number {
  const gallons = safeGallons(tank);
  const litres = gallons * LITRES_PER_GALLON;
  const tau = thermalTau(gallons, summary.lid);
  const ambient = ROOM_TEMP_C - summary.fanCool + 0.5 * Math.min(1, summary.par) * (tank.lighting?.intensity ?? 1) * 0.6;
  // Max temperature the heaters can hold: ambient + P·0.86·tau / L
  let t = ambient;
  if (summary.stuckHeaters.length) {
    const p = summary.stuckHeaters.reduce((a, e) => a + (e.def.stats.power ?? 0), 0);
    return ambient + (p * 0.86 * tau) / litres;
  }
  if (summary.heaterSet !== null && t < summary.heaterSet) {
    const reach = ambient + (summary.heaterPower * 0.86 * tau) / litres;
    t = Math.min(summary.heaterSet, reach);
  }
  if (summary.chillerSet !== null && t > summary.chillerSet) {
    const reach = ambient - (summary.chillerPower * 0.86 * tau) / litres;
    t = Math.max(summary.chillerSet, reach);
  }
  return t;
}

// ───────────────────────────── Inhabitants & load ─────────────────────────────

export interface Inhabitant {
  creature: Creature;
  species: SpeciesDefinition;
}

export function inhabitantsOf(state: GameState, tankId: string): Inhabitant[] {
  const out: Inhabitant[] = [];
  for (const c of residentsOf(state, tankId)) { // lane:perf2 — per-step residents index (same members, same order)
    const sp = findSpecies(c.speciesId);
    if (sp) out.push({ creature: c, species: sp });
  }
  return out;
}

/** Waste/respiration weight of one animal at its current size: bioload × (size / adult)², clamped. */
export function effectiveBioload(species: SpeciesDefinition, sizeCm?: number): number {
  const adult = Math.max(0.1, species.adultSizeCm);
  const ratio = sizeCm && sizeCm > 0 ? sizeCm / adult : 1;
  return Math.max(0.005, species.bioload * clamp(ratio * ratio, 0.02, 1.4));
}

export function safeHabitat(state: GameState, tank: Tank): TankHabitat {
  try {
    const h = tankHabitat(state, tank);
    if (h) return h;
  } catch {
    // aquascape lane mid-edit or bad decor — fall back to an empty habitat
  }
  return {
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
}

export function coralCount(h: TankHabitat): number {
  const c = h.corals ?? { soft: 0, lps: 0, sps: 0, zoanthid: 0, mushroom: 0, gsp: 0 };
  return (c.soft ?? 0) + (c.lps ?? 0) + (c.sps ?? 0) + (c.zoanthid ?? 0) + (c.mushroom ?? 0) + (c.gsp ?? 0);
}

/** Count decor items of the given catalog category (e.g. anemones). */
export function decorCategoryCount(tank: Tank, category: string): number {
  let n = 0;
  for (const d of tank.decor ?? []) {
    const def = getDecorDef(d.defId);
    if (def && def.category === category) n++;
  }
  return n;
}

export interface TankEnv {
  gallons: number;
  litresFull: number;
  heightIn: number;
  salt: boolean;
  summary: EquipmentSummary;
  habitat: TankHabitat;
  inhabitants: Inhabitant[];
  /** Σ effective bioload at current sizes. */
  bioloadUnits: number;
  /** Surfaces (glass, rock, wood, live rock) that host some bacteria even without a filter (units/h). */
  surfaceBioUnits: number;
  /** Units/hour the tank can support by room (volume). */
  spaceCapUnits: number;
  /** Units/hour the filters + surfaces can support. */
  processCapUnits: number;
  stockingLoad: number;
  /** Gas-exchange coefficient per hour. */
  kla: number;
  tau: number;
  flow: { turnover: number; index: number; level: FlowLevel };
  corals: number;
}

export function computeTankEnv(state: GameState, tank: Tank): TankEnv {
  const gallons = safeGallons(tank);
  const dims = tankGeometryIn(tank);
  const summary = equipmentSummary(tank);
  const habitat = safeHabitat(state, tank);
  const inhabitants = inhabitantsOf(state, tank.id);
  let bioloadUnits = 0;
  for (const i of inhabitants) bioloadUnits += effectiveBioload(i.species, i.creature.sizeCm);
  const salt = isSaltClass(tank.waterClass) || tank.environment !== 'freshwater';
  const rockBonus = tank.waterClass === 'marine_live_rock' || tank.waterClass === 'reef' ? gallons * 0.08 : 0;
  const surfaceBioUnits = gallons * 0.06 + Math.max(0, habitat.grazing ?? 0) * 0.4 + rockBonus;
  const spaceCapUnits = gallons * (salt ? 0.35 : 0.5);
  // lane:w2-sim — cool water slows the filter bacteria (acclimated colonies ~80% at 16 °C): stocking reflects it.
  const bioT = Math.min(1, nitrifierTempFactor(tank.water?.tempC ?? 25, tank.water?.lab?.bioTempC));
  const processCapUnits = (summary.bioCapUnits * 0.75 + surfaceBioUnits) * bioT;
  const stockingLoad = bioloadUnits / Math.max(0.1, Math.min(spaceCapUnits, processCapUnits));
  const kla = clamp(0.05 + 1.2 * summary.aeration + 0.6 * summary.agitation, 0.05, 3);
  return {
    gallons,
    litresFull: gallons * LITRES_PER_GALLON,
    heightIn: dims.h,
    salt,
    summary,
    habitat,
    inhabitants,
    bioloadUnits,
    surfaceBioUnits,
    spaceCapUnits,
    processCapUnits,
    stockingLoad,
    kla,
    tau: thermalTau(gallons, summary.lid),
    flow: flowInfo(tank, summary),
    corals: coralCount(habitat),
  };
}
