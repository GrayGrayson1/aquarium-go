/**
 * Snails — mystery/apple snail (Pomacea diffusa), nerite (Neritina natalensis) and trochus (Trochus sp.).
 *
 * Shells are true logarithmic helicospirals: an elliptical generating curve swept around the coiling axis with
 * exponential growth (per-species whorl expansion, spire height and aperture shape), shaded with growth lines,
 * spiral bands, nerite zebra zigzags or trochus oblique stripes, and a glossy periostracum. The soft body is a
 * muscular foot (flat sole with travelling pedal waves), a head with cephalic tentacles, eye spots, labial tentacles
 * and — for the apple snail — a breathing siphon. Retracts into the shell (sealed by the operculum) on startle.
 *
 * Local space: head +X, the sole of the foot is the contact plane at y = -groundOffset (works on glass in any
 * orientation — the AI rotates root so local −Y faces the surface). Length 1 = extended foot length.
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { CreatureFactory, CreatureObject } from '../types';
import type { CreatureRuntime } from '@/types';
import type { RenderLod } from '../../lod';
import { GeoBuilder, ellipsoid, resamplePath, skin1, tube, type V3 } from './common/geo';
import { RigDef, instantiateRig, makeSkinned, setRot } from './common/rig';
import { acquire, release } from './common/cache';
import { critterTiers } from './common/tiers';
import { createCritterMaterial, createCritterUniforms } from './common/materials';
import { applyAppearance, color } from './common/palette';
import { clamp, damp, lerp, noise1, smoothstep, smoothTable, TAU } from './common/math';

export interface SnailSpec {
  id: string;
  /** 0 apple, 1 nerite, 2 trochus */
  kind: number;
  /** Whorl expansion per revolution. */
  W: number;
  whorls: number;
  /** Axial descent per unit radius (spire height). */
  spire: number;
  /** Aperture semi-axes (radial, axial) as a fraction of the final whorl radius. */
  apA: number;
  apB: number;
  /** Final whorl radius (local units). */
  size: number;
  tentacle: number;
  siphon: boolean;
  /** World direction the apex points to (before normalisation). */
  apex: V3;
  /** World direction the aperture opens toward. */
  opening: V3;
  /** Where the aperture centre sits (local space). */
  apCenter: V3;
  /** Optional squash of the finished shell (local axes) about the aperture centre. */
  squash?: V3;
  /** Foot width/height multiplier. */
  foot?: number;
  /** x of the foot's tail tip (the head end is fixed at x = 0.44). Real snails carry the shell over most of the
   * foot: the sole shows a little behind the shell and the head in front, never a long slug-like tail. */
  footTail?: number;
  /** Close the umbilicus: the inner (columellar) side of each whorl reaches the coiling axis, so the base reads as
   * a solid callus / deck instead of an open ramshorn spiral (nerites). */
  closedBase?: boolean;
  /** Placement override: centre the finished shell at x = place[0], z = place[2] and rest its lowest point at
   * y = place[1] (the aperture follows). Without it the aperture centre is pinned at `apCenter`. */
  place?: V3;
  /** Nerite-style shell: a smooth low dome (length, width, height) whose sunken spire sits at the rear; the body
   * whorl's growth lines fan out from the apex. Replaces the helicospiral when set. */
  dome?: { len: number; wid: number; height: number; apexBack: number };
}

export const SNAIL_SPECS: Record<string, SnailSpec> = {
  // apple snail: big globose body whorl, short stepped spire raised above it; the foot is about as long as the shell
  mystery_snail: { id: 'mystery_snail', kind: 0, W: 2.9, whorls: 4.2, spire: 1.55, apA: 0.8, apB: 0.84, size: 0.225, tentacle: 0.4, siphon: true, apex: [-0.62, 0.74, 0.22], opening: [0.3, -0.92, -0.2], apCenter: [0.05, -0.04, -0.01], footTail: -0.34, place: [-0.03, -0.155, 0.03] },
  // nerite: a low, smooth, rounded dome — rapidly expanding whorls, sunken spire at the rear, closed flat base
  nerite_snail: { id: 'nerite_snail', kind: 1, W: 9, whorls: 2.2, spire: 0.28, apA: 0.78, apB: 0.95, size: 0.25, tentacle: 0.2, siphon: false, apex: [-1, 0.32, 0.18], opening: [0.05, -1, -0.05], apCenter: [0.02, -0.1, 0.0], foot: 0.85, footTail: -0.26, place: [-0.03, -0.165, 0.0], dome: { len: 0.6, wid: 0.48, height: 0.22, apexBack: 0.68 } },
  trochus_snail: { id: 'trochus_snail', kind: 2, W: 1.72, whorls: 6.2, spire: 1.85, apA: 0.66, apB: 0.72, size: 0.2, tentacle: 0.24, siphon: false, apex: [-0.16, 1, -0.05], opening: [1, 0, 0.15], apCenter: [0.08, -0.06, 0.03], footTail: -0.3, place: [-0.02, -0.16, 0.0] },
};

