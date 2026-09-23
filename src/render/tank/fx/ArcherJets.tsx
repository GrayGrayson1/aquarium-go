/**
 * Archerfish shots (lane "brackish"): the fly an archerfish is aiming at, the jet of water it spits, the splash on the
 * glass or leaf, and the fly tumbling onto the surface where the fish snaps it up. State comes from the AI
 * (src/runtime/archerShots.ts, written by src/ai/core/spit.ts); this only draws it. Hero tank only (lod 0), and only
 * mounted when the tank holds a spitting species.
 *
 * Draw calls: a camera-facing jet ribbon (quadratic arc evaluated in the vertex shader), one Points draw for the
 * leading drop + spray + beads running down the glass, and a tiny procedural fly (lathe body, compound eyes, veined
 * iridescent wings, legs). Everything above the water is left unfogged (it is in air). Zero per-frame allocation.
 *
 * lane:w2-visual — the whole jet lives in the 2.5 cm air gap, which the default front camera sees as a sliver under
 * the rim, so the moment is also told where the eye can see it: a brief soft glint where the jet leaves the water and
 * where it strikes (with a minimum on-screen size), expanding light rings on the surface (exit, fly landing, the snap;
 * analytically antialiased, at least ~2 px wide at any angle — the lit surface's own ripples are flattened at grazing
 * angles to avoid aliasing), and a few entrained micro-bubbles that sink and rise back under the exit point. One extra
 * draw (the instanced rings, hidden while idle); glints and bubbles ride the existing drop Points.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { GameState } from '@/types';
import type { TankDims } from '@/sim/tankSpace';
import { useGame } from '@/state/game';
import { findSpecies } from '@/data/species';
import { archerShots, JET_FLIGHT_S, JET_POUR_S, type ArcherShot } from '@/runtime/archerShots';
import { addSurfaceRipple, type TankFXUniforms } from '../../shared/underwater';

const noPick = () => null;
const NP = { noPick: true };
const SEG = 36;
const MAXD = 64;
/** Surface light rings in flight at once (ring buffer). */
const MAXR = 8;
/** Seconds a surface ring lives; a glint lives GLINT_S. */
const RING_S = 1.3;
const GLINT_S = 0.24;
/** Drop kinds: 0 free droplet, 1 bead on the glass, 2 the jet's leading drop, 3 entrained bubble, 4 glint. */
const K_BUBBLE = 3;
const K_GLINT = 4;
/** Fly body length is ~9 mm; everything below is in metres. */
const MM = 0.001;
/** A generous greenbottle (~12 mm) so it reads at viewing distance. */
const FLY_SCALE = 1.3;

function hasSpitter(g: GameState | null | undefined, tankId: string): boolean {
  if (!g) return false;
  for (const id in g.creatures) {
    const c = g.creatures[id];
    if (c.tankId !== tankId || (c.status !== 'alive' && c.status !== 'listed')) continue;
    if (findSpecies(c.speciesId)?.specialBehaviors?.includes('spit_shot')) return true;
  }
  return false;
}

export function ArcherJets({ tankId, d, fx, reducedMotion }: { tankId: string; d: TankDims; fx: TankFXUniforms; reducedMotion: boolean }) {
  const has = useGame((s) => hasSpitter(s.game, tankId));
  if (!has) return null;
  return <ArcherJetsInner tankId={tankId} d={d} fx={fx} reducedMotion={reducedMotion} />;
}

// ───────────────────────────── shaders ─────────────────────────────

const JET_VS = /* glsl */ `
uniform vec3 uS; uniform vec3 uQ; uniform vec3 uT;
uniform float uHead; uniform float uTail; uniform float uWidth; uniform float uPixelScale;
attribute float aS; attribute float aSide;
varying float vU; varying float vSide; varying float vS;
vec3 bez(float s){ float o = 1.0 - s; return o * o * uS + 2.0 * o * s * uQ + s * s * uT; }
vec3 bezD(float s){ return 2.0 * (1.0 - s) * (uQ - uS) + 2.0 * s * (uT - uQ); }
void main(){
  float s = mix(uTail, uHead, aS);
  vec3 p = bez(s);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 tv = (modelViewMatrix * vec4(bezD(s), 0.0)).xyz;
  vec2 perp = vec2(-tv.y, tv.x);
  float pl = length(perp);
  perp = pl > 1e-6 ? perp / pl : vec2(1.0, 0.0);
  // thinner where it leaves the mouth, fuller toward the head of the jet; never under ~2 px (it must read from the
  // default front view, where the whole air gap is a sliver)
  float w = uWidth * (0.6 + 0.4 * aS);
  float dist = max(-mv.z, 0.02);
  w = max(w, 2.0 * dist / uPixelScale);
  mv.xy += perp * aSide * w * 0.5;
  vU = aS; vSide = aSide; vS = s;
  gl_Position = projectionMatrix * mv;
}`;

const JET_FS = /* glsl */ `
uniform float uTime; uniform float uOpacity; uniform float uSeed; uniform vec3 uLightColor;
varying float vU; varying float vSide; varying float vS;
float h1(float x){ return fract(sin(x * 127.1 + uSeed * 311.7) * 43758.5453); }
void main(){
  float across = 1.0 - vSide * vSide;
  float core = pow(max(across, 0.0), 0.7);
  // a slightly broken jet: beads and thin gaps travelling up it
  float seg = vS * 34.0 - uTime * 9.0;
  float n = h1(floor(seg));
  float bead = mix(0.45, 1.0, smoothstep(0.2, 0.6, n)) * (0.75 + 0.25 * sin(fract(seg) * 3.14159));
  float a = core * bead * uOpacity * smoothstep(0.0, 0.1, vU);
  vec3 lit = max(uLightColor, vec3(0.25));
  vec3 col = mix(vec3(0.82, 0.93, 1.0), lit, 0.35) * (0.7 + 1.3 * core * core);
  gl_FragColor = vec4(col * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const DROP_VS = /* glsl */ `
