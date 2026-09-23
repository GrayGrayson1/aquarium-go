/**
 * Underwater shading shared by every material inside a tank: animated caustics projected from the surface along the
 * fixture's light direction, and path-length water fog (per-channel absorption + height-graded in-scatter) computed
 * against the tank's water box — works from any camera angle.
 * OWNER: lane "waterfx". Other lanes: call `patchUnderwaterMaterial(mat, fx)` on materials rendered inside a tank,
 * or include UNDERWATER_PARS / UNDERWATER_APPLY in custom ShaderMaterials. Keep these signatures stable.
 *
 * Custom ShaderMaterials: pass the uniforms by reference (`uniforms: { ...fx, ...yours }`) so per-frame updates
 * propagate. Every uniform added after v1 degrades gracefully when missing (reads as 0).
 */
import * as THREE from 'three';
import { createContext, useContext } from 'react';
import { GLSL_CAUSTICS } from './glsl';
import { CAUSTIC_TILE_CELLS, CAUSTIC_WIDTHS, getCausticTexture } from './causticTexture';

export const MAX_RIPPLES = 12;
export const MAX_AGITATORS = 4;

export interface TankFXUniforms {
  uTime: { value: number };
  /** World → tank-local matrix. */
  uTankInv: { value: THREE.Matrix4 };
  /** (L/2, waterY, W/2) water box half-extents; box is x∈[-L/2,L/2], y∈[0,waterY], z∈[-W/2,W/2]. */
  uWaterBox: { value: THREE.Vector3 };
  uCausticIntensity: { value: number };
  uCausticScale: { value: number };
  /** Water tint (in-scatter colour at full light). */
  uWaterTint: { value: THREE.Color };
  /** Fog density per metre of water path. */
  uFogDensity: { value: number };
  /** Overhead light colour × intensity (drives caustic colour + fog brightness). */
  uLightColor: { value: THREE.Color };
  /** Camera position in world space (updated per frame). */
  uCamPos: { value: THREE.Vector3 };
  /** 0..1 party-mode hue shift amount. */
  uParty: { value: number };
  uPartyHue: { value: number };
  // ── v2 (lane waterfx) ──
  /** Tank-local direction the fixture light travels (normalised, y < 0). */
  uLightDir: { value: THREE.Vector3 };
  /** Per-channel absorption per metre (colour loss with path length). */
  uAbsorb: { value: THREE.Vector3 };
  /** 0/1 chromatic caustic split (high/ultra). */
  uCausticChroma: { value: number };
  /** 0..1 fixture on-ness (0 at night). */
  uDay: { value: number };
  /** Surface ripple rings: (x, z, startTime, strength) tank-local; strength 0 = unused. */
  uRipples: { value: THREE.Vector4[] };
  /** Surface agitation zones (bubbles/outflow): (x, z, radius, strength). */
  uAgitators: { value: THREE.Vector4[] };
  /** Global surface wave amplitude multiplier (flow/agitation). */
  uWaveAmp: { value: number };
  /** Fake top-down fixture fill for tanks rendered without a real light (LOD 1/2). 0 = off. */
  uFill: { value: number };
  // ── v3 (polish-render) ──
  /** In-scatter brightness of the lit water column (water class); 0/missing reads as 1. */
  uScatter: { value: number };
  // ── v4 (fix-facility) ──
  /** Baked caustic web (shared texture, see causticTexture.ts). */
  uCausticTex: { value: THREE.Texture };
}

/**
 * Fresh uniform set with NEUTRAL water (no fog, no absorption) so previews/portraits built from it never get a teal
 * cast; TankFXProvider fills in the per-tank fog, absorption, tint and light every frame.
 */
