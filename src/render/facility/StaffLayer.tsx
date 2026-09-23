/**
 * Instanced staff figures: the same rounded people as the visitor crowd (visitorGeometry.ts / visitorMaterial.ts) in
 * the venue's uniform — a teal polo with a white name badge, role-coloured trousers — plus the tools of the job: a
 * food tub for aquarists, a clipboard for the stock manager. Poses: walking, feeding over a tank rim (arm up to the
 * tank top, wrist shaking food in, head bowed into the tank), docent talks (open-palm sweeps toward the exhibit, both
 * hands explaining, looking between the crowd and the tank), clipboard work, and relaxed idling.
 * Behaviour comes from staffRuntime.ts (driven by state.staff, read-only). Visibility follows the visitor rules:
 * dithered out near the camera or when standing in front of the exhibit in view, never drawn between the camera and
 * the focused tank in tank view. About eight instanced draws for the whole team. OWNER: lane "staff".
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { BODY, buildVisitorGeometries } from './visitorGeometry';
import { ExhibitFocus, inForeground } from './visitorStaging';
import { addSlotAttributes, setSlotColor, setSlotFlags, slotDepthMaterial, slotMaterial, type SlotAttrs } from './visitorMaterial';
import { stepStaffRuntime, staffRuntime, type StaffAgent } from './staffRuntime';
import { ACC_FLAG, buildAccessoryGeometry, makeStaffLook, type StaffLook } from './staffLooks';

const CAP = 12;
const NEAR_FADE: [number, number] = [0.9, 1.6];
const BLOCK_FADE: [number, number] = [0.12, 0.22];
const FOREGROUND = 0.6;

const _root = new THREE.Matrix4();
const _frame = new THREE.Matrix4();
const _m = new THREE.Matrix4();
const _j = new THREE.Matrix4();
const _j2 = new THREE.Matrix4();
const _acc = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);
const _white = new THREE.Color(1, 1, 1);
const _ink = new THREE.Color('#1a1210');
const _glint = new THREE.Color(1.6, 1.6, 1.6);
const _pivotUp = new THREE.Matrix4().makeTranslation(0, 0.9, 0);
const _pivotDown = new THREE.Matrix4().makeTranslation(0, -0.9, 0);

interface Part {
  mesh: THREE.InstancedMesh;
  slots: SlotAttrs;
}

interface Meshes {
  body: Part;
  head: Part;
  thigh: Part;
  shin: Part;
  upperArm: Part;
  foreArm: Part;
  hair: Part[];
  acc: Part;
}

function allParts(m: Meshes): Part[] {
  return [m.body, m.head, m.thigh, m.shin, m.upperArm, m.foreArm, m.acc, ...m.hair];
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (x: number) => clamp(x, 0, 1);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function wrap(a: number): number {
  if (!Number.isFinite(a)) return 0;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** parent × T(x,y,z) × R(rx,ry,rz) → out. */
function joint(out: THREE.Matrix4, parent: THREE.Matrix4, x: number, y: number, z: number, rx: number, ry: number, rz: number, order: THREE.EulerOrder = 'XYZ'): THREE.Matrix4 {
  _e.set(rx, ry, rz, order);
  _q.setFromEuler(_e);
  return out.compose(_p.set(x, y, z), _q, _one).premultiply(parent);
}

function scaled(out: THREE.Matrix4, m: THREE.Matrix4, sx: number, sy: number, sz: number): THREE.Matrix4 {
  return out.copy(m).scale(_s.set(sx, sy, sz));
}

function setFade(p: Part, i: number, f: number): void {
  (p.slots.fade.array as Float32Array)[i] = f;
}

/** Arm angles: forward swing (sh), twist about the arm, sideways raise (rz), elbow bend. */
interface ArmPose {
  sh: number;
  twist: number;
  rz: number;
  elbow: number;
}

