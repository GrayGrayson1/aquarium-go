/**
 * Volumetric-looking light shafts: camera-facing (cylindrical billboard) cards hanging from the surface along the
 * fixture's light direction, broken into drifting streaks by noise, additive, fogged by the water path, faded near
 * glass/substrate and when seen end-on. One instanced draw call. OWNER: lane "waterfx".
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { TankDims } from '@/sim/tankSpace';
import { UNDERWATER_PARS, type TankFXUniforms } from '../../shared/underwater';
import { GLSL_VALUE_NOISE } from '../../shared/glsl';

const noPick = () => null;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function LightShafts({ d, fx, count, strength, seed }: { d: TankDims; fx: TankFXUniforms; count: number; strength: { value: number }; seed: number }) {
  const geo = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1, 1, 8);
    base.translate(0, -0.5, 0); // y ∈ [-1, 0]: 0 = surface end
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.getAttribute('position'));
    g.setAttribute('uv', base.getAttribute('uv'));
    const a1 = new Float32Array(count * 4);
    const a2 = new Float32Array(count * 2);
    const rnd = mulberry(seed);
    // slant of the light over the water depth
    const L = fx.uLightDir.value;
    const depth = Math.max(0.05, d.waterY - d.substrateY);
    const slantX = (L.x / Math.min(-0.35, L.y)) * -depth;
    const slantZ = (L.z / Math.min(-0.35, L.y)) * -depth;
    for (let i = 0; i < count; i++) {
      const w = Math.min(0.24, 0.05 + rnd() * 0.08 + d.L * 0.03);
      const u = (i + 0.2 + rnd() * 0.6) / count;
      const x = -d.L / 2 + w + u * (d.L - 2 * w) - slantX * 0.5;
      const z = -d.W / 2 + d.W * (0.15 + rnd() * 0.7) - slantZ * 0.5;
      a1.set([x, z, w, rnd() * 10], i * 4);
      a2.set([0.55 + rnd() * 0.6, 0.65 + rnd() * 0.35], i * 2);
    }
    g.setAttribute('aShaft', new THREE.InstancedBufferAttribute(a1, 4));
    g.setAttribute('aShaft2', new THREE.InstancedBufferAttribute(a2, 2));
    g.instanceCount = count;
    base.dispose();
    return g;
  }, [d.L, d.W, d.waterY, d.substrateY, count, seed, fx]);
  useEffect(() => () => geo.dispose(), [geo]);

  const mat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...fx, uStrength: strength, uSubstrateY: { value: d.substrateY } },
      vertexShader: /* glsl */ `
        ${UNDERWATER_PARS}
        ${GLSL_VALUE_NOISE}
        attribute vec4 aShaft; attribute vec2 aShaft2;
        uniform float uSubstrateY;
        varying vec2 vUv; varying vec3 vLocal; varying float vPhase; varying float vInt; varying float vView;
        void main(){
          vec3 L = agLightDirSafe();
          vec3 s = vec3(aShaft.x, uWaterBox.y, aShaft.y);
          float len = (uWaterBox.y - uSubstrateY) / -L.y * aShaft2.y;
          float t = -position.y;
          vec3 p = s + L * t * len;
          vec3 camL = (uTankInv * vec4(uCamPos, 1.0)).xyz;
          vec3 toCam = normalize(camL - p);
          vec3 right = cross(L, toCam);
          float rl = length(right);
          right = rl > 1e-4 ? right / rl : vec3(1.0, 0.0, 0.0);
          // slightly wider deeper down (light spreads)
          p += right * position.x * aShaft.z * (1.0 + t * 0.6);
          vView = smoothstep(0.08, 0.5, rl);
          vUv = vec2(position.x, t);
          vLocal = p;
          vPhase = aShaft.w;
          // whole shafts breathe in and out as surface ripples focus / defocus the beam (per shaft: vertex stage)
          vInt = aShaft2.x * smoothstep(0.15, 0.7, agVNoise(vec2(aShaft.w * 3.1, uTime * 0.07)));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        ${UNDERWATER_PARS}
        ${GLSL_VALUE_NOISE}
        uniform float uStrength; uniform float uSubstrateY;
        varying vec2 vUv; varying vec3 vLocal; varying float vPhase; varying float vInt; varying float vView;
        void main(){
          float across = vUv.x;
          float soft = smoothstep(0.5, 0.08, abs(across));
          float vert = smoothstep(0.0, 0.06, vUv.y) * pow(1.0 - clamp(vUv.y, 0.0, 1.0), 2.0);
          // fade at glass walls and toward the substrate
          float edge = smoothstep(0.0, 0.03, uWaterBox.x - abs(vLocal.x)) * smoothstep(0.0, 0.03, uWaterBox.z - abs(vLocal.z));
          edge *= smoothstep(uSubstrateY, uSubstrateY + 0.05, vLocal.y);
          float env = soft * vert * vView * edge * vInt * uStrength * max(uDay, 0.12);
          // most of each card is faint: skip the noise and water-path work there
          if (env < 0.0015) discard;
          float tt = uTime;
          float s1 = agVNoise(vec2(across * 6.0 + vPhase + tt * 0.05, tt * 0.09 + vPhase));
          float s2 = agVNoise(vec2(across * 15.0 - vPhase * 2.0 - tt * 0.03, tt * 0.16 + vUv.y * 0.9));
          float s3 = agVNoise(vec2(across * 34.0 + vPhase * 3.0, tt * 0.3 + vUv.y * 2.5));
          float streak = pow(clamp(s1 * 0.6 + s2 * 0.28 + s3 * 0.12, 0.0, 1.0), 3.2) * 2.4;
          float flick = 0.75 + 0.25 * sin(tt * 1.1 + vPhase * 6.0 - vUv.y * 4.0);
          float a = env * streak * flick;
          vec3 le = (uTankInv * vec4(uCamPos, 1.0)).xyz;
          float fogT = exp(-uFogDensity * agWaterPath(vLocal, le) * 0.8);
          vec3 tint = mix(vec3(1.0), uWaterTint / max(dot(uWaterTint, vec3(0.3333)), 0.05), 0.3);
          vec3 col = uLightColor * tint * a * fogT;
          if (uParty > 0.0) col = mix(col, agHueShift(col, uPartyHue + vPhase * 0.1) * 1.3, uParty);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      // additive cards: no need for three's back-then-front double pass
      forceSinglePass: true,
    });
    return m;
  }, [fx, strength, d.substrateY]);
  useEffect(() => () => mat.dispose(), [mat]);

  return <mesh name="light-shafts" geometry={geo} material={mat} frustumCulled={false} raycast={noPick} userData={{ noPick: true }} renderOrder={1} />;
}
