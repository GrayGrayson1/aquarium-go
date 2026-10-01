/**
 * Blue-leg hermit crab (Clibanarius tricolor): a borrowed cerith-style spiral shell (shared logarithmic-spiral
 * generator) with the crab emerging from the aperture — carapace front, stalked eyes, orange antennae, two equal
 * white-tipped claws and two pairs of banded blue walking legs. Walks with an alternating gait, picks at the
 * substrate with its claws, and retreats fully into the shell (claw blocking the aperture) on startle / hiding.
 *
 * Local space: head +X, feet on y = -groundOffset. Length 1 ≈ shell + emerging crab (antennae excluded).
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { CreatureFactory, CreatureObject } from '../types';
import type { CreatureRuntime } from '@/types';
import type { RenderLod } from '../../lod';
import { GeoBuilder, ellipsoid, resamplePath, skin1, tube, type V3 } from './common/geo';
import { RigDef, instantiateRig, makeSkinned, setRot } from './common/rig';
import { acquire, release } from './common/cache';
import { critterTiers } from './common/tiers';
import { createCritterMaterial, createCritterUniforms } from './common/materials';
import { acquireEyeGeometry, createEyeMaterial, releaseEyeGeometry } from './common/eyes';
import { applyAppearance } from './common/palette';
import { damp, lerp, TAU } from './common/math';
import { addShell, shellBounds, type SnailSpec } from './snail';

const GROUND = 0.2;
/**
 * A borrowed turban / nassa-style shell carried spire-back: sized so the crab's front half (shield, eyestalks,
 * antennae, both claws and the four walking legs) stays clearly visible in front of and below it.
 */
const SHELL: SnailSpec = {
  id: 'hermit_shell',
  kind: 0,
  W: 1.75,
  whorls: 5.4,
  spire: 2.3,
  apA: 0.58,
  apB: 0.82,
  size: 0.122,
  tentacle: 0,
  siphon: false,
  apex: [-1, 0.36, 0.08],
  opening: [0.1, -1, -0.35],
  apCenter: [0.0, -0.08, 0.0],
  place: [-0.17, -0.185, 0.03],
};

interface HermitTemplate {
  geo: THREE.BufferGeometry;
  rig: RigDef;
  aperture: THREE.Vector3;
  eyePos: THREE.Vector3[];
}

