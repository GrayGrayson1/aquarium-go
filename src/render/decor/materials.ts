/**
 * Decor materials: MeshStandardMaterial + shader injections, always patched with the tank's underwater FX.
 * OWNER: lane "aquascape".
 *
 *  solid        rock / wood / ceramic — vertex colour, per-vertex roughness, procedural micro-bump + albedo grain
 *  solidDouble  thin shells (cholla lattice, shells, dishes, clay tubes)
 *  foliage      plants & macroalgae — flow sway, growth emergence, leaf translucency (backlit by the tank light)
 *  coral        corals & anemones — tentacle sway, polyp contraction, fish "nestle", actinic fluorescence
 */
import * as THREE from 'three';
import { patchUnderwaterMaterial, type TankFXUniforms } from '../shared/underwater';
import type { MatClass } from './gen';

export interface DecorTankUniforms {
  uBeat: { value: number };
  uActinic: { value: number };
  uGlowGain: { value: number };
  uTransl: { value: number };
  uBump: { value: number };
  /** Steady flow push in tank space (m) — used by merged LOD meshes. */
  uFlowTank: { value: THREE.Vector3 };
  uSwayScale: { value: number };
}

export interface DecorItemUniforms {
  uGrowth: { value: number };
  /** x = amplitude (m, object space), y = speed, z = phase offset, w = party bob (m). */
  uSway: { value: THREE.Vector4 };
  /** Steady flow push in object space. */
  uFlowLocal: { value: THREE.Vector3 };
  uContract: { value: number };
  /** Nearby fish in object space (xyz) + strength (w) — anemone tentacles part around a clownfish. */
  uFish: { value: THREE.Vector4 };
  /** 0..1 health: plants yellow/melt, corals bleach, botanicals darken as it drops. */
  uHealth: { value: number };
  /** Leaf venation: x = lateral veins along the blade (<0 = parallel veins), y = vein sweep, z = contrast, w = mottling. */
  uLeaf: { value: THREE.Vector4 };
}

export function createTankUniforms(): DecorTankUniforms {
  return {
    uBeat: { value: 0 },
    uActinic: { value: 0.2 },
    uGlowGain: { value: 0.55 },
    uTransl: { value: 0.55 },
    uBump: { value: 1 },
    uFlowTank: { value: new THREE.Vector3() },
    uSwayScale: { value: 1 },
  };
}

export function createItemUniforms(): DecorItemUniforms {
  return {
    uGrowth: { value: 1 },
    uSway: { value: new THREE.Vector4(0.01, 0.9, 0, 0.004) },
    uFlowLocal: { value: new THREE.Vector3() },
    uContract: { value: 0 },
    uFish: { value: new THREE.Vector4(0, -10, 0, 0) },
    uHealth: { value: 1 },
    uLeaf: { value: new THREE.Vector4(7, 1.4, 0.35, 0.6) },
  };
}

// Original shader helpers (value noise + derivative bump), written for Aquarium Go.
const NOISE_GLSL = /* glsl */ `
float agdHash3(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float agdNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(agdHash3(i), agdHash3(i + vec3(1,0,0)), f.x), mix(agdHash3(i + vec3(0,1,0)), agdHash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(agdHash3(i + vec3(0,0,1)), agdHash3(i + vec3(1,0,1)), f.x), mix(agdHash3(i + vec3(0,1,1)), agdHash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
vec3 agdBump(vec3 surfPos, vec3 n, float h){
  vec3 dpdx = dFdx(surfPos); vec3 dpdy = dFdy(surfPos);
  float dhx = dFdx(h); float dhy = dFdy(h);
  vec3 r1 = cross(dpdy, n); vec3 r2 = cross(n, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  vec3 r = abs(det) * n - grad;
  float l2 = dot(r, r);
  return l2 > 1e-30 ? r * inversesqrt(l2) : n; // det can be 0 (edge-on pixel quads): never normalize(0) -> NaN
}
// normalize() that can't produce NaN when opposite vertex normals interpolate to ~0
vec3 agdSafeN(vec3 v){ float l2 = dot(v, v); return l2 > 1e-12 ? v * inversesqrt(l2) : vec3(0.0, 0.0, 1.0); }
`;

/** A zero-length normal attribute would make three's normalize() (and the underwater world normal) NaN. */
const NORMAL_GUARD = /* glsl */ `if (dot(objectNormal, objectNormal) < 1e-12) objectNormal = vec3(0.0, 1.0, 0.0);`;
const SAFE_NORMAL_BEGIN = THREE.ShaderChunk.normal_fragment_begin.replace('normalize( vNormal )', 'agdSafeN( vNormal )');

const VERT_PARS = /* glsl */ `
attribute vec4 aSway;
attribute vec3 aPivot;
attribute vec4 aExtra;
varying vec3 vObj;
varying vec4 vExtra;
uniform float uTime;
uniform float uGrowth;
uniform vec4 uSway;
uniform vec3 uFlowLocal;
uniform float uBeat;
uniform float uContract;
uniform vec4 uFish;
uniform float uSwayScale;
`;

