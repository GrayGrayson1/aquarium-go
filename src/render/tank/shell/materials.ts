/**
 * Materials for the tank shell: glass (reflection composited over transparency, green light-piped edges, fogged when
 * seen through water), black trim, silicone, and procedural furniture surfaces (wood / stone / brushed metal).
 * OWNER: lane "waterfx".
 */
import * as THREE from 'three';
import { UNDERWATER_PARS, type TankFXUniforms } from '../../shared/underwater';
import { GLSL_SIMPLEX3 } from '../../shared/glsl';

/** Premultiplied-alpha "over" blending so specular reflection is additive and never dimmed by body opacity. */
export function setPremultipliedOver(m: THREE.Material): void {
  m.transparent = true;
  m.depthWrite = false;
  m.blending = THREE.CustomBlending;
  m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.OneFactor;
  m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.blendSrcAlpha = THREE.OneFactor;
  m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  m.premultipliedAlpha = false;
}

/**
 * Reflection roughness for the glass IBL: broad faces sample the environment at a glossy roughness (a window box turns
 * into a soft glow, never a hard-edged rectangle); pane edges stay sharp enough for crisp highlight lines.
 */
const GLASS_IBL = /* glsl */ `
  float agGlassEdgeK = smoothstep(0.35, 0.85, 1.0 - abs(normalize(vGObjN).z));
  float agGlassIblRough = max(material.roughness, mix(0.36, 0.12, agGlassEdgeK));
`;

export interface GlassOptions {
  /** Body tint (faint). */
  tint: string;
  /** Colour seen along the glass thickness (classic float-glass green). */
  edgeTint: string;
  bodyAlpha: number;
  edgeAlpha: number;
  specGain?: number;
  envIntensity?: number;
  roughness?: number;
  /** Fade the pane when seen through the water column (panes behind water). */
  fogThroughWater?: boolean;
  /** Backdrop tone seen in total-internal-reflection mirrors on side panes (sRGB). */
  backdropTone?: string;
  /** Substrate colour + top height (tank-local m) for the mirror's floor band. */
  floorTone?: string;
  floorY?: number;
}

/**
 * Glass for box panes whose THIN axis is local Z (object space). Faces with |n.z| ≈ 1 are the broad faces; the rest
 * are the edges, rendered as bright green glass.
 *
 * Room reflections on the broad faces are deliberately soft: the environment is sampled at a glossy (not mirror)
 * roughness and bright reflections are compressed, so light sources read as a gentle sheen across the pane instead of
 * crisp geometric shapes floating over the aquarium. Pane edges keep a sharper lookup for their bright highlight lines.
 */