const _armPose: ArmPose = { sh: 0, twist: 0, rz: 0, elbow: 0 };
const _armBase: ArmPose = { sh: 0, twist: 0, rz: 0, elbow: 0 };
const _armWant: ArmPose = { sh: 0, twist: 0, rz: 0, elbow: 0 };

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function mixArm(out: ArmPose, a: ArmPose, b: ArmPose, t: number): ArmPose {
  out.sh = mix(a.sh, b.sh, t);
  out.twist = mix(a.twist, b.twist, t);
  out.rz = mix(a.rz, b.rz, t);
  out.elbow = mix(a.elbow, b.elbow, t);
  return out;
}

export function StaffLayer() {
  const reduced = useSettings((s) => s.reducedMotion);
  const geos = useMemo(() => ({ ...buildVisitorGeometries(), acc: buildAccessoryGeometry() }), []);
  const mats = useMemo(() => {
    const body = slotMaterial({ roughness: 0.78 });
    const head = slotMaterial({ roughness: 0.58 });
    const limbs = slotMaterial({ roughness: 0.8 });
    const hair = slotMaterial({ roughness: 0.62 });
    const acc = slotMaterial({ roughness: 0.45 });
    const depth = slotDepthMaterial();
    return { body, head, limbs, hair, acc, depth };
  }, []);
  const meshes = useMemo<Meshes>(() => {
    const mk = (g: THREE.BufferGeometry, m: THREE.Material, n: number): Part => {
      const slots = addSlotAttributes(g, n);
      const im = new THREE.InstancedMesh(g, m, n);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.count = 0;
      im.castShadow = false;
      im.receiveShadow = false;
      im.raycast = () => {};
      im.setColorAt(0, _white);
      im.instanceColor!.setUsage(THREE.DynamicDrawUsage);
      im.customDepthMaterial = mats.depth;
      return { mesh: im, slots };
    };
    const out: Meshes = {
      body: mk(geos.body, mats.body, CAP),
      head: mk(geos.head, mats.head, CAP),
      thigh: mk(geos.thigh, mats.limbs, CAP * 2),
      shin: mk(geos.shinShoe, mats.limbs, CAP * 2),
      upperArm: mk(geos.upperArm, mats.limbs, CAP * 2),
      foreArm: mk(geos.foreArmHand, mats.limbs, CAP * 2),
      hair: (geos.hair ?? []).map((g) => mk(g, mats.hair, CAP)),
      acc: mk(geos.acc, mats.acc, CAP * 2),
    };
    const bound = new THREE.Sphere(new THREE.Vector3(), 1);
    for (const p of allParts(out)) p.mesh.boundingSphere = bound;
    return out;
  }, [geos, mats]);
  const looks = useRef(new Map<string, StaffLook>());
  const focus = useMemo(() => new ExhibitFocus(), []);
  const drawList = useRef<StaffAgent[]>([]);
  const hairCount = useMemo(() => meshes.hair.map(() => 0), [meshes]);
  const failed = useRef(false);
  useEffect(
    () => () => {
      for (const g of [geos.body, geos.head, geos.thigh, geos.shinShoe, geos.upperArm, geos.foreArmHand, geos.acc, ...(geos.hair ?? [])]) g.dispose();
      for (const m of Object.values(mats)) m.dispose();
      for (const p of allParts(meshes)) p.mesh.dispose();
      looks.current.clear();
    },
    [geos, mats, meshes],
  );
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __AQ_STAFF?: unknown }).__AQ_STAFF = { runtime: staffRuntime };
  }, []);

  useFrame(({ camera }, dt) => {
    try {
      frame(camera, dt);
    } catch (err) {
      // purely cosmetic layer: never take the 3D view down with it
      if (!failed.current) console.warn('[staff] frame skipped', err);
      failed.current = true;
      for (const p of allParts(meshes)) p.mesh.visible = false;
    }
  });

  function frame(camera: THREE.Camera, dt: number) {
    const g = getGame();
    stepStaffRuntime(dt, g, { reducedMotion: reduced, speed: g?.clock.speed ?? 1 });
    const ui = useUI.getState();
    const all = staffRuntime.agents;
    const agents = drawList.current;
    agents.length = 0;
    const facilityView = ui.view === 'facility' && !!g;
    if (facilityView && all.size) focus.update(camera, g!, ui.focusedTankId);
    const camX = camera.position.x;
    const camZ = camera.position.z;
    let reach = -1;
    if (ui.view === 'tank') {
      const ft = ui.focusedTankId && g ? g.tanks[ui.focusedTankId] : null;
      const tx = ft?.placement ? ft.placement.x : camX;
      const tz = ft?.placement ? ft.placement.z : camZ;
      reach = Math.max(2.2, Math.hypot(tx - camX, tz - camZ) + 0.9);
    }
    for (const a of all.values()) {
      if (!Number.isFinite(a.x) || !Number.isFinite(a.z) || a.alpha <= 0.01) continue;
      if (reach > 0 && Math.hypot(a.x - camX, a.z - camZ) <= reach) continue;
      agents.push(a);
      if (agents.length >= CAP) break;
    }
    // forget looks for people who left
    if (looks.current.size > all.size + 4) for (const id of [...looks.current.keys()]) if (!all.has(id)) looks.current.delete(id);
    const n = agents.length;
    hairCount.fill(0);
    let cx = 0;
    let cz = 0;
    for (const a of agents) {
      cx += a.x;
      cz += a.z;
    }
    cx /= Math.max(1, n);
    cz /= Math.max(1, n);
    let rad = 0;
    for (const a of agents) rad = Math.max(rad, Math.hypot(a.x - cx, a.z - cz));
    const bound = meshes.body.mesh.boundingSphere!;
    bound.center.set(cx, 1, cz);
    bound.radius = rad + 1.8;
    const t = staffRuntime.time;
    const k = Math.min(1, dt * 4);
    const kf = Math.min(1, dt * 7);
    let accN = 0;
    for (let i = 0; i < n; i++) {
      const a = agents[i];
      let L = looks.current.get(a.id);
      if (!L) {
        L = makeStaffLook(a.seed, a.role);
        looks.current.set(a.id, L);
      }
      writeAgent(a, L, i);
    }
    const M = meshes;
    M.body.mesh.count = n;
    M.head.mesh.count = n;
    M.thigh.mesh.count = n * 2;
    M.shin.mesh.count = n * 2;
    M.upperArm.mesh.count = n * 2;
    M.foreArm.mesh.count = n * 2;
    M.acc.mesh.count = accN;
    M.hair.forEach((p, i) => (p.mesh.count = hairCount[i] ?? 0));
    for (const p of allParts(M)) {
      const m = p.mesh;
      m.visible = m.count > 0;
      if (!m.visible) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      p.slots.b.needsUpdate = true;
      p.slots.c.needsUpdate = true;
      p.slots.d.needsUpdate = true;
      p.slots.flags.needsUpdate = true;
      p.slots.fade.needsUpdate = true;
    }

    function pushAcc(mat: THREE.Matrix4, flag: number, fade: number) {
      const i = accN++;
      const P = meshes.acc;
      P.mesh.setMatrixAt(i, mat);
      P.mesh.setColorAt(i, _white);
      setSlotFlags(P.slots.flags, i, flag === ACC_FLAG.uniform ? 1 : 0, flag === ACC_FLAG.tub ? 1 : 0, flag === ACC_FLAG.clipboard ? 1 : 0, 0);
      setFade(P, i, fade);
    }

    function writeAgent(a: StaffAgent, L: StaffLook, i: number) {
      const M = meshes;
      const height = L.height;
      const sc = height / 1.7;
      const walking = a.mode === 'walk' || a.mode === 'leave';
      const speed = Number.isFinite(a.speed) ? a.speed : 0;
      const moving = Math.min(1, speed / 0.55);
      const idle = reduced ? 0 : 1 - moving;
      const ph = Number.isFinite(a.phase) ? a.phase : 0;
      const stride = (reduced ? 0.26 : 0.4) * moving;
      const bob = walking ? (Math.abs(Math.cos(ph)) - 0.6) * 0.03 * moving : 0;
      const pose = walking ? 'walk' : a.pose;
      // smoothed blend into the work pose so arms never snap
      L.work += ((pose === 'walk' ? 0 : 1) - L.work) * Math.min(1, dt * 3.5);
      const w = L.work;
      const heading = Number.isFinite(a.heading) ? a.heading : 0;
      // visibility: near the camera, or standing in front of the exhibit in view
      let fadeT = clamp01((camera.position.distanceTo(_p.set(a.x, height * 0.55, a.z)) - NEAR_FADE[0]) / (NEAR_FADE[1] - NEAR_FADE[0]));
      if (facilityView && focus.valid) {
        const flat = Math.hypot(a.x - camera.position.x, a.z - camera.position.z);
        const cov = flat < focus.rect.depth * FOREGROUND ? focus.coverage(camera, a.x, a.z, height) : 0;
        // lane:w2-visual — also dissolve anyone looming in the foreground of the shot (see inForeground)
        L.blocked = (L.blocked ? cov > BLOCK_FADE[0] : cov > BLOCK_FADE[1]) || inForeground(camera, focus.rect, a.x, a.z, height, L.blocked);
        if (L.blocked) fadeT = 0;
      } else L.blocked = false;
      L.fade += (fadeT - L.fade) * kf;
      const f0 = L.fade * clamp01(a.alpha);
      const fade = f0 < 0.02 ? 0 : f0 > 0.99 ? 1 : f0;
      const shift = reduced ? 0 : Math.sin(a.sway * 0.42 + (a.seed % 97)) * idle * (pose === 'talk' ? 0.6 : 1);
      const breath = reduced ? 1 : 1 + Math.sin(t * 1.7 + (a.seed % 13)) * 0.008;
      const feeding = pose === 'feed';
      const talking = pose === 'talk';
      const clip = a.role === 'stock_manager';
      // torso lean: forward over the rim while feeding, slight forward when walking
      const lean = walking ? 0.06 * moving : feeding ? 0.12 * w : clip && pose === 'clipboard' ? 0.05 * w : 0;
      _e.set(0, heading, 0);
      _q.setFromEuler(_e);
      _root.compose(_p.set(a.x, bob * sc, a.z), _q, _s.set(sc, sc, sc));
      _root.multiply(_m.makeTranslation(shift * 0.02, 0, 0));
      const roll = -shift * 0.03 + (walking ? Math.sin(ph) * 0.03 * moving : 0);
      joint(_frame, _root, 0, 0.9, 0, lean, walking ? Math.sin(ph) * 0.06 * moving : 0, roll).multiply(_pivotDown);
      const torsoX = Math.max(L.shoulder, L.hip * 0.97);
      _m.copy(_frame).multiply(_pivotUp).scale(_s.set(torsoX, breath, L.girth)).multiply(_pivotDown);
      M.body.mesh.setMatrixAt(i, _m);
      M.body.mesh.setColorAt(i, L.top);
      setSlotColor(M.body.slots.b, i, L.bottom);
      setSlotColor(M.body.slots.c, i, L.top);
      setSlotColor(M.body.slots.d, i, L.top);
      setSlotFlags(M.body.slots.flags, i, 0, 0, 0, 0);
      setFade(M.body, i, fade);
      // uniform: name badge on the chest and the print across the back ride on the torso's own matrix
      pushAcc(_m, ACC_FLAG.uniform, fade);
      // clipboard held against the belly, tilted up toward the face (sheet side facing the eyes)
      if (clip) {
        joint(_acc, _frame, 0.02, 1.0, 0.2 * L.girth, 0.74, Math.PI, 0, 'XYZ');
        pushAcc(_acc, ACC_FLAG.clipboard, fade);
      }
      // legs
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? -1 : 1;
        const lp = ph + (s === 0 ? 0 : Math.PI);
        const li = i * 2 + s;
        let hip = -Math.sin(lp) * stride;
        let knee = walking ? (Math.max(0, Math.sin(lp - 1.1)) * 0.95 + 0.06) * moving : 0.04;
        let splay = side * 0.025;
        if (!walking) {
          const relax = Math.max(0, -side * shift);
          knee += relax * 0.2;
          hip -= relax * 0.08;
          splay += shift * 0.03;
          if (feeding) {
            // weight forward, one foot slightly back
            hip += (s === 0 ? -0.08 : 0.1) * w;
            knee += 0.05 * w;
          }
        }
        joint(_j, _root, side * BODY.hipX * L.hip, BODY.hipY, 0, hip, 0, splay);
        M.thigh.mesh.setMatrixAt(li, scaled(_m, _j, L.limb, 1, L.limb));
        M.thigh.mesh.setColorAt(li, L.bottom);
        setFade(M.thigh, li, fade);
        joint(_j2, _j, 0, -BODY.thigh, 0, knee, 0, 0);
        M.shin.mesh.setMatrixAt(li, scaled(_m, _j2, L.limb, 1, L.limb));
        M.shin.mesh.setColorAt(li, L.bottom);
        setSlotColor(M.shin.slots.b, li, L.shoe);
        setFade(M.shin, li, fade);
      }
      // arms
      const faceD = Math.max(0.25, Math.hypot(a.faceX - a.x, a.faceZ - a.z));
      const armPose = _armPose;
      const base = _armBase;
      const want = _armWant;
      // docent gesture cycle (≈5 s): sweep toward the exhibit → both hands explaining → relaxed
      const gc = ((a.workT * (reduced ? 0.12 : 0.2) + (a.seed % 100) / 100) % 1 + 1) % 1;
      const sweepW = talking ? smooth(0, 0.08, gc) * (1 - smooth(0.3, 0.38, gc)) : 0;
      const explainW = talking ? smooth(0.36, 0.44, gc) * (1 - smooth(0.62, 0.7, gc)) : 0;
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? -1 : 1;
        const lp = ph + (s === 0 ? Math.PI : 0);
        const li = i * 2 + s;
        // walking / relaxed base
        base.sh = walking ? -Math.sin(lp) * stride * 0.75 : 0;
        base.elbow = 0.2 + (walking ? Math.max(0, Math.sin(lp)) * 0.35 * moving : 0) + idle * 0.05;
        base.rz = side * (0.08 + 0.02 * L.girth);
        base.twist = 0;
        want.sh = base.sh;
        want.elbow = base.elbow;
        want.rz = base.rz;
        want.twist = 0;
        const worker = side === a.arm;
        if (feeding && worker) {
          // reach over the rim (two-bone IK to a point just above the water near them) and shake food in
          const shake = reduced ? 0 : Math.sin(t * 11 + a.seed) * 0.045;
          reachArm(want, a, sc, side, torsoX, heading);
          want.sh += shake;
          want.elbow += shake * 0.5;
        } else if (feeding) {
          // other hand relaxed, a little forward
          want.sh = -0.35;
          want.elbow = 0.6;
          want.rz = side * 0.14;
        } else if (talking) {
          const amp = activeTalkAmp(a);
          const sweep = reduced ? 0.5 : Math.sin(a.workT * 1.6 + a.seed) * 0.5 + 0.5;
          if (worker) {
            // open palm sweeping toward the exhibit
            want.sh = mix(-0.25, -1.15 - 0.2 * sweep * amp, sweepW);
            want.rz = side * mix(0.12, 0.55 + 0.25 * sweep * amp, sweepW);
            want.elbow = mix(0.35, 0.3, sweepW);
            want.twist = -side * 0.7 * sweepW;
          } else {
            want.sh = -0.15;
            want.elbow = 0.35;
          }
          if (explainW > 0) {
            const bounce = reduced ? 0 : Math.sin(t * 4.2 + s * 1.7 + a.seed) * 0.12 * amp;
            want.sh = mix(want.sh, -0.7 + bounce, explainW);
            want.elbow = mix(want.elbow, 1.45 - bounce * 0.5, explainW);
            want.rz = mix(want.rz, side * 0.12, explainW);
            want.twist = mix(want.twist, -side * 1.0, explainW);
          }
        } else if (!walking && pose === 'idle') {
          // hands clasped behind the back
          want.sh = 0.3;
          want.rz = side * 0.16;
          want.twist = -side * 2.0;
          want.elbow = 1.25;
        }
        if (clip) {
          if (side === 1) {
            // left forearm cradles the clipboard
            want.sh = -0.5;
            want.elbow = 1.35;
            want.rz = 0.22;
            want.twist = -0.9;
          } else if (!walking && pose === 'clipboard') {
            // right hand writes
            const scrib = reduced ? 0 : Math.sin(t * 7 + a.seed) * 0.05;
            want.sh = -0.55 + scrib;
            want.elbow = 1.55;
            want.rz = -0.1;
            want.twist = 1.0;
          }
        }
        // blend walking arms into the work pose
        const blendW = clip && side === 1 ? 1 : w;
        mixArm(armPose, base, want, blendW);
        joint(_j, _frame, side * BODY.shoulderX * torsoX, BODY.shoulderY, 0, armPose.sh, armPose.twist, armPose.rz, 'XZY');
        M.upperArm.mesh.setMatrixAt(li, scaled(_m, _j, L.limb, 1, L.limb));
        M.upperArm.mesh.setColorAt(li, L.top);
        setFade(M.upperArm, li, fade);
        joint(_j2, _j, 0, -BODY.upperArm, 0, -armPose.elbow, 0, 0);
        M.foreArm.mesh.setMatrixAt(li, scaled(_m, _j2, L.limb, 1, L.limb));
        // short sleeves: forearm and hand are bare
        M.foreArm.mesh.setColorAt(li, L.skin);
        setSlotColor(M.foreArm.slots.b, li, L.skin);
        setFade(M.foreArm, li, fade);
        // aquarists carry their food tub in the working hand
        if (a.role === 'aquarist' && side === a.arm) {
          joint(_acc, _j2, 0, -BODY.foreArm - 0.03, 0.03, feeding ? -0.35 * w : 0, 0, 0);
          pushAcc(_acc, ACC_FLAG.tub, fade);
        }
      }
      // head: into the tank when feeding, between crowd and exhibit when talking, down at the clipboard
      let yawT = 0;
      let pitchT = 0;
      const eyeY = height * 0.93;
      if (feeding) {
        yawT = clamp(wrap(Math.atan2(a.faceX - a.x, a.faceZ - a.z) - heading), -0.8, 0.8);
        pitchT = clamp(Math.atan2(a.lookY - 0.15 - eyeY, faceD) * 0.9, -0.55, 0.3);
      } else if (talking) {
        const toTank = a.arm * (0.55 + 0.1 * Math.sin(a.seed));
        const scan = reduced ? 0 : Math.sin(a.workT * 0.7 + a.seed) * 0.3;
        yawT = mix(scan, toTank, sweepW);
        pitchT = (reduced ? 0 : Math.sin(t * 3.1 + a.seed) * 0.035) - 0.02;
      } else if (clip && !walking) {
        pitchT = -0.38;
        yawT = 0.05;
      } else if (walking) {
        yawT = reduced ? 0 : Math.sin(a.sway * 0.33 + a.seed) * 0.12;
      } else {
        yawT = reduced ? 0 : Math.sin(a.sway * 0.33 + a.seed) * 0.25;
        pitchT = -0.04;
      }
      L.headYaw += (clamp(yawT, -1.0, 1.0) - L.headYaw) * k;
      L.headPitch += (pitchT - L.headPitch) * k;
      const hs = L.headScale;
      const tilt = reduced ? 0 : Math.sin(a.sway * 0.27 + (a.seed % 11)) * 0.05 * idle;
      joint(_j, _frame, 0, BODY.headY + (hs - 1) * 0.07, 0, -L.headPitch, L.headYaw, tilt, 'YXZ');
      _j.scale(_s.set(hs, hs, hs));
      M.head.mesh.setMatrixAt(i, _j);
      M.head.mesh.setColorAt(i, L.skin);
      setSlotColor(M.head.slots.b, i, L.frame);
      setSlotColor(M.head.slots.c, i, _ink);
      setSlotColor(M.head.slots.d, i, _glint);
      setSlotFlags(M.head.slots.flags, i, L.glasses ? 1 : 0, 0, 0, 0);
      setFade(M.head, i, fade);
      if (!M.hair.length) return;
      const style = Math.min(M.hair.length - 1, Math.max(0, L.hairStyle | 0));
      const hp = M.hair[style];
      const hi = hairCount[style]++;
      hp.mesh.setMatrixAt(hi, _j);
      hp.mesh.setColorAt(hi, L.hair);
      setFade(hp, hi, fade);
    }
  }

  return (
    <group name="facility-staff">
      {allParts(meshes).map((p, i) => (
        <primitive key={i} object={p.mesh} />
      ))}
    </group>
  );
}

