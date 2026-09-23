/**
 * Procedural reef life: corals (zoanthids, mushrooms, GSP, leather, hammer, torch, frogspawn, acropora),
 * the bubble-tip anemone, macroalgae (chaetomorpha, gracilaria), gorgonians and a resin hitching post.
 * OWNER: lane "aquascape". Fluorescent tissue writes aExtra.x (glow) — lit up by actinic light in the shader.
 */
import { GeoBuilder, leaf, tube, smoothPath, blob, lathe, weightFromHeight, add, sub, scl, norm, len, dirYP, envelope, fitPath, type V3, type Sway, type Extra, NO_SWAY } from './builder';
import { prng, noise3, fbm3, hex, mix, mul, clamp, smooth, jitter, type RGB, type PRng, type Noise3 } from './noise';
import { rock, type DecorBuild } from './rocks';
import type { DecorDef } from '@/types';

const q = (lod: number) => (lod === 0 ? 1 : lod === 1 ? 0.45 : 0.18);
const sw = (w: number, phase: number, flex: number, birth: number): Sway => [w, phase, flex, birth];

/** Small live-rock base / frag plug that a colony grows on. Returns the top height. */
function coralBase(out: DecorBuild, seed: number, w: number, d: number, h: number, lod: number): number {
  rock(out.solid, 'live', seed ^ 0x5a5a, { center: [0, 0, 0], size: { w, d, h }, bury: 0.006, detail: lod === 0 ? 10 : lod === 1 ? 5 : 2, marine: true, flatTop: 0.35 });
  return h * 0.82;
}

/** Height of a coral base top at (x,z) — approximate dome for placing polyps. */
const domeTop = (x: number, z: number, w: number, d: number, top: number) => top * Math.sqrt(Math.max(0, 1 - (x / (w / 2)) ** 2 - (z / (d / 2)) ** 2)) * 0.35 + top * 0.65;

function polypsOnDome(r: PRng, n: number, w: number, d: number, top: number): V3[] {
  const pts: V3[] = [];
  let guard = 0;
  while (pts.length < n && guard++ < n * 20) {
    const x = r.range(-w / 2, w / 2) * 0.88;
    const z = r.range(-d / 2, d / 2) * 0.88;
    if ((x / (w / 2)) ** 2 + (z / (d / 2)) ** 2 > 0.78) continue;
    pts.push([x, domeTop(x, z, w, d, top), z]);
  }
  return pts;
}

// ───────────────────────────── soft corals ─────────────────────────────

function zoanthids(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const { w, d, h } = def.size;
  const top = coralBase(out, seed, w, d, h * 0.45, lod);
  const b = out.coral;
  const morphs: [RGB, RGB, RGB][] = [
    [hex('#ff7a24'), hex('#2ee6a0'), hex('#5a3a1e')], // "Fire & Ice"
    [hex('#e8409a'), hex('#f5e050'), hex('#4a3a2a')],
    [hex('#40d0ff'), hex('#ff6040'), hex('#3a3a2a')],
  ];
  const [skirt, disc, column] = morphs[r.int(0, morphs.length - 1)];
  const count = Math.max(6, Math.round(r.int(32, 48) * q(lod)));
  for (const p of polypsOnDome(r, count, w * 0.9, d * 0.9, top)) {
    const ch = r.range(0.004, 0.008);
    const R = r.range(0.0032, 0.0045);
    const phase = r() * 6.28;
    const birth = clamp(r() * 0.8 - 0.05, 0, 0.8);
    const tipP: V3 = [p[0] + r.range(-0.001, 0.001), p[1] + ch, p[2] + r.range(-0.001, 0.001)];
    tube(b, [p, tipP], { radial: lod === 0 ? 8 : 5, radius: () => R * 0.72, color: () => column, sway: () => sw(0.3, phase, 0.12, birth), pivot: p });
    // oral disc: a shallow cone with a ring of tentacle petals
    const seg = lod === 0 ? 12 : 6;
    const centre = b.v([tipP[0], tipP[1] - 0.0006, tipP[2]], mul(disc, 0.9), sw(0.5, phase, 0.12, birth), p, [0.9, 0.35, 0.6, 0]);
    const ring: number[] = [];
    for (let k = 0; k <= seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      ring.push(b.v([tipP[0] + Math.cos(a) * R, tipP[1] + 0.0006, tipP[2] + Math.sin(a) * R], mix(disc, skirt, 0.55), sw(0.5, phase, 0.12, birth), p, [0.9, 0.35, 0.6, 0]));
    }
    for (let k = 0; k < seg; k++) b.tri(centre, ring[k + 1], ring[k]);
    if (lod === 0) {
      for (let k = 0; k < seg; k++) {
        const a = ((k + 0.5) / seg) * Math.PI * 2;
        const tipOut: V3 = [tipP[0] + Math.cos(a) * R * 1.55, tipP[1] + 0.0012, tipP[2] + Math.sin(a) * R * 1.55];
        const t = b.v(tipOut, skirt, sw(0.8, phase, 0.18, birth), p, [0.8, 0.4, 0.5, 0]);
        b.tri(ring[k], ring[k + 1], t);
      }
    }
  }
}

