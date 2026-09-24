/**
 * Props, signage and lighting for the public facility levels (specialty shop → grand hall), plus the soft
 * spot-lit light pools that make every exhibit glow like a public aquarium. OWNER: lane "facility".
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FacilityLevelId } from '@/types';
import { getGame, useGameSelector } from '@/state/game';
import { getUI } from '@/state/ui';
import { getFacilityLevel, type FacilityPropDef } from '@/data/facilities';
import { visualRng } from '@/sim/rng';
import { hourOfDay } from '@/sim/time';
import { tankFootprint } from '@/sim/facility/layout';
import { standHeight } from '@/sim/tankSpace';
import { Batch, box, rbox, cyl, lathe, leaf, noPick } from './kit';
import { Batched } from './Batched';
import type { PropMaterials } from './materials';
import { ROOM_STYLES, poolColor } from './styles';
import { exhibitExtent } from './bounds';
import { acquireTexture, releaseTexture, radialGlow, wallWash, signCanvas, medallion } from './textures';

// ───────────────────────────── builders ─────────────────────────────

function buildCounter(w: number, d: number): Batch {
  const b = new Batch();
  const h = 1.0;
  b.add('smoked', box(w, h - 0.06, d - 0.08), [0, (h - 0.06) / 2, -0.02]);
  // vertical oak slats on the customer side
  const n = Math.floor(w / 0.055);
  for (let i = 0; i < n; i++) b.add('oak', rbox(0.04, h - 0.1, 0.02, 0.006), [-w / 2 + 0.03 + i * (w - 0.06) / (n - 1), (h - 0.1) / 2 + 0.02, d / 2 - 0.045]);
  b.add('blackMetal', box(w, 0.04, d - 0.1), [0, 0.02, -0.03]);
  b.add('quartz', rbox(w + 0.06, 0.05, d + 0.02, 0.012), [0, h - 0.025, 0]);
  // register: screen on a stand, card reader, a potted succulent
  b.add('blackMetal', box(0.3, 0.2, 0.02), [w * 0.2, h + 0.2, -0.1], [-0.25, Math.PI, 0]);
  b.add('screen', box(0.27, 0.17, 0.004), [w * 0.2, h + 0.2, -0.112], [-0.25, Math.PI, 0]);
  b.add('blackMetal', cyl(0.015, 0.05, 0.12, 10), [w * 0.2, h + 0.06, -0.08]);
  b.add('blackMetal', rbox(0.08, 0.03, 0.14, 0.01), [w * 0.02, h + 0.015, 0.08], [0, 0.3, 0]);
  b.add('ceramic', lathe([[0.001, 0], [0.05, 0], [0.06, 0.08], [0.055, 0.08]], 14), [-w * 0.32, h, 0.05]);
  const rng = visualRng('counter-succulent');
  for (let i = 0; i < 8; i++) b.add('leafLight', leaf(0.06 + rng.next() * 0.03, 0.03, { arch: 0.3, cup: 0.6 }), [-w * 0.32, h + 0.075, 0.05], [-0.6 - rng.next() * 0.5, (i / 8) * Math.PI * 2, 0]);
  return b;
}

function buildMerchShelf(w: number, d: number, h: number): Batch {
  const b = new Batch();
  const posts = Math.max(2, Math.round(w / 1.2) + 1);
  for (let i = 0; i < posts; i++) {
    const x = -w / 2 + (i * w) / (posts - 1);
    b.add('blackMetal', box(0.03, h, 0.03), [x, h / 2, d / 2 - 0.03]);
    b.add('blackMetal', box(0.03, h, 0.03), [x, h / 2, -d / 2 + 0.03]);
  }
  b.add('smoked', box(w, h - 0.05, 0.012), [0, h / 2, -d / 2 + 0.01]);
  for (const y of [0.12, 0.62, 1.12, 1.62]) if (y < h - 0.1) b.add('oak', rbox(w, 0.025, d, 0.005), [0, y, 0]);
  return b;
}

/** Products on shelves: tubs, jars and boxes (instanced). */
function Products({ w, d, h, mats, seed }: { w: number; d: number; h: number; mats: PropMaterials; seed: string }) {
  const { mesh, geo } = useMemo(() => {
    const geo = rbox(1, 1, 1, 0.12, 1);
    const rng = visualRng(seed);
    const palette = ['#e9e3d4', '#2f6f73', '#d7663b', '#2b3a4f', '#e1b94c', '#86a863', '#b6443b', '#f3efe6', '#3f7ec1'];
    const items: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    for (const y of [0.12, 0.62, 1.12, 1.62]) {
      if (y > h - 0.3) continue;
      let x = -w / 2 + 0.05;
      while (x < w / 2 - 0.12) {
        const pw = 0.06 + rng.next() * 0.08;
        const ph = 0.08 + rng.next() * 0.16;
        const pd = Math.min(d - 0.08, 0.08 + rng.next() * 0.12);
        const col = new THREE.Color(palette[Math.floor(rng.next() * palette.length)]);
        const rows = rng.next() < 0.5 ? 2 : 1;
        for (let r = 0; r < rows; r++) {
          const z = d / 2 - 0.06 - pd / 2 - r * (pd + 0.02);
          if (z - pd / 2 < -d / 2 + 0.02) break;
          items.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x + pw / 2, y + 0.0125 + ph / 2, z), new THREE.Quaternion(), new THREE.Vector3(pw, ph, pd)), c: col });
        }
        x += pw + 0.012 + (rng.next() < 0.1 ? 0.1 : 0);
      }
    }
    const mesh = new THREE.InstancedMesh(geo, mats.book, items.length);
    items.forEach((it, i) => {
      mesh.setMatrixAt(i, it.m);
      mesh.setColorAt(i, it.c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    noPick(mesh);
    return { mesh, geo };
  }, [w, d, h, mats.book, seed]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <primitive object={mesh} />;
}

export function buildPlanterProp(w: number, seed: string, tall = 1): Batch {
  const b = new Batch();
  const r = w / 2;
  const h = 0.55 * tall;
  b.add('concrete', lathe([[0.001, 0], [r * 0.86, 0], [r, h * 0.9], [r, h], [r * 0.9, h], [r * 0.88, h * 0.92]], 28));
  b.add('soil', cyl(r * 0.87, r * 0.87, 0.01, 20), [0, h * 0.92, 0]);
  // snake-plant style upright blades
  const rng = visualRng(seed);
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = rng.next() * Math.PI * 2;
    const rr = rng.next() * r * 0.55;
    const len = (0.55 + rng.next() * 0.55) * tall;
    b.add(i % 3 ? 'leaf' : 'leafLight', leaf(len, 0.06 + rng.next() * 0.03, { arch: 0.08, cup: 0.5 }), [Math.cos(a) * rr, h * 0.92, Math.sin(a) * rr], [-0.08 + rng.next() * 0.16, rng.next() * Math.PI, (rng.next() - 0.5) * 0.25]);
  }
  return b;
}

