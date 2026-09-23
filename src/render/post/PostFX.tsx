/**
 * Post-processing stack keyed off quality settings. OWNER: lane "waterfx".
 *  low    — no composer: renderer ACES tone mapping only (dpr 1).
 *  medium — bloom + tone mapping + grade, MSAA ×2.
 *  high   — + vignette, MSAA ×4, depth of field in photo/close modes.
 *  ultra  — + very subtle hero DOF and fine film grain (dpr up to 2).
 * The per-water-class colour grade (and the reduced-motion fade) runs after tone mapping.
 * A sanitize pass runs first: a NaN/Inf pixel from any shader is patched before bloom / DOF can smear it across the
 * frame (one bad pixel used to black out whole frames at High+).
 */
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, ToneMapping, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction, DepthOfFieldEffect, Effect, EffectPass, ToneMappingMode, type EffectComposer as EffectComposerImpl, type VignetteEffect } from 'postprocessing';
import { getGame } from '@/state/game';
import { getUI } from '@/state/ui';
import { useRenderQuality, QUALITY } from '../shared/quality';
import { waterLook } from '../shared/waterLook';
import { cameraFX, usePhotoSettings } from '../camera/cameraFX';
import { registerComposer } from '../camera/photo';

const TM_PARAM = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('tm') : null;
/** Tone mapping (dev override: ?tm=aces|agx|neutral). */
export const TONE_MAPPING_MODE = TM_PARAM === 'agx' ? ToneMappingMode.AGX : TM_PARAM === 'neutral' ? ToneMappingMode.NEUTRAL : ToneMappingMode.ACES_FILMIC;
export const RENDERER_TONE_MAPPING = TM_PARAM === 'agx' ? THREE.AgXToneMapping : TM_PARAM === 'neutral' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;

const GRADE_FRAG = /* glsl */ `
uniform vec3 uGain;
uniform vec3 uLift;
uniform float uSat;
uniform float uContrast;
uniform float uFade;
uniform float uExposure;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
  vec3 c = max(inputColor.rgb, 0.0) * uExposure;
  c = c * uGain + uLift * (1.0 - c);
  c = 0.18 * pow(c / 0.18, vec3(uContrast));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  c *= 1.0 - uFade;
  outputColor = vec4(clamp(c, 0.0, 64.0), inputColor.a);
}
`;

