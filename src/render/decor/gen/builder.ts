/**
 * Geometry builder for procedural decor. OWNER: lane "aquascape".
 *
 * Every generated geometry carries the same attribute set so parts can be merged per material class:
 *   position, normal, color (linear RGB)
 *   aSway  (vec4): x = sway weight 0..1 (0 = rooted), y = phase, z = flex (amplitude scale), w = birth (growth
 *                  threshold 0..1 at which this leaf/polyp emerges)
 *   aPivot (vec3): point the element scales about when it emerges / contracts (leaf base, tentacle root)
 *   aExtra (vec4): x = fluorescence/glow, y = roughness multiplier (0.5 = neutral), z = wetness/spec,
 *                  w = micro-bump strength
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { RGB } from './noise';

export type V3 = [number, number, number];
export type Sway = [number, number, number, number];
export type Extra = [number, number, number, number];

export const NO_SWAY: Sway = [0, 0, 0, 1e-4];
export const DEFAULT_EXTRA: Extra = [0, 0.5, 0.3, 1];

export class GeoBuilder {
  pos: number[] = [];
  col: number[] = [];
  sway: number[] = [];
  piv: number[] = [];
  ext: number[] = [];
  idx: number[] = [];

  get count(): number {
    return this.pos.length / 3;
  }

  v(p: V3, c: RGB, sway: Sway = NO_SWAY, pivot: V3 = p, extra: Extra = DEFAULT_EXTRA): number {
    this.pos.push(p[0], p[1], p[2]);
    this.col.push(c[0], c[1], c[2]);
    this.sway.push(sway[0], sway[1], sway[2], sway[3]);
    this.piv.push(pivot[0], pivot[1], pivot[2]);
    this.ext.push(extra[0], extra[1], extra[2], extra[3]);
    return this.count - 1;
  }

  tri(a: number, b: number, c: number): void {
    this.idx.push(a, b, c);
  }

  quad(a: number, b: number, c: number, d: number): void {
    this.idx.push(a, b, c, a, c, d);
  }

  /** Append another builder (already in this builder's space). */
  append(o: GeoBuilder): void {
    const base = this.count;
    this.pos.push(...o.pos);
    this.col.push(...o.col);
    this.sway.push(...o.sway);
    this.piv.push(...o.piv);
    this.ext.push(...o.ext);
    for (const i of o.idx) this.idx.push(i + base);
  }

  /** Apply a function to every vertex position from index `from`. */
  mapPositions(fn: (p: V3, i: number) => V3, from = 0): void {
    for (let i = from; i < this.count; i++) {
      const p = fn([this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]], i);
      this.pos[i * 3] = p[0];
      this.pos[i * 3 + 1] = p[1];
      this.pos[i * 3 + 2] = p[2];
      const q = fn([this.piv[i * 3], this.piv[i * 3 + 1], this.piv[i * 3 + 2]], -1);
      this.piv[i * 3] = q[0];
      this.piv[i * 3 + 1] = q[1];
      this.piv[i * 3 + 2] = q[2];
    }
  }

  /** Translate/rotate(Y)/scale everything from `from`. */
  transform(from: number, t: { pos?: V3; rotY?: number; rotX?: number; rotZ?: number; scale?: number | V3 }): void {
    const s: V3 = typeof t.scale === 'number' ? [t.scale, t.scale, t.scale] : t.scale ?? [1, 1, 1];
    const cy = Math.cos(t.rotY ?? 0);
    const sy = Math.sin(t.rotY ?? 0);
    const cx = Math.cos(t.rotX ?? 0);
    const sx = Math.sin(t.rotX ?? 0);
    const cz = Math.cos(t.rotZ ?? 0);
    const sz = Math.sin(t.rotZ ?? 0);
    const o = t.pos ?? [0, 0, 0];
    this.mapPositions(([x, y, z]) => {
      x *= s[0];
      y *= s[1];
      z *= s[2];
      // Z then X then Y
      let x1 = x * cz - y * sz;
      let y1 = x * sz + y * cz;
      const y2 = y1 * cx - z * sx;
      const z2 = y1 * sx + z * cx;
      const x3 = x1 * cy + z2 * sy;
      const z3 = -x1 * sy + z2 * cy;
      x1 = x3;
      y1 = y2;
      return [x1 + o[0], y1 + o[1], z3 + o[2]];
    }, from);
  }

  bbox(from = 0): { min: V3; max: V3 } {
    const min: V3 = [Infinity, Infinity, Infinity];
    const max: V3 = [-Infinity, -Infinity, -Infinity];
    for (let i = from; i < this.count; i++) {
      for (let k = 0; k < 3; k++) {
        const v = this.pos[i * 3 + k];
        if (v < min[k]) min[k] = v;
        if (v > max[k]) max[k] = v;
      }
    }
    return { min, max };
  }

  toGeometry(): THREE.BufferGeometry {
    // Guard every generator: non-finite attribute values become 0, zero-area triangles are dropped, and every
    // vertex gets a unit normal. A zero or NaN normal makes normalize() return NaN in the shader, and bloom
    // then smears that NaN across the whole frame (a black flash).
    for (const arr of [this.pos, this.col, this.sway, this.piv, this.ext]) for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) arr[i] = 0;
    const idx = cleanTriangles(this.pos, this.idx, this.count);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(safeNormals(this.pos, idx, this.count), 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.sway, 4));
    g.setAttribute('aPivot', new THREE.Float32BufferAttribute(this.piv, 3));
    g.setAttribute('aExtra', new THREE.Float32BufferAttribute(this.ext, 4));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** Drop triangles with out-of-range indices or (near-)zero area — they render nothing and poison normals. */
