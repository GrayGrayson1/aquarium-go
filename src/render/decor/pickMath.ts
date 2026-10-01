/**
 * Pointer maths for the decor editor (lane:tankrender): cheap picking (ray vs the analytic substrate heightfield and
 * vs a piece's footprint box, all in tank-local space) and the tap-to-place rule. Pure; no scene access.
 */
import * as THREE from 'three';
import type { Tank, DecorDef, DecorInstance } from '@/types';
import { substrateHeightAt } from '@/sim/aquascape/terrain';
import { tankDims } from '@/sim/tankSpace';

const _ir = new THREE.Ray();
const _box = new THREE.Box3();
const _hp = new THREE.Vector3();

/**
 * Where a tank-local ray first meets the substrate heightfield (or the glass floor), marched then bisected; null when
 * it leaves the tank without touching it.
 */
export function raySubstrateT(ray: THREE.Ray, tank: Pick<Tank, 'id' | 'tierId' | 'substrate'> & { water?: { level: number } }): number | null {
  const d = tankDims(tank);
  _box.min.set(-d.L / 2, 0, -d.W / 2);
  _box.max.set(d.L / 2, d.H, d.W / 2);
  const o = ray.origin;
  const v = ray.direction;
  // slab entry/exit of the tank box
  let t0 = 0;
  let t1 = Infinity;
  for (const k of ['x', 'y', 'z'] as const) {
    const lo = _box.min[k];
    const hi = _box.max[k];
    if (Math.abs(v[k]) < 1e-9) {
      if (o[k] < lo || o[k] > hi) return null;
      continue;
    }
    let a = (lo - o[k]) / v[k];
    let b = (hi - o[k]) / v[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
  }
  if (!(t1 > t0)) return null;
  const above = (t: number) => o.y + v.y * t - substrateHeightAt(tank, o.x + v.x * t, o.z + v.z * t);
  if (above(t0) <= 0) return t0;
  const N = 48;
  let prev = t0;
  for (let i = 1; i <= N; i++) {
    const t = t0 + ((t1 - t0) * i) / N;
    if (above(t) <= 0) {
      let a = prev;
      let b = t;
      for (let j = 0; j < 10; j++) {
        const m = (a + b) / 2;
        if (above(m) <= 0) b = m;
        else a = m;
      }
      return b;
    }
    prev = t;
  }
  return null;
}

/** Entry distance of a tank-local ray into a decor piece's (padded, rotated) footprint box; null when it misses. */
export function rayDecorBoxT(ray: THREE.Ray, inst: DecorInstance, def: DecorDef): number | null {
  const c = Math.cos(inst.rotY);
  const sn = Math.sin(inst.rotY);
  const ox = ray.origin.x - inst.x;
  const oz = ray.origin.z - inst.z;
  // into the piece's frame (inverse of its rotation about y)
  _ir.origin.set(ox * c - oz * sn, ray.origin.y - inst.y, ox * sn + oz * c);
  _ir.direction.set(ray.direction.x * c - ray.direction.z * sn, ray.direction.y, ray.direction.x * sn + ray.direction.z * c);
  const pad = 1.3 * inst.scale;
  _box.min.set((-def.size.w / 2) * pad, -0.01, (-def.size.d / 2) * pad);
  _box.max.set((def.size.w / 2) * pad, def.size.h * pad, (def.size.d / 2) * pad);
  if (_box.containsPoint(_ir.origin)) return 0;
  return _ir.intersectBox(_box, _hp) ? _hp.distanceTo(_ir.origin) : null;
}

/** A finger that travelled further than this between down and up was a drag, not a tap (px). */
export const TAP_SLOP_PX = 14;
/** Longest press that still counts as a tap (ms). */
export const TAP_MS = 600;

export interface PressState {
  /** performance.now() of the press, 0 when there is none (or it was used up). */
  downAt: number;
  downId: number;
  downX: number;
  downY: number;
  /** Fingers still on the glass after this lift. */
  touches: number;
  /** The press became a two-finger twist/pinch. */
  gestured: boolean;
}

/**
 * Does this pointer lift place the piece? Only the button/finger that went down, quickly, never part of a twist/pinch
 * (its last finger lifting used to count as a tap and buy the piece), and on touch only when the finger barely moved.
 */
export function isDecorTap(e: { button: number; pointerId: number; pointerType: string; clientX: number; clientY: number }, st: PressState, now: number): boolean {
  return (
    e.button === 0 &&
    e.pointerId === st.downId &&
    st.downAt > 0 &&
    now - st.downAt < TAP_MS &&
    st.touches === 0 &&
    !st.gestured &&
    (e.pointerType === 'mouse' || Math.hypot(e.clientX - st.downX, e.clientY - st.downY) <= TAP_SLOP_PX)
  );
}