attribute float aSize; attribute float aAlpha; attribute float aMode;
uniform float uPixelScale;
varying float vA; varying float vMode;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = max(-mv.z, 0.02);
  float px = aSize * uPixelScale / dist;
  // aMode: 0 drop / bubble, 1 glint (a soft highlight kept ≥ 18 px so it reads at any zoom), 2 the jet's leading drop
  float minPx = aMode > 1.5 ? 3.2 : aMode > 0.5 ? 18.0 : 1.8;
  gl_PointSize = aSize > 0.0 ? max(px, minPx) : 0.0;
  vA = aSize > 0.0 ? aAlpha * (aMode > 0.5 ? 1.0 : clamp(px / 2.2, 0.4, 1.0)) : 0.0;
  vMode = aMode;
  gl_Position = projectionMatrix * mv;
}`;

const DROP_FS = /* glsl */ `
uniform vec3 uLightColor;
varying float vA; varying float vMode;
void main(){
  vec2 c = (gl_PointCoord - 0.5) * 2.0;
  float r = length(c);
  if (r > 1.0 || vA <= 0.0) discard;
  if (vMode > 0.5 && vMode < 1.5) {
    // glint: sunlight catching the burst — a soft halo round a small hot core, mostly additive (low alpha)
    float halo = exp(-r * r * 5.0) * (1.0 - r);
    float hot = exp(-r * r * 60.0);
    vec3 lit = max(uLightColor, vec3(0.3));
    vec3 gc = mix(vec3(0.9, 0.97, 1.0), lit, 0.3) * (halo * 0.55 + hot * 1.6) * vA;
    gl_FragColor = vec4(gc, (halo * 0.08 + hot * 0.3) * vA);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    return;
  }
  // a water drop: clear body, bright rim, sharp catch-light
  float body = (1.0 - smoothstep(0.55, 1.0, r)) * 0.35;
  float rim = smoothstep(0.6, 0.95, r) * (1.0 - smoothstep(0.95, 1.0, r));
  float spec = exp(-dot(c - vec2(-0.3, 0.35), c - vec2(-0.3, 0.35)) * 26.0) * 1.8;
  float a = clamp(body + rim * 0.8 + spec, 0.0, 1.0) * vA;
  vec3 lit = max(uLightColor, vec3(0.25));
  vec3 col = mix(vec3(0.85, 0.95, 1.0), lit, 0.3) * (body * 1.4 + rim + spec * 1.4);
  gl_FragColor = vec4(col * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// surface light rings: a flat quad per ring, grown in the vertex shader to just cover the ring (no idle fill cost)
const RING_VS = /* glsl */ `
uniform float uNow; uniform float uY;
attribute vec4 aRing; // x, z, start time, strength
varying vec2 vP; varying float vR; varying float vA;
void main(){
  float age = uNow - aRing.z;
  float live = step(0.0, age) * step(age, ${RING_S.toFixed(2)}) * step(0.001, aRing.w);
  float r = 0.004 + age * 0.17;
  float ext = (r + 0.03) * live;
  vP = position.xz * ext;
  vR = r;
  vA = live * aRing.w * exp(-age * 2.6) * smoothstep(0.0, 0.06, age);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(aRing.x + vP.x, uY, aRing.y + vP.y, 1.0);
}`;

const RING_FS = /* glsl */ `
uniform vec3 uLightColor;
varying vec2 vP; varying float vR; varying float vA;
void main(){
  if (vA <= 0.002) discard;
  float l = length(vP);
  // at least ~2 px wide at any viewing angle (seen edge-on from the front the ring is a thin bright ellipse)
  float w = max(0.0022, fwidth(l) * 1.1);
  float d1 = (l - vR) / w;
  float d2 = (l - vR * 0.64) / w;
  float ring = exp(-d1 * d1) + 0.4 * exp(-d2 * d2);
  float a = ring * vA;
  if (a < 0.003) discard;
  vec3 lit = max(uLightColor, vec3(0.3));
  vec3 col = mix(vec3(0.86, 0.95, 1.0), lit, 0.35) * 1.15;
  gl_FragColor = vec4(col * a * 0.55, a * 0.12);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const WING_VS = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const WING_FS = /* glsl */ `
uniform float uAlpha; uniform vec3 uLightColor;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  float x = vUv.x;                 // 0 root → 1 tip
  float y = (vUv.y - 0.5) * 2.0;   // across the wing
  // fly-wing outline: a narrow stalk at the root widening to a rounded blade
  float halfW = sqrt(max(0.0, x * (1.0 - x))) * 1.95 * mix(0.45, 1.0, smoothstep(0.0, 0.45, x));
  float inside = smoothstep(halfW, halfW - 0.07, abs(y));
  if (inside <= 0.001) discard;
  // a few veins fanning from the root, plus the leading edge
  float v1 = smoothstep(0.05, 0.0, abs(y - 0.55 * x));
  float v2 = smoothstep(0.045, 0.0, abs(y - 0.12 * x));
  float v3 = smoothstep(0.04, 0.0, abs(y + 0.35 * x));
  float edge = smoothstep(0.1, 0.0, abs(abs(y) - halfW + 0.02)) * step(0.0, y);
  float vein = clamp(max(max(v1, v2), max(v3, edge)) * smoothstep(0.02, 0.2, x), 0.0, 1.0);
  // thin-film sheen that shifts with the viewing angle
  float f = abs(dot(normalize(vN), normalize(vV)));
  vec3 film = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + f * 1.4 + x * 0.5));
  vec3 lit = max(uLightColor, vec3(0.3));
  vec3 col = mix(vec3(0.78, 0.8, 0.82), film, 0.4) * lit;
  col = mix(col, vec3(0.1, 0.09, 0.07), vein * 0.85);
  float a = inside * (0.14 + 0.55 * vein + 0.3 * (1.0 - f)) * uAlpha;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ───────────────────────────── the fly ─────────────────────────────