function cleanTriangles(pos: number[], idx: number[], count: number): number[] {
  const out: number[] = [];
  for (let t = 0; t + 2 < idx.length; t += 3) {
    const a = idx[t];
    const b = idx[t + 1];
    const c = idx[t + 2];
    if (a >= count || b >= count || c >= count || a < 0 || b < 0 || c < 0) continue;
    const ux = pos[b * 3] - pos[a * 3];
    const uy = pos[b * 3 + 1] - pos[a * 3 + 1];
    const uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3];
    const vy = pos[c * 3 + 1] - pos[a * 3 + 1];
    const vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz > 1e-26) out.push(a, b, c);
  }
  return out;
}

/**
 * Area-weighted smooth normals that are always unit length: where adjacent faces cancel out (a fold back onto
 * itself) the vertex takes its largest face's normal; a vertex with no faces gets +Y.
 */
function safeNormals(pos: number[], idx: number[], count: number): Float32Array {
  const acc = new Float32Array(count * 3);
  const best = new Float32Array(count * 3);
  const bestA = new Float32Array(count);
  const sumA = new Float32Array(count);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t];
    const b = idx[t + 1];
    const c = idx[t + 2];
    const ux = pos[b * 3] - pos[a * 3];
    const uy = pos[b * 3 + 1] - pos[a * 3 + 1];
    const uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3];
    const vy = pos[c * 3 + 1] - pos[a * 3 + 1];
    const vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    const m = Math.hypot(cx, cy, cz);
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? a : k === 1 ? b : c;
      acc[v * 3] += cx;
      acc[v * 3 + 1] += cy;
      acc[v * 3 + 2] += cz;
      sumA[v] += m;
      if (m > bestA[v]) {
        bestA[v] = m;
        best[v * 3] = cx;
        best[v * 3 + 1] = cy;
        best[v * 3 + 2] = cz;
      }
    }
  }
  for (let v = 0; v < count; v++) {
    let x = acc[v * 3];
    let y = acc[v * 3 + 1];
    let z = acc[v * 3 + 2];
    let l = Math.hypot(x, y, z);
    if (!(l > sumA[v] * 1e-4) || !Number.isFinite(l)) {
      x = best[v * 3];
      y = best[v * 3 + 1];
      z = best[v * 3 + 2];
      l = Math.hypot(x, y, z);
    }
    if (!(l > 0) || !Number.isFinite(l)) {
      x = 0;
      y = 1;
      z = 0;
      l = 1;
    }
    acc[v * 3] = x / l;
    acc[v * 3 + 1] = y / l;
    acc[v * 3 + 2] = z / l;
  }
  return acc;
}

// ───────────────────────────── vector helpers ─────────────────────────────

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scl = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** Direction from yaw (around +Y, 0 = +X) and pitch (elevation). */
export const dirYP = (yaw: number, pitch: number): V3 => [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw)];
/** Rotate vector v around unit axis k by angle a (Rodrigues). */
export function rotAxis(v: V3, k: V3, a: number): V3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const kv = cross(k, v);
  const kd = dot(k, v) * (1 - c);
  return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd];
}
export function anyPerp(t: V3): V3 {
  const a: V3 = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return norm(cross(t, a));
}