export function createGlassMaterial(fx: TankFXUniforms, o: GlassOptions): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: o.tint,
    roughness: o.roughness ?? 0.03,
    metalness: 0,
    ior: 1.5,
    specularIntensity: 1,
    envMapIntensity: o.envIntensity ?? 1,
  });
  setPremultipliedOver(m);
  const uniforms = {
    uEdgeTint: { value: new THREE.Color(o.edgeTint) },
    uBodyAlpha: { value: o.bodyAlpha },
    uEdgeAlpha: { value: o.edgeAlpha },
    uSpecGain: { value: o.specGain ?? 1 },
    uFogThrough: { value: o.fogThroughWater === false ? 0 : 1 },
    uBackdropColor: { value: new THREE.Color(o.backdropTone ?? '#0b0d0f') },
    uFloorTone: { value: new THREE.Color(o.floorTone ?? '#8a7f6c') },
    uFloorY: { value: o.floorY ?? 0 },
  };
  m.userData.glassUniforms = uniforms;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fx, uniforms);
    // IBL lookup with the glass's own reflection roughness (see GLASS_IBL below)
    const iblChunk = THREE.ShaderChunk.lights_fragment_maps.replace(
      'getIBLRadiance( geometryViewDir, geometryNormal, material.roughness )',
      'getIBLRadiance( geometryViewDir, geometryNormal, agGlassIblRough )',
    );
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGObjN;\nvarying vec3 vGWorld;\nvarying vec3 vGWorldN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vGObjN = normal;\n  vGWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n  vGWorldN = normalize(mat3(modelMatrix) * normal);');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vGObjN;\nvarying vec3 vGWorld;\nvarying vec3 vGWorldN;\nuniform vec3 uBackdropColor;\nuniform vec3 uFloorTone;\nuniform float uFloorY;\nuniform vec3 uEdgeTint;\nuniform float uBodyAlpha;\nuniform float uEdgeAlpha;\nuniform float uSpecGain;\nuniform float uFogThrough;\n${UNDERWATER_PARS}`,
      )
      .replace('#include <lights_fragment_maps>', `${GLASS_IBL}\n${iblChunk}`)
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
  float gEdge = smoothstep(0.35, 0.85, 1.0 - abs(normalize(vGObjN).z));
  vec3 gV = normalize(vViewPosition);
  float gNdv = clamp(abs(dot(normalize(normal), gV)), 0.0, 1.0);
  float gLum = dot(uLightColor, vec3(0.3333));
  // light piped along the pane makes the thickness glow green; brighter at grazing view
  vec3 gEdgeCol = uEdgeTint * (0.04 + 0.32 * gLum) * (0.5 + 0.8 * pow(1.0 - gNdv, 1.5));
  float gA = mix(uBodyAlpha, uEdgeAlpha, gEdge);
  vec3 gBody = mix(diffuseColor.rgb * (0.015 + 0.08 * gLum), gEdgeCol, gEdge);
  vec3 gSpec = reflectedLight.indirectSpecular * uSpecGain * mix(1.0, 1.8, gEdge);
  // low-contrast reflections on the broad faces: soft-knee the bright end (a window or lamp becomes a gentle sheen)
  // and pull it a little toward neutral so the room's colours don't tint the aquarium
  float gSpecL = dot(gSpec, vec3(0.2126, 0.7152, 0.0722));
  vec3 gSoft = gSpec / (1.0 + gSpecL * 2.2);
  gSoft = mix(vec3(dot(gSoft, vec3(0.2126, 0.7152, 0.0722))), gSoft, 0.7);
  gSpec = mix(gSoft * 0.85, gSpec, gEdge);
  float gVis = 1.0;
  float gTir = 0.0;
  vec3 gMirror = vec3(0.0);
  if (uFogThrough > 0.5) {
    vec3 gLp = (uTankInv * vec4(vGWorld, 1.0)).xyz;
    vec3 gIn = clamp(gLp, vec3(-uWaterBox.x, 0.0, -uWaterBox.z), vec3(uWaterBox.x, uWaterBox.y, uWaterBox.z));
    if (distance(gLp, gIn) < 0.06) {
      vec3 gLe = (uTankInv * vec4(uCamPos, 1.0)).xyz;
      float gPath = agWaterPath(gIn, gLe);
      gVis = exp(-(uFogDensity * 1.6 + 0.8) * gPath);
      // inner face of a pane seen from inside the water at a grazing angle → total internal reflection:
      // the glass turns into a mirror of the water column (classic aquarium side-pane mirror)
      vec3 gN = normalize(mat3(uTankInv) * normalize(vGWorldN));
      if (gPath > 0.002 && gIn.y < uWaterBox.y - 0.001 && dot(gN, vec3(0.0, uWaterBox.y * 0.5, 0.0) - gLp) > 0.0 && abs(gN.y) < 0.5) {
        vec3 v = normalize(gIn - gLe);
        vec3 N = vec3(0.0);
        if (gLe.z > uWaterBox.z) N = vec3(0.0, 0.0, 1.0);
        else if (gLe.z < -uWaterBox.z) N = vec3(0.0, 0.0, -1.0);
        else if (gLe.x > uWaterBox.x) N = vec3(1.0, 0.0, 0.0);
        else if (gLe.x < -uWaterBox.x) N = vec3(-1.0, 0.0, 0.0);
        vec3 vw = dot(N, N) > 0.5 ? refract(v, N, 1.0 / 1.333) : v;
        if (dot(vw, vw) < 0.5) vw = v;
        vw = normalize(vw);
        float cosI = abs(dot(vw, gN));
        gTir = smoothstep(0.5, 0.6, 1.0 - cosI * cosI);
        vec3 r = reflect(vw, gN);
        float far = agWaterPath(gIn + r * 0.001, gIn + r * 20.0);
        float fT = exp(-uFogDensity * far);
        float lum = dot(uLightColor, vec3(0.3333));
        float hh = clamp(gIn.y / max(uWaterBox.y, 0.05), 0.0, 1.0);
        vec3 far3 = uBackdropColor * mix(0.3, 1.25, pow(hh, 1.3));
        // below the substrate line the reflected ray meets sand, not water
        float floorK = 1.0 - smoothstep(uFloorY - 0.004, uFloorY + 0.004, gIn.y);
        far3 = mix(far3, uFloorTone * 0.55, floorK);
        fT = mix(fT, 1.0, floorK * 0.6);
        gMirror = agFogColor(hh) * (1.0 - fT) + far3 * lum * fT;
        gMirror = agApplyFog(gMirror, gIn);
      }
    }
  }
  float gAlpha = gA * gVis;
  vec3 gOut = (gBody * gA + gSpec) * gVis;
  gOut = mix(gOut, gMirror * 0.92 + gSpec * 0.3, gTir);
  gAlpha = mix(gAlpha, 0.96, gTir);
  gl_FragColor = vec4(gOut, gAlpha);
