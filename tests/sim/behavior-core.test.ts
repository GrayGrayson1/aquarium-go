/**
 * Headless tests for the creature AI core (lane "behavior").
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { findSpecies } from '@/data/species';
import { stepWorld, addStimulus, syncWorld } from '@/ai/core/world';
import { colliderSdf, floorAt } from '@/ai/core/env';
import { spawnFood } from '@/ai/core/food';
import { makeTestCreature, makeTestTank, makeTestWorld, decor } from '@/ai/core/testkit';
import type { Creature } from '@/types';

const DT = 1 / 60;

function inBounds(w: ReturnType<typeof makeTestWorld>, tol = 1e-4) {
  const e = w.env;
  const bad: string[] = [];
  for (const a of w.agents) {
    const p = a.rt.pos;
    const finite = [p.x, p.y, p.z, a.rt.yaw, a.rt.pitch, a.rt.roll, a.rt.swimPhase, a.rt.bend].every(Number.isFinite);
    if (!finite) bad.push(`${a.speciesId} NaN`);
    const burrowing = a.act === 'burrow';
    if (p.x < e.minX - tol || p.x > e.maxX + tol || p.z < e.minZ - tol || p.z > e.maxZ + tol) bad.push(`${a.speciesId} out xz ${p.x.toFixed(3)},${p.z.toFixed(3)}`);
    const floor = floorAt(e, p.x, p.z);
    if (p.y > e.surfaceY + tol || (!burrowing && p.y < floor - tol)) bad.push(`${a.speciesId} out y ${p.y.toFixed(3)} floor ${floor.toFixed(3)}`);
    for (const c of e.colliders) {
      if (!c.hard || c.decorId === a.ctrl.ignoreDecor) continue;
      const d = colliderSdf(c, p.x, p.y, p.z);
      if (d < -0.004) bad.push(`${a.speciesId} inside decor ${c.decorId} d=${d.toFixed(4)} act=${a.act}`);
    }
    // nose and tail too (long bodies: axolotl, loach, goldfish) — except climbers that walk over decor
    const climbs = a.set.loco === 'crawl' && (a.set.crawlMask & 4) !== 0;
    if (a.loco !== 'upright') {
      for (const k of [0.45, -0.42]) {
        const x = p.x + a.fwd.x * a.L * k;
        const y = p.y + a.fwd.y * a.L * k;
        const z = p.z + a.fwd.z * a.L * k;
        if (x < e.minX - 0.002 || x > e.maxX + 0.002 || z < e.minZ - 0.002 || z > e.maxZ + 0.002) {
          if (!(a.set.loco === 'crawl' && (a.set.crawlMask & 2))) bad.push(`${a.speciesId} ${k > 0 ? 'nose' : 'tail'} through glass`);
        }
        if (climbs || burrowing) continue;
        for (const c of e.colliders) {
          if (!c.hard || c.decorId === a.ctrl.ignoreDecor) continue;
          const d = colliderSdf(c, x, y, z);
          if (d < -0.006) bad.push(`${a.speciesId} ${k > 0 ? 'nose' : 'tail'} inside decor d=${d.toFixed(4)} act=${a.act}`);
        }
      }
    }
  }
  return bad;
}

function community(tankId: string): Creature[] {
  const ids = [
    ['neon_tetra', 8],
    ['panda_corydoras', 4],
    ['cherry_shrimp', 4],
    ['mystery_snail', 2],
    ['otocinclus', 2],
    ['honey_gourami', 1],
    ['kuhli_loach', 2],
    ['fancy_guppy', 3],
    ['betta', 1],
    ['pea_puffer', 1],
    ['axolotl', 1],
  ] as const;
  const out: Creature[] = [];
  for (const [id, n] of ids) {
    if (!findSpecies(id)) continue;
    for (let i = 0; i < n; i++) out.push(makeTestCreature(id, tankId, { temperament: 20 + ((i * 37) % 70), curiosity: 30 + ((i * 53) % 60) }));
  }
  return out;
}

describe('behavior core', () => {
  it('10k steps: every creature stays inside the water and out of hard decor, no NaN', () => {
    const tank = makeTestTank({
      tierId: 'g40B',
      decor: [decor('test_rock', -0.2, 0.02), decor('test_rock', 0.25, -0.1, { scale: 1.4 }), decor('test_plant', 0.05, -0.12), decor('test_branch', -0.3, -0.12)],
    });
    const creatures = community(tank.id);
    expect(creatures.length).toBeGreaterThan(5);
    const w = makeTestWorld(tank, creatures, 12);
    expect(w.agents.length).toBe(creatures.length);
    const problems = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      stepWorld(w, DT);
      if (i % 50 === 0) for (const b of inBounds(w)) problems.add(b);
      if (i === 3000) {
        // feed mid-run, and tap the glass
        spawnFood(w, { foodId: 'flake_tropical', delivery: 'floating', color: '#d98a4e', tags: ['flake'], nutrition: 25 }, new THREE.Vector3(0, 0.3, 0));
        spawnFood(w, { foodId: 'sinking_pellets', delivery: 'fast_sink', color: '#7a5636', tags: ['pellet_sinking'], nutrition: 30 }, new THREE.Vector3(0.1, 0.3, 0.05));
      }
      if (i === 5000) addStimulus(w, 'tap', new THREE.Vector3(0, 0.15, w.env.maxZ), 1, false);
      if (i === 6000) syncWorld(w, { tank, creatures, clutches: [], hour: 23, refreshInfo: true }); // night
    }
    expect([...problems].slice(0, 12)).toEqual([]);
  });

  it('schools stay cohesive', () => {
    if (!findSpecies('neon_tetra')) return;
    const tank = makeTestTank({ tierId: 'g40B' });
    const creatures = Array.from({ length: 12 }, () => makeTestCreature('neon_tetra', tank.id));
    const w = makeTestWorld(tank, creatures, 12);
    const spreads: number[] = [];
    const c = new THREE.Vector3();
    for (let i = 0; i < 60 * 60; i++) {
      stepWorld(w, DT);
      if (i > 60 * 10 && i % 30 === 0) {
        c.set(0, 0, 0);
        for (const a of w.agents) c.add(a.rt.pos);
        c.multiplyScalar(1 / w.agents.length);
        let s = 0;
        for (const a of w.agents) s += a.rt.pos.distanceTo(c);
        spreads.push(s / w.agents.length);
      }
    }
    const mean = spreads.reduce((x, y) => x + y, 0) / spreads.length;
    const L = w.agents[0].L;
    // mean distance to the school centroid stays within a handful of body lengths
    expect(mean).toBeLessThan(L * 6);
    // and they are really schooling most of the time
    const schooling = w.agents.filter((a) => a.act === 'school').length;
    expect(schooling).toBeGreaterThan(6);
  });

  it('hitching seahorses end up at hitch anchors', () => {
    if (!findSpecies('lined_seahorse')) return;
    const tank = makeTestTank({ tierId: 'g29', waterClass: 'marine_live_rock', decor: [decor('test_branch', -0.15, -0.05), decor('test_branch', 0.18, 0.0)] });
    const creatures = [makeTestCreature('lined_seahorse', tank.id), makeTestCreature('lined_seahorse', tank.id)];
    const w = makeTestWorld(tank, creatures, 12);
    let hitchedSamples = 0;
    let samples = 0;
    for (let i = 0; i < 60 * 120; i++) {
      stepWorld(w, DT);
      if (i > 60 * 30 && i % 60 === 0) {
        for (const a of w.agents) {
          samples++;
          const near = w.env.byKind.hitch.some((an) => an.pos.distanceTo(a.rt.pos) < a.L * 0.8);
          if (near && a.rt.pose === 'hitched') hitchedSamples++;
        }
      }
    }
    expect(hitchedSamples / samples).toBeGreaterThan(0.5);
    expect(w.agents.every((a) => a.rt.tailCurl >= 0 && a.rt.tailCurl <= 1)).toBe(true);
  });

  it('a glass tap pushes nearby fish away from the tap point', () => {
    const sp = findSpecies('neon_tetra') ? 'neon_tetra' : 'betta';
    const tank = makeTestTank({ tierId: 'g40B' });
    const creatures = Array.from({ length: 8 }, (_, i) => makeTestCreature(sp, tank.id, { temperament: 15, curiosity: 30, personality: i % 2 ? ['shy'] : ['easily_startled'] }));
    const w = makeTestWorld(tank, creatures, 12);
    for (let i = 0; i < 60 * 5; i++) stepWorld(w, DT);
    // tap right next to the average fish position, on the front glass
    const c = new THREE.Vector3();
    for (const a of w.agents) c.add(a.rt.pos);
    c.multiplyScalar(1 / w.agents.length);
    const tap = new THREE.Vector3(c.x, c.y, w.env.maxZ);
    const before = w.agents.map((a) => a.rt.pos.distanceTo(tap));
    addStimulus(w, 'tap', tap, 1, false);
    for (let i = 0; i < 60; i++) stepWorld(w, DT);
    const after = w.agents.map((a) => a.rt.pos.distanceTo(tap));
    const moved = after.filter((d, i) => d > before[i] + 0.005).length;
    expect(moved).toBeGreaterThanOrEqual(Math.ceil(w.agents.length * 0.6));
    expect(w.agents.some((a) => a.act === 'startle' || a.act === 'retreat')).toBe(true);
  });

  it('hungry fish visibly eat food and fast feeders beat the seahorse', () => {
    if (!findSpecies('lined_seahorse') || !findSpecies('green_chromis')) return;
    const tank = makeTestTank({ tierId: 'g29', waterClass: 'marine_live_rock', decor: [decor('test_branch', -0.2, -0.05)] });
    const sh = makeTestCreature('lined_seahorse', tank.id);
    const fast = Array.from({ length: 3 }, () => makeTestCreature('green_chromis', tank.id, { stats: { health: 100, hunger: 80, stress: 5, energy: 90, social: 80, comfort: 80, breedingReadiness: 0, enrichment: 50 } }));
    const w = makeTestWorld(tank, [sh, ...fast], 12);
    const eaten = new Map<string, number>();
    w.hooks.event = (kind, _p, id) => {
      if (kind === 'eat' && id) eaten.set(id, (eaten.get(id) ?? 0) + 1);
    };
    for (let i = 0; i < 60 * 5; i++) stepWorld(w, DT);
    spawnFood(w, { foodId: 'mysis_frozen', delivery: 'slow_sink', color: '#ddd', tags: ['mysis'], nutrition: 35 }, new THREE.Vector3(0.1, 0.35, 0), { count: 12 });
    for (let i = 0; i < 60 * 25; i++) stepWorld(w, DT);
    const fastEaten = fast.reduce((s, c) => s + (eaten.get(c.id) ?? 0), 0);
    expect(fastEaten).toBeGreaterThan(3);
    expect(fastEaten).toBeGreaterThan(eaten.get(sh.id) ?? 0);
  });
});

describe('behavior feeding (real starter tank)', () => {
  it('the showcase betta actually eats pellets dropped at the surface (mouth reaches food, even over decor)', async () => {
    const { makeShowcase } = await import('@/dev/fixtures');
    const { createWorld } = await import('@/ai/core/world');
    const { getDecorDef } = await import('@/data/catalog/decor');
    const { personalityModifiers } = await import('@/sim/life');
    const g = makeShowcase('betta');
    const tank = g.tanks[g.tankOrder[0]];
    const cs = Object.values(g.creatures).filter((c) => c.tankId === tank.id);
    const w = createWorld(tank.id, { resolveDecor: getDecorDef, personality: personalityModifiers, species: findSpecies });
    syncWorld(w, { tank, creatures: cs, clutches: [], hour: g.clock.hour, refreshInfo: true });
    let eats = 0;
    w.hooks.event = (k) => {
      if (k === 'eat') eats++;
    };
    for (let i = 0; i < 60 * 6; i++) stepWorld(w, DT);
    spawnFood(w, { foodId: 'micro_pellets', delivery: 'slow_sink', color: '#b0643a', tags: ['pellet_small'], nutrition: 25 }, new THREE.Vector3(-0.03, w.env.surfaceY - 0.002, 0.05));
    for (let i = 0; i < 60 * 10; i++) stepWorld(w, DT);
    expect(eats).toBeGreaterThanOrEqual(3);
  });
});

describe('behavior hunting', () => {
  it('the pea puffer stalks, aims and strikes live snails', async () => {
    const { makeShowcase } = await import('@/dev/fixtures');
    const { createWorld } = await import('@/ai/core/world');
    const { getDecorDef } = await import('@/data/catalog/decor');
    const { personalityModifiers } = await import('@/sim/life');
    const g = makeShowcase('pea_puffer');
    const tank = g.tanks[g.tankOrder[0]];
    const cs = Object.values(g.creatures).filter((c) => c.tankId === tank.id);
    const w = createWorld(tank.id, { resolveDecor: getDecorDef, personality: personalityModifiers, species: findSpecies });
    syncWorld(w, { tank, creatures: cs, clutches: [], hour: g.clock.hour, refreshInfo: true });
    let bites = 0;
    const phases = new Set<number>();
    w.hooks.event = (k) => {
      if (k === 'bite') bites++;
    };
    for (let i = 0; i < 60 * 5; i++) stepWorld(w, DT);
    spawnFood(w, { foodId: 'live_snails', delivery: 'live', color: '#8a6e4b', tags: ['snail_live'], nutrition: 30 }, new THREE.Vector3(0.05, w.env.surfaceY - 0.002, 0.05));
    for (let i = 0; i < 60 * 15; i++) {
      stepWorld(w, DT);
      if (w.agents[0].act === 'hunt') phases.add(w.agents[0].actPhase);
    }
    expect(phases.has(0) && phases.has(1) && phases.has(2)).toBe(true);
    expect(bites).toBeGreaterThanOrEqual(2);
  });
});
