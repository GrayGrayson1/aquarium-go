/**
 * buildFish: assembles a CreatureObject (body + merged fins + independently rotating eyes) from a FishPlan and drives
 * it from CreatureRuntime every frame. OWNER: lane "fishart".
 *
 * Per-frame work is allocation free: runtime values are smoothed with springs into shared uniform vectors; the eyes
 * (rigid meshes) follow the head using a JS mirror of the shader's body-wave function.
 */
import * as THREE from 'three';
import type { CreatureObject, CreatureFactoryArgs } from '../types';
import type { CreatureRuntime } from '@/types';
import type { FishPlan } from './plan';
import { acquireFishGeometry, releaseFishGeometry, eyeGeometry, type FishGeometry } from './cache';
import { createFishUniforms, createFishMaterials, createFishDepthMaterial } from './materials';
import { approach, clamp, clamp01, smoothstep, hash1, hashStr } from './math';
import { FISH_DETAIL, nextDetailTier } from '../../shared/detail';
import { prismaticOf } from './prismatic'; // lane:genetics

export interface FishObject extends CreatureObject {
  plan: FishPlan;
}

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const X = new THREE.Vector3(1, 0, 0);

/** Fins hanging this far (body lengths) below the body's lowest point count as long, trailing fins. */
const LONG_FIN_HANG = 0.12;

