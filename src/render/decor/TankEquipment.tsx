/**
 * Visible equipment props: light fixture, filters (sponge/HOB/canister/sump), heater, chiller, fan, airstone,
 * powerheads, skimmer, refugium, UV, ATO, autofeeder, CO₂ diffuser. Tasteful, dark, tucked into back corners.
 * Positions come from `equipmentLayout` (emitters.ts) so bubbles/flow leave the real props. OWNER: lane "aquascape".
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Tank } from '@/types';
import type { RenderLod } from '../lod';
import { tankDims } from '@/sim/tankSpace';
import { useTankFX, patchUnderwaterMaterial, type TankFXUniforms } from '../shared/underwater';
import { getGame } from '@/state/game';
import { isLitAt } from '@/sim/aquascape/growth';
import { equipmentLayout, type EquipmentPlacement } from './emitters';
import { GeoBuilder, lathe as latheB } from './gen/builder';
import { hex, mix } from './gen/noise';
import { makeDecorMaterial, createTankUniforms } from './materials';
import { useStaticMerge } from '../shared/staticMerge'; // lane:perf2

type Mats = ReturnType<typeof makeEquipMaterials>;

function makeEquipMaterials(fx: TankFXUniforms) {
  // lane:perf2 — the underwater patch is world-space only, so these may be merged in room-view tanks (shared/staticMerge.ts)
  const p = <T extends THREE.Material>(m: T): T => {
    patchUnderwaterMaterial(m, fx);
    m.userData.mergeSafe = true;
    return m;
  };
  const ledTex = makeLedTexture();
  const grille = makeGrilleTexture();
  return {
    black: p(new THREE.MeshStandardMaterial({ color: '#141618', roughness: 0.42, metalness: 0.05 })),
    charcoal: p(new THREE.MeshStandardMaterial({ color: '#2a2e31', roughness: 0.55, metalness: 0.05 })),
    alu: p(new THREE.MeshStandardMaterial({ color: '#23272b', roughness: 0.32, metalness: 0.75 })),
    white: p(new THREE.MeshStandardMaterial({ color: '#e4e6e3', roughness: 0.38, metalness: 0.02 })),
    glass: p(new THREE.MeshStandardMaterial({ color: '#cfe8e4', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false })),
    clearTube: p(new THREE.MeshStandardMaterial({ color: '#dfeee9', roughness: 0.1, metalness: 0, transparent: true, opacity: 0.35, depthWrite: false })),
    suction: p(new THREE.MeshStandardMaterial({ color: '#d8e4e0', roughness: 0.2, transparent: true, opacity: 0.45, depthWrite: false })),
    coil: p(new THREE.MeshStandardMaterial({ color: '#5a3a2a', roughness: 0.5, metalness: 0.3 })),
    ceramic: p(new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.85 })),
    led: new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveIntensity: 1.5, emissiveMap: ledTex, roughness: 0.6 }),
    indicator: new THREE.MeshStandardMaterial({ color: '#200800', emissive: '#ff6a1a', emissiveIntensity: 2.2 }),
    greenLed: new THREE.MeshStandardMaterial({ color: '#001a08', emissive: '#40ff80', emissiveIntensity: 1.6 }),
    blueGlow: new THREE.MeshStandardMaterial({ color: '#000818', emissive: '#4a78ff', emissiveIntensity: 1.4 }),
    grilleMat: p(new THREE.MeshStandardMaterial({ color: '#cfd2d0', roughness: 0.5, map: grille })),
    chaeto: p(new THREE.MeshStandardMaterial({ color: '#4f8a2a', roughness: 0.8 })),
    skimmate: p(new THREE.MeshStandardMaterial({ color: '#5a4020', roughness: 0.6, transparent: true, opacity: 0.8 })),
    textures: [ledTex, grille],
  };
}

function makeLedTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1a1a1a';
  g.fillRect(0, 0, 256, 32);
  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 2; j++) {
      const x = 4 + i * 8;
      const y = 9 + j * 14;
      const grad = g.createRadialGradient(x, y, 0, x, y, 4);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#dddddd');
      grad.addColorStop(1, 'rgba(40,40,40,1)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, 3.2, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function makeGrilleTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d0d3d1';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#3a3d3f';
  for (let i = 0; i < 8; i++) g.fillRect(6, 4 + i * 7.5, 52, 3.2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const LIGHT_COLOR: Record<string, string> = {
  daylight: '#f4f8ff',
  warm: '#ffe2b8',
  planted: '#fff0dc',
  reef_actinic: '#6f86ff',
  reef_full: '#cfdcff',
  moonlight: '#5a74ff',
  sunset: '#ffb07a',
  cool: '#e2eeff',
};

// ───────────────────────────── geometry helpers ─────────────────────────────

function useGeo<T extends THREE.BufferGeometry>(make: () => T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(make, deps);
  useEffect(() => () => g.dispose(), [g]);
  return g;
}

function tubeAlong(points: [number, number, number][], r: number, segs = 24, radial = 8): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2);
  return new THREE.TubeGeometry(curve, segs, r, radial, false);
}

// ───────────────────────────── props ─────────────────────────────

function LightBar({ p, tank, mats, lod }: { p: EquipmentPlacement; tank: Tank; mats: Mats; lod: RenderLod }) {
  const d = tankDims(tank);
  const len = p.size;
  const width = Math.min(0.11, Math.max(0.06, d.W * 0.3));
  const reef = p.eq.defId.includes('reef');
  const body = useGeo(() => new RoundedBoxGeometry(len, 0.014, width, 3, 0.005), [len, width]);
  const panel = useGeo(() => {
    const g = new THREE.PlaneGeometry(len * 0.96, width * 0.7);
    g.rotateX(Math.PI / 2);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * Math.max(1, Math.round(len / 0.12)));
    return g;
  }, [len, width]);
  const legH = p.pos[1] - d.H + 0.004;
  const leg = useGeo(() => new RoundedBoxGeometry(0.012, legH + 0.012, width * 0.55, 2, 0.003), [legH, width]);
  const foot = useGeo(() => new RoundedBoxGeometry(0.03, 0.006, width * 0.6, 2, 0.002), [width]);
  const ledMat = useMemo(() => mats.led.clone(), [mats]);
  useEffect(() => () => ledMat.dispose(), [ledMat]);
  const eqOn = p.running;
  const intensity = tank.lighting.intensity;
  const preset = tank.lighting.preset;
  const moon = tank.lighting.moonlight;
  useFrame(() => {
    const g = getGame();
    const lit = g ? isLitAt(tank, g.clock.hour) : true;
    const col = LIGHT_COLOR[reef && preset !== 'reef_actinic' ? 'reef_full' : preset] ?? '#ffffff';
    if (eqOn && lit) {
      ledMat.emissive.set(col);
      ledMat.emissiveIntensity = 1.4 + 1.6 * intensity;
    } else if (eqOn && moon) {
      ledMat.emissive.set('#3048ff');
      ledMat.emissiveIntensity = 0.35;
    } else {
      ledMat.emissive.set('#000000');
      ledMat.emissiveIntensity = 0;
    }
  });
  const first = p.n === 0;
  const last = p.n === p.of - 1;
  return (
    <group position={p.pos}>
      <mesh geometry={body} material={mats.alu} castShadow />
      <mesh geometry={panel} material={ledMat} position={[0, -0.0072, 0]} />
      {lod < 2 && (
        <>
          {first && (
            <group position={[-len / 2 - (d.L / 2 - Math.abs(p.pos[0] - len / 2) > 0.02 ? 0 : 0) + 0.004, -legH / 2, 0]}>
              <mesh geometry={leg} material={mats.alu} />
              <mesh geometry={foot} material={mats.black} position={[0, -legH / 2 - 0.004, 0]} />
            </group>
          )}
          {last && (
            <group position={[len / 2 - 0.004, -legH / 2, 0]}>
              <mesh geometry={leg} material={mats.alu} />
              <mesh geometry={foot} material={mats.black} position={[0, -legH / 2 - 0.004, 0]} />
            </group>
          )}
        </>
      )}
    </group>
  );
}

function SpongeFilter({ p, tank, mats, lod, solid }: { p: EquipmentPlacement; tank: Tank; mats: Mats; lod: RenderLod; solid: THREE.Material }) {
  const d = tankDims(tank);
  const s = p.size;
  const R = 0.034 * s;
  const H = 0.085 * s;
  const tubeTop = Math.min(d.waterY - 0.012, p.pos[1] + H + 0.12) - p.pos[1];
  const sponge = useGeo(() => {
    const b = new GeoBuilder();
    const c0 = hex('#26292b');
    const c1 = hex('#3a3e40');
    latheB(b, [[0, 0.012], [R * 0.96, 0.012], [R, 0.02], [R, H - 0.008], [R * 0.96, H], [0, H]], lod === 0 ? 32 : 12, (t, a) => mix(c0, c1, 0.5 + 0.5 * Math.sin(a * 13 + t * 20)), [0, 1.2, 0.1, 3.2]);
    return b.toGeometry();
  }, [R, H, lod]);
  const base = useGeo(() => new THREE.CylinderGeometry(R * 1.12, R * 1.18, 0.012, 28), [R]);
  const cap = useGeo(() => new THREE.CylinderGeometry(R * 0.72, R * 0.8, 0.01, 24), [R]);
  const uplift = useGeo(() => new THREE.CylinderGeometry(0.0085, 0.0085, tubeTop - H, 16, 1, true), [tubeTop, H]);
  const elbow = useGeo(() => tubeAlong([[0, 0, 0], [0, 0.012, 0], [0, 0.018, 0.012]], 0.0085, 8, 12), []);
  const airline = useGeo(() => tubeAlong([[0.006, tubeTop - 0.02, -0.006], [0.01, tubeTop + 0.01, -0.03], [0.012, d.H - p.pos[1] + 0.01, -0.048], [0.02, d.H - p.pos[1] + 0.03, -0.07]], 0.0022, 16, 6), [tubeTop]);
  return (
    <group position={p.pos}>
      <mesh geometry={base} material={mats.black} position={[0, 0.006, 0]} />
      <mesh geometry={sponge} material={solid} castShadow />
      <mesh geometry={cap} material={mats.black} position={[0, H + 0.005, 0]} />
      <mesh geometry={uplift} material={mats.clearTube} position={[0, H + (tubeTop - H) / 2, 0]} />
      <mesh geometry={elbow} material={mats.clearTube} position={[0, tubeTop, 0]} />
      {lod === 0 && <mesh geometry={airline} material={mats.clearTube} />}
    </group>
  );
}

/** lane:qa-visual — intake offset from the hang-on box; equals the AI collider/hitch offset (ai/registry.ts). */
const HOB_INTAKE_DX = 0.03;

