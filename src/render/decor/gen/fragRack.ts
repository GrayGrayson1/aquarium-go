/**
 * Frag rack + frag plug geometry (lane "frags"). Original procedural construction.
 *
 *  frag rack  a clear, lightly smoked acrylic shelf on four slim round posts with a 5 × 2 grid of plug holes (true
 *             round holes: each hole cell is a square-with-a-circle mesh, so the plate stays crisp at any distance). The
 *             rim is chamfered with rounded corners; polished edges are tagged (aExtra.x = 1) so the see-through acrylic
 *             material (render/decor/acrylic.ts) makes them denser and a touch light-piped, like real cast acrylic.
 *  frag plug  the ceramic plug a frag is glued to: a domed, chamfered cap on a short stem that seats in a rack hole or
 *             in the rock. Rendered per frag instance by DecorItem (it does not scale with the coral).
 *
 * The hole layout must match `fragRackSlots` in src/sim/aquascape/frags.ts (x = 0, ±0.032, ±0.064; z = ±0.018).
 */
import * as THREE from 'three';
import { GeoBuilder, lathe, tube, type V3, type Extra, NO_SWAY } from './builder';
import { hex, mix, mul, noise3, type RGB } from './noise';
import type { DecorBuild } from './rocks';
import type { DecorDef } from '@/types';

export const RACK_HOLE_X = [-0.064, -0.032, 0, 0.032, 0.064];
export const RACK_HOLE_Z = [-0.018, 0.018];
const CELL_W = 0.032;
const CELL_D = 0.036;
const HOLE_R = 0.0063;
const PLATE_T = 0.006;

const ACRYLIC: Extra = [0, 0.18, 0.9, 0.04];
// lane:w2-visual — x = 1 marks a polished edge for the acrylic material (the opaque decor material ignores x)
const ACRYLIC_EDGE: Extra = [1, 0.12, 1, 0.02];
/** Rim chamfer and plan-corner radius (m). */
const CHAMFER = 0.0011;
const CORNER_R = 0.003;
/** Post radius (m): slim round acrylic rods. */
const POST_R = 0.0032;
/** lane:w2-visual — clear acrylic with a light smoke tint (was a near-black slab); the polished edge is paler still. */
const SMOKE = '#83979f';
const EDGE = '#e6f0f1';

/** A flat quad with explicit vertices (own vertices = crisp edges) wound so its normal faces `n`. */
function quadN(b: GeoBuilder, p: [V3, V3, V3, V3], n: V3, col: RGB | ((q: V3) => RGB), extra: Extra): void {
  const [a, bb, c] = p;
  const cr: V3 = [(bb[1] - a[1]) * (c[2] - a[2]) - (bb[2] - a[2]) * (c[1] - a[1]), (bb[2] - a[2]) * (c[0] - a[0]) - (bb[0] - a[0]) * (c[2] - a[2]), (bb[0] - a[0]) * (c[1] - a[1]) - (bb[1] - a[1]) * (c[0] - a[0])];
  const flip = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0;
  const colOf = typeof col === 'function' ? col : () => col;
  const ids = p.map((q) => b.v(q, colOf(q), NO_SWAY, q, extra));
  if (flip) b.quad(ids[0], ids[3], ids[2], ids[1]);
  else b.quad(ids[0], ids[1], ids[2], ids[3]);
}

/** One plate cell (a square centred on a hole) at height y, facing up (+1) or down (-1). */
function holeCell(b: GeoBuilder, cx: number, cz: number, y: number, dir: 1 | -1, segs: number, col: (q: V3) => RGB): void {
  const hx = CELL_W / 2;
  const hz = CELL_D / 2;
  const angles = new Set<number>();
  for (let k = 0; k < segs; k++) angles.add((k / segs) * Math.PI * 2);
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) angles.add((Math.atan2(sz * hz, sx * hx) + Math.PI * 2) % (Math.PI * 2));
  const list = [...angles].sort((p, q) => p - q);
  const ring = (a: number): { c: V3; s: V3 } => {
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const t = Math.min(Math.abs(dx) > 1e-9 ? hx / Math.abs(dx) : Infinity, Math.abs(dz) > 1e-9 ? hz / Math.abs(dz) : Infinity);
    return { c: [cx + dx * HOLE_R, y, cz + dz * HOLE_R], s: [cx + dx * t, y, cz + dz * t] };
  };
  for (let i = 0; i < list.length; i++) {
    const a = ring(list[i]);
    const c = ring(list[(i + 1) % list.length]);
    quadN(b, [a.c, c.c, c.s, a.s], [0, dir, 0], col, ACRYLIC);
  }
}

