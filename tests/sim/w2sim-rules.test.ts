/**
 * Round 2 wave 2 — sim-rule fixes from the QA play-test. OWNER: lane "w2-sim".
 *
 *  1. Balance robustness: names never touch the sim RNG; sex-matched names; stale quests rotate off the board.
 *  2. One flow rule: one level off a species' preference is a GOOD note, two or more is WATCH (report, comfort, compat).
 *  3. Mixed-tank pH: within everyone's tolerated range is GOOD with a note; WATCH/DANGER only past it.
 *  4. Visitor occupancy never exceeds the day's arrivals, across day boundaries too.
 *  5. The debt message quotes the same daily bill as the Finances panel (after staff leave over unpaid wages).
 *  6. Two axolotls in the starter 20-gallon stay GOOD with twice-daily earthworms; overfeeding still shows.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank } from '@/types';
import { newGame, previewStarters } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { speciesWaterView } from '@/sim/life/welfare';
import { NAME_POOLS, generateName, namePoolFor, nameReadsAs } from '@/sim/life/names';
import { simRng, mulberry32 } from '@/sim/rng';
import { makeContext } from '@/sim/context';
import { feedTank, waterChange } from '@/sim/care';
import { getWaterReport, speciesWaterComfort } from '@/sim/water';
import { flowMismatch, flowInfo, computeTankEnv } from '@/sim/water/env';
import { nitrifierTempFactor } from '@/sim/water/chem';
import { evaluateTank, previewAddition } from '@/sim/compat';
import { dailyOperatingCost } from '@/sim/economy';
import { addStaffDirect } from '@/sim/staff';
import * as F from '@/sim/facility';
import { QUEST_STALE_HOURS } from '@/sim/facility/progression';
import { dayOf } from '@/sim/time';
import { FIXTURES } from '@/dev/fixtures';
import { getSpecies, listSpecies } from '@/data/species';

function starterGame(id: 'axolotl' | 'betta' | 'pea_puffer' | 'ocellaris_clownfish' | 'lined_seahorse', seed = 1234): GameState {
  const p = previewStarters(seed)[id];
  return newGame({ starterId: id, starterName: p.name, seed, starterCreature: p });
}

// ───────────────────────────── 1. names ─────────────────────────────

describe('w2-sim names: sex-matched and independent of the sim RNG', () => {
  it('a female betta is never given a masculine name, a male never a feminine one', () => {
    const betta = getSpecies('betta');
    for (let i = 0; i < 300; i++) {
      expect(nameReadsAs(generateName(betta, mulberry32(i), undefined, 'female'))).not.toBe('male');
      expect(nameReadsAs(generateName(betta, mulberry32(i), undefined, 'male'))).not.toBe('female');
    }
    // …but each sex does get its own names, not only the neutral ones
    const f = new Set(Array.from({ length: 300 }, (_, i) => generateName(betta, mulberry32(i), undefined, 'female')));
    expect([...f].some((n) => nameReadsAs(n) === 'female')).toBe(true);
  });

  it('unknown sex, sex-changing and hermaphrodite species draw from the neutral pool only', () => {
    for (const sp of listSpecies()) {
      const pool = namePoolFor(sp, 'unknown');
      expect(pool.length, sp.id).toBeGreaterThanOrEqual(20);
      expect(pool.every((n) => nameReadsAs(n) === null), sp.id).toBe(true);
      if (sp.sexSystem !== 'gonochoristic') for (const sex of ['male', 'female'] as const) expect(namePoolFor(sp, sex).every((n) => nameReadsAs(n) === null), `${sp.id} ${sex}`).toBe(true);
    }
    // every pool keeps plenty of neutral names for fry of unknown sex
    for (const [mood, pool] of Object.entries(NAME_POOLS)) expect(pool.filter((n) => nameReadsAs(n) === null).length, mood).toBeGreaterThanOrEqual(7);
  });

  it('newly born or bought animals get names without consuming the main sim RNG', () => {
    const a = starterGame('betta');
    const b = starterGame('betta');
    const ca = createCreature(a, simRng(a), 'betta', { sex: 'female', ageDays: 20 });
    const cb = createCreature(b, simRng(b), 'betta', { sex: 'female', ageDays: 20, name: 'Anything' });
    expect(a.rngState).toBe(b.rngState); // naming drew nothing from the stream
    expect(ca.genome).toEqual(cb.genome);
    expect(nameReadsAs(ca.name)).not.toBe('male');
    // fry (sex not visible yet) get neutral names
    const fry = createCreature(a, simRng(a), 'betta', { ageDays: 1 });
    expect(fry.sex).toBe('unknown');
    expect(nameReadsAs(fry.name)).toBeNull();
    // a protandrous clownfish that will change sex is never "Titus" or "Duchess"
    for (let i = 0; i < 20; i++) expect(nameReadsAs(createCreature(a, simRng(a), 'ocellaris_clownfish', { ageDays: 30 }).name)).toBeNull();
  });
});

// ───────────────────────────── 1b. quest board rotation ─────────────────────────────

describe('w2-sim quest board: untouched quests rotate off', () => {
  function board(): GameState {
    const g = starterGame('axolotl');
    F.tutorialSkip(g);
    g.progress.quests = g.progress.quests.filter((q) => q.id === 'tutorial');
    return g;
  }
  const step = (g: GameState, hours = 1) => {
    F.stepProgression(g, hours, makeContext(g, hours));
    g.clock.hour += hours;
  };

  it('a quest with no headway for four days makes room for a fresh one, and stays off for a while', () => {
    const g = board();
    const now = g.clock.hour;
    const feeds = F.counterValue(g, 'feeds');
    g.progress.quests.push(
      { id: 'q_species_3', status: 'active', progress: 0, startedHour: now - QUEST_STALE_HOURS - 1 },
      { id: 'q_beauty_70', status: 'active', progress: 0, startedHour: now - 10 },
      { id: 'q_feed_routine', status: 'active', progress: 0, startedHour: now - QUEST_STALE_HOURS - 50, baseline: feeds - 7, target: 10 },
    );
    step(g);
    const ids = g.progress.quests.map((q) => q.id);
    expect(ids).not.toContain('q_species_3'); // stale, under half done → rotated
    expect(ids).toContain('q_beauty_70'); // too recent
    expect(ids).toContain('q_feed_routine'); // old, but 7 of 10 feeds done → kept
    expect(g.progress.quests.filter((q) => q.id !== 'tutorial' && q.status !== 'claimed').length).toBe(3);
    for (let i = 0; i < 48; i++) step(g);
    expect(g.progress.quests.some((q) => q.id === 'q_species_3' && q.status === 'active')).toBe(false);
  });

  it('milestone quests (a facility move) never rotate off', () => {
    const g = board();
    const now = g.clock.hour;
    F.unlock(g, 'facility_specialty_shop', { silent: true });
    g.progress.quests.push(
      { id: 'q_open_shop', status: 'active', progress: 0, startedHour: now - QUEST_STALE_HOURS * 3 },
      { id: 'q_species_3', status: 'active', progress: 0, startedHour: now - 5 },
      { id: 'q_beauty_70', status: 'active', progress: 0, startedHour: now - 5 },
    );
    step(g);
    expect(g.progress.quests.some((q) => q.id === 'q_open_shop' && q.status === 'active')).toBe(true);
  });
});

// ───────────────────────────── 2. flow ─────────────────────────────

describe('w2-sim flow: one level off is a note, two or more is WATCH — report, comfort and compat agree', () => {
  it('flowMismatch bands', () => {
    const banggai = getSpecies('banggai_cardinalfish'); // low
    const tang = getSpecies('yellow_tang'); // high
    const loach = getSpecies('hillstream_loach'); // high, needs oxygen-rich current
    expect(flowMismatch(2, banggai)).toBe('bit_strong');
    expect(flowMismatch(3, banggai)).toBe('too_strong');
    expect(flowMismatch(2, tang)).toBe('bit_still');
    expect(flowMismatch(1, tang)).toBe('too_still');
    expect(flowMismatch(2, loach)).toBe('too_still');
  });

  it("facility_grand's Grand Reef (gentle, moderate and strong-flow fish together) reaches GOOD with a note", () => {
    const g = FIXTURES.facility_grand();
    g.isShowcase = false;
    for (let i = 0; i < 6; i++) advanceWorld(g, 1, {});
    const reef = Object.values(g.tanks).find((t) => t.name === 'Grand Reef')!;
    const rep = getWaterReport(g, reef.id);
    const flow = rep.params.find((p) => p.key === 'flow')!;
    expect(flow.status).toBe('good');
    expect(flow.reason).toMatch(/touch gentler|touch livelier/);
    expect(rep.issues.some((i) => i.param === 'flow')).toBe(false);
  });

  it('the same tank reads WATCH, a comfort stress and a compat caution when flow is two levels off', () => {
    const g = starterGame('lined_seahorse');
    const t = g.tanks[g.tankOrder[0]];
    const sp = getSpecies('lined_seahorse'); // wants low flow
    const setFlow = (pumpSetting: number, on: boolean) => {
      for (const e of t.equipment) if (e.defId.startsWith('powerhead')) Object.assign(e, { on, setting: pumpSetting });
    };
    // two or more levels too strong
    setFlow(1, true);
    const fast = flowInfo(t);
    if (flowMismatch(fast.index, sp) === 'too_strong') {
      expect(getWaterReport(g, t.id).params.find((p) => p.key === 'flow')!.status).toBe('watch');
      expect(speciesWaterComfort(sp, t).stressors.some((s) => /far too strong/.test(s))).toBe(true);
      const c = evaluateTank(g, t.id).reasons.find((r) => r.category === 'flow');
      expect(c?.severity).toBe('caution');
    }
    // one level off at most: GOOD, and only a small comfort note, never harm
    for (const setting of [0.05, 0.1, 0.3, 0.6]) {
      setFlow(setting, true);
      const m = flowMismatch(flowInfo(t).index, sp);
      if (m === 'too_strong' || m === 'too_still') continue;
      expect(getWaterReport(g, t.id).params.find((p) => p.key === 'flow')!.status).toBe('good');
      expect(speciesWaterComfort(sp, t).harm).toBe(0);
      expect(evaluateTank(g, t.id).reasons.filter((r) => r.category === 'flow').every((r) => r.severity === 'info')).toBe(true);
    }
  });
});

// ───────────────────────────── 3. pH ─────────────────────────────

describe('w2-sim pH: tolerated is GOOD with a note; WATCH only past the tolerated band', () => {
  function mixed(pH: number): { g: GameState; t: Tank } {
    const g = starterGame('betta');
    const t = createTank(g, 'g29', 'freshwater_planted', { cycled: true, placement: F.findFreeSpot(g, 'g29') ?? { x: 1.5, z: 0, rotY: 0 } });
    const rng = simRng(g);
    for (let i = 0; i < 8; i++) addCreature(g, createCreature(g, rng, 'cardinal_tetra', { ageDays: 60 }), t.id);
    for (let i = 0; i < 6; i++) addCreature(g, createCreature(g, rng, 'cherry_shrimp', { ageDays: 60 }), t.id);
    t.water.pH = pH;
    return { g, t };
  }

  it('cardinals with cherry shrimp at pH 7.2: GOOD, naming who would like softer or harder water', () => {
    const { g, t } = mixed(7.2);
    const ph = getWaterReport(g, t.id).params.find((p) => p.key === 'ph')!;
    expect(ph.status).toBe('good');
    expect(ph.reason).toMatch(/cardinal tetras would prefer softer/);
    expect(ph.advice).toMatch(/Nothing to fix/);
    // welfare agrees: a mild note, no harm
    for (const id of ['cardinal_tetra', 'cherry_shrimp']) {
      const v = speciesWaterView(getSpecies(id), t);
      expect(v.harm, id).toBe(0);
      expect(v.comfort, id).toBeGreaterThanOrEqual(85);
    }
  });

  it('just past a tolerated limit is WATCH (stress only); well past it is DANGER (harm)', () => {
    const cardMax = getSpecies('cardinal_tetra').pH.max;
    const near = mixed(cardMax + 0.2);
    expect(getWaterReport(near.g, near.t.id).params.find((p) => p.key === 'ph')!.status).toBe('watch');
    expect(speciesWaterView(getSpecies('cardinal_tetra'), near.t).harm).toBe(0);
    const far = mixed(cardMax + 0.6);
    expect(getWaterReport(far.g, far.t.id).params.find((p) => p.key === 'ph')!.status).toBe('danger');
    expect(speciesWaterView(getSpecies('cardinal_tetra'), far.t).harm).toBeGreaterThan(0);
  });

  it('the purchase preview agrees: tolerated → at most a note, past the limit → a caution or warning', () => {
    const { g, t } = mixed(7.2);
    const ok = previewAddition(g, t.id, { speciesId: 'cardinal_tetra', count: 4 }).reasons.filter((r) => r.category === 'chemistry');
    expect(ok.every((r) => r.severity === 'info')).toBe(true);
    t.water.pH = getSpecies('cardinal_tetra').pH.max + 0.2;
    expect(previewAddition(g, t.id, { speciesId: 'cardinal_tetra', count: 4 }).reasons.find((r) => r.category === 'chemistry')?.severity).toBe('caution');
  });
});

// ───────────────────────────── 4. visitors ─────────────────────────────

describe('w2-sim visitors: occupancy never exceeds the day’s arrivals', () => {
  it('a busy shop over several days, including open-until-midnight hours', () => {
    const g = FIXTURES.big_facility();
    g.isShowcase = false;
    g.facility.openToPublic = true;
    if (!g.progress.unlocked.includes('visitors')) g.progress.unlocked.push('visitors');
    const occ = () => g.visitors.live?.occupancy ?? 0;
    expect(occ()).toBeLessThanOrEqual(g.visitors.today.count + 1e-9);
    const check = () => {
      expect(occ()).toBeLessThanOrEqual(g.visitors.today.count + 1e-9);
      expect(occ()).toBeGreaterThanOrEqual(0);
    };
    for (let h = 0; h < 30; h++) {
      F.stepVisitors(g, 0.5, makeContext(g, 0.5));
      g.clock.hour += 0.5;
      check();
    }
    expect(F.setOpenHours(g, 16, 24).ok).toBe(true);
    let sawPeople = false;
    for (let h = 0; h < 2 * 48; h++) {
      F.stepVisitors(g, 0.5, makeContext(g, 0.5));
      g.clock.hour += 0.5;
      check();
      if (occ() > 1) sawPeople = true;
    }
    expect(sawPeople).toBe(true);
    // right after midnight the doors are shut and the last visitors have gone home
    const hod = ((g.clock.hour % 24) + 24) % 24;
    if (hod < 1) expect(occ()).toBe(0);
    expect(dayOf(g.clock.hour)).toBe(g.visitors.today.day);
  });
});

// ───────────────────────────── 5. finance ─────────────────────────────

describe('w2-sim finance: one daily bill, before and after staff leave over unpaid wages', () => {
  it('the debt message quotes dailyOperatingCost as it stands after payday', () => {
    const g = FIXTURES.big_facility();
    g.isShowcase = false;
    g.facility.openToPublic = false;
    for (let i = 0; i < 3; i++) addStaffDirect(g, { name: `Temp ${i}`, role: 'aquarist', skill: 3, trait: 'steady' as never });
    g.finance.money = 20;
    const seen = new Set(g.log.map((e) => e.id));
    let checked = 0;
    let left = false;
    for (let h = 0; h < 24 * 4; h++) {
      advanceWorld(g, 1, {});
      for (const e of g.log) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        if (/has left: their wages went unpaid/.test(e.text)) left = true;
        const m = /in the red after today's bills \(\$([\d,.]+)\/day\)/.exec(e.text);
        if (!m) continue;
        const quoted = Number(m[1].replace(/,/g, ''));
        expect(Math.abs(quoted - dailyOperatingCost(g).total)).toBeLessThan(1);
        checked++;
      }
    }
    expect(left).toBe(true);
    expect(checked).toBeGreaterThanOrEqual(3);
    expect(dailyOperatingCost(g).wages ?? 0).toBe(0);
  });
});

// ───────────────────────────── 6. axolotl pair water ─────────────────────────────

describe('w2-sim water: two adult axolotls in the starter 20-gallon', () => {
  function pair(): { g: GameState; t: Tank } {
    const g = starterGame('axolotl');
    const t = g.tanks[g.tankOrder[0]];
    addCreature(g, createCreature(g, simRng(g), 'axolotl', { sex: 'male', ageDays: 22 }), t.id);
    g.inventory.foods.earthworm = 500;
    return { g, t };
  }
  function run(g: GameState, t: Tank, days: number, feeds: number[], servings?: number, changeEveryDays = 3): { worstNitrogen: string; minHealth: number } {
    let worst = 'good';
    let minHealth = 100;
    let lastChange = g.clock.hour;
    for (let h = 0; h < days * 24; h++) {
      const hod = g.clock.hour % 24;
      if (feeds.includes(hod)) feedTank(g, t.id, 'earthworm', servings ? { servings } : {});
      if (g.clock.hour - lastChange >= changeEveryDays * 24) {
        waterChange(g, t.id, 0.25);
        lastChange = g.clock.hour;
      }
      advanceWorld(g, 1, { focusTankId: t.id });
      for (const p of getWaterReport(g, t.id).params) if ((p.key === 'ammonia' || p.key === 'nitrite') && p.status !== 'good') worst = p.status === 'danger' || worst === 'danger' ? 'danger' : 'watch';
      for (const c of Object.values(g.creatures)) if (c.tankId === t.id && c.status === 'alive') minHealth = Math.min(minHealth, c.stats.health);
    }
    return { worstNitrogen: worst, minHealth };
  }

  it('a careful keeper (earthworms twice a day, a 25% change every 3 days) stays GOOD and nobody is harmed', () => {
    const { g, t } = pair();
    const r = run(g, t, 8, [8, 20]);
    expect(r.worstNitrogen).toBe('good');
    expect(r.minHealth).toBeGreaterThanOrEqual(99);
    expect(computeTankEnv(g, t).stockingLoad).toBeLessThan(0.85);
    expect(getWaterReport(g, t.id).params.find((p) => p.key === 'nitrate')!.status).not.toBe('danger');
  });

  it('overfeeding still shows: five meals a day turn ammonia to WATCH within two days', () => {
    const { g, t } = pair();
    const r = run(g, t, 2, [8, 11, 14, 17, 20]);
    expect(r.worstNitrogen).not.toBe('good');
  });

  it('cool-water filter bacteria acclimate (≈80% of a tropical colony), but a sudden chill still slows them', () => {
    expect(nitrifierTempFactor(25)).toBeCloseTo(1, 5);
    expect(nitrifierTempFactor(16.5, 16.5)).toBeGreaterThan(0.75);
    expect(nitrifierTempFactor(16.5, 16.5)).toBeLessThan(0.9);
    expect(nitrifierTempFactor(20, 25)).toBeLessThan(nitrifierTempFactor(20, 20));
  });

  it('ammonia harms only once the report says WATCH (weighted by pH and temperature, as the report is)', () => {
    const { g, t } = pair();
    const sp = getSpecies('axolotl');
    for (const amm of [0.05, 0.1, 0.2, 0.3, 0.45, 0.6, 0.9, 1.4]) {
      t.water.ammonia = amm;
      t.water.nitrite = 0;
      const st = getWaterReport(g, t.id).params.find((p) => p.key === 'ammonia')!.status;
      const harm = speciesWaterView(sp, t).harm;
      if (st === 'good') expect(harm, `${amm} ppm`).toBe(0);
      if (amm >= 1.4) expect(harm).toBeGreaterThan(0);
    }
  });
});