export function createTankFXUniforms(): TankFXUniforms {
  return {
    uTime: { value: 0 },
    uTankInv: { value: new THREE.Matrix4() },
    uWaterBox: { value: new THREE.Vector3(0.4, 0.3, 0.15) },
    uCausticIntensity: { value: 0.9 },
    uCausticScale: { value: 9 },
    uWaterTint: { value: new THREE.Color('#1c6e78') },
    uFogDensity: { value: 0 },
    uLightColor: { value: new THREE.Color('#ffffff') },
    uCamPos: { value: new THREE.Vector3() },
    uParty: { value: 0 },
    uPartyHue: { value: 0 },
    uLightDir: { value: new THREE.Vector3(0.12, -1, -0.1).normalize() },
    uAbsorb: { value: new THREE.Vector3(0, 0, 0) },
    uCausticChroma: { value: 0 },
    uDay: { value: 1 },
    uRipples: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)) },
    uAgitators: { value: Array.from({ length: MAX_AGITATORS }, () => new THREE.Vector4(0, 0, 0.05, 0)) },
    uWaveAmp: { value: 1 },
    uFill: { value: 0 },
    uScatter: { value: 1 },
    uCausticTex: { value: getCausticTexture() },
  };
}

/** Fallback uniforms for objects rendered outside a TankFX provider (portraits, previews). */
export const DEFAULT_TANK_FX = createTankFXUniforms();
DEFAULT_TANK_FX.uCausticIntensity.value = 0;
DEFAULT_TANK_FX.uFogDensity.value = 0;
DEFAULT_TANK_FX.uAbsorb.value.set(0, 0, 0);

export const TankFXContext = createContext<TankFXUniforms | null>(null);
export function useTankFX(): TankFXUniforms {
  return useContext(TankFXContext) ?? DEFAULT_TANK_FX;
}

const rippleHeads = new WeakMap<TankFXUniforms, number>();
/** Start a surface ripple ring at tank-local (x, z). `time` = fx.uTime.value of the current frame. */
export function addSurfaceRipple(fx: TankFXUniforms, x: number, z: number, strength = 1, time = fx.uTime.value): void {
  const i = rippleHeads.get(fx) ?? 0;
  fx.uRipples.value[i].set(x, z, time, strength);
  rippleHeads.set(fx, (i + 1) % MAX_RIPPLES);
}

