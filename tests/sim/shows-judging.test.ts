/**
 * Judging: better genes and better care always mean a better expected score, and every judge's card explains the
 * score. OWNER: lane "shows".
 */
import { describe, it, expect } from 'vitest';
import { assessCreature, assessTank, enterShow, fieldChances, scoreBand } from '@/sim/shows';
import { SHOW_CLASS_BY_ID, SHOW_CLASSES } from '@/data/shows';
import { advanceWorld } from '@/sim/world';
import { scapeEditsKey } from '@/sim/facility';
import { showGame, starterOf, wellKept, addAdult, addShow, TOP } from './shows-helpers';

describe('livestock judging', () => {
  const g = showGame('axolotl', 31);
  const tank = g.tankOrder[0];
  const def = SHOW_CLASS_BY_ID.axolotl_morph;

  it('better potentials → better expected score (every criterion is monotonic)', () => {
    const c = addAdult(g, 'axolotl', tank, { size: 50, color: 50, pattern: 50, structure: 50 }, 30);
    let last = assessCreature(g, c, def).expected;
    for (const k of ['color', 'pattern', 'structure', 'size'] as const) {
      const before = assessCreature(g, c, def).expected;
      c.genome.potentials[k] = 90;
      if (k === 'size') c.sizeCm *= 1.3;
      const after = assessCreature(g, c, def).expected;
      expect(after, k).toBeGreaterThan(before);
      last = after;
    }
    expect(last).toBeGreaterThan(60);
  });

  it('better condition and a stronger bond → better expected score', () => {
    const c = addAdult(g, 'axolotl', tank, { size: 60, color: 60, pattern: 60, structure: 60 }, 30);
    const at = (o: Parameters<typeof wellKept>[1]) => assessCreature(g, wellKept(c, o), def).expected;
    expect(at({ health: 100 })).toBeGreaterThan(at({ health: 80 }));
    expect(at({ stress: 5 })).toBeGreaterThan(at({ stress: 40 }));
    expect(at({ conditioning: 90 })).toBeGreaterThan(at({ conditioning: 0 }));
    expect(at({ injury: 0 })).toBeGreaterThan(at({ injury: 8 }));
    expect(at({ bond: 95 })).toBeGreaterThan(at({ bond: 5 }));
    expect(at({ hunger: 10 })).toBeGreaterThan(at({ hunger: 70 }));
  });

  it('morph classes reward rare morphs; open classes do not', () => {
    const a = addAdult(g, 'axolotl', tank, TOP, 30);
    const b = addAdult(g, 'axolotl', tank, TOP, 30);
    // same (unreadable) alleles for both, so only the named morph differs
    const blank = Object.fromEntries(Object.keys(a.genome.alleles).map((k) => [k, ['?', '?']])) as typeof a.genome.alleles;
    a.genome.alleles = { ...blank };
    b.genome.alleles = { ...blank };
    a.morphName = 'Axanthic';
    b.morphName = 'Wild Type';
    const rarityOf = (x: typeof a) => assessCreature(g, x, def).criteria.find((cr) => cr.key === 'rarity')!.q;
    expect(rarityOf(a)).toBeGreaterThan(rarityOf(b));
    const open = SHOW_CLASS_BY_ID.open_fw;
    expect(assessCreature(g, a, open).criteria.some((cr) => cr.key === 'rarity')).toBe(false);
  });

  it('prime adults outshow young adults and elders', () => {
    const young = addAdult(g, 'axolotl', tank, TOP, 19);
    const prime = addAdult(g, 'axolotl', tank, TOP, 30);
    prime.sizeCm = young.sizeCm = 30;
    const twin = (x: typeof prime) => {
      x.personality = [...prime.personality];
      x.genome = JSON.parse(JSON.stringify(prime.genome));
      x.morphName = prime.morphName;
    };
    twin(young);
    expect(assessCreature(g, prime, def).expected).toBeGreaterThan(assessCreature(g, young, def).expected);
    const elder = addAdult(g, 'axolotl', tank, TOP, 350);
    elder.sizeCm = 30;
    twin(elder);
    expect(elder.lifeStage).toBe('elder');
    expect(assessCreature(g, prime, def).expected).toBeGreaterThan(assessCreature(g, elder, def).expected);
  });

  it('class standards hand out exactly 100 points', () => {
    for (const d of SHOW_CLASSES) expect(Object.values(d.standard).reduce((a, b) => a + (b ?? 0), 0), d.id).toBe(100);
  });

  it('every entry gets a judge’s card with 3–5 reasons that add up to the score', () => {
    const gg = showGame('betta', 77);
    const c = wellKept(starterOf(gg));
    const show = addShow(gg, 'club', ['open_fw'], { field: 6 });
    expect(enterShow(gg, show.id, 'open_fw', c.id).ok).toBe(true);
    advanceWorld(gg, 11);
    const e = gg.shows!.entries.find((x) => x.showId === show.id)!;
    expect(e.status, e.note).toBe('judged');
    expect(e.card!.lines.length).toBeGreaterThanOrEqual(3);
    expect(e.card!.lines.length).toBeLessThanOrEqual(5);
    const sum = e.card!.criteria.reduce((a, cr) => a + cr.points, 0);
    expect(Math.abs(sum - e.score!)).toBeLessThan(0.21);
    const eye = e.card!.criteria.find((cr) => cr.key === 'judge')!;
    expect(Math.abs(eye.points)).toBeLessThanOrEqual(5);
    expect(e.rank).toBeGreaterThanOrEqual(1);
    expect(e.of).toBe(7);
    const res = show.classes[0].results!;
    expect(res.some((p) => p.mine)).toBe(true);
    expect(show.bestInShow).toBeDefined();
  });

  it('chances rise with the expected score and fall with the tier', () => {
    expect(fieldChances('club', 70, 6).win).toBeGreaterThan(fieldChances('club', 55, 6).win);
    expect(fieldChances('club', 70, 6).win).toBeGreaterThan(fieldChances('national', 70, 6).win);
    expect(fieldChances('regional', 70, 8).ribbon).toBeGreaterThanOrEqual(fieldChances('regional', 70, 8).win);
    expect(scoreBand(50)).toBe('Ordinary');
    expect(scoreBand(90)).toBe('Remarkable');
  });
});

