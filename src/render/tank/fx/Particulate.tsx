/**
 * Floating particulate: GPU-advected soft specks (no per-frame CPU work) that drift with the flow, wrap inside the
 * water box, catch the light near the surface and grow into soft bokeh discs away from the DOF focus distance.
 * OWNER: lane "waterfx".
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { TankDims } from '@/sim/tankSpace';
import { UNDERWATER_PARS, type TankFXUniforms } from '../../shared/underwater';
import { cameraFX } from '../../camera/cameraFX';
import { useParkedMaterial } from '../../shared/programPark';

const noPick = () => null;

export function Particulate({ d, fx, count, flow, seed }: { d: TankDims; fx: TankFXUniforms; count: number; flow: THREE.Vector3; seed: number }) {
  const size = useThree((s) => s.size);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    let a = (seed * 2654435761) >>> 0 || 1;
    const rnd = () => {
      a ^= a << 13;
      a ^= a >>> 17;
      a ^= a << 5;
      return (a >>> 0) / 4294967296;
    };
    for (let i = 0; i < count * 4; i++) seeds[i] = rnd();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, d.waterY / 2, 0), Math.hypot(d.L, d.W, d.waterY));
    return g;
  }, [count, seed, d.L, d.W, d.waterY]);
  useEffect(() => () => geo.dispose(), [geo]);

  // uniforms are created once and updated in place: recreating them (e.g. when the flow vector's identity changes)
  // would rebuild the material and recompile its program mid-game
  const extra = useMemo(
    () => ({
      uPixelScale: { value: 800 },
      uFlow: { value: new THREE.Vector3() },
      uSubstrateY: { value: 0 },
      uFocusDist: { value: 0 },
      uDof: { value: 0 },
    }),
    [],
  );
  extra.uFlow.value.copy(flow);
  extra.uSubstrateY.value = d.substrateY;
  const mat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...fx, ...extra },
      vertexShader: /* glsl */ `
        ${UNDERWATER_PARS}
        attribute vec4 aSeed;
        uniform float uPixelScale; uniform vec3 uFlow; uniform float uSubstrateY; uniform float uFocusDist; uniform float uDof;
        varying float vA; varying vec3 vCol;
        void main(){
          vec3 box = uWaterBox;
          float lo = uSubstrateY + 0.004;
          float hy = max(box.y - lo - 0.004, 0.01);
          float t = uTime;
          vec3 p = vec3((aSeed.x - 0.5) * 2.0 * box.x, aSeed.y * hy, (aSeed.z - 0.5) * 2.0 * box.z);
          float w = aSeed.w;
          p += uFlow * t * (0.6 + 0.8 * w);
          p += vec3(0.0035 * sin(t * 0.07 + w * 6.28), -0.0012 * t * (0.2 + w), 0.0028 * cos(t * 0.05 + aSeed.y * 6.28));
          p += 0.005 * vec3(sin(t * 0.6 + w * 40.0), sin(t * 0.45 + aSeed.x * 33.0), cos(t * 0.52 + aSeed.z * 27.0));
          p.x = mod(p.x + box.x, 2.0 * box.x) - box.x;
          p.z = mod(p.z + box.z, 2.0 * box.z) - box.z;
          p.y = lo + mod(p.y, hy);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float dist = max(-mv.z, 0.02);
          float sizeM = mix(0.00035, 0.0011, w * w * w);
          float px = sizeM * uPixelScale / dist;
          // depth-of-field: out-of-focus specks grow into faint discs
          float coc = uDof > 0.0 && uFocusDist > 0.0 ? uDof * abs(dist - uFocusDist) / dist * uPixelScale * 0.0045 : 0.0;
          float s = max(px, 1.25) + coc;
          vA = clamp(px / 1.25, 0.25, 1.0) * clamp((1.25 * 1.25) / (s * s) * 2.0, 0.04, 1.0);
          // light: brighter near the surface where the beam is strongest; faint twinkle
          vec3 le = (uTankInv * vec4(uCamPos, 1.0)).xyz;
          float h = clamp((p.y - lo) / hy, 0.0, 1.0);
          float fogT = exp(-uFogDensity * agWaterPath(p, le));
          float tw = 0.75 + 0.25 * sin(t * (1.0 + w * 2.0) + aSeed.x * 50.0);
          vCol = (uLightColor * (0.35 + 0.9 * h * h) * tw + uWaterTint * 0.15) * fogT;
          if (uParty > 0.0) vCol = mix(vCol, agHueShift(vCol, uPartyHue + w) * 1.5, uParty);
          gl_PointSize = s;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA; varying vec3 vCol;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float r2 = dot(c, c) * 4.0;
          float a = exp(-r2 * 3.5) * vA;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vCol * a * 0.55, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return m;
  }, [fx, extra]);
  useParkedMaterial(mat);

  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const fov = cam.isPerspectiveCamera ? cam.fov : 40;
    extra.uPixelScale.value = (size.height * state.viewport.dpr) / (2 * Math.tan((fov * Math.PI) / 360));
    extra.uFocusDist.value = cameraFX.dofEnabled ? cameraFX.focusDistance : 0;
    extra.uDof.value = cameraFX.dofEnabled ? cameraFX.bokehScale : 0;
  });

  return <points name="particulate" geometry={geo} material={mat} raycast={noPick} userData={{ noPick: true }} renderOrder={1} />;
}