export const UNDERWATER_PARS = /* glsl */ `
uniform float uTime;
uniform mat4 uTankInv;
uniform vec3 uWaterBox;
uniform float uCausticIntensity;
uniform float uCausticScale;
uniform vec3 uWaterTint;
uniform float uFogDensity;
uniform vec3 uLightColor;
uniform vec3 uCamPos;
uniform float uParty;
uniform float uPartyHue;
uniform vec3 uLightDir;
uniform vec3 uAbsorb;
uniform float uCausticChroma;
uniform float uDay;
uniform float uFill;
uniform float uScatter;
uniform sampler2D uCausticTex;
const vec3 AG_CAUSTIC_W = vec3(${CAUSTIC_WIDTHS.map((v) => v.toFixed(4)).join(', ')});
const float AG_CAUSTIC_INV_CELLS = ${(1 / CAUSTIC_TILE_CELLS).toFixed(6)};
${GLSL_CAUSTICS}
float agScatterGain(){ return uScatter > 0.0 ? uScatter : 1.0; }
// normalize() of an interpolated or transformed vector that may be zero (degenerate normals) yields NaN, and bloom
// smears a single NaN pixel across the whole frame: fall back to "up" instead
vec3 agSafeNormalize(vec3 n){
  float l = dot(n, n);
  return l > 1e-12 ? n * inversesqrt(l) : vec3(0.0, 1.0, 0.0);
}
// Distance travelled inside the water box from local point p toward local eye e.
float agWaterPath(vec3 p, vec3 e){
  vec3 dir = e - p; float len = length(dir); dir /= max(len, 1e-5);
  vec3 bmin = vec3(-uWaterBox.x, 0.0, -uWaterBox.z);
  vec3 bmax = vec3(uWaterBox.x, uWaterBox.y, uWaterBox.z);
  vec3 inv = 1.0 / (dir + sign(dir) * 1e-6 + vec3(1e-7));
  vec3 t1 = (bmin - p) * inv; vec3 t2 = (bmax - p) * inv;
  vec3 tmax = max(t1, t2);
  float tExit = min(min(tmax.x, tmax.y), tmax.z);
  return clamp(min(tExit, len), 0.0, 20.0);
}
vec3 agHueShift(vec3 c, float h){
  const vec3 k = vec3(0.57735);
  float ca = cos(h * 6.2831); float sa = sin(h * 6.2831);
  return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca);
}
vec3 agLightDirSafe(){
  vec3 L = uLightDir;
  if (dot(L, L) < 1e-4) L = vec3(0.0, -1.0, 0.0);
  L = normalize(L);
  L.y = min(L.y, -0.35);
  return normalize(L);
}
// Caustic light (colour, un-multiplied by albedo) arriving at tank-local point lp with local normal ln.
// Two drifting, gently warped samples of the baked web (causticTexture.ts): soft, fine and cheap, and mipmapped so
// distant tanks never sparkle. Focus: soft right under the surface, sharpest ~10–25 cm down, broadening deeper.
vec3 agCausticW3(float w){
  vec3 k = AG_CAUSTIC_W;
  float a = clamp((w - k.x) / (k.y - k.x), 0.0, 1.0);
  float b = clamp((w - k.y) / (k.z - k.y), 0.0, 1.0);
  return vec3(1.0 - a, a * (1.0 - b), b);
}
vec3 agCausticLight(vec3 lp, vec3 ln){
  if (uCausticIntensity <= 0.001) return vec3(0.0);
  vec3 L = agLightDirSafe();
  float depthM = max(uWaterBox.y - lp.y, 0.0);
  float facing = clamp(dot(ln, -L) * 0.9 + 0.1, 0.0, 1.0);
  facing *= facing;
  // project back along the light ray to where it crossed the (rippled) surface
  vec2 proj = lp.xz - L.xz * (depthM / -L.y);
  vec2 cp = proj * uCausticScale;
  float w = mix(0.3, 0.1, smoothstep(0.0, 0.14, depthM)) + depthM * 0.07;
  float t = uTime * 0.9;
  // slow flowing warp + two layers drifting against each other: the web keeps re-forming instead of scrolling
  vec2 q = cp + 0.28 * vec2(sin(cp.y * 0.61 + t * 0.43) + 0.5 * sin(cp.x * 1.13 - t * 0.31), sin(cp.x * 0.57 - t * 0.37) + 0.5 * sin(cp.y * 1.27 + t * 0.29));
  vec2 uvA = q * AG_CAUSTIC_INV_CELLS + vec2(t * 0.0105, -t * 0.0072);
  vec2 uvB = mat2(0.8, -0.6, 0.6, 0.8) * q * (1.37 * AG_CAUSTIC_INV_CELLS) + vec2(-t * 0.0081, t * 0.0097) + 0.37;
  vec3 A = texture2D(uCausticTex, uvA).rgb;
  vec3 B = texture2D(uCausticTex, uvB).rgb;
  vec3 c;
  if (uCausticChroma > 0.5) {
    // red focuses a little tighter, blue spreads wider: a faint dispersion fringe from the same two samples
    vec3 a = vec3(dot(A, agCausticW3(w * 0.82)), dot(A, agCausticW3(w)), dot(A, agCausticW3(w * 1.3)));
    vec3 b = vec3(dot(B, agCausticW3(w * 0.94)), dot(B, agCausticW3(w * 1.15)), dot(B, agCausticW3(w * 1.5)));
    c = (a * 0.5 + b * 0.4 + a * b * 0.9) * vec3(0.94, 1.0, 1.05);
  } else {
    float a = dot(A, agCausticW3(w));
    float b = dot(B, agCausticW3(w * 1.15));
    c = vec3(a * 0.5 + b * 0.4 + a * b * 0.9);
  }
  // light attenuates with depth; caustic contrast survives better in clear water
  float atten = exp(-depthM * (0.9 + uFogDensity * 0.6));
  vec3 caustic = uLightColor * c * uCausticIntensity * facing * (0.25 + 0.75 * atten);
  if (uParty > 0.0) caustic = mix(caustic, agHueShift(caustic, uPartyHue) * 1.4, uParty);
  return caustic;
}
// In-scatter colour of the water column at relative height h (0 bottom .. 1 surface).
vec3 agFogColor(float h){
  float lum = dot(uLightColor, vec3(0.3333));
  vec3 lightTint = uLightColor / max(lum, 1e-3);
  vec3 base = uWaterTint * mix(vec3(1.0), lightTint, 0.35);
  float grade = mix(0.28, 1.35, pow(h, 1.4));
  // brighter classes (clear freshwater under a strong fixture) glow most in the upper, better-lit water
  grade *= 1.0 + (agScatterGain() - 1.0) * (0.3 + 0.7 * h);
  // moonlit nights: the water column keeps a faint blue glow (in proportion to the dimmed, graded interior) instead of
  // turning black — lit sand under near-black water read as an empty, drained tank
  float night = (1.0 - clamp(uDay, 0.0, 1.0)) * (1.0 - clamp(uParty, 0.0, 1.0));
  vec3 col = base * (0.015 + lum * 0.3 + night * min(lum, 0.1) * 0.9) * grade;
  if (uParty > 0.0) col = mix(col, agHueShift(col, uPartyHue + 0.5) * 1.3, uParty * 0.8);
  return col;
}
// In-scatter at relative height h and |x| / half-length xr: the fixture hangs over the middle, so the lit water is a
// soft pool of light that dims a little toward the end panes (more so near the surface, where the beam is narrow).
vec3 agFogColorAt(float h, float xr){
  return agFogColor(h) * (1.0 - 0.18 * smoothstep(0.3, 1.0, xr) * (0.35 + 0.65 * h));
}
// Forward-scattered fixture light along a water path (glow just under the surface, fading with depth).
vec3 agSurfaceGlow(vec3 lp, vec3 le, float path){
  float yMid = mix(lp.y, clamp(le.y, 0.0, uWaterBox.y), 0.5);
  float depth = max(uWaterBox.y - yMid, 0.0);
  float lum = dot(uLightColor, vec3(0.3333));
  vec3 tint = mix(vec3(1.0), uWaterTint / max(dot(uWaterTint, vec3(0.3333)), 0.03), 0.55);
  return uLightColor * tint * (0.07 * exp(-depth * 7.0) + 0.02 * exp(-depth * 2.0)) * (1.0 - exp(-path * 3.0)) * uDay * sqrt(agScatterGain());
}
vec3 agApplyFog(vec3 col, vec3 lp){
  vec3 le = (uTankInv * vec4(uCamPos, 1.0)).xyz;
  float path = agWaterPath(lp, le);
  if (path <= 0.0) return col;
  vec3 T = exp(-(uAbsorb * 0.6 + vec3(uFogDensity)) * path);
  T = max(T, vec3(0.18));
  float hMid = clamp(mix(lp.y, clamp(le.y, 0.0, uWaterBox.y), 0.25) / max(uWaterBox.y, 0.05), 0.0, 1.0);
  float xr = abs(mix(lp.x, clamp(le.x, -uWaterBox.x, uWaterBox.x), 0.25)) / max(uWaterBox.x, 0.05);
  vec3 scatterT = vec3(exp(-uFogDensity * path));
  return col * T + agFogColorAt(hMid, xr) * (1.0 - max(scatterT, vec3(0.2))) + agSurfaceGlow(lp, le, path);
}
bool agInsideWater(vec3 lp){
  return abs(lp.x) <= uWaterBox.x + 0.002 && lp.y <= uWaterBox.y + 0.002 && lp.y >= -0.01 && abs(lp.z) <= uWaterBox.z + 0.002;
}
// Lights-out: the room's ambient light and reflections still reach everything inside the tank, so without this the
// animals stay brightly lit at midnight. As the fixture's on-ness (uDay) falls, grade the lit surface toward dim
// moonlight blue: darker and cooler, but silhouettes and colour patterns stay readable. Party mode opts out.
vec3 agNightGrade(vec3 col){
  float night = (1.0 - clamp(uDay, 0.0, 1.0)) * (1.0 - clamp(uParty, 0.0, 1.0));
  if (night <= 0.002) return col;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 moon = vec3(0.34, 0.5, 1.0) * lum * 0.46 + col * 0.12;
  return mix(col, moon, night * 0.86);
}
vec3 agApplyUnderwaterAlbedo(vec3 col, vec3 worldPos, vec3 worldNormal, vec3 albedo){
  vec3 lp = (uTankInv * vec4(worldPos, 1.0)).xyz;
  if (!agInsideWater(lp)) return col;
  vec3 ln = agSafeNormalize(mat3(uTankInv) * worldNormal);
  col += agCausticLight(lp, ln) * albedo * 0.95;
  // LOD 1/2 tanks have no real fixture light: a cheap top-down fill keeps decor modelled and colourful
  if (uFill > 0.0) col += albedo * uLightColor * uFill * (0.25 + 0.75 * clamp(ln.y * 0.5 + 0.5, 0.0, 1.0)) * (0.55 + 0.45 * clamp(lp.y / max(uWaterBox.y, 0.05), 0.0, 1.0));
  col = agNightGrade(col);
  return agApplyFog(col, lp);
}
vec3 agApplyUnderwater(vec3 col, vec3 worldPos, vec3 worldNormal){
  return agApplyUnderwaterAlbedo(col, worldPos, worldNormal, vec3(0.6));
}
`;

