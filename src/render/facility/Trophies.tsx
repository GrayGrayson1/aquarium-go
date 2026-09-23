/**
 * The trophy case: every rosette, cup, plaque and bowl won at shows, displayed in the facility. OWNER: lane "shows".
 *
 *  hobby room      two floating walnut shelves with brass brackets, rosettes pinned to the wall above them
 *  shop → hall     a wall-hung glass vitrine: smoked-oak frame, softly lit back panel, glass shelves, an LED strip
 *
 * All art is procedural: lathe-turned cups and bowls with twin tube handles on walnut plinths, pleated rosettes
 * (scalloped extrusions + a domed button + notched tails), shield plaques. Everything is merged into one mesh per
 * material (≈7 draw calls for the whole case) and rebuilt only when the trophies or the room layout change.
 *
 * Placement: the case hangs on a wall above head height, at a spot chosen from the room itself — away from doors,
 * windows, the shop sign, paintings and tall props, and above any tank standing in front of that stretch of wall —
 * so it never clashes with tanks or walking visitors. It hides with its wall in the dollhouse cut-away.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { FacilityLevelId, GameState, ShowTier, TrophyRecord } from '@/types';
import { useGameSelector, getGame } from '@/state/game';
import { getFacilityLevel } from '@/data/facilities';
import { SHOW_TIERS } from '@/data/shows';
import { standHeight } from '@/sim/tankSpace';
import { tankFootprint, tankOuterSize } from '@/sim/facility/layout';
import { rbox, box, lathe, tube, cyl, noPick } from './kit';
import { matByKey, type PropMaterials } from './materials';
import { levelOpenings, wallFrame, WALL_T, type WallSide } from './Room';
import { ROOM_STYLES } from './styles';

// ───────────────────────────── merged, vertex-coloured batches ─────────────────────────────

type Key = 'metal' | 'fabric' | 'walnut' | 'oak' | 'smoked' | 'brass' | 'glass' | 'bulb' | 'backlight' | 'plate';

const WHITE = new THREE.Color(1, 1, 1);

/** Like kit.Batch, but keeps a per-vertex colour so gold, silver and ribbon colours share one material each. */
class ColorBatch {
  private parts = new Map<Key, THREE.BufferGeometry[]>();

  add(key: Key, geom: THREE.BufferGeometry, m: THREE.Matrix4, color: THREE.Color = WHITE): void {
    const g = geom.index ? geom.toNonIndexed() : geom.clone();
    geom.dispose();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const n = g.getAttribute('position').count;
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.morphAttributes = {};
    g.applyMatrix4(m);
    const list = this.parts.get(key) ?? [];
    list.push(g);
    this.parts.set(key, list);
  }

  build(): Map<Key, THREE.BufferGeometry> {
    const out = new Map<Key, THREE.BufferGeometry>();
    for (const [key, list] of this.parts) {
      const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (merged) {
        merged.computeBoundingSphere();
        out.set(key, merged);
      }
      if (list.length > 1) for (const x of list) x.dispose();
    }
    this.parts.clear();
    return out;
  }
}

const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const S = new THREE.Vector3();
const P = new THREE.Vector3();
function mat(pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: number | [number, number, number] = 1): THREE.Matrix4 {
  E.set(rot[0], rot[1], rot[2]);
  Q.setFromEuler(E);
  if (typeof scale === 'number') S.set(scale, scale, scale);
  else S.set(scale[0], scale[1], scale[2]);
  return new THREE.Matrix4().compose(P.set(pos[0], pos[1], pos[2]), Q, S);
}

// ───────────────────────────── colours ─────────────────────────────

const METAL = {
  gold: new THREE.Color('#ffd27a'),
  silver: new THREE.Color('#eef2f5'),
  bronze: new THREE.Color('#c98f58'),
  brass: new THREE.Color('#d2a95e'),
};
const RIBBON: Record<string, [string, string, string]> = {
  '1': ['#2d58ae', '#3d6fd1', '#6b96ec'],
  '2': ['#9c3036', '#c8454a', '#e2716f'],
  '3': ['#b98a28', '#d9a93c', '#efcb6f'],
  '4': ['#2f7c5b', '#3f9a73', '#6cc39a'],
  bis: ['#5e3fa6', '#7b55c9', '#a684ea'],
};
const lin = (hex: string) => new THREE.Color(hex);

