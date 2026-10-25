/**
 * Chunk 16 — the behaviour sets that gain species (lane "behavior"): the lyretail anthias holds station in a loose cloud
 * facing into the current (species data: specialBehaviors 'hover_in_current'); two clownfish species in one tank pair
 * and host within their own species; the new sets' profiles.
 */
import { describe, expect, it } from 'vitest';
import { SET_PROFILES } from './sets';
import { stepWorld } from './world';
import { decor, makeTestCreature, makeTestTank, makeTestWorld, speciesWith, stubSpecies } from './testkit';

const DT = 1 / 60;

describe('new behaviour-set profiles', () => {
  it('wrasse, starfish, conch and snail_sand move as their animals do', () => {
    const { wrasse, starfish, conch, snail_sand } = SET_PROFILES;
    expect(wrasse).toMatchObject({ loco: 'swim', rest: 'sand', startle: 'sand', labriform: true, picker: true, body: { hx: 0.5, hy: 0.13, hz: 0.07 } });
    expect(starfish).toMatchObject({ loco: 'crawl', canSwim: false, flatBody: true, startle: 'freeze', ignoreFish: true, body: { hx: 0.5, hy: 0.08, hz: 0.5 } });
    expect(starfish.crawlMask).toBe(7);
    expect(conch).toMatchObject({ loco: 'crawl', canSwim: false, crawlMask: 1, crawlGait: 'hop', startle: 'retract', body: { hx: 0.5, hy: 0.3, hz: 0.35 } });
    expect(conch.lurch && conch.bury).toBeTruthy();
    expect(snail_sand).toMatchObject({ loco: 'crawl', canSwim: false, crawlMask: 1, smellsFood: true, startle: 'burrow', body: SET_PROFILES.snail.body });
    expect(snail_sand.bury!.depth).toBeGreaterThan(conch.bury!.depth);
  });
});

describe('lyretail anthias (chromis + hover_in_current)', () => {
  it('holds station in a loose cloud in open water, facing into the current, darting out for plankton', () => {
    const ANTHIAS = stubSpecies('green_chromis', { id: 'test_anthias', adultSizeCm: 12, specialBehaviors: ['hover_in_current'], activityZone: ['upper', 'middle'], behaviorTraits: { cruiseSpeed: 1.2, burstSpeed: 6, turnRate: 3.2, hoverTendency: 0.65, schoolingTightness: 0.35 } });
    const tank = makeTestTank({ id: 'anth', tierId: 'g125', waterClass: 'reef', decor: [decor('test_rock', -0.22, -0.04, { scale: 1.4 }), decor('test_rock', 0.25, -0.08)] });
    const crew = Array.from({ length: 6 }, (_, i) => makeTestCreature(ANTHIAS.id, tank.id, { species: ANTHIAS, sizeCm: 10.8, temperament: 20 + i * 11 }));
    const w = makeTestWorld(tank, [...crew, ...Array.from({ length: 4 }, () => makeTestCreature('green_chromis', tank.id))], 12, {}, speciesWith([ANTHIAS]));
    const cd = w.env.currentDir;
    let hold = 0;
    let upstream = 0;
    let darts = 0;
    let spread = 0;
    let n = 0;
    let low = 0;
    for (let i = 0; i < 60 * 150; i++) {
      stepWorld(w, DT);
      if (i < 600) continue;
      const an = w.agents.filter((a) => a.sp.id === ANTHIAS.id);
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (const a of an) {
        cx += a.rt.pos.x / an.length;
        cy += a.rt.pos.y / an.length;
        cz += a.rt.pos.z / an.length;
      }
      for (const a of an) {
        expect(Number.isFinite(a.rt.pos.x + a.rt.pos.y + a.rt.pos.z)).toBe(true);
        spread += Math.hypot(a.rt.pos.x - cx, a.rt.pos.y - cy, a.rt.pos.z - cz) / a.L;
        n++;
        if (a.rt.pos.y < w.env.floorY + (w.env.surfaceY - w.env.floorY) * 0.2) low++;
        if (a.act !== 'school') continue;
        if (a.actPhase === 1) darts++;
        else {
          hold++;
          if (-(a.fwd.x * cd.x + a.fwd.z * cd.z) > 0.7) upstream++;
        }
      }
    }
    expect(upstream / hold).toBeGreaterThan(0.6);
    expect(darts).toBeGreaterThan(600);
    // a loose cloud: a few body lengths across on average, never scattered over the tank
    expect(spread / n).toBeGreaterThan(1);
    expect(spread / n).toBeLessThan(5);
    expect(low / n).toBeLessThan(0.1);
  });
});

describe('two clownfish species in one tank (clownfish)', () => {
  it('pair and host within their own species: one anemone is not shared between a maroon and an ocellaris pair', () => {
    const MAROON = stubSpecies('ocellaris_clownfish', { id: 'test_maroon', adultSizeCm: 16 });
    const tank = makeTestTank({ id: 'clowns', tierId: 'g75', waterClass: 'reef', decor: [decor('test_anemone', -0.2, -0.05, { id: 'bta' }), decor('test_rock', 0.25, -0.05, { id: 'rock' })] });
    const oc = [0, 1].map((i) => makeTestCreature('ocellaris_clownfish', tank.id, { id: `oc${i}`, repro: { stage: 'idle', stageSinceHour: 0, totalClutches: 0, totalOffspringRaised: 0, rank: i } }));
    const ma = [0, 1].map((i) => makeTestCreature(MAROON.id, tank.id, { id: `ma${i}`, species: MAROON, sizeCm: 14, repro: { stage: 'idle', stageSinceHour: 0, totalClutches: 0, totalOffspringRaised: 0, rank: i } }));
    const w = makeTestWorld(tank, [...oc, ...ma], 12, {}, speciesWith([MAROON]));
    const followed = new Set<string>();
    for (let i = 0; i < 60 * 90; i++) {
      stepWorld(w, DT);
      for (const a of w.agents) if (a.act === 'pair_follow' && a.actTarget) followed.add(`${a.speciesId}>${w.byId.get(a.actTarget)!.speciesId}`);
    }
    const hosts = new Set(w.agents.filter((a) => a.homeDecor === 'bta').map((a) => a.speciesId));
    expect(hosts.size).toBe(1);
    // every pair follow stays within the species
    for (const f of followed) {
      const [x, y] = f.split('>');
      expect(x).toBe(y);
    }
    // and both pairs keep a home
    for (const a of w.agents) expect(a.hasHome, a.id).toBe(true);
  });
});