const GROUND = 0.2;

interface SnailTemplate {
  geo: THREE.BufferGeometry;
  rig: RigDef;
  aperture: THREE.Vector3;
  shellPivot: THREE.Vector3;
}

interface ShellFrame {
  k: number;
  thMax: number;
  r0: number;
  q: THREE.Quaternion;
  center: THREE.Vector3;
  sqC: THREE.Vector3;
  sqV: THREE.Vector3;
  /** Post-placement translation (local space). */
  shift: THREE.Vector3;
}

function shellFrame(spec: SnailSpec): ShellFrame {
  // coiling axis = local +Z of the shell frame (apex at +Z)
  const k = Math.log(spec.W) / TAU;
  const thMax = spec.whorls * TAU;
  const r0 = spec.size / Math.exp(k * thMax);
  // orient: shell +Z (apex) → spec.apex; coil tangent at the aperture → spec.opening; aperture centre → apCenter
  const A = new THREE.Vector3(...spec.apex).normalize();
  const D = new THREE.Vector3(...spec.opening);
  D.addScaledVector(A, -D.dot(A)).normalize();
  const ts = new THREE.Vector3(-Math.sin(thMax), Math.cos(thMax), 0);
  const zs = new THREE.Vector3(0, 0, 1);
  const mS = new THREE.Matrix4().makeBasis(ts, zs, new THREE.Vector3().crossVectors(ts, zs));
  const mW = new THREE.Matrix4().makeBasis(D, A, new THREE.Vector3().crossVectors(D, A));
  const q = new THREE.Quaternion().setFromRotationMatrix(mW.multiply(mS.transpose()));
  const rEndC = r0 * Math.exp(k * thMax);
  const apShell = new THREE.Vector3(rEndC * Math.cos(thMax), rEndC * Math.sin(thMax), -spec.spire * rEndC);
  const center = apShell.clone().applyQuaternion(q).sub(new THREE.Vector3(...spec.apCenter)).applyQuaternion(q.clone().invert());
  const f: ShellFrame = { k, thMax, r0, q, center, sqC: new THREE.Vector3(...spec.apCenter), sqV: new THREE.Vector3(...(spec.squash ?? [1, 1, 1])), shift: new THREE.Vector3() };
  if (spec.place) {
    // centre the whole shell over the body (x/z) and rest its lowest point at the given height
    const box = new THREE.Box3();
    const p = new THREE.Vector3();
    for (let i = 0; i <= 48; i++) for (let j = 0; j < 24; j++) box.expandByPoint(shellPoint(spec, f, (i / 48) * thMax, (j / 24) * TAU, p));
    f.shift.set(spec.place[0] - (box.min.x + box.max.x) / 2, spec.place[1] - box.min.y, spec.place[2] - (box.min.z + box.max.z) / 2);
  }
  return f;
}

/** A point on the shell surface at coil angle `th` and section angle `phi` (0 = outward, π/2 = toward the apex). */
function shellPoint(spec: SnailSpec, f: ShellFrame, th: number, phi: number, out: THREE.Vector3): THREE.Vector3 {
  const r = f.r0 * Math.exp(f.k * th);
  const zc = -spec.spire * r;
  const a = spec.apA * r;
  const b = spec.apB * r;
  let cphi = Math.cos(phi);
  let sphi = Math.sin(phi);
  if (spec.kind === 2) {
    // trochus: angular whorl profile, flat base
    const pr = 1 / Math.max(Math.abs(cphi) ** 3 + Math.abs(sphi) ** 3, 1e-6) ** (1 / 3);
    cphi *= pr * 0.92;
    sphi = sphi < 0 ? sphi * pr * 0.72 : sphi * pr;
  }
  // closed base: stretch the inner (axis-facing) half of the section so it meets the coiling axis
  const aIn = spec.closedBase && cphi < 0 ? Math.max(a, r * 1.02) : a;
  const rr = r + aIn * cphi;
  out.set(rr * Math.cos(th), rr * Math.sin(th), zc + b * sphi).sub(f.center);
  // growth-line ribs
  const rib = spec.kind === 2 ? 0.012 * Math.max(0, Math.cos(phi - 0.4)) * Math.pow(Math.abs(Math.sin(th * 5)), 8) * r : 0;
  out.multiplyScalar(1 + rib);
  out.applyQuaternion(f.q);
  if (spec.squash) out.sub(f.sqC).multiply(f.sqV).add(f.sqC);
  return out.add(f.shift);
}

