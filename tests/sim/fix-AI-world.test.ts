/**
 * Fix lane AI — the AI world's reaction to tank changes (audit S08-01) and to deaths (CREATURES request S09-04).
 *  - evaporation / a top-off moves the surface without rebuilding colliders or making anyone replan
 *  - a decor edit disturbs only the animals whose anchor, home or target it touched
 */
import { describe, expect, it } from 'vitest';
import { stepWorld, syncWorld, type AIWorld } from '@/ai/core/world';
import { colliderSdf, floorAt } from '@/ai/core/env';
import { decor, makeTestCreature, makeTestTank, makeTestWorld } from '@/ai/core/testkit';
import type { Creature, Tank } from '@/types';

const step = (w: AIWorld, secs: number) => {
  for (let i = 0; i < secs * 60; i++) stepWorld(w, 1 / 60);
};
const sync = (w: AIWorld, tank: Tank, creatures: Creature[]) => syncWorld(w, { tank, creatures, clutches: [], hour: 12, refreshInfo: true });

function seahorseTank() {
  const branch = decor('test_branch', -0.1, 0.02, { id: 'branch' });
  const rock = decor('test_rock', 0.12, 0.02, { id: 'rock' });
  const tank = makeTestTank({ id: 't1', waterClass: 'marine_live_rock', decor: [branch, rock] });
  const creatures = [makeTestCreature('lined_seahorse', 't1', { id: 'sh' }), makeTestCreature('neon_tetra', 't1', { id: 'nt' })];
  const w = makeTestWorld(tank, creatures, 12);
  return { tank, creatures, w };
}