function metalFor(t: Pick<TrophyRecord, 'tier' | 'bestInShow' | 'place'>): THREE.Color {
  if (t.bestInShow || t.tier === 'international') return METAL.gold;
  if (t.tier === 'national' || t.tier === 'regional') return METAL.silver;
  return METAL.bronze;
}

// lane:w2-visual — engraved name plates. They used the polished, self-lit cup metal and read as flat glowing
// orange/white cards; now a darker brushed brass on its own unlit-free material ('plate'), with two faint engraved
// lines, so they sit on the plinths as small metal plates.
const PLATE = new THREE.Color('#a8844c');
const ENGRAVE = new THREE.Color('#4a3519');

/** A brushed-brass plate (w × h, front face at z = +depth/2 of `at`) with two engraved text lines. */
function addPlate(b: ColorBatch, at: THREE.Matrix4, w: number, h: number, depth = 0.002): void {
  b.add('plate', rbox(w, h, depth, Math.min(0.0015, h * 0.2), 1), at, PLATE);
  const lw = w * 0.7;
  const lh = Math.max(0.0008, h * 0.11);
  b.add('plate', box(lw, lh, 0.0004), at.clone().multiply(mat([0, h * 0.16, depth / 2 + 0.0002])), ENGRAVE);
  b.add('plate', box(lw * 0.62, lh, 0.0004), at.clone().multiply(mat([0, -h * 0.18, depth / 2 + 0.0002])), ENGRAVE);
}

// ───────────────────────────── trophy models ─────────────────────────────

/** Cup height (m) by prestige. */
function cupHeight(t: Pick<TrophyRecord, 'tier' | 'bestInShow'>): number {
  const base: Record<ShowTier, number> = { club: 0.16, regional: 0.18, national: 0.23, international: 0.27 };
  return base[t.tier] + (t.bestInShow ? 0.05 : 0);
}

/** A two-handled cup on a walnut plinth, base at y = 0, facing +z. Returns its footprint width. */
function addCup(b: ColorBatch, at: THREE.Matrix4, t: TrophyRecord): number {
  const h = cupHeight(t);
  const metal = metalFor(t);
  const plinthH = h * 0.2;
  const pw = h * 0.5;
  b.add('walnut', rbox(pw, plinthH, pw, 0.006), at.clone().multiply(mat([0, plinthH / 2, 0])));
  addPlate(b, at.clone().multiply(mat([0, plinthH * 0.5, pw / 2 + 0.001])), pw * 0.62, plinthH * 0.38);
  const s = h - plinthH;
  const prof: [number, number][] = [
    [0.001, 0],
    [0.3, 0],
    [0.31, 0.025],
    [0.24, 0.06],
    [0.11, 0.1],
    [0.06, 0.17],
    [0.052, 0.3],
    [0.1, 0.335],
    [0.052, 0.37],
    [0.06, 0.43],
    [0.15, 0.48],
    [0.27, 0.6],
    [0.34, 0.78],
    [0.36, 0.95],
    [0.375, 1],
    [0.345, 1],
    [0.33, 0.95],
    [0.31, 0.79],
    [0.22, 0.63],
    [0.001, 0.56],
  ];
  b.add('metal', lathe(prof, 28), at.clone().multiply(mat([0, plinthH, 0], [0, 0, 0], s)), metal);
  for (const side of [-1, 1]) {
    const pts: [number, number, number][] = [
      [side * 0.33 * s, plinthH + 0.9 * s, 0],
      [side * 0.52 * s, plinthH + 0.86 * s, 0],
      [side * 0.5 * s, plinthH + 0.66 * s, 0],
      [side * 0.26 * s, plinthH + 0.6 * s, 0],
    ];
    b.add('metal', tube(pts, 0.022 * s, 14, 6), at, metal);
  }
  if (t.bestInShow) {
    // a small finial star-knob on a lid for the grand trophies
    b.add('metal', lathe([[0.001, 1], [0.34, 1.0], [0.3, 1.05], [0.12, 1.1], [0.05, 1.16], [0.07, 1.2], [0.001, 1.24]], 24), at.clone().multiply(mat([0, plinthH, 0], [0, 0, 0], s)), metal);
  }
  return pw;
}