function buildHermit(lod: RenderLod): HermitTemplate {
  const sb = shellBounds(SHELL);
  // the crab's shield sits just in front of the shell's lower front edge
  const C = new THREE.Vector3(sb.max.x - 0.03, -0.075, 0);
  const rig = new RigDef();
  rig.add('root', null, [0, 0, 0]);
  rig.add('shell', 'root', [(sb.min.x + sb.max.x) / 2, sb.min.y + 0.05, 0]);
  rig.add('crab', 'root', [C.x, C.y, C.z]);
  const shellB = rig.idx('shell');
  const crabB = rig.idx('crab');
  const g = new GeoBuilder();
  const { aperture } = addShell(g, SHELL, lod, shellB, 0);
  const aux: [number, number, number, number] = [aperture.x, aperture.y, aperture.z, 0];
  const hi = lod === 0;
  const nvL = hi ? 9 : 5;
  const at = (dx: number, dy: number, dz: number): V3 => [C.x + dx, C.y + dy, C.z + dz];
  // cephalothorax: hard front shield + softer rear running back into the shell
  ellipsoid(g, { center: at(0.045, 0.018, 0), radii: [0.07, 0.042, 0.06], nu: hi ? 14 : 8, nv: hi ? 20 : 10, skin: skin1(crabB), mask: [1, 0, 0, 0], aux });
  ellipsoid(g, { center: at(-0.03, 0.01, 0), radii: [0.07, 0.05, 0.068], nu: hi ? 10 : 6, nv: hi ? 16 : 8, skin: skin1(crabB), mask: [1, 1, 0, 0], aux });
  const eyePos: THREE.Vector3[] = [];
  for (const side of [1, -1]) {
    // eyestalks: long, upright, slightly splayed (orange at the base, blue toward the eye)
    const b = new THREE.Vector3(...at(0.1, 0.035, side * 0.02));
    const t = new THREE.Vector3(...at(0.15, 0.12, side * 0.045));
    tube(g, { path: resamplePath([[b.x, b.y, b.z], [(b.x + t.x) / 2 + 0.004, (b.y + t.y) / 2, (b.z + t.z) / 2], [t.x, t.y, t.z]], 6), nv: nvL, radius: (q) => lerp(0.012, 0.01, q), skin: () => skin1(crabB), mask: () => [2, 0, 0, 0], aux });
    eyePos.push(t.clone().add(new THREE.Vector3(0.004, 0.01, side * 0.002)));
    // antennules (short, forked) — lod 0 only
    if (hi) {
      const ab = new THREE.Vector3(...at(0.11, 0.02, side * 0.008));
      tube(g, { path: resamplePath([[ab.x, ab.y, ab.z], [ab.x + 0.04, ab.y + 0.035, ab.z + side * 0.01], [ab.x + 0.07, ab.y + 0.05, ab.z + side * 0.02]], 6), nv: 4, radius: (q) => lerp(0.004, 0.002, q), skin: () => skin1(crabB), mask: (q) => [3, q * 0.3, side, 0], aux: [ab.x, ab.y, ab.z, 0] });
    }
    // antennae: long orange whips sweeping forward and out
    const ab = new THREE.Vector3(...at(0.105, 0.005, side * 0.03));
    const pts: V3[] = [0, 0.33, 0.66, 1].map((q) => [ab.x + q * 0.3, ab.y + q * 0.1 - q * q * 0.07, ab.z + side * q * 0.16]);
    tube(g, { path: resamplePath(pts, hi ? 16 : 7), nv: 4, radius: (q) => lerp(0.0045, 0.0013, q), skin: () => skin1(crabB), mask: (q) => [3, q, side, 0], aux: [ab.x, ab.y, ab.z, 0] });
  }
  for (const side of [1, -1]) {
    // chelipeds: merus → carpus folded in front of the face → broad palm with two white-tipped fingers
    const S = new THREE.Vector3(...at(0.07, -0.03, side * 0.05));
    const E = new THREE.Vector3(...at(0.14, -0.015, side * 0.1));
    const W = new THREE.Vector3(...at(0.2, -0.05, side * 0.075));
    const cAux: [number, number, number, number] = [S.x, S.y, S.z, 0];
    tube(g, { path: resamplePath([[S.x, S.y, S.z], [E.x, E.y, E.z], [W.x, W.y, W.z]], 10), nv: nvL + 2, radius: (q) => lerp(0.019, 0.023, q), capStart: 0.05, capRows: 2, skin: () => skin1(crabB), mask: (q) => [4, q * 0.6, 0, side], aux: cAux });
    const P = W.clone().add(new THREE.Vector3(0.045, -0.008, -side * 0.006));
    ellipsoid(g, { center: [P.x, P.y, P.z], radii: [0.052, 0.034, 0.03], nu: hi ? 10 : 6, nv: hi ? 14 : 8, skin: skin1(crabB), mask: [4, 0.75, 0, side], aux: cAux });
    for (const f of [0, 1]) {
      const fy = f === 0 ? -0.012 : 0.012;
      const a0 = new THREE.Vector3(P.x + 0.04, P.y + fy, P.z);
      tube(g, { path: resamplePath([[a0.x, a0.y, a0.z], [a0.x + 0.028, a0.y + fy * 0.4, a0.z - side * 0.004], [a0.x + 0.05, a0.y - fy * 0.35, a0.z - side * 0.01]], 6), nv: 6, radius: (q) => lerp(0.012, 0.004, q), capEnd: 0.05, capRows: 2, skin: () => skin1(crabB), mask: (q) => [4, 0.85 + q * 0.15, f + 1, side], aux: cAux });
    }
    // two pairs of walking legs: up and out from the body, knee, then down to the substrate
    for (let k = 0; k < 2; k++) {
      const lb = new THREE.Vector3(...at(0.045 - k * 0.045, -0.035, side * 0.05));
      const reach = k === 0 ? 0.16 : 0.07;
      const pts: V3[] = [
        [lb.x, lb.y, lb.z],
        [lb.x + reach * 0.25 + 0.01, lb.y + 0.035, lb.z + side * 0.08],
        [lb.x + reach * 0.55 + 0.02, lb.y + 0.03, lb.z + side * 0.15],
        [lb.x + reach * 0.85 + 0.03, lb.y - 0.06, lb.z + side * 0.2],
        [lb.x + reach + 0.035, -GROUND, lb.z + side * 0.215],
      ];
      tube(g, { path: resamplePath(pts, hi ? 16 : 8), nv: nvL, radius: (q) => lerp(0.017, 0.007, q), capStart: 0.04, capEnd: 0.03, capRows: 2, skin: () => skin1(crabB), mask: (q) => [5, q, k, side], aux: [lb.x, lb.y, lb.z, 0] });
    }
  }
  const geo = g.build();
  // portraits frame the crab and its shell, not the antennae (part 3) (L-6)
  geo.userData.frameSkip = [3];
  return { geo, rig, aperture, eyePos };
}

