/**
 * Shared geometry/material builders for breeding visuals (eggs, jelly, bubbles, fry). Imperative + cached.
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { TankFXUniforms } from '../../shared/underwater';
import { GeoBuilder, ellipsoid, skin1 } from '../special/common/geo';
import { createCritterMaterial, createCritterUniforms, underwaterMat, type CritterUniforms } from '../special/common/materials';

let sphereGeo: THREE.BufferGeometry | null = null;
let sphereRefs = 0;
/** Unit sphere (radius 1) shared by all egg/bubble instancing. */
export function acquireSphere(): THREE.BufferGeometry {
  if (!sphereGeo) {
    const g = new GeoBuilder();
    ellipsoid(g, { center: [0, 0, 0], radii: [1, 1, 1], nu: 10, nv: 14, skin: skin1(0), mask: [0, 0, 0, 0] });
    sphereGeo = g.build();
  }
  sphereRefs++;
  return sphereGeo;
}
export function releaseSphere(): void {
  sphereRefs--;
  if (sphereRefs <= 0 && sphereGeo) {
    sphereGeo.dispose();
    sphereGeo = null;
    sphereRefs = 0;
  }
}

/** Glossy egg / embryo material using instance colours. */
export function eggMaterial(fx: TankFXUniforms): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.3, sheenColor: new THREE.Color('#fff2d8') });
  return underwaterMat(m, fx);
}

/** Clear jelly coat (axolotl eggs) / egg capsule shine. */
export function jellyMaterial(fx: TankFXUniforms): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ee, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.22, depthWrite: false });
  return underwaterMat(m, fx);
}

/** Soap-film bubble: transparent core, bright fresnel rim, thin-film iridescence. */
export function bubbleMaterial(fx: TankFXUniforms): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.04,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    iridescence: 1,
    iridescenceIOR: 1.33,
    iridescenceThicknessRange: [200, 700],
    transparent: true,
    depthWrite: false,
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
  { float f = 1.0 - abs(dot(normal, normalize(vViewPosition))); diffuseColor.a = mix(0.06, 0.8, pow(f, 2.2)); }`,
    );
  };
  m.customProgramCacheKey = () => 'agc-bubble-v1';
  return underwaterMat(m, fx);
}

// ───────────────────────────── fry ─────────────────────────────

const FRY_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  vec3 P = vAgcRest;
  float kind = uAgcF0.x;
  vec3 col = uAgcPal[0];
  // big dark eyes near the head
  float eye = 1.0 - smoothstep(0.045, 0.07, length(vec2(P.x - (kind > 0.5 ? 0.0 : 0.3), abs(P.z) - 0.05)) + max(0.0, -P.y) * 0.0 + abs(P.y - (kind > 0.5 ? 0.33 : 0.02)) * 0.8);
  // yolk / gut spot
  float gut = 1.0 - smoothstep(0.03, 0.09, length(P - vec3(kind > 0.5 ? 0.0 : 0.12, kind > 0.5 ? 0.1 : -0.03, 0.0)));
  col = mix(col, uAgcPal[1], gut * 0.6);
  col = mix(col, vec3(0.02), eye);
  s.albedo = col;
  s.alpha = mix(0.55, 1.0, max(eye, gut));
  s.rough = 0.3;
  s.sss = 1.0;
  s.sssCol = uAgcPal[0] * 1.2 + 0.1;
}
`;

const FRY_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  float ph = float(gl_InstanceID) * 1.37 + uAgcTime * uAgcV0.x;
  if (uAgcF0.x > 0.5) {
    // seahorse fry: tail curl flutter
    float q = clamp(-p.y * 2.0, 0.0, 1.0);
    p.x += sin(ph) * 0.06 * q * q;
  } else {
    float q = clamp(-(p.x - 0.25) * 1.4, 0.0, 1.0);
    p.z += sin(ph - q * 4.0) * 0.12 * q * q;
  }
}
`;

/** Fry geometry: kind 0 = fish/amphibian larva (head +X), kind 1 = seahorse fry (upright, curled tail). */
export function buildFryGeometry(kind: 0 | 1): THREE.BufferGeometry {
  const g = new GeoBuilder();
  if (kind === 0) {
    g.grid({ nu: 18, nv: 8, wrapV: true, orient: 'ring' }, (i, j, s) => {
      const t = i / 17;
      const x = 0.4 - t;
      const r = t < 0.1 ? Math.sqrt(Math.max(0, 1 - (1 - t / 0.1) ** 2)) * 0.09 : t < 0.35 ? 0.09 : 0.09 * (1 - (t - 0.35) / 0.65) + 0.004;
      const a = (j / 8) * Math.PI * 2;
      s.x = x;
      s.y = Math.cos(a) * r * (t > 0.35 ? 1.4 : 0.9);
      s.z = Math.sin(a) * r * (t > 0.35 ? 0.35 : 0.8);
      s.mask = [0, t, 0, 0];
      s.skin = skin1(0);
    });
  } else {
    g.grid({ nu: 22, nv: 8, wrapV: true, orient: 'ring' }, (i, j, s) => {
      const t = i / 21;
      // head (top) → trunk → curled tail
      const ang = t * 2.2;
      const cx = t < 0.25 ? 0.04 * t : 0.01 + Math.sin(ang - 0.6) * 0.08 * t;
      const cy = 0.35 - t * 0.8;
      const r = t < 0.08 ? Math.sqrt(Math.max(0, 1 - (1 - t / 0.08) ** 2)) * 0.07 : t < 0.35 ? 0.07 - (t - 0.08) * 0.05 : 0.055 * (1 - (t - 0.35) / 0.65) + 0.004;
      const a = (j / 8) * Math.PI * 2;
      s.x = cx + Math.cos(a) * r;
      s.y = cy;
      s.z = Math.sin(a) * r * 0.8;
      s.mask = [0, t, 0, 0];
      s.skin = skin1(0);
    });
    // snout
    ellipsoid(g, { center: [0.1, 0.3, 0], radii: [0.08, 0.02, 0.02], nu: 6, nv: 8, skin: skin1(0), mask: [0, 0, 0, 0] });
  }
  return g.build();
}

export function fryMaterial(fx: TankFXUniforms, kind: 0 | 1, body: THREE.Color, yolk: THREE.Color): { mat: THREE.MeshPhysicalMaterial; u: CritterUniforms } {
  const u = createCritterUniforms(fx);
  u.uAgcPal.value[0].copy(body);
  u.uAgcPal.value[1].copy(yolk);
  u.uAgcF0.value.set(kind, 0, 0, 0);
  u.uAgcV0.value.set(9, 0, 0, 0);
  const mat = createCritterMaterial({ name: 'fry', fx, u, surface: FRY_SURFACE, vertex: FRY_VERTEX, bump: 0, params: { roughness: 0.3, transparent: true, depthWrite: true } });
  return { mat, u };
}
