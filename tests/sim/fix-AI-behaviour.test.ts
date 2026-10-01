/**
 * Fix lane AI — behaviours and colliders (audit P6-01, P6-03, S07-06, S07-07, S08-02, S08-03, S08-04).
 */
import { describe, expect, it } from 'vitest';
import { getDecorDef } from '@/data/catalog/decor';
import { decorSolidity, floorAt, colliderSdf, type Collider } from '@/ai/core/env';
import { constrainBody } from '@/ai/core/loco';
import { startAct } from '@/ai/core/acts';
import { equipmentSolids } from '@/ai/registry';
import { equipmentLayout } from '@/render/decor/emitters';
import { createWorld, stepWorld, syncWorld, type AIWorld } from '@/ai/core/world';
import { decor, makeTestCreature, makeTestTank, makeTestWorld, resolveTestDecor } from '@/ai/core/testkit';
import { findSpecies } from '@/data/species';
import { personalityModifiers } from '@/sim/life';
import type { EquipmentInstance } from '@/types';

const step = (w: AIWorld, secs: number, dt = 1 / 60) => {
  for (let i = 0; i < Math.round(secs / dt); i++) stepWorld(w, dt);
};
const eq = (defId: string, id = `eq_${defId}`): EquipmentInstance => ({ id, defId, installedHour: 0, condition: 1, on: true, setting: 25 });

describe('fix AI: crawlers, resting and holdfasts', () => {
  it('P6-01: branching corals are soft for the AI (a base plug only), so snails do not graze in open water on a sea fan', () => {
    const gorg = decorSolidity(getDecorDef('gorgonian')!);
    expect(gorg.body).toBe('soft');
    expect(gorg.base).not.toBeNull();
    expect(decorSolidity(getDecorDef('acropora')!).body).toBe('soft');
    // plate / mushroom / brain corals stay solid
    expect(decorSolidity(getDecorDef('mushroom_coral')!).body).toBe('hard');
    const tank = makeTestTank({ id: 'reef', waterClass: 'reef', decor: [decor('live_rock', -0.1, 0.02, { id: 'lr' }), decor('gorgonian', 0.12, 0.0, { id: 'sf', scale: 1.6 })] });
    const w = makeTestWorld(tank, [makeTestCreature('trochus_snail', 'reef', { id: 's1' }), makeTestCreature('trochus_snail', 'reef', { id: 's2' })], 12);
    const bodyIdx = w.env.colliders.findIndex((c) => c.decorId === 'sf' && c.part === 'body');
    expect(bodyIdx).toBeGreaterThanOrEqual(0);
    expect(w.env.colliders[bodyIdx].hard).toBe(false);
    let onFan = 0;
    let samples = 0;
    for (let i = 0; i < 60 * 90; i++) {
      stepWorld(w, 1 / 60);
      if (i % 6) continue;
      for (const a of w.agents) {
        samples++;
        if (a.hit.kind === 'decor' && a.hit.collider === bodyIdx) onFan++;
      }
    }
    expect(samples).toBeGreaterThan(100);
    expect(onFan, 'snail samples standing on the sea fan body').toBe(0);
  });

  it('P6-03: a long-finned betta resting on a low stone keeps its fins clear of the substrate', () => {
    const tank = makeTestTank({ id: 't1', decor: [decor('river_stone', 0.05, 0.02, { id: 'stone', scale: 1.1 })] });
    const c = makeTestCreature('betta', 't1', { id: 'b1', stats: { health: 100, hunger: 10, stress: 5, energy: 30, social: 70, comfort: 90, breedingReadiness: 0, enrichment: 60 } });
    c.appearance = { ...c.appearance, finType: 'halfmoon', finLength: 1.35 };
    const w = makeTestWorld(tank, [c], 12);
    const a = w.agents[0];
    let lowest = Infinity;
    let restFrames = 0;
    for (let round = 0; round < 8; round++) {
      startAct(a, w, 'rest');
      for (let i = 0; i < 60 * 20; i++) {
        stepWorld(w, 1 / 60);
        if (a.act === 'rest' && a.actPhase >= 1 && a.actTarget === 'stone') {
          restFrames++;
          lowest = Math.min(lowest, a.rt.pos.y - floorAt(w.env, a.rt.pos.x, a.rt.pos.z));
        }
      }
    }
    expect(restFrames).toBeGreaterThan(60);
    // the fins hang ~0.3 L × finLength below the centre: the centre stays above hy + most of that (it used to sit
    // ~0.35 L up, fins in the soil)
    expect(lowest).toBeGreaterThan(a.L * (0.17 + 0.3 * 1.35) - a.L * 0.1);
  });

  it('S08-02: a seahorse whose holdfast lies inside a neighbouring stone still hitches (beside it, or elsewhere)', () => {
    // real catalog stones pushed together: stone B sits on A's rest anchor, C over its graze anchor (audit hitch2.ts)
    const rocks = [decor('seiryu_stone', 0, -0.05, { id: 'A', scale: 1.2 }), decor('seiryu_stone', -0.05, -0.01, { id: 'B', scale: 1.3 }), decor('dragon_stone', 0.05, -0.02, { id: 'C', scale: 1.3 })];
    const tank = makeTestTank({ tierId: 'g29', waterClass: 'marine_fowlr', decor: rocks });
    const w = makeTestWorld(tank, [makeTestCreature('lined_seahorse', tank.id, { id: 'sh1' }), makeTestCreature('lined_seahorse', tank.id, { id: 'sh2' })]);
    let pressing = 0;
    let hitched = 0;
    let total = 0;
    for (let f = 0; f < 60 * 240; f++) {
      stepWorld(w, 1 / 60);
      for (const a of w.agents) {
        total++;
        if (a.act === 'hitch' && a.actPhase === 0 && a.speed < 0.01 && a.ctrl.hasGoal && a.actT > 3) pressing++;
        if (a.act === 'hitch' && a.actPhase >= 1) hitched++;
      }
    }
    // it used to press its snout into the rock for 60 % of all frames and hitch for 5 %
    expect(hitched / total, 'share of frames hitched').toBeGreaterThan(0.3);
    expect(pressing / total, 'share of frames pressing at an unreachable holdfast').toBeLessThan(0.2);
  });

  it('S08-02: virtual holdfasts under a stone are not chosen', () => {
    // a bare marine tank: the seahorse invents holdfast spots on the sand; a stone dropped on one of them makes it no good
    const tank = makeTestTank({ tierId: 'g29', waterClass: 'marine_fowlr', decor: [] });
    const w = makeTestWorld(tank, [makeTestCreature('lined_seahorse', tank.id, { id: 'sh1' })]);
    step(w, 5);
    const spots = w.virtualAnchors.filter((v) => v.kind === 'hitch');
    expect(spots.length).toBeGreaterThan(0);
    const sh = w.agents[0];
    // bury every spot but the last under a stone
    tank.decor = spots.slice(0, -1).map((v, i) => decor('seiryu_stone', v.pos.x, v.pos.z, { id: `s${i}`, scale: 1.4 }));
    w.virtualAnchors.length = 0;
    const creatures = [makeTestCreature('lined_seahorse', tank.id, { id: 'sh1' })];
    // (the world resyncs: the same creature keeps its agent)
    syncWorld(w, { tank, creatures, clutches: [], hour: 12, refreshInfo: true });
    let hitched = 0;
    for (let f = 0; f < 60 * 120; f++) {
      stepWorld(w, 1 / 60);
      if (sh.act === 'hitch' && sh.actPhase >= 1) hitched++;
    }
    expect(hitched).toBeGreaterThan(60 * 20);
    if (sh.anchorKey?.startsWith('virtual:')) {
      const v = w.virtualAnchors.find((x) => x.key === sh.anchorKey)!;
      expect(v.key).toBe(spots[spots.length - 1].key);
    }
  });
});

