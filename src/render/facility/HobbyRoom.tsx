/**
 * The cosy hobby room: window with a live sky (driven by the game hour), curtains, bookshelf, armchair, reading
 * lamp, houseplant, rug, open door and framed paintings. Lit warm; the window light follows the time of day.
 * OWNER: lane "facility".
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getGame } from '@/state/game';
import { getFacilityLevel, type FacilityPropDef } from '@/data/facilities';
import { visualRng } from '@/sim/rng';
import { hourOfDay } from '@/sim/time';
import { Batch, box, rbox, cyl, lathe, tube, leaf, sphere, noPick } from './kit';
import { Batched } from './Batched';
import type { PropMaterials } from './materials';
import { acquireTexture, releaseTexture, rug as rugCanvas, painting } from './textures';
import { useQualityBudget } from '../shared/quality';
import { createSkyMaterial, updateSkyMaterial } from './skyMaterial';

// ───────────────────────────── sky ─────────────────────────────

function Sky({ w, h }: { w: number; h: number }) {
  const mat = useMemo(() => createSkyMaterial(), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(({ clock }) => updateSkyMaterial(mat, clock.elapsedTime));
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => noPick(ref.current), []);
  return (
    <mesh ref={ref} material={mat}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

/** Light entering through the window, coloured and angled by the time of day. */
function WindowLight({ pos, target }: { pos: [number, number, number]; target: [number, number, number] }) {
  const light = useRef<THREE.SpotLight>(null);
  const budget = useQualityBudget();
  const tgt = useMemo(() => new THREE.Object3D(), []);
  const day = useMemo(() => new THREE.Color('#fff1dc'), []);
  const dusk = useMemo(() => new THREE.Color('#ffae6b'), []);
  const night = useMemo(() => new THREE.Color('#7f9fd6'), []);
  useEffect(() => {
    tgt.position.set(...target);
    if (light.current) light.current.target = tgt;
  }, [tgt, target]);
  useFrame(() => {
    const l = light.current;
    const g = getGame();
    if (!l || !g) return;
    const h = hourOfDay(g.clock.hour);
    const dayK = THREE.MathUtils.smoothstep(h, 5.5, 8) * (1 - THREE.MathUtils.smoothstep(h, 18, 20.5));
    const duskK = Math.exp(-Math.pow((h - 19) / 1.1, 2)) + Math.exp(-Math.pow((h - 6.6) / 0.9, 2));
    l.color.copy(night).lerp(day, dayK).lerp(dusk, Math.min(1, duskK) * 0.7);
    l.intensity = 2 + dayK * 16 + Math.min(1, duskK) * 9;
    // the sun moves across: shift the target a little through the day
    tgt.position.set(target[0] - (h - 12) * 0.08, target[1], target[2]);
  });
  return (
    <>
      <primitive object={tgt} />
      <spotLight ref={light} position={pos} angle={0.7} penumbra={1} distance={10} decay={1.4} castShadow={budget.shadows} shadow-mapSize-width={budget.shadowMap} shadow-mapSize-height={budget.shadowMap} shadow-bias={-0.0004} shadow-normalBias={0.01} shadow-radius={1.6} />
    </>
  );
}

// ───────────────────────────── furniture builders ─────────────────────────────

