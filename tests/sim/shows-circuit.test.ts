/**
 * Show circuit: calendar, determinism, offline catch-up, old saves. OWNER: lane "shows".
 */
import { describe, it, expect } from 'vitest';
import { advanceWorld } from '@/sim/world';
import { makeContext } from '@/sim/context';
import { stepShows, upcomingShows, enterShow, ensureShowsState, classCandidates } from '@/sim/shows';
import { repairState } from '@/persistence/migrations';
import { SHOW_TIERS, SHOWS_VISIBLE, SHOW_CLASS_BY_ID } from '@/data/shows';
import { showGame, starterOf, wellKept, addShow } from './shows-helpers';

const json = (v: unknown) => JSON.stringify(v);

describe('show calendar', () => {
  it('keeps 3–5 upcoming shows on the calendar, judged in order, about one a day', () => {
    const g = showGame('betta', 7, ['club']);
    for (let day = 0; day < 20; day++) {
      advanceWorld(g, 24);
      const up = upcomingShows(g.shows!).filter((s) => s.judgingHour > g.clock.hour);
      expect(up.length).toBeGreaterThanOrEqual(3);
      expect(up.length).toBeLessThanOrEqual(5);
      for (let i = 1; i < up.length; i++) expect(up[i].judgingHour).toBeGreaterThan(up[i - 1].judgingHour);
      for (const s of up) {
        expect(s.deadlineHour).toBeLessThan(s.judgingHour);
        expect(s.classes.length).toBeGreaterThanOrEqual(SHOW_TIERS[s.tier].classes[0]);
        expect(Number.isFinite(s.fee) && s.fee > 0).toBe(true);
      }
    }
    const judged = g.shows!.shows.filter((s) => s.status === 'judged');
    expect(judged.length).toBeGreaterThan(5);
  });

  it('only schedules tiers the player has opened (plus at most one teaser for the next tier)', () => {
    const g = showGame('axolotl', 11, ['club']);
    for (let i = 0; i < 12; i++) {
      advanceWorld(g, 24);
      const up = upcomingShows(g.shows!);
      const locked = up.filter((s) => s.tier !== 'club');
      expect(locked.length).toBeLessThanOrEqual(1);
      expect(locked.every((s) => s.tier === 'regional')).toBe(true);
    }
  });

  it('club shows always offer a class the starter can enter', () => {
    for (const starter of ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'] as const) {
      const g = showGame(starter, 3, ['club']);
      advanceWorld(g, 1);
      const c = starterOf(g);
      const clubs = upcomingShows(g.shows!).filter((s) => s.tier === 'club');
      expect(clubs.length, starter).toBeGreaterThan(0);
      for (const s of clubs) {
        const fits = s.classes.some((cl) => SHOW_CLASS_BY_ID[cl.classId].kind === 'livestock' && classCandidates(g, s, cl.classId).some((x) => x.id === c.id));
        expect(fits, `${starter} at ${s.name}: ${s.classes.map((x) => x.classId).join(', ')}`).toBe(true);
      }
    }
  });

  it('is deterministic: same save + same actions → identical circuit, fields and results', () => {
    const run = () => {
      const g = showGame('betta', 99);
      advanceWorld(g, 2);
      const c = wellKept(starterOf(g));
      const show = upcomingShows(g.shows!).find((s) => s.classes.some((cl) => classCandidates(g, s, cl.classId).some((x) => x.id === c.id && x.eligible)))!;
      const cls = show.classes.find((cl) => classCandidates(g, show, cl.classId).some((x) => x.id === c.id))!;
      const r = enterShow(g, show.id, cls.classId, c.id);
      expect(r.ok, r.message).toBe(true);
      advanceWorld(g, 24 * 6);
      return { shows: g.shows, money: g.finance.money, rng: g.rngState };
    };
    const a = run();
    const b = run();
    expect(json(a)).toBe(json(b));
  });

  it('never draws from the main sim RNG (its own stream)', () => {
    const g = showGame('betta', 5);
    ensureShowsState(g);
    const before = g.rngState;
    for (let i = 0; i < 50; i++) {
      stepShows(g, 0.5, makeContext(g, 0.5));
      g.clock.hour += 0.5;
    }
    expect(g.rngState).toBe(before);
    expect(g.shows!.shows.some((s) => s.status === 'judged')).toBe(true);
  });
});

describe('robustness', () => {
  it('offline catch-up judges every show that passed and keeps scheduling forward', () => {
    const g = showGame('betta', 21);
    const c = wellKept(starterOf(g));
    const show = addShow(g, 'club', [c.appearance.finType === 'plakat' ? 'betta_plakat' : 'open_fw'], { inHours: 6 });
    expect(enterShow(g, show.id, show.classes[0].classId, c.id).ok).toBe(true);
    const start = g.clock.hour;
    // one huge step straight into stepShows (as if a caller skipped the world's sub-steps)
    stepShows(g, 24 * 10, makeContext(g, 24 * 10));
    g.clock.hour += 24 * 10;
    expect(show.status).toBe('judged');
    const e = g.shows!.entries.find((x) => x.showId === show.id)!;
    expect(['judged', 'scratched']).toContain(e.status);
    expect(g.shows!.shows.filter((s) => s.status === 'open' && s.judgingHour < start + 24 * 10).length).toBe(0);
    const up = upcomingShows(g.shows!);
    expect(up.length).toBe(SHOWS_VISIBLE);
    expect(up.every((s) => s.judgingHour > g.clock.hour)).toBe(true);
    // the normal world path with a long gap (offline catch-up uses advanceWorld)
    advanceWorld(g, 12);
    for (const s of g.shows!.shows) {
      expect(Number.isFinite(s.judgingHour)).toBe(true);
      for (const cl of s.classes) for (const p of cl.results ?? []) expect(Number.isFinite(p.score)).toBe(true);
    }
    expect(Number.isFinite(g.finance.money)).toBe(true);
  });

  it('old saves without a shows block load and start the circuit lazily', () => {
    const g = showGame('lined_seahorse', 8);
    advanceWorld(g, 3);
    const save = JSON.parse(JSON.stringify(g));
    delete save.shows;
    for (const c of Object.values(save.creatures) as { awards?: unknown }[]) delete c.awards;
    const repairs = repairState(save);
    expect(repairs).not.toContain('shows: unreadable, reset');
    expect(save.shows).toBeUndefined();
    advanceWorld(save, 30);
    expect(save.shows).toBeDefined();
    expect(upcomingShows(save.shows).length).toBeGreaterThanOrEqual(3);
  });

  it('repairState drops an unreadable shows block and fixes broken arrays', () => {
    const g = showGame('betta', 8);
    advanceWorld(g, 3);
    const bad = JSON.parse(JSON.stringify(g));
    bad.shows = 'garbage';
    expect(repairState(bad)).toContain('shows: unreadable, reset');
    expect(bad.shows).toBeUndefined();
    const half = JSON.parse(JSON.stringify(g));
    half.shows.entries = null;
    half.shows.trophies = 5;
    half.shows.rng = 'x';
    repairState(half);
    expect(Array.isArray(half.shows.entries)).toBe(true);
    expect(Array.isArray(half.shows.trophies)).toBe(true);
    expect(Number.isFinite(half.shows.rng)).toBe(true);
    advanceWorld(half, 48);
    expect(upcomingShows(half.shows).length).toBeGreaterThanOrEqual(3);
  });

  it('showcase worlds never run the circuit', () => {
    const g = showGame('betta', 8);
    g.isShowcase = true;
    advanceWorld(g, 48);
    expect(g.shows).toBeUndefined();
  });
});
