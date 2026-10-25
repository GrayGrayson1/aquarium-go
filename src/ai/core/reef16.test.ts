/**
 * Chunk 16, wave B — the new behaviour sets (lane "behavior"): tuxedo urchin ('urchin'), sand-sifting star
 * ('starfish_sand'), emerald crab ('crab'), lawnmower blenny ('blenny'), flame hawkfish ('hawkfish'), yellowtail damsel
 * ('damsel'), German blue ram ('cichlid_dwarf'), the living bubble-tip anemone ('anemone') and clownfish hosting in it,
 * and the six-line wrasse ('wrasse' + specialBehaviors 'rock_sleep'). Stub species (an existing species with the new
 * behaviour set and traits) keep the tests independent of the species data being written alongside.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { Creature, SpeciesDefinition } from '@/types';
import { addStimulus, stepWorld, syncWorld, type AIWorld } from './world';
import { colliderSdf, colliderSdfGrounded, drawnDepth, floorAt, makeHit, nearestSurface, SURF_ALL } from './env';
import { spawnFood } from './food';
import { bodySide } from './nav';
import { SET_PROFILES } from './sets';
import { crownPos } from './anemone';
import { decor, makeTestCreature, makeTestTank, makeTestWorld, speciesWith, stubSpecies } from './testkit';

const DT = 1 / 60;

const URCHIN = stubSpecies('trochus_snail', {
  id: 'test_urchin',
  behaviorSet: 'urchin',
  adultSizeCm: 7,
  activityZone: ['glass', 'decor', 'bottom'],
  foods: ['biofilm', 'nori', 'algae_wafer'],
  specialBehaviors: [],
  behaviorTraits: { cruiseSpeed: 0.02, burstSpeed: 0.03, turnRate: 0.3, restOnBottom: 1, nocturnal: 0.75 },
});
const SAND_STAR = stubSpecies('trochus_snail', {
  id: 'test_sand_star',
  behaviorSet: 'starfish_sand',
  adultSizeCm: 15,
  activityZone: ['substrate', 'bottom'],
  foods: ['detritus', 'pellet_sinking'],
  specialBehaviors: [],
  behaviorTraits: { cruiseSpeed: 0.05, burstSpeed: 0.12, turnRate: 0.5, restOnBottom: 1, nocturnal: 0.85 },
});
const CRAB = stubSpecies('hermit_crab', {
  id: 'test_emerald_crab',
  behaviorSet: 'crab',
  adultSizeCm: 5,
  activityZone: ['decor', 'bottom', 'glass'],
  specialBehaviors: [],
  behaviorTraits: { cruiseSpeed: 0.2, burstSpeed: 1.2, turnRate: 2, restOnBottom: 1, nocturnal: 0.8 },
});
const BLENNY = stubSpecies('green_chromis', {
  id: 'test_blenny',
  behaviorSet: 'blenny',
  adultSizeCm: 13,
  feedingStyle: 'grazer',
  activityZone: ['bottom', 'decor', 'glass'],
  specialBehaviors: [],
  behaviorTraits: { cruiseSpeed: 0.5, burstSpeed: 4, turnRate: 3, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 0.9, curiosity: 0.75, nocturnal: 0 },
});
const HAWK = stubSpecies('green_chromis', {
  id: 'test_hawkfish',
  behaviorSet: 'hawkfish',
  adultSizeCm: 9,
  feedingStyle: 'ambush',
  activityZone: ['decor', 'lower', 'middle'],
  foods: ['mysis', 'pellet_sinking', 'pellet_small', 'flake'],
  specialBehaviors: [],
  behaviorTraits: { cruiseSpeed: 0.6, burstSpeed: 6, turnRate: 3.5, hoverTendency: 0.1, schoolingTightness: 0, restOnBottom: 0.8, curiosity: 0.7, nocturnal: 0 },
});
const DAMSEL = stubSpecies('green_chromis', {
  id: 'test_damsel',
  behaviorSet: 'damsel',
  adultSizeCm: 7,
  activityZone: ['middle', 'decor'],
  specialBehaviors: [],
  behaviorTraits: { cruiseSpeed: 1.3, burstSpeed: 6, turnRate: 4, hoverTendency: 0.5, schoolingTightness: 0.1, restOnBottom: 0, curiosity: 0.55, nocturnal: 0 },
});
const RAM = stubSpecies('discus', {
  id: 'test_ram',
  behaviorSet: 'cichlid_dwarf',
  adultSizeCm: 6,
  feedingStyle: 'bottom',
  activityZone: ['bottom', 'lower'],
  specialBehaviors: [],
  behaviorTraits: { cruiseSpeed: 0.9, burstSpeed: 5, turnRate: 3, hoverTendency: 0.6, schoolingTightness: 0, restOnBottom: 0.3, curiosity: 0.5, nocturnal: 0 },
});
const ANEMONE = stubSpecies('trochus_snail', {
  id: 'test_anemone_live',
  behaviorSet: 'anemone',
  adultSizeCm: 20,
  foods: ['mysis'],
  anemoneRelationship: 'not_applicable',
  specialBehaviors: [],
  behaviorTraits: { cruiseSpeed: 0.01, burstSpeed: 0.02, turnRate: 0.2, restOnBottom: 1, nocturnal: 0 },
});
const SIXLINE = stubSpecies('green_chromis', {
  id: 'test_sixline',
  behaviorSet: 'wrasse',
  adultSizeCm: 8,
  feedingStyle: 'picker',
  activityZone: ['lower', 'middle', 'decor'],
  specialBehaviors: ['rock_sleep'],
  behaviorTraits: { cruiseSpeed: 1.6, burstSpeed: 6.5, turnRate: 4.5, hoverTendency: 0.3, schoolingTightness: 0, restOnBottom: 0, burrowing: 0, curiosity: 0.55, nocturnal: 0 },
});
const MAROON = stubSpecies('ocellaris_clownfish', { id: 'test_maroon_clown', adultSizeCm: 16 });
const species = speciesWith([URCHIN, SAND_STAR, CRAB, BLENNY, HAWK, DAMSEL, RAM, ANEMONE, SIXLINE, MAROON]);

function crew(sp: SpeciesDefinition, tankId: string, n: number, prefix = sp.id): Creature[] {
  return Array.from({ length: n }, (_, i) => makeTestCreature(sp.id, tankId, { id: `${prefix}_${i}`, species: sp, sizeCm: sp.adultSizeCm * 0.9, temperament: 30 + ((i * 37) % 50), curiosity: 40 + ((i * 53) % 40) }));
}

function reef(id: string, opts: { substrate?: 'sand' | 'bare'; tierId?: string } = {}) {
  return makeTestTank({
    id,
    tierId: opts.tierId ?? 'g40B',
    waterClass: 'reef',
    substrate: opts.substrate,
    decor: [decor('test_rock', -0.22, -0.04, { id: `${id}_rock`, scale: 1.4 }), decor('test_rock', 0.25, -0.08, { id: `${id}_rock2` })],
  });
}

/** A reef of the game's own live rock and a live-rock arch (rock the AI models as drawn: rockshape.ts). */
function liveReef(id: string, tierId = 'g40B') {
  return makeTestTank({
    id,
    tierId,
    waterClass: 'reef',
    decor: [
      decor('live_rock', -0.25, -0.06, { id: `${id}_rock`, scale: 1.3, rotY: 0.4 }),
      decor('live_rock_arch', 0.05, -0.07, { id: `${id}_arch`, scale: 1.2, rotY: 0.2 }),
      decor('live_rock', 0.3, -0.04, { id: `${id}_rock2`, scale: 1.1, rotY: 1.3 }),
    ],
  });
}

