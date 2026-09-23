/**
 * Procedural driftwood: spider wood, manzanita, mopani, cholla. Branching tubes with bark grain, knots and twigs.
 * OWNER: lane "aquascape".
 */
import { GeoBuilder, tube, smoothPath, add, sub, scl, norm, len, rotAxis, anyPerp, cross, envelope, fitPath, boxClamp, fitInto, type V3, type Extra, NO_SWAY } from './builder';
import { prng, noise3, fbm3, hex, mix, mul, clamp, smooth, type RGB, type PRng, type Noise3 } from './noise';
import type { DecorBuild } from './rocks';
import type { DecorDef } from '@/types';

interface WoodStyle {
  base: RGB;
  light: RGB;
  dark: RGB;
  grain: number; // groove depth factor
  rough: number;
  gnarl: number; // path wobble
  radial: number;
}

const STYLES: Record<string, WoodStyle> = {
  wood_spider: { base: hex('#9c7a58'), light: hex('#d2b490'), dark: hex('#4e3826'), grain: 0.22, rough: 0.66, gnarl: 0.55, radial: 12 },
  wood_manzanita: { base: hex('#6a3627'), light: hex('#a56a4c'), dark: hex('#3a1c12'), grain: 0.07, rough: 0.34, gnarl: 0.35, radial: 12 },
  // lane:w2-visual — mopani: warm two-tone (reddish heartwood + pale sapwood) instead of near-black, and a finer ring
  wood_mopani: { base: hex('#5a3822'), light: hex('#c9a26c'), dark: hex('#40261a'), grain: 0.12, rough: 0.45, gnarl: 0.25, radial: 12 },
};

interface Branch {
  pts: V3[];
  r0: number;
  r1: number;
}

/** Grow a wandering branch from p toward an optional target. */
function grow(r: PRng, n: Noise3, start: V3, dir: V3, length: number, steps: number, gnarl: number, target?: V3, up = 0): V3[] {
  const pts: V3[] = [start];
  let p = start;
  let d = norm(dir);
  const step = length / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    // wander
    const wob: V3 = [n(p[0] * 20, p[1] * 20, i * 0.3) * gnarl, n(p[1] * 20 + 5, p[2] * 20, i * 0.3) * gnarl * 0.6 + up, n(p[2] * 20 + 9, p[0] * 20, i * 0.3) * gnarl];
    d = norm(add(d, scl(wob, 0.45)));
    if (target) {
      const toT = sub(target, p);
      const remaining = len(toT);
      const k = smooth(0.2, 0.95, t) * 0.9;
      d = norm(add(scl(d, 1 - k), scl(norm(toT), k)));
      if (remaining < step) {
        pts.push(target);
        return pts;
      }
    }
    p = add(p, scl(d, step));
    pts.push(p);
  }
  return pts;
}

