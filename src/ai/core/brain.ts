/**
 * The per-creature brain: interrupts (food, breath, breeding, night, pointer, stress), a weighted planner for idle
 * activities (species profile × personality × hunger × stress × illness × time of day), stimulus reactions (glass
 * taps) and initial placement. `stepAgent` is the full per-frame pipeline. OWNER: lane "behavior".
 */
import * as THREE from 'three';
import type { Agent } from './agent';
import { resetControl } from './agent';
import type { AIWorld, Stimulus } from './world';
import type { ActId } from './sets';
import { ACTS, appetite, breedingActFor, chooseFood, isLivePrey, startAct } from './acts';
import { bodyFits, locomote, takeOff, tryLand } from './loco';
import { cosmetics, writeOrientation } from './cosmetics';
import { clamp, clamp01, lerp, rchance, rdur, rnd, rrange, safeNormalize } from './math';
import { SURF_FLOOR, floorAt, nearestSurface, pointFree } from './env';
import { bodyHY, bodySide, findParticle, randomSurfacePoint, randomSwimPoint } from './nav';
import { consumeSpitRequest, spitRequested, spitWeight } from './spit'; // lane:brackish

const SWIM_ACTS = new Set<ActId>(['cruise', 'breathe', 'startle', 'cleaning', 'dead', 'gasp', 'reposition']);
const STICKY = new Set<ActId>(['school', 'hitch', 'host', 'graze', 'burrow', 'perch', 'clean_station', 'still', 'patrol']);
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();

// ───────────────────────────── activeness (time of day, personality, health) ─────────────────────────────

function updateActiveness(a: Agent, w: AIWorld): void {
  const env = w.env;
  const tr = a.sp.behaviorTraits;
  const noct = clamp01(tr.nocturnal + a.mods.nocturnal * 0.35 + (a.tags.has('night_owl') ? 0.35 : 0));
  const day = env.daylight;
  let act = lerp(day, 0.35 + 0.65 * (1 - day), noct);
  act = Math.max(act, 0.06);
  act *= 1 - a.ill * 0.55;
  act *= 0.65 + 0.35 * a.energy;
  a.activeness = clamp01(act);
}

// ───────────────────────────── planner ─────────────────────────────

const WEIGHTS: Partial<Record<ActId, number>> = {};
const CANDIDATES: ActId[] = [];

function addW(act: ActId, w: number) {
  if (!(w > 0)) return;
  if (WEIGHTS[act] === undefined) CANDIDATES.push(act);
  WEIGHTS[act] = (WEIGHTS[act] ?? 0) + w;
}

const RESTFUL = new Set<ActId>(['rest', 'hide', 'sleep']);