describe('aquascape judging', () => {
  it('cleaner water, healthier animals and sensible stocking score higher', () => {
    const g = showGame('betta', 5);
    const t = g.tanks[g.tankOrder[0]];
    g.progress.counters[scapeEditsKey(t.id)] = 3;
    const def = SHOW_CLASS_BY_ID.scape_nano;
    const base = assessTank(g, t, def).expected;
    t.water.algae = 60;
    t.water.clarity = 0.6;
    expect(assessTank(g, t, def).expected).toBeLessThan(base);
    t.water.algae = 0;
    t.water.clarity = 1;
    t.cache.welfare = 40;
    expect(assessTank(g, t, def).expected).toBeLessThan(base);
    t.cache.welfare = 95;
    t.cache.stockingLoad = 1.6;
    expect(assessTank(g, t, def).expected).toBeLessThan(assessTank(g, { ...t, cache: { ...t.cache, stockingLoad: 0.5 } }, def).expected);
    const card = assessTank(g, t, def);
    expect(card.criteria.find((c) => c.key === 'composition')!.max).toBe(45);
  });

  it('biotopes reward one habitat and penalise domestic breeds or mixed continents', () => {
    const g = showGame('betta', 5);
    const t = g.tanks[g.tankOrder[0]];
    const def = SHOW_CLASS_BY_ID.scape_biotope;
    const q = () => assessTank(g, t, def).criteria.find((c) => c.key === 'biotope')!.q;
    addAdult(g, 'honey_gourami', t.id);
    const asian = q();
    addAdult(g, 'cardinal_tetra', t.id);
    expect(q()).toBeLessThan(asian);
  });
});