function HobFilter({ p, tank, mats, lod }: { p: EquipmentPlacement; tank: Tank; mats: Mats; lod: RenderLod }) {
  const d = tankDims(tank);
  const s = p.size;
  const bw = 0.12 * s;
  const bd = 0.075 * s;
  const bh = 0.15 * s;
  const glass = d.glass;
  const body = useGeo(() => new RoundedBoxGeometry(bw, bh, bd, 3, 0.008), [bw, bh, bd]);
  const lid = useGeo(() => new RoundedBoxGeometry(bw * 1.02, 0.012, bd * 1.05, 2, 0.004), [bw, bd]);
  const lip = useGeo(() => new RoundedBoxGeometry(bw * 0.78, 0.004, 0.04, 2, 0.0015), [bw]);
  const intakeLen = d.H - d.waterY * 0.42;
  const intake = useGeo(() => new THREE.CylinderGeometry(0.0075, 0.0075, intakeLen, 14), [intakeLen]);
  const strainer = useGeo(() => new THREE.CylinderGeometry(0.011, 0.011, 0.06, 16), []);
  const bend = useGeo(() => tubeAlong([[0, 0, 0], [0, 0.03, 0], [0, 0.04, -0.02], [0, 0.03, -0.045]], 0.0075, 12, 10), []);
  const fall = useWaterfall(bw * 0.72, d.H - d.waterY + 0.004);
  const topY = d.H + 0.02;
  const bodyZ = -d.W / 2 - glass - bd / 2 - 0.004;
  return (
    <group position={[p.pos[0], 0, 0]}>
      <mesh geometry={body} material={mats.charcoal} position={[0, topY - bh / 2, bodyZ]} castShadow />
      <mesh geometry={lid} material={mats.black} position={[0, topY + 0.004, bodyZ]} />
      <mesh geometry={lip} material={mats.black} position={[0.01, d.waterY + 0.014, -d.W / 2 + 0.008]} />
      <mesh geometry={intake} material={mats.black} position={[-HOB_INTAKE_DX, d.waterY * 0.42 + intakeLen / 2, -d.W / 2 + 0.022]} />
      {lod < 2 && <mesh geometry={strainer} material={mats.charcoal} position={[-HOB_INTAKE_DX, d.waterY * 0.42, -d.W / 2 + 0.022]} />}
      {lod < 2 && <mesh geometry={bend} material={mats.black} position={[-HOB_INTAKE_DX, d.H, -d.W / 2 + 0.022]} />}
      {p.running && <mesh geometry={fall.geo} material={fall.mat} position={[0.01, d.waterY - 0.004, -d.W / 2 + 0.026]} />}
    </group>
  );
}