const UPPER = BODY.upperArm;
/** Elbow to the middle of the palm. */
const LOWER = BODY.foreArm + 0.035;

/**
 * Two-bone IK for the feeding arm: shoulder → a point a hand's height above the water, just inside the rim nearest
 * the keeper (a.aimX/aimY/aimZ). The elbow rides above the shoulder–hand line and the forearm bends DOWN into the
 * tank (the arm is twisted so its bend plane is vertical). Solved in the figure's unscaled body space; the joint
 * order matches the arm joints above: twist (Y) first, then the sideways raise (Z), then the forward swing (X).
 */
function reachArm(out: ArmPose, a: StaffAgent, sc: number, side: number, torsoX: number, heading: number): void {
  const dx = a.aimX - a.x;
  const dz = a.aimZ - a.z;
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  // local x = the figure's left = (cos h, −sin h) in world; local z = forward = (sin h, cos h)
  const lx = (dx * c - dz * s) / sc - side * BODY.shoulderX * torsoX;
  const lz = (dx * s + dz * c) / sc - 0.05;
  const ly = (a.aimY + 0.12) / sc - BODY.shoulderY;
  const h = Math.max(1e-4, Math.hypot(lx, lz));
  const d = clamp(Math.hypot(h, ly), 0.16, UPPER + LOWER - 0.004);
  const phi = Math.atan2(ly, h);
  const alpha = Math.acos(clamp((UPPER * UPPER + d * d - LOWER * LOWER) / (2 * UPPER * d), -1, 1));
  const el = phi + alpha;
  const hx = lx / h;
  const hz = lz / h;
  const ux = Math.cos(el) * hx;
  const uy = Math.sin(el);
  const uz = Math.cos(el) * hz;
  // bend direction: perpendicular to the upper arm in its vertical plane, pointing down
  const bx = Math.sin(el) * hx;
  const by = -Math.cos(el);
  const bz = Math.sin(el) * hz;
  const rz = Math.asin(clamp(ux, -1, 1));
  const sh = Math.atan2(-uz, -uy);
  const sr = Math.sin(rz);
  const cs = Math.cos(sh);
  const ss = Math.sin(sh);
  // images of the arm's local x and z axes after the raise + swing (before twist)
  const v0x = Math.cos(rz);
  const v0y = sr * cs;
  const v0z = sr * ss;
  const w0y = -ss;
  const w0z = cs;
  const tw = Math.atan2(bx * v0x + by * v0y + bz * v0z, by * w0y + bz * w0z);
  out.sh = sh;
  out.rz = rz;
  out.twist = tw;
  out.elbow = Math.PI - Math.acos(clamp((UPPER * UPPER + LOWER * LOWER - d * d) / (2 * UPPER * LOWER), -1, 1));
}

/** Talks during a scheduled session are livelier. */
function activeTalkAmp(a: StaffAgent): number {
  const g = getGame();
  if (!g?.staff) return 1;
  const h = g.clock.hour;
  for (const t of g.staff.talks ?? []) if (t.staffId === a.id && h >= t.hour && h < t.untilHour) return 1.35;
  return 1;
}