/** Snippet to run at the end of a fragment shader (expects vAgWorldPos, vAgWorldNormal varyings). */
export const UNDERWATER_APPLY = /* glsl */ `
gl_FragColor.rgb = agApplyUnderwater(gl_FragColor.rgb, vAgWorldPos, agSafeNormalize(vAgWorldNormal));
`;

/** Variant used by patched built-in materials (their `diffuseColor` is in scope → caustics scale with albedo). */
const UNDERWATER_APPLY_BUILTIN = /* glsl */ `
gl_FragColor.rgb = agApplyUnderwaterAlbedo(gl_FragColor.rgb, vAgWorldPos, agSafeNormalize(vAgWorldNormal), diffuseColor.rgb);
`;

const patched = new WeakSet<THREE.Material>();

/** Vertex snippet writing vAgWorldPos / vAgWorldNormal (instancing + batching aware). */
function agWorldVaryings(normalExpr: string): string {
  return `
  vec4 agWp = vec4(transformed, 1.0);
  vec3 agN = ${normalExpr};
  #ifdef USE_BATCHING
    agWp = batchingMatrix * agWp;
    agN = mat3(batchingMatrix) * agN;
  #endif
  #ifdef USE_INSTANCING
    agWp = instanceMatrix * agWp;
    agN = mat3(instanceMatrix) * agN;
  #endif
  agWp = modelMatrix * agWp;
  vAgWorldPos = agWp.xyz;
  vec3 agWn = mat3(modelMatrix) * agN;
  float agWl = dot(agWn, agWn);
  vAgWorldNormal = agWl > 1e-12 ? agWn * inversesqrt(agWl) : vec3(0.0, 1.0, 0.0);`;
}

