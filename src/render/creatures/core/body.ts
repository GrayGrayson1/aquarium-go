/**
 * Body loft: turns a BodySpec (profile curves + head shaping) into a smooth, UV-mapped BufferGeometry.
 * OWNER: lane "fishart".
 *
 * The surface is a parametric function S(t, θ):
 *   t ∈ [0,1] from snout tip to the end of the caudal peduncle, θ ∈ [0, 2π) around the body (0 = dorsal midline,
 *   π/2 = +Z flank). Each cross-section is a pair of superellipses (upper/lower halves) around the body axis.
 * Normals are analytic (central differences of S), so there are no seams or faceting even at low ring counts.
 *
 * Extra vertex attributes consumed by the fish shader (see shaders.ts):
 *   aBody = (t, yn, θ/2π, kind)   yn: −1 belly edge … +1 back; kind: 0 body, 1 appendage, 2 spine
 *   aAxis = (axisY, 0)            centreline height, so the shader can inflate (puff) / deepen the body about it
 */
import * as THREE from 'three';
import type { BodySpec } from './plan';
import { clamp01, smoothstep, bump, TAU, type Curve } from './math';

const asCurve = (v: number | Curve | undefined, def: number): Curve =>
  typeof v === 'function' ? v : () => (v === undefined ? def : v);

/** sign(x)·|x|^p */
const spow = (x: number, p: number) => Math.sign(x) * Math.pow(Math.abs(x), p);

export interface SurfacePoint {
  x: number;
  y: number;
  z: number;
  yn: number;
}

/**
 * Evaluates the body surface and derived quantities. Fin, eye and appendage builders use this so everything sits
 * exactly on the skin.
 */
export class BodySampler {
  readonly spec: BodySpec;
  private expTop: Curve;
  private expBottom: Curve;
  private expSide: Curve | null;
  private axisC: Curve;
  readonly noseX: number;
  readonly length: number;
  readonly tailX: number;

  constructor(spec: BodySpec) {
    this.spec = spec;
    this.expTop = asCurve(spec.expTop, 2);
    this.expBottom = asCurve(spec.expBottom, 2);
    this.expSide = spec.expSide === undefined ? null : asCurve(spec.expSide, 2);
    this.axisC = asCurve(spec.axis, 0);
    this.noseX = spec.noseX;
    this.length = spec.length;
    this.tailX = spec.noseX - spec.length;
  }

  x(t: number): number {
    return this.noseX - t * this.length;
  }

  /** t for an x position (may be <0 or >1 outside the body). */
  tAt(x: number): number {
    return (this.noseX - x) / this.length;
  }

  /** Rounded snout / tail caps (circular profile) multiply all radii. */
  cap(t: number): number {
    const nr = this.spec.noseRound ?? 0.06;
    const tr = this.spec.tailRound ?? 0.02;
    let k = 1;
    if (t < nr) {
      const u = clamp01(t / nr);
      k *= Math.sqrt(Math.max(0, u * (2 - u)));
    }
    if (t > 1 - tr) {
      const u = clamp01((1 - t) / tr);
      k *= Math.sqrt(Math.max(0, u * (2 - u))) * 0.6 + 0.4 * u;
    }
    return k;
  }

  axis(t: number): number {
    return this.axisC(clamp01(t));
  }
  dorsal(t: number): number {
    return Math.max(1e-4, this.spec.dorsal(clamp01(t)) * this.cap(t));
  }
  ventral(t: number): number {
    return Math.max(1e-4, this.spec.ventral(clamp01(t)) * this.cap(t));
  }
  width(t: number): number {
    return Math.max(1e-4, this.spec.width(clamp01(t)) * this.cap(t));
  }
  topY(t: number): number {
    return this.axis(t) + this.dorsal(t);
  }
  bottomY(t: number): number {
    return this.axis(t) - this.ventral(t);
  }

  /** Raw (unshaped) superellipse point for (t, θ). */
  private raw(t: number, th: number, out: SurfacePoint): SurfacePoint {
    const c = Math.cos(th);
    const s = Math.sin(th);
    const upper = c >= 0;
    const e = upper ? this.expTop(t) : this.expBottom(t);
    const es = this.expSide ? this.expSide(t) : e;
    const h = upper ? this.dorsal(t) : this.ventral(t);
    const yr = spow(c, 2 / e);
    out.x = this.x(t);
    out.y = this.axis(t) + h * yr;
    out.z = this.width(t) * spow(s, 2 / es);
    out.yn = yr;
    return out;
  }

