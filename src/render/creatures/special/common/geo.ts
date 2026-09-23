/**
 * Procedural skinned-geometry builder for the critterart lane.
 *
 * Everything is generated as smooth parametric grids (lofts, tubes, ellipsoids, sheets) with analytic-quality
 * normals from central differences over the grid (seam-free on wrapped rings, correct at poles). Each vertex carries
 * skin indices/weights (for a shared SkinnedMesh skeleton), a uv (u along the part, v around it) and an `aMask` vec4
 * the material shaders use to colour / deform parts (x = part id, y..w = part-specific scalars).
 *
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import { clamp, smoothstep } from './math';

export type V3 = [number, number, number];
/** [i0, i1, i2, i3, w0, w1, w2, w3] */
export type Skin = [number, number, number, number, number, number, number, number];
export type Mask = [number, number, number, number];

export const skin1 = (b: number): Skin => [b, 0, 0, 0, 1, 0, 0, 0];
export function skin2(b0: number, b1: number, t: number): Skin {
  const w = clamp(t);
  return [b0, b1, 0, 0, 1 - w, w, 0, 0];
}

export interface SkinInterval {
  bone: number;
  s0: number;
  s1: number;
}

/**
 * Smooth skinning along a sequence of contiguous parameter intervals (e.g. spine segments). Each interval belongs
 * fully to its bone except inside blend zones centred on the boundaries, where weights cross-fade smoothly.
 */
export function intervalSkin(s: number, iv: readonly SkinInterval[], blend = 0.5): Skin {
  const n = iv.length;
  let k = 0;
  if (s <= iv[0].s0) k = 0;
  else if (s >= iv[n - 1].s1) k = n - 1;
  else while (k < n - 1 && s > iv[k].s1) k++;
  const cur = iv[k];
  const len = cur.s1 - cur.s0;
  if (k > 0) {
    const prev = iv[k - 1];
    const h = blend * 0.5 * Math.min(len, prev.s1 - prev.s0);
    if (s < cur.s0 + h) {
      const t = smoothstep(cur.s0 - h, cur.s0 + h, s);
      return [prev.bone, cur.bone, 0, 0, 1 - t, t, 0, 0];
    }
  }
  if (k < n - 1) {
    const next = iv[k + 1];
    const h = blend * 0.5 * Math.min(len, next.s1 - next.s0);
    if (s > cur.s1 - h) {
      const t = smoothstep(cur.s1 - h, cur.s1 + h, s);
      return [cur.bone, next.bone, 0, 0, 1 - t, t, 0, 0];
    }
  }
  return skin1(cur.bone);
}