class GradeEffect extends Effect {
  constructor() {
    super('AgGradeEffect', GRADE_FRAG, {
      blendFunction: BlendFunction.SRC,
      uniforms: new Map<string, THREE.Uniform>([
        ['uGain', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ['uLift', new THREE.Uniform(new THREE.Vector3(0, 0, 0))],
        ['uSat', new THREE.Uniform(1)],
        ['uContrast', new THREE.Uniform(1)],
        ['uFade', new THREE.Uniform(0)],
        ['uExposure', new THREE.Uniform(1)],
      ]),
    });
  }
}

/**
 * NaN / Inf guard. Checks the exponent bits (fast-math compilers may fold `x != x` / isnan away), patches a bad pixel
 * from its finite neighbours and clamps runaway highlights so bloom never sees anything non-finite.
 */
const SANITIZE_FRAG = /* glsl */ `
bool agBad(float x) { return (floatBitsToUint(x) & 0x7f800000u) == 0x7f800000u; }
bool agBad3(vec3 c) { return agBad(c.r) || agBad(c.g) || agBad(c.b); }
void agTap(vec2 uv, inout vec3 acc, inout float n) {
  vec3 s = texture2D(inputBuffer, uv).rgb;
  if (!agBad3(s)) { acc += clamp(s, 0.0, 64.0); n += 1.0; }
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
  vec3 c = inputColor.rgb;
  if (agBad3(c)) {
    vec3 acc = vec3(0.0);
    float n = 0.0;
    vec2 o = texelSize * 2.0;
    agTap(uv + vec2(o.x, 0.0), acc, n);
    agTap(uv - vec2(o.x, 0.0), acc, n);
    agTap(uv + vec2(0.0, o.y), acc, n);
    agTap(uv - vec2(0.0, o.y), acc, n);
    c = n > 0.0 ? acc / n : vec3(0.0);
  }
  outputColor = vec4(clamp(c, 0.0, 64.0), agBad(inputColor.a) ? 1.0 : clamp(inputColor.a, 0.0, 1.0));
}
`;

class SanitizeEffect extends Effect {
  constructor() {
    // SRC blend: the default "normal" blend would mix the NaN input back in
    super('AgSanitizeEffect', SANITIZE_FRAG, { blendFunction: BlendFunction.SRC });
  }
}

const NEUTRAL = { gain: [1, 1, 1] as [number, number, number], lift: [0, 0, 0] as [number, number, number], saturation: 1.03, contrast: 1.04 };
const _gain = new THREE.Vector3();
const _lift = new THREE.Vector3();

/** Resolve the grade target: focused tank's water class; cooler + softer at night. */
function gradeTarget(outGain: THREE.Vector3, outLift: THREE.Vector3): { sat: number; contrast: number } {
  const g = getGame();
  const ui = getUI();
  const tank = g && ui.focusedTankId ? g.tanks[ui.focusedTankId] : g ? g.tanks[g.tankOrder[0]] : null;
  const gr = tank && ui.view === 'tank' ? waterLook(tank.waterClass).grade : NEUTRAL;
  outGain.set(gr.gain[0], gr.gain[1], gr.gain[2]);
  outLift.set(gr.lift[0], gr.lift[1], gr.lift[2]);
  let sat = gr.saturation;
  let contrast = gr.contrast;
  if (tank && g) {
    const h = ((g.clock.hour % 24) + 24) % 24;
    const on = tank.lighting?.onHour ?? 7;
    const off = tank.lighting?.offHour ?? 22;
    const lit = on <= off ? h >= on && h < off : h >= on || h < off;
    if (!lit) {
      outGain.multiply(_night);
      outLift.add(_nightLift);
      sat *= 0.86;
      contrast *= 1.02;
    }
  }
  return { sat, contrast };
}
const _night = new THREE.Vector3(0.9, 0.97, 1.1);
const _nightLift = new THREE.Vector3(0.0, 0.002, 0.008);

function LowQualityTone() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = RENDERER_TONE_MAPPING;
  }, [gl]);
  useFrame(() => {
    gl.toneMappingExposure = 1.05 * (1 - cameraFX.fade);
  });
  return null;
}

function DofPass({ subtle }: { subtle: boolean }) {
  const camera = useThree((s) => s.camera);
  // the always-on ultra hero DOF runs at a lower internal resolution; photo/close DOF gets half res
  const effect = useMemo(() => new DepthOfFieldEffect(camera, { focusDistance: 1, focusRange: 0.3, bokehScale: 2, resolutionScale: subtle ? 0.33 : 0.5 }), [camera, subtle]);
  useEffect(() => () => effect.dispose(), [effect]);
  useFrame(() => {
    const coc = effect.cocMaterial;
    const fd = Math.max(0.05, cameraFX.focusDistance);
    if (subtle && !cameraFX.dofEnabled) {
      coc.focusDistance = fd;
      coc.focusRange = Math.max(0.6, fd * 0.9);
      effect.bokehScale = 1.1;
    } else {
      const ap = Math.max(0, Math.min(1, cameraFX.bokehScale));
      coc.focusDistance = fd;
      // the rig can ask for a minimum in-focus range so a whole subject stays sharp (close-up / photo auto focus)
      coc.focusRange = Math.max(0.03, fd * (0.55 - ap * 0.45), cameraFX.focusRange);
      effect.bokehScale = 1 + ap * 4;
    }
  });
  return <primitive object={effect} dispose={null} />;
}

