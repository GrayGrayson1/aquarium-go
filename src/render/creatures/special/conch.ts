/**
 * Fighting conch (Strombus alatus, chunk 16): a heavy, knobbed shell with a flared outer lip, carried spire-back with
 * the aperture down. Under it the animal is nothing like a garden snail: a narrow foot ending in a sickle-shaped
 * horny operculum (the "claw" it digs in to vault the shell forward), a long mobile snout, and two long eyestalks
 * with large ringed eyes that peer out of the notches at the front of the shell.
 *
 * Moves in lurches (the AI's 'conch' set): each step the claw pushes, the shell rocks up and forward and drops. Pulls
 * the soft parts in on startle, hiding and death. Half-buried at rest, as the AI places it.
 *
 * Local space: head +X, the contact plane at y = -groundOffset. Length 1 = shell length.
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
import { clamp, damp, lerp, smoothstep, TAU } from './common/math';
import { addShell, shellBounds, type SnailSpec } from './snail';

const GROUND = 0.2;

/** The shell: a moderately tall spire of knobbed whorls, a big body whorl and the flared lip. */
const SHELL: SnailSpec = {
  id: 'conch_shell',
  kind: 7,
  W: 1.9,
  whorls: 6.5,
  spire: 2.1,
  apA: 0.5,
  apB: 0.9,
  size: 0.2,
  tentacle: 0,
  siphon: false,
  apex: [-1, 0.42, 0.05],
  opening: [0.25, -1, -0.3],
  apCenter: [0.05, -0.08, 0.0],
  place: [-0.02, -0.17, 0.0],
  sculpt: { ribs: { n: 9, amp: 0.35, sharp: 5 }, shoulder: 0.75 },
  flare: 0.45,
  // a fighting conch is long and fairly low, not a tall whelk
  squash: [1.05, 0.8, 0.88],
};

interface ConchTemplate {
  geo: THREE.BufferGeometry;
  rig: RigDef;
  aperture: THREE.Vector3;
}

