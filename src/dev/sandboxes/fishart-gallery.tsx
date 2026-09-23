/**
 * Fish art gallery (lane "fishart"): every fish species + morph variants in a lineup under studio light, with an
 * animated swim cycle and a time slider/freeze for stable screenshots.
 *
 * URL: ?sandbox=fishart-gallery [&only=betta,pea_puffer] [&t=1.2&freeze=1] [&speed=1] [&flare=1] [&puff=1]
 *      [&cols=6] [&view=side|34|front|top] [&zoom=1] [&labels=0] [&bend=0.5] [&water=0]
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import '@/render/creatures';
import { getCreatureFactory } from '@/render/creatures/registry';
import type { CreatureObject } from '@/render/creatures/types';
import { createTankFXUniforms } from '@/render/shared/underwater';
import { galleryEntries, makeRuntime, type GalleryEntry } from './fishart-gallery-data';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);

function Fish({ entry, pos, clock, opts }: { entry: GalleryEntry; pos: [number, number, number]; clock: { t: number }; opts: Opts }) {
  const fx = useFx();
  const obj = useMemo<CreatureObject | null>(() => {
    const f = getCreatureFactory(entry.species.id, entry.species.behaviorSet);
    if (!f) return null;
    return f({ species: entry.species, creature: entry.creature, appearance: entry.appearance, lod: opts.lod, quality: 'high', fx });
  }, [entry, fx, opts.lod]);
  const rt = useMemo(() => makeRuntime(entry.species.id), [entry]);
  const settle = useRef(0);
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!obj || !group.current) return;
    group.current.add(obj.root);
    return () => obj.dispose();
  }, [obj]);
  useEffect(() => obj?.setHighlight?.(opts.highlight), [obj, opts.highlight]);
  useFrame((_, dt) => {
    if (!obj) return;
    const t = clock.t;
    const speed = opts.speed;
    rt.speedBL = speed;
    rt.swimPhase = t * (4 + speed * 5) + entry.phase;
    rt.bend = opts.bend + Math.sin(t * 0.7 + entry.phase) * 0.15 * (opts.freeze ? 0 : 1);
    rt.finFlare = opts.flare;
    rt.puff = entry.puff ?? opts.puff;
    rt.flutter = entry.flutter ?? 0;
    rt.eyeL = Math.sin(t * 0.9 + entry.phase) * 0.5;
    rt.eyeR = Math.sin(t * 1.3 + entry.phase + 2) * 0.5;
    rt.mouthOpen = Math.max(0, Math.sin(t * 1.7 + entry.phase)) * opts.mouth;
    rt.colorIntensity = 0.9;
    // frozen: let the smoothing springs settle deterministically for the first frames, then hold still
    const step = opts.freeze ? (settle.current < 60 ? 0.05 : 0) : dt;
    settle.current++;
    obj.update(rt, step, t);
  });
  const s = entry.scale;
  return (
    <group position={pos}>
      <group ref={group} scale={s} rotation={[0, opts.yaw, 0]} />
      {opts.labels && (
        <Html position={[0, -0.34 * s - 0.02, 0]} center style={{ pointerEvents: 'none', whiteSpace: 'nowrap', font: '500 11px Inter, system-ui', color: '#cfe9ef', textShadow: '0 1px 2px #000' }}>
          {entry.label}
        </Html>
      )}
    </group>
  );
}

const FxCtx = { fx: null as ReturnType<typeof createTankFXUniforms> | null };
function useFx() {
  if (!FxCtx.fx) {
    const fx = createTankFXUniforms();
    fx.uWaterBox.value.set(50, 50, 50);
    fx.uTankInv.value.makeTranslation(0, 25, 0);
    fx.uCausticIntensity.value = q.get('water') === '0' ? 0 : 0.55;
    fx.uCausticScale.value = 4;
    fx.uFogDensity.value = q.get('water') === '0' ? 0 : num('fog', 0.02);
    fx.uWaterTint.value.set('#1f5a66');
    fx.uLightColor.value.set('#f4fbff');
    // gallery units are ~20x a real tank (1 unit per fish), so scale absorption down accordingly
    fx.uAbsorb.value.set(0.4, 0.1, 0.12).multiplyScalar(q.get('water') === '0' ? 0 : 0.04);
    FxCtx.fx = fx;
  }
  return FxCtx.fx;
}

function FxDriver({ clock }: { clock: { t: number } }) {
  const fx = useFx();
  const cam = useThree((s) => s.camera);
  useFrame(() => {
    fx.uTime.value = clock.t;
    fx.uCamPos.value.copy(cam.position);
  });
  return null;
}

function Clock({ clock, freeze, tFixed, onT }: { clock: { t: number }; freeze: boolean; tFixed: number; onT: (t: number) => void }) {
  const acc = useRef(0);
  useFrame((_, dt) => {
    if (freeze) clock.t = tFixed;
    else clock.t += dt;
    acc.current += dt;
    if (acc.current > 0.25) {
      acc.current = 0;
      onT(clock.t);
    }
  });
  return null;
}

function Backdrop() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        depthWrite: false,
        uniforms: {},
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
        fragmentShader:
          'varying vec2 vUv; void main(){ vec3 top = vec3(0.07,0.2,0.25); vec3 bot = vec3(0.012,0.04,0.06); float v = smoothstep(0.0,1.0,vUv.y); vec3 c = mix(bot, top, v); float r = length(vUv - vec2(0.5,0.62)); c += vec3(0.05,0.1,0.11) * (1.0 - smoothstep(0.0, 0.7, r)); gl_FragColor = vec4(c, 1.0); }',
      }),
    [],
  );
  return (
    <mesh frustumCulled={false} renderOrder={-10} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

interface Opts {
  speed: number;
  flare: number;
  puff: number;
  bend: number;
  freeze: boolean;
  labels: boolean;
  highlight: boolean;
  mouth: number;
  yaw: number;
  lod: 0 | 1 | 2;
}

export default function FishartGallery() {
  const entries = useMemo(() => {
    const all = galleryEntries(q.get('only')?.split(',').filter(Boolean) ?? null);
    const pick = q.get('pick');
    const picked = pick ? pick.split(',').map((i) => all[Number(i)]).filter(Boolean) : all;
    // filmstrip: the first entry repeated N times, each a fraction of a tail-beat later
    const strip = Number(q.get('strip') ?? 0);
    if (strip > 1 && picked[0]) return Array.from({ length: strip }, (_, i) => ({ ...picked[0], creature: picked[0].creature ? { ...picked[0].creature, id: `${picked[0].creature.id}#${i}` } : null, key: `${picked[0].key}#${i}`, phase: picked[0].phase + (i * Math.PI * 2) / strip, label: `${picked[0].label} · φ${i}` }));
    return picked;
  }, []);
  const cols = num('cols', Math.min(6, Math.max(1, Math.ceil(Math.sqrt(entries.length * 1.6)))));
  const spacingX = num('sx', 1.25);
  const spacingY = num('sy', 0.8);
  const [freeze, setFreeze] = useState(q.get('freeze') === '1');
  const [tFixed, setTFixed] = useState(num('t', 1.2));
  const [speed, setSpeed] = useState(num('speed', 0.6));
  const [flare, setFlare] = useState(num('flare', 0));
  const [puff, setPuff] = useState(num('puff', 0));
  const [tNow, setTNow] = useState(0);
  const clock = useMemo(() => ({ t: num('t', 1.2) }), []);
  const view = q.get('view') ?? 'side';
  const opts: Opts = {
    speed,
    flare,
    puff,
    bend: num('bend', 0),
    freeze,
    labels: q.get('labels') !== '0',
    highlight: q.get('hl') === '1',
    mouth: num('mouth', 0),
    yaw: view === '34' ? -0.55 : view === 'front' ? -Math.PI / 2 : 0,
    lod: num('lod', 0) as 0 | 1 | 2,
  };
  const rows = Math.ceil(entries.length / cols);
  const w = (cols - 1) * spacingX;
  const h = (rows - 1) * spacingY;
  const zoom = num('zoom', 1);
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const vt = Math.tan((30 * Math.PI) / 360);
  const dist = Math.max(1.2, Math.max((w + spacingX) / (2 * vt * aspect), (h + spacingY) / (2 * vt)) * 1.02) / zoom;
  const camPos: [number, number, number] = view === 'top' ? [0, dist, 0.01] : [0, 0.12 * dist, dist];
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#03080b' }}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{ fov: 30, near: 0.01, far: 100, position: camPos }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Backdrop />
        <FxDriver clock={clock} />
        <Clock clock={clock} freeze={freeze} tFixed={tFixed} onT={setTNow} />
        <ambientLight intensity={0.35} />
        <hemisphereLight args={['#dff0f7', '#2a3a3c', 1.1]} />
        <directionalLight position={[1.0, 5, 2.2]} intensity={3.2} color="#fff8ee" />
        <directionalLight position={[-3, 1.5, 2]} intensity={0.8} color="#bfe6ff" />
        <directionalLight position={[2, -1, -3]} intensity={0.9} color="#7fc8ff" />
        {entries.map((e, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          return <Fish key={e.key} entry={e} clock={clock} opts={opts} pos={[c * spacingX - w / 2, h / 2 - r * spacingY, 0]} />;
        })}
        <OrbitControls makeDefault target={[0, 0, 0]} />
      </Canvas>
      <div style={{ position: 'fixed', left: 12, bottom: 12, display: 'flex', gap: 14, alignItems: 'center', font: '12px Inter, system-ui', color: '#cfe', background: 'rgba(0,0,0,.45)', padding: '8px 12px', borderRadius: 10 }}>
        <label>
          <input type="checkbox" checked={freeze} onChange={(e) => setFreeze(e.target.checked)} /> freeze
        </label>
        <label>
          t <input type="range" min={0} max={20} step={0.01} value={freeze ? tFixed : tNow} onChange={(e) => { setFreeze(true); setTFixed(Number(e.target.value)); }} />
        </label>
        <label>
          speed <input type="range" min={0} max={4} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
        </label>
        <label>
          flare <input type="range" min={0} max={1} step={0.01} value={flare} onChange={(e) => setFlare(Number(e.target.value))} />
        </label>
        <label>
          puff <input type="range" min={0} max={1} step={0.01} value={puff} onChange={(e) => setPuff(Number(e.target.value))} />
        </label>
        <span>{entries.length} fish</span>
      </div>
    </div>
  );
}