/**
 * Add a logarithmic-helicospiral shell to `g`, skinned to `bone`. Returns the aperture centre (local space),
 * final whorl radius, total coil angle, the shell orientation and its bounds. Reused by the hermit crab.
 */
export function addShell(
  g: GeoBuilder,
  spec: SnailSpec,
  lod: RenderLod,
  shellB: number,
  mask0 = 0,
): { aperture: THREE.Vector3; rEnd: number; thMax: number; q: THREE.Quaternion; box: THREE.Box3; apNormal: THREE.Vector3 } {
  if (spec.dome) return addDomeShell(g, spec, lod, shellB, mask0);
  const f = shellFrame(spec);
  const { thMax, q } = f;
  const nu = lod === 0 ? Math.round(spec.whorls * 70) : lod === 1 ? Math.round(spec.whorls * 34) : Math.round(spec.whorls * 14);
  const nv = lod === 0 ? 40 : lod === 1 ? 22 : 10;
  const tmp = new THREE.Vector3();
  const box = new THREE.Box3();
  g.grid({ nu, nv, wrapV: true, orient: 'ring', group: 0 }, (i, j, smp) => {
    const u = i / (nu - 1);
    const th = u * thMax;
    const phi = (j / nv) * TAU;
    shellPoint(spec, f, th, phi, tmp);
    box.expandByPoint(tmp);
    smp.x = tmp.x;
    smp.y = tmp.y;
    smp.z = tmp.z;
    smp.u = u;
    smp.v = j / nv;
    smp.mask = [mask0, th, phi, u];
    smp.skin = skin1(shellB);
  });
  // aperture centre (final whorl tube centre)
  const rEnd = f.r0 * Math.exp(f.k * thMax);
  const aperture = new THREE.Vector3(rEnd * Math.cos(thMax), rEnd * Math.sin(thMax), -spec.spire * rEnd).sub(f.center).applyQuaternion(q);
  if (spec.squash) aperture.sub(f.sqC).multiply(f.sqV).add(f.sqC);
  aperture.add(f.shift);
  const apNormal = new THREE.Vector3(-Math.sin(thMax), Math.cos(thMax), 0).applyQuaternion(q).normalize();
  return { aperture, rEnd, thMax, q, box, apNormal };
}

/**
 * Nerite shell: an elliptical dome (steep sides, flat D-shaped base) with the tiny, sunken spire at the rear.
 * Grid rows run from the apex (pole) to a slightly in-turned lip; columns run around the apex. The surface mask
 * carries the same (coil angle, section angle, growth) channels as the helicospiral so the shell shader's growth
 * lines and zebra zig-zags fan out from the apex exactly as on the real body whorl.
 */
function addDomeShell(g: GeoBuilder, spec: SnailSpec, lod: RenderLod, shellB: number, mask0: number) {
  const d = spec.dome!;
  const place = spec.place ?? [0, -0.16, 0];
  const Rx = d.len / 2;
  const Rz = d.wid / 2;
  const cx = place[0];
  const cz = place[2];
  const baseY = place[1];
  const ax = cx - Rx * d.apexBack;
  const az = cz + Rz * 0.12;
  const thMax = spec.whorls * TAU;
  const th0 = thMax - TAU;
  const nu = lod === 0 ? 34 : lod === 1 ? 18 : 9;
  const nv = lod === 0 ? 56 : lod === 1 ? 30 : 14;
  // dome height over the base ellipse; the apex gets a small raised whorl knob
  const heightAt = (x: number, z: number) => {
    const qx = (x - cx) / Rx;
    const qz = (z - cz) / Rz;
    const q = Math.max(0, 1 - qx * qx - qz * qz);
    const knob = Math.exp(-((x - ax) ** 2 + (z - az) ** 2) / (0.0016 + 0.02 * Rx * Rx)) * d.height * 0.08;
    return baseY + d.height * Math.pow(q, 0.5) + knob;
  };
  const box = new THREE.Box3();
  const tmp = new THREE.Vector3();
  g.grid({ nu, nv: nv + 1, wrapV: false, orient: 'flip', group: 0 }, (i, j, smp) => {
    const t = i / (nu - 2); // 0 apex → 1 rim; the last row is the in-turned lip
    const lip = i === nu - 1;
    // angle around the apex, starting (and seaming) at the rear suture
    const a = Math.PI + (j / nv) * TAU;
    const rimX = cx + Rx * Math.cos(a);
    const rimZ = cz + Rz * Math.sin(a);
    const s = lip ? 0.94 : Math.pow(Math.min(1, t), 0.9);
    const x = ax + (rimX - ax) * s;
    const z = az + (rimZ - az) * s;
    const y = lip ? baseY - 0.006 : t >= 1 ? baseY : heightAt(x, z);
    tmp.set(x, y, z);
    box.expandByPoint(tmp);
    smp.x = x;
    smp.y = y;
    smp.z = z;
    smp.u = Math.min(1, t);
    smp.v = j / nv;
    // coil angle: one revolution of the body whorl around the apex; section angle: apex → lip
    smp.mask = [mask0, th0 + (j / nv) * TAU, Math.min(1, t) * Math.PI, (th0 + (j / nv) * TAU) / thMax];
    smp.skin = skin1(shellB);
  });
  // the aperture opens under the front of the dome
  const aperture = new THREE.Vector3(cx + Rx * 0.35, baseY + d.height * 0.18, cz);
  const apNormal = new THREE.Vector3(0.35, -1, 0).normalize();
  return { aperture, rEnd: Math.min(Rx, Rz) * 0.7, thMax, q: new THREE.Quaternion(), box, apNormal };
}