function run(w: AIWorld, secs: number, each?: (i: number) => void) {
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) {
    stepWorld(w, DT);
    each?.(i);
  }
}

const atHour = (w: AIWorld, tank: ReturnType<typeof reef>, creatures: Creature[], hour: number) => syncWorld(w, { tank, creatures, clutches: [], hour, refreshInfo: true });

/** Body centre inside hard decor by more than `tol` (m)? */
function inDecor(w: AIWorld, p: THREE.Vector3, tol = 0.004, except: string | null = null): string | null {
  for (const c of w.env.colliders) if (c.hard && c.decorId !== except && colliderSdf(c, p.x, p.y, p.z) < -tol) return c.decorId;
  return null;
}

const hit = makeHit();
const _t = new THREE.Vector3();

/** How far the body (its centre, or its tail end) is off the nearest surface it could rest on. */
function gap(a: ReturnType<typeof makeTestWorld>['agents'][number], w: AIWorld): number {
  const side = bodySide(a);
  nearestSurface(w.env, a.rt.pos, SURF_ALL, hit);
  let g = hit.d - side;
  _t.copy(a.rt.pos).addScaledVector(a.fwd, -a.set.body.hx * a.L * 0.92);
  nearestSurface(w.env, _t, SURF_ALL, hit);
  g = Math.min(g, hit.d - side * 0.4);
  return g;
}

describe('new behaviour-set profiles (wave B)', () => {
  it('have the bodies and habits of their animals', () => {
    const P = SET_PROFILES;
    expect(P.urchin).toMatchObject({ loco: 'crawl', canSwim: false, flatBody: true, crawlMask: 7, startle: 'freeze', creviceRest: true });
    expect(P.starfish_sand).toMatchObject({ loco: 'crawl', canSwim: false, flatBody: true, crawlMask: 1, startle: 'burrow', nightOnly: true });
    expect(P.starfish_sand.bury!.depth).toBeGreaterThan(2);
    expect(P.crab).toMatchObject({ loco: 'crawl', canSwim: false, crawlGait: 'walk', startle: 'shelter', nightOnly: true, creviceRest: true });
    expect(P.blenny).toMatchObject({ loco: 'swim', rest: 'cave', startle: 'shelter', surfaceGrazer: true, chases: 'kin' });
    expect(P.hawkfish).toMatchObject({ loco: 'swim', rest: 'cave' });
    expect(P.hawkfish.acts.perch).toBeGreaterThan(5 * (P.hawkfish.acts.cruise ?? 0));
    expect(P.damsel).toMatchObject({ loco: 'swim', rest: 'cave', startle: 'shelter', chases: 'fish' });
    expect(P.cichlid_dwarf).toMatchObject({ loco: 'swim', bottomHugger: true, chases: 'fish' });
    expect(P.anemone).toMatchObject({ loco: 'crawl', canSwim: false, anemone: true, flatBody: true, crawlMask: 7, body: { hx: 0.5, hy: 0.2, hz: 0.5 } });
  });
});

describe('sand-sifting star (starfish_sand)', () => {
  it('lies under the sand all day, roams the sand bed at night (never off the floor), and goes back under at dawn', () => {
    const tank = reef('ss_cycle');
    const creatures = crew(SAND_STAR, tank.id, 2);
    const w = makeTestWorld(tank, creatures, 12, {}, species);
    run(w, 60);
    for (const a of w.agents) {
      expect(a.act, a.behavior).toBe('sleep');
      expect(a.rt.ai.buried).toBeGreaterThan(0.95);
      expect(a.behavior).toBe('buried in the sand');
      expect(a.rt.visible).toBe(true); // (an outline in the sand: the renderer draws it from rt.ai.buried)
      expect(a.rt.pos.y).toBeLessThan(floorAt(w.env, a.rt.pos.x, a.rt.pos.z));
    }
    const dayPos = w.agents.map((a) => a.rt.pos.clone());
    atHour(w, tank, creatures, 23);
    let up = 0;
    let frames = 0;
    let offFloor = 0;
    let digs = 0;
    run(w, 240, () => {
      for (const a of w.agents) {
        frames++;
        if (a.buried < 0.6) up++;
        if (a.surfId !== -2) offFloor++;
        if (a.act === 'forage' && a.actPhase === 1 && a.buried > 0.3 && a.buried < 0.8) digs++;
      }
    });
    expect(offFloor).toBe(0);
    expect(up / frames).toBeGreaterThan(0.4);
    expect(digs).toBeGreaterThan(100); // (digging in to feed: partly under)
    w.agents.forEach((a, i) => expect(Math.hypot(a.rt.pos.x - dayPos[i].x, a.rt.pos.z - dayPos[i].z), a.id).toBeGreaterThan(a.L * 0.8));
    atHour(w, tank, creatures, 8.5);
    run(w, 60);
    for (const a of w.agents) {
      expect(a.act).toBe('sleep');
      expect(a.buried).toBeGreaterThan(0.95);
    }
  });

  it('on a bare floor it lies flat on top by day; a tap at night sends it under the sand', () => {
    const bare = reef('ss_bare', { substrate: 'bare' });
    const wb = makeTestWorld(bare, crew(SAND_STAR, bare.id, 1), 12, {}, species);
    run(wb, 40);
    const s = wb.agents[0];
    expect(s.act).toBe('sleep');
    expect(s.buried).toBe(0);
    expect(s.rt.pos.y).toBeGreaterThan(floorAt(wb.env, s.rt.pos.x, s.rt.pos.z));
    const tank = reef('ss_tap');
    const w = makeTestWorld(tank, crew(SAND_STAR, tank.id, 1), 23, {}, species);
    const a = w.agents[0];
    run(w, 30);
    expect(a.buried).toBeLessThan(0.95);
    addStimulus(w, 'tap', new THREE.Vector3(a.rt.pos.x, a.rt.pos.y + 0.03, w.env.maxZ), 1, true);
    run(w, 1);
    expect(a.act).toBe('burrow');
    run(w, 6);
    expect(a.buried).toBeGreaterThan(0.95);
  });
});

