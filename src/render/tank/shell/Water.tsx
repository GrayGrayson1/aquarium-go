/**
 * Water volume (path-length fog over everything seen THROUGH the water), the animated surface (fresnel reflection
 * from above; silvery total-internal-reflection shimmer from below; ripple rings + agitation) and the meniscus line.
 * OWNER: lane "waterfx".
 */
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TankDims } from '@/sim/tankSpace';
import { MAX_AGITATORS, MAX_RIPPLES, UNDERWATER_PARS, type TankFXUniforms } from '../../shared/underwater';
import { GLSL_VALUE_NOISE } from '../../shared/glsl';
import { setPremultipliedOver } from './materials';
import type { RenderLod } from '../../lod';

const noPick = () => null;

// ───────────────────────────── Volume ─────────────────────────────

function openTopBox(L: number, Hy: number, W: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(L, Hy, W);
  g.translate(0, Hy / 2, 0);
  // BoxGeometry groups: px, nx, py, ny, pz, nz — drop the +Y (top) face; the surface shades itself.
  const idx = g.getIndex()!;
  const keep: number[] = [];
  for (const grp of g.groups) {
    if (grp.materialIndex === 2) continue;
    for (let i = grp.start; i < grp.start + grp.count; i++) keep.push(idx.getX(i));
  }
  g.setIndex(keep);
  g.clearGroups();
  return g;
}

function createVolumeMaterial(fx: TankFXUniforms, far: boolean) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...fx },
    defines: far ? { AG_FAR: 1 } : {},
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${UNDERWATER_PARS}
      varying vec3 vW;
      void main(){
        vec3 lp = (uTankInv * vec4(vW, 1.0)).xyz;
        vec3 le = (uTankInv * vec4(uCamPos, 1.0)).xyz;
        float path = agWaterPath(lp, le);
        float hMid = clamp(mix(lp.y, clamp(le.y, 0.0, uWaterBox.y), 0.25) / max(uWaterBox.y, 0.05), 0.0, 1.0);
        float xr = abs(mix(lp.x, clamp(le.x, -uWaterBox.x, uWaterBox.x), 0.25)) / max(uWaterBox.x, 0.05);
        #ifdef AG_FAR
          // Exhibits seen across a room: the glass is a few pixels wide and the eye has no parallax to judge depth, so
          // real-strength fog reads as an empty terrarium. Give the body of water more presence (denser, a touch
          // brighter in-scatter) and draw the water line where the view enters through a pane just under the surface.
          float dens = uFogDensity * 1.6 + 0.25;
          float a = clamp(1.0 - exp(-dens * path), 0.0, 0.82);
          vec3 col = agFogColorAt(hMid, xr) * (1.05 + 0.3 * hMid) * a + agSurfaceGlow(lp, le, path) * 1.4;
          vec3 dir = normalize(le - lp);
          vec3 entry = lp + dir * path;
          float onPane = step(-0.002, max(abs(entry.x) - uWaterBox.x, abs(entry.z) - uWaterBox.z));
          float below = uWaterBox.y - entry.y;
          float lw = max(0.0025, fwidth(entry.y) * 1.6);
          float line = onPane * (1.0 - smoothstep(0.0, lw, below)) * step(0.0, below);
          float shade = onPane * (1.0 - smoothstep(lw, lw * 3.5, below)) * step(0.0, below) * (1.0 - line);
          float lum = dot(uLightColor, vec3(0.3333));
          vec3 silver = mix(vec3(0.82, 0.9, 0.95), uLightColor / max(lum, 0.05), 0.3) * (0.05 + 0.8 * lum);
          col += silver * line * 0.85;
          a = clamp(a + line * 0.5 + shade * 0.22, 0.0, 0.92);
        #else
          float a = clamp(1.0 - exp(-uFogDensity * path), 0.0, 0.8);
          vec3 col = agFogColorAt(hMid, xr) * a + agSurfaceGlow(lp, le, path);
        #endif
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
  });
  setPremultipliedOver(m);
  return m;
}

export function WaterVolume({ d, fx, lod = 0 }: { d: TankDims; fx: TankFXUniforms; lod?: RenderLod }) {
  const far = lod > 0;
  const geo = useMemo(() => openTopBox(d.L, d.waterY, d.W), [d.L, d.waterY, d.W]);
  const mat = useMemo(() => createVolumeMaterial(fx, far), [fx, far]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => mat.dispose(), [mat]);
  return <mesh name="water-volume" geometry={geo} material={mat} renderOrder={-1} raycast={noPick} userData={{ noPick: true }} frustumCulled={false} />;
}