/** Bounds of a shell as `addShell` would build it (cheap coarse sampling). */
export function shellBounds(spec: SnailSpec): THREE.Box3 {
  if (spec.dome) {
    const p = spec.place ?? [0, -0.16, 0];
    return new THREE.Box3(new THREE.Vector3(p[0] - spec.dome.len / 2, p[1], p[2] - spec.dome.wid / 2), new THREE.Vector3(p[0] + spec.dome.len / 2, p[1] + spec.dome.height * 1.08, p[2] + spec.dome.wid / 2));
  }
  const f = shellFrame(spec);
  const box = new THREE.Box3();
  const p = new THREE.Vector3();
  for (let i = 0; i <= 48; i++) for (let j = 0; j < 24; j++) box.expandByPoint(shellPoint(spec, f, (i / 48) * f.thMax, (j / 24) * TAU, p));
  return box;
}

function buildSnail(spec: SnailSpec, lod: RenderLod): SnailTemplate {
  const rig = new RigDef();
  rig.add('root', null, [0, -GROUND + 0.05, 0]);
  const sb = spec.place ? shellBounds(spec) : null;
  const shellPivot = sb
    ? new THREE.Vector3((sb.min.x + sb.max.x) / 2, sb.min.y + 0.06, (sb.min.z + sb.max.z) / 2)
    : new THREE.Vector3(...spec.apCenter).add(new THREE.Vector3(-0.05, 0.12, -0.02));
  rig.add('shell', 'root', [shellPivot.x, shellPivot.y, shellPivot.z]);
  rig.add('head', 'root', [0.2, -0.08, 0]);
  const rootB = rig.idx('root');
  const shellB = rig.idx('shell');
  const headB = rig.idx('head');
  const g = new GeoBuilder();

  const { aperture, rEnd, apNormal } = addShell(g, spec, lod, shellB);

  // operculum (horny door) sealing the aperture when retracted
  const opN = apNormal;
  const opQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), opN);
  ellipsoid(g, {
    center: [aperture.x + opN.x * 0.004, aperture.y + opN.y * 0.004, aperture.z + opN.z * 0.004],
    radii: [spec.apA * rEnd * 0.92, spec.apB * rEnd * 0.92, 0.006],
    quat: opQ,
    nu: lod === 0 ? 10 : 6,
    nv: lod === 0 ? 20 : 10,
    skin: skin1(shellB),
    mask: [4, 0, 0, 0],
    aux: [aperture.x, aperture.y, aperture.z, 1],
  });

  // soft body filling the aperture (head-foot mass), so the open whorl never reads as an empty hollow
  ellipsoid(g, {
    center: [aperture.x - opN.x * 0.05, aperture.y - opN.y * 0.05, aperture.z - opN.z * 0.05],
    radii: [spec.apA * rEnd * 0.68, spec.apB * rEnd * (spec.kind === 2 ? 0.55 : 0.68), 0.045],
    quat: opQ,
    nu: lod === 0 ? 8 : 5,
    nv: lod === 0 ? 16 : 8,
    skin: skin1(headB),
    mask: [2, 0, 0, 0],
    aux: [aperture.x, aperture.y, aperture.z, 1],
  });

  // ── foot: flat sole, domed top, rounded front, tapering tail
  const fnu = lod === 0 ? 60 : lod === 1 ? 30 : 14;
  const fnv = lod === 0 ? 32 : lod === 1 ? 18 : 10;
  // broad, low muscular foot with a wide rounded front edge (propodium) and a short tapering tail
  const footW: [number, number][] = [[0, 0.02], [0.14, 0.085], [0.38, 0.14], [0.62, 0.162], [0.84, 0.16], [0.95, 0.13], [1, 0.03]];
  const footH: [number, number][] = [[0, 0.018], [0.2, 0.05], [0.5, 0.078], [0.75, 0.086], [0.93, 0.066], [1, 0.02]];
  const x0 = spec.footTail ?? -0.48;
  const x1 = 0.44;
  g.grid({ nu: fnu, nv: fnv, wrapV: true, orient: 'ring', group: 0 }, (i, j, smp) => {
    const s = i / (fnu - 1);
    const phi = (j / fnv) * TAU; // 0 = top
    const fs = spec.foot ?? 1;
    const w = smoothTable(footW, s) * fs;
    const h = smoothTable(footH, s) * (0.6 + 0.4 * fs);
    const c = Math.cos(phi);
    const sn = Math.sin(phi);
    const sole = c < 0 ? 0.25 : 1; // flat sole
    const x = lerp(x0, x1, s);
    const y = -GROUND + 0.012 + (c >= 0 ? h * Math.pow(c, 0.8) : -0.012 * Math.pow(-c, 0.5)) * sole;
    const z = w * Math.sign(sn) * Math.pow(Math.abs(sn), 0.7);
    smp.x = x;
    smp.y = c >= 0 ? y : -GROUND + 0.012 * (1 - Math.pow(-c, 3));
    smp.z = z;
    smp.u = s;
    smp.v = j / fnv;
    smp.mask = [1, c < -0.3 ? 1 : 0, s, 0];
    smp.skin = skin1(s > 0.7 ? headB : rootB);
    smp.aux = [aperture.x, aperture.y, aperture.z, 1];
  });

  // ── neck/head column rising from the foot into the aperture
  const apDir = new THREE.Vector3(...spec.opening).normalize();
  const inside = aperture.clone().addScaledVector(apDir, -0.06);
  const neck = resamplePath(
    [
      [inside.x, inside.y, inside.z],
      [aperture.x, aperture.y, aperture.z],
      [Math.max(aperture.x + 0.08, 0.16), -0.09, aperture.z * 0.4],
      [0.3, -0.105, 0],
      [0.42, -0.13, 0],
    ],
    lod === 0 ? 24 : 10,
  );
  tube(g, {
    path: neck,
    nv: lod === 0 ? 20 : 10,
    radius: (t) => lerp(Math.min(spec.apA * rEnd * 0.6, 0.075), 0.05, smoothstep(0.1, 0.6, t)) * (1 - 0.35 * smoothstep(0.85, 1, t)),
    aspect: () => [0.8, 1],
    capEnd: 0.08,
    capRows: 4,
    up: new THREE.Vector3(0, 1, 0),
    skin: () => skin1(headB),
    mask: (t) => [2, t, 0, 0],
    aux: [aperture.x, aperture.y, aperture.z, 1],
  });

  // ── tentacles (cephalic, long) + labial (short) + eyes
  const headTip = new THREE.Vector3(0.43, -0.12, 0);
  for (const side of [1, -1]) {
    const base = headTip.clone().add(new THREE.Vector3(-0.03, 0.03, side * 0.035));
    const L = spec.tentacle;
    const dir = new THREE.Vector3(0.75, 0.28, side * 0.62).normalize();
    const pts: V3[] = [0, 0.33, 0.66, 1].map((t) => {
      const p = base.clone().addScaledVector(dir, L * t).add(new THREE.Vector3(0, -0.04 * t * t, side * 0.05 * t * t));
      return [p.x, p.y, p.z];
    });
    tube(g, {
      path: resamplePath(pts, lod === 0 ? 16 : 7),
      nv: lod === 0 ? 10 : 6,
      radius: (t) => lerp(0.02, 0.005, Math.pow(t, 0.8)),
      capEnd: 0.03,
      capRows: 3,
      skin: () => skin1(headB),
      mask: (t) => [3, t, side, 0],
      aux: [base.x, base.y, base.z, 1],
    });
    // eye spot on a short stalk at the tentacle base (outside)
    const eyeP = base.clone().add(new THREE.Vector3(-0.01, 0.018, side * 0.03));
    ellipsoid(g, {
      center: [eyeP.x, eyeP.y, eyeP.z],
      radii: [0.013, 0.013, 0.013],
      nu: lod === 0 ? 8 : 5,
      nv: lod === 0 ? 12 : 7,
      skin: skin1(headB),
      mask: [5, 0, 0, 0],
      aux: [aperture.x, aperture.y, aperture.z, 1],
    });
    if (spec.kind === 0 && lod < 2) {
      // labial tentacles
      const lb = headTip.clone().add(new THREE.Vector3(0.0, -0.02, side * 0.03));
      const ld = new THREE.Vector3(0.8, -0.2, side * 0.55).normalize();
      tube(g, {
        path: resamplePath([[lb.x, lb.y, lb.z], [lb.x + ld.x * 0.06, lb.y + ld.y * 0.06, lb.z + ld.z * 0.06], [lb.x + ld.x * 0.12, lb.y + ld.y * 0.12 - 0.01, lb.z + ld.z * 0.12]], 6),
        nv: 8,
        radius: (t) => lerp(0.016, 0.006, t),
        capEnd: 0.05,
        capRows: 3,
        skin: () => skin1(headB),
        mask: (t) => [3, t * 0.5, side, 1],
        aux: [lb.x, lb.y, lb.z, 1],
      });
    }
  }
  // siphon (apple snail): folded along the left side, extends up to breathe
  if (spec.siphon) {
    const sb = new THREE.Vector3(aperture.x + 0.04, -0.07, -0.07);
    const pts: V3[] = [
      [sb.x, sb.y, sb.z],
      [sb.x + 0.05, sb.y - 0.005, sb.z - 0.035],
      [sb.x + 0.1, sb.y - 0.005, sb.z - 0.05],
    ];
    tube(g, {
      path: resamplePath(pts, lod === 0 ? 12 : 6),
      nv: lod === 0 ? 12 : 7,
      radius: (t) => lerp(0.028, 0.02, t),
      capEnd: 0.05,
      capRows: 3,
      skin: () => skin1(shellB),
      mask: (t) => [6, t, 0, 0],
      aux: [sb.x, sb.y, sb.z, 1],
    });
  }
  return { geo: g.build(), rig, aperture, shellPivot };
}

