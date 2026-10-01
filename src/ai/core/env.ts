/**
 * Tank environment snapshot used by the AI step: bounds, decor colliders (rounded boxes), anchors, light cycle,
 * flow and clutches. Pure (no React / no stores). OWNER: lane "behavior".
 */
import * as THREE from 'three';
import type { Tank, DecorDef, Clutch, DecorAnchorTemplate } from '@/types';
import { tankDims, decorAnchors, decorCollider, type TankDims } from '@/sim/tankSpace';
import { hourOfDay } from '@/sim/time';
import { substrateHeightAt } from '@/sim/aquascape/terrain';
import { clamp, clamp01 } from './math';

export type AnchorKind = DecorAnchorTemplate['kind'];

export interface Collider {
  decorId: string;
  category: DecorDef['category'] | 'unknown';
  cx: number;
  cy: number;
  cz: number;
  hx: number;
  hy: number;
  hz: number;
  /** Rounding radius of the rounded box. */
  r: number;
  /** Hard colliders are never penetrated (rock, wood, coral, ornaments, marimo, plant crowns). Soft = leafy plants/anemones. */
  hard: boolean;
  top: number;
  /** 'base' = the solid crown/rhizome of a leafy plant (same decorId as the plant's soft body collider). */
  part: 'body' | 'base';
  /** Height of the top above the substrate under its centre (low hard decor can be stepped over by walkers). */
  rise: number;
  /** Stands on the substrate: there is no way out underneath (see colliderSdfGrounded). */
  grounded: boolean;
}

// ───────────────────────────── decor solidity ─────────────────────────────

/** Leafy plants fish may brush through with no solid part (stems, grasses, carpets, moss, floaters, macroalgae). */
const SOFT_PLANT_VISUALS = new Set([
  'plant_vallisneria',
  'plant_rotala',
  'plant_ludwigia',
  'plant_hairgrass',
  'plant_monte_carlo',
  'plant_moss',
  'plant_floating',
  'macro_chaeto',
  'macro_gracilaria',
]);
/** Fully solid plant-category items (a marimo is a dense ball). */
const SOLID_PLANT_VISUALS = new Set(['plant_marimo']);
/** Crown / rhizome proportions of rosette & rhizome plants: footprint fractions (x, z) and height fraction. */
const PLANT_BASE: Record<string, [number, number, number]> = {
  plant_sword: [0.3, 0.3, 0.16],
  plant_crypt: [0.38, 0.38, 0.26],
  plant_java_fern: [0.5, 0.3, 0.2],
  plant_anubias: [0.55, 0.36, 0.34],
  plant_water_sprite: [0.3, 0.3, 0.16],
  plant_mangrove: [0.16, 0.16, 0.12], // lane:brackish — the propagule's foot
};
const PLANT_BASE_DEFAULT: [number, number, number] = [0.32, 0.32, 0.2];
/**
 * Branchy driftwood (spider wood, manzanita) is a fan of thin limbs over a small solid boss where they meet: fish
 * weave through the canopy and an axolotl walks under it and over the roots lying on the sand. Only the boss
 * (footprint fractions x, z; height fraction) is solid — its whole bounding box as one block walled off a third of
 * a 20-gallon tank that is really open water.
 */
const BRANCHY_WOOD: Record<string, [number, number, number]> = {
  wood_spider: [0.22, 0.26, 0.3],
  wood_manzanita: [0.24, 0.28, 0.32],
};
/**
 * Branching corals (a gorgonian sea rod, an acropora colony): thin branches fish weave through and nothing a snail can
 * crawl on — only the base plug at the foot is solid. (A solid bounding box had trochus snails and hermit crabs
 * grazing in open water on top of the sea fan.) Plate, brain, mushroom and LPS corals stay solid.
 */
const BRANCHY_CORAL: Record<string, [number, number, number]> = {
  coral_gorgonian: [0.35, 0.6, 0.15],
  coral_acropora: [0.5, 0.7, 0.2],
};
/**
 * lane:brackish — stilted mangrove roots: the crown stands on arching prop roots with open water beneath it, so the
 * whole piece is a soft tangle fish weave through (there is no solid boss on the bed to wall off).
 */
const STILT_ROOTS = new Set(['wood_mangrove']);

