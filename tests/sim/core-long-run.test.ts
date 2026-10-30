// @vitest-environment node
/**
 * chunk 6 (REL-015, CONST-003, AUTO-029) — the whole 0.5 stack over long runs:
 * - REL-015: every dev fixture runs two game weeks in one-hour steps with no exception and no NaN or Infinity
 *   anywhere, and saving and loading the result needs no repair (repairs: []). Two weeks covers every daily and weekly
 *   job (water changes, salt mixing, cultures, stock checks, keepers' rounds, glass scrapes, shows, rent).
 * - CONST-003: a full-feature facility (the new betta genes, Autofeeders, Auto Water Changers on fresh and marine tanks,
 *   the Water room and the Live food room with a live-food doser, a stock manager and a production line) runs thirty
 *   game days: twice from the same seed in the same steps it gives the same stateHash; in random steps of 15 minutes
 *   to 4 hours it gives the same scheduled work (each day's water changes, skipped changes, gallons to the salt mixer
 *   and live food made). The rest (spawns, feeding, sales) draws on the random stream at different points when the
 *   steps differ, so it isn't compared (as automation-invariants.test.ts notes for the water chemistry).
 * Run length (REL-015 leaves it to the reviewer): two weeks per fixture, thirty days for the full-feature facility.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { FIXTURES } from '@/dev/fixtures';
import { findNonFinite } from '@/dev/fixtures/core-testkit';
import { advanceWorld } from '@/sim/world';
import { encodeRecord, decodeRecord } from '@/persistence';
import { stateHash } from '@/persistence/hash';
import { installEquipment } from '@/sim/care';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng, mulberry32 } from '@/sim/rng';
import { starterAquascape } from '@/sim/aquascape';
import { addStaffDirect } from '@/sim/staff';
import { installFoodRoom, installWaterRoom } from '@/sim/automation';
import { BRINE, INFUSORIA } from '@/data/catalog/machines';
import { withoutBreakdowns } from './support/breakdowns';
import { lineFarm } from './support/production';

const HOUR_STEPS = (g: GameState, hours: number) => {
  for (let h = 0; h < hours; h++) advanceWorld(g, 1, {});
};

/** Load the game's save as the player's next session would: no repair note, nothing non-finite. */
function roundTrip(g: GameState): { repairs: string[]; nonFinite: string[] } {
  const { text } = encodeRecord(g, 'auto');
  const r = decodeRecord(text);
  return { repairs: r.repairs, nonFinite: findNonFinite(r.state) };
}

describe('REL-015: every dev fixture, two game weeks', () => {
  it.each(Object.keys(FIXTURES))('%s: no exception, nothing non-finite, and its save loads with no repair', (name) => {
    const g = FIXTURES[name]();
    g.isShowcase = false; // a showcase is the title screen's backdrop: run it as a game
    expect(() => HOUR_STEPS(g, 14 * 24)).not.toThrow();
    expect(findNonFinite(g)).toEqual([]);
    expect(roundTrip(g)).toEqual({ repairs: [], nonFinite: [] });
  });
});

/** The full-feature facility (CONST-003): every 0.5 system running at once. */
function fullFeature(seed: number): GameState {
  const { g } = lineFarm(seed); // a betta line (pair, grow-out, quarantine, keepers) with Autofeeders, every unlock
  installWaterRoom(g, g.clock.hour);
  installFoodRoom(g);
  const rng = simRng(g);
  const make = (wc: 'freshwater_tropical' | 'marine_fowlr', x: number, name: string) => {
    const t = createTank(g, 'g20L', wc, { cycled: true, placement: { x, z: 6, rotY: 0 }, name });
    t.decor = starterAquascape(g, 'generic', t);
    t.lighting.onHour = 8;
    t.lighting.offHour = 20;
    installEquipment(g, t.id, 'auto_water_changer', { purchased: true });
    installEquipment(g, t.id, 'autofeeder', { purchased: true });
    const sp = wc === 'marine_fowlr' ? 'ocellaris_clownfish' : 'neon_tetra';
    for (let k = 0; k < 3; k++) addCreature(g, createCreature(g, rng, sp, { ageDays: 60 }), t.id);
    return t;
  };
  make('freshwater_tropical', -8, 'Community');
  make('marine_fowlr', -5, 'Reef A');
  make('marine_fowlr', -2, 'Reef B');
  // a live-food doser on the line's grow-out tank, and the cultures' supplies
  const raise = g.tanks[g.production!.lines[0].tanks.raise];
  installEquipment(g, raise.id, 'live_food_doser', { purchased: true });
  g.inventory.salt = 40;
  g.inventory.brineShrimpEggs = 200; // enough for the whole run (the stock manager buys salt and eggs within budget)
  g.inventory.foods = { ...g.inventory.foods, blanched_veg: 200, marine_pellets: 2000 };
  addStaffDirect(g, { name: 'Rosa Duarte', role: 'stock_manager', skill: 3, trait: 'quick_learner' });
  g.staff!.stockBudget = 300;
  return g;
}

