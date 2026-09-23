/**
 * Procedural stones: seiryu, dragon stone, river stones, lava, slate, live rock, caves and the live-rock arch.
 * OWNER: lane "aquascape". All generators build in decor-local metres (base at y=0) and stay inside def.size.
 */
import { GeoBuilder, blob, tube, smoothPath, fitInto, type V3, type Extra, NO_SWAY } from './builder';
import { prng, noise3, fbm3, ridged3, hex, mix, mul, clamp, smooth, type RGB, type PRng, type Noise3 } from './noise';

export type RockStyle = 'seiryu' | 'dragon' | 'river' | 'lava' | 'slate' | 'live' | 'cave' | 'rubble';

interface RockOpts {
  center: V3;
  size: { w: number; d: number; h: number };
  bury?: number;
  detail: number;
  /** freshwater rocks get a faint algae film on top; marine rocks get coralline. */
  marine?: boolean;
  flatTop?: number; // 0..1 flatten the top (ledges)
}

const PAL = {
  seiryu: { base: hex('#6c747a'), light: hex('#a2a9ad'), dark: hex('#343a3e'), vein: hex('#e2e1d8') },
  dragon: { base: hex('#8a6848'), light: hex('#c29c74'), dark: hex('#3a281a'), vein: hex('#a47e58') },
  river: { base: hex('#8a8478'), light: hex('#bdb5a6'), dark: hex('#56514a'), vein: hex('#d6d0c4') },
  lava: { base: hex('#3a2a26'), light: hex('#6e4234'), dark: hex('#140f0e'), vein: hex('#8a4a36') },
  slate: { base: hex('#3f4649'), light: hex('#5f696d'), dark: hex('#23282a'), vein: hex('#6d7a74') },
  live: { base: hex('#b8a27e'), light: hex('#dccab0'), dark: hex('#5a4a38'), vein: hex('#b86090') },
  cave: { base: hex('#77726a'), light: hex('#a69f93'), dark: hex('#45413b'), vein: hex('#c9c2b4') },
  rubble: { base: hex('#d4c6ac'), light: hex('#eee4cf'), dark: hex('#8a7a62'), vein: hex('#c07396') },
};
const MOSS = hex('#3f5a26');
const ALGAE_FILM = hex('#5f6e3a');
const CORALLINE = [hex('#a8587e'), hex('#8a6496'), hex('#b8768c'), hex('#9a6a8a')];
const GREEN_FILM = hex('#7b8a4e');

interface Pit {
  c: V3;
  rad: number;
  depth: number;
}

