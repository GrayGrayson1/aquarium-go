/**
 * "Well-run venue" pass for showcase fixtures. OWNER: lane "qa-play".
 *
 * The late-game fixtures were built by tuning each tank for its most common species only, so mixed tanks loaded on
 * Watch for fixture reasons, not play reasons ("Water is too still" for tangs in a chromis-tuned reef, "Current is
 * too strong" for axolotls, bright light over dim-loving shrimp), and the shared food cupboard only covered a few
 * meals for a hall of fifteen tanks. This pass sets flow, light and the cupboard the way a careful keeper would.
 * Mixes that no setting can satisfy are fixed in the fixture's stock list instead (see core-fixtures.ts).
 */
import type { EquipmentInstance, GameState, SpeciesDefinition, Tank } from '@/types';
import { findSpecies } from '@/data/species';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { equipmentSummary, flowInfo, flowMismatch, safeGallons } from '@/sim/water/env';
import { creaturesInTank } from '@/sim/life';
import { tankFoodOutlook } from '@/sim/tankStatus';
import { refreshTankCache } from '@/sim/world';

/** Turnover (volumes / hour) in the middle of each flow band (see flowLevelIndex: <4, <10, <25, ≥25). */
const BAND_MID = [2.5, 7, 16, 35];
const SPONGE_FLOW = 0.35;
const FILTER_FLOW = 0.75;

function residentSpecies(g: GameState, tank: Tank): SpeciesDefinition[] {
  const ids = new Set(creaturesInTank(g, tank.id).map((c) => c.speciesId));
  return [...ids].map((id) => findSpecies(id)).filter((s): s is SpeciesDefinition => !!s);
}

/**
 * The flow band that suits the mix best. lane:w2-sim — the water report now calls one band off a species' preference
 * a note (GOOD) and two or more a WATCH (see flowMismatch), so pick the band with the fewest WATCHes, then the fewest
 * notes; ties favour the gentler band.
 */
export function bestFlowIndex(species: readonly SpeciesDefinition[]): number {
  let best = 0;
  let bestCost = Infinity;
  for (let i = 0; i <= 3; i++) {
    let cost = 0;
    for (const sp of species) {
      const m = flowMismatch(i, sp);
      cost += m === 'too_strong' || m === 'too_still' ? 100 : m === 'ok' ? 0 : 1;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = i;
    }
  }
  return best;
}

function pumpDefFor(gallons: number): string {
  return gallons >= 90 ? 'wavemaker' : gallons >= 55 ? 'powerhead_large' : 'powerhead_small';
}

/** Set filters / pumps so the tank's circulation lands in flow band `index`. */
export function setFlowBand(g: GameState, tank: Tank, index: number): void {
  const gallons = safeGallons(tank);
  const need = BAND_MID[index] * gallons;
  const isFilter = (e: EquipmentInstance) => getEquipmentDef(e.defId)?.kind === 'filter';
  const isPump = (e: EquipmentInstance) => {
    const k = getEquipmentDef(e.defId)?.kind;
    return k === 'powerhead' || k === 'wavemaker';
  };
  const filterFlowAt1 = tank.equipment
    .filter((e) => isFilter(e) && e.on && !e.failed)
    .reduce((a, e) => {
      const def = getEquipmentDef(e.defId)!;
      return a + (def.stats.flowGph ?? 0) * (def.visual === 'sponge_filter' ? SPONGE_FLOW : FILTER_FLOW);
    }, 0);
  for (const e of tank.equipment) if (isFilter(e)) e.setting = 1;
  if (filterFlowAt1 >= need) {
    // The filters alone are enough (or too much): pumps off, filters throttled (never below 30 %, like the valve).
    for (const e of tank.equipment) if (isPump(e)) e.on = false;
    const set = Math.max(0.3, Math.min(1, need / Math.max(1, filterFlowAt1)));
    for (const e of tank.equipment) if (isFilter(e)) e.setting = Math.round(set * 100) / 100;
  } else {
    let remaining = need - filterFlowAt1;
    const pumps = tank.equipment.filter(isPump);
    let pumpMax = pumps.reduce((a, e) => a + (getEquipmentDef(e.defId)?.stats.flowGph ?? 0), 0);
    for (let n = 0; pumpMax < remaining && n < 6; n++) {
      const defId = pumpDefFor(gallons);
      const inst: EquipmentInstance = { id: `${tank.id}_qa_pump_${n}`, defId, installedHour: g.clock.hour, condition: 1, on: true, setting: 1 };
      tank.equipment.push(inst);
      pumps.push(inst);
      pumpMax += getEquipmentDef(defId)?.stats.flowGph ?? 0;
    }
    remaining = Math.max(0, remaining);
    const set = Math.max(0.05, Math.min(1, remaining / Math.max(1, pumpMax)));
    for (const e of pumps) {
      e.on = true;
      e.setting = Math.round(set * 100) / 100;
    }
  }
}

