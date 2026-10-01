/**
 * Helpers for building dev/test worlds: facility sizing, collision-free tank placement, stocking, decorating.
 * OWNER: lane "core". Used by core fixtures, dev commands (spawnSpecies / fillTestFacility) and tests.
 * Everything is deterministic for a given state (sim RNG / visualRng only).
 */
import type { GameState, Tank, WaterClass, Creature, FacilityLevelId, DecorInstance, Sex } from '@/types';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng, visualRng } from '@/sim/rng';
import { nextId } from '@/sim/ids';
import { starterAquascape, placeDecor } from '@/sim/aquascape';
import { tuneEquipmentForSpecies } from '@/sim/care';
import { findFreeSpot } from '@/sim/facility';
import { FRONT_CLEARANCE_M, relayoutTanks } from '@/sim/facility/layout';
import { refreshTankCache } from '@/sim/world';
import { IN_TO_M } from '@/sim/tankSpace';
import { getTankTier, TANK_TIERS } from '@/data/catalog/tanks';
import { DECOR } from '@/data/catalog/decor';
import { findSpecies, listSpecies, STARTER_IDS, type StarterId } from '@/data/species';
import { getFacilityLevel } from '@/data/facilities';
import { UNLOCK_KEYS } from '@/data/unlockKeys';

/** Fallback room sizes (metres) when the facility lane doesn't define a level yet. */
const FALLBACK_DIMS: Record<FacilityLevelId, { width: number; depth: number }> = {
  hobby_room: { width: 5, depth: 4.5 },
  specialty_shop: { width: 9, depth: 7 },
  aquarium_store: { width: 14, depth: 10 },
  showroom: { width: 20, depth: 14 },
  destination: { width: 28, depth: 18 },
  grand_hall: { width: 36, depth: 24 },
};

/** Set the facility level (and at least its floor size). */
export function ensureFacility(state: GameState, level: FacilityLevelId): void {
  const def = getFacilityLevel(level);
  const dims = def && def.id === level ? { width: def.width, depth: def.depth } : FALLBACK_DIMS[level];
  const old = { width: state.facility.width, depth: state.facility.depth };
  state.facility.level = level;
  state.facility.width = Math.max(state.facility.width, dims.width);
  state.facility.depth = Math.max(state.facility.depth, dims.depth);
  // lane:facrender (P2-09) — re-seat tanks placed before the room grew, as the real upgrade does: a starter tank left
  // on the old back-wall line ended up standing in the viewing aisle of the tanks added along the new back wall
  if (state.tankOrder.length && (state.facility.width !== old.width || state.facility.depth !== old.depth)) {
    try {
      relayoutTanks(state, old);
    } catch {
      /* dev fixture: keep the old spots if the layout pass is unavailable */
    }
  }
}

export function unlockEverything(state: GameState): void {
  for (const key of Object.keys(UNLOCK_KEYS)) if (!state.progress.unlocked.includes(key)) state.progress.unlocked.push(key);
}

interface Rect {
  x: number;
  z: number;
  hx: number;
  hz: number;
}

/** Floor footprint (half extents, metres) of a tank tier at a rotation, including a small stand overhang. */
function footprint(tierId: string, rotY = 0): { hx: number; hz: number } {
  const t = getTankTier(tierId);
  const L = t.dimsIn.l * IN_TO_M + 0.08;
  const W = t.dimsIn.w * IN_TO_M + 0.08;
  const swap = Math.abs(Math.sin(rotY)) > 0.7;
  return swap ? { hx: W / 2, hz: L / 2 } : { hx: L / 2, hz: W / 2 };
}

const overlaps = (a: Rect, b: Rect) => Math.abs(a.x - b.x) < a.hx + b.hx && Math.abs(a.z - b.z) < a.hz + b.hz;

/**
 * Side gap between neighbouring tanks and the aisle kept in front/behind rows (metres). The aisle matches the sim's
 * island rows (layout.ts: FRONT_CLEARANCE_M + 1.6): the tank camera's front shot stands ~1.5 m out, so a tank parked
 * closer in front of another put the lens inside it (lane:facrender P2-09, was 1.3).
 */
const GAP_X = 0.5;
const AISLE_Z = FRONT_CLEARANCE_M + 1.6;
const WALL_MARGIN = 0.3;

