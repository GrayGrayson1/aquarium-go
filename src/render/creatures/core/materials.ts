/**
 * Fish materials: MeshPhysicalMaterial (hero/near) or MeshStandardMaterial (far) patched with the fish shader.
 * OWNER: lane "fishart".
 *
 * All per-individual state lives in a FishUniforms object whose entries are shared by the body and fin materials,
 * so one update per frame drives both. Tank caustics/fog uniforms are the tank's shared TankFX objects.
 */
import * as THREE from 'three';
import type { CreatureVisualParams, QualityLevel } from '@/types';
import { UNDERWATER_PARS, UNDERWATER_APPLY, type TankFXUniforms } from '../../shared/underwater';
import type { RenderLod } from '../../lod';
import type { FishPlan, FinShape } from './plan';
import { resolveColor } from './palette';
import { hash1 } from './math';
import {
  SWIM_PARS,
  BODY_VERT_PARS,
  BODY_VERT_NORMAL,
  FIN_VERT_PARS,
  FIN_VERT_NORMAL,
  VERT_BEGIN,
  VERT_WORLD,
  FRAG_PARS,
  BODY_FRAG_COLOR,
  FIN_FRAG_COLOR,
  FRAG_ROUGH,
  FRAG_METAL,
  BODY_FRAG_NORMAL,
  FIN_FRAG_NORMAL,
  FRAG_EMISSIVE,
  FIN_FRAG_PARS,
  BODY_FRAG_DECL,
  EYE_VERT,
  EYE_VERT_MAIN,
  EYE_FRAG_PARS,
  EYE_FRAG_COLOR,
  EYE_FRAG_EMISSIVE,
  PATTERN_ID,
  MAX_FINS,
  MAX_MARKS,
} from './shaders';
import type { BodySampler } from './body';

type U<T> = { value: T };
/** Caustics that scale with the surface albedo (waterfx v2) when available, else the stable v1 snippet. */
const UW_APPLY = UNDERWATER_PARS.includes('agApplyUnderwaterAlbedo')
  ? 'gl_FragColor.rgb = agApplyUnderwaterAlbedo(gl_FragColor.rgb, vAgWorldPos, agSafeNormalize(vAgWorldNormal), diffuseColor.rgb);'
  : UNDERWATER_APPLY;
const DEBUG: string | null = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('fsdebug') : null;
const v4 = (x = 0, y = 0, z = 0, w = 0): U<THREE.Vector4> => ({ value: new THREE.Vector4(x, y, z, w) });
const arr4 = (n: number): U<THREE.Vector4[]> => ({ value: Array.from({ length: n }, () => new THREE.Vector4()) });

export interface FishUniforms {
  uSwimA: U<THREE.Vector4>;
  uSwimB: U<THREE.Vector4>;
  uSwimC: U<THREE.Vector4>;
  uShapeA: U<THREE.Vector4>;
  uShapeB: U<THREE.Vector4>;
  uHeadA: U<THREE.Vector4>;
  uLag: U<THREE.Vector4>;
  uStateA: U<THREE.Vector4>;
  uCBody: U<THREE.Color>;
  uCBody2: U<THREE.Color>;
  uCBelly: U<THREE.Color>;
  uCFin: U<THREE.Color>;
  uCFin2: U<THREE.Color>;
  uCAccent: U<THREE.Color>;
  uCEdge: U<THREE.Color>;
  uCLower: U<THREE.Color>;
  uCLip: U<THREE.Color>;
  uCAppend: U<THREE.Color>;
  uLookA: U<THREE.Vector4>;
  uLookB: U<THREE.Vector4>;
  uLookC: U<THREE.Vector4>;
  uLookD: U<THREE.Vector4>;
  uLookE: U<THREE.Vector4>;
  uLookF: U<THREE.Vector4>;
  uLookG: U<THREE.Vector4>;
  uPatA: U<THREE.Vector4>;
  uPatB: U<THREE.Vector4>;
  uLookH: U<THREE.Vector4>;
  uBands: U<THREE.Vector4[]>;
  uStripe: U<THREE.Vector4>;
  uStripe2: U<THREE.Vector4>;
  uMarkA: U<THREE.Vector4[]>;
  uMarkB: U<THREE.Vector4[]>;
  uMarkC: U<THREE.Vector4[]>;
  uSeed: U<THREE.Vector3>;
  uFinMot: U<THREE.Vector4[]>;
  uFinOpt: U<THREE.Vector4[]>;
  uFinTint: U<THREE.Vector4[]>;
  uFinEdge: U<THREE.Vector4[]>;
  uFinShape: U<THREE.Vector4[]>;
}