function mushrooms(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const top = coralBase(out, seed, w * 0.95, d * 0.95, h * 0.42, lod);
  const b = out.coral;
  const palettes: [RGB, RGB][] = [
    [hex('#2a4ab0'), hex('#8ab0ff')],
    [hex('#8a2a8a'), hex('#e070c0')],
    [hex('#b83a2a'), hex('#ff9a70')],
  ];
  const [c0, c1] = palettes[r.int(0, 2)];
  const count = Math.max(2, Math.round(r.int(4, 7) * (lod === 2 ? 0.5 : 1)));
  for (const p of polypsOnDome(r, count, w * 0.75, d * 0.75, top)) {
    const R = r.range(0.012, 0.022);
    const tilt = r.range(-0.3, 0.3);
    const phase = r() * 6.28;
    const seg = lod === 0 ? 28 : 12;
    const rings = lod === 0 ? 6 : 3;
    const cy = p[1] + r.range(0.003, 0.007);
    const idx: number[][] = [];
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      const row: number[] = [];
      for (let k = 0; k <= seg; k++) {
        const a = (k / seg) * Math.PI * 2;
        const rr = R * t * (1 + 0.08 * Math.sin(a * 5 + phase) * t);
        const lift = t * t * 0.004 + 0.003 * Math.sin(a * 3 + phase) * t * t;
        const x = p[0] + Math.cos(a) * rr;
        const z = p[2] + Math.sin(a) * rr;
        const y = cy + lift + tilt * (x - p[0]) * 0.3;
        let c = mix(c0, c1, smooth(0.2, 1, t) * 0.8);
        if (Math.sin(a * 22) > 0.7 && t > 0.2) c = mix(c, c1, 0.4); // radial stripes
        if (t < 0.15) c = mul(c0, 0.5); // mouth
        c = mix(c, mul(c1, 1.2), smooth(0.3, 0.8, n(x * 300, z * 300, 1)) * 0.25 * t);
        row.push(b.v([x, y, z], c, sw(t * 0.6, phase, 0.08, 0.1), [p[0], cy, p[2]], [0.6, 0.35, 0.7, 0.4]));
      }
      idx.push(row);
    }
    for (let i = 0; i < rings; i++) for (let k = 0; k < seg; k++) b.quad(idx[i][k], idx[i][k + 1], idx[i + 1][k + 1], idx[i + 1][k]);
    // short stalk
    tube(b, [[p[0], p[1] - 0.002, p[2]], [p[0], cy, p[2]]], { radial: 6, radius: () => R * 0.3, color: () => mul(c0, 0.6) });
  }
}

function gsp(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const { w, d, h } = def.size;
  const top = coralBase(out, seed, w * 0.95, d * 0.95, h * 0.5, lod);
  const b = out.coral;
  const mat = hex('#5a2a78');
  const star = hex('#56ff6a');
  const starC = hex('#e8ffb0');
  // encrusting purple mat
  blob(
    b,
    lod === 0 ? 6 : 3,
    (dir) => {
      const y = Math.max(0, dir[1]);
      return [dir[0] * w * 0.46, top * 0.55 + y * top * 0.5, dir[2] * d * 0.46];
    },
    () => mat,
    { extra: () => [0.1, 0.6, 0.4, 0.4] },
  );
  const count = Math.round(r.int(280, 380) * q(lod));
  for (const p of polypsOnDome(r, count, w * 0.9, d * 0.9, top)) {
    const phase = r() * 6.28 + p[0] * 60;
    const birth = clamp(r() * 0.85, 0, 0.85);
    const stalkH = r.range(0.002, 0.006);
    const t: V3 = [p[0], p[1] + stalkH, p[2]];
    if (lod === 0) tube(b, [p, t], { radial: 3, radius: () => 0.0006, color: () => mix(mat, star, 0.4), sway: () => sw(0.6, phase, 0.3, birth), pivot: p });
    const petals = lod === 0 ? 8 : 4;
    for (let k = 0; k < petals; k++) {
      leaf(b, {
        base: t,
        yaw: (k / petals) * 6.28 + r.range(-0.1, 0.1),
        pitch: r.range(0.1, 0.45),
        length: r.range(0.0022, 0.0034),
        width: 0.0009,
        curl: 0.3,
        shape: 'needle',
        segL: 2,
        segW: 1,
        color: (u) => mix(starC, star, u),
        sway: sw(1, phase, 0.3, birth),
        pivot: p,
        extra: [1, 0.4, 0.5, 0],
      });
    }
  }
}

