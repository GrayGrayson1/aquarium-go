/**
 * Instanced stylised visitors: rounded little people with friendly faces (eyes with glints, brows, smile, blush),
 * real hairlines in seven styles, varied builds and outfits (tees, long sleeves, open jackets, trousers, shorts,
 * skirts, dresses, coloured shoes), backpacks / shoulder bags and glasses. They walk, shift their weight, breathe,
 * turn their heads to follow the exhibit, point, fold their arms, kids bounce and press up to the glass, sit on
 * benches, and sparkle on a real "wow". Looks are deterministic per visitor and never cloned side by side
 * (visitorLooks.ts); in the facility view they step out of the camera's line of sight to the exhibits and away from
 * dead centre (visitorStaging.ts), and anyone right in front of the camera or blocking the exhibit in view is
 * dithered out. About a dozen instanced draws for the whole crowd (visitorGeometry.ts / visitorMaterial.ts).
 * Driven by src/runtime/visitors.ts. OWNER: lane "facility".
 */
import { useUI } from '@/state/ui';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getGame } from '@/state/game';
import { useSettings } from '@/state/settings';
import { stepVisitorRuntime, visitorRuntime, type VisitorAgent } from '@/runtime/visitors';
import { setVisitorPresence } from '@/audio/director';
import { useRenderQuality } from '../shared/quality';
import { createContactShadows } from './contactShadows'; // lane:facrender
import { acquireTexture, releaseTexture, starSprite } from './textures';
import { BODY, buildVisitorGeometries } from './visitorGeometry';
import { VisitorLooks, type VisitorLook } from './visitorLooks';
import { ExhibitFocus, inForeground, VisitorStager } from './visitorStaging';
import { addSlotAttributes, setSlotColor, setSlotFlags, slotDepthMaterial, slotMaterial, type SlotAttrs } from './visitorMaterial';

const MAX_AGENTS: Record<string, number> = { low: 14, medium: 26, high: 44, ultra: 64 };
const CAP = 64;
/** Fade people out inside this distance band from the camera (m). */
const NEAR_FADE: [number, number] = [0.9, 1.6];
/**
 * A person standing well in FRONT of the exhibit in view (foreground occluder) and covering more than BLOCK_FADE[1] of
 * it dissolves out completely; they come back once below BLOCK_FADE[0]. People along the glass are part of a public
 * aquarium and stay, and nobody is left half-dithered.
 */
const BLOCK_FADE: [number, number] = [0.12, 0.22];
/** "Foreground": closer to the camera than this fraction of the exhibit's floor distance. */
const FOREGROUND = 0.6;

const _root = new THREE.Matrix4();
const _frame = new THREE.Matrix4();
const _m = new THREE.Matrix4();
const _j = new THREE.Matrix4();
const _j2 = new THREE.Matrix4();
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
}

function allParts(m: Meshes): Part[] {
  return [m.body, m.head, m.thigh, m.shin, m.upperArm, m.foreArm, ...m.hair];
}

