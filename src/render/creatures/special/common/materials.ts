/**
 * Critter materials: MeshPhysicalMaterial extended (onBeforeCompile) with
 *  - a per-species GLSL surface function (procedural colour/pattern/roughness/bump in rest space → sticks to the body),
 *  - rest-space vertex deformation hooks (gill sway, fin flutter, pouch pumping) applied before skinning,
 *  - soft subsurface warmth (wrap + rim + back-light transmission) scaled by the tank's light,
 *  - stress fade / courtship brightening, a thin silhouette rim for selection (never a colour wash),
 *  - the shared underwater caustics + fog patch (with an instancing fix for InstancedMesh).
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import { patchUnderwaterMaterial, type TankFXUniforms } from '../../../shared/underwater';
import { AGC_BUMP, AGC_NOISE } from './glsl';
import { hashStr } from './math';

export interface CritterUniforms {
  uAgcTime: { value: number };
  /** Palette (linear): 0 body, 1 body2, 2 belly, 3 fin, 4 fin2, 5 accent, 6 gill/extra, 7 eye/extra. */
  uAgcPal: { value: THREE.Color[] };
  /** pattern kind id, scale, contrast, seed */
  uAgcPat: { value: THREE.Vector4 };
  /** iridescence, metallic, translucency, glow */
  uAgcMat: { value: THREE.Vector4 };
  /** Species vertex params. */
  uAgcV0: { value: THREE.Vector4 };
  uAgcV1: { value: THREE.Vector4 };
  /** Species fragment params. */
  uAgcF0: { value: THREE.Vector4 };
  uAgcF1: { value: THREE.Vector4 };
  /** Colour intensity 0..1 (stress fade below ~0.55). */
  uAgcCI: { value: number };
  /** Courtship / display brightening 0..1. */
  uAgcBoost: { value: number };
  /** Selection highlight 0..1. */
  uAgcHi: { value: number };
  /** Tank overhead light colour × intensity (shared reference with the tank FX). */
  uAgcLight: { value: THREE.Color };
}

export const PATTERN_IDS: Record<string, number> = {
  none: 0,
  solid: 0,
  speckled: 1,
  spots: 2,
  mottled: 3,
  marble: 4,
  lined: 5,
  bands: 6,
  bars: 6,
  reticulated: 7,
  dalmatian: 2,
  grizzle: 3,
  bicolor: 8,
  saddle: 9,
};

export function createCritterUniforms(fx: TankFXUniforms): CritterUniforms {
  return {
    uAgcTime: { value: 0 },
    uAgcPal: { value: Array.from({ length: 8 }, () => new THREE.Color(1, 1, 1)) },
    uAgcPat: { value: new THREE.Vector4(0, 1, 0.5, 0) },
    uAgcMat: { value: new THREE.Vector4(0, 0, 0, 0) },
    uAgcV0: { value: new THREE.Vector4() },
    uAgcV1: { value: new THREE.Vector4() },
    uAgcF0: { value: new THREE.Vector4() },
    uAgcF1: { value: new THREE.Vector4() },
    uAgcCI: { value: 1 },
    uAgcBoost: { value: 0 },
    uAgcHi: { value: 0 },
    uAgcLight: fx.uLightColor,
  };
}

const COMMON_PARS = /* glsl */ `
uniform float uAgcTime;
uniform vec3 uAgcPal[8];
uniform vec4 uAgcPat;
uniform vec4 uAgcMat;
uniform vec4 uAgcV0;
uniform vec4 uAgcV1;
uniform vec4 uAgcF0;
uniform vec4 uAgcF1;
uniform float uAgcCI;
uniform float uAgcBoost;
uniform float uAgcHi;
uniform vec3 uAgcLight;
varying vec4 vAgcMask;
varying vec3 vAgcRest;
varying vec2 vAgcUv;
varying float vAgcScale;
`;

const SURF_STRUCT = /* glsl */ `
struct AgcSurf { vec3 albedo; float rough; float metal; float sss; vec3 sssCol; float alpha; vec3 emit; float height; float clear; float irid; };
AgcSurf agc;
float agcModelScale(){ return vAgcScale; }
/** 1 when a feature of this rest-space size is well resolved on screen, → 0 when sub-pixel (anti-alias fade). */
float agcResolve(float featureSize){ float px = length(fwidth(vAgcRest)); return 1.0 - smoothstep(0.25, 0.9, px / max(featureSize, 1e-6)); }
`;

