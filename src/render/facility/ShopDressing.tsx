/**
 * lane:w2-visual — shop dressing for the specialty shop and the aquarium store. Straight after the move the player
 * saw one tank on a long, flat wall; this makes the room read as a small, lived-in aquarium shop:
 *
 *  - a glazed subway-tile wainscot with a dark cap rail (specialty shop; the store already has its slatted wall);
 *  - oak stock shelves above the exhibit line with fish-food tubs, water-conditioner bottles, boxed test kits and a
 *    trailing pothos;
 *  - three pieces of furniture in the back corners: a black steel rack of lit starter tanks for sale (boxed kits
 *    underneath, price tags on the lip), a painted supply cabinet with a pegboard of nets, test-kit vials and airline
 *    tubing, and a fiddle-leaf fig in a white ceramic pot.
 *
 * Layout rules, so it looks right at any tank count and never collides with the player's layout:
 *  - Wall shelves sit above every tank's glass top (tank tops stay below ~1.8 m) and are trimmed around the shop sign
 *    and the trophy vitrine, whose rectangles are computed exactly as PublicRoom / Trophies place them.
 *  - The floor pieces are cosmetic, not sim obstacles: each one steps aside (is not drawn) as soon as a tank — with
 *    its viewing walkway and the keepers' service spots beside it — or a fixture reaches its footprint. The back
 *    corners fill last (tanks are laid out from the centre of the back wall outwards), so a new shop keeps them.
 *  - Wall parts hide with their wall in the dollhouse cut-away; floor pieces stay, like the other furniture.
 *
 * Everything is merged into one mesh per material (≈10 draw calls for the whole dressing) and rebuilt only when the
 * layout, the sign or the trophies change. All art is procedural. OWNER: lane "facility".
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FacilityLevelId, GameState } from '@/types';
import { getGame, useGameSelector } from '@/state/game';
import { getFacilityLevel, FIXTURE_DEFS, type FixtureKind } from '@/data/facilities';
import { visualRng } from '@/sim/rng';
import { tankFootprint, tankFrontZone, tankOuterSize, obbOverlap, type OBB } from '@/sim/facility/layout';
import { standHeight } from '@/sim/tankSpace';
import { box, rbox, cyl, lathe, tube, leaf, noPick } from './kit';
import { matByKey, type PropMaterials } from './materials';
import { ROOM_STYLES } from './styles';
import { backWallSign, exhibitExtent } from './bounds';
import { caseSize, chooseCaseSpot } from './Trophies';
import { WALL_T } from './Room';
import { acquireTexture, releaseTexture } from './textures';

type V3 = [number, number, number];
type Rng = { next(): number };

// ───────────────────────────── vertex-coloured batch ─────────────────────────────

const _m = new THREE.Matrix4();
const _mm = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

/**
 * Like kit.Batch, but every piece carries a vertex colour (optionally a bottom→top gradient), so the many small
 * painted, plastic and paper things share one material. `base` places a whole piece (set it before adding).
 */
class VBatch {
  private parts = new Map<string, THREE.BufferGeometry[]>();
  base = new THREE.Matrix4();

  add(key: string, geom: THREE.BufferGeometry, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 | number = 1, color: THREE.ColorRepresentation = '#ffffff', top?: THREE.ColorRepresentation): this {
    _e.set(rot[0], rot[1], rot[2], 'YXZ');
    _q.setFromEuler(_e);
    if (typeof scale === 'number') _s.set(scale, scale, scale);
    else _s.set(scale[0], scale[1], scale[2]);
    _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, _s);
    return this.addMatrix(key, geom, _m, color, top);
  }

  addMatrix(key: string, geom: THREE.BufferGeometry, m: THREE.Matrix4, color: THREE.ColorRepresentation = '#ffffff', top?: THREE.ColorRepresentation): this {
    const g = geom.index ? geom.toNonIndexed() : geom.clone();
    geom.dispose();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const n = pos.count;
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    const c0 = new THREE.Color(color);
    const c1 = top !== undefined ? new THREE.Color(top) : null;
    let y0 = 0;
    let y1 = 1;
    if (c1) {
      g.computeBoundingBox();
      y0 = g.boundingBox!.min.y;
      y1 = g.boundingBox!.max.y;
    }
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      if (c1) _c.copy(c0).lerp(c1, (pos.getY(i) - y0) / Math.max(1e-6, y1 - y0));
      else _c.copy(c0);
      col[i * 3] = _c.r;
      col[i * 3 + 1] = _c.g;
      col[i * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.morphAttributes = {};
    g.applyMatrix4(_mm.multiplyMatrices(this.base, m));
    const list = this.parts.get(key) ?? [];
    list.push(g);
    this.parts.set(key, list);
    return this;
  }

  build(): Map<string, THREE.BufferGeometry> {
    const out = new Map<string, THREE.BufferGeometry>();
    for (const [key, list] of this.parts) {
      if (!list.length) continue;
      const merged = list.length === 1 ? list[0] : mergeAll(list);
      if (merged) {
        merged.computeBoundingSphere();
        out.set(key, merged);
      }
      if (list.length > 1) for (const g of list) g.dispose();
    }
    this.parts.clear();
    return out;
  }
}

