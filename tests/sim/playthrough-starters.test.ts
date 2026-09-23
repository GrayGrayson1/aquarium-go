/**
 * Balance sweep by simulated play (bot player, src/dev/fixtures/playthrough.ts). OWNER: polish-gameplay.
 *
 * Each starter is played for 45 game days (~3 real hours at 1×) by a careful bot that follows the tutorial, feeds,
 * fixes WATCH water, buys a mate, follows the breeding hints, sells offspring, builds a second tank, upgrades and
 * opens to visitors. The printed timelines are the evidence behind the "Balance curve" section of
 * docs/GAME_DESIGN.md. Real-time conversions: 10 real minutes = 60 game hours; 1 real hour = 15 game days.
 */
import { describe, it, expect } from 'vitest';
import { runPlaythrough, formatPlaythrough, type PlaythroughResult } from '@/dev/fixtures/playthrough';
import { STARTER_IDS, listSpecies, type StarterId } from '@/data/species';
import { pluralName } from '@/sim/economy/util';
import { FACILITY_LEVEL_ORDER } from '@/data/facilities';

const START = 8; // new games start at 8 AM on day 1
const H = (r: PlaythroughResult, m: keyof PlaythroughResult['milestones']) => (r.milestones[m] === undefined ? Infinity : r.milestones[m]! - START);
const REAL_HOUR = 15 * 24; // game hours in one real hour at 1×
const QUIET = !process.env.PLAYTHROUGH_LOG;
/** Wrong "+s" plurals of species whose real plural differs ("otocincluss", "chromiss", "clownfishs", "gobys"). */
const NAIVE_PLURALS = listSpecies()
  .map((sp) => sp.commonName.toLowerCase())
  .filter((n) => pluralName(n) !== `${n}s`)
  .map((n) => `${n}s `);

const tag = (id: string, seed: number) => `${id} seed ${seed}`;