function leather(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, h } = def.size;
  const b = out.coral;
  const cream = hex('#d6c29a');
  const tan = hex('#b8a070');
  const polyp = hex('#efe6c8');
  const stalkH = h * 0.5;
  const capR = w * 0.46;
  // stalk
  const stalk: V3[] = [[0, -0.004, 0], [r.range(-0.004, 0.004), stalkH * 0.5, r.range(-0.004, 0.004)], [r.range(-0.008, 0.008), stalkH, r.range(-0.006, 0.006)]];
  tube(b, smoothPath(stalk, 8), { radial: lod === 0 ? 14 : 7, radius: (t) => 0.02 * (1.2 - 0.25 * t) + 0.004 * Math.sin(t * 9), color: (t) => mix(cream, tan, 0.3 + 0.3 * t), sway: (t) => sw(t * 0.2, 0, 0.1, 0), capStart: true, extra: () => [0.05, 0.6, 0.4, 0.5] });
  // ruffled cap (folds around the rim)
  const c0 = stalk[2];
  const seg = lod === 0 ? 48 : 16;
  const rings = lod === 0 ? 8 : 3;
  const rows: number[][] = [];
  const folds = r.int(5, 8);
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const row: number[] = [];
    for (let k = 0; k <= seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      const rr = capR * t * (1 + 0.12 * Math.sin(a * folds + seed) * t);
      const y = c0[1] + 0.006 + (1 - t * t) * 0.012 + Math.sin(a * folds * 2 + seed) * 0.006 * t * t - t * t * 0.01;
      const x = c0[0] + Math.cos(a) * rr;
      const z = c0[2] + Math.sin(a) * rr;
      row.push(b.v([x, Math.min(h - 0.002, y), z], mix(cream, tan, 0.4 + 0.3 * n(x * 90, z * 90, 2)), sw(t * 0.5, a, 0.12, 0), c0, [0.05, 0.6, 0.4, 0.8]));
    }
    rows.push(row);
  }
  for (let i = 0; i < rings; i++) for (let k = 0; k < seg; k++) b.quad(rows[i][k], rows[i][k + 1], rows[i + 1][k + 1], rows[i + 1][k]);
  // underside
  const under: number[] = [];
  for (let k = 0; k <= seg; k++) under.push(rows[rings][k]);
  const uc = b.v([c0[0], c0[1] - 0.002, c0[2]], mul(tan, 0.7), NO_SWAY, c0);
  for (let k = 0; k < seg; k++) b.tri(uc, under[k], under[k + 1]);
  // polyp fuzz on top
  const fuzz = Math.round(r.int(320, 420) * q(lod));
  for (let i = 0; i < fuzz; i++) {
    const a = r() * 6.28;
    const t = Math.sqrt(r()) * 0.95;
    const x = c0[0] + Math.cos(a) * capR * t;
    const z = c0[2] + Math.sin(a) * capR * t;
    const y = c0[1] + 0.006 + (1 - t * t) * 0.012 + Math.sin(a * folds * 2 + seed) * 0.006 * t * t - t * t * 0.01;
    leaf(b, {
      base: [x, y, z],
      yaw: r() * 6.28,
      pitch: r.range(1.0, 1.5),
      length: r.range(0.002, 0.0038),
      width: 0.0008,
      shape: 'needle',
      segL: 2,
      segW: 1,
      color: () => polyp,
      sway: sw(0.8, a * 3, 0.2, clamp(r() * 0.8, 0, 0.8)),
      pivot: [x, y, z],
      extra: [0.1, 0.6, 0.4, 0],
    });
  }
}

// ───────────────────────────── LPS (euphyllia) ─────────────────────────────