/** Merge same-layout non-indexed geometries (position/normal/uv/color) without the generic merge's bookkeeping. */
function mergeAll(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let n = 0;
  for (const g of list) n += g.getAttribute('position').count;
  const out = new THREE.BufferGeometry();
  for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]] as const) {
    const arr = new Float32Array(n * size);
    let o = 0;
    for (const g of list) {
      const a = g.getAttribute(name) as THREE.BufferAttribute;
      arr.set(a.array as Float32Array, o);
      o += a.count * size;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

// ───────────────────────────── textures ─────────────────────────────

/** Glazed 3×6" subway tiles in brick bond, 0.6 m per texture repeat (4 tiles across, 8 courses). */
function subwayTiles(): HTMLCanvasElement {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cbc5b9';
  ctx.fillRect(0, 0, S, S);
  const rng = visualRng('dress-subway');
  const tw = S / 4;
  const th = S / 8;
  const g = 3;
  for (let r = 0; r < 8; r++) {
    const off = r % 2 ? tw / 2 : 0;
    for (let k = -1; k < 5; k++) {
      const x = k * tw + off;
      const y = r * th;
      const l = 228 + Math.round((rng.next() - 0.5) * 10);
      ctx.fillStyle = `rgb(${l},${l - 3},${l - 10})`;
      ctx.fillRect(x + g, y + g, tw - g * 2, th - g * 2);
      // bevelled glaze: a light top edge, a soft shadow along the bottom
      const gr = ctx.createLinearGradient(0, y + g, 0, y + th - g);
      gr.addColorStop(0, 'rgba(255,255,255,0.35)');
      gr.addColorStop(0.18, 'rgba(255,255,255,0)');
      gr.addColorStop(0.82, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = gr;
      ctx.fillRect(x + g, y + g, tw - g * 2, th - g * 2);
    }
  }
  return c;
}

/** Painted pegboard: 2.5 cm hole pitch, 0.2 m per texture repeat. */
function pegboard(): HTMLCanvasElement {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e7e1d4';
  ctx.fillRect(0, 0, S, S);
  const step = S / 8;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const x = (i + 0.5) * step;
    const y = (j + 0.5) * step;
    ctx.fillStyle = 'rgba(40,34,28,0.85)';
    ctx.beginPath();
    ctx.arc(x, y, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(x + 0.6, y + 1.4, 4.2, 0.2, Math.PI - 0.2);
    ctx.fill();
  }
  return c;
}

/** Fine green netting on a clear ground (≈5 mm mesh at 4 cm per texture repeat). */
function netting(): HTMLCanvasElement {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(46,96,70,0.95)';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(i * 8, 0, 1.6, S);
    ctx.fillRect(0, i * 8, S, 1.6);
  }
  return c;
}

/** Plane facing +z with UVs scaled to `repeatM` metres per texture tile. */
function texturedPlane(w: number, h: number, repeatM: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / repeatM, (uv.getY(i) * h) / repeatM);
  return g;
}

// ───────────────────────────── palette ─────────────────────────────

// muted printed-packaging tones: the shelves should read as stock, not as a toy box
const LABELS = ['#2f6f73', '#b8704f', '#34465c', '#c9aa5e', '#7b9564', '#94504a', '#4e7aa3', '#6a6084'];
const LIDS = ['#1d2a33', '#a0473f', '#355f8c', '#c29f4c', '#2f6a4d', '#e6e0d2'];
const LEAVES = ['#2f5a2c', '#3b6b31', '#27502a', '#4a7a36'];
const POTHOS = ['#4f8a3a', '#6ea24a', '#8fae4e', '#3f7a33'];
const STEEL = '#a4abb2';
const pick = <T,>(rng: Rng, a: readonly T[]): T => a[Math.floor(rng.next() * a.length) % a.length];

// ───────────────────────────── small goods ─────────────────────────────

/** A fish-food tub (cream body, printed label band, coloured lid), base at `at`. */
function tub(b: VBatch, at: V3, r: number, h: number, rng: Rng): void {
  const [x, y, z] = at;
  b.add('vc', cyl(r * 0.98, r * 0.94, h, 18), [x, y + h / 2, z], [0, 0, 0], 1, '#eee9df');
  b.add('vc', cyl(r * 1.005, r * 0.985, h * 0.5, 18, true), [x, y + h * 0.45, z], [0, 0, 0], 1, pick(rng, LABELS));
  b.add('vc', cyl(r * 1.04, r * 1.04, 0.016, 18), [x, y + h + 0.008, z], [0, 0, 0], 1, pick(rng, LIDS));
}

/** A water-conditioner bottle: shouldered body, label band, cap. */
function bottle(b: VBatch, at: V3, r: number, h: number, rng: Rng): void {
  const [x, y, z] = at;
  const body = rng.next() < 0.3 ? '#dfe9ef' : '#f1ede4';
  b.add('vc', lathe([[0.001, 0], [r, 0], [r, h * 0.7], [r * 0.8, h * 0.84], [r * 0.38, h * 0.9], [r * 0.38, h * 0.93], [0.001, h * 0.93]], 16), [x, y, z], [0, 0, 0], 1, body);
  b.add('vc', cyl(r * 1.01, r * 1.01, h * 0.38, 16, true), [x, y + h * 0.36, z], [0, 0, 0], 1, pick(rng, LABELS));
  b.add('vc', cyl(r * 0.42, r * 0.42, h * 0.1, 12), [x, y + h * 0.97, z], [0, 0, 0], 1, pick(rng, LIDS));
}

/** A boxed test kit or product box with a white label panel on its front. */
function kitBox(b: VBatch, at: V3, w: number, h: number, d: number, rng: Rng, rotY = 0): void {
  const [x, y, z] = at;
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  b.add('vc', rbox(w, h, d, 0.004, 1), [x, y + h / 2, z], [0, rotY, 0], 1, pick(rng, LABELS));
  b.add('vc', box(w * 0.72, h * 0.34, 0.002), [x + s * (d / 2 + 0.001), y + h * 0.56, z + c * (d / 2 + 0.001)], [0, rotY, 0], 1, '#f3efe6');
}

/** A trailing pothos in a small pot, vines spilling over the front edge (`edgeZ`) and down. */
function pothos(b: VBatch, at: V3, edgeZ: number, rng: Rng, drop = 0.34): void {
  const [x, y, z] = at;
  b.add('vc', lathe([[0.001, 0], [0.05, 0], [0.065, 0.1], [0.07, 0.11], [0.062, 0.11]], 18), [x, y, z], [0, 0, 0], 1, '#b0613f');
  b.add('vc', cyl(0.062, 0.062, 0.006, 16), [x, y + 0.1, z], [0, 0, 0], 1, '#2b2119');
  const vines = 5;
  for (let v = 0; v < vines; v++) {
    const side = (v / (vines - 1) - 0.5) * 2;
    const len = drop * (0.55 + rng.next() * 0.45);
    const p0: V3 = [x + side * 0.02, y + 0.11, z];
    const p1: V3 = [x + side * 0.1, y + 0.12, edgeZ + 0.01];
    const p2: V3 = [x + side * 0.16, y + 0.02 - len * 0.35, edgeZ + 0.04];
    const p3: V3 = [x + side * 0.2 + (rng.next() - 0.5) * 0.06, y - len, edgeZ + 0.05];
    b.add('leaf', tube([p0, p1, p2, p3], 0.0022, 12, 3), [0, 0, 0], [0, 0, 0], 1, '#3f6a2c');
    const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3].map((p) => new THREE.Vector3(...p)));
    const n = 7 + Math.floor(rng.next() * 3);
    for (let i = 0; i < n; i++) {
      const pt = curve.getPoint(0.12 + (i / n) * 0.88);
      const s = 0.042 + rng.next() * 0.02;
      b.add('leaf', leaf(s, s * 0.85, { arch: 0.15, cup: 0.35, seg: 6 }), [pt.x, pt.y, pt.z], [-0.2 - rng.next() * 0.9, (rng.next() - 0.5) * 2.4, Math.PI + (rng.next() - 0.5) * 2.2], 1, pick(rng, POTHOS));
    }
  }
  // a crown of leaves on the pot
  for (let i = 0; i < 6; i++) b.add('leaf', leaf(0.05, 0.042, { arch: 0.2, cup: 0.35, seg: 6 }), [x, y + 0.105, z], [-0.7 - rng.next() * 0.5, (i / 6) * Math.PI * 2, 0], 1, pick(rng, POTHOS));
}