const HERMIT_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  float part = m.x;
  float t = uAgcTime;
  if (part < 0.5) return;
  vec3 piv = aAux.xyz;
  if (part > 4.5 && part < 5.5) {
    float ph = uAgcV0.x + m.z * 3.14159 + (m.w > 0.0 ? 0.0 : 1.5708);
    float amt = uAgcV0.y;
    agcPivotRot(p, n, piv, vec3(-m.w * max(0.0, cos(ph)) * 0.3 * amt, m.w * sin(ph) * 0.3 * amt, 0.0));
  } else if (part > 3.5 && part < 4.5) {
    float ph = uAgcV0.z + (m.w > 0.0 ? 0.0 : 3.14159);
    float pick = max(0.0, sin(ph)) * uAgcV0.w;
    agcPivotRot(p, n, piv, vec3(0.0, m.w * 0.1 * pick, -0.4 * pick + sin(t * 0.8 + m.w) * 0.04));
  } else if (part > 2.5 && part < 3.5) {
    p += vec3(0.0, sin(t * 2.3 + m.z * 2.0 + m.y * 4.0), cos(t * 1.7 + m.y * 3.0)) * m.y * m.y * 0.03;
  }
  // retreat into the shell
  p = mix(p, uAgcV1.xyz, uAgcV1.w * 0.96);
}
`;

const HERMIT_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x;
  vec3 P = vAgcRest;
  float seed = uAgcPat.w;
  vec3 legs = uAgcPal[0]; vec3 legs2 = uAgcPal[1]; vec3 white = uAgcPal[2]; vec3 shell = uAgcPal[3]; vec3 shell2 = uAgcPal[4]; vec3 orange = uAgcPal[5];
  if (part < 0.5) {
    float th = vAgcMask.y; float phi = vAgcMask.z; float u = vAgcMask.w;
    vec2 cs = vec2(cos(phi), sin(phi));
    float nat = agcFbm(vec3(th * 0.9, cs * 1.5 + seed));
    vec3 col = mix(shell, shell2, smoothstep(0.3, 0.75, nat));
    float cords = pow(abs(sin(phi * 7.0)), 5.0);
    float nod = pow(abs(sin(th * 6.0 + cs.x)), 6.0) * cords;
    col *= 1.0 - cords * 0.15;
    col = mix(col, vec3(0.85, 0.8, 0.7), nod * 0.3);
    s.height += cords * 0.0015 + nod * 0.002;
    // coralline / algae crust patches
    col = mix(col, vec3(0.55, 0.36, 0.42), smoothstep(0.62, 0.75, agcFbm(P * 22.0 + seed)) * 0.6);
    if (!gl_FrontFacing) col = shell2 * 0.3;
    s.albedo = col;
    s.rough = 0.7;
    s.clear = 0.1;
    return;
  }
  vec3 col = legs;
  if (part > 4.5 && part < 5.5) {
    // blue legs, white + orange bands at the joints
    float q = vAgcMask.y;
    float band = smoothstep(0.08, 0.02, abs(fract(q * 2.2 + 0.1) - 0.5) - 0.38);
    col = mix(mix(legs, legs2, q * 0.4), orange, smoothstep(0.02, 0.0, abs(q - 0.42) - 0.04));
    col = mix(col, white, smoothstep(0.02, 0.0, abs(q - 0.72) - 0.035) * 0.8);
    col = mix(col, vec3(0.08), smoothstep(0.93, 0.98, q));
    col *= 1.0 - band * 0.0;
  } else if (part > 3.5 && part < 4.5) {
    col = mix(legs, legs2, 0.3);
    col = mix(col, white, smoothstep(0.84, 0.96, vAgcMask.y));
    vec3 dc = agcCell(P * 160.0);
    col = mix(col, white * 0.9, (1.0 - smoothstep(0.1, 0.25, dc.x)) * 0.5);
  } else if (part > 2.5 && part < 3.5) {
    col = orange;
  } else if (part > 1.5 && part < 2.5) {
    col = mix(orange, legs, 0.35);
  } else {
    col = mix(legs2 * 0.55, vec3(0.2, 0.18, 0.22), 0.4);
  }
  s.albedo = col;
  s.rough = 0.4;
  s.clear = 0.6;
  s.sss = 0.2;
  s.sssCol = orange;
}
`;

