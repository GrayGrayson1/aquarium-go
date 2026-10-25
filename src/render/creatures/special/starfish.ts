/**
 * Sea stars (chunk 16): the elegant starfish (Fromia) and, with its own spec, the sand-sifting star (Astropecten).
 *
 * One closed surface: a star outline (a small central disc and tapering arms with rounded tips) swept from the top
 * pole, over the rounded arm edges, to an almost flat underside. Arms taper in height toward the tips. The skin is a
 * mosaic of small plates (cellular noise in rest space) with paler furrows, darker arm tips, a pale madreporite on the
 * disc and the ambulacral groove down each arm underneath. A gliding star ripples its arms and lifts the leading tips;
 * at rest the tips settle. Stars have no retract, so startle and hiding change nothing but the ripple.
 *
 * Local space: the leading arm points +X, the underside lies on the contact plane y = -groundOffset (the AI turns
 * root so local −Y faces the glass, rock or floor). Length 1 = the span from tip to tip.
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { CreatureFactory, CreatureObject } from '../types';
import type { CreatureRuntime } from '@/types';
import type { RenderLod } from '../../lod';
import { GeoBuilder, skin1 } from './common/geo';
import { RigDef, instantiateRig, makeSkinned, setRot } from './common/rig';
import { acquire, release } from './common/cache';
import { critterTiers } from './common/tiers';
import { createCritterMaterial, createCritterUniforms } from './common/materials';
import { applyAppearance } from './common/palette';
import { clamp, damp, lerp, smoothstep, TAU } from './common/math';

export interface StarSpec {
  id: string;
  arms: number;
  /** Central disc radius (the tips sit at 0.5). */
  disc: number;
  /** Arm narrowness: the outline lobe exponent (higher = slimmer arms). */
  armWidth: number;
  /** Height of the disc's dome above the contact plane (local units). */
  height: number;
  /** Arm height at the tips as a fraction of the disc's. */
  tipHeight: number;
  /** Underside thickness (local units). */
  under: number;
  /** Marginal plates and spines fringing the arms (the sand-sifting star), 0..1. */
  fringe?: number;
  /** Shader skin kind: 0 Fromia plates, 1 sand star (granular top, fringed margins). */
  kind: number;
}

export const STAR_SPECS: Record<string, StarSpec> = {
  // Fromia: a small disc and five fairly broad, round-ended arms, plump and smooth-plated
  elegant_starfish: { id: 'elegant_starfish', arms: 5, disc: 0.115, armWidth: 2.4, height: 0.075, tipHeight: 0.42, under: 0.016, kind: 0 },
  // Astropecten: a small disc and five long, flat, straight-sided arms fringed with marginal plates and spines
  sand_sifting_starfish: { id: 'sand_sifting_starfish', arms: 5, disc: 0.085, armWidth: 3.6, height: 0.038, tipHeight: 0.35, under: 0.01, fringe: 1, kind: 1 },
};

const GROUND = 0.03;

interface StarTemplate {
  geo: THREE.BufferGeometry;
  rig: RigDef;
}

/** Outline radius at angle `a` (arm 0 along +X). */
function outline(spec: StarSpec, a: number): number {
  const lobe = Math.pow(0.5 + 0.5 * Math.cos(spec.arms * a), spec.armWidth);
  return spec.disc + (0.5 - spec.disc) * lobe;
}