export interface DecorSolidity {
  /** Main collider: hard (solid) or soft (leafy, fish brush through). */
  body: 'hard' | 'soft';
  /** Nearly spherical (marimo). */
  round: boolean;
  /** Solid crown/rhizome under a soft plant (or boss of branchy wood): [footprint x, footprint z, height] fractions. */
  base: [number, number, number] | null;
  /** Tallest the solid base may be (m); plant crowns stay low, a driftwood boss is taller. */
  baseMaxH?: number;
}

/**
 * How solid a decor item is for the AI. Rock, chunky wood, caves, corals, ornaments, enrichment and marimo are
 * solid; stem plants, grasses, carpets, moss, floaters, macroalgae and anemones are soft; rosette/rhizome plants
 * (swords, crypts, java fern, anubias, water sprite…) are soft leaves over a solid crown, branchy driftwood
 * (spider wood, manzanita) a soft canopy over a solid boss, and branching corals soft branches over a solid base plug.
 */
export function decorSolidity(def: Pick<DecorDef, 'category' | 'visual'>): DecorSolidity {
  if (def.category === 'anemone') return { body: 'soft', round: false, base: null };
  if (BRANCHY_WOOD[def.visual]) return { body: 'soft', round: false, base: BRANCHY_WOOD[def.visual], baseMaxH: 0.07 };
  if (BRANCHY_CORAL[def.visual]) return { body: 'soft', round: false, base: BRANCHY_CORAL[def.visual], baseMaxH: 0.03 };
  if (STILT_ROOTS.has(def.visual)) return { body: 'soft', round: false, base: null }; // lane:brackish
  if (def.category !== 'plant') return { body: 'hard', round: false, base: null };
  if (SOLID_PLANT_VISUALS.has(def.visual)) return { body: 'hard', round: true, base: null };
  if (SOFT_PLANT_VISUALS.has(def.visual)) return { body: 'soft', round: false, base: null };
  return { body: 'soft', round: false, base: PLANT_BASE[def.visual] ?? PLANT_BASE_DEFAULT };
}

export interface Anchor {
  key: string;
  decorId: string;
  kind: AnchorKind;
  pos: THREE.Vector3;
  capacity: number;
  /** Virtual anchors are invented when a tank has no suitable decor (e.g. a seahorse in a bare tank). */
  virtual?: boolean;
}

export interface ClutchInfo {
  id: string;
  speciesId: string;
  pos: THREE.Vector3 | null;
  guardedById?: string;
  visual: Clutch['visual'];
  stage: Clutch['stage'];
  motherId: string | null;
  fatherId: string | null;
}

export interface TankEnv {
  tankId: string;
  dims: TankDims;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Mean substrate height (zone bands). Use floorAt() for the real, sculpted bed under a point. */
  floorY: number;
  surfaceY: number;
  /** Substrate heightfield samples (row-major, hfNX × hfNZ over the tank floor). */
  hf: Float32Array;
  hfNX: number;
  hfNZ: number;
  colliders: Collider[];
  anchors: Anchor[];
  byKind: Record<AnchorKind, Anchor[]>;
  decorSig: string;
  /** How many colliders / anchors come from decor (the equipment solids follow them and are re-derived on their own). */
  staticColliders: number;
  staticAnchors: number;
  environment: Tank['environment'];
  /** Game clock (hours) and hour-of-day. */
  hour: number;
  hourOfDay: number;
  /** 0 = lights off (night) … 1 = full day; smooth ramps at dawn/dusk. */
  daylight: number;
  /** Hour-of-day the tank lights come on. */
  dawnHour: number;
  /** 0..1 water movement. */
  flow: number;
  oxygen: number;
  foodInWater: number;
  tapPressure: number;
  clutches: ClutchInfo[];
  /** Host anemone/coral present (a 'host' anchor exists). */
  hasHost: boolean;
  /** Pointer over the glass of this tank. */
  pointerActive: boolean;
  pointer: THREE.Vector3;
  pointerMoveT: number;
  focused: boolean;
  reducedMotion: boolean;
  /** Party mode 0..1 and audio-reactive beat 0..1. */
  party: number;
  beat: number;
  level: number;
}

const ANCHOR_KINDS: AnchorKind[] = ['hide', 'hitch', 'perch', 'nest_site', 'rest', 'graze', 'host', 'cave', 'leaf_rest', 'burrow'];

export function emptyByKind(): Record<AnchorKind, Anchor[]> {
  const o = {} as Record<AnchorKind, Anchor[]>;
  for (const k of ANCHOR_KINDS) o[k] = [];
  return o;
}

