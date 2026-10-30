/**
 * Chunk 17 (ADR-0053; design §7) — the big-tank animals' behaviour, each in the SMALLEST tank the shop's tank gate
 * allows it (a 1 m shark in a tank 4 ft front to back, a 90 cm arowana in one 3 ft deep): big bodies are where steering
 * goes wrong (B-219), so every one must stay finite and inside the glass, keep moving about the tank rather than wedge,
 * and keep to its part of the water: the bottom sharks, the ray and the bichir low, the arowana high. The epaulette
 * walks on its fins (its species' gait).
 */
import { describe, expect, it } from 'vitest';
import { findSpecies } from '@/data/species';
import { tankTierFor } from '@/sim/facility/progression';
import { SET_PROFILES, speciesProfile } from './sets';
import { stepWorld } from './world';
import { decor, makeTestCreature, makeTestTank, makeTestWorld } from './testkit';

const DT = 1 / 30;

interface Run {
  inBounds: boolean;
  finite: boolean;
  /** Share of the tank's length and width the animal crossed. */
  spanX: number;
  spanZ: number;
  /** Mean height above the floor as a share of the water's depth. */
  height: number;
  walking: number;
  /** Longest time (s) it held one goal more than a body length away without closing a fifth of the distance. */
  wedged: number;
}

function runSpecies(id: string, n: number, hour: number, seconds: number): Run {
  const sp = findSpecies(id)!;
  const tier = tankTierFor(sp)!;
  const wc = sp.environment === 'marine' ? 'marine_fowlr' : sp.environment === 'brackish' ? 'brackish' : sp.tempC.max < 26 ? 'freshwater_cool' : 'freshwater_tropical';
  const tank = makeTestTank({
    id: `t17_${id}`,
    tierId: tier.id,
    waterClass: wc,
    // rock along the back glass (caves and ledges to rest under), open sand in front: how a big tank is scaped
    decor: [decor('test_rock', -0.3, -0.36, { scale: 2.2 }), decor('test_rock', 0.32, -0.36, { scale: 2 }), decor('test_rock', 0, -0.4, { scale: 1.6 })],
  });
  const crew = Array.from({ length: n }, (_, i) => makeTestCreature(id, tank.id, { sizeCm: sp.adultSizeCm, temperament: 30 + i * 15 }));
  const w = makeTestWorld(tank, crew, hour);
  const env = w.env;
  const depth = env.surfaceY - env.floorY;
  let finite = true;
  let inBounds = true;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let h = 0;
  let walk = 0;
  let k = 0;
  let wedged = 0;
  const held = w.agents.map(() => ({ gx: NaN, gy: NaN, gz: NaN, t0: 0, d0: 0, best: 0 }));
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    stepWorld(w, DT);
    if (i < 60) continue;
    for (const a of w.agents) {
      const p = a.rt.pos;
      if (!Number.isFinite(p.x + p.y + p.z)) finite = false;
      const slack = 0.03;
      if (p.x < env.minX - slack || p.x > env.maxX + slack || p.z < env.minZ - slack || p.z > env.maxZ + slack || p.y < env.floorY - slack || p.y > env.surfaceY + slack) inBounds = false;
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
      h += (p.y - env.floorY) / depth;
      if (a.rt.gait === 'walk') walk++;
      k++;
      // a wedge: a goal held well away that it never gets any closer to
      const hg = held[w.agents.indexOf(a)];
      const g = a.ctrl.goal;
      const d = Math.hypot(g.x - p.x, g.y - p.y, g.z - p.z);
      if (!a.ctrl.hasGoal || Math.abs(g.x - hg.gx) + Math.abs(g.y - hg.gy) + Math.abs(g.z - hg.gz) > 0.02) Object.assign(hg, { gx: g.x, gy: g.y, gz: g.z, t0: w.time, d0: d, best: d });
      else {
        hg.best = Math.min(hg.best, d);
        if (a.ctrl.hasGoal && hg.d0 > a.L && hg.best > hg.d0 * 0.8 && a.act !== 'rest' && a.act !== 'sleep' && a.act !== 'hide') wedged = Math.max(wedged, w.time - hg.t0);
      }
    }
  }
  return { finite, inBounds, spanX: (maxX - minX) / (env.maxX - env.minX), spanZ: (maxZ - minZ) / (env.maxZ - env.minZ), height: h / k, walking: walk / k, wedged };
}

describe('chunk 17 behaviour sets, each in the smallest tank the gate allows', () => {
  it('the new profiles: bottom sharks hug the floor and never hover; the ray is a flat disc; the epaulette walks', () => {
    const { benthic_shark, stingray } = SET_PROFILES;
    expect(benthic_shark).toMatchObject({ loco: 'swim', bottomHugger: true, hover: 0, rest: 'cave' });
    expect(stingray).toMatchObject({ loco: 'swim', bottomHugger: true, rest: 'bottom' });
    expect(stingray.body.hz).toBeGreaterThan(stingray.body.hx * 0.8);
    expect(stingray.maxPitch).toBeLessThan(0.1);
    expect(speciesProfile(findSpecies('epaulette_shark')!)).toMatchObject({ loco: 'walk', canSwim: true, crawlGait: 'walk' });
    expect(speciesProfile(findSpecies('coral_catshark')!)).toBe(benthic_shark);
    // the arowana cruises just under the surface
    expect(SET_PROFILES.arowana.surfaceCruiser).toBe(true);
    expect(speciesProfile(findSpecies('brownbanded_bamboo_shark')!)).toBe(benthic_shark);
  });

  const CASES: [id: string, n: number, hour: number][] = [
    ['oscar', 1, 12],
    ['clown_loach', 5, 12],
    ['black_ghost_knifefish', 1, 23],
    ['fahaka_puffer', 1, 12],
    ['ornate_bichir', 1, 23],
    ['silver_arowana', 1, 12],
    ['koi', 3, 12],
    ['motoro_stingray', 1, 23],
    ['silver_mono', 6, 12],
    ['spotted_scat', 6, 12],
    ['blue_tang', 1, 12],
    ['naso_tang', 1, 12],
    ['queen_angelfish', 1, 12],
    ['clown_triggerfish', 1, 12],
    ['panther_grouper', 1, 12],
    ['coral_catshark', 1, 23],
    ['epaulette_shark', 1, 23],
    ['brownbanded_bamboo_shark', 1, 23],
  ];
  for (const [id, n, hour] of CASES) {
    it(`${id}: stays in the glass and moves about its ${tankTierFor(findSpecies(id)!)!.name}`, () => {
      const r = runSpecies(id, n, hour, 480);
      expect(r.finite, 'finite').toBe(true);
      expect(r.inBounds, 'inside the glass').toBe(true);
      // never stuck: no goal held for half a minute without getting closer (a body wedged against the glass or a rock)
      expect(r.wedged, 'longest wedge (s)').toBeLessThan(30);
      // gets around the tank in eight minutes (even the grouper, which hovers by its rock)
      expect(r.spanX, 'span of the length').toBeGreaterThan(0.2);
      const sp = findSpecies(id)!;
      const set = speciesProfile(sp);
      if (set.bottomHugger) expect(r.height, 'keeps low').toBeLessThan(0.3);
      if (set.surfaceCruiser) expect(r.height, 'keeps high').toBeGreaterThan(0.58);
      if (set.loco === 'walk') expect(r.walking, 'walks on its fins').toBeGreaterThan(0.3);
    });
  }
});