/** A shallow silver (or gold) bowl on a round walnut base. */
function addBowl(b: ColorBatch, at: THREE.Matrix4, t: TrophyRecord): number {
  const metal = t.tier === 'international' ? METAL.gold : METAL.silver;
  const r = t.tier === 'international' ? 0.13 : 0.11;
  b.add('walnut', cyl(r * 0.62, r * 0.66, 0.035, 28), at.clone().multiply(mat([0, 0.0175, 0])));
  const prof: [number, number][] = [
    [0.001, 0],
    [0.45, 0],
    [0.46, 0.05],
    [0.2, 0.12],
    [0.16, 0.26],
    [0.34, 0.32],
    [0.8, 0.5],
    [0.98, 0.72],
    [1.0, 0.78],
    [0.95, 0.78],
    [0.93, 0.72],
    [0.76, 0.52],
    [0.001, 0.42],
  ];
  b.add('metal', lathe(prof, 36), at.clone().multiply(mat([0, 0.035, 0], [0, 0, 0], [r, r, r])), metal);
  return r * 2;
}

/** Shield outline (width w, height h) with its base centred at the origin. */
function shieldShape(w: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, h);
  s.lineTo(w / 2, h);
  s.lineTo(w / 2, h * 0.42);
  s.quadraticCurveTo(w / 2, h * 0.1, 0, 0);
  s.quadraticCurveTo(-w / 2, h * 0.1, -w / 2, h * 0.42);
  s.lineTo(-w / 2, h);
  return s;
}

/** A walnut shield plaque with a brass plate and a brass wave emblem, leaning back on a little stand. */
function addPlaque(b: ColorBatch, at: THREE.Matrix4): number {
  const w = 0.13;
  const h = 0.17;
  const lean = at.clone().multiply(mat([0, 0.004, 0], [-0.14, 0, 0]));
  const g = new THREE.ExtrudeGeometry(shieldShape(w, h), { depth: 0.014, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 10 });
  b.add('walnut', g, lean);
  addPlate(b, lean.clone().multiply(mat([0, h * 0.78, 0.019])), w * 0.64, 0.024, 0.003);
  b.add('metal', tube([[-0.035, h * 0.52, 0.019], [-0.012, h * 0.58, 0.019], [0.012, h * 0.48, 0.019], [0.035, h * 0.54, 0.019]], 0.004, 16, 5), lean, METAL.brass);
  b.add('metal', lathe([[0.001, 0], [0.017, 0], [0.014, 0.006], [0.001, 0.008]], 20), lean.clone().multiply(mat([0, h * 0.38, 0.018], [Math.PI / 2, 0, 0])), METAL.brass);
  b.add('smoked', box(0.05, 0.004, 0.05), at.clone().multiply(mat([0, 0.002, -0.02])));
  return w;
}

/** Scalloped (pleated) disc of radius r, extruded along +z. */
function pleatGeo(r: number, depth: number, n: number, amp: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const steps = n * 6;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r * (1 - amp * 0.5 + amp * 0.5 * Math.cos(a * n));
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 1 });
}

/** A notched ribbon tail hanging down from the origin (length len, width w). */
function tailGeo(len: number, w: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, -len);
  s.lineTo(0, -len + w * 0.55);
  s.lineTo(-w / 2, -len);
  s.lineTo(-w / 2, 0);
  const g = new THREE.ShapeGeometry(s, 1);
  // a gentle curl so the satin catches the light
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    pos.setZ(i, 0.004 * Math.sin((-y / len) * Math.PI) + 0.002 * (x / w));
  }
  g.computeVertexNormals();
  return g;
}

/** A show rosette facing +z, centred at the origin (hangs from a wall or back panel). Size = outer diameter. */
function addRosette(b: ColorBatch, at: THREE.Matrix4, place: 1 | 2 | 3 | 4, bis: boolean, size = 0.1): void {
  const [dark, mid, light] = RIBBON[bis ? 'bis' : String(place)].map(lin);
  const r = size / 2;
  for (const side of [-1, 1]) {
    b.add('fabric', tailGeo(size * 1.05, size * 0.3), at.clone().multiply(mat([side * r * 0.22, -r * 0.1, 0.001], [0, 0, side * 0.22])), side < 0 ? mid : dark);
  }
  b.add('fabric', pleatGeo(r, 0.004, 22, 0.16), at.clone().multiply(mat([0, 0, 0.003])), dark);
  b.add('fabric', pleatGeo(r * 0.8, 0.004, 20, 0.18), at.clone().multiply(mat([0, 0, 0.007])), mid);
  b.add('fabric', pleatGeo(r * 0.6, 0.004, 18, 0.2), at.clone().multiply(mat([0, 0, 0.011])), light);
  // domed button
  b.add('metal', lathe([[0.001, 0], [r * 0.4, 0], [r * 0.36, r * 0.12], [r * 0.2, r * 0.2], [0.001, r * 0.23]], 22), at.clone().multiply(mat([0, 0, 0.015], [Math.PI / 2, 0, 0])), bis ? METAL.gold : METAL.brass);
}

