/**
 * Decor geometry generation entry point + a ref-counted cache keyed by (def, seed, lod).
 * OWNER: lane "aquascape".
 */
import type * as THREE from 'three';
import type { DecorDef } from '@/types';
import { GeoBuilder } from './builder';
import { genRock, rock, type DecorBuild } from './rocks';
import { genWood } from './wood';
import { genPlant } from './plants';
import { genMarine } from './marine';
import { genOrnament } from './ornaments';
import { genEstuary, ESTUARY_VISUALS } from './estuary'; // lane:brackish
import { genFragRack } from './fragRack'; // lane:frags

export type MatClass = 'solid' | 'solidDouble' | 'foliage' | 'coral';
export const MAT_CLASSES: MatClass[] = ['solid', 'solidDouble', 'foliage', 'coral'];

export type DecorGeometry = Partial<Record<MatClass, THREE.BufferGeometry>>;

export function buildDecor(def: DecorDef, seed: number, lod: number): DecorBuild {
  const out: DecorBuild = { solid: new GeoBuilder(), solidDouble: new GeoBuilder(), foliage: new GeoBuilder(), coral: new GeoBuilder() };
  const v = def.visual;
  try {
    if (ESTUARY_VISUALS.has(v)) genEstuary(out, def, seed, lod); // lane:brackish — mangrove, oysters, pebbles, seedling
    else if (v === 'frag_rack') genFragRack(out, def, seed, lod); // lane:frags — acrylic frag rack
    else if (v.startsWith('rock_') || v.startsWith('cave_')) genRock(out, v, seed, def.size, lod);
    else if (v.startsWith('wood_')) genWood(out, def, seed, lod);
    else if (v.startsWith('plant_') || v.startsWith('botanical_')) genPlant(out, def, seed, lod);
    else if (v.startsWith('coral_') || v.startsWith('anemone_') || v.startsWith('macro_') || v === 'ornament_hitching_post') genMarine(out, def, seed, lod);
    else if (v.startsWith('ornament_')) genOrnament(out, def, seed, lod);
  } catch (e) {
    console.warn(`[aquascape] generator failed for ${def.id}`, e);
  }
  if (out.solid.count + out.solidDouble.count + out.foliage.count + out.coral.count === 0) {
    rock(out.solid, 'river', seed, { center: [0, 0, 0], size: def.size, detail: lod === 0 ? 6 : 2 });
  }
  fitAll(out, def.size);
  return out;
}

/**
 * The visual contract: everything stays inside def.size (x/z centred, y from the base up; a little may be
 * buried below 0). Shrinks each axis only when needed, applied identically to every material part.
 */
function fitAll(out: DecorBuild, size: { w: number; d: number; h: number }): void {
  let ex = 1e-6;
  let ez = 1e-6;
  let top = 1e-6;
  for (const k of MAT_CLASSES) {
    const b = out[k];
    if (!b.count) continue;
    const bb = b.bbox();
    ex = Math.max(ex, Math.abs(bb.min[0]), Math.abs(bb.max[0]));
    ez = Math.max(ez, Math.abs(bb.min[2]), Math.abs(bb.max[2]));
    top = Math.max(top, bb.max[1]);
  }
  const sx = Math.min(1, size.w / 2 / ex);
  const sz = Math.min(1, size.d / 2 / ez);
  const sy = Math.min(1, size.h / top);
  if (sx >= 0.999 && sz >= 0.999 && sy >= 0.999) return;
  for (const k of MAT_CLASSES) {
    const b = out[k];
    if (b.count) b.mapPositions(([x, y, z]) => [x * sx, Math.max(-0.02, y * sy), z * sz]);
  }
}

export function toGeometry(build: DecorBuild): DecorGeometry {
  const g: DecorGeometry = {};
  for (const k of MAT_CLASSES) if (build[k].count > 0) g[k] = build[k].toGeometry();
  return g;
}

// ───────────────────────────── cache ─────────────────────────────

interface Entry {
  geo: DecorGeometry;
  refs: number;
  timer?: ReturnType<typeof setTimeout>;
}
const cache = new Map<string, Entry>();

const key = (def: DecorDef, seed: number, lod: number) => `${def.id}|${def.visual}|${seed}|${lod}`;

/** Get (and retain) the generated geometry for a decor item. Call releaseDecorGeometry when done. */
export function acquireDecorGeometry(def: DecorDef, seed: number, lod: number): DecorGeometry {
  const k = key(def, seed, lod);
  let e = cache.get(k);
  if (!e) {
    e = { geo: toGeometry(buildDecor(def, seed, lod)), refs: 0 };
    cache.set(k, e);
  }
  if (e.timer) {
    clearTimeout(e.timer);
    e.timer = undefined;
  }
  e.refs++;
  return e.geo;
}

export function releaseDecorGeometry(def: DecorDef, seed: number, lod: number): void {
  const k = key(def, seed, lod);
  const e = cache.get(k);
  if (!e) return;
  e.refs--;
  if (e.refs <= 0 && !e.timer) {
    // keep briefly so quick remounts (lod swaps, HMR, moving decor) don't regenerate
    e.timer = setTimeout(() => {
      const cur = cache.get(k);
      if (cur && cur.refs <= 0) {
        for (const g of Object.values(cur.geo)) g?.dispose();
        cache.delete(k);
      }
    }, 8000);
  }
}

/** Direct (uncached) generation — callers own and must dispose the result. */
export function generateDecorGeometry(def: DecorDef, seed: number, lod: number): DecorGeometry {
  return toGeometry(buildDecor(def, seed, lod));
}
