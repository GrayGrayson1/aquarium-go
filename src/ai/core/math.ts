/**
 * Small allocation-free math helpers for the creature AI. OWNER: lane "behavior".
 */
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

export const TAU = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0 || 1e-9));
  return t * t * (3 - 2 * t);
};
/** Frame-rate independent exponential approach of `a` toward `b` with rate `k` (1/s). */
export const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
/** Move `a` toward `b` by at most `maxStep`. */
export const approach = (a: number, b: number, maxStep: number) => (a < b ? Math.min(b, a + maxStep) : Math.max(b, a - maxStep));
export const wrapAngle = (a: number) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};
export const finite = (v: number, fallback = 0) => (Number.isFinite(v) ? v : fallback);

/** FNV-1a string hash → uint32. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stateful mulberry32 step on an object holding `rs` (no closures, no allocation). */
export interface HasRng {
  rs: number;
}
export function rnd(o: HasRng): number {
  o.rs = (o.rs + 0x6d2b79f5) >>> 0;
  let t = o.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rrange = (o: HasRng, a: number, b: number) => a + (b - a) * rnd(o);
export const rchance = (o: HasRng, p: number) => rnd(o) < p;
/** Log-normal-ish duration: median `m`, spread `s` (0.3–0.6 is organic). */
export function rdur(o: HasRng, m: number, s = 0.45): number {
  const g = (rnd(o) + rnd(o) + rnd(o) - 1.5) * 1.414; // ~N(0,0.7)
  return m * Math.exp(g * s * 1.4);
}

const noiseRng: HasRng = { rs: 0x5eed1234 };
/** Shared smooth 3D simplex noise (-1..1), deterministic. */
export const noise3 = createNoise3D(() => rnd(noiseRng));

/** Scratch vectors (module-level pool). Callers must not hold on to them across calls. */
export const V = Array.from({ length: 16 }, () => new THREE.Vector3());

/** Rotate unit vector `v` toward unit vector `target` by at most `maxAngle` radians (in place). Returns angle moved. */
const _axis = new THREE.Vector3();
const _q = new THREE.Quaternion();
export function rotateToward(v: THREE.Vector3, target: THREE.Vector3, maxAngle: number, fallbackAxis?: THREE.Vector3): number {
  const d = clamp(v.dot(target), -1, 1);
  const ang = Math.acos(d);
  if (ang < 1e-5) return 0;
  _axis.crossVectors(v, target);
  if (_axis.lengthSq() < 1e-10) {
    // opposite vectors — rotate about a supplied axis (usually "up") or any perpendicular
    if (fallbackAxis) _axis.copy(fallbackAxis);
    else _axis.set(0, 1, 0);
    if (Math.abs(_axis.dot(v)) > 0.99) _axis.set(1, 0, 0);
  }
  _axis.normalize();
  const step = Math.min(ang, maxAngle);
  _q.setFromAxisAngle(_axis, step);
  v.applyQuaternion(_q).normalize();
  return step;
}

/** Rotate `v` by the minimal rotation taking unit `from` to unit `to` (parallel transport of a tangent). */
export function transport(v: THREE.Vector3, from: THREE.Vector3, to: THREE.Vector3): void {
  _q.setFromUnitVectors(from, to);
  v.applyQuaternion(_q);
}

/**
 * Euler (order 'YZX') from a forward (+X body) and up (+Y body) basis. Writes into `out` as {yaw,pitch,roll}.
 * `prevYaw` is used when forward is (nearly) vertical so heading stays continuous.
 */
export function basisToEuler(fwd: THREE.Vector3, up: THREE.Vector3, prevYaw: number, out: { yaw: number; pitch: number; roll: number }): void {
  const fy = clamp(fwd.y, -1, 1);
  const pitch = Math.asin(fy);
  const horiz = Math.hypot(fwd.x, fwd.z);
  const yaw = horiz > 1e-4 ? Math.atan2(-fwd.z, fwd.x) : prevYaw;
  const sp = Math.sin(pitch);
  const cp = Math.cos(pitch);
  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  // reference up (roll = 0): Ry*Rz*(0,1,0); side: Ry*(0,0,1)
  const u0x = -sp * cy;
  const u0y = cp;
  const u0z = sp * sy;
  const z0x = sy;
  const z0z = cy;
  const roll = Math.atan2(up.x * z0x + up.z * z0z, up.x * u0x + up.y * u0y + up.z * u0z);
  out.yaw = yaw;
  out.pitch = pitch;
  out.roll = roll;
}

/** Set `out` to the heading vector for yaw/pitch (YZX convention). */
export function headingFromYawPitch(yaw: number, pitch: number, out: THREE.Vector3): THREE.Vector3 {
  const cp = Math.cos(pitch);
  return out.set(cp * Math.cos(yaw), Math.sin(pitch), -cp * Math.sin(yaw));
}

export function safeNormalize(v: THREE.Vector3, fallback: THREE.Vector3): THREE.Vector3 {
  const l = v.length();
  if (l < 1e-9 || !Number.isFinite(l)) return v.copy(fallback);
  return v.multiplyScalar(1 / l);
}

export function isFiniteVec(v: THREE.Vector3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}
