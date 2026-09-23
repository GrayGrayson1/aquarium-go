/**
 * Geometry for the stylised facility visitors: soft rounded bodies authored for a 1.7 m adult (metres, +z forward),
 * a head with a simple friendly face (eyes, brows, nose, smile, blush, ears), hair styles grown as shells over the
 * skull with real hairlines, clothes layers (open jacket, skirt), shoes, bags and glasses.
 *
 * Parts that move rigidly together are merged into one instanced mesh. Each vertex carries a baked shade (`color`,
 * multiplied with the colour it picks) and `aPart` = (colour slot, visibility flag): slot 0 is the instance colour,
 * slots 1–3 are extra per-instance colours, and a flag ≥ 0 hides the part per instance (see visitorMaterial.ts).
 * So a whole crowd renders in about a dozen draws. OWNER: lane "facility".
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { lathe } from './kit';

type RGB = [number, number, number];
/** [geometry, shade, colour slot = 0, visibility flag = -1 (always)] */
type Part = [THREE.BufferGeometry, RGB, number?, number?];

/** Merge parts into one indexed geometry with baked shade (`color`) and `aPart` (slot, flag) attributes. */
export function mergeParts(parts: Part[]): THREE.BufferGeometry {
  let nv = 0;
  let ni = 0;
  for (const [g] of parts) {
    const n = g.getAttribute('position').count;
    nv += n;
    ni += g.index ? g.index.count : n;
  }
  const pos = new Float32Array(nv * 3);
  const nrm = new Float32Array(nv * 3);
  const col = new Float32Array(nv * 3);
  const part = new Float32Array(nv * 2);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0;
  let io = 0;
  for (const [g, c, slot = 0, flag = -1] of parts) {
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const n = g.getAttribute('normal') as THREE.BufferAttribute;
    const shade = g.getAttribute('color') as THREE.BufferAttribute | undefined;
    for (let i = 0; i < p.count; i++) {
      pos[(vo + i) * 3] = p.getX(i);
      pos[(vo + i) * 3 + 1] = p.getY(i);
      pos[(vo + i) * 3 + 2] = p.getZ(i);
      nrm[(vo + i) * 3] = n.getX(i);
      nrm[(vo + i) * 3 + 1] = n.getY(i);
      nrm[(vo + i) * 3 + 2] = n.getZ(i);
      col[(vo + i) * 3] = c[0] * (shade ? shade.getX(i) : 1);
      col[(vo + i) * 3 + 1] = c[1] * (shade ? shade.getY(i) : 1);
      col[(vo + i) * 3 + 2] = c[2] * (shade ? shade.getZ(i) : 1);
      part[(vo + i) * 2] = slot;
      part[(vo + i) * 2 + 1] = flag;
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.getX(i) + vo;
    else for (let i = 0; i < p.count; i++) idx[io++] = i + vo;
    vo += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('aPart', new THREE.BufferAttribute(part, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

const W: RGB = [1, 1, 1];

/** Tapered limb hanging down −y from the joint at the origin, with rounded ends. */
function limb(len: number, r0: number, r1: number, seg = 10): THREE.BufferGeometry {
  return lathe(
    [
      [0.001, -len - r1 * 0.9],
      [r1 * 0.75, -len - r1 * 0.6],
      [r1, -len],
      [(r0 + r1) / 2 + 0.003, -len * 0.45],
      [r0, -r0 * 0.3],
      [r0 * 0.7, r0 * 0.5],
      [0.001, r0 * 0.75],
    ],
    seg,
  );
}

function at(g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: [number, number, number] = [1, 1, 1]): THREE.BufferGeometry {
  g.scale(s[0], s[1], s[2]);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

// ───────────────────────────── head + face ─────────────────────────────

/** Skull radius and the (x, y, z) squash applied to skull AND hair shells (they must match). */
export const HEAD_R = 0.112;
const HEAD_S: [number, number, number] = [0.93, 1, 0.96];

function head(): THREE.BufferGeometry {
  const skull = new THREE.SphereGeometry(HEAD_R, 28, 20);
  skull.scale(...HEAD_S);
  const ears = [-1, 1].map((s) => at(new THREE.SphereGeometry(0.024, 8, 6), s * 0.101, -0.006, -0.004, 0, 0, 0, [0.4, 1, 0.75]));
  const nose = at(new THREE.SphereGeometry(0.0165, 8, 6), 0, -0.016, 0.1025, 0, 0, 0, [0.85, 0.9, 1]);
  // eyes and smile use slot 2 (a fixed dark ink) and the eye glints slot 3 (white), so faces read on every skin tone
  const eyes = [-1, 1].map((s) => at(new THREE.SphereGeometry(0.0122, 8, 6), s * 0.037, 0.008, 0.0985, 0, 0, 0, [0.8, 1.15, 0.5]));
  const glints = [-1, 1].map((s) => at(new THREE.SphereGeometry(0.0036, 5, 4), s * 0.037 + 0.004, 0.0135, 0.1036, 0, 0, 0, [1, 1, 0.45]));
  const smile = new THREE.TorusGeometry(0.0155, 0.0034, 4, 10, Math.PI);
  smile.rotateZ(Math.PI);
  smile.scale(1, 0.5, 0.6);
  smile.translate(0, -0.041, 0.1003);
  const blush = [-1, 1].map((s) => at(new THREE.SphereGeometry(0.017, 8, 5), s * 0.06, -0.024, 0.0835, 0, s * 0.55, 0, [1, 0.72, 0.25]));
  const neck = new THREE.CylinderGeometry(0.041, 0.048, 0.13, 10, 1, true);
  neck.translate(0, -0.115, -0.006);
  // round glasses: slot 1 (frame colour), flag 0 (only for visitors who wear them)
  const lens = [-1, 1].map((s) => at(new THREE.TorusGeometry(0.021, 0.0036, 4, 14), s * 0.037, 0.008, 0.108));
  const bridge = at(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 4), 0, 0.012, 0.109, 0, 0, Math.PI / 2);
  return mergeParts([
    [skull, W],
    ...ears.map((e): Part => [e, [0.93, 0.84, 0.82]]),
    [nose, [0.96, 0.86, 0.83]],
    ...eyes.map((e): Part => [e, W, 2]),
    ...glints.map((e): Part => [e, W, 3]),
    [smile, [3.2, 1.5, 1.4], 2],
    ...blush.map((e): Part => [e, [1.0, 0.8, 0.78]]),
    [neck, [0.88, 0.8, 0.78]],
    ...lens.map((l): Part => [l, W, 1, 0]),
    [bridge, W, 1, 0],
  ]);
}

// ───────────────────────────── hair ─────────────────────────────

interface HairSpec {
  /** Hairline height (unit-sphere y) at the front, the sides (over the ears) and the back (nape). */
  front: number;
  side: number;
  back: number;
  /** Shell thickness (m). */
  thick: number;
  /** Extra thickness (m) as a function of the unit direction (volume, fringe, curls...). */
  volume?: (x: number, y: number, z: number, az: number) => number;
  /** Extra coverage (e.g. a beard): returns > 0 where hair also grows (same units as the hairline test). */
  extra?: (x: number, y: number, z: number, az: number) => number;
  extraThick?: number;
  /** Where (0 face … 0.5 ears) the hairline reaches its side height; long styles keep the face clear to the ears. */
  faceEdge: number;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Hair grown over the skull: a sphere whose surface rises smoothly out of the skin where hair grows and sinks just
 * inside it elsewhere, so the depth test draws a clean, smooth per-pixel hairline where the shell crosses the skin
 * (no helmet rim, no stair-steps).
 */
function hairShell(spec: HairSpec): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 44, 30);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const band = 0.16;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const az = Math.atan2(x, z); // 0 = face, ±π = back of the head
    const a = Math.abs(az) / Math.PI;
    // forehead → temples/sideburns (level over the ears) → down behind the ears to the nape
    const line = a < spec.faceEdge ? spec.front + (spec.side - spec.front) * smooth(0.5, 1, a / spec.faceEdge) : spec.side + (spec.back - spec.side) * smooth(0.5, 0.82, a);
    let s = (y - line) / band;
    let th = spec.thick + (spec.volume?.(x, y, z, az) ?? 0);
    if (spec.extra) {
      const e = spec.extra(x, y, z, az) * (0.09 / band);
      if (e > s) {
        s = e;
        th = spec.extraThick ?? spec.thick;
      }
    }
    s = Math.max(-1, Math.min(1, s));
    // continuous profile through the skin: the crossing (s = 0) interpolates smoothly across the triangles
    const r = s >= 0 ? HEAD_R + th * Math.min(1, s / 0.4) : HEAD_R + 0.02 * s;
    pos.setXYZ(i, x * r, y * r, z * r);
    // soft self-shading: roots and the underside a little darker, crown catches the light
    const shade = 0.76 + 0.24 * smooth(-0.6, 0.9, y);
    col[i * 3] = shade;
    col[i * 3 + 1] = shade;
    col[i * 3 + 2] = shade;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.scale(...HEAD_S);
  g.computeVertexNormals();
  return g;
}

function brows(): Part[] {
  return [-1, 1].map((s): Part => {
    const b = new THREE.CapsuleGeometry(0.0045, 0.019, 2, 5);
    b.rotateZ(Math.PI / 2 + s * 0.16);
    b.scale(1, 1, 0.55);
    b.rotateY(s * 0.45);
    b.translate(s * 0.037, 0.041, 0.0938);
    return [b, [0.85, 0.85, 0.85]];
  });
}

/** Hair styles (index = VisitorLook.hairStyle). */
export const HAIR_STYLES = ['crop', 'sidePart', 'long', 'bun', 'curly', 'buzzBeard', 'ponytail'] as const;

function hairStyles(): THREE.BufferGeometry[] {
  const crop = hairShell({ front: 0.56, side: 0.16, back: -0.75, faceEdge: 0.45, thick: 0.011, volume: (_x, y) => 0.007 * Math.max(0, y) });
  const sidePart = hairShell({
    front: 0.48,
    side: 0.12,
    back: -0.78,
    faceEdge: 0.45,
    thick: 0.013,
    // a soft swoop of fringe lifting off one side of the parting
    volume: (x, y, z) => 0.017 * Math.exp(-((x - 0.3) ** 2) / 0.12 - ((y - 0.62) ** 2) / 0.06) * smooth(-0.2, 0.4, z) + 0.007 * Math.max(0, y),
  });
  // long hair: clear of the face out to the ears, then falling outward past the jaw to the shoulders (a soft bob
  // silhouette rather than a hood)
  const longShell = hairShell({
    front: 0.5,
    side: -0.75,
    back: -1.1,
    faceEdge: 0.36,
    thick: 0.013,
    volume: (_x, y, z) => 0.008 * Math.max(0, y) + 0.024 * smooth(0.25, -0.75, y) * smooth(0.55, 0.1, z),
  });
  const drape = new THREE.CapsuleGeometry(0.085, 0.13, 3, 12);
  drape.scale(1.32, 1, 0.5);
  drape.translate(0, -0.14, -0.085);
  const locks = [-1, 1].map((s) => at(new THREE.CapsuleGeometry(0.034, 0.09, 3, 8), s * 0.1, -0.13, -0.035, 0.1, 0, -s * 0.12, [1, 1, 0.85]));
  const long = mergeParts([[longShell, W], [drape, [0.8, 0.8, 0.8]], ...locks.map((l): Part => [l, [0.88, 0.88, 0.88]]), ...brows()]);
  const bunShell = hairShell({ front: 0.5, side: 0.05, back: -0.8, faceEdge: 0.45, thick: 0.011 });
  const bun = at(new THREE.SphereGeometry(0.048, 12, 9), 0, 0.088, -0.078);
  const bunStyle = mergeParts([[bunShell, W], [bun, [1.05, 1.05, 1.05]], ...brows()]);
  const curly = hairShell({
    front: 0.42,
    side: -0.1,
    back: -0.98,
    faceEdge: 0.42,
    thick: 0.03,
    volume: (x, y, z) => 0.011 * (Math.sin(x * 11) * Math.sin(y * 12 + 1.3) * Math.sin(z * 11 + 2.1)) + 0.012 * Math.max(0, y),
  });
  const buzz = hairShell({
    front: 0.6,
    side: 0.2,
    back: -0.72,
    faceEdge: 0.45,
    thick: 0.0045,
    // a trimmed beard along the jaw, joined to the hair by short sideburns (the smile stays visible)
    extra: (_x, y, z, az) => {
      const aa = Math.abs(az);
      const jaw = z > -0.3 ? (-0.48 - y) / 0.09 : -1;
      const burns = Math.min((aa - 1.15) / 0.06, (1.5 - aa) / 0.06, (0.35 - y) / 0.09);
      return Math.max(jaw, burns);
    },
    extraThick: 0.012,
  });
  const ponyShell = hairShell({ front: 0.5, side: 0.06, back: -0.8, faceEdge: 0.45, thick: 0.011 });
  const tie = at(new THREE.SphereGeometry(0.022, 8, 6), 0, 0.03, -0.113);
  const tail = at(new THREE.CapsuleGeometry(0.03, 0.12, 3, 9), 0, -0.05, -0.135, 0.2, 0, 0, [1, 1, 0.85]);
  const pony = mergeParts([[ponyShell, W], [tie, [0.6, 0.6, 0.6]], [tail, [0.95, 0.95, 0.95]], ...brows()]);
  return [
    mergeParts([[crop, W], ...brows()]),
    mergeParts([[sidePart, W], ...brows()]),
    long,
    bunStyle,
    mergeParts([[curly, W], ...brows()]),
    mergeParts([[buzz, W], ...brows()]),
    pony,
  ];
}

// ───────────────────────────── body + clothes ─────────────────────────────

/** Joint positions on the 1.7 m reference body. */
export const BODY = { hipY: 0.88, shoulderY: 1.385, shoulderX: 0.168, hipX: 0.088, headY: 1.605, thigh: 0.42, shin: 0.405, upperArm: 0.28, foreArm: 0.262 };

/** Shirt: a soft hem that sits over the trousers' waist, a gentle waist, chest and rounded shoulders. */
const TORSO_PROFILE: [number, number][] = [
  [0.001, 0.885],
  [0.157, 0.885],
  [0.161, 0.9],
  [0.151, 0.95],
  [0.137, 1.02],
  [0.139, 1.12],
  [0.158, 1.25],
  [0.17, 1.34],
  [0.165, 1.405],
  [0.13, 1.46],
  [0.074, 1.496],
  [0.046, 1.513],
  [0.001, 1.518],
];

/** Body flags (iFlags components). */
export const BODY_FLAG = { skirt: 0, jacket: 1, backpack: 2, satchel: 3 } as const;

function body(): THREE.BufferGeometry {
  const torso = lathe(TORSO_PROFILE, 18);
  // flattened chest, rounder hem so the trousers' seat and thigh tops stay tucked under the shirt
  const tp = torso.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < tp.count; i++) tp.setZ(i, tp.getZ(i) * (0.64 + 0.15 * smooth(1.02, 0.885, tp.getY(i))));
  torso.computeVertexNormals();
  // soft collar ring so the neckline reads as a garment
  const collar = new THREE.TorusGeometry(0.056, 0.011, 5, 16);
  collar.rotateX(Math.PI / 2);
  collar.scale(1, 1, 0.8);
  collar.translate(0, 1.5, 0.004);
  // trousers' seat, tucked under the shirt hem
  const pelvis = new THREE.CapsuleGeometry(0.1, 0.08, 3, 12);
  pelvis.rotateZ(Math.PI / 2);
  pelvis.scale(1.08, 1, 0.8);
  pelvis.translate(0, 0.86, 0);
  const skirt = lathe(
    [
      [0.21, 0.58],
      [0.222, 0.585],
      [0.215, 0.62],
      [0.178, 0.8],
      [0.15, 0.92],
      [0.14, 0.96],
    ],
    18,
  );
  skirt.scale(1, 1, 0.8);
  // open-front jacket: a slightly larger shell with a gap at the front and folded lapels
  const jp = TORSO_PROFILE.slice(1, -2).map(([r, y]) => new THREE.Vector2(r * 1.07 + 0.005, y + 0.015));
  const jacket = new THREE.LatheGeometry(jp, 20, 0.46, Math.PI * 2 - 0.92);
  jacket.scale(1, 1, 0.66);
  const lapels = [-1, 1].map((s) => at(new RoundedBoxGeometry(0.05, 0.16, 0.012, 1, 0.005), s * 0.062, 1.39, 0.098, -0.15, 0, s * 0.35));
  // backpack: rounded pack, front pocket, top loop and straps curving over the shoulders
  const pack = at(new RoundedBoxGeometry(0.25, 0.31, 0.12, 2, 0.045), 0, 1.21, -0.16);
  const pocket = at(new RoundedBoxGeometry(0.18, 0.12, 0.045, 2, 0.018), 0, 1.12, -0.23);
  const loop = at(new THREE.TorusGeometry(0.024, 0.006, 4, 8, Math.PI), 0, 1.365, -0.16);
  const straps: Part[] = [];
  for (const s of [-1, 1]) {
    const arc = new THREE.TorusGeometry(1, 0.08, 4, 14, Math.PI);
    arc.rotateY(Math.PI / 2);
    arc.scale(0.26, 0.125, 0.1);
    arc.translate(s * 0.085, 1.375, 0);
    straps.push([arc, [0.8, 0.8, 0.8], 3, BODY_FLAG.backpack]);
    straps.push([at(new RoundedBoxGeometry(0.036, 0.2, 0.012, 1, 0.004), s * 0.08, 1.285, 0.093, -0.1, 0, s * 0.05), [0.8, 0.8, 0.8], 3, BODY_FLAG.backpack]);
  }
  // shoulder bag: soft satchel at the back of the left hip; the strap runs from it across chest and back and curves
  // over the opposite shoulder
  const satchel = at(new RoundedBoxGeometry(0.24, 0.2, 0.075, 2, 0.028), -0.17, 0.95, -0.12, 0, 0.5, 0);
  const flap = at(new RoundedBoxGeometry(0.24, 0.1, 0.012, 1, 0.005), -0.15, 1.0, -0.087, -0.1, 0.5, 0);
  const strapF = at(new RoundedBoxGeometry(0.028, 0.46, 0.01, 1, 0.004), -0.02, 1.2, 0.097, -0.05, 0, -0.54);
  const strapB = at(new RoundedBoxGeometry(0.028, 0.46, 0.01, 1, 0.004), -0.02, 1.2, -0.097, 0.05, 0, -0.54);
  const over = new THREE.TorusGeometry(1, 0.1, 4, 14, Math.PI);
  over.rotateY(Math.PI / 2);
  over.scale(0.28, 0.12, 0.098);
  over.translate(0.1, 1.37, 0);
  return mergeParts([
    [torso, W, 0],
    [collar, [0.9, 0.9, 0.9], 0],
    [pelvis, W, 1],
    [skirt, W, 1, BODY_FLAG.skirt],
    [jacket, W, 2, BODY_FLAG.jacket],
    ...lapels.map((l): Part => [l, [0.9, 0.9, 0.9], 2, BODY_FLAG.jacket]),
    [pack, W, 3, BODY_FLAG.backpack],
    [pocket, [0.82, 0.82, 0.82], 3, BODY_FLAG.backpack],
    [loop, [0.6, 0.6, 0.6], 3, BODY_FLAG.backpack],
    ...straps,
    [satchel, W, 3, BODY_FLAG.satchel],
    [flap, [0.85, 0.85, 0.85], 3, BODY_FLAG.satchel],
    [strapF, [0.7, 0.7, 0.7], 3, BODY_FLAG.satchel],
    [strapB, [0.7, 0.7, 0.7], 3, BODY_FLAG.satchel],
    [over, [0.7, 0.7, 0.7], 3, BODY_FLAG.satchel],
  ]);
}

export function buildVisitorGeometries() {
  // shin + shoe (slot 1 = shoe colour); the foot is rigid with the shin
  const shoe = new THREE.CapsuleGeometry(0.036, 0.08, 3, 9);
  shoe.rotateX(Math.PI / 2);
  shoe.scale(1.05, 0.82, 1);
  shoe.translate(0, -BODY.shin - 0.024, 0.03);
  const sole = at(new RoundedBoxGeometry(0.074, 0.014, 0.152, 1, 0.006), 0, -BODY.shin - 0.05, 0.03);
  const shinShoe = mergeParts([
    [limb(BODY.shin, 0.055, 0.04), W, 0],
    [shoe, W, 1],
    [sole, [0.55, 0.55, 0.55], 1],
  ]);
  // forearm + hand (slot 1 = skin)
  const hand = new THREE.SphereGeometry(0.038, 9, 7);
  hand.scale(0.85, 1.22, 0.72);
  hand.translate(0, -BODY.foreArm - 0.03, 0.004);
  const thumb = at(new THREE.CapsuleGeometry(0.011, 0.028, 2, 5), 0, -BODY.foreArm - 0.02, 0.028, 0.5, 0, 0);
  const foreArmHand = mergeParts([
    [limb(BODY.foreArm, 0.037, 0.03), W, 0],
    [hand, W, 1],
    [thumb, W, 1],
  ]);
  return {
    body: body(),
    thigh: mergeParts([[limb(BODY.thigh, 0.071, 0.055), W]]),
    shinShoe,
    upperArm: mergeParts([[limb(BODY.upperArm, 0.044, 0.038), W]]),
    foreArmHand,
    head: head(),
    hair: hairStyles(),
  };
}

export type VisitorGeometries = ReturnType<typeof buildVisitorGeometries>;