interface Fly {
  group: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
  wingMat: THREE.ShaderMaterial;
  dispose(): void;
}

function buildFly(fx: TankFXUniforms): Fly {
  const group = new THREE.Group();
  group.name = 'archer-fly';
  // body: abdomen, waist, thorax, neck, head — lathed around its long axis, then turned so the head points +X
  const prof: [number, number][] = [
    [0, -4.6], [0.7, -4.4], [1.3, -3.7], [1.65, -2.5], [1.72, -1.3], [1.5, -0.55], [1.2, -0.2],
    [1.5, 0.25], [1.82, 1.0], [1.78, 1.9], [1.42, 2.5], [0.95, 2.8],
    [1.3, 3.05], [1.45, 3.5], [1.28, 4.0], [0.8, 4.35], [0, 4.45],
  ];
  const bodyGeo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * MM, y * MM)), 16);
  bodyGeo.rotateZ(-Math.PI / 2);
  bodyGeo.scale(1, 0.92, 1);
  // a greenbottle: shiny metallic green, so it catches the tank light against the dark backdrop
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#4d9a3c', metalness: 0.55, roughness: 0.26, emissive: '#0f2209' });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);
  // faint abdominal bands
  const bandGeo = new THREE.TorusGeometry(1.62 * MM, 0.12 * MM, 5, 18);
  const bandMat = new THREE.MeshStandardMaterial({ color: '#16230f', metalness: 0.4, roughness: 0.5 });
  for (const x of [-1.4, -2.6]) {
    const b = new THREE.Mesh(bandGeo, bandMat);
    b.rotation.y = Math.PI / 2;
    b.position.x = x * MM;
    b.scale.set(1, x < -2 ? 0.85 : 1, x < -2 ? 0.85 : 1);
    group.add(b);
  }
  // big compound eyes
  const eyeGeo = new THREE.SphereGeometry(1.0 * MM, 12, 9);
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#c0391d', metalness: 0.1, roughness: 0.2, emissive: '#2a0703' });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(eyeGeo, eyeMat);
    e.position.set(3.55 * MM, 0.35 * MM, s * 0.95 * MM);
    e.scale.set(0.95, 1.15, 0.85);
    group.add(e);
  }
  // legs: three pairs, femur + tibia down to the perch plane (local y ≈ −1.9 mm)
  const pts: number[] = [];
  const legs: [number, number, number][] = [
    [1.6, 1.4, 1.6],
    [0.8, 0.1, 0],
    [0.1, -1.6, -1.8],
  ];
  for (const s of [-1, 1])
    for (const [x0, xk, xf] of legs) {
      pts.push(x0 * MM, -0.7 * MM, s * 0.8 * MM, xk * MM, -0.6 * MM, s * 2.6 * MM);
      pts.push(xk * MM, -0.6 * MM, s * 2.6 * MM, xf * MM, -1.9 * MM, s * 3.2 * MM);
    }
  const legGeo = new THREE.BufferGeometry();
  legGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const legMat = new THREE.LineBasicMaterial({ color: '#15140f' });
  group.add(new THREE.LineSegments(legGeo, legMat));
  // wings: veined, iridescent blades hinged on the thorax, folded back over the abdomen at rest
  const wingGeo = new THREE.PlaneGeometry(5.4 * MM, 2.3 * MM, 1, 1);
  wingGeo.rotateX(-Math.PI / 2); // lie flat (normal +Y)
  wingGeo.translate(-2.7 * MM, 0, 0); // root at the origin, blade toward −X
  const wingMat = new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: 1 }, uLightColor: fx.uLightColor },
    vertexShader: WING_VS,
    fragmentShader: WING_FS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mkWing = (s: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(1.0 * MM, 1.45 * MM, s * 0.55 * MM);
    const m = new THREE.Mesh(wingGeo, wingMat);
    m.raycast = noPick;
    pivot.add(m);
    group.add(pivot);
    return pivot;
  };
  const wingL = mkWing(1);
  const wingR = mkWing(-1);
  group.traverse((o) => {
    o.userData.noPick = true;
    (o as THREE.Mesh).raycast = noPick;
  });
  group.visible = false;
  return {
    group,
    wingL,
    wingR,
    wingMat,
    dispose() {
      bodyGeo.dispose();
      bandGeo.dispose();
      eyeGeo.dispose();
      legGeo.dispose();
      wingGeo.dispose();
      bodyMat.dispose();
      bandMat.dispose();
      eyeMat.dispose();
      legMat.dispose();
      wingMat.dispose();
    },
  };
}

/** Wing pose: spread (rad, sweeping the tips out) and lift (rad, raising them). */
function poseWings(f: Fly, spread: number, lift: number): void {
  // sweep the blade out from the body (about Y), then raise it about the body axis (X)
  f.wingL.rotation.set(-lift, spread, 0, 'XYZ');
  f.wingR.rotation.set(lift, -spread, 0, 'XYZ');
}