export function PostFX() {
  const q = useRenderQuality();
  const B = QUALITY[q];
  const grade = useMemo(() => new GradeEffect(), []);
  useEffect(() => () => grade.dispose(), [grade]);
  const composerRef = useRef<EffectComposerImpl | null>(null);
  const dofWanted = useDofWanted(B.dof, q === 'ultra');
  const vignette = useRef<VignetteEffect | null>(null);
  const camera = useThree((s) => s.camera);
  // its own pass (effects merged into one pass all read the raw input), rebuilt with the keyed composer below
  const sanitize = useMemo(() => new EffectPass(camera, new SanitizeEffect()), [camera, dofWanted]);
  useEffect(() => () => sanitize.dispose(), [sanitize]);

  useFrame((_, dt) => {
    const u = grade.uniforms;
    const tgt = gradeTarget(_gain, _lift);
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 1.5);
    (u.get('uGain')!.value as THREE.Vector3).lerp(_gain, k);
    (u.get('uLift')!.value as THREE.Vector3).lerp(_lift, k);
    u.get('uSat')!.value += (tgt.sat - u.get('uSat')!.value) * k;
    u.get('uContrast')!.value += (tgt.contrast - u.get('uContrast')!.value) * k;
    u.get('uFade')!.value = cameraFX.fade;
    // photo-mode lens controls
    const photo = cameraFX.mode === 'photo';
    const ps = usePhotoSettings.getState();
    const expo = photo ? Math.pow(2, Math.max(-1, Math.min(1, ps.exposure))) : 1;
    u.get('uExposure')!.value += (expo - u.get('uExposure')!.value) * Math.min(1, dt * 8);
    if (vignette.current) {
      const want = photo ? 0.15 + ps.vignette * 0.75 : B.vignette ? 0.5 : 0;
      vignette.current.darkness += (want - vignette.current.darkness) * Math.min(1, dt * 6);
    }
  });

  useEffect(() => {
    registerComposer(q === 'low' ? null : composerRef.current);
    return () => registerComposer(null);
  });

  if (q === 'low') return <LowQualityTone />;
  // The composer is rebuilt (keyed) whenever depth of field comes or goes. Adding/removing a depth-reading effect in a
  // live multisampled composer leaves its depth attachment in a format the MSAA resolve cannot blit
  // ("glBlitFramebuffer: Depth/stencil buffer format combination not allowed") and the canvas freezes on the last
  // frame — leaving photo mode or the close-up camera did exactly that at High quality.
  return (
    <EffectComposer key={`dof-${dofWanted}`} ref={composerRef} multisampling={B.msaa} frameBufferType={THREE.HalfFloatType}>
      <primitive object={sanitize} dispose={null} />
      {dofWanted !== 'off' ? <DofPass subtle={dofWanted === 'subtle'} /> : <></>}
      {B.bloom ? <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.35} intensity={0.42} radius={0.7} levels={7} /> : <></>}
      <ToneMapping mode={TONE_MAPPING_MODE} />
      <primitive object={grade} dispose={null} />
      <Vignette ref={vignette} offset={0.3} darkness={B.vignette ? 0.5 : 0} eskil={false} />
      {B.grain ? <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.035} /> : <></>}
    </EffectComposer>
  );
}

/** 'full' in photo/close (when allowed), 'subtle' hero DOF at ultra, else 'off'. Re-renders only on change. */
function useDofWanted(allowed: boolean, ultra: boolean): 'off' | 'subtle' | 'full' {
  const ref = useRef<'off' | 'subtle' | 'full'>('off');
  const [, force] = useReducerForce();
  useFrame(() => {
    const want: 'off' | 'subtle' | 'full' = !allowed ? 'off' : cameraFX.dofEnabled ? 'full' : ultra && (cameraFX.mode === 'front' || cameraFX.mode === 'orbit' || cameraFX.mode === 'follow' || cameraFX.mode === 'attract') ? 'subtle' : 'off';
    if (want !== ref.current) {
      ref.current = want;
      force();
    }
  });
  return ref.current;
}

function useReducerForce(): [number, () => void] {
  const [n, f] = useReducer((x: number) => x + 1, 0);
  return [n, f as () => void];
}