function buildConch(lod: RenderLod): ConchTemplate {
  const sb = shellBounds(SHELL);
  const rig = new RigDef();
  rig.add('root', null, [0, 0, 0]);
  rig.add('shell', 'root', [(sb.min.x + sb.max.x) / 2, sb.min.y + 0.04, 0]);
  rig.add('head', 'root', [sb.max.x - 0.08, -0.1, 0]);
  rig.add('foot', 'root', [0.0, -0.16, 0]);
  const shellB = rig.idx('shell');
  const headB = rig.idx('head');
  const footB = rig.idx('foot');
  const g = new GeoBuilder();
  const { aperture } = addShell(g, SHELL, lod, shellB, 0);
  const segs = lod === 0 ? 1 : lod === 1 ? 0.5 : 0.25;
  const n = (k: number) => Math.max(4, Math.round(k * segs));
  const ap: [number, number, number, number] = [aperture.x, aperture.y, aperture.z, 1];

  // narrow muscular foot under the front of the shell, ending at the back in the sickle-shaped operculum
  const foot = resamplePath([[0.2, -0.165, 0], [0.08, -0.175, 0], [-0.08, -0.17, 0], [-0.2, -0.15, 0]], n(16));
  tube(g, {
    path: foot,
    nv: n(14),
    radius: (t) => lerp(0.045, 0.03, t),
    aspect: () => [1.3, 0.7],
    capStart: 0.08,
    capEnd: 0.05,
    capRows: 3,
    skin: () => skin1(footB),
    mask: (t) => [1, t, 0, 0],
    aux: ap,
  });
  // the operculum claw: a curved, pointed horny blade at the back of the foot
  const claw: V3[] = [[-0.19, -0.15, 0], [-0.26, -0.17, 0.0], [-0.32, -0.2, 0.0], [-0.35, -0.23, 0.0]];
  tube(g, {
    path: resamplePath(claw, n(10)),
    nv: n(10),
    radius: (t) => lerp(0.024, 0.004, Math.pow(t, 0.8)),
    aspect: () => [1, 0.35],
    capEnd: 0.03,
    capRows: 2,
    skin: () => skin1(footB),
    mask: (t) => [5, t, 0, 0],
    aux: ap,
  });
  // the snout (proboscis): long, ringed, reaching forward and down to the sand
  const snout = resamplePath([[0.18, -0.12, 0], [0.28, -0.13, 0], [0.38, -0.15, 0], [0.45, -0.18, 0]], n(14));
  tube(g, {
    path: snout,
    nv: n(12),
    radius: (t) => lerp(0.032, 0.022, t),
    capEnd: 0.06,
    capRows: 3,
    skin: () => skin1(headB),
    mask: (t) => [2, t, 0, 0],
    aux: [0.18, -0.12, 0, 1],
  });
  // two eyestalks out of the shell's front notches, each with a large ringed eye at the tip
  for (const side of [1, -1]) {
    const base = new THREE.Vector3(0.16, -0.08, side * 0.06);
    const pts: V3[] = [
      [base.x, base.y, base.z],
      [base.x + 0.08, base.y + 0.05, base.z + side * 0.03],
      [base.x + 0.15, base.y + 0.1, base.z + side * 0.05],
      [base.x + 0.2, base.y + 0.13, base.z + side * 0.06],
    ];
    tube(g, {
      path: resamplePath(pts, n(12)),
      nv: n(10),
      radius: (t) => lerp(0.016, 0.011, t),
      skin: () => skin1(headB),
      mask: (t) => [3, t, side, 0],
      aux: [base.x, base.y, base.z, 1],
    });
    const eye = new THREE.Vector3(pts[3][0] + 0.012, pts[3][1] + 0.006, pts[3][2] + side * 0.004);
    const gaze = new THREE.Vector3(0.55, 0.15, side * 0.82).normalize();
    // the eye's surface mask carries how directly each point faces the gaze (iris ring and pupil in the shader)
    const before = g.vertexCount;
    ellipsoid(g, {
      center: [eye.x, eye.y, eye.z],
      radii: [0.026, 0.026, 0.026],
      nu: n(10),
      nv: n(16),
      skin: skin1(headB),
      mask: [4, 0, side, 0],
      aux: [base.x, base.y, base.z, 1],
    });
    for (let v = before; v < g.vertexCount; v++) {
      const d = new THREE.Vector3(g.pos[v * 3] - eye.x, g.pos[v * 3 + 1] - eye.y, g.pos[v * 3 + 2] - eye.z).normalize();
      g.masks[v * 4 + 1] = d.dot(gaze);
    }
  }
  return { geo: g.build(), rig, aperture };
}

