/**
 * Motoro stingray (chunk 17): a round disc that glides flat over the floor, its edge rippling in a wave from front to
 * back, eyes and spiracles on top, and a tapering tail with a barbed spine.
 *
 * One closed surface for the disc: rows swept from the top pole over the thin rim to a flat underside, its outline a
 * little wider than long. The top is grey-brown with the motoro's ocelli (orange-yellow centres ringed in black, from
 * cellular noise: Loboda & Carvalho 2013, "tricoloured, evenly spaced, wider than the eye"); the underside is pale with
 * a darker margin. The tail is a flattened tube with the same spots and a pale bony barb part-way along.
 *
 * Local space: the head points +X, the underside lies on y = -GROUND; length 1 = the disc's width (the species' size),
 * the tail reaching about as far again behind it.
 * Palette: body = the disc, accent = the ocelli's centres, fin2 = their rings, belly = the underside, eye = the eyes;
 * slot 6 = the tank's sand, which covers the disc while it rests buried (`rt.ai.sandCover`, src/ai/core/sand.ts), its
 * eyes and spiracles left showing.
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { CreatureFactory, CreatureObject } from '../types';
import type { CreatureRuntime } from '@/types';
import type { RenderLod } from '../../lod';
import { GeoBuilder, ellipsoid, resamplePath, skin1, tube } from './common/geo';
import { RigDef, instantiateRig, makeSkinned, setRot } from './common/rig';
import { acquire, release } from './common/cache';
import { critterTiers } from './common/tiers';
import { createCritterMaterial, createCritterUniforms } from './common/materials';
import { applyAppearance } from './common/palette';
import { damp, smoothstep, TAU } from './common/math';
import { useGame } from '@/state/game';

/** Half the disc's length (front to back) and width; its top dome and its flat underside. */
const RX = 0.46;
const RZ = 0.5;
const DOME = 0.06;
const UNDER = 0.012;
const GROUND = 0.02;

interface RayTemplate {
  geo: THREE.BufferGeometry;
  rig: RigDef;
}

/** Outline radius at angle `a` (0 = straight ahead): a near-round disc, blunt at the snout. */
function outline(a: number): number {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const r = 1 / Math.sqrt((c * c) / (RX * RX) + (s * s) / (RZ * RZ));
  return r * (1 - 0.05 * Math.max(0, c) ** 6);
}

function buildRay(lod: RenderLod): RayTemplate {
  const rig = new RigDef();
  rig.add('root', null, [0, 0, 0]);
  rig.add('tail', 'root', [-RX * 0.9, 0, 0]);
  const rootB = rig.idx('root');
  const tailB = rig.idx('tail');
  const g = new GeoBuilder();
  const nu = lod === 0 ? 26 : lod === 1 ? 14 : 8;
  const nv = lod === 0 ? 96 : lod === 1 ? 48 : 24;
  g.grid({ nu, nv, wrapV: true, orient: 'ring', group: 0 }, (i, j, smp) => {
    const th = (i / (nu - 1)) * Math.PI;
    const a = (j / nv) * TAU;
    const R = outline(a);
    const top = th <= Math.PI / 2;
    const s = Math.sin(th);
    const rho = R * Math.pow(s, 0.45);
    const fr = rho / R;
    const c = Math.cos(th);
    // a raised body in the middle that thins to a sharp rim
    const h = DOME * (1 - fr * fr) ** 0.9 + 0.006 * (1 - fr);
    const y = top ? h * Math.pow(Math.max(c, 0), 0.6) : -UNDER * (1 - fr * fr) * Math.pow(Math.max(-c, 0), 0.4);
    smp.x = rho * Math.cos(a);
    smp.y = y - GROUND + UNDER;
    smp.z = rho * Math.sin(a);
    smp.u = i / (nu - 1);
    smp.v = j / nv;
    // mask: part 0 (disc), distance out to the rim (0 centre → 1 rim), angle, top (1) or underside (0)
    smp.mask = [0, fr, a, top ? 1 : 0];
    smp.skin = skin1(rootB);
    smp.aux = [0, 0, 0, 1];
  });
  // the tail: from under the back of the disc, tapering to a point about a disc's width behind it
  const y0 = -GROUND + UNDER + 0.012;
  tube(g, {
    path: resamplePath([[-RX * 0.78, y0, 0], [-RX - 0.15, y0, 0], [-RX - 0.38, y0 + 0.004, 0], [-RX - 0.56, y0 + 0.01, 0]], lod === 0 ? 16 : 8),
    nv: lod === 0 ? 10 : 6,
    radius: (t) => 0.045 * (1 - t) ** 1.2 + 0.003,
    aspect: () => [0.7, 1.2],
    capEnd: 0.05,
    capRows: 1,
    skin: () => skin1(tailB),
    mask: (t, a) => [1, t, a, 0],
    group: 0,
  });
  // the barbed spine, part-way along the top of the tail, pointing back
  if (lod < 2) {
    const bx = -RX - 0.2;
    tube(g, {
      path: resamplePath([[bx, y0 + 0.012, 0], [bx - 0.05, y0 + 0.02, 0], [bx - 0.1, y0 + 0.024, 0]], 4),
      nv: 5,
      radius: (t) => 0.005 * (1 - 0.8 * t),
      aspect: () => [0.6, 1.4],
      capEnd: 0.1,
      capRows: 1,
      skin: () => skin1(tailB),
      mask: (t) => [2, t, 0, 0],
      group: 0,
    });
  }
  // eyes on top, forward, and the spiracles just behind them
  for (const side of [1, -1]) {
    const ey = -GROUND + UNDER + DOME * 0.85;
    ellipsoid(g, { center: [RX * 0.42, ey, side * 0.07], radii: [0.022, 0.016, 0.018], nu: lod === 0 ? 8 : 5, nv: lod === 0 ? 12 : 8, skin: skin1(rootB), mask: [3, 0, side, 0] });
    if (lod < 2) ellipsoid(g, { center: [RX * 0.3, ey - 0.004, side * 0.075], radii: [0.018, 0.006, 0.011], nu: 5, nv: 8, skin: skin1(rootB), mask: [4, 0, side, 0] });
  }
  return { geo: g.build(), rig };
}

