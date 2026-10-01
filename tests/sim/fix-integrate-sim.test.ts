/**
 * Round-2 INTEGRATE-SIM regressions: the club's loan vs unpaid staff (G2-03), honest debt copy, the top aquascaping
 * honours on the gifted starter layout (G2-01).
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { evalCond, scapeEditsKey } from '@/sim/facility';
import { giftedLayoutShare } from '@/sim/aquascape';
import { ACHIEVEMENTS } from '@/data/achievements';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import { getSpecies } from '@/data/species';
import { fallbackWater } from '@/sim/life/welfare';
import { TEMP_TOLERANCE_C } from '@/sim/water/constants';
import { morphTitle } from '@/sim/economy/util';
import { createListing, withdrawListing, devOpenMarket, devStepEconomy } from '@/sim/economy';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { keeperEquipmentCheck } from '@/sim/staff/work';
import { getWaterReport } from '@/sim/water';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { dailyOperatingCost } from '@/sim/economy';
import { addStaffDirect } from '@/sim/staff';
import { staffStoreWorld } from '@/dev/fixtures/staff';

function team(g: ReturnType<typeof staffStoreWorld>): void {
  g.facility.openToPublic = false; // no income
  for (let i = 0; i < 4; i++) addStaffDirect(g, { name: `Keeper ${i}`, role: 'aquarist', skill: 3, trait: 'steady' as never });
}

describe('G2-03: the club loan pays the team before anyone walks out', () => {
  it('cash that covers the bills but not the wages: the loan still lands before the fourth unpaid payday', () => {
    const g = staffStoreWorld(31);
    team(g);
    const bills = dailyOperatingCost(g);
    // Enough for tonight's running costs, not for the wages: the unpaid streak starts a day before the debt does.
    g.finance.money = bills.total - (bills.wages ?? 0) + 5;
    for (let d = 1; d <= 5; d++) {
      advanceWorld(g, 24);
      expect(g.staff!.roster.length, `day ${d}`).toBe(4);
    }
    expect(g.finance.loan).toBeDefined();
    expect(g.log.some((e) => /has left: their wages went unpaid/.test(e.text))).toBe(false);
    expect(g.staff!.roster.every((m) => (m.unpaidDays ?? 0) === 0)).toBe(true);
  });

  it('with the loan already spent, the team leaves and no message promises the animals are safe', () => {
    const g = staffStoreWorld(31);
    team(g);
    g.finance.money = 0;
    g.finance.loan = { amount: 500, outstanding: 0, takenHour: 0, repaidHour: 0 };
    for (let d = 0; d < 5; d++) advanceWorld(g, 24);
    expect(g.staff!.roster.length).toBe(0);
    expect(g.log.some((e) => /in the red after today's bills/.test(e.text))).toBe(true);
    expect(g.log.some((e) => /animals are safe/.test(e.text))).toBe(false);
  });
});

describe('G2-01: Living Art and photo contests need a layout of the player’s own', () => {
  const livingArt = ACHIEVEMENTS.find((a) => a.id === 'living_art')!.cond;
  const photo = UNLOCK_RULE_BY_KEY.photo_contests!.when[0];

  it('three edits on the gifted starter layout at beauty 96 are not enough; reworking the layout is', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    const tank = g.tanks[g.tankOrder[0]];
    expect(tank.decor.length).toBeGreaterThan(1);
    expect(giftedLayoutShare(g, tank)).toBeGreaterThanOrEqual(0.5);
    g.progress.counters[scapeEditsKey(tank.id)] = 3; // three small nudges
    tank.cache.beauty = 96;
    // Aquascaper and Showpiece keep the plain rule; Living Art and the photo contests do not fire.
    expect(evalCond(g, ACHIEVEMENTS.find((a) => a.id === 'aquascaper')!.cond).met).toBe(true);
    const st = evalCond(g, livingArt);
    expect(st.met).toBe(false);
    expect(st.detail).toMatch(/gifted layout/);
    expect(st.steps?.at(-1)).toMatchObject({ label: 'A layout of your own', met: false });
    expect(evalCond(g, photo).met).toBe(false);
    // Rework the scape: every piece well away from its template spot.
    for (const d of tank.decor) d.x += d.x > 0 ? -0.12 : 0.12;
    expect(giftedLayoutShare(g, tank)).toBeLessThan(0.5);
    expect(evalCond(g, livingArt).met).toBe(true);
    expect(evalCond(g, photo).met).toBe(true);
  });
});

describe('X-1: the welfare fallback applies the same temperature tolerance as the water report', () => {
  it('no harm within TEMP_TOLERANCE_C of the limits, harm ramping up from zero beyond', () => {
    const g = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Tango', seed: 3 });
    const t = g.tanks[g.tankOrder[0]];
    const sp = getSpecies('ocellaris_clownfish');
    const at = (c: number) => {
      t.water.tempC = c;
      return fallbackWater(sp, t).harm;
    };
    expect(at(sp.tempC.min - TEMP_TOLERANCE_C * 0.5)).toBe(0);
    expect(at(sp.tempC.max + TEMP_TOLERANCE_C)).toBe(0);
    const justPast = at(sp.tempC.min - TEMP_TOLERANCE_C - 0.1);
    expect(justPast).toBeGreaterThan(0);
    expect(justPast).toBeLessThan(0.02); // no constant step at the edge
    expect(at(sp.tempC.min - TEMP_TOLERANCE_C - 2)).toBeGreaterThan(0.4);
    expect(at(sp.tempC.max + TEMP_TOLERANCE_C + 2)).toBeGreaterThan(0.5);
  });
});

describe('X-10: morph titles keep a trailing overlay together', () => {
  it('moves a descriptive overlay after a shortened species word to the front', () => {
    expect(morphTitle('Banggai Cardinal Heavily spotted', 'Banggai Cardinalfish')).toBe('Heavily spotted Banggai Cardinalfish');
    expect(morphTitle('Endler (mixed line)', "Endler's Livebearer")).toBe("Endler's Livebearer (mixed line)");
    // unchanged cases
    expect(morphTitle('Peppermint Richly coloured', 'Peppermint Shrimp')).toBe('Richly coloured Peppermint Shrimp');
    expect(morphTitle('Red Honey (Sunset)', 'Honey Gourami')).toBe('Red Honey Gourami (Sunset)');
    expect(morphTitle('Blonde Heavily spotted', 'African Dwarf Frog')).toBe('Blonde Heavily spotted African Dwarf Frog');
    expect(morphTitle('Banggai Cardinal', 'Banggai Cardinalfish')).toBe('Banggai Cardinalfish');
  });
});

describe('X-16: a closed listing records the hour it closed', () => {
  it('withdrawn and expired listings carry closedHour', () => {
    const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 7 });
    devOpenMarket(g);
    devStepEconomy(g, 0.5);
    const tank = g.tankOrder[0];
    const a = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 30 }), tank);
    const b = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 30 }), tank);
    const r1 = createListing(g, { kind: 'creature', creatureIds: [a.id], reserve: 0, durationHours: 24 });
    expect(r1.ok, r1.message).toBe(true);
    g.clock.hour += 2;
    expect(withdrawListing(g, r1.listingId!).ok).toBe(true);
    expect(g.market.listings.find((l) => l.id === r1.listingId)!.closedHour).toBe(g.clock.hour);
    const r2 = createListing(g, { kind: 'creature', creatureIds: [b.id], reserve: 1e6, durationHours: 24 });
    expect(r2.ok, r2.message).toBe(true);
    advanceWorld(g, 30);
    const l2 = g.market.listings.find((l) => l.id === r2.listingId)!;
    expect(l2.status).not.toBe('active');
    expect(l2.closedHour).toBeGreaterThanOrEqual(l2.createdHour);
    expect(l2.closedHour).toBeLessThanOrEqual(g.clock.hour);
  });
});

describe('G2-06: failed equipment keeps being raised, and a failed filter is named as the cause', () => {
  it('the keeper reminder toasts (one equipment toast a day) and the ammonia reason names the failed filter', () => {
    const g = staffStoreWorld(31);
    const m = addStaffDirect(g, { name: 'Maya Okafor', role: 'aquarist', skill: 3, trait: 'meticulous' });
    const [a, b] = g.tankOrder.map((id) => g.tanks[id]).filter((t) => t.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'filter'));
    const fail = (t: typeof a) => {
      const f = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'filter')!;
      f.failed = true;
      return f;
    };
    fail(a);
    fail(b);
    const before = g.log.length;
    keeperEquipmentCheck(g, m, a);
    keeperEquipmentCheck(g, m, b);
    const notes = g.log.slice(before).filter((e) => /has failed/.test(e.text));
    expect(notes).toHaveLength(2);
    expect(notes[0].toast).toBe(true);
    expect(notes[0].text).toMatch(/can’t process its waste/);
    expect(notes[1].toast).toBe(false); // the daily equipment toast is spent
    // The water report's ammonia reason leads with the broken filter when other filtration is still running.
    a.equipment.push({ ...a.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'filter')!, id: 'eq_spare', failed: false, on: true });
    a.water.ammonia = 2;
    a.water.bioMaturity = 1;
    const row = getWaterReport(g, a.id).params.find((p) => p.key === 'ammonia')!;
    expect(row.reason).toMatch(/has failed/);
  });
});