describe('emerald crab (crab)', () => {
  it('spends the day wedged in a rock crevice, still and hidden', () => {
    const tank = reef('crab_day');
    const w = makeTestWorld(tank, crew(CRAB, tank.id, 2), 12, {}, species);
    // (a few seconds to walk to its crevice)
    run(w, 90);
    const start = w.agents.map((a) => a.rt.pos.clone());
    run(w, 60);
    w.agents.forEach((a, i) => {
      expect(a.act).toBe('sleep');
      expect(a.rt.pose).toBe('hiding');
      expect(a.behavior).toBe('hiding');
      expect([`${tank.id}_rock`, `${tank.id}_rock2`]).toContain(a.actTarget);
      expect(a.rt.pos.distanceTo(a.actData), a.id).toBeLessThan(a.L * 1.6);
      expect(a.rt.pos.distanceTo(start[i])).toBeLessThan(a.L * 0.3);
    });
  });

  it('comes out at night to pick at the algae on the rock with its claws', () => {
    const tank = reef('crab_night');
    const w = makeTestWorld(tank, crew(CRAB, tank.id, 2), 23, {}, species);
    let onRock = 0;
    let frames = 0;
    let picks = 0;
    const was = new Map<string, number>();
    const bad: string[] = [];
    let path = 0;
    const prev = w.agents.map((a) => a.rt.pos.clone());
    run(w, 240, () => {
      w.agents.forEach((a, i) => {
        frames++;
        if (a.surfId >= 0) onRock++;
        path += a.rt.pos.distanceTo(prev[i]) / a.L;
        prev[i].copy(a.rt.pos);
        const ap = a.rt.appendage ?? 0;
        if (a.act === 'graze' && ap > 0.9 && (was.get(a.id) ?? 0) <= 0.9) picks++;
        was.set(a.id, ap);
        if (a.loco !== 'crawl') bad.push(`${a.id} ${a.loco}`);
        const d = inDecor(w, a.rt.pos, 0.006);
        if (d) bad.push(`${a.id} inside ${d} (${a.act})`);
      });
    });
    expect(bad.slice(0, 5)).toEqual([]);
    expect(onRock / frames).toBeGreaterThan(0.25);
    expect(picks).toBeGreaterThan(40);
    expect(path).toBeGreaterThan(10);
  });

  it('startled, it dashes for its crevice, scuttling sideways', () => {
    const tank = reef('crab_tap');
    const w = makeTestWorld(tank, crew(CRAB, tank.id, 1), 23, {}, species);
    const a = w.agents[0];
    run(w, 30);
    addStimulus(w, 'tap', new THREE.Vector3(a.rt.pos.x, a.rt.pos.y, w.env.maxZ), 1, true);
    let side = 0;
    let fast = 0;
    run(w, 6, () => {
      side = Math.max(side, Math.abs(a.rt.ai.sideways as number));
      fast = Math.max(fast, a.speed / a.L);
    });
    expect(a.act).toBe('retreat');
    expect(a.rt.pose).toBe('hiding');
    expect(fast).toBeGreaterThan(0.8); // (its burst, not a walk)
    expect(side).toBeGreaterThan(0.9);
    // and turns forward again once it is still
    run(w, 3);
    expect(Math.abs(a.rt.ai.sideways as number)).toBeLessThan(0.1);
  });
});

describe('tuxedo urchin (urchin)', () => {
  it('glides slowly over rock, glass and sand, flat on its oral side; holds a steady load of debris; a tap only stiffens it', () => {
    const tank = reef('urchin');
    const w = makeTestWorld(tank, crew(URCHIN, tank.id, 4), 2, {}, species);
    const bad: string[] = [];
    const carry = new Map<string, number[]>();
    let maxStep = 0;
    const kinds = new Set<string>();
    const prev = w.agents.map((a) => a.rt.pos.clone());
    run(w, 600, (i) => {
      if (i % 6) return;
      w.agents.forEach((a, k) => {
        if (a.loco !== 'crawl') bad.push(`${a.id} ${a.loco}`);
        if (!nearestSurface(w.env, a.rt.pos, SURF_ALL, hit) || hit.d > bodySide(a) * 1.6) bad.push(`${a.id} off its surface (${a.act})`);
        if (i > 120) maxStep = Math.max(maxStep, a.rt.pos.distanceTo(prev[k]) / a.L);
        prev[k].copy(a.rt.pos);
        kinds.add(a.surfId === -2 ? 'floor' : a.surfId <= -3 ? 'glass' : a.surfId >= 0 ? 'rock' : 'none');
        const c = a.rt.ai.carry as number;
        carry.set(a.id, [...(carry.get(a.id) ?? []), c]);
      });
    });
    expect(bad.slice(0, 5)).toEqual([]);
    // (a slow glide: at most a few hundredths of its width in a tenth of a second — rolling onto a rock included)
    expect(maxStep).toBeLessThan(0.05);
    expect(kinds.has('rock')).toBe(true);
    for (const [id, cs] of carry) {
      expect(Math.max(...cs) - Math.min(...cs), id).toBeLessThan(0.02); // (at night: no light to cover up against)
      for (const c of cs) expect(c).toBeGreaterThanOrEqual(0);
    }
    const a = w.agents[0];
    addStimulus(w, 'tap', new THREE.Vector3(a.rt.pos.x, a.rt.pos.y, w.env.maxZ), 1, true);
    run(w, 0.6);
    expect(a.act).toBe('startle');
    expect(a.rt.pose).toBe('startle');
    const p = a.rt.pos.clone();
    run(w, 1);
    expect(a.rt.pos.distanceTo(p)).toBeLessThan(a.L * 0.01);
  });

  it('is parked or tucked into a crevice more by day, and grazes more at night', () => {
    const tank = reef('urchin_cycle');
    const creatures = crew(URCHIN, tank.id, 4);
    const w = makeTestWorld(tank, creatures, 12, {}, species);
    const tally = () => ({ still: 0, graze: 0 });
    const soak = (t: { still: number; graze: number }) =>
      run(w, 500, () => {
        for (const a of w.agents) {
          if (a.act === 'rest' || a.act === 'hide') t.still++;
          if (a.act === 'graze') t.graze++;
        }
      });
    const day = tally();
    soak(day);
    atHour(w, tank, creatures, 23);
    const night = tally();
    soak(night);
    expect(day.still).toBeGreaterThan(night.still);
    expect(night.graze).toBeGreaterThan(day.graze);
  });
});