// ───────────────────────────── the component ─────────────────────────────

const _S = new THREE.Vector3();
const _P = new THREE.Vector3();
const _Q = new THREE.Vector3();
const _T = new THREE.Vector3();
const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _side = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

interface JetState {
  seq: number;
  phase: string;
  fired: boolean;
  hit: boolean;
  ripples: number;
  lastStruggle: number;
  /** Rest orientation of the fly (kept while it tumbles). */
  restQ: THREE.Quaternion;
  flyoffFrom: THREE.Vector3;
  /** The shooter's drawn body (the jet starts at its drawn snout, which the renderer may hold a little off the AI's). */
  shooter: THREE.Object3D | null;
  /** Drawn snout + heading at the moment of the shot. */
  from: THREE.Vector3;
  dir: THREE.Vector3;
}

function ArcherJetsInner({ tankId, d, fx, reducedMotion }: { tankId: string; d: TankDims; fx: TankFXUniforms; reducedMotion: boolean }) {
  const size = useThree((s) => s.size);
  const extra = useMemo(() => ({ uPixelScale: { value: 800 } }), []);

  const jet = useMemo(() => {
    const n = (SEG + 1) * 2;
    const g = new THREE.BufferGeometry();
    const aS = new Float32Array(n);
    const aSide = new Float32Array(n);
    for (let i = 0; i <= SEG; i++) {
      aS[i * 2] = i / SEG;
      aS[i * 2 + 1] = i / SEG;
      aSide[i * 2] = -1;
      aSide[i * 2 + 1] = 1;
    }
    const idx: number[] = [];
    for (let i = 0; i < SEG; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
    g.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, d.H, 0), Math.hypot(d.L, d.W, d.H));
    const u = {
      uS: { value: new THREE.Vector3() },
      uQ: { value: new THREE.Vector3() },
      uT: { value: new THREE.Vector3() },
      uHead: { value: 0 },
      uTail: { value: 0 },
      uWidth: { value: 0.0021 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uSeed: { value: 0 },
      uLightColor: fx.uLightColor,
      uPixelScale: extra.uPixelScale,
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: JET_VS,
      fragmentShader: JET_FS,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    return { g, mat, u };
  }, [d.H, d.L, d.W, fx, extra]);
  useEffect(
    () => () => {
      jet.g.dispose();
      jet.mat.dispose();
    },
    [jet],
  );

  const drops = useMemo(() => {
    const pos = new Float32Array(MAXD * 3);
    const vel = new Float32Array(MAXD * 3);
    const sz = new Float32Array(MAXD);
    const alpha = new Float32Array(MAXD);
    const life = new Float32Array(MAXD);
    /** 0 = free droplet, 1 = bead sliding down the glass, 2 = the jet's leading drop, 3 = bubble, 4 = glint. */
    const kind = new Uint8Array(MAXD);
    /** Shader mode per point (see DROP_VS). */
    const mode = new Float32Array(MAXD);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aMode', new THREE.BufferAttribute(mode, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, d.H, 0), Math.hypot(d.L, d.W, d.H));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPixelScale: extra.uPixelScale, uLightColor: fx.uLightColor },
      vertexShader: DROP_VS,
      fragmentShader: DROP_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    return { g, mat, pos, vel, sz, alpha, life, kind, mode, head: 1 };
  }, [d.H, d.L, d.W, fx, extra]);
  useEffect(
    () => () => {
      drops.g.dispose();
      drops.mat.dispose();
    },
    [drops],
  );

  // lane:w2-visual — expanding light rings on the surface (see the header)
  const rings = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1]), 3));
    g.setIndex([0, 2, 1, 0, 3, 2]);
    const data = new Float32Array(MAXR * 4);
    for (let i = 0; i < MAXR; i++) data[i * 4 + 2] = -100;
    const attr = new THREE.InstancedBufferAttribute(data, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aRing', attr);
    g.instanceCount = MAXR;
    const u = { uNow: { value: 0 }, uY: { value: 0 }, uLightColor: fx.uLightColor };
    const mat = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: RING_VS,
      fragmentShader: RING_FS,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    mat.forceSinglePass = true;
    return { g, mat, u, data, attr, head: 0, until: -1 };
  }, [fx]);
  useEffect(
    () => () => {
      rings.g.dispose();
      rings.mat.dispose();
    },
    [rings],
  );
  const ringMesh = useRef<THREE.Mesh>(null);

  const fly = useMemo(() => buildFly(fx), [fx]);
  useEffect(() => () => fly.dispose(), [fly]);

  // QA: window.__AQ_ARCHER_PROJECT(x, y, z) → screen px of a tank-local point (verifying the jet sits on the snout)
  const groupRef = useRef<THREE.Group>(null);
  const camera = useThree((s3) => s3.camera);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const v = new THREE.Vector3();
    (window as unknown as { __AQ_ARCHER_PROJECT?: (x: number, y: number, z: number) => [number, number] | null }).__AQ_ARCHER_PROJECT = (x, y, z) => {
      const gr = groupRef.current;
      if (!gr) return null;
      v.set(x, y, z).applyMatrix4(gr.matrixWorld).project(camera);
      return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
    };
    // …and where a creature is actually drawn, in tank-local metres
    (window as unknown as { __AQ_ARCHER_DRAWN?: (id: string) => [number, number, number] | null }).__AQ_ARCHER_DRAWN = (id) => {
      const gr = groupRef.current;
      if (!gr) return null;
      let root: THREE.Object3D = gr;
      while (root.parent) root = root.parent;
      let found: THREE.Object3D | null = null;
      root.traverse((o) => {
        if (!found && o.userData.creatureId === id) found = o;
      });
      if (!found) return null;
      const w = (found as THREE.Object3D).getWorldPosition(v);
      gr.worldToLocal(w);
      return [w.x, w.y, w.z];
    };
  }, [camera, size]);

  const st = useRef<JetState>({ seq: -1, phase: '', fired: false, hit: false, ripples: 0, lastStruggle: 0, restQ: new THREE.Quaternion(), flyoffFrom: new THREE.Vector3(), shooter: null, from: new THREE.Vector3(), dir: new THREE.Vector3(0, 1, 0) });
  const jetMesh = useRef<THREE.Mesh>(null);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const cam = state.camera as THREE.PerspectiveCamera;
    extra.uPixelScale.value = (size.height * state.viewport.dpr) / (2 * Math.tan(((cam.fov ?? 40) * Math.PI) / 360));
    const t = state.clock.elapsedTime;
    const now = fx.uTime.value;
    const sy = d.waterY;
    const s = archerShots.get(tankId);
    const J = st.current;
    const D = drops;
    const calm = reducedMotion ? 0.5 : 1;
    const R = rings;
    R.u.uNow.value = t;
    R.u.uY.value = sy + 0.0008;

    // ── new shot: reset ──
    if (s && s.seq !== J.seq) {
      J.seq = s.seq;
      J.fired = false;
      J.hit = false;
      J.ripples = 0;
      J.lastStruggle = 0;
      J.phase = '';
      restOrientation(s, J.restQ);
      J.shooter = findCreatureRoot(groupRef.current, s.shooterId);
    }

    // ── the jet ──
    const u = jet.u;
    u.uTime.value = t;
    let jetOn = false;
    if (s && s.jetAge >= 0 && s.jetAge < JET_FLIGHT_S + JET_POUR_S + 0.12) {
      if (!J.fired) drawnSnout(s, J);
      jetPath(J, s, sy);
      const head = Math.pow(clamp01(s.jetAge / JET_FLIGHT_S), 1.3);
      const tail = Math.pow(clamp01((s.jetAge - JET_POUR_S) / JET_FLIGHT_S), 1.3);
      u.uS.value.copy(_S);
      u.uQ.value.copy(_Q);
      u.uT.value.copy(_T);
      u.uHead.value = head;
      u.uTail.value = tail;
      u.uSeed.value = s.seed;
      u.uOpacity.value = 1 - clamp01((s.jetAge - JET_FLIGHT_S - JET_POUR_S * 0.5) / 0.1);
      jetOn = head - tail > 0.01;
      if (!J.fired) {
        J.fired = true;
        // the jet breaks the surface: a ring and a little spray where it leaves the water
        addSurfaceRipple(fx, _S.x, _S.z, 0.45 * calm, now);
        const n = reducedMotion ? 2 : 5;
        for (let i = 0; i < n; i++) {
          _v.set((Math.random() - 0.5) * 0.12, 0.12 + Math.random() * 0.14, (Math.random() - 0.5) * 0.12).addScaledVector(s.dir, 0.08);
          spawnDrop(D, _S, _v, 0.0009 + Math.random() * 0.0008, 0);
        }
        // lane:w2-visual — what the front view can see of it: a light ring, a glint at the film, micro-bubbles below
        spawnRing(R, _S.x, _S.z, calm, t);
        spawnGlint(D, _P.set(_S.x, sy + 0.002, _S.z), 0.007, 0.7 * calm);
        spawnBubbles(D, _S.x, _S.z, sy, reducedMotion ? 2 : 5);
      }
      // the leading drop (the jet gathers into one heavy drop at its head)
      if (head < 0.999) {
        bez(head, _v);
        spawnHeadDrop(D, _v);
      } else D.sz[0] = 0;
      if (!J.hit && s.jetAge >= JET_FLIGHT_S) {
        J.hit = true;
        D.sz[0] = 0;
        splash(D, s, reducedMotion);
        // lane:w2-visual — the strike catches the light
        spawnGlint(D, _T, 0.011, calm);
      }
    } else D.sz[0] = 0;
    if (jetMesh.current) jetMesh.current.visible = jetOn;

    // ── droplets ──
    stepDrops(D, dt, sy, d, (x, z) => {
      if (J.ripples < 3) {
        J.ripples++;
        addSurfaceRipple(fx, x, z, 0.14 * calm, now);
        if (J.ripples <= 2) spawnRing(R, x, z, 0.3 * calm, t);
      }
    });
    if (ringMesh.current) ringMesh.current.visible = t < R.until;

    // ── the fly ──
    const g = fly.group;
    if (!s || s.phase === 'gone' || (s.phase === 'flyoff' && s.age > 0.9)) {
      if (s && s.phase === 'gone' && J.phase && J.phase !== 'gone') {
        // snapped up at the surface
        addSurfaceRipple(fx, s.insect.x, s.insect.z, (J.phase === 'float' ? 0.7 : 0.5) * calm, now);
        // lane:w2-visual — the snap: a ring and a few bubbles from the gulp
        spawnRing(R, s.insect.x, s.insect.z, 0.9 * calm, t);
        spawnBubbles(D, s.insect.x, s.insect.z, sy, reducedMotion ? 1 : 3);
      }
      g.visible = false;
      J.phase = s?.phase ?? '';
      return;
    }
    g.visible = true;
    const buzz = (lift: number) => poseWings(fly, 0.55 + Math.sin(t * 97) * 0.15, lift * (0.55 + 0.45 * Math.sin(t * 131)));
    fly.wingMat.uniforms.uAlpha.value = 1;
    switch (s.phase) {
      case 'rest':
      case 'shot': {
        // landing: it flutters in from a little way off, then settles and flicks its wings now and then
        const land = clamp01(s.phase === 'rest' ? s.age / 0.45 : 1);
        g.quaternion.copy(J.restQ);
        restPosition(s, g.position);
        if (land < 1) {
          const k = (1 - land) * (1 - land);
          _side.crossVectors(s.perchN, Y);
          if (_side.lengthSq() < 1e-4) _side.set(1, 0, 0);
          _side.normalize();
          g.position.addScaledVector(s.perchN, 0.022 * k).addScaledVector(_side, 0.02 * k).addScaledVector(Y, 0.006 * k);
          buzz(1);
          fly.wingMat.uniforms.uAlpha.value = 0.6;
        } else {
          const flick = Math.max(0, Math.sin(t * 2.3 + s.seed * 20) - 0.93) * 12;
          poseWings(fly, 0.3 + flick * 0.25, 0.08 + flick * 0.35);
        }
        g.scale.setScalar(FLY_SCALE * (0.6 + 0.4 * land));
        break;
      }
      case 'fall': {
        // knocked off: tumbling, wings whirring
        g.position.copy(s.insect);
        _axis.set(Math.sin(s.seed * 40), 0.4, Math.cos(s.seed * 40)).normalize();
        _q2.setFromAxisAngle(_axis, s.spin);
        g.quaternion.copy(J.restQ).premultiply(_q2);
        g.scale.setScalar(FLY_SCALE);
        buzz(1);
        fly.wingMat.uniforms.uAlpha.value = 0.55;
        break;
      }
      case 'float': {
        if (J.phase !== 'float') {
          addSurfaceRipple(fx, s.insect.x, s.insect.z, 0.4 * calm, now);
          spawnRing(R, s.insect.x, s.insect.z, 0.7 * calm, t); // lane:w2-visual
        }
        // stuck in the surface film, twitching and turning; little rings as it struggles
        g.position.copy(s.insect);
        g.position.y = sy + 0.0017 * FLY_SCALE + Math.sin(t * 7 + s.seed * 9) * 0.00025;
        _fwd.set(Math.cos(s.insectYaw + s.age * 0.8), 0, Math.sin(s.insectYaw + s.age * 0.8));
        _up.set(0, 1, 0);
        basis(_fwd, _up, g.quaternion);
        const tw = Math.max(0, Math.sin(t * 5.1 + s.seed * 13));
        poseWings(fly, 0.85 + tw * 0.2, 0.05 + tw * 0.25);
        if (t - J.lastStruggle > 0.55) {
          J.lastStruggle = t;
          addSurfaceRipple(fx, s.insect.x, s.insect.z, 0.08 * calm, now);
        }
        g.scale.setScalar(FLY_SCALE);
        break;
      }
      case 'flyoff': {
        // it gave up waiting and buzzes off, out of sight
        if (J.phase !== 'flyoff') restPosition(s, J.flyoffFrom);
        const k = clamp01(s.age / 0.9);
        g.position.copy(J.flyoffFrom).addScaledVector(s.perchN, 0.03 * k).addScaledVector(Y, 0.006 * k);
        _side.crossVectors(s.perchN, Y);
        if (_side.lengthSq() > 1e-4) g.position.addScaledVector(_side.normalize(), 0.08 * k * k);
        g.quaternion.copy(J.restQ);
        buzz(1);
        fly.wingMat.uniforms.uAlpha.value = 0.55;
        g.scale.setScalar(FLY_SCALE * (1 - k * k));
        break;
      }
      default:
        break;
    }
    J.phase = s.phase;
  });

  return (
    <group ref={groupRef} name="archer-jets">
      <mesh ref={jetMesh} geometry={jet.g} material={jet.mat} raycast={noPick} userData={NP} renderOrder={3} frustumCulled={false} visible={false} />
      <points geometry={drops.g} material={drops.mat} raycast={noPick} userData={NP} renderOrder={3} frustumCulled={false} />
      <mesh ref={ringMesh} geometry={rings.g} material={rings.mat} raycast={noPick} userData={NP} renderOrder={3} frustumCulled={false} visible={false} />
      <primitive object={fly.group} />
    </group>
  );
}

