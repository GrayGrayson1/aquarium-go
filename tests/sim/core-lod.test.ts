// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { advanceWorld, flushSimDebt, tankLod } from '@/sim/world';
import { manyTankWorld, findNonFinite } from '@/dev/fixtures/core-testkit';
import { bigFacility, stressSchool } from '@/dev/fixtures/core-fixtures';

describe('core LOD scheduler', () => {
  it('30 tanks: off-focus tanks accumulate sim debt and a flush resolves it', () => {
    const g = manyTankWorld(29, 3030, 4);
    expect(g.tankOrder.length).toBe(30);
    const focus = g.tankOrder[0];
    const opts = { focusTankId: focus };
    const start = g.clock.hour;
    advanceWorld(g, 0.75, opts);
    expect(g.tanks[focus].simDebtHours ?? 0).toBe(0);
    for (const id of g.tankOrder.slice(1)) expect(g.tanks[id].simDebtHours).toBeCloseTo(0.75, 6);

    advanceWorld(g, 2.5, opts);
    expect(g.clock.hour).toBeCloseTo(start + 3.25, 6);
    g.tankOrder.forEach((id, i) => {
      const lod = tankLod(g, id, opts);
      const debt = g.tanks[id].simDebtHours ?? 0;
      if (i === 0) expect(lod).toBe('full');
      else if (i < 12) {
        expect(lod).toBe('reduced');
        expect(debt).toBeLessThan(1);
      } else {
        expect(lod).toBe('summary');
        expect(debt).toBeCloseTo(3.25, 6);
      }
    });

    flushSimDebt(g);
    for (const id of g.tankOrder) expect(g.tanks[id].simDebtHours ?? 0).toBe(0);
    expect(findNonFinite(g)).toEqual([]);
  });

  it('fixtures are well-formed: big_facility has a 1,000 gal display with 60+ fish, stress_school has 80', () => {
    const big = bigFacility();
    expect(big.tankOrder.length).toBeGreaterThanOrEqual(12);
    const grand = big.tanks[big.tankOrder[0]];
    expect(grand.tierId).toBe('g1000');
    const inGrand = Object.values(big.creatures).filter((c) => c.tankId === grand.id);
    expect(inGrand.length).toBeGreaterThanOrEqual(60);
    // No two tanks overlap on the floor and all are inside the room.
    const hw = big.facility.width / 2;
    const hd = big.facility.depth / 2;
    for (const id of big.tankOrder) {
      const p = big.tanks[id].placement;
      expect(Math.abs(p.x)).toBeLessThan(hw);
      expect(Math.abs(p.z)).toBeLessThan(hd);
    }
    const keys = new Set(big.tankOrder.map((id) => `${big.tanks[id].placement.x},${big.tanks[id].placement.z}`));
    expect(keys.size).toBe(big.tankOrder.length);

    const school = stressSchool();
    const t = school.tanks[school.tankOrder[0]];
    expect(t.tierId).toBe('g300');
    expect(Object.values(school.creatures).filter((c) => c.tankId === t.id).length).toBe(80);
  });
});