function buildBookshelf(): Batch {
  const b = new Batch();
  const W = 1.12;
  const H = 2.02;
  const D = 0.32;
  b.add('walnut', rbox(0.026, H, D, 0.004), [-W / 2, H / 2, 0]);
  b.add('walnut', rbox(0.026, H, D, 0.004), [W / 2, H / 2, 0]);
  b.add('walnut', rbox(W + 0.05, 0.03, D + 0.02, 0.006), [0, H + 0.015, 0.005]);
  b.add('walnut', box(W - 0.02, 0.07, D - 0.03), [0, 0.035, 0.005]);
  b.add('smoked', box(W, H - 0.05, 0.012), [0, H / 2, -D / 2 + 0.006]);
  const shelves = [0.07, 0.44, 0.81, 1.18, 1.55];
  for (const y of shelves) b.add('walnut', box(W - 0.02, 0.022, D - 0.02), [0, y + 0.011, 0]);
  // ornaments: small potted plant, a vase, a framed photo, a stacked pile
  b.add('terracotta', lathe([[0.001, 0], [0.045, 0.0], [0.055, 0.09], [0.06, 0.1], [0.052, 0.1]], 14), [0.4, 1.575, 0.02]);
  const rng = visualRng('shelf-plant');
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng.next();
    b.add(i % 2 ? 'leaf' : 'leafLight', leaf(0.12 + rng.next() * 0.05, 0.035, { arch: 0.9, cup: 0.3 }), [0.4, 1.66, 0.02], [-0.5 - rng.next() * 0.6, a, 0]);
  }
  b.add('ceramic', lathe([[0.001, 0], [0.04, 0], [0.055, 0.06], [0.04, 0.16], [0.025, 0.2], [0.03, 0.22]], 18), [-0.38, 1.21, 0.03]);
  b.add('brass', box(0.14, 0.18, 0.012), [0.38, 0.92, -0.05], [-0.12, -0.2, 0]);
  b.add('ceramic', box(0.11, 0.15, 0.004), [0.38, 0.92, -0.043], [-0.12, -0.2, 0]);
  return b;
}