// ───────────────────────────── helpers ─────────────────────────────

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** The jet leaves the water along the fish's heading and arcs over onto the fly: S (surface exit) → T, control Q. */
function jetPath(J: JetState, s: ArcherShot, sy: number): void {
  const dir = J.dir;
  const dy = Math.max(0.2, dir.y);
  // from the snout (it touches the film; a sliver of the jet may start just under it)
  _S.copy(J.from).addScaledVector(dir, Math.max(0, (sy - 0.004 - J.from.y) / dy));
  _T.copy(s.to);
  const len = _S.distanceTo(_T);
  _Q.copy(_S).addScaledVector(dir, len * 0.55);
}

/** The shooter's drawn snout and heading (falls back to the AI's numbers if the body can't be found). */
function drawnSnout(s: ArcherShot, J: JetState): void {
  const r = J.shooter;
  if (!r || !r.parent) {
    J.from.copy(s.from);
    J.dir.copy(s.dir);
    return;
  }
  // creature roots use rotation (roll, yaw, pitch, 'YZX'), head +X, scale = body length (src/runtime/tankRuntime.ts)
  const yaw = r.rotation.y;
  const pitch = r.rotation.z;
  const cp = Math.cos(pitch);
  J.dir.set(cp * Math.cos(yaw), Math.sin(pitch), -cp * Math.sin(yaw));
  J.from.copy(r.position).addScaledVector(J.dir, r.scale.x * 0.47);
}

