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
import { QUARANTINE_HOURS } from '@/sim/production';
import { facility } from './support/automation';
import { automationProblems, saltCap, upgradePrep, waterRoom } from '@/sim/automation';
import { issueViews } from '@/ui/panels/operations/issues';
import { planPurchases } from '@/sim/staff/work';
import { BudgetStatus } from '@/ui/panels/visitors/StaffTab';

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
    expect(s.reason).toMatch(/^The salt tanks’ changes use \d+ gal of salt water a day, and the mixer makes up to \d+\. The changes it can’t cover are skipped, not done weak\.$/);
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