/** Books as a single instanced mesh. */
function Books({ mats }: { mats: PropMaterials }) {
  const { geo, mesh } = useMemo(() => {
    const geo = rbox(1, 1, 1, 0.08, 1);
    const shelves = [0.07, 0.44, 0.81, 1.18];
    const rng = visualRng('books');
    const palette = ['#7a2e2a', '#2b3e5a', '#b9893b', '#2f4d3a', '#d8cdb5', '#3b3a3f', '#8a5a3c', '#5b6d7a', '#a14b3b', '#e2d9c4', '#44556b', '#6e3f55'];
    const items: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let s = 0; s < shelves.length; s++) {
      const y0 = shelves[s] + 0.022;
      let x = -0.52;
      const stop = s === 3 ? 0.18 : s === 2 ? 0.2 : 0.53;
      while (x < stop) {
        if (rng.next() < 0.08) {
          x += 0.06 + rng.next() * 0.08;
          continue;
        }
        const t = 0.018 + rng.next() * 0.03;
        const h = 0.19 + rng.next() * 0.1;
        const d = 0.15 + rng.next() * 0.07;
        if (x + t > stop) break;
        const lean = rng.next() < 0.06 ? 0.18 : 0;
        e.set(0, 0, lean);
        q.setFromEuler(e);
        const m = new THREE.Matrix4().compose(new THREE.Vector3(x + t / 2 + lean * h * 0.5, y0 + (h / 2) * Math.cos(lean), 0.02 - (0.2 - d) / 2), q, new THREE.Vector3(t, h, d));
        const col = new THREE.Color(palette[Math.floor(rng.next() * palette.length)]).multiplyScalar(0.75 + rng.next() * 0.35);
        items.push({ m, c: col });
        x += t + 0.002;
      }
    }
    // a horizontal stack
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(0.38, 0.44 + 0.022 + 0.016 + k * 0.032, 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, k * 0.2 - 0.3, 0)), new THREE.Vector3(0.24 - k * 0.02, 0.03, 0.17));
      items.push({ m, c: new THREE.Color(palette[(k * 5) % palette.length]) });
    }
    const mesh = new THREE.InstancedMesh(geo, mats.book, items.length);
    items.forEach((it, i) => {
      mesh.setMatrixAt(i, it.m);
      mesh.setColorAt(i, it.c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    noPick(mesh);
    return { geo, mesh };
  }, [mats.book]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <primitive object={mesh} />;
}

function buildArmchair(): Batch {
  const b = new Batch();
  // tapered oak legs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('oak', cyl(0.018, 0.012, 0.2, 10), [sx * 0.33, 0.1, sz * 0.3], [sz * 0.12, 0, -sx * 0.12]);
  b.add('velvet', rbox(0.8, 0.2, 0.74, 0.05, 3), [0, 0.3, 0]);
  b.add('velvet', rbox(0.6, 0.14, 0.58, 0.06, 3), [0, 0.46, 0.05]);
  b.add('velvet', rbox(0.66, 0.52, 0.15, 0.06, 3), [0, 0.68, -0.3], [-0.2, 0, 0]);
  for (const sx of [-1, 1]) b.add('velvet', rbox(0.11, 0.24, 0.72, 0.05, 3), [sx * 0.36, 0.5, 0]);
  b.add('pillow', rbox(0.34, 0.3, 0.1, 0.06, 3), [0.1, 0.62, -0.16], [-0.35, 0.25, 0.1]);
  return b;
}

function buildSideTable(): Batch {
  const b = new Batch();
  b.add('oak', cyl(0.23, 0.23, 0.028, 32), [0, 0.56, 0]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.add('walnut', tube([[Math.cos(a) * 0.12, 0.55, Math.sin(a) * 0.12], [Math.cos(a) * 0.17, 0.25, Math.sin(a) * 0.17], [Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2]], 0.012, 8, 6));
  }
  // mug + saucer
  b.add('ceramic', lathe([[0.001, 0], [0.036, 0.0], [0.04, 0.02], [0.042, 0.085], [0.038, 0.085], [0.036, 0.02], [0.001, 0.012]], 18), [0.06, 0.574, 0.05]);
  b.add('ceramic', tube([[0.1, 0.645, 0.05], [0.125, 0.63, 0.05], [0.123, 0.6, 0.05], [0.1, 0.59, 0.05]], 0.006, 8, 5));
  b.add('ceramic', cyl(0.07, 0.06, 0.008, 20), [0.06, 0.578, 0.05]);
  b.add('book', rbox(0.2, 0.03, 0.14, 0.006), [-0.08, 0.59, -0.04], [0, 0.4, 0]);
  return b;
}

function buildFloorLamp(): Batch {
  const b = new Batch();
  b.add('blackMetal', cyl(0.14, 0.15, 0.025, 28), [0, 0.0125, 0]);
  b.add('brass', cyl(0.011, 0.011, 1.42, 10), [0, 0.72, 0]);
  b.add('brass', cyl(0.03, 0.03, 0.03, 12), [0, 1.43, 0]);
  b.add('shade', lathe([[0.2, 0], [0.17, 0.3]], 32).translate(0, 0, 0), [0, 1.36, 0]);
  b.add('bulb', sphere(0.035, 12, 8), [0, 1.47, 0]);
  return b;
}

function buildHouseplant(): Batch {
  const b = new Batch();
  b.add('terracotta', lathe([[0.001, 0], [0.15, 0], [0.19, 0.3], [0.21, 0.32], [0.215, 0.36], [0.19, 0.36], [0.18, 0.33]], 28));
  b.add('soil', cyl(0.18, 0.18, 0.01, 24), [0, 0.33, 0]);
  const rng = visualRng('monstera');
  for (let s = 0; s < 7; s++) {
    const a = (s / 7) * Math.PI * 2 + rng.next() * 0.5;
    const r = 0.25 + rng.next() * 0.25;
    const top: [number, number, number] = [Math.cos(a) * r, 0.75 + rng.next() * 0.6, Math.sin(a) * r];
    b.add('leafLight', tube([[0, 0.33, 0], [top[0] * 0.3, 0.33 + (top[1] - 0.33) * 0.55, top[2] * 0.3], top], 0.007, 10, 4));
    const l = leaf(0.34 + rng.next() * 0.12, 0.3 + rng.next() * 0.08, { arch: 0.35, cup: 0.35, seg: 10 });
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...top), new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.1 + rng.next() * 0.5, -a + Math.PI / 2, 0, 'YXZ')), new THREE.Vector3(1, 1, 1));
    b.addMatrix(s % 3 === 0 ? 'leafLight' : 'leaf', l, m);
  }
  return b;
}