/** Catmull-Rom resample of a polyline into n points. */
export function smoothPath(pts: V3[], n: number): V3[] {
  if (pts.length < 2) return pts.slice();
  const out: V3[] = [];
  const seg = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * seg;
    const k = Math.min(seg - 1, Math.floor(u));
    const t = u - k;
    const p0 = pts[Math.max(0, k - 1)];
    const p1 = pts[k];
    const p2 = pts[k + 1];
    const p3 = pts[Math.min(seg, k + 2)];
    const t2 = t * t;
    const t3 = t2 * t;
    const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])]);
  }
  return out;
}

// ───────────────────────────── primitives ─────────────────────────────

export interface TubeOpts {
  radial: number;
  radius: (t: number, i: number) => number;
  color: (t: number, theta: number, p: V3) => RGB;
  sway?: (t: number, p: V3) => Sway;
  pivot?: V3;
  extra?: (t: number, theta: number) => Extra;
  /** radial displacement in metres (bark, knots). */
  displace?: (t: number, theta: number, p: V3) => number;
  capStart?: boolean;
  capEnd?: boolean | 'point' | 'round';
  /** start twist of the ring (radians). */
  twist?: number;
}

/** Tube along a path using parallel-transport frames. Returns ring vertex indices. */
export function tube(b: GeoBuilder, path: V3[], o: TubeOpts): void {
  const n = path.length;
  if (n < 2) return;
  const tangents: V3[] = path.map((_, i) => norm(sub(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)])));
  let normal = anyPerp(tangents[0]);
  if (o.twist) normal = rotAxis(normal, tangents[0], o.twist);
  const rings: number[][] = [];
  const pivot = o.pivot ?? path[0];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const T = tangents[i];
    if (i > 0) {
      // parallel transport
      const prev = tangents[i - 1];
      const axis = cross(prev, T);
      const s = len(axis);
      if (s > 1e-6) normal = rotAxis(normal, scl(axis, 1 / s), Math.asin(Math.min(1, s)));
      normal = norm(sub(normal, scl(T, dot(normal, T))));
    }
    const B = cross(T, normal);
    const r = o.radius(t, i);
    const ring: number[] = [];
    const sw = o.sway ? o.sway(t, path[i]) : NO_SWAY;
    for (let k = 0; k <= o.radial; k++) {
      const th = (k / o.radial) * Math.PI * 2;
      const dir = add(scl(normal, Math.cos(th)), scl(B, Math.sin(th)));
      const rr = r + (o.displace ? o.displace(t, th, path[i]) : 0);
      const p = add(path[i], scl(dir, Math.max(r * 0.2, rr)));
      ring.push(b.v(p, o.color(t, th, p), sw, pivot, o.extra ? o.extra(t, th) : DEFAULT_EXTRA));
    }
    rings.push(ring);
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < o.radial; k++) b.quad(rings[i][k], rings[i + 1][k], rings[i + 1][k + 1], rings[i][k + 1]);
  const cap = (i: number, flip: boolean, mode: boolean | 'point' | 'round') => {
    const T = tangents[i];
    const t = i / (n - 1);
    const r = o.radius(t, i);
    const tipOut = mode === 'point' ? r * 1.8 : mode === 'round' ? r * 0.8 : r * 0.05;
    const c = add(path[i], scl(T, flip ? -tipOut : tipOut));
    const sw = o.sway ? o.sway(t, c) : NO_SWAY;
    const ci = b.v(c, o.color(t, 0, c), sw, pivot, o.extra ? o.extra(t, 0) : DEFAULT_EXTRA);
    for (let k = 0; k < o.radial; k++) {
      if (flip) b.tri(ci, rings[i][k + 1], rings[i][k]);
      else b.tri(ci, rings[i][k], rings[i][k + 1]);
    }
  };
  if (o.capStart) cap(0, true, true);
  if (o.capEnd) cap(n - 1, false, o.capEnd);
}

export interface LeafOpts {
  base: V3;
  yaw: number;
  pitch: number;
  length: number;
  width: number;
  /** downward bend over the length (radians total). */
  curl?: number;
  /** sideways bend (radians total). */
  sideCurl?: number;
  twist?: number;
  fold?: number; // V-fold angle (radians); positive lifts the edges toward the upper side (a cupped blade)
  /** Cross-section cupping (edge lift as a fraction of the half-width, ∝ s²). Defaults by shape. */
  cup?: number;
  wave?: number; // edge ruffle amplitude (m)
  waveFreq?: number;
  shape: 'lance' | 'ovate' | 'ribbon' | 'round' | 'needle' | 'oval' | 'heart';
  segL: number;
  segW: number;
  color: (t: number, s: number) => RGB;
  sway: Sway; // x (weight) is overwritten per vertex when `weightFromHeight` is used later
  extra?: Extra;
  pivot?: V3;
  /** Petiole length before the blade (drawn as a thin strip). */
  petiole?: number;
}

