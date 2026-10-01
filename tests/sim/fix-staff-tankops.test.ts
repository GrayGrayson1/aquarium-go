/**
 * Fix lane STAFF — tank operations (src/ui/panels/common/tankOps.ts).
 *
 *   S05-02  changing the substrate (or converting the water) re-seats every piece of decor on the new bed.
 *   S14-06  converting water is not free: the new bed is paid for, the fill takes (or buys) salt, and gear that
 *           cannot run in the new water goes to storage.
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { resolveBaseY } from '@/sim/aquascape';
import { getDecorDef } from '@/data/catalog/decor';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { buyTank, tankKitPrice, SALT_PRICE_PER_KG } from '@/sim/economy';
import { installEquipment } from '@/sim/care';
import { unlock } from '@/sim/facility';
import { TANK_TIERS } from '@/data/catalog/tanks';
import { changeSubstrate, convertWaterClass, convertWaterClassCost, substrateCost } from '@/ui/panels/common/tankOps';

function seated(t: ReturnType<typeof newGame>['tanks'][string]): { off: number; worst: number } {
  let off = 0;
  let worst = 0;
  for (const d of t.decor) {
    const def = getDecorDef(d.defId)!;
    const y = resolveBaseY(t, def, d.x, d.z, d.scale, d.id);
    const gap = Math.abs(d.y - y);
    if (gap > 0.005) off++;
    worst = Math.max(worst, gap);
  }
  return { off, worst };
}

describe('S05-02 — a new bed re-seats the layout', () => {
  it('planted soil → bare bottom → aqua soil keeps every piece on the bed (epiphytes on their hosts)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'X', seed: 11, shopName: 'T' });
    g.finance.money = 5000;
    const t = g.tanks[g.tankOrder[0]];
    expect(t.decor.length).toBeGreaterThan(10);
    expect(seated(t).off).toBe(0);
    expect(changeSubstrate(g, t.id, 'bare').ok).toBe(true);
    expect(t.substrate.kind).toBe('bare');
    expect(seated(t).off).toBe(0);
    // an epiphyte tied to the wood is still up on the wood, not on the glass
    const wood = t.decor.find((d) => d.defId === 'spider_wood')!;
    const fern = t.decor.find((d) => d.defId === 'java_fern')!;
    expect(fern.y).toBeGreaterThan(wood.y + 0.01);
    expect(changeSubstrate(g, t.id, 'planted_soil').ok).toBe(true);
    expect(seated(t).off).toBe(0);
    const stone = t.decor.find((d) => d.defId === 'river_stone')!;
    expect(stone.y).toBeGreaterThan(0.03); // on top of the 5 cm bed, not buried under it
    expect(t.cache.beauty).toBeGreaterThan(50);
  });

  it('converting the water re-seats what stays', () => {
    const g = newGame({ starterId: 'betta', starterName: 'X', seed: 11, shopName: 'T' });
    g.finance.money = 5000;
    unlock(g, 'marine_basics', { silent: true });
    const t = g.tanks[g.tankOrder[0]];
    for (const c of Object.values(g.creatures)) if (c.tankId === t.id) c.status = 'sold';
    const r = convertWaterClass(g, t.id, 'marine_fowlr');
    expect(r.ok, r.message).toBe(true);
    expect(seated(t).off).toBe(0);
  });
});

describe('S14-06 — water conversion costs what doing it by hand would', () => {
  function reefReady() {
    const g = newGame({ starterId: 'betta', starterName: 'B', seed: 1 });
    g.finance.money = 1e6;
    for (const k of ['marine_basics', 'reef', 'brackish', ...TANK_TIERS.map((x) => x.unlock).filter((k): k is string => !!k)]) unlock(g, k, { silent: true });
    const r = buyTank(g, 'g75', 'freshwater_tropical', undefined, {});
    expect(r.ok, r.message).toBe(true);
    return { g, t: g.tanks[r.tankId!] };
  }

  it('fresh → reef pays for the aragonite bed and buys the salt for the fill', () => {
    const { g, t } = reefReady();
    g.inventory.salt = 0;
    const cost = convertWaterClassCost(g, t.id, 'reef');
    expect(cost.substrate).toBe(substrateCost('g75', 'aragonite'));
    expect(cost.saltKg).toBeGreaterThan(8);
    expect(cost.saltCost).toBeCloseTo(cost.saltKg * SALT_PRICE_PER_KG, 1);
    expect(cost.total).toBeCloseTo(cost.substrate + cost.saltCost, 1);
    const m = g.finance.money;
    const r = convertWaterClass(g, t.id, 'reef');
    expect(r.ok, r.message).toBe(true);
    expect(m - g.finance.money).toBeCloseTo(cost.total, 1);
    expect(t.substrate.kind).toBe('aragonite');
    expect(t.water.salinitySG).toBeCloseTo(1.025, 3);
    expect(r.message).toMatch(/bed \$\d+/);
    expect(r.message).toMatch(/kg of salt/);
    // the kit price difference is what a reef kit would have cost over the freshwater one: Convert is not a free upgrade
    expect(cost.total).toBeGreaterThan(0);
    expect(tankKitPrice('g75', 'reef', false).substrate - tankKitPrice('g75', 'freshwater_tropical', false).substrate).toBeLessThanOrEqual(cost.substrate + 1);
  });

  it('salt in storage is used first, and short money refuses before touching the tank', () => {
    const { g, t } = reefReady();
    g.inventory.salt = 4;
    const cost = convertWaterClassCost(g, t.id, 'reef');
    expect(cost.saltFromStore).toBe(4);
    expect(cost.saltCost).toBeCloseTo((cost.saltKg - 4) * SALT_PRICE_PER_KG, 1);
    g.finance.money = cost.total - 1;
    const refused = convertWaterClass(g, t.id, 'reef');
    expect(refused.ok).toBe(false);
    expect(refused.message).toMatch(/needs \$/);
    expect(t.waterClass).toBe('freshwater_tropical');
    expect(g.inventory.salt).toBe(4);
    g.finance.money = cost.total + 1;
    expect(convertWaterClass(g, t.id, 'reef').ok).toBe(true);
    expect(g.inventory.salt).toBeCloseTo(0, 5);
    expect(g.finance.money).toBeCloseTo(1, 1);
  });

  it('gear that cannot run in the new water goes to storage, universal gear stays', () => {
    const { g, t } = reefReady();
    unlock(g, 'gear_tier2', { silent: true });
    unlock(g, 'gear_co2', { silent: true });
    const before = g.inventory.equipment.length;
    const inst = installEquipment(g, t.id, 'light_planted');
    expect(inst.ok, inst.message).toBe(true);
    const universal = t.equipment.filter((e) => getEquipmentDef(e.defId)?.environments.includes('marine')).map((e) => e.id);
    expect(universal.length).toBeGreaterThan(0);
    const cost = convertWaterClassCost(g, t.id, 'reef');
    expect(cost.equipmentOut).toContain('Planted-Tank LED');
    const r = convertWaterClass(g, t.id, 'reef');
    expect(r.ok, r.message).toBe(true);
    expect(t.equipment.some((e) => e.defId === 'light_planted')).toBe(false);
    for (const id of universal) expect(t.equipment.some((e) => e.id === id)).toBe(true);
    expect(g.inventory.equipment.length).toBe(before + cost.equipmentOut.length);
    expect(r.message).toMatch(/Moved to storage/);
  });

  it('a same-environment change (tropical → planted) costs nothing', () => {
    const { g, t } = reefReady();
    const cost = convertWaterClassCost(g, t.id, 'freshwater_planted');
    expect(cost.total).toBe(0);
    const m = g.finance.money;
    expect(convertWaterClass(g, t.id, 'freshwater_planted').ok).toBe(true);
    expect(g.finance.money).toBe(m);
  });
});