// ───────────────────────────── display furniture ─────────────────────────────

export interface CaseSize {
  kind: 'shelf' | 'vitrine';
  w: number;
  h: number;
  d: number;
}

const isStanding = (t: TrophyRecord) => t.kind !== 'rosette';

/** Hobby shelf rows needed for these trophies (0–2 shelves of standing pieces). */
function shelfCount(trophies: TrophyRecord[]): number {
  const standing = Math.min(8, trophies.filter(isStanding).length);
  return standing > 4 ? 2 : standing > 0 ? 1 : 0;
}

/** Height of the rosette row above the shelves (hobby room). */
const ROSETTE_Y = [0.14, 0.35, 0.68];

export function caseSize(level: FacilityLevelId, trophies: TrophyRecord[] = []): CaseSize {
  if (level === 'hobby_room') return { kind: 'shelf', w: 1.1, h: ROSETTE_Y[shelfCount(trophies)] + 0.08, d: 0.2 };
  const p = planVitrine(level, trophies);
  return { kind: 'vitrine', w: p.w, h: p.h, d: p.d };
}

/** Prestige order: Best in Show, then tier, then placing, newest first. */
function prestige(a: TrophyRecord, b: TrophyRecord): number {
  return Number(!!b.bestInShow) - Number(!!a.bestInShow) || SHOW_TIERS[b.tier].order - SHOW_TIERS[a.tier].order || a.place - b.place || b.hour - a.hour;
}

function addStanding(b: ColorBatch, at: THREE.Matrix4, t: TrophyRecord): void {
  if (t.kind === 'cup') addCup(b, at, t);
  else if (t.kind === 'bowl') addBowl(b, at, t);
  else addPlaque(b, at);
}

/** Lay trophies out along a shelf of width w (centred), standing on y = 0 at depth z. */
function shelfRow(b: ColorBatch, items: TrophyRecord[], w: number, y: number, z: number): void {
  const n = items.length;
  if (!n) return;
  const step = Math.min(0.3, (w - 0.12) / n);
  items.forEach((t, i) => {
    const x = (i - (n - 1) / 2) * step;
    addStanding(b, mat([x, y, z], [0, (i % 2 ? -1 : 1) * 0.12, 0]), t);
  });
}

/** Rosettes in a neat row (or two), centred on x = 0 at height y, pinned to a surface at depth z. */
function rosetteRows(b: ColorBatch, items: TrophyRecord[], w: number, y: number, z: number, size: number, rowGap: number): void {
  const perRow = Math.max(1, Math.floor((w - 0.06) / (size * 1.25)));
  items.forEach((t, i) => {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, items.length - row * perRow);
    const col = i % perRow;
    const x = (col - (inRow - 1) / 2) * size * 1.25;
    addRosette(b, mat([x, y - row * rowGap, z], [0, 0, (col % 2 ? -1 : 1) * 0.05]), t.place, !!t.bestInShow, size);
  });
}

function buildShelf(size: CaseSize, trophies: TrophyRecord[]): ColorBatch {
  const b = new ColorBatch();
  const { w, d } = size;
  const standing = trophies.filter(isStanding).sort(prestige).slice(0, 8);
  const rosettes = trophies.filter((t) => !isStanding(t)).sort(prestige).slice(0, 7);
  const shelves = shelfCount(trophies);
  const shelfY = [0, 0.34];
  for (let i = 0; i < shelves; i++) {
    const y = shelfY[i];
    // a floating oak shelf (hidden fixings) with a slim brass lip
    b.add('oak', rbox(w, 0.034, d, 0.008, 2), mat([0, y - 0.017, d / 2]));
    b.add('brass', box(w - 0.01, 0.006, 0.004), mat([0, y - 0.012, d + 0.001]));
  }
  if (shelves === 2) {
    shelfRow(b, standing.slice(4), w, shelfY[0], d * 0.5);
    shelfRow(b, standing.slice(0, 4), w, shelfY[1], d * 0.5);
  } else if (shelves === 1) shelfRow(b, standing, w, shelfY[0], d * 0.5);
  // rosettes pinned to the wall above the shelves (or on their own when there are no cups yet)
  rosetteRows(b, rosettes, w + 0.1, ROSETTE_Y[shelves], 0.004, 0.115, 0.22);
  return b;
}

