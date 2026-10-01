/**
 * Per-tank registry of pickable decor objects (substrate mesh + decor item groups) for the 3D decor editor
 * and any lane that needs to raycast the scape (e.g. behaviour "look at decor"). OWNER: lane "aquascape".
 */
import { useSyncExternalStore } from 'react';
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

/** Decor ids currently being dragged/edited (renderers hide/ghost them). Change it with setEditingDecor(). */
export const editingDecor = { id: null as string | null };

const editingListeners = new Set<() => void>();
const subscribeEditing = (l: () => void) => {
  editingListeners.add(l);
  return () => editingListeners.delete(l);
};
const editingSnapshot = () => editingDecor.id;

/**
 * lane:tankrender — the held piece must hide at once, also while the game is paused (no sim tick re-renders the
 * scape then): subscribers re-render when the id changes.
 */
export function setEditingDecor(id: string | null): void {
  if (editingDecor.id === id) return;
  editingDecor.id = id;
  for (const l of editingListeners) l();
}

/** The decor id being dragged/edited right now (re-renders on change). */
export function useEditingDecorId(): string | null {
  return useSyncExternalStore(subscribeEditing, editingSnapshot, editingSnapshot);
}