const VERT_MAIN = /* glsl */ `
vObj = position;
vExtra = aExtra;
#ifdef AG_SWAY
{
  float em = smoothstep(aSway.w, aSway.w + 0.14, uGrowth);
  #ifdef AG_CONTRACT
  em *= 1.0 - uContract * 0.5 * aSway.x;
  #endif
  transformed = aPivot + (transformed - aPivot) * em;
  float w = aSway.x;
  float ph = aSway.y + uSway.z;
  float t = uTime * uSway.y;
  vec3 off = vec3(sin(t + ph) * 0.62 + sin(t * 1.73 + ph * 1.31) * 0.38, 0.0,
                  cos(t * 0.83 + ph * 0.71) * 0.55 + sin(t * 1.37 + ph * 2.1) * 0.3);
  float amp = uSway.x * aSway.z * uSwayScale * (1.0 + uBeat * 1.6);
  off = off * amp + uFlowLocal * aSway.z * (0.7 + 0.3 * sin(t * 0.41 + ph));
  off *= w * w;
  transformed += off;
  transformed.y += uBeat * uSway.w * w;
  #ifdef AG_CONTRACT
  {
    vec3 dv = transformed - uFish.xyz;
    float dd = length(dv);
    transformed += (dv / max(dd, 1e-4)) * uFish.w * smoothstep(0.07, 0.0, dd) * 0.014 * w;
  }
  #endif
}
#endif
`;

const FRAG_PARS = /* glsl */ `
varying vec3 vObj;
varying vec4 vExtra;
uniform float uActinic;
uniform float uGlowGain;
uniform float uTransl;
uniform float uBump;
uniform float uHealth;
uniform vec4 uLeaf;
${NOISE_GLSL}
`;

export function makeDecorMaterial(kind: MatClass, fx: TankFXUniforms, tankU: DecorTankUniforms, itemU: DecorItemUniforms | null, opts: { lowDetail?: boolean } = {}): THREE.MeshStandardMaterial {
  const solid = kind === 'solid' || kind === 'solidDouble';
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: solid ? 0.86 : kind === 'coral' ? 0.5 : 0.62,
    metalness: 0,
    side: kind === 'solid' ? THREE.FrontSide : THREE.DoubleSide,
    envMapIntensity: 0.55,
  });
  const defines: Record<string, string> = {};
  if (!solid) defines.AG_SWAY = '';
  if (solid && !opts.lowDetail) defines.AG_DETAIL = '';
  if (kind === 'foliage') {
    defines.AG_TRANSLUCENT = '';
    defines.AG_LEAF = '';
  }
  if (kind === 'coral') {
    defines.AG_GLOW = '';
    defines.AG_CONTRACT = '';
    defines.AG_TRANSLUCENT = '';
  }
  mat.defines = defines;
  const iu = itemU ?? createItemUniforms();
  if (!itemU) iu.uFlowLocal = tankU.uFlowTank;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGrowth = iu.uGrowth;
    shader.uniforms.uSway = iu.uSway;
    shader.uniforms.uFlowLocal = iu.uFlowLocal;
    shader.uniforms.uContract = iu.uContract;
    shader.uniforms.uFish = iu.uFish;
    shader.uniforms.uHealth = iu.uHealth;
    shader.uniforms.uLeaf = iu.uLeaf;
    shader.uniforms.uBeat = tankU.uBeat;
    shader.uniforms.uSwayScale = tankU.uSwayScale;
    shader.uniforms.uActinic = tankU.uActinic;
    shader.uniforms.uGlowGain = tankU.uGlowGain;
    shader.uniforms.uTransl = tankU.uTransl;
    shader.uniforms.uBump = tankU.uBump;
    shader.uniforms.uTime = fx.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${NORMAL_GUARD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_PARS}`)
      .replace('#include <normal_fragment_begin>', SAFE_NORMAL_BEGIN)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
#ifdef AG_DETAIL
  {
    float gA = agdNoise(vObj * 170.0);
    float gB = agdNoise(vObj * 560.0);
    diffuseColor.rgb *= 0.9 + 0.2 * gA * min(1.5, vExtra.w) + 0.1 * (gB - 0.5);
  }
#endif
#ifdef AG_LEAF
  if (vExtra.w > 1.9) {
    float lt = clamp(vExtra.z, 0.0, 1.0);
    float as = abs(vExtra.w - 3.0);
    float rib = 1.0 - smoothstep(0.015, 0.07, as);
    float veins;
    if (uLeaf.x < 0.0) {
      float pv = abs(fract(as * -uLeaf.x) - 0.5);
      veins = 1.0 - smoothstep(0.0, 0.12, pv);
    } else {
      float lv = abs(fract(lt * uLeaf.x - as * uLeaf.y) - 0.5);
      veins = (1.0 - smoothstep(0.0, 0.07, lv)) * smoothstep(0.06, 0.18, as) * (1.0 - smoothstep(0.82, 0.98, as));
    }
    float cellN = agdNoise(vObj * 1100.0) * 0.6 + agdNoise(vObj * 260.0) * 0.4;
    vec3 base = diffuseColor.rgb;
    diffuseColor.rgb = base * (0.95 + rib * uLeaf.z * 0.9 + veins * uLeaf.z * 0.45);
    diffuseColor.rgb *= 0.9 + 0.2 * cellN * uLeaf.w;
    diffuseColor.rgb *= 1.0 - smoothstep(0.78, 1.0, as) * 0.22;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 1.12, 0.85), smoothstep(0.7, 1.0, lt) * 0.35);
    // two-sided: the underside (the winding front face — leaf() builds blades facing down) is paler and greyer
    if (gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 1.1, 0.96) + vec3(0.015, 0.02, 0.012), 0.45);
  }
#endif
#ifdef AG_SWAY
  {
    float hl = smoothstep(0.12, 0.7, uHealth);
#ifdef AG_GLOW
    diffuseColor.rgb = mix(vec3(0.93, 0.91, 0.87), diffuseColor.rgb, hl);
#else
    float lum = dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2));
    diffuseColor.rgb = mix(vec3(lum * 1.1, lum * 0.85, lum * 0.35), diffuseColor.rgb, hl);
#endif
  }
#endif`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
#ifdef AG_LEAF
  roughnessFactor = clamp(roughnessFactor * (0.5 + vExtra.y), 0.06, 1.0);
