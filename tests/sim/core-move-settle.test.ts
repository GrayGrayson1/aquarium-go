/**
 * lane:core (chunk 4; BACKLOG B-127) — a move settles both tanks first. Background tanks owe game hours ("sim debt",
 * src/sim/world.ts); an animal or brood moved without settling skipped up to ~4 owed hours of the tank it left and was
 * stepped through the hours its new tank owed from before it arrived. Every move (the player's, a sold tank's
 * relocation, a production line's) now steps both tanks through what they owe first, so the move happens at one world
 * time for everyone.
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { moveCreature } from '@/sim/life/actions';
import { moveClutch } from '@/sim/life/breeding/actions';
import { createClutch } from '@/sim/life/breeding/clutch';
import { getSpecies } from '@/data/species';

function shop() {
  const g = newGame({ starterId: 'betta', starterName: 'Settle', seed: 61 });
  g.isShowcase = false;
  const a = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 3, z: 1, rotY: 0 }, name: 'Left' });
  const b = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 6, z: 1, rotY: 0 }, name: 'Right' });
  // Background LOD (no focus): both tanks run up debt between their catch-ups.
  advanceWorld(g, 0.75, { focusTankId: g.tankOrder[0] });
  return { g, a, b };
}

describe('B-127: moves settle both tanks first', () => {
  it('moving an animal steps the tank it leaves and the tank it joins through what they owe', () => {
    const { g, a, b } = shop();
    const fish = addCreature(g, createCreature(g, simRng(g), 'neon_tetra', { ageDays: 30 }), a.id);
    advanceWorld(g, 0.75, { focusTankId: g.tankOrder[0] });
    expect(a.simDebtHours ?? 0).toBeGreaterThan(0);
    expect(b.simDebtHours ?? 0).toBeGreaterThan(0);
    expect(moveCreature(g, fish.id, b.id).ok).toBe(true);
    expect(a.simDebtHours ?? 0).toBe(0);
    expect(b.simDebtHours ?? 0).toBe(0);
    expect(fish.tankId).toBe(b.id);
  });

  it('moving a brood does the same', () => {
    const { g, a, b } = shop();
    const rng = simRng(g);
    const m = addCreature(g, createCreature(g, rng, 'neon_tetra', { sex: 'female', ageDays: 30 }), a.id);
    const f = addCreature(g, createCreature(g, rng, 'neon_tetra', { sex: 'male', ageDays: 30 }), a.id);
    const cl = createClutch(g, { sp: getSpecies('neon_tetra'), tank: a, mother: m, father: f, hour: g.clock.hour, stage: 'fry', count: 20, visual: 'fry_cloud', nextStageHour: g.clock.hour + 40 });
    advanceWorld(g, 0.75, { focusTankId: g.tankOrder[0] });
    expect(a.simDebtHours ?? 0).toBeGreaterThan(0);
    expect(moveClutch(g, cl.id, b.id).ok).toBe(true);
    expect(a.simDebtHours ?? 0).toBe(0);
    expect(b.simDebtHours ?? 0).toBe(0);
    expect(cl.tankId).toBe(b.id);
  });

  // Chunk 4 review: the checks run after the settle, so a brood raised during the owed hours isn't "moved" as a ghost
  it('a brood whose young are raised during the owed hours is gone, not moved', () => {
    const { g, a, b } = shop();
    const rng = simRng(g);
    const m = addCreature(g, createCreature(g, rng, 'neon_tetra', { sex: 'female', ageDays: 30 }), a.id);
    const f = addCreature(g, createCreature(g, rng, 'neon_tetra', { sex: 'male', ageDays: 30 }), a.id);
    const cl = createClutch(g, { sp: getSpecies('neon_tetra'), tank: a, mother: m, father: f, hour: g.clock.hour, stage: 'fry', count: 20, visual: 'fry_cloud', nextStageHour: g.clock.hour + 40 });
    advanceWorld(g, 0.75, { focusTankId: g.tankOrder[0] });
    expect(a.simDebtHours ?? 0).toBeGreaterThan(0.1);
    cl.nextStageHour = g.clock.hour - (a.simDebtHours ?? 0) / 2; // the brood is due inside the hours the tank still owes
    expect(g.clock.hour).toBeGreaterThan(cl.nextStageHour);
    expect(g.clock.hour - (a.simDebtHours ?? 0)).toBeLessThan(cl.nextStageHour);
    expect(g.clutches[cl.id]).toBeDefined();
    const moved = g.progress.counters.clutchesMoved ?? 0;
    const r = moveClutch(g, cl.id, b.id);
    expect(r.ok).toBe(false);
    expect(r.message).toBe('Those eggs or young are gone — they have hatched and grown on, or were lost.');
    expect(g.clutches[cl.id]).toBeUndefined();
    expect(g.progress.counters.clutchesMoved ?? 0).toBe(moved);
    const young = Object.values(g.creatures).filter((c) => c.lineage?.motherId === m.id && c.status === 'alive');
    expect(young.length).toBeGreaterThan(0);
    expect(young.every((c) => c.tankId === a.id)).toBe(true); // raised where they were, with the adults
  });

  it('an animal that died during the owed hours is not moved', () => {
    const { g, a, b } = shop();
    const fish = addCreature(g, createCreature(g, simRng(g), 'neon_tetra', { ageDays: 30 }), a.id);
    advanceWorld(g, 0.75, { focusTankId: g.tankOrder[0] });
    expect(a.simDebtHours ?? 0).toBeGreaterThan(0);
    fish.stats.health = -50; // dies at its tank's next step, inside the owed hours
    const r = moveCreature(g, fish.id, b.id);
    expect(fish.status).toBe('dead');
    expect(r.ok).toBe(false);
    expect(fish.tankId).not.toBe(b.id);
  });
});
