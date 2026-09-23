/**
 * Substrate bed: heightfield geometry (top) + cross-section skirts against the glass, and a procedural
 * grain shader (sand ripples, gravel pebbles, aquasoil granules, aragonite with shell grit) with a wet sheen.
 * OWNER: lane "aquascape".
 */
import * as THREE from 'three';
import type { Tank, SubstrateKind } from '@/types';
import { tankDims } from '@/sim/tankSpace';
import { substrateHeightAt } from '@/sim/aquascape/terrain';
import { patchUnderwaterMaterial, type TankFXUniforms } from '../shared/underwater';

export interface SubstrateLook {
  /** 0 sand, 1 gravel, 2 soil, 3 aragonite, 4 pebbles */
  mode: number;
  grain: number; // metres (cell size)
  a: string;
  b: string;
  c: string;
  ripple: number;
}

export function substrateLook(kind: SubstrateKind, color: string): SubstrateLook {
  const base = new THREE.Color(color);
  const lighter = '#' + base.clone().lerp(new THREE.Color('#ffffff'), 0.28).getHexString();
  const darker = '#' + base.clone().multiplyScalar(0.55).getHexString();
  switch (kind) {
    case 'fine_sand':
      return { mode: 0, grain: 0.00045, a: color, b: lighter, c: darker, ripple: 1 };
    case 'sand':
      return { mode: 0, grain: 0.0009, a: color, b: lighter, c: darker, ripple: 0.7 };
    case 'aragonite':
      return { mode: 3, grain: 0.0012, a: color, b: '#fbf7ee', c: '#b8a88a', ripple: 0.45 };
    case 'planted_soil':
      // aquasoil: fine 1.5–2.5 mm granules (rendered as round, loosely packed grains — see agsGranule)
      return { mode: 2, grain: 0.0021, a: color, b: '#5e4c3a', c: '#15110d', ripple: 0 };
    case 'fine_gravel':
      return { mode: 1, grain: 0.0032, a: color, b: lighter, c: darker, ripple: 0 };
    case 'gravel':
      return { mode: 1, grain: 0.0062, a: color, b: lighter, c: darker, ripple: 0 };
    case 'large_pebbles':
      return { mode: 4, grain: 0.022, a: color, b: lighter, c: darker, ripple: 0 };
    default:
      return { mode: 0, grain: 0.0008, a: color, b: lighter, c: darker, ripple: 0.3 };
  }
}

/** Top heightfield (tank-local, y up) and skirt geometry for the four glass faces. */
export function buildSubstrateGeometry(tank: Tank, lod: number): { top: THREE.BufferGeometry; skirt: THREE.BufferGeometry } {
  const d = tankDims(tank);
  const res = lod === 0 ? 210 : lod === 1 ? 70 : 18;
  const nx = Math.max(8, Math.min(260, Math.round(d.L * res)));
  const nz = Math.max(4, Math.min(140, Math.round(d.W * res)));
  const eps = 0.0006; // keep just inside the glass
  const xs = (i: number) => -d.L / 2 + eps + (i / nx) * (d.L - 2 * eps);
  const zs = (j: number) => -d.W / 2 + eps + (j / nz) * (d.W - 2 * eps);
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) pos.push(xs(i), substrateHeightAt(tank, xs(i), zs(j)), zs(j));
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const e = c + 1;
      idx.push(a, c, b, b, c, e);
    }
  const top = new THREE.BufferGeometry();
  top.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  top.setIndex(idx);
  top.computeVertexNormals();

  // skirts: front, back, left, right — vertical strips from the glass floor to the surface
  const sp: number[] = [];
  const sn: number[] = [];
  const si: number[] = [];
  const strip = (pts: [number, number][], nrm: [number, number, number]) => {
    const base = sp.length / 3;
    for (const [x, z] of pts) {
      const y = substrateHeightAt(tank, x, z);
      sp.push(x, 0, z, x, y, z);
      sn.push(...nrm, ...nrm);
    }
    for (let k = 0; k < pts.length - 1; k++) {
      const a = base + k * 2;
      si.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  };
  const front: [number, number][] = [];
  const back: [number, number][] = [];
  for (let i = 0; i <= nx; i++) {
    front.push([xs(i), d.W / 2 - eps]);
    back.push([xs(nx - i), -d.W / 2 + eps]);
  }
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let j = 0; j <= nz; j++) {
    right.push([d.L / 2 - eps, zs(nz - j)]);
    left.push([-d.L / 2 + eps, zs(j)]);
  }
  strip(front, [0, 0, 1]);
  strip(back, [0, 0, -1]);
  strip(right, [1, 0, 0]);
  strip(left, [-1, 0, 0]);
  const skirt = new THREE.BufferGeometry();
  skirt.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  skirt.setAttribute('normal', new THREE.Float32BufferAttribute(sn, 3));
  skirt.setIndex(si);
  return { top, skirt };
}