function buildReception(w: number, d: number): Batch {
  const b = new Batch();
  const h = 1.05;
  b.add('smoked', rbox(w, h - 0.05, d, 0.12, 3), [0, (h - 0.05) / 2, 0]);
  b.add('stone', rbox(w + 0.08, 0.05, d + 0.08, 0.02), [0, h - 0.025, 0]);
  b.add('brass', box(w * 0.98, 0.012, 0.01), [0, 0.12, d / 2 + 0.002]);
  b.add('blackMetal', box(0.5, 0.32, 0.03), [-w * 0.2, h + 0.28, -0.15], [0, Math.PI, 0]);
  b.add('screen', box(0.46, 0.28, 0.004), [-w * 0.2, h + 0.28, -0.167], [0, Math.PI, 0]);
  b.add('blackMetal', cyl(0.02, 0.07, 0.12, 10), [-w * 0.2, h + 0.06, -0.15]);
  return b;
}

function buildTicketGate(w: number): Batch {
  const b = new Batch();
  const n = Math.max(2, Math.round(w / 0.9));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.15 + (i * (w - 0.3)) / (n - 1);
    b.add('steel', rbox(0.22, 1.0, 0.5, 0.03), [x, 0.5, 0]);
    b.add('screen', box(0.14, 0.05, 0.02), [x, 0.96, 0.25]);
    if (i < n - 1) b.add('glass', box(0.36, 0.5, 0.012), [x + 0.28, 0.72, 0]);
  }
  return b;
}

function columnGeo(r: number, h: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r * 1.04, h, 48, 12, true);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 - 0.045 * Math.pow(Math.abs(Math.sin(a * 12)), 0.6);
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