// ───────────────────────────── Surface ─────────────────────────────

/** Height-field shared by the surface fragment shader (tank-local metres). */
const SURFACE_HEIGHT_GLSL = /* glsl */ `
${GLSL_VALUE_NOISE}
uniform vec4 uRipples[${MAX_RIPPLES}];
uniform vec4 uAgitators[${MAX_AGITATORS}];
uniform float uWaveAmp;
float agSurfaceH(vec2 p, float t){
  float h = 0.0;
  h += sin(dot(p, vec2(0.80, 0.60)) * 41.0 + t * 1.9) * 0.30;
  h += sin(dot(p, vec2(-0.47, 0.88)) * 57.0 - t * 2.4) * 0.22;
  h += sin(dot(p, vec2(0.96, -0.28)) * 89.0 + t * 3.1) * 0.10;
  h += (agVNoise(p * 24.0 + vec2(t * 0.35, -t * 0.27)) - 0.5) * 0.9;
  h += (agVNoise(p * 63.0 - vec2(t * 0.62, t * 0.48)) - 0.5) * 0.4;
  h *= 0.0009 * uWaveAmp;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRipples[i];
    if (r.w <= 0.0) continue;
    float age = t - r.z;
    if (age < 0.0 || age > 3.5) continue;
    float dist = distance(p, r.xy);
    float x = dist - age * 0.19;
    float env = exp(-x * x / (0.0004 + age * 0.003)) * exp(-age * 1.1) * r.w;
    h += sin(x * 170.0) * env * 0.0016;
  }
  for (int i = 0; i < ${MAX_AGITATORS}; i++) {
    vec4 a = uAgitators[i];
    if (a.w <= 0.0) continue;
    float dd = distance(p, a.xy) / max(a.z, 0.005);
    float k = exp(-dd * dd);
    h += (agVNoise(p * 110.0 + vec2(t * 3.3, -t * 2.9)) - 0.5) * k * a.w * 0.0028;
    h += sin(dd * 9.0 - t * 9.0) * k * a.w * 0.0008;
  }
  return h;
}
vec3 agSurfaceNormal(vec2 p, float t){
  float e = 0.0016;
  float h0 = agSurfaceH(p, t);
  float hx = agSurfaceH(p + vec2(e, 0.0), t);
  float hz = agSurfaceH(p + vec2(0.0, e), t);
  return normalize(vec3(-(hx - h0) / e, 1.0, -(hz - h0) / e));
}
`;

/**
 * The surface is drawn as two single-sided materials sharing one plane: the lit physical material only for the top
 * face (seen from above) and an unlit shader for the underside (seen through the front glass — the common view).
 * One double-sided lit material paid the full light loop on every underside pixel and then threw the result away.
 */
function createSurfaceAboveMaterial(fx: TankFXUniforms) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.04,
    metalness: 0,
    ior: 1.333,
    specularIntensity: 1,
    envMapIntensity: 1.1,
    side: THREE.FrontSide,
  });
  setPremultipliedOver(m);
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fx);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vSW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vSW;\n${UNDERWATER_PARS}\n${SURFACE_HEIGHT_GLSL}\nvec3 sNL; vec3 sLp; float sDetail;`)
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
  sLp = (uTankInv * vec4(vSW, 1.0)).xyz;
  // ripples smaller than a couple of pixels would only alias into sparkle: flatten them with distance
  sDetail = 1.0 - smoothstep(0.0025, 0.012, length(fwidth(sLp.xz)));
  sNL = normalize(mix(vec3(0.0, 1.0, 0.0), agSurfaceNormal(sLp.xz, uTime), sDetail));
  {
    vec3 nW = transpose(mat3(uTankInv)) * sNL;
    normal = normalize(mat3(viewMatrix) * nW);
  }`,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
  // from above: fresnel reflection of the room + fixture glints over a faint water tint
  float aTop = 0.08 + 0.06 * clamp(uFogDensity, 0.0, 2.0);
  vec3 body = agFogColor(1.0) * 0.9;
  // ripple crests catch the fixture light: a soft moving sheen that reads as a water surface from above
  float crest = clamp(length(sNL.xz) * 22.0, 0.0, 1.0);
  float glint = pow(crest, 3.0) * sDetail;
  vec3 sheen = uLightColor * (0.03 * crest + 0.12 * glint);
  float a2 = clamp(aTop + glint * 0.08, 0.0, 1.0);
  gl_FragColor = vec4(body * aTop + sheen + totalSpecular, a2);