// ───────────────────────────── Shaders ─────────────────────────────

const SNAIL_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  float part = m.x;
  float t = uAgcTime;
  float retract = uAgcV0.x;
  if (part > 0.5 && part < 3.5 || part > 4.5) {
    // soft body retracts into the aperture
    vec3 ap = uAgcV1.xyz;
    if (part > 2.5 && part < 3.5) {
      // tentacles: slow exploratory sway + curl, tip taps
      float q = m.y; float side = m.z;
      float sw = sin(t * 1.3 + side * 1.7) * 0.5 + sin(t * 0.47 + side) * 0.5;
      vec3 d = p - aAux.xyz;
      d = agcRotY(d, side * sw * 0.35 * q);
      d = agcRotZ(d, (sin(t * 0.9 + side * 2.3) * 0.25 - 0.1) * q);
      p = aAux.xyz + d;
    }
    if (part > 5.5) {
      // siphon: extend upward when breathing at the surface
      float ext = uAgcV0.z;
      vec3 d = p - aAux.xyz;
      d = agcRotZ(d, ext * 1.2 * m.y);
      d *= 1.0 + ext * 1.4 * m.y;
      p = aAux.xyz + d;
    }
    if (part > 0.5 && part < 1.5) {
      // pedal waves: gentle stretch pulses along the foot while gliding
      float glide = uAgcV0.y;
      p.x += sin(m.z * 18.0 - uAgcV0.w) * 0.006 * glide;
    }
    p = mix(p, ap, retract * 0.97);
  }
  if (part > 3.5 && part < 4.5) {
    // operculum appears only when sealed
    p = mix(uAgcV1.xyz, p, retract);
  }
}
`;

const SNAIL_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x;
  float kind = uAgcF0.x;
  vec3 shell = uAgcPal[0]; vec3 shell2 = uAgcPal[1]; vec3 bodyC = uAgcPal[3]; vec3 body2 = uAgcPal[2]; vec3 band = uAgcPal[5];
  float seed = uAgcPat.w;
  float contrast = uAgcPat.z;
  float pscale = max(uAgcPat.y, 0.3);
  vec3 P = vAgcRest;
  if (part < 0.5) {
    float th = vAgcMask.y; float phi = vAgcMask.z; float u = vAgcMask.w;
    vec2 cs = vec2(cos(phi), sin(phi));
    float nat = agcFbm(vec3(th * 0.8, cs * 1.2 + seed));
    vec3 col = mix(shell, shell2, smoothstep(0.3, 0.8, nat) * 0.7);
    // growth lines (fine, irregular) and a paler lip at the aperture
    // nerite dome: growth lines and stripes converge on the apex — fade them there (the apex is worn smooth)
    float apexFade = (kind > 0.5 && kind < 1.5) ? smoothstep(0.06, 0.55, phi) : 1.0;
    float gl = pow(abs(sin(th * 9.0 + agcVn(vec3(th * 3.0, cs * 1.3 + seed)) * 2.0)), 14.0) * apexFade;
    col *= 1.0 - gl * 0.22 * agcResolve(0.003);
    s.height += gl * 0.0015;
    if (kind < 0.5) {
      // apple snail: optional spiral colour bands (banded / wild)
      float bandsOn = step(5.5, uAgcPat.x) * step(uAgcPat.x, 6.5);
      float b = smoothstep(0.35, 0.55, sin(phi * 3.0 + 1.1)) * bandsOn;
      col = mix(col, band, b * contrast * 0.8);
      col = mix(col, shell2 * 0.6, smoothstep(0.985, 1.0, u) * 0.5);
      s.rough = 0.24;
      s.clear = 0.9;
    } else if (kind < 1.5) {
      // nerite: bold zigzag stripes following the growth direction
      float zz = sin(th * 7.5 * pscale + sin(phi * 5.0 + seed) * 1.1 + agcVn(vec3(th * 2.0, cs * 2.0 + seed)) * 1.6);
      float stripe = smoothstep(0.15, 0.55, zz) * mix(0.35, 1.0, apexFade);
      col = mix(col, band, stripe * contrast);
      col = mix(col, shell2 * 0.8, (1.0 - apexFade) * 0.5);
      s.rough = 0.28;
      s.clear = 0.8;
    } else {
      // trochus: oblique reddish stripes + spiral cords, nacre glimpses at the worn apex
      float ob = smoothstep(0.2, 0.7, sin(th * 5.0 * pscale + phi * 1.5 + agcVn(vec3(th, cs * 1.4 + seed)) * 1.5));
      col = mix(col, band, ob * contrast * 0.75);
      float cords = pow(abs(sin(phi * 9.0)), 6.0);
      col *= 1.0 - cords * 0.12;
      s.height += cords * 0.001;
      float apex = 1.0 - smoothstep(0.0, 0.18, u);
      col = mix(col, vec3(0.85, 0.86, 0.9), apex * 0.6);
      s.irid = 0.5 + apex * 2.0;
      s.rough = 0.45;
      s.clear = 0.3;
    }
    if (!gl_FrontFacing) { col = mix(shell2 * 0.35, vec3(0.75, 0.72, 0.68), 0.25); s.rough = 0.35; }
    s.albedo = col;
    return;
  }
  vec3 Q = P * 60.0 + seed;
  if (part > 3.5 && part < 4.5) {
    // operculum: horny, concentric growth rings
    float ring = sin(length(P - P.yzx * 0.0) * 900.0);
    s.albedo = mix(vec3(0.16, 0.12, 0.08), vec3(0.3, 0.22, 0.14), 0.5 + 0.5 * ring);
    s.rough = 0.4;
    return;
  }
  if (part > 4.5 && part < 5.5) {
    s.albedo = vec3(0.01);
    s.rough = 0.15;
    s.clear = 1.0;
    return;
  }
  // soft body: pigment flecks, paler sole with travelling pedal waves
  float fleck = smoothstep(0.55, 0.8, agcFbm(Q));
  vec3 col = mix(bodyC, body2, 0.3 + 0.4 * fleck);
  vec3 dc = agcCell(P * 150.0 + seed);
  col = mix(col, body2 * 0.6, (1.0 - smoothstep(0.1, 0.3, dc.x)) * 0.35);
  // fine dark pigment peppering (real snail skin is speckled, never a flat pale rubber)
  float pep = smoothstep(0.6, 0.78, agcVn(P * 380.0 + seed * 7.0)) * agcResolve(0.004);
  col *= 1.0 - 0.38 * pep;
  // darker dorsal skin on head, neck and tentacles; the foot's upper flank shades toward the paler sole
  if (part > 1.5 && part < 3.5) col *= 0.82;
  if (part > 0.5 && part < 1.5) {
    float sole = vAgcMask.y;
    float wave = pow(0.5 + 0.5 * sin(vAgcMask.z * 48.0 - uAgcV0.w * 1.5), 3.0) * uAgcV0.y;
    col = mix(col, mix(bodyC, vec3(0.9, 0.88, 0.8), 0.3), sole * 0.5);
    col *= 1.0 - sole * wave * 0.25;
  }
  s.albedo = col;
  s.rough = 0.3;
  s.clear = 0.7;
  s.sss = 0.6 + uAgcMat.z;
  s.sssCol = mix(bodyC, vec3(1.0, 0.85, 0.7), 0.4);
  s.height += (agcVn(P * 500.0) - 0.5) * 0.0006 * agcResolve(0.002);
}
`;

