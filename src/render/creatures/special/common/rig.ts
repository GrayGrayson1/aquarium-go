/**
 * Bone rigs for procedural critters. A RigDef (shared, cached with the geometry) lists bones with rest positions in
 * mesh space and identity rest rotations, so animation code rotates bones about intuitive mesh-space axes
 * (Y = yaw/side bend for a creature facing +X, Z = pitch/vertical bend, X = roll/twist).
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { V3 } from './geo';

export interface BoneDef {
  name: string;
  parent: number;
  pos: V3;
}

export class RigDef {
  bones: BoneDef[] = [];
  private map = new Map<string, number>();

  add(name: string, parent: string | null, pos: V3): number {
    const pi = parent === null ? -1 : this.idx(parent);
    this.bones.push({ name, parent: pi, pos });
    const id = this.bones.length - 1;
    this.map.set(name, id);
    return id;
  }

  idx(name: string): number {
    const i = this.map.get(name);
    if (i === undefined) throw new Error(`critterart rig: unknown bone ${name}`);
    return i;
  }

  has(name: string): boolean {
    return this.map.has(name);
  }
}

export interface RigInstance {
  bones: THREE.Bone[];
  byName: Record<string, THREE.Bone>;
  skeleton: THREE.Skeleton;
  roots: THREE.Bone[];
  /** Rest local positions (copy) for resetting / offsets. */
  restPos: THREE.Vector3[];
}

export function instantiateRig(def: RigDef): RigInstance {
  const bones = def.bones.map((b) => {
    const bone = new THREE.Bone();
    bone.name = b.name;
    return bone;
  });
  const roots: THREE.Bone[] = [];
  const restPos: THREE.Vector3[] = [];
  def.bones.forEach((b, i) => {
    const bone = bones[i];
    if (b.parent >= 0) {
      const pp = def.bones[b.parent].pos;
      bone.position.set(b.pos[0] - pp[0], b.pos[1] - pp[1], b.pos[2] - pp[2]);
      bones[b.parent].add(bone);
    } else {
      bone.position.set(b.pos[0], b.pos[1], b.pos[2]);
      roots.push(bone);
    }
    restPos.push(bone.position.clone());
  });
  const inverses = def.bones.map((b) => new THREE.Matrix4().makeTranslation(-b.pos[0], -b.pos[1], -b.pos[2]));
  const skeleton = new THREE.Skeleton(bones, inverses);
  const byName: Record<string, THREE.Bone> = {};
  bones.forEach((b) => (byName[b.name] = b));
  return { bones, byName, skeleton, roots, restPos };
}

const IDENTITY = new THREE.Matrix4();

/** SkinnedMesh bound to a shared skeleton (identity bind matrix; bones must be siblings/descendants of the mesh's parent). */
export function makeSkinned(
  geo: THREE.BufferGeometry,
  mat: THREE.Material | THREE.Material[],
  rig: RigInstance,
  sphereScale = 1.6,
): THREE.SkinnedMesh {
  const m = new THREE.SkinnedMesh(geo, mat);
  m.bind(rig.skeleton, IDENTITY);
  const bs = geo.boundingSphere ?? new THREE.Sphere(new THREE.Vector3(), 1);
  m.boundingSphere = new THREE.Sphere(bs.center.clone(), bs.radius * sphereScale);
  m.frustumCulled = true;
  return m;
}

/** Set a bone's rotation from Euler angles (XYZ order) without allocating. */
const _e = new THREE.Euler();
export function setRot(b: THREE.Bone | THREE.Object3D, x: number, y: number, z: number, order: THREE.EulerOrder = 'XYZ'): void {
  _e.set(x, y, z, order);
  b.quaternion.setFromEuler(_e);
}
