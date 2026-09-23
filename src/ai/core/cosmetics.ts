/**
 * Expressive channels written to CreatureRuntime every frame: tail-beat phase, bend, fins, gills, mouth, eyes,
 * colour, puff, belly, tail curl, sleep — plus the final yaw/pitch/roll. OWNER: lane "behavior".
 */
import * as THREE from 'three';
import type { Agent } from './agent';
import type { AIWorld } from './world';
import { TAU, basisToEuler, clamp, clamp01, damp, rdur, rnd, rrange, wrapAngle } from './math';

const _f = new THREE.Vector3();
const _u = new THREE.Vector3();
const E = { yaw: 0, pitch: 0, roll: 0 };

const INDEPENDENT_EYES = new Set(['pea_puffer', 'seahorse', 'mantis_shrimp', 'dragonet', 'goby_burrow']);
/** Species that visibly fade into night colours while asleep (neon/cardinal stripes, foxface mottling, discus). */
const NIGHT_FADE = new Set(['schooling_small', 'rabbitfish', 'cichlid_discus', 'chromis', 'tang', 'angelfish_dwarf']);

export function cosmetics(a: Agent, w: AIWorld, dt: number): void {
  const rt = a.rt;
  const env = w.env;
  const t = w.time;
  const L = a.L;
  const set = a.set;
  const act = a.act;
  const rm = env.reducedMotion;
  const party = env.party * env.beat;

  // ── speed & gait phase ──
  const moveSpd = a.speed + a.drift.length() * 0.6;
  const speedBL = moveSpd / L;
  rt.speedBL = a.dead ? 0 : clamp(speedBL, 0, 30);
  let f: number;
  if (a.dead) f = 0;
  else if (a.loco === 'crawl' || a.loco === 'walk') {
    rt.gait = set.crawlGait ?? 'crawl';
    f = speedBL > 0.02 ? 0.35 + 2.1 * speedBL : 0.05;
  } else if (a.loco === 'sessile') {
    rt.gait = 'still';
    f = 0.12 + env.flow * 0.2;
  } else if (a.loco === 'upright') {
    rt.gait = speedBL > 0.05 ? 'swim' : 'hover';
    f = (0.25 + 1.6 * speedBL) * set.tailFreq;
  } else {
    rt.gait = speedBL < 0.25 && set.hover > 0.4 ? 'hover' : 'swim';
    // tail-beat frequency grows with speed (≈ U / 0.7L) — small fish beat faster than big ones
    const sizeK = clamp(0.06 / Math.max(L, 0.01), 0.6, 1.5);
    f = (0.55 + 1.35 * speedBL) * set.tailFreq * Math.sqrt(sizeK);
  }
  f = Math.min(f, 11) * (1 + party * 0.25);
  rt.swimPhase = (rt.swimPhase + TAU * f * dt) % (TAU * 512);
  rt.grounded = a.grounded;

  // ── turn rate → bend ──
  let bendTarget = clamp(a.yawRate / Math.max(0.6, a.sp.behaviorTraits.turnRate), -1, 1) * 0.85;
  if (act === 'display' || act === 'court') bendTarget += Math.sin(t * 14 + a.noiseOff) * (rm ? 0.08 : 0.22);
  if (act === 'guard') bendTarget += Math.sin(t * 5 + a.noiseOff) * 0.15; // fanning eggs
  if (act === 'beg' || (act === 'forage' && a.setId === 'goldfish')) bendTarget += Math.sin(t * 7 + a.noiseOff) * 0.18;
  if (a.setId === 'loach_eel' && a.speed > 0.2 * L) bendTarget += Math.sin(rt.swimPhase * 0.5) * 0.3;
  if (t < a.quiverUntil) bendTarget += Math.sin(t * 24 + a.noiseOff) * (rm ? 0.06 : 0.16);
  a.bend = damp(a.bend, clamp(bendTarget, -1, 1), 8, dt);
  rt.bend = a.dead ? 0 : a.bend;

  // ── mouth: buccal pumping + pulses (bites, gulps) ──
  a.mouthPulse = Math.max(0, a.mouthPulse - dt * 7);
  const breathRate = 1.1 + a.stress * 1.6 + (env.oxygen < 0.5 ? 1.5 : 0) + clamp01(speedBL - 1) * 0.6;
  const breath = set.loco === 'crawl' || set.loco === 'sessile' ? 0 : 0.06 + 0.05 * Math.sin(t * TAU * breathRate + a.noiseOff);
  a.mouth = Math.max(breath, a.mouthPulse, act === 'gasp' ? 0.5 + 0.4 * Math.sin(t * 16) : 0);
  rt.mouthOpen = a.dead ? 0.25 : clamp01(a.mouth);

  // ── gills: axolotl flicks, opercula for fish ──
  a.gill = Math.max(0, a.gill - dt * 2.8);
  if (a.setId === 'axolotl' && !a.dead) {
    if (t >= a.gillNext) {
      a.gill = 1;
      const quiet = act === 'rest' || act === 'sleep' ? 0.7 : 1;
      a.gillNext = t + rdur(a, 7 * quiet / (1 + a.stress + (env.oxygen < 0.6 ? 1 : 0)), 0.55);
      if (env.focused && w.hooks.observed) w.hooks.observed('gill_flick', a.id);
    }
    rt.gillFlick = a.gill;
  } else {
    const oper = act === 'display' ? 1 : breath * 1.6;
    rt.gillFlick = a.dead ? 0 : clamp01(Math.max(a.gill, oper));
  }

  // ── fins ──
  let flareT = a.setId === 'lionfish' ? 0.75 : a.setId === 'betta' ? 0.22 : a.setId === 'dartfish' ? 0.35 : 0.1;
  if (act === 'display') flareT = 1;
  else if (act === 'court' || act === 'spawn') flareT = 0.85;
  else if (act === 'guard') flareT = 0.45;
  else if (act === 'visit_cleaner' && a.actPhase >= 1) flareT = 0.7;
  else if (act === 'startle') flareT = 0.6;
  else if (act === 'hunt' && a.setId === 'lionfish') flareT = 1;
  if (a.setId === 'dartfish' && Math.sin(t * 2.3 + a.noiseOff) > 0.93) flareT = 0.9; // firefish dorsal flick
  if (act === 'sleep') flareT *= 0.4;
  flareT = clamp01(flareT + party * 0.35);
  a.flare = damp(a.flare, flareT, flareT > a.flare ? 9 : 2, dt);
  rt.finFlare = a.dead ? 0 : a.flare;

  // pectoral flutter: hovering fish scull hard, cruising fish tuck fins
  let flutT = set.hover * clamp01(1 - speedBL / Math.max(0.3, a.sp.behaviorTraits.cruiseSpeed * 1.2)) * 0.9;
  if (a.setId === 'pea_puffer') flutT = Math.max(flutT, 0.65);
  if (a.loco === 'upright') flutT = a.pose === 'hitched' ? 0.35 : 0.9;
  if (act === 'guard') flutT = 1;
  if (act === 'sleep' || act === 'rest') flutT *= 0.4;
  if (a.grounded && a.loco !== 'upright') flutT *= 0.5;
  a.flutter = damp(a.flutter, clamp01(flutT), 5, dt);
  rt.flutter = a.dead ? 0 : a.flutter;

  // seahorse tail curl
  if (a.loco === 'upright' || a.setId === 'seahorse') {
    const curlT = a.pose === 'hitched' ? 1 : act === 'court' ? 0.5 : act === 'sleep' || act === 'rest' ? 0.9 : 0.25;
    a.tailCurl = damp(a.tailCurl, curlT, curlT > a.tailCurl ? 3 : 1.5, dt);
    rt.tailCurl = a.tailCurl;
  } else rt.tailCurl = 0;

  // ── eyes ──
  const indep = INDEPENDENT_EYES.has(a.setId);
  if (a.ctrl.hasLook && !a.dead) {
    // converge both eyes on the point of interest
    _f.subVectors(a.ctrl.look, rt.pos);
    const ang = wrapAngle(Math.atan2(-_f.z, _f.x) - Math.atan2(-a.fwd.z, a.fwd.x));
    const e = clamp(ang, -0.55, 0.55);
    a.eyeLT = e;
    a.eyeRT = e;
    if (indep && rnd(a) < dt * 0.6) a.eyeNextL = t; // an independent eye still wanders now and then
  }
  if (indep) {
    if (t >= a.eyeNextL) {
      a.eyeLT = rrange(a, -0.6, 0.6);
      a.eyeNextL = t + rdur(a, a.setId === 'mantis_shrimp' ? 0.5 : 1.1, 0.6);
    }
    if (t >= a.eyeNextR) {
      a.eyeRT = rrange(a, -0.6, 0.6);
      a.eyeNextR = t + rdur(a, a.setId === 'mantis_shrimp' ? 0.5 : 1.2, 0.6);
    }
    if (env.focused && a.setId === 'pea_puffer' && act === 'hover' && Math.abs(a.eyeLT - a.eyeRT) > 0.5 && w.hooks.observed) w.hooks.observed('hover_scan', a.id);
  } else if (t >= a.eyeNextL && !a.ctrl.hasLook) {
    const e = rrange(a, -0.2, 0.2);
    a.eyeLT = e;
    a.eyeRT = e;
    a.eyeNextL = t + rdur(a, 1.8, 0.6);
  }
  const sacc = indep ? 14 : 10; // saccades are quick
  a.eyeL = damp(a.eyeL, a.eyeLT, sacc, dt);
  a.eyeR = damp(a.eyeR, a.eyeRT, sacc, dt);
  rt.eyeL = a.dead ? 0 : a.eyeL;
  rt.eyeR = a.dead ? 0 : a.eyeR;

  // ── puff (pea puffer only; never rewarded) ──
  a.puff = Math.max(0, a.puff - dt * 0.11);
  rt.puff = a.setId === 'pea_puffer' ? a.puff : 0;

  // ── belly ──
  a.satiety = Math.max(0, a.satiety - dt * 0.02);
  const st = a.stage;
  let bellyT = clamp01(a.satiety * 0.04);
  if (st === 'pregnant' || st === 'gravid' || st === 'berried' || st === 'brooding' || st === 'laying') {
    const c = a.c.repro;
    let prog = a.reproProg;
    if (!(prog > 0) && c?.carryingUntilHour && c.carryingUntilHour > c.stageSinceHour) prog = clamp01((env.hour - c.stageSinceHour) / (c.carryingUntilHour - c.stageSinceHour));
    const base = st === 'berried' ? 0.55 : st === 'brooding' ? 0.2 : st === 'laying' ? 0.6 * (1 - prog) : 0.3;
    bellyT = Math.max(bellyT, st === 'laying' ? base : base + prog * (1 - base));
    if (a.setId === 'seahorse') bellyT += Math.sin(t * 1.3 + a.noiseOff) * 0.04; // pouch pumping
  }
  a.belly = damp(a.belly, clamp01(bellyT), 1.2, dt);
  rt.belly = a.belly;

  // ── appendages (shrimp picking, claws, feelers, raptorial strike) ──
  a.appendage = Math.max(0, a.appendage - dt * 3.5);
  if ((a.setId === 'crayfish' || a.setId === 'hermit_crab') && t >= a.appendageNext) {
    a.appendage = Math.max(a.appendage, 0.7);
    a.appendageNext = t + rdur(a, 9, 0.6);
  }
  if (a.setId === 'gourami' && (act === 'inspect_decor' || act === 'inspect_glass' || act === 'follow_pointer')) a.appendage = Math.max(a.appendage, 0.5 + 0.5 * Math.sin(t * 2.2));
  if (a.setId === 'shrimp_cleaner' && act === 'clean_station') a.appendage = Math.max(a.appendage, 0.35 + 0.35 * Math.sin(t * 3 + a.noiseOff));
  rt.appendage = a.dead ? 0 : clamp01(a.appendage);

  // ── sleep ──
  a.sleep = damp(a.sleep, act === 'sleep' ? 1 : 0, act === 'sleep' ? 0.3 : 1.5, dt);
  rt.sleep = a.sleep;

  // ── colour ──
  let col = 0.85;
  if (act === 'display' || act === 'court' || act === 'spawn') col = 1;
  col -= a.stress * 0.35 + a.ill * 0.25 + a.fright * 0.25;
  if (act === 'sleep') col -= NIGHT_FADE.has(a.setId) ? 0.3 * a.sleep : 0.1 * a.sleep;
  if (act === 'glass_surf') col -= 0.08;
  col += party * 0.1;
  a.fright = Math.max(0, a.fright - dt * 0.25);
  a.color = damp(a.color, a.dead ? 0.3 : clamp(col, 0.25, 1), 1.5, dt);
  rt.colorIntensity = a.color;

  rt.pose = a.pose;
  rt.behavior = a.behavior;
}