export interface SubstrateUniforms {
  uMode: { value: number };
  uGrain: { value: number };
  uRipple: { value: number };
  uColA: { value: THREE.Color };
  uColB: { value: THREE.Color };
  uColC: { value: THREE.Color };
  uDepth: { value: number };
  uAlgae: { value: number };
}

export function createSubstrateUniforms(): SubstrateUniforms {
  return {
    uMode: { value: 0 },
    uGrain: { value: 0.001 },
    uRipple: { value: 1 },
    uColA: { value: new THREE.Color('#d9ccb0') },
    uColB: { value: new THREE.Color('#efe6d6') },
    uColC: { value: new THREE.Color('#8a7c68') },
    uDepth: { value: 0.03 },
    uAlgae: { value: 0 },
  };
}

// Original substrate shading for Aquarium Go (cellular grains + ripples + derivative bump).
const SUB_PARS = /* glsl */ `
varying vec3 vSubLocal;
uniform float uMode;
uniform float uGrain;
uniform float uRipple;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform float uDepth;
uniform float uAlgae;
float agsSubH;
float agsWet;
vec2 agsHash22(vec2 p){ vec3 a = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); a += dot(a, a.yzx + 33.33); return fract((a.xx + a.yz) * a.zy); }
float agsHash12(vec2 p){ vec3 a = fract(vec3(p.xyx) * 0.1031); a += dot(a, a.yzx + 33.33); return fract((a.x + a.y) * a.z); }
float agsNoise(vec2 x){ vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(agsHash12(i), agsHash12(i + vec2(1,0)), f.x), mix(agsHash12(i + vec2(0,1)), agsHash12(i + vec2(1,1)), f.x), f.y); }
// returns (F1, F2, cell id hash)
vec3 agsCells(vec2 x){
  vec2 n = floor(x); vec2 f = fract(x);
  float f1 = 8.0; float f2 = 8.0; float id = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = agsHash22(n + g) * 0.8 + 0.1;
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < f1) { f2 = f1; f1 = d; id = agsHash12(n + g + 17.0); } else if (d < f2) { f2 = d; }
  }
  return vec3(sqrt(f1), sqrt(f2), id);
}
// Round granules of random size with gaps between them (no polygonal cell edges): (dome 0..1, id).
vec2 agsGranule(vec2 x, float seed){
  vec2 n = floor(x); vec2 f = fract(x);
  float best = 0.0; float id = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 cid = n + g + seed;
    vec2 o = agsHash22(cid) * 0.7 + 0.15;
    float rad = 0.36 + 0.2 * agsHash12(cid + 5.3);
    vec2 r = g + o - f;
    r.x *= 0.9 + 0.2 * agsHash12(cid + 9.1); // slightly oval grains
    float d2 = dot(r, r) / (rad * rad);
    float dome = sqrt(max(0.0, 1.0 - d2));
    if (dome > best) { best = dome; id = agsHash12(cid + 17.0); }
  }
  return vec2(best, id);
}
void agsSubstrate(vec3 p, vec2 uv, float section, out vec3 col, out float h, out float wet){
  float fw = max(fwidth(uv.x), fwidth(uv.y));
  float cell = uGrain;
  float detail = clamp(1.0 - fw / (cell * 0.9), 0.0, 1.0); // fade grains when sub-pixel
  float big = agsNoise(uv * 9.0) * 0.6 + agsNoise(uv * 23.0) * 0.4;
  col = mix(uColA, uColB, big * 0.35);
  h = 0.0;
  wet = 0.35;
  if (uMode < 0.5 || (uMode > 2.5 && uMode < 3.5)) {
    // sand / aragonite: ripples + speckled grains
    float rip = 0.0;
    if (section < 0.5) {
      float warp = agsNoise(uv * 14.0) * 2.4;
      rip = sin((uv.x * 0.83 + uv.y * 0.55) * 250.0 + warp) * 0.5 + 0.5;
      rip = pow(rip, 1.6) * uRipple;
      col *= 0.93 + 0.12 * rip;
    }
    vec3 c = agsCells(uv / cell);
    float g = mix(0.5, c.z, detail);
    col *= 0.86 + 0.26 * g;
    col = mix(col, uColC, step(0.93, c.z) * 0.5 * detail);
    col = mix(col, uColB * 1.08, step(0.975, agsHash12(floor(uv / cell) + 3.0)) * detail * 0.7);
    if (uMode > 2.5) {
      // aragonite: pink/white shell grit
      vec3 s = agsCells(uv / (cell * 4.5) + 7.0);
      float shell = step(0.88, s.z) * smoothstep(0.42, 0.2, s.x);
      col = mix(col, mix(vec3(0.95, 0.78, 0.74), vec3(1.0, 0.97, 0.92), fract(s.z * 13.0)), shell * 0.8 * clamp(1.0 - fw / (cell * 3.0), 0.0, 1.0));
      h += shell * 0.4;
    }
    h += rip * 0.6 + (1.0 - c.x) * 0.35 * detail;
    wet = 0.3 + 0.25 * (1.0 - rip);
  } else if (uMode > 1.5 && uMode < 2.5) {
    // aquasoil: three offset layers of small round granules — upper grains sit on lower ones, the gaps
    // between them fall into dark crevices. Reads as loose granular soil instead of cobblestone tiles.
    float gh = 0.6;
    float id = 0.5;
    float depth = 0.9;
    if (detail > 0.001) { // grains resolve on screen (skipped for distant substrate — it's the costly part)
      vec2 q = uv / cell;
      vec2 g1 = agsGranule(q, 0.0);
      vec2 g2 = agsGranule(q * 1.13 + vec2(0.47, 0.29), 31.0);
      vec2 g3 = agsGranule(q * 0.87 + vec2(0.13, 0.71), 63.0);
      float h1 = g1.x;
      float h2 = g2.x * 0.78;
      float h3 = g3.x * 0.6;
      gh = max(h1, max(h2, h3));
      id = h1 >= gh ? g1.y : (h2 >= gh ? g2.y : g3.y);
      depth = h1 >= gh ? 1.0 : (h2 >= gh ? 0.8 : 0.62);
    }
    vec3 pc = mix(uColA, uColC, fract(id * 7.3) * 0.6);
    pc = mix(pc, uColB, step(0.94, id) * 0.65);           // the odd lighter, weathered grain
    pc *= 0.9 + 0.2 * agsNoise(uv / cell * 3.1 + id * 11.0); // micro-pitting
    pc *= (0.42 + 0.7 * gh) * depth;                         // dome shading + depth
    pc = mix(uColC * 0.35, pc, smoothstep(0.0, 0.12, gh));    // crevices
    vec3 far = mix(uColA, uColC, 0.3) * 0.72 * (0.88 + 0.24 * big); // what the grains average to from afar
    col = mix(far, pc, detail * 0.92 + 0.08);
    h = mix(0.5, gh * depth, detail);
    wet = 0.2 + 0.55 * gh * gh * detail;
  } else {
    // pebbles / gravel
    float scale = uMode > 3.5 ? 1.0 : 1.0;
    vec3 c = agsCells(uv / (cell * scale));
    float r = clamp(c.x / 0.62, 0.0, 1.0);
    float dome = sqrt(max(0.0, 1.0 - r * r));
    float edge = smoothstep(0.0, 0.18, c.y - c.x);
    float id = c.z;
    vec3 pc;
    pc = mix(uColA, uColB, fract(id * 3.1));
    pc = mix(pc, uColC, step(0.7, fract(id * 5.7)) * 0.6);
    pc = mix(pc, vec3(0.9, 0.88, 0.84) * dot(uColB, vec3(0.4)), step(0.92, fract(id * 11.1)) * 0.7);
    pc *= 0.8 + 0.35 * dome;
    pc *= mix(0.35, 1.0, edge); // crevice occlusion
    col = mix(col * 0.85, pc, detail * 0.9 + 0.1);
    h = mix(0.5, dome * edge, detail);
    wet = 0.25 + 0.5 * dome * detail;
  }
  if (section > 0.5) {
    // cross-section against the glass: strata, darker & denser toward the bottom, bright top rim
    float depthT = clamp(p.y / max(0.004, uDepth), 0.0, 1.5);
    float strata = agsNoise(vec2(uv.x * 30.0, p.y * 900.0));
    col *= 0.62 + 0.38 * smoothstep(0.0, 0.9, depthT) + (strata - 0.5) * 0.12;
    if (uMode > 1.5 && uMode < 2.5) {
      // lighter base layer under aquasoil
      float base = 1.0 - smoothstep(0.28, 0.36, depthT + (agsNoise(uv * 60.0) - 0.5) * 0.08);
      col = mix(col, mix(vec3(0.46, 0.4, 0.33), vec3(0.62, 0.56, 0.46), agsNoise(uv / 0.0012)), base);
    }
    col *= mix(0.55, 1.0, smoothstep(0.0, 0.12, depthT));
    wet = 0.9;
  }
  // algae film on the bed
  col = mix(col, vec3(0.16, 0.26, 0.08), uAlgae * 0.45 * (0.5 + 0.5 * agsNoise(uv * 30.0)));
}
`;