export function createEnv(tankId: string): TankEnv {
  const dims: TankDims = { L: 0.5, W: 0.25, H: 0.3, waterY: 0.28, substrateY: 0.03, glass: 0.005, gallons: 10 };
  return {
    tankId,
    dims,
    minX: -dims.L / 2,
    maxX: dims.L / 2,
    minZ: -dims.W / 2,
    maxZ: dims.W / 2,
    floorY: dims.substrateY,
    surfaceY: dims.waterY,
    hf: new Float32Array(4).fill(dims.substrateY),
    hfNX: 2,
    hfNZ: 2,
    colliders: [],
    anchors: [],
    byKind: emptyByKind(),
    decorSig: '',
    staticColliders: 0,
    staticAnchors: 0,
    environment: 'freshwater',
    hour: 12,
    hourOfDay: 12,
    daylight: 1,
    dawnHour: 7,
    flow: 0.3,
    oxygen: 1,
    foodInWater: 0,
    tapPressure: 0,
    clutches: [],
    hasHost: false,
    pointerActive: false,
    pointer: new THREE.Vector3(),
    pointerMoveT: -1e9,
    focused: false,
    reducedMotion: false,
    party: 0,
    beat: 0,
    level: 0,
  };
}

export type DecorResolver = (defId: string) => DecorDef | undefined;

/** Non-decor solid props inside the tank (equipment: heater tubes, sponge filters, intakes, powerheads…). */
export interface ExtraSolid {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  hx: number;
  hy: number;
  hz: number;
  /** Holdfast points (seahorses happily hitch onto heaters and intake tubes). */
  hitch?: [number, number, number][];
}
export type ExtraResolver = (tank: Tank) => ExtraSolid[];
export type FlowResolver = (tank: Tank) => number;

// (the water level is deliberately NOT part of it: it drifts with evaporation every few game hours, and a rebuild on
// each drift made every animal in the tank replan at once — sleeping schools woke together. See syncEnvStatic.)
function decorSignature(tank: Tank, dims: TankDims): string {
  let s = `${tank.id}|${dims.L.toFixed(3)}|${dims.W.toFixed(3)}|${dims.substrateY.toFixed(3)}|${tank.substrate?.kind}`;
  for (const d of tank.decor) s += `|${d.id}:${d.defId}:${d.x.toFixed(3)},${d.y.toFixed(3)},${d.z.toFixed(3)},${d.rotY.toFixed(2)},${d.scale.toFixed(2)}`;
  return s;
}

/**
 * Rebuild the static parts (bounds/colliders/anchors) only when decor or dimensions change (returns true then). A
 * change of the water level alone (evaporation, a top-off) only moves the surface: anchors are re-clamped under it
 * and the equipment solids that hang from the rim are re-derived, without disturbing anyone.
 */
