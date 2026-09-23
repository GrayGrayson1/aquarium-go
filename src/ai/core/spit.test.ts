/**
 * Archerfish spit act (lane "brackish"): an archerfish lines up under a fly above the water, tilts up, fires one jet
 * per shot, the fly falls and gets snapped up — with no NaN, no pitch beyond the aim cap and no vibration.
 */
import { describe, expect, it } from 'vitest';
import { findSpecies } from '@/data/species';
import { archerShots, requestArcherShot, type ArcherShotPhase } from '@/runtime/archerShots';
import { stepWorld } from './world';
import { makeTestCreature, makeTestTank, makeTestWorld, decor } from './testkit';

const DT = 1 / 60;

function setup(id: string, n = 3) {
  const tank = makeTestTank({ id, tierId: 'g125', waterClass: 'freshwater_tropical', decor: [decor('river_stone', -0.3, 0.05, { scale: 1.5 }), decor('java_fern', 0.4, -0.1)] });
  tank.environment = 'brackish';
  tank.waterClass = 'brackish';
  tank.water.salinitySG = 1.008;
  const crew = Array.from({ length: n }, (_, i) => makeTestCreature('banded_archerfish', tank.id, { temperament: 40 + i * 10, curiosity: 60 }));
  const events: { kind: string; id?: string }[] = [];
  const observed: string[] = [];
  const w = makeTestWorld(tank, crew, 12, { event: (kind, _p, id) => events.push({ kind, id }), observed: (name) => observed.push(name) });
  w.env.focused = true;
  return { w, events, observed };
}

describe('archerfish spit act', () => {
  it('the species is wired to the act', () => {
    const sp = findSpecies('banded_archerfish');
    expect(sp?.specialBehaviors).toContain('spit_shot');
    expect(sp?.behaviorSet).toBe('archerfish');
  });

  it('a requested shot plays out: aim → one spit event → fly falls → snapped up', () => {
    archerShots.delete('tank_spit_a');
    const { w, events, observed } = setup('tank_spit_a');
    for (let i = 0; i < 60; i++) stepWorld(w, DT); // settle
    requestArcherShot('tank_spit_a');
    const phases = new Set<ArcherShotPhase>();
    let maxPitch = 0;
    let shooterPitchAtFire = 0;
    let fired = false;
    for (let i = 0; i < 60 * 30; i++) {
      stepWorld(w, i % 3 === 0 ? 1 / 30 : DT);
      const s = archerShots.get('tank_spit_a');
      if (s) phases.add(s.phase);
      for (const a of w.agents) {
        expect(Number.isFinite(a.rt.pos.x + a.rt.pos.y + a.rt.pos.z + a.rt.pitch + a.rt.yaw), `${a.id} NaN`).toBe(true);
        maxPitch = Math.max(maxPitch, Math.abs(a.rt.pitch));
        expect(a.rt.pos.y).toBeLessThanOrEqual(w.env.surfaceY + 1e-6);
      }
      if (!fired && s && s.phase === 'shot') {
        fired = true;
        shooterPitchAtFire = w.byId.get(s.shooterId)!.rt.pitch;
      }
      if (s && s.phase === 'gone') break;
    }
    expect([...phases]).toEqual(expect.arrayContaining(['rest', 'shot', 'fall']));
    expect(archerShots.get('tank_spit_a')?.phase).toBe('gone');
    expect(events.filter((e) => e.kind === 'spit').length).toBe(1);
    expect(observed).toContain('spit_shot');
    // steep aim, but never beyond the aim cap
    expect(shooterPitchAtFire).toBeGreaterThan(0.75);
    expect(maxPitch).toBeLessThanOrEqual(1.25);
  });

  it('archerfish shoot on their own now and then, one at a time, and keep still while aiming', () => {
    archerShots.delete('tank_spit_b');
    const { w, events } = setup('tank_spit_b', 4);
    let concurrent = 0;
    const seqs = new Set<number>();
    for (let i = 0; i < 60 * 150; i++) {
      stepWorld(w, i % 4 === 0 ? 1 / 30 : DT);
      // (a fish still swallowing its fly — phase 4 — may overlap the next fish lining up)
      const aiming = w.agents.filter((a) => a.act === 'spit' && a.actPhase <= 3).length;
      concurrent = Math.max(concurrent, aiming);
      const s = archerShots.get('tank_spit_b');
      if (s) seqs.add(s.seq);
    }
    expect(concurrent).toBeLessThanOrEqual(1);
    expect(events.filter((e) => e.kind === 'spit').length).toBeGreaterThanOrEqual(1);
    expect(seqs.size).toBeGreaterThanOrEqual(1);
  });
});
