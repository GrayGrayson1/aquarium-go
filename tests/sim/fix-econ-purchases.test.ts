/**
 * Fix lane ECON — purchases: tank kits never hand out locked gear (S16-03).
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { buyTank, buyEquipment, buyOffer, offerPickPrice, devStepEconomy, kitEquipmentFor, kitSwapNote, tankKitPrice } from '@/sim/economy';
import { unlock, isUnlocked } from '@/sim/facility';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { defaultEquipmentFor } from '@/sim/water';

describe('S16-03 — a tank kit ships only gear the player has unlocked', () => {
  it('swaps locked defaults for the best unlocked device of the kind, prices the real kit, and says what is missing', () => {
    const g = newGame({ starterId: 'ocellaris_clownfish', starterName: 'N', seed: 1 });
    for (const k of ['marine_basics', 'gear_skimmer', 'gear_tier2', 'tank_75', 'tank_180', 'reef']) unlock(g, k, { silent: true });
    g.finance.money = 50000;
    expect(isUnlocked(g, 'gear_tier3')).toBe(false);
    const defaults = defaultEquipmentFor('g180', 'reef');
    expect(defaults.some((id) => getEquipmentDef(id)?.unlock === 'gear_tier3')).toBe(true);

    const kit = kitEquipmentFor(g, 'g180', 'reef');
    expect(kit.ids.every((id) => isUnlocked(g, getEquipmentDef(id)!.unlock))).toBe(true);
    expect(kit.swaps.some((s) => s.from === 'filter_sump' && s.to === 'filter_canister' && s.count >= 1)).toBe(true);
    expect(kitSwapNote(kit)).toMatch(/instead of Sump System/);
    expect(kitSwapNote(kit)).toMatch(/unlock: Premium equipment/);

    const priced = tankKitPrice('g180', 'reef', false, g).total;
    expect(priced).toBeLessThan(tankKitPrice('g180', 'reef').total);
    const before = g.finance.money;
    const r = buyTank(g, 'g180', 'reef');
    expect(r.ok).toBe(true);
    expect(before - g.finance.money).toBeCloseTo(priced, 2);
    const tank = g.tanks[r.tankId!];
    expect(tank.equipment.length).toBeGreaterThan(5);
    for (const e of tank.equipment) expect(isUnlocked(g, getEquipmentDef(e.defId)!.unlock), e.defId).toBe(true);
    expect(tank.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'filter')).toBe(true);
    expect(tank.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'heater')).toBe(true);
    expect(g.log.some((e) => /This kit ships with/.test(e.text))).toBe(true);
    // The premium light is still gated when bought separately — the rules agree now.
    expect(buyEquipment(g, tank.id, 'light_reef_premium').ok).toBe(false);
  });

  it('is a no-op when every default is unlocked (existing kits and prices are unchanged)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'B', seed: 2 });
    const kit = kitEquipmentFor(g, 'g10', 'freshwater_planted');
    expect(kit.swaps).toEqual([]);
    expect(kit.ids).toEqual(defaultEquipmentFor('g10', 'freshwater_planted'));
    expect(tankKitPrice('g10', 'freshwater_planted', true, g)).toEqual(tankKitPrice('g10', 'freshwater_planted', true));
    expect(kitSwapNote(kit)).toBe('');
  });
});

describe('S13-11 — the shop quotes a partial group at exactly what buyOffer charges', () => {
  it('offerPickPrice equals the charge for every pick size and never exceeds the whole group', () => {
    let checked = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const g = newGame({ starterId: 'betta', starterName: 'B', seed });
      devStepEconomy(g, 30);
      for (const o of g.market.stock.filter((x) => x.kind === 'group' && x.creatures.length >= 3)) {
        for (let n = 1; n < o.creatures.length; n++) {
          const q = offerPickPrice(o, n);
          expect(q.price).toBeLessThanOrEqual(o.price);
          expect(q.price).toBeGreaterThanOrEqual(1);
          const g2 = structuredClone(g);
          g2.finance.money = q.price; // exactly the quoted amount must be enough
          const idx = Array.from({ length: n }, (_, i) => i);
          const r = buyOffer(g2, o.id, g2.tankOrder[0], idx);
          if (!r.ok && /can't live|water/.test(r.message)) break; // wrong environment for the starter tank
          expect(r.ok, r.message).toBe(true);
          expect(g2.finance.money).toBeCloseTo(0, 2);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
  });
});