// ───────────────────────────── wall shelves ─────────────────────────────

const SHELF_D = 0.24;

/** An oak stock shelf on black steel brackets along the back wall (x0..x1 world), top at `y`, wall face at `zw`. */
function stockShelf(b: VBatch, x0: number, x1: number, y: number, zw: number, rng: Rng, plantEnd: -1 | 1): void {
  const L = x1 - x0;
  const cx = (x0 + x1) / 2;
  b.add('oak', rbox(L, 0.03, SHELF_D, 0.008, 2), [cx, y - 0.015, zw + SHELF_D / 2]);
  const nb = Math.max(2, Math.round(L / 0.85) + 1);
  const sl = Math.hypot(0.14, 0.16);
  for (let i = 0; i < nb; i++) {
    const x = x0 + 0.14 + (i * (L - 0.28)) / (nb - 1);
    b.add('blackMetal', box(0.014, 0.012, SHELF_D - 0.03), [x, y - 0.036, zw + (SHELF_D - 0.03) / 2]);
    b.add('blackMetal', box(0.014, 0.18, 0.008), [x, y - 0.12, zw + 0.004]);
    b.add('blackMetal', box(0.011, 0.011, sl), [x, y - 0.035 - 0.08, zw + 0.004 + 0.07], [-Math.atan2(0.14, 0.16), 0, 0]);
  }
  // goods, in small clusters with air between them; the pothos lives at the outer end
  const zc = zw + SHELF_D * 0.48;
  const pad = 0.1;
  let a = x0 + pad;
  let e = x1 - pad;
  if (plantEnd < 0) {
    pothos(b, [a + 0.08, y, zc], zw + SHELF_D, rng);
    a += 0.28;
  } else {
    pothos(b, [e - 0.08, y, zc], zw + SHELF_D, rng);
    e -= 0.28;
  }
  let x = a;
  let k = Math.floor(rng.next() * 3);
  while (x < e - 0.2) {
    const kind = k++ % 3;
    if (kind === 0) {
      // three or four food tubs, one sometimes stacked
      const n = 3 + (rng.next() < 0.5 ? 1 : 0);
      for (let i = 0; i < n && x < e - 0.08; i++) {
        const r = 0.036 + rng.next() * 0.012;
        const h = 0.08 + rng.next() * 0.05;
        tub(b, [x + r, y, zc + (rng.next() - 0.5) * 0.04], r, h, rng);
        if (i === 1 && rng.next() < 0.5) tub(b, [x + r, y + h + 0.016, zc], r * 0.85, h * 0.7, rng);
        x += r * 2 + 0.008;
      }
    } else if (kind === 1) {
      const n = 2 + Math.floor(rng.next() * 2);
      for (let i = 0; i < n && x < e - 0.1; i++) {
        const w = 0.09 + rng.next() * 0.07;
        kitBox(b, [x + w / 2, y, zc - 0.01], w, 0.12 + rng.next() * 0.07, 0.07 + rng.next() * 0.03, rng, (rng.next() - 0.5) * 0.12);
        x += w + 0.01;
      }
    } else {
      const n = 3 + Math.floor(rng.next() * 3);
      for (let i = 0; i < n && x < e - 0.06; i++) {
        const r = 0.024 + rng.next() * 0.006;
        bottle(b, [x + r, y, zc + (rng.next() - 0.5) * 0.03], r, 0.13 + rng.next() * 0.05, rng);
        x += r * 2 + 0.006;
      }
    }
    x += 0.12 + rng.next() * 0.12;
  }
}

// ───────────────────────────── floor pieces (local: origin on the floor, back against −z, facing +z) ─────────────────────────────

const RACK = { w: 1.3, d: 0.42 };