function occupied(state: GameState, ignoreId?: string): Rect[] {
  const out: Rect[] = [];
  for (const id of state.tankOrder) {
    if (id === ignoreId) continue;
    const t = state.tanks[id];
    if (!t) continue;
    const fp = footprint(t.tierId, t.placement.rotY);
    out.push({ x: t.placement.x, z: t.placement.z, hx: fp.hx + GAP_X / 2, hz: fp.hz + AISLE_Z / 2 });
  }
  return out;
}

/**
 * Loose check (inside the room, no footprint overlap, nothing parked in the viewing aisle) — used to sanity-check the
 * facility lane's suggestion, which only knows the tanks the sim placed, not ones a fixture left behind on upgrade.
 */
function fitsLoose(state: GameState, tierId: string, p: { x: number; z: number; rotY: number }, ignoreId?: string): boolean {
  const fp = footprint(tierId, p.rotY);
  const hw = state.facility.width / 2;
  const hd = state.facility.depth / 2;
  if (Math.abs(p.x) + fp.hx > hw + 1e-6 || Math.abs(p.z) + fp.hz > hd + 1e-6) return false;
  const me: Rect = { x: p.x, z: p.z, hx: fp.hx, hz: fp.hz + AISLE_Z / 2 };
  for (const id of state.tankOrder) {
    if (id === ignoreId) continue;
    const t = state.tanks[id];
    if (!t) continue;
    const o = footprint(t.tierId, t.placement.rotY);
    if (overlaps(me, { x: t.placement.x, z: t.placement.z, hx: o.hx, hz: o.hz + AISLE_Z / 2 })) return false;
  }
  return true;
}

function fits(state: GameState, tierId: string, p: { x: number; z: number; rotY: number }, ignoreId?: string): boolean {
  const fp = footprint(tierId, p.rotY);
  const hw = state.facility.width / 2;
  const hd = state.facility.depth / 2;
  if (p.x - fp.hx < -hw + WALL_MARGIN - 1e-6 || p.x + fp.hx > hw - WALL_MARGIN + 1e-6) return false;
  if (p.z - fp.hz < -hd + WALL_MARGIN - 1e-6 || p.z + fp.hz > hd - WALL_MARGIN + 1e-6) return false;
  const me: Rect = { x: p.x, z: p.z, hx: fp.hx + GAP_X / 2, hz: fp.hz + AISLE_Z / 2 };
  return !occupied(state, ignoreId).some((r) => overlaps(me, r));
}

/**
 * A collision-free floor spot for a tank of this tier: asks the facility lane first (findFreeSpot) and validates it,
 * then scans rows from the back wall forward. Returns null when the floor is full.
 */
export function findTankSpot(state: GameState, tierId: string, ignoreId?: string, askFacilityLane = true): { x: number; z: number; rotY: number } | null {
  if (askFacilityLane) {
    try {
      // The facility lane validates props, doorways and visitor reachability — trust it unless it overlaps a tank.
      const lane = findFreeSpot(state, tierId);
      if (lane && fitsLoose(state, tierId, lane, ignoreId)) return lane;
    } catch {
      /* facility lane not ready */
    }
  }
  const fp = footprint(tierId, 0);
  const hw = state.facility.width / 2;
  const hd = state.facility.depth / 2;
  const step = 0.25;
  for (let z = -hd + WALL_MARGIN + fp.hz; z + fp.hz <= hd - WALL_MARGIN - 0.8; z += step) {
    // Scan outward from the centre line so rows grow symmetrically.
    const span = hw - WALL_MARGIN - fp.hx;
    for (let k = 0; k <= Math.ceil(span / step) * 2; k++) {
      const off = Math.ceil(k / 2) * step * (k % 2 === 0 ? 1 : -1);
      const x = off;
      if (Math.abs(x) > span + 1e-6) continue;
      const p = { x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, rotY: 0 };
      if (fits(state, tierId, p, ignoreId)) return p;
    }
  }
  return null;
}

