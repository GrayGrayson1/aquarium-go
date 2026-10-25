/**
 * Tuxedo urchin (Mespilia globulus, chunk 16): a round, slightly flattened test whose spines grow in ten tracts from
 * the mouth to the top, leaving ten bare bands between them (the "tuxedo" stripes: blue on the blue form, red-brown on
 * the red). Short spines wave slowly; a few bits of shell and algae ride on top (urchins hold debris with their tube
 * feet). Colour slots: accent = the bare bands, body = the test between, body2 = the spines, fin2 = spine tips,
 * belly = the underside round the mouth, fin = carried debris.
 *
 * Local space: the test's axis is +Y, the flattened oral side (the mouth) down on the contact plane y = -groundOffset.
 * Length 1 = the width across the spines.
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { CreatureFactory, CreatureObject } from '../types';
import type { CreatureRuntime } from '@/types';
import type { RenderLod } from '../../lod';
import { GeoBuilder, ellipsoid, skin1, tube } from './common/geo';
import { RigDef, instantiateRig, makeSkinned, setRot } from './common/rig';
import { acquire, release } from './common/cache';
import { critterTiers } from './common/tiers';
import { createCritterMaterial, createCritterUniforms } from './common/materials';
import { applyAppearance } from './common/palette';
import { clamp, damp, rng, TAU } from './common/math';

const R = 0.36; // test radius (horizontal)
const H = 0.27; // test half-height
/** The oral side is flattened to 0.8 of the half-height: that is where it meets the surface. */
const GROUND = H * 0.8;

interface UrchinTemplate {
  geo: THREE.BufferGeometry;
  rig: RigDef;
}

/** A point on the test at polar angle th (0 = top) and azimuth az. */
function testPoint(th: number, az: number, out: THREE.Vector3): THREE.Vector3 {
  const s = Math.sin(th);
  // flattened below (the oral side sits on the surface)
  const y = Math.cos(th) * (Math.cos(th) < 0 ? H * 0.8 : H);
  return out.set(Math.cos(az) * s * R, y, Math.sin(az) * s * R);
}

function buildUrchin(lod: RenderLod): UrchinTemplate {
  const rig = new RigDef();
  rig.add('root', null, [0, 0, 0]);
  const rootB = rig.idx('root');
  const g = new GeoBuilder();
  const nu = lod === 0 ? 28 : lod === 1 ? 16 : 9;
  const nv = lod === 0 ? 60 : lod === 1 ? 30 : 14;
  const p = new THREE.Vector3();
  g.grid({ nu, nv, wrapV: true, orient: 'ring', group: 0 }, (i, j, smp) => {
    const th = (i / (nu - 1)) * Math.PI;
    const az = (j / nv) * TAU;
    testPoint(th, az, p);
    smp.x = p.x;
    smp.y = p.y;
    smp.z = p.z;
    smp.u = i / (nu - 1);
    smp.v = j / nv;
    smp.mask = [0, th, az, 0];
    smp.skin = skin1(rootB);
  });
  // spines: two rows in each of the ten tracts (the bare bands sit between tracts, at az = k·2π/10)
  const rows = lod === 0 ? 14 : lod === 1 ? 8 : 4;
  const r = rng(77);
  const n = new THREE.Vector3();
  for (let tract = 0; tract < 10; tract++) {
    const centre = (tract + 0.5) * (TAU / 10);
    for (const off of [-0.07, 0, 0.07]) {
      for (let k = 0; k < rows; k++) {
        const th = 0.25 + (k / Math.max(1, rows - 1)) * (Math.PI * 0.62);
        const az = centre + off * (0.6 + 0.4 * Math.sin(th));
        testPoint(th, az, p);
        n.copy(p).setY(p.y * (R / H) * (R / H)).normalize();
        // short spines: a tuxedo's are only about a fifth of the test's radius
        const L = (0.045 + 0.03 * Math.sin(th)) * (0.85 + 0.3 * r());
        const tip = p.clone().addScaledVector(n, L);
        tube(g, {
          path: [p.clone().addScaledVector(n, -0.004), p.clone().lerp(tip, 0.5), tip],
          nv: lod === 0 ? 5 : 4,
          radius: (t) => 0.0085 * (1 - 0.8 * t),
          capEnd: 0.02,
          capRows: 1,
          skin: () => skin1(rootB),
          mask: (t) => [1, t, az, th],
          aux: [p.x, p.y, p.z, 1],
        });
      }
    }
  }
  // carried debris: a shell fragment and two bits of algae-crusted rubble held on top
  if (lod < 2) {
    const bits: [number, number, number, number][] = [
      [0.06, H * 1.25, 0.04, 0.07],
      [-0.08, H * 1.18, -0.05, 0.05],
      [0.0, H * 1.3, -0.09, 0.04],
    ];
    for (const [x, y, z, s] of bits) {
      ellipsoid(g, {
        center: [x, y, z],
        radii: [s, s * 0.35, s * 0.75],
        quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 0.6, r() * TAU, r() * 0.4)),
        nu: 6,
        nv: 10,
        skin: skin1(rootB),
        mask: [3, 0, 0, 0],
        aux: [0, H, 0, 1],
      });
    }
  }
  return { geo: g.build(), rig };
}

