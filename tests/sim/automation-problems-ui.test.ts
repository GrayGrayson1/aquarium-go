/**
 * lane:automation (chunk 5; DESIGN-S3D §7.6, AUTO-035) — Operations › Problems' line card, server-rendered: the chain's
 * quarantine step in the design's words, and "Why the line stops" when a busy quarantine tank holds the line up
 * (the chunk 5 review: the card was missing).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { lineFarm } from './support/production';
import { useGame } from '@/state/game';
import { opsSnapshot } from '@/ui/common/ops';
import { ProblemsView } from '@/ui/panels/operations/Problems';
import { dayOf } from '@/sim/time';
import { QUARANTINE_HOURS, quarantineBusyUntil, restartDay } from '@/sim/production';
import { lineView } from '@/sim/production/view';
import { facility } from './support/automation';
import { automationProblems, saltCap, upgradePrep, waterRoom } from '@/sim/automation';
import { issueViews } from '@/ui/panels/operations/issues';
import { planPurchases } from '@/sim/staff/work';
import { BudgetStatus } from '@/ui/panels/visitors/StaffTab';
import { getSpecies } from '@/data/species';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import { juvenileSlots } from '@/sim/life/breeding/common';

afterEach(() => useGame.setState({ game: null }));

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, '’').replace(/\s+/g, ' ');

describe('AUTO-035: a line held up by a busy quarantine tank', () => {
  it('names the batch in quarantine and its day, and says why the line stops: a second tank against waiting', () => {
    const { g, lineId, tanks } = lineFarm(17);
    g.progress.unlocked.push('operations_desk');
    const line = g.production!.lines.find((l) => l.id === lineId)!;
    const now = g.clock.hour;
    // the last batch went into quarantine a day ago; the next one is sorted and waits for it
    line.batches = [
      { id: 'b1', creatureIds: [], sortedHour: now - 30, tankId: tanks.qt.id, quarantinedHour: now - 24 },
      { id: 'b2', creatureIds: [], sortedHour: now - 1 },
    ];
    line.waiting = true;
    useGame.setState({ game: g });
    const html = text(renderToStaticMarkup(createElement(ProblemsView, { g, snap: opsSnapshot(g), nav: { tab: () => {}, view: () => {} } })));
    const until = dayOf(now - 24 + QUARANTINE_HOURS);
    expect(html).toContain(`${line.name} until Day ${until}`);
    expect(html).toContain('Why the line stops');
    expect(html).toContain(`Quarantine serves the ${line.name} and each batch stays 7 days, so the ${line.name.replace(/ line$/, '')} juveniles can’t start quarantine until Day ${until}. Grow-out stays full until then.`);
    expect(html).toContain(`With a second quarantine tank Resumes Day ${dayOf(now)}`);
    expect(html).toContain(`If you wait Resumes Day ${until} (one clutch starts ${until - dayOf(now)} days late; no animals are lost)`);
  });
});

describe('Audit 2026-11-17 (H1): a line held up by a quarantine tank full of unsold young', () => {
  it('says what fills it, promises no day, offers no Wait, and stays a problem after a Wait', () => {
    const { g, lineId, tanks } = lineFarm(17);
    g.progress.unlocked.push('operations_desk');
    const line = g.production!.lines.find((l) => l.id === lineId)!;
    const sp = getSpecies('betta');
    const rng = simRng(g);
    const kid = () => createCreature(g, rng, 'betta', { ageDays: 8, motherId: line.pair.motherId, fatherId: line.pair.fatherId });
    const next = addCreature(g, kid(), tanks.raise.id);
    for (let i = 0; i < 300 && juvenileSlots(g, tanks.qt, sp, g.clock.hour, next.sizeCm) >= 1; i++) addCreature(g, kid(), tanks.qt.id);
    line.batches = [{ id: 'b2', creatureIds: [next.id], sortedHour: g.clock.hour - 1 }];
    line.waiting = true;
    useGame.setState({ game: g });
    const render = () => text(renderToStaticMarkup(createElement(ProblemsView, { g, snap: opsSnapshot(g), nav: { tab: () => {}, view: () => {} } })));
    let html = render();
    expect(html).toContain('Quarantine is full of unsold young from an earlier batch: sell or move them, or add a quarantine tank.');
    expect(html).toContain('Quarantine · full');
    expect(html).toMatch(/\d+ unsold · waits until it has room/);
    expect(html).not.toContain('the line restarts by itself');
    expect(html).not.toContain('takes them on Day');
    expect(html).not.toContain('Wait · resumes Day');
    // a Wait chosen earlier doesn't hide it: waiting alone never frees the tank
    (g.automation ??= {}).lineWait = { [line.id]: g.clock.hour };
    expect(automationProblems(g).some((p) => p.kind === 'line' && p.lineId === line.id && p.restartDay === null)).toBe(true);
    html = render();
    expect(html).toContain('Quarantine · full');
    expect(html).not.toContain('Resumes Day');
  });
});

describe('Audit 2026-11-17 (H1 second review): a line waiting on an unwell animal past its hold', () => {
  it('promises no day that has passed: it names the animal, says nothing of restarting by itself, and offers no Wait', () => {
    const { g, lineId, tanks } = lineFarm(17);
    g.progress.unlocked.push('operations_desk');
    const line = g.production!.lines.find((l) => l.id === lineId)!;
    const rng = simRng(g);
    const kid = (name: string) => addCreature(g, createCreature(g, rng, 'betta', { ageDays: 8, name, motherId: line.pair.motherId, fatherId: line.pair.fatherId }), tanks.qt.id);
    const sick = kid('Couture');
    const well = kid('Velvet');
    sick.illness = { kind: 'fin_rot', severity: 50, sinceHour: g.clock.hour } as never;
    sick.stats.health = 30;
    g.clock.hour = 24 * 8 + 10; // Day 9, 10 AM: the batch's hold ended on Day 8
    line.batches = [
      { id: 'b1', creatureIds: [sick.id, well.id], sortedHour: 24 * 0, tankId: tanks.qt.id, quarantinedHour: 24 * 7 - 168 + 20 },
      { id: 'b2', creatureIds: [], sortedHour: g.clock.hour - 1 },
    ];
    line.waiting = true;
    expect(quarantineBusyUntil(g, tanks.qt.id)).toBeLessThan(g.clock.hour); // still held, an hour past
    expect(restartDay(g, line)).toBeNull(); // it was 8
    expect(lineView(g, line)!.next.waitsOn?.id).toBe(sick.id);
    expect(automationProblems(g).find((p) => p.kind === 'line')).toMatchObject({ restartDay: null });
    useGame.setState({ game: g });
    const html = text(renderToStaticMarkup(createElement(ProblemsView, { g, snap: opsSnapshot(g), nav: { tab: () => {}, view: () => {} } })));
    expect(html).toContain('Quarantine’s batch waits until Couture is well, or until you move Couture out. No animals are lost.');
    expect(html).toContain('Quarantine · busy waits until Couture is well, or until you move Couture out');
    expect(html).not.toContain('restarts by itself');
    expect(html).not.toMatch(/until Day \d|Wait · resumes Day|Resumes Day/);
    // well again: the tank's batch lists, and a day can be promised once more (here: today, the tank free)
    delete sick.illness;
    sick.stats.health = 95;
    expect(lineView(g, line)!.next.waitsOn).toBeUndefined();
  });

  it('a relisted batch taken off sale for an unwell animal keeps its quarantine tank while it waits on it', () => {
    const { g, lineId, tanks } = lineFarm(17);
    const line = g.production!.lines.find((l) => l.id === lineId)!;
    const sick = addCreature(g, createCreature(g, simRng(g), 'betta', { ageDays: 8, motherId: line.pair.motherId, fatherId: line.pair.fatherId }), tanks.qt.id);
    sick.illness = { kind: 'fin_rot', severity: 50, sinceHour: g.clock.hour } as never;
    line.batches = [{ id: 'b1', creatureIds: [sick.id], sortedHour: 0, tankId: tanks.qt.id, quarantinedHour: g.clock.hour - 200, relists: 2 }];
    expect(quarantineBusyUntil(g, tanks.qt.id)).not.toBeNull(); // it was free: the next batch moved in beside the sick one
    delete sick.illness;
    sick.stats.health = 95;
    expect(quarantineBusyUntil(g, tanks.qt.id)).toBeNull(); // well: a relisting batch has done its hold
  });
});

describe('AUTO-046: the stock budget\'s status line (Visitors › Staff)', () => {
  it('names what the budget leaves after food, or what would cover food and the salt order', () => {
    // four marine tanks on changers, one batch of salt on the shelf, under a day of food
    const f = facility({ fresh: 1, marine: 4, salt: 4.1, rosa: 150, hour: 24 * 3 + 8.5 });
    waterRoom(f.g)!.salt = 20;
    f.g.inventory.foods = { flake_tropical: 1, marine_pellets: 1 };
    const m = f.g.staff!.roster[0];
    useGame.setState({ game: f.g });
    const all = planPurchases(f.g, m, Infinity, Infinity);
    const food = all.buys.filter((b) => b.kind !== 'salt').reduce((a, b) => a + b.price, 0);
    const kg = all.buys.find((b) => b.kind === 'salt')!.kg!;
    const need = Math.ceil(food + kg * 3);
    const line = (budget: number) => text(renderToStaticMarkup(createElement(BudgetStatus, { g: f.g, m, budget })));
    expect(line(need - 1)).toContain(`Food takes $${food} of it, so salt mix doesn’t fit (5 kg is $15). $${need} covers food and the ${kg} kg order.`);
    expect(line(need)).toContain(`Covers food ($${food}) and a ${kg} kg order of salt mix ($${kg * 3}): Rosa buys it at the 9:00 AM check.`);
    expect(line(need + 100)).toContain('Rosa buys it at the 9:00 AM check.');
  });
});

describe('ADR-0033: the Water room warnings in Problems and the alerts drawer', () => {
  const views = (g: Parameters<typeof issueViews>[0]) => issueViews(g, automationProblems(g));
  it('word the salt and both fresh cases as approved; with every upgrade bought the action is the Water tab', () => {
    const salt = facility({ fresh: 0, marine: 2, salt: 200, rosa: null });
    for (const t of salt.marine) t.tierId = 'g180';
    const room = waterRoom(salt.g)!;
    room.salt = saltCap(room);
    const s = views(salt.g).find((v) => v.key === 'salt_rate')!;
    expect(s).toMatchObject({ title: 'Salt water runs short', badge: 'Look soon', tab: 'water', action: { label: 'Reservoirs in Build' } });
    expect(s.reason).toMatch(/^The salt tanks’ changes use \d+ gal of salt water a day, and the mixer makes up to \d+ gal a day\. At this rate, the changes it can’t cover are skipped, not done weak\.$/); // Audit 2026-11-17 (H22): a forecast
    // eight big marine tanks (about 144 gal a day) with all three Reservoirs: no more space to buy
    const big = facility({ fresh: 0, marine: 8, salt: 2000, rosa: null });
    for (const t of big.marine) t.tierId = 'g180';
    const bigRoom = waterRoom(big.g)!;
    bigRoom.reservoirs = 3;
    bigRoom.salt = saltCap(bigRoom);
    expect(views(big.g).find((v) => v.key === 'salt_rate')?.action).toMatchObject({ id: 'water-tab', label: 'Water tab' });

    const fresh = facility({ fresh: 9, marine: 0, rosa: null });
    for (const t of fresh.fresh) t.tierId = 'g180';
    expect(upgradePrep(fresh.g).ok).toBe(true);
    const f = views(fresh.g).find((v) => v.key === 'fresh_rate')!;
    expect(f).toMatchObject({ title: 'Fresh water runs short', action: { label: 'Reservoirs in Build' } });
    expect(f.reason).toMatch(/^The tanks’ changes take \d+ gal of fresh water at lights-on, and the fresh reserve holds 150\. What it can’t cover waits: changes are skipped, not done weak\.$/);
  });
});