/** Find a spot, growing the floor (dev worlds only) when it's full. */
export function placeOrGrow(state: GameState, tierId: string, ignoreId?: string, askFacilityLane = true): { x: number; z: number; rotY: number } {
  for (let i = 0; i < 12; i++) {
    const p = findTankSpot(state, tierId, ignoreId, askFacilityLane);
    if (p) return p;
    state.facility.width = Math.round(state.facility.width * 1.2 * 10) / 10;
    state.facility.depth = Math.round(state.facility.depth * 1.15 * 10) / 10;
  }
  return { x: 0, z: 0, rotY: 0 };
}

/** Create a cycled tank placed on a free spot. */
export function addPlacedTank(state: GameState, tierId: string, waterClass: WaterClass, name?: string, placement?: { x: number; z: number; rotY: number }): Tank {
  const p = placement ?? placeOrGrow(state, tierId);
  return createTank(state, tierId, waterClass, { cycled: true, name, placement: p });
}

/** Smallest tank tier with at least this many gallons (unlock keys ignored — dev only). */
export function tierForGallons(gallons: number): string {
  return (TANK_TIERS.find((t) => t.gallons >= gallons) ?? TANK_TIERS[TANK_TIERS.length - 1]).id;
}

/** First species id in the list that exists in the registry. */
export function firstSpecies(ids: string[]): string | null {
  for (const id of ids) if (findSpecies(id)) return id;
  return null;
}

export type SexPlan = Sex | 'pair' | 'mixed' | 'females' | 'auto';

export interface StockEntry {
  /** Species id, or candidates in preference order (first registered one wins). */
  species: string | string[];
  count: number;
  sex?: SexPlan;
  /** Age in game-days (default: young adult). */
  ageDays?: number;
  names?: string[];
  potentialsBias?: number;
}

function sexFor(plan: SexPlan, i: number, speciesId: string): Sex | undefined {
  const sp = findSpecies(speciesId);
  if (sp && (sp.sexSystem === 'protandrous' || sp.sexSystem === 'protogynous' || sp.sexSystem === 'not_applicable')) return undefined;
  switch (plan) {
    case 'male':
    case 'female':
    case 'unknown':
      return plan;
    case 'females':
      return 'female';
    case 'pair':
    case 'mixed':
      return i % 2 === 0 ? 'male' : 'female';
    case 'auto':
    default: {
      // Solitary/territorial species with fighting males: default to females in groups.
      if (sp && sp.sameSpeciesRule.maleMale !== 'ok') return i === 0 ? 'male' : 'female';
      return i % 2 === 0 ? 'female' : 'male';
    }
  }
}

/**
 * Add creatures to a tank. Entries whose species aren't registered are skipped; only if NOTHING could be stocked is
 * `fallback` used (for the combined count), so fixtures never mix in wrong species while lanes are incomplete.
 */
export function stockTank(state: GameState, tankId: string, entries: StockEntry[], fallback?: string): Creature[] {
  const known = entries.filter((e) => firstSpecies(Array.isArray(e.species) ? e.species : [e.species]));
  if (!known.length && fallback && findSpecies(fallback)) {
    const count = entries.reduce((a, e) => a + e.count, 0);
    return count ? stockTank(state, tankId, [{ species: fallback, count, sex: 'auto' }]) : [];
  }
  const rng = simRng(state);
  const out: Creature[] = [];
  for (const e of known) {
    const speciesId = firstSpecies(Array.isArray(e.species) ? e.species : [e.species]);
    if (!speciesId) continue;
    const sp = findSpecies(speciesId)!;
    for (let i = 0; i < e.count; i++) {
      const ageDays = e.ageDays ?? sp.lifecycle.juvenileDays + 4 + (i % 5);
      const c = createCreature(state, rng, speciesId, {
        sex: sexFor(e.sex ?? 'auto', i, speciesId),
        ageDays,
        captiveBred: true,
        potentialsBias: e.potentialsBias ?? 0.1,
        name: e.names?.[i],
        tankId,
      });
      addCreature(state, c, tankId);
      out.push(c);
      if (!state.progress.discoveredSpecies.includes(speciesId)) state.progress.discoveredSpecies.push(speciesId);
      const morph = `${speciesId}:${c.morphName}`;
      if (!state.progress.discoveredMorphs.includes(morph)) state.progress.discoveredMorphs.push(morph);
    }
  }
  return out;
}