/** Vertex snippet for custom ShaderMaterials: declare `varying vec3 vAgWorldPos, vAgWorldNormal;` and run this
 * after computing `vec3 transformed` (object-space position) — handles instancing. */
export const UNDERWATER_VERTEX = agWorldVaryings('vec3(normal)');

/**
 * Patch a built-in material (Standard/Physical/Lambert/Phong/Toon/Basic...) with underwater caustics + fog for a
 * given tank. Safe to call more than once. Preserves any existing onBeforeCompile.
 */
export function patchUnderwaterMaterial(mat: THREE.Material, fx: TankFXUniforms): THREE.Material {
  if (patched.has(mat)) return mat;
  patched.add(mat);
  const prev = mat.onBeforeCompile?.bind(mat);
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer);
    Object.assign(shader.uniforms, fx);
    // MeshBasic only declares objectNormal when it has an env map / skinning — fall back to the raw attribute.
    const m = mat as THREE.Material & { isMeshBasicMaterial?: boolean; isShaderMaterial?: boolean; isPointsMaterial?: boolean };
    const nrm = m.isMeshBasicMaterial || m.isShaderMaterial || m.isPointsMaterial ? 'vec3(normal)' : 'objectNormal';
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vAgWorldPos;\nvarying vec3 vAgWorldNormal;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${agWorldVaryings(nrm)}`);
    const hasDiffuse = /vec4 diffuseColor\s*=/.test(shader.fragmentShader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vAgWorldPos;\nvarying vec3 vAgWorldNormal;\n${UNDERWATER_PARS}`)
      .replace('#include <dithering_fragment>', `${hasDiffuse ? UNDERWATER_APPLY_BUILTIN : UNDERWATER_APPLY}\n#include <dithering_fragment>`);
  };
  const prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}|ag-underwater-v2`;
  mat.needsUpdate = true;
  return mat;
}
