/**
 * Audit 2026-11-17 (H8): a docent presents display tanks only. A tank taken off display (made a nursery or quarantine
 * tank) leaves every docent's list, isn't counted in their load or their reach, and no talk is given there.
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { setTankPurpose } from '@/sim/tankOps';
import { addStaffDirect, docentEffect, giveTalk, staffLoad, tidyAssignments } from '@/sim/staff';

describe('Audit 2026-11-17 (H8): docents and tanks off display', () => {
  it('a nursery leaves the docent’s list, load and reach, and gets no talk', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 61 });
    g.isShowcase = false;
    const show = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 6, z: 2, rotY: 0 }, name: 'Show Tank' });
    const reef = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 9, z: 2, rotY: 0 }, name: 'Reef Corner' });
    const m = addStaffDirect(g, { name: 'Theo Marsh', role: 'docent', skill: 1, trait: 'storyteller', tankIds: [show.id, reef.id] });
    expect(staffLoad(g, m).used).toBe(2);
    expect(setTankPurpose(g, show.id, 'nursery').ok).toBe(true);
    // at once, before the team's next step: the load and the reach count exhibits only
    expect(staffLoad(g, m).used).toBe(1);
    expect(docentEffect(g, g.clock.hour)!.coverage).toBeCloseTo(1 / Math.max(1, g.tankOrder.filter((id) => (g.tanks[id].purpose ?? 'display') === 'display').length), 9);
    for (let i = 0; i < 4; i++) giveTalk(g, m, g.clock.hour + i);
    expect((g.staff?.talks ?? []).every((t) => t.tankId === reef.id)).toBe(true);
    tidyAssignments(g);
    expect(m.tankIds).toEqual([reef.id]);
  });
});
