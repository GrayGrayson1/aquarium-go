/**
 * Emerald crab (Mithraculus sculptus, chunk 16): a true crab — a squarish-round carapace a little wider than long,
 * crowded with small bumps; two equal claws with spoon-shaped, pale fingertips; four pairs of banded, slightly hairy
 * walking legs; short eyestalks. It walks in an alternating gait (legs 1 and 3 with 2 and 4 of the other side),
 * picks at algae and brings it to the mouth with both claws, and folds its legs under the carapace when it hides.
 * Colour slots: body = carapace, body2 = mottling and leg bands, belly = underside, fin = claws, fin2 = the spoon
 * tips, eye = eyes.
 *
 * Local space: head +X, feet on y = -groundOffset. Length 1 = the span across the legs.
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
import { applyAppearance } from './common/palette';
import { clamp, damp, TAU } from './common/math';

const GROUND = 0.15;
const ax = (v: V3): [number, number, number, number] => [v[0], v[1], v[2], 1];
const BODY_Y = -GROUND + 0.1;

interface CrabTemplate {
  geo: THREE.BufferGeometry;
  rig: RigDef;
}

function buildCrab(lod: RenderLod): CrabTemplate {
  const rig = new RigDef();
  rig.add('root', null, [0, 0, 0]);
  rig.add('body', 'root', [0, BODY_Y, 0]);
  const bodyB = rig.idx('body');
  const g = new GeoBuilder();
  const n = (k: number) => Math.max(4, Math.round(k * (lod === 0 ? 1 : lod === 1 ? 0.55 : 0.3)));
  // carapace: a domed, squarish-round shield, slightly wider than long; underside flatter
  ellipsoid(g, { center: [0, BODY_Y, 0], radii: [0.17, 0.075, 0.2], nu: n(16), nv: n(28), skin: skin1(bodyB), mask: [0, 0, 0, 0] });
  // eyestalks and eyes at the front
  for (const side of [1, -1]) {
    const base: V3 = [0.15, BODY_Y + 0.03, side * 0.05];
    const tip: V3 = [0.19, BODY_Y + 0.055, side * 0.065];
    tube(g, { path: resamplePath([base, tip], 3), nv: n(6), radius: () => 0.009, skin: () => skin1(bodyB), mask: () => [4, 0, side, 0], aux: ax(base) });
    ellipsoid(g, { center: [tip[0] + 0.004, tip[1] + 0.004, tip[2]], radii: [0.013, 0.013, 0.013], nu: n(6), nv: n(10), skin: skin1(bodyB), mask: [5, 0, side, 0], aux: ax(base) });
  }
  // claws: an arm forward and out, a swollen palm, two fingers ending in spoon tips
  for (const side of [1, -1]) {
    const shoulder: V3 = [0.12, BODY_Y - 0.02, side * 0.14];
    const elbow: V3 = [0.24, BODY_Y - 0.01, side * 0.2];
    const wrist: V3 = [0.32, BODY_Y - 0.02, side * 0.13];
    tube(g, { path: resamplePath([shoulder, elbow, wrist], n(8)), nv: n(7), radius: (t) => 0.024 - 0.004 * t, skin: () => skin1(bodyB), mask: (t) => [3, t * 0.5, side, 0], aux: ax(shoulder) });
    ellipsoid(g, { center: [wrist[0] + 0.03, wrist[1], wrist[2]], radii: [0.055, 0.03, 0.026], nu: n(8), nv: n(12), skin: skin1(bodyB), mask: [3, 0.7, side, 0], aux: ax(shoulder) });
    for (const f of [1, -1]) {
      const a: V3 = [wrist[0] + 0.065, wrist[1] + f * 0.008, wrist[2] - side * 0.004];
      const b: V3 = [wrist[0] + 0.1, wrist[1] + f * 0.004, wrist[2] - side * 0.018];
      tube(g, { path: resamplePath([a, b], 4), nv: n(6), radius: (t) => 0.009 * (1 - 0.3 * t) + 0.004 * Math.sin(Math.PI * t), aspect: () => [1.4, 0.7], capEnd: 0.4, capRows: 2, skin: () => skin1(bodyB), mask: (t) => [3, 0.85 + 0.15 * t, side, 1], aux: ax(shoulder) });
    }
  }
  // walking legs: four a side, each out from the carapace edge, up over the knee and down to the ground
  for (const side of [1, -1]) {
    for (let k = 0; k < 4; k++) {
      const bx = 0.08 - k * 0.07;
      // short, stocky legs (a majid, not a spider crab)
      const root: V3 = [bx, BODY_Y - 0.03, side * 0.16];
      const knee: V3 = [bx + 0.015 - k * 0.02, BODY_Y + 0.025, side * (0.25 + 0.015 * Math.cos(k))];
      const foot: V3 = [bx + 0.04 - k * 0.045, -GROUND + 0.004, side * (0.33 - 0.02 * Math.abs(k - 1.5))];
      tube(g, {
        path: resamplePath([root, knee, foot], n(10)),
        nv: n(6),
        radius: (t) => 0.017 * (1 - 0.5 * t),
        capEnd: 0.05,
        capRows: 2,
        skin: () => skin1(bodyB),
        mask: (t) => [2, t, side, k],
        aux: ax(root),
      });
    }
  }
  return { geo: g.build(), rig };
}

const CRAB_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  float part = m.x;
  float walkPh = uAgcV0.x; float walk = uAgcV0.y; float pick = uAgcV0.z; float tuck = uAgcV0.w;
  if (part > 1.5 && part < 2.5) {
    // legs: alternate sets (1 and 3 with 2 and 4 of the other side) lift and swing
    float side = m.z; float k = m.w; float q = m.y;
    float set = mod(k + (side > 0.0 ? 0.0 : 1.0), 2.0);
    float ph = walkPh + set * 3.14159;
    vec3 d = p - aAux.xyz;
    d = agcRotY(d, sin(ph) * 0.35 * walk * side);
    d.y += max(0.0, sin(ph + 1.2)) * 0.03 * walk * q;
    // tucked: legs fold in under the carapace
    d.xz *= 1.0 - tuck * 0.5 * q;
    d.y += tuck * 0.05 * q;
    p = aAux.xyz + d;
  }
  if (part > 2.5 && part < 3.5) {
    // claws: both lift and turn in toward the mouth on each pick
    float side = m.z;
    vec3 d = p - aAux.xyz;
    d = agcRotZ(d, pick * 0.5 * (0.4 + m.y));
    d = agcRotY(d, -pick * 0.45 * side);
    d *= 1.0 - tuck * 0.25;
    p = aAux.xyz + d;
  }
  if (part > 3.5) {
    // eyestalks fold flat when it hides
    vec3 d = p - aAux.xyz;
    d = agcRotZ(d, -tuck * 0.8);
    p = aAux.xyz + d;
  }
}
`;

const CRAB_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x;
  vec3 P = vAgcRest;
  float seed = uAgcPat.w;
  vec3 shell = uAgcPal[0]; vec3 mottle = uAgcPal[1]; vec3 under = uAgcPal[2]; vec3 claw = uAgcPal[3]; vec3 tipC = uAgcPal[4]; vec3 eyeC = uAgcPal[7];
  vec3 col;
  if (part < 0.5) {
    // carapace: crowded small bumps, mottled, paler underneath
    vec3 c = agcCell(P * 160.0 + seed);
    float bump = 1.0 - smoothstep(0.1, 0.38, c.x);
    col = mix(shell, mottle, smoothstep(0.45, 0.75, agcFbm(P * 24.0 + seed)) * 0.7);
    col *= 0.85 + 0.3 * bump;
    s.height += bump * 0.0016 * agcResolve(0.003);
    col = mix(col, under, smoothstep(${(-0.02).toFixed(2)}, -0.06, P.y - ${BODY_Y.toFixed(3)}) * 0.7);
    s.rough = 0.5;
  } else if (part < 2.5) {
    // legs: banded, a fringe of fine hairs darkening the joints
    float q = vAgcMask.y;
    float band = smoothstep(0.3, 0.7, sin(q * 22.0));
    col = mix(shell, mottle, band * 0.6);
    col *= 0.85 + 0.15 * agcVn(P * 400.0);
    s.rough = 0.65;
  } else if (part < 3.5) {
    col = mix(claw, tipC, smoothstep(0.86, 0.95, vAgcMask.y));
    s.rough = 0.35;
    s.clear = 0.6;
  } else if (part < 4.5) {
    col = mix(shell, mottle, 0.4);
    s.rough = 0.5;
  } else {
    col = eyeC;
    s.rough = 0.1;
    s.clear = 1.0;
  }
  s.albedo = col;
  s.sss = 0.15;
  s.sssCol = col;
}
`;

export const createEmeraldCrab: CreatureFactory = (args) => {
  const { appearance: ap, fx, lod } = args;
  const key = `crab|${lod}`;
  const tpl = acquire(key, () => buildCrab(lod), (t) => t.geo.dispose());
  const root = new THREE.Group();
  root.name = 'emerald_crab';
  const inner = new THREE.Group();
  root.add(inner);
  const rigI = instantiateRig(tpl.rig);
  for (const b of rigI.roots) inner.add(b);
  const u = createCritterUniforms(fx);
  applyAppearance(u, ap, args.creature);
  const mat = createCritterMaterial({ name: 'crab', fx, u, surface: CRAB_SURFACE, vertex: CRAB_VERTEX, params: { side: THREE.FrontSide, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.35 } });
  const mesh = makeSkinned(tpl.geo, mat, rigI, 1.2);
  mesh.castShadow = lod === 0;
  mesh.receiveShadow = lod < 2;
  inner.add(mesh);
  const tiers = critterTiers(lod, (l) => `crab|${l}`, (l) => buildCrab(l), (t) => t.geo.dispose(), tpl, (t) => (mesh.geometry = t.geo), false);
  root.userData.groundOffset = GROUND;
  root.userData.speciesVisual = 'emerald_crab';
  const B = rigI.byName;
  const seed = ((ap.patternSeed ?? 9) % 1000) / 1000;
  const st = { walkPh: 0, walk: 0, pick: 0, tuck: 0, side: 0 };
  const sel = { on: false };
  const update = (rt: CreatureRuntime, dt: number, time: number) => {
    u.uAgcTime.value = time;
    const pose = rt.pose;
    const dead = pose === 'dead';
    const speed = Math.max(0, rt.speedBL || 0);
    const hide = dead || pose === 'startle' || pose === 'hiding';
    st.tuck = damp(st.tuck, hide ? 1 : 0, hide ? 6 : 1, dt);
    st.walk = damp(st.walk, !hide && speed > 0.02 ? 1 : 0, 5, dt);
    st.walkPh += dt * TAU * (1 + speed * 5) * st.walk;
    // picking: the AI's appendage pulses (or a steady pick while feeding)
    const pickTarget = hide ? 0 : Math.max(clamp(rt.appendage ?? 0), pose === 'feed' ? 0.5 + 0.5 * Math.sin(time * 6 + seed * 9) : 0);
    st.pick = damp(st.pick, pickTarget, 8, dt);
    u.uAgcV0.value.set(st.walkPh, st.walk, st.pick, st.tuck);
    // the sideways scuttle: the AI heads the way it travels and says how far to turn the body off that (rt.ai.sideways
    // −1..1, +1 = moving toward its right side), so the body turns a quarter turn to lead with its flank
    const side = typeof rt.ai?.sideways === 'number' ? clamp(rt.ai.sideways as number, -1, 1) : 0;
    st.side = damp(st.side, side, 4, dt);
    inner.rotation.y = st.side * Math.PI * 0.5;
    // the carapace bobs with the stride and sinks when tucked
    B.body.position.y = rigI.restPos[1].y + Math.sin(st.walkPh * 2) * 0.006 * st.walk - st.tuck * 0.04;
    setRot(B.body, Math.sin(st.walkPh) * 0.04 * st.walk, (rt.bend || 0) * 0.15, 0);
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
      rigI.skeleton.dispose();
      tiers.dispose();
      release(key);
      root.removeFromParent();
    },
  } satisfies CreatureObject;
};