const STARTER_FOR_CLASS: Partial<Record<WaterClass, StarterId>> = {
  freshwater_cool: 'axolotl',
  freshwater_planted: 'betta',
  freshwater_tropical: 'pea_puffer',
  marine_live_rock: 'lined_seahorse',
  marine_fowlr: 'ocellaris_clownfish',
  reef: 'ocellaris_clownfish',
};

/** Deterministic decor scatter from the decor catalog, sized to the tank. */
export function scatterDecor(state: GameState, tank: Tank): DecorInstance[] {
  const defs = DECOR.filter(
    (d) => d.environments.includes(tank.environment) && (!d.waterClasses || d.waterClasses.length === 0 || d.waterClasses.includes(tank.waterClass)),
  );
  if (!defs.length) return [];
  const tier = getTankTier(tank.tierId);
  const L = tier.dimsIn.l * IN_TO_M;
  const W = tier.dimsIn.w * IN_TO_M;
  const rng = visualRng(`${tank.id}:scatter`);
  const hard = defs.filter((d) => d.category === 'hardscape');
  const living = defs.filter((d) => (tank.environment === 'marine' ? (d.category === 'coral' && tank.waterClass === 'reef') || d.category === 'anemone' && tank.waterClass === 'reef' : d.category === 'plant'));
  const extra = defs.filter((d) => d.category === 'ornament' || d.category === 'enrichment' || d.category === 'substrate_feature');
  const nHard = Math.min(14, Math.max(2, Math.round(2 + tier.gallons / 45)));
  const nLiving = Math.min(36, Math.max(3, Math.round(3 + tier.gallons / 18)));
  const out: DecorInstance[] = [];
  const add = (pool: typeof defs, n: number, backBias: number) => {
    if (!pool.length) return;
    for (let i = 0; i < n; i++) {
      const def = pool[Math.floor(rng.next() * pool.length) % pool.length];
      const scale = def.scaleRange[0] + (def.scaleRange[1] - def.scaleRange[0]) * rng.next();
      const hx = Math.max(0.02, L / 2 - (def.size.w * scale) / 2 - 0.03);
      const hz = Math.max(0.02, W / 2 - (def.size.d * scale) / 2 - 0.03);
      const x = (rng.next() * 2 - 1) * hx;
      const z = -hz + Math.pow(rng.next(), backBias) * hz * 1.6;
      out.push({ id: nextId(state, 'dec'), defId: def.id, x, y: 0, z: Math.min(hz, z), rotY: rng.next() * Math.PI * 2, scale, seed: Math.floor(rng.next() * 1e9) });
    }
  };
  add(hard, nHard, 1.6);
  add(living, nLiving, 1.2);
  add(extra, Math.min(3, Math.round(tier.gallons / 120)), 1);
  return out;
}

/**
 * Give a tank a decent aquascape: the aquascape lane's starter layout for the matching class first, then a
 * catalog scatter as fallback / supplement for big tanks.
 */
export function decorateTank(state: GameState, tank: Tank, hint?: StarterId): void {
  const starter = hint ?? STARTER_FOR_CLASS[tank.waterClass] ?? 'betta';
  let decor: DecorInstance[] = [];
  try {
    decor = starterAquascape(state, starter, tank) ?? [];
  } catch {
    decor = [];
  }
  tank.decor = [...decor];
  const gallons = getTankTier(tank.tierId).gallons;
  if (decor.length >= 3 && gallons < 120) return;
  // Supplement: try the aquascape lane's placement (validates height/collisions), else keep the raw instance.
  for (const d of scatterDecor(state, tank)) {
    let ok = false;
    try {
      ok = placeDecor(state, tank.id, d.defId, { x: d.x, z: d.z, rotY: d.rotY, scale: d.scale }, true).ok;
    } catch {
      ok = false;
    }
    if (!ok) tank.decor.push(d);
  }
}

/** Most common species in a tank (for equipment tuning). */
export function dominantSpecies(state: GameState, tankId: string): string | null {
  const counts = new Map<string, number>();
  for (const c of Object.values(state.creatures)) if (c.tankId === tankId && c.status === 'alive') counts.set(c.speciesId, (counts.get(c.speciesId) ?? 0) + 1);
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of counts) if (v > n) [best, n] = [k, v];
  return best;
}