const IRID_MODE = { body: 0, stripe: 1, scales: 2, back: 3 } as const;
const SCALE_KIND = { cycloid: 0, fine: 1, ctenoid: 2, skin: 3, plates: 4 } as const;
const MARK_MODE = { ellipse: 0, ring: 1, band_t: 2, band_y: 3, stripe: 4 } as const;

/** Build the per-individual uniform set from a plan + appearance. */
export function createFishUniforms(plan: FishPlan, sampler: BodySampler, a: CreatureVisualParams): FishUniforms {
  const L = plan.look;
  const m = plan.motion;
  const col = (ref: Parameters<typeof resolveColor>[0], fb: Parameters<typeof resolveColor>[2] = 'body') => ({ value: resolveColor(ref, a, fb) });
  const seed = a.patternSeed ?? 0;
  const perim = sampler.perimeter(0.4);
  const cols = L.scales.cols;
  const rows = Math.max(4, Math.round((cols * perim) / Math.max(0.05, sampler.length)));
  const u: FishUniforms = {
    uSwimA: v4(0, m.idleAmp, (Math.PI * 2) / Math.max(0.2, m.wavelength), 0),
    uSwimB: v4(sampler.noseX, sampler.tailX, m.envPow, m.headSway),
    uSwimC: v4(0, 0, m.bendK, m.finSoft),
    uShapeA: v4(0, 0, a.bodyDepth ?? 1, 0),
    uShapeB: v4(0, 0, 0, m.sag),
    uHeadA: v4(plan.body.mouth.t, plan.body.mouth.yn, plan.body.operculum.t, m.pectoralHz),
    uLag: v4(0, 0, m.breathe ?? 0.6, m.finLag),
    uStateA: v4(0, 0, 0, 0),
    uCBody: col(L.slots?.body ?? 'body'),
    uCBody2: col(L.slots?.body2 ?? 'body2'),
    uCBelly: col(L.slots?.belly ?? 'belly'),
    uCFin: col(L.slots?.fin ?? 'fin'),
    uCFin2: col(L.slots?.fin2 ?? 'fin2'),
    uCAccent: col(L.slots?.accent ?? 'accent'),
    uCEdge: col(L.patternEdge ?? 'black'),
    uCLower: col(L.stripe?.lowerColor ?? 'body2'),
    uCLip: col(L.lipColor ?? 'body2'),
    uCAppend: col(L.appendageColor ?? 'body2'),
    uLookA: v4(L.dorsalDark, L.bellyLine, L.bellyAmount, L.bellySoft ?? 0.35),
    uLookB: v4(cols, rows, L.scales.strength, SCALE_KIND[L.scales.kind]),
    uLookC: v4(a.iridescence ?? 0, a.metallic ?? 0, a.translucency ?? 0.3, a.glow ?? 0),
    uLookD: v4(a.patternScale ?? 1, a.patternContrast ?? 0.7, L.patternEdgeWidth ?? 0.012, L.roughness),
    uLookE: v4(0.85, 0, plan.body.operculum.strength, L.lateralLine ?? 0.3),
    uLookF: v4(IRID_MODE[L.iridMode ?? 'body'], L.iridHue ?? 0.55, L.sss ?? 0.5, L.patternBellyFade ?? -2),
    uLookG: v4(a.patternRegularity ?? 0.6, L.gloss ?? 0.5, 0, plan.body.operculum.t),
    uPatA: v4(...(L.patA ?? [0, 0, 0, 1])),
    uPatB: v4(...(L.patB ?? [0, 0, 0, 0])),
    uLookH: v4(L.marksUnderPattern ? 1 : 0, 0, 0, 0),
    uBands: arr4(4),
    uStripe: v4(),
    uStripe2: v4(),
    uMarkA: arr4(MAX_MARKS),
    uMarkB: arr4(MAX_MARKS),
    uMarkC: arr4(MAX_MARKS),
    uSeed: { value: new THREE.Vector3(hash1(seed) * 97.3, hash1(seed + 11) * 61.7, hash1(seed + 23) * 43.1) },
    uFinMot: arr4(MAX_FINS),
    uFinOpt: arr4(MAX_FINS),
    uFinTint: arr4(MAX_FINS),
    uFinEdge: arr4(MAX_FINS),
    uFinShape: arr4(MAX_FINS),
  };
  (L.bands ?? []).slice(0, 4).forEach((b, i) => u.uBands.value[i].set(b.t, b.w, b.curve ?? 0, b.arrow ?? 0));
  if (L.stripe) {
    u.uStripe.value.set(L.stripe.yn0, L.stripe.yn1, L.stripe.w, L.stripe.redT0);
    u.uStripe2.value.set(L.stripe.t0, L.stripe.t1, 0, 0);
  }
  (L.marks ?? []).slice(0, MAX_MARKS).forEach((mk, i) => {
    const c = resolveColor(mk.color, a);
    u.uMarkA.value[i].set(mk.t, mk.yn, mk.rt, mk.ryn);
    u.uMarkB.value[i].set(c.r, c.g, c.b, mk.strength ?? 1);
    u.uMarkC.value[i].set(mk.soft ?? 0.35, MARK_MODE[mk.mode ?? 'ellipse'], mk.rot ?? 0, mk.onFins ?? 0);
  });
  applyFinUniforms(u, plan.fins, a, m.finRest);
  return u;
}