`,
      );
  };
  m.customProgramCacheKey = () => 'ag-surface-above-v2';
  return m;
}

function createSurfaceBelowMaterial(fx: TankFXUniforms, backdrop: { value: THREE.Color }) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...fx, uBackdropColor: backdrop },
    vertexShader: /* glsl */ `
      varying vec3 vSW;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vSW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${UNDERWATER_PARS}
      ${SURFACE_HEIGHT_GLSL}
      uniform vec3 uBackdropColor;
      varying vec3 vSW;
      void main(){
        vec3 sLp = (uTankInv * vec4(vSW, 1.0)).xyz;
        vec3 sLe = (uTankInv * vec4(uCamPos, 1.0)).xyz;
        vec3 sNL = agSurfaceNormal(sLp.xz, uTime);
        vec3 v = normalize(sLp - sLe);
        // refraction into the water through the pane the eye looks through (Snell at a vertical pane)
        vec3 N = vec3(0.0);
        if (sLe.z > uWaterBox.z) N = vec3(0.0, 0.0, 1.0);
        else if (sLe.z < -uWaterBox.z) N = vec3(0.0, 0.0, -1.0);
        else if (sLe.x > uWaterBox.x) N = vec3(1.0, 0.0, 0.0);
        else if (sLe.x < -uWaterBox.x) N = vec3(-1.0, 0.0, 0.0);
        vec3 vw = dot(N, N) > 0.5 ? refract(v, N, 1.0 / 1.333) : v;
        vw = dot(vw, vw) > 1e-8 ? normalize(vw) : v;
        float cosI = clamp(dot(vw, sNL), 0.0, 1.0);
        float sin2 = 1.0 - cosI * cosI;
        float tir = smoothstep(0.54, 0.6, sin2);
        vec3 r = reflect(vw, sNL);
        // mirror: the bright upper water column, stretched reflections of the lit interior, rippling highlights
        float stretch = agVNoise(vec2(sLp.x * 7.0 + r.x * 3.0, sLp.z * 70.0 + sNL.z * 30.0 + uTime * 0.15));
        float streak = agVNoise(vec2(sLp.x * 16.0 + sNL.x * 12.0, sLp.z * 150.0 + sNL.z * 60.0 + uTime * 0.4));
        vec3 lightN = uLightColor / max(dot(uLightColor, vec3(0.3333)), 0.05);
        float lum = dot(uLightColor, vec3(0.3333));
        // the mirror shows what the reflected ray meets: water column, then the upper backdrop / far glass
        vec3 fogTop = agFogColor(0.95);
        vec3 rd = normalize(vec3(r.x, min(r.y, -0.02), r.z));
        float far = agWaterPath(sLp + rd * 0.0005, sLp + rd * 20.0);
        float fT = exp(-uFogDensity * far);
        vec3 mirror = fogTop * (1.0 - fT) + uBackdropColor * lum * fT;
        mirror = mix(mirror, vec3(dot(mirror, vec3(0.3333))), 0.25) * (0.85 + 0.35 * stretch);
        float lines = smoothstep(0.7, 0.96, streak);
        mirror += (lightN * lum * 0.05 + fogTop * 0.6) * lines;
        // Snell's window (non-TIR): the fixture light seen through the surface
        vec3 window = uLightColor * 0.3 + agFogColor(1.0) * 1.2;
        vec3 col = mix(window, mirror, tir);
        col = agApplyFog(col, sLp);
        float a = mix(0.8, 0.97, tir);
        gl_FragColor = vec4(col * a, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
  });
  setPremultipliedOver(m);
  return m;
}

/** Albedo-ish colour of each backdrop at full light (what the TIR mirror sees behind the water). */
export const BACKDROP_TONE: Record<string, string> = { black: '#050606', deep_blue: '#123c6e', frosted: '#8ea4b0', none: '#1a1d20', rock_3d: '#3d3a35' };