function euphyllia(out: DecorBuild, def: DecorDef, seed: number, lod: number, kind: 'hammer' | 'torch' | 'frogspawn'): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const skel = hex('#8a8272');
  const b = out.coral;
  const palettes: Record<string, [RGB, RGB]> = {
    hammer: [hex('#2f8a5a'), hex('#d8f070')],
    torch: [hex('#6a7a2a'), hex('#f0f070')],
    frogspawn: [hex('#4a8a78'), hex('#f0b0d0')],
  };
  const [body, tipC] = palettes[kind];
  // skeleton: a few branching walls rising from the base
  const heads = kind === 'torch' ? r.int(3, 5) : r.int(3, 4);
  const headH = h * (kind === 'torch' ? 0.42 : 0.5);
  const headPts: V3[] = [];
  for (let i = 0; i < heads; i++) {
    const a = (i / heads) * 6.28 + r.range(-0.4, 0.4);
    const rr = Math.min(w, d) * r.range(0.12, 0.25);
    const top: V3 = [Math.cos(a) * rr, headH * r.range(0.8, 1), Math.sin(a) * rr];
    headPts.push(top);
    tube(out.solid, smoothPath([[0, -0.004, 0], [top[0] * 0.4, top[1] * 0.5, top[2] * 0.4], top], 8), {
      radial: lod === 0 ? 10 : 5,
      radius: (t) => 0.007 + 0.004 * t,
      color: (t, th, p) => mix(mul(skel, 0.7), skel, clamp(0.5 + n(p[0] * 200, p[1] * 200, th) * 0.5)),
      capStart: true,
      capEnd: true,
      extra: () => [0, 0.7, 0.3, 1.5],
    });
  }
  // fleshy tentacles
  const per = Math.max(4, Math.round((kind === 'torch' ? r.int(26, 36) : r.int(20, 28)) * q(lod)));
  const radial = lod === 0 ? 6 : 4;
  for (const hp of headPts) {
    for (let i = 0; i < per; i++) {
      const a = r() * 6.28;
      const rad = Math.sqrt(r()) * 0.008;
      const base: V3 = [hp[0] + Math.cos(a) * rad, hp[1] + 0.001, hp[2] + Math.sin(a) * rad];
      const L = kind === 'torch' ? r.range(0.028, 0.045) : r.range(0.014, 0.022);
      const dir = norm([Math.cos(a) * r.range(0.3, 0.9), 1, Math.sin(a) * r.range(0.3, 0.9)]);
      const segs = lod === 0 ? 7 : 3;
      const path: V3[] = [];
      for (let k = 0; k <= segs; k++) {
        const t = k / segs;
        const droop = kind === 'torch' ? t * t * L * 0.35 : t * t * L * 0.1;
        path.push([base[0] + dir[0] * L * t, base[1] + dir[1] * L * t - droop, base[2] + dir[2] * L * t]);
      }
      const phase = r() * 6.28;
      const birth = clamp(r() * 0.85, 0, 0.85);
      const flex = kind === 'torch' ? 1 : 0.5;
      const R = kind === 'torch' ? 0.0016 : 0.0019;
      tube(b, path, {
        radial,
        radius: (t) => R * (1 - t * 0.25),
        color: (t) => mix(body, mix(body, tipC, 0.3), t),
        sway: (t) => sw(t, phase, flex, birth),
        pivot: base,
        extra: (t) => [0.3 + t * 0.3, 0.3, 0.7, 0],
        capEnd: 'round',
      });
      const tip = path[path.length - 1];
      if (kind === 'torch') {
        blobAt(b, tip, R * 1.5, tipC, sw(1, phase, flex, birth), base, lod);
      } else if (kind === 'hammer') {
        // anchor-shaped tip: a short crosswise capsule
        const side = norm([-dir[2], 0, dir[0]]);
        tube(b, [add(tip, scl(side, -0.004)), tip, add(tip, scl(side, 0.004))], { radial, radius: (t) => 0.0021 * (0.8 + 0.2 * Math.sin(t * Math.PI)), color: () => tipC, sway: () => sw(1, phase, flex, birth), pivot: base, extra: () => [0.8, 0.3, 0.7, 0], capStart: true, capEnd: 'round' });
      } else {
        for (let k = 0; k < 4; k++) {
          const o: V3 = [tip[0] + r.range(-0.002, 0.002), tip[1] + r.range(-0.0015, 0.002), tip[2] + r.range(-0.002, 0.002)];
          blobAt(b, o, r.range(0.0012, 0.0018), tipC, sw(1, phase, flex, birth), base, lod);
        }
      }
    }
  }
}

function blobAt(b: GeoBuilder, c: V3, R: number, col: RGB, s: Sway, pivot: V3, lod: number): void {
  blob(b, lod === 0 ? 1 : 0, (dir) => [c[0] + dir[0] * R, c[1] + dir[1] * R, c[2] + dir[2] * R], () => col, { sway: () => s, pivot, extra: () => [1, 0.3, 0.8, 0] });
}

// ───────────────────────────── SPS ─────────────────────────────