export function leafWidth(shape: LeafOpts['shape'], t: number): number {
  switch (shape) {
    case 'lance':
      return Math.sin(Math.PI * Math.pow(Math.min(1, t), 0.72)) * (1 - 0.1 * t);
    case 'ovate':
      return Math.sin(Math.PI * Math.pow(Math.min(1, t), 0.62));
    case 'oval':
      return Math.sin(Math.PI * Math.min(1, t));
    case 'heart':
      return Math.sin(Math.PI * Math.pow(Math.min(1, t), 0.5)) * (t < 0.08 ? 0.6 + t * 5 : 1);
    case 'ribbon':
      return t < 0.02 ? 0.55 + t * 20 : t > 0.93 ? Math.sqrt(Math.max(0, 1 - ((t - 0.93) / 0.07) ** 2)) : 1;
    case 'round':
      return Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
    case 'needle':
      return t > 0.7 ? (1 - t) / 0.3 : 1;
  }
}

/** A single leaf blade (double-sided surface). */
export function leaf(b: GeoBuilder, o: LeafOpts): void {
  const pivot = o.pivot ?? o.base;
  const dirH: V3 = [Math.cos(o.yaw), 0, -Math.sin(o.yaw)]; // horizontal heading
  const side: V3 = [Math.sin(o.yaw), 0, Math.cos(o.yaw)]; // width axis (horizontal, perpendicular)
  const extra = o.extra ?? DEFAULT_EXTRA;
  // spine
  const segL = Math.max(2, o.segL);
  const spine: V3[] = [];
  const pts: { p: V3; fwd: V3; up: V3; side: V3 }[] = [];
  let p: V3 = o.base;
  const petiole = o.petiole ?? 0;
  const total = o.length + petiole;
  const step = total / segL;
  let pitch = o.pitch;
  let yawOff = 0;
  for (let i = 0; i <= segL; i++) {
    const t = i / segL;
    const tb = petiole > 0 ? Math.max(0, (t * total - petiole) / o.length) : t;
    const cy = Math.cos(o.yaw + yawOff);
    const syy = Math.sin(o.yaw + yawOff);
    const fwd: V3 = [Math.cos(pitch) * cy, Math.sin(pitch), -Math.cos(pitch) * syy];
    const sd: V3 = [syy, 0, cy];
    let up = cross(sd, fwd);
    const tw = (o.twist ?? 0) * tb;
    const sd2 = rotAxis(sd, fwd, tw);
    up = rotAxis(up, fwd, tw);
    spine.push(p);
    pts.push({ p, fwd, up, side: sd2 });
    p = add(p, scl(fwd, step));
    pitch -= ((o.curl ?? 0) / segL) * (0.4 + 1.2 * tb);
    yawOff += (o.sideCurl ?? 0) / segL;
  }
  void dirH;
  void side;
  const segW = Math.max(1, o.segW);
  // real blades are never flat paper: a gentle cup across the width (the shader adds matching normal curvature)
  const cup = o.cup ?? (o.shape === 'needle' ? 0 : o.shape === 'ribbon' ? 0.06 : 0.14);
  const rows: number[][] = [];
  for (let i = 0; i <= segL; i++) {
    const t = i / segL;
    const tb = petiole > 0 ? Math.max(0, (t * total - petiole) / o.length) : t;
    const inBlade = petiole <= 0 || t * total >= petiole;
    const wBlade = inBlade ? leafWidth(o.shape, tb) * o.width * 0.5 : o.width * 0.035;
    const { p: sp, up, side: sd } = pts[i];
    const row: number[] = [];
    for (let j = 0; j <= segW * 2; j++) {
      const s = j / segW - 1; // -1..1
      const as = Math.abs(s);
      let q = add(sp, scl(sd, s * wBlade));
      const foldLift = as * wBlade * Math.tan(o.fold ?? 0) + s * s * wBlade * cup;
      const waveLift = (o.wave ?? 0) * as * Math.sin(tb * Math.PI * 2 * (o.waveFreq ?? 3) + s * 1.3) * (inBlade ? 1 : 0);
      q = add(q, scl(up, foldLift + waveLift));
      // leaf-space coordinates for the vein shader: z = t along the blade, w = 3 + s across (marker ≥ 2)
      const ex: Extra = [extra[0], extra[1], inBlade ? tb : 0, 3 + s * 0.999];
      row.push(b.v(q, o.color(tb, s), o.sway, pivot, ex));
    }
    rows.push(row);
  }
  for (let i = 0; i < segL; i++) for (let j = 0; j < segW * 2; j++) b.quad(rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]);
}

