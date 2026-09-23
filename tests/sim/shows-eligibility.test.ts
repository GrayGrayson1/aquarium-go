/**
 * The humane rules: only healthy, settled adults go to shows, and every "no" says why. OWNER: lane "shows".
 */
import { describe, it, expect } from 'vitest';
import { creatureShowReasons, tankShowReasons, enterShow, withdrawEntry, creatureFitsClass, classCandidates } from '@/sim/shows';
import { SHOW_CLASS_BY_ID } from '@/data/shows';
import { scapeEditsKey } from '@/sim/facility';
import { advanceWorld } from '@/sim/world';
import { showGame, starterOf, wellKept, addAdult, addShow } from './shows-helpers';

const reasons = (g: Parameters<typeof creatureShowReasons>[0], c: Parameters<typeof creatureShowReasons>[1]) => creatureShowReasons(g, c).join(' | ');

describe('humane entry rules', () => {
  it('a well-kept adult is fit to show', () => {
    const g = showGame('betta');
    const c = wellKept(starterOf(g));
    expect(creatureShowReasons(g, c)).toEqual([]);
  });

  it('juveniles stay home', () => {
    const g = showGame('betta');
    const tank = g.tankOrder[0];
    const young = addAdult(g, 'betta', tank, {}, 2);
    expect(young.lifeStage).toBe('juvenile');
    expect(reasons(g, young)).toMatch(/too young/i);
  });

  it('sick, injured, stressed or hungry animals stay home — with a reason', () => {
    const g = showGame('betta');
    const c = wellKept(starterOf(g));
    c.illness = { kind: 'fin_rot', severity: 30, sinceHour: g.clock.hour };
    expect(reasons(g, c)).toMatch(/unwell \(fin rot\)/i);
    wellKept(c, { health: 60 });
    expect(reasons(g, c)).toMatch(/not in show condition/i);
    wellKept(c, { injury: 25 });
    expect(reasons(g, c)).toMatch(/healing from an injury/i);
    wellKept(c, { stress: 70 });
    expect(reasons(g, c)).toMatch(/too stressed to travel/i);
    wellKept(c, { hunger: 85 });
    expect(reasons(g, c)).toMatch(/hungry/i);
    wellKept(c);
    expect(creatureShowReasons(g, c)).toEqual([]);
  });

  it('gravid, pregnant, berried, brooding or guarding animals stay home', () => {
    const g = showGame('betta');
    const c = wellKept(starterOf(g));
    for (const [stage, re] of [
      ['gravid', /gravid/i],
      ['pregnant', /pregnant/i],
      ['berried', /carrying eggs/i],
      ['brooding', /brooding/i],
      ['guarding', /guarding a clutch/i],
    ] as const) {
      c.repro.stage = stage;
      expect(reasons(g, c), stage).toMatch(re);
    }
    c.repro.stage = 'idle';
    c.repro.carryingUntilHour = g.clock.hour + 10;
    expect(reasons(g, c)).toMatch(/carrying young/i);
    c.repro.carryingUntilHour = undefined;
    const cl = { id: 'cl_x', speciesId: 'betta', tankId: c.tankId!, motherId: null, fatherId: c.id, laidHour: g.clock.hour, stage: 'eggs' as const, count: 40, nextStageHour: g.clock.hour + 20, survival: 1, guardedById: c.id, visual: 'bubble_nest' as const };
    g.clutches[cl.id] = cl;
    expect(reasons(g, c)).toMatch(/guarding a clutch/i);
  });

  it('newly arrived animals settle in first, and show animals rest two days between shows', () => {
    const g = showGame('betta');
    const c = wellKept(starterOf(g));
    c.life!.settledSinceHour = g.clock.hour - 3;
    expect(reasons(g, c)).toMatch(/still settling in \(arrived 3 h ago\)/i);
    c.life!.settledSinceHour = undefined;
    c.awards = { ribbons: [], wins: {}, placings: 0, bestInShow: 0, shown: 1, titles: [], lastShowHour: g.clock.hour - 5 };
    expect(reasons(g, c)).toMatch(/resting after its last show/i);
    c.awards.lastShowHour = g.clock.hour - 50;
    expect(creatureShowReasons(g, c)).toEqual([]);
  });

  it('corals and anemones are never moved for a show', () => {
    const g = showGame('ocellaris_clownfish');
    const c = starterOf(g);
    expect(creatureFitsClass(SHOW_CLASS_BY_ID.open_marine, c)).toBe(true);
    expect(creatureFitsClass(SHOW_CLASS_BY_ID.open_fw, c)).toBe(false);
    expect(creatureFitsClass(SHOW_CLASS_BY_ID.betta_halfmoon, c)).toBe(false);
  });

  it('betta classes are split by fin type', () => {
    const g = showGame('betta');
    const c = starterOf(g);
    const fins = c.appearance.finType;
    const byFin: Record<string, string> = { halfmoon: 'betta_halfmoon', double_tail: 'betta_halfmoon', veiltail: 'betta_longfin', crowntail: 'betta_longfin', plakat: 'betta_plakat' };
    for (const id of ['betta_halfmoon', 'betta_longfin', 'betta_plakat']) expect(creatureFitsClass(SHOW_CLASS_BY_ID[id], c), `${fins} in ${id}`).toBe(byFin[fins] === id);
  });

  it('entering pays the fee, blocks a second show, refunds on withdrawal and refuses unfit animals', () => {
    const g = showGame('betta');
    const c = wellKept(starterOf(g));
    const a = addShow(g, 'club', ['open_fw'], { fee: 12 });
    const b = addShow(g, 'club', ['open_fw'], { fee: 12, inHours: 30 });
    const money = g.finance.money;
    const r = enterShow(g, a.id, 'open_fw', c.id);
    expect(r.ok, r.message).toBe(true);
    expect(g.finance.money).toBe(money - 12);
    const r2 = enterShow(g, b.id, 'open_fw', c.id);
    expect(r2.ok).toBe(false);
    expect(r2.message).toMatch(/already entered/i);
    expect(withdrawEntry(g, r.entryId!).ok).toBe(true);
    expect(g.finance.money).toBe(money);
    c.stats.stress = 80;
    const r3 = enterShow(g, b.id, 'open_fw', c.id);
    expect(r3.ok).toBe(false);
    expect(r3.message).toMatch(/too stressed/i);
    // and the candidate list explains it
    const cand = classCandidates(g, b, 'open_fw').find((x) => x.id === c.id)!;
    expect(cand.eligible).toBe(false);
    expect(cand.reasons.join(' ')).toMatch(/stressed/i);
  });

  it('locked tiers, closed entries and the per-show entry limit are enforced', () => {
    const g = showGame('betta', 1234, ['club']);
    const c = wellKept(starterOf(g));
    const reg = addShow(g, 'regional', ['open_fw']);
    expect(enterShow(g, reg.id, 'open_fw', c.id).message).toMatch(/regional shows are locked/i);
    const club = addShow(g, 'club', ['open_fw'], { inHours: 2 });
    expect(enterShow(g, club.id, 'open_fw', c.id).message).toMatch(/entries have closed/i);
    const club2 = addShow(g, 'club', ['open_fw']);
    const tank = g.tankOrder[0];
    const extra = [0, 1, 2, 3].map(() => addAdult(g, 'neon_tetra', tank));
    let ok = 0;
    for (const x of extra) if (enterShow(g, club2.id, 'open_fw', x.id).ok) ok++;
    expect(ok).toBe(3);
  });

  it('an animal that falls ill before show day is scratched, and the club refunds the fee', () => {
    const g = showGame('betta');
    const c = wellKept(starterOf(g));
    const s = addShow(g, 'club', ['open_fw'], { fee: 9, inHours: 8 });
    expect(enterShow(g, s.id, 'open_fw', c.id).ok).toBe(true);
    advanceWorld(g, 4);
    c.illness = { kind: 'ich', severity: 40, sinceHour: g.clock.hour };
    advanceWorld(g, 5);
    const e = g.shows!.entries.find((x) => x.showId === s.id)!;
    expect(e.status).toBe('scratched');
    expect(e.note).toMatch(/stayed home/i);
    expect(g.finance.ledger.some((l) => l.memo.startsWith('Show fee refund') && l.amount === 9)).toBe(true);
    expect(c.awards?.shown ?? 0).toBe(0);
  });
});

describe('aquascape entries', () => {
  it('need your own layout, a healthy tank and the right class shape', () => {
    const g = showGame('betta');
    g.progress.unlocked.push('photo_contests');
    const t = g.tanks[g.tankOrder[0]];
    const nano = SHOW_CLASS_BY_ID.scape_nano;
    expect(tankShowReasons(g, t, nano).join(' ')).toMatch(/your own layouts/i);
    g.progress.counters[scapeEditsKey(t.id)] = 3;
    expect(tankShowReasons(g, t, nano)).toEqual([]);
    expect(tankShowReasons(g, t, SHOW_CLASS_BY_ID.scape_reef).join(' ')).toMatch(/reef tank/i);
    t.cache.status = 'danger';
    t.cache.statusReason = 'Ammonia is high.';
    expect(tankShowReasons(g, t, nano).join(' ')).toMatch(/welfare first/i);
  });
});