/** Choose the next idle activity. */
export function plan(a: Agent, w: AIWorld): void {
  CANDIDATES.length = 0;
  for (const k in WEIGHTS) delete WEIGHTS[k as ActId];
  if (a.dead) {
    startAct(a, w, 'dead');
    return;
  }
  const b = breedingActFor(a, w);
  if (b && startAct(a, w, b)) return;
  for (const k in a.set.acts) addW(k as ActId, a.set.acts[k as ActId] ?? 0);
  const env = w.env;
  const t = a.tags;
  // conditional social acts
  if (a.setId === 'clownfish') {
    let others = 0;
    for (const o of w.agents) if (o !== a && !o.dead && o.speciesId === a.speciesId) others++;
    if (others > 0) {
      const dominant = a.rank === 0;
      addW('pair_follow', dominant ? 0.4 : 3);
      if (dominant) addW('display', 0.4);
    }
  }
  if (a.setId === 'seahorse' && a.partnerId && w.byId.has(a.partnerId)) addW('pair_follow', 0.6);
  if (a.sp.category === 'fish' && a.set.loco === 'swim' && w.agents.some((o) => o.setId === 'shrimp_cleaner' && o.act === 'clean_station' && o.actPhase >= 1)) addW('visit_cleaner', 0.35);
  if ((a.setId === 'goldfish' || t.has('food_obsessed') || a.setId === 'betta' || a.setId === 'pea_puffer' || a.setId === 'cichlid_discus') && a.hunger > 0.45) addW('beg', (a.hunger - 0.3) * (a.setId === 'goldfish' ? 3 : 1.5));
  if (a.setId === 'betta' && a.c.sex !== 'female' && env.daylight > 0.5 && (t.has('nest_builder') || (a.stress < 0.25 && a.hunger < 0.5))) addW('nest_build', t.has('nest_builder') ? 0.3 : 0.07);
  if (a.setId === 'livebearer' && a.c.sex !== 'male') delete WEIGHTS.display;
  if (a.sp.behaviorTraits.glassSurfing > 0.02 && a.stress > 0.55) addW('glass_surf', a.sp.behaviorTraits.glassSurfing * (a.stress - 0.5) * 30);
  // lane:brackish — archerfish take the odd shot at a fly above the water (calm, daylit, off cooldown, one per tank)
  const spitW = spitWeight(a, w);
  if (spitW > 0) addW('spit', spitW);
  // lane:brackish — mollies graze algae off rocks, roots, plants and glass; male bumblebee gobies flare at rivals
  if (a.sp.specialBehaviors?.includes('graze_surfaces')) {
    // (their picking replaces the livebearer's nose-down bottom forage)
    addW('inspect_decor', 1.4 * (0.6 + a.hunger) + (WEIGHTS.forage ?? 0));
    delete WEIGHTS.forage;
  }
  if (a.sp.specialBehaviors?.includes('territory_flare') && a.c.sex === 'male' && !a.juvenile) addW('display', 0.3);
  // modulation
  const active = 0.25 + a.activeness;
  const lazy = 1 + (1 - a.activeness) * 3 + a.ill * 3 + (1 - a.energy) * 1.5;
  for (const act of CANDIDATES) {
    let wt = WEIGHTS[act] ?? 0;
    if (RESTFUL.has(act)) wt *= lazy;
    else if (act !== 'hitch' && act !== 'host' && act !== 'burrow' && act !== 'perch' && act !== 'still') wt *= active * (1 - a.ill * 0.6);
    switch (act) {
      case 'cruise':
      case 'crawl_explore':
      case 'patrol':
        if (t.has('explorer')) wt *= 1.5;
        if (t.has('homebody')) wt *= 0.65;
        break;
      case 'hover':
      case 'perch':
      case 'host':
      case 'rest':
        if (t.has('homebody')) wt *= 1.35;
        break;
      case 'inspect_decor':
        if (t.has('decor_inspector')) wt *= 2.4;
        if (t.has('explorer')) wt *= 1.3;
        break;
      case 'inspect_glass':
        if (t.has('glass_curious')) wt *= 2.6;
        if (t.has('showoff')) wt *= 1.4;
        if (t.has('shy')) wt *= 0.35;
        if (t.has('bold')) wt *= 1.3;
        wt *= 0.6 + a.mods.curiosity * 0.8;
        break;
      case 'display':
        if (t.has('showoff')) wt *= 2.2;
        wt *= 0.5 + a.mods.displayDrive;
        break;
      case 'hide':
        wt *= (1 + a.stress * 4) * (t.has('shy') ? 2 : 1) * (t.has('bold') ? 0.5 : 1) * (1.4 - a.mods.boldness * 0.8);
        if (a.sp.behaviorTraits.nocturnal > 0.5 && env.daylight > 0.5) wt *= 2;
        break;
      case 'forage':
      case 'graze':
        wt *= 1 + a.hunger * 1.5;
        if (t.has('food_obsessed')) wt *= 1.3;
        break;
      case 'beg':
        if (t.has('food_obsessed')) wt *= 2;
        break;
    }
    // avoid robotic repetition — but keep "home" habits sticky
    if (act === a.act && !STICKY.has(act)) wt *= 0.45;
    WEIGHTS[act] = wt;
  }
  // weighted pick with fallbacks
  for (let tries = 0; tries < 5; tries++) {
    let total = 0;
    for (const act of CANDIDATES) total += WEIGHTS[act] ?? 0;
    if (total <= 0) break;
    let r = rnd(a) * total;
    let pick: ActId = CANDIDATES[0];
    for (const act of CANDIDATES) {
      r -= WEIGHTS[act] ?? 0;
      if (r <= 0) {
        pick = act;
        break;
      }
    }
    if (startAct(a, w, pick)) return;
    WEIGHTS[pick] = 0;
  }
  // fallbacks that always work
  if (a.loco === 'sessile') startAct(a, w, 'still');
  else if (a.set.loco === 'crawl' || a.set.loco === 'walk') {
    if (!startAct(a, w, 'rest')) startAct(a, w, 'still');
  } else if (!startAct(a, w, 'hover')) startAct(a, w, 'cruise');
}