/** The drawn root of a creature in this tank (creature roots carry userData.creatureId). */
function findCreatureRoot(from: THREE.Object3D | null, id: string): THREE.Object3D | null {
  // climb to the tank's own group (a few levels up), then look for the body among its descendants
  let top: THREE.Object3D | null = from;
  for (let i = 0; i < 4 && top?.parent; i++) top = top.parent;
  let found: THREE.Object3D | null = null;
  top?.traverse((o) => {
    if (!found && o.userData.creatureId === id) found = o;
  });
  return found;
}

function bez(k: number, out: THREE.Vector3): THREE.Vector3 {
  const o = 1 - k;
  return out.set(0, 0, 0).addScaledVector(_S, o * o).addScaledVector(_Q, 2 * o * k).addScaledVector(_T, k * k);
}

function basis(fwd: THREE.Vector3, up: THREE.Vector3, out: THREE.Quaternion): void {
  _side.crossVectors(fwd, up).normalize();
  const u = _v.crossVectors(_side, fwd).normalize();
  _m.makeBasis(fwd, u, _side);
  out.setFromRotationMatrix(_m);
}

/** How the fly sits on its perch: back toward the air (perch normal); on glass it faces roughly up. */
function restOrientation(s: ArcherShot, out: THREE.Quaternion): void {
  _up.copy(s.perchN);
  if (Math.abs(_up.y) > 0.7) _fwd.set(Math.cos(s.insectYaw), 0, Math.sin(s.insectYaw));
  else {
    // on a vertical pane: head up-ish, tilted a little to one side
    _side.crossVectors(_up, Y).normalize();
    const tilt = (s.seed - 0.5) * 1.3;
    _fwd.copy(Y).multiplyScalar(Math.cos(tilt)).addScaledVector(_side, Math.sin(tilt));
  }
  _fwd.addScaledVector(_up, -_fwd.dot(_up)).normalize();
  basis(_fwd, _up, out);
}