export function genFragRack(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const b = out.solid;
  const n = noise3(seed);
  const smoke = hex(SMOKE);
  const edgeHi = mix(smoke, hex(EDGE), 0.55);
  const W = def.size.w;
  const D = def.size.d;
  const H = def.size.h;
  const top = H;
  const bot = H - PLATE_T;
  const segs = lod === 0 ? 20 : lod === 1 ? 10 : 6;
  // faint water spotting / film on the top face keeps it from reading as plastic
  const topCol = (q: V3): RGB => mul(mix(smoke, edgeHi, 0.08 + 0.06 * n(q[0] * 90, q[2] * 90, 1)), 1.05);
  const botCol = (): RGB => mul(smoke, 0.85);
  const gx0 = RACK_HOLE_X[0] - CELL_W / 2;
  const gx1 = RACK_HOLE_X[RACK_HOLE_X.length - 1] + CELL_W / 2;
  const gz0 = RACK_HOLE_Z[0] - CELL_D / 2;
  const gz1 = RACK_HOLE_Z[RACK_HOLE_Z.length - 1] + CELL_D / 2;
  // plate: hole cells top + bottom, hole walls
  for (const hxp of RACK_HOLE_X) {
    for (const hzp of RACK_HOLE_Z) {
      holeCell(b, hxp, hzp, top, 1, segs, topCol);
      holeCell(b, hxp, hzp, bot, -1, segs, botCol);
      for (let k = 0; k < segs; k++) {
        const a0 = (k / segs) * Math.PI * 2;
        const a1 = ((k + 1) / segs) * Math.PI * 2;
        const p0: V3 = [hxp + Math.cos(a0) * HOLE_R, bot, hzp + Math.sin(a0) * HOLE_R];
        const p1: V3 = [hxp + Math.cos(a1) * HOLE_R, bot, hzp + Math.sin(a1) * HOLE_R];
        const am = (a0 + a1) / 2;
        quadN(b, [p0, p1, [p1[0], top, p1[2]], [p0[0], top, p0[2]]], [-Math.cos(am), 0, -Math.sin(am)], edgeHi, ACRYLIC_EDGE);
      }
    }
  }
  // plate border (top and bottom) between the hole grid and the rim: a fan from each rim point to its nearest point on
  // the grid rectangle (corner arcs collapse onto the grid corner; the zero-area half of those quads is dropped)
  const perCorner = lod === 0 ? 3 : 1;
  const rimAt = (inset: number) => roundedRect(W / 2, D / 2, CORNER_R, inset, perCorner);
  const toGrid = (q: [number, number]): [number, number] => [Math.min(gx1, Math.max(gx0, q[0])), Math.min(gz1, Math.max(gz0, q[1]))];
  const rimIn = rimAt(CHAMFER);
  for (let i = 0; i < rimIn.length; i++) {
    const o0 = rimIn[i].p;
    const o1 = rimIn[(i + 1) % rimIn.length].p;
    const g0 = toGrid(o0);
    const g1 = toGrid(o1);
    quadN(b, [[o0[0], top, o0[1]], [o1[0], top, o1[1]], [g1[0], top, g1[1]], [g0[0], top, g0[1]]], [0, 1, 0], topCol, ACRYLIC);
    quadN(b, [[o0[0], bot, o0[1]], [o1[0], bot, o1[1]], [g1[0], bot, g1[1]], [g0[0], bot, g0[1]]], [0, -1, 0], botCol(), ACRYLIC);
  }
  // polished rim: top chamfer, straight edge, bottom chamfer, around rounded plan corners
  const rimOut = rimAt(0);
  const profile: [number, number][] = [
    [top, CHAMFER],
    [top - CHAMFER, 0],
    [bot + CHAMFER, 0],
    [bot, CHAMFER],
  ];
  for (let s = 0; s < profile.length - 1; s++) {
    const [ya, ia] = profile[s];
    const [yb, ib] = profile[s + 1];
    const up = s === 0 ? 1 : s === 2 ? -1 : 0; // chamfers lean up / down, the straight band faces out
    for (let i = 0; i < rimOut.length; i++) {
      const j = (i + 1) % rimOut.length;
      const pa0 = ia > 0 ? rimIn[i].p : rimOut[i].p;
      const pa1 = ia > 0 ? rimIn[j].p : rimOut[j].p;
      const pb0 = ib > 0 ? rimIn[i].p : rimOut[i].p;
      const pb1 = ib > 0 ? rimIn[j].p : rimOut[j].p;
      const nx = rimOut[i].n[0] + rimOut[j].n[0];
      const nz = rimOut[i].n[1] + rimOut[j].n[1];
      quadN(b, [[pa0[0], ya, pa0[1]], [pa1[0], ya, pa1[1]], [pb1[0], yb, pb1[1]], [pb0[0], yb, pb0[1]]], [nx, up * 1.4, nz], edgeHi, ACRYLIC_EDGE);
    }
  }
  // four slim round acrylic posts under the corners and a thin rod brace at the back: an airy stand, not a table
  const post = 0.0055;
  const px = W / 2 - 0.006 - post;
  const pz = D / 2 - 0.005 - post;
  const face = mul(smoke, 0.95);
  const radial = lod === 0 ? 10 : lod === 1 ? 6 : 4;
  const rod = (a: V3, c: V3, r: number) =>
    tube(b, [a, c], { radial, radius: () => r, color: () => face, extra: () => ACRYLIC_EDGE, capStart: true, capEnd: true });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = sx * (px + post / 2);
      const cz = sz * (pz + post / 2);
      rod([cx, -0.002, cz], [cx, bot, cz], POST_R);
    }
  }
  if (lod < 2) rod([-(px + post / 2), 0.01, -(pz + post / 2)], [px + post / 2, 0.01, -(pz + post / 2)], POST_R * 0.62);
}

