/**
 * Living decor over time: plant growth (light × nutrients), coral/anemone health (water + light),
 * botanicals breaking down, and the plants-vs-algae interplay. OWNER: lane "aquascape".
 *
 * Chemistry coupling (documented for the waterlab lane): this step removes nitrate taken up by growing
 * plants/macroalgae, suppresses algae in proportion to plant mass, and adds photosynthetic oxygen while the
 * lights are on. The water sim should NOT apply `tankHabitat().nitrateUptake` a second time.
 */
import type { GameState, Tank, DecorDef, DecorInstance, LightPreset } from '@/types';
import { getDecorDef, isLiving } from '@/data/catalog/decor';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getTankTier } from '@/data/catalog/tanks';
import { findSpecies } from '@/data/species';
import { vitality } from './habitat';
import { incidentRisks } from '../compat';
import { simRng } from '../rng';
import { emitEvent } from '../context';
import { fragGrowthFactor, stepFragGrowOut } from './frags'; // lane:frags

/**
 * Coral-nipping fish (compat `coral_nip` incidents): roll per step and damage a coral colony a little.
 * Deterministic (sim RNG); soft/LPS/zoanthid polyps are preferred targets over stony SPS and gorgonians.
 */
function applyCoralNipping(state: GameState, tank: Tank, dt: number): void {
  const corals = tank.decor.filter((d) => {
    const def = getDecorDef(d.defId);
    return def && def.category === 'coral' && def.visual !== 'coral_gorgonian';
  });
  if (!corals.length) return;
  let risks: ReturnType<typeof incidentRisks>;
  try {
    risks = incidentRisks(state, tank.id).filter((r) => r.kind === 'coral_nip');
  } catch {
    return;
  }
  if (!risks.length) return;
  const rng = simRng(state);
  for (const risk of risks) {
    const p = 1 - Math.pow(1 - Math.min(0.95, Math.max(0, risk.perDay)), dt / 24);
    if (!rng.chance(p)) continue;
    const pick = rng.weighted(corals, (c) => {
      const t = getDecorDef(c.defId)?.coralType;
      return t === 'sps' ? 0.5 : t === 'lps' ? 1.4 : 1;
    });
    const def = getDecorDef(pick.defId)!;
    const loss = 8 + rng.next() * 10;
    pick.health = clamp((pick.health ?? 90) - loss, 0, 100);
    const actor = findSpecies(risk.actorSpeciesId)?.commonName ?? 'A fish';
    emitEvent(state, {
      kind: 'warning',
      text: `${actor.replace(/^\w/, (c) => c.toUpperCase())} nipped the ${def.name.toLowerCase()} (${Math.round(pick.health)}% health). Not every fish is reef-safe.`,
      tankId: tank.id,
    });
  }
}

const PRESET_PAR: Record<LightPreset, number> = {
  daylight: 0.5,
  warm: 0.42,
  planted: 0.68,
  reef_actinic: 0.62,
  reef_full: 0.85,
  moonlight: 0.05,
  sunset: 0.3,
  cool: 0.5,
};

/** Ideal growth per game-hour (0..1 scale) by visual. */
const GROWTH_RATE: Record<string, number> = {
  plant_vallisneria: 0.01,
  plant_rotala: 0.014,
  plant_ludwigia: 0.012,
  plant_water_sprite: 0.016,
  plant_floating: 0.018,
  plant_sword: 0.007,
  plant_monte_carlo: 0.008,
  plant_hairgrass: 0.007,
  plant_java_fern: 0.004,
  plant_anubias: 0.0025,
  plant_crypt: 0.004,
  plant_moss: 0.006,
  plant_marimo: 0.0015,
  macro_chaeto: 0.012,
  macro_gracilaria: 0.009,
  coral_leather: 0.004,
  coral_zoanthid: 0.005,
  coral_mushroom: 0.004,
  coral_gsp: 0.007,
  coral_hammer: 0.003,
  coral_torch: 0.003,
  coral_frogspawn: 0.003,
  coral_acropora: 0.002,
  coral_gorgonian: 0.004,
  anemone_bta: 0.003,
};

const SLOW_GROWERS = new Set(['plant_java_fern', 'plant_anubias', 'plant_crypt', 'plant_marimo']);

export interface TankLightInfo {
  /** PAR-ish 0..1.5 while the lights are on. */
  par: number;
  spectrum: string;
  hasLight: boolean;
  co2: boolean;
}

