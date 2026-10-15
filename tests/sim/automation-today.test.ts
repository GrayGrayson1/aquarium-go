/**
 * lane:automation (chunk 5; DESIGN-S3D §7.1, §7.3) — Today and Saved this week (AUTO-043): the next scheduled jobs in
 * time order (water changes, harvests, salt mixing, the stock manager's checks), held ones marked; once a job has run
 * the next one moves up. Saved this week compares the shop price of the live food the tanks used of what the room made
 * with what making it cost.
 */
import { describe, it, expect } from 'vitest';
import { facility, run } from './support/automation';
import { holdAll, savedThisWeek, startCost, tankChangeNeed, todayJobs, waterRoom } from '@/sim/automation';
import { BRINE } from '@/data/catalog/machines';
import { getFoodDef } from '@/data/catalog/foods';

describe('AUTO-043: Today', () => {
  it('lists the next four jobs in time order, and the next one moves up once a job has run', () => {
    const { g } = facility({ fresh: 2, marine: 2, salt: 20, food: true, eggs: 30, veg: 20, rosa: 300, hour: 24 * 3 + 8.6 });
    waterRoom(g)!.salt = 20; // below 60 %: the 10 AM batch is due
    const jobs = todayJobs(g);
    expect(jobs.length).toBe(4);
    for (let i = 1; i < jobs.length; i++) expect(jobs[i].at).toBeGreaterThanOrEqual(jobs[i - 1].at);
    expect(jobs[0]).toMatchObject({ at: 24 * 3 + 9, kind: 'shelves', check: 'first', who: 'Rosa Duarte' });
    expect(jobs[1]).toMatchObject({ at: 24 * 3 + 10, kind: 'mixing', gal: 30, kg: 4.1 });
    run(g, 0.5); // 09:00 runs
    expect(todayJobs(g)[0]).toMatchObject({ at: 24 * 3 + 10, kind: 'mixing' });
  });

  it('a batch is listed when the morning changes will take the salt reserve under 60 % (the confirmation review)', () => {
    const { g, marine } = facility({ fresh: 0, marine: 2, salt: 20, hour: 24 * 3 + 12 });
    const draw = marine.reduce((a, t) => a + (tankChangeNeed(g, t)?.salt ?? 0), 0);
    expect(draw).toBeGreaterThan(0);
    waterRoom(g)!.salt = 36 + draw / 2; // at or above 60 % now (no 10 PM batch); under it after tomorrow's 8 AM changes
    const mixing = todayJobs(g, 12).filter((j) => j.kind === 'mixing');
    expect(mixing.map((j) => j.at)).toEqual([24 * 4 + 10]);
  });

  it('held jobs are marked: they wait until you resume', () => {
    const { g } = facility({ fresh: 1, marine: 0, hour: 24 * 3 + 2 });
    holdAll(g);
    expect(todayJobs(g).find((j) => j.kind === 'water')).toMatchObject({ held: true, tanks: 1 });
  });
});

describe('AUTO-043: Saved this week', () => {
  it('the shop price of the home-grown servings the tanks used, less what making them cost', () => {
    const { g } = facility({ fresh: 1, marine: 0, food: true, eggs: 30, veg: 0, hour: 24 * 3 + 6 });
    waterRoom(g)!.salt = 60;
    g.inventory.foods[BRINE] = 0;
    run(g, 24.5); // both cones started at 06:00 and are harvested 24 h later: 40 servings made
    g.automation!.today!.used[BRINE] = 25; // the tanks used 25 of them
    run(g, 24); // that day closes
    const s = savedThisWeek(g);
    const brine = getFoodDef(BRINE)!;
    expect(s.used.find((u) => u.foodId === BRINE)!.servings).toBe(25);
    expect(s.shop).toBeCloseTo((25 * brine.price) / brine.servingsPerPack, 2);
    expect(s.make).toBeGreaterThan(0);
    expect(s.make).toBeLessThan(4 * startCost('cone'));
    expect(s.saved).toBeCloseTo(s.shop - s.make, 2);
  });
});