/** What the clock schedules, by day: water changes and skips, gallons to the salt mixer, live food made. */
const scheduled = (g: GameState) =>
  (g.automation?.days ?? []).map((d) => ({ day: d.day, changes: d.water?.changes ?? 0, skipped: d.water?.skipped ?? 0, mixer: Math.round((d.water?.mixer ?? 0) * 10) / 10, made: d.made }));

describe('CONST-003, AUTO-029: the full-feature facility over thirty days', () => {
  const DAYS = 30;

  it('the same seed in the same steps gives the same stateHash; it ends finite and its save loads with no repair', () => {
    const a = fullFeature(23);
    const b = fullFeature(23);
    const start = a.clock.hour;
    expect(a.facility.water?.lastMixHour ?? -1).toBeLessThanOrEqual(start);
    HOUR_STEPS(a, DAYS * 24);
    HOUR_STEPS(b, DAYS * 24);
    expect(stateHash(a)).toBe(stateHash(b));
    expect(findNonFinite(a)).toEqual([]);
    expect(roundTrip(a)).toEqual({ repairs: [], nonFinite: [] });
    // everything ran: water changes from the reserves, salt mixed, live food made, the line moved young
    const days = scheduled(a);
    expect(days.reduce((n, d) => n + d.changes, 0)).toBeGreaterThan(0);
    // chunk 17 — the salt mixer ran during the run: the day log keeps only the last eight days, and the mixer runs about
    // once a month here, so whether it fell in that window was the random stream's luck (on the tank gate's stream it
    // mixed at hour 718, just after the log's last day)
    expect(a.facility.water?.lastMixHour ?? -1).toBeGreaterThan(start);
    // (the store fills while only young eat from it, and a full store waits for room: the live food is in stock)
    expect((a.inventory.foods[BRINE] ?? 0) + (a.inventory.foods[INFUSORIA] ?? 0)).toBeGreaterThan(0);
    expect(a.production!.lines[0].sortedThroughHour ?? a.production!.lines[0].createdHour).toBeGreaterThan(a.production!.lines[0].createdHour);
  });

  it('random step sizes (15 minutes to 4 hours) give the same scheduled work each day', () => {
    // A water changer that breaks down stops its tank's changes. Breakdowns are rolls on the shared random stream, which
    // the two runs walk differently (the "rest" this file's header leaves out), so a changer could break in one run and
    // not the other, or on another day: in chunk 16 seeds 6 and 8 lost one on day 22 of the hourly run only, and with
    // all 31 new species this seed's Community changer broke in both runs, days apart. The changers' breakdowns stay
    // out of the comparison; what a failed changer does is automation-water-changer.test.ts's ("off or failed, it does
    // nothing").
    withoutBreakdowns(() => {
      const hourly = fullFeature(31);
      HOUR_STEPS(hourly, DAYS * 24);
      const random = fullFeature(31);
      const r = mulberry32(99);
      let left = DAYS * 24;
      while (left > 1e-9) {
        const dt = Math.min(left, 0.25 + Math.floor(r.next() * 16) * 0.25);
        advanceWorld(random, dt, {});
        left -= dt;
      }
      expect(random.clock.hour).toBeCloseTo(hourly.clock.hour, 6);
      expect(scheduled(random)).toEqual(scheduled(hourly));
      expect(findNonFinite(random)).toEqual([]);
    }, ['auto_water_changer']);
  });
});
