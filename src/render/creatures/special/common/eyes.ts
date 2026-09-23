/**
 * Glossy procedural eyes with iris/pupil and a living catchlight. Geometry: unit sphere gazing +Z (cached per LOD).
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { TankFXUniforms } from '../../../shared/underwater';
import type { RenderLod } from '../../../lod';
import { GeoBuilder, ellipsoid, skin1 } from './geo';
import { acquire, release } from './cache';
import { createCritterMaterial, createCritterUniforms, EYE_POST, EYE_SURFACE, type CritterUniforms } from './materials';

export function acquireEyeGeometry(lod: RenderLod): THREE.BufferGeometry {
  return acquire(
    `eye|${lod}`,
    () => {
      const g = new GeoBuilder();
      const n = lod === 0 ? 20 : lod === 1 ? 12 : 8;
      ellipsoid(g, { center: [0, 0, 0], radii: [1, 1, 1], nu: n, nv: n * 2 - 2, skin: skin1(0), mask: [4, 0, 0, 0] });
      return g.build();
    },
    (geo) => geo.dispose(),
  );
}
export const releaseEyeGeometry = (lod: RenderLod) => release(`eye|${lod}`);

export interface EyeLook {
  iris: THREE.Color;
  pupil: THREE.Color;
  sclera: THREE.Color;
  ring: THREE.Color;
  /** Angular radius of the iris (radians from gaze axis). */
  irisAngle: number;
  pupilAngle: number;
  /** >1 widens the pupil horizontally. */
  pupilAspect?: number;
  striation?: number;
  catchlight?: number;
}

export function createEyeMaterial(fx: TankFXUniforms, shared: CritterUniforms, look: EyeLook): { mat: THREE.MeshPhysicalMaterial; u: CritterUniforms } {
  const u = createCritterUniforms(fx);
  u.uAgcTime = shared.uAgcTime;
  u.uAgcHi = shared.uAgcHi;
  const p = u.uAgcPal.value;
  p[0].copy(look.iris);
  p[1].copy(look.pupil);
  p[2].copy(look.sclera);
  p[3].copy(look.ring);
  u.uAgcF0.value.set(look.irisAngle, look.pupilAngle, look.pupilAspect ?? 1, look.striation ?? 0.5);
  u.uAgcF1.value.set(look.catchlight ?? 1, 0, 0, 0);
  const mat = createCritterMaterial({
    name: 'eye',
    fx,
    u,
    surface: EYE_SURFACE,
    post: EYE_POST,
    bump: 0,
    params: { roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04, ior: 1.38, specularIntensity: 0.8 },
  });
  return { mat, u };
}