export function syncEnvStatic(env: TankEnv, tank: Tank, resolveDecor: DecorResolver, extras?: ExtraResolver): boolean {
  const dims = tankDims(tank);
  let sig = decorSignature(tank, dims);
  if (extras) for (const e of tank.equipment ?? []) sig += `|eq:${e.id}:${e.defId}`;
  if (sig === env.decorSig) {
    if (Math.abs(dims.waterY - env.surfaceY) > 1e-4) syncWaterLevel(env, tank, dims, extras);
    return false;
  }
  env.decorSig = sig;
  env.dims = dims;
  env.minX = -dims.L / 2;
  env.maxX = dims.L / 2;
  env.minZ = -dims.W / 2;
  env.maxZ = dims.W / 2;
  env.floorY = dims.substrateY;
  env.surfaceY = dims.waterY;
  env.environment = tank.environment;
  buildHeightfield(env, tank);
  env.colliders.length = 0;
  env.anchors.length = 0;
  env.byKind = emptyByKind();
  for (const inst of tank.decor) {
    const def = resolveDecor(inst.defId);
    if (!def) continue;
    const col = decorCollider(inst, def);
    const hx = Math.max(0.003, col.radius[0]);
    const hy = Math.max(0.003, col.radius[1]);
    const hz = Math.max(0.003, col.radius[2]);
    const sol = decorSolidity(def);
    const soft = sol.body === 'soft';
    const cx = col.center[0];
    const cy = col.center[1];
    const cz = col.center[2];
    const ground = floorAt(env, cx, cz);
    const c: Collider = {
      decorId: inst.id,
      category: def.category,
      cx,
      cy,
      cz,
      hx,
      hy,
      hz,
      r: Math.min(hx, hy, hz) * (sol.round ? 0.98 : soft ? 0.8 : 0.42),
      hard: !soft,
      top: cy + hy,
      part: 'body',
      rise: cy + hy - ground,
      grounded: cy - hy <= ground + 0.01,
    };
    env.colliders.push(c);
    if (sol.base) {
      // the solid crown / rhizome at the foot of a leafy plant (on the substrate, or on the rock/wood it grows on)
      const bottom = cy - hy;
      const bh = clamp(hy * 2 * sol.base[2], 0.008, sol.baseMaxH ?? 0.035) / 2;
      const bx = Math.max(0.004, hx * sol.base[0]);
      const bz = Math.max(0.004, hz * sol.base[1]);
      env.colliders.push({
        decorId: inst.id,
        category: def.category,
        cx,
        cy: bottom + bh,
        cz,
        hx: bx,
        hy: bh,
        hz: bz,
        r: Math.min(bx, bh, bz) * 0.7,
        hard: true,
        top: bottom + bh * 2,
        part: 'base',
        rise: bottom + bh * 2 - ground,
        grounded: bottom <= ground + 0.01,
      });
    }
    const anchors = decorAnchors(inst, def);
    anchors.forEach((a, i) => {
      const an: Anchor = { key: `${inst.id}#${i}`, decorId: inst.id, kind: a.kind, pos: new THREE.Vector3(a.pos[0], a.pos[1], a.pos[2]), capacity: Math.max(1, a.capacity) };
      clampAnchor(env, an.pos);
      env.anchors.push(an);
      (env.byKind[a.kind] ??= []).push(an);
    });
  }
  env.staticColliders = env.colliders.length;
  env.staticAnchors = env.anchors.length;
  addExtras(env, tank, extras);
  env.hasHost = env.byKind.host.length > 0;
  return true;
}

/** Append the equipment solids (and their holdfast points) after the decor colliders / anchors. */
function addExtras(env: TankEnv, tank: Tank, extras?: ExtraResolver): void {
  if (extras) {
    let list: ExtraSolid[] = [];
    try {
      list = extras(tank);
    } catch {
      list = [];
    }
    for (const x of list) {
      if (![x.cx, x.cy, x.cz, x.hx, x.hy, x.hz].every(Number.isFinite)) continue;
      const hx = Math.max(0.004, x.hx);
      const hy = Math.max(0.004, x.hy);
      const hz = Math.max(0.004, x.hz);
      env.colliders.push({ decorId: x.id, category: 'unknown', cx: x.cx, cy: x.cy, cz: x.cz, hx, hy, hz, r: Math.min(hx, hy, hz) * 0.6, hard: true, top: x.cy + hy, part: 'body', rise: x.cy + hy - floorAt(env, x.cx, x.cz), grounded: x.cy - hy <= floorAt(env, x.cx, x.cz) + 0.01 });
      (x.hitch ?? []).forEach((h, i) => {
        const an: Anchor = { key: `${x.id}#h${i}`, decorId: x.id, kind: 'hitch', pos: new THREE.Vector3(h[0], h[1], h[2]), capacity: 1 };
        clampAnchor(env, an.pos);
        env.anchors.push(an);
        env.byKind.hitch.push(an);
      });
    }
  }
}

/** The water surface moved (no decor change): re-clamp anchors under it and re-derive the equipment solids. */
function syncWaterLevel(env: TankEnv, tank: Tank, dims: TankDims, extras?: ExtraResolver): void {
  env.dims = dims;
  env.surfaceY = dims.waterY;
  // drop the equipment solids and their anchors (they follow the decor entries), then add them back for the new level
  env.colliders.length = Math.min(env.colliders.length, env.staticColliders);
  const removed = new Set<Anchor>();
  for (let i = env.staticAnchors; i < env.anchors.length; i++) removed.add(env.anchors[i]);
  env.anchors.length = Math.min(env.anchors.length, env.staticAnchors);
  if (removed.size) env.byKind.hitch = env.byKind.hitch.filter((an) => !removed.has(an));
  for (const an of env.anchors) clampAnchor(env, an.pos);
  addExtras(env, tank, extras);
  env.hasHost = env.byKind.host.length > 0;
}