  /** Full surface point including head shaping (mouth groove, operculum, cheek, wen, keel). */
  point(t: number, th: number, out: SurfacePoint): SurfacePoint {
    this.raw(t, th, out);
    const sp = this.spec;
    const yn = out.yn;
    const ax = this.axis(t);
    let dy = out.y - ax;
    let z = out.z;
    // Mouth groove: pinch the lips along the gape line near the snout tip.
    const m = sp.mouth;
    const g = sp.mouth.groove ?? 0.5;
    if (t < m.t * 1.4 && g > 0) {
      const along = 1 - smoothstep(m.t * 0.6, m.t * 1.4, t);
      const line = bump(yn, m.yn, 0.16);
      const k = 1 - g * 0.22 * along * line;
      z *= k;
      dy *= 1 - g * 0.08 * along * line;
    }
    // Subterminal / sucker mouth: flatten the underside of the snout.
    if ((m.kind === 'sucker' || m.kind === 'subterminal') && yn < 0) {
      const f = (1 - smoothstep(0.02, 0.16, t)) * smoothstep(0, -0.8, yn);
      dy *= 1 - 0.3 * f;
    }
    // Operculum: gill plate slightly raised in front of its free edge, tiny groove on the edge itself.
    const op = sp.operculum;
    if (op.strength > 0) {
      const edgeT = op.t + 0.025 * (1 - yn * yn);
      const plate = smoothstep(op.t - 0.12, edgeT - 0.01, t) * (1 - smoothstep(edgeT - 0.008, edgeT + 0.004, t));
      const groove = bump(t, edgeT + 0.006, 0.012);
      const v = (1 - yn * yn) * (0.012 * plate - 0.008 * groove) * op.strength;
      z *= 1 + v * 1.6;
      dy *= 1 + v * 0.4;
    }
    // Cheek fullness below/behind the eye.
    if (sp.cheek) {
      const k = bump(t, 0.16, 0.12) * bump(yn, -0.25, 0.7) * sp.cheek * 0.08;
      z *= 1 + k;
    }
    // Wen: lumpy "raspberry" hood on the top of the head (oranda / ranchu / lionhead).
    if (sp.wen && sp.wen > 0 && yn > -0.35) {
      const region = (1 - smoothstep(0.1, 0.34, t)) * smoothstep(-0.35, 0.3, yn) * smoothstep(0.0, 0.05, t);
      const n =
        Math.sin(t * 90 + yn * 14) * Math.sin(yn * 40 + t * 30 + th * 9) * 0.5 +
        Math.sin(t * 173 + th * 41) * Math.sin(th * 57 - t * 61) * 0.35;
      const lift = sp.wen * region * (0.055 + 0.016 * n);
      const len = Math.hypot(dy, z) || 1;
      dy += (dy / len) * lift;
      z += (z / len) * lift;
    }
    // Ventral keel (sharp belly edge on some compressed fish).
    if (sp.keel && yn < -0.5) {
      z *= 1 - sp.keel * 0.5 * smoothstep(-0.5, -1, yn);
    }
    out.y = ax + dy;
    out.z = z;
    return out;
  }

  /** Point on the flank at relative height yn (−1..1) on side ±1 — handy for eye / pectoral placement. */
  flank(t: number, yn: number, side: 1 | -1, out: SurfacePoint): SurfacePoint {
    const c = Math.max(-1, Math.min(1, yn));
    // invert yr = spow(cos θ, 2/e): cos θ = spow(yr, e/2)
    const e = c >= 0 ? this.expTop(t) : this.expBottom(t);
    const cth = spow(c, e / 2);
    const th = Math.acos(Math.max(-1, Math.min(1, cth)));
    return this.point(t, side > 0 ? th : TAU - th, out);
  }

  /** Outward surface normal at (t, θ). */
  normal(t: number, th: number, out: THREE.Vector3): THREE.Vector3 {
    const et = 0.0025;
    const eh = 0.004;
    const tt = Math.min(0.9985, Math.max(0.0015, t));
    const a = this.point(tt + et, th, { x: 0, y: 0, z: 0, yn: 0 });
    const b = this.point(tt - et, th, { x: 0, y: 0, z: 0, yn: 0 });
    const c = this.point(tt, th + eh, { x: 0, y: 0, z: 0, yn: 0 });
    const d = this.point(tt, th - eh, { x: 0, y: 0, z: 0, yn: 0 });
    const dtx = a.x - b.x,
      dty = a.y - b.y,
      dtz = a.z - b.z;
    const dhx = c.x - d.x,
      dhy = c.y - d.y,
      dhz = c.z - d.z;
    // outward = dT × dθ
    out.set(dty * dhz - dtz * dhy, dtz * dhx - dtx * dhz, dtx * dhy - dty * dhx);
    const l = out.length();
    if (l < 1e-9) out.set(t < 0.5 ? 1 : -1, 0, 0);
    else out.multiplyScalar(1 / l);
    return out;
  }

