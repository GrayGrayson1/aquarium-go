/**
 * Room view (X-7 / L-8): does the camera's frame clip the exhibit row on the left or right? The HUD can show edge
 * fades / pan chevrons only when the row runs past the frame. Updated by CameraRig a few times a second (changes only
 * are published); `{ left: false, right: false }` outside the room view.
 */
import { create } from 'zustand';
import * as THREE from 'three';
import type { GameState } from '@/types';
import { tankDims, tankWorldTransform } from '@/sim/tankSpace';

export interface FacilityOverflow {
  left: boolean;
  right: boolean;
}

export const useFacilityOverflow = create<FacilityOverflow>(() => ({ left: false, right: false }));

/** Non-React read of the latest state. */
export function facilityOverflow(): FacilityOverflow {
  return useFacilityOverflow.getState();
}

/** NDC slack before a tank's end counts as clipped. */
const EDGE = 1.02;
const EVERY_S = 0.15;
const _v = new THREE.Vector3();
let acc = EVERY_S;

/** `g` null: not in the room view. */
export function updateFacilityOverflow(g: GameState | null, camera: THREE.Camera, dt: number): void {
  let left = false;
  let right = false;
  if (g) {
    acc += dt;
    if (acc < EVERY_S) return;
    acc = 0;
    camera.updateMatrixWorld();
    for (const id of g.tankOrder) {
      const t = g.tanks[id];
      if (!t) continue;
      const d = tankDims(t);
      const { position, rotY } = tankWorldTransform(t);
      const hx = (d.L * Math.abs(Math.cos(rotY)) + d.W * Math.abs(Math.sin(rotY))) / 2;
      for (const sx of [-hx, hx]) {
        _v.set(position[0] + sx, position[1] + d.H * 0.5, position[2]).project(camera);
        if (_v.z > 1) continue; // behind the camera
        if (_v.x < -EDGE) left = true;
        if (_v.x > EDGE) right = true;
      }
    }
  } else acc = EVERY_S;
  const s = useFacilityOverflow.getState();
  if (s.left !== left || s.right !== right) useFacilityOverflow.setState({ left, right });
}