/** Light available to photosynthetic decor while the tank lights are on. */
export function tankLightInfo(tank: Tank): TankLightInfo {
  let par = 0;
  let spectrum = '';
  let hasLight = false;
  let knownDefs = 0;
  let co2 = false;
  for (const eq of tank.equipment) {
    const def = getEquipmentDef(eq.defId);
    if (def) knownDefs++;
    const kind = def?.kind ?? (eq.defId.startsWith('light') ? 'light' : eq.defId.startsWith('co2') ? 'co2' : '');
    if (kind === 'co2' && eq.on && !eq.failed) co2 = true;
    if (kind !== 'light') continue;
    hasLight = true;
    if (!eq.on || eq.failed) continue;
    const p = def?.stats.par ?? PRESET_PAR[tank.lighting.preset] ?? 0.5;
    par = Math.max(par, p * (eq.setting !== undefined && eq.setting <= 1.5 ? Math.max(0.2, eq.setting) : 1));
    spectrum = def?.stats.spectrum ?? spectrum;
  }
  // No equipment catalogued yet (or none installed): assume the tank's preset lighting so starters grow.
  if (!hasLight && (knownDefs === 0 || tank.equipment.length === 0)) {
    par = PRESET_PAR[tank.lighting.preset] ?? 0.5;
    hasLight = true;
  }
  if (!hasLight) par = 0.08; // room light only
  par *= Math.max(0, Math.min(1.5, tank.lighting.intensity));
  return { par, spectrum, hasLight, co2 };
}

/** Fraction of [h0, h1] (game hours) that the tank lights are on. */
export function litFraction(tank: Tank, h0: number, h1: number): number {
  const span = h1 - h0;
  if (span <= 0) return isLitAt(tank, h0) ? 1 : 0;
  const n = Math.max(1, Math.min(48, Math.ceil(span * 2)));
  let lit = 0;
  for (let i = 0; i < n; i++) if (isLitAt(tank, h0 + ((i + 0.5) / n) * span)) lit++;
  return lit / n;
}

export function isLitAt(tank: Tank, hour: number): boolean {
  const hod = ((hour % 24) + 24) % 24;
  const on = tank.lighting.onHour;
  const off = tank.lighting.offHour;
  return on <= off ? hod >= on && hod < off : hod >= on || hod < off;
}

function plantTarget(def: DecorDef, inst: DecorInstance, tank: Tank, lightRatio: number): number {
  const w = tank.water;
  let t = 100;
  if (lightRatio < 0.6) t = 100 * (0.3 + 0.7 * (lightRatio / 0.6));
  const cool = def.visual === 'plant_marimo';
  if (cool && w.tempC > 26) t -= (w.tempC - 26) * 12;
  if (w.tempC < 14 && !cool) t -= (14 - w.tempC) * 6;
  if (w.tempC > 31) t -= (w.tempC - 31) * 10;
  if (SLOW_GROWERS.has(def.visual) && w.algae > 55) t -= (w.algae - 55) * 0.6;
  if (w.nitrate < 0.5 && (GROWTH_RATE[def.visual] ?? 0) > 0.008) t -= 12;
  if (w.ammonia > 1) t -= Math.min(40, (w.ammonia - 1) * 15);
  if (def.environments.includes('marine') && (w.salinitySG < 1.018 || w.salinitySG > 1.032)) t -= 30;
  return t;
}

const CORAL_NITRATE_LIMIT: Record<string, number> = { sps: 10, lps: 30, soft: 50, zoanthid: 45, mushroom: 60, gsp: 60 };

function coralTarget(def: DecorDef, tank: Tank, lightRatio: number): number {
  const w = tank.water;
  let t = 100;
  const sgDev = Math.max(0, 1.022 - w.salinitySG, w.salinitySG - 1.028);
  t -= sgDev * 12000;
  const tempDev = Math.max(0, 24 - w.tempC, w.tempC - 27.8);
  t -= tempDev * 12;
  if (w.tempC > 30) t -= 35; // bleaching
  const type = def.category === 'anemone' ? 'lps' : def.coralType ?? 'soft';
  const nLim = CORAL_NITRATE_LIMIT[type] ?? 40;
  if (w.nitrate > nLim) t -= (w.nitrate - nLim) * 1.2;
  if ((type === 'sps' || type === 'lps') && w.kh < 6.5) t -= (6.5 - w.kh) * 9;
  if (w.ammonia > 0.05) t -= Math.min(50, w.ammonia * 150);
  if (lightRatio < 0.6) t -= (0.6 - lightRatio) * 90;
  if (lightRatio > 2.6) t -= (lightRatio - 2.6) * 15;
  if (w.algae > 50) t -= (w.algae - 50) * 0.6;
  if (def.category === 'anemone' && w.bioMaturity < 0.6) t -= 25;
  return t;
}