// ───────────────────────────── interrupts ─────────────────────────────

function think(a: Agent, w: AIWorld): void {
  updateActiveness(a, w);
  if (a.dead) {
    if (a.act !== 'dead') startAct(a, w, 'dead');
    return;
  }
  const env = w.env;
  const cur = ACTS[a.act].prio;
  // breeding stage (sim-driven)
  const b = breedingActFor(a, w);
  if (b && b !== a.act && ACTS[b].prio > cur) {
    if (startAct(a, w, b)) {
      a.lastInterrupt = `breeding:${a.stage}`;
      return;
    }
  }
  if (!b && (a.act === 'court' || a.act === 'spawn' || a.act === 'guard' || a.act === 'brood' || (a.act === 'nest_build' && a.actT > 20))) {
    a.actDur = 0;
    return;
  }
  // food
  if (cur < 60 && w.food.length) {
    const p = chooseFood(a, w);
    if (p) {
      // (going back to the piece it just let go of — the blocked-detector cut the act — keeps the pursuit clock; one
      // let go of a while ago (startled, full, asleep) is a fresh pursuit, or it would be given up within a frame)
      if (p.id !== a.foodId && (p.id !== a.lastFoodId || w.time - a.foodDropT > 3)) a.foodT = w.time;
      a.foodId = p.id;
      if (startAct(a, w, isLivePrey(a, p) ? 'hunt' : 'feed')) {
        a.lastInterrupt = 'food';
        return;
      }
    }
  }
  // air breathing (labyrinth fish, axolotls, corydoras, frogs)
  if (a.set.airBreath && w.time >= a.breathNext && cur < 58) {
    if (startAct(a, w, 'breathe')) {
      a.lastInterrupt = 'air';
      return;
    }
  }
  // hypoxia: fish gasp at the surface (a husbandry warning sign)
  if (!a.set.airBreath && env.oxygen < 0.42 && cur < 45 && a.sp.category === 'fish' && rchance(a, 0.05 * (1 - env.oxygen))) {
    if (startAct(a, w, 'gasp')) {
      a.lastInterrupt = 'low oxygen';
      return;
    }
  }
  // night
  const sleepy = a.activeness < 0.3 - ((a.noiseOff * 3.1) % 1) * 0.08;
  if (sleepy && cur < 35 && a.act !== 'sleep' && a.act !== 'hitch' && a.act !== 'burrow' && a.loco !== 'sessile') {
    if (startAct(a, w, 'sleep')) {
      a.lastInterrupt = 'night';
      return;
    }
  }
  // the player's finger at the glass
  if (env.pointerActive && env.focused && w.time - env.pointerMoveT < 2 && cur < 30 && a.act !== 'follow_pointer' && a.set.loco !== 'crawl') {
    if (w.time - a.lastPointerInterestT > 6) {
      a.lastPointerInterestT = w.time;
      const tr = a.sp.behaviorTraits;
      let interest = tr.curiosity * 0.55 + a.mods.curiosity * 0.35 + a.hunger * 0.25 - a.stress * 0.4;
      if (a.tags.has('glass_curious')) interest += 0.3;
      if (a.tags.has('showoff')) interest += 0.1;
      if (a.tags.has('shy')) interest -= 0.3;
      if (a.act === 'sleep') interest -= 0.4;
      a.pointerInterest = clamp01(interest);
      const d = a.rt.pos.distanceTo(env.pointer);
      const reach = 0.25 + interest * 0.5;
      if (interest > 0.45 + rnd(a) * 0.3 && d < reach) {
        if (startAct(a, w, 'follow_pointer')) {
          a.lastInterrupt = 'pointer';
          return;
        }
      }
    }
  }
  // lane:brackish — QA: window.__AQ_SPIT() asks an idle archerfish to take a shot now
  if (cur < 20 && a.act !== 'spit' && spitRequested(a, w) && startAct(a, w, 'spit')) {
    consumeSpitRequest(w);
    a.lastInterrupt = 'qa: spit';
    return;
  }
  // stress: hide or (a stress sign, never a reward) glass surfing
  if (a.stress > 0.62 && cur < 20 && rchance(a, 0.06)) {
    const gs = a.sp.behaviorTraits.glassSurfing;
    if (startAct(a, w, gs > 0.03 && rchance(a, gs * 4) ? 'glass_surf' : 'hide')) {
      a.lastInterrupt = 'stress';
      return;
    }
  }
  // hungry animals with nothing to eat keep an eye out (goldfish begging, foraging)
  if (a.hunger > 0.7 && cur <= 10 && rchance(a, 0.02) && appetite(a) > 0.8) {
    if (startAct(a, w, a.set.acts.forage || a.set.acts.graze ? (a.set.acts.graze ? 'graze' : 'forage') : 'beg')) a.lastInterrupt = 'hungry';
  }
}

