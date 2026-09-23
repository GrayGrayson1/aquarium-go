/**
 * Geometry kit for facility rooms: shape makers + a static batcher that merges every piece sharing a material into
 * one mesh (keeps draw calls low). OWNER: lane "facility".
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type Vec3 = [number, number, number];

/** Normalise attributes so geometries can be merged: non-indexed, position + normal + uv only. */
function normalise(g: THREE.BufferGeometry): THREE.BufferGeometry {
  let out = g.index ? g.toNonIndexed() : g.clone();
  for (const name of Object.keys(out.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') out.deleteAttribute(name);
  }
  if (!out.getAttribute('normal')) out.computeVertexNormals();
  if (!out.getAttribute('uv')) {
    const n = out.getAttribute('position').count;
    out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  out.morphAttributes = {};
  if (out === g) out = g.clone();
  return out;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export class Batch {
  private parts = new Map<string, THREE.BufferGeometry[]>();

  /** Add a geometry (consumed) under a material key with a transform. */
  add(key: string, geom: THREE.BufferGeometry, pos: Vec3 = [0, 0, 0], rot: Vec3 = [0, 0, 0], scale: Vec3 | number = 1): this {
    const g = normalise(geom);
    geom.dispose();
    _e.set(rot[0], rot[1], rot[2]);
    _q.setFromEuler(_e);
    if (typeof scale === 'number') _s.set(scale, scale, scale);
    else _s.set(scale[0], scale[1], scale[2]);
    _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, _s);
    g.applyMatrix4(_m);
    const list = this.parts.get(key) ?? [];
    list.push(g);
    this.parts.set(key, list);
    return this;
  }

  /** Add with an explicit matrix. */
  addMatrix(key: string, geom: THREE.BufferGeometry, m: THREE.Matrix4): this {
    const g = normalise(geom);
    geom.dispose();
    g.applyMatrix4(m);
    const list = this.parts.get(key) ?? [];
    list.push(g);
    this.parts.set(key, list);
    return this;
  }

  /** Merge into one geometry per material key. */
  build(): Map<string, THREE.BufferGeometry> {
    const out = new Map<string, THREE.BufferGeometry>();
    for (const [key, list] of this.parts) {
      if (!list.length) continue;
      const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (merged) {
        merged.computeBoundingSphere();
        out.set(key, merged);
      }
      if (list.length > 1) for (const g of list) g.dispose();
    }
    this.parts.clear();
    return out;
  }
}

// ───────────────────────────── shapes ─────────────────────────────

export function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d);
}

/** Rounded box; radius clamps to the smallest half extent. */
export function rbox(w: number, h: number, d: number, r = 0.01, seg = 2): THREE.BufferGeometry {
  const rr = Math.min(r, Math.min(w, h, d) * 0.49);
  if (rr <= 0.0005) return new THREE.BoxGeometry(w, h, d);
  return new RoundedBoxGeometry(w, h, d, seg, rr);
}

export function cyl(rTop: number, rBot: number, h: number, seg = 16, open = false): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
}

export function sphere(r: number, ws = 12, hs = 8, thetaStart = 0, thetaLength = Math.PI): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, thetaStart, thetaLength);
}

/** Lathe from [radius, y] pairs (bottom → top). */
export function lathe(profile: [number, number][], seg = 24): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)),
    seg,
  );
}

/** Tube along a Catmull-Rom curve. */
export function tube(points: Vec3[], radius: number, seg = 12, radial = 5): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, seg, radius, radial, false);
}

/** Extruded rounded rectangle slab (table tops, plinths). */
export function roundedSlab(w: number, d: number, h: number, r: number, bevel = 0.004): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  const rr = Math.min(r, w / 2, d / 2);
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + d - rr);
  s.quadraticCurveTo(x + w, y + d, x + w - rr, y + d);
  s.lineTo(x + rr, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, h - bevel * 2), bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
}

/** A leaf blade: tapered, gently cupped and arched plane (for procedural plants). */
export function leaf(length: number, width: number, opts: { arch?: number; cup?: number; seg?: number; notch?: boolean } = {}): THREE.BufferGeometry {
  const seg = opts.seg ?? 8;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  const pts: [number, number][] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const wv = Math.sin(Math.PI * Math.pow(t, 0.8)) * width * 0.5 * (1 - t * 0.15);
    pts.push([wv, t * length]);
  }
  for (const [x, y] of pts) shape.lineTo(x, y);
  for (let i = pts.length - 2; i >= 0; i--) shape.lineTo(-pts[i][0], pts[i][1]);
  const g = new THREE.ShapeGeometry(shape, 2);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const arch = opts.arch ?? 0.25;
  const cup = opts.cup ?? 0.25;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = y / length;
    const z = -Math.pow(t, 2) * arch * length + (Math.abs(x) / Math.max(1e-4, width)) * cup * width;
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Wall with rectangular openings (doors/windows). Wall lies along +x, height +y, thickness along z (centred). */
export function wallWithOpenings(length: number, height: number, thickness: number, openings: { x0: number; x1: number; y0: number; y1: number }[]): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const xs = new Set<number>([-length / 2, length / 2]);
  for (const o of openings) {
    xs.add(Math.max(-length / 2, Math.min(length / 2, o.x0)));
    xs.add(Math.max(-length / 2, Math.min(length / 2, o.x1)));
  }
  const cuts = [...xs].sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i];
    const b = cuts[i + 1];
    if (b - a < 1e-4) continue;
    const mid = (a + b) / 2;
    // vertical intervals blocked by openings covering this column
    const blocked = openings.filter((o) => o.x0 <= mid && o.x1 >= mid).map((o) => [o.y0, o.y1] as [number, number]).sort((p, q) => p[0] - q[0]);
    let y = 0;
    const spans: [number, number][] = [];
    for (const [y0, y1] of blocked) {
      if (y0 > y) spans.push([y, y0]);
      y = Math.max(y, y1);
    }
    if (y < height) spans.push([y, height]);
    for (const [y0, y1] of spans) {
      if (y1 - y0 < 1e-4) continue;
      const g = new THREE.BoxGeometry(b - a, y1 - y0, thickness);
      // world-scale UVs (1 unit = 1 m) so textures tile consistently
      const uv = g.getAttribute('uv') as THREE.BufferAttribute;
      const pos = g.getAttribute('position') as THREE.BufferAttribute;
      const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
      for (let k = 0; k < uv.count; k++) {
        const px = pos.getX(k) + mid;
        const py = pos.getY(k) + (y0 + y1) / 2;
        const pz = pos.getZ(k);
        const nx = Math.abs(nrm.getX(k));
        const ny = Math.abs(nrm.getY(k));
        if (ny > 0.5) uv.setXY(k, px, pz);
        else if (nx > 0.5) uv.setXY(k, pz, py);
        else uv.setXY(k, px, py);
      }
      g.translate(mid, (y0 + y1) / 2, 0);
      out.push(g);
    }
  }
  return out;
}

/** Plane with world-scale UVs (u across width, v across depth), lying flat on y = 0. */
export function floorPlane(w: number, d: number, uvScale = 1): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, d, 1, 1);
  g.rotateX(-Math.PI / 2);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) * uvScale, -pos.getZ(i) * uvScale);
  return g;
}

/** Disable raycasting on an object tree (decor never swallows pointer events). */
export function noPick(o: THREE.Object3D | null): void {
  if (!o) return;
  o.traverse((c) => {
    c.raycast = () => {};
    c.userData.noPick = true;
  });
}
