/**
 * Ref-counted cache for shared per-species/per-LOD templates (geometry + rig definitions). A template whose last
 * user is released lingers for a while before it is disposed (mirrors core/cache.ts), so a tank switch, LOD flip or
 * last-of-species rebuild does not pay the 20-150 ms synchronous template build again a frame later.
 * OWNER: lane "critterart".
 */
import type * as THREE from 'three';

interface Entry {
  value: unknown;
  refs: number;
  dispose: () => void;
  disposeTimer: ReturnType<typeof setTimeout> | null;
}
const entries = new Map<string, Entry>();

/** How long an unreferenced template is kept (ms). */
export const TEMPLATE_LINGER_MS = 15000;

export function acquire<T>(key: string, build: () => T, dispose: (v: T) => void): T {
  let e = entries.get(key);
  if (!e) {
    const value = build();
    e = { value, refs: 0, dispose: () => dispose(value), disposeTimer: null };
    entries.set(key, e);
  }
  if (e.disposeTimer) {
    clearTimeout(e.disposeTimer);
    e.disposeTimer = null;
  }
  e.refs++;
  return e.value as T;
}

export function release(key: string): void {
  const e = entries.get(key);
  if (!e) return;
  e.refs--;
  if (e.refs > 0 || e.disposeTimer) return;
  e.disposeTimer = setTimeout(() => {
    e.disposeTimer = null;
    if (e.refs > 0 || entries.get(key) !== e) return;
    entries.delete(key);
    e.dispose();
  }, TEMPLATE_LINGER_MS);
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

/** Drop every unreferenced template now (tests / memory pressure). */
export function flushUnreferenced(): void {
  for (const [key, e] of entries) {
    if (e.refs > 0) continue;
    if (e.disposeTimer) clearTimeout(e.disposeTimer);
    entries.delete(key);
    e.dispose();
  }
}