/** Body centre when perched: the AI point sits 3.5 mm off the glass; the fly stands ~2 mm off it on its legs. */
function restPosition(s: ArcherShot, out: THREE.Vector3): THREE.Vector3 {
  out.copy(s.insect);
  if (s.perch === 'glass') out.addScaledVector(s.perchN, 0.0021 - 0.0035);
  else out.y += 0.0019;
  return out;
}

type Drops = {
  pos: Float32Array;
  vel: Float32Array;
  sz: Float32Array;
  alpha: Float32Array;
  life: Float32Array;
  kind: Uint8Array;
  mode: Float32Array;
  head: number;
  g: THREE.BufferGeometry;
};

type Rings = { data: Float32Array; attr: THREE.InstancedBufferAttribute; head: number; until: number };

/** lane:w2-visual — start a surface light ring at tank-local (x, z); `now` = the render clock. */
function spawnRing(R: Rings, x: number, z: number, strength: number, now: number): void {
  const i = R.head;
  R.head = (R.head + 1) % MAXR;
  R.data[i * 4] = x;
  R.data[i * 4 + 1] = z;
  R.data[i * 4 + 2] = now;
  R.data[i * 4 + 3] = strength;
  R.attr.needsUpdate = true;
  R.until = Math.max(R.until, now + RING_S);
}

/** lane:w2-visual — a brief soft glint (sunlight catching the burst); size in metres, kept ≥ 18 px on screen. */
function spawnGlint(D: Drops, p: THREE.Vector3, size: number, strength: number): void {
  // (a glint never moves: its x "velocity" holds its strength)
  _v.set(strength, 0, 0);
  const i = spawnDrop(D, p, _v, size, K_GLINT);
  D.alpha[i] = strength;
}

/** lane:w2-visual — micro-bubbles the jet or a splash drives a centimetre or two under, which rise back and pop. */
function spawnBubbles(D: Drops, x: number, z: number, sy: number, n: number): void {
  for (let i = 0; i < n; i++) {
    _P.set(x + (Math.random() - 0.5) * 0.012, sy - 0.003 - Math.random() * 0.006, z + (Math.random() - 0.5) * 0.012);
    _v.set((Math.random() - 0.5) * 0.03, -(0.05 + Math.random() * 0.1), (Math.random() - 0.5) * 0.03);
    spawnDrop(D, _P, _v, 0.0007 + Math.random() * 0.0009, K_BUBBLE);
  }
}

function spawnHeadDrop(D: Drops, p: THREE.Vector3): void {
  D.pos[0] = p.x;
  D.pos[1] = p.y;
  D.pos[2] = p.z;
  D.sz[0] = 0.0048;
  D.alpha[0] = 1;
  D.life[0] = 0.05;
  D.kind[0] = 2;
  D.mode[0] = 2;
}

function spawnDrop(D: Drops, p: THREE.Vector3, v: THREE.Vector3, size: number, kind: number): number {
  const i = D.head;
  D.head = D.head + 1 >= MAXD ? 1 : D.head + 1;
  D.pos[i * 3] = p.x;
  D.pos[i * 3 + 1] = p.y;
  D.pos[i * 3 + 2] = p.z;
  D.vel[i * 3] = v.x;
  D.vel[i * 3 + 1] = v.y;
  D.vel[i * 3 + 2] = v.z;
  D.sz[i] = size;
  D.alpha[i] = 1;
  D.life[i] = kind === 1 ? 1.6 + Math.random() : kind === K_GLINT ? GLINT_S : kind === K_BUBBLE ? 2.5 : 1.2;
  D.kind[i] = kind;
  D.mode[i] = kind === K_GLINT ? 1 : 0;
  return i;
}