/** Light level the water report accepts for everyone: never bright over dim-lovers, never dim under bright-lovers or corals. */
export function tuneLight(g: GameState, tank: Tank, species: readonly SpeciesDefinition[]): void {
  const s = equipmentSummary(tank);
  if (!s.lights.length || s.par <= 0) return;
  const dim = species.some((sp) => sp.lightPreference === 'dim');
  const bright = species.some((sp) => sp.lightPreference === 'bright' || sp.category === 'coral' || sp.category === 'anemone');
  const par = s.par * (tank.lighting.intensity ?? 1);
  let target = par;
  if (dim) target = Math.min(target, 0.65);
  if (bright) target = Math.max(target, 0.45);
  if (target !== par) tank.lighting.intensity = Math.round(Math.max(0.2, Math.min(1.5, target / s.par)) * 100) / 100;
}

/** Heater to the middle of the band every resident finds ideal (tuned for the most common species, the rest ran cool). */
export function tuneHeater(tank: Tank, species: readonly SpeciesDefinition[]): void {
  const lo = Math.max(...species.map((sp) => sp.tempC.idealMin));
  const hi = Math.min(...species.map((sp) => sp.tempC.idealMax));
  if (!(lo <= hi)) return; // no shared ideal band: leave the fixture's choice
  const target = Math.round(((lo + hi) / 2) * 2) / 2;
  let heated = false;
  for (const e of tank.equipment) {
    if (getEquipmentDef(e.defId)?.kind !== 'heater') continue;
    if (target < 21) continue; // cool-water tanks: the chiller sets the temperature
    e.setting = target;
    heated = true;
  }
  if (heated) {
    tank.water.tempC = target;
    if (tank.water.lab) tank.water.lab.prevTemp = target;
  }
}

/** Top up the shared cupboard until no tank reports low or no food (a staffed venue keeps a stocked store room). */
export function stockCupboardForAll(g: GameState): void {
  for (let pass = 0; pass < 10; pass++) {
    let short = false;
    for (const id of g.tankOrder) {
      const o = tankFoodOutlook(g, id);
      if (o.level === 'ok') continue;
      short = true;
      for (const f of new Set([o.restockId, ...o.foodIds].filter((x): x is string => !!x))) g.inventory.foods[f] = Math.ceil((g.inventory.foods[f] ?? 0) * 2 + 120);
    }
    if (!short) return;
  }
}

/** Flow + light for every tank, then the cupboard, then fresh tank caches (status words at load). */
export function tuneVenue(g: GameState): GameState {
  for (const id of g.tankOrder) {
    const tank = g.tanks[id];
    const species = residentSpecies(g, tank);
    if (!species.length) continue;
    const idx = bestFlowIndex(species);
    if (flowInfo(tank).index !== idx) setFlowBand(g, tank, idx);
    tuneLight(g, tank, species);
    tuneHeater(tank, species);
  }
  stockCupboardForAll(g);
  for (const id of g.tankOrder) refreshTankCache(g, g.tanks[id]);
  return g;
}
