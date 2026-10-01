import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { raySubstrateT, rayDecorBoxT, isDecorTap, TAP_MS, type PressState } from '@/render/decor/pickMath';
import { TapSpam } from '@/render/interaction/tapSpam';
import { substrateHeightAt } from '@/sim/aquascape/terrain';
import { tankDims } from '@/sim/tankSpace';
import { getDecorDef } from '@/data/catalog/decor';
import type { DecorInstance } from '@/types';

const tank = { id: 'tank_pick', tierId: 'g40B', substrate: { kind: 'sand', depthCm: 5, color: '#d8c8a0' } } as unknown as Parameters<typeof raySubstrateT>[1];

describe('decor editor picking (S11-03)', () => {
  it('a ray from the front camera meets the substrate heightfield where the bed really is', () => {
    const d = tankDims(tank);
    for (const [x, z] of [
      [0, 0],
      [0.2, -0.1],
      [-0.3, 0.12],
    ]) {
      const target = new THREE.Vector3(x, substrateHeightAt(tank, x, z), z);
      const origin = new THREE.Vector3(0.1, d.H + 0.4, d.W / 2 + 0.9);
      const ray = new THREE.Ray(origin, target.clone().sub(origin).normalize());
      const t = raySubstrateT(ray, tank);
      expect(t).not.toBeNull();
      const p = ray.at(t as number, new THREE.Vector3());
      expect(p.distanceTo(target)).toBeLessThan(0.004);
    }
  });

  it('a ray that never enters the tank misses', () => {
    const d = tankDims(tank);
    const ray = new THREE.Ray(new THREE.Vector3(0, d.H + 1, d.W / 2 + 1), new THREE.Vector3(0, 0.2, -1).normalize());
    expect(raySubstrateT(ray, tank)).toBeNull();
  });

  it('only pieces whose footprint box the ray crosses are candidates, respecting rotation', () => {
    const def = getDecorDef('seiryu_stone');
    expect(def).toBeTruthy();
    const inst = { id: 'd1', defId: 'seiryu_stone', x: 0.2, y: 0.02, z: 0, rotY: Math.PI / 2, scale: 1, seed: 1 } as unknown as DecorInstance;
    const hit = new THREE.Ray(new THREE.Vector3(0.2, 0.5, 1), new THREE.Vector3(0, -0.4, -1).normalize());
    const t = rayDecorBoxT(hit, inst, def!);
    expect(t).not.toBeNull();
    expect(t!).toBeGreaterThan(0.5);
    const miss = new THREE.Ray(new THREE.Vector3(-0.3, 0.5, 1), new THREE.Vector3(0, -0.4, -1).normalize());
    expect(rayDecorBoxT(miss, inst, def!)).toBeNull();
  });
});

describe('decor placement taps on touch (S11-05 / P4-04)', () => {
  const press = (p: Partial<PressState> = {}): PressState => ({ downAt: 1000, downId: 1, downX: 100, downY: 100, touches: 0, gestured: false, ...p });
  const lift = (p: Partial<{ button: number; pointerId: number; pointerType: string; clientX: number; clientY: number }> = {}) => ({ button: 0, pointerId: 1, pointerType: 'touch', clientX: 102, clientY: 101, ...p });

  it('a quick single-finger tap places', () => {
    expect(isDecorTap(lift(), press(), 1200)).toBe(true);
  });

  it('the last finger of a quick twist/pinch never places', () => {
    expect(isDecorTap(lift({ pointerId: 2 }), press({ gestured: true }), 1150)).toBe(false);
    expect(isDecorTap(lift(), press({ gestured: true }), 1150)).toBe(false);
  });

  it('a different finger than the one that went down does not place', () => {
    expect(isDecorTap(lift({ pointerId: 7 }), press(), 1200)).toBe(false);
  });

  it('a finger drag is not a tap on touch, but a mouse click may move a little', () => {
    expect(isDecorTap(lift({ clientX: 160 }), press(), 1200)).toBe(false);
    expect(isDecorTap(lift({ clientX: 160, pointerType: 'mouse' }), press(), 1200)).toBe(true);
  });

  it('a slow press, a used-up press or fingers still down do not place', () => {
    expect(isDecorTap(lift(), press(), 1000 + TAP_MS + 1)).toBe(false);
    expect(isDecorTap(lift(), press({ downAt: 0 }), 1200)).toBe(false);
    expect(isDecorTap(lift(), press({ touches: 1 }), 1200)).toBe(false);
  });
});

describe('glass tap spam rule (S11-06)', () => {
  it('four deliberate Tap-tool knocks within 3 s count as spamming', () => {
    const s = new TapSpam();
    expect([0, 0.2, 0.4, 0.6].map((t) => s.add(t, 1))).toEqual([false, false, false, true]);
  });

  it('stray half-strength clicks need eight in the window', () => {
    const s = new TapSpam();
    const out = [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1].map((t) => s.add(t, 0.5));
    expect(out.slice(0, 7).every((x) => !x)).toBe(true);
    expect(out[7]).toBe(true);
  });

  it('taps older than the window no longer count', () => {
    const s = new TapSpam();
    [0, 0.5, 1].forEach((t) => s.add(t, 1));
    expect(s.add(4.2, 1)).toBe(false);
  });
});