function buildDoor(open = 1.35): Batch {
  const b = new Batch();
  // panel door; local origin at the hinge, leaf extends along −x (closed) and rotates about y
  const W = 0.86;
  const H = 2.0;
  const g = new THREE.Group();
  void g;
  const leafParts: [THREE.BufferGeometry, [number, number, number]][] = [[box(W, H, 0.04), [-W / 2, H / 2, 0]]];
  for (const [py, ph] of [
    [1.45, 0.8],
    [0.52, 0.72],
  ] as const) {
    for (const s of [-1, 1]) leafParts.push([box(W - 0.2, 0.02, 0.012), [-W / 2, py + (s * ph) / 2, 0.024 * s]]);
    for (const s of [-1, 1]) leafParts.push([box(W - 0.2, 0.02, 0.012), [-W / 2, py + (s * ph) / 2, -0.024 * s]]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) leafParts.push([box(0.02, ph, 0.012), [-W / 2 + sx * (W / 2 - 0.1), py, sz * 0.024]]);
  }
  const rot = new THREE.Matrix4().makeRotationY(open);
  for (const [geo, p] of leafParts) {
    const m = new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]).premultiply(rot);
    b.addMatrix('paint', geo, m);
  }
  b.addMatrix('brass', sphere(0.028, 10, 8), new THREE.Matrix4().makeTranslation(-W + 0.07, 1.0, 0.05).premultiply(rot));
  return b;
}

function buildWindow(w: number, h: number): Batch {
  const b = new Batch();
  const f = 0.045;
  // sash frame + muntins (window centred at origin, bottom at y = 0)
  b.add('paint', box(w, f, 0.06), [0, f / 2, 0]);
  b.add('paint', box(w, f, 0.06), [0, h - f / 2, 0]);
  b.add('paint', box(f, h, 0.06), [-w / 2 + f / 2, h / 2, 0]);
  b.add('paint', box(f, h, 0.06), [w / 2 - f / 2, h / 2, 0]);
  b.add('paint', box(w, 0.05, 0.07), [0, h * 0.5, 0]);
  b.add('paint', box(0.025, h, 0.045), [0, h / 2, 0]);
  b.add('paint', box(w, 0.022, 0.045), [0, h * 0.25, 0]);
  b.add('paint', box(w, 0.022, 0.045), [0, h * 0.75, 0]);
  b.add('glass', box(w - f, h - f, 0.004), [0, h / 2, 0.01]);
  // curtain rod + finials
  b.add('brass', cyl(0.012, 0.012, w + 0.9, 10), [0, h + 0.2, 0.14], [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) b.add('brass', sphere(0.028, 10, 8), [s * (w / 2 + 0.47), h + 0.2, 0.14]);
  for (const s of [-1, 1]) b.add('brass', cyl(0.008, 0.008, 0.1, 6), [s * (w / 2 + 0.3), h + 0.2, 0.08], [Math.PI / 2, 0, 0]);
  return b;
}

function curtainGeo(w: number, h: number, seed: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h, 28, 6);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (y + h / 2) / h; // 0 bottom .. 1 top
    const folds = Math.sin(x * 38 + seed) * 0.022 + Math.sin(x * 17 + seed * 2) * 0.012;
    pos.setZ(i, folds * (0.8 + 0.4 * (1 - t)));
    // gathered slightly toward the top
    pos.setX(i, x * (0.92 + 0.08 * (1 - t)));
  }
  g.computeVertexNormals();
  return g;
}

function buildCurtains(winW: number, winH: number, sillY: number): Batch {
  const b = new Batch();
  const cw = 0.46;
  const top = sillY + winH + 0.18;
  const ch = top - 0.03;
  for (const s of [-1, 1]) b.add('curtain', curtainGeo(cw, ch, s * 3.1), [s * (winW / 2 + cw / 2 - 0.08), top - ch / 2, 0.13]);
  return b;
}

