/**
 * Hero detail tiers for critters (see src/render/shared/detail.ts). OWNER: lane "perf".
 * A critter keeps its lod-0 rig, materials and animation; only the mesh geometry (and eye sphere) is swapped for the
 * lower-LOD template while it is small on screen. Rigs are LOD-independent, so skinning stays valid.
 */
import type * as THREE from 'three';
import type { RenderLod } from '../../../lod';
import { CRITTER_DETAIL, nextDetailTier } from '../../../shared/detail';
import { acquire, release } from './cache';
import { acquireEyeGeometry, releaseEyeGeometry } from './eyes';

export interface CritterTiers {
  setDetailPx(px: number): void;
  /** Release every extra template this object acquired. */
  dispose(): void;
}

/**
 * @param lod     the object's build LOD (tiers only apply at lod 0)
 * @param keyOf   cache key of the template for a LOD (same key scheme the factory uses)
 * @param build   template builder for a LOD
 * @param apply   swap the object's meshes to a template (`eyeGeo` is the matching eye sphere, when `eyes`)
 */
export function critterTiers<T>(
  lod: RenderLod,
  keyOf: (l: RenderLod) => string,
  build: (l: RenderLod) => T,
  disposeTpl: (t: T) => void,
  base: T,
  apply: (tpl: T, eyeGeo: THREE.BufferGeometry | null) => void,
  eyes: boolean,
): CritterTiers {
  let tier: RenderLod = 0;
  const tpls = new Map<RenderLod, T>([[0, base]]);
  const eyeGeos = new Map<RenderLod, THREE.BufferGeometry>();
  return {
    setDetailPx(px: number) {
      if (lod !== 0) return;
      const t = nextDetailTier(px, tier, CRITTER_DETAIL) as RenderLod;
      if (t === tier) return;
      tier = t;
      let tpl = tpls.get(t);
      if (!tpl) {
        tpl = acquire(keyOf(t), () => build(t), disposeTpl);
        tpls.set(t, tpl);
      }
      let eg: THREE.BufferGeometry | null = null;
      if (eyes) {
        eg = eyeGeos.get(t) ?? null;
        if (!eg) {
          eg = acquireEyeGeometry(t);
          eyeGeos.set(t, eg);
        }
      }
      apply(tpl, eg);
    },
    dispose() {
      for (const l of tpls.keys()) if (l !== 0) release(keyOf(l));
      for (const l of eyeGeos.keys()) releaseEyeGeometry(l);
      tpls.clear();
      eyeGeos.clear();
    },
  };
}