// ───────────────────────────── stimuli (glass taps) ─────────────────────────────

function processStimuli(a: Agent, w: AIWorld): void {
  const list = w.stimuli;
  if (!list.length) return;
  const last = w.lastStim.get(a.id) ?? 0;
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.id <= last) continue;
    const d = a.rt.pos.distanceTo(s.pos);
    // the vibration reaches nearby animals first; each has its own reaction latency
    const delay = d / 1.4 + 0.03 + (1 - a.mods.startle) * 0.12 + ((a.noiseOff * 13.7) % 1) * 0.08;
    if (w.time - s.t < delay) break;
    w.lastStim.set(a.id, s.id);
    react(a, w, s, d);
  }
}

function react(a: Agent, w: AIWorld, s: Stimulus, d: number): void {
  if (a.dead || a.loco === 'sessile') return;
  const env = w.env;
  let sens = a.set.startleSens * (0.55 + a.mods.startle * 0.9);
  if (a.tags.has('easily_startled')) sens *= 1.4;
  if (a.tags.has('bold')) sens *= 0.75;
  if (a.act === 'sleep') sens *= 1.3;
  sens *= 1 + Math.min(env.tapPressure, 10) * 0.05;
  const I = s.strength * Math.exp(-d / (s.spam ? 0.4 : 0.24)) * sens * (s.spam ? 1.8 : 1) * (env.reducedMotion ? 0.7 : 1);
  if (I < 0.16) return;
  a.fright = Math.max(a.fright, clamp01(I));
  a.frightFrom.copy(s.pos);
  a.lastStartleT = w.time;
  if (a.set.school) {
    const sc = w.schools.get(a.speciesId);
    if (sc) sc.alarm = Math.max(sc.alarm, clamp01(I));
  }
  // pea puffer: inflation ONLY on genuine, extreme fright — rare, and never rewarded
  if (a.setId === 'pea_puffer' && s.spam && a.stress > 0.6 && I > 0.9 && w.time - a.lastPuffT > 600 && rchance(a, 0.12)) {
    a.puff = 1;
    a.lastPuffT = w.time;
  }
  const bold = a.mods.boldness > 0.62 || a.tags.has('bold');
  if (!s.spam && bold && I < 0.75 && a.set.startle === 'dart' && a.act !== 'feed' && rchance(a, 0.75)) {
    startAct(a, w, 'inspect_tap');
    return;
  }
  if (a.set.startle === 'burrow') {
    startAct(a, w, 'burrow');
    a.actPhase = 2;
    a.actTimer = 0;
    return;
  }
  if (a.act === 'hitch' && a.set.startle === 'freeze') {
    // seahorse: grips tighter and waits it out
    a.actDur = Math.max(a.actDur, a.actT + 4);
    return;
  }
  startAct(a, w, 'startle');
  if (I > 0.5 && w.hooks.event) w.hooks.event('startle', a.rt.pos, a.id, I);
}

// ───────────────────────────── placement ─────────────────────────────

