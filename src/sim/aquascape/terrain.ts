/**
 * Substrate heightfield + "surface under a point" helpers. OWNER: lane "aquascape".
 *
 * Shared by the sim (decor placement y, anchors) and the renderer (substrate mesh), so what you see is
 * exactly where decor sits. Pure + deterministic (seeded from the tank id).
 *
 * The bed is sloped the classic aquascaping way — shallow at the front glass, deeper at the back — with a
 * couple of soft mounds. The average depth stays close to `tank.substrate.depthCm`.
 */
import type { Tank, DecorInstance, DecorDef } from '@/types';
import { tankDims } from '../tankSpace';
import { getDecorDef } from '@/data/catalog/decor';

type TankLike = Pick<Tank, 'id' | 'tierId' | 'substrate'> & { water?: { level: number } };

function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function lattice(ix: number, iz: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/** Smooth 2D value noise in [-1, 1]. */
export function valueNoise2(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = lattice(ix, iz, seed);
  const b = lattice(ix + 1, iz, seed);
  const c = lattice(ix, iz + 1, seed);
  const d = lattice(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/** Relative slope/mound shape (≈1 on average). Exposed so the renderer can shade crests/troughs. */
export function substrateShape(tank: TankLike, x: number, z: number): number {
  const d = tankDims(tank);
  const seed = hash32(tank.id || 'tank');
  const xn = Math.max(-1, Math.min(1, x / (d.L / 2)));
  const zn = Math.max(-1, Math.min(1, z / (d.W / 2)));
  const t = -zn; // +1 at the back glass, -1 at the front glass
  const slope = 0.3 * t + 0.08 * t * t * t;
  const corners = 0.12 * xn * xn * Math.max(0, t + 0.3);
  const mounds = 0.16 * valueNoise2(x * (3.2 / Math.max(0.3, d.L)) + 11.3, z * (2.2 / Math.max(0.2, d.W)) + 5.1, seed) + 0.05 * valueNoise2(x * 18 + 3.1, z * 18 + 9.7, seed ^ 0x5bd1e995);
  return Math.max(0.35, 1 + slope + corners + mounds);
}

/** Tank-local y of the substrate surface at (x, z). 0 for bare-bottom tanks. */
export function substrateHeightAt(tank: TankLike, x: number, z: number): number {
  const d = tankDims(tank);
  if (tank.substrate.kind === 'bare' || d.substrateY <= 0.0015) return 0;
  return d.substrateY * substrateShape(tank, x, z);
}

/** How high an epiphyte/coral can attach on top of a hardscape item at (x, z); -Infinity if not over it. */
export function hardscapeTopAt(inst: DecorInstance, def: DecorDef, x: number, z: number): number {
  if (def.category !== 'hardscape' && def.category !== 'ornament' && def.category !== 'substrate_feature') return -Infinity;
  const c = Math.cos(inst.rotY);
  const s = Math.sin(inst.rotY);
  const dx = x - inst.x;
  const dz = z - inst.z;
  // into decor-local (inverse of rotation.y)
  const lx = (dx * c - dz * s) / inst.scale;
  const lz = (dx * s + dz * c) / inst.scale;
  const rx = def.size.w / 2;
  const rz = def.size.d / 2;
  // lane:frags — a frag rack is a flat acrylic shelf: plugs sit level on it, right out to its corners
  if (def.visual === 'frag_rack') return Math.abs(lx) < rx * 0.97 && Math.abs(lz) < rz * 0.97 ? inst.y + def.size.h * inst.scale : -Infinity;
  const r2 = (lx / rx) ** 2 + (lz / rz) ** 2;
  if (r2 >= 1) return -Infinity;
  const h = def.size.h * inst.scale;
  const v = def.visual;
  // wood: epiphytes are tied low on the trunk/branches; rocks: dome top; caves: the capstone.
  let frac: number;
  if (v.startsWith('wood_')) frac = v === 'wood_cholla' ? 0.85 : 0.32;
  else if (v === 'rock_live_arch') frac = Math.abs(lx) > rx * 0.45 ? 0.75 : 0.95;
  else if (v.startsWith('cave_') || v === 'rock_slate') frac = 0.95;
  else if (v === 'rock_rubble') frac = 0.8;
  else frac = 0.92;
  const dome = Math.sqrt(Math.max(0, 1 - r2));
  return inst.y + h * frac * (0.45 + 0.55 * dome);
}

/**
 * Surface height under (x, z): the substrate, or the top of any hardscape there (for epiphytes/corals).
 * `excludeId` skips the item being moved.
 */
export function surfaceHeightAt(tank: TankLike & { decor: DecorInstance[] }, x: number, z: number, excludeId?: string): number {
  let y = substrateHeightAt(tank, x, z);
  for (const inst of tank.decor) {
    if (inst.id === excludeId) continue;
    const def = getDecorDef(inst.defId);
    if (!def) continue;
    const top = hardscapeTopAt(inst, def, x, z);
    if (top > y) y = top;
  }
  return y;
}
