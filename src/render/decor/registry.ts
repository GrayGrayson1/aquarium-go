/**
 * Per-tank registry of pickable decor objects (substrate mesh + decor item groups) for the 3D decor editor
 * and any lane that needs to raycast the scape (e.g. behaviour "look at decor"). OWNER: lane "aquascape".
 */
import type * as THREE from 'three';

export interface TankDecorPick {
  substrate: THREE.Object3D | null;
  items: Map<string, THREE.Object3D>;
}

const reg = new Map<string, TankDecorPick>();

export function decorPick(tankId: string): TankDecorPick {
  let e = reg.get(tankId);
  if (!e) {
    e = { substrate: null, items: new Map() };
    reg.set(tankId, e);
  }
  return e;
}

/** Decor ids currently being dragged/edited (renderers hide/ghost them). */
export const editingDecor = { id: null as string | null };