function check(r: PlaythroughResult, id: StarterId, seed: number): void {
  const tag = `${id} seed ${seed}`;
  // (a) first money within ~10 real minutes
  expect(H(r, 'first_money'), `${tag} first money`).toBeLessThanOrEqual(60);
  // (b) the tutorial completes (in the first ~20 real minutes of attentive play)
  expect(H(r, 'tutorial_done'), `${tag} tutorial`).toBeLessThanOrEqual(5 * 24);
  // (c) a mate/companion in the first game days; the starter breeding loop within ~1 real hour
  expect(H(r, 'mate_bought'), `${tag} mate`).toBeLessThanOrEqual(3 * 24);
  expect(H(r, 'first_spawn'), `${tag} breeding`).toBeLessThanOrEqual(REAL_HOUR);
  // (d) the specialty shop (visitors) after ~1–2 real hours of good play — not trivially, not a grind
  expect(H(r, 'specialty_shop'), `${tag} shop`).toBeGreaterThanOrEqual(0.6 * REAL_HOUR);
  expect(H(r, 'specialty_shop'), `${tag} shop`).toBeLessThanOrEqual(2.25 * REAL_HOUR);
  expect(H(r, 'first_visitor'), `${tag} visitors`).toBeLessThan(Infinity);
  // (e) every path earns from its own animals (axolotls don't need community fish; seahorses aren't prohibitive)
  expect(H(r, 'first_offspring_sale'), `${tag} offspring sale`).toBeLessThanOrEqual(2 * REAL_HOUR);
  // (f) operating costs never bankrupt a careful player
  expect(r.milestones.in_debt, `${tag} debt`).toBeUndefined();
  expect(r.milestones.loan, `${tag} loan`).toBeUndefined();
  // (g) no adult animal dies under reasonable care
  expect(r.deaths.filter((d) => !d.young), `${tag} deaths`).toEqual([]);
  expect(r.problems, `${tag} bot problems`).toEqual([]);
  // log quality: no double-s plurals, no "the Ember’s Tank", and a readable pace (per real hour of play)
  for (const e of r.events) {
    const low = e.text.toLowerCase();
    for (const bad of NAIVE_PLURALS) expect(low.includes(bad), `${tag}: "${bad}" in: ${e.text}`).toBe(false);
    expect(e.text, tag).not.toMatch(/\b[Tt]he [A-Z][\w-]*[’']s\b/);
  }
  // The first real hour carries the tutorial and the early unlock burst; after that the pace settles.
  const inHour = (h: number, toast: boolean) => r.events.filter((e) => (!toast || e.toast) && e.hour - START >= h * REAL_HOUR && e.hour - START < (h + 1) * REAL_HOUR).length;
  expect(inHour(0, true), `${tag} toasts in the first real hour`).toBeLessThanOrEqual(90);
  for (const h of [1, 2]) {
    expect(inHour(h, true), `${tag} toasts in real hour ${h + 1}`).toBeLessThanOrEqual(70);
    expect(inHour(h, false), `${tag} events in real hour ${h + 1}`).toBeLessThanOrEqual(110);
  }
}

describe('balance: every starter played by a careful bot for ~3 real hours', () => {
  for (const id of STARTER_IDS) {
    it(`${id}: first money, tutorial, breeding, shop, visitors — and nobody dies`, () => {
      for (const seed of [1234, 77, 2024]) {
        const r = runPlaythrough({ starterId: id, seed, days: 45 });
        if (!QUIET || seed === 1234) console.log(formatPlaythrough(r, `${id} · seed ${seed}`));
        check(r, id, seed);
        // The home tank stays a good home (a betta pair briefly together for spawning is the one expected exception).
        const home = r.state.tanks[r.state.tankOrder[0]];
        const pairing = Object.values(r.state.creatures).some((c) => c.tankId === home.id && c.status === 'alive' && c.repro.partnerId && r.state.creatures[c.repro.partnerId]?.tankId === home.id && ['courting', 'spawning', 'spent', 'nest_ready'].includes(c.repro.stage));
        if (!pairing) expect(['excellent', 'usually_compatible', 'conditional'], tag(id, seed)).toContain(home.cache.compatVerdict);
      }
    });
  }
});

describe('balance: the long game', () => {
  it('every facility level and a 1,000-gallon display are reachable; rent matters but never bankrupts', () => {
    const r = runPlaythrough({
      starterId: 'betta',
      seed: 1234,
      days: 230,
      longGame: true,
      until: (s) => s.facility.level === 'grand_hall' && Object.values(s.tanks).some((t) => t.tierId === 'g1000'),
    });
    const daily = r.samples.filter((x) => x.day % 10 === 0 || x === r.samples[r.samples.length - 1]);
    console.log(formatPlaythrough({ ...r, samples: daily }, 'betta · long game'));
    for (const lvl of FACILITY_LEVEL_ORDER.slice(1)) expect(r.milestones[lvl as 'specialty_shop'], lvl).toBeDefined();
    expect(Object.values(r.state.tanks).some((t) => t.tierId === 'g1000')).toBe(true);
    // Level pacing (real hours at 1×): shop 1–2 h, grand hall after a long game (~8–16 h), each step takes a while.
    const at = (lvl: string) => H(r, lvl as 'specialty_shop') / REAL_HOUR;
    expect(at('specialty_shop')).toBeLessThanOrEqual(2.25);
    for (let i = 2; i < FACILITY_LEVEL_ORDER.length; i++) expect(at(FACILITY_LEVEL_ORDER[i]) - at(FACILITY_LEVEL_ORDER[i - 1]), FACILITY_LEVEL_ORDER[i]).toBeGreaterThan(0.75);
    expect(at('grand_hall')).toBeGreaterThan(7);
    expect(at('grand_hall')).toBeLessThan(16);
    // Operating costs: a real share of takings at every open level, but the bank balance never goes negative.
    for (const lvl of FACILITY_LEVEL_ORDER.slice(1)) {
      const days = r.samples.filter((x) => x.level === lvl && x.income > 0).slice(2);
      if (days.length < 3) continue;
      const income = days.reduce((a, x) => a + x.income, 0) / days.length;
      const op = days.reduce((a, x) => a + x.opCost, 0) / days.length;
      expect(op / income, `${lvl} running costs share`).toBeGreaterThan(0.05);
      expect(op / income, `${lvl} running costs share`).toBeLessThan(0.6);
    }
    expect(r.milestones.in_debt).toBeUndefined();
  });
});
