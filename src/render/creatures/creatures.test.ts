/**
 * Headless smoke test of every creature visual (no GL): builds each species × LOD × stage × sex, runs a few frames of
 * update(), and checks the invariants the tank renderer relies on. OWNER: lane "fishart".
 */
import { afterAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { getCreatureFactory } from './registry';
import './index';
import { ALL_SPECIES } from '@/data/species';
import { DEFAULT_TANK_FX } from '../shared/underwater';
import type { Creature, CreatureRuntime } from '@/types';
import type { RenderLod } from '../lod';
import type { FishObject } from './core/fishObject';
import { acquireFishGeometry, fishCacheStats, flushFishCache, releaseFishGeometry } from './core/cache';
import { MAX_FINS, MAX_MARKS } from './core/shaders';
import { acquire, cacheStats, flushUnreferenced, release } from './special/common/cache';
import { filterPose, makePoseFilter } from './core/poseFilter';
import { creatureKeysByTank, DEAD_LINGER_HOURS, DEAD_LINGER_MS, deadBodyShown, resetDeathMemory } from './TankCreatures';

const LODS: RenderLod[] = [0, 1, 2];
const STAGES = ['adult', 'juvenile'] as const;
const SEXES = ['male', 'female'] as const;

function fakeCreature(speciesId: string, stage: string, sex: string, sizeCm: number): Creature {
  return { id: `c_${speciesId}_${stage}_${sex}`, speciesId, name: 'x', lifeStage: stage, sex, sizeCm, status: 'alive', tankId: 't1', appearance: undefined } as unknown as Creature;
}

function fakeRuntime(speciesId: string): CreatureRuntime {
  return {
    id: 'x',
    speciesId,
    tankId: 't1',
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    yaw: 0.3,
    pitch: 0.1,
    roll: 0,
    speedBL: 1,
    swimPhase: 0,
    bend: 0.3,
    finFlare: 1,
    gillFlick: 0.5,
    mouthOpen: 0.5,
    eyeL: 0.2,
    eyeR: -0.2,
    flutter: 0.5,
    tailCurl: 0,
    puff: 1,
    belly: 1,
    colorIntensity: 0.9,
    pose: 'swim',
    behavior: 'curious about the glass',
    lengthM: 0.05,
    visible: true,
    selected: false,
    ai: {},
  } as CreatureRuntime;
}

/** Max vertex y over the rest-pose body + fin geometry under root (local units, body lengths; eyes are unit spheres). */
function meshTopY(root: THREE.Object3D): number {
  let top = -Infinity;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m.name !== 'body' && m.name !== 'fins')) return;
    const p = m.geometry.attributes.position?.array as ArrayLike<number> | undefined;
    if (!p) return;
    for (let i = 1; i < p.length; i += 3) if (p[i] > top) top = p[i];
  });
  return top;
}

function checkFinite(root: THREE.Object3D, label: string): void {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    for (const v of m.matrixWorld.elements) if (!Number.isFinite(v)) throw new Error(`${label}: NaN matrix on ${m.name}`);
    if (!m.isMesh) return;
    const g = m.geometry as THREE.BufferGeometry;
    for (const name of ['position', 'normal'] as const) {
      const a = g.attributes[name];
      if (!a) {
        if (name === 'normal') throw new Error(`${label}: ${m.name} has no normals`);
        continue;
      }
      const arr = a.array as ArrayLike<number>;
      for (let i = 0; i < arr.length; i += a.itemSize) {
        const x = arr[i];
        const y = arr[i + 1];
        const z = arr[i + 2];
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) throw new Error(`${label}: ${m.name} ${name} has NaN`);
        if (name === 'normal' && x * x + y * y + z * z < 1e-6) throw new Error(`${label}: ${m.name} has a zero normal`);
      }
    }
  });
}

afterAll(() => {
  flushFishCache();
  flushUnreferenced();
});

describe('creature visuals build headless for every species / LOD / stage / sex', () => {
  for (const sp of ALL_SPECIES) {
    it(`${sp.id} builds, animates and disposes cleanly`, () => {
      const factory = getCreatureFactory(sp.id, sp.behaviorSet);
      expect(factory, `no visual registered for ${sp.id}`).toBeTruthy();
      const rt = fakeRuntime(sp.id);
      const plans = new Map<string, string>();
      for (const lod of LODS) for (const stage of STAGES) for (const sex of SEXES) {
        const label = `${sp.id} lod${lod} ${stage} ${sex}`;
        const creature = fakeCreature(sp.id, stage, sex, sp.adultSizeCm);
        const o = factory!({ species: sp, creature, appearance: sp.genetics.baseVisual, lod, quality: 'high', fx: DEFAULT_TANK_FX });
        for (let i = 0; i < 6; i++) o.update(rt, 1 / 60, i / 60);
        rt.pose = 'dead';
        o.update(rt, 1 / 60, 0.2);
        rt.pose = 'swim';
        checkFinite(o.root, label);
        // the waterline clamp uses topOffset: it must cover the real rest-pose top (±3 % of a body length) and never
        // be the old generous culling box (0.6) for a fish whose real top is far below it
        const top = o.root.userData.topOffset as number | undefined;
        const real = meshTopY(o.root);
        const fish = o as FishObject;
        if (fish.plan) {
          expect(top, label).toBeTypeOf('number');
          expect(top!, `${label}: topOffset ${top} below real top ${real}`).toBeGreaterThanOrEqual(real - 0.03);
          const depth = Math.max(1, sp.genetics.baseVisual.bodyDepth ?? 1);
          expect(top!, `${label}: topOffset ${top} far above real top ${real} (body depth ${depth})`).toBeLessThanOrEqual(real * depth + 0.06);
          expect(fish.plan.fins.length, label).toBeLessThanOrEqual(MAX_FINS);
          expect((fish.plan.look.marks ?? []).length, label).toBeLessThanOrEqual(MAX_MARKS);
          // the same geometry key must always mean the same body + fins
          const shape = JSON.stringify({ b: fish.plan.body, f: fish.plan.fins, e: fish.plan.extras });
          const prev = plans.get(fish.plan.key);
          if (prev !== undefined) expect(shape, `${label}: plan key ${fish.plan.key} reused for a different shape`).toBe(prev);
          plans.set(fish.plan.key, shape);
        } else if (typeof top === 'number') {
          expect(top, label).toBeGreaterThan(0);
          expect(top, label).toBeLessThanOrEqual(0.6);
        }
        o.dispose();
      }
    });
  }

  it('dispose returns every shared geometry / template to zero refs', () => {
    for (const s of fishCacheStats()) expect(s.refs, s.key).toBe(0);
    for (const s of cacheStats()) expect(s.refs, s.key).toBe(0);
  });
});

