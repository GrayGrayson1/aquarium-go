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
  });
});
