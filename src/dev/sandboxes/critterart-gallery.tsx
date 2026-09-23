/**
 * critterart gallery: every special creature (all axolotl + seahorse morphs) on turntables with animation-state
 * presets. URL params:
 *   species=<id|all>   which species (default all)      focus=<entry index> single close-up
 *   state=<preset>     idle|walk|swim|rest|flick|gape|curious|hitch|pregnant|court|strike|berried|startle|retreat|zen|kick|graze
 *   rot=<rad>          fixed turntable angle (omit to spin)   cam=side|front|three4|top|below|back   zoom=<mul>
 *   lod=0|1|2          t=<seconds> time offset          sex=male|female
 * OWNER: lane "critterart".
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Creature, CreatureRuntime, CreatureVisualParams, SpeciesDefinition, CreaturePose } from '@/types';
import { findSpecies, getSpecies } from '@/data/species';
import { createTankFXUniforms } from '@/render/shared/underwater';
import '@/render/creatures/special';
import { getCreatureFactory } from '@/render/creatures/registry';
import type { CreatureObject } from '@/render/creatures/types';
import type { RenderLod } from '@/render/lod';
import { GALLERY_SPECIES, defaultLook } from '@/render/creatures/special/looks';

const q = new URLSearchParams(location.search);
const Y0 = 1.4;

interface Entry {
  key: string;
  speciesId: string;
  label: string;
  appearance: CreatureVisualParams;
  sex: 'male' | 'female';
  morph: string;
}

function speciesOrStub(id: string): SpeciesDefinition {
  const s = findSpecies(id);
  if (s) return s;
  const base = getSpecies('axolotl');
  return { ...base, id, commonName: id, genetics: { ...base.genetics, baseVisual: defaultLook(id) } };
}

function morphEntries(id: string, sex: 'male' | 'female'): Entry[] {
  const sp = findSpecies(id);
  const out: Entry[] = [];
  if (sp && sp.genetics.phenotypes.length > 1) {
    const base = { ...sp.genetics.baseVisual };
    sp.genetics.phenotypes.forEach((ph, i) => {
      const ap: CreatureVisualParams = { ...base, ...ph.visual, patternSeed: 17 + i * 131 };
      out.push({ key: `${id}:${ph.id}`, speciesId: id, label: `${sp.commonName} · ${ph.name}`, appearance: ap, sex, morph: ph.name });
    });
  } else {
    const ap = sp ? { ...sp.genetics.baseVisual, patternSeed: 7 } : defaultLook(id);
    out.push({ key: id, speciesId: id, label: sp?.commonName ?? id, appearance: ap, sex, morph: 'base' });
  }
  return out;
}

function makeRt(e: Entry): CreatureRuntime {
  return {
    id: `gallery-${e.key}`,
    speciesId: e.speciesId,
    tankId: 'gallery',
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    roll: 0,
    speedBL: 0,
    swimPhase: 0,
    bend: 0,
    finFlare: 0,
    gillFlick: 0,
    mouthOpen: 0,
    eyeL: 0,
    eyeR: 0,
    flutter: 0.4,
    tailCurl: 0.3,
    puff: 0,
    belly: 0,
    colorIntensity: 1,
    pose: 'rest',
    behavior: 'idle',
    lengthM: 0.2,
    visible: true,
    selected: false,
    ai: { galleryHeight: 0 },
  };
}

const pulse = (t: number, period: number, width = 0.35) => {
  const x = (t % period) / period;
  return x < width ? Math.sin((x / width) * Math.PI) : 0;
};

function applyState(rt: CreatureRuntime, state: string, t: number) {
  let pose: CreaturePose = 'rest';
  let speed = 0;
  let height = 0;
  rt.gillFlick = 0;
  rt.mouthOpen = 0;
  rt.belly = 0;
  rt.tailCurl = 0.25;
  rt.flutter = 0.35;
  rt.colorIntensity = 1;
  rt.behavior = 'idle';
  rt.bend = Math.sin(t * 0.4) * 0.15;
  rt.eyeL = Math.sin(t * 0.9) * 0.5;
  rt.eyeR = Math.sin(t * 0.63 + 2) * 0.5;
  switch (state) {
    case 'walk':
      pose = 'swim';
      speed = 0.32;
      break;
    case 'swim':
      pose = 'swim';
      speed = 1.1;
      height = 1;
      rt.flutter = 0.9;
      rt.tailCurl = 0.1;
      break;
    case 'startle':
      pose = 'startle';
      speed = 2.6;
      height = 1;
      break;
    case 'flick':
      rt.gillFlick = pulse(t, 2.2, 0.3);
      break;
    case 'gape':
      pose = 'feed';
      rt.mouthOpen = pulse(t, 1.8, 0.25);
      break;
    case 'curious':
      rt.behavior = 'inspect_glass';
      break;
    case 'hitch':
      pose = 'hitched';
      rt.tailCurl = 1;
      rt.flutter = 0.2;
      break;
    case 'pregnant':
      pose = 'hitched';
      rt.tailCurl = 1;
      rt.belly = 1;
      break;
    case 'berried':
      rt.belly = 1;
      pose = 'rest';
      break;
    case 'court':
      pose = 'court';
      rt.colorIntensity = 1;
      rt.flutter = 0.8;
      rt.belly = 0.25 + 0.2 * Math.sin(t * 3);
      break;
    case 'strike':
      pose = 'feed';
      rt.mouthOpen = pulse(t, 2.0, 0.12);
      break;
    case 'retreat':
      pose = 'hiding';
      break;
    case 'zen':
      pose = 'hover';
      height = 1;
      break;
    case 'kick':
      pose = 'swim';
      speed = 1.2;
      height = 1;
      break;
    case 'graze':
      pose = 'feed';
      speed = 0;
      break;
    case 'glide':
      pose = 'swim';
      speed = 0.15;
      break;
    case 'idle':
    default:
      pose = 'rest';
  }
  rt.pose = pose;
  rt.speedBL = speed;
  (rt.ai as Record<string, unknown>).galleryHeight = height;
}

function Backdrop() {
  const { scene, gl } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.35;
    return () => {
      env.dispose();
      pm.dispose();
      scene.environment = null;
    };
  }, [scene, gl]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {},
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'varying vec3 vP; void main(){ float h = vP.y*0.5+0.5; vec3 a = vec3(0.012,0.05,0.06); vec3 b = vec3(0.07,0.22,0.24); gl_FragColor = vec4(mix(a,b,smoothstep(0.2,0.95,h)),1.0); }',
      }),
    [],
  );
  return (
    <mesh material={mat} scale={60}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
}

function Creature3D({ entry, pos, lod, state, spin, rot, fx, showGround }: { entry: Entry; pos: [number, number, number]; lod: RenderLod; state: string; spin: boolean; rot: number; fx: ReturnType<typeof createTankFXUniforms>; showGround: boolean }) {
  const group = useRef<THREE.Group>(null);
  const [ground, setGround] = useState(0.06);
  const objRef = useRef<CreatureObject | null>(null);
  const rt = useMemo(() => makeRt(entry), [entry]);
  useEffect(() => {
    const factory = getCreatureFactory(entry.speciesId);
    if (!factory || !group.current) return;
    const creature = {
      id: rt.id,
      speciesId: entry.speciesId,
      sex: entry.sex,
      repro: { stage: 'idle', stageSinceHour: 0, totalClutches: 0, totalOffspringRaised: 0 },
    } as unknown as Creature;
    const obj = factory({ species: speciesOrStub(entry.speciesId), creature, appearance: entry.appearance, lod, quality: 'high', fx });
    objRef.current = obj;
    group.current.add(obj.root);
    setGround((obj.root.userData.groundOffset as number) ?? 0.06);
    return () => {
      obj.dispose();
      objRef.current = null;
    };
  }, [entry, lod, fx, rt]);
  const t0 = Number(q.get('t') ?? 0);
  useFrame((st, dt) => {
    const t = st.clock.elapsedTime + t0;
    const o = objRef.current;
    if (!o || !group.current) return;
    applyState(rt, state, t);
    group.current.rotation.y = spin ? t * 0.35 + rot : rot;
    o.update(rt, Math.min(dt, 0.05), t);
  });
  return (
    <group position={pos}>
      <group ref={group} />
      {showGround && (
        <mesh position={[0, -ground - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.9, 48]} />
          <meshStandardMaterial color="#b9a584" roughness={0.95} />
        </mesh>
      )}
      {!q.get('nolabel') && (
        <Html position={[0, -0.72, 0]} center style={{ color: '#cfe', font: '12px Inter, sans-serif', whiteSpace: 'nowrap', opacity: 0.8 }}>
          {entry.label}
        </Html>
      )}
    </group>
  );
}

function CamSetup({ target, dist, preset }: { target: [number, number, number]; dist: number; preset: string }) {
  const { camera } = useThree();
  useEffect(() => {
    const [x, y, z] = target;
    const d = dist;
    const dirs: Record<string, [number, number, number]> = {
      side: [0, 0.12, 1],
      front: [1, 0.2, 0.08],
      three4: [0.75, 0.45, 0.85],
      top: [0.01, 1, 0.05],
      below: [0.2, -0.5, 1],
      back: [-1, 0.3, 0.5],
      left: [0, 0.12, -1],
    };
    const v = new THREE.Vector3(...(dirs[preset] ?? dirs.three4)).normalize().multiplyScalar(d);
    camera.position.set(x + v.x, y + v.y, z + v.z);
    camera.lookAt(x, y, z);
    camera.updateProjectionMatrix();
  }, [camera, target, dist, preset]);
  return null;
}

export default function CritterartGallery() {
  const [state, setState] = useState(q.get('state') ?? 'idle');
  const speciesParam = q.get('species') ?? 'all';
  const sex = (q.get('sex') as 'male' | 'female') ?? 'male';
  const lod = Number(q.get('lod') ?? 0) as RenderLod;
  const focus = q.get('focus');
  const spin = q.get('rot') === null;
  const rot = Number(q.get('rot') ?? 0);
  const zoom = Number(q.get('zoom') ?? 1);
  const camPreset = q.get('cam') ?? 'three4';
  const fx = useMemo(() => {
    const f = createTankFXUniforms();
    f.uWaterBox.value.set(12, 4, 12);
    f.uCausticIntensity.value = Number(q.get('caustic') ?? 0.7);
    f.uCausticScale.value = 6;
    f.uFogDensity.value = Number(q.get('fog') ?? 0.0);
    f.uWaterTint.value.set(q.get('tint') ? `#${q.get('tint')}` : '#1f6a70');
    f.uLightColor.value.set('#fff6ea').multiplyScalar(1.1);
    const fa = f as unknown as { uAbsorb?: { value: THREE.Vector3 } };
    fa.uAbsorb?.value.set(0.4, 0.1, 0.12).multiplyScalar(Number(q.get('absorb') ?? 0.15));
    return f;
  }, []);
  const entries = useMemo(() => {
    const ids = speciesParam === 'all' ? GALLERY_SPECIES : speciesParam.split(',');
    const all: Entry[] = [];
    for (const id of ids) {
      if (!getCreatureFactory(id)) continue;
      const list = morphEntries(id, sex);
      if (speciesParam === 'all' && id !== 'axolotl' && id !== 'lined_seahorse') all.push(list[0]);
      else all.push(...list);
    }
    return all;
  }, [speciesParam, sex]);
  const shown = focus !== null ? entries.filter((_, i) => String(i) === focus || entries[i].key === focus) : entries;
  const cols = Math.max(1, Math.ceil(Math.sqrt(shown.length * 1.6)));
  const spacing = 1.25;
  const layout = shown.map((e, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const rows = Math.ceil(shown.length / cols);
    return [(c - (cols - 1) / 2) * spacing, Y0 - (r - (rows - 1) / 2) * spacing * 1.1, 0] as [number, number, number];
  });
  const single = shown.length === 1;
  const dist = (single ? 1.5 : Math.max(2.2, cols * spacing * 1.05)) / zoom;
  const presets = ['idle', 'walk', 'swim', 'flick', 'gape', 'curious', 'hitch', 'pregnant', 'court', 'strike', 'berried', 'startle', 'retreat', 'zen', 'kick', 'glide'];
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#03090b' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{ fov: 32, near: 0.01, far: 200, position: [0, Y0, 3] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = Number(q.get('exposure') ?? 1.0);
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Backdrop />
        <ambientLight intensity={0.18} />
        <hemisphereLight args={['#cfe6f0', '#3a2e22', 0.55]} />
        <directionalLight position={[0.6, 6, 1.6]} intensity={2.6} color="#fff4e2" castShadow={!q.get('noshadow')} shadow-mapSize={[2048, 2048]} shadow-normalBias={0.01} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-0.0004} />
        <directionalLight position={[-3, 1.5, 3]} intensity={0.45} color="#9ad7e0" />
        <directionalLight position={[0, -2, -3]} intensity={0.35} color="#4aa3b0" />
        {shown.map((e, i) => (
          <Creature3D key={`${e.key}-${lod}`} entry={e} pos={layout[i]} lod={lod} state={state} spin={spin} rot={rot + (single ? 0 : 0.6)} fx={fx} showGround={single && !q.get('noground')} />
        ))}
        <CamSetup target={single ? [layout[0][0] + Number(q.get('tx') ?? 0), layout[0][1] + Number(q.get('ty') ?? 0), 0] : [0, Y0, 0]} dist={dist} preset={camPreset} />
        <FxClock fx={fx} />
        <OrbitControls makeDefault target={single ? new THREE.Vector3(layout[0][0] + Number(q.get('tx') ?? 0), layout[0][1] + Number(q.get('ty') ?? 0), 0) : new THREE.Vector3(0, Y0, 0)} />
      </Canvas>
      {!q.get('noui') && (
        <div style={{ position: 'fixed', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: '70vw' }}>
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setState(p)}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #5EEAD466', background: p === state ? '#5EEAD4' : '#0b1c1fcc', color: p === state ? '#032' : '#cfe', font: '12px Inter, sans-serif', cursor: 'pointer' }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FxClock({ fx }: { fx: ReturnType<typeof createTankFXUniforms> }) {
  useFrame((st) => {
    fx.uTime.value = st.clock.elapsedTime;
    fx.uCamPos.value.copy(st.camera.position);
  });
  return null;
}