interface VitrineRow {
  kind: 'rosettes' | 'standing';
  items: TrophyRecord[];
  h: number;
}

interface VitrinePlan {
  scale: number;
  w: number;
  h: number;
  d: number;
  /** Top to bottom. */
  rows: VitrineRow[];
}

const PLINTH = 0.07;
const CAP = 0.06;

/**
 * Size the vitrine to what it holds: a small case for a first cup and a few rosettes, growing (up to the venue's
 * maximum) as the collection does — the cabinet itself becomes a record of the player's show career.
 */
function planVitrine(level: FacilityLevelId, trophies: TrophyRecord[]): VitrinePlan {
  const order = getFacilityLevel(level).order;
  const scale = level === 'grand_hall' ? 1.25 : order >= 3 ? 1.1 : 1;
  const maxW = level === 'grand_hall' ? 2.4 : order >= 3 ? 1.95 : 1.6;
  const sStep = 0.3 * scale;
  const rStep = 0.1375 * scale;
  const perRowS = Math.max(1, Math.floor((maxW - 0.2) / sStep));
  const perRowR = Math.max(1, Math.floor((maxW - 0.16) / rStep));
  const standing = trophies.filter(isStanding).sort(prestige).slice(0, perRowS * 2);
  const rowsS = standing.length === 0 ? 0 : standing.length > Math.min(4, perRowS) ? 2 : 1;
  const rowsR = standing.length ? 1 : 2;
  const rosettes = trophies.filter((t) => !isStanding(t)).sort(prestige).slice(0, perRowR * rowsR);
  const rows: VitrineRow[] = [];
  const rosetteRowsNeeded = rosettes.length === 0 ? 0 : Math.min(rowsR, Math.ceil(rosettes.length / perRowR));
  for (let i = 0; i < rosetteRowsNeeded; i++) rows.push({ kind: 'rosettes', items: rosettes.slice(i * perRowR, (i + 1) * perRowR), h: 0.26 * scale });
  if (rowsS > 0) {
    const per = Math.ceil(standing.length / rowsS);
    for (let i = 0; i < rowsS; i++) rows.push({ kind: 'standing', items: standing.slice(i * per, (i + 1) * per), h: 0.42 * scale });
  }
  const widest = Math.max(0, ...rows.map((r) => (r.kind === 'standing' ? r.items.length * sStep + 0.2 : r.items.length * rStep + 0.16)));
  const w = Math.min(maxW, Math.max(0.85 * scale, widest));
  const h = PLINTH + CAP + 0.03 + rows.reduce((a, r) => a + r.h, 0);
  return { scale, w, h, d: (order >= 3 ? 0.34 : 0.3) * (level === 'grand_hall' ? 1.1 : 1), rows };
}

function buildVitrine(plan: VitrinePlan): ColorBatch {
  const b = new ColorBatch();
  const { w, h, d, scale } = plan;
  const inner = h - PLINTH - CAP;
  // frame
  b.add('smoked', rbox(w + 0.05, PLINTH, d + 0.03, 0.01), mat([0, PLINTH / 2, d / 2]));
  b.add('smoked', rbox(w + 0.05, CAP, d + 0.03, 0.01), mat([0, h - CAP / 2, d / 2]));
  for (const sx of [-1, 1]) b.add('smoked', box(0.035, inner, d), mat([sx * (w / 2 - 0.0175), PLINTH + inner / 2, d / 2]));
  b.add('backlight', box(w - 0.07, inner, 0.012), mat([0, PLINTH + inner / 2, 0.006]));
  b.add('brass', box(w + 0.05, 0.008, 0.006), mat([0, h - CAP - 0.004, d + 0.016]));
  b.add('brass', box(w + 0.05, 0.008, 0.006), mat([0, PLINTH + 0.004, d + 0.016]));
  addPlate(b, mat([0, PLINTH * 0.5, d + 0.017]), Math.min(0.28, w * 0.3), 0.034, 0.004);
  b.add('bulb', box(w - 0.12, 0.006, 0.012), mat([0, h - CAP - 0.006, d - 0.03]));
  b.add('glass', box(w - 0.07, inner, 0.006), mat([0, PLINTH + inner / 2, d - 0.004]));
  // rows, bottom up; a glass shelf under every row but the lowest
  let y = PLINTH + 0.004;
  const bottomUp = [...plan.rows].reverse();
  bottomUp.forEach((row, i) => {
    if (i > 0) b.add('glass', box(w - 0.075, 0.008, d - 0.05), mat([0, y - 0.004, d / 2 - 0.01]));
    if (row.kind === 'standing') shelfRowScaled(b, row.items, w, y, d * 0.46, scale);
    else rosetteRows(b, row.items, w - 0.08, y + row.h * 0.62, 0.014, 0.11 * scale, row.h);
    y += row.h;
  });
  return b;
}