function randDir(r: PRng, yBias = 0): V3 {
  const u = r() * 2 - 1;
  const th = r() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  const v: V3 = [s * Math.cos(th), u + yBias, s * Math.sin(th)];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** One stone, fitted exactly into `size` around `center` (base at center.y - bury). */
export function rock(b: GeoBuilder, style: RockStyle, seed: number, o: RockOpts): void {
  const r = prng(seed);
  const n = noise3(seed);
  const n2 = noise3(seed + 77);
  const pal = PAL[style];
  const from = b.count;
  const pits: Pit[] = [];
  const pitCount = style === 'dragon' ? r.int(22, 38) : style === 'lava' ? r.int(45, 70) : style === 'live' ? r.int(50, 75) : style === 'rubble' ? r.int(4, 8) : 0;
  for (let i = 0; i < pitCount; i++) {
    const big = style === 'live' && i < 8;
    pits.push({
      c: randDir(r, 0.15),
      rad: style === 'lava' ? r.range(0.05, 0.12) : style === 'live' ? (big ? r.range(0.12, 0.22) : r.range(0.04, 0.1)) : r.range(0.08, 0.24),
      depth: style === 'lava' ? r.range(0.04, 0.1) : style === 'live' ? (big ? r.range(0.12, 0.24) : r.range(0.05, 0.12)) : r.range(0.1, 0.3),
    });
  }
  const planes: { n: V3; d: number }[] = [];
  const planeCount = style === 'seiryu' ? r.int(3, 5) : style === 'dragon' ? r.int(3, 5) : style === 'cave' ? r.int(4, 6) : style === 'rubble' ? r.int(3, 6) : style === 'live' ? r.int(1, 3) : 0;
  for (let i = 0; i < planeCount; i++) {
    const nn = randDir(r, 0.35);
    planes.push({ n: nn, d: r.range(style === 'seiryu' ? 0.55 : 0.62, 0.9) });
  }
  const stretch: V3 = style === 'seiryu' ? [1, 1.25, 1] : style === 'river' ? [1.15, 0.55, 1] : [1, 0.9, 1];
  const off: V3 = [r() * 50, r() * 50, r() * 50];
  // depth record for colouring (concavity)
  const depthMap: number[] = [];
  blob(
    b,
    o.detail,
    (q) => {
      const qx = q[0] + off[0];
      const qy = q[1] + off[1];
      const qz = q[2] + off[2];
      let rr = 1 + 0.16 * fbm3(n, qx * 1.2, qy * 1.2, qz * 1.2, 3);
      let dent = 0;
      switch (style) {
        case 'seiryu':
          rr += 0.16 * (ridged3(n2, qx * 2.2, qy * 1.4, qz * 2.2, 4) - 0.35);
          rr -= 0.035 * Math.pow(Math.abs(Math.sin(q[0] * 9 + q[2] * 5 + 3 * n(qx * 0.8, qy * 0.4, qz))), 6);
          break;
        case 'dragon':
          rr += 0.08 * fbm3(n2, qx * 3, qy * 3, qz * 3, 3);
          break;
        case 'river':
          rr = 1 + 0.045 * fbm3(n, qx * 1.1, qy * 1.1, qz * 1.1, 2);
          break;
        case 'lava':
          rr += 0.18 * fbm3(n2, qx * 2.4, qy * 2.4, qz * 2.4, 4) + 0.035 * n(qx * 14, qy * 14, qz * 14);
          break;
        case 'live':
          rr += 0.22 * fbm3(n2, qx * 1.5, qy * 1.5, qz * 1.5, 3) + 0.05 * Math.max(0, n(qx * 4, qy * 4, qz * 4)) + 0.015 * n(qx * 11, qy * 11, qz * 11);
          break;
        case 'cave':
          rr += 0.07 * fbm3(n2, qx * 2.5, qy * 2.5, qz * 2.5, 3);
          break;
        case 'rubble':
          rr += 0.14 * fbm3(n2, qx * 2.5, qy * 2.5, qz * 2.5, 3);
          break;
        case 'slate':
          rr += 0.04 * fbm3(n2, qx * 3, qy * 3, qz * 3, 2);
          break;
      }
      for (const p of pits) {
        const d = Math.acos(clamp(q[0] * p.c[0] + q[1] * p.c[1] + q[2] * p.c[2], -1, 1));
        if (d < p.rad) {
          const k = 1 - (d / p.rad) ** 2;
          dent = Math.max(dent, p.depth * k * k);
        }
      }
      rr -= dent;
      // seiryu tapers to a craggy peak (off-centre) instead of a block
      const taper = style === 'seiryu' ? 1 - 0.38 * Math.max(0, q[1]) : 1;
      const lean = style === 'seiryu' ? 0.18 * Math.max(0, q[1]) : 0;
      let p: V3 = [q[0] * rr * stretch[0] * taper + lean, q[1] * rr * stretch[1], q[2] * rr * stretch[2] * taper];
      for (const pl of planes) {
        const e = p[0] * pl.n[0] + p[1] * pl.n[1] + p[2] * pl.n[2] - pl.d;
        if (e > 0) p = [p[0] - pl.n[0] * e * 0.96, p[1] - pl.n[1] * e * 0.96, p[2] - pl.n[2] * e * 0.96];
      }
      if (o.flatTop && p[1] > 1 - o.flatTop) p[1] = 1 - o.flatTop + (p[1] - (1 - o.flatTop)) * 0.15;
      if (p[1] < -0.35) p[1] = -0.35 + (p[1] + 0.35) * 0.1;
      depthMap.push(rr - 1);
      return p;
    },
    () => [0, 0, 0],
  );
  // fit exactly into the target box
  const bury = o.bury ?? 0;
  const bb = b.bbox(from);
  const sx = o.size.w / Math.max(1e-6, bb.max[0] - bb.min[0]);
  const sy = (o.size.h + bury) / Math.max(1e-6, bb.max[1] - bb.min[1]);
  const sz = o.size.d / Math.max(1e-6, bb.max[2] - bb.min[2]);
  const cx = (bb.min[0] + bb.max[0]) / 2;
  const cz = (bb.min[2] + bb.max[2]) / 2;
  // colour pass (in unit space before the fit, using position + fbm masks)
  const extra: Extra = style === 'river' ? [0, 0.32, 0.55, 0.35] : style === 'lava' ? [0, 0.8, 0.2, 1.7] : style === 'live' || style === 'rubble' ? [0, 0.62, 0.3, 1.3] : style === 'dragon' ? [0, 0.62, 0.3, 1.25] : style === 'slate' ? [0, 0.4, 0.45, 0.6] : [0, 0.5, 0.35, 1];
  for (let i = from; i < b.count; i++) {
    const x = b.pos[i * 3];
    const y = b.pos[i * 3 + 1];
    const z = b.pos[i * 3 + 2];
    const up = (y - bb.min[1]) / Math.max(1e-6, bb.max[1] - bb.min[1]);
    const dep = depthMap[i - from] ?? 0;
    const f = fbm3(n2, x * 3 + 9, y * 3, z * 3, 3);
    let c: RGB = mix(pal.base, pal.light, clamp(0.45 + f * 0.9 + dep * 1.2));
    c = mix(c, pal.dark, clamp(-dep * 3.2 - 0.05) * 0.85);
    if (style === 'seiryu') {
      const vein = smooth(0.955, 0.99, 1 - Math.abs(n(x * 2.2 + 3, y * 0.9, z * 2.2)));
      c = mix(c, pal.vein, vein * 0.85);
      c = mix(c, pal.dark, smooth(0.6, 0.95, Math.abs(Math.sin(y * 14 + f * 4))) * 0.25);
    }
    if (style === 'dragon') c = mix(c, hex('#6f5236'), smooth(0.1, 0.5, n(x * 6, y * 6, z * 6)) * 0.35);
    if (style === 'river') c = mix(c, pal.vein, smooth(0.35, 0.8, n(x * 9, y * 9, z * 9)) * 0.12 + smooth(0.95, 1, Math.abs(n(x * 1.3 + 5, y * 1.3, z * 1.3))) * 0.3);
    if (style === 'lava') c = mix(c, pal.light, smooth(0.2, 0.7, n2(x * 4, y * 4, z * 4)) * 0.5);
    if (style === 'slate') c = mix(c, pal.vein, smooth(0.4, 0.9, Math.sin(y * 40 + f * 3) * 0.5 + 0.5) * 0.15);
    if (o.marine || style === 'live' || style === 'rubble') {
      // encrusting coralline: soft zones with a crisper crust edge, mostly on light-facing surfaces
      const zone = smooth(-0.1, 0.45, n(x * 1.8 + 11, y * 1.8, z * 1.8)) * smooth(0.15, 0.55, up);
      const crust = smooth(0.1, 0.35, n(x * 7 + 3, y * 7, z * 7) + zone * 0.5);
      const pick = mix(CORALLINE[Math.abs(Math.floor(n(x * 0.6, y * 0.6, z * 0.6) * 10)) % CORALLINE.length], CORALLINE[1], 0.3);
      c = mix(c, pick, zone * crust * 0.62);
      c = mix(c, GREEN_FILM, smooth(0.5, 0.85, n2(x * 5 + 2, y * 5, z * 5)) * 0.2 * up);
      c = mix(c, pal.dark, clamp(-dep * 5) * 0.5);
    } else if (style !== 'lava') {
      const film = smooth(0.25, 0.75, n(x * 3.1 + 7, y * 3.1, z * 3.1)) * smooth(0.55, 0.95, up);
      c = mix(c, style === 'river' || style === 'cave' ? ALGAE_FILM : MOSS, film * 0.28);
    }
    // a touch of ambient occlusion at the base
    c = mul(c, 0.72 + 0.28 * smooth(0, 0.3, up));
    b.col[i * 3] = c[0];
    b.col[i * 3 + 1] = c[1];
    b.col[i * 3 + 2] = c[2];
    b.ext[i * 4] = extra[0];
    b.ext[i * 4 + 1] = extra[1] + (dep < -0.05 ? 0.15 : 0);
    b.ext[i * 4 + 2] = extra[2];
    b.ext[i * 4 + 3] = extra[3];
  }
  b.mapPositions(([x, y, z]) => [(x - cx) * sx + o.center[0], (y - bb.min[1]) * sy - bury + o.center[1], (z - cz) * sz + o.center[2]], from);
}

export interface DecorBuild {
  solid: GeoBuilder;
  solidDouble: GeoBuilder;
  foliage: GeoBuilder;
  coral: GeoBuilder;
}

const det = (lod: number, hi: number) => (lod === 0 ? hi : lod === 1 ? Math.max(3, Math.round(hi * 0.4)) : 2);

export function genRock(out: DecorBuild, visual: string, seed: number, size: { w: number; d: number; h: number }, lod: number): void {
  const b = out.solid;
  const bury = Math.min(0.012, size.h * 0.12);
  switch (visual) {
    case 'rock_seiryu':
      rock(b, 'seiryu', seed, { center: [0, 0, 0], size, bury, detail: det(lod, 20) });
      break;
    case 'rock_dragon':
      rock(b, 'dragon', seed, { center: [0, 0, 0], size, bury, detail: det(lod, 20) });
      break;
    case 'rock_river':
      rock(b, 'river', seed, { center: [0, 0, 0], size, bury: bury * 0.6, detail: det(lod, 12) });
      break;
    case 'rock_lava':
      rock(b, 'lava', seed, { center: [0, 0, 0], size, bury, detail: det(lod, 18) });
      break;
    case 'rock_live':
      rock(b, 'live', seed, { center: [0, 0, 0], size, bury, detail: det(lod, 20), marine: true });
      break;
    case 'rock_slate':
      genSlate(out, seed, size, lod);
      break;
    case 'rock_rubble':
      genRubble(out, seed, size, lod);
      break;
    case 'rock_live_arch':
      genArch(out, seed, size, lod);
      break;
    case 'cave_stone':
      genStoneCave(out, seed, size, lod);
      break;
    case 'cave_smooth':
      genSmoothHide(out, seed, size, lod);
      break;
    case 'cave_terracotta':
      genTerracotta(out, seed, size, lod);
      break;
  }
}

function genSlate(out: DecorBuild, seed: number, size: { w: number; d: number; h: number }, lod: number): void {
  const r = prng(seed);
  const b = out.solid;
  const { w, d, h } = size;
  const t = h * 0.2; // slab thickness
  // two low supports leaving a crevice at the front centre, then stacked slabs stepping back
  rock(b, 'slate', seed + 1, { center: [-w * 0.26, 0, 0], size: { w: w * 0.36, d: d * 0.85, h: t * 1.05 }, bury: 0.004, detail: det(lod, 8), flatTop: 0.3 });
  rock(b, 'slate', seed + 2, { center: [w * 0.3, 0, -d * 0.05], size: { w: w * 0.34, d: d * 0.8, h: t * 1.1 }, bury: 0.004, detail: det(lod, 8), flatTop: 0.3 });
  const layers = 3;
  let y = t * 0.95;
  for (let i = 0; i < layers; i++) {
    const lw = w * (0.98 - i * 0.2) * r.range(0.9, 1);
    const ld = d * (0.95 - i * 0.12);
    const ox = (i === 0 ? 0 : -w * 0.08 * i) + r.range(-0.01, 0.01);
    const oz = -d * 0.06 * i;
    const th = i === layers - 1 ? h - y : t * r.range(0.85, 1.05);
    rock(b, 'slate', seed + 10 + i, { center: [ox, y, oz], size: { w: lw, d: ld, h: Math.max(0.006, th) }, bury: 0, detail: det(lod, 8), flatTop: 0.35 });
    y += th * 0.96;
    if (y >= h - 0.004) break;
  }
}

function genRubble(out: DecorBuild, seed: number, size: { w: number; d: number; h: number }, lod: number): void {
  const r = prng(seed);
  const n = lod === 2 ? 4 : r.int(8, 13);
  for (let i = 0; i < n; i++) {
    const s = r.range(0.25, 0.5);
    const pw = size.w * s * 0.6;
    const pd = size.d * s * 0.65;
    const ph = Math.min(size.h * r.range(0.5, 1), pw * 0.55);
    const cx = r.range(-size.w / 2 + pw / 2, size.w / 2 - pw / 2);
    const cz = r.range(-size.d / 2 + pd / 2, size.d / 2 - pd / 2);
    rock(out.solid, i % 3 === 0 ? 'rubble' : 'live', seed + i * 31, { center: [cx, 0, cz], size: { w: pw, d: pd, h: ph }, bury: ph * 0.25, detail: det(lod, 5), marine: true });
  }
}

function genStoneCave(out: DecorBuild, seed: number, size: { w: number; d: number; h: number }, lod: number): void {
  const { w, d, h } = size;
  const b = out.solid;
  // two supports and a capstone: the den opens front and back
  rock(b, 'cave', seed + 1, { center: [-w * 0.3, 0, 0], size: { w: w * 0.36, d: d * 0.92, h: h * 0.62 }, bury: 0.005, detail: det(lod, 12) });
  rock(b, 'cave', seed + 2, { center: [w * 0.31, 0, 0.004], size: { w: w * 0.34, d: d * 0.86, h: h * 0.6 }, bury: 0.005, detail: det(lod, 12) });
  rock(b, 'cave', seed + 3, { center: [0.004, h * 0.52, -0.003], size: { w: w * 0.98, d: d * 0.98, h: h * 0.48 }, bury: 0, detail: det(lod, 14), flatTop: 0.2 });
}

function genArch(out: DecorBuild, seed: number, size: { w: number; d: number; h: number }, lod: number): void {
  const r = prng(seed);
  const { w, d, h } = size;
  const b = out.solid;
  const from = b.count;
  // legs: chunky live rock at each foot (the left foot's front face is the spawning wall)
  rock(b, 'live', seed + 1, { center: [-w * 0.35, 0, 0.004], size: { w: w * 0.3, d: d * 0.95, h: h * 0.55 }, bury: 0.01, detail: det(lod, 18), marine: true });
  rock(b, 'live', seed + 2, { center: [w * 0.35, 0, -0.004], size: { w: w * 0.28, d: d * 0.86, h: h * 0.66 }, bury: 0.01, detail: det(lod, 18), marine: true });
  // the bridge: live-rock pieces stacked along the arc, as real arches are glued together
  const pieces = lod === 2 ? 3 : 5;
  for (let i = 0; i < pieces; i++) {
    const t = (i + 0.5) / pieces;
    const a = Math.PI * (0.84 - t * 0.68);
    const cx = Math.cos(a) * w * 0.34;
    const cy = h * 0.14 + Math.sin(a) * h * 0.62;
    const pw = w * r.range(0.2, 0.25);
    const ph = h * r.range(0.3, 0.36);
    rock(b, 'live', seed + 10 + i, { center: [cx, cy - ph * 0.5, r.range(-0.006, 0.006)], size: { w: pw, d: d * r.range(0.62, 0.8), h: ph }, bury: 0, detail: det(lod, 14), marine: true });
  }
  // shrink the assembled arch to its footprint (per axis, about the base) instead of slicing its sides flat
  fitInto(b, size, from, -Infinity);
  void w;
  void d;
  void h;
}

function genSmoothHide(out: DecorBuild, seed: number, size: { w: number; d: number; h: number }, lod: number): void {
  // a water-worn stone tunnel: an arch profile lofted along x, rounded ends
  const n = noise3(seed);
  const b = out.solid;
  const { w, d, h } = size;
  const pal = PAL.river;
  const segX = lod === 0 ? 28 : lod === 1 ? 12 : 6;
  const segA = lod === 0 ? 26 : lod === 1 ? 12 : 6;
  const ow = d / 2;
  const iw = ow * 0.58;
  const ih = h * 0.58;
  const rows: number[][] = [];
  const profile = (a: number, inner: boolean): [number, number] => (inner ? [Math.cos(a) * iw, Math.sin(a) * ih - 0.004] : [-Math.cos(a) * ow, Math.sin(a) * h - 0.004]);
  for (let i = 0; i <= segX; i++) {
    const tx = i / segX;
    const x = (tx - 0.5) * w * 0.92;
    const endRound = Math.sin(Math.PI * Math.min(1, tx * 1.0)) ** 0.25;
    const row: number[] = [];
    // outer (a from 0..π), then inner (π..0)
    for (let k = 0; k <= segA * 2 + 1; k++) {
      const inner = k > segA;
      const a = inner ? ((k - segA - 1) / segA) * Math.PI : (k / segA) * Math.PI;
      let [pz, py] = profile(a, inner);
      const bulge = inner ? 1 : 0.86 + 0.14 * endRound;
      const nn = n(x * 22, py * 22, pz * 22) * 0.004 + n(x * 60, py * 60, pz * 60) * 0.0012;
      pz = pz * bulge + Math.sign(pz) * nn;
      py = py * (inner ? 1 : 0.8 + 0.2 * endRound) + (inner ? 0 : nn);
      const f = n(x * 30 + 4, py * 30, pz * 30);
      let c = mix(pal.base, pal.light, clamp(0.45 + f * 0.7));
      if (inner) c = mul(c, 0.55);
      c = mix(c, ALGAE_FILM, smooth(0.3, 0.8, n(x * 10, py * 10, 3)) * smooth(0.6, 1, py / h) * 0.3);
      row.push(b.v([x, py, pz], c, NO_SWAY, [0, 0, 0], [0, 0.3, 0.55, 0.3]));
    }
    rows.push(row);
  }
  const m = segA * 2 + 2;
  for (let i = 0; i < segX; i++) for (let k = 0; k < m - 1; k++) {
    if (k === segA) continue; // gap between outer & inner (bottom, hidden in substrate)
    b.quad(rows[i][k], rows[i][k + 1], rows[i + 1][k + 1], rows[i + 1][k]);
  }
  // end faces: bridge outer ring to inner ring
  for (const i of [0, segX]) {
    for (let k = 0; k < segA; k++) {
      const o0 = rows[i][k];
      const o1 = rows[i][k + 1];
      const i0 = rows[i][m - 1 - k];
      const i1 = rows[i][m - 2 - k];
      if (i === 0) b.quad(o0, i0, i1, o1);
      else b.quad(o0, o1, i1, i0);
    }
  }
}

function genTerracotta(out: DecorBuild, seed: number, size: { w: number; d: number; h: number }, lod: number): void {
  const n = noise3(seed);
  const b = out.solidDouble;
  const { w, h } = size;
  const R = h / 2;
  const clay = hex('#b8633c');
  const clayDark = hex('#7a3a20');
  const segs = lod === 0 ? 24 : lod === 1 ? 12 : 6;
  const len = lod === 0 ? 14 : 6;
  // outer + inner shells of a clay tube, closed (domed) at +x, open at -x
  const firstRows: number[][] = [];
  for (const inner of [false, true]) {
    const rows: number[][] = [];
    const rr = inner ? R * 0.8 : R;
    for (let i = 0; i <= len; i++) {
      const t = i / len;
      const x = -w / 2 + t * w * 0.86;
      const row: number[] = [];
      for (let k = 0; k <= segs; k++) {
        const a = (k / segs) * Math.PI * 2;
        const y = R + Math.sin(a) * rr;
        const z = Math.cos(a) * rr;
        const f = n(x * 40, y * 40, z * 40);
        let c = mix(clay, hex('#d08058'), clamp(0.5 + f * 0.5));
        if (inner) c = mix(clayDark, clay, 0.3 + 0.5 * t);
        c = mul(c, 0.8 + 0.2 * smooth(0, R, y));
        row.push(b.v([x, Math.max(0.001, y), z], c, NO_SWAY, [0, 0, 0], [0, 0.8, 0.1, 0.35]));
      }
      rows.push(row);
    }
    firstRows.push(rows[0]);
    for (let i = 0; i < len; i++) for (let k = 0; k < segs; k++) {
      if (inner) b.quad(rows[i][k], rows[i][k + 1], rows[i + 1][k + 1], rows[i + 1][k]);
      else b.quad(rows[i][k], rows[i + 1][k], rows[i + 1][k + 1], rows[i][k + 1]);
    }
    // dome cap at the closed end
    const last = rows[len];
    const tip = b.v([w / 2 - (inner ? w * 0.08 : 0), R, 0], inner ? clayDark : clay, NO_SWAY, [0, 0, 0], [0, 0.8, 0.1, 0.35]);
    for (let k = 0; k < segs; k++) b.tri(last[k], tip, last[k + 1]);
  }
  // thick rim at the open mouth
  const [o, i2] = firstRows;
  for (let k = 0; k < segs; k++) b.quad(o[k], o[k + 1], i2[k + 1], i2[k]);
}

export const _rockInternals = { PAL };
export type { Noise3 };