export const createHermitCrab: CreatureFactory = (args) => {
  const { appearance: ap, fx, lod } = args;
  const key = `hermit|${lod}`;
  const tpl = acquire(key, () => buildHermit(lod), (t) => t.geo.dispose());
  const eyeGeo = acquireEyeGeometry(lod);
  const root = new THREE.Group();
  root.name = 'hermit_crab';
  const inner = new THREE.Group();
  root.add(inner);
  const rigI = instantiateRig(tpl.rig);
  for (const b of rigI.roots) inner.add(b);
  const u = createCritterUniforms(fx);
  applyAppearance(u, ap);
  u.uAgcV1.value.set(tpl.aperture.x - 0.03, tpl.aperture.y, tpl.aperture.z, 0);
  const mat = createCritterMaterial({ name: 'hermit', fx, u, surface: HERMIT_SURFACE, vertex: HERMIT_VERTEX, params: { side: THREE.DoubleSide, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.3 } });
  const mesh = makeSkinned(tpl.geo, mat, rigI, 1.8);
  mesh.castShadow = lod === 0;
  mesh.receiveShadow = lod < 2;
  inner.add(mesh);
  const eyeMat = createEyeMaterial(fx, u, { iris: new THREE.Color(0.02, 0.02, 0.02), pupil: new THREE.Color(0, 0, 0), sclera: new THREE.Color(0.03, 0.03, 0.03), ring: new THREE.Color(0.1, 0.1, 0.12), irisAngle: 1.3, pupilAngle: 0.5, catchlight: 1.2 });
  const crab = rigI.byName.crab;
  const crabRest = new THREE.Vector3(...tpl.rig.bones[2].pos);
  const eyeScale = 0.017;
  const eyes: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const e = new THREE.Mesh(eyeGeo, eyeMat.mat);
    e.position.copy(tpl.eyePos[i]).sub(crabRest);
    e.scale.setScalar(eyeScale);
    crab.add(e);
    eyes.push(e);
  }
  // lane:perf — hero detail tiers: lower-LOD mesh + eye spheres while the crab is a few pixels on screen
  const tiers = critterTiers(lod, (l) => `hermit|${l}`, buildHermit, (t) => t.geo.dispose(), tpl, (t, eg) => {
    mesh.geometry = t.geo;
    if (eg) for (const e of eyes) e.geometry = eg;
  }, true);
  root.userData.groundOffset = GROUND;
  root.userData.speciesVisual = 'hermit_crab';
  const B = rigI.byName;
  const seed = ((ap.patternSeed ?? 13) % 1000) / 1000;
  const st = { walk: 0, walkW: 0, pick: 0, pickW: 0, retreat: 0 };
  // selection: set by the renderer (not while the camera already follows this animal); drawn as a thin rim
  const sel = { on: false };
  const update = (rt: CreatureRuntime, dt: number, time: number) => {
    u.uAgcTime.value = time;
    const pose = rt.pose;
    const dead = pose === 'dead';
    const speed = Math.max(0, rt.speedBL || 0);
    const hide = dead || pose === 'startle' || pose === 'hiding';
    st.retreat = damp(st.retreat, hide ? 1 : 0, hide ? 8 : 0.8, dt);
    st.walkW = damp(st.walkW, !hide && speed > 0.02 ? 1 : 0, 5, dt);
    st.pickW = damp(st.pickW, !hide && (pose === 'feed' || pose === 'rest' || speed < 0.02) ? 1 : 0, 3, dt);
    st.walk += dt * TAU * (0.8 + speed * 5) * st.walkW;
    st.pick += dt * TAU * 1.6;
    u.uAgcV0.value.set(st.walk, st.walkW, st.pick, st.pickW * (1 - st.retreat));
    u.uAgcV1.value.w = st.retreat;
    // shell rocks with each step; drops onto the substrate when the crab withdraws
    setRot(B.shell, Math.sin(st.walk) * 0.04 * st.walkW, 0, Math.sin(st.walk * 2) * 0.02 * st.walkW - st.retreat * 0.2 + Math.sin(time * 0.6 + seed) * 0.01);
    B.shell.position.y = rigI.restPos[1].y - st.retreat * 0.08;
    for (const e of eyes) e.visible = st.retreat < 0.6;
    setRot(B.crab, 0, Math.sin(time * 0.4 + seed * 4) * 0.08, 0);
    u.uAgcCI.value = rt.colorIntensity ?? 1;
    u.uAgcHi.value = sel.on ? 0.85 + 0.15 * Math.sin(time * 3) : 0;
  };
  return {
    root,
    update,
    pickRadius: 0.55,
    setHighlight(on) {
      sel.on = on;
      u.uAgcHi.value = on ? 1 : 0;
    },
    setDetailPx: tiers.setDetailPx,
    dispose() {
      mat.dispose();
      eyeMat.mat.dispose();
      rigI.skeleton.dispose();
      tiers.dispose();
      release(key);
      releaseEyeGeometry(lod);
      root.removeFromParent();
    },
  } satisfies CreatureObject;
};