const CONCH_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  float part = m.x;
  float t = uAgcTime;
  float retract = uAgcV0.x;
  if (part > 0.5) {
    if (part > 2.5 && part < 4.5) {
      // eyestalks sway independently, each eye peering about
      float side = m.z;
      float q = part > 3.5 ? 1.0 : m.y;
      vec3 d = p - aAux.xyz;
      d = agcRotY(d, (sin(t * 0.8 + side * 1.9) * 0.3 + uAgcV1.y * side * 0.2) * q);
      d = agcRotZ(d, sin(t * 0.55 + side) * 0.15 * q);
      p = aAux.xyz + d;
    }
    if (part > 1.5 && part < 2.5) {
      // the snout sweeps the sand while grazing
      vec3 d = p - aAux.xyz;
      d = agcRotY(d, sin(t * 0.9) * 0.45 * uAgcV1.x * m.y);
      d = agcRotZ(d, -0.25 * uAgcV1.x * m.y);
      p = aAux.xyz + d;
    }
    p = mix(p, vec3(uAgcV0.z, uAgcV0.w, 0.0), retract * 0.95);
  }
}
`;

const CONCH_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x;
  vec3 P = vAgcRest;
  float seed = uAgcPat.w;
  float contrast = uAgcPat.z;
  vec3 shell = uAgcPal[0]; vec3 shell2 = uAgcPal[1]; vec3 lip = uAgcPal[2]; vec3 skin = uAgcPal[3]; vec3 skin2 = uAgcPal[4]; vec3 streak = uAgcPal[5]; vec3 eyeC = uAgcPal[7];
  if (part < 0.5) {
    float th = vAgcMask.y; float phi = vAgcMask.z; float u = vAgcMask.w;
    vec2 cs = vec2(cos(phi), sin(phi));
    float mott = agcFbm(vec3(th * 1.3, cs * 1.8 + seed));
    vec3 col = mix(shell, shell2, smoothstep(0.3, 0.75, mott) * 0.8);
    // zigzag axial streaks and pale shoulder knobs
    float zz = sin(th * 11.0 + sin(phi * 4.0 + seed) * 1.4 + agcVn(vec3(th * 2.0, cs * 2.0 + seed)) * 1.5);
    col = mix(col, streak, smoothstep(0.35, 0.8, zz) * contrast * 0.55);
    float knob = pow(0.5 + 0.5 * cos(th * 9.0), 5.0) * pow(max(0.0, cos(phi - 0.75)), 4.0);
    col = mix(col, vec3(0.88, 0.82, 0.7), knob * 0.45);
    float gl = pow(abs(sin(th * 14.0 + agcVn(vec3(th * 3.0, cs + seed)) * 2.0)), 12.0);
    col *= 1.0 - gl * 0.18 * agcResolve(0.003);
    s.height += gl * 0.0012 + knob * 0.002;
    s.rough = 0.5;
    s.clear = 0.3;
    // inside the aperture and the flared lip: glossy orange-pink
    float lipT = smoothstep(0.9, 1.0, u);
    if (!gl_FrontFacing) { col = lip; s.rough = 0.18; s.clear = 1.0; }
    else col = mix(col, mix(lip, vec3(0.95, 0.9, 0.82), 0.3), lipT * smoothstep(0.0, -0.6, cs.x) * 0.7);
    s.albedo = col;
    return;
  }
  if (part > 4.5 && part < 5.5) {
    // operculum claw: dark horny brown, serrated growth lines
    s.albedo = mix(vec3(0.16, 0.1, 0.06), vec3(0.32, 0.22, 0.12), 0.5 + 0.5 * sin(vAgcMask.y * 60.0));
    s.rough = 0.35;
    s.clear = 0.6;
    return;
  }
  if (part > 3.5 && part < 4.5) {
    // eye: a bright ringed iris round a dark pupil, set in grey-green skin
    float facing = vAgcMask.y;
    vec3 col = mix(skin, skin2, 0.5);
    col = mix(col, eyeC, smoothstep(0.35, 0.5, facing));
    col = mix(col, vec3(0.9, 0.85, 0.3), smoothstep(0.62, 0.68, facing) * (1.0 - smoothstep(0.8, 0.84, facing)) * 0.6);
    col = mix(col, vec3(0.02), smoothstep(0.86, 0.9, facing));
    s.albedo = col;
    s.rough = 0.12;
    s.clear = 1.0;
    return;
  }
  // soft parts: grey-green skin with fine dark flecks, the snout ringed
  float fleck = smoothstep(0.55, 0.8, agcFbm(P * 70.0 + seed));
  vec3 col = mix(skin, skin2, 0.3 + 0.5 * fleck);
  if (part > 1.5 && part < 2.5) col *= 0.88 + 0.12 * sin(vAgcMask.y * 40.0);
  col *= 1.0 - 0.3 * smoothstep(0.6, 0.78, agcVn(P * 350.0 + seed * 5.0)) * agcResolve(0.004);
  s.albedo = col;
  s.rough = 0.32;
  s.clear = 0.7;
  s.sss = 0.5 + uAgcMat.z;
  s.sssCol = mix(skin, vec3(1.0, 0.85, 0.7), 0.3);
}
`;

