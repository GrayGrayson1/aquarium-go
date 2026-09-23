/**
 * waterfx-lab: judge water, glass, light, caustics and post in isolation (lane "waterfx" internal test content).
 * Open either `?sandbox=waterfx-lab` (through App) or `/src/dev/sandboxes/waterfx-lab.html` (standalone, independent
 * of the UI lane). URL params:
 *   tier=g29 class=freshwater_planted preset=planted hour=12 backdrop=black cam=front|orbit|close|photo|facility
 *   quality=low|medium|high|ultra props=1 algae=0..100 clarity=0..1 party=1 tick=1 yaw=0 pitch=0 zoom=1 moon=1
 */
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { GameState, Tank, WaterClass, LightPreset, BackdropKind } from '@/types';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { tankDims, tankWorldTransform } from '@/sim/tankSpace';
import { SceneCanvas } from '@/render/shared/SceneCanvas';
import { RoomEnvironment, SceneAmbience, RenderBridge } from '@/render/shared/environment';
import { TankFXProvider } from '@/render/tank/TankFXProvider';
import { TankLights } from '@/render/tank/TankLights';
import { TankWaterFX } from '@/render/tank/TankWaterFX';
import { TankShell } from '@/render/tank/TankShell';
import { CameraRig, setCameraOffsets } from '@/render/camera/CameraRig';
import { PostFX } from '@/render/post/PostFX';
import { patchUnderwaterMaterial, useTankFX } from '@/render/shared/underwater';
import { pushVisualEvent, runtime } from '@/runtime/tankRuntime';

const q = () => new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

function labTank(): Tank {
  const p = q();
  const wc = (p.get('class') ?? 'freshwater_planted') as WaterClass;
  const marine = wc.startsWith('marine') || wc === 'reef';
  return {
    id: 'lab',
    name: 'Lab',
    tierId: p.get('tier') ?? 'g29',
    waterClass: wc,
    environment: marine ? 'marine' : 'freshwater',
    purpose: 'display',
    placement: { x: 0, z: -0.8, rotY: 0 },
    water: {
      tempC: 25, pH: 7, ammonia: 0, nitrite: 0, nitrate: 5, oxygen: 1, salinitySG: marine ? 1.025 : 1, gh: 6, kh: 4,
      detritus: 0, algae: Number(p.get('algae') ?? 0), clarity: Number(p.get('clarity') ?? 1), bioMaturity: 1, foodInWater: 0, level: 1,
    },
    equipment: [],
    decor: [],
    substrate: marine ? { kind: 'aragonite', depthCm: 4, color: '#efe6d6' } : { kind: 'fine_sand', depthCm: 3, color: '#cdbd9c' },
    backdrop: (p.get('backdrop') ?? (marine ? 'deep_blue' : 'black')) as BackdropKind,
    lighting: {
      preset: (p.get('preset') ?? (marine ? 'reef_full' : 'planted')) as LightPreset,
      intensity: Number(p.get('intensity') ?? 1),
      onHour: 7,
      offHour: 22,
      moonlight: p.get('moon') !== '0',
    },
    createdHour: 0,
    cache: { stockingLoad: 0, beauty: 50, welfare: 100, exhibitScore: 50, stability: 80, status: 'good', compatVerdict: 'excellent' },
    signage: false,
    lastMaintenanceHour: 0,
    tapPressure: 0,
  };
}

function labGame(): GameState {
  const tank = labTank();
  const g = {
    clock: { hour: Number(q().get('hour') ?? 12), speed: 0 },
    tanks: { lab: tank },
    tankOrder: ['lab'],
    creatures: {},
    clutches: {},
    facility: { level: 'hobby_room', width: 5, depth: 4.5, openToPublic: false, admission: 0, openHour: 9, closeHour: 19, fixtures: [] },
    isShowcase: true,
  } as unknown as GameState;
  return g;
}