describe('lawnmower blenny (blenny)', () => {
  it('perches on the rock and the glass, head up, hopping from perch to perch, and grazes the surfaces in bouts', () => {
    const tank = reef('blenny');
    const w = makeTestWorld(tank, crew(BLENNY, tank.id, 1), 12, {}, species);
    const a = w.agents[0];
    let perched = 0;
    let headUp = 0;
    let onSurface = 0;
    let frames = 0;
    let pecks = 0;
    let lastMouth = 0;
    const perches: THREE.Vector3[] = [];
    const bad: string[] = [];
    run(w, 300, () => {
      frames++;
      const p = a.rt.pos;
      const d = inDecor(w, p, 0.004);
      if (d) bad.push(`inside ${d} (${a.act})`);
      if (a.act === 'perch' && a.actPhase === 1 && a.actT > 1 && p.distanceTo(a.actData) < a.L * 0.15) {
        perched++;
        if (a.rt.pitch > 0.15) headUp++;
        // sitting on the surface: some part of the body (belly, or the tail of a body propped head-up) touching it
        if (gap(a, w) < bodySide(a) * 0.5) onSurface++;
        if (!perches.some((q) => q.distanceTo(a.actData) < a.L * 0.5)) perches.push(a.actData.clone());
      }
      if (a.act === 'graze' && a.rt.mouthOpen > 0.8 && lastMouth <= 0.8) pecks++;
      lastMouth = a.act === 'graze' ? a.rt.mouthOpen : 0;
    });
    expect(bad.slice(0, 5)).toEqual([]);
    expect(perched / frames).toBeGreaterThan(0.2);
    expect(headUp / perched).toBeGreaterThan(0.8);
    expect(onSurface / perched).toBeGreaterThan(0.9);
    expect(perches.length).toBeGreaterThanOrEqual(5);
    expect(pecks).toBeGreaterThan(30);
  });

  it('drives another blenny off its patch; startled, it darts into a hole', () => {
    const tank = reef('blenny_pair');
    const w = makeTestWorld(tank, crew(BLENNY, tank.id, 2), 12, {}, species);
    let chases = 0;
    let fled = 0;
    let was = new Map<string, string>();
    run(w, 240, () => {
      for (const a of w.agents) {
        const prev = was.get(a.id);
        if (a.act === 'chase' && prev !== 'chase') chases++;
        if (a.act === 'startle' && prev !== 'startle') fled++;
        was.set(a.id, a.act);
      }
    });
    expect(chases).toBeGreaterThan(2);
    expect(fled).toBeGreaterThan(2);
    was = new Map();
    const a = w.agents[0];
    // a dart needs a way to go and a calm start: tap once it is out over open water, a body length or more from the
    // rockwork, and not chasing or fleeing (where the run happens to leave it differs between machines: next to a hole
    // it would only slip in, and a chase's burst would pass for a dart)
    const fromRock = () => Math.min(...w.env.colliders.filter((c) => c.hard).map((c) => colliderSdf(c, a.rt.pos.x, a.rt.pos.y, a.rt.pos.z)));
    const busy = () => a.act === 'chase' || a.act === 'startle' || a.act === 'retreat' || a.speed > 2 * a.sp.behaviorTraits.cruiseSpeed * a.L;
    for (let t = 0; t < 120 && (fromRock() < a.L || busy()); t += 0.1) run(w, 0.1);
    expect(fromRock(), 'out in the open before the tap').toBeGreaterThanOrEqual(a.L);
    expect(busy(), 'calm before the tap').toBe(false);
    addStimulus(w, 'tap', new THREE.Vector3(a.rt.pos.x, a.rt.pos.y, w.env.maxZ), 1, true);
    // its speed from the tap on, over quarter-second spans (the dart is often over within the first second, and a
    // one-frame push off the rock is not a dart)
    let dash = 0;
    const trail: THREE.Vector3[] = [];
    const track = () => {
      trail.push(a.rt.pos.clone());
      if (trail.length > 15) dash = Math.max(dash, trail[trail.length - 1].distanceTo(trail[trail.length - 16]) / (15 * DT) / a.L);
    };
    run(w, 1, track);
    expect(a.act).toBe('retreat');
    let inHole = false;
    let hole: string | null = null; // (the rock it hid in: it may be out again by the end)
    run(w, 3, () => {
      track();
      if (a.act === 'retreat' && a.rt.pose === 'hiding' && a.actTarget && a.rt.pos.distanceTo(a.actData) < a.L) {
        inHole = true;
        hole ??= a.actTarget;
      }
    });
    expect(inHole).toBe(true);
    expect(dash).toBeGreaterThan(1.5); // (a dart: three times its cruise)
    expect([`${tank.id}_rock`, `${tank.id}_rock2`]).toContain(hole);
  });

  it('sleeps wedged in a rock crevice', () => {
    const tank = reef('blenny_night');
    const w = makeTestWorld(tank, crew(BLENNY, tank.id, 1), 23, {}, species);
    run(w, 40);
    const a = w.agents[0];
    expect(a.act).toBe('sleep');
    expect(a.rt.pose).toBe('rest');
    expect([`${tank.id}_rock`, `${tank.id}_rock2`]).toContain(a.actTarget);
    expect(a.rt.pos.distanceTo(a.anchorPos)).toBeLessThan(a.L * 1.2);
  });
});