export function applyFinUniforms(u: FishUniforms, fins: FinShape[], a: CreatureVisualParams, rest: number): void {
  fins.slice(0, MAX_FINS).forEach((f, i) => {
    const st = f.style;
    const tint = st.color ? resolveColor(st.color, a) : null;
    const edge = st.edge ? resolveColor(st.edge, a) : null;
    const trans = a.translucency ?? 0.3;
    u.uFinMot.value[i].set(st.rest ?? (f.role === 'beard' ? 0 : rest), 1, st.flutter ?? 0, st.phase ?? i * 1.7);
    u.uFinOpt.value[i].set(st.opacity, st.pattern ?? 0.5, st.rayContrast ?? 0.6, st.irid ?? 0.5);
    if (tint) u.uFinTint.value[i].set(tint.r, tint.g, tint.b, 1);
    else u.uFinTint.value[i].set(0, 0, 0, 0);
    if (edge) u.uFinEdge.value[i].set(edge.r, edge.g, edge.b, st.edgeAmount ?? 1);
    else u.uFinEdge.value[i].set(0, 0, 0, st.edgeAmount ?? 0);
    u.uFinShape.value[i].set(st.edgeStart ?? 0.55, st.edgeWidth ?? 0.4, st.rootBlend ?? 0.12, 0.25 + trans * 0.9);
  });
}

function patchCommon(
  mat: THREE.Material,
  u: FishUniforms,
  fx: TankFXUniforms,
  kind: 'body' | 'fin',
  patternId: number,
  cheap: boolean,
): void {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fx, u);
    shader.defines = shader.defines ?? {};
    if (cheap) shader.defines.FS_CHEAP = 1;
    const vPars = kind === 'body' ? BODY_VERT_PARS : FIN_VERT_PARS;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SWIM_PARS}\n${vPars}`)
      .replace('#include <beginnormal_vertex>', kind === 'body' ? BODY_VERT_NORMAL : FIN_VERT_NORMAL)
      .replace('#include <begin_vertex>', VERT_BEGIN)
      .replace('#include <worldpos_vertex>', VERT_WORLD);
    const fDecl = kind === 'body' ? BODY_FRAG_DECL : FIN_FRAG_PARS;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${UNDERWATER_PARS}\n${fDecl}\n${FRAG_PARS}`)
      .replace('#include <color_fragment>', kind === 'body' ? BODY_FRAG_COLOR : FIN_FRAG_COLOR)
      .replace('#include <roughnessmap_fragment>', FRAG_ROUGH)
      .replace('#include <metalnessmap_fragment>', FRAG_METAL)
      .replace('#include <normal_fragment_maps>', kind === 'body' ? (cheap ? '#include <normal_fragment_maps>\nfloat fsScaleId = 0.0;\nfloat fsScaleEdge = 0.0;' : BODY_FRAG_NORMAL) : cheap ? '#include <normal_fragment_maps>' : FIN_FRAG_NORMAL)
      .replace('#include <emissivemap_fragment>', FRAG_EMISSIVE(kind === 'fin'))
        .replace('#include <dithering_fragment>', `${UW_APPLY}\n#include <dithering_fragment>\n#ifdef FS_DEBUG\ngl_FragColor.rgb = FS_DEBUG;\n#endif`);
    if (DEBUG) shader.defines.FS_DEBUG = DEBUG;
  };
  mat.customProgramCacheKey = () => `fishart-${kind}-${cheap ? 'c' : 'f'}-v5`; // v5: Prismatic sheen (lane:genetics)
}

