/**
 * lane:automation (chunk 5; DESIGN-S3D §7.1, §7.7, §9.7) — manual mode (AUTO-036) and the weekly money (AUTO-039).
 *
 * Manual mode holds five systems (water changes, salt mixing, live food, Autofeeders, production lines); held jobs are
 * skipped, not queued; life support, the Auto Top-Offs, keepers' rounds and auctions keep running; each system resumes
 * alone and resuming the last ends manual mode; it is saved. This week's money is the last seven completed days of the
 * nightly summaries, built from the same ledger entries as Finances, and survives the 400-entry ledger cap.
 */
import { describe, it, expect } from 'vitest';
import { facility, run } from './support/automation';
import { lineFarm } from './support/production';
import { HOLD_SYSTEMS, heldSystems, holdAll, isHeld, manualModeOn, manualSince, resumeAll, setHold, waterRoom, weekMoney } from '@/sim/automation';
import { autofeedPause } from '@/sim/care/autofeed';
import { installEquipment } from '@/sim/care';
import { inhabitantsOf } from '@/sim/water/env';
import { addStaffDirect, assignTank } from '@/sim/staff';
import { encodeRecord, decodeRecord } from '@/persistence';
import { stepTank } from '@/sim/world';
import { productionLines } from '@/sim/production';
import type { GameState } from '@/types';

describe('AUTO-036: manual mode', () => {
  it('Hold all holds the five systems with the hour it began; Resume all ends it', () => {
    const { g } = facility();
    expect(manualModeOn(g)).toBe(false);
    holdAll(g);
    expect(heldSystems(g)).toEqual([...HOLD_SYSTEMS]);
    expect(manualSince(g)).toBe(g.clock.hour);
    resumeAll(g);
    expect(manualModeOn(g)).toBe(false);
    expect(g.automation?.hold).toBeUndefined();
  });

  it('each system resumes alone, and resuming the last one ends manual mode', () => {
    const { g } = facility();
    holdAll(g);
    for (const s of HOLD_SYSTEMS.slice(0, -1)) setHold(g, s, false);
    expect(heldSystems(g)).toEqual(['lines']);
    setHold(g, 'lines', false);
    expect(manualModeOn(g)).toBe(false);
  });

  it('is saved, and stays on across a load', () => {
    const { g } = facility();
    holdAll(g);
    const b = decodeRecord(encodeRecord(g, 'auto').text).state;
    expect(heldSystems(b)).toEqual([...HOLD_SYSTEMS]);
    expect(manualSince(b)).toBe(manualSince(g));
  });

  it('held Autofeeders don\'t feed, and count as paused for the hungry-animal alert, in their own words (ADR-0026 d15)', () => {
    const { g, fresh } = facility({ fresh: 1, marine: 0 });
    const t = fresh[0];
    installEquipment(g, t.id, 'autofeeder', { purchased: true });
    holdAll(g);
    for (const c of Object.values(g.creatures)) if (c.tankId === t.id) c.stats.hunger = 55;
    const lastFeed = t.water.lab?.lastAutofeedHour;
    run(g, 30);
    expect(t.water.lab?.lastAutofeedHour).toBe(lastFeed);
    const p = autofeedPause(t.equipment, inhabitantsOf(g, t.id), g.inventory.foods, isHeld(g, 'feeders'));
    expect(p?.reason).toBe('held');
    expect(g.log.some((e) => e.text === `${t.name}: Auto-feed is held — feed ${p!.name} by hand, or resume it.`)).toBe(true);
  });

  it('Hold and Resume catch the background tanks up first: a meal due while held stays skipped, one due before is given (ADR-0026 d5, the chunk 5 review)', () => {
    // fourteen tanks, the camera on the first: the last runs at summary LOD (4-hour pieces); its Autofeeder feeds at 9:00 and 19:00
    const setup = () => {
      const { g, fresh } = facility({ fresh: 14, marine: 0 });
      const far = fresh[13];
      installEquipment(g, far.id, 'autofeeder', { purchased: true });
      const day = Math.floor(g.clock.hour / 24) + 1;
      g.clock.hour = day * 24 + 4;
      for (const t of fresh) t.simDebtHours = 0;
      const to = (h: number) => run(g, day * 24 + h - g.clock.hour, 0.25, { focus: fresh[0].id });
      return { g, far, day, to };
    };
    // Hold at 8:50, Resume at 9:20: the 9:00 meal fell due while held, so it never comes
    const a = setup();
    a.to(8 + 50 / 60);
    holdAll(a.g);
    a.to(9 + 20 / 60);
    resumeAll(a.g);
    a.to(14);
    expect(a.far.water.lab?.lastAutofeedHour ?? -1).not.toBe(a.day * 24 + 9);
    // Hold at 9:10: the 9:00 meal fell due before the hold, so the far tank gives it as it catches up
    const b = setup();
    b.to(9 + 10 / 60);
    expect(b.g.clock.hour - (b.far.simDebtHours ?? 0)).toBeLessThan(b.day * 24 + 9); // it still owes 9:00 (its 8:00 change settled it to 8:15)
    holdAll(b.g);
    expect(b.far.water.lab?.lastAutofeedHour).toBe(b.day * 24 + 9);
  });

  it('the Auto Top-Offs, filters and keepers\' rounds keep running while held', () => {
    const { g, fresh } = facility({ fresh: 1, marine: 0, ato: true });
    const t = fresh[0];
    const keeper = addStaffDirect(g, { name: 'Joy Mendez', role: 'aquarist', skill: 3, trait: 'quick_learner' });
    expect(assignTank(g, keeper.id, t.id, true).ok).toBe(true);
    holdAll(g);
    t.water.level = 0.97;
    const fresh0 = waterRoom(g)!.fresh;
    stepTank(g, t, 1, 'full', g.clock.hour + 1);
    expect(t.water.level).toBeGreaterThanOrEqual(0.994); // the top-off isn't held
    expect(waterRoom(g)!.fresh).toBeLessThan(fresh0);
    const feeds = g.staff!.feeds.length;
    run(g, 30); // through the 8 AM and 6 PM rounds
    expect(g.staff!.feeds.length).toBeGreaterThan(feeds);
  });

  it('held production lines move, sort and list nothing, and pick up at the next hour after resume', () => {
    const farm = lineFarm(17);
    const g = farm.g;
    holdAll(g);
    const line = productionLines(g)[0];
    run(g, 48);
    expect(line.routed ?? []).toEqual([]);
    expect(g.creatures[line.pair.motherId].repro?.lineHold).toBe(true);
    resumeAll(g);
    run(g, 2);
    expect(g.creatures[line.pair.motherId].repro?.lineHold).toBeUndefined();
  });
});

