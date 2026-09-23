/**
 * Aquascape asset gallery: every decor item on a slowly turning pad, for visual QA. OWNER: lane "aquascape".
 *
 * URL: ?sandbox=aquascape-gallery[&cat=plant|hardscape|coral|anemone|ornament|enrichment|substrate_feature]
 *      [&only=id1,id2][&lod=0|1|2][&cols=6][&spin=0][&growth=0.4][&actinic=1][&health=0.2]
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { DecorDef, DecorInstance } from '@/types';
import { DECOR } from '@/data/catalog/decor';
import { TankFXContext, createTankFXUniforms, type TankFXUniforms } from '@/render/shared/underwater';
import { DecorItem, type SharedDecorMats } from '@/render/decor/DecorItem';
import { createTankUniforms, makeDecorMaterial, type DecorTankUniforms } from '@/render/decor/materials';
import { acquireDecorGeometry, releaseDecorGeometry, MAT_CLASSES } from '@/render/decor/gen';

const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const CAT = q.get('cat');
const ONLY = q.get('only')?.split(',');
const LOD = Number(q.get('lod') ?? 0) as 0 | 1 | 2;
const SPIN = q.get('spin') !== '0';
const GROWTH = q.get('growth') ? Number(q.get('growth')) : 1;
const HEALTH = q.get('health') ? Number(q.get('health')) : 100;
const ACTINIC = q.get('actinic') ? Number(q.get('actinic')) : 0.3;

const SPACING = 0.32;
function grid(count: number): { cols: number; rows: number } {
  const cols = Number(q.get('cols') ?? Math.ceil(Math.sqrt(count * 1.6)));
  return { cols, rows: Math.ceil(count / cols) };
}

function items(): DecorDef[] {
  let list = DECOR;
  if (CAT) list = list.filter((d) => d.category === CAT);
  if (ONLY) list = list.filter((d) => ONLY.includes(d.id));
  return list;
}

function Pad({ size }: { size: number }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(size, size * 1.04, 0.012, 48), [size]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2f33', roughness: 0.9 }), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  return <mesh geometry={geo} material={mat} position={[0, -0.007, 0]} receiveShadow />;
}

/** LOD 1/2 preview: static merged geometry for one item. */
function LodItem({ def, fx, tankU }: { def: DecorDef; fx: TankFXUniforms; tankU: DecorTankUniforms }) {
  const geo = useMemo(() => acquireDecorGeometry(def, 4242, LOD), [def]);
  useEffect(() => () => releaseDecorGeometry(def, 4242, LOD), [def]);
  const mats = useMemo(() => Object.fromEntries(MAT_CLASSES.map((k) => [k, makeDecorMaterial(k, fx, tankU, null, { lowDetail: LOD === 2 })])), [fx, tankU]);
  return (
    <group>
      {MAT_CLASSES.map((k) => (geo[k] ? <mesh key={k} geometry={geo[k]} material={mats[k]} castShadow /> : null))}
    </group>
  );
}

function Cell({ def, pos, fx, tankU, shared, flow }: { def: DecorDef; pos: [number, number, number]; fx: TankFXUniforms; tankU: DecorTankUniforms; shared: SharedDecorMats; flow: THREE.Vector3 }) {
  const spin = useRef<THREE.Group>(null);
  const fit = 0.22 / Math.max(def.size.w, def.size.d, def.size.h * 0.9);
  const inst: DecorInstance = useMemo(() => ({ id: `g_${def.id}`, defId: def.id, x: 0, y: 0, z: 0, rotY: 0, scale: fit, seed: 4242, growth: GROWTH, health: HEALTH }), [def, fit]);
  useFrame((_, dt) => {
    if (spin.current && SPIN) spin.current.rotation.y += dt * 0.25;
  });
  return (
    <group position={pos}>
      <Pad size={0.13} />
      <group ref={spin}>
        {LOD === 0 ? (
          <DecorItem inst={inst} def={def} tankId="gallery" fx={fx} tankU={tankU} shared={shared} flowTank={flow} />
        ) : (
          <group scale={fit}>
            <LodItem def={def} fx={fx} tankU={tankU} />
          </group>
        )}
      </group>
      <Html position={[0, -0.03, 0.14]} center style={{ pointerEvents: 'none' }}>
        <div style={{ color: '#cfe7e3', font: '500 11px Inter, system-ui, sans-serif', whiteSpace: 'nowrap', textShadow: '0 1px 2px #000' }}>{def.name}</div>
      </Html>
    </group>
  );
}

function Scene() {
  const list = useMemo(items, []);
  const fx = useMemo(() => {
    const f = createTankFXUniforms();
    f.uWaterBox.value.set(50, 50, 50);
    f.uFogDensity.value = 0;
    f.uAbsorb.value.set(0, 0, 0);
    f.uCausticIntensity.value = 0.35;
    f.uCausticScale.value = 7;
    f.uLightColor.value.set('#ffffff');
    return f;
  }, []);
  const tankU = useMemo(() => {
    const t = createTankUniforms();
    t.uActinic.value = ACTINIC;
    return t;
  }, []);
  const shared = useMemo<SharedDecorMats>(() => ({ solid: makeDecorMaterial('solid', fx, tankU, null), solidDouble: makeDecorMaterial('solidDouble', fx, tankU, null) }), [fx, tankU]);
  const flow = useMemo(() => new THREE.Vector3(0.002, 0, 0), []);
  const { cols, rows } = grid(list.length);
  const sp = SPACING;
  useFrame((st) => {
    if (!st.camera.userData.agPlaced) {
      const w = cols * sp;
      const h = rows * sp;
      const dist = Math.max(w * 1.25, h * 2.0) + 0.3;
      st.camera.position.set(0, dist * 0.55, dist);
      st.camera.lookAt(0, -0.02, 0);
      st.camera.userData.agPlaced = true;
    }
    fx.uTime.value = st.clock.elapsedTime;
    fx.uCamPos.value.copy(st.camera.position);
  });
  return (
    <TankFXContext.Provider value={fx}>
      <color attach="background" args={['#0b1318']} />
      <hemisphereLight args={['#cfe6f0', '#1c2226', 0.7]} />
      <directionalLight position={[0.6, 3, 1.4]} intensity={2.4} castShadow />
      <directionalLight position={[-2, 1, -1]} intensity={0.5} color="#9fc7ff" />
      {list.map((def, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return <Cell key={def.id} def={def} pos={[(c - (cols - 1) / 2) * sp, 0, (r - (rows - 1) / 2) * sp * 1.05]} fx={fx} tankU={tankU} shared={shared} flow={flow} />;
      })}
    </TankFXContext.Provider>
  );
}

export default function AquascapeGallery() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b1318' }}>
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 32, near: 0.01, far: 50 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.outputColorSpace = THREE.SRGBColorSpace; }}>
        <Scene />
      </Canvas>
    </div>
  );
}
