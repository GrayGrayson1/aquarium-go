/**
 * Rewards: prizes, reputation, mastery, trophies, titles, the valuation bonus, exhibit appeal and achievements.
 * OWNER: lane "shows".
 */
import { describe, it, expect } from 'vitest';
import { enterShow, topTitle, showValueFactors } from '@/sim/shows';
import { creatureValue } from '@/sim/economy';
import { exhibitInfo } from '@/sim/facility';
import { advanceWorld } from '@/sim/world';
import { PRIZE_SPLIT, SHOW_TIERS } from '@/data/shows';
import type { GameState, Creature } from '@/types';
import { showGame, starterOf, wellKept, addAdult, addShow, TOP } from './shows-helpers';

/** Enter `c` alone in a fresh open-freshwater class at `tier` and judge it (weak field so a top animal wins). */
function showAndJudge(g: GameState, c: Creature, tier: 'club' | 'regional' | 'national' | 'international', field = 3): ReturnType<typeof addShow> {
  wellKept(c, { bond: 95, conditioning: 90, stress: 5 });
  if (c.awards) c.awards.lastShowHour = undefined;
  const show = addShow(g, tier, ['open_fw'], { field, purse: SHOW_TIERS[tier].purse[1], fee: 10 });
  const r = enterShow(g, show.id, 'open_fw', c.id);
  expect(r.ok, r.message).toBe(true);
  advanceWorld(g, 10.5);
  return show;
}

describe('show rewards', () => {
  it('a class win pays the purse share, adds reputation and mastery, a trophy and a ribbon', () => {
    const g = showGame('betta', 3);
    const c = addAdult(g, 'neon_tetra', g.tankOrder[0], TOP);
    const money = g.finance.money;
    const rep = g.progress.reputation;
    const xp = g.progress.mastery.breeding;
    const show = showAndJudge(g, c, 'regional', 0);
    const e = g.shows!.entries.find((x) => x.showId === show.id)!;
    expect(e.status, e.note).toBe('judged');
    expect(e.rank).toBe(1);
    expect(e.ribbon).toBe(1);
    expect(e.bestInShow).toBe(true);
    const purse = show.classes[0].purse;
    const bis = Math.round(purse * SHOW_TIERS.regional.bisFrac);
    expect(e.prize).toBe(Math.round(purse * PRIZE_SPLIT[0]) + bis);
    expect(g.finance.money).toBeGreaterThan(money - 10 + e.prize! - 1 - 50); // (upkeep may tick in 10 h)
    expect(g.progress.reputation).toBeGreaterThan(rep);
    expect(g.progress.mastery.breeding).toBeGreaterThan(xp);
    expect(g.shows!.trophies.length).toBe(1);
    expect(g.shows!.trophies[0].kind).toBe('cup');
    expect(c.awards!.ribbons.length).toBe(1);
    expect(c.awards!.wins.regional).toBe(1);
    expect(c.history.some((h) => /Best in Show/.test(h.text))).toBe(true);
    expect(g.log.some((l) => l.kind === 'celebrate' && l.text.includes(show.name))).toBe(true);
    // the trip home leaves a little temporary stress
    expect(c.stats.stress).toBeGreaterThan(5);
  });

  it('Champion after 3 class wins at Regional+, Grand Champion after 3 at National+', () => {
    const g = showGame('betta', 4);
    // a male, so he never becomes gravid between shows (gravid females stay home)
    const c = addAdult(g, 'neon_tetra', g.tankOrder[0], TOP, undefined, 'male');
    for (let i = 0; i < 3; i++) showAndJudge(g, c, 'regional', 0);
    expect(c.awards!.titles).toEqual(['champion']);
    expect(topTitle(c)).toBe('champion');
    expect(g.log.some((l) => /is now a Champion/.test(l.text))).toBe(true);
    for (let i = 0; i < 3; i++) showAndJudge(g, c, 'national', 0);
    expect(c.awards!.titles).toContain('grand_champion');
    expect(topTitle(c)).toBe('grand_champion');
    // achievements (checked by the progression step)
    advanceWorld(g, 1);
    for (const a of ['first_ribbon', 'class_winner', 'best_in_show', 'show_champion', 'grand_champion']) expect(g.progress.achievements, a).toContain(a);
  });

  it('titled animals are worth moderately more, and their offspring carry a smaller lineage premium', () => {
    const g = showGame('betta', 5);
    const c = addAdult(g, 'neon_tetra', g.tankOrder[0], TOP);
    const before = creatureValue(g, c).total;
    c.awards = { ribbons: [], wins: { regional: 3 }, placings: 3, bestInShow: 0, shown: 3, titles: ['champion'], lastShowHour: undefined };
    const champ = creatureValue(g, c);
    expect(champ.factors.some((f) => f.label === 'Show record')).toBe(true);
    expect(champ.total / before).toBeGreaterThan(1.15);
    expect(champ.total / before).toBeLessThan(1.3);
    c.awards.titles.push('grand_champion');
    c.awards.wins.national = 3;
    const grand = creatureValue(g, c).total;
    expect(grand).toBeGreaterThan(champ.total);
    expect(grand / before).toBeLessThan(1.5);
    // offspring
    const kid = addAdult(g, 'neon_tetra', g.tankOrder[0], TOP);
    const plain = creatureValue(g, kid).total;
    kid.lineage.motherId = c.id;
    const f = showValueFactors(g, kid).find((x) => x.label === 'Champion bloodline')!;
    expect(f.mult).toBeGreaterThan(1.05);
    expect(f.mult).toBeLessThan(1.15);
    expect(creatureValue(g, kid).total).toBeGreaterThan(plain);
    expect(creatureValue(g, kid).factors.some((x) => x.label === 'Champion bloodline')).toBe(true);
  });

  it('award winners make an exhibit a little more appealing', () => {
    const g = showGame('betta', 6);
    const t = g.tanks[g.tankOrder[0]];
    const c = starterOf(g);
    const plain = exhibitInfo(g, t);
    c.awards = { ribbons: [], wins: { regional: 3 }, placings: 3, bestInShow: 1, shown: 3, titles: ['champion'] };
    const shown = exhibitInfo(g, t);
    expect(shown.factors.charisma).toBeGreaterThan(plain.factors.charisma);
    expect(shown.factors.charisma - plain.factors.charisma).toBeLessThanOrEqual(0.141);
    expect(shown.awardNote).toMatch(/champion/i);
  });

  it('a middling animal at a strong show gets no prize but still a card and a little experience', () => {
    const g = showGame('betta', 8);
    const c = addAdult(g, 'neon_tetra', g.tankOrder[0], { size: 35, color: 35, pattern: 35, structure: 35 });
    const xp = g.progress.mastery.exhibition;
    const show = showAndJudge(g, c, 'international', 16);
    const e = g.shows!.entries.find((x) => x.showId === show.id)!;
    expect(e.status).toBe('judged');
    expect(e.rank!).toBeGreaterThan(4);
    expect(e.prize).toBe(0);
    expect(e.card!.lines.length).toBeGreaterThanOrEqual(3);
    expect(g.progress.mastery.exhibition).toBeGreaterThan(xp);
    expect(g.log.some((l) => l.text.includes('no ribbons this time'))).toBe(true);
  });
});