export const createFightingConch: CreatureFactory = (args) => {
  const { appearance: ap, fx, lod } = args;
  const key = `conch|${lod}`;
  const tpl = acquire(key, () => buildConch(lod), (t) => t.geo.dispose());
  const root = new THREE.Group();
  root.name = 'fighting_conch';
  const inner = new THREE.Group();
  root.add(inner);
  const rigI = instantiateRig(tpl.rig);
  for (const b of rigI.roots) inner.add(b);
  const u = createCritterUniforms(fx);
  applyAppearance(u, ap, args.creature);
  u.uAgcF0.value.set(7, 0, 0, 0);
  const mat = createCritterMaterial({
    name: 'conch',
    fx,
    u,
    surface: CONCH_SURFACE,
    vertex: CONCH_VERTEX,
    params: { side: THREE.DoubleSide, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.25 },
  });
  const mesh = makeSkinned(tpl.geo, mat, rigI, 1.4);
  mesh.castShadow = lod === 0;
  mesh.receiveShadow = lod < 2;
  inner.add(mesh);
  const tiers = critterTiers(lod, (l) => `conch|${l}`, (l) => buildConch(l), (t) => t.geo.dispose(), tpl, (t) => (mesh.geometry = t.geo), false);
  root.userData.groundOffset = GROUND;
  root.userData.speciesVisual = 'fighting_conch';
  const B = rigI.byName;
  const seed = ((ap.patternSeed ?? 9) % 1000) / 1000;
  const st = { retract: 0, hopPh: 0, hop: 0, graze: 0 };
  const sel = { on: false };
  const update = (rt: CreatureRuntime, dt: number, time: number) => {
    u.uAgcTime.value = time;
    const pose = rt.pose;
    const dead = pose === 'dead';
    const speed = Math.max(0, rt.speedBL || 0);
    const retreat = dead || pose === 'startle' || pose === 'hiding';
    st.retract = damp(st.retract, retreat ? 1 : 0, retreat ? 4 : 0.7, dt);
    st.hop = damp(st.hop, speed > 0.01 && !retreat ? 1 : 0, 3, dt);
    st.hopPh += dt * TAU * (0.5 + speed * 2.5) * st.hop;
    // the AI's sifting pulses (rt.mouthOpen) sweep the snout; between them it rests on the sand
    st.graze = damp(st.graze, retreat ? 0 : Math.max(pose === 'feed' ? 0.6 : 0, clamp(rt.mouthOpen || 0)), 3, dt);
    // retracted soft parts gather at the aperture
    u.uAgcV0.value.set(st.retract, 0, tpl.aperture.x, tpl.aperture.y);
    // eyestalks: a slow look about, and a turn of both on each of the AI's peeks (rt.appendage)
    u.uAgcV1.value.set(st.graze, Math.sin(time * 0.21 + seed * 9) * 0.6 + clamp(rt.appendage || 0) * 0.8, 0, 0);
    // the lurch: the claw pushes, the shell pitches nose-up and rises, then drops forward. The AI's vault (rt.ai.lurch,
    // a sine over each vault; it also lifts and pitches the whole body) drives it; without one, a gait of its own
    const ph = st.hopPh % TAU;
    const aiLurch = rt.ai?.lurch;
    const push = typeof aiLurch === 'number' ? clamp(aiLurch) : smoothstep(0, 1.2, ph) * (1 - smoothstep(1.6, 2.4, ph));
    setRot(B.shell, Math.sin(time * 0.4 + seed * 5) * 0.015, 0, push * 0.16 * st.hop - st.retract * 0.04);
    B.shell.position.set(rigI.restPos[1].x + push * 0.02 * st.hop, rigI.restPos[1].y + push * 0.035 * st.hop - st.retract * 0.02, rigI.restPos[1].z);
    setRot(B.foot, 0, 0, -push * 0.25 * st.hop);
    setRot(B.head, 0, (rt.bend || 0) * 0.25, 0);
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