function Rug({ prop }: { prop: FacilityPropDef }) {
  const key = 'rug:hobby';
  const mat = useMemo(() => {
    const map = acquireTexture(key, () => rugCanvas('hobby-rug', { field: '#8c3f2e', border: '#2c3a4a', accent: '#d8b27a', ink: '#1d2430' }), { repeat: false });
    return new THREE.MeshStandardMaterial({ map, roughness: 0.97, bumpMap: map, bumpScale: 0.4 });
  }, []);
  useEffect(
    () => () => {
      mat.dispose();
      releaseTexture(key);
    },
    [mat],
  );
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => noPick(ref.current), []);
  return (
    <mesh ref={ref} position={[prop.x, 0.006, prop.z]} rotation={[0, prop.rotY, 0]} material={mat} receiveShadow>
      <boxGeometry args={[prop.w, 0.012, prop.d]} />
    </mesh>
  );
}

function Painting({ pos, rotY, w, h, seed, mood, mats }: { pos: [number, number, number]; rotY: number; w: number; h: number; seed: string; mood: 'sea' | 'reef' | 'dusk'; mats: PropMaterials }) {
  const key = `painting:${seed}`;
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: acquireTexture(key, () => painting(seed, mood), { repeat: false }), roughness: 0.8 }), [key, seed, mood]);
  useEffect(
    () => () => {
      mat.dispose();
      releaseTexture(key);
    },
    [mat, key],
  );
  const ref = useRef<THREE.Group>(null);
  useEffect(() => noPick(ref.current), []);
  const f = 0.035;
  return (
    <group ref={ref} position={pos} rotation={[0, rotY, 0]}>
      <mesh material={mats.walnut} position={[0, h / 2 + f / 2, 0.015]} castShadow>
        <boxGeometry args={[w + f * 2, f, 0.03]} />
      </mesh>
      <mesh material={mats.walnut} position={[0, -h / 2 - f / 2, 0.015]} castShadow>
        <boxGeometry args={[w + f * 2, f, 0.03]} />
      </mesh>
      <mesh material={mats.walnut} position={[-w / 2 - f / 2, 0, 0.015]} castShadow>
        <boxGeometry args={[f, h, 0.03]} />
      </mesh>
      <mesh material={mats.walnut} position={[w / 2 + f / 2, 0, 0.015]} castShadow>
        <boxGeometry args={[f, h, 0.03]} />
      </mesh>
      <mesh material={mats.ceramic} position={[0, 0, 0.004]}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh material={mat} position={[0, 0, 0.006]}>
        <planeGeometry args={[w * 0.84, h * 0.84]} />
      </mesh>
    </group>
  );
}

function LampLight({ pos }: { pos: [number, number, number] }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame((_, dt) => {
    const g = getGame();
    const l = ref.current;
    if (!g || !l) return;
    const h = hourOfDay(g.clock.hour);
    // the lamp is on in the evening and at night, softly during the day
    const eve = h >= 17 || h < 7 ? 1 : 0.7;
    // lane:qa-visual — turned down to a reading glow in the small hours so the moonlit tank carries the room
    l.intensity += (4.2 * eve * (1 - 0.45 * lateNight(h)) - l.intensity) * (1 - Math.exp(-3.1 * Math.min(dt, 0.1))); // lane:pc-perf — per second, not per frame
  });
  return <pointLight ref={ref} position={pos} color="#ffbe78" intensity={3} distance={8} decay={1.5} />;
}

/**
 * lane:qa-visual — 0 through the day and evening, easing to 1 between ~22:30 and ~23:30 and back to 0 around dawn.
 * Late at night the household is asleep: the ceiling light dims so the tank (lights out, moonlight on) glows in a
 * dark room instead of looking switched off in a daylit one.
 */
function lateNight(h: number): number {
  return h >= 12 ? THREE.MathUtils.smoothstep(h, 22.3, 23.6) : 1 - THREE.MathUtils.smoothstep(h, 5.4, 6.6);
}