#else
  roughnessFactor = clamp(roughnessFactor * (0.5 + vExtra.y) * mix(1.0, 0.72, clamp(vExtra.z, 0.0, 1.0) * 0.6), 0.06, 1.0);
#endif`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
#ifdef AG_DETAIL
  {
    // amplitude ∝ wavelength (constant slope); octaves fade out once they're sub-pixel
    float fA = clamp(1.4 - length(fwidth(vObj * 240.0)) * 0.9, 0.0, 1.0);
    float fB = clamp(1.4 - length(fwidth(vObj * 760.0)) * 0.9, 0.0, 1.0);
    float hb = (agdNoise(vObj * 240.0) * fA / 240.0 * 0.7 + agdNoise(vObj * 760.0) * fB / 760.0 * 0.45) * min(vExtra.w, 2.0);
    normal = agdBump(-vViewPosition, normal, hb * 0.55 * uBump);
  }
#endif
#ifdef AG_LEAF
  if (vExtra.w > 1.9) {
    // Curved blade shading on few vertices: tilt the normal across the blade (cupped toward the midrib, with a
    // soft crease along the rib). The across-blade direction is the surface gradient of the leaf coordinate s.
    float sA = clamp(vExtra.w - 3.0, -1.0, 1.0);
    vec3 dpx = dFdx(-vViewPosition); vec3 dpy = dFdy(-vViewPosition);
    float dsx = dFdx(sA); float dsy = dFdy(sA);
    vec3 q1 = cross(dpy, normal); vec3 q2 = cross(normal, dpx);
    float dt = dot(dpx, q1);
    vec3 gs = (dsx * q1 + dsy * q2) * sign(dt);
    float gl2 = dot(gs, gs);
    if (gl2 > 1e-30) {
      vec3 across = gs * inversesqrt(gl2);
      float tilt = 0.5 * sA + 0.22 * sign(sA) * (1.0 - smoothstep(0.0, 0.14, abs(sA)));
      normal = agdSafeN(normal + faceDirection * across * tilt);
    }
  }
#endif`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
#ifdef AG_GLOW
  totalEmissiveRadiance += diffuseColor.rgb * vExtra.x * uGlowGain * (0.25 + 0.95 * uActinic);
#endif`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
#ifdef AG_TRANSLUCENT
  {
    vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
    float back = clamp(-dot(normal, upV), 0.0, 1.0);
    float lum = dot(uLightColor, vec3(0.3333));
    reflectedLight.indirectDiffuse += diffuseColor.rgb * uTransl * (0.2 + 0.8 * back) * (0.25 + 0.75 * lum);
#ifdef AG_LEAF
    // thin leaves glow where the fixture light passes through them: strongest near the surface, lime-gold
    // (chlorophyll transmits green-yellow), and most on blades seen edge-on / from below against the light
    {
      vec3 lpT = (uTankInv * vec4(vAgWorldPos, 1.0)).xyz;
      float depthT = max(uWaterBox.y - lpT.y, 0.0);
      float reach = exp(-depthT * 3.2) * 0.8 + 0.2;
      float side = 1.0 - abs(dot(normal, normalize(vViewPosition)));
      vec3 trans = diffuseColor.rgb * vec3(1.0, 1.22, 0.5);
      // back-lit blades (seen from the shaded side) glow more; the thin edges transmit more than the midrib
      float thin = 0.8 + 0.35 * smoothstep(0.2, 0.95, abs(vExtra.w - 3.0)) * step(1.9, vExtra.w);
      reflectedLight.indirectDiffuse += trans * uTransl * lum * uDay * reach * (0.55 + 0.45 * side + 0.8 * back) * 0.9 * thin;
    }
#endif
  }
#endif`,
      );
  };
  mat.customProgramCacheKey = () => `agdecor-${kind}-${opts.lowDetail ? 'lo' : 'hi'}`;
  patchUnderwaterMaterial(mat, fx);
  return mat;
}