function buildColumn(w: number, h: number): Batch {
  const b = new Batch();
  // everything that reaches tank height stays inside the prop's blocking footprint (w × w): tanks may be placed a
  // couple of centimetres from it, so an overhanging plinth would butt into their stands and glass
  const r = w * 0.37;
  const plinth = w - 0.06;
  b.add('marble', rbox(plinth, 0.32, plinth, 0.02), [0, 0.16, 0]);
  b.add('marble', lathe([[Math.min(r * 1.22, plinth / 2 - 0.01), 0], [Math.min(r * 1.22, plinth / 2 - 0.01), 0.08], [r * 1.1, 0.12], [r * 1.06, 0.2]], 40), [0, 0.32, 0]);
  b.add('marble', columnGeo(r, h - 1.1), [0, 0.52 + (h - 1.1) / 2, 0]);
  b.add('marble', lathe([[r * 1.02, 0], [r * 1.1, 0.1], [r * 1.35, 0.26], [r * 1.35, 0.3]], 40), [0, h - 0.58, 0]);
  b.add('marble', rbox(w + 0.2, 0.28, w + 0.2, 0.02), [0, h - 0.14, 0]);
  b.add('brass', cyl(r * 1.02, r * 1.02, 0.03, 40), [0, 1.2, 0]);
  return b;
}

// ───────────────────────────── signage ─────────────────────────────

function Sign({ text, sub, pos, rotY = 0, w, h, fg, glow, emissive = 1.4 }: { text: string; sub?: string; pos: [number, number, number]; rotY?: number; w: number; h: number; fg: string; glow?: string; emissive?: number }) {
  const mat = useMemo(() => {
    const tex = new THREE.CanvasTexture(signCanvas(text, { w: 1024, h: Math.round((1024 * h) / w), fg, bg: null, glow, sub }));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: new THREE.Color(1, 1, 1).multiplyScalar(emissive), toneMapped: false });
  }, [text, sub, w, h, fg, glow, emissive]);
  useEffect(
    () => () => {
      mat.map?.dispose();
      mat.dispose();
    },
    [mat],
  );
  // redraw once web fonts are ready so the display serif is used
  useEffect(() => {
    let cancelled = false;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(() => {
      if (cancelled || !mat.map) return;
      const c = signCanvas(text, { w: 1024, h: Math.round((1024 * h) / w), fg, bg: null, glow, sub });
      (mat.map as THREE.CanvasTexture).image = c;
      mat.map.needsUpdate = true;
    });
    return () => {
      cancelled = true;
    };
  }, [mat, text, sub, w, h, fg, glow]);
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => noPick(ref.current), []);
  // lane:qa-visual — the sign belongs to the room view. In tank view the camera sits at the hero tank and would only
  // catch giant cropped letters behind it (on a portrait phone right behind the HUD pills), so it glides out there and
  // back in when the player steps back into the room.
  useFrame((_, dt) => {
    const m = ref.current;
    const target = getUI().view === 'tank' ? 0 : emissive;
    const c = mat.color;
    if (Math.abs(c.r - target) > 1e-3) c.setScalar(c.r + (target - c.r) * (1 - Math.exp(-Math.min(0.1, dt) * 4)));
    if (m) m.visible = c.r > 0.01;
  });
  return (
    <mesh ref={ref} position={pos} rotation={[0, rotY, 0]} material={mat} renderOrder={2}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

// ───────────────────────────── lights ─────────────────────────────

function RoomLights({ level, width, depth }: { level: FacilityLevelId; width: number; depth: number }) {
  const style = ROOM_STYLES[level];
  const def = getFacilityLevel(level);
  const refs = useRef<(THREE.PointLight | null)[]>([]);
  const spots = useMemo(() => {
    const n = style.light.count;
    const out: [number, number, number][] = [];
    if (n <= 0) return out;
    const cols = Math.max(1, Math.round(Math.sqrt((n * width) / depth)));
    const rows = Math.max(1, Math.ceil(n / cols));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (out.length >= n) break;
      out.push([((c + 0.5) / cols - 0.5) * width * 0.8, style.light.height, ((r + 0.5) / rows - 0.5) * depth * 0.75]);
    }
    return out;
  }, [style, width, depth]);
  const area = width * depth;
  const base = style.light.strength * (2.2 + Math.sqrt(area) * 0.45) * (1 + style.light.height * 0.12);
  useFrame((_, dt) => {
    const g = getGame();
    const h = g ? hourOfDay(g.clock.hour) : 12;
    const open = h >= def.openHour - 1 && h < def.closeHour + 1;
    const target = base * (open ? 1 : 0.35);
    const k = (1 - Math.exp(-3.1 * Math.min(dt, 0.1))); // lane:pc-perf — per second, not per frame
    for (const l of refs.current) if (l) l.intensity += (target - l.intensity) * k;
  });
  return (
    <>
      {spots.map((p, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={p}
          color={style.light.color}
          intensity={base}
          distance={Math.max(width, depth) * 1.1}
          decay={1.2}
        />
      ))}
    </>
  );
}