function clampAnchor(env: TankEnv, p: THREE.Vector3) {
  p.x = clamp(p.x, env.minX + 0.01, env.maxX - 0.01);
  p.z = clamp(p.z, env.minZ + 0.01, env.maxZ - 0.01);
  p.y = clamp(p.y, floorAt(env, p.x, p.z), env.surfaceY - 0.005);
}

/** Sample the aquascape lane's sculpted substrate (sloped front→back, soft mounds) into a small grid. */
function buildHeightfield(env: TankEnv, tank: Tank): void {
  const L = env.maxX - env.minX;
  const W = env.maxZ - env.minZ;
  const nx = Math.max(16, Math.min(72, Math.round(L / 0.015)));
  const nz = Math.max(8, Math.min(40, Math.round(W / 0.015)));
  const hf = env.hf.length === nx * nz ? env.hf : new Float32Array(nx * nz);
  let flat = false;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = env.minX + (ix / (nx - 1)) * L;
      const z = env.minZ + (iz / (nz - 1)) * W;
      let h = env.floorY;
      if (!flat) {
        try {
          const v = substrateHeightAt(tank, x, z);
          if (Number.isFinite(v)) h = v;
        } catch {
          flat = true;
        }
      }
      hf[iz * nx + ix] = h;
    }
  }
  env.hf = hf;
  env.hfNX = nx;
  env.hfNZ = nz;
}

/** Height of the substrate surface under (x, z) — bilinear over the sampled heightfield. */
export function floorAt(env: TankEnv, x: number, z: number): number {
  const nx = env.hfNX;
  const nz = env.hfNZ;
  const fx = clamp(((x - env.minX) / (env.maxX - env.minX)) * (nx - 1), 0, nx - 1.0001);
  const fz = clamp(((z - env.minZ) / (env.maxZ - env.minZ)) * (nz - 1), 0, nz - 1.0001);
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const tx = fx - ix;
  const tz = fz - iz;
  const hf = env.hf;
  const i0 = iz * nx + ix;
  const a = hf[i0];
  const b = hf[i0 + 1];
  const c = hf[i0 + nx];
  const d = hf[i0 + nx + 1];
  const v = a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
  return Number.isFinite(v) ? v : env.floorY;
}

/** Upward normal of the substrate at (x, z). */
export function floorNormalAt(env: TankEnv, x: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  const e = 0.01;
  const dx = (floorAt(env, x + e, z) - floorAt(env, x - e, z)) / (2 * e);
  const dz = (floorAt(env, x, z + e) - floorAt(env, x, z - e)) / (2 * e);
  out.set(-dx, 1, -dz);
  return out.normalize();
}

/** Smooth 0..1 daylight from the tank's light schedule (30-minute dawn/dusk ramps). */
export function daylightAt(onHour: number, offHour: number, hour: number): number {
  const h = hourOfDay(hour);
  const ramp = 0.5;
  const since = (x: number, from: number) => (((x - from) % 24) + 24) % 24;
  const dayLen = since(offHour, onHour) || 24;
  const t = since(h, onHour);
  if (t < dayLen) {
    // lights on: ramp up after onHour, ramp down before offHour
    return clamp01(Math.min(t / ramp, (dayLen - t) / ramp + 0.0001, 1));
  }
  return 0;
}

export function syncEnvDynamic(
  env: TankEnv,
  tank: Tank,
  hour: number,
  clutches: readonly Clutch[],
  flowOf: FlowResolver,
): void {
  env.hour = hour;
  env.hourOfDay = hourOfDay(hour);
  const l = tank.lighting;
  env.daylight = l ? daylightAt(l.onHour, l.offHour, hour) : 1;
  env.dawnHour = l?.onHour ?? 7;
  env.flow = clamp01(flowOf(tank));
  env.oxygen = Number.isFinite(tank.water?.oxygen) ? tank.water.oxygen : 1;
  env.foodInWater = Math.max(0, tank.water?.foodInWater ?? 0);
  env.tapPressure = tank.tapPressure ?? 0;
  env.clutches.length = 0;
  for (const c of clutches) {
    if (c.tankId !== tank.id) continue;
    env.clutches.push({
      id: c.id,
      speciesId: c.speciesId,
      pos: c.anchor ? new THREE.Vector3(c.anchor.x, c.anchor.y, c.anchor.z) : null,
      guardedById: c.guardedById,
      visual: c.visual,
      stage: c.stage,
      motherId: c.motherId,
      fatherId: c.fatherId,
    });
  }
}