/** The jet bursts on the fly: spray off the pane / leaf, and a few beads that run down the glass. */
function splash(D: Drops, s: ArcherShot, reducedMotion: boolean): void {
  const n = reducedMotion ? 6 : 18;
  _axis.subVectors(_T, _Q).normalize(); // incoming direction at the fly
  for (let i = 0; i < n; i++) {
    // bounce back off the surface it hit, fanned out
    _v.copy(_axis).addScaledVector(s.perchN, -2 * _axis.dot(s.perchN));
    _v.x += (Math.random() - 0.5) * 0.9;
    _v.y += (Math.random() - 0.2) * 0.9;
    _v.z += (Math.random() - 0.5) * 0.9;
    _v.normalize().multiplyScalar(0.14 + Math.random() * 0.36);
    spawnDrop(D, _T, _v, 0.0012 + Math.random() * 0.0018, 0);
  }
  if (s.perch === 'glass') {
    const beads = reducedMotion ? 3 : 6;
    for (let i = 0; i < beads; i++) {
      _v.set(0, -(0.012 + Math.random() * 0.02), 0);
      const p = _P.copy(_T).addScaledVector(s.perchN, -0.0028);
      p.x += (Math.random() - 0.5) * 0.012 * Math.abs(s.perchN.z);
      p.z += (Math.random() - 0.5) * 0.012 * Math.abs(s.perchN.x);
      p.y += (Math.random() - 0.3) * 0.006;
      spawnDrop(D, p, _v, 0.0015 + Math.random() * 0.0012, 1);
    }
  }
}

function stepDrops(D: Drops, dt: number, sy: number, d: TankDims, onLand: (x: number, z: number) => void): void {
  const x0 = -d.L / 2 + 0.002;
  const x1 = d.L / 2 - 0.002;
  const z0 = -d.W / 2 + 0.002;
  const z1 = d.W / 2 - 0.002;
  for (let i = 1; i < MAXD; i++) {
    if (D.sz[i] <= 0) continue;
    D.life[i] -= dt;
    if (D.kind[i] === K_GLINT) {
      // a glint: flares in a frame, then fades fast
      const k = Math.max(0, D.life[i] / GLINT_S);
      D.alpha[i] = D.vel[i * 3] * k * k;
      if (D.life[i] <= 0) {
        D.sz[i] = 0;
        D.alpha[i] = 0;
      }
      continue;
    }
    if (D.kind[i] === K_BUBBLE) {
      // driven down by the splash, then buoyant: slows, turns and rises (with a little wobble) and pops at the film
      D.vel[i * 3 + 1] = Math.min(0.1, D.vel[i * 3 + 1] + 0.55 * dt);
      D.vel[i * 3] *= 1 - Math.min(1, 3 * dt);
      D.vel[i * 3 + 2] *= 1 - Math.min(1, 3 * dt);
      D.pos[i * 3] = Math.min(x1, Math.max(x0, D.pos[i * 3] + (D.vel[i * 3] + Math.sin(D.life[i] * 23 + i) * 0.008) * dt));
      D.pos[i * 3 + 1] += D.vel[i * 3 + 1] * dt;
      D.pos[i * 3 + 2] = Math.min(z1, Math.max(z0, D.pos[i * 3 + 2] + D.vel[i * 3 + 2] * dt));
      D.alpha[i] = 0.75;
      if (D.pos[i * 3 + 1] >= sy - 0.0008 || D.life[i] <= 0) {
        D.sz[i] = 0;
        D.alpha[i] = 0;
      }
      continue;
    }
    if (D.kind[i] === 1) {
      // a bead on the glass: slides down, pausing and speeding up like real drops, and joins the water
      const k = 0.6 + 0.8 * Math.max(0, Math.sin(D.life[i] * 7 + i));
      D.pos[i * 3 + 1] += D.vel[i * 3 + 1] * k * dt;
      D.alpha[i] = Math.min(1, D.life[i] * 2);
    } else {
      D.vel[i * 3 + 1] -= 1.7 * dt; // (a touch slow, so the spray hangs long enough to see)
      D.pos[i * 3] = Math.min(x1, Math.max(x0, D.pos[i * 3] + D.vel[i * 3] * dt));
      D.pos[i * 3 + 1] += D.vel[i * 3 + 1] * dt;
      D.pos[i * 3 + 2] = Math.min(z1, Math.max(z0, D.pos[i * 3 + 2] + D.vel[i * 3 + 2] * dt));
      if (D.pos[i * 3 + 1] > d.H - 0.004) {
        D.pos[i * 3 + 1] = d.H - 0.004;
        D.vel[i * 3 + 1] = -Math.abs(D.vel[i * 3 + 1]) * 0.2;
      }
    }
    if (D.pos[i * 3 + 1] <= sy || D.life[i] <= 0) {
      if (D.pos[i * 3 + 1] <= sy && D.kind[i] === 0) onLand(D.pos[i * 3], D.pos[i * 3 + 2]);
      D.sz[i] = 0;
      D.alpha[i] = 0;
    }
  }
  (D.g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  (D.g.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  (D.g.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  (D.g.attributes.aMode as THREE.BufferAttribute).needsUpdate = true;
}