/** Place a new agent sensibly for its zone — never inside decor. Keeps an existing valid runtime position. */
export function initialPlacement(a: Agent, w: AIWorld, keepExisting: boolean): void {
  const env = w.env;
  const pos = a.rt.pos;
  const side = bodySide(a);
  const valid =
    keepExisting &&
    Number.isFinite(pos.x + pos.y + pos.z) &&
    pos.x > env.minX + side &&
    pos.x < env.maxX - side &&
    pos.z > env.minZ + side &&
    pos.z < env.maxZ - side &&
    pos.y > floorAt(env, pos.x, pos.z) &&
    pos.y < env.surfaceY &&
    pointFree(env, pos.x, pos.y, pos.z, side * 0.8);
  a.loco = a.set.loco;
  a.aim.set(0, 0, 0);
  const ang = rrange(a, 0, Math.PI * 2);
  a.fwd.set(Math.cos(ang), 0, Math.sin(ang) * 0.5).normalize();
  if (!valid || !bodyFits(a, w, pos, a.fwd)) {
    // try several spots and headings until the whole body (nose to tail) fits
    for (let i = 0; i < 40; i++) {
      if (a.set.loco === 'crawl' || a.set.loco === 'walk' || a.set.loco === 'sessile') {
        randomSurfacePoint(a, w, a.set.loco === 'crawl' ? a.set.crawlMask & ~2 || SURF_FLOOR : SURF_FLOOR, pos, _n);
        a.surfN.copy(_n);
        a.upVis.copy(_n);
      } else if (a.set.bottomHugger) {
        randomSwimPoint(a, w, pos, { y0: env.floorY + side + a.L * 0.2, y1: env.floorY + side + a.L * 0.8 });
      } else {
        randomSwimPoint(a, w, pos);
      }
      const th = rrange(a, 0, Math.PI * 2);
      a.fwd.set(Math.cos(th), 0, Math.sin(th) * 0.4).normalize();
      if (a.set.loco === 'crawl' || a.set.loco === 'walk' || a.set.loco === 'sessile') {
        a.fwd.addScaledVector(a.surfN, -a.fwd.dot(a.surfN));
        safeNormalize(a.fwd, _v.set(1, 0, 0));
      }
      if (bodyFits(a, w, pos, a.fwd)) break;
    }
  } else if (a.set.loco === 'crawl' || a.set.loco === 'walk') {
    const hit = nearestSurface(env, pos, a.set.loco === 'walk' ? SURF_FLOOR : a.set.crawlMask || SURF_FLOOR, a.hit);
    a.surfN.copy(hit.kind === 'none' ? _v.set(0, 1, 0) : hit.n);
    a.upVis.copy(a.surfN);
  }
  if (a.set.loco === 'crawl' || a.set.loco === 'walk' || a.set.loco === 'sessile') {
    a.fwd.addScaledVector(a.surfN, -a.fwd.dot(a.surfN));
    safeNormalize(a.fwd, _v.set(1, 0, 0));
  }
  a.loco = a.set.loco;
  a.rt.yaw = Math.atan2(-a.fwd.z, a.fwd.x);
  a.rt.pitch = 0;
  a.rt.roll = 0;
  a.rt.swimPhase = rrange(a, 0, 6.28);
  a.breathNext = w.time + (a.set.airBreath ? rrange(a, 0.25, 1) * a.set.airBreath[0] : 1e9);
  a.gillNext = w.time + rrange(a, 1, 6);
  a.eyeNextL = w.time + rrange(a, 0, 1);
  a.eyeNextR = w.time + rrange(a, 0, 1.2);
  a.appendageNext = w.time + rrange(a, 2, 10);
  a.nextThink = w.time + rrange(a, 0, 0.4);
  a.actDur = 0; // plan on the first step
  a.act = 'still';
  a.rt.visible = true;
  if (a.dead) a.act = 'dead';
}

// ───────────────────────────── per-frame pipeline ─────────────────────────────

/** Is the particle a walker is feeding on still well above the bottom (worth swimming for)? */
function foodHigh(a: Agent, w: AIWorld): boolean {
  const p = findParticle(w, a.foodId);
  return !!p && p.pos.y > floorAt(w.env, p.pos.x, p.pos.z) + a.L * 0.5;
}

