/**
 * Bubble-tip anemone as a living animal (Entacmaea quadricolor, chunk 16): a muscular column on an adhesive foot, a flat
 * oral disc with the mouth at its centre, and a crown of tentacles that swell into a bulb just short of the tip. The
 * tentacles sway in the flow (each on its own phase), close in toward the mouth at night or when disturbed, and the
 * whole animal now and then deflates and slowly fills again. Colour slots: belly = column, body = oral disc and tentacle
 * base, body2 = tentacle shaft, accent = the bubble, fin2 = the tip.
 *
 * Local space: the column's axis is +Y, the foot on the contact plane y = -groundOffset (the AI turns root so local −Y
 * faces the rock or glass it holds). Length 1 = the spread crown's diameter.
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { CreatureFactory, CreatureObject } from '../types';
import type { CreatureRuntime } from '@/types';
import type { RenderLod } from '../../lod';
import { GeoBuilder, resamplePath, skin1, tube, type V3 } from './common/geo';
import { RigDef, instantiateRig, makeSkinned, setRot } from './common/rig';
import { acquire, release } from './common/cache';
import { critterTiers } from './common/tiers';
import { createCritterMaterial, createCritterUniforms } from './common/materials';
import { applyAppearance } from './common/palette';
import { clamp, damp, lerp, rng, smoothstep, TAU } from './common/math';

const GROUND = 0.2;
const DISC_Y = -GROUND + 0.2;

interface AnemoneTemplate {
  geo: THREE.BufferGeometry;
  rig: RigDef;
}

function buildAnemone(lod: RenderLod): AnemoneTemplate {
  const rig = new RigDef();
  rig.add('root', null, [0, 0, 0]);
  const rootB = rig.idx('root');
  const g = new GeoBuilder();
  // the column: a lathe from the adhesive foot up to the flared rim of the oral disc
  const prof: [number, number][] = [
    [0.0, -GROUND],
    [0.11, -GROUND],
    [0.13, -GROUND + 0.012],
    [0.1, -GROUND + 0.07],
    [0.105, -GROUND + 0.14],
    [0.15, DISC_Y - 0.01],
    [0.165, DISC_Y],
    [0.12, DISC_Y + 0.006],
    [0.03, DISC_Y + 0.004],
    [0.0, DISC_Y - 0.01],
  ];
  const nu = lod === 0 ? 40 : lod === 1 ? 20 : 10;
  const nv = lod === 0 ? 36 : lod === 1 ? 18 : 10;
  const cum: number[] = [0];
  for (let i = 1; i < prof.length; i++) cum.push(cum[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  const total = cum[cum.length - 1];
  const at = (s: number): [number, number] => {
    const d = s * total;
    let k = 1;
    while (k < cum.length - 1 && cum[k] < d) k++;
    const f = (d - cum[k - 1]) / Math.max(1e-9, cum[k] - cum[k - 1]);
    return [lerp(prof[k - 1][0], prof[k][0], f), lerp(prof[k - 1][1], prof[k][1], f)];
  };
  g.grid({ nu, nv, wrapV: true, orient: 'ring', group: 0 }, (i, j, smp) => {
    const s = i / (nu - 1);
    const [r, y] = at(s);
    const a = (j / nv) * TAU;
    smp.x = Math.cos(a) * r;
    smp.y = y;
    smp.z = Math.sin(a) * r;
    smp.u = s;
    smp.v = j / nv;
    // part 0 column (s < the rim), part 1 the oral disc
    smp.mask = [s < 0.62 ? 0 : 1, s, a, r];
    smp.skin = skin1(rootB);
    smp.aux = [0, DISC_Y, 0, 1];
  });
  // the crown: tentacles on a phyllotaxis spiral over the disc, inner ones shorter and more upright
  const count = lod === 0 ? 84 : lod === 1 ? 40 : 18;
  const segs = lod === 0 ? 10 : lod === 1 ? 6 : 4;
  const r = rng(4242);
  for (let i = 0; i < count; i++) {
    const ringT = Math.sqrt((i + 0.5) / count);
    const a = i * 2.39996;
    const rad = 0.025 + ringT * 0.12;
    const base = new THREE.Vector3(Math.cos(a) * rad, DISC_Y + 0.004, Math.sin(a) * rad);
    const L = (0.15 + 0.13 * ringT) * (0.85 + 0.3 * r());
    const dir = new THREE.Vector3(Math.cos(a) * (0.25 + ringT * 1.1), 1, Math.sin(a) * (0.25 + ringT * 1.1)).normalize();
    const pts: V3[] = [];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4;
      // outer tentacles arch over and droop a little at the end
      pts.push([base.x + dir.x * L * t, base.y + dir.y * L * t - t * t * L * 0.3 * ringT, base.z + dir.z * L * t]);
    }
    const phase = r() * TAU;
    tube(g, {
      path: resamplePath(pts, segs),
      nv: lod === 0 ? 8 : 5,
      radius: (t) => {
        const bulb = smoothstep(0.5, 0.74, t) * (1 - smoothstep(0.84, 1, t));
        return 0.011 * (1 - 0.25 * t) + bulb * 0.011;
      },
      capEnd: 0.05,
      capRows: 3,
      skin: () => skin1(rootB),
      mask: (t) => [2, t, phase, ringT],
      aux: [base.x, base.y, base.z, 1],
    });
  }
  return { geo: g.build(), rig };
}

const ANEMONE_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  float part = m.x;
  float t = uAgcTime;
  float closed = uAgcV0.x;
  float deflate = uAgcV0.y;
  float flow = uAgcV0.z;
  if (part > 1.5) {
    float q = m.y; float ph = m.z; float ring = m.w;
    vec3 base = aAux.xyz;
    vec3 d = p - base;
    // sway in the flow: each tentacle on its own phase, the tips most
    float sw = (sin(t * 0.9 + ph) * 0.5 + sin(t * 0.37 + ph * 1.7) * 0.5) * (0.2 + 0.35 * flow);
    d = agcRotZ(d, sw * q * q);
    d = agcRotX(d, cos(t * 0.71 + ph) * 0.15 * q * q);
    // closing: tentacles shorten and fold in over the mouth
    d *= 1.0 - closed * 0.55;
    p = base + d;
    p.xz = mix(p.xz, p.xz * 0.35, closed * q);
    p.y -= closed * 0.03 * ring;
  }
  // the column draws in and the disc rim tucks under when closed; a deflated anemone slumps
  float rise = p.y + ${GROUND.toFixed(3)};
  p.xz *= 1.0 - closed * 0.25 * smoothstep(0.1, 0.2, rise) - deflate * 0.15;
  p.y = -${GROUND.toFixed(3)} + rise * (1.0 - closed * 0.2 - deflate * 0.35);
}
`;

const ANEMONE_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x;
  vec3 P = vAgcRest;
  float seed = uAgcPat.w;
  vec3 disc = uAgcPal[0]; vec3 shaft = uAgcPal[1]; vec3 column = uAgcPal[2]; vec3 tipC = uAgcPal[4]; vec3 bubble = uAgcPal[5];
  vec3 col;
  if (part < 0.5) {
    // column: paler, with rows of small sticky warts (verrucae) and a few dark flecks
    float wart = smoothstep(0.62, 0.72, sin(vAgcMask.z * 22.0) * sin(vAgcMask.y * 60.0));
    col = mix(column, column * 1.15, wart * 0.5);
    col *= 0.9 + 0.15 * agcVn(P * 90.0 + seed);
    s.rough = 0.45;
  } else if (part < 1.5) {
    // oral disc: radial lines out from the darker mouth
    float r = vAgcMask.w;
    float lines = 0.5 + 0.5 * sin(vAgcMask.z * 18.0);
    col = mix(disc * 0.45, disc, smoothstep(0.02, 0.06, r));
    col = mix(col, shaft, lines * 0.3 * smoothstep(0.05, 0.12, r));
    s.rough = 0.35;
  } else {
    // tentacle: base the disc colour, shaft its own, the bubble swelling paler, the tip a ring of colour
    float q = vAgcMask.y;
    col = mix(disc, shaft, smoothstep(0.05, 0.4, q));
    col = mix(col, bubble, smoothstep(0.5, 0.72, q) * (1.0 - smoothstep(0.86, 0.95, q)));
    col = mix(col, tipC, smoothstep(0.88, 0.98, q));
    s.rough = 0.25;
    s.clear = 0.7;
  }
  s.albedo = col;
  s.sss = 0.9 + uAgcMat.z;
  s.sssCol = mix(col, vec3(1.0, 0.8, 0.7), 0.25) * 1.2;
}
`;

export const createBubbleTipAnemone: CreatureFactory = (args) => {
  const { appearance: ap, fx, lod } = args;
  const key = `anemone|${lod}`;
  const tpl = acquire(key, () => buildAnemone(lod), (t) => t.geo.dispose());
  const root = new THREE.Group();
  root.name = 'bubbletip_anemone';
  const inner = new THREE.Group();
  root.add(inner);
  const rigI = instantiateRig(tpl.rig);
  for (const b of rigI.roots) inner.add(b);
  const u = createCritterUniforms(fx);
  applyAppearance(u, ap, args.creature);
  const mat = createCritterMaterial({
    name: 'anemone',
    fx,
    u,
    surface: ANEMONE_SURFACE,
    vertex: ANEMONE_VERTEX,
    params: { side: THREE.DoubleSide, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 },
  });
  const mesh = makeSkinned(tpl.geo, mat, rigI, 1.2);
  mesh.castShadow = lod === 0;
  mesh.receiveShadow = lod < 2;
  inner.add(mesh);
  const tiers = critterTiers(lod, (l) => `anemone|${l}`, (l) => buildAnemone(l), (t) => t.geo.dispose(), tpl, (t) => (mesh.geometry = t.geo), false);
  root.userData.groundOffset = GROUND;
  root.userData.speciesVisual = 'bubbletip_anemone';
  const B = rigI.byName;
  const st = { closed: 0, deflate: 0, flow: 0.5 };
  const sel = { on: false };
  const update = (rt: CreatureRuntime, dt: number, time: number) => {
    u.uAgcTime.value = time;
    const pose = rt.pose;
    const dead = pose === 'dead';
    const aiClosed = rt.ai?.closed;
    const want = dead ? 1 : typeof aiClosed === 'number' ? clamp(aiClosed) : pose === 'hiding' || pose === 'startle' || pose === 'rest' ? 1 : 0;
    st.closed = damp(st.closed, want, want > st.closed ? 1.5 : 0.35, dt);
    const aiDeflate = rt.ai?.deflate;
    st.deflate = damp(st.deflate, typeof aiDeflate === 'number' ? clamp(aiDeflate) : dead ? 1 : 0, 0.4, dt);
    st.flow = damp(st.flow, clamp(0.4 + (rt.speedBL || 0) * 4), 0.5, dt);
    u.uAgcV0.value.set(st.closed, st.deflate, st.flow, 0);
    setRot(B.root, 0, 0, 0);
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
