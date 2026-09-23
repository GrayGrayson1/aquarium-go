/**
 * Estuary decor close-up bench (lane "brackish"): one decor item on a sand pad in estuary-tinted water, seen from a
 * front camera, for visual QA of the mangrove roots, oyster shells, pebbles and mangrove seedling.
 *
 * URL: ?sandbox=brackish-decor[&id=mangrove_roots][&seed=4242][&lod=0][&growth=1][&yaw=0][&pitch=0.12][&dist=0.62][&aim=0.1]
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { DecorInstance } from '@/types';
import { getDecorDef } from '@/data/catalog/decor';
import { TankFXContext, createTankFXUniforms } from '@/render/shared/underwater';
import { DecorItem, type SharedDecorMats } from '@/render/decor/DecorItem';
import { createTankUniforms, makeDecorMaterial } from '@/render/decor/materials';
import { acquireDecorGeometry, releaseDecorGeometry, MAT_CLASSES } from '@/render/decor/gen';

const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const ID = q.get('id') ?? 'mangrove_roots';
const SEED = Number(q.get('seed') ?? 4242);
const LOD = Number(q.get('lod') ?? 0) as 0 | 1 | 2;
const GROWTH = Number(q.get('growth') ?? 1);
const YAW = Number(q.get('yaw') ?? 0);
const PITCH = Number(q.get('pitch') ?? 0.12);
const DIST = Number(q.get('dist') ?? 0.62);
const AIM = Number(q.get('aim') ?? 0.1);
const WATER_Y = Number(q.get('water') ?? 0.5);

function Sand() {
  const geo = useMemo(() => new THREE.CircleGeometry(0.5, 64).rotateX(-Math.PI / 2), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cdbd9a', roughness: 0.95 }), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  return <mesh geometry={geo} material={mat} position={[0, -0.001, 0]} receiveShadow />;
}

function LodItem({ fx, tankU }: { fx: ReturnType<typeof createTankFXUniforms>; tankU: ReturnType<typeof createTankUniforms> }) {
  const def = getDecorDef(ID)!;
  const geo = useMemo(() => acquireDecorGeometry(def, SEED, LOD), [def]);
  useEffect(() => () => releaseDecorGeometry(def, SEED, LOD), [def]);
  const mats = useMemo(() => Object.fromEntries(MAT_CLASSES.map((k) => [k, makeDecorMaterial(k, fx, tankU, null, { lowDetail: LOD === 2 })])), [fx, tankU]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return <group>{MAT_CLASSES.map((k) => (geo[k] ? <mesh key={k} geometry={geo[k]} material={mats[k]} castShadow /> : null))}</group>;
}

function Scene() {
  const def = getDecorDef(ID);
  const fx = useMemo(() => {
    const f = createTankFXUniforms();
    f.uWaterBox.value.set(2, WATER_Y, 2);
    f.uFogDensity.value = 0.5;
    f.uAbsorb.value.set(0.3, 0.1, 0.4);
    f.uWaterTint.value.set('#6c8f78');
    f.uCausticIntensity.value = 0.8;
    f.uCausticScale.value = 22;
    f.uLightColor.value.set('#fff1dc');
    f.uLightDir.value.set(0.1, -1, 0.05).normalize();
    f.uDay.value = 1;
    return f;
  }, []);
  const tankU = useMemo(createTankUniforms, []);
  const shared = useMemo<SharedDecorMats>(() => ({ solid: makeDecorMaterial('solid', fx, tankU, null), solidDouble: makeDecorMaterial('solidDouble', fx, tankU, null) }), [fx, tankU]);
  const flow = useMemo(() => new THREE.Vector3(0.0015, 0, 0), []);
  const inst: DecorInstance = useMemo(() => ({ id: `bench_${ID}`, defId: ID, x: 0, y: 0, z: 0, rotY: YAW, scale: 1, seed: SEED, growth: GROWTH, health: 100 }), []);
  useFrame((st) => {
    if (!st.camera.userData.agPlaced) {
      st.camera.position.set(0, AIM + Math.sin(PITCH) * DIST, Math.cos(PITCH) * DIST);
      st.camera.lookAt(0, AIM, 0);
      st.camera.userData.agPlaced = true;
    }
    fx.uTime.value = st.clock.elapsedTime;
    fx.uCamPos.value.copy(st.camera.position);
  });
  if (!def) return null;
  return (
    <TankFXContext.Provider value={fx}>
      <color attach="background" args={['#15201b']} />
      <hemisphereLight args={['#f2ead8', '#26302a', 0.9]} />
      <directionalLight position={[0.3, 2.5, 0.8]} intensity={2.6} color="#fff0da" castShadow />
      <directionalLight position={[-1.5, 0.8, -1]} intensity={0.45} color="#a8d0c0" />
      <Sand />
      {LOD === 0 ? <DecorItem inst={inst} def={def} tankId="bench" fx={fx} tankU={tankU} shared={shared} flowTank={flow} /> : <LodItem fx={fx} tankU={tankU} />}
    </TankFXContext.Provider>
  );
}

export default function BrackishDecorBench() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#15201b' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 30, near: 0.01, far: 20 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