/** A small lit tank on a rack tier: glowing backdrop, substrate, a few stems, glass and black rims. */
function miniTank(b: VBatch, cx: number, y: number, zc: number, L: number, H: number, W: number, tint: [string, string], soil: string, rng: Rng): void {
  b.add('blackMetal', box(L, 0.012, W), [cx, y + 0.006, zc]);
  b.add('blackMetal', box(L, 0.012, W), [cx, y + H - 0.006, zc]);
  b.add('blackMetal', rbox(L - 0.03, 0.022, W * 0.72, 0.006, 1), [cx, y + H + 0.011, zc]);
  b.add('lit', box(L - 0.02, H - 0.03, 0.004), [cx, y + H / 2, zc - W / 2 + 0.008], [0, 0, 0], 1, tint[0], tint[1]);
  // the water: a faint lit tint over everything inside, so each tank glows as a volume, not a painted box
  b.add('water', box(L - 0.016, H - 0.05, W - 0.02), [cx, y + 0.012 + (H - 0.05) / 2, zc], [0, 0, 0], 1, tint[0], tint[1]);
  b.add('vc', box(L - 0.02, 0.035, W - 0.02), [cx, y + 0.012 + 0.0175, zc], [0, 0, 0], 1, soil);
  const n = 5 + Math.floor(rng.next() * 3);
  for (let i = 0; i < n; i++) {
    const px = cx + (rng.next() - 0.5) * (L - 0.1);
    const pz = zc - W * 0.3 + rng.next() * W * 0.35;
    const len = 0.1 + rng.next() * (H - 0.14);
    b.add('leaf', leaf(len, 0.014 + rng.next() * 0.012, { arch: 0.12, cup: 0.3, seg: 6 }), [px, y + 0.045, pz], [(rng.next() - 0.5) * 0.35, rng.next() * Math.PI, (rng.next() - 0.5) * 0.3], 1, pick(rng, LEAVES), '#7fae57');
  }
  if (rng.next() < 0.7) b.add('vc', new THREE.DodecahedronGeometry(0.03, 0), [cx + (rng.next() - 0.5) * L * 0.5, y + 0.05, zc], [rng.next(), rng.next(), 0], [1.3, 0.7, 1], '#77726a');
  b.add('tankGlass', box(L - 0.004, H - 0.024, W - 0.004), [cx, y + H / 2, zc]);
}

/** Black steel rack of lit starter tanks for sale: boxed kits below, test kits on top, price tags on every lip. */
function buildRack(b: VBatch, rng: Rng): void {
  const { w, d } = RACK;
  const levels = [0.1, 0.56, 1.02, 1.48];
  const postH = 1.52;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('blackMetal', box(0.026, postH, 0.026), [sx * (w / 2 - 0.013), postH / 2, sz * (d / 2 - 0.013)]);
  for (const y of levels) {
    b.add('blackMetal', box(w - 0.01, 0.014, d - 0.01), [0, y - 0.007, 0]);
    b.add('blackMetal', box(w, 0.032, 0.008), [0, y - 0.01, d / 2 - 0.004]);
  }
  // price tags on the tank tiers' lips
  const tags = ['#e0785a', '#f5c451', '#5eead4'];
  for (const y of [levels[1], levels[2]]) for (const sx of [-1, 1]) {
    b.add('vc', box(0.07, 0.034, 0.003), [sx * 0.31 + 0.12, y - 0.012, d / 2 + 0.002], [0, 0, 0], 1, '#f3efe6');
    b.add('vc', box(0.07, 0.008, 0.0035), [sx * 0.31 + 0.12, y + 0.001, d / 2 + 0.0025], [0, 0, 0], 1, pick(rng, tags));
  }
  // boxed tank kits on the bottom tier (a tank "photo" on the front)
  for (const [x, bw, bh] of [
    [-0.4, 0.4, 0.3],
    [0.06, 0.42, 0.32],
    [0.45, 0.3, 0.24],
  ] as const) {
    b.add('vc', rbox(bw, bh, 0.3, 0.006, 1), [x, levels[0] + bh / 2, -0.02], [0, (rng.next() - 0.5) * 0.06, 0], 1, '#b08a5c');
    b.add('vc', box(bw * 0.72, bh * 0.5, 0.002), [x, levels[0] + bh * 0.52, 0.131], [0, 0, 0], 1, '#f1ede4');
    b.add('lit', box(bw * 0.46, bh * 0.28, 0.0025), [x - bw * 0.06, levels[0] + bh * 0.52, 0.1325], [0, 0, 0], 1, '#2f7f78', '#7fc8b8');
  }
  // lit starter tanks: freshwater, planted, a cool-water tank and a soft blue one
  const tints: [string, string][] = [
    ['#0f3f3b', '#58b39d'],
    ['#24451c', '#8fc46a'],
    ['#1a3f5a', '#6ea6c8'],
    ['#163f37', '#7cc7ae'],
  ];
  const soils = ['#b8a27c', '#3a2e24', '#c9bfae', '#8a7a62'];
  let i = 0;
  for (const y of [levels[1], levels[2]]) for (const sx of [-1, 1]) {
    miniTank(b, sx * 0.31, y, -0.02, 0.5, 0.29, 0.27, tints[i], soils[i], rng);
    i++;
  }
  // top: a couple of boxed test kits and a little pothos
  kitBox(b, [-0.42, levels[3], -0.04], 0.16, 0.14, 0.1, rng, 0.08);
  kitBox(b, [-0.2, levels[3], -0.02], 0.12, 0.18, 0.08, rng, -0.05);
  tub(b, [0.08, levels[3], 0.0], 0.045, 0.1, rng);
  tub(b, [0.19, levels[3], 0.02], 0.04, 0.09, rng);
  pothos(b, [0.44, levels[3], 0.0], d / 2, rng, 0.28);
}