function wrap(a: number): number {
  if (!Number.isFinite(a)) return 0;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Compose a joint: parent × T(x,y,z) × R(rx,ry,rz) → out. */
function joint(out: THREE.Matrix4, parent: THREE.Matrix4, x: number, y: number, z: number, rx: number, ry: number, rz: number, order: THREE.EulerOrder = 'XYZ'): THREE.Matrix4 {
  _e.set(rx, ry, rz, order);
  _q.setFromEuler(_e);
  return out.compose(_p.set(x, y, z), _q, _one).premultiply(parent);
}

/** out = m × S(sx, sy, sz) (scale in the joint's own frame). */
function scaled(out: THREE.Matrix4, m: THREE.Matrix4, sx: number, sy: number, sz: number): THREE.Matrix4 {
  return out.copy(m).scale(_s.set(sx, sy, sz));
}

function setFade(p: Part, i: number, f: number): void {
  (p.slots.fade.array as Float32Array)[i] = f;
}

export function VisitorsLayer() {
  const quality = useRenderQuality();
  const reduced = useSettings((s) => s.reducedMotion);
  const geos = useMemo(() => buildVisitorGeometries(), []);
  const mats = useMemo(() => {
    // the body carries open shells (jacket, skirt): draw both sides
    const body = slotMaterial({ roughness: 0.84, side: THREE.DoubleSide });
    const head = slotMaterial({ roughness: 0.58 });
    const limbs = slotMaterial({ roughness: 0.82 });
    const hair = slotMaterial({ roughness: 0.62 });
    const depth = slotDepthMaterial();
    return { body, head, limbs, hair, depth };
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
    };
    // one shared, per-frame crowd bound so off-screen crowds are culled
    const bound = new THREE.Sphere(new THREE.Vector3(), 1);
    for (const p of allParts(out)) p.mesh.boundingSphere = bound;
    return out;
  }, [geos, mats]);
  const looks = useMemo(() => new VisitorLooks(), []);
  const shadows = useMemo(() => createContactShadows(CAP), []);
  useEffect(() => () => shadows.dispose(), [shadows]);
  const stager = useMemo(() => new VisitorStager(), []);
  const focus = useMemo(() => new ExhibitFocus(), []);
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __AQ_VIS?: unknown }).__AQ_VIS = { runtime: visitorRuntime, stager, focus };
  }, [stager, focus]);
  // sparkles
  const spark = useMemo(() => {
    const key = 'sprite:star';
    const map = acquireTexture(key, starSprite, { repeat: false });
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(96 * 3);
    const alpha = new Float32Array(96);
    const size = new Float32Array(96);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uScale: { value: 600 } },
      vertexShader: /* glsl */ `
        attribute float aAlpha; attribute float aSize; varying float vA;
        uniform float uScale;
        void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(0.1, -mv.z); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; varying float vA;
        void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(c.rgb * vec3(1.0, 0.92, 0.7) * 1.6, c.a * vA); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.raycast = () => {};
    return { key, geo, mat, pts };
  }, []);
  useEffect(
    () => () => {
      for (const g of [geos.body, geos.head, geos.thigh, geos.shinShoe, geos.upperArm, geos.foreArmHand, ...(geos.hair ?? [])]) g.dispose();
      for (const m of Object.values(mats)) m.dispose();
      for (const p of allParts(meshes)) p.mesh.dispose();
      spark.geo.dispose();
      spark.mat.dispose();
      releaseTexture(spark.key);
      looks.clear();
    },
    [geos, mats, meshes, spark, looks],
  );
  const presence = useRef(-1);
  const drawList = useRef<VisitorAgent[]>([]);
  const hairCount = useMemo(() => meshes.hair.map(() => 0), [meshes]);
  const shadowsOn = useRef<boolean | null>(null);
  const failed = useRef(false);
  useEffect(() => () => setVisitorPresence(null), []);

  useFrame(({ size, camera }, dt) => {
    try {
      frame(size.height, camera, dt);
    } catch (err) {
      // purely cosmetic layer: never take the 3D view down with it
      if (!failed.current) console.warn('[visitors] frame skipped', err);
      failed.current = true;
      for (const p of allParts(meshes)) p.mesh.visible = false;
    }
  });

  function frame(viewH: number, camera: THREE.Camera, dt: number) {
    const g = getGame();
    stepVisitorRuntime(dt, g, { maxAgents: MAX_AGENTS[quality] ?? 40, reducedMotion: reduced, speed: g?.clock.speed ?? 1 });
    const ui = useUI.getState();
    const all = visitorRuntime.agents ?? [];
    // only the hobby room's window light casts visitor shadows; public rooms' shadow casters (the hero tank's
    // fixture) never see visitors, so don't pay for them in those shadow maps
    const wantShadows = g?.facility?.level === 'hobby_room';
    if (shadowsOn.current !== wantShadows) {
      shadowsOn.current = wantShadows;
      for (const p of allParts(meshes)) p.mesh.castShadow = wantShadows && p !== meshes.foreArm;
    }
    const facilityView = ui.view === 'facility' && !!g;
    // facility view: nobody idles in the camera's line of sight to an exhibit (they step aside once it settles)
    if (facilityView) {
      stager.update(Math.min(0.1, dt), camera, g!, all, visitorRuntime.reach);
      focus.update(camera, g!, ui.focusedTankId);
    }
    // In tank view the camera sits right in front of the glass: never let a visitor stand in (or walk through) the
    // shot. Agents keep simulating; they are just not drawn while they're between the camera and the exhibit.
    const agents = drawList.current;
    agents.length = 0;
    const camX = camera.position.x;
    const camZ = camera.position.z;
    let reach = -1;
    if (ui.view === 'tank') {
      const ft = ui.focusedTankId && g ? g.tanks[ui.focusedTankId] : null;
      const tx = ft?.placement ? ft.placement.x : camX;
      const tz = ft?.placement ? ft.placement.z : camZ;
      reach = Math.max(2.2, Math.hypot(tx - camX, tz - camZ) + 0.9);
    }
    for (const a of all) {
      if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.z)) continue;
      if (reach > 0 && Math.hypot(a.x - camX, a.z - camZ) <= reach) continue;
      agents.push(a);
    }
    const n = Math.min(CAP, agents.length);
    // tell the soundscape how busy the room really is (sim crowding, or a friend visit in the hobby room)
    if (g) {
      const live = g.visitors?.live;
      const friend = live?.friend && g.clock.hour < live.friend.untilHour ? 0.1 * live.friend.party : 0;
      const crowd = Math.max(friend, Math.min(1, live?.crowding ?? 0), Math.min(1, agents.length / 40));
      if (Math.abs(crowd - presence.current) > 0.02) {
        presence.current = crowd;
        try {
          setVisitorPresence(crowd);
        } catch {
          /* audio optional */
        }
      }
    }
    const t = visitorRuntime.time;
    const k = Math.min(1, dt * 4);
    // quick dissolve: the screen-door pattern is only ever visible for a moment
    const kf = Math.min(1, dt * 7);
    const crowdN = all.length;
    for (const a of all) if (a && Number.isFinite(a.id)) looks.get(a, crowdN);
    looks.endFrame();
    hairCount.fill(0);
    // crowd bound for frustum culling
    let cx = 0;
    let cz = 0;
    for (let i = 0; i < n; i++) {
      cx += agents[i].x;
      cz += agents[i].z;
    }
    cx /= Math.max(1, n);
    cz /= Math.max(1, n);
    let rad = 0;
    for (let i = 0; i < n; i++) rad = Math.max(rad, Math.hypot(agents[i].x - cx, agents[i].z - cz));
    const bound = meshes.body.mesh.boundingSphere!;
    bound.center.set(cx, 1, cz);
    bound.radius = rad + 1.6;
    for (let i = 0; i < n; i++) writeAgent(agents[i], looks.get(agents[i], crowdN), i);
    shadows.commit(n);
    meshes.body.mesh.count = n;
    meshes.head.mesh.count = n;
    meshes.thigh.mesh.count = n * 2;
    meshes.shin.mesh.count = n * 2;
    meshes.upperArm.mesh.count = n * 2;
    meshes.foreArm.mesh.count = n * 2;
    meshes.hair.forEach((p, i) => (p.mesh.count = hairCount[i] ?? 0));
    for (const p of allParts(meshes)) {
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
    // sparkles
    const sp = visitorRuntime.sparkles ?? [];
    const pa = spark.geo.getAttribute('position') as THREE.BufferAttribute;
    const aa = spark.geo.getAttribute('aAlpha') as THREE.BufferAttribute;
    const sa = spark.geo.getAttribute('aSize') as THREE.BufferAttribute;
    const cnt = Math.min(96, sp.length);
    for (let i = 0; i < cnt; i++) {
      const s = sp[i];
      const age = t - s.t;
      const life = age / 1.3;
      pa.setXYZ(i, s.x, s.y, s.z);
      aa.setX(i, Math.max(0, age < 0 ? 0 : life < 0.2 ? life / 0.2 : 1 - (life - 0.2) / 0.8));
      sa.setX(i, s.size * (reduced ? 1 : 0.8 + 0.4 * Math.sin(age * 14 + i)));
    }
    spark.geo.setDrawRange(0, cnt);
    pa.needsUpdate = true;
    aa.needsUpdate = true;
    sa.needsUpdate = true;
    spark.mat.uniforms.uScale.value = viewH * 0.9;

    function writeAgent(a: VisitorAgent, L: VisitorLook, i: number) {
      const M = meshes;
      const height = Number.isFinite(a.height) && a.height > 0.5 ? a.height : 1.7;
      const sc = height / 1.7;
      const walking = a.state === 'walk' || a.state === 'leave';
      const sitting = a.state === 'sit';
      const viewing = a.state === 'view';
      const speed = Number.isFinite(a.speed) ? a.speed : 0;
      const moving = Math.min(1, speed / 0.55);
      const idle = reduced ? 0 : 1 - moving;
      const ph = Number.isFinite(a.phase) ? a.phase : 0;
      const sway = Number.isFinite(a.sway) ? a.sway : 0;
      const gesture = Number.isFinite(a.gesture) ? a.gesture : 0.5;
      const heading = Number.isFinite(a.heading) ? a.heading : 0;
      const stride = (reduced ? 0.26 : 0.4) * moving;
      const bob = walking ? (Math.abs(Math.cos(ph)) - 0.6) * 0.03 * moving : 0;
      const wowAge = t - (a.wowT ?? -99);
      // dither out anyone right in front of the camera or covering the exhibit the camera is looking at
      let fadeT = clamp01((camera.position.distanceTo(_p.set(a.x, height * 0.55, a.z)) - NEAR_FADE[0]) / (NEAR_FADE[1] - NEAR_FADE[0]));
      if (facilityView && focus.valid) {
        const flat = Math.hypot(a.x - camera.position.x, a.z - camera.position.z);
        const cov = flat < focus.rect.depth * FOREGROUND ? focus.coverage(camera, a.x, a.z, height) : 0;
        // lane:w2-visual — also dissolve anyone looming in the foreground of the shot (see inForeground)
        L.blocked = (L.blocked ? cov > BLOCK_FADE[0] : cov > BLOCK_FADE[1]) || inForeground(camera, focus.rect, a.x, a.z, height, L.blocked);
        if (L.blocked) fadeT = 0;
      } else L.blocked = false;
      L.fade += (fadeT - L.fade) * kf;
      const fade = L.fade < 0.02 ? 0 : L.fade > 0.99 ? 1 : L.fade;
      // idle weight shift from one leg to the other, slow and per person
      const shift = sitting ? 0 : Math.sin(sway * 0.42 + gesture * 6.2) * idle;
      // kids bounce on their toes when excited (after a wow, or in bursts while watching)
      const excited = viewing && a.kid && !reduced && (wowAge < 3 || Math.sin(sway * 0.7 + a.id) > 0.55);
      const hop = excited ? Math.abs(Math.sin(t * 7.5 + a.id)) * 0.035 : !reduced && wowAge < 0.5 ? Math.sin((wowAge / 0.5) * Math.PI) * 0.04 : 0;
      const seatDrop = sitting ? 0.43 : 0;
      const breath = reduced ? 1 : 1 + Math.sin(t * 1.7 + a.id * 1.3) * 0.008;
      _e.set(0, heading, 0);
      _q.setFromEuler(_e);
      _root.compose(_p.set(a.x, (bob + hop - seatDrop) * sc, a.z), _q, _s.set(sc, sc, sc));
      // lane:facrender — contact shadow under the feet (none for someone dissolved out of the shot)
      shadows.set(i, a.x, a.z, heading, sc, fade, sitting ? 0 : bob + hop);
      // hips slide over the standing leg
      _root.multiply(_m.makeTranslation(shift * 0.022, 0, 0));
      // torso frame: slight forward lean when walking, counter-roll against the hip shift
      const roll = -shift * 0.035 + (walking ? Math.sin(ph) * 0.03 * moving : 0);
      joint(_frame, _root, 0, 0.9, 0, walking ? 0.06 * moving : sitting ? -0.08 : excited ? 0.05 : 0, walking ? Math.sin(ph) * 0.06 * moving : 0, roll).multiply(_pivotDown);
      // body: shirt + trousers seat + optional skirt / jacket / bag (one draw), scaled by build
      const torsoX = Math.max(L.shoulder, L.hip * 0.97);
      _m.copy(_frame).multiply(_pivotUp).scale(_s.set(torsoX, breath, L.girth)).multiply(_pivotDown);
      M.body.mesh.setMatrixAt(i, _m);
      M.body.mesh.setColorAt(i, L.top);
      setSlotColor(M.body.slots.b, i, L.bottom);
      setSlotColor(M.body.slots.c, i, L.jacket ?? L.top);
      setSlotColor(M.body.slots.d, i, L.bagColor);
      setSlotFlags(M.body.slots.flags, i, L.legs >= 2 ? 1 : 0, L.jacket ? 1 : 0, L.bag === 1 ? 1 : 0, L.bag === 2 ? 1 : 0);
      setFade(M.body, i, fade);
      // legs: hip swing + knee flexion in the swing phase; at rest the unloaded leg relaxes its knee
      const legTop = L.legs <= 1 ? L.bottom : L.skin;
      const legLow = L.legs === 0 ? L.bottom : L.skin;
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? -1 : 1;
        const lp = ph + (s === 0 ? 0 : Math.PI);
        const li = i * 2 + s;
        let hip = -Math.sin(lp) * stride;
        let knee = walking ? (Math.max(0, Math.sin(lp - 1.1)) * 0.95 + 0.06) * moving : 0.04;
        let splay = side * 0.025;
        if (sitting) {
          hip = -1.42;
          knee = 1.38;
          splay = side * 0.06;
        } else if (!walking) {
          const relax = Math.max(0, -side * shift);
          knee += relax * 0.2;
          hip -= relax * 0.08;
          splay += shift * 0.03;
        }
        joint(_j, _root, side * BODY.hipX * L.hip, BODY.hipY, 0, hip, 0, splay);
        M.thigh.mesh.setMatrixAt(li, scaled(_m, _j, L.limb, 1, L.limb));
        M.thigh.mesh.setColorAt(li, legTop);
        setFade(M.thigh, li, fade);
        joint(_j2, _j, 0, -BODY.thigh, 0, knee, 0, 0);
        M.shin.mesh.setMatrixAt(li, scaled(_m, _j2, L.limb, 1, L.limb));
        M.shin.mesh.setColorAt(li, legLow);
        setSlotColor(M.shin.slots.b, li, L.shoe);
        setFade(M.shin, li, fade);
      }
      // arms: counter-swing with a relaxed elbow; gestures while looking at an exhibit
      const sleeve = L.jacket ?? L.top;
      const lower = L.longSleeves ? sleeve : L.skin;
      const pointing = viewing && !reduced && ((a.kid && wowAge < 2.6) || (!a.kid && gesture > 0.45 && gesture < 0.58 && Math.sin(sway * 0.5 + a.id) > 0.6));
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? -1 : 1;
        const lp = ph + (s === 0 ? Math.PI : 0);
        const li = i * 2 + s;
        let sh = -Math.sin(lp) * stride * 0.75;
        let elbow = 0.2 + Math.max(0, Math.sin(lp)) * 0.35 * moving + idle * 0.05;
        let rz = side * (0.08 + 0.02 * L.girth);
        let twist = 0;
        if (viewing && !reduced) {
          if (s === 1 && pointing) {
            sh = -1.3 + Math.sin(t * 5 + a.id) * 0.05;
            elbow = 0.1;
            rz = 0.04;
          } else if (gesture < 0.22) {
            // hands clasped behind the back
            sh = 0.3;
            rz = side * 0.16;
            twist = -side * 2.0;
            elbow = 1.25;
          } else if (gesture > 0.9 && s === 0) {
            // hand on hip
            sh = 0.1;
            rz = side * 0.55;
            twist = -side * 2.2;
            elbow = 1.6;
          } else if (gesture > 0.75 && gesture <= 0.9) {
            // arms folded
            sh = -0.3;
            rz = side * 0.1;
            twist = -side * 1.05;
            elbow = 1.45;
          }
        }
        if (sitting) {
          sh = -0.45;
          elbow = 0.9;
          twist = -side * 0.35;
        }
        // twist about the arm first (so the elbow bends inward/behind), then raise sideways, then swing
        joint(_j, _frame, side * BODY.shoulderX * torsoX, BODY.shoulderY, 0, sh, twist, rz, 'XZY');
        M.upperArm.mesh.setMatrixAt(li, scaled(_m, _j, L.limb, 1, L.limb));
        M.upperArm.mesh.setColorAt(li, sleeve);
        setFade(M.upperArm, li, fade);
        joint(_j2, _j, 0, -BODY.upperArm, 0, -elbow, 0, 0);
        M.foreArm.mesh.setMatrixAt(li, scaled(_m, _j2, L.limb, 1, L.limb));
        M.foreArm.mesh.setColorAt(li, lower);
        setSlotColor(M.foreArm.slots.b, li, L.skin);
        setFade(M.foreArm, li, fade);
      }
      // head: follows the exhibit (turning further than the body), glances around, tilts up at tall tanks
      let yawT = 0;
      let pitchT = 0;
      const glance = reduced ? 0 : Math.sin(sway * 0.33 + gesture * 3) * 0.3 + Math.sin(sway * 0.91 + a.id) * 0.12;
      const faceD = Math.hypot(a.faceX - a.x, a.faceZ - a.z);
      if (viewing && a.targetTankId && Number.isFinite(faceD)) {
        yawT = THREE.MathUtils.clamp(wrap(Math.atan2(a.faceX - a.x, a.faceZ - a.z) - heading), -0.9, 0.9) + glance;
        const eyeY = height * 0.93 + hop;
        pitchT = THREE.MathUtils.clamp(Math.atan2((a.lookY ?? 1) - eyeY, Math.max(0.5, faceD - 0.3)) * 0.7, -0.4, 0.35) + Math.sin(sway * 0.6 + a.id) * 0.05 * idle;
      } else if (walking && a.targetTankId && faceD < 3.5) {
        yawT = THREE.MathUtils.clamp(wrap(Math.atan2(a.faceX - a.x, a.faceZ - a.z) - heading), -0.8, 0.8) * 0.7;
      } else {
        yawT = glance * (sitting ? 0.8 : 0.35);
        pitchT = sitting ? 0.05 : -0.04;
      }
      L.headYaw += (THREE.MathUtils.clamp(yawT, -1.05, 1.05) - L.headYaw) * k;
      L.headPitch += (pitchT - L.headPitch) * k;
      const hs = L.headScale;
      const tilt = reduced ? 0 : Math.sin(sway * 0.27 + gesture * 7) * 0.06 * idle;
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
    <group name="facility-visitors">
      {allParts(meshes).map((p, i) => (
        <primitive key={i} object={p.mesh} />
      ))}
      <primitive object={spark.pts} />
      <primitive object={shadows.mesh} />
    </group>
  );
}