/** Soft coloured light pools in front of exhibits + washes on the wall behind them (additive, instanced). */
function LightPools({ level }: { level: FacilityLevelId }) {
  const style = ROOM_STYLES[level];
  const sig = useGameSelector((g) => g.tankOrder.map((id) => {
    const t = g.tanks[id];
    return t ? `${id}:${t.tierId}:${t.waterClass}:${t.placement.x.toFixed(2)},${t.placement.z.toFixed(2)},${t.placement.rotY.toFixed(2)}` : '';
  }).join('|'), '');
  const fac = useGameSelector((g) => `${g.facility.width}x${g.facility.depth}`, '');
  const { poolMat, washMat, keys } = useMemo(() => {
    const k1 = 'glow:pool';
    const k2 = 'glow:wash';
    const pm = new THREE.MeshBasicMaterial({ map: acquireTexture(k1, radialGlow, { repeat: false }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const wm = new THREE.MeshBasicMaterial({ map: acquireTexture(k2, wallWash, { repeat: false }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    // additive: face order is irrelevant, so skip three's two-pass transparent double-side path (two draws plus a
    // program re-validation per pass, every frame)
    wm.forceSinglePass = true;
    return { poolMat: pm, washMat: wm, keys: [k1, k2] };
  }, []);
  useEffect(
    () => () => {
      poolMat.dispose();
      washMat.dispose();
      for (const k of keys) releaseTexture(k);
    },
    [poolMat, washMat, keys],
  );
  const { pools, washes, geo } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1);
    const g = getGame();
    const pools = new THREE.InstancedMesh(geo, poolMat, Math.max(1, (g?.tankOrder.length ?? 0) + 1));
    const washes = new THREE.InstancedMesh(geo, washMat, Math.max(1, (g?.tankOrder.length ?? 0) + 1));
    pools.count = 0;
    washes.count = 0;
    if (!g || style.pools <= 0) return { pools, washes, geo };
    const W = g.facility.width;
    const D = g.facility.depth;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const c = new THREE.Color();
    for (const id of g.tankOrder) {
      const t = g.tanks[id];
      if (!t) continue;
      const fp = tankFootprint(t.tierId, t.placement);
      const fx = Math.sin(t.placement.rotY);
      const fz = Math.cos(t.placement.rotY);
      const off = fp.hz + 0.55;
      e.set(-Math.PI / 2, 0, t.placement.rotY);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(t.placement.x + fx * off, 0.004 + pools.count * 0.0004, t.placement.z + fz * off), q, new THREE.Vector3(fp.hx * 2 * 1.5, fp.hz * 2 + 1.4, 1));
      pools.setMatrixAt(pools.count, m);
      c.set(poolColor(t.waterClass)).multiplyScalar(0.22 * style.pools);
      pools.setColorAt(pools.count, c);
      pools.count++;
      // wall wash if the tank stands against a wall
      const bx = t.placement.x - fx * (fp.hz + 0.02);
      const bz = t.placement.z - fz * (fp.hz + 0.02);
      const nearWall = Math.abs(Math.abs(bx) - W / 2) < 0.25 || Math.abs(Math.abs(bz) - D / 2) < 0.25;
      if (style.wash && nearWall) {
        const sh = standHeight(t.tierId);
        const hh = Math.min(getFacilityLevel(g.facility.level).wallHeight * 0.8, sh + 2.4);
        e.set(0, t.placement.rotY, 0);
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(bx + fx * 0.005, hh / 2, bz + fz * 0.005), q, new THREE.Vector3(fp.hx * 2 * 1.35, hh, 1));
        washes.setMatrixAt(washes.count, m);
        c.set(style.wash.color).lerp(new THREE.Color(poolColor(t.waterClass)), 0.5).multiplyScalar(0.3 * style.wash.strength);
        washes.setColorAt(washes.count, c);
        washes.count++;
      }
    }
    pools.instanceMatrix.needsUpdate = true;
    washes.instanceMatrix.needsUpdate = true;
    if (pools.instanceColor) pools.instanceColor.needsUpdate = true;
    if (washes.instanceColor) washes.instanceColor.needsUpdate = true;
    noPick(pools);
    noPick(washes);
    pools.renderOrder = 1;
    washes.renderOrder = 1;
    return { pools, washes, geo };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, fac, style, poolMat, washMat]);
  useEffect(() => () => geo.dispose(), [geo]);
  if (style.pools <= 0) return null;
  return (
    <>
      <primitive object={pools} />
      <primitive object={washes} />
    </>
  );
}

/** Warm uplight washes on the wall behind each column (grand hall). */
function ColumnWashes({ level, width, depth }: { level: FacilityLevelId; width: number; depth: number }) {
  const style = ROOM_STYLES[level];
  const def = getFacilityLevel(level);
  const cols = def.props.filter((p) => p.kind === 'column');
  const { mesh, geo, mat, key } = useMemo(() => {
    const key = 'glow:wash';
    const mat = new THREE.MeshBasicMaterial({ map: acquireTexture(key, wallWash, { repeat: false }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    mat.forceSinglePass = true;
    const geo = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, cols.length));
    mesh.count = 0;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color(style.wash?.color ?? '#e8b877').multiplyScalar(0.45);
    const hh = def.wallHeight * 0.85;
    for (const p of cols) {
      // which wall is the column against?
      const dl = p.x + width / 2;
      const dr = width / 2 - p.x;
      const db = p.z + depth / 2;
      const min = Math.min(dl, dr, db);
      let x = p.x;
      let z = p.z;
      let rot = 0;
      if (min === db) z = -depth / 2 + 0.01;
      else if (min === dl) {
        x = -width / 2 + 0.01;
        rot = Math.PI / 2;
      } else {
        x = width / 2 - 0.01;
        rot = -Math.PI / 2;
      }
      q.setFromEuler(new THREE.Euler(0, rot, 0));
      m.compose(new THREE.Vector3(x, hh / 2, z), q, new THREE.Vector3(2.6, hh, 1));
      mesh.setMatrixAt(mesh.count, m);
      mesh.setColorAt(mesh.count, c);
      mesh.count++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    noPick(mesh);
    mesh.renderOrder = 1;
    return { mesh, geo, mat, key };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, width, depth]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
      releaseTexture(key);
    },
    [geo, mat, key],
  );
  if (!cols.length) return null;
  return <primitive object={mesh} />;
}

/** Inlaid floor medallion at the heart of the destination / grand hall. */
function FloorMedallion({ level, width, depth }: { level: FacilityLevelId; width: number; depth: number }) {
  const key = `medallion:${level}`;
  const mat = useMemo(() => {
    const stone = level === 'grand_hall' ? '#6b6155' : '#4c5664';
    const brass = level === 'grand_hall' ? '#c9a05a' : '#8fc7d6';
    const map = acquireTexture(key, () => medallion(stone, brass), { repeat: false });
    return new THREE.MeshPhysicalMaterial({ map, transparent: true, roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  }, [key, level]);
  useEffect(
    () => () => {
      mat.dispose();
      releaseTexture(key);
    },
    [mat, key],
  );
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => noPick(ref.current), []);
  const r = Math.min(width, depth) * (level === 'grand_hall' ? 0.22 : 0.2);
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, depth * 0.06]} material={mat} receiveShadow>
      <circleGeometry args={[r, 72]} />
    </mesh>
  );
}

