/**
 * Tasteful ornaments & enrichment: weathered ceramic ruins, a target-feeding dish and a pile of spare shells.
 * OWNER: lane "aquascape".
 */
import { GeoBuilder, tube, lathe, containPart, type V3, NO_SWAY } from './builder';
import { prng, noise3, fbm3, hex, mix, mul, clamp, smooth, type RGB } from './noise';
import type { DecorBuild } from './rocks';
import type { DecorDef } from '@/types';

/** Fluted column drum (lathe with flutes), optionally broken at the top. */
function column(b: GeoBuilder, seed: number, R: number, H: number, pos: V3, rot: { x?: number; z?: number }, broken: boolean, lod: number): void {
  const n = noise3(seed);
  const from = b.count;
  const stone = hex('#b9a78a');
  const dark = hex('#7a6a52');
  const moss = hex('#5a6a38');
  const rows = lod === 0 ? 22 : 8;
  const segs = lod === 0 ? 48 : 16;
  const flutes = 16;
  const grid: number[][] = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const row: number[] = [];
    for (let k = 0; k <= segs; k++) {
      const a = (k / segs) * Math.PI * 2;
      let y = t * H;
      if (broken && i === rows) y = H * (0.8 + 0.2 * (0.5 + 0.5 * Math.sin(a * 2 + seed) + 0.3 * n(Math.cos(a) * 3, Math.sin(a) * 3, 1)));
      const flute = lod === 0 ? 1 - 0.07 * Math.pow(Math.abs(Math.sin(a * flutes * 0.5)), 0.6) : 1;
      const chip = 1 - Math.max(0, n(Math.cos(a) * 4, y * 50, 2) - 0.5) * 0.25;
      const rr = R * flute * chip * (t < 0.05 ? 1.08 : 1);
      const p: V3 = [Math.cos(a) * rr, y, -Math.sin(a) * rr];
      const f = fbm3(n, p[0] * 60, p[1] * 60, p[2] * 60, 3);
      let c = mix(stone, dark, clamp(0.35 - f * 0.8));
      c = mix(c, dark, (1 - flute) * 3);
      c = mix(c, moss, smooth(0.2, 0.7, n(p[0] * 20, p[1] * 20 + 7, p[2] * 20)) * smooth(0.3, 1, t) * 0.55);
      row.push(b.v(p, c, NO_SWAY, [0, 0, 0], [0, 0.7, 0.3, 1.2]));
    }
    grid.push(row);
  }
  for (let i = 0; i < rows; i++) for (let k = 0; k < segs; k++) b.quad(grid[i][k], grid[i][k + 1], grid[i + 1][k + 1], grid[i + 1][k]);
  // top cap (rough break surface)
  const top = grid[rows];
  const cy = broken ? H * 0.88 : H;
  const c = b.v([0, cy, 0], mul(stone, 0.85), NO_SWAY, [0, 0, 0], [0, 0.85, 0.2, 1.8]);
  for (let k = 0; k < segs; k++) b.tri(c, top[k], top[k + 1]);
  // transform: rotate (lying drums) then place
  const cx = Math.cos(rot.z ?? 0);
  const sx = Math.sin(rot.z ?? 0);
  const ca = Math.cos(rot.x ?? 0);
  const sa = Math.sin(rot.x ?? 0);
  b.mapPositions(([x, y, z]) => {
    const x1 = x * cx - y * sx;
    const y1 = x * sx + y * cx;
    const y2 = y1 * ca - z * sa;
    const z2 = y1 * sa + z * ca;
    return [x1 + pos[0], y2 + pos[1], z2 + pos[2]];
  }, from);
}

function ruins(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const b = out.solid;
  const { w, d, h } = def.size;
  // standing broken column (rest spot on top) + plinth
  const stand = def.anchors.find((a) => a.kind === 'rest')?.offset ?? [-0.05, 0.1, 0];
  const plinth = hex('#a8987a');
  const pb = b.count;
  lathe(b, [[0.034, -0.004], [0.034, 0.012], [0.03, 0.014], [0.0, 0.014]], 4, (t) => mix(plinth, mul(plinth, 0.8), t), [0, 0.75, 0.3, 1.4]);
  b.mapPositions(([x, y, z]) => [x * 1 + stand[0], y, z + stand[2]], pb);
  column(b, seed + 1, 0.022, stand[1] - 0.012, [stand[0], 0.012, stand[2]], {}, true, lod);
  // fallen drum lying across the front (slid back inside the footprint if its tilt pokes it out)
  const drum = b.count;
  column(b, seed + 2, 0.02, 0.07, [w * 0.12, 0.018, d * 0.3], { z: Math.PI / 2, x: r.range(-0.3, 0.3) }, false, lod);
  containPart(b, def.size, drum);
  // broken arch: a hide at the right
  const hide = def.anchors.find((a) => a.kind === 'hide')?.offset ?? [0.045, 0.02, 0];
  const arch: V3[] = [];
  const steps = lod === 0 ? 14 : 6;
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI * (i / steps) * 0.82;
    arch.push([hide[0] + Math.cos(a) * 0.032 + 0.005, Math.sin(a) * 0.05, hide[2] - 0.012]);
  }
  const n = noise3(seed + 3);
  const stone: RGB = hex('#b5a386');
  const archFrom = b.count;
  tube(b, arch, {
    radial: lod === 0 ? 4 : 4,
    radius: () => 0.011,
    displace: (t, th, p) => 0.0015 * n(p[0] * 80, p[1] * 80, th),
    color: (t, th, p) => mix(stone, hex('#7c6c54'), clamp(0.3 + n(p[0] * 60, p[1] * 60, p[2] * 60) * 0.6)),
    extra: () => [0, 0.75, 0.3, 1.3],
    capStart: true,
    capEnd: true,
    twist: Math.PI / 4,
  });
  containPart(b, def.size, archFrom);
  void h;
}