const URCHIN_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  float part = m.x;
  float t = uAgcTime;
  if (part > 0.5 && part < 1.5) {
    // spines wave slowly in their sockets; they stand stiffer when startled
    vec3 d = p - aAux.xyz;
    float ph = m.z * 3.0 + m.w * 2.0;
    float w = (0.12 + 0.18 * uAgcV0.z) * (1.0 - uAgcV0.x * 0.7);
    d = agcRotX(d, sin(t * 0.8 + ph) * w * m.y);
    d = agcRotZ(d, cos(t * 0.6 + ph * 1.3) * w * m.y);
    p = aAux.xyz + d;
  }
  if (part > 2.5) {
    // debris rides only while it is carried
    p = mix(aAux.xyz, p, uAgcV0.y);
  }
}
`;

const URCHIN_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x;
  vec3 P = vAgcRest;
  float seed = uAgcPat.w;
  vec3 test = uAgcPal[0]; vec3 spine = uAgcPal[1]; vec3 under = uAgcPal[2]; vec3 debris = uAgcPal[3]; vec3 tipC = uAgcPal[4]; vec3 band = uAgcPal[5];
  vec3 col;
  if (part < 0.5) {
    float th = vAgcMask.y; float az = vAgcMask.z;
    // the bare bands: centred between the spine tracts, widest at the equator
    float k = abs(sin(az * 5.0));
    float bare = 1.0 - smoothstep(0.32, 0.5, k);
    col = mix(test, band, bare * uAgcPat.z * 1.2);
    // tiny tubercles where the spines sit, a paler oral side round the mouth
    col *= 0.88 + 0.18 * agcVn(P * 180.0 + seed);
    col = mix(col, under, smoothstep(2.2, 2.9, th));
    col = mix(col, under * 0.4, smoothstep(3.0, 3.12, th));
    s.rough = 0.5;
    s.clear = 0.3;
  } else if (part < 1.5) {
    col = mix(spine, tipC, smoothstep(0.55, 1.0, vAgcMask.y));
    s.rough = 0.4;
    s.clear = 0.5;
  } else {
    // carried shell and rubble: pale, chalky, with a crust of red coralline
    col = mix(debris, vec3(0.62, 0.34, 0.42), smoothstep(0.5, 0.7, agcFbm(P * 40.0 + seed)) * 0.6);
    s.rough = 0.8;
    s.clear = 0.0;
  }
  s.albedo = col;
  s.sss = 0.15;
  s.sssCol = col;
}
`;

export const createTuxedoUrchin: CreatureFactory = (args) => {
  const { appearance: ap, fx, lod } = args;
  const key = `urchin|${lod}`;
  const tpl = acquire(key, () => buildUrchin(lod), (t) => t.geo.dispose());
  const root = new THREE.Group();
  root.name = 'tuxedo_urchin';
  const inner = new THREE.Group();
  root.add(inner);
  const rigI = instantiateRig(tpl.rig);
  for (const b of rigI.roots) inner.add(b);
  const u = createCritterUniforms(fx);
  applyAppearance(u, ap, args.creature);
  const mat = createCritterMaterial({ name: 'urchin', fx, u, surface: URCHIN_SURFACE, vertex: URCHIN_VERTEX, params: { side: THREE.FrontSide, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.4 } });
  const mesh = makeSkinned(tpl.geo, mat, rigI, 0.9);
  mesh.castShadow = lod === 0;
  mesh.receiveShadow = lod < 2;
  inner.add(mesh);
  const tiers = critterTiers(lod, (l) => `urchin|${l}`, (l) => buildUrchin(l), (t) => t.geo.dispose(), tpl, (t) => (mesh.geometry = t.geo), false);
  root.userData.groundOffset = GROUND;
  root.userData.speciesVisual = 'tuxedo_urchin';
  const B = rigI.byName;
  const seed = ((ap.patternSeed ?? 9) % 1000) / 1000;
  // most individuals carry something; the AI may say otherwise (rt.ai.carry)
  const carryDefault = seed < 0.8 ? 1 : 0;
  const st = { stiff: 0, carry: carryDefault, glide: 0 };
  const sel = { on: false };
  const update = (rt: CreatureRuntime, dt: number, time: number) => {
    u.uAgcTime.value = time;
    const pose = rt.pose;
    const dead = pose === 'dead';
    st.stiff = damp(st.stiff, pose === 'startle' || pose === 'hiding' || dead ? 1 : 0, 2, dt);
    const aiCarry = rt.ai?.carry;
    st.carry = damp(st.carry, typeof aiCarry === 'number' ? clamp(aiCarry) : carryDefault, 0.5, dt);
    st.glide = damp(st.glide, (rt.speedBL || 0) > 0.003 ? 1 : 0, 1, dt);
    u.uAgcV0.value.set(st.stiff, st.carry, st.glide, 0);
    // a slow turn and a slight rock as the tube feet pull it along
    setRot(B.root, Math.sin(time * 0.3 + seed * 7) * 0.02 * st.glide, (rt.bend || 0) * 0.1, Math.sin(time * 0.4 + seed * 3) * 0.02 * st.glide);
    u.uAgcCI.value = rt.colorIntensity ?? 1;
    u.uAgcHi.value = sel.on ? 0.85 + 0.15 * Math.sin(time * 3) : 0;
  };
  return {
    root,
    update,
    pickRadius: 0.5,
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