// ───────────────────────────── room ─────────────────────────────

function PropMesh({ p, mats, level, height }: { p: FacilityPropDef; mats: PropMaterials; level: FacilityLevelId; height: number }) {
  const pos: [number, number, number] = [p.x, 0, p.z];
  const rot: [number, number, number] = [0, p.rotY, 0];
  switch (p.kind) {
    case 'counter':
      return <Batched mats={mats} deps={[p.w, p.d]} build={() => buildCounter(p.w, p.d)} position={pos} rotation={rot} />;
    case 'merch_shelf': {
      const h = level === 'specialty_shop' ? 1.9 : 2.1;
      return (
        <group position={pos} rotation={rot}>
          <Batched mats={mats} deps={[p.w, p.d, h]} build={() => buildMerchShelf(p.w, p.d, h)} />
          <Products w={p.w} d={p.d} h={h} mats={mats} seed={`${level}:${p.x}:${p.z}`} />
        </group>
      );
    }
    case 'planter':
      return <Batched mats={mats} deps={[p.w, p.x]} build={() => buildPlanterProp(p.w, `planter-${p.x}-${p.z}`, level === 'grand_hall' || level === 'destination' ? 1.5 : 1)} position={pos} rotation={rot} />;
    case 'reception':
      return <Batched mats={mats} deps={[p.w, p.d]} build={() => buildReception(p.w, p.d)} position={pos} rotation={rot} />;
    case 'ticket_gate':
      return <Batched mats={mats} deps={[p.w]} build={() => buildTicketGate(p.w)} position={pos} rotation={rot} />;
    case 'column':
      return <Batched mats={mats} deps={[p.w, height]} build={() => buildColumn(p.w, height)} position={pos} rotation={rot} />;
    default:
      return null;
  }
}