export function makeSubstrateMaterial(fx: TankFXUniforms, su: SubstrateUniforms, section: boolean): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0, envMapIntensity: 0.4 });
  mat.defines = section ? { AG_SECTION: '' } : {};
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, su);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSubLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSubLocal = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SUB_PARS}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  {
    vec3 sc; float sh; float sw;
#ifdef AG_SECTION
    vec2 suv = vec2(vSubLocal.x + vSubLocal.z * 1.3, vSubLocal.y);
    agsSubstrate(vSubLocal, suv, 1.0, sc, sh, sw);
#else
    agsSubstrate(vSubLocal, vSubLocal.xz, 0.0, sc, sh, sw);
#endif
    diffuseColor.rgb *= sc;
    agsSubH = sh; agsWet = sw;
  }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
  roughnessFactor = clamp(roughnessFactor * mix(1.0, 0.5, agsWet), 0.08, 1.0);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
  normal = agdSubBump(-vViewPosition, normal, agsSubH * uGrain * 0.35);`,
      )
      .replace(
        'float agsSubH;',
        `float agsSubH;
vec3 agdSubBump(vec3 surfPos, vec3 n, float h){
  vec3 dpdx = dFdx(surfPos); vec3 dpdy = dFdy(surfPos);
  float dhx = dFdx(h); float dhy = dFdy(h);
  vec3 r1 = cross(dpdy, n); vec3 r2 = cross(n, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  vec3 r = abs(det) * n - grad;
  float l2 = dot(r, r);
  return l2 > 1e-30 ? r * inversesqrt(l2) : n;
}`,
      );
  };
  mat.customProgramCacheKey = () => `agsubstrate-${section ? 's' : 't'}`;
  patchUnderwaterMaterial(mat, fx);
  return mat;
}