describe('fix AI: claims, step rate and colliders', () => {
  it('S07-07: an anchor claim is released when the animal moves on to something else', () => {
    const tank = makeTestTank({ id: 't1', decor: [decor('test_rock', 0.05, 0.02, { id: 'rock' })] });
    const w = makeTestWorld(tank, [makeTestCreature('kuhli_loach', 't1', { id: 'k1' })], 12);
    const a = w.agents[0];
    expect(startAct(a, w, 'hide')).toBe(true);
    expect(a.anchorKey).toMatch(/^rock#/);
    const key = a.anchorKey!;
    expect(w.claims.get(key)).toBe(1);
    step(w, 3);
    startAct(a, w, 'forage');
    expect(a.anchorKey, 'claim released on leaving the hide').toBeNull();
    expect(w.claims.get(key) ?? 0).toBe(0);
  });

  it('S07-06: the forage mouth pulse fires at the same rate at 144 Hz and 30 Hz', () => {
    const rate = (dt: number) => {
      const tank = makeTestTank({ id: 't1' });
      const w = makeTestWorld(tank, [makeTestCreature('panda_corydoras', 't1', { id: 'c1', stats: { health: 100, hunger: 60, stress: 5, energy: 80, social: 70, comfort: 80, breedingReadiness: 0, enrichment: 60 } })], 12);
      const a = w.agents[0];
      let pulses = 0;
      let prev = 0;
      let secs = 0;
      for (let round = 0; round < 12; round++) {
        startAct(a, w, 'forage');
        for (let i = 0; i < Math.round(10 / dt); i++) {
          stepWorld(w, dt);
          if (a.act !== 'forage') break;
          secs += dt;
          if (a.mouthPulse > prev + 0.3) pulses++;
          prev = a.mouthPulse;
        }
      }
      return pulses / Math.max(1, secs);
    };
    const fast = rate(1 / 144);
    const slow = rate(1 / 30);
    // (a per-step 12 % roll made 17 pulses/s at 144 Hz against 3.6/s at 30 Hz)
    expect(fast / slow).toBeGreaterThan(0.55);
    expect(fast / slow).toBeLessThan(1.8);
  });

  it('S08-04: with more than 31 colliders, easing out of one does not switch off the constraints of the others', () => {
    const tank = makeTestTank({ id: 't1' });
    const w = makeTestWorld(tank, [makeTestCreature('neon_tetra', 't1', { id: 'n1' })], 12);
    const a = w.agents[0];
    const box = (id: string, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number): Collider => ({ decorId: id, category: 'hardscape', cx, cy, cz, hx, hy, hz, r: 0, hard: true, top: cy + hy, part: 'body', rise: 1, grounded: false });
    const env = w.env;
    const P = { x: 0, y: (env.floorY + env.surfaceY) / 2, z: 0 };
    const noseX = a.set.body.hx * a.L;
    // 35 pebbles far off in a corner, then A (index 35: the fish is caught inside it, thin in z so it eases out along z)
    // and B (index 36: a rock the nose pokes into). Indices >= 30 used to share one bit of the 'deep' mask.
    const cs: Collider[] = [];
    for (let i = 0; i < 35; i++) cs.push(box(`peb${i}`, env.minX + 0.02, env.floorY + 0.01, env.minZ + 0.02 + i * 0.001, 0.005, 0.005, 0.005));
    cs.push(box('A', P.x, P.y, P.z, 0.05, 0.05, 0.012));
    const bMinX = P.x + noseX * 0.5;
    cs.push(box('B', bMinX + 0.03, P.y, P.z, 0.03, 0.05, 0.05));
    env.colliders.length = 0;
    env.colliders.push(...cs);
    a.rt.pos.set(P.x, P.y, P.z);
    a.fwd.set(1, 0, 0);
    a.speed = 0;
    a.ctrl.ignoreDecor = null;
    constrainBody(a, w);
    // B's nose constraint still applies: the body is pushed back out of it along -x
    expect(a.rt.pos.x, 'pushed back from the rock at its nose').toBeLessThan(P.x - noseX * 0.2);
    // and A eases it out sideways at the same time
    expect(Math.abs(a.rt.pos.z - P.z)).toBeGreaterThan(0);
  });

  it('S08-03: sump overflow, canister intake and HOB skimmer pump are solid for the AI; the tilted heater is covered', () => {
    const tank = makeTestTank({ id: 't1', tierId: 'g75', waterClass: 'reef' });
    tank.equipment = [eq('filter_sump'), eq('filter_canister'), eq('skimmer_hob'), eq('heater_300w')];
    const layout = equipmentLayout(tank);
    const solids = equipmentSolids(layout, tank);
    const has = (pred: (s: (typeof solids)[number]) => boolean) => solids.some(pred);
    // the overflow box: 11 cm square in the right rear corner, most of the tank's height
    expect(has((s) => s.id === 'eq:eq_filter_sump' && s.hx > 0.05 && s.hy > 0.1)).toBe(true);
    // the canister's intake strainer + tube and its outlet spray bar
    expect(has((s) => s.id === 'eq:eq_filter_canister')).toBe(true);
    expect(has((s) => s.id === 'eq:eq_filter_canister:outlet')).toBe(true);
    // the skimmer's in-tank pump
    expect(has((s) => s.id === 'eq:eq_skimmer_hob' && s.hy >= 0.02)).toBe(true);
    // the heater leans 0.16 rad inward: the top of its tube (a tube is drawn by TankEquipment rotated about z) lies
    // inside one of its solids
    const heaterPlacement = layout.find((p) => p.visual === 'heater_tube');
    if (heaterPlacement) {
      const [x, y, z] = heaterPlacement.pos;
      const L = heaterPlacement.size;
      const topX = x - Math.sin(0.16) * (L / 2);
      const topY = y + Math.cos(0.16) * (L / 2);
      const inside = solids.some((s) => s.id.startsWith('eq:eq_heater_300w') && Math.abs(topX - s.cx) <= s.hx && Math.abs(topY - s.cy) <= s.hy && Math.abs(z - s.cz) <= s.hz);
      expect(inside, 'the top of the tilted heater tube is inside a collider').toBe(true);
    }
    // and in a world (built with the equipment solids, as TankAI does): a fish is kept out of the overflow box
    const w = createWorld(tank.id, { resolveDecor: resolveTestDecor, extras: (t) => equipmentSolids(equipmentLayout(t), t), personality: (c) => personalityModifiers(c), species: findSpecies, hooks: {} });
    syncWorld(w, { tank, creatures: [makeTestCreature('neon_tetra', 't1', { id: 'n1' }), makeTestCreature('neon_tetra', 't1', { id: 'n2' }), makeTestCreature('neon_tetra', 't1', { id: 'n3' })], clutches: [], hour: 12, refreshInfo: true });
    const box = w.env.colliders.find((c) => c.decorId === 'eq:eq_filter_sump')!;
    expect(box).toBeTruthy();
    let inside = 0;
    for (let i = 0; i < 60 * 60; i++) {
      stepWorld(w, 1 / 60);
      for (const a of w.agents) if (colliderSdf(box, a.rt.pos.x, a.rt.pos.y, a.rt.pos.z) < -0.004) inside++;
    }
    expect(inside, 'agent-frames with the body centre inside the overflow box').toBe(0);
  });
});
