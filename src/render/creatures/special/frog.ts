/**
 * African dwarf frog (Hymenochirus boettgeri): flattened pear-shaped body with a pointed snout, small eyes set on
 * the sides of the head, warty olive skin with dark spots, slender clawed forelimbs, and powerful hind legs with
 * long fully-webbed feet (translucent membranes between five toes).
 *
 * Motion: folded crouch at rest; the famous "zen" float (limbs spread, motionless, drifting) when hovering or at
 * the surface; synchronous frog-kick strokes when swimming (fast extension, slow recovery), faster for the
 * surface-breath dash; small throat pulsing.
 *
 * Local space: snout +X, length 1 = snout–vent length, belly contact at y = -groundOffset.
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { CreatureFactory, CreatureObject } from '../types';
import type { CreatureRuntime } from '@/types';
import type { RenderLod } from '../../lod';
import { GeoBuilder, intervalSkin, resamplePath, skin1, sheet, tube, type SkinInterval, type V3 } from './common/geo';
import { RigDef, instantiateRig, makeSkinned, setRot } from './common/rig';
import { acquire, release } from './common/cache';
import { createCritterMaterial, createCritterUniforms } from './common/materials';
import { acquireEyeGeometry, createEyeMaterial, releaseEyeGeometry } from './common/eyes';
import { applyAppearance, color } from './common/palette';
import { clamp, damp, lerp, smoothstep, smoothTable, TAU } from './common/math';

const GROUND = 0.095;
const W_T: [number, number][] = [[0, 0.03], [0.05, 0.07], [0.12, 0.115], [0.2, 0.15], [0.3, 0.175], [0.5, 0.21], [0.7, 0.215], [0.85, 0.17], [0.95, 0.1], [1, 0.03]];
const HT_T: [number, number][] = [[0, 0.02], [0.1, 0.045], [0.2, 0.06], [0.4, 0.078], [0.6, 0.088], [0.8, 0.075], [0.95, 0.04], [1, 0.012]];
const HB_T: [number, number][] = [[0, 0.018], [0.1, 0.035], [0.2, 0.05], [0.4, 0.07], [0.6, 0.082], [0.8, 0.07], [0.95, 0.04], [1, 0.012]];

interface FrogTemplate {
  body: THREE.BufferGeometry;
  web: THREE.BufferGeometry;
  rig: RigDef;
  eyePos: THREE.Vector3[];
}

function buildFrog(lod: RenderLod): FrogTemplate {
  const rig = new RigDef();
  rig.add('root', null, [0, 0, 0]);
  rig.add('head', 'root', [0.28, 0, 0]);
  const bi = (n: string) => rig.idx(n);
  const g = new GeoBuilder();
  const web = new GeoBuilder();
  const nu = lod === 0 ? 90 : lod === 1 ? 46 : 20;
  const nv = lod === 0 ? 44 : lod === 1 ? 26 : 12;
  const iv: SkinInterval[] = [
    { bone: bi('head'), s0: 0, s1: 0.22 },
    { bone: bi('root'), s0: 0.22, s1: 1 },
  ];
  g.grid({ nu, nv, wrapV: true, orient: 'ring' }, (i, j, smp) => {
    const u = i / (nu - 1);
    const s = u - (0.6 * Math.sin(TAU * u)) / TAU;
    const th = (j / nv) * TAU;
    const dome = s < 0.06 ? Math.sqrt(Math.max(0, 1 - (1 - s / 0.06) ** 2)) : 1;
    const back = s > 0.96 ? Math.sqrt(Math.max(0, 1 - ((s - 0.96) / 0.04) ** 2)) : 1;
    const d = dome * back;
    const c = Math.cos(th);
    const sn = Math.sin(th);
    const w = smoothTable(W_T, s) * d;
    const h = (c >= 0 ? smoothTable(HT_T, s) : smoothTable(HB_T, s)) * d;
    smp.x = 0.5 - s;
    smp.y = Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.4) * h;
    smp.z = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / 2.2) * w;
    smp.u = s;
    smp.v = j / nv;
    smp.mask = [0, 0, 0, 0];
    smp.skin = intervalSkin(s, iv, 0.8);
  });
  const nvL = lod === 0 ? 12 : lod === 1 ? 8 : 5;
  const eyePos: THREE.Vector3[] = [];
  for (const side of [1, -1]) {
    const sd = side > 0 ? 'R' : 'L';
    eyePos.push(new THREE.Vector3(0.335, 0.036, side * 0.098));
    // forelimbs: slender, clawed fingers
    const sh: V3 = [0.2, -0.03, side * 0.14];
    const el: V3 = [0.29, -0.05, side * 0.23];
    const wr: V3 = [0.36, -0.07, side * 0.21];
    rig.add(`A${sd}s`, 'root', sh);
    rig.add(`A${sd}e`, `A${sd}s`, el);
    const aS = bi(`A${sd}s`);
    const aE = bi(`A${sd}e`);
    const aIv: SkinInterval[] = [
      { bone: bi('root'), s0: 0, s1: 0.1 },
      { bone: aS, s0: 0.1, s1: 0.5 },
      { bone: aE, s0: 0.5, s1: 1 },
    ];
    tube(g, {
      path: resamplePath([[0.18, -0.02, side * 0.1], sh, el, wr], lod === 0 ? 14 : 7),
      nv: nvL,
      radius: (t) => lerp(0.028, 0.013, t),
      skin: (t) => intervalSkin(t, aIv, 0.8),
      mask: (t) => [1, t, 0, 0],
      capEnd: 0.03,
      capRows: 2,
    });
    if (lod < 2)
      for (let f = 0; f < 4; f++) {
        const a = -0.5 + f * 0.35;
        const dir = new THREE.Vector3(Math.cos(a), -0.1, Math.sin(a) * side);
        const p0 = new THREE.Vector3(...wr);
        const p1 = p0.clone().addScaledVector(dir, 0.07);
        tube(g, { path: resamplePath([[p0.x, p0.y, p0.z], [(p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2], [p1.x, p1.y, p1.z]], 5), nv: 5, radius: (t) => lerp(0.008, 0.004, t), capEnd: 0.05, capRows: 2, skin: () => skin1(aE), mask: (t) => [1, 1, t, 0] });
      }
    // hind legs (folded crouch at rest): hip → knee (forward-out) → ankle (back) → long webbed foot
    const hip: V3 = [-0.36, -0.01, side * 0.13];
    const knee: V3 = [-0.16, -0.03, side * 0.36];
    const ank: V3 = [-0.42, -0.05, side * 0.31];
    const heel: V3 = [-0.6, -0.06, side * 0.3];
    rig.add(`L${sd}h`, 'root', hip);
    rig.add(`L${sd}k`, `L${sd}h`, knee);
    rig.add(`L${sd}a`, `L${sd}k`, ank);
    const lH = bi(`L${sd}h`);
    const lK = bi(`L${sd}k`);
    const lA = bi(`L${sd}a`);
    const lIv: SkinInterval[] = [
      { bone: bi('root'), s0: 0, s1: 0.08 },
      { bone: lH, s0: 0.08, s1: 0.45 },
      { bone: lK, s0: 0.45, s1: 0.8 },
      { bone: lA, s0: 0.8, s1: 1 },
    ];
    tube(g, {
      path: resamplePath([[-0.3, 0.0, side * 0.08], hip, [-0.26, -0.02, side * 0.26], knee, [-0.3, -0.04, side * 0.35], ank, heel], lod === 0 ? 28 : 12),
      nv: nvL,
      radius: (t) => (t < 0.45 ? lerp(0.05, 0.036, t / 0.45) : t < 0.8 ? lerp(0.032, 0.02, (t - 0.45) / 0.35) : lerp(0.018, 0.012, (t - 0.8) / 0.2)),
      aspect: () => [0.8, 1],
      skin: (t) => intervalSkin(t, lIv, 0.7),
      mask: (t) => [2, t, 0, 0],
      capEnd: 0.03,
      capRows: 2,
    });
    // five toes fanning back from the heel, membranes between them
    const toeTips: THREE.Vector3[] = [];
    const heelV = new THREE.Vector3(...heel);
    for (let f = 0; f < 5; f++) {
      const a = lerp(-0.55, 0.45, f / 4);
      const L = [0.14, 0.18, 0.21, 0.19, 0.15][f];
      const dir = new THREE.Vector3(-Math.cos(a), 0, Math.sin(a) * side);
      const tip = heelV.clone().addScaledVector(dir, L);
      toeTips.push(tip);
      if (lod < 2) tube(g, { path: resamplePath([[heelV.x, heelV.y, heelV.z], [(heelV.x + tip.x) / 2, heelV.y - 0.002, (heelV.z + tip.z) / 2], [tip.x, tip.y - 0.004, tip.z]], 6), nv: 5, radius: (t) => lerp(0.009, 0.004, t), capEnd: 0.05, capRows: 2, skin: () => skin1(lA), mask: (t) => [2, 1, t, 0] });
    }
    for (let f = 0; f < 4; f++) {
      const a = toeTips[f];
      const b = toeTips[f + 1];
      sheet(web, lod === 0 ? 8 : 4, lod === 0 ? 6 : 3, (x, y, smp) => {
        // membrane: from heel to the chord between two toes, scalloped margin
        const edge = a.clone().lerp(b, x);
        const scallop = 1 - 0.18 * Math.sin(Math.PI * x);
        const p = heelV.clone().lerp(edge, y * scallop);
        smp.x = p.x;
        smp.y = p.y - 0.002;
        smp.z = p.z;
        smp.u = x;
        smp.v = y;
        smp.mask = [3, y, x, 0];
        smp.skin = skin1(lA);
      });
    }
  }
  return { body: g.build(), web: web.build(), rig, eyePos };
}

const FROG_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x;
  vec3 P = vAgcRest;
  float seed = uAgcPat.w;
  vec3 Q = P + seed;
  vec3 body = uAgcPal[0]; vec3 body2 = uAgcPal[1]; vec3 belly = uAgcPal[2]; vec3 web = uAgcPal[3]; vec3 spot = uAgcPal[5];
  if (part > 2.5) {
    vec3 col = mix(web, web * 0.7, vAgcMask.y * 0.4);
    float veins = pow(abs(sin(vAgcMask.z * 3.14159 * 3.0)), 12.0);
    s.albedo = mix(col, body2, veins * 0.3);
    s.alpha = 0.55 + 0.3 * (1.0 - vAgcMask.y);
    s.sss = 1.0;
    s.sssCol = web * 1.3;
    s.rough = 0.45;
    return;
  }
  float dors = part < 0.5 ? cos(vAgcUv.y * 6.2831853) : clamp(P.y * 20.0, -1.0, 1.0);
  vec3 col = mix(belly, mix(body, body2, smoothstep(0.4, 0.8, agcFbm(Q * 14.0))), smoothstep(-0.5, 0.2, dors));
  // dark spots
  vec3 c = agcCell(Q * (20.0 / max(uAgcPat.y, 0.4)));
  float sp = (1.0 - smoothstep(0.2, 0.38, c.x)) * step(0.35, c.z) * smoothstep(-0.4, 0.2, dors);
  col = mix(col, spot, sp * uAgcPat.z);
  // warty tubercles
  vec3 w = agcCell(Q * 90.0);
  float wart = 1.0 - smoothstep(0.0, 0.35, w.x);
  s.height += wart * 0.003 * agcResolve(0.004);
  col *= 0.92 + wart * 0.12;
  // limbs: faint banding
  if (part > 0.5) col = mix(col, spot, smoothstep(0.6, 0.9, sin(vAgcMask.y * 18.0)) * 0.25);
  s.albedo = col;
  s.rough = 0.42;
  s.clear = 0.5;
  s.sss = 0.25 + uAgcMat.z;
  s.sssCol = vec3(1.0, 0.6, 0.45);
}
`;

export const createDwarfFrog: CreatureFactory = (args) => {
  const { appearance: ap, fx, lod } = args;
  const key = `frog|${lod}`;
  const tpl = acquire(key, () => buildFrog(lod), (t) => {
    t.body.dispose();
    t.web.dispose();
  });
  const eyeGeo = acquireEyeGeometry(lod);
  const root = new THREE.Group();
  root.name = 'african_dwarf_frog';
  const inner = new THREE.Group();
  root.add(inner);
  const rigI = instantiateRig(tpl.rig);
  for (const b of rigI.roots) inner.add(b);
  const u = createCritterUniforms(fx);
  applyAppearance(u, ap);
  const bodyMat = createCritterMaterial({ name: 'frog', fx, u, surface: FROG_SURFACE, params: { roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 } });
  const webMat = createCritterMaterial({ name: 'frog-web', fx, u, surface: FROG_SURFACE, bump: 0, params: { roughness: 0.45, transparent: true, side: THREE.DoubleSide, depthWrite: false } });
  const body = makeSkinned(tpl.body, bodyMat, rigI, 2.2);
  body.castShadow = lod === 0;
  body.receiveShadow = lod < 2;
  inner.add(body);
  const webs = makeSkinned(tpl.web, webMat, rigI, 2.2);
  inner.add(webs);
  const eyeMat = createEyeMaterial(fx, u, { iris: color(ap.eyeColor, '#2e2618').multiplyScalar(1.4), pupil: new THREE.Color(0.005, 0.005, 0.005), sclera: color(ap.bodyColor).multiplyScalar(0.6), ring: new THREE.Color(0.55, 0.45, 0.2), irisAngle: 1.0, pupilAngle: 0.45, pupilAspect: 1.6, striation: 0.6, catchlight: 1.1 });
  const head = rigI.byName.head;
  for (let i = 0; i < 2; i++) {
    const e = new THREE.Mesh(eyeGeo, eyeMat.mat);
    e.position.copy(tpl.eyePos[i]).sub(new THREE.Vector3(0.28, 0, 0));
    e.scale.setScalar(0.03);
    e.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.25, 0.25, i === 0 ? 1 : -1).normalize());
    head.add(e);
  }
  root.userData.groundOffset = GROUND;
  root.userData.speciesVisual = 'african_dwarf_frog';
  const B = rigI.byName;
  const seed = ((ap.patternSeed ?? 21) % 1000) / 1000;
  const st = { kickPh: 0, swimW: 0, zenW: 0, crouchW: 1, ext: 0 };
  // selection: set by the renderer (not while the camera already follows this animal); drawn as a thin rim
  const sel = { on: false };
  const update = (rt: CreatureRuntime, dt: number, time: number) => {
    u.uAgcTime.value = time;
    const pose = rt.pose;
    const dead = pose === 'dead';
    const speed = Math.max(0, rt.speedBL || 0);
    const swimming = !dead && (speed > 0.15 || pose === 'surface_breath' || pose === 'startle');
    const zen = !dead && !swimming && (pose === 'hover' || (rt.ai?.galleryHeight as number) > 0.5 || pose === 'rest' && /float|zen|surface/i.test(rt.behavior || ''));
    st.swimW = damp(st.swimW, swimming ? 1 : 0, 5, dt);
    st.zenW = damp(st.zenW, zen || dead ? 1 : 0, 2, dt);
    st.crouchW = 1 - Math.max(st.swimW, st.zenW);
    const rate = pose === 'surface_breath' || pose === 'startle' ? 3.2 : 1 + speed * 1.2;
    st.kickPh = (st.kickPh + dt * rate * st.swimW) % 1;
    // stroke: fast extension (0..0.25) then slow recovery
    const p = st.kickPh;
    const kick = p < 0.25 ? smoothstep(0, 0.25, p) : 1 - smoothstep(0.25, 1, p);
    st.ext = damp(st.ext, st.swimW * kick + st.zenW * 0.55, 14, dt);
    const e = st.ext;
    const drift = st.zenW * Math.sin(time * 0.4 + seed * 5) * 0.06;
    for (const side of [1, -1]) {
      const sd = side > 0 ? 'R' : 'L';
      setRot(B[`L${sd}h`], side * drift, side * -1.7 * e, -0.08 * e);
      setRot(B[`L${sd}k`], 0, side * 2.3 * e, 0);
      setRot(B[`L${sd}a`], 0, side * (-0.15 * e + 0.2 * st.zenW), 0);
      const armOut = st.zenW * 0.5 - st.swimW * kick * 0.6;
      setRot(B[`A${sd}s`], side * st.zenW * 0.15, side * (armOut - 0.1), Math.sin(time * 0.7 + seed + side) * 0.05 * (1 - st.swimW));
      setRot(B[`A${sd}e`], 0, side * st.zenW * 0.3, 0);
    }
    setRot(B.head, 0, Math.sin(time * 0.3 + seed) * 0.05 * st.crouchW, Math.sin(time * 3.2) * 0.012 * (dead ? 0 : 1));
    setRot(B.root, 0, 0, st.swimW * (kick - 0.5) * 0.08);
    u.uAgcCI.value = rt.colorIntensity ?? 1;
    u.uAgcHi.value = sel.on ? 0.85 + 0.15 * Math.sin(time * 3) : 0;
    void clamp;
  };
  return {
    root,
    update,
    pickRadius: 0.6,
    setHighlight(on) {
      sel.on = on;
      u.uAgcHi.value = on ? 1 : 0;
    },
    dispose() {
      bodyMat.dispose();
      webMat.dispose();
      eyeMat.mat.dispose();
      rigI.skeleton.dispose();
      release(key);
      releaseEyeGeometry(lod);
      root.removeFromParent();
    },
  } satisfies CreatureObject;
};