export function PublicRoom({ level, width, depth, shopName, mats }: { level: FacilityLevelId; width: number; depth: number; shopName: string; mats: PropMaterials }) {
  const def = getFacilityLevel(level);
  const H = def.wallHeight;
  const backZ = -depth / 2 + 0.012;
  const gallery = def.order >= 3;
  const style = ROOM_STYLES[level];
  // lane:qa-visual — the sign hangs just above the exhibit row and no wider than it (plus some air), so a small shop
  // with two tanks frames it fully instead of cropping giant letters at the top of the view / under the HUD.
  const extKey = useGameSelector((g) => {
    const e = exhibitExtent(g);
    return e ? `${e.minX.toFixed(2)}|${e.maxX.toFixed(2)}|${e.topY.toFixed(2)}` : '';
  }, '');
  const ext = extKey ? extKey.split('|').map(Number) : null;
  const span = ext ? ext[1] - ext[0] : width;
  const signW = Math.min(width * 0.5, style.sign.w, Math.max(2.2, span * (def.order >= 3 ? 1.1 : 0.8)));
  const signH = signW * 0.22;
  const SIGN_GAP = [0, 0.2, 0.3, 0.5, 0.7, 0.9][def.order] ?? 0.5;
  const signY = Math.max(1.5, Math.min(H - signH / 2 - 0.15, style.sign.y, ext ? ext[2] + SIGN_GAP + signH / 2 : Infinity));
  const signX = ext ? THREE.MathUtils.clamp((ext[0] + ext[1]) / 2, -width / 2 + signW / 2 + 0.3, width / 2 - signW / 2 - 0.3) : 0;
  const sub0 = level === 'specialty_shop' ? 'Fish · Plants · Aquascapes' : level === 'aquarium_store' ? 'Aquarium Store' : level === 'showroom' ? 'Living Gallery' : level === 'destination' ? 'Public Aquarium' : 'Grand Aquarium';
  const subtitle = shopName.toLowerCase().includes(sub0.split(' ')[0].toLowerCase()) ? 'Living Aquariums' : sub0;
  const aisle = level === 'aquarium_store' ? ['Freshwater', 'Marine & Reef'] : null;
  return (
    <group name={`public-${level}`}>
      {def.props.map((p, i) => (
        <PropMesh key={`${p.kind}-${i}`} p={p} mats={mats} level={level} height={H} />
      ))}
      <Sign text={shopName} sub={subtitle} pos={[signX, signY, backZ]} w={signW} h={signH} fg={gallery ? '#e9c98f' : '#f7f1e6'} glow={gallery ? 'rgba(233,190,120,0.55)' : 'rgba(255,255,255,0.35)'} emissive={gallery ? 1.3 : 1.15} />
      {aisle && (
        <>
          <Sign text={aisle[0]} pos={[-width / 2 + 0.012, 3.0, -1.2]} rotY={Math.PI / 2} w={2.0} h={0.42} fg="#f3efe6" glow="rgba(120,220,210,0.5)" />
          <Sign text={aisle[1]} pos={[width / 2 - 0.012, 3.0, -2.2]} rotY={-Math.PI / 2} w={2.4} h={0.42} fg="#f3efe6" glow="rgba(120,180,255,0.5)" />
        </>
      )}
      <RoomLights level={level} width={width} depth={depth} />
      <LightPools level={level} />
      <ColumnWashes level={level} width={width} depth={depth} />
      {(level === 'grand_hall' || level === 'destination') && <FloorMedallion level={level} width={width} depth={depth} />}
    </group>
  );
}

export { LightPools };