/** A painted supply cabinet with an oak top and a pegboard hutch: nets, test-kit vials, thermometer, airline. */
function buildHutch(b: VBatch, rng: Rng): void {
  const w = 1.0;
  const d = 0.44;
  const h = 0.84;
  const paint = '#5b7b72';
  b.add('vc', box(w - 0.05, 0.07, d - 0.07), [0, 0.035, -0.02], [0, 0, 0], 1, '#23262a');
  b.add('vc', rbox(w, h - 0.1, d - 0.02, 0.01, 2), [0, 0.07 + (h - 0.1) / 2, -0.01], [0, 0, 0], 1, paint);
  for (const sx of [-1, 1]) {
    b.add('vc', rbox(w / 2 - 0.035, h - 0.19, 0.014, 0.004, 1), [(sx * w) / 4, 0.07 + (h - 0.1) / 2, d / 2 - 0.016], [0, 0, 0], 1, '#6c8c83');
    b.add('vc', new THREE.SphereGeometry(0.011, 10, 8), [sx * 0.045, 0.07 + (h - 0.1) * 0.62, d / 2 - 0.004], [0, 0, 0], 1, '#b08a4a');
  }
  b.add('oak', rbox(w + 0.03, 0.035, d + 0.02, 0.006, 2), [0, h - 0.0175, 0]);
  // hutch: oak uprights, pegboard, crown
  const top = 1.86;
  const zb = -d / 2 + 0.03;
  for (const sx of [-1, 1]) b.add('oak', box(0.035, top - h, 0.035), [sx * (w / 2 - 0.02), h + (top - h) / 2, zb]);
  b.add('peg', texturedPlane(w - 0.075, top - h - 0.1, 0.2), [0, h + 0.05 + (top - h - 0.1) / 2, zb]);
  b.add('oak', rbox(w + 0.02, 0.03, 0.07, 0.005, 1), [0, top, zb + 0.005]);
  const zf = zb + 0.004;
  // nets: coloured handle from a steel peg, a wire frame and a shallow mesh bag
  const nets: [number, number, string][] = [
    [-0.34, 0.1, '#2d6ea8'],
    [-0.17, 0.13, '#1d2a33'],
    [0.02, 0.16, '#2f7a53'],
  ];
  for (const [x, s, handle] of nets) {
    const hy = 1.74;
    const hl = 0.26 + s * 0.4;
    b.add('vc', cyl(0.003, 0.003, 0.05, 6), [x, hy + 0.02, zf + 0.025], [Math.PI / 2, 0, 0], 1, STEEL);
    b.add('vc', cyl(0.0055, 0.0055, hl, 8), [x, hy - hl / 2 + 0.03, zf + 0.03], [0, 0, 0], 1, handle);
    const fy = hy - hl + 0.03;
    const fw = s;
    const fh = s * 0.8;
    const ring: V3[] = [
      [x, fy, zf + 0.032],
      [x + fw / 2, fy - 0.01, zf + 0.032],
      [x + fw / 2, fy - fh, zf + 0.032],
      [x - fw / 2, fy - fh, zf + 0.032],
      [x - fw / 2, fy - 0.01, zf + 0.032],
      [x, fy, zf + 0.032],
    ];
    const curve = new THREE.CatmullRomCurve3(ring.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.1);
    b.add('vc', new THREE.TubeGeometry(curve, 24, 0.0028, 4, false), [0, 0, 0], [0, 0, 0], 1, '#20262a');
    const bag = new THREE.PlaneGeometry(fw * 0.96, fh * 0.96, 6, 6);
    const buv = bag.getAttribute('uv') as THREE.BufferAttribute;
    for (let k = 0; k < buv.count; k++) buv.setXY(k, (buv.getX(k) * fw) / 0.04, (buv.getY(k) * fh) / 0.04);
    const bp = bag.getAttribute('position') as THREE.BufferAttribute;
    for (let k = 0; k < bp.count; k++) {
      const u = bp.getX(k) / (fw * 0.48);
      const v = bp.getY(k) / (fh * 0.48);
      bp.setZ(k, 0.022 * Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v));
    }
    bag.computeVertexNormals();
    b.add('net', bag, [x, fy - fh / 2 - 0.004, zf + 0.03], [0, 0, 0], 1, '#3c6b52');
  }
  // a little oak ledge of test-kit vials (the classic five coloured caps)
  b.add('oak', box(0.3, 0.014, 0.07), [0.3, 1.52, zf + 0.035]);
  b.add('vc', box(0.3, 0.018, 0.004), [0.3, 1.53, zf + 0.07], [0, 0, 0], 1, STEEL);
  ['#e04b4b', '#f0c040', '#3a7fd0', '#48a868', '#9a5ad0'].forEach((cap, i) => {
    const x = 0.19 + i * 0.055;
    b.add('vc', cyl(0.0115, 0.0115, 0.065, 12), [x, 1.527 + 0.0325, zf + 0.04], [0, 0, 0], 1, '#eef0ee');
    b.add('vc', cyl(0.0125, 0.0125, 0.02, 12), [x, 1.527 + 0.075, zf + 0.04], [0, 0, 0], 1, cap);
  });
  // thermometer and a coil of airline tubing
  b.add('vc', cyl(0.004, 0.004, 0.15, 8), [0.2, 1.24, zf + 0.012], [0, 0, 0], 1, '#f4f4f0');
  b.add('vc', cyl(0.0016, 0.0016, 0.06, 6), [0.2, 1.21, zf + 0.0165], [0, 0, 0], 1, '#c93a32');
  b.add('vc', new THREE.TorusGeometry(0.065, 0.0045, 6, 28), [0.36, 1.2, zf + 0.012], [0, 0, 0], 1, '#cfd9d5');
  b.add('vc', cyl(0.003, 0.003, 0.04, 6), [0.36, 1.27, zf + 0.02], [Math.PI / 2, 0, 0], 1, STEEL);
  // on the cabinet: food tubs, a boxed kit, a tiny anubias in a pot
  tub(b, [-0.36, h, 0.02], 0.048, 0.12, rng);
  tub(b, [-0.25, h, 0.05], 0.042, 0.1, rng);
  tub(b, [-0.3, h + 0.12 + 0.016, 0.02], 0.04, 0.07, rng);
  kitBox(b, [-0.06, h, 0.0], 0.15, 0.19, 0.09, rng, 0.1);
  kitBox(b, [0.12, h, 0.04], 0.11, 0.12, 0.07, rng, -0.15);
  b.add('vc', lathe([[0.001, 0], [0.04, 0], [0.05, 0.075], [0.054, 0.08], [0.048, 0.08]], 16), [0.33, h, 0.04], [0, 0, 0], 1, '#e9e4da');
  for (let i = 0; i < 6; i++) b.add('leaf', leaf(0.075, 0.045, { arch: 0.25, cup: 0.4, seg: 6 }), [0.33, h + 0.075, 0.04], [-0.5 - rng.next() * 0.4, (i / 6) * Math.PI * 2 + rng.next() * 0.4, 0], 1, '#244a24', '#3b6b31');
}