describe('flame hawkfish (hawkfish)', () => {
  it('sits on the rock tops watching; pounces on food in a quick dart and goes back to a perch, mostly its favourite', () => {
    const tank = reef('hawk');
    const w = makeTestWorld(tank, crew(HAWK, tank.id, 1), 12, {}, species);
    const a = w.agents[0];
    let perched = 0;
    let frames = 0;
    let onTop = 0;
    run(w, 120, () => {
      frames++;
      if (a.act === 'perch' && a.actPhase === 1) {
        perched++;
        if (a.perchN.y > 0.55 && nearestSurface(w.env, a.rt.pos, SURF_ALL, hit) && hit.d < bodySide(a) * 1.6) onTop++;
      }
    });
    expect(perched / frames).toBeGreaterThan(0.7);
    expect(onTop / perched).toBeGreaterThan(0.9);
    const home = a.home.clone();
    // food, three times, dropped close by
    let pounces = 0;
    let bites = 0;
    let backHome = 0;
    w.hooks.event = (kind, _p, id) => {
      if (kind === 'bite' && id === a.id) bites++;
    };
    for (let k = 0; k < 3; k++) {
      // a piece coming down three or four body lengths off, toward the middle of the tank
      const dx = a.rt.pos.x < 0 ? 0.13 : -0.13;
      spawnFood(w, { foodId: 'mysis', delivery: 'slow_sink', color: '#d0a080', tags: ['mysis'], nutrition: 10 }, new THREE.Vector3(a.rt.pos.x + dx, Math.min(a.rt.pos.y + 0.1, w.env.surfaceY - 0.02), a.rt.pos.z), { count: 1 });
      let top = 0;
      run(w, 6, () => {
        if (a.act === 'feed') top = Math.max(top, a.speed / a.L);
      });
      // (a dart: well over three times its cruise)
      if (top > 2) pounces++;
      run(w, 14);
      if (a.act === 'perch' && a.actPhase === 1 && a.rt.pos.distanceTo(home) < a.L * 0.6) backHome++;
    }
    expect(bites).toBeGreaterThanOrEqual(3);
    expect(pounces).toBeGreaterThanOrEqual(2);
    expect(backHome).toBeGreaterThanOrEqual(2);
  });
});

describe('yellowtail damsel (damsel)', () => {
  it('hovers over its own patch of rock, ducking into it; two damsels hold separate patches', () => {
    const tank = reef('damsel', { tierId: 'g75' });
    const w = makeTestWorld(tank, crew(DAMSEL, tank.id, 2), 12, {}, species);
    let near = 0;
    let frames = 0;
    let ducks = 0;
    const was = new Map<string, number>();
    run(w, 240, () => {
      for (const a of w.agents) {
        frames++;
        if (a.hasHome && a.rt.pos.distanceTo(a.home) < (a.set.territoryBL ?? 3) * a.L * 1.2) near++;
        const ph = a.act === 'host' ? a.actPhase : -1;
        if (ph === 3 && was.get(a.id) !== 3) ducks++;
        was.set(a.id, ph);
      }
    });
    expect(near / frames).toBeGreaterThan(0.6);
    expect(ducks).toBeGreaterThan(4);
    const [p, q] = w.agents;
    expect(p.home.distanceTo(q.home)).toBeGreaterThan(p.L * 2);
  });

  it('chases a fish off its patch and swims back; startled, it dives into its patch', () => {
    const tank = reef('damsel_chase', { tierId: 'g75' });
    const creatures = [...crew(DAMSEL, tank.id, 1), makeTestCreature('green_chromis', tank.id, { id: 'intruder' })];
    const w = makeTestWorld(tank, creatures, 12, {}, species);
    const d = w.byId.get(creatures[0].id)!;
    const o = w.byId.get('intruder')!;
    run(w, 20);
    let chased = false;
    let fled = false;
    for (let k = 0; k < 8 && !chased; k++) {
      // the chromis wanders onto the patch
      o.rt.pos.copy(d.home).add(new THREE.Vector3(0.03, d.L, 0.02));
      run(w, 3, () => {
        if (d.act === 'chase' && d.actTarget === 'intruder') chased = true;
        if (chased && o.act === 'startle') fled = true;
      });
      run(w, 8);
    }
    expect(chased).toBe(true);
    expect(fled).toBe(true);
    run(w, 10);
    expect(d.act).not.toBe('chase');
    addStimulus(w, 'tap', new THREE.Vector3(d.rt.pos.x, d.rt.pos.y, w.env.maxZ), 1, true);
    run(w, 1);
    expect(d.act).toBe('retreat');
    // (into the rock of its own patch)
    expect(d.actData.distanceTo(d.home)).toBeLessThan(0.12);
  });
});

