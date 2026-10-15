/**
 * lane:automation (chunk 5; DESIGN-S3D §9.8, §8.9) — Problems (AUTO-035): one case per state (low, out, arriving, a
 * line paused for room, a decided line), the counts the dots read, and the "Out of salt mix" Automation notification
 * (once a game day, in the reason's words: ADR-0026 decision 9's table).
 */
import { describe, it, expect } from 'vitest';
import { facility, run } from './support/automation';
import { lineFarm } from './support/production';
import { addReservoir, automationProblems, batchGal, batchSaltKg, changesPerDay, decidedLines, freshCap, holdAll, mixerPerDay, problemCounts, saltCap, saltOutText, supplyNotices, upgradePrep, waitForLine, waterRoom, waterRoomRun } from '@/sim/automation';
import type { GameState } from '@/types';
import { issueViews } from '@/ui/panels/operations/issues';
import { endLine, productionLines } from '@/sim/production';
import { repairState } from '@/persistence';
import type { SupplyProblem } from '@/sim/automation';

const salt = (g: Parameters<typeof automationProblems>[0]) => automationProblems(g).find((p): p is SupplyProblem => p.kind === 'supply' && p.supply === 'salt');

describe('AUTO-035: supply items', () => {
  it('enough salt mix: no item; one batch left: low (watch); less than a batch: out (danger)', () => {
    const { g } = facility({ fresh: 0, marine: 4, salt: 40, rosa: null });
    expect(salt(g)).toBeUndefined();
    g.inventory.salt = batchSaltKg(30);
    expect(salt(g)).toMatchObject({ state: 'low', tone: 'watch', why: 'no_manager' });
    g.inventory.salt = 0.9;
    expect(salt(g)).toMatchObject({ state: 'out', tone: 'danger' });
    expect(salt(g)!.shortDay).toBeGreaterThanOrEqual(4);
  });

  it('an empty fresh reserve is its own item (watch)', () => {
    const { g } = facility({ fresh: 1, marine: 0 });
    waterRoom(g)!.fresh = 0;
    expect(automationProblems(g).find((p) => p.kind === 'supply' && p.supply === 'fresh')).toMatchObject({ state: 'out', tone: 'watch' });
  });

  it('the counts: danger items first', () => {
    const { g } = facility({ fresh: 1, marine: 2, salt: 0, food: true, eggs: 2, veg: 20, rosa: null });
    waterRoom(g)!.fresh = 0;
    const list = automationProblems(g);
    expect(list[0].tone).toBe('danger');
    const c = problemCounts(list);
    expect(c.total).toBe(list.length);
    expect(c.danger + c.watch).toBe(c.total);
    expect(c.danger).toBeGreaterThan(0);
  });
});

describe('AUTO-035: a line paused for room', () => {
  it('is a problem until the player waits (or adds capacity); then it is "Resumes Day {d}"', () => {
    const { g } = lineFarm(17);
    const line = productionLines(g)[0];
    line.waiting = true;
    expect(automationProblems(g).find((p) => p.kind === 'line')).toMatchObject({ lineId: line.id, name: line.name, tone: 'watch' });
    waitForLine(g, line.id);
    expect(automationProblems(g).some((p) => p.kind === 'line')).toBe(false);
    expect(decidedLines(g)).toEqual([{ lineId: line.id, name: line.name, restartDay: expect.any(Number) }]);
  });

  it('a "Wait" ends with its line, so a new line on the same id starts undecided (the chunk 5 review)', () => {
    const { g } = lineFarm(17);
    const line = productionLines(g)[0];
    line.waiting = true;
    waitForLine(g, line.id);
    expect(g.automation?.lineWait?.[line.id]).toBeDefined();
    expect(endLine(g, line.id).ok).toBe(true);
    expect(g.automation?.lineWait).toBeUndefined();
    expect(repairState(JSON.parse(JSON.stringify(g))).filter((n) => n.startsWith('automation.lineWait'))).toEqual([]); // a valid save repairs to nothing
  });
});

