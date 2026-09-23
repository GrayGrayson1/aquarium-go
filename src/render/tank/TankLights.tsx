/**
 * Per-tank fixture lighting, day/night + presets. OWNER: lane "waterfx".
 *  - Only the HERO tank (focused, else first) owns real lights: an overhead spot (soft shadows at high/ultra) and a
 *    front spill onto stand/floor. Keeping exactly one fixture light in the scene keeps shader programs stable when
 *    switching tank ↔ facility view and keeps big facilities cheap.
 *  - Every other tank uses an in-shader top-down fill (fx.uFill) + caustics + fog + the floor glow.
 * Every lod gets an additive floor-glow decal so tanks light up dark rooms, and a slim LED fixture bar when no
 * light equipment is installed (the equipment lane draws installed fixtures).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Tank } from '@/types';
import type { RenderLod } from '../lod';
import { standHeight } from '@/sim/tankSpace';
import { getTankTier } from '@/data/catalog/tanks';
import { useQualityBudget } from '../shared/quality';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { useTankFX } from '../shared/underwater';
import { useTankRenderState } from './tankRenderState';
import { hasEquipmentKind, useStableDims } from './TankShell';
import { shellGeom } from './shell/Glass';

const noPick = () => null;
const _c = new THREE.Color();

function floorGlowMaterial() {
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0, 0, 0) } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - vec2(0.5, 0.62)) * vec2(1.0, 1.6);
        float r = length(p);
        float g = exp(-r * r * 7.0) * 0.9 + exp(-r * r * 26.0) * 0.4;
        gl_FragColor = vec4(uColor * g, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return m;
}

export function TankLights({ tank, lod }: { tank: Tank; lod: RenderLod }) {
  const d = useStableDims(tank);
  const tier = getTankTier(tank.tierId);
  const sg = useMemo(() => shellGeom(d, tier), [d, tier]);
  const budget = useQualityBudget();
  const rs = useTankRenderState();
  const fx = useTankFX();
  const spot = useRef<THREE.SpotLight>(null);
  const spill = useRef<THREE.PointLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const glowMat = useMemo(() => floorGlowMaterial(), []);
  useEffect(() => () => glowMat.dispose(), [glowMat]);
  const ledMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: true }), []);
  useEffect(() => () => ledMat.dispose(), [ledMat]);
  const housingMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.35, metalness: 0.8 }), []);
  useEffect(() => () => housingMat.dispose(), [housingMat]);

  const SH = standHeight(tier.id);
  const diag = Math.hypot(d.L, d.W);
  // virtual spot position: high enough for a soft cone to cover the whole footprint
  const spotY = Math.max(d.H + 0.22, d.L * 0.42 + 0.1);
  const angle = Math.min(1.25, Math.atan((diag * 0.5 + 0.04) / (spotY - d.substrateY)) * 1.08);
  const focusedId = useUI((s) => s.focusedTankId);
  const isHero = useGame((s) => {
    const g = s.game;
    if (!g) return false;
    const hero = focusedId && g.tanks[focusedId] ? focusedId : g.tankOrder[0];
    return hero === tank.id;
  });
  const shadows = isHero && budget.shadows;
  const showSpot = isHero;
  const hasFixture = hasEquipmentKind(tank, 'light');
  // spot intensity (candela) scaled by distance² so the tank floor gets similar irradiance at any size
  const baseCd = 2.8 * spotY * spotY;

  useEffect(() => {
    if (spot.current) spot.current.target = target;
  }, [target, showSpot]);

  useFrame(() => {
    // tanks without the real fixture light: in the facility they are exhibits that should glow in a darker room
    fx.uFill.value = showSpot ? 0 : lod === 2 ? 0.85 : 0.7;
    const lamp = rs.lampColor;
    const lvl = Math.max(0, rs.light.level);
    if (spot.current) {
      _c.copy(lamp);
      const m = Math.max(_c.r, _c.g, _c.b, 1e-4);
      spot.current.color.copy(_c).multiplyScalar(1 / m);
      spot.current.intensity = baseCd * m;
    }
    if (spill.current) {
      // light leaving the front glass is tinted by the water
      _c.copy(lamp).multiply(fx.uWaterTint.value).multiplyScalar(2.2).lerp(lamp, 0.45);
      const m = Math.max(_c.r, _c.g, _c.b, 1e-4);
      spill.current.color.copy(_c).multiplyScalar(1 / m);
      spill.current.intensity = 0.22 * m * Math.min(2.5, 0.6 + d.L);
    }
    _c.copy(lamp).multiply(fx.uWaterTint.value).multiplyScalar(1.6).lerp(lamp, 0.35);
    glowMat.uniforms.uColor.value.copy(_c).multiplyScalar(0.06 + 0.05 * Math.min(1, lvl));
    ledMat.color.copy(lamp).multiplyScalar(1.2 + 0.9 * rs.light.day);
  });

  const fixtureW = d.L * 0.92;
  const fy = sg.topY + 0.024;
  return (
    <group>
      <primitive object={target} position={[0, 0, 0]} />
      {showSpot && (
        <spotLight
          ref={spot}
          position={[0, spotY, 0.02 * d.W]}
          angle={angle}
          penumbra={0.85}
          decay={2}
          distance={spotY + 0.35}
          castShadow={shadows}
          shadow-mapSize-width={budget.shadowMap}
          shadow-mapSize-height={budget.shadowMap}
          shadow-bias={-0.0004}
          shadow-normalBias={0.012}
          shadow-radius={2.5}
          shadow-camera-near={Math.max(0.05, spotY - d.H - 0.05)}
          shadow-camera-far={spotY + 0.1}
        />
      )}
      {isHero && <pointLight ref={spill} position={[0, d.H * 0.3, d.W / 2 + 0.45]} decay={2} distance={Math.max(2.2, d.L * 2)} />}
      {/* floor glow in front of the stand */}
      <mesh position={[0, -SH + 0.003, d.W / 2 + 0.25]} rotation={[-Math.PI / 2, 0, 0]} material={glowMat} raycast={noPick} userData={{ noPick: true }} renderOrder={-2}>
        <planeGeometry args={[Math.max(1.2, d.L * 2.2), Math.max(1.0, d.L * 0.9 + 0.6)]} />
      </mesh>
      {!hasFixture && sg.kind !== 'acrylic' && lod < 2 && (
        <group position={[0, fy, -d.W * 0.12]}>
          <mesh material={housingMat} raycast={noPick} userData={{ noPick: true }} castShadow={false}>
            <boxGeometry args={[fixtureW, 0.012, Math.min(0.09, d.W * 0.34)]} />
          </mesh>
          <mesh position={[0, -0.0065, 0]} rotation={[Math.PI / 2, 0, 0]} material={ledMat} raycast={noPick} userData={{ noPick: true }}>
            <planeGeometry args={[fixtureW - 0.01, Math.min(0.07, d.W * 0.26)]} />
          </mesh>
          {/* mounting legs onto the rim */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (fixtureW / 2 - 0.004), -0.012, 0]} material={housingMat} raycast={noPick} userData={{ noPick: true }}>
              <boxGeometry args={[0.008, 0.024, Math.min(0.09, d.W * 0.34)]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