/** A fiddle-leaf fig in a white ceramic pot. */
function buildFig(b: VBatch, rng: Rng): void {
  b.add('vc', lathe([[0.001, 0], [0.15, 0], [0.19, 0.04], [0.205, 0.34], [0.215, 0.37], [0.2, 0.375], [0.19, 0.355]], 32), [0, 0, 0], [0, 0, 0], 1, '#e9e4da');
  b.add('vc', cyl(0.19, 0.19, 0.01, 24), [0, 0.355, 0], [0, 0, 0], 1, '#2b2119');
  const trunk: V3[] = [
    [0, 0.35, 0],
    [0.02, 0.8, 0.01],
    [-0.015, 1.25, 0.02],
    [0.01, 1.72, 0],
  ];
  b.add('vc', tube(trunk, 0.016, 14, 6), [0, 0, 0], [0, 0, 0], 1, '#4a3526');
  b.add('vc', tube([[0.0, 1.05, 0.015], [0.1, 1.22, 0.04], [0.16, 1.42, 0.05]], 0.009, 8, 5), [0, 0, 0], [0, 0, 0], 1, '#4a3526');
  const curve = new THREE.CatmullRomCurve3(trunk.map((p) => new THREE.Vector3(...p)));
  const n = 24;
  for (let i = 0; i < n; i++) {
    const t = 0.36 + (i / n) * 0.64;
    const p = curve.getPoint(t);
    const a = i * 2.4 + rng.next() * 0.3;
    const len = 0.2 + rng.next() * 0.08 + (1 - t) * 0.06;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(p.x + Math.cos(a) * 0.02, p.y, p.z + Math.sin(a) * 0.02),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.75 - rng.next() * 0.45 + t * 0.3, -a + Math.PI / 2, 0, 'YXZ')),
      new THREE.Vector3(1, 1, 1),
    );
    b.addMatrix('leaf', leaf(len, len * 0.62, { arch: 0.28, cup: 0.4, seg: 10 }), m, pick(rng, LEAVES), '#4f7f3a');
  }
}

// ───────────────────────────── plan ─────────────────────────────

type WallSide = 'back' | 'left' | 'right';

/** Where a floor piece may stand: centre, facing (rotY; its back against a wall) and that wall. */
interface Spot {
  x: number;
  z: number;
  rot: number;
  wall: WallSide;
}

interface FloorPiece {
  id: 'rack' | 'hutch' | 'fig';
  hx: number;
  hz: number;
  /** Height including what stands on it (for the trophy-case check). */
  h: number;
  /** Candidate spots in preference order: the back corner first (in the day-one framing), then a side wall. */
  spots: Spot[];
}

interface Plan {
  tiles: boolean;
  shelfY: number;
  /** Back-wall spans for stock shelves (world x), before trimming around the sign and the trophy case. */
  shelves: [number, number][];
  pieces: FloorPiece[];
}

const HALF_PI = Math.PI / 2;

/** Spots from `from` stepping toward `to` (inclusive) every ≈0.6 m. */
function slide(from: number, to: number): number[] {
  const n = Math.max(1, Math.ceil(Math.abs(to - from) / 0.6));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(from + ((to - from) * i) / n);
  return out;
}

/**
 * Candidate spots. Each piece first stands just inside the edge of the day-one overview framing (≈4.2 m either side
 * of the first tank), then slides toward its back corner as the exhibit row grows, then moves to a side wall.
 */
function planFor(level: FacilityLevelId, W: number, D: number): Plan | null {
  if (level !== 'specialty_shop' && level !== 'aquarium_store') return null;
  const back = -D / 2;
  const L = -W / 2;
  const R = W / 2;
  const edge = Math.min(4.2, R - 0.05);
  const hutch = { hx: 0.52, hz: 0.24 };
  const fig = { hx: 0.27, hz: 0.27 };
  const figX0 = edge - 0.25 - fig.hx;
  const hutchX0 = figX0 - fig.hx - 0.08 - hutch.hx;
  const onBack = (xs: number[], hz: number): Spot[] => xs.map((x) => ({ x, z: back + 0.02 + hz, rot: 0, wall: 'back' as const }));
  const pieces: FloorPiece[] = [
    {
      id: 'rack',
      hx: RACK.w / 2,
      hz: RACK.d / 2,
      h: 1.8,
      spots: [
        ...onBack(slide(-(edge - 0.25 - RACK.w / 2), L + 0.05 + RACK.w / 2), RACK.d / 2),
        { x: L + 0.02 + RACK.d / 2, z: back + 0.95 + RACK.w / 2, rot: HALF_PI, wall: 'left' },
        { x: L + 0.02 + RACK.d / 2, z: back + 2.3 + RACK.w / 2, rot: HALF_PI, wall: 'left' },
      ],
    },
    {
      id: 'hutch',
      ...hutch,
      h: 1.9,
      spots: [
        ...onBack(slide(hutchX0, R - 0.05 - fig.hx * 2 - 0.08 - hutch.hx), hutch.hz),
        { x: R - 0.02 - hutch.hz, z: back + 0.95 + hutch.hx, rot: -HALF_PI, wall: 'right' },
      ],
    },
    {
      id: 'fig',
      ...fig,
      h: 1.85,
      spots: [
        ...onBack(slide(figX0, R - 0.05 - fig.hx), 0.31),
        { x: R - 0.33, z: back + 2.5, rot: -HALF_PI, wall: 'right' },
        { x: R - 0.33, z: -0.1, rot: -HALF_PI, wall: 'right' },
      ],
    },
  ];
  // stock shelves: outboard of the sign's widest extent, inside the frame edge first (the slide spots follow)
  if (level === 'specialty_shop') return { tiles: true, shelfY: 2.08, shelves: [[-edge + 0.35, -2.35], [2.35, edge - 0.35]], pieces };
  return { tiles: false, shelfY: 2.36, shelves: [[L + 0.5, -2.95], [2.95, R - 0.5]], pieces };
}

