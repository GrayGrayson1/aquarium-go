/**
 * Tank-local ↔ world helpers (pure math from game state; no scene graph needed). OWNER: lane "waterfx".
 * Tank-local origin = interior floor centre; see src/sim/tankSpace.ts `tankWorldTransform`.
 */
import * as THREE from 'three';
import type { Tank } from '@/types';
import { getGame } from '@/state/game';
import { tankWorldTransform } from '@/sim/tankSpace';

type TankRef = string | Pick<Tank, 'tierId' | 'placement'>;
type Vec3Like = THREE.Vector3 | [number, number, number] | { x: number; y: number; z: number };

function resolve(t: TankRef): Pick<Tank, 'tierId' | 'placement'> | null {
  if (typeof t !== 'string') return t;
  return getGame()?.tanks[t] ?? null;
}

const _q = new THREE.Quaternion();
const _y = new THREE.Vector3(0, 1, 0);
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

/** World matrix of a tank's local space (null if the tank id is unknown). */
export function getTankWorldMatrix(tank: TankRef, out = new THREE.Matrix4()): THREE.Matrix4 | null {
  const t = resolve(tank);
  if (!t) return null;
  const { position, rotY } = tankWorldTransform(t);
  _q.setFromAxisAngle(_y, rotY);
  _p.set(position[0], position[1], position[2]);
  return out.compose(_p, _q, _s);
}

function readVec(v: Vec3Like, out: THREE.Vector3): THREE.Vector3 {
  if (Array.isArray(v)) return out.set(v[0], v[1], v[2]);
  return out.set(v.x, v.y, v.z);
}

/** Tank-local point → world point. Returns `out` unchanged (copy of local) if the tank is unknown. */
export function tankLocalToWorld(tank: TankRef, local: Vec3Like, out = new THREE.Vector3()): THREE.Vector3 {
  readVec(local, out);
  const t = resolve(tank);
  if (!t) return out;
  const { position, rotY } = tankWorldTransform(t);
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  const x = out.x * c + out.z * s;
  const z = -out.x * s + out.z * c;
  return out.set(x + position[0], out.y + position[1], z + position[2]);
}

/** World point → tank-local point. */
export function worldToTankLocal(tank: TankRef, world: Vec3Like, out = new THREE.Vector3()): THREE.Vector3 {
  readVec(world, out);
  const t = resolve(tank);
  if (!t) return out;
  const { position, rotY } = tankWorldTransform(t);
  const x = out.x - position[0];
  const y = out.y - position[1];
  const z = out.z - position[2];
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return out.set(x * c - z * s, y, x * s + z * c);
}

/** Tank-local direction → world direction (rotation only). */
export function tankDirToWorld(tank: TankRef, dir: Vec3Like, out = new THREE.Vector3()): THREE.Vector3 {
  readVec(dir, out);
  const t = resolve(tank);
  if (!t) return out;
  const rotY = t.placement.rotY;
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return out.set(out.x * c + out.z * s, out.y, -out.x * s + out.z * c);
}