function woodTube(b: GeoBuilder, br: Branch, st: WoodStyle, n: Noise3, lod: number, seedOff: number): void {
  // lane:w2-visual — mopani lobes are fat and sculpted: they need a denser ring/path and smooth, low-frequency relief.
  // The spider-wood relief (hard-thresholded knots + 90/m noise) folded into creased, faceted sheets at that radius.
  const mop = st === STYLES.wood_mopani;
  const segs = lod === 0 ? Math.max(mop ? 12 : 8, Math.round(br.pts.length * (mop ? 2.5 : 4))) : lod === 1 ? Math.max(4, br.pts.length) : 3;
  const path = smoothPath(br.pts, segs);
  const radial = lod === 0 ? st.radial : lod === 1 ? 6 : 4;
  // mopani limbs end in a true hemispherical knob: extra rings past the end, spaced so radius = rEnd·cos φ
  const baseR = (u: number) => (br.r0 + (br.r1 - br.r0) * Math.pow(u, 0.8)) * (mop ? 1 + 0.14 * Math.sin(u * Math.PI * 2.6 + seedOff * 1.3) : 1);
  const tailFrom = path.length - 1;
  const nTail = mop ? (lod === 0 ? 4 : lod === 1 ? 2 : 0) : 0;
  if (nTail > 0 && path.length >= 2) {
    const e = path[tailFrom];
    const dir = norm(sub(e, path[tailFrom - 1]));
    for (let k = 1; k <= nTail; k++) path.push(add(e, scl(dir, baseR(1) * Math.sin((k / nTail) * (Math.PI / 2)))));
  }
  const nPath = path.length;
  const knob = (t: number) => {
    const i = Math.round(t * (nPath - 1));
    return i <= tailFrom ? 1 : Math.max(0.08, Math.cos(((i - tailFrom) / nTail) * (Math.PI / 2)));
  };
  // mopani: the relief of the vertex being built (displace runs right before color for each ring vertex), so the
  // two-tone follows the form — pale sanded sapwood on ridges, dark heartwood in the grooves
  let ridge = 0;
  let lenAcc = 0;
  const cum: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    lenAcc += len(sub(path[i], path[i - 1]));
    cum.push(lenAcc);
  }
  tube(b, path, {
    radial,
    radius: (t, i) => (nTail > 0 ? baseR(Math.min(1, i / tailFrom)) * knob(t) : baseR(t)),
    displace: (t, th, p) => {
      const rr = br.r0 + (br.r1 - br.r0) * t;
      if (mop) {
        // smooth swells and shallow flutes (continuous around the ring: cos/sin of the ring angle, not the angle)
        const ct = Math.cos(th);
        const sn = Math.sin(th);
        const swell = n(p[0] * 16 + ct * 1.3, p[1] * 16 + sn * 1.3, p[2] * 16 + seedOff);
        const fine = n(p[0] * 38 + ct * 2.2, p[1] * 38 + sn * 2.2, p[2] * 38 + seedOff + 4);
        const flute = Math.sin(th * 3 + t * 5 + swell * 2); // grooves twisting along the limb
        ridge = 0.6 * swell + 0.5 * flute;
        return rr * knob(t) * (0.16 * swell + 0.04 * fine + 0.07 * flute);
      }
      const grainV = Math.sin(th * 5 + n(p[0] * 40, p[1] * 40, seedOff) * 4) * st.grain;
      const knot = Math.max(0, n(p[0] * 55 + seedOff, p[1] * 55, p[2] * 55) - 0.55) * 1.6;
      return rr * (grainV * 0.4 + knot * 0.5 + 0.12 * n(p[0] * 90, p[1] * 90, p[2] * 90 + th));
    },
    color: (t, th, p) => {
      const g = 0.5 + 0.5 * Math.sin(th * 5 + n(p[0] * 40, p[1] * 40, seedOff) * 4);
      const f = fbm3(n, p[0] * 30, p[1] * 30, p[2] * 30, 3);
      let c = mix(st.base, st.light, clamp(0.5 + f * 0.9 + t * 0.12));
      c = mix(c, st.dark, smooth(0.5, 1, g) * st.grain * 3.6);
      c = mix(c, mul(st.dark, 1.3), smooth(0.35, 0.8, n(p[0] * 120, p[1] * 25, p[2] * 120 + seedOff)) * 0.25);
      if (mop) {
        // long grain streaks following the limb (slow along t, fast around the ring)
        const streak = n(Math.cos(th) * 2.4 + seedOff, Math.sin(th) * 2.4, t * 2.2 + seedOff * 0.37);
        c = mopaniColor(n, p, 0.7, ridge);
        c = mix(c, mul(st.dark, 0.85), smooth(0.15, 0.6, streak) * 0.32);
        c = mix(c, st.light, smooth(-0.15, -0.5, streak) * 0.2);
      }
      // underside a little darker
      c = mul(c, 0.8 + 0.2 * (Math.sin(th) * 0.5 + 0.5));
      return c;
    },
    extra: () => (mop ? [0, 0.42, 0.4, 0.75] : [0, st.rough, 0.35, 1.7]),
    capStart: true,
    capEnd: 'round',
    twist: seedOff,
  });
}

