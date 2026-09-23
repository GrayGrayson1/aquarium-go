/**
 * lane:perf2 — cache of the merged LOD 1/2 scapes (see MergedDecor.tsx), keyed by (lod, decor signature).
 *
 * Why: returning from the tank view to the room swaps the hero and its neighbours back to lod 1. Their merged scape
 * used to be rebuilt every time — every item regenerated at low detail (the per-item cache had already let it go) and
 * merged again: 150–280 ms of main-thread work in the first room frame of a big display. A merged scape is a pure
 * function of the decor signature and the lod, so it is kept for a while after its last user unmounts and reused.
 *
 * Lifetime: reference counted. An unreferenced entry is disposed after KEEP_MS, or earlier (least recently used
 * first) once the unreferenced entries hold more than IDLE_BUDGET_BYTES. When a tank's scape at a lod is rebuilt
 * (a decor edit, a plant growing a step) the superseded one is dropped as soon as nothing draws it — it is only kept
 * for the NEXT use of the same (lod, signature), so nothing stale is ever handed out. Built entries start
 * unreferenced (React may build during a render that never commits); `retain`/`release` run from effects.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Tank } from '@/types';
import type { RenderLod } from '../lod';
import { getDecorDef, isLiving } from '@/data/catalog/decor';
import { acquireDecorGeometry, releaseDecorGeometry, MAT_CLASSES, type MatClass } from './gen';

export type MergedGeometry = Partial<Record<MatClass, THREE.BufferGeometry>>;

export interface MergedDecorEntry {
  key: string;
  /** `${tankId}|${lod}` — a newer scape for the same owner supersedes this one. */
  owner: string;
  lod: RenderLod;
  geo: MergedGeometry;
  /** CPU-side size of the geometry (the GPU copy is about the same). */
  bytes: number;
  refs: number;
  /** performance.now() when it became unreferenced (for the idle cap), or when it was built. */
  idleSince: number;
  timer?: ReturnType<typeof setTimeout>;
  disposed: boolean;
}

/** Unreferenced scapes live this long (a typical tank-view visit is well under it). */
const KEEP_MS = 150_000;
/**
 * Unreferenced scapes may hold this much geometry (least recently released evicted first). Enough for the room return
 * of the biggest hall (big_facility: the hero's and its three neighbours' lod-1 scapes are ≈16 MB, the 1,000-gallon
 * reef alone 10.5 MB) — memory the room view was using a moment earlier anyway.
 */
const IDLE_BUDGET_BYTES = 24 * 1024 * 1024;
/** A just-built entry is never budget-evicted before its component had the chance to retain it. */
const MIN_AGE_MS = 3000;

const cache = new Map<string, MergedDecorEntry>();
/** Newest scape key per owner (tank|lod). */
const latestByOwner = new Map<string, string>();

/**
 * A/B switches for measurements (dev or `?perf=1`: `window.__AQ_MERGED`). `cache: false` rebuilds on every mount and
 * lod/signature change (the old behaviour); `progressive: false` rebuilds a changed scape synchronously.
 */
export const mergedDecorPerf = { cache: true, progressive: true };
if (typeof window !== 'undefined' && (import.meta.env.DEV || new URLSearchParams(location.search).has('perf'))) {
  (window as unknown as { __AQ_MERGED?: unknown }).__AQ_MERGED = {
    opts: mergedDecorPerf,
    stats: () => mergedDecorCacheStats(),
    entries: () => [...cache.values()].map((e) => `${e.owner} refs=${e.refs} ${(e.bytes / 1048576).toFixed(2)}MB`),
  };
}

export const mergedDecorKey = (lod: RenderLod, sig: string): string => `${lod}|${sig}`;

export function decorSignature(tank: Tank): string {
  return tank.decor.map((d) => `${d.id}:${d.defId}:${d.seed}:${d.x.toFixed(3)},${d.y.toFixed(3)},${d.z.toFixed(3)},${d.rotY.toFixed(2)},${d.scale.toFixed(2)},${Math.round((d.growth ?? 1) * 4)},${Math.round((d.health ?? 100) / 25)}`).join('|');
}

/** Every item generated at `lod`, baked into tank space and merged into one geometry per material class. */
function buildMerged(tank: Tank, lod: RenderLod): MergedGeometry {
  const parts: Record<MatClass, THREE.BufferGeometry[]> = { solid: [], solidDouble: [], foliage: [], coral: [] };
  const m = new THREE.Matrix4();
  const qn = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const pv = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (const inst of tank.decor) {
    const def = getDecorDef(inst.defId);
    if (!def) continue;
    const geo = acquireDecorGeometry(def, inst.seed, lod);
    const g = inst.growth ?? 1;
    const vis = isLiving(def) ? 0.72 + 0.28 * g : 1;
    qn.setFromAxisAngle(up, inst.rotY);
    m.compose(pos.set(inst.x, inst.y, inst.z), qn, scl.setScalar(inst.scale * vis));
    for (const k of MAT_CLASSES) {
      const src = geo[k];
      if (!src) continue;
      const c = src.clone();
      c.applyMatrix4(m);
      // pivots move with the geometry (used by emergence; growth is baked so keep them consistent)
      const piv = c.getAttribute('aPivot') as THREE.BufferAttribute;
      for (let i = 0; i < piv.count; i++) {
        const v = pv.set(piv.getX(i), piv.getY(i), piv.getZ(i)).applyMatrix4(m); // lane:perf — no per-vertex allocation
        piv.setXYZ(i, v.x, v.y, v.z);
      }
      parts[k].push(c);
    }
    releaseDecorGeometry(def, inst.seed, lod);
  }
  const out: MergedGeometry = {};
  for (const k of MAT_CLASSES) {
    if (!parts[k].length) continue;
    const mg = mergeGeometries(parts[k], false);
    parts[k].forEach((p) => p.dispose());
    if (mg) {
      mg.computeBoundingSphere();
      out[k] = mg;
    }
  }
  return out;
}