/** Simple procedural stand-ins so caustics/fog/shadows can be judged (never shipped as game content). */
function LabProps({ tank }: { tank: Tank }) {
  const fx = useTankFX();
  const d = tankDims(tank);
  const mats = useMemo(() => {
    const mk = (c: string, r: number, m = 0) => patchUnderwaterMaterial(new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }), fx) as THREE.MeshStandardMaterial;
    return { sand: mk(tank.substrate.color, 0.95), rock: mk('#7d776c', 0.9), rock2: mk('#5f5a52', 0.85), white: mk('#e8e8e8', 0.6), fish: mk('#ff7a2e', 0.35), leaf: mk('#3f8a3a', 0.6), gloss: mk('#9ab8c8', 0.15, 0.1) };
  }, [fx, tank.substrate.color]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  const rockGeo = useMemo(() => {
    const g0 = new THREE.IcosahedronGeometry(1, 4);
    g0.deleteAttribute('normal');
    g0.deleteAttribute('uv');
    const g = mergeVertices(g0);
    g0.dispose();
    const p = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = 1 + 0.18 * Math.sin(v.x * 4.1 + v.y * 2.3) * Math.cos(v.z * 3.7) + 0.08 * Math.sin(v.x * 11 + v.z * 9);
      v.multiplyScalar(n);
      p.setXYZ(i, v.x, Math.max(v.y, -0.4), v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => rockGeo.dispose(), [rockGeo]);
  const fish = useMemo(() => new THREE.Object3D(), []);
  const fishRef = useMemo(() => ({ current: null as THREE.Mesh | null }), []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (fishRef.current) {
      fishRef.current.position.set(Math.sin(t * 0.35) * d.L * 0.3, d.waterY * 0.55 + Math.sin(t * 0.7) * 0.02, Math.cos(t * 0.35) * d.W * 0.2);
      fishRef.current.rotation.y = -t * 0.35 + (Math.cos(t * 0.35) > 0 ? 0 : 0);
      fishRef.current.rotation.y = Math.atan2(-Math.cos(t * 0.35) * d.W * 0.2 * 0.35, Math.cos(t * 0.35) * d.L * 0.3 * 0.35);
    }
    void fish;
  });
  const sy = d.substrateY;
  const S = Math.min(d.L, 0.9);
  return (
    <group>
      <mesh position={[0, sy / 2, 0]} material={mats.sand} receiveShadow>
        <boxGeometry args={[d.L, sy, d.W]} />
      </mesh>
      <mesh geometry={rockGeo} material={mats.rock} position={[-d.L * 0.22, sy + 0.02, -d.W * 0.12]} scale={[S * 0.14, S * 0.1, S * 0.1]} castShadow receiveShadow />
      <mesh geometry={rockGeo} material={mats.rock2} position={[d.L * 0.25, sy + 0.01, -d.W * 0.2]} scale={[S * 0.09, S * 0.16, S * 0.08]} rotation={[0, 1, 0.2]} castShadow receiveShadow />
      <mesh geometry={rockGeo} material={mats.rock} position={[d.L * 0.05, sy, d.W * 0.18]} scale={[S * 0.05, S * 0.035, S * 0.05]} castShadow receiveShadow />
      <mesh material={mats.white} position={[d.L * 0.08, sy + 0.035, -d.W * 0.05]} castShadow receiveShadow>
        <sphereGeometry args={[0.035, 48, 32]} />
      </mesh>
      <mesh material={mats.gloss} position={[-d.L * 0.36, sy + 0.025, d.W * 0.2]} castShadow receiveShadow>
        <sphereGeometry args={[0.025, 48, 32]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} material={mats.leaf} position={[d.L * (0.3 + i * 0.03), sy + d.waterY * 0.3, -d.W * 0.3 + i * 0.01]} rotation={[0.1 * i - 0.2, 0, 0.12 * (i - 2)]} castShadow>
          <cylinderGeometry args={[0.004, 0.006, d.waterY * 0.6, 8]} />
        </mesh>
      ))}
      <mesh ref={(m) => (fishRef.current = m)} material={mats.fish} scale={[0.04, 0.016, 0.009]} castShadow>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
    </group>
  );
}

function LabRoom() {
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a2f27', roughness: 0.75 }), []);
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1c232b', roughness: 0.9 }), []);
  useEffect(
    () => () => {
      floor.dispose();
      wall.dispose();
    },
    [floor, wall],
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow>
        <planeGeometry args={[8, 8]} />
      </mesh>
      <mesh position={[0, 1.6, -1.6]} material={wall} receiveShadow>
        <planeGeometry args={[8, 3.2]} />
      </mesh>
    </group>
  );
}

function LabScene() {
  const game = useGame((s) => s.game);
  const tank = game?.tanks.lab;
  const p = q();
  const props = p.get('props') !== '0';
  const tick = p.get('tick') === '1';
  useFrame((_, dt) => {
    if (p.get('yaw') || p.get('pitch') || p.get('zoom')) setCameraOffsets({ yaw: Number(p.get('yaw') ?? 0), pitch: Number(p.get('pitch') ?? 0), zoom: Number(p.get('zoom') ?? 1) });
    if (tick) useGame.getState().mutate((d) => void (d.clock.hour += dt * 0.5));
    // periodic feed/tap events to exercise ripples
    const g = useGame.getState().game;
    if (g && Math.random() < dt * 0.25) {
      const t = g.tanks.lab;
      const dd = tankDims(t);
      pushVisualEvent({ kind: 'feed', tankId: 'lab', pos: [(Math.random() - 0.5) * dd.L * 0.8, dd.waterY, (Math.random() - 0.5) * dd.W * 0.6], t: performance.now() / 1000 });
    }
    void runtime;
  });
  if (!tank) return null;
  const { position, rotY } = tankWorldTransform(tank);
  return (
    <>
      <color attach="background" args={['#05090d']} />
      <RoomEnvironment />
      <SceneAmbience />
      <RenderBridge />
      <LabRoom />
      <group position={position} rotation={[0, rotY, 0]}>
        <TankFXProvider tank={tank}>
          <TankLights tank={tank} lod={0} />
          {props && <LabProps tank={tank} />}
          <TankWaterFX tank={tank} lod={0} />
          <TankShell tank={tank} lod={0} />
        </TankFXProvider>
      </group>
      <CameraRig />
      <PostFX />
    </>
  );
}

export default function WaterfxLab() {
  useMemo(() => {
    const p = q();
    useGame.getState().setGame(labGame());
    const cam = p.get('cam') ?? 'front';
    const view = cam === 'facility' ? 'facility' : 'tank';
    useUI.getState().set({
      screen: 'game',
      view,
      focusedTankId: 'lab',
      cameraMode: (cam === 'facility' ? 'front' : cam) as 'front',
      partyMode: p.get('party') === '1',
      photoMode: cam === 'photo',
    });
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#03090d' }}>
      <SceneCanvas>
        <LabScene />
      </SceneCanvas>
    </div>
  );
}