// ───────────────────────────── signed distance helpers ─────────────────────────────

/** Rounded-box signed distance (negative inside). */
export function colliderSdf(c: Collider, x: number, y: number, z: number): number {
  const qx = Math.abs(x - c.cx) - (c.hx - c.r);
  const qy = Math.abs(y - c.cy) - (c.hy - c.r);
  const qz = Math.abs(z - c.cz) - (c.hz - c.r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const oz = Math.max(qz, 0);
  return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - c.r;
}

/** Outward surface normal of a collider at a point (unit). */
export function colliderNormal(c: Collider, x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  const dx = x - c.cx;
  const dy = y - c.cy;
  const dz = z - c.cz;
  const qx = Math.abs(dx) - (c.hx - c.r);
  const qy = Math.abs(dy) - (c.hy - c.r);
  const qz = Math.abs(dz) - (c.hz - c.r);
  if (qx > 0 || qy > 0 || qz > 0) {
    out.set(Math.max(qx, 0) * Math.sign(dx || 1), Math.max(qy, 0) * Math.sign(dy || 1), Math.max(qz, 0) * Math.sign(dz || 1));
  } else if (qx >= qy && qx >= qz) out.set(Math.sign(dx || 1), 0, 0);
  else if (qy >= qz) out.set(0, Math.sign(dy || 1), 0);
  else out.set(0, 0, Math.sign(dz || 1));
  const l = out.length();
  if (l < 1e-9) return out.set(0, 1, 0);
  return out.multiplyScalar(1 / l);
}

/**
 * Signed distance for decor standing on the substrate: below its centre it behaves like a column (no exit through
 * the bottom face, which is buried in the sand). Same as colliderSdf for floating decor.
 */
export function colliderSdfGrounded(c: Collider, x: number, y: number, z: number): number {
  if (!c.grounded || y >= c.cy) return colliderSdf(c, x, y, z);
  return colliderSdfXZ(c, x, z);
}

/** Outward normal matching colliderSdfGrounded. */
export function colliderNormalGrounded(c: Collider, x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  if (!c.grounded || y >= c.cy) return colliderNormal(c, x, y, z, out);
  return colliderExitXZ(c, x, z, out);
}

/** Signed distance to a collider's rounded footprint in the xz plane (negative inside). */
export function colliderSdfXZ(c: Collider, x: number, z: number): number {
  const qx = Math.abs(x - c.cx) - (c.hx - c.r);
  const qz = Math.abs(z - c.cz) - (c.hz - c.r);
  const ox = Math.max(qx, 0);
  const oz = Math.max(qz, 0);
  return Math.sqrt(ox * ox + oz * oz) + Math.min(Math.max(qx, qz), 0) - c.r;
}

/** Horizontal outward direction from a collider's footprint at (x, z) (unit, y = 0) — walkers go around, never up. */
export function colliderExitXZ(c: Collider, x: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  const dx = x - c.cx;
  const dz = z - c.cz;
  const qx = Math.abs(dx) - (c.hx - c.r);
  const qz = Math.abs(dz) - (c.hz - c.r);
  if (qx > 0 || qz > 0) out.set(Math.max(qx, 0) * Math.sign(dx || 1), 0, Math.max(qz, 0) * Math.sign(dz || 1));
  else if (qx >= qz) out.set(Math.sign(dx || 1), 0, 0);
  else out.set(0, 0, Math.sign(dz || 1));
  const l = Math.hypot(out.x, out.z);
  if (l < 1e-9) return out.set(0, 0, 1);
  return out.multiplyScalar(1 / l);
}

const EXIT_DIRS: readonly [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 0, 1],
  [0, 0, -1],
  [0, 1, 0],
  [0, -1, 0],
];

/** Is (x, y, z) inside the water (with margin) and clear of every hard collider except `skip`? */
function exitFree(env: TankEnv, skip: Collider, x: number, y: number, z: number, rad: number, climbH: number, xz: boolean): boolean {
  if (x < env.minX + rad || x > env.maxX - rad || z < env.minZ + rad || z > env.maxZ - rad) return false;
  if (y > env.surfaceY - rad || y < floorAt(env, x, z)) return false;
  for (const c of env.colliders) {
    if (c === skip || !c.hard) continue;
    if (xz) {
      if (c.rise <= climbH || y < c.cy - c.hy - rad || y > c.top + rad) continue;
      if (colliderSdfXZ(c, x, z) < rad * 0.5) return false;
    } else if (colliderSdf(c, x, y, z) < rad * 0.5) return false;
  }
  return true;
}