/** Spider wood: a root boss sending out twisting branches up and outwards, fine twigs at the tips. */
function genSpider(out: DecorBuild, def: DecorDef, seed: number, lod: number, style: 'wood_spider' | 'wood_manzanita'): void {
  const r = prng(seed);
  const n = noise3(seed);
  const st = STYLES[style];
  const b = out.solid;
  const { w, d, h } = def.size;
  const from = b.count;
  const manz = style === 'wood_manzanita';
  const branches: Branch[] = [];
  const baseR = manz ? 0.011 : 0.009;
  // targets: anchors define real branches (perch tips, the resting fork)
  const anchorTargets = def.anchors.filter((a) => a.kind === 'perch').map((a) => a.offset as V3);
  const rest = def.anchors.find((a) => a.kind === 'rest');
  const boss: V3 = [r.range(-0.01, 0.01), 0.006, r.range(-0.006, 0.006)];
  // Every branch is fitted as a whole (tube surface incl. bark relief + rounded cap) instead of clamping
  // vertices, which used to leave flat plank-cut ends. Radius r → margin ≈ 1.6·r (grain/knot displacement).
  const inBox = (r0: number) => envelope(def.size, r0 * 1.6 + 0.0015, -0.002);
  const clampIn = (r0: number) => boxClamp(def.size, r0 * 1.6 + 0.0015, 0.002);
  const fitB = (pts: V3[], r0: number, fixed = 0) => fitPath(pts, inBox(r0), fixed, clampIn(r0));
  // roots lying on the substrate
  const roots = lod === 2 ? 2 : r.int(3, 5);
  for (let i = 0; i < roots; i++) {
    const yaw = (i / roots) * Math.PI * 2 + r.range(-0.4, 0.4);
    const L = r.range(w * 0.22, w * 0.42);
    const pts = grow(r, n, boss, [Math.cos(yaw), -0.05, Math.sin(yaw) * 0.8], L, 6, st.gnarl * 0.6, undefined, -0.04);
    branches.push({ pts: fitB(pts.map((p) => [p[0], Math.max(0.002, p[1]), p[2]] as V3), baseR * 0.9), r0: baseR * 0.9, r1: baseR * 0.25 });
  }
  // main stems to each perch target, plus extra wandering stems
  const mains: V3[][] = [];
  for (const t of anchorTargets) {
    const tgt: V3 = [t[0] + r.range(-0.006, 0.006), t[1], t[2] + r.range(-0.004, 0.004)];
    const raw = grow(r, n, boss, [tgt[0] * 0.4, 1, tgt[2] * 0.4], len(sub(tgt, boss)) * 1.15, 9, st.gnarl, tgt, 0.15);
    // continue a little past the perch so the anchor sits on the branch, not the tip
    const last = raw[raw.length - 1];
    const dirEnd = norm(sub(last, raw[raw.length - 2]));
    raw.push(add(last, scl(norm(add(dirEnd, [r.range(-0.4, 0.4), 0.3, r.range(-0.3, 0.3)])), h * 0.1)));
    // the perch point stays put; only the stretch beyond it shortens to fit
    const pts = fitB(raw, baseR, raw.length - 2);
    mains.push(pts);
    branches.push({ pts, r0: baseR, r1: baseR * 0.22 });
  }
  const extra = lod === 2 ? 1 : r.int(manz ? 1 : 2, manz ? 3 : 4);
  for (let i = 0; i < extra; i++) {
    const yaw = r.range(0, Math.PI * 2);
    const pts = fitB(grow(r, n, boss, [Math.cos(yaw) * 0.6, 1, Math.sin(yaw) * 0.45], r.range(h * 0.55, h * 0.95), 9, st.gnarl, undefined, 0.08), baseR * 0.85);
    mains.push(pts);
    branches.push({ pts, r0: baseR * 0.85, r1: baseR * 0.2 });
  }
  // a near-horizontal limb passing through the resting spot
  if (rest) {
    const tgt = rest.offset as V3;
    const startOn = mains[0] ? mains[0][Math.min(mains[0].length - 1, 3)] : boss;
    const raw = grow(r, n, startOn, sub(tgt, startOn), len(sub(tgt, startOn)) * 1.1, 6, st.gnarl * 0.5, tgt, 0);
    const last = raw[raw.length - 1];
    raw.push(add(last, scl(norm(sub(last, startOn)), w * 0.12)));
    branches.push({ pts: fitB(raw, baseR * 0.7, raw.length - 2), r0: baseR * 0.7, r1: baseR * 0.25 });
  }
  // side branches & twigs
  const twigLevel = lod === 0 ? 1 : 0;
  for (const m of mains) {
    const k = lod === 2 ? 0 : r.int(2, manz ? 3 : 4);
    for (let i = 0; i < k; i++) {
      const at = m[r.int(Math.floor(m.length * 0.35), m.length - 2)];
      const dirUp: V3 = [r.range(-1, 1), r.range(0.2, 0.9), r.range(-0.7, 0.7)];
      const pts = fitB(grow(r, n, at, dirUp, r.range(h * 0.12, h * 0.3), 5, st.gnarl, undefined, 0.05), baseR * 0.45);
      branches.push({ pts, r0: baseR * 0.45, r1: baseR * 0.12 });
      if (twigLevel && !manz) {
        const at2 = pts[r.int(2, pts.length - 1)];
        const twig = fitB(grow(r, n, at2, [r.range(-1, 1), r.range(0, 1), r.range(-1, 1)], r.range(0.015, 0.035), 3, st.gnarl), baseR * 0.22);
        branches.push({ pts: twig, r0: baseR * 0.22, r1: baseR * 0.08 });
      }
    }
  }
  branches.forEach((br, i) => woodTube(b, br, st, n, lod, i * 1.7 + seed * 0.001));
  void d;
  void from;
}