/** The trophy case's rectangle on its wall (wall-local `along`), or null when there is no case. */
interface CaseRect {
  side: string;
  a0: number;
  a1: number;
  y0: number;
  y1: number;
}

function trophyCaseRect(g: GameState, level: FacilityLevelId, W: number, D: number): CaseRect | null {
  const trophies = g.shows?.trophies ?? [];
  if (!trophies.length) return null;
  const size = caseSize(level, trophies);
  const spot = chooseCaseSpot(g, level, W, D, size);
  return spot ? { side: spot.side, a0: spot.along - size.w / 2, a1: spot.along + size.w / 2, y0: spot.bottom, y1: spot.bottom + size.h } : null;
}

/** The shop sign's rectangle on the back wall — the same placement PublicRoom's <Sign> uses. */
function signRect(g: GameState, level: FacilityLevelId, W: number): { x0: number; x1: number; y0: number; y1: number } | null {
  const s = backWallSign(level, W, exhibitExtent(g));
  return s ? { x0: s.x - s.w / 2, x1: s.x + s.w / 2, y0: s.y - s.h / 2, y1: s.y + s.h / 2 } : null;
}

/** Subtract [a, b] from a list of spans. */
function cut(spans: [number, number][], a: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  for (const [s, e] of spans) {
    if (b <= s || a >= e) {
      out.push([s, e]);
      continue;
    }
    if (a > s) out.push([s, a]);
    if (b < e) out.push([b, e]);
  }
  return out;
}

/** Shelf spans after stepping around the sign, the trophy case and any tall tank in front of the wall. */
function shelfSpans(g: GameState, level: FacilityLevelId, W: number, D: number, plan: Plan, tc: CaseRect | null): [number, number][] {
  let spans = plan.shelves.map((s) => [s[0], s[1]] as [number, number]);
  const y0 = plan.shelfY - 0.25;
  const y1 = plan.shelfY + 0.36;
  const sign = signRect(g, level, W);
  if (sign && sign.y1 > y0 && sign.y0 < y1) spans = cut(spans, sign.x0 - 0.3, sign.x1 + 0.3);
  if (tc && tc.side === 'back' && tc.y0 < y1 && tc.y1 > y0) spans = cut(spans, tc.a0 - 0.25, tc.a1 + 0.25);
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (!t) continue;
    const fp = tankFootprint(t.tierId, t.placement);
    if (fp.cz - Math.max(fp.hx, fp.hz) > -D / 2 + 1.2) continue;
    const top = standHeight(t.tierId) + tankOuterSize(t.tierId).H + 0.2;
    if (top > y0) spans = cut(spans, fp.cx - Math.max(fp.hx, fp.hz) - 0.1, fp.cx + Math.max(fp.hx, fp.hz) + 0.1);
  }
  return spans.filter(([s, e]) => e - s >= 0.8);
}

/** Wall-local span of a piece standing against a wall (Room.toWallX: back → x, left → −z, right → z). */
function alongSpan(p: FloorPiece, at: Spot): [number, number] {
  const c = at.wall === 'back' ? at.x : at.wall === 'left' ? -at.z : at.z;
  return [c - p.hx, c + p.hx];
}

/**
 * Is a spot clear of every tank (+ its viewing walkway and the keepers' service room beside it), fixture, blocking
 * room prop, the trophy case on that wall, and the pieces already placed?
 */
function spotFree(g: GameState, level: FacilityLevelId, p: FloorPiece, at: Spot, taken: OBB[], trophy: CaseRect | null): boolean {
  const o: OBB = { cx: at.x, cz: at.z, hx: p.hx, hz: p.hz, rot: at.rot };
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (!t) continue;
    const fp = tankFootprint(t.tierId, t.placement);
    // keepers work beside a tank (≈0.3 m off its stand), visitors stand in front of it
    if (obbOverlap(o, { ...fp, hx: fp.hx + 0.55, hz: fp.hz + 0.12 })) return false;
    if (obbOverlap(o, tankFrontZone(t.tierId, t.placement))) return false;
  }
  for (const f of g.facility.fixtures ?? []) {
    const def = FIXTURE_DEFS[f.kind as FixtureKind];
    if (obbOverlap(o, { cx: f.x, cz: f.z, hx: (def?.w ?? 0.6) / 2, hz: (def?.d ?? 0.6) / 2, rot: f.rotY }, 0.15)) return false;
  }
  for (const pr of getFacilityLevel(level).props) {
    if (pr.blocks && obbOverlap(o, { cx: pr.x, cz: pr.z, hx: pr.w / 2, hz: pr.d / 2, rot: pr.rotY }, 0.1)) return false;
  }
  for (const q of taken) if (obbOverlap(o, q, 0.05)) return false;
  if (trophy && trophy.side === at.wall && trophy.y0 < p.h) {
    const [a0, a1] = alongSpan(p, at);
    if (a1 > trophy.a0 - 0.1 && a0 < trophy.a1 + 0.1) return false;
  }
  return true;
}

function layoutSig(g: GameState): string {
  let s = `${g.facility.level}:${g.facility.width}x${g.facility.depth}|`;
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (t) s += `${t.tierId}@${t.placement.x.toFixed(2)},${t.placement.z.toFixed(2)},${t.placement.rotY.toFixed(2)}|`;
  }
  for (const f of g.facility.fixtures ?? []) s += `${f.kind}@${f.x.toFixed(2)},${f.z.toFixed(2)},${f.rotY.toFixed(2)}|`;
  for (const t of g.shows?.trophies ?? []) s += `${t.id};`;
  return s;
}

// ───────────────────────────── component ─────────────────────────────

type Built = { back: Map<string, THREE.BufferGeometry>; left: Map<string, THREE.BufferGeometry>; right: Map<string, THREE.BufferGeometry>; floor: Map<string, THREE.BufferGeometry> };

