import { describe, expect, it } from 'vitest';
import { BRACKISH_FIXTURES } from '@/dev/fixtures/brackish';
import { getDecorDef, isEmergent } from '@/data/catalog/decor';
import { tankDims } from '@/sim/tankSpace';
import { EMERGENT_REACH_M } from '@/sim/aquascape/placement';

// G3-04: pieces the aquascape rules refused were pushed with their raw scale, so vallisneria grew through the lid.
describe('brackish fixtures keep every plant under the lid (G3-04)', () => {
  for (const [name, fx] of Object.entries(BRACKISH_FIXTURES)) {
    it(name, () => {
      const g = fx();
      for (const id of g.tankOrder) {
        const t = g.tanks[id];
        const d = tankDims(t);
        for (const inst of t.decor) {
          const def = getDecorDef(inst.defId)!;
          const top = inst.y + def.size.h * inst.scale;
          const limit = d.waterY + (isEmergent(def) ? EMERGENT_REACH_M : 0) + 0.02;
          expect(top, `${t.name}: ${inst.defId} ×${inst.scale}`).toBeLessThanOrEqual(limit);
          expect(Math.abs(inst.x)).toBeLessThan(d.L / 2);
          expect(Math.abs(inst.z)).toBeLessThan(d.W / 2);
        }
      }
    });
  }
});

// P2-09: panels_live parked Reef Corner 1.35 m behind the starter tank (the dev aisle was 1.3 m; the front camera
// stands ~1.5 m out), so the tank camera sat inside Ember's Tank. Every fixture now keeps a viewing aisle clear.
describe('no fixture parks a tank in another tank\'s viewing aisle (P2-09)', () => {
  it('every registered fixture', async () => {
    const { FIXTURES } = await import('@/dev/fixtures');
    const { tankFootprint, tankFrontZone, obbOverlap } = await import('@/sim/facility/layout');
    const issues: string[] = [];
    for (const [name, fx] of Object.entries(FIXTURES)) {
      const g = fx();
      const tanks = g.tankOrder.map((id) => g.tanks[id]).filter(Boolean);
      for (const a of tanks) {
        const front = tankFrontZone(a.tierId, a.placement, 1.5);
        for (const b of tanks) if (a !== b && obbOverlap(front, tankFootprint(b.tierId, b.placement))) issues.push(`${name}: ${b.name} stands in front of ${a.name}`);
      }
    }
    expect(issues).toEqual([]);
  });
});