/** Final orientation (yaw/pitch/roll) from the agent's basis. */
export function writeOrientation(a: Agent, w: AIWorld, dt: number): void {
  const rt = a.rt;
  const prevYaw = rt.yaw;
  if (a.dead) {
    rt.pitch = damp(rt.pitch, 0, 1, dt);
    rt.roll = damp(rt.roll, a.loco === 'crawl' ? 0 : Math.PI * 0.5, 0.6, dt);
    a.yawRate = 0;
    return;
  }
  if (a.loco === 'crawl' || a.loco === 'walk') {
    _u.copy(a.upVis);
    _f.copy(a.fwd).addScaledVector(_u, -a.fwd.dot(_u));
    if (_f.lengthSq() < 1e-8) _f.copy(a.fwd);
    _f.normalize();
    basisToEuler(_f, _u, rt.yaw, E);
    rt.yaw = E.yaw;
    // crawlers lift the head a little when inspecting / walking on the floor
    const lift = a.loco === 'walk' || a.ctrl.burrow > 0 ? a.ctrl.pitchBias : 0;
    rt.pitch = E.pitch + lift;
    // curious axolotl head tilt at the glass
    const tilt = a.setId === 'axolotl' && a.act === 'inspect_glass' && a.actPhase >= 1 ? Math.sin(w.time * 0.9 + a.noiseOff) * 0.22 : 0;
    rt.roll = E.roll + tilt;
  } else if (a.loco === 'upright') {
    rt.yaw = Math.atan2(-a.fwd.z, a.fwd.x);
    // lean forward when swimming, into the current when hitched; pivot toward food
    const lean = -clamp(a.speed / Math.max(a.L, 0.01), 0, 1.2) * 0.3 + a.ctrl.pitchBias;
    rt.pitch = damp(rt.pitch, clamp(lean, -0.7, 0.5), 3, dt);
    const sway = Math.sin(w.time * 0.7 + a.noiseOff) * 0.06 * (0.5 + w.env.flow) + (w.env.party > 0 ? w.env.beat * w.env.party * 0.05 : 0);
    rt.roll = damp(rt.roll, sway, 2, dt);
  } else {
    const h = Math.hypot(a.fwd.x, a.fwd.z);
    rt.yaw = h > 1e-4 ? Math.atan2(-a.fwd.z, a.fwd.x) : rt.yaw;
    rt.pitch = Math.asin(clamp(a.fwd.y, -1, 1));
    let rollT = clamp(-a.yawRate * clamp(a.speed / Math.max(a.L, 0.01), 0, 1.5) * 0.12, -0.3, 0.3);
    if (a.ctrl.hasWantUp) {
      _u.copy(a.ctrl.wantUp).addScaledVector(a.fwd, -a.ctrl.wantUp.dot(a.fwd));
      if (_u.lengthSq() > 1e-6) {
        _u.normalize();
        basisToEuler(a.fwd, _u, rt.yaw, E);
        rollT = E.roll;
      }
    }
    if (a.act === 'host' && a.actPhase === 2) rollT += Math.sin(w.time * 6 + a.noiseOff) * 0.35; // anemone bathing wiggle
    if (a.setId === 'axolotl' && a.act === 'inspect_glass' && a.actPhase >= 1) rollT += Math.sin(w.time * 0.9 + a.noiseOff) * 0.25; // curious head tilt
    const cur = rt.roll;
    rt.roll = cur + wrapAngle(rollT - cur) * (1 - Math.exp(-4 * dt));
  }
  a.yawRate = damp(a.yawRate, wrapAngle(rt.yaw - prevYaw) / Math.max(dt, 1e-4), 10, dt);
}