describe('German blue ram (cichlid_dwarf)', () => {
  it('keeps low over the bed about its home, sifting mouthfuls of sand; a pair keeps together and shares the home', () => {
    const tank = makeTestTank({ id: 'ram', tierId: 'g29', waterClass: 'freshwater_tropical', decor: [decor('test_rock', -0.15, -0.03, { id: 'ram_rock' }), decor('test_rock', 0.18, -0.05, { id: 'ram_rock2', scale: 0.8 })] });
    const creatures = [
      makeTestCreature(RAM.id, tank.id, { id: 'ram_m', species: RAM, sizeCm: 5.5, sex: 'male' }),
      makeTestCreature(RAM.id, tank.id, { id: 'ram_f', species: RAM, sizeCm: 5, sex: 'female' }),
      ...['n1', 'n2', 'n3'].map((id) => makeTestCreature('neon_tetra', tank.id, { id })),
    ];
    const w = makeTestWorld(tank, creatures, 12, {}, species);
    const m = w.byId.get('ram_m')!;
    const f = w.byId.get('ram_f')!;
    const H = w.env.surfaceY - w.env.floorY;
    let low = 0;
    let nearHome = 0;
    let n = 0;
    let together = 0;
    let sifts = 0;
    let lastSift = 0;
    // ten minutes: the pair settles its home in the first few, and a chase can take it off for a while (over four
    // minutes the share near home ran from 0.47 to 0.88 on nudged starts, over ten from 0.75 to 0.95)
    run(w, 600, () => {
      for (const r of [m, f]) {
        n++;
        if (r.rt.pos.y - floorAt(w.env, r.rt.pos.x, r.rt.pos.z) < H * 0.3) low++;
        if (r.hasHome && r.rt.pos.distanceTo(r.home) < r.L * 6) nearHome++;
      }
      if (m.rt.pos.distanceTo(f.rt.pos) < m.L * 5) together++;
      const s = (m.rt.ai.sift as number) ?? 0;
      if (s > 0.95 && lastSift <= 0.95) sifts++;
      lastSift = s;
    });
    expect(low / n).toBeGreaterThan(0.75);
    expect(nearHome / n).toBeGreaterThan(0.7);
    expect(together / (n / 2)).toBeGreaterThan(0.6);
    expect(m.home.distanceTo(f.home)).toBeLessThan(1e-6);
    expect(sifts).toBeGreaterThan(5);
    // it sleeps low by its home
    syncWorld(w, { tank, creatures, clutches: [], hour: 23, refreshInfo: true });
    run(w, 60);
    for (const r of [m, f]) {
      expect(r.act).toBe('sleep');
      expect(r.rt.pos.y - floorAt(w.env, r.rt.pos.x, r.rt.pos.z)).toBeLessThan(H * 0.15);
      expect(r.rt.pos.distanceTo(r.home)).toBeLessThan(r.L * 4);
    }
  });
});