describe('template caches linger after the last release', () => {
  it('a re-acquired critter template within the linger window is not rebuilt', () => {
    let builds = 0;
    let disposed = 0;
    const key = 'test|template';
    const a = acquire(key, () => ({ n: ++builds }), () => disposed++);
    release(key);
    const b = acquire(key, () => ({ n: ++builds }), () => disposed++);
    expect(b).toBe(a);
    expect(builds).toBe(1);
    expect(disposed).toBe(0);
    release(key);
    flushUnreferenced();
    expect(disposed).toBe(1);
    expect(cacheStats().find((s) => s.key === key)).toBeUndefined();
  });

  it('fish geometry re-acquired within the linger window is the same object', () => {
    const betta = ALL_SPECIES.find((s) => s.id === 'betta')!;
    const f = getCreatureFactory(betta.id, betta.behaviorSet)!;
    const o = f({ species: betta, creature: null, appearance: betta.genetics.baseVisual, lod: 0, quality: 'high', fx: DEFAULT_TANK_FX }) as FishObject;
    const g1 = acquireFishGeometry(o.plan, 0, 'high');
    expect(g1.refs).toBeGreaterThanOrEqual(2);
    expect(g1.topY).toBeGreaterThan(0.05);
    expect(g1.topY).toBeLessThan(0.5);
    releaseFishGeometry(g1);
    o.dispose();
    const g2 = acquireFishGeometry(o.plan, 0, 'high');
    expect(g2).toBe(g1);
    releaseFishGeometry(g2);
  });
});

describe('dead bodies linger for the renderer window', () => {
  const creatures = (status: Creature['status']) => ({ a: { ...fakeCreature('betta', 'adult', 'male', 6), id: 'a', status } }) as Record<string, Creature>;

  it('a creature seen alive here keeps its visual after dying, then leaves', () => {
    resetDeathMemory();
    expect(creatureKeysByTank(creatures('alive'), 10).get('t1')).toContain('a=');
    expect(creatureKeysByTank(creatures('dead'), 10.5).get('t1')).toContain('a=');
    // the window: game hours AND a real-time floor (the sink to the floor is seen at 10x)
    const c = creatures('dead').a;
    expect(deadBodyShown(c, 10.5 + DEAD_LINGER_HOURS - 0.1, performance.now())).toBe(true);
    expect(deadBodyShown(c, 10.5 + DEAD_LINGER_HOURS + 0.1, performance.now())).toBe(true);
    expect(deadBodyShown(c, 10.5 + DEAD_LINGER_HOURS + 0.1, performance.now() + DEAD_LINGER_MS + 1)).toBe(false);
    expect(creatureKeysByTank(creatures('dead'), 20).get('t1')).toBeUndefined();
  });

  it('a creature already dead when first seen (loaded save) is never drawn', () => {
    resetDeathMemory();
    expect(creatureKeysByTank(creatures('dead'), 10).get('t1')).toBeUndefined();
    expect(creatureKeysByTank(creatures('sold'), 10).get('t1')).toBeUndefined();
  });
});

describe('pose filter', () => {
  it('converges on a step, passes fast motion through, and wraps yaw at ±π', () => {
    const f = makePoseFilter();
    const dt = 1 / 60;
    filterPose(f, 0, 0, 0, 0, 0, 0, 0.05, 0, dt);
    // a 0.02 m step (0.4 body lengths) is smoothed, then converges
    filterPose(f, 0.02, 0, 0, 0, 0, 0, 0.05, dt, dt);
    expect(f.x).toBeGreaterThan(0);
    expect(f.x).toBeLessThan(0.02);
    for (let i = 2; i < 200; i++) filterPose(f, 0.02, 0, 0, 0, 0, 0, 0.05, i * dt, dt);
    expect(f.x).toBeCloseTo(0.02, 4);
    // a jump beyond JUMP_BL restarts the filter: no lag on a teleport
    filterPose(f, 1, 0, 0, 0, 0, 0, 0.05, 200 * dt, dt);
    expect(f.x).toBe(1);
    // heading crossing ±π never spins the long way round
    filterPose(f, 1, 0, 0, Math.PI - 0.05, 0, 0, 0.05, 201 * dt, dt);
    for (let i = 202; i < 260; i++) filterPose(f, 1, 0, 0, -Math.PI + 0.05, 0, 0, 0.05, i * dt, dt);
    expect(Math.abs(f.yaw)).toBeGreaterThan(Math.PI - 0.06);
    expect(Math.abs(f.yaw)).toBeLessThanOrEqual(Math.PI);
  });
});