function feedingDish(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const b = out.solidDouble;
  const glaze = hex('#e8e6e0');
  const inner = hex('#cfd8d8');
  const R = def.size.w / 2 - 0.001;
  const H = def.size.h;
  lathe(
    b,
    [
      [0, 0.002],
      [R * 0.7, 0.002],
      [R * 0.92, H * 0.45],
      [R, H * 0.95],
      [R * 0.97, H],
      [R * 0.88, H * 0.75],
      [R * 0.66, H * 0.3],
      [0, H * 0.28],
    ],
    lod === 0 ? 40 : 14,
    (t) => (t > 0.6 ? inner : glaze),
    [0, 0.12, 0.8, 0.05],
  );
  void seed;
}

/** Spiral gastropod shell lofted along a logarithmic helix. */
function spiralShell(b: GeoBuilder, seed: number, pos: V3, size: number, yaw: number, tilt: number, lod: number, kind: 'turban' | 'whelk'): void {
  const r = prng(seed);
  const n = noise3(seed);
  const from = b.count;
  const cream = hex(r.pick(['#efe2cc', '#e6d4b4', '#d9c3a0']));
  const band = hex(r.pick(['#b07a4a', '#8a5a3a', '#a0603e']));
  const pink = hex('#e8a890');
  const turns = kind === 'turban' ? 3.2 : 4.2;
  const steps = lod === 0 ? 70 : 24;
  const path: V3[] = [];
  const radii: number[] = [];
  const k = kind === 'turban' ? 0.36 : 0.3;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const th = t * turns * Math.PI * 2;
    const g = Math.exp(k * (th - turns * Math.PI * 2)); // grows toward the aperture
    const R = g * size * (kind === 'turban' ? 0.42 : 0.3);
    const y = (1 - g) * size * (kind === 'turban' ? 0.55 : 1.1);
    path.push([Math.cos(th) * R, y, Math.sin(th) * R]);
    radii.push(g * size * (kind === 'turban' ? 0.34 : 0.26) + 0.0003);
  }
  tube(b, path, {
    radial: lod === 0 ? 10 : 6,
    radius: (t, i) => radii[i],
    color: (t, th, p) => {
      let c = mix(cream, band, smooth(0.55, 0.8, Math.sin(t * 60 + n(p[0] * 200, p[1] * 200, 1) * 2) * 0.5 + 0.5) * 0.7);
      if (t > 0.97) c = pink;
      return c;
    },
    displace: (t, th) => radii[Math.round(t * steps)] * 0.06 * Math.sin(th * 3 + t * 90),
    extra: () => [0, 0.35, 0.5, 0.4],
    capStart: true,
  });
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  b.mapPositions(([x, y, z]) => {
    const y1 = y * ct - x * st;
    const x1 = y * st + x * ct;
    return [x1 * cy + z * sy + pos[0], y1 + pos[1], -x1 * sy + z * cy + pos[2]];
  }, from);
}

function shellPile(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const { w, d, h } = def.size;
  const b = out.solidDouble;
  const count = lod === 2 ? 3 : r.int(5, 7);
  for (let i = 0; i < count; i++) {
    const kind = r.chance(0.55) ? 'turban' : 'whelk';
    const s = r.range(0.018, 0.028);
    const from = b.count;
    spiralShell(b, seed + i * 13, [r.range(-w * 0.32, w * 0.32), s * 0.25, r.range(-d * 0.3, d * 0.3)], s, r.range(0, 6.28), r.range(0.9, 1.7), lod, kind);
    // each shell stays whole: slide it back inside the footprint rather than slicing it on the box walls
    containPart(b, { w, d, h }, from, -0.003);
  }
}

export function genOrnament(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  switch (def.visual) {
    case 'ornament_ruins':
      return ruins(out, def, seed, lod);
    case 'ornament_feeding_dish':
      return feedingDish(out, def, seed, lod);
    case 'ornament_shell_pile':
      return shellPile(out, def, seed, lod);
  }
}