/** Thin animated sheet of water spilling from the HOB lip. */
function useWaterfall(width: number, drop: number) {
  const fx = useTankFX();
  const geo = useGeo(() => {
    const g = new THREE.PlaneGeometry(width, drop + 0.012, 1, 6);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / (drop + 0.012) + 0.5; // 0 bottom .. 1 top
      pos.setZ(i, (1 - y) * (1 - y) * 0.02);
    }
    g.translate(0, (drop + 0.012) / 2, 0);
    return g;
  }, [width, drop]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { uTime: fx.uTime },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; varying vec2 vUv;
          float h(float x){ return fract(sin(x * 91.7) * 43758.5); }
          void main(){
            float col = floor(vUv.x * 40.0);
            float streak = 0.55 + 0.45 * sin((vUv.y * 9.0 + uTime * 3.2 + h(col) * 6.0) * 3.0);
            float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
            float a = (0.18 + 0.22 * streak) * edge * (0.6 + 0.4 * vUv.y);
            gl_FragColor = vec4(vec3(0.86, 0.95, 1.0), a);
          }`,
      }),
    [fx],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return { geo, mat };
}

function Heater({ p, tank, mats, lod }: { p: EquipmentPlacement; tank: Tank; mats: Mats; lod: RenderLod }) {
  const d = tankDims(tank);
  const L = p.size;
  const glassTube = useGeo(() => new THREE.CapsuleGeometry(0.011, L - 0.022, 6, 18), [L]);
  const element = useGeo(() => new THREE.CylinderGeometry(0.0055, 0.0055, L * 0.72, 10), [L]);
  const cap = useGeo(() => new RoundedBoxGeometry(0.026, 0.03, 0.026, 3, 0.006), []);
  const cup = useGeo(() => new THREE.CylinderGeometry(0.009, 0.004, 0.006, 16), []);
  const led = useGeo(() => new THREE.SphereGeometry(0.0022, 10, 8), []);
  const cable = useGeo(() => tubeAlong([[0, L / 2 + 0.015, 0], [0.004, L / 2 + 0.05, -0.006], [0.01, d.H - p.pos[1] + 0.012, -0.014], [0.012, d.H - p.pos[1] + 0.02, -0.04]], 0.0022, 14, 6), [L]);
  const heating = p.running && tank.water.tempC < (p.eq.setting ?? 25) - 0.05;
  return (
    <group position={p.pos} rotation={[0, 0, 0.16]}>
      <mesh geometry={glassTube} material={mats.glass} />
      <mesh geometry={element} material={mats.coil} position={[0, -L * 0.06, 0]} />
      <mesh geometry={cap} material={mats.black} position={[0, L / 2 + 0.004, 0]} />
      <mesh geometry={led} material={heating ? mats.indicator : p.running ? mats.greenLed : mats.charcoal} position={[0, L / 2 + 0.012, 0.012]} />
      {lod === 0 && (
        <>
          <mesh geometry={cup} material={mats.suction} position={[0, L * 0.3, -0.013]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={cup} material={mats.suction} position={[0, -L * 0.3, -0.013]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={cable} material={mats.black} />
        </>
      )}
    </group>
  );
}

function Chiller({ p, tank, mats }: { p: EquipmentPlacement; tank: Tank; mats: Mats }) {
  const d = tankDims(tank);
  const body = useGeo(() => new RoundedBoxGeometry(0.22, 0.3, 0.28, 4, 0.02), []);
  const grille = useGeo(() => new THREE.PlaneGeometry(0.16, 0.14), []);
  const disp = useGeo(() => new THREE.PlaneGeometry(0.05, 0.02), []);
  const floorY = p.pos[1];
  const hose = useGeo(() => tubeAlong([[0, 0.3, -0.08], [0, 0.4, -0.12], [-0.2, d.H - floorY + 0.05, -0.15], [-0.3, d.H - floorY + 0.03, -0.02]], 0.008, 24, 8), [d.H, floorY]);
  return (
    <group position={[p.pos[0], floorY, p.pos[2]]}>
      <mesh geometry={body} material={mats.white} position={[0, 0.15, 0]} castShadow receiveShadow />
      <mesh geometry={grille} material={mats.grilleMat} position={[0, 0.13, 0.1405]} />
      <mesh geometry={disp} material={p.running ? mats.blueGlow : mats.charcoal} position={[0, 0.25, 0.1405]} />
      <mesh geometry={hose} material={mats.black} />
    </group>
  );
}

function Airstone({ p, mats, solid, tank, lod }: { p: EquipmentPlacement; mats: Mats; solid: THREE.Material; tank: Tank; lod: RenderLod }) {
  const d = tankDims(tank);
  const stone = useGeo(() => {
    const b = new GeoBuilder();
    const c = hex('#5a6a7a');
    latheB(b, [[0, 0], [0.012, 0.001], [0.013, 0.012], [0.011, 0.018], [0, 0.019]], 20, (t, a) => mix(c, hex('#8a9aaa'), 0.5 + 0.5 * Math.sin(a * 17 + t * 9)), [0, 1.2, 0.2, 2.5]);
    return b.toGeometry();
  }, []);
  const line = useGeo(() => tubeAlong([[0, 0.02, 0], [0, 0.03, -0.02], [0, 0.06, -0.031], [0.004, d.H - p.pos[1] + 0.01, -0.031], [0.01, d.H - p.pos[1] + 0.025, -0.05]], 0.0021, 20, 6), [d.H]);
  return (
    <group position={p.pos}>
      <mesh geometry={stone} material={solid} />
      {lod === 0 && <mesh geometry={line} material={mats.clearTube} />}
    </group>
  );
}

function Powerhead({ p, mats, lod, wave }: { p: EquipmentPlacement; mats: Mats; lod: RenderLod; wave?: boolean }) {
  const s = p.size;
  const body = useGeo(() => (wave ? new THREE.CylinderGeometry(0.03 * s, 0.032 * s, 0.04 * s, 28) : new RoundedBoxGeometry(0.05 * s, 0.042 * s, 0.036 * s, 3, 0.008)), [s, wave]);
  const cage = useGeo(() => new THREE.CylinderGeometry(0.018 * s, 0.018 * s, 0.028 * s, 16, 1, true), [s]);
  const nozzle = useGeo(() => new THREE.CylinderGeometry(0.008 * s, 0.013 * s, 0.022 * s, 16), [s]);
  const mount = useGeo(() => new RoundedBoxGeometry(0.03 * s, 0.03 * s, 0.008, 2, 0.003), [s]);
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (blades.current && p.running) blades.current.rotation.x += dt * 30;
  });
  return (
    <group position={p.pos} rotation={[0, p.rotY, 0]}>
      <mesh geometry={mount} material={mats.black} position={[0, 0, -0.018 * s]} />
      {wave ? (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh geometry={body} material={mats.black} />
          <group ref={blades} userData={{ mergeSkip: true }}>
            <mesh geometry={cage} material={mats.charcoal} position={[0, 0.03 * s, 0]} />
          </group>
        </group>
      ) : (
        <>
          <mesh geometry={body} material={mats.black} />
          {lod < 2 && <mesh geometry={cage} material={mats.charcoal} position={[-0.03 * s, 0, 0]} rotation={[0, 0, Math.PI / 2]} />}
          <mesh geometry={nozzle} material={mats.black} position={[0.034 * s, 0, 0]} rotation={[0, 0, -Math.PI / 2]} />
        </>
      )}
    </group>
  );
}

function Canister({ p, tank, mats, lod }: { p: EquipmentPlacement; tank: Tank; mats: Mats; lod: RenderLod }) {
  const d = tankDims(tank);
  const zIn = -d.W / 2 + 0.024;
  // lane:qa-visual — intake (p.pos) and outlet share one rear corner, so the plumbing reads as a tidy service corner
  const side = p.pos[0] >= 0 ? 1 : -1;
  const ix = p.pos[0];
  const ox = side * (d.L / 2 - 0.05);
  const intake = useGeo(() => tubeAlong([[ix, d.waterY * 0.3, zIn], [ix, d.H - 0.01, zIn], [ix, d.H + 0.035, zIn - 0.02], [ix, d.H + 0.01, -d.W / 2 - 0.05], [ix + side * 0.02, -0.2, -d.W / 2 - 0.08]], 0.007, 40, 10), [ix, side, d.L, d.W, d.H]);
  const outlet = useGeo(() => tubeAlong([[ox - side * 0.01, d.waterY - 0.04, zIn], [ox, d.H - 0.01, zIn], [ox, d.H + 0.035, zIn - 0.02], [ox, d.H + 0.01, -d.W / 2 - 0.05], [ox - side * 0.02, -0.2, -d.W / 2 - 0.08]], 0.007, 40, 10), [ox, side, d.L, d.W, d.H]);
  const strainer = useGeo(() => new THREE.CylinderGeometry(0.012, 0.012, 0.07, 18), []);
  const spray = useGeo(() => new THREE.CylinderGeometry(0.009, 0.006, 0.03, 14), []);
  return (
    <group>
      <mesh geometry={intake} material={mats.charcoal} />
      <mesh geometry={outlet} material={mats.charcoal} />
      {lod < 2 && <mesh geometry={strainer} material={mats.black} position={[ix, d.waterY * 0.3, zIn]} />}
      <mesh geometry={spray} material={mats.black} position={[ox - side * 0.025, d.waterY - 0.04, zIn + 0.004]} rotation={[0, 0, side * Math.PI / 2]} />
    </group>
  );
}

function Sump({ p, tank, mats }: { p: EquipmentPlacement; tank: Tank; mats: Mats }) {
  const d = tankDims(tank);
  // lane:qa-visual — p.pos is this sump's return nozzle. The overflow: one sump drains through a corner box (right rear
  // corner); several share a low coast-to-coast weir along the top of the back glass, drawn once (n = 0).
  const c2c = p.of > 1;
  const h = c2c ? 0.075 : d.H * 0.62;
  const bw = c2c ? d.L * 0.86 : 0.11;
  const bd = c2c ? 0.055 : 0.11;
  const box = useGeo(() => new RoundedBoxGeometry(bw, h, bd, 2, 0.004), [bw, h, bd]);
  const segs = useGeo(() => new THREE.SphereGeometry(0.0075, 12, 10), []);
  const nozzle = useGeo(() => new THREE.CylinderGeometry(0.004, 0.007, 0.018, 12), []);
  const side = p.pos[0] >= 0 ? 1 : -1;
  const [rx, ry, rz] = p.pos;
  const boxTop = c2c ? d.waterY + 0.02 : d.H - 0.004;
  return (
    <group>
      {(!c2c || p.n === 0) && <mesh geometry={box} material={mats.black} position={[c2c ? 0 : d.L / 2 - 0.058, boxTop - h / 2, -d.W / 2 + bd / 2 + 0.003]} />}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} geometry={segs} material={mats.black} position={[rx + side * (0.05 - i * 0.009), ry + 0.03 - i * 0.006, rz - 0.02 + i * 0.004]} />
      ))}
      <mesh geometry={nozzle} material={mats.black} position={[rx, ry, rz]} rotation={[0.3, 0, 1.2 * side]} />
    </group>
  );
}

function FanClip({ p, tank, mats }: { p: EquipmentPlacement; tank: Tank; mats: Mats }) {
  const d = tankDims(tank);
  const ring = useGeo(() => new THREE.TorusGeometry(0.036, 0.004, 8, 32), []);
  const hub = useGeo(() => new THREE.CylinderGeometry(0.012, 0.012, 0.012, 16), []);
  const blade = useGeo(() => new THREE.BoxGeometry(0.03, 0.002, 0.012), []);
  const clamp = useGeo(() => new RoundedBoxGeometry(0.03, 0.04, 0.03, 2, 0.004), []);
  const rot = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (rot.current && p.running) rot.current.rotation.y += dt * 22;
  });
  return (
    <group position={[p.pos[0], d.H, -d.W / 2]}>
      <mesh geometry={clamp} material={mats.black} position={[0, 0.005, -0.005]} />
      <group position={[0, 0.055, 0.015]} rotation={[-0.9, 0, 0]}>
        <mesh geometry={ring} material={mats.black} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={hub} material={mats.black} />
        <group ref={rot} userData={{ mergeSkip: true }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} geometry={blade} material={mats.charcoal} rotation={[0.3, (i / 5) * Math.PI * 2, 0]} position={[Math.cos((i / 5) * Math.PI * 2) * 0.017, 0, -Math.sin((i / 5) * Math.PI * 2) * 0.017]} />
          ))}
        </group>
      </group>
    </group>
  );
}

function Skimmer({ p, tank, mats }: { p: EquipmentPlacement; tank: Tank; mats: Mats }) {
  const d = tankDims(tank);
  const body = useGeo(() => new THREE.CylinderGeometry(0.035, 0.035, 0.24, 24), []);
  const cup = useGeo(() => new THREE.CylinderGeometry(0.037, 0.034, 0.06, 24), []);
  const gunk = useGeo(() => new THREE.CylinderGeometry(0.03, 0.03, 0.012, 20), []);
  const hanger = useGeo(() => new RoundedBoxGeometry(0.06, 0.02, 0.06, 2, 0.004), []);
  const pump = useGeo(() => new RoundedBoxGeometry(0.045, 0.05, 0.03, 2, 0.006), []);
  // lane:qa-visual — the in-tank feed pump hangs from the hang-on body by its riser (it used to float unattached)
  const riserLen = Math.max(0.02, d.H - (d.waterY - 0.055));
  const riser = useGeo(() => new THREE.CylinderGeometry(0.0065, 0.0065, riserLen, 12), [riserLen]);
  const z = -d.W / 2 - d.glass - 0.045;
  return (
    <group position={[p.pos[0], 0, 0]}>
      <mesh geometry={body} material={mats.charcoal} position={[0, d.H - 0.06, z]} castShadow />
      <mesh geometry={cup} material={mats.clearTube} position={[0, d.H + 0.09, z]} />
      <mesh geometry={gunk} material={mats.skimmate} position={[0, d.H + 0.07, z]} />
      <mesh geometry={hanger} material={mats.black} position={[0, d.H + 0.005, -d.W / 2 - 0.01]} />
      <mesh geometry={pump} material={mats.black} position={[0, d.waterY - 0.08, -d.W / 2 + 0.02]} />
      <mesh geometry={riser} material={mats.black} position={[0.012, d.waterY - 0.055 + riserLen / 2, -d.W / 2 + 0.014]} />
    </group>
  );
}

function Refugium({ p, tank, mats }: { p: EquipmentPlacement; tank: Tank; mats: Mats }) {
  const d = tankDims(tank);
  const box = useGeo(() => new RoundedBoxGeometry(0.2, 0.14, 0.09, 2, 0.004), []);
  const chaeto = useGeo(() => new THREE.IcosahedronGeometry(0.035, 2), []);
  const lamp = useGeo(() => new RoundedBoxGeometry(0.08, 0.012, 0.04, 2, 0.003), []);
  const z = -d.W / 2 - d.glass - 0.05;
  return (
    <group position={[p.pos[0], d.H - 0.05, z]}>
      <mesh geometry={box} material={mats.glass} />
      <mesh geometry={chaeto} material={mats.chaeto} position={[-0.03, -0.02, 0]} scale={[1.4, 0.8, 1]} />
      <mesh geometry={lamp} material={p.running ? mats.blueGlow : mats.black} position={[0, 0.085, 0]} />
    </group>
  );
}

function UvSterilizer({ p, mats }: { p: EquipmentPlacement; mats: Mats }) {
  const body = useGeo(() => new THREE.CylinderGeometry(0.024, 0.024, 0.26, 20), []);
  const ring = useGeo(() => new THREE.TorusGeometry(0.025, 0.0025, 6, 24), []);
  return (
    <group position={p.pos}>
      <mesh geometry={body} material={mats.white} castShadow />
      <mesh geometry={ring} material={p.running ? mats.blueGlow : mats.charcoal} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

function AtoSensor({ p, tank, mats }: { p: EquipmentPlacement; tank: Tank; mats: Mats }) {
  const d = tankDims(tank);
  const clip = useGeo(() => new RoundedBoxGeometry(0.018, 0.03, 0.012, 2, 0.003), []);
  const tip = useGeo(() => new THREE.ConeGeometry(0.004, 0.01, 12), []);
  const cable = useGeo(() => tubeAlong([[0, 0.015, 0], [0, d.H - p.pos[1] + 0.005, -0.004], [0, d.H - p.pos[1] + 0.02, -0.03]], 0.0015, 10, 5), [d.H]);
  return (
    <group position={p.pos}>
      <mesh geometry={clip} material={mats.black} position={[0, 0.004, 0.006]} />
      <mesh geometry={tip} material={mats.clearTube} position={[0, -0.016, 0.006]} rotation={[Math.PI, 0, 0]} />
      <mesh geometry={cable} material={mats.black} />
    </group>
  );
}

function Autofeeder({ p, mats }: { p: EquipmentPlacement; mats: Mats }) {
  const drum = useGeo(() => new THREE.CylinderGeometry(0.026, 0.026, 0.05, 24), []);
  const win = useGeo(() => new THREE.CylinderGeometry(0.0265, 0.0265, 0.03, 24, 1, true, 0, Math.PI * 0.8), []);
  const base = useGeo(() => new RoundedBoxGeometry(0.06, 0.02, 0.05, 2, 0.004), []);
  return (
    <group position={p.pos}>
      <mesh geometry={base} material={mats.charcoal} position={[0, 0.012, 0]} />
      <group position={[0, 0.045, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh geometry={drum} material={mats.black} />
        <mesh geometry={win} material={mats.clearTube} />
      </group>
    </group>
  );
}

function Co2Diffuser({ p, tank, mats, lod }: { p: EquipmentPlacement; tank: Tank; mats: Mats; lod: RenderLod }) {
  const d = tankDims(tank);
  const cupG = useGeo(() => new THREE.CylinderGeometry(0.013, 0.009, 0.016, 20, 1, true), []);
  const disc = useGeo(() => new THREE.CylinderGeometry(0.011, 0.011, 0.002, 20), []);
  const stem = useGeo(() => new THREE.CylinderGeometry(0.0022, 0.0022, 0.03, 8), []);
  const suction = useGeo(() => new THREE.CylinderGeometry(0.008, 0.004, 0.005, 14), []);
  const tube = useGeo(() => tubeAlong([[0, -0.03, 0], [0, -0.04, -0.012], [0.004, d.H - p.pos[1] - 0.01, -0.014], [0.01, d.H - p.pos[1] + 0.015, -0.04]], 0.0016, 18, 5), [d.H]);
  return (
    <group position={p.pos}>
      <group rotation={[Math.PI / 2 - 0.3, 0, 0]}>
        <mesh geometry={cupG} material={mats.glass} />
        <mesh geometry={disc} material={mats.ceramic} position={[0, 0.006, 0]} />
      </group>
      <mesh geometry={stem} material={mats.glass} position={[0, -0.018, -0.004]} />
      {lod === 0 && (
        <>
          <mesh geometry={suction} material={mats.suction} position={[0, -0.02, -0.016]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={tube} material={mats.clearTube} />
        </>
      )}
    </group>
  );
}

export function TankEquipment({ tank, lod }: { tank: Tank; lod: RenderLod }) {
  const fx = useTankFX();
  const mats = useMemo(() => makeEquipMaterials(fx), [fx]);
  const tankU = useMemo(createTankUniforms, []);
  const solid = useMemo(() => makeDecorMaterial('solid', fx, tankU, null), [fx, tankU]);
  useEffect(
    () => () => {
      for (const [k, m] of Object.entries(mats)) {
        if (k === 'textures') (m as THREE.Texture[]).forEach((t) => t.dispose());
        else (m as THREE.Material).dispose();
      }
      solid.dispose();
    },
    [mats, solid],
  );
  const sig = tank.equipment.map((e) => `${e.id}:${e.defId}:${e.on}:${e.failed}:${e.setting}`).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => equipmentLayout(tank), [sig, tank.tierId, tank.substrate.kind, tank.substrate.depthCm]);
  // lane:perf2 — room-view tanks draw their static equipment parts as one mesh per material (animated parts excluded)
  const root = useRef<THREE.Group>(null);
  useStaticMerge(root, lod >= 1);
  return (
    <group name="equipment" ref={root}>
      {layout.map((p) => {
        const k = p.eq.id;
        switch (p.visual) {
          case 'light_bar':
            return <LightBar key={k} p={p} tank={tank} mats={mats} lod={lod} />;
          case 'sponge_filter':
            return <SpongeFilter key={k} p={p} tank={tank} mats={mats} lod={lod} solid={solid} />;
          case 'hob_filter':
            return <HobFilter key={k} p={p} tank={tank} mats={mats} lod={lod} />;
          case 'canister':
            return <Canister key={k} p={p} tank={tank} mats={mats} lod={lod} />;
          case 'sump':
            return <Sump key={k} p={p} tank={tank} mats={mats} />;
          case 'heater_tube':
            return lod === 2 ? null : <Heater key={k} p={p} tank={tank} mats={mats} lod={lod} />;
          case 'chiller_box':
            return <Chiller key={k} p={p} tank={tank} mats={mats} />;
          case 'fan_clip':
            return lod === 2 ? null : <FanClip key={k} p={p} tank={tank} mats={mats} />;
          case 'airstone':
            return lod === 2 ? null : <Airstone key={k} p={p} mats={mats} solid={solid} tank={tank} lod={lod} />;
          case 'powerhead':
            return lod === 2 ? null : <Powerhead key={k} p={p} mats={mats} lod={lod} />;
          case 'wavemaker':
            return lod === 2 ? null : <Powerhead key={k} p={p} mats={mats} lod={lod} wave />;
          case 'skimmer':
            return <Skimmer key={k} p={p} tank={tank} mats={mats} />;
          case 'refugium':
            return <Refugium key={k} p={p} tank={tank} mats={mats} />;
          case 'uv_sterilizer':
            return lod === 2 ? null : <UvSterilizer key={k} p={p} mats={mats} />;
          case 'ato_sensor':
            return lod === 2 ? null : <AtoSensor key={k} p={p} tank={tank} mats={mats} />;
          case 'autofeeder':
            return lod === 2 ? null : <Autofeeder key={k} p={p} mats={mats} />;
          case 'co2_kit':
            return lod === 2 ? null : <Co2Diffuser key={k} p={p} tank={tank} mats={mats} lod={lod} />;
          default:
            return null;
        }
      })}
    </group>
  );
}