function buildStar(spec: StarSpec, lod: RenderLod): StarTemplate {
  const rig = new RigDef();
  rig.add('root', null, [0, 0, 0]);
  const rootB = rig.idx('root');
  const g = new GeoBuilder();
  const nu = lod === 0 ? 30 : lod === 1 ? 16 : 8;
  const nv = lod === 0 ? spec.arms * 36 : lod === 1 ? spec.arms * 16 : spec.arms * 7;
  // rows run from the top pole (θ = 0) over the rim (θ = π/2) to the bottom pole (θ = π); columns go round
  g.grid({ nu, nv, wrapV: true, orient: 'ring', group: 0 }, (i, j, smp) => {
    const th = (i / (nu - 1)) * Math.PI;
    const a = (j / nv) * TAU;
    const R = outline(spec, a);
    const top = th <= Math.PI / 2;
    // the rim rounds over in the last few rows of each half, so the arms keep their thickness most of the way out
    const s = Math.sin(th);
    const rho = R * Math.pow(s, 0.6);
    const along = clamp((rho - spec.disc * 0.5) / (0.5 - spec.disc * 0.5), 0, 1);
    const h = spec.height * lerp(1, spec.tipHeight, smoothstep(0, 1, along));
    const c = Math.cos(th);
    const y = top ? h * Math.pow(Math.max(c, 0), 0.75) : -spec.under * Math.pow(Math.max(-c, 0), 0.35);
    smp.x = rho * Math.cos(a);
    smp.y = y - GROUND + spec.under;
    smp.z = rho * Math.sin(a);
    smp.u = i / (nu - 1);
    smp.v = j / nv;
    // mask: part 0, distance out along the arm (0 centre → 1 tip), angle, top (1) or underside (0)
    smp.mask = [0, rho / 0.5, a, top ? 1 : 0];
    smp.skin = skin1(rootB);
    smp.aux = [0, 0, 0, 1];
  });
  return { geo: g.build(), rig };
}

const STAR_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  float r = m.y; float a = m.z;
  float t = uAgcTime;
  float glide = uAgcV0.x; float lift = uAgcV0.y; float sag = uAgcV0.z;
  float arms = uAgcF1.x;
  // which arm this point belongs to, and how far round from its axis
  float armPh = floor(a * arms / 6.2831853 + 0.5);
  float r2 = r * r;
  // gliding: a slow wave runs round the arms; the leading tips lift a little to feel the way
  float wave = sin(t * 1.4 - armPh * 1.9 + uAgcV0.w) * 0.012 * glide;
  float lead = max(0.0, cos(a)) * lift * 0.03;
  // resting: the tips settle, now and then one curls up a touch
  float idle = sin(t * 0.37 + armPh * 2.3 + uAgcV0.w) * 0.004;
  p.y += (wave + lead + idle) * r2 * r;
  // dead: the arms sag flat and the body slumps
  p.y -= sag * 0.35 * (p.y + 0.03) * (1.0 - r);
}
`;

const STAR_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float r = vAgcMask.y; float a = vAgcMask.z; float topSide = vAgcMask.w;
  vec3 P = vAgcRest;
  float seed = uAgcPat.w;
  float contrast = uAgcPat.z;
  vec3 body = uAgcPal[0]; vec3 body2 = uAgcPal[1]; vec3 under = uAgcPal[2]; vec3 tip = uAgcPal[5];
  float kind = uAgcF0.x;
  float arms = uAgcF1.x;
  float armA = a - floor(a * arms / 6.2831853 + 0.5) * 6.2831853 / arms; // angle off the nearest arm's axis
  if (topSide < 0.5 && P.y < -0.02) {
    // underside: pale, the ambulacral groove (tube feet) down the middle of each arm
    float groove = smoothstep(0.035, 0.0, abs(armA) * r * 2.0) * smoothstep(0.08, 0.2, r);
    vec3 col = mix(under, under * 0.55, groove * 0.8);
    col *= 0.9 + 0.1 * agcVn(P * 300.0 + seed);
    s.albedo = col;
    s.rough = 0.6;
    s.clear = 0.2;
    s.height += groove * -0.001;
    return;
  }
  vec3 col = body;
  if (kind < 0.5) {
    // Fromia: a mosaic of small rounded plates with paler furrows between them; darker, plumper tips
    vec3 c = agcCell(P * vec3(95.0, 140.0, 95.0) + seed);
    float plate = smoothstep(0.04, 0.22, c.y - c.x);
    col = mix(body2, body, plate);
    col = mix(col, col * (0.85 + 0.3 * c.z), 0.5 * contrast);
    s.height += plate * 0.0012 * agcResolve(0.003);
    float tipT = smoothstep(0.72, 0.98, r);
    col = mix(col, tip, tipT * 0.85);
    // pale madreporite off-centre on the disc
    float mad = smoothstep(0.016, 0.006, length(P.xz - vec2(-0.035, 0.03)));
    col = mix(col, under, mad * 0.8);
  } else {
    // sand star: fine granular top, a darker star on the disc, pale fringed margins of plates and spines
    float gran = agcVn(P * 420.0 + seed);
    col = mix(body, body2, smoothstep(0.35, 0.75, agcFbm(P * 30.0 + seed)) * 0.6);
    col *= 0.85 + 0.25 * gran;
    float centre = smoothstep(0.12, 0.02, r) + smoothstep(0.03, 0.0, abs(armA) * r) * smoothstep(0.5, 0.1, r) * 0.6;
    col = mix(col, tip, centre * contrast * 0.6);
    float margin = smoothstep(0.85, 1.0, abs(armA) * r * arms * 0.9 / max(r, 0.15));
    float plates = 0.5 + 0.5 * sin(r * 90.0);
    col = mix(col, mix(under, body, 0.3), margin * (0.5 + 0.4 * plates));
    s.height += gran * 0.0005;
  }
  s.albedo = col;
  s.rough = 0.55;
  s.clear = 0.35;
  s.sss = 0.35 + uAgcMat.z;
  s.sssCol = mix(body, vec3(1.0, 0.8, 0.6), 0.3);
}
`;