export function buildFish(plan: FishPlan, args: CreatureFactoryArgs): FishObject {
  const { appearance: a, lod, quality, fx } = args;
  const geo = acquireFishGeometry(plan, lod, quality);
  const S = geo.sampler;
  const u = createFishUniforms(plan, S, a);
  // lane:genetics — a Prismatic individual's sheen rides in the spare uLookH.yzw (no new uniform vectors)
  const prism = prismaticOf(args.creature);
  if (prism) u.uLookH.value.set(u.uLookH.value.x, prism.strength, prism.hue, prism.twinkle);
  const mats = createFishMaterials(plan, u, a, fx, lod, quality);

  const root = new THREE.Group();
  root.name = `fish:${args.species.id}`;
  const inner = new THREE.Group();
  root.add(inner);

  // highest point (dorsal fin / back) above the origin, so the tank can keep it under the waterline: the measured
  // rest-pose top (not the generous culling box), stretched by this individual's body depth, plus a little water
  root.userData.topOffset = clamp(geo.topY * Math.max(1, a.bodyDepth ?? 1) + 0.02, 0.06, 0.6);
  // L-4 — long fins hanging well below the body (betta, fancy guppy, gourami veils) stay out of the substrate: the
  // floor clamp keeps their tips just above it. Bottom dwellers keep the default (they rest on the sand on purpose).
  const zones = args.species.activityZone ?? [];
  if (geo.bodyBottomY - geo.finsBottomY > LONG_FIN_HANG && !zones.includes('bottom') && !zones.includes('substrate')) {
    root.userData.groundOffset = clamp(-geo.finsBottomY * Math.max(1, a.bodyDepth ?? 1) - 0.02, 0.05, 0.6);
  }

  const body = new THREE.Mesh(geo.body, mats.body);
  body.name = 'body';
  const fins = new THREE.Mesh(geo.fins, mats.fins);
  fins.name = 'fins';
  fins.renderOrder = 2;
  inner.add(body, fins);
  const shadows = lod === 0 && quality !== 'low';
  body.castShadow = shadows;
  body.receiveShadow = false;
  const depthMat = shadows ? createFishDepthMaterial(u) : null;
  if (depthMat) body.customDepthMaterial = depthMat;

  // ── eyes ──
  const E = plan.eye;
  // far tanks (lod 2) skip the eye meshes: they are a pixel or two there, and each is a draw call per fish
  const eyeSides: (1 | -1)[] = lod >= 2 ? [] : [1, -1];
  const eyeData = eyeSides.map((side) => {
    const th = S.flankTheta(E.t, E.yn, side);
    const p = S.point(E.t, th, { x: 0, y: 0, z: 0, yn: 0 });
    const n = S.normal(E.t, th, new THREE.Vector3());
    const depth = E.r * (1 - 2 * E.protrude);
    const centre = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(n, -depth);
    if (E.stalk) centre.addScaledVector(n, E.stalk);
    // look axis: the surface normal tilted forward and up
    const look = n.clone();
    look.y = 0;
    look.normalize();
    look.applyAxisAngle(Y, side * E.forward);
    look.y = Math.tan(E.up) + n.y * 0.25;
    look.normalize();
    const base = new THREE.Quaternion().setFromUnitVectors(Z, look);
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(eyeGeometry(lod), mats.eye);
    mesh.scale.setScalar(E.r);
    group.add(mesh);
    group.position.copy(centre);
    group.quaternion.copy(base);
    inner.add(group);
    return { side, group, mesh, centre, base, axisY: S.axis(E.t), look: 0, lookV: 0, pitch: 0 };
  });

  // lane:perf — hero detail tiers (setDetailPx): same plan, same materials, fewer triangles while the fish is small on
  // screen. Tier n uses the mesh resolution of lod n; the full mesh is tier 0. A 20 px fish drew ~20k triangles.
  const tierGeo: (FishGeometry | null)[] = [geo, null, null];
  let tier = 0;
  const setTier = (t: number) => {
    if (t === tier) return;
    tier = t;
    const g = (tierGeo[t] ??= acquireFishGeometry(plan, t, quality));
    body.geometry = g.body;
    fins.geometry = g.fins;
    const eg = eyeGeometry(Math.max(lod, t));
    for (const e of eyeData) e.mesh.geometry = eg;
  };

  // ── state ──
  const m = plan.motion;
  const idSeed = hashStr(args.creature?.id ?? args.species.id + (a.patternSeed ?? 0));
  const st = {
    phase: hash1(idSeed) * Math.PI * 2,
    lastAIPhase: Number.NaN,
    bend: 0,
    lag: 0,
    flare: 0,
    puff: 0,
    belly: 0,
    mouth: 0,
    flutter: 0,
    ci: 0.85,
    speed: 0,
    amp: m.idleAmp,
    sacc: 0,
    saccT: hash1(idSeed + 7) * 2,
    hop: 0,
    clamp: 0,
    t0: hash1(idSeed + 3) * 100,
  };
  const k = (Math.PI * 2) / Math.max(0.2, m.wavelength);
  const noseX = S.noseX;
  const span = Math.max(0.05, S.noseX - S.tailX);

  const envJS = (x: number) => {
    const a = Math.max(0, (noseX - x) / span);
    return m.headSway + (a <= 1 ? Math.pow(a, m.envPow) : 1 + Math.min(a - 1, 0.8) * Math.min(m.envPow, 2.5) * 0.3);
  };
  const waveZ = (x: number) => st.amp * envJS(x) * Math.sin(k * (noseX - x) - st.phase) - st.bend * m.bendK * x * x;

  let highlighted = false;

  const obj: FishObject = {
    plan,
    root,
    pickRadius: plan.pickRadius ?? 0.55,
    setHighlight(on: boolean) {
      highlighted = on;
    },
    setDetailPx(px: number) {
      if (lod === 0) setTier(nextDetailTier(px, tier, FISH_DETAIL));
    },
    setScreenSize(px: number) {
      // a few pixels long: the body silhouette is all that reads — skip the separate fin / eye draw calls
      const keepFins = px > 8;
      if (fins.visible !== keepFins) fins.visible = keepFins;
      const keepEyes = px > 22;
      for (const e of eyeData) if (e.group.visible !== keepEyes) e.group.visible = keepEyes;
    },
    update(rt: CreatureRuntime, dt: number, time: number) {
      const d = Math.min(0.1, Math.max(0, dt));
      const dead = rt.pose === 'dead';
      const sleep = rt.sleep ?? 0;
      const speed = dead ? 0 : Math.max(0, rt.speedBL || 0);
      st.speed = approach(st.speed, speed, 6, d);
      const sp01 = clamp01(st.speed / 3);
      // phase: follow the AI phase; keep an idle beat when it is not advancing
      const idleAdv = dead ? 0 : d * Math.PI * 2 * m.idleHz * (1 - sleep * 0.7);
      let adv = idleAdv;
      if (!Number.isNaN(st.lastAIPhase)) {
        const dp = rt.swimPhase - st.lastAIPhase;
        if (dp > 0 && dp < 3 && !dead) adv = Math.max(dp, idleAdv);
      }
      st.lastAIPhase = rt.swimPhase;
      st.phase += adv;
      if (st.phase > 1e4) st.phase -= Math.PI * 2 * 1000;
      const targetAmp = m.idleAmp + (m.amp - m.idleAmp) * smoothstep(0.05, 1.4, st.speed);
      st.amp = approach(st.amp, dead ? 0 : targetAmp * (1 - sleep * 0.6), dead ? 1 : 4, d);
      st.bend = approach(st.bend, clamp(rt.bend || 0, -1, 1), 7, d);
      st.lag = approach(st.lag, st.bend, 2.2, d);
      st.flare = approach(st.flare, clamp01(rt.finFlare || 0), rt.finFlare > st.flare ? 7 : 3, d);
      st.puff = approach(st.puff, clamp01(rt.puff || 0), rt.puff > st.puff ? 5 : 1.2, d);
      st.belly = approach(st.belly, clamp01(rt.belly || 0), 1.5, d);
      st.mouth = approach(st.mouth, clamp01(rt.mouthOpen || 0), 16, d);
      const hoverFlutter = m.idleFlutter * (1 - sp01 * 0.6) * (1 - sleep * 0.7);
      st.flutter = approach(st.flutter, Math.max(clamp01(rt.flutter || 0), hoverFlutter), 5, d);
      const ci = rt.colorIntensity === undefined || Number.isNaN(rt.colorIntensity) ? 0.85 : clamp01(rt.colorIntensity);
      st.ci = approach(st.ci, ci, 1.5, d);
      // fin clamping: a real welfare cue — stressed fish fold their fins, sleeping fish relax them, dead fish collapse
      const clampT = dead ? 1 : Math.max(smoothstep(0.62, 0.3, st.ci) * 0.7, sleep * 0.35);
      st.clamp = approach(st.clamp, clampT, 1.2, d);
      u.uStateA.value.x = st.clamp;
      const t = time + st.t0;

      u.uSwimA.value.set(st.phase, st.amp, k, st.bend);
      u.uSwimC.value.set(t, sp01, m.bendK, m.finSoft);
      u.uShapeA.value.set(st.puff, st.belly, a.bodyDepth ?? 1, st.mouth);
      u.uShapeB.value.set(st.flare * (m.gillFlare ?? 0), st.flutter, st.flare, m.sag);
      // opercular pumping: the AI's gill pulse when it provides one, else a calm breathing rhythm
      const gill = rt.gillFlick > 0.001 ? clamp01(rt.gillFlick) : 0.5 + 0.5 * Math.sin(t * 5.2);
      u.uLag.value.set((st.lag - st.bend) * 1.6 + st.bend * 0.25, smoothstep(1.2, 4.5, st.speed), (m.breathe ?? 0.6) * (1 - sp01 * 0.5) * gill, m.finLag);
      u.uLookE.value.x = st.ci;
      u.uLookE.value.y = highlighted ? 0.85 + 0.15 * Math.sin(time * 3) : 0;

      // species body motion: clownfish waddle, mandarin hop
      if (m.waddle) {
        const w = m.waddle * (0.35 + 0.65 * sp01 + 0.3 * st.flutter);
        inner.rotation.x = Math.sin(st.phase) * w;
        inner.rotation.y = Math.sin(st.phase + 0.9) * w * 0.35;
      }
      if (m.hop) {
        const hopping = rt.gait === 'hop' || (st.speed > 0.05 && st.speed < 1.2);
        st.hop = approach(st.hop, hopping ? 1 : 0, 3, d);
        const hp = Math.pow(Math.max(0, Math.sin(t * 3.1)), 2);
        inner.position.y = m.hop * hp * st.hop;
      }

      // eyes follow the head and swivel
      st.saccT -= d;
      if (st.saccT <= 0) {
        st.sacc = (Math.random() - 0.5) * 0.35;
        st.saccT = 0.6 + Math.random() * 2.2;
      }
      const sw = E.swivel ?? 0.5;
      const pwEye = st.puff * (0.32 + 0.6 * smoothstep(0.4, -0.95, E.yn)) * smoothstep(0, 0.22, E.t) * smoothstep(1, 0.55, E.t);
      const depthK = a.bodyDepth ?? 1;
      for (const e of eyeData) {
        const x = e.centre.x;
        const z0 = waveZ(x);
        const dz = (waveZ(x + 0.003) - waveZ(x - 0.003)) / 0.006;
        e.group.position.set(x, e.axisY + (e.centre.y - e.axisY) * depthK * (1 + pwEye), e.centre.z * (1 + pwEye) + z0);
        const aiLook = e.side > 0 ? rt.eyeR || 0 : rt.eyeL || 0;
        const target = clamp(aiLook * sw * 2 + st.sacc * (0.4 + sw), -1.1, 1.1);
        e.look = approach(e.look, target, 18, d);
        _q.setFromAxisAngle(Y, -Math.atan(dz));
        _q2.setFromAxisAngle(Y, e.look * e.side);
        _q.multiply(_q2);
        _q2.setFromAxisAngle(X, st.sacc * 0.3 * e.side);
        _q.multiply(_q2).multiply(e.base);
        e.group.quaternion.copy(_q);
        const es = 1 + st.puff * 0.08;
        e.group.scale.setScalar(es);
      }
      void _v;
    },
    dispose() {
      mats.body.dispose();
      mats.fins.dispose();
      mats.eye.dispose();
      depthMat?.dispose();
      for (const g of tierGeo) if (g) releaseFishGeometry(g);
      root.removeFromParent();
    },
  };
  return obj;
}