function acropora(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const b = out.coral;
  const palettes: [RGB, RGB][] = [
    [hex('#6a4ab0'), hex('#60d8ff')],
    [hex('#3a8a6a'), hex('#b0ff80')],
    [hex('#b06090'), hex('#f0e0ff')],
  ];
  const [body, tipC] = palettes[r.int(0, 2)];
  const perches = def.anchors.filter((a) => a.kind === 'perch').map((a) => a.offset as V3);
  const branches: { pts: V3[]; r0: number; r1: number }[] = [];
  const grow = (start: V3, dir: V3, L: number, r0: number, depth: number, target?: V3) => {
    const pts: V3[] = [start];
    let p = start;
    let dd = norm(dir);
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      dd = norm(add(dd, [r.range(-0.2, 0.2), 0.12, r.range(-0.2, 0.2)]));
      if (target) dd = norm(add(scl(dd, 0.5), scl(norm(sub(target, p)), 0.5)));
      p = add(p, scl(dd, L / steps));
      pts.push(p);
    }
    // keep the whole branch (surface + pointed tip) inside the box by shortening it, never by flattening it
    const fit = fitPath(pts, envelope(def.size, r0 * 1.05 + 0.0015, 0, 0.15), 0);
    branches.push({ pts: fit, r0, r1: r0 * 0.35 });
    if (depth > 0) {
      const kids = r.int(1, 3);
      for (let k = 0; k < kids; k++) {
        const at = fit[r.int(2, fit.length - 1)];
        const room = Math.max(0, Math.min(1, (h - at[1]) / (h * 0.5)));
        grow(at, add(dd, [r.range(-0.9, 0.9), r.range(0, 0.5), r.range(-0.9, 0.9)]), L * r.range(0.45, 0.7) * (0.45 + 0.55 * room), r0 * 0.65, depth - 1);
      }
    }
  };
  const mains = Math.max(3, Math.round(r.int(6, 9) * (lod === 2 ? 0.5 : 1)));
  for (let i = 0; i < mains; i++) {
    const a = (i / mains) * 6.28 + r.range(-0.3, 0.3);
    const target = perches[i];
    grow([Math.cos(a) * 0.01, 0.002, Math.sin(a) * 0.008], [Math.cos(a) * 0.7, 1, Math.sin(a) * 0.7], r.range(h * 0.55, h * 0.8), 0.0055, lod === 0 ? 2 : 1, target);
  }
  for (const br of branches) {
    tube(b, smoothPath(br.pts, lod === 0 ? 10 : 5), {
      radial: lod === 0 ? 7 : 4,
      radius: (t) => br.r0 + (br.r1 - br.r0) * t,
      displace: (t, th, p) => (lod === 0 ? Math.max(0, n(p[0] * 700, p[1] * 700, p[2] * 700)) * 0.0007 : 0),
      color: (t) => mix(body, tipC, smooth(0.6, 1, t)),
      extra: (t) => [smooth(0.55, 1, t) * 0.8, 0.55, 0.4, 1.2],
      capStart: true,
      capEnd: 'point',
    });
  }
  void w;
  void d;
}

// ───────────────────────────── anemone ─────────────────────────────

function anemone(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const { w, h } = def.size;
  const b = out.coral;
  const variants: [RGB, RGB, RGB][] = [
    [hex('#c46a5e'), hex('#f09a86'), hex('#7ae0a0')], // rose
    [hex('#6a8a4a'), hex('#a8c870'), hex('#e0f0a0')], // green
    [hex('#b0484a'), hex('#e06060'), hex('#ffd0d0')], // rainbow-ish red
  ];
  const [body, bubble, tipC] = variants[r.int(0, variants.length - 1)];
  const discY = h * 0.35;
  // column + oral disc
  lathe(
    b,
    [
      [0.02, -0.006],
      [0.024, discY * 0.4],
      [0.028, discY * 0.85],
      [0.036, discY],
      [0.026, discY + 0.003],
      [0.008, discY + 0.004],
      [0.0, discY + 0.001],
    ],
    lod === 0 ? 28 : 12,
    (t) => (t < 0.5 ? mix(hex('#d8a898'), body, t * 2) : t > 0.85 ? mul(body, 0.5) : body),
    [0.3, 0.4, 0.6, 0.3],
  );
  const count = Math.max(16, Math.round(r.int(90, 120) * q(lod)));
  const radial = lod === 0 ? 7 : 4;
  const tentacleBox = envelope({ w, d: w, h }, 0.0052, -0.006);
  for (let i = 0; i < count; i++) {
    const ringT = Math.sqrt((i + 0.5) / count);
    const a = i * 2.39996;
    const rad = 0.008 + ringT * 0.03;
    const base: V3 = [Math.cos(a) * rad, discY + 0.002, Math.sin(a) * rad];
    const L = r.range(0.026, 0.042) * (0.8 + 0.3 * ringT);
    const out3 = norm([Math.cos(a) * (0.3 + ringT * 1.0), 1, Math.sin(a) * (0.3 + ringT * 1.0)]);
    const segs = lod === 0 ? 8 : 4;
    let path: V3[] = [];
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      path.push([base[0] + out3[0] * L * t, base[1] + out3[1] * L * t - t * t * L * 0.25 * ringT, base[2] + out3[2] * L * t]);
    }
    // outer tentacles would poke past the footprint: shorten them (bubble tip intact) instead of flattening
    path = fitPath(path, tentacleBox, 0);
    const phase = r() * 6.28;
    const birth = clamp(r() * 0.5, 0, 0.5);
    tube(b, path, {
      radial,
      radius: (t) => {
        const bulb = smooth(0.45, 0.72, t) * (1 - smooth(0.82, 1, t));
        return 0.0022 * (1 - 0.2 * t) + bulb * 0.0024;
      },
      color: (t) => mix(mix(body, bubble, smooth(0.45, 0.7, t)), tipC, smooth(0.85, 1, t)),
      sway: (t) => sw(t, phase, 0.8, birth),
      pivot: base,
      extra: (t) => [0.35 + smooth(0.8, 1, t) * 0.6, 0.3, 0.8, 0],
      capEnd: 'round',
    });
  }
}