export function stepAgent(a: Agent, w: AIWorld, dt: number): void {
  resetControl(a.ctrl);
  a.actT += dt;
  processStimuli(a, w);
  if (w.time >= a.nextThink) {
    think(a, w);
    a.nextThink = w.time + rrange(a, 0.22, 0.55);
  }
  // a walker boxed in by decor and glass swims out and lands somewhere it fits
  if (a.wedgeSwim) {
    a.wedgeSwim = false;
    if (!a.dead && a.act !== 'reposition' && startAct(a, w, 'reposition')) a.wedgeDir.set(0, 0, 0);
  }
  // a walker that has been unable to take a step toward its goal for a while gives up on it and picks something else
  if (a.blockedT > 1) {
    a.blockedT = 0;
    // stuck again soon after (facing a stone with no room to turn a long body): push off and swim to open floor
    a.blockedHits = w.time - a.lastBlockedAt < 25 ? a.blockedHits + 1 : 1;
    a.lastBlockedAt = w.time;
    if (a.blockedHits >= 2 && a.set.canSwim && !a.dead && startAct(a, w, 'reposition')) a.blockedHits = 0;
    else a.actDur = Math.min(a.actDur, a.actT);
  }
  if (a.actT >= a.actDur) {
    if (a.act === 'startle' && !a.dead) {
      // after a startle: shy animals take cover, bold ones resume
      const shy = a.mods.boldness < 0.45 || a.tags.has('shy') || a.fright > 0.7;
      if (!(shy && a.set.startle === 'dart' && startAct(a, w, 'retreat'))) plan(a, w);
    } else plan(a, w);
  }
  if (!ACTS[a.act].tick(a, w, dt)) {
    plan(a, w);
    resetControl(a.ctrl);
    ACTS[a.act].tick(a, w, dt);
  }
  // crawlers/walkers that swam (short swim, gulp, tail flip) settle back onto a surface
  // (a walker after sinking food keeps swimming for it; once the piece lies near the bottom it comes down to it)
  if (a.loco === 'swim' && (a.set.loco === 'crawl' || a.set.loco === 'walk') && !SWIM_ACTS.has(a.act) && !(a.act === 'feed' && a.set.loco === 'walk' && foodHigh(a, w))) {
    const c = a.ctrl;
    c.allowFloor = true;
    c.avoid = Math.min(c.avoid, 0.4);
    if (!c.hasGoal) {
      c.goal.set(a.rt.pos.x, floorAt(w.env, a.rt.pos.x, a.rt.pos.z) + bodyHY(a), a.rt.pos.z);
      c.hasGoal = true;
      c.arriveR = a.L * 0.5;
    } else if (a.set.loco === 'walk') {
      // keep heading for the activity's goal, but come down to the bottom on the way
      c.goal.y = Math.min(c.goal.y, floorAt(w.env, c.goal.x, c.goal.z) + bodyHY(a));
    }
    c.speedBL = Math.max(c.speedBL, a.sp.behaviorTraits.cruiseSpeed);
    c.pitchBias = Math.min(c.pitchBias, -0.2);
    tryLand(a, w);
  } else if ((a.loco === 'crawl' || a.loco === 'walk') && a.act === 'cruise') {
    takeOff(a);
  }
  // timid animals keep their distance from the finger at the glass
  const env = w.env;
  if (env.pointerActive && env.focused && a.act !== 'follow_pointer' && a.loco !== 'sessile' && a.loco !== 'crawl') {
    const timid = a.mods.boldness < 0.35 || a.tags.has('shy') || a.sp.behaviorTraits.curiosity < 0.25;
    if (timid) {
      _v.subVectors(a.rt.pos, env.pointer);
      const d = _v.length();
      const R = 0.14;
      if (d < R && d > 1e-5) {
        const c = a.ctrl;
        if (!c.hasGoal) {
          c.goal.copy(a.rt.pos);
          c.hasGoal = true;
          c.arriveR = a.L;
        }
        _v.z = Math.min(_v.z, 0);
        c.goal.addScaledVector(_v.normalize(), (R - d) * 1.5);
        c.speedBL = Math.max(c.speedBL, a.sp.behaviorTraits.cruiseSpeed * 1.2);
      }
    }
  }
  // party mode: gentle bobbing on beats (cosmetic; seahorses and crawlers only sway)
  if (env.party > 0 && env.beat > 0.55 && a.loco === 'swim' && !a.dead) a.drift.y += env.beat * env.party * a.L * 0.35 * dt * 8;
  locomote(a, w, dt);
  writeOrientation(a, w, dt);
  cosmetics(a, w, dt);
  a.rt.target = a.ctrl.hasGoal ? a.ctrl.goal : undefined;
}

export { rdur };
