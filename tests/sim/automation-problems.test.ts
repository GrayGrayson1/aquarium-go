/**
 * lane:automation (chunk 5; DESIGN-S3D §9.8, §8.9) — Problems (AUTO-035): one case per state (low, out, arriving, a
 * line paused for room, a decided line), the counts the dots read, and the "Out of salt mix" Automation notification
 * (once a game day, in the reason's words: ADR-0026 decision 9's table).
 */
import { describe, it, expect } from 'vitest';
import { facility, run } from './support/automation';
import { lineFarm } from './support/production';
import { automationProblems, batchSaltKg, decidedLines, problemCounts, saltOutText, supplyNotices, waitForLine, waterRoom } from '@/sim/automation';
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