/** Sum of ledger entries of a category set over [day lo, day hi], for comparing with the weekly money. */
function ledgerSum(g: GameState, fromDay: number, toDay: number, pick: (e: GameState['finance']['ledger'][number]) => boolean): number {
  const lo = (fromDay - 1) * 24;
  const hi = toDay * 24;
  return Math.round(g.finance.ledger.filter((e) => e.hour >= lo - 1e-6 && e.hour < hi + 1e-6 && pick(e)).reduce((a, e) => a + e.amount, 0) * 100) / 100;
}

describe('AUTO-039: this week\'s money', () => {
  it('supplies and upkeep are the ledger\'s food, consumables and room entries over the last seven completed days', () => {
    const { g } = facility({ fresh: 2, marine: 2, food: true, salt: 40, eggs: 30, veg: 20, rosa: 300 });
    run(g, 24 * 9);
    const w = weekMoney(g);
    expect(w.toDay! - w.fromDay!).toBe(6);
    expect(w.supplies).toBeCloseTo(-ledgerSum(g, w.fromDay!, w.toDay!, (e) => e.amount < 0 && (e.category === 'food' || e.category === 'consumables')), 2);
    expect(w.upkeep).toBeCloseTo(-ledgerSum(g, w.fromDay!, w.toDay!, (e) => e.memo.startsWith('Running costs — Water room')), 2);
    expect(w.upkeep).toBeGreaterThan(0);
    expect(w.net).toBeCloseTo(w.sales - w.supplies - w.upkeep, 2);
  });

  it('keeps the week right after the 400-entry ledger cap has dropped those days\' entries', () => {
    const { g } = facility({ fresh: 2, marine: 2, food: true, salt: 40, eggs: 30, veg: 20, rosa: 300 });
    run(g, 24 * 9);
    const before = weekMoney(g);
    // the ledger fills up (a busy shop): the days' own entries are gone, the nightly summaries stay
    for (let i = 0; i < 400; i++) g.finance.ledger.push({ hour: g.clock.hour, amount: 1, category: 'tips', memo: 'tip' });
    g.finance.ledger.splice(0, g.finance.ledger.length - 400);
    expect(weekMoney(g)).toEqual(before);
  });

  it('a line\'s sale is tagged with the line and counted by line', () => {
    const farm = lineFarm(17);
    const g = farm.g;
    const line = productionLines(g)[0];
    // a sale of the line's listing, as completeSale tags it
    g.finance.ledger.push({ hour: g.clock.hour, amount: 90, category: 'livestock_sale', memo: 'Sold "3 bettas" to Ana', line: { id: line.id, n: 3 } });
    const day0 = Math.floor(g.clock.hour / 24);
    run(g, 24 * (day0 + 1) - g.clock.hour + 0.5); // past midnight
    const w = weekMoney(g);
    expect(w.lines).toEqual([{ lineId: line.id, n: 3, amount: 90 }]);
    expect(w.sold).toBe(3);
    expect(w.sales).toBe(90);
  });
});
