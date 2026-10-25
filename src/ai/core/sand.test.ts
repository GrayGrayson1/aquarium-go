/**
 * Chunk 16 — the sand dwellers (lane "behavior"): the melanurus wrasse sleeps buried in the sand (in rockwork without a
 * sand bed) and dives into it on a hard fright; the fighting conch keeps to the sand bed, vaults along and rests
 * half-buried; the Nassarius lies buried, comes up for food dropped anywhere on the floor and digs back in. Stub species
 * (an existing species with the new behaviour set) keep the tests independent of the species data.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { SpeciesDefinition } from '@/types';
import { addStimulus, stepWorld, syncWorld, type AIWorld } from './world';
import { colliderSdf, colliderSdfXZ, floorAt } from './env';
import { spawnFood } from './food';
import { bodyHY, bodySide } from './nav';
import { decor, makeTestCreature, makeTestTank, makeTestWorld, speciesWith, stubSpecies } from './testkit';

const DT = 1 / 60;

const WRASSE = stubSpecies('green_chromis', {
  id: 'test_wrasse',
  behaviorSet: 'wrasse',
  adultSizeCm: 12,
  activityZone: ['lower', 'middle', 'decor', 'substrate'],
  feedingStyle: 'picker',
  specialBehaviors: [],
  behaviorTraits: { cruiseSpeed: 1.5, burstSpeed: 6, turnRate: 4, hoverTendency: 0.25, schoolingTightness: 0, restOnBottom: 0, burrowing: 0.9, curiosity: 0.6, nocturnal: 0 },
});
const CONCH = stubSpecies('trochus_snail', {
  id: 'test_conch',
  behaviorSet: 'conch',
  adultSizeCm: 9,
  activityZone: ['substrate', 'bottom'],
  foods: ['detritus', 'biofilm', 'algae_wafer', 'pellet_sinking'],
  specialBehaviors: [],
  behaviorTraits: { cruiseSpeed: 0.06, burstSpeed: 0.4, turnRate: 0.6, restOnBottom: 1, nocturnal: 0.75 },
});
const NASSARIUS = stubSpecies('trochus_snail', {
  id: 'test_nassarius',
  behaviorSet: 'snail_sand',
  adultSizeCm: 2,
  activityZone: ['substrate', 'bottom'],
  foods: ['pellet_sinking', 'mysis', 'detritus'],
  feedingStyle: 'scavenger',
  feedingSpeed: 0.4,
  specialBehaviors: [],
  behaviorTraits: { cruiseSpeed: 0.5, burstSpeed: 1.6, turnRate: 1.5, restOnBottom: 1, nocturnal: 0.8 },
});
const species = speciesWith([WRASSE, CONCH, NASSARIUS]);

function crew(sp: SpeciesDefinition, tankId: string, n: number) {
  return Array.from({ length: n }, (_, i) => makeTestCreature(sp.id, tankId, { species: sp, sizeCm: sp.adultSizeCm * 0.9, temperament: 30 + ((i * 37) % 50), curiosity: 40 + ((i * 53) % 40) }));
}

function reef(id: string, opts: { substrate?: 'sand' | 'bare' | 'gravel' } = {}) {
  return makeTestTank({ id, tierId: 'g40B', waterClass: 'reef', substrate: opts.substrate, decor: [decor('test_rock', -0.22, -0.04, { id: `${id}_rock`, scale: 1.4 }), decor('test_rock', 0.25, -0.08, { id: `${id}_rock2` })] });
}

function run(w: AIWorld, secs: number, each?: (i: number) => void) {
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) {
    stepWorld(w, DT);
    each?.(i);
  }
}

describe('melanurus wrasse (wrasse)', () => {
  it('sleeps buried in the sand, out of sight, through the night', () => {
    const tank = reef('wr_night');
    const w = makeTestWorld(tank, crew(WRASSE, tank.id, 2), 23, {}, species);
    expect(w.env.sandBed).toBe(true);
    run(w, 40);
    let seen = 0;
    run(w, 60, () => {
      for (const a of w.agents) if (a.rt.visible) seen++;
    });
    for (const a of w.agents) {
      expect(a.act, a.behavior).toBe('sleep');
      expect(a.buried).toBeGreaterThan(0.98);
      expect(a.rt.ai.buried).toBeGreaterThan(0.98);
      expect(a.rt.visible).toBe(false);
      expect(a.rt.pos.y).toBeLessThan(floorAt(w.env, a.rt.pos.x, a.rt.pos.z));
    }
    expect(seen).toBe(0);
    // the two did not bury in the same spot
    const [p, q] = w.agents;
    expect(Math.hypot(p.rt.pos.x - q.rt.pos.x, p.rt.pos.z - q.rt.pos.z)).toBeGreaterThan(p.L * 0.6);
  });

  it('in a thin bed it digs only as deep as the sand: its centre never goes under the floor glass', () => {
    const tank = reef('wr_thin');
    tank.substrate = { ...tank.substrate, kind: 'sand', depthCm: 2 };
    const w = makeTestWorld(tank, crew(WRASSE, tank.id, 2), 23, {}, species);
    expect(w.env.sandBed).toBe(true);
    let lowest = Infinity;
    run(w, 100, () => {
      for (const a of w.agents) lowest = Math.min(lowest, a.rt.pos.y - a.L * 0.06);
    });
    for (const a of w.agents) expect(a.act, a.behavior).toBe('sleep');
    expect(lowest).toBeGreaterThan(-1e-3); // tank-local y 0 is the glass under the bed
  });

  it('by day it is always in sight, busy low over rock and sand, pecking, never inside decor', () => {
    const tank = reef('wr_day');
    const w = makeTestWorld(tank, crew(WRASSE, tank.id, 1), 12, {}, species);
    const a = w.agents[0];
    let hidden = 0;
    let low = 0;
    let frames = 0;
    let path = 0;
    let pecks = 0;
    let lastMouth = 0;
    const acts = new Set<string>();
    const bad: string[] = [];
    const prev = a.rt.pos.clone();
    const H = w.env.surfaceY - w.env.floorY;
    run(w, 180, () => {
      frames++;
      if (!a.rt.visible) hidden++;
      if (a.rt.pos.y < w.env.floorY + H * 0.5) low++;
      path += a.rt.pos.distanceTo(prev);
      prev.copy(a.rt.pos);
      acts.add(a.act);
      // (a peck opens the mouth wide: the pulse, one frame decayed, is above 0.8; breathing never is)
      if (a.act === 'forage' && a.rt.mouthOpen > 0.8 && lastMouth <= 0.8) pecks++;
      lastMouth = a.act === 'forage' ? a.rt.mouthOpen : 0;
      const p = a.rt.pos;
      if (p.y < floorAt(w.env, p.x, p.z) || p.y > w.env.surfaceY) bad.push(`out of the water y=${p.y.toFixed(3)}`);
      for (const c of w.env.colliders) if (c.hard && c.decorId !== a.ctrl.ignoreDecor && colliderSdf(c, p.x, p.y, p.z) < -0.004) bad.push(`inside ${c.decorId} (${a.act})`);
    });
    expect(bad.slice(0, 5)).toEqual([]);
    expect(hidden).toBe(0);
    expect(acts.has('forage')).toBe(true);
    expect(low / frames).toBeGreaterThan(0.6);
    expect(path).toBeGreaterThan(a.L * 20);
    expect(pecks).toBeGreaterThan(20);
    expect(a.rt.ai.buried).toBe(0);
  });

  it('turns in before the other fish and gets up after them; comes up out of the sand smoothly', () => {
    const tank = reef('wr_bed');
    const chromis = makeTestCreature('green_chromis', tank.id, { id: 'chr' });
    const creatures = [...crew(WRASSE, tank.id, 1), chromis];
    // dusk: lights go off at 22:00 — at 21:42 the wrasse is in the sand, the chromis still up
    const w = makeTestWorld(tank, creatures, 21.7, {}, species);
    const wr = w.agents.find((a) => a.sp.id === WRASSE.id)!;
    const ch = w.byId.get('chr')!;
    run(w, 40);
    expect(wr.act).toBe('sleep');
    expect(wr.rt.visible).toBe(false);
    expect(ch.act).not.toBe('sleep');
    // morning: lights on at 07:00 — at 07:24 still buried (the chromis long up), by 09:00 it is out
    syncWorld(w, { tank, creatures, clutches: [], hour: 7.4, refreshInfo: true });
    run(w, 10);
    expect(wr.act).toBe('sleep');
    expect(wr.rt.visible).toBe(false);
    expect(ch.act).not.toBe('sleep');
    syncWorld(w, { tank, creatures, clutches: [], hour: 9, refreshInfo: true });
    let maxStep = 0;
    let lastY = wr.rt.pos.y;
    let outAt = -1;
    run(w, 8, (i) => {
      maxStep = Math.max(maxStep, Math.abs(wr.rt.pos.y - lastY));
      lastY = wr.rt.pos.y;
      if (outAt < 0 && wr.rt.visible && wr.rt.pos.y > floorAt(w.env, wr.rt.pos.x, wr.rt.pos.z) + bodySide(wr)) outAt = i * DT;
    });
    expect(wr.act).not.toBe('sleep');
    expect(wr.rt.visible).toBe(true);
    expect(outAt).toBeGreaterThan(0.2);
    expect(outAt).toBeLessThan(4);
    // (no pop out of the sand: never more than a tenth of a body length a frame)
    expect(maxStep).toBeLessThan(wr.L * 0.1);
  });

  it('without a sand bed it sleeps wedged in the rockwork, in sight and on top of the bed', () => {
    for (const substrate of ['bare', 'gravel'] as const) {
      const tank = reef(`wr_${substrate}`, { substrate });
      const w = makeTestWorld(tank, crew(WRASSE, tank.id, 1), 23, {}, species);
      expect(w.env.sandBed).toBe(false);
      const a = w.agents[0];
      run(w, 60);
      expect(a.act).toBe('sleep');
      expect(a.sandMode).toBe(false);
      expect(a.rt.visible).toBe(true);
      expect(a.buried).toBe(0);
      expect(a.rt.pos.y).toBeGreaterThan(floorAt(w.env, a.rt.pos.x, a.rt.pos.z));
      // at a cave or hide in one of the rocks
      expect([`wr_${substrate}_rock`, `wr_${substrate}_rock2`]).toContain(a.actTarget);
      expect(a.rt.pos.distanceTo(a.anchorPos)).toBeLessThan(a.L * 1.2);
    }
  });

  it('when the sand under it is swapped for gravel it comes up and sleeps in the rockwork', () => {
    const tank = reef('wr_swap');
    const creatures = crew(WRASSE, tank.id, 1);
    const w = makeTestWorld(tank, creatures, 23, {}, species);
    const a = w.agents[0];
    run(w, 40);
    expect(a.rt.visible).toBe(false);
    tank.substrate = { kind: 'gravel', depthCm: 4, color: '#7d7368' };
    syncWorld(w, { tank, creatures, clutches: [], hour: 23, refreshInfo: true });
    expect(w.env.sandBed).toBe(false);
    run(w, 40);
    expect(a.act).toBe('sleep');
    expect(a.rt.visible).toBe(true);
    expect(a.buried).toBe(0);
    expect(a.sandMode).toBe(false);
  });

  it('a hard fright by day sends it into the sand for a while; then it comes back out', () => {
    const tank = reef('wr_fright');
    const w = makeTestWorld(tank, crew(WRASSE, tank.id, 1), 12, {}, species);
    const a = w.agents[0];
    run(w, 10);
    // hammering on the glass right in front of it
    for (let k = 0; k < 4; k++) {
      addStimulus(w, 'tap', new THREE.Vector3(a.rt.pos.x, a.rt.pos.y, w.env.maxZ), 1, true);
      run(w, 0.3);
    }
    let dived = false;
    run(w, 4, () => {
      if (a.act === 'sand_dive' && !a.rt.visible) dived = true;
    });
    expect(dived).toBe(true);
    let outAgain = -1;
    run(w, 90, (i) => {
      if (outAgain < 0 && a.act !== 'sand_dive' && a.rt.visible) outAgain = i * DT;
    });
    expect(outAgain).toBeGreaterThan(0);
    expect(a.rt.visible).toBe(true);
  });
});

describe('fighting conch (conch)', () => {
  it('keeps to the sand bed (never glass or rock); half-buried much of the day, vaulting about at night', () => {
    const tank = reef('conch_soak');
    const creatures = crew(CONCH, tank.id, 3);
    const w = makeTestWorld(tank, creatures, 12, {}, species);
    const bad: string[] = [];
    const was = new Map<string, number>();
    const tally = () => ({ vaults: 0, moveFrames: 0, pausedInMove: 0, halfBuried: 0, frames: 0 });
    const soak = (secs: number) => {
      const t = tally();
      run(w, secs, () => {
        for (const a of w.agents) {
          const p = a.rt.pos;
          const fy = floorAt(w.env, p.x, p.z);
          const hy = bodyHY(a);
          t.frames++;
          if (a.surfId !== -2) bad.push(`${a.id} off the floor (surface ${a.surfId}, ${a.act})`);
          if (p.y < fy - hy * 1.1 || p.y > fy + hy * 1.1 + a.L * 0.08) bad.push(`${a.id} y ${(p.y - fy).toFixed(4)} off the sand (${a.act})`);
          if (p.x < w.env.minX || p.x > w.env.maxX || p.z < w.env.minZ || p.z > w.env.maxZ) bad.push(`${a.id} through the glass`);
          for (const c of w.env.colliders) if (c.hard && c.rise > a.L * 0.6 && colliderSdfXZ(c, p.x, p.z) < -0.004) bad.push(`${a.id} inside ${c.decorId}`);
          if (!a.rt.visible) bad.push(`${a.id} hidden`);
          if (a.lurch > 0 && (was.get(a.id) ?? 0) === 0) t.vaults++;
          was.set(a.id, a.lurch);
          if (a.ctrl.hasGoal && a.sink < 0.2 && (a.act === 'graze' || a.act === 'crawl_explore') && a.actPhase === 0) {
            t.moveFrames++;
            if (a.speed === 0) t.pausedInMove++;
          }
          if (a.buried > 0.4 && a.buried < 0.6) t.halfBuried++;
        }
      });
      return t;
    };
    const day = soak(400);
    syncWorld(w, { tank, creatures, clutches: [], hour: 23, refreshInfo: true });
    const night = soak(400);
    expect(bad.slice(0, 8)).toEqual([]);
    // much of the day spent half-buried; more of the night up and about, vaulting along
    expect(day.halfBuried / day.frames).toBeGreaterThan(0.5);
    expect(night.halfBuried / night.frames).toBeLessThan(day.halfBuried / day.frames);
    expect(night.vaults).toBeGreaterThan(20);
    expect(night.vaults).toBeGreaterThan(day.vaults);
    // most of a "move" is the pause between vaults
    expect((day.pausedInMove + night.pausedInMove) / Math.max(1, day.moveFrames + night.moveFrames)).toBeGreaterThan(0.5);
  });

  it('a vault carries the shell a few centimetres; between vaults it stands still', () => {
    const tank = reef('conch_vault');
    const w = makeTestWorld(tank, crew(CONCH, tank.id, 1), 2, {}, species);
    const a = w.agents[0];
    const dists: number[] = [];
    let start: THREE.Vector3 | null = null;
    let wasOn = false;
    run(w, 400, () => {
      if (a.gaitOn && !wasOn) start = a.rt.pos.clone();
      if (!a.gaitOn && wasOn && start) dists.push(Math.hypot(a.rt.pos.x - start.x, a.rt.pos.z - start.z));
      wasOn = a.gaitOn;
    });
    expect(dists.length).toBeGreaterThan(10);
    const med = [...dists].sort((x, y) => x - y)[Math.floor(dists.length / 2)];
    expect(med).toBeGreaterThan(a.L * 0.25);
    expect(med).toBeLessThan(a.L * 0.5);
  });

  it('startled, it pulls into its shell where it is (no swim, no flee)', () => {
    const tank = reef('conch_tap');
    const w = makeTestWorld(tank, crew(CONCH, tank.id, 1), 2, {}, species);
    const a = w.agents[0];
    run(w, 5);
    addStimulus(w, 'tap', new THREE.Vector3(a.rt.pos.x, a.rt.pos.y + 0.02, a.rt.pos.z + 0.02), 1, true);
    run(w, 1);
    expect(a.act).toBe('startle');
    expect(a.rt.pose).toBe('hiding');
    expect(a.loco).toBe('crawl');
    const p = a.rt.pos.clone();
    run(w, 1.5);
    expect(Math.hypot(a.rt.pos.x - p.x, a.rt.pos.z - p.z)).toBeLessThan(a.L * 0.05);
  });
});

describe('Nassarius (snail_sand)', () => {
  it('lies buried most of the time; smells food dropped anywhere on the floor, comes up, races to it, then digs back in', () => {
    const tank = reef('nass');
    const w = makeTestWorld(tank, crew(NASSARIUS, tank.id, 6), 12, {}, species);
    const eaters = new Set<string>();
    w.hooks.event = (kind, _p, id) => {
      if (kind === 'eat' && id) eaters.add(id);
    };
    let buried = 0;
    let frames = 0;
    run(w, 240, () => {
      for (const a of w.agents) {
        frames++;
        if (a.buried > 0.9) buried++;
      }
    });
    expect(buried / frames).toBeGreaterThan(0.75);
    for (const a of w.agents) expect(a.rt.visible).toBe(true); // (the siphon shows above the sand)
    // sinking pellets dropped at the far end of the tank
    const at = new THREE.Vector3(w.env.maxX - 0.08, w.env.surfaceY - 0.02, 0.05);
    spawnFood(w, { foodId: 'sinking_pellets', delivery: 'fast_sink', color: '#7a5636', tags: ['pellet_sinking'], nutrition: 30 }, at, { count: 10 });
    const upAt = new Map<string, number>();
    run(w, 120, (i) => {
      for (const a of w.agents) if (!upAt.has(a.id) && a.buried < 0.2) upAt.set(a.id, i * DT);
    });
    // they came up within seconds of the food landing, and most of them got to it
    expect(upAt.size).toBeGreaterThanOrEqual(5);
    expect(Math.min(...upAt.values())).toBeLessThan(12);
    expect(eaters.size).toBeGreaterThanOrEqual(4);
    // fed, they wander a little and dig back in
    run(w, 240);
    const back = w.agents.filter((a) => a.buried > 0.9).length;
    expect(back).toBeGreaterThanOrEqual(4);
    for (const a of w.agents) expect(a.rt.pos.y).toBeLessThan(floorAt(w.env, a.rt.pos.x, a.rt.pos.z) + bodyHY(a) * 1.1);
  });

  it('on a bed it cannot dig into it just sits on top', () => {
    const tank = reef('nass_bare', { substrate: 'bare' });
    const w = makeTestWorld(tank, crew(NASSARIUS, tank.id, 3), 12, {}, species);
    run(w, 60);
    for (const a of w.agents) {
      expect(a.buried).toBe(0);
      expect(a.rt.pos.y).toBeGreaterThan(floorAt(w.env, a.rt.pos.x, a.rt.pos.z) + bodyHY(a) * 0.9);
    }
  });
});