// ───────────────────────────── macroalgae & gorgonians ─────────────────────────────

function chaeto(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const b = out.foliage;
  const c0 = hex('#35621a');
  const c1 = hex('#6c9c36');
  const strands = Math.round(r.int(110, 150) * q(lod));
  for (let i = 0; i < strands; i++) {
    const pts: V3[] = [];
    let p: V3 = [r.range(-w * 0.35, w * 0.35), r.range(h * 0.1, h * 0.8), r.range(-d * 0.35, d * 0.35)];
    let dir: V3 = norm([r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)]);
    const segs = lod === 0 ? 14 : 6;
    for (let k = 0; k <= segs; k++) {
      pts.push(p);
      dir = norm(add(dir, [n(p[0] * 80, p[1] * 80, i) * 1.2, n(p[1] * 80, p[2] * 80, i) * 1.2, n(p[2] * 80, p[0] * 80, i) * 1.2]));
      p = add(p, scl(dir, 0.006));
      // stay inside a squashed ellipsoid
      const e = (p[0] / (w * 0.46)) ** 2 + ((p[1] - h * 0.45) / (h * 0.5)) ** 2 + (p[2] / (d * 0.46)) ** 2;
      if (e > 1) {
        dir = norm(sub([0, h * 0.45, 0], p));
        p = add(p, scl(dir, 0.004));
      }
    }
    const shade = r();
    tube(b, pts, { radial: 3, radius: () => 0.0007, color: (t) => mix(c0, c1, 0.3 + shade * 0.6), sway: () => sw(0, i, 0.15, clamp(r() * 0.8, 0, 0.8)) });
  }
  weightFromHeight(b, 0, h, 1);
}

function branchTo(r: PRng, n: Noise3, start: V3, target: V3, steps: number, wob: number): V3[] {
  const pts: V3[] = [start];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p: V3 = [start[0] + (target[0] - start[0]) * t, start[1] + (target[1] - start[1]) * t, start[2] + (target[2] - start[2]) * t];
    const k = Math.sin(t * Math.PI) * wob;
    pts.push([p[0] + n(p[0] * 30, p[1] * 30, 1) * k, p[1], p[2] + n(p[2] * 30, p[1] * 30, 2) * k]);
  }
  return pts;
}

