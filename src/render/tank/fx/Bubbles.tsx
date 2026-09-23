/**
 * Equipment bubbles: pooled CPU simulation (typed arrays, zero per-frame allocation) rendered as one Points draw with
 * a shaded bubble sprite (silvery rim, catch-light, clear centre). Bubbles wobble as they rise, speed up with size,
 * and burst at the surface — feeding surface agitation and occasional tiny ripple rings.
 * OWNER: lane "waterfx".
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { TankDims } from '@/sim/tankSpace';
import { UNDERWATER_PARS, addSurfaceRipple, type TankFXUniforms } from '../../shared/underwater';

const noPick = () => null;

export interface BubbleSource {
  x: number;
  y: number;
  z: number;
  /** bubbles / second */
  rate: number;
  /** mean diameter (m) */
  size: number;
  /** spread radius (m) at the emitter */
  spread: number;
  /** initial downward push (waterfall outflow) */
  push?: number;
}

export function Bubbles({ d, fx, sources, max, reducedMotion }: { d: TankDims; fx: TankFXUniforms; sources: BubbleSource[]; max: number; reducedMotion: boolean }) {
  const size = useThree((s) => s.size);
  const sim = useMemo(() => {
    return {
      pos: new Float32Array(max * 3),
      vel: new Float32Array(max * 3),
      sz: new Float32Array(max),
      phase: new Float32Array(max),
      base: new Float32Array(max * 2),
      alive: new Uint8Array(max),
      debt: new Float32Array(Math.max(1, sources.length)),
      head: 0,
      lastRipple: 0,
    };
  }, [max, sources.length]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(sim.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(sim.sz, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, d.waterY / 2, 0), Math.hypot(d.L, d.W, d.waterY));
    g.setDrawRange(0, max);
    return g;
  }, [sim, max, d.L, d.W, d.waterY]);
  useEffect(() => () => geo.dispose(), [geo]);

  const extra = useMemo(() => ({ uPixelScale: { value: 800 } }), []);
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: { ...fx, ...extra },
      vertexShader: /* glsl */ `
        ${UNDERWATER_PARS}
        attribute float aSize;
        uniform float uPixelScale;
        varying float vA; varying vec3 vLight; varying float vFog;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float dist = max(-mv.z, 0.02);
          float px = aSize * uPixelScale / dist;
          vA = aSize > 0.0 ? clamp(px / 1.6, 0.2, 1.0) : 0.0;
          gl_PointSize = aSize > 0.0 ? max(px, 1.6) : 0.0;
          vec3 le = (uTankInv * vec4(uCamPos, 1.0)).xyz;
          vFog = exp(-uFogDensity * agWaterPath(position, le));
          float h = clamp(position.y / max(uWaterBox.y, 0.05), 0.0, 1.0);
          vLight = uLightColor * (0.55 + 0.6 * h) + uWaterTint * 0.25;
          if (uParty > 0.0) vLight = mix(vLight, agHueShift(vLight, uPartyHue), uParty);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA; varying vec3 vLight; varying float vFog;
        void main(){
          vec2 c = (gl_PointCoord - 0.5) * 2.0;
          float r = length(c);
          if (r > 1.0 || vA <= 0.0) discard;
          // spherical bubble: bright fresnel rim, soft inner ring, catch-light up-left, clear centre
          float rim = smoothstep(0.62, 0.97, r) * (1.0 - smoothstep(0.97, 1.0, r));
          float inner = exp(-pow((r - 0.55) / 0.12, 2.0)) * 0.18;
          float spec = exp(-dot(c - vec2(-0.32, 0.38), c - vec2(-0.32, 0.38)) * 38.0) * 1.3;
          float spec2 = exp(-dot(c - vec2(0.3, -0.35), c - vec2(0.3, -0.35)) * 60.0) * 0.25;
          float body = 0.05;
          float a = clamp(rim * 0.85 + inner + spec + spec2 + body, 0.0, 1.0) * vA * mix(0.35, 1.0, vFog);
          vec3 col = vLight * (rim * 0.9 + inner + spec * 1.6 + spec2 + body) * vFog;
          gl_FragColor = vec4(col * vA, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
  }, [fx, extra]);
  useEffect(() => () => mat.dispose(), [mat]);

  const srcRef = useRef(sources);
  srcRef.current = sources;

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const cam = state.camera as THREE.PerspectiveCamera;
    extra.uPixelScale.value = (size.height * state.viewport.dpr) / (2 * Math.tan(((cam.fov ?? 40) * Math.PI) / 360));
    const S = sim;
    const src = srcRef.current;
    const top = d.waterY;
    const t = state.clock.elapsedTime;
    const motion = reducedMotion ? 0.5 : 1;
    // spawn
    for (let e = 0; e < src.length; e++) {
      const s = src[e];
      S.debt[e] += s.rate * dt * motion;
      while (S.debt[e] >= 1) {
        S.debt[e] -= 1;
        const i = S.head;
        S.head = (S.head + 1) % max;
        const ang = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.random()) * s.spread;
        const bx = s.x + Math.cos(ang) * rr;
        const bz = s.z + Math.sin(ang) * rr;
        S.pos[i * 3] = bx;
        S.pos[i * 3 + 1] = s.y;
        S.pos[i * 3 + 2] = bz;
        S.base[i * 2] = bx;
        S.base[i * 2 + 1] = bz;
        const sz = s.size * (0.45 + Math.random() * Math.random() * 1.6);
        S.sz[i] = sz;
        S.vel[i * 3 + 1] = -(s.push ?? 0) * (0.5 + Math.random());
        S.phase[i] = Math.random() * 100;
        S.alive[i] = 1;
      }
    }
    // integrate
    let burstX = 0;
    let burstZ = 0;
    let bursts = 0;
    for (let i = 0; i < max; i++) {
      if (!S.alive[i]) continue;
      const sz = S.sz[i];
      const term = Math.min(0.32, 0.09 + sz * 70); // terminal rise speed (m/s), bigger bubbles rise faster
      const vy = S.vel[i * 3 + 1];
      S.vel[i * 3 + 1] = vy + (term - vy) * Math.min(1, dt * 4);
      const ph = S.phase[i] + dt * (9 + sz * 1500) * motion;
      S.phase[i] = ph;
      const wob = Math.min(0.006, sz * 0.9);
      const y = S.pos[i * 3 + 1] + S.vel[i * 3 + 1] * dt * motion;
      S.pos[i * 3 + 1] = y;
      // slow lateral drift + zig-zag wobble
      S.base[i * 2] += Math.sin(t * 0.3 + i) * 0.002 * dt;
      S.pos[i * 3] = S.base[i * 2] + Math.sin(ph) * wob;
      S.pos[i * 3 + 2] = S.base[i * 2 + 1] + Math.cos(ph * 0.83) * wob;
      if (y >= top - sz * 0.5) {
        S.alive[i] = 0;
        S.sz[i] = 0;
        burstX += S.pos[i * 3];
        burstZ += S.pos[i * 3 + 2];
        bursts++;
      }
    }
    if (bursts > 0 && t - S.lastRipple > 0.45) {
      S.lastRipple = t;
      addSurfaceRipple(fx, burstX / bursts, burstZ / bursts, 0.22, fx.uTime.value);
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  });

  return <points name="bubbles" geometry={geo} material={mat} raycast={noPick} userData={{ noPick: true }} renderOrder={2} frustumCulled={false} />;
}