function shelfRowScaled(b: ColorBatch, items: TrophyRecord[], w: number, y: number, z: number, scale: number): void {
  const n = items.length;
  if (!n) return;
  const step = Math.min(0.34 * scale, (w - 0.14) / n);
  items.forEach((t, i) => {
    const x = (i - (n - 1) / 2) * step;
    addStanding(b, mat([x, y, z], [0, (i % 2 ? -1 : 1) * 0.1, 0], scale), t);
  });
}

// ───────────────────────────── placement ─────────────────────────────

interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface CaseSpot {
  side: WallSide;
  along: number;
  bottom: number;
}

const PROP_H: Record<string, number> = {
  bookshelf: 2.1,
  armchair: 1.05,
  side_table: 0.75,
  floor_lamp: 1.65,
  houseplant: 1.6,
  door_swing: 2.15,
  counter: 1.45,
  merch_shelf: 1.95,
  planter: 1.9,
  reception: 1.5,
  ticket_gate: 1.15,
  column: 99,
  rug: 0,
};

/** Wall-local rectangles the case must not overlap: openings, the shop sign, paintings, tall props, curtains. */
function wallObstacles(level: FacilityLevelId, width: number, depth: number, H: number): Record<WallSide, Rect[]> {
  const def = getFacilityLevel(level);
  const out: Record<WallSide, Rect[]> = { back: [], front: [], left: [], right: [] };
  const open = levelOpenings(level, width, depth, def.entrance.x);
  for (const side of ['back', 'left', 'right'] as WallSide[]) for (const o of open[side]) out[side].push({ x0: o.x0 - 0.3, x1: o.x1 + 0.3, y0: 0, y1: Math.max(o.y1 + 0.35, o.kind === 'window' ? H : o.y1 + 0.35) });
  const style = ROOM_STYLES[level];
  if (level !== 'hobby_room' && style.sign.w > 0) {
    const signW = Math.min(width * 0.5, style.sign.w);
    const signH = signW * 0.22;
    const signY = Math.min(H - signH / 2 - 0.15, style.sign.y);
    out.back.push({ x0: -signW / 2 - 0.35, x1: signW / 2 + 0.35, y0: signY - signH / 2 - 0.3, y1: signY + signH / 2 + 0.3 });
  }
  if (level === 'aquarium_store') {
    out.left.push({ x0: 1.2 - 1.3, x1: 1.2 + 1.3, y0: 2.6, y1: 3.4 });
    out.right.push({ x0: -2.2 - 1.5, x1: -2.2 + 1.5, y0: 2.6, y1: 3.4 });
  }
  if (level === 'hobby_room') {
    // paintings and curtains (see HobbyRoom.tsx)
    out.left.push({ x0: -1.05 - 0.42, x1: -1.05 + 0.42, y0: 1.3, y1: 1.95 });
    out.back.push({ x0: -1.55 - 0.34, x1: -1.55 + 0.34, y0: 1.15, y1: 1.95 });
    out.back.push({ x0: 0.85 - 0.6, x1: 1.85 + 0.6, y0: 0, y1: H });
  }
  // props standing against a wall
  for (const p of def.props) {
    const hgt = PROP_H[p.kind] ?? 1.2;
    if (hgt <= 0) continue;
    const swap = Math.abs(Math.sin(p.rotY)) > 0.7;
    const hx = (swap ? p.d : p.w) / 2;
    const hz = (swap ? p.w : p.d) / 2;
    const near = 0.9;
    if (p.z - hz - -depth / 2 < near) out.back.push({ x0: p.x - hx - 0.15, x1: p.x + hx + 0.15, y0: 0, y1: hgt + 0.15 });
    if (p.x - hx - -width / 2 < near) out.left.push({ x0: -(p.z + hz) - 0.15, x1: -(p.z - hz) + 0.15, y0: 0, y1: hgt + 0.15 });
    if (width / 2 - (p.x + hx) < near) out.right.push({ x0: p.z - hz - 0.15, x1: p.z + hz + 0.15, y0: 0, y1: hgt + 0.15 });
  }
  return out;
}

