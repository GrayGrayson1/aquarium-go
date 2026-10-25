/**
 * Chunk 16 — where the rock really is, inside its collider box (lane "behavior").
 *
 * The AI's decor colliders are rounded boxes: right for keeping fish out of the rock, but a rock is drawn as a lumpy
 * dome (src/render/decor/gen/rocks.ts `rock()`: a noisy sphere with its bottom flattened, fitted to the decor's size),
 * and a live-rock arch as two chunky legs and five pieces along a bridge that tops out below the box (`genArch`). An
 * animal resting on the box's top face away from a dome's crown, or anywhere over an arch but its crest, sits in open
 * water above the rock as drawn. This models those visuals as a union of ellipsoids (decor-local, scaled, rotated as
 * the renderer places the mesh), so a resting spot can be put on the rock as drawn: `meshGap` — how far behind a point
 * on the box surface, along the box's inward normal, the drawn rock begins (Infinity: no rock behind it at all).
 * Visuals it does not model (caves, slate, wood, corals, ornaments) count as filling their box (gap 0).
 *
 * The AI cannot import the renderer's generators (layer rule), so the shapes here mirror them by hand: keep the two in
 * step when a rock generator changes.
 */
import type { DecorDef, DecorInstance } from '@/types';

export interface RockShape {
  /** Decor origin (the mesh's base point) and its rotation about y (cos, sin). */
  ox: number;
  oy: number;
  oz: number;
  c: number;
  s: number;
  /** Ellipsoids in decor-local metres (already scaled): centre x, y, z, semi-axes x, y, z — six numbers each. */
  parts: Float32Array;
}

/** Blob rocks drawn by `rock()` (one stone fitted into the size box). */
const BLOBS: Record<string, number> = {
  // visual → bury factor (river stones are buried less)
  rock_live: 1,
  rock_lava: 1,
  rock_seiryu: 1,
  rock_dragon: 1,
  rock_river: 0.6,
};

/**
 * One stone of `rock()`: base centre (bx, by, bz), size (w, d, h), buried `bury` below `by`. Its mesh is a noisy unit
 * sphere, the bottom squashed flat a third of the way down, stretched to [by − bury, by + h]: modelled as an ellipsoid a
 * little inside its box (the noise makes the box the outermost bumps), the crown just under the top.
 */
function pushBlob(out: number[], bx: number, by: number, bz: number, w: number, d: number, h: number, bury: number): void {
  const ay = 0.72 * (h + bury);
  const top = by + 0.96 * h;
  out.push(bx, top - ay, bz, 0.44 * w, ay, 0.44 * d);
}

/** The ellipsoid model of a decor item's drawn rock, or null when its visual is not modelled. */
export function rockShapeOf(inst: DecorInstance, def: Pick<DecorDef, 'visual' | 'size'>): RockShape | null {
  const sc = inst.scale;
  const w = def.size.w * sc;
  const d = def.size.d * sc;
  const h = def.size.h * sc;
  const parts: number[] = [];
  const blob = BLOBS[def.visual];
  if (blob !== undefined) {
    pushBlob(parts, 0, 0, 0, w, d, h, Math.min(0.012, def.size.h * 0.12) * blob * sc);
  } else if (def.visual === 'rock_live_arch') {
    // genArch: the legs, then five pieces along the arc (their mean sizes); the whole is only shrunk to fit, so the
    // bridge's crest stays at ~0.925 of the box height
    pushBlob(parts, -0.35 * w, 0, 0.004 * sc, 0.3 * w, 0.95 * d, 0.55 * h, 0.01 * sc);
    pushBlob(parts, 0.35 * w, 0, -0.004 * sc, 0.28 * w, 0.86 * d, 0.66 * h, 0.01 * sc);
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5;
      const a = Math.PI * (0.84 - t * 0.68);
      const cy = h * 0.14 + Math.sin(a) * h * 0.62;
      const ph = h * 0.33;
      pushBlob(parts, Math.cos(a) * w * 0.34, cy - ph * 0.5, 0, 0.225 * w, 0.71 * d, ph, 0);
    }
  } else return null;
  return { ox: inst.x, oy: inst.y, oz: inst.z, c: Math.cos(inst.rotY), s: Math.sin(inst.rotY), parts: Float32Array.from(parts) };
}

/**
 * How far behind the box-surface point (px, py, pz), along −(nx, ny, nz) (the box's outward normal there), the drawn
 * rock begins — 0 when the point is on (or in) it, Infinity when the line misses the rock within `maxT`.
 */
export function meshGap(sh: RockShape, px: number, py: number, pz: number, nx: number, ny: number, nz: number, maxT: number): number {
  // into decor-local space (the inverse of the renderer's rotation about y)
  const dx = px - sh.ox;
  const dz = pz - sh.oz;
  const lx = dx * sh.c - dz * sh.s;
  const ly = py - sh.oy;
  const lz = dx * sh.s + dz * sh.c;
  const mx = nx * sh.c - nz * sh.s;
  const my = ny;
  const mz = nx * sh.s + nz * sh.c;
  const P = sh.parts;
  let best = Infinity;
  for (let i = 0; i < P.length; i += 6) {
    // |u − t·v|² = 1 with u = (L − C)/A, v = M/A (the ray L − t·M against the unit sphere of the ellipsoid)
    const ux = (lx - P[i]) / P[i + 3];
    const uy = (ly - P[i + 1]) / P[i + 4];
    const uz = (lz - P[i + 2]) / P[i + 5];
    const vx = mx / P[i + 3];
    const vy = my / P[i + 4];
    const vz = mz / P[i + 5];
    const uu = ux * ux + uy * uy + uz * uz;
    if (uu <= 1) return 0;
    const uv = ux * vx + uy * vy + uz * vz;
    const vv = vx * vx + vy * vy + vz * vz;
    const disc = uv * uv - vv * (uu - 1);
    if (disc < 0 || vv < 1e-12) continue;
    const t = (uv - Math.sqrt(disc)) / vv;
    if (t >= 0 && t < best) best = t;
  }
  return best <= maxT ? best : Infinity;
}

/**
 * A point over the drawn rock, for something looking for a place on top of it: one of the model's parts (r1), a spot
 * well inside its footprint (r2, r3: radius and angle). Writes world x and z into out[0], out[1].
 */
export function overRock(sh: RockShape, r1: number, r2: number, r3: number, out: number[]): void {
  const P = sh.parts;
  const k = Math.min(P.length / 6 - 1, Math.floor(r1 * (P.length / 6))) * 6;
  const rr = Math.sqrt(r2) * 0.6;
  const th = r3 * Math.PI * 2;
  const lx = P[k] + Math.cos(th) * rr * P[k + 3];
  const lz = P[k + 2] + Math.sin(th) * rr * P[k + 5];
  out[0] = sh.ox + lx * sh.c + lz * sh.s;
  out[1] = sh.oz - lx * sh.s + lz * sh.c;
}