const RAY_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  float t = uAgcTime;
  float glide = uAgcV0.x; float sag = uAgcV0.z; float ph = uAgcV0.w;
  if (m.x < 0.5) {
    float r = m.y; float a = m.z;
    // the rim ripples in a wave running from the snout to the back, faster and bigger as it swims
    float along = cos(a); // +1 at the snout, -1 at the back
    float edge = smoothstep(0.55, 1.0, r);
    float w = sin(t * mix(1.1, 4.2, glide) + along * 5.0 + ph) * mix(0.004, 0.028, glide);
    p.y += w * edge * edge;
    // dead: the rim slumps flat to the floor
    p.y -= sag * 0.6 * max(0.0, p.y + 0.008) * r;
  }
}
`;

const RAY_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x; float r = vAgcMask.y; float topSide = vAgcMask.w;
  vec3 P = vAgcRest;
  float seed = uAgcPat.w;
  float contrast = uAgcPat.z;
  vec3 body = uAgcPal[0]; vec3 body2 = uAgcPal[1]; vec3 belly = uAgcPal[2]; vec3 ring = uAgcPal[4]; vec3 spot = uAgcPal[5]; vec3 eyeC = uAgcPal[7];
  if (part > 2.5) {
    // eye: a dark bulb with a paler band; spiracle: a dark slit
    if (part < 3.5) {
      s.albedo = mix(eyeC, eyeC * 2.2 + 0.05, smoothstep(0.004, 0.0, abs(P.y - (-0.02 + 0.012 + 0.06 * 0.85) - 0.008)) * 0.4);
      s.rough = 0.15; s.clear = 1.0; return;
    }
    s.albedo = body * 0.35; s.rough = 0.6; return;
  }
  float cover = uAgcV0.y; vec3 sand = uAgcPal[6];
  if (part > 1.5) { s.albedo = mix(vec3(0.86, 0.82, 0.74), sand, cover * 0.8); s.rough = 0.3; s.clear = 0.6; return; }
  vec3 col = body;
  bool under = (part < 0.5 && topSide < 0.5 && P.y < -0.02 + 0.012 - 0.002) || (part > 0.5 && P.y < -0.02 + 0.024 - 0.006);
  if (under) {
    // pale underside, greyer toward the rim
    col = mix(belly, mix(belly, body, 0.5), smoothstep(0.7, 1.0, r) * (part < 0.5 ? 1.0 : 0.0));
    col *= 0.92 + 0.08 * agcVn(P * 160.0 + seed);
    s.albedo = col; s.rough = 0.5; s.clear = 0.25; s.sss = 0.3; s.sssCol = belly;
    return;
  }
  // top: grey-brown, finely mottled
  col = mix(body, body2, smoothstep(0.35, 0.75, agcFbm(P * 9.0 + seed)) * 0.7);
  col *= 0.9 + 0.12 * agcVn(P * 220.0 + seed);
  // the ocelli: orange-yellow centres in black rings, evenly spread, a little smaller toward the rim and on the tail
  float scale = (part < 0.5 ? 8.0 : 18.0) * max(0.5, uAgcPat.y);
  vec3 c = agcCell2(P.xz * scale + seed);
  float size = mix(0.3, 0.38, fract(c.z * 7.3)) * (part < 0.5 ? mix(1.0, 0.75, smoothstep(0.6, 1.0, r)) : 0.8);
  float rim = smoothstep(size, size - 0.04, c.x);
  float core = smoothstep(size * 0.62, size * 0.62 - 0.04, c.x);
  col = mix(col, ring, rim * (0.55 + 0.45 * contrast));
  col = mix(col, spot, core);
  // the disc's very edge is a touch darker
  if (part < 0.5) col *= 1.0 - 0.2 * smoothstep(0.85, 1.0, r);
  // buried: sand drifts over the disc in patches, thinnest over the raised middle where the eyes are
  if (cover > 0.001) {
    float patchy = agcFbm(P * 22.0 + seed * 3.0);
    float lay = cover * (part < 0.5 ? mix(0.55, 1.1, smoothstep(0.12, 0.7, r)) : 1.0) - (patchy - 0.5) * 1.1;
    float m = smoothstep(0.32, 0.78, lay) * 0.93;
    col = mix(col, sand * (0.85 + 0.3 * agcVn(P * 380.0 + seed)), m);
    s.rough = mix(0.45, 0.9, m);
    s.clear = mix(0.35, 0.0, m);
    s.albedo = col;
    return;
  }
  s.albedo = col;
  s.rough = 0.45;
  s.clear = 0.35;
  s.sss = 0.2;
  s.sssCol = mix(body, vec3(1.0, 0.8, 0.6), 0.3);
}
`;