function gracilaria(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const b = out.foliage;
  const deep = hex('#5e1222');
  const bright = hex('#b0384e');
  const hitches = def.anchors.filter((a) => a.kind === 'hitch').map((a) => a.offset as V3);
  const branch = (start: V3, dir: V3, L: number, R: number, depth: number, phase: number, target?: V3) => {
    const segs = lod === 0 ? 8 : 4;
    let pts: V3[];
    if (target) pts = branchTo(r, n, start, [target[0], target[1] + L * 0.25, target[2]], segs, 0.012);
    else {
      pts = [start];
      let p = start;
      let dd = norm(dir);
      for (let k = 0; k < segs; k++) {
        dd = norm(add(dd, [r.range(-0.35, 0.35), 0.18, r.range(-0.35, 0.35)]));
        p = add(p, scl(dd, L / segs));
        pts.push(p);
      }
    }
    // a rounded bush: branches that would leave the (domed) footprint grow shorter, keeping their shape
    // (the old per-vertex clamp sliced every tip flat at the box ceiling and walls)
    const margin = R * 1.15 + 0.0012;
    pts = fitPath(pts, envelope(def.size, margin, 0, 0.3), 0);
    const birth = clamp(depth === 0 ? 0 : r() * 0.8, 0, 0.8);
    tube(b, smoothPath(pts, segs * 2), { radial: lod === 0 ? 6 : 3, radius: (t) => R * (1 - t * 0.5), color: (t) => mix(deep, bright, 0.3 + t * 0.6), sway: () => sw(0, phase, 0.4, birth), capEnd: 'round', extra: () => [0, 0.45, 0.5, 0.1] });
    if (depth < 3) {
      const kids = lod === 0 ? r.int(3, 5) : 1;
      for (let k = 0; k < kids; k++) {
        const at = pts[r.int(Math.floor(pts.length / 3), pts.length - 1)];
        // less headroom near the top → shorter shoots, so the crown tapers instead of hitting a ceiling
        const room = Math.max(0, Math.min(1, (h - at[1]) / (h * 0.55)));
        branch(at, [r.range(-1, 1), r.range(0.3, 1), r.range(-1, 1)], L * r.range(0.4, 0.65) * (0.35 + 0.65 * room), R * 0.7, depth + 1, phase + k);
      }
    }
  };
  const mains = r.int(5, 7);
  for (let i = 0; i < mains; i++) {
    const a = (i / mains) * 6.28;
    branch([Math.cos(a) * 0.004, 0.002, Math.sin(a) * 0.004], [Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6], r.range(h * 0.45, h * 0.7), 0.003, 0, r() * 6.28, hitches[i]);
  }
  void w;
  void d;
  weightFromHeight(b, 0, h, 1.2);
}

function gorgonian(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const b = out.coral;
  const stem = hex('#6e4c64');
  const stemL = hex('#9c7890');
  const polyp = hex('#e8d6c0');
  // holdfast
  lathe(out.solid, [[0.014, -0.004], [0.012, 0.003], [0.006, 0.008], [0.004, 0.012]], lod === 0 ? 14 : 6, () => mul(stem, 0.8), [0, 0.7, 0.3, 1]);
  const hitches = def.anchors.filter((a) => a.kind === 'hitch').map((a) => a.offset as V3);
  const branches: { pts: V3[]; R: number }[] = [];
  const trunk: V3[] = [[0, 0.004, 0], [r.range(-0.004, 0.004), h * 0.18, r.range(-0.002, 0.002)]];
  branches.push({ pts: trunk, R: 0.0058 });
  const fork = trunk[1];
  // branch + its feathery polyps (≤ 7 mm) must stay inside the box: shorten whole branches to fit
  const polypReach = lod < 2 ? 0.0072 : 0.001;
  for (const hp of hitches) {
    const end: V3 = [hp[0] * 1.15 + r.range(-0.006, 0.006), Math.min(h * 0.97, hp[1] + r.range(0.03, 0.06)), hp[2] + r.range(-0.004, 0.004)];
    const pts = fitPath(branchTo(r, n, fork, end, lod === 0 ? 10 : 5, 0.01), envelope(def.size, 0.0047 * 1.1 + polypReach, 0), 0);
    branches.push({ pts, R: 0.0047 });
    // side branches (mostly in the fan plane)
    const kids = lod === 2 ? 0 : r.int(1, 3);
    for (let k = 0; k < kids; k++) {
      const at = pts[r.int(3, pts.length - 2)];
      const side = r.chance(0.5) ? -1 : 1;
      const tgt: V3 = [at[0] + side * r.range(0.02, 0.045), Math.min(h * 0.96, at[1] + r.range(0.03, 0.07)), at[2] + r.range(-0.01, 0.01)];
      branches.push({ pts: fitPath(branchTo(r, n, at, tgt, lod === 0 ? 6 : 3, 0.006), envelope(def.size, 0.0036 * 1.1 + polypReach, 0), 0), R: 0.0036 });
    }
  }
  const phase = r() * 6.28;
  for (const br of branches) {
    const path = smoothPath(br.pts, br.pts.length * 2);
    tube(b, path, { radial: lod === 0 ? 7 : 4, radius: (t) => br.R * (1 - t * 0.35), color: (t, th, p) => mix(stem, stemL, clamp(0.4 + n(p[0] * 300, p[1] * 300, th) * 0.5)), sway: () => sw(0, phase, 0.12, 0), capEnd: 'round', extra: () => [0, 0.6, 0.3, 0.8] });
    // feathery polyps along the branch
    if (lod < 2) {
      const count = Math.round((len(sub(path[path.length - 1], path[0])) / 0.0019) * (lod === 0 ? 1 : 0.4));
      for (let i = 0; i < count; i++) {
        const t = r();
        const idx = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
        const p = path[idx];
        const a = r() * 6.28;
        const R = br.R * (1 - t * 0.35);
        const o: V3 = [p[0] + Math.cos(a) * R, p[1] + r.range(-0.001, 0.001), p[2] + Math.sin(a) * R];
        leaf(b, {
          base: o,
          yaw: a + r.range(-0.3, 0.3),
          pitch: r.range(-0.2, 0.9),
          length: r.range(0.004, 0.0068),
          width: 0.0013,
          shape: 'needle',
          segL: 2,
          segW: 1,
          color: (u) => mix(stemL, polyp, 0.4 + u * 0.6),
          sway: sw(0, phase + i * 0.1, 0.3, clamp(r() * 0.8, 0, 0.8)),
          pivot: o,
          extra: [0.1, 0.6, 0.3, 0],
        });
      }
    }
  }
  void d;
  weightFromHeight(b, 0, h, 1.3);
}