function build(g: GameState, level: FacilityLevelId, W: number, D: number, plan: Plan): Built {
  const H = getFacilityLevel(level).wallHeight;
  const style = ROOM_STYLES[level];
  const inner = WALL_T / 2;
  const back = new VBatch();
  const left = new VBatch();
  const right = new VBatch();
  const floor = new VBatch();
  // wall-local batches: origin at the wall centre, +z into the room (see Room.wallFrame)
  if (plan.tiles) {
    const top = 1.12;
    const y0 = style.skirting;
    const band = (b: VBatch, len: number) => {
      b.add('tile', texturedPlane(len, top - y0, 0.6), [0, y0 + (top - y0) / 2, inner + 0.004]);
      b.add('vc', rbox(len, 0.034, 0.024, 0.009, 2), [0, top + 0.012, inner + 0.01], [0, 0, 0], 1, style.trim);
    };
    band(back, W);
    band(left, D);
    band(right, D);
  }
  const rng = visualRng(`dress:${level}`);
  const trophy = trophyCaseRect(g, level, W, D);
  const spans = shelfSpans(g, level, W, D, plan, trophy);
  for (const [x0, x1] of spans) stockShelf(back, x0, x1, plan.shelfY, inner, rng, x0 < 0 ? -1 : 1);
  const taken: OBB[] = [];
  for (const p of plan.pieces) {
    const at = p.spots.find((sp) => spotFree(g, level, p, sp, taken, trophy));
    if (!at) continue;
    taken.push({ cx: at.x, cz: at.z, hx: p.hx, hz: p.hz, rot: at.rot });
    floor.base.makeRotationY(at.rot).setPosition(at.x, 0, at.z);
    const r = visualRng(`dress:${level}:${p.id}`);
    if (p.id === 'rack') buildRack(floor, r);
    else if (p.id === 'hutch') buildHutch(floor, r);
    else buildFig(floor, r);
  }
  return { back: back.build(), left: left.build(), right: right.build(), floor: floor.build() };
}

const _cam = new THREE.Vector3();
const TRANSLUCENT = new Set(['glass', 'tankGlass', 'water', 'net']);

function DressingMeshes({ geoms, pick }: { geoms: Map<string, THREE.BufferGeometry>; pick: (k: string) => THREE.Material }) {
  return (
    <>
      {[...geoms.entries()].map(([k, g]) => (
        <mesh key={k} geometry={g} material={pick(k)} castShadow={!TRANSLUCENT.has(k) && k !== 'lit' && k !== 'tile' && k !== 'peg'} receiveShadow={!TRANSLUCENT.has(k) && k !== 'lit'} renderOrder={k === 'tankGlass' ? 3 : TRANSLUCENT.has(k) ? 2 : 0} />
      ))}
    </>
  );
}

export function ShopDressing({ level, width, depth, mats }: { level: FacilityLevelId; width: number; depth: number; mats: PropMaterials }) {
  const plan = useMemo(() => planFor(level, width, depth), [level, width, depth]);
  const sig = useGameSelector(layoutSig, '');
  const own = useMemo(() => {
    const tileTex = acquireTexture('dress:subway', subwayTiles);
    const pegTex = acquireTexture('dress:pegboard', pegboard);
    const netTex = acquireTexture('dress:netting', netting);
    return {
      tile: new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.22, bumpMap: tileTex, bumpScale: 0.45 }),
      peg: new THREE.MeshStandardMaterial({ map: pegTex, roughness: 0.85 }),
      vc: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
      leaf: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }),
      net: new THREE.MeshStandardMaterial({ map: netTex, roughness: 0.9, side: THREE.DoubleSide, transparent: true, depthWrite: false }),
      water: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false }),
      tankGlass: new THREE.MeshStandardMaterial({ color: '#a9cfcb', roughness: 0.06, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 0.5 }),
      // the starter tanks' lit backdrops: unlit, so they glow like the real exhibits do
      lit: new THREE.MeshBasicMaterial({ vertexColors: true }),
    };
  }, []);
  useEffect(
    () => () => {
      Object.values(own).forEach((m) => m.dispose());
      releaseTexture('dress:subway');
      releaseTexture('dress:pegboard');
      releaseTexture('dress:netting');
    },
    [own],
  );
  const built = useMemo(() => {
    const g = getGame();
    return g && plan ? build(g, level, width, depth, plan) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, plan, level, width, depth]);
  useEffect(
    () => () => {
      if (!built) return;
      for (const m of Object.values(built)) for (const geo of m.values()) geo.dispose();
    },
    [built],
  );
  const refs = { back: useRef<THREE.Group>(null), left: useRef<THREE.Group>(null), right: useRef<THREE.Group>(null), floor: useRef<THREE.Group>(null) };
  useEffect(() => {
    for (const r of Object.values(refs)) noPick(r.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built]);
  // wall parts hide with their wall in the dollhouse cut-away (same test as Room's <Wall>)
  useFrame(({ camera }) => {
    _cam.copy(camera.position);
    const below = _cam.y < 0;
    if (refs.back.current) refs.back.current.visible = below || _cam.z - (-depth / 2) > 0.05;
    if (refs.left.current) refs.left.current.visible = below || _cam.x - (-width / 2) > 0.05;
    if (refs.right.current) refs.right.current.visible = below || width / 2 - _cam.x > 0.05;
  });
  if (!plan || !built) return null;
  const pick = (k: string): THREE.Material => (own as unknown as Record<string, THREE.Material>)[k] ?? matByKey(mats, k);
  return (
    <group name="shop-dressing">
      <group ref={refs.back} position={[0, 0, -depth / 2 - WALL_T / 2]}>
        <DressingMeshes geoms={built.back} pick={pick} />
      </group>
      <group ref={refs.left} position={[-width / 2 - WALL_T / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <DressingMeshes geoms={built.left} pick={pick} />
      </group>
      <group ref={refs.right} position={[width / 2 + WALL_T / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <DressingMeshes geoms={built.right} pick={pick} />
      </group>
      <group ref={refs.floor}>
        <DressingMeshes geoms={built.floor} pick={pick} />
      </group>
    </group>
  );
}