/**
 * Mopani: a gnarled, twisting root-stump — sculpted, two-toned, dense.
 * lane:w2-visual — a low, smooth root boss (a star-shaped ellipsoid with lobes, twisting flutes and a hollow under a
 * front overhang for the hide) carrying three or four thick limbs that rise, twist and curl over, some forked, each
 * tapering to a rounded knob. Most of the mass is in the limbs, so the silhouette reads as wood, not a rock. Limbs
 * bend gently (a tube bent tighter than its own radius folds into creases — the old version's fault) with smooth
 * low-frequency relief; the two-tone follows the form (pale sanded sapwood on ridges, dark heartwood in grooves) and
 * long grain streaks run along each limb. Every random draw happens at every LOD, so the far LODs are the same piece.
 */
function genMopani(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const st = STYLES.wood_mopani;
  const b = out.solid;
  const { w, d, h } = def.size;
  const from = b.count;
  const cy = h * 0.15;
  const ax = w * 0.18;
  const ay = h * 0.17;
  const az = d * 0.27;
  // lobes on the sphere of directions: unit direction, amplitude (± = bulge / hollow), sharpness
  const lobes: { d: V3; a: number; k: number }[] = [];
  const dirOf = (yaw: number, el: number): V3 => [Math.cos(el) * Math.cos(yaw), Math.sin(el), Math.cos(el) * Math.sin(yaw)];
  for (let i = 0; i < 3; i++) lobes.push({ d: dirOf((i / 3) * Math.PI * 2 + r.range(-0.5, 0.5), r.range(-0.2, 0.2)), a: r.range(0.25, 0.45), k: r.range(4, 7) });
  // the hide: a hollow under an overhang at the front (the 'hide' anchor sits in it)
  lobes.push({ d: norm([r.range(-0.2, 0.2), -0.4, 1]), a: -0.45, k: 6.5 });
  const shape = (u: V3): number => {
    let s = 1;
    for (const l of lobes) s += l.a * Math.exp(-l.k * (1 - (u[0] * l.d[0] + u[1] * l.d[1] + u[2] * l.d[2])));
    const sw = fbm3(n, u[0] * 1.7 + 3, u[1] * 1.7, u[2] * 1.7, 3) * 0.16;
    const flute = 0.06 * Math.sin(Math.atan2(u[2], u[0]) * 4 + u[1] * 6 + sw * 8); // twisting grooves
    return Math.max(0.3, s + sw + flute);
  };
  const nLat = lod === 0 ? 18 : lod === 1 ? 9 : 5;
  const nLon = lod === 0 ? 30 : lod === 1 ? 14 : 8;
  const EX: Extra = [0, 0.42, 0.4, 0.75];
  const rows: number[][] = [];
  for (let i = 0; i <= nLat; i++) {
    const el = -Math.PI / 2 + (i / nLat) * Math.PI;
    const row: number[] = [];
    for (let k = 0; k < nLon; k++) {
      const az0 = (k / nLon) * Math.PI * 2;
      const u: V3 = [Math.cos(el) * Math.cos(az0), Math.sin(el), Math.cos(el) * Math.sin(az0)];
      const e = 1 / Math.sqrt((u[0] / ax) ** 2 + (u[1] / ay) ** 2 + (u[2] / az) ** 2);
      const sh = shape(u);
      const rr = e * sh;
      const p: V3 = [u[0] * rr, Math.max(-0.01, cy + u[1] * rr), u[2] * rr];
      row.push(b.v(p, mopaniColor(n, p, 0.7, (sh - 1.1) * 2.2), NO_SWAY, [0, 0, 0], EX));
    }
    rows.push(row);
  }
  for (let i = 0; i < nLat; i++) for (let k = 0; k < nLon; k++) b.quad(rows[i][k], rows[i + 1][k], rows[i + 1][(k + 1) % nLon], rows[i][(k + 1) % nLon]);

  // limbs: rise steeply, twist, then curl over (bend radius ≫ limb radius, so no creases)
  const limbPath = (start: V3, yaw: number, el0: number, curl: number, twist: number, L: number, steps: number, wob: number): V3[] => {
    const pts: V3[] = [start];
    let p = start;
    for (let i = 1; i <= steps; i++) {
      const s = i / steps;
      const el = el0 - curl * s * s + n(p[0] * 20 + 5, p[1] * 20, p[2] * 20 + wob) * 0.3;
      const yw = yaw + twist * s + n(p[0] * 22, p[1] * 22, p[2] * 22 + wob) * 0.45;
      p = add(p, scl([Math.cos(el) * Math.cos(yw), Math.sin(el), Math.cos(el) * Math.sin(yw) * 0.75], L / steps));
      pts.push(p);
    }
    return pts;
  };
  const nLimbs = r.int(3, 4);
  const yaw0 = r.range(0, Math.PI * 2);
  const limbs: Branch[] = [];
  for (let i = 0; i < nLimbs; i++) {
    // spread around the stump, biased to the long axis (x) so the piece reads wide and open from the front
    let yaw = yaw0 + (i / nLimbs) * Math.PI * 2 + r.range(-0.35, 0.35);
    yaw = Math.atan2(Math.sin(yaw) * 0.7, Math.cos(yaw));
    // varied: the first limb is the stoutest and steepest; later ones lower, longer-reaching or short and hooked
    const el0 = i === 0 ? r.range(1.05, 1.35) : r.range(0.45, 1.2);
    const curl = r.range(0.6, 1.7);
    const twist = r.range(-0.8, 0.8);
    const L = h * (i === 0 ? r.range(0.85, 1.05) : r.range(0.5, 0.95));
    const r0 = h * (i === 0 ? r.range(0.13, 0.15) : r.range(0.085, 0.125));
    const start: V3 = [Math.cos(yaw) * ax * 0.45, cy + ay * 0.25, Math.sin(yaw) * az * 0.4];
    const pts = limbPath(start, yaw, el0, curl, twist, L, 6, i * 3.1);
    const fork = r.chance(0.55);
    const fSide = r.chance(0.5) ? 1 : -1;
    const fL = L * r.range(0.4, 0.55);
    // LOD 2 keeps the two main limbs only (same draws, so the far silhouette matches)
    if (lod === 2 && i >= 2) continue;
    limbs.push({ pts, r0, r1: r0 * r.range(0.38, 0.5) });
    // a fork leaves along the limb (its first step runs inside it) and then veers off, so the junction reads as a Y
    if (fork && lod < 2) {
      const s0 = 2 / 6;
      const fEl = el0 - curl * s0 * s0;
      limbs.push({ pts: limbPath(pts[2], yaw + twist * s0, fEl, 1.1, fSide * 1.6, fL, 4, i * 3.1 + 17), r0: r0 * 0.6, r1: r0 * 0.3 });
    }
  }
  limbs.forEach((br, i) => woodTube(b, br, st, n, lod, 7 + i * 2.3));
  // limbs may overhang the footprint: shrink the piece per axis (mildly) instead of slicing it flat.
  // Only the part more than 1.5 cm down is trimmed (under the substrate).
  fitInto(b, def.size, from, -0.015);
}

