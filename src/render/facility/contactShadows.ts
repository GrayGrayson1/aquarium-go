/**
 * Cheap grounding for the people on the floor (visitors, staff): one instanced radial-gradient decal under each
 * figure, no shadow maps. Sized by the figure's scale, stretched a little along its heading, and lifted/faded with
 * the walk-cycle bob so feet read as touching the floor. ~1 draw call per layer. lane:facrender (P6-05).
 * OWNER: lane "facility".
 */
import * as THREE from 'three';
import { acquireTexture, releaseTexture } from './textures';

const KEY = 'decal:contact-shadow';

function shadowCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.72)');
  g.addColorStop(0.4, 'rgba(0,0,0,0.42)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return c;
}

export interface ContactShadows {
  mesh: THREE.InstancedMesh;
  /** Write instance `i`: floor position, heading (rad), figure scale, 0..1 visibility, walk bob (m, ≥ 0 lifts). */
  set: (i: number, x: number, z: number, heading: number, scale: number, visible: number, lift: number) => void;
  /** Commit `n` instances for this frame. */
  commit: (n: number) => void;
  dispose: () => void;
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

export function createContactShadows(cap: number): ContactShadows {
  const map = acquireTexture(KEY, shadowCanvas, { repeat: false });
  const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, toneMapped: false });
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, mat, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  mesh.renderOrder = 1;
  return {
    mesh,
    set(i, x, z, heading, scale, visible, lift) {
      // a person standing casts a ~45 × 32 cm soft blot; it spreads and fades as the foot lifts on the walk cycle
      const spread = 1 + Math.max(0, lift) * 6;
      const w = 0.52 * scale * spread * visible;
      const d = 0.38 * scale * spread * visible;
      _e.set(-Math.PI / 2, 0, -heading, 'YXZ');
      _q.setFromEuler(_e);
      _m.compose(_p.set(x, 0.006, z), _q, _s.set(w, d, 1));
      mesh.setMatrixAt(i, _m);
    },
    commit(n) {
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      mesh.dispose();
      geo.dispose();
      mat.dispose();
      releaseTexture(KEY);
    },
  };
}