export function WaterSurface({ d, fx, lod, segments, backdrop }: { d: TankDims; fx: TankFXUniforms; lod: RenderLod; segments: number; backdrop: string }) {
  const bd = useMemo(() => ({ value: new THREE.Color(BACKDROP_TONE[backdrop] ?? '#101214') }), [backdrop]);
  // the plane stays flat (ripples live in the per-fragment normal), so a modest grid is plenty
  const seg = Math.min(lod === 0 ? segments : 16, 24);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(d.L, d.W, Math.max(1, Math.round(seg * Math.min(1, d.L))), Math.max(1, Math.round((seg * d.W) / Math.max(d.L, 0.1))));
    g.rotateX(-Math.PI / 2);
    return g;
  }, [d.L, d.W, seg]);
  const above = useMemo(() => createSurfaceAboveMaterial(fx), [fx]);
  const below = useMemo(() => createSurfaceBelowMaterial(fx, bd), [fx, bd]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => above.dispose(), [above]);
  useEffect(() => () => below.dispose(), [below]);
  return (
    <group position={[0, d.waterY, 0]}>
      <mesh name="water-surface" geometry={geo} material={above} raycast={noPick} userData={{ noPick: true }} />
      <mesh name="water-surface-under" geometry={geo} material={below} raycast={noPick} userData={{ noPick: true }} />
    </group>
  );
}

/**
 * LOD 1/2 (exhibits across the room): one cheap unlit draw that reads as calm water from any distance. Broad slow
 * swells only (fading further with the pixel footprint, so nothing sub-pixel can sparkle into white static), a soft
 * tinted body, a fresnel sheen of the room and the fixture's glow lying on the water under the light bar. Seen from
 * below (tall exhibits, low cameras) it is the silvery underside of the surface.
 */
function createFarSurfaceMaterial(fx: TankFXUniforms, env: { value: number }) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...fx, uEnvLum: env },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${UNDERWATER_PARS}
      uniform float uEnvLum;
      uniform float uWaveAmp;
      varying vec3 vW;
      void main(){
        vec3 lp = (uTankInv * vec4(vW, 1.0)).xyz;
        vec3 le = (uTankInv * vec4(uCamPos, 1.0)).xyz;
        vec3 V = normalize(le - lp);
        float lum = dot(uLightColor, vec3(0.3333));
        vec3 lightN = uLightColor / max(lum, 0.05);
        float fw = max(length(fwidth(lp.xz)), 1e-5);
        float detail = 1.0 - smoothstep(0.004, 0.035, fw);
        vec2 p = lp.xz;
        float t = uTime;
        vec2 g = vec2(0.6 * sin(p.x * 6.3 + p.y * 1.7 + t * 0.8) + 0.4 * sin(p.x * 11.0 - p.y * 4.1 - t * 1.05) * detail,
                      0.6 * sin(p.y * 8.1 - p.x * 2.3 + t * 0.7) + 0.4 * sin(p.y * 13.0 + p.x * 3.7 + t * 1.2) * detail);
        g *= 0.03 * clamp(uWaveAmp, 0.5, 2.0);
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        float edgeX = smoothstep(uWaterBox.x, uWaterBox.x * 0.8, abs(lp.x));
        if (le.y >= uWaterBox.y) {
          float cosT = clamp(dot(N, V), 0.0, 1.0);
          float F = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
          vec3 R = reflect(-V, N);
          // the room mirrored on the water: darker toward the floor, brighter toward the ceiling
          vec3 room = mix(vec3(0.07, 0.075, 0.08), vec3(0.24, 0.25, 0.26), clamp(R.y, 0.0, 1.0)) * (0.35 + uEnvLum);
          // the fixture's glow lying on the water under the light bar (a soft band along the tank), gently rippling
          float zb = -uWaterBox.z * 0.24;
          float band = exp(-pow((lp.z - zb) / max(uWaterBox.z * 0.55, 0.02), 2.0)) * edgeX;
          float shimmer = 0.75 + 0.25 * sin(p.x * 9.0 + g.x * 60.0 + t * 0.9) * sin(p.y * 7.0 - g.y * 50.0 - t * 0.7);
          vec3 sheen = lightN * lum * band * shimmer * (0.1 + 0.16 * F) * uDay;
          float aBody = 0.26 + 0.26 * (1.0 - cosT);
          vec3 body = agFogColor(1.0) * 1.1;
          float a = clamp(aBody + F * 0.75, 0.0, 0.88);
          gl_FragColor = vec4(body * aBody + room * F + sheen, a);
        } else {
          // underside: total internal reflection of the lit water column, faintly rippled
          float ripple = 0.9 + 0.1 * sin(p.x * 10.0 + g.x * 80.0 + t) * (0.4 + 0.6 * detail);
          vec3 col = (agFogColor(0.95) * 1.15 + lightN * lum * 0.035) * ripple;
          col = agApplyFog(col, lp);
          gl_FragColor = vec4(col * 0.92, 0.92);
        }
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
    // a flat plane only ever shows one face: skip three's two-pass transparent double-side path
    forceSinglePass: true,
    depthWrite: false,
  });
  setPremultipliedOver(m);
  return m;
}