/**
 * Mopani two-tone: mottled reddish-brown heartwood; pale sanded sapwood where the form rises (`ridge` > 0) and in a
 * few broad patches; the dark heartwood keeps the grooves (`ridge` < 0). Fine flowing grain on top.
 */
function mopaniColor(n: Noise3, p: V3, seedOff: number, ridge = 0): RGB {
  const st = STYLES.wood_mopani;
  const heart = mix(st.dark, st.base, clamp(0.5 + 0.7 * n(p[0] * 55, p[1] * 55, p[2] * 55 + seedOff)));
  const patch = n(p[0] * 14, p[1] * 14, p[2] * 14 + seedOff);
  let c = mix(heart, st.light, clamp(smooth(-0.1, 0.55, ridge) * 0.85 + smooth(0.05, 0.4, patch) * 0.5));
  c = mix(c, mul(st.dark, 0.9), smooth(-0.15, -0.7, ridge) * 0.5);
  // the odd knot: a dark eye with a pale rim
  const kn = n(p[0] * 42 + 9, p[1] * 42, p[2] * 42 + seedOff);
  c = mix(c, st.light, smooth(0.42, 0.52, kn) * (1 - smooth(0.55, 0.62, kn)) * 0.35);
  c = mix(c, mul(st.dark, 0.7), smooth(0.56, 0.66, kn) * 0.75);
  const grain = 0.5 + 0.5 * Math.sin(p[1] * 260 + n(p[0] * 40, p[1] * 12, p[2] * 40 + seedOff) * 7);
  c = mul(c, 0.92 + 0.08 * grain);
  return c;
}