/** Grow plants/corals, trim needs, algae interaction. Called per tank step (dt in game hours). */
export function stepTankDecorImpl(state: GameState, tank: Tank, dt: number): void {
  if (!(dt > 0) || !Number.isFinite(dt)) return;
  if (!tank.decor.length) return;
  const light = tankLightInfo(tank);
  let gallons = 20;
  try {
    gallons = getTankTier(tank.tierId).gallons;
  } catch {
    /* keep default */
  }
  const per10 = 10 / Math.max(1, gallons);
  const endHour = state.clock.hour;
  const steps = Math.max(1, Math.ceil(dt / 1));
  const h = dt / steps;
  const w = tank.water;
  for (let s = 0; s < steps; s++) {
    const h0 = endHour - dt + s * h;
    const lit = litFraction(tank, h0, h0 + h);
    let uptake = 0;
    let oxygen = 0;
    for (const inst of tank.decor) {
      const def = getDecorDef(inst.defId);
      if (!def) continue;
      if (def.visual === 'botanical_almond_leaf') {
        inst.health = clamp((inst.health ?? 100) - (100 / (14 * 24)) * h, 0, 100);
        continue;
      }
      if (!isLiving(def)) continue;
      const need = Math.max(0.05, def.lightNeed ?? 0.3);
      const lightRatio = light.par / need;
      const health = inst.health ?? 90;
      const target = clamp(def.category === 'plant' ? plantTarget(def, inst, tank, lightRatio) : coralTarget(def, tank, lightRatio), 0, 100);
      // corals & anemones heal slowly (days), plants regrow faster
      const rate = target < health ? 0.9 : def.category === 'plant' ? 1.4 : 0.35;
      inst.health = clamp(health + clamp(target - health, -rate * h, rate * h), 0, 100);
      // growth: only while lit, scaled by light, nutrients, CO2, health
      const base = GROWTH_RATE[def.visual] ?? 0.005;
      const lightF = Math.min(1.25, lightRatio);
      const nutrientF = def.category === 'plant' ? clamp(0.25 + w.nitrate / 12, 0.25, 1.1) : 1;
      const co2F = light.co2 && def.category === 'plant' ? 1.35 : 1;
      const healthF = clamp((inst.health - 25) / 60, 0, 1);
      let g = inst.growth ?? 0.5;
      // lane:frags — a parent heals after a cut (no growth); a young frag settles, then grows fast in relative terms
      g += base * lit * lightF * nutrientF * co2F * healthF * fragGrowthFactor(inst, h0) * h;
      if (inst.health < 25) g -= 0.0015 * h; // melting / receding
      inst.growth = clamp(g, 0.05, 1);
      if (def.category === 'plant') {
        const v = vitality(inst, def) * Math.max(0.2, inst.scale) ** 1.5;
        uptake += def.habitat.nitrateUptake * v * (inst.growth < 0.999 ? 1 : 0.6);
        oxygen += def.habitat.oxygen * v;
      }
    }
    uptake *= per10;
    oxygen *= per10;
    if (uptake > 0) {
      // plants out-compete algae and pull nitrate while photosynthesising
      const nFactor = clamp(w.nitrate / 5, 0, 1);
      w.nitrate = clamp(w.nitrate - uptake * 0.25 * (0.3 + 0.7 * lit) * nFactor * h, 0, 500);
      // (the water sim also models plant-vs-algae nutrient competition; this is the direct shading/allelopathy share)
      w.algae = clamp(w.algae - uptake * 0.2 * (0.4 + 0.6 * lit) * h, 0, 100);
    }
    if (oxygen > 0) {
      w.oxygen = clamp(w.oxygen + oxygen * (lit * 0.02 - (1 - lit) * 0.004) * h, 0, 1);
    }
  }
  applyCoralNipping(state, tank, dt);
  stepFragGrowOut(state, tank); // lane:frags — growing frags enlarge toward a colony and grow out
}

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo);