/** Warm ceiling light; dims in the small hours (see lateNight). */
function CeilingLight({ pos }: { pos: [number, number, number] }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame((_, dt) => {
    const g = getGame();
    const l = ref.current;
    if (!g || !l) return;
    const target = 2.2 * (1 - 0.75 * lateNight(hourOfDay(g.clock.hour)));
    l.intensity += (target - l.intensity) * (1 - Math.exp(-3.1 * Math.min(dt, 0.1))); // lane:pc-perf
  });
  return <pointLight ref={ref} position={pos} color="#ffd8a8" intensity={2.2} distance={7} decay={1.4} />;
}

// ───────────────────────────── room ─────────────────────────────

export function HobbyRoom({ mats, width, depth }: { mats: PropMaterials; width: number; depth: number }) {
  const def = getFacilityLevel('hobby_room');
  const props = def.props;
  const find = (k: FacilityPropDef['kind']) => props.find((p) => p.kind === k);
  const shelf = find('bookshelf');
  const chair = find('armchair');
  const table = find('side_table');
  const lamp = find('floor_lamp');
  const plant = find('houseplant');
  const rug = find('rug');
  // window on the back wall (see levelOpenings)
  const win = { x0: 0.85, x1: 1.85, y0: 0.95, y1: 2.15 };
  const winW = win.x1 - win.x0;
  const winH = win.y1 - win.y0;
  const backZ = -depth / 2;
  const rightX = width / 2;
  return (
    <group name="hobby-room">
      {rug && <Rug prop={rug} />}
      {shelf && (
        <group position={[shelf.x + 0.01, 0, shelf.z]} rotation={[0, shelf.rotY, 0]}>
          <Batched mats={mats} deps={[]} build={buildBookshelf} />
          <Books mats={mats} />
        </group>
      )}
      {chair && <Batched mats={mats} deps={[]} build={buildArmchair} position={[chair.x, 0, chair.z]} rotation={[0, chair.rotY, 0]} />}
      {table && <Batched mats={mats} deps={[]} build={buildSideTable} position={[table.x, 0, table.z]} rotation={[0, table.rotY, 0]} />}
      {lamp && (
        <group position={[lamp.x, 0, lamp.z]}>
          <Batched mats={mats} deps={[]} build={buildFloorLamp} castShadow={false} />
          <LampLight pos={[0, 1.5, 0]} />
        </group>
      )}
      {plant && <Batched mats={mats} deps={[]} build={buildHouseplant} position={[plant.x, 0, plant.z]} />}
      {/* window: frame + sky + curtains, and the light it lets in */}
      <group position={[(win.x0 + win.x1) / 2, win.y0, backZ]}>
        <Batched mats={mats} deps={[winW, winH]} build={() => buildWindow(winW, winH)} castShadow={false} />
        <Batched mats={mats} deps={[winW, winH]} build={() => buildCurtains(winW, winH, 0)} />
        <group position={[0, winH / 2, -0.2]}>
          <Sky w={winW + 0.4} h={winH + 0.3} />
        </group>
      </group>
      <WindowLight pos={[(win.x0 + win.x1) / 2 - 0.1, 2.5, backZ - 1.4]} target={[0.4, 0, 0.6]} />
      <CeilingLight pos={[0, 2.45, 0.2]} />
      {/* open door on the right wall, hinged at its front edge */}
      <Batched mats={mats} deps={[]} build={() => buildDoor(1.32)} position={[rightX - 0.03, 0, 1.45 + 0.43]} rotation={[0, Math.PI / 2, 0]} />
      <Painting pos={[-width / 2 + 0.005, 1.62, 1.05]} rotY={Math.PI / 2} w={0.62} h={0.44} seed="hobby-art-1" mood="sea" mats={mats} />
      <Painting pos={[-1.55, 1.55, backZ + 0.005]} rotY={0} w={0.42} h={0.56} seed="hobby-art-2" mood="dusk" mats={mats} />
    </group>
  );
}