function makeSnailFactory(spec: SnailSpec): CreatureFactory {
  return (args) => {
    const { appearance: ap, fx, lod } = args;
    const key = `snail|${spec.id}|${lod}`;
    const tpl = acquire(key, () => buildSnail(spec, lod), (t) => t.geo.dispose());
    const root = new THREE.Group();
    root.name = spec.id;
    const inner = new THREE.Group();
    root.add(inner);
    const rigI = instantiateRig(tpl.rig);
    for (const b of rigI.roots) inner.add(b);
    const u = createCritterUniforms(fx);
    applyAppearance(u, ap, args.creature);
    u.uAgcF0.value.set(spec.kind, 0, 0, 0);
    u.uAgcV1.value.set(tpl.aperture.x, tpl.aperture.y, tpl.aperture.z, 0);
    const mat = createCritterMaterial({
      name: 'snail',
      fx,
      u,
      surface: SNAIL_SURFACE,
      vertex: SNAIL_VERTEX,
      params: {
        side: THREE.DoubleSide,
        roughness: 0.3,
        clearcoat: 0.8,
        clearcoatRoughness: 0.18,
        iridescence: spec.kind === 2 ? 0.35 : clamp(ap.iridescence ?? 0.1),
        iridescenceIOR: 1.5,
        iridescenceThicknessRange: [250, 600] as [number, number],
      },
    });
    const mesh = makeSkinned(tpl.geo, mat, rigI, 1.6);
    mesh.castShadow = lod === 0;
    mesh.receiveShadow = lod < 2;
    inner.add(mesh);
    // lane:perf — hero detail tiers: lower-LOD shell/body mesh while the snail is a few pixels on screen
    const tiers = critterTiers(lod, (l) => `snail|${spec.id}|${l}`, (l) => buildSnail(spec, l), (t) => t.geo.dispose(), tpl, (t) => (mesh.geometry = t.geo), false);
    root.userData.groundOffset = GROUND;
    root.userData.speciesVisual = spec.id;
    const B = rigI.byName;
    const seed = ((ap.patternSeed ?? 9) % 1000) / 1000;
    const st = { retract: 0, glidePh: 0, glide: 0, siphon: 0 };
    // selection: set by the renderer (not while the camera already follows this animal); drawn as a thin rim
    const sel = { on: false };
    const update = (rt: CreatureRuntime, dt: number, time: number) => {
      u.uAgcTime.value = time;
      const pose = rt.pose;
      const dead = pose === 'dead';
      const speed = Math.max(0, rt.speedBL || 0);
      const retreat = dead || pose === 'startle' || pose === 'hiding';
      st.retract = damp(st.retract, retreat ? 1 : 0, retreat ? 5 : 0.9, dt);
      st.glide = damp(st.glide, speed > 0.01 ? 1 : 0, 3, dt);
      st.glidePh += dt * TAU * (0.6 + speed * 4) * st.glide;
      st.siphon = damp(st.siphon, spec.siphon && pose === 'surface_breath' ? 1 : 0, 2, dt);
      u.uAgcV0.value.set(st.retract, st.glide, st.siphon, st.glidePh);
      // shell sways as the foot waves; settles onto the substrate when retracted
      const bob = Math.sin(st.glidePh) * 0.01 * st.glide;
      setRot(B.shell, Math.sin(time * 0.5 + seed * 5) * 0.02 * (1 - st.retract), Math.sin(st.glidePh * 0.5) * 0.02 * st.glide, bob - st.retract * 0.12);
      B.shell.position.set(rigI.restPos[1].x - st.retract * 0.04, rigI.restPos[1].y - st.retract * (GROUND * 0.35), rigI.restPos[1].z);
      setRot(B.head, 0, Math.sin(time * 0.3 + seed * 7) * 0.15 * (1 - st.retract) + (rt.bend || 0) * 0.2, Math.sin(time * 0.4 + seed) * 0.04);
      u.uAgcCI.value = rt.colorIntensity ?? 1;
      u.uAgcHi.value = sel.on ? 0.85 + 0.15 * Math.sin(time * 3) : 0;
    };
    return {
      root,
      update,
      pickRadius: 0.55,
      setHighlight(on) {
        sel.on = on;
        u.uAgcHi.value = on ? 1 : 0;
      },
      setDetailPx: tiers.setDetailPx,
      dispose() {
        mat.dispose();
        rigI.skeleton.dispose();
        tiers.dispose();
        release(key);
        root.removeFromParent();
      },
    } satisfies CreatureObject;
  };
}

export const createMysterySnail = makeSnailFactory(SNAIL_SPECS.mystery_snail);
export const createNeriteSnail = makeSnailFactory(SNAIL_SPECS.nerite_snail);
export const createTrochusSnail = makeSnailFactory(SNAIL_SPECS.trochus_snail);

void color;
void noise1;