/** Tanks standing near a wall, as wall-local spans with the height the case must clear. */
function tankSpans(g: GameState, width: number, depth: number): Record<WallSide, { x0: number; x1: number; top: number }[]> {
  const out: Record<WallSide, { x0: number; x1: number; top: number }[]> = { back: [], front: [], left: [], right: [] };
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (!t) continue;
    let top = 1.4;
    let hx = 0.5;
    let hz = 0.3;
    try {
      const f = tankFootprint(t.tierId, t.placement);
      const c = Math.abs(Math.cos(f.rot));
      const s = Math.abs(Math.sin(f.rot));
      hx = f.hx * c + f.hz * s;
      hz = f.hx * s + f.hz * c;
      top = standHeight(t.tierId) + tankOuterSize(t.tierId).H + 0.1;
    } catch {
      /* unknown tier: keep the defaults */
    }
    const { x, z } = t.placement;
    const near = 1.4;
    if (z - hz - -depth / 2 < near) out.back.push({ x0: x - hx, x1: x + hx, top });
    if (x - hx - -width / 2 < near) out.left.push({ x0: -(z + hz), x1: -(z - hz), top });
    if (width / 2 - (x + hx) < near) out.right.push({ x0: z - hz, x1: z + hz, top });
  }
  return out;
}

/** Choose where the case hangs: the lowest comfortable spot, back wall first, clear of everything. */
export function chooseCaseSpot(g: GameState, level: FacilityLevelId, width: number, depth: number, size: CaseSize): CaseSpot | null {
  const def = getFacilityLevel(level);
  const H = def.wallHeight;
  const minBottom = level === 'hobby_room' ? 1.55 : def.order >= 3 ? 1.45 : 1.38;
  const topLimit = H - (ROOM_STYLES[level].crown ? 0.22 : 0.18);
  const obstacles = wallObstacles(level, width, depth, H);
  const tanks = tankSpans(g, width, depth);
  const sign = ROOM_STYLES[level].sign;
  const signW = Math.min(width * 0.5, sign.w);
  let best: (CaseSpot & { cost: number }) | null = null;
  for (const side of ['back', 'left', 'right'] as WallSide[]) {
    const len = side === 'back' ? width : depth;
    const half = len / 2 - size.w / 2 - 0.35;
    if (half < 0) continue;
    const pref =
      side === 'back'
        ? level === 'hobby_room'
          ? -0.45
          : -(signW / 2 + size.w / 2 + 0.7)
        : side === 'left'
          ? depth / 2 - size.w / 2 - 0.9
          : -(depth / 2 - size.w / 2 - 0.9);
    const sidePenalty = side === 'back' ? 0 : level === 'hobby_room' ? (side === 'left' ? 0.5 : 0.9) : 0.6;
    for (let along = -half; along <= half + 1e-6; along += 0.2) {
      const x0 = along - size.w / 2 - 0.08;
      const x1 = along + size.w / 2 + 0.08;
      let bottom = minBottom;
      for (const s of tanks[side]) if (s.x1 > x0 && s.x0 < x1) bottom = Math.max(bottom, s.top + 0.15);
      if (bottom + size.h > topLimit) continue;
      const y0 = bottom;
      const y1 = bottom + size.h;
      if (obstacles[side].some((r) => r.x1 > x0 && r.x0 < x1 && r.y1 > y0 && r.y0 < y1)) continue;
      const cost = (bottom - minBottom) * 1.5 + sidePenalty + Math.abs(along - pref) * 0.04;
      if (!best || cost < best.cost - 1e-9) best = { side, along, bottom, cost };
    }
  }
  return best ? { side: best.side, along: best.along, bottom: best.bottom } : null;
}

// ───────────────────────────── component ─────────────────────────────

const _cam = new THREE.Vector3();