export interface CritterMaterialOptions {
  /** Program family name (species + part). */
  name: string;
  fx: TankFXUniforms;
  u: CritterUniforms;
  /** GLSL defining `void agcSurface(inout AgcSurf s)`. */
  surface: string;
  /** GLSL defining `void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv)` (rest space, before skinning). */
  vertex?: string;
  /** Optional GLSL defining `void agcPost(inout ReflectedLight rl, vec3 N, vec3 V)`, run after lighting. */
  post?: string;
  params?: THREE.MeshPhysicalMaterialParameters;
  /** Bump amplitude multiplier (0 disables bump code). */
  bump?: number;
}

const DEFAULT_VERTEX = /* glsl */ `void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){}`;

/** Vertex helpers: axis rotations and pivoted rotation of position + normal. */
const AGC_VERT_LIB = /* glsl */ `
vec3 agcRotX(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c); }
vec3 agcRotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); }
vec3 agcRotZ(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x * c - v.y * s, v.x * s + v.y * c, v.z); }
/** Rotate p/n about pivot by Euler (x, y, z) applied in Y → X → Z order. */
void agcPivotRot(inout vec3 p, inout vec3 n, vec3 piv, vec3 e){
  vec3 d = p - piv;
  d = agcRotZ(agcRotX(agcRotY(d, e.y), e.x), e.z);
  n = agcRotZ(agcRotX(agcRotY(n, e.y), e.x), e.z);
  p = piv + d;
}
`;

export function createCritterMaterial(o: CritterMaterialOptions): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0, ...o.params });
  const vertex = o.vertex ?? DEFAULT_VERTEX;
  const bump = o.bump ?? 1;
  const key = `agc|${o.name}|${hashStr(o.surface + vertex + (o.post ?? '') + bump)}`;
  const u = o.u;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nattribute vec4 aMask;\nattribute vec4 aAux;\n${COMMON_PARS}\n${AGC_NOISE}\n${AGC_VERT_LIB}\n${vertex}\n`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>\n  vec3 agcP = position; vec3 agcN = objectNormal;\n  agcDeform(agcP, agcN, aMask, uv);\n  objectNormal = agcN;\n  vAgcRest = position; vAgcMask = aMask; vAgcUv = uv; vAgcScale = length(vec3(modelMatrix[0][0], modelMatrix[0][1], modelMatrix[0][2]));`,
      )
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed = agcP;`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\n${COMMON_PARS}\n${SURF_STRUCT}\n${AGC_NOISE}\n${AGC_BUMP}\n${o.surface}\n${o.post ? `#define AGC_POST\n${o.post}` : ''}\n`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
  agc.albedo = uAgcPal[0]; agc.rough = ${mat.roughness.toFixed(3)}; agc.metal = ${mat.metalness.toFixed(3)}; agc.sss = 0.0;
  agc.sssCol = vec3(1.0, 0.45, 0.35); agc.alpha = 1.0; agc.emit = vec3(0.0); agc.height = 0.0; agc.clear = 1.0; agc.irid = 1.0;
  agcSurface(agc);
  {
    float fade = smoothstep(0.0, 0.55, uAgcCI);
    agc.albedo = agcSat(agc.albedo, mix(0.42, 1.0, fade)) * mix(0.82, 1.0, fade);
    agc.albedo = agcSat(agc.albedo, 1.0 + 0.35 * uAgcBoost) * (1.0 + 0.22 * uAgcBoost);
  }
  diffuseColor.rgb *= agc.albedo;
  diffuseColor.a *= agc.alpha;`,
      )
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n  roughnessFactor = clamp(agc.rough, 0.03, 1.0);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n  metalnessFactor = clamp(agc.metal, 0.0, 1.0);`)
      .replace(
        '#include <normal_fragment_maps>',
        bump > 0
          ? `#include <normal_fragment_maps>\n  normal = agcPerturb(-vViewPosition, normal, agc.height * agcModelScale() * ${bump.toFixed(3)}, faceDirection);`
          : '#include <normal_fragment_maps>',
      )
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n  totalEmissiveRadiance += agc.emit;`)
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\n  material.clearcoat *= agc.clear;\n#endif\n#ifdef USE_IRIDESCENCE\n  material.iridescence *= agc.irid;\n#endif`,
      )
      .replace(
        '#include <lights_fragment_end>',
        /* glsl */ `#include <lights_fragment_end>
  {
    vec3 agcV = normalize(vViewPosition);
    vec3 agcUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
    float agcNdl = dot(normal, agcUp);
    float agcWrap = clamp((agcNdl + 0.8) / 1.8, 0.0, 1.0);
    float agcRim = pow(1.0 - clamp(abs(dot(normal, agcV)), 0.0, 1.0), 3.0);
    float agcBack = pow(clamp(dot(-agcV, agcUp) * 0.5 + 0.5, 0.0, 1.0), 2.0);
    vec3 agcL = uAgcLight;
    reflectedLight.indirectDiffuse += agc.sssCol * agcL * agc.sss * (0.2 * agcWrap + 0.3 * agcRim + 0.3 * agcBack);
#ifdef AGC_POST
    agcPost(reflectedLight, normal, agcV);
#endif
    // selection: a thin soft rim of light hugging the silhouette only — the animal's own colours stay untouched
    float agcSil = smoothstep(0.6, 0.97, 1.0 - clamp(abs(dot(normal, agcV)), 0.0, 1.0)) * (gl_FrontFacing ? 1.0 : 0.0);
    // capped low so thin parts that are all 'edge' (legs, antennae, gills) only take a faint tint, never a wash
    reflectedLight.indirectDiffuse += vec3(0.4, 1.0, 0.88) * uAgcHi * agcSil * agcSil * 0.85;
  }`,
      );
  };
  mat.customProgramCacheKey = () => key;
  patchUnderwaterMaterial(mat, o.fx);
  return mat;
}