function geometryBytes(geo: MergedGeometry): number {
  let n = 0;
  for (const g of Object.values(geo)) {
    if (!g) continue;
    for (const a of Object.values(g.attributes)) n += (a as THREE.BufferAttribute).array.byteLength;
    if (g.index) n += g.index.array.byteLength;
  }
  return n;
}

function disposeEntry(e: MergedDecorEntry): void {
  if (e.timer) clearTimeout(e.timer);
  e.timer = undefined;
  e.disposed = true;
  for (const g of Object.values(e.geo)) g?.dispose();
  if (cache.get(e.key) === e) cache.delete(e.key);
  if (latestByOwner.get(e.owner) === e.key && !cache.has(e.key)) latestByOwner.delete(e.owner);
}

/** Superseded by a newer scape of the same tank and lod. */
const superseded = (e: MergedDecorEntry) => latestByOwner.get(e.owner) !== e.key;

function scheduleExpiry(e: MergedDecorEntry): void {
  e.idleSince = performance.now();
  if (e.timer) clearTimeout(e.timer);
  e.timer = setTimeout(() => {
    e.timer = undefined;
    if (e.refs <= 0) disposeEntry(e);
  }, KEEP_MS);
  // idle budget: drop the least recently released scapes (never one younger than MIN_AGE_MS)
  const idle = [...cache.values()].filter((x) => x.refs <= 0);
  let bytes = idle.reduce((a, x) => a + x.bytes, 0);
  if (bytes <= IDLE_BUDGET_BYTES) return;
  const now = performance.now();
  idle.sort((a, b) => a.idleSince - b.idleSince);
  for (const x of idle) {
    if (bytes <= IDLE_BUDGET_BYTES) break;
    if (now - x.idleSince <= MIN_AGE_MS) continue;
    bytes -= x.bytes;
    disposeEntry(x);
  }
}

/** The merged scape of `tank` at `lod` (built on a miss). Pair with retain/release from an effect. */
export function getMergedDecor(tank: Tank, lod: RenderLod, sig = decorSignature(tank)): MergedDecorEntry {
  const key = mergedDecorKey(lod, sig);
  let e = mergedDecorPerf.cache ? cache.get(key) : undefined;
  if (!e || e.disposed) {
    const geo = buildMerged(tank, lod);
    e = { key, owner: `${tank.id}|${lod}`, lod, geo, bytes: geometryBytes(geo), refs: 0, idleSince: performance.now(), disposed: false };
    if (mergedDecorPerf.cache) {
      const prevKey = latestByOwner.get(e.owner);
      latestByOwner.set(e.owner, key);
      // the superseded scape of this tank/lod goes as soon as nothing draws it
      const prev = prevKey !== undefined && prevKey !== key ? cache.get(prevKey) : undefined;
      if (prev && prev.refs <= 0) disposeEntry(prev);
      cache.set(key, e);
      scheduleExpiry(e);
    }
  }
  return e;
}

/** The cached scape for `key`, if any (never builds). */
export function peekMergedDecor(key: string): MergedDecorEntry | undefined {
  if (!mergedDecorPerf.cache) return undefined;
  const e = cache.get(key);
  return e && !e.disposed ? e : undefined;
}

export function retainMergedDecor(e: MergedDecorEntry): void {
  e.refs++;
  if (e.timer) {
    clearTimeout(e.timer);
    e.timer = undefined;
  }
  // evicted by the cap between render and commit (only possible under extreme churn): back into the cache so a
  // later release still reaches it; three re-uploads a disposed geometry on its next draw
  if (e.disposed) {
    e.disposed = false;
    if (mergedDecorPerf.cache && !cache.has(e.key)) cache.set(e.key, e);
  }
}

export function releaseMergedDecor(e: MergedDecorEntry): void {
  e.refs = Math.max(0, e.refs - 1);
  if (e.refs === 0 && !e.disposed) {
    if (cache.get(e.key) !== e || superseded(e)) disposeEntry(e);
    else scheduleExpiry(e);
  }
}

/** Test/dev helper: live entry count, how many are referenced, and the idle entries' geometry memory (MB). */
export function mergedDecorCacheStats(): { entries: number; referenced: number; idleMb: number } {
  let referenced = 0;
  let idleBytes = 0;
  for (const e of cache.values()) {
    if (e.refs > 0) referenced++;
    else idleBytes += e.bytes;
  }
  return { entries: cache.size, referenced, idleMb: Math.round((idleBytes / 1048576) * 10) / 10 };
}

/** Shared per-frame budget (ms) for preparing changed scapes over frames (all MergedDecors together). */
const PREP_BUDGET_MS = 5;
const prepFrame = { id: -1, spent: 0 };

/** May a scape preparation do more work this frame? The first caller of a frame always may (progress is guaranteed). */
export function prepBudgetLeft(frameId: number): boolean {
  if (prepFrame.id !== frameId) {
    prepFrame.id = frameId;
    prepFrame.spent = 0;
    return true;
  }
  return prepFrame.spent < PREP_BUDGET_MS;
}

export function spendPrepBudget(ms: number): void {
  prepFrame.spent += ms;
}