describe('bubble-tip anemone, living (anemone)', () => {
  it('a new arrival wanders to a spot it likes, on the rock and up in the light, then stays put for good', () => {
    const tank = liveReef('anem');
    const w = makeTestWorld(tank, [makeTestCreature(ANEMONE.id, tank.id, { id: 'anem_c', species: ANEMONE, sizeCm: 20, acquiredHour: 11.9 })], 12, {}, species);
    const a = w.agents[0];
    expect(a.settled).toBe(false);
    const start = a.rt.pos.clone();
    run(w, 0.5);
    expect(a.act).toBe('wander');
    expect(a.behavior).toBe('looking for a place to settle');
    let settledAt = -1;
    let maxStep = 0;
    let last = a.rt.pos.clone();
    run(w, 400, (i) => {
      if (settledAt < 0 && a.settled) settledAt = i * DT;
      maxStep = Math.max(maxStep, a.rt.pos.distanceTo(last));
      last.copy(a.rt.pos);
    });
    expect(settledAt).toBeGreaterThan(0);
    expect(a.act).toBe('still');
    expect(a.behavior).toBe('settled');
    expect(a.rt.ai.settled).toBe(1);
    expect(a.surfId).toBeGreaterThanOrEqual(0); // (its foot on a rock)
    expect(a.rt.pos.distanceTo(start)).toBeGreaterThan(a.L * 0.2);
    expect(a.rt.pos.distanceTo(a.site)).toBeLessThan(a.L * 0.35);
    expect(maxStep).toBeLessThan(a.L * 0.01); // (a creep, never a jump)
    // settled: it does not move again
    last = a.rt.pos.clone();
    run(w, 200);
    expect(a.rt.pos.distanceTo(last)).toBeLessThan(0.001);
  });

  it('one long in the tank is put straight on its spot, settled — the same spot on every load', () => {
    const tank = liveReef('anem_old');
    const make = () => makeTestWorld(tank, [makeTestCreature(ANEMONE.id, tank.id, { id: 'anem_old', species: ANEMONE, sizeCm: 20, acquiredHour: -200 })], 12, {}, species);
    const w1 = make();
    const w2 = make();
    const [a1, a2] = [w1.agents[0], w2.agents[0]];
    expect(a1.settled).toBe(true);
    expect(a1.site.distanceTo(a2.site)).toBeLessThan(1e-9);
    run(w1, 20);
    expect(a1.rt.pos.distanceTo(a1.site)).toBeLessThan(a1.L * 0.1);
    expect(a1.act).toBe('still');
  });

  it('closes up at night and when disturbed; now and then deflates and fills again', () => {
    const tank = liveReef('anem_close');
    const creatures = [makeTestCreature(ANEMONE.id, tank.id, { id: 'anem_c', species: ANEMONE, sizeCm: 20, acquiredHour: -200 })];
    const w = makeTestWorld(tank, creatures, 12, {}, species);
    const a = w.agents[0];
    let maxDefl = 0;
    let refilled = false;
    run(w, 30);
    expect(a.rt.ai.closed as number).toBeLessThan(0.15);
    expect(a.rt.pose).toBe('rest');
    run(w, 700, () => {
      const d = a.rt.ai.deflate as number;
      maxDefl = Math.max(maxDefl, d);
      if (maxDefl > 0.9 && d < 0.05) refilled = true;
    });
    expect(maxDefl).toBeGreaterThan(0.9);
    expect(refilled).toBe(true);
    addStimulus(w, 'tap', new THREE.Vector3(a.rt.pos.x, a.rt.pos.y, w.env.maxZ), 1, true);
    run(w, 2);
    expect(a.act).toBe('startle');
    expect(a.rt.ai.closed as number).toBeGreaterThan(0.7);
    expect(a.rt.pose).toBe('hiding');
    atHour(w, tank, creatures, 23.5);
    run(w, 40);
    expect(a.rt.ai.closed as number).toBeGreaterThan(0.55);
  });

  it('clownfish host in it (one species to an anemone) and follow it as it moves; other fish keep off its crown', () => {
    const tank = liveReef('anem_host', 'g75');
    const rank = (i: number) => ({ repro: { stage: 'idle' as const, stageSinceHour: 0, totalClutches: 0, totalOffspringRaised: 0, rank: i } });
    const creatures = [
      // (a new arrival that sets off from where it was put down: it is hosted while it still wanders)
      makeTestCreature(ANEMONE.id, tank.id, { id: 'anem_b', species: ANEMONE, sizeCm: 20, acquiredHour: 11.95 }),
      ...[0, 1].map((i) => makeTestCreature('ocellaris_clownfish', tank.id, { id: `oc${i}`, ...rank(i) })),
      ...[0, 1].map((i) => makeTestCreature(MAROON.id, tank.id, { id: `ma${i}`, species: MAROON, sizeCm: 14, ...rank(i) })),
      ...[0, 1, 2, 3].map((i) => makeTestCreature('green_chromis', tank.id, { id: `gc${i}` })),
    ];
    const w = makeTestWorld(tank, creatures, 12, {}, species);
    const an = w.byId.get('anem_b')!;
    expect(an.settled).toBe(false);
    expect(w.env.byKind.host.some((h) => h.decorId === 'anem_b')).toBe(true);
    const crown = new THREE.Vector3();
    let hostFrames = 0;
    let hostNear = 0;
    let anchorOff = 0;
    let minGap = Infinity;
    let movedWhileHosted = 0;
    const last = an.rt.pos.clone();
    run(w, 400, () => {
      crownPos(an, crown);
      const live = w.env.byKind.host.find((h) => h.decorId === 'anem_b')!;
      anchorOff = Math.max(anchorOff, live.pos.distanceTo(crown));
      for (const a of w.agents) {
        if (a.homeDecor === 'anem_b' && a.act === 'host') {
          hostFrames++;
          if (a.rt.pos.distanceTo(crown) < a.L * 2) hostNear++;
        }
        if (a.speciesId === 'green_chromis') minGap = Math.min(minGap, a.rt.pos.distanceTo(crown) - an.L * 0.5);
      }
      if (!an.settled && w.agents.some((a) => a.homeDecor === 'anem_b')) movedWhileHosted += an.rt.pos.distanceTo(last);
      last.copy(an.rt.pos);
    });
    // one species owns it: the ocellaris pair; the maroons keep to homes of their own
    const hosts = new Set(w.agents.filter((a) => a.homeDecor === 'anem_b').map((a) => a.speciesId));
    expect([...hosts]).toEqual(['ocellaris_clownfish']);
    for (const a of w.agents) if (a.setId === 'clownfish') expect(a.hasHome, a.id).toBe(true);
    // (the host anchor sits on its crown, wherever it is: moved with it at the end of every step)
    expect(anchorOff).toBeLessThan(1e-6);
    expect(movedWhileHosted).toBeGreaterThan(an.L * 0.2); // (it was hosted while it still wandered)
    expect(hostNear / hostFrames).toBeGreaterThan(0.5);
    expect(minGap).toBeGreaterThan(0);
  });

  it('a clone split off a settled anemone starts beside its parent, crowns touching, on the same rock; the parent stays put', () => {
    const tank = liveReef('anem_split');
    const parent = makeTestCreature(ANEMONE.id, tank.id, { id: 'anem_parent', species: ANEMONE, sizeCm: 20, acquiredHour: -200 });
    const w = makeTestWorld(tank, [parent], 12, {}, species);
    const p = w.byId.get('anem_parent')!;
    run(w, 10);
    expect(p.settled).toBe(true);
    const before = p.rt.pos.clone();
    const clone = makeTestCreature(ANEMONE.id, tank.id, {
      id: 'anem_clone',
      species: ANEMONE,
      sizeCm: 10,
      acquiredHour: 12,
      lineage: { motherId: 'anem_parent', fatherId: null, generation: 1, lineId: 'test', breederName: 'test' },
      history: [{ hour: 12, kind: 'born', text: 'Split from Parent — a clone of it.' }],
    });
    syncWorld(w, { tank, creatures: [parent, clone], clutches: [], hour: 12, refreshInfo: true });
    const k = w.byId.get('anem_clone')!;
    // beside the parent's crown, the two crowns touching, holding the same rock
    // (crowns touching, or overlapping a little where its rock is small)
    const touch = (p.L + k.L) * 0.5;
    expect(k.rt.pos.distanceTo(p.rt.pos)).toBeGreaterThan(touch * 0.6);
    expect(k.rt.pos.distanceTo(p.rt.pos)).toBeLessThan(touch * 1.1);
    expect(k.surfId).toBe(p.surfId);
    expect(k.upVis.dot(p.upVis)).toBeGreaterThan(0.65);
    expect(w.env.byKind.host.filter((h) => h.live).length).toBe(2);
    run(w, 300);
    // the parent never moved; the clone went its own way by its own rules
    expect(p.rt.pos.distanceTo(before)).toBeLessThan(1e-9);
    expect(k.rt.pos.distanceTo(p.rt.pos)).toBeGreaterThan(touch * 0.6);
  });

  it('its rock taken away, it sets off again to settle somewhere else; its clownfish keep it as their home through the change', () => {
    const tank = liveReef('anem_move');
    const creatures = [makeTestCreature(ANEMONE.id, tank.id, { id: 'anem_m', species: ANEMONE, sizeCm: 20, acquiredHour: -200 }), makeTestCreature('ocellaris_clownfish', tank.id, { id: 'oc_m' })];
    const w = makeTestWorld(tank, creatures, 12, {}, species);
    const a = w.byId.get('anem_m')!;
    const c = w.byId.get('oc_m')!;
    run(w, 30);
    expect(a.settled).toBe(true);
    expect(c.homeDecor).toBe('anem_m');
    const held = w.env.colliders[a.surfId]?.decorId;
    expect(held).toBeDefined();
    const before = a.rt.pos.clone();
    tank.decor = tank.decor.filter((d) => d.id !== held);
    syncWorld(w, { tank, creatures, clutches: [], hour: 12, refreshInfo: true });
    expect(c.homeDecor).toBe('anem_m');
    expect(w.env.byKind.host.some((h) => h.decorId === 'anem_m')).toBe(true);
    run(w, 1);
    expect(a.settled).toBe(false);
    expect(a.act).toBe('wander');
    let settledAgain = false;
    run(w, 900, () => {
      if (a.settled) settledAgain = true;
    });
    expect(settledAgain).toBe(true);
    expect(a.rt.pos.distanceTo(before)).toBeGreaterThan(a.L * 0.5);
    expect(c.homeDecor).toBe('anem_m');
  });

  it('a clownfish with no anemone takes up a living one that comes into the tank; it loses it when the anemone goes', () => {
    const tank = liveReef('anem_late', 'g75');
    const clown = makeTestCreature('ocellaris_clownfish', tank.id, { id: 'oc_late' });
    const anem = makeTestCreature(ANEMONE.id, tank.id, { id: 'anem_late', species: ANEMONE, sizeCm: 20, acquiredHour: -200 });
    const w = makeTestWorld(tank, [clown], 12, {}, species);
    const c = w.byId.get('oc_late')!;
    run(w, 30);
    expect(c.homeDecor).toBe(null);
    syncWorld(w, { tank, creatures: [clown, anem], clutches: [], hour: 12, refreshInfo: true });
    run(w, 90);
    expect(c.homeDecor).toBe('anem_late');
    syncWorld(w, { tank, creatures: [clown], clutches: [], hour: 12, refreshInfo: true });
    expect(w.env.byKind.host.length).toBe(0);
    expect(c.homeDecor).toBe(null);
    run(w, 60);
    expect(c.homeDecor).toBe(null);
  });
});