describe('NOTIFY-012: the "Out of salt mix" Automation notification', () => {
  it('fires once a game day when salt mix is out and no reorder is coming, worded for the reason', () => {
    const { g } = facility({ fresh: 0, marine: 2, salt: 0, rosa: null, hour: 24 * 3 + 9 });
    run(g, 2); // the 10 AM check
    const ev = g.log.filter((e) => e.notice?.topic === 'supply_out');
    expect(ev.length).toBe(1);
    expect(ev[0].notice!.vars).toMatchObject({ supply: 'salt' });
    expect(ev[0].text).toMatch(/^Out of salt mix\. No one reorders salt mix\. Buy it, or hire a stock manager\./);
    run(g, 12); // the 10 PM check: within a day, so no second one
    expect(g.log.filter((e) => e.notice?.topic === 'supply_out').length).toBe(1);
    supplyNotices(g, g.clock.hour + 24);
    expect(g.log.filter((e) => e.notice?.topic === 'supply_out').length).toBe(2);
  });

  it('names the stock manager when her budget or switch is why', () => {
    const { g } = facility({ fresh: 0, marine: 2, salt: 0, rosa: 0 });
    const p = salt(g)!;
    expect(saltOutText(g, p)).toMatch(/^Rosa couldn't reorder salt mix — today's stock budget is spent\./);
    g.staff!.ordersOff = true;
    expect(saltOutText(g, salt(g)!)).toMatch(/^Rosa's orders are switched off, so nobody reorders salt mix\./);
  });
});

describe('ADR-0033: the Water room\'s day — the changes it would skip for want of salt or fresh water', () => {
  // the Water room's next week, dry-run with the jobs' rules (forecast.ts); the first two days don't count
  const shop = (o: { fresh: number; marine: number }) => {
    const f = facility({ ...o, salt: 200, rosa: null });
    for (const t of [...f.fresh, ...f.marine]) t.tierId = 'g180'; // big tanks: about 18 gal a day each
    const room = waterRoom(f.g)!;
    room.salt = saltCap(room); // a settled room: the reserve full
    return { ...f, room };
  };
  const item = (g: GameState, supply: 'salt_rate' | 'fresh_rate') => automationProblems(g).find((p): p is SupplyProblem => p.kind === 'supply' && p.supply === supply);

  it('"Salt water runs short" below two batches a day too, with the mixer\'s real output; a Reservoir clears it', () => {
    // two marine tanks: about 36 gal a day, under the 60 two batches would make, but the 60 % rule lets the mixer
    // start only one batch a day after the morning's changes (the second confirmation review)
    const { g, room } = shop({ fresh: 0, marine: 2 });
    const use = changesPerDay(g).salt;
    expect(use).toBeLessThan(mixerPerDay(room));
    const run = waterRoomRun(g, 168, { unlimitedSalt: true })!;
    expect(run.skipped.some((s) => s.cause === 'salt' && s.at >= g.clock.hour + 48)).toBe(true);
    const it = item(g, 'salt_rate')!;
    expect(it).toMatchObject({ tone: 'watch' });
    expect(it.perDay).toBeCloseTo(use, 6);
    expect(it.capacity!).toBeLessThan(use); // what the mixer really makes
    expect(addReservoir(g).ok).toBe(true);
    expect(batchGal(room)).toBe(60); // half the salt reserve (120 gal)
    expect(batchSaltKg(batchGal(room))).toBeCloseTo(8.2, 6);
    room.salt = saltCap(room);
    expect(item(g, 'salt_rate')).toBeUndefined();
  });

  it('no warning while water changes are held (nothing is drawn), and none for a new room\'s first empty morning', () => {
    const { g, room } = shop({ fresh: 0, marine: 2 });
    holdAll(g);
    expect(item(g, 'salt_rate')).toBeUndefined();
    const small = facility({ fresh: 0, marine: 2, salt: 40, rosa: null }); // 20 gal tanks, the salt reserve still empty
    expect(waterRoom(small.g)!.salt).toBe(0);
    expect(item(small.g, 'salt_rate')).toBeUndefined();
    void room;
  });

  it('"Fresh water runs short": the prep station can\'t keep up; faster prep clears it', () => {
    // ten big fresh tanks, half lit at 8 AM and half at 8 PM: 180 gal a day against 144, never more than 90 at a draw
    const { g, fresh } = shop({ fresh: 10, marine: 0 });
    fresh.slice(5).forEach((t) => {
      t.lighting.onHour = 20;
      t.lighting.offHour = 8;
    });
    expect(item(g, 'fresh_rate')).toMatchObject({ limit: 'prep', capacity: 144 });
    expect(item(g, 'fresh_rate')!.perDay).toBeGreaterThan(144);
    expect(upgradePrep(g).ok).toBe(true); // 9 gal an hour: 216 a day
    expect(item(g, 'fresh_rate')).toBeUndefined();
  });

  it('a mixer waiting for fresh water is the fresh water\'s shortage, not the salt\'s (the third confirmation review)', () => {
    // three Reservoirs (120 gal batches) on the base prep (144 gal a day) and eight big marine tanks: the 10 AM check
    // finds too little fresh water, so the salt tanks go short; faster prep, not "Water tab", is what helps
    const { g, room } = shop({ fresh: 0, marine: 8 });
    room.reservoirs = 3;
    room.salt = saltCap(room);
    room.fresh = 5; // not empty ("Fresh water ran out" would take its place), but short of a 120 gal batch at 10 AM
    const run = waterRoomRun(g, 168, { unlimitedSalt: true })!;
    expect(run.waits.some((w) => w.cause === 'fresh')).toBe(true);
    expect(run.skipped.some((s) => s.cause === 'salt' && s.at >= g.clock.hour + 48)).toBe(true);
    expect(item(g, 'salt_rate')).toBeUndefined();
    // chunk 6 (B-202, ADR-0034 decision 7): the day's use (144 gal) fits the prep station's 144, so the prep reason read
    // "use 144 … makes 144"; the limit is the batch the mixer can't collect at its checks
    expect(item(g, 'fresh_rate')).toMatchObject({ limit: 'timing', capacity: 120 });
    const view = issueViews(g, automationProblems(g)).find((v) => v.key === 'fresh_rate');
    expect(view?.reason).toBe('Salt mixing needs 120 gal of fresh water at its 10 AM and 10 PM checks, and the fresh reserve doesn’t have it by then. What it can’t cover waits: changes are skipped, not done weak.');
    expect(view?.action).toMatchObject({ label: 'Faster prep in Build' });
  });

  it('"Fresh water runs short": the morning\'s changes need more than the fresh reserve holds; a Reservoir clears it', () => {
    // nine big fresh tanks lit at 8 AM: 162 gal at once against a 150 gal reserve, though 144 a day of prep would do
    const { g, room } = shop({ fresh: 9, marine: 0 });
    expect(upgradePrep(g).ok).toBe(true);
    expect(item(g, 'fresh_rate')).toMatchObject({ limit: 'reserve', capacity: 150 });
    expect(addReservoir(g).ok).toBe(true);
    room.fresh = freshCap(room);
    expect(item(g, 'fresh_rate')).toBeUndefined();
  });
});