const envLumOf = (scene: THREE.Scene) => {
  const v = (scene as THREE.Scene & { environmentIntensity?: number }).environmentIntensity;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0.6;
};

/** LOD 1/2 water surface (see createFarSurfaceMaterial). */
export function FarSurface({ d, fx }: { d: TankDims; fx: TankFXUniforms }) {
  const env = useMemo(() => ({ value: 0.6 }), []);
  const mat = useMemo(() => createFarSurfaceMaterial(fx, env), [fx, env]);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(({ scene }) => {
    env.value = envLumOf(scene);
  });
  return (
    <mesh name="water-surface-far" position={[0, d.waterY, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat} raycast={noPick} userData={{ noPick: true }}>
      <planeGeometry args={[d.L, d.W]} />
    </mesh>
  );
}

// ───────────────────────────── Meniscus ─────────────────────────────

function createMeniscusMaterial(fx: TankFXUniforms) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...fx },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vW;
      void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${UNDERWATER_PARS}
      ${GLSL_VALUE_NOISE}
      varying vec2 vUv; varying vec3 vW;
      void main(){
        vec3 lp = (uTankInv * vec4(vW, 1.0)).xyz;
        float wob = (agVNoise(vec2(lp.x * 40.0 + lp.z * 40.0, uTime * 0.8)) - 0.5) * 0.18;
        float v = vUv.y + wob;
        float bright = exp(-pow((v - 0.62) / 0.11, 2.0));
        float dark = exp(-pow((v - 0.3) / 0.12, 2.0));
        float lum = dot(uLightColor, vec3(0.3333));
        vec3 silver = mix(vec3(0.85, 0.92, 0.95), uLightColor / max(lum, 0.05), 0.3) * (0.04 + 0.75 * lum);
        float a = clamp(bright * 0.85 + dark * 0.35, 0.0, 1.0);
        vec3 col = silver * bright;
        // seen through water (back/side panes) → fade
        vec3 le = (uTankInv * vec4(uCamPos, 1.0)).xyz;
        vec3 lin = clamp(lp, vec3(-uWaterBox.x, 0.0, -uWaterBox.z), vec3(uWaterBox.x, uWaterBox.y, uWaterBox.z));
        float vis = exp(-(uFogDensity * 1.5 + 1.0) * agWaterPath(lin - vec3(0.0, 0.002, 0.0), le));
        gl_FragColor = vec4(col * a * vis, a * vis);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });
  setPremultipliedOver(m);
  return m;
}

export function Meniscus({ d, fx }: { d: TankDims; fx: TankFXUniforms }) {
  const mat = useMemo(() => createMeniscusMaterial(fx), [fx]);
  useEffect(() => () => mat.dispose(), [mat]);
  const h = Math.max(0.0035, Math.min(0.007, d.H * 0.012));
  const eps = 0.0006;
  const y = d.waterY - h * 0.35;
  const strips: { pos: [number, number, number]; rot: number; w: number }[] = [
    { pos: [0, y, d.W / 2 - eps], rot: 0, w: d.L },
    { pos: [0, y, -d.W / 2 + eps], rot: Math.PI, w: d.L },
    { pos: [d.L / 2 - eps, y, 0], rot: Math.PI / 2, w: d.W },
    { pos: [-d.L / 2 + eps, y, 0], rot: -Math.PI / 2, w: d.W },
  ];
  return (
    <group>
      {strips.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={[0, s.rot, 0]} material={mat} raycast={noPick} userData={{ noPick: true }}>
          <planeGeometry args={[s.w, h]} />
        </mesh>
      ))}
    </group>
  );
}