describe('fix AI: water level and decor edits', () => {
  it('S08-01: a falling water level does not rebuild the colliders or wake the tank', () => {
    const { tank, creatures, w } = seahorseTank();
    step(w, 40);
    const sig = w.env.decorSig;
    const colliders = w.env.colliders.length;
    const before = w.agents.map((a) => ({ id: a.id, act: a.act, actDur: a.actDur, anchorKey: a.anchorKey, hasHome: a.hasHome }));
    const claims = new Map(w.claims);
    // evaporation: level 1 → 0.985 (the old signature keyed the water height to 3 decimals: any drift rebuilt everything)
    tank.water.level = 0.985;
    sync(w, tank, creatures);
    expect(w.env.decorSig).toBe(sig);
    expect(w.env.colliders.length).toBe(colliders);
    expect(w.env.surfaceY).toBeLessThan(w.env.dims.H); // the surface followed the level
    expect(Math.abs(w.env.surfaceY - (w.env.dims.H - 0.03) * 0.985)).toBeLessThan(0.02);
    for (const a of w.agents) {
      const b = before.find((x) => x.id === a.id)!;
      expect(a.act, `${a.id} act`).toBe(b.act);
      expect(a.actDur, `${a.id} actDur was shortened by the water level`).toBe(b.actDur);
      expect(a.anchorKey, `${a.id} anchor`).toBe(b.anchorKey);
      expect(a.hasHome, `${a.id} home`).toBe(b.hasHome);
    }
    expect([...w.claims.entries()]).toEqual([...claims.entries()]);
    // every anchor still lies under the (lower) surface
    for (const an of w.env.anchors) expect(an.pos.y).toBeLessThanOrEqual(w.env.surfaceY - 0.005 + 1e-9);
  });

  it('R04-02: anchors clamped under a lower surface come back up when the tank is topped off', () => {
    const tank = makeTestTank({ id: 't1', decor: [decor('floating_plants', -0.05, 0.02, { id: 'fp', y: 0.42 }), decor('test_rock', 0.12, 0.02, { id: 'rock' })] });
    const creatures = [makeTestCreature('betta', 't1', { id: 'b1' })];
    const w = makeTestWorld(tank, creatures, 12);
    const before = new Map(w.env.anchors.map((an) => [an.key, an.pos.clone()]));
    expect(w.env.anchors.some((an) => an.decorId === 'fp')).toBe(true);
    tank.water.level = 0.9;
    sync(w, tank, creatures);
    // the floating plant's anchors were pushed down under the lower surface…
    expect(w.env.anchors.some((an) => an.decorId === 'fp' && an.pos.y < before.get(an.key)!.y - 0.002)).toBe(true);
    tank.water.level = 1;
    sync(w, tank, creatures);
    // …and are back where the decor puts them (they used to stay down until the next decor edit)
    for (const an of w.env.anchors) {
      const b = before.get(an.key);
      if (b) expect(an.pos.distanceTo(b), an.key).toBeLessThan(1e-9);
    }
  });

  it('S08-01: a decor edit elsewhere leaves an anchored animal alone; removing its anchor makes it replan', () => {
    const { tank, creatures, w } = seahorseTank();
    step(w, 40);
    const sh = w.agents.find((a) => a.id === 'sh')!;
    expect(sh.anchorKey, 'the seahorse hitches on the branch').toMatch(/^branch#/);
    const anchorKey = sh.anchorKey!;
    const actDur = sh.actDur;
    const act = sh.act;
    // a pebble added on the far side of the tank
    tank.decor = [...tank.decor, decor('test_rock', 0.25, -0.1, { id: 'pebble', scale: 0.5 })];
    sync(w, tank, creatures);
    expect(sh.anchorKey, 'the hitched seahorse kept its holdfast').toBe(anchorKey);
    expect(sh.hasHome).toBe(true);
    expect(sh.actDur, 'its hitch was not cut short').toBe(actDur);
    expect(sh.act).toBe(act);
    expect(w.claims.get(anchorKey), 'the claim on the holdfast survived').toBe(1);
    // the branch it holds is taken away
    tank.decor = tank.decor.filter((d) => d.id !== 'branch');
    sync(w, tank, creatures);
    expect(sh.anchorKey).toBeNull();
    expect(sh.hasHome).toBe(false);
    expect(sh.actDur).toBeLessThanOrEqual(sh.actT + 0.1);
  });
});

describe('fix AI: dead bodies', () => {
  it('S09-04: a dead fish sinks to the floor, then is no longer stepped; decor dropped on it wakes it to ease out', () => {
    const tank = makeTestTank({ id: 't1' });
    const c = makeTestCreature('neon_tetra', 't1', { id: 'nt' });
    const w = makeTestWorld(tank, [c], 12);
    step(w, 5);
    const a = w.agents[0];
    const y0 = a.rt.pos.y - floorAt(w.env, a.rt.pos.x, a.rt.pos.z);
    c.status = 'dead';
    sync(w, tank, [c]);
    step(w, 3);
    expect(a.laidToRest, 'still sinking').toBe(false);
    step(w, 120);
    expect(a.laidToRest, 'at rest within two minutes').toBe(true);
    const p = a.rt.pos;
    expect(p.y - floorAt(w.env, p.x, p.z), 'on the floor').toBeLessThan(Math.min(y0, 0.012));
    const at = p.clone();
    const actT = a.actT;
    step(w, 10);
    expect(a.actT, 'no longer stepped').toBe(actT);
    expect(p.distanceTo(at)).toBe(0);
    // a rock placed on the body: it is stepped again (eased out of the rock), then comes to rest again
    tank.decor = [decor('test_rock', p.x, p.z, { id: 'rock' })];
    sync(w, tank, [c]);
    expect(a.laidToRest).toBe(false);
    step(w, 1);
    expect(a.actT, "stepped again").not.toBe(actT);
    step(w, 150);
    expect(a.laidToRest).toBe(true);
  });

  it('R04-03: a body woken by a rock dropped on it is only laid to rest again once it is out of the rock', () => {
    for (const sp of ['neon_tetra', 'panda_corydoras', 'african_dwarf_frog']) {
      for (const [dx, dz, scale] of [[0, 0, 1], [0.01, 0.005, 1], [0, 0, 1.6]]) {
        const tank = makeTestTank({ id: 't1' });
        const c = makeTestCreature(sp, 't1', { id: 'x' });
        const w = makeTestWorld(tank, [c], 12);
        step(w, 5);
        const a = w.agents[0];
        c.status = 'dead';
        sync(w, tank, [c]);
        step(w, 150);
        expect(a.laidToRest, `${sp} at rest`).toBe(true);
        const p = a.rt.pos;
        tank.decor = [decor('test_rock', p.x + dx, p.z + dz, { id: 'rock', scale })];
        sync(w, tank, [c]);
        const sdf = () => Math.min(...w.env.colliders.filter((k) => k.hard).map((k) => colliderSdf(k, p.x, p.y, p.z)));
        expect(sdf(), `${sp} buried`).toBeLessThan(0);
        // (an old body's actT is long past the settle cap: it used to be frozen again within a few frames, still inside)
        for (let i = 0; i < 60 * 30 && !a.laidToRest; i++) stepWorld(w, 1 / 60);
        expect(a.laidToRest, `${sp} at rest again`).toBe(true);
        expect(sdf(), `${sp} ${dx},${dz} x${scale} out of the rock`).toBeGreaterThan(0);
      }
    }
  });

  it('R04-03: a cory dying on the bed finishes rolling onto its side before it is laid to rest', () => {
    for (const seed of [1, 4]) {
      const tank = makeTestTank({ id: 't1' });
      const c = makeTestCreature('panda_corydoras', 't1', { id: 'x', temperament: 10 + seed * 15 });
      const w = makeTestWorld(tank, [c], 12);
      step(w, 4 + seed * 9);
      const a = w.agents[0];
      c.status = 'dead';
      sync(w, tank, [c]);
      for (let i = 0; i < 60 * 200 && !a.laidToRest; i++) stepWorld(w, 1 / 60);
      expect(a.laidToRest).toBe(true);
      // (it froze at 75° after 3 s, mid-roll)
      expect(Math.abs(a.rt.roll) * 180 / Math.PI, `seed ${seed} roll`).toBeGreaterThan(85);
    }
  });
});