export const createMotoroStingray: CreatureFactory = (args) => {
  const { appearance: ap, fx, lod } = args;
  const key = `ray|${lod}`;
  const tpl = acquire(key, () => buildRay(lod), (t) => t.geo.dispose());
  const root = new THREE.Group();
  root.name = 'motoro_stingray';
  const inner = new THREE.Group();
  root.add(inner);
  const rigI = instantiateRig(tpl.rig);
  for (const b of rigI.roots) inner.add(b);
  const u = createCritterUniforms(fx);
  applyAppearance(u, ap, args.creature);
  u.uAgcPal.value[6].set('#cdb98f'); // plain sand until the tank's own is looked up
  const mat = createCritterMaterial({
    name: 'ray',
    fx,
    u,
    surface: RAY_SURFACE,
    vertex: RAY_VERTEX,
    params: { side: THREE.DoubleSide, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.4 },
  });
  const mesh = makeSkinned(tpl.geo, mat, rigI, 0.9);
  mesh.castShadow = lod === 0;
  mesh.receiveShadow = lod < 2;
  inner.add(mesh);
  const tiers = critterTiers(lod, (l) => `ray|${l}`, (l) => buildRay(l), (t) => t.geo.dispose(), tpl, (t) => (mesh.geometry = t.geo), false);
  root.userData.groundOffset = GROUND;
  root.userData.speciesVisual = 'motoro_stingray';
  const B = rigI.byName;
  const seed = ((ap.patternSeed ?? 9) % 1000) / 1000;
  const st = { glide: 0, sag: 0, sway: 0, sandAt: -1 };
  const sel = { on: false };
  // the tank's sand colour, looked up now and then (a substrate change shows within a couple of seconds)
  const tankId = args.creature?.tankId ?? null;
  const sandColour = (time: number) => {
    if (time - st.sandAt < 2 && st.sandAt >= 0) return;
    st.sandAt = time;
    const c = tankId ? useGame.getState().game?.tanks[tankId]?.substrate?.color : undefined;
    if (c) u.uAgcPal.value[6].set(c);
  };
  const update = (rt: CreatureRuntime, dt: number, time: number) => {
    u.uAgcTime.value = time;
    const dead = rt.pose === 'dead';
    const speed = Math.max(0, rt.speedBL || 0);
    st.glide = damp(st.glide, dead ? 0 : Math.min(1, speed * 2.5), 1.8, dt);
    st.sag = damp(st.sag, dead ? 1 : 0, 0.5, dt);
    const cover = typeof rt.ai?.sandCover === 'number' ? (rt.ai.sandCover as number) : 0;
    if (cover > 0) sandColour(time);
    // settled into the sand it lies a little lower, and the rim stops rippling
    inner.position.y = -cover * 0.014;
    u.uAgcV0.value.set(st.glide * (1 - cover), cover, st.sag, seed * 20);
    // the tail trails the turns and drifts a little side to side
    st.sway = damp(st.sway, -(rt.bend || 0) * 0.6 + (dead ? 0 : 0.08 * Math.sin(time * 0.6 + seed * 9)), 2, dt);
    setRot(B.tail, 0, st.sway, 0);
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
