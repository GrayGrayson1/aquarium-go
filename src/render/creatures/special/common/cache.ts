/**
 * Ref-counted cache for shared per-species/per-LOD templates (geometry + rig definitions).
 * OWNER: lane "critterart".
 */
import type * as THREE from 'three';

interface Entry {
  value: unknown;
  refs: number;
  dispose: () => void;
}
const entries = new Map<string, Entry>();

export function acquire<T>(key: string, build: () => T, dispose: (v: T) => void): T {
  let e = entries.get(key);
  if (!e) {
    const value = build();
    e = { value, refs: 0, dispose: () => dispose(value) };
    entries.set(key, e);
  }
  e.refs++;
  return e.value as T;
}

export function release(key: string): void {
  const e = entries.get(key);
  if (!e) return;
  e.refs--;
  if (e.refs <= 0) {
    e.dispose();
    entries.delete(key);
  }
}

/** Dispose every geometry found in a template object (shallow values + arrays). */
export function disposeGeometries(obj: Record<string, unknown>): void {
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && 'isBufferGeometry' in v) (v as THREE.BufferGeometry).dispose();
    else if (Array.isArray(v)) for (const x of v) if (x && typeof x === 'object' && 'isBufferGeometry' in x) (x as THREE.BufferGeometry).dispose();
  }
}

export function cacheStats(): { key: string; refs: number }[] {
  return [...entries.entries()].map(([key, e]) => ({ key, refs: e.refs }));
}
