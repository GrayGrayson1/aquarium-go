/**
 * Prismatic look (lane:genetics): an ultra-rare individual's rainbow sheen, scale twinkles and a few drifting star
 * glints. OWNER: lane "fishart" / "critterart".
 *
 * Purely cosmetic and driven by the creature's stored `rareVariant.visualSeed` and the tank clock (`fx.uTime`) —
 * never by the simulation RNG, so rendering can never change (or reroll) anything. The sheen lives in the existing
 * fish / critter shaders as uniforms (fish: uLookH.yzw, critters: uAgcRare), so all fish keep sharing one program.
 * Motion is slow (≥2 s cycles, soft fades — no strobing) and stops under reduced motion.
 */
import * as THREE from 'three';
import type { Creature } from '@/types';
import type { TankFXUniforms } from '../../shared/underwater';
import { UNDERWATER_PARS } from '../../shared/underwater';
import { acquireTexture, releaseTexture, starSprite } from '../../facility/textures';
import { visualRng } from '@/sim/rng';
import type { CreatureObject } from '../types';

export interface PrismaticLook {
  /** 0..1 effect strength. */
  strength: number;
  /** 0..1 hue offset of the rainbow band (per individual). */
  hue: number;
  /** Twinkle cell offset (per individual). */
  twinkle: number;
  seed: number;
}

const frac = (x: number) => x - Math.floor(x);

/** The Prismatic look of a creature, or null for an ordinary one (validates the saved state). */
export function prismaticOf(c: Pick<Creature, 'rareVariant'> | null | undefined): PrismaticLook | null {
  const rv = c?.rareVariant;
  if (!rv || rv.kind !== 'prismatic') return null;
  const seed = Number.isFinite(rv.visualSeed) ? rv.visualSeed >>> 0 : 1;
  return { strength: 1, hue: frac(seed * 0.000123457 + 0.31), twinkle: (seed % 977) + 0.5, seed };
}

/** Cache-key suffix: a creature that turns Prismatic (dev tools) rebuilds its visual and portrait. */
export function prismaticSig(c: Pick<Creature, 'rareVariant'> | null | undefined): string {
  const p = prismaticOf(c);
  return p ? `|p${p.seed}` : '';
}

/**
 * Shared GLSL: hue (0..1) → saturated RGB (the sheen, so the animal's own colour stays rich underneath), a pastel
 * variant (the star glints), a hash for twinkle cells, and the travelling band: a soft bright stripe of rainbow that
 * sweeps along the body every few seconds.
 */
export const GLSL_PRISM_HUE = /* glsl */ `
vec3 agPrismSat(float h){ return clamp(abs(fract(h + vec3(0.0, 0.3333, 0.6667)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
vec3 agPrismHue(float h){ return mix(vec3(1.0), agPrismSat(h), 0.72); }
float agPrismHash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float agPrismSweep(float along, float t, float seed){ return pow(0.5 + 0.5 * cos((along * 1.6 - t * 0.22 + seed) * 6.2831), 8.0); }
`;

// ───────────────────────────── glints (hero tank only) ─────────────────────────────

const GLINTS = 10;
const SPRITE_KEY = 'sprite:star';

export interface PrismaticGlints {
  points: THREE.Points;
  dispose(): void;
}

/**
 * A handful of star glints around the body (creature-local space: head +X, body length 1), fading in and out over
 * ~3 s each with a slow hue drift. One draw call; fogged like the rest of the tank.
 */
export function createPrismaticGlints(fx: TankFXUniforms, seed: number, still: boolean): PrismaticGlints {
  const r = visualRng(seed ^ 0x51ed27);
  const pos = new Float32Array(GLINTS * 3);
  const phase = new Float32Array(GLINTS);
  const size = new Float32Array(GLINTS);
  for (let i = 0; i < GLINTS; i++) {
    pos[i * 3] = (r.next() - 0.5) * 1.05;
    pos[i * 3 + 1] = (r.next() - 0.42) * 0.42;
    pos[i * 3 + 2] = (r.next() - 0.5) * 0.34;
    phase[i] = r.next();
    size[i] = 0.07 + r.next() * 0.07;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.8);
  const map = acquireTexture(SPRITE_KEY, starSprite, { repeat: false });
  const mat = new THREE.ShaderMaterial({
    // tank FX by reference (per-frame updates propagate), plus our own
    uniforms: { ...fx, uMap: { value: map }, uScale: { value: 900 }, uStill: { value: still ? 1 : 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uScale; uniform float uStill;
      uniform mat4 uTankInv; uniform vec3 uCamPos;
      attribute float aPhase; attribute float aSize;
      varying float vA; varying float vHue; varying vec3 vLocal; varying vec3 vEye;
      void main(){
        float life = uStill > 0.5 ? 0.3 : fract(uTime * 0.33 + aPhase);
        vA = smoothstep(0.0, 0.16, life) * (1.0 - smoothstep(0.32, 0.6, life));
        if (uStill > 0.5) vA = 0.55 * step(0.5, aPhase);
        vHue = fract(aPhase * 5.3 + uTime * 0.03 * (1.0 - uStill));
        vec3 p = position + vec3(0.0, life * 0.05, 0.0);
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vLocal = (uTankInv * wp).xyz;
        vEye = (uTankInv * vec4(uCamPos, 1.0)).xyz;
        vec4 mv = viewMatrix * wp;
        gl_Position = projectionMatrix * mv;
        float s = length(modelMatrix[0].xyz);
        gl_PointSize = clamp(aSize * s * uScale / max(0.05, -mv.z), 0.0, 64.0) * step(0.01, vA);
      }`,
    fragmentShader: /* glsl */ `
      ${UNDERWATER_PARS}
      ${GLSL_PRISM_HUE}
      uniform sampler2D uMap;
      varying float vA; varying float vHue; varying vec3 vLocal; varying vec3 vEye;
      void main(){
        vec4 t = texture2D(uMap, gl_PointCoord);
        float fog = exp(-agWaterPath(vLocal, vEye) * max(uFogDensity, 0.0));
        gl_FragColor = vec4(t.rgb * agPrismHue(vHue) * 1.5, t.a * vA * fog);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'prismatic-glints';
  points.raycast = () => {};
  points.renderOrder = 3;
  const size2 = new THREE.Vector2();
  points.onBeforeRender = (renderer, _scene, camera) => {
    const cam = camera as THREE.PerspectiveCamera;
    const fov = ((cam.getEffectiveFOV?.() ?? cam.fov) || 38) * (Math.PI / 180);
    renderer.getDrawingBufferSize(size2);
    mat.uniforms.uScale.value = size2.y / (2 * Math.tan(fov / 2));
  };
  return {
    points,
    dispose() {
      geo.dispose();
      mat.dispose();
      releaseTexture(SPRITE_KEY);
    },
  };
}

/** Attach glints to a built creature visual; its dispose() takes them with it. */
export function attachPrismaticGlints(obj: CreatureObject, fx: TankFXUniforms, seed: number, still: boolean): CreatureObject {
  const glints = createPrismaticGlints(fx, seed, still);
  obj.root.add(glints.points);
  const inner = obj.dispose;
  obj.dispose = () => {
    obj.root.remove(glints.points);
    glints.dispose();
    inner.call(obj);
  };
  return obj;
}