/** Add `vColor × glow` to a vertex-coloured material's emission (cheap stand-in for a display-case light). */
function withSelfGlow(m: THREE.MeshStandardMaterial, glow: number): void {
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor.rgb * ${glow.toFixed(3)};`);
  };
  m.customProgramCacheKey = () => `trophy-glow-${glow.toFixed(3)}`;
}

/** Signature of what the case shows (rebuild only when it changes). */
function trophySig(g: GameState): string {
  const t = g.shows?.trophies;
  if (!t?.length) return '';
  let s = '';
  for (const x of t) s += `${x.id}:${x.kind}:${x.tier}:${x.place}:${x.bestInShow ? 1 : 0}|`;
  return s;
}

function layoutSig(g: GameState): string {
  let s = `${g.facility.level}:${g.facility.width}:${g.facility.depth}|`;
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (t) s += `${t.tierId}@${t.placement.x.toFixed(2)},${t.placement.z.toFixed(2)},${t.placement.rotY.toFixed(2)}|`;
  }
  return s;
}

export function TrophyCase({ mats, level, width, depth }: { mats: PropMaterials; level: FacilityLevelId; width: number; depth: number }) {
  const tSig = useGameSelector(trophySig, '');
  const lSig = useGameSelector(layoutSig, '');
  const own = useMemo(() => {
    const dark = getFacilityLevel(level).order >= 3;
    const metal = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, metalness: 0.92, roughness: 0.26, envMapIntensity: 2.2 });
    const fabric = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.52, metalness: 0, side: THREE.DoubleSide });
    // A little of each piece's own colour as glow, as if lit by the case's LED strip (no extra scene lights —
    // adding a light would recompile every material in the room).
    withSelfGlow(metal, dark ? 0.2 : 0.07);
    withSelfGlow(fabric, dark ? 0.16 : 0.04);
    return {
      metal,
      fabric,
      // clearer than the room's prop glass so the case reads as a showcase, not a frosted box
      // (a dark tint: in a dim room even a faint light-coloured pane lifts the blacks into a grey haze)
      glass: new THREE.MeshStandardMaterial({ color: '#16272c', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 0.25 }),
      backlight: new THREE.MeshStandardMaterial({ color: dark ? '#0d171c' : '#17252a', roughness: 0.96, emissive: new THREE.Color(dark ? '#16323a' : '#1c3237'), emissiveIntensity: dark ? 0.5 : 0.22 }),
      // lane:w2-visual — brushed brass name plates: no self-glow, soft reflections (see addPlate)
      plate: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, metalness: 0.8, roughness: 0.5, envMapIntensity: 0.7 }),
    };
  }, [level]);
  useEffect(() => () => Object.values(own).forEach((m) => m.dispose()), [own]);

  const built = useMemo(() => {
    const g = getGame();
    if (!g || !tSig) return null;
    const trophies = g.shows?.trophies ?? [];
    const size = caseSize(level, trophies);
    const spot = chooseCaseSpot(g, level, width, depth, size);
    if (!spot) return null;
    const batch = size.kind === 'shelf' ? buildShelf(size, trophies) : buildVitrine(planVitrine(level, trophies));
    return { spot, geoms: batch.build() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tSig, lSig, level, width, depth]);
  useEffect(() => () => built?.geoms.forEach((geo) => geo.dispose()), [built]);

  const ref = useRef<THREE.Group>(null);
  useEffect(() => noPick(ref.current), [built]);
  const frame = built ? wallFrame(built.spot.side, width, depth) : null;
  // hide with its wall when the dollhouse cut-away drops that wall
  useFrame(({ camera }) => {
    const grp = ref.current;
    if (!grp || !frame) return;
    _cam.copy(camera.position);
    const px = frame.pos[0] + frame.inward[0] * (WALL_T / 2);
    const pz = frame.pos[2] + frame.inward[1] * (WALL_T / 2);
    const s = (_cam.x - px) * frame.inward[0] + (_cam.z - pz) * frame.inward[1];
    grp.visible = s > 0.05 || _cam.y < 0;
  });
  if (!built || !frame) return null;
  const pick = (k: Key): THREE.Material => (k === 'metal' ? own.metal : k === 'fabric' ? own.fabric : k === 'backlight' ? own.backlight : k === 'glass' ? own.glass : k === 'plate' ? own.plate : matByKey(mats, k));
  return (
    <group ref={ref} name="trophy-case" position={frame.pos} rotation={[0, frame.rotY, 0]}>
      <group position={[built.spot.along, built.spot.bottom, WALL_T / 2 + 0.002]}>
        {[...built.geoms.entries()].map(([k, geo]) => (
          <mesh key={k} geometry={geo} material={pick(k)} castShadow={k === 'oak' || k === 'walnut' || k === 'metal' || k === 'smoked'} receiveShadow={k !== 'glass' && k !== 'bulb'} renderOrder={k === 'glass' ? 2 : 0} />
        ))}
      </group>
    </group>
  );
}