`,
      );
  };
  m.customProgramCacheKey = () => 'ag-glass-v3';
  return m;
}

export function createTrimMaterial(color = '#0c0d0f', roughness = 0.42): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.5, envMapIntensity: 0.6 });
}

// ───────────────────────────── Procedural furniture surfaces ─────────────────────────────

export type SurfaceKind = 'wood' | 'stone' | 'brushed' | 'plain';

export interface SurfaceOptions {
  kind: SurfaceKind;
  color: string;
  color2?: string;
  roughness: number;
  metalness?: number;
  /** Wood grain along local X (0) or local Y (1). */
  grainAxis?: 0 | 1;
  /** Pattern scale multiplier. */
  scale?: number;
  clearcoat?: number;
  envIntensity?: number;
  bump?: number;
}

const SURFACE_GLSL = /* glsl */ `
${GLSL_SIMPLEX3}
vec3 agSurfBump(vec3 N, vec3 pos, float h, float k){
  vec3 dpdx = dFdx(pos); vec3 dpdy = dFdy(pos);
  float dhx = dFdx(h) * k; float dhy = dFdy(h) * k;
  vec3 r1 = cross(dpdy, N); vec3 r2 = cross(N, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * N - grad);
}
`;

/** Cached shared materials per option-set (live for the app lifetime; never mutated after creation). */
const surfaceCache = new Map<string, THREE.MeshPhysicalMaterial>();

export function getSurfaceMaterial(o: SurfaceOptions, detail = true): THREE.MeshPhysicalMaterial {
  const key = JSON.stringify(o) + (detail ? '|d' : '|p');
  const hit = surfaceCache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshPhysicalMaterial({
    color: o.color,
    roughness: o.roughness,
    metalness: o.metalness ?? 0,
    clearcoat: o.clearcoat ?? 0,
    clearcoatRoughness: 0.4,
    envMapIntensity: o.envIntensity ?? 1,
  });
  if (detail && o.kind !== 'plain') {
    const c2 = new THREE.Color(o.color2 ?? o.color);
    const uniforms = {
      uSurfC1: { value: new THREE.Color(o.color) },
      uSurfC2: { value: c2 },
      uSurfScale: { value: o.scale ?? 1 },
      uSurfAxis: { value: o.grainAxis ?? 0 },
      uSurfBump: { value: o.bump ?? 1 },
    };
    const kindDef = o.kind === 'wood' ? 1 : o.kind === 'stone' ? 2 : 3;
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSurfObj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSurfObj = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\n#define AG_SURF ${kindDef}\nvarying vec3 vSurfObj;\nuniform vec3 uSurfC1;\nuniform vec3 uSurfC2;\nuniform float uSurfScale;\nuniform float uSurfAxis;\nuniform float uSurfBump;\n${SURFACE_GLSL}\nfloat agSurfH;`,
        )
        .replace(
          '#include <map_fragment>',
          /* glsl */ `#include <map_fragment>
  {
    vec3 sp = vSurfObj * uSurfScale;
    if (uSurfAxis > 0.5) sp = sp.yxz;
    #if AG_SURF == 1
      // flat-sawn wood: wavy growth bands across the board + fine fibres along the grain
      float warp = snoise(vec3(sp.x * 0.6, sp.y * 3.0, sp.z * 3.0)) * 0.9 + snoise(vec3(sp.x * 0.18, sp.y * 1.1, sp.z * 1.1)) * 2.6;
      float bands = fract((sp.y + sp.z * 0.85) * 22.0 + warp);
      float band = smoothstep(0.0, 0.3, bands) * (1.0 - smoothstep(0.6, 1.0, bands));
      float fibre = snoise(vec3(sp.x * 1.5, sp.y * 140.0, sp.z * 140.0)) * 0.5 + 0.5;
      float pores = smoothstep(0.7, 0.95, snoise(vec3(sp.x * 9.0, sp.y * 300.0, sp.z * 300.0)) * 0.5 + 0.5);
      float w = clamp(0.4 + band * 0.32 + (fibre - 0.5) * 0.14 - pores * 0.1, 0.0, 1.0);
      diffuseColor.rgb = mix(uSurfC2, uSurfC1, w);
      agSurfH = band * 0.4 + fibre * 0.2 - pores * 0.5;
    #elif AG_SURF == 2
      // honed stone: cloudy fbm + speckle + faint veins
      float cloud = fbm3(sp * 5.0) * 0.5 + 0.5;
      float speck = smoothstep(0.72, 0.95, snoise(sp * 160.0) * 0.5 + 0.5);
      float vein = 1.0 - smoothstep(0.0, 0.035, abs(snoise(sp * vec3(2.2, 3.0, 2.2) + fbm3(sp * 3.0) * 0.8)));
      float s = clamp(cloud * 0.8 + 0.1 - speck * 0.35 + vein * 0.22, 0.0, 1.0);
      diffuseColor.rgb = mix(uSurfC2, uSurfC1, s);
      agSurfH = cloud * 0.4 - speck * 0.5;
    #else
      // brushed metal: fine streaks along X
      float st = snoise(vec3(sp.x * 6.0, sp.y * 240.0, sp.z * 240.0)) * 0.5 + 0.5;
      diffuseColor.rgb *= 0.96 + st * 0.06;
      agSurfH = 0.0;
    #endif
  }`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          /* glsl */ `#include <roughnessmap_fragment>
  #if AG_SURF == 1
    roughnessFactor = clamp(roughnessFactor + (0.5 - agSurfH) * 0.12, 0.05, 1.0);
  #elif AG_SURF == 3
    roughnessFactor = clamp(roughnessFactor + (agSurfH - 0.5) * 0.14, 0.05, 1.0);
  #endif`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          /* glsl */ `#include <normal_fragment_maps>
  normal = agSurfBump(normal, -vViewPosition, agSurfH, 0.0012 * uSurfBump);`,
        );
    };
    m.customProgramCacheKey = () => `ag-surf-${kindDef}`;
  }
  surfaceCache.set(key, m);
  return m;
}