/** Closed rounded-rectangle outline (half extents hx, hz; corner radius r) inset by `inset`, with outward normals. */
function roundedRect(hx: number, hz: number, r: number, inset: number, perCorner: number): { p: [number, number]; n: [number, number] }[] {
  const out: { p: [number, number]; n: [number, number] }[] = [];
  const corners: [number, number, number][] = [
    [hx - r, hz - r, 0],
    [-(hx - r), hz - r, Math.PI / 2],
    [-(hx - r), -(hz - r), Math.PI],
    [hx - r, -(hz - r), Math.PI * 1.5],
  ];
  const rr = Math.max(1e-5, r - inset);
  for (const [cx, cz, a0] of corners) {
    for (let k = 0; k <= perCorner; k++) {
      const a = a0 + (k / perCorner) * (Math.PI / 2);
      out.push({ p: [cx + Math.cos(a) * rr, cz + Math.sin(a) * rr], n: [Math.cos(a), Math.sin(a)] });
    }
  }
  return out;
}

// ───────────────────────────── frag plug ─────────────────────────────

/** Plug cap height above its base (the coral sits on the cap). */
export const PLUG_CAP_H = 0.0055;
const PLUG_R = 0.0105;
const STEM_R = 0.0048;
const STEM_L = 0.011;

const plugCache = new Map<number, THREE.BufferGeometry>();

/** Shared ceramic frag-plug geometry (base at y = 0, stem below). Cached per LOD; never disposed (tiny). */
export function fragPlugGeometry(lod = 0): THREE.BufferGeometry {
  const hit = plugCache.get(lod);
  if (hit) return hit;
  const b = new GeoBuilder();
  const n = noise3(7331);
  const ceramic = hex('#d6cab4');
  const shade = hex('#a89a82');
  const col = (t: number, a: number, p: V3): RGB => {
    // matte ceramic with a faint speckle, a touch darker on the stem and underside
    const speck = 0.5 + 0.5 * n(p[0] * 900, p[1] * 900, p[2] * 900);
    return mix(t < 0.3 ? shade : ceramic, shade, 0.12 * speck);
  };
  const H = PLUG_CAP_H;
  lathe(
    b,
    [
      [0, -STEM_L],
      [STEM_R * 0.9, -STEM_L],
      [STEM_R, -STEM_L + 0.001],
      [STEM_R, -0.0004],
      [PLUG_R * 0.9, 0],
      [PLUG_R, H * 0.2],
      [PLUG_R, H * 0.68],
      [PLUG_R * 0.93, H * 0.93],
      [PLUG_R * 0.7, H],
      [PLUG_R * 0.3, H * 1.02],
      [0, H * 1.03],
    ],
    lod === 0 ? 24 : 10,
    col,
    [0, 0.8, 0.15, 0.6],
  );
  const g = b.toGeometry();
  plugCache.set(lod, g);
  return g;
}