/** Patch any plain material for underwater use (the shared patch handles InstancedMesh). */
export function underwaterMat<T extends THREE.Material>(mat: T, fx: TankFXUniforms): T {
  patchUnderwaterMaterial(mat, fx);
  return mat;
}

// ───────────────────────────── Eyes ─────────────────────────────

/**
 * Eye surface: geometry is a sphere centred at the origin gazing +Z. Palette: 0 iris, 1 pupil, 2 sclera,
 * 3 iris outer ring. uAgcF0 = (irisAngle, pupilAngle, pupilAspect, irisStriation). uAgcF1.x = catchlight strength.
 */
export const EYE_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  vec3 d = normalize(vAgcRest);
  float ang = acos(clamp(d.z, -1.0, 1.0));
  float irisA = uAgcF0.x; float pupA = uAgcF0.y;
  // elliptical pupil (aspect along x)
  vec2 dir = normalize(d.xy + 1e-5);
  float pa = pupA * mix(1.0, uAgcF0.z, abs(dir.x));
  float aa = fwidth(ang) * 1.5 + 0.004;
  float pupil = 1.0 - smoothstep(pa - aa, pa + aa, ang);
  float iris = 1.0 - smoothstep(irisA - aa, irisA + aa, ang);
  float phi = atan(d.y, d.x);
  float stri = 0.75 + 0.25 * sin(phi * 38.0 + agcVn(d * 20.0) * 4.0) * uAgcF0.w;
  float ringT = smoothstep(pa, irisA, ang);
  vec3 irisCol = mix(uAgcPal[0] * stri, uAgcPal[3], smoothstep(0.55, 1.0, ringT));
  irisCol *= 0.75 + 0.35 * smoothstep(pa, pa + 0.12, ang);
  vec3 col = mix(uAgcPal[2], irisCol, iris);
  col = mix(col, uAgcPal[1], pupil);
  s.albedo = col;
  s.rough = 0.18;
  s.clear = 1.0;
}
`;

export const EYE_POST = /* glsl */ `
void agcPost(inout ReflectedLight rl, vec3 N, vec3 V){
  vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  vec3 L1 = normalize(up * 0.85 + vec3(0.0, 0.0, 0.75) + vec3(-0.22, 0.0, 0.0));
  vec3 L2 = normalize(up * 0.2 + vec3(0.0, 0.0, 1.0) + vec3(0.35, -0.15, 0.0));
  vec3 R = reflect(-V, N);
  float c1 = pow(max(dot(R, L1), 0.0), 700.0);
  float c2 = pow(max(dot(R, L2), 0.0), 2200.0) * 0.45;
  float lvl = 0.35 + 0.65 * clamp(dot(uAgcLight, vec3(0.333)), 0.0, 2.0);
  rl.indirectDiffuse += vec3(c1 + c2) * 5.0 * uAgcF1.x * lvl;
}
`;