function makeStarFactory(spec: StarSpec): CreatureFactory {
  return (args) => {
    const { appearance: ap, fx, lod } = args;
    const key = `star|${spec.id}|${lod}`;
    const tpl = acquire(key, () => buildStar(spec, lod), (t) => t.geo.dispose());
    const root = new THREE.Group();
    root.name = spec.id;
    const inner = new THREE.Group();
    root.add(inner);
    const rigI = instantiateRig(tpl.rig);
    for (const b of rigI.roots) inner.add(b);
    const u = createCritterUniforms(fx);
    applyAppearance(u, ap, args.creature);
    u.uAgcF0.value.set(spec.kind, 0, 0, 0);
    u.uAgcF1.value.set(spec.arms, 0, 0, 0);
    const mat = createCritterMaterial({
      name: 'starfish',
      fx,
      u,
      surface: STAR_SURFACE,
      vertex: STAR_VERTEX,
      params: { side: THREE.DoubleSide, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 },
    });
    const mesh = makeSkinned(tpl.geo, mat, rigI, 0.8);
    mesh.castShadow = lod === 0;
    mesh.receiveShadow = lod < 2;
    inner.add(mesh);
    const tiers = critterTiers(lod, (l) => `star|${spec.id}|${l}`, (l) => buildStar(spec, l), (t) => t.geo.dispose(), tpl, (t) => (mesh.geometry = t.geo), false);
    root.userData.groundOffset = GROUND;
    root.userData.speciesVisual = spec.id;
    const B = rigI.byName;
    const seed = ((ap.patternSeed ?? 9) % 1000) / 1000;
    const st = { glide: 0, lift: 0, sag: 0 };
    const sel = { on: false };
    const update = (rt: CreatureRuntime, dt: number, time: number) => {
      u.uAgcTime.value = time;
      const dead = rt.pose === 'dead';
      const speed = Math.max(0, rt.speedBL || 0);
      st.glide = damp(st.glide, speed > 0.005 && !dead ? 1 : 0, 1.5, dt);
      st.lift = damp(st.lift, speed > 0.005 && !dead ? 1 : rt.pose === 'feed' ? 0.3 : 0, 1.2, dt);
      st.sag = damp(st.sag, dead ? 1 : 0, 0.5, dt);
      u.uAgcV0.value.set(st.glide, st.lift, st.sag, seed * 20);
      // a slow turn of the whole body as it changes heading (it has no head to lead with)
      setRot(B.root, 0, (rt.bend || 0) * 0.1, 0);
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
}

export const createElegantStarfish = makeStarFactory(STAR_SPECS.elegant_starfish);
export const createSandSiftingStarfish = makeStarFactory(STAR_SPECS.sand_sifting_starfish);