describe('on the rock as drawn, not on its collider box (rockshape.ts)', () => {
  it('an anemone settles with its foot on the drawn rock: in its rock\'s box exactly as far as the drawn rock is', () => {
    const tank = liveReef('drawn_anem');
    for (const id of ['dr_a', 'dr_b', 'dr_c', 'dr_d']) {
      const w = makeTestWorld(tank, [makeTestCreature(ANEMONE.id, tank.id, { id, species: ANEMONE, sizeCm: 20, acquiredHour: -200 })], 12, {}, species);
      const a = w.agents[0];
      run(w, 5);
      expect(a.settled, id).toBe(true);
      if (a.surfId < 0) continue; // (on the bed or a pane)
      const c = w.env.colliders[a.surfId];
      expect(c.shape, id).toBeDefined();
      const depth = drawnDepth(c, a.rt.pos.x, a.rt.pos.y, a.rt.pos.z);
      expect(Number.isFinite(depth), id).toBe(true);
      expect(Math.abs(a.embed - depth), id).toBeLessThan(0.003);
      // the body centre a half-height off the drawn rock: `embed` nearer the box than that
      expect(Math.abs(colliderSdfGrounded(c, a.rt.pos.x, a.rt.pos.y, a.rt.pos.z) - (a.set.body.hy * a.L - a.embed)), id).toBeLessThan(0.004);
    }
  });

  it('a hawkfish perches and a crab grazes on the drawn rock, not on top of its box', () => {
    const tank = liveReef('drawn_perch');
    const w = makeTestWorld(tank, crew(CRAB, tank.id, 1), 23, {}, species);
    const crab = w.agents[0];
    let perches = 0;
    let perchBad = 0;
    let clings = 0;
    let clingBad = 0;
    // (the hawkfish by day, the crab at night)
    const hawkW = makeTestWorld(tank, crew(HAWK, tank.id, 1), 12, {}, species);
    const h = hawkW.agents[0];
    run(hawkW, 180, (i) => {
      if (i % 30 || h.act !== 'perch' || h.actPhase !== 1 || !h.throughDecor || h.rt.pos.distanceTo(h.actData) > h.L * 0.1) return;
      const c = hawkW.env.colliders.find((k) => k.decorId === h.throughDecor && k.part === 'body')!;
      perches++;
      const depth = drawnDepth(c, h.actData.x, h.actData.y, h.actData.z);
      // belly on the drawn rock: the perch's distance to the box plus the drawn depth is the body's half-height
      if (!Number.isFinite(depth) || Math.abs(colliderSdf(c, h.actData.x, h.actData.y, h.actData.z) + depth - (bodySide(h) + 0.002)) > 0.004) perchBad++;
    });
    run(w, 300, (i) => {
      if (i % 30 || crab.surfId < 0 || crab.loco !== 'crawl') return;
      const c = w.env.colliders[crab.surfId];
      if (!c?.shape) return;
      const depth = drawnDepth(c, crab.rt.pos.x, crab.rt.pos.y, crab.rt.pos.z);
      if (!Number.isFinite(depth) || crab.speed > crab.L * 0.05) return;
      clings++;
      if (Math.abs(crab.embed - depth) > 0.01) clingBad++;
    });
    expect(perches).toBeGreaterThan(10);
    expect(perchBad).toBe(0);
    expect(clings).toBeGreaterThan(10);
    expect(clingBad / clings).toBeLessThan(0.1);
  });
});

describe('six-line wrasse (wrasse + rock_sleep)', () => {
  it('sleeps in the rockwork in a cocoon, never in the sand, even over a sand bed', () => {
    const tank = reef('sixline_night');
    const w = makeTestWorld(tank, crew(SIXLINE, tank.id, 1), 23, {}, species);
    expect(w.env.sandBed).toBe(true);
    const a = w.agents[0];
    let hidden = 0;
    run(w, 80, () => {
      if (!a.rt.visible || a.buried > 0) hidden++;
    });
    expect(hidden).toBe(0);
    expect(a.act).toBe('sleep');
    expect(a.sandMode).toBe(false);
    expect([`${tank.id}_rock`, `${tank.id}_rock2`]).toContain(a.actTarget);
    expect(a.rt.pos.y).toBeGreaterThan(floorAt(w.env, a.rt.pos.x, a.rt.pos.z));
    expect(a.rt.ai.cocoon as number).toBeGreaterThan(0.5);
  });

  it('by day it works the rock faces more than the sand and darts in and out of the rockwork; a hard fright sends it into the rock', () => {
    const tank = reef('sixline_day');
    const w = makeTestWorld(tank, crew(SIXLINE, tank.id, 1), 12, {}, species);
    const a = w.agents[0];
    let rock = 0;
    let sand = 0;
    let dips = 0;
    let prevAct = '';
    let hidden = 0;
    run(w, 240, () => {
      if (a.act === 'forage' && a.actPhase === 1) {
        if (a.actTarget) rock++;
        else sand++;
      }
      if (a.act === 'hide' && prevAct !== 'hide') dips++;
      prevAct = a.act;
      if (!a.rt.visible) hidden++;
    });
    expect(hidden).toBe(0);
    expect(rock).toBeGreaterThan(sand * 2);
    expect(dips).toBeGreaterThanOrEqual(2);
    for (let k = 0; k < 3; k++) {
      addStimulus(w, 'tap', new THREE.Vector3(a.rt.pos.x, a.rt.pos.y, w.env.maxZ), 1, true);
      run(w, 0.3);
    }
    expect(a.act).toBe('retreat');
    let dived = false;
    run(w, 5, () => {
      if (a.act === 'sand_dive' || a.buried > 0) dived = true;
    });
    expect(dived).toBe(false);
  });
});
