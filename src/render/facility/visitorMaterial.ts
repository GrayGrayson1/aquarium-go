/**
 * Materials for the instanced visitors. "Slot" materials read the per-vertex `aPart` = (colour slot, visibility
 * flag) baked by visitorGeometry.ts: slot 0 uses the standard instance colour, slots 1–3 the per-instance attributes
 * iColB / iColC / iColD; a flag ≥ 0 collapses that part (degenerate triangles) unless iFlags[flag] > 0.5. This lets
 * one draw carry a shirt + trousers + optional jacket / skirt / bag, or a head + optional glasses.
 * Per-instance `iFade` (0..1) screen-door dithers a person out (ordered 4×4 Bayer, no sorting / blending cost) and
 * collapses them entirely at 0, e.g. when they stand right in front of the camera or block the exhibit in view.
 * Every geometry drawn with these materials must carry all instanced attributes (see addSlotAttributes).
 * OWNER: lane "facility".
 */
import * as THREE from 'three';

const DECL = /* glsl */ `
attribute vec2 aPart;
attribute vec3 iColB;
attribute vec3 iColC;
attribute vec3 iColD;
attribute vec4 iFlags;
attribute float iFade;
varying float vAgFade;
float agPartFlag(float f){ return f < 0.5 ? iFlags.x : f < 1.5 ? iFlags.y : f < 2.5 ? iFlags.z : iFlags.w; }
`;

const HIDE = /* glsl */ `
vAgFade = iFade;
if (iFade < 0.02 || (aPart.y > -0.5 && agPartFlag(aPart.y) < 0.5)) transformed = vec3(0.0);
`;

const DEPTH_HIDE = /* glsl */ `
vAgFade = iFade;
if (iFade < 0.5 || (aPart.y > -0.5 && agPartFlag(aPart.y) < 0.5)) transformed = vec3(0.0);
`;

const DITHER = /* glsl */ `
varying float vAgFade;
const float AG_BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
`;

const DITHER_APPLY = /* glsl */ `
if (vAgFade < 0.999) {
  ivec2 bq = ivec2(mod(floor(gl_FragCoord.xy), 4.0));
  if (vAgFade < (AG_BAYER[bq.y * 4 + bq.x] + 0.5) / 16.0) discard;
}
`;

const RECOLOR = /* glsl */ `
#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
if (aPart.x > 0.5) vColor.rgb = color.rgb * (aPart.x < 1.5 ? iColB : aPart.x < 2.5 ? iColC : iColD);
#endif
`;

export function slotMaterial(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ ...params, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${DECL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${HIDE}`)
      .replace('#include <color_vertex>', `#include <color_vertex>\n${RECOLOR}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${DITHER}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${DITHER_APPLY}`);
  };
  m.customProgramCacheKey = () => 'ag-visitor-slots-v2';
  return m;
}

/** Shadow depth material that hides the same flagged parts. */
export function slotDepthMaterial(): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial();
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${DECL}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${DEPTH_HIDE}`);
  };
  m.customProgramCacheKey = () => 'ag-visitor-slots-depth-v2';
  return m;
}

/** Per-instance slot colours + flags for an instanced mesh using slotMaterial. */
export interface SlotAttrs {
  b: THREE.InstancedBufferAttribute;
  c: THREE.InstancedBufferAttribute;
  d: THREE.InstancedBufferAttribute;
  flags: THREE.InstancedBufferAttribute;
  fade: THREE.InstancedBufferAttribute;
}

export function addSlotAttributes(geo: THREE.BufferGeometry, cap: number): SlotAttrs {
  const mk = (n: number) => new THREE.InstancedBufferAttribute(new Float32Array(cap * n), n).setUsage(THREE.DynamicDrawUsage) as THREE.InstancedBufferAttribute;
  const a = { b: mk(3), c: mk(3), d: mk(3), flags: mk(4), fade: mk(1) };
  (a.fade.array as Float32Array).fill(1);
  geo.setAttribute('iColB', a.b);
  geo.setAttribute('iColC', a.c);
  geo.setAttribute('iColD', a.d);
  geo.setAttribute('iFlags', a.flags);
  geo.setAttribute('iFade', a.fade);
  return a;
}

export function setSlotColor(attr: THREE.InstancedBufferAttribute, i: number, c: THREE.Color): void {
  const arr = attr.array as Float32Array;
  arr[i * 3] = c.r;
  arr[i * 3 + 1] = c.g;
  arr[i * 3 + 2] = c.b;
}

export function setSlotFlags(attr: THREE.InstancedBufferAttribute, i: number, x: number, y: number, z: number, w: number): void {
  const arr = attr.array as Float32Array;
  arr[i * 4] = x;
  arr[i * 4 + 1] = y;
  arr[i * 4 + 2] = z;
  arr[i * 4 + 3] = w;
}