/**
 * Cholla: a hollow woody lattice tube with oval holes (double-sided shell).
 * lane:w2-visual — built cell by cell on a slowly spiralling diamond lattice: every cell is a ring from its diamond
 * outline to an oval hole, so holes stay true ovals at any zoom (the old grid dropped whole quads and read as blocky
 * stair-steps). Neighbouring cells sample their shared edge at identical points (the ray set is symmetric about each
 * edge's midpoint), so there are no cracks. Hero LOD adds wall thickness: an inner shell, hole walls with softly
 * rounded rims, and end rings. Fibre streaks run along the axis.
 */
function genCholla(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const b = out.solidDouble;
  const { w, h } = def.size;
  const R = (h / 2) * 0.95;
  const L = w * 0.94;
  const c1 = hex('#a9895d');
  const c2 = hex('#dfc89e');
  const cFibre = hex('#7c6242');
  const cIn = hex('#5f4b31');
  const bend = r.range(-0.01, 0.01);
  const EX: Extra = [0, 0.75, 0.2, 1.2];
  const s01 = (x: number) => x / L + 0.5;
  const radiusAt = (x: number, a: number) => R * (1 + 0.05 * n(x * 30, Math.cos(a) * 1.4, Math.sin(a) * 1.4 + seed * 0.01)) * (0.93 + 0.07 * Math.sin(s01(x) * Math.PI));
  const at = (x: number, a: number, inset: number): V3 => {
    const rr = radiusAt(x, a) - inset;
    return [x, R + Math.sin(a) * rr, Math.sin(s01(x) * Math.PI) * bend + Math.cos(a) * rr];
  };
  const woodCol = (x: number, a: number, inner: boolean): RGB => {
    const fib = n(x * 16, Math.cos(a) * 9, Math.sin(a) * 9 + 5); // long streaks along the axis
    const f = n(x * 70, Math.cos(a) * 3.5, Math.sin(a) * 3.5 + 11);
    let c = mix(c1, c2, clamp(0.5 + f * 0.55 + fib * 0.2));
    c = mix(c, cFibre, smooth(0.2, 0.75, fib) * 0.5);
    return inner ? mix(c, cIn, 0.6) : c;
  };
  if (lod === 2) {
    // far LOD: a plain lumpy tube (holes are sub-pixel at this distance)
    const segA = 8;
    const segL = 6;
    const rows: number[][] = [];
    for (let i = 0; i <= segL; i++) {
      const x = (i / segL - 0.5) * L;
      const row: number[] = [];
      for (let k = 0; k <= segA; k++) {
        const a = (k / segA) * Math.PI * 2;
        const p = at(x, a, 0);
        row.push(b.v(p, woodCol(x, a, false), NO_SWAY, [0, 0, 0], EX));
      }
      rows.push(row);
    }
    for (let i = 0; i < segL; i++) for (let k = 0; k < segA; k++) b.quad(rows[i][k], rows[i + 1][k], rows[i + 1][k + 1], rows[i][k + 1]);
    return;
  }
  const thick = lod === 0;
  const T = Math.min(0.0028, R * 0.13); // wall thickness
  const K = lod === 0 ? 16 : 8; // ring samples per cell (multiple of 4: includes the diamond corners)
  const nA = 6; // holes around
  const da = (Math.PI * 2) / nA;
  const dx = Math.max(0.018, R * da * 1.6); // axial spacing of holes in one row (holes are longer than wide)
  const spiral = r.range(2, 4.5) * (r.chance(0.5) ? -1 : 1); // rad per metre
  const phase = r.range(0, da);
  const xOff = r.range(0, dx / 2);
  const rowsN = Math.ceil((L / 2 + dx) / (dx / 2));
  const dirs: [number, number][] = [];
  for (let k = 0; k < K; k++) {
    const th = (k / K) * Math.PI * 2;
    dirs.push([Math.cos(th), Math.sin(th)]);
  }
  // one quad, wound so its normal agrees with `want` (smooth shading needs consistent winding per cell)
  const quadTo = (i0: number, i1: number, i2: number, i3: number, want: V3) => {
    const P = b.pos;
    const e1: V3 = [P[i1 * 3] - P[i0 * 3], P[i1 * 3 + 1] - P[i0 * 3 + 1], P[i1 * 3 + 2] - P[i0 * 3 + 2]];
    const e2: V3 = [P[i2 * 3] - P[i0 * 3], P[i2 * 3 + 1] - P[i0 * 3 + 1], P[i2 * 3 + 2] - P[i0 * 3 + 2]];
    const c = cross(e1, e2);
    if (c[0] * want[0] + c[1] * want[1] + c[2] * want[2] < 0) b.quad(i0, i3, i2, i1);
    else b.quad(i0, i1, i2, i3);
  };
  // cells share their outline vertices (identical sample points), so shading is smooth across the lattice
  const shared = new Map<string, number>();
  const TAU_Q = Math.round(Math.PI * 2 * 1e4);
  const sharedV = (x: number, a: number, inset: number, inner: boolean): number => {
    const key = `${Math.round(x * 1e5)}:${((Math.round(a * 1e4) % TAU_Q) + TAU_Q) % TAU_Q}:${inner ? 1 : 0}`;
    let id = shared.get(key);
    if (id === undefined) {
      id = b.v(at(x, a, inset), woodCol(x, a, inner), NO_SWAY, [0, 0, 0], EX);
      shared.set(key, id);
    }
    return id;
  };
  for (let i = -rowsN; i <= rowsN; i++) {
    const xc = i * (dx / 2) + xOff;
    if (Math.abs(xc) - dx / 2 >= L / 2 - 1e-5) continue;
    for (let j = 0; j < nA; j++) {
      const ac = j * da + ((i & 1) !== 0 ? da / 2 : 0) + phase;
      // per-hole size and a small off-centre shift (the whole oval stays inside its diamond: p·√2 + |du| + |dv| < 1)
      const hp = 0.49 + 0.09 * n(xc * 40, j * 1.7, 3.1);
      const du = 0.05 * n(xc * 40 + 7, j * 1.7, 9.3);
      const dv = 0.05 * n(xc * 40 + 13, j * 1.7, 4.7);
      const map = (u: number, v: number): [number, number] => {
        const x = Math.max(-L / 2, Math.min(L / 2, xc + u * (dx / 2)));
        return [x, ac + v * (da / 2) + spiral * x];
      };
      const O: number[] = [];
      const H: number[] = [];
      const Oi: number[] = [];
      const Hi: number[] = [];
      for (const [cu, cv] of dirs) {
        const t = 1 / (Math.abs(cu) + Math.abs(cv));
        const [xo, ao] = map(cu * t, cv * t);
        const [xh, ah] = map(du + cu * hp, dv + cv * hp);
        O.push(sharedV(xo, ao, 0, false));
        H.push(b.v(at(xh, ah, 0), mul(woodCol(xh, ah, false), 0.9), NO_SWAY, [0, 0, 0], EX));
        if (thick) {
          Oi.push(sharedV(xo, ao, T, true));
          Hi.push(b.v(at(xh, ah, T), woodCol(xh, ah, true), NO_SWAY, [0, 0, 0], EX));
        }
      }
      const [xm, am] = map(du, dv);
      const out3: V3 = [0, Math.sin(am), Math.cos(am)];
      const hc = at(xm, am, thick ? T / 2 : 0);
      for (let k = 0; k < K; k++) {
        const k1 = (k + 1) % K;
        quadTo(O[k], O[k1], H[k1], H[k], out3);
        if (!thick) continue;
        quadTo(Oi[k], Oi[k1], Hi[k1], Hi[k], [-out3[0], -out3[1], -out3[2]]);
        // hole wall faces into the hole
        const P = b.pos;
        const into: V3 = [hc[0] - P[H[k] * 3], hc[1] - P[H[k] * 3 + 1], hc[2] - P[H[k] * 3 + 2]];
        quadTo(H[k], H[k1], Hi[k1], Hi[k], into);
      }
    }
  }
  if (thick) {
    // end rings: the cut ends show the wall thickness
    const segs = 36;
    for (const x of [-L / 2, L / 2]) {
      const ring: number[] = [];
      const ringIn: number[] = [];
      for (let k = 0; k <= segs; k++) {
        const a = (k / segs) * Math.PI * 2;
        ring.push(b.v(at(x, a, 0), mul(woodCol(x, a, false), 0.85), NO_SWAY, [0, 0, 0], EX));
        ringIn.push(b.v(at(x, a, T), mul(woodCol(x, a, true), 0.95), NO_SWAY, [0, 0, 0], EX));
      }
      for (let k = 0; k < segs; k++) quadTo(ring[k], ring[k + 1], ringIn[k + 1], ringIn[k], [Math.sign(x), 0, 0]);
    }
  }
  void rotAxis;
  void anyPerp;
}

export function genWood(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  switch (def.visual) {
    case 'wood_spider':
      genSpider(out, def, seed, lod, 'wood_spider');
      break;
    case 'wood_manzanita':
      genSpider(out, def, seed, lod, 'wood_manzanita');
      break;
    case 'wood_mopani':
      genMopani(out, def, seed, lod);
      break;
    case 'wood_cholla':
      genCholla(out, def, seed, lod);
      break;
  }
}