/** Mix two skins (weights blended, merged by bone, top-4 kept). */
export function mixSkin(a: Skin, b: Skin, t: number): Skin {
  const acc = new Map<number, number>();
  for (let k = 0; k < 4; k++) {
    if (a[4 + k] > 0) acc.set(a[k], (acc.get(a[k]) ?? 0) + a[4 + k] * (1 - t));
    if (b[4 + k] > 0) acc.set(b[k], (acc.get(b[k]) ?? 0) + b[4 + k] * t);
  }
  const arr = [...acc.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
  const out: Skin = [0, 0, 0, 0, 0, 0, 0, 0];
  let sum = 0;
  arr.forEach(([bi, w], i) => {
    out[i] = bi;
    out[4 + i] = w;
    sum += w;
  });
  for (let i = 0; i < 4; i++) out[4 + i] /= sum || 1;
  return out;
}

export interface Sample {
  x: number;
  y: number;
  z: number;
  /** Optional morph-target absolute position (defaults to the rest position). */
  mx?: number;
  my?: number;
  mz?: number;
  u: number;
  v: number;
  mask: Mask;
  skin: Skin;
  /** Optional per-vertex pivot/aux data (e.g. appendage base point for shader rotation). */
  aux?: Mask;
}

export interface GridOpts {
  nu: number;
  nv: number;
  /** v wraps around (closed rings). */
  wrapV?: boolean;
  /** Normal orientation: 'ring' = away from each ring's centroid (closed lofts), 'flip', or 'none'. */
  orient?: 'ring' | 'flip' | 'none';
  /** Material group for the quad starting at (i, j). */
  group?: number | ((i: number, j: number, a: Sample, b: Sample, c: Sample, d: Sample) => number);
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();

export class GeoBuilder {
  pos: number[] = [];
  nrm: number[] = [];
  uvs: number[] = [];
  masks: number[] = [];
  si: number[] = [];
  sw: number[] = [];
  mpos: number[] = [];
  mnrm: number[] = [];
  aux: number[] = [];
  hasMorph = false;
  groups: number[][] = [];

  get vertexCount(): number {
    return this.pos.length / 3;
  }

  vertex(p: V3, n: V3, u: number, v: number, mask: Mask, skin: Skin, mp?: V3, mn?: V3, aux?: Mask): number {
    const id = this.pos.length / 3;
    if (aux) this.aux.push(aux[0], aux[1], aux[2], aux[3]);
    else this.aux.push(0, 0, 0, 0);
    this.pos.push(p[0], p[1], p[2]);
    this.nrm.push(n[0], n[1], n[2]);
    this.uvs.push(u, v);
    this.masks.push(mask[0], mask[1], mask[2], mask[3]);
    let ws = skin[4] + skin[5] + skin[6] + skin[7];
    if (ws <= 0) ws = 1;
    this.si.push(skin[0], skin[1], skin[2], skin[3]);
    this.sw.push(skin[4] / ws, skin[5] / ws, skin[6] / ws, skin[7] / ws);
    if (mp) {
      this.hasMorph = true;
      this.mpos.push(mp[0] - p[0], mp[1] - p[1], mp[2] - p[2]);
      this.mnrm.push((mn ?? n)[0] - n[0], (mn ?? n)[1] - n[1], (mn ?? n)[2] - n[2]);
    } else {
      this.mpos.push(0, 0, 0);
      this.mnrm.push(0, 0, 0);
    }
    return id;
  }

  tri(a: number, b: number, c: number, group = 0): void {
    while (this.groups.length <= group) this.groups.push([]);
    this.groups[group].push(a, b, c);
  }

  /**
   * Parametric grid surface. `sample(i, j, out)` fills the sample at row i (0..nu-1), column j (0..nv-1).
   * Normals are central differences over the grid (wrapping in v when closed); degenerate rows (poles) get
   * normals pointing away from the neighbouring ring's centroid.
   */
  grid(o: GridOpts, sample: (i: number, j: number, out: Sample) => void): void {
    const { nu, nv } = o;
    const wrap = !!o.wrapV;
    const S: Sample[] = new Array(nu * nv);
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const s: Sample = { x: 0, y: 0, z: 0, u: i / (nu - 1), v: j / (wrap ? nv : nv - 1), mask: [0, 0, 0, 0], skin: skin1(0) };
        sample(i, j, s);
        S[i * nv + j] = s;
      }
    const hasMorph = S.some((s) => s.mx !== undefined);
    const P = (i: number, j: number, morph: boolean, out: THREE.Vector3) => {
      const s = S[i * nv + j];
      return morph && s.mx !== undefined ? out.set(s.mx!, s.my!, s.mz!) : out.set(s.x, s.y, s.z);
    };
    const centroid = (i: number, morph: boolean, out: THREE.Vector3) => {
      out.set(0, 0, 0);
      const t = new THREE.Vector3();
      for (let j = 0; j < nv; j++) out.add(P(i, j, morph, t));
      return out.multiplyScalar(1 / nv);
    };
    const ringSize = (i: number, morph: boolean) => {
      const c = centroid(i, morph, new THREE.Vector3());
      let m = 0;
      const t = new THREE.Vector3();
      for (let j = 0; j < nv; j++) m = Math.max(m, P(i, j, morph, t).distanceTo(c));
      return m;
    };
    const normals = (morph: boolean): Float32Array => {
      const N = new Float32Array(nu * nv * 3);
      const degenerate = new Array(nu).fill(false).map((_, i) => ringSize(i, morph) < 1e-7);
      const cen = new Array(nu).fill(0).map((_, i) => centroid(i, morph, new THREE.Vector3()));
      for (let i = 0; i < nu; i++) {
        for (let j = 0; j < nv; j++) {
          const i0 = Math.max(0, i - 1);
          const i1 = Math.min(nu - 1, i + 1);
          const j0 = wrap ? (j - 1 + nv) % nv : Math.max(0, j - 1);
          const j1 = wrap ? (j + 1) % nv : Math.min(nv - 1, j + 1);
          P(i1, j, morph, _a).sub(P(i0, j, morph, _b));
          P(i, j1, morph, _b).sub(P(i, j0, morph, _c));
          _n.crossVectors(_a, _b);
          if (degenerate[i] || _b.lengthSq() < 1e-14) {
            const nb = i === 0 ? 1 : i === nu - 1 ? nu - 2 : i;
            P(i, j, morph, _n).sub(cen[nb]);
            if (_n.lengthSq() < 1e-14) _n.set(0, 1, 0);
          } else if (_n.lengthSq() < 1e-16) {
            // du degenerate: use ring-outward direction
            P(i, j, morph, _n).sub(cen[i]);
          } else if (o.orient === 'ring') {
            P(i, j, morph, _c).sub(cen[i]);
            if (_n.dot(_c) < 0) _n.negate();
          }
          if (o.orient === 'flip') _n.negate();
          // never emit a zero / non-finite normal: normalize() in the shader would give NaN, which bloom smears
          // across the whole frame
          if (!(_n.lengthSq() > 1e-20) || !Number.isFinite(_n.x + _n.y + _n.z)) _n.set(0, 1, 0);
          _n.normalize();
          N[(i * nv + j) * 3] = _n.x;
          N[(i * nv + j) * 3 + 1] = _n.y;
          N[(i * nv + j) * 3 + 2] = _n.z;
        }
      }
      return N;
    };
    const N0 = normals(false);
    const N1 = hasMorph ? normals(true) : null;
    const cols = wrap ? nv + 1 : nv;
    const base = this.vertexCount;
    for (let i = 0; i < nu; i++) {
      for (let jj = 0; jj < cols; jj++) {
        const j = jj % nv;
        const s = S[i * nv + j];
        const k = (i * nv + j) * 3;
        const n: V3 = [N0[k], N0[k + 1], N0[k + 2]];
        const u = s.u;
        const v = wrap && jj === nv ? 1 : s.v;
        if (hasMorph) {
          const mp: V3 = s.mx !== undefined ? [s.mx!, s.my!, s.mz!] : [s.x, s.y, s.z];
          this.vertex([s.x, s.y, s.z], n, u, v, s.mask, s.skin, mp, [N1![k], N1![k + 1], N1![k + 2]], s.aux);
        } else this.vertex([s.x, s.y, s.z], n, u, v, s.mask, s.skin, undefined, undefined, s.aux);
      }
    }
    const nrmAt = (vi: number, out: THREE.Vector3) => out.set(this.nrm[vi * 3], this.nrm[vi * 3 + 1], this.nrm[vi * 3 + 2]);
    const posAt = (vi: number, out: THREE.Vector3) => out.set(this.pos[vi * 3], this.pos[vi * 3 + 1], this.pos[vi * 3 + 2]);
    const fa = new THREE.Vector3();
    const fb = new THREE.Vector3();
    const fc = new THREE.Vector3();
    const nsum = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const emitTri = (a: number, b: number, c: number, g: number) => {
      posAt(a, fa);
      posAt(b, fb);
      posAt(c, fc);
      fb.sub(fa);
      fc.sub(fa);
      fa.crossVectors(fb, fc);
      const area = fa.lengthSq();
      if (area < 1e-20) return;
      nsum.copy(nrmAt(a, tmp)).add(nrmAt(b, tmp)).add(nrmAt(c, tmp));
      if (fa.dot(nsum) >= 0) this.tri(a, b, c, g);
      else this.tri(a, c, b, g);
    };
    for (let i = 0; i < nu - 1; i++) {
      for (let jj = 0; jj < cols - 1; jj++) {
        const a = base + i * cols + jj;
        const b = base + (i + 1) * cols + jj;
        const c = base + (i + 1) * cols + jj + 1;
        const d = base + i * cols + jj + 1;
        let g = 0;
        if (typeof o.group === 'function') {
          const j = jj % nv;
          const j1 = (jj + 1) % nv;
          g = o.group(i, jj, S[i * nv + j], S[(i + 1) * nv + j], S[(i + 1) * nv + j1], S[i * nv + j1]);
        } else if (typeof o.group === 'number') g = o.group;
        emitTri(a, b, c, g);
        emitTri(a, c, d, g);
      }
    }
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setAttribute('aMask', new THREE.Float32BufferAttribute(this.masks, 4));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setAttribute('aAux', new THREE.Float32BufferAttribute(this.aux, 4));
    if (this.hasMorph) {
      g.morphAttributes.position = [new THREE.Float32BufferAttribute(this.mpos, 3)];
      g.morphAttributes.normal = [new THREE.Float32BufferAttribute(this.mnrm, 3)];
      g.morphTargetsRelative = true;
    }
    const idx: number[] = [];
    this.groups.forEach((list, gi) => {
      if (!list.length) return;
      g.addGroup(idx.length, list.length, gi);
      for (let k = 0; k < list.length; k++) idx.push(list[k]);
    });
    g.setIndex(idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// ───────────────────────────── Frames & curves ─────────────────────────────

export interface Frame {
  p: THREE.Vector3;
  t: THREE.Vector3;
  n: THREE.Vector3;
  b: THREE.Vector3;
}

/**
 * Parallel-transport frames along a sampled path. `up` seeds the first normal (projected perpendicular to the tangent).
 */
export function transportFrames(pts: THREE.Vector3[], up: THREE.Vector3 = new THREE.Vector3(0, 1, 0)): Frame[] {
  const n = pts.length;
  const frames: Frame[] = [];
  let prevN = up.clone();
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const t = b.clone().sub(a);
    if (t.lengthSq() < 1e-14) t.copy(frames[i - 1]?.t ?? new THREE.Vector3(1, 0, 0));
    t.normalize();
    const nn = prevN.clone().sub(t.clone().multiplyScalar(prevN.dot(t)));
    if (nn.lengthSq() < 1e-10) {
      nn.set(0, 0, 1).sub(t.clone().multiplyScalar(t.z));
      if (nn.lengthSq() < 1e-10) nn.set(1, 0, 0);
    }
    nn.normalize();
    const bb = new THREE.Vector3().crossVectors(t, nn).normalize();
    frames.push({ p: pts[i].clone(), t, n: nn, b: bb });
    prevN = nn;
  }
  return frames;
}

/** Sample a Catmull-Rom path through control points into `count` points evenly spaced by arc length. */
export function resamplePath(ctrl: V3[], count: number, tension = 0.5): THREE.Vector3[] {
  const curve = new THREE.CatmullRomCurve3(
    ctrl.map((c) => new THREE.Vector3(c[0], c[1], c[2])),
    false,
    'centripetal',
    tension,
  );
  return curve.getSpacedPoints(count - 1);
}

// ───────────────────────────── Primitive-ish helpers (all smooth) ─────────────────────────────

export interface TubeOpts {
  /** Path points (evenly spaced), at least 2. */
  path: THREE.Vector3[];
  /** Radius at path fraction t (0..1) and ring angle a (radians; 0 = frame normal). */
  radius: (t: number, a: number) => number;
  /** Optional cross-section scale along frame normal/binormal (ellipse). */
  aspect?: (t: number) => [number, number];
  nv: number;
  /** Rounded caps: fraction of path length used for the dome at each end (0 = open/flat). */
  capStart?: number;
  capEnd?: number;
  up?: THREE.Vector3;
  skin: (t: number) => Skin;
  mask: (t: number, a: number) => Mask;
  group?: number;
  /** Extra rows per cap for a smooth dome. */
  capRows?: number;
  aux?: Mask;
}

/** Smooth tube with optional hemispherical caps (poles), parallel-transport frames. */
export function tube(g: GeoBuilder, o: TubeOpts): void {
  const frames = transportFrames(o.path, o.up);
  const L = o.path.length;
  const capRows = o.capRows ?? 6;
  // Build parameter list: dome rows at ends + path rows.
  interface Row {
    t: number; // path fraction
    k: number; // radius factor
    ext: number; // extension beyond the end along tangent (for dome), in radius units
  }
  const rows: Row[] = [];
  const cs = o.capStart ?? 0;
  const ce = o.capEnd ?? 0;
  if (cs > 0) {
    for (let r = 0; r < capRows; r++) {
      const ang = (r / capRows) * (Math.PI / 2); // 0 = pole
      rows.push({ t: 0, k: Math.sin(ang), ext: -Math.cos(ang) });
    }
  }
  for (let i = 0; i < L; i++) rows.push({ t: i / (L - 1), k: 1, ext: 0 });
  if (ce > 0) {
    for (let r = capRows - 1; r >= 0; r--) {
      const ang = (r / capRows) * (Math.PI / 2);
      rows.push({ t: 1, k: Math.sin(ang), ext: Math.cos(ang) });
    }
  }
  const tmp = new THREE.Vector3();
  const frameAt = (t: number): Frame => frames[Math.round(t * (L - 1))];
  g.grid({ nu: rows.length, nv: o.nv, wrapV: true, orient: 'ring', group: o.group }, (i, j, s) => {
    const row = rows[i];
    const f = frameAt(row.t);
    const a = (j / o.nv) * Math.PI * 2;
    const r0 = o.radius(row.t, a);
    const asp = o.aspect ? o.aspect(row.t) : ([1, 1] as [number, number]);
    const r = r0 * row.k;
    const capLen = row.ext < 0 ? cs : ce;
    tmp
      .copy(f.p)
      .addScaledVector(f.n, Math.cos(a) * r * asp[0])
      .addScaledVector(f.b, Math.sin(a) * r * asp[1])
      .addScaledVector(f.t, row.ext * r0 * (capLen > 0 ? 1 : 0) * Math.max(asp[0], asp[1]) * 0.9);
    s.x = tmp.x;
    s.y = tmp.y;
    s.z = tmp.z;
    s.u = row.t;
    s.v = j / o.nv;
    s.mask = o.mask(row.t, a);
    s.skin = o.skin(row.t);
    if (o.aux) s.aux = o.aux;
  });
}

export interface EllipsoidOpts {
  center: V3;
  radii: V3;
  /** Optional rotation applied to the ellipsoid (local → mesh). */
  quat?: THREE.Quaternion;
  nu: number;
  nv: number;
  skin: Skin;
  mask: Mask | ((lat: number, lon: number, p: THREE.Vector3) => Mask);
  group?: number;
  /** Deform the unit-sphere point before scaling (e.g. flatten one side). */
  shape?: (p: THREE.Vector3, lat: number, lon: number) => void;
  aux?: Mask;
}

/** Smooth ellipsoid (lat/long grid). Local +Z is the "front" pole direction before rotation. */
export function ellipsoid(g: GeoBuilder, o: EllipsoidOpts): void {
  const q = o.quat ?? new THREE.Quaternion();
  const p = new THREE.Vector3();
  g.grid({ nu: o.nu, nv: o.nv, wrapV: true, orient: 'ring', group: o.group }, (i, j, s) => {
    const lat = (i / (o.nu - 1)) * Math.PI; // 0 at +Z pole
    const lon = (j / o.nv) * Math.PI * 2;
    p.set(Math.sin(lat) * Math.cos(lon), Math.sin(lat) * Math.sin(lon), Math.cos(lat));
    const unit = p.clone();
    o.shape?.(p, lat, lon);
    p.set(p.x * o.radii[0], p.y * o.radii[1], p.z * o.radii[2]).applyQuaternion(q);
    s.x = p.x + o.center[0];
    s.y = p.y + o.center[1];
    s.z = p.z + o.center[2];
    s.u = i / (o.nu - 1);
    s.v = j / o.nv;
    s.mask = typeof o.mask === 'function' ? o.mask(lat, lon, unit) : o.mask;
    s.skin = o.skin;
    if (o.aux) s.aux = o.aux;
  });
}

/** A single-sided parametric sheet (render double-sided). fn(a, b) with a,b in 0..1. */
export function sheet(
  g: GeoBuilder,
  nu: number,
  nv: number,
  fn: (a: number, b: number, s: Sample) => void,
  group = 0,
): void {
  g.grid({ nu, nv, wrapV: false, orient: 'none', group }, (i, j, s) => fn(i / (nu - 1), j / (nv - 1), s));
}