/**
 * Direction for a walker to leave a collider's footprint (unit, y = 0). Shallow contact: the local outward normal.
 * Deep inside (decor placed on top of it): the shortest way out that ends in open water — not into the glass or the
 * next rock.
 */
export function freeExitXZ(
  env: TankEnv,
  c: Collider,
  x: number,
  y: number,
  z: number,
  rad: number,
  climbH: number,
  deep: boolean,
  out: THREE.Vector3,
  fwd?: THREE.Vector3,
  halfLen = 0,
): THREE.Vector3 {
  if (!deep) return colliderExitXZ(c, x, z, out);
  let best = -1;
  let bestCost = Infinity;
  for (let i = 0; i < 4; i++) {
    const [dx, , dz] = EXIT_DIRS[i];
    // a long body needs its whole length clear along the exit direction (nose against the glass blocks that way)
    const ext = rad + (fwd ? Math.abs(fwd.x * dx + fwd.z * dz) * halfLen : 0);
    const tx = dx !== 0 ? c.cx + dx * (c.hx + ext) : x;
    const tz = dz !== 0 ? c.cz + dz * (c.hz + ext) : z;
    const cost = Math.abs(tx - x) + Math.abs(tz - z) + (exitFree(env, c, tx, y, tz, ext, climbH, true) ? 0 : 1);
    if (cost < bestCost) {
      bestCost = cost;
      best = i;
    }
  }
  const d = EXIT_DIRS[best];
  return out.set(d[0], 0, d[2]);
}

/** 3-D version for swimmers deep inside decor (may also leave over the top). */
export function freeExit(env: TankEnv, c: Collider, x: number, y: number, z: number, rad: number, out: THREE.Vector3): THREE.Vector3 {
  let best = -1;
  let bestCost = Infinity;
  for (let i = 0; i < 6; i++) {
    const [dx, dy, dz] = EXIT_DIRS[i];
    if (dy < 0 && c.grounded) continue; // no way out through the sand
    const tx = dx !== 0 ? c.cx + dx * (c.hx + rad) : x;
    const ty = dy !== 0 ? c.cy + dy * (c.hy + rad) : y;
    const tz = dz !== 0 ? c.cz + dz * (c.hz + rad) : z;
    const cost = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(tz - z) + (exitFree(env, c, tx, ty, tz, rad, 0, false) ? 0 : 1);
    if (cost < bestCost) {
      bestCost = cost;
      best = i;
    }
  }
  const d = EXIT_DIRS[best];
  return out.set(d[0], d[1], d[2]);
}

export const SURF_FLOOR = 1;
export const SURF_GLASS = 2;
export const SURF_DECOR = 4;
export const SURF_ALL = 7;

export interface SurfaceHit {
  d: number;
  n: THREE.Vector3;
  kind: 'floor' | 'glass' | 'decor' | 'none';
  collider: number;
}

const _fn = new THREE.Vector3();

export function makeHit(): SurfaceHit {
  return { d: Infinity, n: new THREE.Vector3(0, 1, 0), kind: 'none', collider: -1 };
}

/**
 * Nearest allowed surface to point p (for crawlers). Tank walls/floor distances are measured from the inside;
 * decor distances from the outside. The water surface is never a crawl surface.
 */
export function nearestSurface(env: TankEnv, p: THREE.Vector3, mask: number, out: SurfaceHit, ignoreDecor?: string): SurfaceHit {
  out.d = Infinity;
  out.kind = 'none';
  out.collider = -1;
  if (mask & SURF_FLOOR) {
    floorNormalAt(env, p.x, p.z, _fn);
    const d = (p.y - floorAt(env, p.x, p.z)) * _fn.y;
    if (d < out.d) {
      out.d = d;
      out.n.copy(_fn);
      out.kind = 'floor';
    }
  }
  if (mask & SURF_GLASS) {
    let d = p.x - env.minX;
    if (d < out.d) {
      out.d = d;
      out.n.set(1, 0, 0);
      out.kind = 'glass';
    }
    d = env.maxX - p.x;
    if (d < out.d) {
      out.d = d;
      out.n.set(-1, 0, 0);
      out.kind = 'glass';
    }
    d = p.z - env.minZ;
    if (d < out.d) {
      out.d = d;
      out.n.set(0, 0, 1);
      out.kind = 'glass';
    }
    d = env.maxZ - p.z;
    if (d < out.d) {
      out.d = d;
      out.n.set(0, 0, -1);
      out.kind = 'glass';
    }
  }
  if (mask & SURF_DECOR) {
    const cs = env.colliders;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (!c.hard || c.decorId === ignoreDecor) continue;
      // decor standing on the substrate has no underside to cling to: its lower half meets the sand as a wall (the
      // rounded bottom edge of a coral head would otherwise turn a crab upside down beneath it, circling)
      const d = colliderSdfGrounded(c, p.x, p.y, p.z);
      if (d < out.d) {
        out.d = d;
        colliderNormalGrounded(c, p.x, p.y, p.z, out.n);
        out.kind = 'decor';
        out.collider = i;
      }
    }
  }
  return out;
}