/** Icosphere blob with per-vertex displacement + colouring (positions in local unit space, then mapped). */
export function blob(
  b: GeoBuilder,
  detail: number,
  shape: (dir: V3) => V3,
  color: (p: V3, dir: V3) => RGB,
  opts: { sway?: (p: V3) => Sway; pivot?: V3; extra?: (p: V3, dir: V3) => Extra } = {},
): void {
  const ico = unitIco(detail);
  const base = b.count;
  for (let i = 0; i < ico.pos.length; i += 3) {
    const dir: V3 = [ico.pos[i], ico.pos[i + 1], ico.pos[i + 2]];
    const p = shape(dir);
    b.v(p, color(p, dir), opts.sway ? opts.sway(p) : NO_SWAY, opts.pivot ?? [0, 0, 0], opts.extra ? opts.extra(p, dir) : DEFAULT_EXTRA);
  }
  for (let i = 0; i < ico.idx.length; i += 3) b.tri(base + ico.idx[i], base + ico.idx[i + 1], base + ico.idx[i + 2]);
}

const icoCache = new Map<number, { pos: Float32Array; idx: number[] }>();
function unitIco(detail: number): { pos: Float32Array; idx: number[] } {
  let c = icoCache.get(detail);
  if (!c) {
    const g = mergeVertices(new THREE.IcosahedronGeometry(1, detail).deleteAttribute('normal').deleteAttribute('uv'));
    const index = g.getIndex()!;
    c = { pos: Float32Array.from(g.getAttribute('position').array as ArrayLike<number>), idx: Array.from(index.array as ArrayLike<number>) };
    g.dispose();
    icoCache.set(detail, c);
  }
  return c;
}

/** Lathe (surface of revolution) around +Y from a profile of (radius, y) pairs. */
export function lathe(b: GeoBuilder, profile: [number, number][], segs: number, color: (t: number, a: number, p: V3) => RGB, extra?: Extra, wobble?: (a: number, t: number) => number): void {
  const rows: number[][] = [];
  profile.forEach(([r, y], i) => {
    const t = i / (profile.length - 1);
    const row: number[] = [];
    for (let k = 0; k <= segs; k++) {
      const a = (k / segs) * Math.PI * 2;
      const rr = r * (1 + (wobble ? wobble(a, t) : 0));
      const p: V3 = [Math.cos(a) * rr, y, -Math.sin(a) * rr];
      row.push(b.v(p, color(t, a, p), NO_SWAY, [0, 0, 0], extra ?? DEFAULT_EXTRA));
    }
    rows.push(row);
  });
  for (let i = 0; i < rows.length - 1; i++) for (let k = 0; k < segs; k++) b.quad(rows[i][k], rows[i][k + 1], rows[i + 1][k + 1], rows[i + 1][k]);
}

/** Fit geometry from index `from` into the box [-w/2,w/2]×[minY,h]×[-d/2,d/2] (only shrinks). */
export function fitInto(b: GeoBuilder, size: { w: number; d: number; h: number }, from = 0, minY = -Infinity, uniform = false): void {
  const { min, max } = b.bbox(from);
  const ex = Math.max(Math.abs(min[0]), Math.abs(max[0]), 1e-6);
  const ez = Math.max(Math.abs(min[2]), Math.abs(max[2]), 1e-6);
  let sx = Math.min(1, size.w / 2 / ex);
  let sz = Math.min(1, size.d / 2 / ez);
  let sy = Math.min(1, size.h / Math.max(1e-6, max[1]));
  if (uniform) sx = sy = sz = Math.min(sx, sy, sz);
  b.mapPositions(([x, y, z]) => [x * sx, Math.max(minY, y * sy), z * sz], from);
}

/** Overwrite sway weight (x) from height: 0 at y=y0, 1 at y=y1 (power curve). */
export function weightFromHeight(b: GeoBuilder, y0: number, y1: number, pow = 1, from = 0): void {
  for (let i = from; i < b.count; i++) {
    const y = b.pos[i * 3 + 1];
    const w = Math.max(0, Math.min(1, (y - y0) / Math.max(1e-5, y1 - y0)));
    b.sway[i * 4] = Math.pow(w, pow);
  }
}