  flankTheta(t: number, yn: number, side: 1 | -1): number {
    const c = Math.max(-1, Math.min(1, yn));
    const e = c >= 0 ? this.expTop(t) : this.expBottom(t);
    const th = Math.acos(Math.max(-1, Math.min(1, spow(c, e / 2))));
    return side > 0 ? th : TAU - th;
  }

  /** Approximate cross-section perimeter at t (for isotropic scale mapping). */
  perimeter(t: number): number {
    const a = (this.dorsal(t) + this.ventral(t)) / 2;
    const b = this.width(t);
    return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  }
}

export interface BodyGeometryOptions {
  rings: number;
  segments: number;
}

/** Cosine spacing packs rings densely at the snout and the peduncle where curvature is highest. */
function ringT(i: number, n: number): number {
  const s = i / (n - 1);
  const c = 0.5 - 0.5 * Math.cos(Math.PI * s);
  return 0.6 * c + 0.4 * s;
}

export function buildBodyGeometry(sampler: BodySampler, opt: BodyGeometryOptions): THREE.BufferGeometry {
  const R = Math.max(6, opt.rings);
  const S = Math.max(6, opt.segments);
  const vcount = R * (S + 1);
  const pos = new Float32Array(vcount * 3);
  const nrm = new Float32Array(vcount * 3);
  const uv = new Float32Array(vcount * 2);
  const body = new Float32Array(vcount * 4);
  const axis = new Float32Array(vcount * 2);
  const p: SurfacePoint = { x: 0, y: 0, z: 0, yn: 0 };
  const n = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < R; i++) {
    const t = ringT(i, R);
    const ax = sampler.axis(t);
    for (let j = 0; j <= S; j++) {
      const th = (j / S) * TAU;
      sampler.point(t, th, p);
      sampler.normal(t, th, n);
      if (i === 0) n.set(1, 0, 0).lerp(sampler.normal(0.004, th, new THREE.Vector3()), 0.35).normalize();
      if (i === R - 1) n.set(-1, 0, 0).lerp(sampler.normal(0.996, th, new THREE.Vector3()), 0.35).normalize();
      pos[k * 3] = p.x;
      pos[k * 3 + 1] = p.y;
      pos[k * 3 + 2] = p.z;
      nrm[k * 3] = n.x;
      nrm[k * 3 + 1] = n.y;
      nrm[k * 3 + 2] = n.z;
      uv[k * 2] = t;
      uv[k * 2 + 1] = j / S;
      body[k * 4] = t;
      body[k * 4 + 1] = Math.cos(th) >= 0 ? Math.pow(Math.max(0, Math.cos(th)), 1) : -Math.pow(Math.max(0, -Math.cos(th)), 1);
      body[k * 4 + 2] = j / S;
      body[k * 4 + 3] = 0;
      axis[k * 2] = ax;
      axis[k * 2 + 1] = sampler.width(t);
      k++;
    }
  }
  // Store yn as the real normalised height (after shaping) for pattern work.
  for (let v = 0; v < vcount; v++) {
    const t = body[v * 4];
    const y = pos[v * 3 + 1];
    const ax = axis[v * 2];
    const d = y >= ax ? sampler.dorsal(t) : sampler.ventral(t);
    body[v * 4 + 1] = Math.max(-1.2, Math.min(1.2, (y - ax) / Math.max(1e-4, d)));
  }
  const idx: number[] = [];
  for (let i = 0; i < R - 1; i++) {
    for (let j = 0; j < S; j++) {
      const a = i * (S + 1) + j;
      const b = (i + 1) * (S + 1) + j;
      const c = (i + 1) * (S + 1) + j + 1;
      const d = i * (S + 1) + j + 1;
      idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aBody', new THREE.BufferAttribute(body, 4));
  g.setAttribute('aAxis', new THREE.BufferAttribute(axis, 2));
  g.setIndex(idx);
  return g;
}