function hitchingPost(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const b = out.solid;
  const bone = hex('#e6ddcb');
  const shade = hex('#b8aa90');
  // weighted base disc
  lathe(b, [[0.03, -0.004], [0.032, 0.003], [0.026, 0.008], [0.012, 0.011], [0, 0.012]], lod === 0 ? 24 : 10, (t) => mix(shade, bone, t), [0, 0.35, 0.4, 0.6], (a) => 0.06 * Math.sin(a * 3 + seed));
  const hitches = def.anchors.filter((a) => a.kind === 'hitch').map((a) => a.offset as V3);
  const rods: V3[] = [...hitches, [r.range(-0.02, 0.02), h * 0.72, r.range(-0.015, 0.015)]];
  rods.forEach((hp, i) => {
    const end: V3 = [hp[0] * 1.3, Math.min(h * 0.98, hp[1] + (i === rods.length - 1 ? 0 : h * 0.18)), hp[2] * 1.2];
    const pts = fitPath(branchTo(r, n, [r.range(-0.006, 0.006), 0.008, r.range(-0.006, 0.006)], end, lod === 0 ? 10 : 4, 0.008), envelope(def.size, 0.0042 * 1.1 + 0.0012, 0), 0);
    tube(b, smoothPath(pts, lod === 0 ? 16 : 6), {
      radial: lod === 0 ? 10 : 5,
      radius: (t) => 0.0042 * (1 - t * 0.45),
      color: (t, th, p) => mix(bone, shade, clamp(0.25 + fbm3(n, p[0] * 60, p[1] * 60, p[2] * 60, 2) * 0.5)),
      extra: () => [0, 0.34, 0.45, 0.35],
      capEnd: 'round',
    });
    // a short twig for tails to wrap
    if (lod < 2) {
      const at = pts[Math.floor(pts.length * 0.55)];
      const tw = fitPath([at, [at[0] + r.range(-0.02, 0.02), at[1] + r.range(0.01, 0.025), at[2] + r.range(-0.01, 0.01)]], envelope(def.size, 0.0024 * 1.1 + 0.0012, 0), 0)[1];
      tube(b, [at, tw], { radial: 6, radius: (t) => 0.0024 * (1 - t * 0.4), color: () => bone, extra: () => [0, 0.34, 0.45, 0.35], capEnd: 'round' });
    }
  });
  void w;
  void d;
}

export function genMarine(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  switch (def.visual) {
    case 'coral_zoanthid':
      return zoanthids(out, def, seed, lod);
    case 'coral_mushroom':
      return mushrooms(out, def, seed, lod);
    case 'coral_gsp':
      return gsp(out, def, seed, lod);
    case 'coral_leather':
      return leather(out, def, seed, lod);
    case 'coral_hammer':
      return euphyllia(out, def, seed, lod, 'hammer');
    case 'coral_torch':
      return euphyllia(out, def, seed, lod, 'torch');
    case 'coral_frogspawn':
      return euphyllia(out, def, seed, lod, 'frogspawn');
    case 'coral_acropora':
      return acropora(out, def, seed, lod);
    case 'anemone_bta':
      return anemone(out, def, seed, lod);
    case 'macro_chaeto':
      return chaeto(out, def, seed, lod);
    case 'macro_gracilaria':
      return gracilaria(out, def, seed, lod);
    case 'coral_gorgonian':
      return gorgonian(out, def, seed, lod);
    case 'ornament_hitching_post':
      return hitchingPost(out, def, seed, lod);
  }
}