// ───────────────────────────── shape-preserving containment ─────────────────────────────
// Generators must keep every vertex inside def.size (placement and colliders rely on it). Clamping vertices
// flattens tips into plates and walls, so instead whole branches/parts are scaled or moved to fit.

export type Inside = (p: V3) => boolean;

/**
 * The item's size box shrunk by `margin` (use the tube radius + cap so the surface, not just the path, fits).
 * `crown` (0..1) lowers the ceiling toward the sides (y ≤ h·(1 − crown·r²)) for a rounded bush silhouette.
 */
export function envelope(size: { w: number; d: number; h: number }, margin = 0, floor = -0.004, crown = 0): Inside {
  const hx = Math.max(size.w * 0.05, size.w / 2 - margin);
  const hz = Math.max(size.d * 0.05, size.d / 2 - margin);
  const top = Math.max(size.h * 0.1, size.h - margin);
  return (p) => {
    if (Math.abs(p[0]) > hx || Math.abs(p[2]) > hz || p[1] < floor) return false;
    const r2 = (p[0] / (size.w / 2)) ** 2 + (p[2] / (size.d / 2)) ** 2;
    return p[1] <= top * (1 - crown * Math.min(1, r2));
  };
}

/** Largest s ∈ [0,1] with anchor + s·(p − anchor) inside (bisection; the region must be convex around anchor). */
function reach(anchor: V3, p: V3, inside: Inside): number {
  if (inside(p)) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 14; i++) {
    const m = (lo + hi) / 2;
    if (inside(lerp3(anchor, p, m))) lo = m;
    else hi = m;
  }
  return lo;
}

/**
 * Scale a polyline about `pts[fixed]` (default: its root) by the largest factor ≤ 1 that keeps every point
 * after it inside — the branch keeps its shape and just grows shorter. Points before `fixed` (the stretch
 * leading to a perch/hitch target) are only nudged inside if they stray.
 */
export function fitPath(pts: V3[], inside: Inside, fixed = 0, clampPoint?: (p: V3) => V3): V3[] {
  if (pts.length < 2) return pts;
  const a = pts[fixed];
  let s = 1;
  for (let i = fixed + 1; i < pts.length; i++) s = Math.min(s, reach(a, pts[i], inside));
  return pts.map((p, i) => {
    if (i > fixed) return s < 1 ? lerp3(a, p, s) : p;
    if (i === fixed || inside(p) || !clampPoint) return p;
    return clampPoint(p);
  });
}

/** Clamp a single path control point into the (margin-shrunk) box — used only for interior path points. */
export function boxClamp(size: { w: number; d: number; h: number }, margin = 0, floor = -0.004): (p: V3) => V3 {
  const hx = Math.max(size.w * 0.05, size.w / 2 - margin);
  const hz = Math.max(size.d * 0.05, size.d / 2 - margin);
  const top = Math.max(size.h * 0.1, size.h - margin);
  return (p) => [Math.max(-hx, Math.min(hx, p[0])), Math.max(floor, Math.min(top, p[1])), Math.max(-hz, Math.min(hz, p[2]))];
}

/**
 * Fit a rigid part (vertices from `from`) into the size box: first slide it horizontally (and up, never below
 * `floor`) so it fits, and only if it is simply too big scale it uniformly about its base centre.
 */
export function containPart(b: GeoBuilder, size: { w: number; d: number; h: number }, from = 0, floor = -0.004): void {
  if (b.count <= from) return;
  let { min, max } = b.bbox(from);
  const lim: [number, number][] = [
    [-size.w / 2, size.w / 2],
    [floor, size.h],
    [-size.d / 2, size.d / 2],
  ];
  let s = 1;
  for (let k = 0; k < 3; k++) s = Math.min(s, (lim[k][1] - lim[k][0]) / Math.max(1e-9, max[k] - min[k]));
  if (s < 1) {
    const c: V3 = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
    b.mapPositions(([x, y, z]) => [c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s, c[2] + (z - c[2]) * s], from);
    ({ min, max } = b.bbox(from));
  }
  const shift: V3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    if (min[k] < lim[k][0]) shift[k] = lim[k][0] - min[k];
    else if (max[k] > lim[k][1]) shift[k] = lim[k][1] - max[k];
  }
  if (shift[0] || shift[1] || shift[2]) b.mapPositions(([x, y, z]) => [x + shift[0], y + shift[1], z + shift[2]], from);
}
