/**
 * Reference-counted geometry cache: one lofted body + merged fin mesh per (plan key, LOD), shared by every individual
 * of the same species/fin form. Released geometry lingers briefly so rebuilding a creature (appearance change,
 * LOD switch) does not thrash. OWNER: lane "fishart".
 */
import * as THREE from 'three';
import type { FishPlan } from './plan';
import { BodySampler, buildBodyGeometry } from './body';
import { buildFinGeometry } from './fins';
import { buildExtrasGeometry } from './extras';

export interface FishGeometry {
  sampler: BodySampler;
  body: THREE.BufferGeometry;
  fins: THREE.BufferGeometry;
  /** Highest rest-pose vertex (body or spread fin) above the origin, in body lengths — the real dorsal height. */
  topY: number;
  /** Lowest rest-pose vertex of the body / of the spread fins (≤ 0, body lengths): how far long fins hang (L-4). */
  bodyBottomY: number;
  finsBottomY: number;
  refs: number;
  disposeTimer: ReturnType<typeof setTimeout> | null;
}

/** Min vertex y of a geometry (0 when it has no vertices). */
function minY(geo: THREE.BufferGeometry): number {
  const p = geo.attributes.position?.array as ArrayLike<number> | undefined;
  if (!p) return 0;
  let m = Infinity;
  for (let i = 1; i < p.length; i += 3) if (p[i] < m) m = p[i];
  return Number.isFinite(m) ? m : 0;
}

/** Max vertex y of a geometry (0 when it has no vertices). */
function maxY(geo: THREE.BufferGeometry): number {
  const p = geo.attributes.position?.array as ArrayLike<number> | undefined;
  if (!p) return 0;
  let m = -Infinity;
  for (let i = 1; i < p.length; i += 3) if (p[i] > m) m = p[i];
  return Number.isFinite(m) ? m : 0;
}

const cache = new Map<string, FishGeometry>();
let eyeGeos: THREE.SphereGeometry[] | null = null;

export interface LodRes {
  rings: number;
  segments: number;
  fin: number;
}

export function lodResolution(lod: number, quality: string): LodRes {
  const q = quality === 'ultra' ? 1.25 : quality === 'low' ? 0.6 : quality === 'medium' ? 0.85 : 1;
  if (lod <= 0) return { rings: Math.round(84 * q), segments: Math.round(56 * q), fin: 1 * q };
  if (lod === 1) return { rings: Math.round(42 * q), segments: Math.round(28 * q), fin: 0.5 * q };
  return { rings: 20, segments: 12, fin: 0.28 };
}

export function acquireFishGeometry(plan: FishPlan, lod: number, quality: string): FishGeometry {
  const res = lodResolution(lod, quality);
  const key = `${plan.key}|${res.rings}x${res.segments}|${res.fin.toFixed(2)}`;
  let g = cache.get(key);
  if (!g) {
    const sampler = new BodySampler(plan.body);
    let body = buildBodyGeometry(sampler, res);
    if (plan.extras && plan.extras.length) {
      const ex = buildExtrasGeometry(sampler, plan.extras, lod);
      if (ex) {
        const merged = mergeIndexed([body, ex]);
        body.dispose();
        ex.dispose();
        body = merged;
      }
    }
    const fins = buildFinGeometry(sampler, plan.fins, res.fin);
    // the real top (the shader only ever folds fins down from the spread rest pose stored in `position`) — measured
    // before the generous culling bounds below replace it, so the waterline clamp uses the dorsal height, not the box
    const topY = Math.max(maxY(body), maxY(fins));
    const bodyBottomY = Math.min(0, minY(body));
    const finsBottomY = Math.min(0, minY(fins));
    // generous bounds: vertices move in the shader (swim wave, fin flare, puff)
    const sphere = new THREE.Sphere(new THREE.Vector3(-0.05, 0, 0), 0.85);
    body.boundingSphere = sphere.clone();
    fins.boundingSphere = sphere.clone();
    body.boundingBox = new THREE.Box3(new THREE.Vector3(-0.8, -0.6, -0.5), new THREE.Vector3(0.6, 0.6, 0.5));
    fins.boundingBox = body.boundingBox.clone();
    g = { sampler, body, fins, topY, bodyBottomY, finsBottomY, refs: 0, disposeTimer: null };
    cache.set(key, g);
  }
  if (g.disposeTimer) {
    clearTimeout(g.disposeTimer);
    g.disposeTimer = null;
  }
  g.refs++;
  return g;
}

export function releaseFishGeometry(g: FishGeometry): void {
  g.refs--;
  if (g.refs > 0) return;
  g.disposeTimer = setTimeout(() => {
    if (g.refs > 0) return;
    for (const [k, v] of cache) if (v === g) cache.delete(k);
    g.body.dispose();
    g.fins.dispose();
  }, 15000);
}

/** Shared unit eye spheres per LOD (never disposed; tiny). */
export function eyeGeometry(lod: number): THREE.SphereGeometry {
  if (!eyeGeos) eyeGeos = [new THREE.SphereGeometry(1, 32, 24), new THREE.SphereGeometry(1, 16, 12), new THREE.SphereGeometry(1, 8, 6)];
  return eyeGeos[Math.max(0, Math.min(2, lod))];
}

/** Merge indexed geometries that share the same attribute layout. */
export function mergeIndexed(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const names = Object.keys(geos[0].attributes);
  let vtotal = 0;
  let itotal = 0;
  for (const g of geos) {
    vtotal += g.attributes.position.count;
    itotal += g.index ? g.index.count : g.attributes.position.count;
  }
  for (const n of names) {
    const size = geos[0].attributes[n].itemSize;
    const arr = new Float32Array(vtotal * size);
    let off = 0;
    for (const g of geos) {
      const a = g.attributes[n];
      if (!a) {
        off += g.attributes.position.count * size;
        continue;
      }
      arr.set(a.array as Float32Array, off);
      off += a.count * size;
    }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  const idx = new Uint32Array(itotal);
  let io = 0;
  let vo = 0;
  for (const g of geos) {
    if (g.index) {
      const ia = g.index.array;
      for (let i = 0; i < ia.length; i++) idx[io++] = ia[i] + vo;
    } else {
      for (let i = 0; i < g.attributes.position.count; i++) idx[io++] = i + vo;
    }
    vo += g.attributes.position.count;
  }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/** Cache contents (key, refs) — tests / diagnostics. */
export function fishCacheStats(): { key: string; refs: number }[] {
  return [...cache.entries()].map(([key, g]) => ({ key, refs: g.refs }));
}

/** Dispose every unreferenced geometry now instead of after the linger (tests / memory pressure). */
export function flushFishCache(): void {
  for (const [key, g] of cache) {
    if (g.refs > 0) continue;
    if (g.disposeTimer) clearTimeout(g.disposeTimer);
    g.disposeTimer = null;
    cache.delete(key);
    g.body.dispose();
    g.fins.dispose();
  }
}