/**
 * Dev worlds are "established" tanks: set water chemistry to the overlap of every resident species' ideal band
 * (midpoint), falling back to the average of their ideals when the bands don't overlap.
 */
export function matchWaterToStock(state: GameState, tank: Tank): void {
  const species = [...new Set(Object.values(state.creatures).filter((c) => c.tankId === tank.id && c.status === 'alive').map((c) => c.speciesId))]
    .map((id) => findSpecies(id))
    .filter((sp): sp is NonNullable<typeof sp> => !!sp);
  if (!species.length) return;
  const pick = (ranges: { lo: number; hi: number }[]): number | null => {
    if (!ranges.length) return null;
    const lo = Math.max(...ranges.map((r) => r.lo));
    const hi = Math.min(...ranges.map((r) => r.hi));
    if (lo <= hi) return (lo + hi) / 2;
    return ranges.reduce((a, r) => a + (r.lo + r.hi) / 2, 0) / ranges.length;
  };
  const w = tank.water;
  const t = pick(species.map((sp) => ({ lo: sp.tempC.idealMin, hi: sp.tempC.idealMax })));
  if (t !== null) w.tempC = Math.round(t * 10) / 10;
  const ph = pick(species.map((sp) => ({ lo: sp.pH.idealMin, hi: sp.pH.idealMax })));
  if (ph !== null) w.pH = Math.round(ph * 100) / 100;
  // Species GH is a tolerated range: aim for its softer third.
  const gh = pick(species.filter((sp) => sp.gh).map((sp) => ({ lo: sp.gh!.min, hi: sp.gh!.min + (sp.gh!.max - sp.gh!.min) * 0.5 })));
  if (gh !== null && tank.environment !== 'marine') w.gh = Math.round(gh * 10) / 10;
  // The water sim relaxes pH toward 7.48 + log10(KH / CO₂) (marine ≈ 0.35 lower), so steer pH through KH:
  // choose the KH whose equilibrium (ambient CO₂ ≈ 3 mg/L) gives the target pH, within the residents' KH overlap.
  const khRanges = species.filter((sp) => sp.kh).map((sp) => ({ lo: sp.kh!.min, hi: sp.kh!.max }));
  if (khRanges.length && ph !== null) {
    const lo = Math.max(...khRanges.map((r) => r.lo));
    const hi = Math.min(...khRanges.map((r) => r.hi));
    const want = 3 * Math.pow(10, ph - (tank.environment === 'marine' ? 7.13 : 7.477));
    const kh = lo <= hi ? Math.min(hi, Math.max(lo, want)) : (pick(khRanges) ?? want);
    // Never below a safe buffer (the water report flags KH < 2 as a pH-crash risk).
    w.kh = Math.round(Math.max(tank.environment === 'marine' ? 7 : 2, kh) * 10) / 10;
  }
  const sal = pick(species.filter((sp) => sp.salinitySG).map((sp) => ({ lo: sp.salinitySG!.idealMin, hi: sp.salinitySG!.idealMax })));
  if (sal !== null && tank.environment === 'marine') w.salinitySG = Math.round(sal * 1000) / 1000;
}

/** Match water, tune equipment for the tank's main species and refresh derived caches. */
export function finishTank(state: GameState, tank: Tank): void {
  matchWaterToStock(state, tank);
  const main = dominantSpecies(state, tank.id);
  if (main) {
    try {
      tuneEquipmentForSpecies(state, tank.id, main);
    } catch {
      /* care lane not ready */
    }
  }
  refreshTankCache(state, tank);
}

/** Species that suit a tank's water class, optionally peaceful only (for filling test tanks). */
export function speciesForClass(waterClass: WaterClass, env: Tank['environment'], peacefulOnly = true): string[] {
  const list = listSpecies(
    (s) =>
      s.environment === env &&
      s.waterClasses.includes(waterClass) &&
      s.category !== 'coral' &&
      s.category !== 'anemone' &&
      (!peacefulOnly || s.temperament === 'peaceful'),
  ).map((s) => s.id);
  if (list.length) return list;
  // Fallback before the species lanes land: starters of the right environment.
  return STARTER_IDS.filter((id) => {
    const s = findSpecies(id);
    return s && s.environment === env;
  });
}
