/**
 * Facility lane sandbox: renders a facility fixture with its own orbit camera, independent of the game UI.
 *   ?sandbox=facility-room&fixture=facility_grand&cam=overview|front|low|side&hour=14&tanks=shell|box|full&speed=1&post=1
 * OWNER: lane "facility".
 */
import { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Tank } from '@/types';
import { useGame, useGameSelector } from '@/state/game';
import { useUI } from '@/state/ui';
import { FIXTURES } from '@/dev/fixtures';
import { FacilityWorld } from '@/render/facility/FacilityWorld';
import { facilityCameraBounds, facilityOverviewPose } from '@/render/facility/bounds';
import { tankWorldTransform, tankDims, standHeight } from '@/sim/tankSpace';
import { TankInstance } from '@/render/tank/TankInstance';
import { TankFXProvider } from '@/render/tank/TankFXProvider';
import { TankShell } from '@/render/tank/TankShell';
import { TankLights } from '@/render/tank/TankLights';
import { TankDecor } from '@/render/decor/TankDecor';
import { TankWaterFX } from '@/render/tank/TankWaterFX';
import { PostFX } from '@/render/post/PostFX';
import { GameLoop } from '@/game/GameLoop';

const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

function BoxTank({ tank }: { tank: Tank }) {
  const d = tankDims(tank);
  const { position, rotY } = tankWorldTransform(tank);
  const sh = standHeight(tank.tierId);
  const col = tank.environment === 'marine' ? '#2aa8d8' : '#3fbf9a';
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, d.H / 2, 0]}>
        <boxGeometry args={[d.L, d.H, d.W]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.9} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, -sh / 2, 0]}>
        <boxGeometry args={[d.L + 0.04, sh, d.W + 0.04]} />
        <meshStandardMaterial color="#2a2522" roughness={0.6} />
      </mesh>
    </group>
  );
}

function ShellTank({ tank }: { tank: Tank }) {
  const { position, rotY } = tankWorldTransform(tank);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <TankFXProvider tank={tank}>
        <TankLights tank={tank} lod={1} />
        <TankDecor tank={tank} lod={1} />
        <TankWaterFX tank={tank} lod={1} />
        <TankShell tank={tank} lod={1} />
      </TankFXProvider>
    </group>
  );
}

function Tanks() {
  const game = useGame((s) => s.game);
  const mode = q.get('tanks') ?? 'shell';
  if (!game) return null;
  return (
    <>
      {game.tankOrder.map((id) => {
        const t = game.tanks[id];
        if (!t) return null;
        if (mode === 'box') return <BoxTank key={id} tank={t} />;
        if (mode === 'full') return <TankInstance key={id} tank={t} lod={1} focused={false} />;
        return <ShellTank key={id} tank={t} />;
      })}
    </>
  );
}

function CameraSetup() {
  const fac = useGameSelector((g) => g.facility, null);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const pose = useMemo(() => {
    if (!fac) return null;
    const cam = q.get('cam') ?? 'overview';
    const b = facilityCameraBounds(fac);
    const o = facilityOverviewPose(fac);
    const big = Math.max(fac.width, fac.depth);
    if (cam === 'front') return { position: [0, 1.5, fac.depth / 2 - 0.3] as [number, number, number], target: [0, 1.1, -fac.depth / 2] as [number, number, number] };
    if (cam === 'low') return { position: [fac.width * 0.18, 1.6, fac.depth * 0.35] as [number, number, number], target: [0, 1.0, -fac.depth * 0.3] as [number, number, number] };
    if (cam === 'side') return { position: [fac.width * 0.55, big * 0.45, fac.depth * 0.45] as [number, number, number], target: b.target };
    if (cam === 'top') return { position: [0, big * 1.1, 0.01] as [number, number, number], target: [0, 0, 0] as [number, number, number] };
    return o;
  }, [fac]);
  useEffect(() => {
    if (!pose) return;
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [pose, camera, controls]);
  return null;
}

export default function FacilityRoomSandbox() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const name = q.get('fixture') ?? 'facility_shop';
    const build = FIXTURES[name] ?? FIXTURES.facility_shop;
    const g = build();
    const hour = q.get('hour');
    if (hour !== null) g.clock.hour = Math.floor(g.clock.hour / 24) * 24 + Number(hour);
    const speed = q.get('speed');
    g.clock.speed = (speed !== null ? Number(speed) : 1) as 0 | 1 | 3 | 10;
    useGame.getState().setGame(g);
    useUI.getState().set({ screen: 'game', view: 'facility', focusedTankId: null });
    setReady(true);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050b10' }}>
      <Canvas
        dpr={[1, 1.6]}
        shadows
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{ fov: 38, near: 0.05, far: 300, position: [0, 3, 6] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <color attach="background" args={['#050b10']} />
        <ambientLight intensity={0.25} />
        <hemisphereLight args={['#bcd7e6', '#2a2118', 0.35]} />
        {ready && (
          <>
            <FacilityWorld />
            <Tanks />
            <CameraSetup />
            {q.get('post') === '1' && <PostFX />}
          </>
        )}
        <OrbitControls makeDefault enableDamping={false} />
      </Canvas>
      {ready && <GameLoop />}
    </div>
  );
}