/** Which pattern the shader draws: species map first, then species default for plain appearances. */
export function resolvePattern(plan: FishPlan, a: CreatureVisualParams): string {
  const p = a.pattern ?? 'solid';
  const mapped = plan.look.patternMap?.[p];
  if (mapped) return mapped;
  if (plan.look.pattern && (p === 'solid' || p === 'none')) return plan.look.pattern;
  return p;
}

/**
 * Shadow-pass depth material that applies the same swim deformation as the body, so the fish's shadow on the
 * substrate undulates with it (spot-light shadows use customDepthMaterial).
 */
export function createFishDepthMaterial(u: FishUniforms): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SWIM_PARS}\n${BODY_VERT_PARS}`)
      .replace('#include <begin_vertex>', `${BODY_VERT_NORMAL}\n${VERT_BEGIN}`);
  };
  m.customProgramCacheKey = () => 'fishart-depth-v1';
  return m;
}

export interface FishMaterials {
  body: THREE.MeshStandardMaterial;
  fins: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
  eyeUniforms: EyeUniforms;
}

export interface EyeUniforms {
  uIris: U<THREE.Color>;
  uIrisRing: U<THREE.Color>;
  uSclera: U<THREE.Color>;
  uEyeA: U<THREE.Vector4>;
  uEyeB: U<THREE.Vector4>;
  uEyeMask: U<THREE.Color>;
}

export function createFishMaterials(
  plan: FishPlan,
  u: FishUniforms,
  a: CreatureVisualParams,
  fx: TankFXUniforms,
  lod: RenderLod,
  quality: QualityLevel,
): FishMaterials {
  const pattern = PATTERN_ID[resolvePattern(plan, a)] ?? 0;
  const cheap = lod >= 2 || quality === 'low';
  const physical = !cheap && lod === 0;
  const gloss = plan.look.gloss ?? 0.5;
  const body = physical
    ? new THREE.MeshPhysicalMaterial({
        roughness: plan.look.roughness,
        metalness: 0,
        clearcoat: gloss,
        clearcoatRoughness: 0.28,
        specularIntensity: 1,
      })
    : new THREE.MeshStandardMaterial({ roughness: plan.look.roughness, metalness: 0 });
  u.uLookG.value.z = pattern;
  patchCommon(body, u, fx, 'body', pattern, cheap);

  const fins = physical
    ? new THREE.MeshPhysicalMaterial({ roughness: 0.45, metalness: 0, transparent: true, side: THREE.DoubleSide, specularIntensity: 0.8 })
    : new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, transparent: true, side: THREE.DoubleSide });
  fins.depthWrite = true;
  // one pass, not three's default back-then-front pair for transparent double-sided materials: halves fin draw calls
  // (≈100 fewer per frame in a stocked 1,000-gallon tank); fins write depth, so the ordering difference is negligible
  fins.forceSinglePass = true;
  patchCommon(fins, u, fx, 'fin', pattern, cheap);

  const eyeU: EyeUniforms = {
    uIris: { value: resolveColor(plan.eye.iris ?? 'eye', a) },
    uIrisRing: { value: resolveColor(plan.eye.ring ?? plan.eye.iris ?? 'eye', a) },
    uSclera: { value: resolveColor(plan.eye.socket ?? 'body', a).multiplyScalar(0.7) },
    uEyeA: v4(plan.eye.pupil, plan.eye.ringWidth ?? 0.12, plan.eye.ring ? 1 : 0, cheap ? 0.6 : 1),
    uEyeB: v4(plan.eye.maskColor ? 1 : 0, 1, 0, 0),
    uEyeMask: { value: resolveColor(plan.eye.maskColor ?? 'black', a) },
  };
  const eye = physical
    ? new THREE.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04 })
    : new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0 });
  eye.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fx, eyeU);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${EYE_VERT}`)
      .replace('#include <worldpos_vertex>', EYE_VERT_MAIN);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${UNDERWATER_PARS}\n${EYE_FRAG_PARS}`)
      .replace('#include <color_fragment>', EYE_FRAG_COLOR)
      .replace('#include <emissivemap_fragment>', EYE_FRAG_EMISSIVE)
      .replace('#include <dithering_fragment>', `${UW_APPLY}\n#include <dithering_fragment>`);
  };
  eye.customProgramCacheKey = () => `fishart-eye-v2`;
  return { body, fins, eye, eyeUniforms: eyeU };
}