/** Surface identity of a hit: -1 none, -2 floor, -3…-6 glass panes (−x, +x, −z, +z), ≥0 collider index. */
export function surfaceId(hit: SurfaceHit): number {
  if (hit.kind === 'floor') return -2;
  if (hit.kind === 'decor') return hit.collider;
  if (hit.kind === 'glass') return hit.n.x > 0.5 ? -3 : hit.n.x < -0.5 ? -4 : hit.n.z > 0.5 ? -5 : -6;
  return -1;
}

/** Distance and normal of one particular crawl surface (see surfaceId) at p; false when it is not a valid surface. */
export function surfaceById(env: TankEnv, p: THREE.Vector3, id: number, mask: number, out: SurfaceHit, ignoreDecor?: string): boolean {
  out.collider = -1;
  if (id === -2) {
    if (!(mask & SURF_FLOOR)) return false;
    floorNormalAt(env, p.x, p.z, out.n);
    out.d = (p.y - floorAt(env, p.x, p.z)) * out.n.y;
    out.kind = 'floor';
    return true;
  }
  if (id <= -3 && id >= -6) {
    if (!(mask & SURF_GLASS)) return false;
    out.kind = 'glass';
    const ax = id >= -4;
    const s = id === -3 || id === -5 ? 1 : -1;
    out.n.set(ax ? s : 0, 0, ax ? 0 : s);
    out.d = ax ? (s > 0 ? p.x - env.minX : env.maxX - p.x) : s > 0 ? p.z - env.minZ : env.maxZ - p.z;
    return true;
  }
  if (id < 0 || !(mask & SURF_DECOR) || id >= env.colliders.length) return false;
  const c = env.colliders[id];
  if (!c.hard || c.decorId === ignoreDecor) return false;
  out.d = colliderSdfGrounded(c, p.x, p.y, p.z);
  colliderNormalGrounded(c, p.x, p.y, p.z, out.n);
  out.kind = 'decor';
  out.collider = id;
  return true;
}

/** Height of the highest hard decor surface directly under/at (x,z), or the floor. */
export function groundHeightAt(env: TankEnv, x: number, z: number, includeDecor: boolean): number {
  let h = floorAt(env, x, z);
  if (!includeDecor) return h;
  for (const c of env.colliders) {
    if (!c.hard) continue;
    const dx = Math.abs(x - c.cx) - (c.hx - c.r);
    const dz = Math.abs(z - c.cz) - (c.hz - c.r);
    const ox = Math.max(dx, 0);
    const oz = Math.max(dz, 0);
    const o2 = ox * ox + oz * oz;
    if (o2 >= c.r * c.r) continue;
    const top = c.cy + c.hy - c.r + Math.sqrt(c.r * c.r - o2);
    if (top > h) h = top;
  }
  return h;
}

/** Is a point (with radius) free of hard decor? */
export function pointFree(env: TankEnv, x: number, y: number, z: number, rad: number): boolean {
  for (const c of env.colliders) {
    if (!c.hard) continue;
    if (colliderSdf(c, x, y, z) < rad) return false;
  }
  return true;
}

/** Soft-collider (plant) density 0..1 around a point — fish treat it as cover. */
export function coverAt(env: TankEnv, x: number, y: number, z: number): number {
  let c = 0;
  for (const col of env.colliders) {
    if (col.part === 'base') continue;
    const d = colliderSdf(col, x, y, z);
    if (d < 0.04) c += col.hard ? 0.5 : 0.8;
  }
  return clamp01(c);
}
